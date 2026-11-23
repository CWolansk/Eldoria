// Stage 4, players. The shared price maths and "which items follow which good" rule,
// the additions to the open prices route, and the pages that use them:
// the players' town page, item search, and the DM's "What players see".
// Everything named is made up.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import {
  DM_KEY, createApiFetch, engine, makeRequest, makeWorld, quietContext, testSetup, withDmKey
} from "./helpers.mjs";
import {
  commodityRows, describeItemPrice, findCoveringGood, formatMoney, isEmptyAnswer, listPercentText, localPriceFor,
  parseCopper, percentDirection, percentText
} from "../../tools/town/local-prices.js";

// Read before the first test is declared: tests declared after a top-level await can be missed.
const townHtml = await readFile(new URL("../../tools/town/index.html", import.meta.url), "utf8");
const dmHtml = await readFile(new URL("../../tools/world-sim/index.html", import.meta.url), "utf8");

const EMPTY = { place: null, prices: [] };
const ANSWER = {
  place: { name: "Openton" },
  prices: [
    // A modifier: a class of items, with no unit and no price of its own.
    { good: "Ordinary blades", kind: "modifier", ratio: 1.12, covers: { itemIds: [], types: ["simple weapon", "martial weapon"] } },
    { good: "Tonic", kind: "commodity", unit: "flask", price: 4600, priceText: "46 gp", vsUsualPercent: -8, ratio: 0.92, covers: { itemIds: ["item:tonic:test", "item:greater-tonic:test"], types: [] } },
    { good: "Bread", kind: "commodity", unit: "loaf", price: 100, priceText: "1 gp", vsUsualPercent: 0, ratio: 1, covers: { itemIds: [], types: [] } }
  ]
};

async function waitFor(predicate, message, attempts = 400) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(typeof message === "function" ? message() : message);
}

function setupWithCovers() {
  const setup = testSetup();
  setup.economy.goods[0].covers = { itemIds: ["item:loaf:test"], types: [], reference: "item:loaf:test", estimate: true, basis: "DM NOTE: the mill is the weak point" };
  setup.economy.goods[1].covers = { types: ["Adventuring Gear"], itemIds: [] };
  return setup;
}

/* ---------- the shared module ---------- */

test("money: labels and copper numbers are read; odd text is not guessed at", () => {
  assert.equal(parseCopper("15 gp"), 1500);
  assert.equal(parseCopper("2 sp"), 20);
  assert.equal(parseCopper("11,015 gp"), 1101500);
  assert.equal(parseCopper("4 cp"), 4);
  assert.equal(parseCopper("1 pp"), 1000);
  assert.equal(parseCopper(1500), 1500);
  for (const odd of ["", "varies", "15", "gp", null, undefined, -5, Number.NaN]) {
    assert.equal(parseCopper(odd), null, `"${odd}" has no price`);
  }
  assert.equal(formatMoney(1680), "16.8 gp");
  assert.equal(formatMoney(1101500), "11,015 gp");
  assert.equal(formatMoney(23), "2.3 sp");
  assert.equal(formatMoney(4), "4 cp");
});

test("percent wording matches the DM's Markets view: usual, +12%, -8%", () => {
  assert.equal(percentText(0), "usual");
  assert.equal(percentText(12), "+12%");
  assert.equal(percentText(-8), "-8%");
  assert.equal(percentText(0.4), "usual");
  assert.deepEqual([percentDirection(12), percentDirection(-8), percentDirection(0)], ["up", "down", ""]);
});

test("an item's local price is its catalog price moved by the good's share, by hand", () => {
  // A 15 gp longsword where blades stand at 1.12 times their base price: 15 * 1.12 = 16.8 gp.
  const sword = localPriceFor(ANSWER, { id: "base-item:longsword:test", rarity: "none", type: "martial weapon | melee weapon", value: "15 gp" });
  assert.equal(sword.copper, 1680);
  assert.equal(sword.line, "In Openton: 16.8 gp (12% above list)");
  assert.equal(sword.direction, "up");
  // A 50 gp tonic at 0.92: 46 gp.
  const tonic = localPriceFor(ANSWER, { id: "item:tonic:test", rarity: "common", type: "potion", value: 5000 });
  assert.equal(tonic.line, "In Openton: 46 gp (8% below list)");
  assert.equal(tonic.direction, "down");
});

test("covers: by type, by id, the rarity guard, and not covered", () => {
  const good = (item) => findCoveringGood(ANSWER, item)?.good ?? null;
  assert.equal(good({ id: "x", rarity: "none", type: "simple weapon | melee weapon" }), "Ordinary blades", "by type");
  assert.equal(good({ id: "x", rarity: "", type: "Martial Weapon · Melee Weapon" }), "Ordinary blades", "type matching ignores case and separators");
  assert.equal(good({ id: "ITEM:Tonic:Test", rarity: "common", type: "potion" }), "Tonic", "by id, ignoring case");

  assert.equal(good({ id: "magic-sword", rarity: "uncommon", type: "martial weapon | melee weapon" }), null, "an uncommon weapon is not covered by type");
  assert.equal(good({ id: "odd-sword", rarity: "unknown (magic)", type: "martial weapon" }), null, "unknown rarity is not covered by type");
  assert.equal(good({ id: "varies", rarity: "varies", type: "simple weapon" }), null);
  assert.equal(good({ id: "item:greater-tonic:test", rarity: "rare", type: "potion" }), "Tonic", "an id listed by the DM is covered whatever its rarity");

  assert.equal(good({ id: "item:rope:test", rarity: "none", type: "adventuring gear" }), null, "a type nobody covers");
  assert.equal(good({ id: "x", rarity: "none", type: "" }), null, "no type, no id: not covered");
  assert.equal(good({ id: "x", rarity: "none", type: "weapon" }), null, "a partial word does not match a type");
});

