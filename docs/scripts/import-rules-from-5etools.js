#!/usr/bin/env node

/*
 * Imports upstream/local reference data into Eldoria's canonical rules JSON.
 *
 * 5etools and the CSV exports are inputs for this script only. The website reads
 * the JSON files in docs/Assets/Rules as its rules source of truth.
 */

const fs = require('fs');
const path = require('path');

const DOCS_ROOT = path.resolve(__dirname, '..');
const RULES_OUT = path.join(DOCS_ROOT, 'Assets', 'Rules');
const ITEMS_CSV = path.join(DOCS_ROOT, 'Assets', 'Items', 'Items.csv');
const SPELLS_CSV = path.join(DOCS_ROOT, 'Assets', 'Spells', 'Spells.csv');
const FEATS_CSV = path.join(DOCS_ROOT, 'Assets', 'Feats', 'Feats.csv');
const BACKGROUNDS_CSV = path.join(DOCS_ROOT, 'Assets', 'Backgrounds', 'Backgrounds.csv');
const CLASS_ROOT = path.join(DOCS_ROOT, '5etools', 'data', 'class');
const RACES_JSON = path.join(DOCS_ROOT, '5etools', 'data', 'races.json');
const RULE_OVERRIDES_JSON = path.join(RULES_OUT, 'rule-overrides.json');
const CHECK_ONLY = process.argv.includes('--check');
const RACE_SOURCE_PRIORITY = ['PHB', 'VGM', 'EEPC', 'DMG', 'XGE', 'TCE', 'SCAG', 'MPMM'];
const IGNORED_RACE_TRAIT_NAMES = new Set(['Age', 'Alignment', 'Names', 'Height and Weight']);
const RULE_OVERRIDE_COLLECTIONS = ['items', 'spells', 'features', 'actions', 'resources', 'effects', 'rules', 'backgrounds', 'feats', 'races', 'classes', 'subclasses'];

const CURRENT_PARTY_ITEM_RULES = {
  'corpse slayer flamberge bastard sword': {
    weapon: {
      baseName: 'Flamberge Bastard Sword',
      type: 'martial',
      style: 'melee',
      ability: 'str',
      damage: '2d4',
      damageType: 'slashing',
      properties: ['heavy', 'versatile (2d6)', 'special'],
      magicBonus: 1,
    },
    toggles: [
      {
        id: 'corpse-slayer-undead-target',
        label: 'Undead target',
        timing: 'on-hit',
        appliesTo: 'this-weapon',
        effects: [{ kind: 'extra-damage', dice: '1d8', damageType: 'weapon', label: 'Corpse Slayer vs undead' }],
        text: 'On a hit against an undead creature, add 1d8 weapon damage and give it disadvantage on saves against turn undead effects until your next turn.',
      },
    ],
    actions: [
      {
        id: 'corpse-slayer-defensive-parry',
        group: 'Reaction',
        type: 'Weapon',
        title: 'Corpse Slayer Defensive Parry',
        detail: 'While wielding this weapon, add proficiency bonus to AC against one melee attack that would hit you.',
        tags: ['Reaction', 'Melee attack', 'Wielding weapon'],
      },
    ],
  },
  'sigil of thunderous might': {
    resources: [{ id: 'sigil-crushing-strike', name: 'Crushing Strike', max: 1, reset: 'longRest' }, { id: 'sigil-shielding-impact', name: 'Shielding Impact', max: 1, reset: 'longRest' }],
    toggles: [
      {
        id: 'sigil-crushing-strike',
        label: 'Crushing Strike',
        timing: 'before-attack',
        appliesTo: 'equipped-weapon',
        resourceId: 'sigil-crushing-strike',
        effects: [{ kind: 'extra-damage', dice: '2d6', damageType: 'thunder', label: 'Crushing Strike' }],
        text: 'Before determining if an attack hits, add 2d6 thunder damage on a hit.',
      },
      {
        id: 'sigil-shielding-impact',
        label: 'Shielding Impact',
        timing: 'before-attack',
        appliesTo: 'equipped-weapon',
        resourceId: 'sigil-shielding-impact',
        effects: [{ kind: 'on-hit', label: 'Shielding Impact', text: 'You and up to two allies within 20 feet gain temporary hit points equal to half the damage dealt.' }],
        text: 'Before determining if an attack hits, grant temporary hit points on a hit.',
      },
    ],
  },
  'bracer of piercing arrows': {
    resources: [{ id: 'piercing-shot', name: 'Piercing Shot', max: 3, reset: 'longRest' }, { id: 'precise-aim', name: 'Precise Aim', max: 1, reset: 'longRest' }],
  },
  'amulet of divine retribution': {
    resources: [{ id: 'divine-wrath', name: 'Divine Wrath', max: 1, reset: 'longRest' }, { id: 'divine-protection', name: 'Divine Protection', max: 1, reset: 'longRest' }],
  },
  'gauntlets of whirling strikes': {
    resources: [{ id: 'whirling-fury', name: 'Whirling Fury', max: 1, reset: 'longRest' }, { id: 'evasive-maneuver', name: 'Evasive Maneuver', max: 1, reset: 'longRest' }],
    actions: {
      'whirling-fury': { remove: true },
    },
    toggles: {
      'whirling-fury': {
        label: 'Whirling Fury',
        timing: 'on-hit',
        appliesTo: 'equipped-weapon',
        resourceId: 'gauntlets-of-whirling-strikes-whirling-fury',
        consumeOn: 'activation',
        valueKey: 'whirling-fury-damage-bonus',
        defaultValue: 1,
        min: 0,
        step: 1,
        effects: [{
          kind: 'weapon-damage-bonus',
          label: 'Whirling Fury',
          valueMode: 'manual',
          valueKey: 'whirling-fury-damage-bonus',
          defaultValue: 1,
          min: 0,
          step: 1,
          valueLabel: 'Damage bonus',
        }],
        text: 'Activate once per long rest. While active, add the current Whirling Fury bonus as same-type weapon damage. Increase the bonus manually for consecutive hits, and reset it if you miss or switch targets.',
      },
    },
  },
  'talisman of elemental fury': {
    resources: [{ id: 'elemental-surge', name: 'Elemental Surge', max: 1, reset: 'longRest' }, { id: 'elemental-ward', name: 'Elemental Ward', max: 1, reset: 'longRest' }],
  },
  'the aegis codex': {
    resources: [{ id: 'arcane-distraction', name: 'Arcane Distraction', max: 1, reset: 'longRest' }, { id: 'arcane-barrier', name: 'Arcane Barrier', max: 1, reset: 'longRest' }],
  },
  'lightning rod': {
    resources: [{ id: 'lightning-rod-charges', name: 'Lightning Rod Charges', max: 6, reset: 'dawnLose1d6' }],
    effects: [{ kind: 'resistance', target: 'lightning', mode: 'conditional', text: 'Immune to lightning damage while holding it until it reaches 6 charges; then resistance instead.' }],
  },
  'medallion of harmonious resonance': {
    weapon: false,
    damage: '',
    tags: ['NoWeaponAttack', 'NoAutoDamage'],
    actions: {
      'resonant-crescendo': { roll: false, tags: ['Attunement', '1 use', 'NoAutoDamage'] },
      'melodic-harmony': { roll: false, tags: ['Attunement', '1 use'] },
    },
  },
};

const DEFAULT_RULE_OVERRIDES = {
  schemaVersion: 1,
  items: Object.fromEntries(Object.entries(CURRENT_PARTY_ITEM_RULES).map(([key, value]) => [slugify(key), value])),
  spells: {},
  features: {},
  actions: {},
  resources: {},
  effects: {},
  rules: {},
  backgrounds: {},
  feats: {},
  races: {},
  classes: {},
  subclasses: {},
};

function main() {
  const ruleOverrides = loadRuleOverrides();
  const classesAndFeatures = importClasses();
  const racesAndFeatures = importRaces();
  classesAndFeatures.classes = applyCollectionOverrides(classesAndFeatures.classes, ruleOverrides.classes).sort(byName);
  classesAndFeatures.subclasses = applyCollectionOverrides(classesAndFeatures.subclasses, ruleOverrides.subclasses).sort(byName);
  racesAndFeatures.races = applyCollectionOverrides(racesAndFeatures.races, ruleOverrides.races).sort(byName);
  const features = applyCollectionOverrides([...classesAndFeatures.features, ...racesAndFeatures.features], ruleOverrides.features)
    .sort((a, b) => `${a.kind} ${a.className || a.raceName || ''} ${a.level || 0} ${a.name}`.localeCompare(`${b.kind} ${b.className || b.raceName || ''} ${b.level || 0} ${b.name}`));
  const items = parseCsv(readIfExists(ITEMS_CSV)).map(row => buildItem(row, ruleOverrides.items)).filter(Boolean).sort(byName);
  const spells = applyCollectionOverrides(parseCsv(readIfExists(SPELLS_CSV)).map(buildSpell).filter(Boolean), ruleOverrides.spells).sort(byName);
  const feats = applyCollectionOverrides(parseCsv(readIfExists(FEATS_CSV)).map(buildFeat).filter(Boolean), ruleOverrides.feats).sort(byName);
  const backgrounds = applyCollectionOverrides(parseCsv(readIfExists(BACKGROUNDS_CSV)).map(buildBackground).filter(Boolean), ruleOverrides.backgrounds).sort(byName);
  classesAndFeatures.classes = withResolvedClassCollections(classesAndFeatures.classes, features).sort(byName);
  classesAndFeatures.subclasses = withResolvedSubclassCollections(classesAndFeatures.subclasses, features)
    .sort((a, b) => `${a.className} ${a.name}`.localeCompare(`${b.className} ${b.name}`));
  racesAndFeatures.races = withResolvedRaceCollections(racesAndFeatures.races, features)
    .sort((a, b) => sourcePriority(a.source) - sourcePriority(b.source) || a.name.localeCompare(b.name));
  const actions = applyCollectionOverrides(collectActions(features, items, spells, feats, backgrounds), ruleOverrides.actions).sort(byName);
  const effects = applyCollectionOverrides(collectEffects(features, items, feats, backgrounds), ruleOverrides.effects).sort(byName);
  const resources = applyCollectionOverrides(collectResources(features, items, feats), ruleOverrides.resources).sort(byName);
  const generatedAtUtc = getGeneratedAtUtc();
  const manifest = {
    schemaVersion: 1,
    generatedAtUtc,
    upstream: {
      classRoot: relative(DOCS_ROOT, CLASS_ROOT),
      itemsCsv: relative(DOCS_ROOT, ITEMS_CSV),
      spellsCsv: relative(DOCS_ROOT, SPELLS_CSV),
      featsCsv: relative(DOCS_ROOT, FEATS_CSV),
      backgroundsCsv: relative(DOCS_ROOT, BACKGROUNDS_CSV),
      racesJson: relative(DOCS_ROOT, RACES_JSON),
      ruleOverrides: relative(DOCS_ROOT, RULE_OVERRIDES_JSON),
    },
    overrides: {
      schemaVersion: ruleOverrides.schemaVersion || 1,
      counts: countRuleOverrides(ruleOverrides),
    },
    counts: {
      classes: classesAndFeatures.classes.length,
      subclasses: classesAndFeatures.subclasses.length,
      races: racesAndFeatures.races.length,
      features: features.length,
      items: items.length,
      spells: spells.length,
      feats: feats.length,
      backgrounds: backgrounds.length,
      actions: actions.length,
      effects: effects.length,
      resources: resources.length,
    },
  };
  const report = buildReport({ ...classesAndFeatures, ...racesAndFeatures, features, items, spells, feats, backgrounds, actions, effects, resources, manifest });

  writeRulesJson('classes.json', classesAndFeatures.classes);
  writeRulesJson('subclasses.json', classesAndFeatures.subclasses);
  writeRulesJson('races.json', racesAndFeatures.races);
  writeRulesJson('features.json', features);
  writeRulesJson('items.json', items);
  writeRulesJson('spells.json', spells);
  writeRulesJson('feats.json', feats);
  writeRulesJson('backgrounds.json', backgrounds);
  writeRulesJson('actions.json', actions);
  writeRulesJson('effects.json', effects);
  writeRulesJson('resources.json', resources);
  writeRulesJson('manifest.json', manifest);
  writeRulesJson('import-report.json', report);

  if (!CHECK_ONLY) {
    console.log(`Imported canonical rules JSON into ${relative(process.cwd(), RULES_OUT)}`);
    console.log(`Classes ${manifest.counts.classes}, subclasses ${manifest.counts.subclasses}, races ${manifest.counts.races}, features ${manifest.counts.features}`);
    console.log(`Items ${manifest.counts.items}, spells ${manifest.counts.spells}, feats ${manifest.counts.feats}, backgrounds ${manifest.counts.backgrounds}`);
    console.log(`Actions ${manifest.counts.actions}, effects ${manifest.counts.effects}, resources ${manifest.counts.resources}`);
  }
}

