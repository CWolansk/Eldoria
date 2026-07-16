import { PlayerSheetDtoHelper } from "../PlayerSheetDtoHelper.js";
import {
    appendRulesEntry,
    createElement
} from "../PlayerSheetHtmlHelper.js";
import {
    appendEmptyState,
    createCardGrid,
    createDefinitionList,
    createItemList,
    createSection,
    createTabShell
} from "./PlayerSheetTabHelpers.js";
import {
    getCatalogCache,
    getCatalogDisplayName,
    getCatalogSource,
    formatRulesText,
    normalizeSearchText,
    toArray,
    toNumber,
    titleCase
} from "../LevelEditorJavaScript/Core/LevelEditorShared.js";

const SPELL_SEARCH_LIMIT = 25;
const SPELL_SEARCH_DEBOUNCE_MS = 250;
const SPELL_RULES_PREVIEW_LIMIT = 250;
const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SPELL_LISTS = [
    { key: "cantrips", label: "Cantrips", singular: "Cantrip" },
    { key: "known", label: "Known Spells", singular: "Known" },
    { key: "prepared", label: "Prepared Spells", singular: "Prepared" },
    { key: "alwaysPrepared", label: "Always Prepared", singular: "Always Prepared" }
];

const SCHOOL_LABELS = {
    A: "abjuration",
    C: "conjuration",
    D: "divination",
    E: "enchantment",
    V: "evocation",
    I: "illusion",
    N: "necromancy",
    T: "transmutation"
};

const ATTACK_LABELS = {
    M: "Melee",
    R: "Ranged",
    O: "Other"
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

function listCatalogItems(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    if (Array.isArray(response?.value)) {
        return response.value;
    }

    return [];
}

function uniqueByText(values = []) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const text = String(value || "").trim();
        const key = normalizeSearchText(text);
        if (!text || seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(text);
    }
    return result;
}

