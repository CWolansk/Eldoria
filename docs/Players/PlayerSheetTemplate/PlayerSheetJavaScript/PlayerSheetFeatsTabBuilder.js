import {
    appendEmptyState,
    appendPillList,
    createCardGrid,
    createDefinitionList,
    createSection,
    createTabShell
} from "./PlayerSheetTabHelpers.js";
import {
    appendRulesEntry,
    createElement
} from "../PlayerSheetHtmlHelper.js";
import {
    getCatalogCache,
    getCatalogDisplayName,
    getCatalogSource,
    normalizeSearchText,
    toArray,
    toNumber
} from "../LevelEditorJavaScript/Core/LevelEditorShared.js";
import {
    getLinkedFeatureRefs,
    resolveCatalogFeatureEntity
} from "../LevelEditorJavaScript/Catalog/LevelEditorCatalogChoiceResolver.js";
import {
    enrichOptionalFeatureOptions
} from "../LevelEditorJavaScript/Catalog/LevelEditorOptionalFeatureCatalog.js";

const CATEGORY_GROUPS = [
    {
        title: "Class Features",
        categories: new Set(["Class Feature"])
    },
    {
        title: "Subclass Features",
        categories: new Set(["Subclass Feature"])
    },
    {
        title: "Race Features",
        categories: new Set(["Race Feature"])
    },
    {
        title: "Feats & ASI",
        categories: new Set(["ASI Feat", "Ability Score Increase"])
    },
    {
        title: "Background Features",
        categories: new Set(["Background Feature", "Background Feat"])
    }
];

const NO_RULES_TEXT = "No rules text recorded for this feature.";
const CATALOG_ID_KIND_PREFIXES = [
    ["subclass-feature:", "subclass-features"],
    ["class-feature:", "class-features"],
    ["optional-feature:", "optional-features"],
    ["subclass:", "subclasses"],
    ["class:", "classes"],
    ["background:", "backgrounds"],
    ["feat:", "feats"],
    ["item:", "items"],
    ["spell:", "spells"]
];

function createFeatureCard(feature) {
    const card = document.createElement("article");
    card.className = "player-sheet-info-card";
    const title = document.createElement("h4");
    title.className = "player-sheet-info-card__title";
    title.textContent = feature.name || "Feature";
    card.appendChild(title);

    const rows = [
        ["Source", feature.source],
        ["Level", feature.level != null ? feature.level : ""],
        ["Type", feature.category]
    ].filter(([, value]) => value != null && String(value).trim());
    if (rows.length) {
        card.appendChild(createDefinitionList(rows));
    }

    card.appendChild(createFeatureRulesDropdown(feature));

    return card;
}

function normalizeCatalogId(value) {
    return String(value || "")
        .trim()
        .replace(/\.json$/iu, "")
        .split("#")[0]
        .trim();
}

function unique(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const text = String(value || "").trim();
        const key = text.toLowerCase();
        if (!text || seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(text);
    }
    return result;
}

function getCatalogKindForId(id) {
    const text = normalizeCatalogId(id).toLowerCase();
    const match = CATALOG_ID_KIND_PREFIXES.find(([prefix]) => text.startsWith(prefix));
    return match?.[1] || "";
}

function isCanonicalFeatureCatalogId(id) {
    const kind = getCatalogKindForId(id);
    if (!["class-features", "subclass-features", "optional-features", "feats"].includes(kind)) {
        return false;
    }

    return normalizeCatalogId(id).split(":").length === 3;
}

function getCanonicalIdsForKind(identity, kind) {
    return unique([
        identity?.options?.catalogId,
        identity?.catalogId,
        identity?.featureId,
        identity?.id,
        identity?.source,
        identity?.refId,
        identity?.sourceId
    ].map(normalizeCatalogId))
        .filter((id) => getCatalogKindForId(id) === kind);
}

function getFeatureCatalogIds(feature) {
    return unique([
        feature?.options?.catalogId,
        feature?.catalogId,
        feature?.featureId,
        feature?.id,
        feature?.source,
        feature?.refId,
        feature?.sourceId
    ].map(normalizeCatalogId))
        .filter(isCanonicalFeatureCatalogId);
}

function getFeatureCatalogId(feature) {
    return getFeatureCatalogIds(feature)[0] || "";
}

function getFeatureRuleEntries(feature) {
    return feature?.rulesEntries
        || feature?.entries
        || feature?.raw?.entries
        || feature?.description
        || feature?.summary
        || null;
}

function hasRulesValue(value) {
    if (Array.isArray(value)) {
        return value.length > 0;
    }

    if (typeof value === "string") {
        return value.trim().length > 0 && value !== NO_RULES_TEXT;
    }

    return Boolean(value);
}

