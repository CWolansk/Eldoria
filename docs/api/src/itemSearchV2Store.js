"use strict";

const { odata } = require("@azure/data-tables");
const { cleanEnv, createEnsuredTableClient } = require("./tableClient");
const index = require("./itemSearchV2Index");

const DEFAULT_CATALOG_TABLE = "eldoriacatalog";
const MAX_BATCH_COUNT = 100;
const MAX_CANDIDATES = 25000;
const STATUS_TTL_MS = 30000;
const INCREMENTAL_ORDINAL = 99_999_999;
let clientPromise;
let statusCache;

function getTableName() {
  return cleanEnv("ELDORIA_CATALOG_SEARCH_V2_TABLE") || `${cleanEnv("ELDORIA_CATALOG_TABLE") || DEFAULT_CATALOG_TABLE}searchv2`;
}

function isEnabled() {
  return /^(1|true|yes|on)$/iu.test(cleanEnv("ELDORIA_ITEM_SEARCH_V2"));
}

async function getClient() {
  if (!clientPromise) clientPromise = createEnsuredTableClient(getTableName());
  return clientPromise;
}

async function readManifest() {
  const client = await getClient();
  try {
    return await client.getEntity(index.ITEM_SEARCH_V2_MANIFEST_PARTITION, index.ITEM_SEARCH_V2_MANIFEST_ROW_KEY);
  } catch (error) {
    if (error.statusCode === 404) return null;
    throw error;
  }
}

async function getStatus({ refresh = false, requireEnabled = true } = {}) {
  if (requireEnabled && !isEnabled()) return { ready: false, reason: "disabled" };
  const now = Date.now();
  if (!refresh && statusCache && now - statusCache.checkedAt < STATUS_TTL_MS) return statusCache.status;
  const manifest = await readManifest();
  const ready = index.isReadyManifest(manifest);
  const status = {
    ready,
    reason: ready ? "ready" : "missing-or-stale",
    manifest: manifest ? {
      version: manifest.version,
      itemCount: Number(manifest.itemCount || 0),
      rowCount: Number(manifest.rowCount || 0),
      generatedAt: manifest.generatedAt,
      facets: parseJson(manifest.facetsJson, {})
    } : null
  };
  statusCache = { checkedAt: now, status };
  return status;
}

function parseJson(value, fallback) {
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
}

function normalizeFilters(filters = {}) {
  const normalized = {};
  for (const field of index.FACET_FIELDS) {
    const raw = Array.isArray(filters[field]) ? filters[field] : filters[field] == null ? [] : [filters[field]];
    const values = [...new Set(raw.map(index.normalize).filter(Boolean))];
    if (values.length) normalized[field] = values;
  }
  return normalized;
}

function splitValues(value) {
  return String(value || "").split("|").map(index.normalize).filter(Boolean);
}

function rowFacetValues(row, field) {
  if (field === "attunement") return [row.attunement ? "required" : "not required"];
  if (field === "properties" || field === "mastery") return splitValues(row[field]);
  const sourceField = field === "damage" ? "damage" : field;
  return [index.normalize(row[sourceField])].filter(Boolean);
}

function matchesFilters(row, filters) {
  return Object.entries(filters).every(([field, selected]) => {
    const values = new Set(rowFacetValues(row, field));
    return selected.some((value) => values.has(value));
  });
}

function bestRowsById(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (!row.itemId) continue;
    const existing = byId.get(row.itemId);
    if (!existing || Number(row.ordinal || 0) < Number(existing.ordinal || 0)) byId.set(row.itemId, row);
  }
  return byId;
}

async function readQuery(queryOptions, maxRows = MAX_CANDIDATES, stopAfter = 0) {
  const client = await getClient();
  const rows = [];
  const entities = client.listEntities({ queryOptions });
  for await (const entity of entities) {
    rows.push(entity);
    if (rows.length > maxRows) {
      const error = new Error("Item search is too broad. Narrow the query or add a filter.");
      error.statusCode = 400;
      error.details = { maxCandidates: maxRows };
      throw error;
    }
    if (stopAfter > 0 && rows.length >= stopAfter) break;
  }
  return rows;
}

async function queryTerm(term) {
  const range = index.textRange(term);
  return readQuery({
    filter: odata`PartitionKey eq ${index.textPartition(term)} and RowKey ge ${range.start} and RowKey lt ${range.end}`,
    select: index.SUMMARY_COLUMNS
  });
}

