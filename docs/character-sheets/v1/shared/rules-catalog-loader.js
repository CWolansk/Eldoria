export const RULES_CATALOG_FILE_BY_KEY = {
  items: "items.json",
  eldoriaItems: "eldoria-items-index.json",
  itemProperties: "item-properties.json",
  magicVariants: "magic-variants.json",
  spells: "spells.json",
  classes: "classes.json",
  features: "features.json",
  races: "races.json",
  backgrounds: "backgrounds.json",
  feats: "feats.json"
};

export const DEFAULT_RULES_CATALOG_KEYS = [
  "spells",
  "classes",
  "features",
  "races",
  "backgrounds",
  "feats"
];

export const ALL_RULES_CATALOG_KEYS = Object.keys(RULES_CATALOG_FILE_BY_KEY);

const CATALOG_KEY_BY_ID = {
  items: "items",
  "eldoria-items": "eldoriaItems",
  "eldoria-items-index": "eldoriaItems",
  eldoriaItems: "eldoriaItems",
  "item-properties": "itemProperties",
  "magic-variants": "magicVariants",
  spells: "spells",
  classes: "classes",
  features: "features",
  races: "races",
  backgrounds: "backgrounds",
  feats: "feats"
};

const CATALOG_ID_BY_KEY = Object.fromEntries(
  Object.entries(CATALOG_KEY_BY_ID).map(([id, key]) => [key, id])
);

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function isWindowsDrivePath(value) {
  return /^[a-zA-Z]:[\\/]/.test(String(value ?? ""));
}

function hasUrlProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(String(value ?? "")) && !isWindowsDrivePath(value);
}

