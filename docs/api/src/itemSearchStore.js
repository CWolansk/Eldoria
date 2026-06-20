"use strict";

const { odata } = require("@azure/data-tables");
const model = require("./catalogModel");
const {
  ITEM_SEARCH_INDEX_VERSION,
  ITEM_SEARCH_MANIFEST_PARTITION,
  ITEM_SEARCH_MANIFEST_ROW_KEY,
  ITEM_SEARCH_PARTITION_PREFIX,
  SEARCH_ROW_COLUMNS,
  getItemSearchPartitionKey,
  getItemSearchQueryTerms,
  getItemSearchRowKeyRange,
  isReadyItemSearchManifest,
  itemSearchManifestEntity,
  scoreItemSearchResult,
  toItemSearchResult
} = require("./itemSearchIndex");
const { cleanEnv, createEnsuredTableClient } = require("./tableClient");

const DEFAULT_CATALOG_TABLE = "eldoriacatalog";
const MAX_BATCH_COUNT = 100;
const MAX_INDEX_TERM_ROWS = 5000;
const INDEX_STATUS_TTL_MS = 30000;

let searchTableClientPromise;
let statusCache = null;

function getCatalogTableName() {
  return cleanEnv("ELDORIA_CATALOG_TABLE") || DEFAULT_CATALOG_TABLE;
}

function getItemSearchTableName() {
  return cleanEnv("ELDORIA_CATALOG_SEARCH_TABLE") || `${getCatalogTableName()}search`;
}

function isItemSearchIndexEnabled() {
  const raw = cleanEnv("ELDORIA_ITEM_SEARCH_INDEX").toLowerCase();
  return !["0", "false", "no", "off", "disabled"].includes(raw);
}

async function getSearchTableClient() {
  if (!searchTableClientPromise) {
    searchTableClientPromise = createEnsuredTableClient(getItemSearchTableName());
  }
  return searchTableClientPromise;
}

async function readItemSearchManifest() {
  const client = await getSearchTableClient();
  try {
    return await client.getEntity(ITEM_SEARCH_MANIFEST_PARTITION, ITEM_SEARCH_MANIFEST_ROW_KEY);
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

async function getItemSearchIndexStatus({ refresh = false } = {}) {
  if (!isItemSearchIndexEnabled()) {
    return {
      ready: false,
      reason: "disabled"
    };
  }

  const now = Date.now();
  if (!refresh && statusCache && now - statusCache.checkedAt < INDEX_STATUS_TTL_MS) {
    return statusCache.status;
  }

  const manifest = await readItemSearchManifest();
  const ready = isReadyItemSearchManifest(manifest);
  const status = {
    ready,
    reason: ready ? "ready" : "missing-or-stale",
    manifest: manifest ? {
      version: manifest.version,
      rowCount: manifest.rowCount,
      itemCount: manifest.itemCount,
      generatedAt: manifest.generatedAt
    } : null
  };
  statusCache = {
    checkedAt: now,
    status
  };
  return status;
}

function resetItemSearchIndexStatusCache() {
  statusCache = null;
}

function bestRowsByItemId(rows) {
  const byId = new Map();
  for (const row of rows) {
    const id = String(row.itemId || "").trim();
    if (!id) {
      continue;
    }

    const existing = byId.get(id);
    if (!existing || Number(row.ordinal || 0) < Number(existing.ordinal || 0)) {
      byId.set(id, row);
    }
  }
  return byId;
}

async function queryIndexTerm(term, maxRows = MAX_INDEX_TERM_ROWS) {
  const client = await getSearchTableClient();
  const partitionKey = getItemSearchPartitionKey(term);
  const range = getItemSearchRowKeyRange(term);
  const entities = client.listEntities({
    queryOptions: {
      filter: odata`PartitionKey eq ${partitionKey} and RowKey ge ${range.start} and RowKey lt ${range.end}`,
      select: SEARCH_ROW_COLUMNS,
      top: maxRows + 1
    }
  });

  const rows = [];
  for await (const entity of entities) {
    rows.push(entity);
    if (rows.length > maxRows) {
      return {
        rows: rows.slice(0, maxRows),
        truncated: true
      };
    }
  }

  return {
    rows,
    truncated: false
  };
}

function rankIndexedRows(rows, terms, normalizedQuery, { limit = 0, skip = 0 } = {}) {
  const byTerm = rows.map((termRows) => bestRowsByItemId(termRows));
  if (!byTerm.length || byTerm.some((map) => !map.size)) {
    return [];
  }

  const smallest = byTerm.reduce((left, right) => (right.size < left.size ? right : left), byTerm[0]);
  const candidates = [];

  for (const [id, row] of smallest.entries()) {
    if (!byTerm.every((map) => map.has(id))) {
      continue;
    }
    if (!model.matchesText(row, normalizedQuery)) {
      continue;
    }

    candidates.push({
      row,
      score: scoreItemSearchResult(row, terms),
      ordinal: Number(row.ordinal || 0)
    });
  }

  candidates.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }
    if (left.ordinal !== right.ordinal) {
      return left.ordinal - right.ordinal;
    }
    return String(left.row.name || "").localeCompare(String(right.row.name || ""), undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });

  const pageSkip = Number(skip) > 0 ? Math.floor(Number(skip)) : 0;
  const pageLimit = Number(limit) > 0 ? Math.floor(Number(limit)) : 0;
  const rowsToReturn = pageLimit > 0
    ? candidates.slice(pageSkip, pageSkip + pageLimit)
    : candidates.slice(pageSkip);
  return rowsToReturn.map((candidate) => toItemSearchResult(candidate.row)).filter(Boolean);
}

