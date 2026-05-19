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
  build.schemaVersion = clamp(nullableNumber(body.schemaVersion) || 1, 1, 99);
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
  build.levelHistory = sanitizeLevelHistory(body.levelHistory);
  build.startingGear = sanitizeStartingGear(body.startingGear);
  build.proficiencies = sanitizeProficiencies(body.proficiencies);
  build.inventory = sanitizeInventory(body.inventory);
  build.mechanicBlocks = sanitizeMechanicBlocks(body.mechanicBlocks);
  build.toggleState = sanitizeToggleState(body.toggleState);
  build.resourceState = sanitizeResourceState(body.resourceState);
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
  const source = value && typeof value === 'object' ? value : {};
  const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  // v2 nested form: { base: {...}, history: [...] }
  if (source.base && typeof source.base === 'object') {
    const base = {};
    for (const ability of ABILITIES) {
      const num = nullableNumber(source.base[ability]);
      if (num !== undefined && num !== null) base[ability] = clamp(num, 1, 30);
    }
    const history = Array.isArray(source.history) ? source.history.slice(0, 40) : [];
    const cleanHistory = [];
    for (const h of history) {
      if (!h || typeof h !== 'object') continue;
      const level = clamp(nullableNumber(h.level) || 0, 0, 20);
      const src = sanitizeText(h.source, 80);
      const delta = {};
      if (h.delta && typeof h.delta === 'object') {
        for (const ability of ABILITIES) {
          const n = nullableNumber(h.delta[ability]);
          if (n !== undefined && n !== null) delta[ability] = clamp(n, -10, 10);
        }
      }
      if (!Object.keys(delta).length) continue;
      const entry = { level, source: src, delta };
      if (h.fromLevelCommit) entry.fromLevelCommit = true;
      cleanHistory.push(entry);
    }
    const out = { base };
    if (cleanHistory.length) out.history = cleanHistory;
    // Also project a flat view for back-compat consumers
    const final = { ...base };
    for (const entry of cleanHistory) {
      for (const ab of ABILITIES) if (entry.delta[ab]) final[ab] = (final[ab] || 10) + entry.delta[ab];
    }
    for (const ab of ABILITIES) if (final[ab] != null) out[ab] = final[ab];
    return out;
  }

  // v1 flat form
  const out = {};
  for (const ability of ABILITIES) {
    const num = nullableNumber(source[ability]);
    if (num !== undefined && num !== null) out[ability] = clamp(num, 1, 30);
  }
  return out;
}

function sanitizeLevelHistory(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seenLevels = new Set();
  for (const raw of value.slice(0, 20)) {
    if (!raw || typeof raw !== 'object') continue;
    const level = clamp(nullableNumber(raw.level) || 0, 1, 20);
    if (!level || seenLevels.has(level)) continue;
    seenLevels.add(level);
    const entry = { level };
    const classId = sanitizeId(raw.classId);
    if (classId) entry.classId = classId;
    const subclassId = sanitizeId(raw.subclassId);
    if (subclassId) entry.subclassId = subclassId;
    if (raw.hpRoll && typeof raw.hpRoll === 'object') {
      entry.hpRoll = {
        mode: sanitizeEnum(raw.hpRoll.mode, ['avg', 'max', 'roll', 'manual'], 'avg'),
        value: nullableNumber(raw.hpRoll.value),
      };
      if (entry.hpRoll.value !== null && entry.hpRoll.value !== undefined) {
        entry.hpRoll.value = clamp(Math.floor(entry.hpRoll.value), 0, 200);
      }
    }
    if (Array.isArray(raw.grants)) {
      entry.grants = raw.grants.map(g => sanitizeText(g, 120)).filter(Boolean).slice(0, 20);
    }
    if (raw.choices && typeof raw.choices === 'object' && !Array.isArray(raw.choices)) {
      entry.choices = sanitizeChoiceMap(raw.choices, 40);
    }
    if (Array.isArray(raw.spellsLearned)) {
      entry.spellsLearned = raw.spellsLearned.map(s => sanitizeId(s)).filter(Boolean).slice(0, 40);
    }
    if (raw.abilityDelta && typeof raw.abilityDelta === 'object') {
      const delta = {};
      for (const ab of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        const n = nullableNumber(raw.abilityDelta[ab]);
        if (n !== undefined && n !== null) delta[ab] = clamp(n, -10, 10);
      }
      if (Object.keys(delta).length) entry.abilityDelta = delta;
      const src = sanitizeText(raw.abilityDeltaSource, 80);
      if (src) entry.abilityDeltaSource = src;
    }
    const lockedAt = sanitizeText(raw.lockedAt, 40);
    if (lockedAt) entry.lockedAt = lockedAt;
    out.push(entry);
  }
  out.sort((a, b) => a.level - b.level);
  return out;
}

