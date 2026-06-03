import { CharacterBuilder } from "./character-builder.js";
import { ABILITY_ORDER, SKILL_TO_ABILITY } from "../shared/character-state.js";

const CATEGORY_ORDER = ["skill", "savingThrow", "tool", "language", "armor", "weapon"];
const REPLACEMENT_CATEGORIES = new Set(["skill"]);

const CATEGORY_LABELS = {
  armor: "Armor",
  language: "Languages",
  savingThrow: "Saving Throws",
  skill: "Skills",
  tool: "Tools",
  weapon: "Weapons"
};

const ABILITY_LABELS = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
};

const SKILL_LABELS = {
  animalHandling: "Animal Handling",
  sleightOfHand: "Sleight of Hand"
};

const STANDARD_SKILLS = Object.keys(SKILL_TO_ABILITY).map((value) => ({
  value,
  label: formatSkillLabel(value),
  ability: SKILL_TO_ABILITY[value]
}));

const SKILL_KEY_BY_TOKEN = new Map(
  STANDARD_SKILLS.flatMap((skill) => [
    [normalizeToken(skill.value), skill.value],
    [normalizeToken(skill.label), skill.value]
  ])
);

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return isObject(value) ? value : {};
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeToken(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function sourceIdFromRef(ref) {
  return normalizeText(ref).split("#")[0].replace(/\.json$/i, "");
}

function titleCaseToken(value) {
  return normalizeText(value)
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

function cleanRefName(ref) {
  return titleCaseToken(sourceIdFromRef(ref).replace(/^(background|class|race|subclass|feat)-/, ""));
}

function formatEntityName(entity, fallback = "Unknown") {
  return entity?.name || entity?.shortName || (entity?.ref ? cleanRefName(entity.ref) : fallback);
}

function formatSkillLabel(value) {
  return SKILL_LABELS[value] ?? titleCaseToken(value);
}

function formatCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? titleCaseToken(category);
}

function normalizeCategory(type) {
  const normalized = normalizeText(type).toLowerCase();
  const compact = normalized.replace(/\s+/g, "");

  if (["skill", "skills", "expertise"].includes(normalized)) return "skill";
  if (["savingthrow", "savingthrows", "save", "saves"].includes(compact)) return "savingThrow";
  if (["tool", "tools", "instrument"].includes(normalized)) return "tool";
  if (["language", "languages"].includes(normalized)) return "language";
  if (["armor", "armors"].includes(normalized)) return "armor";
  if (["weapon", "weapons"].includes(normalized)) return "weapon";

  return normalized;
}

function normalizeCategoryValue(category, value) {
  if (category === "skill") {
    const token = normalizeToken(value);
    return SKILL_KEY_BY_TOKEN.get(token) ?? slugify(value).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
  }

  if (category === "savingThrow") {
    const normalized = normalizeText(value).toLowerCase().slice(0, 3);
    return ABILITY_ORDER.includes(normalized) ? normalized : normalizeText(value).toLowerCase();
  }

  return normalizeText(value).toLowerCase();
}

export function normalizeProficiencyChoiceValue(category, value) {
  return normalizeCategoryValue(category, value);
}

function formatCategoryValue(category, value) {
  if (category === "skill") {
    return formatSkillLabel(value);
  }

  if (category === "savingThrow") {
    return ABILITY_LABELS[value] ?? String(value).toUpperCase();
  }

  if (category === "armor") {
    if (value === "shield" || value === "shields") return "Shields";
    if (value === "light") return "Light Armor";
    if (value === "medium") return "Medium Armor";
    if (value === "heavy") return "Heavy Armor";
  }

  if (category === "weapon") {
    if (value === "simple") return "Simple Weapons";
    if (value === "martial") return "Martial Weapons";
  }

  return titleCaseToken(value);
}

function formatSourceMeta(source = {}) {
  return [source.sourceType, source.sourceName].filter(Boolean).join(" | ");
}

function getEntity(rules, ref) {
  return ref && rules?.getRuleEntity ? rules.getRuleEntity(ref) : null;
}

function getAncestryLineage(rules, ancestryRef) {
  const ancestry = getEntity(rules, ancestryRef);
  if (!ancestry) {
    return [];
  }

  if (!ancestry.parentRef) {
    return [ancestry];
  }

  const parent = getEntity(rules, ancestry.parentRef);
  return parent ? [parent, ancestry] : [ancestry];
}

function createEntitySource(sourceType, entity, fallbackRef, extra = {}) {
  const sourceName = formatEntityName(entity, cleanRefName(fallbackRef));
  const sourceId = sourceIdFromRef(entity?.ref || fallbackRef || sourceName);

  return {
    sourceId,
    sourceName,
    sourceType,
    sourceLabel: [sourceType, sourceName].filter(Boolean).join(" | "),
    ...extra
  };
}

function getFixedGrantValues(block, collection) {
  const entry = block?.[collection];
  if (!entry) {
    return [];
  }

  if (Array.isArray(entry)) {
    return entry;
  }

  return toArray(entry.fixed);
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

function getDecisionValues(entry = {}, type) {
  const category = normalizeCategory(type);
  const singular = category === "savingThrow" ? "savingThrow" : category;

  return toArray(entry.decisions)
    .filter((decision) => normalizeCategory(decision.type) === category)
    .flatMap((decision) => getChoiceValue(decision.value, singular));
}

function getIdentityChoiceValues(choice = {}, category) {
  const singular = category === "savingThrow" ? "savingThrow" : category;
  return getChoiceValue(choice.value, singular);
}

function makeRecord(input = {}) {
  const category = normalizeCategory(input.category);
  const value = normalizeCategoryValue(category, input.value);
  const id = input.id ?? [
    input.kind ?? "grant",
    input.source?.sourceId,
    category,
    value,
    input.choiceId,
    input.characterLevel
  ].filter(Boolean).join("-");

  return {
    id,
    kind: input.kind ?? "fixed",
    category,
    value,
    label: formatCategoryValue(category, value),
    source: input.source ?? {},
    sourceName: input.source?.sourceName ?? "",
    sourceLabel: input.source?.sourceLabel ?? formatSourceMeta(input.source),
    choiceId: input.choiceId ?? "",
    characterLevel: input.characterLevel ?? null,
    classLevel: input.classLevel ?? null
  };
}

function addFixedGrantRecords(records, grants, source) {
  for (const [collection, category] of [
    ["armor", "armor"],
    ["weapons", "weapon"],
    ["tools", "tool"],
    ["skills", "skill"],
    ["languages", "language"]
  ]) {
    for (const value of getFixedGrantValues(grants, collection)) {
      records.push(makeRecord({
        category,
        value,
        source,
        kind: "fixed"
      }));
    }
  }
}

function addSavingThrowRecords(records, values, source) {
  for (const value of toArray(values)) {
    records.push(makeRecord({
      category: "savingThrow",
      value,
      source,
      kind: "fixed"
    }));
  }
}

function getOptionValue(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.value || option?.ref || option?.sourceId || option?.name || option?.shortName || option?.label || "";
}

function createChoiceGroup(input = {}) {
  const category = normalizeCategory(input.category ?? input.type);
  const options = toArray(input.options)
    .map((option) => normalizeCategoryValue(category, getOptionValue(option)))
    .filter(Boolean);

  return {
    id: input.id,
    category,
    type: input.type ?? category,
    label: input.label ?? formatCategoryLabel(category),
    sourceLabel: input.sourceLabel ?? "",
    sourceName: input.sourceName ?? "",
    source: input.source ?? {},
    count: Math.max(1, Number(input.count ?? 1)),
    options: [...new Set(options)],
    selectedValues: toArray(input.selectedValues)
      .map((value) => normalizeCategoryValue(category, value))
      .filter(Boolean),
    render: input.render !== false,
    characterLevel: input.characterLevel ?? null,
    classLevel: input.classLevel ?? null
  };
}

function findChoiceRecord(choices = [], definition = {}) {
  return toArray(choices).find((choice) => (
    choice.choiceId === definition.choiceId
    || choice.choiceId === definition.id
  )) ?? null;
}

function addIdentityChoiceGroups(choiceGroups, entity, choices, source, render = false) {
  for (const definition of toArray(entity?.choiceDefinitions)) {
    const category = normalizeCategory(definition.type);
    if (!CATEGORY_ORDER.includes(category)) {
      continue;
    }

    const choice = findChoiceRecord(choices, definition);
    choiceGroups.push(createChoiceGroup({
      id: definition.decisionId ?? definition.choiceId ?? definition.id,
      category,
      type: definition.type,
      label: definition.label || `${source.sourceName} ${formatCategoryLabel(category)}`,
      source,
      sourceName: source.sourceName,
      sourceLabel: source.sourceLabel,
      count: definition.count,
      options: definition.options,
      selectedValues: choice ? getIdentityChoiceValues(choice, category) : [],
      render
    }));
  }

  const definitionIds = new Set(toArray(entity?.choiceDefinitions).flatMap((definition) => [
    definition.id,
    definition.choiceId
  ]).filter(Boolean));

  for (const choice of toArray(choices).filter((entry) => !definitionIds.has(entry.choiceId))) {
    const category = normalizeCategory(choice.type);
    if (!CATEGORY_ORDER.includes(category)) {
      continue;
    }

    const values = getIdentityChoiceValues(choice, category);
    if (!values.length) {
      continue;
    }

    choiceGroups.push(createChoiceGroup({
      id: choice.choiceId || `${source.sourceId}-${category}-choice`,
      category,
      type: choice.type,
      label: `${source.sourceName} ${formatCategoryLabel(category)}`,
      source,
      sourceName: source.sourceName,
      sourceLabel: source.sourceLabel,
      count: values.length,
      options: values,
      selectedValues: values,
      render
    }));
  }
}

function getClassSummary(entry = {}, rules) {
  const classEntity = getEntity(rules, entry.classRef);
  return `${formatEntityName(classEntity, cleanRefName(entry.classRef))} ${entry.classLevel || ""}`.trim();
}

function getLevelChoiceLabel(entry = {}, rules, requirement = {}) {
  const classEntity = getEntity(rules, entry.classRef);
  const className = formatEntityName(classEntity, cleanRefName(entry.classRef));
  const category = normalizeCategory(requirement.type ?? "choice");
  const typeLabel = category === "skill"
    ? "Skill"
    : category === "tool"
      ? "Tool"
      : category === "language"
        ? "Language"
        : formatCategoryLabel(category);
  return `${className} Level ${entry.classLevel ?? "?"} ${typeLabel} Choice`;
}

function getClassSource(entry = {}, rules) {
  const classEntity = getEntity(rules, entry.classRef);
  return createEntitySource("Class", classEntity, entry.classRef, {
    sourceLabel: `${formatEntityName(classEntity, cleanRefName(entry.classRef))} Level ${entry.classLevel ?? "?"}`
  });
}

export function collectProficiencyInputs(builderDto = {}, rules, options = {}) {
  const builder = CharacterBuilder.fromDTO(builderDto, { rulesAdapter: rules });
  const dto = builder.toDTO({ includeComputedPendingChoices: false });
  const identity = toObject(dto.identityChoices);
  const levelPlan = builder.getLevelPlan({ includeDetails: true });
  const records = [];
  const choiceGroups = [];
  const ancestryLineage = getAncestryLineage(rules, identity.raceRef);
  const background = getEntity(rules, identity.backgroundRef);

  for (const ancestry of ancestryLineage) {
    const source = createEntitySource("Ancestry", ancestry, ancestry.ref);
    addFixedGrantRecords(records, ancestry.grants, source);
    addIdentityChoiceGroups(choiceGroups, ancestry, identity.raceChoices, source, false);
  }

  if (background) {
    const source = createEntitySource("Background", background, identity.backgroundRef);
    addFixedGrantRecords(records, background.grants, source);
    addIdentityChoiceGroups(choiceGroups, background, identity.backgroundChoices, source, false);
  }

  const processedClassRefs = new Set();
  const firstClassRef = sourceIdFromRef(levelPlan[0]?.classRef);

  for (const entry of levelPlan) {
    const classRefKey = sourceIdFromRef(entry.classRef);
    const classSource = getClassSource(entry, rules);
    const classEntity = getEntity(rules, entry.classRef);

    if (classRefKey && !processedClassRefs.has(classRefKey)) {
      const isFirstClass = classRefKey === firstClassRef;
      processedClassRefs.add(classRefKey);
      addFixedGrantRecords(
        records,
        isFirstClass ? classEntity?.startingProficiencies : classEntity?.multiclassing?.proficienciesGained,
        classSource
      );

      if (isFirstClass) {
        addSavingThrowRecords(records, classEntity?.savingThrows, classSource);
      }
    }

    for (const requirement of toArray(entry.requirements)) {
      const category = normalizeCategory(requirement.type);
      if (!["skill", "tool", "language"].includes(category)) {
        continue;
      }

      const id = requirement.decisionId ?? `level-${entry.characterLevel}-${category}`;
      const selectedValues = options.choiceSelections?.[id] ?? getDecisionValues(entry, category);
      choiceGroups.push(createChoiceGroup({
        id,
        category,
        type: requirement.type,
        label: getLevelChoiceLabel(entry, rules, requirement),
        source: classSource,
        sourceName: classSource.sourceName,
        sourceLabel: `Level ${entry.characterLevel} | ${getClassSummary(entry, rules)}`,
        count: requirement.count,
        options: requirement.options,
        selectedValues,
        characterLevel: entry.characterLevel,
        classLevel: entry.classLevel,
        render: true
      }));
    }

    const requirementTypes = new Set(toArray(entry.requirements).map((requirement) => normalizeCategory(requirement.type)));
    for (const category of ["skill", "tool", "language"]) {
      if (requirementTypes.has(category)) {
        continue;
      }

      const values = getDecisionValues(entry, category);
      if (!values.length) {
        continue;
      }

      choiceGroups.push(createChoiceGroup({
        id: `level-${entry.characterLevel}-${category}-saved`,
        category,
        type: category,
        label: `${getClassSummary(entry, rules)} Saved ${formatCategoryLabel(category)}`,
        source: classSource,
        sourceName: classSource.sourceName,
        sourceLabel: `Level ${entry.characterLevel} | ${getClassSummary(entry, rules)}`,
        count: values.length,
        options: values,
        selectedValues: values,
        characterLevel: entry.characterLevel,
        classLevel: entry.classLevel,
        render: false
      }));
    }
  }

  return {
    characterId: dto.characterId,
    records,
    choiceGroups,
    proficiencyReplacements: toArray(dto.proficiencyReplacements)
  };
}

function createEmptyLedger() {
  return Object.fromEntries(CATEGORY_ORDER.map((category) => [category, new Map()]));
}

function getAccepted(accepted, category, value) {
  return accepted[category]?.get(value) ?? null;
}

function addAccepted(accepted, record) {
  if (!accepted[record.category]) {
    accepted[record.category] = new Map();
  }

  accepted[record.category].set(record.value, record);
}

function summarizeDuplicate(existing = {}) {
  return existing.sourceName || existing.source?.sourceName || "another source";
}

export function createReplacementKey(parts = []) {
  return `replacement-${parts.map(slugify).filter(Boolean).join("-")}`;
}

function addReplacementRequest(requests, request = {}) {
  if (!REPLACEMENT_CATEGORIES.has(request.category)) {
    return;
  }

  const id = request.id ?? createReplacementKey([
    request.sourceLabel,
    request.category,
    request.value,
    request.reason
  ]);
  const existing = requests.get(id) ?? {
    id,
    category: request.category,
    label: "Replacement Needed",
    sourceLabel: request.sourceLabel ?? "",
    sourceName: request.sourceName ?? "",
    count: 0,
    reasons: [],
    blockedValues: []
  };

  existing.count += Number(request.count ?? 1);
  existing.reasons.push(request.reason);
  existing.blockedValues.push({
    value: request.value,
    label: formatCategoryValue(request.category, request.value),
    existingSourceName: request.existingSourceName ?? "",
    duplicateSourceName: request.sourceName ?? ""
  });
  requests.set(id, existing);
}

function createCollision(record, existing) {
  return {
    category: record.category,
    value: record.value,
    label: record.label,
    existingSourceName: summarizeDuplicate(existing),
    duplicateSourceName: record.sourceName,
    reason: `${record.label} is already granted by ${summarizeDuplicate(existing)}.`
  };
}

function createChoiceOptionModel(group, optionValue, selectedSet, validSelectedSet, priorAccepted, selectedCount) {
  const duplicate = getAccepted(priorAccepted, group.category, optionValue);
  const checked = validSelectedSet.has(optionValue);
  const savedDuplicate = selectedSet.has(optionValue) && Boolean(duplicate);
  const limitBlocked = !checked && !duplicate && selectedCount >= group.count;
  const disabled = Boolean(duplicate) || limitBlocked;
  const reason = duplicate
    ? `Already granted by ${summarizeDuplicate(duplicate)}`
    : checked
      ? "Selected"
      : limitBlocked
        ? `Already picked ${group.count}`
        : "Available";

  return {
    value: optionValue,
    label: formatCategoryValue(group.category, optionValue),
    checked,
    disabled,
    savedDuplicate,
    reason: savedDuplicate ? `Saved duplicate | ${reason}` : reason,
    status: duplicate ? "duplicate" : checked ? "checked" : disabled ? "disabled" : "available"
  };
}

function processFixedRecord(record, accepted, collisions, replacementRequests) {
  const existing = getAccepted(accepted, record.category, record.value);
  if (!existing) {
    addAccepted(accepted, record);
    return;
  }

  const collision = createCollision(record, existing);
  collisions.push(collision);
  addReplacementRequest(replacementRequests, {
    id: createReplacementKey(["fixed", record.sourceName, record.category, record.value]),
    category: record.category,
    value: record.value,
    sourceLabel: record.sourceLabel,
    sourceName: record.sourceName,
    existingSourceName: summarizeDuplicate(existing),
    reason: `${record.label} fixed grant collides with ${summarizeDuplicate(existing)}.`
  });
}

function processChoiceGroup(group, accepted, choiceModels, blockedPicks, replacementRequests) {
  const priorAccepted = Object.fromEntries(
    Object.entries(accepted).map(([category, entries]) => [category, new Map(entries)])
  );
  const optionValues = group.options.length ? group.options : group.selectedValues;
  const optionSet = new Set(optionValues);
  const selectedSet = new Set(group.selectedValues.filter((value) => optionSet.has(value)));
  const validSelected = [];
  const invalidSelections = [];

  for (const value of selectedSet) {
    const duplicate = getAccepted(priorAccepted, group.category, value);
    if (duplicate) {
      const blocked = {
        category: group.category,
        value,
        label: formatCategoryValue(group.category, value),
        sourceLabel: group.sourceLabel,
        sourceName: group.sourceName,
        existingSourceName: summarizeDuplicate(duplicate),
        reason: `${formatCategoryValue(group.category, value)} is already granted by ${summarizeDuplicate(duplicate)}.`
      };
      invalidSelections.push(blocked);
      blockedPicks.push(blocked);
      addReplacementRequest(replacementRequests, {
        id: createReplacementKey([group.id]),
        category: group.category,
        value,
        sourceLabel: group.label,
        sourceName: group.sourceName,
        existingSourceName: summarizeDuplicate(duplicate),
        reason: `${formatCategoryValue(group.category, value)} was saved here but is already granted by ${summarizeDuplicate(duplicate)}.`
      });
      continue;
    }

    if (validSelected.length < group.count) {
      validSelected.push(value);
      addAccepted(accepted, makeRecord({
        category: group.category,
        value,
        source: {
          ...group.source,
          sourceName: group.sourceName,
          sourceLabel: group.sourceLabel
        },
        kind: "choice",
        choiceId: group.id,
        characterLevel: group.characterLevel,
        classLevel: group.classLevel
      }));
    }
  }

  const validSelectedSet = new Set(validSelected);
  const rows = optionValues.map((value) => createChoiceOptionModel(
    group,
    value,
    selectedSet,
    validSelectedSet,
    priorAccepted,
    validSelected.length
  ));
  const overLimit = selectedSet.size - invalidSelections.length > group.count;

  choiceModels.push({
    id: group.id,
    category: group.category,
    label: group.label,
    sourceLabel: group.sourceLabel,
    count: group.count,
    selectedValues: [...selectedSet],
    validSelectedValues: validSelected,
    selectedCount: validSelected.length,
    missingCount: Math.max(0, group.count - validSelected.length),
    invalidSelections,
    overLimit,
    resolved: validSelected.length === group.count && !invalidSelections.length && !overLimit,
    render: group.render,
    options: rows,
    violations: [
      ...invalidSelections.map((selection) => `${selection.label}: already granted by ${selection.existingSourceName}.`),
      overLimit ? `Picked ${selectedSet.size}; limit is ${group.count}.` : ""
    ].filter(Boolean)
  });
}

function createReplacementChoiceModel(request, accepted, selectedValues = []) {
  const selectedSet = new Set(toArray(selectedValues)
    .map((value) => normalizeCategoryValue(request.category, value))
    .filter(Boolean));
  const validSelected = [];
  const rows = STANDARD_SKILLS.map((skill) => {
    const duplicate = getAccepted(accepted, request.category, skill.value);
    const checked = selectedSet.has(skill.value) && !duplicate && validSelected.length < request.count;

    if (checked) {
      validSelected.push(skill.value);
    }

    return {
      value: skill.value,
      label: skill.label,
      checked,
      disabled: Boolean(duplicate),
      reason: duplicate ? `Already proficient from ${summarizeDuplicate(duplicate)}` : "Available",
      status: duplicate ? "duplicate" : checked ? "checked" : "available"
    };
  });

  for (const value of validSelected) {
    addAccepted(accepted, makeRecord({
      category: request.category,
      value,
      source: {
        sourceId: request.id,
        sourceName: request.label,
        sourceType: "Replacement",
        sourceLabel: request.sourceLabel
      },
      kind: "replacement",
      choiceId: request.id
    }));
  }

  return {
    id: request.id,
    choiceId: request.id,
    category: request.category,
    label: request.label,
    sourceLabel: request.sourceLabel,
    count: request.count,
    selectedValues: validSelected,
    selectedCount: validSelected.length,
    missingCount: Math.max(0, request.count - validSelected.length),
    resolved: validSelected.length === request.count,
    reasons: request.reasons,
    blockedValues: request.blockedValues,
    options: rows,
    violations: validSelected.length === request.count
      ? []
      : [`Choose ${request.count} replacement ${request.count === 1 ? "skill" : "skills"}.`]
  };
}

function createLedgerSummary(accepted, collisions, blockedPicks, replacementChoices) {
  const categoryCounts = Object.fromEntries(CATEGORY_ORDER.map((category) => [
    category,
    accepted[category]?.size ?? 0
  ]));

  return {
    categoryCounts,
    duplicatePickCount: blockedPicks.length,
    fixedCollisionCount: collisions.length,
    replacementCount: replacementChoices.reduce((total, choice) => total + Number(choice.count ?? 0), 0),
    openReplacementCount: replacementChoices.filter((choice) => !choice.resolved).length
  };
}

function acceptedToEntries(accepted, category) {
  const values = [...(accepted[category]?.values() ?? [])];
  const order = category === "skill"
    ? new Map(STANDARD_SKILLS.map((skill, index) => [skill.value, index]))
    : category === "savingThrow"
      ? new Map(ABILITY_ORDER.map((ability, index) => [ability, index]))
      : null;

  return values
    .sort((left, right) => {
      if (order) {
        return (order.get(left.value) ?? 99) - (order.get(right.value) ?? 99);
      }

      return left.label.localeCompare(right.label);
    })
    .map((entry) => ({
      category,
      value: entry.value,
      label: entry.label,
      sourceName: entry.sourceName,
      sourceLabel: entry.sourceLabel,
      kind: entry.kind
    }));
}

function getReplacementSelections(inputReplacements = [], explicitSelections = null) {
  if (explicitSelections) {
    return toObject(explicitSelections);
  }

  return Object.fromEntries(toArray(inputReplacements)
    .map((replacement) => {
      const normalized = toObject(replacement);
      const id = normalizeText(normalized.choiceId || normalized.id);
      const values = toArray(normalized.values ?? normalized.selectedValues ?? normalized.picks ?? normalized.value);
      return id ? [id, values] : null;
    })
    .filter(Boolean));
}

export function createProficiencyLedgerFromInputs(inputs = {}, options = {}) {
  const accepted = createEmptyLedger();
  const collisions = [];
  const blockedPicks = [];
  const replacementRequests = new Map();
  const choiceModels = [];

  for (const record of toArray(inputs.records).map(makeRecord)) {
    processFixedRecord(record, accepted, collisions, replacementRequests);
  }

  for (const group of toArray(inputs.choiceGroups).map(createChoiceGroup)) {
    processChoiceGroup(group, accepted, choiceModels, blockedPicks, replacementRequests);
  }

  const replacementSelections = getReplacementSelections(
    inputs.proficiencyReplacements,
    options.replacementSelections
  );
  const replacementChoices = [...replacementRequests.values()].map((request) => (
    createReplacementChoiceModel(request, accepted, replacementSelections[request.id])
  ));
  const replacementById = new Map(replacementChoices.map((choice) => [choice.id, choice]));
  for (const choiceModel of choiceModels) {
    const replacement = replacementById.get(createReplacementKey([choiceModel.id]));
    choiceModel.replacementResolved = Boolean(replacement?.resolved);
  }

  return {
    characterId: inputs.characterId ?? "proficiency-ledger",
    summary: createLedgerSummary(accepted, collisions, blockedPicks, replacementChoices),
    ledger: Object.fromEntries(CATEGORY_ORDER.map((category) => [category, acceptedToEntries(accepted, category)])),
    choiceModels: choiceModels.filter((choice) => choice.render),
    allChoiceModels: choiceModels,
    replacementChoices,
    collisions,
    blockedPicks
  };
}

export function createProficiencyLedger(builderDto = {}, rules, options = {}) {
  const inputs = collectProficiencyInputs(builderDto, rules, options);
  return createProficiencyLedgerFromInputs(inputs, {
    replacementSelections: options.replacementSelections
  });
}
