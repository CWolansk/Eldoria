// Living world, stage 4: beside an item's catalog value, what it costs where the party is.
// It must never block, slow or break the sheet, and adds nothing when there is no answer.
import test from "node:test";
import assert from "node:assert/strict";
import { bootSheetPage } from "./page.mjs";
import { waitFor } from "./dom.mjs";

const ANSWER = {
  place: { name: "Openton" },
  prices: [
    { good: "Blades", unit: "blade", price: 1680, priceText: "16.8 gp", vsUsualPercent: 12, ratio: 1.12, covers: { itemIds: [], types: ["simple weapon", "martial weapon"] } },
    { good: "Tonic", unit: "flask", price: 4600, priceText: "46 gp", vsUsualPercent: -8, ratio: 0.92, covers: { itemIds: ["item:tonic:test"], types: [] } }
  ]
};
const EMPTY = { place: null, prices: [] };

const statusText = () => document.querySelector("#level-editor-save-status")?.textContent || "";
const upToDate = () => waitFor(() => /Up to date/.test(statusText()), `status was "${statusText()}"`, 400);
const gearText = () => document.querySelector("#TabContent")?.textContent || "";

// The first boot also gives us the fixture builders.
const first = await bootSheetPage();
await upToDate();
first.restoreConsole();
const { SheetCompiler } = await import("../../SheetCompiler.js");
const {
  getLocalPriceLine, primeLocalPrices, resetLocalPrices, setLocalPrices
} = await import("../../PlayerSheetJavaScript/PlayerSheetLocalPrices.js");
const { createItemCard, getItemDetailRows } = await import("../../PlayerSheetJavaScript/PlayerSheetTabHelpers.js");
const { BuildPlayerSheetGearTab } = await import("../../PlayerSheetJavaScript/PlayerSheetGearTabBuilder.js");

const sword = { name: "Longsword", catalog: { id: "base-item:longsword:test" } };
const swordRecord = { name: "Longsword", weapon: true, weaponCategory: "martial", _typeListText: ["martial weapon", "melee weapon"], rarity: "none", valueLabel: "15 gp" };
const value = (item, record) => getItemDetailRows(item, record).find(([label]) => label === "Value")?.[1];

test("with the route absent (404), the sheet loads as before and shows catalog values only", async () => {
  assert.match(statusText(), /Up to date/);
  await window.setTab("Gear");
  assert.doesNotMatch(gearText(), /\bIn [A-Z][a-z]+: /u);
  assert.equal(first.server.saves.length, 0);
  assert.equal(value(sword, swordRecord), "15 gp");
});

test("a covered item's Value gains the local line; anything else keeps its catalog value", () => {
  setLocalPrices(ANSWER);
  assert.equal(value(sword, swordRecord), "15 gp · In Openton: 16.8 gp (+12%)");
  assert.equal(value({ name: "Tonic", catalog: { id: "item:tonic:test" } }, { rarity: "common", type: "P", valueLabel: "50 gp" }), "50 gp · In Openton: 46 gp (-8%)");
  assert.equal(value({ name: "+1 Longsword" }, { ...swordRecord, rarity: "uncommon", valueLabel: "315 gp" }), "315 gp", "a magic weapon is not covered by type");
  assert.equal(value({ name: "Lantern" }, { rarity: "none", _typeListText: ["adventuring gear"], valueLabel: "5 gp" }), "5 gp");
  assert.equal(value({ name: "Odd" }, { ...swordRecord, valueLabel: "" }), undefined, "no catalog value, no line");
  assert.equal(getLocalPriceLine({ name: "Club" }, { weaponCategory: "simple", rarity: "none", value: 10 }), "In Openton: 1.1 sp (+12%)");
});

test("the Add Item picker's card shows the same line", () => {
  setLocalPrices(ANSWER);
  const card = createItemCard(sword, swordRecord);
  assert.match(card.textContent, /In Openton: 16\.8 gp \(\+12%\)/u);
  setLocalPrices(null);
  assert.doesNotMatch(createItemCard(sword, swordRecord).textContent, /In Openton/u);
});

test("an empty answer, a failure or a missing route adds nothing and never throws", async () => {
  for (const api of [
    { getWorldPublicPrices: async () => EMPTY },
    { getWorldPublicPrices: async () => { throw new Error("offline"); } },
    { getWorldPublicPrices: () => { throw new Error("sync failure"); } },
    {},
    null
  ]) {
    resetLocalPrices();
    let ready = 0;
    primeLocalPrices(api, () => { ready += 1; });
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(ready, 0);
    assert.equal(getLocalPriceLine(sword, swordRecord), "");
  }
});

test("prices are asked for once per page load", async () => {
  resetLocalPrices();
  let calls = 0;
  let ready = 0;
  const api = { getWorldPublicPrices: async () => { calls += 1; return ANSWER; } };
  primeLocalPrices(api, () => { ready += 1; });
  primeLocalPrices(api, () => { ready += 1; });
  await waitFor(() => ready === 1, "the answer should arrive");
  primeLocalPrices(api, () => { ready += 1; });
  assert.equal(calls, 1);
  assert.equal(ready, 1);
  assert.equal(getLocalPriceLine(sword, swordRecord), "In Openton: 16.8 gp (+12%)");
});

test("Gear rows show the line, and showing it saves nothing", async () => {
  setLocalPrices(ANSWER);
  const dto = first.fx.createDto();
  dto.inventory.items = [{ name: "Longsword", quantity: 1, equipped: false, snapshot: swordRecord }];
  const saved = [];
  await BuildPlayerSheetGearTab(SheetCompiler.compile(dto), { api: first.fx.createFakeApi(), dto, onChange: async (next) => { saved.push(next); } });
  assert.match(gearText(), /15 gp · In Openton: 16\.8 gp \(\+12%\)/u);
  assert.equal(saved.length, 0);
  resetLocalPrices();
});

test("with the route present, the whole page loads, shows the line, and still saves nothing", async () => {
  resetLocalPrices();
  const dto = first.fx.createDto();
  // As on the live site: the sheet stores which item it is, and its details come from the catalog.
  dto.inventory.items = [{ name: "Longsword", quantity: 1, equipped: false, catalog: { id: "base-item:longsword:test", name: "Longsword", source: "TEST", kind: "items" } }];
  window.localStorage.setItem("eldoria:player-sheet:open-tab:test-character", "Gear");
  const requested = [];
  const { server, restoreConsole } = await bootSheetPage({
    dto,
    keepStorage: window.localStorage,
    publicPrices: ANSWER,
    catalogItems: { "base-item:longsword:test": { id: "base-item:longsword:test", kind: "items", source: "TEST", ...swordRecord } },
    onRequest: (url, method) => requested.push(`${method} ${new URL(url).pathname}`)
  });
  await upToDate();
  await waitFor(() => /In Openton: 16\.8 gp \(\+12%\)/u.test(gearText()), `the Gear tab should show the local price: ${gearText().slice(-400)}`, 400);
  restoreConsole();
  assert.equal(requested.filter((entry) => entry === "GET /api/world/public/prices").length, 1, "asked once");
  assert.equal(server.saves.length, 0, "showing a price never saves the sheet");
  assert.equal(server.actions.length, 0);
  assert.doesNotMatch(JSON.stringify(server.dto), /Openton/u, "nothing about the town is stored with the character");
});
