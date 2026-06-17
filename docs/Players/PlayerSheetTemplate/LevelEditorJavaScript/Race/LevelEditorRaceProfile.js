import {
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    getRaceAutoAbilityIncreases,
    getStructuredChoiceDefinitions,
    getStructuredGrantGroup
} from "../Catalog/LevelEditorCatalogChoiceResolver.js";

// LevelEditorRaceProfile builds a single normalized description of everything a
// race record grants or asks the player to choose. The result is stored on
// `baseChoices.race.profile` so the (offline, synchronous) compiler can apply
// the fixed grants without re-reading the catalog, and so the editor has one
// source of truth for the choices it still needs to surface.

const SPEED_MODES = ["walk", "fly", "swim", "climb", "burrow"];

function prefer(record, parentRace, key) {
    const value = record?.[key];
    if (value != null && !(Array.isArray(value) && !value.length)) {
        return value;
    }
    return parentRace?.[key];
}

function normalizeGrantGroup(group) {
    return {
        fixed: toArray(group?.fixed).filter(Boolean),
        choices: toArray(group?.choices).map((choice) => ({
            from: toArray(choice?.from).filter(Boolean),
            count: Math.max(toNumber(choice?.count, 1), 1),
            amount: choice?.amount != null ? toNumber(choice.amount, 1) : undefined
        }))
    };
}

function getProficiencyProfile(record) {
    const profile = {};
    for (const key of ["skills", "tools", "weapons", "armor", "languages"]) {
        profile[key] = normalizeGrantGroup(getStructuredGrantGroup(record, key));
    }
    return profile;
}

function getFeatProfile(record) {
    const group = normalizeGrantGroup(getStructuredGrantGroup(record, "feats"));
    const choose = group.choices.reduce((total, choice) => total + (choice.count || 0), 0);
    return {
        granted: group.fixed,
        choices: group.choices,
        choose
    };
}

// Several fields (resist, immune, ...) mix flat strings with `{choose: {...}}`
// blocks. Split them so fixed values can be applied automatically and choices
// can be presented.
function splitChoiceArray(values) {
    const fixed = [];
    const choices = [];

    for (const entry of toArray(values)) {
        if (entry && typeof entry === "object") {
            const choose = entry.choose || entry;
            if (choose?.from) {
                choices.push({
                    from: toArray(choose.from).map((value) => String(value)).filter(Boolean),
                    count: Math.max(toNumber(choose.count, 1), 1)
                });
            }
            continue;
        }

        const value = String(entry ?? "").trim();
        if (value) {
            fixed.push(value);
        }
    }

    return { fixed, choices };
}

function getDefenseProfile(record) {
    const resistances = splitChoiceArray(record?.resist);
    return {
        resistances,
        immunities: splitChoiceArray(record?.immune).fixed,
        vulnerabilities: splitChoiceArray(record?.vulnerable).fixed,
        conditionImmunities: splitChoiceArray(record?.conditionImmune).fixed
    };
}

function getSenseProfile(record, parentRace) {
    return {
        darkvision: Math.max(toNumber(prefer(record, parentRace, "darkvision"), 0), 0),
        blindsight: Math.max(toNumber(prefer(record, parentRace, "blindsight"), 0), 0)
    };
}

function getSpeedProfile(record, parentRace) {
    const speed = prefer(record, parentRace, "speed");
    if (typeof speed === "number") {
        return { walk: speed };
    }

    if (!speed || typeof speed !== "object") {
        return {};
    }

    const speeds = {};
    for (const mode of SPEED_MODES) {
        const value = speed[mode];
        if (value === true) {
            // A boolean speed means "equal to your walking speed".
            speeds[mode] = "walk";
        } else if (toNumber(value, 0) > 0) {
            speeds[mode] = toNumber(value, 0);
        }
    }
    return speeds;
}

function getSizeProfile(record, parentRace) {
    const options = toArray(prefer(record, parentRace, "size"))
        .map((value) => String(value || "").trim())
        .filter(Boolean);
    return {
        options,
        fixed: options.length === 1 ? options[0] : null,
        isChoice: options.length > 1
    };
}

function getCreatureTypeProfile(record, parentRace) {
    const types = toArray(prefer(record, parentRace, "creatureTypes"))
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
    return {
        types: types.length ? types : ["humanoid"],
        tags: toArray(prefer(record, parentRace, "creatureTypeTags"))
            .map((value) => String(value || "").trim().toLowerCase())
            .filter(Boolean)
    };
}

function getSkillToolLanguageProfile(record) {
    const choices = [];
    for (const entry of toArray(record?.skillToolLanguageProficiencies)) {
        for (const choose of toArray(entry?.choose)) {
            if (choose?.from) {
                choices.push({
                    from: toArray(choose.from).map((value) => String(value)).filter(Boolean),
                    count: Math.max(toNumber(choose.count, 1), 1)
                });
            }
        }
    }
    return choices;
}

function hasSpellAbilityChoice(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    return Array.isArray(value.ability?.choose) || Array.isArray(value.ability);
}

function getSpellcastingProfile(record) {
    const spellBlocks = [
        ...toArray(record?.additionalSpells),
        ...toArray(record?.raw?.additionalSpells)
    ];

    const abilityChoice = spellBlocks.some((spell) => {
        if (hasSpellAbilityChoice(spell)) {
            return true;
        }
        let found = false;
        JSON.stringify(spell || {}, (_key, value) => {
            if (hasSpellAbilityChoice(value)) {
                found = true;
            }
            return value;
        });
        return found;
    });

    return { abilityChoice };
}

function getAbilityProfile(record) {
    const choice = getStructuredChoiceDefinitions(record)
        .find((definition) => definition?.type === "racial-asi") || null;

    return {
        auto: getRaceAutoAbilityIncreases(record),
        choice
    };
}

export function buildRaceProfile(record, parentRace = null) {
    if (!record || typeof record !== "object") {
        return null;
    }

    return {
        schemaVersion: 1,
        abilities: getAbilityProfile(record),
        proficiencies: getProficiencyProfile(record),
        skillToolLanguages: getSkillToolLanguageProfile(record),
        feats: getFeatProfile(record),
        defenses: getDefenseProfile(record),
        senses: getSenseProfile(record, parentRace),
        speeds: getSpeedProfile(record, parentRace),
        size: getSizeProfile(record, parentRace),
        creatureType: getCreatureTypeProfile(record, parentRace),
        spellcasting: getSpellcastingProfile(record)
    };
}

export function getRaceProfile(dto) {
    const profile = dto?.baseChoices?.race?.profile;
    return profile && typeof profile === "object" ? profile : null;
}