async function queryBrowse(sort, rowLimit = MAX_CANDIDATES + 1) {
  const browseSort = sort === "relevance" ? "name" : sort;
  return readQuery({
    filter: odata`PartitionKey eq ${`${index.ITEM_SEARCH_V2_PREFIX}:b:${browseSort}`}`,
    select: index.SUMMARY_COLUMNS
  }, Math.max(MAX_CANDIDATES, rowLimit), rowLimit);
}

async function queryFacet(field, value) {
  return readQuery({
    filter: odata`PartitionKey eq ${index.facetPartition(field, value)}`,
    select: index.SUMMARY_COLUMNS
  });
}

async function candidatesForFacetFilters(filters) {
  const groups = await Promise.all(Object.entries(filters).map(async ([field, values]) => {
    const rows = await Promise.all(values.map((value) => queryFacet(field, value)));
    return bestRowsById(rows.flat());
  }));
  if (!groups.length || groups.some((group) => !group.size)) return [];
  const smallest = groups.reduce((left, right) => right.size < left.size ? right : left, groups[0]);
  return [...smallest.values()].filter((row) => matchesFilters(row, filters));
}

function candidatesForTerms(termRows, terms) {
  const maps = termRows.map(bestRowsById);
  if (!maps.length || maps.some((map) => !map.size)) return [];
  const smallest = maps.reduce((left, right) => right.size < left.size ? right : left, maps[0]);
  return [...smallest.entries()]
    .filter(([id, row]) => maps.every((map) => map.has(id)) && terms.every((term) => row.searchText.includes(term)))
    .map(([, row]) => row);
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), undefined, { numeric: true, sensitivity: "base" });
}

const RARITY_RANK = new Map(["none", "common", "uncommon", "rare", "very rare", "legendary", "artifact"].map((value, i) => [value, i]));

function sortRows(rows, sort, terms) {
  return [...rows].sort((left, right) => {
    if (sort === "relevance") {
      const delta = index.score(left, terms) - index.score(right, terms);
      if (delta) return delta;
    } else if (sort === "rarity") {
      const delta = (RARITY_RANK.get(left.rarity) ?? 999) - (RARITY_RANK.get(right.rarity) ?? 999);
      if (delta) return delta;
    } else if (sort === "type") {
      const delta = compareText(left.type, right.type);
      if (delta) return delta;
    } else if (sort === "source") {
      const delta = compareText(left.source, right.source);
      if (delta) return delta;
    }
    return compareText(left.name, right.name) || compareText(left.itemId, right.itemId);
  });
}

function buildFacets(rows, manifestFacets) {
  const counts = Object.fromEntries(index.FACET_FIELDS.map((field) => [field, new Map()]));
  for (const row of rows) {
    for (const field of index.FACET_FIELDS) {
      for (const value of rowFacetValues(row, field)) counts[field].set(value, (counts[field].get(value) || 0) + 1);
    }
  }
  const result = {};
  for (const field of index.FACET_FIELDS) {
    const labels = new Map((manifestFacets?.[field] || []).map((entry) => [index.normalize(entry.value), entry.value]));
    for (const key of counts[field].keys()) if (!labels.has(key)) labels.set(key, key);
    result[field] = [...labels.entries()]
      .map(([key, value]) => ({ value, count: counts[field].get(key) || 0 }))
      .sort((left, right) => left.value.localeCompare(right.value));
  }
  return result;
}

function signature(options) {
  return JSON.stringify({ q: index.normalize(options.q), sort: options.sort, filters: normalizeFilters(options.filters) });
}

function encodeCursor(offset, options) {
  return Buffer.from(JSON.stringify({ v: index.ITEM_SEARCH_V2_VERSION, o: offset, s: signature(options) }), "utf8").toString("base64url");
}

