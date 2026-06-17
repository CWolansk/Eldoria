"use strict";

// Azure Table Storage access layer for the Eldoria rules catalogs.
//
// Auth mirrors blobStore.js: a storage connection string (incl. Azurite's
// "UseDevelopmentStorage=true") when present, otherwise managed identity via
// DefaultAzureCredential against ELDORIA_STORAGE_ACCOUNT.

const { TableClient, odata } = require("@azure/data-tables");
const { DefaultAzureCredential } = require("@azure/identity");
const model = require("./catalogModel");

const DEFAULT_TABLE = "eldoriacatalog";
const MAX_BATCH_COUNT = 100;          // Table transaction hard limit.
const MAX_BATCH_BYTES = 3_500_000;    // Stay under the 4 MB transaction payload cap.

let tableClientPromise;

function cleanEnv(name) {
  return String(process.env[name] || "").trim();
}

function getTableName() {
  return cleanEnv("ELDORIA_CATALOG_TABLE") || DEFAULT_TABLE;
}

function isLocalConnection(connectionString) {
  return /UseDevelopmentStorage=true/iu.test(connectionString)
    || /127\.0\.0\.1|localhost/iu.test(connectionString);
}

function createTableClient(tableName) {
  const connectionString = cleanEnv("ELDORIA_STORAGE_CONNECTION_STRING")
    || cleanEnv("AzureWebJobsStorage");

  if (connectionString) {
    return TableClient.fromConnectionString(connectionString, tableName, {
      allowInsecureConnection: isLocalConnection(connectionString)
    });
  }

  const storageAccount = cleanEnv("ELDORIA_STORAGE_ACCOUNT") || cleanEnv("STORAGE_ACCOUNT");
  if (!storageAccount) {
    throw new Error(
      "Missing storage configuration. Set ELDORIA_STORAGE_CONNECTION_STRING or ELDORIA_STORAGE_ACCOUNT."
    );
  }

  return new TableClient(
    `https://${storageAccount}.table.core.windows.net`,
    tableName,
    new DefaultAzureCredential()
  );
}

