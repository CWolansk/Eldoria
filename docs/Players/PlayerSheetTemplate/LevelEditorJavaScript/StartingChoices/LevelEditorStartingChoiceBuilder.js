import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createElement,
    createList
} from "../../PlayerSheetHtmlHelper.js";
import {
    getCatalogCache,
    getCatalogDisplayName,
    getValue,
    normalizeSearchText,
    SKILLS,
    titleCase,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    expandCatalogRecords,
    getStructuredGrantGroup
} from "../Catalog/LevelEditorCatalogChoiceResolver.js";
import {
    buildCatalogProfile
} from "../CatalogProfile/Builder.js";
import {
    getProfileChoiceDefinitions
} from "../CatalogProfile/Choices.js";
import {
    getProfileGrantGroup
} from "../CatalogProfile/Grants.js";

const SKILL_LABELS = {
    acrobatics: "Acrobatics",
    animalHandling: "Animal Handling",
    arcana: "Arcana",
    athletics: "Athletics",
    deception: "Deception",
    history: "History",
    insight: "Insight",
    intimidation: "Intimidation",
    investigation: "Investigation",
    medicine: "Medicine",
    nature: "Nature",
    perception: "Perception",
    performance: "Performance",
    persuasion: "Persuasion",
    religion: "Religion",
    sleightOfHand: "Sleight of Hand",
    stealth: "Stealth",
    survival: "Survival"
};

const SKILL_ALIASES = new Map(SKILLS.flatMap((skill) => [
    [normalizeSearchText(skill), skill],
    [normalizeSearchText(SKILL_LABELS[skill] || titleCase(skill)), skill]
]));

const DEFAULT_LANGUAGE_NAMES = [
    "Common",
    "Dwarvish",
    "Elvish",
    "Giant",
    "Gnomish",
    "Goblin",
    "Halfling",
    "Orc",
    "Abyssal",
    "Celestial",
    "Draconic",
    "Deep Speech",
    "Infernal",
    "Primordial",
    "Sylvan",
    "Undercommon"
];

export const SKILL_CHOICE_OPTIONS = SKILLS.map((skill) => ({
    value: skill,
    label: SKILL_LABELS[skill] || titleCase(skill)
}));

export const LANGUAGE_CHOICE_OPTIONS = DEFAULT_LANGUAGE_NAMES.map((language) => ({
    value: language,
    label: language
}));

export const TOOL_CHOICE_OPTIONS = [
    "Alchemist's Supplies",
    "Brewer's Supplies",
    "Calligrapher's Supplies",
    "Carpenter's Tools",
    "Cartographer's Tools",
    "Cobbler's Tools",
    "Cook's Utensils",
    "Disguise Kit",
    "Forgery Kit",
    "Gaming Set",
    "Glassblower's Tools",
    "Herbalism Kit",
    "Jeweler's Tools",
    "Leatherworker's Tools",
    "Mason's Tools",
    "Musical Instrument",
    "Navigator's Tools",
    "Painter's Supplies",
    "Poisoner's Kit",
    "Potter's Tools",
    "Smith's Tools",
    "Thieves' Tools",
    "Tinker's Tools",
    "Vehicle (Land)",
    "Vehicle (Water)",
    "Weaver's Tools",
    "Woodcarver's Tools"
].map((tool) => ({
    value: tool,
    label: tool
}));

export const MARTIAL_WEAPON_OPTIONS = [
    "Battleaxe",
    "Blowgun",
    "Flail",
    "Glaive",
    "Greataxe",
    "Greatsword",
    "Halberd",
    "Hand Crossbow",
    "Heavy Crossbow",
    "Lance",
    "Longbow",
    "Longsword",
    "Maul",
    "Morningstar",
    "Net",
    "Pike",
    "Rapier",
    "Scimitar",
    "Shortsword",
    "Trident",
    "War Pick",
    "Warhammer",
    "Whip"
].map((weapon) => ({
    value: weapon,
    label: weapon
}));

function stripReferenceSuffix(value) {
    return String(value || "").split("|")[0].trim();
}

export function normalizeSkillValue(value) {
    const direct = String(value || "").trim();
    if (SKILLS.includes(direct)) {
        return direct;
    }

    return SKILL_ALIASES.get(normalizeSearchText(stripReferenceSuffix(direct))) || "";
}

