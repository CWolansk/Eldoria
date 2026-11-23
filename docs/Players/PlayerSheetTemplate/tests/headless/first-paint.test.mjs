// Item 18: one main region, tabs that work before the script loads, and the theme button.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { bootSheetPage } from "./page.mjs";
import { waitFor } from "./dom.mjs";

const html = await readFile(new URL("../../PlayerSheet.html", import.meta.url), "utf8");

test("the page has one main region, with the sheet as a labelled region inside it", () => {
  assert.equal((html.match(/<main\b/gu) || []).length, 1);
  assert.match(html, /<div class="playerSheet" id="player-sheet" role="region" aria-label="Character sheet">/u);
});

test("the inline tab stub is defined before the sheet module loads", () => {
  const stub = html.indexOf("window.setTab = function");
  const moduleTag = html.indexOf('<script type="module"');
  assert.ok(stub > 0 && stub < moduleTag, "stub comes first");
  assert.equal((html.match(/<button type="button" data-tab="/gu) || []).length, 9);
});

test("a tab tapped before the script loaded is opened once it has", async () => {
  const { restoreConsole } = await bootSheetPage({
    beforeImport: () => window.setTab("Skills")
  });
  const active = () => document.querySelector("#TabRowList .player-sheet-tab-button--active")?.dataset.tab;
  await waitFor(() => active() === "Skills", `active tab was ${active()}`, 400);
  assert.equal(window.__eldoriaPendingTab, undefined);
  restoreConsole();
});

test("the theme button shows a sun in dark theme and a moon in light, with a clear label", async () => {
  const shell = await readFile(new URL("../../../../site-shell.js", import.meta.url), "utf8");
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="site-nav" data-base-path="../../" data-current="players"></div></body></html>`, {
    url: "https://eldoria.test/Players/PlayerSheetTemplate/PlayerSheet.html",
    runScripts: "outside-only"
  });
  dom.window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  dom.window.eval(shell);
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  const button = dom.window.document.querySelector(".nav-theme-toggle");
  assert.ok(button, "theme button is rendered");
  const theme = () => dom.window.document.documentElement.dataset.theme;
  const before = theme();
  assert.equal(button.dataset.themeIcon, before === "dark" ? "sun" : "moon");
  assert.equal(button.getAttribute("aria-label"), before === "dark" ? "Switch to light theme" : "Switch to dark theme");
  assert.doesNotMatch(button.textContent, /Aa/u);

  button.click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.notEqual(theme(), before, "pressing it switches theme");
  assert.equal(button.dataset.themeIcon, theme() === "dark" ? "sun" : "moon");
  dom.window.close();
});
