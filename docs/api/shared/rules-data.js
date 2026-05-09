const fs = require('fs');
const path = require('path');
const { getRulesTable, isNotFound, packJson, tableTimestamp, unpackJson } = require('./table-storage');

const RULES_ROOT = path.join(__dirname, '..', '..', 'Assets', 'Rules');
const DEFAULT_RULES_TABLE = 'Rules';
const DOCUMENT_ROW_KEY = '__document__';
const RULE_JSON_PREFIX = 'RuleJson';
const MAX_RULE_BODY_BYTES = 512 * 1024;
const COLLECTION_ALIASES = Object.freeze({
  profile: 'ruleset-profile',
  overrides: 'rule-overrides',
});

async function handleRules(params = {}, query = {}, req = { method: 'GET' }) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return empty(204);
  if (method === 'GET') return handleRulesGet(params, query);
  if (method === 'PUT' || method === 'PATCH') return handleRuleSave(params, req, method);
  return json(405, {
    error: 'method_not_allowed',
    message: 'GET, PUT, PATCH, and OPTIONS are supported.',
  });
}

async function handleRulesGet(params = {}, _query = {}) {
  const collection = normalizeCollection(params.collection);
  const id = sanitizeRuleId(params.id);
  if (params.collection && !collection) {
    return json(400, { error: 'bad_collection', message: 'Rule collection must be a JSON filename slug.' });
  }

  const storage = await getRulesTableSafe();
  if (!collection) {
    if (storage.table) {
      try {
        const collections = await readTableCollectionSummaries(storage.table);
        if (!collections.length) return json(200, readStaticCollectionSummary('static'), 'static');
        return json(200, { count: collections.length, collections, storage: 'table' }, 'table');
      } catch {
        return json(200, readStaticCollectionSummary('static'), 'static');
      }
    }

    return json(200, readStaticCollectionSummary('static'), 'static');
  }

  if (storage.table) {
    try {
      if (id) {
        const rule = await readRuleById(storage.table, collection, id);
        if (!rule) return notFound('rule', `${collection}/${id}`);
        return json(200, { collection, id: rule.id || id, rule, storage: 'table' }, 'table');
      }

      const document = await readRulesCollectionFromTable(storage.table, collection);
      if (!document) return readStaticRulesResponse(collection, id);
      return json(200, buildCollectionBody(collection, document, 'table'), 'table');
    } catch {
      return readStaticRulesResponse(collection, id);
    }
  }

  return readStaticRulesResponse(collection, id);
}

async function handleRuleSave(params = {}, req = {}, method = 'PUT') {
  const collection = normalizeCollection(params.collection);
  const id = sanitizeRuleId(params.id);
  if (!collection || !id) {
    return json(400, {
      error: 'missing_rule',
      message: 'PUT and PATCH require /api/rules/{collection}/{id}.',
    });
  }

  const body = req.body || {};
  if (JSON.stringify(body).length > MAX_RULE_BODY_BYTES) {
    return json(413, { error: 'rule_too_large', message: 'Rule records must be smaller than 512 KB.' });
  }

  if (!isPlainObject(body)) {
    return json(400, { error: 'bad_rule', message: 'Rule body must be a JSON object.' });
  }

  const bodyId = sanitizeRuleId(body.id);
  if (bodyId && bodyId !== id) {
    return json(400, { error: 'id_mismatch', message: 'Rule body id must match the route id.' });
  }

  const storage = await getRulesTableSafe();
  if (!storage.table) {
    return writeStaticRuleResponse(collection, id, body, method);
  }

  const existing = method === 'PATCH' ? await readRuleById(storage.table, collection, id) : null;
  if (method === 'PATCH' && !existing) return notFound('rule', `${collection}/${id}`);

  const cleanBody = sanitizeJsonValue(body, 30);
  const rule = method === 'PATCH'
    ? { ...mergeRule(existing, cleanBody), id }
    : { ...cleanBody, id };

  await writeRuleRecord(storage.table, collection, id, rule);
  return json(200, { ok: true, collection, id, rule, storage: 'table' }, 'table');
}

