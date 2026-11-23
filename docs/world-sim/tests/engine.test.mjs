import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import * as engine from "../engine/index.js";

const {
  mulberry32, hashString, daySeed, createRng,
  MONTHS, DAYS_PER_MONTH, DAYS_PER_YEAR, toDay, fromDay, formatDay, formatDayShort, parseDay, toIso, parseIso,
  EVENT_STATUS, DECISION, createWrittenEvent, createSuggestedEvent, createDecision, foldRecord,
  writtenEvents, pendingSuggestions,
  ENGINE_VERSION, createRegistry, createInitialState, tick, tickMany
} = engine;

/* ---------------- rng ---------------- */

test("rng: same seed gives the same sequence, different seeds differ", () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  const c = mulberry32(12346);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  const seqC = Array.from({ length: 20 }, () => c());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  assert.ok(seqA.every((value) => value >= 0 && value < 1));
});

test("rng: mulberry32 output is pinned", () => {
  // Values recorded from this implementation and pinned, so a refactor cannot silently change every committed day's rolls.
  const next = mulberry32(1);
  assert.deepEqual(
    [next(), next(), next()].map((value) => Math.round(value * 1e9)),
    [627073941, 2735721, 527447040]
  );
});

test("rng: daySeed is stable and separates days and streams", () => {
  assert.equal(daySeed("eldoria", 99306, "goods"), daySeed("eldoria", 99306, "goods"));
  assert.notEqual(daySeed("eldoria", 99306, "goods"), daySeed("eldoria", 99307, "goods"));
  assert.notEqual(daySeed("eldoria", 99306, "goods"), daySeed("eldoria", 99306, "rumours"));
  assert.notEqual(daySeed("eldoria", 99306, "goods"), daySeed("other", 99306, "goods"));
  assert.equal(hashString("abc"), hashString("abc"));
  assert.ok(Number.isInteger(daySeed("x", 1)) && daySeed("x", 1) >= 0);
});

test("rng: createRng helpers stay in range and are repeatable", () => {
  const one = createRng(77);
  const two = createRng(77);
  for (let index = 0; index < 200; index += 1) {
    const value = one.int(1, 6);
    assert.equal(value, two.int(1, 6));
    assert.ok(value >= 1 && value <= 6);
  }
  assert.equal(createRng(1).chance(0), false);
  assert.equal(createRng(1).chance(1), true);
  assert.equal(createRng(1).pick([]), undefined);
  assert.ok(["a", "b", "c"].includes(createRng(5).pick(["a", "b", "c"])));
});

/* ---------------- calendar ---------------- */

test("calendar: four 50-day months and a 200-day year", () => {
  assert.deepEqual([...MONTHS], ["Spring", "Summer", "Fall", "Winter"]);
  assert.equal(DAYS_PER_MONTH, 50);
  assert.equal(DAYS_PER_YEAR, 200);
});

test("calendar: Fall 7, 496 round trips through every form", () => {
  const day = toDay({ year: 496, monthIndex: 2, dayOfMonth: 7 });
  assert.equal(day, 99306);
  assert.equal(formatDay(day), "Fall 7, 496");
  assert.equal(formatDayShort(day), "Fall 7");
  assert.equal(parseDay("Fall 7, 496"), day);
  assert.equal(parseDay("  fall 7 496 "), day);
  assert.equal(toIso(day), "0496-03-07");
  assert.equal(parseIso("0496-03-07"), day);
  assert.deepEqual(fromDay(day), { year: 496, monthIndex: 2, month: "Fall", dayOfMonth: 7, dayOfYear: 107 });
});

test("calendar: day 50 of a month is followed by day 1 of the next", () => {
  const last = toDay({ year: 496, monthIndex: 1, dayOfMonth: 50 });
  assert.equal(formatDay(last), "Summer 50, 496");
  assert.equal(formatDay(last + 1), "Fall 1, 496");
  assert.equal(toIso(last), "0496-02-50");
  assert.equal(toIso(last + 1), "0496-03-01");
});

test("calendar: Winter 50 rolls over to Spring 1 of the next year", () => {
  const last = toDay({ year: 496, monthIndex: 3, dayOfMonth: 50 });
  assert.equal(formatDay(last), "Winter 50, 496");
  assert.equal(formatDay(last + 1), "Spring 1, 497");
  assert.equal(fromDay(last).dayOfYear, 200);
  assert.equal(fromDay(last + 1).dayOfYear, 1);
});

