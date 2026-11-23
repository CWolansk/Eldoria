// Stage 3 engine: rumours, people moving, travelling NPCs, threats on roads, sickness,
// and the city outline. Every town and name here is made up for the tests.
import test from "node:test";
import assert from "node:assert/strict";
import * as engine from "../engine/index.js";

const START = 1000;

function setup({ medicine = true } = {}) {
  return {
    goods: [
      { id: "bread", name: "Bread", unit: "loaf", basePrice: 100 },
      { id: "salve", name: "Salve", unit: "pot", basePrice: 500, tags: medicine ? ["medicine"] : [] }
    ],
    routes: [
      { id: "alder--birch", a: "alder", b: "birch", travelDays: 2 },
      { id: "birch--cedar", a: "birch", b: "cedar", travelDays: 1 },
      { id: "cedar--dell", a: "cedar", b: "dell", travelDays: 3 }
    ],
    places: {
      alder: { name: "Alder", knownToPlayers: true, population: 2000, market: { bread: { make: 40, use: 20 }, salve: { make: 3, use: 1 } } },
      birch: { name: "Birch", knownToPlayers: false, population: 1000, market: { bread: { make: 0, use: 10 }, salve: { make: 0, use: 1 } } },
      cedar: { name: "Cedar", knownToPlayers: true, population: 500, market: { bread: { make: 0, use: 5 }, salve: { make: 0, use: 0.5 } } },
      dell: { name: "Dell", knownToPlayers: false, population: null, market: {} }
    }
  };
}

/** A small world driven the way the service drives it: rows in, days forward. */
function makeWorld(options) {
  const world = {
    state: engine.createStartState({ day: START, worldSeed: "stage3-test" }),
    records: [engine.createEconomyConfigure({ id: "m-1", day: START, config: setup(options) })],
    report: [],
    suggestions: [],
    ids: 0
  };
  world.id = (prefix) => `${prefix}-${(world.ids += 1)}`;
  world.add = (row) => { world.records.push(row); return row; };
  world.now = () => engine.applyRecords(world.state, engine.recordsForDay(world.records, world.state.day));
  world.advance = (days = 1) => {
    const lines = [];
    for (let index = 0; index < days; index += 1) {
      const result = engine.advanceDay(world.state, world.records);
      world.state = result.state;
      world.records.push(...result.suggestions);
      world.suggestions.push(...result.suggestions);
      world.report.push(...result.report);
      lines.push(...result.report);
    }
    return lines;
  };
  world.write = (text, extra = {}) => world.add(engine.createWrittenEvent({ id: world.id("e"), day: world.state.day, text, ...extra }));
  world.decide = (eventId, decision) => world.add(engine.createDecision({ id: world.id("d"), eventId, decision, day: world.state.day }));
  world.startRumour = (input) => world.add(engine.createRumourStart({ id: world.id("r"), rumourId: world.id("rumour"), day: world.state.day, ...input }));
  return world;
}

const rumourOf = (world, row) => engine.describeRumours(world.now()).find((entry) => entry.id === row.rumourId);
const heardIn = (rumour, place) => rumour.heard.find((entry) => entry.place === place);

/* ---------------- roads ---------------- */

test("roads: state, travel time and the quickest way follow the pressures on them", () => {
  const world = makeWorld();
  let roads = engine.listRoads(world.now());
  assert.deepEqual(roads.map((road) => [road.id, road.status, road.travel]), [
    ["alder--birch", "open", 2], ["birch--cedar", "open", 1], ["cedar--dell", "open", 3]
  ]);
  assert.deepEqual(engine.quickestWay(roads, "alder", "cedar"), { places: ["alder", "birch", "cedar"], roads: ["alder--birch", "birch--cedar"], days: 3 });

  world.write("A bridge is out.", { effect: engine.normalizeWorldEffect({ type: "pressure", target: "route", route: "birch--cedar", multiplier: 0, days: 5 }) });
  world.advance(1);
  roads = engine.listRoads(world.now());
  assert.equal(engine.roadBetween(roads, "cedar", "birch").status, "closed");
  assert.deepEqual(engine.roadBetween(roads, "cedar", "birch").why, ["A bridge is out."]);
  assert.equal(engine.quickestWay(roads, "alder", "cedar"), null, "no way through a closed road");
});

/* ---------------- rumours ---------------- */

test("rumours: nothing exists until the DM starts one", () => {
  const world = makeWorld();
  world.advance(20);
  assert.deepEqual(engine.describeRumours(world.now()), []);
  assert.equal(world.report.filter((line) => line.system === "rumours").length, 0);
});

