// World routes: the DM lock on every one, and what each does against in-memory storage.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  DM_KEY, WORLD_PUBLIC_ROUTES, WORLD_ROUTES, engine, makeRequest, makeWorld, quietContext, withDmKey
} from "./helpers.mjs";

const require = createRequire(import.meta.url);
const START = engine.WORLD_START_DAY;
const body = (response) => JSON.parse(response.body || "{}");

function call(world, handler, method, path, options = {}) {
  return world.handlers[handler](makeRequest(method, path, { key: DM_KEY, ...options }), quietContext);
}

async function started() {
  const world = makeWorld();
  const response = await call(world, "worldStart", "POST", "world/start", { body: {} });
  assert.equal(response.status, 200);
  return { world, state: body(response) };
}

const countdownInput = (overrides = {}) => ({
  label: "Test build-up", size: 4, mode: "chance", chance: 1,
  suggestionText: "The build-up comes to a head.", ...overrides
});

test("every world route refuses without the DM key, before touching storage", withDmKey(DM_KEY, async () => {
  const world = makeWorld();
  for (const entry of WORLD_ROUTES) {
    for (const method of entry.methods) {
      const params = entry.route.includes("{id}") ? { id: "x" } : {};
      for (const key of [undefined, "", "wrong-key"]) {
        const response = await world.handlers[entry.handler](
          makeRequest(method, entry.route, { key, params, body: {} }), quietContext
        );
        assert.equal(response.status, 401, `${method} ${entry.route} with key ${JSON.stringify(key)}`);
      }
    }
  }
  assert.equal(world.table.rows.size, 0);
  assert.equal(world.blobs.blobs.size, 0);
}));

test("with no key set on the server, every world route is closed (403)", withDmKey(undefined, async () => {
  const world = makeWorld();
  for (const entry of WORLD_ROUTES) {
    for (const method of entry.methods) {
      const params = entry.route.includes("{id}") ? { id: "x" } : {};
      const response = await world.handlers[entry.handler](
        makeRequest(method, entry.route, { key: DM_KEY, params, body: {} }), quietContext
      );
      assert.equal(response.status, 403, `${method} ${entry.route}`);
    }
  }
  assert.equal(world.blobs.blobs.size, 0);
}));

test("every registered world route is DM-locked, except the two public read routes", () => {
  const registered = [];
  const { registerWorldRoutes } = require("../../api/src/worldRoutes.js");
  registerWorldRoutes({ http: (name, options) => registered.push({ name, ...options }) }, makeWorld().handlers);
  assert.equal(registered.length, WORLD_ROUTES.length + WORLD_PUBLIC_ROUTES.length);
  assert.deepEqual(WORLD_PUBLIC_ROUTES.map((entry) => [entry.route, entry.methods]), [["world/public/prices", ["GET"]], ["world/public/rumours", ["GET"]]]);
  assert.ok(!WORLD_ROUTES.some((entry) => WORLD_PUBLIC_ROUTES.some((open) => open.handler === entry.handler)));
  for (const entry of registered) {
    assert.match(entry.route, /^world(\/|$)/);
    assert.ok(entry.methods.includes("OPTIONS"), "browsers can preflight it");
    assert.equal(typeof entry.handler, "function");
  }
});

test("before it is started the world reports nothing but a suggested first day", withDmKey(DM_KEY, async () => {
  const world = makeWorld();
  const response = await call(world, "world", "GET", "world");
  assert.deepEqual(body(response), { initialized: false, suggestedStartDay: 99306, suggestedStartDateText: "Fall 7, 496" });
  assert.equal(world.blobs.blobs.size, 0, "reading writes nothing");
  assert.equal((await call(world, "worldEvents", "POST", "world/events", { body: { text: "Too early." } })).status, 409);
}));

test("starting the world commits Fall 7, 496 with no events and no countdowns", withDmKey(DM_KEY, async () => {
  const { world, state } = await started();
  assert.equal(state.initialized, true);
  assert.equal(state.day, START);
  assert.equal(state.dateText, "Fall 7, 496");
  assert.equal(state.dayOfMonth, 7);
  assert.deepEqual([state.countdowns, state.pending, state.writtenToday, state.report], [[], [], [], []]);
  assert.ok(state.etag);
  assert.equal(world.table.rows.size, 0, "nothing is written to the record by starting");
  assert.equal((await call(world, "worldStart", "POST", "world/start", { body: {} })).status, 409, "only once");
}));

