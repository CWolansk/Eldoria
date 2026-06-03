import { ABILITY_ORDER, deepClone, normalizeCharacter } from "../shared/character-state.js";
import {
  ASI_2014_RULE_PROFILE,
  addAbilityMaps,
  createAsiChoiceModelFromState,
  createBoundedChoiceModel,
  createEmptyAbilityMap,
  getAbilityIncreasesFromValue
} from "./character-builder-rules.js";

export const BUILDER_SCHEMA_VERSION = "builder-decisions-v1";

const IDENTITY_CHOICE_SCOPES = new Set(["race", "background", "subclassFeature"]);
const PICK_DECISION_TYPES = new Set(["skill", "tool", "language"]);
const REQUIREMENT_DECISION_TYPES = new Set(["class", "skill", "tool", "language", "subclass", "asi", "feat"]);

const ENTITY_METHODS = {
  ancestry: "getAvailableAncestries",
  race: "getAvailableAncestries",
  background: "getAvailableBackgrounds",
  class: "getAvailableClasses",
  feat: "getAvailableFeats"
};

const ENTITY_PREFIXES = {
  ancestry: "race",
  race: "race",
  background: "background",
  class: "class",
  feat: "feat"
};

function cloneJson(value, fallback = null) {
  if (value == null) {
    return deepClone(fallback);
  }

  return deepClone(value);
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toInputArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
}

function toObject(value) {
  return isObject(value) ? value : {};
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function toPositiveInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }

  return Math.trunc(number);
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

function sourceIdFromRef(value) {
  return stripJsonExtension(stripAnchor(value));
}

function makeRef(prefix, value) {
  const slug = slugify(value);
  return slug ? `${prefix}-${slug}.json` : "";
}

function refFromSourceId(sourceId) {
  const id = stripJsonExtension(sourceId);
  return id ? `${id}.json` : "";
}

function keyForRef(value) {
  return sourceIdFromRef(value).toLowerCase();
}

function makeChoiceId(parts = []) {
  const slug = slugify(toArray(parts).filter(Boolean).join("-"));
  return slug ? `fc-${slug}` : "fc-builder-choice";
}

