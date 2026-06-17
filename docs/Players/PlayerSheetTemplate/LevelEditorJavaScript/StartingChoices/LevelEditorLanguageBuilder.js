import {
    buildStartingChoiceContent,
    hasStartingChoiceOptions,
    LANGUAGE_CHOICE_OPTIONS,
    normalizeLanguageValue
} from "./LevelEditorStartingChoiceBuilder.js";

const LANGUAGE_PICKER_CONFIG = {
    label: "Languages",
    choiceType: "language",
    grantKey: "languages",
    storagePath: "baseChoices.startingProficiencies.languages",
    allOptions: LANGUAGE_CHOICE_OPTIONS,
    anyChoiceKeys: new Set(["any", "any language", "any languages", "anystandard", "any standard", "any standard language"]),
    normalize: normalizeLanguageValue,
    getLabel: (value) => value
};

export function buildLanguagePickerContent(editorContext) {
    // Render the shared starting-choice picker with language-specific normalization.
    return buildStartingChoiceContent(editorContext, LANGUAGE_PICKER_CONFIG);
}

export function hasLanguagePickerChoices(editorContext) {
    // Ask the shared picker engine whether any language choices are still unresolved.
    return hasStartingChoiceOptions(editorContext, LANGUAGE_PICKER_CONFIG);
}