function getFeatureRules(feature) {
    return getFeatureRuleEntries(feature) || NO_RULES_TEXT;
}

function getRecordRules(record) {
    return record?.entries
        || record?.raw?.entries
        || record?._fullEntries
        || record?.description
        || record?.summary
        || null;
}

function getRecordCategory(record) {
    const id = normalizeCatalogId(record?.id || record?.refId || record?.sourceId || record?.ref);
    const kind = normalizeSearchText([record?.kind, getCatalogKindForId(id), id].filter(Boolean).join(" "));
    if (kind.includes("subclass-feature")) {
        return "Subclass Feature";
    }

    if (kind.includes("class-feature")) {
        return "Class Feature";
    }

    if (kind.includes("feat")) {
        return "ASI Feat";
    }

    return "";
}

function mergeCatalogRecordIntoFeature(feature, record) {
    const rulesEntries = getRecordRules(record);
    if (!record || !hasRulesValue(rulesEntries)) {
        return feature;
    }

    const catalogId = normalizeCatalogId(record.id || record.refId || record.sourceId || "");
    return {
        ...feature,
        id: feature.id || catalogId,
        catalogId: feature.catalogId || catalogId,
        name: feature.name || getCatalogDisplayName(record, "Feature"),
        source: getCatalogSource(record) || feature.source || "",
        category: feature.category || getRecordCategory(record),
        level: feature.level != null ? feature.level : record.level,
        rulesEntries,
        catalogRecord: record
    };
}

async function getCatalogEntityByCanonicalId(catalog, kind, id) {
    if (!catalog || getCatalogKindForId(id) !== kind) {
        return null;
    }

    try {
        return await catalog.getById(kind, id);
    } catch (error) {
        console.warn(`Catalog lookup failed for ${kind}/${id}:`, error);
        return null;
    }
}

async function resolveDirectFeatureRecord(feature, catalog) {
    for (const id of getFeatureCatalogIds(feature)) {
        const kind = getCatalogKindForId(id);
        const record = await getCatalogEntityByCanonicalId(catalog, kind, id);
        if (record) {
            return record;
        }
    }

    return null;
}

function getFeatureLevel(feature) {
    return toNumber(feature?.level ?? feature?.classLevel ?? feature?.subclassLevel, 0);
}

function getFeatureNameCandidates(feature) {
    const name = String(feature?.name || "").trim();
    const beforeColon = name.includes(":") ? name.split(":")[0].trim() : "";
    return unique([name, beforeColon].map(normalizeSearchText));
}

function getFeatureChoiceLabel(feature) {
    const name = String(feature?.name || "").trim();
    return name.includes(":") ? name.split(":").slice(1).join(":").trim() : "";
}

function recordMatchesCategory(feature, record) {
    const featureCategory = normalizeSearchText(feature?.category || "");
    const recordCategory = normalizeSearchText(getRecordCategory(record));
    if (!featureCategory || !recordCategory) {
        return true;
    }

    if (featureCategory.includes("feat") && recordCategory.includes("feat")) {
        return true;
    }

    return featureCategory === recordCategory;
}

function scoreFeatureRecordMatch(feature, record) {
    const recordName = normalizeSearchText(getCatalogDisplayName(record, ""));
    if (!recordName || !getFeatureNameCandidates(feature).includes(recordName)) {
        return 0;
    }

    const recordLevel = getFeatureLevel(record);
    const featureLevel = getFeatureLevel(feature);
    if (recordLevel && featureLevel && recordLevel !== featureLevel) {
        return 0;
    }

    let score = 4;
    if (recordMatchesCategory(feature, record)) {
        score += 2;
    }
    if (recordLevel && featureLevel) {
        score += 1;
    }
    return score;
}