test("calendar: every day of two years round trips", () => {
  const start = toDay({ year: 496, monthIndex: 0, dayOfMonth: 1 });
  for (let day = start; day < start + 2 * DAYS_PER_YEAR; day += 1) {
    assert.equal(parseDay(formatDay(day)), day);
    assert.equal(parseIso(toIso(day)), day);
    assert.equal(toDay(fromDay(day)), day);
  }
});

test("calendar: bad input is rejected, not guessed", () => {
  assert.equal(parseDay("Fall 51, 496"), null);
  assert.equal(parseDay("Fall 0, 496"), null);
  assert.equal(parseDay("Autumn 7, 496"), null);
  assert.equal(parseDay(""), null);
  assert.equal(parseIso("0496-05-01"), null);
  assert.equal(parseIso("0496-03-51"), null);
  assert.throws(() => fromDay(-1), RangeError);
  assert.throws(() => fromDay(1.5), RangeError);
  assert.throws(() => toDay({ year: 496, monthIndex: 4, dayOfMonth: 1 }), RangeError);
  assert.throws(() => toDay({ year: 496, monthIndex: 0, dayOfMonth: 51 }), RangeError);
});

/* ---------------- events ---------------- */

const suggestion = (id, text = "Something might happen.") =>
  createSuggestedEvent({ id, day: 99306, text, place: "somewhere" });

test("events: a jotted event is written at once; a suggestion is not canon", () => {
  const jot = createWrittenEvent({ id: "e1", day: 99306, text: "The DM wrote this." });
  const sugg = suggestion("s1");
  assert.equal(jot.status, EVENT_STATUS.WRITTEN);
  assert.equal(jot.source, "dm");
  assert.equal(sugg.status, EVENT_STATUS.SUGGESTED);
  assert.equal(sugg.source, "sim");
  const records = [jot, sugg];
  assert.deepEqual(writtenEvents(records).map((event) => event.id), ["e1"]);
  assert.deepEqual(pendingSuggestions(records).map((event) => event.id), ["s1"]);
});

test("events: accept makes a suggestion written and keeps its text", () => {
  const records = [suggestion("s1"), createDecision({ id: "d1", eventId: "s1", decision: DECISION.ACCEPT, day: 99307 })];
  const { events, ignored } = foldRecord(records);
  assert.equal(events.length, 1);
  assert.equal(events[0].status, EVENT_STATUS.WRITTEN);
  assert.equal(events[0].text, "Something might happen.");
  assert.equal(events[0].decidedBy, "d1");
  assert.equal(events[0].decidedOnDay, 99307);
  assert.equal(events[0].source, "sim");
  assert.deepEqual(ignored, []);
});

test("events: reword makes it written with the new text and keeps the original", () => {
  const records = [
    suggestion("s1", "First wording."),
    createDecision({ id: "d1", eventId: "s1", decision: DECISION.REWORD, text: "The DM's wording.", day: 99307 })
  ];
  const [event] = foldRecord(records).events;
  assert.equal(event.status, EVENT_STATUS.WRITTEN);
  assert.equal(event.text, "The DM's wording.");
  assert.equal(event.originalText, "First wording.");
  assert.throws(() => createDecision({ id: "d2", eventId: "s1", decision: DECISION.REWORD, day: 1 }), TypeError);
});

test("events: reject means it never happened and it is not canon", () => {
  const records = [suggestion("s1"), createDecision({ id: "d1", eventId: "s1", decision: DECISION.REJECT, day: 99307 })];
  assert.equal(foldRecord(records).events[0].status, EVENT_STATUS.REJECTED);
  assert.deepEqual(writtenEvents(records), []);
  assert.deepEqual(pendingSuggestions(records), []);
});

test("events: a decision for an unknown id is ignored and reported", () => {
  const stray = createDecision({ id: "d9", eventId: "nope", decision: DECISION.ACCEPT, day: 99307 });
  const { events, ignored } = foldRecord([suggestion("s1"), stray]);
  assert.equal(events[0].status, EVENT_STATUS.SUGGESTED);
  assert.equal(ignored.length, 1);
  assert.equal(ignored[0].reason, "unknown-event");
  assert.equal(ignored[0].record.id, "d9");
});

