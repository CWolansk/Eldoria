// Item 10: the status tells the truth, and a failed save is sent again.
import test from "node:test";
import assert from "node:assert/strict";
import { bootSheetPage } from "./page.mjs";
import { tick, waitFor } from "./dom.mjs";

const { server, status, restoreConsole } = await bootSheetPage();
const statusText = () => status()?.querySelector(".player-sheet-save-status__text")?.textContent || "";
const state = () => status()?.dataset.saveStatus;
const waitState = (wanted, label) => waitFor(() => state() === wanted, `${label} (state is "${state()}": ${statusText()})`, 400);
const removeFirstGear = async () => {
  await window.setTab("Gear");
  document.querySelector("[data-gear-remove='0']").click();
};

test("after a plain load the status says 'Up to date', not 'Saved'", async () => {
  await waitFor(() => ["synced", "partial"].includes(state()), `load should settle (state "${state()}")`, 400);
  assert.match(statusText(), /^Up to date/);
  assert.equal(server.saves.length, 0, "loading must not save");
});

test("the status lives in the page header, outside the level editor", () => {
  assert.ok(status().closest(".player-sheet-page > header"));
  assert.equal(status().closest(".levelEditor"), null);
  assert.equal(status().getAttribute("aria-live"), "polite");
});

test("an edit shows 'Unsaved changes', then 'Saved' once the server has it", async () => {
  const before = server.dto.inventory.items.length;
  await removeFirstGear();
  await waitState("pending", "edit should mark the sheet unsaved");
  assert.equal(statusText(), "Unsaved changes");
  await waitState("saved", "save should complete");
  assert.equal(statusText(), "Saved");
  assert.equal(server.saves.at(-1).inventory.items.length, before - 1);
});

test("a failed save keeps the change, says so, and offers Retry", async () => {
  server.failSaves = true;
  const savesBefore = server.saves.length;
  const itemsBefore = server.dto.inventory.items.length;
  await removeFirstGear();
  await waitState("failed", "failed save should be reported");
  assert.match(statusText(), /Not saved/);
  const retry = status().querySelector(".player-sheet-save-status__retry");
  assert.ok(retry, "Retry button is shown");
  assert.equal(server.saves.length, savesBefore);

  server.failSaves = false;
  retry.click();
  await waitState("saved", "retry should save");
  assert.equal(server.saves.at(-1).inventory.items.length, itemsBefore - 1, "the kept change reached the server");
  assert.equal(status().querySelector(".player-sheet-save-status__retry"), null, "Retry goes away");
});

test("a failed save is sent again when the connection comes back", async () => {
  server.failSaves = true;
  const experienceInput = document.querySelector(".XP input");
  assert.ok(experienceInput, "XP field exists");
  experienceInput.value = "7000";
  experienceInput.dispatchEvent(new window.Event("change", { bubbles: true }));
  await waitState("failed", "failed save should be reported");

  server.failSaves = false;
  window.dispatchEvent(new window.Event("online"));
  await waitState("saved", "reconnect should save");
  assert.equal(server.saves.at(-1).identity.experience, 7000);
  await tick();
  restoreConsole();
});
