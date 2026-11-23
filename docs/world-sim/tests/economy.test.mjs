// The economy engine. Every town and good here is made up for the tests.
import test from "node:test";
import assert from "node:assert/strict";
import * as engine from "../engine/index.js";

const START = 1000;
const C = engine.ECONOMY_DEFAULTS;

function configureRow(config, day = START, id = "cfg-1") {
  return engine.createEconomyConfigure({ id, day, config });
}

function jot(id, day, effect, text = `Test event ${id}`) {
  return engine.createWrittenEvent({ id, day, text, effect: engine.normalizeEffect(effect) });
}

/** Steps a world forward, feeding it the record. Returns the state on `toDay` with that day's rows applied. */
function run(records, toDay, seed = "test") {
  const start = engine.createStartState({ day: START, worldSeed: seed });
  return engine.rebuildState(start, records, toDay);
}

function eco(state) {
  return state.systems.economy;
}

const oneTown = (make = 10, use = 10) => ({
  goods: [{ id: "bread", name: "Bread", unit: "loaf", basePrice: 100 }],
  places: { alpha: { name: "Alpha", market: { bread: { make, use } } } }
});

const twoTowns = (travelDays = 2) => ({
  goods: [{ id: "bread", name: "Bread", unit: "loaf", basePrice: 100 }],
  routes: [{ id: "alpha--beta", a: "alpha", b: "beta", travelDays }],
  places: {
    alpha: { name: "Alpha", market: { bread: { make: 20, use: 5 } } },
    beta: { name: "Beta", market: { bread: { make: 0, use: 15 } } }
  }
});

test("money reads as coins", () => {
  assert.equal(engine.formatMoney(5000), "50 gp");
  assert.equal(engine.formatMoney(20), "2 sp");
  assert.equal(engine.formatMoney(1), "1 cp");
  assert.equal(engine.formatMoney(155), "1.6 gp");
});

test("the target price follows the rule and its limits", () => {
  assert.equal(engine.targetPrice(100, 300, 300), 100);
  assert.ok(Math.abs(engine.targetPrice(100, 300, 150) - 100 * Math.pow(2, C.priceExponent)) < 1e-9);
  assert.equal(engine.targetPrice(100, 300, 1), 100 * C.maxPriceFactor, "capped at four times base");
  assert.equal(engine.targetPrice(100, 300, 1e9), 100 * C.minPriceFactor, "floored at a quarter of base");
});

test("a balanced town sits at its base price, and one bad day moves it by the hand-worked amount", () => {
  const config = oneTown();
  const calm = run([configureRow(config)], START + 5).state;
  const entry = eco(calm).markets.alpha.bread;
  assert.ok(Math.abs(entry.price - 100) < 1e-6);
  assert.ok(Math.abs(entry.stock - 300) < 1e-6, "target stock is 30 days of use");
  assert.ok(Math.abs(entry.usual - 100) < 1e-6);

  // Nothing is made for one day. Worked by hand:
  //   stock  = 300 + 0 - 10 = 290
  //   target = 100 x (300 / 290) ^ 0.9
  //   price  = 100 + 0.25 x (target - 100)
  const shocked = run([configureRow(config), jot("e1", START, { type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0, days: 1 })], START + 1).state;
  const after = eco(shocked).markets.alpha.bread;
  const target = 100 * Math.pow(300 / 290, C.priceExponent);
  assert.ok(Math.abs(after.stock - 290) < 1e-9);
  assert.ok(Math.abs(after.price - (100 + C.priceStep * (target - 100))) < 1e-9);
});

