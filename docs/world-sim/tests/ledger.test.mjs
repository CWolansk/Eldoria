// Stage 1 engine: countdowns, reveal rows, and rebuilding state from the record.
import test from "node:test";
import assert from "node:assert/strict";
import {
  COUNTDOWN_MODE, WORLD_START_DAY, advanceDay, applyRecords, countdownTag,
  createCountdown, createCountdownEdit, createCountdownFinish, createCountdownStep,
  createDecision, createStartState, createSuggestedEvent, createVisibility,
  createWrittenEvent, foldRecord, formatDay, isCountdownDue, listCountdowns, rebuildState
} from "../engine/index.js";

const DAY = WORLD_START_DAY;
const start = (seed = "seed-a") => createStartState({ worldSeed: seed });

function chanceCountdown(overrides = {}) {
  return createCountdown({
    id: "k1", countdownId: "c1", day: DAY, label: "Test build-up", size: 4, mode: "chance",
    chance: 0.5, suggestionText: "The build-up comes to a head.", place: "place-1", ...overrides
  });
}

function datedCountdown(overrides = {}) {
  return createCountdown({
    id: "k2", countdownId: "c2", day: DAY, label: "Test occasion", mode: "date",
    dueDay: DAY + 3, suggestionText: "The occasion takes place.", ...overrides
  });
}

function runDays(state, records, days) {
  let current = state;
  const all = [...records];
  const reports = [];
  for (let index = 0; index < days; index += 1) {
    const result = advanceDay(current, all);
    all.push(...result.suggestions);
    reports.push(...result.report);
    current = result.state;
  }
  return { state: current, records: all, reports };
}

const only = (state, id) => listCountdowns(state).find((item) => item.id === id);

test("the world starts on Fall 7, 496 with nothing in it", () => {
  const state = start();
  assert.equal(state.day, 99306);
  assert.equal(formatDay(state.day), "Fall 7, 496");
  assert.deepEqual(listCountdowns(state), []);
});

test("a countdown must have 4, 6 or 8 steps, a name and a suggestion", () => {
  assert.throws(() => chanceCountdown({ size: 5 }), /4, 6, 8/);
  assert.throws(() => chanceCountdown({ label: " " }), /name is required/);
  assert.throws(() => chanceCountdown({ suggestionText: "" }), /suggests/);
  assert.throws(() => chanceCountdown({ chance: 0 }), /chance/);
  assert.throws(() => chanceCountdown({ chance: 1.5 }), /chance/);
  assert.throws(() => datedCountdown({ dueDay: DAY }), /after today/);
  for (const size of [4, 6, 8]) {
    assert.equal(chanceCountdown({ size }).countdown.size, size);
  }
});

test("a chance countdown gains steps by seeded rolls, then suggests once and waits", () => {
  const { state, records, reports } = runDays(start(), [chanceCountdown()], 40);
  const item = only(state, "c1");
  assert.equal(item.fill, 4);
  assert.equal(item.waiting, true);
  const suggested = records.filter((record) => record.recordType === "event");
  assert.equal(suggested.length, 1, "it suggests exactly once, however long it waits");
  assert.equal(suggested[0].status, "suggested");
  assert.equal(suggested[0].text, "The build-up comes to a head.");
  assert.equal(suggested[0].place, "place-1");
  assert.match(suggested[0].why, /filled up/);
  assert.ok(suggested[0].tags.includes(countdownTag("c1")));
  assert.equal(item.suggestionId, suggested[0].id);
  assert.equal(reports.filter((line) => line.kind === "Countdown").length, 4, "one report line per step");
});

test("the same seed gives the same days; a different seed gives different ones", () => {
  const a = runDays(start("seed-a"), [chanceCountdown()], 12);
  const b = runDays(start("seed-a"), [chanceCountdown()], 12);
  assert.deepEqual(a.state, b.state);
  assert.deepEqual(a.reports, b.reports);
  const fills = ["s1", "s2", "s3", "s4", "s5", "s6"].map((seed) => {
    const reports = runDays(start(seed), [chanceCountdown()], 12).reports;
    return reports.map((line) => line.day).join(",");
  });
  assert.ok(new Set(fills).size > 1, "different seeds do not all roll alike");
});

