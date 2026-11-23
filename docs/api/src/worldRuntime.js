"use strict";

// Loads the same living-world engine the browser uses (docs/world-sim/engine).
// Same approach as sheetRuntime.js: prefer the copy staged beside the deployed
// function, fall back to the source tree when running locally.
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let engine;

function getWorldEngine() {
  const deployed = path.join(__dirname, "world-runtime/world-sim/engine/index.js");
  const source = fs.existsSync(deployed)
    ? deployed
    : path.resolve(__dirname, "../../world-sim/engine/index.js");
  engine ||= import(pathToFileURL(source).href);
  return engine;
}

module.exports = { getWorldEngine };
