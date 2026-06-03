import { CharacterBuilderApp } from './builder/character-builder-app.js';
import { CharacterSheetApp } from './sheet/character-sheet-app.js';
import { resolveManifestRelativeUrl } from './sheet/character-sheet-loader.js';
import * as CharacterRules from './character-rules.js';

export const DEFAULT_RULES_CATALOG_BASE_PATH = './data/';
export const DEFAULT_RULES_PROFILE = Object.freeze({
  ruleset: '2014',
  allowedSources: ['PHB', 'XGE', 'TCE', 'SCAG'],
  sourcePolicy: 'all',
  asiAndFeatAtAsiLevels: true
});

function normalizeText(value) {
  return String(value ?? '').trim();
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function resolveElement(target) {
  if (typeof target === 'string') {
    return document.querySelector(target);
  }

  return target ?? null;
}

function setText(target, message) {
  const element = resolveElement(target);
  if (element) {
    element.textContent = message;
  }
}

function getSearchParams(params) {
  if (params instanceof URLSearchParams) {
    return params;
  }

  if (typeof params === 'string') {
    return new URLSearchParams(params);
  }

  return new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
}

function resolvePageUrl(rawUrl, baseUrl = '') {
  const value = normalizeText(rawUrl);
  if (!value) {
    return '';
  }

  const fallbackBase = typeof window === 'undefined' ? '' : window.location.href;
  return resolveManifestRelativeUrl(value, normalizeText(baseUrl) || fallbackBase);
}

export async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchOptionalJson(url) {
  if (!url) {
    return {
      ok: false,
      reason: 'missing-url',
      dto: null,
      error: null
    };
  }

  try {
    return {
      ok: true,
      reason: 'loaded',
      dto: await fetchJson(url),
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'load-failed',
      dto: null,
      error
    };
  }
}

export async function loadPlayerManifest(options = {}) {
  const manifestUrl = new URL(options.manifestPath ?? 'players.json', options.baseUrl ?? window.location.href);
  return {
    manifestUrl: manifestUrl.href,
    manifest: await fetchJson(manifestUrl.href)
  };
}

function findManifestCharacter(manifest, requestedId) {
  const characters = Array.isArray(manifest?.characters) ? manifest.characters : [];
  if (!characters.length) {
    return null;
  }

  if (requestedId) {
    return characters.find((character) => normalizeText(character.id) === requestedId) ?? null;
  }

  return characters.find((character) => normalizeText(character.status) === 'active') ?? characters[0];
}

export async function loadCurrentCharacter(options = {}) {
  const params = getSearchParams(options.params);
  const requestedId = normalizeText(
    options.characterId
    ?? params.get('character')
    ?? params.get('id')
    ?? options.defaultCharacterId
  );
  const directCharacterUrl = normalizeText(options.characterUrl ?? params.get('characterUrl'));
  const directBuilderUrl = normalizeText(options.builderUrl ?? params.get('builderUrl'));
  const includeCharacterDto = options.includeCharacterDto !== false;
  const includeBuilderDto = Boolean(options.includeBuilderDto);
  const pageBaseUrl = options.baseUrl ?? (typeof window === 'undefined' ? '' : window.location.href);

  let character = null;
  let manifestUrl = '';
  let characterUrl = directCharacterUrl ? resolvePageUrl(directCharacterUrl, pageBaseUrl) : '';
  let builderUrl = directBuilderUrl ? resolvePageUrl(directBuilderUrl, pageBaseUrl) : '';

  if (characterUrl) {
    character = {
      id: requestedId,
      characterName: requestedId || 'Character',
      characterUrl,
      builderUrl
    };
  } else {
    const loadedManifest = await loadPlayerManifest({
      manifestPath: options.manifestPath ?? 'players.json',
      baseUrl: pageBaseUrl
    });
    manifestUrl = loadedManifest.manifestUrl;
    character = findManifestCharacter(loadedManifest.manifest, requestedId);
    if (!character) {
      throw new Error(requestedId ? `Character not found: ${requestedId}` : 'No characters found.');
    }

    characterUrl = resolveManifestRelativeUrl(character.characterUrl, manifestUrl);
    builderUrl = resolveManifestRelativeUrl(character.builderUrl, manifestUrl);
  }

  const characterDto = includeCharacterDto && characterUrl ? await fetchJson(characterUrl) : null;
  const builderResult = includeBuilderDto ? await fetchOptionalJson(builderUrl) : null;
  const id = normalizeText(character.id) || normalizeText(characterDto?.id) || requestedId;

  return {
    id,
    characterName: normalizeText(character.characterName) || normalizeText(characterDto?.identity?.name) || id || 'Character',
    playerName: normalizeText(character.playerName),
    characterUrl,
    builderUrl,
    manifestUrl,
    manifestEntry: character,
    characterDto,
    builderDto: builderResult?.dto ?? null,
    builderLoadResult: builderResult
  };
}

function createSheetController(app, options = {}) {
  return {
    app,
    builderApp: options.builderApp ?? null,
    rules: CharacterRules,
    get ready() {
      return app.ready;
    },
    getSnapshot() {
      return app.getSnapshot();
    },
    getCharacterDto() {
      return app.getSnapshot().character;
    },
    setCharacterDto(characterDto, updateOptions = {}) {
      return app.setCharacter(characterDto, updateOptions);
    },
    async reloadCharacter(reloadOptions = {}) {
      const characterUrl = normalizeText(reloadOptions.characterUrl ?? options.characterUrl);
      if (!characterUrl) {
        return {
          ok: false,
          reason: 'missing-character-url',
          snapshot: app.getSnapshot()
        };
      }

      const characterDto = await fetchJson(characterUrl);
      app.setCharacter(characterDto, {
        dirty: false,
        url: characterUrl,
        ...toObject(reloadOptions.setCharacterOptions)
      });
      return {
        ok: true,
        reason: 'reloaded',
        characterDto,
        snapshot: app.getSnapshot()
      };
    },
    patch(path, value) {
      return app.patch(path, value);
    },
    apply(action, payload = {}) {
      return app.applyTableStateAction(action, payload);
    },
    save(options = {}) {
      return app.save(options);
    },
    export(options = {}) {
      return app.export(options);
    },
    openBuilder() {
      return app.openBuilder();
    },
    close(options = {}) {
      return app.close(options);
    }
  };
}

export function mountSheet(options = {}) {
  const builderApp = options.builderApp ?? new CharacterBuilderApp();
  const app = options.app ?? new CharacterSheetApp();
  const builderEnabled = options.builderEnabled ?? Boolean(options.builderUrl || options.builderDto || options.enableBuilder);
  const controller = createSheetController(app, {
    builderApp,
    characterUrl: options.characterUrl
  });

  app.open({
    mode: options.mode ?? 'play',
    mount: options.mount ?? '#sheet-root',
    characterId: options.characterId,
    characterDto: options.characterDto,
    characterUrl: options.characterUrl,
    builderUrl: options.builderUrl,
    rulesCatalog: options.rulesCatalog,
    rulesCatalogBasePath: options.rulesCatalogBasePath ?? DEFAULT_RULES_CATALOG_BASE_PATH,
    rulesCatalogKeys: options.rulesCatalogKeys,
    rulesProfile: {
      ...DEFAULT_RULES_PROFILE,
      ...toObject(options.rulesProfile)
    },
    persistenceMode: options.persistenceMode ?? 'export-only',
    activeTab: options.activeTab ?? 'overview',
    builder: {
      enabled: builderEnabled,
      openMode: options.builderOpenMode ?? 'edit',
      open(config) {
        return builderApp.open({
          ...config,
          builderDto: options.builderDto ?? config.builderDto ?? null,
          persistenceMode: config.persistenceMode ?? options.persistenceMode ?? 'export-only'
        });
      },
      config: {
        persistenceMode: options.persistenceMode ?? 'export-only',
        builderDto: options.builderDto ?? null,
        ...toObject(options.builderConfig)
      },
      callbacks: toObject(options.builderCallbacks)
    },
    callbacks: toObject(options.callbacks)
  });

  return controller;
}

function createBuilderController(app) {
  return {
    app,
    rules: CharacterRules,
    get ready() {
      return app.ready;
    },
    getSnapshot() {
      return app.getSnapshot();
    },
    export(options = {}) {
      return app.export(options);
    },
    save(options = {}) {
      return app.save(options);
    },
    close(options = {}) {
      return app.close(options);
    }
  };
}

function prepareEmbeddedBuilderMount(mount) {
  const element = resolveElement(mount);
  if (!element) {
    return mount;
  }

  element.classList.add('character-builder-root');
  element.dataset.builderEmbedded = 'true';
  return element;
}

export function mountBuilder(options = {}) {
  const app = options.app ?? new CharacterBuilderApp();
  const callbacks = toObject(options.callbacks);
  const controller = createBuilderController(app);

  app.open({
    mode: options.mode ?? 'edit',
    mount: options.embedded === false ? options.mount : prepareEmbeddedBuilderMount(options.mount ?? '#builder-root'),
    characterId: options.characterId,
    characterDto: options.characterDto,
    builderDto: options.builderDto,
    characterUrl: options.characterUrl,
    builderUrl: options.builderUrl,
    rulesCatalogBasePath: options.rulesCatalogBasePath ?? DEFAULT_RULES_CATALOG_BASE_PATH,
    rulesCatalogKeys: options.rulesCatalogKeys,
    rulesProfile: {
      ...DEFAULT_RULES_PROFILE,
      ...toObject(options.rulesProfile)
    },
    persistenceMode: options.persistenceMode ?? 'export-only',
    callbacks: {
      ...callbacks,
      onExport(result) {
        if (result?.characterDto && typeof options.onCompile === 'function') {
          options.onCompile(result.characterDto, result);
        }

        callbacks.onExport?.(result);
      }
    }
  });

  return controller;
}

function formatExportNames(result) {
  const files = Array.isArray(result?.files) ? result.files : [];
  return files.map((file) => file.fileName).filter(Boolean).join(', ') || 'draft JSON';
}

export async function bootSheetPage(options = {}) {
  const title = resolveElement(options.title ?? '[data-character-title]');
  const status = resolveElement(options.status ?? '[data-character-status]');
  const openBuilderButton = resolveElement(options.openBuilderButton ?? '[data-open-builder]');
  const reloadButton = resolveElement(options.reloadButton ?? '[data-reload-sheet]');
  const sheetRoot = resolveElement(options.mount ?? '#sheet-root');

  setText(status, 'Loading character...');

  let controller = null;
  try {
    const loaded = await loadCurrentCharacter({
      ...options,
      includeCharacterDto: true,
      includeBuilderDto: true
    });

    setText(title, loaded.characterName || 'Character Sheet');
    if (typeof document !== 'undefined') {
      document.title = `${loaded.characterName || 'Character Sheet'} - Eldoria`;
    }

    controller = mountSheet({
      mount: sheetRoot,
      characterId: loaded.id,
      characterDto: loaded.characterDto,
      characterUrl: loaded.characterUrl,
      builderDto: loaded.builderDto,
      builderUrl: loaded.builderUrl,
      rulesCatalogBasePath: options.rulesCatalogBasePath ?? DEFAULT_RULES_CATALOG_BASE_PATH,
      rulesProfile: options.rulesProfile,
      persistenceMode: options.persistenceMode ?? 'export-only',
      callbacks: {
        onLoad(snapshot) {
          if (openBuilderButton) {
            openBuilderButton.disabled = false;
          }

          if (reloadButton) {
            reloadButton.disabled = false;
          }

          setText(status, [
            snapshot.character?.identity?.name ?? loaded.id,
            snapshot.loadStatus,
            snapshot.rulesLoadResult?.reason
          ].filter(Boolean).join(' | '));
          options.callbacks?.onLoad?.(snapshot);
        },
        onExport(result) {
          setText(status, result.downloadResult?.ok
            ? `Exported draft: ${result.file?.fileName ?? 'character.json'}`
            : `Draft ready: ${result.file?.fileName ?? 'character.json'}`);
          options.callbacks?.onExport?.(result);
        },
        onOpenBuilder(result) {
          setText(status, result.ok ? 'Builder opened for draft edits.' : `Builder unavailable: ${result.reason ?? 'open failed'}`);
          options.callbacks?.onOpenBuilder?.(result);
        },
        onClose(snapshot) {
          setText(status, 'Character sheet closed.');
          options.callbacks?.onClose?.(snapshot);
        },
        onError(error) {
          setText(status, error?.message ?? String(error));
          options.callbacks?.onError?.(error);
        }
      },
      builderCallbacks: {
        onLoad(snapshot) {
          setText(status, `Builder ${snapshot.loadStatus}: ${snapshot.builderSummary?.characterId ?? 'draft'}`);
          options.builderCallbacks?.onLoad?.(snapshot);
        },
        onExport(result) {
          setText(status, result.downloadResult?.ok
            ? `Exported draft: ${formatExportNames(result)}`
            : `Draft ready: ${formatExportNames(result)}`);
          options.builderCallbacks?.onExport?.(result);
        },
        onSave(result) {
          setText(status, result.ok ? 'Builder draft saved.' : `Builder save unavailable: ${result.reason ?? 'export draft instead'}`);
          options.builderCallbacks?.onSave?.(result);
        },
        onClose(snapshot) {
          setText(status, controller?.getSnapshot().character?.identity?.name ?? 'Character loaded.');
          options.builderCallbacks?.onClose?.(snapshot);
        },
        onError(error) {
          setText(status, error?.message ?? String(error));
          options.builderCallbacks?.onError?.(error);
        }
      }
    });

    openBuilderButton?.addEventListener('click', () => {
      void controller.openBuilder();
    });

    reloadButton?.addEventListener('click', () => {
      setText(status, 'Reloading character sheet...');
      void controller.reloadCharacter().catch((error) => {
        setText(status, error?.message ?? String(error));
      });
    });

    await controller.ready;
    return controller;
  } catch (error) {
    setText(status, 'Character unavailable.');
    if (sheetRoot) {
      sheetRoot.innerHTML = `<p class="callout" data-tone="danger">${String(error?.message ?? error)}</p>`;
    }

    throw error;
  }
}

export async function bootBuilderPage(options = {}) {
  const title = resolveElement(options.title ?? '[data-character-title]');
  const status = resolveElement(options.status ?? '[data-character-status]');
  const builderRoot = resolveElement(options.mount ?? '#builder-root');

  setText(status, 'Loading builder...');

  let controller = null;
  try {
    const loaded = await loadCurrentCharacter({
      ...options,
      includeCharacterDto: true,
      includeBuilderDto: true
    });

    setText(title, `${loaded.characterName || 'Character'} Builder`);
    if (typeof document !== 'undefined') {
      document.title = `${loaded.characterName || 'Character'} Builder - Eldoria`;
    }

    controller = mountBuilder({
      mount: builderRoot,
      characterId: loaded.id,
      characterDto: loaded.characterDto,
      builderDto: loaded.builderDto,
      characterUrl: loaded.characterUrl,
      builderUrl: loaded.builderUrl,
      rulesCatalogBasePath: options.rulesCatalogBasePath ?? DEFAULT_RULES_CATALOG_BASE_PATH,
      rulesProfile: options.rulesProfile,
      persistenceMode: options.persistenceMode ?? 'export-only',
      callbacks: {
        onLoad(snapshot) {
          setText(status, `Builder ${snapshot.loadStatus}: ${snapshot.builderSummary?.characterId ?? loaded.id}`);
          options.callbacks?.onLoad?.(snapshot);
        },
        onExport(result) {
          setText(status, result.downloadResult?.ok
            ? `Exported draft: ${formatExportNames(result)}`
            : `Draft ready: ${formatExportNames(result)}`);
          options.callbacks?.onExport?.(result);
        },
        onSave(result) {
          setText(status, result.ok ? 'Builder draft saved.' : `Builder save unavailable: ${result.reason ?? 'export draft instead'}`);
          options.callbacks?.onSave?.(result);
        },
        onClose(snapshot) {
          setText(status, 'Builder closed.');
          options.callbacks?.onClose?.(snapshot);
        },
        onError(error) {
          setText(status, error?.message ?? String(error));
          options.callbacks?.onError?.(error);
        }
      },
      onCompile: options.onCompile
    });

    await controller.ready;
    return controller;
  } catch (error) {
    setText(status, 'Builder unavailable.');
    if (builderRoot) {
      builderRoot.innerHTML = `<p class="callout" data-tone="danger">${String(error?.message ?? error)}</p>`;
    }

    throw error;
  }
}

export const EldoriaCharacters = Object.freeze({
  DEFAULT_RULES_CATALOG_BASE_PATH,
  DEFAULT_RULES_PROFILE,
  rules: CharacterRules,
  fetchJson,
  loadPlayerManifest,
  loadCurrentCharacter,
  mountSheet,
  mountBuilder,
  bootSheetPage,
  bootBuilderPage
});

if (typeof window !== 'undefined') {
  window.EldoriaCharacters = EldoriaCharacters;
}