async function searchItemsByIndex(query, { limit = 0, skip = 0 } = {}) {
  const terms = getItemSearchQueryTerms(query);
  if (!terms.length) {
    return {
      used: false,
      reason: "unsupported-query"
    };
  }

  try {
    const status = await getItemSearchIndexStatus();
    if (!status.ready) {
      return {
        used: false,
        reason: status.reason,
        status
      };
    }

    const termResults = await Promise.all(terms.map((term) => queryIndexTerm(term)));
    if (termResults.some((result) => result.truncated)) {
      return {
        used: false,
        reason: "term-too-broad",
        terms
      };
    }

    const normalizedQuery = model.normalizeText(query);
    const items = rankIndexedRows(
      termResults.map((result) => result.rows),
      terms,
      normalizedQuery,
      {
        limit: Number(limit) > 0 ? Math.floor(Number(limit)) : 0,
        skip: Number(skip) > 0 ? Math.floor(Number(skip)) : 0
      }
    );

    return {
      used: true,
      version: ITEM_SEARCH_INDEX_VERSION,
      terms,
      items
    };
  } catch (error) {
    return {
      used: false,
      reason: "error",
      error
    };
  }
}

async function submitPartitionTransactions(client, entities, action, { onBatch } = {}) {
  let written = 0;
  const byPartition = new Map();

  for (const entity of entities) {
    const key = entity.partitionKey;
    if (!byPartition.has(key)) {
      byPartition.set(key, []);
    }
    byPartition.get(key).push(entity);
  }

  for (const [partitionKey, partitionEntities] of [...byPartition.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    for (let index = 0; index < partitionEntities.length; index += MAX_BATCH_COUNT) {
      const batch = partitionEntities.slice(index, index + MAX_BATCH_COUNT);
      await client.submitTransaction(batch.map((entity) => (
        action === "upsert" ? ["upsert", entity, "Replace"] : ["delete", entity]
      )));
      written += batch.length;
      if (onBatch) {
        onBatch(written, entities.length, partitionKey);
      }
    }
  }

  return written;
}

async function upsertItemSearchEntities(entities, { onBatch } = {}) {
  if (!entities.length) {
    return 0;
  }
  const client = await getSearchTableClient();
  return submitPartitionTransactions(client, entities, "upsert", { onBatch });
}

async function writeItemSearchManifest({ itemCount, rowCount, generatedAt } = {}) {
  const client = await getSearchTableClient();
  const entity = itemSearchManifestEntity({ itemCount, rowCount, generatedAt });
  await client.upsertEntity(entity, "Replace");
  resetItemSearchIndexStatusCache();
  return entity;
}

async function clearItemSearchIndex({ onBatch } = {}) {
  const client = await getSearchTableClient();
  const keys = [];
  const entities = client.listEntities({
    queryOptions: {
      select: ["partitionKey", "rowKey"]
    }
  });

  for await (const entity of entities) {
    const isManifest = entity.partitionKey === ITEM_SEARCH_MANIFEST_PARTITION
      && entity.rowKey === ITEM_SEARCH_MANIFEST_ROW_KEY;
    const isIndexRow = String(entity.partitionKey || "").startsWith(`${ITEM_SEARCH_PARTITION_PREFIX}:`);
    if (!isManifest && !isIndexRow) {
      continue;
    }

    keys.push({
      partitionKey: entity.partitionKey,
      rowKey: entity.rowKey
    });
  }

  const deleted = await submitPartitionTransactions(client, keys, "delete", { onBatch });
  resetItemSearchIndexStatusCache();
  return deleted;
}

module.exports = {
  clearItemSearchIndex,
  getItemSearchIndexStatus,
  getItemSearchTableName,
  isItemSearchIndexEnabled,
  resetItemSearchIndexStatusCache,
  searchItemsByIndex,
  upsertItemSearchEntities,
  writeItemSearchManifest
};