test("no good is special: the same setup under other names gives the same numbers", () => {
  const build = (first, second) => ({
    goods: [
      { id: first, name: first, unit: "u", basePrice: 500 },
      { id: second, name: second, unit: "u", basePrice: 5000, madeFrom: [{ good: first, perUnit: 2 }] }
    ],
    routes: [{ id: "alpha--beta", a: "alpha", b: "beta", travelDays: 1 }],
    places: {
      alpha: { name: "Alpha", market: { [first]: { make: 30, use: 4 }, [second]: { make: 6, use: 3 } } },
      beta: { name: "Beta", market: { [first]: { make: 0, use: 8 }, [second]: { make: 0, use: 4 } } }
    }
  });
  const shock = (good) => jot("e1", START + 3, { type: "pressure", target: "make", place: "alpha", good, multiplier: 0.2, days: 12 });
  const a = eco(run([configureRow(build("potion", "herbs")), shock("potion")], START + 40).state).markets;
  const b = eco(run([configureRow(build("zzz", "aaa")), shock("zzz")], START + 40).state).markets;
  for (const place of ["alpha", "beta"]) {
    for (const [left, right] of [["potion", "zzz"], ["herbs", "aaa"]]) {
      assert.ok(Math.abs(a[place][left].price - b[place][right].price) < 1e-9, `${place} ${left}/${right} price`);
      assert.ok(Math.abs(a[place][left].stock - b[place][right].stock) < 1e-9, `${place} ${left}/${right} stock`);
    }
  }
});

test("the engine source names no good, place or road", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../engine/economy.js", import.meta.url), "utf8");
  for (const word of ["potion", "herb", "grain", "wine", "fish", "timber", "ore", "cloth", "weapon", "luxur"]) {
    assert.doesNotMatch(source, new RegExp(`["'\`]${word}`, "iu"), `economy.js mentions "${word}" as data`);
  }
});

test("a shortage raises the price, and it comes back once the pressure ends", () => {
  const records = [configureRow(oneTown()), jot("e1", START + 2, { type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0.2, days: 10 })];
  const during = eco(run(records, START + 12).state).markets.alpha.bread;
  assert.ok(during.price > during.usual * 1.15, `price ${during.price} should be well above usual`);
  const pressures = Object.values(eco(run(records, START + 6).state).pressures);
  assert.equal(pressures.length, 1);
  assert.equal(pressures[0].cause, "e1", "the pressure names the written event that caused it");
  assert.equal(pressures[0].fromDay, START + 3);
  assert.equal(pressures[0].untilDay, START + 12);

  const later = run(records, START + 120).state;
  assert.equal(Object.keys(eco(later).pressures).length, 0, "the pressure is gone");
  const after = eco(later).markets.alpha.bread;
  assert.ok(Math.abs(after.price / after.usual - 1) < 0.05, `price ${after.price} should be back near ${after.usual}`);
});

test("ending a pressure early is a new row, and it stops after that day", () => {
  const open = jot("e1", START, { type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0.2, days: null });
  const end = engine.createPressureEnd({ id: "x1", pressureId: "p-e1", day: START + 5 });
  const stillOn = run([configureRow(oneTown()), open], START + 30).state;
  assert.equal(eco(stillOn).pressures["p-e1"].untilDay, null, "open-ended until ended");
  const ended = run([configureRow(oneTown()), open, end], START + 30).state;
  assert.equal(Object.keys(eco(ended).pressures).length, 0);
  assert.ok(eco(ended).markets.alpha.bread.stock > eco(stillOn).markets.alpha.bread.stock);
});

test("caravans carry goods toward the dearer town and arrive after the road's travel days", () => {
  const records = [configureRow(twoTowns(2))];
  // Cut what Alpha makes for a while so the gap opens and closes, then watch one caravan.
  records.push(jot("e1", START, { type: "pressure", target: "use", place: "beta", good: "bread", multiplier: 3, days: 6 }));
  let found = null;
  for (let day = START + 1; day <= START + 20 && !found; day += 1) {
    found = eco(run(records, day).state).shipments.find((shipment) => shipment.departDay === day) || null;
  }
  assert.ok(found, "a caravan should leave");
  assert.equal(found.from, "alpha");
  assert.equal(found.to, "beta");
  assert.equal(found.arriveDay, found.departDay + 2);

  const before = eco(run(records, found.arriveDay - 1).state);
  assert.ok(before.shipments.some((shipment) => shipment.id === found.id), "still on the road the day before");
  const onArrival = eco(run(records, found.arriveDay).state);
  assert.ok(!onArrival.shipments.some((shipment) => shipment.id === found.id), "no longer on the road on the day it arrives");
});

