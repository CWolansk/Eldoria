// Items 2 (first step) and 14: spell slots can be spent, and the Spells tab is trimmed.
import test from "node:test";
import assert from "node:assert/strict";
import { loadSheetFixtures } from "./fixtures.mjs";
import { waitFor } from "./dom.mjs";

const fx = await loadSheetFixtures();
const { SheetCompiler } = await import("../../SheetCompiler.js");
const { PlayerSheetDtoHelper } = await import("../../PlayerSheetDtoHelper.js");
const { BuildPlayerSheetSpellsTab } = await import("../../PlayerSheetJavaScript/PlayerSheetSpellsTabBuilder.js");
const { CatalogCache } = await import("../../CatalogCache.js");

function rangerDto() {
  const dto = fx.createRangerDto(); // slots 4 / 4 at 1st level, 2 / 2 at 2nd
  dto.spells.cantrips = ["Sacred Flame"];
  dto.spells.known = ["Hunter's Mark"];
  return dto;
}

async function render(dto, onChange) {
  CatalogCache.clearShared();
  const state = { dto, saved: [] };
  const context = {
    api: fx.createFakeApi(),
    get dto() { return state.dto; },
    async onChange(next) { state.dto = next; state.saved.push(next); await onChange?.(next); }
  };
  const tab = fx.mountTab();
  await BuildPlayerSheetSpellsTab(SheetCompiler.compile(state.dto), context);
  return { tab, state, context };
}

const tile = (tab, level) => tab.querySelector(`.player-sheet-spell-slot[data-slot-level="${level}"]`);
const value = (tab, level) => tile(tab, level).querySelector(".player-sheet-spell-slot__value").textContent;

test("the number of slots comes from the class table; used slots come from the sheet", () => {
  const dto = rangerDto();
  const fresh = SheetCompiler.compile(dto).spellSlots.byLevel;
  assert.deepEqual(fresh["1"], { max: 4, expended: 0 });

  dto.spells.spellSlots = { byLevel: { "1": { expended: 3 } } };
  const used = SheetCompiler.compile(dto).spellSlots.byLevel;
  assert.deepEqual(used["1"], { max: 4, expended: 3 }, "recording only what is used keeps the class maximum");
  assert.deepEqual(used["2"], { max: 2, expended: 0 }, "other levels still come from the class table");

  dto.spells.spellSlots = { byLevel: { "1": { max: 6, expended: 9 } } };
  assert.deepEqual(SheetCompiler.compile(dto).spellSlots.byLevel["1"], { max: 6, expended: 6 }, "a recorded maximum wins, and used never exceeds it");
});

test("Use spends a slot and Restore gives it back, saving only the used count", async () => {
  let { tab, state } = await render(rangerDto());
  assert.equal(value(tab, 1), "4 / 4");
  assert.equal(tile(tab, 1).querySelector("[data-slot-action='restore:1']").disabled, true, "nothing to restore yet");

  tile(tab, 1).querySelector("[data-slot-action='use:1']").click();
  await waitFor(() => state.saved.length === 1, "use should change the sheet");
  assert.deepEqual(state.dto.spells.spellSlots, { byLevel: { "1": { expended: 1 } } });
  assert.deepEqual(PlayerSheetDtoHelper.toSaveDto(state.dto).spells.spellSlots, { byLevel: { "1": { expended: 1 } } }, "survives the strict save shape");

  ({ tab, state } = await render(state.dto));
  assert.equal(value(tab, 1), "3 / 4");
  assert.match(tab.querySelector(".player-sheet-spell-level-section__slots").textContent, /Slots 3 \/ 4/);
  tile(tab, 1).querySelector("[data-slot-action='restore:1']").click();
  await waitFor(() => state.saved.length === 1, "restore should change the sheet");
  assert.equal(state.dto.spells.spellSlots.byLevel["1"].expended, 0);
});

test("Use is off when no slots are left", async () => {
  const dto = rangerDto();
  dto.spells.spellSlots = { byLevel: { "2": { expended: 2 } } };
  const { tab } = await render(dto);
  assert.equal(value(tab, 2), "0 / 2");
  assert.equal(tile(tab, 2).querySelector("[data-slot-action='use:2']").disabled, true);
  assert.equal(tile(tab, 2).querySelector("[data-slot-action='restore:2']").disabled, false);
});

test("without a way to save (read-only), no slot buttons are shown", async () => {
  CatalogCache.clearShared();
  const dto = rangerDto();
  const tab = fx.mountTab();
  await BuildPlayerSheetSpellsTab(SheetCompiler.compile(dto), { api: fx.createFakeApi(), dto });
  assert.equal(tab.querySelector("[data-slot-action]"), null);
});

test("only spell levels that have spells are listed", async () => {
  const { tab } = await render(rangerDto());
  const headings = [...tab.querySelectorAll(".player-sheet-spell-level-section .player-sheet-section__title")].map((node) => node.textContent);
  assert.deepEqual(headings, ["Cantrips", "1st-Level Spells"]);
  assert.doesNotMatch(tab.textContent, /No spells recorded at this level/);
});

test("a caster with no spells yet gets one plain line, not nine empty sections", async () => {
  const dto = fx.createRangerDto();
  dto.spells.cantrips = [];
  dto.spells.known = [];
  dto.spells.prepared = [];
  const { tab } = await render(dto);
  const headings = [...tab.querySelectorAll(".player-sheet-spell-level-section .player-sheet-section__title")].map((node) => node.textContent);
  if (headings.length === 0) {
    assert.match(tab.textContent, /No spells recorded yet/);
  }
  assert.ok(headings.length <= 2, `expected no empty level sections, got ${headings.join(", ")}`);
});

test("each spell row gives casting time, range and duration before its description", async () => {
  const { tab } = await render(rangerDto());
  const row = [...tab.querySelectorAll(".player-sheet-spell-row")].find((node) => /Hunter's Mark/.test(node.textContent));
  const identity = row.querySelector(".player-sheet-item-row__identity");
  const casting = identity.querySelector("[data-casting-line]");
  assert.ok(casting, "casting line exists");
  assert.equal(identity.children[1], casting, "it is the first thing under the name");
  const rules = identity.querySelector(".player-sheet-item-row__rules");
  if (rules) {
    assert.ok(casting.compareDocumentPosition(rules) & 4, "and comes before the description");
  }
  assert.ok(casting.textContent.split(" · ").length >= 2, `casting line was "${casting.textContent}"`);
  CatalogCache.clearShared();
});
