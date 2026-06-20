import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    appendRulesEntry,
    createDescription,
    createElement
} from "../../PlayerSheetHtmlHelper.js";
import {
    getCatalogDtoId,
    getCatalogDisplayName,
    getCatalogSource,
    getValue,
    normalizeSearchText,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    appendCatalogRecord,
    expandCatalogRecords,
    isFeatureRecord,
    resolveCatalogEntity,
    resolveCatalogFeatureEntity
} from "../Catalog/LevelEditorCatalogChoiceResolver.js";
import {
    buildCatalogProfile
} from "../CatalogProfile/Builder.js";
import {
    getProfileChoiceDefinitions
} from "../CatalogProfile/Choices.js";
import { enrichOptionalFeatureOptions } from "../Catalog/LevelEditorOptionalFeatureCatalog.js";
import { getSpellOptionsForChoice } from "./LevelEditorFeatBuilder.js";

const CLASS_OPTION_TYPE = "class-option";
const classOptionStructureCaches = new WeakMap();
const fallbackClassOptionStructureCache = new Map();
const MARTIAL_VERSATILITY_REVIEW = {
    id: "class-feature:fighter-martial-versatility-4:tce",
    kind: "classFeature",
    name: "Martial Versatility",
    source: "TCE",
    level: 4,
    optional: true,
    entries: [
        "Whenever you reach a level in this class that grants the Ability Score Improvement feature, you can do one of the following, as you shift the focus of your martial practice:",
        {
            type: "list",
            items: [
                "Replace a fighting style you know with another fighting style available to fighters.",
                "If you know any maneuvers from the Battle Master archetype, you can replace one maneuver you know with a different maneuver."
            ]
        }
    ]
};

function cloneValue(value) {
    if (value == null) {
        return value;
    }

    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

function getLevelIndex(context) {
    return Math.max(toNumber(context?.characterLevel, 1) - 1, 0);
}

function getLevelEntry(context) {
    return getValue(context?.dto, `levels.${getLevelIndex(context)}`, {}) || {};
}

function getClassIdentity(context) {
    const levelEntry = getLevelEntry(context);
    return levelEntry.class || context?.classEntry || null;
}

function getSubclassIdentity(context) {
    const levelEntry = getLevelEntry(context);
    return levelEntry.subclass || context?.subclassEntry || null;
}

function getStructureCache(context) {
    if (context?.api && typeof context.api === "object") {
        if (!classOptionStructureCaches.has(context.api)) {
            classOptionStructureCaches.set(context.api, new Map());
        }
        return classOptionStructureCaches.get(context.api);
    }

    return fallbackClassOptionStructureCache;
}

function summarizeIdentity(identity) {
    if (!identity || typeof identity !== "object") {
        return identity || "";
    }

    return {
        id: identity.id || "",
        ref: identity.ref || "",
        refId: identity.refId || "",
        sourceId: identity.sourceId || "",
        main: identity.main || "",
        name: identity.name || identity.className || "",
        source: identity.source || "",
        classLevel: identity.classLevel || "",
        optionRef: identity.options?.ref || "",
        optionId: identity.options?.id || "",
        optionCatalogId: identity.options?.catalogId || "",
        inlineFeatureRefs: [
            ...toArray(identity.classFeatures),
            ...toArray(identity.subclassFeatures),
            ...toArray(identity.featureRefs),
            ...toArray(identity.features)
        ]
            .map(summarizeFeatureRef)
    };
}

function summarizeFeatureRef(featureRef) {
    if (!featureRef || typeof featureRef !== "object") {
        return featureRef || "";
    }

    return {
        id: featureRef.id || "",
        ref: featureRef.ref || "",
        refId: featureRef.refId || "",
        sourceId: featureRef.sourceId || "",
        name: featureRef.name || "",
        source: featureRef.source || "",
        level: featureRef.level || "",
        rawRef: featureRef.rawRef || ""
    };
}

function getStructureCacheKey(context) {
    const levelEntry = getLevelEntry(context);
    const classIdentity = getClassIdentity(context);
    const subclassIdentity = getSubclassIdentity(context);
    const classLevel = toNumber(levelEntry.class?.classLevel, toNumber(context?.classLevel, context?.characterLevel || 1));
    return JSON.stringify({
        characterLevel: toNumber(context?.characterLevel, 1),
        classLevel,
        classIdentity: summarizeIdentity(classIdentity),
        subclassIdentity: summarizeIdentity(subclassIdentity),
        featureRefs: toArray(levelEntry.features).map(summarizeFeatureRef)
    });
}

async function loadLevelFeatureContext(context) {
    const levelEntry = getLevelEntry(context);
    const classLevel = toNumber(levelEntry.class?.classLevel, toNumber(context?.classLevel, context?.characterLevel || 1));
    const classRecord = await resolveCatalogEntity(context, "classes", getClassIdentity(context), { fallbackIdentity: true });
    const subclassRecord = await resolveCatalogEntity(context, "subclasses", getSubclassIdentity(context), { fallbackIdentity: false });
    const records = await expandCatalogRecords(context, [classRecord], {
        includeLinkedFeatures: true,
        classLevel
    });
    const subclassRecords = await expandCatalogRecords(context, [subclassRecord], {
        includeLinkedFeatures: true,
        classLevel,
        featureKinds: ["subclass-features"]
    });
    const featureRefs = toArray(levelEntry.features);

    for (const record of subclassRecords) {
        appendCatalogRecord(records, record);
    }

    for (const featureRef of featureRefs) {
        appendCatalogRecord(records, await resolveCatalogFeatureEntity(context, featureRef, { fallbackIdentity: false }));
    }

    return {
        classLevel,
        classRecord,
        subclassRecord,
        features: records.filter(isFeatureRecord)
    };
}

// Optional class features (e.g. Tasha's "Dedicated Weapon", "Ki-Fueled Attack")
// live inline in the class record's classFeatures list with optional:true. They
// are opt-in: the player decides whether to add them. Surface every optional
// feature unlocked at this class level so it can be toggled on.
function collectOptionalFeaturesForLevel(classRecord, classLevel, loadedFeatures) {
    const targetLevel = toNumber(classLevel, 0);
    const byKey = new Map();

    const addCandidate = (feature) => {
        const name = String(feature?.name || "").trim();
        if (!name) {
            return;
        }

        const level = feature?.level != null ? toNumber(feature.level, targetLevel) : targetLevel;
        if (level !== targetLevel) {
            return;
        }

        const id = String(feature?.id || feature?.ref || "").trim();
        const key = (id || name).toLowerCase();
        const rulesEntries = feature?.entries
            || feature?.raw?.entries
            || feature?.rulesEntries
            || feature?._fullEntries
            || feature?.description
            || feature?.summary
            || null;
        const candidate = {
            id,
            ref: feature?.ref || "",
            name,
            source: feature?.source || getCatalogSource(classRecord),
            level,
            rulesEntries,
            selected: false
        };

        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, candidate);
            return;
        }

        // Merge: prefer whichever source carries an id and rules text.
        if (!existing.rulesEntries && candidate.rulesEntries) {
            existing.rulesEntries = candidate.rulesEntries;
        }
        if (!existing.id && candidate.id) {
            existing.id = candidate.id;
        }
        if (!existing.ref && candidate.ref) {
            existing.ref = candidate.ref;
        }
    };

    toArray(classRecord?.classFeatures)
        .filter((feature) => Boolean(feature?.optional))
        .forEach(addCandidate);
    getOptionalClassFeatureReviews(loadedFeatures).forEach(addCandidate);

    return Array.from(byKey.values());
}