function sanitizeInventory(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of value.slice(0, 200)) {
    if (!raw || typeof raw !== 'object') continue;
    const instanceId = sanitizeText(raw.instanceId, 40) || ('itm-' + out.length);
    if (seen.has(instanceId)) continue;
    seen.add(instanceId);
    const itemId = sanitizeId(raw.itemId);
    if (!itemId) continue;
    const entry = { instanceId, itemId };
    const displayName = sanitizeText(raw.displayName, 200);
    if (displayName) entry.displayName = displayName;
    if (raw.equipped) entry.equipped = true;
    if (raw.attuned) entry.attuned = true;
    out.push(entry);
  }
  return out;
}

const MECHANIC_BLOCK_KINDS = new Set(['passive_modifier', 'damage_rider', 'resource', 'toggle', 'save_dc', 'effect_on_target']);

function sanitizeMechanicBlocks(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of value.slice(0, 200)) {
    if (!raw || typeof raw !== 'object') continue;
    const id = sanitizeText(raw.id, 80);
    if (!id || seen.has(id)) continue;
    const kind = sanitizeText(raw.kind, 40);
    if (!MECHANIC_BLOCK_KINDS.has(kind)) continue;
    seen.add(id);
    // Pass through the kind-specific payload as opaque JSON, capped via the
    // outer 256KB body limit. Don't whitelist every field — the block schema
    // is intentionally evolvable.
    const safe = JSON.parse(JSON.stringify(raw));
    safe.id = id;
    safe.kind = kind;
    out.push(safe);
  }
  return out;
}

function sanitizeToggleState(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [k, v] of Object.entries(value).slice(0, 200)) {
    const cleanKey = sanitizeText(k, 80);
    if (cleanKey) out[cleanKey] = Boolean(v);
  }
  return out;
}

function sanitizeResourceState(value) {
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [k, v] of Object.entries(value).slice(0, 200)) {
    const cleanKey = sanitizeText(k, 80);
    if (!cleanKey) continue;
    if (!v || typeof v !== 'object') continue;
    const remaining = nullableNumber(v.remaining);
    const lastReset = sanitizeText(v.lastReset, 40);
    const entry = {};
    if (remaining !== null && remaining !== undefined) entry.remaining = clamp(Math.floor(remaining), 0, 999);
    if (lastReset) entry.lastReset = lastReset;
    if (Object.keys(entry).length) out[cleanKey] = entry;
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
  // v2 arrays and runtime state: PATCH replaces wholesale when present. This
  // is intentional — rewinds drop entries, so a shallow merge would let stale
  // levels survive. If the client omits the field, keep what's on the server.
  if (Array.isArray(incoming.levelHistory)) merged.levelHistory = incoming.levelHistory;
  if (Array.isArray(incoming.inventory))    merged.inventory = incoming.inventory;
  if (Array.isArray(incoming.mechanicBlocks)) merged.mechanicBlocks = incoming.mechanicBlocks;
  if (incoming.toggleState && typeof incoming.toggleState === 'object') merged.toggleState = incoming.toggleState;
  if (incoming.resourceState && typeof incoming.resourceState === 'object') merged.resourceState = incoming.resourceState;
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
