import {
    getCatalogDisplayName,
    getCatalogDtoId,
    getCatalogSource,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    deepClone,
    normalizeChoiceType
} from "./Shared.js";

export function cloneDefinedChoice(choiceDefinition) {
    // Clone only explicit choice definitions so later UI edits cannot mutate catalog data.
    return {
        required: true,
        count: Math.max(toNumber(choiceDefinition?.count, 1), 1),
        ...deepClone(choiceDefinition),
        options: toArray(choiceDefinition?.options).map(deepClone),
        from: toArray(choiceDefinition?.from).map(deepClone),
        patterns: toArray(choiceDefinition?.patterns).map(deepClone)
    };
}

const DEDICATED_WEAPON_OPTIONS = [
    { value: "base-item:battleaxe:phb", label: "Battleaxe", category: "martial", damage: "1d8", damageType: "slashing", properties: ["Versatile"] },
    { value: "base-item:blowgun:phb", label: "Blowgun", category: "martial", damage: "1", damageType: "piercing", properties: ["Ammunition", "Loading"] },
    { value: "base-item:club:phb", label: "Club", category: "simple", damage: "1d4", damageType: "bludgeoning", properties: ["Light"] },
    { value: "base-item:dagger:phb", label: "Dagger", category: "simple", damage: "1d4", damageType: "piercing", properties: ["Finesse", "Light", "Thrown"] },
    { value: "base-item:dart:phb", label: "Dart", category: "simple", damage: "1d4", damageType: "piercing", properties: ["Finesse", "Thrown"] },
    { value: "base-item:flail:phb", label: "Flail", category: "martial", damage: "1d8", damageType: "bludgeoning", properties: [] },
    { value: "base-item:greatclub:phb", label: "Greatclub", category: "simple", damage: "1d8", damageType: "bludgeoning", properties: ["Two-Handed"] },
    { value: "base-item:hand-crossbow:phb", label: "Hand Crossbow", category: "martial", damage: "1d6", damageType: "piercing", properties: ["Ammunition", "Light", "Loading"] },
    { value: "base-item:handaxe:phb", label: "Handaxe", category: "simple", damage: "1d6", damageType: "slashing", properties: ["Light", "Thrown"] },
    { value: "base-item:javelin:phb", label: "Javelin", category: "simple", damage: "1d6", damageType: "piercing", properties: ["Thrown"] },
    { value: "base-item:light-crossbow:phb", label: "Light Crossbow", category: "simple", damage: "1d8", damageType: "piercing", properties: ["Ammunition", "Loading", "Two-Handed"] },
    { value: "base-item:light-hammer:phb", label: "Light Hammer", category: "simple", damage: "1d4", damageType: "bludgeoning", properties: ["Light", "Thrown"] },
    { value: "base-item:longsword:phb", label: "Longsword", category: "martial", damage: "1d8", damageType: "slashing", properties: ["Versatile"] },
    { value: "base-item:mace:phb", label: "Mace", category: "simple", damage: "1d6", damageType: "bludgeoning", properties: [] },
    { value: "base-item:morningstar:phb", label: "Morningstar", category: "martial", damage: "1d8", damageType: "piercing", properties: [] },
    { value: "base-item:quarterstaff:phb", label: "Quarterstaff", category: "simple", damage: "1d6", damageType: "bludgeoning", properties: ["Versatile"] },
    { value: "base-item:rapier:phb", label: "Rapier", category: "martial", damage: "1d8", damageType: "piercing", properties: ["Finesse"] },
    { value: "base-item:scimitar:phb", label: "Scimitar", category: "martial", damage: "1d6", damageType: "slashing", properties: ["Finesse", "Light"] },
    { value: "base-item:shortbow:phb", label: "Shortbow", category: "simple", damage: "1d6", damageType: "piercing", properties: ["Ammunition", "Two-Handed"] },
    { value: "base-item:shortsword:phb", label: "Shortsword", category: "martial", damage: "1d6", damageType: "piercing", properties: ["Finesse", "Light"] },
    { value: "base-item:sickle:phb", label: "Sickle", category: "simple", damage: "1d4", damageType: "slashing", properties: ["Light"] },
    { value: "base-item:sling:phb", label: "Sling", category: "simple", damage: "1d4", damageType: "bludgeoning", properties: ["Ammunition"] },
    { value: "base-item:spear:phb", label: "Spear", category: "simple", damage: "1d6", damageType: "piercing", properties: ["Thrown", "Versatile"] },
    { value: "base-item:staff:phb", label: "Staff", category: "simple", damage: "1d6", damageType: "bludgeoning", properties: ["Versatile"] },
    { value: "base-item:trident:phb", label: "Trident", category: "martial", damage: "1d6", damageType: "piercing", properties: ["Thrown", "Versatile"] },
    { value: "base-item:war-pick:phb", label: "War Pick", category: "martial", damage: "1d8", damageType: "piercing", properties: [] },
    { value: "base-item:warhammer:phb", label: "Warhammer", category: "martial", damage: "1d8", damageType: "bludgeoning", properties: ["Versatile"] },
    { value: "base-item:whip:phb", label: "Whip", category: "martial", damage: "1d4", damageType: "slashing", properties: ["Finesse", "Reach"] },
    { value: "base-item:wooden-staff:phb", label: "Wooden Staff", category: "simple", damage: "1d6", damageType: "bludgeoning", properties: ["Versatile"] }
].map((option) => ({
    ...option,
    source: "PHB",
    recordId: option.value,
    catalogKind: "items",
    description: [
        option.damage && option.damageType ? `${option.damage} ${option.damageType}` : "",
        option.properties.length ? option.properties.join(", ") : ""
    ].filter(Boolean).join("; ")
}));