test("a closed road stops caravans; a slowed one makes them take longer", () => {
  const base = [configureRow(twoTowns(2)), jot("e1", START, { type: "pressure", target: "use", place: "beta", good: "bread", multiplier: 3, days: 30 })];
  const departures = (records, from, to) => {
    const seen = new Map();
    for (let day = from; day <= to; day += 1) {
      for (const shipment of eco(run(records, day).state).shipments) seen.set(shipment.id, shipment);
    }
    return [...seen.values()].filter((shipment) => shipment.departDay >= from && shipment.departDay <= to);
  };
  assert.ok(departures(base, START + 5, START + 12).length > 0, "caravans run while the road is open");

  const closed = [...base, jot("e2", START + 4, { type: "pressure", target: "route", route: "alpha--beta", multiplier: 0, days: 8 })];
  assert.equal(departures(closed, START + 5, START + 12).length, 0, "none leave while it is closed");
  assert.ok(departures(closed, START + 13, START + 20).length > 0, "they start again when it reopens");

  const slowed = [...base, jot("e3", START + 4, { type: "pressure", target: "route", route: "alpha--beta", multiplier: 0.5, days: 8 })];
  const slow = departures(slowed, START + 5, START + 12);
  assert.ok(slow.length > 0);
  for (const shipment of slow) {
    assert.equal(shipment.arriveDay - shipment.departDay, 4, "half the traffic, twice the time");
  }
});

test("a road to a place with no market carries no simulated trade", () => {
  const config = twoTowns(1);
  config.routes.push({ id: "beta--gamma", a: "beta", b: "gamma", travelDays: 1 });
  config.places.gamma = { name: "Gamma", market: {} };
  const state = run([configureRow(config)], START + 20).state;
  assert.equal(eco(state).markets.gamma, undefined);
  assert.ok(!eco(state).shipments.some((shipment) => shipment.to === "gamma" || shipment.from === "gamma"));
});

test("made from: cut an input and the good made from it gets dearer, then recovers", () => {
  const config = {
    goods: [
      { id: "leaf", name: "Leaf", unit: "bundle", basePrice: 500 },
      { id: "tonic", name: "Tonic", unit: "flask", basePrice: 5000, madeFrom: [{ good: "leaf", perUnit: 2 }] }
    ],
    places: { alpha: { name: "Alpha", market: { leaf: { make: 20, use: 0 }, tonic: { make: 10, use: 10 } } } }
  };
  const records = [configureRow(config), jot("e1", START, { type: "pressure", target: "make", place: "alpha", good: "leaf", multiplier: 0.1, days: 45 })];
  const during = eco(run(records, START + 45).state).markets.alpha;
  assert.ok(during.leaf.price > during.leaf.usual * 1.3, "the input is dearer");
  assert.ok(during.tonic.price > during.tonic.usual * 1.2, `the good made from it is dearer too (${during.tonic.price} vs ${during.tonic.usual})`);
  assert.ok(during.tonic.inputFactor < 1, "because less of it is being made");

  const after = eco(run(records, START + 245).state).markets.alpha;
  assert.ok(Math.abs(after.tonic.price / after.tonic.usual - 1) < 0.1, `tonic should recover (${after.tonic.price} vs ${after.tonic.usual})`);
  assert.ok(Math.abs(after.leaf.price / after.leaf.usual - 1) < 0.1);
});