test("rumours: travel at travel speed, one town at a time, and report each arrival", () => {
  const world = makeWorld();
  const event = world.write("Strangers held the gate at Alder.", { place: "alder" });
  const row = world.startRumour({ eventId: event.id, truth: "written", origin: "alder", who: "a band of strangers", what: "held the gate", size: 3, flatters: true });
  assert.deepEqual(rumourOf(world, row).heard.map((entry) => entry.place), ["alder"]);
  assert.deepEqual(rumourOf(world, row).next.map((entry) => [entry.place, entry.day]), [["birch", START + 2]]);

  world.advance(1);
  assert.equal(heardIn(rumourOf(world, row), "birch"), undefined, "a two-day road takes two days");
  const lines = world.advance(1);
  assert.equal(heardIn(rumourOf(world, row), "birch").day, START + 2);
  assert.equal(heardIn(rumourOf(world, row), "cedar"), undefined, "it does not skip ahead in the same day");
  assert.ok(lines.some((line) => line.kind === "Rumour" && line.place === "birch" && /Word reaches Birch/.test(line.text)));

  world.advance(1);
  assert.equal(heardIn(rumourOf(world, row), "cedar").day, START + 3);
  world.advance(3);
  assert.equal(heardIn(rumourOf(world, row), "dell").day, START + 6, "sketched places hear it too");
});

test("rumours: a closed road carries no talk, and it passes once the road reopens", () => {
  const world = makeWorld();
  world.write("The ford is flooded.", { effect: engine.normalizeWorldEffect({ type: "pressure", target: "route", route: "alder--birch", multiplier: 0, days: 6 }) });
  const row = world.startRumour({ origin: "alder", who: "the miller", what: "found gold" });
  world.advance(6);
  assert.deepEqual(rumourOf(world, row).heard.map((entry) => entry.place), ["alder"], "held at the closed road");
  assert.equal(rumourOf(world, row).next[0].blocked, true);
  world.advance(1);
  assert.equal(heardIn(rumourOf(world, row), "birch").day, START + 7, "through as soon as it reopens");
});

test("rumours: each hop bends at most one attribute, the truth is kept, and the bend is recorded", () => {
  let bends = 0;
  for (let seed = 0; seed < 25; seed += 1) {
    const world = makeWorld();
    world.state.worldSeed = `bend-${seed}`;
    const truth = { who: "the baker", what: "poisoned the well", where: "alder", size: 2, flatters: false };
    const row = world.startRumour({ origin: "alder", ...truth });
    world.advance(7);
    const rumour = rumourOf(world, row);
    assert.deepEqual(rumour.version, truth, "the truth never changes");
    assert.equal(rumour.heard.length, 4);
    const state = world.now().systems.rumours.items[row.rumourId];
    for (const place of ["birch", "cedar", "dell"]) {
      const heard = state.heard[place];
      const told = state.heard[heard.from].version;
      const changed = engine.RUMOUR_ATTRIBUTES.filter((attribute) => heard.version[attribute] !== told[attribute]);
      assert.ok(changed.length <= 1, `at most one attribute bends per hop (seed ${seed}, ${place}: ${changed})`);
      if (changed.length) {
        bends += 1;
        assert.equal(heard.bent.attribute, changed[0]);
        assert.deepEqual(heard.bent.from, told[changed[0]]);
        assert.deepEqual(heard.bent.to, heard.version[changed[0]]);
      } else {
        assert.equal(heard.bent, null);
      }
    }
  }
  assert.ok(bends > 10 && bends < 65, `some hops bend and some do not (${bends} of 75)`);
});

test("rumours: the same seed gives the same telling; inputs are never changed", () => {
  const run = () => {
    const world = makeWorld();
    const row = world.startRumour({ origin: "alder", who: "the baker", what: "poisoned the well", flatters: false });
    world.advance(8);
    return JSON.stringify(rumourOf(world, row));
  };
  assert.equal(run(), run());

  const world = makeWorld();
  world.startRumour({ origin: "alder", who: "x", what: "y" });
  const frozenState = JSON.stringify(world.state);
  const frozenRecords = JSON.stringify(world.records);
  engine.advanceDay(world.state, world.records);
  assert.equal(JSON.stringify(world.state), frozenState);
  assert.equal(JSON.stringify(world.records), frozenRecords);
});

