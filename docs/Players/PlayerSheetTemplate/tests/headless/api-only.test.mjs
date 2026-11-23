// Catalog data comes from the API only: the sheet code never fetches a local file.
import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "tests") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await sourceFiles(full));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

test("no sheet source file calls fetch or points at a local .json file", async () => {
  const files = await sourceFiles(root);
  assert.ok(files.length > 40, `expected the sheet sources, found ${files.length}`);
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const name = path.relative(root, file);
    assert.doesNotMatch(text, /\bfetch\s*\(/u, `${name} calls fetch directly; use the API client`);
    assert.doesNotMatch(text, /new URL\([^)]*\.json/u, `${name} builds a URL to a local .json file`);
    assert.doesNotMatch(text, /["'`][^"'`\n]*\/(?:data|5etools)\/[^"'`\n]*\.json["'`]/u, `${name} references a local data file`);
  }
});

test("booting the whole page asks only the API for data", async () => {
  const { bootSheetPage } = await import("./page.mjs");
  const requested = [];
  const { status, restoreConsole } = await bootSheetPage({
    onRequest: (url) => requested.push(url)
  });
  const { waitFor } = await import("./dom.mjs");
  await waitFor(() => /Up to date/.test(status()?.textContent || ""), "page should finish loading", 400);
  restoreConsole();
  assert.ok(requested.length > 0, "the page made requests");
  for (const url of requested) {
    assert.match(url, /^https:\/\/[^/]+\/api\//u, `unexpected request: ${url}`);
    assert.doesNotMatch(url, /\.json(?:$|\?)/u, `local file request: ${url}`);
  }
});
