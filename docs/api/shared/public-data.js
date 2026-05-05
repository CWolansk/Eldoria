const fs = require('fs');
const path = require('path');

const DATA_ROOT = path.join(__dirname, '..', 'data');
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_PATCH_BODY_BYTES = 32768;
let sqlPoolPromise = null;

function readJson(filename) {
  const filePath = path.join(DATA_ROOT, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function handlePlayers(params = {}, _query = {}, req = { method: 'GET' }) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return empty(204);
  if (method === 'PATCH') return handlePlayerPatch(params, req);
  if (method !== 'GET') return json(405, { error: 'method_not_allowed', message: 'Only GET and PATCH are supported.' });

  const players = await applyPlayerOverrides(readJson('players.json').map(stripLargeFields));
  const slug = params.slug;
  if (!slug) {
    return json(200, { count: players.length, players });
  }

  const player = findBySlug(players, slug, ['id', 'name', 'sheetTitle', 'url']);
  if (!player) return notFound('player', slug);
  return json(200, player);
}

function handleEntities(params = {}) {
  const entities = readJson('entities.json');
  const slug = params.slug;
  if (!slug) {
    return json(200, { count: entities.length, entities });
  }

  const entity = findBySlug(entities, slug, ['id', 'name', 'path', 'url']);
  if (!entity) return notFound('entity', slug);
  return json(200, entity);
}

function handleSearch(_params = {}, query = {}) {
  const documents = readJson('search-index.json');
  const q = stringValue(query.q);
  const type = stringValue(query.type);
  const region = stringValue(query.region);
  const location = stringValue(query.location);
  const limit = clamp(Number(query.limit) || DEFAULT_LIMIT, 1, MAX_LIMIT);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

  const results = documents
    .filter((document) => matchesFilter(document, 'type', type))
    .filter((document) => matchesFilter(document, 'region', region))
    .filter((document) => matchesFilter(document, 'location', location))
    .map((document) => {
      const score = scoreDocument(document, terms);
      return { ...stripLargeFields(document), score };
    })
    .filter((document) => !terms.length || document.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return json(200, {
    query: { q, type, region, location, limit },
    count: results.length,
    results,
  });
}

async function handlePlayerPatch(params = {}, req = {}) {
  const slug = stringValue(params.slug);
  if (!slug) return json(400, { error: 'missing_player', message: 'PATCH requires a player id.' });
  const body = req.body || {};
  if (JSON.stringify(body).length > MAX_PATCH_BODY_BYTES) {
    return json(413, { error: 'patch_too_large', message: 'Player edits must be smaller than 32 KB.' }, 'no-store');
  }

  const basePlayers = readJson('players.json').map(stripLargeFields);
  const basePlayer = findBySlug(basePlayers, slug, ['id', 'name', 'sheetTitle', 'url']);
  if (!basePlayer) return notFound('player', slug);

  const patch = sanitizePlayerPatch(body);
  if (!Object.keys(patch).length) {
    return json(400, { error: 'empty_patch', message: 'No editable player fields were provided.' }, 'no-store');
  }

  const pool = await getSqlPool();
  if (!pool) {
    return json(503, { error: 'sql_unavailable', message: 'Player cloud saves are not configured.' }, 'no-store');
  }

  await writePlayerOverride(pool, basePlayer.id, patch);
  return json(200, { ok: true, playerId: basePlayer.id, patch }, 'no-store');
}

function sanitizePlayerPatch(body) {
  const patch = {};
  const numberFields = {
    currentHp: [0, 999],
    tempHp: [0, 999],
    maxHp: [0, 999],
    ac: [1, 40],
    speed: [0, 300],
    gold: [0, 999999],
    heroPoints: [0, 99],
  };
  for (const [field, range] of Object.entries(numberFields)) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const value = nullableNumber(body[field]);
      if (value !== undefined) patch[field] = value === null ? null : clamp(value, range[0], range[1]);
    }
  }

  if (body.abilities && typeof body.abilities === 'object') {
    const abilities = {};
    for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const value = nullableNumber(body.abilities[ability]);
      if (value !== undefined && value !== null) abilities[ability] = clamp(value, 1, 30);
    }
    if (Object.keys(abilities).length) patch.abilities = abilities;
  }

  if (Array.isArray(body.equipment)) {
    patch.equipment = body.equipment.map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 80);
  }

  if (Array.isArray(body.equipped)) {
    patch.equipped = body.equipped.map(item => sanitizeText(item, 180)).filter(Boolean).slice(0, 80);
  }

  if (Array.isArray(body.spells)) {
    patch.spells = body.spells.map(spell => sanitizeText(spell, 120)).filter(Boolean).slice(0, 120);
  }

  if (Array.isArray(body.preparedSpells)) {
    patch.preparedSpells = body.preparedSpells.map(spell => sanitizeText(spell, 120)).filter(Boolean).slice(0, 120);
  }

  if (body.resourceUses && typeof body.resourceUses === 'object') {
    const values = sanitizeNumberMap(body.resourceUses, 0, 999, 120);
    if (Object.keys(values).length || Object.keys(body.resourceUses).length === 0) patch.resourceUses = values;
  }

  if (body.spellSlotUses && typeof body.spellSlotUses === 'object') {
    const values = sanitizeNumberMap(body.spellSlotUses, 0, 99, 20);
    if (Object.keys(values).length || Object.keys(body.spellSlotUses).length === 0) patch.spellSlotUses = values;
  }

  if (body.itemCharges && typeof body.itemCharges === 'object') {
    const values = sanitizeNumberMap(body.itemCharges, 0, 999, 120);
    if (Object.keys(values).length || Object.keys(body.itemCharges).length === 0) patch.itemCharges = values;
  }

  if (body.actionUses && typeof body.actionUses === 'object') {
    const values = sanitizeNumberMap(body.actionUses, 0, 999, 160);
    if (Object.keys(values).length || Object.keys(body.actionUses).length === 0) patch.actionUses = values;
  }

  if (Array.isArray(body.conditions)) {
    patch.conditions = body.conditions.map(condition => sanitizeText(condition, 80)).filter(Boolean).slice(0, 30);
  }

  if (body.temporaryEffects && typeof body.temporaryEffects === 'object') {
    const allowedEffects = new Set(['haste', 'mageArmor', 'shieldOfFaith', 'barkskin', 'shieldSpell', 'halfCover', 'threeQuartersCover']);
    const effects = {};
    const sourceEffects = body.temporaryEffects.effects && typeof body.temporaryEffects.effects === 'object'
      ? body.temporaryEffects.effects
      : body.temporaryEffects;
    for (const [key, value] of Object.entries(sourceEffects || {})) {
      if (allowedEffects.has(key)) effects[key] = Boolean(value);
    }
    const temporaryEffects = { effects };
    if (Object.prototype.hasOwnProperty.call(body.temporaryEffects, 'customName')) {
      temporaryEffects.customName = sanitizeText(body.temporaryEffects.customName, 80);
    }
    if (Object.prototype.hasOwnProperty.call(body.temporaryEffects, 'customAcBonus')) {
      const value = nullableNumber(body.temporaryEffects.customAcBonus);
      if (value !== undefined && value !== null) temporaryEffects.customAcBonus = clamp(value, -20, 20);
    }
    patch.temporaryEffects = temporaryEffects;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'concentration')) {
    patch.concentration = sanitizeText(body.concentration, 120);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
    patch.notes = sanitizeNote(body.notes, 20000);
  }

  return patch;
}

