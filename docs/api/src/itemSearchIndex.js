"use strict";

const model = require("./catalogModel");

const ITEM_SEARCH_INDEX_KIND = "items";
const ITEM_SEARCH_INDEX_VERSION = "items-v1-suffix-prefix";
const ITEM_SEARCH_MANIFEST_PARTITION = "_manifest";
const ITEM_SEARCH_MANIFEST_ROW_KEY = "items";
const ITEM_SEARCH_PARTITION_PREFIX = `${ITEM_SEARCH_INDEX_KIND}:v1`;
const MIN_INDEX_TERM_LENGTH = 3;
const MAX_INDEX_TERM_LENGTH = 32;
const ROW_KEY_DELIMITER = "|";
const ROW_KEY_PREFIX_END = "~";

const SEARCH_ROW_COLUMNS = [
  "partitionKey",
  "rowKey",
  "kind",
  "version",
  "term",
  "itemId",
  "ordinal",
  "name",
  "nameLower",
  "source",
  "page",
  "rarity",
  "type",
  "typeCode",
  "prop",
  "category",
  "attunement",
  "value",
  "valueLabel",
  "weight",
  "weaponCategory",
  "damageType",
  "isWeapon",
  "isArmor",
  "wondrous",
  "baseItem",
  "baseItemName",
  "baseItemSource"
];

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function tokenize(value) {
  return normalizeSearchText(value)
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getSearchTokenSuffixes(token) {
  const normalized = normalizeSearchText(token).replace(/\s+/gu, "");
  if (normalized.length < MIN_INDEX_TERM_LENGTH) {
    return [];
  }

  const terms = [];
  for (let index = 0; index <= normalized.length - MIN_INDEX_TERM_LENGTH; index += 1) {
    const suffix = normalized.slice(index, index + MAX_INDEX_TERM_LENGTH);
    if (suffix.length >= MIN_INDEX_TERM_LENGTH) {
      terms.push(suffix);
    }
  }
  return terms;
}

function getItemSearchTerms(item) {
  const terms = new Set();
  for (const token of tokenize(`${item?.name || ""} ${item?.source || ""}`)) {
    for (const term of getSearchTokenSuffixes(token)) {
      terms.add(term);
    }
  }
  return [...terms].sort();
}

function getItemSearchQueryTerms(query) {
  const terms = tokenize(query)
    .map((term) => term.slice(0, MAX_INDEX_TERM_LENGTH))
    .filter((term) => term.length >= MIN_INDEX_TERM_LENGTH);
  return [...new Set(terms)];
}

function getItemSearchPartitionKey(term) {
  const bucket = String(term || "").slice(0, 2).padEnd(2, "_");
  return `${ITEM_SEARCH_PARTITION_PREFIX}:${bucket}`;
}

function getItemSearchRowKeyPrefix(term) {
  return String(term || "").slice(0, MAX_INDEX_TERM_LENGTH);
}

function getItemSearchRowKey(term, ordinal, itemId) {
  const normalizedTerm = getItemSearchRowKeyPrefix(term);
  const paddedOrdinal = String(Number(ordinal) >= 0 ? Number(ordinal) : 0).padStart(8, "0");
  return model.sanitizeKey([
    normalizedTerm,
    paddedOrdinal,
    itemId
  ].join(ROW_KEY_DELIMITER));
}

function getItemSearchRowKeyRange(term) {
  const prefix = getItemSearchRowKeyPrefix(term);
  return {
    start: prefix,
    end: `${prefix}${ROW_KEY_PREFIX_END}`
  };
}

function makeItemSearchEntity(publicRow, term, ordinal) {
  const itemId = publicRow.id;
  return {
    ...publicRow,
    partitionKey: getItemSearchPartitionKey(term),
    rowKey: getItemSearchRowKey(term, ordinal, itemId),
    kind: ITEM_SEARCH_INDEX_KIND,
    version: ITEM_SEARCH_INDEX_VERSION,
    term,
    itemId,
    ordinal,
    nameLower: String(publicRow.name || "").trim().toLowerCase()
  };
}

function buildItemSearchEntities(rawItems = []) {
  const entities = [];
  const seenRows = new Set();
  const seenItems = new Set();
  let indexedItems = 0;

  rawItems.forEach((rawItem, ordinal) => {
    const publicRow = model.toPublicCatalogRow(ITEM_SEARCH_INDEX_KIND, rawItem);
    if (!publicRow.id || !publicRow.name) {
      return;
    }
    if (seenItems.has(publicRow.id)) {
      return;
    }

    const terms = getItemSearchTerms(publicRow);
    if (!terms.length) {
      return;
    }

    seenItems.add(publicRow.id);
    indexedItems += 1;
    for (const term of terms) {
      const entity = makeItemSearchEntity(publicRow, term, ordinal);
      const key = `${entity.partitionKey}\n${entity.rowKey}`;
      if (seenRows.has(key)) {
        continue;
      }
      seenRows.add(key);
      entities.push(entity);
    }
  });

  return {
    entities,
    indexedItems,
    version: ITEM_SEARCH_INDEX_VERSION
  };
}

function itemSearchManifestEntity({ itemCount = 0, rowCount = 0, generatedAt = new Date().toISOString() } = {}) {
  return {
    partitionKey: ITEM_SEARCH_MANIFEST_PARTITION,
    rowKey: ITEM_SEARCH_MANIFEST_ROW_KEY,
    kind: ITEM_SEARCH_INDEX_KIND,
    version: ITEM_SEARCH_INDEX_VERSION,
    itemCount,
    rowCount,
    minTermLength: MIN_INDEX_TERM_LENGTH,
    maxTermLength: MAX_INDEX_TERM_LENGTH,
    generatedAt
  };
}

function isReadyItemSearchManifest(entity) {
  return Boolean(entity)
    && entity.version === ITEM_SEARCH_INDEX_VERSION
    && entity.kind === ITEM_SEARCH_INDEX_KIND
    && Number(entity.rowCount || 0) > 0;
}

function toItemSearchResult(entity) {
  if (!entity) {
    return null;
  }

  const result = {
    kind: ITEM_SEARCH_INDEX_KIND,
    id: entity.itemId || entity.id || entity.entityId || entity.rowKey
  };
  for (const [key, value] of Object.entries(entity)) {
    if ([
      "partitionKey",
      "rowKey",
      "etag",
      "timestamp",
      "version",
      "term",
      "itemId",
      "ordinal",
      "nameLower"
    ].includes(key)) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

function scoreItemSearchResult(row, terms) {
  const name = normalizeSearchText(row?.name);
  const source = normalizeSearchText(row?.source);
  const nameTokens = tokenize(row?.name);
  let score = 0;

  for (const term of terms) {
    if (name === term) {
      score += 0;
    } else if (nameTokens.includes(term)) {
      score += 10;
    } else if (name.startsWith(term) || nameTokens.some((token) => token.startsWith(term))) {
      score += 20;
    } else if (nameTokens.some((token) => token.endsWith(term))) {
      score += 30;
    } else if (name.includes(term)) {
      score += 40;
    } else if (source.startsWith(term)) {
      score += 50;
    } else if (source.includes(term)) {
      score += 60;
    } else {
      score += 100;
    }
  }

  return score;
}

module.exports = {
  ITEM_SEARCH_INDEX_KIND,
  ITEM_SEARCH_INDEX_VERSION,
  ITEM_SEARCH_MANIFEST_PARTITION,
  ITEM_SEARCH_MANIFEST_ROW_KEY,
  ITEM_SEARCH_PARTITION_PREFIX,
  MAX_INDEX_TERM_LENGTH,
  MIN_INDEX_TERM_LENGTH,
  SEARCH_ROW_COLUMNS,
  buildItemSearchEntities,
  getItemSearchPartitionKey,
  getItemSearchQueryTerms,
  getItemSearchRowKeyRange,
  isReadyItemSearchManifest,
  itemSearchManifestEntity,
  normalizeSearchText,
  scoreItemSearchResult,
  toItemSearchResult
};