function findMatchingCatalogRecord(feature, records) {
    return toArray(records)
        .map((record) => ({
            record,
            score: scoreFeatureRecordMatch(feature, record)
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)[0]?.record || null;
}

function getRecordKey(record) {
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

function appendRecord(records, record) {
    if (!record || typeof record !== "object") {
        return;
    }

    const key = getRecordKey(record);
    if (key && records.some((existing) => getRecordKey(existing) === key)) {
        return;
    }

    records.push(record);
}

function getLevelClassLevel(level) {
    return toNumber(level?.class?.classLevel, toNumber(level?.characterLevel, 0));
}

function getIdentityKey(identity) {
    return normalizeCatalogId(
        identity?.options?.catalogId
        || identity?.catalogId
        || identity?.id
        || identity?.ref
        || identity?.name
    ).toLowerCase();
}

function getClassLevelCounts(dto) {
    const counts = new Map();
    for (const level of toArray(dto?.levels)) {
        if (!level?.class) {
            continue;
        }

        const key = getIdentityKey(level.class) || `class-${counts.size + 1}`;
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
}

function getCurrentClassLevel(level, classLevelCounts) {
    const key = getIdentityKey(level?.class);
    return key ? classLevelCounts.get(key) || getLevelClassLevel(level) : getLevelClassLevel(level);
}

async function appendLinkedFeatureRecords(context, catalog, records, rootRecord, classLevel, featureKinds) {
    for (const ref of getLinkedFeatureRefs(rootRecord, { classLevel })) {
        try {
            appendRecord(records, await resolveCatalogFeatureEntity(context, ref, {
                catalog,
                fallbackIdentity: false,
                featureKinds
            }));
        } catch (error) {
            console.warn("Linked feature catalog lookup failed:", error);
        }
    }
}

async function loadDtoFeatureRecords(context, catalog) {
    const dto = context?.dto || {};
    const records = [];
    const classLevelCounts = getClassLevelCounts(dto);

    for (const level of toArray(dto.levels)) {
        const classLevel = getLevelClassLevel(level);
        const currentClassLevel = getCurrentClassLevel(level, classLevelCounts);

        for (const classId of getCanonicalIdsForKind(level.class, "classes")) {
            const classRecord = await getCatalogEntityByCanonicalId(catalog, "classes", classId);
            if (classRecord) {
                await appendLinkedFeatureRecords(context, catalog, records, classRecord, classLevel, ["class-features"]);
            }
        }

        for (const subclassId of getCanonicalIdsForKind(level.subclass, "subclasses")) {
            const subclassRecord = await getCatalogEntityByCanonicalId(catalog, "subclasses", subclassId);
            if (subclassRecord) {
                await appendLinkedFeatureRecords(context, catalog, records, subclassRecord, currentClassLevel, ["subclass-features"]);
            }
        }

        for (const featureRef of toArray(level.features)) {
            try {
                appendRecord(records, await resolveCatalogFeatureEntity(context, featureRef, {
                    catalog,
                    fallbackIdentity: false
                }));
            } catch (error) {
                console.warn("Level feature catalog lookup failed:", error);
            }
        }

        for (const choice of toArray(level.choices)) {
            for (const featureId of getCanonicalIdsForKind(choice, "class-features")) {
                appendRecord(records, await getCatalogEntityByCanonicalId(catalog, "class-features", featureId));
            }
            for (const featureId of getCanonicalIdsForKind(choice, "subclass-features")) {
                appendRecord(records, await getCatalogEntityByCanonicalId(catalog, "subclass-features", featureId));
            }
        }

        for (const featId of getCanonicalIdsForKind(level.feat, "feats")) {
            appendRecord(records, await getCatalogEntityByCanonicalId(catalog, "feats", featId));
        }
    }

    return records;
}

function isClassOptionFeature(feature) {
    return normalizeSearchText(feature?.category || "") === "class feature"
        && Boolean(getFeatureChoiceLabel(feature));
}

function choiceMatchesFeature(feature, choice) {
    const featureIds = new Set([
        ...getFeatureCatalogIds(feature),
        normalizeCatalogId(feature?.source),
        normalizeCatalogId(feature?.catalogId)
    ].filter(Boolean).map((value) => value.toLowerCase()));
    const choiceFeatureId = normalizeCatalogId(choice?.featureId).toLowerCase();
    const choiceId = normalizeCatalogId(choice?.choiceId || choice?.id).toLowerCase();
    const featureId = normalizeCatalogId(feature?.id).toLowerCase();
    const featureBaseName = getFeatureNameCandidates(feature)[1] || "";
    const choiceLabel = normalizeSearchText(choice?.label || choice?.featureName || "");

    return Boolean(
        (choiceFeatureId && featureIds.has(choiceFeatureId))
        || (choiceId && featureId && choiceId === featureId)
        || (featureBaseName && choiceLabel && featureBaseName === choiceLabel)
    );
}

function optionMatchesFeature(feature, option) {
    const wanted = normalizeSearchText(getFeatureChoiceLabel(feature));
    if (!wanted) {
        return false;
    }

    return [
        option?.label,
        option?.name,
        option?.value
    ]
        .map((value) => normalizeSearchText(String(value || "").split("|")[0]))
        .some((value) => value === wanted);
}

function findSelectedClassOption(feature, dto) {
    const matchingChoices = toArray(dto?.levels)
        .flatMap((level) => toArray(level?.choices))
        .filter((choice) => choice?.type === "class-option")
        .filter((choice) => choiceMatchesFeature(feature, choice));

    return matchingChoices
        .flatMap((choice) => toArray(choice?.values))
        .find((option) => optionMatchesFeature(feature, option)) || null;
}

function createOptionalFeatureRecord(option) {
    const rulesEntries = option?.rulesEntries || option?.entries || null;
    if (!hasRulesValue(rulesEntries)) {
        return null;
    }

    return {
        kind: "optional-features",
        id: option.recordId || option.id || "",
        name: option.label || option.name || option.value || "Class Option",
        source: option.source || "",
        page: option.page || null,
        entries: rulesEntries
    };
}

async function resolveSelectedClassOptionRecord(feature, context) {
    if (!isClassOptionFeature(feature)) {
        return null;
    }

    const selectedOption = findSelectedClassOption(feature, context?.dto);
    if (!selectedOption) {
        return null;
    }

    const persistedRecord = createOptionalFeatureRecord(selectedOption);
    if (persistedRecord) {
        return persistedRecord;
    }

    const choice = {
        options: [{
            ...selectedOption,
            catalogKind: selectedOption.catalogKind || "optional-features",
            refType: selectedOption.refType || "optionalfeature",
            optionalfeature: selectedOption.optionalfeature || selectedOption.value || selectedOption.label || ""
        }]
    };
    await enrichOptionalFeatureOptions(context, [choice]);
    return createOptionalFeatureRecord(choice.options.find((option) => optionMatchesFeature(feature, option)));
}

export async function hydrateFeatureRules(features, context = {}) {
    const sourceFeatures = toArray(features);
    if (!sourceFeatures.length || !context?.api) {
        return sourceFeatures;
    }

    const catalog = getCatalogCache(context.api);
    let dtoFeatureRecordsPromise = null;

    return Promise.all(sourceFeatures.map(async (feature) => {
        if (hasRulesValue(getFeatureRuleEntries(feature))) {
            return feature;
        }

        const selectedClassOptionRecord = await resolveSelectedClassOptionRecord(feature, context);
        if (selectedClassOptionRecord) {
            return mergeCatalogRecordIntoFeature(feature, selectedClassOptionRecord);
        }

        const directRecord = await resolveDirectFeatureRecord(feature, catalog);
        if (directRecord) {
            return mergeCatalogRecordIntoFeature(feature, directRecord);
        }

        dtoFeatureRecordsPromise = dtoFeatureRecordsPromise || loadDtoFeatureRecords(context, catalog);
        const dtoFeatureRecords = await dtoFeatureRecordsPromise;
        return mergeCatalogRecordIntoFeature(feature, findMatchingCatalogRecord(feature, dtoFeatureRecords));
    }));
}

function createFeatureRulesDropdown(feature) {
    const detail = createElement("details", "player-sheet-item-card__rules player-sheet-feature-card__rules");
    detail.appendChild(createElement("summary", "player-sheet-item-card__rules-summary", "Rules"));

    const rules = getFeatureRules(feature);
    if (typeof rules === "string") {
        detail.appendChild(createElement("p", "player-sheet-item-card__rules-text", rules));
        return detail;
    }

    appendRulesEntry(detail, rules, {
        text: "player-sheet-item-card__rules-text",
        list: "player-sheet-item-card__rules-list",
        table: "player-sheet-item-card__rules-table",
        section: "player-sheet-item-card__rules-section",
        title: "player-sheet-item-card__rules-title"
    });

    return detail;
}

function appendFeatureGroup(shell, title, features) {
    const section = createSection(title);
    if (!features.length) {
        appendEmptyState(section, "None.");
        shell.appendChild(section);
        return;
    }

    const grid = createCardGrid();
    for (const feature of features) {
        grid.appendChild(createFeatureCard(feature));
    }
    section.appendChild(grid);
    shell.appendChild(section);
}

export async function BuildPlayerSheetFeatsTab(playerSheetObject, context = {}) {
    const shell = createTabShell("Feats");
    const features = await hydrateFeatureRules(playerSheetObject?.features, context);
    const used = new Set();

    if (!features.length) {
        appendEmptyState(shell, "No features recorded.");
        return;
    }

    for (const group of CATEGORY_GROUPS) {
        const groupedFeatures = features.filter((feature, index) => {
            const matches = group.categories.has(feature?.category || "");
            if (matches) {
                used.add(index);
            }
            return matches;
        });
        appendFeatureGroup(shell, group.title, groupedFeatures);
    }

    const otherFeatures = features.filter((_feature, index) => !used.has(index));
    if (otherFeatures.length) {
        appendFeatureGroup(shell, "Other Features", otherFeatures);
    }

    const featureChoices = Array.isArray(playerSheetObject?.featureChoices) ? playerSheetObject.featureChoices : [];
    if (featureChoices.length) {
        const section = createSection("Feature Choices");
        appendPillList(section, featureChoices.map((choice) => [choice.label, choice.value].filter(Boolean).join(": ")));
        shell.appendChild(section);
    }
}