test("no line at all when there is nothing to say", () => {
  const sword = { id: "s", rarity: "none", type: "martial weapon", value: "15 gp" };
  for (const answer of [EMPTY, null, undefined, {}, { place: { name: "Openton" }, prices: [] }, { place: null, prices: ANSWER.prices }]) {
    assert.equal(isEmptyAnswer(answer), true);
    assert.equal(localPriceFor(answer, sword), null);
  }
  assert.equal(localPriceFor(ANSWER, { ...sword, value: "" }), null, "no catalog price");
  assert.equal(localPriceFor(ANSWER, { ...sword, value: 0 }), null);
  assert.equal(localPriceFor({ ...ANSWER, prices: [{ ...ANSWER.prices[0], ratio: 0 }] }, sword), null, "no share to move it by");
  assert.equal(localPriceFor(ANSWER, { id: "x", rarity: "none", type: "wondrous item", value: "300 gp" }), null, "not covered");
});

/* ---------- the engine and the open route ---------- */

test("a good's covers rule is checked, tidied and kept only when it says something", () => {
  const config = engine.normalizeEconomyConfig(setupWithCovers().economy);
  const bread = config.goods.find((good) => good.id === "bread");
  assert.deepEqual(bread.covers, { itemIds: ["item:loaf:test"], types: [], reference: "item:loaf:test", estimate: true, basis: "DM NOTE: the mill is the weak point" });
  assert.deepEqual(config.goods.find((good) => good.id === "rope").covers.types, ["adventuring gear"], "types are stored in lower case");

  const none = testSetup().economy;
  none.goods[0].covers = { itemIds: [], types: [] };
  assert.equal("covers" in engine.normalizeEconomyConfig(none).goods[0], false, "an empty rule is not stored");
  assert.equal("covers" in engine.normalizeEconomyConfig(testSetup().economy).goods[0], false, "goods without a rule are unchanged");

  for (const bad of ["weapons", ["x"], { itemIds: "item:x" }, { types: [{}] }.types && { types: "simple weapon" }]) {
    const setup = testSetup().economy;
    setup.goods[0].covers = bad;
    assert.throws(() => engine.normalizeEconomyConfig(setup), /covers/u);
  }
});

async function startedWithCovers() {
  const world = makeWorld();
  await world.service.startWorld({});
  await world.service.putPlaces(setupWithCovers());
  await world.service.setParty({ place: "openton" });
  return world;
}

const publicPrices = (world, key) => world.handlers.worldPublicPrices(makeRequest("GET", "world/public/prices", { key }), quietContext);

test("public prices carry each good's share of its base price and which items follow it, and nothing else new", withDmKey(DM_KEY, async () => {
  const world = await startedWithCovers();
  const response = await publicPrices(world);
  assert.equal(response.status, 200);
  const shown = JSON.parse(response.body);
  assert.deepEqual(Object.keys(shown).sort(), ["place", "prices"]);
  for (const entry of shown.prices) {
    assert.deepEqual(Object.keys(entry).sort(), ["covers", "good", "kind", "price", "priceText", "ratio", "unit", "vsUsualPercent"]);
    assert.deepEqual(Object.keys(entry.covers).sort(), ["itemIds", "types"], "only the ids and types, not the DM's notes about them");
  }
  const bread = shown.prices.find((entry) => entry.good === "Bread");
  assert.deepEqual(bread.covers, { itemIds: ["item:loaf:test"], types: [] });
  assert.equal(bread.ratio, Math.round((bread.price / 100) * 10000) / 10000, "ratio is this town's price over the base price of 100");
  assert.deepEqual(shown.prices.find((entry) => entry.good === "Rope").covers, { itemIds: [], types: ["adventuring gear"] });

  for (const forbidden of ["DM NOTE", "weak point", "basis", "estimate", "reference", "Secretville", "secretville", "Farplace", "stock", "why", "usual\"", "route", "pressure"]) {
    assert.ok(!response.body.includes(forbidden), `the public answer contains "${forbidden}"`);
  }
  assert.equal((await publicPrices(world, "wrong")).body, response.body, "the key is not consulted");
}));

test("the empty answer is unchanged: party somewhere hidden, nowhere, or no world at all", withDmKey(DM_KEY, async () => {
  const world = await startedWithCovers();
  await world.service.setParty({ place: "secretville" });
  assert.deepEqual(JSON.parse((await publicPrices(world)).body), EMPTY);
  await world.service.setParty({ place: null });
  assert.deepEqual(JSON.parse((await publicPrices(world)).body), EMPTY);
  assert.deepEqual(JSON.parse((await publicPrices(makeWorld())).body), EMPTY);
}));

test("a client can work out an item's local price from the open route alone", withDmKey(DM_KEY, async () => {
  const world = await startedWithCovers();
  const shown = JSON.parse((await publicPrices(world)).body);
  const bread = shown.prices.find((entry) => entry.good === "Bread");
  const local = localPriceFor(shown, { id: "item:loaf:test", rarity: "none", type: "food and drink", value: "2 sp" });
  assert.equal(local.town, "Openton");
  assert.ok(Math.abs(local.copper - 20 * bread.ratio) <= 0.005, "2 sp moved by the bread share, to the nearest hundredth of a copper");
  assert.equal(localPriceFor(shown, { id: "item:cake:test", rarity: "none", type: "food and drink", value: "2 sp" }), null, "an item nobody listed keeps its catalog price");
}));

/* ---------- the players' town page ---------- */

let townBoots = 0;

async function openTown({ answer, fail = false } = {}) {
  const dom = new JSDOM(townHtml.replace(/<script[\s\S]*?<\/script>/gu, ""), {
    url: "https://eldoria.test/tools/town/index.html",
    pretendToBeVisual: true
  });
  for (const key of ["window", "document", "navigator", "localStorage", "sessionStorage", "HTMLElement", "Element", "Node", "Event", "location"]) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
  }
  dom.window.ELDORIA_API_BASE_URL = "https://api.test/api";
  const server = { fail, answer: answer || { prices: EMPTY, rumours: { place: null, rumours: [] } }, calls: [], catalog: [], catalogFail: false };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input?.url || input);
    server.calls.push({ url, method: String(init.method || "GET").toUpperCase(), headers: Object.fromEntries(Object.entries(init.headers || {}).map(([name, value]) => [name.toLowerCase(), value])) });
    if (server.fail) throw new TypeError("Failed to fetch");
    // The item lookup uses the same catalog search as the item search tool.
    if (new URL(url).pathname.endsWith("/catalog/items")) {
      if (server.catalogFail) throw new TypeError("Failed to fetch");
      const q = (new URL(url).searchParams.get("q") || "").toLowerCase();
      const items = (server.catalog || []).filter((item) => item.name.toLowerCase().includes(q));
      return new Response(JSON.stringify({ kind: "items", count: items.length, items }), { status: 200, headers: { "content-type": "application/json" } });
    }
    const body = url.endsWith("/world/public/prices") ? server.answer.prices : url.endsWith("/world/public/rumours") ? server.answer.rumours : null;
    return new Response(JSON.stringify(body ?? { error: "Not found" }), { status: body ? 200 : 404, headers: { "content-type": "application/json" } });
  };
  const page = await import(`../../tools/town/town.js?town=${(townBoots += 1)}`);
  const doc = dom.window.document;
  return {
    dom, doc, server, page,
    text: () => doc.querySelector("#town-view").textContent.replace(/\s+/gu, " ").trim(),
    q: (selector) => doc.querySelector(selector)
  };
}