function writeStaticRuleResponse(collection, id, body, method = 'PUT') {
  const document = readStaticRulesCollection(collection);
  if (!document || document.kind !== 'array') {
    return json(503, {
      error: 'storage_unavailable',
      message: 'Rules cloud storage is not configured and this rule collection is not writable as a local array.',
    });
  }

  const index = document.data.findIndex((rule) => slugify(rule.id || rule.name || rule.title) === slugify(id));
  if (method === 'PATCH' && index < 0) return notFound('rule', `${collection}/${id}`);

  const cleanBody = sanitizeJsonValue(body, 30);
  const existing = index >= 0 ? document.data[index] : {};
  const rule = method === 'PATCH'
    ? { ...mergeRule(existing, cleanBody), id }
    : { ...cleanBody, id };
  const nextData = document.data.slice();
  if (index >= 0) nextData[index] = rule;
  else nextData.push(rule);

  writeStaticRulesCollection(collection, nextData);
  return json(200, { ok: true, collection, id, rule, storage: 'static-local' }, 'static-local');
}

async function seedRulesFromStaticFiles(options = {}) {
  const table = await getRulesTable();
  if (!table) {
    throw new Error('Table Storage is not configured. Set TABLE_STORAGE_ACCOUNT/TABLE_STORAGE_ENDPOINT or a Table Storage connection string.');
  }

  const requested = new Set((options.collections || []).map(normalizeCollection).filter(Boolean));
  const summaries = [];
  let totalRecords = 0;

  for (const summary of listStaticRuleCollections()) {
    if (requested.size && !requested.has(summary.collection)) continue;
    const document = readStaticRulesCollection(summary.collection);
    let count = 0;

    if (document.kind === 'array') {
      const entities = [];
      for (const rule of document.data) {
        const id = sanitizeRuleId(rule.id);
        if (!id) continue;
        entities.push(buildRuleRecordEntity(summary.collection, id, rule, null));
        count += 1;
      }
      await writeRuleRecordBatch(table, entities);
    } else {
      await writeRuleDocument(table, summary.collection, document.data, { skipExistingRead: true });
      count = 1;
    }

    totalRecords += count;
    summaries.push({ collection: summary.collection, kind: document.kind, count });
  }

  return {
    table: process.env.RULES_TABLE || DEFAULT_RULES_TABLE,
    count: totalRecords,
    collections: summaries,
  };
}

async function getRulesTableSafe() {
  try {
    return { table: await getRulesTable() };
  } catch {
    return { table: null };
  }
}

function readStaticRulesResponse(collection, id) {
  const document = readStaticRulesCollection(collection);
  if (!document) return notFound('rule collection', collection);

  if (id) {
    const rule = findRuleInDocument(document, id);
    if (!rule) return notFound('rule', `${collection}/${id}`);
    return json(200, { collection, id: rule.id || id, rule, storage: 'static' }, 'static');
  }

  return json(200, buildCollectionBody(collection, document, 'static'), 'static');
}

function buildCollectionBody(collection, document, storage) {
  if (document.kind === 'document') {
    return {
      collection,
      kind: 'document',
      document: document.data,
      storage,
    };
  }

  return {
    collection,
    kind: 'array',
    count: document.data.length,
    rules: document.data,
    storage,
  };
}

function readStaticCollectionSummary(storage) {
  const collections = listStaticRuleCollections();
  return { count: collections.length, collections, storage };
}

function listStaticRuleCollections() {
  if (!fs.existsSync(RULES_ROOT)) return [];
  return fs.readdirSync(RULES_ROOT)
    .filter((fileName) => fileName.toLowerCase().endsWith('.json'))
    .map((fileName) => {
      const collection = normalizeCollection(path.basename(fileName, '.json'));
      const document = readJsonFile(path.join(RULES_ROOT, fileName));
      const kind = Array.isArray(document) ? 'array' : 'document';
      const count = Array.isArray(document) ? document.length : Object.keys(document || {}).length;
      return { collection, fileName, kind, count };
    })
    .filter((entry) => entry.collection)
    .sort((a, b) => a.collection.localeCompare(b.collection));
}

