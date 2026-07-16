"use strict";

const PLAYER_SHEET_SCHEMA_VERSION = "player-sheet-v2";
const MAX_CHARACTER_LEVEL = 20;
const ASI_CHARACTER_LEVELS = new Set([4, 8, 12, 16, 19]);
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const DEFAULT_ABILITY_SCORE = 10;

function schemaError(message, details = {}) {
  return Object.assign(new TypeError(message), {
    statusCode: 400,
    details
  });
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  if (value == null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function stripJsonExtension(value) {
  return normalizeString(value).replace(/\.json$/iu, "");
}

function firstStringValue(values) {
  return values.map(normalizeString).find(Boolean) || "";
}

function normalizeCatalogIdentityId(value, kind = "") {
  const rawId = firstStringValue([
    value?.options?.catalogId,
    value?.catalogId,
    value?.options?.ref,
    value?.options?.refId,
    value?.options?.sourceId,
    value?.id,
    value?.refId,
    value?.sourceId,
    value?.ref
  ]);
  void kind;
  return stripJsonExtension(rawId).trim();
}

function normalizeStringList(value) {
  return toArray(value)
    .map((entry) => normalizeString(entry))
    .filter(Boolean);
}

function normalizeDefenseList(value) {
  return normalizeStringList(value).map((entry) => entry.toLowerCase());
}

function normalizeCombatDefenses(source = {}) {
  const direct = isPlainObject(source.defenses) ? source.defenses : {};
  return {
    damageResistances: normalizeDefenseList(source.damageResistances || direct.damageResistances),
    damageImmunities: normalizeDefenseList(source.damageImmunities || direct.damageImmunities),
    damageVulnerabilities: normalizeDefenseList(source.damageVulnerabilities || direct.damageVulnerabilities),
    conditionImmunities: normalizeDefenseList(source.conditionImmunities || direct.conditionImmunities)
  };
}

function normalizeIdentityRef(value, kind = "") {
  if (!isPlainObject(value)) {
    return null;
  }

  const identity = {
    id: normalizeCatalogIdentityId(value, kind),
    name: normalizeString(value.name),
    source: normalizeString(value.source),
    kind: normalizeString(value.kind || kind)
  };

  if (!identity.id && !identity.name && !identity.source) {
    return null;
  }

  if (value.classLevel != null) {
    identity.classLevel = toNumber(value.classLevel, 0);
  }

  if (value.hitDie != null) {
    identity.hitDie = toNumber(value.hitDie, 0);
  }

  const options = isPlainObject(value.options) ? deepClone(value.options) : {};
  for (const key of ["ref", "refId", "sourceId", "catalogId"]) {
    if (options[key] == null && value[key] != null && value[key] !== "") {
      options[key] = key === "ref" ? stripJsonExtension(value[key]) : value[key];
    }
  }

  if (options.catalogId == null && String(identity.id || "").includes(":")) {
    options.catalogId = identity.id;
  }

  if (Object.keys(options).length) {
    identity.options = options;
  }

  if (isPlainObject(value.choices)) {
    identity.choices = deepClone(value.choices);
  }

  if (value.choiceSummary != null && value.choiceSummary !== "") {
    identity.choiceSummary = normalizeString(value.choiceSummary);
  }

  if (value.spellcastingAbility != null && value.spellcastingAbility !== "") {
    identity.spellcastingAbility = normalizeString(value.spellcastingAbility);
  }

  for (const key of ["size", "speed", "feature", "subrace"]) {
    if (value[key] != null && value[key] !== "") {
      identity[key] = value[key];
    }
  }

  return identity;
}

function normalizeIdentity(value = {}) {
  const source = isPlainObject(value) ? value : {};
  return {
    name: normalizeString(source.name),
    playerName: normalizeString(source.playerName),
    alignment: normalizeString(source.alignment),
    experience: toNumber(source.experience, 0),
    portraitUrl: normalizeString(source.portraitUrl),
    inspiration: Boolean(source.inspiration)
  };
}

function normalizeAbilityScores(value = {}) {
  const source = isPlainObject(value) ? value : {};
  const scores = {};

  for (const ability of ABILITY_KEYS) {
    scores[ability] = toNumber(source[ability], DEFAULT_ABILITY_SCORE);
  }

  return scores;
}

function normalizeStartingProficiencies(value = {}) {
  const source = isPlainObject(value) ? value : {};
  return {
    skills: normalizeStringList(source.skills),
    tools: normalizeStringList(source.tools),
    languages: normalizeStringList(source.languages),
    armor: normalizeStringList(source.armor),
    weapons: normalizeStringList(source.weapons),
    savingThrows: normalizeStringList(source.savingThrows)
      .map((entry) => entry.toLowerCase())
      .filter((entry) => ABILITY_KEYS.includes(entry))
  };
}

function normalizeBaseChoices(value = {}) {
  const source = isPlainObject(value) ? value : {};
  return {
    race: normalizeIdentityRef(source.race, "races"),
    subrace: normalizeIdentityRef(source.subrace, "subraces"),
    raceChoices: isPlainObject(source.raceChoices) ? deepClone(source.raceChoices) : {},
    background: normalizeIdentityRef(source.background, "backgrounds"),
    backgroundChoices: isPlainObject(source.backgroundChoices) ? deepClone(source.backgroundChoices) : {},
    abilityScores: normalizeAbilityScores(source.abilityScores),
    startingProficiencies: normalizeStartingProficiencies(source.startingProficiencies)
  };
}

function normalizeLevel(value = {}, index = 0) {
  const source = isPlainObject(value) ? value : {};
  const characterLevel = index + 1;
  const level = {
    characterLevel,
    class: normalizeIdentityRef(source.class, "classes"),
    subclass: normalizeIdentityRef(source.subclass, "subclasses"),
    feat: normalizeIdentityRef(source.feat, "feats"),
    hp: toNumber(source.hp, 0),
    choices: toArray(source.choices).map(deepClone)
  };

  if (Array.isArray(source.features)) {
    level.features = source.features.map(deepClone);
  }

  if (ASI_CHARACTER_LEVELS.has(characterLevel)) {
    level.AbilityScoreIncrease = normalizeStringList(source.AbilityScoreIncrease)
      .map((ability) => ability.toLowerCase())
      .filter((ability) => ABILITY_KEYS.includes(ability));
  }

  return level;
}

function guarantee20Levels(levels = []) {
  const sourceLevels = toArray(levels);
  const normalized = [];

  for (let index = 0; index < MAX_CHARACTER_LEVEL; index += 1) {
    normalized.push(normalizeLevel(sourceLevels[index], index));
  }

  return normalized;
}

function normalizeCombatState(value = {}) {
  const source = isPlainObject(value) ? value : {};
  return {
    ac: toNumber(source.ac, 10),
    maxHp: toNumber(source.maxHp, 0),
    currentHp: toNumber(source.currentHp, 0),
    tempHp: toNumber(source.tempHp, 0),
    deathSaves: {
      successes: toNumber(source.deathSaves?.successes, 0),
      failures: toNumber(source.deathSaves?.failures, 0)
    },
    conditions: normalizeStringList(source.conditions),
    exhaustion: toNumber(source.exhaustion, 0),
    defenses: normalizeCombatDefenses(source)
  };
}

function normalizeInventory(value = {}) {
  const source = isPlainObject(value) ? value : {};
  return {
    currency: {
      cp: toNumber(source.currency?.cp, 0),
      sp: toNumber(source.currency?.sp, 0),
      ep: toNumber(source.currency?.ep, 0),
      gp: toNumber(source.currency?.gp, 0),
      pp: toNumber(source.currency?.pp, 0)
    },
    items: toArray(source.items).map((item) => ({
      name: normalizeString(item?.name),
      source: normalizeString(item?.source),
      quantity: toNumber(item?.quantity, 1),
      equipped: Boolean(item?.equipped),
      attuned: Boolean(item?.attuned),
      catalog: normalizeIdentityRef(item?.catalog, "items")
    }))
  };
}

function normalizeSpells(value = {}) {
  const source = isPlainObject(value) ? value : {};
  return {
    spellcastingAbility: normalizeString(source.spellcastingAbility).toLowerCase(),
    cantrips: normalizeStringList(source.cantrips),
    known: normalizeStringList(source.known),
    prepared: normalizeStringList(source.prepared),
    alwaysPrepared: normalizeStringList(source.alwaysPrepared),
    spellSlots: isPlainObject(source.spellSlots) ? deepClone(source.spellSlots) : { byLevel: {} }
  };
}

function normalizeNotes(value = {}) {
  const source = isPlainObject(value) ? value : {};
  return {
    freeform: normalizeString(source.freeform),
    richText: normalizeString(source.richText || source.html),
    conditions: normalizeStringList(source.conditions),
    exhaustion: toNumber(source.exhaustion, 0)
  };
}

function normalizeMetadata(value = {}) {
  const source = isPlainObject(value) ? value : {};
  return {
    sourcePolicy: {
      ruleset: normalizeString(source.sourcePolicy?.ruleset || "2014"),
      allowedSources: normalizeStringList(source.sourcePolicy?.allowedSources)
    },
    tags: normalizeStringList(source.tags)
  };
}

function assertV2OrEmpty(input) {
  if (input?.schemaVersion === "player-sheet-v2-compiled") {
    throw schemaError(
      "Compiled player sheets are runtime-only and cannot be saved. Save the player-sheet-v2 DTO instead.",
      {
        schemaVersion: input.schemaVersion,
        expected: PLAYER_SHEET_SCHEMA_VERSION
      }
    );
  }

  if (input?.schemaVersion && input.schemaVersion !== PLAYER_SHEET_SCHEMA_VERSION) {
    throw schemaError(
      `Unsupported player sheet schemaVersion "${input.schemaVersion}". Expected "${PLAYER_SHEET_SCHEMA_VERSION}".`,
      {
        schemaVersion: input.schemaVersion,
        expected: PLAYER_SHEET_SCHEMA_VERSION
      }
    );
  }
}

function normalizePlayerSheetDto(input = {}, options = {}) {
  const source = isPlainObject(input) ? input : {};
  assertV2OrEmpty(source);

  return {
    schemaVersion: PLAYER_SHEET_SCHEMA_VERSION,
    id: normalizeString(source.id || options.id),
    lastModified: normalizeString(source.lastModified || options.lastModified || nowIso()),
    identity: normalizeIdentity(source.identity),
    baseChoices: normalizeBaseChoices(source.baseChoices),
    levels: guarantee20Levels(source.levels),
    combatState: normalizeCombatState(source.combatState),
    inventory: normalizeInventory(source.inventory),
    spells: normalizeSpells(source.spells),
    resources: toArray(source.resources).map(deepClone),
    notes: normalizeNotes(source.notes),
    metadata: normalizeMetadata(source.metadata)
  };
}

function createEmptyPlayerSheetDto(options = {}) {
  return normalizePlayerSheetDto({
    schemaVersion: PLAYER_SHEET_SCHEMA_VERSION,
    id: options.id || "",
    lastModified: options.lastModified || nowIso(),
    identity: options.identity || {},
    baseChoices: options.baseChoices || {},
    levels: options.levels || [],
    combatState: options.combatState || {},
    inventory: options.inventory || {},
    spells: options.spells || {},
    resources: options.resources || [],
    notes: options.notes || {},
    metadata: options.metadata || {}
  });
}

function createPlaceholderPlayerSheetDto(manifestEntry = {}, options = {}) {
  const id = normalizeString(options.id || manifestEntry.id);
  const playerName = normalizeString(options.playerName || manifestEntry.playerName);
  return createEmptyPlayerSheetDto({
    id,
    lastModified: options.lastModified,
    identity: {
      name: "",
      playerName,
      portraitUrl: normalizeString(options.portraitUrl || manifestEntry.portraitUrl)
    }
  });
}

module.exports = {
  ABILITY_KEYS,
  ASI_CHARACTER_LEVELS,
  MAX_CHARACTER_LEVEL,
  PLAYER_SHEET_SCHEMA_VERSION,
  createEmptyPlayerSheetDto,
  createPlaceholderPlayerSheetDto,
  guarantee20Levels,
  normalizePlayerSheetDto
};
