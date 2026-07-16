import {
    formatRulesText,
    formatRefName,
    getCatalogCache,
    getCatalogDisplayName,
    getCatalogSource,
    normalizeSearchText,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";

const ABILITY_OPTIONS = [
    { value: "str", label: "Strength" },
    { value: "dex", label: "Dexterity" },
    { value: "con", label: "Constitution" },
    { value: "int", label: "Intelligence" },
    { value: "wis", label: "Wisdom" },
    { value: "cha", label: "Charisma" }
];

const RAW_PROFICIENCY_FIELDS = {
    armor: "armorProficiencies",
    weapons: "weaponProficiencies",
    tools: "toolProficiencies",
    skills: "skillProficiencies",
    languages: "languageProficiencies",
    feats: "feats"
};

const DAMAGE_TYPE_OPTIONS = new Set([
    "acid",
    "bludgeoning",
    "cold",
    "fire",
    "force",
    "lightning",
    "necrotic",
    "piercing",
    "poison",
    "psychic",
    "radiant",
    "slashing",
    "thunder"
]);

function getIdentityName(identity) {
    if (identity?.options?.displayName) {
        return identity.options.displayName;
    }

    if (identity?.name && identity?.subrace) {
        return `${identity.name} ${identity.subrace}`;
    }

    return identity?.name
        || identity?.main
        || identity?.className
        || getCatalogDisplayName(identity, "")
        || formatRefName(identity?.ref || identity?.id);
}

function getIdentityNameCandidates(identity) {
    const candidates = [
        identity?.options?.displayName,
        identity?.name && identity?.subrace ? `${identity.name} ${identity.subrace}` : "",
        identity?.name && identity?.subrace ? `${identity.name} (${identity.subrace})` : "",
        identity?.name,
        identity?.main,
        identity?.className,
        getCatalogDisplayName(identity, ""),
        formatRefName(identity?.main || identity?.ref || identity?.id)
    ];
    return [...new Set(candidates.map((value) => String(value || "").trim()).filter(Boolean))];
}

function canUseIdentityIdForKind(kind, id) {
    const normalizedKind = normalizeSearchText(kind);
    const text = String(id || "").trim();
    if (!text) {
        return false;
    }

    if (["backgrounds", "classes", "class-features", "feats", "optional-features", "subclasses", "subclass-features"].includes(normalizedKind)) {
        return text.includes(":");
    }

    return true;
}

function getIdentityIds(identity, kind) {
    return [
        identity?.options?.catalogId,
        identity?.catalogId,
        identity?.id
    ]
        .map((value) => String(value || "").trim())
        .filter((value) => canUseIdentityIdForKind(kind, value))
        .filter(Boolean);
}

function shouldUseInlineRecord(identity) {
    return Boolean(
        identity
        && typeof identity === "object"
        && (
            toArray(identity.choiceDefinitions).length
            || toArray(identity.choices).length
            || identity.grants
            || identity.startingProficiencies
            || toArray(identity.classFeatures).length
            || toArray(identity.featureRefs).length
            || toArray(identity.features).length
            || toArray(identity.entries).length
        )
    );
}

export function getCatalogRecordKey(record) {
    return normalizeSearchText([
        record?.kind,
        record?.id,
        record?.ref,
        record?.refId,
        record?.sourceId,
        getCatalogDisplayName(record, ""),
        getCatalogSource(record)
    ].filter(Boolean).join("|"));
}

export function appendCatalogRecord(records, record) {
    if (!record || typeof record !== "object") {
        return;
    }

    const key = getCatalogRecordKey(record);
    if (key && records.some((existing) => getCatalogRecordKey(existing) === key)) {
        return;
    }

    records.push(record);
}

export async function resolveCatalogEntity(context, kind, identity, options = {}) {
    if (!identity) {
        return null;
    }

    const catalog = options.catalog || getCatalogCache(context?.api);
    if (!catalog) {
        return options.fallbackIdentity === false && !shouldUseInlineRecord(identity) ? null : identity;
    }

    for (const id of getIdentityIds(identity, kind)) {
        try {
            const record = await catalog.getById(kind, id);
            if (record) {
                return record;
            }
        } catch (_error) {
            // Try the next structured identity key.
        }
    }

    if (options.allowNameLookup === true) {
        for (const name of getIdentityNameCandidates(identity)) {
            try {
                const record = await catalog.getByName(kind, name, identity.source || "", { limit: options.limit || 30 });
                if (record) {
                    return record;
                }
            } catch (_error) {
                // Use the next structured name/source candidate.
            }
        }
    }

    return options.fallbackIdentity === false && !shouldUseInlineRecord(identity) ? null : identity;
}

function getFeatureCatalogKinds(identity, options = {}) {
    if (toArray(options.featureKinds).length) {
        return toArray(options.featureKinds);
    }

    const text = normalizeSearchText([
        identity?.kind,
        identity?.id,
        identity?.ref,
        identity?.refId,
        identity?.sourceId
    ].filter(Boolean).join(" "));

    if (text.includes("subclass-feature") || text.includes("subclassfeatures")) {
        return ["subclass-features", "class-features"];
    }

    if (text.includes("class-feature") || text.includes("classfeatures")) {
        return ["class-features", "subclass-features"];
    }

    return ["class-features", "subclass-features"];
}

export async function resolveCatalogFeatureEntity(context, identity, options = {}) {
    for (const kind of getFeatureCatalogKinds(identity, options)) {
        const feature = await resolveCatalogEntity(context, kind, identity, {
            ...options,
            fallbackIdentity: false
        });
        if (feature) {
            return feature;
        }
    }

    return options.fallbackIdentity === false && !shouldUseInlineRecord(identity) ? null : identity;
}

function levelMatches(ref, classLevel) {
    if (classLevel == null || classLevel === "") {
        return true;
    }

    const refLevel = toNumber(ref?.level, 0);
    return !refLevel || refLevel === toNumber(classLevel, 0);
}

export function getLinkedFeatureRefs(entity, options = {}) {
    const refs = [
        ...toArray(entity?.featureRefs),
        ...toArray(entity?.features),
        ...toArray(entity?.raceFeatures),
        ...toArray(entity?.backgroundFeatures)
    ];

    for (const feature of toArray(entity?.classFeatures)) {
        if (levelMatches(feature, options.classLevel)) {
            refs.push(feature);
        }
    }

    for (const feature of toArray(entity?.subclassFeatures)) {
        if (levelMatches(feature, options.classLevel)) {
            refs.push(feature);
        }
    }

    function catalogSlug(value) {
        return String(value || "")
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/gu, "")
            .replace(/['’]/gu, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/gu, "-")
            .replace(/^-+|-+$/gu, "");
    }

    function createNestedRefIdentity(type, rawRef) {
        const parts = String(rawRef || "").split("|");
        const name = parts[0] || "";
        const className = parts[1] || "";
        if (!name || !className) {
            return null;
        }

        if (type === "refSubclassFeature") {
            const subclassName = parts[3] || "";
            const source = parts[4] || entity?.source || parts[2] || "PHB";
            const level = parts[5] || "";
            const id = subclassName && level
                ? `subclass-feature:${catalogSlug(className)}-${catalogSlug(subclassName)}-${catalogSlug(name)}-${level}:${catalogSlug(source)}`
                : "";
            return { id, name, ref: rawRef, source, kind: "subclass-feature" };
        }

        const source = parts[2] || entity?.source || "PHB";
        const level = parts[3] || "";
        const id = level
            ? `class-feature:${catalogSlug(className)}-${catalogSlug(name)}-${level}:${catalogSlug(source)}`
            : "";
        return { id, name, ref: rawRef, source, kind: "class-feature" };
    }

    function collectNestedRefs(value) {
        if (Array.isArray(value)) {
            value.forEach(collectNestedRefs);
            return;
        }
        if (!value || typeof value !== "object") {
            return;
        }
        if (["refClassFeature", "refSubclassFeature"].includes(value.type)) {
            const rawRef = value.type === "refSubclassFeature" ? value.subclassFeature : value.classFeature;
            const identity = createNestedRefIdentity(value.type, rawRef);
            if (identity) refs.push(identity);
            return;
        }
        for (const [key, nested] of Object.entries(value)) {
            if (["refClassFeature", "refSubclassFeature"].includes(key) && typeof nested === "string") {
                const identity = createNestedRefIdentity(key, nested);
                if (identity) refs.push(identity);
                continue;
            }
            collectNestedRefs(nested);
        }
    }
    collectNestedRefs(entity?.entries);
    collectNestedRefs(entity?.raw?.entries);

    return refs.filter(Boolean);
}

export async function expandCatalogRecords(context, rootRecords, options = {}) {
    const records = [];
    const queue = [];

    for (const record of toArray(rootRecords)) {
        appendCatalogRecord(records, record);
        queue.push(record);
    }

    if (!options.includeLinkedFeatures) {
        return records;
    }

    while (queue.length) {
        const current = queue.shift();
        for (const ref of getLinkedFeatureRefs(current, options)) {
            const feature = await resolveCatalogFeatureEntity(context, ref, {
                fallbackIdentity: false,
                featureKinds: options.featureKinds,
                allowNameLookup: true,
                limit: options.limit || 30
            });
            const before = records.length;
            appendCatalogRecord(records, feature);
            if (records.length > before && options.recursive !== false) {
                queue.push(feature);
            }
        }
    }

    return records;
}

function cloneChoice(choice) {
    return {
        ...choice,
        patterns: toArray(choice?.patterns).map((pattern) => (
            pattern && typeof pattern === "object" ? { ...pattern } : pattern
        )),
        options: toArray(choice?.options).map((option) => (
            option && typeof option === "object" ? { ...option } : option
        ))
    };
}

function getRawStructuredEntries(entity, fieldName) {
    const asEntries = (value) => {
        if (Array.isArray(value)) {
            return value;
        }
        return value && typeof value === "object" ? [value] : [];
    };
    return [
        ...asEntries(entity?.[fieldName]),
        ...asEntries(entity?.raw?.[fieldName])
    ];
}

function getRawEntityChoiceId(entity, key, index) {
    return `${entity?.id || entity?.ref || entity?.sourceId || getCatalogDisplayName(entity, "entity")}:${key}:${index}`;
}

function normalizeRawChoiceKey(key) {
    if (key === "anyStandard") {
        return "anyStandard";
    }

    return String(key || "")
        .replace(/([a-z])([A-Z])/gu, "$1 $2")
        .trim();
}

function normalizeChoiceType(value) {
    return normalizeSearchText(value).replace(/[^a-z0-9]+/gu, "");
}

function addRawStructuredGrantEntry(group, entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return;
    }

    if (entry.choose && typeof entry.choose === "object") {
        group.choices.push({
            from: toArray(entry.choose.from || entry.choose.options).map(normalizeRawChoiceKey),
            count: Math.max(toNumber(entry.choose.count, 1), 1)
        });
    }

    for (const [key, value] of Object.entries(entry)) {
        if (key === "choose") {
            continue;
        }

        if (value === true) {
            group.fixed.push(normalizeRawChoiceKey(key));
            continue;
        }

        const count = toNumber(value, 0);
        if (count > 0) {
            group.choices.push({
                from: [normalizeRawChoiceKey(key)],
                count
            });
        }
    }
}

function getRawStructuredGrantGroup(entity, grantKey) {
    const fieldName = RAW_PROFICIENCY_FIELDS[grantKey];
    const group = { fixed: [], choices: [] };
    if (!fieldName) {
        return group;
    }

    for (const entry of getRawStructuredEntries(entity, fieldName)) {
        addRawStructuredGrantEntry(group, entry);
    }

    return group;
}

const ABILITY_VALUE_SET = new Set(ABILITY_OPTIONS.map((option) => option.value));

function normalizeAbilityValue(value) {
    const key = String(value || "").trim().toLowerCase();
    return ABILITY_VALUE_SET.has(key) ? key : "";
}

// The raw `ability` block can be present both at the top level and mirrored
// under `raw.ability`, so collapse identical entries before reasoning about how
// many alternative schemes the race actually offers.
function getRawAbilityEntries(entity) {
    const seen = new Set();
    const entries = [];

    for (const entry of getRawStructuredEntries(entity, "ability")) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            continue;
        }

        const key = JSON.stringify(entry);
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        entries.push(entry);
    }

    return entries;
}

