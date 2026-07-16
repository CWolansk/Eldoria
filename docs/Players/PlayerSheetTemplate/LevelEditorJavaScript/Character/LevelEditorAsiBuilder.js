import { ABILITIES } from "../../JsonHelpers.js";
import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createElement
} from "../../PlayerSheetHtmlHelper.js";
import {
    getValue,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";

const MAX_ASI_POINTS = 2;
const MAX_ASI_PER_ABILITY = 2;

function createSummaryMetric(label, value, className = "") {
    const metric = createElement("div", `level-editor__ability-metric ${className}`.trim());
    metric.appendChild(createElement("span", "level-editor__ability-metric-label", label));
    metric.appendChild(createElement("strong", "level-editor__ability-metric-value", value));
    return metric;
}

function getInitialIncreases(context) {
    const levelIndex = context.characterLevel - 1;
    const values = toArray(PlayerSheetDtoHelper.getValue(context.dto, `levels.${levelIndex}.AbilityScoreIncrease`, []));
    const increases = new Map(ABILITIES.map((ability) => [ability.key, 0]));

    for (const value of values) {
        const key = String(value || "").toLowerCase();
        if (increases.has(key)) {
            increases.set(key, Math.min(increases.get(key) + 1, MAX_ASI_PER_ABILITY));
        }
    }

    return increases;
}

function expandIncreases(increases) {
    const values = [];
    for (const ability of ABILITIES) {
        const count = increases.get(ability.key) || 0;
        for (let index = 0; index < count; index += 1) {
            values.push(ability.key);
        }
    }
    return values;
}

export function buildAsiContent(context) {
    const fragment = document.createDocumentFragment();
    const levelIndex = context.characterLevel - 1;
    const increases = getInitialIncreases(context);
    const startingScores = new Map(ABILITIES.map((ability) => [
        ability.key,
        toNumber(getValue(context.compiled, `abilities.${ability.key}.score`, 10), 10) - (increases.get(ability.key) || 0)
    ]));
    const countInputs = new Map();
    const previewValues = new Map();

    const editor = createElement("div", "level-editor__ability-editor level-editor__asi-editor");
    const summary = createElement("div", "level-editor__ability-summary");
    const allocatedMetric = createSummaryMetric("Allocated", "0/2");
    const remainingMetric = createSummaryMetric("Remaining", "2");
    summary.appendChild(allocatedMetric);
    summary.appendChild(remainingMetric);

    const grid = createElement("div", "level-editor__ability-grid level-editor__asi-grid");

    function getAllocatedTotal() {
        return Array.from(increases.values()).reduce((total, count) => total + count, 0);
    }

    function updateSummary() {
        const allocated = getAllocatedTotal();
        const remaining = MAX_ASI_POINTS - allocated;
        allocatedMetric.querySelector(".level-editor__ability-metric-value").textContent = `${allocated}/${MAX_ASI_POINTS}`;
        remainingMetric.querySelector(".level-editor__ability-metric-value").textContent = String(remaining);
        remainingMetric.classList.toggle("level-editor__ability-metric--warning", remaining < 0);
    }

    function updateAbility(key, nextCount) {
        const allocatedWithoutAbility = getAllocatedTotal() - (increases.get(key) || 0);
        const clamped = Math.min(
            Math.max(toNumber(nextCount, 0), 0),
            MAX_ASI_PER_ABILITY,
            Math.max(MAX_ASI_POINTS - allocatedWithoutAbility, 0)
        );
        increases.set(key, clamped);
        countInputs.get(key).value = `+${clamped}`;

        const baseScore = startingScores.get(key) || 10;
        previewValues.get(key).textContent = `${baseScore} -> ${baseScore + clamped}`;
        updateSummary();
    }

    for (const ability of ABILITIES) {
        const card = createElement("section", "level-editor__ability-card level-editor__asi-card");
        const header = createElement("div", "level-editor__ability-card-header");
        const title = createElement("h4", "level-editor__ability-card-title", ability.label);
        const preview = createElement("span", "level-editor__ability-card-modifier", "");
        header.appendChild(title);
        header.appendChild(preview);

        const controls = createElement("div", "level-editor__ability-stepper");
        const decrement = document.createElement("button");
        decrement.type = "button";
        decrement.className = "level-editor__ability-stepper-button";
        decrement.textContent = "-";
        decrement.setAttribute("aria-label", `Remove ${ability.label} increase`);

        const input = document.createElement("input");
        input.className = "level-editor__ability-score-input";
        input.type = "text";
        input.readOnly = true;
        input.value = "+0";
        input.setAttribute("aria-label", `${ability.label} increase`);

        const increment = document.createElement("button");
        increment.type = "button";
        increment.className = "level-editor__ability-stepper-button";
        increment.textContent = "+";
        increment.setAttribute("aria-label", `Add ${ability.label} increase`);

        controls.appendChild(decrement);
        controls.appendChild(input);
        controls.appendChild(increment);

        const current = createElement("span", "level-editor__ability-cost", "");
        card.appendChild(header);
        card.appendChild(controls);
        card.appendChild(current);
        grid.appendChild(card);

        countInputs.set(ability.key, input);
        previewValues.set(ability.key, current);

        decrement.addEventListener("click", () => {
            updateAbility(ability.key, (increases.get(ability.key) || 0) - 1);
        });
        increment.addEventListener("click", () => {
            updateAbility(ability.key, (increases.get(ability.key) || 0) + 1);
        });
    }

    const actions = createElement("div", "level-editor__ability-actions");

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "level-editor__button";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", () => {
        const initialIncreases = getInitialIncreases(context);
        for (const ability of ABILITIES) {
            increases.set(ability.key, initialIncreases.get(ability.key) || 0);
            updateAbility(ability.key, increases.get(ability.key));
        }
    });

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.className = "level-editor__button level-editor__button--primary";
    applyButton.textContent = "Apply";
    applyButton.addEventListener("click", () => {
        if (typeof context.onChange !== "function") {
            return;
        }

        let nextDto = PlayerSheetDtoHelper.patch(
            context.dto,
            `levels.${levelIndex}.AbilityScoreIncrease`,
            expandIncreases(increases)
        );
        if (getAllocatedTotal() > 0) {
            nextDto = PlayerSheetDtoHelper.patch(nextDto, `levels.${levelIndex}.feat`, null);
        }
        context.onChange(nextDto);
        applyButton.closest("dialog")?.close();
    });

    actions.appendChild(resetButton);
    actions.appendChild(applyButton);

    editor.appendChild(summary);
    editor.appendChild(grid);
    editor.appendChild(actions);
    fragment.appendChild(editor);

    for (const ability of ABILITIES) {
        updateAbility(ability.key, increases.get(ability.key) || 0);
    }

    return fragment;
}
