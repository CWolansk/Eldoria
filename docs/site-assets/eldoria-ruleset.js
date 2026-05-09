/*
 * Shared Eldoria 2014 D&D 5e ruleset engine.
 *
 * The raw catalogs live in docs/Assets/Rules. This file filters them through the
 * campaign-wide ruleset profile, then projects character choices into sheet-ready
 * features, actions, resource wells, and audit messages.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EldoriaRuleset = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ABILITY_NAMES = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  };
  const DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
    'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
  ];
  const OFFICIAL_2014_SOURCES = [
    'AAG', 'AI', 'AitFR-AVT', 'AitFR-THP', 'BAM', 'BGDIA', 'BGG', 'BMT',
    'CM', 'CMI', 'CRCotN', 'CoS', 'DC', 'DMG', "DMG'14", 'DoDk', 'DSotDQ',
    'EET', 'EEPC', 'EGW', 'ERLW', 'FTD', 'GGR', 'GoS', 'HAT-LMI', 'HotDQ',
    'IDRotF', 'IMR', 'JttRC', 'KftGV', 'LLK', 'LMoP', 'LoX', 'LR', 'MM',
    "MM'14", 'MOT', 'MPMM', 'MTF', 'OGA', 'OotA', 'PaBTSO', 'PHB', "PHB'14",
    'PotA', 'QftIS', 'RMBRE', 'RoT', 'SCC', 'SCAG', 'SDW', 'SKT', 'TCE',
    'TftS', 'TftYP', 'ToA', 'TTP', 'VGM', 'VRGR', 'WBtW', 'WDH', 'WDMM', 'XGE',
  ];
  const SOURCE_PRIORITY = [
    'PHB', "PHB'14", 'DMG', "DMG'14", 'XGE', 'TCE', 'SCAG', 'VGM', 'EEPC',
    'MTF', 'MPMM', 'ERLW', 'EGW', 'FTD', 'GGR', 'MOT', 'SCC', 'VRGR', 'WBtW',
  ];
  const EXCLUDED_SOURCE_PATTERNS = [
    /^UA/i,
    /Homebrew/i,
    /Humblewood/i,
    /GrimHollow/i,
    /Obojima/i,
    /TalDorei|TDCSR/i,
    /Drakkenheim/i,
    /BookOfEbonTides|BoET/i,
    /TomeOfBeasts|ToB/i,
    /TLotRR/i,
    /HWCS|HWT|IllR|O:TTG/i,
    /PS[A-Z]?/i,
  ];
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
  const MANDATORY_SUBRACE_BASE_RACE_IDS = [
    'race-aasimar-vgm',
    'race-dwarf-phb',
    'race-elf-phb',
    'race-genasi-eepc',
    'race-genasi-mpmm',
    'race-gith-mtf',
    'race-gnome-phb',
    'race-halfling-phb',
    'race-shifter-erlw',
  ];
  const SKILL_OPTIONS = [
    'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception',
    'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine',
    'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion',
    'Sleight of Hand', 'Stealth', 'Survival',
  ];
  const SKILL_KEYS = {
    Acrobatics: 'acrobatics',
    'Animal Handling': 'animalHandling',
    Arcana: 'arcana',
    Athletics: 'athletics',
    Deception: 'deception',
    History: 'history',
    Insight: 'insight',
    Intimidation: 'intimidation',
    Investigation: 'investigation',
    Medicine: 'medicine',
    Nature: 'nature',
    Perception: 'perception',
    Performance: 'performance',
    Persuasion: 'persuasion',
    Religion: 'religion',
    'Sleight of Hand': 'sleightOfHand',
    Stealth: 'stealth',
    Survival: 'survival',
  };
  const CLASS_SKILL_CHOICES = {
    artificer: { count: 2, options: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'] },
    barbarian: { count: 2, options: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] },
    bard: { count: 3, options: SKILL_OPTIONS },
    cleric: { count: 2, options: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
    druid: { count: 2, options: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'] },
    fighter: { count: 2, options: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'] },
    monk: { count: 2, options: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'] },
    paladin: { count: 2, options: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'] },
    ranger: { count: 3, options: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'] },
    rogue: { count: 4, options: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
    sorcerer: { count: 2, options: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'] },
    warlock: { count: 2, options: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
    wizard: { count: 2, options: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] },
  };
  const LANGUAGE_OPTIONS = [
    'Abyssal', 'Celestial', 'Common', 'Deep Speech', 'Draconic', 'Dwarvish',
    'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Infernal', 'Orc',
    'Primordial', 'Sylvan', 'Undercommon',
  ];
  const ARTISAN_TOOL_OPTIONS = [
    "Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies",
    "Carpenter's tools", "Cartographer's tools", "Cobbler's tools",
    "Cook's utensils", "Glassblower's tools", "Jeweler's tools",
    "Leatherworker's tools", "Mason's tools", "Painter's supplies",
    "Potter's tools", "Smith's tools", "Tinker's tools", "Weaver's tools",
    "Woodcarver's tools",
  ];
  const GAMING_SET_OPTIONS = ['Dice set', 'Dragonchess set', 'Playing card set', 'Three-Dragon Ante set'];
  const MUSICAL_INSTRUMENT_OPTIONS = ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol'];
  const TOOL_OPTIONS = [
    ...ARTISAN_TOOL_OPTIONS,
    ...GAMING_SET_OPTIONS,
    ...MUSICAL_INSTRUMENT_OPTIONS,
    'Disguise kit', 'Forgery kit', 'Herbalism kit', "Navigator's tools",
    "Poisoner's kit", "Thieves' tools", 'Vehicles (land)', 'Vehicles (water)',
  ];
  const WEAPON_OPTIONS = [
    'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer',
    'Mace', 'Quarterstaff', 'Sickle', 'Spear', 'Light crossbow', 'Dart',
    'Shortbow', 'Sling', 'Battleaxe', 'Flail', 'Glaive', 'Greataxe',
    'Greatsword', 'Halberd', 'Lance', 'Longsword', 'Maul', 'Morningstar',
    'Pike', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'War pick',
    'Warhammer', 'Whip', 'Blowgun', 'Hand crossbow', 'Heavy crossbow',
    'Longbow', 'Net', 'Firearms', 'Improvised weapons', 'Unarmed strikes',
  ];
  const CLASS_WEAPON_PROFICIENCIES = {
    artificer: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons'] },
    barbarian: { simpleWeapons: true, martialWeapons: true, weapons: ['Simple weapons', 'Martial weapons'] },
    bard: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons', 'Hand crossbow', 'Longsword', 'Rapier', 'Shortsword'] },
    cleric: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons'] },
    druid: { simpleWeapons: false, martialWeapons: false, weapons: ['Club', 'Dagger', 'Dart', 'Javelin', 'Mace', 'Quarterstaff', 'Scimitar', 'Sickle', 'Sling', 'Spear'] },
    fighter: { simpleWeapons: true, martialWeapons: true, weapons: ['Simple weapons', 'Martial weapons'] },
    monk: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons', 'Shortsword'] },
    paladin: { simpleWeapons: true, martialWeapons: true, weapons: ['Simple weapons', 'Martial weapons'] },
    ranger: { simpleWeapons: true, martialWeapons: true, weapons: ['Simple weapons', 'Martial weapons'] },
    rogue: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons', 'Hand crossbow', 'Longsword', 'Rapier', 'Shortsword'] },
    sorcerer: { simpleWeapons: false, martialWeapons: false, weapons: ['Dagger', 'Dart', 'Sling', 'Quarterstaff', 'Light crossbow'] },
    warlock: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons'] },
    wizard: { simpleWeapons: false, martialWeapons: false, weapons: ['Dagger', 'Dart', 'Sling', 'Quarterstaff', 'Light crossbow'] },
  };
  const CLASS_TOOL_CHOICES = {
    artificer: [
      { count: 1, label: 'Artisan Tool Proficiency', options: ARTISAN_TOOL_OPTIONS },
    ],
    bard: [
      { count: 3, label: 'Musical Instrument Proficiencies', options: MUSICAL_INSTRUMENT_OPTIONS },
    ],
    monk: [
      { count: 1, label: 'Artisan Tool or Musical Instrument', options: [...ARTISAN_TOOL_OPTIONS, ...MUSICAL_INSTRUMENT_OPTIONS] },
    ],
  };
  const DRAGONBORN_ANCESTRY_OPTIONS = [
    'Black', 'Blue', 'Brass', 'Bronze', 'Copper', 'Gold', 'Green', 'Red',
    'Silver', 'White',
  ];
  const DRACONIC_ANCESTRY_DAMAGE_TYPES = {
    black: 'acid',
    blue: 'lightning',
    brass: 'fire',
    bronze: 'lightning',
    copper: 'acid',
    gold: 'fire',
    green: 'acid',
    red: 'fire',
    silver: 'cold',
    white: 'cold',
  };
  const FIGHTING_STYLE_OPTIONS = {
    fighter: ['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting'],
    paladin: ['Defense', 'Dueling', 'Great Weapon Fighting', 'Protection'],
    ranger: ['Archery', 'Defense', 'Dueling', 'Two-Weapon Fighting'],
    bard: ['Dueling', 'Two-Weapon Fighting'],
  };
  const FAVORED_ENEMY_OPTIONS = [
    'Aberrations', 'Beasts', 'Celestials', 'Constructs', 'Dragons', 'Elementals',
    'Fey', 'Fiends', 'Giants', 'Monstrosities', 'Oozes', 'Plants', 'Undead',
    'Two Humanoid Races',
  ];
  const FAVORED_TERRAIN_OPTIONS = [
    'Arctic', 'Coast', 'Desert', 'Forest', 'Grassland', 'Mountain', 'Swamp',
    'Underdark',
  ];
  const RESOURCE_ALIASES = [
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
  const FULL_CASTER_MAX_SPELL_LEVEL = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9];
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
  const MULTICLASS_PREREQS = {
    barbarian: { str: 13 },
    bard: { cha: 13 },
    cleric: { wis: 13 },
    druid: { wis: 13 },
    fighter: { str: 13, dex: 13, any: true },
    monk: { dex: 13, wis: 13 },
    paladin: { str: 13, cha: 13 },
    ranger: { dex: 13, wis: 13 },
    rogue: { dex: 13 },
    sorcerer: { cha: 13 },
    warlock: { cha: 13 },
    wizard: { int: 13 },
    artificer: { int: 13 },
  };
  const DEFAULT_RULESET_PROFILE = {
    id: 'eldoria-5e',
    name: 'Eldoria 5e',
    rulesVersion: 'eldoria-5e-2014-v1',
    system: 'dnd-5e-2014',
    featsEnabled: true,
    multiclassingEnabled: true,
    optionalClassFeaturesDefault: false,
    optionalRaceFeaturesDefault: false,
    officialSources: OFFICIAL_2014_SOURCES,
    overlaySources: ['Eldoria'],
    excludedClassNames: ['Expert Sidekick', 'Spellcaster Sidekick', 'Warrior Sidekick'],
    excludedSourcePatterns: EXCLUDED_SOURCE_PATTERNS.map(pattern => pattern.source),
    featureChoiceGroups: FEATURE_CHOICE_GROUPS,
    mandatorySubraceBaseRaceIds: MANDATORY_SUBRACE_BASE_RACE_IDS,
  };

  function createRuleset(rawRules = {}, profileOverrides = {}) {
    const profile = mergeProfile(profileOverrides);
    const rules = filterRules(rawRules, profile);
    const indexes = buildIndexes(rules);
    return {
      id: profile.id,
      version: profile.rulesVersion,
      profile,
      rules,
      indexes,
      evaluate(character, options = {}) {
        return evaluateCharacter(rules, indexes, profile, normalizeCharacterBuild(character), options);
      },
      project(character, basePlayer = {}, options = {}) {
        return projectCharacter(rules, indexes, profile, normalizeCharacterBuild(character), basePlayer, options);
      },
      nextLevel(character) {
        const normalized = normalizeCharacterBuild(character);
        return evaluateCharacter(rules, indexes, profile, { ...normalized, level: Math.min(20, normalized.level + 1) }, { levelUpFrom: normalized.level });
      },
      getAvailableSubclassesForClass(classId, level) {
        return getAvailableSubclassesForClass(rules, indexes, classId, level);
      },
      getSubclassUnlockLevel(classId) {
        return getSubclassUnlockLevel(indexes.classesById.get(classId));
      },
      getFeatSlotCount(character) {
        return getFeatSlotCount(rules, indexes, normalizeCharacterBuild(character));
      },
      getMaxSpellLevel(character) {
        return getMaxSpellLevel(rules, indexes, normalizeCharacterBuild(character));
      },
      resolvePickId(kind, label) {
        return resolvePickId(indexes, kind, label);
      },
      sourceLabel,
    };
  }

  function mergeProfile(overrides) {
    const out = {
      ...DEFAULT_RULESET_PROFILE,
      ...(overrides && typeof overrides === 'object' ? overrides : {}),
    };
    out.officialSources = normalizeSourceList(out.officialSources || OFFICIAL_2014_SOURCES);
    out.overlaySources = normalizeSourceList(out.overlaySources || []);
    out.featureChoiceGroups = Array.isArray(out.featureChoiceGroups) ? out.featureChoiceGroups : FEATURE_CHOICE_GROUPS;
    out.mandatorySubraceBaseRaceIds = normalizeIds(out.mandatorySubraceBaseRaceIds || MANDATORY_SUBRACE_BASE_RACE_IDS);
    out.excludedSourcePatterns = (out.excludedSourcePatterns || []).map(pattern => {
      try {
        return pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
      } catch {
        return null;
      }
    }).filter(Boolean);
    out.excludedClassNames = (out.excludedClassNames || []).map(normalize).filter(Boolean);
    return out;
  }

  function normalizeSourceList(sources) {
    return [...new Set((sources || []).map(normalizeRuleSource).filter(Boolean))];
  }

  function filterRules(rawRules, profile) {
    const out = {};
    for (const [key, value] of Object.entries(rawRules || {})) {
      if (!Array.isArray(value)) {
        out[key] = value;
        continue;
      }
      out[key] = value
        .filter(row => isAllowedRuleRow(row, profile))
        .map(row => ({ ...row, overlay: isOverlaySource(getRowSources(row)[0], profile) }));
    }
    out.manifest = rawRules.manifest || {};
    out.rulesetProfile = {
      id: profile.id,
      name: profile.name,
      rulesVersion: profile.rulesVersion,
      system: profile.system,
      featsEnabled: profile.featsEnabled,
      multiclassingEnabled: profile.multiclassingEnabled,
      optionalClassFeaturesDefault: profile.optionalClassFeaturesDefault,
      optionalRaceFeaturesDefault: profile.optionalRaceFeaturesDefault,
      officialSources: profile.officialSources,
      overlaySources: profile.overlaySources,
      mandatorySubraceBaseRaceIds: profile.mandatorySubraceBaseRaceIds,
    };
    return out;
  }

  function isAllowedRuleRow(row, profile) {
    const rowClassNames = [row && row.name, row && row.className].map(normalize).filter(Boolean);
    if (rowClassNames.some(name => profile.excludedClassNames.includes(name))) return false;
    const sources = getRowSources(row);
    if (!sources.length) return true;
    const primarySource = getPrimaryRowSource(row);
    if (primarySource) return isAllowedSource(primarySource, profile);
    return sources.some(source => isAllowedSource(source, profile));
  }

  function getPrimaryRowSource(row) {
    if (!row || typeof row !== 'object') return '';
    return String(row.source || row.subclassSource || row.raceSource || row.classSource || row.sourceCode || '').trim();
  }

  function getRowSources(row) {
    if (!row || typeof row !== 'object') return [];
    return [
      row.source,
      row.classSource,
      row.subclassSource,
      row.raceSource,
      row.sourceCode,
    ].map(source => String(source || '').trim()).filter(Boolean);
  }

  function isAllowedSource(source, profile) {
    const raw = String(source || '').trim();
    const normalized = normalizeRuleSource(raw);
    if (!normalized) return true;
    if (profile.overlaySources.includes(normalized)) return true;
    if (profile.excludedSourcePatterns.some(pattern => pattern.test(raw) || pattern.test(normalized))) return false;
    return profile.officialSources.includes(normalized);
  }

  function isOverlaySource(source, profile) {
    return profile.overlaySources.includes(normalizeRuleSource(source));
  }

  function buildIndexes(rules) {
    const indexes = {
      classesById: byId(rules.classes),
      subclassesById: byId(rules.subclasses),
      racesById: byId(rules.races),
      backgroundsById: byId(rules.backgrounds),
      featsById: byId(rules.feats),
      itemsById: byId(rules.items),
      spellsById: byId(rules.spells),
      featuresById: byId(rules.features),
    };
    indexes.classesByName = byLabel(rules.classes);
    indexes.subclassesByName = byLabel(rules.subclasses, ['shortName']);
    indexes.racesByName = byLabel(rules.races, ['baseName', 'subraceName']);
    indexes.backgroundsByName = byLabel(rules.backgrounds);
    indexes.featsByName = byLabel(rules.feats);
    indexes.itemsByName = byLabel(rules.items);
    indexes.spellsByName = byLabel(rules.spells);
    return indexes;
  }

  function normalizeCharacterBuild(character) {
    const source = character && typeof character === 'object' ? character : {};
    const level = clamp(Number(source.level) || sumClassLevels(source.classLevels) || 1, 1, 20);
    const classLevels = normalizeClassLevels(source.classLevels, source.classId, level);
    return {
      id: cleanString(source.id || source.characterId),
      name: cleanString(source.name),
      rulesetId: cleanString(source.rulesetId || DEFAULT_RULESET_PROFILE.id),
      rulesVersion: cleanString(source.rulesVersion || source.rulesSchemaVersion),
      level,
      classId: cleanString(source.classId || (classLevels[0] && classLevels[0].classId)),
      subclassId: cleanString(source.subclassId),
      classLevels,
      raceId: cleanString(source.raceId || first(source.raceIds)),
      backgroundId: cleanString(source.backgroundId || first(source.backgroundIds)),
      abilityMethod: cleanString(source.abilityMethod || 'manual'),
      hpMode: cleanString(source.hpMode || 'auto-average'),
      maxHp: normalizeNullableNumber(source.maxHp),
      currentHp: normalizeNullableNumber(source.currentHp),
      abilities: normalizeAbilities(source.abilities),
      featIds: normalizeIds(source.featIds),
      itemIds: normalizeIds(source.itemIds),
      spellIds: normalizeIds(source.spellIds),
      optionalFeatureIds: normalizeIds(source.optionalFeatureIds),
      selectedFeatureIds: normalizeIds(source.selectedFeatureIds),
      featureChoices: source.featureChoices && typeof source.featureChoices === 'object' ? { ...source.featureChoices } : {},
      levelChoices: source.levelChoices && typeof source.levelChoices === 'object' ? { ...source.levelChoices } : {},
      proficiencies: source.proficiencies && typeof source.proficiencies === 'object' ? { ...source.proficiencies } : {},
      notes: cleanString(source.notes),
    };
  }

  function normalizeClassLevels(classLevels, classId, level) {
    if (Array.isArray(classLevels) && classLevels.length) {
      return classLevels.map(entry => ({
        classId: cleanString(entry && entry.classId),
        subclassId: cleanString(entry && entry.subclassId),
        level: clamp(Number(entry && entry.level) || 1, 1, 20),
      })).filter(entry => entry.classId && entry.level > 0).slice(0, 12);
    }
    return classId ? [{ classId: cleanString(classId), level: clamp(Number(level) || 1, 1, 20) }] : [];
  }

  function normalizeAbilities(abilities) {
    const source = abilities && typeof abilities === 'object' ? abilities : {};
    const out = {};
    ABILITIES.forEach(ability => {
      const value = Number(source[ability]);
      out[ability] = Number.isFinite(value) ? clamp(value, 1, 30) : 10;
    });
    return out;
  }

  function normalizeNullableNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function applyAbilityScoreBonuses(rules, indexes, character, baseAbilities) {
    const abilities = { ...baseAbilities };
    const addBonus = (ability, amount, max = 30) => {
      if (!ABILITIES.includes(ability)) return;
      const current = Number(abilities[ability]) || 10;
      abilities[ability] = clamp(current + (Number(amount) || 0), 1, Math.max(current, Number(max) || 30));
    };
    const race = indexes.racesById.get(character.raceId);
    const raceAbilityGrants = getRaceAbilityScoreGrants(race);
    if (raceAbilityGrants.length) {
      raceAbilityGrants.forEach((grant, index) => {
        if (!grant || normalize(grant.type) !== 'ability score') return;
        if (grant.ability) addBonus(getAbilityKeyFromChoice(grant.ability), grant.value, grant.max || 30);
        if (normalize(grant.mode) !== 'choice') return;
        const config = getRaceAbilityChoiceConfig(grant);
        const values = getChoiceGroupSelectionValues(character.featureChoices, `${race.id}:ability:${index}`)
          .map(getAbilityKeyFromChoice)
          .filter(ability => ability && (!config.options.length || config.options.includes(ability)))
          .slice(0, config.count);
        if (values.length < config.count) return;
        values.forEach(ability => addBonus(ability, config.amount, grant.max || 30));
      });
    } else if (race && Array.isArray(race.ability)) {
      race.ability.forEach((entry, index) => {
        ABILITIES.forEach(ability => addBonus(ability, entry && entry[ability]));
        const choice = entry && entry.choose;
        if (!choice) return;
        const count = Number(choice.count) || 1;
        const amount = Number(choice.amount || choice.amountPer || 1) || 1;
        const values = getChoiceGroupSelectionValues(character.featureChoices, `${race.id}:ability:${index}`)
          .map(getAbilityKeyFromChoice)
          .filter(Boolean)
          .slice(0, count);
        if (values.length < count) return;
        values.forEach(ability => addBonus(ability, amount));
      });
    }
    Object.entries(character.featureChoices || {}).forEach(([groupName, value]) => {
      const featureId = getAsiFeatureIdFromAllocationGroup(groupName);
      if (!featureId || !abilityScoreImprovementFeatureApplies(indexes, character, featureId)) return;
      const values = getChoiceGroupSelectionValues({ [groupName]: value }, groupName)
        .map(getAbilityKeyFromChoice)
        .filter(Boolean)
        .slice(0, 2);
      if (values.length < 2) return;
      values.forEach(ability => addBonus(ability, 1));
    });
    character.featIds
      .map(id => indexes.featsById.get(id))
      .filter(Boolean)
      .forEach(feat => {
        getFeatAbilityScoreBonuses(feat, character).forEach(bonus => {
          addBonus(bonus.ability, bonus.amount, bonus.max || 20);
        });
    });
    return abilities;
  }

  function getRaceOrigin(race) {
    if (!race || typeof race !== 'object') return {};
    if (race.origin && typeof race.origin === 'object') return race.origin;
    if (race.rules && typeof race.rules === 'object') return race.rules;
    return {};
  }

  function getRaceOriginRows(race, key) {
    const origin = getRaceOrigin(race);
    return Array.isArray(origin && origin[key]) ? origin[key] : [];
  }

  function getRaceAbilityScoreGrants(race) {
    return getRaceOriginRows(race, 'abilityScores')
      .filter(grant => normalize(grant && grant.type) === 'ability score');
  }

  function getRaceAbilityChoiceConfig(grant) {
    const choice = grant && grant.options && typeof grant.options === 'object' ? grant.options : {};
    const weighted = choice.weighted && typeof choice.weighted === 'object' ? choice.weighted : {};
    const options = normalizeRaceAbilityChoiceList(choice.from || weighted.from || []);
    return {
      count: Number(choice.count || weighted.count) || 1,
      amount: Number(choice.amount || choice.amountPer || weighted.amount || weighted.amountPer || grant && grant.value || 1) || 1,
      options,
    };
  }

  function normalizeRaceAbilityChoiceList(value) {
    if (Array.isArray(value)) return value.map(getAbilityKeyFromChoice).filter(Boolean);
    if (value && typeof value === 'object') return Object.keys(value).map(getAbilityKeyFromChoice).filter(Boolean);
    return [];
  }

  function getFeatAbilityScoreBonuses(feat, character) {
    const structured = getStructuredFeatAbilityScoreBonuses(feat, character);
    if (structured.length) return structured;
    return getTextFeatAbilityScoreBonuses(feat);
  }

  function getStructuredFeatAbilityScoreBonuses(feat, character) {
    const entries = Array.isArray(feat && feat.ability) ? feat.ability : [];
    const out = [];
    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      ABILITIES.forEach(ability => {
        if (Number(entry[ability])) out.push({ ability, amount: Number(entry[ability]) || 0, max: Number(entry.max) || 20 });
      });
      const choice = entry.choose;
      if (!choice || typeof choice !== 'object') return;
      const amount = Number(choice.amount || choice.amountPer || 1) || 1;
      const max = Number(choice.max || entry.max) || 20;
      const from = normalizeFeatAbilityChoiceList(choice.from || choice.weighted && choice.weighted.from || choice);
      const selected = getChoiceGroupSelectionValues(character.featureChoices, `${feat.id}:ability:${index}`)
        .map(getAbilityKeyFromChoice)
        .filter(ability => ability && (!from.length || from.includes(ability)));
      if (selected.length) {
        selected.slice(0, Number(choice.count) || 1).forEach(ability => out.push({ ability, amount, max }));
      } else if (from.length === 1) {
        out.push({ ability: from[0], amount, max });
      }
    });
    return out;
  }

  function getTextFeatAbilityScoreBonuses(feat) {
    const text = cleanRulesText(`${feat && feat.abilityScores || ''} ${feat && feat.text || ''}`);
    if (!text) return [];
    const out = [];
    const seen = new Set();
    const max = getFeatAbilityMaximum(text);
    const patterns = [
      /increase your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) score by (\d+)/gi,
      /your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) score increases by (\d+)/gi,
      /your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) score is increased by (\d+)/gi,
    ];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text))) {
        const ability = getAbilityKeyFromChoice(match[1]);
        const amount = Number(match[2]) || 0;
        const key = `${ability}:${amount}:${match.index}`;
        if (!ability || !amount || seen.has(key)) continue;
        seen.add(key);
        out.push({ ability, amount, max });
      }
    });
    return out;
  }

  function normalizeFeatAbilityChoiceList(value) {
    const raw = Array.isArray(value)
      ? value
      : value && typeof value === 'object'
        ? Object.keys(value).length ? Object.keys(value) : Object.values(value)
        : [value];
    return raw.map(getAbilityKeyFromChoice).filter(Boolean);
  }

  function getFeatAbilityMaximum(text) {
    const match = String(text || '').match(/maximum of (\d+)/i);
    return match ? Number(match[1]) || 20 : 20;
  }

  function getAbilityKeyFromChoice(value) {
    const clean = normalize(value);
    if (!clean) return '';
    const match = ABILITIES.find(ability => clean === normalize(ability) || clean === normalize(ABILITY_NAMES[ability]));
    return match || '';
  }

  function getAsiFeatureIdFromAllocationGroup(groupName) {
    const key = String(groupName || '');
    return key.endsWith(':allocation') ? key.slice(0, -':allocation'.length) : '';
  }

  function abilityScoreImprovementFeatureApplies(indexes, character, featureId) {
    const feature = indexes.featuresById.get(featureId);
    if (!feature || feature.kind !== 'class' || normalize(feature.name) !== 'ability score improvement') return false;
    return (character.classLevels || []).some(entry => {
      const cls = indexes.classesById.get(entry.classId);
      return cls
        && normalize(cls.name) === normalize(feature.className)
        && Number(feature.level || 1) <= Number(entry.level || character.level || 1);
    });
  }

  function evaluateCharacter(rules, indexes, profile, character, options = {}) {
    const report = makeEvaluationReport(character, profile, options);
    const selected = resolveSelections(rules, indexes, profile, character, report);
    validateCoreBuild(rules, indexes, profile, character, selected, report, options);
    const features = resolveAvailableFeatures(rules, indexes, profile, character, selected, report);
    const spellGrants = getFeatureGrantedSpellEntries(rules, indexes, character, selected, features);
    validateSpellChoices(rules, indexes, character, selected, report, features, spellGrants);
    validateChoiceGroups(rules, indexes, profile, character, selected, features, report);
    const resources = buildResources(rules, indexes, selected, features);
    const actions = enhanceActionsWithFeatureMetadata(linkActionsToResources(buildActions(rules, indexes, selected, features, spellGrants), resources, features), features);
    const effects = buildEffects(rules, indexes, selected, features);
    addActionWellIssues(report, actions);
    finalizeEvaluationReport(report, features, resources, actions);
    return {
      rulesetId: profile.id,
      rulesVersion: profile.rulesVersion,
      character,
      selected,
      issues: report.issues,
      counts: report.counts,
      actionWellCount: report.actionWellCount,
      availableChoices: buildAvailableChoices(rules, indexes, profile, character, selected, features),
      features,
      spellGrants,
      grantedSpells: uniqueBy(spellGrants.filter(grant => !grant.listAddition).map(grant => grant.spell).filter(Boolean), spell => spell.id),
      resources,
      actions,
      actionWells: buildActionWells(actions),
      effects,
      nextLevel: buildNextLevelSummary(rules, indexes, profile, character, selected, features),
    };
  }

  function projectCharacter(rules, indexes, profile, character, basePlayer = {}, options = {}) {
    const evaluation = evaluateCharacter(rules, indexes, profile, character, options);
    const selected = evaluation.selected;
    const cls = selected.primaryClass;
    const subclass = selected.primarySubclass;
    const race = selected.race;
    const background = selected.background;
    const feats = selected.feats;
    const items = selected.items;
    const spells = selected.spells;
    const abilities = applyAbilityScoreBonuses(rules, indexes, character, { ...(basePlayer.abilities || {}), ...character.abilities });
    const proficiencyBonus = calculateProficiencyBonus(character.level);
    const spellcastingProfile = buildSpellcastingProfile(selected, evaluation.features, character, abilities, proficiencyBonus);
    const spellProjection = buildSpellProjection(spells, evaluation.spellGrants || []);
    const initiativeProfile = buildInitiativeProfile(selected, evaluation.features, evaluation.effects, abilities, proficiencyBonus);
    const speedProfile = buildSpeedProfileFromRules(indexes, selected, evaluation.features, evaluation.effects);
    const defenseProjection = buildDefenseProjection(selected, evaluation.features, evaluation.effects, character);
    const proficiencyProjection = buildProficiencyProjection(
      character,
      selected,
      evaluation.features,
      evaluation.availableChoices && evaluation.availableChoices.featureChoiceGroups,
      basePlayer
    );
    const projection = {
      id: character.id || basePlayer.id || '',
      name: character.name || basePlayer.name || '',
      level: character.level,
      class: cls ? cls.name : basePlayer.class || '',
      classId: cls ? cls.id : character.classId || '',
      subclass: subclass ? subclass.name : basePlayer.subclass || '',
      subclassId: subclass ? subclass.id : character.subclassId || '',
      subclassShortName: subclass ? subclass.shortName || subclass.name : basePlayer.subclassShortName || '',
      race: race ? race.name : basePlayer.race || '',
      raceIds: race ? [race.id] : [],
      races: race ? [race.name] : [],
      size: getSelectedRaceSize(character, race) || basePlayer.size || '',
      background: background ? background.name : basePlayer.background || '',
      backgroundIds: background ? [background.id] : [],
      backgrounds: background ? [background.name] : [],
      abilities,
      hpMode: character.hpMode || basePlayer.hpMode || 'auto-average',
      maxHp: character.maxHp === null || character.maxHp === undefined ? basePlayer.maxHp || null : character.maxHp,
      currentHp: character.currentHp === null || character.currentHp === undefined ? basePlayer.currentHp || null : character.currentHp,
      proficiencyBonus,
      saves: proficiencyProjection.saves,
      skills: proficiencyProjection.skills,
      simpleWeapons: proficiencyProjection.simpleWeapons,
      martialWeapons: proficiencyProjection.martialWeapons,
      weaponProficiencies: proficiencyProjection.proficiencies.weapons,
      proficiencies: proficiencyProjection.proficiencies,
      initiative: initiativeProfile.total,
      initiativeBonus: initiativeProfile.total,
      initiativeProfile,
      baseSpeed: speedProfile.total,
      speed: speedProfile.total,
      speedProfile,
      resistances: defenseProjection.resistances,
      vulnerabilities: defenseProjection.vulnerabilities,
      damageResistances: defenseProjection.damageResistances,
      damageVulnerabilities: defenseProjection.damageVulnerabilities,
      resistanceDetails: defenseProjection.resistanceDetails,
      vulnerabilityDetails: defenseProjection.vulnerabilityDetails,
      defenses: defenseProjection,
      spellcasting: spellcastingProfile.ability || false,
      spellcastingAbility: spellcastingProfile.ability || '',
      spellcastingAbilityName: spellcastingProfile.abilityName || '',
      spellcastingModifier: spellcastingProfile.modifier,
      spellAttack: spellcastingProfile.attackBonus,
      spellAttackBonus: spellcastingProfile.attackBonus,
      spellSaveDc: spellcastingProfile.saveDc,
      spellSaveDC: spellcastingProfile.saveDc,
      spellcastingProfile,
      hitDice: cls ? inferHitDice(cls, getClassLevel(character, cls.id) || character.level) : basePlayer.hitDice || '',
      equipment: items.map(item => item.name),
      itemIds: items.map(item => item.id),
      itemDetails: buildDetailsMap(items),
      spells: spellProjection.spells,
      spellIds: spellProjection.spellIds,
      spellDetails: spellProjection.spellDetails,
      manualSpells: spellProjection.manualSpells,
      manualSpellIds: spellProjection.manualSpellIds,
      manualSpellDetails: spellProjection.manualSpellDetails,
      grantedSpells: spellProjection.grantedSpells,
      grantedSpellIds: spellProjection.grantedSpellIds,
      grantedSpellDetails: spellProjection.grantedSpellDetails,
      spellGrantDetails: spellProjection.spellGrantDetails,
      spellListAdditions: spellProjection.spellListAdditions,
      spellListAdditionIds: spellProjection.spellListAdditionIds,
      spellListAdditionDetails: spellProjection.spellListAdditionDetails,
      spellMetadata: spellProjection.spellMetadata,
      spellMetadataByName: spellProjection.spellMetadataByName,
      spellSlots: calculateSpellSlots(selected),
      feats: feats.map(feat => feat.name),
      featIds: feats.map(feat => feat.id),
      featDetails: buildRuleDetails(feats),
      backgroundDetails: buildRuleDetails(background ? [background] : []),
      ruleFeatures: formatRuleFeatures(evaluation.features, evaluation.resources),
      resources: evaluation.resources,
      ruleActions: evaluation.actions,
      actionWells: evaluation.actionWells,
      ruleEffects: evaluation.effects,
      ruleChoices: summarizeRuleChoices(character, evaluation),
      ruleReport: {
        issueCount: evaluation.issues.length,
        actionWellCount: evaluation.actionWellCount,
      },
      rulesSource: {
        kind: 'eldoria-ruleset',
        rulesetId: profile.id,
        rulesVersion: profile.rulesVersion,
        schemaVersion: rules.manifest && rules.manifest.schemaVersion,
        generatedAtUtc: rules.manifest && rules.manifest.generatedAtUtc,
      },
    };
    return { evaluation, projection };
  }

  function buildSpellcastingProfile(selected, features, character, abilities, proficiencyBonus) {
    const classAbility = getSpellcastingAbility(selected);
    const featureSources = getFeatureSpellcastingAbilitySources(features, character);
    const featureAbility = first(featureSources.map(source => source.ability).filter(Boolean));
    const ability = classAbility || featureAbility || '';
    const modifier = ability ? calculateModifier(Number(abilities[ability]) || 10) : null;
    const attackBonus = ability ? modifier + proficiencyBonus : null;
    const saveDc = ability ? 8 + modifier + proficiencyBonus : null;
    const classSources = (selected.classLevels || [])
      .filter(entry => entry.classRow && entry.classRow.spellcastingAbility)
      .map(entry => ({
        sourceType: 'class',
        sourceId: entry.classId || '',
        sourceName: entry.classRow.name || '',
        className: entry.classRow.name || '',
        ability: entry.classRow.spellcastingAbility,
        abilityName: ABILITY_NAMES[entry.classRow.spellcastingAbility] || '',
        casterProgression: entry.classRow.casterProgression || '',
      }));
    const abilityOptions = uniqueText([ability, ...featureSources.flatMap(source => source.abilityOptions || [])].filter(Boolean));
    return {
      ability,
      abilityName: ability ? ABILITY_NAMES[ability] || ability : '',
      modifier,
      attackBonus,
      saveDc,
      proficiencyBonus,
      sources: [...classSources, ...featureSources],
      abilityOptions,
    };
  }

  function getFeatureSpellcastingAbilitySources(features, character) {
    return (features || [])
      .map(feature => {
        const featureName = normalize(feature && feature.name);
        if (feature && feature.kind === 'class' && (featureName === 'spellcasting' || featureName === 'pact magic')) return null;
        const inferred = inferStructuredFeatureSpellcastingAbility(feature) || inferFeatureSpellcastingAbility(feature && feature.text);
        if (!inferred.ability && !inferred.abilityOptions.length) return null;
        return {
          sourceType: feature.kind || '',
          sourceId: feature.id || '',
          sourceName: feature.name || '',
          className: feature.className || '',
          subclassName: feature.subclassShortName || feature.subclassName || '',
          raceName: feature.raceName || '',
          ability: inferred.ability,
          abilityName: inferred.ability ? ABILITY_NAMES[inferred.ability] || inferred.ability : '',
          abilityOptions: inferred.abilityOptions,
          unresolvedChoice: !inferred.ability && inferred.abilityOptions.length > 1,
          level: feature.level || '',
        };
      })
      .filter(Boolean)
      .filter(source => getFeatureProgressionLevel(character, { classLevels: [] }, { kind: source.sourceType, level: source.level }) >= (Number(source.level) || 1));
  }

  function inferFeatureSpellcastingAbility(text) {
    const sentence = cleanRulesText(text || '')
      .split(/[.!?]\s+/)
      .find(part => /\bspellcasting ability\b/i.test(part));
    if (!sentence) return { ability: '', abilityOptions: [] };
    const abilityOptions = ABILITIES.filter(ability => new RegExp(`\\b${ABILITY_NAMES[ability]}\\b`, 'i').test(sentence));
    const unresolvedChoice = abilityOptions.length > 1 && /\bor\b/i.test(sentence);
    return {
      ability: unresolvedChoice ? '' : abilityOptions[0] || '',
      abilityOptions,
    };
  }

  function inferStructuredFeatureSpellcastingAbility(feature) {
    const spellGrants = getStructuredFeatureGrants(feature, 'spell');
    if (!spellGrants.length) return null;
    const abilityOptions = uniqueText(spellGrants.flatMap(grant => normalizeIds(grant.abilityOptions || grant.abilities || [])));
    const abilities = uniqueText(spellGrants.map(grant => getAbilityKeyFromChoice(grant.ability || grant.spellcastingAbility)).filter(Boolean));
    if (abilities.length === 1 && !abilityOptions.length) return { ability: abilities[0], abilityOptions: [] };
    return {
      ability: '',
      abilityOptions: uniqueText([...abilities, ...abilityOptions]),
    };
  }

  function buildSpellProjection(manualSpells, spellGrants) {
    const manualRows = uniqueBy(manualSpells || [], spell => spell.id);
    const grantedEntries = (spellGrants || []).filter(grant => grant && !grant.listAddition && grant.spell);
    const listAdditionEntries = (spellGrants || []).filter(grant => grant && grant.listAddition && grant.spell);
    const grantedRows = uniqueBy(grantedEntries.map(grant => grant.spell), spell => spell.id);
    const listAdditionRows = uniqueBy(listAdditionEntries.map(grant => grant.spell), spell => spell.id);
    const allRows = uniqueBy([...manualRows, ...grantedRows], spell => spell.id);
    const metadata = buildSpellMetadata(manualRows, spellGrants);
    return {
      spells: allRows.map(spell => spell.name),
      spellIds: allRows.map(spell => spell.id),
      spellDetails: buildDetailsMap(allRows),
      manualSpells: manualRows.map(spell => spell.name),
      manualSpellIds: manualRows.map(spell => spell.id),
      manualSpellDetails: buildDetailsMap(manualRows),
      grantedSpells: grantedRows.map(spell => spell.name),
      grantedSpellIds: grantedRows.map(spell => spell.id),
      grantedSpellDetails: buildDetailsMap(grantedRows),
      spellGrantDetails: spellGrants.map(formatSpellGrantDetail),
      spellListAdditions: listAdditionRows.map(spell => spell.name),
      spellListAdditionIds: listAdditionRows.map(spell => spell.id),
      spellListAdditionDetails: buildDetailsMap(listAdditionRows),
      spellMetadata: metadata.byId,
      spellMetadataByName: metadata.byName,
    };
  }

  function buildSpellMetadata(manualSpells, spellGrants) {
    const byId = {};
    const ensure = spell => {
      if (!spell || !spell.id) return null;
      if (!byId[spell.id]) {
        byId[spell.id] = {
          id: spell.id,
          name: spell.name || '',
          level: spell.level || '',
          spellLevel: getSpellLevelNumber(spell.level),
          source: spell.source || '',
          manual: false,
          selected: false,
          granted: false,
          autoGranted: false,
          listAddition: false,
          nonRemovable: false,
          removable: true,
          grantSources: [],
        };
      }
      return byId[spell.id];
    };
    (manualSpells || []).forEach(spell => {
      const meta = ensure(spell);
      if (!meta) return;
      meta.manual = true;
      meta.selected = true;
    });
    (spellGrants || []).forEach(grant => {
      const meta = ensure(grant.spell);
      if (!meta) return;
      meta.granted = meta.granted || !grant.listAddition;
      meta.autoGranted = meta.autoGranted || !grant.listAddition;
      meta.listAddition = meta.listAddition || Boolean(grant.listAddition);
      meta.nonRemovable = meta.nonRemovable || Boolean(grant.nonRemovable);
      meta.removable = !meta.nonRemovable;
      meta.grantSources.push(formatSpellGrantSource(grant));
    });
    const byName = {};
    Object.values(byId).forEach(meta => {
      if (meta.name) byName[meta.name] = meta;
    });
    return { byId, byName };
  }

  function formatSpellGrantDetail(grant) {
    return {
      spellId: grant.spellId || '',
      name: grant.name || '',
      level: grant.level || '',
      spellLevel: grant.spellLevel,
      castLevel: grant.castLevel,
      grantMode: grant.grantMode || '',
      granted: Boolean(grant.granted),
      autoGranted: Boolean(grant.autoGranted),
      nonRemovable: Boolean(grant.nonRemovable),
      listAddition: Boolean(grant.listAddition),
      autoPrepared: Boolean(grant.autoPrepared),
      autoKnown: Boolean(grant.autoKnown),
      featureCast: Boolean(grant.featureCast),
      levelGate: grant.levelGate,
      spellListLevel: grant.spellListLevel,
      ability: grant.ability || '',
      abilityOptions: Array.isArray(grant.abilityOptions) ? grant.abilityOptions : [],
      uses: grant.uses || '',
      reset: grant.reset || '',
      canUseSpellSlots: Boolean(grant.canUseSpellSlots),
      consumesSlot: grant.consumesSlot === undefined ? null : Boolean(grant.consumesSlot),
      resourceId: grant.resourceId || '',
      sourceFeatureId: grant.sourceFeatureId || '',
        sourceFeatureName: grant.sourceFeatureName || '',
        sourceType: grant.sourceType || '',
        className: grant.className || '',
        subclassName: grant.subclassName || '',
        raceName: grant.raceName || '',
        choice: grant.choice || '',
        source: grant.source || '',
      };
  }

  function formatSpellGrantSource(grant) {
    return {
      sourceFeatureId: grant.sourceFeatureId || '',
      sourceFeatureName: grant.sourceFeatureName || '',
      sourceType: grant.sourceType || '',
      className: grant.className || '',
      subclassName: grant.subclassName || '',
      raceName: grant.raceName || '',
      choice: grant.choice || '',
      grantMode: grant.grantMode || '',
      levelGate: grant.levelGate,
      spellListLevel: grant.spellListLevel,
      ability: grant.ability || '',
      abilityOptions: Array.isArray(grant.abilityOptions) ? grant.abilityOptions : [],
      uses: grant.uses || '',
      reset: grant.reset || '',
      castLevel: grant.castLevel,
      canUseSpellSlots: Boolean(grant.canUseSpellSlots),
      consumesSlot: grant.consumesSlot === undefined ? null : Boolean(grant.consumesSlot),
      resourceId: grant.resourceId || '',
      listAddition: Boolean(grant.listAddition),
      nonRemovable: Boolean(grant.nonRemovable),
    };
  }

  function buildProficiencyProjection(character, selected, features = [], choiceGroups = [], basePlayer = {}) {
    const saves = new Set();
    const skills = new Set();
    const languages = new Set();
    const tools = new Set();
    const weapons = new Set();
    let simpleWeapons = Boolean(basePlayer && basePlayer.simpleWeapons);
    let martialWeapons = Boolean(basePlayer && basePlayer.martialWeapons);

    const addSave = value => {
      const key = normalizeAbilitySaveKey(value);
      if (key) saves.add(key);
    };
    const addSkill = value => {
      const key = normalizeSkillKey(value);
      if (key) skills.add(key);
    };
    const addLanguage = value => {
      const language = normalizeKnownProficiency(value, LANGUAGE_OPTIONS);
      if (language) languages.add(language);
    };
    const addTool = value => {
      const tool = normalizeToolProficiency(value);
      if (tool) tools.add(tool);
    };
    const addWeapon = value => {
      const weapon = normalizeWeaponProficiency(value);
      if (!weapon) return;
      if (normalize(weapon) === 'simple weapons') simpleWeapons = true;
      if (normalize(weapon) === 'martial weapons') martialWeapons = true;
      weapons.add(weapon);
    };

    normalizeIds(basePlayer && basePlayer.saves || []).forEach(addSave);
    normalizeIds(basePlayer && basePlayer.skills || []).forEach(addSkill);

    const baseProficiencies = basePlayer && basePlayer.proficiencies && typeof basePlayer.proficiencies === 'object'
      ? basePlayer.proficiencies
      : {};
    const characterProficiencies = character && character.proficiencies && typeof character.proficiencies === 'object'
      ? character.proficiencies
      : {};
    [baseProficiencies, characterProficiencies].forEach(source => {
      normalizeIds(source.saves || source.savingThrows || source.saveProficiencies || source.savingThrowProficiencies || []).forEach(addSave);
      normalizeIds(source.skills || source.skillProficiencies || []).forEach(addSkill);
      normalizeIds(source.languages || source.languageProficiencies || []).forEach(addLanguage);
      normalizeIds(source.tools || source.toolProficiencies || []).forEach(addTool);
      normalizeIds(source.weapons || source.weaponProficiencies || []).forEach(addWeapon);
    });

    const primaryClass = selected && selected.primaryClass;
    if (primaryClass) {
      addStructuredProficiencies(primaryClass, { addSave, addSkill, addLanguage, addTool, addWeapon });
      normalizeIds(primaryClass.proficiency || primaryClass.savingThrows || primaryClass.savingThrowProficiencies || []).forEach(addSave);
    }

    (selected && selected.classLevels || []).forEach(entry => {
      if (entry && entry.classRow) addStructuredProficiencies(entry.classRow, { addSave, addSkill, addLanguage, addTool, addWeapon });
      if (entry && entry.subclassRow) addStructuredProficiencies(entry.subclassRow, { addSave, addSkill, addLanguage, addTool, addWeapon });
      const classKey = slugify(entry && entry.classRow && entry.classRow.name || entry && entry.classId);
      const classWeapons = CLASS_WEAPON_PROFICIENCIES[classKey];
      if (!classWeapons) return;
      if (classWeapons.simpleWeapons) simpleWeapons = true;
      if (classWeapons.martialWeapons) martialWeapons = true;
      (classWeapons.weapons || []).forEach(addWeapon);
    });

    addRaceOriginProficiencies(selected && selected.race, { addSave, addSkill, addLanguage, addTool, addWeapon });

    (choiceGroups || []).forEach(group => {
      if (!group || !['skill', 'language', 'tool'].includes(group.choiceType)) return;
      const add = group.choiceType === 'skill' ? addSkill : group.choiceType === 'language' ? addLanguage : addTool;
      (group.fixedOptions || []).forEach(add);
      (group.inferredSelections || []).forEach(add);
      getChoiceGroupSelectionValues(character.featureChoices, group).forEach(add);
    });

    if (selected && selected.background) {
      addStructuredProficiencies(selected.background, { addSave, addSkill, addLanguage, addTool, addWeapon });
      parseFixedProficiencyOptions(selected.background.skillProficiencies, SKILL_OPTIONS).forEach(addSkill);
      parseFixedProficiencyOptions(selected.background.languages, LANGUAGE_OPTIONS).forEach(addLanguage);
      parseFixedProficiencyOptions(selected.background.toolProficiencies, TOOL_OPTIONS).forEach(addTool);
    }

    (features || []).forEach(feature => {
      addStructuredProficiencies(feature, { addSave, addSkill, addLanguage, addTool, addWeapon });
      addRuleTextProficiencies(feature && feature.text, { addSave, addSkill, addLanguage, addTool, addWeapon });
    });
    (selected && selected.feats || []).forEach(feat => {
      addStructuredProficiencies(feat, { addSave, addSkill, addLanguage, addTool, addWeapon });
      addRuleTextProficiencies(feat && feat.text, { addSave, addSkill, addLanguage, addTool, addWeapon });
    });

    return {
      saves: orderByKnownValues([...saves], ABILITIES),
      skills: orderByKnownValues([...skills], SKILL_OPTIONS.map(option => SKILL_KEYS[option])),
      simpleWeapons,
      martialWeapons,
      proficiencies: {
        skills: orderByKnownValues([...skills], SKILL_OPTIONS.map(option => SKILL_KEYS[option])),
        languages: orderByKnownValues([...languages], LANGUAGE_OPTIONS),
        tools: orderByKnownValues([...tools], TOOL_OPTIONS),
        weapons: orderByKnownValues([...weapons], ['Simple weapons', 'Martial weapons', ...WEAPON_OPTIONS]),
        weaponProficiencies: orderByKnownValues([...weapons], ['Simple weapons', 'Martial weapons', ...WEAPON_OPTIONS]),
        savingThrows: orderByKnownValues([...saves], ABILITIES),
      },
    };
  }

  function addStructuredProficiencies(rule, adders) {
    getRuleGrants(rule).forEach(grant => {
      const type = normalize(grant && grant.type);
      if (type === 'language' && grant.language) adders.addLanguage(grant.language);
      if (type === 'skill' && grant.skill) adders.addSkill(grant.skill);
      if (type === 'tool' && grant.tool) adders.addTool(grant.tool);
      if ((type === 'saving throw' || type === 'saving throw proficiency' || type === 'saving-throw' || type === 'save') && grant.ability) adders.addSave(grant.ability);
      if (type === 'weapon' && grant.weapon) adders.addWeapon(grant.weapon);
    });
  }

  function addRaceOriginProficiencies(race, adders) {
    getRaceOriginRows(race, 'languages').forEach(grant => {
      if (grant && grant.language) adders.addLanguage(grant.language);
    });
    getRaceOriginRows(race, 'skills').forEach(grant => {
      if (grant && grant.skill) adders.addSkill(grant.skill);
    });
    getRaceOriginRows(race, 'tools').forEach(grant => {
      if (grant && grant.tool) adders.addTool(grant.tool);
    });
    getRaceOriginRows(race, 'savingThrows').forEach(grant => {
      if (grant && grant.ability) adders.addSave(grant.ability);
    });
    getRaceOriginRows(race, 'weapons').forEach(grant => {
      if (grant && grant.weapon) adders.addWeapon(grant.weapon);
    });
  }

  function addRuleTextProficiencies(text, adders) {
    const raw = cleanRulesText(text || '');
    if (!raw) return;
    const clean = normalize(raw);
    if (/proficiency in all saving throws|proficient in all saving throws|proficiency with all saving throws/i.test(raw)) {
      ABILITIES.forEach(adders.addSave);
    }
    ABILITIES.forEach(ability => {
      const name = ABILITY_NAMES[ability];
      if (new RegExp(`\\b(?:gain|gains|have|has|grants? you|acquire|acquires)[^.]{0,80}\\bproficiency\\b[^.]{0,80}\\b${escapeRegExp(name)}\\s+saving throws?\\b`, 'i').test(raw)
        || new RegExp(`\\bproficiency\\b[^.]{0,40}\\b${escapeRegExp(name)}\\s+saving throws?\\b`, 'i').test(raw)) {
        adders.addSave(ability);
      }
    });
    SKILL_OPTIONS.forEach(skill => {
      if (new RegExp(`\\b(?:proficiency in|proficient in|proficiency with) (?:the )?${escapeRegExp(skill)} skill\\b`, 'i').test(raw)) {
        adders.addSkill(skill);
      }
    });
    TOOL_OPTIONS.forEach(tool => {
      if (new RegExp(`\\b(?:proficiency with|proficient with|proficiency in) (?:the )?${escapeRegExp(tool)}\\b`, 'i').test(raw)) {
        adders.addTool(tool);
      }
    });
    const languageMatch = raw.match(/\b(?:speak, read, and write|speak, read, write|speak and read|learn to speak, read, and write|can speak)\s+([^.]*)/i);
    if (languageMatch) {
      const languageText = languageMatch[1].split(/\b(?:one|two|three|\d+)\s+(?:extra\s+)?languages?\s+of your choice\b/i)[0];
      LANGUAGE_OPTIONS.forEach(language => {
        if (new RegExp(`\\b${escapeRegExp(language)}\\b`, 'i').test(languageText)) adders.addLanguage(language);
      });
    }
    inferWeaponProficienciesFromText(raw, clean).forEach(adders.addWeapon);
  }

  function inferWeaponProficienciesFromText(raw, clean) {
    const out = [];
    const mentionsProficiency = /\b(?:gain|gains|have|has|grants? you|acquire|acquires|are|is)\b[^.]{0,80}\bproficien(?:cy|t)\b/i.test(raw)
      || /\bproficien(?:cy|t)\b[^.]{0,80}\bweapons?\b/i.test(raw);
    if (!mentionsProficiency) return out;
    const limitedMartialChoice = /\b(?:one|two|three|four|\d+)\s+martial weapons?\b/i.test(raw)
      || /\bmartial weapons?\s+of your choice\b/i.test(raw);
    const limitedSimpleChoice = /\b(?:one|two|three|four|\d+)\s+simple weapons?\b/i.test(raw)
      || /\bsimple weapons?\s+of your choice\b/i.test(raw);
    if (/\ball simple and martial weapons\b/i.test(raw) || /\ball simple weapons\b/i.test(raw)) out.push('Simple weapons');
    if (/\ball simple and martial weapons\b/i.test(raw) || /\ball martial weapons\b/i.test(raw)) out.push('Martial weapons');
    if (!limitedSimpleChoice && /\bproficien(?:cy|t)\b[^.]{0,80}\bsimple weapons\b/i.test(raw)) out.push('Simple weapons');
    if (!limitedMartialChoice && /\bproficien(?:cy|t)\b[^.]{0,80}\bmartial weapons\b/i.test(raw)) out.push('Martial weapons');
    if (/\bfirearms?\b/i.test(raw) && /\bproficien(?:cy|t)\b/i.test(raw)) out.push('Firearms');
    if (!limitedMartialChoice && /\bmartial training\b/.test(clean) && /\bmartial weapons\b/.test(clean) && !/\btwo martial weapons\b/.test(clean)) out.push('Martial weapons');

    const proficiencyClauses = [...raw.matchAll(/\bproficien(?:cy|t)\b(?:\s+with|\s+in)?\s+(?:the\s+)?([^.;:]+?)(?:\.|;|:|$)/gi)]
      .map(match => match[1]);
    proficiencyClauses.forEach(clause => {
      clause
        .replace(/\b(?:simple|martial) weapons?\b/gi, '')
        .split(/,|\band\b|\bor\b/gi)
        .map(part => normalizeWeaponProficiency(part))
        .filter(Boolean)
        .forEach(weapon => out.push(weapon));
    });
    return uniqueText(out);
  }

  function normalizeAbilitySaveKey(value) {
    const raw = String(value || '').replace(/\bsaving throws?\b|\bsaves?\b/gi, '').trim();
    return getAbilityKeyFromChoice(raw);
  }

  function normalizeSkillKey(value) {
    const clean = normalizeProficiencyChoice(value);
    if (!clean) return '';
    const compact = clean.replace(/\s+/g, '');
    for (const option of SKILL_OPTIONS) {
      const key = SKILL_KEYS[option];
      if (clean === normalizeProficiencyChoice(option)
        || clean === normalizeProficiencyChoice(key)
        || compact === normalizeProficiencyChoice(option).replace(/\s+/g, '')
        || compact === normalizeProficiencyChoice(key).replace(/\s+/g, '')) {
        return key;
      }
    }
    return '';
  }

  function normalizeKnownProficiency(value, knownOptions) {
    const clean = cleanString(value);
    if (!clean) return '';
    return toKnownOption(clean, knownOptions) || clean;
  }

  function normalizeToolProficiency(value) {
    const clean = normalize(value);
    if (/\bwater\b.*\bvehicles?\b|\bvehicles?\b.*\bwater\b/.test(clean)) return 'Vehicles (water)';
    if (/\bland\b.*\bvehicles?\b|\bvehicles?\b.*\bland\b/.test(clean)) return 'Vehicles (land)';
    return normalizeKnownProficiency(value, TOOL_OPTIONS);
  }

  function normalizeWeaponProficiency(value) {
    const clean = normalize(value);
    if (!clean || /\b(?:armor|shield|tool|tools|language|languages|skill|skills)\b/.test(clean)) return '';
    if (clean === 'simple weapons' || clean === 'all simple weapons') return 'Simple weapons';
    if (clean === 'martial weapons' || clean === 'all martial weapons') return 'Martial weapons';
    return toKnownOption(value, WEAPON_OPTIONS);
  }

  function orderByKnownValues(values, order) {
    const byKey = new Map((values || []).map(value => [normalizeProficiencyChoice(value), value]));
    const out = [];
    (order || []).forEach(value => {
      const key = normalizeProficiencyChoice(value);
      if (!byKey.has(key)) return;
      out.push(byKey.get(key));
      byKey.delete(key);
    });
    return [...out, ...[...byKey.values()].sort((a, b) => String(a).localeCompare(String(b)))];
  }

  function resolveSelections(rules, indexes, profile, character, report) {
    const classLevels = character.classLevels
      .map(entry => ({
        ...entry,
        classRow: indexes.classesById.get(entry.classId) || null,
        subclassRow: indexes.subclassesById.get(entry.subclassId || character.subclassId) || null,
      }));
    const primaryClassLevel = classLevels[0] || null;
    const primaryClass = primaryClassLevel && primaryClassLevel.classRow || indexes.classesById.get(character.classId) || null;
    const primarySubclass = indexes.subclassesById.get(character.subclassId)
      || (primaryClassLevel && primaryClassLevel.subclassRow)
      || null;
    const race = indexes.racesById.get(character.raceId) || null;
    const background = indexes.backgroundsById.get(character.backgroundId) || null;
    const feats = resolveRowsByIds(indexes.featsById, character.featIds, 'feat', report);
    const items = resolveRowsByIds(indexes.itemsById, character.itemIds, 'item', report);
    const spells = resolveRowsByIds(indexes.spellsById, character.spellIds, 'spell', report);
    return {
      classLevels,
      primaryClass,
      primarySubclass,
      race,
      background,
      feats,
      items,
      spells,
    };
  }

  function validateCoreBuild(rules, indexes, profile, character, selected, report, options) {
    if (character.rulesetId && character.rulesetId !== profile.id) {
      addIssue(report, 'warning', 'ruleset_mismatch', `Character references "${character.rulesetId}", but the active campaign ruleset is "${profile.id}".`);
    }
    if (!selected.primaryClass) addIssue(report, 'error', 'missing_class', 'Choose an official 2014 class.');
    if (!selected.race) addIssue(report, 'error', 'missing_race', 'Choose an official 2014 race.');
    if (!selected.background) addIssue(report, 'warning', 'missing_background', 'Choose an official 2014 background.');
    if (character.level < 1 || character.level > 20) addIssue(report, 'error', 'invalid_level', 'Character level must be between 1 and 20.', { level: character.level });
    const classLevelTotal = sumClassLevels(selected.classLevels);
    if (selected.classLevels.length && classLevelTotal !== character.level) {
      addIssue(report, 'error', 'class_level_total_mismatch', 'Class levels must add up to character level.', {
        characterLevel: character.level,
        classLevelTotal,
      });
    }
    selected.classLevels.forEach(entry => {
      if (!entry.classRow) addIssue(report, 'error', 'missing_class_rule_id', `No official class matched id "${entry.classId}".`, { classId: entry.classId });
      if (entry.subclassId && !entry.subclassRow) addIssue(report, 'error', 'missing_subclass_rule_id', `No official subclass matched id "${entry.subclassId}".`, { subclassId: entry.subclassId });
      if (entry.classRow && entry.subclassRow && normalize(entry.subclassRow.className) !== normalize(entry.classRow.name)) {
        addIssue(report, 'error', 'subclass_class_mismatch', `${entry.subclassRow.name} is not a ${entry.classRow.name} subclass.`, {
          classId: entry.classId,
          subclassId: entry.subclassId,
        });
      }
      const unlock = getSubclassUnlockLevel(entry.classRow);
      if (entry.classRow && entry.level >= unlock && !entry.subclassRow) {
        addIssue(report, 'error', 'subclass_required', `${entry.classRow.name} needs a subclass at class level ${unlock}.`, {
          classId: entry.classId,
          unlockLevel: unlock,
        });
      }
      if (entry.classRow && entry.subclassRow && entry.level < unlock) {
        addIssue(report, 'error', 'subclass_too_early', `${entry.classRow.name} cannot choose a subclass before class level ${unlock}.`, {
          classId: entry.classId,
          subclassId: entry.subclassId,
          unlockLevel: unlock,
        });
      }
    });
    if (selected.classLevels.length > 1) validateMulticlassPrereqs(profile, character, selected, report);
    validateAbilityMethod(character, report);
    validateFeatSlots(rules, indexes, profile, character, selected, report);
    validateFeatPrerequisites(character, selected, report);
    validateRaceCompleteness(rules, profile, selected, report);
    if (options.levelUpFrom && character.level !== options.levelUpFrom + 1) {
      addIssue(report, 'error', 'levelup_target_invalid', 'The assistant only supports the next character level in this flow.', {
        currentLevel: options.levelUpFrom,
        targetLevel: character.level,
      });
    }
  }

  function validateAbilityMethod(character, report) {
    const scores = ABILITIES.map(ability => Number(character.abilities[ability]) || 10);
    if (character.abilityMethod === 'standard-array') {
      const standard = [15, 14, 13, 12, 10, 8].sort((a, b) => a - b).join(',');
      if (scores.slice().sort((a, b) => a - b).join(',') !== standard) {
        addIssue(report, 'warning', 'standard_array_mismatch', 'Ability scores do not match the 2014 standard array before racial/ASI changes.');
      }
    }
    if (character.abilityMethod === 'point-buy') {
      const cost = scores.reduce((sum, score) => sum + pointBuyCost(score), 0);
      if (scores.some(score => score < 8 || score > 15) || cost > 27) {
        addIssue(report, 'warning', 'point_buy_invalid', 'Point buy scores must be 8-15 before racial/ASI changes and cost at most 27 points.', { cost });
      }
    }
  }

  function pointBuyCost(score) {
    const costs = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
    return costs[score] === undefined ? 99 : costs[score];
  }

  function validateMulticlassPrereqs(profile, character, selected, report) {
    if (!profile.multiclassingEnabled) {
      addIssue(report, 'error', 'multiclass_disabled', 'Multiclassing is not enabled in this ruleset.');
      return;
    }
    selected.classLevels.forEach(entry => {
      const cls = entry.classRow;
      if (!cls) return;
      const prereq = MULTICLASS_PREREQS[slugify(cls.name)];
      if (!prereq) return;
      const checks = Object.entries(prereq).filter(([key]) => key !== 'any');
      const ok = prereq.any
        ? checks.some(([ability, minimum]) => (Number(character.abilities[ability]) || 0) >= minimum)
        : checks.every(([ability, minimum]) => (Number(character.abilities[ability]) || 0) >= minimum);
      if (!ok) {
        const text = checks.map(([ability, minimum]) => `${ABILITY_NAMES[ability]} ${minimum}`).join(prereq.any ? ' or ' : ' and ');
        addIssue(report, 'error', 'multiclass_prerequisite_unmet', `${cls.name} multiclassing requires ${text}.`, { classId: cls.id });
      }
    });
  }

  function validateFeatSlots(rules, indexes, profile, character, selected, report) {
    if (!profile.featsEnabled && character.featIds.length) {
      addIssue(report, 'error', 'feats_disabled', 'Feats are not enabled in this ruleset.');
      return;
    }
    const slots = getFeatSlotCount(rules, indexes, character);
    if (character.featIds.length > slots) {
      addIssue(report, 'error', 'too_many_feats', `This character has ${character.featIds.length} feats but only ${slots} ASI/feat slot(s) are unlocked by level.`, {
        featCount: character.featIds.length,
        featSlots: slots,
      });
    }
  }

  function validateSpellChoices(rules, indexes, character, selected, report, features = [], spellGrants = []) {
    if (!character.spellIds.length) return;
    const maxLevel = getMaxSpellLevel(rules, indexes, character);
    const spellcastingAbility = getSpellcastingAbility(selected);
    const featureSpellIds = new Set(getFeatureGrantedSpellIds(rules, indexes, character, selected, features, spellGrants));
    if (!spellcastingAbility && !featureSpellIds.size) {
      addIssue(report, 'warning', 'spells_without_spellcasting', 'Spells are selected, but no class spellcasting progression is active.');
      return;
    }
    selected.spells.forEach(spell => {
      const grantedByFeature = featureSpellIds.has(spell.id);
      if (grantedByFeature) return;
      const spellLevel = getSpellLevelNumber(spell.level);
      if (spellLevel > maxLevel) {
        addIssue(report, 'error', 'spell_level_too_high', `${spell.name} is level ${spellLevel}, above the current spell level cap ${maxLevel}.`, {
          spellId: spell.id,
          spellLevel,
          maxSpellLevel: maxLevel,
        });
      }
      if (!spellIsOnAnyKnownList(spell, selected)) {
        addIssue(report, 'warning', 'spell_list_unverified', `${spell.name} is not on the selected class/subclass spell lists found in the rules data.`, {
          spellId: spell.id,
        });
      }
    });
  }

  function getFeatureGrantedSpellIds(rules, indexes, character, selected, features, spellGrants = []) {
    const grants = Array.isArray(spellGrants) && spellGrants.length
      ? spellGrants
      : getFeatureGrantedSpellEntries(rules, indexes, character, selected, features);
    return uniqueText(grants.filter(grant => !grant.listAddition).map(grant => grant.spellId));
  }

  function getFeatureGrantedSpellEntries(rules, indexes, character, selected, features = []) {
    const spells = rules.spells || [];
    const sources = getSpellGrantSources(selected, features);
    if (!spells.length || !sources.length) return [];
    const out = [];
    sources.forEach(feature => {
      extractFeatureGrantedSpellEntries(spells, character, selected, feature).forEach(entry => out.push(entry));
    });
    return uniqueBy(out, grant => `${grant.spellId}:${grant.sourceFeatureId}:${grant.grantMode}:${grant.listAddition ? grant.spellListLevel || '' : ''}`)
      .sort((a, b) => Number(a.levelGate || a.spellListLevel || 0) - Number(b.levelGate || b.spellListLevel || 0)
        || String(a.sourceFeatureName).localeCompare(String(b.sourceFeatureName))
        || String(a.name).localeCompare(String(b.name)));
  }

  function getSpellGrantSources(selected, features = []) {
    const sources = [...(features || [])];
    if (selected && selected.race) sources.push(selected.race);
    if (selected && selected.background) sources.push(selected.background);
    (selected && selected.feats || []).forEach(feat => sources.push(feat));
    return uniqueBy(sources.filter(Boolean), source => `${source.id || source.name}:${source.kind || source.origin && source.origin.type || ''}`);
  }

  function extractFeatureGrantedSpellEntries(spells, character, selected, feature) {
    const structured = extractStructuredFeatureGrantedSpellEntries(spells, character, selected, feature);
    if (structured.length) return structured;
    const text = cleanRulesText(feature && feature.text || '');
    if (!feature || !text || !/\b(?:spell|spells|cantrip|cantrips)\b/i.test(text)) return [];
    const grantMode = inferFeatureSpellGrantMode(feature, text);
    if (!featureHasSpecificSpellGrantLanguage(feature, text, grantMode)) return [];
    const choiceTableEntries = extractChoiceTableSpellGrantEntries(spells, character, selected, feature, text, grantMode);
    if (choiceTableEntries) return choiceTableEntries;
    if (hasUnresolvedSpellGrantChoice(feature, text, grantMode)) return [];
    const matches = findSpellMatchesInText(spells, text);
    if (!matches.length) return [];

    const progressionLevel = getFeatureProgressionLevel(character, selected, feature);
    return matches.map(match => {
      if (!spellMatchHasGrantContext(feature, text, match, grantMode)) return null;
      const matchGrantMode = inferSpellGrantModeForMatch(match, grantMode);
      const levelMarker = inferSpellGrantLevelForMatch(match.normalizedText, match.start, Number(feature.level || 1) || 1);
      const listAddition = matchGrantMode === 'spell-list';
      if (!listAddition && levelMarker > progressionLevel) return null;
      const spell = match.spell;
      return {
        id: `${feature.id || slugify(feature.name)}:${spell.id}`,
        spell,
        spellId: spell.id,
        name: spell.name,
        level: spell.level || '',
        spellLevel: getSpellLevelNumber(spell.level),
        sourceBook: spell.source || '',
        grantMode: matchGrantMode,
        granted: !listAddition,
        autoGranted: !listAddition,
        nonRemovable: !listAddition,
        removable: listAddition,
        listAddition,
        autoPrepared: matchGrantMode === 'prepared',
        autoKnown: matchGrantMode === 'known',
        featureCast: matchGrantMode === 'feature-cast',
        levelGate: listAddition ? null : levelMarker,
        spellListLevel: listAddition ? levelMarker : null,
        sourceFeatureId: feature.id || '',
        sourceFeatureName: feature.name || '',
        sourceType: feature.kind || '',
        className: feature.className || '',
        subclassName: feature.subclassShortName || feature.subclassName || '',
        raceName: feature.raceName || '',
        raceId: feature.raceId || '',
        source: feature.source || '',
      };
    }).filter(Boolean);
  }

  function extractStructuredFeatureGrantedSpellEntries(spells, character, selected, feature) {
    const grants = getStructuredFeatureGrants(feature, 'spell');
    if (!feature || !grants.length) return [];
    const progressionLevel = getFeatureProgressionLevel(character, selected, feature);
    return grants.map(grant => {
      const levelGate = Number(grant.levelGate || grant.level || feature.level || 1) || 1;
      if (levelGate > progressionLevel) return null;
      const spell = findSpellForStructuredGrant(spells, grant);
      if (!spell) return null;
      return formatStructuredFeatureSpellGrant(feature, grant, spell, levelGate);
    }).filter(Boolean);
  }

  function formatStructuredFeatureSpellGrant(feature, grant, spell, levelGate) {
    const grantMode = normalizeStructuredSpellGrantMode(grant);
    const listAddition = grantMode === 'spell-list';
    const castLevel = grant.castLevel === null || grant.castLevel === undefined || grant.castLevel === ''
      ? null
      : Number(grant.castLevel);
    return {
      id: `${feature.id || slugify(feature.name)}:${spell.id}`,
      spell,
      spellId: spell.id,
      name: spell.name,
      level: spell.level || '',
      spellLevel: getSpellLevelNumber(spell.level),
      sourceBook: spell.source || '',
      castLevel: Number.isFinite(castLevel) ? castLevel : null,
      grantMode,
      granted: !listAddition,
      autoGranted: !listAddition,
      nonRemovable: grant.nonRemovable !== undefined ? Boolean(grant.nonRemovable) : !listAddition,
      removable: listAddition,
      listAddition,
      autoPrepared: grantMode === 'prepared',
      autoKnown: grantMode === 'known' || Boolean(grant.autoKnown),
      featureCast: grantMode === 'feature-cast',
      levelGate: listAddition ? null : levelGate,
      spellListLevel: listAddition ? levelGate : null,
      ability: getAbilityKeyFromChoice(grant.ability || grant.spellcastingAbility),
      abilityOptions: normalizeIds(grant.abilityOptions || grant.abilities || []),
      uses: grant.uses || '',
      reset: grant.reset || '',
      canUseSpellSlots: Boolean(grant.canUseSpellSlots),
      consumesSlot: grant.consumesSlot === undefined ? null : Boolean(grant.consumesSlot),
      resourceId: grant.resourceId || '',
      sourceFeatureId: feature.id || '',
      sourceFeatureName: feature.name || '',
      sourceType: getRuleSourceType(feature),
      className: feature.className || '',
      subclassName: feature.subclassShortName || feature.subclassName || '',
      raceName: feature.raceName || '',
      raceId: feature.raceId || '',
      source: feature.source || '',
    };
  }

  function normalizeStructuredSpellGrantMode(grant) {
    const mode = normalize(grant && (grant.grantMode || grant.mode || grant.type));
    if (mode === 'spell list' || mode === 'spell-list') return 'spell-list';
    if (mode === 'feature cast' || mode === 'feature-cast' || mode === 'innate') return 'feature-cast';
    if (mode === 'known' || grant && grant.autoKnown) return 'known';
    if (mode === 'prepared' || grant && grant.autoPrepared) return 'prepared';
    return 'granted';
  }

  function findSpellForStructuredGrant(spells, grant) {
    const keys = [grant && grant.spellId, grant && grant.spellName, grant && grant.name]
      .flatMap(value => [value, slugify(value)])
      .map(normalize)
      .filter(Boolean);
    if (!keys.length) return null;
    return (spells || []).find(spell => {
      const spellKeys = [spell && spell.id, spell && spell.name, slugify(spell && spell.name)].map(normalize);
      return spellKeys.some(key => keys.includes(key));
    }) || null;
  }

  function getStructuredFeatureGrants(feature, type = '') {
    return getRuleGrants(feature, type);
  }

  function getRuleGrants(rule, type = '') {
    const grants = uniqueBy([
      ...(Array.isArray(rule && rule.grants) ? rule.grants : []),
      ...(Array.isArray(rule && rule.origin && rule.origin.grants) ? rule.origin.grants : []),
    ], getGrantKey);
    if (!type) return grants;
    const target = normalize(type);
    return grants.filter(grant => normalize(grant && grant.type) === target);
  }

  function getGrantKey(grant) {
    return [
      grant && grant.type,
      grant && (grant.spellId || grant.featId || grant.spellName || grant.featName || grant.language || grant.skill || grant.tool || grant.weapon || grant.ability || grant.damageType || grant.movement || grant.sense || grant.name || grant.value || grant.optionSet),
      grant && (grant.levelGate || ''),
      grant && (grant.mode || grant.grantMode || ''),
      grant && (grant.count || ''),
      Array.isArray(grant && grant.options) ? grant.options.join('|') : grant && grant.options || '',
    ].map(value => String(value || '').toLowerCase()).join(':');
  }

  function getRuleSourceType(rule) {
    if (rule && rule.kind) return rule.kind;
    const originType = normalize(rule && rule.origin && rule.origin.type).replace(/\s+origin$/, '');
    return originType || '';
  }

  function extractChoiceTableSpellGrantEntries(spells, character, selected, feature, text, grantMode) {
    const table = getChoiceSpellGrantTable(text);
    if (!table || !table.options.length) return null;
    const choice = resolveChoiceSpellGrantOption(table, character, selected, feature);
    if (!choice) return [];
    const option = table.options.find(row => normalize(row.name) === normalize(choice));
    if (!option) return [];
    const progressionLevel = getFeatureProgressionLevel(character, selected, feature);
    const mode = grantMode === 'spell-list' ? 'spell-list' : 'prepared';
    const matches = [];
    for (const entry of option.entries) {
      if (entry.levelGate > progressionLevel) continue;
      findSpellMatchesInText(spells, entry.text).forEach(match => {
        matches.push({ ...match, levelGate: entry.levelGate });
      });
    }
    return uniqueBy(matches, match => match.spell && match.spell.id)
      .map(match => formatFeatureSpellGrant(feature, match.spell, mode, match.levelGate, choice));
  }

  function getChoiceSpellGrantTable(text) {
    const clean = cleanRulesText(text || '');
    if (!/\bchoose that land\b|\bchoose the land\b|\bconnected to the land where\b|\bconsult the associated list of spells\b/i.test(clean)) return null;
    return getNamedSpellGrantTable(clean, FAVORED_TERRAIN_OPTIONS);
  }

  function getNamedSpellGrantTable(text, optionNames) {
    const markers = [];
    for (const name of optionNames || []) {
      const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'ig');
      let match;
      while ((match = pattern.exec(text))) markers.push({ name, index: match.index, length: match[0].length });
    }
    const ordered = markers
      .filter(marker => /\b\d+(?:st|nd|rd|th)\b/i.test(text.slice(marker.index + marker.length, marker.index + marker.length + 80)))
      .sort((a, b) => a.index - b.index);
    if (!ordered.length) return null;
    const options = ordered.map((marker, index) => {
      const start = marker.index + marker.length;
      const end = index + 1 < ordered.length ? ordered[index + 1].index : text.length;
      return {
        name: marker.name,
        entries: parseLeveledSpellListText(text.slice(start, end)),
      };
    }).filter(option => option.entries.length);
    return options.length ? { options } : null;
  }

  function parseLeveledSpellListText(text) {
    const markers = Array.from(String(text || '').matchAll(/\b(\d+)(?:st|nd|rd|th)(?:\s+level)?\b/ig));
    return markers.map((marker, index) => {
      const start = marker.index + marker[0].length;
      const end = index + 1 < markers.length ? markers[index + 1].index : text.length;
      return {
        levelGate: Number(marker[1]) || 1,
        text: text.slice(start, end),
      };
    }).filter(entry => entry.text.trim());
  }

  function resolveChoiceSpellGrantOption(table, character, selected, feature) {
    const explicit = getExplicitSpellGrantChoice(character, feature, table.options.map(option => option.name));
    if (explicit) return explicit;
    return inferSpellGrantChoiceFromSelectedSpells(table, selected);
  }

  function getExplicitSpellGrantChoice(character, feature, options) {
    const choices = character && character.featureChoices || {};
    const keys = [
      feature && feature.id,
      feature && feature.name,
      `${feature && feature.id}:choice`,
      `${feature && feature.id}:land`,
      `${feature && feature.id}:terrain`,
      `${feature && feature.name}:choice`,
      `${feature && feature.name}:land`,
      `${feature && feature.name}:terrain`,
      'Circle of the Land',
      'Circle Spells',
      'Druid Circle',
    ].map(normalize).filter(Boolean);
    const optionNames = (options || []).map(option => ({ raw: option, key: normalize(option) }));
    for (const [rawKey, rawValue] of Object.entries(choices)) {
      const key = normalize(rawKey);
      if (!keys.includes(key) && !keys.some(candidate => key.includes(candidate))) continue;
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      for (const value of values) {
        const valueKey = normalize(value);
        const matched = optionNames.find(option => option.key === valueKey);
        if (matched) return matched.raw;
      }
    }
    return '';
  }

  function inferSpellGrantChoiceFromSelectedSpells(table, selected) {
    const selectedSpellIds = new Set((selected && selected.spells || []).map(spell => spell && spell.id).filter(Boolean));
    if (!selectedSpellIds.size) return '';
    const scores = (table.options || []).map(option => {
      const spellIds = new Set();
      const text = normalize(entryText(option));
      (selected.spells || []).forEach(spell => {
        const key = normalize(spell && spell.name);
        if (key && new RegExp(`\\b${escapeRegExp(key).replace(/\s+/g, '\\s+')}\\b`, 'i').test(text)) {
          spellIds.add(spell.id);
        }
      });
      return {
        name: option.name,
        score: Array.from(spellIds).filter(id => selectedSpellIds.has(id)).length,
      };
    }).sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
    if (!scores.length || scores[0].score <= 0) return '';
    if (scores[1] && scores[1].score === scores[0].score) return '';
    return scores[0].name;
  }

  function entryText(option) {
    return (option && option.entries || []).map(entry => entry.text).join(' ');
  }

  function formatFeatureSpellGrant(feature, spell, grantMode, levelMarker, choice = '') {
    const listAddition = grantMode === 'spell-list';
    return {
      id: `${feature.id || slugify(feature.name)}:${spell.id}`,
      spell,
      spellId: spell.id,
      name: spell.name,
      level: spell.level || '',
      spellLevel: getSpellLevelNumber(spell.level),
      sourceBook: spell.source || '',
      grantMode,
      granted: !listAddition,
      autoGranted: !listAddition,
      nonRemovable: !listAddition,
      removable: listAddition,
      listAddition,
      autoPrepared: grantMode === 'prepared',
      autoKnown: grantMode === 'known',
      featureCast: grantMode === 'feature-cast',
      levelGate: listAddition ? null : levelMarker,
      spellListLevel: listAddition ? levelMarker : null,
      sourceFeatureId: feature.id || '',
      sourceFeatureName: feature.name || '',
      sourceType: feature.kind || '',
      className: feature.className || '',
      subclassName: feature.subclassShortName || feature.subclassName || '',
      raceName: feature.raceName || '',
      raceId: feature.raceId || '',
      choice,
      source: feature.source || '',
    };
  }

  function spellMatchHasGrantContext(feature, text, match, grantMode) {
    const tableGrant = isSpellTableGrantFeature(feature, text);
    if ((grantMode === 'prepared' || grantMode === 'spell-list') && tableGrant) {
      return spellMatchLooksTableListed(match);
    }
    if ((grantMode === 'prepared' || grantMode === 'spell-list') && spellMatchHasNearbyGrantPhrase(match)) return true;
    if (tableGrant && spellMatchLooksTableListed(match)) return true;
    const before = match.normalizedText.slice(Math.max(0, match.start - 140), match.start);
    const after = match.normalizedText.slice(match.end, Math.min(match.normalizedText.length, match.end + 100));
    if (/\b(?:you can cast|can also cast|cast either|cast any of these|cast the|gain the ability to cast|ability to cast)\b/.test(before)) return true;
    if (/\byou (?:also )?(?:know|learn)\b/.test(before) && /\b(?:cantrip|spell|spells|doesn t count|don t count)\b/.test(after)) return true;
    if (/\byou (?:also )?(?:know|learn)(?: the)?\s*$/.test(before)) return true;
    return false;
  }

  function spellMatchHasNearbyGrantPhrase(match) {
    const before = match.normalizedText.slice(Math.max(0, match.start - 160), match.start);
    const after = match.normalizedText.slice(match.end, Math.min(match.normalizedText.length, match.end + 100));
    return /\b(?:always have|add the listed|add the following|following spells|spells listed|spells table|spells prepared)\b/.test(before)
      || /\b(?:prepared|doesn t count|don t count)\b/.test(after);
  }

  function spellMatchLooksTableListed(match) {
    const before = match.normalizedText.slice(Math.max(0, match.start - 90), match.start);
    return /\b\d+(?:st|nd|rd|th)\b[^0-9]*$/.test(before);
  }

  function inferSpellGrantModeForMatch(match, defaultMode) {
    if (defaultMode === 'prepared' || defaultMode === 'spell-list') return defaultMode;
    const before = match.normalizedText.slice(Math.max(0, match.start - 140), match.start);
    if (/\b(?:you can cast|can also cast|cast either|cast any of these|cast the|gain the ability to cast|ability to cast)\b/.test(before)) return 'feature-cast';
    if (/\byou (?:also )?(?:know|learn)\b/.test(before)) return 'known';
    return defaultMode;
  }

  function isSpellTableGrantFeature(feature, text) {
    const name = normalize(feature && feature.name);
    const clean = cleanRulesText(text || '');
    return /\b(?:spells table|spells listed|following spells|shown (?:in|on) the [^.]*spells?)\b/i.test(clean)
      || (/\bspells\b/.test(name) && /\b\d+(?:st|nd|rd|th)\b/i.test(clean));
  }

  function featureHasSpecificSpellGrantLanguage(feature, text, grantMode) {
    const name = normalize(feature && feature.name);
    const clean = String(text || '').toLowerCase();
    if (feature && feature.kind === 'class' && (name === 'spellcasting' || name === 'pact magic')) return false;
    if (grantMode === 'spell-list') return true;
    return /\b(always have|add the listed spells|add the listed|you gain [a-z' -]*spells?|you learn|you know|you can cast|gain the ability to cast|ability to cast|following spells|spells listed|spells table|doesn't count against the number of|don't count against the number of)\b/i.test(clean);
  }

  function hasUnresolvedSpellGrantChoice(feature, text, grantMode) {
    if (grantMode === 'spell-list') return false;
    const clean = cleanRulesText(text || '');
    if (/\bchoose that land\b|\bchoose the land\b|\bconnected to the land where\b|\bconsult the associated list of spells\b/i.test(clean)) return true;
    if (/\b(?:choose|learn|know|temporarily learn)[^.]{0,120}\bspells? of your choice\b/i.test(clean)) return true;
    if (/\bspell of your choice from\b/i.test(clean)) return true;
    if (/\bone of the following cantrips? of your choice\b/i.test(clean)) return true;
    if (/\bcantrips? of your choice from\b/i.test(clean)) return true;
    return false;
  }

  function inferFeatureSpellGrantMode(feature, text) {
    const name = normalize(feature && feature.name);
    const clean = String(text || '').toLowerCase();
    if (/\bexpanded spell list\b|\bexpanded spells\b|\badded to the [a-z' -]*spell list\b|\bspell list for you\b/i.test(clean)) return 'spell-list';
    if (/\boath(?:breaker)? spells?\b|\bdomain spells?\b|\bcircle spells?\b|\balchemist spells?\b|\barmorer spells?\b|\bartillerist spells?\b|\bbattle smith spells?\b/.test(name)
      || /\balways have [^.]{0,80}prepared\b|\bspells prepared\b|\bspells to your spells prepared\b|\bnumber of spells you (?:can )?prepare\b/i.test(clean)) {
      return 'prepared';
    }
    if (/\bpsionic spells?\b|\bmagic\b/.test(name) && /\byou learn\b/i.test(clean)) return 'known';
    if (/\byou learn\b|\byou know\b|\bnumber of [a-z' -]*spells you know\b/i.test(clean)) return 'known';
    if (/\byou can cast\b|\bability to cast\b|\bcast the [a-z' -]+ spell\b/i.test(clean)) return 'feature-cast';
    return 'granted';
  }

  function getFeatureProgressionLevel(character, selected, feature) {
    if (!feature) return Number(character && character.level) || 1;
    if (feature.kind === 'class' || feature.kind === 'subclass') {
      const className = normalize(feature.className);
      const entry = (selected && selected.classLevels || []).find(row => row.classRow && normalize(row.classRow.name) === className);
      return Number(entry && entry.level) || Number(character && character.level) || Number(feature.level) || 1;
    }
    return Number(character && character.level) || Number(feature.level) || 1;
  }

  function findSpellMatchesInText(spells, text) {
    const normalizedText = ` ${normalize(text)} `;
    const candidates = [];
    (spells || []).forEach(spell => {
      const name = normalize(spell && spell.name);
      if (!name) return;
      const needle = ` ${name} `;
      let index = normalizedText.indexOf(needle);
      while (index !== -1) {
        candidates.push({
          spell,
          start: index + 1,
          end: index + needle.length - 1,
          length: needle.length,
          normalizedText,
        });
        index = normalizedText.indexOf(needle, index + 1);
      }
    });
    const accepted = [];
    candidates
      .sort((a, b) => b.length - a.length || a.start - b.start || String(a.spell.name).localeCompare(String(b.spell.name)))
      .forEach(candidate => {
        if (accepted.some(match => rangesOverlap(candidate.start, candidate.end, match.start, match.end))) return;
        accepted.push(candidate);
      });
    return accepted.sort((a, b) => a.start - b.start);
  }

  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
  }

  function inferSpellGrantLevelForMatch(normalizedText, matchStart, fallbackLevel) {
    const before = String(normalizedText || '').slice(0, Math.max(0, matchStart));
    const window = before.slice(Math.max(0, before.length - 220));
    let level = Number(fallbackLevel) || 1;
    const pattern = /\b(\d+)(?:st|nd|rd|th)\b/g;
    let match;
    while ((match = pattern.exec(window))) {
      const value = Number(match[1]);
      if (value >= 1 && value <= 20) level = value;
    }
    return level;
  }

  function validateFeatPrerequisites(character, selected, report) {
    selected.feats.forEach(feat => {
      const text = normalize(feat.prerequisites || '');
      if (!text) return;
      const levelMatch = text.match(/(\d+)(?:st|nd|rd|th)? level/);
      if (levelMatch && character.level < Number(levelMatch[1])) {
        addIssue(report, 'error', 'feat_level_prerequisite_unmet', `${feat.name} requires level ${levelMatch[1]}.`, { featId: feat.id });
      }
      ABILITIES.forEach(ability => {
        const full = normalize(ABILITY_NAMES[ability]);
        const match = text.match(new RegExp(`${full}\\s+(\\d+)`));
        if (match && (Number(character.abilities[ability]) || 0) < Number(match[1])) {
          addIssue(report, 'error', 'feat_ability_prerequisite_unmet', `${feat.name} requires ${ABILITY_NAMES[ability]} ${match[1]}.`, { featId: feat.id });
        }
      });
    });
  }

  function validateRaceCompleteness(rules, profile, selected, report) {
    const race = selected.race;
    if (!race) return;
    if (!profile.mandatorySubraceBaseRaceIds.includes(race.id)) return;
    const subraceOptions = getChildRaceOptions(rules, race.id);
    addIssue(report, 'error', 'race_subrace_required', `${race.name} needs an official subrace/lineage choice.`, {
      raceId: race.id,
      options: subraceOptions.map(option => option.name),
    });
  }

  function validateChoiceGroups(rules, indexes, profile, character, selected, features, report) {
    const groups = getActiveChoiceGroups(rules, indexes, profile, character, selected, features);
    const inferredSelections = allocateExistingChoiceSelections(rules, indexes, character, groups);
    groups.forEach(group => {
      if (group.kind === 'optional-class-feature') return;
      if (isAbilityScoreImprovementSatisfiedByFeat(rules, indexes, character, group)) return;
      if (isChoiceGroupSatisfied(group, character, inferredSelections.get(group.group) || [])) return;
      const severity = group.required === false ? 'info' : 'warning';
      const kind = group.kind === 'class-feature-choice' || group.kind === 'class-skill-choice' || group.kind === 'class-tool-choice' || group.kind === 'class-feat'
        ? 'class_feature_choice_unresolved'
        : group.kind === 'subclass-choice'
        ? 'subclass_choice_unresolved'
        : group.kind === 'background-feature-choice' || group.kind === 'background-skill-choice' || group.kind === 'background-language-choice' || group.kind === 'background-tool-choice' || group.kind === 'background-feat'
          ? 'background_choice_unresolved'
        : group.kind === 'ability-score-choice'
          ? 'ability_score_choice_unresolved'
        : group.kind === 'race-ability-choice'
        ? 'race_ability_choice_unresolved'
        : group.kind === 'race-feat'
          ? 'race_feat_choice_unresolved'
          : 'race_feature_choice_unresolved';
      addIssue(report, severity, kind, `${group.label || group.group} needs ${formatChoiceCount(group.count)} selected.`, {
        group: group.group,
        featureId: group.featureId || '',
        raceId: group.raceId || '',
        options: group.options || [],
      });
    });
  }

  function resolveAvailableFeatures(rules, indexes, profile, character, selected, report) {
    const optionalSelections = new Set([
      ...character.optionalFeatureIds,
      ...character.selectedFeatureIds,
    ].map(normalize));
    let features = [];
    selected.classLevels.forEach(entry => {
      if (!entry.classRow) return;
      const className = normalize(entry.classRow.name);
      const subclassNames = new Set([entry.subclassRow && entry.subclassRow.name, entry.subclassRow && entry.subclassRow.shortName].map(normalize).filter(Boolean));
      features.push(...(rules.features || []).filter(feature => {
        if (Number(feature.level || 1) > entry.level) return false;
        if (normalize(feature.className) !== className) return false;
        if (feature.kind === 'class') return true;
        if (feature.kind === 'subclass') {
          return subclassNames.has(normalize(feature.subclassName)) || subclassNames.has(normalize(feature.subclassShortName));
        }
        return false;
      }));
    });
    if (selected.race) {
      features.push(...getRaceFeatures(rules, selected.race, character.level));
    }
    features = uniqueBy(features, feature => feature.id)
      .map(feature => ({ ...feature, optional: isOptionalClassFeature(feature) }));
    features = features.filter(feature => {
      if (!feature.optional) return true;
      const allowed = profile.optionalClassFeaturesDefault
        || optionalSelections.has(normalize(feature.id))
        || optionalSelections.has(normalize(feature.name));
      if (!allowed) {
        addIssue(report, 'info', 'optional_feature_unselected', `Optional rule "${feature.name}" is available. Leave it unselected unless you want to use that optional rule.`, {
          feature: feature.name,
          source: feature.source || '',
        });
      }
      return allowed;
    });
    for (const group of profile.featureChoiceGroups || []) {
      const applies = featureGroupApplies(group, selected, character.level);
      if (!applies) continue;
      const optionNames = new Set(group.options.map(normalize));
      const presentOptions = features.filter(feature => optionNames.has(normalize(feature.name)));
      if (!presentOptions.length) continue;
      const selectedChoice = getChoiceGroupSelection(character.featureChoices, group.group);
      if (!selectedChoice) {
        addIssue(report, 'warning', 'feature_choice_unresolved', `${group.group} needs one selected option.`, {
          group: group.group,
          options: group.options,
        });
        features = features.filter(feature => !optionNames.has(normalize(feature.name)));
        continue;
      }
      const selectedName = normalize(selectedChoice);
      const selectedIds = new Set(presentOptions.filter(feature => normalize(feature.name) === selectedName || normalize(feature.id) === selectedName).map(feature => feature.id));
      if (!selectedIds.size) {
        addIssue(report, 'error', 'feature_choice_invalid', `${selectedChoice} is not a valid ${group.group} option.`, {
          group: group.group,
          selected: selectedChoice,
          options: group.options,
        });
        features = features.filter(feature => !optionNames.has(normalize(feature.name)));
        continue;
      }
      features = features
        .filter(feature => !optionNames.has(normalize(feature.name)) || selectedIds.has(feature.id))
        .map(feature => selectedIds.has(feature.id) ? { ...feature, choiceGroup: group.group, selectedChoice: true } : feature);
    }
    return uniqueBy(features, feature => feature.id);
  }

  function buildResources(rules, indexes, selected, features) {
    const featureIds = new Set(features.map(feature => feature.id));
    const featIds = new Set(selected.feats.map(feat => feat.id));
    const backgroundIds = new Set(selected.background ? [selected.background.id] : []);
    const resources = [];
    for (const resource of rules.resources || []) {
      if (resource.sourceType === 'core') {
        resources.push(resource);
      } else if (resource.sourceType === 'feat' && featIds.has(resource.sourceId)) {
        resources.push(resource);
      } else if (resource.sourceType === 'background' && backgroundIds.has(resource.sourceId)) {
        resources.push(resource);
      } else if (resource.sourceId && featureIds.has(resource.sourceId)) {
        resources.push(repointResourceToFeature(resource, features) || resource);
      } else {
        const matchedFeature = findFeatureForResource(resource, features);
        if (matchedFeature) resources.push(formatFeatureResource(resource, matchedFeature));
      }
    }
    features.map(inferFeatureResource).filter(Boolean).forEach(resource => resources.push(resource));
    selected.items.forEach(item => {
      if (Array.isArray(item.resources)) {
        item.resources.forEach(resource => resources.push({ ...resource, sourceType: 'item', sourceId: item.id, itemName: item.name }));
      }
    });
    return enhanceResourcesWithFeatureMetadata(uniqueBy(resources, resource => resource.id), features);
  }

  function buildActions(rules, indexes, selected, features, spellGrants = []) {
    const featureIds = new Set(features.map(feature => feature.id));
    const featuresById = new Map(features.map(feature => [feature.id, feature]));
    const itemIds = new Set(selected.items.map(item => item.id));
    const featIds = new Set(selected.feats.map(feat => feat.id));
    const manualSpellIds = new Set(selected.spells.map(spell => spell.id));
    const manualSpellKeys = new Set(selected.spells.flatMap(spell => getSpellReferenceKeys(spell && spell.id, spell && spell.name)));
    const subclassGrantedSpellIds = new Set((spellGrants || [])
      .filter(grant => grant && !grant.listAddition && grant.sourceType === 'subclass')
      .flatMap(grant => getSpellReferenceKeys(grant.spellId, grant.name)));
    const spellIds = new Set([
      ...manualSpellIds,
      ...getGrantedSpellIdsFromEntries(spellGrants),
    ]);
    const backgroundIds = new Set(selected.background ? [selected.background.id] : []);
    const actions = (rules.actions || []).filter(action => {
      if (action.sourceType === 'class' || action.sourceType === 'subclass' || action.sourceType === 'race') {
        return featureIds.has(action.sourceId) && !shouldSuppressFeatureAction(action, featuresById.get(action.sourceId));
      }
      if (action.sourceType === 'item') return itemIds.has(action.sourceId);
      if (action.sourceType === 'feat') return featIds.has(action.sourceId);
      if (action.sourceType === 'background') return backgroundIds.has(action.sourceId);
      if (action.sourceType === 'spell') {
        if (!spellActionMatchesAnyKey(action, manualSpellKeys) && isSubclassGrantedShieldAction(action, subclassGrantedSpellIds)) return false;
        return spellIds.has(action.sourceId);
      }
      return false;
    });
    return actions.slice(0, 180);
  }

  function getGrantedSpellIdsFromEntries(spellGrants) {
    return uniqueText((spellGrants || []).filter(grant => grant && !grant.listAddition).map(grant => grant.spellId));
  }

  function getSpellReferenceKeys(id, name) {
    return uniqueText([
      id,
      name,
      slugify(id),
      slugify(name),
      String(id || '').replace(/^spell-/, ''),
      String(name || '').replace(/^spell-/, ''),
    ].map(normalize).filter(Boolean));
  }

  function spellActionMatchesAnyKey(action, keys) {
    if (!action || !keys || !keys.size) return false;
    return getSpellActionKeys(action).some(key => keys.has(key));
  }

  function getSpellActionKeys(action) {
    const title = String(action && (action.title || action.name) || '').replace(/^cast\s+/i, '');
    return getSpellReferenceKeys(action && action.sourceId, title);
  }

  function shouldSuppressFeatureAction(action, feature) {
    return isWildShapeImprovementFeature(feature)
      || isWildShapeImprovementAction(action);
  }

  function isSubclassGrantedShieldAction(action, subclassGrantedSpellIds) {
    return action
      && getSpellActionKeys(action).includes('shield')
      && subclassGrantedSpellIds
      && spellActionMatchesAnyKey(action, subclassGrantedSpellIds);
  }

  function buildEffects(rules, indexes, selected, features) {
    const featureIds = new Set(features.map(feature => feature.id));
    const itemIds = new Set(selected.items.map(item => item.id));
    const featIds = new Set(selected.feats.map(feat => feat.id));
    const backgroundIds = new Set(selected.background ? [selected.background.id] : []);
    return (rules.effects || []).filter(effect => {
      if (effect.sourceType === 'class' || effect.sourceType === 'subclass' || effect.sourceType === 'race') return featureIds.has(effect.sourceId);
      if (effect.sourceType === 'item') return itemIds.has(effect.sourceId);
      if (effect.sourceType === 'feat') return featIds.has(effect.sourceId);
      if (effect.sourceType === 'background') return backgroundIds.has(effect.sourceId);
      return false;
    }).slice(0, 180);
  }

  function buildAvailableChoices(rules, indexes, profile, character, selected, features) {
    const featureChoiceGroups = annotateChoiceGroups(
      rules,
      indexes,
      character,
      getActiveChoiceGroups(rules, indexes, profile, character, selected, features)
    );
    return {
      classes: sortRules(rules.classes || []).map(toChoice),
      races: sortRules(rules.races || []).map(toChoice),
      backgrounds: sortRules(rules.backgrounds || []).map(toChoice),
      subclasses: selected.primaryClass ? getAvailableSubclassesForClass(rules, indexes, selected.primaryClass.id, getClassLevel(character, selected.primaryClass.id) || character.level).map(toChoice) : [],
      feats: sortRules(rules.feats || []).map(toChoice),
      spells: sortRules((rules.spells || []).filter(spell => getSpellLevelNumber(spell.level) <= getMaxSpellLevel(rules, indexes, character))).map(toChoice),
      featureChoiceGroups,
      levelBuckets: buildLevelBuckets(featureChoiceGroups, features),
    };
  }

  function buildNextLevelSummary(rules, indexes, profile, character, selected, features) {
    if (character.level >= 20) return { available: false, fromLevel: 20, toLevel: 20, steps: [] };
    const nextCharacter = { ...character, level: character.level + 1 };
    nextCharacter.classLevels = character.classLevels.length === 1
      ? [{ ...character.classLevels[0], level: character.classLevels[0].level + 1 }]
      : character.classLevels;
    const nextReport = makeEvaluationReport(nextCharacter, profile, { levelUpFrom: character.level });
    const nextSelected = resolveSelections(rules, indexes, profile, nextCharacter, nextReport);
    const nextFeatures = resolveAvailableFeatures(rules, indexes, profile, nextCharacter, nextSelected, nextReport);
    const newFeatures = nextFeatures.filter(feature => !features.some(current => current.id === feature.id));
    const steps = [];
    const cls = nextSelected.primaryClass;
    if (cls) {
      const unlock = getSubclassUnlockLevel(cls);
      if (nextCharacter.level === unlock && !nextSelected.primarySubclass) steps.push({ kind: 'subclass', label: `Choose ${cls.name} subclass`, required: true });
    }
    annotateChoiceGroups(rules, indexes, nextCharacter, getActiveChoiceGroups(rules, indexes, profile, nextCharacter, nextSelected, nextFeatures)).forEach(group => {
      if (Number(group.level || 1) !== Number(nextCharacter.level || 1)) return;
      if (!isChoiceGroupSatisfied(group, nextCharacter, group.inferredSelections || [])
        && !isAbilityScoreImprovementSatisfiedByFeat(rules, indexes, nextCharacter, group)) {
        steps.push({ kind: 'feature-choice', label: `Choose ${group.label || group.group}`, required: true, options: group.options });
      }
    });
    if (getMaxSpellLevel(rules, indexes, nextCharacter) > getMaxSpellLevel(rules, indexes, character)) {
      steps.push({ kind: 'spells', label: `Spell level ${getMaxSpellLevel(rules, indexes, nextCharacter)} is now available`, required: false });
    }
    return {
      available: true,
      fromLevel: character.level,
      toLevel: character.level + 1,
      proficiencyBonus: calculateProficiencyBonus(character.level + 1),
      newFeatures: formatRuleFeatures(newFeatures, []),
      steps,
    };
  }

  function makeEvaluationReport(character, profile, options = {}) {
    return {
      id: character.id || '',
      name: character.name || '',
      rulesetId: profile.id,
      rulesVersion: profile.rulesVersion,
      mode: options.levelUpFrom ? 'level-up' : 'audit',
      issues: [],
      counts: {},
      actionWellCount: 0,
      _keys: new Set(),
    };
  }

  function addIssue(report, severity, kind, message, detail = {}) {
    if (!report) return;
    const key = `${severity}:${kind}:${message}:${JSON.stringify(detail)}`;
    if (report._keys.has(key)) return;
    report._keys.add(key);
    report.issues.push({ severity, kind, message, ...detail });
  }

  function finalizeEvaluationReport(report, features, resources, actions) {
    report.counts = {
      features: features.length,
      resources: resources.length,
      actions: actions.length,
      linkedActions: actions.filter(action => action.resourceId).length,
    };
    report.actionWellCount = report.counts.linkedActions;
    delete report._keys;
  }

  function addActionWellIssues(report, actions) {
    for (const action of actions || []) {
      const text = `${action.title || ''} ${action.detail || ''} ${(action.tags || []).join(' ')}`;
      if (normalize(action.group) === 'out of combat') continue;
      if (action.resourceId || !looksLikeLimitedAction(text)) continue;
      addIssue(report, 'warning', 'action_well_unresolved', `"${action.title}" looks limited-use, but no resource well was linked.`, {
        action: action.title,
        sourceType: action.sourceType || '',
      });
    }
  }

  function resolveRowsByIds(index, ids, kind, report) {
    const out = [];
    ids.forEach(id => {
      const row = index.get(id);
      if (row) out.push(row);
      else addIssue(report, 'warning', `missing_${kind}_rule_id`, `No official ${kind} matched id "${id}".`, { id });
    });
    return uniqueBy(out, row => row.id);
  }

  function getRaceFeatures(rules, race, level) {
    if (!race) return [];
    if (Array.isArray(race.features) && race.features.length) {
      return race.features
        .filter(feature => feature.kind === 'race')
        .filter(feature => Number(feature.level || 1) <= level);
    }
    const acceptedRaceIds = new Set([race.id, race.parentRaceId].filter(Boolean));
    return (rules.features || [])
      .filter(feature => feature.kind === 'race')
      .filter(feature => Number(feature.level || 1) <= level)
      .filter(feature => acceptedRaceIds.has(feature.raceId));
  }

  function isOptionalClassFeature(feature) {
    return feature && feature.kind === 'class'
      && normalizeRuleSource(feature.source) === 'TCE'
      && OPTIONAL_CLASS_FEATURE_NAMES.has(feature.name);
  }

  function featureGroupApplies(group, selected, level) {
    if (Number(group.level || 1) > Number(level || 1)) return false;
    if (normalize(group.className) !== normalize(selected.primaryClass && selected.primaryClass.name)) return false;
    if (!group.subclassName) return true;
    const subclassNames = [selected.primarySubclass && selected.primarySubclass.name, selected.primarySubclass && selected.primarySubclass.shortName].map(normalize);
    return subclassNames.includes(normalize(group.subclassName));
  }

  function getActiveClassChoiceGroups(features, selected, level, profile) {
    const configuredGroups = profile && Array.isArray(profile.featureChoiceGroups)
      ? profile.featureChoiceGroups
      : FEATURE_CHOICE_GROUPS;
    return configuredGroups.filter(group => {
      if (!featureGroupApplies(group, selected, level)) return false;
      return true;
    }).map(group => ({
      kind: 'class-feature-choice',
      choiceType: 'feature-option',
      count: 1,
      ...group,
    }));
  }

  function getActiveChoiceGroups(rules, indexes, profile, character, selected, features) {
    return sortChoiceGroups([
      ...getRaceChoiceGroups(rules, indexes, character, selected, features),
      ...getBackgroundChoiceGroups(selected.background),
      ...getSelectedStructuredGrantChoiceGroups(selected, character.level),
      ...getClassStartingChoiceGroups(selected),
      ...getSubclassChoiceGroups(rules, indexes, character, selected),
      ...getAbilityScoreImprovementChoiceGroups(rules, indexes, character, features),
      ...getActiveClassChoiceGroups(features, selected, character.level, profile),
      ...getInferredClassChoiceGroups(rules, profile, character, selected, features),
    ]);
  }

  function getClassStartingChoiceGroups(selected) {
    const groups = [];
    (selected.classLevels || []).forEach(entry => {
      const cls = entry && entry.classRow;
      if (!cls || Number(entry.level || 0) < 1) return;
      const key = slugify(cls.name || cls.id);
      const skills = CLASS_SKILL_CHOICES[key];
      if (skills && Array.isArray(skills.options) && skills.options.length) {
        groups.push({
          kind: 'class-skill-choice',
          choiceType: 'skill',
          group: `${cls.id}:level-1:skills`,
          label: `${cls.name}: Skill Proficiencies`,
          className: cls.name || '',
          level: 1,
          count: Number(skills.count) || 1,
          options: skills.options,
          description: `Choose the level 1 skill proficiencies granted by ${cls.name}.`,
        });
      }
      (CLASS_TOOL_CHOICES[key] || []).forEach((toolChoice, index) => {
        groups.push({
          kind: 'class-tool-choice',
          choiceType: 'tool',
          group: `${cls.id}:level-1:tools:${index}`,
          label: `${cls.name}: ${toolChoice.label || 'Tool Proficiencies'}`,
          className: cls.name || '',
          level: 1,
          count: Number(toolChoice.count) || 1,
          options: toolChoice.options || TOOL_OPTIONS,
          description: `Choose the level 1 tool proficiencies granted by ${cls.name}.`,
        });
      });
    });
    return groups;
  }

  function getSubclassChoiceGroups(rules, indexes, character, selected) {
    const groups = [];
    (selected.classLevels || []).forEach(entry => {
      const cls = entry && entry.classRow;
      if (!cls) return;
      const unlock = getSubclassUnlockLevel(cls);
      if (Number(entry.level || 0) < unlock) return;
      groups.push({
        kind: 'subclass-choice',
        choiceType: 'subclass',
        group: `${cls.id}:level-${unlock}:subclass`,
        label: `Level ${unlock}: ${cls.name} Subclass`,
        classId: cls.id,
        className: cls.name || '',
        level: unlock,
        count: 1,
        coveredBy: 'subclassId',
        options: getAvailableSubclassesForClass(rules, indexes, cls.id, unlock).map(subclass => subclass.id),
        description: `Choose the ${cls.name} subclass unlocked at level ${unlock}.`,
      });
    });
    return groups;
  }

  function getSelectedStructuredGrantChoiceGroups(selected, level) {
    const groups = [];
    if (selected && selected.race) groups.push(...getStructuredGrantChoiceGroups(selected.race, 'race', selected.race.name, level));
    (selected && selected.classLevels || []).forEach(entry => {
      if (entry && entry.classRow) groups.push(...getStructuredGrantChoiceGroups(entry.classRow, 'class', entry.classRow.name, entry.level || level));
      if (entry && entry.subclassRow) groups.push(...getStructuredGrantChoiceGroups(entry.subclassRow, 'subclass', entry.subclassRow.name, entry.level || level));
    });
    (selected && selected.feats || []).forEach(feat => groups.push(...getStructuredGrantChoiceGroups(feat, 'feat', feat.name, level)));
    return uniqueBy(groups, group => group.group);
  }

  function getStructuredGrantChoiceGroups(source, sourceKind, labelPrefix, level) {
    if (!source) return [];
    return getRuleGrants(source)
      .map((grant, index) => getStructuredGrantChoiceGroup(source, sourceKind, labelPrefix, grant, index, level))
      .filter(Boolean);
  }

  function getStructuredGrantChoiceGroup(source, sourceKind, labelPrefix, grant, index, level) {
    const mode = normalize(grant && grant.mode || grant && grant.grantMode);
    if (mode !== 'choice') return null;
    const levelGate = Number(grant.levelGate || grant.level || 1) || 1;
    if (Number(level || 1) < levelGate) return null;
    const type = normalize(grant && grant.type);
    const choiceType = type === 'ability score' || type === 'ability-score' ? 'ability' : type;
    if (!['feat', 'skill', 'language', 'tool', 'size', 'ability'].includes(choiceType)) return null;
    if (choiceType === 'ability' && normalize(grant.optionSet) === 'abilities or feat') return null;
    const sourceId = source.id || slugify(labelPrefix || sourceKind || 'rule');
    const common = {
      kind: `${sourceKind}-${choiceType}-choice`,
      choiceType,
      group: `${sourceId}:grant:${type}:${index}`,
      label: `${labelPrefix || source.name || capitalize(sourceKind)}: ${capitalize(choiceType)} Choice`,
      level: levelGate,
      count: Number(grant.count) || 1,
      options: getStructuredGrantChoiceOptions(grant, choiceType),
    };
    if (sourceKind === 'race') common.raceId = sourceId;
    if (sourceKind === 'background') common.backgroundId = sourceId;
    if (sourceKind === 'class') common.className = source.name || '';
    if (sourceKind === 'subclass') common.subclassName = source.name || '';
    if (choiceType === 'feat') {
      return {
        ...common,
        kind: sourceKind === 'race' ? 'race-feat' : `${sourceKind}-feat`,
        coveredBy: 'featIds',
        input: 'feat',
        description: `Use the feat picker to select the feat granted by ${labelPrefix || source.name || 'this rule'}.`,
      };
    }
    return common;
  }

  function getStructuredGrantChoiceOptions(grant, choiceType) {
    if (Array.isArray(grant && grant.options) && grant.options.length) return grant.options;
    const optionSet = normalize(grant && grant.optionSet);
    if (choiceType === 'language' || optionSet === 'languages') return LANGUAGE_OPTIONS;
    if (choiceType === 'skill' || optionSet === 'skills') return SKILL_OPTIONS;
    if (choiceType === 'tool' || optionSet === 'tools') return TOOL_OPTIONS;
    if (choiceType === 'ability' || optionSet === 'abilities') return ABILITIES.map(ability => ABILITY_NAMES[ability] || ability);
    if (choiceType === 'size') return ['Small', 'Medium'];
    return [];
  }

  function getBackgroundChoiceGroups(background) {
    if (!background) return [];
    const groups = [];
    const structured = getStructuredGrantChoiceGroups(background, 'background', background.name, 1);
    const skillFixed = parseFixedProficiencyOptions(background.skillProficiencies, SKILL_OPTIONS);
    if (skillFixed.length) {
      groups.push({
        kind: 'background-skill-choice',
        choiceType: 'skill',
        group: `${background.id}:background:skills`,
        label: `${background.name}: Skills`,
        backgroundId: background.id,
        level: 1,
        count: skillFixed.length,
        options: SKILL_OPTIONS,
        fixedOptions: skillFixed,
        autoComplete: true,
        description: `${background.name} grants these skill proficiencies.`,
      });
    }
    const languageChoice = parseChoiceProficiencyText(background.languages, LANGUAGE_OPTIONS, 'language');
    if (languageChoice.fixed.length) {
      groups.push({
        kind: 'background-language-choice',
        choiceType: 'language',
        group: `${background.id}:background:languages:fixed`,
        label: `${background.name}: Languages`,
        backgroundId: background.id,
        level: 1,
        count: languageChoice.fixed.length,
        options: LANGUAGE_OPTIONS,
        fixedOptions: languageChoice.fixed,
        autoComplete: true,
      });
    }
    if (languageChoice.count > 0) {
      groups.push({
        kind: 'background-language-choice',
        choiceType: 'language',
        group: `${background.id}:background:languages`,
        label: `${background.name}: Language Choice`,
        backgroundId: background.id,
        level: 1,
        count: languageChoice.count,
        options: languageChoice.options.length ? languageChoice.options : LANGUAGE_OPTIONS,
        fixedOptions: languageChoice.fixedForChoice,
        description: `${background.name} grants ${formatChoiceCount(languageChoice.count)} language choice.`,
      });
    }
    groups.push(...getBackgroundToolChoiceGroups(background));
    const structuredTypes = new Set(structured.map(group => group.choiceType));
    return uniqueBy([
      ...structured,
      ...groups.filter(group => !structuredTypes.has(group.choiceType)),
    ], group => group.group);
  }

  function getBackgroundToolChoiceGroups(background) {
    const text = cleanRulesText(background && background.toolProficiencies || '');
    if (!text) return [];
    const groups = [];
    const fixed = [];
    splitChoiceList(text).forEach((part, index) => {
      const choice = inferToolChoice(part);
      if (choice) {
        groups.push({
          kind: 'background-tool-choice',
          choiceType: 'tool',
          group: `${background.id}:background:tools:${index}`,
          label: `${background.name}: ${choice.label}`,
          backgroundId: background.id,
          level: 1,
          count: choice.count,
          options: choice.options,
          description: `${background.name} grants ${formatChoiceCount(choice.count)} tool choice.`,
        });
        return;
      }
      fixed.push(...parseFixedProficiencyOptions(part, TOOL_OPTIONS));
    });
    if (fixed.length) {
      groups.unshift({
        kind: 'background-tool-choice',
        choiceType: 'tool',
        group: `${background.id}:background:tools:fixed`,
        label: `${background.name}: Tools`,
        backgroundId: background.id,
        level: 1,
        count: fixed.length,
        options: TOOL_OPTIONS,
        fixedOptions: uniqueText(fixed),
        autoComplete: true,
      });
    }
    return groups;
  }

  function inferToolChoice(text) {
    const raw = cleanRulesText(text);
    const clean = normalize(raw);
    if (!clean) return null;
    if (/one type of gaming set|gaming set of your choice|one gaming set/i.test(raw)) {
      return { label: 'Gaming Set', count: 1, options: GAMING_SET_OPTIONS };
    }
    if (/one type of musical instrument|musical instrument of your choice|one musical instrument/i.test(raw)) {
      return { label: 'Musical Instrument', count: 1, options: MUSICAL_INSTRUMENT_OPTIONS };
    }
    if (/one type of artisan'?s tools|artisan'?s tools of your choice|one set of artisan'?s tools/i.test(raw)) {
      return { label: "Artisan's Tools", count: 1, options: ARTISAN_TOOL_OPTIONS };
    }
    if (clean.includes(' of your choice')) {
      return { label: 'Tool Choice', count: inferChoiceCount(raw), options: TOOL_OPTIONS };
    }
    if (/\bor\b/i.test(raw)) {
      const options = uniqueText(raw.split(/\bor\b/i).map(part => toKnownOption(part, TOOL_OPTIONS)).filter(Boolean));
      if (options.length > 1) return { label: 'Tool Choice', count: 1, options };
    }
    return null;
  }

  function getAbilityScoreImprovementChoiceGroups(rules, indexes, character, features) {
    const asiFeatures = (features || [])
      .filter(feature => feature.kind === 'class' && normalize(feature.name) === 'ability score improvement')
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || String(a.className).localeCompare(String(b.className)));
    return asiFeatures.map(feature => ({
      kind: 'ability-score-choice',
      choiceType: 'ability-allocation',
      group: `${feature.id}:allocation`,
      label: `Level ${Number(feature.level || 1)}: Ability Score Increase`,
      featureId: feature.id,
      className: feature.className || '',
      level: Number(feature.level || 1),
      count: 2,
      choiceValue: 1,
      allowDuplicate: true,
      options: ABILITIES.map(ability => ABILITY_NAMES[ability]),
      description: 'Choose two +1 increases, or choose the same ability twice for +2.',
    }));
  }

  function annotateChoiceGroups(rules, indexes, character, groups) {
    const inferred = allocateExistingChoiceSelections(rules, indexes, character, groups);
    return (groups || []).map(group => {
      const inferredSelections = inferred.get(group.group) || [];
      return inferredSelections.length ? { ...group, inferredSelections } : group;
    });
  }

  function allocateExistingChoiceSelections(rules, indexes, character, groups) {
    const inferred = new Map();
    const used = {
      skill: new Set(),
      language: new Set(),
      tool: new Set(),
    };
    (groups || []).forEach(group => {
      if (!['skill', 'language', 'tool'].includes(group.choiceType)) return;
      (group.fixedOptions || []).forEach(value => used[group.choiceType].add(normalizeProficiencyChoice(value)));
      const explicit = getChoiceGroupSelectionValues(character.featureChoices, group);
      explicit.forEach(value => used[group.choiceType].add(normalizeProficiencyChoice(value)));
    });
    (groups || []).forEach(group => {
      if (!['skill', 'language', 'tool'].includes(group.choiceType) || group.autoComplete) return;
      if (getChoiceGroupSelectionValues(character.featureChoices, group).length) return;
      const known = getCharacterProficiencyValues(character, group.choiceType);
      const optionKeys = new Map((group.options || []).map(option => [normalizeProficiencyChoice(option), option]));
      const values = [];
      for (const knownValue of known) {
        const key = normalizeProficiencyChoice(knownValue);
        if (!optionKeys.has(key) || used[group.choiceType].has(key)) continue;
        values.push(optionKeys.get(key));
        used[group.choiceType].add(key);
        if (values.length >= (Number(group.count) || 1)) break;
      }
      if (values.length) inferred.set(group.group, values);
    });
    return inferred;
  }

  function getCharacterProficiencyValues(character, type) {
    const proficiencies = character && character.proficiencies && typeof character.proficiencies === 'object'
      ? character.proficiencies
      : {};
    const keys = type === 'skill'
      ? ['skills', 'skillProficiencies']
      : type === 'language'
        ? ['languages', 'languageProficiencies']
        : ['tools', 'toolProficiencies'];
    return uniqueText(keys.flatMap(key => normalizeIds(proficiencies[key] || [])));
  }

  function buildLevelBuckets(groups, features) {
    const byLevel = new Map();
    (groups || []).forEach(group => {
      const level = clamp(Number(group.level) || 1, 1, 20);
      if (!byLevel.has(level)) byLevel.set(level, { level, choiceGroups: [], features: [] });
      byLevel.get(level).choiceGroups.push(group);
    });
    (features || []).forEach(feature => {
      const level = clamp(Number(feature.level) || 1, 1, 20);
      if (!byLevel.has(level)) byLevel.set(level, { level, choiceGroups: [], features: [] });
      byLevel.get(level).features.push({
        id: feature.id,
        name: feature.name,
        kind: feature.kind,
        level: Number(feature.level || 1),
        className: feature.className || '',
        subclassName: feature.subclassName || feature.subclassShortName || '',
        raceName: feature.raceName || '',
        source: feature.source || '',
        text: cleanRulesText(feature.text || ''),
        timing: feature.timing || '',
        resourceHint: feature.resourceHint || '',
      });
    });
    return [...byLevel.values()].sort((a, b) => a.level - b.level);
  }

  function sortChoiceGroups(groups) {
    return (groups || []).slice().sort((a, b) => {
      const level = (Number(a.level) || 1) - (Number(b.level) || 1);
      if (level) return level;
      return choiceGroupPriority(a) - choiceGroupPriority(b) || String(a.label || a.group).localeCompare(String(b.label || b.group));
    });
  }

  function choiceGroupPriority(group) {
    if (group.choiceType === 'ability') return 10;
    if (group.kind && String(group.kind).startsWith('background')) return 20;
    if (group.kind === 'class-skill-choice' || group.kind === 'class-tool-choice') return 30;
    if (group.choiceType === 'ability-allocation') return 35;
    if (group.kind && String(group.kind).startsWith('race')) return 40;
    if (group.kind === 'class-feature-choice') return 50;
    if (group.kind === 'optional-class-feature') return 90;
    return 60;
  }

  function getInferredClassChoiceGroups(rules, profile, character, selected, features) {
    const groups = [];
    (features || [])
      .filter(feature => feature.kind === 'class' || feature.kind === 'subclass')
      .map(feature => inferClassFeatureChoiceGroup(feature))
      .filter(Boolean)
      .forEach(group => groups.push(group));
    getAvailableOptionalClassFeatures(rules, profile, selected, character.level)
      .forEach(feature => {
        groups.push({
          kind: 'optional-class-feature',
          choiceType: 'optional-rule',
          group: feature.id,
          label: `Optional Rule: ${feature.name}`,
          featureId: feature.id,
          className: feature.className || '',
          level: Number(feature.level || 1),
          count: 1,
          coveredBy: 'optionalFeatureIds',
          input: 'optionalFeature',
          options: [feature.name],
          description: cleanRulesText(feature.text || ''),
        });
      });
    return uniqueBy(groups, group => group.group);
  }

  function inferClassFeatureChoiceGroup(feature) {
    const name = normalize(feature && feature.name);
    const classKey = slugify(feature && feature.className);
    if (name === 'fighting style' || name === 'additional fighting style') {
      const options = FIGHTING_STYLE_OPTIONS[classKey] || FIGHTING_STYLE_OPTIONS.fighter;
      return {
        kind: 'class-feature-choice',
        choiceType: 'fighting-style',
        group: feature.id,
        label: `${feature.className || 'Class'}: ${feature.name}`,
        featureId: feature.id,
        className: feature.className || '',
        level: Number(feature.level || 1),
        count: 1,
        options,
        description: cleanRulesText(feature.text || ''),
      };
    }
    if (name === 'martial versatility') {
      const options = FIGHTING_STYLE_OPTIONS[classKey] || FIGHTING_STYLE_OPTIONS.fighter;
      return {
        kind: 'class-feature-choice',
        choiceType: 'fighting-style',
        group: `${feature.id}:replacement`,
        label: `${feature.className || 'Class'}: Martial Versatility Replacement`,
        featureId: feature.id,
        className: feature.className || '',
        level: Number(feature.level || 1),
        count: 1,
        options,
        description: cleanRulesText(feature.text || ''),
      };
    }
    if (name === 'favored enemy') {
      return {
        kind: 'class-feature-choice',
        choiceType: 'favored-enemy',
        group: feature.id,
        label: `${feature.className || 'Class'}: Favored Enemy`,
        featureId: feature.id,
        className: feature.className || '',
        level: Number(feature.level || 1),
        count: 1,
        options: FAVORED_ENEMY_OPTIONS,
        description: cleanRulesText(feature.text || ''),
      };
    }
    if (name === 'natural explorer') {
      return {
        kind: 'class-feature-choice',
        choiceType: 'favored-terrain',
        group: feature.id,
        label: `${feature.className || 'Class'}: Natural Explorer`,
        featureId: feature.id,
        className: feature.className || '',
        level: Number(feature.level || 1),
        count: 1,
        options: FAVORED_TERRAIN_OPTIONS,
        description: cleanRulesText(feature.text || ''),
      };
    }
    if (/gain proficiency in one of the following skills|choose to gain proficiency in/i.test(`${feature.name || ''} ${feature.text || ''}`)) {
      const options = parseListedOptions(feature.text).filter(option => SKILL_OPTIONS.map(normalize).includes(normalize(option)));
      const eitherOptions = options.length ? options : parseEitherOptions(feature.text, SKILL_OPTIONS);
      if (eitherOptions.length) {
        return {
          kind: 'class-feature-choice',
          choiceType: 'skill',
          group: feature.id,
          label: `${feature.className || feature.subclassName || 'Class'}: ${feature.name}`,
          featureId: feature.id,
          className: feature.className || '',
          subclassName: feature.subclassName || feature.subclassShortName || '',
          level: Number(feature.level || 1),
          count: inferChoiceCount(feature.text || ''),
          options: eitherOptions,
          description: cleanRulesText(feature.text || ''),
        };
      }
    }
    if (/artisan'?s tools of your choice|one type of artisan'?s tools|tool proficiency of your choice|one tool of your choice/i.test(feature.text || '')) {
      return {
        kind: 'class-feature-choice',
        choiceType: 'tool',
        group: feature.id,
        label: `${feature.className || feature.subclassName || 'Class'}: ${feature.name}`,
        featureId: feature.id,
        className: feature.className || '',
        subclassName: feature.subclassName || feature.subclassShortName || '',
        level: Number(feature.level || 1),
        count: inferChoiceCount(feature.text || ''),
        options: /artisan/i.test(feature.text || '') ? ARTISAN_TOOL_OPTIONS : TOOL_OPTIONS,
        description: cleanRulesText(feature.text || ''),
      };
    }
    return null;
  }

  function getAvailableOptionalClassFeatures(rules, profile, selected, level) {
    const optionalSelections = new Set();
    const classLevels = selected.classLevels || [];
    return (rules.features || [])
      .filter(feature => isOptionalClassFeature(feature))
      .filter(feature => Number(feature.level || 1) <= Number(level || 1))
      .filter(feature => classLevels.some(entry => entry.classRow && normalize(entry.classRow.name) === normalize(feature.className) && Number(feature.level || 1) <= Number(entry.level || level)))
      .filter(feature => !optionalSelections.has(feature.id))
      .filter(feature => !(profile.optionalClassFeaturesDefault));
  }

  function getRaceChoiceGroups(rules, indexes, character, selected, features) {
    if (!selected.race) return [];
    const groups = [
      ...getRaceAbilityChoiceGroups(selected.race),
      ...getRaceOriginChoiceGroups(selected.race),
    ];
    (features || [])
      .filter(feature => feature.kind === 'race')
      .map(feature => inferRaceFeatureChoiceGroup(rules, indexes, character, selected, feature))
      .filter(Boolean)
      .forEach(group => groups.push(group));
    return uniqueBy(groups, group => group.group);
  }

  function getRaceAbilityChoiceGroups(race) {
    const groups = [];
    const structured = getRaceAbilityScoreGrants(race);
    if (structured.length) {
      const fixedBonuses = structured
        .filter(grant => grant && grant.ability)
        .map(grant => ({
          option: ABILITY_NAMES[getAbilityKeyFromChoice(grant.ability)] || grant.ability,
          value: Number(grant.value) || 0,
        }))
        .filter(entry => entry.value);
      structured.forEach((grant, index) => {
        if (!grant || normalize(grant.mode) !== 'choice') return;
        const config = getRaceAbilityChoiceConfig(grant);
        if (!config.options.length) return;
        groups.push({
          kind: 'race-ability-choice',
          choiceType: 'ability',
          group: `${race.id}:ability:${index}`,
          label: `${race.name}: Ability Score Increase`,
          raceId: race.id,
          level: 1,
          count: config.count,
          choiceValue: config.amount,
          fixedBonuses,
          options: config.options.map(ability => ABILITY_NAMES[ability] || ability).filter(Boolean),
        });
      });
      return groups;
    }
    (Array.isArray(race.ability) ? race.ability : []).forEach((entry, index) => {
      const choice = entry && entry.choose;
      if (!choice || !Array.isArray(choice.from) || !choice.from.length) return;
      groups.push({
        kind: 'race-ability-choice',
        choiceType: 'ability',
        group: `${race.id}:ability:${index}`,
        label: `${race.name}: Ability Score Increase`,
        raceId: race.id,
        level: 1,
        count: Number(choice.count) || 1,
        choiceValue: Number(choice.amount || choice.amountPer || 1) || 1,
        fixedBonuses: ABILITIES
          .filter(ability => entry && Number(entry[ability]))
          .map(ability => ({ option: ABILITY_NAMES[ability] || ability, value: Number(entry[ability]) })),
        options: choice.from.map(ability => ABILITY_NAMES[ability] || ability).filter(Boolean),
      });
    });
    return groups;
  }

  function getRaceOriginChoiceGroups(race) {
    const groups = [];
    getRaceOriginRows(race, 'languages').forEach((grant, index) => {
      if (!grant || normalize(grant.mode) !== 'choice') return;
      groups.push({
        kind: 'race-language-choice',
        choiceType: 'language',
        group: `${race.id}:language:${index}`,
        label: `${race.name}: Language`,
        raceId: race.id,
        level: 1,
        count: Number(grant.count) || 1,
        fixedOptions: getRaceOriginRows(race, 'languages').map(row => row && row.language).filter(Boolean),
        options: normalizeLanguageChoiceOptions(grant.options),
      });
    });
    getRaceOriginRows(race, 'size').forEach((grant, index) => {
      if (!grant || normalize(grant.mode) !== 'choice') return;
      groups.push({
        kind: 'race-size-choice',
        choiceType: 'size',
        group: `${race.id}:size:${index}`,
        label: `${race.name}: Size`,
        raceId: race.id,
        level: 1,
        count: 1,
        options: normalizeSizeChoiceOptions(grant.options),
      });
    });
    return groups;
  }

  function normalizeLanguageChoiceOptions(options) {
    const values = Array.isArray(options) && options.length ? options : LANGUAGE_OPTIONS;
    return uniqueText(values.map(value => normalizeKnownProficiency(value, LANGUAGE_OPTIONS)).filter(Boolean));
  }

  function normalizeSizeChoiceOptions(options) {
    return uniqueText((Array.isArray(options) ? options : [])
      .map(formatRaceSizeValue)
      .filter(Boolean));
  }

  function inferRaceFeatureChoiceGroup(rules, indexes, character, selected, feature) {
    const text = cleanRulesText(feature.text || '');
    const choiceSource = `${feature.name || ''} ${text}`;
    const clean = normalize(text);
    const label = `${feature.raceName || selected.race.name}: ${feature.name}`;
    const common = {
      kind: 'race-feature-choice',
      group: feature.id,
      label,
      featureId: feature.id,
      raceId: feature.raceId || selected.race.id,
      level: Number(feature.level || 1),
      count: inferChoiceCount(text),
      options: [],
    };
    const structured = getStructuredGrantChoiceGroups(feature, 'race', feature.raceName || selected.race.name, character.level)
      .map((group, index) => ({
        ...group,
        group: index ? `${feature.id}:grant:${index}` : feature.id,
        label,
        featureId: feature.id,
        raceId: feature.raceId || selected.race.id,
      }))[0];
    if (structured) return structured;
    if (!/\b(choose|choice|choosing|selected when you|select this race)\b/i.test(choiceSource)) return null;
    if (normalize(feature.name) === 'feat' || clean.includes('gain one feat')) {
      return {
        ...common,
        kind: 'race-feat',
        coveredBy: 'featIds',
        input: 'feat',
        description: 'Use the feat picker to select the origin feat.',
      };
    }
    if (clean.includes('draconic ancestry') || clean.includes('choose one type of dragon') || clean.includes('dragon ancestor')) {
      return { ...common, choiceType: 'ancestry', options: DRAGONBORN_ANCESTRY_OPTIONS };
    }
    if (clean.includes('cantrip of your choice')) {
      return { ...common, choiceType: 'cantrip', options: getCantripOptions(rules, text) };
    }
    if (clean.includes('skill of your choice') || clean.includes('skills of your choice')) {
      return { ...common, choiceType: 'skill', options: parseListedOptions(text).filter(option => SKILL_OPTIONS.map(normalize).includes(normalize(option))).length ? parseListedOptions(text) : SKILL_OPTIONS };
    }
    if (clean.includes('tools of your choice') || clean.includes("tool's of your choice") || clean.includes("tools' of your choice")) {
      const options = parseListedOptions(text);
      return { ...common, choiceType: 'tool', options: options.length ? options : TOOL_OPTIONS };
    }
    if (clean.includes('language of your choice') || clean.includes('languages of your choice') || clean.includes('extra language')) {
      return { ...common, choiceType: 'language', fixedOptions: inferFixedLanguageOptions(text), options: LANGUAGE_OPTIONS };
    }
    if (clean.includes('small or medium') || clean.includes('medium or small')) {
      return { ...common, choiceType: 'size', options: ['Small', 'Medium'] };
    }
    return { ...common, options: parseListedOptions(text) };
  }

  function getCantripOptions(rules, text) {
    const classMatch = String(text || '').match(/from the ([A-Za-z]+) spell list/i);
    const className = classMatch ? normalize(classMatch[1]) : '';
    return sortRules((rules.spells || []).filter(spell => {
      if (getSpellLevelNumber(spell.level) !== 0) return false;
      if (!className) return true;
      return normalize(`${spell.classes || ''} ${spell.optionalClasses || ''}`).includes(className);
    })).map(spell => spell.name).slice(0, 80);
  }

  function parseListedOptions(text) {
    const raw = cleanRulesText(text);
    const colonMatches = [...raw.matchAll(/\b([A-Z][A-Za-z' -]{2,40}):/g)]
      .map(match => match[1].trim())
      .filter(option => !/^(Choose|When|Starting|Draconic Ancestry)$/i.test(option));
    if (colonMatches.length > 1) return uniqueText(colonMatches).slice(0, 40);
    const listed = raw.includes(':') ? raw.split(':').slice(1).join(':').split('.')[0] : '';
    if (!listed) return [];
    return uniqueText(listed
      .replace(/\bor\b/gi, ',')
      .replace(/\band\b/gi, ',')
      .split(',')
      .map(part => part.trim().replace(/^or\s+/i, '').replace(/^and\s+/i, '').replace(/\.$/, ''))
      .filter(part => part.length > 1 && part.length < 60))
      .slice(0, 40);
  }

  function splitChoiceList(text) {
    return cleanRulesText(text)
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  }

  function parseFixedProficiencyOptions(text, knownOptions) {
    const raw = cleanRulesText(text);
    if (!raw || /\b(choice|choose|of your choice|one type|one set|one of|two of|three of|\bor\b)\b/i.test(raw)) {
      return splitChoiceList(raw)
        .filter(part => !/\b(choice|choose|of your choice|one type|one set|one of|two of|three of|\bor\b)\b/i.test(part))
        .map(part => toKnownOption(part, knownOptions))
        .filter(Boolean);
    }
    return splitChoiceList(raw).map(part => toKnownOption(part, knownOptions)).filter(Boolean);
  }

  function parseChoiceProficiencyText(text, knownOptions, type) {
    const raw = cleanRulesText(text);
    const fixed = [];
    const fixedForChoice = [];
    if (!raw) return { count: 0, options: [], fixed, fixedForChoice };
    const count = inferChoiceCount(raw);
    if (!/\b(choice|choose|of your choice|extra language|one of|two of|three of)\b/i.test(raw)) {
      return { count: 0, options: [], fixed: parseFixedProficiencyOptions(raw, knownOptions), fixedForChoice };
    }
    const before = raw.split(/\b(?:one|two|three|\d+)\s+(?:extra\s+)?(?:skills?|languages?|tools?)\s+of your choice\b/i)[0] || '';
    fixedForChoice.push(...parseFixedProficiencyOptions(before, knownOptions));
    const listed = parseListedOptions(raw).filter(option => knownOptions.map(normalize).includes(normalize(option)));
    return {
      count,
      options: listed.length ? listed : knownOptions,
      fixed,
      fixedForChoice,
      type,
    };
  }

  function parseEitherOptions(text, knownOptions) {
    const raw = cleanRulesText(text);
    const match = raw.match(/\beither\s+([A-Za-z' -]+?)\s+or\s+([A-Za-z' -]+?)(?:\.|,|$)/i);
    if (!match) return [];
    return [match[1], match[2]].map(part => toKnownOption(part, knownOptions)).filter(Boolean);
  }

  function toKnownOption(value, knownOptions) {
    const clean = String(value || '')
      .replace(/^and\s+/i, '')
      .replace(/^or\s+/i, '')
      .replace(/\.$/, '')
      .trim();
    if (!clean) return '';
    const direct = (knownOptions || []).find(option => normalize(option) === normalize(clean));
    if (direct) return direct;
    return (knownOptions || []).find(option => normalize(clean).includes(normalize(option)) || normalize(option).includes(normalize(clean))) || '';
  }

  function inferChoiceCount(text) {
    const clean = normalize(text);
    if (/\btwo\b/.test(clean)) return 2;
    if (/\bthree\b/.test(clean)) return 3;
    const match = clean.match(/\b(\d+)\b[^.]{0,40}\bof your choice\b/);
    return match ? Number(match[1]) || 1 : 1;
  }

  function inferFixedLanguageOptions(text) {
    const raw = cleanRulesText(text);
    const beforeChoice = raw.split(/\b(?:one|two|three|\d+)\s+(?:extra\s+)?languages?\s+of your choice\b/i)[0] || raw;
    return LANGUAGE_OPTIONS.filter(language => new RegExp(`\\b${escapeRegExp(language)}\\b`, 'i').test(beforeChoice));
  }

  function formatChoiceCount(count) {
    const amount = Number(count) || 1;
    return amount === 1 ? 'one option' : `${amount} options`;
  }

  function isChoiceGroupSatisfied(group, character, inferredValues = []) {
    if (group.autoComplete) return true;
    if (group.coveredBy === 'featIds') return (character.featIds || []).length >= (Number(group.count) || 1);
    if (group.coveredBy === 'subclassId') return Boolean(character.subclassId || (character.classLevels || []).some(entry => entry.subclassId));
    if (group.coveredBy === 'optionalFeatureIds') {
      const selected = new Set([...(character.optionalFeatureIds || []), ...(character.selectedFeatureIds || [])].map(normalize));
      return selected.has(normalize(group.featureId)) || selected.has(normalize(group.label)) || selected.has(normalize((group.options || [])[0]));
    }
    const selected = [
      ...getChoiceGroupSelectionValues(character.featureChoices, group),
      ...(Array.isArray(inferredValues) ? inferredValues : []),
    ];
    return (group.allowDuplicate ? selected : uniqueText(selected)).length >= (Number(group.count) || 1);
  }

  function isAbilityScoreImprovementSatisfiedByFeat(rules, indexes, character, group) {
    if (!group || group.choiceType !== 'ability-allocation') return false;
    const bonusKey = `${group.group}:bonus-feat`;
    const explicit = getChoiceGroupSelectionValues(character.featureChoices, bonusKey)
      .some(value => Boolean(resolvePickId(indexes, 'feat', value)));
    if (explicit) return true;
    const index = getAsiGroupIndex(rules, indexes, character, group);
    if (index < 0) return false;
    const raceFeatSlots = getRaceFeatSlotCount(rules, indexes, character);
    return (character.featIds || []).slice(raceFeatSlots).length > index;
  }

  function getAsiGroupIndex(rules, indexes, character, group) {
    if (!group || !group.featureId) return -1;
    const feature = indexes.featuresById.get(group.featureId);
    if (!feature) return -1;
    const classLevel = (character.classLevels || []).find(entry => {
      const cls = indexes.classesById.get(entry.classId);
      return cls && normalize(cls.name) === normalize(feature.className);
    });
    if (!classLevel) return -1;
    const cls = indexes.classesById.get(classLevel.classId);
    if (!cls) return -1;
    const rows = (rules.features || [])
      .filter(row => row.kind === 'class'
        && normalize(row.className) === normalize(cls.name)
        && normalize(row.name) === 'ability score improvement'
        && Number(row.level || 1) <= Number(classLevel.level || character.level || 1))
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || String(a.id).localeCompare(String(b.id)));
    return rows.findIndex(row => row.id === group.featureId);
  }

  function getChoiceGroupSelection(featureChoices, groupName) {
    return getChoiceGroupSelectionValues(featureChoices, groupName)[0] || '';
  }

  function getChoiceGroupSelectionValues(featureChoices, groupName) {
    if (!featureChoices || typeof featureChoices !== 'object') return [];
    const keys = typeof groupName === 'object'
      ? [groupName.group, groupName.label, groupName.featureId].map(normalize).filter(Boolean)
      : [normalize(groupName)];
    for (const [key, value] of Object.entries(featureChoices)) {
      if (!keys.includes(normalize(key))) continue;
      if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
      return String(value || '').split(/[;,|]/).map(item => item.trim()).filter(Boolean);
    }
    return [];
  }

  function getChildRaceOptions(rules, raceId) {
    return sortRules((rules.races || []).filter(race => race.parentRaceId === raceId));
  }

  function uniqueText(values) {
    const seen = new Set();
    const out = [];
    (values || []).forEach(value => {
      const clean = String(value || '').trim();
      const key = normalize(clean);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(clean);
    });
    return out;
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function inferFeatureResource(feature) {
    if (!feature) return null;
    if (isWildShapeImprovementFeature(feature)) return null;
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
    const structured = inferStructuredFeatureResource(feature, common);
    if (structured) return structured;
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

  function inferStructuredFeatureResource(feature, common) {
    const grants = getStructuredFeatureGrants(feature);
    const explicit = grants.find(grant => normalize(grant.type) === 'resource');
    if (explicit) {
      return {
        id: explicit.id || feature.id,
        name: explicit.name || feature.name,
        max: Number(explicit.max || explicit.uses) || 1,
        reset: explicit.reset || 'longRest',
        ...common,
      };
    }
    const limitedSpellGrant = grants.find(grant => normalize(grant.type) === 'spell'
      && (normalizeStructuredSpellGrantMode(grant) === 'feature-cast' || grant.featureCast)
      && Number(grant.uses || 0) > 0);
    if (!limitedSpellGrant) return null;
    return {
      id: limitedSpellGrant.resourceId || feature.id,
      name: feature.name,
      max: Number(limitedSpellGrant.uses) || 1,
      reset: limitedSpellGrant.reset || 'longRest',
      ...common,
    };
  }

  function isWildShapeImprovementFeature(feature) {
    return Boolean(feature)
      && normalize(feature.name) === 'wild shape improvement'
      && normalize(feature.className) === 'druid';
  }

  function isWildShapeImprovementAction(action) {
    return Boolean(action)
      && normalize(action.title || action.name) === 'wild shape improvement'
      && /wild shape improvement/i.test(action.sourceId || '');
  }

  function getWildShapeEnhancements(features) {
    return (features || [])
      .filter(isWildShapeImprovementFeature)
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || String(a.id).localeCompare(String(b.id)))
      .map(feature => ({
        id: feature.id,
        name: feature.name || 'Wild Shape Improvement',
        level: Number(feature.level) || '',
        text: cleanRulesText(feature.text || ''),
        source: feature.source || '',
      }));
  }

  function enhanceResourcesWithFeatureMetadata(resources, features) {
    const enhancements = getWildShapeEnhancements(features);
    if (!enhancements.length) return resources || [];
    return (resources || []).map(resource => {
      if (!resource || resource.id !== 'druid-wild-shape') return resource;
      return {
        ...resource,
        enhancements,
        text: appendEnhancementText(resource.text, 'Wild Shape improvements', enhancements),
      };
    });
  }

  function enhanceActionsWithFeatureMetadata(actions, features) {
    const enhancements = getWildShapeEnhancements(features);
    if (!enhancements.length) return actions || [];
    return (actions || []).map(action => {
      if (!action || action.resourceId !== 'druid-wild-shape' || normalize(action.title || action.name) !== 'wild shape') return action;
      return {
        ...action,
        enhancements,
        detail: appendEnhancementText(action.detail || action.text, 'Wild Shape improvements', enhancements),
      };
    });
  }

  function appendEnhancementText(baseText, label, enhancements) {
    const base = cleanRulesText(baseText || '');
    const rows = (enhancements || []).map(enhancement => {
      const prefix = enhancement.level ? `Level ${enhancement.level}` : enhancement.name;
      return `${prefix}: ${enhancement.text}`;
    }).filter(Boolean);
    if (!rows.length) return base;
    const addition = `${label}: ${rows.join(' ')}`;
    return base && !normalize(base).includes(normalize(addition)) ? `${base} ${addition}` : base || addition;
  }

  function repointResourceToFeature(resource, features) {
    const current = features.find(feature => feature.id === resource.sourceId);
    const best = findFeatureForResource(resource, features);
    if (!best) return current ? formatFeatureResource(resource, current) : null;
    return formatFeatureResource(resource, best || current);
  }

  function findFeatureForResource(resource, features) {
    if (!resource || !['class', 'subclass', 'feat', 'race', 'background'].includes(resource.sourceType)) return null;
    const resourceName = normalize(resource.name || resource.id);
    const resourceId = normalize(resource.id);
    const resourceClass = normalize(resource.className);
    const resourceSubclass = normalize(resource.subclassName);
    const candidates = (features || []).filter(feature => {
      if (resource.sourceType === 'class' && feature.kind !== 'class') return false;
      if (resource.sourceType === 'subclass' && feature.kind !== 'subclass') return false;
      if (resource.sourceType === 'race' && feature.kind !== 'race') return false;
      if (resource.source && feature.source && resource.source !== feature.source) return false;
      if (resourceClass && normalize(feature.className) !== resourceClass) return false;
      if (resourceSubclass) {
        const names = [feature.subclassName, feature.subclassShortName].map(normalize);
        if (!names.includes(resourceSubclass)) return false;
      }
      const resourceRace = normalize(resource.raceName);
      if (resourceRace) {
        const names = [feature.raceName, feature.baseRaceName, feature.subraceName].map(normalize);
        if (!names.includes(resourceRace)) return false;
      }
      return true;
    });
    return candidates.find(feature => {
      const name = normalize(feature.name);
      return Boolean(name && (name === resourceName || name === resourceId));
    }) || candidates.find(feature => {
      const hint = normalize(feature.resourceHint);
      return Boolean(hint && (hint === resourceName || hint === resourceId || normalize(slugify(hint)) === resourceId));
    }) || null;
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

  function linkActionsToResources(actions, resources, features) {
    return (actions || []).map(action => {
      const resourceId = findResourceIdForAction(action, resources, features);
      if (!resourceId) return action;
      const resource = resources.find(candidate => candidate.id === resourceId);
      return {
        ...action,
        resourceId,
        resourceCost: Number(action.resourceCost) || 1,
        resourceName: resource && resource.name || '',
      };
    });
  }

  function findResourceIdForAction(action, resources, features = []) {
    if (!action || !resources || !resources.length) return '';
    if (action.resourceId && resources.some(resource => resource.id === action.resourceId)) return action.resourceId;
    if (action.id) {
      const byId = resources.find(resource => resource.id === action.id);
      if (byId) return byId.id;
    }
    const feature = action.sourceId ? features.find(candidate => candidate.id === action.sourceId) : null;
    const haystack = `${action.title || action.name || ''} ${action.detail || action.text || ''} ${(action.tags || []).join(' ')} ${feature ? `${feature.name} ${feature.resourceHint} ${feature.text}` : ''}`;
    const clean = normalize(haystack);
    const title = normalize(action.title || action.name || '');
    for (const resource of resources) {
      const resourceName = normalize(resource.name || resource.id);
      const resourceId = normalize(resource.id || '');
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
    for (const alias of RESOURCE_ALIASES) {
      if (!alias.match.test(haystack)) continue;
      const resource = resources.find(candidate => candidate.id === alias.resourceId);
      if (resource) return resource.id;
    }
    return '';
  }

  function buildActionWells(actions) {
    return (actions || [])
      .filter(action => action.resourceId)
      .map(action => ({
        actionId: action.id || action.sourceId || slugify(action.title || 'action'),
        actionTitle: action.title || action.name || 'Action',
        resourceId: action.resourceId,
        resourceName: action.resourceName || '',
        resourceCost: action.resourceCost || 1,
      }));
  }

  function formatRuleFeatures(features, resources = []) {
    return mergeFeatureEnhancementsForProjection(features || [])
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
        resourceId: findResourceIdForAction({ sourceId: feature.id, title: feature.name, detail: feature.text, tags: [feature.resourceHint] }, resources, [feature]),
        activations: Array.isArray(feature.activations) ? feature.activations : [],
        grants: Array.isArray(feature.grants) ? feature.grants : [],
        enhancements: Array.isArray(feature.enhancements) ? feature.enhancements : [],
        optional: Boolean(feature.optional),
        choiceGroup: feature.choiceGroup || '',
        selectedChoice: Boolean(feature.selectedChoice),
      }))
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || `${a.kind} ${a.name}`.localeCompare(`${b.kind} ${b.name}`))
      .slice(0, 140);
  }

  function mergeFeatureEnhancementsForProjection(features) {
    const enhancements = getWildShapeEnhancements(features);
    if (!enhancements.length) return features || [];
    const wildShape = (features || []).find(feature => normalize(feature.name) === 'wild shape' && normalize(feature.className) === 'druid');
    return (features || [])
      .filter(feature => !isWildShapeImprovementFeature(feature))
      .map(feature => {
        if (!wildShape || feature.id !== wildShape.id) return feature;
        return {
          ...feature,
          enhancements,
          text: appendEnhancementText(feature.text, 'Wild Shape improvements', enhancements),
        };
      });
  }

  function buildDefenseProjection(selected, features, effects, character = {}) {
    const rules = [
      ...(effects || []),
      ...(features || []),
      ...((selected && selected.classLevels || []).flatMap(entry => [entry && entry.classRow, entry && entry.subclassRow]).filter(Boolean)),
      ...[selected && selected.race, selected && selected.background].filter(Boolean),
      ...((selected && selected.feats) || []),
      ...((selected && selected.items) || []),
    ];
    const context = { character, features };
    const resistanceDetails = collectDamageDefenses(rules, 'resistance', context);
    const vulnerabilityDetails = collectDamageDefenses(rules, 'vulnerability', context);
    const resistances = uniqueText(resistanceDetails.map(formatDamageDefenseLabel));
    const vulnerabilities = uniqueText(vulnerabilityDetails.map(formatDamageDefenseLabel));
    return {
      resistances,
      vulnerabilities,
      damageResistances: resistances,
      damageVulnerabilities: vulnerabilities,
      resistanceDetails,
      vulnerabilityDetails,
    };
  }

  function collectDamageDefenses(rules, kind, context = {}) {
    const out = [];
    for (const rule of rules || []) {
      if (!rule) continue;
      extractStructuredDamageDefenseEntries(rule, kind, context).forEach(entry => out.push(entry));
      if (kind === 'resistance' && normalize(rule.kind) === 'resistance' && rule.target) {
        out.push(formatDamageDefenseDetail(rule, kind, rule.target, cleanRulesText(rule.text || ''), [], context));
      }
      extractDamageDefenseEntries(rule, kind, context).forEach(entry => out.push(entry));
    }
    return uniqueBy(out, entry => `${entry.kind}:${entry.type}:${(entry.exceptions || []).join(',')}:${entry.condition}:${entry.sourceId}:${entry.sourceName}`);
  }

  function extractStructuredDamageDefenseEntries(rule, kind, context = {}) {
    return getRuleGrants(rule)
      .filter(grant => normalize(grant && grant.type) === normalize(kind))
      .map(grant => formatDamageDefenseDetail(rule, kind, grant.damageType || grant.value || grant.target, grant.text || rule.text || '', [], context))
      .filter(entry => entry.type);
  }

  function extractDamageDefenseEntries(rule, kind, context = {}) {
    const text = cleanRulesText(rule.text || rule.featureText || '');
    if (!text || !new RegExp(`\\b${kind === 'resistance' ? 'resistance' : 'vulnerab'}`, 'i').test(text)) return [];
    const entries = [];
    for (const segment of splitRuleTextForDefense(text)) {
      if (!segmentHasSelfDefense(segment, kind)) continue;
      const targets = extractDamageDefenseTargets(segment);
      if (!targets.length) continue;
      const exceptions = extractDamageDefenseExceptions(segment);
      targets.forEach(target => entries.push(formatDamageDefenseDetail(rule, kind, target, segment, exceptions, context)));
    }
    return entries;
  }

  function splitRuleTextForDefense(text) {
    return cleanRulesText(text)
      .split(/(?<=[.!?])\s+|;\s+/)
      .map(part => part.trim())
      .filter(Boolean)
      .filter(part => !/^\d{1,3}\s*(?:-|\u2013)\s*\d{1,3}\b/.test(part));
  }

  function segmentHasSelfDefense(segment, kind) {
    const clean = normalize(segment);
    if (kind === 'resistance') {
      if (!clean.includes('resistance')) return false;
      if (/\b(ignore|ignores|overcoming|overcome)\b.{0,40}\bresistance\b/.test(clean)) return false;
      return /\byou (?:also )?(?:have|gain)\b.{0,180}\bresistance\b/.test(clean)
        || /\bwhile\b.{0,120}\byou (?:have|gain)\b.{0,160}\bresistance\b/.test(clean);
    }
    if (!clean.includes('vulnerab')) return false;
    return /\byou (?:also )?have\b.{0,120}\bvulnerability\b/.test(clean)
      || /\byou(?:'re| are| become)\b.{0,80}\bvulnerable\b/.test(clean)
      || /\bwhile\b.{0,120}\byou (?:have\b.{0,80}\bvulnerability|(?:are|become)\b.{0,80}\bvulnerable)\b/.test(clean);
  }

  function extractDamageDefenseTargets(segment) {
    const clean = normalize(segment);
    if (/\ball damage(?: types?)?\b/.test(clean)) return ['all'];
    const types = DAMAGE_TYPES.filter(type => new RegExp(`\\b${type}\\b`).test(clean));
    if (types.length) return types;
    const associated = clean.match(/damage type associated with your ([a-z ]*ancestry)/);
    if (associated) return [`${associated[1]} damage type`];
    if (/\bchosen damage type\b|\bdamage type of your choice\b/.test(clean)) return ['chosen damage type'];
    return [];
  }

  function extractDamageDefenseExceptions(segment) {
    const clean = normalize(segment);
    const match = clean.match(/\b(?:except|but)\b(.+)$/);
    if (!match) return [];
    return DAMAGE_TYPES.filter(type => new RegExp(`\\b${type}\\b`).test(match[1]));
  }

  function formatDamageDefenseDetail(rule, kind, target, segment, exceptions, context = {}) {
    const condition = inferDamageDefenseCondition(segment);
    const ancestryDefense = resolveDraconicAncestryDamageDefense(rule, kind, target, context);
    if (ancestryDefense) {
      return {
        kind,
        type: ancestryDefense.type,
        label: ancestryDefense.label,
        condition,
        sourceId: rule.sourceId || rule.id || '',
        sourceName: ancestryDefense.label,
        sourceType: rule.sourceType || rule.kind || '',
        text: firstWords(segment, 36),
        exceptions: exceptions || [],
        sourceChain: ancestryDefense.sourceChain,
        ancestry: ancestryDefense.ancestry,
      };
    }
    return {
      kind,
      type: normalize(target) || String(target || '').trim(),
      label: formatDamageDefenseTarget(target, exceptions),
      condition,
      sourceId: rule.sourceId || rule.id || '',
      sourceName: rule.itemName || rule.name || rule.featureName || '',
      sourceType: rule.sourceType || (rule.itemName || rule.rarity || rule.attunement ? 'item' : rule.kind || ''),
      text: firstWords(segment, 36),
      exceptions: exceptions || [],
    };
  }

  function resolveDraconicAncestryDamageDefense(rule, kind, target, context = {}) {
    if (kind !== 'resistance') return null;
    if (!isDraconicAncestryDamageTarget(target)) return null;
    const ancestry = getSelectedDraconicAncestry(context.character, context.features);
    if (!ancestry || !ancestry.damageType) return null;
    const label = `${titleWords(ancestry.damageType)} Resistance`;
    return {
      type: ancestry.damageType,
      label,
      ancestry: ancestry.name,
      sourceChain: ['Draconic Ancestry', ancestry.name, label],
    };
  }

  function isDraconicAncestryDamageTarget(target) {
    const clean = normalize(target);
    return clean === 'draconic ancestry damage type'
      || clean === 'ancestry damage type'
      || clean === 'damage type associated with your draconic ancestry';
  }

  function getSelectedDraconicAncestry(character = {}, features = []) {
    const choices = character && character.featureChoices && typeof character.featureChoices === 'object'
      ? character.featureChoices
      : {};
    const ancestryFeatures = (features || []).filter(feature => normalize(feature && feature.name) === 'draconic ancestry');
    const candidates = [];
    ancestryFeatures.forEach(feature => {
      candidates.push(...getChoiceGroupSelectionValues(choices, {
        group: feature.id,
        label: `${feature.raceName || 'Race'}: ${feature.name}`,
        featureId: feature.id,
      }));
      candidates.push(...getChoiceGroupSelectionValues(choices, feature.name));
    });
    Object.entries(choices).forEach(([key, value]) => {
      if (!/\bdraconic ancestry\b/i.test(key)) return;
      if (Array.isArray(value)) candidates.push(...value);
      else candidates.push(...String(value || '').split(/[;,|]/));
    });
    candidates.push(character && (character.draconicAncestry || character.dragonAncestry));
    const name = first(candidates.map(normalizeDraconicAncestryName).filter(Boolean));
    if (!name) return null;
    return {
      name,
      damageType: DRACONIC_ANCESTRY_DAMAGE_TYPES[normalize(name)] || '',
    };
  }

  function normalizeDraconicAncestryName(value) {
    const clean = normalize(value).replace(/\s+dragon$/, '');
    if (!clean) return '';
    return DRAGONBORN_ANCESTRY_OPTIONS.find(option => {
      const optionKey = normalize(option);
      return clean === optionKey || clean === `${optionKey} dragon`;
    }) || '';
  }

  function inferDamageDefenseCondition(segment) {
    const text = cleanRulesText(segment || '');
    const patterns = [
      /\b(while raging)\b/i,
      /\b(while cursed)\b/i,
      /\b(while (?:you are |you're |you )?(?:wearing|holding|wielding|carrying|attuned)[^,.]{0,80})/i,
      /\b(from nonmagical attacks?[^,.]{0,80})/i,
      /\b(for \d+ (?:minute|minutes|hour|hours))\b/i,
      /\b(until [^,.]{0,80})/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return cleanRulesText(match[1].replace(/you're/i, 'you are'));
    }
    return '';
  }

  function formatDamageDefenseLabel(entry) {
    return [entry.label, entry.condition ? `(${entry.condition})` : ''].filter(Boolean).join(' ');
  }

  function formatDamageDefenseTarget(target, exceptions = []) {
    const clean = normalize(target);
    const base = clean === 'all'
      ? 'All'
      : clean === 'chosen damage type'
        ? 'Chosen damage type'
        : titleWords(clean);
    const except = (exceptions || []).length ? ` except ${exceptions.map(titleWords).join(', ')}` : '';
    return `${base}${except}`;
  }

  function titleWords(value) {
    return String(value || '').replace(/\b[a-z]/g, char => char.toUpperCase());
  }

  function calculateSpellSlots(selected) {
    const classLevels = selected.classLevels || [];
    const pactLevels = classLevels
      .filter(entry => entry.classRow && entry.classRow.casterProgression === 'pact')
      .reduce((sum, entry) => sum + entry.level, 0);
    let casterLevel = 0;
    classLevels.forEach(entry => {
      const progression = entry.classRow && entry.classRow.casterProgression;
      if (!progression || progression === 'pact') return;
      if (progression === 'half') casterLevel += Math.ceil(entry.level / 2);
      else if (progression === 'third') casterLevel += Math.ceil(entry.level / 3);
      else casterLevel += entry.level;
    });
    const slots = casterLevel ? { ...(FULL_CASTER_SLOTS[Math.max(1, Math.min(20, casterLevel))] || {}) } : {};
    if (pactLevels) slots.pact = getPactSlots(pactLevels).pact;
    return slots;
  }

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

  function getMaxSpellLevel(rules, indexes, character) {
    const selected = resolveSelections(rules, indexes, DEFAULT_RULESET_PROFILE, character, makeEvaluationReport(character, DEFAULT_RULESET_PROFILE));
    const slots = calculateSpellSlots(selected);
    const numeric = Object.keys(slots).filter(key => key !== 'pact').map(Number).filter(Boolean);
    if (slots.pact && slots.pact.level) numeric.push(Number(slots.pact.level));
    return numeric.length ? Math.max(...numeric) : 0;
  }

  function getSpellcastingAbility(selected) {
    const casting = (selected.classLevels || [])
      .map(entry => entry.classRow && entry.classRow.spellcastingAbility)
      .filter(Boolean);
    return casting[0] || '';
  }

  function spellIsOnAnyKnownList(spell, selected) {
    const haystack = normalize(`${spell.classes || ''} ${spell.optionalClasses || ''} ${spell.subclasses || ''}`);
    if (!haystack) return true;
    const classNames = (selected.classLevels || []).map(entry => normalize(entry.classRow && entry.classRow.name)).filter(Boolean);
    const subclassNames = [selected.primarySubclass && selected.primarySubclass.name, selected.primarySubclass && selected.primarySubclass.shortName].map(normalize).filter(Boolean);
    return classNames.some(name => haystack.includes(name)) || subclassNames.some(name => haystack.includes(name));
  }

  function getFeatSlotCount(rules, indexes, character) {
    let slots = 0;
    character.classLevels.forEach(entry => {
      const cls = indexes.classesById.get(entry.classId);
      if (!cls) return;
      slots += countStructuredFeatGrants(cls, entry.level);
      const subclass = indexes.subclassesById.get(entry.subclassId || character.subclassId);
      if (subclass) slots += countStructuredFeatGrants(subclass, entry.level);
      const className = normalize(cls.name);
      slots += (rules.features || []).filter(feature => {
        if (feature.kind !== 'class') return false;
        if (normalize(feature.className) !== className) return false;
        if (Number(feature.level || 1) > Number(entry.level || 1)) return false;
        return normalize(feature.name) === 'ability score improvement';
      }).length;
    });
    const background = indexes.backgroundsById.get(character.backgroundId);
    if (background) slots += countStructuredFeatGrants(background, character.level);
    const race = indexes.racesById.get(character.raceId);
    if (race) slots += countStructuredFeatGrants(race, character.level);
    return slots + getRaceFeatSlotCount(rules, indexes, character);
  }

  function getRaceFeatSlotCount(rules, indexes, character) {
    const race = indexes.racesById.get(character.raceId);
    if (!race) return 0;
    return getRaceFeatures(rules, race, Number(character.level || 1)).reduce((total, feature) => {
      const structured = getRuleGrants(feature, 'feat')
        .filter(grant => Number(grant.levelGate || feature.level || 1) <= Number(character.level || 1));
      if (structured.length) {
        return total + structured.reduce((sum, grant) => sum + (Number(grant.count) || 1), 0);
      }
      const name = normalize(feature.name);
      const text = normalize(feature.text);
      return total + (name === 'feat' || text.includes('gain one feat') ? 1 : 0);
    }, 0);
  }

  function countStructuredFeatGrants(rule, level) {
    return getRuleGrants(rule, 'feat')
      .filter(grant => Number(grant.levelGate || grant.level || 1) <= Number(level || 1))
      .reduce((sum, grant) => sum + (Number(grant.count) || 1), 0);
  }

  function getAvailableSubclassesForClass(rules, indexes, classId, level) {
    const cls = indexes.classesById.get(classId);
    if (!cls) return [];
    if (Number(level || 1) < getSubclassUnlockLevel(cls)) return [];
    return sortRules((rules.subclasses || []).filter(subclass => normalize(subclass.className) === normalize(cls.name)));
  }

  function getSubclassUnlockLevel(cls) {
    if (!cls || !Array.isArray(cls.classFeatures)) return 3;
    const levels = cls.classFeatures
      .filter(feature => feature && typeof feature === 'object' && feature.gainSubclassFeature)
      .map(feature => Number(String(feature.classFeature || '').split('|').pop()) || 0)
      .filter(Boolean);
    return levels.length ? Math.min(...levels) : 3;
  }

  function getClassLevel(character, classId) {
    const entry = (character.classLevels || []).find(row => row.classId === classId);
    return entry ? entry.level : 0;
  }

  function buildDetailsMap(rows) {
    const out = {};
    (rows || []).forEach(row => {
      if (!row || !row.name) return;
      out[row.name] = toDetail(row);
    });
    return out;
  }

  function buildRuleDetails(rows) {
    return uniqueBy((rows || []).map(toDetail), row => row.id || row.name).filter(row => row.name);
  }

  function buildInitiativeProfile(selected, features, effects, abilities, proficiencyBonus) {
    const dexMod = calculateModifier(Number(abilities && abilities.dex) || 10);
    const parts = [{ label: 'Dexterity modifier', value: dexMod }];
    const applied = new Set();
    for (const rule of getProjectionRules(selected, features, effects)) {
      const key = rule.sourceId || rule.id || `${rule.name}:${rule.text}`;
      if (applied.has(key)) continue;
      const text = cleanRulesText(`${rule.name || ''}. ${rule.text || rule.featureText || ''}`);
      const clean = normalize(text);
      let value = 0;
      if (/\+\s*5\s+bonus to initiative/i.test(text)) {
        value = 5;
      } else if (/add your proficiency bonus to your initiative|bonus to initiative (?:rolls? )?equal to your proficiency bonus|initiative rolls?.{0,80}proficiency bonus/i.test(text)) {
        value = Number(proficiencyBonus) || 0;
      } else {
        const abilityMatch = text.match(/(?:bonus to (?:your )?initiative rolls? equal to|add your) (?:your )?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier/i);
        if (abilityMatch) value = calculateModifier(Number(abilities && abilities[abilityMatch[1].slice(0, 3).toLowerCase()]) || 10);
      }
      if (!value) continue;
      if (clean.includes('allied') || clean.includes('ally within') || clean.includes('companions within')) continue;
      applied.add(key);
      parts.push({ label: rule.name || 'Initiative bonus', value, sourceId: rule.sourceId || rule.id || '' });
    }
    return {
      total: parts.reduce((sum, part) => sum + (Number(part.value) || 0), 0),
      parts,
      advantage: getProjectionRules(selected, features, effects).some(rule => {
        const text = cleanRulesText(`${rule.name || ''}. ${rule.text || rule.featureText || ''}`);
        return /advantage on initiative rolls/i.test(text);
      }),
    };
  }

  function buildSpeedProfileFromRules(indexes, selected, features, effects) {
    const baseSpeeds = normalizeSpeedValue(getSelectedRaceSpeed(indexes, selected && selected.race));
    const speeds = { walk: Number(baseSpeeds.walk) || 30 };
    ['climb', 'swim', 'fly', 'burrow'].forEach(mode => {
      if (Number(baseSpeeds[mode])) speeds[mode] = Number(baseSpeeds[mode]);
    });
    const parts = [{ label: 'Race speed', mode: 'walk', value: speeds.walk }];
    const applied = new Set();
    for (const rule of getProjectionRules(selected, features, effects)) {
      const key = rule.sourceId || rule.id || `${rule.name}:${rule.text}`;
      if (applied.has(key)) continue;
      let didApply = applyStructuredSpeedGrants(rule, speeds, parts);
      const text = cleanRulesText(`${rule.name || ''}. ${rule.text || rule.featureText || ''}`);
      const clean = normalize(text);
      if (!/\bspeed\b/i.test(text) && !didApply) continue;
      const fixedWalk = getFixedWalkingSpeed(text);
      if (fixedWalk && fixedWalk > speeds.walk) {
        parts.push({ label: rule.name || 'Walking speed', mode: 'walk', value: fixedWalk - speeds.walk, sourceId: rule.sourceId || rule.id || '' });
        speeds.walk = fixedWalk;
        didApply = true;
      }
      const passiveBonus = getPassiveWalkingSpeedBonus(text);
      if (passiveBonus) {
        speeds.walk += passiveBonus;
        parts.push({ label: rule.name || 'Walking speed bonus', mode: 'walk', value: passiveBonus, sourceId: rule.sourceId || rule.id || '' });
        didApply = true;
      }
      if (/climbing speed equal to your walking speed/i.test(text)) {
        speeds.climb = Math.max(Number(speeds.climb) || 0, speeds.walk);
        parts.push({ label: rule.name || 'Climbing speed', mode: 'climb', display: 'equal to walking speed', sourceId: rule.sourceId || rule.id || '' });
        didApply = true;
      }
      if (/swimming speed equal to your walking speed/i.test(text)) {
        speeds.swim = Math.max(Number(speeds.swim) || 0, speeds.walk);
        parts.push({ label: rule.name || 'Swimming speed', mode: 'swim', display: 'equal to walking speed', sourceId: rule.sourceId || rule.id || '' });
        didApply = true;
      }
      if (/flying speed equal to your (?:current )?walking speed/i.test(text) && !isTemporarySpeedText(clean)) {
        speeds.fly = Math.max(Number(speeds.fly) || 0, speeds.walk);
        parts.push({ label: rule.name || 'Flying speed', mode: 'fly', display: 'equal to walking speed', sourceId: rule.sourceId || rule.id || '' });
        didApply = true;
      }
      if (didApply) applied.add(key);
    }
    addClassSpeedAdjustments(selected, speeds, parts);
    return {
      total: speeds.walk,
      walk: speeds.walk,
      speeds,
      parts,
    };
  }

  function applyStructuredSpeedGrants(rule, speeds, parts) {
    let didApply = false;
    getRuleGrants(rule, 'speed').forEach(grant => {
      const mode = normalize(grant.movement || grant.mode || 'walk').replace(/\s+/g, '') || 'walk';
      const label = rule.name || grant.name || `${capitalize(mode)} speed`;
      if (grant.equals) {
        const target = normalize(grant.equals).replace(/\s+/g, '') || 'walk';
        const value = Number(speeds[target]) || Number(speeds.walk) || 0;
        if (value && value > (Number(speeds[mode]) || 0)) {
          speeds[mode] = value;
          parts.push({ label, mode, display: `equal to ${target} speed`, sourceId: rule.sourceId || rule.id || '' });
          didApply = true;
        }
        return;
      }
      const value = Number(grant.value);
      if (!Number.isFinite(value) || value <= 0) return;
      if (mode === 'walk') {
        if (value > speeds.walk) {
          parts.push({ label, mode, value: value - speeds.walk, sourceId: rule.sourceId || rule.id || '' });
          speeds.walk = value;
          didApply = true;
        }
        return;
      }
      if (value > (Number(speeds[mode]) || 0)) {
        speeds[mode] = value;
        parts.push({ label, mode, value, sourceId: rule.sourceId || rule.id || '' });
        didApply = true;
      }
    });
    return didApply;
  }

  function getProjectionRules(selected, features, effects) {
    return [
      ...(features || []),
      ...((selected && selected.classLevels || []).flatMap(entry => [entry && entry.classRow, entry && entry.subclassRow]).filter(Boolean)),
      ...[selected && selected.race, selected && selected.background].filter(Boolean),
      ...((selected && selected.feats) || []),
      ...((selected && selected.items) || []),
      ...(effects || []),
    ];
  }

  function getSelectedRaceSpeed(indexes, race) {
    if (!race) return 30;
    const originSpeed = getRaceOriginRows(race, 'speed');
    if (originSpeed.length) return originSpeed;
    if (race.speed !== '' && race.speed !== null && race.speed !== undefined) return race.speed;
    const parent = race.parentRaceId && indexes && indexes.racesById && indexes.racesById.get(race.parentRaceId);
    return parent && parent.speed !== '' && parent.speed !== null && parent.speed !== undefined ? parent.speed : 30;
  }

  function normalizeSpeedValue(value) {
    if (Array.isArray(value)) {
      const out = {};
      const deferred = [];
      value.forEach(grant => {
        if (!grant || typeof grant !== 'object') return;
        const mode = normalize(grant.movement || grant.mode || 'walk').replace(/\s+/g, '') || 'walk';
        const raw = grant.value;
        if (grant.equals === 'walk' || raw === true || normalize(raw) === 'walk') {
          deferred.push(mode);
          return;
        }
        const number = Number(raw);
        if (Number.isFinite(number) && number > 0) out[mode] = number;
      });
      if (!out.walk) out.walk = 30;
      deferred.forEach(mode => {
        out[mode] = out.walk;
      });
      return out;
    }
    if (typeof value === 'number' || /^\d+$/.test(String(value || '').trim())) return { walk: Number(value) || 30 };
    if (value && typeof value === 'object') {
      const out = {};
      const deferred = [];
      Object.entries(value).forEach(([mode, amount]) => {
        if (amount === true || normalize(amount) === 'walk') {
          deferred.push(mode === 'walk' ? 'walk' : mode);
          return;
        }
        const number = Number(amount);
        if (Number.isFinite(number) && number > 0) out[mode === 'walk' ? 'walk' : mode] = number;
      });
      if (!out.walk) out.walk = 30;
      deferred.forEach(mode => {
        out[mode] = out.walk;
      });
      return out.walk ? out : { ...out, walk: 30 };
    }
    return { walk: 30 };
  }

  function formatRaceSizeValue(value) {
    const clean = normalize(value);
    if (clean === 'm' || clean === 'medium') return 'Medium';
    if (clean === 's' || clean === 'small') return 'Small';
    if (clean === 'l' || clean === 'large') return 'Large';
    if (clean === 't' || clean === 'tiny') return 'Tiny';
    if (clean === 'h' || clean === 'huge') return 'Huge';
    if (clean === 'g' || clean === 'gargantuan') return 'Gargantuan';
    return cleanString(value);
  }

  function getSelectedRaceSize(character, race) {
    const grants = getRaceOriginRows(race, 'size');
    for (const [index, grant] of grants.entries()) {
      if (!grant || normalize(grant.mode) !== 'choice') continue;
      const selected = getChoiceGroupSelection(character && character.featureChoices, `${race.id}:size:${index}`);
      if (selected) return formatRaceSizeValue(selected);
    }
    const fixed = grants.map(grant => grant && grant.value).map(formatRaceSizeValue).find(Boolean);
    if (fixed) return fixed;
    const legacy = Array.isArray(race && race.size) ? race.size.map(formatRaceSizeValue).find(Boolean) : formatRaceSizeValue(race && race.size);
    return legacy || '';
  }

  function getFixedWalkingSpeed(text) {
    const match = String(text || '').match(/(?:base )?(?:walking|ground) speed (?:is|increases to) (\d+) feet/i);
    return match ? Number(match[1]) || 0 : 0;
  }

  function getPassiveWalkingSpeedBonus(text) {
    const clean = normalize(text);
    if (isTemporarySpeedText(clean)) return 0;
    if (clean.includes('unarmored movement') || clean.includes('bonus increases when you reach certain monk levels')) return 0;
    const match = String(text || '').match(/(?:walking speed|speed) increases by (\d+) feet/i);
    return match ? Number(match[1]) || 0 : 0;
  }

  function isTemporarySpeedText(clean) {
    return /\b(for 1 minute|for 1 hour|until the end|start of your first turn|while shifted|while raging|bladesong|experimental elixir|as a bonus action|when you use|whenever you use|whenever you take)\b/i.test(clean || '');
  }

  function addClassSpeedAdjustments(selected, speeds, parts) {
    const monk = (selected && selected.classLevels || []).find(entry => normalize(entry.classRow && entry.classRow.name) === 'monk');
    if (monk && Number(monk.level) >= 2) {
      const level = Number(monk.level) || 1;
      const bonus = level >= 18 ? 30 : level >= 14 ? 25 : level >= 10 ? 20 : level >= 6 ? 15 : 10;
      if (!parts.some(part => part.sourceId === 'class-monk-unarmored-movement')) {
        speeds.walk += bonus;
        parts.push({ label: 'Unarmored Movement', mode: 'walk', value: bonus, sourceId: 'class-monk-unarmored-movement' });
      }
    }
  }

  function toDetail(rule) {
    return {
      id: rule.id || slugify(rule.name || 'rule'),
      name: rule.name || '',
      source: rule.source || '',
      page: rule.page || '',
      rarity: rule.rarity || '',
      type: rule.type || '',
      attunement: rule.attunement || '',
      damage: rule.damage || '',
      properties: Array.isArray(rule.properties) ? rule.properties.join(', ') : rule.properties || '',
      weight: rule.weight || '',
      value: rule.value || '',
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
      weapon: rule.weapon || null,
      actions: Array.isArray(rule.actions) ? rule.actions : [],
      effects: Array.isArray(rule.effects) ? rule.effects : [],
      resources: Array.isArray(rule.resources) ? rule.resources : [],
      toggles: Array.isArray(rule.toggles) ? rule.toggles : [],
    };
  }

  function summarizeRuleChoices(character, evaluation) {
    return {
      rulesetId: evaluation.rulesetId,
      rulesVersion: evaluation.rulesVersion,
      raceId: character.raceId,
      backgroundId: character.backgroundId,
      featIds: character.featIds,
      itemIds: character.itemIds,
      spellIds: character.spellIds,
      optionalFeatures: character.optionalFeatureIds,
      includeFeatures: character.selectedFeatureIds,
      featureChoices: character.featureChoices,
      issueCount: evaluation.issues.length,
    };
  }

  function resolvePickId(indexes, kind, label) {
    const key = `${kind}sById`;
    const labelKey = `${kind}sByName`;
    const idIndex = indexes[key];
    const labelIndex = indexes[labelKey];
    const clean = String(label || '').trim();
    if (idIndex && idIndex.has(clean)) return clean;
    const normalized = normalize(clean.replace(/\s+\[[^\]]+\]\s*$/, ''));
    const row = labelIndex && labelIndex.get(normalized);
    return row ? row.id : '';
  }

  function toChoice(row) {
    return { id: row.id, name: row.name, source: row.source || '', label: sourceLabel(row) };
  }

  function sourceLabel(row) {
    if (!row) return '';
    const source = row.source ? ` ${row.source}` : '';
    return `${row.name}${source} [${row.id}]`;
  }

  function sortRules(rows) {
    return (rows || []).slice().sort((a, b) => sourcePriority(a && a.source) - sourcePriority(b && b.source) || String(a && a.name).localeCompare(String(b && b.name)));
  }

  function sourcePriority(source) {
    const index = SOURCE_PRIORITY.map(normalizeRuleSource).indexOf(normalizeRuleSource(source));
    return index === -1 ? SOURCE_PRIORITY.length : index;
  }

  function byId(rows) {
    return new Map((rows || []).filter(row => row && row.id).map(row => [row.id, row]));
  }

  function byLabel(rows, extraFields = []) {
    const out = new Map();
    for (const row of rows || []) {
      const keys = [row.name, row.id, ...(row.aliases || []), ...extraFields.map(field => row[field])];
      keys.map(normalize).filter(Boolean).forEach(key => {
        if (!out.has(key)) out.set(key, row);
      });
      out.set(normalize(sourceLabel(row)), row);
    }
    return out;
  }

  function inferHitDice(cls, level) {
    const hitDie = cls && cls.hitDie ? cls.hitDie : 'd8';
    return `${level}${hitDie}`;
  }

  function calculateProficiencyBonus(level) {
    return Math.ceil((Number(level) || 1) / 4) + 1;
  }

  function calculateModifier(score) {
    return Math.floor(((Number(score) || 10) - 10) / 2);
  }

  function getSpellLevelNumber(value) {
    if (value === 0 || value === '0') return 0;
    const text = String(value || '').toLowerCase();
    if (text.includes('cantrip')) return 0;
    const match = text.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function sumClassLevels(classLevels) {
    return (classLevels || []).reduce((sum, entry) => sum + (Number(entry && entry.level) || 0), 0);
  }

  function normalizeIds(values) {
    const raw = Array.isArray(values)
      ? values
      : values && typeof values === 'object'
        ? Object.values(values).flat()
        : [values];
    return [...new Set(raw.map(value => String(value || '').trim()).filter(Boolean))];
  }

  function cleanString(value) {
    return String(value || '').trim();
  }

  function capitalize(value) {
    const text = String(value || '').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
  }

  function first(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cleanRulesText(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function firstWords(value, count) {
    return cleanRulesText(value).split(/\s+/).filter(Boolean).slice(0, count).join(' ');
  }

  function looksLikeLimitedAction(text) {
    return /\b(regain all expended uses|number of times equal|channel divinity|ki point|bardic inspiration|breath weapon|healing hands|action surge|second wind|wrath of the storm|portent)\b/i.test(text || '');
  }

  function normalizeRuleSource(source) {
    return String(source || '').toUpperCase().replace(/[^A-Z0-9']+/g, '');
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9+']+/g, ' ').trim();
  }

  function normalizeProficiencyChoice(value) {
    return normalize(String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2'));
  }

  function slugify(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function uniqueBy(rows, keyFn) {
    const seen = new Set();
    const out = [];
    for (const row of rows || []) {
      const key = keyFn(row);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }

  return {
    DEFAULT_RULESET_PROFILE,
    createRuleset,
    normalizeCharacterBuild,
    calculateProficiencyBonus,
    calculateModifier,
    getSpellLevelNumber,
    sourceLabel,
  };
});