test("events: the first decision wins; later ones and duplicates are reported", () => {
  const records = [
    suggestion("s1"),
    createDecision({ id: "d1", eventId: "s1", decision: DECISION.REJECT, day: 99307 }),
    createDecision({ id: "d2", eventId: "s1", decision: DECISION.ACCEPT, day: 99308 }),
    suggestion("s1", "A second row with the same id."),
    createDecision({ id: "d3", eventId: "e1", decision: DECISION.REJECT, day: 99308 }),
    { recordType: "mystery", id: "m1" }
  ];
  records.splice(4, 0, createWrittenEvent({ id: "e1", day: 99306, text: "Written by the DM." }));
  const { events, ignored } = foldRecord(records);
  assert.equal(events.find((event) => event.id === "s1").status, EVENT_STATUS.REJECTED);
  assert.equal(events.find((event) => event.id === "e1").status, EVENT_STATUS.WRITTEN);
  assert.deepEqual(ignored.map((entry) => entry.reason), ["already-decided", "duplicate-event", "already-decided", "unknown-record"]);
});

test("events: folding does not modify the record", () => {
  const records = [
    suggestion("s1", "First wording."),
    createDecision({ id: "d1", eventId: "s1", decision: DECISION.REWORD, text: "New wording.", day: 99307 })
  ];
  const before = JSON.stringify(records);
  foldRecord(records);
  assert.equal(JSON.stringify(records), before);
  assert.equal(records[0].status, EVENT_STATUS.SUGGESTED);
});

test("events: required fields are enforced", () => {
  assert.throws(() => createWrittenEvent({ id: "", day: 1, text: "x" }), TypeError);
  assert.throws(() => createWrittenEvent({ id: "e", day: 1, text: "  " }), TypeError);
  assert.throws(() => createWrittenEvent({ id: "e", day: -1, text: "x" }), RangeError);
  assert.throws(() => createDecision({ id: "d", eventId: "e", decision: "maybe", day: 1 }), TypeError);
});

/* ---------------- tick ---------------- */

const START = toDay({ year: 496, monthIndex: 2, dayOfMonth: 7 });

function testRegistry() {
  // Test-only systems. They are not world content; they exist to exercise the hook.
  return createRegistry([
    {
      id: "zeta",
      init: () => ({ rolls: [] }),
      tick(ctx) {
        ctx.state.rolls.push(ctx.rng.int(1, 100));
        ctx.report({ kind: "Test", text: `zeta rolled ${ctx.state.rolls.at(-1)}` });
      }
    },
    {
      id: "alpha",
      init: () => ({ count: 0 }),
      tick(ctx) {
        ctx.state.count += 1;
        if (ctx.rng.chance(0.5)) {
          ctx.suggest({ text: `alpha suggestion on ${ctx.day}`, why: "test", causedBy: ctx.writtenEvents[0]?.id ?? null });
        }
      }
    }
  ]);
}

test("tick: with no systems it only advances the day", () => {
  const state = createInitialState({ day: START, worldSeed: "eldoria" });
  const result = tick(state, []);
  assert.equal(result.state.day, START + 1);
  assert.deepEqual(result.report, []);
  assert.deepEqual(result.suggestions, []);
  assert.deepEqual(result.state.systems, {});
  assert.equal(result.state.engineVersion, ENGINE_VERSION);
  assert.equal(result.state.worldSeed, "eldoria");
});

test("tick: the same seed and inputs give the same output", () => {
  const registry = testRegistry();
  const written = [createWrittenEvent({ id: "e1", day: START, text: "Canon." })];
  const run = () => tickMany(createInitialState({ day: START, worldSeed: "eldoria", registry }), written, 30, { registry });
  const a = run();
  const b = run();
  assert.deepEqual(a, b);
  assert.equal(a.state.day, START + 30);
  assert.equal(a.state.systems.zeta.rolls.length, 30);
  assert.equal(a.state.systems.alpha.count, 30);
  assert.ok(a.suggestions.length > 0 && a.suggestions.length < 30);
});

test("tick: a different seed gives a different run; options.seed overrides the state's", () => {
  const registry = testRegistry();
  const state = createInitialState({ day: START, worldSeed: "eldoria", registry });
  const a = tickMany(state, [], 30, { registry });
  const b = tickMany(state, [], 30, { registry, seed: "what-if" });
  const c = tickMany({ ...state, worldSeed: "what-if" }, [], 30, { registry });
  assert.notDeepEqual(a.state.systems.zeta.rolls, b.state.systems.zeta.rolls);
  assert.deepEqual(b.state.systems.zeta.rolls, c.state.systems.zeta.rolls);
});

test("tick: inputs are never mutated", () => {
  const registry = testRegistry();
  const state = createInitialState({ day: START, worldSeed: "eldoria", registry });
  const written = [createWrittenEvent({ id: "e1", day: START, text: "Canon." })];
  const stateBefore = JSON.stringify(state);
  const writtenBefore = JSON.stringify(written);
  const result = tick(state, written, { registry });
  assert.equal(JSON.stringify(state), stateBefore);
  assert.equal(JSON.stringify(written), writtenBefore);
  assert.notEqual(result.state, state);
  assert.notEqual(result.state.systems.zeta, state.systems.zeta);
});

