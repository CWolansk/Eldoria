// docs/ is the public site. Nothing under docs/world-sim, docs/tools/world-sim, the
// players' town page (docs/tools/town) or item search may
// name a place or person the players have not found. The hidden names are read from
// the Private notes at test time, so this file does not contain them either.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const docsRoot = fileURLToPath(new URL("../../", import.meta.url));
const repoRoot = path.resolve(docsRoot, "..");
const crestfall = path.join(repoRoot, "Private", "1. World Almanac", "World", "Crestfall");
const SCAN = [path.join(docsRoot, "world-sim"), path.join(docsRoot, "tools", "world-sim"), path.join(docsRoot, "tools", "town"), path.join(docsRoot, "tools", "item-search")];
const SKIP_DIRS = new Set(["node_modules"]);
const SKIP_FILES = new Set(["package-lock.json"]);
// Note titles that are ordinary words for a kind of note, not the name of anything in the world.
const GENERIC_TITLES = new Set(["outline", "overview", "summary", "history", "timeline", "rumours", "rumors", "secrets", "layout"]);

function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, visit);
    } else {
      visit(full, entry.name);
    }
  }
}

/** Names from the Crestfall notes that the public site does not show. */
function hiddenNames() {
  const config = JSON.parse(fs.readFileSync(path.join(docsRoot, "world-pages.config.json"), "utf8"));
  const whitelist = new Set((config.visibility?.whitelist || []).map((entry) => entry.toLowerCase()));
  const publicWords = new Set();
  for (const entry of whitelist) {
    publicWords.add(path.basename(entry, ".md"));
  }
  const names = new Set();
  walk(crestfall, (full, fileName) => {
    if (!fileName.toLowerCase().endsWith(".md")) return;
    const relative = path.relative(path.dirname(crestfall), full).split(path.sep).join("/");
    if (whitelist.has(relative.toLowerCase())) return;
    const name = path.basename(fileName, path.extname(fileName)).trim();
    if (publicWords.has(name.toLowerCase())) return;
    if (GENERIC_TITLES.has(name.toLowerCase())) return;
    // Short single words (a first name, a nickname) could match ordinary text by accident.
    if (name.length >= 7 || /\s/u.test(name)) names.add(name);
  });
  // Hidden towns: a town folder whose own page is not public.
  for (const entry of fs.readdirSync(crestfall, { withFileTypes: true })) {
    if (entry.isDirectory() && !whitelist.has(`crestfall/${entry.name}/${entry.name}.md`.toLowerCase())) {
      names.add(entry.name);
    }
  }
  return [...names];
}

test("no file in the public simulation folders names a hidden place or person", (t) => {
  if (!fs.existsSync(crestfall)) {
    t.skip("Private/ notes are not present here, so the hidden names cannot be read. Run this where the vault is checked out.");
    return;
  }
  const names = hiddenNames();
  assert.ok(names.length >= 3, `expected hidden names from the notes, found ${names.length}`);
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const patterns = names.map((name) => ({ name, pattern: new RegExp(`(^|[^A-Za-z])${escape(name)}([^A-Za-z]|$)`, "iu") }));

  const found = [];
  let scanned = 0;
  for (const dir of SCAN) {
    walk(dir, (full, fileName) => {
      if (SKIP_FILES.has(fileName)) return;
      scanned += 1;
      const text = fs.readFileSync(full, "utf8");
      for (const { name, pattern } of patterns) {
        if (pattern.test(text)) {
          // Report the file and how many characters the name has, not the name itself.
          found.push(`${path.relative(docsRoot, full)} names a hidden entry (${name.length} letters, starts with "${name[0]}")`);
        }
      }
    });
  }
  assert.ok(scanned >= 15, `expected to scan the simulation files, scanned ${scanned}`);
  assert.deepEqual(found, []);
});

test("the DM page ships no world data of its own", () => {
  const page = path.join(docsRoot, "tools", "world-sim");
  for (const fileName of ["index.html", "world-sim.js", "world-sim-economy.js", "world-sim-stage3.js", "world-sim-map.js", "world-sim.css"]) {
    const text = fs.readFileSync(path.join(page, fileName), "utf8");
    assert.doesNotMatch(text, /Private\//u, `${fileName} points into Private/`);
    assert.doesNotMatch(text, /seed\.draft|places\.upload/u, `${fileName} refers to the DM-only seed files`);
  }
  const script = fs.readFileSync(path.join(page, "world-sim.js"), "utf8");
  assert.match(script, /getWorldPlaces\(\)/u, "places come from the API at run time");
});
