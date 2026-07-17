"use strict";

const model = require("./catalogModel");

const ITEM_SEARCH_V2_VERSION = "items-v2-compact-faceted";
const ITEM_SEARCH_V2_MANIFEST_PARTITION = "_manifest";
const ITEM_SEARCH_V2_MANIFEST_ROW_KEY = "items-v2";
const ITEM_SEARCH_V2_PREFIX = "items:v2";
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 32;
const SORTS = ["relevance", "name", "rarity", "type", "source"];
const FACET_FIELDS = ["source", "rarity", "type", "attunement", "damage", "properties", "mastery"];
const RARITY_ORDER = ["none", "common", "uncommon", "rare", "very rare", "legendary", "artifact"];

const SUMMARY_COLUMNS = [
  "partitionKey", "rowKey", "itemId", "ordinal", "name", "nameLower", "searchText", "source",
  "rarity", "type", "category", "attunement", "damage", "properties", "mastery", "weight", "valueLabel"
];

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function tokenize(value) {
  return normalize(value).split(/\s+/u).filter(Boolean);
}

function list(value) {
  if (!Array.isArray(value)) {
    return value == null || value === "" ? [] : [String(value)];
  }
  return value.flatMap((entry) => {
    if (entry && typeof entry === "object") {
      return entry.name || entry.full || entry.code || entry.abbreviation || entry.value || "";
    }
    return entry;
  }).map((entry) => String(entry || "").trim()).filter(Boolean);
}

function unique(values) {
  const seen = new Map();
  for (const value of values) {
    const text = String(value || "").trim();
    const key = normalize(text);
    if (text && key && !seen.has(key)) {
      seen.set(key, text);
    }
  }
  return [...seen.values()];
}

function itemProperties(raw) {
  return unique([
    ...list(raw.properties),
    ...list(raw.property),
    ...list(raw._propertyListText)
  ]).join(" | ");
}

function itemMastery(raw) {
  return unique([
    ...list(raw.mastery),
    ...list(raw.masteries),
    ...list(raw.weaponMastery)
  ]).join(" | ");
}

function compactSummary(raw, ordinal) {
  const row = model.toPublicCatalogRow("items", raw);
  const name = String(row.name || raw.name || "").trim();
  const source = String(row.source || raw.source || "").trim();
  const type = String(row.type || row.category || "Item").trim();
  return {
    itemId: row.id,
    ordinal,
    name,
    nameLower: normalize(name),
    searchText: normalize(`${name} ${source}`),
    source,
    rarity: String(row.rarity || "none").trim().toLowerCase(),
    type,
    category: String(row.category || "").trim(),
    attunement: Boolean(row.attunement),
    damage: String(raw.damage || row.damageType || "").trim(),
    properties: itemProperties(raw),
    mastery: itemMastery(raw),
    weight: row.weight,
    valueLabel: String(row.valueLabel || (row.value == null ? "" : row.value)).trim()
  };
}

function getQueryTerms(query) {
  return [...new Set(tokenize(query)
    .map((term) => term.slice(0, MAX_QUERY_LENGTH))
    .filter((term) => term.length >= MIN_QUERY_LENGTH))];
}

function suffixes(token) {
  const out = [];
  for (let index = 0; index <= token.length - MIN_QUERY_LENGTH; index += 1) {
    out.push(token.slice(index, index + MAX_QUERY_LENGTH));
  }
  return out;
}

function textPartition(term) {
  return `${ITEM_SEARCH_V2_PREFIX}:t:${String(term || "").slice(0, 2).padEnd(2, "_")}`;
}

function textRange(term) {
  const prefix = String(term || "").slice(0, MAX_QUERY_LENGTH);
  return { start: prefix, end: `${prefix}~` };
}

function paddedOrdinal(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(8, "0");
}

function textRow(summary, term) {
  return {
    ...summary,
    partitionKey: textPartition(term),
    rowKey: model.sanitizeKey(`${term}|${paddedOrdinal(summary.ordinal)}|${summary.itemId}`)
  };
}

function sortKey(summary, sort) {
  if (sort === "rarity") {
    const rank = RARITY_ORDER.indexOf(summary.rarity);
    return `${String(rank < 0 ? 999 : rank).padStart(3, "0")}|${summary.nameLower}`;
  }
  if (sort === "type") return `${normalize(summary.type)}|${summary.nameLower}`;
  if (sort === "source") return `${normalize(summary.source)}|${summary.nameLower}`;
  return summary.nameLower;
}

function browseRow(summary, sort) {
  return {
    ...summary,
    partitionKey: `${ITEM_SEARCH_V2_PREFIX}:b:${sort}`,
    rowKey: model.sanitizeKey(`${sortKey(summary, sort)}|${paddedOrdinal(summary.ordinal)}|${summary.itemId}`)
  };
}