test("tick: a system cannot change the world view or canon it is handed", () => {
  const registry = createRegistry([{
    id: "rogue",
    tick(ctx) {
      assert.throws(() => { ctx.world.day = 0; }, TypeError);
      assert.throws(() => { ctx.writtenEvents.push({}); }, TypeError);
      assert.throws(() => { ctx.writtenEvents[0].text = "rewritten"; }, TypeError);
    }
  }]);
  const written = [createWrittenEvent({ id: "e1", day: START, text: "Canon." })];
  tick(createInitialState({ day: START, worldSeed: "s", registry }), written, { registry });
  assert.equal(written[0].text, "Canon.");
});

test("tick: suggestions are suggested records with stable ids and their system tag", () => {
  const registry = createRegistry([{
    id: "threats",
    tick(ctx) {
      ctx.suggest({ text: "First.", place: "p1", tags: ["x"] });
      ctx.suggest({ text: "Second." });
    }
  }]);
  const { suggestions } = tick(createInitialState({ day: START, worldSeed: "s", registry }), [], { registry });
  assert.deepEqual(suggestions.map((event) => event.id), [`s-${START + 1}-threats-1`, `s-${START + 1}-threats-2`]);
  assert.ok(suggestions.every((event) => event.status === EVENT_STATUS.SUGGESTED && event.recordType === "event"));
  assert.ok(suggestions.every((event) => event.day === START + 1));
  assert.deepEqual(suggestions[0].tags, ["x", "system:threats"]);
  assert.equal(pendingSuggestions(suggestions).length, 2);
});

test("tick: systems run in id order whatever order they were registered in", () => {
  const order = [];
  const make = (id) => ({ id, tick: () => order.push(id) });
  const subjects = ["rumours", "goods", "roads", "threats", "people", "travellers"];
  const registry = createRegistry(subjects.map(make));
  tick(createInitialState({ day: START, worldSeed: "s", registry }), [], { registry });
  assert.deepEqual(order, [...subjects].sort());
});

test("tick: adding a system does not change what an existing system rolls", () => {
  const zetaOnly = createRegistry([testRegistry().list().find((system) => system.id === "zeta")]);
  const both = testRegistry();
  const a = tickMany(createInitialState({ day: START, worldSeed: "eldoria", registry: zetaOnly }), [], 20, { registry: zetaOnly });
  const b = tickMany(createInitialState({ day: START, worldSeed: "eldoria", registry: both }), [], 20, { registry: both });
  assert.deepEqual(a.state.systems.zeta.rolls, b.state.systems.zeta.rolls);
});

test("tick: registry rejects bad or duplicate systems", () => {
  assert.throws(() => createRegistry([{ id: "", tick() {} }]), TypeError);
  assert.throws(() => createRegistry([{ id: "x" }]), TypeError);
  assert.throws(() => createRegistry([{ id: "x", tick() {} }, { id: "x", tick() {} }]), Error);
  assert.throws(() => tick(null), TypeError);
  assert.throws(() => createInitialState({ day: -1 }), RangeError);
});

/* ---------------- loading ---------------- */

test("engine: loads with import and with require, and both see the same functions", async () => {
  const imported = await import("../engine/index.js");
  const require = createRequire(import.meta.url);
  const required = require("../engine/index.js");
  for (const name of ["tick", "foldRecord", "formatDay", "mulberry32", "createRegistry"]) {
    assert.equal(typeof imported[name], "function", `import: ${name}`);
    assert.equal(typeof required[name], "function", `require: ${name}`);
  }
  assert.equal(required.formatDay(99306), "Fall 7, 496");
});

test("engine: the API loader returns the same engine", async () => {
  const require = createRequire(import.meta.url);
  const { getWorldEngine } = require("../../api/src/worldRuntime.js");
  const loaded = await getWorldEngine();
  assert.equal(loaded.formatDay(99306), "Fall 7, 496");
  assert.equal(loaded.ENGINE_VERSION, ENGINE_VERSION);
});

test("engine: uses no clock, no Math.random and no network", async () => {
  const { readFile, readdir } = await import("node:fs/promises");
  const dir = new URL("../engine/", import.meta.url);
  for (const file of await readdir(dir)) {
    const source = await readFile(new URL(file, dir), "utf8");
    for (const banned of ["Math.random", "Date.now", "new Date", "fetch(", "process.", "require("]) {
      assert.ok(!source.includes(banned), `${file} must not use ${banned}`);
    }
  }
});