function arraysEqual(a, b) {
  const left = toArray(a);
  const right = toArray(b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalizeChoiceRecord(choice) {
  const base = toObject(choice);
  return {
    ...base,
    choiceId: String(base.choiceId ?? ""),
    type: String(base.type ?? ""),
    value: cloneJson(base.value, {})
  };
}

function getChoiceDefinitionOptionTokens(option = {}) {
  return [
    option.value,
    option.ref,
    option.name,
    option.label,
    option.sourceId
  ].map((value) => normalizeString(value).toLowerCase()).filter(Boolean);
}

function getChoiceDefinitionOptionKey(option = {}) {
  return normalizeString(option.value || option.ref || option.name || option.label || option.sourceId).toLowerCase();
}

function describeMatchedChoiceOption(option = {}, matchedTokens = []) {
  return {
    value: normalizeString(option.value || option.ref || option.name || option.label),
    label: normalizeString(option.label || option.name || option.value || option.ref),
    ref: normalizeString(option.ref),
    matchedTokens: [...matchedTokens]
  };
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

function findAbilityChoiceOption(definition = {}, ability = "") {
  const token = normalizeString(ability).toLowerCase();
  return toArray(definition.options)
    .find((option) => getChoiceDefinitionOptionTokens(option).includes(token)) ?? null;
}

function getAbilityPatternIncreaseGroup(pattern = {}, increase = {}, groupUsage = new Map()) {
  const groupId = normalizeString(increase.groupId || increase.group);
  if (groupId) {
    return toArray(pattern.groups).find((group) => normalizeString(group.id) === groupId) ?? null;
  }

  const amount = Number(increase.amount ?? 0);
  const candidates = toArray(pattern.groups)
    .filter((group) => Number(group.amount ?? 1) === amount);
  return candidates.find((group) => {
    const id = normalizeString(group.id);
    const used = Number(groupUsage.get(id) ?? 0);
    return used < Math.max(1, Number(group.count ?? 1));
  }) ?? candidates[0] ?? null;
}

function evaluateAbilityPatternChoiceDefinition(definition, choice) {
  const patterns = getAbilityPatternDefinitions(definition);
  const savedValue = toObject(choice?.value);
  const savedPattern = normalizeString(savedValue.pattern);
  const pattern = patterns.find((entry) => entry.value === savedPattern) ?? patterns[0] ?? null;
  const grouped = new Map();
  const matchedOptions = [];
  const selectedValues = [];
  const invalidTokens = [];
  const duplicateAbilities = [];
  let missingCount = 0;
  let excessCount = 0;

  if (!pattern) {
    return {
      definition: cloneJson(definition, {}),
      choice: choice ? cloneJson(choice, {}) : null,
      selectedValues: [],
      matchedValues: [],
      matchedOptions: [],
      invalidValues: [],
      required: Boolean(definition?.required),
      resolved: false,
      missingCount: 1,
      blockedReason: `Choice "${definition?.label || definition?.choiceId}" has no normalized ability score patterns.`
    };
  }

  const groupUsage = new Map();
  for (const increase of toArray(savedValue.increases)) {
    const ability = normalizeString(increase?.ability).toLowerCase();
    const increasePattern = normalizeString(increase?.pattern);
    if (increasePattern && increasePattern !== pattern.value) {
      continue;
    }

    const option = findAbilityChoiceOption(definition, ability);
    const group = getAbilityPatternIncreaseGroup(pattern, increase, groupUsage);
    if (!option || !group) {
      invalidTokens.push(ability || normalizeString(increase?.groupId || increase?.group || increase?.amount));
      continue;
    }

    const groupId = normalizeString(group.id);
    groupUsage.set(groupId, Number(groupUsage.get(groupId) ?? 0) + 1);
    const entry = {
      ...describeMatchedChoiceOption(option, [ability]),
      groupId,
      amount: Number(group.amount ?? increase?.amount ?? 1),
      pattern: pattern.value
    };
    const previous = grouped.get(groupId) ?? [];
    grouped.set(groupId, [...previous, entry]);
    matchedOptions.push(entry);
    selectedValues.push(`${groupId}:${entry.value}`);
  }

  for (const group of toArray(pattern.groups)) {
    const groupId = normalizeString(group.id);
    const requiredCount = Math.max(1, Number(group.count ?? 1));
    const entries = grouped.get(groupId) ?? [];
    missingCount += Math.max(0, requiredCount - entries.length);
    excessCount += Math.max(0, entries.length - requiredCount);
  }

  if (pattern.distinct !== false) {
    const seenAbilities = new Set();
    for (const entry of matchedOptions) {
      const ability = normalizeString(entry.value).toLowerCase();
      if (seenAbilities.has(ability)) {
        duplicateAbilities.push(ability);
      }
      seenAbilities.add(ability);
    }
  }

  const blockedReason = invalidTokens.length
    ? `Choice "${definition?.label || definition?.choiceId}" has unsupported saved value(s): ${invalidTokens.join(", ")}. Pick one of the normalized options.`
    : duplicateAbilities.length
      ? `Choice "${definition?.label || definition?.choiceId}" requires different abilities for each increase.`
      : excessCount
        ? `Choice "${definition?.label || definition?.choiceId}" has too many saved ability increases for ${pattern.label || pattern.value}.`
        : "";

  return {
    definition: cloneJson(definition, {}),
    choice: choice ? cloneJson(choice, {}) : null,
    selectedValues,
    matchedValues: matchedOptions.map((option) => option.value),
    matchedOptions,
    invalidValues: [...new Set(invalidTokens)],
    required: Boolean(definition?.required),
    resolved: missingCount === 0 && !blockedReason,
    missingCount,
    blockedReason
  };
}

function collectChoiceValueTokens(value, output = []) {
  if (value == null || value === "") {
    return output;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.push(normalizeString(value));
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectChoiceValueTokens(item, output);
    }
    return output;
  }

  if (!isObject(value)) {
    return output;
  }

  for (const key of [
    "value",
    "ref",
    "name",
    "skill",
    "tool",
    "language",
    "spell",
    "cantrip",
    "feat",
    "ancestry",
    "revelation",
    "specialty",
    "scam",
    "lifeOfSeclusion"
  ]) {
    if (value[key] != null) {
      collectChoiceValueTokens(value[key], output);
    }
  }

  for (const key of ["skills", "tools", "languages", "spells", "cantrips", "feats", "picks"]) {
    collectChoiceValueTokens(value[key], output);
  }

  for (const increase of toArray(value.increases)) {
    collectChoiceValueTokens(increase?.ability, output);
  }

  return output;
}

function getChoiceRecordValueTokens(choice) {
  return [...new Set(collectChoiceValueTokens(choice?.value).map((value) => normalizeString(value).toLowerCase()).filter(Boolean))];
}

function evaluateIdentityChoiceDefinition(definition, choice) {
  if (definition?.control === "ability-score-pattern") {
    return evaluateAbilityPatternChoiceDefinition(definition, choice);
  }

  const requiredCount = Math.max(1, Number(definition?.count ?? 1));
  const selectedTokens = getChoiceRecordValueTokens(choice);
  const options = toArray(definition?.options);
  const matchedByOption = new Map();
  const invalidTokens = [];

  for (const token of selectedTokens) {
    const matchedOption = options.find((option) => getChoiceDefinitionOptionTokens(option).includes(token));

    if (!matchedOption) {
      invalidTokens.push(token);
      continue;
    }

    const key = getChoiceDefinitionOptionKey(matchedOption);
    const previous = matchedByOption.get(key) ?? {
      option: matchedOption,
      tokens: []
    };
    previous.tokens.push(token);
    matchedByOption.set(key, previous);
  }

  const matchedOptions = [...matchedByOption.values()]
    .map((entry) => describeMatchedChoiceOption(entry.option, entry.tokens));
  const missingCount = Math.max(0, requiredCount - matchedOptions.length);
  const excessCount = Math.max(0, matchedOptions.length - requiredCount);
  const blockedReason = invalidTokens.length
    ? `Choice "${definition?.label || definition?.choiceId}" has unsupported saved value(s): ${invalidTokens.join(", ")}. Pick one of the normalized options.`
    : excessCount
      ? `Choice "${definition?.label || definition?.choiceId}" has ${matchedOptions.length} saved options but requires ${requiredCount}.`
    : "";

  return {
    definition: cloneJson(definition, {}),
    choice: choice ? cloneJson(choice, {}) : null,
    selectedValues: selectedTokens,
    matchedValues: matchedOptions.map((option) => option.value),
    matchedOptions,
    invalidValues: [...new Set(invalidTokens)],
    required: Boolean(definition?.required),
    resolved: missingCount === 0 && !blockedReason,
    missingCount,
    blockedReason
  };
}

function normalizeDecision(decision) {
  const base = toObject(decision);
  return {
    ...base,
    type: String(base.type ?? ""),
    value: cloneJson(base.value, base.value ?? null)
  };
}

function normalizeLevelPlanEntry(entry, index) {
  const base = toObject(entry);
  return {
    ...base,
    characterLevel: toPositiveInteger(base.characterLevel, index + 1),
    classRef: String(base.classRef ?? ""),
    classLevel: toPositiveInteger(base.classLevel, 1),
    decisions: toArray(base.decisions).map(normalizeDecision)
  };
}

function normalizePendingChoice(choice) {
  const base = toObject(choice);
  return {
    ...base,
    choiceId: String(base.choiceId ?? ""),
    type: String(base.type ?? ""),
    classRef: String(base.classRef ?? ""),
    unlockAtClassLevel: toPositiveInteger(base.unlockAtClassLevel, 0),
    blockedReason: String(base.blockedReason ?? "")
  };
}

function normalizeAbilityScoreChoices(input = {}) {
  const base = toObject(input);
  const rawScores = toObject(base.scores ?? base.value ?? input);
  const scores = {};

  for (const ability of ABILITY_ORDER) {
    const score = Number(rawScores[ability]);
    if (Number.isFinite(score)) {
      scores[ability] = score;
    }
  }

  return {
    ...base,
    method: String(base.method ?? "manual"),
    characterLevel: toPositiveInteger(base.characterLevel, 1),
    scores
  };
}

function normalizeAbilityIncreases(increases = []) {
  const amountPerPick = Number(ASI_2014_RULE_PROFILE.amountPerPick ?? 1) || 1;
  const normalized = toArray(increases)
    .map((increase) => {
      const ability = String(increase?.ability ?? increase ?? "").toLowerCase();
      const amount = increase && typeof increase === "object"
        ? Number(increase.amount ?? amountPerPick)
        : amountPerPick;
      const base = toObject(increase);
      return {
        ...base,
        ability,
        amount
      };
    })
    .filter((increase) => ABILITY_ORDER.includes(increase.ability) && Number.isFinite(increase.amount) && increase.amount !== 0);
  const byAbility = new Map();

  for (const increase of normalized) {
    const existing = byAbility.get(increase.ability);
    byAbility.set(increase.ability, existing
      ? { ...existing, amount: existing.amount + increase.amount }
      : increase);
  }

  return [...byAbility.values()];
}

function getEntityAbilityRules(entity) {
  return toArray(entity?.ability ?? entity?.grants?.ability);
}

function addFixedAbilityRule(map, rule) {
  if (!isObject(rule) || rule.choose) {
    return map;
  }

  for (const ability of ABILITY_ORDER) {
    const amount = Number(rule[ability] ?? 0);
    if (Number.isFinite(amount)) {
      map[ability] += amount;
    }
  }

  return map;
}

function sumFixedAbilityRules(entities = []) {
  return toArray(entities)
    .flatMap(getEntityAbilityRules)
    .reduce(addFixedAbilityRule, createEmptyAbilityMap());
}

function getRuleEntity(rulesAdapter, ref) {
  return ref && typeof rulesAdapter?.getRuleEntity === "function"
    ? rulesAdapter.getRuleEntity(ref)
    : null;
}

function getAncestryLineage(rulesAdapter, ancestryRef) {
  const ancestry = getRuleEntity(rulesAdapter, ancestryRef);
  if (!ancestry) {
    return [];
  }

  if (!ancestry.parentRef) {
    return [ancestry];
  }

  const parent = getRuleEntity(rulesAdapter, ancestry.parentRef);
  return parent ? [parent, ancestry] : [ancestry];
}

function getBaseAbilityScoreMap(dto = {}) {
  const scores = toObject(dto.abilityScoreChoices?.scores);
  return Object.fromEntries(ABILITY_ORDER.map((ability) => {
    const value = Number(scores[ability]);
    return [ability, Number.isFinite(value) ? value : 0];
  }));
}

function getAsiDecisionIncreases(entry = {}) {
  return toArray(entry.decisions)
    .filter((decision) => decision.type === "asi")
    .flatMap((decision) => getAbilityIncreasesFromValue(decision.value));
}

function sumPriorAsi(levelPlan = [], beforeCharacterLevel = Number.POSITIVE_INFINITY) {
  return toArray(levelPlan)
    .filter((entry) => Number(entry.characterLevel ?? 0) < Number(beforeCharacterLevel))
    .flatMap(getAsiDecisionIncreases)
    .reduce((map, increase) => {
      map[increase.ability] += increase.amount;
      return map;
    }, createEmptyAbilityMap());
}

function getDecisionValuesForType(entry = {}, type) {
  return toArray(entry.decisions)
    .filter((decision) => decision.type === type || decision.type === `${type}s`)
    .flatMap((decision) => {
      const value = decision.value;
      if (Array.isArray(value)) {
        return value;
      }

      if (isObject(value)) {
        const pluralKey = `${type}s`;
        if (Array.isArray(value[pluralKey])) {
          return value[pluralKey];
        }

        if (Array.isArray(value.picks)) {
          return value.picks;
        }

        return value[type] ? [value[type]] : [];
      }

      return value == null || value === "" ? [] : [value];
    })
    .map((value) => normalizeString(value))
    .filter(Boolean);
}

function getClassSummary(entry = {}, rulesAdapter) {
  const classEntity = getRuleEntity(rulesAdapter, entry.classRef);
  return `${classEntity?.name || humanizeRef(entry.classRef)} ${entry.classLevel || ""}`.trim();
}

function normalizeSpellRef(spell = {}) {
  if (typeof spell === "string") {
    return {
      name: spell,
      source: "",
      level: null
    };
  }

  const base = toObject(spell);
  return {
    ...base,
    name: String(base.name ?? base.spell ?? ""),
    source: String(base.source ?? ""),
    level: base.level == null ? null : Number(base.level)
  };
}

function normalizeGrantedSpellChoice(choice = {}) {
  const base = toObject(choice);
  const value = cloneJson(base.value, {});
  const valueSpells = toArray(value?.spells);
  const spells = toArray(base.spells).length
    ? toArray(base.spells)
    : valueSpells.length
      ? valueSpells
      : value?.spell
        ? [value]
        : [];

  return {
    ...base,
    choiceId: String(base.choiceId ?? ""),
    type: String(base.type ?? "granted-spell"),
    sourceRef: String(base.sourceRef ?? ""),
    characterLevel: base.characterLevel == null ? null : toPositiveInteger(base.characterLevel, 0),
    classRef: String(base.classRef ?? ""),
    value,
    spells: spells.map(normalizeSpellRef).filter((spell) => spell.name)
  };
}

function normalizeProficiencyReplacement(input = {}) {
  const base = toObject(input);
  const rawValues = base.values ?? base.selectedValues ?? base.picks ?? base.value;
  const values = toInputArray(rawValues)
    .map((value) => normalizeString(value))
    .filter(Boolean);

  return {
    ...base,
    choiceId: String(base.choiceId ?? base.id ?? ""),
    category: String(base.category ?? "skill"),
    values
  };
}

function canonicalizeLevelPlan(levelPlan = []) {
  const entries = toArray(levelPlan)
    .map((entry, index) => ({
      ...normalizeLevelPlanEntry(entry, index),
      _originalIndex: index
    }))
    .sort((a, b) => a.characterLevel - b.characterLevel || a._originalIndex - b._originalIndex);

  const classLevelCounts = new Map();

  return entries.map((entry, index) => {
    const classRef = normalizeString(entry.classRef);
    const classKey = keyForRef(classRef);
    const classLevel = classKey
      ? Number(classLevelCounts.get(classKey) ?? 0) + 1
      : 0;

    if (classKey) {
      classLevelCounts.set(classKey, classLevel);
    }

    const canonical = {
      ...entry,
      characterLevel: index + 1,
      classRef,
      classLevel,
      decisions: toArray(entry.decisions).map(normalizeDecision)
    };

    delete canonical._originalIndex;
    return canonical;
  });
}

function dedupePendingChoices(choices = []) {
  const seen = new Set();
  const deduped = [];

  for (const choice of choices.map(normalizePendingChoice)) {
    const key = [
      choice.choiceId,
      choice.type,
      sourceIdFromRef(choice.classRef),
      choice.unlockAtClassLevel,
      choice.characterLevel ?? ""
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(choice);
  }

  return deduped;
}

function inferChoiceTypeFromValue(choice = {}) {
  const value = toObject(choice.value);
  const label = `${choice.feature ?? ""} ${choice.prompt ?? ""}`.toLowerCase();

  if (value.feat) return "feat";
  if (value.skills) return "skills";
  if (value.skill) return "skill";
  if (value.languages) return "languages";
  if (value.language) return "language";
  if (value.spells) return "spells";
  if (value.spell) return label.includes("cantrip") ? "cantrip" : "spell";
  if (value.increases) return "asi";
  if (value.specialty) return "specialty";
  if (value.deity) return "deity";
  if (value.instrument) return "instrument";
  if (value.origin) return "origin";
  if (value.scam) return "scam";
  if (/\b(archetype|circle|college|domain|oath|patron|subclass|tradition)\b/.test(label)) return "subclass";
  if (label.includes("ability score")) return "asi";

  return "choice";
}

function featureChoiceToChoiceRecord(choice = {}) {
  return normalizeChoiceRecord({
    choiceId: choice.id ?? choice.choiceId,
    type: inferChoiceTypeFromValue(choice),
    value: choice.value ?? {}
  });
}

function featureChoiceToPendingChoice(choice = {}) {
  if (choice?.resolved !== false) {
    return null;
  }

  const source = normalizeString(choice.source);
  return normalizePendingChoice({
    choiceId: choice.id ?? choice.choiceId,
    type: inferChoiceTypeFromValue(choice),
    classRef: source.startsWith("class-") ? refFromSourceId(source) : "",
    unlockAtClassLevel: choice.blockedUntilLevel ?? 0,
    blockedReason: choice.blockedReason ?? ""
  });
}

function normalizeBuilderDtoWithCanonicalLevels(input = {}) {
  const normalized = normalizeBuilderDecisions(input);
  normalized.levelPlan = canonicalizeLevelPlan(normalized.levelPlan);
  normalized.pendingChoices = dedupePendingChoices(normalized.pendingChoices);
  return normalized;
}

function createIdentityChoicesFromCharacter(character = {}) {
  const raceChoices = [];
  const backgroundChoices = [];
  const subclassFeatureChoices = [];

  for (const choice of toArray(character.featureChoices)) {
    const record = featureChoiceToChoiceRecord(choice);
    const source = normalizeString(choice.source);

    if (source.startsWith("race-")) {
      raceChoices.push(record);
    } else if (source.startsWith("background-")) {
      backgroundChoices.push(record);
    } else if (source.startsWith("subclass-")) {
      subclassFeatureChoices.push(record);
    }
  }

  return {
    raceRef: String(character.identity?.race?.ref ?? ""),
    backgroundRef: String(character.identity?.background?.ref ?? ""),
    raceChoices,
    backgroundChoices,
    subclassFeatureChoices
  };
}

function getClassEntryLevelPlan(classEntry, startCharacterLevel) {
  const classRef = String(classEntry.main ?? "");
  return toArray(classEntry.levels)
    .map((level) => toObject(level))
    .sort((a, b) => Number(a.level ?? 0) - Number(b.level ?? 0))
    .map((level, index) => ({
      characterLevel: startCharacterLevel + index,
      classRef,
      classLevel: toPositiveInteger(level.level, index + 1),
      decisions: toArray(level.decisions).map(normalizeDecision)
    }));
}

function getSubclassUnlockLevel(classEntry, rulesAdapter) {
  const classRule = rulesAdapter?.getRuleEntity?.(classEntry.main);
  if (classRule?.subclassUnlockLevel) {
    return Number(classRule.subclassUnlockLevel);
  }

  const featureLevel = toArray(classEntry.levels)
    .map((level) => toObject(level))
    .find((level) => toArray(level.featuresGained)
      .some((feature) => /tradition|domain|college|archetype|path|oath|circle|patron|origin/i.test(String(feature))));

  return toPositiveInteger(featureLevel?.level, 1);
}

function ensureReconstructedSubclassDecisions(levelPlan, classes, rulesAdapter) {
  const next = cloneJson(levelPlan, []);

  for (const classEntry of toArray(classes)) {
    const subclassName = normalizeString(classEntry.sub);
    const classRef = normalizeString(classEntry.main);
    if (!subclassName || !classRef) {
      continue;
    }

    const classKey = keyForRef(classRef);
    const alreadyHasSubclass = next.some((entry) => (
      keyForRef(entry.classRef) === classKey
      && toArray(entry.decisions).some((decision) => decision.type === "subclass")
    ));

    if (alreadyHasSubclass) {
      continue;
    }

    const unlockAtClassLevel = getSubclassUnlockLevel(classEntry, rulesAdapter);
    const target = next.find((entry) => keyForRef(entry.classRef) === classKey && entry.classLevel >= unlockAtClassLevel)
      ?? next.find((entry) => keyForRef(entry.classRef) === classKey);

    if (target) {
      target.decisions = [
        ...toArray(target.decisions),
        normalizeDecision({ type: "subclass", value: subclassName })
      ];
    }
  }

  return next;
}

function createAbilityScoreChoicesFromCharacter(character = {}) {
  const scores = {};

  for (const ability of ABILITY_ORDER) {
    const score = Number(character.abilities?.[ability]?.score);
    if (Number.isFinite(score)) {
      scores[ability] = score;
    }
  }

  return normalizeAbilityScoreChoices({
    method: "manual",
    characterLevel: 1,
    scores,
    derivedFromCurrentScores: true,
    note: "Reverse-derived from final character scores; may include race, ASI, feat, or item bonuses."
  });
}

function createGrantedSpellChoicesFromCharacter(character = {}) {
  return toArray(character.featureChoices)
    .filter((choice) => {
      const value = toObject(choice.value);
      return value.spell || toArray(value.spells).length;
    })
    .map((choice) => normalizeGrantedSpellChoice({
      choiceId: choice.id ?? choice.choiceId,
      type: inferChoiceTypeFromValue(choice),
      sourceRef: refFromSourceId(choice.source),
      value: choice.value
    }));
}

/**
 * Best-effort reconstruction from the final playable character DTO.
 * This is intentionally lossy because the final DTO does not preserve every
 * authoring branch, but it recovers identity choices, class chronology where
 * possible, level decisions, pending feature choices, and current ability scores.
 */
export function reconstructBuilderDecisionsFromCharacter(characterDto = {}, options = {}) {
  const character = normalizeCharacter(characterDto);
  const orderedClasses = toArray(character.classes)
    .map((classEntry, index) => ({ ...classEntry, _originalIndex: index }))
    .sort((a, b) => {
      if (Boolean(a.isFirstClass) !== Boolean(b.isFirstClass)) {
        return a.isFirstClass ? -1 : 1;
      }

      return a._originalIndex - b._originalIndex;
    });

  let nextCharacterLevel = 1;
  let levelPlan = [];

  for (const classEntry of orderedClasses) {
    const entries = getClassEntryLevelPlan(classEntry, nextCharacterLevel);
    levelPlan = [...levelPlan, ...entries];
    nextCharacterLevel += entries.length;
  }

  levelPlan = canonicalizeLevelPlan(levelPlan);
  levelPlan = ensureReconstructedSubclassDecisions(levelPlan, orderedClasses, options.rulesAdapter);

  return normalizeBuilderDtoWithCanonicalLevels({
    schemaVersion: BUILDER_SCHEMA_VERSION,
    characterId: character.id,
    derivedFromCharacterDto: true,
    identityChoices: createIdentityChoicesFromCharacter(character),
    abilityScoreChoices: createAbilityScoreChoicesFromCharacter(character),
    levelPlan,
    pendingChoices: toArray(character.featureChoices)
      .map(featureChoiceToPendingChoice)
      .filter(Boolean),
    grantedSpellChoices: createGrantedSpellChoicesFromCharacter(character)
  });
}

/**
 * Creates the smallest valid builder-decision DTO for a new draft.
 * Called by CharacterBuilderApp.open({ mode: "new" }) and test fixtures.
 */
export function createEmptyBuilderDecisions(options = {}) {
  const characterId = String(options.characterId ?? "char-new-character");

  return {
    schemaVersion: BUILDER_SCHEMA_VERSION,
    characterId,
    derivedFromCharacterDto: false,
    identityChoices: {
      raceRef: "",
      backgroundRef: "",
      raceChoices: [],
      backgroundChoices: [],
      subclassFeatureChoices: []
    },
    abilityScoreChoices: {
      method: "manual",
      characterLevel: 1,
      scores: {}
    },
    levelPlan: [],
    pendingChoices: [],
    grantedSpellChoices: [],
    proficiencyReplacements: []
  };
}

/**
 * Normalizes imported builder DTOs into the builder's internal baseline shape.
 * Semantic legality is computed by CharacterBuilder so raw imports remain readable.
 */
export function normalizeBuilderDecisions(input = {}) {
  const base = toObject(input);
  const identityChoices = toObject(base.identityChoices);

  return {
    ...base,
    schemaVersion: String(base.schemaVersion ?? BUILDER_SCHEMA_VERSION),
    characterId: String(base.characterId ?? "char-new-character"),
    derivedFromCharacterDto: Boolean(base.derivedFromCharacterDto),
    identityChoices: {
      ...identityChoices,
      raceRef: String(identityChoices.raceRef ?? ""),
      backgroundRef: String(identityChoices.backgroundRef ?? ""),
      raceChoices: toArray(identityChoices.raceChoices).map(normalizeChoiceRecord),
      backgroundChoices: toArray(identityChoices.backgroundChoices).map(normalizeChoiceRecord),
      subclassFeatureChoices: toArray(identityChoices.subclassFeatureChoices).map(normalizeChoiceRecord)
    },
    abilityScoreChoices: normalizeAbilityScoreChoices(base.abilityScoreChoices ?? base.manualAbilityScores),
    levelPlan: toArray(base.levelPlan).map(normalizeLevelPlanEntry),
    pendingChoices: toArray(base.pendingChoices).map(normalizePendingChoice),
    grantedSpellChoices: toArray(base.grantedSpellChoices ?? base.spellChoices).map(normalizeGrantedSpellChoice),
    proficiencyReplacements: toArray(base.proficiencyReplacements).map(normalizeProficiencyReplacement)
  };
}

/**
 * Runtime owner for builder-decision state.
 * The class owns progression history, direct builder mutations, pending/blocked
 * computations, and rules-backed diagnostics without depending on any UI.
 */
export class CharacterBuilder {
  #dto;
  #rulesAdapter;

  constructor(input = {}, options = {}) {
    this.#dto = normalizeBuilderDtoWithCanonicalLevels(input);
    this.#rulesAdapter = options.rulesAdapter ?? null;
  }

  /**
   * Creates an empty builder draft for a new character.
   */
  static createEmpty(options = {}) {
    return new CharacterBuilder(createEmptyBuilderDecisions(options), options);
  }

  /**
   * Creates a runtime builder from a saved builder-decision DTO.
   */
  static fromDTO(dto, options = {}) {
    return new CharacterBuilder(dto, options);
  }

  /**
   * Best-effort reconstruction from a final playable v1 character DTO.
   */
  static fromCharacterDTO(characterDto, options = {}) {
    return new CharacterBuilder(
      reconstructBuilderDecisionsFromCharacter(characterDto, options),
      options
    );
  }

  /**
   * Alias for callers that use "Dto" casing.
   */
  static fromCharacterDto(characterDto, options = {}) {
    return CharacterBuilder.fromCharacterDTO(characterDto, options);
  }

  /**
   * Replaces the full builder state with a normalized DTO.
   */
  replace(dto) {
    this.#dto = normalizeBuilderDtoWithCanonicalLevels(dto);
    return this;
  }

  /**
   * Attaches the rules adapter used for legal-choice and unlock computations.
   */
  setRulesAdapter(rulesAdapter) {
    this.#rulesAdapter = rulesAdapter;
    return this;
  }

  get rulesAdapter() {
    return this.#rulesAdapter;
  }

  get characterId() {
    return this.#dto.characterId;
  }

  get levelPlan() {
    return this.getLevelPlan();
  }

  get pendingChoices() {
    return this.getPendingChoices();
  }

  get identityChoices() {
    return cloneJson(this.#dto.identityChoices, {});
  }

  get abilityScoreChoices() {
    return cloneJson(this.#dto.abilityScoreChoices, {});
  }

  get grantedSpellChoices() {
    return cloneJson(this.#dto.grantedSpellChoices, []);
  }

  get proficiencyReplacements() {
    return cloneJson(this.#dto.proficiencyReplacements, []);
  }

  /**
   * Evaluates required race/background choice definitions against saved choices.
   */
  getIdentityChoiceRequirements() {
    return this.#getIdentityChoiceEvaluations().map((entry) => cloneJson(entry, {}));
  }

  /**
   * Applies a shallow patch to identity-level builder choices.
   */
  setIdentityChoices(patch = {}) {
    this.#dto = normalizeBuilderDtoWithCanonicalLevels({
      ...this.#dto,
      identityChoices: {
        ...this.#dto.identityChoices,
        ...patch
      }
    });
    return this;
  }

  /**
   * Selects the character ancestry/race and optional race-level choices.
   */
  setAncestry(raceRef, raceChoices = undefined) {
    const patch = {
      raceRef: this.#resolveEntityRef(raceRef, "ancestry")
    };

    if (raceChoices !== undefined) {
      patch.raceChoices = this.#normalizeChoiceInput(raceChoices);
    }

    return this.setIdentityChoices(patch);
  }

  /**
   * Alias for consumers that use final DTO language.
   */
  setRace(raceRef, raceChoices = undefined) {
    return this.setAncestry(raceRef, raceChoices);
  }

  /**
   * Selects the background and optional background-level choices.
   */
  setBackground(backgroundRef, backgroundChoices = undefined) {
    const patch = {
      backgroundRef: this.#resolveEntityRef(backgroundRef, "background")
    };

    if (backgroundChoices !== undefined) {
      patch.backgroundChoices = this.#normalizeChoiceInput(backgroundChoices);
    }

    return this.setIdentityChoices(patch);
  }

  /**
   * Adds or replaces one identity choice in race/background/subclass feature scope.
   */
  assignIdentityChoice(scope, choice) {
    const normalizedScope = String(scope ?? "").trim();
    if (!IDENTITY_CHOICE_SCOPES.has(normalizedScope)) {
      throw new Error(`Unknown identity choice scope: ${normalizedScope || "(blank)"}`);
    }

    const key = normalizedScope === "race"
      ? "raceChoices"
      : normalizedScope === "background"
        ? "backgroundChoices"
        : "subclassFeatureChoices";
    const record = normalizeChoiceRecord(choice);
    const existing = toArray(this.#dto.identityChoices[key]).filter((entry) => entry.choiceId !== record.choiceId);

    return this.setIdentityChoices({
      [key]: [...existing, record]
    });
  }

  /**
   * Removes one saved identity choice from a race/background/subclass scope.
   */
  removeIdentityChoice(scope, choiceId) {
    const normalizedScope = String(scope ?? "").trim();
    const normalizedChoiceId = normalizeString(choiceId);
    if (!IDENTITY_CHOICE_SCOPES.has(normalizedScope) || !normalizedChoiceId) {
      return this;
    }

    const key = normalizedScope === "race"
      ? "raceChoices"
      : normalizedScope === "background"
        ? "backgroundChoices"
        : "subclassFeatureChoices";

    return this.setIdentityChoices({
      [key]: toArray(this.#dto.identityChoices[key]).filter((entry) => entry.choiceId !== normalizedChoiceId)
    });
  }

  /**
   * Replaces all proficiency replacement selections created by duplicate grants.
   */
  setProficiencyReplacements(replacements = []) {
    this.#dto = normalizeBuilderDtoWithCanonicalLevels({
      ...this.#dto,
      proficiencyReplacements: toArray(replacements).map(normalizeProficiencyReplacement)
    });
    return this;
  }

  /**
   * Stores one replacement proficiency separately from the original colliding pick.
   */
  assignProficiencyReplacement(choiceId, values = [], options = {}) {
    const normalized = normalizeProficiencyReplacement({
      ...options,
      choiceId,
      values
    });
    const retained = toArray(this.#dto.proficiencyReplacements)
      .filter((entry) => entry.choiceId !== normalized.choiceId);

    this.#dto = normalizeBuilderDtoWithCanonicalLevels({
      ...this.#dto,
      proficiencyReplacements: normalized.values.length
        ? [...retained, normalized]
        : retained
    });
    return this;
  }

  removeProficiencyReplacement(choiceId) {
    return this.assignProficiencyReplacement(choiceId, []);
  }

  /**
   * Stores level 1 manually entered ability scores.
   */
  assignManualAbilityScores(scores = {}, options = {}) {
    this.#dto = normalizeBuilderDtoWithCanonicalLevels({
      ...this.#dto,
      abilityScoreChoices: normalizeAbilityScoreChoices({
        ...this.#dto.abilityScoreChoices,
        ...options,
        method: options.method ?? "manual",
        characterLevel: options.characterLevel ?? 1,
        scores
      })
    });

    return this;
  }

  /**
   * Alias with setter wording for UI code.
   */
  setManualAbilityScores(scores = {}, options = {}) {
    return this.assignManualAbilityScores(scores, options);
  }

  /**
   * Replaces the chronological level plan.
   */
  setLevelPlan(levelPlan = []) {
    this.#dto = normalizeBuilderDtoWithCanonicalLevels({
      ...this.#dto,
      levelPlan
    });
    return this;
  }

  /**
   * Removes one or more decision types from a total character level.
   * Used by inline UI controls when a previously selected value is cleared.
   */
  removeLevelDecisions(characterLevel, types = []) {
    const level = toPositiveInteger(characterLevel, 0);
    const targetTypes = new Set(toInputArray(types).map(normalizeString).filter(Boolean));

    if (!level || !targetTypes.size) {
      return this;
    }

    const nextPlan = cloneJson(this.#dto.levelPlan, []);
    const index = nextPlan.findIndex((entry) => Number(entry.characterLevel) === level);
    if (index < 0) {
      throw new Error(`Cannot remove decisions: character level ${level} does not exist.`);
    }

    const previous = normalizeLevelPlanEntry(nextPlan[index], index);
    nextPlan[index] = {
      ...previous,
      decisions: previous.decisions.filter((decision) => !targetTypes.has(decision.type))
    };

    return this.setLevelPlan(nextPlan);
  }

  /**
   * Replaces explicit unresolved/blocked choices supplied by an import or UI.
   * Computed pending choices are still derived dynamically from rules.
   */
  setPendingChoices(pendingChoices = []) {
    this.#dto = normalizeBuilderDtoWithCanonicalLevels({
      ...this.#dto,
      pendingChoices
    });
    return this;
  }

  /**
   * Chooses or replaces the class taken at a total character level.
   */
  chooseClassAtLevel(characterLevel, classRef, options = {}) {
    const level = toPositiveInteger(characterLevel, this.#dto.levelPlan.length + 1);
    const nextPlan = cloneJson(this.#dto.levelPlan, []);

    while (nextPlan.length < level) {
      nextPlan.push({
        characterLevel: nextPlan.length + 1,
        classRef: "",
        classLevel: 0,
        decisions: []
      });
    }

    const previous = toObject(nextPlan[level - 1]);
    nextPlan[level - 1] = {
      ...previous,
      characterLevel: level,
      classRef: this.#resolveEntityRef(classRef, "class"),
      decisions: options.resetDecisions
        ? []
        : options.decisions !== undefined
          ? toArray(options.decisions).map(normalizeDecision)
          : toArray(previous.decisions).map(normalizeDecision)
    };

    return this.setLevelPlan(nextPlan);
  }

  /**
   * Alias for consumers that prefer setter naming.
   */
  setClassAtLevel(characterLevel, classRef, options = {}) {
    return this.chooseClassAtLevel(characterLevel, classRef, options);
  }

  /**
   * Appends one new total level using the supplied class.
   */
  appendClassLevel(classRef, options = {}) {
    return this.chooseClassAtLevel(this.#dto.levelPlan.length + 1, classRef, options);
  }

  /**
   * Assigns a subclass decision at a total character level.
   */
  assignSubclassDecision(characterLevel, subclassValue, options = {}) {
    const entry = this.#getLevelEntry(characterLevel);
    if (!entry) {
      throw new Error(`Cannot assign subclass: character level ${characterLevel} does not exist.`);
    }

    const value = this.#resolveSubclassDecisionValue(entry.classRef, entry.classLevel, subclassValue);
    return this.#replaceLevelDecision(entry.characterLevel, {
      type: "subclass",
      value
    }, {
      append: options.append,
      replaceType: options.replaceType ?? true
    });
  }

  /**
   * Assigns skill picks for a total character level.
   */
  assignSkillPicks(characterLevel, picks = [], options = {}) {
    return this.#assignPickDecisions(characterLevel, "skill", picks, options);
  }

  /**
   * Assigns tool picks for a total character level.
   */
  assignToolPicks(characterLevel, picks = [], options = {}) {
    return this.#assignPickDecisions(characterLevel, "tool", picks, options);
  }

  /**
   * Assigns language picks for a total character level.
   */
  assignLanguagePicks(characterLevel, picks = [], options = {}) {
    return this.#assignPickDecisions(characterLevel, "language", picks, options);
  }

  /**
   * Returns a bounded checkbox model for a rules-backed level choice.
   */
  getBoundedChoiceModel(characterLevel, type, options = {}) {
    const level = toPositiveInteger(characterLevel, 0);
    const normalizedType = normalizeString(type);
    const entry = canonicalizeLevelPlan(this.#dto.levelPlan)
      .find((item) => Number(item.characterLevel) === level) ?? null;
    const requirement = this.getDecisionRequirements()
      .find((item) => Number(item.characterLevel) === level && item.type === normalizedType) ?? null;

    return createBoundedChoiceModel({
      id: options.id ?? requirement?.decisionId,
      type: normalizedType,
      label: options.label,
      sourceLabel: entry ? `Level ${entry.characterLevel} | ${getClassSummary(entry, this.#rulesAdapter)}` : "",
      requirement,
      options: options.options,
      count: options.count,
      selectedValues: options.selectedValues ?? getDecisionValuesForType(entry, normalizedType)
    });
  }

  /**
   * Returns the production 2014 checkbox ASI model for one character level.
   */
  getAsiChoiceModel(characterLevel, options = {}) {
    const level = toPositiveInteger(characterLevel, 0);
    const plan = canonicalizeLevelPlan(this.#dto.levelPlan);
    const entry = plan.find((item) => Number(item.characterLevel) === level)
      ?? plan.find((item) => toArray(item.decisions).some((decision) => decision.type === "asi"))
      ?? null;
    const identityChoices = toObject(this.#dto.identityChoices);
    const baseScores = getBaseAbilityScoreMap(this.#dto);
    const ancestryScores = sumFixedAbilityRules(getAncestryLineage(this.#rulesAdapter, identityChoices.raceRef));
    const priorAsi = sumPriorAsi(plan, entry?.characterLevel ?? level);
    const selectedIncreases = options.selectedIncreases ?? getAsiDecisionIncreases(entry);
    const currentScores = {
      ...addAbilityMaps(baseScores, ancestryScores, priorAsi),
      ...toObject(options.currentScoreOverrides)
    };

    return createAsiChoiceModelFromState({
      id: options.id ?? `level-${entry?.characterLevel ?? level}-asi`,
      characterLevel: entry?.characterLevel ?? level,
      label: options.label ?? "Ability Score Increase",
      sourceLabel: entry ? `Level ${entry.characterLevel} | ${getClassSummary(entry, this.#rulesAdapter)}` : `Level ${level}`,
      currentScores,
      selectedIncreases,
      ruleProfile: {
        ...ASI_2014_RULE_PROFILE,
        ...toObject(options.ruleProfile)
      }
    });
  }

  validateAsiChoice(characterLevel, increases = [], options = {}) {
    return this.getAsiChoiceModel(characterLevel, {
      ...options,
      selectedIncreases: normalizeAbilityIncreases(increases)
    });
  }

  /**
   * Assigns an ASI decision at a total character level.
   */
  assignAsiChoice(characterLevel, increases = [], options = {}) {
    const normalizedIncreases = normalizeAbilityIncreases(increases);
    if (options.validate !== false) {
      const validation = this.validateAsiChoice(characterLevel, normalizedIncreases, options);
      if (!validation.resolved) {
        throw new Error(`Invalid ASI choice for character level ${characterLevel}: ${validation.violations.join("; ") || `pick ${validation.count} abilities`}`);
      }
    }

    return this.#replaceLevelDecision(characterLevel, {
      type: "asi",
      value: {
        ...toObject(options.value),
        increases: normalizedIncreases
      }
    }, {
      append: options.append,
      replaceType: options.replaceType ?? true
    });
  }

  /**
   * Assigns a feat decision at a total character level.
   */
  assignFeatChoice(characterLevel, feat, options = {}) {
    const value = isObject(feat)
      ? {
          feat: String(feat.feat ?? feat.name ?? ""),
          options: cloneJson(feat.options, {}),
          ref: feat.ref ?? this.#resolveEntityRef(feat.ref ?? feat.name ?? feat.feat, "feat")
        }
      : {
          feat: String(feat ?? ""),
          options: cloneJson(options.featOptions, {}),
          ref: this.#resolveEntityRef(feat, "feat")
        };

    return this.#replaceLevelDecision(characterLevel, {
      type: "feat",
      value
    }, {
      append: options.append,
      replaceType: options.replaceType ?? true
    });
  }

  /**
   * Stores granted spell choices from race/background/subclass/feat sources.
   */
  storeGrantedSpellChoices(sourceRef, choices = [], options = {}) {
    const normalizedChoices = this.#normalizeGrantedSpellChoiceInput(sourceRef, choices, options);
    const replacementIds = new Set(normalizedChoices.map((choice) => choice.choiceId).filter(Boolean));
    const retained = options.append
      ? toArray(this.#dto.grantedSpellChoices)
      : toArray(this.#dto.grantedSpellChoices).filter((choice) => !replacementIds.has(choice.choiceId));

    this.#dto = normalizeBuilderDtoWithCanonicalLevels({
      ...this.#dto,
      grantedSpellChoices: [...retained, ...normalizedChoices]
    });

    return this;
  }

  /**
   * Removes stored granted spell choices for one source ref.
   */
  clearGrantedSpellChoices(sourceRef) {
    const sourceKey = keyForRef(sourceRef);
    if (!sourceKey) {
      return this;
    }

    this.#dto = normalizeBuilderDtoWithCanonicalLevels({
      ...this.#dto,
      grantedSpellChoices: toArray(this.#dto.grantedSpellChoices)
        .filter((choice) => keyForRef(choice.sourceRef) !== sourceKey)
    });

    return this;
  }

  /**
   * Returns the canonical chronological level plan. With includeDetails, each
   * entry also carries requirements and rules features for renderer inspection.
   */
  getLevelPlan(options = {}) {
    const plan = canonicalizeLevelPlan(this.#dto.levelPlan);
    if (!options.includeDetails) {
      return cloneJson(plan, []);
    }

    const requirementsByLevel = new Map();
    for (const requirement of this.getDecisionRequirements()) {
      const existing = requirementsByLevel.get(requirement.characterLevel) ?? [];
      requirementsByLevel.set(requirement.characterLevel, [...existing, requirement]);
    }

    return plan.map((entry) => {
      const requirements = requirementsByLevel.get(entry.characterLevel) ?? [];
      return {
        ...cloneJson(entry, {}),
        requirements: cloneJson(requirements, []),
        choiceModels: requirements
          .filter((requirement) => PICK_DECISION_TYPES.has(requirement.type))
          .map((requirement) => this.getBoundedChoiceModel(entry.characterLevel, requirement.type)),
        asiChoice: requirements.some((requirement) => requirement.type === "asi")
          ? this.getAsiChoiceModel(entry.characterLevel)
          : null,
        classFeatures: this.#rulesAdapter?.getClassFeaturesForLevel?.(entry.classRef, entry.classLevel, { includeBlocked: true }) ?? [],
        subclassFeatures: this.#getSelectedSubclassRef(entry)
          ? this.#rulesAdapter?.getSubclassFeaturesForLevel?.(this.#getSelectedSubclassRef(entry), entry.classLevel, { includeBlocked: true }) ?? []
          : []
      };
    });
  }

  /**
   * Returns all rules-backed requirements for level decisions, adjusted by the
   * active campaign profile such as ASI+feat at ASI levels.
   */
  getDecisionRequirements() {
    const requirements = [];

    for (const entry of canonicalizeLevelPlan(this.#dto.levelPlan)) {
      if (!entry.classRef) {
        requirements.push({
          type: "class",
          decisionId: `level-${entry.characterLevel}-class`,
          characterLevel: entry.characterLevel,
          classRef: "",
          classLevel: 0,
          required: true,
          resolved: false,
          status: "pending",
          missingCount: 1,
          blockedReason: "",
          reason: "class-choice"
        });
        continue;
      }

      const levelRequirements = this.#rulesAdapter?.getValidLevelDecisions?.(entry.classRef, entry.classLevel) ?? [];
      for (const requirement of levelRequirements) {
        if (!REQUIREMENT_DECISION_TYPES.has(requirement.type)) {
          continue;
        }

        requirements.push(this.#evaluateRequirement(entry, requirement));
      }
    }

    return cloneJson(requirements, []);
  }

  /**
   * Returns unresolved choices from both explicit DTO pending choices and rules
   * requirements computed from the current level plan.
   */
  getPendingChoices(options = {}) {
    const includeExplicit = options.includeExplicit !== false;
    const computed = this.getDecisionRequirements()
      .filter((requirement) => requirement.required && !requirement.resolved)
      .map((requirement) => normalizePendingChoice({
        choiceId: requirement.decisionId,
        type: requirement.type,
        classRef: requirement.classRef,
        unlockAtClassLevel: requirement.classLevel,
        characterLevel: requirement.characterLevel,
        missingCount: requirement.missingCount,
        blockedReason: requirement.status === "blocked" ? requirement.blockedReason : ""
      }));

    const explicit = includeExplicit
      ? toArray(this.#dto.pendingChoices)
        .map((choice) => this.#enrichExplicitPendingChoice(choice))
        .filter(Boolean)
      : [];

    return dedupePendingChoices([...explicit, ...computed, ...this.#getPendingIdentityChoices()]);
  }

  /**
   * Returns choices that are present or pending but illegal under current state.
   */
  getBlockedChoices() {
    const blocked = [
      ...this.getPendingChoices().filter((choice) => Boolean(choice.blockedReason)),
      ...this.#getBlockedIdentityChoices(),
      ...this.#getBlockedIdentityChoiceRequirements(),
      ...this.#getBlockedClassChoices(),
      ...this.#getBlockedSubclassDecisions()
    ];

    return dedupePendingChoices(blocked);
  }

  /**
   * Returns table-facing diagnostics about missing choices, blocked options, and
   * rules adapter conflicts.
   */
  getRulesWarnings() {
    const warnings = [];
    const identity = this.#dto.identityChoices;

    if (!identity.raceRef) {
      warnings.push({
        code: "missing-ancestry",
        message: "No ancestry/race has been selected."
      });
    } else {
      this.#pushEntityWarning(warnings, identity.raceRef, "ancestry", "Selected ancestry/race");
    }

    if (!identity.backgroundRef) {
      warnings.push({
        code: "missing-background",
        message: "No background has been selected."
      });
    } else {
      this.#pushEntityWarning(warnings, identity.backgroundRef, "background", "Selected background");
    }

    const abilityScores = toObject(this.#dto.abilityScoreChoices?.scores);
    const missingAbilities = ABILITY_ORDER.filter((ability) => !Number.isFinite(Number(abilityScores[ability])));
    if (missingAbilities.length) {
      warnings.push({
        code: "missing-ability-scores",
        message: `Manual ability scores are incomplete: ${missingAbilities.join(", ")}.`
      });
    }

    const plan = canonicalizeLevelPlan(this.#dto.levelPlan);
    if (!plan.length) {
      warnings.push({
        code: "missing-level-plan",
        message: "No class levels have been selected."
      });
    }

    for (const entry of plan) {
      if (!entry.classRef) {
        warnings.push({
          code: "missing-level-class",
          characterLevel: entry.characterLevel,
          message: `Character level ${entry.characterLevel} has no class selected.`
        });
        continue;
      }

      this.#pushEntityWarning(warnings, entry.classRef, "class", `Character level ${entry.characterLevel} class`);
    }

    for (const requirement of this.getDecisionRequirements()) {
      if (requirement.required && !requirement.resolved) {
        warnings.push({
          code: requirement.status === "blocked" ? "blocked-required-choice" : "pending-required-choice",
          characterLevel: requirement.characterLevel,
          classRef: requirement.classRef,
          type: requirement.type,
          message: requirement.status === "blocked"
            ? requirement.blockedReason
            : `Missing ${requirement.type} choice at character level ${requirement.characterLevel}.`
        });
      }
    }

    for (const blocked of this.getBlockedChoices()) {
      if (!blocked.blockedReason) {
        continue;
      }

      warnings.push({
        code: "blocked-choice",
        choiceId: blocked.choiceId,
        characterLevel: blocked.characterLevel,
        type: blocked.type,
        message: blocked.blockedReason
      });
    }

    return cloneJson(warnings, []);
  }

  /**
   * Returns compact counts and flags for app shell and smoke rendering.
   */
  getStatus() {
    const pendingChoices = this.getPendingChoices();
    const blockedChoices = this.getBlockedChoices();
    const warnings = this.getRulesWarnings();
    const classProgression = this.#getClassProgression();

    return {
      characterId: this.#dto.characterId,
      totalLevels: this.#dto.levelPlan.length,
      pendingChoiceCount: pendingChoices.length,
      blockedChoiceCount: blockedChoices.length,
      warningCount: warnings.length,
      hasRace: Boolean(this.#dto.identityChoices.raceRef),
      hasBackground: Boolean(this.#dto.identityChoices.backgroundRef),
      hasAbilityScores: ABILITY_ORDER.every((ability) => Number.isFinite(Number(this.#dto.abilityScoreChoices?.scores?.[ability]))),
      classCount: classProgression.length,
      classProgression
    };
  }

  /**
   * Exports the normalized builder-decision DTO.
   */
  toDTO(options = {}) {
    const dto = normalizeBuilderDtoWithCanonicalLevels(this.#dto);
    if (options.includeComputedPendingChoices !== false) {
      dto.pendingChoices = this.getPendingChoices();
    }

    return cloneJson(dto, createEmptyBuilderDecisions());
  }

  #normalizeChoiceInput(choices) {
    return toInputArray(choices?.choices ?? choices).map(normalizeChoiceRecord);
  }

  #normalizeGrantedSpellChoiceInput(sourceRef, choices, options = {}) {
    const normalizedSourceRef = normalizeString(sourceRef);
    const entries = toInputArray(choices?.choices ?? choices);
    return entries.map((choice, index) => normalizeGrantedSpellChoice({
      ...toObject(choice),
      choiceId: choice?.choiceId ?? makeChoiceId([sourceIdFromRef(normalizedSourceRef), "spell", index + 1]),
      type: choice?.type ?? "granted-spell",
      sourceRef: normalizedSourceRef,
      characterLevel: options.characterLevel ?? choice?.characterLevel ?? null,
      classRef: options.classRef ?? choice?.classRef ?? "",
      value: choice?.value ?? choice
    }));
  }

  #resolveEntityRef(value, kind) {
    const text = normalizeString(value);
    if (!text) {
      return "";
    }

    if (/\.json(?:#.*)?$/i.test(text)) {
      return stripAnchor(text);
    }

    const method = ENTITY_METHODS[kind];
    const candidates = method && typeof this.#rulesAdapter?.[method] === "function"
      ? this.#rulesAdapter[method]()
      : [];
    const lower = text.toLowerCase();
    const found = candidates.find((candidate) => [
      candidate.ref,
      candidate.sourceId,
      candidate.name,
      candidate.shortName
    ].map((entry) => normalizeString(entry).toLowerCase()).includes(lower));

    if (found?.ref) {
      return found.ref;
    }

    return makeRef(ENTITY_PREFIXES[kind] ?? kind, text);
  }

  #resolveSubclassDecisionValue(classRef, classLevel, subclassValue) {
    const text = isObject(subclassValue)
      ? normalizeString(subclassValue.name ?? subclassValue.shortName ?? subclassValue.ref)
      : normalizeString(subclassValue);
    const candidates = this.#rulesAdapter?.getValidSubclassesForClass?.(classRef, classLevel, { includeBlocked: true }) ?? [];
    const lower = text.toLowerCase();
    const match = candidates.find((subclass) => [
      subclass.ref,
      subclass.sourceId,
      subclass.name,
      subclass.shortName
    ].map((entry) => normalizeString(entry).toLowerCase()).includes(lower));

    return match?.ref ?? text;
  }

  #getLevelEntry(characterLevel) {
    const level = toPositiveInteger(characterLevel, 0);
    return canonicalizeLevelPlan(this.#dto.levelPlan).find((entry) => entry.characterLevel === level) ?? null;
  }

  #replaceLevelDecision(characterLevel, decision, options = {}) {
    const level = toPositiveInteger(characterLevel, 0);
    if (!level) {
      throw new Error("Cannot assign a decision without a valid character level.");
    }

    const nextPlan = cloneJson(this.#dto.levelPlan, []);
    const index = nextPlan.findIndex((entry) => Number(entry.characterLevel) === level);
    if (index < 0) {
      throw new Error(`Cannot assign a decision: character level ${level} does not exist.`);
    }

    const previous = normalizeLevelPlanEntry(nextPlan[index], index);
    const normalizedDecision = normalizeDecision(decision);
    const retained = options.append
      ? previous.decisions
      : previous.decisions.filter((entry) => !(options.replaceType && entry.type === normalizedDecision.type));

    nextPlan[index] = {
      ...previous,
      decisions: [...retained, normalizedDecision]
    };

    return this.setLevelPlan(nextPlan);
  }

  #assignPickDecisions(characterLevel, type, picks = [], options = {}) {
    if (!PICK_DECISION_TYPES.has(type)) {
      throw new Error(`Unsupported pick decision type: ${type}`);
    }

    const decisions = toInputArray(picks)
      .map((value) => normalizeString(value))
      .filter(Boolean)
      .map((value) => normalizeDecision({ type, value }));

    const level = toPositiveInteger(characterLevel, 0);
    const nextPlan = cloneJson(this.#dto.levelPlan, []);
    const index = nextPlan.findIndex((entry) => Number(entry.characterLevel) === level);
    if (index < 0) {
      throw new Error(`Cannot assign ${type} picks: character level ${level} does not exist.`);
    }

    const previous = normalizeLevelPlanEntry(nextPlan[index], index);
    const retained = options.append
      ? previous.decisions
      : previous.decisions.filter((entry) => entry.type !== type);
    nextPlan[index] = {
      ...previous,
      decisions: [...retained, ...decisions]
    };

    return this.setLevelPlan(nextPlan);
  }

  #evaluateRequirement(entry, requirement) {
    const requiredCount = toPositiveInteger(requirement.count, 1);
    const pickedCount = this.#countResolvedRequirementPicks(entry.decisions, requirement);
    const missingCount = Math.max(0, requiredCount - pickedCount);
    const blockedReason = this.#getRequirementBlockedReason(requirement);
    const resolved = missingCount === 0;

    return {
      ...cloneJson(requirement, {}),
      characterLevel: entry.characterLevel,
      classRef: entry.classRef,
      classLevel: entry.classLevel,
      count: requiredCount,
      resolved,
      missingCount,
      status: resolved ? "resolved" : blockedReason ? "blocked" : "pending",
      blockedReason
    };
  }

  #countResolvedRequirementPicks(decisions, requirement) {
    const type = requirement.type;
    if (type === "asi" && requirement.allowsFeatAlternative) {
      return toArray(decisions).some((decision) => decision.type === "feat")
        ? toPositiveInteger(requirement.count, 1)
        : this.#countAsiDecisionPicks(decisions);
    }

    if (type === "subclass") {
      return toArray(decisions).some((decision) => decision.type === "subclass") ? 1 : 0;
    }

    if (type === "asi") {
      return this.#countAsiDecisionPicks(decisions);
    }

    if (type === "feat") {
      return toArray(decisions).some((decision) => decision.type === type) ? 1 : 0;
    }

    return toArray(decisions)
      .filter((decision) => decision.type === type)
      .reduce((count, decision) => count + this.#countDecisionPicks(decision, type), 0);
  }

  #countDecisionPicks(decision, type) {
    const value = decision.value;
    if (Array.isArray(value)) {
      return value.length;
    }

    if (!isObject(value)) {
      return value == null || value === "" ? 0 : 1;
    }

    const pluralKey = `${type}s`;
    if (Array.isArray(value[pluralKey])) {
      return value[pluralKey].length;
    }

    if (Array.isArray(value.picks)) {
      return value.picks.length;
    }

    return value[type] ? 1 : 0;
  }

  #countAsiDecisionPicks(decisions) {
    const amountPerPick = Number(ASI_2014_RULE_PROFILE.amountPerPick ?? 1) || 1;
    return toArray(decisions)
      .filter((decision) => decision.type === "asi")
      .flatMap((decision) => getAbilityIncreasesFromValue(decision.value))
      .reduce((total, increase) => total + Math.max(0, Math.round(Number(increase.amount ?? 0) / amountPerPick)), 0);
  }

  #getRequirementBlockedReason(requirement) {
    if (requirement.type === "subclass" && !toArray(requirement.options).length) {
      return `No legal subclass options are available for ${sourceIdFromRef(requirement.classRef) || "this class"} level ${requirement.classLevel}.`;
    }

    if ((requirement.type === "feat") && !toArray(requirement.options).length) {
      return "No legal feat options are available under the active rules profile.";
    }

    return "";
  }

  #enrichExplicitPendingChoice(choice) {
    const pending = normalizePendingChoice(choice);
    if (this.#isPendingChoiceResolved(pending)) {
      return null;
    }

    if (pending.classRef && pending.unlockAtClassLevel) {
      const currentClassLevel = this.#getCurrentClassLevel(pending.classRef);
      if (currentClassLevel < pending.unlockAtClassLevel) {
        return {
          ...pending,
          blockedReason: pending.blockedReason || `Requires ${sourceIdFromRef(pending.classRef)} level ${pending.unlockAtClassLevel}.`
        };
      }
    }

    return pending;
  }

  #isPendingChoiceResolved(pending) {
    if (!pending.type || !pending.classRef) {
      return false;
    }

    const classKey = keyForRef(pending.classRef);
    return canonicalizeLevelPlan(this.#dto.levelPlan).some((entry) => (
      keyForRef(entry.classRef) === classKey
      && (!pending.unlockAtClassLevel || entry.classLevel >= pending.unlockAtClassLevel)
      && toArray(entry.decisions).some((decision) => decision.type === pending.type)
    ));
  }

  #getCurrentClassLevel(classRef) {
    const classKey = keyForRef(classRef);
    if (!classKey) {
      return 0;
    }

    return canonicalizeLevelPlan(this.#dto.levelPlan)
      .filter((entry) => keyForRef(entry.classRef) === classKey)
      .length;
  }

  #getClassProgression() {
    const progression = new Map();

    for (const entry of canonicalizeLevelPlan(this.#dto.levelPlan)) {
      if (!entry.classRef) {
        continue;
      }

      const key = keyForRef(entry.classRef);
      const previous = progression.get(key) ?? {
        classRef: entry.classRef,
        levels: 0,
        characterLevels: []
      };

      previous.levels += 1;
      previous.characterLevels.push(entry.characterLevel);
      progression.set(key, previous);
    }

    return [...progression.values()].map((entry) => cloneJson(entry, {}));
  }

  #getIdentityChoiceEvaluations() {
    const identity = this.#dto.identityChoices;
    const sources = [
      {
        scope: "race",
        ref: identity.raceRef,
        choices: toArray(identity.raceChoices)
      },
      {
        scope: "background",
        ref: identity.backgroundRef,
        choices: toArray(identity.backgroundChoices)
      }
    ];
    const evaluations = [];

    for (const source of sources) {
      const entity = this.#rulesAdapter?.getRuleEntity?.(source.ref);
      if (!entity) {
        continue;
      }

      for (const definition of toArray(entity.choiceDefinitions)) {
        const choice = source.choices.find((entry) => entry.choiceId === definition.choiceId) ?? null;
        const evaluation = evaluateIdentityChoiceDefinition(definition, choice);
        evaluations.push({
          ...evaluation,
          scope: source.scope,
          sourceRef: source.ref,
          sourceName: entity.name || source.ref,
          sourceKind: entity.kind || source.scope
        });
      }

      for (const detection of toArray(entity.unsupportedChoiceDetections)) {
        evaluations.push({
          scope: source.scope,
          sourceRef: source.ref,
          sourceName: entity.name || source.ref,
          sourceKind: entity.kind || source.scope,
          unsupported: true,
          detection: cloneJson(detection, {}),
          definition: {
            choiceId: detection.choiceId || detection.id || makeChoiceId([source.scope, sourceIdFromRef(source.ref), "unsupported"]),
            type: detection.type || "unsupported-choice",
            label: detection.label || "Unsupported choice",
            prompt: detection.prompt || detection.reason || "This choice could not be normalized.",
            required: true,
            options: []
          },
          choice: null,
          selectedValues: [],
          matchedValues: [],
          invalidValues: [],
          required: true,
          resolved: false,
          missingCount: 1,
          blockedReason: `${entity.name || source.ref}: ${detection.prompt || detection.reason || "A required choice was detected but cannot be normalized yet."}`
        });
      }
    }

    return evaluations;
  }

  #getPendingIdentityChoices() {
    return this.#getIdentityChoiceEvaluations()
      .filter((entry) => entry.required && !entry.resolved && !entry.blockedReason)
      .map((entry) => normalizePendingChoice({
        choiceId: entry.definition?.choiceId,
        type: entry.definition?.type,
        classRef: "",
        unlockAtClassLevel: 0,
        characterLevel: 0,
        missingCount: entry.missingCount,
        sourceRef: entry.sourceRef,
        sourceName: entry.sourceName,
        blockedReason: "",
        reason: "identity-choice"
      }));
  }

  #getBlockedIdentityChoiceRequirements() {
    return this.#getIdentityChoiceEvaluations()
      .filter((entry) => entry.required && !entry.resolved && entry.blockedReason)
      .map((entry) => normalizePendingChoice({
        choiceId: entry.definition?.choiceId,
        type: entry.definition?.type,
        classRef: "",
        unlockAtClassLevel: 0,
        characterLevel: 0,
        missingCount: entry.missingCount,
        sourceRef: entry.sourceRef,
        sourceName: entry.sourceName,
        blockedReason: entry.blockedReason,
        reason: entry.unsupported ? "unsupported-identity-choice" : "invalid-identity-choice"
      }));
  }

  #getBlockedIdentityChoices() {
    const blocked = [];

    for (const [type, ref] of [
      ["ancestry", this.#dto.identityChoices.raceRef],
      ["background", this.#dto.identityChoices.backgroundRef]
    ]) {
      const blockedReason = this.#getEntityBlockedReason(ref);
      if (blockedReason) {
        blocked.push(normalizePendingChoice({
          choiceId: makeChoiceId([type, sourceIdFromRef(ref)]),
          type,
          classRef: "",
          unlockAtClassLevel: 0,
          blockedReason
        }));
      }
    }

    return blocked;
  }

  #getBlockedClassChoices() {
    return canonicalizeLevelPlan(this.#dto.levelPlan)
      .map((entry) => {
        const blockedReason = this.#getEntityBlockedReason(entry.classRef);
        if (!blockedReason) {
          return null;
        }

        return normalizePendingChoice({
          choiceId: `level-${entry.characterLevel}-class-blocked`,
          type: "class",
          classRef: entry.classRef,
          unlockAtClassLevel: entry.classLevel,
          characterLevel: entry.characterLevel,
          blockedReason
        });
      })
      .filter(Boolean);
  }

  #getBlockedSubclassDecisions() {
    if (!this.#rulesAdapter?.getValidSubclassesForClass) {
      return [];
    }

    const blocked = [];

    for (const entry of canonicalizeLevelPlan(this.#dto.levelPlan)) {
      for (const decision of entry.decisions) {
        if (decision.type !== "subclass") {
          continue;
        }

        const subclassOptions = this.#rulesAdapter.getValidSubclassesForClass(entry.classRef, entry.classLevel, { includeBlocked: true });
        if (!subclassOptions.length) {
          continue;
        }

        const value = normalizeString(decision.value).toLowerCase();
        const match = subclassOptions.find((subclass) => [
          subclass.name,
          subclass.shortName,
          subclass.ref,
          subclass.sourceId
        ].map((item) => normalizeString(item).toLowerCase()).includes(value));

        if (!match) {
          blocked.push(normalizePendingChoice({
            choiceId: `level-${entry.characterLevel}-subclass-unavailable`,
            type: "subclass",
            classRef: entry.classRef,
            unlockAtClassLevel: entry.classLevel,
            characterLevel: entry.characterLevel,
            blockedReason: `${decision.value} is not available for ${sourceIdFromRef(entry.classRef)} level ${entry.classLevel}.`
          }));
        } else if (match.blocked) {
          blocked.push(normalizePendingChoice({
            choiceId: `level-${entry.characterLevel}-subclass-blocked`,
            type: "subclass",
            classRef: entry.classRef,
            unlockAtClassLevel: entry.classLevel,
            characterLevel: entry.characterLevel,
            blockedReason: match.blockedReason
          }));
        }
      }
    }

    return blocked;
  }

  #getEntityBlockedReason(ref) {
    if (!ref || !this.#rulesAdapter?.getRuleEntity) {
      return "";
    }

    const entity = this.#rulesAdapter.getRuleEntity(ref);
    if (!entity) {
      return `Rule reference ${ref} could not be resolved.`;
    }

    if (this.#rulesAdapter.isSourceAllowed && !this.#rulesAdapter.isSourceAllowed(entity)) {
      return `${entity.name ?? ref} is blocked by the active rules profile.`;
    }

    return "";
  }

  #pushEntityWarning(warnings, ref, kind, label) {
    const blockedReason = this.#getEntityBlockedReason(ref);
    if (!blockedReason) {
      return;
    }

    warnings.push({
      code: blockedReason.includes("could not be resolved") ? `unknown-${kind}` : `blocked-${kind}`,
      ref,
      message: `${label}: ${blockedReason}`
    });
  }

  #getSelectedSubclassRef(entry) {
    const decision = this.#getSelectedSubclassDecision(entry.classRef, entry.classLevel);
    if (!decision || !this.#rulesAdapter?.getValidSubclassesForClass) {
      return "";
    }

    const options = this.#rulesAdapter.getValidSubclassesForClass(entry.classRef, entry.classLevel, { includeBlocked: true });
    const value = normalizeString(decision.value).toLowerCase();
    const match = options.find((subclass) => [
      subclass.name,
      subclass.shortName,
      subclass.ref,
      subclass.sourceId
    ].map((item) => normalizeString(item).toLowerCase()).includes(value));

    return match?.ref ?? "";
  }

  #getSelectedSubclassDecision(classRef, maxClassLevel = Number.POSITIVE_INFINITY) {
    const classKey = keyForRef(classRef);
    if (!classKey) {
      return null;
    }

    let selected = null;
    for (const entry of canonicalizeLevelPlan(this.#dto.levelPlan)) {
      if (keyForRef(entry.classRef) !== classKey || entry.classLevel > maxClassLevel) {
        continue;
      }

      const decision = toArray(entry.decisions).find((item) => item.type === "subclass");
      if (decision) {
        selected = decision;
      }
    }

    return selected;
  }
}
