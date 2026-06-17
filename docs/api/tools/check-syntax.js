"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const apiRoot = path.resolve(__dirname, "..");
const roots = [
  "src",
  "seed",
  "tools",
  "apiClient"
];

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".deploy") {
        return [];
      }
      return walk(fullPath);
    }

    return /\.(?:cjs|mjs|js)$/u.test(entry.name) ? [fullPath] : [];
  });
}

const files = roots.flatMap((root) => walk(path.join(apiRoot, root)));
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);