function readStaticRulesCollection(collection) {
  const safeCollection = normalizeCollection(collection);
  if (!safeCollection) return null;

  const filePath = getStaticRulesFilePath(safeCollection);
  if (!filePath || !fs.existsSync(filePath)) return null;

  const data = readJsonFile(filePath);
  return {
    kind: Array.isArray(data) ? 'array' : 'document',
    data,
  };
}

function writeStaticRulesCollection(collection, data) {
  const filePath = getStaticRulesFilePath(collection);
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Static rules collection ${collection} is not writable.`);
  }
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function getStaticRulesFilePath(collection) {
  const safeCollection = normalizeCollection(collection);
  if (!safeCollection) return '';
  const filePath = path.resolve(RULES_ROOT, `${safeCollection}.json`);
  const root = path.resolve(RULES_ROOT);
  return filePath.startsWith(`${root}${path.sep}`) ? filePath : '';
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function readTableCollectionSummaries(table) {
  const summaries = new Map();
  const iterator = table.listEntities({
    queryOptions: {
      select: ['PartitionKey', 'RowKey', 'collection', 'ruleId', 'name', 'title', 'source', 'kind', 'isDocument', 'updatedAtUtc'],
    },
  });

  for await (const entity of iterator) {
    const collection = normalizeCollection(entity.collection || entity.partitionKey);
    if (!collection) continue;
    const current = summaries.get(collection) || { collection, kind: 'array', count: 0, updatedAtUtc: '' };
    current.count += 1;
    if (entity.isDocument || entity.rowKey === DOCUMENT_ROW_KEY) current.kind = 'document';
    const updatedAtUtc = tableTimestamp(entity.updatedAtUtc || entity.timestamp);
    if (updatedAtUtc > current.updatedAtUtc) current.updatedAtUtc = updatedAtUtc;
    summaries.set(collection, current);
  }

  return Array.from(summaries.values()).sort((a, b) => a.collection.localeCompare(b.collection));
}

async function readRulesCollectionFromTable(table, collection) {
  const rules = [];
  let document = null;
  const filter = `PartitionKey eq '${escapeODataValue(collection)}'`;
  for await (const entity of table.listEntities({ queryOptions: { filter } })) {
    const rule = unpackJson(entity, RULE_JSON_PREFIX);
    if (entity.isDocument || entity.rowKey === DOCUMENT_ROW_KEY) {
      document = rule;
      continue;
    }

    rules.push({ ...rule, id: rule.id || entity.rowKey });
  }

  if (document && !rules.length) return { kind: 'document', data: document };
  if (!rules.length) return null;
  rules.sort((a, b) => String(a.name || a.title || a.id).localeCompare(String(b.name || b.title || b.id)));
  return { kind: 'array', data: rules };
}

async function readRuleById(table, collection, id) {
  const direct = await readRuleEntity(table, collection, id);
  if (direct) return direct;

  const document = await readRulesCollectionFromTable(table, collection);
  if (!document) return null;
  return findRuleInDocument(document, id);
}

async function readRuleEntity(table, collection, id) {
  try {
    const entity = await table.getEntity(collection, id);
    const rule = unpackJson(entity, RULE_JSON_PREFIX);
    if (entity.isDocument || entity.rowKey === DOCUMENT_ROW_KEY) return rule;
    return { ...rule, id: rule.id || entity.rowKey };
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return null;
  }
}

function findRuleInDocument(document, id) {
  if (!document) return null;
  if (document.kind === 'array') {
    const target = slugify(id);
    return document.data.find((rule) => ['id', 'name', 'title'].some((field) => slugify(rule[field]) === target)) || null;
  }

  if (id === DOCUMENT_ROW_KEY) return document.data;
  if (Object.prototype.hasOwnProperty.call(document.data || {}, id)) return document.data[id];

  const target = slugify(id);
  const entry = Object.entries(document.data || {}).find(([key]) => slugify(key) === target);
  return entry ? entry[1] : null;
}

async function writeRuleRecord(table, collection, id, rule, options = {}) {
  const existing = options.skipExistingRead ? null : await readRuleEntity(table, collection, id);
  await table.upsertEntity(buildRuleRecordEntity(collection, id, rule, existing), 'Replace');
}

function buildRuleRecordEntity(collection, id, rule, existing = null) {
  const now = new Date().toISOString();
  const cleanRule = sanitizeJsonValue({ ...rule, id }, 30);
  const createdAtUtc = tableTimestamp(existing?.createdAtUtc) || now;

  return {
    partitionKey: collection,
    rowKey: id,
    collection,
    ruleId: id,
    name: stringValue(cleanRule.name).slice(0, 200),
    title: stringValue(cleanRule.title).slice(0, 240),
    source: stringValue(cleanRule.source).slice(0, 80),
    sourceType: stringValue(cleanRule.sourceType).slice(0, 80),
    kind: stringValue(cleanRule.kind || cleanRule.type).slice(0, 80),
    isDocument: false,
    createdAtUtc,
    updatedAtUtc: now,
    ...packJson(RULE_JSON_PREFIX, cleanRule),
  };
}

async function writeRuleRecordBatch(table, entities) {
  for (const chunk of chunkArray(entities, 50)) {
    if (!chunk.length) continue;
    const actions = chunk.map(entity => ['upsert', entity, 'Replace']);
    try {
      await table.submitTransaction(actions);
    } catch {
      for (const entity of chunk) {
        await table.upsertEntity(entity, 'Replace');
      }
    }
  }
}

async function writeRuleDocument(table, collection, document, options = {}) {
  const now = new Date().toISOString();
  const cleanDocument = sanitizeJsonValue(document, 30);
  const existing = options.skipExistingRead ? null : await readRuleEntity(table, collection, DOCUMENT_ROW_KEY);
  const createdAtUtc = tableTimestamp(existing?.createdAtUtc) || now;

  await table.upsertEntity({
    partitionKey: collection,
    rowKey: DOCUMENT_ROW_KEY,
    collection,
    ruleId: DOCUMENT_ROW_KEY,
    name: collection,
    isDocument: true,
    createdAtUtc,
    updatedAtUtc: now,
    ...packJson(RULE_JSON_PREFIX, cleanDocument),
  }, 'Replace');
}

function mergeRule(base, patch) {
  if (!isPlainObject(base)) return patch;
  if (!isPlainObject(patch)) return base;

  const merged = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    merged[key] = isPlainObject(value) && isPlainObject(base[key])
      ? mergeRule(base[key], value)
      : value;
  }
  return merged;
}

function sanitizeJsonValue(value, depth = 10) {
  if (depth <= 0) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return sanitizeJsonText(value, 100000);
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonValue(item, depth - 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      const cleanKey = sanitizeText(key, 160);
      if (!cleanKey) continue;
      out[cleanKey] = sanitizeJsonValue(val, depth - 1);
    }
    return out;
  }
  return null;
}

function normalizeCollection(value) {
  const clean = stringValue(value)
    .toLowerCase()
    .replace(/\.json$/i, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return COLLECTION_ALIASES[clean] || clean;
}

function sanitizeRuleId(value) {
  return stringValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function slugify(value) {
  return stringValue(value)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeText(value, maxLength) {
  return stringValue(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeJsonText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/\r\n/g, '\n')
    .slice(0, maxLength);
}

function stringValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function escapeODataValue(value) {
  return String(value || '').replace(/'/g, "''");
}

function chunkArray(values, size) {
  const out = [];
  for (let index = 0; index < values.length; index += size) {
    out.push(values.slice(index, index + size));
  }
  return out;
}

function json(status, body, storage = '') {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PUT, PATCH, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'Origin',
  };
  if (storage) headers['x-eldoria-rules-storage'] = storage;
  return { status, headers, body };
}

function empty(status) {
  return {
    status,
    headers: {
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, PUT, PATCH, OPTIONS',
      'access-control-allow-headers': 'content-type',
      vary: 'Origin',
    },
  };
}

function notFound(kind, slug) {
  return json(404, {
    error: 'not_found',
    message: `No ${kind} found for slug "${slug}".`,
  });
}

module.exports = {
  handleRules,
  seedRulesFromStaticFiles,
  _test: {
    buildCollectionBody,
    findRuleInDocument,
    listStaticRuleCollections,
    normalizeCollection,
    readStaticRulesCollection,
    sanitizeRuleId,
  },
};
