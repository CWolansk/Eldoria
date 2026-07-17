import {
    formatRaceSize,
    getCatalogCache,
    getCatalogDisplayName,
    getValue,
    normalizeSearchText,
    toArray
} from "../Core/LevelEditorShared.js";
import { getEffectiveRaceChoiceSelections } from "../../PlayerSheetDtoHelper.js";
import {
    expandCatalogRecords,
    getStructuredChoiceDefinitions
} from "../Catalog/LevelEditorCatalogChoiceResolver.js";

export const RACE_CHOICE_SELECTION_PATH = "baseChoices.raceChoices.selections";

const ABILITY_OPTIONS = [
    { value: "str", label: "Strength" },
    { value: "dex", label: "Dexterity" },
    { value: "con", label: "Constitution" },
    { value: "int", label: "Intelligence" },
    { value: "wis", label: "Wisdom" },
    { value: "cha", label: "Charisma" }
];

const SPELL_ABILITY_OPTIONS = [
    { value: "int", label: "Intelligence" },
    { value: "wis", label: "Wisdom" },
    { value: "cha", label: "Charisma" }
];

const SIZE_ORDER = ["T", "S", "M", "L", "H", "G"];

function stripJsonExtension(value) {
    return String(value || "").replace(/\.json$/iu, "");
}

