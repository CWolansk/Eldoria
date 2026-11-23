// Item 16: attunement can be changed after an item is added, with a count out of three,
// and the Attuned tag agrees with the Attuned filter.
import test from "node:test";
import assert from "node:assert/strict";
import { loadSheetFixtures } from "./fixtures.mjs";
import { waitFor } from "./dom.mjs";

const fx = await loadSheetFixtures();
const { SheetCompiler } = await import("../../SheetCompiler.js");
const { BuildPlayerSheetGearTab } = await import("../../PlayerSheetJavaScript/PlayerSheetGearTabBuilder.js");
const { itemRequiresAttunement } = await import("../../PlayerSheetJavaScript/PlayerSheetTabHelpers.js");

const magic = (name, attuned = false) => ({ name, quantity: 1, equipped: false, attuned, snapshot: { name, rarity: "rare", reqAttune: true, wondrous: true } });
const plain = (name) => ({ name, quantity: 1, equipped: false, snapshot: { name, type: "G" } });

async function render(items) {
  const dto = fx.createDto();
  dto.inventory.items = items;
  const state = { dto, saved: [] };
  const context = {
    api: fx.createFakeApi(),
    get dto() { return state.dto; },
    async onChange(next) { state.dto = next; state.saved.push(next); }
  };
  const tab = fx.mountTab();
  await BuildPlayerSheetGearTab(SheetCompiler.compile(dto), context);
  const row = (name) => [...tab.querySelectorAll(".player-sheet-item-row")].find((node) => node.querySelector(".player-sheet-item-row__title").textContent === name);
  return { tab, state, row };
}

test("which items need attunement", () => {
  assert.equal(itemRequiresAttunement({}, { reqAttune: true }), true);
  assert.equal(itemRequiresAttunement({}, { reqAttune: "by a druid" }), true);
  assert.equal(itemRequiresAttunement({}, { reqAttune: false }), false);
  assert.equal(itemRequiresAttunement({}, { attunement: "none" }), false);
  assert.equal(itemRequiresAttunement({}, {}), false);
});

test("an item that needs attunement gets an Attune button; a plain item does not", async () => {
  const { row } = await render([magic("Talisman"), plain("Rope")]);
  assert.ok(row("Talisman").querySelector("[data-attune]"));
  assert.equal(row("Talisman").querySelector("[data-attune]").textContent, "Attune");
  assert.equal(row("Rope").querySelector("[data-attune]"), null);
});

test("attuning saves the flag, and the tag, filter count and total all agree", async () => {
  let { tab, state, row } = await render([magic("Talisman"), magic("Ring")]);
  assert.match(tab.querySelector(".player-sheet-gear-controls__status").textContent, /Attuned 0 of 3/);
  assert.doesNotMatch(row("Talisman").textContent, /Attuned/, "needing attunement is not the same as being attuned");

  row("Talisman").querySelector("[data-attune]").click();
  await waitFor(() => state.saved.length === 1, "attuning should change the sheet");
  assert.equal(state.dto.inventory.items[0].attuned, true);
  assert.equal(state.dto.inventory.items[1].attuned, false);

  ({ tab, state, row } = await render(state.dto.inventory.items));
  const button = row("Talisman").querySelector("[data-attune]");
  assert.equal(button.textContent, "Attuned");
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.match(tab.querySelector(".player-sheet-gear-controls__status").textContent, /Attuned 1 of 3/);
  const filter = [...tab.querySelectorAll(".player-sheet-gear-filter")].find((node) => /Attuned/.test(node.textContent));
  assert.match(filter.textContent, /Attuned\s*1/);

  button.click();
  await waitFor(() => state.saved.length === 1, "ending attunement should change the sheet");
  assert.equal(state.dto.inventory.items[0].attuned, false);
});

test("a fourth attunement is refused, with the reason, but ending one still works", async () => {
  const { row } = await render([magic("A", true), magic("B", true), magic("C", true), magic("D")]);
  const fourth = row("D").querySelector("[data-attune]");
  assert.equal(fourth.disabled, true);
  assert.equal(fourth.textContent, "Attune (3 of 3 used)");
  assert.match(fourth.getAttribute("aria-label"), /already attuned to 3 items/);
  assert.equal(row("A").querySelector("[data-attune]").disabled, false);
});
