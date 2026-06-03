import { CharacterBuilder } from "./character-builder.js";
import { CharacterBuilderCompiler } from "./character-builder-compiler.js";
import { CharacterBuilderEvents } from "./character-builder-events.js";
import { CharacterBuilderLoader } from "./character-builder-loader.js";
import {
  ADD_LEVEL_FOCUS_KEY,
  CharacterBuilderRenderer,
  getLevelFocusKey
} from "./character-builder-render.js";
import { normalizeProficiencyChoiceValue } from "./character-builder-proficiency-ledger.js";
import { CharacterBuilderRules, normalizeRulesProfile } from "./character-builder-rules.js";
import { CharacterModel } from "../shared/character-model.js";
import { ABILITY_ORDER, deepClone, sanitizeFileName, stringifyJson } from "../shared/character-state.js";

/**
 * @typedef {Object} CharacterBuilderAppConfig
 * @property {"new"|"edit"} mode - Whether to create a new draft or edit an existing character.
 * @property {string|null} characterId - Stable id shared by builder DTO and final character DTO.
 * @property {string|Element|null} mount - Optional selector/element for rendering the builder shell.
 * @property {string} rulesCatalogBasePath - Static base path for generated normalized catalog JSON.
 * @property {string[]} rulesCatalogKeys - Normalized catalog keys to load with the manifest.
 * @property {string} rulesBasePath - Static base path for 5etools/rules JSON.
 * @property {string} characterBaseUrl - Base URL/path for final v1 character DTOs.
 * @property {string} builderBaseUrl - Base URL/path for builder-decision DTOs.
 * @property {Object|null} characterDto - Already-loaded final v1 character DTO.
 * @property {Object|null} builderDto - Already-loaded builder-decision DTO.
 * @property {string} characterUrl - Optional direct/path-template final DTO URL.
 * @property {string} builderUrl - Optional direct/path-template builder DTO URL.
 * @property {"save"|"export-only"} persistenceMode - Whether save actions may write or only export draft JSON.
 * @property {string} saveMethod - HTTP method used when saving remote DTOs.
 * @property {Object} rulesProfile - Campaign/source rules such as ASI+feat behavior.
 * @property {Object} rulesFiles - Optional overrides for core 5etools rules files.
 * @property {Object} callbacks - Optional lifecycle callbacks owned by the embedding page.
 */

export const DEFAULT_CHARACTER_BUILDER_CONFIG = {
  mode: "edit",
  characterId: null,
  mount: null,
  rulesCatalogBasePath: "",
  rulesCatalogKeys: undefined,
  rulesBasePath: "",
  characterBaseUrl: "",
  builderBaseUrl: "",
  characterDto: null,
  builderDto: null,
  characterUrl: "",
  builderUrl: "",
  persistenceMode: "save",
  saveMethod: "PUT",
  rulesFiles: {},
  rulesProfile: {
    ruleset: "2014",
    allowedSources: ["PHB"],
    asiAndFeatAtAsiLevels: true,
    sourcePolicy: null
  },
  callbacks: {
    onOpen: null,
    onLoad: null,
    onClose: null,
    onSave: null,
    onExport: null,
    onError: null
  }
};

function normalizeMode(mode) {
  return mode === "new" ? "new" : "edit";
}

function normalizePersistenceMode(mode) {
  return mode === "export-only" ? "export-only" : "save";
}

