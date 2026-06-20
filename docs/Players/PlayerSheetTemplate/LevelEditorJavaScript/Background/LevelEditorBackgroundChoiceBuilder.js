import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createDescription,
    createElement,
    createField
} from "../../PlayerSheetHtmlHelper.js";
import {
    getCatalogCache,
    getValue,
    normalizeSearchText,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    buildBackgroundProfile
} from "../CatalogProfile/Builder.js";
import {
    getProfileChoiceDefinitions
} from "../CatalogProfile/Choices.js";

const BACKGROUND_CHOICE_SELECTION_PATH = "baseChoices.backgroundChoices.selections";
const BACKGROUND_CHOICE_TYPES_HANDLED_ELSEWHERE = new Set([
    "feat",
    "language",
    "languages",
    "skill",
    "skills",
    "skilltoollanguage",
    "skilltoollanguages",
    "spell",
    "spellcasting-ability",
    "spells",
    "tool",
    "tools",
    "weapon",
    "weapons"
]);

function cloneValue(value) {
    if (value == null) {
        return value;
    }

    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

function normalizeChoiceType(value) {
    return normalizeSearchText(value).replace(/[^a-z0-9]+/gu, "");
}

function getBackgroundIdentity(context) {
    return getValue(context?.dto, "baseChoices.background", null);
}

async function resolveBackgroundRecord(context) {
    const identity = getBackgroundIdentity(context);
    if (!identity) {
        return null;
    }

    const catalog = getCatalogCache(context.api);
    if (!catalog) {
        return identity?.profile || identity?.choiceDefinitions || identity?.choices ? identity : null;
    }

    const ids = [
        identity.options?.catalogId,
        identity.catalogId,
        identity.id
    ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

    for (const id of ids) {
        try {
            const record = await catalog.getById("backgrounds", id);
            if (record) {
                return record;
            }
        } catch (_error) {
            // Try the next saved identity field before using the runtime DTO.
        }
    }

    return identity?.profile || identity?.choiceDefinitions || identity?.choices ? identity : null;
}

function getChoiceId(choice, index) {
    return String(choice?.id || choice?.choiceId || `background-choice-${index + 1}`);
}

function normalizeOption(option) {
    if (!option || typeof option !== "object") {
        const text = String(option || "").trim();
        return text ? { value: text, label: text } : null;
    }

    const value = String(option.value || option.label || option.name || option.id || "").trim();
    if (!value) {
        return null;
    }

    return {
        ...cloneValue(option),
        value,
        label: String(option.label || option.name || value).trim()
    };
}

function shouldUseBackgroundChoice(choice) {
    const type = normalizeChoiceType(choice?.type || choice?.kind || choice?.category);
    if (!type || BACKGROUND_CHOICE_TYPES_HANDLED_ELSEWHERE.has(type)) {
        return false;
    }

    return toArray(choice?.options).length > 0;
}

function createBackgroundChoice(choice, index) {
    const options = toArray(choice?.options)
        .map(normalizeOption)
        .filter(Boolean);
    if (!options.length) {
        return null;
    }

    return {
        id: getChoiceId(choice, index),
        sourceId: choice?.id || choice?.choiceId || "",
        type: choice?.type || "background-choice",
        label: choice?.label || choice?.name || "Background Option",
        prompt: choice?.prompt || "",
        valueKey: choice?.valueKey || choice?.type || "backgroundChoice",
        sourceName: choice?.sourceName || "",
        source: choice?.source || "",
        count: Math.max(toNumber(choice?.count, 1), 1),
        options,
        selected: []
    };
}

function getSelections(backgroundChoices = {}) {
    const selections = backgroundChoices?.selections;
    return selections && typeof selections === "object" ? selections : {};
}

function hydrateSelections(choices, selections) {
    for (const choice of choices) {
        const selectedValues = toArray(selections?.[choice.id]?.values)
            .map((value) => value?.value || value)
            .filter(Boolean)
            .slice(0, choice.count);
        choice.selected = selectedValues;
    }
}

export async function buildBackgroundChoiceModel(context) {
    const backgroundRecord = await resolveBackgroundRecord(context);
    const profile = backgroundRecord?.profile || buildBackgroundProfile(backgroundRecord);
    const choices = getProfileChoiceDefinitions(profile)
        .filter(shouldUseBackgroundChoice)
        .map(createBackgroundChoice)
        .filter(Boolean);
    hydrateSelections(choices, getSelections(getValue(context?.dto, "baseChoices.backgroundChoices", {})));

    return {
        backgroundRecord,
        choices
    };
}

export async function hasBackgroundChoiceOptions(context) {
    try {
        const model = await buildBackgroundChoiceModel(context);
        return model.choices.length > 0;
    } catch (error) {
        console.warn("Background option visibility check failed:", error);
        return true;
    }
}

function createSelection(choice) {
    const selectedOptions = choice.selected
        .slice(0, choice.count)
        .map((value) => choice.options.find((option) => option.value === value) || { value, label: String(value) });

    return {
        choiceId: choice.id,
        type: choice.type,
        label: choice.label,
        valueKey: choice.valueKey,
        sourceName: choice.sourceName,
        source: choice.source,
        count: choice.count,
        value: selectedOptions[0]?.value || "",
        values: selectedOptions.map(cloneValue)
    };
}

function buildPersistedSelections(context, choices) {
    const managedChoiceIds = new Set(choices.map((choice) => choice.id));
    const existingSelections = getSelections(getValue(context?.dto, "baseChoices.backgroundChoices", {}));
    const nextSelections = Object.fromEntries(
        Object.entries(existingSelections)
            .filter(([choiceId]) => !managedChoiceIds.has(choiceId))
    );

    for (const choice of choices) {
        if (choice.selected.length >= choice.count) {
            nextSelections[choice.id] = createSelection(choice);
        }
    }

    return { selections: nextSelections };
}

function isChoiceComplete(choice) {
    return choice.selected.length >= choice.count;
}

function renderChoice(choice, onChange) {
    const section = createElement("section", "level-editor__choice-section");
    const selectedSet = new Set(choice.selected);
    const select = document.createElement("select");
    select.className = "level-editor__select";
    select.multiple = choice.count > 1;
    if (select.multiple) {
        select.size = Math.min(Math.max(choice.options.length, choice.count + 2), 8);
    } else {
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "Choose option...";
        select.appendChild(empty);
    }

    for (const option of choice.options) {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.selected = selectedSet.has(option.value);
        select.appendChild(optionElement);
    }

    select.addEventListener("change", () => {
        choice.selected = Array.from(select.selectedOptions)
            .map((option) => option.value)
            .filter(Boolean)
            .slice(0, choice.count);
        onChange();
    });

    section.appendChild(createElement("h4", "level-editor__choice-section-title", choice.label));
    if (choice.prompt) {
        section.appendChild(createDescription(choice.prompt));
    }
    section.appendChild(createField(choice.label, select));
    return section;
}

function getMissingChoices(choices) {
    return choices
        .filter((choice) => !isChoiceComplete(choice))
        .map((choice) => choice.label);
}

export function buildBackgroundChoiceStatus(dto) {
    const selections = getSelections(getValue(dto, "baseChoices.backgroundChoices", {}));
    const values = Object.values(selections)
        .flatMap((selection) => toArray(selection?.values).map((value) => value?.label || value?.name || value?.value))
        .filter(Boolean);

    return values.length ? values.join(", ") : "Review";
}

export function buildBackgroundChoiceContent(context) {
    const fragment = document.createDocumentFragment();
    const wrapper = createElement("div", "level-editor__limited-choice-editor");
    const status = createElement("p", "level-editor__choice-status", "Loading background options...");
    const controls = createElement("div", "level-editor__choice-groups");
    const actions = createElement("div", "level-editor__choice-actions");
    const resetButton = document.createElement("button");
    const applyButton = document.createElement("button");
    let choices = [];
    let initialSelections = {};

    resetButton.type = "button";
    resetButton.className = "level-editor__button";
    resetButton.textContent = "Reset";

    applyButton.type = "button";
    applyButton.className = "level-editor__button level-editor__button--primary";
    applyButton.textContent = "Apply";
    applyButton.disabled = true;

    actions.appendChild(resetButton);
    actions.appendChild(applyButton);
    wrapper.appendChild(status);
    wrapper.appendChild(controls);
    wrapper.appendChild(actions);
    fragment.appendChild(wrapper);

    function updateStatus() {
        const missing = getMissingChoices(choices);
        applyButton.disabled = missing.length > 0;
        status.textContent = missing.length
            ? `Missing choices: ${missing.join(", ")}.`
            : `${choices.length} background option${choices.length === 1 ? "" : "s"} selected.`;
    }

    function renderControls() {
        controls.replaceChildren();
        if (!choices.length) {
            controls.appendChild(createDescription("No background options are required."));
            applyButton.disabled = false;
            status.textContent = "No background options required.";
            return;
        }

        choices.forEach((choice) => controls.appendChild(renderChoice(choice, updateStatus)));
        updateStatus();
    }

    resetButton.addEventListener("click", () => {
        for (const choice of choices) {
            choice.selected = toArray(initialSelections[choice.id]).slice(0, choice.count);
        }
        renderControls();
    });

    applyButton.addEventListener("click", () => {
        if (typeof context.onChange !== "function" || getMissingChoices(choices).length) {
            return;
        }

        const nextDto = PlayerSheetDtoHelper.patch(
            context.dto,
            "baseChoices.backgroundChoices",
            buildPersistedSelections(context, choices)
        );
        context.onChange(nextDto);
        applyButton.closest("dialog")?.close();
    });

    void buildBackgroundChoiceModel(context)
        .then((model) => {
            choices = model.choices;
            initialSelections = Object.fromEntries(choices.map((choice) => [choice.id, choice.selected.slice()]));
            renderControls();
        })
        .catch((error) => {
            console.error("Background options failed to load:", error);
            status.textContent = "Background options failed to load.";
            controls.replaceChildren(createDescription("Check the background catalog API connection and try again."));
            applyButton.disabled = true;
        });

    return fragment;
}
