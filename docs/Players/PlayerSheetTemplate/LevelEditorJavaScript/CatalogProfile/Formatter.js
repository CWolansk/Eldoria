import {
    formatChoice,
    formatSpellGrant,
    toArray
} from "../Core/LevelEditorShared.js";

function formatChoiceFromGroup(choiceGroupLabel, grantGroup) {
    // Format one grant bucket into user-facing option summary lines.
    return toArray(grantGroup?.choices)
        .map((choiceDefinition) => `${choiceGroupLabel}: ${formatChoice(choiceDefinition)}`)
        .filter(Boolean);
}

function formatAbilityChoice(abilityChoiceDefinition) {
    // Ability choices may wrap the choose block or be the choose block directly.
    const abilityChooseBlock = abilityChoiceDefinition?.choose || abilityChoiceDefinition;
    return abilityChooseBlock ? `Ability: ${formatChoice(abilityChooseBlock)}` : "";
}

export function formatProfileOptionSummaries(catalogProfile) {
    // Collect every player-facing choice into a compact preview list.
    if (!catalogProfile) {
        return [];
    }

    const optionSummaryLines = [];
    for (const [choiceGroupLabel, proficiencyKey] of [
        ["Skill", "skills"],
        ["Tool", "tools"],
        ["Weapon", "weapons"],
        ["Armor", "armor"],
        ["Language", "languages"],
        ["Skill/Tool/Language", "skillToolLanguages"]
    ]) {
        optionSummaryLines.push(...formatChoiceFromGroup(choiceGroupLabel, catalogProfile.proficiencies?.[proficiencyKey]));
    }

    optionSummaryLines.push(...formatChoiceFromGroup("Feat", {
        choices: catalogProfile.feats?.choices
    }));
    optionSummaryLines.push(...toArray(catalogProfile.abilities?.choices).map(formatAbilityChoice).filter(Boolean));
    optionSummaryLines.push(...toArray(catalogProfile.spells?.choices).map((spellChoiceDefinition) => `Spell: ${formatSpellGrant(spellChoiceDefinition)}`).filter(Boolean));
    optionSummaryLines.push(...toArray(catalogProfile.choices?.all).map((choiceDefinition) => {
        const choiceLabel = choiceDefinition.label || choiceDefinition.type || "Choice";
        const choiceDetail = choiceDefinition.prompt || formatChoice(choiceDefinition);
        return [choiceLabel, choiceDetail].filter(Boolean).join(": ");
    }));

    return [...new Set(optionSummaryLines.filter(Boolean))];
}