test("the same inputs give the same day, and the inputs are not changed", () => {
  const records = [configureRow(twoTowns()), jot("e1", START + 1, { type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0.3, days: 5 })];
  const state = run(records, START + 8).state;
  const copy = structuredClone(state);
  const first = engine.advanceDay(state, records);
  const second = engine.advanceDay(state, records);
  assert.deepEqual(first, second);
  assert.deepEqual(state, copy, "the input state is untouched");
  assert.deepEqual(engine.advanceDay(state, records, { seed: "another-seed" }).state.systems.economy, first.state.systems.economy, "the economy does not roll dice");
});

test("the state can be rebuilt from the record alone", () => {
  const records = [
    configureRow(twoTowns()),
    jot("e1", START + 2, { type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0.3, days: 5 }),
    engine.createPartyMove({ id: "m1", day: START + 3, place: "beta" }),
    jot("e2", START + 6, { type: "pressure", target: "route", route: "alpha--beta", multiplier: 0, days: 3 })
  ];
  let state = engine.createStartState({ day: START, worldSeed: "test" });
  for (let day = START; day < START + 15; day += 1) {
    state = engine.advanceDay(state, records).state;
  }
  const stepped = engine.applyRecords(state, engine.recordsForDay(records, state.day));
  assert.deepEqual(run(records, START + 15).state, stepped);
});

test("loading a changed setup keeps stock and prices and only re-works what is usual", () => {
  const first = configureRow(twoTowns(), START, "cfg-1");
  const changed = twoTowns();
  changed.places.beta.market.bread.use = 18;
  const second = configureRow(changed, START + 10, "cfg-2");
  const before = eco(run([first], START + 10).state).markets.beta.bread;
  const after = eco(run([first, second], START + 10).state).markets.beta.bread;
  assert.equal(after.stock, before.stock);
  assert.equal(after.price, before.price);
  assert.notEqual(after.usual, before.usual);
});

test("only the DM's row moves the party; days going by never do", () => {
  const records = [configureRow(twoTowns())];
  assert.equal(run(records, START + 30).state.party, undefined);
  records.push(engine.createPartyMove({ id: "m1", day: START + 2, place: "alpha" }));
  const later = run(records, START + 60).state;
  assert.deepEqual(later.party, { place: "alpha", sinceDay: START + 2 });
});

test("an effect that cannot apply is refused with a reason", () => {
  assert.throws(() => engine.normalizeEffect({ type: "other" }), /pressure/);
  assert.throws(() => engine.normalizeEffect({ type: "pressure", target: "route", route: "a--b", multiplier: 2 }), /slowed/);
  assert.throws(() => engine.normalizeEffect({ type: "pressure", target: "make", place: "alpha", multiplier: 0.5 }), /which place and which good/);
  assert.equal(engine.normalizeEffect(null), null);
  const empty = engine.createStartState({ day: START, worldSeed: "t" });
  const effect = engine.normalizeEffect({ type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0.5, days: 3 });
  assert.match(engine.effectProblem(empty, effect), /No markets are set up/);
  const state = run([configureRow(twoTowns())], START).state;
  assert.equal(engine.effectProblem(state, effect), "");
  assert.match(engine.effectProblem(state, { ...effect, place: "nowhere" }), /no market/);
  assert.match(engine.effectProblem(state, { ...effect, good: "cheese" }), /neither makes nor uses/);
  assert.match(engine.effectProblem(state, { type: "pressure", target: "route", route: "x--y", multiplier: 0 }), /road is not in the setup/);
});

function manyGoods(count = 8) {
  const goods = [];
  const market = {};
  for (let index = 1; index <= count; index += 1) {
    goods.push({ id: `g${index}`, name: `Good ${index}`, unit: "unit", basePrice: 100 * index });
    market[`g${index}`] = { make: 10, use: 10 };
  }
  return { goods, places: { alpha: { name: "Alpha", market }, beta: { name: "Beta", market: structuredClone(market) } } };
}

