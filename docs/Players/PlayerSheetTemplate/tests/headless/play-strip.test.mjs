// Items 1 and 3: players track hit points, conditions and the rest on their own sheet,
// through the action route, without overwriting a DM change.
import test from "node:test";
import assert from "node:assert/strict";
import { bootSheetPage } from "./page.mjs";
import { waitFor } from "./dom.mjs";

const { server, status, restoreConsole } = await bootSheetPage();
const strip = () => document.querySelector("#player-sheet-play-strip");
const q = (selector) => strip().querySelector(selector);
const hpText = () => [...q("[data-play-hp]").children].map((node) => node.textContent.trim()).join(" ");
const statusState = () => status()?.dataset.saveStatus || "";
const statusText = () => status()?.textContent || "";
const idle = () => strip() && !q("[data-play-action]:disabled, [data-play-inspiration]:disabled");
async function settled(count) {
  await waitFor(() => server.actions.length === count && idle() && statusState() === "saved", "action should finish", 400)
    .catch(() => { throw new Error(`action ${count} did not finish (sent ${server.actions.length}, status "${statusText()}")`); });
}
async function act(type, amount) {
  const before = server.actions.length;
  await waitFor(idle, "strip should be ready", 400);
  q("#player-sheet-play-amount").value = String(amount);
  q(`[data-play-action='${type}']`).click();
  await settled(before + 1);
}

test("the strip is the first thing in the sheet header and shows current hit points", async () => {
  await waitFor(() => strip() && /Up to date/.test(statusText()), "page should load", 400);
  assert.equal(strip().parentElement.firstElementChild, strip());
  assert.equal(hpText(), "HP 12 / 12 +3 temp");
  for (const selector of [".CombatHeader .HP", ".DeathSaves", ".DeathFailures", ".DefenseState .Conditions", ".DefenseState .Exhaustion"]) {
    assert.equal(document.querySelector(selector).hidden, true, `${selector} is replaced by the strip`);
  }
  assert.equal(document.querySelector(".CombatHeader .AC").hidden, false, "AC stays");
});

test("damage is sent as an action, uses temporary hit points first, and never saves the whole sheet", async () => {
  await act("damage", 5);
  assert.deepEqual(server.actions.at(-1), { type: "damage", amount: 5 });
  assert.equal(hpText(), "HP 10 / 12");
  assert.equal(server.saves.length, 0, "no whole-sheet save");
  assert.equal(server.dto.combatState.currentHp, 10);
});

test("healing stops at the maximum", async () => {
  await act("heal", 50);
  assert.equal(hpText(), "HP 12 / 12");
});

test("an empty amount asks for one and sends nothing", () => {
  const before = server.actions.length;
  q("#player-sheet-play-amount").value = "";
  q("[data-play-action='damage']").click();
  assert.equal(server.actions.length, before);
  assert.match(q(".player-sheet-play__message").textContent, /Enter an amount/);
});

test("a DM change made at the same moment is kept when the player takes damage", async () => {
  // The DM adds a condition on their screen; this sheet has not polled yet.
  server.dto = { ...server.dto, combatState: { ...server.dto.combatState, conditions: ["Poisoned"] } };
  await act("damage", 4);
  assert.deepEqual(server.dto.combatState.conditions, ["Poisoned"], "the DM's condition survives");
  assert.equal(server.dto.combatState.currentHp, 8);
  assert.equal(hpText(), "HP 8 / 12");
  assert.ok(q("[data-play-remove-condition='Poisoned']"), "and now shows on the player's sheet");
});

test("a sheet edit still waiting to save goes first, then the action", async () => {
  const xp = document.querySelector(".XP input");
  xp.value = "7100";
  xp.dispatchEvent(new window.Event("change", { bubbles: true }));
  await act("damage", 1);
  assert.equal(server.saves.at(-1).identity.experience, 7100, "the edit was saved");
  assert.equal(server.dto.identity.experience, 7100, "and was not undone by the action");
  assert.equal(server.dto.combatState.currentHp, 7);
});

