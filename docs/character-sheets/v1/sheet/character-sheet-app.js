import { CharacterModel } from "../shared/character-model.js";
import { deepClone, stringifyJson } from "../shared/character-state.js";
import {
  applyTableStateAction as applyTableStateActionToModel,
  patchCharacterModel
} from "./character-sheet-actions.js";
import { CharacterSheetEvents } from "./character-sheet-events.js";
import { CharacterSheetLoader } from "./character-sheet-loader.js";
import {
  CharacterSheetRenderer,
  DEFAULT_CHARACTER_SHEET_TABS,
  normalizeCharacterSheetTabId,
  resolveCharacterSheetTabs
} from "./character-sheet-render.js";
import {
  summarizeSheetValidation,
  validateCharacterSheet
} from "./character-sheet-validation.js";

const DEFAULT_RULES_CATALOG_KEYS = [
  "items",
  "eldoriaItems",
  "itemProperties",
  "magicVariants",
  "spells",
  "classes",
  "features",
  "races",
  "backgrounds",
  "feats"
];

/**
 * @typedef {Object} CharacterSheetAppConfig
 * @property {"view"|"play"|"edit"} mode - Sheet surface to render.
 * @property {string|null} characterId - Stable final DTO id to load/save.
 * @property {string|Element|null} mount - Optional selector/element for embedding the sheet.
 * @property {Object|null} characterDto - Already-loaded final v1 character DTO.
 * @property {Object|null} rulesCatalog - Already-loaded normalized rules catalog.
 * @property {Object|null} normalizedCatalog - Alias for rulesCatalog.
 * @property {string} rulesCatalogBasePath - Static base path for generated normalized catalog JSON.
 * @property {string[]} rulesCatalogKeys - Normalized catalog keys to load.
 * @property {string} rulesBasePath - Legacy raw-rules base path; not used by sheet render code.
 * @property {string} characterBaseUrl - Base URL/path for final v1 character DTOs.
 * @property {string} characterUrl - Optional direct/path-template final DTO URL.
 * @property {string} builderBaseUrl - Base URL/path for builder-decision DTOs.
 * @property {string} builderUrl - Optional direct/path-template builder DTO URL.
 * @property {"save"|"export-only"} persistenceMode - Whether save actions may write or only export draft JSON.
 * @property {string} saveMethod - HTTP method used when saving remote DTOs.
 * @property {boolean} checkStaleOnSave - Re-read the persisted DTO before save when a previous load baseline exists.
 * @property {string[]} visibleTabs - Optional ordered tab allowlist for hosts.
 * @property {string} activeTab - Initially selected sheet tab.
 * @property {Object} rulesProfile - Campaign/source filtering profile.
 * @property {Object} builder - Optional builder handoff configuration.
 * @property {Object} callbacks - Optional lifecycle callbacks owned by the embedding page.
 */
export const DEFAULT_CHARACTER_SHEET_CONFIG = {
  mode: "view",
  characterId: null,
  mount: null,
  characterDto: null,
  rulesCatalog: null,
  normalizedCatalog: null,
  rulesCatalogBasePath: "",
  rulesCatalogManifestFile: "rules-manifest.json",
  rulesCatalogKeys: DEFAULT_RULES_CATALOG_KEYS,
  rulesBasePath: "",
  characterBaseUrl: "",
  characterUrl: "",
  builderBaseUrl: "",
  builderUrl: "",
  persistenceMode: "save",
  saveMethod: "PUT",
  checkStaleOnSave: true,
  visibleTabs: DEFAULT_CHARACTER_SHEET_TABS,
  activeTab: "overview",
  rulesProfile: {
    ruleset: "2014",
    allowedSources: ["PHB"],
    sourcePolicy: null
  },
  builder: {
    enabled: false,
    openMode: "edit",
    mount: null,
    app: null,
    open: null,
    config: null,
    callbacks: null
  },
  callbacks: {
    onOpen: null,
    onLoad: null,
    onChange: null,
    onSave: null,
    onExport: null,
    onClose: null,
    onOpenBuilder: null,
    onError: null
  }
};

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeMode(mode) {
  return ["view", "play", "edit"].includes(mode) ? mode : "view";
}

function normalizePersistenceMode(mode) {
  return mode === "export-only" ? "export-only" : "save";
}

function toObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCallbacks(callbacks = {}) {
  return {
    ...DEFAULT_CHARACTER_SHEET_CONFIG.callbacks,
    ...toObject(callbacks)
  };
}

function normalizeBuilderConfig(builder = {}) {
  return {
    ...DEFAULT_CHARACTER_SHEET_CONFIG.builder,
    ...toObject(builder),
    enabled: Boolean(builder?.enabled)
  };
}

function normalizeVisibleTabs(visibleTabs) {
  if (!Array.isArray(visibleTabs)) {
    return [...DEFAULT_CHARACTER_SHEET_CONFIG.visibleTabs];
  }

  const seen = new Set();
  const normalized = visibleTabs
    .map(normalizeCharacterSheetTabId)
    .filter(Boolean)
    .filter((tab) => {
      if (seen.has(tab)) {
        return false;
      }

      seen.add(tab);
      return true;
    });

  return normalized.length ? normalized : [...DEFAULT_CHARACTER_SHEET_CONFIG.visibleTabs];
}

