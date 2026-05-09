const { getCharacterBuildsTable, isNotFound, packJson, tableTimestamp, unpackJson } = require('./table-storage');

const MAX_BUILD_BODY_BYTES = 256 * 1024;
const CHARACTER_BUILDS_PARTITION = 'character';

async function handleCharacters(params = {}, query = {}, req = { method: 'GET' }) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return empty(204);
  if (method === 'GET') return handleCharacterGet(params);
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') return handleCharacterSave(params, query, req, method);
  return json(405, { error: 'method_not_allowed', message: 'GET, POST, PUT, PATCH, and OPTIONS are supported.' }, 'no-store');
}

async function handleCharacterGet(params = {}) {
  const table = await getCharacterBuildsTable();
  if (!table) {
    return json(200, {
      count: 0,
      characters: [],
      storage: 'unconfigured',
      message: 'Character cloud saves are not configured for this environment.',
    }, 'no-store');
  }

  const slug = sanitizeId(params.slug);
  if (!slug) {
    const characters = [];
    for await (const entity of table.listEntities({ queryOptions: { filter: `PartitionKey eq '${CHARACTER_BUILDS_PARTITION}'` } })) {
      characters.push({
        id: entity.rowKey,
        name: entity.name || entity.rowKey,
        rulesVersion: entity.rulesVersion || '',
        updatedAtUtc: tableTimestamp(entity.updatedAtUtc || entity.timestamp),
      });
    }
    characters.sort((a, b) => String(b.updatedAtUtc).localeCompare(String(a.updatedAtUtc)) || a.name.localeCompare(b.name));
    return json(200, { count: characters.length, characters, storage: 'table' }, 'no-store');
  }

  const character = await readCharacterBuild(table, slug);
  if (!character) return notFound('character', slug);
  return json(200, { ...character, storage: 'table' }, 'no-store');
}

async function handleCharacterSave(params = {}, _query = {}, req = {}, method = 'PUT') {
  const body = req.body || {};
  if (JSON.stringify(body).length > MAX_BUILD_BODY_BYTES) {
    return json(413, { error: 'build_too_large', message: 'Character builds must be smaller than 256 KB.' }, 'no-store');
  }

  const incoming = sanitizeCharacterBuild(body);
  const slug = sanitizeId(params.slug || incoming.id);
  const characterId = slug || sanitizeId(incoming.name);
  if (!characterId) {
    return json(400, { error: 'missing_character_id', message: 'Character save requires an id or name.' }, 'no-store');
  }

  const table = await getCharacterBuildsTable();
  if (!table) {
    return json(503, { error: 'storage_unavailable', message: 'Character cloud saves are not configured.' }, 'no-store');
  }

  const existing = method === 'PATCH' ? await readCharacterBuild(table, characterId) : null;
  const build = method === 'PATCH' && existing ? mergeBuild(existing, incoming) : { ...incoming, id: characterId };
  build.id = characterId;

  await writeCharacterBuild(table, build);
  return json(200, {
    ok: true,
    storage: 'table',
    character: {
      id: build.id,
      name: build.name,
      rulesVersion: build.rulesVersion || '',
    },
  }, 'no-store');
}

function sanitizeCharacterBuild(body) {
  const build = {};
  build.id = sanitizeId(body.id);
  build.name = sanitizeText(body.name, 200);
  build.builderVersion = sanitizeText(body.builderVersion, 40);
  build.rulesetId = sanitizeId(body.rulesetId || 'eldoria-5e');
  build.rulesVersion = sanitizeText(body.rulesVersion || body.rulesSchemaVersion, 80);
  build.level = clamp(nullableNumber(body.level) || 1, 1, 20);
  build.classId = sanitizeId(body.classId);
  build.subclassId = sanitizeId(body.subclassId);
  build.classLevels = sanitizeClassLevels(body.classLevels, build.classId, build.subclassId, build.level);
  build.raceId = sanitizeId(body.raceId);
  build.backgroundId = sanitizeId(body.backgroundId);
  build.abilityMethod = sanitizeEnum(body.abilityMethod, ['standard-array', 'point-buy', 'manual', 'rolled'], 'manual');
  build.hpMode = sanitizeEnum(body.hpMode, ['auto-average', 'manual'], 'auto-average');
  build.maxHp = sanitizeHpNumber(body.maxHp);
  build.currentHp = sanitizeHpNumber(body.currentHp);
  build.experience = sanitizeRangeNumber(body.experience, 0, 9999999);
  build.gold = sanitizeRangeNumber(body.gold, 0, 999999);
  build.heroPoints = sanitizeRangeNumber(body.heroPoints, 0, 99);
  build.guildRank = sanitizeText(body.guildRank, 120);
  build.guildPoints = sanitizeRangeNumber(body.guildPoints, 0, 999999);
  build.abilities = sanitizeAbilities(body.abilities);
  build.featIds = sanitizeIdList(body.featIds, 40);
  build.itemIds = sanitizeIdList(body.itemIds, 120);
  build.spellIds = sanitizeIdList(body.spellIds, 200);
  build.optionalFeatureIds = sanitizeIdList(body.optionalFeatureIds, 120);
  build.selectedFeatureIds = sanitizeIdList(body.selectedFeatureIds, 240);
  build.featureChoices = sanitizeChoiceMap(body.featureChoices, 80);
  build.levelChoices = sanitizeLevelChoices(body.levelChoices);
  build.startingGear = sanitizeStartingGear(body.startingGear);
  build.proficiencies = sanitizeProficiencies(body.proficiencies);
  build.notes = sanitizeNote(body.notes, 20000);
  build.updatedAtUtc = new Date().toISOString();
  return stripEmpty(build);
}

