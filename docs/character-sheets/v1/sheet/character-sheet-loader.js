import { deepClone, normalizeCharacter, stringifyJson } from "../shared/character-state.js";
import { RulesCatalogLoader } from "../shared/rules-catalog-loader.js";

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function isBrowserRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isWindowsDrivePath(value) {
  return /^[a-zA-Z]:[\\/]/.test(String(value ?? ""));
}

function hasUrlProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(String(value ?? "")) && !isWindowsDrivePath(value);
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? ""));
}

function isFileUrl(value) {
  return /^file:\/\//i.test(String(value ?? ""));
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function isJsonPath(value) {
  return /\.json(?:[?#].*)?$/i.test(String(value ?? ""));
}

function isBrowserFilePage() {
  return isBrowserRuntime() && window.location?.protocol === "file:";
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

export function resolveManifestRelativeUrl(rawUrl, manifestUrl = "") {
  const value = normalizeString(rawUrl);
  if (!value) {
    return "";
  }

  if (hasUrlProtocol(value)) {
    return value;
  }

  const runtimeBase = isBrowserRuntime() ? window.location.href : "";
  const baseUrl = normalizeString(manifestUrl) || runtimeBase;

  if (value.startsWith("/")) {
    const deployRelativeUrl = `../../${value.replace(/^\/+/, "")}`;
    return baseUrl ? new URL(deployRelativeUrl, baseUrl).href : deployRelativeUrl;
  }

  return baseUrl ? new URL(value, baseUrl).href : value;
}

function replacePathTokens(template, characterId) {
  const encodedId = encodeURIComponent(characterId);
  return template
    .replaceAll("{characterId}", encodedId)
    .replaceAll("{id}", encodedId)
    .replaceAll(":characterId", encodedId)
    .replaceAll(":id", encodedId);
}

function makeResult(patch = {}) {
  return {
    ok: false,
    reason: "",
    url: "",
    status: 0,
    missing: false,
    data: null,
    dto: null,
    issues: [],
    error: null,
    ...patch
  };
}

function createIssue(severity, code, message, details = {}) {
  return {
    severity,
    code,
    message,
    details
  };
}

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name ?? "Error",
    message: error.message ?? String(error),
    code: error.code ?? ""
  };
}

async function readLocalText(resourceUrl) {
  const fs = await import("node:fs/promises");
  const url = await import("node:url");
  const path = isFileUrl(resourceUrl) ? url.fileURLToPath(resourceUrl) : resourceUrl;
  return fs.readFile(path, "utf8");
}

async function writeLocalText(resourceUrl, payload) {
  const fs = await import("node:fs/promises");
  const pathModule = await import("node:path");
  const url = await import("node:url");
  const path = isFileUrl(resourceUrl) ? url.fileURLToPath(resourceUrl) : resourceUrl;
  await fs.mkdir(pathModule.dirname(path), { recursive: true });
  await fs.writeFile(path, payload, "utf8");
}

function shouldUseLocalFileSystem(resourceUrl) {
  if (isBrowserRuntime()) {
    return false;
  }

  return isFileUrl(resourceUrl) || (!isHttpUrl(resourceUrl) && !hasUrlProtocol(resourceUrl));
}

function shouldReportStaticBrowserSaveUnavailable(resourceUrl) {
  if (!isBrowserRuntime()) {
    return false;
  }

  return isFileUrl(resourceUrl) || (isBrowserFilePage() && !isHttpUrl(resourceUrl));
}

function parseJsonText(text, url, status = 0) {
  try {
    return makeResult({
      ok: true,
      reason: "loaded",
      url,
      status,
      data: JSON.parse(text)
    });
  } catch (error) {
    return makeResult({
      reason: "malformed-json",
      url,
      status,
      error: normalizeError(error)
    });
  }
}

function collectCharacterDtoIssues(rawDto, dto, requestedId) {
  const issues = [];

  if (!isObject(rawDto)) {
    issues.push(createIssue(
      "error",
      "invalid-character-dto",
      "Character DTO must be a JSON object.",
      { actualType: Array.isArray(rawDto) ? "array" : typeof rawDto }
    ));
    return issues;
  }

  if (normalizeString(rawDto.schemaVersion) !== "v1") {
    issues.push(createIssue(
      "warning",
      "unsupported-schema-version",
      `Expected schemaVersion "v1"; found "${normalizeString(rawDto.schemaVersion) || "blank"}".`,
      { schemaVersion: rawDto.schemaVersion }
    ));
  }

  if (!normalizeString(rawDto.id)) {
    issues.push(createIssue(
      "error",
      "missing-character-id",
      "Character DTO id is blank.",
      { normalizedId: dto?.id ?? "" }
    ));
  }

  const requested = normalizeString(requestedId);
  const loaded = normalizeString(rawDto.id ?? dto?.id);
  if (requested && loaded && requested !== loaded) {
    issues.push(createIssue(
      "warning",
      "character-id-mismatch",
      `Loaded character id "${loaded}" does not match requested id "${requested}".`,
      {
        requestedId: requested,
        loadedId: loaded
      }
    ));
  }

  return issues;
}

function hasBlockingDtoIssue(issues = []) {
  return issues.some((issue) => issue?.severity === "error" && issue?.code === "invalid-character-dto");
}

export class CharacterSheetLoaderError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CharacterSheetLoaderError";
    this.code = details.code ?? "character-sheet-loader-error";
    this.details = { ...details };
  }
}