test("a jot is canon at once, hidden from players, and may be dated in the past but not the future", withDmKey(DM_KEY, async () => {
  const { world } = await started();
  const written = body(await call(world, "worldEvents", "POST", "world/events", { body: { text: "  A test thing happened.  ", place: "place-1" } }));
  assert.equal(written.event.status, "written");
  assert.equal(written.event.text, "A test thing happened.");
  assert.equal(written.event.source, "dm");
  assert.equal(written.event.day, START);
  assert.equal(written.event.playersVisible, false);
  assert.equal(written.world.writtenToday.length, 1);

  const past = body(await call(world, "worldEvents", "POST", "world/events", { body: { text: "Earlier.", day: START - 4 } }));
  assert.equal(past.event.day, START - 4);
  assert.equal((await call(world, "worldEvents", "POST", "world/events", { body: { text: "Later.", day: START + 1 } })).status, 400);
  assert.equal((await call(world, "worldEvents", "POST", "world/events", { body: { text: "   " } })).status, 400);

  const listed = body(await call(world, "worldEvents", "GET", "world/events", { query: { status: "written" } }));
  assert.deepEqual(listed.events.map((event) => event.text), ["A test thing happened.", "Earlier."]);
  const ranged = body(await call(world, "worldEvents", "GET", "world/events", { query: { fromDay: String(START), toDay: String(START) } }));
  assert.equal(ranged.events.length, 1);
  assert.equal((await call(world, "worldEvents", "GET", "world/events", { query: { status: "nonsense" } })).status, 400);
}));

test("advance commits days, reports what moved, and raises suggestions that wait", withDmKey(DM_KEY, async () => {
  const { world, state } = await started();
  const created = body(await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput() }));
  assert.equal(created.world.countdowns.length, 1);
  assert.equal(created.world.countdowns[0].fill, 0);

  const one = body(await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 1, expectedEtag: state.etag } }));
  assert.equal(one.day, START + 1);
  assert.equal(one.dateText, "Fall 8, 496");
  assert.equal(one.countdowns[0].fill, 1);
  assert.equal(one.advanced.days, 1);
  assert.match(one.advanced.report[0].text, /moves to 1 of 4/);
  assert.notEqual(one.etag, state.etag);

  const run = body(await call(world, "worldAdvance", "POST", "world/advance", { body: { untilDecision: true, expectedEtag: one.etag } }));
  assert.equal(run.day, START + 4, "stops on the day something needs a decision");
  assert.equal(run.pending.length, 1);
  assert.equal(run.pending[0].status, "suggested");
  assert.equal(run.pending[0].source, "sim");
  assert.equal(run.countdowns[0].waiting, true);
  assert.equal(run.advanced.days, 3);

  const snapshots = [...world.blobs.blobs.keys()].filter((name) => name.includes("/days/"));
  assert.equal(snapshots.length, 5, "one immutable snapshot per committed day");
}));

test("run to next decision stops after seven days when nothing comes up", withDmKey(DM_KEY, async () => {
  const { world, state } = await started();
  const run = body(await call(world, "worldAdvance", "POST", "world/advance", { body: { untilDecision: true, expectedEtag: state.etag } }));
  assert.equal(run.day, START + 7);
  assert.equal(run.pending.length, 0);
  assert.equal((await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 31, expectedEtag: run.etag } })).status, 400);
  assert.equal((await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 0, expectedEtag: run.etag } })).status, 400);
}));

test("a second device with an older page is told to reload and changes nothing", withDmKey(DM_KEY, async () => {
  const { world, state } = await started();
  const first = await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 1, expectedEtag: state.etag } });
  assert.equal(first.status, 200);
  const second = await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 1, expectedEtag: state.etag } });
  assert.equal(second.status, 409);
  assert.match(body(second).error, /Reload/);
  assert.equal(body(await call(world, "world", "GET", "world")).day, START + 1, "the day moved once, not twice");
  assert.equal((await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 1 } })).status, 400, "the etag is required");
}));

