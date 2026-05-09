#!/usr/bin/env node

/*
 * Eldoria lean public-site builder.
 *
 * Public notes render into static HTML pages, shared CSS/JS, and JSON indexes.
 * Player sheet HTML is an identity-only shell; runtime character data comes from
 * the cloud player-sheet API.
 */

const fs = require('fs');
const path = require('path');
const { createRuleset } = require('./site-assets/eldoria-ruleset');

const DOCS_ROOT = __dirname;
const VAULT_ROOT = path.resolve(DOCS_ROOT, '..');
const PUBLIC_SRC = path.join(VAULT_ROOT, 'Public');
const PUBLIC_OUT = path.join(DOCS_ROOT, 'Public');
const DATA_OUT = path.join(DOCS_ROOT, 'data');
const API_DATA_OUT = path.join(DOCS_ROOT, 'api', 'data');
const SITE_ASSETS_OUT = path.join(DOCS_ROOT, 'site-assets');
const RULES_ROOT = path.join(DOCS_ROOT, 'Assets', 'Rules');
const PUBLIC_SITE_ASSET_VERSION = '20260509-whirling-fury-manual';
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
const RACE_SOURCE_PRIORITY = ['PHB', 'VGM', 'EEPC', 'DMG', 'XGE', 'TCE', 'SCAG', 'MPMM'];
const OPTIONAL_CLASS_FEATURE_NAMES = new Set([
  'Additional Artificer Infusions',
  'Additional Bard Spells',
  'Additional Cleric Spells',
  'Additional Druid Spells',
  'Additional Paladin Spells',
  'Additional Ranger Spells',
  'Additional Sorcerer Spells',
  'Additional Warlock Spells',
  'Additional Wizard Spells',
  'Additional Monk Weapons',
  'Bardic Versatility',
  'Blessed Strikes',
  'Cantrip Formulas',
  'Cantrip Versatility',
  'Dedicated Weapon',
  'Deft Explorer',
  'Expanded Spell List',
  'Favored Foe',
  'Focused Aim',
  'Harness Divine Power',
  'Instinctive Pounce',
  'Ki-Fueled Attack',
  'Magical Inspiration',
  'Martial Versatility',
  'Primal Awareness',
  'Primal Knowledge',
  'Quickened Healing',
  'Spell Versatility',
  'Spellcasting Focus',
  'Steady Aim',
  'Wild Companion',
]);
const FEATURE_CHOICE_GROUPS = [
  {
    className: 'Ranger',
    subclassName: 'Hunter',
    level: 3,
    group: "Hunter's Prey",
    options: ['Colossus Slayer', 'Giant Killer', 'Horde Breaker'],
  },
];
const RULE_RESOURCE_ALIASES = [
  { match: /channel divinity/i, resourceId: 'cleric-channel-divinity' },
  { match: /ki\b|ki point/i, resourceId: 'monk-ki' },
  { match: /bardic inspiration/i, resourceId: 'bardic-inspiration' },
  { match: /wild shape/i, resourceId: 'druid-wild-shape' },
  { match: /action surge/i, resourceId: 'action-surge' },
  { match: /second wind/i, resourceId: 'second-wind' },
  { match: /portent/i, resourceId: 'wizard-portent' },
  { match: /healing hands/i, resourceId: 'race-aasimar-healing-hands-vgm' },
  { match: /breath weapon/i, resourceId: 'race-dragonborn-breath-weapon-phb' },
  { match: /luck points|lucky/i, resourceId: 'feat-lucky-luck-points' },
];