test("conditions can be added and removed", async () => {
  let count = server.actions.length;
  const select = q("#player-sheet-play-condition");
  assert.ok([...select.options].some((option) => option.value === "Prone"));
  assert.ok(![...select.options].some((option) => option.value === "Poisoned"), "active conditions are not offered again");
  select.value = "Prone";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  await settled(count += 1);
  assert.deepEqual(server.dto.combatState.conditions, ["Poisoned", "Prone"]);

  q("[data-play-remove-condition='Poisoned']").click();
  await settled(count += 1);
  assert.deepEqual(server.dto.combatState.conditions, ["Prone"]);
  q("[data-play-remove-condition='Prone']").click();
  await settled(count += 1);
  assert.match(q(".player-sheet-play__conditions").textContent, /none/);
});

test("exhaustion steps up and down within 0 to 6", async () => {
  let count = server.actions.length;
  assert.equal(q("[data-play-exhaustion='-1']").disabled, true);
  q("[data-play-exhaustion='1']").click();
  await settled(count += 1);
  assert.equal(q("[data-play-exhaustion-value]").textContent, "1");
  q("[data-play-exhaustion='-1']").click();
  await settled(count += 1);
  assert.equal(server.dto.combatState.exhaustion, 0);
});

test("concentration can be set and cleared", async () => {
  let count = server.actions.length;
  q("#player-sheet-play-concentration").value = "Bless";
  q("[data-play-concentration-set]").click();
  await settled(count += 1);
  assert.equal(server.dto.combatState.concentration, "Bless");
  assert.match(q("[data-play-concentration]").textContent, /Bless/);
  q("[data-play-concentration-clear]").click();
  await settled(count += 1);
  assert.equal(server.dto.combatState.concentration, "");
});

test("temporary hit points can be set", async () => {
  await act("temp-hp", 6);
  assert.match(hpText(), /\+6 temp/);
});

test("inspiration is the player's own toggle and saves with the sheet", async () => {
  const saves = server.saves.length;
  assert.equal(q("[data-play-inspiration]").getAttribute("aria-pressed"), "false");
  q("[data-play-inspiration]").click();
  await waitFor(() => server.saves.length === saves + 1 && statusState() === "saved" && idle(), "inspiration should save", 400);
  assert.equal(server.saves.at(-1).identity.inspiration, true);
  assert.equal(q("[data-play-inspiration]").getAttribute("aria-pressed"), "true");
});

test("death saves appear only at 0 hit points and can be marked", async () => {
  assert.equal(q("[data-play-death]"), null);
  await act("damage", 500);
  assert.equal(hpText(), "HP 0 / 12");
  let count = server.actions.length;
  q("[data-play-death='successes:1']").click();
  await settled(count += 1);
  q("[data-play-death='failures:2']").click();
  await settled(count += 1);
  assert.deepEqual(server.dto.combatState.deathSaves, { successes: 1, failures: 2 });
  assert.equal(q("[data-play-death='failures:2']").getAttribute("aria-pressed"), "true");
  q("[data-play-death='failures:2']").click();
  await settled(count += 1);
  assert.equal(server.dto.combatState.deathSaves.failures, 1, "tapping the last marked pip clears it");

  await act("heal", 3);
  assert.equal(q("[data-play-death]"), null, "healing above 0 puts death saves away");
  assert.deepEqual(server.dto.combatState.deathSaves, { successes: 0, failures: 0 });
});

test("an action that cannot be sent says so, changes nothing, and can be tried again", async () => {
  server.failActions = true;
  const before = hpText();
  q("#player-sheet-play-amount").value = "2";
  q("[data-play-action='damage']").click();
  await waitFor(() => !q(".player-sheet-play__message").hidden, "a message should appear", 400);
  assert.match(q(".player-sheet-play__message").textContent, /did not go through/);
  assert.equal(hpText(), before);
  assert.equal(q("[data-play-action='damage']").disabled, false);
  assert.match(statusText(), /not sent/);

  server.failActions = false;
  const count = server.actions.length;
  q("[data-play-action='damage']").click();
  await settled(count + 1);
  assert.equal(hpText(), "HP 1 / 12");
  restoreConsole();
});