test("accept, reword and reject are recorded as new rows and never overwrite", withDmKey(DM_KEY, async () => {
  for (const [decision, text, expected] of [
    ["accept", undefined, { status: "written", text: "The build-up comes to a head.", done: true }],
    ["reword", "It ended quietly.", { status: "written", text: "It ended quietly.", done: true }],
    ["reject", undefined, { status: "rejected", text: "The build-up comes to a head.", done: false }]
  ]) {
    const { world, state } = await started();
    await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput() });
    const run = body(await call(world, "worldAdvance", "POST", "world/advance", { body: { untilDecision: true, expectedEtag: state.etag } }));
    const eventId = run.pending[0].id;
    const rowsBefore = world.table.rows.size;
    const before = structuredClone([...world.table.rows.values()]);

    const response = await call(world, "worldEventDecision", "POST", `world/events/${eventId}/decision`, {
      params: { id: eventId }, body: { decision, text }
    });
    assert.equal(response.status, 200, decision);
    const after = body(response).world;
    assert.equal(after.pending.length, 0);
    assert.equal(world.table.rows.size, rowsBefore + 1, "exactly one row added");
    assert.deepEqual([...world.table.rows.values()].slice(0, rowsBefore), before, "earlier rows are untouched");

    const event = body(await call(world, "worldEvents", "GET", "world/events")).events.find((entry) => entry.id === eventId);
    assert.equal(event.status, expected.status);
    assert.equal(event.text, expected.text);
    assert.equal(event.originalText, "The build-up comes to a head.");
    assert.equal(after.countdowns[0].done, expected.done);
    if (decision === "reject") {
      assert.equal(after.countdowns[0].fill, 2, "back to half");
    }

    const again = await call(world, "worldEventDecision", "POST", `world/events/${eventId}/decision`, {
      params: { id: eventId }, body: { decision: "accept" }
    });
    assert.equal(again.status, 409, "a suggestion is decided once");
  }
}));

test("decisions need a known suggestion and a valid call", withDmKey(DM_KEY, async () => {
  const { world } = await started();
  const unknown = await call(world, "worldEventDecision", "POST", "world/events/nope/decision", { params: { id: "nope" }, body: { decision: "accept" } });
  assert.equal(unknown.status, 404);
  const jot = body(await call(world, "worldEvents", "POST", "world/events", { body: { text: "Written." } }));
  const onWritten = await call(world, "worldEventDecision", "POST", "x", { params: { id: jot.event.id }, body: { decision: "reject" } });
  assert.equal(onWritten.status, 409, "a written event cannot be un-written by a decision");
}));

test("the DM reveals a written event to players and can hide it again", withDmKey(DM_KEY, async () => {
  const { world } = await started();
  const jot = body(await call(world, "worldEvents", "POST", "world/events", { body: { text: "Written." } }));
  const id = jot.event.id;
  const find = async () => body(await call(world, "worldEvents", "GET", "world/events")).events.find((event) => event.id === id);

  assert.equal((await find()).playersVisible, false);
  const reveal = await call(world, "worldEventVisibility", "POST", "x", { params: { id }, body: { playersVisible: true } });
  assert.equal(reveal.status, 200);
  assert.equal((await find()).playersVisible, true);
  await call(world, "worldEventVisibility", "POST", "x", { params: { id }, body: { playersVisible: false } });
  assert.equal((await find()).playersVisible, false);
  assert.equal(world.table.rows.size, 3, "the jot plus two reveal rows");

  assert.equal((await call(world, "worldEventVisibility", "POST", "x", { params: { id }, body: { playersVisible: "yes" } })).status, 400);
  assert.equal((await call(world, "worldEventVisibility", "POST", "x", { params: { id: "nope" }, body: { playersVisible: true } })).status, 404);
}));

test("a suggestion cannot be shown to players until it is written", withDmKey(DM_KEY, async () => {
  const { world, state } = await started();
  await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput() });
  const run = body(await call(world, "worldAdvance", "POST", "world/advance", { body: { untilDecision: true, expectedEtag: state.etag } }));
  const id = run.pending[0].id;
  assert.equal((await call(world, "worldEventVisibility", "POST", "x", { params: { id }, body: { playersVisible: true } })).status, 409);
}));