function optionalFeatureChoiceId(feature) {
    return `optional-feature:${String(feature?.id || feature?.ref || feature?.name || "").toLowerCase()}`;
}

function normalizeClassOption(option) {
    if (!option) {
        return null;
    }

    if (typeof option === "string") {
        const raw = option.trim();
        const [name, source] = raw.split("|").map((part) => part.trim());
        return {
            value: raw,
            label: name || raw,
            source: source || ""
        };
    }

    const value = String(option.value || option.ref || option.id || option.name || option.label || "").trim();
    if (!value) {
        return null;
    }

    return {
        ...option,
        value,
        label: String(option.label || option.name || value).trim(),
        source: option.source || ""
    };
}

function getOptionLabel(option) {
    return [option.label || option.value, option.source].filter(Boolean).join(" ");
}

function normalizeWeaponToken(value) {
    const text = normalizeSearchText(value)
        .replace(/[^a-z0-9]+/gu, " ")
        .replace(/\bweapons\b/gu, "weapon")
        .replace(/\s+/gu, " ")
        .trim();
    return text.endsWith("s") ? text.slice(0, -1) : text;
}

function getWeaponCategory(option) {
    return normalizeSearchText(option?.category || option?.weaponCategory || option?.weapon?.category || "");
}

function getWeaponProperties(option) {
    return [
        ...toArray(option?.properties),
        ...toArray(option?.weapon?.properties)
            .flatMap((property) => [
                property?.code,
                property?.abbreviation,
                property?.name
            ])
    ]
        .map((property) => normalizeSearchText(property))
        .filter(Boolean);
}

function isDedicatedWeaponLegalOption(option) {
    const category = getWeaponCategory(option);
    if (category !== "simple" && category !== "martial") {
        return false;
    }

    const properties = getWeaponProperties(option);
    return !properties.some((property) => property === "h" || property === "heavy" || property === "s" || property === "special");
}

function normalizeId(value) {
    return normalizeSearchText(value)
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-+|-+$/gu, "");
}

function parseSpellChoiceFilter(value) {
    const result = {};
    for (const part of String(value || "").split("|")) {
        const [rawKey, rawValue] = part.split("=");
        const key = String(rawKey || "").trim().toLowerCase();
        if (key && rawValue) {
            result[key] = rawValue.trim();
        }
    }
    return result;
}

function formatClassLabel(value) {
    return String(value || "")
        .replace(/[-_]+/gu, " ")
        .replace(/\b\w/gu, (letter) => letter.toUpperCase())
        .trim();
}

function formatSpellLevelLabel(level) {
    const numericLevel = toNumber(level, NaN);
    if (!Number.isFinite(numericLevel)) {
        return "";
    }
    if (numericLevel === 0) {
        return "Cantrip";
    }
    return `${numericLevel}${numericLevel === 1 ? "st" : numericLevel === 2 ? "nd" : numericLevel === 3 ? "rd" : "th"}-level Spell`;
}