function ordinal(value) {
    const number = toNumber(value, 0);
    if (number === 0) {
        return "Cantrip";
    }

    const suffix = number % 100 >= 11 && number % 100 <= 13
        ? "th"
        : ({ 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th");
    return `${number}${suffix}`;
}

function formatSpellLevel(value) {
    const level = Math.max(0, Math.min(9, toNumber(value, 0)));
    return level === 0 ? "Cantrip" : `${ordinal(level)} level`;
}

function getSpellName(spell, fallback = "Unknown Spell") {
    if (typeof spell === "string") {
        return spell || fallback;
    }

    return spell?.name
        || spell?.catalog?.name
        || spell?.snapshot?.name
        || getCatalogDisplayName(spell, fallback)
        || fallback;
}

function getSpellSource(spell, record = spell) {
    return getCatalogSource(record)
        || spell?.source
        || spell?.catalog?.source
        || "";
}

function getSpellCatalogId(spell) {
    return String(
        spell?.id
        || spell?.refId
        || spell?.sourceId
        || spell?.catalog?.id
        || spell?.catalogId
        || spell?.ref
        || ""
    ).trim().replace(/\.json$/iu, "");
}

function getSpellRecordLevel(record, fallback = 1) {
    const rawLevel = record?.level ?? record?.raw?.level ?? fallback;
    return Math.max(0, Math.min(9, toNumber(rawLevel, fallback)));
}

function getSpellSchool(record = {}) {
    const school = record.school || record.raw?.school || "";
    if (typeof school === "object") {
        return titleCase(school.name || SCHOOL_LABELS[school.code] || school.code || "");
    }

    return titleCase(SCHOOL_LABELS[String(school).toUpperCase()] || school);
}

function formatSpellTime(record = {}) {
    const entries = toArray(record.time || record.raw?.time);
    return entries.map((entry) => {
        const number = entry?.number ?? 1;
        const unit = String(entry?.unit || "").trim();
        if (!unit) {
            return "";
        }
        return `${number} ${unit}${number === 1 || unit.endsWith("s") ? "" : "s"}`;
    }).filter(Boolean).join(", ");
}

function formatSpellRange(record = {}) {
    const range = record.range || record.raw?.range;
    if (!range || typeof range !== "object") {
        return "";
    }

    const distance = range.distance || {};
    const type = String(distance.type || range.type || "").trim();
    const amount = distance.amount;
    if (amount != null && type) {
        return `${amount} ${type}`;
    }
    return titleCase(type || range.type || "");
}

function formatSpellDuration(record = {}) {
    const durations = toArray(record.duration || record.raw?.duration);
    return durations.map((entry) => {
        if (!entry || typeof entry !== "object") {
            return String(entry || "").trim();
        }

        const concentration = entry.concentration || record.concentration ? "Concentration, " : "";
        if (entry.type === "instant") {
            return `${concentration}Instantaneous`.trim();
        }
        if (entry.type === "permanent") {
            return `${concentration}Permanent`.trim();
        }
        const duration = entry.duration || {};
        if (duration.amount != null && duration.type) {
            return `${concentration}${duration.amount} ${duration.type}${duration.amount === 1 || String(duration.type).endsWith("s") ? "" : "s"}`;
        }
        return `${concentration}${titleCase(entry.type || "")}`.trim();
    }).filter(Boolean).join(", ");
}

function formatSpellComponents(record = {}) {
    const components = record.components || record.raw?.components || {};
    if (!components || typeof components !== "object") {
        return "";
    }

    const parts = [];
    if (components.v) {
        parts.push("V");
    }
    if (components.s) {
        parts.push("S");
    }
    if (components.m) {
        const material = typeof components.m === "string"
            ? components.m
            : components.m.text || components.m.cost || "M";
        parts.push(`M (${formatRulesText(material)})`);
    }
    return parts.join(", ");
}

function stripHtml(value) {
    return String(value || "").replace(/<[^>]*>/gu, " ");
}

function flattenRulesText(value, depth = 0) {
    if (value == null || depth > 5) {
        return "";
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return stripHtml(value);
    }

    if (Array.isArray(value)) {
        return value.map((entry) => flattenRulesText(entry, depth + 1)).filter(Boolean).join(" ");
    }

    if (typeof value === "object") {
        return Object.entries(value)
            .filter(([key]) => !key.startsWith("_") || key === "_fullEntries")
            .map(([, entry]) => flattenRulesText(entry, depth + 1))
            .filter(Boolean)
            .join(" ");
    }

    return "";
}

function getSpellRulesEntry(record = {}) {
    const entries = toArray(record.entries).length ? toArray(record.entries) : toArray(record.raw?.entries);
    const higher = toArray(record.entriesHigherLevel).length
        ? toArray(record.entriesHigherLevel)
        : toArray(record.raw?.entriesHigherLevel);
    const rules = [...entries, ...higher]
        .filter((entry) => typeof entry === "string" || entry?.entries || entry?.items || entry?.type || entry?.name);
    return rules.length ? rules : null;
}

function createRulesClassNames() {
    return {
        text: "player-sheet-item-card__rules-text",
        list: "player-sheet-item-card__rules-list",
        table: "player-sheet-item-card__rules-table",
        section: "player-sheet-item-card__rules-section",
        title: "player-sheet-item-card__rules-title"
    };
}

function createRulesPreviewText(rulesEntry, limit = SPELL_RULES_PREVIEW_LIMIT) {
    const fullText = formatRulesText(flattenRulesText(rulesEntry));
    if (!fullText) {
        return { text: "", truncated: false };
    }

    if (fullText.length <= limit) {
        return { text: fullText, truncated: false };
    }

    return {
        text: `${fullText.slice(0, limit).trimEnd()}...`,
        truncated: true
    };
}

function appendSpellRules(container, record, options = {}) {
    const rulesEntry = getSpellRulesEntry(record);
    if (!rulesEntry) {
        return;
    }

    const preview = createRulesPreviewText(rulesEntry, options.previewLimit ?? SPELL_RULES_PREVIEW_LIMIT);
    if (!preview.text) {
        return;
    }

    const rules = createElement("div", "player-sheet-item-card__rules");
    if (options.compact) {
        rules.classList.add("player-sheet-item-card__rules--compact");
    }

    if (!preview.truncated) {
        if (options.compact) {
            rules.appendChild(createElement("p", "player-sheet-item-card__rules-preview", preview.text));
            container.appendChild(rules);
            return;
        }

        rules.classList.add("player-sheet-item-card__rules--inline");
        appendRulesEntry(rules, rulesEntry, createRulesClassNames());
        container.appendChild(rules);
        return;
    }

    rules.appendChild(createElement("p", "player-sheet-item-card__rules-preview", preview.text));
    const detail = createElement("details", "player-sheet-item-card__rules-details");
    detail.appendChild(createElement("summary", "player-sheet-item-card__rules-summary", "Show full rules"));
    appendRulesEntry(detail, rulesEntry, createRulesClassNames());
    rules.appendChild(detail);
    container.appendChild(rules);
}

function getSpellDamageTypes(record = {}) {
    return uniqueByText([
        ...toArray(record.damageInflict),
        ...toArray(record.raw?.damageInflict)
    ]).map(titleCase);
}

function getScaledSpellDice(record = {}, characterLevel = 1) {
    const scaling = record.scalingLevelDice?.scaling || record.raw?.scalingLevelDice?.scaling;
    if (!scaling || typeof scaling !== "object") {
        return "";
    }

    const level = Math.max(1, toNumber(characterLevel, 1));
    const bestKey = Object.keys(scaling)
        .map((key) => toNumber(key, 0))
        .filter((key) => key > 0 && key <= level)
        .sort((left, right) => right - left)[0];
    if (!bestKey) {
        return "";
    }

    const dice = String(scaling[String(bestKey)] || "").trim();
    const label = String(record.scalingLevelDice?.label || record.raw?.scalingLevelDice?.label || "").trim();
    return [dice, label].filter(Boolean).join(" ");
}

function extractDiceFromRules(record = {}) {
    const text = flattenRulesText(getSpellRulesEntry(record));
    const matches = [];
    const regex = /\{@(?:damage|scaledamage|dice|scaledice)\s+([^}|]+)(?:\|[^}]*)?\}/giu;
    let match = regex.exec(text);
    while (match) {
        matches.push(formatRulesText(match[1]));
        match = regex.exec(text);
    }
    return uniqueByText(matches)[0] || "";
}

function getSpellDamageText(record = {}, characterLevel = 1) {
    const scaled = getScaledSpellDice(record, characterLevel);
    if (scaled) {
        return scaled;
    }

    const dice = extractDiceFromRules(record);
    const types = getSpellDamageTypes(record);
    return [dice, types.join(", ")].filter(Boolean).join(" ");
}

function getSavingThrowText(record = {}, spellcasting = {}) {
    const saves = uniqueByText([
        ...toArray(record.savingThrow),
        ...toArray(record.raw?.savingThrow)
    ]).map((save) => save.slice(0, 3).toUpperCase());
    if (!saves.length) {
        return "";
    }

    const dc = toNumber(spellcasting.spellSaveDc, 0);
    return `${saves.join(", ")}${dc ? ` DC ${dc}` : ""}`;
}

