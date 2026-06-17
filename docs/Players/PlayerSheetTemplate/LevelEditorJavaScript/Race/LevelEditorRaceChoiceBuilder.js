import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createDescription,
    createElement,
    createField
} from "../../PlayerSheetHtmlHelper.js";
import {
    buildRaceChoiceModel,
    createAbilityChoiceSelection,
    createRaceChoiceSelection,
    getRaceChoiceSelection,
    getRaceChoiceValue,
    RACE_CHOICE_SELECTION_PATH,
    summarizeRaceChoices
} from "./LevelEditorRaceChoiceModel.js";
import {
    toArray
} from "../Core/LevelEditorShared.js";

function cloneSelections(selections) {
    return JSON.parse(JSON.stringify(selections || {}));
}

function getSelectionValue(selection) {
    return selection?.value ?? selection?.values?.[0]?.value ?? "";
}

function createChoiceSection(choice) {
    const section = createElement("section", "level-editor__choice-section level-editor__race-option-section");
    section.dataset.choiceId = choice.id;
    section.dataset.choiceType = choice.type;
    section.appendChild(createElement("h4", "level-editor__choice-section-title", choice.label));
    if (choice.prompt) {
        section.appendChild(createDescription(choice.prompt));
    }
    return section;
}

function getOptionLabel(option) {
    const source = option?.source ? ` (${option.source})` : "";
    return `${option?.label || option?.name || option?.value || "Option"}${source}`;
}

function createSelectControl(choice, selections, onChange) {
    const selection = selections[choice.id];
    const select = document.createElement("select");
    select.className = "level-editor__select";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Choose...";
    select.appendChild(empty);

    for (const option of toArray(choice.options)) {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = getOptionLabel(option);
        optionElement.selected = option.value === getSelectionValue(selection);
        select.appendChild(optionElement);
    }

    select.addEventListener("change", () => {
        if (select.value) {
            selections[choice.id] = createRaceChoiceSelection(choice, select.value);
        } else {
            delete selections[choice.id];
        }
        onChange();
    });

    return createField(choice.label, select);
}

function createTextControl(choice, selections, onChange) {
    const input = document.createElement("input");
    input.className = "level-editor__input";
    input.type = "text";
    input.value = getSelectionValue(selections[choice.id]);
    input.addEventListener("input", () => {
        if (input.value.trim()) {
            selections[choice.id] = createRaceChoiceSelection(choice, input.value.trim());
        } else {
            delete selections[choice.id];
        }
        onChange();
    });
    return createField(choice.label, input);
}

function syncCheckboxLimits(container, limit) {
    const checked = Array.from(container.querySelectorAll("input[type='checkbox']:checked"));
    const atLimit = checked.length >= limit;
    container.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
        checkbox.disabled = !checkbox.checked && atLimit;
    });
}

function createCheckboxControl(choice, selections, onChange) {
    const selectedValues = new Set(toArray(selections[choice.id]?.values).map((entry) => entry.value));
    const limit = Math.max(Number(choice.count) || 1, 1);
    const grid = createElement("div", "level-editor__checkbox-grid level-editor__choice-grid");

    function updateSelection() {
        const values = Array.from(selectedValues).slice(0, limit);
        if (values.length) {
            selections[choice.id] = createRaceChoiceSelection(choice, values);
        } else {
            delete selections[choice.id];
        }
        syncCheckboxLimits(grid, limit);
        onChange();
    }

    for (const option of toArray(choice.options)) {
        const label = createElement("label", "level-editor__checkbox level-editor__choice-checkbox");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selectedValues.has(option.value);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                if (selectedValues.size >= limit) {
                    checkbox.checked = false;
                    return;
                }
                selectedValues.add(option.value);
            } else {
                selectedValues.delete(option.value);
            }
            updateSelection();
        });
        label.appendChild(checkbox);
        label.appendChild(createElement("span", "", getOptionLabel(option)));
        grid.appendChild(label);
    }

    syncCheckboxLimits(grid, limit);
    return grid;
}

function createAbilitySelector(labelText, options, selectedValue, onValueChange, disabledValues = () => new Set()) {
    const select = document.createElement("select");
    select.className = "level-editor__select";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Choose...";
    select.appendChild(empty);

    for (const option of options) {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.selected = option.value === selectedValue;
        optionElement.disabled = option.value !== selectedValue && disabledValues().has(option.value);
        select.appendChild(optionElement);
    }

    select.addEventListener("change", () => {
        onValueChange(select.value);
    });

    return createField(labelText, select);
}