function mapAbilityOptions(values) {
    const seen = new Set();
    const options = [];

    for (const value of toArray(values)) {
        const ability = normalizeAbilityValue(value);
        if (!ability || seen.has(ability)) {
            continue;
        }

        seen.add(ability);
        options.push(ABILITY_OPTIONS.find((option) => option.value === ability));
    }

    return options;
}

// A `weighted` block lists one weight per assignable slot (e.g. [2, 1] means a
// +2 and a +1). Collapse equal weights into a single group so the picker can
// render "+2 (choose 1)" / "+1 (choose 2)" style controls.
function buildWeightedGroups(weights) {
    const counts = new Map();

    for (const weight of toArray(weights)) {
        const amount = Math.max(toNumber(weight, 1), 1);
        counts.set(amount, (counts.get(amount) || 0) + 1);
    }

    return [...counts.keys()]
        .sort((a, b) => b - a)
        .map((amount, index) => {
            const count = counts.get(amount);
            return {
                id: `g${index}`,
                label: count > 1 ? `+${amount} (choose ${count})` : `+${amount}`,
                count,
                amount
            };
        });
}

function buildAbilityPattern(choose, index) {
    if (choose?.weighted) {
        const weights = toArray(choose.weighted.weights);
        return {
            value: `pattern-${index}`,
            label: weights.map((weight) => `+${Math.max(toNumber(weight, 1), 1)}`).join(" / ") || `Option ${index + 1}`,
            distinct: true,
            groups: buildWeightedGroups(weights)
        };
    }

    const count = Math.max(toNumber(choose?.count, 1), 1);
    const amount = Math.max(toNumber(choose?.amount, 1), 1);
    return {
        value: `pattern-${index}`,
        label: count > 1 ? `+${amount} to ${count} abilities` : `+${amount} to 1 ability`,
        distinct: true,
        groups: [{
            id: "g0",
            label: count > 1 ? `+${amount} (choose ${count})` : `+${amount}`,
            count,
            amount
        }]
    };
}

