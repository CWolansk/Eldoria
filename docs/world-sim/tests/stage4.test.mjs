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
  findCoveringGood, formatMoney, isEmptyAnswer, localPriceFor, parseCopper, percentDirection, percentText
} from "../../tools/town/local-prices.js";

// Read before the first test is declared: tests declared after a top-level await can be missed.
const townHtml = await readFile(new URL("../../tools/town/index.html", import.meta.url), "utf8");
const dmHtml = await readFile(new URL("../../tools/world-sim/index.html", import.meta.url), "utf8");

const EMPTY = { place: null, prices: [] };
const ANSWER = {
  place: { name: "Openton" },
  prices: [
    { good: "Blades", unit: "blade", price: 1680, priceText: "16.8 gp", vsUsualPercent: 12, ratio: 1.12, covers: { itemIds: [], types: ["simple weapon", "martial weapon"] } },
    { good: "Tonic", unit: "flask", price: 4600, priceText: "46 gp", vsUsualPercent: -8, ratio: 0.92, covers: { itemIds: ["item:tonic:test", "item:greater-tonic:test"], types: [] } },
    { good: "Bread", unit: "loaf", price: 100, priceText: "1 gp", vsUsualPercent: 0, ratio: 1, covers: { itemIds: [], types: [] } }
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
  assert.equal(sword.line, "In Openton: 16.8 gp (+12%)");
  assert.equal(sword.direction, "up");
  // A 50 gp tonic at 0.92: 46 gp.
  const tonic = localPriceFor(ANSWER, { id: "item:tonic:test", rarity: "common", type: "potion", value: 5000 });
  assert.equal(tonic.line, "In Openton: 46 gp (-8%)");
  assert.equal(tonic.direction, "down");
});

test("covers: by type, by id, the rarity guard, and not covered", () => {
  const good = (item) => findCoveringGood(ANSWER, item)?.good ?? null;
  assert.equal(good({ id: "x", rarity: "none", type: "simple weapon | melee weapon" }), "Blades", "by type");
  assert.equal(good({ id: "x", rarity: "", type: "Martial Weapon · Melee Weapon" }), "Blades", "type matching ignores case and separators");
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
    assert.deepEqual(Object.keys(entry).sort(), ["covers", "good", "price", "priceText", "ratio", "unit", "vsUsualPercent"]);
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
  const server = { fail, answer: answer || { prices: EMPTY, rumours: { place: null, rumours: [] } }, calls: [] };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input?.url || input);
    server.calls.push({ url, method: String(init.method || "GET").toUpperCase(), headers: Object.fromEntries(Object.entries(init.headers || {}).map(([name, value]) => [name.toLowerCase(), value])) });
    if (server.fail) throw new TypeError("Failed to fetch");
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
  rumours: { place: { name: "Openton" }, rumours: [{ text: "A stranger hoards grain. People blame them for it." }, { text: "<b>The mayor</b> saw a light." }] }
};

test("town page: prices and what people are saying, in the town the party is in", async () => {
  const page = await openTown({ answer: TOWN });
  await waitFor(() => page.q("#town-name"), () => `the page should load: ${page.text()}`);
  assert.equal(page.q("#town-name").textContent, "Word in Openton");
  assert.equal(page.doc.title, "Word in Openton | Eldoria Player Wiki");
  const rows = [...page.doc.querySelectorAll("#town-prices tbody tr")].map((row) => [...row.children].map((cell) => cell.textContent.replace(/\s+/gu, " ").trim()));
  assert.deepEqual(rows, [["Blades per blade", "16.8 gp", "+12%"], ["Tonic per flask", "46 gp", "-8%"], ["Bread per loaf", "1 gp", "usual"]]);
  const versus = [...page.doc.querySelectorAll(".town-versus")].map((node) => node.className);
  assert.deepEqual(versus, ["town-versus town-versus--up", "town-versus town-versus--down", "town-versus"]);
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
  assert.match(page.q("#town-prices").textContent, /No prices to report/u);
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
  assert.equal(line("base-item:longsword:test").textContent, "In Openton: 16.8 gp (+12%)");
  assert.equal(line("base-item:longsword:test").hidden, false);
  assert.equal(line("item:tonic:test").textContent, "In Openton: 46 gp (-8%)");
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
  assert.equal(line("base-item:longsword:test").textContent, "In Openton: 16.8 gp (+12%)");
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