function createAbilityCheckboxGroup(group, options, selectedValues, disabledValues, onValuesChange) {
    const selected = new Set(selectedValues);
    const grid = createElement("div", "level-editor__checkbox-grid level-editor__choice-grid");
    const limit = Math.max(Number(group.count) || 1, 1);

    function sync() {
        const atLimit = selected.size >= limit;
        grid.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
            checkbox.disabled = (!checkbox.checked && (atLimit || disabledValues().has(checkbox.value)));
        });
    }

    for (const option of options) {
        const label = createElement("label", "level-editor__checkbox level-editor__choice-checkbox");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = option.value;
        checkbox.checked = selected.has(option.value);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                if (selected.size >= limit || disabledValues().has(option.value)) {
                    checkbox.checked = false;
                    return;
                }
                selected.add(option.value);
            } else {
                selected.delete(option.value);
            }
            onValuesChange(Array.from(selected));
            sync();
        });
        label.appendChild(checkbox);
        label.appendChild(createElement("span", "", option.label));
        grid.appendChild(label);
    }

    sync();
    const field = createElement("div", "level-editor__field");
    field.appendChild(createElement("span", "level-editor__field-label", group.label || "Ability"));
    field.appendChild(grid);
    return field;
}

function createAbilityChoiceControl(choice, selections, onChange) {
    const wrapper = createElement("div", "level-editor__race-asi-editor");
    const existing = selections[choice.id] || {};
    const patternOptions = toArray(choice.patterns);
    let patternValue = existing.pattern || patternOptions[0]?.value || "";
    let groupValues = { ...(existing.groupValues || {}) };

    function getCurrentPattern() {
        return patternOptions.find((pattern) => pattern.value === patternValue) || null;
    }

    function selectedInOtherGroups(groupId) {
        const values = new Set();
        for (const [key, groupSelection] of Object.entries(groupValues)) {
            if (key !== groupId) {
                toArray(groupSelection).forEach((value) => values.add(value));
            }
        }
        return values;
    }

    function persist() {
        const selection = createAbilityChoiceSelection(choice, patternValue, groupValues);
        if (selection.abilityIncreases.length || (patternOptions.length && patternValue)) {
            selections[choice.id] = selection;
        } else {
            delete selections[choice.id];
        }
        onChange();
    }

    function renderGroups() {
        wrapper.querySelectorAll(".level-editor__race-asi-groups").forEach((element) => element.remove());
        const host = createElement("div", "level-editor__race-asi-groups");
        const pattern = getCurrentPattern();

        if (pattern) {
            for (const group of toArray(pattern.groups)) {
                if (group.count === 1) {
                    host.appendChild(createAbilitySelector(
                        group.label || "Ability",
                        toArray(choice.options),
                        toArray(groupValues[group.id])[0] || "",
                        (value) => {
                            groupValues[group.id] = value ? [value] : [];
                            persist();
                            renderGroups();
                        },
                        () => pattern.distinct ? selectedInOtherGroups(group.id) : new Set()
                    ));
                } else {
                    host.appendChild(createAbilityCheckboxGroup(
                        group,
                        toArray(choice.options),
                        toArray(groupValues[group.id]),
                        () => pattern.distinct ? selectedInOtherGroups(group.id) : new Set(),
                        (values) => {
                            groupValues[group.id] = values;
                            persist();
                        }
                    ));
                }
            }
        } else {
            const defaultGroup = {
                id: "default",
                label: choice.label,
                count: choice.count || 1,
                amount: choice.amount || 1
            };
            host.appendChild(createAbilityCheckboxGroup(
                defaultGroup,
                toArray(choice.options),
                toArray(groupValues.default),
                () => new Set(),
                (values) => {
                    groupValues.default = values;
                    persist();
                }
            ));
        }

        wrapper.appendChild(host);
    }

    if (patternOptions.length) {
        const patternSelect = document.createElement("select");
        patternSelect.className = "level-editor__select";
        for (const pattern of patternOptions) {
            const option = document.createElement("option");
            option.value = pattern.value;
            option.textContent = pattern.label || pattern.value;
            option.selected = pattern.value === patternValue;
            patternSelect.appendChild(option);
        }
        patternSelect.addEventListener("change", () => {
            patternValue = patternSelect.value;
            groupValues = {};
            persist();
            renderGroups();
        });
        wrapper.appendChild(createField("Pattern", patternSelect));
    }

    renderGroups();
    return wrapper;
}

function shouldRenderChoice(choice, selections) {
    if (choice.type === "cantrip" && choice.id === "fc-kobold-cantrip") {
        return getRaceChoiceValue({ selections }, "race-kobold-legacy") === "Draconic Sorcery";
    }

    return true;
}

function choiceCanChangeVisibleControls(choice) {
    return choice.id === "race-kobold-legacy" || choice.valueKey === "race-kobold-legacy";
}

