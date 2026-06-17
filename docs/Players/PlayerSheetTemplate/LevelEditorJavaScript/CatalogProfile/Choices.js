import {
    getCatalogDisplayName,
    getCatalogDtoId,
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

export function getDefinedChoices(catalogRecord) {
    // Prefer structured choice definitions, then bridge normalized optional-feature
    // option blocks such as Fighting Style into the same choice model.
    return [
        ...toArray(catalogRecord?.choiceDefinitions),
        ...toArray(catalogRecord?.choices),
        ...getOptionalFeatureChoicesFromEntries(catalogRecord)
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

function createOptionalFeatureChoice(catalogRecord, entry, index) {
    if (!entry || typeof entry !== "object" || entry.type !== "options") {
        return null;
    }

    const options = toArray(entry.entries)
        .map(createOptionalFeatureOption)
        .filter(Boolean);

    if (!options.length) {
        return null;
    }

    const featureId = getCatalogDtoId(catalogRecord) || `feature-${index + 1}`;
    const featureName = getCatalogDisplayName(catalogRecord, "Class Feature");
    return {
        id: `${featureId}:optional-feature:${index + 1}`,
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
        .map((entry, index) => createOptionalFeatureChoice(catalogRecord, entry, index))
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