function sanitizeNumberMap(value, min, max, limit) {
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(value || {}).slice(0, limit)) {
    const key = sanitizeId(rawKey);
    if (!key) continue;
    const num = nullableNumber(rawValue);
    if (num === undefined || num === null) continue;
    out[key] = clamp(num, min, max);
  }
  return out;
}

function sanitizeId(value) {
  return stringValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function applyPlayerOverrides(players) {
  const pool = await getSqlPool();
  if (!pool || !players.length) return players;

  try {
    const overrides = await readPlayerOverrides(pool, players.map(player => player.id));
    return players.map(player => mergePlayerOverride(player, overrides.get(player.id)));
  } catch (error) {
    return players;
  }
}

function mergePlayerOverride(player, patch) {
  if (!patch) return player;
  return mergePlayerPatch(player, patch);
}

function mergePlayerPatch(base, patch) {
  if (!patch) return base;
  const merged = { ...base, ...patch };
  if (base.abilities || patch.abilities) {
    merged.abilities = {
      ...(base.abilities || {}),
      ...(patch.abilities || {}),
    };
  }
  return merged;
}

async function readPlayerOverrides(pool, playerIds) {
  const request = pool.request();
  const names = playerIds.map((id, index) => {
    const name = `player${index}`;
    request.input(name, id);
    return `@${name}`;
  });

  const result = await request.query(`
    SELECT PlayerId, SheetJson
    FROM publicapi.PlayerSheetOverrides
    WHERE PlayerId IN (${names.join(',')})
  `);

  const overrides = new Map();
  for (const row of result.recordset || []) {
    try {
      overrides.set(row.PlayerId, JSON.parse(row.SheetJson));
    } catch (error) {
      // Ignore malformed overrides and fall back to generated data.
    }
  }
  return overrides;
}

async function readPlayerOverride(pool, playerId) {
  const request = pool.request();
  request.input('PlayerId', playerId);
  const result = await request.query(`
    SELECT SheetJson
    FROM publicapi.PlayerSheetOverrides
    WHERE PlayerId = @PlayerId
  `);

  const row = (result.recordset || [])[0];
  if (!row) return {};
  try {
    return JSON.parse(row.SheetJson) || {};
  } catch (error) {
    return {};
  }
}

async function writePlayerOverride(pool, playerId, patch) {
  const existingPatch = await readPlayerOverride(pool, playerId);
  const mergedPatch = mergePlayerPatch(existingPatch, patch);
  const request = pool.request();
  request.input('PlayerId', playerId);
  request.input('SheetJson', JSON.stringify(mergedPatch));
  await request.query(`
    MERGE publicapi.PlayerSheetOverrides AS target
    USING (SELECT @PlayerId AS PlayerId, @SheetJson AS SheetJson) AS source
      ON target.PlayerId = source.PlayerId
    WHEN MATCHED THEN
      UPDATE SET SheetJson = source.SheetJson, UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
      INSERT (PlayerId, SheetJson) VALUES (source.PlayerId, source.SheetJson);
  `);
}

async function getSqlPool() {
  if (!process.env.SQL_SERVER || !process.env.SQL_DATABASE || process.env.SQL_SERVER.includes('YOUR_SQL_SERVER')) {
    return null;
  }

  if (!sqlPoolPromise) {
    sqlPoolPromise = createSqlPool().catch((error) => {
      sqlPoolPromise = null;
      throw error;
    });
  }

  try {
    return await sqlPoolPromise;
  } catch (error) {
    return null;
  }
}

async function createSqlPool() {
  let sql;
  try {
    sql = require('mssql');
  } catch (error) {
    return null;
  }

  const authMode = stringValue(process.env.SQL_AUTH_MODE || 'managed_identity');
  const config = {
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };

  if (authMode === 'sql') {
    config.user = process.env.SQL_USER;
    config.password = process.env.SQL_PASSWORD;
  } else {
    config.authentication = {
      type: 'azure-active-directory-msi-app-service',
    };
  }

  const pool = new sql.ConnectionPool(config);
  return pool.connect();
}

function matchesFilter(document, field, value) {
  if (!value) return true;
  return normalize(document[field]) === normalize(value);
}

function scoreDocument(document, terms) {
  if (!terms.length) return 1;
  const title = normalize(document.title);
  const summary = normalize(document.summary);
  const text = normalize(document.text);
  const haystack = `${title} ${summary} ${text}`;
  let score = 0;

  for (const term of terms) {
    if (!haystack.includes(term)) return 0;
    if (title.includes(term)) score += 8;
    if (summary.includes(term)) score += 4;
    if (text.includes(term)) score += 1;
  }

  return score;
}

function findBySlug(items, slug, fields) {
  const target = slugify(slug);
  return items.find((item) => fields.some((field) => slugify(item[field]) === target));
}

function stripLargeFields(item) {
  const copy = { ...item };
  delete copy.text;
  delete copy.searchText;
  return copy;
}

function json(status, body, cacheControl = 'public, max-age=60') {
  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, PATCH, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'vary': 'Origin',
    },
    body,
  };
}

function empty(status) {
  return {
    status,
    headers: {
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, PATCH, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'vary': 'Origin',
    },
  };
}

function notFound(kind, slug) {
  return json(404, {
    error: 'not_found',
    message: `No ${kind} found for slug "${slug}".`,
  });
}

function stringValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function sanitizeText(value, maxLength) {
  return stringValue(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeNote(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\r\n/g, '\n')
    .slice(0, maxLength);
}

function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

function slugify(value) {
  return normalize(value)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = {
  handleEntities,
  handlePlayers,
  handleSearch,
  slugify,
};