test("rumours: an unflattering tale reaching a neighbour only SUGGESTS wariness, with a road effect attached", () => {
  const world = makeWorld();
  const row = world.startRumour({ origin: "alder", who: "folk from Alder", what: "carry a fever", flatters: false });
  // Pin the telling so the test does not depend on a bend flipping the tone.
  world.advance(2);
  const state = world.now();
  const heard = state.systems.rumours.items[row.rumourId].heard.birch;
  const wary = world.suggestions.filter((event) => event.tags.includes("rumour:wary"));
  if (heard.version.flatters === false) {
    assert.equal(wary.length, 1);
    assert.equal(wary[0].status, "suggested");
    assert.equal(wary[0].place, "birch");
    assert.deepEqual(wary[0].effect, { type: "pressure", target: "route", route: "alder--birch", multiplier: 0.35, days: 8, label: "Birch wary of Alder" });
    assert.equal(engine.roadBetween(engine.listRoads(world.now()), "alder", "birch").status, "open", "nothing changes until the DM accepts");
    world.decide(wary[0].id, "accept");
    world.advance(1);
    assert.equal(engine.roadBetween(engine.listRoads(world.now()), "alder", "birch").status, "slowed");
  } else {
    assert.equal(wary.length, 0, "a tale bent into praise makes nobody wary");
  }
});

test("rumours: reveal and un-reveal per town; players hear only what was revealed where they are", () => {
  const world = makeWorld();
  const row = world.startRumour({ origin: "alder", who: "the baker", what: "poisoned the well", flatters: false });
  world.advance(4);
  const empty = { place: null, rumours: [] };
  assert.deepEqual(engine.publicRumours(world.now(), "alder"), { place: { name: "Alder" }, rumours: [] }, "known town, nothing revealed");
  assert.deepEqual(engine.publicRumours(world.now(), "birch"), empty, "a town the players do not know says nothing at all");
  assert.deepEqual(engine.publicRumours(world.now(), "nowhere"), empty);
  assert.deepEqual(engine.publicRumours(null, null), empty);

  world.add(engine.createRumourReveal({ id: world.id("r"), rumourId: row.rumourId, place: "cedar", playersVisible: true, day: world.state.day }));
  const inCedar = engine.publicRumours(world.now(), "cedar");
  assert.equal(inCedar.rumours.length, 1);
  assert.deepEqual(Object.keys(inCedar.rumours[0]), ["text"], "only the telling: no truth, no spread, no ids");
  assert.equal(inCedar.rumours[0].text, heardIn(rumourOf(world, row), "cedar").text.replace(/\bBirch\b/gu, "somewhere else"));
  assert.doesNotMatch(JSON.stringify(inCedar), /Birch|birch|truth|heard|origin/);
  assert.deepEqual(engine.publicRumours(world.now(), "alder").rumours, [], "revealed in Cedar is not revealed in Alder");

  world.add(engine.createRumourReveal({ id: world.id("r"), rumourId: row.rumourId, place: "cedar", playersVisible: false, day: world.state.day }));
  assert.deepEqual(engine.publicRumours(world.now(), "cedar").rumours, []);
  assert.throws(() => engine.createRumourStart({ id: "x", rumourId: "y", day: 1, origin: "alder", what: "z", truth: "written" }), /points at the written event/);
});

/* ---------------- people ---------------- */

test("people: head counts change only through a written move, nobody is lost, and use follows", () => {
  const world = makeWorld();
  world.advance(10);
  const before = engine.countPeople(world.now());
  assert.equal(before, 3500);
  assert.deepEqual(engine.describePeople(world.now()).population.map((entry) => entry.now), [2000, 1000, 500], "no migration is invented");

  world.write("Fire drives 600 people out of Alder toward Cedar.", {
    place: "alder", effect: engine.normalizeWorldEffect({ type: "people-move", from: "alder", to: "cedar", people: 600, days: 3 })
  });
  const breadUse = (state) => engine.createUseFactor(state)("cedar", { id: "bread", tags: [] });
  assert.equal(breadUse(world.now()), 1);
  for (let day = 0; day < 8; day += 1) {
    world.advance(1);
    assert.equal(engine.countPeople(world.now()), before, "people in towns plus people on the road never changes");
  }
  const people = engine.describePeople(world.now());
  assert.deepEqual(people.population.map((entry) => [entry.place, entry.now]), [["alder", 1400], ["birch", 1000], ["cedar", 1100]]);
  assert.deepEqual(people.moves, [], "the move is finished and dropped");
  assert.equal(breadUse(world.now()), 1100 / 500, "Cedar uses in proportion to its head count");
  assert.equal(engine.createUseFactor(world.now())("alder", { id: "bread", tags: [] }), 1400 / 2000);
  assert.ok(world.report.some((line) => line.kind === "People" && /reached Cedar/.test(line.text)));
});

