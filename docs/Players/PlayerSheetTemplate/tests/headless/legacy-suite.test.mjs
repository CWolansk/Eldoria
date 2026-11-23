// Runs the existing browser suite (tests/player-sheet-tests.js) under jsdom so the
// 60+ feature checks it holds become part of `node --test`.
import test from "node:test";
import assert from "node:assert/strict";
import { installDom, trapFetch } from "./dom.mjs";

test("existing browser suite passes headless", async (t) => {
  installDom(`<!DOCTYPE html><html><body>
    <p id="test-summary">Running...</p><div id="test-results"></div><div id="test-fixture"></div>
  </body></html>`);
  trapFetch();
  await import("../player-sheet-tests.js");
  const rows = [...document.querySelectorAll("#test-results .test-result")];
  assert.ok(rows.length > 50, `expected the browser suite to report its tests, got ${rows.length}`);
  for (const row of rows) {
    const label = row.firstChild?.textContent || "";
    await t.test(label.replace(/^(PASS|FAIL): /u, ""), () => {
      assert.equal(row.dataset.status, "pass", row.querySelector("pre")?.textContent || label);
    });
  }
});
