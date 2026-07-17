import {
    appendRulesEntry,
    createElement
} from "../PlayerSheetHtmlHelper.js";
import { PlayerSheetDtoHelper } from "../PlayerSheetDtoHelper.js";
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

const DAMAGE_TYPE_LABELS = {
    A: "acid",
    B: "bludgeoning",
    C: "cold",
    F: "fire",
    O: "force",
    L: "lightning",
    N: "necrotic",
    P: "piercing",
    I: "poison",
    Y: "psychic",
    R: "radiant",
    S: "slashing",
    T: "thunder"
};

const ITEM_PROPERTY_LABELS = {
    A: "Ammunition",
    AF: "Ammunition",
    BF: "Burst Fire",
    F: "Finesse",
    H: "Heavy",
    L: "Light",
    LD: "Loading",
    M: "Melee",
    R: "Reach",
    RLD: "Reload",
    S: "Special",
    T: "Thrown",
    V: "Versatile",
    "2H": "Two-Handed"
};

const ITEM_RULES_PREVIEW_LIMIT = 250;

function cloneValue(value) {
    if (value == null) {
        return value;
    }

    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

export function getTabContentContainer() {
    return document.querySelector("#TabContent");
}

export function createTabShell(title) {
    const tabContentContainer = getTabContentContainer();
    const shell = createElement("section", "player-sheet-tab");
    const header = createElement("div", "player-sheet-tab__header");
    header.appendChild(createElement("h3", "player-sheet-tab__title", title));
    shell.appendChild(header);

    if (tabContentContainer) {
        tabContentContainer.replaceChildren(shell);
    }

    return shell;
}

export function appendEmptyState(container, text) {
    container.appendChild(createElement("p", "player-sheet-empty-state", text));
}

export function createCardGrid() {
    return createElement("div", "player-sheet-card-grid");
}

export function createItemList() {
    return createElement("div", "player-sheet-item-list");
}

export function createSection(title) {
    const section = createElement("section", "player-sheet-section");
    section.appendChild(createElement("h4", "player-sheet-section__title", title));
    return section;
}

export function appendPillList(container, values = []) {
    const normalizedValues = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!normalizedValues.length) {
        return;
    }

    const pillList = createElement("div", "player-sheet-pill-list");
    for (const value of normalizedValues) {
        pillList.appendChild(createElement("span", "player-sheet-pill", value));
    }
    container.appendChild(pillList);
}

export function formatQuantityTags(item) {
    const tags = [];
    const quantity = Math.max(toNumber(item?.quantity, 1), 1);
    if (quantity > 1) {
        tags.push(`x${quantity}`);
    }
    if (item?.equipped) {
        tags.push("Equipped");
    }
    if (item?.attuned || item?.attunement) {
        tags.push("Attuned");
    }
    return tags;
}

function uniqueDisplayTexts(values) {
    const seen = new Set();
    const unique = [];
    for (const value of values) {
        const text = String(value || "").trim();
        if (!text) {
            continue;
        }

        const key = text.toLowerCase();
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        unique.push(text);
    }
    return unique;
}

function formatItemPropertyTag(value) {
    const text = String(value || "").trim();
    if (!text) {
        return "";
    }

    return ITEM_PROPERTY_LABELS[text.toUpperCase()] || titleCase(text);
}

export function getItemTagTexts(item, record = getItemRecord(item), options = {}) {
    const quantityTags = formatQuantityTags(item)
        .filter((tag) => options.includeEquipped !== false || tag !== "Equipped");

    return uniqueDisplayTexts([
        ...quantityTags,
        record?.weaponCategory ? titleCase(record.weaponCategory) : "",
        ...toArray(record?._fProperties).map(titleCase),
        ...toArray(record?.property).map(formatItemPropertyTag)
    ]);
}

function stripHtml(value) {
    return String(value || "").replace(/<[^>]*>/gu, " ");
}

function flattenRulesText(value, depth = 0) {
    if (value == null || depth > 4) {
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
            .filter(([key]) => !key.startsWith("_") || ["_typeListText", "_fProperties", "_fDamageDice", "_fBonus", "_fAc", "_fRes", "_fImm", "_fCondImm", "_fullEntries"].includes(key))
            .map(([, entry]) => flattenRulesText(entry, depth + 1))
            .filter(Boolean)
            .join(" ");
    }

    return "";
}

