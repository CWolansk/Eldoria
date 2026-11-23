"use strict";

// DM lock for routes that only the DM should use.
//
// The key is a shared secret held in the Function App setting ELDORIA_DM_KEY and
// sent by DM tools in the x-eldoria-dm-key header. It never lives in the site's
// files. Player sheet routes (read and save a character) do not use this lock.
//
// If the setting is missing, locked routes refuse every request: a deployment
// that forgot the key is closed, not open.

const crypto = require("node:crypto");
const { httpError } = require("./http");

const DM_KEY_HEADER = "x-eldoria-dm-key";
const DM_KEY_SETTING = "ELDORIA_DM_KEY";

function getConfiguredDmKey() {
  return String(process.env[DM_KEY_SETTING] || "").trim();
}

function isDmLockConfigured() {
  return getConfiguredDmKey().length > 0;
}

function readHeader(request, name) {
  const headers = request?.headers;
  if (typeof headers?.get === "function") {
    return String(headers.get(name) || "");
  }
  if (headers && typeof headers === "object") {
    const match = Object.keys(headers).find((key) => key.toLowerCase() === name);
    return match ? String(headers[match] || "") : "";
  }
  return "";
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest();
}

// Compared as fixed-length digests so timing does not reveal the key or its length.
function keysMatch(provided, expected) {
  return crypto.timingSafeEqual(digest(provided), digest(expected));
}

function hasValidDmKey(request) {
  const expected = getConfiguredDmKey();
  const provided = readHeader(request, DM_KEY_HEADER).trim();
  return Boolean(expected) && Boolean(provided) && keysMatch(provided, expected);
}

function requireDmKey(request) {
  if (!isDmLockConfigured()) {
    throw httpError(403, "This action is locked. The DM key has not been set on the server.");
  }

  const provided = readHeader(request, DM_KEY_HEADER).trim();
  if (!provided) {
    throw httpError(401, "This action needs the DM key.");
  }

  if (!keysMatch(provided, getConfiguredDmKey())) {
    throw httpError(401, "The DM key is not correct.");
  }
}

module.exports = {
  DM_KEY_HEADER,
  DM_KEY_SETTING,
  hasValidDmKey,
  isDmLockConfigured,
  requireDmKey
};