const TOWN = {
  prices: { place: { name: "Openton" }, prices: ANSWER.prices },
  rumours: { place: { name: "Openton" }, rumours: [{ text: "Someone hoards grain." }, { text: "<b>The mayor</b> saw a light." }] }
};

test("town page: prices and what people are saying, in the town the party is in", async () => {
  const page = await openTown({ answer: TOWN });
  await waitFor(() => page.q("#town-name"), () => `the page should load: ${page.text()}`);
  assert.equal(page.q("#town-name").textContent, "Word in Openton");
  assert.equal(page.doc.title, "Word in Openton | Eldoria Player Wiki");
  const rows = [...page.doc.querySelectorAll("#town-prices tbody tr")].map((row) => [...row.children].map((cell) => cell.textContent.replace(/\s+/gu, " ").trim()));
  assert.deepEqual(rows, [["Tonic per flask", "46 gp", "-8%"], ["Bread per loaf", "1 gp", "usual"]], "only real staples are listed; a modifier is never a row");
  assert.doesNotMatch(page.q("#town-prices").textContent, /blades/iu);
  assert.equal(page.q("#town-prices-title").textContent, "Staples: what they cost here");
  const versus = [...page.doc.querySelectorAll("#town-prices .town-versus")].map((node) => node.className);
  assert.deepEqual(versus, ["town-versus town-versus--down", "town-versus"]);
  const told = [...page.doc.querySelectorAll("#town-rumours q")].map((node) => node.textContent);
  assert.deepEqual(told, TOWN.rumours.rumours.map((entry) => entry.text));
  assert.equal(page.q("#town-rumours b"), null, "a rumour is shown as text, never as markup");
});

test("town page: asks only the two open routes, sends no key, stores nothing", async () => {
  const page = await openTown({ answer: TOWN });
  await waitFor(() => page.q("#town-name"), "the page should load");
  assert.deepEqual(page.server.calls.map((call) => `${call.method} ${new URL(call.url).pathname}`).sort(), ["GET /api/world/public/prices", "GET /api/world/public/rumours"]);
  for (const call of page.server.calls) {
    assert.equal(call.headers["x-eldoria-dm-key"], undefined);
    assert.equal(call.headers["x-functions-key"], undefined);
    assert.equal(call.headers.authorization, undefined);
  }
  assert.equal(page.dom.window.localStorage.length, 0);
  assert.equal(page.dom.window.sessionStorage.length, 0);
  assert.equal(page.doc.cookie, "");
});

test("town page: every reason for an empty answer reads the same", async () => {
  const cases = [
    { prices: EMPTY, rumours: { place: null, rumours: [] } }, // no world, or the party is somewhere hidden
    { prices: { place: { name: "Openton" }, prices: [] }, rumours: { place: { name: "Openton" }, rumours: [] } } // a known town with nothing to report
  ];
  const seen = [];
  for (const answer of cases) {
    const page = await openTown({ answer });
    await waitFor(() => page.q("#town-empty"), () => `the empty card should show: ${page.text()}`);
    seen.push(page.text());
    assert.equal(page.q("#town-prices"), null);
    assert.equal(page.q("#town-rumours"), null);
  }
  assert.deepEqual(seen, ["Word in town No news from town yet.", "Word in town No news from town yet."]);
});

test("town page: a known town with only rumours, or only prices, still shows what there is", async () => {
  let page = await openTown({ answer: { prices: { place: { name: "Openton" }, prices: [] }, rumours: TOWN.rumours } });
  await waitFor(() => page.q("#town-name"), "the page should load");
  assert.equal(page.q("#town-prices"), null, "no staples, so no staples table");
  assert.equal(page.q("#town-lookup"), null, "no prices answer, so no item lookup either");
  assert.equal(page.doc.querySelectorAll("#town-rumours q").length, 2);

  page = await openTown({ answer: { prices: TOWN.prices, rumours: { place: { name: "Openton" }, rumours: [] } } });
  await waitFor(() => page.q("#town-name"), "the page should load");
  assert.match(page.q("#town-rumours").textContent, /Nothing you have heard yet/u);
});

test("town page: no connection says so, with Try again; and it checks again when the tab comes back", async () => {
  const page = await openTown({ fail: true });
  await waitFor(() => page.q("#town-error"), () => `the error card should show: ${page.text()}`);
  assert.match(page.text(), /Could not reach the server/u);
  assert.equal(page.q("#town-prices"), null);

  page.server.fail = false;
  page.server.answer = TOWN;
  page.q("#town-retry").dispatchEvent(new page.dom.window.MouseEvent("click", { bubbles: true }));
  await waitFor(() => page.q("#town-name"), "Try again should load the town");

  // The tab comes back into view: one more check, and new talk appears.
  const before = page.server.calls.length;
  page.server.answer = { ...TOWN, rumours: { place: { name: "Openton" }, rumours: [{ text: "The well has gone dry." }] } };
  page.doc.dispatchEvent(new page.dom.window.Event("visibilitychange"));
  await waitFor(() => /The well has gone dry/u.test(page.text()), "the page should re-check when it becomes visible");
  assert.equal(page.server.calls.length, before + 2, "one check, two requests");

  // A failed re-check keeps what was already on screen.
  page.server.fail = true;
  page.doc.dispatchEvent(new page.dom.window.Event("visibilitychange"));
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.match(page.text(), /The well has gone dry/u);
  assert.ok(page.page.RECHECK_MS >= 3 * 60 * 1000, "the timed re-check is minutes apart, not seconds");
});