function decodeCursor(cursor, options) {
  if (!cursor) return 0;
  let value;
  try { value = JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8")); }
  catch { value = null; }
  if (!value || value.v !== index.ITEM_SEARCH_V2_VERSION || value.s !== signature(options) || !Number.isInteger(value.o) || value.o < 0) {
    const error = new Error("Item search cursor is invalid or does not match this query.");
    error.statusCode = 400;
    throw error;
  }
  return value.o;
}

async function searchItemsV2(options = {}) {
  try {
    const status = await getStatus();
    if (!status.ready) return { used: false, reason: status.reason, status };
    const q = String(options.q || "").trim();
    const terms = index.getQueryTerms(q);
    if (q && !terms.length) return { used: false, reason: "unsupported-query" };
    const sort = index.SORTS.includes(options.sort) ? options.sort : q ? "relevance" : "name";
    const filters = normalizeFilters(options.filters);
    const normalizedOptions = { q, sort, filters };
    const skip = options.cursor ? decodeCursor(options.cursor, normalizedOptions) : Math.max(0, Math.floor(Number(options.skip) || 0));
    const limit = Math.min(200, Math.max(1, Math.floor(Number(options.limit) || 50)));

    if (!terms.length && !Object.keys(filters).length) {
      const browseRows = await queryBrowse(sort, skip + limit + 1);
      const pageRows = browseRows.slice(skip, skip + limit);
      const totalCount = Number(status.manifest?.itemCount || browseRows.length);
      const hasMore = skip + pageRows.length < totalCount;
      return {
        used: true,
        version: index.ITEM_SEARCH_V2_VERSION,
        items: pageRows.map(index.toPublicResult).filter(Boolean),
        totalCount,
        skip,
        limit,
        hasMore,
        nextSkip: hasMore ? skip + pageRows.length : undefined,
        nextCursor: hasMore ? encodeCursor(skip + pageRows.length, normalizedOptions) : undefined,
        facets: options.includeFacets ? status.manifest?.facets : undefined
      };
    }

    let candidates;
    if (terms.length) {
      const termRows = await Promise.all(terms.map(queryTerm));
      candidates = candidatesForTerms(termRows, terms);
    } else if (Object.keys(filters).length) {
      candidates = await candidatesForFacetFilters(filters);
    } else {
      candidates = await queryBrowse(sort);
    }
    const filtered = candidates.filter((row) => matchesFilters(row, filters));
    const ordered = sortRows(filtered, sort, terms);
    const pageRows = ordered.slice(skip, skip + limit);
    const hasMore = skip + pageRows.length < ordered.length;
    return {
      used: true,
      version: index.ITEM_SEARCH_V2_VERSION,
      items: pageRows.map(index.toPublicResult).filter(Boolean),
      totalCount: ordered.length,
      skip,
      limit,
      hasMore,
      nextSkip: hasMore ? skip + pageRows.length : undefined,
      nextCursor: hasMore ? encodeCursor(skip + pageRows.length, normalizedOptions) : undefined,
      facets: options.includeFacets ? buildFacets(filtered, status.manifest?.facets) : undefined
    };
  } catch (error) {
    if (Number(error?.statusCode || 0) >= 400 && Number(error?.statusCode || 0) < 500) throw error;
    return { used: false, reason: "error", error };
  }
}

async function submitTransactions(entities, action, { onBatch } = {}) {
  const client = await getClient();
  const partitions = new Map();
  for (const entity of entities) {
    if (!partitions.has(entity.partitionKey)) partitions.set(entity.partitionKey, []);
    partitions.get(entity.partitionKey).push(entity);
  }
  let complete = 0;
  for (const [partitionKey, rows] of partitions) {
    for (let offset = 0; offset < rows.length; offset += MAX_BATCH_COUNT) {
      const batch = rows.slice(offset, offset + MAX_BATCH_COUNT);
      await client.submitTransaction(batch.map((entity) => action === "upsert" ? ["upsert", entity, "Replace"] : ["delete", entity]));
      complete += batch.length;
      onBatch?.(complete, entities.length, partitionKey);
    }
  }
  return complete;
}

async function upsertEntities(entities, options) {
  return entities.length ? submitTransactions(entities, "upsert", options) : 0;
}

async function writeManifest(data) {
  const client = await getClient();
  const entity = index.manifestEntity(data);
  await client.upsertEntity(entity, "Replace");
  statusCache = null;
  return entity;
}

function entityKey(entity) {
  return `${entity.partitionKey}\u0000${entity.rowKey}`;
}

function updateManifestFacets(manifestFacets, previousFacets, nextFacets, previousIndexed) {
  const output = {};
  for (const field of index.FACET_FIELDS) {
    const counts = new Map();
    for (const entry of manifestFacets?.[field] || []) {
      const key = index.normalize(entry.value);
      if (key) counts.set(key, { value: entry.value, count: Number(entry.count || 0) });
    }
    if (previousIndexed) {
      for (const entry of previousFacets?.[field] || []) {
        const key = index.normalize(entry.value);
        const current = counts.get(key) || { value: entry.value, count: 0 };
        current.count -= Number(entry.count || 0);
        counts.set(key, current);
      }
    }
    for (const entry of nextFacets?.[field] || []) {
      const key = index.normalize(entry.value);
      const current = counts.get(key) || { value: entry.value, count: 0 };
      current.value = current.value || entry.value;
      current.count += Number(entry.count || 0);
      counts.set(key, current);
    }
    output[field] = [...counts.values()]
      .filter((entry) => entry.count > 0)
      .sort((left, right) => left.value.localeCompare(right.value));
  }
  return output;
}

function updateManifestData(manifest, previousFacets, nextFacets, { previousIndexed, previousRowCount, nextRowCount } = {}) {
  return {
    itemCount: Math.max(0, Number(manifest?.itemCount || 0) + (previousIndexed ? 0 : 1)),
    rowCount: Math.max(0, Number(manifest?.rowCount || 0) - Number(previousRowCount || 0) + Number(nextRowCount || 0)),
    facets: updateManifestFacets(manifest?.facets, previousFacets, nextFacets, previousIndexed),
    generatedAt: new Date().toISOString(),
    ready: true
  };
}

async function readIndexedItemRows(partitionKeys, itemId) {
  const partitions = [...new Set(partitionKeys)].filter(Boolean);
  const rows = [];
  const concurrency = 10;
  for (let offset = 0; offset < partitions.length; offset += concurrency) {
    const batch = partitions.slice(offset, offset + concurrency);
    const results = await Promise.all(batch.map((partitionKey) => readQuery({
      filter: odata`PartitionKey eq ${partitionKey} and itemId eq ${itemId}`,
      select: ["partitionKey", "rowKey", "itemId"]
    })));
    rows.push(...results.flat());
  }
  return rows;
}

async function syncItem(raw, { id, previous } = {}) {
  try {
    const status = await getStatus({ refresh: true });
    if (!status.ready) return { used: false, reason: status.reason, status };

    const itemId = String(id || raw?.id || "").trim();
    const nextRaw = itemId ? { ...raw, id: itemId } : raw;
    const next = index.buildItemSearchV2Entities([nextRaw], { ordinalOffset: INCREMENTAL_ORDINAL });
    if (next.indexedItems !== 1) return { used: false, reason: "invalid-item" };

    const previousRaw = previous && itemId ? { ...previous, id: itemId } : previous;
    const before = previousRaw
      ? index.buildItemSearchV2Entities([previousRaw], { ordinalOffset: INCREMENTAL_ORDINAL })
      : { entities: [], facets: {} };
    const partitions = [...before.entities, ...next.entities].map((entity) => entity.partitionKey);
    const indexedRows = await readIndexedItemRows(partitions, next.entities[0].itemId);
    const indexedKeys = new Set(indexedRows.map(entityKey));
    const nextKeys = new Set(next.entities.map(entityKey));

    await upsertEntities(next.entities);
    const staleRows = indexedRows.filter((entity) => !nextKeys.has(entityKey(entity)));
    if (staleRows.length) await submitTransactions(staleRows, "delete");

    const manifest = updateManifestData(status.manifest, before.facets, next.facets, {
      previousIndexed: indexedKeys.size > 0,
      previousRowCount: indexedKeys.size,
      nextRowCount: nextKeys.size
    });
    await writeManifest(manifest);
    return {
      used: true,
      version: index.ITEM_SEARCH_V2_VERSION,
      itemId: next.entities[0].itemId,
      insertedRows: [...nextKeys].filter((key) => !indexedKeys.has(key)).length,
      deletedRows: staleRows.length
    };
  } catch (error) {
    return { used: false, reason: "error", error };
  }
}

async function clearIndex({ onBatch } = {}) {
  const rows = await readQuery({ select: ["partitionKey", "rowKey"] }, Number.MAX_SAFE_INTEGER);
  const owned = rows.filter((row) => row.partitionKey === index.ITEM_SEARCH_V2_MANIFEST_PARTITION || String(row.partitionKey).startsWith(`${index.ITEM_SEARCH_V2_PREFIX}:`));
  const deleted = await submitTransactions(owned, "delete", { onBatch });
  statusCache = null;
  return deleted;
}

module.exports = {
  clearIndex,
  getStatus,
  getTableName,
  isEnabled,
  searchItemsV2,
  syncItem,
  upsertEntities,
  writeManifest,
  _test: {
    buildFacets,
    decodeCursor,
    encodeCursor,
    entityKey,
    matchesFilters,
    normalizeFilters,
    sortRows,
    updateManifestData,
    updateManifestFacets
  }
};
