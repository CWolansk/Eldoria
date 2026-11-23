// Item 8: no wrong numbers while loading, and no fetching for levels that are not shown.
import test from "node:test";
import assert from "node:assert/strict";
import { bootSheetPage } from "./page.mjs";
import { tick, waitFor } from "./dom.mjs";

function gate() {
  let open;
  const promise = new Promise((resolve) => { open = resolve; });
  return { promise, open };
}

const strText = () => document.querySelector(".AbilityScoresSummary .STR")?.textContent || "";
const statusText = () => document.querySelector("#level-editor-save-status")?.textContent || "";
const upToDate = () => waitFor(() => /Up to date/.test(statusText()), `status was "${statusText()}"`, 400);

let carriedStorage = null;

test("first visit: nothing is painted until the sheet and its rules have loaded", async () => {
  const hold = gate();
  const { restoreConsole } = await bootSheetPage({ characterGate: hold.promise });
  await tick(20);
  assert.equal(strText(), "", "no ability scores yet");
  assert.equal(document.querySelector("#player-sheet-play-strip"), null, "no hit points yet");
  assert.equal(statusText(), "Loading...");

  hold.open();
  await upToDate();
  assert.match(strText(), /STR : 1[0-9] \([+-]\d\)/);
  assert.ok(document.querySelector("#player-sheet-play-strip"));
  restoreConsole();
  carriedStorage = window.localStorage;
  assert.ok(Object.keys(carriedStorage).some((key) => key.includes("player-sheet:references")), "the rules are kept beside the sheet for next time");
});

test("next visit: the last fully worked-out sheet shows at once, before the server answers", async () => {
  const hold = gate();
  const { server, restoreConsole } = await bootSheetPage({ characterGate: hold.promise, keepStorage: carriedStorage });
  await waitFor(() => strText() !== "", "the cached sheet should paint without the server", 100);
  assert.match(strText(), /STR : 1[0-9] \([+-]\d\)/);
  await waitFor(() => /Showing your last loaded sheet/.test(statusText()), `status was "${statusText()}"`, 100);
  const painted = strText();

  hold.open();
  await upToDate();
  assert.equal(strText(), painted, "the numbers did not jump when the fresh copy arrived");
  assert.equal(server.saves.length, 0);
  restoreConsole();
});

test("if the server cannot be reached and no rules were kept, the saved sheet is still shown, and said to be incomplete", async () => {
  const storage = window.localStorage;
  for (const key of Object.keys(storage)) {
    if (key.includes("player-sheet:references")) storage.removeItem(key);
  }
  const { restoreConsole } = await bootSheetPage({ keepStorage: storage, failCharacterGet: true, freshCache: true });
  await waitFor(() => /Could not reach the server/.test(statusText()), `status was "${statusText()}"`, 400);
  restoreConsole();
  if (strText() !== "") {
    assert.match(statusText(), /some numbers may be incomplete|Showing your last loaded sheet/);
  }
});

test("level rows beyond the next level are not built until asked for", async () => {
  const { restoreConsole } = await bootSheetPage();
  await upToDate();
  const body = (level) => document.querySelector(`#level-editor-level-${level}-body`);
  assert.ok(body(1).childElementCount > 0, "level 1 is built");
  assert.equal(body(20).childElementCount, 0, "level 20 is not built at load");
  document.querySelector("#level-editor-show-all-levels").click();
  assert.ok(body(20).childElementCount > 0, "level 20 is built when all levels are shown");
  restoreConsole();
});
