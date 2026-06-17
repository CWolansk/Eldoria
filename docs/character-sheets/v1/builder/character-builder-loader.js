import { createEmptyBuilderDecisions, normalizeBuilderDecisions } from "./character-builder.js";
import { createEmptyCharacter, deepClone, normalizeCharacter, stringifyJson } from "../shared/character-state.js";
import { RulesCatalogLoader } from "../shared/rules-catalog-loader.js";

const DEFAULT_CORE_RULE_FILES = {
  races: "races.json",
  backgrounds: "backgrounds.json",
  feats: "feats.json",
  languages: "languages.json"
};

const DEFAULT_CLASS_INDEX_FILE = "class/index.json";
const DEFAULT_SPELL_INDEX_FILE = "spells/index.json";

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeCharacterId(value) {
  return normalizeString(value);
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
    error: null,
    ...patch
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

function createEmptyCharacterDto(characterId) {
  const character = createEmptyCharacter();
  if (characterId) {
    character.id = characterId;
  }

  return normalizeCharacter(character);
}

/**
 * Error class for caller mistakes that prevent a load/save location from being
 * resolved. Network, 404, and static-file failures are returned as result objects.
 */
export class CharacterBuilderLoaderError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CharacterBuilderLoaderError";
    this.code = details.code ?? "character-builder-loader-error";
    this.details = { ...details };
  }
}

/**
 * Loading and saving abstraction for rules data, builder DTOs, and final DTOs.
 * The class treats static JSON files and API endpoints as the same persistence
 * shape: resolve a URL/path, load JSON, then return a structured result.
 */
export class CharacterBuilderLoader {
  #config;

  constructor(config = {}) {
    this.configure(config);
  }

  /**
   * Stores the normalized app configuration used to resolve DTO/rules locations.
   * The app controller may call this each time open(...) receives new options.
   */
  configure(config = {}) {
    this.#config = { ...config };
    return this;
  }

  get config() {
    return { ...this.#config };
  }

  /**
   * Resolves a character DTO URL/path from the active config.
   * Collection bases append <characterId>.json. Template bases can use
   * {characterId}, {id}, :characterId, or :id. Direct .json paths are also valid.
   */
  resolveCharacterUrl(characterId = this.#config.characterId) {
    return this.#resolveCollectionUrl(
      this.#config.characterUrl || this.#config.characterBaseUrl,
      characterId
    );
  }