/**
 * Loading and saving abstraction for final playable character DTOs.
 * Phase 1 keeps this small but establishes the same URL/result shape that the
 * full persistence layer will expand in Phase 2.
 */
export class CharacterSheetLoader {
  #config;

  constructor(config = {}) {
    this.configure(config);
  }

  configure(config = {}) {
    this.#config = { ...config };
    return this;
  }

  get config() {
    return { ...this.#config };
  }

  resolveCharacterUrl(characterId = this.#config.characterId) {
    return this.#resolveCollectionUrl(
      this.#config.characterUrl || this.#config.characterBaseUrl,
      characterId
    );
  }

  #resolveCollectionUrl(baseUrl, itemId) {
    const base = normalizeString(baseUrl);
    const id = normalizeString(itemId);

    if (!base) {
      return "";
    }

    if (!id) {
      return isJsonPath(base) ? base : "";
    }

    const resolvedTemplate = replacePathTokens(base, id);
    if (resolvedTemplate !== base || isJsonPath(resolvedTemplate)) {
      return resolvedTemplate;
    }

    return joinResourcePath(base, `${encodeURIComponent(id)}.json`);
  }

  async loadJson(resourceUrl) {
    const url = normalizeString(resourceUrl);
    if (!url) {
      return makeResult({ reason: "missing-url" });
    }

    try {
      if (shouldUseLocalFileSystem(url)) {
        const text = await readLocalText(url);
        return parseJsonText(text, url);
      }

      if (typeof fetch !== "function") {
        return makeResult({
          reason: "fetch-unavailable",
          url
        });
      }

      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        }
      });

      if (response.status === 404) {
        return makeResult({
          reason: "not-found",
          url,
          status: response.status,
          missing: true
        });
      }

      if (!response.ok) {
        return makeResult({
          reason: "http-error",
          url,
          status: response.status
        });
      }

      const responseText = await response.text();
      const parsed = parseJsonText(responseText, url, response.status);
      if (!parsed.ok) {
        return parsed;
      }

      return makeResult({
        ok: true,
        reason: "loaded",
        url,
        status: response.status,
        data: parsed.data
      });
    } catch (error) {
      const missing = error?.code === "ENOENT";
      return makeResult({
        reason: missing ? "not-found" : "load-failed",
        url,
        missing,
        error: normalizeError(error)
      });
    }
  }

  async saveJson(resourceUrl, payload, options = {}) {
    const url = normalizeString(resourceUrl);
    if (!url) {
      return makeResult({
        reason: "save-endpoint-unavailable",
        data: deepClone(payload)
      });
    }

    const body = stringifyJson(payload);

    try {
      if (shouldReportStaticBrowserSaveUnavailable(url)) {
        return makeResult({
          reason: "save-endpoint-unavailable",
          url,
          data: deepClone(payload)
        });
      }

      if (shouldUseLocalFileSystem(url)) {
        await writeLocalText(url, `${body}\n`);
        return makeResult({
          ok: true,
          reason: "saved",
          url,
          data: deepClone(payload)
        });
      }

      if (typeof fetch !== "function") {
        return makeResult({
          reason: "fetch-unavailable",
          url,
          data: deepClone(payload)
        });
      }

      const method = normalizeString(options.method ?? this.#config.saveMethod) || "PUT";
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body
      });

      if (!response.ok) {
        return makeResult({
          reason: response.status === 404 || response.status === 405
            ? "save-endpoint-unavailable"
            : "save-failed",
          url,
          status: response.status,
          data: deepClone(payload)
        });
      }

      let data = deepClone(payload);
      const responseText = await response.text();
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (_error) {
          data = deepClone(payload);
        }
      }

      return makeResult({
        ok: true,
        reason: "saved",
        url,
        status: response.status,
        data
      });
    } catch (error) {
      const reason = shouldReportStaticBrowserSaveUnavailable(url)
        ? "save-endpoint-unavailable"
        : "save-failed";
      return makeResult({
        reason,
        url,
        data: deepClone(payload),
        error: normalizeError(error)
      });
    }
  }

  async loadRulesCatalog(options = {}) {
    const preloadedCatalog = this.#config.rulesCatalog ?? this.#config.normalizedCatalog;
    if (isObject(preloadedCatalog)) {
      return makeResult({
        ok: true,
        reason: "preloaded-rules-catalog",
        data: preloadedCatalog
      });
    }

    const catalogLoader = new RulesCatalogLoader({
      rulesCatalogBasePath: this.#config.rulesCatalogBasePath,
      rulesCatalogManifestFile: this.#config.rulesCatalogManifestFile,
      rulesCatalogKeys: this.#config.rulesCatalogKeys,
      ...options,
      loadJson: (url) => this.loadJson(url)
    });

    return catalogLoader.loadCatalog();
  }

  async loadCharacterDto(characterId = this.#config.characterId) {
    if (this.#config.characterDto != null) {
      if (!isObject(this.#config.characterDto)) {
        const issues = collectCharacterDtoIssues(this.#config.characterDto, null, characterId);
        return makeResult({
          reason: "invalid-character-dto",
          issues
        });
      }

      const dto = normalizeCharacter(this.#config.characterDto);
      const issues = collectCharacterDtoIssues(this.#config.characterDto, dto, characterId);
      return makeResult({
        ok: true,
        reason: issues.length ? "loaded-with-issues" : "direct-character-dto",
        dto,
        data: dto,
        issues
      });
    }

    const id = normalizeString(characterId);
    const url = this.resolveCharacterUrl(id);
    if (!url) {
      return makeResult({
        reason: id
          ? "missing-url"
          : (this.#config.characterUrl || this.#config.characterBaseUrl ? "missing-character-id" : "missing-character-dto")
      });
    }

    const result = await this.loadJson(url);
    if (!result.ok) {
      return makeResult({
        ...result,
        reason: result.missing ? "missing-character-dto" : result.reason
      });
    }

    if (!isObject(result.data)) {
      const issues = collectCharacterDtoIssues(result.data, null, id);
      return makeResult({
        ...result,
        ok: false,
        reason: "invalid-character-dto",
        dto: null,
        data: result.data,
        issues
      });
    }

    const dto = normalizeCharacter(result.data);
    const issues = collectCharacterDtoIssues(result.data, dto, id);

    return makeResult({
      ...result,
      ok: !hasBlockingDtoIssue(issues),
      reason: issues.length ? "loaded-with-issues" : result.reason,
      dto,
      data: dto,
      issues
    });
  }

  async saveCharacterDto(characterDto) {
    const dto = normalizeCharacter(characterDto);
    const result = await this.saveJson(this.resolveCharacterUrl(dto.id), dto);
    return makeResult({
      ...result,
      dto: result.data ?? dto,
      data: result.data ?? dto
    });
  }
}
