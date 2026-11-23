// Items 18 (title), 13 part (Pets hidden, tab remembered), 17 part (level rows), 19/12 (CSS guards).
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installDom } from "./dom.mjs";

// A remembered tab from an earlier visit must be honoured on load.
installDom();
window.localStorage.setItem("eldoria:player-sheet:open-tab:test-character", "Gear");
const stored = window.localStorage;
const { bootSheetPage } = await import("./page.mjs");
const { server, status, restoreConsole } = await bootSheetPage({ keepStorage: stored });
const { waitFor } = await import("./dom.mjs");

const tabButton = (name) => document.querySelector(`#TabRowList button[data-tab="${name}"]`);
const activeTab = () => document.querySelector("#TabRowList .player-sheet-tab-button--active")?.dataset.tab;

test("the page title carries the character's name", async () => {
  await waitFor(() => /Test Hero/.test(document.title), `title was "${document.title}"`, 200);
  assert.equal(document.title, "Test Hero | Player Sheet | Eldoria Player Wiki");
});

test("the empty Pets tab is hidden and cannot be opened", async () => {
  assert.equal(tabButton("Pets").hidden, true);
  for (const name of ["Offense", "Defense", "Gear", "Skills", "Spells", "Feats", "Notes", "Reference"]) {
    assert.equal(tabButton(name).hidden, false, `${name} stays visible`);
  }
  await window.setTab("Pets");
  assert.equal(activeTab(), "Offense", "asking for Pets falls back to Offense");
});

test("the open tab is remembered for the next load", async () => {
  await window.setTab("Spells");
  assert.equal(activeTab(), "Spells");
  assert.equal(window.localStorage.getItem("eldoria:player-sheet:open-tab:test-character"), "Spells");
  await window.setTab("Offense");
});

test("tab buttons are real buttons that do not submit forms", () => {
  for (const button of document.querySelectorAll("#TabRowList button")) {
    assert.equal(button.getAttribute("type"), "button");
  }
});

test("the level editor lists levels up to the next one, with a way to show the rest", async () => {
  const item = (level) => document.querySelector(`#level-editor-level-${level}-item`);
  const toggle = () => document.querySelector("#level-editor-show-all-levels");
  await waitFor(() => toggle(), "show-all toggle should exist", 200);
  const shown = [...document.querySelectorAll(".level-editor__list-item--level")].filter((node) => !node.hidden).length;
  assert.ok(shown >= 2 && shown < 20, `expected a short list, got ${shown}`);
  assert.equal(item(1).hidden, false);
  assert.equal(item(20).hidden, true);
  assert.equal(item(shown).hidden, false);
  assert.equal(item(shown + 1).hidden, true);

  toggle().click();
  assert.equal(item(20).hidden, false, "all levels can still be reached");
  toggle().click();
  assert.equal(item(20).hidden, true);
});

test("loading and switching tabs never saves", async () => {
  await waitFor(() => /Up to date/.test(status().textContent), `status was "${status().textContent}"`, 400);
  assert.equal(server.saves.length, 0);
});

test("stylesheet guards: wrap rule for ability boxes, light theme values, tap target size", async () => {
  const css = await readFile(new URL("../../../players.css", import.meta.url), "utf8");
  const pass1 = css.slice(css.indexOf("Sheet review, pass 1"));
  assert.ok(pass1.length > 1000, "pass 1 block exists at the end of players.css");
  assert.match(pass1, /\.FooterInfo > \.AbilityScoresSummary \{[^}]*grid-column: 1 \/ -1;[^}]*auto-fit/s);
  assert.match(pass1, /:root\[data-theme="light"\] \.player-sheet-page \{[^}]*--sheet-text: #172033;/s);
  assert.match(pass1, /--sheet-panel-strong:/, "spell slot tiles get a defined background");
  assert.match(pass1, /min-height: 2\.75rem/);
  // Every --sheet variable the dark theme defines also has a light value.
  const dark = css.match(/\/\* V2 visual polish pass \*\/\s*\.player-sheet-page \{([^}]*)\}/s)[1];
  const light = pass1.match(/:root\[data-theme="light"\] \.player-sheet-page \{([^}]*)\}/s)[1];
  for (const name of dark.match(/--sheet-[a-z0-9-]+(?=:)/g)) {
    assert.ok(light.includes(`${name}:`), `${name} needs a light value`);
  }
  restoreConsole();
});