function getSpellAttackText(record = {}, spellcasting = {}) {
    const attacks = uniqueByText([
        ...toArray(record.spellAttack),
        ...toArray(record.raw?.spellAttack)
    ]).map((attack) => ATTACK_LABELS[String(attack).toUpperCase()] || titleCase(attack));
    if (!attacks.length) {
        return "";
    }

    const bonus = toNumber(spellcasting.spellAttackBonus, 0);
    const bonusText = bonus ? `${bonus >= 0 ? "+" : ""}${bonus}` : "";
    return [attacks.join(", "), bonusText].filter(Boolean).join(" ");
}

function getSpellTagTexts(entry, record = {}) {
    return uniqueByText([
        entry.sourceLabel,
        record.ritual || record.raw?.ritual ? "Ritual" : "",
        record.concentration || record.raw?.concentration ? "Concentration" : "",
        getSpellSchool(record)
    ]);
}

function getSpellDetailRows(entry, record = {}) {
    const spellcasting = entry.spellcasting || {};
    const castAtLevel = toNumber(entry.spell?.castAtLevel, 0);
    const recharge = String(entry.spell?.recharge || "").trim();
    return [
        ["Level", formatSpellLevel(getSpellRecordLevel(record, entry.fallbackLevel))],
        ["Cast at", castAtLevel > 0 ? formatSpellLevel(castAtLevel) : ""],
        ["Recharge", recharge ? titleCase(recharge) : ""],
        ["Source", getSpellSource(entry.spell, record)],
        ["School", getSpellSchool(record)],
        ["Casting", formatSpellTime(record)],
        ["Range", formatSpellRange(record)],
        ["Duration", formatSpellDuration(record)],
        ["Components", formatSpellComponents(record)],
        ["Save", getSavingThrowText(record, spellcasting)],
        ["Attack", getSpellAttackText(record, spellcasting)],
        ["Damage", getSpellDamageText(record, entry.characterLevel)]
    ].filter(([, value]) => value != null && String(value).trim());
}

function normalizeSpellMetric(metric) {
    if (Array.isArray(metric)) {
        return { label: metric[0], value: metric[1] };
    }
    if (metric && typeof metric === "object") {
        return { label: metric.label || metric.name || "", value: metric.value ?? metric.text ?? "" };
    }
    return null;
}

export function createSpellCard(entry, record = entry.record || entry.spell, options = {}) {
    const card = createElement("article", "player-sheet-item-card player-sheet-spell-card");
    if (options.compact) {
        card.classList.add("player-sheet-item-card--compact");
    }

    const header = createElement("div", "player-sheet-item-card__header");
    const titleArea = createElement("div", "player-sheet-item-card__title-area");
    titleArea.appendChild(createElement("h4", "player-sheet-item-card__title", getSpellName(entry.spell)));
    const meta = [
        getSpellSource(entry.spell, record),
        formatSpellLevel(getSpellRecordLevel(record, entry.fallbackLevel)),
        getSpellSchool(record)
    ].filter(Boolean).join(" | ");
    if (meta) {
        titleArea.appendChild(createElement("p", "player-sheet-item-card__meta", meta));
    }
    header.appendChild(titleArea);
    if (entry.sourceLabel) {
        header.appendChild(createElement("span", "player-sheet-item-card__badge", entry.sourceLabel));
    }
    card.appendChild(header);

    const tags = getSpellTagTexts(entry, record);
    if (tags.length) {
        const tagList = createElement("div", "player-sheet-pill-list");
        for (const tag of tags) {
            tagList.appendChild(createElement("span", "player-sheet-pill", tag));
        }
        card.appendChild(tagList);
    }

    const rows = getSpellDetailRows(entry, record)
        .filter(([label]) => options.rows == null || options.rows.includes(label));
    if (rows.length) {
        card.appendChild(createDefinitionList(rows));
    }

    if (options.showRules !== false) {
        appendSpellRules(card, record);
    }

    return card;
}