test("town page files hold no world data and no key", () => {
  const dir = fileURLToPath(new URL("../../tools/town/", import.meta.url));
  for (const fileName of fs.readdirSync(dir)) {
    const text = fs.readFileSync(`${dir}/${fileName}`, "utf8");
    assert.doesNotMatch(text, /Private\/|places\.upload|seed\.draft|dm-key|x-eldoria-dm-key|localStorage\.setItem/u, `${fileName} must not reach for DM data or a key`);
  }
});

/* ---------- item search ---------- */

test("item search: a covered item gains a local price line; anything else gains nothing", async () => {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="item-search"></div></body></html>`, { url: "https://eldoria.test/tools/item-search/item-search.html", runScripts: "outside-only" });
  for (const file of ["shared-search.js", "item-normalizer.js", "item-search/item-search.js"]) {
    dom.window.eval(await readFile(new URL(`../../tools/${file}`, import.meta.url), "utf8"));
  }
  const render = dom.window.EldoriaFeatureSource.rulesSearchConfigs.items.render;
  const root = dom.window.document.querySelector("#item-search");
  const rows = [
    { Id: "base-item:longsword:test", Name: "Longsword", Rarity: "None", Type: "martial weapon | melee weapon", Value: "15 gp" },
    { Id: "generated:plus-one-longsword:test", Name: "+1 Longsword", Rarity: "Uncommon", Type: "martial weapon | melee weapon", Value: "315 gp" },
    { Id: "item:tonic:test", Name: "Tonic", Rarity: "Common", Type: "potion", Value: "50 gp" },
    { Id: "item:lantern:test", Name: "Lantern", Rarity: "None", Type: "adventuring gear", Value: "5 gp" },
    { Id: "item:odd:test", Name: "Odd thing", Rarity: "None", Type: "martial weapon", Value: "" }
  ];
  root.innerHTML = rows.map(render).join("");
  const line = (id) => root.querySelector(`.item-card[data-catalog-id="${id}"] .item-local-price`);
  for (const row of rows) {
    assert.ok(line(row.Id), `${row.Name} has the empty line ready`);
    assert.equal(line(row.Id).hidden, true, "nothing is shown before prices are known");
    assert.equal(line(row.Id).textContent, "");
  }

  const { decorateAll, startLocalPrices } = await import("../../tools/item-search/item-search-local-prices.js");
  decorateAll(root, ANSWER);
  assert.equal(line("base-item:longsword:test").textContent, "In Openton: 16.8 gp (12% above list)");
  assert.equal(line("base-item:longsword:test").hidden, false);
  assert.equal(line("item:tonic:test").textContent, "In Openton: 46 gp (8% below list)");
  for (const id of ["generated:plus-one-longsword:test", "item:lantern:test", "item:odd:test"]) {
    assert.equal(line(id).hidden, true, `${id} shows only its catalog price`);
    assert.equal(line(id).textContent, "");
  }

  // No town, a failed request, or a missing route: nothing is added and nothing breaks.
  root.innerHTML = rows.map(render).join("");
  assert.equal(await startLocalPrices(root, async () => ({ getWorldPublicPrices: async () => EMPTY })), null);
  assert.equal(await startLocalPrices(root, async () => ({ getWorldPublicPrices: async () => { throw new Error("404"); } })), null);
  assert.equal(await startLocalPrices(root, async () => { throw new Error("no client"); }), null);
  assert.equal([...root.querySelectorAll(".item-local-price")].every((node) => node.hidden && node.textContent === ""), true);

  assert.ok(await startLocalPrices(root, async () => ({ getWorldPublicPrices: async () => ANSWER })));
  assert.equal(line("base-item:longsword:test").textContent, "In Openton: 16.8 gp (12% above list)");
  dom.window.close();
});

test("item search still takes its data from the API only", async () => {
  const dir = fileURLToPath(new URL("../../tools/item-search/", import.meta.url));
  for (const fileName of fs.readdirSync(dir)) {
    const text = fs.readFileSync(`${dir}/${fileName}`, "utf8");
    assert.doesNotMatch(text, /\bfetch\s*\(/u, `${fileName} must go through the API client`);
    assert.doesNotMatch(text, /["'][^"']*\/data\/[^"']*\.json["']/u, `${fileName} must not read a local data file`);
  }
});

/* ---------- the DM page ---------- */

let dmBoots = 0;

async function openDmPage(world) {
  const dom = new JSDOM(dmHtml.replace(/<script[\s\S]*?<\/script>/gu, ""), { url: "https://eldoria.test/tools/world-sim/index.html", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "location"]) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
  }
  globalThis.CSS = { escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/gu, "\\$&") };
  dom.window.ELDORIA_API_BASE_URL = "https://api.test/api";
  dom.window.localStorage.setItem("eldoria:dm-key", DM_KEY);
  const api = createApiFetch(world);
  globalThis.fetch = async (input, init) => {
    if (String(input?.url || input).endsWith("/world-sim/regions.draft.json")) {
      return new Response(JSON.stringify({ regions: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return api(input, init);
  };
  const warn = console.warn;
  console.warn = () => {};
  await import(`../../tools/world-sim/world-sim.js?stage4=${(dmBoots += 1)}`);
  console.warn = warn;
  const doc = dom.window.document;
  const page = {
    doc, dom, api,
    q: (selector) => doc.querySelector(selector),
    text: () => doc.querySelector("#ws-view").textContent.replace(/\s+/gu, " "),
    click(selector) {
      const node = doc.querySelector(selector);
      assert.ok(node, `nothing to click: ${selector}`);
      node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    },
    idle: () => waitFor(() => !doc.querySelector("#ws-advance").disabled, "the page should finish what it is doing")
  };
  await waitFor(() => doc.querySelector("#ws-jot"), () => `the DM page should load: ${page.text()}`);
  await page.idle();
  return page;
}

test("DM page: What players see shows exactly the open routes' answer, with the way to change it one tap away", withDmKey(DM_KEY, async () => {
  process.env.ELDORIA_DM_KEY = DM_KEY;
  const world = makeWorld();
  await world.service.startWorld({});
  await world.service.putPlaces(setupWithCovers());
  const page = await openDmPage(world);

  assert.match(page.q("#ws-players").textContent, /Not checked yet/u);
  page.click("[data-act='players-preview']");
  await waitFor(() => page.q("#ws-players-empty"), () => `the empty preview should show: ${page.text()}`);
  assert.match(page.q("#ws-players-empty").textContent, /No news from town yet\./u);

  await world.service.setParty({ place: "openton" });
  const begun = await world.service.startRumour({ origin: "openton", who: "someone", what: "saw a light" });
  await world.service.rumourAction(begun.rumourId, { action: "reveal", place: "openton", playersVisible: true });
  page.click("[data-act='players-preview']");
  await waitFor(() => page.q("#ws-players-town"), () => `the preview should show the town: ${page.text()}`);
  assert.match(page.q("#ws-players-town").textContent, /Word in Openton/u);
  assert.deepEqual([...page.doc.querySelectorAll("#ws-players-prices tbody tr")].map((row) => row.children[0].textContent.replace(/\s+/gu, " ").trim()), ["Bread per loaf", "Rope per coil"]);
  assert.match(page.q("#ws-players-prices").textContent, /1 by id/u);
  assert.match(page.q("#ws-players-prices").textContent, /adventuring gear/u);
  assert.equal(page.doc.querySelectorAll("#ws-players-rumours q").length, 1);
  assert.doesNotMatch(page.q("#ws-players").textContent, /DM NOTE|weak point/u, "the preview shows the public answer, not the DM's notes");
  assert.ok(page.q("#ws-players a[href='#rumours']"), "reveal toggles are one tap away");
  assert.ok(page.q("#ws-players a[href='../town/index.html']"), "and so is the players' page");
}));

test("DM page: which items follow a good can be edited in Markets, and players' prices follow", withDmKey(DM_KEY, async () => {
  process.env.ELDORIA_DM_KEY = DM_KEY;
  const world = makeWorld();
  await world.service.startWorld({});
  await world.service.putPlaces(setupWithCovers());
  await world.service.setParty({ place: "openton" });
  const page = await openDmPage(world);

  page.click("[data-act='tab'][data-id='markets']");
  await waitFor(() => page.q("#ws-covers"), () => `Markets should open: ${page.text()}`);
  await page.idle();
  assert.equal(page.q("#ws-covers-ids").value, "item:loaf:test");
  assert.match(page.q("#ws-covers summary").textContent, /estimate/u, "a guessed rule is labelled as one");

  page.q("#ws-covers-ids").value = "item:loaf:test\n  item:bun:test  \n";
  page.q("#ws-covers-types").value = "Food and Drink";
  page.click("[data-act='save-covers']");
  await waitFor(() => /Saved\./u.test(page.text()), () => `the rule should save: ${page.text()}`);
  await page.idle();

  const shown = JSON.parse((await publicPrices(world)).body);
  assert.deepEqual(shown.prices.find((entry) => entry.good === "Bread").covers, { itemIds: ["item:bun:test", "item:loaf:test"], types: ["food and drink"] });
  assert.doesNotMatch(page.q("#ws-covers summary").textContent, /estimate/u, "once the DM sets it, it is no longer a guess");

  page.q("#ws-covers-ids").value = "";
  page.q("#ws-covers-types").value = "";
  page.click("[data-act='save-covers']");
  let cleared = null;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    cleared = JSON.parse((await publicPrices(world)).body);
    if (!cleared.prices.find((entry) => entry.good === "Bread").covers.itemIds.length) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  await page.idle();
  assert.deepEqual(cleared.prices.find((entry) => entry.good === "Bread").covers, { itemIds: [], types: [] }, "an emptied rule covers nothing");
}));

/* ---------- after Stage 4: real items, no priced categories (the DM's correction) ---------- */

// A setup with one modifier ("Ordinary blades", applied to ordinary weapons) beside the
// two real commodities. Everything named is made up.
function setupWithModifier() {
  const setup = testSetup();
  setup.economy.goods.push({
    id: "blades", kind: "modifier", name: "Ordinary blades", basePrice: { value: 1500, estimate: true, basis: "tracked against a made-up sword" },
    covers: { types: ["simple weapon", "martial weapon"], itemIds: [], reference: "base-item:sword:test" }
  });
  setup.economy.markets.openton.blades = { make: 2, use: 1 };
  setup.economy.markets.secretville.blades = { make: 0, use: 1 };
  return setup;
}

const COIN = /\d\s?(?:cp|sp|ep|gp|pp)\b/u;

test("a good is a commodity or a modifier, and the setup is checked when it is loaded", () => {
  const config = engine.normalizeEconomyConfig({ ...setupWithModifier().economy, places: {} });
  const byId = Object.fromEntries(config.goods.map((good) => [good.id, good]));
  assert.equal(byId.bread.kind, "commodity", "a good with no kind is a commodity, as before");
  assert.equal(byId.bread.unit, "loaf");
  assert.equal(byId.blades.kind, "modifier");
  assert.equal(byId.blades.unit, "", "a modifier is not sold by any unit");

  const bad = (change, pattern) => {
    const setup = setupWithModifier().economy;
    change(setup.goods.find((good) => good.id === "blades"));
    assert.throws(() => engine.normalizeEconomyConfig({ ...setup, places: {} }), pattern);
  };
  bad((good) => { good.kind = "category"; }, /commodity.*modifier/u);
  bad((good) => { delete good.covers; }, /must say which catalog items/u);
  bad((good) => { good.covers = { types: [], itemIds: [] }; }, /must say which catalog items/u);
});

test("list-price wording: below, above and at list", () => {
  assert.equal(engine.listPriceText(0.78), "22% below list price");
  assert.equal(engine.listPriceText(1.08), "8% above list price");
  assert.equal(engine.listPriceText(1), "at list price");
  assert.equal(listPercentText(-22), "22% below list");
  assert.equal(listPercentText(8), "8% above list");
  assert.equal(listPercentText(0), "list price");
});

test("public prices: a modifier carries no unit and no price at all, only what applies it to real items", withDmKey(DM_KEY, async () => {
  const world = makeWorld();
  await world.service.startWorld({});
  await world.service.putPlaces(setupWithModifier());
  await world.service.setParty({ place: "openton" });
  for (let day = 0; day < 6; day += 1) await world.service.advance({ days: 1, expectedEtag: (await world.service.getWorld()).etag });

  const shown = await publicPrices(world);
  const answer = JSON.parse(shown.body);
  const blades = answer.prices.find((entry) => entry.good === "Ordinary blades");
  assert.deepEqual(Object.keys(blades).sort(), ["covers", "good", "kind", "ratio"], "nothing but what a client needs to apply it");
  assert.equal(blades.kind, "modifier");
  assert.ok(blades.ratio > 0);
  assert.deepEqual(blades.covers, { itemIds: [], types: ["martial weapon", "simple weapon"] });
  assert.doesNotMatch(JSON.stringify(blades), COIN, "no coin figure for a modifier");
  assert.doesNotMatch(shown.body, /base-item:sword:test|tracked against|estimate|basis|stock|usual":/u, "the DM's reference and notes are not sent");
  assert.doesNotMatch(shown.body, /secretville|farplace/iu, "no other town");

  const bread = answer.prices.find((entry) => entry.good === "Bread");
  assert.equal(bread.kind, "commodity");
  assert.match(bread.priceText, COIN, "a commodity keeps its price");
  assert.deepEqual(commodityRows(answer).map((entry) => entry.good), ["Bread", "Rope"], "clients list commodities only");

  // A real item follows the modifier at its own catalog price.
  const dagger = localPriceFor(answer, { id: "base-item:dagger:test", rarity: "none", type: "simple weapon | melee weapon", value: "2 gp" });
  assert.ok(Math.abs(dagger.copper - 200 * blades.ratio) <= 0.005);
  assert.match(dagger.line, /^In Openton: [\d.,]+ (?:cp|sp|gp) \((?:\d+% (?:below|above) list|list price)\)$/u);

  // The empty answer is exactly as before.
  await world.service.setParty({ place: "secretville" });
  assert.deepEqual(JSON.parse((await publicPrices(world)).body), EMPTY);
}));

test("the DM's own figures and the day report never give a modifier a price in coin", withDmKey(DM_KEY, async () => {
  const world = makeWorld();
  await world.service.startWorld({});
  await world.service.putPlaces(setupWithModifier());
  // A shock, so the modifier moves enough to be mentioned.
  await world.service.jot({ text: "The smiths down tools.", place: "openton", effect: { type: "pressure", target: "make", place: "openton", good: "blades", multiplier: 0, days: 40 } });
  const lines = [];
  for (let day = 0; day < 30; day += 1) {
    const result = await world.service.advance({ days: 1, expectedEtag: (await world.service.getWorld()).etag });
    lines.push(...(result.report || []));
  }
  const about = lines.filter((line) => line.good === "blades");
  assert.ok(about.length > 0, "the modifier is mentioned when it moves");
  for (const line of about) {
    assert.doesNotMatch(line.text, COIN, `no coin in: ${line.text}`);
    assert.doesNotMatch(line.text, /\bunits?\b|\d+(?:\.\d+)? ordinary/iu, "no unit and no count of a thing that is not a thing");
  }
  assert.ok(about.some((line) => /Ordinary blades in Openton now \d+% (?:above|below) list price|at list price/u.test(line.text)), `a price line reads as a percentage: ${about.map((line) => line.text).join(" | ")}`);

  const markets = await world.service.getMarkets();
  const good = markets.goods.find((entry) => entry.id === "blades");
  assert.equal(good.kind, "modifier");
  assert.equal(good.basePriceText, "", "its reference figure is not presented as a price");
  const entry = markets.places.find((place) => place.id === "openton").goods.find((item) => item.good === "blades");
  assert.equal(entry.priceText, "");
  assert.equal(entry.usualText, "");
  assert.match(entry.listText, /^(?:\d+% (?:above|below) list price|at list price)$/u);
}));

test("an item's price is never invented: no catalog price, no local price; not covered, list price", () => {
  const covered = describeItemPrice(ANSWER, { id: "x", rarity: "none", type: "martial weapon", value: "15 gp" });
  assert.equal(covered.listText, "15 gp");
  assert.equal(covered.local.priceText, "16.8 gp");
  assert.equal(covered.local.percentText, "12% above list");

  const plain = describeItemPrice(ANSWER, { id: "item:lantern:test", rarity: "none", type: "adventuring gear", value: "5 gp" });
  assert.deepEqual(plain, { listText: "5 gp", local: null }, "nothing covers it: its own list price, nothing else");

  for (const value of ["", null, undefined, "varies", "0 gp"]) {
    assert.deepEqual(describeItemPrice(ANSWER, { id: "x", rarity: "none", type: "martial weapon", value }), { listText: "", local: null });
  }
  assert.deepEqual(describeItemPrice(EMPTY, { id: "x", rarity: "none", type: "martial weapon", value: "15 gp" }), { listText: "15 gp", local: null });
});

const CATALOG = [
  { kind: "items", id: "base-item:longsword:test", name: "Longsword", rarity: "none", type: "martial weapon | melee weapon", valueLabel: "15 gp" },
  { kind: "items", id: "generated:plus-one-longsword:test", name: "+1 Longsword", rarity: "uncommon", type: "martial weapon | melee weapon", valueLabel: "315 gp" },
  { kind: "items", id: "item:long-rope:test", name: "Long rope", rarity: "none", type: "adventuring gear", valueLabel: "5 gp" },
  { kind: "items", id: "item:longing-charm:test", name: "Longing charm", rarity: "none", type: "martial weapon", valueLabel: "" },
  { kind: "items", id: "item:tonic:test", name: "Tonic", rarity: "common", type: "potion", valueLabel: "50 gp" }
];

async function typeLookup(page, value) {
  const input = page.q("#town-lookup-input");
  input.value = value;
  input.dispatchEvent(new page.dom.window.Event("input", { bubbles: true }));
}

const itemRow = (page, id) => {
  const row = page.q(`#town-lookup-list [data-item-id="${id}"]`);
  return row ? row.textContent.replace(/\s+/gu, " ").trim() : null;
};

test("town page: look up any real item and see its own list price and its price in this town", async () => {
  const page = await openTown({ answer: TOWN });
  page.server.catalog = CATALOG;
  await waitFor(() => page.q("#town-lookup"), () => `the lookup should show: ${page.text()}`);
  assert.equal(page.q("#town-lookup-title").textContent, "Look up an item");
  assert.match(page.q("#town-lookup-hint").textContent, /at least 2 letters/u);

  // One letter is not searched.
  await typeLookup(page, "l");
  await new Promise((resolve) => setTimeout(resolve, page.page.LOOKUP_DEBOUNCE_MS + 60));
  assert.equal(page.server.calls.filter((call) => call.url.includes("/catalog/items")).length, 0);

  // Typing is debounced: three quick changes, one search.
  await typeLookup(page, "lo");
  await typeLookup(page, "lon");
  await typeLookup(page, "long");
  await waitFor(() => page.q("#town-lookup-list"), () => `results should show: ${page.text()}`);
  const searches = page.server.calls.filter((call) => call.url.includes("/catalog/items"));
  assert.equal(searches.length, 1, "one search for the settled text");
  assert.equal(new URL(searches[0].url).searchParams.get("q"), "long");
  for (const call of searches) {
    assert.equal(call.method, "GET");
    assert.equal(call.headers["x-eldoria-dm-key"], undefined, "the catalog is asked without any key");
  }

  // A covered ordinary weapon: its own list price moved by the town's share.
  assert.equal(itemRow(page, "base-item:longsword:test"), "Longsword 16.8 gp here 12% above list List price 15 gp");
  // A magic weapon is not covered by type: list price only.
  assert.equal(itemRow(page, "generated:plus-one-longsword:test"), "+1 Longsword 315 gp list price");
  // Nothing covers adventuring gear: list price only.
  assert.equal(itemRow(page, "item:long-rope:test"), "Long rope 5 gp list price");
  // The catalog gives no price: none is made up, even though its type is covered.
  assert.equal(itemRow(page, "item:longing-charm:test"), "Longing charm No list price");
  assert.match(page.q("#town-lookup-results").textContent, /against each item's own list price/u);

  // The staples table and the lookup use different words and are never mixed up.
  assert.match(page.q("#town-prices").textContent, /Against usual/u);
  assert.doesNotMatch(page.q("#town-prices").textContent, /list/iu);
  assert.doesNotMatch(page.q("#town-lookup").textContent, /usual/iu);

  assert.equal(page.dom.window.localStorage.length, 0, "still nothing stored");
});

test("town page: the lookup says plainly when the item list cannot be reached or has no match", async () => {
  const page = await openTown({ answer: TOWN });
  page.server.catalog = CATALOG;
  await waitFor(() => page.q("#town-lookup"), "the lookup should show");

  await typeLookup(page, "zzzz");
  await waitFor(() => page.q("#town-lookup-none"), () => `no match should say so: ${page.text()}`);
  assert.equal(page.q("#town-lookup-none").textContent, "No item by that name.");

  page.server.catalogFail = true;
  await typeLookup(page, "tonic");
  await waitFor(() => page.q("#town-lookup-error"), () => `a failed search should say so: ${page.text()}`);
  assert.match(page.q("#town-lookup-error").textContent, /Could not reach the item list/u);
  assert.ok(page.q("#town-name"), "the rest of the page is untouched");

  page.server.catalogFail = false;
  await typeLookup(page, "toni");
  await waitFor(() => itemRow(page, "item:tonic:test"), "it works again on the next search");
  assert.equal(itemRow(page, "item:tonic:test"), "Tonic 46 gp here 8% below list List price 50 gp");
});

test("town page: a re-check that changes nothing leaves what the player is typing alone; no town, no lookup", async () => {
  const page = await openTown({ answer: TOWN });
  page.server.catalog = CATALOG;
  await waitFor(() => page.q("#town-lookup"), "the lookup should show");
  await typeLookup(page, "long");
  await waitFor(() => page.q("#town-lookup-list"), "results should show");
  const input = page.q("#town-lookup-input");

  page.doc.dispatchEvent(new page.dom.window.Event("visibilitychange"));
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(page.q("#town-lookup-input"), input, "the same input is still there");
  assert.equal(input.value, "long");
  assert.ok(page.q("#town-lookup-list"), "and so are the results");

  // Prices move: the page redraws, the text typed is kept and the figures follow.
  page.server.answer = { ...TOWN, prices: { place: { name: "Openton" }, prices: ANSWER.prices.map((entry) => (entry.kind === "modifier" ? { ...entry, ratio: 0.9 } : entry)) } };
  page.doc.dispatchEvent(new page.dom.window.Event("visibilitychange"));
  await waitFor(() => /13\.5 gp here/u.test(itemRow(page, "base-item:longsword:test") || ""), () => `the lookup should follow the new prices: ${page.text()}`);
  assert.equal(page.q("#town-lookup-input").value, "long");
  assert.equal(itemRow(page, "base-item:longsword:test"), "Longsword 13.5 gp here 10% below list List price 15 gp");

  const none = await openTown({ answer: { prices: EMPTY, rumours: { place: null, rumours: [] } } });
  await waitFor(() => none.q("#town-empty"), "the empty card should show");
  assert.equal(none.q("#town-lookup"), null);
});

test("DM page: a modifier is shown as a percentage in its own section, never as a priced row", withDmKey(DM_KEY, async () => {
  process.env.ELDORIA_DM_KEY = DM_KEY;
  const world = makeWorld();
  await world.service.startWorld({});
  await world.service.putPlaces(setupWithModifier());
  await world.service.setParty({ place: "openton" });
  const page = await openDmPage(world);

  page.click("[data-act='tab'][data-id='markets']");
  await waitFor(() => page.q("#ws-markets"), () => `Markets should open: ${page.text()}`);
  await page.idle();
  // Commodities and modifiers are picked from separate rows.
  const modifierButtons = [...page.doc.querySelectorAll("#ws-modifier-picker [data-act='good']")].map((button) => button.textContent);
  assert.deepEqual(modifierButtons, ["Ordinary blades"]);
  assert.ok(page.q("#ws-market-table"), "a commodity is shown as a table of prices");

  page.click("[data-act='good'][data-id='blades']");
  await waitFor(() => page.q("#ws-modifier-table"), () => `the modifier view should show: ${page.text()}`);
  const view = page.q("#ws-markets");
  assert.equal(page.q("#ws-market-table"), null, "no price table for a modifier");
  assert.equal(page.q("#ws-base-price"), null, "and no base price to edit as if it were a price");
  assert.doesNotMatch(view.textContent, COIN, "no coin figure anywhere in the modifier's view");
  assert.doesNotMatch(view.textContent, /Stock lasts|14 days/u);
  assert.match(page.q("#ws-modifier-lede").textContent, /is not one thing with a price/u);
  assert.match(page.q("#ws-modifier-lede").textContent, /every ordinary martial weapon or simple weapon/u);
  const cells = [...page.doc.querySelectorAll("#ws-modifier-table [data-list-text]")].map((cell) => cell.textContent);
  assert.equal(cells.length, 2);
  for (const cell of cells) assert.match(cell, /^(?:\d+% (?:above|below) list price|at list price)$/u);
  assert.ok(page.q("#ws-covers"), "which items it applies to can still be edited");

  // The place page lists it as a line, not as a priced row.
  page.click("#ws-modifier-table [data-act='open-place'][data-id='openton']");
  await waitFor(() => page.q("#ws-place-prices"), () => `the place page should open: ${page.text()}`);
  assert.doesNotMatch(page.q("#ws-place-prices").textContent, /blades/iu);
  assert.match(page.q("#ws-place-modifiers").textContent, /Ordinary blades: (?:\d+% (?:above|below) list price|at list price) here/u);
  assert.doesNotMatch(page.q("#ws-place-modifiers").textContent, COIN);

  // What players see: staples as rows, the modifier as a line the players never see.
  page.click("[data-act='tab'][data-id='today']");
  await waitFor(() => page.q("#ws-players"), "Today should open");
  page.click("[data-act='players-preview']");
  await waitFor(() => page.q("#ws-players-town"), () => `the preview should show: ${page.text()}`);
  assert.deepEqual([...page.doc.querySelectorAll("#ws-players-prices tbody tr")].map((row) => row.children[0].textContent.replace(/\s+/gu, " ").trim()), ["Bread per loaf", "Rope per coil"]);
  assert.match(page.q("#ws-players-modifiers").textContent, /Ordinary blades: (?:\d+% (?:above|below) list price|at list price)/u);
  assert.doesNotMatch(page.q("#ws-players-modifiers").textContent, COIN);
}));

/* ---------- rumours: only the DM's words ---------- */

test("a rumour's telling is who, what and where, with nothing appended; tone, size and vagueness are tags", () => {
  const state = { systems: { economy: { config: { places: { openton: { name: "Openton" } } } } } };
  for (const flatters of [true, false, null]) {
    for (const size of [1, 2, 3, 4, 5]) {
      for (const vague of [true, false]) {
        const text = engine.rumourText({ who: "the baker", what: "poisoned the well", where: "openton", size, flatters, vague }, state);
        assert.equal(text, "The baker poisoned the well in Openton.", `flatters ${flatters}, size ${size}, vague ${vague}`);
      }
    }
  }
  assert.equal(engine.rumourText({ who: "", what: "saw lights under the lake", where: null, size: 2, flatters: true }, state), "Someone saw lights under the lake.");
  assert.deepEqual(engine.rumourTags({ flatters: true, size: 2 }), ["flattering"]);
  assert.deepEqual(engine.rumourTags({ flatters: false, size: 4, vague: true }), ["unflattering", "enormous", "vague"]);
  assert.deepEqual(engine.rumourTags({ flatters: null, size: 2 }), []);
  assert.deepEqual(Object.keys(engine.RUMOUR_BEND_LABELS).sort(), [...engine.RUMOUR_ATTRIBUTES].sort());
  assert.equal(engine.RUMOUR_BEND_LABELS.flatters, "tone flipped");

  // Tellings saved before this change are still read, without their filler.
  assert.equal(engine.rumourText({ who: "a stranger", what: "hoards grain, or something like it", where: "openton", size: 2, flatters: false }, state), "Someone hoards grain in Openton.");
  assert.deepEqual(engine.rumourTags({ who: "a stranger", what: "hoards grain, or something like it", flatters: false, size: 2 }), ["unflattering", "vague"]);
});

test("no telling anywhere carries the old filler, whichever way a rumour bends", withDmKey(DM_KEY, async () => {
  const filler = /speak well|blame them|something like it|a stranger|It was (?:a|enormous)|Nothing like it/iu;
  const labels = new Set(Object.values(engine.RUMOUR_BEND_LABELS));
  let bends = 0;
  for (let run = 0; run < 12; run += 1) {
    const world = makeWorld();
    await world.service.startWorld({});
    await world.service.putPlaces(testSetup());
    await world.service.setParty({ place: "openton" });
    const begun = await world.service.startRumour({ origin: "secretville", who: "the miller", what: "hoards grain", size: 3, flatters: run % 2 === 0 });
    for (let day = 0; day < 4; day += 1) await world.service.advance({ days: 1, expectedEtag: (await world.service.getWorld()).etag });
    const rumour = (await world.service.getOverview()).rumours.find((item) => item.id === begun.rumourId);
    assert.doesNotMatch(rumour.trueText, filler);
    assert.equal(rumour.trueText, "The miller hoards grain in Secretville.");
    for (const heard of rumour.heard) {
      assert.doesNotMatch(heard.text, filler, heard.text);
      assert.match(heard.text, /^(?:The miller|Someone) hoards grain in (?:Secretville|Openton|Farplace)\.$/u, heard.text);
      if (heard.bent) {
        bends += 1;
        assert.ok(labels.has(heard.bentLabel), `a bend is named for the DM: ${heard.bentLabel}`);
      } else {
        assert.equal(heard.bentLabel, null);
      }
    }
    if (rumour.heard.some((heard) => heard.place === "openton")) {
      await world.service.rumourAction(begun.rumourId, { action: "reveal", place: "openton", playersVisible: true });
      const shown = await world.handlers.worldPublicRumours(makeRequest("GET", "world/public/rumours"), quietContext);
      assert.doesNotMatch(shown.body, filler);
      assert.doesNotMatch(shown.body, /flatter|vague|tone|bent|enormous|"tags"/iu, "tags are the DM's, never the players'");
    }
  }
  assert.ok(bends > 0, "some hop bent in twelve runs");
}));
