// Shared test stand-ins: in-memory storage, a world service on top of it, and a
// bridge that lets a page's fetch() reach the real route handlers.
import { createRequire } from "node:module";
import * as engine from "../engine/index.js";

const require = createRequire(import.meta.url);
const { createWorldStore } = require("../../api/src/worldStore.js");
const { createWorldService } = require("../../api/src/worldService.js");
const { createWorldHandlers, WORLD_ROUTES } = require("../../api/src/worldRoutes.js");
const { dmSessionHandler } = require("../../api/src/characters.js");

export const DM_KEY = "test-dm-key-not-a-real-secret";
export { engine, WORLD_ROUTES };

export function fakeTable() {
  const rows = new Map();
  return {
    rows,
    async createEntity(entity) {
      const key = `${entity.partitionKey}|${entity.rowKey}`;
      if (rows.has(key)) {
        throw Object.assign(new Error("EntityAlreadyExists"), { statusCode: 409 });
      }
      rows.set(key, structuredClone(entity));
    },
    async listEntities({ partitionKey, fromRowKey, toRowKey }) {
      return [...rows.values()]
        .filter((row) => row.partitionKey === partitionKey && row.rowKey >= fromRowKey && row.rowKey <= toRowKey)
        .map((row) => structuredClone(row));
    }
  };
}

export function fakeBlobs() {
  const blobs = new Map();
  let counter = 0;
  return {
    blobs,
    async read(name) {
      const blob = blobs.get(name);
      return blob ? { document: structuredClone(blob.document), etag: blob.etag } : null;
    },
    async write(name, document, { ifMatch, ifNoneMatch } = {}) {
      const existing = blobs.get(name);
      if (ifNoneMatch === "*" && existing) {
        throw Object.assign(new Error("BlobAlreadyExists"), { statusCode: 409 });
      }
      if (ifMatch && (!existing || existing.etag !== ifMatch)) {
        throw Object.assign(new Error("ConditionNotMet"), { statusCode: 412 });
      }
      counter += 1;
      const etag = `"etag-${counter}"`;
      blobs.set(name, { document: structuredClone(document), etag });
      return { etag };
    }
  };
}

/** A world service on in-memory storage, with predictable ids and clock. */
export function makeWorld() {
  const table = fakeTable();
  const blobs = fakeBlobs();
  let ids = 0;
  const store = createWorldStore({
    tableClient: table,
    blobClient: blobs,
    now: () => "2026-11-23T00:00:00.000Z",
    newId: () => `commit-${(ids += 1)}`
  });
  let serviceIds = 0;
  const service = createWorldService({
    store,
    engine,
    now: () => "2026-11-23T00:00:00.000Z",
    newId: () => `id${String((serviceIds += 1)).padStart(4, "0")}`
  });
  const handlers = createWorldHandlers(async () => service);
  return { table, blobs, store, service, handlers };
}

/** A minimal Azure Functions style request. */
export function makeRequest(method, path, { key, body, params = {}, query = {} } = {}) {
  const headers = new Map();
  if (key !== undefined) headers.set("x-eldoria-dm-key", key);
  return {
    method,
    url: `https://api.test/api/${path}`,
    params,
    headers: { get: (name) => headers.get(String(name).toLowerCase()) ?? null },
    query: new URLSearchParams(query),
    text: async () => (body === undefined ? "" : JSON.stringify(body))
  };
}

export const quietContext = { error() {}, log() {} };

function matchRoute(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  for (const entry of WORLD_ROUTES) {
    const pattern = entry.route.split("/");
    if (pattern.length !== parts.length) continue;
    const params = {};
    const ok = pattern.every((piece, index) => {
      if (piece.startsWith("{")) {
        params[piece.slice(1, -1)] = decodeURIComponent(parts[index]);
        return true;
      }
      return piece === parts[index];
    });
    if (ok) return { entry, params };
  }
  return null;
}

/**
 * fetch() that serves the world routes (and dm/session) from the real handlers.
 * Anything else is recorded and answered 404, so a test can assert on it.
 */
export function createApiFetch(world, { baseUrl = "https://api.test/api" } = {}) {
  const calls = [];
  async function apiFetch(input, init = {}) {
    const url = new URL(String(input?.url || input));
    const method = String(init.method || "GET").toUpperCase();
    calls.push({ method, url: url.href });
    const headers = new Map(Object.entries(init.headers || {}).map(([name, value]) => [name.toLowerCase(), value]));
    const basePath = new URL(baseUrl).pathname.replace(/\/+$/u, "");
    const pathname = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : url.pathname;
    const request = {
      method,
      url: url.href,
      params: {},
      headers: { get: (name) => headers.get(String(name).toLowerCase()) ?? null },
      query: url.searchParams,
      text: async () => (init.body == null ? "" : String(init.body))
    };
    let response;
    if (pathname.replace(/^\/+/u, "") === "dm/session") {
      response = await dmSessionHandler(request, quietContext);
    } else {
      const match = matchRoute(pathname);
      if (!match) {
        return new Response(JSON.stringify({ error: "Not found in test bridge." }), {
          status: 404, headers: { "content-type": "application/json" }
        });
      }
      request.params = match.params;
      response = await world.handlers[match.entry.handler](request, quietContext);
    }
    return new Response(response.status === 204 ? null : response.body, {
      status: response.status,
      headers: { "content-type": "application/json" }
    });
  }
  apiFetch.calls = calls;
  return apiFetch;
}

export function withDmKey(value, run) {
  return async (t) => {
    const before = process.env.ELDORIA_DM_KEY;
    if (value === undefined) delete process.env.ELDORIA_DM_KEY;
    else process.env.ELDORIA_DM_KEY = value;
    try {
      await run(t);
    } finally {
      if (before === undefined) delete process.env.ELDORIA_DM_KEY;
      else process.env.ELDORIA_DM_KEY = before;
    }
  };
}
