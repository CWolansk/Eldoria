const fs = require('fs');
const path = require('path');
const { getPlayerSheetsTable, isNotFound, packJson, tableTimestamp, unpackJson } = require('./table-storage');

const DATA_ROOT = path.join(__dirname, '..', 'data');
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_PATCH_BODY_BYTES = 32768;
const MAX_PLAYER_BODY_BYTES = 512 * 1024;
const PLAYER_SHEETS_PARTITION = 'player';

function readJson(filename) {
  const filePath = path.join(DATA_ROOT, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function handlePlayers(params = {}, _query = {}, req = { method: 'GET' }) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return empty(204);
  if (method === 'PATCH') return handlePlayerPatch(params, req);
  if (method === 'PUT' || method === 'POST') return handlePlayerSave(params, req);
  if (method !== 'GET') return json(405, { error: 'method_not_allowed', message: 'GET, PUT, POST, PATCH, and OPTIONS are supported.' }, 'no-store');

  const table = await getPlayerSheetsTable();
  const slug = params.slug;
  if (!table) {
    return json(503, {
      error: 'storage_unavailable',
      message: 'Player sheet cloud storage is not configured.',
    }, 'no-store');
  }

  if (!slug) {
    const players = await readPlayerSheets(table);
    return json(200, { count: players.length, players, storage: 'table' }, 'no-store');
  }

  const player = await readPlayerSheetBySlug(table, slug);
  if (!player) return notFound('player', slug);
  return json(200, { ...player, storage: 'table' }, 'no-store');
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

  const patch = sanitizePlayerPatch(body);
  if (!Object.keys(patch).length) {
    return json(400, { error: 'empty_patch', message: 'No editable player fields were provided.' }, 'no-store');
  }

  const table = await getPlayerSheetsTable();
  if (!table) {
      return json(503, { error: 'storage_unavailable', message: 'Player cloud saves are not configured.' }, 'no-store');
  }

  const existingPlayer = await readPlayerSheetBySlug(table, slug);
  if (!existingPlayer) return notFound('player', slug);
  const player = mergePlayerPatch(existingPlayer, patch);
  await writePlayerSheet(table, existingPlayer.id, player);
  return json(200, { ok: true, playerId: existingPlayer.id, patch, player, storage: 'table' }, 'no-store');
}

async function handlePlayerSave(params = {}, req = {}) {
  const body = req.body || {};
  if (JSON.stringify(body).length > MAX_PLAYER_BODY_BYTES) {
    return json(413, { error: 'sheet_too_large', message: 'Player sheets must be smaller than 512 KB.' }, 'no-store');
  }

  const player = sanitizePlayerSheet(body, params.slug);
  if (!player.id) {
    return json(400, { error: 'missing_player', message: 'Player sheet save requires an id.' }, 'no-store');
  }

  const table = await getPlayerSheetsTable();
  if (!table) {
    return json(503, { error: 'storage_unavailable', message: 'Player cloud saves are not configured.' }, 'no-store');
  }

  await writePlayerSheet(table, player.id, player);
  return json(200, { ok: true, playerId: player.id, player, storage: 'table' }, 'no-store');
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

  if (Object.prototype.hasOwnProperty.call(body, 'acMode')) {
    const acMode = sanitizeText(body.acMode, 20);
    if (acMode === 'official') patch.acMode = acMode;
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

  if (body.spellDetails && typeof body.spellDetails === 'object') {
    patch.spellDetails = sanitizeJsonValue(body.spellDetails, 6);
  }

  if (Array.isArray(body.spellScrolls)) {
    patch.spellScrolls = sanitizeJsonValue(body.spellScrolls, 6);
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

  if (body.combatToggles && typeof body.combatToggles === 'object') {
    patch.combatToggles = sanitizeJsonValue(body.combatToggles, 8);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'concentration')) {
    patch.concentration = sanitizeText(body.concentration, 120);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
    patch.notes = sanitizeNote(body.notes, 20000);
  }

  return patch;
}

function sanitizePlayerSheet(body, fallbackId = '') {
  const source = body && typeof body === 'object' ? body : {};
  const allowedFields = [
    'id', 'name', 'sheetTitle', 'builderVersion', 'rulesetId', 'rulesVersion',
    'class', 'classId', 'subclass', 'subclassId', 'subclassShortName',
    'level', 'race', 'raceId', 'background', 'backgroundId', 'portrait', 'experience', 'gold',
    'heroPoints', 'guildPoints', 'guildRank', 'abilities', 'ac', 'baseAc', 'acMode',
    'speed', 'baseSpeed', 'hpMode', 'maxHp', 'currentHp', 'tempHp',
    'proficiencyBonus', 'initiative', 'saves', 'skills', 'spellcasting',
    'spellAttack', 'spellSaveDc', 'attackBonuses', 'simpleWeapons',
    'martialWeapons', 'weaponProficiencies', 'armorProficiencies',
    'toolProficiencies', 'hitDice', 'equipment', 'itemIds', 'itemDetails',
    'resistances', 'vulnerabilities', 'immunities',
    'damageResistances', 'damageVulnerabilities', 'damageImmunities',
    'resistanceDetails', 'vulnerabilityDetails', 'immunityDetails', 'defenses',
    'equipped', 'spells', 'preparedSpells', 'spellIds', 'spellScrolls',
    'spellDetails', 'manualSpells', 'manualSpellIds', 'manualSpellDetails',
    'grantedSpells', 'grantedSpellIds', 'grantedSpellDetails',
    'spellGrantDetails', 'spellListAdditions', 'spellListAdditionIds',
    'spellListAdditionDetails', 'spellMetadata', 'spellMetadataByName',
    'spellSlots', 'resources', 'resourceUses', 'ruleActions', 'ruleActivations',
    'actionWells', 'ruleEffects', 'ruleFeatures', 'actionUses',
    'spellSlotUses', 'itemCharges', 'temporaryEffects', 'combatToggles',
    'conditions', 'concentration', 'notes', 'backgrounds', 'backgroundIds',
    'backgroundDetails', 'feats', 'featIds', 'featDetails', 'races', 'raceIds',
    'classLevels', 'optionalFeatureIds', 'selectedFeatureIds', 'featureChoices',
    'levelChoices', 'proficiencies', 'ruleChoices', 'ruleReport',
    'notesUrl', 'classUrl', 'rulesSource', 'url',
  ];
  const sheet = {};
  for (const field of allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) continue;
    sheet[field] = sanitizeJsonValue(source[field], 8);
  }

  sheet.id = sanitizeId(fallbackId || source.id);
  sheet.name = sanitizeText(source.name || source.sheetTitle || sheet.id, 200);
  sheet.sheetTitle = sanitizeText(source.sheetTitle || source.name || sheet.name, 240);
  sheet.builderVersion = sanitizeText(source.builderVersion, 40);
  sheet.rulesetId = sanitizeId(source.rulesetId || 'eldoria-5e');
  sheet.rulesVersion = sanitizeText(source.rulesVersion, 80);
  sheet.level = clamp(nullableNumber(source.level) || 1, 1, 20);
  sheet.abilities = sanitizeAbilities(source.abilities || {});
  sheet.saves = sanitizeTextList(source.saves, 12, 40);
  sheet.skills = sanitizeTextList(source.skills, 40, 80);
  sheet.equipment = sanitizeTextList(source.equipment, 160, 180);
  sheet.equipped = sanitizeTextList(source.equipped, 160, 180);
  sheet.spells = sanitizeTextList(source.spells, 240, 120);
  sheet.preparedSpells = sanitizeTextList(source.preparedSpells, 240, 120);
  sheet.manualSpells = sanitizeTextList(source.manualSpells, 240, 120);
  sheet.manualSpellIds = sanitizeTextList(source.manualSpellIds, 240, 120);
  sheet.grantedSpells = sanitizeTextList(source.grantedSpells, 240, 120);
  sheet.grantedSpellIds = sanitizeTextList(source.grantedSpellIds, 240, 120);
  sheet.spellListAdditions = sanitizeTextList(source.spellListAdditions, 240, 120);
  sheet.spellListAdditionIds = sanitizeTextList(source.spellListAdditionIds, 240, 120);
  sheet.conditions = sanitizeTextList(source.conditions, 40, 80);
  sheet.notes = sanitizeNote(source.notes, 20000);
  sheet.updatedAtUtc = new Date().toISOString();
  return stripEmpty(sheet);
}

function sanitizeJsonValue(value, depth = 6) {
  if (depth <= 0) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return sanitizeJsonText(value, 20000);
  if (Array.isArray(value)) {
    return value.slice(0, 500).map(item => sanitizeJsonValue(item, depth - 1)).filter(item => item !== undefined);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value).slice(0, 500)) {
      const cleanKey = sanitizeText(key, 120);
      if (!cleanKey) continue;
      const cleanValue = sanitizeJsonValue(val, depth - 1);
      if (cleanValue !== undefined) out[cleanKey] = cleanValue;
    }
    return out;
  }
  return null;
}

