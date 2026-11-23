// Stage 3 routes: the city outline, rumours, travelling NPCs, people and sickness
// effects, threats on roads, the overview, and the second public route.
// Towns, people and tales here are made up for the tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
  DM_KEY, WORLD_PUBLIC_ROUTES, WORLD_ROUTES, makeRequest, makeWorld, quietContext, testSetup, withDmKey
} from "./helpers.mjs";

const body = (response) => JSON.parse(response.body || "{}");

function call(world, handler, method, path, options = {}) {
  return world.handlers[handler](makeRequest(method, path, { key: DM_KEY, ...options }), quietContext);
}

async function ok(world, handler, method, path, options) {
  const response = await call(world, handler, method, path, options);
  assert.equal(response.status, 200, `${method} ${path}: ${response.body}`);
  return body(response);
}

async function started() {
  const world = makeWorld();
  await ok(world, "worldStart", "POST", "world/start", { body: {} });
  await ok(world, "worldPlaces", "PUT", "world/places", { body: testSetup() });
  return world;
}

async function advance(world, days = 1) {
  const current = await ok(world, "world", "GET", "world");
  return ok(world, "worldAdvance", "POST", "world/advance", { body: { days, expectedEtag: current.etag } });
}

const jot = (world, input) => ok(world, "worldEvents", "POST", "world/events", { body: input });
const overview = (world) => ok(world, "worldOverview", "GET", "world/overview");
const publicRumours = async (world, key) => {
  const response = await world.handlers.worldPublicRumours(makeRequest("GET", "world/public/rumours", key === undefined ? {} : { key }), quietContext);
  return { status: response.status, body: response.body, json: body(response) };
};
const rowsOf = async (world, type) => (await world.store.listRecords()).filter((row) => row.recordType === type);

test("the Stage 3 routes are registered and all behind the DM key except public rumours", () => {
  const routes = WORLD_ROUTES.map((entry) => entry.route);
  for (const route of ["world/overview", "world/city", "world/city/import", "world/city/{id}/actions", "world/rumours",
    "world/rumours/{id}/actions", "world/travellers", "world/travellers/{id}/end"]) {
    assert.ok(routes.includes(route), `${route} is registered and DM-locked`);
  }
  assert.deepEqual(WORLD_PUBLIC_ROUTES.map((entry) => entry.route), ["world/public/prices", "world/public/rumours"]);
});

/* ---------------- cities ---------------- */

test("city: entries are added by appended rows, hidden from players by default, with readable ids", withDmKey(DM_KEY, async () => {
  const world = await started();
  assert.deepEqual((await ok(world, "worldCity", "GET", "world/city")).entries, [], "a city starts with nothing; that is fine");

  const district = await ok(world, "worldCity", "POST", "world/city", { body: { type: "district", town: "openton", name: "Old Quarter" } });
  assert.equal(district.entryId, "openton--district--old-quarter");
  const inn = await ok(world, "worldCity", "POST", "world/city", { body: { type: "location", town: "openton", name: "The Anchor", kind: "Inn", note: "Fish stew", district: district.entryId } });
  assert.equal(inn.entryId, "openton--the-anchor");
  const npc = await ok(world, "worldCity", "POST", "world/city", { body: { type: "npc", town: "openton", name: "Mara", kind: "Innkeeper", location: inn.entryId } });
  assert.equal(npc.entryId, "npc--openton--mara");
  const loose = await ok(world, "worldCity", "POST", "world/city", { body: { type: "npc", town: "openton", name: "Tob" } });
  const twin = await ok(world, "worldCity", "POST", "world/city", { body: { type: "npc", town: "openton", name: "Mara" } });
  assert.equal(twin.entryId, "npc--openton--mara-2", "a second Mara gets her own id");

  const entries = Object.fromEntries(twin.entries.map((entry) => [entry.id, entry]));
  assert.equal(entries[npc.entryId].district, district.entryId, "at the inn, so in the inn's district");
  assert.equal(entries[loose.entryId].location, null, "somewhere in town");
  assert.ok(twin.entries.every((entry) => entry.playersKnow === false && entry.retired === false));
  assert.equal((await rowsOf(world, "city")).length, 5);

  for (const [input, message] of [
    [{ type: "npc", town: "nowhere", name: "X" }, /not in your list of places/],
    [{ type: "npc", town: "openton--inn", name: "X" }, /not in your list of places/],
    [{ type: "npc", town: "openton", name: "" }, /needs a name/],
    [{ type: "map", town: "openton", name: "City map" }, /district, a location or an NPC/],
    [{ type: "npc", town: "secretville", name: "X", location: inn.entryId }, /not in this town/],
    [{ type: "location", town: "openton", name: "X", district: inn.entryId }, /not in this town/]
  ]) {
    const response = await call(world, "worldCity", "POST", "world/city", { body: input });
    assert.equal(response.status, 400, JSON.stringify(input));
    assert.match(body(response).error, message);
  }
  assert.equal((await rowsOf(world, "city")).length, 5, "a refused entry writes nothing");
}));

