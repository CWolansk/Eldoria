import { getCatalogODataItems } from "../../api/apiClient/index.js";
import { clearCachedJson, loadCachedJson, normalizeCacheKeyPart } from "../web-cache.js";

const CATALOG_CACHE_NAMESPACE = "eldoria-catalog-cache";
const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CATALOG_CACHE_MAX_STORAGE_BYTES = 1024 * 1024;
const sharedCatalogState = {
    byId: new Map(),
    byNameSource: new Map(),
    searchResults: new Map(),
    pending: new Map()
};

function normalizeKind(kind) {
    return String(kind || "").trim().toLowerCase();
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function getEntityId(entity) {
    return String(entity?.id || entity?.key || entity?.slug || "").trim();
}

function getEntityName(entity) {
    return String(entity?.name || entity?.title || "").trim();
}

function getEntitySource(entity) {
    return String(entity?.source || entity?.book || "").trim();
}

function stripJsonExtension(value) {
    return String(value || "").trim().replace(/\.json$/iu, "");
}

function listItems(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    return getCatalogODataItems(response);
}

function isNotFoundError(error) {
    return Number(error?.status || error?.statusCode || 0) === 404;
}

function toUnique(values) {
    const seen = new Set();
    const result = [];

    for (const value of values) {
        const text = String(value || "").trim();
        const key = normalizeText(text);
        if (!text || seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(text);
    }

    return result;
}

function getCatalogIdCandidates(id) {
    return toUnique([
        String(id || "").trim(),
        stripJsonExtension(id)
    ]);
}

function isCanonicalCatalogId(kind, id) {
    const normalizedKind = normalizeKind(kind);
    const text = String(id || "").trim();
    if (!text) {
        return false;
    }

    if (normalizedKind === "items") {
        return text.includes(":") || /^item-[a-z0-9][a-z0-9-]*$/iu.test(text);
    }

    if ([
        "backgrounds",
        "classes",
        "class-features",
        "feats",
        "optional-features",
        "spells",
        "subclasses",
        "subclass-features"
    ].includes(normalizedKind)) {
        return text.includes(":");
    }

    return true;
}

function getApiCacheScope(api) {
    return normalizeCacheKeyPart(api?.baseUrl || "default-api") || "default-api";
}

function deleteMapEntriesByPrefix(map, prefix) {
    for (const key of [...map.keys()]) {
        if (key.startsWith(prefix)) {
            map.delete(key);
        }
    }
}

export class CatalogCache {
    constructor(api) {
        if (!api) {
            throw new TypeError("CatalogCache requires an API client.");
        }

        this.api = api;
        this.scope = getApiCacheScope(api);
        this.byId = sharedCatalogState.byId;
        this.byNameSource = sharedCatalogState.byNameSource;
        this.searchResults = sharedCatalogState.searchResults;
        this.pending = sharedCatalogState.pending;
    }

    static clearShared() {
        sharedCatalogState.byId.clear();
        sharedCatalogState.byNameSource.clear();
        sharedCatalogState.searchResults.clear();
        sharedCatalogState.pending.clear();
        clearCachedJson("catalog:", { namespace: CATALOG_CACHE_NAMESPACE });
    }

    clear() {
        const prefix = `${this.scope}::`;
        deleteMapEntriesByPrefix(this.byId, prefix);
        deleteMapEntriesByPrefix(this.byNameSource, prefix);
        deleteMapEntriesByPrefix(this.searchResults, prefix);
        deleteMapEntriesByPrefix(this.pending, prefix);
        clearCachedJson(`catalog:${prefix}`, { namespace: CATALOG_CACHE_NAMESPACE });
    }

    keyById(kind, id) {
        return `${this.scope}::${normalizeKind(kind)}::id::${normalizeText(id)}`;
    }

    keyByNameSource(kind, name, source = "") {
        return `${this.scope}::${normalizeKind(kind)}::name::${normalizeText(name)}::source::${normalizeText(source)}`;
    }

    keyBySearch(kind, query = "", options = {}) {
        return `${this.scope}::${normalizeKind(kind)}::search::${normalizeText(query)}::${JSON.stringify(options || {})}`;
    }

    async loadCached(cache, cacheKey, loader, options = {}) {
        if (!options.refresh && cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        if (!options.refresh && this.pending.has(cacheKey)) {
            return this.pending.get(cacheKey);
        }

        const request = loadCachedJson(
            `catalog:${cacheKey}`,
            () => Promise.resolve()
                .then(loader)
                .catch((error) => {
                    if (isNotFoundError(error)) {
                        return options.missValue ?? null;
                    }

                    throw error;
                }),
            {
                maxStorageBytes: options.maxStorageBytes || CATALOG_CACHE_MAX_STORAGE_BYTES,
                namespace: CATALOG_CACHE_NAMESPACE,
                refresh: options.refresh,
                staleOnError: true,
                ttlMs: options.ttlMs || CATALOG_CACHE_TTL_MS
            }
        )
            .then((result) => result.value)
            .then((value) => {
                cache.set(cacheKey, value);
                return value;
            })
            .catch((error) => {
                throw error;
            })
            .finally(() => {
                this.pending.delete(cacheKey);
            });

        this.pending.set(cacheKey, request);
        return request;
    }

    remember(kind, entity) {
        if (!entity || typeof entity !== "object") {
            return entity;
        }

        const normalizedKind = normalizeKind(entity.kind || kind);
        const id = getEntityId(entity);
        const name = getEntityName(entity);
        const source = getEntitySource(entity);

        if (id) {
            this.byId.set(this.keyById(normalizedKind, id), entity);
        }

        if (name) {
            this.byNameSource.set(this.keyByNameSource(normalizedKind, name, source), entity);
            this.byNameSource.set(this.keyByNameSource(normalizedKind, name, ""), entity);
        }

        return entity;
    }

    rememberMany(kind, entities = []) {
        return listItems(entities).map((entity) => this.remember(kind, entity));
    }

    async getById(kind, id, options = {}) {
        const candidates = getCatalogIdCandidates(id);
        for (const candidate of candidates) {
            const cacheKey = this.keyById(kind, candidate);
            const entity = await this.loadCached(
                this.byId,
                cacheKey,
                () => this.api.getCatalogEntity(kind, candidate),
                options
            );

            if (!entity) {
                continue;
            }

            const remembered = this.remember(kind, entity);
            for (const alias of candidates) {
                this.byId.set(this.keyById(kind, alias), remembered);
            }
            return remembered;
        }

        this.byId.set(this.keyById(kind, id), null);
        return null;
    }

    async getByName(kind, name, source = "", options = {}) {
        const cacheKey = this.keyByNameSource(kind, name, source);
        const entity = await this.loadCached(this.byNameSource, cacheKey, async () => {
            const matches = await this.search(kind, name, {
                ...options,
                source,
                limit: options.limit || 20
            });

            const wantedName = normalizeText(name);
            const wantedSource = normalizeText(source);
            const entity = matches.find((item) => {
                const itemName = normalizeText(getEntityName(item));
                const itemSource = normalizeText(getEntitySource(item));
                return itemName === wantedName && (!wantedSource || itemSource === wantedSource);
            }) || matches.find((item) => normalizeText(getEntityName(item)) === wantedName) || null;

            return entity ? this.remember(kind, entity) : null;
        }, options);
        return entity ? this.remember(kind, entity) : null;
    }

    async getByIdentity(identity, options = {}) {
        const kind = identity?.kind || options.kind;
        if (!kind) {
            throw new TypeError("Catalog identity kind is required.");
        }

        const id = [
            identity?.options?.catalogId,
            identity?.catalogId,
            identity?.id
        ].find((candidate) => isCanonicalCatalogId(kind, candidate));
        if (id) {
            return this.getById(kind, id, options);
        }

        return null;
    }

    async search(kind, query = "", options = {}) {
        const { refresh = false, full = true, odata = false, ...queryOptions } = options;
        const cacheKey = this.keyBySearch(kind, query, { full, odata, ...queryOptions });

        const records = await this.loadCached(this.searchResults, cacheKey, async () => {
            let response;
            if (odata) {
                response = query
                    ? await this.api.searchCatalogOData(kind, query, queryOptions)
                    : await this.api.listCatalogOData(kind, queryOptions);
            } else if (query) {
                response = full && typeof this.api.searchCatalogFull === "function"
                    ? await this.api.searchCatalogFull(kind, query, queryOptions)
                    : await this.api.searchCatalog(kind, query, queryOptions);
            } else {
                response = full && typeof this.api.listCatalogFull === "function"
                    ? await this.api.listCatalogFull(kind, queryOptions)
                    : await this.api.listCatalog(kind, queryOptions);
            }

            return listItems(response);
        }, {
            refresh,
            missValue: []
        });

        return this.rememberMany(kind, records);
    }

    searchForPicker(kind, query = "", options = {}) {
        return this.search(kind, query, options);
    }

    searchFull(kind, query = "", options = {}) {
        return this.search(kind, query, { ...options, full: true });
    }

    searchOData(kind, query = "", options = {}) {
        return this.search(kind, query, { ...options, odata: true });
    }
}