function sanitizeAbilities(value) {
  const out = {};
  const source = value && typeof value === 'object' ? value : {};
  for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const num = nullableNumber(source[ability]);
    out[ability] = num === undefined || num === null ? 10 : clamp(num, 1, 30);
  }
  return out;
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

function mergePlayerPatch(base, patch) {
  if (!patch) return base;
  const cleanPatch = sanitizePlayerPatch(patch);
  const merged = { ...base, ...cleanPatch };
  if (base.abilities || cleanPatch.abilities) {
    merged.abilities = {
      ...(base.abilities || {}),
      ...(cleanPatch.abilities || {}),
    };
  }
  return merged;
}

async function readPlayerSheets(table) {
  const players = [];
  for await (const entity of table.listEntities({ queryOptions: { filter: `PartitionKey eq '${PLAYER_SHEETS_PARTITION}'` } })) {
    const player = unpackJson(entity, 'PlayerJson');
    if (!Object.keys(player).length) continue;
    players.push(stripLargeFields({
      ...player,
      id: entity.rowKey || player.id,
      updatedAtUtc: tableTimestamp(entity.updatedAtUtc || entity.timestamp),
    }));
  }
  return players.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
}

async function readPlayerSheetBySlug(table, slug) {
  const direct = await readPlayerSheet(table, sanitizeId(slug) || slugify(slug));
  if (direct) return direct;

  const players = await readPlayerSheets(table);
  return findBySlug(players, slug, ['id', 'name', 'sheetTitle', 'url']);
}