test("people: the road takes its travel days, and a closed road holds people where they are", () => {
  const world = makeWorld();
  world.write("A hundred leave.", { effect: engine.normalizeWorldEffect({ type: "people-move", from: "alder", to: "cedar", people: 100, days: 1 }) });
  world.advance(1);
  let people = engine.describePeople(world.now());
  assert.equal(people.onTheRoad.length, 1);
  assert.equal(people.onTheRoad[0].arriveDay - people.onTheRoad[0].departDay, 3, "two days plus one day of road");
  world.advance(3);
  assert.equal(engine.describePeople(world.now()).population.find((entry) => entry.place === "cedar").now, 600);

  const blocked = makeWorld();
  blocked.write("The pass is shut.", { effect: engine.normalizeWorldEffect({ type: "pressure", target: "route", route: "birch--cedar", multiplier: 0, days: 4 }) });
  blocked.write("A hundred try to leave.", { effect: engine.normalizeWorldEffect({ type: "people-move", from: "alder", to: "cedar", people: 100, days: 1 }) });
  const lines = blocked.advance(3);
  assert.equal(engine.describePeople(blocked.now()).onTheRoad.length, 0);
  assert.ok(lines.some((line) => /cannot get through/.test(line.text)));
  blocked.advance(6);
  assert.equal(engine.describePeople(blocked.now()).population.find((entry) => entry.place === "cedar").now, 600, "they go once it opens");
});

test("people: a suggested move does nothing unless accepted; a corrected head count carries through", () => {
  const world = makeWorld();
  const suggested = world.add(engine.createSuggestedEvent({
    id: "s-test", day: world.state.day, text: "Families leave Birch.",
    effect: engine.normalizeWorldEffect({ type: "people-move", from: "birch", to: "alder", people: 50, days: 1 })
  }));
  world.advance(5);
  assert.equal(engine.countPeople(world.now()), 3500);
  assert.equal(engine.describePeople(world.now()).population.find((entry) => entry.place === "birch").now, 1000);
  world.decide(suggested.id, "reject");
  world.advance(5);
  assert.equal(engine.describePeople(world.now()).population.find((entry) => entry.place === "birch").now, 1000, "rejected: it never happened");

  const corrected = setup();
  corrected.places.alder.population = 2600;
  world.add(engine.createEconomyConfigure({ id: "m-2", day: world.state.day, config: corrected }));
  assert.equal(engine.headCountOf(world.now(), "alder"), 2600, "the setup's figure plus who has come and gone");
  assert.throws(() => engine.normalizeWorldEffect({ type: "people-move", from: "alder", to: "alder", people: 5 }), /two different places/);
  assert.match(engine.worldEffectProblem(world.now(), engine.normalizeWorldEffect({ type: "people-move", from: "dell", to: "alder", people: 5 })), /no head count/);
});

/* ---------------- travelling NPCs ---------------- */

test("travellers: an itinerary moves an NPC along the roads and says when they arrive", () => {
  const world = makeWorld();
  world.advance(5);
  assert.deepEqual(engine.describeTravellers(world.now()), [], "nobody travels until the DM says so");
  world.add(engine.createItinerary({
    id: "t-1", npcId: "npc-vintner", name: "Old Vintner", day: world.state.day,
    stops: [{ place: "alder", stay: 2 }, { place: "cedar", stay: 1 }], loop: true
  }));
  let [who] = engine.describeTravellers(world.now());
  assert.equal(who.at, "alder");
  assert.equal(who.leaveDay, START + 7);

  let lines = world.advance(2);
  [who] = engine.describeTravellers(world.now());
  assert.equal(who.at, null, "on the road");
  assert.deepEqual([who.from, who.to, who.arriveDay - who.departDay, who.roads], ["alder", "cedar", 3, ["alder--birch", "birch--cedar"]]);
  assert.equal(lines.filter((line) => line.kind === "Traveller").length, 0);

  lines = world.advance(3);
  [who] = engine.describeTravellers(world.now());
  assert.equal(who.at, "cedar");
  assert.deepEqual(lines.filter((line) => line.kind === "Traveller").map((line) => line.text), ["Old Vintner arrives in Cedar."]);

  world.advance(4); // one day's stay, then three days back
  assert.equal(engine.describeTravellers(world.now())[0].at, "alder", "a looping itinerary starts again");

  world.add(engine.createItineraryClear({ id: "t-2", npcId: "npc-vintner", day: world.state.day }));
  assert.deepEqual(engine.describeTravellers(world.now()), []);
  assert.throws(() => engine.createItinerary({ id: "t", npcId: "n", name: "N", day: 1, stops: [{ place: "alder" }] }), /at least two stops/);
});

