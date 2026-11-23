// Item 5: one-tap Remove still applies at once, and offers Undo.
import test from "node:test";
import assert from "node:assert/strict";
import { loadSheetFixtures } from "./fixtures.mjs";
import { waitFor } from "./dom.mjs";

const fx = await loadSheetFixtures();
const { PlayerSheetDtoHelper } = await import("../../PlayerSheetDtoHelper.js");
const { SheetCompiler } = await import("../../SheetCompiler.js");
const { BuildPlayerSheetGearTab } = await import("../../PlayerSheetJavaScript/PlayerSheetGearTabBuilder.js");
const { BuildPlayerSheetSpellsTab } = await import("../../PlayerSheetJavaScript/PlayerSheetSpellsTabBuilder.js");
const { dismissUndoToast, reinsertAt } = await import("../../PlayerSheetJavaScript/PlayerSheetUndoToast.js");
const { CatalogCache } = await import("../../CatalogCache.js");

const toast = () => document.querySelector("#player-sheet-toast-region .player-sheet-toast");

function harness(dto) {
  const state = { dto, changes: [] };
  return {
    state,
    context: {
      api: fx.createFakeApi(),
      get dto() { return state.dto; },
      getDto: () => state.dto,
      async onChange(nextDto) { state.dto = nextDto; state.changes.push(nextDto); }
    }
  };
}

test("reinsertAt puts an entry back in place, or at the end of a shorter list", () => {
  assert.deepEqual(reinsertAt(["a", "c"], 1, "b"), ["a", "b", "c"]);
  assert.deepEqual(reinsertAt(["a"], 5, "z"), ["a", "z"]);
  assert.deepEqual(reinsertAt(undefined, 0, "x"), ["x"]);
});

test("removing gear deletes it, shows Undo, and Undo restores the same entry in the same place", async () => {
  dismissUndoToast();
  const dto = fx.createDto();
  const before = PlayerSheetDtoHelper.getValue(dto, "inventory.items", []);
  assert.ok(before.length >= 2, "fixture needs at least two items");
  const { state, context } = harness(dto);
  const tab = fx.mountTab();
  await BuildPlayerSheetGearTab(SheetCompiler.compile(dto), context);

  tab.querySelector("[data-gear-remove='0']").click();
  await waitFor(() => state.changes.length === 1, "remove should patch the DTO");
  assert.equal(state.dto.inventory.items.length, before.length - 1);
  assert.equal(state.dto.inventory.items[0].name, before[1].name, "the first item is the one removed");

  await waitFor(() => toast(), "an Undo message should appear");
  assert.match(toast().textContent, new RegExp(`Removed ${before[0].name}`));

  toast().querySelector("[data-undo]").click();
  await waitFor(() => state.changes.length === 2, "undo should patch the DTO");
  assert.deepEqual(
    PlayerSheetDtoHelper.toSaveDto(state.dto).inventory.items,
    PlayerSheetDtoHelper.toSaveDto(dto).inventory.items,
    "undo restores the saved inventory exactly"
  );
  await waitFor(() => !toast(), "the message goes away after Undo");
});

test("Undo keeps an edit made after the removal", async () => {
  dismissUndoToast();
  const dto = fx.createDto();
  const before = dto.inventory.items;
  const { state, context } = harness(dto);
  const tab = fx.mountTab();
  await BuildPlayerSheetGearTab(SheetCompiler.compile(dto), context);
  tab.querySelector("[data-gear-remove='0']").click();
  await waitFor(() => toast(), "an Undo message should appear");

  // Someone (the player, or a DM refresh) changes another item before Undo is pressed.
  const edited = state.dto.inventory.items.map((entry, index) => index === 0 ? { ...entry, quantity: 7 } : entry);
  state.dto = PlayerSheetDtoHelper.patch(state.dto, "inventory.items", edited);

  toast().querySelector("[data-undo]").click();
  await waitFor(() => state.dto.inventory.items.length === before.length, "undo should restore the item");
  assert.equal(state.dto.inventory.items[0].name, before[0].name);
  assert.equal(state.dto.inventory.items[1].quantity, 7, "the later edit survives");
});

test("removing a spell shows Undo and Undo restores it", async () => {
  dismissUndoToast();
  CatalogCache.clearShared();
  const dto = fx.createRangerDto();
  dto.spells.cantrips = ["Sacred Flame"];
  dto.spells.known = ["Hunter's Mark"];
  const { state, context } = harness(dto);
  const tab = fx.mountTab();
  await BuildPlayerSheetSpellsTab(SheetCompiler.compile(dto), context);

  tab.querySelector("[data-spell-remove='known:0']").click();
  await waitFor(() => state.changes.length === 1, "remove should patch the DTO");
  assert.equal(state.dto.spells.known.length, 0);
  await waitFor(() => toast(), "an Undo message should appear");
  assert.match(toast().textContent, /Removed Hunter's Mark/);

  toast().querySelector("[data-undo]").click();
  await waitFor(() => state.changes.length === 2, "undo should patch the DTO");
  assert.deepEqual(state.dto.spells.known, ["Hunter's Mark"]);
  assert.deepEqual(state.dto.spells.cantrips, ["Sacred Flame"]);
  CatalogCache.clearShared();
});

test("a second removal replaces the first Undo message", async () => {
  dismissUndoToast();
  const dto = fx.createDto();
  const { state, context } = harness(dto);
  let tab = fx.mountTab();
  await BuildPlayerSheetGearTab(SheetCompiler.compile(dto), context);
  tab.querySelector("[data-gear-remove='0']").click();
  await waitFor(() => toast(), "first message");
  tab = fx.mountTab();
  await BuildPlayerSheetGearTab(SheetCompiler.compile(state.dto), context);
  tab.querySelector("[data-gear-remove='0']").click();
  await waitFor(() => state.changes.length === 2, "second removal");
  await waitFor(() => document.querySelectorAll(".player-sheet-toast").length === 1, "only one message at a time");
  dismissUndoToast();
});