test("fairness: one good never fills the report, and one day never raises a pile of suggestions", () => {
  const config = manyGoods(8);
  const records = [configureRow(config)];
  for (let index = 1; index <= 8; index += 1) {
    for (const place of ["alpha", "beta"]) {
      records.push(jot(`e-${place}-${index}`, START, { type: "pressure", target: "make", place, good: `g${index}`, multiplier: 0, days: 40 }));
    }
  }
  let state = engine.createStartState({ day: START, worldSeed: "test" });
  const suggestedGoods = new Set();
  for (let day = START; day < START + 30; day += 1) {
    const result = engine.advanceDay(state, records);
    state = result.state;
    const prices = result.report.filter((line) => line.kind === "Price");
    assert.ok(prices.length <= C.maxPriceLines, `day ${day}: ${prices.length} price lines`);
    assert.equal(new Set(prices.map((line) => line.good)).size, prices.length, "at most one price line per good");
    assert.ok(result.report.filter((line) => line.system === "economy").length <= engine.REPORT_LINES_PER_SUBJECT + 1);
    const fromEconomy = result.suggestions.filter((event) => event.tags.includes("system:economy"));
    assert.ok(fromEconomy.length <= C.maxSuggestionsPerDay, `day ${day}: ${fromEconomy.length} suggestions`);
    const goods = fromEconomy.map((event) => event.tags.find((tag) => tag.startsWith("good:")));
    assert.equal(new Set(goods).size, goods.length, "at most one suggestion per good per day");
    goods.forEach((good) => suggestedGoods.add(good));
  }
  assert.equal(suggestedGoods.size, 8, "every good gets its turn over the following days");
});

test("a shortage is suggested once, in plain words, and again only after prices have recovered", () => {
  const records = [configureRow(oneTown()), jot("e1", START, { type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0, days: 25 })];
  let state = engine.createStartState({ day: START, worldSeed: "test" });
  const raised = [];
  for (let day = START; day < START + 25; day += 1) {
    const result = engine.advanceDay(state, records);
    state = result.state;
    raised.push(...result.suggestions);
  }
  assert.equal(raised.length, 1);
  assert.equal(raised[0].text, "Bread is running short in Alpha.");
  assert.match(raised[0].why, /Bread there has cost about \d+% more than usual for 3 days\./);
  assert.equal(raised[0].status, "suggested", "a story consequence waits for the DM");
  assert.equal(raised[0].effect, null, "and changes no numbers by itself");
});

test("the day report cap applies to every subject alike and says what was left out", () => {
  const chatty = { id: "chatty", tick(ctx) { for (let index = 0; index < 10; index += 1) ctx.report({ kind: "Note", text: `line ${index}` }); } };
  const quiet = { id: "quiet", tick(ctx) { ctx.report({ kind: "Note", text: "one line" }); } };
  const registry = engine.createRegistry([chatty, quiet]);
  const state = engine.createInitialState({ day: 1, worldSeed: "t", registry });
  const { report } = engine.tick(state, [], { registry, reportLinesPerSystem: 3 });
  assert.equal(report.filter((line) => line.system === "chatty" && line.kind === "Note").length, 3);
  assert.deepEqual(report.filter((line) => line.kind === "More").map((line) => [line.system, line.heldBack]), [["chatty", 7]]);
  assert.equal(report.filter((line) => line.system === "quiet").length, 1);
});

