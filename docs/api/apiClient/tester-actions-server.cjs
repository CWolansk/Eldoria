"use strict";

const crypto = require("node:crypto");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const API_ROOT = path.resolve(__dirname, "..");
const HOST = process.env.ELDORIA_BUDDY_ACTIONS_HOST || "127.0.0.1";
const PORT = Number(process.env.ELDORIA_BUDDY_ACTIONS_PORT || 8787);
const ACTION_KEY = process.env.ELDORIA_BUDDY_ACTION_KEY || crypto.randomBytes(18).toString("base64url");

const SENSITIVE_KEYS = new Set([
  "storageConnectionString",
  "ELDORIA_STORAGE_CONNECTION_STRING"
]);

function json(res, status, body) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-api-buddy-action-key",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 128 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message}`));
      }
    });
    req.on("error", reject);
  });
}

function assertAuthorized(req) {
  const provided = String(req.headers["x-api-buddy-action-key"] || "");
  if (provided !== ACTION_KEY) {
    const error = new Error("Invalid or missing X-Api-Buddy-Action-Key.");
    error.status = 401;
    throw error;
  }
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = SENSITIVE_KEYS.has(key) ? "<redacted>" : redact(child);
    }
    return out;
  }
  return value;
}

function addArg(args, name, value) {
  if (value === undefined || value === null || value === "") return;
  args.push(name, String(value));
}

function addSwitch(args, name, enabled) {
  if (enabled) args.push(name);
}

function buildDeployCommand(body) {
  if (!body.resourceGroupName) throw new Error("resourceGroupName is required.");
  if (!body.functionAppName) throw new Error("functionAppName is required.");
  if (!body.storageAccountName && !body.storageConnectionString) {
    throw new Error("storageAccountName or storageConnectionString is required.");
  }

  if (process.platform === "win32") {
    const args = [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", "apiDeploy/deploy.ps1",
      "-ResourceGroupName", body.resourceGroupName,
      "-FunctionAppName", body.functionAppName
    ];
    addArg(args, "-StorageAccountName", body.storageAccountName);
    addArg(args, "-ContainerName", body.containerName);
    addArg(args, "-CatalogTable", body.catalogTable);
    addArg(args, "-BlobPrefix", body.blobPrefix);
    addArg(args, "-AllowedOrigins", body.allowedOrigins);
    addArg(args, "-Subscription", body.subscription);
    addArg(args, "-StorageConnectionString", body.storageConnectionString);
    addSwitch(args, "-AssignStorageRole", body.assignStorageRole);
    return { command: "powershell.exe", args };
  }

  const args = [
    "apiDeploy/deploy.sh",
    "--resource-group", body.resourceGroupName,
    "--function-app", body.functionAppName
  ];
  addArg(args, "--storage-account", body.storageAccountName);
  addArg(args, "--container", body.containerName);
  addArg(args, "--catalog-table", body.catalogTable);
  addArg(args, "--blob-prefix", body.blobPrefix);
  addArg(args, "--allowed-origins", body.allowedOrigins);
  addArg(args, "--subscription", body.subscription);
  addArg(args, "--storage-connection-string", body.storageConnectionString);
  addSwitch(args, "--assign-storage-role", body.assignStorageRole);
  return { command: "bash", args };
}

function buildCatalogSeedCommand(body) {
  const args = ["seed/seedTableStorage.js"];
  addSwitch(args, "--dry-run", body.dryRun);
  addSwitch(args, "--purge", body.purge);
  addSwitch(args, "--skip-manifest", body.skipManifest);
  addArg(args, "--only", body.only);
  addArg(args, "--data-dir", body.dataDir);
  return {
    command: process.execPath,
    args,
    env: buildStorageEnv(body)
  };
}

function buildCharacterSeedCommand(body) {
  const args = ["seed/seedBlobStorage.js"];
  addSwitch(args, "--dry-run", body.dryRun);
  addArg(args, "--container", body.containerName);
  addArg(args, "--prefix", body.blobPrefix);
  addArg(args, "--characters-dir", body.charactersDir);
  addArg(args, "--players-manifest", body.playersManifest);
  addSwitch(args, "--purge-character-documents", body.purgeCharacterDocuments);
  addSwitch(args, "--use-character-files", body.useCharacterFiles);
  addSwitch(args, "--skip-characters", body.skipCharacters);
  addSwitch(args, "--skip-players-manifest", body.skipPlayersManifest);
  return {
    command: process.execPath,
    args,
    env: buildStorageEnv(body)
  };
}

function buildStorageEnv(body) {
  const env = {};
  if (body.storageConnectionString) env.ELDORIA_STORAGE_CONNECTION_STRING = body.storageConnectionString;
  if (body.storageAccountName) env.ELDORIA_STORAGE_ACCOUNT = body.storageAccountName;
  if (body.catalogTable) env.ELDORIA_CATALOG_TABLE = body.catalogTable;
  if (body.containerName) env.ELDORIA_CHARACTER_CONTAINER = body.containerName;
  if (body.blobPrefix) env.ELDORIA_BLOB_PREFIX = body.blobPrefix;
  return env;
}

function formatCommand(command, args) {
  return [command, ...args].map((part) => {
    if (/AccountKey=|SharedAccessSignature=|DefaultEndpointsProtocol=/i.test(part)) return "<redacted>";
    return /\s/u.test(part) ? `"${part.replace(/"/gu, '\\"')}"` : part;
  }).join(" ");
}

function runCommand(definition) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let stdout = "";
    let stderr = "";
    const child = spawn(definition.command, definition.args, {
      cwd: API_ROOT,
      env: { ...process.env, ...(definition.env || {}) },
      shell: false,
      windowsHide: true
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        code: null,
        command: formatCommand(definition.command, definition.args),
        stdout,
        stderr,
        error: error.message,
        durationMs: Date.now() - startedAt
      });
    });
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        command: formatCommand(definition.command, definition.args),
        stdout,
        stderr,
        durationMs: Date.now() - startedAt
      });
    });
  });
}

async function handleAction(req, res, action) {
  assertAuthorized(req);
  const body = await readBody(req);
  let definition;

  if (action === "deploy") definition = buildDeployCommand(body);
  else if (action === "seed/catalog") definition = buildCatalogSeedCommand(body);
  else if (action === "seed/characters") definition = buildCharacterSeedCommand(body);
  else return json(res, 404, { error: "Unknown action." });

  const result = await runCommand(definition);
  return json(res, result.ok ? 200 : 500, {
    ...result,
    request: redact(body)
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 204, null);
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, apiRoot: API_ROOT });
    }

    if (req.method === "POST" && url.pathname.startsWith("/actions/")) {
      return await handleAction(req, res, url.pathname.slice("/actions/".length));
    }

    return json(res, 404, { error: "Not found." });
  } catch (error) {
    return json(res, error.status || 400, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Eldoria API Buddy actions listening at http://${HOST}:${PORT}`);
  console.log(`Action key: ${ACTION_KEY}`);
  console.log("Keep this process running while using the Deployment actions in tester.html.");
});