test("adding a second countdown does not change the first one's rolls", () => {
  const alone = runDays(start(), [chanceCountdown()], 15);
  const both = runDays(start(), [chanceCountdown(), chanceCountdown({ id: "k9", countdownId: "c0-other", label: "Other" })], 15);
  const days = (run) => run.reports.filter((line) => line.countdownId === "c1").map((line) => line.day);
  assert.deepEqual(days(both), days(alone));
});

test("a dated countdown suggests on its date, not before", () => {
  const before = runDays(start(), [datedCountdown()], 2);
  assert.equal(only(before.state, "c2").waiting, false);
  assert.equal(before.records.filter((record) => record.recordType === "event").length, 0);
  const on = runDays(start(), [datedCountdown()], 3);
  const event = on.records.find((record) => record.recordType === "event");
  assert.equal(event.day, DAY + 3);
  assert.match(event.why, /date/);
  assert.equal(only(on.state, "c2").waiting, true);
});

test("accept or reword finishes a countdown", () => {
  for (const decision of ["accept", "reword"]) {
    const run = runDays(start(), [chanceCountdown({ chance: 1 })], 4);
    const event = run.records.find((record) => record.recordType === "event");
    const row = createDecision({ id: "d1", eventId: event.id, decision, text: "Reworded.", day: run.state.day });
    const item = only(applyRecords(run.state, [row]), "c1");
    assert.equal(item.done, true, decision);
    assert.equal(item.waiting, false);
  }
});

test("reject sends a chance countdown back to half and it carries on", () => {
  const run = runDays(start(), [chanceCountdown({ chance: 1, size: 6 })], 6);
  const event = run.records.find((record) => record.recordType === "event");
  const reject = createDecision({ id: "d1", eventId: event.id, decision: "reject", day: run.state.day });
  const after = applyRecords(run.state, [reject]);
  assert.deepEqual(
    { fill: only(after, "c1").fill, done: only(after, "c1").done, waiting: only(after, "c1").waiting },
    { fill: 3, done: false, waiting: false }
  );
  const later = runDays(run.state, [...run.records, reject], 3);
  assert.equal(only(later.state, "c1").waiting, true, "it fills again and suggests again");
  assert.equal(later.records.filter((record) => record.recordType === "event").length, 2);
});

test("reject finishes a dated countdown: the occasion did not happen", () => {
  const run = runDays(start(), [datedCountdown()], 3);
  const event = run.records.find((record) => record.recordType === "event");
  const after = applyRecords(run.state, [createDecision({ id: "d1", eventId: event.id, decision: "reject", day: run.state.day })]);
  assert.equal(only(after, "c2").done, true);
});

test("stepping by hand moves one step either way and stays within bounds", () => {
  const step = (delta, id) => createCountdownStep({ id, countdownId: "c1", day: DAY, delta });
  let state = applyRecords(start(), [chanceCountdown({ fill: 1 })]);
  state = applyRecords(state, [step(1, "s1"), step(1, "s2")]);
  assert.equal(only(state, "c1").fill, 3);
  state = applyRecords(state, [step(-1, "s3"), step(-1, "s4"), step(-1, "s5"), step(-1, "s6"), step(-1, "s7")]);
  assert.equal(only(state, "c1").fill, 0);
  state = applyRecords(state, [1, 2, 3, 4, 5, 6].map((n) => step(1, `u${n}`)));
  assert.equal(only(state, "c1").fill, 4);
  assert.equal(isCountdownDue(only(state, "c1"), DAY), true);
  assert.throws(() => step(2, "bad"), /one forward or one back/);
});

test("edit changes only what is given; finish closes without an event", () => {
  let state = applyRecords(start(), [chanceCountdown()]);
  state = applyRecords(state, [createCountdownEdit({ id: "e1", countdownId: "c1", day: DAY, changes: { label: "Renamed", chance: 0.1 } })]);
  const item = only(state, "c1");
  assert.equal(item.label, "Renamed");
  assert.equal(item.chance, 0.1);
  assert.equal(item.suggestionText, "The build-up comes to a head.");
  assert.throws(() => createCountdownEdit({ id: "e2", countdownId: "c1", day: DAY, changes: {} }), /Nothing to change/);
  state = applyRecords(state, [createCountdownFinish({ id: "f1", countdownId: "c1", day: DAY })]);
  assert.equal(only(state, "c1").done, true);
  const after = runDays(state, [], 20);
  assert.equal(after.records.length, 0, "a finished countdown never rolls or suggests");
});