test("city: rename, move, mark as known, retire and restore; nothing is ever deleted", withDmKey(DM_KEY, async () => {
  const world = await started();
  const add = (input) => ok(world, "worldCity", "POST", "world/city", { body: input });
  const act = (id, input) => call(world, "worldCityEntry", "POST", `world/city/${id}/actions`, { params: { id }, body: input });
  const district = (await add({ type: "district", town: "openton", name: "Docks" })).entryId;
  const shop = (await add({ type: "location", town: "openton", name: "Chandlery", kind: "Shop" })).entryId;
  const npc = (await add({ type: "npc", town: "openton", name: "Pell", kind: "Chandler" })).entryId;

  let city = body(await act(shop, { action: "change", changes: { name: "Pell's Chandlery", district, note: "Rope and tar" } }));
  let byId = Object.fromEntries(city.entries.map((entry) => [entry.id, entry]));
  assert.deepEqual([byId[shop].name, byId[shop].district, byId[shop].note], ["Pell's Chandlery", district, "Rope and tar"]);
  assert.equal(byId[shop].id, shop, "the id does not change when the name does");

  city = body(await act(npc, { action: "change", changes: { location: shop, playersKnow: true } }));
  byId = Object.fromEntries(city.entries.map((entry) => [entry.id, entry]));
  assert.deepEqual([byId[npc].location, byId[npc].district, byId[npc].playersKnow], [shop, district, true]);

  // Moving to another town leaves the old district and location behind.
  city = body(await act(npc, { action: "change", changes: { town: "secretville" } }));
  byId = Object.fromEntries(city.entries.map((entry) => [entry.id, entry]));
  assert.deepEqual([byId[npc].town, byId[npc].location, byId[npc].district], ["secretville", null, null]);

  assert.equal((await act(npc, { action: "retire" })).status, 200);
  assert.equal((await act(npc, { action: "retire" })).status, 409);
  city = await ok(world, "worldCity", "GET", "world/city");
  assert.equal(city.entries.find((entry) => entry.id === npc).retired, true);
  assert.equal(city.entries.length, 3, "retired entries stay in the list");
  assert.equal((await act(npc, { action: "restore" })).status, 200);
  assert.equal((await act(npc, { action: "restore" })).status, 409);

  assert.equal((await act("nobody", { action: "retire" })).status, 404);
  assert.equal((await act(npc, { action: "delete" })).status, 400, "there is no delete");
  assert.equal((await act(shop, { action: "change", changes: { district: "openton--no-such" } })).status, 400);
  assert.equal((await act(shop, { action: "change", changes: {} })).status, 400);

  const rows = await rowsOf(world, "city");
  assert.deepEqual(rows.map((row) => row.action), ["add", "add", "add", "change", "change", "change", "retire", "restore"]);
}));

test("city: the seed imports once; loading it again adds nothing", withDmKey(DM_KEY, async () => {
  const world = await started();
  const entries = [
    { id: "npc--openton--ada", type: "npc", town: "openton", name: "Ada", kind: "Baker", location: "openton--inn", source: "notes/ada.md, line 3" },
    { id: "openton--inn", type: "location", town: "openton", name: "The Inn", kind: "Inn", playersKnow: true, source: "notes/inn.md" },
    { id: "npc--secretville--bo", type: "npc", town: "secretville", name: "Bo", kind: "Miller" }
  ];
  const first = await ok(world, "worldCityImport", "POST", "world/city/import", { body: { entries } });
  assert.deepEqual([first.added, first.skipped], [3, 0]);
  const ada = first.entries.find((entry) => entry.id === "npc--openton--ada");
  assert.deepEqual([ada.location, ada.source, ada.playersKnow], ["openton--inn", "notes/ada.md, line 3", false], "locations are added before the people in them");
  assert.equal(first.entries.find((entry) => entry.id === "openton--inn").playersKnow, true);

  const again = await ok(world, "worldCityImport", "POST", "world/city/import", { body: { entries } });
  assert.deepEqual([again.added, again.skipped], [0, 3]);
  assert.equal((await rowsOf(world, "city")).length, 3);

  const bad = await call(world, "worldCityImport", "POST", "world/city/import", { body: { entries: [{ id: "x", type: "npc", town: "atlantis", name: "X" }] } });
  assert.equal(bad.status, 400);
  assert.equal((await call(world, "worldCityImport", "POST", "world/city/import", { body: {} })).status, 400);
}));

