#!/usr/bin/env node

/*
 * Eldoria lean public-site builder.
 *
 * Source of truth stays in the Obsidian vault under Public/. This script renders
 * those notes into small static HTML pages, shared CSS/JS, and JSON indexes.
 */

const fs = require('fs');
const path = require('path');

const DOCS_ROOT = __dirname;
const VAULT_ROOT = path.resolve(DOCS_ROOT, '..');
const PUBLIC_SRC = path.join(VAULT_ROOT, 'Public');
const PRIVATE_PLAYER_CONTROLS = path.join(VAULT_ROOT, 'Private', '1. The Party', 'Players', 'Player Controls.md');
const PUBLIC_OUT = path.join(DOCS_ROOT, 'Public');
const DATA_OUT = path.join(DOCS_ROOT, 'data');
const API_DATA_OUT = path.join(DOCS_ROOT, 'api', 'data');
const SITE_ASSETS_OUT = path.join(DOCS_ROOT, 'site-assets');
const RULES_ROOT = path.join(DOCS_ROOT, 'Assets', 'Rules');
const UTILITY_ALIASES = [
  ['Background Searcher.html', '../background-search.html', 'Background Search'],
  ['Feat Searcher.html', '../feat-search.html', 'Feat Search'],
  ['Item Searcher.html', '../item-search.html', 'Item Search'],
  ['Race Searcher.html', '../race-search.html', 'Race Search'],
  ['Spell Searcher.html', '../spell-search.html', 'Spell Search'],
];

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};
const SKILLS = [
  ['acrobatics', 'Acrobatics', 'dex'],
  ['animalHandling', 'Animal Handling', 'wis'],
  ['arcana', 'Arcana', 'int'],
  ['athletics', 'Athletics', 'str'],
  ['deception', 'Deception', 'cha'],
  ['history', 'History', 'int'],
  ['insight', 'Insight', 'wis'],
  ['intimidation', 'Intimidation', 'cha'],
  ['investigation', 'Investigation', 'int'],
  ['medicine', 'Medicine', 'wis'],
  ['nature', 'Nature', 'int'],
  ['perception', 'Perception', 'wis'],
  ['performance', 'Performance', 'cha'],
  ['persuasion', 'Persuasion', 'cha'],
  ['religion', 'Religion', 'int'],
  ['sleightOfHand', 'Sleight of Hand', 'dex'],
  ['stealth', 'Stealth', 'dex'],
  ['survival', 'Survival', 'wis'],
];

function main() {
  assertInside(DOCS_ROOT, PUBLIC_OUT);
  assertInside(DOCS_ROOT, DATA_OUT);
  assertInside(DOCS_ROOT, API_DATA_OUT);
  ensureDir(DOCS_ROOT);
  cleanDir(PUBLIC_OUT);
  cleanDir(DATA_OUT);
  cleanDir(API_DATA_OUT);
  ensureDir(SITE_ASSETS_OUT);

  const markdownFiles = walk(PUBLIC_SRC).filter(file => file.endsWith('.md'));
  const assetFiles = walk(PUBLIC_SRC).filter(file => !file.endsWith('.md'));
  const fileIndex = buildFileIndex(markdownFiles, assetFiles);
  const playerControls = parseFrontmatter(readIfExists(PRIVATE_PLAYER_CONTROLS)).data;
  const rules = loadCanonicalRules();
  const itemCatalog = buildRuleCatalog(rules.items);
  const spellCatalog = buildRuleCatalog(rules.spells);

  copyPublicAssets(assetFiles);

  const pages = markdownFiles.map(file => readPage(file));
  const players = [];
  const entities = [];
  const searchIndex = [];

  for (const page of pages) {
    if (isPlayerSheet(page)) {
      const player = buildPlayer(page, playerControls, fileIndex, rules, itemCatalog, spellCatalog);
      players.push(player.publicData);
      writeOutput(page.outputPath, renderPlayerPage(player, page, fileIndex));
      addIndexRecords(page, player.publicData.searchText, entities, searchIndex);
    } else {
      const bodyHtml = renderMarkdown(page.body, page, fileIndex);
      writeOutput(page.outputPath, renderStandardPage(page, bodyHtml, fileIndex));
      addIndexRecords(page, page.searchText, entities, searchIndex);
    }
  }

  const sortedEntities = entities.sort(byName);
  const sortedSearch = searchIndex.sort(byName);
  const sortedPlayers = players.sort(byName);

  writePublicDataJson('players.json', sortedPlayers);
  writePublicDataJson('spells.json', uniqueBy(Array.from(spellCatalog.values()), spell => spell.id || spell.name).sort(byName));
  writePublicDataJson('rules-manifest.json', rules.manifest || {});
  writePublicDataJson('entities.json', sortedEntities);
  writePublicDataJson('entity-index.json', sortedEntities);
  writePublicDataJson('search-index.json', sortedSearch);
  writeJson(path.join(DOCS_ROOT, 'npc-index.json'), buildNpcIndex(sortedEntities));
  writeJson(path.join(DOCS_ROOT, 'location-index.json'), buildLocationIndex(sortedEntities));

  writeSearchPage();
  writeUtilityAliases();

  console.log(`Built ${pages.length} pages from Public/`);
  console.log(`Copied ${assetFiles.length} public assets`);
  console.log(`Wrote ${UTILITY_ALIASES.length} utility compatibility pages`);
  console.log('Mirrored public JSON for Azure Functions');
  console.log(`Indexed ${sortedEntities.length} entities and ${sortedPlayers.length} players`);
}

