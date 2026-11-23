// Item 15: "HP setup incomplete" is something the player can act on.
import test from "node:test";
import assert from "node:assert/strict";
import { bootSheetPage } from "./page.mjs";
import { loadSheetFixtures } from "./fixtures.mjs";
import { waitFor } from "./dom.mjs";

const fx = await loadSheetFixtures();
const dto = fx.createDto();
dto.levels = dto.levels.map((level) => ({ ...level, hp: 0 }));
delete dto.combatState.maxHp;
dto.combatState.currentHp = 9;
dto.combatState.tempHp = 0;

const { server, status, restoreConsole } = await bootSheetPage({ dto });
const strip = () => document.querySelector("#player-sheet-play-strip");
const q = (selector) => strip()?.querySelector(selector);

test("with no maximum set, the strip says so plainly and offers Set up HP", async () => {
  await waitFor(() => q("[data-play-setup]") && /Up to date/.test(status()?.textContent || ""), "page should load", 400);
  assert.match(q("[data-play-setup]").textContent, /Maximum hit points are not set yet/);
  assert.match(q("[data-play-hp]").textContent, /9\s*\/ \?/);
  assert.equal(q("[data-play-action='heal']"), null, "healing is off until a maximum exists");
  assert.ok(q("[data-play-action='damage']"), "damage still works");
  assert.equal(q(".player-sheet-play__setup-form").hidden, true);
});

test("the form says what to include and saves the maximum as one action", async () => {
  q("[data-play-setup-open]").click();
  const form = q(".player-sheet-play__setup-form");
  assert.equal(form.hidden, false);
  assert.match(form.textContent, /Constitution bonus and extras such as Tough already added in/);

  q("[data-play-action='set-max-hp']").click();
  assert.equal(server.actions.length, 0, "an empty value sends nothing");

  q("#player-sheet-play-max-hp").value = "38";
  q("[data-play-action='set-max-hp']").click();
  await waitFor(() => server.actions.length === 1 && !q("[data-play-setup]"), "the maximum should be saved", 400);
  assert.deepEqual(server.actions[0], { type: "set-max-hp", value: 38 });
  assert.equal(server.dto.combatState.maxHp, 38);
  assert.equal(server.saves.length, 0, "no whole-sheet save");
  assert.match(q("[data-play-hp]").textContent, /9\s*\/ 38/);
  assert.ok(q("[data-play-action='heal']"), "healing is available now");
  assert.deepEqual(server.dto.levels.map((level) => level.hp), dto.levels.map(() => 0), "per-level numbers are left as they were");
});

test("the level editor says what a level's hit points should include", async () => {
  const { buildHpContent } = await import("../../LevelEditorJavaScript/Character/LevelEditorHpBuilder.js");
  const { SheetCompiler } = await import("../../SheetCompiler.js");
  const sample = fx.createDto();
  const box = document.createElement("div");
  box.appendChild(buildHpContent(SheetCompiler.compile(sample), {
    dto: sample, characterLevel: 2, classEntry: { hitDieSize: 10 }, levelData: {}, onChange() {}
  }));
  assert.match(box.textContent, /Constitution bonus \([+-]\d+\) and extras such as Tough already added in/);
  restoreConsole();
});