/* ---------------- rumours ---------------- */

test("rumours: started only by the DM, about a written event or as unwritten talk", withDmKey(DM_KEY, async () => {
  const world = await started();
  await advance(world, 5);
  assert.deepEqual((await ok(world, "worldRumours", "GET", "world/rumours")).rumours, [], "the simulation never starts one");

  const { event } = await jot(world, { text: "The mill at Secretville burned.", place: "secretville" });
  const start = (input) => call(world, "worldRumours", "POST", "world/rumours", { body: input });
  const good = body(await start({ eventId: event.id, truth: "written", who: "the miller", what: "burned his own mill", size: 3, flatters: false }));
  assert.equal(good.rumours.length, 1);
  assert.deepEqual([good.rumours[0].origin, good.rumours[0].truth, good.rumours[0].version.where], ["secretville", "written", "secretville"], "it starts where the event happened");
  assert.equal(good.rumours[0].trueText, "The miller burned his own mill in Secretville.");
  assert.deepEqual(good.rumours[0].tags, ["unflattering", "big"], "size and tone are tags beside the telling");

  const talk = body(await start({ origin: "openton", who: "a ghost", what: "walks the walls" }));
  assert.equal(talk.rumours.find((rumour) => rumour.id === talk.rumourId).truth, "unwritten");

  for (const [input, message] of [
    [{ truth: "written", origin: "openton", what: "x" }, /points at the written event/],
    [{ eventId: "e-nope", origin: "openton", what: "x" }, /only be about an event that is written/],
    [{ origin: "openton--inn", what: "x" }, /in your setup/],
    [{ what: "x" }, /where the rumour starts/],
    [{ origin: "openton" }, /what the rumour says/],
    [{ origin: "openton", what: "x", size: 9 }, /How big/]
  ]) {
    const response = await start(input);
    assert.equal(response.status, 400, JSON.stringify(input));
    assert.match(body(response).error, message);
  }
  assert.equal((await rowsOf(world, "rumour")).length, 2);
}));

test("rumours: spread with the days, can be ended, and can be marked true later", withDmKey(DM_KEY, async () => {
  const world = await started();
  const begun = await ok(world, "worldRumours", "POST", "world/rumours", { body: { origin: "openton", who: "a ghost", what: "walks the walls" } });
  const id = begun.rumourId;
  const act = (input) => call(world, "worldRumourAction", "POST", `world/rumours/${id}/actions`, { params: { id }, body: input });
  await advance(world, 1);
  assert.deepEqual((await overview(world)).rumours[0].heard.map((entry) => entry.place), ["openton"]);
  const day2 = await advance(world, 1);
  assert.ok(day2.advanced.report.some((line) => line.kind === "Rumour" && line.place === "secretville"));
  assert.deepEqual((await overview(world)).rumours[0].heard.map((entry) => entry.place), ["openton", "secretville"]);

  assert.equal((await act({ action: "confirm", eventId: "nope" })).status, 400);
  const { event } = await jot(world, { text: "There really is a ghost.", place: "openton" });
  assert.equal(body(await act({ action: "confirm", eventId: event.id })).rumours[0].truth, "written");

  assert.equal((await act({ action: "end" })).status, 200);
  assert.equal((await act({ action: "end" })).status, 409);
  await advance(world, 6);
  assert.deepEqual((await overview(world)).rumours[0].heard.map((entry) => entry.place), ["openton", "secretville"], "an ended rumour goes no further");
  assert.equal((await act({ action: "shout" })).status, 400);
  assert.equal((await call(world, "worldRumourAction", "POST", "world/rumours/none/actions", { params: { id: "none" }, body: { action: "end" } })).status, 404);
}));

