import {
    buildStartingChoiceContent,
    hasStartingChoiceOptions,
    normalizeToolValue,
    TOOL_CHOICE_OPTIONS
} from "./LevelEditorStartingChoiceBuilder.js";

const TOOL_PICKER_CONFIG = {
    label: "Tools",
    choiceType: "tool",
    grantKey: "tools",
    storagePath: "baseChoices.startingProficiencies.tools",
    allOptions: TOOL_CHOICE_OPTIONS,
    anyChoiceKeys: new Set(["any", "any tool", "any tools", "anytool"]),
    normalize: normalizeToolValue,
    getLabel: (value) => TOOL_CHOICE_OPTIONS.find((option) => option.value === value)?.label || value
};

export function buildToolPickerContent(editorContext) {
    // Render the shared starting-choice picker with tool-specific normalization.
    return buildStartingChoiceContent(editorContext, TOOL_PICKER_CONFIG);
}

export function hasToolPickerChoices(editorContext) {
    // Ask the shared picker engine whether any tool choices are still unresolved.
    return hasStartingChoiceOptions(editorContext, TOOL_PICKER_CONFIG);
}