function sanitizeProficiencies(value) {
  const source = value && typeof value === 'object' ? value : {};
  return stripEmpty({
    skills: sanitizeTextList(source.skills, 80, 80),
    languages: sanitizeTextList(source.languages, 80, 80),
    tools: sanitizeTextList(source.tools, 80, 120),
    weapons: sanitizeTextList(source.weapons, 80, 120),
    weaponProficiencies: sanitizeTextList(source.weaponProficiencies, 80, 120),
    savingThrows: sanitizeTextList(source.savingThrows, 12, 40),
  });
}

function sanitizeClassLevels(values, fallbackClassId, fallbackSubclassId, fallbackLevel) {
  const raw = Array.isArray(values) ? values : [];
  const out = [];
  for (const entry of raw.slice(0, 12)) {
    if (!entry || typeof entry !== 'object') continue;
    const classId = sanitizeId(entry.classId);
    if (!classId) continue;
    out.push({
      classId,
      subclassId: sanitizeId(entry.subclassId),
      level: clamp(nullableNumber(entry.level) || 1, 1, 20),
    });
  }
  if (!out.length && fallbackClassId) {
    out.push({
      classId: fallbackClassId,
      subclassId: fallbackSubclassId || '',
      level: clamp(nullableNumber(fallbackLevel) || 1, 1, 20),
    });
  }
  return out;
}

function sanitizeAbilities(value) {
  const out = {};
  const source = value && typeof value === 'object' ? value : {};
  for (const ability of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const num = nullableNumber(source[ability]);
    if (num !== undefined && num !== null) out[ability] = clamp(num, 1, 30);
  }
  return out;
}

function sanitizeHpNumber(value) {
  const number = nullableNumber(value);
  if (number === undefined || number === null) return null;
  return clamp(Math.floor(number), 0, 999);
}

function sanitizeRangeNumber(value, min, max) {
  const number = nullableNumber(value);
  if (number === undefined || number === null) return null;
  return clamp(Math.floor(number), min, max);
}

function sanitizeStartingGear(value) {
  const source = value && typeof value === 'object' ? value : {};
  return stripEmpty({
    enabled: sanitizeTextList(source.enabled, 240, 240),
    disabled: sanitizeTextList(source.disabled, 240, 240),
  });
}

function sanitizeChoiceMap(value, limit) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, val] of Object.entries(value).slice(0, limit)) {
    const cleanKey = sanitizeText(key, 120);
    const cleanValue = Array.isArray(val)
      ? val.map(item => sanitizeText(item, 160)).filter(Boolean).slice(0, 20)
      : sanitizeText(val, 160);
    if (cleanKey && (Array.isArray(cleanValue) ? cleanValue.length : cleanValue)) out[cleanKey] = cleanValue;
  }
  return out;
}

function sanitizeLevelChoices(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [level, choices] of Object.entries(value).slice(0, 20)) {
    const cleanLevel = String(clamp(nullableNumber(level) || 1, 1, 20));
    if (!choices || typeof choices !== 'object' || Array.isArray(choices)) continue;
    out[cleanLevel] = {
      featIds: sanitizeIdList(choices.featIds, 10),
      spellIds: sanitizeIdList(choices.spellIds, 80),
      featureChoices: sanitizeChoiceMap(choices.featureChoices, 40),
    };
  }
  return out;
}

function sanitizeIdList(values, limit) {
  const raw = Array.isArray(values) ? values : [];
  const seen = new Set();
  const out = [];
  for (const value of raw) {
    const id = sanitizeId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

function mergeBuild(existing, incoming) {
  const merged = { ...existing, ...incoming };
  merged.abilities = { ...(existing.abilities || {}), ...(incoming.abilities || {}) };
  merged.featureChoices = { ...(existing.featureChoices || {}), ...(incoming.featureChoices || {}) };
  merged.levelChoices = { ...(existing.levelChoices || {}), ...(incoming.levelChoices || {}) };
  merged.proficiencies = { ...(existing.proficiencies || {}), ...(incoming.proficiencies || {}) };
  return merged;
}

async function readCharacterBuild(table, characterId) {
  try {
    const entity = await table.getEntity(CHARACTER_BUILDS_PARTITION, characterId);
    const build = unpackJson(entity, 'BuildJson');
    return {
      ...build,
      id: entity.rowKey,
      name: entity.name || build.name || entity.rowKey,
      rulesVersion: entity.rulesVersion || build.rulesVersion || '',
      createdAtUtc: tableTimestamp(entity.createdAtUtc),
      updatedAtUtc: tableTimestamp(entity.updatedAtUtc || entity.timestamp),
    };
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return null;
  }
}

async function writeCharacterBuild(table, build) {
  const existing = await readCharacterBuild(table, build.id);
  const now = new Date().toISOString();
  const createdAtUtc = existing?.createdAtUtc || build.createdAtUtc || now;

  await table.upsertEntity({
    partitionKey: CHARACTER_BUILDS_PARTITION,
    rowKey: build.id,
    name: build.name || build.id,
    rulesVersion: build.rulesVersion || '',
    createdAtUtc,
    updatedAtUtc: now,
    ...packJson('BuildJson', { ...build, createdAtUtc, updatedAtUtc: now }),
  }, 'Replace');
}

function stripEmpty(value) {
  const out = {};
  for (const [key, val] of Object.entries(value)) {
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
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, OPTIONS',
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
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'vary': 'Origin',
    },
  };
}

function notFound(kind, slug) {
  return json(404, {
    error: 'not_found',
    message: `No ${kind} found for slug "${slug}".`,
  }, 'no-store');
}

function sanitizeId(value) {
  return stringValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
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

function sanitizeEnum(value, allowed, fallback) {
  const clean = stringValue(value);
  return allowed.includes(clean) ? clean : fallback;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = { handleCharacters, sanitizeCharacterBuild };