function normalizeFeatureName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/gu, " ");
}

function isDedicatedWeaponFeature(catalogRecord) {
    return normalizeFeatureName(catalogRecord?.name) === "dedicated weapon"
        && normalizeFeatureName(catalogRecord?.className || catalogRecord?.raw?.className) === "monk";
}

function createDedicatedWeaponChoice(catalogRecord) {
    if (!isDedicatedWeaponFeature(catalogRecord)) {
        return null;
    }

    const featureId = getCatalogDtoId(catalogRecord) || "class-feature:monk-dedicated-weapon-2:tce";
    const featureName = getCatalogDisplayName(catalogRecord, "Dedicated Weapon");
    const source = getCatalogSource(catalogRecord) || "TCE";
    return {
        id: `${featureId}:dedicated-weapon`,
        type: "weapon",
        featureId,
        featureName,
        label: featureName,
        prompt: "Choose one weapon you are proficient with that lacks the heavy and special properties.",
        count: 1,
        sourceName: featureName,
        source,
        required: true,
        catalogKind: "items",
        weaponChoice: "dedicated-weapon",
        requiresWeaponProficiency: true,
        requiresOptionalFeature: true,
        options: DEDICATED_WEAPON_OPTIONS.map(deepClone)
    };
}

function getImplicitFeatureChoices(catalogRecord) {
    return [
        createDedicatedWeaponChoice(catalogRecord)
    ].filter(Boolean);
}

export function getDefinedChoices(catalogRecord) {
    // Prefer structured choice definitions, then bridge normalized optional-feature
    // option blocks such as Fighting Style into the same choice model.
    return [
        ...toArray(catalogRecord?.choiceDefinitions),
        ...toArray(catalogRecord?.choices),
        ...getOptionalFeatureChoicesFromEntries(catalogRecord),
        ...getImplicitFeatureChoices(catalogRecord)
    ]
        .filter((choiceDefinition) => choiceDefinition && typeof choiceDefinition === "object")
        .map(cloneDefinedChoice);
}

function parseOptionalFeatureRef(value) {
    const raw = String(value || "").trim();
    const [name, source] = raw.split("|").map((part) => part.trim());
    return {
        raw,
        name: name || raw,
        source: source || ""
    };
}

