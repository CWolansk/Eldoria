import {
    formatRefName,
    getCatalogDisplayName,
    getCatalogSource,
    getFirstRulesText,
    normalizeSearchText,
    toArray
} from "../Core/LevelEditorShared.js";
import { resolveCatalogEntity } from "./LevelEditorCatalogChoiceResolver.js";

const OPTIONAL_FEATURE_KIND = "optional-features";
const STATIC_OPTIONAL_FEATURES_URL = new URL("../../../../5etools/data/optionalfeatures.json", import.meta.url).href;
const staticRecordsByUrl = new Map();
const resolvedRecordsByKey = new Map();

function parseOptionalFeatureRef(value) {
    const raw = String(value || "").trim();
    const [name, source] = raw.split("|").map((part) => part.trim());
    return {
        raw,
        name: name || raw,
        source: source || ""
    };
}

function getOptionIdentity(option) {
    const parsed = parseOptionalFeatureRef(option?.value || option?.ref || option?.id || option?.name || option?.label || "");
    return {
        id: option?.recordId || option?.id || option?.ref || parsed.raw,
        ref: option?.ref || parsed.raw,
        name: option?.name || option?.label || parsed.name,
        source: option?.source || parsed.source
    };
}

function getRecordKey(name, source = "") {
    return `${normalizeSearchText(name)}|${normalizeSearchText(source)}`;
}

function normalizeOptionalFeatureRecord(record) {
    if (!record || typeof record !== "object") {
        return null;
    }

    return {
        ...record,
        kind: record.kind || OPTIONAL_FEATURE_KIND,
        name: getCatalogDisplayName(record, record.name || ""),
        source: getCatalogSource(record),
        description: getFirstRulesText(record.entries || record.items || record.entry || "")
    };
}

function buildStaticLookup(records) {
    const exact = new Map();
    const byName = new Map();
    const duplicateNames = new Set();

    for (const record of records.map(normalizeOptionalFeatureRecord).filter(Boolean)) {
        exact.set(getRecordKey(record.name, record.source), record);
        const nameKey = getRecordKey(record.name);
        if (byName.has(nameKey)) {
            duplicateNames.add(nameKey);
        } else {
            byName.set(nameKey, record);
        }
    }

    for (const nameKey of duplicateNames) {
        byName.delete(nameKey);
    }

    return { exact, byName };
}

async function loadStaticOptionalFeatureLookup(context = {}) {
    if (Array.isArray(context.optionalFeatureRecords)) {
        return buildStaticLookup(context.optionalFeatureRecords);
    }

    if (Array.isArray(context.optionalFeatures)) {
        return buildStaticLookup(context.optionalFeatures);
    }

    if (typeof fetch !== "function") {
        return buildStaticLookup([]);
    }

    const url = context.optionalFeatureDataUrl || STATIC_OPTIONAL_FEATURES_URL;
    if (!staticRecordsByUrl.has(url)) {
        staticRecordsByUrl.set(url, fetch(url)
            .then((response) => response.ok ? response.json() : null)
            .then((data) => buildStaticLookup(toArray(data?.optionalfeature)))
            .catch((error) => {
                console.warn("Optional feature fallback data failed to load:", error);
                return buildStaticLookup([]);
            }));
    }

    return staticRecordsByUrl.get(url);
}

async function resolveOptionalFeatureFromCatalog(context, option) {
    const identity = getOptionIdentity(option);
    if (!identity.name && !identity.id) {
        return null;
    }

    try {
        return normalizeOptionalFeatureRecord(await resolveCatalogEntity(context, OPTIONAL_FEATURE_KIND, identity, {
            fallbackIdentity: false,
            limit: 20
        }));
    } catch (_error) {
        return null;
    }
}

async function resolveOptionalFeatureFromStatic(context, option) {
    const identity = getOptionIdentity(option);
    const lookup = await loadStaticOptionalFeatureLookup(context);
    return lookup.exact.get(getRecordKey(identity.name, identity.source))
        || lookup.byName.get(getRecordKey(identity.name))
        || null;
}

function canCacheResolvedRecords(context = {}) {
    return !Array.isArray(context.optionalFeatureRecords)
        && !Array.isArray(context.optionalFeatures);
}

function getResolvedRecordCacheKey(context, option) {
    const identity = getOptionIdentity(option);
    return [
        context.optionalFeatureDataUrl || STATIC_OPTIONAL_FEATURES_URL,
        identity.id,
        identity.ref,
        identity.name,
        identity.source
    ].map(normalizeSearchText).join("|");
}

async function resolveOptionalFeatureRecord(context, option) {
    const shouldCache = canCacheResolvedRecords(context);
    const cacheKey = shouldCache ? getResolvedRecordCacheKey(context, option) : "";
    if (cacheKey && resolvedRecordsByKey.has(cacheKey)) {
        return resolvedRecordsByKey.get(cacheKey);
    }

    const resolution = Promise.resolve()
        .then(() => resolveOptionalFeatureFromStatic(context, option))
        .then((staticRecord) => staticRecord || resolveOptionalFeatureFromCatalog(context, option))
        .catch((error) => {
            if (cacheKey) {
                resolvedRecordsByKey.delete(cacheKey);
            }
            throw error;
        });

    if (cacheKey) {
        resolvedRecordsByKey.set(cacheKey, resolution);
    }

    return resolution;
}

function mergeOptionRecord(option, record) {
    if (!record) {
        return {
            ...option,
            description: option.description || "No description available."
        };
    }

    return {
        ...option,
        recordId: record.id || record.ref || record.refId || record.sourceId || option.recordId || "",
        label: record.name || option.label || formatRefName(option.value),
        source: record.source || option.source || "",
        page: record.page || option.page || null,
        featureType: toArray(record.featureType).slice(),
        description: record.description || option.description || "No description available.",
        rulesEntries: record.entries || option.rulesEntries || null
    };
}

function isOptionalFeatureOption(option) {
    return option?.catalogKind === OPTIONAL_FEATURE_KIND
        || option?.refType === "optionalfeature"
        || Boolean(option?.optionalfeature);
}

export async function enrichOptionalFeatureOptions(context, choices) {
    await Promise.all(toArray(choices).map(async (choice) => {
        choice.options = await Promise.all(toArray(choice.options).map(async (option) => {
            const record = isOptionalFeatureOption(option)
                ? await resolveOptionalFeatureRecord(context, option)
                : null;
            return mergeOptionRecord(option, record);
        }));
    }));

    return choices;
}
