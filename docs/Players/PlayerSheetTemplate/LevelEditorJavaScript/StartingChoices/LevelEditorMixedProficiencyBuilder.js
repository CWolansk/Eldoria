import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    buildStartingChoiceContent,
    hasStartingChoiceOptions,
    LANGUAGE_CHOICE_OPTIONS,
    normalizeLanguageValue,
    normalizeSkillValue,
    normalizeToolValue,
    SKILL_CHOICE_OPTIONS,
    TOOL_CHOICE_OPTIONS
} from "./LevelEditorStartingChoiceBuilder.js";

const MIXED_CHOICE_OPTIONS = [
    ...SKILL_CHOICE_OPTIONS.map((option) => ({
        value: `skill:${option.value}`,
        label: `Skill: ${option.label}`
    })),
    ...TOOL_CHOICE_OPTIONS.map((option) => ({
        value: `tool:${option.value}`,
        label: `Tool: ${option.label}`
    })),
    ...LANGUAGE_CHOICE_OPTIONS.map((option) => ({
        value: `language:${option.value}`,
        label: `Language: ${option.label}`
    }))
];

function getRawMixedValue(rawMixedChoiceValue) {
    // Accept catalog option objects or persisted primitive values.
    return String(rawMixedChoiceValue?.value || rawMixedChoiceValue?.name || rawMixedChoiceValue?.label || rawMixedChoiceValue || "").trim();
}

function normalizeMixedValue(rawMixedChoiceValue) {
    // Prefix normalized values with their proficiency bucket so they can share one picker.
    const rawChoiceText = getRawMixedValue(rawMixedChoiceValue);
    const normalizedChoiceText = rawChoiceText.toLowerCase();

    if (normalizedChoiceText.startsWith("skill:")) {
        const normalizedSkill = normalizeSkillValue(rawChoiceText.slice(6));
        return normalizedSkill ? `skill:${normalizedSkill}` : "";
    }

    if (normalizedChoiceText.startsWith("tool:")) {
        const normalizedTool = normalizeToolValue(rawChoiceText.slice(5));
        return normalizedTool ? `tool:${normalizedTool}` : "";
    }

    if (normalizedChoiceText.startsWith("language:")) {
        const normalizedLanguage = normalizeLanguageValue(rawChoiceText.slice(9));
        return normalizedLanguage ? `language:${normalizedLanguage}` : "";
    }

    const normalizedSkill = normalizeSkillValue(rawChoiceText);
    if (normalizedSkill) {
        return `skill:${normalizedSkill}`;
    }

    const normalizedTool = normalizeToolValue(rawChoiceText);
    if (normalizedTool) {
        return `tool:${normalizedTool}`;
    }

    const normalizedLanguage = normalizeLanguageValue(rawChoiceText);
    return normalizedLanguage ? `language:${normalizedLanguage}` : "";
}

function expandMixedOption(rawMixedChoiceValue) {
    // Expand broad "any" placeholders into concrete skill/tool/language options.
    const rawChoiceText = getRawMixedValue(rawMixedChoiceValue);
    const compactChoiceKey = rawChoiceText.replace(/\s+/gu, "").toLowerCase();

    if (["anyskill", "anyskills"].includes(compactChoiceKey)) {
        return SKILL_CHOICE_OPTIONS.map((option) => ({ ...option, value: `skill:${option.value}` }));
    }

    if (["anytool", "anytools"].includes(compactChoiceKey)) {
        return TOOL_CHOICE_OPTIONS.map((option) => ({ ...option, value: `tool:${option.value}` }));
    }

    if (["anylanguage", "anylanguages", "anystandardlanguage", "anystandardlanguages"].includes(compactChoiceKey)) {
        return LANGUAGE_CHOICE_OPTIONS.map((option) => ({ ...option, value: `language:${option.value}` }));
    }

    if (["any", "anyskilltoollanguage", "anyskilltoollanguages"].includes(compactChoiceKey)) {
        return MIXED_CHOICE_OPTIONS;
    }

    return null;
}

function valuesFromPersistedGroups(characterDto) {
    // Read existing mixed-choice selections from the grouped proficiency-choice store.
    const persistedMixedChoiceGroups = PlayerSheetDtoHelper.getValue(characterDto, "baseChoices.proficiencyChoices.skillToolLanguages", {});
    return Object.values(persistedMixedChoiceGroups || {}).flatMap((choiceGroup) => choiceGroup?.values || []);
}