test("travellers: a one-way itinerary ends at its last stop; a closed road holds them", () => {
  const world = makeWorld();
  world.write("The pass is shut.", { effect: engine.normalizeWorldEffect({ type: "pressure", target: "route", route: "alder--birch", multiplier: 0, days: 3 }) });
  world.add(engine.createItinerary({ id: "t-1", npcId: "npc-a", name: "Courier", day: world.state.day, stops: [{ place: "alder", stay: 0 }, { place: "birch", stay: 1 }] }));
  const lines = world.advance(3);
  assert.equal(engine.describeTravellers(world.now())[0].held, true);
  assert.equal(lines.filter((line) => /cannot leave Alder/.test(line.text)).length, 1, "said once, not every day");
  world.advance(3);
  const [who] = engine.describeTravellers(world.now());
  assert.equal(who.at, "birch");
  assert.equal(who.done, true);
  world.advance(10);
  assert.equal(engine.describeTravellers(world.now())[0].at, "birch", "they stay at the last stop");
});

/* ---------------- threats on roads ---------------- */

test("threats: a countdown can sit on a road, and when it fills it suggests a road pressure", () => {
  const world = makeWorld();
  const row = world.add(engine.createCountdown({
    id: "k-1", countdownId: "c-bandits", day: world.state.day, label: "Bandits on the Birch road", size: 4, fill: 3, chance: 1,
    route: "alder--birch", suggestionText: "Bandits rob a caravan on the Birch road.",
    effect: engine.normalizeWorldEffect({ type: "pressure", target: "route", route: "alder--birch", multiplier: 0.35, days: 6 })
  }));
  assert.equal(engine.listCountdowns(world.now())[0].route, "alder--birch");
  world.advance(1);
  const raised = world.suggestions.find((event) => event.tags.includes(`countdown:${row.countdownId}`));
  assert.ok(raised, "the full countdown raised its suggestion");
  assert.ok(raised.tags.includes("route:alder--birch"));
  assert.equal(raised.effect.route, "alder--birch");
  assert.equal(engine.roadBetween(engine.listRoads(world.now()), "alder", "birch").status, "open", "only suggested so far");
  world.decide(raised.id, "accept");
  world.advance(1);
  assert.equal(engine.roadBetween(engine.listRoads(world.now()), "alder", "birch").status, "slowed");
});

/* ---------------- sickness ---------------- */

test("sickness: never starts on its own, however long the world runs or whatever is rumoured", () => {
  const world = makeWorld();
  world.startRumour({ origin: "alder", who: "folk from Alder", what: "carry a plague", size: 4, flatters: false });
  world.advance(60);
  assert.deepEqual(engine.describeSickness(world.now()), []);
  assert.equal(world.report.filter((line) => line.system === "sickness").length, 0);
  assert.equal(world.suggestions.filter((event) => event.tags.includes("sickness:spread")).length, 0);
});

test("sickness: grows only after a written event, is capped, raises use of medicine-tagged goods, and burns out", () => {
  const world = makeWorld();
  world.advance(5);
  const salveUse = (state, place = "alder") => engine.createUseFactor(state)(place, { id: "salve", tags: ["medicine"] });
  assert.equal(salveUse(world.now()), 1);
  world.write("Marsh fever is confirmed in Alder.", { place: "alder", effect: engine.normalizeWorldEffect({ type: "sickness-start", place: "alder", name: "marsh fever" }) });
  let [ill] = engine.describeSickness(world.now());
  assert.equal(ill.sick, 5, "first cases: a fifth of a percent of the town, at least five");

  let peak = 0;
  let peakUse = 1;
  for (let day = 0; day < 400 && !engine.describeSickness(world.now())[0].ended; day += 1) {
    world.advance(1);
    [ill] = engine.describeSickness(world.now());
    peak = Math.max(peak, ill.sick);
    peakUse = Math.max(peakUse, salveUse(world.now()));
    assert.ok(ill.sick + ill.recovered <= 2000 * engine.SICKNESS_DEFAULTS.capShare + 1, "never more than the cap share of the town");
  }
  assert.ok(peak > 30, `it grew (peak ${peak})`);
  assert.ok(peakUse > 1.2, `salve use rose (x${peakUse.toFixed(2)})`);
  assert.equal(engine.createUseFactor(world.now())("alder", { id: "bread", tags: [] }), 1, "goods without the tag are untouched");
  assert.equal(engine.describeSickness(world.now())[0].ended, true, "it burnt out");
  assert.ok(world.report.some((line) => /burnt itself out/.test(line.text)));
  assert.equal(salveUse(world.now()), 1);
});