function createOptionalFeatureOption(entry) {
    if (!entry || typeof entry !== "object" || entry.type !== "refOptionalfeature") {
        return null;
    }

    const parsed = parseOptionalFeatureRef(entry.optionalfeature || entry.ref || entry.name || entry.value);
    if (!parsed.raw) {
        return null;
    }

    return {
        value: parsed.raw,
        label: parsed.name,
        source: parsed.source,
        refType: "optionalfeature",
        catalogKind: "optional-features",
        optionalfeature: parsed.raw
    };
}

function createReferencedFeatureOption(entry) {
    if (!entry || typeof entry !== "object") {
        return null;
    }

    const referenceByType = {
        refClassFeature: {
            refKey: "classFeature",
            catalogKind: "class-features",
            refType: "classFeature"
        },
        refSubclassFeature: {
            refKey: "subclassFeature",
            catalogKind: "subclass-features",
            refType: "subclassFeature"
        }
    };
    const config = referenceByType[entry.type];
    if (!config) {
        return null;
    }

    const raw = String(entry[config.refKey] || entry.ref || entry.name || entry.value || "").trim();
    const name = raw.split("|")[0]?.trim() || raw;
    if (!raw || !name) {
        return null;
    }

    return {
        value: raw,
        label: name,
        source: "",
        refType: config.refType,
        catalogKind: config.catalogKind,
        [config.refKey]: raw
    };
}

function createReferenceOption(entry) {
    return createOptionalFeatureOption(entry) || createReferencedFeatureOption(entry);
}

function createReferenceChoice(catalogRecord, entry, index) {
    if (!entry || typeof entry !== "object" || entry.type !== "options") {
        return null;
    }

    const options = toArray(entry.entries)
        .map(createReferenceOption)
        .filter(Boolean);

    if (!options.length) {
        return null;
    }

    const featureId = getCatalogDtoId(catalogRecord) || `feature-${index + 1}`;
    const featureName = getCatalogDisplayName(catalogRecord, "Class Feature");
    const choiceKey = options.some((option) => option.refType === "optionalfeature")
        ? "optional-feature"
        : "feature-option";
    return {
        id: `${featureId}:${choiceKey}:${index + 1}`,
        type: "class-option",
        featureId,
        featureName,
        label: entry.name || featureName,
        prompt: entry.prompt || `Choose ${Math.max(toNumber(entry.count, 1), 1)} option${toNumber(entry.count, 1) === 1 ? "" : "s"} for ${featureName}.`,
        count: Math.max(toNumber(entry.count, 1), 1),
        sourceName: featureName,
        options
    };
}

function getOptionalFeatureChoicesFromEntries(catalogRecord) {
    return toArray(catalogRecord?.entries)
        .map((entry, index) => createReferenceChoice(catalogRecord, entry, index))
        .filter(Boolean);
}

export function getChoiceProfile(catalogRecord, linkedFeatureRecords) {
    // Combine direct choices with explicit choices from linked feature records.
    const explicitChoiceDefinitions = getDefinedChoices(catalogRecord);
    const linkedFeatureChoiceDefinitions = toArray(linkedFeatureRecords)
        .flatMap((featureRecord) => getDefinedChoices(featureRecord).map((choiceDefinition) => ({
            ...choiceDefinition,
            featureId: choiceDefinition.featureId || getCatalogDtoId(featureRecord),
            featureName: choiceDefinition.featureName || getCatalogDisplayName(featureRecord, "")
        })));

    return {
        explicit: explicitChoiceDefinitions,
        featureChoices: linkedFeatureChoiceDefinitions,
        all: [...explicitChoiceDefinitions, ...linkedFeatureChoiceDefinitions]
    };
}

export function getProfileChoiceDefinitions(catalogProfile, requestedChoiceType = null) {
    // Return every explicit profile choice or the subset matching a normalized type.
    const allChoiceDefinitions = toArray(catalogProfile?.choices?.all);
    if (!requestedChoiceType) {
        return allChoiceDefinitions;
    }

    const requestedChoiceTypes = new Set(toArray(requestedChoiceType).length
        ? toArray(requestedChoiceType).map(normalizeChoiceType)
        : [normalizeChoiceType(requestedChoiceType)]);
    return allChoiceDefinitions.filter((choiceDefinition) => requestedChoiceTypes.has(normalizeChoiceType(choiceDefinition?.type)));
}