async function ensureTable(client) {
  if (cleanEnv("ELDORIA_CREATE_TABLE").toLowerCase() === "false") {
    return;
  }
  try {
    await client.createTable();
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

async function getTableClient() {
  if (!tableClientPromise) {
    tableClientPromise = (async () => {
      const client = createTableClient(getTableName());
      await ensureTable(client);
      return client;
    })();
  }
  return tableClientPromise;
}

// List the lightweight index rows for a kind. Structured filters are pushed to
// the table query; the free-text `q` (substring) is applied in-process because
// Table Storage filters have no substring operator.
async function listCatalog(kind, options = {}) {
  const canonicalKind = model.normalizeKind(kind);
  const client = await getTableClient();
  const filter = model.buildFilter(canonicalKind, options.filters);
  const select = model.selectColumns(canonicalKind);
  const query = model.normalizeText(options.q);
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 0;

  const rows = [];
  const entities = client.listEntities({ queryOptions: { filter, select } });
  for await (const entity of entities) {
    if (query && !model.matchesText(entity, query)) {
      continue;
    }
    rows.push(model.toPublicRow(entity));
    if (limit && rows.length >= limit) {
      break;
    }
  }
  return rows;
}

// List full, reassembled documents for browser search pages that need rendered
// rules text and nested catalog fields rather than only lightweight indexes.
async function listCatalogFull(kind, options = {}) {
  const canonicalKind = model.normalizeKind(kind);
  const client = await getTableClient();
  const filter = model.buildFilter(canonicalKind, options.filters);
  const query = model.normalizeText(options.q);
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 0;

  const rows = [];
  const entities = client.listEntities({ queryOptions: { filter } });
  for await (const entity of entities) {
    if (query && !model.matchesText(entity, query)) {
      continue;
    }
    rows.push(model.fromTableEntity(entity));
    if (limit && rows.length >= limit) {
      break;
    }
  }
  return rows;
}

function buildScopedODataFilter(kind, rawFilter) {
  const baseFilter = model.buildFilter(kind);
  const extraFilter = String(rawFilter || "").trim();
  return extraFilter ? `${baseFilter} and (${extraFilter})` : baseFilter;
}

// List full, reassembled documents using a caller-provided OData filter over
// the catalog's indexed Table Storage columns. The partition filter is always
// applied outside the caller filter so queries remain scoped to one catalog kind.
async function listCatalogODataFull(kind, options = {}) {
  const canonicalKind = model.normalizeKind(kind);
  const client = await getTableClient();
  const filter = buildScopedODataFilter(canonicalKind, options.filter);
  const query = model.normalizeText(options.q);
  const skip = Number(options.skip) > 0 ? Math.floor(Number(options.skip)) : 0;
  const limit = Number(options.limit) > 0 ? Math.floor(Number(options.limit)) : 0;

  const queryOptions = { filter };
  if (!query && skip === 0 && limit > 0) {
    queryOptions.top = limit;
  }

  const rows = [];
  let matched = 0;
  const entities = client.listEntities({ queryOptions });
  for await (const entity of entities) {
    if (query && !model.matchesText(entity, query)) {
      continue;
    }
    if (matched < skip) {
      matched += 1;
      continue;
    }
    matched += 1;
    rows.push(model.fromTableEntity(entity));
    if (limit && rows.length >= limit) {
      break;
    }
  }
  return rows;
}

// Fetch and reassemble the full normalized entity for one id, or null.
async function getEntity(kind, id) {
  const canonicalKind = model.normalizeKind(kind);
  const client = await getTableClient();
  try {
    const entity = await client.getEntity(canonicalKind, model.sanitizeKey(id));
    return model.fromTableEntity(entity);
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

// Upsert one full catalog document and rebuild all searchable index columns.
async function upsertEntity(kind, raw, options = {}) {
  const canonicalKind = model.normalizeKind(kind);
  const entity = model.toTableEntity(canonicalKind, raw);
  if (options.entityId) {
    entity.entityId = String(options.entityId);
    entity.rowKey = model.sanitizeKey(entity.entityId);
  }
  await upsertEntities([entity]);
  return {
    id: entity.entityId,
    entity: raw
  };
}

async function listManifest() {
  const client = await getTableClient();
  const catalogs = [];
  try {
    const entities = client.listEntities({
      queryOptions: { filter: odata`PartitionKey eq ${model.MANIFEST_PARTITION}` }
    });
    for await (const entity of entities) {
      catalogs.push({
        kind: entity.rowKey,
        label: entity.label,
        count: entity.count,
        generatedAt: entity.generatedAt
      });
    }
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }
  return catalogs.sort((left, right) => String(left.kind).localeCompare(String(right.kind)));
}

function entityBytes(entity) {
  let bytes = 0;
  for (const value of Object.values(entity)) {
    bytes += Buffer.byteLength(typeof value === "string" ? value : String(value), "utf16le");
  }
  return bytes;
}

// Upsert a single kind's entities in size-aware transaction batches. All
// entities in a batch must share the partition key (they do — one kind) and the
// batch must stay under both the 100-entity and ~4 MB transaction limits.
async function upsertEntities(entities, { onBatch } = {}) {
  if (!entities.length) {
    return 0;
  }
  const client = await getTableClient();
  let written = 0;
  let batch = [];
  let batchBytes = 0;

  const flush = async () => {
    if (!batch.length) {
      return;
    }
    await client.submitTransaction(batch.map((entity) => ["upsert", entity, "Replace"]));
    written += batch.length;
    if (onBatch) {
      onBatch(written, entities.length);
    }
    batch = [];
    batchBytes = 0;
  };

  for (const entity of entities) {
    const bytes = entityBytes(entity);
    if (batch.length >= MAX_BATCH_COUNT || (batch.length && batchBytes + bytes > MAX_BATCH_BYTES)) {
      await flush();
    }
    batch.push(entity);
    batchBytes += bytes;
  }
  await flush();
  return written;
}

async function writeManifest(entries) {
  return upsertEntities(entries);
}

async function clearPartition(partitionKey) {
  const client = await getTableClient();
  let deleted = 0;
  let batch = [];

  const flush = async () => {
    if (!batch.length) {
      return;
    }
    await client.submitTransaction(batch.map((key) => ["delete", { partitionKey, rowKey: key }]));
    deleted += batch.length;
    batch = [];
  };

  const entities = client.listEntities({
    queryOptions: { filter: odata`PartitionKey eq ${partitionKey}`, select: ["rowKey"] }
  });
  for await (const entity of entities) {
    batch.push(entity.rowKey);
    if (batch.length >= MAX_BATCH_COUNT) {
      await flush();
    }
  }
  await flush();
  return deleted;
}

async function clearManifest() {
  return clearPartition(model.MANIFEST_PARTITION);
}

// Delete every row in a partition (used by the seeder's --purge to drop stale
// entities before a reseed). Deletes in same-partition transaction batches.
async function clearKind(kind) {
  const canonicalKind = model.normalizeKind(kind);
  return clearPartition(canonicalKind);
}

module.exports = {
  getTableClient,
  getTableName,
  listCatalog,
  listCatalogFull,
  listCatalogODataFull,
  getEntity,
  upsertEntity,
  listManifest,
  upsertEntities,
  writeManifest,
  clearManifest,
  clearKind
};