function getGeneratedAtUtc() {
  if (!CHECK_ONLY) return new Date().toISOString();
  const manifest = path.join(RULES_OUT, 'manifest.json');
  try {
    return JSON.parse(readIfExists(manifest)).generatedAtUtc || '1970-01-01T00:00:00.000Z';
  } catch (error) {
    return '1970-01-01T00:00:00.000Z';
  }
}

function importClasses() {
  const classes = [];
  const subclasses = [];
  const features = [];
  if (!fs.existsSync(CLASS_ROOT)) return { classes, subclasses, features };

  for (const file of fs.readdirSync(CLASS_ROOT).filter(name => /^class-.*\.json$/i.test(name)).sort()) {
    const data = readJson(path.join(CLASS_ROOT, file));
    for (const cls of data.class || []) {
      if (!cls.name) continue;
      const origin = buildClassOriginBlock(cls);
      classes.push({
        id: slugify(cls.name),
        name: cls.name,
        source: cls.source || '',
        hitDie: cls.hd ? `d${cls.hd.faces}` : '',
        proficiency: cls.proficiency || [],
        savingThrows: cls.savingThrowProficiencies || [],
        spellcastingAbility: cls.spellcastingAbility || '',
        casterProgression: getCasterProgression(cls),
        classFeatures: cls.classFeatures || [],
        origin,
        ...(origin.grants && origin.grants.length ? { grants: origin.grants } : {}),
      });
    }

    for (const subclass of data.subclass || []) {
      if (!subclass.name || !subclass.className) continue;
      subclasses.push({
        id: slugify(`${subclass.className}-${subclass.shortName || subclass.name}`),
        name: subclass.name,
        shortName: subclass.shortName || subclass.name,
        className: subclass.className,
        source: subclass.source || '',
        subclassFeatures: subclass.subclassFeatures || [],
        origin: buildSubclassOriginBlock(subclass),
      });
    }

    for (const feature of data.classFeature || []) features.push(buildFeature(feature, 'class'));
    for (const feature of data.subclassFeature || []) features.push(buildFeature(feature, 'subclass'));
  }

  return {
    classes: uniqueBy(classes, item => item.id).sort(byName),
    subclasses: uniqueBy(subclasses, item => item.id).sort((a, b) => `${a.className} ${a.name}`.localeCompare(`${b.className} ${b.name}`)),
    features: uniqueBy(features.filter(Boolean), item => item.id).sort((a, b) => `${a.className} ${a.subclassShortName || ''} ${a.level} ${a.name}`.localeCompare(`${b.className} ${b.subclassShortName || ''} ${b.level} ${b.name}`)),
  };
}

function buildClassOriginBlock(cls) {
  const hitDie = cls && cls.hd && cls.hd.faces ? `d${cls.hd.faces}` : '';
  const grants = [];
  (Array.isArray(cls && cls.proficiency) ? cls.proficiency : []).forEach(ability => {
    grants.push({ type: 'saving-throw', ability, levelGate: 1 });
  });
  if (hitDie) grants.push({ type: 'hit-die', value: hitDie, levelGate: 1 });
  if (cls && cls.spellcastingAbility) {
    grants.push({
      type: 'spellcasting',
      ability: cls.spellcastingAbility,
      progression: getCasterProgression(cls),
      levelGate: 1,
    });
  }
  return {
    type: 'class-origin',
    source: cls && cls.source || '',
    ...(hitDie ? { hitDie } : {}),
    grants: uniqueBy(grants, grantKey),
  };
}

function buildSubclassOriginBlock(subclass) {
  return {
    type: 'subclass-origin',
    source: subclass && subclass.source || '',
    className: subclass && subclass.className || '',
  };
}

function withResolvedClassCollections(classes, features) {
  const featuresByClass = groupBy((features || []).filter(feature => feature.kind === 'class'), feature => normalizeName(feature.className));
  return (classes || []).map(cls => {
    const rows = (featuresByClass.get(normalizeName(cls.name)) || [])
      .filter(feature => Number(feature.level || 1) >= 1)
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || a.name.localeCompare(b.name));
    return {
      ...cls,
      featureIds: rows.map(feature => feature.id),
      features: rows,
    };
  });
}

function withResolvedSubclassCollections(subclasses, features) {
  const subclassFeatures = (features || []).filter(feature => feature.kind === 'subclass');
  return (subclasses || []).map(subclass => {
    const rows = subclassFeatures
      .filter(feature => normalizeName(feature.className) === normalizeName(subclass.className))
      .filter(feature => normalizeName(feature.subclassShortName || feature.subclassName) === normalizeName(subclass.shortName || subclass.name)
        || normalizeName(feature.subclassName) === normalizeName(subclass.name))
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || a.name.localeCompare(b.name));
    return {
      ...subclass,
      featureIds: rows.map(feature => feature.id),
      features: rows,
    };
  });
}

function importRaces() {
  const races = [];
  const features = [];
  if (!fs.existsSync(RACES_JSON)) return { races, features };

  const data = readJson(RACES_JSON);
  for (const race of data.race || []) {
    const record = buildRaceRecord(race, false);
    if (!record) continue;
    const raceFeatures = buildRaceFeatures(race, record);
    races.push(record);
    features.push(...raceFeatures);
  }
  for (const subrace of data.subrace || []) {
    const record = buildRaceRecord(subrace, true);
    if (!record) continue;
    const raceFeatures = buildRaceFeatures(subrace, record);
    races.push(record);
    features.push(...raceFeatures);
  }

  const uniqueRaces = uniqueBy(races, race => race.id);
  const uniqueFeatures = uniqueBy(features.filter(Boolean), feature => feature.id);
  return {
    races: uniqueRaces.sort((a, b) => sourcePriority(a.source) - sourcePriority(b.source) || a.name.localeCompare(b.name)),
    features: uniqueFeatures.sort((a, b) => `${a.raceName} ${a.name}`.localeCompare(`${b.raceName} ${b.name}`)),
  };
}

function buildRaceRecord(race, isSubrace) {
  if (!race || !race.name) return null;
  const baseName = isSubrace ? race.raceName || '' : race.name;
  if (!baseName) return null;
  const subraceName = isSubrace ? race.name : '';
  const displayName = subraceName ? `${baseName} (${subraceName})` : baseName;
  const source = race.source || '';
  const rules = buildRaceRules(race);
  const parentRaceId = subraceName ? slugify(['race', baseName, race.raceSource || source].filter(Boolean).join('-')) : '';
  return {
    id: slugify(['race', baseName, subraceName, source].filter(Boolean).join('-')),
    name: displayName,
    baseName,
    subraceName,
    source,
    raceSource: race.raceSource || source,
    page: race.page || '',
    parentRaceId,
    aliases: buildRaceAliases(baseName, subraceName),
    size: race.size || [],
    speed: race.speed || '',
    ability: race.ability || [],
    traitTags: race.traitTags || [],
    origin: buildRaceOriginBlock(race, rules, parentRaceId),
    ...(Object.keys(rules).length ? { rules } : {}),
  };
}

function buildRaceOriginBlock(race, rules = {}, parentRaceId = '') {
  const origin = {
    type: 'race-origin',
    source: race && race.source || '',
    parentRaceId,
  };
  [
    ['abilityScores', 'abilityScores'],
    ['size', 'size'],
    ['speed', 'speed'],
    ['languages', 'languages'],
    ['defenses', 'defenses'],
    ['senses', 'senses'],
    ['traits', 'traits'],
    ['spells', 'spells'],
  ].forEach(([targetKey, sourceKey]) => {
    if (Array.isArray(rules[sourceKey]) && rules[sourceKey].length) origin[targetKey] = rules[sourceKey];
  });
  return origin;
}

function withResolvedRaceCollections(races, features) {
  const racesById = new Map((races || []).map(race => [race.id, race]));
  const featuresByRaceId = groupBy((features || []).filter(feature => feature.kind === 'race'), feature => feature.raceId || '');
  return (races || []).map(race => withResolvedRaceBlocks(race, racesById, featuresByRaceId));
}

function withResolvedRaceBlocks(race, racesById, featuresByRaceId) {
  const chain = getRaceInheritanceChain(race, racesById);
  const origin = mergeRaceOriginBlocks(chain.map(row => row.origin));
  const features = chain.flatMap(row => (featuresByRaceId.get(row.id) || []).map(feature => (
    row.id === race.id
      ? feature
      : {
        ...feature,
        inherited: true,
        inheritedFromRaceId: row.id,
        inheritedFromRaceName: row.name,
      }
  )));
  return {
    ...race,
    origin: {
      ...origin,
      type: 'race-origin',
      parentRaceId: race.parentRaceId || '',
    },
    featureIds: features.map(feature => feature.id),
    features,
  };
}

