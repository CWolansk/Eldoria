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
const CHECK_ONLY = process.argv.includes('--check');
const RACE_SOURCE_PRIORITY = ['PHB', 'VGM', 'EEPC', 'DMG', 'XGE', 'TCE', 'SCAG', 'MPMM'];
const IGNORED_RACE_TRAIT_NAMES = new Set(['Age', 'Alignment', 'Names', 'Height and Weight']);

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
};

function main() {
  const classesAndFeatures = importClasses();
  const racesAndFeatures = importRaces();
  const features = [...classesAndFeatures.features, ...racesAndFeatures.features].sort((a, b) => `${a.kind} ${a.className || a.raceName || ''} ${a.level || 0} ${a.name}`.localeCompare(`${b.kind} ${b.className || b.raceName || ''} ${b.level || 0} ${b.name}`));
  const items = parseCsv(readIfExists(ITEMS_CSV)).map(buildItem).filter(Boolean).sort(byName);
  const spells = parseCsv(readIfExists(SPELLS_CSV)).map(buildSpell).filter(Boolean).sort(byName);
  const feats = parseCsv(readIfExists(FEATS_CSV)).map(buildFeat).filter(Boolean).sort(byName);
  const backgrounds = parseCsv(readIfExists(BACKGROUNDS_CSV)).map(buildBackground).filter(Boolean).sort(byName);
  const actions = collectActions(features, items, spells, feats, backgrounds).sort(byName);
  const effects = collectEffects(features, items, feats, backgrounds).sort(byName);
  const resources = collectResources(features, items, feats).sort(byName);
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

function importRaces() {
  const races = [];
  const features = [];
  if (!fs.existsSync(RACES_JSON)) return { races, features };

  const data = readJson(RACES_JSON);
  for (const race of data.race || []) {
    const record = buildRaceRecord(race, false);
    if (!record) continue;
    races.push(record);
    features.push(...buildRaceFeatures(race, record));
  }
  for (const subrace of data.subrace || []) {
    const record = buildRaceRecord(subrace, true);
    if (!record) continue;
    races.push(record);
    features.push(...buildRaceFeatures(subrace, record));
  }

  return {
    races: uniqueBy(races, race => race.id).sort((a, b) => sourcePriority(a.source) - sourcePriority(b.source) || a.name.localeCompare(b.name)),
    features: uniqueBy(features.filter(Boolean), feature => feature.id).sort((a, b) => `${a.raceName} ${a.name}`.localeCompare(`${b.raceName} ${b.name}`)),
  };
}

function buildRaceRecord(race, isSubrace) {
  if (!race || !race.name) return null;
  const baseName = isSubrace ? race.raceName || '' : race.name;
  if (!baseName) return null;
  const subraceName = isSubrace ? race.name : '';
  const displayName = subraceName ? `${baseName} (${subraceName})` : baseName;
  const source = race.source || '';
  return {
    id: slugify(['race', baseName, subraceName, source].filter(Boolean).join('-')),
    name: displayName,
    baseName,
    subraceName,
    source,
    raceSource: race.raceSource || source,
    page: race.page || '',
    parentRaceId: subraceName ? slugify(['race', baseName, race.raceSource || source].filter(Boolean).join('-')) : '',
    aliases: buildRaceAliases(baseName, subraceName),
    size: race.size || [],
    speed: race.speed || '',
    ability: race.ability || [],
    traitTags: race.traitTags || [],
  };
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
  return entries
    .map(entry => buildRaceFeature(entry, raceRecord))
    .filter(Boolean);
}

function buildRaceFeature(entry, raceRecord) {
  if (!entry || typeof entry !== 'object' || !entry.name) return null;
  if (IGNORED_RACE_TRAIT_NAMES.has(entry.name)) return null;
  const text = cleanRulesText(entriesToText(entry.entries || entry.items || entry.rows || []));
  if (!text) return null;
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
  };
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
  };
}

function buildItem(row) {
  if (!row.Name) return null;
  const normalized = normalizeName(row.Name);
  const override = CURRENT_PARTY_ITEM_RULES[normalized] || {};
  const item = {
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
  item.weapon = override.weapon || inferWeapon(item);
  item.resources = normalizeItemRecords(override.resources || inferItemResources(item), item.id);
  item.actions = normalizeItemRecords(override.actions || inferItemActions(item), item.id);
  item.effects = normalizeItemRecords(override.effects || inferItemEffects(item), item.id);
  item.toggles = normalizeItemRecords(override.toggles || [], item.id);
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
  };
}

function buildBackground(row) {
  if (!row.Name) return null;
  const text = cleanRulesText(row.Description || '');
  const benefits = extractBackgroundBenefits(text);
  const feature = extractBackgroundFeature(text);
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
  };
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
    || clean === 'bonus action'
    || clean === '1 bonus action';
}

function hasActionTiming(clean) {
  return /\b(as an action|use an action|use your action|uses an action|spend an action|take an action|you can take the action|action to|requires an action|requires your action)\b/.test(clean)
    || clean === 'action'
    || clean === '1 action';
}

function hasReactionTiming(clean) {
  return /\b(as a reaction|use a reaction|use your reaction|uses its reaction|using your reaction|spend your reaction|take a reaction|reaction to)\b/.test(clean)
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
