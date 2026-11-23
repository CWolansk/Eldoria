// Stage 2 routes: market setup, markets, party, pressures, and the one public route.
// Towns and goods here are made up for the tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
  DM_KEY, WORLD_PUBLIC_ROUTES, engine, makeRequest, makeWorld, quietContext, testSetup, withDmKey
} from "./helpers.mjs";

const body = (response) => JSON.parse(response.body || "{}");

function call(world, handler, method, path, options = {}) {
  return world.handlers[handler](makeRequest(method, path, { key: DM_KEY, ...options }), quietContext);
}


async function startedWithMarkets() {
  const world = makeWorld();
  assert.equal((await call(world, "worldStart", "POST", "world/start", { body: {} })).status, 200);
  const saved = await call(world, "worldPlaces", "PUT", "world/places", { body: testSetup() });
  assert.equal(saved.status, 200, saved.body);
  return world;
}

async function advance(world, days = 1) {
  const current = body(await call(world, "world", "GET", "world"));
  const response = await call(world, "worldAdvance", "POST", "world/advance", { body: { days, expectedEtag: current.etag } });
  assert.equal(response.status, 200, response.body);
  return body(response);
}

const markets = async (world) => body(await call(world, "worldMarkets", "GET", "world/markets"));

test("loading the setup records it as one new row and gives every full-detail town a market", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  const rows = (await world.store.listRecords()).filter((row) => row.recordType === "economy");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, "configure");
  assert.ok(JSON.stringify(rows[0]).length < 30000);
  assert.doesNotMatch(JSON.stringify(rows[0]), /a guess|farmland/, "the row keeps numbers and estimate flags, not the notes on them");

  const view = await markets(world);
  assert.equal(view.configured, true);
  const byId = Object.fromEntries(view.places.map((place) => [place.id, place]));
  assert.equal(byId.openton.hasMarket, true);
  assert.equal(byId.secretville.hasMarket, true);
  assert.equal(byId.farplace.hasMarket, false, "a sketched place has no market, even if numbers were sent for it");
  assert.equal(byId["openton--inn"], undefined, "shops are not markets of their own");
  assert.equal(byId.openton.goods.find((entry) => entry.good === "bread").makeEstimate, true);
  assert.equal(byId.openton.goods.find((entry) => entry.good === "bread").useEstimate, false);
  assert.equal(view.goods.find((good) => good.id === "rope").basePriceEstimate, true);
  assert.deepEqual(view.routes.map((route) => [route.id, route.simulated, route.travelDaysEstimate]), [
    ["openton--secretville", true, true], ["secretville--farplace", false, false]
  ]);

  const stored = body(await call(world, "worldPlaces", "GET", "world/places"));
  assert.equal(stored.economy.markets.openton.bread.make.basis, "farmland", "the DM's document keeps where each guess came from");
}));

test("saving the same setup again adds no row; a changed one adds one", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  await call(world, "worldPlaces", "PUT", "world/places", { body: testSetup() });
  const count = async () => (await world.store.listRecords()).filter((row) => row.recordType === "economy").length;
  assert.equal(await count(), 1);
  const changed = testSetup();
  changed.economy.markets.openton.bread.make = { value: 35 };
  await call(world, "worldPlaces", "PUT", "world/places", { body: changed });
  assert.equal(await count(), 2);
}));

test("a setup loaded before the first day takes effect when the world starts", withDmKey(DM_KEY, async () => {
  const world = makeWorld();
  assert.equal((await call(world, "worldPlaces", "PUT", "world/places", { body: testSetup() })).status, 200);
  assert.equal(world.table.rows.size, 0, "nothing is recorded before the world starts");
  await call(world, "worldStart", "POST", "world/start", { body: {} });
  assert.equal((await markets(world)).configured, true);
}));

test("a broken setup is refused whole, with the reason", withDmKey(DM_KEY, async () => {
  const world = makeWorld();
  await call(world, "worldStart", "POST", "world/start", { body: {} });
  const cases = [
    [(setup) => { setup.economy.markets.nowhere = { bread: { make: 1, use: 1 } }; }, /not in the places/],
    [(setup) => { setup.economy.routes.push({ id: "x", a: "openton", b: "nowhere", travelDays: 1 }); }, /joins a place that is not in the places/],
    [(setup) => { setup.economy.goods[0].basePrice = 0; }, /Base price/],
    [(setup) => { setup.economy.markets.openton.cheese = { make: 1, use: 1 }; }, /not in the goods list/],
    [(setup) => { setup.economy.goods[1].madeFrom = [{ good: "cheese", perUnit: 1 }]; }, /not another good/]
  ];
  for (const [breakIt, reason] of cases) {
    const setup = testSetup();
    breakIt(setup);
    const response = await call(world, "worldPlaces", "PUT", "world/places", { body: setup });
    assert.equal(response.status, 400, response.body);
    assert.match(body(response).error, reason);
  }
  assert.equal(world.blobs.blobs.has("world/eldoria/places.json"), false, "nothing was saved");
}));