async function readPlayerSheet(table, playerId) {
  if (!playerId) return null;
  try {
    const entity = await table.getEntity(PLAYER_SHEETS_PARTITION, playerId);
    const player = unpackJson(entity, 'PlayerJson');
    if (!Object.keys(player).length) return null;
    return stripLargeFields({
      ...player,
      id: entity.rowKey || player.id,
      updatedAtUtc: tableTimestamp(entity.updatedAtUtc || entity.timestamp),
    });
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return null;
  }
}

async function writePlayerSheet(table, playerId, player) {
  const now = new Date().toISOString();
  const sheet = stripLargeFields({ ...player, id: playerId, updatedAtUtc: now });
  await table.upsertEntity({
    partitionKey: PLAYER_SHEETS_PARTITION,
    rowKey: playerId,
    ...packJson('PlayerJson', sheet),
    name: stringValue(sheet.name).slice(0, 200),
    sheetTitle: stringValue(sheet.sheetTitle).slice(0, 240),
    updatedAtUtc: now,
  }, 'Replace');
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

function stripEmpty(value) {
  const out = {};
  for (const [key, val] of Object.entries(value || {})) {
    if (Array.isArray(val) && !val.length) continue;
    if (val && typeof val === 'object' && !Array.isArray(val) && !Object.keys(val).length) continue;
    if (val === '' || val === undefined || val === null) continue;
    out[key] = val;
  }
  return out;
}

function json(status, body, cacheControl = 'public, max-age=60') {
  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, PUT, POST, PATCH, OPTIONS',
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
      'access-control-allow-methods': 'GET, PUT, POST, PATCH, OPTIONS',
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

function sanitizeTextList(values, limit, maxLength) {
  const raw = Array.isArray(values) ? values : [];
  const seen = new Set();
  const out = [];
  for (const value of raw) {
    const clean = sanitizeText(value, maxLength);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

function sanitizeNote(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\r\n/g, '\n')
    .slice(0, maxLength);
}

function sanitizeJsonText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
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
  _test: {
    sanitizePlayerSheet,
  },
};