test("countdowns: create, step by hand, edit and finish", withDmKey(DM_KEY, async () => {
  const { world } = await started();
  const created = body(await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput({ chance: 0.2, size: 6 }) }));
  const id = created.countdownId;
  const act = (payload) => call(world, "worldCountdownAction", "POST", "x", { params: { id }, body: payload });
  const item = async () => body(await call(world, "worldCountdowns", "GET", "world/countdowns")).countdowns[0];

  assert.equal((await act({ action: "step", delta: 1 })).status, 200);
  assert.equal((await act({ action: "step", delta: 1 })).status, 200);
  assert.equal((await item()).fill, 2);
  assert.equal((await act({ action: "step", delta: -1 })).status, 200);
  assert.equal((await item()).fill, 1);
  assert.equal((await act({ action: "step", delta: 3 })).status, 400);

  assert.equal((await act({ action: "edit", changes: { label: "Renamed", chance: 0.5 } })).status, 200);
  assert.deepEqual([(await item()).label, (await item()).chance], ["Renamed", 0.5]);
  assert.equal((await act({ action: "edit", changes: {} })).status, 400);
  assert.equal((await act({ action: "dance" })).status, 400);

  assert.equal((await act({ action: "finish" })).status, 200);
  assert.equal((await item()).done, true);
  assert.equal((await act({ action: "step", delta: 1 })).status, 409, "a finished countdown cannot be stepped");
  assert.equal((await call(world, "worldCountdownAction", "POST", "x", { params: { id: "nope" }, body: { action: "finish" } })).status, 404);

  for (const bad of [{ size: 5 }, { label: "" }, { suggestionText: "" }, { mode: "date", dueDay: START }]) {
    assert.equal((await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput(bad) })).status, 400);
  }
}));

test("filling a countdown by hand raises its suggestion at once", withDmKey(DM_KEY, async () => {
  const { world } = await started();
  const created = body(await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput({ chance: 0.1, fill: 3 }) }));
  const response = await call(world, "worldCountdownAction", "POST", "x", { params: { id: created.countdownId }, body: { action: "step", delta: 1 } });
  const state = body(response).world;
  assert.equal(state.countdowns[0].waiting, true);
  assert.equal(state.pending.length, 1);
  assert.equal(state.pending[0].day, START);
  const blocked = await call(world, "worldCountdownAction", "POST", "x", { params: { id: created.countdownId }, body: { action: "step", delta: -1 } });
  assert.equal(blocked.status, 409, "it waits for the DM's call");
}));

test("a dated countdown suggests on its date", withDmKey(DM_KEY, async () => {
  const { world, state } = await started();
  await call(world, "worldCountdowns", "POST", "world/countdowns", {
    body: { label: "Test occasion", mode: "date", dueDay: START + 2, suggestionText: "The occasion takes place." }
  });
  const run = body(await call(world, "worldAdvance", "POST", "world/advance", { body: { untilDecision: true, expectedEtag: state.etag } }));
  assert.equal(run.day, START + 2);
  assert.equal(run.pending[0].text, "The occasion takes place.");
}));