function renderChoiceControl(choice, selections, onChange) {
    const section = createChoiceSection(choice);

    if (choice.type === "racial-asi" || choice.control === "ability-score-pattern") {
        section.appendChild(createAbilityChoiceControl(choice, selections, onChange));
        return section;
    }

    if (choice.control === "checkbox") {
        section.appendChild(createCheckboxControl(choice, selections, onChange));
        return section;
    }

    if (choice.control === "text") {
        section.appendChild(createTextControl(choice, selections, onChange));
        return section;
    }

    section.appendChild(createSelectControl(choice, selections, onChange));
    return section;
}

function removeHiddenSelections(model, selections) {
    for (const choice of model.choices) {
        if (!shouldRenderChoice(choice, selections)) {
            delete selections[choice.id];
        }
    }
}

function isChoiceComplete(choice, selection) {
    if (!selection) {
        return false;
    }

    if (choice.type === "racial-asi") {
        if (toArray(choice.patterns).length) {
            const pattern = toArray(choice.patterns).find((entry) => entry.value === selection.pattern) || toArray(choice.patterns)[0];
            return toArray(pattern?.groups).every((group) => toArray(selection.groupValues?.[group.id]).length >= (Number(group.count) || 1));
        }

        return toArray(selection.abilityIncreases).length >= (Number(choice.count) || 1);
    }

    if (choice.control === "checkbox") {
        return toArray(selection.values).length >= (Number(choice.count) || 1);
    }

    return Boolean(selection.value || toArray(selection.values).length);
}

function validateRequiredChoices(model, selections) {
    return model.choices
        .filter((choice) => choice.required !== false && shouldRenderChoice(choice, selections))
        .filter((choice) => !isChoiceComplete(choice, selections[choice.id]))
        .map((choice) => choice.label);
}

export function buildRaceOptionStatus(dto) {
    return summarizeRaceChoices(PlayerSheetDtoHelper.getValue(dto, "baseChoices.raceChoices", {})) || "Review";
}

export function buildRaceChoiceContent(context) {
    const fragment = document.createDocumentFragment();
    const wrapper = createElement("div", "level-editor__limited-choice-editor level-editor__race-options-editor");
    const status = createElement("p", "level-editor__choice-status", "Loading race options...");
    const controls = createElement("div", "level-editor__race-options-controls");
    const actions = createElement("div", "level-editor__choice-actions");
    const resetButton = document.createElement("button");
    const applyButton = document.createElement("button");
    let model = null;
    let selections = {};

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
        if (!model) {
            return;
        }

        removeHiddenSelections(model, selections);
        const missing = validateRequiredChoices(model, selections);
        applyButton.disabled = missing.length > 0;
        status.textContent = missing.length
            ? `Missing required choices: ${missing.join(", ")}.`
            : `${Object.keys(selections).length} race option${Object.keys(selections).length === 1 ? "" : "s"} selected.`;
    }

    function renderControls() {
        controls.replaceChildren();

        const visibleChoices = model.choices.filter((choice) => shouldRenderChoice(choice, selections));
        if (!visibleChoices.length) {
            controls.appendChild(createDescription("No additional race options are required for the selected race."));
            applyButton.disabled = false;
            status.textContent = "No race options required.";
            return;
        }

        for (const choice of visibleChoices) {
            controls.appendChild(renderChoiceControl(choice, selections, () => {
                if (choiceCanChangeVisibleControls(choice)) {
                    renderControls();
                    return;
                }
                updateStatus();
            }));
        }

        updateStatus();
    }

    resetButton.addEventListener("click", () => {
        if (!model) {
            return;
        }
        selections = cloneSelections(model.selections);
        renderControls();
    });

    applyButton.addEventListener("click", () => {
        if (!model || typeof context.onChange !== "function") {
            return;
        }

        removeHiddenSelections(model, selections);
        const missing = validateRequiredChoices(model, selections);
        if (missing.length) {
            updateStatus();
            return;
        }

        const nextDto = PlayerSheetDtoHelper.patch(context.dto, RACE_CHOICE_SELECTION_PATH, selections);
        context.onChange(nextDto);
        applyButton.closest("dialog")?.close();
    });

    void buildRaceChoiceModel(context)
        .then((nextModel) => {
            model = nextModel;
            selections = cloneSelections(model.selections);
            renderControls();
        })
        .catch((error) => {
            console.error("Race options failed to load:", error);
            status.textContent = "Race options failed to load.";
            controls.replaceChildren(createDescription("Check the race catalog API connection and try again."));
            applyButton.disabled = true;
        });

    return fragment;
}
