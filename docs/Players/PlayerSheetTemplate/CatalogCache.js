import { getCatalogODataItems } from "../../api/apiClient/index.js";

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

    if ([
        "backgrounds",
        "classes",
        "class-features",
        "feats",
        "items",
        "optional-features",
        "spells",
        "subclasses",
        "subclass-features"
    ].includes(normalizedKind)) {
        return text.includes(":");
    }

    return true;
}

export class CatalogCache {
    constructor(api) {
        if (!api) {
            throw new TypeError("CatalogCache requires an API client.");
        }

        this.api = api;
        this.byId = new Map();
        this.byNameSource = new Map();
        this.searchResults = new Map();
        this.pending = new Map();
    }

    clear() {
        this.byId.clear();
        this.byNameSource.clear();
        this.searchResults.clear();
        this.pending.clear();
    }

    keyById(kind, id) {
        return `${normalizeKind(kind)}::id::${normalizeText(id)}`;
    }

    keyByNameSource(kind, name, source = "") {
        return `${normalizeKind(kind)}::name::${normalizeText(name)}::source::${normalizeText(source)}`;
    }

    keyBySearch(kind, query = "", options = {}) {
        return `${normalizeKind(kind)}::search::${normalizeText(query)}::${JSON.stringify(options || {})}`;
    }

    async loadCached(cache, cacheKey, loader, options = {}) {
        if (!options.refresh && cache.has(cacheKey)) {
            return cache.get(cacheKey);
        }

        if (!options.refresh && this.pending.has(cacheKey)) {
            return this.pending.get(cacheKey);
        }

        const request = Promise.resolve()
            .then(loader)
            .then((value) => {
                cache.set(cacheKey, value);
                return value;
            })
            .catch((error) => {
                if (isNotFoundError(error)) {
                    const missValue = options.missValue ?? null;
                    cache.set(cacheKey, missValue);
                    return missValue;
                }

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
        return this.loadCached(this.byNameSource, cacheKey, async () => {
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

        return this.loadCached(this.searchResults, cacheKey, async () => {
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

            return this.rememberMany(kind, response);
        }, {
            refresh,
            missValue: []
        });
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