test("the record is append only and the state rebuilds from it", withDmKey(DM_KEY, async () => {
  const { world, state } = await started();
  await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput({ chance: 0.6, size: 6 }) });
  await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput({ label: "Second", chance: 0.4 }) });
  let etag = state.etag;
  let seen = [];
  for (let round = 0; round < 12; round += 1) {
    const now = body(await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 1, expectedEtag: etag } }));
    etag = now.etag;
    for (const pending of now.pending) {
      await call(world, "worldEventDecision", "POST", "x", { params: { id: pending.id }, body: { decision: round % 2 ? "accept" : "reject" } });
    }
    if (round === 3) {
      await call(world, "worldEvents", "POST", "world/events", { body: { text: "A jot in the middle." } });
    }
    const rows = [...world.table.rows.values()];
    assert.deepEqual(rows.slice(0, seen.length), seen, `round ${round}: earlier rows never change`);
    seen = structuredClone(rows);
  }

  const records = (await world.store.listRecords()).map(({ _row, ...record }) => record);
  const first = [...world.blobs.blobs.entries()].find(([name]) => name.includes(`/days/${String(START).padStart(7, "0")}-`))[1].document;
  const live = body(await call(world, "world", "GET", "world"));
  const rebuilt = engine.rebuildState(first.state, records, live.day);
  assert.deepEqual(engine.listCountdowns(rebuilt.state), live.countdowns);

  // Every stored snapshot equals the rebuild for its day (before that day's rows).
  for (const [name, blob] of world.blobs.blobs) {
    if (!name.includes("/days/")) continue;
    const day = blob.document.day;
    const upTo = engine.rebuildState(first.state, records.filter((record) => record.day < day), day).state;
    assert.deepEqual(blob.document.state, upTo, name);
  }
}));

test("a suggestion lost between commit and append is put back from the snapshot", withDmKey(DM_KEY, async () => {
  const { world, state } = await started();
  await call(world, "worldCountdowns", "POST", "world/countdowns", { body: countdownInput() });
  const run = body(await call(world, "worldAdvance", "POST", "world/advance", { body: { untilDecision: true, expectedEtag: state.etag } }));
  const id = run.pending[0].id;
  for (const [key, row] of world.table.rows) {
    if (row.recordId === id) world.table.rows.delete(key);
  }
  const healed = body(await call(world, "world", "GET", "world"));
  assert.deepEqual(healed.pending.map((event) => event.id), [id]);
}));

test("places: empty until loaded, then served to the DM only", withDmKey(DM_KEY, async () => {
  const { world } = await started();
  assert.deepEqual(body(await call(world, "worldPlaces", "GET", "world/places")).places, []);
  const saved = await call(world, "worldPlaces", "PUT", "world/places", {
    body: { places: [{ id: "place-1", name: "Test Town", kind: "Town", region: "Test Region", knownToPlayers: true }, { id: "place-2", name: "Hidden Test Town" }] }
  });
  assert.equal(saved.status, 200);
  const places = body(await call(world, "worldPlaces", "GET", "world/places")).places;
  assert.deepEqual(places.map((place) => [place.id, place.knownToPlayers]), [["place-1", true], ["place-2", false]]);
  assert.equal((await call(world, "worldPlaces", "PUT", "world/places", { body: { places: [{ id: "a" }] } })).status, 400);
  assert.equal((await call(world, "worldPlaces", "PUT", "world/places", { body: { places: [{ id: "a", name: "A" }, { id: "a", name: "B" }] } })).status, 400);
  assert.equal((await world.handlers.worldPlaces(makeRequest("GET", "world/places"), quietContext)).status, 401);
}));

test("unsupported methods and bad bodies are refused cleanly", withDmKey(DM_KEY, async () => {
  const { world } = await started();
  assert.equal((await call(world, "world", "DELETE", "world")).status, 405);
  const badJson = await world.handlers.worldEvents({ ...makeRequest("POST", "world/events", { key: DM_KEY }), text: async () => "{not json" }, quietContext);
  assert.equal(badJson.status, 400);
}));

test("the Function loads the same engine files the browser uses", async () => {
  const { getWorldEngine } = require("../../api/src/worldRuntime.js");
  const loaded = await getWorldEngine();
  assert.equal(loaded.ENGINE_VERSION, engine.ENGINE_VERSION);
  assert.equal(typeof loaded.advanceDay, "function");
  const { stageWorldRuntime } = require("../../api/tools/stage-world-runtime.js");
  const os = await import("node:os");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "world-runtime-"));
  try {
    assert.ok(stageWorldRuntime(dir) >= 7, "the engine and everything it imports is staged");
    for (const file of ["index.js", "tick.js", "events.js", "countdowns.js", "ledger.js", "rng.js", "calendar.js"]) {
      assert.equal(
        fs.readFileSync(path.join(dir, "world-sim/engine", file), "utf8"),
        fs.readFileSync(new URL(`../engine/${file}`, import.meta.url), "utf8"),
        `${file} is staged byte for byte`
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
