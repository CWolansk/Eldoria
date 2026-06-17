import {
    buildStartingChoiceContent,
    hasStartingChoiceOptions,
    normalizeSkillValue,
    SKILL_CHOICE_OPTIONS
} from "./LevelEditorStartingChoiceBuilder.js";

const SKILL_PICKER_CONFIG = {
    label: "Skills",
    choiceType: "skill",
    grantKey: "skills",
    storagePath: "baseChoices.startingProficiencies.skills",
    allOptions: SKILL_CHOICE_OPTIONS,
    anyChoiceKeys: new Set(["any", "any skill", "any skills"]),
    normalize: normalizeSkillValue,
    getLabel: (value) => SKILL_CHOICE_OPTIONS.find((option) => option.value === value)?.label || value
};

export function buildSkillPickerContent(editorContext) {
    // Render the shared starting-choice picker with skill-specific normalization.
    return buildStartingChoiceContent(editorContext, SKILL_PICKER_CONFIG);
}

export function hasSkillPickerChoices(editorContext) {
    // Ask the shared picker engine whether any skill choices are still unresolved.
    return hasStartingChoiceOptions(editorContext, SKILL_PICKER_CONFIG);
}
