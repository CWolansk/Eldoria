"use strict";

const {
  getEntity,
  listCatalog,
  listCatalogFull,
  listCatalogODataFull,
  listManifest,
  upsertEntity
} = require("./tableStore");
const { searchItemsByIndex } = require("./itemSearchStore");
const { searchItemsV2 } = require("./itemSearchV2Store");
const model = require("./catalogModel");
const { httpError, json, withErrors } = require("./http");

// Query params consumed by the endpoint itself; everything else is treated as a
// structured equality filter against an index column (unknown columns ignored).
const RESERVED_PARAMS = new Set([
  "q",
  "limit",
  "skip",
  "offset",
  "kind",
  "full",
  "upsert",
  "$filter",
  "$top",
  "$skip",
  "$skiptoken",
  "$orderby",
  "$select",
  "$expand",
  "$count",
  "sort",
  "cursor",
  "facets"
]);

const DEFAULT_MAX_CATALOG_BODY_BYTES = 2 * 1024 * 1024;
const MAX_CATALOG_SKIP = 250000;
const MAX_ODATA_TOP = 1000;
const MAX_ODATA_SKIP = 250000;
const MAX_ODATA_SELECT_FIELDS = 100;
const MAX_ODATA_ORDER_FIELDS = 8;

function getMaxCatalogBodyBytes() {
  const configured = Number(process.env.ELDORIA_CATALOG_MAX_BODY_BYTES || process.env.ELDORIA_MAX_BODY_BYTES || DEFAULT_MAX_CATALOG_BODY_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_CATALOG_BODY_BYTES;
}

function getSearchParams(request) {
  return new URL(request.url).searchParams;
}

function getKind(request) {
  return model.normalizeKind(request.params?.kind);
}

function getId(request) {
  const id = String(request.params?.id || "").trim();
  if (!id) {
    throw httpError(400, "Catalog entity id is required.");
  }
  return id;
}

function getFilters(searchParams) {
  const filters = {};
  for (const [key, value] of searchParams.entries()) {
    if (!RESERVED_PARAMS.has(key)) {
      filters[key] = value;
    }
  }
  return filters;
}

const ITEM_FILTER_FIELDS = ["source", "rarity", "type", "attunement", "damage", "properties", "mastery"];

function getItemFilters(searchParams) {
  const filters = {};
  for (const field of ITEM_FILTER_FIELDS) {
    const values = searchParams.getAll(field)
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    if (values.length) filters[field] = values;
  }
  return filters;
}

function getLimit(searchParams) {
  const raw = Number(searchParams.get("limit"));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

function getSkip(searchParams) {
  const raw = Number(searchParams.get("skip") || searchParams.get("offset"));
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  const skip = Math.floor(raw);
  if (skip > MAX_CATALOG_SKIP) {
    throw httpError(400, "skip is too large.", {
      max: MAX_CATALOG_SKIP
    });
  }
  return skip;
}

function createPagedCatalogResponse(kind, items, { limit = 0, skip = 0 } = {}) {
  const pageLimit = Number(limit) > 0 ? Math.floor(Number(limit)) : 0;
  const pageSkip = Number(skip) > 0 ? Math.floor(Number(skip)) : 0;
  const hasMore = pageLimit > 0 && items.length > pageLimit;
  const pageItems = hasMore ? items.slice(0, pageLimit) : items;
  const response = {
    kind,
    count: pageItems.length,
    items: pageItems
  };

  if (pageSkip || pageLimit) {
    response.skip = pageSkip;
    response.limit = pageLimit;
    response.hasMore = hasMore;
    if (hasMore) {
      response.nextSkip = pageSkip + pageItems.length;
    }
  }

  return response;
}

function createItemSearchV2Response(kind, result) {
  const response = {
    kind,
    count: result.items.length,
    items: result.items,
    totalCount: result.totalCount,
    skip: result.skip,
    limit: result.limit,
    hasMore: result.hasMore,
    searchVersion: result.version
  };
  if (result.nextSkip !== undefined) response.nextSkip = result.nextSkip;
  if (result.nextCursor) response.nextCursor = result.nextCursor;
  if (result.facets) response.facets = result.facets;
  return response;
}

function getODataLimit(searchParams) {
  const raw = Number(searchParams.get("$top") || searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  const top = Math.floor(raw);
  if (top > MAX_ODATA_TOP) {
    throw httpError(400, "$top is too large.", {
      max: MAX_ODATA_TOP
    });
  }
  return top;
}

function getODataSkip(searchParams) {
  const raw = Number(searchParams.get("$skip") || searchParams.get("$skiptoken"));
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  const skip = Math.floor(raw);
  if (skip > MAX_ODATA_SKIP) {
    throw httpError(400, "$skip is too large.", {
      max: MAX_ODATA_SKIP
    });
  }
  return skip;
}

function getODataFilter(searchParams) {
  const filter = String(searchParams.get("$filter") || "").trim();
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(filter)) {
    throw httpError(400, "OData filter contains invalid control characters.");
  }
  if (filter.length > 4000) {
    throw httpError(400, "OData filter is too long.", {
      maxLength: 4000
    });
  }
  return filter;
}

function getFull(searchParams) {
  return /^(1|true|yes)$/iu.test(String(searchParams.get("full") || ""));
}

function getUpsert(searchParams) {
  return /^(1|true|yes)$/iu.test(String(searchParams.get("upsert") || ""));
}

function getBooleanParam(searchParams, name) {
  return /^(1|true|yes)$/iu.test(String(searchParams.get(name) || ""));
}

function hasStructuredFilters(filters) {
  return Object.values(filters || {}).some((value) => value !== undefined && value !== null && value !== "");
}

function logSearchIndexFallback(context, result) {
  if (!result || result.reason !== "error") {
    return;
  }

  const message = `Item search index failed; falling back to catalog scan. ${result.error?.message || ""}`.trim();
  if (context?.log?.warn) {
    context.log.warn(message);
  } else if (typeof context?.log === "function") {
    context.log(message);
  }
}

function normalizeODataPath(path) {
  const normalized = String(path || "").trim().replace(/\//gu, ".");
  if (!normalized) {
    return "";
  }
  if (normalized.split(".").some((segment) => !segment)) {
    throw httpError(400, "OData path contains an empty segment.", {
      path
    });
  }
  if (!/^[A-Za-z_$][A-Za-z0-9_$.-]*$/u.test(normalized)) {
    throw httpError(400, "OData path contains unsupported characters.", {
      path
    });
  }
  return normalized;
}

function parseODataListParam(raw, optionName, maxItems = MAX_ODATA_SELECT_FIELDS) {
  const value = String(raw || "").trim();
  if (!value) {
    return [];
  }
  const paths = [];
  const seen = new Set();
  for (const part of value.split(",")) {
    const withoutOptions = part.trim().replace(/\(.+\)$/u, "");
    const path = normalizeODataPath(withoutOptions);
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    paths.push(path);
  }
  if (paths.length > maxItems) {
    throw httpError(400, `${optionName} has too many fields.`, {
      maxItems
    });
  }
  return paths;
}

function getODataSelect(searchParams) {
  const raw = String(searchParams.get("$select") || "").trim();
  if (raw === "*") {
    return ["*"];
  }
  return parseODataListParam(raw, "$select");
}

function getODataExpand(searchParams) {
  const raw = String(searchParams.get("$expand") || "").trim();
  if (raw === "*") {
    return ["*"];
  }
  return parseODataListParam(raw, "$expand");
}

function getODataOrderBy(searchParams) {
  const value = String(searchParams.get("$orderby") || "").trim();
  if (!value) {
    return [];
  }

  const fields = [];
  for (const part of value.split(",")) {
    const tokens = part.trim().split(/\s+/u).filter(Boolean);
    if (!tokens.length) {
      continue;
    }
    if (tokens.length > 2) {
      throw httpError(400, "$orderby entries must be '<field> [asc|desc]'.", {
        value: part.trim()
      });
    }
    const path = normalizeODataPath(tokens[0]);
    const direction = String(tokens[1] || "asc").toLowerCase();
    if (direction !== "asc" && direction !== "desc") {
      throw httpError(400, "$orderby direction must be asc or desc.", {
        value: part.trim()
      });
    }
    fields.push({
      path,
      direction
    });
  }

  if (fields.length > MAX_ODATA_ORDER_FIELDS) {
    throw httpError(400, "$orderby has too many fields.", {
      maxItems: MAX_ODATA_ORDER_FIELDS
    });
  }
  return fields;
}

function getPathValue(value, path) {
  let current = value;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function setPathValue(target, path, value) {
  const segments = path.split(".");
  let current = target;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (index === segments.length - 1) {
      current[segment] = value;
      return;
    }
    if (!isObject(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }
}

function compareScalar(left, right) {
  if (left === right) {
    return 0;
  }
  if (left === undefined || left === null || left === "") {
    return 1;
  }
  if (right === undefined || right === null || right === "") {
    return -1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left < right ? -1 : 1;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function sortByOrder(items, orderBy) {
  if (!orderBy.length) {
    return items;
  }
  return [...items].sort((left, right) => {
    for (const order of orderBy) {
      const comparison = compareScalar(getPathValue(left, order.path), getPathValue(right, order.path));
      if (comparison !== 0) {
        return order.direction === "desc" ? -comparison : comparison;
      }
    }
    return compareScalar(left.id || left.name, right.id || right.name);
  });
}

function projectODataItem(item, select, expand) {
  if (!select.length) {
    return item;
  }
  if (select.includes("*") || expand.includes("*")) {
    return item;
  }

  const projected = {};
  for (const path of [...select, ...expand]) {
    const value = getPathValue(item, path);
    if (value !== undefined) {
      setPathValue(projected, path, value);
    }
  }
  return projected;
}

function applyODataProjection(items, select, expand) {
  if (!select.length && !expand.length) {
    return items;
  }
  return items.map((item) => projectODataItem(item, select, expand));
}

function buildODataNextLink(request, skip, top, pageCount, hasMore) {
  if (!top || !hasMore) {
    return null;
  }
  const url = new URL(request.url);
  url.searchParams.set("$skip", String(skip + pageCount));
  if (!url.searchParams.has("$top") && !url.searchParams.has("limit")) {
    url.searchParams.set("$top", String(top));
  }
  return url.toString();
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

async function readRequestJson(request) {
  const maxBodyBytes = getMaxCatalogBodyBytes();
  const contentLength = Number(request.headers?.get?.("content-length") || 0);
  if (contentLength > maxBodyBytes) {
    throw httpError(413, "Request body is too large.", { maxBodyBytes });
  }

  const raw = await request.text();
  if (!raw.trim()) {
    throw httpError(400, "Request body must be valid JSON.");
  }

  if (Buffer.byteLength(raw, "utf8") > maxBodyBytes) {
    throw httpError(413, "Request body is too large.", { maxBodyBytes });
  }

  try {
    const body = JSON.parse(raw);
    if (!isObject(body)) {
      throw new Error("JSON payload must be an object.");
    }
    return body;
  } catch (error) {
    throw httpError(400, "Request body must be a JSON object.", {
      cause: error.message
    });
  }
}

function validateCatalogDocument(document) {
  if (!isObject(document)) {
    throw httpError(400, "Catalog entity must be a JSON object.");
  }
  if (!String(document.name || "").trim()) {
    throw httpError(400, "Catalog entity must include a non-empty name.");
  }
  if (!String(document.source || "").trim()) {
    throw httpError(400, "Catalog entity must include a non-empty source.");
  }
}

function applyJsonMergePatch(target, patch) {
  const output = { ...(isObject(target) ? target : {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete output[key];
      continue;
    }
    output[key] = isObject(value)
      ? applyJsonMergePatch(isObject(output[key]) ? output[key] : {}, value)
      : value;
  }
  return output;
}

async function catalogManifestHandler(request, context) {
  return withErrors(request, context, async () => {
    const catalogs = await listManifest();
    return json(request, 200, {
      count: catalogs.length,
      catalogs
    });
  });
}

async function catalogListHandler(request, context) {
  return withErrors(request, context, async () => {
    if (request.method === "POST") {
      const kind = getKind(request);
      const searchParams = getSearchParams(request);
      const body = await readRequestJson(request);
      validateCatalogDocument(body);

      const entity = model.toTableEntity(kind, body);
      const existing = await getEntity(kind, entity.entityId);
      if (existing && !getUpsert(searchParams)) {
        throw httpError(409, "Catalog entity already exists. Use PATCH to update it or POST with ?upsert=true to replace it.", {
          kind,
          id: entity.entityId
        });
      }

      const stored = await upsertEntity(kind, body, { entityId: entity.entityId });
      return json(request, existing ? 200 : 201, {
        kind,
        id: stored.id,
        entity: stored.entity
      });
    }

    if (request.method !== "GET") {
      throw httpError(405, "Method not allowed.");
    }

    const kind = getKind(request);
    const searchParams = getSearchParams(request);
    const full = getFull(searchParams);
    const q = searchParams.get("q") || "";
    const filters = getFilters(searchParams);
    const limit = getLimit(searchParams);
    const skip = getSkip(searchParams);
    const cursor = String(searchParams.get("cursor") || "").trim();
    if (cursor && skip) {
      throw httpError(400, "cursor and skip cannot be used together.");
    }
    const pageLimit = limit ? limit + 1 : 0;
    if (!full && kind === "items") {
      const searchStartedAt = Date.now();
      const v2 = await searchItemsV2({
        q,
        filters: getItemFilters(searchParams),
        sort: String(searchParams.get("sort") || "").trim().toLowerCase(),
        cursor,
        skip,
        limit: limit || 50,
        includeFacets: getBooleanParam(searchParams, "facets")
      });
      if (v2.used) {
        if (typeof context?.log === "function") {
          context.log(`item-search-v2 durationMs=${Date.now() - searchStartedAt} count=${v2.items.length} totalCount=${v2.totalCount} hasMore=${v2.hasMore}`);
        }
        return json(request, 200, createItemSearchV2Response(kind, v2));
      }
      logSearchIndexFallback(context, v2);
    }
    if (!full && kind === "items" && q && !hasStructuredFilters(filters)) {
      const indexed = await searchItemsByIndex(q, { limit: pageLimit, skip });
      if (indexed.used) {
        return json(request, 200, createPagedCatalogResponse(kind, indexed.items, { limit, skip }));
      }
      logSearchIndexFallback(context, indexed);
    }

    const list = full ? listCatalogFull : listCatalog;
    const items = await list(kind, {
      filters,
      q,
      limit: pageLimit,
      skip
    });
    return json(request, 200, createPagedCatalogResponse(kind, items, { limit, skip }));
  });
}

async function catalogODataListHandler(request, context) {
  return withErrors(request, context, async () => {
    if (request.method !== "GET") {
      throw httpError(405, "Method not allowed.");
    }

    const kind = getKind(request);
    const searchParams = getSearchParams(request);
    const top = getODataLimit(searchParams);
    const skip = getODataSkip(searchParams);
    const select = getODataSelect(searchParams);
    const expand = getODataExpand(searchParams);
    const orderBy = getODataOrderBy(searchParams);
    const includeCount = getBooleanParam(searchParams, "$count");
    const filter = getODataFilter(searchParams);
    const q = searchParams.get("q") || "";
    const requiresFullScan = includeCount || orderBy.length > 0;
    let pageItems;
    let totalCount;
    let hasMore = false;

    if (requiresFullScan) {
      const filteredItems = await listCatalogODataFull(kind, { filter, q });
      const orderedItems = sortByOrder(filteredItems, orderBy);
      totalCount = orderedItems.length;
      pageItems = orderedItems.slice(skip, top ? skip + top : undefined);
      hasMore = top > 0 && skip + pageItems.length < totalCount;
    } else {
      const pageLimit = top ? top + 1 : 0;
      const streamedItems = await listCatalogODataFull(kind, {
        filter,
        q,
        skip,
        limit: pageLimit
      });
      hasMore = top > 0 && streamedItems.length > top;
      pageItems = hasMore ? streamedItems.slice(0, top) : streamedItems;
    }

    const items = applyODataProjection(pageItems, select, expand);
    const nextLink = buildODataNextLink(request, skip, top, pageItems.length, hasMore);

    const response = {
      kind,
      count: items.length,
      value: items,
      items
    };
    if (includeCount) {
      response["@odata.count"] = totalCount;
      response.totalCount = totalCount;
    }
    if (nextLink) {
      response["@odata.nextLink"] = nextLink;
    }
    return json(request, 200, response);
  });
}

async function catalogEntityHandler(request, context) {
  return withErrors(request, context, async () => {
    const kind = getKind(request);
    const id = getId(request);
    // Azure Functions can route /catalog/{kind}/odata to this generic entity
    // handler; preserve the public OData URL even when route precedence shifts.
    if (id.toLowerCase() === "odata") {
      return catalogODataListHandler(request, context);
    }

    const entity = await getEntity(kind, id);
    if (!entity) {
      return json(request, 404, {
        error: "Catalog entity not found."
      });
    }

    if (request.method === "PATCH") {
      const patch = await readRequestJson(request);
      const merged = applyJsonMergePatch(entity, patch);
      validateCatalogDocument(merged);
      const stored = await upsertEntity(kind, merged, { entityId: id });
      return json(request, 200, {
        kind,
        id: stored.id,
        entity: stored.entity
      });
    }

    if (request.method !== "GET") {
      throw httpError(405, "Method not allowed.");
    }

    return json(request, 200, entity);
  });
}

module.exports = {
  catalogManifestHandler,
  catalogListHandler,
  catalogODataListHandler,
  catalogEntityHandler
};
