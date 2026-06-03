import { CharacterBuilder, normalizeBuilderDecisions } from "./character-builder.js";
import { createProficiencyLedger } from "./character-builder-proficiency-ledger.js";
import { CharacterModel } from "../shared/character-model.js";
import {
  ABILITY_ORDER,
  SKILL_TO_ABILITY,
  createEmptyCharacter,
  deepClone,
  normalizeCharacter
} from "../shared/character-state.js";

export const BUILDER_COMPILED_SYSTEMS = Object.freeze([
  "identity race/background selections",
  "manual level 1 ability scores and builder-owned ability increases",
  "class order, first-class flags, multiclass prerequisites, and level decisions",
  "class and subclass feature references available from the rules adapter",
  "skill, tool, language, saving throw, ASI, feat, and granted-spell decisions",
  "identity choice defenses, deterministic hit dice, proficiency bonus, initiative, baseline HP, AC, speed, and spell slots"
]);

export const BUILDER_EXTERNAL_SYSTEMS = Object.freeze([
  {
    id: "override-builder-external-inventory",
    field: "inventory",
    reason: "Equipment, currency, and starting-equipment branch choices are outside the Phase 5 compiler; existing character DTO values are preserved when supplied."
  },
  {
    id: "override-builder-external-spellbook",
    field: "classes[*].spellcasting.spellPool.entries",
    reason: "General spellbook, known-spell, prepared-spell, and inventory-based spell curation remain external; the compiler only adds builder-owned granted spells."
  },
  {
    id: "override-builder-external-combat-tuning",
    field: "hp/ac/resources",
    reason: "Rolled HP, armor loadout, conditional AC toggles, and bespoke resource text remain editable final-sheet state; the compiler emits deterministic baselines."
  }
]);

const DEFAULT_GENERATED_NAME = "New Character";

const SPELL_SLOTS_BY_CASTER_LEVEL = [
  null,
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1]
];

const PACT_MAGIC_BY_WARLOCK_LEVEL = [
  null,
  { slotLevel: 1, slots: 1 },
  { slotLevel: 1, slots: 2 },
  { slotLevel: 2, slots: 2 },
  { slotLevel: 2, slots: 2 },
  { slotLevel: 3, slots: 2 },
  { slotLevel: 3, slots: 2 },
  { slotLevel: 4, slots: 2 },
  { slotLevel: 4, slots: 2 },
  { slotLevel: 5, slots: 2 },
  { slotLevel: 5, slots: 2 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 3 },
  { slotLevel: 5, slots: 4 },
  { slotLevel: 5, slots: 4 },
  { slotLevel: 5, slots: 4 },
  { slotLevel: 5, slots: 4 }
];

const DECISION_TYPES_WITH_ABILITY_INCREASES = new Set(["asi", "racial-asi", "feat"]);
const NON_SPECIALTY_CHOICE_TYPES = new Set([
  "skill",
  "skills",
  "tool",
  "tools",
  "language",
  "languages",
  "cantrip",
  "spell",
  "spells",
  "feat",
  "racial-asi"
]);

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return isObject(value) ? value : {};
}

