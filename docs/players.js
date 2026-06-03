// generated from site-src/app/features/players/** - do not edit
// Source: site-src/app/features/players/**

// app/features/players/players-page-config.js
import { CharacterBuilderApp } from '../character-sheets/v1/builder/character-builder-app.js';

const playersPageConfig = Object.freeze({
  manifestPath: 'character-sheets/v1/players.json',
  rulesCatalogBasePath: 'character-sheets/v1/data/',
  selectors: {
    roster: '[data-roster]',
    status: '[data-roster-status]',
    createCharacterButton: '[data-create-character-button]'
  }
});

const playerManifestUrl = new URL(playersPageConfig.manifestPath, window.location.href);
const publicRulesProfile = Object.freeze({
  ruleset: '2014',
  allowedSources: ['PHB', 'XGE', 'TCE', 'SCAG'],
  sourcePolicy: 'all',
  asiAndFeatAtAsiLevels: true
});

// app/features/players/player-sheet-link-builder.js
function normalizePlayerText(value) {
  return String(value ?? '').trim();
}

function playerValueHasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function resolvePlayerManifestRelativeUrl(rawUrl) {
  const value = normalizePlayerText(rawUrl);

  if (!value) {
    return '';
  }

  if (playerValueHasProtocol(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return value.replace(/^\/+/, '');
  }

  return new URL(value, playerManifestUrl).href;
}

function createPlayerSheetUrl(character) {
  const characterId = normalizePlayerText(character?.id);

  if (!characterId) {
    return '';
  }

  return `character-sheets/v1/sheet.html?character=${encodeURIComponent(characterId)}`;
}

function createDraftCharacterId() {
  return `char-draft-${Date.now().toString(36)}`;
}

// app/features/players/load-player-manifest.js
async function fetchPlayerJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function loadPlayerManifest() {
  const manifest = await fetchPlayerJson(playerManifestUrl.href);
  return Array.isArray(manifest.characters) ? manifest.characters : [];
}

async function loadPlayerCharacterDetails(character) {
  const characterUrl = resolvePlayerManifestRelativeUrl(character?.characterUrl);

  if (!characterUrl) {
    return null;
  }

  return fetchPlayerJson(characterUrl);
}

// app/features/players/render-player-roster.js
function formatPlayerStatus(status) {
  const value = normalizePlayerText(status) || 'unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initialsForPlayer(character) {
  const source = normalizePlayerText(character?.characterName) || normalizePlayerText(character?.playerName) || '?';
  const words = source.replace(/['"]/g, '').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('') || '?';
}

function classNameFromPlayerRef(ref) {
  const clean = normalizePlayerText(ref)
    .replace(/\.json$/i, '')
    .replace(/^class-/i, '')
    .replace(/-/g, ' ');

  return clean.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summarizePlayerClass(entry, options = {}) {
  const className = normalizePlayerText(entry?.name) || classNameFromPlayerRef(entry?.main || entry?.classRef || entry?.ref);
  const subclass = normalizePlayerText(entry?.sub || entry?.subclassName || entry?.shortName);
  const variant = normalizePlayerText(entry?.subclassVariant);
  const classLevel = Array.isArray(entry?.levels) ? entry.levels.length : Number(entry?.level ?? 0);
  const nameParts = [variant ? `${subclass} (${variant})` : subclass, className].filter(Boolean);

  return [
    options.includeClassLevel && Number.isFinite(classLevel) && classLevel > 0 ? `${classLevel}` : '',
    nameParts.join(' ')
  ].filter(Boolean).join(' ');
}

function summarizePlayerCharacter(character) {
  const level = Number(character?.level ?? 0);
  const classes = Array.isArray(character?.classes) ? character.classes : [];
  const classSummary = classes.length
    ? classes.map((entry) => summarizePlayerClass(entry, { includeClassLevel: classes.length > 1 })).filter(Boolean).join(' / ')
    : '';

  if (Number.isFinite(level) && level > 0 && classSummary) {
    return `Level ${level} - ${classSummary}`;
  }

  if (Number.isFinite(level) && level > 0) {
    return `Level ${level}`;
  }

  return classSummary || 'Character details pending';
}

function createPlayerTextElement(tagName, className, text) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  element.textContent = text;
  return element;
}

function createPlayerPortrait(character) {
  const portrait = document.createElement('div');
  portrait.className = 'portrait';

  const fallback = document.createElement('span');
  fallback.textContent = initialsForPlayer(character);
  portrait.append(fallback);

  const portraitUrl = resolvePlayerManifestRelativeUrl(character?.portraitUrl);
  if (!portraitUrl) {
    return portrait;
  }

  const image = document.createElement('img');
  image.alt = '';
  image.loading = 'lazy';
  image.src = portraitUrl;
  image.addEventListener('load', () => {
    portrait.classList.add('has-image');
  }, { once: true });
  image.addEventListener('error', () => {
    image.remove();
    portrait.classList.remove('has-image');
  }, { once: true });
  portrait.append(image);

  return portrait;
}

function createPlayerRow(character, callbacks = {}) {
  const row = document.createElement('article');
  row.className = 'character-row';
  row.dataset.characterId = normalizePlayerText(character?.id);

  const main = document.createElement('div');
  main.className = 'character-main';
  main.append(
    createPlayerTextElement('h2', '', normalizePlayerText(character?.characterName) || 'Unnamed Character'),
    createPlayerTextElement('p', '', `Player: ${normalizePlayerText(character?.playerName) || 'Unknown'}`),
    createPlayerTextElement('p', 'summary', 'Loading character details...')
  );

  const status = createPlayerTextElement('span', 'status-pill', formatPlayerStatus(character?.status));
  status.dataset.status = normalizePlayerText(character?.status).toLowerCase();

  const actions = document.createElement('div');
  actions.className = 'row-actions';

  const openSheet = document.createElement('a');
  openSheet.className = 'button';
  openSheet.href = createPlayerSheetUrl(character) || '#';
  openSheet.textContent = 'Open Sheet';
  openSheet.dataset.sheetOpenButton = 'true';
  openSheet.dataset.characterUrl = resolvePlayerManifestRelativeUrl(character?.characterUrl);

  if (!openSheet.dataset.characterUrl || !openSheet.href) {
    openSheet.setAttribute('aria-disabled', 'true');
  }

  openSheet.addEventListener('click', () => {
    if (typeof callbacks.onOpenSheet === 'function') {
      callbacks.onOpenSheet(character, row);
    }
  });

  actions.append(openSheet);

  const legacyUrl = resolvePlayerManifestRelativeUrl(character?.legacyUrl);
  if (legacyUrl) {
    const legacyLink = document.createElement('a');
    legacyLink.className = 'button button-secondary';
    legacyLink.href = legacyUrl;
    legacyLink.textContent = 'Legacy Page';
    actions.append(legacyLink);
  }

  row.append(createPlayerPortrait(character), main, status, actions);
  return row;
}

function renderPlayerEmptyState(rosterElement, message, className = 'empty-state') {
  rosterElement.replaceChildren(createPlayerTextElement('p', className, message));
}

function renderPlayerRoster(rosterElement, characters, callbacks = {}) {
  const rows = characters.map((character) => createPlayerRow(character, callbacks));
  rosterElement.replaceChildren(...rows);
  return rows;
}

function renderPlayerSummary(row, characterDto) {
  const summary = row.querySelector('.summary');

  if (!summary) {
    return;
  }

  summary.textContent = summarizePlayerCharacter(characterDto);
}

function renderPlayerSummaryUnavailable(row, error) {
  const summary = row.querySelector('.summary');

  if (!summary) {
    return;
  }

  summary.textContent = 'Character details unavailable';
  row.dataset.loadError = error?.message ?? String(error);
}

// app/features/players/bind-create-character-actions.js
function getBuilderExportFiles(result = {}) {
  if (Array.isArray(result.files)) {
    return result.files;
  }

  if (Array.isArray(result.payload?.files)) {
    return result.payload.files;
  }

  return [];
}

function formatBuilderExportFileNames(result = {}) {
  const names = getBuilderExportFiles(result)
    .map((file) => normalizePlayerText(file?.fileName))
    .filter(Boolean);

  return names.join(', ') || 'draft JSON';
}

function createPublicBuilderCallbacks(onStatusChange, options = {}) {
  return {
    onLoad(snapshot) {
      onStatusChange(`Builder ${snapshot.loadStatus}: ${snapshot.builderSummary?.characterId ?? 'draft'}`);
    },
    onExport(result) {
      onStatusChange(result.downloadResult?.ok
        ? `Exported draft: ${formatBuilderExportFileNames(result)}`
        : `Draft ready: ${formatBuilderExportFileNames(result)}`);
    },
    onSave(result) {
      onStatusChange(result.ok
        ? 'Builder draft saved.'
        : `Builder save unavailable: ${result.reason ?? 'export draft instead'}`);
    },
    onClose() {
      onStatusChange(options.getCloseMessage());
    },
    onError(error) {
      onStatusChange(error?.message ?? String(error));
    }
  };
}

function bindCreateCharacterActions(button, builderApp, options = {}) {
  if (!button) {
    return;
  }

  const onStatusChange = typeof options.onStatusChange === 'function'
    ? options.onStatusChange
    : () => {};
  const getCloseMessage = typeof options.getCloseMessage === 'function'
    ? options.getCloseMessage
    : () => 'Roster ready';

  async function openNewCharacterDraft() {
    if (builderApp.getSnapshot().isOpen) {
      builderApp.close();
    }

    const draftId = createDraftCharacterId();
    button.disabled = true;
    button.textContent = 'Opening...';
    onStatusChange(`Opening new draft ${draftId}`);

    try {
      builderApp.open({
        mode: 'new',
        characterId: draftId,
        rulesCatalogBasePath: playersPageConfig.rulesCatalogBasePath,
        rulesProfile: publicRulesProfile,
        persistenceMode: 'export-only',
        callbacks: createPublicBuilderCallbacks(onStatusChange, { getCloseMessage })
      });
      await builderApp.ready;
    } catch (error) {
      onStatusChange(error?.message ?? String(error));
    } finally {
      button.disabled = false;
      button.textContent = 'Create Character';
    }
  }

  button.addEventListener('click', () => {
    void openNewCharacterDraft();
  });
}

// app/features/players/boot-players-page.js
function formatPlayerRosterCount(count) {
  return `${count} character${count === 1 ? '' : 's'}`;
}

async function bootPlayersPage() {
  const rosterElement = document.querySelector(playersPageConfig.selectors.roster);
  const statusElement = document.querySelector(playersPageConfig.selectors.status);
  const createCharacterButton = document.querySelector(playersPageConfig.selectors.createCharacterButton);

  if (!rosterElement || !statusElement) {
    return;
  }

  const builderApp = new CharacterBuilderApp();
  let currentRosterCount = 0;
  let activeCharacterId = '';

  function setStatus(message) {
    statusElement.textContent = message;
  }

  function markActiveRow(characterId) {
    activeCharacterId = normalizePlayerText(characterId);

    rosterElement.querySelectorAll('.character-row').forEach((row) => {
      row.dataset.active = String(row.dataset.characterId === activeCharacterId);
    });
  }

  bindCreateCharacterActions(createCharacterButton, builderApp, {
    onStatusChange: setStatus,
    getCloseMessage: () => formatPlayerRosterCount(currentRosterCount)
  });

  try {
    const characters = await loadPlayerManifest();

    if (!characters.length) {
      currentRosterCount = 0;
      setStatus('No characters found');
      renderPlayerEmptyState(rosterElement, 'No player characters are listed yet.');
      return;
    }

    currentRosterCount = characters.length;
    const rows = renderPlayerRoster(rosterElement, characters, {
      onOpenSheet(character) {
        markActiveRow(character?.id);
        setStatus(`${normalizePlayerText(character?.characterName) || 'Character'} opened.`);
      }
    });

    setStatus(formatPlayerRosterCount(characters.length));

    await Promise.all(characters.map(async (character, index) => {
      try {
        const characterDto = await loadPlayerCharacterDetails(character);

        if (characterDto) {
          renderPlayerSummary(rows[index], characterDto);
          return;
        }

        renderPlayerSummaryUnavailable(rows[index], new Error('Missing character JSON path.'));
      } catch (error) {
        renderPlayerSummaryUnavailable(rows[index], error);
      }
    }));

    const failedRows = rows.filter((row) => row.dataset.loadError);
    if (failedRows.length) {
      setStatus(`${formatPlayerRosterCount(characters.length)}, ${failedRows.length} detail load issue${failedRows.length === 1 ? '' : 's'}`);
    }
  } catch (error) {
    setStatus('Roster unavailable');
    renderPlayerEmptyState(rosterElement, `Unable to load players.json: ${error.message}`, 'error-state');
  }
}

void bootPlayersPage();