test("inputs are never modified", () => {
  const state = start();
  const records = [chanceCountdown({ chance: 1 })];
  const frozenState = structuredClone(state);
  const frozenRecords = structuredClone(records);
  advanceDay(state, records);
  applyRecords(state, records);
  assert.deepEqual(state, frozenState);
  assert.deepEqual(records, frozenRecords);
});

test("the state can be rebuilt from the start, the record and the seed alone", () => {
  // Play eight days with jots, a hand step, a rejection and an acceptance mixed in.
  const records = [chanceCountdown({ chance: 1, size: 4 }), datedCountdown({ dueDay: DAY + 5 })];
  let state = start("rebuild-seed");
  const saved = new Map([[state.day, structuredClone(state)]]);
  for (let index = 0; index < 8; index += 1) {
    const result = advanceDay(state, records);
    state = result.state;
    saved.set(state.day, structuredClone(state));
    records.push(...result.suggestions);
    records.push(createWrittenEvent({ id: `e${index}`, day: state.day, text: `Something written on day ${index}.` }));
    for (const suggestion of result.suggestions) {
      const reject = suggestion.tags.includes(countdownTag("c1")) && index < 5;
      records.push(createDecision({ id: `d-${suggestion.id}`, eventId: suggestion.id, decision: reject ? "reject" : "accept", day: state.day }));
    }
    if (index === 2) {
      records.push(createCountdownStep({ id: "hand", countdownId: "c1", day: state.day, delta: -1 }));
    }
  }

  const rebuilt = rebuildState(start("rebuild-seed"), records, state.day);
  const current = applyRecords(state, records.filter((record) => record.day === state.day));
  assert.deepEqual(rebuilt.state, current);

  // Every earlier committed day comes out the same too.
  for (const [day, snapshot] of saved) {
    const earlier = rebuildState(start("rebuild-seed"), records, day).state;
    assert.deepEqual(earlier, applyRecords(snapshot, records.filter((record) => record.day === day)), `day ${day}`);
  }

  // And every suggestion the ticks raised is already in the record, id for id.
  const recorded = new Set(records.filter((record) => record.recordType === "event").map((record) => record.id));
  for (const suggestion of rebuilt.suggestions) {
    assert.ok(recorded.has(suggestion.id), suggestion.id);
  }
});

test("applying a day's rows twice from the committed state gives the same result", () => {
  const run = runDays(start(), [chanceCountdown({ chance: 1 })], 4);
  const dayRows = run.records.filter((record) => record.day === run.state.day);
  assert.deepEqual(applyRecords(run.state, dayRows), applyRecords(applyRecords(run.state, dayRows), dayRows));
});

test("events are hidden from players until a reveal row says otherwise", () => {
  const written = createWrittenEvent({ id: "e1", day: DAY, text: "Written." });
  const suggested = createSuggestedEvent({ id: "s1", day: DAY, text: "Suggested." });
  const reveal = createVisibility({ id: "v1", eventId: "e1", playersVisible: true, day: DAY });
  const hide = createVisibility({ id: "v2", eventId: "e1", playersVisible: false, day: DAY + 1 });

  assert.equal(foldRecord([written]).byId.get("e1").playersVisible, false, "hidden by default");
  assert.equal(foldRecord([written, suggested]).byId.get("s1").playersVisible, false);
  assert.equal(foldRecord([written, reveal]).byId.get("e1").playersVisible, true);
  assert.equal(foldRecord([written, reveal, hide]).byId.get("e1").playersVisible, false);
  assert.equal(createVisibility({ id: "v3", eventId: "e1", playersVisible: "yes", day: DAY }).playersVisible, false,
    "only a real true reveals");
  const stray = foldRecord([createVisibility({ id: "v4", eventId: "nope", playersVisible: true, day: DAY })]);
  assert.equal(stray.ignored[0].reason, "unknown-event");
});

test("countdown rows do not disturb the event fold", () => {
  const folded = foldRecord([chanceCountdown(), createWrittenEvent({ id: "e1", day: DAY, text: "Written." })]);
  assert.equal(folded.events.length, 1);
  assert.equal(folded.ignored.length, 0);
});

test("mode names are stable", () => {
  assert.deepEqual({ ...COUNTDOWN_MODE }, { CHANCE: "chance", DATE: "date" });
});