function getChooseFromValues(choose) {
    return choose?.weighted
        ? toArray(choose.weighted.from)
        : toArray(choose?.from || choose?.options);
}

function normalizeDamageType(value) {
    const text = formatRulesText(value)
        .split("|")[0]
        .trim()
        .toLowerCase();
    return DAMAGE_TYPE_OPTIONS.has(text) ? text : "";
}

function getRawResistanceChoices(entity) {
    const choices = [];

    for (const entry of getRawStructuredEntries(entity, "resist")) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            continue;
        }

        const choose = entry.choose || entry;
        const from = toArray(choose?.from || choose?.options)
            .map(normalizeDamageType)
            .filter(Boolean);
        if (from.length) {
            choices.push({
                from: [...new Set(from)],
                count: Math.max(toNumber(choose.count, 1), 1)
            });
        }
    }

    return choices;
}

function collectTables(entries, tables = []) {
    for (const entry of toArray(entries)) {
        if (!entry || typeof entry !== "object") {
            continue;
        }

        if (entry.type === "table" && toArray(entry.rows).length) {
            tables.push(entry);
        }

        collectTables(entry.entries, tables);
        collectTables(entry.items, tables);
    }

    return tables;
}

function parseBreathWeapon(value) {
    const text = formatRulesText(value);
    const saveMatch = /\((str|dex|con|int|wis|cha)[a-z. ]*save\)/iu.exec(text);
    return {
        area: text.replace(/\s*\([^)]*save\)\s*/iu, "").trim(),
        savingThrow: saveMatch ? saveMatch[1].toLowerCase() : ""
    };
}