function createRemoveSpellButton(entry, context = {}) {
    if (!entry.removable || typeof context.onChange !== "function") {
        return null;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-sheet-button player-sheet-button--small player-sheet-spell-remove";
    button.textContent = "Remove";
    button.dataset.spellRemove = `${entry.listKey}:${entry.index}`;
    button.setAttribute("aria-label", `Remove ${getSpellName(entry.spell)} from ${entry.sourceLabel}`);
    button.addEventListener("click", async () => {
        button.disabled = true;
        try {
            const currentValues = toArray(PlayerSheetDtoHelper.getValue(context.dto, `spells.${entry.listKey}`, []));
            const nextValues = currentValues.filter((_, index) => index !== entry.index);
            const nextDto = PlayerSheetDtoHelper.patch(context.dto, `spells.${entry.listKey}`, nextValues);
            await context.onChange(nextDto);
        } catch (error) {
            console.error("Failed to remove spell:", error);
            button.disabled = false;
        }
    });
    return button;
}

export function createSpellListItem(entry, record = entry.record || entry.spell, options = {}) {
    const row = createElement("article", "player-sheet-item-row player-sheet-spell-row");
    const summary = createElement("div", "player-sheet-item-row__summary");
    const identity = createElement("div", "player-sheet-item-row__identity");
    const titleLine = createElement("div", "player-sheet-item-row__title-line");
    titleLine.appendChild(createElement("h4", "player-sheet-item-row__title", getSpellName(entry.spell)));

    const actions = toArray(options.actions).filter(Boolean);
    if (actions.length) {
        const actionList = createElement("div", "player-sheet-item-row__actions");
        for (const action of actions) {
            actionList.appendChild(action);
        }
        titleLine.appendChild(actionList);
    }

    identity.appendChild(titleLine);

    const meta = [
        getSpellSource(entry.spell, record),
        formatSpellLevel(getSpellRecordLevel(record, entry.fallbackLevel)),
        getSpellSchool(record)
    ].filter(Boolean).join(" | ");
    if (meta) {
        identity.appendChild(createElement("p", "player-sheet-item-row__meta", meta));
    }

    const tags = getSpellTagTexts(entry, record);
    if (tags.length) {
        const tagList = createElement("div", "player-sheet-item-row__tags");
        for (const tag of tags) {
            tagList.appendChild(createElement("span", "player-sheet-item-row__tag", tag));
        }
        identity.appendChild(tagList);
    }

    const rules = createElement("div", "player-sheet-item-row__rules");
    appendSpellRules(rules, record, {
        compact: true,
        previewLimit: SPELL_RULES_PREVIEW_LIMIT
    });
    if (rules.children.length) {
        identity.appendChild(rules);
    }

    summary.appendChild(identity);

    const wantedRows = options.rows || ["Cast at", "Recharge", "Casting", "Range", "Save", "Attack", "Damage", "Duration"];
    const detailMetrics = getSpellDetailRows(entry, record)
        .filter(([label]) => wantedRows.includes(label))
        .map(([label, value]) => ({ label, value }));
    const metrics = [
        ...detailMetrics,
        ...toArray(options.metrics).map(normalizeSpellMetric)
    ].filter((metric) => metric && metric.value != null && String(metric.value).trim());

    if (metrics.length) {
        const metricList = createElement("div", "player-sheet-item-row__metrics player-sheet-spell-row__metrics");
        for (const metric of metrics) {
            const metricElement = createElement("div", "player-sheet-item-row__metric");
            if (metric.label) {
                metricElement.appendChild(createElement("span", "player-sheet-item-row__metric-label", `${metric.label}:`));
            }
            metricElement.appendChild(createElement("span", "player-sheet-item-row__metric-value", metric.value));
            metricList.appendChild(metricElement);
        }
        summary.appendChild(metricList);
    }

    row.appendChild(summary);
    return row;
}

async function resolveSpellRecord(spell, api, fallbackLevel = 1) {
    if (spell && typeof spell === "object" && getSpellRulesEntry(spell)) {
        return spell;
    }

    if (!api) {
        return {
            name: getSpellName(spell),
            level: fallbackLevel
        };
    }

    const catalog = getCatalogCache(api);
    const catalogId = getSpellCatalogId(spell);
    try {
        if (catalogId && catalogId.includes(":")) {
            const byId = await catalog.getById("spells", catalogId);
            if (byId) {
                return byId;
            }
        }

        const name = getSpellName(spell, "");
        if (name) {
            const source = getSpellSource(spell);
            const byName = await catalog.getByName("spells", name, source)
                || (source ? await catalog.getByName("spells", name) : null);
            if (byName) {
                return byName;
            }
        }
    } catch (error) {
        console.warn("Spell catalog lookup failed:", error);
    }

    return {
        name: getSpellName(spell),
        source: getSpellSource(spell),
        level: fallbackLevel
    };
}

function getPrimarySpellcasting(playerSheetObject = {}) {
    return toArray(playerSheetObject.classes)
        .map((characterClass) => characterClass?.spellcasting)
        .find(Boolean) || null;
}

function collectManagedSpellEntries(playerSheetObject = {}, context = {}) {
    const dtoSpells = context.dto?.spells || {};
    const primarySpellcasting = getPrimarySpellcasting(playerSheetObject);
    const entries = [];

    for (const list of SPELL_LISTS) {
        const values = toArray(dtoSpells[list.key]);
        values.forEach((spell, index) => {
            entries.push({
                spell,
                listKey: list.key,
                sourceLabel: list.singular,
                index,
                removable: true,
                spellcasting: primarySpellcasting,
                fallbackLevel: list.key === "cantrips" ? 0 : 1,
                characterLevel: playerSheetObject.level || 1
            });
        });
    }

    if (entries.length || context.dto) {
        return entries;
    }

    for (const characterClass of toArray(playerSheetObject.classes)) {
        const spellcasting = characterClass?.spellcasting;
        if (!spellcasting) {
            continue;
        }

        for (const [key, sourceLabel, fallbackLevel] of [
            ["cantrips", "Cantrip", 0],
            ["knownSpells", "Known", 1],
            ["preparedSpells", "Prepared", 1],
            ["alwaysPrepared", "Always Prepared", 1],
            ["innateSpells", "Innate", 1]
        ]) {
            toArray(spellcasting[key]).forEach((spell, index) => {
                entries.push({
                    spell,
                    listKey: key,
                    sourceLabel,
                    index,
                    removable: false,
                    spellcasting,
                    fallbackLevel,
                    characterLevel: playerSheetObject.level || 1
                });
            });
        }
    }

    return entries;
}

function collectGrantedSpellEntries(playerSheetObject = {}) {
    const entries = [];
    for (const [groupKey, groupLabel] of [
        ["classChoiceSpells", "Class Feature"],
        ["racialSpells", "Racial"],
        ["featSpells", "Feat"]
    ]) {
        const group = playerSheetObject[groupKey] || {};
        const spellcasting = {
            ability: group.ability,
            spellAttackBonus: group.spellAttackBonus,
            spellSaveDc: group.spellSaveDc
        };

        for (const [key, label, fallbackLevel] of [
            ["cantrips", `${groupLabel} Cantrip`, 0],
            ["known", `${groupLabel} Spell`, 1],
            ["alwaysPrepared", `${groupLabel} Always Prepared`, 1],
            ["innate", `${groupLabel} Innate`, 1]
        ]) {
            toArray(group[key]).forEach((spell, index) => {
                entries.push({
                    spell,
                    listKey: `${groupKey}.${key}`,
                    sourceLabel: label,
                    index,
                    removable: false,
                    spellcasting,
                    fallbackLevel,
                    characterLevel: playerSheetObject.level || 1
                });
            });
        }
    }
    return entries;
}

async function resolveSpellEntries(playerSheetObject = {}, context = {}) {
    const entries = [
        ...collectManagedSpellEntries(playerSheetObject, context),
        ...collectGrantedSpellEntries(playerSheetObject)
    ];

    return Promise.all(entries.map(async (entry) => {
        const record = await resolveSpellRecord(entry.spell, context.api, entry.fallbackLevel);
        return {
            ...entry,
            record,
            level: getSpellRecordLevel(record, entry.fallbackLevel)
        };
    }));
}

function getPagedSearchState(response, skip, items) {
    const nextSkip = Number(response?.nextSkip);
    const hasExplicitPaging = response && typeof response === "object"
        && ("hasMore" in response || "nextSkip" in response);
    const hasMore = Boolean(response?.hasMore)
        || (Number.isFinite(nextSkip) && nextSkip > skip);

    return {
        hasMore: hasExplicitPaging && hasMore,
        nextSkip: hasMore && Number.isFinite(nextSkip) ? nextSkip : skip + items.length
    };
}

async function searchCatalogSpellPage(api, query, skip = 0) {
    if (api && typeof api.searchCatalog === "function") {
        const response = await api.searchCatalog("spells", query, {
            full: false,
            limit: SPELL_SEARCH_LIMIT,
            skip
        });
        const items = listCatalogItems(response);
        return {
            items,
            ...getPagedSearchState(response, skip, items)
        };
    }

    const items = await getCatalogCache(api).searchForPicker("spells", query, {
        full: false,
        limit: SPELL_SEARCH_LIMIT,
        skip
    });
    return {
        items: listCatalogItems(items),
        hasMore: false,
        nextSkip: skip + listCatalogItems(items).length
    };
}

function createModalField(labelText, input) {
    const label = createElement("label", "player-sheet-field");
    label.appendChild(createElement("span", "player-sheet-field__label", labelText));
    label.appendChild(input);
    return label;
}

function buildSpellResultButton(spell, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-sheet-catalog-result";
    button.appendChild(createElement("span", "player-sheet-catalog-result__name", getSpellName(spell)));
    button.appendChild(createElement("span", "player-sheet-catalog-result__meta", [
        getSpellSource(spell, spell),
        formatSpellLevel(getSpellRecordLevel(spell)),
        getSpellSchool(spell)
    ].filter(Boolean).join(" | ")));
    button.addEventListener("click", () => onSelect(spell, button));
    return button;
}

function getDefaultSpellListKey(spell, playerSheetObject = {}) {
    const level = getSpellRecordLevel(spell, 1);
    if (level === 0) {
        return "cantrips";
    }

    const style = String(getPrimarySpellcasting(playerSheetObject)?.preparationStyle || "").toLowerCase();
    return style.includes("prepared") ? "prepared" : "known";
}

function createSpellSaveEntry(spell) {
    return getSpellName(spell);
}

export function buildSpellSearchModal(context = {}, playerSheetObject = {}) {
    const dialog = document.createElement("dialog");
    dialog.className = "modal player-sheet__modal player-sheet__modal--spell-search";
    dialog.setAttribute("aria-label", "Add Spell");

    const content = createElement("div", "modal-content player-sheet__modal-content");
    const header = createElement("div", "player-sheet__modal-header");
    header.appendChild(createElement("h3", "player-sheet__modal-title", "Add Spell"));

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close player-sheet__modal-close";
    closeButton.textContent = "X";
    closeButton.setAttribute("aria-label", "Close Add Spell");
    closeButton.addEventListener("click", () => dialog.close());
    header.appendChild(closeButton);
    content.appendChild(header);

    const picker = createElement("div", "player-sheet-catalog-picker");
    picker.dataset.mobileView = "results";
    const controls = createElement("div", "player-sheet-catalog-picker__controls");
    const searchInput = document.createElement("input");
    searchInput.className = "player-sheet-input";
    searchInput.type = "search";
    searchInput.placeholder = "Spell name";

    const searchButton = document.createElement("button");
    searchButton.type = "button";
    searchButton.className = "player-sheet-button";
    searchButton.textContent = "Search";
    controls.appendChild(createModalField("Search", searchInput));
    controls.appendChild(searchButton);
    picker.appendChild(controls);

    const extraControls = createElement("div", "player-sheet-catalog-picker__extra-controls");
    const listSelect = document.createElement("select");
    listSelect.className = "player-sheet-select";
    for (const list of SPELL_LISTS) {
        const option = document.createElement("option");
        option.value = list.key;
        option.textContent = list.label;
        listSelect.appendChild(option);
    }
    extraControls.appendChild(createModalField("Add To", listSelect));
    picker.appendChild(extraControls);

    const status = createElement("p", "player-sheet-catalog-picker__status", context.api ? "Search for a spell." : "Spell catalog API client is unavailable.");
    picker.appendChild(status);

    const main = createElement("div", "player-sheet-catalog-picker__main");
    const results = createElement("div", "player-sheet-catalog-picker__results");
    const detail = createElement("div", "player-sheet-catalog-picker__detail");
    detail.appendChild(createElement("p", "player-sheet-empty-state", "Select a spell to preview it."));
    main.appendChild(results);
    main.appendChild(detail);
    picker.appendChild(main);

    const pager = createElement("div", "player-sheet-catalog-picker__pager");
    const loadMoreButton = document.createElement("button");
    loadMoreButton.type = "button";
    loadMoreButton.className = "player-sheet-button";
    loadMoreButton.textContent = "Load More";
    loadMoreButton.hidden = true;
    loadMoreButton.disabled = true;
    loadMoreButton.dataset.spellSearchLoadMore = "true";
    pager.appendChild(loadMoreButton);
    picker.appendChild(pager);

    const footer = createElement("div", "player-sheet-catalog-picker__footer");
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "player-sheet-button player-sheet-button--primary";
    addButton.textContent = "Add Spell";
    addButton.disabled = true;
    footer.appendChild(addButton);
    picker.appendChild(footer);
    content.appendChild(picker);
    dialog.appendChild(content);

    let selectedSpell = null;
    let searchToken = 0;
    let searchTimer = null;
    let activeQuery = "";
    let loadedCount = 0;
    let nextSkip = 0;
    let hasMore = false;
    let loadingPage = false;
    const spellDetailsById = new Map();
    let selectedResultButton = null;

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "player-sheet-button player-sheet-catalog-picker__back";
    backButton.textContent = "Back to results";
    backButton.addEventListener("click", () => {
        picker.dataset.mobileView = "results";
        selectedResultButton?.focus({ preventScroll: true });
    });

    function renderSelectedSpell(spell) {
        detail.replaceChildren(backButton, createSpellCard({
            spell,
            sourceLabel: "Catalog",
            spellcasting: getPrimarySpellcasting(playerSheetObject),
            fallbackLevel: getSpellRecordLevel(spell),
            characterLevel: playerSheetObject.level || 1
        }, spell, {
            badge: "Catalog",
            rows: ["Level", "School", "Casting", "Range", "Duration", "Components", "Save", "Attack", "Damage"]
        }));

        if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 800px)").matches) {
            detail.querySelectorAll(".player-sheet-item-card__rules-details").forEach((rules) => {
                rules.open = true;
            });
        }
    }

    function setStatus(message) {
        status.textContent = message;
    }

    function updatePager() {
        const shouldShow = hasMore || loadingPage;
        loadMoreButton.hidden = !shouldShow;
        loadMoreButton.disabled = loadingPage || !hasMore;
        loadMoreButton.textContent = loadingPage ? "Loading..." : "Load More";
    }

    function setSearchIdleState(message = "Search for a spell.") {
        results.replaceChildren();
        detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select a spell to preview it."));
        selectedSpell = null;
        addButton.disabled = true;
        activeQuery = "";
        loadedCount = 0;
        nextSkip = 0;
        hasMore = false;
        loadingPage = false;
        updatePager();
        setStatus(message);
    }

    async function getFullSpellRecord(spell) {
        const catalogId = getSpellCatalogId(spell);
        if (!catalogId || !context.api) {
            return spell;
        }

        if (!spellDetailsById.has(catalogId)) {
            const catalog = getCatalogCache(context.api);
            spellDetailsById.set(catalogId, catalog.getById("spells", catalogId).then((record) => record || spell));
        }

        return spellDetailsById.get(catalogId);
    }

    async function setSelectedSpell(spell, button = null, options = {}) {
        const token = searchToken;
        selectedSpell = spell;
        selectedResultButton = button;
        results.querySelectorAll(".player-sheet-catalog-result").forEach((resultButton) => {
            resultButton.classList.toggle("player-sheet-catalog-result--selected", resultButton === button);
        });

        if (!spell) {
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select a spell to preview it."));
            addButton.disabled = true;
            return;
        }

        listSelect.value = getDefaultSpellListKey(spell, playerSheetObject);
        renderSelectedSpell(spell);
        if (options.revealDetail !== false) {
            picker.dataset.mobileView = "detail";
            detail.scrollTop = 0;
        }
        addButton.disabled = typeof context.onChange !== "function";

        try {
            const fullSpell = await getFullSpellRecord(spell);
            if (token !== searchToken) {
                return;
            }

            selectedSpell = fullSpell;
            listSelect.value = getDefaultSpellListKey(fullSpell, playerSheetObject);
            renderSelectedSpell(fullSpell);
            if (options.revealDetail !== false) {
                detail.scrollTop = 0;
            }
            addButton.disabled = !selectedSpell || typeof context.onChange !== "function";
        } catch (error) {
            if (token !== searchToken) {
                return;
            }

            console.warn("Spell detail lookup failed:", error);
            selectedSpell = spell;
            addButton.disabled = !selectedSpell || typeof context.onChange !== "function";
        }
    }

    function appendResults(items, { append = false } = {}) {
        if (!append) {
            results.replaceChildren();
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select a spell to preview it."));
            selectedSpell = null;
            addButton.disabled = true;
        }

        if (!items.length && !append) {
            results.appendChild(createElement("p", "player-sheet-empty-state", "No spells found."));
            return;
        }

        for (const spell of items) {
            results.appendChild(buildSpellResultButton(spell, setSelectedSpell));
        }

        const firstButton = !append ? results.querySelector(".player-sheet-catalog-result") : null;
        if (firstButton && items.length) {
            void setSelectedSpell(items[0], firstButton, { revealDetail: false });
        }
    }

    async function loadSearchPage({ append = false } = {}) {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            setSearchIdleState(query ? "Type at least 2 characters." : "Search for a spell.");
            return;
        }

        if (!context.api) {
            setStatus("Spell catalog API client is unavailable.");
            return;
        }

        if (append && (loadingPage || !hasMore || query !== activeQuery)) {
            return;
        }

        const token = searchToken + 1;
        searchToken = token;
        loadingPage = true;
        updatePager();
        if (!append) {
            activeQuery = query;
            loadedCount = 0;
            nextSkip = 0;
            hasMore = false;
            setStatus("Searching spells...");
            results.replaceChildren(createElement("p", "player-sheet-empty-state", "Searching..."));
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select a spell to preview it."));
            selectedSpell = null;
            addButton.disabled = true;
        } else {
            setStatus(`Loading more spells for "${query}"...`);
        }

        try {
            const page = await searchCatalogSpellPage(context.api, query, append ? nextSkip : 0);
            if (token !== searchToken) {
                return;
            }

            appendResults(page.items, { append });
            loadedCount = append ? loadedCount + page.items.length : page.items.length;
            nextSkip = page.nextSkip;
            hasMore = page.hasMore;
            setStatus(hasMore
                ? `${loadedCount} spells shown. Scroll or load more for additional matches.`
                : `${loadedCount} spell${loadedCount === 1 ? "" : "s"} shown.`);
        } catch (error) {
            if (token !== searchToken) {
                return;
            }
            console.error("Spell catalog search failed:", error);
            results.replaceChildren(createElement("p", "player-sheet-empty-state", "Spell search failed."));
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select a spell to preview it."));
            selectedSpell = null;
            addButton.disabled = true;
            setStatus("Spell search failed.");
        } finally {
            if (token === searchToken) {
                loadingPage = false;
                updatePager();
            }
        }
    }

    function runSearch() {
        return loadSearchPage({ append: false });
    }

    function loadMoreResults() {
        return loadSearchPage({ append: true });
    }

    function maybeLoadMoreFromScroll() {
        if (!hasMore || loadingPage) {
            return;
        }

        const remaining = results.scrollHeight - results.scrollTop - results.clientHeight;
        if (remaining <= 64) {
            void loadMoreResults();
        }
    }

    function scheduleSearch() {
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }

        searchTimer = setTimeout(() => {
            searchTimer = null;
            void runSearch();
        }, SPELL_SEARCH_DEBOUNCE_MS);
    }

    searchButton.addEventListener("click", () => {
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }
        void runSearch();
    });
    searchInput.addEventListener("input", scheduleSearch);
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (searchTimer) {
                clearTimeout(searchTimer);
                searchTimer = null;
            }
            void runSearch();
        }
    });
    loadMoreButton.addEventListener("click", () => {
        void loadMoreResults();
    });
    results.addEventListener("scroll", maybeLoadMoreFromScroll);

    addButton.addEventListener("click", async () => {
        if (!selectedSpell || typeof context.onChange !== "function") {
            return;
        }

        const listKey = listSelect.value || getDefaultSpellListKey(selectedSpell, playerSheetObject);
        const currentValues = toArray(PlayerSheetDtoHelper.getValue(context.dto, `spells.${listKey}`, []));
        const nextEntry = createSpellSaveEntry(selectedSpell);
        const exists = currentValues.some((entry) => normalizeSearchText(entry) === normalizeSearchText(nextEntry));
        if (exists) {
            setStatus(`${nextEntry} is already in ${SPELL_LISTS.find((list) => list.key === listKey)?.label || "that list"}.`);
            return;
        }

        const nextDto = PlayerSheetDtoHelper.patch(context.dto, `spells.${listKey}`, [
            ...currentValues,
            nextEntry
        ]);
        await context.onChange(nextDto);
        dialog.close();
    });

    return dialog;
}