function assertInside(root, target) {
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside docs/: ${target}`);
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function loadCanonicalRules() {
  const required = ['classes', 'subclasses', 'features', 'items', 'spells', 'feats', 'actions', 'effects', 'resources', 'manifest'];
  const rules = {};
  for (const name of required) {
    const file = path.join(RULES_ROOT, `${name}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing canonical rules file: ${normalizePath(path.relative(DOCS_ROOT, file))}. Run npm run rules:import first.`);
    }
    rules[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return rules;
}

function buildRuleCatalog(rows) {
  const catalog = new Map();
  for (const row of rows || []) {
    if (!row || !row.name) continue;
    const keys = [
      normalizeItemName(row.name),
      row.id ? normalizeItemName(row.id) : '',
      row.shortName ? normalizeItemName(row.shortName) : '',
    ].filter(Boolean);
    for (const key of keys) {
      if (!catalog.has(key)) catalog.set(key, row);
    }
  }
  return catalog;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) out.push(...walk(fullPath));
    else if (stat.isFile()) out.push(fullPath);
  }
  return out;
}

function copyPublicAssets(assetFiles) {
  for (const src of assetFiles) {
    const rel = path.relative(PUBLIC_SRC, src);
    const dest = path.join(PUBLIC_OUT, rel);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function writeOutput(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, String(content).replace(/[ \t]+$/gm, ''), 'utf8');
}

function writeJson(file, data) {
  writeOutput(file, JSON.stringify(data, null, 2) + '\n');
}

function writePublicDataJson(filename, data) {
  writeJson(path.join(DATA_OUT, filename), data);
  writeJson(path.join(API_DATA_OUT, filename), data);
}

function buildFileIndex(markdownFiles, assetFiles) {
  const byVaultPath = new Map();
  const byBasename = new Map();

  for (const file of markdownFiles) {
    const relNoExt = normalizePath(path.join('Public', path.relative(PUBLIC_SRC, file))).replace(/\.md$/i, '');
    const url = normalizePath(path.join('Public', path.relative(PUBLIC_SRC, file))).replace(/\.md$/i, '.html');
    byVaultPath.set(relNoExt.toLowerCase(), url);
    byVaultPath.set((relNoExt + '.md').toLowerCase(), url);
    addBasename(byBasename, path.basename(file, '.md'), url);
  }

  for (const file of assetFiles) {
    const rel = normalizePath(path.join('Public', path.relative(PUBLIC_SRC, file)));
    byVaultPath.set(rel.toLowerCase(), rel);
    addBasename(byBasename, path.basename(file), rel);
  }

  return { byVaultPath, byBasename };
}

function addBasename(map, name, url) {
  const key = name.toLowerCase();
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(url);
}

function readPage(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = parseFrontmatter(raw);
  const relMd = normalizePath(path.relative(PUBLIC_SRC, file));
  const relHtml = relMd.replace(/\.md$/i, '.html');
  const outputPath = path.join(PUBLIC_OUT, relHtml);
  const name = parsed.data.name || path.basename(file, '.md');
  const title = String(name).replace(/^["']|["']$/g, '');
  const body = parsed.body.trim();

  return {
    sourcePath: file,
    relMd,
    relHtml,
    outputPath,
    vaultPath: normalizePath(path.join('Public', relMd)),
    url: normalizePath(path.join('Public', relHtml)),
    fm: parsed.data,
    title,
    type: normalizeType(parsed.data.type, relMd),
    body,
    searchText: markdownToText(body),
  };
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: content };

  const data = {};
  let currentKey = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    const list = rawLine.match(/^\s+-\s*(.*)$/);
    if (list && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(parseYamlValue(list[1]));
      continue;
    }
    const kv = rawLine.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      data[currentKey] = kv[2] === '' ? [] : parseYamlValue(kv[2]);
    }
  }
  return { data, body: content.slice(match[0].length) };
}

function parseYamlValue(raw) {
  let val = raw.trim();
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
}

function normalizeType(type, relMd) {
  if (type) return String(type);
  const lower = relMd.toLowerCase();
  if (lower.includes('/npcs/')) return 'NPC';
  if (lower.includes('/players/')) return 'Player';
  if (lower.includes('/groups/')) return 'Organization';
  if (lower.includes('/events/')) return 'Event';
  if (lower.includes('/storylines/')) return 'Storyline';
  return 'Page';
}

function isPlayerSheet(page) {
  return page.relMd.startsWith('Players/') && /Player Sheet\.md$/i.test(page.relMd);
}

function buildPlayer(page, controls, fileIndex, rules, itemCatalog, spellCatalog) {
  const data = extractCharacterData(page.body, controls);
  const className = cleanRequiredString(data.class, `${page.relMd}: CharacterSheetDisplay requires class`);
  const subclassName = cleanRequiredString(data.subclass, `${page.relMd}: CharacterSheetDisplay requires subclass`);
  const matchedClass = findRuleClass(rules, className);
  if (!matchedClass) throw new Error(`${page.relMd}: class "${className}" is not present in canonical rules JSON.`);
  const matchedSubclass = findRuleSubclass(rules, className, subclassName);
  if (!matchedSubclass) throw new Error(`${page.relMd}: subclass "${subclassName}" is not present for class "${className}" in canonical rules JSON.`);

  const equipment = extractLookupArray(page.body, 'ItemLookup');
  const spells = extractLookupArray(page.body, 'SpellLookup');
  const spellScrolls = buildSpellScrolls(equipment, itemCatalog, spellCatalog);
  const backgrounds = extractLookupArray(page.body, 'BackgroundLookup');
  const feats = extractLookupArray(page.body, 'FeatLookup');
  const races = extractLookupArray(page.body, 'RaceLookup');
  const notesUrl = (page.body.match(/Direct link if Embed isn't working\s*:\s*(https?:\/\/\S+)/i) || [])[1] || '';
  const classUrlSuffix = (page.body.match(/urlSuffix:\s*([^\r\n]+)/i) || [])[1] || '';
  validateClassUrlState(page, classUrlSuffix, matchedClass, matchedSubclass, rules);
  const features = extractSection(page.body, 'Class Features & Abilities');

  const level = toNumber(data.level, 1);
  const proficiencyBonus = toNumber(data.proficiencyBonus, calculateProficiencyBonus(level));
  const modifiers = Object.fromEntries(ABILITIES.map(ability => [ability, calculateModifier(toNumber(data[ability], 10))]));
  const spellAbility = data.spellcasting || false;
  const spellMod = spellAbility ? modifiers[spellAbility] || 0 : 0;

  const publicData = {
    id: slugify(path.basename(page.relMd, '.md')),
    name: data.name || page.title,
    sheetTitle: page.title,
    class: matchedClass.name,
    subclass: matchedSubclass.name,
    subclassShortName: matchedSubclass.shortName || matchedSubclass.name,
    level,
    race: data.race || '',
    background: data.background || '',
    portrait: data.portrait || '',
    experience: toNumber(data.experience, 0),
    gold: toNumber(data.gold, 0),
    heroPoints: toNumber(data.heroPoints, 0),
    guildPoints: toNumber(data.guildPoints, 0),
    guildRank: data.guildRank || '',
    abilities: Object.fromEntries(ABILITIES.map(ability => [ability, toNumber(data[ability], 10)])),
    ac: toNumber(data.ac, 10),
    speed: toNumber(data.speed, 30),
    maxHp: data.maxHp !== undefined ? toNumber(data.maxHp, 0) : null,
    currentHp: data.currentHp !== undefined ? toNumber(data.currentHp, data.maxHp || 0) : null,
    proficiencyBonus,
    initiative: data.initiative !== undefined ? toNumber(data.initiative, modifiers.dex) : modifiers.dex,
    saves: Array.isArray(data.saves) ? data.saves : [],
    skills: Array.isArray(data.skills) ? data.skills.map(normalizeSkillId).filter(Boolean) : [],
    spellcasting: spellAbility,
    spellAttack: spellAbility ? spellMod + proficiencyBonus : null,
    spellSaveDc: spellAbility ? 8 + spellMod + proficiencyBonus : null,
    attackBonuses: {
      ranged: /archery fighting style/i.test(features) ? 2 : 0,
    },
    simpleWeapons: data.simpleWeapons === true,
    martialWeapons: data.martialWeapons === true,
    hitDice: data.hitDice || inferHitDice(matchedClass, level),
    equipment,
    itemDetails: buildPlayerItemDetails(equipment, itemCatalog),
    equipped: [],
    spells,
    spellScrolls,
    spellDetails: buildPlayerSpellDetails([...spells, ...spellScrolls.map(scroll => scroll.spellName)], spellCatalog),
    spellSlots: calculateSpellSlots(matchedClass, level, spellAbility),
    resources: buildPlayerResources(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog),
    ruleActions: buildPlayerRuleActions(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog, feats, spells),
    ruleEffects: buildPlayerRuleEffects(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog, feats),
    ruleFeatures: buildPlayerRuleFeatures(rules, matchedClass, matchedSubclass, level),
    notes: data.notes || '',
    backgrounds,
    feats,
    races,
    notesUrl,
    classUrl: classUrlSuffix ? `5etools/classes.html${classUrlSuffix}` : '',
    rulesSource: {
      kind: 'canonical-json',
      schemaVersion: rules.manifest && rules.manifest.schemaVersion,
      generatedAtUtc: rules.manifest && rules.manifest.generatedAtUtc,
    },
    url: page.url,
    searchText: markdownToText(page.body),
  };

  return {
    data: publicData,
    publicData,
    modifiers,
    features,
    portraitUrl: data.portrait ? relativeUrl(page.url, resolveVaultTarget(data.portrait, page, fileIndex)) : '',
  };
}

function cleanRequiredString(value, message) {
  const text = String(value || '').trim();
  if (!text) throw new Error(message);
  if (/[()]/.test(text)) throw new Error(`${message}; use separate class/subclass fields instead of "${text}".`);
  return text;
}

function findRuleClass(rules, className) {
  const target = normalizeItemName(className);
  return (rules.classes || []).find(cls => normalizeItemName(cls.name) === target || normalizeItemName(cls.id) === target);
}

function findRuleSubclass(rules, className, subclassName) {
  const classTarget = normalizeItemName(className);
  const subclassTarget = normalizeItemName(subclassName);
  return (rules.subclasses || []).find(subclass => {
    if (normalizeItemName(subclass.className) !== classTarget) return false;
    return [subclass.name, subclass.shortName, subclass.id].some(value => normalizeItemName(value) === subclassTarget);
  });
}

function validateClassUrlState(page, suffix, matchedClass, matchedSubclass, rules) {
  if (!suffix) return;
  const parsed = parseClassUrlSuffix(suffix, rules, matchedClass.name);
  if (parsed.className && normalizeItemName(parsed.className) !== normalizeItemName(matchedClass.name)) {
    throw new Error(`${page.relMd}: explicit class "${matchedClass.name}" disagrees with 5etools URL class "${parsed.className}".`);
  }
  if (parsed.subclassName) {
    const expected = [matchedSubclass.name, matchedSubclass.shortName].map(normalizeItemName);
    if (!expected.includes(normalizeItemName(parsed.subclassName))) {
      throw new Error(`${page.relMd}: explicit subclass "${matchedSubclass.name}" disagrees with 5etools URL subclass "${parsed.subclassName}".`);
    }
  }
}

function parseClassUrlSuffix(suffix, rules, explicitClassName) {
  const out = { className: '', subclassName: '' };
  const classMatch = String(suffix || '').match(/#([^_,\s]+)/);
  if (classMatch) {
    const classToken = normalizeItemName(classMatch[1].replace(/_phb.*$/i, ''));
    const cls = (rules.classes || []).find(candidate => normalizeItemName(candidate.name) === classToken);
    out.className = cls ? cls.name : classToken;
  }

  const subclassMatch = String(suffix || '').match(/state:sub_([^=,]+)=/i);
  if (subclassMatch) {
    const token = normalizeItemName(subclassMatch[1].replace(/_(phb|xge|tce|scag|dmg|ftd|tdcsr).*$/i, ''));
    const subclass = (rules.subclasses || []).find(candidate => {
      if (explicitClassName && normalizeItemName(candidate.className) !== normalizeItemName(explicitClassName)) return false;
      return [candidate.name, candidate.shortName, candidate.id].some(value => normalizeItemName(value).includes(token) || token.includes(normalizeItemName(value)));
    });
    out.subclassName = subclass ? (subclass.shortName || subclass.name) : token;
  }
  return out;
}

function inferHitDice(matchedClass, level) {
  const hitDie = matchedClass && matchedClass.hitDie ? matchedClass.hitDie : 'd8';
  return `${level}${hitDie}`;
}

function buildPlayerResources(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog) {
  const featureIds = getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level);
  const resources = [];
  for (const resource of rules.resources || []) {
    if (resource.sourceType === 'core') {
      resources.push(resource);
    } else if (resource.sourceId && featureIds.has(resource.sourceId)) {
      resources.push(resource);
    }
  }
  for (const itemName of equipment) {
    const item = findCatalogItem(itemCatalog, itemName);
    if (item && Array.isArray(item.resources)) {
      resources.push(...item.resources.map(resource => ({ ...resource, sourceType: 'item', sourceId: item.id, itemName: item.name })));
    }
  }
  return uniqueBy(resources, resource => resource.id);
}

function buildPlayerRuleActions(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog, feats, spells) {
  const featureIds = getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level);
  const itemIds = new Set(equipment.map(itemName => {
    const item = findCatalogItem(itemCatalog, itemName);
    return item && item.id;
  }).filter(Boolean));
  const featIds = new Set((feats || []).map(slugify));
  const spellIds = new Set((spells || []).map(slugify));
  return (rules.actions || []).filter(action => {
    if (action.sourceType === 'class' || action.sourceType === 'subclass') return featureIds.has(action.sourceId);
    if (action.sourceType === 'item') return itemIds.has(action.sourceId);
    if (action.sourceType === 'feat') return featIds.has(action.sourceId);
    if (action.sourceType === 'spell') return spellIds.has(action.sourceId);
    return false;
  }).slice(0, 160);
}

function buildPlayerRuleEffects(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog, feats) {
  const featureIds = getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level);
  const itemIds = new Set(equipment.map(itemName => {
    const item = findCatalogItem(itemCatalog, itemName);
    return item && item.id;
  }).filter(Boolean));
  const featIds = new Set((feats || []).map(slugify));
  return (rules.effects || []).filter(effect => {
    if (effect.sourceType === 'class' || effect.sourceType === 'subclass') return featureIds.has(effect.sourceId);
    if (effect.sourceType === 'item') return itemIds.has(effect.sourceId);
    if (effect.sourceType === 'feat') return featIds.has(effect.sourceId);
    return false;
  }).slice(0, 160);
}

function buildPlayerRuleFeatures(rules, matchedClass, matchedSubclass, level) {
  const featureIds = getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level);
  return (rules.features || [])
    .filter(feature => featureIds.has(feature.id))
    .map(feature => ({
      id: feature.id,
      kind: feature.kind,
      name: feature.name,
      className: feature.className || '',
      subclassName: feature.subclassShortName || feature.subclassName || '',
      level: feature.level,
      source: feature.source || '',
      text: cleanRulesText(feature.text || ''),
      timing: feature.timing || '',
      resourceHint: feature.resourceHint || '',
    }))
    .sort((a, b) => a.level - b.level || `${a.kind} ${a.name}`.localeCompare(`${b.kind} ${b.name}`))
    .slice(0, 120);
}

function getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level) {
  const className = normalizeItemName(matchedClass.name);
  const subclassNames = new Set([matchedSubclass.name, matchedSubclass.shortName].map(normalizeItemName));
  return new Set((rules.features || [])
    .filter(feature => feature.level <= level)
    .filter(feature => {
      if (normalizeItemName(feature.className) !== className) return false;
      if (feature.kind === 'class') return true;
      return subclassNames.has(normalizeItemName(feature.subclassName)) || subclassNames.has(normalizeItemName(feature.subclassShortName));
    })
    .map(feature => feature.id));
}

function calculateSpellSlots(matchedClass, level, spellAbility) {
  if (!spellAbility || !matchedClass || !matchedClass.casterProgression) return {};
  const progression = matchedClass.casterProgression;
  if (progression === 'pact') return getPactSlots(level);
  const casterLevel = progression === 'half' ? Math.max(1, Math.ceil(level / 2)) : level;
  return FULL_CASTER_SLOTS[Math.max(1, Math.min(20, casterLevel))] || {};
}

const FULL_CASTER_SLOTS = {
  1: { 1: 2 },
  2: { 1: 3 },
  3: { 1: 4, 2: 2 },
  4: { 1: 4, 2: 3 },
  5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 },
  7: { 1: 4, 2: 3, 3: 3, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
};

function getPactSlots(level) {
  if (level < 2) return { pact: { level: 1, slots: 1 } };
  if (level < 3) return { pact: { level: 1, slots: 2 } };
  if (level < 5) return { pact: { level: 2, slots: 2 } };
  if (level < 7) return { pact: { level: 3, slots: 2 } };
  if (level < 9) return { pact: { level: 4, slots: 2 } };
  if (level < 11) return { pact: { level: 5, slots: 2 } };
  if (level < 17) return { pact: { level: 5, slots: 3 } };
  return { pact: { level: 5, slots: 4 } };
}

function extractCharacterData(body, controls) {
  const callIndex = body.indexOf('CharacterSheetDisplay.display');
  if (callIndex < 0) return {};
  const braceStart = body.indexOf('{', callIndex);
  const braceEnd = findMatching(body, braceStart, '{', '}');
  if (braceStart < 0 || braceEnd < 0) return {};
  let objectSource = body.slice(braceStart, braceEnd + 1);
  objectSource = objectSource
    .replace(/dv\.page\("Player Controls"\)\.level/g, JSON.stringify(toNumber(controls.level, 1)))
    .replace(/dv\.page\("Player Controls"\)\.ExperiencePoints/g, JSON.stringify(toNumber(controls.ExperiencePoints, 0)))
    .replace(/dv\.page\("Player Controls"\)\.GuildPoints/g, JSON.stringify(toNumber(controls.GuildPoints, 0)))
    .replace(/dv\.page\("Player Controls"\)\.GuildRank/g, JSON.stringify(controls.GuildRank || ''));
  return safeEvalExpression(objectSource, {});
}

function extractLookupArray(body, className) {
  const call = `${className}.display`;
  const out = [];
  let cursor = 0;
  while (cursor < body.length) {
    const idx = body.indexOf(call, cursor);
    if (idx < 0) break;
    const arrStart = body.indexOf('[', idx);
    if (arrStart < 0) break;
    const arrEnd = findMatching(body, arrStart, '[', ']');
    if (arrEnd < 0) break;
    const arr = safeEvalExpression(body.slice(arrStart, arrEnd + 1), []);
    if (Array.isArray(arr)) out.push(...arr.map(String).filter(Boolean));
    cursor = arrEnd + 1;
  }
  return [...new Set(out)];
}

function buildPlayerItemDetails(equipment, itemCatalog) {
  const out = {};
  for (const name of equipment) {
    const row = findCatalogItem(itemCatalog, name);
    if (!row) continue;
    out[name] = {
      id: row.id || slugify(row.name || name),
      name: row.name || name,
      source: row.source || '',
      page: row.page || '',
      rarity: row.rarity || '',
      type: row.type || '',
      attunement: row.attunement || '',
      damage: row.damage || '',
      properties: Array.isArray(row.properties) ? row.properties.join(', ') : row.properties || '',
      weight: row.weight || '',
      value: row.value || '',
      text: cleanRulesText(row.text || ''),
      weapon: row.weapon || null,
      actions: Array.isArray(row.actions) ? row.actions : [],
      effects: Array.isArray(row.effects) ? row.effects : [],
      resources: Array.isArray(row.resources) ? row.resources : [],
      toggles: Array.isArray(row.toggles) ? row.toggles : [],
    };
  }
  return out;
}

function buildPlayerSpellDetails(spells, spellCatalog) {
  const out = {};
  for (const name of spells) {
    const spell = spellCatalog.get(normalizeItemName(name));
    if (spell) out[name] = spell;
  }
  return out;
}

function findCatalogItem(itemCatalog, name) {
  if (!itemCatalog || !itemCatalog.size) return null;
  const key = normalizeItemName(name);
  if (itemCatalog.has(key)) return itemCatalog.get(key);
  const scroll = parseSpellScrollEquipment(name);
  if (scroll && itemCatalog.has(normalizeItemName(scroll.scrollName))) return itemCatalog.get(normalizeItemName(scroll.scrollName));
  const withoutBonus = key.replace(/^\+\d+\s+/, '');
  if (withoutBonus !== key && itemCatalog.has(withoutBonus)) return itemCatalog.get(withoutBonus);
  for (const item of itemCatalog.values()) {
    const itemName = normalizeItemName(item && item.name);
    if (itemName && (key.includes(itemName) || itemName.includes(withoutBonus))) return item;
  }
  return null;
}

function buildSpellScrolls(equipment, itemCatalog, spellCatalog) {
  return equipment.map(itemName => {
    const scroll = parseSpellScrollEquipment(itemName);
    if (!scroll) return null;
    const scrollItem = findCatalogItem(itemCatalog, scroll.scrollName);
    const spell = spellCatalog.get(normalizeItemName(scroll.spellName));
    return {
      id: slugify(itemName),
      itemName,
      scrollName: scroll.scrollName,
      spellName: scroll.spellName,
      source: scroll.scrollName,
      castingTime: spell ? spell.castingTime : '',
      level: spell ? spell.level : '',
      school: spell ? spell.school : '',
      range: spell ? spell.range : '',
      saveDc: parseScrollNumber(scrollItem && scrollItem.text, /save DC of (\d+)/i),
      attackBonus: parseScrollNumber(scrollItem && scrollItem.text, /attack bonus of \+(\d+)/i),
      text: scrollItem ? cleanRulesText(scrollItem.text || '') : '',
    };
  }).filter(Boolean);
}

function parseSpellScrollEquipment(name) {
  const match = String(name || '').match(/^(Spell Scroll \([^)]+\))\s*\|\s*(.+)$/i);
  if (!match) return null;
  return { scrollName: match[1].trim(), spellName: match[2].trim() };
}

function parseScrollNumber(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? Number(match[1]) || null : null;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeItemName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
}

function cleanRulesText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([a-z0-9.)])([A-Z])/g, '$1 $2')
    .trim();
}

function safeEvalExpression(source, fallback) {
  try {
    return Function(`"use strict"; return (${source});`)();
  } catch (err) {
    console.warn(`Could not parse expression: ${err.message}`);
    return fallback;
  }
}

function findMatching(text, start, open, close) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractSection(body, headingText) {
  const re = new RegExp(`^#{1,6}\\s+${escapeRegExp(headingText)}\\s*$`, 'mi');
  const match = body.match(re);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const next = rest.search(/^#{1,2}\s+/m);
  return (next >= 0 ? rest.slice(0, next) : rest).trim();
}

function renderStandardPage(page, bodyHtml, fileIndex) {
  const title = escapeHtml(page.title);
  const assetPrefix = relativeUrl(page.url, 'site-assets/public-site.css').replace(/public-site\.css$/, '');
  const meta = renderMeta(page);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Eldoria</title>
  <link rel="stylesheet" href="${assetPrefix}public-site.css">
  <script src="${assetPrefix}site-config.js"></script>
  <script src="${assetPrefix}public-site.js" defer></script>
</head>
<body>
  ${renderSiteHeader(page)}
  <main class="page-shell">
    <article class="note-page">
      <header class="note-header">
        <div class="kicker">${escapeHtml(page.type)}</div>
        <h1>${title}</h1>
        ${meta}
      </header>
      <div class="markdown-body">
${bodyHtml}
      </div>
    </article>
  </main>
</body>
</html>
`;
}

function renderPlayerPage(player, page) {
  const p = player.data;
  const title = escapeHtml(p.name);
  const assetPrefix = relativeUrl(page.url, 'site-assets/public-site.css').replace(/public-site\.css$/, '');
  const abilities = ABILITIES.map(ability => {
    const score = p.abilities[ability];
    return `<div class="ability-card" data-player-ability="${ability}"><span>${ABILITY_NAMES[ability]}</span><strong>${score}</strong><em>${formatBonus(player.modifiers[ability])}</em></div>`;
  }).join('\n');

  const saves = ABILITIES.map(ability => {
    const proficient = p.saves.includes(ability);
    const bonus = player.modifiers[ability] + (proficient ? p.proficiencyBonus : 0);
    return `<div class="line-stat ${proficient ? 'proficient' : ''}" data-player-save="${ability}"><span>${ABILITY_NAMES[ability]}</span><strong>${formatBonus(bonus)}</strong></div>`;
  }).join('\n');

  const skills = SKILLS.map(([id, label, ability]) => {
    const proficient = p.skills.includes(id);
    const bonus = player.modifiers[ability] + (proficient ? p.proficiencyBonus : 0);
    return `<div class="line-stat ${proficient ? 'proficient' : ''}" data-player-skill="${id}" data-ability="${ability}"><span>${label} <small>${ability.toUpperCase()}</small></span><strong>${formatBonus(bonus)}</strong></div>`;
  }).join('\n');

  const featuresHtml = player.features ? renderMarkdown(player.features, page, { byVaultPath: new Map(), byBasename: new Map() }) : '<p>No extra class features recorded.</p>';
  const canonicalFeaturesHtml = renderClassFeatureList(p.ruleFeatures || []);
  const portrait = player.portraitUrl
    ? `<img src="${escapeAttr(player.portraitUrl)}" alt="${title} portrait">`
    : `<span>${escapeHtml(title.slice(0, 1))}</span>`;
  const playerBootstrap = renderPlayerBootstrap(p);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Eldoria Player Sheet</title>
  <link rel="stylesheet" href="${assetPrefix}public-site.css">
  <script src="${assetPrefix}site-config.js"></script>
  ${playerBootstrap}
  <script src="${assetPrefix}public-site.js" defer></script>
</head>
<body>
  ${renderSiteHeader(page)}
  <main class="player-sheet" data-tabs data-player-sheet data-player-id="${escapeAttr(p.id)}">
    <section class="player-hero">
      <div class="portrait">${portrait}</div>
      <div>
        <div class="kicker">Player Character</div>
        <h1 data-player-field="name">${title}</h1>
        <p data-player-summary>${escapeHtml([p.race, `${p.class}${p.subclassShortName ? ` (${p.subclassShortName})` : ''}`, `Level ${p.level}`].filter(Boolean).join(' / '))}</p>
      </div>
      <div class="hero-stats">
        <div><span>AC</span><strong data-player-stat="ac">${p.ac}</strong></div>
        <div><span>Init</span><strong data-player-stat="initiative">${formatBonus(p.initiative)}</strong></div>
        <div><span>Prof</span><strong data-player-stat="proficiencyBonus">${formatBonus(p.proficiencyBonus)}</strong></div>
        <div><span>Speed</span><strong data-player-stat="speed">${p.speed} ft</strong></div>
      </div>
      <div class="equipped-summary" data-equipped-summary></div>
    </section>

    <nav class="tabs" role="tablist" aria-label="Character sheet sections">
      ${tabButton('overview', 'Overview', true)}
      ${tabButton('abilities', 'Abilities')}
      ${tabButton('combat', 'Combat')}
      ${tabButton('actions', 'Actions')}
      ${tabButton('resources', 'Resources')}
      ${tabButton('skills', 'Skills/Saves')}
      ${tabButton('equipment', 'Equipment')}
      ${tabButton('spells', 'Spells')}
      ${tabButton('class-info', 'Class Info')}
      ${tabButton('notes', 'Notes')}
    </nav>

    ${tabPanel('overview', true, `
      ${inlineEditPanel('Edit Overview', `
        <div class="form-grid">
          ${editNumberField('currentHp', 'Current HP')}
          ${editNumberField('tempHp', 'Temp HP', 'min="0"')}
          ${editNumberField('maxHp', 'Max HP')}
          ${editNumberField('gold', 'Gold', 'min="0"')}
          ${editNumberField('heroPoints', 'Hero Points', 'min="0"')}
        </div>
      `, true)}
      <div class="sheet-grid">
        ${infoCard('Class', p.class, 'class')}
        ${infoCard('Subclass', p.subclassShortName || p.subclass || '-', 'subclass')}
        ${infoCard('Race', p.race, 'race')}
        ${infoCard('Background', p.background, 'background')}
        ${infoCard('Experience', p.experience || '-', 'experience')}
        ${infoCard('Gold', p.gold || 0, 'gold')}
        ${infoCard('Hero Points', p.heroPoints || 0, 'heroPoints')}
        ${infoCard('Guild Rank', p.guildRank || '-', 'guildRank')}
        ${infoCard('Guild Points', p.guildPoints || '-', 'guildPoints')}
      </div>
    `)}

    ${tabPanel('abilities', false, `
      ${inlineEditPanel('Edit Abilities', `<div class="form-grid">${abilityEditFields()}</div>`)}
      <div class="abilities-grid">${abilities}</div>
    `)}

    ${tabPanel('combat', false, `
      ${inlineEditPanel('Edit Combat', `
        <div class="form-grid">
          ${editNumberField('currentHp', 'Current HP')}
          ${editNumberField('tempHp', 'Temp HP', 'min="0"')}
          ${editNumberField('maxHp', 'Max HP')}
          ${editNumberField('ac', 'Armor Class')}
          ${editNumberField('speed', 'Speed')}
        </div>
      `)}
      <div data-ac-panel></div>
      <div class="sheet-grid">
        ${infoCard('Armor Class', p.ac, 'ac')}
        ${infoCard('Initiative', formatBonus(p.initiative), 'initiative')}
        ${infoCard('Proficiency', formatBonus(p.proficiencyBonus), 'proficiencyBonus')}
        ${infoCard('Speed', `${p.speed} ft`, 'speed')}
        ${infoCard('Simple Melee', formatBonus(player.modifiers.str + (p.simpleWeapons ? p.proficiencyBonus : 0)))}
        ${infoCard('Simple Ranged', formatBonus(player.modifiers.dex + (p.simpleWeapons ? p.proficiencyBonus : 0)))}
        ${infoCard('Martial Melee', formatBonus(player.modifiers.str + (p.martialWeapons ? p.proficiencyBonus : 0)))}
        ${infoCard('Martial Ranged', formatBonus(player.modifiers.dex + (p.martialWeapons ? p.proficiencyBonus : 0)))}
        ${infoCard('Spell Attack', p.spellAttack === null ? '-' : formatBonus(p.spellAttack), 'spellAttack')}
        ${infoCard('Spell Save DC', p.spellSaveDc === null ? '-' : p.spellSaveDc, 'spellSaveDc')}
      </div>
      <section>
        <h2>Weapon Attacks</h2>
        <div class="weapon-grid" data-weapon-attacks></div>
        <div class="roll-log" data-roll-log></div>
      </section>
      <div data-temporary-effects-panel></div>
    `)}

    ${tabPanel('actions', false, `
      ${inlineEditPanel('Edit Combat Stats', `
        <div class="form-grid">
          ${editNumberField('currentHp', 'Current HP')}
          ${editNumberField('tempHp', 'Temp HP', 'min="0"')}
          ${editNumberField('maxHp', 'Max HP')}
          ${editNumberField('ac', 'Armor Class')}
          ${editNumberField('speed', 'Speed')}
        </div>
      `)}
      <div data-actions-panel></div>
    `)}

    ${tabPanel('resources', false, `
      ${inlineEditPanel('Edit Health', `
        <div class="form-grid">
          ${editNumberField('currentHp', 'Current HP')}
          ${editNumberField('tempHp', 'Temp HP', 'min="0"')}
          ${editNumberField('maxHp', 'Max HP')}
        </div>
      `)}
      <div data-resources-panel></div>
    `)}

    ${tabPanel('skills', false, `
      ${inlineEditPanel('Edit Abilities', `<div class="form-grid">${abilityEditFields()}</div>`)}
      <div class="two-column">
        <section><h2>Saving Throws</h2><div class="line-list">${saves}</div></section>
        <section><h2>Skills</h2><div class="line-list">${skills}</div></section>
      </div>
    `)}

    ${tabPanel('equipment', false, `
      ${inlineEditPanel('Edit Equipment', `
        <label class="wide-field"><span>Equipment</span><textarea name="equipment" rows="8"></textarea></label>
      `)}
      <div data-equipment-panel data-items-url="${escapeAttr(relativeUrl(page.url, 'Assets/Rules/items.json'))}"></div>
    `)}
    ${tabPanel('spells', false, `<div data-spell-panel data-spells-url="${escapeAttr(relativeUrl(page.url, 'data/spells.json'))}"></div>`)}
    ${tabPanel('class-info', false, `
      <div class="sheet-grid">
        ${infoCard('Class', `${p.class}${p.subclassShortName ? ` (${p.subclassShortName})` : ''}`, 'classSummary')}
        ${infoCard('Background', p.backgrounds.join(', ') || p.background || '-', 'backgrounds')}
        ${infoCard('Feats', p.feats.join(', ') || '-', 'feats')}
        ${infoCard('Race', p.races.join(', ') || p.race || '-', 'races')}
      </div>
      <section class="feature-notes">
        <h2>Class Features</h2>
        ${canonicalFeaturesHtml}
      </section>
      <section class="feature-notes">
        <h2>Sheet Feature Notes</h2>
        ${featuresHtml}
      </section>
    `)}
    ${tabPanel('notes', false, `
      <form class="notes-form" data-player-notes-form>
        <label class="wide-field"><span>Session Notes</span><textarea name="notes" rows="14" placeholder="Write session notes, reminders, loot claims, NPC leads..."></textarea></label>
        <div class="form-actions">
          <button type="submit">Save Notes</button>
          <span data-player-notes-status></span>
        </div>
      </form>
      <div class="resource-links">
        ${p.notesUrl ? `<a href="${escapeAttr(p.notesUrl)}">Player notes</a>` : ''}
        ${p.classUrl ? `<a href="${escapeAttr(relativeUrl(page.url, p.classUrl))}">Full class info</a>` : ''}
        <a href="${escapeAttr(relativeUrl(page.url, 'spell-search.html'))}">Quick spell lookup</a>
      </div>
    `)}
  </main>
</body>
</html>
`;
}

function tabButton(id, label, active = false) {
  return `<button class="tab-button ${active ? 'active' : ''}" data-tab-target="${id}" type="button" role="tab" aria-selected="${active ? 'true' : 'false'}">${label}</button>`;
}

function inlineEditPanel(title, body, includeReset = false) {
  return `<details class="inline-edit-panel">
    <summary><span>${escapeHtml(title)}</span><strong>Edit</strong></summary>
    <form class="edit-form" data-player-edit-form>
      ${body}
      <div class="form-actions">
        <button type="submit">Save</button>
        ${includeReset ? '<button type="button" data-player-reset>Reset</button>' : ''}
        <span data-player-edit-status></span>
      </div>
    </form>
  </details>`;
}

function renderClassFeatureList(features) {
  if (!features.length) return '<p>No class features found in canonical rules.</p>';
  return `<div class="class-feature-list">
    ${features.map(feature => `<details class="class-feature-row">
      <summary>
        <span>
          <strong>${escapeHtml(feature.name)}</strong>
          <small>${escapeHtml([feature.kind === 'subclass' ? feature.subclassName : feature.className, feature.level ? `Level ${feature.level}` : '', feature.timing, feature.resourceHint].filter(Boolean).join(' / '))}</small>
        </span>
      </summary>
      <p>${escapeHtml(feature.text || 'No feature text recorded.')}</p>
    </details>`).join('')}
  </div>`;
}

function editNumberField(name, label, attrs = '') {
  return `<label><span>${escapeHtml(label)}</span><input name="${escapeAttr(name)}" type="number" inputmode="numeric" ${attrs}></label>`;
}

function abilityEditFields() {
  return ABILITIES.map(ability => editNumberField(ability, ABILITY_NAMES[ability])).join('');
}

function renderPlayerBootstrap(player) {
  const slim = { ...player };
  delete slim.searchText;
  return `<script type="application/json" data-player-bootstrap>${escapeScriptJson(JSON.stringify(slim))}</script>`;
}

function tabPanel(id, active, html) {
  return `<section class="tab-panel ${active ? 'active' : ''}" data-tab-panel="${id}" role="tabpanel">${html}</section>`;
}

function infoCard(label, value, field = '') {
  const attr = field ? ` data-player-field="${escapeAttr(field)}"` : '';
  return `<div class="info-card"><span>${escapeHtml(label)}</span><strong${attr}>${escapeHtml(String(value ?? '-'))}</strong></div>`;
}

function renderChipList(items, empty, listName = '') {
  if (listName) {
    const attr = ` data-player-list="${escapeAttr(listName)}" data-empty="${escapeAttr(empty)}"`;
    const body = items && items.length ? items.map(item => `<span>${escapeHtml(item)}</span>`).join('') : `<span>${escapeHtml(empty)}</span>`;
    return `<div class="chip-list"${attr}>${body}</div>`;
  }
  if (!items || items.length === 0) return `<p class="empty-note">${escapeHtml(empty)}</p>`;
  return `<div class="chip-list">${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;
}

function renderMeta(page) {
  const pairs = [
    ['Region', page.fm.region],
    ['Location', page.fm.location || page.fm.headquarters],
    ['Status', page.fm.status],
    ['Profession', page.fm.profession],
  ].filter(([, value]) => value);
  if (!pairs.length) return '';
  return `<dl class="meta-row">${pairs.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join('')}</dl>`;
}

function renderSiteHeader(page) {
  const home = relativeUrl(page.url, 'index.html');
  const search = relativeUrl(page.url, 'search.html');
  return `<header class="site-header">
    <a class="site-title" href="${home}">Eldoria</a>
    <nav>
      <a href="${search}">Search</a>
      <a href="${relativeUrl(page.url, 'WorldMap.html')}">Map</a>
      <a href="${relativeUrl(page.url, 'npc-reference.html')}">NPCs</a>
      <a href="${relativeUrl(page.url, 'location-reference.html')}">Locations</a>
    </nav>
  </header>`;
}

function renderMarkdown(markdown, page, fileIndex) {
  const lines = stripFrontmatter(markdown).split(/\r?\n/);
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(/^```(\w[\w-]*)?/);
    if (fence) {
      const lang = fence[1] || '';
      const block = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) block.push(lines[i++]);
      i++;
      if (lang === 'dataview' || lang === 'custom-frames') continue;
      if (lang === 'dataviewjs') {
        const lookup = renderLookupBlock(block.join('\n'));
        if (lookup) html.push(lookup);
        continue;
      }
      html.push(`<pre><code>${escapeHtml(block.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level} id="${slugify(stripInline(text))}">${renderInline(text, page, fileIndex)}</h${level}>`);
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      html.push('<hr>');
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      html.push(`<ul>${items.map(item => `<li>${renderInline(item, page, fileIndex)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      html.push(`<ol>${items.map(item => `<li>${renderInline(item, page, fileIndex)}</li>`).join('')}</ol>`);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      html.push(`<blockquote>${quote.map(item => `<p>${renderInline(item, page, fileIndex)}</p>`).join('')}</blockquote>`);
      continue;
    }

    if (isTableStart(lines, i)) {
      const rows = [];
      rows.push(splitTableRow(lines[i]));
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      html.push(renderTable(rows, page, fileIndex));
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^```/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      paragraph.push(lines[i]);
      i++;
    }
    const paragraphText = paragraph.join(' ').trim();
    const onlyEmbed = paragraphText.match(/^!\[\[([^\]]+)\]\]$/);
    html.push(onlyEmbed ? renderEmbed(onlyEmbed[1], page, fileIndex) : `<p>${renderInline(paragraphText, page, fileIndex)}</p>`);
  }

  return html.join('\n');
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function renderLookupBlock(code) {
  const types = [
    ['ItemLookup', 'Items'],
    ['SpellLookup', 'Spells'],
    ['BackgroundLookup', 'Backgrounds'],
    ['FeatLookup', 'Feats'],
    ['RaceLookup', 'Races'],
  ];
  for (const [className, label] of types) {
    if (!code.includes(`${className}.display`)) continue;
    const arrStart = code.indexOf('[');
    const arrEnd = arrStart >= 0 ? findMatching(code, arrStart, '[', ']') : -1;
    const items = arrEnd >= 0 ? safeEvalExpression(code.slice(arrStart, arrEnd + 1), []) : [];
    return `<aside class="lookup-summary"><strong>${label}</strong>${renderChipList(items, `No ${label.toLowerCase()} listed.`)}</aside>`;
  }
  return '';
}

function isTableStart(lines, index) {
  return /^\s*\|.*\|\s*$/.test(lines[index] || '') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] || '');
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function renderTable(rows, page, fileIndex) {
  const [head, ...body] = rows;
  return `<table><thead><tr>${head.map(cell => `<th>${renderInline(cell, page, fileIndex)}</th>`).join('')}</tr></thead><tbody>${body.map(row => `<tr>${row.map(cell => `<td>${renderInline(cell, page, fileIndex)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderInline(text, page, fileIndex) {
  const codeTokens = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODE${codeTokens.length}@@`;
    codeTokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  out = escapeHtml(out);
  out = out.replace(/!\[\[([^\]]+)\]\]/g, (_, target) => renderEmbed(target, page, fileIndex));
  out = out.replace(/\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, hash, label) => {
    const resolved = resolveVaultTarget(target.trim() + (hash || ''), page, fileIndex);
    const href = relativeUrl(page.url, resolved);
    const textLabel = label || path.basename(target.trim());
    return `<a href="${escapeAttr(href)}">${escapeHtml(textLabel)}</a>`;
  });
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  for (let i = 0; i < codeTokens.length; i++) out = out.replace(`@@CODE${i}@@`, codeTokens[i]);
  return out;
}

function renderEmbed(target, page, fileIndex) {
  const cleanTarget = target.trim();
  const resolved = resolveVaultTarget(cleanTarget, page, fileIndex);
  const href = relativeUrl(page.url, resolved);
  const ext = path.extname(cleanTarget).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
    return `<figure class="note-image"><img src="${escapeAttr(href)}" alt="${escapeAttr(path.basename(cleanTarget, ext))}"></figure>`;
  }
  return `<a href="${escapeAttr(href)}">${escapeHtml(cleanTarget)}</a>`;
}

function resolveVaultTarget(target, page, fileIndex) {
  let clean = normalizePath(target).replace(/^\/+/, '');
  let hash = '';
  const hashIndex = clean.indexOf('#');
  if (hashIndex >= 0) {
    hash = clean.slice(hashIndex);
    clean = clean.slice(0, hashIndex);
  }

  const candidates = [];
  if (clean.startsWith('Public/')) candidates.push(clean);
  candidates.push(normalizePath(path.join('Public', path.dirname(page.relMd), clean)));
  candidates.push(normalizePath(path.join('Public', clean)));

  for (const candidate of candidates) {
    const noExt = candidate.replace(/\.md$/i, '').replace(/\.html$/i, '');
    const found = fileIndex.byVaultPath.get(noExt.toLowerCase()) || fileIndex.byVaultPath.get(candidate.toLowerCase());
    if (found) return found + hashToAnchor(hash);
  }

  const byName = fileIndex.byBasename.get(path.basename(clean).toLowerCase());
  if (byName && byName.length) return byName[0] + hashToAnchor(hash);

  if (clean.startsWith('http')) return clean;
  return clean.replace(/\.md$/i, '.html') + hashToAnchor(hash);
}

function hashToAnchor(hash) {
  if (!hash) return '';
  return '#' + slugify(hash.replace(/^#/, ''));
}

function relativeUrl(fromUrl, toUrl) {
  if (!toUrl) return '';
  if (/^https?:\/\//i.test(toUrl)) return toUrl;
  const fromDir = path.posix.dirname(normalizePath(fromUrl));
  let rel = path.posix.relative(fromDir, normalizePath(toUrl));
  if (!rel.startsWith('.')) rel = './' + rel;
  return encodeURI(rel).replace(/#/g, '#');
}

function addIndexRecords(page, text, entities, searchIndex) {
  const summary = firstWords(markdownToText(text || page.body), 36);
  const entity = {
    id: slugify(page.vaultPath),
    name: page.title,
    type: page.type,
    region: page.fm.region || '',
    location: page.fm.location || page.fm.headquarters || '',
    tags: Array.isArray(page.fm.tags) ? page.fm.tags : [],
    path: page.vaultPath,
    url: page.url,
    summary,
  };
  entities.push(entity);
  searchIndex.push({
    id: entity.id,
    title: entity.name,
    type: entity.type,
    region: entity.region,
    location: entity.location,
    url: entity.url,
    summary,
    text: markdownToText(text || page.body),
  });
}

function buildNpcIndex(entities) {
  const index = {};
  for (const entity of entities.filter(e => e.type === 'NPC')) {
    const region = entity.region || 'Unknown';
    const location = entity.location || 'Unknown';
    if (!index[region]) index[region] = {};
    if (!index[region][location]) {
      index[region][location] = {
        basePath: path.posix.dirname(entity.url) + '/',
        npcs: [],
      };
    }
    index[region][location].npcs.push({ name: entity.name, file: path.posix.basename(entity.url) });
  }
  return index;
}

function buildLocationIndex(entities) {
  const index = {};
  for (const entity of entities) {
    const parts = entity.url.split('/');
    const worldIndex = parts.indexOf('World');
    if (worldIndex < 0) continue;
    const region = parts[worldIndex + 1];
    const settlement = parts[worldIndex + 2];
    const file = parts[worldIndex + 3];
    if (!region || !settlement || !file) continue;
    if (['Groups', 'Images', 'Items', 'Events'].includes(region)) continue;
    if (settlement === 'NPCs' || parts.includes('NPCs')) continue;

    if (!index[region]) index[region] = { basePath: `Public/World/${region}/`, locations: {} };
    if (!index[region].locations[settlement]) {
      index[region].locations[settlement] = { file: '', subLocations: [] };
    }

    const bucket = index[region].locations[settlement];
    const basename = path.posix.basename(file, '.html');
    if (basename.toLowerCase() === settlement.toLowerCase() || entity.type === 'Settlement') {
      bucket.file = file;
    } else {
      bucket.subLocations.push({ name: entity.name, file });
    }
  }

  for (const regionData of Object.values(index)) {
    for (const [locationName, locationData] of Object.entries(regionData.locations)) {
      if (!locationData.file && locationData.subLocations.length) {
        const firstPage = locationData.subLocations.shift();
        locationData.file = firstPage.file;
      }
      if (!locationData.file) locationData.file = `${locationName}.html`;
      locationData.subLocations.sort(byName);
    }
  }
  return index;
}

function writeSearchPage() {
  writeOutput(path.join(DOCS_ROOT, 'search.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Eldoria Public Search</title>
  <link rel="stylesheet" href="./site-assets/public-site.css">
  <script src="./site-assets/site-config.js"></script>
  <script src="./site-assets/public-site.js" defer></script>
</head>
<body>
  <header class="site-header">
    <a class="site-title" href="./index.html">Eldoria</a>
    <nav>
      <a href="./WorldMap.html">Map</a>
      <a href="./npc-reference.html">NPCs</a>
      <a href="./location-reference.html">Locations</a>
    </nav>
  </header>
  <main class="page-shell">
    <section class="search-page" data-public-search>
      <div class="note-header">
        <div class="kicker">Public Docs</div>
        <h1>Search Eldoria</h1>
      </div>
      <input class="public-search-input" type="search" placeholder="Search NPCs, locations, events, groups..." aria-label="Search public docs">
      <div class="search-results" aria-live="polite"></div>
    </section>
  </main>
</body>
</html>
`);
}

function writeUtilityAliases() {
  for (const [filename, target, title] of UTILITY_ALIASES) {
    writeOutput(path.join(PUBLIC_OUT, filename), renderUtilityAliasPage(filename, target, title));
  }
}

function renderUtilityAliasPage(filename, target, title) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
  <title>${escapeHtml(title)} - Eldoria</title>
  <link rel="canonical" href="${escapeHtml(target)}">
  <link rel="stylesheet" href="../site-assets/public-site.css">
  <script>
    window.location.replace(${JSON.stringify(target)});
  </script>
</head>
<body>
  <main class="page-shell">
    <article class="note-page">
      <header class="note-header">
        <div class="kicker">Lookup Tool</div>
        <h1>${escapeHtml(title)}</h1>
      </header>
      <p>This page moved to <a href="${escapeHtml(target)}">${escapeHtml(path.basename(target))}</a>.</p>
    </article>
  </main>
</body>
</html>
`;
}

function markdownToText(markdown) {
  return stripFrontmatter(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, _hash, label) => label || path.basename(target))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`|:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripInline(text) {
  return text.replace(/\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, _hash, label) => label || path.basename(target)).replace(/[*_`]/g, '');
}

function firstWords(text, count) {
  return text.split(/\s+/).filter(Boolean).slice(0, count).join(' ');
}

function calculateModifier(score) {
  return Math.floor((score - 10) / 2);
}

function calculateProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

function formatBonus(value) {
  const num = toNumber(value, 0);
  return num >= 0 ? `+${num}` : String(num);
}

function normalizeSkillId(value) {
  const compact = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  const map = {
    animalhandling: 'animalHandling',
    sleightofhand: 'sleightOfHand',
  };
  const found = SKILLS.find(([id]) => id.toLowerCase().replace(/[^a-z]/g, '') === compact);
  return found ? found[0] : map[compact] || compact;
}

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function byName(a, b) {
  return String(a.name || a.title).localeCompare(String(b.name || b.title));
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page';
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeScriptJson(value) {
  return String(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

main();