function normalizeId(value) {
    return normalizeSearchText(stripJsonExtension(value)).replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function getRaceId(race) {
    return String(race?.id || race?.ref || race?.refId || race?.sourceId || race?.name || "").trim();
}

async function resolveCatalogRecord(catalog, kind, identity) {
    if (!identity) {
        return null;
    }

    if (!catalog) {
        return identity?.choiceDefinitions || identity?.grants ? identity : null;
    }

    const ids = [
        identity.options?.catalogId,
        identity.catalogId,
        identity.id
    ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

    for (const id of ids) {
        try {
            const record = await catalog.getById(kind, id);
            if (record) {
                return record;
            }
        } catch (_error) {
            // Try the next identity shape before falling back to name matching.
        }
    }

    return null;
}

function appendRecord(records, record) {
    if (!record) {
        return;
    }

    const key = normalizeSearchText(getRaceId(record));
    if (key && records.some((existing) => normalizeSearchText(getRaceId(existing)) === key)) {
        return;
    }

    records.push(record);
}

export async function loadSelectedRaceRecords(context) {
    const catalog = getCatalogCache(context.api);
    const records = [];
    const raceIdentity = getValue(context.dto, "baseChoices.race", null);
    const race = await resolveCatalogRecord(catalog, "races", raceIdentity);

    if (race?.parentId && catalog) {
        try {
            appendRecord(records, await catalog.getById("races", race.parentId));
        } catch (_error) {
            // Selected race can still be edited without parent details.
        }
    }

    appendRecord(records, race);
    return expandCatalogRecords(context, records, { includeLinkedFeatures: true });
}

function addChoice(choices, choice) {
    if (!choice?.id || choices.some((existing) => existing.id === choice.id)) {
        return;
    }

    choices.push({
        required: true,
        count: 1,
        ...choice
    });
}

function mapChoiceDefinition(choice) {
    if (!choice?.type) {
        return null;
    }

    if (["skill", "tool", "language", "feat"].includes(choice.type)) {
        return null;
    }

    return {
        id: choice.id || choice.choiceId || `race-choice-${normalizeId(choice.label || choice.type)}`,
        sourceId: choice.id || choice.choiceId || "",
        type: choice.type,
        label: choice.label || choice.type,
        prompt: choice.prompt || "",
        control: choice.control || "select",
        valueKey: choice.valueKey || choice.type,
        count: choice.count || 1,
        amount: choice.amount,
        patterns: toArray(choice.patterns),
        options: toArray(choice.options),
        sourceName: choice.sourceName || "",
        source: choice.source || ""
    };
}

function hasSpellAbilityChoice(spell) {
    const ability = spell?.ability;
    return Array.isArray(ability?.choose) || Array.isArray(ability);
}

function hasAnySpellAbilityChoice(race) {
    return [
        ...toArray(race?.grants?.spells),
        ...toArray(race?.additionalSpells),
        ...toArray(race?.raw?.additionalSpells)
    ].some((spell) => {
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
}

function addSizeChoice(choices, race) {
    const sizes = toArray(race?.size || race?.raw?.size)
        .map((size) => String(size || "").trim())
        .filter(Boolean)
        .sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));

    if (sizes.length < 2) {
        return;
    }

    addChoice(choices, {
        id: "race-size",
        type: "size",
        label: "Size",
        prompt: "Choose your character size.",
        control: "select",
        valueKey: "size",
        options: sizes.map((size) => ({
            value: formatRaceSize(size) || size,
            label: formatRaceSize(size) || size,
            rawSize: size
        }))
    });
}

function addSpellAbilityChoice(choices, race) {
    if (!hasAnySpellAbilityChoice(race)) {
        return;
    }

    addChoice(choices, {
        id: "race-spellcasting-ability",
        type: "spell-ability",
        label: "Racial Spellcasting Ability",
        prompt: "Choose the spellcasting ability used by racial spells.",
        control: "select",
        valueKey: "spellAbility",
        options: SPELL_ABILITY_OPTIONS
    });
}

function shouldIncludeChoice(choice, raceChoices) {
    void raceChoices;
    void choice;
    return true;
}

export function getRaceChoiceSelections(raceChoices = {}) {
    const selections = raceChoices?.selections;
    return selections && typeof selections === "object" ? selections : {};
}

export function sanitizeRaceChoiceSelections(choices = [], selections = {}) {
    const sourceSelections = selections && typeof selections === "object" ? selections : {};
    const selectionsByChoiceId = new Map(
        Object.values(sourceSelections)
            .filter((selection) => selection && typeof selection === "object")
            .map((selection) => [String(selection.choiceId || "").trim(), selection])
            .filter(([choiceId]) => choiceId)
    );
    const output = {};

    for (const choice of toArray(choices)) {
        const selection = sourceSelections[choice.id] || selectionsByChoiceId.get(choice.id);
        if (!selection || (selection.type && selection.type !== choice.type)) {
            continue;
        }

        output[choice.id] = JSON.parse(JSON.stringify(selection));
        output[choice.id].choiceId = choice.id;
    }

    return output;
}

export function getRaceChoiceSelection(raceChoices, choiceId) {
    return getRaceChoiceSelections(raceChoices)[choiceId] || null;
}

export function getRaceChoiceValue(raceChoices, choiceIdOrValueKey) {
    const selections = getRaceChoiceSelections(raceChoices);
    const direct = selections[choiceIdOrValueKey];
    if (direct) {
        return direct.value ?? direct.values?.[0]?.value ?? "";
    }

    return Object.values(selections)
        .find((selection) => selection?.valueKey === choiceIdOrValueKey)
        ?.value || "";
}

export function createRaceChoiceSelection(choice, value, options = {}) {
    const values = Array.isArray(value) ? value : [value].filter((entry) => entry != null && entry !== "");
    const selectedOptions = toArray(choice.options)
        .filter((option) => values.includes(option.value))
        .map((option) => ({ ...option }));

    return {
        choiceId: choice.id,
        type: choice.type,
        label: choice.label,
        valueKey: choice.valueKey || choice.type,
        sourceName: choice.sourceName || "",
        source: choice.source || "",
        count: choice.count || 1,
        amount: choice.amount || 1,
        value: values[0] ?? "",
        values: selectedOptions.length ? selectedOptions : values.map((entry) => ({ value: entry, label: String(entry) })),
        ...options
    };
}

export function createAbilityChoiceSelection(choice, patternValue, groupValues) {
    const abilityIncreases = [];
    const pattern = toArray(choice.patterns).find((entry) => entry.value === patternValue) || null;

    if (pattern) {
        for (const group of toArray(pattern.groups)) {
            for (const ability of toArray(groupValues[group.id])) {
                abilityIncreases.push({
                    ability,
                    amount: group.amount || choice.amount || 1,
                    groupId: group.id
                });
            }
        }
    } else {
        for (const ability of toArray(groupValues.default)) {
            abilityIncreases.push({
                ability,
                amount: choice.amount || 1,
                groupId: "default"
            });
        }
    }

    return {
        choiceId: choice.id,
        type: choice.type,
        label: choice.label,
        valueKey: choice.valueKey || "ability",
        sourceName: choice.sourceName || "",
        source: choice.source || "",
        value: patternValue || "default",
        pattern: patternValue || "",
        groupValues,
        abilityIncreases
    };
}

export async function buildRaceChoiceModel(context) {
    const raceChoices = getValue(context.dto, "baseChoices.raceChoices", {});
    const records = await loadSelectedRaceRecords(context);
    const choices = [];

    for (const race of records) {
        if (!race) {
            continue;
        }

        for (const definition of getStructuredChoiceDefinitions(race)) {
            const choice = mapChoiceDefinition(definition);
            if (choice && shouldIncludeChoice(choice, raceChoices)) {
                addChoice(choices, choice);
            }
        }

        addSizeChoice(choices, race);
        addSpellAbilityChoice(choices, race);
    }

    return {
        records,
        choices,
        selections: sanitizeRaceChoiceSelections(
            choices,
            getEffectiveRaceChoiceSelections(context.dto)
        )
    };
}

export async function hasRaceChoiceOptions(context) {
    try {
        const model = await buildRaceChoiceModel(context);
        return model.choices.some((choice) => choice.required !== false || toArray(choice.options).length > 0);
    } catch (error) {
        console.warn("Race option visibility check failed:", error);
        return true;
    }
}

export function summarizeRaceChoices(raceChoices = {}) {
    return Object.values(getRaceChoiceSelections(raceChoices))
        .map((selection) => {
            if (selection.type === "racial-asi") {
                return toArray(selection.abilityIncreases)
                    .map((increase) => `${increase.ability?.toUpperCase()} +${increase.amount}`)
                    .join(", ");
            }

            return toArray(selection.values)
                .map((value) => value.label || value.name || value.value)
                .filter(Boolean)
                .join(", ") || selection.value || selection.label;
        })
        .filter(Boolean)
        .join(" | ");
}