function createDamageResistanceOption(damageType) {
    return {
        value: damageType,
        label: formatRefName(damageType),
        damageType,
        grants: {
            defenses: {
                damageResistances: [damageType]
            }
        }
    };
}

function createDraconicAncestryOptions(entity, allowedDamageTypes) {
    const tables = collectTables(entity?.entries);
    const ancestryTable = tables.find((table) => {
        const caption = normalizeSearchText(table.caption || table.name || "");
        const labels = toArray(table.colLabels).map((label) => normalizeSearchText(label));
        return caption.includes("ancestry")
            && labels.some((label) => label.includes("dragon"))
            && labels.some((label) => label.includes("damage type"));
    });
    if (!ancestryTable) {
        return [];
    }

    const labels = toArray(ancestryTable.colLabels).map((label) => normalizeSearchText(label));
    const dragonIndex = labels.findIndex((label) => label.includes("dragon"));
    const damageIndex = labels.findIndex((label) => label.includes("damage type"));
    const breathIndex = labels.findIndex((label) => label.includes("breath"));
    if (dragonIndex < 0 || damageIndex < 0) {
        return [];
    }

    return toArray(ancestryTable.rows)
        .map((row) => {
            const cells = toArray(row);
            const dragon = formatRulesText(cells[dragonIndex]).split("|")[0].trim();
            const damageType = normalizeDamageType(cells[damageIndex]);
            if (!dragon || !damageType || (allowedDamageTypes.size && !allowedDamageTypes.has(damageType))) {
                return null;
            }

            const breath = breathIndex >= 0 ? parseBreathWeapon(cells[breathIndex]) : {};
            return {
                ...createDamageResistanceOption(damageType),
                value: dragon.toLowerCase(),
                label: [dragon, formatRefName(damageType)].filter(Boolean).join(" - "),
                dragon,
                breathWeapon: breath.area || "",
                savingThrow: breath.savingThrow || ""
            };
        })
        .filter(Boolean);
}

