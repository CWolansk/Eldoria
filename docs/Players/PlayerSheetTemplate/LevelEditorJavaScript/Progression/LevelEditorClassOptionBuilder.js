import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    appendRulesEntry,
    createDescription,
    createElement
} from "../../PlayerSheetHtmlHelper.js";
import {
    getCatalogDisplayName,
    getCatalogSource,
    getValue,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    appendCatalogRecord,
    expandCatalogRecords,
    isFeatureRecord,
    resolveCatalogEntity,
    resolveCatalogFeatureEntity
} from "../Catalog/LevelEditorCatalogChoiceResolver.js";
import {
    buildCatalogProfile
} from "../CatalogProfile/Builder.js";
import {
    getProfileChoiceDefinitions
} from "../CatalogProfile/Choices.js";
import { enrichOptionalFeatureOptions } from "../Catalog/LevelEditorOptionalFeatureCatalog.js";

const CLASS_OPTION_TYPE = "class-option";
const classOptionStructureCaches = new WeakMap();
const fallbackClassOptionStructureCache = new Map();
const MARTIAL_VERSATILITY_REVIEW = {
    id: "class-feature:fighter-martial-versatility-4:tce",
    kind: "classFeature",
    name: "Martial Versatility",
    source: "TCE",
    level: 4,
    optional: true,
    entries: [
        "Whenever you reach a level in this class that grants the Ability Score Improvement feature, you can do one of the following, as you shift the focus of your martial practice:",
        {
            type: "list",
            items: [
                "Replace a fighting style you know with another fighting style available to fighters.",
                "If you know any maneuvers from the Battle Master archetype, you can replace one maneuver you know with a different maneuver."
            ]
        }
    ]
};