function cloneJson(value, fallback = null) {
  if (value == null) {
    return deepClone(fallback);
  }

  return deepClone(value);
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeSource(value) {
  return normalizeString(value).toUpperCase();
}

function stripAnchor(value) {
  return normalizeString(value).split("#")[0];
}

function stripJsonExtension(value) {
  return stripAnchor(value).replace(/\.json$/i, "");
}

function sourceIdFromRef(value) {
  return stripJsonExtension(value);
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

function titleCase(value) {
  return normalizeString(value)
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
    .join(" ");
}

function humanizeRef(ref) {
  return titleCase(sourceIdFromRef(ref).replace(/^(class|race|background|subclass|feat)-/, ""));
}

function formatEntityName(entity, fallback = "Unknown") {
  return entity?.name || entity?.shortName || (entity?.ref ? humanizeRef(entity.ref) : fallback);
}

function makeRef(prefix, value) {
  const slug = slugify(value);
  return slug ? `${prefix}-${slug}.json` : "";
}

function classKeyFromRef(ref) {
  return sourceIdFromRef(ref).toLowerCase();
}

function abilityModifier(score) {
  return Math.floor((Number(score ?? 10) - 10) / 2);
}

function proficiencyBonusForLevel(level) {
  return Math.ceil(Math.max(1, Number(level ?? 1)) / 4) + 1;
}

function getHitDieSize(classEntity) {
  const fromHitDie = normalizeString(classEntity?.hitDie);
  const match = /^d?(\d+)$/i.exec(fromHitDie);
  return match ? Number(match[1]) : 8;
}

function getAverageHitDieRoll(hitDieSize) {
  return Math.floor(Number(hitDieSize ?? 8) / 2) + 1;
}

function normalizeSkillToken(value) {
  return normalizeString(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SKILL_KEY_BY_TOKEN = new Map(
  Object.keys(SKILL_TO_ABILITY).flatMap((skill) => [
    [normalizeSkillToken(skill), skill],
    [normalizeSkillToken(titleCase(skill.replace(/[A-Z]/g, " $&"))), skill]
  ])
);

function normalizeSkillKey(value) {
  const token = normalizeSkillToken(value);
  return SKILL_KEY_BY_TOKEN.get(token) ?? slugify(value).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function formatProficiencyName(name, collection) {
  const text = normalizeString(name);
  const lower = text.toLowerCase();

  if (collection === "armor") {
    if (lower === "shield" || lower === "shields") return "Shields";
    if (lower === "light") return "Light Armor";
    if (lower === "medium") return "Medium Armor";
    if (lower === "heavy") return "Heavy Armor";
  }

  if (collection === "weapons") {
    if (lower === "simple") return "Simple Weapons";
    if (lower === "martial") return "Martial Weapons";
  }

  return titleCase(text);
}

function getFixedProficiencyValues(block, collection) {
  const entry = block?.[collection];
  if (!entry) {
    return [];
  }

  if (Array.isArray(entry)) {
    return entry;
  }

  if (Array.isArray(entry.fixed)) {
    return entry.fixed;
  }

  return [];
}

function getChoiceValue(value, key) {
  const object = toObject(value);
  const plural = `${key}s`;
  if (Array.isArray(object[plural])) {
    return object[plural];
  }

  if (Array.isArray(object.picks)) {
    return object.picks;
  }

  if (object[key] != null) {
    return [object[key]];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value == null || isObject(value) ? [] : [value];
}

function normalizeAbilityIncrease(increase, fallbackAmount = 0) {
  const normalized = toObject(increase);
  const ability = normalizeString(normalized.ability ?? increase).toLowerCase();
  const amount = increase && typeof increase === "object"
    ? Number(normalized.amount ?? fallbackAmount)
    : Number(fallbackAmount);

  if (!ABILITY_ORDER.includes(ability) || !Number.isFinite(amount) || amount === 0) {
    return null;
  }

  return {
    ability,
    amount
  };
}

function getAbilityIncreasesFromValue(value) {
  return toArray(toObject(value).increases)
    .map((increase) => normalizeAbilityIncrease(increase, 1))
    .filter(Boolean);
}

function applyAbilityIncreaseMap(scoreMap, increases) {
  for (const increase of toArray(increases).map((entry) => normalizeAbilityIncrease(entry, 1)).filter(Boolean)) {
    scoreMap[increase.ability] = Number(scoreMap[increase.ability] ?? 10) + increase.amount;
  }
}

function applyFixedAbilityRules(scoreMap, abilityRules) {
  for (const rule of toArray(abilityRules)) {
    if (!isObject(rule)) {
      continue;
    }

    for (const ability of ABILITY_ORDER) {
      const amount = Number(rule[ability]);
      if (Number.isFinite(amount) && amount !== 0) {
        scoreMap[ability] = Number(scoreMap[ability] ?? 10) + amount;
      }
    }
  }
}

function hasCompleteManualScores(abilityScoreChoices) {
  const scores = toObject(abilityScoreChoices?.scores);
  return ABILITY_ORDER.every((ability) => Number.isFinite(Number(scores[ability])));
}

function createAbilityScoreMap(dto, baseCharacter) {
  const choices = toObject(dto.abilityScoreChoices);
  const manualScores = toObject(choices.scores);
  const useManual = hasCompleteManualScores(choices);
  const useDerivedCurrentScores = Boolean(choices.derivedFromCurrentScores);
  const useBaseScores = !useManual && Boolean(baseCharacter);
  const scoreMap = {};

  for (const ability of ABILITY_ORDER) {
    const value = useManual
      ? manualScores[ability]
      : useBaseScores
        ? baseCharacter.abilities?.[ability]?.score
        : 10;
    scoreMap[ability] = Number.isFinite(Number(value)) ? Number(value) : 10;
  }

  return {
    scoreMap,
    appliesBuilderIncreases: !useDerivedCurrentScores && !useBaseScores
  };
}

function addLanguage(character, language) {
  const value = titleCase(language);
  if (!value) {
    return;
  }

  const existing = new Set(character.proficiencies.languages.map((entry) => entry.toLowerCase()));
  if (!existing.has(value.toLowerCase())) {
    character.proficiencies.languages.push(value);
  }
}

function addSkill(character, skill, source, options = {}) {
  const key = normalizeSkillKey(skill);
  if (!key) {
    return;
  }

  const previous = toObject(character.skills[key]);
  character.skills[key] = {
    proficient: true,
    expertise: Boolean(previous.expertise || options.expertise),
    source: previous.source || source
  };
}

function addStructuredProficiency(character, collection, name, source, options = {}) {
  const value = normalizeString(name);
  if (!value) {
    return;
  }

  if (collection === "languages") {
    addLanguage(character, value);
    return;
  }

  const formattedName = formatProficiencyName(value, collection);
  const entries = character.proficiencies[collection] ?? [];
  const exists = entries.some((entry) => normalizeString(entry.name).toLowerCase() === formattedName.toLowerCase());
  if (exists) {
    return;
  }

  entries.push({
    name: formattedName,
    grantedBy: source,
    ...(options.multiclass == null ? {} : { multiclass: Boolean(options.multiclass) }),
    ...(options.expertise ? { expertise: true } : {})
  });
  character.proficiencies[collection] = entries;
}

function applyProficiencyBlock(character, block, source, options = {}) {
  for (const collection of ["armor", "weapons", "tools", "languages"]) {
    for (const value of getFixedProficiencyValues(block, collection)) {
      addStructuredProficiency(character, collection, value, source, options);
    }
  }

  for (const skill of getFixedProficiencyValues(block, "skills")) {
    addSkill(character, skill, source);
  }
}

function applyGrantCollections(character, grants, source) {
  const normalized = toObject(grants);
  applyProficiencyBlock(character, {
    skills: normalized.skills,
    tools: normalized.tools,
    languages: normalized.languages
  }, source);
}

function applyChoiceProficiencies(character, choice, source) {
  const type = normalizeString(choice.type);
  const value = choice.value;
  const expertise = Boolean(toObject(value).expertise);

  if (type === "skill" || type === "skills") {
    for (const skill of getChoiceValue(value, "skill")) {
      addSkill(character, skill, source, { expertise });
    }
    return;
  }

  if (type === "expertise") {
    for (const skill of getChoiceValue(value, "skill")) {
      addSkill(character, skill, source, { expertise: true });
    }
    return;
  }

  if (type === "tool" || type === "tools" || type === "instrument") {
    const key = type === "instrument" ? "instrument" : "tool";
    for (const tool of getChoiceValue(value, key)) {
      addStructuredProficiency(character, "tools", tool, source);
    }
    return;
  }

  if (type === "language" || type === "languages") {
    for (const language of getChoiceValue(value, "language")) {
      addLanguage(character, language);
    }
  }
}

function addDefenseValue(character, key, value) {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) {
    return;
  }

  character.defenses = {
    damageResistances: toArray(character.defenses?.damageResistances),
    damageImmunities: toArray(character.defenses?.damageImmunities),
    damageVulnerabilities: toArray(character.defenses?.damageVulnerabilities),
    conditionImmunities: toArray(character.defenses?.conditionImmunities)
  };

  const list = character.defenses[key] ?? [];
  if (!list.map((entry) => normalizeString(entry).toLowerCase()).includes(normalized)) {
    list.push(normalized);
  }
  character.defenses[key] = list;
}

function applyChoiceDefenses(character, choice) {
  const value = toObject(choice?.value);
  const defenses = toObject(value.grants?.defenses);
  for (const resistance of toArray(defenses.damageResistances)) {
    addDefenseValue(character, "damageResistances", resistance);
  }
  for (const immunity of toArray(defenses.damageImmunities)) {
    addDefenseValue(character, "damageImmunities", immunity);
  }
  for (const vulnerability of toArray(defenses.damageVulnerabilities)) {
    addDefenseValue(character, "damageVulnerabilities", vulnerability);
  }
  for (const immunity of toArray(defenses.conditionImmunities)) {
    addDefenseValue(character, "conditionImmunities", immunity);
  }

  if (choice?.type === "draconic-ancestry" && value.damageType) {
    addDefenseValue(character, "damageResistances", value.damageType);
  }
}

function applyDecisionProficiencies(character, decision, source) {
  const type = normalizeString(decision.type);

  if (type === "skill" || type === "skills" || type === "expertise" || type === "tool" || type === "tools" || type === "language" || type === "languages") {
    applyChoiceProficiencies(character, decision, source);
  }
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

  if (ancestry.parentRef) {
    const parent = getRuleEntity(rulesAdapter, ancestry.parentRef);
    return parent ? [parent, ancestry] : [ancestry];
  }

  return [ancestry];
}

function findSelectedSubclass(plan, classRef, rulesAdapter) {
  const classKey = classKeyFromRef(classRef);
  let selected = null;

  for (const entry of plan) {
    if (classKeyFromRef(entry.classRef) !== classKey) {
      continue;
    }

    const decision = toArray(entry.decisions).find((item) => item.type === "subclass");
    if (!decision) {
      continue;
    }

    selected = {
      name: normalizeString(decision.value),
      selectedAtClassLevel: Number(entry.classLevel ?? 0)
    };
  }

  if (!selected) {
    return null;
  }

  const candidates = typeof rulesAdapter?.getValidSubclassesForClass === "function"
    ? rulesAdapter.getValidSubclassesForClass(classRef, Number.POSITIVE_INFINITY, { includeBlocked: true })
    : [];
  const normalized = selected.name.toLowerCase();
  const match = candidates.find((subclass) => [
    subclass.name,
    subclass.shortName,
    subclass.ref,
    subclass.sourceId
  ].map((value) => normalizeString(value).toLowerCase()).includes(normalized));

  return {
    ...selected,
    name: match?.name ?? selected.name,
    shortName: match?.shortName ?? selected.name,
    ref: match?.ref ?? makeRef("subclass", `${humanizeRef(classRef)} ${selected.name}`),
    sourceId: match?.sourceId ?? sourceIdFromRef(makeRef("subclass", `${humanizeRef(classRef)} ${selected.name}`))
  };
}

function createClassGroups(plan, rulesAdapter, abilities) {
  const groups = new Map();
  const firstClassRef = plan[0]?.classRef ?? "";

  for (const entry of plan) {
    const classRef = normalizeString(entry.classRef);
    if (!classRef) {
      continue;
    }

    const key = classKeyFromRef(classRef);
    const classEntity = getRuleEntity(rulesAdapter, classRef);
    const existing = groups.get(key) ?? {
      classRef,
      classEntity,
      entries: [],
      firstCharacterLevel: Number(entry.characterLevel ?? 0)
    };

    existing.entries.push(entry);
    existing.firstCharacterLevel = Math.min(existing.firstCharacterLevel, Number(entry.characterLevel ?? existing.firstCharacterLevel));
    groups.set(key, existing);
  }

  const maxClassLevels = Math.max(0, ...[...groups.values()].map((group) => group.entries.length));

  return [...groups.values()]
    .sort((a, b) => a.firstCharacterLevel - b.firstCharacterLevel)
    .map((group) => {
      const classEntity = group.classEntity;
      const isFirstClass = classKeyFromRef(group.classRef) === classKeyFromRef(firstClassRef);
      const prerequisite = isFirstClass ? null : createMulticlassPrerequisite(classEntity, abilities);

      return {
        ...group,
        isFirstClass,
        isPrimary: group.entries.length === maxClassLevels,
        hitDieSize: getHitDieSize(classEntity),
        subclass: findSelectedSubclass(plan, group.classRef, rulesAdapter),
        multiclassPrerequisite: prerequisite
      };
    });
}

function flattenRequirementEntries(requirements) {
  if (!requirements) {
    return [];
  }

  if (isObject(requirements.or)) {
    return flattenRequirementEntries(requirements.or);
  }

  if (Array.isArray(requirements.or)) {
    return requirements.or.flatMap(flattenRequirementEntries);
  }

  if (Array.isArray(requirements.and)) {
    return requirements.and.flatMap(flattenRequirementEntries);
  }

  if (isObject(requirements)) {
    return Object.entries(requirements)
      .filter(([ability]) => ABILITY_ORDER.includes(ability))
      .map(([ability, minimum]) => ({
        ability,
        minimum: Number(minimum)
      }));
  }

  return [];
}

function createMulticlassPrerequisite(classEntity, abilities) {
  const requirements = flattenRequirementEntries(classEntity?.multiclassing?.requirements);
  const requirement = requirements.find((entry) => Number.isFinite(entry.minimum)) ?? null;
  if (!requirement) {
    return null;
  }

  return {
    ability: requirement.ability,
    minimum: requirement.minimum,
    met: Number(abilities?.[requirement.ability]?.score ?? 0) >= requirement.minimum
  };
}

function getSourcePolicy(rulesAdapter, baseCharacter) {
  const profile = typeof rulesAdapter?.describeProfile === "function"
    ? rulesAdapter.describeProfile()
    : {};

  return {
    ruleset: normalizeString(profile.ruleset || baseCharacter.sourcePolicy?.ruleset || "2014"),
    allowedSources: toArray(profile.allowedSources).length
      ? [...profile.allowedSources]
      : toArray(baseCharacter.sourcePolicy?.allowedSources).length
        ? [...baseCharacter.sourcePolicy.allowedSources]
        : ["PHB"],
    notes: baseCharacter.sourcePolicy?.notes || "Compiled from CharacterBuilder decision history."
  };
}

function createIdentity(dto, baseCharacter, rulesAdapter) {
  const identityChoices = toObject(dto.identityChoices);
  const ancestryLineage = getAncestryLineage(rulesAdapter, identityChoices.raceRef);
  const ancestry = ancestryLineage.at(-1) ?? null;
  const background = getRuleEntity(rulesAdapter, identityChoices.backgroundRef);
  const backgroundSpecialty = {
    ...toObject(baseCharacter.identity?.background?.specialty)
  };

  for (const choice of toArray(identityChoices.backgroundChoices)) {
    if (NON_SPECIALTY_CHOICE_TYPES.has(choice.type)) {
      continue;
    }

    Object.assign(backgroundSpecialty, toObject(choice.value));
  }

  return {
    ...baseCharacter.identity,
    name: normalizeString(baseCharacter.identity?.name) || DEFAULT_GENERATED_NAME,
    race: {
      ref: normalizeString(identityChoices.raceRef),
      name: ancestry?.raceName || ancestry?.name || humanizeRef(identityChoices.raceRef),
      subrace: ancestry?.isSubrace
        ? ancestry.subraceName || ancestry.name
        : baseCharacter.identity?.race?.subrace || "",
      source: ancestry?.source || baseCharacter.identity?.race?.source || "PHB"
    },
    background: {
      ref: normalizeString(identityChoices.backgroundRef),
      name: background?.name || humanizeRef(identityChoices.backgroundRef),
      source: background?.source || baseCharacter.identity?.background?.source || "PHB",
      feature: background?.feature || baseCharacter.identity?.background?.feature || "",
      specialty: backgroundSpecialty
    }
  };
}

function createAbilities(dto, baseCharacter, rulesAdapter) {
  const { scoreMap, appliesBuilderIncreases } = createAbilityScoreMap(dto, baseCharacter);
  const identityChoices = toObject(dto.identityChoices);

  if (appliesBuilderIncreases) {
    for (const ancestry of getAncestryLineage(rulesAdapter, identityChoices.raceRef)) {
      applyFixedAbilityRules(scoreMap, ancestry.ability);
    }

    for (const choice of [
      ...toArray(identityChoices.raceChoices),
      ...toArray(identityChoices.backgroundChoices),
      ...toArray(identityChoices.subclassFeatureChoices)
    ]) {
      if (DECISION_TYPES_WITH_ABILITY_INCREASES.has(choice.type)) {
        applyAbilityIncreaseMap(scoreMap, getAbilityIncreasesFromValue(choice.value));
      }
    }

    for (const entry of toArray(dto.levelPlan)) {
      for (const decision of toArray(entry.decisions)) {
        if (DECISION_TYPES_WITH_ABILITY_INCREASES.has(decision.type)) {
          applyAbilityIncreaseMap(scoreMap, getAbilityIncreasesFromValue(decision.value));
        }
      }
    }
  }

  return Object.fromEntries(ABILITY_ORDER.map((ability) => [
    ability,
    {
      score: Number(scoreMap[ability] ?? 10),
      savingThrow: {
        proficient: false
      }
    }
  ]));
}

function applyIdentityGrants(character, dto, rulesAdapter) {
  const identityChoices = toObject(dto.identityChoices);
  const ancestryLineage = getAncestryLineage(rulesAdapter, identityChoices.raceRef);
  const background = getRuleEntity(rulesAdapter, identityChoices.backgroundRef);

  for (const ancestry of ancestryLineage) {
    applyGrantCollections(character, ancestry.grants, sourceIdFromRef(ancestry.ref));
  }

  if (background) {
    applyGrantCollections(character, background.grants, sourceIdFromRef(background.ref));
  }

  for (const choice of toArray(identityChoices.raceChoices)) {
    applyChoiceProficiencies(character, choice, sourceIdFromRef(identityChoices.raceRef));
    applyChoiceDefenses(character, choice);
  }

  for (const choice of toArray(identityChoices.backgroundChoices)) {
    applyChoiceProficiencies(character, choice, sourceIdFromRef(identityChoices.backgroundRef));
    applyChoiceDefenses(character, choice);
  }
}

function applyClassGrantsAndDecisions(character, classGroups) {
  for (const group of classGroups) {
    const classSource = sourceIdFromRef(group.classRef);

    if (group.isFirstClass) {
      applyProficiencyBlock(character, group.classEntity?.startingProficiencies, classSource, { multiclass: false });

      for (const ability of toArray(group.classEntity?.savingThrows)) {
        const key = normalizeString(ability).toLowerCase();
        if (ABILITY_ORDER.includes(key)) {
          character.abilities[key].savingThrow = {
            proficient: true,
            grantedBy: classSource
          };
        }
      }
    } else {
      applyProficiencyBlock(character, group.classEntity?.multiclassing?.proficienciesGained, classSource, { multiclass: true });
    }

    for (const entry of group.entries) {
      for (const decision of toArray(entry.decisions)) {
        applyDecisionProficiencies(character, decision, classSource);
      }
    }
  }

  character.proficiencies.savingThrows = ABILITY_ORDER.filter((ability) => character.abilities[ability].savingThrow.proficient);
}

function applySubclassFeatureChoices(character, dto, classGroups) {
  const subclassSource = classGroups.find((group) => group.subclass)?.subclass?.sourceId ?? "";

  for (const choice of toArray(dto.identityChoices?.subclassFeatureChoices)) {
    applyChoiceProficiencies(character, choice, subclassSource || "subclass-feature");
  }
}

function applyProficiencyLedgerReplacements(character, dto, rulesAdapter) {
  const ledger = createProficiencyLedger(dto, rulesAdapter);
  const replacements = toArray(ledger.ledger?.skill)
    .filter((entry) => entry.kind === "replacement");

  for (const replacement of replacements) {
    addSkill(character, replacement.value, replacement.sourceLabel || "proficiency-replacement");
  }

  return ledger;
}

function createEmptyAbilityDeltaMap() {
  return Object.fromEntries(ABILITY_ORDER.map((ability) => [ability, 0]));
}

function addAbilityDeltaMaps(...maps) {
  const result = createEmptyAbilityDeltaMap();
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

function hasAbilityMapImpact(map) {
  return ABILITY_ORDER.some((ability) => Number(map?.[ability] ?? 0) !== 0);
}

function addFixedAbilityRuleToDelta(map, rule) {
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

function getAbilityRules(entity) {
  return toArray(entity?.ability ?? entity?.grants?.ability);
}

function sumFixedAbilityRules(entities = []) {
  return toArray(entities)
    .flatMap(getAbilityRules)
    .reduce(addFixedAbilityRuleToDelta, createEmptyAbilityDeltaMap());
}

function addAbilityIncreasesToDelta(map, increases = []) {
  for (const increase of toArray(increases).map((entry) => normalizeAbilityIncrease(entry, 1)).filter(Boolean)) {
    map[increase.ability] += increase.amount;
  }

  return map;
}

function getChoiceAbilityMap(choices = []) {
  return toArray(choices).reduce((map, choice) => {
    if (DECISION_TYPES_WITH_ABILITY_INCREASES.has(choice?.type)) {
      addAbilityIncreasesToDelta(map, getAbilityIncreasesFromValue(choice.value));
    }

    return map;
  }, createEmptyAbilityDeltaMap());
}

function getLevelAbilityMap(levelPlan = []) {
  return toArray(levelPlan).reduce((map, level) => {
    for (const decision of toArray(level.decisions)) {
      if (DECISION_TYPES_WITH_ABILITY_INCREASES.has(decision?.type)) {
        addAbilityIncreasesToDelta(map, getAbilityIncreasesFromValue(decision.value));
      }
    }

    return map;
  }, createEmptyAbilityDeltaMap());
}

function getPreviewBaseScoreMap(builderDto = {}) {
  const scores = toObject(builderDto.abilityScoreChoices?.scores);
  return Object.fromEntries(ABILITY_ORDER.map((ability) => {
    const value = Number(scores[ability]);
    return [ability, Number.isFinite(value) ? value : 10];
  }));
}

function getExportScoreMap(characterDto = {}) {
  return Object.fromEntries(ABILITY_ORDER.map((ability) => {
    const value = Number(characterDto.abilities?.[ability]?.score);
    return [ability, Number.isFinite(value) ? value : 0];
  }));
}

function sameAbilityMap(left, right) {
  return ABILITY_ORDER.every((ability) => Number(left?.[ability]) === Number(right?.[ability]));
}

function formatSignedAmount(amount) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : String(value);
}

function formatDeltaMap(map, emptyLabel = "No ability impact") {
  const labels = {
    str: "STR",
    dex: "DEX",
    con: "CON",
    int: "INT",
    wis: "WIS",
    cha: "CHA"
  };
  const entries = ABILITY_ORDER
    .map((ability) => {
      const amount = Number(map?.[ability] ?? 0);
      return Number.isFinite(amount) && amount !== 0
        ? `${labels[ability]} ${formatSignedAmount(amount)}`
        : "";
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : emptyLabel;
}

function describeLevelAbilitySources(levelPlan = []) {
  const lines = [];

  for (const level of toArray(levelPlan)) {
    for (const decision of toArray(level.decisions)) {
      if (!DECISION_TYPES_WITH_ABILITY_INCREASES.has(decision?.type)) {
        continue;
      }

      const map = addAbilityIncreasesToDelta(createEmptyAbilityDeltaMap(), getAbilityIncreasesFromValue(decision.value));
      if (hasAbilityMapImpact(map)) {
        lines.push(`Level ${level.characterLevel} ${String(decision.type).toUpperCase()}: ${formatDeltaMap(map)}`);
      }
    }
  }

  return lines;
}

function compileAbilityPreviewExport(builderDto, rulesAdapter, options = {}) {
  if (options.compiledCharacterDto) {
    return {
      dto: options.compiledCharacterDto,
      scores: getExportScoreMap(options.compiledCharacterDto),
      error: ""
    };
  }

  if (options.compileExport === false) {
    return {
      dto: null,
      scores: null,
      error: ""
    };
  }

  try {
    const builder = CharacterBuilder.fromDTO(builderDto, { rulesAdapter });
    const compiler = options.compiler ?? new CharacterBuilderCompiler({ rulesAdapter });
    const dto = compiler.toCharacterDto(builder, {
      baseCharacterDto: options.baseCharacterDto ?? null,
      generatedAt: options.generatedAt ?? "2026-05-26T13:05:49.200Z",
      touchModified: false
    });

    return {
      dto,
      scores: getExportScoreMap(dto),
      error: ""
    };
  } catch (error) {
    return {
      dto: null,
      scores: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function createAbilityImpactPreview(builderOrDto = {}, rulesAdapter, options = {}) {
  const builderDto = getBuilderDto(builderOrDto, rulesAdapter);
  const builder = CharacterBuilder.fromDTO(builderDto, { rulesAdapter });
  const identityChoices = toObject(builderDto.identityChoices);
  const abilityScoreChoices = toObject(builderDto.abilityScoreChoices);
  const hasCompleteManualScores = ABILITY_ORDER.every((ability) => Number.isFinite(Number(abilityScoreChoices.scores?.[ability])));
  const useDerivedCurrentScores = Boolean(abilityScoreChoices.derivedFromCurrentScores);
  const useBaseCharacterScores = !hasCompleteManualScores && Boolean(options.baseCharacterDto);
  const appliesBuilderIncreases = !useDerivedCurrentScores && !useBaseCharacterScores;
  const ancestryLineage = getAncestryLineage(rulesAdapter, identityChoices.raceRef);
  const ancestry = ancestryLineage.at(-1) ?? null;
  const baseScores = useBaseCharacterScores
    ? getExportScoreMap(options.baseCharacterDto)
    : getPreviewBaseScoreMap(builderDto);
  const ancestryFixedAbility = appliesBuilderIncreases
    ? sumFixedAbilityRules(ancestryLineage)
    : createEmptyAbilityDeltaMap();
  const ancestryChoiceAbility = appliesBuilderIncreases
    ? getChoiceAbilityMap(identityChoices.raceChoices)
    : createEmptyAbilityDeltaMap();
  const ancestryAbility = appliesBuilderIncreases
    ? addAbilityDeltaMaps(ancestryFixedAbility, ancestryChoiceAbility)
    : createEmptyAbilityDeltaMap();
  const identityChoiceAbility = appliesBuilderIncreases
    ? getChoiceAbilityMap([
        ...toArray(identityChoices.backgroundChoices),
        ...toArray(identityChoices.subclassFeatureChoices)
      ])
    : createEmptyAbilityDeltaMap();
  const levelAbility = appliesBuilderIncreases
    ? getLevelAbilityMap(builderDto.levelPlan)
    : createEmptyAbilityDeltaMap();
  const finalScores = addAbilityDeltaMaps(baseScores, ancestryAbility, identityChoiceAbility, levelAbility);
  const compiled = compileAbilityPreviewExport(builderDto, rulesAdapter, options);
  const exportMatchesPreview = compiled.scores ? sameAbilityMap(finalScores, compiled.scores) : false;
  const levelSources = describeLevelAbilitySources(builderDto.levelPlan);
  const rows = [
    {
      id: "base",
      label: "Base",
      kind: "score",
      values: baseScores,
      summary: useDerivedCurrentScores
        ? "Reverse-derived current scores; builder increases are already included"
        : useBaseCharacterScores
          ? "Existing character scores; builder increases are already included"
          : `${abilityScoreChoices.method || "manual"} level 1 scores`
    },
    {
      id: "ancestry",
      label: "Ancestry",
      kind: "delta",
      values: ancestryAbility,
      summary: `${formatEntityName(ancestry, identityChoices.raceRef || "Selected ancestry")}: ${formatDeltaMap(ancestryAbility)}`
    },
    hasAbilityMapImpact(identityChoiceAbility)
      ? {
          id: "identity-choices",
          label: "Other Choices",
          kind: "delta",
          values: identityChoiceAbility,
          summary: `Background or subclass ability choices: ${formatDeltaMap(identityChoiceAbility)}`
        }
      : null,
    {
      id: "level-asi",
      label: "Level ASI",
      kind: "delta",
      values: levelAbility,
      summary: levelSources.join(" | ") || "No level ability increases"
    },
    {
      id: "final",
      label: "Final",
      kind: "score",
      values: finalScores,
      summary: exportMatchesPreview
        ? "Matches exported character scores"
        : compiled.error
          ? `Export comparison unavailable: ${compiled.error}`
          : "Does not match exported character scores"
    }
  ].filter(Boolean);

  return {
    characterId: builderDto.characterId ?? builder.characterId,
    selectedAncestry: {
      ref: ancestry?.ref ?? identityChoices.raceRef ?? "",
      name: formatEntityName(ancestry, identityChoices.raceRef || "Selected ancestry"),
      source: ancestry?.source ?? "",
      page: ancestry?.page ?? null,
      lineageRefs: ancestryLineage.map((entry) => entry.ref).filter(Boolean),
      fixedAbility: ancestryFixedAbility,
      choiceAbility: ancestryChoiceAbility,
      ability: ancestryAbility,
      abilitySummary: formatDeltaMap(ancestryAbility)
    },
    rows,
    baseScores,
    ancestryAbility,
    identityChoiceAbility,
    levelAsi: levelAbility,
    finalScores,
    exportScores: compiled.scores,
    exportMatchesPreview,
    acceptedForExport: exportMatchesPreview,
    exportError: compiled.error,
    explanation: exportMatchesPreview
      ? "Export accepted: final scores are explained by visible base + ancestry + level ASI math."
      : "Export not accepted: visible preview does not match exported scores."
  };
}

function createLevelFeatureNames(group, entry, rulesAdapter) {
  const classFeatures = typeof rulesAdapter?.getClassFeaturesForLevel === "function"
    ? rulesAdapter.getClassFeaturesForLevel(group.classRef, entry.classLevel, { includeBlocked: false })
    : [];
  const subclassFeatures = group.subclass?.ref && typeof rulesAdapter?.getSubclassFeaturesForLevel === "function"
    ? rulesAdapter.getSubclassFeaturesForLevel(group.subclass.ref, entry.classLevel, { includeBlocked: false })
    : [];

  return {
    classFeatures,
    subclassFeatures,
    names: [...classFeatures, ...subclassFeatures].map((feature) => feature.name).filter(Boolean)
  };
}

function createClassEntry(group, character, rulesAdapter, baseCharacter) {
  const baseClass = toArray(baseCharacter.classes).find((entry) => classKeyFromRef(entry.main) === classKeyFromRef(group.classRef));
  const levels = group.entries
    .sort((a, b) => Number(a.classLevel ?? 0) - Number(b.classLevel ?? 0))
    .map((entry) => {
      const baseLevel = toArray(baseClass?.levels).find((level) => Number(level.level) === Number(entry.classLevel));
      const features = createLevelFeatureNames(group, entry, rulesAdapter);

      return {
        level: Number(entry.classLevel ?? 0),
        hpRolled: Number(baseLevel?.hpRolled ?? (
          group.isFirstClass && Number(entry.classLevel) === 1
            ? group.hitDieSize
            : getAverageHitDieRoll(group.hitDieSize)
        )),
        decisions: toArray(entry.decisions).map((decision) => cloneJson(decision, {})),
        featuresGained: [...new Set(features.names)]
      };
    });

  const classEntry = {
    main: group.classRef,
    sub: group.subclass?.name ?? null,
    subclassRef: group.subclass?.ref ?? null,
    subclassVariant: findDecisionValue(group.entries, "subclass-variant") ?? null,
    isPrimary: group.isPrimary,
    isFirstClass: group.isFirstClass,
    hitDieSize: group.hitDieSize,
    multiclassPrerequisite: group.multiclassPrerequisite,
    fightingStyles: collectDecisionValues(group.entries, "fighting-style"),
    spellcasting: createSpellcastingBlock(group, character, rulesAdapter, baseClass),
    levels
  };

  if (!classEntry.fightingStyles.length) {
    classEntry.fightingStyles = null;
  }

  return classEntry;
}

function findDecisionValue(entries, type) {
  for (const entry of entries) {
    const decision = toArray(entry.decisions).find((item) => item.type === type);
    if (decision) {
      return cloneJson(decision.value, null);
    }
  }

  return null;
}

function collectDecisionValues(entries, type) {
  return entries.flatMap((entry) => toArray(entry.decisions)
    .filter((decision) => decision.type === type)
    .map((decision) => decision.value)
    .filter((value) => value != null && value !== ""));
}

function collectSpellChoices(dto) {
  const spells = [];
  const pushSpell = (spell, sourceRef, choice = {}) => {
    if (typeof spell === "string") {
      spells.push({
        name: spell,
        source: "",
        level: null,
        sourceRef,
        choiceId: choice.choiceId ?? ""
      });
      return;
    }

    const normalized = toObject(spell);
    const name = normalizeString(normalized.name ?? normalized.spell);
    if (!name) {
      return;
    }

    spells.push({
      name,
      source: normalizeString(normalized.source),
      level: normalized.level == null ? null : Number(normalized.level),
      sourceRef,
      choiceId: choice.choiceId ?? ""
    });
  };

  const identityChoices = toObject(dto.identityChoices);
  for (const [sourceRef, choices] of [
    [identityChoices.raceRef, identityChoices.raceChoices],
    [identityChoices.backgroundRef, identityChoices.backgroundChoices],
    ["subclass-feature", identityChoices.subclassFeatureChoices]
  ]) {
    for (const choice of toArray(choices)) {
      for (const spell of getChoiceValue(choice.value, "spell")) {
        pushSpell(spell, sourceRef, choice);
      }
    }
  }

  for (const choice of toArray(dto.grantedSpellChoices)) {
    for (const spell of toArray(choice.spells)) {
      pushSpell(spell, choice.sourceRef, choice);
    }
  }

  return spells;
}

function collectLevelSpellDecisions(group) {
  const spells = [];

  for (const entry of group.entries) {
    for (const decision of toArray(entry.decisions)) {
      if (decision.type === "spell-learned") {
        spells.push({
          ...toObject(decision.value),
          addedAtLevel: entry.classLevel
        });
      } else if (decision.type === "magical-secrets") {
        for (const spell of getChoiceValue(decision.value, "spell")) {
          spells.push({
            ...toObject(spell),
            addedAtLevel: entry.classLevel,
            fromFeature: `Magical Secrets (${humanizeRef(group.classRef)} L${entry.classLevel})`
          });
        }
      }
    }
  }

  return spells.filter((spell) => normalizeString(spell.name ?? spell.spell));
}

function getSpellName(spell) {
  return normalizeString(spell.name ?? spell.spell);
}

function createSpellcastingBlock(group, character, rulesAdapter, baseClass) {
  const classEntity = group.classEntity;
  const casterProgression = normalizeString(classEntity?.casterProgression);
  const spellcastingAbility = normalizeString(classEntity?.spellcastingAbility).toLowerCase();
  if (!casterProgression && !spellcastingAbility) {
    return null;
  }

  const ability = ABILITY_ORDER.includes(spellcastingAbility) ? spellcastingAbility : "int";
  const classLevel = group.entries.length;
  const abilityMod = abilityModifier(character.abilities?.[ability]?.score);
  const proficiencyBonus = proficiencyBonusForLevel(character.level);
  const preparedFormula = classEntity?.preparedSpells || "";
  const isPrepared = Boolean(preparedFormula);
  const isWizard = sourceIdFromRef(group.classRef) === "class-wizard";
  const progressionCantrips = toArray(classEntity?.cantripProgression);
  const progressionKnown = toArray(classEntity?.spellsKnownProgression);
  const spellChoices = collectLevelSpellDecisions(group);
  const existing = toObject(baseClass?.spellcasting);
  const existingPool = toObject(existing.spellPool);

  const cantrips = [
    ...toArray(existing.cantrips),
    ...spellChoices.filter((spell) => Number(spell.level ?? -1) === 0).map(getSpellName)
  ].filter(Boolean);

  const spellPoolEntries = [
    ...toArray(existingPool.entries),
    ...spellChoices.filter((spell) => Number(spell.level ?? 1) > 0 || spell.level == null).map((spell) => ({
      name: getSpellName(spell),
      source: normalizeString(spell.source) || "PHB",
      level: spell.level == null ? null : Number(spell.level),
      addedAtLevel: spell.addedAtLevel ?? null,
      ...(spell.fromFeature ? { fromFeature: spell.fromFeature } : {})
    }))
  ];

  const alwaysPrepared = [
    ...toArray(existing.alwaysPrepared),
    ...collectSubclassGrantedSpells(group, rulesAdapter)
      .filter((spell) => Number(spell.level ?? 0) > 0)
      .map((spell) => ({
        spell: spell.name,
        fromFeature: `${group.subclass?.shortName ?? group.subclass?.name ?? "Subclass"} (${spell.unlockAtLevel ?? "granted"})`
      }))
  ];

  return {
    ability,
    preparationStyle: isWizard
      ? "prepared-from-spellbook"
      : isPrepared
        ? "prepared-from-list"
        : "spells-known",
    spellPool: {
      type: isWizard
        ? "spellbook"
        : isPrepared
          ? "class-list"
          : "known-list",
      entries: dedupeSpellEntries(spellPoolEntries)
    },
    preparedSpells: existing.preparedSpells ?? (isPrepared ? [] : null),
    cantrips: [...new Set(cantrips)],
    alwaysPrepared: dedupeAlwaysPrepared(alwaysPrepared),
    spellAttackBonus: proficiencyBonus + abilityMod,
    spellSaveDc: 8 + proficiencyBonus + abilityMod,
    preparedFormula: preparedFormula || "",
    preparedCount: isPrepared ? Math.max(1, classLevel + abilityMod) : 0,
    spellsKnown: progressionKnown[classLevel - 1] == null ? undefined : Number(progressionKnown[classLevel - 1]),
    cantripsKnown: progressionCantrips[classLevel - 1] == null ? cantrips.length : Number(progressionCantrips[classLevel - 1])
  };
}

function dedupeSpellEntries(entries) {
  const seen = new Set();
  const deduped = [];

  for (const entry of toArray(entries)) {
    const name = getSpellName(entry);
    if (!name) {
      continue;
    }

    const key = `${name.toLowerCase()}|${normalizeSource(entry.source)}|${entry.addedAtLevel ?? ""}|${entry.fromFeature ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push({
      ...entry,
      name
    });
  }

  return deduped;
}

function dedupeAlwaysPrepared(entries) {
  const seen = new Set();
  return toArray(entries).filter((entry) => {
    const key = `${normalizeString(entry.spell).toLowerCase()}|${normalizeString(entry.fromFeature).toLowerCase()}`;
    if (!normalizeString(entry.spell) || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function collectSubclassGrantedSpells(group, rulesAdapter) {
  if (!group.subclass?.ref || typeof rulesAdapter?.getGrantedSpells !== "function") {
    return [];
  }

  return rulesAdapter.getGrantedSpells(group.subclass.ref, { includeBlocked: false })
    .filter((grant) => grant.type === "spell")
    .filter((grant) => !grant.unlockAtLevel || Number(grant.unlockAtLevel) <= group.entries.length);
}

function createFeatures(dto, classGroups, rulesAdapter) {
  const features = [];
  const identityChoices = toObject(dto.identityChoices);
  const ancestryLineage = getAncestryLineage(rulesAdapter, identityChoices.raceRef);
  const background = getRuleEntity(rulesAdapter, identityChoices.backgroundRef);

  const addFeature = (feature) => {
    const name = normalizeString(feature.name);
    const source = normalizeString(feature.source);
    if (!name || !source) {
      return;
    }

    const id = feature.id || `feat-${slugify(source)}-${slugify(name)}`;
    if (features.some((entry) => entry.id === id)) {
      return;
    }

    features.push({
      id,
      name,
      source,
      ref: normalizeString(feature.ref),
      ...(feature.linkedChoice ? { linkedChoice: feature.linkedChoice } : {})
    });
  };

  const selectedAncestry = ancestryLineage.at(-1);
  for (const choice of toArray(identityChoices.raceChoices)) {
    addFeature({
      name: labelForChoice(choice, selectedAncestry?.name || "Ancestry"),
      source: sourceIdFromRef(selectedAncestry?.ref || identityChoices.raceRef),
      ref: `${selectedAncestry?.ref || identityChoices.raceRef}#${labelForChoice(choice, selectedAncestry?.name || "Ancestry")}`,
      linkedChoice: choice.choiceId
    });
  }

  if (background?.feature) {
    addFeature({
      name: background.feature,
      source: sourceIdFromRef(background.ref),
      ref: `${background.ref}#${background.feature}`
    });
  }

  for (const group of classGroups) {
    for (const entry of group.entries) {
      const details = createLevelFeatureNames(group, entry, rulesAdapter);
      for (const feature of [...details.classFeatures, ...details.subclassFeatures]) {
        addFeature({
          name: feature.name,
          source: sourceIdFromRef(feature.subclassRef || feature.classRef || feature.ref),
          ref: feature.ref
        });
      }
    }

    for (const decision of group.entries.flatMap((entry) => toArray(entry.decisions))) {
      if (decision.type === "feat") {
        const featName = normalizeString(toObject(decision.value).feat ?? decision.value);
        if (featName) {
          const featRef = normalizeString(toObject(decision.value).ref) || makeRef("feat", featName);
          addFeature({
            name: featName,
            source: sourceIdFromRef(featRef),
            ref: featRef
          });
        }
      }
    }
  }

  for (const choice of toArray(identityChoices.subclassFeatureChoices)) {
    const subclass = classGroups.find((group) => group.subclass)?.subclass;
    addFeature({
      name: labelForChoice(choice, subclass?.shortName || "Subclass Feature"),
      source: subclass?.sourceId || "subclass-feature",
      ref: subclass?.ref ? `${subclass.ref}#${labelForChoice(choice, subclass.shortName)}` : "",
      linkedChoice: choice.choiceId
    });
  }

  return features;
}

function labelForChoice(choice, sourceName) {
  const type = normalizeString(choice.type);
  const source = normalizeString(sourceName);
  const labels = {
    "racial-asi": "Ability Score Increase",
    skill: "Skill",
    skills: "Skills",
    tool: "Tool",
    tools: "Tools",
    language: "Language",
    languages: "Languages",
    cantrip: "Cantrip",
    feat: "Feat",
    specialty: "Specialty",
    deity: "Deity",
    origin: "Origin",
    instrument: "Instrument",
    scam: "Scam",
    expertise: "Expertise"
  };

  return source ? `${labels[type] ?? titleCase(type)} (${source})` : labels[type] ?? titleCase(type);
}

function createFeatureChoices(dto, classGroups) {
  const identityChoices = toObject(dto.identityChoices);
  const subclassSource = classGroups.find((group) => group.subclass)?.subclass?.sourceId ?? "subclass-feature";
  const choices = [
    ...toArray(identityChoices.raceChoices).map((choice) => createResolvedFeatureChoice(choice, identityChoices.raceRef, "race")),
    ...toArray(identityChoices.backgroundChoices).map((choice) => createResolvedFeatureChoice(choice, identityChoices.backgroundRef, "background")),
    ...toArray(identityChoices.subclassFeatureChoices).map((choice) => createResolvedFeatureChoice(choice, subclassSource, "subclass"))
  ];

  for (const spellChoice of toArray(dto.grantedSpellChoices)) {
    choices.push({
      id: spellChoice.choiceId || `fc-granted-spell-${choices.length + 1}`,
      feature: "Granted Spell",
      source: sourceIdFromRef(spellChoice.sourceRef) || "builder-granted-spell",
      prompt: "Builder-owned granted spell choice.",
      resolved: Boolean(toArray(spellChoice.spells).length),
      value: {
        spells: toArray(spellChoice.spells).map((spell) => ({
          name: spell.name,
          source: spell.source,
          level: spell.level
        }))
      },
      blockedReason: null,
      blockedUntilLevel: null
    });
  }

  for (const pending of toArray(dto.pendingChoices)) {
    choices.push({
      id: pending.choiceId || `fc-pending-${choices.length + 1}`,
      feature: titleCase(pending.type || "Pending Choice"),
      source: sourceIdFromRef(pending.classRef) || "builder",
      prompt: pending.unlockAtClassLevel
        ? `Choose at ${humanizeRef(pending.classRef)} level ${pending.unlockAtClassLevel}.`
        : "Unresolved builder choice.",
      resolved: false,
      value: null,
      blockedReason: pending.blockedReason || null,
      blockedUntilLevel: pending.unlockAtClassLevel || null
    });
  }

  return dedupeFeatureChoices(choices);
}

function createResolvedFeatureChoice(choice, sourceRef, scope) {
  return {
    id: choice.choiceId || `fc-${scope}-${slugify(choice.type)}`,
    feature: labelForChoice(choice, humanizeRef(sourceRef)),
    source: sourceIdFromRef(sourceRef),
    prompt: `Builder ${scope} ${choice.type} choice.`,
    resolved: true,
    value: cloneJson(choice.value, {}),
    blockedReason: null,
    blockedUntilLevel: null
  };
}

function dedupeFeatureChoices(choices) {
  const seen = new Set();
  return choices.filter((choice) => {
    const key = normalizeString(choice.id);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createHitDice(classEntries) {
  return classEntries.map((entry) => ({
    size: `d${entry.hitDieSize}`,
    total: toArray(entry.levels).length,
    remaining: toArray(entry.levels).length,
    class: humanizeRef(entry.main)
  }));
}

function createHp(character, classEntries, baseCharacter) {
  const conMod = abilityModifier(character.abilities.con.score);
  let max = 0;

  const orderedLevels = classEntries
    .flatMap((classEntry) => toArray(classEntry.levels).map((level) => ({
      classEntry,
      level
    })))
    .sort((a, b) => {
      const aCharacterLevel = findCharacterLevelForClassLevel(character, a.classEntry.main, a.level.level);
      const bCharacterLevel = findCharacterLevelForClassLevel(character, b.classEntry.main, b.level.level);
      return aCharacterLevel - bCharacterLevel;
    });

  orderedLevels.forEach((entry) => {
    const rolled = Number(entry.level.hpRolled ?? 0);
    max += Math.max(1, rolled + conMod);
  });

  return {
    base: max,
    modifiers: toArray(baseCharacter.hp?.modifiers),
    max,
    current: Math.min(Number(baseCharacter.hp?.current ?? max), max),
    temp: Number(baseCharacter.hp?.temp ?? 0)
  };
}

function findCharacterLevelForClassLevel(character, classRef, classLevel) {
  let characterLevel = 0;
  for (const classEntry of toArray(character.classes)) {
    for (const level of toArray(classEntry.levels)) {
      characterLevel += 1;
      if (classKeyFromRef(classEntry.main) === classKeyFromRef(classRef) && Number(level.level) === Number(classLevel)) {
        return characterLevel;
      }
    }
  }

  return Number.POSITIVE_INFINITY;
}

function createAc(character, baseCharacter) {
  const dexMod = abilityModifier(character.abilities.dex.score);
  const base = 10;
  return {
    base,
    modifiers: [
      {
        source: "ability-dex",
        name: "Dexterity bonus",
        amount: dexMod,
        active: true
      },
      ...toArray(baseCharacter.ac?.modifiers).filter((modifier) => normalizeString(modifier.source) !== "ability-dex")
    ],
    value: base + dexMod
  };
}

function createSpeed(dto, baseCharacter, rulesAdapter) {
  const lineage = getAncestryLineage(rulesAdapter, dto.identityChoices?.raceRef);
  const speedSource = [...lineage].reverse().find((entry) => entry.speed != null)?.speed;
  const speed = Number(
    typeof speedSource === "number"
      ? speedSource
      : speedSource?.walk ?? speedSource?.speed ?? baseCharacter.speed?.base ?? 30
  );

  return {
    base: Number.isFinite(speed) ? speed : 30,
    modifiers: toArray(baseCharacter.speed?.modifiers),
    value: Number.isFinite(speed) ? speed : 30
  };
}

function createSpellSlots(classGroups) {
  let casterLevel = 0;
  const pactGroups = [];

  for (const group of classGroups) {
    const progression = normalizeString(group.classEntity?.casterProgression).toLowerCase();
    const levels = group.entries.length;

    if (progression === "full") {
      casterLevel += levels;
    } else if (progression === "1/2" || progression === "half") {
      casterLevel += Math.floor(levels / 2);
    } else if (progression === "1/3" || progression === "third") {
      casterLevel += Math.floor(levels / 3);
    } else if (progression === "pact") {
      pactGroups.push(group);
    }
  }

  const byLevel = {};
  const clampedCasterLevel = Math.max(0, Math.min(20, casterLevel));
  const slots = SPELL_SLOTS_BY_CASTER_LEVEL[clampedCasterLevel] ?? null;

  if (slots) {
    slots.forEach((max, index) => {
      byLevel[String(index + 1)] = {
        max,
        expended: 0,
        recharge: "long rest"
      };
    });
  }

  if (!Object.keys(byLevel).length && pactGroups.length) {
    const highestWarlockLevel = Math.max(...pactGroups.map((group) => group.entries.length));
    const pact = PACT_MAGIC_BY_WARLOCK_LEVEL[Math.min(20, highestWarlockLevel)];
    if (pact) {
      byLevel[String(pact.slotLevel)] = {
        max: pact.slots,
        expended: 0,
        recharge: "short or long rest"
      };
    }
  }

  return Object.keys(byLevel).length ? { byLevel } : null;
}

function createResources(classEntries, features, character) {
  const resources = [];
  const hasFeature = (name, source = "") => features.some((feature) => (
    normalizeString(feature.name).toLowerCase() === name.toLowerCase()
    && (!source || normalizeString(feature.source) === source)
  ));
  const classLevel = (classSource) => toArray(classEntries.find((entry) => sourceIdFromRef(entry.main) === classSource)?.levels).length;

  if (hasFeature("Rage")) {
    const level = classLevel("class-barbarian");
    const max = level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
    resources.push({
      id: "rage",
      name: "Rage",
      source: "class-barbarian",
      kind: "counter",
      max,
      current: max,
      recharge: "long rest"
    });
  }

  if (hasFeature("Second Wind")) {
    resources.push({
      id: "second-wind",
      name: "Second Wind",
      source: "class-fighter",
      kind: "counter",
      max: 1,
      current: 1,
      recharge: "short or long rest"
    });
  }

  if (hasFeature("Action Surge")) {
    const max = classLevel("class-fighter") >= 17 ? 2 : 1;
    resources.push({
      id: "action-surge",
      name: "Action Surge",
      source: "class-fighter",
      kind: "counter",
      max,
      current: max,
      recharge: "short or long rest"
    });
  }

  if (features.some((feature) => normalizeString(feature.name).startsWith("Channel Divinity"))) {
    const level = classLevel("class-cleric");
    const max = level >= 18 ? 3 : level >= 6 ? 2 : 1;
    resources.push({
      id: "channel-divinity",
      name: "Channel Divinity",
      source: "class-cleric",
      kind: "counter",
      max,
      current: max,
      recharge: "short or long rest"
    });
  }

  if (hasFeature("Arcane Recovery")) {
    resources.push({
      id: "arcane-recovery",
      name: "Arcane Recovery",
      source: "class-wizard",
      kind: "counter",
      max: 1,
      current: 1,
      recharge: "long rest"
    });
  }

  if (hasFeature("Bardic Inspiration")) {
    const max = Math.max(1, abilityModifier(character.abilities.cha.score));
    resources.push({
      id: "bardic-inspiration",
      name: "Bardic Inspiration",
      source: "class-bard",
      kind: "counter",
      max,
      current: max,
      recharge: classLevel("class-bard") >= 5 ? "short or long rest" : "long rest"
    });
  }

  if (hasFeature("Portent", "subclass-wizard-divination")) {
    resources.push({
      id: "portent",
      name: "Portent Dice",
      source: "subclass-wizard-divination",
      kind: "counter",
      max: 2,
      current: 2,
      recharge: "long rest"
    });
  }

  return resources;
}

function createBuilderOverrides(baseCharacter, generatedAt) {
  const overrides = toArray(baseCharacter.builderOverrides).map((override) => cloneJson(override, {}));

  for (const external of BUILDER_EXTERNAL_SYSTEMS) {
    if (overrides.some((override) => override.id === external.id)) {
      continue;
    }

    overrides.push({
      ...external,
      manualValue: null,
      appliedAt: generatedAt
    });
  }

  return overrides;
}

function compileBuilderDto(dto, baseCharacter, rulesAdapter, options = {}) {
  const normalizedDto = normalizeBuilderDecisions(dto);
  const generatedAt = normalizeString(options.generatedAt) || new Date().toISOString();
  const character = normalizeCharacter(baseCharacter ?? createEmptyCharacter());
  const plan = toArray(normalizedDto.levelPlan)
    .filter((entry) => normalizeString(entry.classRef))
    .sort((a, b) => Number(a.characterLevel ?? 0) - Number(b.characterLevel ?? 0));

  character.id = normalizedDto.characterId || character.id;
  character.lastModified = generatedAt;
  character.sourcePolicy = getSourcePolicy(rulesAdapter, character);
  character.identity = createIdentity(normalizedDto, character, rulesAdapter);
  character.level = Math.max(1, plan.length);
  character.proficiencyBonus = proficiencyBonusForLevel(character.level);
  character.abilities = createAbilities(
    normalizedDto,
    options.hasBaseCharacter ? baseCharacter : null,
    rulesAdapter
  );
  character.skills = {};
  character.proficiencies = {
    armor: [],
    weapons: [],
    tools: [],
    languages: [],
    savingThrows: []
  };

  const classGroups = createClassGroups(plan, rulesAdapter, character.abilities);
  applyIdentityGrants(character, normalizedDto, rulesAdapter);
  applyClassGrantsAndDecisions(character, classGroups);
  applySubclassFeatureChoices(character, normalizedDto, classGroups);
  const proficiencyLedger = applyProficiencyLedgerReplacements(character, normalizedDto, rulesAdapter);

  character.classes = classGroups.map((group) => createClassEntry(group, character, rulesAdapter, baseCharacter ?? createEmptyCharacter()));
  character.hitDice = createHitDice(character.classes);
  character.initiative = abilityModifier(character.abilities.dex.score);
  character.hp = createHp(character, character.classes, baseCharacter ?? createEmptyCharacter());
  character.ac = createAc(character, baseCharacter ?? createEmptyCharacter());
  character.speed = createSpeed(normalizedDto, baseCharacter ?? createEmptyCharacter(), rulesAdapter);
  character.spellSlots = createSpellSlots(classGroups);

  const features = createFeatures(normalizedDto, classGroups, rulesAdapter);
  character.features = features;
  character.featureChoices = createFeatureChoices(normalizedDto, classGroups);
  character.resources = mergeResources(toArray(baseCharacter?.resources), createResources(character.classes, features, character));
  character.builderOverrides = createBuilderOverrides(baseCharacter ?? createEmptyCharacter(), generatedAt);
  character._meta = {
    ...toObject(character._meta),
    demonstrates: [
      ...new Set([
        ...toArray(character._meta?.demonstrates),
        "Compiled from builder-decisions-v1 by CharacterBuilderCompiler."
      ])
    ],
    builderProficiencyLedger: {
      summary: proficiencyLedger.summary,
      replacements: proficiencyLedger.replacementChoices.map((choice) => ({
        choiceId: choice.choiceId,
        category: choice.category,
        selectedValues: choice.selectedValues,
        resolved: choice.resolved
      }))
    }
  };

  applyGrantedSpellsToSpellcasting(character, collectSpellChoices(normalizedDto));
  return normalizeCharacter(character);
}

function mergeResources(existingResources, compiledResources) {
  const resources = toArray(existingResources).map((resource) => cloneJson(resource, {}));
  const existingIds = new Set(resources.map((resource) => resource.id));

  for (const resource of compiledResources) {
    if (!existingIds.has(resource.id)) {
      resources.push(resource);
    }
  }

  return resources;
}

function applyGrantedSpellsToSpellcasting(character, spellChoices) {
  if (!toArray(spellChoices).length) {
    return;
  }

  const firstCaster = toArray(character.classes).find((entry) => entry.spellcasting);
  if (!firstCaster) {
    return;
  }

  for (const spell of spellChoices) {
    const name = getSpellName(spell);
    if (!name) {
      continue;
    }

    if (Number(spell.level ?? 0) === 0) {
      if (!firstCaster.spellcasting.cantrips.includes(name)) {
        firstCaster.spellcasting.cantrips.push(name);
      }
      continue;
    }

    firstCaster.spellcasting.alwaysPrepared = dedupeAlwaysPrepared([
      ...toArray(firstCaster.spellcasting.alwaysPrepared),
      {
        spell: name,
        fromFeature: humanizeRef(spell.sourceRef) || "Builder Granted Spell"
      }
    ]);
  }
}

function getBuilderDto(builder, rulesAdapter) {
  if (builder && typeof builder.toDTO === "function") {
    return builder.toDTO({ includeComputedPendingChoices: true });
  }

  return CharacterBuilder.fromDTO(builder ?? {}, { rulesAdapter })
    .toDTO({ includeComputedPendingChoices: true });
}

function getBlockingIdentityChoiceIssues(builder, builderDto, rulesAdapter) {
  const runtime = builder && typeof builder.getIdentityChoiceRequirements === "function"
    ? builder
    : CharacterBuilder.fromDTO(builderDto, { rulesAdapter });

  return toArray(runtime.getIdentityChoiceRequirements?.())
    .filter((entry) => entry.required && !entry.resolved)
    .map((entry) => `${entry.sourceName || entry.sourceRef || "Selected identity"}: ${entry.blockedReason || `${entry.definition?.label || entry.definition?.choiceId || "choice"} is unresolved`}`);
}

/**
 * Converts builder-decision history into the final v1 character DTO pipeline.
 * The compiler intentionally covers builder-owned progression systems and keeps
 * inventory, curated spellbooks, and other final-sheet-only state outside this
 * phase unless an existing character DTO is supplied as a preservation base.
 */
export class CharacterBuilderCompiler {
  #rulesAdapter;

  constructor(options = {}) {
    this.#rulesAdapter = options.rulesAdapter ?? null;
  }

  /**
   * Updates the rules adapter used during compilation.
   */
  setRulesAdapter(rulesAdapter) {
    this.#rulesAdapter = rulesAdapter;
    return this;
  }

  get rulesAdapter() {
    return this.#rulesAdapter;
  }

  /**
   * Returns the effective proficiency ledger used by production validation and export.
   */
  createProficiencyLedger(builder, options = {}) {
    const builderDto = getBuilderDto(builder, this.#rulesAdapter);
    return createProficiencyLedger(builderDto, this.#rulesAdapter, options);
  }

  /**
   * Returns visible ability math and verifies it against the compiled DTO.
   */
  createAbilityImpactPreview(builder, options = {}) {
    return createAbilityImpactPreview(builder, this.#rulesAdapter, {
      ...options,
      compiler: this
    });
  }

  /**
   * Compiles a builder runtime object or plain builder-decision DTO into a CharacterModel.
   */
  toCharacterModel(builder, options = {}) {
    const builderDto = getBuilderDto(builder, this.#rulesAdapter);
    const blockingIssues = getBlockingIdentityChoiceIssues(builder, builderDto, this.#rulesAdapter);
    if (blockingIssues.length) {
      throw new Error(`Cannot compile final character DTO until required identity choices are resolved: ${blockingIssues.join("; ")}`);
    }

    const baseCharacterDto = options.baseCharacterDto
      ?? options.characterDto
      ?? options.existingCharacterDto
      ?? null;
    const baseCharacter = baseCharacterDto ? normalizeCharacter(baseCharacterDto) : createEmptyCharacter();
    const compiled = compileBuilderDto(builderDto, baseCharacter, this.#rulesAdapter, {
      ...options,
      hasBaseCharacter: Boolean(baseCharacterDto)
    });
    return CharacterModel.fromInput(compiled);
  }

  /**
   * Compiles and exports a final v1 character DTO.
   */
  toCharacterDto(builder, options = {}) {
    return this.toCharacterModel(builder, options).toExportObject(options);
  }
}
