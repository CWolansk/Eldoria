import { formatModifier } from "../../JsonHelpers.js";
import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createDescription,
    createElement,
    createField,
    createNumberInput,
} from "../../PlayerSheetHtmlHelper.js";
import {
    getConModifier,
    toNumber
} from "../Core/LevelEditorShared.js";

function normalizeHp(value) {
    return Math.max(0, Math.floor(toNumber(value, 0)));
}

function buildHpActions(context, levelIndex, input, initialValue) {
    const actions = createElement("div", "level-editor__ability-actions");

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "level-editor__button";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", () => {
        input.value = String(initialValue || "");
    });

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.className = "level-editor__button level-editor__button--primary";
    applyButton.textContent = "Apply";
    applyButton.addEventListener("click", () => {
        if (typeof context.onChange !== "function") {
            return;
        }

        const nextDto = PlayerSheetDtoHelper.patch(
            context.dto,
            `levels.${levelIndex}.hp`,
            normalizeHp(input.value)
        );
        context.onChange(nextDto);
        applyButton.closest("dialog")?.close();
    });

    actions.appendChild(resetButton);
    actions.appendChild(applyButton);
    return actions;
}

export function buildHpContent(playerSheetObject, context) {
    const fragment = document.createDocumentFragment();
    const hitDieSize = toNumber(context.classEntry?.hitDieSize, 8);
    const conModifier = getConModifier(playerSheetObject);
    const levelIndex = context.characterLevel - 1;
    const savedHp = normalizeHp(PlayerSheetDtoHelper.getValue(
        context.dto,
        `levels.${levelIndex}.hp`,
        context.levelData?.hpRolled
    ));

    if (context.characterLevel === 1) {
        const startingHp = Math.max(1, hitDieSize + conModifier);
        const { field, input } = createNumberInput("Starting HP", startingHp, {
            type: "hp",
            field: "level1Auto",
            characterLevel: context.characterLevel
        }, {
            readOnly: true
        });
        fragment.appendChild(field);
        fragment.appendChild(createDescription(`Level 1 auto-calculates as max hit die d${hitDieSize} plus CON ${formatModifier(conModifier)}.`));
        fragment.appendChild(buildHpActions(context, levelIndex, input, savedHp || startingHp));
        return fragment;
    }

    const input = document.createElement("input");
    input.className = "level-editor__input level-editor__input--number";
    input.type = "number";
    input.min = "0";
    input.max = "999";
    input.step = "1";
    input.value = String(savedHp || "");

    fragment.appendChild(createField(`Level ${context.characterLevel} HP Gained`, input));
    fragment.appendChild(createDescription(`Use this for the level ${context.characterLevel} HP roll, average choice, or table value.`));
    fragment.appendChild(buildHpActions(context, levelIndex, input, savedHp));
    return fragment;
}
