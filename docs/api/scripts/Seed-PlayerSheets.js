const fs = require('fs');
const path = require('path');
const EldoriaRuleset = require('../../site-assets/eldoria-ruleset');
const { getCharacterBuildsTable, getPlayerSheetsTable, isNotFound, packJson, tableTimestamp, unpackJson } = require('../shared/table-storage');

const PLAYER_SHEETS_PARTITION = 'player';
const CHARACTER_BUILDS_PARTITION = 'character';
const RUNTIME_PLAYER_FIELDS = [
  'currentHp', 'tempHp', 'resourceUses', 'spellSlotUses', 'itemCharges', 'actionUses',
  'temporaryEffects', 'combatToggles', 'conditions', 'concentration', 'notes', 'equipped',
];
const GEAR_FIELDS = ['equipment', 'itemIds', 'itemDetails'];

function readPlayers() {
  const filePath = path.join(__dirname, '..', 'data', 'players.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).map(stripLargeFields);
}

function stripLargeFields(item) {
  const copy = { ...item };
  delete copy.text;
  delete copy.searchText;
  return copy;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLookup(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^\s*\+\d+\s+/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeExactLookup(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  return (values || []).map(value => String(value || '').trim()).filter(value => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildItemLookup(items) {
  const exact = new Map();
  const loose = new Map();
  for (const item of items || []) {
    for (const value of [item && item.name, item && item.id]) {
      const exactKey = normalizeExactLookup(value);
      if (exactKey && !exact.has(exactKey)) exact.set(exactKey, item);
      const looseKey = normalizeLookup(value);
      if (looseKey && !loose.has(looseKey)) loose.set(looseKey, item);
    }
  }
  return { exact, loose };
}

function findItemByDisplayName(itemLookup, name) {
  const candidates = [name];
  if (String(name || '').includes('|')) candidates.push(...String(name).split('|'));
  for (const candidate of candidates) {
    const key = normalizeExactLookup(candidate);
    if (key && itemLookup.exact && itemLookup.exact.has(key)) return itemLookup.exact.get(key);
  }
  for (const candidate of candidates) {
    const key = normalizeLookup(candidate);
    if (key && itemLookup.loose && itemLookup.loose.has(key)) return itemLookup.loose.get(key);
  }
  return null;
}

function detailFromItem(row, displayName) {
  if (!row) return null;
  return {
    id: row.id || slugify(displayName || row.name),
    name: displayName || row.name || '',
    source: row.source || '',
    page: row.page || '',
    rarity: row.rarity || '',
    type: row.type || '',
    attunement: row.attunement || '',
    damage: row.damage || '',
    properties: Array.isArray(row.properties) ? row.properties.join(', ') : row.properties || '',
    mastery: row.mastery || '',
    weight: row.weight || '',
    value: row.value || '',
    text: row.text || '',
    weapon: row.weapon || null,
    actions: Array.isArray(row.actions) ? row.actions : [],
    effects: Array.isArray(row.effects) ? row.effects : [],
    resources: Array.isArray(row.resources) ? row.resources : [],
    toggles: Array.isArray(row.toggles) ? row.toggles : [],
  };
}

function parseItemLookupEquipment(markdown) {
  const out = [];
  const call = 'ItemLookup.display';
  let cursor = 0;
  while (cursor < markdown.length) {
    const idx = markdown.indexOf(call, cursor);
    if (idx < 0) break;
    const start = markdown.indexOf('[', idx);
    if (start < 0) break;
    let depth = 0;
    let end = -1;
    for (let index = start; index < markdown.length; index += 1) {
      const char = markdown[index];
      if (char === '[') depth += 1;
      if (char === ']') {
        depth -= 1;
        if (!depth) {
          end = index;
          break;
        }
      }
    }
    if (end < 0) break;
    const list = markdown.slice(start + 1, end);
    const re = /'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"/g;
    let match;
    while ((match = re.exec(list))) {
      out.push(String(match[1] || match[2] || '').replace(/\\'/g, "'").replace(/\\"/g, '"').trim());
    }
    cursor = end + 1;
  }
  return uniqueStrings(out);
}

function readMarkdownEquipment(player) {
  const playersDir = path.join(__dirname, '..', '..', '..', 'Public', 'Players');
  const candidates = uniqueStrings([
    player && player.sheetTitle,
    player && player.name,
    player && player.id && player.id.replace(/-/g, ' '),
  ]).map(name => `${name}.md`);
  for (const filename of candidates) {
    const filePath = path.join(playersDir, filename);
    if (!fs.existsSync(filePath)) continue;
    return parseItemLookupEquipment(fs.readFileSync(filePath, 'utf8'));
  }
  if (!fs.existsSync(playersDir)) return [];
  const target = slugify(player && (player.sheetTitle || player.name || player.id));
  const fallback = fs.readdirSync(playersDir).find(filename => filename.endsWith('.md') && slugify(path.basename(filename, '.md')) === target);
  return fallback ? parseItemLookupEquipment(fs.readFileSync(path.join(playersDir, fallback), 'utf8')) : [];
}

function buildGearProjection(equipment, itemLookup) {
  const names = uniqueStrings(equipment);
  const itemIds = [];
  const itemDetails = {};
  for (const name of names) {
    const item = findItemByDisplayName(itemLookup, name);
    if (!item) continue;
    if (item.id) itemIds.push(item.id);
    itemDetails[name] = detailFromItem(item, name);
  }
  return {
    equipment: names,
    itemIds: uniqueStrings(itemIds),
    itemDetails,
  };
}

function collectGearNames(source) {
  const names = [];
  if (Array.isArray(source && source.equipment)) names.push(...source.equipment);
  if (Array.isArray(source && source.equipped)) names.push(...source.equipped);
  const details = source && source.itemDetails && typeof source.itemDetails === 'object' ? source.itemDetails : {};
  for (const [key, detail] of Object.entries(details)) {
    names.push(key);
    if (detail && typeof detail === 'object') {
      names.push(detail.name, detail.id, detail.displayName);
    }
  }
  return uniqueStrings(names);
}

function enrichGearProjection(gear, fallbackSource, itemLookup) {
  const names = uniqueStrings([
    ...(gear && gear.equipment || []),
    ...collectGearNames(fallbackSource),
  ]);
  const ids = uniqueStrings([
    ...(gear && gear.itemIds || []),
    ...(fallbackSource && fallbackSource.itemIds || []),
  ]);
  const details = { ...(gear && gear.itemDetails || {}) };
  const matchedIds = [];
  for (const value of [...names, ...ids]) {
    const item = findItemByDisplayName(itemLookup, value);
    if (!item) continue;
    const displayName = names.find(name => findItemByDisplayName(itemLookup, name) === item) || item.name || value;
    if (item.id) matchedIds.push(item.id);
    details[displayName] = detailFromItem(item, displayName);
  }
  return {
    equipment: names.length ? names : Object.keys(details),
    itemIds: uniqueStrings([...ids, ...matchedIds]),
    itemDetails: details,
  };
}

function buildGearProjectionFromItemIds(itemIds, itemLookup) {
  const ids = uniqueStrings(itemIds);
  const equipment = [];
  const details = {};
  const matchedIds = [];
  for (const id of ids) {
    const item = findItemByDisplayName(itemLookup, id);
    if (!item) continue;
    const name = item.name || id;
    equipment.push(name);
    matchedIds.push(item.id || id);
    details[name] = detailFromItem(item, name);
  }
  return {
    equipment: uniqueStrings(equipment),
    itemIds: uniqueStrings(matchedIds),
    itemDetails: details,
  };
}

function stringValue(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function readRuleset() {
  const rulesRoot = path.join(__dirname, '..', '..', 'Assets', 'Rules');
  const read = filename => JSON.parse(fs.readFileSync(path.join(rulesRoot, filename), 'utf8'));
  const rawRules = {
    classes: read('classes.json'),
    subclasses: read('subclasses.json'),
    races: read('races.json'),
    backgrounds: read('backgrounds.json'),
    feats: read('feats.json'),
    items: read('items.json'),
    spells: read('spells.json'),
    features: read('features.json'),
    actions: read('actions.json'),
    resources: read('resources.json'),
    effects: read('effects.json'),
    manifest: read('manifest.json'),
    profile: read('ruleset-profile.json'),
  };
  const ruleset = EldoriaRuleset.createRuleset(rawRules, rawRules.profile || {});
  ruleset.rawRules = rawRules;
  return ruleset;
}

async function readPlayerSheet(table, playerId) {
  if (!playerId) return null;
  try {
    const entity = await table.getEntity(PLAYER_SHEETS_PARTITION, playerId);
    const player = unpackJson(entity, 'PlayerJson');
    return Object.keys(player).length ? { ...player, id: entity.rowKey, updatedAtUtc: tableTimestamp(entity.updatedAtUtc || entity.timestamp) } : null;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return null;
  }
}

async function readCharacterBuild(table, characterId) {
  if (!table || !characterId) return null;
  try {
    const entity = await table.getEntity(CHARACTER_BUILDS_PARTITION, characterId);
    const build = unpackJson(entity, 'BuildJson');
    return Object.keys(build).length ? { ...build, id: entity.rowKey, name: entity.name || build.name || entity.rowKey } : null;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return null;
  }
}

function pickRuntimeState(existing) {
  const out = {};
  for (const field of RUNTIME_PLAYER_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(existing || {}, field)) continue;
    const value = existing[field];
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && !value.length) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) continue;
    out[field] = value;
  }
  return out;
}

function hasGear(source) {
  return Boolean(source && (
    Array.isArray(source.equipment) && source.equipment.length
    || Array.isArray(source.itemIds) && source.itemIds.length
    || source.itemDetails && typeof source.itemDetails === 'object' && Object.keys(source.itemDetails).length
  ));
}

function sameEquipmentList(left, right) {
  const normalize = values => uniqueStrings(values).map(value => normalizeExactLookup(value));
  const a = normalize(left);
  const b = normalize(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeExistingGear(existing) {
  if (!hasGear(existing)) return null;
  return {
    equipment: uniqueStrings(existing.equipment || []),
    itemIds: uniqueStrings(existing.itemIds || []),
    itemDetails: existing && existing.itemDetails && typeof existing.itemDetails === 'object' ? existing.itemDetails : {},
  };
}

function chooseSeedGear(existing, characterGear, markdownGear) {
  const existingGear = normalizeExistingGear(existing);
  if (hasGear(existingGear)) {
    if (hasGear(markdownGear) && sameEquipmentList(existingGear.equipment, markdownGear.equipment)) return markdownGear;
    if (hasGear(markdownGear) && hasGear(characterGear) && sameEquipmentList(existingGear.equipment, characterGear.equipment)) return markdownGear;
    return existingGear;
  }
  if (hasGear(markdownGear)) return markdownGear;
  if (hasGear(characterGear)) return characterGear;
  return null;
}

function applyGearFallback(sheet, existing, projected, gear) {
  const out = { ...sheet };
  if (hasGear(gear)) {
    out.equipment = gear.equipment;
    out.itemIds = gear.itemIds;
    out.itemDetails = gear.itemDetails || {};
    return out;
  }
  if (!hasGear(projected) && hasGear(existing)) {
    for (const field of GEAR_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(existing, field)) out[field] = existing[field];
    }
  }
  return out;
}

function filterSpellDetails(details, spellNames) {
  const allowed = new Set(uniqueStrings(spellNames).map(normalizeExactLookup).filter(Boolean));
  if (!allowed.size || !details || typeof details !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(details)) {
    const candidates = [key, value && value.name, value && value.id]
      .map(normalizeExactLookup)
      .filter(Boolean);
    if (candidates.some(candidate => allowed.has(candidate))) out[key] = value;
  }
  return out;
}

function normalizeRecordedSpells(source) {
  const spells = uniqueStrings(source && source.spells || []);
  const preparedLookup = new Set(spells.map(normalizeExactLookup));
  const preparedSpells = uniqueStrings(source && source.preparedSpells || [])
    .filter(name => preparedLookup.has(normalizeExactLookup(name)));
  return {
    spells,
    preparedSpells,
    spellDetails: filterSpellDetails(source && source.spellDetails, spells),
  };
}

function hasRecordedSpells(source) {
  return Boolean(source && Array.isArray(source.spells) && source.spells.length);
}

function applySpellFallback(sheet, existing, projected, source) {
  if (hasRecordedSpells(projected)) return sheet;
  const existingSpells = normalizeRecordedSpells(existing);
  const sourceSpells = normalizeRecordedSpells(source);
  const chosen = hasRecordedSpells(existingSpells)
    ? existingSpells
    : (hasRecordedSpells(sourceSpells) ? sourceSpells : null);
  if (!chosen) return sheet;

  const out = { ...sheet, spells: chosen.spells };
  if ((!Array.isArray(out.preparedSpells) || !out.preparedSpells.length) && chosen.preparedSpells.length) {
    out.preparedSpells = chosen.preparedSpells;
  }
  const chosenDetails = Object.keys(chosen.spellDetails).length
    ? chosen.spellDetails
    : filterSpellDetails(sourceSpells.spellDetails, chosen.spells);
  if ((!out.spellDetails || !Object.keys(out.spellDetails).length) && Object.keys(chosenDetails).length) {
    out.spellDetails = chosenDetails;
  }
  return out;
}

function mergeProjectedSheet(identity, existing, projected) {
  const runtime = pickRuntimeState(existing);
  return stripLargeFields({
    ...identity,
    ...(existing || {}),
    ...projected,
    ...runtime,
    id: identity.id || projected.id || existing && existing.id || '',
    name: projected.name || identity.name || existing && existing.name || '',
    sheetTitle: identity.sheetTitle || identity.name || projected.sheetTitle || projected.name || '',
    portrait: identity.portrait || projected.portrait || existing && existing.portrait || '',
    url: identity.url || existing && existing.url || '',
    classUrl: identity.classUrl || existing && existing.classUrl || '',
    notesUrl: identity.notesUrl || existing && existing.notesUrl || '',
  });
}

(async () => {
  const table = await getPlayerSheetsTable();
  if (!table) {
    throw new Error('Table Storage is not configured. Run api:check-config and install API dependencies first.');
  }
  const characterTable = await getCharacterBuildsTable();
  const ruleset = readRuleset();
  const itemLookup = buildItemLookup(ruleset.rawRules && ruleset.rawRules.items || ruleset.rules && ruleset.rules.items || []);

  const now = new Date().toISOString();
  const players = readPlayers();
  let projectedCount = 0;
  for (const player of players) {
    if (!player.id) continue;
    const existing = await readPlayerSheet(table, player.id);
    const markdownGear = buildGearProjection(readMarkdownEquipment(player), itemLookup);
    const character = await readCharacterBuild(characterTable, player.id);
    const characterGear = character ? buildGearProjectionFromItemIds(character.itemIds || [], itemLookup) : null;
    const seedGear = enrichGearProjection(chooseSeedGear(existing, characterGear, markdownGear), existing, itemLookup);
    const projectedCharacter = character && hasGear(seedGear)
      ? { ...character, itemIds: seedGear.itemIds }
      : character;
    const projection = character
      ? ruleset.project(projectedCharacter, { ...player, ...(existing || {}) }).projection
      : null;
    if (projection) projectedCount += 1;
    const sheet = {
      ...applySpellFallback(
        applyGearFallback(
          projection ? mergeProjectedSheet(player, existing, projection) : { ...(existing || {}), ...player },
          existing,
          projection,
          seedGear,
        ),
        existing,
        projection,
        player,
      ),
      updatedAtUtc: now,
    };
    await table.upsertEntity({
      partitionKey: PLAYER_SHEETS_PARTITION,
      rowKey: player.id,
      ...packJson('PlayerJson', sheet),
      name: stringValue(player.name).slice(0, 200),
      sheetTitle: stringValue(player.sheetTitle).slice(0, 240),
      updatedAtUtc: now,
    }, 'Merge');
  }

  console.log(`Upserted ${players.length} player sheets into ${process.env.PLAYER_SHEETS_TABLE || 'PlayerSheets'} (${projectedCount} projected from CharacterBuilds).`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
