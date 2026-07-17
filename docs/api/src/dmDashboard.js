"use strict";

const {
  readCharacterSheetWithMetadata,
  readPlayersManifest,
  writeCharacterSheet
} = require("./blobStore");
const { httpError, json, withErrors } = require("./http");
const { normalizePlayerSheetDto } = require("./playerSheetDto");
const { getEntity } = require("./tableStore");

const MAX_ACTION_AMOUNT = 1_000_000;
const CURRENCY_KEYS = new Set(["cp", "sp", "ep", "gp", "pp"]);
const EXPERIENCE_LEVEL_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

function text(value) {
  return String(value || "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value, fallback = 0) {
  return Math.trunc(number(value, fallback));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function readRequestJson(request) {
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch (_error) {
    throw httpError(400, "Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "Request body must be a JSON object.");
  }
  return body;
}

function getActiveLevels(sheet) {
  const levels = Array.isArray(sheet?.levels) ? sheet.levels : [];
  let activeCount = 0;
  levels.forEach((level, index) => {
    if (level?.class || number(level?.hp, 0) > 0) activeCount = index + 1;
  });
  return levels.slice(0, activeCount);
}

function getCharacterLevel(sheet) {
  const experience = Math.max(0, integer(sheet?.identity?.experience, 0));
  let level = 1;
  EXPERIENCE_LEVEL_THRESHOLDS.forEach((threshold, index) => {
    if (experience >= threshold) level = index + 1;
  });
  return level;
}

function unique(values) {
  return [...new Set(values.map(text).filter(Boolean))];
}

function titleCase(value) {
  return text(value).replace(/(^|[\s-])([a-z])/gu, (_match, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function ruleValues(value) {
  if (Array.isArray(value)) return value.flatMap(ruleValues);
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.fixed)) return ruleValues(value.fixed);
  if (typeof value.name === "string") return [value.name];
  return [];
}

function addRuleValues(target, ...values) {
  ruleValues(values).forEach((value) => {
    const normalized = text(value);
    if (normalized) target.add(normalized.toLowerCase());
  });
}

function addDefenseSource(targets, source = {}) {
  if (!source || typeof source !== "object") return;
  const defenses = source.defenses && typeof source.defenses === "object" ? source.defenses : source;
  addRuleValues(targets.damageResistances, defenses.damageResistances, defenses.resistances, defenses.resist, defenses._fRes);
  addRuleValues(targets.damageImmunities, defenses.damageImmunities, defenses.immunities, defenses.immune, defenses._fImm);
  addRuleValues(targets.damageVulnerabilities, defenses.damageVulnerabilities, defenses.vulnerabilities, defenses.vulnerable, defenses._fVuln);
  addRuleValues(targets.conditionImmunities, defenses.conditionImmunities, defenses.conditionImmune, defenses._fCondImm);
}

function addLanguage(target, value) {
  const language = text(value);
  if (!language || /^(?:any|any standard|choose|other)$/iu.test(language)) return;
  target.set(language.toLowerCase(), titleCase(language));
}

function addLanguageSource(target, source = {}) {
  if (!source || typeof source !== "object") return;
  ruleValues([
    source.languages,
    source._fLangs,
    source.proficiencies?.languages,
    source.profile?.proficiencies?.languages
  ]).forEach((value) => addLanguage(target, value));
  for (const group of Array.isArray(source.languageProficiencies) ? source.languageProficiencies : []) {
    for (const [language, granted] of Object.entries(group || {})) {
      if (granted === true) addLanguage(target, language);
    }
  }
}

function storedChoiceSelections(value = {}) {
  if (!value || typeof value !== "object") return [];
  const selections = value.selections && typeof value.selections === "object"
    ? value.selections
    : value;
  return Object.values(selections).filter((selection) => selection && typeof selection === "object");
}

function choiceOptions(selection = {}) {
  const values = Array.isArray(selection.values) ? selection.values : [];
  if (values.length) return values;
  return selection.value == null || selection.value === "" ? [] : [selection.value];
}

function isLanguageChoice(selection = {}) {
  return /language/iu.test([
    selection.type,
    selection.valueKey,
    selection.label
  ].map(text).filter(Boolean).join(" "));
}

function isEgwDragonbornChoice(sheet, selection = {}) {
  return /\begw\b|draconblood|ravenite/iu.test([
    sheet?.baseChoices?.race?.id,
    sheet?.baseChoices?.race?.name,
    sheet?.baseChoices?.race?.subrace,
    sheet?.baseChoices?.race?.source,
    sheet?.baseChoices?.race?.options?.displayName,
    selection.choiceId,
    selection.label,
    selection.sourceName,
    selection.source
  ].map(text).filter(Boolean).join(" "));
}

function addChoiceReferences(targets, languages, sheet, selection = {}) {
  addDefenseSource(targets, selection);
  addDefenseSource(targets, selection.grants);
  addLanguageSource(languages, selection);
  addLanguageSource(languages, selection.grants);

  const options = choiceOptions(selection);
  for (const option of options) {
    if (option && typeof option === "object") {
      addDefenseSource(targets, option);
      addDefenseSource(targets, option.grants);
      addLanguageSource(languages, option);
      addLanguageSource(languages, option.grants);
    }
  }

  if (isLanguageChoice(selection)) {
    options.forEach((option) => addLanguage(
      languages,
      typeof option === "object" ? option.label || option.name || option.value : option
    ));
  }

  if (selection.type === "draconic-ancestry" && !isEgwDragonbornChoice(sheet, selection)) {
    options.forEach((option) => {
      if (option && typeof option === "object") {
        addRuleValues(targets.damageResistances, option.damageType);
      }
    });
  }
}

function summarizeReferences(sheet, catalogRecords = []) {
  const targets = {
    damageResistances: new Set(),
    damageImmunities: new Set(),
    damageVulnerabilities: new Set(),
    conditionImmunities: new Set()
  };
  const languages = new Map();
  unique(sheet?.baseChoices?.startingProficiencies?.languages || []).forEach((value) => addLanguage(languages, value));
  const sources = [
    sheet?.combatState,
    sheet?.combatState?.defenses,
    sheet?.baseChoices?.race,
    sheet?.baseChoices?.subrace,
    sheet?.baseChoices?.background,
    ...catalogRecords
  ];
  for (const source of sources) {
    addDefenseSource(targets, source);
    addDefenseSource(targets, source?.profile);
    addDefenseSource(targets, source?.grants?.defenses);
    addLanguageSource(languages, source);
    addLanguageSource(languages, source?.grants);
  }
  for (const choiceState of [
    sheet?.baseChoices?.raceChoices,
    sheet?.baseChoices?.backgroundChoices,
    sheet?.baseChoices?.proficiencyChoices
  ]) {
    for (const selection of storedChoiceSelections(choiceState)) {
      addChoiceReferences(targets, languages, sheet, selection);
    }
  }
  for (const level of Array.isArray(sheet?.levels) ? sheet.levels : []) {
    for (const choice of Array.isArray(level?.choices) ? level.choices : []) {
      addChoiceReferences(targets, languages, sheet, choice);
    }
  }
  return {
    defenses: Object.fromEntries(Object.entries(targets).map(([key, values]) => [key, [...values]])),
    languages: [...languages.values()]
  };
}

function identityCatalogId(identity) {
  return text(identity?.options?.catalogId || identity?.catalogId || identity?.id).replace(/\.json$/iu, "");
}

function collectCatalogReferences(sheet) {
  const references = [
    { kind: "races", identity: sheet?.baseChoices?.race },
    { kind: "subraces", identity: sheet?.baseChoices?.subrace },
    { kind: "backgrounds", identity: sheet?.baseChoices?.background }
  ];
  const currentLevel = getCharacterLevel(sheet);
  (Array.isArray(sheet?.levels) ? sheet.levels.slice(0, currentLevel) : []).forEach((level) => {
    references.push(
      { kind: "classes", identity: level?.class },
      { kind: "subclasses", identity: level?.subclass },
      { kind: "feats", identity: level?.feat }
    );
  });
  (Array.isArray(sheet?.inventory?.items) ? sheet.inventory.items : [])
    .filter((item) => item?.equipped || item?.attuned)
    .forEach((item) => references.push({ kind: "items", identity: item?.catalog, item }));
  return references
    .map(({ kind, identity, item }) => ({
      kind: text(identity?.kind || kind).toLowerCase(),
      id: identityCatalogId(identity),
      item
    }))
    .filter(({ id }) => Boolean(id));
}

async function loadCatalogRecords(sheet, loader = getEntity) {
  const cache = new Map();
  return (await Promise.all(collectCatalogReferences(sheet).map(async ({ kind, id, item }) => {
    const key = `${kind}:${id}`;
    if (!cache.has(key)) cache.set(key, Promise.resolve(loader(kind, id)).catch(() => null));
    const record = await cache.get(key);
    if (!record) return null;
    if (kind !== "items") return record;
    const requiresAttunement = Boolean(record.reqAttune || record.requiresAttunement || record.attunementRequirement);
    if (requiresAttunement ? !item?.attuned : !item?.equipped) return null;
    return record;
  }))).filter(Boolean);
}

async function summarizeCharacterWithCatalog(sheet, manifestEntry = {}, loader = getEntity) {
  return summarizeCharacter(sheet, manifestEntry, await loadCatalogRecords(sheet, loader));
}

function summarizeCharacter(sheet, manifestEntry = {}, catalogRecords = []) {
  const activeLevels = getActiveLevels(sheet);
  const combat = sheet?.combatState || {};
  const maxHp = Math.max(0, integer(combat.maxHp, 0))
    || activeLevels.reduce((total, level) => total + Math.max(0, integer(level?.hp, 0)), 0);
  const inventory = sheet?.inventory || {};
  const currency = inventory.currency || {};
  const references = summarizeReferences(sheet, catalogRecords);
  return {
    id: text(sheet?.id || manifestEntry.id),
    lastModified: text(sheet?.lastModified),
    name: text(sheet?.identity?.name || manifestEntry.characterName || manifestEntry.id),
    playerName: text(sheet?.identity?.playerName || manifestEntry.playerName),
    portraitUrl: text(sheet?.identity?.portraitUrl || manifestEntry.portraitUrl),
    level: getCharacterLevel(sheet),
    classes: unique(activeLevels.map((level) => level?.class?.name)),
    ac: integer(combat.ac, 10),
    hp: {
      current: Math.max(0, integer(combat.currentHp, 0)),
      max: maxHp,
      temp: Math.max(0, integer(combat.tempHp, 0))
    },
    conditions: unique(Array.isArray(combat.conditions) ? combat.conditions : []),
    exhaustion: clamp(integer(combat.exhaustion, 0), 0, 6),
    deathSaves: {
      successes: clamp(integer(combat.deathSaves?.successes, 0), 0, 3),
      failures: clamp(integer(combat.deathSaves?.failures, 0), 0, 3)
    },
    defenses: references.defenses,
    languages: references.languages,
    currency: Object.fromEntries([...CURRENCY_KEYS].map((key) => [key, Math.max(0, integer(currency[key], 0))])),
    items: (Array.isArray(inventory.items) ? inventory.items : []).map((item, index) => ({
      index,
      name: text(item?.name),
      source: text(item?.source),
      quantity: Math.max(0, integer(item?.quantity, 1)),
      equipped: Boolean(item?.equipped),
      attuned: Boolean(item?.attuned),
      catalog: item?.catalog || null
    }))
  };
}

function positiveAmount(value, label = "Amount") {
  const amount = integer(value, 0);
  if (amount <= 0 || amount > MAX_ACTION_AMOUNT) {
    throw httpError(400, `${label} must be between 1 and ${MAX_ACTION_AMOUNT}.`);
  }
  return amount;
}

function applyDmAction(sheet, action = {}) {
  const next = JSON.parse(JSON.stringify(sheet || {}));
  next.combatState = next.combatState || {};
  next.combatState.deathSaves = next.combatState.deathSaves || { successes: 0, failures: 0 };
  next.combatState.conditions = Array.isArray(next.combatState.conditions) ? next.combatState.conditions : [];
  next.inventory = next.inventory || { currency: {}, items: [] };
  next.inventory.currency = next.inventory.currency || {};
  next.inventory.items = Array.isArray(next.inventory.items) ? next.inventory.items : [];

  const type = text(action.type).toLowerCase();
  const maxHp = getActiveLevels(next).reduce((total, level) => total + Math.max(0, integer(level?.hp, 0)), 0);
  if (type === "damage") {
    let remaining = positiveAmount(action.amount, "Damage");
    const temp = Math.max(0, integer(next.combatState.tempHp, 0));
    const absorbed = Math.min(temp, remaining);
    next.combatState.tempHp = temp - absorbed;
    remaining -= absorbed;
    next.combatState.currentHp = Math.max(0, integer(next.combatState.currentHp, 0) - remaining);
  } else if (type === "heal") {
    const healed = integer(next.combatState.currentHp, 0) + positiveAmount(action.amount, "Healing");
    next.combatState.currentHp = maxHp > 0 ? Math.min(maxHp, healed) : healed;
  } else if (type === "temp-hp") {
    next.combatState.tempHp = positiveAmount(action.amount, "Temporary HP");
  } else if (type === "add-condition") {
    const condition = text(action.condition).slice(0, 80);
    if (!condition) throw httpError(400, "Condition is required.");
    if (!next.combatState.conditions.some((entry) => text(entry).toLowerCase() === condition.toLowerCase())) {
      next.combatState.conditions.push(condition);
    }
  } else if (type === "remove-condition") {
    const condition = text(action.condition).toLowerCase();
    next.combatState.conditions = next.combatState.conditions.filter((entry) => text(entry).toLowerCase() !== condition);
  } else if (type === "set-exhaustion") {
    next.combatState.exhaustion = clamp(integer(action.value, 0), 0, 6);
  } else if (type === "set-death-saves") {
    next.combatState.deathSaves = {
      successes: clamp(integer(action.successes, 0), 0, 3),
      failures: clamp(integer(action.failures, 0), 0, 3)
    };
  } else if (type === "adjust-currency") {
    const currency = text(action.currency).toLowerCase();
    if (!CURRENCY_KEYS.has(currency)) throw httpError(400, "Currency must be cp, sp, ep, gp, or pp.");
    const delta = integer(action.amount, 0);
    if (!delta || Math.abs(delta) > MAX_ACTION_AMOUNT) throw httpError(400, "Currency adjustment is invalid.");
    next.inventory.currency[currency] = Math.max(0, integer(next.inventory.currency[currency], 0) + delta);
  } else if (type === "give-item") {
    const name = text(action.item?.name).slice(0, 200);
    const source = text(action.item?.source).slice(0, 80);
    const quantity = positiveAmount(action.quantity || 1, "Quantity");
    if (!name) throw httpError(400, "Item name is required.");
    const catalog = action.item?.catalog && typeof action.item.catalog === "object" ? action.item.catalog : null;
    const catalogId = text(catalog?.id);
    const existing = next.inventory.items.find((item) => {
      const itemCatalogId = text(item?.catalog?.id);
      return catalogId ? itemCatalogId === catalogId : text(item?.name).toLowerCase() === name.toLowerCase() && text(item?.source).toLowerCase() === source.toLowerCase();
    });
    if (existing) existing.quantity = Math.max(0, integer(existing.quantity, 1)) + quantity;
    else next.inventory.items.push({ name, source, quantity, equipped: false, attuned: false, catalog });
  } else if (type === "remove-item") {
    const index = integer(action.index, -1);
    if (index < 0 || index >= next.inventory.items.length) throw httpError(400, "Inventory item index is invalid.");
    next.inventory.items.splice(index, 1);
  } else {
    throw httpError(400, "Unsupported DM action.", { type });
  }
  return next;
}

async function dmPartyHandler(request, context) {
  return withErrors(request, context, async () => {
    const manifest = await readPlayersManifest();
    const entries = Array.isArray(manifest?.characters) ? manifest.characters.filter((entry) => entry?.status !== "inactive") : [];
    const catalogCache = new Map();
    const loadCatalogEntity = (kind, id) => {
      const key = `${kind}:${id}`;
      if (!catalogCache.has(key)) catalogCache.set(key, getEntity(kind, id));
      return catalogCache.get(key);
    };
    const characters = (await Promise.all(entries.map(async (entry) => {
      const stored = await readCharacterSheetWithMetadata(entry.id);
      return stored?.document
        ? summarizeCharacterWithCatalog(normalizePlayerSheetDto(stored.document, { id: entry.id }), entry, loadCatalogEntity)
        : null;
    }))).filter(Boolean);
    return json(request, 200, { count: characters.length, characters });
  });
}

async function dmCharacterActionHandler(request, context) {
  return withErrors(request, context, async () => {
    const id = text(request.params?.id);
    const current = await readCharacterSheetWithMetadata(id);
    if (!current) return json(request, 404, { error: "Character sheet not found." });
    const action = await readRequestJson(request);
    const timestamp = new Date().toISOString();
    const updated = normalizePlayerSheetDto(applyDmAction(current.document, action), { id, lastModified: timestamp });
    updated.lastModified = timestamp;
    try {
      const stored = await writeCharacterSheet(id, updated, { ifMatch: current.etag });
      return json(request, 200, { character: await summarizeCharacterWithCatalog(stored) });
    } catch (error) {
      if (error?.statusCode === 412 || error?.code === "ConditionNotMet") {
        throw httpError(409, "Character changed while the action was applied. Refresh and try again.", { id });
      }
      throw error;
    }
  });
}

module.exports = {
  applyDmAction,
  dmCharacterActionHandler,
  dmPartyHandler,
  loadCatalogRecords,
  summarizeCharacter,
  summarizeCharacterWithCatalog
};
