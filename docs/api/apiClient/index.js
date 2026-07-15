const DEFAULT_BASE_URL = "/api";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_GET_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 200;

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/u, "");
}

function normalizeNonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function wait(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function createRequestSignal(externalSignal, timeoutMs) {
  if (externalSignal) {
    return { cleanup() {}, signal: externalSignal, timedOut: () => false };
  }
  if (typeof AbortController === "undefined") {
    return { cleanup() {}, signal: undefined, timedOut: () => false };
  }

  const controller = new AbortController();
  let didTimeout = false;

  const timer = timeoutMs > 0
    ? setTimeout(() => {
        didTimeout = true;
        controller.abort(new Error(`Request timed out after ${timeoutMs} ms.`));
      }, timeoutMs)
    : null;

  return {
    signal: controller.signal,
    timedOut: () => didTimeout,
    cleanup() {
      if (timer) {
        clearTimeout(timer);
      }
    }
  };
}

function isRetryableRequestError(error, timedOut) {
  if (timedOut || error instanceof TypeError) {
    return true;
  }

  return error instanceof EldoriaApiError
    && [408, 425, 429, 500, 502, 503, 504].includes(error.status);
}

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/gu, "");
}

function joinUrl(baseUrl, path) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = trimSlashes(path);
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
}

function appendQuery(url, query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.filter((entry) => entry != null && entry !== "").forEach((entry) => params.append(key, String(entry)));
    } else if (value != null && value !== "") {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  if (!queryString) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

function normalizeDocumentId(id) {
  const value = String(id || "").trim();
  if (!value) {
    throw new TypeError("Character id is required.");
  }
  return value;
}

function normalizeKindParam(kind) {
  const value = String(kind || "").trim();
  if (!value) {
    throw new TypeError("Catalog kind is required.");
  }
  return value;
}

function normalizeEntityId(id) {
  const value = String(id || "").trim();
  if (!value) {
    throw new TypeError("Catalog entity id is required.");
  }
  return value;
}

function hasQueryValue(value) {
  return value != null && value !== "";
}

function normalizeODataList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(",");
  }
  return String(value || "").trim();
}

function normalizeODataOrderBy(value) {
  if (!Array.isArray(value)) {
    return normalizeODataList(value);
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }
      if (!entry || typeof entry !== "object") {
        return "";
      }

      const field = String(entry.field || entry.path || entry.name || "").trim();
      if (!field) {
        return "";
      }

      const direction = String(entry.direction || entry.dir || (entry.desc ? "desc" : "")).trim().toLowerCase();
      return direction ? `${field} ${direction}` : field;
    })
    .filter(Boolean)
    .join(",");
}

function setQueryValue(query, key, value, formatter = (input) => input) {
  if (hasQueryValue(value)) {
    const formatted = formatter(value);
    if (hasQueryValue(formatted)) {
      query[key] = formatted;
    }
  }
}

function pickFirstValue(source, keys) {
  for (const key of keys) {
    if (hasQueryValue(source[key])) {
      return source[key];
    }
  }
  return undefined;
}

function normalizeODataFilter(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  return createCatalogODataFilter(value);
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

export function formatODataLiteral(value) {
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return `'${String(value).replace(/'/gu, "''")}'`;
}

export function createCatalogODataFilter(filters = {}) {
  if (typeof filters === "string") {
    return filters.trim();
  }
  if (!filters || typeof filters !== "object") {
    return "";
  }

  const clauses = [];
  for (const [field, rawValue] of Object.entries(filters)) {
    if (!hasQueryValue(rawValue)) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      const matches = rawValue
        .filter(hasQueryValue)
        .map((value) => `${field} eq ${formatODataLiteral(value)}`);
      if (matches.length === 1) {
        clauses.push(matches[0]);
      } else if (matches.length > 1) {
        clauses.push(`(${matches.join(" or ")})`);
      }
      continue;
    }

    if (isPlainObject(rawValue)) {
      const operator = String(rawValue.operator || rawValue.op || "eq").trim();
      if (operator && hasQueryValue(rawValue.value)) {
        clauses.push(`${field} ${operator} ${formatODataLiteral(rawValue.value)}`);
      }
      continue;
    }

    clauses.push(`${field} eq ${formatODataLiteral(rawValue)}`);
  }

  return clauses.join(" and ");
}

