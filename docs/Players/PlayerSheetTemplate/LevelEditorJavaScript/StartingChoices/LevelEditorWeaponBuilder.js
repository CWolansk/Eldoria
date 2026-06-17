import {
    buildStartingChoiceContent,
    hasStartingChoiceOptions,
    MARTIAL_WEAPON_OPTIONS,
    normalizeWeaponValue
} from "./LevelEditorStartingChoiceBuilder.js";

const WEAPON_PICKER_CONFIG = {
    label: "Weapons",
    choiceType: "weapon",
    grantKey: "weapons",
    storagePath: "baseChoices.startingProficiencies.weapons",
    allOptions: MARTIAL_WEAPON_OPTIONS,
    anyChoiceKeys: new Set(["any", "any weapon", "any weapons", "anyweapon"]),
    filteredOptions: (filter) => /martial weapon/iu.test(String(filter || "")) ? MARTIAL_WEAPON_OPTIONS : [],
    normalize: normalizeWeaponValue,
    getLabel: (value) => MARTIAL_WEAPON_OPTIONS.find((option) => option.value === value)?.label || value
};

export function buildWeaponPickerContent(editorContext) {
    // Render the shared starting-choice picker with weapon-specific normalization.
    return buildStartingChoiceContent(editorContext, WEAPON_PICKER_CONFIG);
}

export function hasWeaponPickerChoices(editorContext) {
    // Ask the shared picker engine whether any weapon choices are still unresolved.
    return hasStartingChoiceOptions(editorContext, WEAPON_PICKER_CONFIG);
}