export function normalizeCharacterSheetConfig(config = {}) {
  const rulesProfile = {
    ...DEFAULT_CHARACTER_SHEET_CONFIG.rulesProfile,
    ...toObject(config.rulesProfile)
  };

  return {
    ...DEFAULT_CHARACTER_SHEET_CONFIG,
    ...config,
    mode: normalizeMode(config.mode ?? DEFAULT_CHARACTER_SHEET_CONFIG.mode),
    characterId: normalizeString(config.characterId) || null,
    rulesCatalogBasePath: normalizeString(config.rulesCatalogBasePath),
    rulesCatalogManifestFile: normalizeString(config.rulesCatalogManifestFile) || DEFAULT_CHARACTER_SHEET_CONFIG.rulesCatalogManifestFile,
    rulesCatalogKeys: Array.isArray(config.rulesCatalogKeys)
      ? [...config.rulesCatalogKeys]
      : [...DEFAULT_RULES_CATALOG_KEYS],
    rulesBasePath: normalizeString(config.rulesBasePath),
    characterBaseUrl: normalizeString(config.characterBaseUrl),
    characterUrl: normalizeString(config.characterUrl),
    builderBaseUrl: normalizeString(config.builderBaseUrl),
    builderUrl: normalizeString(config.builderUrl),
    persistenceMode: normalizePersistenceMode(config.persistenceMode),
    saveMethod: normalizeString(config.saveMethod) || DEFAULT_CHARACTER_SHEET_CONFIG.saveMethod,
    checkStaleOnSave: config.checkStaleOnSave !== false,
    visibleTabs: normalizeVisibleTabs(config.visibleTabs),
    activeTab: normalizeCharacterSheetTabId(config.activeTab) || DEFAULT_CHARACTER_SHEET_CONFIG.activeTab,
    rulesProfile: {
      ...rulesProfile,
      allowedSources: Array.isArray(rulesProfile.allowedSources) ? [...rulesProfile.allowedSources] : []
    },
    builder: normalizeBuilderConfig(config.builder),
    callbacks: normalizeCallbacks(config.callbacks)
  };
}

function omitRuntimeConfig(config = {}) {
  return {
    ...config,
    characterDto: undefined,
    rulesCatalog: undefined,
    normalizedCatalog: undefined,
    callbacks: undefined,
    builder: {
      ...config.builder,
      app: undefined,
      open: undefined,
      callbacks: undefined,
      config: config.builder?.config
        ? {
            ...config.builder.config,
            callbacks: undefined
          }
        : undefined
    }
  };
}

function createMissingCharacterResult(reason = "missing-character") {
  return {
    ok: false,
    reason,
    characterDto: null
  };
}

function normalizeIssue(issue = {}) {
  const code = issue.code ?? issue.reason ?? "sheet-load-issue";
  return {
    severity: issue.severity ?? (issue.type === "conflict" ? "warning" : "warning"),
    code,
    message: issue.message ?? code,
    details: issue.details ?? {}
  };
}