export function createCatalogODataQuery(options = {}) {
  const source = options || {};
  const query = {};
  const aliases = new Set([
    "$filter", "filter", "filters",
    "$orderby", "orderby", "orderBy", "sort",
    "$select", "select", "fields",
    "$expand", "expand", "include",
    "$skip", "skip",
    "$skiptoken", "skiptoken", "skipToken",
    "$top", "top", "limit",
    "$count", "count", "includeCount",
    "q", "search"
  ]);

  for (const [key, value] of Object.entries(source)) {
    if (!aliases.has(key)) {
      setQueryValue(query, key, value);
    }
  }

  setQueryValue(query, "$filter", pickFirstValue(source, ["$filter", "filter", "filters"]), normalizeODataFilter);
  setQueryValue(query, "$orderby", pickFirstValue(source, ["$orderby", "orderby", "orderBy", "sort"]), normalizeODataOrderBy);
  setQueryValue(query, "$select", pickFirstValue(source, ["$select", "select", "fields"]), normalizeODataList);
  setQueryValue(query, "$expand", pickFirstValue(source, ["$expand", "expand", "include"]), normalizeODataList);
  setQueryValue(query, "$skip", pickFirstValue(source, ["$skip", "skip"]));
  setQueryValue(query, "$skiptoken", pickFirstValue(source, ["$skiptoken", "skiptoken", "skipToken"]));
  setQueryValue(query, "$top", pickFirstValue(source, ["$top", "top", "limit"]));
  setQueryValue(query, "$count", pickFirstValue(source, ["$count", "count", "includeCount"]));
  setQueryValue(query, "q", pickFirstValue(source, ["q", "search"]));

  return query;
}

export function getCatalogODataItems(response) {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.value)) {
    return response.value;
  }
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  return [];
}

export function getCatalogODataNextLink(response) {
  return String(response?.["@odata.nextLink"] || "");
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}

export class EldoriaApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "EldoriaApiError";
    this.status = details.status || 0;
    this.method = details.method || "GET";
    this.url = details.url || "";
    this.body = details.body;
  }
}

export class EldoriaApiClient {
  constructor(options = {}) {
    const config = typeof options === "string" ? { baseUrl: options } : options;
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.fetch = config.fetch || globalThis.fetch?.bind(globalThis);
    this.functionKey = String(config.functionKey || "").trim();
    this.requestTimeoutMs = normalizeNonNegativeNumber(config.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS);
    this.getRetries = Math.floor(normalizeNonNegativeNumber(config.getRetries, DEFAULT_GET_RETRIES));
    this.retryDelayMs = normalizeNonNegativeNumber(config.retryDelayMs, DEFAULT_RETRY_DELAY_MS);
    this.defaultHeaders = {
      ...(config.defaultHeaders || {})
    };

    if (!this.fetch) {
      throw new TypeError("A fetch implementation is required.");
    }
  }

  url(path, query = {}) {
    const url = joinUrl(this.baseUrl, path);
    return appendQuery(url, query);
  }

  async request(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const url = this.url(path, options.query);
    const headers = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...(options.headers || {})
    };

    const init = {
      method,
      headers
    };

    if (this.functionKey) {
      headers["x-functions-key"] = this.functionKey;
    }

