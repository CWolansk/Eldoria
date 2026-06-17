"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { httpError, json, withErrors } = require("./http");

const INDEXES = {
  locations: "location-index.json",
  location: "location-index.json",
  npcs: "npc-index.json",
  npc: "npc-index.json"
};

function getIndexFile(kind) {
  const file = INDEXES[String(kind || "").trim().toLowerCase()];
  if (!file) {
    throw httpError(400, "Unknown public index kind.", {
      available: ["locations", "npcs"]
    });
  }
  return file;
}

function getIndexDirs() {
  return [
    process.env.ELDORIA_PUBLIC_INDEX_DIR,
    path.resolve(__dirname, "../public-indexes"),
    path.resolve(__dirname, "../../data")
  ].filter(Boolean);
}

async function readPublicIndex(kind) {
  const file = getIndexFile(kind);
  const errors = [];

  for (const dir of getIndexDirs()) {
    const fullPath = path.join(dir, file);
    try {
      return JSON.parse(await fs.readFile(fullPath, "utf8"));
    } catch (error) {
      errors.push(`${fullPath}: ${error.message}`);
    }
  }

  throw httpError(404, "Public index not found.", {
    file,
    errors
  });
}

async function publicIndexHandler(request, context) {
  return withErrors(request, context, async () => {
    return json(request, 200, await readPublicIndex(request.params?.kind));
  });
}

module.exports = {
  publicIndexHandler,
  readPublicIndex
};