test("public rumours: only what the DM revealed, only in the party's known town, and nothing else", withDmKey(DM_KEY, async () => {
  const world = await started();
  const empty = { place: null, rumours: [] };
  assert.deepEqual((await publicRumours(world)).json, empty, "no party set");

  const begun = await ok(world, "worldRumours", "POST", "world/rumours", { body: { origin: "secretville", who: "the miller of Secretville", what: "hoards grain", flatters: false } });
  const id = begun.rumourId;
  const reveal = (place, playersVisible) => call(world, "worldRumourAction", "POST", `world/rumours/${id}/actions`, { params: { id }, body: { action: "reveal", place, playersVisible } });
  assert.equal((await reveal("openton", true)).status, 409, "it has not reached Openton yet");
  await advance(world, 2);

  await ok(world, "worldParty", "POST", "world/party", { body: { place: "openton" } });
  assert.deepEqual((await publicRumours(world)).json, { place: { name: "Openton" }, rumours: [] }, "heard there, but not revealed");

  assert.equal((await reveal("openton", true)).status, 200);
  const shown = await publicRumours(world);
  assert.equal(shown.json.rumours.length, 1);
  assert.deepEqual(Object.keys(shown.json), ["place", "rumours"]);
  assert.deepEqual(Object.keys(shown.json.rumours[0]), ["text"]);
  // The rumour's id feeds the seed, so which detail bent on the way differs from run to run.
  // Any one bend is fine: the name may be lost ("someone"); everything else bends only as a tag.
  assert.match(shown.json.rumours[0].text, /^(The miller of Secretville|Someone) hoards grain\.$/, "the tale as told: the DM's words and nothing appended");
  assert.doesNotMatch(shown.body, /speak well|blame them|something like it|a stranger|flatter|vague|tag/iu, "no filler and no tags reach the players");
  assert.doesNotMatch(shown.body, /secretville|truth|heard|origin|bent|eventId|rumour-|unwritten/, "no ids, no truth, no spread");
  assert.doesNotMatch(shown.body.replace(/[Tt]he miller of Secretville/u, ""), /Secretville/, "the hidden town appears only in words the DM chose to reveal");

  // Same answer with no key, a wrong key or the right one; and it works with no key on the server.
  assert.equal((await publicRumours(world, "wrong")).body, shown.body);
  assert.equal((await publicRumours(world, DM_KEY)).body, shown.body);

  // The party moves to a hidden town: nothing at all.
  await ok(world, "worldParty", "POST", "world/party", { body: { place: "secretville" } });
  assert.deepEqual((await publicRumours(world)).json, empty);
  await ok(world, "worldParty", "POST", "world/party", { body: { place: "openton" } });

  assert.equal((await reveal("openton", false)).status, 200);
  assert.deepEqual((await publicRumours(world)).json.rumours, []);
  assert.equal((await reveal("openton")).status, 400);

  const post = await world.handlers.worldPublicRumours(makeRequest("POST", "world/public/rumours", { body: {} }), quietContext);
  assert.equal(post.status, 405);
  const rows = (await world.store.listRecords()).length;
  await publicRumours(world);
  assert.equal((await world.store.listRecords()).length, rows, "reading writes nothing");
}));

test("public rumours answer empty before the world is started, even with no DM key on the server", withDmKey(undefined, async () => {
  const world = makeWorld();
  const answer = await publicRumours(world);
  assert.equal(answer.status, 200);
  assert.deepEqual(answer.json, { place: null, rumours: [] });
}));

/* ---------------- travellers ---------------- */

test("travellers: an NPC from the city outline is given an itinerary, moves, and can be stopped", withDmKey(DM_KEY, async () => {
  const world = await started();
  const npc = (await ok(world, "worldCity", "POST", "world/city", { body: { type: "npc", town: "openton", name: "Old Vintner", kind: "Wine merchant" } })).entryId;
  const set = (input) => call(world, "worldTravellers", "POST", "world/travellers", { body: input });

  assert.equal((await set({ npcId: "npc--nobody", stops: [{ place: "openton" }, { place: "secretville" }] })).status, 400);
  assert.equal((await set({ npcId: npc, stops: [{ place: "openton" }, { place: "atlantis" }] })).status, 400);
  assert.equal((await set({ npcId: npc, stops: [{ place: "openton" }] })).status, 400);

  const city = body(await set({ npcId: npc, stops: [{ place: "openton", stay: 1 }, { place: "secretville", stay: 2 }], loop: true }));
  assert.deepEqual(city.travellers.map((who) => [who.name, who.at]), [["Old Vintner", "openton"]]);

  await advance(world, 1);
  let [who] = (await overview(world)).travellers;
  assert.deepEqual([who.at, who.from, who.to], [null, "openton", "secretville"], "on the road");
  const arrived = await advance(world, 2);
  assert.ok(arrived.advanced.report.some((line) => line.kind === "Traveller" && /Old Vintner arrives in Secretville/.test(line.text)));
  [who] = (await overview(world)).travellers;
  assert.equal(who.at, "secretville");

  const end = (id) => call(world, "worldTravellerEnd", "POST", `world/travellers/${id}/end`, { params: { id } });
  assert.equal((await end(npc)).status, 200);
  assert.equal((await end(npc)).status, 404);
  assert.deepEqual((await overview(world)).travellers, []);
  await advance(world, 5);
  assert.deepEqual((await overview(world)).travellers, [], "they stay put once the itinerary is ended");
}));

