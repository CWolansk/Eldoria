import { ABILITY_ORDER } from "../shared/character-state.js";

export const ASI_2014_RULE_PROFILE = Object.freeze({
  ruleset: "2014",
  label: "2014 Ability Score Increase",
  pickLimit: 2,
  amountPerPick: 1,
  abilityCap: 20,
  allowDuplicateAbility: true,
  control: "stepper"
});

const ABILITY_LABELS = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
};

const DEFAULT_RULES_PROFILE = {
  ruleset: "2014",
  allowedSources: ["PHB"],
  asiAndFeatAtAsiLevels: true,
  sourcePolicy: null
};

const ADDITIONAL_SPELL_MODES = ["known", "prepared", "innate", "expanded"];
const PROFICIENCY_COLLECTIONS = ["armor", "weapons", "tools", "skills", "languages"];

const SUBRACE_FIRST_NAMES = new Set([
  "deep",
  "forest",
  "high",
  "hill",
  "lightfoot",
  "mountain",
  "pallid",
  "rock",
  "sea",
  "stout",
  "wood"
]);

const STANDALONE_SUBRACE_NAMES = new Set([
  "drow",
  "eladrin",
  "shadar-kai"
]);

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function toObject(value) {
  return isObject(value) ? value : {};
}

function toPositiveInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : fallback;
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeComparable(value) {
  return normalizeString(value).toLowerCase();
}