function createSpellcastingSummaryCard(title, spellcasting = {}) {
    const card = createElement("article", "player-sheet-info-card player-sheet-spellcasting-card");
    card.appendChild(createElement("h4", "player-sheet-info-card__title", title));
    const rows = [
        ["Ability", spellcasting.ability ? String(spellcasting.ability).toUpperCase() : ""],
        ["Attack", spellcasting.spellAttackBonus != null ? `${toNumber(spellcasting.spellAttackBonus, 0) >= 0 ? "+" : ""}${toNumber(spellcasting.spellAttackBonus, 0)}` : ""],
        ["Save DC", spellcasting.spellSaveDc],
        [spellcasting.knownLabel || "Known", toNumber(spellcasting.spellsKnown, 0) > 0
            ? `${toNumber(spellcasting.selectedKnownCount, 0)} / ${toNumber(spellcasting.spellsKnown, 0)}`
            : ""],
        ["Cantrips", toNumber(spellcasting.cantripsKnown, 0) > 0
            ? `${toNumber(spellcasting.selectedCantripCount, 0)} / ${toNumber(spellcasting.cantripsKnown, 0)}`
            : ""],
        ["Prepared", toNumber(spellcasting.preparedCount, 0) > 0
            ? `${toNumber(spellcasting.selectedPreparedCount, 0)} / ${toNumber(spellcasting.preparedCount, 0)}`
            : ""]
    ].filter(([, value]) => value != null && String(value).trim());

    if (rows.length) {
        card.appendChild(createDefinitionList(rows));
    } else {
        card.appendChild(createElement("p", "player-sheet-info-card__description", "No spellcasting details recorded."));
    }
    return card;
}