function normalizeOptionalString(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeId(value) {
  return String(value ?? "").trim();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function createPreloadedDtoResult(dto, type) {
  if (!toObject(dto)) {
    return {
      ok: false,
      reason: `invalid-${type}-dto`,
      url: "",
      status: 0,
      missing: false,
      data: null,
      dto: null,
      error: null
    };
  }

  return {
    ok: true,
    reason: "preloaded",
    url: "",
    status: 0,
    missing: false,
    data: dto,
    dto,
    error: null
  };
}

function groupSubclassFeaturesByLevel(features = []) {
  const groups = new Map();

  for (const feature of toArray(features)) {
    const level = Number(feature?.level ?? 0);
    const key = Number.isFinite(level) && level > 0 ? level : 0;
    groups.set(key, [...(groups.get(key) ?? []), feature]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([level, entries]) => ({
      level,
      features: entries
    }));
}

const ABILITY_LABELS = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
};

function stripJsonExtension(value) {
  return String(value ?? "").trim().replace(/\.json$/i, "");
}

function stripAnchor(value) {
  return String(value ?? "").trim().split("#")[0];
}

function sourceKeyFromRef(value) {
  return stripJsonExtension(stripAnchor(value)).toLowerCase();
}

function spellKey(spell = {}) {
  return [
    String(spell.name ?? spell.spell ?? "").trim().toLowerCase(),
    String(spell.source ?? "").trim().toUpperCase(),
    spell.level == null ? "" : String(spell.level)
  ].join("|");
}

function cleanRefName(ref) {
  return stripJsonExtension(ref)
    .replace(/^(background|class|race|subclass|feat)-/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanRulesText(value) {
  if (Array.isArray(value)) {
    return value.map(cleanRulesText).filter(Boolean).join(" ");
  }

  if (value && typeof value === "object") {
    return cleanRulesText(value.entries ?? value.items ?? value.name ?? "");
  }

  return String(value ?? "")
    .replace(/\{@[a-zA-Z0-9_-]+ ([^|}]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{=([^}]+)\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeComparable(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeSourceKey(value) {
  return normalizeString(value).toUpperCase();
}

function parseSubclassFeatureRefString(value) {
  const parts = normalizeString(value).split("|");
  return {
    name: normalizeString(parts[0]),
    className: normalizeString(parts[1]),
    classSource: normalizeString(parts[2]),
    subclassShortName: normalizeString(parts[3]),
    subclassSource: normalizeString(parts[4]),
    level: Number(parts[5] || 0),
    source: normalizeString(parts[6])
  };
}

function subclassFeatureLookupKey(parts = {}) {
  return [
    normalizeComparable(parts.name),
    normalizeComparable(parts.className),
    normalizeComparable(parts.subclassShortName),
    Number(parts.level || 0),
    normalizeSourceKey(parts.source)
  ].join("|");
}

function getNormalizedCatalogs(rulesData = {}) {
  return toObject(toObject(rulesData.normalizedCatalog).catalogs ?? rulesData.catalogs);
}

function getReferencedSubclassFeatureRefs(value) {
  if (Array.isArray(value)) {
    return value.flatMap(getReferencedSubclassFeatureRefs);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return [
    value.type === "refSubclassFeature" && value.subclassFeature
      ? normalizeString(value.subclassFeature)
      : "",
    ...getReferencedSubclassFeatureRefs(value.entries),
    ...getReferencedSubclassFeatureRefs(value.items),
    ...getReferencedSubclassFeatureRefs(value.entry)
  ].filter(Boolean);
}

function getAncestryNameSearchText(entity = {}) {
  return [
    entity.name,
    entity.displayName,
    entity.raceName,
    entity.subraceName,
    entity.shortName
  ].map(normalizeComparable).filter(Boolean).join(" ");
}

function titleCaseToken(value) {
  return normalizeText(value)
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/'S\b/g, "'s");
}

function getRuleFullText(entity = {}) {
  return [
    cleanRulesText(entity.entries),
    cleanRulesText(entity.inherits?.entries),
    cleanRulesText(entity.raw?.entries),
    cleanRulesText(entity.classFeatures),
    cleanRulesText(entity.subclassFeatures)
  ].filter(Boolean).join("\n\n");
}

function getRuleSummary(entity = {}) {
  const text = getRuleFullText(entity);
  return text.length > 180 ? `${text.slice(0, 179).trim()}...` : text;
}

function createEmptyAbilityDeltaMap() {
  return Object.fromEntries(ABILITY_ORDER.map((ability) => [ability, 0]));
}

function addAbilityRule(map, rule) {
  const source = toObject(rule);
  for (const ability of ABILITY_ORDER) {
    const amount = Number(source[ability] ?? 0);
    if (Number.isFinite(amount)) {
      map[ability] += amount;
    }
  }

  return map;
}

function addAbilityIncreases(map, increases = []) {
  for (const increase of toArray(increases)) {
    const ability = String(increase?.ability ?? "").trim().toLowerCase();
    const amount = Number(increase?.amount ?? 0);
    if (ABILITY_ORDER.includes(ability) && Number.isFinite(amount)) {
      map[ability] += amount;
    }
  }

  return map;
}

function formatSignedAmount(amount) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : String(value);
}

function formatAbilityDeltaMap(map, emptyLabel = "No ability impact") {
  const entries = ABILITY_ORDER
    .map((ability) => {
      const amount = Number(map?.[ability] ?? 0);
      return Number.isFinite(amount) && amount !== 0
        ? `${ABILITY_LABELS[ability]} ${formatSignedAmount(amount)}`
        : "";
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : emptyLabel;
}

function formatAbilityChoice(rule) {
  const choose = toObject(rule?.choose);
  if (!Object.keys(choose).length) {
    return "";
  }

  const patterns = toArray(choose.patterns).map((pattern) => normalizeString(pattern.label || pattern.value)).filter(Boolean);
  if (patterns.length) {
    return `Choose ability score increases (${patterns.join(" or ")})`;
  }

  const count = Number(choose.count ?? rule.count ?? 1);
  const amount = Number(choose.amount ?? rule.amount ?? 1);
  const options = toArray(choose.from)
    .map((ability) => ABILITY_LABELS[normalizeComparable(ability)] ?? String(ability).toUpperCase())
    .join(", ");

  return `Choose ${Number.isFinite(count) ? count : 1} ability score increase${count === 1 ? "" : "s"} ${amount > 0 ? "+" : ""}${Number.isFinite(amount) ? amount : 1}${options ? ` from ${options}` : ""}`;
}

function formatCollectionGrant(label, grant = {}) {
  const fixed = toArray(grant.fixed).map(titleCaseToken).filter(Boolean);
  const choices = toArray(grant.choices).map((choice) => {
    const count = Number(choice.count ?? 1);
    const options = toArray(choice.from).map(titleCaseToken).join(", ");
    return `choose ${Number.isFinite(count) ? count : 1}${options ? ` from ${options}` : ""}`;
  });
  const parts = [...fixed, ...choices];

  return parts.length ? `${label}: ${parts.join(", ")}` : "";
}

function formatFixedAndChoiceGrants(grants = {}) {
  return [
    formatCollectionGrant("Skills", grants.skills),
    formatCollectionGrant("Tools", grants.tools),
    formatCollectionGrant("Languages", grants.languages),
    formatCollectionGrant("Skill/Tool/Language", grants.skillToolLanguages),
    formatCollectionGrant("Feats", grants.feats)
  ].filter(Boolean);
}

function formatChoiceRequirementSummary(definitions = []) {
  const entries = toArray(definitions);
  if (!entries.length) {
    return "Choices: None";
  }

  return `Choices: ${entries.map((definition) => {
    const label = definition.label || titleCaseToken(definition.type || "Choice");
    const count = Number(definition.count ?? 1);
    return `${label} pick ${Number.isFinite(count) ? count : 1}`;
  }).join(", ")}`;
}

function mergeGrantCollections(entities = []) {
  const merged = {};
  for (const collection of ["skills", "tools", "languages", "skillToolLanguages", "feats"]) {
    merged[collection] = {
      fixed: [],
      choices: []
    };
  }

  for (const entity of entities) {
    for (const collection of Object.keys(merged)) {
      merged[collection].fixed.push(...toArray(entity?.grants?.[collection]?.fixed));
      merged[collection].choices.push(...toArray(entity?.grants?.[collection]?.choices));
    }
  }

  for (const collection of Object.keys(merged)) {
    merged[collection].fixed = [...new Set(merged[collection].fixed)];
  }

  return merged;
}

function mergeChoiceLists(...choiceLists) {
  const seen = new Set();
  const merged = [];

  for (const choice of choiceLists.flatMap(toArray)) {
    const key = [
      choice.choiceId,
      choice.type,
      choice.classRef,
      choice.characterLevel ?? "",
      choice.unlockAtClassLevel ?? "",
      choice.blockedReason ?? ""
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(choice);
  }

  return merged;
}

function splitInlineList(value) {
  return String(value ?? "")
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function optionMatchesRawValue(option = {}, rawValue = "") {
  const target = String(rawValue ?? "").trim().toLowerCase();
  if (!target) {
    return false;
  }

  if (typeof option === "string") {
    return option.trim().toLowerCase() === target;
  }

  return [
    option.value,
    option.ref,
    option.name,
    option.label,
    option.sourceId
  ].some((value) => String(value ?? "").trim().toLowerCase() === target);
}

function findDefinitionOption(definition = {}, rawValue = "") {
  return toArray(definition.options).find((option) => optionMatchesRawValue(option, rawValue)) ?? null;
}

function getAbilityPatternDefinitions(definition = {}) {
  return toArray(definition.patterns)
    .map((pattern) => ({
      ...pattern,
      value: normalizeString(pattern.value),
      groups: toArray(pattern.groups)
    }))
    .filter((pattern) => pattern.value && pattern.groups.length);
}

function parseAbilityPatternToken(value = "") {
  const text = normalizeString(value);
  if (text.startsWith("pattern:")) {
    return {
      kind: "pattern",
      pattern: normalizeString(text.slice("pattern:".length))
    };
  }

  const [pattern, groupId, ability, amount] = text.split(":");
  return pattern && groupId && ability
    ? {
        kind: "ability",
        pattern: normalizeString(pattern),
        groupId: normalizeString(groupId),
        ability: normalizeString(ability),
        amount: Number(amount ?? 1)
      }
    : null;
}

function buildAbilityPatternChoiceValue(definition = {}, rawValues = []) {
  const patterns = getAbilityPatternDefinitions(definition);
  const tokens = toArray(rawValues).map(parseAbilityPatternToken).filter(Boolean);
  const selectedPatternValue = tokens.find((token) => token.kind === "pattern")?.pattern
    || patterns[0]?.value
    || "";
  const pattern = patterns.find((entry) => entry.value === selectedPatternValue) ?? patterns[0] ?? null;
  const increases = [];

  if (!pattern) {
    return {
      pattern: selectedPatternValue,
      increases
    };
  }

  for (const token of tokens) {
    if (token.kind !== "ability" || token.pattern !== pattern.value) {
      continue;
    }

    const group = toArray(pattern.groups).find((entry) => normalizeString(entry.id) === token.groupId);
    const option = findDefinitionOption(definition, token.ability);
    if (!group || !option) {
      continue;
    }

    increases.push({
      ability: option.value || option.ref || option.name || option.label,
      amount: Number(group.amount ?? token.amount ?? 1),
      pattern: pattern.value,
      groupId: normalizeString(group.id)
    });
  }

  return {
    pattern: pattern.value,
    increases
  };
}

function buildIdentityChoiceValue(definition = {}, rawValues = []) {
  const values = toArray(rawValues).map((value) => String(value ?? "").trim()).filter(Boolean);
  const options = values.map((value) => findDefinitionOption(definition, value)).filter(Boolean);
  const firstOption = options[0] ?? null;
  const valueKey = String(definition.valueKey ?? definition.type ?? "choice");
  const count = Math.max(1, Number(definition.count ?? 1));
  const selectedValues = options.map((option) => option.value || option.ref || option.name || option.label).filter(Boolean);

  if (definition.control === "ability-score-pattern") {
    return buildAbilityPatternChoiceValue(definition, values);
  }

  if (definition.type === "racial-asi") {
    return {
      increases: selectedValues.map((ability) => ({
        ability,
        amount: Number(definition.amount ?? 1)
      }))
    };
  }

  if (definition.type === "feat") {
    return count > 1
      ? {
          feats: options.map((option) => ({
            feat: option.name || option.label,
            ref: option.ref || option.value
          }))
        }
      : {
          feat: firstOption?.name || firstOption?.label || selectedValues[0],
          ref: firstOption?.ref || firstOption?.value || selectedValues[0]
        };
  }

  if (definition.type === "spell" || definition.type === "cantrip") {
    const mapSpell = (option) => ({
      spell: option.name || option.label,
      source: option.source || "",
      ref: option.ref || option.value,
      level: option.level ?? null
    });
    return count > 1
      ? { spells: options.map(mapSpell) }
      : mapSpell(firstOption ?? {});
  }

  if (definition.type === "draconic-ancestry") {
    return {
      ancestry: firstOption?.value || firstOption?.label || selectedValues[0],
      damageType: firstOption?.damageType || "",
      breathWeapon: firstOption?.breathWeapon || "",
      savingThrow: firstOption?.savingThrow || "",
      grants: deepClone(firstOption?.grants ?? {})
    };
  }

  if (count > 1) {
    const pluralKey = valueKey.endsWith("s") ? valueKey : `${valueKey}s`;
    return {
      [pluralKey]: selectedValues
    };
  }

  return {
    [valueKey]: selectedValues[0] ?? ""
  };
}

function buildIdentityChoiceRecord(definition = {}, rawValues = []) {
  return {
    choiceId: String(definition.choiceId ?? definition.id ?? ""),
    type: String(definition.type ?? ""),
    value: buildIdentityChoiceValue(definition, rawValues)
  };
}

function getIdentityChoiceRecordValues(choice = {}) {
  const value = toObject(choice.value);
  const values = [];

  for (const key of ["ref", "value", "name", "feat", "spell", "skill", "tool", "language", "ancestry", "specialty"]) {
    if (value[key]) {
      values.push(value[key]);
    }
  }

  for (const key of ["feats", "spells", "skills", "tools", "languages", "picks"]) {
    for (const entry of toArray(value[key])) {
      if (entry && typeof entry === "object") {
        values.push(entry.ref, entry.value, entry.name, entry.feat, entry.spell);
      } else {
        values.push(entry);
      }
    }
  }

  for (const increase of toArray(value.increases)) {
    values.push(increase?.ability);
  }

  return values.map((entry) => String(entry ?? "").trim()).filter(Boolean);
}

function getChoiceOptionKey(option = {}) {
  if (typeof option === "string") {
    return normalizeComparable(option);
  }

  return normalizeComparable(option.value || option.ref || option.sourceId || option.name || option.label);
}

function getCanonicalChoiceValue(option = {}, fallback = "") {
  if (typeof option === "string") {
    return option;
  }

  return String(option.value || option.ref || option.sourceId || option.name || option.label || fallback || "").trim();
}

function getChoiceValidationLabel(definition = {}) {
  return definition.label || definition.choiceId || definition.id || "Choice";
}

function getChoiceValidationLimit(value, fallback = 1) {
  const count = Number(value ?? fallback);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : fallback;
}

function validateAbilityPatternChoiceValues(definition = {}, rawValues = []) {
  const patterns = getAbilityPatternDefinitions(definition);
  const values = toArray(rawValues).map((value) => String(value ?? "").trim()).filter(Boolean);
  const label = getChoiceValidationLabel(definition);
  const tokens = [];
  const invalidValues = [];

  if (!patterns.length) {
    throw new Error(`${label} has no normalized ability-score patterns.`);
  }

  for (const value of values) {
    const token = parseAbilityPatternToken(value);
    if (token) {
      tokens.push(token);
    } else {
      invalidValues.push(value);
    }
  }

  if (invalidValues.length) {
    throw new Error(`${label} includes unsupported ability-score value(s): ${invalidValues.join(", ")}.`);
  }

  const selectedPatternValue = [...tokens].reverse().find((token) => token.kind === "pattern")?.pattern
    || patterns[0]?.value
    || "";
  const pattern = patterns.find((entry) => entry.value === selectedPatternValue) ?? null;
  if (!pattern) {
    throw new Error(`${label} uses an unsupported ability-score pattern: ${selectedPatternValue || "(blank)"}.`);
  }

  const canonicalValues = [`pattern:${pattern.value}`];
  const selectedByGroup = new Map();
  const seenByGroup = new Set();

  for (const token of tokens) {
    if (token.kind !== "ability" || token.pattern !== pattern.value) {
      continue;
    }

    const group = toArray(pattern.groups).find((entry) => normalizeString(entry.id) === token.groupId);
    const option = findDefinitionOption(definition, token.ability);
    if (!group || !option) {
      invalidValues.push(token.ability || token.groupId || token.pattern);
      continue;
    }

    const groupId = normalizeString(group.id);
    const ability = getCanonicalChoiceValue(option, token.ability);
    const optionKey = getChoiceOptionKey(option);
    const uniqueKey = `${groupId}:${optionKey}`;
    if (seenByGroup.has(uniqueKey)) {
      continue;
    }

    seenByGroup.add(uniqueKey);
    const entries = selectedByGroup.get(groupId) ?? [];
    selectedByGroup.set(groupId, [...entries, {
      ability,
      optionKey
    }]);
    canonicalValues.push(`${pattern.value}:${groupId}:${ability}:${Number(group.amount ?? token.amount ?? 1)}`);
  }

  if (invalidValues.length) {
    throw new Error(`${label} includes unsupported ability-score value(s): ${[...new Set(invalidValues)].join(", ")}.`);
  }

  for (const group of toArray(pattern.groups)) {
    const groupId = normalizeString(group.id);
    const limit = getChoiceValidationLimit(group.count, 1);
    const entries = selectedByGroup.get(groupId) ?? [];
    if (entries.length > limit) {
      throw new Error(`${label} allows at most ${limit} pick${limit === 1 ? "" : "s"} in ${group.label || groupId}.`);
    }
  }

  if (pattern.distinct !== false) {
    const seenAbilities = new Set();
    for (const entries of selectedByGroup.values()) {
      for (const entry of entries) {
        const abilityKey = normalizeComparable(entry.ability);
        if (seenAbilities.has(abilityKey)) {
          throw new Error(`${label} requires different abilities for each increase.`);
        }
        seenAbilities.add(abilityKey);
      }
    }
  }

  return canonicalValues;
}

function validateIdentityChoiceValues(definition = {}, rawValues = []) {
  const values = toArray(rawValues).map((value) => String(value ?? "").trim()).filter(Boolean);
  const label = getChoiceValidationLabel(definition);

  if (!values.length) {
    return [];
  }

  if (definition.control === "ability-score-pattern") {
    return validateAbilityPatternChoiceValues(definition, values);
  }

  const matchedByOption = new Map();
  const invalidValues = [];

  for (const value of values) {
    const option = findDefinitionOption(definition, value);
    if (!option) {
      invalidValues.push(value);
      continue;
    }

    const key = getChoiceOptionKey(option);
    if (!matchedByOption.has(key)) {
      matchedByOption.set(key, getCanonicalChoiceValue(option, value));
    }
  }

  if (invalidValues.length) {
    throw new Error(`${label} includes unsupported value(s): ${[...new Set(invalidValues)].join(", ")}.`);
  }

  const limit = getChoiceValidationLimit(definition.count, 1);
  const selectedValues = [...matchedByOption.values()];
  if (selectedValues.length > limit) {
    throw new Error(`${label} allows at most ${limit} option${limit === 1 ? "" : "s"}.`);
  }

  return selectedValues;
}

const ABILITY_ALIASES = {
  str: "str",
  strength: "str",
  dex: "dex",
  dexterity: "dex",
  con: "con",
  constitution: "con",
  int: "int",
  intelligence: "int",
  wis: "wis",
  wisdom: "wis",
  cha: "cha",
  charisma: "cha"
};

function parseAsiInput(value) {
  return splitInlineList(value)
    .map((entry) => {
      const match = /^([a-zA-Z]+)\s*(?::|\+|\s)\s*([+-]?\d+)$/u.exec(entry);
      if (!match) {
        return null;
      }

      const ability = ABILITY_ALIASES[match[1].toLowerCase()];
      const amount = Number(match[2]);
      return ability && Number.isFinite(amount) && amount !== 0
        ? { ability, amount }
        : null;
    })
    .filter(Boolean);
}

function isUnavailableSaveReason(reason) {
  return [
    "save-endpoint-unavailable",
    "fetch-unavailable",
    "missing-url"
  ].includes(String(reason ?? ""));
}

function canUseBrowserDownload() {
  return typeof document !== "undefined"
    && typeof Blob !== "undefined"
    && typeof URL !== "undefined"
    && typeof URL.createObjectURL === "function";
}

function triggerJsonDownload(file) {
  const blob = new Blob([file.text], { type: file.mimeType || "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Normalizes the public open(...) configuration into the app's internal shape.
 * DTO endpoints remain abstract here; CharacterBuilderLoader resolves concrete URLs.
 */
export function normalizeCharacterBuilderConfig(config = {}) {
  const mode = normalizeMode(config.mode ?? DEFAULT_CHARACTER_BUILDER_CONFIG.mode);

  return {
    ...DEFAULT_CHARACTER_BUILDER_CONFIG,
    ...config,
    mode,
    characterId: normalizeOptionalString(config.characterId),
    rulesCatalogBasePath: String(config.rulesCatalogBasePath ?? "").trim(),
    rulesCatalogKeys: Array.isArray(config.rulesCatalogKeys) ? [...config.rulesCatalogKeys] : undefined,
      rulesBasePath: String(config.rulesBasePath ?? "").trim(),
      characterBaseUrl: String(config.characterBaseUrl ?? "").trim(),
      builderBaseUrl: String(config.builderBaseUrl ?? "").trim(),
      characterDto: config.characterDto ?? null,
      builderDto: config.builderDto ?? null,
      characterUrl: String(config.characterUrl ?? "").trim(),
      builderUrl: String(config.builderUrl ?? "").trim(),
    persistenceMode: normalizePersistenceMode(config.persistenceMode),
    saveMethod: String(config.saveMethod ?? DEFAULT_CHARACTER_BUILDER_CONFIG.saveMethod).trim() || "PUT",
    rulesFiles: toObject(config.rulesFiles),
    rulesProfile: normalizeRulesProfile({
      ...DEFAULT_CHARACTER_BUILDER_CONFIG.rulesProfile,
      ...config.rulesProfile
    }),
    callbacks: {
      ...DEFAULT_CHARACTER_BUILDER_CONFIG.callbacks,
      ...config.callbacks
    }
  };
}

/**
 * Top-level self-contained builder controller.
 * This class owns orchestration between loading, rules, builder state, compiler,
 * rendering, and DOM events. It deliberately avoids owning detailed rule logic.
 */
export class CharacterBuilderApp {
  constructor(options = {}) {
    this.config = normalizeCharacterBuilderConfig(options.config);
    this.loader = options.loader ?? new CharacterBuilderLoader(this.config);
    this.rules = options.rules ?? new CharacterBuilderRules({ rulesProfile: this.config.rulesProfile });
    this.compiler = options.compiler ?? new CharacterBuilderCompiler({ rulesAdapter: this.rules });
    this.renderer = options.renderer ?? new CharacterBuilderRenderer();
    this.events = options.events ?? new CharacterBuilderEvents();
    this.builder = options.builder ?? null;
    this.characterDto = null;
    this.rulesLoadResult = null;
    this.builderLoadResult = null;
    this.characterLoadResult = null;
    this.loadStatus = "idle";
    this.loadIssues = [];
    this.isOpen = false;
    this.saveStatus = "idle";
    this.exportStatus = "idle";
    this.lastSaveResult = null;
    this.lastExportResult = null;
    this.lastRenderTransaction = null;
    this.guidedOverlay = null;
    this.subclassFeatureDetailLookup = null;
    this.subclassFeatureDetailLookupRulesData = null;
    this.ready = Promise.resolve(this);
  }

  /**
   * Opens the builder in edit or new mode.
   * The shell renders immediately with loading state, then this.ready resolves
   * after rules, builder DTO, and final character DTO loading complete.
   */
  open(config = {}) {
    this.config = normalizeCharacterBuilderConfig({
      ...this.config,
      ...config
    });

    this.loader.configure(this.config);
    this.rules.setRulesProfile(this.config.rulesProfile);
    this.compiler.setRulesAdapter(this.rules);

    this.builder = CharacterBuilder.createEmpty({
      characterId: this.config.characterId ?? undefined,
      rulesAdapter: this.rules
    });
    this.characterDto = null;
    this.rulesLoadResult = null;
    this.builderLoadResult = null;
    this.characterLoadResult = null;
    this.loadStatus = "loading";
    this.loadIssues = [];

    this.isOpen = true;
    this.saveStatus = "idle";
    this.exportStatus = "idle";
    this.lastSaveResult = null;
    this.lastExportResult = null;
    this.lastRenderTransaction = null;
    this.guidedOverlay = null;

    this.renderer.mount(this.config.mount).render(this.getSnapshot());
    this.events.bind({
      app: this,
      root: this.renderer.root
    });
    this.config.callbacks.onOpen?.(this.getSnapshot());
    this.ready = this.#loadOpenData();
    return this;
  }

  async #loadOpenData() {
    try {
      const [rulesResult, builderResult, characterResult] = await Promise.all([
        this.loader.loadRulesData(),
        this.config.builderDto
          ? Promise.resolve(createPreloadedDtoResult(this.config.builderDto, "builder"))
          : this.loader.loadBuilderDto(this.config.characterId),
        this.config.characterDto
          ? Promise.resolve(createPreloadedDtoResult(this.config.characterDto, "character"))
          : this.loader.loadCharacterDto(this.config.characterId)
      ]);

      this.rulesLoadResult = rulesResult;
      this.builderLoadResult = builderResult;
      this.characterLoadResult = characterResult;

      if (rulesResult.data) {
        this.rules.replaceRulesData(rulesResult.data);
      }

      const builderDto = builderResult.ok && builderResult.dto
        ? this.#alignLoadedBuilderDto(builderResult.dto, builderResult.url)
        : null;
      const characterDto = characterResult.ok && characterResult.dto
        ? this.#alignLoadedCharacterDto(characterResult.dto, characterResult.url)
        : null;

      if (characterDto) {
        this.characterDto = characterDto;
      } else {
        this.loadIssues.push({
          type: "character",
          reason: characterResult.reason,
          url: characterResult.url,
          message: this.#describeLoadIssue("character", characterResult.reason)
        });
      }

      if (builderDto) {
        this.builder = CharacterBuilder.fromDTO(builderDto, {
          rulesAdapter: this.rules
        });
      } else if (characterDto) {
        this.builder = CharacterBuilder.fromCharacterDTO(characterDto, {
          rulesAdapter: this.rules
        });
        this.loadIssues.push({
          type: "builder",
          reason: `${builderResult.reason || "builder-dto-unavailable"}; reconstructed-from-character-dto`,
          url: builderResult.url,
          message: "Builder DTO was unavailable; reconstructed a resumable draft from the final character DTO."
        });
      } else {
        this.loadIssues.push({
          type: "builder",
          reason: builderResult.reason,
          url: builderResult.url,
          message: this.#describeLoadIssue("builder", builderResult.reason)
        });
      }

      if (!rulesResult.ok && rulesResult.reason !== "rules-base-path-unavailable") {
        this.loadIssues.push({
          type: "rules",
          reason: rulesResult.reason,
          url: rulesResult.url,
          failures: rulesResult.data?.failures?.length ?? 0,
          message: "Rules data loaded with failures; some choices may be blocked or unnamed."
        });
      }

      this.loadStatus = this.loadIssues.length ? "loaded-with-issues" : "loaded";
      this.#renderCurrentSnapshot();
      this.config.callbacks.onLoad?.(this.getSnapshot());
      return this;
    } catch (error) {
      this.loadStatus = "failed";
      this.loadIssues.push({
        type: "loader",
        reason: error.code ?? "load-failed",
        message: error.message
      });
      this.#renderCurrentSnapshot();
      this.config.callbacks.onError?.(error);
      return this;
    }
  }

  #renderCurrentSnapshot(options = {}) {
    if (options.renderState) {
      return this.renderer.renderWithRenderState(this.getSnapshot(), options.renderState);
    }

    if (options.scrollFocus) {
      return this.renderer.renderWithScrollFocus(this.getSnapshot(), options.scrollFocus);
    }

    this.renderer.render(this.getSnapshot());
    return this;
  }

  #markBuilderEdited(options = {}) {
    if (this.saveStatus === "saved") {
      this.saveStatus = "idle";
    }

    if (String(this.exportStatus).startsWith("exported")) {
      this.exportStatus = "idle";
    }

    return this.#renderCurrentSnapshot(options);
  }

  #runRenderStateTransaction(options = {}) {
    const anchor = this.renderer.captureRenderState({
      fallbackFocusKey: options.focusFallbackKey
    });
    const mutation = typeof options.mutate === "function"
      ? options.mutate(anchor)
      : null;
    const focusKey = typeof options.focusKey === "function"
      ? String(options.focusKey(mutation, anchor) ?? "").trim()
      : String(options.focusKey ?? mutation?.focusKey ?? "").trim();
    const renderOptions = {
      renderState: {
        anchor,
        focusKey,
        focusFallbackKey: options.focusFallbackKey
      }
    };
    const restore = options.markEdited === false
      ? this.#renderCurrentSnapshot(renderOptions)
      : this.#markBuilderEdited(renderOptions);

    this.lastRenderTransaction = {
      phase: 15,
      type: options.type ?? mutation?.type ?? "render-state-mutation",
      anchor,
      mutation,
      restore
    };

    return this.lastRenderTransaction;
  }

  #runLevelRenderTransaction(options = {}) {
    return this.#runRenderStateTransaction({
      ...options,
      focusFallbackKey: options.focusFallbackKey ?? ADD_LEVEL_FOCUS_KEY,
      type: options.type ?? "level-mutation"
    });
  }

  #describeLoadIssue(type, reason) {
    const normalizedReason = String(reason ?? "").trim();
    const labels = {
      "missing-builder-dto": "Builder DTO was not found; progress cannot resume from saved builder decisions.",
      "missing-character-dto": "Final character DTO was not found; export will start from an empty character shell.",
      "save-endpoint-unavailable": "Persistence endpoint is unavailable.",
      "missing-url": "No load URL or path was configured.",
      "not-found": "Remote or local JSON was not found.",
      "load-failed": "JSON load failed."
    };

    return labels[normalizedReason] ?? `${type} load issue: ${normalizedReason || "unavailable"}.`;
  }

  #alignLoadedBuilderDto(dto, url) {
    const requestedId = normalizeId(this.config.characterId);
    const loadedId = normalizeId(dto?.characterId);
    if (!requestedId || !loadedId || requestedId === loadedId) {
      return dto;
    }

    this.loadIssues.push({
      type: "conflict",
      reason: "builder-character-id-conflict",
      url,
      message: `Builder DTO id "${loadedId}" did not match requested id "${requestedId}"; using the requested id for this session.`
    });
    return {
      ...dto,
      characterId: requestedId
    };
  }

  #alignLoadedCharacterDto(dto, url) {
    const requestedId = normalizeId(this.config.characterId);
    const loadedId = normalizeId(dto?.id);
    if (!requestedId || !loadedId || requestedId === loadedId) {
      return dto;
    }

    this.loadIssues.push({
      type: "conflict",
      reason: "character-id-conflict",
      url,
      message: `Final character DTO id "${loadedId}" did not match requested id "${requestedId}"; using the requested id for this session.`
    });
    return {
      ...dto,
      id: requestedId
    };
  }

  /**
   * Assigns or clears the character ancestry/race from the summary panel.
   * Existing race-level choices are cleared because they may not apply to the new ancestry.
   */
  async setAncestry(ancestryRef) {
    await this.ready;
    const previousRef = this.builder?.identityChoices?.raceRef ?? "";
    const value = String(ancestryRef ?? "").trim();
    if (previousRef === value) {
      return this.getSnapshot();
    }

    this.#runRenderStateTransaction({
      type: "set-ancestry",
      mutate: () => {
        this.builder?.clearGrantedSpellChoices?.(previousRef);
        this.builder?.setAncestry(value, []);
        return {
          type: "set-ancestry",
          previousRef,
          ref: value
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Assigns or clears the character background from the summary panel.
   * Existing background-level choices are cleared because they may not apply to the new background.
   */
  async setBackground(backgroundRef) {
    await this.ready;
    const previousRef = this.builder?.identityChoices?.backgroundRef ?? "";
    const value = String(backgroundRef ?? "").trim();
    if (previousRef === value) {
      return this.getSnapshot();
    }

    this.#runRenderStateTransaction({
      type: "set-background",
      mutate: () => {
        this.builder?.clearGrantedSpellChoices?.(previousRef);
        this.builder?.setBackground(value, []);
        return {
          type: "set-background",
          previousRef,
          ref: value
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Applies a rich ancestry/background picker selection and its finite choices.
   */
  async applyIdentityPickerSelection(type, ref, choicePayloads = []) {
    await this.ready;
    const normalizedType = String(type ?? "").trim();
    const scope = normalizedType === "ancestry"
      ? "race"
      : normalizedType === "background"
        ? "background"
        : "";
    const value = String(ref ?? "").trim();
    if (!scope) {
      return this.getSnapshot();
    }

    const records = this.#buildIdentityChoiceRecordsForRef(scope, value, choicePayloads);
    const identity = this.builder?.identityChoices ?? {};

    this.#runRenderStateTransaction({
      type: "apply-identity-picker-selection",
      mutate: () => {
        const previousRef = scope === "race"
          ? identity.raceRef ?? ""
          : identity.backgroundRef ?? "";
        this.builder?.clearGrantedSpellChoices?.(previousRef);
        if (scope === "race") {
          this.builder?.setAncestry(value, records);
        } else {
          this.builder?.setBackground(value, records);
        }

        return {
          type: "apply-identity-picker-selection",
          scope,
          previousRef,
          ref: value,
          choiceCount: records.length
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Stores a normalized race/background choice from finite catalog options.
   */
  async assignIdentityChoice(scope, choiceId, rawValues = []) {
    await this.ready;
    const normalizedScope = String(scope ?? "").trim();
    const normalizedChoiceId = String(choiceId ?? "").trim();
    const values = toArray(rawValues).map((value) => String(value ?? "").trim()).filter(Boolean);
    const definition = this.getIdentityChoiceDefinition(normalizedScope, normalizedChoiceId);

    if (!definition) {
      return this.getSnapshot();
    }

    this.#runRenderStateTransaction({
      type: "assign-identity-choice",
      mutate: () => {
        const validatedValues = validateIdentityChoiceValues(definition, values);
        if (!validatedValues.length) {
          this.builder?.removeIdentityChoice?.(normalizedScope, normalizedChoiceId);
        } else {
          this.builder?.assignIdentityChoice?.(normalizedScope, buildIdentityChoiceRecord(definition, validatedValues));
        }

        return {
          type: "assign-identity-choice",
          scope: normalizedScope,
          choiceId: normalizedChoiceId,
          valueCount: validatedValues.length
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Replaces the class taken at a total character level from the timeline UI.
   */
  async setClassAtLevel(characterLevel, classRef) {
    await this.ready;
    const level = Number(characterLevel ?? 0);

    this.#runLevelRenderTransaction({
      type: "set-class-at-level",
      mutate: () => {
        this.builder?.setClassAtLevel(level, classRef, { resetDecisions: true });
        return {
          type: "set-class-at-level",
          characterLevel: level,
          classRef: String(classRef ?? "").trim(),
          focusKey: `level-${level}-class`
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Appends one new character level using the selected class.
   */
  async appendClassLevel(classRef) {
    await this.ready;
    const normalizedClassRef = String(classRef ?? "").trim();
    if (!normalizedClassRef) {
      return this.getSnapshot();
    }

    this.#runLevelRenderTransaction({
      type: "append-class-level",
      mutate: () => {
        const beforeLevelCount = toArray(this.builder?.getLevelPlan?.()).length;

        this.builder?.appendClassLevel(normalizedClassRef);

        const nextPlan = toArray(this.builder?.getLevelPlan?.());
        const addedLevel = nextPlan.find((entry) => Number(entry.characterLevel) === beforeLevelCount + 1)
          ?? nextPlan.at(-1)
          ?? null;

        return {
          type: "append-class-level",
          classRef: normalizedClassRef,
          beforeLevelCount,
          afterLevelCount: nextPlan.length,
          addedLevel,
          focusKey: getLevelFocusKey(addedLevel?.characterLevel)
        };
      },
      focusKey: (mutation) => mutation?.focusKey
    });
    return this.getSnapshot();
  }

  /**
   * Assigns or clears a subclass decision from an inline timeline select.
   */
  async assignSubclassAtLevel(characterLevel, subclassRef) {
    await this.ready;
    const value = String(subclassRef ?? "").trim();
    this.#runRenderStateTransaction({
      type: "assign-subclass-at-level",
      mutate: () => {
        if (value) {
          this.builder?.assignSubclassDecision(characterLevel, value);
        } else {
          this.builder?.removeLevelDecisions(characterLevel, "subclass");
        }

        return {
          type: "assign-subclass-at-level",
          characterLevel: Number(characterLevel ?? 0),
          subclassRef: value
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Assigns or clears a feat decision from an inline timeline select.
   */
  async assignFeatAtLevel(characterLevel, featRef) {
    await this.ready;
    const value = String(featRef ?? "").trim();
    this.#runRenderStateTransaction({
      type: "assign-feat-at-level",
      mutate: () => {
        if (value) {
          const feat = this.rules.getRuleEntity(value);
          this.builder?.assignFeatChoice(characterLevel, {
            feat: feat?.name ?? cleanRefName(value),
            ref: feat?.ref ?? value
          });
        } else {
          this.builder?.removeLevelDecisions(characterLevel, "feat");
        }

        return {
          type: "assign-feat-at-level",
          characterLevel: Number(characterLevel ?? 0),
          featRef: value
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Assigns comma-separated skill/tool/language picks from compact inputs.
   */
  async assignLevelPicks(characterLevel, type, rawValue) {
    await this.ready;
    const normalizedType = String(type ?? "").trim();
    const picks = this.#validateLevelPickValues(characterLevel, normalizedType, splitInlineList(rawValue));
    const assigners = {
      skill: "assignSkillPicks",
      tool: "assignToolPicks",
      language: "assignLanguagePicks"
    };
    const method = assigners[normalizedType];
    if (method && this.builder?.[method]) {
      this.#runRenderStateTransaction({
        type: "assign-level-picks",
        mutate: () => {
          this.builder[method](characterLevel, picks);
          return {
            type: "assign-level-picks",
            characterLevel: Number(characterLevel ?? 0),
            decisionType: normalizedType,
            pickCount: picks.length
          };
        }
      });
    }

    return this.getSnapshot();
  }

  #findLevelPickRequirement(characterLevel, type) {
    const level = Number(characterLevel ?? 0);
    const normalizedType = String(type ?? "").trim();
    return this.builder?.getDecisionRequirements?.()
      ?.find((requirement) => (
        Number(requirement.characterLevel ?? 0) === level
        && requirement.type === normalizedType
      )) ?? null;
  }

  #validateLevelPickValues(characterLevel, type, values = []) {
    const normalizedType = String(type ?? "").trim();
    const picks = toArray(values).map((value) => String(value ?? "").trim()).filter(Boolean);
    if (!["skill", "tool", "language"].includes(normalizedType) || !picks.length) {
      return picks;
    }

    const requirement = this.#findLevelPickRequirement(characterLevel, normalizedType);
    const decisionId = requirement?.decisionId;
    if (!decisionId) {
      return picks;
    }

    const ledger = this.compiler?.createProficiencyLedger?.(this.builder, {
      choiceSelections: {
        [decisionId]: picks
      }
    });
    const choiceModel = toArray(ledger?.allChoiceModels ?? ledger?.choiceModels)
      .find((model) => model.id === decisionId) ?? null;
    if (!choiceModel) {
      return picks;
    }

    const normalizedPicks = [...new Set(picks
      .map((value) => normalizeProficiencyChoiceValue(normalizedType, value))
      .filter(Boolean))];
    const optionByValue = new Map(toArray(choiceModel.options).map((option) => [option.value, option]));
    const unsupported = normalizedPicks.filter((value) => !optionByValue.has(value));
    const blocked = normalizedPicks
      .map((value) => optionByValue.get(value))
      .filter((option) => option?.disabled);
    const violations = [
      ...unsupported.map((value) => `${value} is not a legal ${normalizedType} option for this level.`),
      ...blocked.map((option) => `${option.label}: ${option.reason}.`),
      ...toArray(choiceModel.violations),
      normalizedPicks.length > Number(choiceModel.count ?? 0)
        ? `Picked ${normalizedPicks.length}; limit is ${choiceModel.count}.`
        : ""
    ].filter(Boolean);

    if (violations.length) {
      throw new Error(`Cannot apply ${choiceModel.label || `${normalizedType} choice`}: ${violations.join(" ")}`);
    }

    return toArray(choiceModel.validSelectedValues);
  }

  /**
   * Assigns or clears an ASI decision from compact text such as "INT +2".
   */
  async assignAsiAtLevel(characterLevel, rawValue) {
    await this.ready;
    const text = String(rawValue ?? "").trim();
    this.#runRenderStateTransaction({
      type: "assign-asi-at-level",
      mutate: () => {
        if (!text) {
          this.builder?.removeLevelDecisions(characterLevel, "asi");
          return {
            type: "assign-asi-at-level",
            characterLevel: Number(characterLevel ?? 0),
            increaseCount: 0
          };
        }

        const increases = parseAsiInput(text);
        if (!increases.length) {
          throw new Error(`Unable to parse ASI input: ${text}`);
        }

        this.builder?.assignAsiChoice(characterLevel, increases);
        return {
          type: "assign-asi-at-level",
          characterLevel: Number(characterLevel ?? 0),
          increaseCount: increases.length
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Stores the level 1 manual ability scores from the guided ability overlay.
   */
  async assignManualAbilityScores(scores = {}) {
    await this.ready;
    const normalizedScores = {};

    for (const ability of ABILITY_ORDER) {
      const score = Number(scores?.[ability]);
      if (Number.isFinite(score)) {
        normalizedScores[ability] = score;
      }
    }

    this.#runRenderStateTransaction({
      type: "assign-manual-ability-scores",
      mutate: () => {
        this.builder?.assignManualAbilityScores(normalizedScores, { characterLevel: 1 });
        return {
          type: "assign-manual-ability-scores",
          scoreCount: Object.keys(normalizedScores).length
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Stores selected granted spells for a race/background/subclass/feat source.
   */
  async assignGrantedSpellChoices(sourceRef, spells = []) {
    await this.ready;
    const normalizedSourceRef = String(sourceRef ?? "").trim();
    const identitySpellKeys = new Set(this.getIdentitySpellsForSource(normalizedSourceRef).map(spellKey));
    const normalizedSpells = toArray(spells)
      .map((spell) => {
        const name = String(spell?.name ?? spell?.spell ?? "").trim();
        const source = String(spell?.source ?? "").trim();
        const level = spell?.level == null || spell.level === "" ? null : Number(spell.level);
        return name
          ? {
              name,
              source,
              level: Number.isFinite(level) ? level : null
            }
          : null;
      })
      .filter((spell) => spell && !identitySpellKeys.has(spellKey(spell)))
      .filter(Boolean);

    this.#runRenderStateTransaction({
      type: "assign-granted-spell-choices",
      mutate: () => {
        if (normalizedSourceRef && normalizedSpells.length) {
          this.builder?.storeGrantedSpellChoices(normalizedSourceRef, [{
            choiceId: `fc-${sourceKeyFromRef(normalizedSourceRef)}-granted-spells`,
            type: "granted-spell",
            value: {
              spells: normalizedSpells
            },
            spells: normalizedSpells
          }]);
        } else if (normalizedSourceRef) {
          this.builder?.clearGrantedSpellChoices?.(normalizedSourceRef);
        }

        return {
          type: "assign-granted-spell-choices",
          sourceRef: normalizedSourceRef,
          spellCount: normalizedSpells.length
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Opens a focused editor overlay for a high-friction builder choice.
   */
  async openGuidedOverlay(overlay = {}) {
    await this.ready;
    const overlayType = String(overlay.type ?? overlay.overlayType ?? "").trim();
    this.#runRenderStateTransaction({
      type: "open-guided-overlay",
      markEdited: false,
      focusKey: ["ancestry", "background", "subclass"].includes(overlayType)
        ? "picker-field-query"
        : overlayType === "feat" ? "identity-feat-field-query" : "",
      mutate: () => {
        this.guidedOverlay = {
          type: overlayType,
          characterLevel: overlay.characterLevel == null ? null : Number(overlay.characterLevel),
          sourceRef: String(overlay.sourceRef ?? overlay.grantSourceRef ?? "").trim(),
          focusedRef: String(overlay.focusedRef ?? "").trim(),
          query: String(overlay.query ?? "").trim(),
          source: String(overlay.source ?? "").trim(),
          choiceFilter: String(overlay.choiceFilter ?? "any").trim() || "any",
          unlockFilter: String(overlay.unlockFilter ?? "available").trim() || "available"
        };

        return {
          type: "open-guided-overlay",
          overlayType: this.guidedOverlay.type,
          characterLevel: this.guidedOverlay.characterLevel,
          sourceRef: this.guidedOverlay.sourceRef,
          focusedRef: this.guidedOverlay.focusedRef,
          query: this.guidedOverlay.query
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Updates filters/focus for the active rich picker overlay.
   */
  async updateGuidedOverlay(patch = {}, options = {}) {
    await this.ready;
    if (!this.guidedOverlay) {
      return this.getSnapshot();
    }

    this.#runRenderStateTransaction({
      type: "guided-overlay-update",
      markEdited: false,
      focusKey: options.focusKey,
      mutate: () => {
        this.guidedOverlay = {
          ...this.guidedOverlay,
          focusedRef: patch.focusedRef !== undefined ? String(patch.focusedRef ?? "").trim() : this.guidedOverlay.focusedRef,
          query: patch.query !== undefined ? String(patch.query ?? "").trim() : this.guidedOverlay.query,
          source: patch.source !== undefined ? String(patch.source ?? "").trim() : this.guidedOverlay.source,
          choiceFilter: patch.choiceFilter !== undefined ? String(patch.choiceFilter ?? "any").trim() || "any" : this.guidedOverlay.choiceFilter,
          unlockFilter: patch.unlockFilter !== undefined ? String(patch.unlockFilter ?? "available").trim() || "available" : this.guidedOverlay.unlockFilter
        };

        return {
          type: "guided-overlay-update",
          overlayType: this.guidedOverlay.type,
          focusedRef: this.guidedOverlay.focusedRef,
          query: this.guidedOverlay.query,
          source: this.guidedOverlay.source,
          choiceFilter: this.guidedOverlay.choiceFilter,
          unlockFilter: this.guidedOverlay.unlockFilter
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Opens the nested feat picker for an ancestry/background feat choice.
   * Current identity form choices are stored as overlay draft state so returning
   * from the nested picker does not discard unsaved selections.
   */
  async openIdentityFeatPicker(payload = {}) {
    await this.ready;
    if (!["ancestry", "background"].includes(this.guidedOverlay?.type)) {
      return this.getSnapshot();
    }

    const choiceId = String(payload.choiceId ?? "").trim();
    if (!choiceId) {
      return this.getSnapshot();
    }

    this.#runRenderStateTransaction({
      type: "open-identity-feat-picker",
      markEdited: false,
      focusKey: "identity-feat-field-query",
      mutate: (anchor) => {
        const ref = String(payload.value ?? this.guidedOverlay.focusedRef ?? "").trim();
        this.guidedOverlay = {
          ...this.guidedOverlay,
          focusedRef: ref || this.guidedOverlay.focusedRef,
          identityDraft: {
            ref: ref || this.guidedOverlay.focusedRef,
            choices: this.#normalizeIdentityDraftPayloads(payload.choices)
          },
          nestedFeatPicker: {
            choiceId,
            query: "",
            source: "",
            focusedRef: String(payload.focusedRef ?? payload.selectedFeatRef ?? "").trim(),
            returnRenderState: anchor
          }
        };

        return {
          type: "open-identity-feat-picker",
          choiceId,
          ref: ref || this.guidedOverlay.focusedRef
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Updates search, source filter, and focus for the active nested feat picker.
   */
  async updateIdentityFeatPicker(patch = {}, options = {}) {
    await this.ready;
    if (!this.guidedOverlay?.nestedFeatPicker) {
      return this.getSnapshot();
    }

    this.#runRenderStateTransaction({
      type: "identity-feat-picker-update",
      markEdited: false,
      focusKey: options.focusKey,
      mutate: () => {
        this.guidedOverlay = {
          ...this.guidedOverlay,
          nestedFeatPicker: {
            ...this.guidedOverlay.nestedFeatPicker,
            focusedRef: patch.focusedRef !== undefined ? String(patch.focusedRef ?? "").trim() : this.guidedOverlay.nestedFeatPicker.focusedRef,
            query: patch.query !== undefined ? String(patch.query ?? "").trim() : this.guidedOverlay.nestedFeatPicker.query,
            source: patch.source !== undefined ? String(patch.source ?? "").trim() : this.guidedOverlay.nestedFeatPicker.source
          }
        };

        return {
          type: "identity-feat-picker-update",
          choiceId: this.guidedOverlay.nestedFeatPicker.choiceId,
          focusedRef: this.guidedOverlay.nestedFeatPicker.focusedRef,
          query: this.guidedOverlay.nestedFeatPicker.query,
          source: this.guidedOverlay.nestedFeatPicker.source
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Returns from the nested feat picker without changing the identity draft.
   */
  async closeIdentityFeatPicker() {
    await this.ready;
    if (!this.guidedOverlay?.nestedFeatPicker) {
      return this.getSnapshot();
    }

    const anchor = this.renderer.captureRenderState();
    const nested = this.guidedOverlay.nestedFeatPicker;
    const returnRenderState = nested.returnRenderState ? deepClone(nested.returnRenderState) : null;
    const focusKey = `identity-feat-picker-${nested.choiceId}`;
    this.guidedOverlay = {
      ...this.guidedOverlay,
      nestedFeatPicker: null
    };
    const restore = this.#renderCurrentSnapshot({
      renderState: {
        anchor: returnRenderState ?? anchor,
        focusKey
      }
    });
    this.lastRenderTransaction = {
      phase: 15,
      type: "close-identity-feat-picker",
      anchor,
      mutation: {
        type: "close-identity-feat-picker",
        choiceId: nested.choiceId
      },
      restore
    };
    return this.getSnapshot();
  }

  /**
   * Stores a selected feat in the ancestry/background draft and returns to the
   * parent picker. The parent Apply still owns the actual builder mutation.
   */
  async applyIdentityFeatPicker(payload = {}) {
    await this.ready;
    if (!this.guidedOverlay?.nestedFeatPicker) {
      return this.getSnapshot();
    }

    const anchor = this.renderer.captureRenderState();
    const nested = this.guidedOverlay.nestedFeatPicker;
    const choiceId = String(payload.choiceId ?? nested.choiceId ?? "").trim();
    const featRef = String(payload.featRef ?? nested.focusedRef ?? "").trim();
    const returnRenderState = nested.returnRenderState ? deepClone(nested.returnRenderState) : null;
    const focusKey = `identity-feat-picker-${choiceId}`;
    const draft = this.guidedOverlay.identityDraft ?? {
      ref: this.guidedOverlay.focusedRef,
      choices: []
    };
    const choices = this.#mergeIdentityDraftChoicePayload(draft.choices, choiceId, featRef ? [featRef] : []);

    this.guidedOverlay = {
      ...this.guidedOverlay,
      identityDraft: {
        ref: draft.ref || this.guidedOverlay.focusedRef,
        choices
      },
      nestedFeatPicker: null
    };
    const restore = this.#renderCurrentSnapshot({
      renderState: {
        anchor: returnRenderState ?? anchor,
        focusKey
      }
    });
    this.lastRenderTransaction = {
      phase: 15,
      type: "apply-identity-feat-picker",
      anchor,
      mutation: {
        type: "apply-identity-feat-picker",
        choiceId,
        featRef
      },
      restore
    };
    return this.getSnapshot();
  }

  /**
   * Closes any active guided editor overlay without changing builder state.
   */
  closeGuidedOverlay() {
    this.#runRenderStateTransaction({
      type: "close-guided-overlay",
      markEdited: false,
      mutate: () => {
        this.guidedOverlay = null;
        return {
          type: "close-guided-overlay"
        };
      }
    });
    return this.getSnapshot();
  }

  /**
   * Applies a guided overlay payload through the same runtime mutation layer used
   * by direct controls.
   */
  async applyGuidedOverlay(type, payload = {}) {
    await this.ready;
    const normalizedType = String(type ?? "").trim();
    const characterLevel = Number(payload.characterLevel ?? 0);

    this.#runRenderStateTransaction({
      type: "apply-guided-overlay",
      mutate: () => {
        const mutation = {
          type: "apply-guided-overlay",
          overlayType: normalizedType,
          characterLevel
        };

        if (normalizedType === "ancestry" || normalizedType === "background") {
          const value = String(payload.value ?? "").trim();
          const scope = normalizedType === "ancestry" ? "race" : "background";
          const previousRef = normalizedType === "ancestry"
            ? this.builder?.identityChoices?.raceRef ?? ""
            : this.builder?.identityChoices?.backgroundRef ?? "";
          const records = this.#buildIdentityChoiceRecordsForRef(scope, value, payload.choices);

          this.builder?.clearGrantedSpellChoices?.(previousRef);
          if (normalizedType === "ancestry") {
            this.builder?.setAncestry(value, records);
          } else {
            this.builder?.setBackground(value, records);
          }

          Object.assign(mutation, {
            scope,
            previousRef,
            ref: value,
            choiceCount: records.length
          });
        } else if (normalizedType === "subclass") {
          const value = String(payload.value ?? "").trim();
          if (value) {
            this.builder?.assignSubclassDecision(characterLevel, value);
          } else {
            this.builder?.removeLevelDecisions(characterLevel, "subclass");
          }

          Object.assign(mutation, { subclassRef: value });
        } else if (normalizedType === "feat") {
          const value = String(payload.value ?? "").trim();
          if (value) {
            const feat = this.rules.getRuleEntity(value);
            this.builder?.assignFeatChoice(characterLevel, {
              feat: feat?.name ?? cleanRefName(value),
              ref: feat?.ref ?? value
            });
          } else {
            this.builder?.removeLevelDecisions(characterLevel, "feat");
          }

          Object.assign(mutation, { featRef: value });
        } else if (["skill", "tool", "language"].includes(normalizedType)) {
          const assigners = {
            skill: "assignSkillPicks",
            tool: "assignToolPicks",
            language: "assignLanguagePicks"
          };
          const method = assigners[normalizedType];
          const values = this.#validateLevelPickValues(characterLevel, normalizedType, payload.values);
          this.builder?.[method]?.(characterLevel, values);
          Object.assign(mutation, {
            decisionType: normalizedType,
            pickCount: values.length
          });
        } else if (normalizedType === "asi") {
          const increases = toArray(payload.increases);
          if (increases.length) {
            this.builder?.assignAsiChoice(characterLevel, increases);
          } else {
            this.builder?.removeLevelDecisions(characterLevel, "asi");
          }

          Object.assign(mutation, { increaseCount: increases.length });
        } else if (normalizedType === "abilities") {
          const normalizedScores = {};
          for (const ability of ABILITY_ORDER) {
            const score = Number(payload.scores?.[ability]);
            if (Number.isFinite(score)) {
              normalizedScores[ability] = score;
            }
          }

          this.builder?.assignManualAbilityScores(normalizedScores, { characterLevel: 1 });
          Object.assign(mutation, { scoreCount: Object.keys(normalizedScores).length });
        } else if (normalizedType === "granted-spells") {
          const normalizedSourceRef = String(payload.sourceRef ?? "").trim();
          const identitySpellKeys = new Set(this.getIdentitySpellsForSource(normalizedSourceRef).map(spellKey));
          const normalizedSpells = toArray(payload.spells)
            .map((spell) => {
              const name = String(spell?.name ?? spell?.spell ?? "").trim();
              const source = String(spell?.source ?? "").trim();
              const level = spell?.level == null || spell.level === "" ? null : Number(spell.level);
              return name
                ? {
                    name,
                    source,
                    level: Number.isFinite(level) ? level : null
                  }
                : null;
            })
            .filter((spell) => spell && !identitySpellKeys.has(spellKey(spell)))
            .filter(Boolean);

          if (normalizedSourceRef && normalizedSpells.length) {
            this.builder?.storeGrantedSpellChoices(normalizedSourceRef, [{
              choiceId: `fc-${sourceKeyFromRef(normalizedSourceRef)}-granted-spells`,
              type: "granted-spell",
              value: {
                spells: normalizedSpells
              },
              spells: normalizedSpells
            }]);
          } else if (normalizedSourceRef) {
            this.builder?.clearGrantedSpellChoices?.(normalizedSourceRef);
          }

          Object.assign(mutation, {
            sourceRef: normalizedSourceRef,
            spellCount: normalizedSpells.length
          });
        }

        this.guidedOverlay = null;
        return mutation;
      }
    });
    return this.getSnapshot();
  }

  /**
   * Closes the builder UI and releases DOM listeners.
   * Runtime state remains on the instance so callers can still inspect/export it.
   */
  close() {
    this.events.unbind();
    this.renderer.unmount();
    this.isOpen = false;
    this.guidedOverlay = null;
    this.config.callbacks.onClose?.(this.getSnapshot());
    return this;
  }

  /**
   * Saves/upserts both DTOs through the loader. If endpoints are unavailable, the
   * returned payload remains exportable and saveStatus records the failure mode.
   */
  async save(options = {}) {
    await this.ready;
    if (this.config.persistenceMode === "export-only") {
      return this.export({
        ...options,
        download: options.download ?? true,
        touchModified: options.touchModified ?? true
      });
    }

    this.saveStatus = "saving";
    this.lastSaveResult = null;
    this.#renderCurrentSnapshot();

    const payload = this.export({
      ...options,
      download: false,
      notify: false,
      updateStatus: false,
      touchModified: options.touchModified ?? true
    });
    if (payload.blocked) {
      this.saveStatus = "blocked";
      const result = {
        ok: false,
        reason: payload.reason,
        payload,
        builderResult: null,
        characterResult: null,
        issues: payload.issues
      };
      this.lastSaveResult = this.#summarizeSaveResult(result);
      this.#renderCurrentSnapshot();
      this.config.callbacks.onSave?.(result);
      return result;
    }
    const payloadConflict = this.#getPersistencePayloadConflict(payload);
    if (payloadConflict) {
      this.saveStatus = "conflict";
      const result = {
        ok: false,
        reason: "id-conflict",
        payload,
        builderResult: null,
        characterResult: null,
        issues: [payloadConflict]
      };
      this.lastSaveResult = this.#summarizeSaveResult(result);
      this.#renderCurrentSnapshot();
      this.config.callbacks.onSave?.(result);
      return result;
    }

    const [builderResult, characterResult] = await Promise.all([
      this.loader.saveBuilderDto(payload.builderDto),
      payload.characterDto
        ? this.loader.saveCharacterDto(payload.characterDto)
        : Promise.resolve({
            ok: false,
            reason: "character-dto-unavailable",
            dto: null
          })
    ]);

    const ok = Boolean(builderResult.ok && characterResult.ok);
    if (ok) {
      this.saveStatus = "saved";
      this.characterDto = payload.characterDto ? deepClone(payload.characterDto) : this.characterDto;
    } else if (builderResult.ok || characterResult.ok) {
      this.saveStatus = "partial";
    } else if (isUnavailableSaveReason(builderResult.reason) && isUnavailableSaveReason(characterResult.reason)) {
      this.saveStatus = "unavailable";
    } else {
      this.saveStatus = "failed";
    }

    const result = {
      ok,
      reason: ok ? "saved" : this.saveStatus,
      payload,
      builderResult,
      characterResult,
      issues: []
    };

    this.lastSaveResult = this.#summarizeSaveResult(result);
    this.#renderCurrentSnapshot();
    this.config.callbacks.onSave?.(result);
    return result;
  }

  /**
   * Public export action signature. Exports the current builder DTO plus the
   * compiler-produced final v1 character DTO, preserving loaded final-sheet state
   * for systems the builder does not own yet.
   */
  export(options = {}) {
    const shouldUpdateStatus = options.updateStatus !== false;
    const shouldNotify = options.notify !== false;
    const builderDto = this.builder?.toDTO() ?? CharacterBuilder.createEmpty({
      characterId: this.config.characterId ?? undefined
    }).toDTO();
    const blockingIssues = this.#getBlockingChoiceIssues();
    if (blockingIssues.length) {
      const payload = {
        builderDto,
        characterDto: null,
        compiled: false,
        blocked: true,
        reason: "unresolved-required-identity-choices",
        issues: blockingIssues,
        files: [],
        downloadResult: null,
        generatedAt: new Date().toISOString(),
        options: { ...options }
      };

      if (shouldUpdateStatus) {
        this.exportStatus = "blocked";
        this.lastExportResult = this.#summarizeExportPayload(payload);
        this.#renderCurrentSnapshot();
      }

      if (shouldNotify) {
        this.config.callbacks.onExport?.(payload);
      }

      return payload;
    }
    let characterDto = null;
    let compiled = false;
    let reason = "compiled";
    let abilityImpactPreview = null;

    try {
      characterDto = this.compiler.toCharacterDto(this.builder ?? builderDto, {
        ...options,
        baseCharacterDto: this.characterDto,
        touchModified: options.touchModified ?? false
      });
      compiled = true;
    } catch (error) {
      characterDto = this.#exportCharacterDto();
      reason = error?.message || "compiler-failed";
      this.config.callbacks.onError?.(error);
    }

    if (compiled) {
      abilityImpactPreview = this.compiler.createAbilityImpactPreview(this.builder ?? builderDto, {
        ...options,
        baseCharacterDto: this.characterDto,
        compiledCharacterDto: characterDto
      });

      if (!abilityImpactPreview.acceptedForExport) {
        const payload = {
          builderDto,
          characterDto: null,
          compiled: false,
          blocked: true,
          reason: "ability-preview-mismatch",
          issues: [{
            type: "ability-preview",
            reason: "compiled-scores-did-not-match-preview",
            message: abilityImpactPreview.explanation
          }],
          abilityImpactPreview,
          files: [],
          downloadResult: null,
          generatedAt: new Date().toISOString(),
          options: { ...options }
        };

        if (shouldUpdateStatus) {
          this.exportStatus = "blocked";
          this.lastExportResult = this.#summarizeExportPayload(payload);
          this.#renderCurrentSnapshot();
        }

        if (shouldNotify) {
          this.config.callbacks.onExport?.(payload);
        }

        return payload;
      }
    }

    const payload = {
      builderDto,
      characterDto,
      compiled,
      reason,
      abilityImpactPreview,
      files: this.#createExportFiles(builderDto, characterDto),
      downloadResult: null,
      generatedAt: new Date().toISOString(),
      options: { ...options }
    };

    if (options.download) {
      payload.downloadResult = this.#downloadExportFiles(payload.files);
    }

    if (shouldUpdateStatus) {
      this.exportStatus = compiled ? "exported-compiled-dto" : "exported-builder-dto";
      this.lastExportResult = this.#summarizeExportPayload(payload);
      this.#renderCurrentSnapshot();
    }

    if (shouldNotify) {
      this.config.callbacks.onExport?.(payload);
    }

    return payload;
  }

  #getBlockingChoiceIssues() {
    return toArray(this.builder?.getIdentityChoiceRequirements?.())
      .filter((entry) => entry.required && !entry.resolved)
      .map((entry) => ({
        type: entry.unsupported ? "unsupported-choice" : "unresolved-choice",
        reason: entry.unsupported ? "unsupported-choice-detected" : entry.blockedReason ? "invalid-choice-value" : "required-choice-unresolved",
        choiceId: entry.definition?.choiceId ?? "",
        choiceType: entry.definition?.type ?? "",
        label: entry.definition?.label ?? "Identity choice",
        sourceRef: entry.sourceRef ?? "",
        sourceName: entry.sourceName ?? "",
        message: entry.blockedReason
          || `${entry.sourceName || entry.sourceRef || "Selected identity"} requires ${entry.definition?.label || entry.definition?.choiceId || "a choice"}.`
      }));
  }

  #getPersistencePayloadConflict(payload) {
    const builderId = normalizeId(payload?.builderDto?.characterId);
    const characterId = normalizeId(payload?.characterDto?.id);

    if (!builderId || !characterId) {
      return {
        type: "conflict",
        reason: "missing-persistence-id",
        message: "Save blocked because the builder DTO and final character DTO both need ids."
      };
    }

    if (builderId !== characterId) {
      return {
        type: "conflict",
        reason: "character-id-conflict",
        message: `Save blocked because builder id "${builderId}" and final character id "${characterId}" differ.`
      };
    }

    return null;
  }

  #createExportFiles(builderDto, characterDto) {
    const characterId = normalizeId(builderDto?.characterId || characterDto?.id || this.config.characterId || "char-new-character");
    const characterName = normalizeId(characterDto?.identity?.name);
    const baseName = sanitizeFileName(characterName && characterName !== "New Character" ? characterName : characterId);
    const builderText = stringifyJson(builderDto);
    const characterText = stringifyJson(characterDto);

    return [
      {
        kind: "builder",
        label: "Builder decisions DTO",
        fileName: `${baseName}.builder-decisions.json`,
        mimeType: "application/json",
        text: builderText,
        byteLength: builderText.length
      },
      {
        kind: "character",
        label: "Final character DTO",
        fileName: `${baseName}.character.json`,
        mimeType: "application/json",
        text: characterText,
        byteLength: characterText.length
      }
    ];
  }

  #downloadExportFiles(files = []) {
    if (!files.length) {
      return {
        ok: false,
        reason: "no-export-files",
        files: []
      };
    }

    if (!canUseBrowserDownload()) {
      return {
        ok: false,
        reason: "download-unavailable",
        files: files.map((file) => file.fileName)
      };
    }

    for (const file of files) {
      triggerJsonDownload(file);
    }

    return {
      ok: true,
      reason: "downloaded",
      files: files.map((file) => file.fileName)
    };
  }

  #summarizeResourceResult(label, result) {
    if (!result) {
      return {
        label,
        ok: false,
        reason: "not-attempted",
        url: "",
        status: 0
      };
    }

    return {
      label,
      ok: Boolean(result.ok),
      reason: result.reason || (result.ok ? "saved" : "unavailable"),
      url: result.url || "",
      status: result.status || 0,
      error: result.error ? { ...result.error } : null
    };
  }

  #summarizeSaveResult(result) {
    const resources = [
      this.#summarizeResourceResult("Builder DTO", result.builderResult),
      this.#summarizeResourceResult("Final character DTO", result.characterResult)
    ];
    const messages = {
      saved: "Saved builder decisions and final character DTO.",
      partial: "Partial save: one DTO was saved and one failed.",
      unavailable: "Save unavailable: no writable endpoint or path accepted either DTO.",
      failed: "Save failed for both DTOs.",
      conflict: "Save blocked by a persistence id conflict.",
      blocked: "Save blocked until required race/background choices are resolved."
    };

    return {
      ok: Boolean(result.ok),
      status: this.saveStatus,
      reason: result.reason || this.saveStatus,
      message: messages[this.saveStatus] ?? messages.failed,
      savedAt: new Date().toISOString(),
      resources,
      issues: toArray(result.issues).map((issue) => ({ ...issue }))
    };
  }

  #summarizeExportPayload(payload) {
    const downloadableFiles = toArray(payload.files).map((file) => ({
      kind: file.kind,
      label: file.label,
      fileName: file.fileName,
      byteLength: file.byteLength
    }));
    const downloadResult = payload.downloadResult
      ? {
          ok: Boolean(payload.downloadResult.ok),
          reason: payload.downloadResult.reason,
          files: toArray(payload.downloadResult.files)
        }
      : null;

    return {
      ok: !payload.blocked,
      status: payload.blocked ? "blocked" : payload.compiled ? "exported-compiled-dto" : "exported-builder-dto",
      reason: payload.reason,
      message: payload.blocked
        ? payload.reason === "ability-preview-mismatch"
          ? "Export blocked because visible ability math does not match compiled scores."
          : "Export blocked until required race/background choices are resolved."
        : payload.compiled
        ? "Exported builder decisions and compiled final character DTO."
        : "Compiler fallback exported builder decisions and the current final character DTO.",
      generatedAt: payload.generatedAt,
      compiled: Boolean(payload.compiled),
      issues: toArray(payload.issues).map((issue) => ({ ...issue })),
      abilityImpactAccepted: payload.abilityImpactPreview
        ? Boolean(payload.abilityImpactPreview.acceptedForExport)
        : null,
      files: downloadableFiles,
      downloadResult
    };
  }

  #exportCharacterDto() {
    if (this.characterDto) {
      return deepClone(this.characterDto);
    }

    const model = CharacterModel.createEmpty();
    const characterId = this.builder?.characterId ?? this.config.characterId;
    if (characterId) {
      model.setValue(["id"], characterId);
    }

    return model.toExportObject({ touchModified: false });
  }

  #getAncestryLineage(ref) {
    const lineage = [];
    const seen = new Set();
    let current = String(ref ?? "").trim() ? this.rules.getRuleEntity(ref) : null;

    while (current?.ref && !seen.has(current.ref)) {
      seen.add(current.ref);
      lineage.unshift(current);
      current = current.parentRef ? this.rules.getRuleEntity(current.parentRef) : null;
    }

    return lineage;
  }

  #getAncestryAbilitySummary(ref, raceChoices = []) {
    const map = createEmptyAbilityDeltaMap();
    for (const entity of this.#getAncestryLineage(ref)) {
      for (const rule of toArray(entity.ability ?? entity.grants?.ability)) {
        addAbilityRule(map, rule);
      }
    }

    for (const choice of toArray(raceChoices)) {
      const value = toObject(choice.value);
      addAbilityIncreases(map, value.increases);
    }

    return formatAbilityDeltaMap(map);
  }

  #getIdentityEntitiesForRef(scope, ref) {
    const normalizedRef = String(ref ?? "").trim();
    if (!normalizedRef) {
      return [];
    }

    if (scope === "race") {
      return this.#getAncestryLineage(normalizedRef);
    }

    const entity = this.rules.getRuleEntity(normalizedRef);
    return entity ? [entity] : [];
  }

  #getIdentityChoiceDefinitionsForRef(scope, ref) {
    const byId = new Map();
    for (const entity of this.#getIdentityEntitiesForRef(scope, ref)) {
      for (const definition of toArray(entity.choiceDefinitions)) {
        const id = definition.choiceId || definition.id || `${definition.type}-${byId.size}`;
        if (!byId.has(id)) {
          byId.set(id, definition);
        }
      }
    }

    return [...byId.values()];
  }

  #normalizeIdentityDraftPayloads(choicePayloads = []) {
    return toArray(choicePayloads)
      .map((payload) => {
        const choiceId = String(payload?.choiceId ?? "").trim();
        const values = toArray(payload?.values)
          .map((value) => String(value ?? "").trim())
          .filter(Boolean);
        return choiceId && values.length
          ? { choiceId, values }
          : null;
      })
      .filter(Boolean);
  }

  #mergeIdentityDraftChoicePayload(choicePayloads = [], choiceId = "", values = []) {
    const normalizedChoiceId = String(choiceId ?? "").trim();
    const normalizedValues = toArray(values)
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    const merged = this.#normalizeIdentityDraftPayloads(choicePayloads)
      .filter((payload) => payload.choiceId !== normalizedChoiceId);

    if (normalizedChoiceId && normalizedValues.length) {
      merged.push({
        choiceId: normalizedChoiceId,
        values: normalizedValues
      });
    }

    return merged;
  }

  #buildIdentityChoiceRecordsForDisplay(scope, ref, choicePayloads = []) {
    const definitions = this.#getIdentityChoiceDefinitionsForRef(scope, ref);
    const byId = new Map(definitions.map((definition) => [
      definition.choiceId || definition.id,
      definition
    ]));

    return this.#normalizeIdentityDraftPayloads(choicePayloads)
      .map((payload) => {
        const definition = byId.get(payload.choiceId);
        return definition ? buildIdentityChoiceRecord(definition, payload.values) : null;
      })
      .filter(Boolean);
  }

  #buildIdentityChoiceRecordsForRef(scope, ref, choicePayloads = []) {
    const definitions = this.#getIdentityChoiceDefinitionsForRef(scope, ref);
    const byId = new Map(definitions.map((definition) => [
      definition.choiceId || definition.id,
      definition
    ]));

    return toArray(choicePayloads)
      .map((payload) => {
        const choiceId = String(payload?.choiceId ?? "").trim();
        const values = toArray(payload?.values).map((value) => String(value ?? "").trim()).filter(Boolean);
        const definition = byId.get(choiceId);
        const validatedValues = definition
          ? validateIdentityChoiceValues(definition, values)
          : [];
        return definition && validatedValues.length
          ? buildIdentityChoiceRecord(definition, validatedValues)
          : null;
      })
      .filter(Boolean);
  }

  #getIdentityPickerMechanics(type, ref) {
    const scope = type === "ancestry" ? "race" : "background";
    const entities = this.#getIdentityEntitiesForRef(scope, ref);
    if (!entities.length) {
      return ["No entity selected."];
    }

    if (type === "ancestry") {
      const abilityRules = entities.flatMap((entity) => toArray(entity.ability ?? entity.grants?.ability));
      const fixedAbility = formatAbilityDeltaMap(abilityRules.reduce(addAbilityRule, createEmptyAbilityDeltaMap()), "No fixed ability changes");
      const abilityChoices = abilityRules.map(formatAbilityChoice).filter(Boolean);

      return [
        `Ability: ${fixedAbility}`,
        ...abilityChoices.map((choice) => `Ability: ${choice}`),
        ...formatFixedAndChoiceGrants(mergeGrantCollections(entities)),
        formatChoiceRequirementSummary(this.#getIdentityChoiceDefinitionsForRef(scope, ref))
      ].filter(Boolean);
    }

    return [
      ...formatFixedAndChoiceGrants(entities[0]?.grants),
      formatChoiceRequirementSummary(this.#getIdentityChoiceDefinitionsForRef(scope, ref))
    ].filter(Boolean);
  }

  #getIdentityPickerSearchText(type, entity = {}) {
    const scope = type === "ancestry" ? "race" : "background";
    if (type === "ancestry") {
      return getAncestryNameSearchText(entity);
    }

    return [
      entity.name,
      entity.shortName,
      entity.source,
      entity.ref,
      ...this.#getIdentityPickerMechanics(type, entity.ref),
      cleanRulesText(entity.entries),
      cleanRulesText(entity.raw?.entries),
      cleanRulesText(entity.summary),
      ...this.#getIdentityChoiceDefinitionsForRef(scope, entity.ref).map((definition) => [
        definition.label,
        definition.prompt,
        definition.type,
        ...toArray(definition.options).map((option) => option?.label ?? option?.name ?? option?.value ?? option?.ref)
      ].join(" "))
    ].join(" ").toLowerCase();
  }

  #getIdentityPickerModel(type, overlay = {}) {
    const config = type === "ancestry"
      ? {
          scope: "race",
          title: "Choose Ancestry",
          label: "Ancestry",
          searchPlaceholder: "human",
          selectedRef: this.builder?.identityChoices?.raceRef ?? "",
          savedChoices: this.builder?.identityChoices?.raceChoices,
          getOptions: () => this.rules.getAvailableAncestries?.() ?? []
        }
      : {
          scope: "background",
          title: "Choose Background",
          label: "Background",
          searchPlaceholder: "sage",
          selectedRef: this.builder?.identityChoices?.backgroundRef ?? "",
          savedChoices: this.builder?.identityChoices?.backgroundChoices,
          getOptions: () => this.rules.getAvailableBackgrounds?.() ?? []
        };
    const allResults = toArray(config.getOptions());
    const filters = {
      query: String(overlay.query ?? "").trim(),
      source: String(overlay.source ?? "").trim(),
      choiceFilter: String(overlay.choiceFilter ?? "any").trim() || "any"
    };
    const query = normalizeComparable(filters.query);
    const source = normalizeComparable(filters.source);
    const filtered = allResults.filter((entity) => {
      const definitions = this.#getIdentityChoiceDefinitionsForRef(config.scope, entity.ref);
      const hasChoices = definitions.length > 0;
      return (!query || this.#getIdentityPickerSearchText(type, entity).includes(query))
        && (!source || normalizeComparable(entity.source) === source)
        && (filters.choiceFilter === "any"
          || (filters.choiceFilter === "with" && hasChoices)
          || (filters.choiceFilter === "without" && !hasChoices));
    });
    const focusedRef = String(overlay.focusedRef ?? "").trim();
    const selectedRef = config.selectedRef;
    const finalFocusedRef = (
      focusedRef && allResults.some((entity) => entity.ref === focusedRef) ? focusedRef : ""
    ) || (
      selectedRef && filtered.some((entity) => entity.ref === selectedRef) ? selectedRef : ""
    ) || filtered[0]?.ref || selectedRef;
    const focusedEntity = this.rules.getRuleEntity(finalFocusedRef)
      ?? allResults.find((entity) => entity.ref === finalFocusedRef)
      ?? null;
    const focusedDefinitions = this.#getIdentityChoiceDefinitionsForRef(config.scope, finalFocusedRef);
    const draft = overlay.identityDraft ?? null;
    const draftRef = String(draft?.ref ?? "").trim();
    const savedChoices = draftRef && draftRef === finalFocusedRef
      ? this.#buildIdentityChoiceRecordsForDisplay(config.scope, finalFocusedRef, draft.choices)
      : finalFocusedRef === selectedRef ? toArray(config.savedChoices) : [];

    const summarize = (entity) => {
      const definitions = this.#getIdentityChoiceDefinitionsForRef(config.scope, entity.ref);
      return {
        ref: entity.ref,
        name: entity.name || entity.shortName || cleanRefName(entity.ref),
        shortName: entity.shortName ?? "",
        source: entity.source ?? "",
        page: entity.page ?? null,
        hasChoices: definitions.length > 0,
        choiceCount: definitions.length
      };
    };

    const model = {
      type,
      label: config.label,
      title: config.title,
      searchPlaceholder: config.searchPlaceholder,
      selectedRef,
      focusedRef: finalFocusedRef,
      filters,
      sources: [...new Set(allResults.map((entity) => entity.source).filter(Boolean))].sort(),
      results: filtered.map(summarize),
      allResults: allResults.map(summarize),
      focusedEntity,
      fallbackEntities: type === "ancestry"
        ? this.#getAncestryLineage(finalFocusedRef).filter((entity) => entity.ref !== focusedEntity?.ref)
        : [],
      focusedMechanics: this.#getIdentityPickerMechanics(type, finalFocusedRef),
      focusedChoiceDefinitions: focusedDefinitions,
      savedChoices
    };

    if (overlay.nestedFeatPicker) {
      model.featPickerModel = this.getIdentityFeatPickerModel(type, overlay, model);
    }

    return model;
  }

  createFeatPickerModel({
    options = [],
    selectedValues = [],
    focusedRef = "",
    query = "",
    source = "",
    context = "identity",
    parentType = "",
    choiceId = "",
    label = "Feat",
    characterLevel = null
  } = {}) {
    const catalogFeats = this.rules.getAvailableFeats?.() ?? [];
    const catalogByRef = new Map(catalogFeats.map((feat) => [feat.ref, feat]));
    const candidateOptions = toArray(options).length ? toArray(options) : catalogFeats;
    const rawSelectedValues = toArray(selectedValues).map((value) => {
      if (value && typeof value === "object") {
        return value.ref || value.feat || value.name || value.value || "";
      }

      return value;
    }).filter(Boolean);
    const pickerOptions = candidateOptions.map((option) => {
      const ref = String(option?.ref || option?.value || option?.sourceId || option?.name || option?.label || "").trim();
      const catalogFeat = this.rules.getRuleEntity(ref) ?? catalogByRef.get(ref) ?? option;
      const fullText = getRuleFullText(catalogFeat);
      const selected = rawSelectedValues.some((value) => (
        this.matchRuleOption(value, [option, catalogFeat])?.ref === ref
        || normalizeComparable(value) === normalizeComparable(ref)
      ));
      return {
        ref,
        name: catalogFeat?.name || option?.name || option?.label || cleanRefName(ref),
        source: catalogFeat?.source || option?.source || "",
        page: catalogFeat?.page ?? option?.page ?? null,
        prerequisite: cleanRulesText(catalogFeat?.prerequisite ?? ""),
        summary: fullText.length > 220 ? `${fullText.slice(0, 219).trim()}...` : fullText,
        fullText,
        selected
      };
    }).filter((feat) => feat.ref);
    const selectedFeat = pickerOptions.find((feat) => feat.selected) ?? null;
    const filters = {
      query: String(query ?? "").trim(),
      source: String(source ?? "").trim()
    };
    const searchQuery = normalizeComparable(filters.query);
    const sourceFilter = normalizeComparable(filters.source);
    const results = pickerOptions.filter((feat) => (
      (!searchQuery || [
        feat.name,
        feat.source,
        feat.ref,
        feat.summary,
        feat.prerequisite
      ].map(normalizeComparable).join(" ").includes(searchQuery))
      && (!sourceFilter || normalizeComparable(feat.source) === sourceFilter)
    ));
    const requestedFocusedRef = String(focusedRef ?? "").trim();
    const finalFocusedRef = (
      requestedFocusedRef && pickerOptions.some((feat) => feat.ref === requestedFocusedRef) ? requestedFocusedRef : ""
    ) || (
      selectedFeat?.ref && results.some((feat) => feat.ref === selectedFeat.ref) ? selectedFeat.ref : ""
    ) || results[0]?.ref || selectedFeat?.ref || "";
    const focusedFeat = pickerOptions.find((feat) => feat.ref === finalFocusedRef) ?? null;

    return {
      type: `${context}-feat`,
      context,
      parentType,
      choiceId,
      label,
      characterLevel,
      filters,
      selectedRef: selectedFeat?.ref ?? "",
      selectedFeat,
      focusedRef: finalFocusedRef,
      focusedFeat,
      sources: [...new Set(pickerOptions.map((feat) => feat.source).filter(Boolean))].sort(),
      results,
      allResults: pickerOptions
    };
  }

  getIdentityFeatPickerModel(type, overlay = {}, parentModel = {}) {
    const nested = overlay.nestedFeatPicker ?? {};
    const choiceId = String(nested.choiceId ?? "").trim();
    const definition = toArray(parentModel.focusedChoiceDefinitions)
      .find((entry) => (entry.choiceId || entry.id) === choiceId && entry.type === "feat");
    const choiceRecord = toArray(parentModel.savedChoices)
      .find((choice) => choice.choiceId === choiceId);

    return this.createFeatPickerModel({
      options: definition?.options,
      selectedValues: getIdentityChoiceRecordValues(choiceRecord),
      focusedRef: nested.focusedRef,
      query: nested.query,
      source: nested.source,
      context: "identity",
      parentType: type,
      choiceId,
      label: definition?.label || "Feat"
    });
  }

  getLevelFeatPickerModel(overlay = {}, summary = {}) {
    const characterLevel = Number(overlay.characterLevel ?? 0);
    const entry = toArray(summary.levelTimeline)
      .find((levelEntry) => Number(levelEntry.characterLevel ?? 0) === characterLevel);
    const requirement = toArray(entry?.requirements)
      .find((item) => item.type === "feat");
    const decision = toArray(entry?.decisions)
      .find((item) => item.type === "feat");
    const decisionValue = decision?.value;
    const selectedValues = decisionValue && typeof decisionValue === "object"
      ? [decisionValue.ref || decisionValue.feat || decisionValue.name]
      : [decisionValue];

    return this.createFeatPickerModel({
      options: requirement?.options,
      selectedValues,
      focusedRef: overlay.focusedRef,
      query: overlay.query,
      source: overlay.source,
      context: "level",
      parentType: "level",
      choiceId: requirement?.decisionId || `level-${characterLevel}-feat`,
      label: "Feat",
      characterLevel
    });
  }

  #resolveRuleSummary(ref, kind) {
    const ruleRef = String(ref ?? "").trim();
    const entity = ruleRef ? this.rules.getRuleEntity(ruleRef) : null;
    const sourceAllowed = entity && this.rules.isSourceAllowed
      ? this.rules.isSourceAllowed(entity, { kind })
      : true;

    return {
      ref: ruleRef,
      kind: entity?.kind ?? kind,
      name: entity?.name ?? entity?.shortName ?? (ruleRef ? cleanRefName(ruleRef) : ""),
      shortName: entity?.shortName ?? "",
      source: entity?.source ?? "",
      summary: entity ? getRuleSummary(entity) : "",
      fullText: entity ? getRuleFullText(entity) : "",
      available: Boolean(entity),
      blocked: Boolean(entity && !sourceAllowed)
    };
  }

  matchRuleOption(value, options = []) {
    const target = String(value ?? "").trim().toLowerCase();
    if (!target) {
      return null;
    }

    return toArray(options).find((option) => [
      option?.ref,
      option?.sourceId,
      option?.name,
      option?.shortName
    ].map((entry) => String(entry ?? "").trim().toLowerCase()).includes(target)) ?? null;
  }

  #getSubclassFeatureDetailLookup() {
    if (this.subclassFeatureDetailLookup && this.subclassFeatureDetailLookupRulesData === this.rules.rulesData) {
      return this.subclassFeatureDetailLookup;
    }

    const catalogs = getNormalizedCatalogs(this.rules.rulesData);
    const lookup = new Map();

    for (const feature of toArray(catalogs.features?.subclassFeatures)) {
      const keys = [
        subclassFeatureLookupKey(feature),
        subclassFeatureLookupKey({ ...feature, source: "" }),
        normalizeString(feature.ref),
        normalizeString(feature.refId),
        normalizeString(feature.sourceId),
        normalizeString(feature.sourceKey),
        stripJsonExtension(feature.ref),
        stripJsonExtension(feature.refId),
        stripJsonExtension(feature.sourceId)
      ].filter(Boolean);

      for (const key of keys) {
        if (!lookup.has(key)) {
          lookup.set(key, feature);
        }
      }
    }

    this.subclassFeatureDetailLookup = lookup;
    this.subclassFeatureDetailLookupRulesData = this.rules.rulesData;
    return lookup;
  }

  #resolveSubclassFeatureReference(rawRef, parentFeature = {}, lookup = null) {
    const featureLookup = lookup ?? this.#getSubclassFeatureDetailLookup();
    const parsed = parseSubclassFeatureRefString(rawRef);
    const withFallbacks = {
      ...parsed,
      className: parsed.className || parentFeature.className,
      subclassShortName: parsed.subclassShortName || parentFeature.subclassShortName,
      source: parsed.source || parsed.subclassSource || parentFeature.subclassSource || parentFeature.source
    };
    const keys = [
      subclassFeatureLookupKey(withFallbacks),
      subclassFeatureLookupKey({ ...withFallbacks, source: "" }),
      normalizeString(rawRef),
      stripJsonExtension(rawRef)
    ].filter(Boolean);

    for (const key of keys) {
      const feature = featureLookup.get(key);
      if (feature) {
        return {
          ...feature,
          blocked: Boolean(parentFeature.blocked),
          blockedReason: parentFeature.blockedReason ?? ""
        };
      }
    }

    return null;
  }

  #getSubclassFeatures(subclassRef) {
    const subclass = this.rules.getRuleEntity(subclassRef);
    if (!subclass) {
      return [];
    }

    const levels = [
      ...toArray(subclass.featureLevels),
      ...toArray(subclass.subclassFeatures).map((feature) => Number(feature?.level ?? 0))
    ].map(Number).filter(Boolean);
    const uniqueLevels = [...new Set(levels)].sort((left, right) => left - right);
    const byRef = new Map();
    const detailLookup = this.#getSubclassFeatureDetailLookup();

    for (const level of uniqueLevels) {
      for (const feature of toArray(this.rules.getSubclassFeaturesForLevel?.(subclass.ref, level, { includeBlocked: true }))) {
        const childRefs = [
          ...getReferencedSubclassFeatureRefs(feature.entries),
          ...getReferencedSubclassFeatureRefs(feature.raw?.entries)
        ];
        const expandedFeatures = childRefs
          .map((ref) => this.#resolveSubclassFeatureReference(ref, feature, detailLookup))
          .filter(Boolean);
        const features = expandedFeatures.length ? expandedFeatures : [feature];

        for (const entry of features) {
          const key = entry.ref || `${entry.name}|${entry.level}|${entry.source}`;
          if (!byRef.has(key)) {
            byRef.set(key, entry);
          }
        }
      }
    }

    return [...byRef.values()].sort((left, right) => (
      Number(left.level ?? 0) - Number(right.level ?? 0)
      || String(left.name ?? "").localeCompare(String(right.name ?? ""))
    )).map((feature) => ({
      ...feature,
      summary: getRuleSummary(feature),
      fullText: getRuleFullText(feature)
    }));
  }

  #getSubclassPickerSearchText(subclass = {}) {
    return [
      subclass.name,
      subclass.shortName,
      subclass.source,
      subclass.ref,
      subclass.className,
      subclass.unlockAtClassLevel ? `${subclass.className} ${subclass.unlockAtClassLevel}` : "",
      ...this.#getSubclassFeatures(subclass.ref).flatMap((feature) => [
        feature.name,
        feature.source,
        feature.level,
        cleanRulesText(feature.fullText),
        cleanRulesText(feature.entries),
        cleanRulesText(feature.raw?.entries),
        cleanRulesText(feature.summary)
      ])
    ].join(" ").toLowerCase();
  }

  #getSubclassPickerModel(overlay = {}, summary = {}) {
    const targetLevel = Number(overlay.characterLevel ?? 0);
    const entry = toArray(summary.levelTimeline)
      .find((level) => Number(level.characterLevel) === targetLevel)
      ?? toArray(summary.levelTimeline)
        .find((level) => toArray(level.requirements).some((requirement) => requirement.type === "subclass"))
      ?? null;

    if (!entry) {
      return null;
    }

    const classSummary = this.#resolveRuleSummary(entry.classRef, "class");
    const allResults = toArray(this.rules.getValidSubclassesForClass?.(entry.classRef, entry.classLevel, { includeBlocked: true }));
    const filters = {
      query: String(overlay.query ?? "").trim(),
      source: String(overlay.source ?? "").trim(),
      unlockFilter: String(overlay.unlockFilter ?? "available").trim() || "available"
    };
    const query = normalizeComparable(filters.query);
    const source = normalizeComparable(filters.source);
    const filtered = allResults.filter((subclass) => (
      (!query || this.#getSubclassPickerSearchText(subclass).includes(query))
      && (!source || normalizeComparable(subclass.source) === source)
      && (filters.unlockFilter === "all"
        || (filters.unlockFilter === "available" && !subclass.blocked)
        || (filters.unlockFilter === "locked" && subclass.blocked))
    ));
    const decision = toArray(entry.decisions).find((item) => item.type === "subclass");
    const selectedRef = this.matchRuleOption(decision?.value, allResults)?.ref ?? "";
    const focusedRef = String(overlay.focusedRef ?? "").trim();
    const finalFocusedRef = (
      focusedRef && allResults.some((subclass) => subclass.ref === focusedRef) ? focusedRef : ""
    ) || (
      selectedRef && filtered.some((subclass) => subclass.ref === selectedRef) ? selectedRef : ""
    ) || filtered[0]?.ref || selectedRef;
    const focusedEntity = this.rules.getRuleEntity(finalFocusedRef)
      ?? allResults.find((subclass) => subclass.ref === finalFocusedRef)
      ?? null;
    const focusedFeatures = this.#getSubclassFeatures(finalFocusedRef);
    const featureTimeline = groupSubclassFeaturesByLevel(focusedFeatures);
    const classLevel = Number(entry.classLevel ?? 0);
    const immediateFeatures = focusedFeatures.filter((feature) => Number(feature.level ?? 0) <= classLevel);
    const futureFeatures = focusedFeatures.filter((feature) => Number(feature.level ?? 0) > classLevel);

    const summarize = (subclass) => {
      const features = this.#getSubclassFeatures(subclass.ref);
      return {
        ref: subclass.ref,
        name: subclass.name || subclass.shortName || cleanRefName(subclass.ref),
        shortName: subclass.shortName ?? "",
        source: subclass.source ?? "",
        page: subclass.page ?? null,
        className: subclass.className ?? classSummary.name,
        unlockAtClassLevel: Number(subclass.unlockAtClassLevel ?? 0),
        blocked: Boolean(subclass.blocked),
        blockedReason: subclass.blockedReason ?? "",
        featureTimeline: groupSubclassFeaturesByLevel(features),
        featurePreview: features,
        immediateFeatureCount: features.filter((feature) => Number(feature.level ?? 0) <= classLevel).length,
        futureFeatureCount: features.filter((feature) => Number(feature.level ?? 0) > classLevel).length
      };
    };

    return {
      type: "subclass",
      title: `Choose ${entry.requirements?.find?.((requirement) => requirement.type === "subclass")?.subclassTitle || classSummary.name || "Subclass"}`,
      label: entry.requirements?.find?.((requirement) => requirement.type === "subclass")?.subclassTitle || "Subclass",
      characterLevel: Number(entry.characterLevel ?? 0),
      classRef: entry.classRef,
      classLevel,
      className: classSummary.name || cleanRefName(entry.classRef),
      selectedRef,
      focusedRef: finalFocusedRef,
      focusedEntity,
      focusedFeatures,
      featureTimeline,
      immediateFeatures,
      futureFeatures,
      filters,
      sources: [...new Set(allResults.map((subclass) => subclass.source).filter(Boolean))].sort(),
      results: filtered.map(summarize),
      allResults: allResults.map(summarize)
    };
  }

  #getGuidedOverlaySnapshot(summary = {}) {
    if (!this.guidedOverlay) {
      return null;
    }

    const overlay = { ...this.guidedOverlay };
    if (overlay.type === "ancestry" || overlay.type === "background") {
      return {
        ...overlay,
        pickerModel: this.#getIdentityPickerModel(overlay.type, overlay)
      };
    }

    if (overlay.type === "subclass") {
      return {
        ...overlay,
        pickerModel: this.#getSubclassPickerModel(overlay, summary)
      };
    }

    if (overlay.type === "feat") {
      return {
        ...overlay,
        pickerModel: this.getLevelFeatPickerModel(overlay, summary)
      };
    }

    return overlay;
  }

  #getSelectedSubclassRefs(plan = []) {
    const refs = [];

    for (const entry of toArray(plan)) {
      for (const decision of toArray(entry.decisions)) {
        if (decision.type !== "subclass") {
          continue;
        }

        const options = this.rules.getValidSubclassesForClass?.(entry.classRef, Number.POSITIVE_INFINITY, { includeBlocked: true }) ?? [];
        const match = this.matchRuleOption(decision.value, options);
        if (match?.ref) {
          refs.push(match.ref);
        }
      }
    }

    return refs;
  }

  #getSelectedFeatRefs(plan = []) {
    const refs = [];
    const featOptions = this.rules.getAvailableFeats?.() ?? [];

    for (const entry of toArray(plan)) {
      for (const decision of toArray(entry.decisions)) {
        if (decision.type !== "feat") {
          continue;
        }

        const value = toObject(decision.value);
        const match = this.matchRuleOption(value.ref || value.feat || decision.value, featOptions);
        refs.push(value.ref || match?.ref || value.feat || decision.value);
      }
    }

    return refs.filter(Boolean);
  }

  #collectSpellsFromChoiceValue(value) {
    const object = toObject(value);
    const spells = [];

    if (object.spell) {
      spells.push(object.spell);
    }

    spells.push(...toArray(object.spells));
    return spells
      .map((spell) => {
        if (typeof spell === "string") {
          return {
            name: spell,
            source: "",
            level: null
          };
        }

        const normalized = toObject(spell);
        const name = String(normalized.name ?? normalized.spell ?? "").trim();
        const level = normalized.level == null ? null : Number(normalized.level);
        return name
          ? {
              name,
              source: String(normalized.source ?? "").trim(),
              level: Number.isFinite(level) ? level : null
            }
          : null;
      })
      .filter(Boolean);
  }

  getIdentitySpellsForSource(sourceRef) {
    const identity = this.builder?.identityChoices ?? {};
    const sourceKey = sourceKeyFromRef(sourceRef);
    const choiceGroups = [];

    if (sourceKey && sourceKeyFromRef(identity.raceRef) === sourceKey) {
      choiceGroups.push(identity.raceChoices);
    }

    if (sourceKey && sourceKeyFromRef(identity.backgroundRef) === sourceKey) {
      choiceGroups.push(identity.backgroundChoices);
    }

    return choiceGroups
      .flatMap(toArray)
      .flatMap((choice) => this.#collectSpellsFromChoiceValue(choice.value));
  }

  #getGrantSourceEntry(sourceRef, kind) {
    const normalizedRef = String(sourceRef ?? "").trim();
    const grants = normalizedRef && this.rules.getGrantedSpells
      ? this.rules.getGrantedSpells(normalizedRef, { includeBlocked: true })
      : [];

    if (!grants.length) {
      return null;
    }

    const sourceKey = sourceKeyFromRef(normalizedRef);
    const selectedChoices = toArray(this.builder?.grantedSpellChoices)
      .filter((choice) => sourceKeyFromRef(choice.sourceRef) === sourceKey);
    const summary = this.#resolveRuleSummary(normalizedRef, kind);

    return {
      sourceRef: normalizedRef,
      kind,
      name: summary.name,
      source: summary.source,
      fixedSpells: grants.filter((grant) => grant.type === "spell"),
      choiceGrants: grants.filter((grant) => grant.type === "choice"),
      selectedSpells: [
        ...this.getIdentitySpellsForSource(normalizedRef),
        ...selectedChoices.flatMap((choice) => toArray(choice.spells))
      ],
      grants
    };
  }

  #getGrantedSpellSources() {
    const identity = this.builder?.identityChoices ?? {};
    const plan = this.builder?.getLevelPlan?.() ?? [];
    const candidates = [
      [identity.raceRef, "ancestry"],
      [identity.backgroundRef, "background"],
      ...this.#getSelectedSubclassRefs(plan).map((ref) => [ref, "subclass"]),
      ...this.#getSelectedFeatRefs(plan).map((ref) => [ref, "feat"])
    ];
    const seen = new Set();
    const entries = [];

    for (const [sourceRef, kind] of candidates) {
      const key = sourceKeyFromRef(sourceRef);
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      const entry = this.#getGrantSourceEntry(sourceRef, kind);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  getIdentityChoiceDefinition(scope, choiceId) {
    const identity = this.builder?.identityChoices ?? {};
    const ref = scope === "race"
      ? identity.raceRef
      : scope === "background"
        ? identity.backgroundRef
        : "";
    const normalizedChoiceId = String(choiceId ?? "").trim();
    return this.#getIdentityChoiceDefinitionsForRef(scope, ref)
      .find((definition) => definition.choiceId === normalizedChoiceId || definition.id === normalizedChoiceId) ?? null;
  }

  #getBuilderOptions() {
    const mapOption = (entry) => ({
      ...deepClone(entry),
      ref: entry.ref,
      sourceId: entry.sourceId,
      name: entry.name,
      shortName: entry.shortName,
      source: entry.source,
      summary: getRuleSummary(entry),
      fullText: getRuleFullText(entry),
      blocked: Boolean(entry.blocked),
      blockedReason: entry.blockedReason ?? ""
    });

    return {
      ancestries: toArray(this.rules.getAvailableAncestries?.()).map(mapOption),
      backgrounds: toArray(this.rules.getAvailableBackgrounds?.()).map(mapOption),
      classes: toArray(this.rules.getAvailableClasses?.()).map(mapOption)
    };
  }

  #getSubclassFeaturePreview(subclassRef) {
    return this.#getSubclassFeatures(subclassRef);
  }

  #hydrateTimelineRequirement(requirement) {
    if (requirement?.type !== "subclass") {
      return requirement;
    }

    return {
      ...requirement,
      options: toArray(requirement.options).map((option) => ({
        ...option,
        summary: getRuleSummary(option),
        fullText: getRuleFullText(option),
        featurePreview: this.#getSubclassFeaturePreview(option.ref)
      }))
    };
  }

  #getLevelTimeline(proficiencyLedger = null) {
    const levels = this.builder?.getLevelPlan?.({ includeDetails: true }) ?? [];
    const unresolvedChoices = mergeChoiceLists(
      this.builder?.getPendingChoices?.(),
      this.builder?.getBlockedChoices?.()
    );
    const unresolvedByLevel = new Map();
    const ledgerChoiceModelById = new Map(
      toArray(proficiencyLedger?.choiceModels)
        .filter((model) => model?.id)
        .map((model) => [model.id, model])
    );

    for (const choice of unresolvedChoices) {
      const level = Number(choice.characterLevel ?? 0);
      if (!level) {
        continue;
      }

      const previous = unresolvedByLevel.get(level) ?? [];
      unresolvedByLevel.set(level, [...previous, choice]);
    }

    return toArray(levels).map((entry) => ({
      ...entry,
      classSummary: this.#resolveRuleSummary(entry.classRef, "class"),
      decisions: toArray(entry.decisions),
      requirements: toArray(entry.requirements).map((requirement) => this.#hydrateTimelineRequirement(requirement)),
      choiceModels: toArray(entry.choiceModels).map((model) => ledgerChoiceModelById.get(model.id) ?? model),
      classFeatures: toArray(entry.classFeatures),
      subclassFeatures: toArray(entry.subclassFeatures),
      unresolvedChoices: unresolvedByLevel.get(Number(entry.characterLevel)) ?? []
    }));
  }

  #getBuilderSummary(status) {
    const identity = this.builder?.identityChoices ?? {};
    const abilityScores = toObject(this.builder?.abilityScoreChoices?.scores);
    const classProgression = toArray(status?.classProgression).map((entry) => {
      const summary = this.#resolveRuleSummary(entry.classRef, "class");
      return {
        ...entry,
        name: summary.name || cleanRefName(entry.classRef),
        source: summary.source,
        available: summary.available,
        blocked: summary.blocked
      };
    });
    const pendingChoices = this.builder?.getPendingChoices?.() ?? [];
    const blockedChoices = this.builder?.getBlockedChoices?.() ?? [];
    const warnings = this.builder?.getRulesWarnings?.() ?? [];
    const proficiencyLedger = this.compiler?.createProficiencyLedger?.(this.builder) ?? null;
    const abilityImpactPreview = this.compiler?.createAbilityImpactPreview?.(this.builder, {
      baseCharacterDto: this.characterDto
    }) ?? null;
    const classMix = classProgression.length
      ? classProgression.map((entry) => `${entry.name} ${entry.levels}`).join(" / ")
      : "";
    const ancestry = this.#resolveRuleSummary(identity.raceRef, "ancestry");
    ancestry.abilitySummary = this.#getAncestryAbilitySummary(identity.raceRef, identity.raceChoices);

    return {
      characterId: this.builder?.characterId ?? this.config.characterId ?? "",
      ancestry,
      background: this.#resolveRuleSummary(identity.backgroundRef, "background"),
      classMix,
      classes: classProgression,
      totalLevel: Number(status?.totalLevels ?? 0),
      abilityScores: {
        method: this.builder?.abilityScoreChoices?.method ?? "manual",
        complete: Boolean(status?.hasAbilityScores),
        enteredCount: Object.keys(abilityScores).length,
        scores: abilityScores
      },
      pendingChoices,
      blockedChoices,
      warnings,
      proficiencyLedger,
      abilityImpactPreview,
      levelTimeline: this.#getLevelTimeline(proficiencyLedger),
      grantedSpellSources: this.#getGrantedSpellSources(),
      identityChoiceRequirements: this.builder?.getIdentityChoiceRequirements?.() ?? []
    };
  }

  /**
   * Returns a serializable snapshot consumed by renderers and lifecycle callbacks.
   */
  getSnapshot() {
    const builderStatus = this.builder?.getStatus() ?? null;
    const builderSummary = this.#getBuilderSummary(builderStatus);

    return {
      isOpen: this.isOpen,
      config: {
        ...this.config,
        callbacks: undefined
      },
      rulesProfile: this.rules.describeProfile(),
      builderStatus,
      builderSummary,
      builderOptions: this.#getBuilderOptions(),
      loadStatus: this.loadStatus,
      loadIssues: [...this.loadIssues],
      loadedResources: {
        rules: this.rulesLoadResult
          ? {
              ok: this.rulesLoadResult.ok,
              reason: this.rulesLoadResult.reason,
              catalogCount: Object.keys(this.rulesLoadResult.data?.normalizedCatalog?.catalogs ?? {}).length,
              classCount: Object.keys(this.rulesLoadResult.data?.classes ?? {}).length,
              spellSourceCount: Object.keys(this.rulesLoadResult.data?.spells ?? {}).length
            }
          : null,
        builder: this.builderLoadResult
          ? {
              ok: this.builderLoadResult.ok,
              reason: this.builderLoadResult.reason,
              url: this.builderLoadResult.url
            }
          : null,
        character: this.characterLoadResult
          ? {
              ok: this.characterLoadResult.ok,
              reason: this.characterLoadResult.reason,
              url: this.characterLoadResult.url
            }
          : null
      },
      uiState: {
        guidedOverlay: this.#getGuidedOverlaySnapshot(builderSummary),
        lastRenderTransaction: this.lastRenderTransaction ? deepClone(this.lastRenderTransaction) : null
      },
      saveStatus: this.saveStatus,
      exportStatus: this.exportStatus,
      lastSaveResult: this.lastSaveResult ? deepClone(this.lastSaveResult) : null,
      lastExportResult: this.lastExportResult ? deepClone(this.lastExportResult) : null
    };
  }
}