test("advancing a day commits the numbers; they are not suggestions", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  const before = await markets(world);
  const jotted = await call(world, "worldEvents", "POST", "world/events", {
    body: { text: "The ovens are cold.", place: "openton", effect: { type: "pressure", target: "make", place: "openton", good: "bread", multiplier: 0, days: 5 } }
  });
  assert.equal(jotted.status, 200, jotted.body);
  const result = await advance(world, 3);
  assert.equal(result.pending.length, 0, "price changes do not wait for approval");
  const after = await markets(world);
  const price = (view) => view.places.find((place) => place.id === "openton").goods.find((entry) => entry.good === "bread");
  assert.ok(price(after).price > price(before).price);
  assert.equal(price(after).why[0].text, "The ovens are cold.");
  assert.ok(result.advanced.report.some((line) => line.kind === "Price"), "the day report says what moved");
  assert.equal(after.pressures[0].cause, body(jotted).event.id);
}));

test("an effect must make sense: a real market, a real road, and dated today", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  const jot = (extra) => call(world, "worldEvents", "POST", "world/events", { body: { text: "Something happens.", ...extra } });
  const effect = { type: "pressure", target: "make", place: "openton", good: "bread", multiplier: 0.3, days: 4 };
  assert.match(body(await jot({ effect: { ...effect, place: "farplace" } })).error, /no market yet/);
  assert.match(body(await jot({ effect: { type: "pressure", target: "route", route: "nope", multiplier: 0 } })).error, /road is not in the setup/);
  assert.match(body(await jot({ effect, day: engine.WORLD_START_DAY - 1 })).error, /starts today/);
  assert.equal((await jot({ effect: { type: "something-else" } })).status, 400);
  assert.equal((await jot({ day: engine.WORLD_START_DAY - 1 })).status, 200, "a plain fact may still be dated in the past");
  assert.equal((await markets(world)).pressures.length, 0);

  const unconfigured = makeWorld();
  await call(unconfigured, "worldStart", "POST", "world/start", { body: {} });
  const refused = await call(unconfigured, "worldEvents", "POST", "world/events", { body: { text: "x", effect } });
  assert.match(body(refused).error, /No markets are set up/);
}));

test("a pressure can be ended early; that is a new row, and the old rows stay", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  await call(world, "worldEvents", "POST", "world/events", {
    body: { text: "Road washed out.", effect: { type: "pressure", target: "route", route: "openton--secretville", multiplier: 0, days: null } }
  });
  await advance(world, 2);
  let view = await markets(world);
  assert.equal(view.routes.find((route) => route.id === "openton--secretville").status, "closed");
  const pressureId = view.pressures[0].id;
  const rowsBefore = (await world.store.listRecords()).length;
  const ended = await call(world, "worldPressureEnd", "POST", `world/pressures/${pressureId}/end`, { params: { id: pressureId } });
  assert.equal(ended.status, 200, ended.body);
  assert.equal((await world.store.listRecords()).length, rowsBefore + 1);
  await advance(world, 1);
  view = await markets(world);
  assert.equal(view.routes.find((route) => route.id === "openton--secretville").status, "open");
  assert.equal((await call(world, "worldPressureEnd", "POST", "world/pressures/nope/end", { params: { id: "nope" } })).status, 404);
}));

test("only the DM moves the party, and only to a place on the list", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  assert.equal(body(await call(world, "world", "GET", "world")).party, null);
  await advance(world, 3);
  assert.equal(body(await call(world, "world", "GET", "world")).party, null, "days going by do not move the party");
  const moved = await call(world, "worldParty", "POST", "world/party", { body: { place: "openton" } });
  assert.equal(moved.status, 200, moved.body);
  assert.equal(body(moved).world.party.place, "openton");
  await advance(world, 5);
  assert.equal(body(await call(world, "world", "GET", "world")).party.place, "openton");
  assert.equal((await call(world, "worldParty", "POST", "world/party", { body: { place: "atlantis" } })).status, 400);
  const cleared = await call(world, "worldParty", "POST", "world/party", { body: { place: null } });
  assert.equal(body(cleared).world.party.place, null);
}));

test("the state route gives the browser what a what-if run needs, and reading it saves nothing", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  const rows = (await world.store.listRecords()).length;
  const blobs = world.blobs.blobs.size;
  const { day, state } = body(await call(world, "worldState", "GET", "world/state"));
  assert.equal(day, engine.WORLD_START_DAY);
  const ahead = engine.tickMany(state, [], 20, { registry: engine.createLedgerRegistry() });
  assert.equal(ahead.state.day, day + 20);
  assert.equal((await world.store.listRecords()).length, rows);
  assert.equal(world.blobs.blobs.size, blobs);
  assert.equal(body(await call(world, "world", "GET", "world")).day, day, "the real world did not move");
}));