/* ---------------- people, sickness, threats ---------------- */

test("a written event can move people or make a sickness real; nothing else can", withDmKey(DM_KEY, async () => {
  const world = await started();
  await advance(world, 10);
  let view = await overview(world);
  assert.deepEqual(view.sickness, []);
  assert.deepEqual(view.people.population.map((entry) => [entry.place, entry.now]), [["openton", 2000], ["secretville", 1000]]);
  assert.deepEqual(view.people.moves, []);

  await jot(world, { text: "Two hundred leave Openton.", place: "openton", effect: { type: "people-move", from: "openton", to: "secretville", people: 200, days: 2 } });
  await jot(world, { text: "Marsh fever is real in Secretville.", place: "secretville", effect: { type: "sickness-start", place: "secretville", name: "marsh fever" } });
  view = await overview(world);
  assert.equal(view.people.moves.length, 1);
  assert.deepEqual(view.sickness.map((entry) => [entry.place, entry.name, entry.ended]), [["secretville", "marsh fever", false]]);

  await advance(world, 6);
  view = await overview(world);
  assert.deepEqual(view.people.population.map((entry) => [entry.place, entry.now]), [["openton", 1800], ["secretville", 1200]]);
  assert.ok(view.sickness[0].sick > 2, "it grew");

  await jot(world, { text: "The fever has passed.", place: "secretville", effect: { type: "sickness-end", place: "secretville" } });
  assert.equal((await overview(world)).sickness[0].ended, true);

  for (const [effect, message] of [
    [{ type: "people-move", from: "openton", to: "openton", people: 5 }, /two different places/],
    [{ type: "people-move", from: "farplace", to: "openton", people: 5 }, /no head count/],
    [{ type: "people-move", from: "openton", to: "atlantis", people: 5 }, /not in it/],
    [{ type: "sickness-start", place: "farplace" }, /no head count/],
    [{ type: "sickness-end", place: "openton" }, /No sickness/],
    [{ type: "earthquake" }, /not known/]
  ]) {
    const response = await call(world, "worldEvents", "POST", "world/events", { body: { text: "x", effect } });
    assert.equal(response.status, 400, JSON.stringify(effect));
    assert.match(body(response).error, message);
  }
}));

test("threats: a countdown may sit on a road, and shows in the overview", withDmKey(DM_KEY, async () => {
  const world = await started();
  const bad = await call(world, "worldCountdowns", "POST", "world/countdowns", { body: { label: "Bandits", size: 4, chance: 0.5, route: "nowhere--road", suggestionText: "x" } });
  assert.equal(bad.status, 400);
  await ok(world, "worldCountdowns", "POST", "world/countdowns", { body: {
    label: "Bandits on the Secretville road", size: 4, chance: 0.5, fill: 1, route: "openton--secretville",
    suggestionText: "Bandits rob a caravan.", effect: { type: "pressure", target: "route", route: "openton--secretville", multiplier: 0.35, days: 6 }
  } });
  const view = await overview(world);
  assert.deepEqual(view.threats.map((threat) => [threat.label, threat.route, threat.place, threat.fill, threat.size]), [["Bandits on the Secretville road", "openton--secretville", null, 1, 4]]);
  assert.deepEqual(view.roads.map((road) => [road.id, road.status, road.travel, road.aName, road.bName]), [
    ["openton--secretville", "open", 2, "Openton", "Secretville"], ["secretville--farplace", "open", 3, "Secretville", "Farplace"]
  ]);
}));

test("places keep their map position; a bad position is refused", withDmKey(DM_KEY, async () => {
  const world = makeWorld();
  await ok(world, "worldStart", "POST", "world/start", { body: {} });
  const setup = testSetup();
  setup.places[0].position = [0.79, 0.09];
  const saved = await ok(world, "worldPlaces", "PUT", "world/places", { body: setup });
  assert.deepEqual(saved.places[0].position, [0.79, 0.09]);
  assert.equal(saved.places[1].position, null);
  setup.places[0].position = [2, 0.5];
  assert.equal((await call(world, "worldPlaces", "PUT", "world/places", { body: setup })).status, 400);
}));