export function normalizeLanguageValue(value) {
    const text = stripReferenceSuffix(value?.label || value?.name || value?.value || value)
        .replace(/\s+/gu, " ")
        .trim();

    if (!text) {
        return "";
    }

    return text
        .split(" ")
        .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : "")
        .join(" ");
}

export function normalizeToolValue(value) {
    return stripReferenceSuffix(value?.label || value?.name || value?.value || value)
        .replace(/\s+/gu, " ")
        .trim()
        .replace(/\b\w/gu, (letter) => letter.toUpperCase())
        .replace(/'S\b/gu, "'s");
}

export function normalizeWeaponValue(value) {
    return stripReferenceSuffix(value?.label || value?.name || value?.value || value)
        .replace(/\s+/gu, " ")
        .trim()
        .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function getOptionValue(option) {
    if (option && typeof option === "object") {
        return option.value || option.label || option.name || option.id || "";
    }

    return option;
}

function addOption(optionMap, rawValue, config) {
    const value = config.normalize(getOptionValue(rawValue));
    if (!value) {
        return;
    }

    const key = normalizeSearchText(value);
    if (!optionMap.has(key)) {
        optionMap.set(key, {
            value,
            label: config.getLabel(value)
        });
    }
}

function addOptions(optionMap, rawValues, config) {
    for (const rawValue of toArray(rawValues)) {
        const expandedValues = typeof config.expandOption === "function"
            ? config.expandOption(rawValue)
            : null;
        const values = expandedValues ? toArray(expandedValues) : [rawValue];
        values.forEach((value) => addOption(optionMap, value, config));
    }
}

function addAllOptions(optionMap, config) {
    for (const option of config.allOptions) {
        addOption(optionMap, option, config);
    }
}

function addValue(valueMap, rawValue, config, sourceName) {
    const value = config.normalize(rawValue);
    if (!value) {
        return;
    }

    const key = normalizeSearchText(value);
    if (!valueMap.has(key)) {
        valueMap.set(key, {
            value,
            label: config.getLabel(value),
            sourceName
        });
    }
}

function getGrantGroup(entity, grantKey) {
    const profile = buildCatalogProfile(entity);
    return profile ? getProfileGrantGroup(profile, grantKey) : getStructuredGrantGroup(entity, grantKey);
}

function getChoiceDefinitions(entity, choiceType) {
    return getProfileChoiceDefinitions(buildCatalogProfile(entity), choiceType);
}

function getChoiceCountFromGroup(group) {
    return toArray(group?.choices)
        .reduce((total, choice) => total + Math.max(toNumber(choice?.count, 1), 0), 0);
}

function getChoiceCount(entity, config) {
    const groupCount = getChoiceCountFromGroup(getGrantGroup(entity, config.grantKey));
    if (groupCount) {
        return groupCount;
    }

    return getChoiceDefinitions(entity, config.choiceType)
        .reduce((total, choice) => total + Math.max(toNumber(choice?.count, 1), 0), 0);
}

function addChoiceOptionsFromGroup(optionMap, group, config) {
    for (const choice of toArray(group?.choices)) {
        const from = toArray(choice?.from);
        if (choice?.fromFilter && config.filteredOptions) {
            addOptions(optionMap, config.filteredOptions(choice.fromFilter), config);
            continue;
        }

        if (from.some((entry) => config.anyChoiceKeys.has(normalizeSearchText(entry)))) {
            addAllOptions(optionMap, config);
            continue;
        }

        addOptions(optionMap, from, config);
    }
}

function addChoiceOptionsFromDefinitions(optionMap, entity, config) {
    for (const choice of getChoiceDefinitions(entity, config.choiceType)) {
        if (toArray(choice?.options).length) {
            addOptions(optionMap, choice.options, config);
        }
    }
}

async function resolveCatalogRecord(catalog, kind, identity) {
    if (!identity) {
        return null;
    }

    if (!catalog) {
        return identity?.grants || identity?.startingProficiencies ? identity : null;
    }

    const ids = [
        identity.options?.catalogId,
        identity.catalogId,
        identity.id
    ]
        .map((value) => String(value || "").trim())
        .filter((value) => kind === "races" ? Boolean(value) : value.includes(":"));

    for (const id of ids) {
        try {
            const record = await catalog.getById(kind, id);
            if (record) {
                return record;
            }
        } catch (_error) {
            // Try the next identity shape before falling back to name matching.
        }
    }

    return identity?.grants || identity?.startingProficiencies ? identity : null;
}

function appendRecord(records, record) {
    if (!record) {
        return;
    }

    const key = normalizeSearchText(record.id || record.ref || record.name || getCatalogDisplayName(record, ""));
    if (key && records.some((existing) => normalizeSearchText(existing.id || existing.ref || existing.name || getCatalogDisplayName(existing, "")) === key)) {
        return;
    }

    records.push(record);
}

function getEntityKey(entity) {
    return normalizeSearchText(entity?.id || entity?.ref || entity?.sourceId || entity?.name || getCatalogDisplayName(entity, ""));
}

async function loadRaceRecords(catalog, context) {
    const records = [];
    const raceIdentity = getValue(context.dto, "baseChoices.race", null);
    const race = await resolveCatalogRecord(catalog, "races", raceIdentity);

    if (race?.parentId && catalog) {
        try {
            appendRecord(records, await catalog.getById("races", race.parentId));
        } catch (_error) {
            // Parent race data is additive; continue with the selected race if unavailable.
        }
    }

    appendRecord(records, race);
    return records;
}

export async function loadStartingChoiceRecords(context) {
    const catalog = getCatalogCache(context.api);
    const records = [];
    const classIdentity = getValue(context.dto, "levels.0.class", null);
    const backgroundIdentity = getValue(context.dto, "baseChoices.background", null);

    for (const raceRecord of await loadRaceRecords(catalog, context)) {
        appendRecord(records, raceRecord);
    }

    appendRecord(records, await resolveCatalogRecord(catalog, "classes", classIdentity));
    appendRecord(records, await resolveCatalogRecord(catalog, "backgrounds", backgroundIdentity));

    return expandCatalogRecords(context, records, {
        includeLinkedFeatures: true,
        classLevel: 1
    });
}

function shouldIncludeEntityChoice(entity, choice, config, context) {
    void entity;
    void choice;
    void config;
    void context;
    return true;
}

function normalizeChoiceOptions(rawOptions, config) {
    const optionMap = new Map();
    addOptions(optionMap, rawOptions, config);
    return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function getOptionsForGroupChoice(choice, config) {
    const optionMap = new Map();
    const from = toArray(choice?.from);

    if (toArray(choice?.options).length) {
        addOptions(optionMap, choice.options, config);
    } else if (choice?.fromFilter && config.filteredOptions) {
        addOptions(optionMap, config.filteredOptions(choice.fromFilter), config);
    } else if (from.some((entry) => config.anyChoiceKeys.has(normalizeSearchText(entry)))) {
        addAllOptions(optionMap, config);
    } else {
        addOptions(optionMap, from, config);
    }

    return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function createModelGroup(entity, rawGroup, index, config, context) {
    if (!shouldIncludeEntityChoice(entity, rawGroup, config, context)) {
        return null;
    }

    const options = getOptionsForGroupChoice(rawGroup, config);
    return {
        id: `${getEntityKey(entity)}:${config.grantKey}:${index}`,
        label: rawGroup.label || `${getCatalogDisplayName(entity, "Source")} ${config.label}`,
        prompt: rawGroup.prompt || "",
        sourceName: getCatalogDisplayName(entity, ""),
        count: Math.max(toNumber(rawGroup.count, 1), 0),
        options,
        selected: []
    };
}

function createModelGroupFromDefinition(entity, choice, index, config, context) {
    if (!shouldIncludeEntityChoice(entity, choice, config, context)) {
        return null;
    }

    const options = toArray(choice?.options).length
        ? normalizeChoiceOptions(choice.options, config)
        : normalizeChoiceOptions(config.allOptions, config);

    return {
        id: choice.id || choice.choiceId || `${getEntityKey(entity)}:${config.choiceType}:${index}`,
        label: choice.label || `${getCatalogDisplayName(entity, "Source")} ${config.label}`,
        prompt: choice.prompt || "",
        sourceName: choice.sourceName || getCatalogDisplayName(entity, ""),
        count: Math.max(toNumber(choice.count, 1), 0),
        options,
        selected: []
    };
}

function addGroupsForEntity(groups, entity, config, context) {
    const definitions = getChoiceDefinitions(entity, config.choiceType);
    if (definitions.length) {
        definitions.forEach((choice, index) => {
            const group = createModelGroupFromDefinition(entity, choice, index, config, context);
            if (group?.count > 0) {
                groups.push(group);
            }
        });
        return;
    }

    const grantGroup = getGrantGroup(entity, config.grantKey);
    toArray(grantGroup?.choices).forEach((choice, index) => {
        const group = createModelGroup(entity, choice, index, config, context);
        if (group?.count > 0) {
            groups.push(group);
        }
    });
}

function hydrateGroupSelections(groups, fixedMap, existingValues, persistedGroups, config) {
    const usedValues = new Set();

    for (const group of groups) {
        const optionKeys = new Set(group.options.map((option) => normalizeSearchText(option.value)));
        const persisted = toArray(persistedGroups?.[group.id]?.values)
            .map((entry) => entry?.value || entry?.name || entry)
            .map(config.normalize)
            .filter((value) => value && optionKeys.has(normalizeSearchText(value)) && !fixedMap.has(normalizeSearchText(value)))
            .slice(0, group.count);

        if (persisted.length) {
            group.selected = persisted;
            persisted.forEach((value) => usedValues.add(normalizeSearchText(value)));
        }
    }

    for (const existingValue of toArray(existingValues)) {
        const value = config.normalize(existingValue?.name || existingValue?.value || existingValue);
        const key = normalizeSearchText(value);
        if (!key || fixedMap.has(key) || usedValues.has(key)) {
            continue;
        }

        const group = groups.find((candidate) => {
            if (candidate.selected.length >= candidate.count) {
                return false;
            }
            return candidate.options.some((option) => normalizeSearchText(option.value) === key);
        });

        if (group) {
            group.selected.push(value);
            usedValues.add(key);
        }
    }
}

export function buildStartingChoiceModel(records, config, existingValues = [], persistedGroups = {}, context = null) {
    const fixedMap = new Map();
    const groups = [];

    for (const entity of toArray(records)) {
        const sourceName = getCatalogDisplayName(entity, "");
        const group = getGrantGroup(entity, config.grantKey);

        for (const fixed of toArray(group?.fixed)) {
            addValue(fixedMap, fixed, config, sourceName);
        }

        addGroupsForEntity(groups, entity, config, context);
    }

    for (const group of groups) {
        group.options = group.options.filter((option) => !fixedMap.has(normalizeSearchText(option.value)));
    }

    hydrateGroupSelections(groups, fixedMap, existingValues, persistedGroups, config);

    const choiceLimit = groups.reduce((total, group) => total + group.count, 0);
    const selectedCount = groups.reduce((total, group) => total + group.selected.length, 0);
    return {
        fixed: Array.from(fixedMap.values()),
        groups,
        choiceLimit,
        selectedCount,
        totalLimit: fixedMap.size + choiceLimit
    };
}

export async function hasStartingChoiceOptions(context, config) {
    try {
        const records = await loadStartingChoiceRecords(context);
        const model = buildStartingChoiceModel(
            records,
            config,
            typeof config.getExistingValues === "function"
                ? config.getExistingValues(context.dto)
                : PlayerSheetDtoHelper.getValue(context.dto, config.storagePath, []),
            PlayerSheetDtoHelper.getValue(context.dto, `baseChoices.proficiencyChoices.${config.grantKey}`, {}),
            context
        );
        return model.groups.some((group) => group.count > 0 && group.options.length > 0);
    } catch (error) {
        console.warn(`${config.label} choice visibility check failed:`, error);
        return true;
    }
}

function setMetricValue(metric, value) {
    const valueElement = metric.querySelector(".level-editor__choice-metric-value");
    if (valueElement) {
        valueElement.textContent = value;
    }
}

function createMetric(label, value) {
    const metric = createElement("div", "level-editor__choice-metric");
    metric.appendChild(createElement("span", "level-editor__choice-metric-label", label));
    metric.appendChild(createElement("span", "level-editor__choice-metric-value", value));
    return metric;
}

function createGroupTitle(group) {
    const title = createElement("h4", "level-editor__choice-section-title");
    title.appendChild(createElement("span", "", group.label));
    title.appendChild(createElement("span", "level-editor__choice-group-count", `${group.selected.length} / ${group.count}`));
    return title;
}

function syncGroupCount(section, group) {
    const count = section.querySelector(".level-editor__choice-group-count");
    if (count) {
        count.textContent = `${group.selected.length} / ${group.count}`;
    }
}

export function buildStartingChoiceContent(context, config) {
    const fragment = document.createDocumentFragment();
    const selectedValues = new Set();
    let model = null;

    const wrapper = createElement("div", "level-editor__limited-choice-editor");
    const status = createElement("p", "level-editor__choice-status", "Loading choices...");
    const summary = createElement("div", "level-editor__choice-summary");
    const fixedMetric = createMetric("Fixed", "0");
    const selectedMetric = createMetric("Selected", "0 / 0");
    const totalMetric = createMetric("Total", "0 / 0");
    const fixedListSection = createElement("section", "level-editor__choice-section");
    const fixedListTitle = createElement("h4", "level-editor__choice-section-title", "Fixed");
    const fixedListHost = createElement("div");
    const grid = createElement("div", "level-editor__grouped-choice-list");
    const actions = createElement("div", "level-editor__choice-actions");
    const resetButton = document.createElement("button");
    const applyButton = document.createElement("button");
    let initialGroupSelections = {};

    resetButton.type = "button";
    resetButton.className = "level-editor__button";
    resetButton.textContent = "Reset";

    applyButton.type = "button";
    applyButton.className = "level-editor__button level-editor__button--primary";
    applyButton.textContent = "Apply";
    applyButton.disabled = true;

    summary.appendChild(fixedMetric);
    summary.appendChild(selectedMetric);
    summary.appendChild(totalMetric);
    fixedListSection.appendChild(fixedListTitle);
    fixedListSection.appendChild(fixedListHost);
    actions.appendChild(resetButton);
    actions.appendChild(applyButton);
    wrapper.appendChild(status);
    wrapper.appendChild(summary);
    wrapper.appendChild(fixedListSection);
    wrapper.appendChild(grid);
    wrapper.appendChild(actions);
    fragment.appendChild(wrapper);

    function getSelectedArray() {
        return Array.from(selectedValues);
    }

    function getGroupSelectionMap() {
        const result = {};
        if (!model) {
            return result;
        }

        for (const group of model.groups) {
            result[group.id] = {
                sourceName: group.sourceName,
                label: group.label,
                count: group.count,
                values: group.selected.slice(0, group.count)
            };
        }
        return result;
    }

    function updateSummary() {
        if (!model) {
            return;
        }

        const selectedCount = model.groups.reduce((total, group) => total + group.selected.length, 0);
        const fixedCount = model.fixed.length;
        const totalCount = fixedCount + selectedCount;
        const missingGroups = model.groups
            .filter((group) => group.options.length && group.selected.length < group.count);
        setMetricValue(fixedMetric, String(fixedCount));
        setMetricValue(selectedMetric, `${selectedCount} / ${model.choiceLimit}`);
        setMetricValue(totalMetric, `${totalCount} / ${model.totalLimit}`);
        selectedMetric.classList.toggle("level-editor__choice-metric--warning", selectedCount > model.choiceLimit);
        totalMetric.classList.toggle("level-editor__choice-metric--warning", totalCount > model.totalLimit);
        applyButton.disabled = selectedCount > model.choiceLimit || missingGroups.length > 0;
        status.textContent = missingGroups.length
            ? `Missing choices: ${missingGroups.map((group) => group.label).join(", ")}.`
            : `${config.label}: ${selectedCount} of ${model.choiceLimit} optional selected.`;
    }

    function syncGroupDisabledStates(section, group) {
        const atLimit = group.selected.length >= group.count;
        section.querySelectorAll("input[type='checkbox']").forEach((input) => {
            input.disabled = !input.checked && atLimit;
        });
        syncGroupCount(section, group);
    }

    function renderGroup(group) {
        const section = createElement("section", "level-editor__choice-section");
        section.appendChild(createGroupTitle(group));
        if (group.prompt) {
            section.appendChild(createElement("p", "level-editor__modal-description", group.prompt));
        }

        const groupGrid = createElement("div", "level-editor__checkbox-grid level-editor__choice-grid");

        if (!group.options.length) {
            groupGrid.appendChild(createElement("p", "level-editor__modal-description", group.count ? "No valid choices found." : "No optional choices available."));
            section.appendChild(groupGrid);
            return section;
        }

        const selectedSet = new Set(group.selected);
        for (const option of group.options) {
            const label = createElement("label", "level-editor__checkbox level-editor__choice-checkbox");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = selectedSet.has(option.value);
            checkbox.addEventListener("change", () => {
                const current = new Set(group.selected);
                if (checkbox.checked) {
                    if (current.size >= group.count) {
                        checkbox.checked = false;
                        return;
                    }
                    current.add(option.value);
                } else {
                    current.delete(option.value);
                }

                group.selected = Array.from(current);
                updateSummary();
                syncGroupDisabledStates(section, group);
            });

            label.appendChild(checkbox);
            label.appendChild(createElement("span", "", option.label));
            groupGrid.appendChild(label);
        }

        section.appendChild(groupGrid);
        syncGroupDisabledStates(section, group);
        return section;
    }

    function renderOptions() {
        grid.replaceChildren();

        if (!model.groups.length) {
            grid.appendChild(createElement("p", "level-editor__modal-description", model.choiceLimit ? "No valid choices found." : "No optional choices available."));
            return;
        }

        for (const group of model.groups) {
            grid.appendChild(renderGroup(group));
        }
    }

    function renderFixedList() {
        fixedListHost.replaceChildren();
        fixedListHost.appendChild(createList(
            model.fixed.map((fixed) => fixed.sourceName ? `${fixed.label} (${fixed.sourceName})` : fixed.label),
            "None"
        ));
    }

    function renderModel() {
        selectedValues.clear();

        renderFixedList();
        renderOptions();
        updateSummary();
    }

    resetButton.addEventListener("click", () => {
        if (model) {
            for (const group of model.groups) {
                group.selected = toArray(initialGroupSelections[group.id]).slice(0, group.count);
            }
            renderModel();
        }
    });

    applyButton.addEventListener("click", () => {
        const missingGroups = model?.groups?.filter((group) => group.options.length && group.selected.length < group.count) || [];
        if (!model || typeof context.onChange !== "function" || missingGroups.length) {
            return;
        }

        const fixedValues = model.fixed.map((fixed) => fixed.value);
        const selectedGroupValues = model.groups.flatMap((group) => group.selected.slice(0, group.count));
        const nextValues = [...new Set([...fixedValues, ...selectedGroupValues])];
        let nextDto = typeof config.applyValues === "function"
            ? config.applyValues(context.dto, nextValues)
            : PlayerSheetDtoHelper.patch(context.dto, config.storagePath, nextValues);
        nextDto = PlayerSheetDtoHelper.patch(nextDto, `baseChoices.proficiencyChoices.${config.grantKey}`, getGroupSelectionMap());
        context.onChange(nextDto);
        applyButton.closest("dialog")?.close();
    });

    void loadStartingChoiceRecords(context)
        .then((records) => {
            model = buildStartingChoiceModel(
                records,
                config,
                typeof config.getExistingValues === "function"
                    ? config.getExistingValues(context.dto)
                    : PlayerSheetDtoHelper.getValue(context.dto, config.storagePath, []),
                PlayerSheetDtoHelper.getValue(context.dto, `baseChoices.proficiencyChoices.${config.grantKey}`, {}),
                context
            );
            initialGroupSelections = Object.fromEntries(model.groups.map((group) => [group.id, group.selected.slice()]));
            renderModel();
        })
        .catch((error) => {
            console.error(`${config.label} choices failed to load:`, error);
            status.textContent = `${config.label} choices failed to load.`;
            applyButton.disabled = true;
        });

    return fragment;
}
