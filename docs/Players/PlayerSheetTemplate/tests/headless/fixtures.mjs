// One source of fixtures: the browser suite's own DTO and fake API builders.
// Importing that file runs the browser suite once inside jsdom, which is harmless.
import { installDom, trapFetch } from "./dom.mjs";

export async function loadSheetFixtures(options = {}) {
  const carried = options.keepStorage
    ? Object.fromEntries(Array.from({ length: options.keepStorage.length }, (_, i) => options.keepStorage.key(i)).map((key) => [key, options.keepStorage.getItem(key)]))
    : {};
  installDom(`<!DOCTYPE html><html><head><title>Player Sheet | Eldoria Player Wiki</title></head><body>
    <p id="test-summary"></p><div id="test-results"></div><div id="test-fixture"></div>
    <div id="work"></div>
  </body></html>`);
  for (const [key, value] of Object.entries(carried)) {
    window.localStorage.setItem(key, value);
  }
  const fetchCalls = trapFetch();
  const originalWarn = console.warn;
  console.warn = () => {};
  const legacy = await import("../player-sheet-tests.js");
  console.warn = originalWarn;
  document.querySelector("#test-fixture").remove();
  document.querySelectorAll("dialog, .player-sheet__modal").forEach((node) => node.remove());
  const work = document.querySelector("#work");
  return {
    createDto: legacy.createDto,
    createRangerDto: legacy.createRangerDto,
    createFakeApi: legacy.createFakeApi,
    fetchCalls,
    work,
    mountTab() {
      work.innerHTML = `<div id="TabContent"></div>`;
      return work.querySelector("#TabContent");
    }
  };
}