test("a suggestion that carries an effect changes the numbers only if the DM accepts it", () => {
  const effect = engine.normalizeEffect({ type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0.2, days: 10 });
  const countdown = engine.createCountdown({
    id: "k1", countdownId: "c1", day: START, label: "Mill trouble", size: 4, mode: "chance", chance: 1, fill: 3,
    suggestionText: "The mill breaks down.", effect
  });
  const records = [configureRow(oneTown()), countdown];
  const first = engine.advanceDay(engine.createStartState({ day: START, worldSeed: "t" }), records);
  const suggestion = first.suggestions.find((event) => event.tags.includes("countdown:c1"));
  assert.ok(suggestion, "the countdown raises its suggestion");
  assert.deepEqual(suggestion.effect, effect);
  records.push(suggestion);

  const waiting = run(records, START + 6).state;
  assert.equal(Object.keys(eco(waiting).pressures).length, 0, "nothing changes while it waits");

  const accepted = [...records, engine.createDecision({ id: "d1", eventId: suggestion.id, decision: "accept", day: START + 6 })];
  const pressure = Object.values(eco(run(accepted, START + 7).state).pressures)[0];
  assert.equal(pressure.cause, suggestion.id);
  assert.equal(pressure.fromDay, START + 7);

  const rejected = [...records, engine.createDecision({ id: "d2", eventId: suggestion.id, decision: "reject", day: START + 6 })];
  assert.equal(Object.keys(eco(run(rejected, START + 20).state).pressures).length, 0, "rejected: it never happened");
});

test("players' prices: one known town, prices and percent only", () => {
  const config = twoTowns();
  config.places.alpha.knownToPlayers = true;
  const state = run([configureRow(config)], START + 5).state;
  const shown = engine.publicPrices(state, "alpha");
  assert.deepEqual(Object.keys(shown), ["place", "prices"]);
  assert.deepEqual(shown.place, { name: "Alpha" });
  assert.deepEqual(Object.keys(shown.prices[0]).sort(), ["good", "price", "priceText", "unit", "vsUsualPercent"]);
  const empty = { place: null, prices: [] };
  assert.deepEqual(engine.publicPrices(state, "beta"), empty, "a town the players do not know");
  assert.deepEqual(engine.publicPrices(state, "nowhere"), empty);
  assert.deepEqual(engine.publicPrices(state, null), empty);
  assert.deepEqual(engine.publicPrices(engine.createStartState({ day: START, worldSeed: "t" }), "alpha"), empty, "no markets set up");
});

test("a first guess at a new market scales what is used by population and marks every figure as an estimate", () => {
  const config = engine.normalizeEconomyConfig({
    goods: [{ id: "bread", name: "Bread", unit: "loaf", basePrice: 100 }],
    places: {
      alpha: { name: "Alpha", population: 1000, market: { bread: { make: 30, use: 20 } } },
      beta: { name: "Beta", population: 3000, market: { bread: { make: 0, use: 60 } } }
    }
  });
  const guess = engine.estimateMarket(config, 500);
  assert.equal(guess.bread.use.value, 10, "80 a day for 4000 people is 0.02 a head");
  assert.equal(guess.bread.use.estimate, true);
  assert.equal(guess.bread.make.value, 0);
  assert.equal(guess.bread.make.estimate, true);
});

test("the DM's view labels estimates and says why prices are moving", () => {
  const config = oneTown();
  config.goods[0].basePrice = { value: 100, estimate: true, basis: "a guess" };
  config.places.alpha.market.bread.make = { value: 10, estimate: true, basis: "a guess" };
  const records = [configureRow(config), jot("e1", START, { type: "pressure", target: "make", place: "alpha", good: "bread", multiplier: 0.2, days: 10 }, "The ovens are cold.")];
  const view = engine.describeEconomy(run(records, START + 4).state);
  assert.equal(view.configured, true);
  assert.equal(view.goods[0].basePriceEstimate, true);
  const bread = view.places[0].goods[0];
  assert.equal(bread.makeEstimate, true);
  assert.equal(bread.useEstimate, false);
  assert.ok(bread.vsUsualPercent > 0);
  assert.equal(bread.why[0].text, "The ovens are cold.");
  assert.equal(bread.why[0].untilDay, START + 10);
  assert.equal(engine.describeEconomy(engine.createStartState({ day: START, worldSeed: "t" })).configured, false);
});