function createRawResistanceChoiceDefinition(entity) {
    const choices = getRawResistanceChoices(entity);
    if (!choices.length) {
        return null;
    }

    const sourceName = getCatalogDisplayName(entity, "");
    const source = getCatalogSource(entity);
    const allowedDamageTypes = new Set(choices.flatMap((choice) => choice.from));
    const draconicOptions = createDraconicAncestryOptions(entity, allowedDamageTypes);
    const isDraconic = draconicOptions.length > 0;
    const options = isDraconic
        ? draconicOptions
        : [...allowedDamageTypes].map(createDamageResistanceOption);

    if (!options.length) {
        return null;
    }

    const choiceId = getRawEntityChoiceId(entity, isDraconic ? "draconic-ancestry" : "damage-resistance", 0);
    return {
        id: choiceId,
        choiceId,
        type: isDraconic ? "draconic-ancestry" : "damage-resistance",
        label: isDraconic ? "Draconic Ancestry" : "Damage Resistance",
        prompt: isDraconic
            ? "Choose the dragon ancestry that determines your breath weapon and resistance."
            : "Choose one damage resistance.",
        sourceName,
        source,
        required: true,
        count: Math.max(...choices.map((choice) => choice.count), 1),
        control: "select",
        valueKey: isDraconic ? "draconicAncestry" : "damageResistance",
        options
    };
}

// Fixed racial bonuses (e.g. Human "+1 to all" or the Changeling's flat +2 CHA)
// are applied automatically rather than presented as a choice. A multi-element
// `ability` array describes alternative schemes the player selects between, so
// nothing in that case is automatic.
export function getRaceAutoAbilityIncreases(entity) {
    const entries = getRawAbilityEntries(entity);
    if (entries.length !== 1) {
        return [];
    }

    const increases = [];
    for (const [key, value] of Object.entries(entries[0])) {
        if (key === "choose") {
            continue;
        }

        const ability = normalizeAbilityValue(key);
        const amount = toNumber(value, 0);
        if (ability && amount) {
            increases.push({ ability, amount });
        }
    }

    return increases;
}