function appendSpellcastingSummary(shell, playerSheetObject = {}) {
    const spellcastingCards = [];
    for (const characterClass of toArray(playerSheetObject.classes)) {
        if (characterClass?.spellcasting) {
            spellcastingCards.push(createSpellcastingSummaryCard(characterClass.main || "Class Spellcasting", characterClass.spellcasting));
        }
    }

    for (const [key, title] of [
        ["classChoiceSpells", "Class Feature Spellcasting"],
        ["racialSpells", "Racial Spellcasting"],
        ["featSpells", "Feat Spellcasting"]
    ]) {
        const group = playerSheetObject[key];
        if (group && (toArray(group.cantrips).length || toArray(group.known).length || toArray(group.alwaysPrepared).length || toArray(group.innate).length)) {
            spellcastingCards.push(createSpellcastingSummaryCard(title, group));
        }
    }

    if (!spellcastingCards.length) {
        return;
    }

    const section = createSection("Spellcasting");
    const grid = createCardGrid();
    spellcastingCards.forEach((card) => grid.appendChild(card));
    section.appendChild(grid);
    shell.appendChild(section);
}

function getSpellSlotByLevel(spellSlots = {}, level) {
    const byLevel = spellSlots.byLevel || spellSlots || {};
    const slot = byLevel[String(level)] || {};
    const max = typeof slot === "object" ? toNumber(slot.max, 0) : toNumber(slot, 0);
    const expended = typeof slot === "object" ? toNumber(slot.expended, 0) : 0;
    return {
        max,
        expended,
        available: Math.max(max - expended, 0)
    };
}

