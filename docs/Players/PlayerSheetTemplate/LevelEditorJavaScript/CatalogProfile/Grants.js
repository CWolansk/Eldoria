import {
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import { getStructuredGrantGroup } from "../Catalog/LevelEditorCatalogChoiceResolver.js";
import {
    ABILITY_KEYS,
    PROFICIENCY_KEYS,
    deepClone,
    normalizeGrantGroup
} from "./Shared.js";

export function getProficiencyProfile(catalogRecord) {
    // Build one normalized fixed/choices grant group for each proficiency bucket.
    const proficiencyProfile = {};
    for (const proficiencyKey of PROFICIENCY_KEYS) {
        proficiencyProfile[proficiencyKey] = normalizeGrantGroup(getStructuredGrantGroup(catalogRecord, proficiencyKey));
    }
    return proficiencyProfile;
}

export function getFeatProfile(catalogRecord) {
    // Keep granted feats separate from feat choices so the editor can render both.
    const featGrantGroup = normalizeGrantGroup(getStructuredGrantGroup(catalogRecord, "feats"));
    return {
        granted: featGrantGroup.fixed,
        choices: featGrantGroup.choices,
        choose: featGrantGroup.choices.reduce((totalChoiceCount, featChoice) => totalChoiceCount + Math.max(toNumber(featChoice?.count, 1), 1), 0)
    };
}

function getAbilityEntries(catalogRecord) {
    // Collapse mirrored ability blocks before deriving fixed bonuses and choices.
    const serializedAbilityEntries = new Set();
    const abilityBlocks = [
        ...toArray(catalogRecord?.grants?.ability),
        ...toArray(catalogRecord?.ability),
        ...toArray(catalogRecord?.raw?.ability)
    ];

    return abilityBlocks.filter((abilityEntry) => {
        if (!abilityEntry || typeof abilityEntry !== "object" || Array.isArray(abilityEntry)) {
            return false;
        }
        const serializedAbilityEntry = JSON.stringify(abilityEntry);
        if (serializedAbilityEntries.has(serializedAbilityEntry)) {
            return false;
        }
        serializedAbilityEntries.add(serializedAbilityEntry);
        return true;
    });
}

export function getAbilityProfile(catalogRecord) {
    // Split explicit ability data into fixed increases and player-selectable increases.
    const fixedAbilityIncreases = [];
    const abilityChoiceDefinitions = [];

    for (const abilityEntry of getAbilityEntries(catalogRecord)) {
        if (abilityEntry.choose && typeof abilityEntry.choose === "object") {
            abilityChoiceDefinitions.push({
                choose: deepClone(abilityEntry.choose),
                count: Math.max(toNumber(abilityEntry.choose.count, 1), 1)
            });
        }

        for (const [abilityKey, abilityAmount] of Object.entries(abilityEntry)) {
            const normalizedAbilityKey = String(abilityKey || "").trim().toLowerCase();
            const numericAbilityAmount = toNumber(abilityAmount, 0);
            if (ABILITY_KEYS.has(normalizedAbilityKey) && numericAbilityAmount) {
                fixedAbilityIncreases.push({ ability: normalizedAbilityKey, amount: numericAbilityAmount });
            }
        }
    }

    return { fixed: fixedAbilityIncreases, choices: abilityChoiceDefinitions };
}

function getSpellBlocks(catalogRecord) {
    // Gather structured spell grants from every normalized field the catalog provides.
    return [
        ...toArray(catalogRecord?.grants?.spells),
        ...toArray(catalogRecord?.additionalSpells),
        ...toArray(catalogRecord?.raw?.additionalSpells)
    ].filter(Boolean).map(deepClone);
}

function hasSpellAbilityChoice(spellGrantValue) {
    // Detect spell grants that require a spellcasting ability choice.
    if (!spellGrantValue || typeof spellGrantValue !== "object") {
        return false;
    }
    return Array.isArray(spellGrantValue.ability?.choose) || Array.isArray(spellGrantValue.ability);
}

function isSpellChoice(spellGrant) {
    // Treat filters and choose blocks as player-facing spell choices.
    return Boolean(spellGrant && typeof spellGrant === "object" && (
        spellGrant.type === "choice"
        || spellGrant.choose
        || spellGrant.filter
    ));
}

export function getSpellProfile(catalogRecord) {
    // Separate automatic spell grants from spell choices and ability choices.
    const spellGrantBlocks = getSpellBlocks(catalogRecord);
    const spellChoiceDefinitions = spellGrantBlocks.filter(isSpellChoice);
    const grantedSpellBlocks = spellGrantBlocks.filter((spellGrant) => !isSpellChoice(spellGrant));
    const hasSpellcastingAbilityChoice = spellGrantBlocks.some((spellGrant) => {
        if (hasSpellAbilityChoice(spellGrant)) {
            return true;
        }
        let foundNestedSpellAbilityChoice = false;
        JSON.stringify(spellGrant || {}, (_key, nestedValue) => {
            if (hasSpellAbilityChoice(nestedValue)) {
                foundNestedSpellAbilityChoice = true;
            }
            return nestedValue;
        });
        return foundNestedSpellAbilityChoice;
    });

    return { granted: grantedSpellBlocks, choices: spellChoiceDefinitions, abilityChoice: hasSpellcastingAbilityChoice };
}

export function getProfileGrantGroup(catalogProfile, grantKey) {
    // Expose a profile grant bucket in the same fixed/choices shape used by picker code.
    if (!catalogProfile) {
        return { fixed: [], choices: [] };
    }

    if (grantKey === "feats") {
        return {
            fixed: toArray(catalogProfile.feats?.granted),
            choices: toArray(catalogProfile.feats?.choices)
        };
    }

    return normalizeGrantGroup(catalogProfile.proficiencies?.[grantKey]);
}