    if (options.body !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      init.body = typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body, null, 2);
    }

    const timeoutMs = normalizeNonNegativeNumber(options.timeoutMs, this.requestTimeoutMs);
    const retries = method === "GET"
      ? Math.floor(normalizeNonNegativeNumber(options.retries, this.getRetries))
      : 0;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const requestSignal = createRequestSignal(options.signal, timeoutMs);
      try {
        const response = await this.fetch(url, {
          ...init,
          signal: requestSignal.signal
        });
        const body = await parseResponseBody(response);

        if (!response.ok) {
          const message = body?.error || body?.message || `${response.status} ${response.statusText}`;
          throw new EldoriaApiError(message, {
            status: response.status,
            method,
            url,
            body
          });
        }

        return body;
      } catch (error) {
        const externalAbort = Boolean(options.signal?.aborted);
        const canRetry = !externalAbort
          && attempt < retries
          && isRetryableRequestError(error, requestSignal.timedOut());
        if (!canRetry) {
          throw error;
        }
        await wait(this.retryDelayMs * (attempt + 1));
      } finally {
        requestSignal.cleanup();
      }
    }

    throw new EldoriaApiError("Request failed.", { method, url });
  }

  health() {
    return this.request("health");
  }

  getPlayersManifest() {
    return this.request("players");
  }

  savePlayersManifest(manifest) {
    return this.request("players", {
      method: "PUT",
      body: manifest
    });
  }

  listCharacters() {
    return this.request("characters");
  }

  getCatalogManifest() {
    return this.request("catalog");
  }

  listCatalog(kind, query = {}) {
    return this.request(`catalog/${encodeURIComponent(normalizeKindParam(kind))}`, { query });
  }

  listCatalogFull(kind, query = {}) {
    return this.listCatalog(kind, { ...query, full: true });
  }

  searchCatalog(kind, q, query = {}) {
    return this.listCatalog(kind, { ...query, q });
  }

  searchItems(q = "", query = {}, options = {}) {
    return this.request("catalog/items", {
      query: { ...query, ...(q ? { q } : {}) },
      signal: options.signal
    });
  }

  searchCatalogFull(kind, q, query = {}) {
    return this.listCatalogFull(kind, { ...query, q });
  }

  listCatalogOData(kind, query = {}) {
    return this.request(this.#catalogODataPath(kind), {
      query: createCatalogODataQuery(query)
    });
  }

  searchCatalogOData(kind, q, query = {}) {
    return this.listCatalogOData(kind, { ...query, q });
  }

  filterCatalogOData(kind, filters, query = {}) {
    return this.listCatalogOData(kind, {
      ...query,
      filter: createCatalogODataFilter(filters)
    });
  }

  async listCatalogODataItems(kind, query = {}) {
    return getCatalogODataItems(await this.listCatalogOData(kind, query));
  }

  getCatalogODataUrl(kind, query = {}) {
    return this.url(this.#catalogODataPath(kind), createCatalogODataQuery(query));
  }

  getCatalogEntity(kind, id) {
    const path = `catalog/${encodeURIComponent(normalizeKindParam(kind))}/${encodeURIComponent(normalizeEntityId(id))}`;
    return this.request(path);
  }

  createCatalogEntity(kind, entity, options = {}) {
    return this.request(`catalog/${encodeURIComponent(normalizeKindParam(kind))}`, {
      method: "POST",
      query: options.upsert ? { upsert: true } : {},
      body: entity
    });
  }

  upsertCatalogEntity(kind, entity) {
    return this.createCatalogEntity(kind, entity, { upsert: true });
  }

  patchCatalogEntity(kind, id, patch) {
    const path = `catalog/${encodeURIComponent(normalizeKindParam(kind))}/${encodeURIComponent(normalizeEntityId(id))}`;
    return this.request(path, {
      method: "PATCH",
      body: patch
    });
  }

  getPublicIndex(kind) {
    return this.request(`public-index/${encodeURIComponent(normalizeKindParam(kind))}`);
  }

  getLocationIndex() {
    return this.getPublicIndex("locations");
  }

  getNpcIndex() {
    return this.getPublicIndex("npcs");
  }

  getCharacterSheet(id) {
    return this.request(this.#characterSheetPath(id));
  }

  saveCharacterSheet(id, characterSheet, options = {}) {
    const method = String(options.method || "POST").toUpperCase();
    const useSimpleCorsBody = method === "POST" && options.simpleCors !== false;
    const path = this.#characterSheetPath(id);
    const requestOptions = {
      method,
      headers: useSimpleCorsBody
        ? { "Content-Type": "text/plain" }
        : undefined,
      body: useSimpleCorsBody
        ? JSON.stringify(characterSheet, null, 2)
        : characterSheet
    };

    return this.request(path, requestOptions)
      .catch((error) => {
        const shouldRetryWithPut = useSimpleCorsBody
          && options.fallbackToPut !== false
          && (error?.status === 404 || error?.status === 405);

        if (!shouldRetryWithPut) {
          throw error;
        }

        return this.request(path, {
          method: "PUT",
          body: characterSheet
        });
      });
  }

  deleteCharacterSheet(id) {
    return this.request(this.#characterSheetPath(id), {
      method: "DELETE"
    });
  }

  getLoaderConfig() {
    return {
      characterBaseUrl: this.url("characters/{id}"),
      saveMethod: "POST"
    };
  }

  #characterSheetPath(id) {
    const encodedId = encodeURIComponent(normalizeDocumentId(id));
    return `characters/${encodedId}`;
  }

  #catalogODataPath(kind) {
    return `catalog/${encodeURIComponent(normalizeKindParam(kind))}/odata`;
  }
}

export function createEldoriaApiClient(options = {}) {
  return new EldoriaApiClient(options);
}

if (typeof globalThis !== "undefined") {
  globalThis.EldoriaApiClient = EldoriaApiClient;
  globalThis.createEldoriaApiClient = createEldoriaApiClient;
  globalThis.createCatalogODataFilter = createCatalogODataFilter;
  globalThis.createCatalogODataQuery = createCatalogODataQuery;
  globalThis.formatODataLiteral = formatODataLiteral;
  globalThis.getCatalogODataItems = getCatalogODataItems;
  globalThis.getCatalogODataNextLink = getCatalogODataNextLink;
}