function cloneValue(value) {
    if (value == null) {
        return value;
    }

    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

function getLevelIndex(context) {
    return Math.max(toNumber(context?.characterLevel, 1) - 1, 0);
}

function getLevelEntry(context) {
    return getValue(context?.dto, `levels.${getLevelIndex(context)}`, {}) || {};
}

function getClassIdentity(context) {
    const levelEntry = getLevelEntry(context);
    return levelEntry.class || context?.classEntry || null;
}

function getStructureCache(context) {
    if (context?.api && typeof context.api === "object") {
        if (!classOptionStructureCaches.has(context.api)) {
            classOptionStructureCaches.set(context.api, new Map());
        }
        return classOptionStructureCaches.get(context.api);
    }

    return fallbackClassOptionStructureCache;
}

function summarizeIdentity(identity) {
    if (!identity || typeof identity !== "object") {
        return identity || "";
    }

    return {
        id: identity.id || "",
        ref: identity.ref || "",
        refId: identity.refId || "",
        sourceId: identity.sourceId || "",
        main: identity.main || "",
        name: identity.name || identity.className || "",
        source: identity.source || "",
        classLevel: identity.classLevel || "",
        optionRef: identity.options?.ref || "",
        optionId: identity.options?.id || "",
        optionCatalogId: identity.options?.catalogId || "",
        inlineFeatureRefs: toArray(identity.classFeatures)
            .map(summarizeFeatureRef)
    };
}

function summarizeFeatureRef(featureRef) {
    if (!featureRef || typeof featureRef !== "object") {
        return featureRef || "";
    }

    return {
        id: featureRef.id || "",
        ref: featureRef.ref || "",
        refId: featureRef.refId || "",
        sourceId: featureRef.sourceId || "",
        name: featureRef.name || "",
        source: featureRef.source || "",
        level: featureRef.level || "",
        rawRef: featureRef.rawRef || ""
    };
}

function getStructureCacheKey(context) {
    const levelEntry = getLevelEntry(context);
    const classIdentity = getClassIdentity(context);
    const classLevel = toNumber(levelEntry.class?.classLevel, toNumber(context?.classLevel, context?.characterLevel || 1));
    return JSON.stringify({
        characterLevel: toNumber(context?.characterLevel, 1),
        classLevel,
        classIdentity: summarizeIdentity(classIdentity),
        featureRefs: toArray(levelEntry.features).map(summarizeFeatureRef)
    });
}

async function loadLevelFeatureRecords(context) {
    const levelEntry = getLevelEntry(context);
    const classLevel = toNumber(levelEntry.class?.classLevel, toNumber(context?.classLevel, context?.characterLevel || 1));
    const classRecord = await resolveCatalogEntity(context, "classes", getClassIdentity(context), { fallbackIdentity: true });
    const records = await expandCatalogRecords(context, [classRecord], {
        includeLinkedFeatures: true,
        classLevel
    });
    const featureRefs = toArray(levelEntry.features);

    for (const featureRef of featureRefs) {
        appendCatalogRecord(records, await resolveCatalogFeatureEntity(context, featureRef, { fallbackIdentity: false }));
    }

    return records.filter(isFeatureRecord);
}

function normalizeClassOption(option) {
    if (!option) {
        return null;
    }

    if (typeof option === "string") {
        const raw = option.trim();
        const [name, source] = raw.split("|").map((part) => part.trim());
        return {
            value: raw,
            label: name || raw,
            source: source || ""
        };
    }

    const value = String(option.value || option.ref || option.id || option.name || option.label || "").trim();
    if (!value) {
        return null;
    }

    return {
        ...option,
        value,
        label: String(option.label || option.name || value).trim(),
        source: option.source || ""
    };
}

function getOptionLabel(option) {
    return [option.label || option.value, option.source].filter(Boolean).join(" ");
}

function getClassContextText(context) {
    const classEntry = context?.classEntry || {};
    return [
        context?.classLabel,
        classEntry.id,
        classEntry.main,
        classEntry.name,
        classEntry.ref,
        classEntry.source,
        classEntry.options?.catalogId,
        classEntry.options?.ref
    ].filter(Boolean).join(" ").toLowerCase();
}

function featureNameMatches(feature, name) {
    const wanted = String(name || "").trim().toLowerCase();
    return String(feature?.name || feature || "").trim().toLowerCase() === wanted;
}

function getOptionalFeatureFallbacks(context, features = []) {
    const classText = getClassContextText(context);
    const level = toNumber(context?.classLevel, context?.characterLevel || 0);
    const levelFeatures = [
        ...toArray(context?.features),
        ...toArray(features).map((feature) => feature?.name)
    ];
    const hasMartialVersatility = levelFeatures.some((feature) => featureNameMatches(feature, "Martial Versatility"));
    const hasFighterClass = /\bfighter\b|class:fighter|class-fighter/u.test(classText);
    const alreadyLoaded = toArray(features).some((feature) => {
        const id = String(feature?.id || "").trim().toLowerCase();
        return id === MARTIAL_VERSATILITY_REVIEW.id || featureNameMatches(feature, "Martial Versatility");
    });

    if (!alreadyLoaded && hasFighterClass && level === 4 && hasMartialVersatility) {
        return [cloneValue(MARTIAL_VERSATILITY_REVIEW)];
    }

    return [];
}

function createChoiceFromDefinition(feature, definition, index) {
    const options = (toArray(definition.options).length ? toArray(definition.options) : toArray(definition.from))
        .map(normalizeClassOption)
        .filter((option) => option?.value && option?.label);

    if (!options.length) {
        return null;
    }

    const featureId = feature?.id || feature?.ref || feature?.sourceId || `feature-${index}`;
    const featureName = getCatalogDisplayName(feature, feature?.name || "Class Feature");
    const count = Math.max(toNumber(definition.count, 1), 1);
    return {
        id: definition.id || definition.choiceId || `${featureId}:choice:${index}`,
        type: CLASS_OPTION_TYPE,
        featureId: definition.featureId || featureId,
        featureName: definition.featureName || featureName,
        label: definition.label || featureName,
        prompt: definition.prompt || `Choose ${count} option${count === 1 ? "" : "s"} for ${featureName}.`,
        count,
        options,
        sourceName: definition.sourceName || featureName,
        source: definition.source || getCatalogSource(feature),
        selected: []
    };
}

function buildChoicesFromFeatures(features) {
    const choices = [];
    for (const feature of features) {
        getProfileChoiceDefinitions(buildCatalogProfile(feature)).forEach((definition, index) => {
            const choice = createChoiceFromDefinition(feature, definition, index);
            if (choice) {
                choices.push(choice);
            }
        });
    }
    return choices;
}

function isOptionalClassFeatureReview(feature) {
    const name = String(feature?.name || "").trim().toLowerCase();
    return Boolean(feature?.optional)
        || name === "martial versatility"
        || String(feature?.id || "").toLowerCase() === "class-feature:fighter-martial-versatility-4:tce";
}

function getOptionalClassFeatureReviews(features) {
    return toArray(features)
        .filter(isOptionalClassFeatureReview);
}

async function buildClassOptionStructure(context) {
    const cache = getStructureCache(context);
    const cacheKey = getStructureCacheKey(context);
    if (!cache.has(cacheKey)) {
        const structurePromise = Promise.resolve()
            .then(async () => {
                const features = await loadLevelFeatureRecords(context);
                const fallbackFeatures = getOptionalFeatureFallbacks(context, features);
                const allFeatures = [
                    ...features,
                    ...fallbackFeatures
                ];
                return {
                    features: cloneValue(allFeatures),
                    choices: cloneValue(buildChoicesFromFeatures(allFeatures))
                };
            })
            .catch((error) => {
                cache.delete(cacheKey);
                throw error;
            });
        cache.set(cacheKey, structurePromise);
    }

    return cloneValue(await cache.get(cacheKey));
}

function getClassOptionSelections(dto, levelIndex) {
    const selections = new Map();
    for (const choice of toArray(getValue(dto, `levels.${levelIndex}.choices`, []))) {
        if (choice?.type === CLASS_OPTION_TYPE && choice.choiceId) {
            selections.set(choice.choiceId, choice);
        }
    }
    return selections;
}

function hydrateSelections(choices, selections) {
    for (const choice of choices) {
        const selection = selections.get(choice.id);
        const selectedValues = new Set(toArray(selection?.values).map((value) => value?.value || value));
        choice.selected = choice.options
            .filter((option) => selectedValues.has(option.value))
            .map((option) => option.value)
            .slice(0, choice.count);
    }
}

export async function buildClassOptionModel(context, options = {}) {
    const { enrich = true } = options;
    const { features, choices } = await buildClassOptionStructure(context);
    if (enrich) {
        await enrichOptionalFeatureOptions(context, choices);
    }
    const selections = getClassOptionSelections(context.dto, getLevelIndex(context));
    hydrateSelections(choices, selections);
    return { features, choices, selections };
}

export async function hasClassOptionChoices(context) {
    try {
        const model = await buildClassOptionModel(context, { enrich: false });
        return model.choices.some((choice) => choice.options.length && choice.count > 0)
            || getOptionalClassFeatureReviews(model.features).length > 0;
    } catch (error) {
        console.warn("Class option visibility check failed:", error);
        return true;
    }
}

function createClassOptionSelection(choice) {
    const selectedOptions = choice.options
        .filter((option) => choice.selected.includes(option.value))
        .slice(0, choice.count)
        .map((option) => ({
            value: option.value,
            label: option.label,
            source: option.source || "",
            page: option.page || null,
            recordId: option.recordId || "",
            description: option.description || ""
        }));

    return {
        type: CLASS_OPTION_TYPE,
        choiceId: choice.id,
        featureId: choice.featureId,
        featureName: choice.featureName,
        label: choice.label,
        sourceName: choice.sourceName,
        source: choice.source,
        count: choice.count,
        value: selectedOptions[0]?.value || "",
        values: selectedOptions
    };
}

function isChoiceComplete(choice) {
    return choice.selected.length >= choice.count;
}

function getMissingChoices(model) {
    return model.choices
        .filter((choice) => choice.options.length && !isChoiceComplete(choice))
        .map((choice) => choice.label);
}

function buildPersistedChoices(context, model) {
    const levelIndex = getLevelIndex(context);
    const modelChoiceIds = new Set(model.choices.map((choice) => choice.id));
    const existingChoices = toArray(getValue(context.dto, `levels.${levelIndex}.choices`, []))
        .filter((choice) => choice?.type !== CLASS_OPTION_TYPE || !modelChoiceIds.has(choice.choiceId));

    return [
        ...existingChoices,
        ...model.choices
            .filter(isChoiceComplete)
            .map(createClassOptionSelection)
    ];
}

export function buildClassOptionStatus(dto, characterLevel, context = {}) {
    const levelIndex = Math.max(toNumber(characterLevel, 1) - 1, 0);
    const selections = toArray(getValue(dto, `levels.${levelIndex}.choices`, []))
        .filter((choice) => choice?.type === CLASS_OPTION_TYPE)
        .map((choice) => {
            const values = toArray(choice.values)
                .map((value) => getOptionLabel(value))
                .filter(Boolean)
                .join(", ");
            return values ? `${choice.label || choice.featureName}: ${values}` : "";
        })
        .filter(Boolean);

    if (selections.length) {
        return selections.join(" | ");
    }

    if (toArray(context?.features).some((feature) => featureNameMatches(feature, "Martial Versatility"))) {
        return "Martial Versatility";
    }

    return "Review";
}

function renderChoice(choice, onChange) {
    const section = createElement("section", "level-editor__choice-section level-editor__class-option-section");
    const title = createElement("h4", "level-editor__choice-section-title");
    title.appendChild(createElement("span", "", choice.label));
    title.appendChild(createElement("span", "level-editor__choice-group-count", `${choice.selected.length} / ${choice.count}`));
    section.appendChild(title);

    if (choice.prompt) {
        section.appendChild(createDescription(choice.prompt));
    }

    const selectedSet = new Set(choice.selected);
    const list = createElement("div", "level-editor__class-option-list");
    const inputType = choice.count === 1 ? "radio" : "checkbox";
    const inputName = `level-editor-class-option-${choice.id}`;

    function sync() {
        const count = section.querySelector(".level-editor__choice-group-count");
        if (count) {
            count.textContent = `${choice.selected.length} / ${choice.count}`;
        }
        const atLimit = choice.selected.length >= choice.count;
        list.querySelectorAll("label[data-option-value]").forEach((card) => {
            const input = card.querySelector("input");
            if (!input) {
                return;
            }
            card.classList.toggle("level-editor__class-option-card--selected", input.checked);
            input.disabled = input.type === "checkbox" && !input.checked && atLimit;
        });
    }

    for (const option of choice.options) {
        const label = createElement("label", "level-editor__class-option-card");
        label.dataset.optionValue = option.value;

        const input = document.createElement("input");
        input.type = inputType;
        input.name = inputName;
        input.value = option.value;
        input.checked = selectedSet.has(option.value);
        input.addEventListener("change", () => {
            const nextSelected = new Set(choice.selected);
            if (input.checked) {
                if (input.type === "radio") {
                    choice.selected = [option.value];
                    sync();
                    onChange();
                    return;
                }
                if (nextSelected.size >= choice.count) {
                    input.checked = false;
                    return;
                }
                nextSelected.add(option.value);
            } else {
                nextSelected.delete(option.value);
            }
            choice.selected = Array.from(nextSelected);
            sync();
            onChange();
        });

        const body = createElement("div", "level-editor__class-option-card-body");
        const heading = createElement("div", "level-editor__class-option-card-heading");
        heading.appendChild(createElement("span", "level-editor__class-option-card-title", option.label || option.value));
        if (option.source || option.page) {
            const sourceParts = [option.source, option.page ? `p. ${option.page}` : ""].filter(Boolean);
            heading.appendChild(createElement("span", "level-editor__class-option-card-source", sourceParts.join(" | ")));
        }

        const description = createElement("div", "level-editor__class-option-card-description");
        if (option.rulesEntries) {
            appendRulesEntry(description, option.rulesEntries, {
                text: "level-editor__class-option-card-description-text",
                list: "level-editor__class-option-card-description-list",
                table: "level-editor__race-table",
                section: "level-editor__class-option-card-description-section",
                title: "level-editor__class-option-card-description-title"
            });
        } else {
            description.appendChild(createElement("span", "level-editor__class-option-card-description-text", option.description || "No description available."));
        }

        body.appendChild(heading);
        body.appendChild(description);
        label.appendChild(input);
        label.appendChild(body);
        list.appendChild(label);
    }

    section.appendChild(list);
    sync();
    return section;
}

function renderOptionalFeatureReview(feature) {
    const section = createElement("section", "level-editor__choice-section level-editor__class-option-section");
    const title = createElement("h4", "level-editor__choice-section-title");
    title.appendChild(createElement("span", "", getCatalogDisplayName(feature, feature?.name || "Optional Class Feature")));
    title.appendChild(createElement("span", "level-editor__choice-group-count", "Optional"));
    section.appendChild(title);

    const rules = feature?.entries
        || feature?.raw?.entries
        || feature?._fullEntries
        || feature?.description
        || feature?.summary
        || "";

    if (rules) {
        const description = createElement("div", "level-editor__class-option-card-description");
        appendRulesEntry(description, rules, {
            text: "level-editor__class-option-card-description-text",
            list: "level-editor__class-option-card-description-list",
            table: "level-editor__race-table",
            section: "level-editor__class-option-card-description-section",
            title: "level-editor__class-option-card-description-title"
        });
        section.appendChild(description);
    } else {
        section.appendChild(createDescription("Review this optional class feature for this level."));
    }

    return section;
}

export function buildClassOptionContent(context) {
    const fragment = document.createDocumentFragment();
    const wrapper = createElement("div", "level-editor__limited-choice-editor level-editor__class-options-editor");
    const status = createElement("p", "level-editor__choice-status", "Loading class options...");
    const controls = createElement("div", "level-editor__class-options-controls");
    const actions = createElement("div", "level-editor__choice-actions");
    const resetButton = document.createElement("button");
    const applyButton = document.createElement("button");
    let model = null;
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
        if (!model) {
            return;
        }

        const missing = getMissingChoices(model);
        applyButton.disabled = missing.length > 0;
        status.textContent = missing.length
            ? `Missing choices: ${missing.join(", ")}.`
            : `${model.choices.length} class option${model.choices.length === 1 ? "" : "s"} selected.`;
    }

    function renderControls() {
        controls.replaceChildren();
        if (!model?.choices?.length) {
            const optionalReviews = getOptionalClassFeatureReviews(model?.features);
            if (optionalReviews.length) {
                for (const feature of optionalReviews) {
                    controls.appendChild(renderOptionalFeatureReview(feature));
                }
                applyButton.disabled = false;
                status.textContent = `${optionalReviews.length} optional class feature${optionalReviews.length === 1 ? "" : "s"} available.`;
                return;
            }

            controls.appendChild(createDescription("No class options are required for this level."));
            applyButton.disabled = false;
            status.textContent = "No class options required.";
            return;
        }

        for (const choice of model.choices) {
            controls.appendChild(renderChoice(choice, updateStatus));
        }
        for (const feature of getOptionalClassFeatureReviews(model.features)) {
            controls.appendChild(renderOptionalFeatureReview(feature));
        }
        updateStatus();
    }

    resetButton.addEventListener("click", () => {
        if (!model) {
            return;
        }
        for (const choice of model.choices) {
            choice.selected = toArray(initialSelections[choice.id]).slice(0, choice.count);
        }
        renderControls();
    });

    applyButton.addEventListener("click", () => {
        if (!model || typeof context.onChange !== "function" || getMissingChoices(model).length) {
            return;
        }

        const nextDto = PlayerSheetDtoHelper.patch(
            context.dto,
            `levels.${getLevelIndex(context)}.choices`,
            buildPersistedChoices(context, model)
        );
        context.onChange(nextDto);
        applyButton.closest("dialog")?.close();
    });

    void buildClassOptionModel(context)
        .then((nextModel) => {
            model = nextModel;
            initialSelections = Object.fromEntries(model.choices.map((choice) => [choice.id, choice.selected.slice()]));
            renderControls();
        })
        .catch((error) => {
            console.error("Class options failed to load:", error);
            status.textContent = "Class options failed to load.";
            controls.replaceChildren(createDescription("Check the class feature catalog API connection and try again."));
            applyButton.disabled = true;
        });

    return fragment;
}