function facetValues(summary, field) {
  if (field === "attunement") return [summary.attunement ? "required" : "not required"];
  if (field === "properties" || field === "mastery") return unique(String(summary[field] || "").split("|"));
  return unique([summary[field]]);
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function facetPartition(field, value) {
  const normalized = normalize(value);
  const slug = normalized.replace(/\s+/gu, "-").slice(0, 32) || "empty";
  return `${ITEM_SEARCH_V2_PREFIX}:f:${field}:${slug}:${stableHash(normalized)}`;
}

function facetRow(summary, field, value) {
  return {
    ...summary,
    facetField: field,
    facetValue: value,
    partitionKey: facetPartition(field, value),
    rowKey: model.sanitizeKey(`${summary.nameLower}|${paddedOrdinal(summary.ordinal)}|${summary.itemId}`)
  };
}

function buildItemSearchV2Entities(rawItems = [], { ordinalOffset = 0 } = {}) {
  const entities = [];
  const facets = Object.fromEntries(FACET_FIELDS.map((field) => [field, new Map()]));
  const seenItems = new Set();
  let indexedItems = 0;
  const firstOrdinal = Math.max(0, Number(ordinalOffset) || 0);

  rawItems.forEach((raw, itemIndex) => {
    const ordinal = firstOrdinal + itemIndex;
    const summary = compactSummary(raw, ordinal);
    if (!summary.itemId || !summary.name || seenItems.has(summary.itemId)) return;
    seenItems.add(summary.itemId);
    indexedItems += 1;

    const terms = new Set(tokenize(summary.searchText).flatMap(suffixes));
    for (const term of terms) entities.push(textRow(summary, term));
    for (const sort of SORTS.filter((entry) => entry !== "relevance")) entities.push(browseRow(summary, sort));
    for (const field of FACET_FIELDS) {
      for (const value of facetValues(summary, field)) {
        const key = normalize(value);
        const current = facets[field].get(key) || { value, count: 0 };
        current.count += 1;
        facets[field].set(key, current);
        entities.push(facetRow(summary, field, value));
      }
    }
  });

  const publicFacets = {};
  for (const field of FACET_FIELDS) {
    publicFacets[field] = [...facets[field].values()].sort((left, right) => left.value.localeCompare(right.value));
  }
  return { entities, indexedItems, facets: publicFacets, version: ITEM_SEARCH_V2_VERSION };
}

function manifestEntity({ itemCount = 0, rowCount = 0, facets = {}, generatedAt = new Date().toISOString(), ready = true } = {}) {
  return {
    partitionKey: ITEM_SEARCH_V2_MANIFEST_PARTITION,
    rowKey: ITEM_SEARCH_V2_MANIFEST_ROW_KEY,
    version: ITEM_SEARCH_V2_VERSION,
    itemCount,
    rowCount,
    generatedAt,
    ready: Boolean(ready),
    facetsJson: JSON.stringify(facets)
  };
}

function isReadyManifest(entity) {
  return Boolean(entity?.ready)
    && entity.version === ITEM_SEARCH_V2_VERSION
    && Number(entity.itemCount || 0) > 0
    && Number(entity.rowCount || 0) > 0;
}

function toPublicResult(entity) {
  if (!entity) return null;
  return {
    kind: "items",
    id: entity.itemId,
    name: entity.name || "",
    source: entity.source || "",
    rarity: entity.rarity || "none",
    type: entity.type || entity.category || "Item",
    category: entity.category || "",
    attunement: Boolean(entity.attunement),
    damageType: entity.damage || "",
    properties: entity.properties || "",
    mastery: entity.mastery || "",
    weight: entity.weight,
    valueLabel: entity.valueLabel || ""
  };
}

function score(entity, terms) {
  const name = normalize(entity?.name);
  const source = normalize(entity?.source);
  const nameTokens = tokenize(entity?.name);
  return terms.reduce((total, term) => {
    if (name === term) return total;
    if (nameTokens.includes(term)) return total + 10;
    if (name.startsWith(term) || nameTokens.some((token) => token.startsWith(term))) return total + 20;
    if (nameTokens.some((token) => token.endsWith(term))) return total + 30;
    if (name.includes(term)) return total + 40;
    if (source.startsWith(term)) return total + 50;
    if (source.includes(term)) return total + 60;
    return total + 100;
  }, 0);
}

module.exports = {
  FACET_FIELDS,
  ITEM_SEARCH_V2_MANIFEST_PARTITION,
  ITEM_SEARCH_V2_MANIFEST_ROW_KEY,
  ITEM_SEARCH_V2_PREFIX,
  ITEM_SEARCH_V2_VERSION,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  SORTS,
  SUMMARY_COLUMNS,
  buildItemSearchV2Entities,
  browseRow,
  facetPartition,
  facetValues,
  getQueryTerms,
  isReadyManifest,
  manifestEntity,
  normalize,
  score,
  textPartition,
  textRange,
  toPublicResult
};