function getItemTypeText(record) {
    return [
        record?.type,
        record?.typeCode,
        record?._typeHtml,
        record?._subTypeHtml,
        ...toArray(record?._typeListText)
    ].map(stripHtml).join(" ");
}

function hasNonEmptyList(value) {
    return toArray(value).filter(Boolean).length > 0;
}

export function getItemDisplayName(item, fallback = "Unknown Item") {
    return item?.name
        || item?.catalog?.name
        || item?.snapshot?.name
        || getCatalogDisplayName(item?.snapshot, fallback)
        || fallback;
}

export function getItemSource(item) {
    return item?.source
        || item?.catalog?.source
        || getCatalogSource(item?.snapshot)
        || "";
}

export function getItemRecord(item) {
    return item?.snapshot && typeof item.snapshot === "object"
        ? item.snapshot
        : item;
}

export function getDamageTypeLabel(value) {
    const text = String(value || "").trim();
    return DAMAGE_TYPE_LABELS[text.toUpperCase()] || text;
}

function parseItemBonus(value) {
    if (value == null || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const match = String(value).match(/[+-]?\d+/u);
    return match ? toNumber(match[0], 0) : null;
}

function getFirstItemBonus(candidates = []) {
    for (const candidate of candidates) {
        const bonus = parseItemBonus(candidate);
        if (bonus != null) {
            return bonus;
        }
    }

    return 0;
}

export function getItemWeaponAttackBonus(record = {}) {
    return getFirstItemBonus([
        record.bonusWeaponAttack,
        record.bonuses?.bonusWeaponAttack,
        record.weapon?.bonuses?.bonusWeaponAttack,
        record.raw?.bonusWeaponAttack,
        record.bonusWeapon,
        record.bonuses?.bonusWeapon,
        record.weapon?.bonuses?.bonusWeapon,
        record.raw?.bonusWeapon
    ]);
}

export function getItemWeaponDamageBonus(record = {}) {
    return getFirstItemBonus([
        record.bonusWeaponDamage,
        record.bonuses?.bonusWeaponDamage,
        record.weapon?.bonuses?.bonusWeaponDamage,
        record.raw?.bonusWeaponDamage,
        record.bonusWeapon,
        record.bonuses?.bonusWeapon,
        record.weapon?.bonuses?.bonusWeapon,
        record.raw?.bonusWeapon
    ]);
}

function formatSignedBonus(value) {
    const bonus = toNumber(value, 0);
    return `${bonus >= 0 ? "+" : "-"}${Math.abs(bonus)}`;
}

export function getItemDamageDice(record = {}, mode = "primary") {
    if (mode === "versatile") {
        return record?.dmg2 || record?.weapon?.damage?.versatile || "";
    }

    return record?.dmg1 || record?.weapon?.damage?.primary || "";
}

export function getItemDamageType(record = {}) {
    return record?.dmgType
        || record?.damageType
        || record?.weapon?.damage?.type?.code
        || record?.weapon?.damage?.type?.name
        || "";
}

export function formatDamageDiceWithBonus(dice, record = {}) {
    const text = String(dice || "").trim();
    const bonus = getItemWeaponDamageBonus(record);
    if (!text || !bonus || /(?:^|\s)[+-]\s*\d+\b/u.test(text)) {
        return text;
    }

    return `${text} ${formatSignedBonus(bonus)}`;
}

export function getItemDetailRows(item, record = getItemRecord(item)) {
    const damageType = getItemDamageType(record);
    const damage = [
        formatDamageDiceWithBonus(getItemDamageDice(record), record),
        getDamageTypeLabel(damageType)
    ].filter(Boolean).join(" ");
    const versatileDice = getItemDamageDice(record, "versatile");
    const versatileDamage = versatileDice
        ? `${formatDamageDiceWithBonus(versatileDice, record)} ${getDamageTypeLabel(damageType)}`.trim()
        : "";
    const ac = record?.ac ?? record?._fAc ?? record?.armor?.ac;
    const weight = record?.weight ?? item?.weight;

    return [
        ["Type", getItemTypeText(record) || titleCase(record?.category || record?._category || "")],
        ["Source", getItemSource(item) || getCatalogSource(record)],
        ["Rarity", titleCase(record?.rarity || "")],
        ["Damage", damage],
        ["Versatile", versatileDamage],
        ["AC", ac != null ? String(ac) : ""],
        ["Value", record?.valueLabel || record?._l_value || ""],
        ["Weight", weight != null ? `${weight} lb.` : ""],
        ["Attunement", record?.attunement || record?.reqAttune || record?._attunement || ""]
    ].filter(([, value]) => value != null && String(value).trim());
}

export function createDefinitionList(rows) {
    const list = createElement("dl", "player-sheet-definition-list");
    for (const [label, value] of rows) {
        const term = createElement("dt", "", label);
        const detail = createElement("dd", "", String(value));
        list.appendChild(term);
        list.appendChild(detail);
    }
    return list;
}

function itemMatchesOffenseText(record) {
    const text = normalizeSearchText(flattenRulesText([
        record?.entries,
        record?._fullEntries,
        record?._fProperties,
        record?._fBonus
    ]));

    return /\bweapon attack\b|\battack roll\b|\bdamage roll\b|\branged attack\b|\bmelee attack\b|\bdamage dice\b/u.test(text)
        || /\bdeals?\s+\d*d?\d+\s+\w*\s*damage\b/u.test(text);
}

export function isOffensiveGearItem(record) {
    if (!record || typeof record !== "object") {
        return false;
    }

    const typeText = normalizeSearchText(getItemTypeText(record));
    const bonusText = normalizeSearchText(toArray(record?._fBonus).join(" "));

    return record.isWeapon === true
        || record.weapon === true
        || Boolean(record.weaponCategory || record.weapon?.category || record.dmg1 || record.dmg2 || record.dmgType)
        || hasNonEmptyList(record?._fDamageDice)
        || /\bweapon\b|\bammunition\b|\bfirearm\b/u.test(typeText)
        || /\bweapon\b/u.test(bonusText)
        || itemMatchesOffenseText(record);
}

function itemMatchesDefenseText(record) {
    const text = normalizeSearchText(flattenRulesText([
        record?.entries,
        record?._fullEntries,
        record?._fAc,
        record?._fRes,
        record?._fImm,
        record?._fCondImm
    ]));

    return /\barmor class\b|\bac\b|\bresistance\b|\bresistant\b|\bimmunity\b|\bimmune\b|\bsaving throws?\b|\bprotect\b|\bdefense\b/u.test(text);
}

export function isDefensiveGearItem(record) {
    if (!record || typeof record !== "object") {
        return false;
    }

    const typeText = normalizeSearchText(getItemTypeText(record));
    const armorLike = record.isArmor === true
        || record.armor === true
        || (record.armor != null && typeof record.armor === "object")
        || record.ac != null
        || record._fAc != null
        || /\barmor\b|\bshield\b/u.test(typeText);
    const weaponLike = record.isWeapon === true
        || record.weapon === true
        || Boolean(record.weaponCategory || record.weapon?.category || record.dmg1 || record.dmg2 || record.dmgType)
        || /\bweapon\b|\bammunition\b|\bfirearm\b/u.test(typeText);

    if (weaponLike && !armorLike) {
        return false;
    }

    return armorLike
        || hasNonEmptyList(record?._fRes)
        || hasNonEmptyList(record?._fImm)
        || hasNonEmptyList(record?._fCondImm)
        || itemMatchesDefenseText(record);
}

async function resolveInventoryCatalogRecord(item, api) {
    const snapshot = item?.snapshot;
    if (snapshot && typeof snapshot === "object") {
        return snapshot;
    }

    if (!api) {
        return getItemRecord(item);
    }

    const catalog = getCatalogCache(api);
    const identity = item?.catalog;
    const catalogId = identity?.options?.catalogId || identity?.catalogId || identity?.id || "";
    const catalogName = identity?.name || item?.name || "";
    const catalogSource = identity?.source || item?.source || "";
    try {
        if (catalogId) {
            const catalogRecord = await catalog.getById("items", catalogId);
            if (catalogRecord) {
                return catalogRecord;
            }
        }

        if (catalogName) {
            const catalogRecord = await catalog.getByName("items", catalogName, catalogSource, { limit: 30 });
            if (catalogRecord) {
                return catalogRecord;
            }
        }
    } catch (error) {
        console.warn("Item catalog lookup failed:", error);
    }

    return getItemRecord(item);
}

export async function resolveInventoryItems(playerSheetObject, api) {
    const carried = toArray(playerSheetObject?.inventory?.carried);
    return Promise.all(carried.map(async (item, index) => {
        const record = await resolveInventoryCatalogRecord(item, api);
        return {
            item,
            inventoryIndex: Number.isInteger(item?.inventoryIndex) ? item.inventoryIndex : index,
            record,
            offensive: isOffensiveGearItem(record),
            defensive: isDefensiveGearItem(record)
        };
    }));
}

function getItemArmorBonus(record = {}) {
    return getFirstItemBonus([
        record.bonuses?.bonusAc,
        record.armor?.bonuses?.bonusAc,
        record.bonusAc,
        record.raw?.bonusAc
    ]);
}

function replaceItemRuleTokens(text, record) {
    const weaponBonus = getItemWeaponAttackBonus(record) || getItemWeaponDamageBonus(record);
    const armorBonus = getItemArmorBonus(record);
    return String(text || "")
        .replace(/\{=bonusWeapon\}/gu, weaponBonus ? formatSignedBonus(weaponBonus) : "")
        .replace(/\{=bonusAc\}/gu, armorBonus ? formatSignedBonus(armorBonus) : "");
}

function applyItemRuleTokens(value, record) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return replaceItemRuleTokens(value, record);
    }

    if (Array.isArray(value)) {
        return value.map((entry) => applyItemRuleTokens(entry, record));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, applyItemRuleTokens(entry, record)])
        );
    }

    return value;
}