function titleCaseChoice(value) {
  return normalizeString(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return ["of", "and", "the"].includes(lower) ? lower : `${lower[0].toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");
}

function getChoiceOptionValue(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.value || option?.ref || option?.sourceId || option?.name || option?.shortName || option?.label || "";
}

function formatChoiceOptionLabel(option) {
  if (typeof option === "string") {
    return titleCaseChoice(option);
  }

  return option?.label || option?.name || option?.shortName || titleCaseChoice(getChoiceOptionValue(option));
}

function normalizeSelectedAbilityIncreases(increases = [], ruleProfile = ASI_2014_RULE_PROFILE) {
  const amountPerPick = Number(ruleProfile.amountPerPick ?? 1) || 1;

  return toArray(increases)
    .map((increase) => {
      const ability = normalizeComparable(increase?.ability ?? increase);
      const amount = increase && typeof increase === "object"
        ? Number(increase.amount ?? amountPerPick)
        : amountPerPick;
      return ABILITY_ORDER.includes(ability) && Number.isFinite(amount) && amount > 0
        ? { ability, amount }
        : null;
    })
    .filter(Boolean);
}

export function createEmptyAbilityMap(initialValue = 0) {
  return Object.fromEntries(ABILITY_ORDER.map((ability) => [ability, Number(initialValue) || 0]));
}

export function addAbilityMaps(...maps) {
  const result = createEmptyAbilityMap();
  for (const map of maps) {
    for (const ability of ABILITY_ORDER) {
      const amount = Number(map?.[ability] ?? 0);
      if (Number.isFinite(amount)) {
        result[ability] += amount;
      }
    }
  }

  return result;
}

export function normalizeAbilityIncrease(increase = {}, fallbackAmount = 0) {
  const ability = normalizeComparable(increase?.ability ?? increase);
  const amount = increase && typeof increase === "object"
    ? Number(increase.amount ?? fallbackAmount)
    : Number(fallbackAmount);
  return ABILITY_ORDER.includes(ability) && Number.isFinite(amount) && amount !== 0
    ? { ability, amount }
    : null;
}

export function getAbilityIncreasesFromValue(value, ruleProfile = ASI_2014_RULE_PROFILE) {
  const amountPerPick = Number(ruleProfile.amountPerPick ?? 1) || 1;
  return toArray(toObject(value).increases)
    .map((increase) => normalizeAbilityIncrease(increase, amountPerPick))
    .filter(Boolean);
}

export function createBoundedChoiceModel(options = {}) {
  const rawOptions = toArray(options.options ?? options.requirement?.options);
  const count = toPositiveInteger(options.count ?? options.requirement?.count, 1);
  const selectedValues = toArray(options.selectedValues);
  const selectedSet = new Set(selectedValues.map(normalizeComparable));
  const optionKeys = new Set(rawOptions.map((option) => normalizeComparable(getChoiceOptionValue(option))));
  const matchedSelections = [...selectedSet].filter((value) => optionKeys.has(value));
  const selectedCount = matchedSelections.length;
  const overLimit = selectedCount > count;
  const missingCount = Math.max(0, count - selectedCount);
  const rows = rawOptions.map((option) => {
    const value = getChoiceOptionValue(option);
    const checked = selectedSet.has(normalizeComparable(value));
    const limitBlocked = !checked && selectedCount >= count;
    return {
      value,
      label: formatChoiceOptionLabel(option),
      checked,
      disabled: limitBlocked,
      reason: limitBlocked ? `already picked ${count}` : checked ? "selected" : "",
      status: checked ? "checked" : limitBlocked ? "disabled" : "available"
    };
  });

  return {
    id: options.id ?? options.requirement?.decisionId ?? "choice-limit",
    type: options.type ?? options.requirement?.type ?? "choice",
    label: options.label ?? titleCaseChoice(options.type ?? options.requirement?.type ?? "Choice"),
    sourceLabel: options.sourceLabel ?? "",
    count,
    selectedCount,
    missingCount,
    overLimit,
    resolved: selectedCount === count && !overLimit,
    options: rows,
    violations: [
      overLimit ? `Picked ${selectedCount}; limit is ${count}.` : ""
    ].filter(Boolean)
  };
}

export function createAsiChoiceModelFromState(options = {}) {
  const ruleProfile = {
    ...ASI_2014_RULE_PROFILE,
    ...toObject(options.ruleProfile)
  };
  const currentScores = {
    ...createEmptyAbilityMap(10),
    ...toObject(options.currentScores)
  };
  const selectedIncreases = normalizeSelectedAbilityIncreases(options.selectedIncreases, ruleProfile);
  const selectedAmounts = selectedIncreases.reduce((map, increase) => {
    map[increase.ability] = (map[increase.ability] ?? 0) + increase.amount;
    return map;
  }, {});
  const amountPerPick = Number(ruleProfile.amountPerPick ?? 1) || 1;
  const pickLimit = Number(ruleProfile.pickLimit ?? 2) || 2;
  const abilityCap = Number(ruleProfile.abilityCap ?? 20) || 20;
  const selectedPickCount = Object.values(selectedAmounts)
    .reduce((total, amount) => total + Math.max(0, Number(amount) / amountPerPick), 0);
  const rows = ABILITY_ORDER.map((ability) => {
    const selectedAmount = Number(selectedAmounts[ability] ?? 0);
    const pickedCount = Math.max(0, selectedAmount / amountPerPick);
    const checked = selectedAmount > 0;
    const duplicateBlocked = pickedCount > 1
      && ruleProfile.allowDuplicateAbility === false
      && selectedAmount > amountPerPick;
    const indivisibleAmount = checked && selectedAmount % amountPerPick !== 0;
    const current = Number(currentScores[ability] ?? 0);
    const next = current + selectedAmount;
    const capBlocked = current + selectedAmount + amountPerPick > abilityCap;
    const capViolation = checked && next > abilityCap;
    const limitBlocked = selectedPickCount >= pickLimit;
    const disabled = !checked && (capBlocked || limitBlocked);
    const incrementDisabled = capBlocked || limitBlocked;
    const reason = duplicateBlocked
      ? `cannot receive more than +${amountPerPick}`
      : indivisibleAmount
        ? `must use +${amountPerPick} increments`
        : capViolation
          ? `would exceed ${abilityCap}`
          : checked
            ? "selected"
            : limitBlocked
              ? `already picked ${pickLimit}`
              : capBlocked
                ? `would exceed ${abilityCap}`
                : "";

    return {
      ability,
      label: ABILITY_LABELS[ability],
      amount: selectedAmount,
      pickedCount,
      checked,
      disabled,
      incrementDisabled,
      decrementDisabled: selectedAmount <= 0,
      current,
      next,
      reason,
      status: duplicateBlocked || indivisibleAmount || capViolation
        ? "invalid"
        : checked
          ? "checked"
          : disabled
            ? "disabled"
            : "available"
    };
  });
  const invalidRows = rows.filter((row) => row.status === "invalid");
  const overLimit = selectedPickCount > pickLimit;

  return {
    id: options.id ?? `level-${options.characterLevel ?? "x"}-asi`,
    type: "asi",
    label: options.label ?? "Ability Score Increase",
    sourceLabel: options.sourceLabel ?? "",
    ruleProfile,
    count: pickLimit,
    selectedPickCount,
    missingCount: Math.max(0, pickLimit - selectedPickCount),
    overLimit,
    resolved: selectedPickCount === pickLimit && !overLimit && !invalidRows.length,
    currentScores,
    options: rows,
    violations: [
      overLimit ? `Picked ${selectedPickCount}; limit is ${pickLimit}.` : "",
      ...invalidRows.map((row) => `${row.label} ${row.reason}.`)
    ].filter(Boolean)
  };
}

function normalizeSource(value) {
  return normalizeString(value).toUpperCase();
}

function cloneJson(value, fallback = null) {
  if (value == null) {
    return fallback;
  }

  return JSON.parse(JSON.stringify(value));
}

function slugify(value) {
  return normalizeString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function stripJsonExtension(value) {
  return normalizeString(value).replace(/\.json$/i, "");
}

function stripAnchor(value) {
  return normalizeString(value).split("#")[0];
}

function makeRef(prefix, value) {
  const slug = slugify(value);
  return slug ? `${prefix}-${slug}.json` : "";
}

function withSourceSuffix(ref, source) {
  const base = stripJsonExtension(ref);
  const suffix = slugify(source);
  return suffix ? `${base}-${suffix}.json` : ref;
}

function toTitleCase(value) {
  return normalizeString(value)
    .split(/(\s+|\/|-)/)
    .map((part) => /^[a-z]/.test(part) ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join("");
}

function cleanTaggedText(value) {
  return normalizeString(value)
    .replace(/\{@[a-zA-Z0-9_-]+ ([^|}]+)(?:\|[^}]*)?\}/g, "$1")
    .trim();
}

function sortByNameThenSource(a, b) {
  return a.name.localeCompare(b.name) || a.source.localeCompare(b.source);
}

function createRulesIndex(source = "legacy") {
  return {
    source,
    ancestries: [],
    backgrounds: [],
    classes: [],
    subclasses: [],
    feats: [],
    spells: [],
    byRef: new Map(),
    classFeaturesByClassRef: new Map(),
    subclassFeaturesBySubclassRef: new Map(),
    subclassesByClassRef: new Map(),
    grantsByRef: new Map(),
    spellsByName: new Map(),
    spellsByNameAndSource: new Map()
  };
}

function getEntitySources(entity) {
  if (typeof entity === "string") {
    return [entity].filter(Boolean);
  }

  const raw = toObject(entity);
  const primarySources = [
    raw.source,
    ...toArray(raw.otherSources).map((source) => source?.source),
    ...toArray(raw.sourceRefs).map((source) => source?.source),
    ...toArray(raw.raw?.otherSources).map((source) => source?.source),
    ...toArray(raw.raw?.sourceRefs).map((source) => source?.source)
  ].map(normalizeString).filter(Boolean);

  if (primarySources.length) {
    return primarySources;
  }

  return [
    raw.classSource,
    raw.raceSource,
    raw.subclassSource
  ].map(normalizeString).filter(Boolean);
}

function sourceSetFrom(value) {
  return new Set(toArray(value).map(normalizeSource).filter(Boolean));
}

function getPolicySources(policy, profile) {
  if (isObject(policy)) {
    return policy.allowedSources ?? policy.sources ?? profile.allowedSources;
  }

  return profile.allowedSources;
}

function getPolicyBlockedSources(policy) {
  if (!isObject(policy)) {
    return [];
  }

  return policy.blockedSources ?? policy.blockSources ?? policy.excludedSources ?? policy.denySources ?? [];
}

function normalizeProficiencyList(value) {
  const fixed = [];
  const choices = [];

  for (const item of toArray(value)) {
    if (typeof item === "string") {
      fixed.push(cleanTaggedText(item));
      continue;
    }

    if (!isObject(item)) {
      continue;
    }

    for (const [key, entryValue] of Object.entries(item)) {
      if (key === "choose" && isObject(entryValue)) {
        choices.push({
          from: toArray(entryValue.from).map(cleanTaggedText),
          count: Number(entryValue.count ?? 1)
        });
      } else if (entryValue === true) {
        fixed.push(cleanTaggedText(key));
      } else if (Number.isFinite(Number(entryValue)) && Number(entryValue) > 0) {
        choices.push({
          from: [cleanTaggedText(key)],
          count: Number(entryValue)
        });
      }
    }
  }

  return {
    fixed: [...new Set(fixed.filter(Boolean))],
    choices
  };
}

function normalizeStartingProficiencies(raw = {}) {
  const source = toObject(raw);
  return {
    armor: normalizeProficiencyList(source.armor),
    weapons: normalizeProficiencyList(source.weapons),
    tools: normalizeProficiencyList(source.tools),
    skills: normalizeProficiencyList(source.skills),
    languages: normalizeProficiencyList(source.languages)
  };
}

function normalizeGrantCollections(raw = {}) {
  const source = toObject(raw);
  return {
    skills: normalizeProficiencyList(source.skillProficiencies),
    tools: normalizeProficiencyList(source.toolProficiencies),
    languages: normalizeProficiencyList(source.languageProficiencies),
    skillToolLanguages: normalizeProficiencyList(source.skillToolLanguageProficiencies),
    feats: normalizeProficiencyList(source.feats)
  };
}

function getAncestryDisplay(raw, isSubrace) {
  const name = normalizeString(raw.name);
  const raceName = normalizeString(raw.raceName);

  if (!isSubrace || !raceName) {
    return name;
  }

  const lower = name.toLowerCase();
  if (!name) {
    return `${raceName} Variant`;
  }

  if (STANDALONE_SUBRACE_NAMES.has(lower) || name.toLowerCase().includes(raceName.toLowerCase())) {
    return name;
  }

  if (lower === "variant") {
    return `${raceName} ${name}`;
  }

  if (SUBRACE_FIRST_NAMES.has(lower)) {
    return `${name} ${raceName}`;
  }

  return `${raceName} ${name}`;
}

function getAncestryRefName(raw, isSubrace) {
  return getAncestryDisplay(raw, isSubrace);
}

function extractBackgroundFeatureName(entries = []) {
  const feature = toArray(entries).find((entry) => {
    if (!isObject(entry)) {
      return false;
    }

    return entry.data?.isFeature || /^Feature:/i.test(normalizeString(entry.name));
  });

  return normalizeString(feature?.name).replace(/^Feature:\s*/i, "");
}

function parseFeatureRefString(value) {
  const parts = normalizeString(value).split("|");
  return {
    name: normalizeString(parts[0]),
    className: normalizeString(parts[1]),
    classSource: normalizeString(parts[2]),
    level: Number(parts[3] || 0),
    source: normalizeString(parts[4])
  };
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

function featureKey(parts = {}) {
  return [
    normalizeString(parts.name).toLowerCase(),
    normalizeString(parts.className).toLowerCase(),
    Number(parts.level || 0),
    normalizeSource(parts.source)
  ].join("|");
}

function subclassFeatureKey(parts = {}) {
  return [
    normalizeString(parts.name).toLowerCase(),
    normalizeString(parts.className).toLowerCase(),
    normalizeString(parts.subclassShortName).toLowerCase(),
    Number(parts.level || 0),
    normalizeSource(parts.source)
  ].join("|");
}

function createFeatureLookup(features = []) {
  const lookup = new Map();

  for (const feature of toArray(features)) {
    const withSource = featureKey(feature);
    const withoutSource = featureKey({ ...feature, source: "" });
    lookup.set(withSource, feature);
    if (!lookup.has(withoutSource)) {
      lookup.set(withoutSource, feature);
    }
  }

  return lookup;
}

function createSubclassFeatureLookup(features = []) {
  const lookup = new Map();

  for (const feature of toArray(features)) {
    const withSource = subclassFeatureKey(feature);
    const withoutSource = subclassFeatureKey({ ...feature, source: "" });
    lookup.set(withSource, feature);
    if (!lookup.has(withoutSource)) {
      lookup.set(withoutSource, feature);
    }
  }

  return lookup;
}

function parseSpellString(value) {
  const text = normalizeString(value);
  const [nameAndSource, levelHint] = text.split("#");
  const [name, source] = nameAndSource.split("|");
  let level = null;

  if (levelHint === "c") {
    level = 0;
  } else if (Number.isFinite(Number(levelHint))) {
    level = Number(levelHint);
  }

  return {
    name: normalizeString(name),
    source: normalizeString(source),
    level
  };
}

function resolveSpell(value, spellLookup) {
  const parsed = parseSpellString(value);
  const nameKey = parsed.name.toLowerCase();
  const sourceKey = normalizeSource(parsed.source);
  const exact = sourceKey
    ? spellLookup.byNameAndSource.get(`${nameKey}|${sourceKey}`)
    : null;
  const byName = spellLookup.byName.get(nameKey)?.[0] ?? null;
  const spell = exact ?? byName;

  return {
    name: spell?.name ?? toTitleCase(parsed.name),
    source: spell?.source ?? parsed.source,
    level: spell?.level ?? parsed.level,
    school: spell?.school ?? "",
    ref: spell?.ref ?? ""
  };
}

function readSpellNodeKey(key, state) {
  const next = { ...state };

  if (key === "_") {
    return next;
  }

  if (/^s\d+$/i.test(key)) {
    next.spellLevel = Number(key.slice(1));
    return next;
  }

  if (/^\d+$/.test(key)) {
    next.unlockAtLevel = Number(key);
    return next;
  }

  if (/^\d+[a-z]$/i.test(key)) {
    next.uses = key;
    return next;
  }

  if (["daily", "rest", "will", "ritual"].includes(key)) {
    next.recharge = key;
    return next;
  }

  next.path = [...toArray(next.path), key];
  return next;
}

function collectSpellGrant(item, state, grants, spellLookup) {
  if (typeof item === "string") {
    const spell = resolveSpell(item, spellLookup);
    grants.push({
      type: "spell",
      mode: state.mode,
      name: spell.name,
      source: spell.source,
      level: spell.level ?? state.spellLevel ?? null,
      school: spell.school,
      ref: spell.ref,
      unlockAtLevel: state.unlockAtLevel ?? null,
      recharge: state.recharge ?? "",
      uses: state.uses ?? "",
      group: state.group,
      ability: cloneJson(state.ability, null)
    });
    return;
  }

  if (isObject(item) && item.choose) {
    grants.push({
      type: "choice",
      mode: state.mode,
      filter: normalizeString(item.choose),
      count: Number(item.count ?? 1),
      unlockAtLevel: state.unlockAtLevel ?? null,
      recharge: state.recharge ?? "",
      uses: state.uses ?? "",
      group: state.group,
      ability: cloneJson(state.ability, null)
    });
  }
}

function walkAdditionalSpellNode(node, state, grants, spellLookup) {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectSpellGrant(item, state, grants, spellLookup);
    }
    return;
  }

  if (typeof node === "string" || (isObject(node) && node.choose)) {
    collectSpellGrant(node, state, grants, spellLookup);
    return;
  }

  if (!isObject(node)) {
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    walkAdditionalSpellNode(value, readSpellNodeKey(key, state), grants, spellLookup);
  }
}

function normalizeAdditionalSpells(additionalSpells, spellLookup) {
  const grants = [];

  for (const group of toArray(additionalSpells)) {
    const groupName = normalizeString(group.name);
    const ability = group.ability ?? null;

    for (const mode of ADDITIONAL_SPELL_MODES) {
      if (!group[mode]) {
        continue;
      }

      walkAdditionalSpellNode(group[mode], {
        mode,
        group: groupName,
        ability
      }, grants, spellLookup);
    }
  }

  return grants;
}

function normalizeSpell(raw) {
  const name = normalizeString(raw.name);
  const source = normalizeString(raw.source);
  const ref = makeRef("spell", `${name}-${source}`);

  return {
    kind: "spell",
    name,
    source,
    sourceId: stripJsonExtension(ref),
    ref,
    level: Number(raw.level ?? 0),
    school: normalizeString(raw.school),
    page: raw.page ?? null
  };
}

function createSpellLookup(spells) {
  const byName = new Map();
  const byNameAndSource = new Map();

  for (const spell of spells) {
    const nameKey = spell.name.toLowerCase();
    const sourceKey = normalizeSource(spell.source);
    const list = byName.get(nameKey) ?? [];
    list.push(spell);
    byName.set(nameKey, list);
    byNameAndSource.set(`${nameKey}|${sourceKey}`, spell);
  }

  return { byName, byNameAndSource };
}

function getEntityLookupKeys(entity = {}) {
  return [
    entity.ref,
    entity.sourceId,
    entity.refId,
    entity.id
  ].map(normalizeString).filter(Boolean);
}

function getCatalogSourceId(entity = {}) {
  const ref = normalizeString(entity.ref);
  return normalizeString(entity.sourceId ?? entity.refId) || stripJsonExtension(ref);
}

function normalizeCatalogSchool(value) {
  if (isObject(value)) {
    return normalizeString(value.code ?? value.name);
  }

  return normalizeString(value);
}

function getNormalizedCatalogs(rulesData = {}) {
  const normalizedCatalog = toObject(rulesData.normalizedCatalog);
  const directCatalogs = toObject(normalizedCatalog.catalogs);
  if (Object.keys(directCatalogs).length) {
    return directCatalogs;
  }

  const topLevelCatalogs = toObject(rulesData.catalogs);
  if (Object.keys(topLevelCatalogs).length) {
    return topLevelCatalogs;
  }

  return null;
}

function hasBuilderCatalogData(catalogs = {}) {
  return Boolean(
    toArray(catalogs.spells?.spells).length
    || toArray(catalogs.classes?.classes).length
    || toArray(catalogs.classes?.subclasses).length
    || toArray(catalogs.features?.classFeatures).length
    || toArray(catalogs.features?.subclassFeatures).length
    || toArray(catalogs.races?.races).length
    || toArray(catalogs.backgrounds?.backgrounds).length
    || toArray(catalogs.feats?.feats).length
  );
}

/**
 * Normalizes campaign and source-filtering settings used by builder rules queries.
 * CharacterBuilderApp owns configuration; this adapter owns interpreting it for rules.
 */
export function normalizeRulesProfile(profile = {}) {
  return {
    ...DEFAULT_RULES_PROFILE,
    ...profile,
    allowedSources: toArray(profile.allowedSources, DEFAULT_RULES_PROFILE.allowedSources)
      .map((source) => String(source).trim())
      .filter(Boolean),
    asiAndFeatAtAsiLevels: Boolean(profile.asiAndFeatAtAsiLevels),
    sourcePolicy: profile.sourcePolicy ?? null
  };
}

/**
 * Stable query layer over 5etools/static rules payloads.
 * Render code should ask this class for normalized choices instead of parsing raw
 * race/class/background/feat/spell JSON directly.
 */
export class CharacterBuilderRules {
  #rulesData;
  #profile;
  #index;

  constructor(options = {}) {
    this.#rulesData = options.rulesData ?? {};
    this.#profile = normalizeRulesProfile(options.rulesProfile);
    this.#index = this.#buildIndex(this.#rulesData);
  }

  /**
   * Replaces all loaded rules data.
   */
  replaceRulesData(rulesData = {}) {
    this.#rulesData = rulesData;
    this.#index = this.#buildIndex(rulesData);
    return this;
  }

  /**
   * Updates source policy and campaign rule toggles.
   * Called when opening the builder with a different rules profile.
   */
  setRulesProfile(rulesProfile = {}) {
    this.#profile = normalizeRulesProfile({
      ...this.#profile,
      ...rulesProfile
    });
    return this;
  }

  get rulesData() {
    return this.#rulesData;
  }

  get profile() {
    return this.#profile;
  }

  /**
   * Returns ancestry/race choices available under the active profile.
   */
  getAvailableAncestries() {
    return this.#filterAllowed(this.#index.ancestries).sort(sortByNameThenSource).map((entry) => cloneJson(entry));
  }

  /**
   * Returns background choices available under the active profile.
   */
  getAvailableBackgrounds() {
    return this.#filterAllowed(this.#index.backgrounds).sort(sortByNameThenSource).map((entry) => cloneJson(entry));
  }

  /**
   * Returns class choices available under the active profile.
   */
  getAvailableClasses() {
    return this.#filterAllowed(this.#index.classes).sort(sortByNameThenSource).map((entry) => cloneJson(entry));
  }

  /**
   * Returns feat choices available under the active profile.
   */
  getAvailableFeats() {
    return this.#filterAllowed(this.#index.feats).sort(sortByNameThenSource).map((entry) => cloneJson(entry));
  }

  /**
   * Returns subclasses valid for a class at a specific class level.
   * Pass { includeBlocked: true } to see source- or level-blocked options.
   */
  getValidSubclassesForClass(classRef, classLevel, options = {}) {
    const resolvedClass = this.#resolveRef(classRef);
    const level = Number(classLevel ?? 0);
    const subclasses = this.#index.subclassesByClassRef.get(resolvedClass?.ref ?? stripAnchor(classRef)) ?? [];

    return subclasses
      .map((subclass) => {
        const sourceAllowed = this.#isSourceAllowed(subclass, { kind: "subclass" });
        const levelAllowed = level >= subclass.unlockAtClassLevel;
        return {
          ...subclass,
          blocked: !sourceAllowed || !levelAllowed,
          blockedReason: !sourceAllowed
            ? this.#getSourceBlockedReason(subclass)
            : !levelAllowed
              ? `Requires ${subclass.className} level ${subclass.unlockAtClassLevel}.`
              : ""
        };
      })
      .filter((subclass) => options.includeBlocked || !subclass.blocked)
      .sort(sortByNameThenSource)
      .map((entry) => cloneJson(entry));
  }

  /**
   * Returns the decisions required or unlocked for one class level.
   */
  getValidLevelDecisions(classRef, classLevel) {
    const classEntry = this.#resolveRef(classRef);
    if (!classEntry || classEntry.kind !== "class") {
      return [];
    }

    const level = Number(classLevel ?? 0);
    const decisions = [];
    const features = this.getClassFeaturesForLevel(classEntry.ref, level, { includeBlocked: true });

    if (level === 1) {
      for (const collection of PROFICIENCY_COLLECTIONS) {
        const proficiencyChoices = classEntry.startingProficiencies[collection]?.choices ?? [];
        proficiencyChoices.forEach((choice, index) => {
          decisions.push({
            type: collection === "skills" ? "skill" : collection.replace(/s$/, ""),
            decisionId: `${classEntry.sourceId}-level-1-${collection}-${index + 1}`,
            classRef: classEntry.ref,
            classLevel: level,
            count: choice.count,
            options: [...choice.from],
            required: true,
            reason: "starting-proficiency"
          });
        });
      }
    }

    const subclassUnlockFeature = features.find((feature) => feature.gainSubclassFeature && level === classEntry.subclassUnlockLevel);
    if (subclassUnlockFeature) {
      decisions.push({
        type: "subclass",
        decisionId: `${classEntry.sourceId}-level-${level}-subclass`,
        classRef: classEntry.ref,
        classLevel: level,
        subclassTitle: classEntry.subclassTitle,
        options: this.getValidSubclassesForClass(classEntry.ref, level),
        required: true,
        reason: "subclass-unlock"
      });
    }

    const hasAsi = features.some((feature) => /^Ability Score Improvement$/i.test(feature.name));
    if (hasAsi) {
      decisions.push({
        type: "asi",
        decisionId: `${classEntry.sourceId}-level-${level}-asi`,
        classRef: classEntry.ref,
        classLevel: level,
        count: ASI_2014_RULE_PROFILE.pickLimit,
        ruleProfile: ASI_2014_RULE_PROFILE,
        required: true,
        allowsFeatAlternative: !this.#profile.asiAndFeatAtAsiLevels,
        reason: "ability-score-improvement"
      });

      if (this.#profile.asiAndFeatAtAsiLevels) {
        decisions.push({
          type: "feat",
          decisionId: `${classEntry.sourceId}-level-${level}-feat`,
          classRef: classEntry.ref,
          classLevel: level,
          required: true,
          options: this.getAvailableFeats(),
          campaignRule: "asiAndFeatAtAsiLevels",
          reason: "campaign-asi-plus-feat"
        });
      }
    }

    return decisions.map((entry) => cloneJson(entry));
  }

  /**
   * Returns spells granted by race/background/subclass/feat choices.
   * This deliberately excludes general spellbook management.
   */
  getGrantedSpells(grantRef, options = {}) {
    const ref = stripAnchor(grantRef);
    const sourceId = stripJsonExtension(ref);
    const grants = this.#index.grantsByRef.get(ref)
      ?? this.#index.grantsByRef.get(sourceId)
      ?? [];

    return grants
      .filter((grant) => options.includeBlocked || grant.type !== "spell" || this.#isSourceAllowed(grant, { kind: "spell" }))
      .map((grant) => ({
        ...grant,
        blocked: grant.type === "spell" && !this.#isSourceAllowed(grant, { kind: "spell" }),
        blockedReason: grant.type === "spell" && !this.#isSourceAllowed(grant, { kind: "spell" })
          ? this.#getSourceBlockedReason(grant)
          : ""
      }))
      .map((entry) => cloneJson(entry));
  }

  /**
   * Returns normalized class features unlocked at a class level.
   */
  getClassFeaturesForLevel(classRef, classLevel, options = {}) {
    const resolvedClass = this.#resolveRef(classRef);
    const level = Number(classLevel ?? 0);
    const features = this.#index.classFeaturesByClassRef.get(resolvedClass?.ref ?? stripAnchor(classRef)) ?? [];

    return features
      .filter((feature) => feature.level === level)
      .map((feature) => ({
        ...feature,
        blocked: !this.#isSourceAllowed(feature, { kind: "classFeature" }),
        blockedReason: this.#isSourceAllowed(feature, { kind: "classFeature" })
          ? ""
          : this.#getSourceBlockedReason(feature)
      }))
      .filter((feature) => options.includeBlocked || !feature.blocked)
      .map((entry) => cloneJson(entry));
  }

  /**
   * Returns normalized subclass features unlocked at a class level.
   */
  getSubclassFeaturesForLevel(subclassRef, classLevel, options = {}) {
    const resolvedSubclass = this.#resolveRef(subclassRef);
    const level = Number(classLevel ?? 0);
    const features = this.#index.subclassFeaturesBySubclassRef.get(resolvedSubclass?.ref ?? stripAnchor(subclassRef)) ?? [];

    return features
      .filter((feature) => feature.level === level)
      .map((feature) => ({
        ...feature,
        blocked: !this.#isSourceAllowed(feature, { kind: "subclassFeature" }),
        blockedReason: this.#isSourceAllowed(feature, { kind: "subclassFeature" })
          ? ""
          : this.#getSourceBlockedReason(feature)
      }))
      .filter((feature) => options.includeBlocked || !feature.blocked)
      .map((entry) => cloneJson(entry));
  }

  /**
   * Resolves a normalized rules entity by file ref or source id.
   */
  getRuleEntity(ref) {
    const entity = this.#resolveRef(ref);
    return entity ? cloneJson(entity) : null;
  }

  /**
   * Reports whether a source or normalized entity is legal under the active profile.
   */
  isSourceAllowed(entityOrSource, context = {}) {
    return this.#isSourceAllowed(entityOrSource, context);
  }

  /**
   * Provides normalized counts for diagnostics and smoke tests.
   */
  getRuleIndexSummary() {
    return {
      source: this.#index.source,
      ancestries: this.#filterAllowed(this.#index.ancestries).length,
      backgrounds: this.#filterAllowed(this.#index.backgrounds).length,
      classes: this.#filterAllowed(this.#index.classes).length,
      subclasses: this.#filterAllowed(this.#index.subclasses).length,
      feats: this.#filterAllowed(this.#index.feats).length,
      spells: this.#filterAllowed(this.#index.spells).length,
      total: {
        ancestries: this.#index.ancestries.length,
        backgrounds: this.#index.backgrounds.length,
        classes: this.#index.classes.length,
        subclasses: this.#index.subclasses.length,
        feats: this.#index.feats.length,
        spells: this.#index.spells.length
      }
    };
  }

  /**
   * Provides a small serializable summary for app shell diagnostics.
   */
  describeProfile() {
    return {
      ruleset: this.#profile.ruleset,
      allowedSources: [...this.#profile.allowedSources],
      asiAndFeatAtAsiLevels: this.#profile.asiAndFeatAtAsiLevels,
      index: this.getRuleIndexSummary()
    };
  }

  #buildIndex(rulesData = {}) {
    return this.#buildCatalogIndex(rulesData) ?? this.#buildLegacyIndex(rulesData);
  }

  #buildCatalogIndex(rulesData = {}) {
    const catalogs = getNormalizedCatalogs(rulesData);
    if (!catalogs || !hasBuilderCatalogData(catalogs)) {
      return null;
    }

    const index = createRulesIndex("normalized-catalog");
    const classFeatureLookup = this.#createCatalogEntityLookup(catalogs.features?.classFeatures);
    const subclassFeatureLookup = this.#createCatalogEntityLookup(catalogs.features?.subclassFeatures);
    const classesByRef = new Map();
    const subclassesByClassRef = new Map();

    for (const spell of toArray(catalogs.spells?.spells)) {
      this.#addEntity(index, "spells", this.#normalizeCatalogSpell(spell));
    }

    const spellIndex = createSpellLookup(index.spells);
    index.spellsByName = spellIndex.byName;
    index.spellsByNameAndSource = spellIndex.byNameAndSource;

    for (const race of toArray(catalogs.races?.races)) {
      this.#addEntity(index, "ancestries", this.#normalizeCatalogAncestry(race));
    }

    for (const background of toArray(catalogs.backgrounds?.backgrounds)) {
      this.#addEntity(index, "backgrounds", this.#normalizeCatalogBackground(background));
    }

    for (const feat of toArray(catalogs.feats?.feats)) {
      this.#addEntity(index, "feats", this.#normalizeCatalogFeat(feat));
    }

    for (const classRaw of toArray(catalogs.classes?.classes)) {
      const classEntry = this.#addEntity(index, "classes", this.#normalizeCatalogClass(classRaw));
      classesByRef.set(classEntry.ref, classEntry);
    }

    for (const subclassRaw of toArray(catalogs.classes?.subclasses)) {
      const classEntry = classesByRef.get(subclassRaw.classRef) ?? null;
      const subclass = this.#addEntity(index, "subclasses", this.#normalizeCatalogSubclass(subclassRaw, classEntry));
      const classRef = subclass.classRef;
      if (classRef) {
        const existing = subclassesByClassRef.get(classRef) ?? [];
        existing.push(subclass);
        subclassesByClassRef.set(classRef, existing);
      }
    }

    for (const classEntry of index.classes) {
      const classFeatures = toArray(classEntry.classFeatures)
        .map((feature) => this.#normalizeCatalogClassFeature(feature, classEntry, classFeatureLookup))
        .filter((feature) => feature.name && feature.level);
      index.classFeaturesByClassRef.set(classEntry.ref, classFeatures);
      for (const feature of classFeatures) {
        this.#addEntityRefs(index, feature);
      }

      const subclassRefs = toArray(classEntry.subclassRefs).map((entry) => normalizeString(entry.ref)).filter(Boolean);
      const fromClassRefs = subclassRefs
        .map((ref) => index.byRef.get(ref))
        .filter(Boolean);
      const fromClassGroup = subclassesByClassRef.get(classEntry.ref) ?? [];
      const merged = [...new Map([...fromClassGroup, ...fromClassRefs].map((subclass) => [subclass.ref, subclass])).values()];
      index.subclassesByClassRef.set(classEntry.ref, merged);
    }

    for (const subclass of index.subclasses) {
      const subclassFeatures = toArray(subclass.subclassFeatures)
        .map((feature) => this.#normalizeCatalogSubclassFeature(feature, subclass, subclassFeatureLookup))
        .filter((feature) => feature.name && feature.level);
      index.subclassFeaturesBySubclassRef.set(subclass.ref, subclassFeatures);
      for (const feature of subclassFeatures) {
        this.#addEntityRefs(index, feature);
      }
    }

    return index;
  }

  #buildLegacyIndex(rulesData = {}) {
    const index = createRulesIndex();
    const core = toObject(rulesData.core);
    const raceData = core.races ?? rulesData.races ?? {};
    const backgroundData = core.backgrounds ?? rulesData.backgrounds ?? {};
    const featData = core.feats ?? rulesData.feats ?? {};
    const classPayloads = toObject(rulesData.classes);
    const spellPayloads = toObject(rulesData.spells);

    for (const payload of Object.values(spellPayloads)) {
      for (const spell of toArray(payload?.spell)) {
        this.#addEntity(index, "spells", normalizeSpell(spell));
      }
    }

    const spellIndex = createSpellLookup(index.spells);
    index.spellsByName = spellIndex.byName;
    index.spellsByNameAndSource = spellIndex.byNameAndSource;
    const spellLookup = {
      byName: index.spellsByName,
      byNameAndSource: index.spellsByNameAndSource
    };

    for (const race of toArray(raceData.race)) {
      this.#addEntity(index, "ancestries", this.#normalizeAncestry(race, false, spellLookup));
    }

    for (const subrace of toArray(raceData.subrace)) {
      this.#addEntity(index, "ancestries", this.#normalizeAncestry(subrace, true, spellLookup));
    }

    for (const background of toArray(backgroundData.background)) {
      this.#addEntity(index, "backgrounds", this.#normalizeBackground(background, spellLookup));
    }

    for (const feat of toArray(featData.feat)) {
      this.#addEntity(index, "feats", this.#normalizeFeat(feat, spellLookup));
    }

    for (const payload of Object.values(classPayloads)) {
      this.#normalizeClassPayload(index, payload, spellLookup);
    }

    return index;
  }

  #createCatalogEntityLookup(entities = []) {
    const lookup = new Map();
    for (const entity of toArray(entities)) {
      const normalized = cloneJson(entity, {});
      normalized.sourceId = getCatalogSourceId(normalized);
      for (const key of getEntityLookupKeys(normalized)) {
        if (!lookup.has(key)) {
          lookup.set(key, normalized);
        }
      }
    }

    return lookup;
  }

  #lookupCatalogEntity(lookup, entity = {}) {
    for (const key of getEntityLookupKeys(entity)) {
      const found = lookup.get(key);
      if (found) {
        return found;
      }
    }

    return null;
  }

  #normalizeCatalogSpell(raw) {
    const spell = cloneJson(raw, {});
    return {
      ...spell,
      kind: "spell",
      sourceId: getCatalogSourceId(spell),
      school: normalizeCatalogSchool(spell.school),
      schoolDetails: isObject(spell.school) ? cloneJson(spell.school, null) : null
    };
  }

  #normalizeCatalogAncestry(raw) {
    const ancestry = cloneJson(raw, {});
    const grants = toObject(ancestry.grants);
    return {
      ...ancestry,
      catalogKind: normalizeString(ancestry.kind),
      kind: "ancestry",
      sourceId: getCatalogSourceId(ancestry),
      raceName: normalizeString(ancestry.raceName || ancestry.name),
      subraceName: normalizeString(ancestry.subraceName),
      isSubrace: Boolean(ancestry.isSubrace || normalizeString(ancestry.kind) === "subrace"),
      parentRef: normalizeString(ancestry.parentRef),
      raceSource: normalizeString(ancestry.raceSource),
      size: cloneJson(ancestry.size, []),
      speed: cloneJson(ancestry.speed, null),
      ability: cloneJson(ancestry.ability ?? grants.ability, []),
      traits: cloneJson(ancestry.traits, []),
      grants: cloneJson(grants, {}),
      choiceDefinitions: cloneJson(ancestry.choiceDefinitions, []),
      unsupportedChoiceDetections: cloneJson(ancestry.unsupportedChoiceDetections, [])
    };
  }

  #normalizeCatalogBackground(raw) {
    const background = cloneJson(raw, {});
    return {
      ...background,
      kind: "background",
      sourceId: getCatalogSourceId(background),
      grants: cloneJson(background.grants, {}),
      choiceDefinitions: cloneJson(background.choiceDefinitions, []),
      unsupportedChoiceDetections: cloneJson(background.unsupportedChoiceDetections, [])
    };
  }

  #normalizeCatalogFeat(raw) {
    const feat = cloneJson(raw, {});
    const grants = toObject(feat.grants);
    return {
      ...feat,
      kind: "feat",
      sourceId: getCatalogSourceId(feat),
      prerequisite: cloneJson(feat.prerequisite, []),
      ability: cloneJson(feat.ability ?? grants.ability, []),
      grants: cloneJson(grants, {})
    };
  }

  #normalizeCatalogClass(raw) {
    const classEntry = cloneJson(raw, {});
    const spellcasting = toObject(classEntry.spellcasting);
    const progression = toObject(classEntry.progression);
    const hitDieDetails = isObject(classEntry.hitDie) ? cloneJson(classEntry.hitDie, null) : null;
    const hitDie = normalizeString(
      hitDieDetails?.formula
      ?? classEntry.hitDie
      ?? (hitDieDetails?.faces ? `d${hitDieDetails.faces}` : "")
    );

    return {
      ...classEntry,
      kind: "class",
      sourceId: getCatalogSourceId(classEntry),
      hitDie,
      hitDieDetails,
      savingThrows: toArray(classEntry.savingThrows).map(normalizeString).filter(Boolean),
      spellcastingAbility: normalizeString(classEntry.spellcastingAbility ?? spellcasting.ability),
      casterProgression: normalizeString(classEntry.casterProgression ?? spellcasting.casterProgression),
      preparedSpells: normalizeString(classEntry.preparedSpells ?? spellcasting.preparedSpells),
      cantripProgression: cloneJson(classEntry.cantripProgression ?? progression.cantripProgression, []),
      spellsKnownProgression: cloneJson(
        classEntry.spellsKnownProgression
        ?? progression.spellsKnownProgression
        ?? progression.spellsKnownProgressionFixed,
        []
      ),
      startingProficiencies: cloneJson(classEntry.startingProficiencies, {}),
      multiclassing: cloneJson(classEntry.multiclassing, null),
      classFeatures: cloneJson(classEntry.classFeatures, []),
      subclassRefs: cloneJson(classEntry.subclassRefs, [])
    };
  }

  #normalizeCatalogSubclass(raw, classEntry = null) {
    const subclass = cloneJson(raw, {});
    const classRef = normalizeString(subclass.classRef || classEntry?.ref);
    const featureLevels = toArray(subclass.featureLevels).map(Number).filter(Boolean);

    return {
      ...subclass,
      kind: "subclass",
      sourceId: getCatalogSourceId(subclass),
      shortName: normalizeString(subclass.shortName || subclass.name),
      className: normalizeString(subclass.className || classEntry?.name),
      classSource: normalizeString(subclass.classSource || classEntry?.source),
      classRef,
      unlockAtClassLevel: Number(subclass.unlockAtClassLevel ?? classEntry?.subclassUnlockLevel ?? 0),
      featureLevels: featureLevels.sort((left, right) => left - right),
      subclassFeatures: cloneJson(subclass.subclassFeatures, []),
      grants: cloneJson(subclass.grants, { spells: [] }),
      classFeatureRefs: toArray(classEntry?.classFeatures)
        .filter((feature) => feature.gainSubclassFeature)
        .map((feature) => normalizeString(feature.ref))
        .filter(Boolean)
    };
  }

  #normalizeCatalogClassFeature(raw, classEntry, detailLookup) {
    const detail = this.#lookupCatalogEntity(detailLookup, raw) ?? {};
    const feature = {
      ...cloneJson(detail, {}),
      ...cloneJson(raw, {})
    };
    const name = normalizeString(feature.name);
    const ref = normalizeString(feature.ref) || `${classEntry.ref}#${name}`;

    return {
      ...feature,
      kind: "classFeature",
      name,
      source: normalizeString(feature.source || classEntry.source),
      className: normalizeString(feature.className || classEntry.name),
      classSource: normalizeString(feature.classSource || classEntry.source),
      classRef: normalizeString(feature.classRef || classEntry.ref),
      sourceId: getCatalogSourceId({ ...feature, ref }),
      ref,
      level: Number(feature.level || 0),
      optional: Boolean(feature.optional),
      gainSubclassFeature: Boolean(feature.gainSubclassFeature),
      tableDisplayName: normalizeString(feature.tableDisplayName)
    };
  }

  #normalizeCatalogSubclassFeature(raw, subclass, detailLookup) {
    const detail = this.#lookupCatalogEntity(detailLookup, raw) ?? {};
    const feature = {
      ...cloneJson(detail, {}),
      ...cloneJson(raw, {})
    };
    const name = normalizeString(feature.name);
    const ref = normalizeString(feature.ref) || `${subclass.ref}#${name}`;

    return {
      ...feature,
      kind: "subclassFeature",
      name,
      source: normalizeString(feature.source || subclass.source),
      className: normalizeString(feature.className || subclass.className),
      classSource: normalizeString(feature.classSource || subclass.classSource),
      classRef: normalizeString(feature.classRef || subclass.classRef),
      subclassName: normalizeString(feature.subclassName || subclass.name),
      subclassShortName: normalizeString(feature.subclassShortName || subclass.shortName),
      subclassSource: normalizeString(feature.subclassSource || subclass.source),
      subclassRef: normalizeString(feature.subclassRef || subclass.ref),
      sourceId: getCatalogSourceId({ ...feature, ref }),
      ref,
      level: Number(feature.level || 0)
    };
  }

  #normalizeAncestry(raw, isSubrace, spellLookup) {
    const name = getAncestryDisplay(raw, isSubrace);
    const refName = getAncestryRefName(raw, isSubrace);
    const ref = makeRef("race", refName);
    const parentRef = isSubrace && raw.raceName ? makeRef("race", raw.raceName) : "";
    const grants = {
      ...normalizeGrantCollections(raw),
      spells: normalizeAdditionalSpells(raw.additionalSpells, spellLookup)
    };

    return {
      kind: "ancestry",
      name,
      raceName: normalizeString(raw.raceName || raw.name),
      subraceName: isSubrace ? normalizeString(raw.name || "Variant") : "",
      isSubrace: Boolean(isSubrace),
      parentRef,
      source: normalizeString(raw.source),
      raceSource: normalizeString(raw.raceSource),
      sourceId: stripJsonExtension(ref),
      ref,
      page: raw.page ?? null,
      size: cloneJson(raw.size, []),
      speed: cloneJson(raw.speed, null),
      ability: cloneJson(raw.ability, []),
      traits: toArray(raw.traitTags).map(normalizeString).filter(Boolean),
      grants
    };
  }

  #normalizeBackground(raw, spellLookup) {
    const name = normalizeString(raw.name);
    const ref = makeRef("background", name);
    const grants = {
      ...normalizeGrantCollections(raw),
      spells: normalizeAdditionalSpells(raw.additionalSpells, spellLookup)
    };

    return {
      kind: "background",
      name,
      source: normalizeString(raw.source),
      sourceId: stripJsonExtension(ref),
      ref,
      page: raw.page ?? null,
      feature: extractBackgroundFeatureName(raw.entries),
      grants
    };
  }

  #normalizeFeat(raw, spellLookup) {
    const name = normalizeString(raw.name);
    const ref = makeRef("feat", name);
    const grants = {
      ...normalizeGrantCollections(raw),
      spells: normalizeAdditionalSpells(raw.additionalSpells, spellLookup)
    };

    return {
      kind: "feat",
      name,
      source: normalizeString(raw.source),
      sourceId: stripJsonExtension(ref),
      ref,
      page: raw.page ?? null,
      prerequisite: cloneJson(raw.prerequisite, []),
      ability: cloneJson(raw.ability, []),
      grants
    };
  }

  #normalizeClassPayload(index, payload, spellLookup) {
    const classFeatureLookup = createFeatureLookup(payload?.classFeature);
    const subclassFeatureLookup = createSubclassFeatureLookup(payload?.subclassFeature);
    const rawSubclassFeatures = toArray(payload?.subclassFeature);
    const classEntries = toArray(payload?.class);
    const subclasses = toArray(payload?.subclass);

    for (const classRaw of classEntries) {
      const classEntry = this.#addEntity(index, "classes", this.#normalizeClass(classRaw));

      const classFeatures = this.#normalizeClassFeatures(classRaw, classEntry, classFeatureLookup);
      index.classFeaturesByClassRef.set(classEntry.ref, classFeatures);
      for (const feature of classFeatures) {
        index.byRef.set(feature.ref, feature);
      }

      const subclassEntries = subclasses
        .filter((subclass) => normalizeString(subclass.className) === classEntry.name)
        .map((subclass) => this.#normalizeSubclass(subclass, classEntry, spellLookup, classFeatures));

      const storedSubclassEntries = [];
      for (const subclass of subclassEntries) {
        const storedSubclass = this.#addEntity(index, "subclasses", subclass);
        storedSubclassEntries.push(storedSubclass);
        const subclassFeatures = this.#normalizeSubclassFeatures(storedSubclass, subclassFeatureLookup, rawSubclassFeatures);
        index.subclassFeaturesBySubclassRef.set(storedSubclass.ref, subclassFeatures);
        for (const feature of subclassFeatures) {
          index.byRef.set(feature.ref, feature);
        }
      }
      index.subclassesByClassRef.set(classEntry.ref, storedSubclassEntries);
    }
  }

  #normalizeClass(raw) {
    const name = normalizeString(raw.name);
    const ref = makeRef("class", name);
    const startingProficiencies = normalizeStartingProficiencies(raw.startingProficiencies);

    return {
      kind: "class",
      name,
      source: normalizeString(raw.source),
      sourceId: stripJsonExtension(ref),
      ref,
      page: raw.page ?? null,
      hitDie: raw.hd?.faces ? `d${raw.hd.faces}` : "",
      savingThrows: toArray(raw.proficiency).map(normalizeString).filter(Boolean),
      spellcastingAbility: normalizeString(raw.spellcastingAbility),
      casterProgression: normalizeString(raw.casterProgression),
      preparedSpells: normalizeString(raw.preparedSpells),
      cantripProgression: cloneJson(raw.cantripProgression, []),
      spellsKnownProgression: cloneJson(raw.spellsKnownProgression ?? raw.spellsKnownProgressionFixed, []),
      startingProficiencies,
      multiclassing: cloneJson(raw.multiclassing, null),
      subclassTitle: normalizeString(raw.subclassTitle),
      subclassUnlockLevel: this.#getSubclassUnlockLevel(raw.classFeatures)
    };
  }

  #normalizeClassFeatures(classRaw, classEntry, featureLookup) {
    return toArray(classRaw.classFeatures)
      .map((entry) => {
        const refString = typeof entry === "string" ? entry : entry?.classFeature;
        const parsed = parseFeatureRefString(refString);
        const source = parsed.source || parsed.classSource || classEntry.source;
        const detail = featureLookup.get(featureKey({ ...parsed, source }))
          ?? featureLookup.get(featureKey({ ...parsed, source: "" }))
          ?? {};
        const name = normalizeString(detail.name || parsed.name);
        const level = Number(detail.level || parsed.level || 0);

        return {
          kind: "classFeature",
          name,
          source: normalizeString(detail.source || source),
          className: classEntry.name,
          classSource: classEntry.source,
          classRef: classEntry.ref,
          sourceId: `${classEntry.sourceId}-${slugify(name)}`,
          ref: `${classEntry.ref}#${name}`,
          level,
          optional: Boolean(detail.isClassFeatureVariant),
          gainSubclassFeature: Boolean(entry?.gainSubclassFeature),
          tableDisplayName: normalizeString(entry?.tableDisplayName)
        };
      })
      .filter((feature) => feature.name && feature.level);
  }

  #normalizeSubclass(raw, classEntry, spellLookup, classFeatures) {
    const shortName = normalizeString(raw.shortName || raw.name);
    const ref = makeRef("subclass", `${classEntry.name}-${shortName}`);
    const featureRefs = toArray(raw.subclassFeatures);
    const featureLevels = featureRefs
      .map((featureRef) => parseSubclassFeatureRefString(featureRef).level)
      .filter(Boolean);
    const unlockAtClassLevel = Math.min(
      ...featureLevels,
      classEntry.subclassUnlockLevel || Number.POSITIVE_INFINITY
    );
    const grants = {
      spells: normalizeAdditionalSpells(raw.additionalSpells, spellLookup)
    };

    return {
      kind: "subclass",
      name: normalizeString(raw.name),
      shortName,
      source: normalizeString(raw.source),
      className: classEntry.name,
      classSource: classEntry.source,
      classRef: classEntry.ref,
      sourceId: stripJsonExtension(ref),
      ref,
      page: raw.page ?? null,
      unlockAtClassLevel: Number.isFinite(unlockAtClassLevel) ? unlockAtClassLevel : classEntry.subclassUnlockLevel,
      featureLevels: [...new Set(featureLevels)].sort((a, b) => a - b),
      subclassFeatures: featureRefs.map(normalizeString).filter(Boolean),
      grants,
      classFeatureRefs: classFeatures
        .filter((feature) => feature.gainSubclassFeature)
        .map((feature) => feature.ref)
    };
  }

  #normalizeSubclassFeatures(subclass, featureLookup, rawSubclassFeatures = []) {
    const fromRefs = subclass.subclassFeatures
      .map((featureRef) => {
        const parsed = parseSubclassFeatureRefString(featureRef);
        const source = parsed.source || parsed.subclassSource || subclass.source;
        const detail = featureLookup.get(subclassFeatureKey({ ...parsed, source }))
          ?? featureLookup.get(subclassFeatureKey({ ...parsed, source: "" }))
          ?? {};
        const name = normalizeString(detail.name || parsed.name);
        const level = Number(detail.level || parsed.level || 0);

        return {
          kind: "subclassFeature",
          name,
          source: normalizeString(detail.source || source),
          className: subclass.className,
          classSource: subclass.classSource,
          classRef: subclass.classRef,
          subclassName: subclass.name,
          subclassShortName: subclass.shortName,
          subclassSource: subclass.source,
          subclassRef: subclass.ref,
          sourceId: `${subclass.sourceId}-${slugify(name)}`,
          ref: `${subclass.ref}#${name}`,
          level
        };
      })
      .filter((feature) => feature.name && feature.level);

    const fromDetails = toArray(rawSubclassFeatures)
      .filter((feature) => normalizeString(feature.className) === subclass.className)
      .filter((feature) => normalizeString(feature.subclassShortName) === subclass.shortName)
      .map((detail) => {
        const name = normalizeString(detail.name);
        const level = Number(detail.level || 0);

        return {
          kind: "subclassFeature",
          name,
          source: normalizeString(detail.source || subclass.source),
          className: subclass.className,
          classSource: normalizeString(detail.classSource || subclass.classSource),
          classRef: subclass.classRef,
          subclassName: subclass.name,
          subclassShortName: subclass.shortName,
          subclassSource: normalizeString(detail.subclassSource || subclass.source),
          subclassRef: subclass.ref,
          sourceId: `${subclass.sourceId}-${slugify(name)}`,
          ref: `${subclass.ref}#${name}`,
          level
        };
      })
      .filter((feature) => feature.name && feature.level);

    const byKey = new Map();
    for (const feature of [...fromRefs, ...fromDetails]) {
      const key = `${feature.name.toLowerCase()}|${feature.level}|${normalizeSource(feature.source)}`;
      if (!byKey.has(key)) {
        byKey.set(key, feature);
      }
    }

    return [...byKey.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }

  #getSubclassUnlockLevel(classFeatures = []) {
    const levels = toArray(classFeatures)
      .filter((feature) => isObject(feature) && feature.gainSubclassFeature)
      .map((feature) => parseFeatureRefString(feature.classFeature).level)
      .filter(Boolean);

    return levels.length ? Math.min(...levels) : 0;
  }

  #addEntity(index, collectionName, entity) {
    if (!entity?.ref) {
      return entity;
    }

    let normalized = entity;
    if (index.byRef.has(normalized.ref)) {
      const ref = withSourceSuffix(normalized.ref, normalized.source);
      normalized = {
        ...normalized,
        ref,
        sourceId: stripJsonExtension(ref)
      };
    }

    index[collectionName].push(normalized);
    this.#addEntityRefs(index, normalized);

    if (normalized.grants?.spells?.length) {
      index.grantsByRef.set(normalized.ref, normalized.grants.spells);
      index.grantsByRef.set(normalized.sourceId, normalized.grants.spells);
    }

    return normalized;
  }

  #addEntityRefs(index, entity) {
    for (const key of getEntityLookupKeys(entity)) {
      index.byRef.set(key, entity);
    }
  }

  #resolveRef(ref) {
    const original = normalizeString(ref);
    const normalized = stripAnchor(original);
    const sourceId = stripJsonExtension(normalized);
    return this.#index.byRef.get(original)
      ?? this.#index.byRef.get(stripJsonExtension(original))
      ?? this.#index.byRef.get(normalized)
      ?? this.#index.byRef.get(sourceId)
      ?? null;
  }

  #filterAllowed(entries) {
    return entries.filter((entry) => this.#isSourceAllowed(entry));
  }

  #isSourceAllowed(entityOrSource, context = {}) {
    const policy = this.#profile.sourcePolicy;

    if (typeof policy === "function") {
      const result = policy(entityOrSource, {
        ...context,
        profile: this.#profile
      });
      if (typeof result === "boolean") {
        return result;
      }
    }

    if (policy === "all") {
      return true;
    }

    const sources = getEntitySources(entityOrSource).map(normalizeSource).filter(Boolean);
    const blockedSources = sourceSetFrom(getPolicyBlockedSources(policy));
    if (sources.some((source) => blockedSources.has(source))) {
      return false;
    }

    if (isObject(policy) && policy.allowAll) {
      return true;
    }

    const allowedSources = sourceSetFrom(getPolicySources(policy, this.#profile));
    if (!allowedSources.size || !sources.length) {
      return true;
    }

    return sources.some((source) => allowedSources.has(source));
  }

  #getSourceBlockedReason(entityOrSource) {
    const sources = getEntitySources(entityOrSource).filter(Boolean);
    return sources.length
      ? `Source ${sources.join(", ")} is not allowed by the active rules profile.`
      : "Source is not allowed by the active rules profile.";
  }
}