test("sickness: the tag decides which goods are used more, not the good's id", () => {
  const tagged = makeWorld({ medicine: true });
  const untagged = makeWorld({ medicine: false });
  for (const world of [tagged, untagged]) {
    world.write("Fever.", { effect: engine.normalizeWorldEffect({ type: "sickness-start", place: "alder", name: "fever" }) });
    world.advance(25);
  }
  const price = (world) => engine.describeEconomy(world.now()).places.find((place) => place.id === "alder").goods.find((entry) => entry.good === "salve").vsUsualPercent;
  assert.ok(price(tagged) > price(untagged), `salve is dearer only where it is tagged as medicine (${price(tagged)}% vs ${price(untagged)}%)`);
});

test("sickness: spreads to a neighbour only if the DM accepts the suggestion; ends when written", () => {
  const world = makeWorld();
  world.write("Fever in Alder.", { effect: engine.normalizeWorldEffect({ type: "sickness-start", place: "alder", name: "fever" }) });
  world.advance(30);
  const spread = world.suggestions.filter((event) => event.tags.includes("sickness:spread"));
  assert.equal(spread.length, 1, "suggested once for the one neighbour");
  assert.equal(spread[0].place, "birch");
  assert.deepEqual(spread[0].effect, { type: "sickness-start", place: "birch", name: "fever", label: null });
  assert.deepEqual(engine.describeSickness(world.now()).map((entry) => entry.place), ["alder"], "not there until accepted");

  world.decide(spread[0].id, "accept");
  world.advance(3);
  assert.deepEqual(engine.describeSickness(world.now()).map((entry) => entry.place), ["alder", "birch"]);
  assert.ok(engine.describeSickness(world.now())[1].sick > 0);

  assert.equal(engine.worldEffectProblem(world.now(), engine.normalizeWorldEffect({ type: "sickness-start", place: "alder" })), "A sickness is already being followed there.");
  world.write("The fever has passed in Alder.", { effect: engine.normalizeWorldEffect({ type: "sickness-end", place: "alder" }) });
  const alder = engine.describeSickness(world.now()).find((entry) => entry.place === "alder");
  assert.equal(alder.ended, true);
  assert.equal(alder.sick, 0);
  assert.match(engine.worldEffectProblem(world.now(), engine.normalizeWorldEffect({ type: "sickness-end", place: "cedar" })), /No sickness/);
});

test("sickness: a rejected spread never happens", () => {
  const world = makeWorld();
  world.write("Fever in Alder.", { effect: engine.normalizeWorldEffect({ type: "sickness-start", place: "alder", name: "fever" }) });
  world.advance(30);
  const [spread] = world.suggestions.filter((event) => event.tags.includes("sickness:spread"));
  world.decide(spread.id, "reject");
  world.advance(40);
  assert.deepEqual(engine.describeSickness(world.now()).map((entry) => entry.place), ["alder"]);
  assert.equal(world.suggestions.filter((event) => event.tags.includes("sickness:spread")).length, 1, "and it is not suggested again");
});

/* ---------------- the proposal's example, with made-up towns ---------------- */

test("scenario: one written event leads to a flattering rumour, an unwritten unflattering one and people moving, each on the right day", () => {
  const world = makeWorld();
  world.advance(3);
  const day0 = world.state.day;
  const event = world.write("Vermin overran part of Alder; a band of strangers drove them out.", { place: "alder" });
  const heroes = world.startRumour({ eventId: event.id, truth: "written", origin: "alder", who: "a band of strangers", what: "drove out the vermin", size: 3, flatters: true });
  const plague = world.startRumour({ eventId: event.id, truth: "unwritten", origin: "alder", who: "folk from Alder", what: "carry a sickness", size: 2, flatters: false });
  world.write("Three hundred people flee Alder for Birch.", {
    place: "alder", causedBy: event.id,
    effect: engine.normalizeWorldEffect({ type: "people-move", from: "alder", to: "birch", people: 300, days: 2 })
  });

  world.advance(1);
  assert.equal(heardIn(rumourOf(world, heroes), "birch"), undefined);
  assert.equal(engine.describePeople(world.now()).onTheRoad.length, 1, "the first families are on the road");
  world.advance(1);
  assert.equal(heardIn(rumourOf(world, heroes), "birch").day, day0 + 2, "both rumours reach Birch in two days");
  assert.equal(heardIn(rumourOf(world, plague), "birch").day, day0 + 2);
  world.advance(1);
  assert.equal(heardIn(rumourOf(world, heroes), "cedar").day, day0 + 3);
  assert.equal(engine.headCountOf(world.now(), "birch"), 1150, "the first day's families arrive after two days on the road");
  world.advance(1);
  assert.equal(engine.headCountOf(world.now(), "birch"), 1300);
  assert.equal(engine.headCountOf(world.now(), "alder"), 1700);

  // The truth is kept beside each town's telling.
  assert.equal(rumourOf(world, heroes).truth, "written");
  assert.equal(rumourOf(world, plague).truth, "unwritten");
  assert.equal(rumourOf(world, plague).trueText, "Folk from Alder carry a sickness in Alder. People blame them for it.");
  // No sickness exists: the plague is only talk.
  assert.deepEqual(engine.describeSickness(world.now()), []);
  // Every consequence is a suggestion, and nothing was written by the simulation.
  const canon = engine.writtenEvents(world.records);
  assert.equal(canon.length, 2);
  assert.ok(canon.every((entry) => entry.source === "dm"));
  for (const suggestion of world.suggestions) {
    assert.equal(suggestion.status, "suggested");
  }

  // If the DM later writes that the sickness is real, the rumour can be marked true.
  const real = world.write("The sickness is real.", { place: "alder", effect: engine.normalizeWorldEffect({ type: "sickness-start", place: "alder", name: "sickness" }) });
  world.add(engine.createRumourConfirm({ id: world.id("r"), rumourId: plague.rumourId, eventId: real.id, day: world.state.day }));
  assert.equal(rumourOf(world, plague).truth, "written");
  assert.equal(engine.describeSickness(world.now()).length, 1);
});

