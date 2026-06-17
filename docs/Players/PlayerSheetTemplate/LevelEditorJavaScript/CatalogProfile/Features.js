import {
    getCatalogDisplayName,
    getCatalogDtoId,
    getCatalogSource,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    deepClone,
    normalizeKind
} from "./Shared.js";
import { getDefinedChoices } from "./Choices.js";

export function getFeatureProfile(catalogRecord, linkedFeatureRecords) {
    // Preserve feature references and summarize any expanded linked feature records.
    return {
        classFeatures: toArray(catalogRecord?.classFeatures).map(deepClone),
        subclassFeatures: toArray(catalogRecord?.subclassFeatures).map(deepClone),
        featureRefs: [
            ...toArray(catalogRecord?.featureRefs),
            ...toArray(catalogRecord?.features),
            ...toArray(catalogRecord?.backgroundFeatures)
        ].map(deepClone),
        expanded: toArray(linkedFeatureRecords).map((featureRecord) => ({
            id: getCatalogDtoId(featureRecord),
            name: getCatalogDisplayName(featureRecord, ""),
            source: getCatalogSource(featureRecord),
            kind: normalizeKind(featureRecord?.kind),
            level: featureRecord?.level != null ? toNumber(featureRecord.level, 0) : undefined,
            choices: getDefinedChoices(featureRecord)
        }))
    };
}

export function getClassProfile(classRecord) {
    // Copy class-level metadata that downstream summary and validation code uses.
    return {
        hitDie: deepClone(classRecord?.hitDie ?? null),
        savingThrows: toArray(classRecord?.savingThrows).map((savingThrowKey) => String(savingThrowKey || "").toLowerCase()).filter(Boolean),
        spellcasting: deepClone(classRecord?.spellcasting || null),
        progression: deepClone(classRecord?.progression || null),
        subclassTitle: classRecord?.subclassTitle || "",
        subclassUnlockLevel: toNumber(classRecord?.subclassUnlockLevel || classRecord?.subclassUnlockAtLevel, 0)
    };
}

export function getSubclassProfile(subclassRecord) {
    // Copy subclass identity metadata so saved choices can still be matched later.
    return {
        className: subclassRecord?.className || "",
        classId: subclassRecord?.classId || "",
        classRef: subclassRecord?.classRef || "",
        shortName: subclassRecord?.shortName || "",
        unlockAtClassLevel: toNumber(subclassRecord?.unlockAtClassLevel || subclassRecord?.subclassUnlockLevel, 0)
    };
}
