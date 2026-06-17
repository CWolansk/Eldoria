import {
    getCatalogDisplayName,
    getCatalogDtoId,
    getCatalogSource,
    toArray
} from "../Core/LevelEditorShared.js";
import { expandCatalogRecords } from "../Catalog/LevelEditorCatalogChoiceResolver.js";
import {
    deepClone,
    normalizeKind
} from "./Shared.js";
import { getChoiceProfile } from "./Choices.js";
import {
    getAbilityProfile,
    getFeatProfile,
    getProficiencyProfile,
    getSpellProfile
} from "./Grants.js";
import {
    getClassProfile,
    getFeatureProfile,
    getSubclassProfile
} from "./Features.js";

export function buildCatalogProfile(catalogRecord, profileOptions = {}) {
    // Normalize one catalog record into the shape the editor can store and summarize.
    if (!catalogRecord || typeof catalogRecord !== "object") {
        return null;
    }

    const linkedFeatureRecords = toArray(profileOptions.linkedRecords).filter(Boolean);
    const normalizedCatalogKind = normalizeKind(catalogRecord.kind || profileOptions.kind);
    const proficiencyProfile = getProficiencyProfile(catalogRecord);
    return {
        schemaVersion: 1,
        kind: normalizedCatalogKind,
        id: getCatalogDtoId(catalogRecord),
        name: getCatalogDisplayName(catalogRecord, ""),
        source: getCatalogSource(catalogRecord),
        choices: getChoiceProfile(catalogRecord, linkedFeatureRecords),
        proficiencies: proficiencyProfile,
        skillToolLanguages: proficiencyProfile.skillToolLanguages,
        feats: getFeatProfile(catalogRecord),
        abilities: getAbilityProfile(catalogRecord),
        spells: getSpellProfile(catalogRecord),
        prerequisites: toArray(catalogRecord?.prerequisite).map(deepClone),
        background: {
            feature: catalogRecord?.feature || ""
        },
        class: getClassProfile(catalogRecord),
        subclass: getSubclassProfile(catalogRecord),
        features: getFeatureProfile(catalogRecord, linkedFeatureRecords)
    };
}

export function buildBackgroundProfile(backgroundRecord, profileOptions = {}) {
    // Force background kind for records that do not carry a normalized kind.
    return buildCatalogProfile(backgroundRecord, { ...profileOptions, kind: "backgrounds" });
}

export function buildClassProfile(classRecord, profileOptions = {}) {
    // Force class kind for records that do not carry a normalized kind.
    return buildCatalogProfile(classRecord, { ...profileOptions, kind: "classes" });
}

export function buildSubclassProfile(subclassRecord, profileOptions = {}) {
    // Force subclass kind for records that do not carry a normalized kind.
    return buildCatalogProfile(subclassRecord, { ...profileOptions, kind: "subclasses" });
}

export function buildFeatProfile(featRecord, profileOptions = {}) {
    // Force feat kind for records that do not carry a normalized kind.
    return buildCatalogProfile(featRecord, { ...profileOptions, kind: "feats" });
}

export async function buildExpandedCatalogProfile(editorContext, catalogRecord, profileOptions = {}) {
    // Resolve linked feature records through the catalog before building the profile.
    if (!catalogRecord || typeof catalogRecord !== "object") {
        return null;
    }

    const expandedCatalogRecords = await expandCatalogRecords(editorContext, [catalogRecord], {
        includeLinkedFeatures: true,
        classLevel: profileOptions.classLevel,
        featureKinds: profileOptions.featureKinds,
        recursive: profileOptions.recursive
    });
    const linkedFeatureRecords = expandedCatalogRecords.filter((expandedRecord) => expandedRecord !== catalogRecord);
    return buildCatalogProfile(catalogRecord, {
        ...profileOptions,
        linkedRecords: linkedFeatureRecords
    });
}