/* ---------------- fairness and rebuilding ---------------- */

test("fairness: no subject may add more than its share of lines to a day's report", () => {
  const world = makeWorld();
  for (let index = 0; index < 12; index += 1) {
    world.startRumour({ origin: "alder", who: `teller ${index}`, what: "saw a light" });
  }
  world.write("People leave.", { effect: engine.normalizeWorldEffect({ type: "people-move", from: "alder", to: "birch", people: 400, days: 2 }) });
  world.add(engine.createItinerary({ id: "t-1", npcId: "npc-a", name: "Courier", day: world.state.day, stops: [{ place: "alder", stay: 0 }, { place: "birch", stay: 1 }] }));
  const lines = world.advance(2);
  const lastDay = lines.filter((line) => line.day === world.state.day);
  const bySystem = {};
  for (const line of lastDay) bySystem[line.system] = (bySystem[line.system] || 0) + (line.kind === "More" ? 0 : 1);
  assert.equal(bySystem.rumours, engine.REPORT_LINES_PER_SUBJECT, "twelve arrivals, six lines");
  assert.ok(lastDay.some((line) => line.system === "rumours" && line.kind === "More" && line.heldBack === 6));
  for (const count of Object.values(bySystem)) {
    assert.ok(count <= engine.REPORT_LINES_PER_SUBJECT);
  }
  assert.ok(world.suggestions.filter((event) => event.day === world.state.day && event.tags.includes("system:rumours")).length <= engine.RUMOUR_DEFAULTS.maxSuggestionsPerDay);
  const nextDay = world.advance(1);
  assert.ok(nextDay.some((line) => line.system === "travellers" && /Courier arrives in Birch/.test(line.text)), "and so does the traveller, a day later");
  assert.ok(nextDay.some((line) => line.system === "people" && /arrive in Birch/.test(line.text)), "and the people on the road");
});

test("the whole state still rebuilds from the record and the seed", () => {
  const world = makeWorld();
  const event = world.write("Something happened.", { place: "alder" });
  const rumour = world.startRumour({ eventId: event.id, truth: "written", origin: "alder", who: "someone", what: "did a thing", flatters: false });
  world.write("People go.", { effect: engine.normalizeWorldEffect({ type: "people-move", from: "alder", to: "cedar", people: 120, days: 4 }) });
  world.write("Fever.", { effect: engine.normalizeWorldEffect({ type: "sickness-start", place: "birch", name: "fever" }) });
  world.add(engine.createItinerary({ id: "t-1", npcId: "npc-a", name: "Courier", day: world.state.day, stops: [{ place: "alder", stay: 1 }, { place: "cedar", stay: 2 }], loop: true }));
  world.advance(6);
  world.add(engine.createRumourReveal({ id: "r-x", rumourId: rumour.rumourId, place: "cedar", playersVisible: true, day: world.state.day }));
  for (const suggestion of world.suggestions.slice(0, 1)) world.decide(suggestion.id, "accept");
  world.advance(9);

  const start = engine.createStartState({ day: START, worldSeed: "stage3-test" });
  const rebuilt = engine.rebuildState(start, world.records, world.state.day);
  assert.deepEqual(rebuilt.state, world.now());
});

/* ---------------- cities ---------------- */