test("two devices: the second to advance is told to reload, and the numbers are not run twice", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  const seen = body(await call(world, "world", "GET", "world"));
  const first = await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 1, expectedEtag: seen.etag } });
  assert.equal(first.status, 200);
  const second = await call(world, "worldAdvance", "POST", "world/advance", { body: { days: 1, expectedEtag: seen.etag } });
  assert.equal(second.status, 409);
  assert.match(body(second).error, /Reload and try again/);
  assert.equal(body(await call(world, "world", "GET", "world")).day, seen.day + 1);
}));

/* ---------------- the public route ---------------- */

const publicCall = (world, key) => world.handlers.worldPublicPrices(makeRequest("GET", "world/public/prices", key === undefined ? {} : { key }), quietContext);
const EMPTY = { place: null, prices: [] };

test("public prices need no key, and give the same empty answer whenever there is nothing players may see", withDmKey(DM_KEY, async () => {
  const notStarted = makeWorld();
  assert.deepEqual(body(await publicCall(notStarted)), EMPTY);
  assert.equal(notStarted.blobs.blobs.size, 0, "reading writes nothing");

  const world = await startedWithMarkets();
  assert.deepEqual(body(await publicCall(world)), EMPTY, "party not placed");
  await call(world, "worldParty", "POST", "world/party", { body: { place: "secretville" } });
  assert.deepEqual(body(await publicCall(world)), EMPTY, "party in a town the players do not know");
  await call(world, "worldParty", "POST", "world/party", { body: { place: "farplace" } });
  assert.deepEqual(body(await publicCall(world)), EMPTY, "party in a place with no market");
  await call(world, "worldParty", "POST", "world/party", { body: { place: "openton--inn" } });
  assert.deepEqual(body(await publicCall(world)), EMPTY, "party in a shop, not a market town");
}));

test("public prices: the party's own known town, prices and percent only, and nothing that leaks", withDmKey(DM_KEY, async () => {
  const world = await startedWithMarkets();
  await call(world, "worldParty", "POST", "world/party", { body: { place: "openton" } });
  await call(world, "worldEvents", "POST", "world/events", {
    body: { text: "Secret sabotage at the Secretville ropewalk.", place: "secretville", effect: { type: "pressure", target: "make", place: "secretville", good: "rope", multiplier: 0, days: 20 } }
  });
  await call(world, "worldEvents", "POST", "world/events", {
    body: { text: "Hidden trouble at the mill.", place: "openton", effect: { type: "pressure", target: "make", place: "openton", good: "bread", multiplier: 0.2, days: 20 } }
  });
  await advance(world, 6);
  const rowsBefore = (await world.store.listRecords()).length;

  const response = await publicCall(world);
  assert.equal(response.status, 200);
  const shown = body(response);
  assert.deepEqual(Object.keys(shown).sort(), ["place", "prices"]);
  assert.deepEqual(shown.place, { name: "Openton" });
  assert.deepEqual(shown.prices.map((entry) => entry.good), ["Bread", "Rope"]);
  for (const entry of shown.prices) {
    assert.deepEqual(Object.keys(entry).sort(), ["good", "price", "priceText", "unit", "vsUsualPercent"]);
  }
  assert.ok(shown.prices[0].vsUsualPercent > 0, "players see that bread is dearer");

  const text = response.body;
  for (const forbidden of ["Secretville", "secretville", "Farplace", "sabotage", "trouble", "mill", "why", "stock", "pressure", "cause", "history", "make", "usual\"", "route", "seed", "etag"]) {
    assert.ok(!text.includes(forbidden), `the public answer contains "${forbidden}"`);
  }
  assert.equal((await world.store.listRecords()).length, rowsBefore, "a public read never writes");

  // The same answer with a wrong key, a right key, or none: the key is not consulted.
  assert.equal((await publicCall(world, "wrong")).body, text);
  assert.equal((await publicCall(world, DM_KEY)).body, text);
}));

test("public prices work even when the server has no DM key set, and refuse anything but GET", withDmKey(undefined, async () => {
  const world = makeWorld();
  assert.equal((await publicCall(world)).status, 200);
  const post = await world.handlers.worldPublicPrices(makeRequest("POST", "world/public/prices", { body: {} }), quietContext);
  assert.equal(post.status, 405);
  assert.deepEqual(WORLD_PUBLIC_ROUTES.map((entry) => entry.handler), ["worldPublicPrices"]);
}));
