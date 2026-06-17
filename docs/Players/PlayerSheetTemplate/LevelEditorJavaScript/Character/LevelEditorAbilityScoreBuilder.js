import { ABILITIES, formatModifier, getAbilityModifier } from "../../JsonHelpers.js";
import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createElement
} from "../../PlayerSheetHtmlHelper.js";
import {
    getValue,
    toNumber
} from "../Core/LevelEditorShared.js";

const MIN_ABILITY_SCORE = 1;
const MAX_ABILITY_SCORE = 30;
const POINT_BUY_LIMIT = 27;
const POINT_BUY_COSTS = new Map([
    [8, 0],
    [9, 1],
    [10, 2],
    [11, 3],
    [12, 4],
    [13, 5],
    [14, 7],
    [15, 9]
]);

function clampScore(value) {
    return Math.min(Math.max(toNumber(value, 10), MIN_ABILITY_SCORE), MAX_ABILITY_SCORE);
}

function getInitialScores(context) {
    const scores = {};

    for (const ability of ABILITIES) {
        scores[ability.key] = clampScore(
            getValue(
                context.dto,
                `baseChoices.abilityScores.${ability.key}`,
                getValue(context.compiled, `abilities.${ability.key}.score`, 10)
            )
        );
    }

    return scores;
}

function getPointBuyCost(score) {
    return POINT_BUY_COSTS.has(score) ? POINT_BUY_COSTS.get(score) : null;
}

function getPointBuySummary(scores) {
    let total = 0;

    for (const ability of ABILITIES) {
        const cost = getPointBuyCost(scores[ability.key]);
        if (cost == null) {
            return {
                label: "Custom array",
                value: "",
                isOverLimit: false
            };
        }
        total += cost;
    }

    const remaining = POINT_BUY_LIMIT - total;
    return {
        label: `${total}/${POINT_BUY_LIMIT} point buy`,
        value: remaining >= 0 ? `${remaining} remaining` : `${Math.abs(remaining)} over`,
        isOverLimit: remaining < 0
    };
}

function createSummaryMetric(label, value, className = "") {
    const metric = createElement("div", `level-editor__ability-metric ${className}`.trim());
    metric.appendChild(createElement("span", "level-editor__ability-metric-label", label));
    metric.appendChild(createElement("strong", "level-editor__ability-metric-value", value));
    return metric;
}

export function buildAbilityScoreContent(context) {
    const fragment = document.createDocumentFragment();
    const scores = getInitialScores(context);
    const inputs = new Map();
    const modifiers = new Map();
    const costs = new Map();

    const editor = createElement("div", "level-editor__ability-editor");
    const summary = createElement("div", "level-editor__ability-summary");
    const scoreTotalMetric = createSummaryMetric("Total", "0");
    const pointBuyMetric = createSummaryMetric("Point Buy", "Custom array");
    const remainingMetric = createSummaryMetric("Remaining", "");
    summary.appendChild(scoreTotalMetric);
    summary.appendChild(pointBuyMetric);
    summary.appendChild(remainingMetric);

    const grid = createElement("div", "level-editor__ability-grid");

    function updateSummary() {
        const total = ABILITIES.reduce((sum, ability) => sum + scores[ability.key], 0);
        const pointBuy = getPointBuySummary(scores);

        scoreTotalMetric.querySelector(".level-editor__ability-metric-value").textContent = String(total);
        pointBuyMetric.querySelector(".level-editor__ability-metric-value").textContent = pointBuy.label;
        remainingMetric.querySelector(".level-editor__ability-metric-value").textContent = pointBuy.value || "-";
        remainingMetric.classList.toggle("level-editor__ability-metric--warning", pointBuy.isOverLimit);
    }

    function updateAbility(key, value) {
        const score = clampScore(value);
        scores[key] = score;
        inputs.get(key).value = String(score);
        modifiers.get(key).textContent = formatModifier(getAbilityModifier(score));

        const cost = getPointBuyCost(score);
        costs.get(key).textContent = cost == null ? "Custom" : `${cost} point${cost === 1 ? "" : "s"}`;
        updateSummary();
    }

    for (const ability of ABILITIES) {
        const card = createElement("section", "level-editor__ability-card");
        const header = createElement("div", "level-editor__ability-card-header");
        const title = createElement("h4", "level-editor__ability-card-title", ability.label);
        const modifier = createElement("span", "level-editor__ability-card-modifier", formatModifier(getAbilityModifier(scores[ability.key])));
        header.appendChild(title);
        header.appendChild(modifier);

        const controls = createElement("div", "level-editor__ability-stepper");
        const decrement = document.createElement("button");
        decrement.type = "button";
        decrement.className = "level-editor__ability-stepper-button";
        decrement.textContent = "-";
        decrement.setAttribute("aria-label", `Decrease ${ability.label}`);

        const input = document.createElement("input");
        input.className = "level-editor__ability-score-input";
        input.type = "number";
        input.min = String(MIN_ABILITY_SCORE);
        input.max = String(MAX_ABILITY_SCORE);
        input.step = "1";
        input.value = String(scores[ability.key]);
        input.setAttribute("aria-label", `${ability.label} score`);

        const increment = document.createElement("button");
        increment.type = "button";
        increment.className = "level-editor__ability-stepper-button";
        increment.textContent = "+";
        increment.setAttribute("aria-label", `Increase ${ability.label}`);

        controls.appendChild(decrement);
        controls.appendChild(input);
        controls.appendChild(increment);

        const cost = createElement("span", "level-editor__ability-cost");
        card.appendChild(header);
        card.appendChild(controls);
        card.appendChild(cost);
        grid.appendChild(card);

        inputs.set(ability.key, input);
        modifiers.set(ability.key, modifier);
        costs.set(ability.key, cost);

        decrement.addEventListener("click", () => {
            updateAbility(ability.key, scores[ability.key] - 1);
        });
        increment.addEventListener("click", () => {
            updateAbility(ability.key, scores[ability.key] + 1);
        });
        input.addEventListener("input", () => {
            updateAbility(ability.key, input.value);
        });
    }

    const actions = createElement("div", "level-editor__ability-actions");

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "level-editor__button";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", () => {
        const initialScores = getInitialScores(context);
        for (const ability of ABILITIES) {
            updateAbility(ability.key, initialScores[ability.key]);
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

        const nextScores = ABILITIES.reduce((result, ability) => {
            result[ability.key] = scores[ability.key];
            return result;
        }, {});
        const nextDto = PlayerSheetDtoHelper.patch(context.dto, "baseChoices.abilityScores", nextScores);
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
        updateAbility(ability.key, scores[ability.key]);
    }

    return fragment;
}
