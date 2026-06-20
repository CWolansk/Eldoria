import {
    ARTISAN_TOOL_CHOICE_OPTIONS,
    buildStartingChoiceContent,
    hasStartingChoiceOptions,
    MUSICAL_INSTRUMENT_CHOICE_OPTIONS,
    normalizeToolValue,
    TOOL_CHOICE_OPTIONS
} from "./LevelEditorStartingChoiceBuilder.js";

function choiceValues(options) {
    return options.map((option) => option.value);
}

function getChoiceCountFromText(text) {
    return /\b(?:two|2)\b/iu.test(text) ? 2 : 1;
}

function expandToolFixedChoice(rawValue) {
    const text = String(rawValue || "").toLowerCase();
    const wantsChoice = /\bchoice\b/iu.test(text) || /\bany\b/iu.test(text);
    if (!wantsChoice) {
        return [];
    }

    const options = [];
    if (/\bartisan(?:'s)?\s+tools?\b/iu.test(text) || /\bartisans?\s+tools?\b/iu.test(text)) {
        options.push(...choiceValues(ARTISAN_TOOL_CHOICE_OPTIONS));
    }
    if (/\bmusical\s+instrument\b/iu.test(text)) {
        options.push(...choiceValues(MUSICAL_INSTRUMENT_CHOICE_OPTIONS));
    }
    if (!options.length && /\btools?\b/iu.test(text)) {
        options.push(...choiceValues(TOOL_CHOICE_OPTIONS));
    }

    return options.length
        ? [{
            label: "Tool Proficiency",
            prompt: "Choose one tool proficiency granted by your class.",
            from: [...new Set(options)],
            count: getChoiceCountFromText(text)
        }]
        : [];
}

const TOOL_PICKER_CONFIG = {
    label: "Tools",
    choiceType: "tool",
    grantKey: "tools",
    storagePath: "baseChoices.startingProficiencies.tools",
    allOptions: TOOL_CHOICE_OPTIONS,
    anyChoiceKeys: new Set(["any", "any tool", "any tools", "anytool"]),
    expandFixedChoice: expandToolFixedChoice,
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