function formatSpellChoiceLabel(definition, index) {
    const filter = parseSpellChoiceFilter(definition.choose || definition.filter);
    const levels = String(filter.level || "")
        .split(";")
        .map(formatSpellLevelLabel)
        .filter(Boolean);
    const levelLabel = levels.length
        ? [...new Set(levels)].join("/")
        : `Spell ${index + 1}`;
    const classLabel = String(filter.class || "")
        .split(";")
        .map(formatClassLabel)
        .filter(Boolean)
        .join("/");
    return [definition.group, levelLabel, classLabel].filter(Boolean).join(" - ");
}

function getSpellChoiceSignature(definition) {
    return [
        definition.choose || definition.filter || "",
        definition.mode || "known",
        definition.ability || "",
        definition.unlockAtLevel || "",
        definition.spellLevel || "",
        definition.recharge || "",
        definition.uses || ""
    ].map((part) => String(part || "").trim()).join("|").toLowerCase();
}

function collapseSpellChoiceDefinitions(spellChoices) {
    const bySignature = new Map();
    for (const definition of toArray(spellChoices)) {
        const signature = getSpellChoiceSignature(definition);
        if (!bySignature.has(signature)) {
            bySignature.set(signature, {
                definition: cloneValue(definition),
                totalCount: 0,
                maxCount: 0,
                groups: new Set()
            });
        }
        const entry = bySignature.get(signature);
        const count = Math.max(toNumber(definition.count, 1), 1);
        entry.totalCount += count;
        entry.maxCount = Math.max(entry.maxCount, count);
        if (definition.group) {
            entry.groups.add(String(definition.group));
        }
    }

    return Array.from(bySignature.values()).map((entry, index) => ({
        ...entry.definition,
        group: entry.groups.size > 1 ? "" : entry.definition.group,
        count: entry.groups.size > 1 ? entry.maxCount : entry.totalCount,
        collapsedGroups: Array.from(entry.groups),
        collapsedIndex: index
    }));
}

function identityMatchesRecord(record, identity) {
    if (!record || !identity) {
        return false;
    }

    const recordTokens = [
        getCatalogDtoId(record),
        record.id,
        record.ref,
        record.refId,
        record.sourceId,
        getCatalogDisplayName(record, "")
    ].map(normalizeSearchText).filter(Boolean);
    const identityTokens = [
        identity.options?.catalogId,
        identity.catalogId,
        identity.id,
        identity.ref,
        identity.refId,
        identity.sourceId,
        identity.name
    ].map(normalizeSearchText).filter(Boolean);
    return recordTokens.some((token) => identityTokens.includes(token));
}

function isRecordSelectedOnCurrentLevel(record, levelEntry) {
    return identityMatchesRecord(record, levelEntry?.subclass)
        || identityMatchesRecord(record, levelEntry?.class);
}

function isSpellChoiceAvailableAtLevel(definition, record, classLevel, levelEntry) {
    const unlockAtLevel = toNumber(definition.unlockAtLevel ?? definition.level, 0);
    if (!unlockAtLevel) {
        return true;
    }

    if (unlockAtLevel === toNumber(classLevel, 0)) {
        return true;
    }

    return isRecordSelectedOnCurrentLevel(record, levelEntry) && unlockAtLevel <= toNumber(classLevel, 0);
}

function createSpellChoiceFromDefinition(record, definition, index) {
    const recordId = getCatalogDtoId(record) || record?.id || `spell-source-${index + 1}`;
    const recordName = getCatalogDisplayName(record, record?.name || "Class Feature");
    const count = Math.max(toNumber(definition.count, 1), 1);
    const id = [
        recordId,
        "spell-choice",
        definition.choose || definition.filter || "",
        definition.mode || "known",
        index + 1
    ].map((part) => normalizeId(part)).filter(Boolean).join(":");

    return {
        id,
        type: CLASS_OPTION_TYPE,
        choiceType: "spell",
        spellChoice: true,
        featureId: recordId,
        featureName: recordName,
        label: definition.label || formatSpellChoiceLabel(definition, index),
        prompt: definition.prompt || `Choose ${count} spell${count === 1 ? "" : "s"} granted by ${recordName}.`,
        count,
        options: [],
        sourceName: definition.sourceName || recordName,
        source: definition.source || getCatalogSource(record),
        catalogKind: "spells",
        mode: definition.mode || "known",
        filter: definition.filter || definition.choose || "",
        spellChoiceDefinition: cloneValue(definition),
        selected: []
    };
}