function mergeIssues(...groups) {
  const seen = new Set();
  const merged = [];

  for (const issue of groups.flat().filter(Boolean)) {
    const normalized = normalizeIssue(issue);
    const key = `${normalized.severity}|${normalized.code}|${normalized.message}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(normalized);
  }

  return merged;
}

function hasResultIssues(result) {
  return Boolean(result && (!result.ok || result.issues?.length));
}

function summarizeBuilderIssue(issue = {}, fallback = {}) {
  const reason = issue.reason ?? issue.code ?? fallback.reason ?? "builder-issue";
  return {
    type: issue.type ?? fallback.type ?? "builder",
    reason,
    message: issue.message ?? fallback.message ?? reason,
    url: issue.url ?? fallback.url ?? "",
    status: issue.status ?? fallback.status ?? 0
  };
}

function collectBuilderIssues(result = {}) {
  const issues = toArray(result.issues).map((issue) => summarizeBuilderIssue(issue));

  for (const [label, nested] of [
    ["builder", result.builderResult],
    ["character", result.characterResult],
    ["download", result.downloadResult ?? result.payload?.downloadResult]
  ]) {
    if (nested && nested.ok === false) {
      issues.push(summarizeBuilderIssue(nested, {
        type: label,
        reason: nested.reason,
        message: `${label} result: ${nested.reason || "failed"}.`,
        url: nested.url,
        status: nested.status
      }));
    }
  }

  return issues;
}

function isUnavailableSaveReason(reason) {
  return [
    "save-endpoint-unavailable",
    "fetch-unavailable",
    "missing-url"
  ].includes(String(reason ?? ""));
}

function canUseBrowserDownload() {
  return typeof document !== "undefined"
    && typeof Blob !== "undefined"
    && typeof URL !== "undefined"
    && typeof URL.createObjectURL === "function";
}

function triggerJsonDownload(file) {
  const blob = new Blob([file.text], { type: file.mimeType || "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createCharacterFingerprint(characterDto) {
  return stringifyJson(characterDto ?? null);
}

function summarizePersistenceResource(label, result = {}) {
  return {
    label,
    ok: Boolean(result?.ok),
    reason: result?.reason || (result?.ok ? "saved" : "unavailable"),
    url: result?.url || "",
    status: result?.status || 0,
    error: result?.error ? { ...result.error } : null
  };
}

function summarizePersistenceIssue(issue = {}) {
  return {
    type: issue.type ?? "persistence",
    reason: issue.reason ?? issue.code ?? "persistence-issue",
    message: issue.message ?? issue.reason ?? "Persistence issue.",
    url: issue.url ?? "",
    status: issue.status ?? 0,
    details: issue.details ?? {}
  };
}

function createUnsavedChangesResult(action = "close") {
  return {
    ok: false,
    action,
    reason: "unsaved-changes",
    message: action === "reload"
      ? "Reload blocked because the sheet has unsaved changes."
      : "Close blocked because the sheet has unsaved changes.",
    generatedAt: new Date().toISOString()
  };
}

export class CharacterSheetApp {
  constructor(options = {}) {
    this.config = normalizeCharacterSheetConfig(options.config ?? {});
    this.#syncActiveTab();
    this.loader = options.loader ?? new CharacterSheetLoader(this.config);
    this.renderer = options.renderer ?? new CharacterSheetRenderer();
    this.events = options.events ?? new CharacterSheetEvents();
    this.model = null;
    this.rulesCatalog = this.config.rulesCatalog ?? this.config.normalizedCatalog ?? null;
    this.characterLoadResult = null;
    this.rulesLoadResult = null;
    this.validationIssues = [];
    this.validationSummary = summarizeSheetValidation([]);
    this.loadStatus = "idle";
    this.saveStatus = "idle";
    this.exportStatus = "idle";
    this.lastSaveResult = null;
    this.lastExportResult = null;
    this.lastBuilderResult = null;
    this.lastCloseResult = null;
    this.lastReloadResult = null;
    this.persistenceBaseline = null;
    this.builderHandoffStatus = "idle";
    this.builderInstance = null;
    this.isOpen = false;
    this.isDirty = false;
    this.ready = Promise.resolve(this);
  }

  open(config = {}) {
    this.config = normalizeCharacterSheetConfig({
      ...this.config,
      ...config,
      builder: {
        ...this.config.builder,
        ...toObject(config.builder)
      },
      callbacks: {
        ...this.config.callbacks,
        ...toObject(config.callbacks)
      }
    });
    this.#syncActiveTab();
    this.loader.configure(this.config);
    this.rulesCatalog = this.config.rulesCatalog ?? this.config.normalizedCatalog ?? this.rulesCatalog;
    this.isOpen = true;
    this.loadStatus = "loading";
    this.saveStatus = "idle";
    this.exportStatus = "idle";
    this.lastSaveResult = null;
    this.lastExportResult = null;
    this.lastBuilderResult = null;
    this.lastCloseResult = null;
    this.lastReloadResult = null;
    this.persistenceBaseline = null;
    this.builderHandoffStatus = "idle";
    this.builderInstance = null;

    this.renderer.mount(this.config.mount).render(this.getSnapshot());
    this.events.bind({
      app: this,
      root: this.renderer.root
    });
    this.config.callbacks.onOpen?.(this.getSnapshot());
    this.ready = this.#loadOpenData();
    return this;
  }

  async #loadOpenData() {
    try {
      if (this.config.characterDto || this.config.characterId || this.config.characterUrl || this.config.characterBaseUrl) {
        this.characterLoadResult = await this.loader.loadCharacterDto(this.config.characterId);
        if (this.characterLoadResult.ok) {
          this.setCharacter(this.characterLoadResult.dto, {
            dirty: false,
            render: false,
            notify: false,
            url: this.characterLoadResult.url,
            issues: this.characterLoadResult.issues
          });
        }
      }

      if (this.config.rulesCatalog || this.config.normalizedCatalog || this.config.rulesCatalogBasePath) {
        this.rulesLoadResult = await this.loader.loadRulesCatalog();
        if (this.rulesLoadResult.data) {
          this.rulesCatalog = this.rulesLoadResult.data;
        }
      }

      this.loadStatus = hasResultIssues(this.characterLoadResult) || hasResultIssues(this.rulesLoadResult) || this.validationIssues.length
        ? "loaded-with-issues"
        : "loaded";
      this.#renderCurrentSnapshot();
      this.config.callbacks.onLoad?.(this.getSnapshot());
      return this;
    } catch (error) {
      this.loadStatus = "failed";
      this.handleError(error);
      return this;
    }
  }

  #renderCurrentSnapshot() {
    this.renderer.render(this.getSnapshot());
    return this;
  }

  #getSheetTabs(activeTab = this.config.activeTab) {
    return resolveCharacterSheetTabs({
      mode: this.config.mode,
      visibleTabs: this.config.visibleTabs,
      activeTab,
      character: this.model?.data ?? null
    });
  }

  #syncActiveTab() {
    this.config.activeTab = this.#getSheetTabs().activeTab;
    return this.config.activeTab;
  }

  async load(characterId = this.config.characterId) {
    await this.ready;
    const options = toObject(arguments[1]);
    if (this.isDirty && !options.force) {
      const result = createUnsavedChangesResult("reload");
      this.lastReloadResult = result;
      this.#renderCurrentSnapshot();
      return result;
    }

    const requestedId = normalizeString(characterId);
    if (requestedId) {
      this.config.characterId = requestedId;
      this.loader.configure(this.config);
    }

    this.loadStatus = "loading";
    this.#renderCurrentSnapshot();
    this.characterLoadResult = await this.loader.loadCharacterDto(this.config.characterId);

    if (this.characterLoadResult.ok) {
      this.setCharacter(this.characterLoadResult.dto, {
        dirty: false,
        render: false,
        url: this.characterLoadResult.url,
        issues: this.characterLoadResult.issues
      });
      this.loadStatus = this.characterLoadResult.issues?.length || this.validationIssues.length
        ? "loaded-with-issues"
        : "loaded";
    } else {
      this.loadStatus = "loaded-with-issues";
    }

    this.lastReloadResult = {
      ok: Boolean(this.characterLoadResult.ok),
      reason: this.characterLoadResult.reason,
      url: this.characterLoadResult.url,
      status: this.characterLoadResult.status,
      generatedAt: new Date().toISOString()
    };
    this.#renderCurrentSnapshot();
    this.config.callbacks.onLoad?.(this.getSnapshot());
    return this.characterLoadResult;
  }

  #capturePersistenceBaseline(characterDto, options = {}) {
    if (!characterDto || typeof characterDto !== "object" || Array.isArray(characterDto)) {
      this.persistenceBaseline = null;
      return null;
    }

    const characterId = normalizeString(characterDto.id);
    if (!characterId) {
      this.persistenceBaseline = null;
      return null;
    }

    const requestedId = normalizeString(options.requestedId ?? this.config.characterId);
    const url = normalizeString(options.url) || this.loader.resolveCharacterUrl(requestedId || characterId);
    this.persistenceBaseline = {
      id: characterId,
      requestedId: requestedId || characterId,
      url,
      lastModified: normalizeString(characterDto.lastModified),
      fingerprint: createCharacterFingerprint(characterDto),
      capturedAt: new Date().toISOString()
    };
    return this.persistenceBaseline;
  }

  setCharacter(characterDto, options = {}) {
    const requestedId = this.config.characterId;
    this.model = CharacterModel.fromInput(characterDto);
    this.validationIssues = mergeIssues(
      options.issues ?? [],
      validateCharacterSheet(this.model.data, {
        characterId: requestedId
      })
    );
    if (!this.config.characterId && this.model.data.id) {
      this.config.characterId = this.model.data.id;
    }

    this.loader.configure(this.config);
    this.validationSummary = summarizeSheetValidation(this.validationIssues);
    this.isDirty = Boolean(options.dirty);

    if (!this.isDirty) {
      this.#capturePersistenceBaseline(this.model.data, {
        requestedId,
        url: options.url
      });
    }

    if (options.render !== false) {
      this.#renderCurrentSnapshot();
    }

    if (options.notify !== false) {
      this.config.callbacks.onChange?.(this.getSnapshot());
    }

    return this;
  }

  setRulesCatalog(rulesCatalog) {
    this.rulesCatalog = rulesCatalog ?? null;
    this.#renderCurrentSnapshot();
    return this;
  }

  setActiveTab(tabId) {
    const sheetTabs = this.#getSheetTabs(tabId);
    const previousTab = this.config.activeTab;
    this.config.activeTab = sheetTabs.activeTab;

    if (this.config.activeTab !== previousTab) {
      this.#renderCurrentSnapshot();
    }

    return {
      ok: true,
      activeTab: this.config.activeTab,
      visibleTabs: sheetTabs.visibleTabs,
      changed: this.config.activeTab !== previousTab,
      snapshot: this.getSnapshot()
    };
  }

  async reloadRulesCatalog() {
    this.rulesLoadResult = await this.loader.loadRulesCatalog();
    if (this.rulesLoadResult.data) {
      this.rulesCatalog = this.rulesLoadResult.data;
    }

    this.#renderCurrentSnapshot();
    return this.rulesLoadResult;
  }

  #markCharacterChanged(result) {
    this.validationIssues = validateCharacterSheet(this.model.data, {
      characterId: this.config.characterId
    });
    this.validationSummary = summarizeSheetValidation(this.validationIssues);
    this.isDirty = true;
    this.saveStatus = this.saveStatus === "saved" ? "idle" : this.saveStatus;
    this.exportStatus = this.exportStatus === "exported" ? "idle" : this.exportStatus;
    this.lastCloseResult = null;
    this.#renderCurrentSnapshot();
    this.config.callbacks.onChange?.(this.getSnapshot());
    return {
      ...result,
      snapshot: this.getSnapshot()
    };
  }

  patch(path, value) {
    const result = patchCharacterModel(this.model, path, value);
    if (!result.ok) {
      return result;
    }

    return this.#markCharacterChanged(result);
  }

  applyTableStateAction(action, payload = {}) {
    if (this.config.mode === "view") {
      return {
        ok: false,
        action,
        reason: "view-mode-read-only",
        snapshot: this.getSnapshot()
      };
    }

    const result = applyTableStateActionToModel(this.model, action, payload);
    if (!result.ok) {
      return {
        ...result,
        snapshot: this.getSnapshot()
      };
    }

    return this.#markCharacterChanged(result);
  }

  async save() {
    await this.ready;
    const options = toObject(arguments[0]);
    if (this.config.persistenceMode === "export-only") {
      return this.export({
        ...options,
        download: options.download ?? true,
        touchModified: options.touchModified ?? true
      });
    }

    if (!this.model) {
      const result = createMissingCharacterResult();
      this.lastSaveResult = this.#summarizeSaveResult({
        ...result,
        characterResult: result
      });
      this.saveStatus = "unavailable";
      this.#renderCurrentSnapshot();
      return result;
    }

    this.saveStatus = "saving";
    this.lastSaveResult = null;
    this.#renderCurrentSnapshot();

    const payload = this.#createExportPayload({
      touchModified: options.touchModified ?? true
    });
    const payloadConflict = this.#getPersistencePayloadConflict(payload);
    if (payloadConflict) {
      return this.#finishSaveResult({
        ok: false,
        reason: "conflict",
        payload,
        characterResult: null,
        issues: [payloadConflict]
      });
    }

    const staleConflict = await this.#getStaleLoadedDataConflict(payload, options);
    if (staleConflict) {
      return this.#finishSaveResult({
        ok: false,
        reason: "conflict",
        payload,
        characterResult: null,
        issues: [staleConflict]
      });
    }

    const result = await this.loader.saveCharacterDto(payload.characterDto);
    return this.#finishSaveResult({
      ...result,
      ok: Boolean(result.ok),
      reason: result.ok ? "saved" : (isUnavailableSaveReason(result.reason) ? "unavailable" : "failed"),
      payload,
      characterResult: result,
      issues: []
    });
  }

  #finishSaveResult(result = {}) {
    this.saveStatus = result.ok ? "saved" : result.reason || "failed";

    const savedDto = result.characterResult?.dto ?? result.dto ?? (result.reason === "conflict" ? null : result.payload?.characterDto);
    if (savedDto) {
      this.model = CharacterModel.fromInput(savedDto);
    }

    this.isDirty = !result.ok;
    if (result.ok && this.model?.data) {
      this.#capturePersistenceBaseline(this.model.data, {
        requestedId: this.config.characterId,
        url: result.characterResult?.url ?? result.url
      });
    }

    this.validationIssues = mergeIssues(
      result.issues ?? [],
      validateCharacterSheet(this.model?.data, {
        characterId: this.config.characterId
      })
    );
    this.validationSummary = summarizeSheetValidation(this.validationIssues);
    this.lastSaveResult = this.#summarizeSaveResult(result);
    this.#renderCurrentSnapshot();
    this.config.callbacks.onSave?.(result);
    return result;
  }

  #getPersistencePayloadConflict(payload = {}) {
    const characterId = normalizeString(payload.characterDto?.id);
    const requestedId = normalizeString(this.config.characterId);

    if (!characterId) {
      return {
        type: "conflict",
        reason: "missing-persistence-id",
        message: "Save blocked because the final character DTO needs an id."
      };
    }

    if (requestedId && characterId !== requestedId) {
      return {
        type: "conflict",
        reason: "character-id-conflict",
        message: `Save blocked because loaded character id "${characterId}" does not match requested id "${requestedId}".`,
        details: {
          requestedId,
          characterId
        }
      };
    }

    return null;
  }

  async #getStaleLoadedDataConflict(payload = {}, options = {}) {
    if (options.force || options.checkStale === false || this.config.checkStaleOnSave === false) {
      return null;
    }

    if (!this.isDirty || !this.persistenceBaseline?.fingerprint) {
      return null;
    }

    const characterId = normalizeString(this.config.characterId || payload.characterDto?.id);
    const url = this.loader.resolveCharacterUrl(characterId);
    if (!url) {
      return null;
    }

    const remoteResult = await this.loader.loadJson(url);
    if (!remoteResult.ok || !remoteResult.data || typeof remoteResult.data !== "object" || Array.isArray(remoteResult.data)) {
      return null;
    }

    const remoteDto = CharacterModel.fromInput(remoteResult.data).data;
    const remoteId = normalizeString(remoteDto.id);
    const payloadId = normalizeString(payload.characterDto?.id);
    if (remoteId && payloadId && remoteId !== payloadId) {
      return {
        type: "conflict",
        reason: "character-id-conflict",
        message: `Save blocked because persisted character id "${remoteId}" does not match current id "${payloadId}".`,
        url,
        details: {
          persistedId: remoteId,
          characterId: payloadId
        }
      };
    }

    const remoteFingerprint = createCharacterFingerprint(remoteDto);
    if (remoteFingerprint === this.persistenceBaseline.fingerprint) {
      return null;
    }

    return {
      type: "conflict",
      reason: "stale-loaded-data",
      message: "Save blocked because the persisted character changed after this sheet loaded.",
      url,
      details: {
        loadedLastModified: this.persistenceBaseline.lastModified,
        persistedLastModified: normalizeString(remoteDto.lastModified),
        loadedAt: this.persistenceBaseline.capturedAt
      }
    };
  }

  #createExportPayload(options = {}) {
    const characterDto = this.model.toExportObject({
      touchModified: options.touchModified ?? false
    });
    const text = stringifyJson(characterDto);
    const file = {
      kind: "character",
      label: "Final character DTO",
      fileName: `${this.model.suggestFileName()}.json`,
      mimeType: "application/json",
      text,
      byteLength: text.length
    };

    return {
      ok: true,
      reason: "exported",
      characterDto,
      text,
      file,
      files: [file],
      downloadResult: null,
      generatedAt: new Date().toISOString(),
      options: { ...options }
    };
  }

  #downloadExportFiles(files = []) {
    if (!files.length) {
      return {
        ok: false,
        reason: "no-export-files",
        files: []
      };
    }

    if (!canUseBrowserDownload()) {
      return {
        ok: false,
        reason: "download-unavailable",
        files: files.map((file) => file.fileName)
      };
    }

    for (const file of files) {
      triggerJsonDownload(file);
    }

    return {
      ok: true,
      reason: "downloaded",
      files: files.map((file) => file.fileName)
    };
  }

  #summarizeSaveResult(result = {}) {
    const resource = summarizePersistenceResource("Final character DTO", result.characterResult ?? result);
    const messages = {
      saved: "Saved final character DTO.",
      unavailable: "Save unavailable: no writable endpoint or path accepted the final character DTO.",
      failed: "Save failed for the final character DTO.",
      conflict: "Save blocked by a persistence conflict."
    };
    const status = result.ok ? "saved" : result.reason || "failed";

    return {
      ok: Boolean(result.ok),
      status,
      reason: result.reason || status,
      message: messages[status] ?? messages.failed,
      savedAt: new Date().toISOString(),
      url: resource.url,
      resources: [resource],
      issues: toArray(result.issues).map(summarizePersistenceIssue)
    };
  }

  #summarizeExportResult(result = {}) {
    const files = toArray(result.files).map((file) => ({
      kind: file.kind,
      label: file.label,
      fileName: file.fileName,
      mimeType: file.mimeType,
      byteLength: file.byteLength
    }));
    const downloadResult = result.downloadResult
      ? {
          ok: Boolean(result.downloadResult.ok),
          reason: result.downloadResult.reason,
          files: toArray(result.downloadResult.files)
        }
      : null;

    const status = result.ok ? "exported" : result.reason || "unavailable";
    return {
      ok: Boolean(result.ok),
      status,
      reason: result.reason || "exported",
      message: !result.ok
        ? "Export unavailable: no character DTO is loaded."
        : downloadResult?.ok
        ? "Exported and downloaded final character DTO."
        : "Exported final character DTO.",
      generatedAt: result.generatedAt,
      file: files[0] ?? null,
      files,
      downloadResult
    };
  }

  export(options = {}) {
    if (!this.model) {
      const result = createMissingCharacterResult();
      this.lastExportResult = this.#summarizeExportResult(result);
      this.exportStatus = "unavailable";
      this.#renderCurrentSnapshot();
      return result;
    }

    const shouldUpdateStatus = options.updateStatus !== false;
    const shouldNotify = options.notify !== false;
    const result = this.#createExportPayload(options);
    if (options.download) {
      result.downloadResult = this.#downloadExportFiles(result.files);
    }

    if (options.touchModified && options.materialize !== false) {
      this.model = CharacterModel.fromInput(result.characterDto);
      this.validationIssues = validateCharacterSheet(this.model.data, {
        characterId: this.config.characterId
      });
      this.validationSummary = summarizeSheetValidation(this.validationIssues);
    }

    if (shouldUpdateStatus) {
      this.lastExportResult = this.#summarizeExportResult(result);
      this.exportStatus = "exported";
      this.#renderCurrentSnapshot();
    }

    if (shouldNotify) {
      this.config.callbacks.onExport?.(result);
    }
    return result;
  }

  #invokeCallback(callback, ...args) {
    if (typeof callback !== "function") {
      return undefined;
    }

    try {
      return callback(...args);
    } catch (error) {
      this.handleError(error);
      return undefined;
    }
  }

  #extractBuilderCharacterDto(result = {}) {
    for (const candidate of [
      result.characterResult?.dto,
      result.characterResult?.data,
      result.payload?.characterDto,
      result.characterDto
    ]) {
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  #syncCharacterFromBuilder(characterDto, options = {}) {
    if (!characterDto || typeof characterDto !== "object" || Array.isArray(characterDto)) {
      return false;
    }

    this.setCharacter(characterDto, {
      dirty: options.dirty ?? true,
      render: false,
      notify: false,
      issues: options.issues ?? []
    });
    this.loadStatus = this.validationIssues.length ? "loaded-with-issues" : "loaded";
    this.exportStatus = this.exportStatus === "exported" ? "idle" : this.exportStatus;
    if (options.dirty && this.saveStatus === "saved") {
      this.saveStatus = "idle";
    }
    return true;
  }

  #summarizeBuilderResult(kind, result = {}, options = {}) {
    const issues = collectBuilderIssues(result);
    const files = toArray(result.files ?? result.payload?.files)
      .map((file) => ({
        kind: file.kind ?? "",
        label: file.label ?? file.kind ?? "file",
        fileName: file.fileName ?? "",
        byteLength: file.byteLength ?? 0
      }));
    const ok = result.ok == null
      ? Boolean(options.characterUpdated || result.compiled || kind === "open")
      : Boolean(result.ok);
    const status = options.status ?? (ok ? `${kind}-synced` : `${kind}-issues`);
    const messages = {
      opening: "Opening builder.",
      opened: "Builder opened for progression edits.",
      failed: "Builder handoff failed.",
      "save-synced": "Builder save synced the final character DTO.",
      "save-issues": "Builder save returned issues.",
      "export-synced": "Builder export synced the compiled final character DTO.",
      "export-issues": "Builder export returned issues."
    };

    return {
      kind,
      ok,
      status,
      reason: result.reason ?? status,
      message: options.message ?? messages[status] ?? messages.failed,
      characterUpdated: Boolean(options.characterUpdated),
      generatedAt: new Date().toISOString(),
      compiled: Boolean(result.compiled ?? result.payload?.compiled),
      files,
      issues
    };
  }

  #handleBuilderSaveResult(result = {}) {
    const characterDto = this.#extractBuilderCharacterDto(result);
    const finalCharacterSaved = Boolean(result.characterResult?.ok);
    const characterUpdated = this.#syncCharacterFromBuilder(characterDto, {
      dirty: !finalCharacterSaved
    });
    const status = result.ok && characterUpdated ? "save-synced" : "save-issues";

    if (finalCharacterSaved) {
      this.saveStatus = "saved";
      this.lastSaveResult = result.characterResult;
    } else if (characterUpdated && this.saveStatus === "saved") {
      this.saveStatus = "idle";
    }

    this.builderHandoffStatus = status;
    this.lastBuilderResult = this.#summarizeBuilderResult("save", result, {
      characterUpdated,
      status
    });
    this.#renderCurrentSnapshot();

    if (characterUpdated) {
      this.config.callbacks.onChange?.(this.getSnapshot());
    }

    return this.lastBuilderResult;
  }

  #handleBuilderExportResult(result = {}) {
    const characterDto = this.#extractBuilderCharacterDto(result);
    const characterUpdated = this.#syncCharacterFromBuilder(characterDto, {
      dirty: true
    });
    const status = characterUpdated ? "export-synced" : "export-issues";

    this.builderHandoffStatus = status;
    this.lastBuilderResult = this.#summarizeBuilderResult("export", result, {
      characterUpdated,
      status
    });
    this.#renderCurrentSnapshot();

    if (characterUpdated) {
      this.config.callbacks.onChange?.(this.getSnapshot());
    }

    return this.lastBuilderResult;
  }

  #handleBuilderError(error) {
    this.builderHandoffStatus = "failed";
    this.lastBuilderResult = {
      kind: "error",
      ok: false,
      status: "failed",
      reason: error?.code ?? "builder-error",
      message: error?.message ?? String(error),
      characterUpdated: false,
      generatedAt: new Date().toISOString(),
      compiled: false,
      files: [],
      issues: [summarizeBuilderIssue({
        type: "builder",
        reason: error?.code ?? "builder-error",
        message: error?.message ?? String(error)
      })]
    };
    this.handleError(error);
    return this.lastBuilderResult;
  }

  #createBuilderCallbacks(callbacks = {}) {
    const originalCallbacks = toObject(callbacks);
    return {
      ...originalCallbacks,
      onSave: (result) => {
        const summary = this.#handleBuilderSaveResult(result);
        this.#invokeCallback(originalCallbacks.onSave, result, summary, this);
      },
      onExport: (result) => {
        const summary = this.#handleBuilderExportResult(result);
        this.#invokeCallback(originalCallbacks.onExport, result, summary, this);
      },
      onError: (error) => {
        const summary = this.#handleBuilderError(error);
        this.#invokeCallback(originalCallbacks.onError, error, summary, this);
      }
    };
  }

  #createBuilderOpenConfig() {
    const activeCharacterId = this.model?.data?.id ?? this.config.characterId;
    const configuredBuilder = toObject(this.config.builder.config);
    const configuredCallbacks = {
      ...toObject(configuredBuilder.callbacks),
      ...toObject(this.config.builder.callbacks)
    };
    const currentCharacterDto = this.model?.toExportObject({ touchModified: false }) ?? null;
    const baseConfig = {
      mode: this.config.builder.openMode ?? "edit",
      characterId: activeCharacterId,
      mount: this.config.builder.mount,
      characterDto: currentCharacterDto,
      characterBaseUrl: this.config.characterBaseUrl,
      characterUrl: this.config.characterUrl,
      builderBaseUrl: this.config.builderBaseUrl,
      builderUrl: this.config.builderUrl,
      saveMethod: this.config.saveMethod,
      rulesCatalogBasePath: this.config.rulesCatalogBasePath,
      rulesCatalogKeys: this.config.rulesCatalogKeys,
      rulesBasePath: this.config.rulesBasePath,
      rulesProfile: this.config.rulesProfile
    };

    return {
      ...baseConfig,
      ...configuredBuilder,
      mode: configuredBuilder.mode ?? baseConfig.mode,
      characterId: activeCharacterId ?? configuredBuilder.characterId ?? null,
      callbacks: this.#createBuilderCallbacks(configuredCallbacks)
    };
  }

  async #normalizeBuilderOpenResult(opened, builderConfig) {
    const app = opened && typeof opened === "object" && typeof opened.getSnapshot === "function"
      ? opened
      : null;

    if (app?.ready && typeof app.ready.then === "function") {
      await app.ready;
    }

    this.builderInstance = app ?? this.builderInstance;

    if (opened && typeof opened === "object" && "ok" in opened) {
      return {
        ...opened,
        builderConfig,
        builderSnapshot: app?.getSnapshot?.() ?? opened.builderSnapshot
      };
    }

    return {
      ok: Boolean(opened),
      reason: opened ? "opened" : "builder-opener-unavailable",
      builderConfig,
      builderSnapshot: app?.getSnapshot?.() ?? null
    };
  }

  async openBuilder() {
    const builderConfig = this.#createBuilderOpenConfig();
    let result = {
      ok: false,
      reason: "builder-disabled",
      builderConfig
    };

    if (!this.config.builder.enabled) {
      this.builderHandoffStatus = "failed";
      this.lastBuilderResult = this.#summarizeBuilderResult("open", result, {
        status: "failed"
      });
      this.#renderCurrentSnapshot();
      this.config.callbacks.onOpenBuilder?.(result);
      return result;
    }

    if (!builderConfig.characterId) {
      result = {
        ok: false,
        reason: "missing-character",
        builderConfig
      };
      this.builderHandoffStatus = "failed";
      this.lastBuilderResult = this.#summarizeBuilderResult("open", result, {
        status: "failed"
      });
      this.#renderCurrentSnapshot();
      this.config.callbacks.onOpenBuilder?.(result);
      return result;
    }

    if (typeof this.config.builder.open !== "function" && typeof this.config.builder.app?.open !== "function") {
      result = {
        ok: false,
        reason: "builder-opener-unavailable",
        builderConfig
      };
      this.builderHandoffStatus = "failed";
      this.lastBuilderResult = this.#summarizeBuilderResult("open", result, {
        status: "failed"
      });
      this.#renderCurrentSnapshot();
      this.config.callbacks.onOpenBuilder?.(result);
      return result;
    }

    this.builderHandoffStatus = "opening";
    this.lastBuilderResult = this.#summarizeBuilderResult("open", {
      ok: true,
      reason: "opening"
    }, {
      status: "opening"
    });
    this.#renderCurrentSnapshot();

    try {
      if (typeof this.config.builder.open === "function") {
        result = await this.#normalizeBuilderOpenResult(
          await this.config.builder.open(builderConfig, this),
          builderConfig
        );
      } else {
        const openedApp = this.config.builder.app.open(builderConfig) ?? this.config.builder.app;
        result = await this.#normalizeBuilderOpenResult(openedApp, builderConfig);
      }

      this.builderHandoffStatus = result.ok ? "opened" : "failed";
      this.lastBuilderResult = this.#summarizeBuilderResult("open", result, {
        status: this.builderHandoffStatus
      });
      this.#renderCurrentSnapshot();
      this.config.callbacks.onOpenBuilder?.(result);
      return result;
    } catch (error) {
      const summary = this.#handleBuilderError(error);
      result = {
        ok: false,
        reason: summary.reason,
        error: summary.issues[0],
        builderConfig
      };
      this.config.callbacks.onOpenBuilder?.(result);
      return result;
    }
  }

  close(options = {}) {
    if (this.isDirty && !options.force) {
      this.lastCloseResult = createUnsavedChangesResult("close");
      this.#renderCurrentSnapshot();
      return this;
    }

    this.events.unbind();
    this.renderer.unmount();
    this.isOpen = false;
    this.lastCloseResult = {
      ok: true,
      action: "close",
      reason: "closed",
      message: "Sheet closed.",
      generatedAt: new Date().toISOString()
    };
    this.config.callbacks.onClose?.(this.getSnapshot());
    return this;
  }

  handleError(error) {
    this.config.callbacks.onError?.(error);
    this.lastError = {
      name: error?.name ?? "Error",
      message: error?.message ?? String(error),
      code: error?.code ?? ""
    };
    this.#renderCurrentSnapshot();
    return this;
  }

  #getBuilderStatus() {
    const enabled = Boolean(this.config.builder?.enabled);
    const hasCharacter = Boolean(this.model?.data?.id ?? this.config.characterId);
    const hasOpener = Boolean(
      typeof this.config.builder?.open === "function"
      || typeof this.config.builder?.app?.open === "function"
    );

    let status = "disabled";
    if (enabled && !hasCharacter) {
      status = "missing-character";
    } else if (enabled && !hasOpener) {
      status = "opener-unavailable";
    } else if (enabled) {
      status = "available";
    }

    return {
      enabled,
      hasCharacter,
      hasOpener,
      status,
      handoffStatus: this.builderHandoffStatus
    };
  }

  getSnapshot() {
    return {
      isOpen: this.isOpen,
      isDirty: this.isDirty,
      config: omitRuntimeConfig(this.config),
      character: this.model?.data ?? null,
      rulesCatalog: this.rulesCatalog,
      rulesProfile: this.config.rulesProfile,
      characterLoadResult: this.characterLoadResult,
      rulesLoadResult: this.rulesLoadResult,
      validationIssues: [...this.validationIssues],
      validationSummary: { ...this.validationSummary },
      loadStatus: this.loadStatus,
      saveStatus: this.saveStatus,
      exportStatus: this.exportStatus,
      builderHandoffStatus: this.builderHandoffStatus,
      builderStatus: this.#getBuilderStatus(),
      sheetTabs: this.#getSheetTabs(),
      lastSaveResult: this.lastSaveResult,
      lastExportResult: this.lastExportResult,
      lastBuilderResult: this.lastBuilderResult ? deepClone(this.lastBuilderResult) : null,
      lastCloseResult: this.lastCloseResult ? { ...this.lastCloseResult } : null,
      lastReloadResult: this.lastReloadResult ? { ...this.lastReloadResult } : null,
      persistenceBaseline: this.persistenceBaseline ? { ...this.persistenceBaseline } : null,
      lastError: this.lastError ? { ...this.lastError } : null
    };
  }
}