function getRaceInheritanceChain(race, racesById) {
  if (!race) return [];
  const parent = race.parentRaceId && racesById.get(race.parentRaceId);
  return parent ? [...getRaceInheritanceChain(parent, racesById), race] : [race];
}

function mergeRaceOriginBlocks(origins) {
  const out = {};
  const sources = new Set();
  for (const origin of origins || []) {
    if (!origin || typeof origin !== 'object') continue;
    if (origin.source) {
      String(origin.source).split('+').filter(Boolean).forEach(source => sources.add(source));
      out.source = [...sources].join('+');
    }
    [
      'abilityScores',
      'size',
      'speed',
      'languages',
      'defenses',
      'senses',
      'traits',
      'spells',
    ].forEach(key => {
      const values = Array.isArray(origin[key]) ? origin[key] : [];
      if (!values.length) return;
      out[key] = uniqueBy([...(out[key] || []), ...values.map(value => ({ ...value }))], stableJson);
    });
  }
  return out;
}

function groupBy(items, getKey) {
  const out = new Map();
  for (const item of items || []) {
    const key = getKey(item);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(item);
  }
  return out;
}

function stableJson(value) {
  if (!value || typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${key}:${stableJson(value[key])}`).join(',')}}`;
}

function buildRaceAliases(baseName, subraceName) {
  const aliases = [baseName];
  if (subraceName) {
    aliases.push(`${baseName} (${subraceName})`);
    aliases.push(`${subraceName} ${baseName}`);
    aliases.push(`${baseName} ${subraceName}`);
  }
  return [...new Set(aliases.filter(Boolean))];
}

function buildRaceFeatures(race, raceRecord) {
  const entries = Array.isArray(race.entries) ? race.entries : [];
  const raceRules = buildRaceRules(race);
  return entries
    .map(entry => buildRaceFeature(entry, raceRecord, raceRules))
    .filter(Boolean);
}

function buildRaceFeature(entry, raceRecord, raceRules = {}) {
  if (!entry || typeof entry !== 'object' || !entry.name) return null;
  if (IGNORED_RACE_TRAIT_NAMES.has(entry.name)) return null;
  const text = cleanRulesText(entriesToText(entry.entries || entry.items || entry.rows || []));
  if (!text) return null;
  const grants = buildRaceFeatureGrants(entry, text, raceRules);
  return {
    id: slugify(['race', raceRecord.name, entry.name, raceRecord.source].filter(Boolean).join('-')),
    kind: 'race',
    name: entry.name,
    raceId: raceRecord.id,
    parentRaceId: raceRecord.parentRaceId || '',
    raceName: raceRecord.name,
    baseRaceName: raceRecord.baseName,
    subraceName: raceRecord.subraceName || '',
    level: inferRaceFeatureLevel(entry.name, text),
    source: raceRecord.source || '',
    text,
    timing: classifyTiming(`${entry.name} ${text}`),
    resourceHint: inferFeatureResourceHint(entry.name, text),
    ...(grants.length ? { grants } : {}),
  };
}

function buildRaceRules(race) {
  const rules = {};
  const abilityScores = normalizeRaceAbilityGrants(race && race.ability);
  const size = normalizeRaceSizeGrants(race && race.size);
  const speed = normalizeRaceSpeedGrants(race && race.speed);
  const languages = normalizeRaceLanguageGrants(race && race.languageProficiencies);
  const defenses = normalizeRaceDefenseGrants(race && race.resist, 'resistance');
  const senses = normalizeRaceSenseGrants(race);
  const traits = normalizeRaceTraitGrants(race && race.traitTags);
  const spells = normalizeAdditionalSpellGrants(race && race.additionalSpells, race);
  if (abilityScores.length) rules.abilityScores = abilityScores;
  if (size.length) rules.size = size;
  if (speed.length) rules.speed = speed;
  if (languages.length) rules.languages = languages;
  if (defenses.length) rules.defenses = defenses;
  if (senses.length) rules.senses = senses;
  if (traits.length) rules.traits = traits;
  if (spells.length) rules.spells = spells;
  return rules;
}

function buildRaceFeatureGrants(entry, text, raceRules = {}) {
  const name = normalizeName(entry && entry.name);
  const clean = normalizeName(`${entry && entry.name || ''} ${text || ''}`);
  const grants = [];
  if (isFeatChoiceGrant(name, clean)) {
    grants.push(buildFeatChoiceGrant(inferRaceFeatureLevel(name, text)));
  }
  if (name === 'languages') grants.push(...(raceRules.languages || []));
  if (name === 'size') grants.push(...(raceRules.size || []));
  (raceRules.defenses || []).forEach(grant => {
    if (raceFeatureMatchesDefenseGrant(name, clean, grant)) grants.push(grant);
  });
  (raceRules.speed || []).forEach(grant => {
    if (raceFeatureMatchesSpeedGrant(name, clean, grant)) grants.push(grant);
  });
  (raceRules.senses || []).forEach(grant => {
    if (clean.includes(normalizeName(grant.sense || '')) || clean.includes('darkvision')) grants.push(grant);
  });
  (raceRules.traits || []).forEach(grant => {
    if (clean.includes(normalizeName(grant.name || grant.trait || ''))) grants.push(grant);
  });
  (raceRules.spells || []).forEach(grant => {
    const spellName = normalizeName(grant.spellName || grant.name || grant.spellId || '');
    if (spellName && clean.includes(spellName)) grants.push(normalizeFeatureSpellSlotFallback(grant, text));
  });
  return uniqueBy(grants, grantKey);
}

function isFeatChoiceGrant(name, clean) {
  return name === 'feat'
    || /\bgain (?:one|a|1) feat\b/i.test(clean || '')
    || /\bgain [a-z ]{0,80}feat of your choice\b/i.test(clean || '');
}

function buildFeatChoiceGrant(levelGate = 1) {
  return {
    type: 'feat',
    mode: 'choice',
    count: 1,
    optionSet: 'feats',
    levelGate: Number(levelGate) || 1,
    nonRemovable: true,
  };
}

function grantKey(grant) {
  return [
    grant && grant.type,
    grant && (grant.spellId || grant.featId || grant.spellName || grant.featName || grant.language || grant.skill || grant.tool || grant.weapon || grant.ability || grant.damageType || grant.movement || grant.sense || grant.name || grant.value || grant.optionSet),
    grant && (grant.levelGate || ''),
    grant && (grant.mode || grant.grantMode || ''),
    grant && (grant.count || ''),
  ].map(value => String(value || '').toLowerCase()).join(':');
}

function raceFeatureMatchesDefenseGrant(name, clean, grant) {
  const damageType = normalizeName(grant && (grant.damageType || grant.value));
  const defenseType = normalizeName(grant && grant.type);
  const defenseWords = ['resistance', 'immunity', 'vulnerability', 'defense', 'defenses'];
  if (!damageType) return false;
  const featureMentionsDefense = defenseWords.some(word => name.includes(word) || clean.includes(word));
  const featureMentionsDamage = name.includes(damageType) || clean.includes(`${damageType} damage`);
  return featureMentionsDefense && featureMentionsDamage;
}

function raceFeatureMatchesSpeedGrant(name, clean, grant) {
  if (name === 'speed') return true;
  const movement = normalizeName(grant && (grant.movement || grant.speedType));
  if (!movement) return false;
  if (!clean.includes('speed')) return false;
  const terms = {
    walk: ['walk', 'walking'],
    swim: ['swim', 'swimming'],
    climb: ['climb', 'climbing'],
    fly: ['fly', 'flying', 'flight'],
    burrow: ['burrow', 'burrowing'],
  }[movement] || [movement];
  return terms.some(term => clean.includes(term));
}

function normalizeFeatureSpellSlotFallback(grant, text) {
  if (!grant || grant.type !== 'spell' || normalizeName(grant.mode || grant.grantMode) !== 'feature cast') return grant;
  const next = { ...grant };
  if (featureTextAllowsSpellSlotFallback(text)) next.canUseSpellSlots = true;
  else delete next.canUseSpellSlots;
  return next;
}

function normalizeRaceAbilityGrants(ability) {
  const rows = Array.isArray(ability) ? ability : [];
  const out = [];
  rows.forEach(row => {
    if (!row || typeof row !== 'object') return;
    Object.entries(row).forEach(([abilityKey, value]) => {
      if (abilityKey === 'choose') {
        out.push({ type: 'ability-score', mode: 'choice', options: value });
      } else if (Number(value)) {
        out.push({ type: 'ability-score', ability: abilityKey, value: Number(value) });
      }
    });
  });
  return out;
}

function normalizeRaceSizeGrants(size) {
  const values = (Array.isArray(size) ? size : [size])
    .filter(Boolean)
    .map(value => String(value));
  if (values.length > 1) return [{ type: 'size', mode: 'choice', options: values }];
  return values.map(value => ({ type: 'size', value }));
}

function normalizeRaceSpeedGrants(speed) {
  if (!speed) return [];
  if (typeof speed === 'number') return [{ type: 'speed', movement: 'walk', value: speed }];
  if (typeof speed !== 'object') return [];
  return Object.entries(speed)
    .filter(([, value]) => value !== false && value !== null && value !== undefined && value !== '')
    .map(([movement, value]) => {
      const grant = {
        type: 'speed',
        movement,
        value: value === true ? 'walk' : value,
      };
      if (value === true) grant.equals = 'walk';
      return grant;
    });
}

function normalizeRaceLanguageGrants(languageProficiencies) {
  const out = [];
  (Array.isArray(languageProficiencies) ? languageProficiencies : []).forEach(row => {
    if (!row || typeof row !== 'object') return;
    Object.entries(row).forEach(([language, value]) => {
      if (language === 'choose') {
        out.push({ type: 'language', mode: 'choice', count: Number(value && value.count) || 1, options: value && value.from || [] });
      } else if (value) {
        out.push({ type: 'language', language: languageName(language) });
      }
    });
  });
  return out;
}

function normalizeRaceDefenseGrants(values, kind) {
  return (Array.isArray(values) ? values : [])
    .filter(Boolean)
    .map(value => ({ type: kind, damageType: String(value).toLowerCase() }));
}

function normalizeRaceSenseGrants(race) {
  const out = [];
  if (race && race.darkvision) out.push({ type: 'sense', sense: 'darkvision', range: Number(race.darkvision) || race.darkvision });
  return out;
}

function normalizeRaceTraitGrants(traitTags) {
  return (Array.isArray(traitTags) ? traitTags : [])
    .filter(Boolean)
    .map(name => ({ type: 'trait', name }));
}

function normalizeAdditionalSpellGrants(additionalSpells, race = null) {
  const out = [];
  const canUseSpellSlots = raceAllowsAdditionalSpellSlots(race);
  (Array.isArray(additionalSpells) ? additionalSpells : []).forEach(block => {
    const ability = normalizeSpellGrantAbility(block && block.ability);
    Object.entries(block && block.known || {}).forEach(([levelGate, spells]) => {
      normalizeSpellGrantSpellList(spells).forEach(ref => {
        out.push(formatAdditionalSpellGrant(ref, {
          mode: 'known',
          levelGate,
          ability,
          autoKnown: true,
          nonRemovable: true,
        }));
      });
    });
    collectInnateSpellRefs(block && block.innate, 1, '', null, canUseSpellSlots).forEach(row => {
      out.push(formatAdditionalSpellGrant(row.ref, {
        mode: 'feature-cast',
        levelGate: row.levelGate,
        ability,
        uses: row.uses,
        reset: row.reset,
        castLevel: row.ref.castLevel,
        consumesSlot: false,
        canUseSpellSlots: row.canUseSpellSlots,
        nonRemovable: true,
      }));
    });
  });
  return out.filter(Boolean);
}

function normalizeSpellGrantAbility(ability) {
  if (!ability) return {};
  if (typeof ability === 'string') return { ability };
  if (ability && Array.isArray(ability.choose)) return { abilityOptions: ability.choose };
  return {};
}

function collectInnateSpellRefs(innate, levelGate = 1, reset = '', uses = null, canUseSpellSlots = false) {
  const out = [];
  if (!innate) return out;
  if (Array.isArray(innate)) {
    normalizeSpellGrantSpellList(innate).forEach(ref => out.push({ ref, levelGate, reset, uses, canUseSpellSlots }));
    return out;
  }
  if (typeof innate !== 'object') return out;
  Object.entries(innate).forEach(([key, value]) => {
    if (/^\d+$/.test(key)) {
      out.push(...collectInnateSpellRefs(value, Number(key) || levelGate, reset, uses, canUseSpellSlots));
    } else if (key === 'daily') {
      Object.entries(value || {}).forEach(([count, spells]) => {
        normalizeSpellGrantSpellList(spells).forEach(ref => out.push({ ref, levelGate, reset: 'longRest', uses: Number(count) || 1, canUseSpellSlots }));
      });
    } else if (key === 'rest') {
      Object.entries(value || {}).forEach(([count, spells]) => {
        normalizeSpellGrantSpellList(spells).forEach(ref => out.push({ ref, levelGate, reset: 'shortRest', uses: Number(count) || 1, canUseSpellSlots }));
      });
    } else {
      out.push(...collectInnateSpellRefs(value, levelGate, reset, uses, canUseSpellSlots));
    }
  });
  return out;
}

function raceAllowsAdditionalSpellSlots(race) {
  if (!race) return false;
  return featureTextAllowsSpellSlotFallback(entriesToText(race.entries || []));
}

function featureTextAllowsSpellSlotFallback(text) {
  return /\b(?:using|with|expend(?:ing)?)\s+(?:any\s+)?spell slots?\b|\bspell slots? you have\b/i.test(String(text || ''));
}

function normalizeSpellGrantSpellList(value) {
  return (Array.isArray(value) ? value : [value])
    .map(parseSpellReference)
    .filter(ref => ref && ref.spellId);
}

function parseSpellReference(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const hashIndex = text.indexOf('#');
  const rawName = (hashIndex >= 0 ? text.slice(0, hashIndex) : text).split('|')[0].trim();
  const suffix = hashIndex >= 0 ? text.slice(hashIndex + 1).trim() : '';
  const castLevel = suffix === 'c' ? 0 : Number(suffix) || null;
  return {
    spellId: slugify(rawName),
    spellName: rawName,
    castLevel,
  };
}

function formatAdditionalSpellGrant(ref, options = {}) {
  if (!ref || !ref.spellId) return null;
  return {
    type: 'spell',
    spellId: ref.spellId,
    spellName: ref.spellName,
    mode: options.mode || 'granted',
    grantMode: options.mode || 'granted',
    levelGate: Number(options.levelGate) || 1,
    ...(ref.castLevel !== null && ref.castLevel !== undefined ? { castLevel: ref.castLevel } : {}),
    ...(options.castLevel !== null && options.castLevel !== undefined ? { castLevel: options.castLevel } : {}),
    ...(options.ability && options.ability.ability ? { ability: options.ability.ability } : {}),
    ...(options.ability && options.ability.abilityOptions ? { abilityOptions: options.ability.abilityOptions } : {}),
    ...(options.uses ? { uses: options.uses } : {}),
    ...(options.reset ? { reset: options.reset } : {}),
    ...(Object.prototype.hasOwnProperty.call(options, 'consumesSlot') ? { consumesSlot: Boolean(options.consumesSlot) } : {}),
    ...(options.canUseSpellSlots ? { canUseSpellSlots: true } : {}),
    ...(options.autoKnown ? { autoKnown: true } : {}),
    ...(options.nonRemovable ? { nonRemovable: true } : {}),
  };
}

function languageName(value) {
  return String(value || '').split(/[-_]/).map(capitalize).join(' ');
}

function inferRaceFeatureLevel(_name, text) {
  const opening = String(text || '').slice(0, 160);
  const match = opening.match(/^\s*(?:starting at|when you reach|at) (\d+)(?:st|nd|rd|th) level\b/i);
  return match ? Number(match[1]) || 1 : 1;
}

function sourcePriority(source) {
  const index = RACE_SOURCE_PRIORITY.indexOf(String(source || '').toUpperCase());
  return index === -1 ? RACE_SOURCE_PRIORITY.length : index;
}

function buildFeature(feature, kind) {
  if (!feature || !feature.name) return null;
  const text = cleanRulesText(entriesToText(feature.entries || []));
  const grants = buildFeatureGrants(feature, kind, text);
  return {
    id: slugify([kind, feature.className, feature.subclassShortName, feature.level, feature.name, feature.source].filter(Boolean).join('-')),
    kind,
    name: feature.name,
    className: feature.className || '',
    subclassName: feature.subclassName || '',
    subclassShortName: feature.subclassShortName || '',
    level: Number(feature.level) || 0,
    source: feature.source || '',
    text,
    timing: classifyTiming(`${feature.name} ${text}`),
    resourceHint: inferFeatureResourceHint(feature.name, text),
    ...(grants.length ? { grants } : {}),
  };
}

function buildFeatureGrants(feature, kind, text) {
  const name = normalizeName(feature && feature.name);
  const clean = normalizeName(`${feature && feature.name || ''} ${text || ''}`);
  const grants = [];
  if (kind === 'class' && name === 'ability score improvement') {
    grants.push({
      type: 'ability-score',
      mode: 'choice',
      optionSet: 'abilities-or-feat',
      count: 2,
      value: 1,
      levelGate: Number(feature && feature.level) || 1,
      featAlternative: true,
    });
  }
  if (isFeatChoiceGrant(name, clean)) {
    grants.push(buildFeatChoiceGrant(Number(feature && feature.level) || 1));
  }
  return uniqueBy(grants, grantKey);
}

function buildItem(row, itemOverrides = {}) {
  if (!row.Name) return null;
  let item = {
    id: slugify(row.Name),
    name: row.Name,
    source: row.Source || '',
    page: row.Page || '',
    rarity: cleanNone(row.Rarity || ''),
    type: cleanNone(row.Type || ''),
    attunement: cleanNone(row.Attunement || ''),
    damage: cleanNone(row.Damage || ''),
    properties: splitProperties(row.Properties || ''),
    mastery: cleanNone(row.Mastery || ''),
    weight: row.Weight || '',
    value: row.Value || '',
    text: cleanRulesText(row.Text || ''),
  };
  const override = getRuleOverride(item, itemOverrides).override;
  item = applyRuleOverride(item, pickBaseItemOverride(override));
  item.weapon = resolveWeaponOverride(item, override);
  item.resources = resolveItemRecordList(item, override, 'resources', inferItemResources(item));
  item.actions = resolveItemRecordList(item, override, 'actions', inferItemActions(item));
  item.effects = resolveItemRecordList(item, override, 'effects', inferItemEffects(item));
  item.toggles = resolveItemRecordList(item, override, 'toggles', []);
  return item;
}

function buildSpell(row) {
  if (!row.Name) return null;
  const text = cleanRulesText(row.Text || '');
  const higherLevels = cleanRulesText(row['At Higher Levels'] || '');
  return {
    id: slugify(row.Name),
    name: row.Name,
    source: row.Source || '',
    page: row.Page || '',
    level: row.Level || '',
    castingTime: row['Casting Time'] || '',
    duration: row.Duration || '',
    school: row.School || '',
    range: row.Range || '',
    components: row.Components || '',
    classes: row.Classes || '',
    optionalClasses: row['Optional/Variant Classes'] || '',
    subclasses: row.Subclasses || '',
    text,
    higherLevels,
    timing: classifyTiming(row['Casting Time'] || text),
    attackType: /\bspell attack\b/i.test(`${text} ${higherLevels}`) ? 'spellAttack' : '',
    saveAbility: inferSaveAbility(`${text} ${higherLevels}`),
    damage: inferDamage(`${text} ${higherLevels}`),
  };
}

function buildFeat(row) {
  if (!row.Name) return null;
  const text = cleanRulesText(row.Description || '');
  const grants = normalizeFeatAbilityGrants(row['Ability Scores'] || '');
  return {
    id: slugify(row.Name),
    name: row.Name,
    source: row.Source || '',
    page: row.Page || '',
    prerequisites: row.Prerequisites || '',
    abilityScores: row['Ability Scores'] || '',
    repeatable: row.Repeatable || '',
    text,
    timing: classifyTiming(text),
    origin: {
      type: 'feat-origin',
      source: row.Source || '',
      grants,
    },
    ...(grants.length ? { grants } : {}),
  };
}

function buildBackground(row) {
  if (!row.Name) return null;
  const text = cleanRulesText(row.Description || '');
  const benefits = extractBackgroundBenefits(text);
  const feature = extractBackgroundFeature(text);
  const grants = buildBackgroundGrants(benefits);
  return {
    id: slugify(row.Name),
    name: row.Name,
    aliases: buildBackgroundAliases(row.Name),
    source: row.Source || '',
    page: row.Page || '',
    skillProficiencies: benefits.skillProficiencies || '',
    toolProficiencies: benefits.toolProficiencies || '',
    languages: benefits.languages || '',
    equipment: benefits.equipment || '',
    featureName: feature.name || '',
    featureText: feature.text || '',
    text,
    timing: classifyTiming(feature.text || text),
    origin: {
      type: 'background-origin',
      source: row.Source || '',
      grants,
    },
    ...(grants.length ? { grants } : {}),
  };
}

function normalizeFeatAbilityGrants(text) {
  const clean = cleanRulesText(text || '');
  if (!clean) return [];
  const grants = [];
  const abilities = [
    ['str', 'Strength'],
    ['dex', 'Dexterity'],
    ['con', 'Constitution'],
    ['int', 'Intelligence'],
    ['wis', 'Wisdom'],
    ['cha', 'Charisma'],
  ];
  const mentioned = abilities
    .filter(([key, label]) => new RegExp(`\\b(?:${key}|${escapeRegExp(label)})\\b`, 'i').test(clean))
    .map(([key]) => key);
  const amount = Number((clean.match(/\+(\d+)/) || [])[1]) || 1;
  if (/choose|choice| or |\bone of\b|\bany\b/i.test(clean) && mentioned.length) {
    grants.push({ type: 'ability-score', mode: 'choice', options: mentioned, count: 1, value: amount, max: 20 });
  } else {
    mentioned.forEach(ability => grants.push({ type: 'ability-score', ability, value: amount, max: 20 }));
  }
  return uniqueBy(grants, grantKey);
}

function buildBackgroundGrants(benefits) {
  return uniqueBy([
    ...normalizeTextProficiencyGrants('skill', 'skill', benefits && benefits.skillProficiencies, 'skills'),
    ...normalizeTextProficiencyGrants('tool', 'tool', benefits && benefits.toolProficiencies, 'tools'),
    ...normalizeTextProficiencyGrants('language', 'language', benefits && benefits.languages, 'languages'),
  ], grantKey);
}

function normalizeTextProficiencyGrants(type, prop, text, optionSet) {
  const clean = cleanRulesText(text || '');
  if (!clean) return [];
  const count = parseChoiceCount(clean);
  if (/\b(?:of your choice|your choice|choose|any)\b/i.test(clean)) {
    return [{
      type,
      mode: 'choice',
      count,
      optionSet,
      levelGate: 1,
    }];
  }
  if (/\s+or\s+/i.test(clean)) {
    const options = splitProficiencyList(clean);
    if (options.length > 1) {
      return [{
        type,
        mode: 'choice',
        count: 1,
        options,
        optionSet,
        levelGate: 1,
      }];
    }
  }
  return splitProficiencyList(clean)
    .filter(value => value && !/\b(?:none|n\/a)\b/i.test(value))
    .map(value => ({ type, [prop]: normalizeGrantLabel(value), levelGate: 1 }));
}

function parseChoiceCount(text) {
  const lower = String(text || '').toLowerCase();
  const wordCounts = { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5 };
  const wordMatch = lower.match(/\b(one|a|an|two|three|four|five)\b/);
  if (wordMatch) return wordCounts[wordMatch[1]] || 1;
  const numberMatch = lower.match(/\b(\d+)\b/);
  return numberMatch ? Number(numberMatch[1]) || 1 : 1;
}

function splitProficiencyList(text) {
  return String(text || '')
    .replace(/\.$/, '')
    .split(/\s*,\s*|\s+and\s+|\s+or\s+/i)
    .map(part => part.trim())
    .filter(Boolean);
}

function normalizeGrantLabel(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function buildBackgroundAliases(name) {
  const aliases = [];
  const text = String(name || '');
  const variant = text.match(/^Variant\s+(.+?)\s*\((.+?)\)$/i);
  if (variant) {
    aliases.push(variant[1], variant[2]);
  }
  if (/archaeologist/i.test(text)) aliases.push(text.replace(/archaeologist/ig, 'Archeologist'));
  return aliases.filter(Boolean);
}

function extractBackgroundBenefits(text) {
  const sections = extractLabeledRuleSections(text, [
    'Skill Proficiencies',
    'Skill Proficiency',
    'Tool Proficiencies',
    'Tool Proficiency',
    'Languages',
    'Language',
    'Equipment',
    'Feature',
    'Distinctive Features',
    'Suggested Characteristics',
  ]);
  return {
    skillProficiencies: sections['skill proficiencies'] || sections['skill proficiency'] || '',
    toolProficiencies: sections['tool proficiencies'] || sections['tool proficiency'] || '',
    languages: sections.languages || sections.language || '',
    equipment: sections.equipment || '',
  };
}

function extractBackgroundFeature(text) {
  const sections = extractLabeledRuleSections(text, [
    'Feature',
    'Suggested Characteristics',
    'Personality Trait',
    'Ideal',
    'Bond',
    'Flaw',
  ]);
  const feature = cleanRulesText(sections.feature || '');
  if (!feature) return { name: '', text: '' };
  const marked = feature.match(/^(.{2,80}?)\s*(?:\[?[-–]\]?|:)\s*(.+)$/);
  if (marked) return { name: marked[1].trim(), text: marked[2].trim() };
  const naturalBreak = feature.match(/^([A-Z][A-Za-z0-9 '&-]{2,80}?)\s+(?=(?:As|When|While|You|Your|The|Though|If)\b)(.+)$/);
  if (naturalBreak) return { name: naturalBreak[1].trim(), text: naturalBreak[2].trim() };
  return { name: '', text: feature };
}

function extractLabeledRuleSections(text, labels) {
  const clean = cleanRulesText(text);
  const escaped = labels.map(label => escapeRegExp(label)).join('|');
  const pattern = new RegExp(`\\b(${escaped})\\s*(?::|\\.|\\[?[-–]\\]?)\\s*`, 'gi');
  const matches = [];
  let match;
  while ((match = pattern.exec(clean))) {
    matches.push({
      key: normalizeName(match[1]),
      start: match.index,
      bodyStart: pattern.lastIndex,
    });
  }
  const sections = {};
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const body = cleanRulesText(clean.slice(current.bodyStart, next ? next.start : clean.length));
    if (body && !sections[current.key]) sections[current.key] = body;
  }
  return sections;
}

function collectActions(features, items, spells, feats, backgrounds) {
  const actions = [];
  for (const feature of features) {
    const resource = inferFeatureResource(feature);
    const actionable = feature.timing && feature.timing !== 'Passive';
    const important = resource || feature.resourceHint || /\b(action|bonus action|reaction|turn undead|destroy undead|extra attack)\b/i.test(`${feature.name} ${feature.text}`);
    if (!actionable && !important) continue;
    actions.push({
      id: slugify(`feature-${feature.id}`),
      sourceType: feature.kind,
      sourceId: feature.id,
      group: feature.timing === 'Passive' ? 'Free / Utility' : feature.timing,
      type: getFeatureSourceLabel(feature),
      title: feature.name,
      detail: actionSummary(feature.text, 520),
      tags: [getFeatureSourceLabel(feature), feature.level ? `Level ${feature.level}` : '', feature.resourceHint || (resource && resource.name)].filter(Boolean),
    });
  }
  for (const item of items) actions.push(...(item.actions || []).map(action => ({ ...action, sourceType: 'item', sourceId: item.id, itemName: item.name })));
  for (const feat of feats) {
    if (feat.timing && feat.timing !== 'Passive') {
      actions.push({
        id: slugify(`feat-${feat.id}`),
        sourceType: 'feat',
        sourceId: feat.id,
        group: feat.timing,
        type: 'Feat',
        title: feat.name,
        detail: firstSentence(feat.text, 260),
        tags: ['Feat'],
      });
    }
  }
  for (const background of backgrounds) {
    if (background.timing && background.timing !== 'Passive') {
      actions.push({
        id: slugify(`background-${background.id}`),
        sourceType: 'background',
        sourceId: background.id,
        group: background.timing,
        type: 'Background',
        title: background.featureName || background.name,
        detail: actionSummary(background.featureText || background.text, 420),
        tags: ['Background', background.name].filter(Boolean),
      });
    }
  }
  for (const spell of spells) {
    actions.push({
      id: slugify(`spell-${spell.id}`),
      sourceType: 'spell',
      sourceId: spell.id,
      group: spell.timing,
      type: 'Spell',
      title: `Cast ${spell.name}`,
      detail: firstSentence(spell.text, 260),
      tags: [spell.level || 'Cantrip', spell.school, spell.attackType ? 'Spell attack' : '', spell.saveAbility ? `${spell.saveAbility.toUpperCase()} save` : ''].filter(Boolean),
    });
  }
  return uniqueBy(actions, action => action.id);
}

function getFeatureSourceLabel(feature) {
  if (feature.kind === 'race') return feature.raceName || feature.baseRaceName || 'Race';
  if (feature.kind === 'subclass') return feature.subclassShortName || feature.subclassName || feature.className || 'Subclass';
  if (feature.kind === 'class') return feature.className || 'Class';
  return feature.kind || 'Feature';
}

function collectEffects(features, items, feats, backgrounds) {
  const effects = [];
  for (const item of items) effects.push(...(item.effects || []).map(effect => ({ ...effect, sourceType: 'item', sourceId: item.id, itemName: item.name })));
  for (const feature of features) {
    if (/bonus|advantage|resistance|immune|proficiency|expertise|extra attack|fighting style/i.test(`${feature.name} ${feature.text}`)) {
      effects.push({
        id: slugify(`feature-effect-${feature.id}`),
        sourceType: feature.kind,
        sourceId: feature.id,
        kind: 'rules-text',
        name: feature.name,
        text: firstSentence(feature.text, 260),
      });
    }
  }
  for (const feat of feats) {
    if (/bonus|increase|advantage|proficiency|damage|attack/i.test(feat.text)) {
      effects.push({
        id: slugify(`feat-effect-${feat.id}`),
        sourceType: 'feat',
        sourceId: feat.id,
        kind: 'rules-text',
        name: feat.name,
        text: firstSentence(feat.text, 260),
      });
    }
  }
  for (const background of backgrounds) {
    if (/proficienc|language|equipment|feature/i.test(background.text)) {
      effects.push({
        id: slugify(`background-effect-${background.id}`),
        sourceType: 'background',
        sourceId: background.id,
        kind: 'rules-text',
        name: background.name,
        text: firstSentence(background.featureText || background.text, 260),
      });
    }
  }
  return uniqueBy(effects, effect => effect.id);
}

function collectResources(features, items, feats) {
  const resources = [];
  for (const feature of features) {
    const resource = inferFeatureResource(feature);
    if (resource) resources.push(resource);
  }
  for (const item of items) resources.push(...(item.resources || []).map(resource => ({ ...resource, sourceType: 'item', sourceId: item.id, itemName: item.name })));
  for (const feat of feats) {
    const resource = inferFeatResource(feat);
    if (resource) resources.push(resource);
  }
  resources.push(
    { id: 'hit-dice', name: 'Hit Dice', sourceType: 'core', maxFormula: 'level', reset: 'longRestHalf', text: 'Regain up to half your maximum hit dice after a long rest.' },
    { id: 'spell-slots', name: 'Spell Slots', sourceType: 'core', maxFormula: 'byClassLevel', reset: 'longRest', text: 'Spell slots are calculated from class level and reset on a long rest.' },
  );
  return uniqueBy(resources, resource => resource.id);
}

function inferWeapon(item) {
  const type = normalizeName(item.type);
  if (type.includes('armor') || type.includes('shield')) return null;
  const damage = parseDamage(item.damage);
  if (!type.includes('weapon') && !damage) return null;
  const propertiesText = item.properties.map(normalizeName).join(' ');
  const ranged = type.includes('ranged') || propertiesText.includes('ammunition');
  const martial = type.includes('martial');
  const finesse = propertiesText.includes('finesse');
  return {
    baseName: stripMagicPrefix(item.name),
    type: martial ? 'martial' : 'simple',
    style: ranged ? 'ranged' : 'melee',
    ability: ranged ? 'dex' : (finesse ? 'finesse' : 'str'),
    damage: damage ? damage.dice : '',
    damageType: damage ? damage.type : '',
    properties: item.properties,
    range: parseRange(item.properties.join(', ')),
    versatileDamage: parseVersatileDamage(item.properties),
    magicBonus: parseMagicBonus(item.name, item.text),
  };
}

function inferItemActions(item) {
  const actions = [];
  for (const ability of extractNamedAbilities(item.text)) {
    if (!/(action|bonus action|reaction|before determining|when you|whenever you|expend|charge)/i.test(ability.text)) continue;
    actions.push({
      id: slugify(ability.name || item.name),
      group: classifyTiming(ability.text),
      type: 'Item',
      title: ability.name || item.name,
      detail: ability.text,
      tags: [item.attunement ? 'Attunement' : '', inferUsesTag(ability.text)].filter(Boolean),
    });
  }
  if (!actions.length && shouldInferFallbackItemAction(item)) {
    const detail = actionTextSummary(item.text, 420);
    actions.push({
      id: slugify(item.name),
      group: classifyTiming(detail || item.text),
      type: 'Item',
      title: item.name,
      detail,
      tags: [item.attunement ? 'Attunement' : '', inferUsesTag(item.text)].filter(Boolean),
    });
  }
  return actions;
}

function shouldInferFallbackItemAction(item) {
  const text = cleanRulesText(item.text || '');
  if (!hasDirectItemActivationTiming(text)) return false;

  // Weapon property text can mention actions without granting a unique item power.
  // Example: Loading says "when you use an action, bonus action, or reaction to fire it".
  if (item.weapon && !hasSpecificWeaponActivation(text)) return false;

  return true;
}

function hasSpecificWeaponActivation(text) {
  const cleaned = cleanRulesText(text)
    .replace(/\bBecause of the time required to load this weapon, you can fire only one piece of ammunition from it when you use an action, bonus action, or reaction to fire it, regardless of the number of attacks you can normally make\.\s*/ig, '')
    .replace(/\bAt the end of the battle, you can recover half your expended ammunition by taking a minute to search the battlefield\.\s*/ig, '');
  return hasDirectItemActivationTiming(cleaned);
}

function hasDirectItemActivationTiming(text) {
  const clean = cleanRulesText(text || '');
  return /\bas (?:an?|your|its|their) (?:action|bonus action|reaction)\b/i.test(clean)
    || /\b(?:can|may)\s+use\s+(?:an?|your|its|their)\s+(?:action|bonus action|reaction)\b/i.test(clean)
    || /\buse\s+(?:an?|your|its|their)\s+(?:action|bonus action|reaction)\s+to\b/i.test(clean)
    || /\b(?:can|may)\s+take\s+(?:an?|your|its|their)\s+(?:action|bonus action|reaction)\b/i.test(clean)
    || /\brequires (?:an?|your|its|their) action\b/i.test(clean);
}

function inferItemResources(item) {
  const resources = [];
  const charges = item.text.match(/\bhas (\d+) charges\b/i);
  if (charges) {
    resources.push({ id: `${item.id}-charges`, name: `${item.name} Charges`, max: Number(charges[1]), reset: inferReset(item.text), text: firstSentence(item.text, 220) });
  }
  for (const ability of extractNamedAbilities(item.text)) {
    const uses = ability.text.match(/\((\d+)\/day\)/i) || ability.text.match(/\b(\d+)\/day\b/i);
    if (uses) resources.push({ id: slugify(ability.name), name: ability.name, max: Number(uses[1]), reset: 'longRest', text: ability.text });
    if (!uses && /\bonce (?:this|the) (?:action|property|benefit|feature) is used,? it can't be used again until (?:the )?next dawn\b/i.test(ability.text)) {
      resources.push({ id: slugify(ability.name), name: ability.name, max: 1, reset: 'dawn', text: ability.text });
    }
  }
  return resources;
}

function inferItemEffects(item) {
  const effects = [];
  if (item.weapon && item.weapon.magicBonus) {
    effects.push({ id: `${item.id}-magic-weapon-bonus`, kind: 'weapon-bonus', name: 'Magic weapon bonus', value: item.weapon.magicBonus, text: `${formatBonus(item.weapon.magicBonus)} to attack and damage rolls with this weapon.` });
  }
  if (/advantage on initiative/i.test(item.text)) {
    effects.push({ id: `${item.id}-initiative-advantage`, kind: 'advantage', target: 'initiative', name: 'Initiative advantage', text: 'Advantage on initiative rolls while carried/worn as described.' });
  }
  if (/resistance to ([a-z]+) damage/i.test(item.text)) {
    const match = item.text.match(/resistance to ([a-z]+) damage/i);
    effects.push({ id: `${item.id}-${match[1]}-resistance`, kind: 'resistance', target: match[1], name: `${capitalize(match[1])} resistance`, text: firstSentence(item.text, 220) });
  }
  return effects;
}

function inferFeatureResource(feature) {
  const hint = inferFeatureResourceHint(feature.name, feature.text);
  const common = {
    sourceType: feature.kind,
    sourceId: feature.id,
    className: feature.className,
    subclassName: feature.subclassShortName || feature.subclassName,
    raceName: feature.raceName || '',
    source: feature.source || '',
    text: firstSentence(feature.text, 240),
  };
  if (!hint) {
    const abilityUses = feature.text.match(/number of times equal to your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier \(a minimum of once\).*?regain all expended uses when you finish a (short|long) rest/i);
    if (!abilityUses) return inferLimitedFeatureResource(feature, common);
    const ability = abilityUses[1].slice(0, 3).toLowerCase();
    return {
      id: feature.id,
      name: feature.name,
      maxFormula: `${ability}Mod`,
      reset: `${abilityUses[2].toLowerCase()}Rest`,
      ...common,
    };
  }
  if (hint === 'Channel Divinity') return { id: 'cleric-channel-divinity', name: 'Channel Divinity', maxFormula: 'clericChannelDivinityUses(level)', reset: 'shortRest', ...common };
  if (hint === 'Bardic Inspiration') return { id: 'bardic-inspiration', name: 'Bardic Inspiration', maxFormula: 'max(1, chaMod)', reset: 'longRestUntilFontOfInspirationThenShortRest', ...common };
  if (hint === 'Ki') return { id: 'monk-ki', name: 'Ki', maxFormula: 'level', reset: 'shortRest', ...common };
  if (hint === 'Wild Shape') return { id: 'druid-wild-shape', name: 'Wild Shape', max: 2, reset: 'shortRest', ...common };
  if (hint === 'Rage') return { id: 'barbarian-rage', name: 'Rage', maxFormula: 'barbarianRages(level)', reset: 'longRest', ...common };
  if (hint === 'Sorcery Points') return { id: 'sorcery-points', name: 'Sorcery Points', maxFormula: 'level', reset: 'longRest', ...common };
  if (hint === 'Lay on Hands') return { id: 'lay-on-hands', name: 'Lay on Hands', maxFormula: 'level * 5', reset: 'longRest', ...common };
  if (hint === 'Action Surge') return { id: 'action-surge', name: 'Action Surge', maxFormula: 'level >= 17 ? 2 : 1', reset: 'shortRest', ...common };
  if (hint === 'Second Wind') return { id: 'second-wind', name: 'Second Wind', max: 1, reset: 'shortRest', ...common };
  if (hint === 'Portent') return { id: 'wizard-portent', name: 'Portent', maxFormula: 'level >= 14 ? 3 : 2', reset: 'longRest', ...common };
  return null;
}

function inferFeatResource(feat) {
  const text = cleanRulesText(feat && feat.text || '');
  if (!feat || !text) return null;
  const common = {
    sourceType: 'feat',
    sourceId: feat.id,
    source: feat.source || '',
    text: firstSentence(text, 240),
  };
  const luck = text.match(/\b(\d+)\s+luck points?\b/i);
  if (luck || normalizeName(feat.name) === 'lucky') {
    return {
      id: 'feat-lucky-luck-points',
      name: 'Luck Points',
      max: luck ? Number(luck[1]) || 3 : 3,
      reset: 'longRest',
      ...common,
    };
  }
  return inferLimitedFeatureResource({ ...feat, kind: 'feat', text }, common);
}

function inferLimitedFeatureResource(feature, common) {
  const text = cleanRulesText(feature.text || '');
  const normalized = normalizeName(text);
  const reset = inferLimitedFeatureResetFromText(text);
  if (!reset) return null;
  const limited = /\b(can t|cannot) (?:use|cast|do so|activate)[a-z0-9 ]{0,180}\bagain until\b/.test(normalized)
    || /\bonce (?:you|this|the)[^.]{0,180}\b(?:use|used|cast|casts)\b/.test(normalized)
    || /\bregain (?:the )?ability [^.]{0,180}\bwhen you finish\b/.test(normalized)
    || /\bregain all expended uses when you finish\b/.test(normalized);
  if (!limited) return null;
  return {
    id: feature.id,
    name: feature.name,
    max: inferLimitedFeatureMax(text),
    reset,
    ...common,
  };
}

function inferLimitedFeatureResetFromText(text) {
  const clean = cleanRulesText(text || '');
  const resetPhrases = [
    /\b(?:can't|cannot) (?:use|cast|do so|activate)[^.]{0,220}\bagain until you (?:finish|complete) a (short or long|short|long) rest\b/i,
    /\bregain (?:all expended uses|the ability)[^.]{0,220}\bwhen you finish a (short or long|short|long) rest\b/i,
    /\bonce [^.]{0,220}\b(?:can't|cannot) [^.]{0,220}\bagain until you (?:finish|complete) a (short or long|short|long) rest\b/i,
  ];
  for (const pattern of resetPhrases) {
    const match = clean.match(pattern);
    if (match) return inferLimitedFeatureReset(match[1]);
  }
  if (/\b(?:can't|cannot) [^.]{0,220}\bagain until (?:the )?next dawn\b/i.test(clean)) return 'dawn';
  return '';
}

function inferLimitedFeatureMax(text) {
  const uses = String(text || '').match(/\b(\d+) times\b/i) || String(text || '').match(/\b(\d+)\/day\b/i);
  return uses ? Number(uses[1]) || 1 : 1;
}

function inferLimitedFeatureReset(restText) {
  const clean = normalizeName(restText);
  if (clean.includes('short')) return 'shortRest';
  if (clean.includes('dawn')) return 'dawn';
  return 'longRest';
}

function inferFeatureResourceHint(name, text) {
  const haystack = normalizeName(`${name} ${text}`);
  if (haystack.includes('channel divinity')) return 'Channel Divinity';
  if (haystack.includes('bardic inspiration')) return 'Bardic Inspiration';
  if (haystack === 'ki' || haystack.includes(' ki point')) return 'Ki';
  if (haystack.includes('wild shape')) return 'Wild Shape';
  if (/\brages?\b|\braging\b/.test(haystack)) return 'Rage';
  if (haystack.includes('sorcery points')) return 'Sorcery Points';
  if (haystack.includes('lay on hands')) return 'Lay on Hands';
  if (haystack.includes('action surge')) return 'Action Surge';
  if (haystack.includes('second wind')) return 'Second Wind';
  if (haystack.includes('portent')) return 'Portent';
  return '';
}

function classifyTiming(text) {
  const clean = normalizeName(text);
  if (hasBonusActionTiming(clean)) return 'Bonus Action';
  if (hasActionTiming(clean)) return 'Action';
  if (hasReactionTiming(clean)) return 'Reaction';
  if (clean.includes('when you') || clean.includes('whenever you') || clean.includes('before determining') || clean.includes('on a hit')) return 'Triggered';
  if (clean.includes('minute') || clean.includes('hour') || clean.includes('ritual')) return 'Out of Combat';
  return 'Passive';
}

function hasBonusActionTiming(clean) {
  return /\b(as a bonus action|use a bonus action|use your bonus action|uses a bonus action|bonus action to|take a bonus action)\b/.test(clean)
    || /\bbonus action\s+(?:\d+|pb|proficiency|at will|once|per|short|long|recharge|charges?)\b/.test(clean)
    || clean === 'bonus action'
    || clean === '1 bonus action';
}

function hasActionTiming(clean) {
  return /\b(as an action|use an action|use your action|uses an action|spend an action|take an action|you can take the action|action to|requires an action|requires your action)\b/.test(clean)
    || /\baction\s+(?:\d+|pb|proficiency|at will|once|per|short|long|recharge|charges?)\b/.test(clean)
    || clean === 'action'
    || clean === '1 action';
}

function hasReactionTiming(clean) {
  return /\b(as a reaction|use a reaction|use your reaction|uses its reaction|using your reaction|spend your reaction|take a reaction|reaction to)\b/.test(clean)
    || /\breaction\s+(?:\d+|pb|proficiency|at will|once|per|short|long|recharge|charges?)\b/.test(clean)
    || clean === 'reaction'
    || clean === '1 reaction';
}

function extractNamedAbilities(text) {
  const out = [];
  const cleaned = cleanRulesText(text);
  const pattern = /(?:^|\s-\s*)([A-Z][A-Za-z0-9 '\-]+?)\s*\(([^)]*)\):\s*([\s\S]*?)(?=\s-\s*[A-Z][A-Za-z0-9 '\-]+?\s*\([^)]*\):|$)/g;
  let match;
  while ((match = pattern.exec(cleaned))) {
    out.push({ name: match[1].trim(), text: `${match[1].trim()} (${match[2].trim()}): ${match[3].trim()}` });
  }
  out.push(...extractHeadingAbilities(cleaned));
  return uniqueBy(out, ability => `${normalizeName(ability.name)}:${normalizeName(ability.text)}`);
}

function extractHeadingAbilities(text) {
  const out = [];
  const candidates = [];
  const pattern = /(?:^|\s)([A-Z][A-Za-z0-9 '&'\-]+?)\.\s+/g;
  let match;
  while ((match = pattern.exec(text))) {
    const name = match[1].trim();
    if (!isLikelyItemAbilityHeadingName(name)) continue;
    const leadingWhitespace = (match[0].match(/^\s*/) || [''])[0].length;
    candidates.push({
      name,
      headingStart: match.index + leadingWhitespace,
      bodyStart: match.index + match[0].length,
    });
  }
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const next = candidates[index + 1];
    const body = trimGenericWeaponPropertyTail(text.slice(candidate.bodyStart, next ? next.headingStart : text.length).trim());
    if (!isActionableAbilityBody(body)) continue;
    out.push({ name: candidate.name, text: `${candidate.name}: ${body}` });
  }
  return out;
}

function isLikelyItemAbilityHeadingName(name) {
  if (!name) return false;
  if (name.length > 48 || name.split(/\s+/).length > 6) return false;
  if (/^(AC|Armor Class|Awakened|Curse|Dormant|Exalted|Personality|Sentience|Weapons Galore|After\b.*|At\b.*|If\b.*|In\b.*|Once\b.*|When\b.*|While\b.*)$/i.test(name)) return false;
  if (isGenericWeaponPropertySentence(`${name}.`)) return false;
  return /^[A-Z][A-Za-z0-9&'\-]*(?:\s+(?:[A-Z][A-Za-z0-9&'\-]*|of|the|and|to|with|in|from))*$/.test(name);
}

function isActionableAbilityBody(body) {
  if (!body || !/[a-z]/.test(body)) return false;
  const opening = body.slice(0, 320);
  return /^(?:You (?:can|may)|As (?:an?|your|its|their) (?:action|bonus action|reaction)|When you|Whenever you|If you|A creature (?:can|may)|Creatures (?:can|may)|At [^.]{1,80}\byou (?:can|may)|While (?:wearing|holding|wielding|attuned)[^.]{0,180}\byou (?:can|may)|(?:The|This) [^.]{1,80}\bhas \d+ charges?)\b/i.test(opening);
}

function trimGenericWeaponPropertyTail(text) {
  const sentences = cleanRulesText(text).match(/[^.!?]+[.!?]+/g) || [cleanRulesText(text)];
  const out = [];
  for (const sentence of sentences) {
    if (out.length && isGenericWeaponPropertySentence(sentence)) break;
    out.push(sentence);
  }
  return stripInlineGenericWeaponPropertyTail(out.join(' ').trim());
}

function stripInlineGenericWeaponPropertyTail(text) {
  return String(text || '').replace(/\s+(?:Ammunition Type|Capacity):\s.*$/i, '').trim();
}

function normalizeItemRecords(records, itemId) {
  return (records || []).map(record => ({
    ...record,
    id: slugify(`${itemId}-${record.id || record.name || record.title || record.label || record.kind || 'rule'}`),
  }));
}

function entriesToText(entries) {
  if (!entries) return '';
  if (typeof entries === 'string') return cleanTaggedText(entries);
  if (Array.isArray(entries)) return entries.map(entriesToText).filter(Boolean).join(' ');
  if (typeof entries !== 'object') return '';
  const parts = [];
  if (entries.name) parts.push(`${entries.name}:`);
  if (entries.entries) parts.push(entriesToText(entries.entries));
  if (entries.items) parts.push(entriesToText(entries.items));
  if (entries.rows) parts.push(entriesToText(entries.rows));
  if (entries.caption) parts.unshift(entries.caption);
  return parts.filter(Boolean).join(' ');
}

function getCasterProgression(cls) {
  const text = JSON.stringify(cls.classFeatures || []);
  if (/Pact Magic/.test(text)) return 'pact';
  if (/Spellcasting/.test(text)) {
    if (/Paladin|Ranger/.test(cls.name)) return 'half';
    return 'full';
  }
  return '';
}

function parseCsv(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map(values => {
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;
  const source = String(text || '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (inQuotes && source[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      row.push(current.trim());
      if (row.some(field => field.trim())) rows.push(row);
      row = [];
      current = '';
      if (char === '\r' && source[index + 1] === '\n') index += 1;
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(field => field.trim())) rows.push(row);
  return rows;
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

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function writeRulesJson(filename, data) {
  fs.mkdirSync(RULES_OUT, { recursive: true });
  const file = path.join(RULES_OUT, filename);
  const content = JSON.stringify(data, null, 2) + '\n';
  if (CHECK_ONLY) {
    const existing = readIfExists(file);
    if (existing !== content) {
      console.error(`${relative(process.cwd(), file)} is out of date. Run npm run rules:import.`);
      process.exitCode = 1;
    }
    return;
  }
  fs.writeFileSync(file, content, 'utf8');
}

function loadRuleOverrides() {
  const fallback = normalizeRuleOverrides(DEFAULT_RULE_OVERRIDES);
  const text = readIfExists(RULE_OVERRIDES_JSON);
  if (!text.trim()) return fallback;
  try {
    return normalizeRuleOverrides(deepMerge(fallback, JSON.parse(text)));
  } catch (error) {
    console.warn(`Could not parse ${relative(process.cwd(), RULE_OVERRIDES_JSON)}: ${error.message}. Using built-in rule overrides.`);
    return fallback;
  }
}

function normalizeRuleOverrides(overrides) {
  const out = { schemaVersion: Number(overrides && overrides.schemaVersion) || 1 };
  for (const collection of RULE_OVERRIDE_COLLECTIONS) {
    out[collection] = isPlainObject(overrides && overrides[collection]) ? overrides[collection] : {};
  }
  return out;
}

function countRuleOverrides(overrides) {
  const counts = {};
  for (const collection of RULE_OVERRIDE_COLLECTIONS) {
    counts[collection] = Object.keys((overrides && overrides[collection]) || {}).length;
  }
  return counts;
}

function applyCollectionOverrides(records, overrides, options = {}) {
  if (!isPlainObject(overrides) || !Object.keys(overrides).length) return records;
  const matchedKeys = new Set();
  const out = [];
  for (const record of records) {
    const match = getRuleOverride(record, overrides, options);
    for (const key of match.keys) matchedKeys.add(key);
    if (match.override.hidden || match.override.remove) continue;
    out.push(applyRuleOverride(record, match.override));
  }
  for (const [key, override] of Object.entries(overrides)) {
    if (matchedKeys.has(key) || !isPlainObject(override) || (!override.add && !override.create)) continue;
    if (override.hidden || override.remove) continue;
    out.push(applyRuleOverride({ id: slugify(override.id || key), name: override.name || override.title || key }, override));
  }
  return out;
}

function getRuleOverride(record, overrides, options = {}) {
  const keys = buildOverrideCandidateKeys(record);
  let override = {};
  const matched = [];
  for (const key of keys) {
    if (!hasOwn(overrides, key)) continue;
    matched.push(key);
    override = deepMerge(override, overrides[key]);
  }
  if (options.allowFuzzy) {
    for (const [rawKey, value] of Object.entries(overrides || {})) {
      if (matched.includes(rawKey)) continue;
      const key = slugify(rawKey);
      if (!keys.some(candidate => {
        const clean = slugify(candidate);
        return clean && key && (clean.endsWith(`-${key}`) || key.endsWith(`-${clean}`));
      })) continue;
      matched.push(rawKey);
      override = deepMerge(override, value);
    }
  }
  return { override, keys: matched };
}

function buildOverrideCandidateKeys(record) {
  const seen = new Set();
  const keys = [];
  const add = value => {
    const text = String(value || '').trim();
    if (!text) return;
    for (const candidate of [text, slugify(text), normalizeName(text)]) {
      if (candidate && !seen.has(candidate)) {
        seen.add(candidate);
        keys.push(candidate);
      }
    }
  };
  add(record.name);
  add(record.title);
  add(record.itemName);
  add(record.sourceId);
  add(record.id);
  return keys;
}

function pickBaseItemOverride(override) {
  const derived = new Set(['weapon', 'resources', 'actions', 'effects', 'toggles']);
  return Object.fromEntries(Object.entries(override || {}).filter(([key]) => !derived.has(key)));
}

function resolveWeaponOverride(item, override) {
  if (hasOwn(override, 'weapon')) {
    if (override.weapon === false || override.weapon === null) return null;
    if (isPlainObject(override.weapon)) return cloneJson(override.weapon);
    if (override.weapon === true) return inferWeapon(item);
  }
  return inferWeapon(item);
}

function resolveItemRecordList(item, override, key, inferredRecords) {
  const inferred = normalizeItemRecords(inferredRecords, item.id);
  if (!hasOwn(override, key)) return inferred;
  const overrideValue = override[key];
  if (overrideValue === false || overrideValue === null) return [];
  if (Array.isArray(overrideValue)) return normalizeItemRecords(overrideValue, item.id);
  if (isPlainObject(overrideValue)) return addMissingItemRecords(item, key, applyCollectionOverrides(inferred, overrideValue, { allowFuzzy: true }), overrideValue);
  return inferred;
}

function addMissingItemRecords(item, kind, records, overrides) {
  const out = [...records];
  for (const [key, override] of Object.entries(overrides)) {
    if (!isPlainObject(override) || override.hidden || override.remove) continue;
    if (out.some(record => getRuleOverride(record, { [key]: override }, { allowFuzzy: true }).keys.length)) continue;
    out.push(applyRuleOverride(buildItemRecordSeed(item, kind, key, override), override));
  }
  return out;
}

function buildItemRecordSeed(item, kind, key, override) {
  const label = override.name || override.title || override.label || key;
  const seed = { id: slugify(`${item.id}-${override.id || key}`) };
  if (kind === 'actions') {
    seed.group = 'Free / Utility';
    seed.type = 'Item';
    seed.title = label;
    seed.detail = override.detail || '';
  } else if (kind === 'resources') {
    seed.name = label;
    seed.max = 1;
    seed.reset = 'manual';
  } else if (kind === 'toggles') {
    seed.label = label;
    seed.timing = 'manual';
  } else {
    seed.name = label;
  }
  return seed;
}

function applyRuleOverride(record, override) {
  if (!isPlainObject(override) || !Object.keys(override).length) return cloneJson(record);
  const out = cloneJson(record);
  for (const [key, value] of Object.entries(override)) {
    if (isOverrideControlKey(key)) continue;
    if (key === 'appendTags') {
      out.tags = uniqueStrings([...(Array.isArray(out.tags) ? out.tags : []), ...toStringArray(value)]);
      continue;
    }
    if (key === 'removeTags') {
      const remove = new Set(toStringArray(value).map(normalizeName));
      out.tags = (Array.isArray(out.tags) ? out.tags : []).filter(tag => !remove.has(normalizeName(tag)));
      continue;
    }
    if (key === 'weapon' && (value === false || value === null)) {
      out.weapon = null;
      continue;
    }
    if (isPlainObject(out[key]) && isPlainObject(value)) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = cloneJson(value);
    }
  }
  return out;
}

function isOverrideControlKey(key) {
  return ['hidden', 'remove', 'add', 'create', 'note', 'notes'].includes(key);
}

function deepMerge(base, patch) {
  if (!isPlainObject(base)) return cloneJson(patch);
  if (!isPlainObject(patch)) return cloneJson(patch);
  const out = cloneJson(base);
  for (const [key, value] of Object.entries(patch)) {
    out[key] = isPlainObject(out[key]) && isPlainObject(value) ? deepMerge(out[key], value) : cloneJson(value);
  }
  return out;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  for (const value of toStringArray(values)) {
    const key = normalizeName(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function toStringArray(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : (value ? [String(value)] : []);
}

function buildReport(data) {
  return {
    generatedAtUtc: data.manifest.generatedAtUtc,
    warnings: [],
    canonicalRuntimeFiles: [
      'classes.json',
      'subclasses.json',
      'races.json',
      'features.json',
      'items.json',
      'spells.json',
      'feats.json',
      'backgrounds.json',
      'actions.json',
      'effects.json',
      'resources.json',
    ],
    note: '5etools and CSV files were import inputs only. The website should consume the canonical JSON files in this directory.',
  };
}

function parseDamage(value) {
  const match = String(value || '').match(/(\d+d\d+|\d+)\s*([a-z]+)?/i);
  return match ? { dice: match[1], type: match[2] || '' } : null;
}

function inferDamage(text) {
  const match = String(text || '').match(/(\d+d\d+)\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)/i);
  return match ? { dice: match[1], damageType: match[2].toLowerCase() } : null;
}

function inferSaveAbility(text) {
  const match = String(text || '').match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/i);
  return match ? match[1].slice(0, 3).toLowerCase() : '';
}

function inferUsesTag(text) {
  const match = String(text || '').match(/\b(\d+)\/day\b/i) || String(text || '').match(/\b(\d+) charges?\b/i);
  return match ? `${match[1]} use${Number(match[1]) === 1 ? '' : 's'}` : '';
}

function inferReset(text) {
  if (/short rest/i.test(text)) return 'shortRest';
  if (/long rest/i.test(text)) return 'longRest';
  if (/daily at dawn/i.test(text)) return 'dawn';
  return 'manual';
}

function parseRange(text) {
  const match = String(text || '').match(/\((\d+)\/(\d+)/);
  return match ? `${match[1]}/${match[2]}` : '';
}

function parseVersatileDamage(properties) {
  const match = String((properties || []).join(', ')).match(/versatile\s*\((\d+d\d+)\)/i);
  return match ? match[1] : '';
}

function parseMagicBonus(name, text) {
  const nameMatch = String(name || '').match(/^\+(\d+)/);
  if (nameMatch) return Number(nameMatch[1]);
  const textMatch = String(text || '').match(/\+(\d+) bonus to attack and damage/i);
  return textMatch ? Number(textMatch[1]) : 0;
}

function splitProperties(value) {
  return String(value || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.replace(/\s+/g, ' '));
}

function stripMagicPrefix(name) {
  return String(name || '').replace(/^\+\d+\s+/, '');
}

function cleanRulesText(value) {
  return cleanTaggedText(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([a-z0-9.)])([A-Z])/g, '$1 $2')
    .trim();
}

function cleanTaggedText(value) {
  return String(value || '')
    .replace(/{@spell ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/{@item ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/{@condition ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/{@status ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/{@dice ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/{@damage ([^}|]+)(?:\|[^}]*)?}/g, '$1')
    .replace(/{@hit ([^}]+)}/g, '+$1')
    .replace(/{@dc ([^}]+)}/g, 'DC $1')
    .replace(/{@filter ([^}|]+)[^}]*}/g, '$1')
    .replace(/{@[^ ]+ ([^}|]+)(?:\|[^}]*)?}/g, '$1');
}

function cleanNone(value) {
  const text = String(value || '').trim();
  return /^none$/i.test(text) ? '' : text;
}

function firstSentence(text, maxLength) {
  const clean = cleanRulesText(text);
  const sentence = (clean.match(/[^.!?]+[.!?]+/) || [clean])[0] || '';
  if (sentence.length <= maxLength) return sentence;
  return `${sentence.slice(0, maxLength - 1).trim()}...`;
}

function actionSummary(text, maxLength) {
  const clean = cleanRulesText(text);
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  let out = '';
  let count = 0;
  for (const sentence of sentences) {
    const next = `${out} ${sentence}`.trim();
    if (next.length > maxLength) break;
    out = next;
    count += 1;
    if (count >= 3 && /\b(action|bonus action|reaction|when|whenever|save|saving throw|damage|roll|use)\b/i.test(out)) break;
  }
  if (!out) out = clean.slice(0, maxLength - 1).trim();
  out = stripInlineGenericWeaponPropertyTail(out);
  return out.length <= maxLength ? out : `${out.slice(0, maxLength - 1).trim()}...`;
}

function actionTextSummary(text, maxLength) {
  const clean = cleanRulesText(text);
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  const start = sentences.findIndex(isItemActionSummaryStart);
  const source = start >= 0 ? sentences.slice(start) : sentences;
  let out = '';
  for (const sentence of source) {
    if (out && isGenericWeaponPropertySentence(sentence)) break;
    const next = `${out} ${sentence}`.trim();
    if (next.length > maxLength) break;
    out = next;
    if (out.length >= 220 && /\b(action|bonus action|reaction|charge|command word|save|damage|use)\b/i.test(out)) break;
  }
  if (!out) out = clean.slice(0, maxLength - 1).trim();
  out = stripInlineGenericWeaponPropertyTail(out);
  return out.length <= maxLength ? out : `${out.slice(0, maxLength - 1).trim()}...`;
}

function isItemActionSummaryStart(sentence) {
  if (hasDirectItemActivationTiming(sentence)) return true;
  if (/\b(command word|charges?)\b/i.test(sentence)) return true;
  return /\bexpend\b/i.test(sentence) && !/\bammunition\b/i.test(sentence);
}

function isGenericWeaponPropertySentence(sentence) {
  return /^(Ammunition|Capacity|Finesse|Heavy|Hidden|Light|Loading|Monk Weapon|Range|Reach|Reload|Special|Thrown|Two-Handed|Versatile)\.$/i.test(String(sentence || '').trim());
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function byName(a, b) {
  return String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''));
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'rule';
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatBonus(value) {
  const num = Number(value) || 0;
  return num >= 0 ? `+${num}` : String(num);
}

function capitalize(value) {
  const text = String(value || '');
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

function relative(from, to) {
  return path.relative(from, to).replace(/\\/g, '/');
}

main();