function main() {
  assertInside(DOCS_ROOT, PUBLIC_OUT);
  assertInside(DOCS_ROOT, DATA_OUT);
  assertInside(DOCS_ROOT, API_DATA_OUT);
  ensureDir(DOCS_ROOT);
  cleanDir(PUBLIC_OUT, { tolerateBusy: true });
  cleanDir(DATA_OUT);
  cleanDir(API_DATA_OUT);
  ensureDir(SITE_ASSETS_OUT);

  const markdownFiles = walk(PUBLIC_SRC).filter(file => file.endsWith('.md'));
  const assetFiles = walk(PUBLIC_SRC).filter(file => !file.endsWith('.md'));
  const fileIndex = buildFileIndex(markdownFiles, assetFiles);
  const rules = loadCanonicalRules();
  const ruleset = createRuleset(rules, rules.rulesetProfile || {});
  const activeRules = ruleset.rules;
  const itemCatalog = buildRuleCatalog(activeRules.items);
  const spellCatalog = buildRuleCatalog(activeRules.spells);
  const featCatalog = buildRuleCatalog(activeRules.feats);
  const backgroundCatalog = buildRuleCatalog(activeRules.backgrounds);

  copyPublicAssets(assetFiles);

  const pages = markdownFiles.map(file => readPage(file));
  const players = [];
  const playerRuleReports = [];
  const entities = [];
  const searchIndex = [];

  for (const page of pages) {
    if (isPlayerSheet(page)) {
      const player = buildPlayer(page, null, fileIndex, ruleset, itemCatalog, spellCatalog, featCatalog, backgroundCatalog, {});
      players.push(player.publicData);
      playerRuleReports.push(player.ruleReport);
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
  writePublicDataJson('player-rule-report.json', buildPlayerRuleReport(playerRuleReports));
  writePublicDataJson('spells.json', uniqueBy(Array.from(spellCatalog.values()), spell => spell.id || spell.name).sort(byName));
  writePublicDataJson('rules-manifest.json', rules.manifest || {});
  writePublicDataJson('ruleset-profile.json', activeRules.rulesetProfile || rules.rulesetProfile || {});
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
  const issueCount = playerRuleReports.reduce((sum, report) => sum + report.issues.length, 0);
  if (issueCount) console.log(`Player rule report has ${issueCount} choice/data item(s) to review`);
}

function assertInside(root, target) {
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside docs/: ${target}`);
  }
}

function cleanDir(dir, options = {}) {
  if (fs.existsSync(dir)) {
    if (options.tolerateBusy) cleanDirContents(dir, options);
    else fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function cleanDirContents(dir, options = {}) {
  for (const item of fs.readdirSync(dir)) {
    const target = path.join(dir, item);
    try {
      fs.rmSync(target, { recursive: true, force: true });
    } catch (error) {
      if (options.tolerateBusy && (error.code === 'EBUSY' || error.code === 'EPERM')) {
        console.warn(`Keeping locked output file: ${normalizePath(path.relative(DOCS_ROOT, target))}`);
        continue;
      }
      throw error;
    }
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadCanonicalRules() {
  const required = ['classes', 'subclasses', 'races', 'features', 'items', 'spells', 'feats', 'backgrounds', 'actions', 'effects', 'resources', 'manifest'];
  const rules = {};
  for (const name of required) {
    const file = path.join(RULES_ROOT, `${name}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing canonical rules file: ${normalizePath(path.relative(DOCS_ROOT, file))}. Run npm run rules:import first.`);
    }
    rules[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  const profileFile = path.join(RULES_ROOT, 'ruleset-profile.json');
  if (fs.existsSync(profileFile)) {
    rules.rulesetProfile = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
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
      ...(Array.isArray(row.aliases) ? row.aliases.map(normalizeItemName) : []),
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
    try {
      fs.copyFileSync(src, dest);
    } catch (error) {
      if ((error.code === 'EBUSY' || error.code === 'EPERM') && fs.existsSync(dest)) {
        console.warn(`Keeping locked copied asset: ${normalizePath(path.relative(DOCS_ROOT, dest))}`);
        continue;
      }
      throw error;
    }
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
  const relMd = normalizePath(path.relative(PUBLIC_SRC, file));
  const relHtml = relMd.replace(/\.md$/i, '.html');
  const outputPath = path.join(PUBLIC_OUT, relHtml);
  const isPlayer = relMd.startsWith('Players/') && /Player Sheet\.md$/i.test(relMd);

  if (isPlayer) {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = parseFrontmatter(raw);
    const title = path.basename(file, '.md');
    return {
      sourcePath: file,
      relMd,
      relHtml,
      outputPath,
      vaultPath: normalizePath(path.join('Public', relMd)),
      url: normalizePath(path.join('Public', relHtml)),
      fm: parsed.data,
      playerIdentity: extractPlayerSheetIdentity(parsed.body, parsed.data),
      title,
      type: 'Player',
      body: '',
      searchText: title,
    };
  }

  const raw = fs.readFileSync(file, 'utf8');
  const parsed = parseFrontmatter(raw);
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

function extractPlayerSheetIdentity(body, fm = {}) {
  const portrait = cleanPlayerAssetPath(fm.portrait || fm.portraitUrl || extractObjectStringProperty(body, 'CharacterSheetDisplay.display', 'portrait'));
  const classUrl = extractPlayerClassUrl(body);
  return {
    portrait,
    classUrl,
  };
}

function extractPlayerClassUrl(body) {
  const match = String(body || '').match(/urlSuffix:\s*([^\r\n]+)/i);
  const suffix = match ? match[1].trim() : '';
  return suffix ? `5etools/classes.html${suffix}` : '';
}

function extractObjectStringProperty(body, call, property) {
  const source = String(body || '');
  const idx = source.indexOf(call);
  if (idx < 0) return '';
  const objectStart = source.indexOf('{', idx);
  if (objectStart < 0) return '';
  const objectEnd = findMatching(source, objectStart, '{', '}');
  if (objectEnd < 0) return '';
  const objectSource = source.slice(objectStart, objectEnd + 1);
  const re = new RegExp(`\\b${escapeRegExp(property)}\\s*:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`);
  const match = objectSource.match(re);
  return match ? match[2].replace(/\\(['"\`\\])/g, '$1') : '';
}

function cleanPlayerAssetPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  const clean = raw
    .replace(/\\/g, '/')
    .replace(/^docs\//i, '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
  if (/^Public\//i.test(clean)) return clean;
  if (/^(Players|Storylines|World)\//i.test(clean)) return `Public/${clean}`;
  return clean;
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

function buildPlayer(page, _controls, _fileIndex, ruleset, _itemCatalog, _spellCatalog, _featCatalog, _backgroundCatalog, _playerRuleChoices = {}) {
  const playerId = slugify(path.basename(page.relMd, '.md'));
  const identity = page.playerIdentity || {};
  const shellData = makePlayerIdentityShell({
    id: playerId,
    name: page.title,
    sheetTitle: page.title,
    portrait: identity.portrait || '',
    classUrl: identity.classUrl || '',
    rulesetId: ruleset.id,
    rulesVersion: ruleset.version,
    rulesSource: {
      kind: 'eldoria-ruleset',
      rulesetId: ruleset.id,
      rulesVersion: ruleset.version,
      schemaVersion: ruleset.rules && ruleset.rules.manifest && ruleset.rules.manifest.schemaVersion,
      generatedAtUtc: ruleset.rules && ruleset.rules.manifest && ruleset.rules.manifest.generatedAtUtc,
    },
    url: page.url,
  });
  const shellModifiers = Object.fromEntries(ABILITIES.map(ability => [ability, calculateModifier(shellData.abilities[ability])]));

  return {
    data: shellData,
    publicData: {
      id: playerId,
      name: page.title,
      sheetTitle: page.title,
      portrait: shellData.portrait,
      url: page.url,
      searchText: `${page.title} character builder`.trim(),
    },
    modifiers: shellModifiers,
    features: '',
    portraitUrl: playerAssetUrl(page, shellData.portrait),
    ruleReport: {
      id: playerId,
      name: page.title,
      sheetTitle: page.title,
      source: page.vaultPath,
      counts: { features: 0, resources: 0, actions: 0, linkedActions: 0 },
      actionWellCount: 0,
      choices: {},
      issues: [],
    },
  };
}

function playerAssetUrl(page, value) {
  const clean = cleanPlayerAssetPath(value);
  if (!clean) return '';
  if (/^(https?:|data:|blob:)/i.test(clean)) return clean;
  return relativeUrl(page.url, clean);
}

function makePlayerIdentityShell(player) {
  const abilities = Object.fromEntries(ABILITIES.map(ability => [ability, 10]));
  return {
    id: player.id,
    name: player.name,
    sheetTitle: player.sheetTitle,
    builderVersion: 'fresh-v1',
    rulesetId: player.rulesetId || 'eldoria-5e',
    rulesVersion: player.rulesVersion || '',
    class: '',
    classId: '',
    subclass: '',
    subclassId: '',
    subclassShortName: '',
    level: 1,
    race: '',
    background: '',
    portrait: player.portrait || '',
    classUrl: player.classUrl || '',
    experience: 0,
    gold: 0,
    heroPoints: 0,
    guildPoints: 0,
    guildRank: '',
    abilities,
    ac: 10,
    speed: 30,
    hpMode: 'auto-average',
    maxHp: null,
    currentHp: null,
    proficiencyBonus: 2,
    initiative: 0,
    saves: [],
    skills: [],
    spellcasting: false,
    spellAttack: null,
    spellSaveDc: null,
    attackBonuses: { ranged: 0 },
    simpleWeapons: false,
    martialWeapons: false,
    hitDice: '',
    equipment: [],
    itemIds: [],
    itemDetails: {},
    equipped: [],
    spells: [],
    spellIds: [],
    spellScrolls: [],
    spellDetails: {},
    spellSlots: {},
    resources: [],
    ruleActions: [],
    actionWells: [],
    ruleEffects: [],
    ruleFeatures: [],
    notes: '',
    backgrounds: [],
    backgroundIds: [],
    backgroundDetails: [],
    feats: [],
    featIds: [],
    featDetails: [],
    races: [],
    raceIds: [],
    ruleChoices: { featureChoices: {}, issueCount: 0 },
    ruleReport: { issueCount: 0, actionWellCount: 0 },
    notesUrl: '',
    rulesSource: player.rulesSource || {},
    url: player.url,
    searchText: `${player.name || ''} ${player.sheetTitle || ''} character builder`.trim(),
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

function buildPlayerResources(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog, raceNames = [], feats = [], backgrounds = [], availableFeaturesOverride = null) {
  const availableFeatures = availableFeaturesOverride || getAvailableFeatures(rules, matchedClass, matchedSubclass, level, raceNames);
  const featureIds = new Set(availableFeatures.map(feature => feature.id));
  const featIds = new Set((feats || []).map(slugify));
  const backgroundIds = new Set((backgrounds || []).map(slugify));
  const resources = [];
  for (const resource of rules.resources || []) {
    if (resource.sourceType === 'core') {
      resources.push(resource);
    } else if (resource.sourceType === 'feat' && resource.sourceId && featIds.has(resource.sourceId)) {
      resources.push(resource);
    } else if (resource.sourceType === 'background' && resource.sourceId && backgroundIds.has(resource.sourceId)) {
      resources.push(resource);
    } else if (resource.sourceId && featureIds.has(resource.sourceId)) {
      resources.push(repointResourceToAvailableFeature(resource, availableFeatures) || resource);
    } else {
      const matchedFeature = findAvailableFeatureForResource(resource, availableFeatures);
      if (matchedFeature) {
        resources.push(formatFeatureResource(resource, matchedFeature));
      }
    }
  }
  for (const feature of availableFeatures) {
    const resource = inferPlayerFeatureResource(feature);
    if (resource && !resources.some(existing => existing.id === resource.id)) resources.push(resource);
  }
  for (const itemName of equipment) {
    const item = findCatalogItem(itemCatalog, itemName);
    if (item && Array.isArray(item.resources)) {
      resources.push(...item.resources.map(resource => ({ ...resource, sourceType: 'item', sourceId: item.id, itemName: item.name })));
    }
  }
  return uniqueBy(resources, resource => resource.id);
}

function inferPlayerFeatureResource(feature) {
  if (!feature) return null;
  const text = cleanRulesText(feature.text || '');
  const hint = feature.resourceHint || '';
  const common = {
    sourceType: feature.kind || 'feature',
    sourceId: feature.id,
    className: feature.className || '',
    subclassName: feature.subclassShortName || feature.subclassName || '',
    raceName: feature.raceName || '',
    source: feature.source || '',
    text: firstWords(text, 40),
  };
  if (hint === 'Channel Divinity') return { id: 'cleric-channel-divinity', name: 'Channel Divinity', maxFormula: 'clericChannelDivinityUses(level)', reset: 'shortRest', ...common };
  if (hint === 'Bardic Inspiration') return { id: 'bardic-inspiration', name: 'Bardic Inspiration', maxFormula: 'max(1, chaMod)', reset: 'longRestUntilFontOfInspirationThenShortRest', ...common };
  if (hint === 'Ki') return { id: 'monk-ki', name: 'Ki', maxFormula: 'level', reset: 'shortRest', ...common };
  if (hint === 'Wild Shape') return { id: 'druid-wild-shape', name: 'Wild Shape', max: 2, reset: 'shortRest', ...common };
  if (hint === 'Action Surge') return { id: 'action-surge', name: 'Action Surge', maxFormula: 'level >= 17 ? 2 : 1', reset: 'shortRest', ...common };
  if (hint === 'Second Wind') return { id: 'second-wind', name: 'Second Wind', max: 1, reset: 'shortRest', ...common };
  if (hint === 'Portent') return { id: 'wizard-portent', name: 'Portent', maxFormula: 'level >= 14 ? 3 : 2', reset: 'longRest', ...common };
  const abilityUses = text.match(/number of times equal to your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier \(a minimum of once\).*?regain all expended uses when you finish a (short|long) rest/i);
  if (abilityUses) {
    return {
      id: feature.id,
      name: feature.name,
      maxFormula: `${abilityUses[1].slice(0, 3).toLowerCase()}Mod`,
      reset: `${abilityUses[2].toLowerCase()}Rest`,
      ...common,
    };
  }
  if (/\bonce per day\b/i.test(text) || /\bcan't use (?:it|this feature|this ability|the feature|the ability|this trait|the trait|this action|this reaction)?[^.]{0,180}again until you finish a long rest\b/i.test(text)) {
    return { id: feature.id, name: feature.name, max: 1, reset: 'longRest', ...common };
  }
  if (/\bcan't use (?:it|this feature|this ability|the feature|the ability|this trait|the trait|this action|this reaction)?[^.]{0,180}again until you finish a short or long rest\b/i.test(text)) {
    return { id: feature.id, name: feature.name, max: 1, reset: 'shortRest', ...common };
  }
  return null;
}

function repointResourceToAvailableFeature(resource, availableFeatures) {
  const current = (availableFeatures || []).find(feature => feature.id === resource.sourceId);
  const best = findAvailableFeatureForResource(resource, availableFeatures);
  if (!best) return current ? formatFeatureResource(resource, current) : null;
  if (!current) return formatFeatureResource(resource, best);
  const resourceName = normalizeItemName(resource.name || resource.id);
  const currentExact = normalizeItemName(current.name) === resourceName;
  const bestExact = normalizeItemName(best.name) === resourceName;
  return formatFeatureResource(resource, bestExact && !currentExact ? best : current);
}

function formatFeatureResource(resource, feature) {
  return {
    ...resource,
    sourceType: feature.kind || resource.sourceType,
    sourceId: feature.id,
    className: feature.className || resource.className || '',
    subclassName: feature.subclassShortName || feature.subclassName || resource.subclassName || '',
    raceName: feature.raceName || resource.raceName || '',
    source: feature.source || resource.source || '',
    text: cleanRulesText(feature.text || resource.text || ''),
  };
}

function findAvailableFeatureForResource(resource, availableFeatures) {
  if (!resource || !['class', 'subclass', 'feat', 'race', 'background'].includes(resource.sourceType)) return null;
  const resourceName = normalizeItemName(resource.name || resource.id);
  const resourceId = normalizeItemName(resource.id);
  const resourceClass = normalizeItemName(resource.className);
  const resourceSubclass = normalizeItemName(resource.subclassName);
  const candidates = (availableFeatures || []).filter(feature => {
    if (resource.sourceType === 'class' && feature.kind !== 'class') return false;
    if (resource.sourceType === 'subclass' && feature.kind !== 'subclass') return false;
    if (resource.sourceType === 'race' && feature.kind !== 'race') return false;
    if (resource.source && feature.source && resource.source !== feature.source) return false;
    if (resourceClass && normalizeItemName(feature.className) !== resourceClass) return false;
    if (resourceSubclass) {
      const featureSubclassNames = [feature.subclassName, feature.subclassShortName].map(normalizeItemName);
      if (!featureSubclassNames.includes(resourceSubclass)) return false;
    }
    const resourceRace = normalizeItemName(resource.raceName);
    if (resourceRace) {
      const featureRaceNames = [feature.raceName, feature.baseRaceName, feature.subraceName].map(normalizeItemName);
      if (!featureRaceNames.includes(resourceRace)) return false;
    }
    return true;
  });
  return candidates.find(feature => {
    const name = normalizeItemName(feature.name);
    return Boolean(name && (name === resourceName || name === resourceId));
  }) || candidates.find(feature => {
    const hint = normalizeItemName(feature.resourceHint);
    return Boolean(hint && (hint === resourceName || hint === resourceId || normalizeItemName(slugify(hint)) === resourceId));
  }) || null;
}

function buildPlayerRuleActions(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog, raceNames, feats, spells, backgrounds = [], availableFeaturesOverride = null) {
  const featureIds = getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level, raceNames, availableFeaturesOverride);
  const itemIds = new Set(equipment.map(itemName => {
    const item = findCatalogItem(itemCatalog, itemName);
    return item && item.id;
  }).filter(Boolean));
  const featIds = new Set((feats || []).map(slugify));
  const spellIds = new Set((spells || []).map(slugify));
  const backgroundIds = new Set((backgrounds || []).map(slugify));
  return (rules.actions || []).filter(action => {
    if (action.sourceType === 'class' || action.sourceType === 'subclass' || action.sourceType === 'race') return featureIds.has(action.sourceId);
    if (action.sourceType === 'item') return itemIds.has(action.sourceId);
    if (action.sourceType === 'feat') return featIds.has(action.sourceId);
    if (action.sourceType === 'background') return backgroundIds.has(action.sourceId);
    if (action.sourceType === 'spell') return spellIds.has(action.sourceId);
    return false;
  }).slice(0, 160);
}

function buildPlayerRuleEffects(rules, matchedClass, matchedSubclass, level, equipment, itemCatalog, raceNames, feats, backgrounds = [], availableFeaturesOverride = null) {
  const featureIds = getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level, raceNames, availableFeaturesOverride);
  const itemIds = new Set(equipment.map(itemName => {
    const item = findCatalogItem(itemCatalog, itemName);
    return item && item.id;
  }).filter(Boolean));
  const featIds = new Set((feats || []).map(slugify));
  const backgroundIds = new Set((backgrounds || []).map(slugify));
  return (rules.effects || []).filter(effect => {
    if (effect.sourceType === 'class' || effect.sourceType === 'subclass' || effect.sourceType === 'race') return featureIds.has(effect.sourceId);
    if (effect.sourceType === 'item') return itemIds.has(effect.sourceId);
    if (effect.sourceType === 'feat') return featIds.has(effect.sourceId);
    if (effect.sourceType === 'background') return backgroundIds.has(effect.sourceId);
    return false;
  }).slice(0, 160);
}

function buildPlayerRuleFeatures(rules, matchedClass, matchedSubclass, level, raceNames = [], availableFeaturesOverride = null, resources = []) {
  const features = availableFeaturesOverride || (rules.features || []).filter(feature => getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level, raceNames).has(feature.id));
  return features
    .map(feature => ({
      id: feature.id,
      kind: feature.kind,
      name: feature.name,
      className: feature.className || '',
      subclassName: feature.subclassShortName || feature.subclassName || '',
      raceName: feature.raceName || '',
      baseRaceName: feature.baseRaceName || '',
      subraceName: feature.subraceName || '',
      raceId: feature.raceId || '',
      level: feature.level,
      source: feature.source || '',
      text: cleanRulesText(feature.text || ''),
      timing: feature.timing || '',
      resourceHint: feature.resourceHint || '',
      resourceId: findResourceIdForRule({ sourceId: feature.id, title: feature.name, detail: feature.text, tags: [feature.resourceHint] }, resources, [feature]),
      grants: Array.isArray(feature.grants) ? feature.grants : [],
      optional: Boolean(feature.optional),
      choiceGroup: feature.choiceGroup || '',
      selectedChoice: Boolean(feature.selectedChoice),
    }))
    .sort((a, b) => a.level - b.level || `${a.kind} ${a.name}`.localeCompare(`${b.kind} ${b.name}`))
    .slice(0, 120);
}

function getAvailableFeatureIds(rules, matchedClass, matchedSubclass, level, raceNames = [], availableFeaturesOverride = null) {
  return new Set((availableFeaturesOverride || getAvailableFeatures(rules, matchedClass, matchedSubclass, level, raceNames)).map(feature => feature.id));
}

function getAvailableFeatures(rules, matchedClass, matchedSubclass, level, raceNames = []) {
  if (!rules || !matchedClass) return [];
  const className = normalizeItemName(matchedClass.name);
  const subclassNames = new Set([matchedSubclass && matchedSubclass.name, matchedSubclass && matchedSubclass.shortName].map(normalizeItemName).filter(Boolean));
  const classFeatures = (rules.features || [])
    .filter(feature => feature.level <= level)
    .filter(feature => {
      if (normalizeItemName(feature.className) !== className) return false;
      if (feature.kind === 'class') return true;
      return subclassNames.has(normalizeItemName(feature.subclassName)) || subclassNames.has(normalizeItemName(feature.subclassShortName));
    });
  return uniqueBy([...classFeatures, ...getAvailableRaceFeatures(rules, raceNames, level)], feature => feature.id);
}

function getAvailableRaceFeatures(rules, raceNames = [], level = 1) {
  const selectedRaces = uniqueBy((raceNames || []).map(name => findRuleRace(rules, name)).filter(Boolean), race => race.id);
  if (!selectedRaces.length) return [];
  const acceptedRaceIds = new Set();
  for (const race of selectedRaces) {
    acceptedRaceIds.add(race.id);
    if (race.parentRaceId) acceptedRaceIds.add(race.parentRaceId);
  }
  return (rules.features || [])
    .filter(feature => feature.kind === 'race')
    .filter(feature => (Number(feature.level) || 1) <= level)
    .filter(feature => acceptedRaceIds.has(feature.raceId));
}

function findRuleRace(rules, raceName) {
  const parsed = parseSourceQualifiedName(raceName);
  const target = normalizeItemName(parsed.name);
  if (!target) return null;
  const candidates = findRuleRaceCandidates(rules, raceName);
  return candidates.sort((a, b) => sourcePriority(a.source) - sourcePriority(b.source) || String(a.name).localeCompare(String(b.name)))[0] || null;
}

function findRuleRaceById(rules, raceId) {
  const target = normalizeItemName(raceId);
  if (!target) return null;
  return (rules.races || []).find(race => normalizeItemName(race.id) === target) || null;
}

function findRuleRaceCandidates(rules, raceName) {
  const parsed = parseSourceQualifiedName(raceName);
  const target = normalizeItemName(parsed.name);
  if (!target) return [];
  return (rules.races || []).filter(race => {
    if (parsed.source && normalizeRuleSource(race.source) !== parsed.source) return false;
    const keys = [race.name, race.baseName, race.subraceName, race.id, ...(race.aliases || [])].map(normalizeItemName).filter(Boolean);
    return keys.includes(target);
  });
}

function sourcePriority(source) {
  const index = RACE_SOURCE_PRIORITY.map(normalizeRuleSource).indexOf(normalizeRuleSource(source));
  return index === -1 ? RACE_SOURCE_PRIORITY.length : index;
}

function normalizeRuleSource(source) {
  return String(source || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

function parseSourceQualifiedName(value) {
  const text = String(value || '').trim();
  const pipeMatch = text.match(/^(.+?)\s*\|\s*(.+?)\s*$/);
  if (!pipeMatch) return { name: text, source: '' };
  return {
    name: pipeMatch[1].trim(),
    source: normalizeRuleSource(pipeMatch[2]),
  };
}

function findPlayerRuleChoices(config, playerId, playerName, sheetTitle) {
  const root = config && config.players && typeof config.players === 'object' ? config.players : config;
  const defaults = config && config.defaults && typeof config.defaults === 'object' ? config.defaults : {};
  const keys = [playerId, playerName, sheetTitle].filter(Boolean);
  for (const key of [...keys, ...keys.map(slugify)]) {
    if (root && root[key]) return { ...defaults, ...root[key] };
  }
  return { ...defaults };
}

function createPlayerRuleReport(page, data, choices) {
  return {
    id: slugify(path.basename(page.relMd, '.md')),
    name: data.name || page.title,
    sheetTitle: page.title,
    source: page.vaultPath,
    choices: choices || {},
    issues: [],
    counts: {},
    actionWellCount: 0,
  };
}

function addRuleIssue(report, severity, kind, message, detail = {}) {
  if (!report) return;
  const key = `${severity}:${kind}:${message}:${JSON.stringify(detail)}`;
  if (!report._issueKeys) report._issueKeys = new Set();
  if (report._issueKeys.has(key)) return;
  report._issueKeys.add(key);
  report.issues.push({ severity, kind, message, ...detail });
}

function mergeRulesetIssues(report, issues = []) {
  for (const issue of issues || []) {
    const { severity = 'warning', kind = 'ruleset_issue', message = '', ...detail } = issue || {};
    if (!message) continue;
    addRuleIssue(report, severity, kind, message, detail);
  }
}

function resolvePlayerRaces(rules, sheetRace, lookupRaces, choices, report) {
  const explicitRaceIds = normalizeIdChoiceList(choices.raceIds || choices.raceId || choices.ruleRaceIds || choices.ruleRaceId);
  const explicitRace = cleanChoiceString(choices.race || choices.rulesRace);
  if (explicitRaceIds.length) {
    const resolvedById = [];
    for (const raceId of explicitRaceIds) {
      const race = findRuleRaceById(rules, raceId);
      if (!race) {
        addRuleIssue(report, 'warning', 'missing_race_rule_id', `No canonical race matched id "${raceId}".`, { raceId });
        continue;
      }
      resolvedById.push(race);
    }
    const uniqueById = uniqueBy(resolvedById, race => race.id);
    return {
      displayRace: uniqueById[0] ? uniqueById[0].name : sheetRace,
      raceNames: uniqueById.length ? uniqueById.map(race => race.name) : [sheetRace, ...(lookupRaces || [])].filter(Boolean).map(String),
      raceIds: uniqueById.map(race => race.id),
    };
  }
  const requested = explicitRace ? [explicitRace] : [...new Set([sheetRace, ...(lookupRaces || [])].filter(Boolean).map(String))];
  const resolved = [];
  for (const raceName of requested) {
    const candidates = findRuleRaceCandidates(rules, raceName);
    if (!candidates.length) {
      addRuleIssue(report, 'warning', 'missing_race_rule', `No canonical race matched "${raceName}".`, { raceName });
      continue;
    }
    const ranked = candidates.slice().sort((a, b) => sourcePriority(a.source) - sourcePriority(b.source) || String(a.name).localeCompare(String(b.name)));
    const best = ranked[0];
    resolved.push(best);
    if (raceNameRequiresPicker(ranked, raceName)) {
      addRuleIssue(report, 'warning', 'ambiguous_race_picker_required', `"${raceName}" has multiple canonical race matches; using "${best.name}" for this port until a raceId is selected.`, {
        raceName,
        selected: best.name,
        selectedId: best.id,
        options: ranked.slice(0, 12).map(candidate => ({
          id: candidate.id,
          name: candidate.name,
          source: candidate.source || '',
        })),
      });
    }
  }
  const unique = uniqueBy(resolved, race => race.id);
  return {
    displayRace: unique[0] ? unique[0].name : sheetRace,
    raceNames: unique.length ? unique.map(race => race.name) : requested,
    raceIds: unique.map(race => race.id),
  };
}

function raceNameRequiresPicker(candidates, raceName) {
  if (!candidates || candidates.length <= 1) return false;
  const target = normalizeItemName(parseSourceQualifiedName(raceName).name);
  const exact = candidates.filter(candidate => {
    const keys = [candidate.name, candidate.baseName, candidate.subraceName, candidate.id, ...(candidate.aliases || [])]
      .map(normalizeItemName)
      .filter(Boolean);
    return keys.includes(target);
  });
  if (exact.length <= 1) return false;
  const distinctIds = new Set(exact.map(candidate => candidate.id));
  return distinctIds.size > 1;
}

function resolvePlayerCatalogRefs(rows, requestedNames, explicitIds, kind, report) {
  const ids = normalizeIdChoiceList(explicitIds);
  if (ids.length) {
    const resolvedById = [];
    for (const id of ids) {
      const row = findRuleRowById(rows, id);
      if (!row) {
        addRuleIssue(report, 'warning', `missing_${kind}_rule_id`, `No canonical ${kind} matched id "${id}".`, { id });
        continue;
      }
      resolvedById.push(row);
    }
    const uniqueById = uniqueBy(resolvedById, row => row.id || slugify(row.name || 'rule'));
    return {
      names: uniqueById.map(row => row.name).filter(Boolean),
      ids: uniqueById.map(row => row.id).filter(Boolean),
    };
  }

  const resolved = [];
  for (const name of requestedNames || []) {
    const ranked = rankRuleRows(findRuleRowCandidates(rows, name));
    if (ranked[0]) resolved.push(ranked[0]);
  }
  const uniqueById = uniqueBy(resolved, row => row.id || slugify(row.name || 'rule'));
  return {
    names: uniqueById.map(row => row.name).filter(Boolean),
    ids: uniqueById.map(row => row.id).filter(Boolean),
  };
}

function addCatalogAmbiguityIssues(report, rows, names, kind, explicitIds) {
  if (normalizeIdChoiceList(explicitIds).length) return;
  for (const name of names || []) {
    const ranked = rankRuleRows(findRuleRowCandidates(rows, name));
    if (!ruleRowsRequirePicker(ranked, name)) continue;
    const best = ranked[0];
    addRuleIssue(report, 'warning', `ambiguous_${kind}_picker_required`, `"${name}" has multiple canonical ${kind} matches; using "${best.name}" for this port until a ${kind}Id is selected.`, {
      name,
      selected: best.name,
      selectedId: best.id || '',
      options: ranked.slice(0, 12).map(row => ({
        id: row.id || '',
        name: row.name || '',
        source: row.source || '',
      })),
    });
  }
}

function findRuleRowById(rows, id) {
  const target = normalizeItemName(id);
  if (!target) return null;
  return (rows || []).find(row => normalizeItemName(row && row.id) === target) || null;
}

function findRuleRowCandidates(rows, name) {
  const parsed = parseSourceQualifiedName(name);
  const target = normalizeItemName(parsed.name);
  if (!target) return [];
  return (rows || []).filter(row => {
    if (parsed.source && normalizeRuleSource(row && row.source) !== parsed.source) return false;
    const keys = [row && row.name, row && row.id, row && row.shortName, ...(Array.isArray(row && row.aliases) ? row.aliases : [])]
      .map(normalizeItemName)
      .filter(Boolean);
    return keys.includes(target);
  });
}

function rankRuleRows(rows) {
  return (rows || []).slice().sort((a, b) => sourcePriority(a && a.source) - sourcePriority(b && b.source) || String(a && a.name).localeCompare(String(b && b.name)));
}

function ruleRowsRequirePicker(candidates, name) {
  if (!candidates || candidates.length <= 1) return false;
  const target = normalizeItemName(parseSourceQualifiedName(name).name);
  const exact = candidates.filter(row => {
    const keys = [row && row.name, row && row.id, row && row.shortName, ...(Array.isArray(row && row.aliases) ? row.aliases : [])]
      .map(normalizeItemName)
      .filter(Boolean);
    return keys.includes(target);
  });
  if (exact.length <= 1) return false;
  const distinctIds = new Set(exact.map(row => row.id || slugify(row.name || 'rule')));
  return distinctIds.size > 1;
}

function resolveAvailableFeatures(rules, matchedClass, matchedSubclass, level, raceNames, choices, featureNotes, report) {
  const selected = new Set(normalizeChoiceList([
    ...(choices.includeFeatures || []),
    ...(choices.selectedFeatures || []),
    ...(choices.classFeatures || []),
  ]));
  const excluded = new Set(normalizeChoiceList(choices.excludeFeatures || []));
  const optionalSelections = new Set(normalizeChoiceList(choices.optionalFeatures || []));
  const notesText = normalizeItemName(featureNotes || '');
  let features = getAvailableFeatures(rules, matchedClass, matchedSubclass, level, raceNames)
    .map(feature => ({ ...feature, optional: isOptionalClassFeature(feature) }));

  features = features.filter(feature => {
    const featureName = normalizeItemName(feature.name);
    const featureId = normalizeItemName(feature.id);
    if (excluded.has(featureName) || excluded.has(featureId)) return false;
    if (!feature.optional) return true;
    const allowed = choices.includeOptionalFeatures === true
      || optionalSelections.has(featureName)
      || optionalSelections.has(featureId)
      || selected.has(featureName)
      || selected.has(featureId);
    if (!allowed) {
      addRuleIssue(report, 'info', 'optional_feature_unselected', `Optional feature "${feature.name}" is available but not selected.`, {
        feature: feature.name,
        source: feature.source || '',
      });
    }
    return allowed;
  });

  for (const group of FEATURE_CHOICE_GROUPS) {
    if (!featureGroupApplies(group, matchedClass, matchedSubclass, level)) continue;
    const optionNames = new Set(group.options.map(normalizeItemName));
    const presentOptions = features.filter(feature => optionNames.has(normalizeItemName(feature.name)));
    if (!presentOptions.length) continue;
    const explicitSelections = normalizeChoiceList(getChoiceGroupSelection(choices, group.group));
    const selectedOptions = presentOptions.filter(feature => {
      const name = normalizeItemName(feature.name);
      return explicitSelections.includes(name)
        || selected.has(name)
        || selected.has(normalizeItemName(feature.id))
        || notesText.includes(name);
    });
    if (!selectedOptions.length) {
      addRuleIssue(report, 'warning', 'feature_choice_unresolved', `${group.group} needs one selected option.`, {
        group: group.group,
        options: group.options,
      });
      features = features.filter(feature => !optionNames.has(normalizeItemName(feature.name)));
      continue;
    }
    const selectedIds = new Set(selectedOptions.map(feature => feature.id));
    features = features
      .filter(feature => !optionNames.has(normalizeItemName(feature.name)) || selectedIds.has(feature.id))
      .map(feature => selectedIds.has(feature.id) ? { ...feature, choiceGroup: group.group, selectedChoice: true } : feature);
  }

  return uniqueBy(features, feature => feature.id);
}

function isOptionalClassFeature(feature) {
  return feature && feature.kind === 'class'
    && String(feature.source || '').toUpperCase() === 'TCE'
    && OPTIONAL_CLASS_FEATURE_NAMES.has(feature.name);
}

function featureGroupApplies(group, matchedClass, matchedSubclass, level) {
  if (group.level && Number(group.level) > Number(level || 1)) return false;
  if (normalizeItemName(group.className) !== normalizeItemName(matchedClass && matchedClass.name)) return false;
  if (!group.subclassName) return true;
  const subclassNames = [matchedSubclass && matchedSubclass.name, matchedSubclass && matchedSubclass.shortName].map(normalizeItemName);
  return subclassNames.includes(normalizeItemName(group.subclassName));
}

function getChoiceGroupSelection(choices, groupName) {
  const groups = choices.featureChoices || choices.choiceGroups || {};
  if (!groups || typeof groups !== 'object') return [];
  const target = normalizeItemName(groupName);
  for (const [key, value] of Object.entries(groups)) {
    if (normalizeItemName(key) === target) return Array.isArray(value) ? value : [value];
  }
  return [];
}

function linkRuleActionsToResources(actions, resources, availableFeatures) {
  return (actions || []).map(action => {
    const resourceId = findResourceIdForRule(action, resources, availableFeatures);
    if (!resourceId) return action;
    const resource = (resources || []).find(candidate => candidate.id === resourceId);
    return {
      ...action,
      resourceId,
      resourceCost: Number(action.resourceCost) || 1,
      resourceName: resource && resource.name || '',
    };
  });
}

function findResourceIdForRule(action, resources, availableFeatures = []) {
  if (!action || !resources || !resources.length) return '';
  if (action.resourceId && resources.some(resource => resource.id === action.resourceId)) return action.resourceId;
  if (action.id) {
    const byId = resources.find(resource => resource.id === action.id);
    if (byId) return byId.id;
  }
  const feature = action.sourceId ? availableFeatures.find(candidate => candidate.id === action.sourceId) : null;
  const haystack = `${action.title || action.name || ''} ${action.detail || action.text || ''} ${(action.tags || []).join(' ')} ${feature ? `${feature.name} ${feature.resourceHint} ${feature.text}` : ''}`;
  const clean = normalizeItemName(haystack);
  const title = normalizeItemName(action.title || action.name || '');
  for (const resource of resources) {
    const resourceName = normalizeItemName(resource.name || resource.id);
    const resourceId = normalizeItemName(resource.id || '');
    if (resourceName && title === resourceName) return resource.id;
    if (resourceId && title === resourceId) return resource.id;
    if (resourceName && title.includes(resourceName)) return resource.id;
    if (resourceName && (clean.includes(`spend ${resourceName}`) || clean.includes(`expend ${resourceName}`) || clean.includes(`use your ${resourceName}`))) return resource.id;
    if (resourceId && clean.includes(`spend ${resourceId}`)) return resource.id;
  }
  if (action.sourceId) {
    const sourceResources = resources.filter(resource => resource.sourceId && resource.sourceId === action.sourceId);
    if (sourceResources.length === 1) return sourceResources[0].id;
  }
  for (const alias of RULE_RESOURCE_ALIASES) {
    if (!alias.match.test(haystack)) continue;
    const resource = resources.find(candidate => candidate.id === alias.resourceId);
    if (resource) return resource.id;
  }
  return '';
}

function addPlayerCatalogIssues(report, equipment, ruleActions, itemCatalog, spells, spellCatalog, backgroundNames, backgroundCatalog, feats, featCatalog, availableFeatures = []) {
  for (const itemName of equipment || []) {
    if (!findCatalogItem(itemCatalog, itemName)) addRuleIssue(report, 'warning', 'missing_item_rule', `No canonical item matched "${itemName}".`, { itemName });
  }
  for (const spellName of spells || []) {
    if (!spellCatalog.get(normalizeItemName(spellName))) addRuleIssue(report, 'warning', 'missing_spell_rule', `No canonical spell matched "${spellName}".`, { spellName });
  }
  for (const backgroundName of backgroundNames || []) {
    if (!backgroundCatalog.get(normalizeItemName(backgroundName))) addRuleIssue(report, 'warning', 'missing_background_rule', `No canonical background matched "${backgroundName}".`, { backgroundName });
  }
  for (const featName of feats || []) {
    if (featCatalog.get(normalizeItemName(featName))) continue;
    const feature = availableFeatures.find(candidate => normalizeItemName(candidate.name) === normalizeItemName(featName));
    addRuleIssue(report, 'warning', feature ? 'class_feature_in_feat_lookup' : 'missing_feat_rule', feature
      ? `"${featName}" is a class feature, not a feat lookup entry.`
      : `No canonical feat matched "${featName}".`, { featName });
  }
  for (const action of ruleActions || []) {
    if (action.resourceId && !action.resourceName) addRuleIssue(report, 'info', 'action_well_linked', `"${action.title}" links to resource "${action.resourceId}".`, { action: action.title, resourceId: action.resourceId });
  }
}

function addPlayerActionWellIssues(report, ruleActions) {
  for (const action of ruleActions || []) {
    const text = `${action.title || ''} ${action.detail || ''} ${(action.tags || []).join(' ')}`;
    if (normalizeActionGroupName(action.group) === 'out of combat') continue;
    if (action.resourceId || !looksLikeLimitedAction(text)) continue;
    addRuleIssue(report, 'warning', 'action_well_unresolved', `"${action.title}" looks limited-use, but no resource well was linked.`, {
      action: action.title,
      sourceType: action.sourceType || '',
    });
  }
}

function looksLikeLimitedAction(text) {
  return /\b(regain all expended uses|number of times equal|channel divinity|ki point|bardic inspiration|breath weapon|healing hands|action surge|second wind|wrath of the storm|portent)\b/i.test(text || '');
}

function normalizeActionGroupName(value) {
  return normalizeItemName(value || '').replace(/\s+/g, ' ');
}

function finalizePlayerRuleReport(report, features, resources, actions) {
  report.counts = {
    features: features.length,
    resources: resources.length,
    actions: actions.length,
    linkedActions: actions.filter(action => action.resourceId).length,
  };
  report.actionWellCount = report.counts.linkedActions;
  delete report._issueKeys;
}

function buildPlayerRuleReport(reports) {
  const players = (reports || []).map(report => ({
    id: report.id,
    name: report.name,
    sheetTitle: report.sheetTitle,
    source: report.source,
    counts: report.counts,
    actionWellCount: report.actionWellCount,
    choices: summarizePlayerRuleChoices(report.choices || {}, report),
    issues: report.issues,
  }));
  return {
    generatedAtUtc: new Date().toISOString(),
    playerCount: players.length,
    issueCount: players.reduce((sum, player) => sum + player.issues.length, 0),
    players,
  };
}

function summarizePlayerRuleChoices(choices, report) {
  return {
    race: choices.race || choices.rulesRace || '',
    raceId: choices.raceId || choices.ruleRaceId || '',
    raceIds: normalizeIdChoiceList(choices.raceIds || choices.ruleRaceIds || []),
    backgroundId: choices.backgroundId || choices.ruleBackgroundId || '',
    backgroundIds: normalizeIdChoiceList(choices.backgroundIds || choices.ruleBackgroundIds || []),
    featId: choices.featId || choices.ruleFeatId || '',
    featIds: normalizeIdChoiceList(choices.featIds || choices.ruleFeatIds || []),
    itemIds: normalizeIdChoiceList(choices.itemIds || choices.ruleItemIds || []),
    spellIds: normalizeIdChoiceList(choices.spellIds || choices.ruleSpellIds || []),
    includeOptionalFeatures: choices.includeOptionalFeatures === true,
    optionalFeatures: choices.optionalFeatures || [],
    includeFeatures: choices.includeFeatures || choices.selectedFeatures || choices.classFeatures || [],
    excludeFeatures: choices.excludeFeatures || [],
    featureChoices: choices.featureChoices || choices.choiceGroups || {},
    issueCount: report && report.issues ? report.issues.length : 0,
  };
}

function normalizeChoiceList(values) {
  return (Array.isArray(values) ? values : [values]).filter(Boolean).map(normalizeItemName);
}

function normalizeIdChoiceList(values) {
  const raw = Array.isArray(values)
    ? values
    : values && typeof values === 'object'
      ? Object.values(values).flat()
      : [values];
  return raw.map(value => String(value || '').trim()).filter(Boolean);
}

function cleanChoiceString(value) {
  return String(value || '').trim();
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

function buildPlayerRuleDetails(names, catalog) {
  const out = [];
  const seen = new Set();
  for (const name of [...new Set((names || []).map(String).filter(Boolean))]) {
    const rule = catalog && catalog.get(normalizeItemName(name));
    if (!rule) {
      const detail = {
        id: slugify(name),
        name,
        missing: true,
      };
      if (!seen.has(detail.id)) {
        seen.add(detail.id);
        out.push(detail);
      }
      continue;
    }
    const detail = {
      id: rule.id || slugify(rule.name || name),
      name: rule.name || name,
      source: rule.source || '',
      page: rule.page || '',
      prerequisites: rule.prerequisites || '',
      abilityScores: rule.abilityScores || '',
      repeatable: rule.repeatable || '',
      skillProficiencies: rule.skillProficiencies || '',
      toolProficiencies: rule.toolProficiencies || '',
      languages: rule.languages || '',
      equipment: rule.equipment || '',
      featureName: rule.featureName || '',
      featureText: cleanRulesText(rule.featureText || ''),
      text: cleanRulesText(rule.text || ''),
      timing: rule.timing || '',
    };
    if (!seen.has(detail.id)) {
      seen.add(detail.id);
      out.push(detail);
    }
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
  <link rel="stylesheet" href="${assetPrefix}public-site.css?v=${PUBLIC_SITE_ASSET_VERSION}">
  <script src="${assetPrefix}site-config.js"></script>
  <script src="${assetPrefix}public-site.js?v=${PUBLIC_SITE_ASSET_VERSION}" defer></script>
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
  const classFeaturesHtml = renderRuleFeatureList((p.ruleFeatures || []).filter(feature => feature.kind !== 'race'), 'No class features found in canonical rules.');
  const raceFeaturesHtml = renderRuleFeatureList((p.ruleFeatures || []).filter(feature => feature.kind === 'race'), 'No racial traits found in canonical rules.');
  const backgroundDetailsHtml = renderRuleDetailList(p.backgroundDetails || [], 'No background details found in canonical rules.');
  const featDetailsHtml = renderRuleDetailList(p.featDetails || [], 'No feats recorded on this sheet.');
  const portrait = player.portraitUrl
    ? `<img src="${escapeAttr(player.portraitUrl)}" alt="${title} portrait">`
    : `<span>${escapeHtml(title.slice(0, 1))}</span>`;
  const sheetTabs = [
    ['stats', 'Stats'],
    ['combat', 'Combat'],
    ['actions', 'Actions'],
    ['resources', 'Resources'],
    ['equipment', 'Gear'],
    ['spells', 'Spells'],
    ['features', 'Features'],
    ['notes', 'Notes'],
  ];
  const tabButtons = sheetTabs.map(([id, label], index) => tabButton(id, label, index === 0)).join('\n      ');
  const tabOptions = sheetTabs.map(([id, label], index) => tabOption(id, label, index === 0)).join('\n        ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} - Eldoria Player Sheet</title>
  <link rel="stylesheet" href="${assetPrefix}public-site.css?v=${PUBLIC_SITE_ASSET_VERSION}">
  <link rel="stylesheet" href="${assetPrefix}character-builder.css">
  <script src="${assetPrefix}site-config.js"></script>
  <script src="${assetPrefix}eldoria-ruleset.js" defer></script>
  <script src="${assetPrefix}public-site.js?v=${PUBLIC_SITE_ASSET_VERSION}" defer></script>
  <script src="${assetPrefix}character-builder.js" defer></script>
</head>
<body>
  ${renderSiteHeader(page)}
  <main class="player-sheet" data-tabs data-player-sheet data-player-id="${escapeAttr(p.id)}" data-player-portrait-src="${escapeAttr(p.portrait || '')}" data-player-class-url="${escapeAttr(p.classUrl || '')}">
    <section class="player-hero">
      <div class="portrait" data-player-portrait>${portrait}</div>
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
      <div class="hero-overview">
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
      <div class="equipped-summary" data-equipped-summary></div>
      <div class="hero-actions">
        <div class="hero-rest-actions" aria-label="Rest controls">
          <button type="button" data-rest-type="short">Short Rest</button>
          <button type="button" data-rest-type="long">Long Rest</button>
          <span data-resource-status></span>
        </div>
        <div class="hero-builder-actions">
          <button type="button" data-character-assistant-open>Level Up / Audit</button>
        </div>
      </div>
    </section>

    <nav class="tabs" role="tablist" aria-label="Character sheet sections">
      ${tabButtons}
    </nav>
    <div class="tab-select-shell">
      <select class="tab-select" data-tab-select aria-label="Character sheet section">
        ${tabOptions}
      </select>
    </div>

    ${tabPanel('stats', true, `
      <div class="abilities-grid">${abilities}</div>
      <div class="two-column stacked-section">
        <section><h2>Saving Throws</h2><div class="line-list">${saves}</div></section>
        <section><h2>Skills</h2><div class="line-list">${skills}</div></section>
      </div>
    `)}

    ${tabPanel('combat', false, `
      <div data-ac-panel></div>
      <div class="sheet-grid">
        ${infoCard('Armor Class', p.ac, 'ac')}
        ${infoCard('Initiative', formatBonus(p.initiative), 'initiative')}
        ${infoCard('Proficiency', formatBonus(p.proficiencyBonus), 'proficiencyBonus')}
        ${infoCard('Speed', `${p.speed} ft`, 'speed')}
        ${infoCard('Simple Melee', formatBonus(player.modifiers.str + (p.simpleWeapons ? p.proficiencyBonus : 0)), 'simpleMelee')}
        ${infoCard('Simple Ranged', formatBonus(player.modifiers.dex + (p.simpleWeapons ? p.proficiencyBonus : 0)), 'simpleRanged')}
        ${infoCard('Martial Melee', formatBonus(player.modifiers.str + (p.martialWeapons ? p.proficiencyBonus : 0)), 'martialMelee')}
        ${infoCard('Martial Ranged', formatBonus(player.modifiers.dex + (p.martialWeapons ? p.proficiencyBonus : 0)), 'martialRanged')}
        ${infoCard('Spell Attack', p.spellAttack === null ? '-' : formatBonus(p.spellAttack), 'spellAttack')}
        ${infoCard('Spell Save DC', p.spellSaveDc === null ? '-' : p.spellSaveDc, 'spellSaveDc')}
      </div>
      <section>
        <h2>Weapon Attacks</h2>
        <div class="weapon-grid" data-weapon-attacks></div>
        <div class="roll-log" data-roll-log></div>
      </section>
      <div data-combat-features></div>
      <div data-temporary-effects-panel></div>
    `)}

    ${tabPanel('actions', false, `
      <div data-actions-panel></div>
    `)}

    ${tabPanel('resources', false, `
      <div data-resources-panel></div>
    `)}

    ${tabPanel('equipment', false, `
      <div
        data-equipment-panel
        data-rules-base="${escapeAttr(relativeUrl(page.url, 'Assets/Rules/'))}"
        data-items-url="${escapeAttr(relativeUrl(page.url, 'Assets/Rules/items.json'))}"
        data-classes-url="${escapeAttr(relativeUrl(page.url, 'Assets/Rules/classes.json'))}"
        data-races-url="${escapeAttr(relativeUrl(page.url, 'Assets/Rules/races.json'))}"
        data-backgrounds-url="${escapeAttr(relativeUrl(page.url, 'Assets/Rules/backgrounds.json'))}"
      ></div>
    `)}
    ${tabPanel('spells', false, `<div data-spell-panel data-spells-url="${escapeAttr(relativeUrl(page.url, 'data/spells.json'))}"></div>`)}
    ${tabPanel('features', false, `
      <div class="sheet-grid">
        ${infoCard('Class', `${p.class}${p.subclassShortName ? ` (${p.subclassShortName})` : ''}`, 'classSummary')}
        ${infoCard('Race', p.races.join(', ') || p.race || '-', 'races')}
        ${infoCard('Background', p.backgrounds.join(', ') || p.background || '-', 'backgrounds')}
        ${infoCard('Feats', p.feats.join(', ') || '-', 'feats')}
      </div>
      <section class="feature-notes">
        <h2>Class Features</h2>
        <div data-class-info-panel>${classFeaturesHtml}</div>
      </section>
      <section class="feature-notes">
        <h2>Sheet Feature Notes</h2>
        ${featuresHtml}
      </section>
      <section class="feature-notes">
        <h2>Racial Traits</h2>
        <div data-race-info-panel>${raceFeaturesHtml}</div>
      </section>
      <section class="feature-notes">
        <h2>Background Benefits</h2>
        <div data-background-info-panel>${backgroundDetailsHtml}</div>
      </section>
      <section class="feature-notes">
        <h2>Feat Benefits</h2>
        <div data-feat-info-panel>${featDetailsHtml}</div>
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
      <div class="resource-links" data-player-resource-links>
        ${p.notesUrl ? `<a href="${escapeAttr(p.notesUrl)}">Player notes</a>` : ''}
        ${p.classUrl ? `<a href="${escapeAttr(relativeUrl(page.url, p.classUrl))}">Full class info</a>` : ''}
        <a href="${escapeAttr(relativeUrl(page.url, 'spell-search.html'))}">Quick spell lookup</a>
      </div>
    `)}
    ${renderCharacterAssistantModal(page, p)}
  </main>
</body>
</html>
`;
}

function tabButton(id, label, active = false) {
  return `<button class="tab-button ${active ? 'active' : ''}" data-tab-target="${id}" type="button" role="tab" aria-selected="${active ? 'true' : 'false'}">${label}</button>`;
}

function renderCharacterAssistantModal(page, player) {
  return `<dialog class="character-assistant-dialog" data-character-assistant-modal aria-labelledby="builder-title">
    <div class="character-assistant-frame">
      <button class="character-assistant-close" type="button" data-character-assistant-close aria-label="Close character assistant">&times;</button>
      ${renderCharacterBuilderPanel(page, player)}
    </div>
  </dialog>`;
}

function renderCharacterBuilderPanel(page, player) {
  const rulesBase = relativeUrl(page.url, 'index.html').replace(/index\.html$/i, '');
  return `<div class="builder-shell sheet-builder" data-character-builder data-builder-mode="sheet" data-builder-character-id="${escapeAttr(player.id)}" data-builder-player-name="${escapeAttr(player.name)}" data-builder-sheet-title="${escapeAttr(player.sheetTitle || '')}" data-builder-portrait="${escapeAttr(player.portrait || '')}" data-rules-base="${escapeAttr(rulesBase)}">
    <section class="builder-hero" aria-labelledby="builder-title">
      <div>
        <div class="kicker">Character Rules</div>
        <h2 id="builder-title">Character Builder</h2>
      </div>
      <div class="builder-status" data-builder-status>Loading rules...</div>
    </section>

    <nav class="builder-stepper" aria-label="Character builder steps">
      <button type="button" data-step-target="levels">Levels</button>
    </nav>

    <section class="builder-grid">
      <aside class="builder-panel builder-panel-sticky" aria-labelledby="cloud-title">
        <h2 id="cloud-title">Character Build</h2>
        <select data-character-select hidden aria-hidden="true">
          <option value="${escapeAttr(player.id)}">${escapeHtml(player.name)}</option>
        </select>
        <div class="builder-sheet-summary">
          <strong>${escapeHtml(player.name)}</strong>
          <span>New character draft</span>
        </div>
        <div class="builder-actions">
          <button type="button" data-new-draft>New Draft</button>
          <button type="button" data-level-up>Next Level</button>
          <button type="button" data-save-cloud>Save</button>
        </div>
        <p class="builder-note" data-storage-note>Characters save to the Eldoria cloud API when it is configured.</p>
        <div class="builder-current-state" data-current-state></div>
      </aside>

      <div class="builder-main">
        <section class="builder-panel" data-step="levels" aria-labelledby="audit-title">
          <div class="panel-heading">
            <h2 id="audit-title">Builder Review</h2>
            <span data-audit-summary></span>
          </div>
          <div class="audit-list" data-audit-list></div>
          <div class="next-level-summary" data-next-level-summary></div>
        </section>

        <section class="builder-panel" data-step="levels" aria-labelledby="identity-title">
          <h2 id="identity-title">Level 1: Identity And Scores</h2>
          <div class="form-grid">
            <label>
              Character Name
              <input type="text" data-field="name" autocomplete="off">
            </label>
            <label>
              Level
              <input type="number" data-field="level" min="1" max="20">
            </label>
            <label>
              Ability Method
              <select data-field="abilityMethod">
                <option value="manual">Manual / Imported</option>
                <option value="standard-array">Standard Array</option>
                <option value="point-buy">Point Buy</option>
                <option value="rolled">Rolled</option>
              </select>
            </label>
          </div>
          <div class="ability-edit-grid" aria-label="Ability scores">
            ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(key => `<label>${key.toUpperCase()}<input type="number" min="1" max="30" data-ability-field="${key}"></label>`).join('')}
          </div>
          <div class="form-grid">
            <label>
              Health Mode
              <select data-field="hpMode">
                <option value="auto-average">Auto Average On Level Up</option>
                <option value="manual">Manual Hit Points</option>
              </select>
            </label>
            <label>
              Max HP
              <input type="number" data-field="maxHp" min="0" max="999">
            </label>
            <label>
              Current HP
              <input type="number" data-field="currentHp" min="0" max="999">
            </label>
          </div>
        </section>

        <section class="builder-panel" data-step="levels" aria-labelledby="origin-title">
          <h2 id="origin-title">Level 1: Origin</h2>
          <div class="form-grid">
            <label>
              Race
              <select data-field="raceId"></select>
            </label>
            <label>
              Background
              <select data-field="backgroundId"></select>
            </label>
          </div>
          <div class="rule-detail-grid">
            <div class="rule-detail-slot" data-rule-detail="race"></div>
            <div class="rule-detail-slot" data-rule-detail="background"></div>
          </div>
        </section>

        <section class="builder-panel" data-step="levels" aria-labelledby="class-title">
          <div class="panel-heading">
            <h2 id="class-title">Level 1: Class Path</h2>
            <span data-class-gate></span>
          </div>
          <div class="form-grid">
            <label>
              Class
              <select data-field="classId"></select>
            </label>
            <label data-subclass-field hidden>
              Subclass
              <select data-field="subclassId"></select>
            </label>
          </div>
          <div class="rule-detail-grid">
            <div class="rule-detail-slot" data-rule-detail="class"></div>
            <div class="rule-detail-slot" data-rule-detail="subclass" hidden></div>
          </div>
        </section>

        <section class="builder-panel" data-step="levels" aria-labelledby="features-title">
          <div class="panel-heading">
            <h2 id="features-title">Levels</h2>
            <span data-feature-summary></span>
          </div>
          <div class="choice-groups" data-choice-groups></div>
        </section>

        <div class="builder-nav">
          <button type="button" data-prev-step>Previous</button>
          <button type="button" data-next-step>Next</button>
        </div>
      </div>
    </section>
  </div>`;
}

function tabOption(id, label, active = false) {
  return `<option value="${escapeAttr(id)}"${active ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}

function renderRuleFeatureList(features, emptyText = 'No features found in canonical rules.') {
  if (!features.length) return `<p>${escapeHtml(emptyText)}</p>`;
  return `<div class="class-feature-list">
    ${features.map(feature => `<details class="class-feature-row">
      <summary>
        <span>
          <strong>${escapeHtml(feature.name)}</strong>
          <small>${escapeHtml(formatFeatureMeta(feature))}</small>
        </span>
      </summary>
      <p>${escapeHtml(feature.text || 'No feature text recorded.')}</p>
    </details>`).join('')}
  </div>`;
}

function renderRuleDetailList(details, emptyText) {
  if (!details.length) return `<p>${escapeHtml(emptyText || 'No details found in canonical rules.')}</p>`;
  return `<div class="class-feature-list">
    ${details.map(detail => `<details class="class-feature-row">
      <summary>
        <span>
          <strong>${escapeHtml(detail.name)}</strong>
          <small>${escapeHtml(formatRuleDetailMeta(detail))}</small>
        </span>
      </summary>
      ${renderRuleDetailFields(detail)}
      <p>${escapeHtml(formatRuleDetailText(detail))}</p>
    </details>`).join('')}
  </div>`;
}

function renderRuleDetailFields(detail) {
  const rows = [
    ['Skill Proficiencies', detail.skillProficiencies],
    ['Tool Proficiencies', detail.toolProficiencies],
    ['Languages', detail.languages],
    ['Equipment', detail.equipment],
    ['Prerequisites', detail.prerequisites],
    ['Ability Score', detail.abilityScores],
    ['Repeatable', detail.repeatable],
  ].filter(([, value]) => value);
  if (!rows.length) return '';
  return `<dl class="equipment-detail-grid">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
}

function formatRuleDetailMeta(detail) {
  if (detail.missing) return 'Details unavailable';
  return [detail.featureName, detail.source && (detail.page ? `${detail.source} p. ${detail.page}` : detail.source), detail.timing].filter(Boolean).join(' / ');
}

function formatRuleDetailText(detail) {
  if (detail.missing) return 'No canonical rules entry matched this sheet value yet.';
  if (detail.featureName && detail.featureText) return `${detail.featureName}: ${detail.featureText}`;
  return detail.featureText || detail.text || 'No rules text recorded.';
}

function formatFeatureMeta(feature) {
  return [
    feature.kind === 'race' ? feature.raceName || 'Race' : (feature.kind === 'subclass' ? feature.subclassName : feature.className),
    feature.level ? `Level ${feature.level}` : '',
    feature.timing,
    feature.resourceHint,
  ].filter(Boolean).join(' / ');
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
  <link rel="stylesheet" href="./site-assets/public-site.css?v=${PUBLIC_SITE_ASSET_VERSION}">
  <script src="./site-assets/site-config.js"></script>
  <script src="./site-assets/public-site.js?v=${PUBLIC_SITE_ASSET_VERSION}" defer></script>
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
  <link rel="stylesheet" href="../site-assets/public-site.css?v=${PUBLIC_SITE_ASSET_VERSION}">
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
