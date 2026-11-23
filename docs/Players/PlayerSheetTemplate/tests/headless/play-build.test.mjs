// Pass 3. Item 4: playing kept apart from building. Item 9: recover when the connection
// returns. Item 20: a redraw keeps open sections open.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bootSheetPage } from "./page.mjs";
import { waitFor } from "./dom.mjs";

const statusText = () => document.querySelector("#level-editor-save-status")?.textContent || "";
const upToDate = () => waitFor(() => /Up to date/.test(statusText()), `status was "${statusText()}"`, 400);
const page = () => document.querySelector(".player-sheet-page");
const modeButton = (mode) => document.querySelector(`#player-sheet-mode-switch button[data-sheet-mode="${mode}"]`);

test("the sheet opens in Play, with a Play / Build switch in the page header", async () => {
  const { restoreConsole } = await bootSheetPage();
  await upToDate();
  restoreConsole();
  assert.equal(page().dataset.sheetMode, "play");
  assert.ok(document.querySelector(".player-sheet-page > header #player-sheet-mode-switch"));
  assert.equal(modeButton("play").getAttribute("aria-pressed"), "true");
  assert.equal(modeButton("build").getAttribute("aria-pressed"), "false");
});

test("Build is one tap away and the choice is remembered in this browser", () => {
  modeButton("build").click();
  assert.equal(page().dataset.sheetMode, "build");
  assert.equal(modeButton("build").getAttribute("aria-pressed"), "true");
  assert.equal(window.localStorage.getItem("eldoria:player-sheet:mode"), "build");
  modeButton("play").click();
  assert.equal(page().dataset.sheetMode, "play");
  assert.equal(window.localStorage.getItem("eldoria:player-sheet:mode"), "play");
});

test("adding and removing are marked as building; equipping, attuning and using stay in Play", async () => {
  await window.setTab("Gear");
  const tab = document.querySelector("#TabContent");
  assert.ok(tab.querySelector(".player-sheet-gear-remove").classList.contains("player-sheet-build-only"));
  assert.ok([...tab.querySelectorAll(".player-sheet-tab__header button")].some((node) => node.textContent === "Add Item" && node.classList.contains("player-sheet-build-only")));
  assert.equal(tab.querySelector(".player-sheet-equip-toggle").closest(".player-sheet-build-only"), null);
  assert.equal(document.querySelector("#player-sheet-play-strip").closest(".player-sheet-build-only"), null);
});

test("stylesheet: Play hides the builder and the build-only controls, and gives the sheet the full width", async () => {
  const css = await readFile(new URL("../../../players.css", import.meta.url), "utf8");
  const pass3 = css.slice(css.indexOf("Sheet review, pass 3"));
  assert.match(pass3, /\[data-sheet-mode="play"\] \.player-sheet-container > \.levelEditor,\s*\.player-sheet-page\[data-sheet-mode="play"\] \.player-sheet-build-only \{\s*display: none;/);
  assert.match(pass3, /\[data-sheet-mode="play"\] \.player-sheet-container \{\s*grid-template-columns: minmax\(0, 1fr\);/);
  assert.doesNotMatch(pass3, /\[data-sheet-mode="build"\][^{]*\{[^}]*display: none/, "Build hides nothing");
});

test("a redraw keeps the sections the reader had opened, and the scroll position", async () => {
  const { captureViewState, restoreViewState } = await import("../../PlayerSheetJavaScript/PlayerSheetViewState.js");
  const build = (opened = []) => {
    const box = document.createElement("div");
    box.innerHTML = ["Longsword", "Dagger"].map((name) => `
      <article class="player-sheet-item-row"><h4 class="player-sheet-item-row__title">${name}</h4>
        <details><summary>Rules</summary><p>Text</p></details></article>`).join("") + `
      <details data-gear-group="carried"><summary>Carried</summary></details>`;
    [...box.querySelectorAll("details")].forEach((node, index) => { node.open = opened.includes(index); });
    return box;
  };
  const scrolled = [];
  const view = { scrollX: 0, scrollY: 640, scrollTo: (x, y) => scrolled.push([x, y]) };

  const before = build([1]); // only the Dagger's rules are open
  const state = captureViewState(before, view);
  const after = build([]); // the redraw closes everything
  restoreViewState(after, state, view);
  assert.deepEqual([...after.querySelectorAll("details")].map((node) => node.open), [false, true, false], "the same row's section is open again, not its neighbour's");
  assert.deepEqual(scrolled, [[0, 640]]);

  restoreViewState(build([]), null, view);
  assert.equal(captureViewState(null), null);
});

test("the open tab is redrawn through that helper, and a different tab starts fresh", async () => {
  const source = await readFile(new URL("../../PlayerSheet.js", import.meta.url), "utf8");
  assert.ok(source.includes("tabName === lastRenderedTabName ? captureViewState("));
  assert.ok(source.includes('restoreViewState(document.querySelector("#TabContent"), viewState)'));
});

test("the remembered mode is used on the next visit", async () => {
  window.localStorage.setItem("eldoria:player-sheet:mode", "build");
  const { restoreConsole } = await bootSheetPage({ keepStorage: window.localStorage });
  await upToDate();
  restoreConsole();
  assert.equal(page().dataset.sheetMode, "build");
});

test("when the sheet cannot be loaded, it loads by itself once the connection is back", async () => {
  const { server, restoreConsole } = await bootSheetPage({ failCharacterGet: true });
  await waitFor(() => /Unable to load character sheet|Could not reach the server/.test(statusText()), `status was "${statusText()}"`, 400);
  assert.equal(server.gets, 0, "the server was not reached");

  server.failGets = false;
  window.dispatchEvent(new window.Event("online"));
  await upToDate();
  assert.ok(document.querySelector("#player-sheet-play-strip"), "the sheet is shown without reloading the page");
  assert.equal(server.saves.length, 0);
  restoreConsole();
});