function getItemRulesEntry(record) {
    const entries = toArray(record?.entries).length ? toArray(record.entries) : toArray(record?._fullEntries);
    const ruleEntries = entries
        .filter((entry) => typeof entry === "string" || entry?.entries || entry?.items || entry?.wrapped || entry?.type || entry?.name)
        .map((entry) => applyItemRuleTokens(entry?.wrapped || entry, record));

    return ruleEntries.length ? ruleEntries : null;
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

function createRulesPreviewText(rulesEntry, limit = ITEM_RULES_PREVIEW_LIMIT) {
    const fullText = formatRulesText(flattenRulesText(rulesEntry));
    if (!fullText) {
        return {
            text: "",
            truncated: false
        };
    }

    if (fullText.length <= limit) {
        return {
            text: fullText,
            truncated: false
        };
    }

    return {
        text: `${fullText.slice(0, limit).trimEnd()}...`,
        truncated: true
    };
}

function appendItemRules(container, record, options = {}) {
    const rulesEntry = getItemRulesEntry(record);
    if (!rulesEntry) {
        return;
    }

    const preview = createRulesPreviewText(rulesEntry, options.previewLimit ?? ITEM_RULES_PREVIEW_LIMIT);
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

export function createItemCard(item, record = getItemRecord(item), options = {}) {
    const card = createElement("article", "player-sheet-item-card");
    if (options.compact) {
        card.classList.add("player-sheet-item-card--compact");
    }
    const header = createElement("div", "player-sheet-item-card__header");
    const titleArea = createElement("div", "player-sheet-item-card__title-area");
    titleArea.appendChild(createElement("h4", "player-sheet-item-card__title", getItemDisplayName(item)));

    const meta = [
        getItemSource(item) || getCatalogSource(record),
        titleCase(record?.rarity || "")
    ].filter(Boolean).join(" | ");
    if (meta) {
        titleArea.appendChild(createElement("p", "player-sheet-item-card__meta", meta));
    }

    header.appendChild(titleArea);
    if (options.badge) {
        header.appendChild(createElement("span", "player-sheet-item-card__badge", options.badge));
    }
    card.appendChild(header);

    appendPillList(card, getItemTagTexts(item, record));

    const rows = getItemDetailRows(item, record)
        .filter(([label]) => options.rows == null || options.rows.includes(label));
    if (rows.length) {
        card.appendChild(createDefinitionList(rows));
    }

    if (options.showRules !== false) {
        appendItemRules(card, record);
    }

    return card;
}

export function createEquipToggle(item, inventoryIndex, context = {}) {
    const label = createElement("label", "player-sheet-equip-toggle");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(item?.equipped);
    input.disabled = !Number.isInteger(inventoryIndex) || typeof context.onChange !== "function";
    input.setAttribute("aria-label", `${input.checked ? "Unequip" : "Equip"} ${getItemDisplayName(item)}`);

    const labelText = createElement("span", "player-sheet-equip-toggle__label", input.checked ? "Equipped" : "Equip");

    input.addEventListener("change", async () => {
        const nextEquipped = input.checked;
        input.disabled = true;
        labelText.textContent = nextEquipped ? "Equipped" : "Equip";
        input.setAttribute("aria-label", `${nextEquipped ? "Unequip" : "Equip"} ${getItemDisplayName(item)}`);

        try {
            const currentItems = PlayerSheetDtoHelper.getValue(context.dto, "inventory.items", []);
            const nextItems = currentItems.map((entry, index) => index === inventoryIndex
                ? {
                    ...entry,
                    equipped: nextEquipped
                }
                : entry);
            const nextDto = PlayerSheetDtoHelper.patch(context.dto, "inventory.items", nextItems);
            await context.onChange(nextDto);
        } catch (error) {
            console.error("Failed to update equipped state:", error);
            input.checked = !nextEquipped;
            labelText.textContent = input.checked ? "Equipped" : "Equip";
            input.setAttribute("aria-label", `${input.checked ? "Unequip" : "Equip"} ${getItemDisplayName(item)}`);
            input.disabled = false;
        }
    });

    label.appendChild(input);
    label.appendChild(labelText);
    return label;
}

export function createItemListItem(item, record = getItemRecord(item), options = {}) {
    const row = createElement("article", "player-sheet-item-row");
    const summary = createElement("div", "player-sheet-item-row__summary");
    const identity = createElement("div", "player-sheet-item-row__identity");
    const titleLine = createElement("div", "player-sheet-item-row__title-line");
    titleLine.appendChild(createElement("h4", "player-sheet-item-row__title", getItemDisplayName(item)));

    const actions = Array.isArray(options.actions)
        ? options.actions.filter(Boolean)
        : options.actions ? [options.actions] : [];
    if (actions.length) {
        const actionList = createElement("div", "player-sheet-item-row__actions");
        for (const action of actions) {
            actionList.appendChild(action);
        }
        titleLine.appendChild(actionList);
    }

    identity.appendChild(titleLine);

    const meta = [
        getItemSource(item) || getCatalogSource(record),
        titleCase(record?.rarity || "")
    ].filter(Boolean).join(" | ");
    if (options.showMeta === true && meta) {
        identity.appendChild(createElement("p", "player-sheet-item-row__meta", meta));
    }

    const tags = getItemTagTexts(item, record, {
        includeEquipped: !actions.length
    });
    if (tags.length) {
        const tagList = createElement("div", "player-sheet-item-row__tags");
        for (const tag of tags) {
            tagList.appendChild(createElement("span", "player-sheet-item-row__tag", tag));
        }
        identity.appendChild(tagList);
    }

    if (options.showRules !== false) {
        const rules = createElement("div", "player-sheet-item-row__rules");
        appendItemRules(rules, record, {
            compact: true,
            previewLimit: ITEM_RULES_PREVIEW_LIMIT
        });
        if (rules.children.length) {
            identity.appendChild(rules);
        }
    }

    summary.appendChild(identity);

    const detailMetrics = Array.isArray(options.rows)
        ? getItemDetailRows(item, record)
            .filter(([label]) => options.rows.includes(label))
            .map(([label, value]) => ({ label, value }))
        : [];

    const metrics = [
        ...toArray(options.metrics).map(normalizeItemMetric),
        ...detailMetrics,
        ...toArray(options.stats).map(normalizeItemMetric)
    ].filter((metric) => metric && metric.value != null && String(metric.value).trim());

    if (metrics.length) {
        const metricList = createElement("div", "player-sheet-item-row__metrics");
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

function normalizeItemMetric(metric) {
    if (Array.isArray(metric)) {
        return { label: metric[0], value: metric[1] };
    }

    if (metric && typeof metric === "object") {
        return { label: metric.label || metric.name || "", value: metric.value ?? metric.text ?? "" };
    }

    const text = String(metric || "").trim();
    const parts = text.split(":");
    if (parts.length > 1) {
        return {
            label: parts.shift().trim(),
            value: parts.join(":").trim()
        };
    }

    return { label: "", value: text };
}

export function getCatalogItemId(item) {
    return String(item?.id || item?.refId || item?.sourceId || item?.ref || "")
        .trim()
        .replace(/\.json$/iu, "");
}

export function createInventoryItemFromCatalog(item, options = {}) {
    const name = getCatalogDisplayName(item, "");
    const source = getCatalogSource(item);
    const catalogId = getCatalogItemId(item);
    const catalog = {
        kind: "items",
        name,
        source
    };

    if (catalogId) {
        catalog.id = catalogId;
    }

    return {
        name,
        source,
        quantity: Math.max(toNumber(options.quantity, 1), 1),
        equipped: Boolean(options.equipped),
        attuned: Boolean(options.attuned),
        catalog,
        snapshot: item && typeof item === "object" ? cloneValue(item) : null
    };
}