function createRawAbilityChoiceDefinitions(entity) {
    const chooseEntries = getRawAbilityEntries(entity)
        .filter((entry) => entry.choose && typeof entry.choose === "object");
    if (!chooseEntries.length) {
        return [];
    }

    const choiceId = getRawEntityChoiceId(entity, "raw-ability", 0);
    const sourceName = getCatalogDisplayName(entity, "");
    const source = getCatalogSource(entity);

    // A single "choose N from a list" scheme renders best as a flat checkbox
    // grid; weighted or multi-scheme abilities need the pattern picker so each
    // slot can carry its own +N amount.
    if (chooseEntries.length === 1 && !chooseEntries[0].choose.weighted) {
        const choose = chooseEntries[0].choose;
        const count = Math.max(toNumber(choose.count, 1), 1);
        const amount = Math.max(toNumber(choose.amount, 1), 1);
        const options = mapAbilityOptions(getChooseFromValues(choose));
        if (!options.length) {
            return [];
        }

        return [{
            id: choiceId,
            choiceId,
            type: "racial-asi",
            label: "Ability Score Increase",
            prompt: `Choose ${count} ${count === 1 ? "ability" : "abilities"} to increase by +${amount}.`,
            sourceName,
            source,
            required: true,
            count,
            amount,
            control: "checkbox",
            valueKey: "ability",
            options
        }];
    }

    const patterns = chooseEntries.map((entry, index) => buildAbilityPattern(entry.choose, index));
    const options = mapAbilityOptions(chooseEntries.flatMap((entry) => getChooseFromValues(entry.choose)));
    if (!patterns.length || !options.length) {
        return [];
    }

    return [{
        id: choiceId,
        choiceId,
        type: "racial-asi",
        label: "Ability Score Increase",
        prompt: patterns.length > 1
            ? "Choose an ability score increase scheme, then assign the abilities."
            : "Assign your racial ability score increases.",
        sourceName,
        source,
        required: true,
        control: "ability-score-pattern",
        valueKey: "ability",
        count: 1,
        amount: 1,
        patterns,
        options
    }];
}

export function getStructuredChoiceDefinitions(entity, options = {}) {
    const definitions = [
        ...toArray(entity?.choiceDefinitions),
        ...toArray(entity?.choices)
    ].map(cloneChoice);
    void options;

    const resistanceChoice = createRawResistanceChoiceDefinition(entity);
    if (
        resistanceChoice
        && !definitions.some((definition) => normalizeChoiceType(definition?.type) === normalizeChoiceType(resistanceChoice.type))
    ) {
        definitions.push(resistanceChoice);
    }

    definitions.push(...createRawAbilityChoiceDefinitions(entity));

    return definitions;
}

function normalizeGrantGroup(group) {
    return {
        fixed: toArray(group?.fixed).slice(),
        choices: toArray(group?.choices).map((choice) => ({
            ...choice,
            from: toArray(choice?.from).slice(),
            options: toArray(choice?.options).slice()
        }))
    };
}

export function getStructuredGrantGroup(entity, grantKey) {
    const groups = [
        normalizeGrantGroup(entity?.startingProficiencies?.[grantKey]),
        normalizeGrantGroup(entity?.grants?.[grantKey]),
        normalizeGrantGroup(getRawStructuredGrantGroup(entity, grantKey))
    ];

    return {
        fixed: groups.flatMap((group) => group.fixed),
        choices: groups.flatMap((group) => group.choices)
    };
}

export function isFeatureRecord(record) {
    const kind = normalizeSearchText(record?.kind || "");
    const id = normalizeSearchText(record?.id || record?.ref || record?.sourceId || "");
    return kind.includes("feature")
        || id.startsWith("class-feature:")
        || id.startsWith("subclass-feature:");
}
