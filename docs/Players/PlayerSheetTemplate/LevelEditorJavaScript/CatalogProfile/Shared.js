import {
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";

export const PROFICIENCY_KEYS = ["skills", "tools", "weapons", "armor", "languages", "skillToolLanguages"];
export const ABILITY_KEYS = new Set(["str", "dex", "con", "int", "wis", "cha"]);

export function deepClone(sourceValue) {
    // Clone catalog data before putting it in editable DTO/profile structures.
    if (sourceValue == null) {
        return sourceValue;
    }

    if (typeof structuredClone === "function") {
        return structuredClone(sourceValue);
    }

    return JSON.parse(JSON.stringify(sourceValue));
}

export function normalizeKind(rawCatalogKind) {
    // Convert singular API kind names into the plural collection keys used by the editor.
    const catalogKind = String(rawCatalogKind || "").trim();
    const normalizedKind = catalogKind.toLowerCase();
    if (normalizedKind === "background") {
        return "backgrounds";
    }
    if (normalizedKind === "class") {
        return "classes";
    }
    if (normalizedKind === "subclass") {
        return "subclasses";
    }
    if (normalizedKind === "feat") {
        return "feats";
    }
    if (normalizedKind === "classfeature" || normalizedKind === "subclassfeature") {
        return "features";
    }
    return catalogKind;
}

export function normalizeGrantGroup(rawGrantGroup) {
    // Ensure every grant group has cloned fixed grants and normalized choice arrays.
    return {
        fixed: toArray(rawGrantGroup?.fixed).filter(Boolean).map(deepClone),
        choices: toArray(rawGrantGroup?.choices).map((grantChoice) => ({
            ...deepClone(grantChoice),
            from: toArray(grantChoice?.from).filter(Boolean).map(deepClone),
            options: toArray(grantChoice?.options).filter(Boolean).map(deepClone),
            count: Math.max(toNumber(grantChoice?.count, 1), 1)
        }))
    };
}

export function normalizeChoiceType(rawChoiceType) {
    // Match choice types by semantic text instead of punctuation/casing.
    return String(rawChoiceType || "").trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}