function createSpellGroupChoice(record, profile, classLevel, levelEntry) {
    if (!isRecordSelectedOnCurrentLevel(record, levelEntry)) {
        return null;
    }

    const groups = new Map();
    for (const spellGrant of toArray(profile?.spells?.granted)) {
        if (spellGrant?.type !== "spell" || !spellGrant.group) {
            continue;
        }

        const group = String(spellGrant.group || "").trim();
        if (!group) {
            continue;
        }
        if (!groups.has(group)) {
            groups.set(group, []);
        }
        groups.get(group).push(cloneValue(spellGrant));
    }

    if (groups.size <= 1) {
        return null;
    }

    const recordId = getCatalogDtoId(record) || record?.id || "spell-group-source";
    const recordName = getCatalogDisplayName(record, record?.name || "Class Feature");
    return {
        id: `${recordId}:spell-group`,
        type: CLASS_OPTION_TYPE,
        choiceType: "spell-group",
        spellGroupChoice: true,
        featureId: recordId,
        featureName: recordName,
        label: `${recordName}: Spell Group`,
        prompt: `Choose the ${recordName} spell group.`,
        count: 1,
        options: Array.from(groups.entries())
            .map(([group, spellGrants]) => ({
                value: group,
                label: group,
                description: `${spellGrants.length} spells; applies as you reach the listed class levels.`,
                spellGrants,
                classLevel
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
        sourceName: recordName,
        source: getCatalogSource(record),
        catalogKind: "spells",
        selected: []
    };
}

function buildSpellChoicesFromRecords(records, classLevel, levelEntry) {
    const choices = [];
    for (const record of toArray(records)) {
        if (!record) {
            continue;
        }

        const profile = buildCatalogProfile(record);
        const spellChoices = collapseSpellChoiceDefinitions(profile?.spells?.choices)
            .filter((definition) => isSpellChoiceAvailableAtLevel(definition, record, classLevel, levelEntry));
        spellChoices.forEach((definition, index) => {
            const choice = createSpellChoiceFromDefinition(record, definition, index);
            if (choice) {
                choices.push(choice);
            }
        });

        const groupChoice = createSpellGroupChoice(record, profile, classLevel, levelEntry);
        if (groupChoice) {
            choices.push(groupChoice);
        }
    }

    return choices;
}

function getCompiledWeaponProficiencyTokens(context) {
    return toArray(context?.compiled?.proficiencies?.weapons)
        .map((entry) => entry?.name || entry?.value || entry)
        .map(normalizeWeaponToken)
        .filter(Boolean);
}

function matchesWeaponProficiency(option, proficiencyTokens) {
    if (!proficiencyTokens.length) {
        return true;
    }

    const category = getWeaponCategory(option);
    const label = normalizeWeaponToken(option?.label || option?.name || option?.value);
    const categoryToken = `${category} weapon`;
    return proficiencyTokens.some((token) => (
        token === category
        || token === categoryToken
        || token === label
        || token === `${label} weapon`
    ));
}

function describeWeaponOption(option) {
    const damage = option.damage || option.weapon?.damage?.primary || "";
    const damageType = option.damageType || option.weapon?.damage?.type?.name || "";
    const properties = getWeaponProperties(option)
        .filter((property) => property.length > 1)
        .map((property) => property.replace(/\b\w/gu, (letter) => letter.toUpperCase()));
    return [
        damage && damageType ? `${damage} ${damageType}` : "",
        properties.length ? properties.join(", ") : ""
    ].filter(Boolean).join("; ") || option.description || "";
}

function enrichWeaponChoiceOptions(context, choices) {
    const proficiencyTokens = getCompiledWeaponProficiencyTokens(context);

    for (const choice of toArray(choices)) {
        if (choice.weaponChoice !== "dedicated-weapon") {
            continue;
        }

        const legalOptions = toArray(choice.options)
            .filter(isDedicatedWeaponLegalOption)
            .map((option) => ({
                ...option,
                description: describeWeaponOption(option),
                recordId: option.recordId || option.value || option.id || "",
                catalogKind: option.catalogKind || "items"
            }));
        const proficientOptions = legalOptions.filter((option) => matchesWeaponProficiency(option, proficiencyTokens));
        choice.options = proficientOptions.length ? proficientOptions : legalOptions;
    }
}

async function enrichSpellChoiceOptions(context, choices) {
    await Promise.all(toArray(choices).map(async (choice) => {
        if (!choice.spellChoice) {
            return;
        }

        choice.options = await getSpellOptionsForChoice(context, choice.spellChoiceDefinition || {
            filter: choice.filter,
            choose: choice.filter,
            mode: choice.mode,
            count: choice.count
        });
    }));
}

function getClassContextText(context) {
    const classEntry = context?.classEntry || {};
    return [
        context?.classLabel,
        classEntry.id,
        classEntry.main,
        classEntry.name,
        classEntry.ref,
        classEntry.source,
        classEntry.options?.catalogId,
        classEntry.options?.ref
    ].filter(Boolean).join(" ").toLowerCase();
}

function featureNameMatches(feature, name) {
    const wanted = String(name || "").trim().toLowerCase();
    return String(feature?.name || feature || "").trim().toLowerCase() === wanted;
}

function getOptionalFeatureFallbacks(context, features = []) {
    const classText = getClassContextText(context);
    const level = toNumber(context?.classLevel, context?.characterLevel || 0);
    const levelFeatures = [
        ...toArray(context?.features),
        ...toArray(features).map((feature) => feature?.name)
    ];
    const hasMartialVersatility = levelFeatures.some((feature) => featureNameMatches(feature, "Martial Versatility"));
    const hasFighterClass = /\bfighter\b|class:fighter|class-fighter/u.test(classText);
    const alreadyLoaded = toArray(features).some((feature) => {
        const id = String(feature?.id || "").trim().toLowerCase();
        return id === MARTIAL_VERSATILITY_REVIEW.id || featureNameMatches(feature, "Martial Versatility");
    });

    if (!alreadyLoaded && hasFighterClass && level === 4 && hasMartialVersatility) {
        return [cloneValue(MARTIAL_VERSATILITY_REVIEW)];
    }

    return [];
}

function createChoiceFromDefinition(feature, definition, index) {
    const options = (toArray(definition.options).length ? toArray(definition.options) : toArray(definition.from))
        .map(normalizeClassOption)
        .filter((option) => option?.value && option?.label);

    if (!options.length) {
        return null;
    }

    const featureId = feature?.id || feature?.ref || feature?.sourceId || `feature-${index}`;
    const featureName = getCatalogDisplayName(feature, feature?.name || "Class Feature");
    const count = Math.max(toNumber(definition.count, 1), 1);
    return {
        id: definition.id || definition.choiceId || `${featureId}:choice:${index}`,
        type: CLASS_OPTION_TYPE,
        choiceType: definition.type || CLASS_OPTION_TYPE,
        featureId: definition.featureId || featureId,
        featureName: definition.featureName || featureName,
        label: definition.label || featureName,
        prompt: definition.prompt || `Choose ${count} option${count === 1 ? "" : "s"} for ${featureName}.`,
        count,
        options,
        sourceName: definition.sourceName || featureName,
        source: definition.source || getCatalogSource(feature),
        catalogKind: definition.catalogKind || "",
        weaponChoice: definition.weaponChoice || "",
        requiresWeaponProficiency: Boolean(definition.requiresWeaponProficiency),
        requiresOptionalFeature: Boolean(definition.requiresOptionalFeature || (feature?.optional && definition.type !== CLASS_OPTION_TYPE)),
        optionalFeatureId: definition.optionalFeatureId || (feature?.optional ? featureId : ""),
        selected: []
    };
}

function buildChoicesFromFeatures(features) {
    const choices = [];
    for (const feature of features) {
        getProfileChoiceDefinitions(buildCatalogProfile(feature)).forEach((definition, index) => {
            const choice = createChoiceFromDefinition(feature, definition, index);
            if (choice) {
                choices.push(choice);
            }
        });
    }
    return choices;
}

function isOptionalClassFeatureReview(feature) {
    const name = String(feature?.name || "").trim().toLowerCase();
    return Boolean(feature?.optional)
        || name === "martial versatility"
        || String(feature?.id || "").toLowerCase() === "class-feature:fighter-martial-versatility-4:tce";
}

function getOptionalClassFeatureReviews(features) {
    return toArray(features)
        .filter(isOptionalClassFeatureReview);
}

async function buildClassOptionStructure(context) {
    const cache = getStructureCache(context);
    const cacheKey = getStructureCacheKey(context);
    if (!cache.has(cacheKey)) {
        const structurePromise = Promise.resolve()
            .then(async () => {
                const { classLevel, classRecord, subclassRecord, features } = await loadLevelFeatureContext(context);
                const fallbackFeatures = getOptionalFeatureFallbacks(context, features);
                const allFeatures = [
                    ...features,
                    ...fallbackFeatures
                ];
                const levelEntry = getLevelEntry(context);
                return {
                    features: cloneValue(allFeatures),
                    choices: cloneValue([
                        ...buildChoicesFromFeatures(allFeatures),
                        ...buildSpellChoicesFromRecords([classRecord, subclassRecord], classLevel, levelEntry)
                    ]),
                    optionalFeatures: cloneValue(collectOptionalFeaturesForLevel(classRecord, classLevel, allFeatures))
                };
            })
            .catch((error) => {
                cache.delete(cacheKey);
                throw error;
            });
        cache.set(cacheKey, structurePromise);
    }

    return cloneValue(await cache.get(cacheKey));
}

function getClassOptionSelections(dto, levelIndex) {
    const selections = new Map();
    for (const choice of toArray(getValue(dto, `levels.${levelIndex}.choices`, []))) {
        if (choice?.type === CLASS_OPTION_TYPE && choice.choiceId) {
            selections.set(choice.choiceId, choice);
        }
    }
    return selections;
}

function hydrateSelections(choices, selections) {
    for (const choice of choices) {
        const selection = selections.get(choice.id);
        const selectedValues = new Set(toArray(selection?.values).map((value) => value?.value || value));
        choice.selected = choice.options
            .filter((option) => selectedValues.has(option.value))
            .map((option) => option.value)
            .slice(0, choice.count);
    }
}

function getOptionalFeatureSelectionKeys(dto, levelIndex) {
    const keys = new Set();
    for (const choice of toArray(getValue(dto, `levels.${levelIndex}.choices`, []))) {
        if (choice?.type !== CLASS_OPTION_TYPE || !choice.optionalFeature) {
            continue;
        }

        [choice.featureId, choice.featureName, choice.value, choice.choiceId]
            .map((token) => String(token || "").toLowerCase())
            .filter(Boolean)
            .forEach((token) => keys.add(token));
        for (const value of toArray(choice.values)) {
            [value?.id, value?.value, value?.label]
                .map((token) => String(token || "").toLowerCase())
                .filter(Boolean)
                .forEach((token) => keys.add(token));
        }
    }
    return keys;
}

function hydrateOptionalFeatureSelections(optionalFeatures, selectionKeys) {
    for (const feature of toArray(optionalFeatures)) {
        const tokens = [feature.id, feature.ref, feature.name, optionalFeatureChoiceId(feature)]
            .map((token) => String(token || "").toLowerCase())
            .filter(Boolean);
        feature.selected = tokens.some((token) => selectionKeys.has(token));
    }
}

export async function buildClassOptionModel(context, options = {}) {
    const { enrich = true } = options;
    const { features, choices, optionalFeatures } = await buildClassOptionStructure(context);
    if (enrich) {
        await enrichOptionalFeatureOptions(context, choices);
        await enrichSpellChoiceOptions(context, choices);
        enrichWeaponChoiceOptions(context, choices);
    }
    const levelIndex = getLevelIndex(context);
    const selections = getClassOptionSelections(context.dto, levelIndex);
    hydrateSelections(choices, selections);
    hydrateOptionalFeatureSelections(optionalFeatures, getOptionalFeatureSelectionKeys(context.dto, levelIndex));
    return { features, choices, optionalFeatures: toArray(optionalFeatures), selections };
}

export async function hasClassOptionChoices(context) {
    try {
        const model = await buildClassOptionModel(context, { enrich: false });
        return model.choices.some((choice) => (choice.options.length || choice.spellChoice || choice.spellGroupChoice) && choice.count > 0)
            || model.optionalFeatures.length > 0;
    } catch (error) {
        console.warn("Class option visibility check failed:", error);
        return true;
    }
}

function createClassOptionSelection(choice) {
    const selectedOptions = choice.options
        .filter((option) => choice.selected.includes(option.value))
        .slice(0, choice.count)
        .map((option) => ({
            value: option.value,
            label: option.label,
            source: option.source || "",
            page: option.page || null,
            recordId: option.recordId || "",
            description: option.description || "",
            name: option.name || option.label || option.value || "",
            level: option.level ?? null,
            mode: option.mode || choice.mode || "",
            spellGrants: toArray(option.spellGrants).map(cloneValue)
        }));

    return {
        type: CLASS_OPTION_TYPE,
        choiceId: choice.id,
        featureId: choice.featureId,
        featureName: choice.featureName,
        label: choice.label,
        sourceName: choice.sourceName,
        source: choice.source,
        choiceType: choice.choiceType || "",
        catalogKind: choice.catalogKind || "",
        spellChoice: Boolean(choice.spellChoice),
        spellGroupChoice: Boolean(choice.spellGroupChoice),
        filter: choice.filter || "",
        mode: choice.mode || "",
        weaponChoice: choice.weaponChoice || "",
        requiresOptionalFeature: Boolean(choice.requiresOptionalFeature),
        optionalFeatureId: choice.optionalFeatureId || "",
        count: choice.count,
        value: selectedOptions[0]?.value || "",
        values: selectedOptions
    };
}

function createOptionalFeatureSelection(feature) {
    const id = feature.id || feature.ref || "";
    return {
        type: CLASS_OPTION_TYPE,
        choiceId: optionalFeatureChoiceId(feature),
        optionalFeature: true,
        featureId: id,
        featureName: feature.name,
        label: feature.name,
        sourceName: feature.name,
        source: feature.source || "",
        count: 1,
        value: id || feature.name,
        values: [{
            value: id || feature.name,
            id,
            label: feature.name,
            source: feature.source || "",
            recordId: id,
            rulesEntries: feature.rulesEntries || null
        }]
    };
}

function isChoiceComplete(choice) {
    return choice.selected.length >= choice.count;
}

function featureTokens(feature) {
    return [feature?.id, feature?.ref, feature?.name, optionalFeatureChoiceId(feature)]
        .map((token) => normalizeSearchText(token))
        .filter(Boolean);
}

function isChoiceActive(choice, model) {
    if (!choice?.requiresOptionalFeature) {
        return true;
    }

    const wanted = [choice.optionalFeatureId, choice.featureId, choice.featureName]
        .map((token) => normalizeSearchText(token))
        .filter(Boolean);
    if (!wanted.length) {
        return true;
    }

    return toArray(model?.optionalFeatures).some((feature) => (
        feature.selected
        && featureTokens(feature).some((token) => wanted.includes(token))
    ));
}

function getActiveChoices(model) {
    return toArray(model?.choices).filter((choice) => isChoiceActive(choice, model));
}

function getMissingChoices(model) {
    return getActiveChoices(model)
        .filter((choice) => choice.options.length && !isChoiceComplete(choice))
        .map((choice) => choice.label);
}

function buildPersistedChoices(context, model) {
    const levelIndex = getLevelIndex(context);
    const managedChoiceIds = new Set([
        ...model.choices.map((choice) => choice.id),
        ...toArray(model.optionalFeatures).map(optionalFeatureChoiceId)
    ]);
    const existingChoices = toArray(getValue(context.dto, `levels.${levelIndex}.choices`, []))
        .filter((choice) => choice?.type !== CLASS_OPTION_TYPE || !managedChoiceIds.has(choice.choiceId));

    return [
        ...existingChoices,
        ...getActiveChoices(model)
            .filter(isChoiceComplete)
            .map(createClassOptionSelection),
        ...toArray(model.optionalFeatures)
            .filter((feature) => feature.selected)
            .map(createOptionalFeatureSelection)
    ];
}

export function buildClassOptionStatus(dto, characterLevel, context = {}) {
    const levelIndex = Math.max(toNumber(characterLevel, 1) - 1, 0);
    const classOptionSelections = toArray(getValue(dto, `levels.${levelIndex}.choices`, []))
        .filter((choice) => choice?.type === CLASS_OPTION_TYPE);
    const choiceFeatureIds = new Set(classOptionSelections
        .filter((choice) => !choice.optionalFeature)
        .flatMap((choice) => [choice.featureId, choice.optionalFeatureId])
        .map((token) => normalizeSearchText(token))
        .filter(Boolean));
    const selections = classOptionSelections
        .map((choice) => {
            if (choice.optionalFeature && choiceFeatureIds.has(normalizeSearchText(choice.featureId))) {
                return "";
            }
            const values = toArray(choice.values)
                .map((value) => getOptionLabel(value))
                .filter(Boolean)
                .join(", ");
            if (choice.optionalFeature) {
                return choice.label || choice.featureName || values;
            }
            return values ? `${choice.label || choice.featureName}: ${values}` : "";
        })
        .filter(Boolean);

    if (selections.length) {
        return selections.join(" | ");
    }

    if (toArray(context?.features).some((feature) => featureNameMatches(feature, "Martial Versatility"))) {
        return "Martial Versatility";
    }

    return "Review";
}

function renderChoice(choice, onChange) {
    const section = createElement("section", "level-editor__choice-section level-editor__class-option-section");
    const title = createElement("h4", "level-editor__choice-section-title");
    title.appendChild(createElement("span", "", choice.label));
    title.appendChild(createElement("span", "level-editor__choice-group-count", `${choice.selected.length} / ${choice.count}`));
    section.appendChild(title);

    if (choice.prompt) {
        section.appendChild(createDescription(choice.prompt));
    }

    const selectedSet = new Set(choice.selected);
    const list = createElement("div", "level-editor__class-option-list");
    const inputType = choice.count === 1 ? "radio" : "checkbox";
    const inputName = `level-editor-class-option-${choice.id}`;

    function sync() {
        const count = section.querySelector(".level-editor__choice-group-count");
        if (count) {
            count.textContent = `${choice.selected.length} / ${choice.count}`;
        }
        const atLimit = choice.selected.length >= choice.count;
        list.querySelectorAll("label[data-option-value]").forEach((card) => {
            const input = card.querySelector("input");
            if (!input) {
                return;
            }
            card.classList.toggle("level-editor__class-option-card--selected", input.checked);
            input.disabled = input.type === "checkbox" && !input.checked && atLimit;
        });
    }

    for (const option of choice.options) {
        const label = createElement("label", "level-editor__class-option-card");
        label.dataset.optionValue = option.value;

        const input = document.createElement("input");
        input.type = inputType;
        input.name = inputName;
        input.value = option.value;
        input.checked = selectedSet.has(option.value);
        input.addEventListener("change", () => {
            const nextSelected = new Set(choice.selected);
            if (input.checked) {
                if (input.type === "radio") {
                    choice.selected = [option.value];
                    sync();
                    onChange();
                    return;
                }
                if (nextSelected.size >= choice.count) {
                    input.checked = false;
                    return;
                }
                nextSelected.add(option.value);
            } else {
                nextSelected.delete(option.value);
            }
            choice.selected = Array.from(nextSelected);
            sync();
            onChange();
        });

        const body = createElement("div", "level-editor__class-option-card-body");
        const heading = createElement("div", "level-editor__class-option-card-heading");
        heading.appendChild(createElement("span", "level-editor__class-option-card-title", option.label || option.value));
        if (option.source || option.page) {
            const sourceParts = [option.source, option.page ? `p. ${option.page}` : ""].filter(Boolean);
            heading.appendChild(createElement("span", "level-editor__class-option-card-source", sourceParts.join(" | ")));
        }

        const description = createElement("div", "level-editor__class-option-card-description");
        if (option.rulesEntries) {
            appendRulesEntry(description, option.rulesEntries, {
                text: "level-editor__class-option-card-description-text",
                list: "level-editor__class-option-card-description-list",
                table: "level-editor__race-table",
                section: "level-editor__class-option-card-description-section",
                title: "level-editor__class-option-card-description-title"
            });
        } else {
            description.appendChild(createElement("span", "level-editor__class-option-card-description-text", option.description || "No description available."));
        }

        body.appendChild(heading);
        body.appendChild(description);
        label.appendChild(input);
        label.appendChild(body);
        list.appendChild(label);
    }

    section.appendChild(list);
    sync();
    return section;
}

function renderOptionalFeatureToggle(feature, onChange) {
    const section = createElement("section", "level-editor__choice-section level-editor__class-option-section");
    const title = createElement("h4", "level-editor__choice-section-title");
    title.appendChild(createElement("span", "", feature.name || "Optional Class Feature"));
    title.appendChild(createElement("span", "level-editor__choice-group-count", "Optional"));
    section.appendChild(title);

    const card = createElement("label", "level-editor__class-option-card");
    card.dataset.optionalFeature = feature.id || feature.name;
    if (feature.selected) {
        card.classList.add("level-editor__class-option-card--selected");
    }

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(feature.selected);
    input.addEventListener("change", () => {
        feature.selected = input.checked;
        card.classList.toggle("level-editor__class-option-card--selected", input.checked);
        onChange();
    });

    const body = createElement("div", "level-editor__class-option-card-body");
    const heading = createElement("div", "level-editor__class-option-card-heading");
    heading.appendChild(createElement("span", "level-editor__class-option-card-title", feature.name));
    if (feature.source) {
        heading.appendChild(createElement("span", "level-editor__class-option-card-source", feature.source));
    }

    const description = createElement("div", "level-editor__class-option-card-description");
    if (feature.rulesEntries) {
        appendRulesEntry(description, feature.rulesEntries, {
            text: "level-editor__class-option-card-description-text",
            list: "level-editor__class-option-card-description-list",
            table: "level-editor__race-table",
            section: "level-editor__class-option-card-description-section",
            title: "level-editor__class-option-card-description-title"
        });
    } else {
        description.appendChild(createElement("span", "level-editor__class-option-card-description-text", "Optional class feature — enable to add it to your sheet."));
    }

    body.appendChild(heading);
    body.appendChild(description);
    card.appendChild(input);
    card.appendChild(body);
    section.appendChild(card);
    return section;
}

export function buildClassOptionContent(context) {
    const fragment = document.createDocumentFragment();
    const wrapper = createElement("div", "level-editor__limited-choice-editor level-editor__class-options-editor");
    const status = createElement("p", "level-editor__choice-status", "Loading class options...");
    const controls = createElement("div", "level-editor__class-options-controls");
    const actions = createElement("div", "level-editor__choice-actions");
    const resetButton = document.createElement("button");
    const applyButton = document.createElement("button");
    let model = null;
    let initialSelections = {};
    let initialOptionalSelections = {};

    resetButton.type = "button";
    resetButton.className = "level-editor__button";
    resetButton.textContent = "Reset";

    applyButton.type = "button";
    applyButton.className = "level-editor__button level-editor__button--primary";
    applyButton.textContent = "Apply";
    applyButton.disabled = true;

    actions.appendChild(resetButton);
    actions.appendChild(applyButton);
    wrapper.appendChild(status);
    wrapper.appendChild(controls);
    wrapper.appendChild(actions);
    fragment.appendChild(wrapper);

    function updateStatus() {
        if (!model) {
            return;
        }

        const missing = getMissingChoices(model);
        applyButton.disabled = missing.length > 0;
        if (missing.length) {
            status.textContent = `Missing choices: ${missing.join(", ")}.`;
            return;
        }

        const optionalFeatures = toArray(model.optionalFeatures);
        const optionalSelected = optionalFeatures.filter((feature) => feature.selected).length;
        const activeChoices = getActiveChoices(model);
        const parts = [];
        if (activeChoices.length) {
            parts.push(`${activeChoices.length} class option${activeChoices.length === 1 ? "" : "s"} selected`);
        }
        if (optionalFeatures.length) {
            parts.push(`${optionalSelected}/${optionalFeatures.length} optional feature${optionalFeatures.length === 1 ? "" : "s"} enabled`);
        }
        status.textContent = parts.length ? `${parts.join(" | ")}.` : "No class options required.";
    }

    function renderControls() {
        controls.replaceChildren();
        const optionalFeatures = toArray(model?.optionalFeatures);
        const activeChoices = getActiveChoices(model);

        if (!activeChoices.length && !optionalFeatures.length) {
            controls.appendChild(createDescription("No class options are required for this level."));
            applyButton.disabled = false;
            status.textContent = "No class options required.";
            return;
        }

        for (const feature of optionalFeatures) {
            controls.appendChild(renderOptionalFeatureToggle(feature, renderControls));
        }
        for (const choice of activeChoices) {
            controls.appendChild(renderChoice(choice, updateStatus));
        }
        updateStatus();
    }

    resetButton.addEventListener("click", () => {
        if (!model) {
            return;
        }
        for (const choice of model.choices) {
            choice.selected = toArray(initialSelections[choice.id]).slice(0, choice.count);
        }
        for (const feature of toArray(model.optionalFeatures)) {
            feature.selected = Boolean(initialOptionalSelections[optionalFeatureChoiceId(feature)]);
        }
        renderControls();
    });

    applyButton.addEventListener("click", () => {
        if (!model || typeof context.onChange !== "function" || getMissingChoices(model).length) {
            return;
        }

        const nextDto = PlayerSheetDtoHelper.patch(
            context.dto,
            `levels.${getLevelIndex(context)}.choices`,
            buildPersistedChoices(context, model)
        );
        context.onChange(nextDto);
        applyButton.closest("dialog")?.close();
    });

    void buildClassOptionModel(context)
        .then((nextModel) => {
            model = nextModel;
            initialSelections = Object.fromEntries(model.choices.map((choice) => [choice.id, choice.selected.slice()]));
            initialOptionalSelections = Object.fromEntries(
                toArray(model.optionalFeatures).map((feature) => [optionalFeatureChoiceId(feature), Boolean(feature.selected)])
            );
            renderControls();
        })
        .catch((error) => {
            console.error("Class options failed to load:", error);
            status.textContent = "Class options failed to load.";
            controls.replaceChildren(createDescription("Check the class feature catalog API connection and try again."));
            applyButton.disabled = true;
        });

    return fragment;
}
