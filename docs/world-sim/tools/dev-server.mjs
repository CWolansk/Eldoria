// Try the Living World page on your own machine, with nothing deployed and nothing saved.
//
//   node docs/world-sim/tools/dev-server.mjs [port] [setup file]
//
// It serves docs/ and answers /api/world/* and /api/dm/session with the real route
// handlers on in-memory storage: everything is forgotten when it stops, and it never
// touches Azure. Other /api/ calls are passed to nothing (404), so the rest of the
// site is not usable through it. The DM key is "dev" unless ELDORIA_DM_KEY is set.
// If a setup file is given (for example your Private places.upload.json) it is loaded
// at start, so the markets are there as soon as you press "Start the world".
//
// Needs `npm ci` in docs/api once (the handlers load the API's dependencies).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as engine from "../engine/index.js";

const require = createRequire(import.meta.url);
const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.argv[2]) || 8090;
const setupFile = process.argv[3];
process.env.ELDORIA_DM_KEY ||= "dev";

const { createWorldStore } = require("../../api/src/worldStore.js");
const { createWorldService } = require("../../api/src/worldService.js");
const { createWorldHandlers, WORLD_ROUTES, WORLD_PUBLIC_ROUTES } = require("../../api/src/worldRoutes.js");
const { dmSessionHandler } = require("../../api/src/characters.js");

function memoryTable() {
  const rows = new Map();
  return {
    async createEntity(entity) {
      const key = `${entity.partitionKey}|${entity.rowKey}`;
      if (rows.has(key)) throw Object.assign(new Error("EntityAlreadyExists"), { statusCode: 409 });
      rows.set(key, structuredClone(entity));
    },
    async listEntities({ partitionKey, fromRowKey, toRowKey }) {
      return [...rows.values()].filter((row) => row.partitionKey === partitionKey && row.rowKey >= fromRowKey && row.rowKey <= toRowKey).map((row) => structuredClone(row));
    }
  };
}

function memoryBlobs() {
  const blobs = new Map();
  let counter = 0;
  return {
    async read(name) {
      const blob = blobs.get(name);
      return blob ? { document: structuredClone(blob.document), etag: blob.etag } : null;
    },
    async write(name, document, { ifMatch, ifNoneMatch } = {}) {
      const existing = blobs.get(name);
      if (ifNoneMatch === "*" && existing) throw Object.assign(new Error("BlobAlreadyExists"), { statusCode: 409 });
      if (ifMatch && (!existing || existing.etag !== ifMatch)) throw Object.assign(new Error("ConditionNotMet"), { statusCode: 412 });
      counter += 1;
      const etag = `"dev-${counter}"`;
      blobs.set(name, { document: structuredClone(document), etag });
      return { etag };
    }
  };
}

const service = createWorldService({ store: createWorldStore({ tableClient: memoryTable(), blobClient: memoryBlobs() }), engine });
const handlers = createWorldHandlers(async () => service);
if (setupFile) {
  await service.putPlaces(JSON.parse(fs.readFileSync(path.resolve(setupFile), "utf8")));
  console.log(`Loaded the setup from ${setupFile}`);
}

function matchRoute(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  for (const entry of [...WORLD_ROUTES, ...WORLD_PUBLIC_ROUTES]) {
    const pattern = entry.route.split("/");
    if (pattern.length !== parts.length) continue;
    const params = {};
    if (pattern.every((piece, index) => (piece.startsWith("{") ? ((params[piece.slice(1, -1)] = decodeURIComponent(parts[index])), true) : piece === parts[index]))) {
      return { entry, params };
    }
  }
  return null;
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };

http.createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url, `http://${incoming.headers.host}`);
  try {
    // docs/api also holds static files the site loads (the API client), so only the
    // world routes and the key check are answered here.
    if (url.pathname.startsWith("/api/world") || url.pathname === "/api/dm/session") {
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const pathname = url.pathname.slice("/api/".length);
      const request = {
        method: incoming.method,
        url: url.href,
        params: {},
        headers: { get: (name) => incoming.headers[String(name).toLowerCase()] ?? null },
        query: url.searchParams,
        text: async () => Buffer.concat(chunks).toString("utf8")
      };
      let response;
      if (pathname === "dm/session") {
        response = await dmSessionHandler(request, console);
      } else {
        const match = matchRoute(pathname);
        if (!match) {
          outgoing.writeHead(404, { "content-type": "application/json" }).end('{"error":"Not served by the local world server."}');
          return;
        }
        request.params = match.params;
        response = await handlers[match.entry.handler](request, console);
      }
      outgoing.writeHead(response.status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }).end(response.body || "");
      return;
    }

    let file = path.join(docsRoot, decodeURIComponent(url.pathname));
    if (!file.startsWith(docsRoot)) {
      outgoing.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      outgoing.writeHead(404).end("Not found");
      return;
    }
    let body = fs.readFileSync(file);
    if (url.pathname.endsWith("/site-assets/site-config.js")) {
      // Point the page at this server instead of the deployed API.
      body = Buffer.concat([body, Buffer.from('\nwindow.ELDORIA_API_BASE_URL = "/api";\n')]);
    }
    outgoing.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500).end("Server error");
  }
}).listen(port, () => {
  console.log(`Living World, local and in memory: http://localhost:${port}/tools/world-sim/index.html  (DM key: ${process.env.ELDORIA_DM_KEY})`);
});