function stripPersistedMixedValues(previousDto, nextDto) {
    // Remove prior mixed-choice grants before applying the latest selected values.
    const previousMixedValues = valuesFromPersistedGroups(previousDto).map(normalizeMixedValue).filter(Boolean);
    const previousSkillValues = new Set(previousMixedValues.filter((value) => value.startsWith("skill:")).map((value) => value.slice(6)));
    const previousToolValues = new Set(previousMixedValues.filter((value) => value.startsWith("tool:")).map((value) => value.slice(5)));
    const previousLanguageValues = new Set(previousMixedValues.filter((value) => value.startsWith("language:")).map((value) => value.slice(9)));
    const currentSkillValues = PlayerSheetDtoHelper.getValue(nextDto, "baseChoices.startingProficiencies.skills", []);
    const currentToolValues = PlayerSheetDtoHelper.getValue(nextDto, "baseChoices.startingProficiencies.tools", []);
    const currentLanguageValues = PlayerSheetDtoHelper.getValue(nextDto, "baseChoices.startingProficiencies.languages", []);

    let stripped = PlayerSheetDtoHelper.patch(
        nextDto,
        "baseChoices.startingProficiencies.skills",
        currentSkillValues.filter((skillValue) => !previousSkillValues.has(skillValue))
    );
    stripped = PlayerSheetDtoHelper.patch(
        stripped,
        "baseChoices.startingProficiencies.tools",
        currentToolValues.filter((toolValue) => !previousToolValues.has(toolValue))
    );
    stripped = PlayerSheetDtoHelper.patch(
        stripped,
        "baseChoices.startingProficiencies.languages",
        currentLanguageValues.filter((languageValue) => !previousLanguageValues.has(languageValue))
    );
    return stripped;
}

function applyMixedValues(characterDto, normalizedMixedValues) {
    // Fan mixed selections back out into the existing skill/tool/language DTO arrays.
    const selectedSkillValues = normalizedMixedValues.filter((value) => String(value).startsWith("skill:")).map((value) => value.slice(6));
    const selectedToolValues = normalizedMixedValues.filter((value) => String(value).startsWith("tool:")).map((value) => value.slice(5));
    const selectedLanguageValues = normalizedMixedValues.filter((value) => String(value).startsWith("language:")).map((value) => value.slice(9));
    let nextDto = stripPersistedMixedValues(characterDto, characterDto);
    const currentSkillValues = PlayerSheetDtoHelper.getValue(nextDto, "baseChoices.startingProficiencies.skills", []);
    const currentToolValues = PlayerSheetDtoHelper.getValue(nextDto, "baseChoices.startingProficiencies.tools", []);
    const currentLanguageValues = PlayerSheetDtoHelper.getValue(nextDto, "baseChoices.startingProficiencies.languages", []);

    nextDto = PlayerSheetDtoHelper.patch(
        nextDto,
        "baseChoices.startingProficiencies.skills",
        [...new Set([...currentSkillValues, ...selectedSkillValues])]
    );
    nextDto = PlayerSheetDtoHelper.patch(
        nextDto,
        "baseChoices.startingProficiencies.tools",
        [...new Set([...currentToolValues, ...selectedToolValues])]
    );
    nextDto = PlayerSheetDtoHelper.patch(
        nextDto,
        "baseChoices.startingProficiencies.languages",
        [...new Set([...currentLanguageValues, ...selectedLanguageValues])]
    );
    return nextDto;
}

const MIXED_PROFICIENCY_PICKER_CONFIG = {
    label: "Mixed Proficiencies",
    choiceType: ["skillToolLanguage", "skillToolLanguages"],
    grantKey: "skillToolLanguages",
    allOptions: MIXED_CHOICE_OPTIONS,
    anyChoiceKeys: new Set(["any", "any skill", "any tool", "any language", "anyskill", "anytool", "anylanguage"]),
    normalize: normalizeMixedValue,
    expandOption: expandMixedOption,
    getLabel: (value) => MIXED_CHOICE_OPTIONS.find((option) => option.value === value)?.label || value,
    getExistingValues: valuesFromPersistedGroups,
    applyValues: applyMixedValues
};

export function buildMixedProficiencyPickerContent(editorContext) {
    // Render the shared picker using the mixed skill/tool/language configuration.
    return buildStartingChoiceContent(editorContext, MIXED_PROFICIENCY_PICKER_CONFIG);
}

export function hasMixedProficiencyPickerChoices(editorContext) {
    // Ask the shared picker engine whether any mixed proficiency choices are unresolved.
    return hasStartingChoiceOptions(editorContext, MIXED_PROFICIENCY_PICKER_CONFIG);
}
