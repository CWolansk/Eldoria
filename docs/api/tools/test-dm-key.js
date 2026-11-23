"use strict";

// DM lock: which routes need the key, and that player sheet routes never do.
// Run with: npm run test:dm-key

const test = require("node:test");
const assert = require("node:assert/strict");

const KEY = "test-dm-key-not-a-real-secret";

// No storage is configured here on purpose. A locked route must refuse before it
// reaches storage; an open route gets past the lock and only then fails on storage.
delete process.env.ELDORIA_STORAGE_CONNECTION_STRING;
delete process.env.AzureWebJobsStorage;
delete process.env.ELDORIA_STORAGE_ACCOUNT;
delete process.env.STORAGE_ACCOUNT;

const { DM_KEY_HEADER, hasValidDmKey, isDmLockConfigured, requireDmKey } = require("../src/dmAuth");
const { characterSheetHandler, dmSessionHandler, healthHandler, playersManifestHandler } = require("../src/characters");
const { catalogEntityHandler, catalogListHandler } = require("../src/catalog");
const { dmCharacterActionHandler } = require("../src/dmDashboard");

function request(method, path, { key, body, params = {} } = {}) {
  const headers = new Map();
  if (key !== undefined) headers.set(DM_KEY_HEADER, key);
  return {
    method,
    url: `https://api.test/api/${path}`,
    params,
    headers: { get: (name) => headers.get(String(name).toLowerCase()) ?? null },
    query: new URLSearchParams(),
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
    json: async () => body
  };
}

const context = { error() {}, log() {} };
const bodyOf = (response) => JSON.parse(response.body || "{}");

function withKey(value, run) {
  return async () => {
    const before = process.env.ELDORIA_DM_KEY;
    if (value === undefined) delete process.env.ELDORIA_DM_KEY;
    else process.env.ELDORIA_DM_KEY = value;
    try {
      await run();
    } finally {
      if (before === undefined) delete process.env.ELDORIA_DM_KEY;
      else process.env.ELDORIA_DM_KEY = before;
    }
  };
}

test("requireDmKey accepts the right key and nothing else", withKey(KEY, () => {
  assert.equal(isDmLockConfigured(), true);
  assert.doesNotThrow(() => requireDmKey(request("GET", "dm/session", { key: KEY })));
  assert.doesNotThrow(() => requireDmKey(request("GET", "dm/session", { key: `  ${KEY}  ` })), "surrounding spaces are ignored");
  assert.throws(() => requireDmKey(request("GET", "dm/session")), (error) => error.statusCode === 401);
  assert.throws(() => requireDmKey(request("GET", "dm/session", { key: "" })), (error) => error.statusCode === 401);
  assert.throws(() => requireDmKey(request("GET", "dm/session", { key: `${KEY}x` })), (error) => error.statusCode === 401);
  assert.throws(() => requireDmKey(request("GET", "dm/session", { key: KEY.slice(0, -1) })), (error) => error.statusCode === 401);
  assert.equal(hasValidDmKey(request("GET", "dm/session", { key: KEY })), true);
  assert.equal(hasValidDmKey(request("GET", "dm/session", { key: "wrong" })), false);
}));

test("with no key set on the server, locked routes are closed to everyone", withKey(undefined, async () => {
  assert.equal(isDmLockConfigured(), false);
  assert.throws(() => requireDmKey(request("GET", "dm/session", { key: KEY })), (error) => error.statusCode === 403);
  assert.throws(() => requireDmKey(request("GET", "dm/session", { key: "" })), (error) => error.statusCode === 403);
  const response = await dmSessionHandler(request("GET", "dm/session", { key: "anything" }), context);
  assert.equal(response.status, 403);
}));

test("error messages never echo the key", withKey(KEY, async () => {
  const response = await dmSessionHandler(request("GET", "dm/session", { key: "guess-123" }), context);
  assert.equal(response.status, 401);
  assert.doesNotMatch(response.body, new RegExp(KEY));
  assert.doesNotMatch(response.body, /guess-123/);
}));

test("dm/session answers ok only with the key", withKey(KEY, async () => {
  assert.equal((await dmSessionHandler(request("GET", "dm/session"), context)).status, 401);
  const ok = await dmSessionHandler(request("GET", "dm/session", { key: KEY }), context);
  assert.equal(ok.status, 200);
  assert.deepEqual(bodyOf(ok), { ok: true });
}));

test("health reports whether the lock is set, without the key", withKey(KEY, async () => {
  const response = await healthHandler(request("GET", "health"), context);
  assert.equal(bodyOf(response).dmLock, "set");
  assert.doesNotMatch(response.body, new RegExp(KEY));
}));

const lockedCalls = [
  ["create or replace a catalog entry", () => catalogListHandler(request("POST", "catalog/items", { params: { kind: "items" }, body: { name: "X" } }), context)],
  ["patch a catalog entry", () => catalogEntityHandler(request("PATCH", "catalog/items/x", { params: { kind: "items", id: "x" }, body: {} }), context)],
  ["replace the players list", () => playersManifestHandler(request("PUT", "players", { body: {} }), context)],
  ["delete a character", () => characterSheetHandler(request("DELETE", "characters/char-test-001", { params: { id: "char-test-001" } }), context)]
];

for (const [label, call] of lockedCalls) {
  test(`locked without the key: ${label}`, withKey(KEY, async () => {
    const response = await call();
    assert.equal(response.status, 401, `${label} should need the DM key`);
  }));
}

const openCalls = [
  ["read a character", () => characterSheetHandler(request("GET", "characters/char-test-001", { params: { id: "char-test-001" } }), context)],
  ["save a character (POST)", () => characterSheetHandler(request("POST", "characters/char-test-001", { params: { id: "char-test-001" }, body: { schemaVersion: "player-sheet-v2", id: "char-test-001" } }), context)],
  ["save a character (PUT)", () => characterSheetHandler(request("PUT", "characters/char-test-001", { params: { id: "char-test-001" }, body: { schemaVersion: "player-sheet-v2", id: "char-test-001" } }), context)],
  ["read the players list", () => playersManifestHandler(request("GET", "players"), context)],
  ["read the catalog", () => catalogListHandler(request("GET", "catalog/items", { params: { kind: "items" } }), context)],
  ["hit points and conditions action", () => dmCharacterActionHandler(request("POST", "dm/characters/char-test-001/actions", { params: { id: "char-test-001" }, body: { type: "damage", amount: 1 } }), context)]
];

for (const [label, call] of openCalls) {
  test(`players are not locked out: ${label}`, withKey(KEY, async () => {
    const response = await call();
    assert.notEqual(response.status, 401, `${label} must not ask for the DM key`);
    assert.notEqual(response.status, 403, `${label} must not be locked`);
  }));
}

test("the browser is allowed to send the DM key header", () => {
  const { options } = require("../src/http");
  const response = options({ method: "OPTIONS", url: "https://api.test/api/dm/session", headers: { get: () => null } });
  assert.match(response.headers["Access-Control-Allow-Headers"], /x-eldoria-dm-key/);
});