test("cities: an outline of districts, locations and NPCs, grown by appended rows", () => {
  const rows = [];
  let n = 0;
  const add = (entryId, entry) => rows.push(engine.createCityAdd({ id: `c-${(n += 1)}`, entryId, day: START, entry }));
  add("alder--old-quarter", { type: "district", town: "alder", name: "Old Quarter" });
  add("alder--the-anchor", { type: "location", town: "alder", name: "The Anchor", kind: "Inn", district: "alder--old-quarter", note: "Fish stew on Fridays", playersKnow: true });
  add("alder--smithy", { type: "location", town: "alder", name: "Smithy", kind: "Smith" });
  add("npc-mara", { type: "npc", town: "alder", name: "Mara", kind: "Innkeeper", location: "alder--the-anchor" });
  add("npc-tob", { type: "npc", town: "alder", name: "Tob", kind: "Carter" });
  add("npc-wen", { type: "npc", town: "alder", name: "Wen", kind: "Watchman", district: "alder--old-quarter" });
  add("birch--mill", { type: "location", town: "birch", name: "Mill" });

  let folded = engine.foldCity(rows);
  let outline = engine.cityOutline(folded, "alder");
  assert.deepEqual(outline.districts.map((district) => district.name), ["Old Quarter"]);
  assert.deepEqual(outline.districts[0].locations.map((location) => [location.name, location.npcs.map((npc) => npc.name)]), [["The Anchor", ["Mara"]]]);
  assert.deepEqual(outline.districts[0].npcs.map((npc) => npc.name), ["Wen"], "in the district, at no particular place");
  assert.deepEqual(outline.locations.map((location) => location.name), ["Smithy"], "in town, in no district");
  assert.deepEqual(outline.npcs.map((npc) => npc.name), ["Tob"], "somewhere in town");
  assert.equal(folded.byId.get("npc-mara").district, "alder--old-quarter", "an NPC at a location is in that location's district");
  assert.equal(folded.byId.get("npc-mara").playersKnow, false, "hidden from players unless the DM says so");
  assert.equal(folded.byId.get("alder--the-anchor").playersKnow, true);
  assert.deepEqual(engine.cityOutline(folded, "cedar"), { town: "cedar", districts: [], locations: [], npcs: [], retired: [] }, "a town may have nothing yet");

  // Rename, move, mark as known, retire and restore: all new rows.
  const before = JSON.stringify(rows);
  rows.push(engine.createCityChange({ id: "c-r1", entryId: "alder--smithy", day: START + 1, changes: { name: "Ironhand's Smithy", district: "alder--old-quarter" } }));
  rows.push(engine.createCityChange({ id: "c-r2", entryId: "npc-tob", day: START + 1, changes: { location: "alder--smithy", playersKnow: true } }));
  rows.push(engine.createCityRetire({ id: "c-r3", entryId: "npc-wen", day: START + 2 }));
  assert.ok(JSON.stringify(rows).startsWith(before.slice(0, -1)), "earlier rows are untouched");
  folded = engine.foldCity(rows);
  outline = engine.cityOutline(folded, "alder");
  assert.deepEqual(outline.districts[0].locations.map((location) => location.name), ["Ironhand's Smithy", "The Anchor"]);
  assert.deepEqual(outline.districts[0].locations[0].npcs.map((npc) => npc.name), ["Tob"]);
  assert.deepEqual(outline.districts[0].npcs, [], "a retired entry leaves the outline");
  assert.deepEqual(outline.retired.map((entry) => entry.name), ["Wen"], "but stays in the record");
  assert.equal(folded.entries.length, 7, "nothing is ever deleted");
  rows.push(engine.createCityRetire({ id: "c-r4", entryId: "npc-wen", day: START + 3, restore: true }));
  assert.deepEqual(engine.cityOutline(engine.foldCity(rows), "alder").districts[0].npcs.map((npc) => npc.name), ["Wen"]);

  // A pointer into another town is dropped, not followed.
  rows.push(engine.createCityChange({ id: "c-r5", entryId: "npc-tob", day: START + 3, changes: { location: "birch--mill" } }));
  assert.equal(engine.foldCity(rows).byId.get("npc-tob").location, null, "somewhere in town again");

  assert.throws(() => engine.createCityAdd({ id: "x", entryId: "y", day: 1, entry: { type: "map", town: "alder", name: "Map" } }), /district, a location or an NPC/);
  assert.throws(() => engine.createCityChange({ id: "x", entryId: "y", day: 1, changes: {} }), /Nothing to change/);
  assert.equal(engine.slugify("The Sturdy Mugg!"), "the-sturdy-mugg");
  // The event fold ignores city rows without complaint.
  assert.deepEqual(engine.foldRecord(rows).ignored, []);
});