  /**
   * Resolves a builder-decision DTO URL/path from the active config.
   * This mirrors resolveCharacterUrl so local files and API endpoints share logic.
   */
  resolveBuilderUrl(characterId = this.#config.characterId) {
    return this.#resolveCollectionUrl(
      this.#config.builderUrl || this.#config.builderBaseUrl,
      characterId
    );
  }

  #resolveCollectionUrl(baseUrl, itemId) {
    const base = String(baseUrl ?? "").trim();
    const id = String(itemId ?? "").trim();

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

  /**
   * Resolves a static rules file under rulesBasePath. Absolute URLs/paths are
   * returned as-is; relative paths are joined to the configured base.
   */
  resolveRulesUrl(relativePath) {
    return joinResourcePath(this.#config.rulesBasePath, relativePath);
  }

  /**
   * Resolves a generated normalized catalog file under rulesCatalogBasePath.
   */
  resolveRulesCatalogUrl(relativePath) {
    return joinResourcePath(this.#config.rulesCatalogBasePath, relativePath);
  }

  /**
   * Loads and parses JSON from either fetch-able URLs or local filesystem paths
   * when running under Node. It never throws for ordinary missing/unavailable
   * resources; callers receive a result code instead.
   */
  async loadJson(resourceUrl) {
    const url = normalizeString(resourceUrl);
    if (!url) {
      return makeResult({ reason: "missing-url" });
    }

    try {
      if (shouldUseLocalFileSystem(url)) {
        const text = await readLocalText(url);
        return makeResult({
          ok: true,
          reason: "loaded",
          url,
          data: JSON.parse(text)
        });
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

      return makeResult({
        ok: true,
        reason: "loaded",
        url,
        status: response.status,
        data: await response.json()
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

  /**
   * Persists JSON to a remote endpoint with PUT, or to a local filesystem path
   * when running under Node. Browser static files intentionally report
   * save-endpoint-unavailable instead of pretending the save succeeded.
   */
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
      const useSimpleCorsBody = method.toUpperCase() === "POST" && options.simpleCors !== false;
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": useSimpleCorsBody ? "text/plain" : "application/json"
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
      return makeResult({
        reason: "save-failed",
        url,
        data: deepClone(payload),
        error: normalizeError(error)
      });
    }
  }

  async #loadRulesFile(relativePath, key) {
    const url = this.resolveRulesUrl(relativePath);
    const result = await this.loadJson(url);
    return {
      key,
      relativePath,
      ...result
    };
  }

  async #loadMappedRulesFiles(indexResult, folder, allowedKeys = null) {
    if (!indexResult.ok || !isObject(indexResult.data)) {
      return {
        data: {},
        failures: indexResult.ok ? [] : [indexResult]
      };
    }

    const entries = Object.entries(indexResult.data)
      .filter(([key]) => !allowedKeys || allowedKeys.has(String(key).toLowerCase()));

    const loaded = await Promise.all(entries.map(async ([key, fileName]) => {
      const relativePath = joinResourcePath(folder, fileName);
      return this.#loadRulesFile(relativePath, key);
    }));

    return {
      data: Object.fromEntries(
        loaded
          .filter((result) => result.ok)
          .map((result) => [result.key, result.data])
      ),
      failures: loaded.filter((result) => !result.ok)
    };
  }

  async #loadLegacyRulesData() {
    if (!normalizeString(this.#config.rulesBasePath)) {
      return makeResult({
        reason: "rules-base-path-unavailable",
        data: {
          core: {},
          classes: {},
          spells: {},
          failures: []
        }
      });
    }

    const coreFiles = {
      ...DEFAULT_CORE_RULE_FILES,
      ...(isObject(this.#config.rulesFiles) ? this.#config.rulesFiles : {})
    };

    const coreResults = await Promise.all(
      Object.entries(coreFiles).map(([key, relativePath]) => this.#loadRulesFile(relativePath, key))
    );

    const classIndex = await this.#loadRulesFile(DEFAULT_CLASS_INDEX_FILE, "classIndex");
    const loadedClasses = await this.#loadMappedRulesFiles(classIndex, "class");

    const spellIndex = await this.#loadRulesFile(DEFAULT_SPELL_INDEX_FILE, "spellIndex");
    const allowedSources = new Set(
      (this.#config.rulesProfile?.allowedSources ?? [])
        .map((source) => String(source).toLowerCase())
    );
    const loadedSpells = await this.#loadMappedRulesFiles(
      spellIndex,
      "spells",
      allowedSources.size ? allowedSources : null
    );

    const failures = [
      ...coreResults.filter((result) => !result.ok),
      ...(classIndex.ok ? [] : [classIndex]),
      ...loadedClasses.failures,
      ...(spellIndex.ok ? [] : [spellIndex]),
      ...loadedSpells.failures
    ];

    return makeResult({
      ok: failures.length === 0,
      reason: failures.length ? "loaded-with-failures" : "loaded",
      data: {
        basePath: this.#config.rulesBasePath,
        loadedAt: new Date().toISOString(),
        core: Object.fromEntries(
          coreResults
            .filter((result) => result.ok)
            .map((result) => [result.key, result.data])
        ),
        classIndex: classIndex.ok ? classIndex.data : {},
        classes: loadedClasses.data,
        spellIndex: spellIndex.ok ? spellIndex.data : {},
        spells: loadedSpells.data,
        failures
      }
    });
  }

  /**
   * Loads the generated normalized rules catalog from rulesCatalogBasePath.
   * The catalog loader is shared so sheet/runtime tools can request the same
   * manifest-backed JSON without duplicating URL or local-file handling.
   */
  async loadRulesCatalog(options = {}) {
    const catalogLoader = new RulesCatalogLoader({
      rulesCatalogBasePath: this.#config.rulesCatalogBasePath,
      rulesCatalogManifestFile: this.#config.rulesCatalogManifestFile,
      rulesCatalogKeys: this.#config.rulesCatalogKeys,
      ...options,
      loadJson: (url) => this.loadJson(url)
    });

    return catalogLoader.loadCatalog();
  }

  /**
   * Loads static rules data. The normalized catalog is loaded when
   * rulesCatalogBasePath is configured, while rulesBasePath remains the raw
   * 5etools fallback until consumers finish migrating to the catalog shape.
   */
  async loadRulesData() {
    const catalogResult = normalizeString(this.#config.rulesCatalogBasePath)
      ? await this.loadRulesCatalog()
      : null;
    const legacyResult = await this.#loadLegacyRulesData();

    if (!catalogResult) {
      return legacyResult;
    }

    if (!normalizeString(this.#config.rulesBasePath)) {
      return makeResult({
        ...catalogResult,
        reason: catalogResult.ok ? "loaded-normalized-catalog" : catalogResult.reason,
        data: {
          ...catalogResult.data,
          normalizedCatalog: catalogResult.data,
          core: {},
          classes: {},
          spells: {},
          failures: catalogResult.data?.failures ?? []
        }
      });
    }

    const catalogFailure = catalogResult.ok
      ? []
      : [{
          key: "normalizedCatalog",
          reason: catalogResult.reason,
          url: catalogResult.url,
          status: catalogResult.status,
          missing: catalogResult.missing,
          error: catalogResult.error
        }];
    const failures = [
      ...(legacyResult.data?.failures ?? []),
      ...catalogFailure
    ];

    return makeResult({
      ...legacyResult,
      ok: Boolean(legacyResult.ok && catalogResult.ok),
      reason: failures.length ? "loaded-with-failures" : "loaded",
      data: {
        ...legacyResult.data,
        normalizedCatalog: catalogResult.data,
        catalogLoadResult: {
          ok: catalogResult.ok,
          reason: catalogResult.reason,
          url: catalogResult.url,
          status: catalogResult.status
        },
        failures
      }
    });
  }

  /**
   * Loads a saved builder-decision DTO by character id, or creates the baseline
   * builder draft for mode:"new".
   */
  async loadBuilderDto(characterId = this.#config.characterId) {
    const id = normalizeCharacterId(characterId);

    if (this.#config.mode === "new") {
      const dto = normalizeBuilderDecisions(createEmptyBuilderDecisions({
        characterId: id || undefined
      }));
      return makeResult({
        ok: true,
        reason: "new-draft",
        dto,
        data: dto
      });
    }

    if (!id) {
      throw new CharacterBuilderLoaderError("Edit mode requires a characterId to load a builder DTO.", {
        code: "missing-character-id",
        type: "builder"
      });
    }

    const result = await this.loadJson(this.resolveBuilderUrl(id));
    if (!result.ok) {
      return makeResult({
        ...result,
        reason: result.missing ? "missing-builder-dto" : result.reason
      });
    }

    const dto = normalizeBuilderDecisions(result.data);
    return makeResult({
      ...result,
      dto,
      data: dto
    });
  }

  /**
   * Loads the final playable v1 character DTO by character id, or creates an
   * empty baseline final DTO for mode:"new".
   */
  async loadCharacterDto(characterId = this.#config.characterId) {
    const id = normalizeCharacterId(characterId);

    if (this.#config.mode === "new") {
      const dto = createEmptyCharacterDto(id);
      return makeResult({
        ok: true,
        reason: "new-draft",
        dto,
        data: dto
      });
    }

    if (!id) {
      throw new CharacterBuilderLoaderError("Edit mode requires a characterId to load a character DTO.", {
        code: "missing-character-id",
        type: "character"
      });
    }

    const result = await this.loadJson(this.resolveCharacterUrl(id));
    if (!result.ok) {
      return makeResult({
        ...result,
        reason: result.missing ? "missing-character-dto" : result.reason
      });
    }

    const dto = normalizeCharacter(result.data);
    return makeResult({
      ...result,
      dto,
      data: dto
    });
  }

  /**
   * Saves or upserts a builder-decision DTO. If no writable endpoint/path exists,
   * callers still receive the normalized DTO for export/download flows.
   */
  async saveBuilderDto(builderDto) {
    const dto = normalizeBuilderDecisions(builderDto);
    const result = await this.saveJson(this.resolveBuilderUrl(dto.characterId), dto);
    return makeResult({
      ...result,
      dto: result.data ?? dto,
      data: result.data ?? dto
    });
  }

  /**
   * Saves or upserts a final playable v1 character DTO. Unavailable static-save
   * targets return ok:false rather than blocking export.
   */
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