function appendSpellSlots(shell, spellSlots = {}) {
    const activeSlots = [];
    for (let level = 1; level <= 9; level += 1) {
        const slot = getSpellSlotByLevel(spellSlots, level);
        if (slot.max > 0 || slot.expended > 0) {
            activeSlots.push({ level, ...slot });
        }
    }

    const section = createSection("Spell Slots");
    if (!activeSlots.length) {
        appendEmptyState(section, "No spell slots recorded.");
        shell.appendChild(section);
        return;
    }

    const grid = createElement("div", "player-sheet-spell-slot-grid");
    for (const slot of activeSlots) {
        const tile = createElement("div", "player-sheet-spell-slot");
        tile.appendChild(createElement("span", "player-sheet-spell-slot__level", ordinal(slot.level)));
        tile.appendChild(createElement("span", "player-sheet-spell-slot__value", `${slot.available} / ${slot.max}`));
        tile.appendChild(createElement("span", "player-sheet-spell-slot__label", "available"));
        grid.appendChild(tile);
    }
    section.appendChild(grid);
    shell.appendChild(section);
}

function createSpellLevelSection(level, spellSlots = {}) {
    const section = createElement("section", "player-sheet-section player-sheet-spell-level-section");
    const heading = createElement("div", "player-sheet-spell-level-section__heading");
    const title = level === 0 ? "Cantrips" : `${ordinal(level)}-Level Spells`;
    heading.appendChild(createElement("h4", "player-sheet-section__title", title));
    if (level > 0) {
        const slot = getSpellSlotByLevel(spellSlots, level);
        heading.appendChild(createElement("span", "player-sheet-spell-level-section__slots", `Slots ${slot.available} / ${slot.max}`));
    }
    section.appendChild(heading);
    return section;
}

