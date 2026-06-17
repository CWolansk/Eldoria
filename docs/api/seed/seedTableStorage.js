"use strict";

// Seed the Eldoria rules catalogs (docs/data/*.json) into Azure Table Storage.
//
// Each catalog array is flattened into searchable index columns plus a chunked
// copy of the full normalized entity (see src/catalogModel.js). A _manifest
// partition records per-kind counts so the API can advertise what's available.
//
//   cd docs/api
//   $env:ELDORIA_STORAGE_CONNECTION_STRING = "<connection string>"
//   npm run seed:catalog            # or: node seed/seedTableStorage.js

const fs = require("node:fs/promises");
const path = require("node:path");
const model = require("../src/catalogModel");
const tableStore = require("../src/tableStore");

const API_ROOT = path.resolve(__dirname, "..");
const DOCS_ROOT = path.resolve(API_ROOT, "..");
const DEFAULT_DATA_DIR = path.join(DOCS_ROOT, "data");

function parseArgs(argv) {
  const options = {
    dataDir: DEFAULT_DATA_DIR,
    only: null,
    dryRun: false,
    purge: false,
    includeManifest: true,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      return argv[index];
    };

    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--purge") options.purge = true;
    else if (arg === "--skip-manifest") options.includeManifest = false;
    else if (arg === "--data-dir") options.dataDir = path.resolve(next());
    else if (arg === "--only") options.only = next().split(",").map((value) => value.trim()).filter(Boolean);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Seed Eldoria rules catalogs into Azure Table Storage.

Usage:
  node seed/seedTableStorage.js [options]

Options:
  --dry-run            Build and validate entities without writing to the table.
  --purge              Delete existing rows for each seeded kind before upserting.
  --only <kinds>       Comma-separated kinds to seed (default: all). e.g. items,spells
  --data-dir <path>    Source data folder (default: ${path.relative(process.cwd(), DEFAULT_DATA_DIR)}).
  --skip-manifest      Do not write the _manifest partition.

Storage configuration (same as the blob seeder):
  ELDORIA_STORAGE_CONNECTION_STRING   Connection string (incl. UseDevelopmentStorage=true), or
  ELDORIA_STORAGE_ACCOUNT             Storage account name for managed-identity auth.
  ELDORIA_CATALOG_TABLE               Table name (default: eldoriacatalog).

Available kinds:
  ${model.listKinds().join(", ")}
`);
}

async function readCatalogArray(dataDir, def) {
  const filePath = path.join(dataDir, def.file);
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`  ! ${def.file} not found, skipping ${def.kind}.`);
      return null;
    }
    throw error;
  }

  const data = JSON.parse(text);
  const arr = data[def.field];
  if (!Array.isArray(arr)) {
    console.warn(`  ! ${def.file} has no "${def.field}" array, skipping ${def.kind}.`);
    return null;
  }
  return arr;
}

// Build entities for one kind, de-duplicating by RowKey (a transaction batch
// may not contain two rows with the same key).
function buildEntities(def, rawArray) {
  const entities = [];
  const seen = new Set();
  let duplicates = 0;

  for (const raw of rawArray) {
    const entity = model.toTableEntity(def.kind, raw);
    if (seen.has(entity.rowKey)) {
      duplicates += 1;
      continue;
    }
    seen.add(entity.rowKey);
    entities.push(entity);
  }

  if (duplicates) {
    console.warn(`  ! ${def.kind}: skipped ${duplicates} duplicate row key(s).`);
  }
  return entities;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const requested = options.only ? options.only.map((kind) => model.normalizeKind(kind)) : null;
  const requestedSet = requested ? new Set(requested) : null;
  const catalogs = model.CATALOGS.filter((def) => !requestedSet || requestedSet.has(def.kind));

  if (!catalogs.length) {
    throw new Error("No catalogs selected. Check --only values.");
  }

  console.log(`Table: ${tableStore.getTableName()}${options.dryRun ? "  (dry run)" : ""}`);
  console.log(`Data:  ${options.dataDir}\n`);

  const generatedAt = new Date().toISOString();
  const manifestEntries = [];
  let totalWritten = 0;

  for (const def of catalogs) {
    const rawArray = await readCatalogArray(options.dataDir, def);
    if (!rawArray) {
      continue;
    }

    const entities = buildEntities(def, rawArray);

    if (options.dryRun) {
      console.log(`  ${def.kind.padEnd(18)} ${String(entities.length).padStart(5)} entit(ies) [planned]`);
      manifestEntries.push(model.manifestEntity(def.kind, entities.length, generatedAt));
      continue;
    }

    if (options.purge) {
      const removed = await tableStore.clearKind(def.kind);
      if (removed) {
        console.log(`  ${def.kind.padEnd(18)} purged ${removed} existing row(s)`);
      }
    }

    const written = await tableStore.upsertEntities(entities);
    totalWritten += written;
    manifestEntries.push(model.manifestEntity(def.kind, written, generatedAt));
    console.log(`  ${def.kind.padEnd(18)} ${String(written).padStart(5)} entit(ies) upserted`);
  }

  if (options.includeManifest && manifestEntries.length && !options.dryRun) {
    if (!requestedSet) {
      await tableStore.clearManifest();
    }
    await tableStore.writeManifest(manifestEntries);
    console.log(`\n  _manifest          ${String(manifestEntries.length).padStart(5)} kind(s) recorded`);
  }

  console.log(`\nSeed complete. ${totalWritten} entit(ies) ${options.dryRun ? "planned" : "upserted"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
