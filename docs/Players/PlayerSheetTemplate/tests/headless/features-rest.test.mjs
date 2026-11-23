// Item 2, steps two and three: limited features can be spent, and rests restore things.
// Only { id, used } is stored for a feature; the rules supply the rest.
import test from "node:test";
import assert from "node:assert/strict";
import { bootSheetPage } from "./page.mjs";
import { waitFor } from "./dom.mjs";

const { server, status, restoreConsole } = await bootSheetPage();
const { SheetCompiler } = await import("../../SheetCompiler.js");
const { PlayerSheetDtoHelper } = await import("../../PlayerSheetDtoHelper.js");

const strip = () => document.querySelector("#player-sheet-play-strip");
const q = (selector) => strip()?.querySelector(selector);
const statusState = () => status()?.dataset.saveStatus || "";
const feature = (id) => q(`[data-play-feature='${id}']`);
const count = (id) => feature(id)?.querySelector(".player-sheet-play__feature-count")?.textContent;
const hp = () => q(".player-sheet-play__hp-current")?.textContent;
const idle = () => strip() && !q("[data-play-action]:disabled") && ["saved", "synced"].includes(statusState());
const SECOND_WIND = "class-second-wind";

async function saved(savesBefore) {
  await waitFor(() => server.saves.length === savesBefore + 1 && idle(), `sheet should save (status "${status()?.textContent}")`, 400);
}
async function acted(actionsBefore) {
  await waitFor(() => server.actions.length === actionsBefore + 1 && idle(), `action should finish (status "${status()?.textContent}")`, 400);
}

test("the compiler works out a feature's uses from the rules and subtracts what is spent", () => {
  const dto = PlayerSheetDtoHelper.normalize(structuredClone(server.dto));
  const fresh = SheetCompiler.compile(dto).resources.find((entry) => entry.id === SECOND_WIND);
  assert.deepEqual({ max: fresh.max, used: fresh.used, current: fresh.current }, { max: 1, used: 0, current: 1 });

  dto.resources = [{ id: SECOND_WIND, used: 1 }];
  const spent = SheetCompiler.compile(dto).resources.filter((entry) => entry.id === SECOND_WIND);
  assert.equal(spent.length, 1, "the stored record is not shown as a second resource");
  assert.deepEqual({ max: spent[0].max, used: spent[0].used, current: spent[0].current }, { max: 1, used: 1, current: 0 });

  dto.resources = [{ id: SECOND_WIND, used: 99 }];
  assert.equal(SheetCompiler.compile(dto).resources.find((entry) => entry.id === SECOND_WIND).current, 0, "used never exceeds the maximum");

  dto.resources = [{ id: "custom-flask", name: "Flask of Courage", current: 2, max: 3, recharge: "dawn" }];
  const custom = SheetCompiler.compile(dto).resources.find((entry) => entry.id === "custom-flask");
  assert.equal(custom.current, 2, "a custom resource with its own numbers is shown as stored");
});

test("a limited feature shows what is left and when it comes back", async () => {
  await waitFor(() => feature(SECOND_WIND) && /Up to date/.test(status()?.textContent || ""), "page should load", 400);
  assert.equal(count(SECOND_WIND), "1 / 1");
  assert.match(feature(SECOND_WIND).textContent, /Second Wind/);
  assert.match(feature(SECOND_WIND).textContent, /back on a short or long rest/);
  assert.equal(q(`[data-play-feature-restore='${SECOND_WIND}']`).disabled, true);
});

test("Use stores only { id, used }; Restore removes the record again", async () => {
  let saves = server.saves.length;
  q(`[data-play-feature-use='${SECOND_WIND}']`).click();
  await saved(saves);
  assert.deepEqual(server.saves.at(-1).resources, [{ id: SECOND_WIND, used: 1 }]);
  assert.equal(count(SECOND_WIND), "0 / 1");
  assert.equal(q(`[data-play-feature-use='${SECOND_WIND}']`).disabled, true);

  saves = server.saves.length;
  q(`[data-play-feature-restore='${SECOND_WIND}']`).click();
  await saved(saves);
  assert.deepEqual(server.saves.at(-1).resources, []);
  assert.equal(count(SECOND_WIND), "1 / 1");
});

test("a rest asks first, and Cancel sends nothing", () => {
  const before = server.actions.length;
  q("[data-play-rest='long']").click();
  const confirm = q(".player-sheet-play__rest-confirm");
  assert.equal(confirm.hidden, false);
  assert.match(confirm.textContent, /hit points to full/);
  q("[data-play-rest-cancel]").click();
  assert.equal(confirm.hidden, true);
  assert.equal(server.actions.length, before);
});

test("a short rest restores short-rest features and leaves hit points alone", async () => {
  let actions = server.actions.length;
  q("#player-sheet-play-amount").value = "5";
  q("[data-play-action='damage']").click();
  await acted(actions);
  const hurt = hp();

  const saves = server.saves.length;
  q(`[data-play-feature-use='${SECOND_WIND}']`).click();
  await saved(saves);

  actions = server.actions.length;
  q("[data-play-rest='short']").click();
  q("[data-play-rest-confirm='short']").click();
  await acted(actions);
  assert.deepEqual(server.actions.at(-1), { type: "rest", rest: "short" });
  assert.equal(count(SECOND_WIND), "1 / 1", "Second Wind is back");
  assert.deepEqual(server.dto.resources, []);
  assert.equal(hp(), hurt, "hit points are unchanged by a short rest");
});

test("a long rest restores hit points, slots and features, and lowers exhaustion by one", async () => {
  // Spend things first: a feature, a spell slot, exhaustion, temporary hit points, a death save.
  server.dto = {
    ...server.dto,
    resources: [{ id: SECOND_WIND, used: 1 }],
    spells: { ...server.dto.spells, spellSlots: { byLevel: { "1": { expended: 2 }, "2": { max: 3, expended: 3 } } } },
    combatState: { ...server.dto.combatState, exhaustion: 2, tempHp: 4, deathSaves: { successes: 1, failures: 2 }, conditions: ["Poisoned"] }
  };
  const actions = server.actions.length;
  const savesBefore = server.saves.length;
  q("[data-play-rest='long']").click();
  q("[data-play-rest-confirm='long']").click();
  await acted(actions);

  assert.deepEqual(server.dto.resources, []);
  assert.deepEqual(server.dto.spells.spellSlots.byLevel, { "2": { max: 3, expended: 0 } }, "used counts are cleared; a recorded maximum is kept");
  assert.equal(server.dto.combatState.exhaustion, 1);
  assert.equal(server.dto.combatState.tempHp, 0);
  assert.deepEqual(server.dto.combatState.deathSaves, { successes: 0, failures: 0 });
  assert.equal(server.dto.combatState.currentHp, 12, "hit points are back to the maximum");
  assert.deepEqual(server.dto.combatState.conditions, ["Poisoned"], "a rest does not remove conditions");
  assert.equal(hp(), "12");
  assert.equal(count(SECOND_WIND), "1 / 1");
  assert.equal(server.saves.length, savesBefore, "a rest never saves the whole sheet");
});

test("a rest refused by an older server explains itself", async () => {
  server.rejectRest = true;
  q("[data-play-rest='short']").click();
  q("[data-play-rest-confirm='short']").click();
  await waitFor(() => !q(".player-sheet-play__message").hidden, "a message should appear", 400);
  assert.match(q(".player-sheet-play__message").textContent, /server has not been updated/);
  server.rejectRest = false;
  restoreConsole();
});