function groupSpellEntriesByLevel(entries = []) {
    const groups = new Map(SPELL_LEVELS.map((level) => [level, []]));
    for (const entry of entries) {
        const level = Math.max(0, Math.min(9, toNumber(entry.level, entry.fallbackLevel)));
        if (!groups.has(level)) {
            groups.set(level, []);
        }
        groups.get(level).push(entry);
    }

    for (const group of groups.values()) {
        group.sort((left, right) => getSpellName(left.spell).localeCompare(getSpellName(right.spell), undefined, { sensitivity: "base" }));
    }

    return groups;
}

async function appendSpellLevelLists(shell, playerSheetObject = {}, context = {}) {
    const section = createSection("Spell List");
    const entries = await resolveSpellEntries(playerSheetObject, context);
    const groups = groupSpellEntriesByLevel(entries);

    for (const level of SPELL_LEVELS) {
        const levelSection = createSpellLevelSection(level, playerSheetObject.spellSlots || {});
        const spells = groups.get(level) || [];
        if (!spells.length) {
            appendEmptyState(levelSection, "No spells recorded at this level.");
            section.appendChild(levelSection);
            continue;
        }

        const list = createItemList();
        for (const entry of spells) {
            list.appendChild(createSpellListItem(entry, entry.record, {
                actions: [createRemoveSpellButton(entry, context)]
            }));
        }
        levelSection.appendChild(list);
        section.appendChild(levelSection);
    }

    shell.appendChild(section);
}

export async function BuildPlayerSheetSpellsTab(playerSheetObject, context = {}) {
    const shell = createTabShell("Spells");
    const header = shell.querySelector(".player-sheet-tab__header");

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "player-sheet-button player-sheet-button--primary";
    addButton.textContent = "Add Spell";
    header.appendChild(addButton);

    const modal = buildSpellSearchModal(context, playerSheetObject);
    addButton.addEventListener("click", () => {
        if (typeof modal.showModal === "function") {
            modal.showModal();
        }
    });
    shell.appendChild(modal);

    appendSpellcastingSummary(shell, playerSheetObject);
    appendSpellSlots(shell, playerSheetObject?.spellSlots || {});
    await appendSpellLevelLists(shell, playerSheetObject, context);
}