function isFileUrl(value) {
  return /^file:\/\//i.test(String(value ?? ""));
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function joinResourcePath(basePath, relativePath) {
  const base = normalizeString(basePath).replaceAll("\\", "/");
  const relative = normalizeString(relativePath).replaceAll("\\", "/");

  if (!base) {
    return relative;
  }

  if (!relative) {
    return base;
  }

  if (hasUrlProtocol(relative) || relative.startsWith("/")) {
    return relative;
  }

  if (hasUrlProtocol(base) && !isFileUrl(base)) {
    return new URL(relative, ensureTrailingSlash(base)).toString();
  }

  return `${base.replace(/\/+$/, "")}/${relative.replace(/^\/+/, "")}`;
}

function makeResult(patch = {}) {
  return {
    ok: false,
    reason: "",
    url: "",
    status: 0,
    missing: false,
    data: null,
    error: null,
    ...patch
  };
}

function getPathFileName(value) {
  const normalized = normalizeString(value).replaceAll("\\", "/");
  const fileName = normalized.split("/").filter(Boolean).pop();
  return fileName || "";
}

function normalizeCatalogKey(value) {
  const raw = normalizeString(value);
  return CATALOG_KEY_BY_ID[raw] ?? CATALOG_KEY_BY_ID[raw.toLowerCase()] ?? raw;
}

function normalizeCatalogKeys(value) {
  const keys = toArray(value).length ? toArray(value) : DEFAULT_RULES_CATALOG_KEYS;
  return [
    ...new Set(
      keys
        .map(normalizeCatalogKey)
        .filter((key) => RULES_CATALOG_FILE_BY_KEY[key])
    )
  ];
}

function getManifestCatalogEntries(manifest) {
  return toArray(manifest?.catalogs)
    .filter(isObject)
    .map((entry) => {
      const key = normalizeCatalogKey(entry.id);
      return key && RULES_CATALOG_FILE_BY_KEY[key]
        ? [key, entry]
        : null;
    })
    .filter(Boolean);
}

function getCatalogRelativePath(key, manifestCatalogs) {
  const entry = manifestCatalogs.get(key);
  return getPathFileName(entry?.path) || RULES_CATALOG_FILE_BY_KEY[key];
}

function getIndexedItemEntries(data) {
  return toArray(data?.items)
    .filter(isObject)
    .map((entry) => {
      const ref = normalizeString(entry.ref);
      const path = normalizeString(entry.path) || (ref ? `eldoria-items/${ref}` : "");
      return {
        ...entry,
        ref,
        path
      };
    })
    .filter((entry) => entry.path);
}

function summarizeResult(result) {
  return {
    ok: Boolean(result?.ok),
    reason: result?.reason || "",
    loadReason: result?.loadReason || "",
    url: result?.url || "",
    status: result?.status || 0,
    missing: Boolean(result?.missing),
    error: result?.error ? { ...result.error } : null
  };
}

function summarizeCatalogResult(result) {
  return {
    ...summarizeResult(result),
    key: result?.key || "",
    id: result?.id || "",
    relativePath: result?.relativePath || ""
  };
}

function normalizeManifestFailureReason(result) {
  if (result?.reason === "malformed-json") {
    return "rules-catalog-manifest-malformed";
  }

  return "rules-catalog-manifest-unavailable";
}

function normalizeCatalogFailureReason(result) {
  if (result?.reason === "malformed-json") {
    return "rules-catalog-file-malformed";
  }

  if (result?.reason === "indexed-catalog-file-unavailable") {
    return "rules-catalog-indexed-file-unavailable";
  }

  return "rules-catalog-file-unavailable";
}

export function normalizeRulesCatalogConfig(config = {}) {
  return {
    basePath: normalizeString(config.basePath ?? config.rulesCatalogBasePath),
    manifestFile: normalizeString(config.manifestFile ?? config.rulesCatalogManifestFile) || "rules-manifest.json",
    catalogKeys: normalizeCatalogKeys(config.catalogKeys ?? config.rulesCatalogKeys)
  };
}

export class RulesCatalogLoader {
  #config;
  #loadJson;

  constructor(config = {}) {
    this.#loadJson = typeof config.loadJson === "function"
      ? config.loadJson
      : async () => makeResult({ reason: "load-json-unavailable" });
    this.configure(config);
  }

  configure(config = {}) {
    this.#config = normalizeRulesCatalogConfig(config);
    if (typeof config.loadJson === "function") {
      this.#loadJson = config.loadJson;
    }
    return this;
  }

  get config() {
    return {
      ...this.#config,
      catalogKeys: [...this.#config.catalogKeys]
    };
  }

  resolveCatalogUrl(relativePath) {
    return joinResourcePath(this.#config.basePath, relativePath);
  }

  async #loadCatalogJson(key, relativePath, basePath) {
    const url = joinResourcePath(basePath, relativePath);
    const result = await this.#loadJson(url);
    if (!result.ok || key !== "eldoriaItems") {
      return result;
    }

    const indexedEntries = getIndexedItemEntries(result.data);
    const loadedItems = await Promise.all(indexedEntries.map(async (entry) => {
      const itemUrl = joinResourcePath(basePath, entry.path);
      const itemResult = await this.#loadJson(itemUrl);
      return {
        ...itemResult,
        ref: entry.ref,
        relativePath: entry.path
      };
    }));
    const failures = loadedItems.filter((itemResult) => !itemResult.ok);
    const items = loadedItems
      .filter((itemResult) => itemResult.ok)
      .map((itemResult) => itemResult.data);

    return {
      ...result,
      ok: failures.length === 0,
      reason: failures.length ? "indexed-catalog-file-unavailable" : result.reason,
      data: {
        ...result.data,
        items,
        itemFiles: indexedEntries,
        counts: {
          ...result.data?.counts,
          items: items.length
        },
        loadResults: {
          items: Object.fromEntries(
            loadedItems.map((itemResult) => [
              itemResult.ref || itemResult.relativePath,
              summarizeCatalogResult({
                ...itemResult,
                key: "eldoriaItems",
                id: "eldoria-items",
                relativePath: itemResult.relativePath
              })
            ])
          )
        },
        failures: failures.map((itemResult) => summarizeCatalogResult({
          ...itemResult,
          key: "eldoriaItems",
          id: "eldoria-items",
          relativePath: itemResult.relativePath
        }))
      }
    };
  }

  async loadCatalog(options = {}) {
    const config = normalizeRulesCatalogConfig({
      ...this.#config,
      ...options
    });

    if (!config.basePath) {
      return makeResult({
        reason: "rules-catalog-base-path-unavailable",
        data: {
          basePath: "",
          loadedAt: new Date().toISOString(),
          manifest: null,
          catalogs: {},
          catalogIndex: {},
          loadResults: {
            manifest: null,
            catalogs: {}
          },
          failures: []
        }
      });
    }

    const manifestUrl = joinResourcePath(config.basePath, config.manifestFile);
    const manifestResult = await this.#loadJson(manifestUrl);
    if (!manifestResult.ok) {
      const failureReason = normalizeManifestFailureReason(manifestResult);
      const failure = {
        ...manifestResult,
        reason: failureReason,
        loadReason: manifestResult.reason
      };
      return makeResult({
        ...manifestResult,
        reason: failureReason,
        data: {
          basePath: config.basePath,
          manifestUrl,
          loadedAt: new Date().toISOString(),
          manifest: null,
          catalogs: {},
          catalogIndex: {},
          loadResults: {
            manifest: summarizeResult(failure),
            catalogs: {}
          },
          failures: [summarizeResult(failure)]
        }
      });
    }

    const manifestCatalogs = new Map(getManifestCatalogEntries(manifestResult.data));
    const loaded = await Promise.all(config.catalogKeys.map(async (key) => {
      const relativePath = getCatalogRelativePath(key, manifestCatalogs);
      const result = await this.#loadCatalogJson(key, relativePath, config.basePath);
      const manifestEntry = manifestCatalogs.get(key) ?? {
        id: CATALOG_ID_BY_KEY[key] ?? key,
        path: RULES_CATALOG_FILE_BY_KEY[key]
      };
      const normalizedResult = result.ok
        ? result
        : {
            ...result,
            reason: normalizeCatalogFailureReason(result),
            loadReason: result.reason
          };

      return {
        key,
        id: manifestEntry.id ?? CATALOG_ID_BY_KEY[key] ?? key,
        relativePath,
        manifest: manifestEntry,
        ...normalizedResult
      };
    }));

    const failures = loaded.filter((result) => !result.ok);
    const catalogs = Object.fromEntries(
      loaded
        .filter((result) => result.ok)
        .map((result) => [result.key, result.data])
    );
    const catalogIndex = Object.fromEntries(
      loaded.map((result) => [
        result.key,
        {
          id: result.id,
          relativePath: result.relativePath,
          url: result.url,
          schema: result.data?.schema ?? result.manifest?.schema ?? "",
          schemaVersion: result.data?.schemaVersion ?? result.manifest?.schemaVersion ?? null,
          counts: result.data?.counts ?? result.manifest?.counts ?? {},
          loadResult: summarizeCatalogResult(result)
        }
      ])
    );
    const loadResults = {
      manifest: summarizeResult(manifestResult),
      catalogs: Object.fromEntries(
        loaded.map((result) => [result.key, summarizeCatalogResult(result)])
      )
    };

    return makeResult({
      ok: failures.length === 0,
      reason: failures.length ? "loaded-with-failures" : "loaded",
      url: manifestResult.url,
      status: manifestResult.status,
      data: {
        basePath: config.basePath,
        manifestUrl: manifestResult.url,
        loadedAt: new Date().toISOString(),
        manifest: manifestResult.data,
        catalogs,
        catalogIndex,
        loadResults,
        failures: failures.map(summarizeCatalogResult)
      }
    });
  }
}
