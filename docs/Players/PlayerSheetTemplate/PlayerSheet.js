import { EldoriaApiClient } from "../../api/apiClient/index.js";
import { BuildPlayerSheetHeader } from "./PlayerSheetJavaScript/PlayerSheetHeaderBuilder.js";
import { BuildPlayerSheetSidebar } from "./PlayerSheetJavaScript/PlayerSheetSidebarBuilder.js";
import { BuildPlayerSheetOffenseTab } from "./PlayerSheetJavaScript/PlayerSheetOffenseTabBuilder.js";
import { BuildPlayerSheetDefenseTab } from "./PlayerSheetJavaScript/PlayerSheetDefenseTabBuilder.js";
import { BuildPlayerSheetGearTab } from "./PlayerSheetJavaScript/PlayerSheetGearTabBuilder.js";
import { BuildPlayerSheetSkillsTab } from "./PlayerSheetJavaScript/PlayerSheetSkillsTabBuilder.js";
import { BuildPlayerSheetSpellsTab } from "./PlayerSheetJavaScript/PlayerSheetSpellsTabBuilder.js";
import { BuildPlayerSheetPetsTab } from "./PlayerSheetJavaScript/PlayerSheetPetsTabBuilder.js";
import { BuildPlayerSheetFeatsTab } from "./PlayerSheetJavaScript/PlayerSheetFeatsTabBuilder.js";
import { BuildPlayerSheetNotesTab } from "./PlayerSheetJavaScript/PlayerSheetNotesTabBuilder.js";
import { BuildPlayerSheetReferenceTab } from "./PlayerSheetJavaScript/PlayerSheetReferenceTabBuilder.js";
import { bootLevelEditor } from "./LevelEditorJavaScript/Core/LevelEditorBuilder.js";
import { PlayerSheetDtoHelper } from "./PlayerSheetDtoHelper.js";
import { SheetCompiler } from "./SheetCompiler.js";
import {
    applyResolvedReferencesToDto,
    resolvePlayerSheetReferences
} from "./ReferenceResolver.js";
import { normalizeCacheKeyPart, readCachedJson, writeCachedJson } from "../web-cache.js";
const DEFAULT_API_BASE_URL = "https://fn-eldoria-ahakafekhxczebhn.eastus-01.azurewebsites.net/api";
const PLAYER_CHARACTER_CACHE_TTL_MS = 10 * 60 * 1000;
const PLAYER_CHARACTER_CACHE_MAX_BYTES = 750 * 1024;

function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return DEFAULT_API_BASE_URL;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("apiBaseUrl") || DEFAULT_API_BASE_URL;
}

function getBooleanQueryFlag(...names) {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return names.some((name) => {
    const value = params.get(name);
    return value === "1" || value === "true" || value === "yes" || value === "on";
  });
}

function shouldShowStructuredOptionCoverage() {
  return getBooleanQueryFlag(
    "structuredOptions",
    "showStructuredOptions",
    "debugStructuredOptions",
    "showStructuredOptionCoverage"
  );
}

const api = new EldoriaApiClient({
  baseUrl: getApiBaseUrl()
});

let currentPlayerSheetDto = null;
let currentRuntimePlayerSheetDto = null;
let currentCharacterSheet = null;
let currentReferenceResolution = null;
let currentTabName = 'Offense'; 
let saveTimer = null;
let saveInFlight = false;
let pendingSaveDto = null;
let lastSavedFingerprint = "";

const SAVE_DEBOUNCE_MS = 700;

const TAB_BUILDERS = {
    Offense: BuildPlayerSheetOffenseTab,
    Defense: BuildPlayerSheetDefenseTab,
    Gear: BuildPlayerSheetGearTab,
    Skills: BuildPlayerSheetSkillsTab,
    Spells: BuildPlayerSheetSpellsTab,
    Pets: BuildPlayerSheetPetsTab,
    Feats: BuildPlayerSheetFeatsTab,
    Notes: BuildPlayerSheetNotesTab,
    Reference: BuildPlayerSheetReferenceTab
};

function getPlayerCharacterCacheKey(characterId) {
    return `player-sheet:character:${normalizeCacheKeyPart(characterId)}`;
}

function rememberPlayerCharacterDto(characterId, dto) {
    if (!characterId || !dto) {
        return;
    }

    writeCachedJson(getPlayerCharacterCacheKey(characterId), dto, {
        maxStorageBytes: PLAYER_CHARACTER_CACHE_MAX_BYTES,
        ttlMs: PLAYER_CHARACTER_CACHE_TTL_MS
    });
}

function readPlayerCharacterDto(characterId) {
    if (!characterId) {
        return null;
    }

    return readCachedJson(getPlayerCharacterCacheKey(characterId), {
        maxStorageBytes: PLAYER_CHARACTER_CACHE_MAX_BYTES,
        ttlMs: PLAYER_CHARACTER_CACHE_TTL_MS
    });
}

/**
 * 
 * @param {string} tabName 
 * @returns 
 */
export async function setTab(tabName)
{
    currentTabName = tabName;
    try {
        updateActiveTabButton(tabName);
        const builder = TAB_BUILDERS[tabName];
        if(builder != null && currentCharacterSheet != null) {
            await builder(currentCharacterSheet, {
                api,
                dto: currentPlayerSheetDto,
                onChange: applyPlayerSheetDto
            });
            return;
        }

        const tabContentContainer = document.querySelector("#TabContent");

        const ContentHtml = document.createElement("p");
        ContentHtml.textContent = tabName;

        tabContentContainer.replaceChildren(ContentHtml);
    } catch (error) {
        console.error(`Failed to render tab "${tabName}":`, error);
        const tabContentContainer = document.querySelector("#TabContent");
        if (tabContentContainer) {
            const ContentHtml = document.createElement("p");
            ContentHtml.textContent = "Unable to load tab content.";
            tabContentContainer.replaceChildren(ContentHtml);
        }
    }
}

function getRequestedPlayerId() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get('id') || urlParams.get('character');
}

function createSaveFingerprint(dto) {
    try {
        return JSON.stringify(dto || null);
    } catch (_error) {
        return "";
    }
}

function updateActiveTabButton(tabName) {
    document.querySelectorAll("#TabRowList button").forEach((button) => {
        const isActive = button.dataset.tab === tabName || button.textContent.trim() === tabName;
        button.classList.toggle("player-sheet-tab-button--active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
}

function ensureSaveStatusElement() {
    if (typeof document === "undefined") {
        return null;
    }

    let status = document.querySelector("#level-editor-save-status");
    if (status) {
        return status;
    }

    const title = document.querySelector("#level-editor-title");
    const host = title?.parentElement || document.querySelector("#sidebar-level-editor");
    if (!host) {
        return null;
    }

    status = document.createElement("p");
    status.id = "level-editor-save-status";
    status.className = "level-editor__save-status";
    status.setAttribute("aria-live", "polite");
    status.textContent = "Loaded";

    if (title?.nextSibling) {
        host.insertBefore(status, title.nextSibling);
    } else if (title) {
        host.appendChild(status);
    } else {
        host.prepend(status);
    }

    return status;
}

function setSaveStatus(state, message) {
    const status = ensureSaveStatusElement();
    if (!status) {
        return;
    }

    status.dataset.saveStatus = state;
    status.textContent = message;
}

function normalizeDtoForCurrentCharacter(nextDto) {
    const id = getRequestedPlayerId() || nextDto?.id || currentPlayerSheetDto?.id || "";
    const normalized = PlayerSheetDtoHelper.normalize(nextDto, {
        id
    });

    return id && normalized.id !== id
        ? { ...normalized, id }
        : normalized;
}

async function flushPendingSave() {
    if (saveInFlight || !pendingSaveDto) {
        return;
    }

    const dtoToSave = pendingSaveDto;
    pendingSaveDto = null;

    const characterId = dtoToSave.id || getRequestedPlayerId();
    if (!characterId) {
        setSaveStatus("unavailable", "Save unavailable: missing character id.");
        return;
    }

    const fingerprint = createSaveFingerprint(dtoToSave);
    if (fingerprint && fingerprint === lastSavedFingerprint) {
        setSaveStatus("saved", "Saved");
        return;
    }

    saveInFlight = true;
    setSaveStatus("saving", "Saving...");

    try {
        const strictDto = PlayerSheetDtoHelper.toSaveDto(dtoToSave, {
            id: characterId
        });
        const persistedDto = await api.saveCharacterSheet(characterId, {
            ...strictDto,
            id: characterId
        });

        rememberPlayerCharacterDto(characterId, persistedDto || strictDto);
        lastSavedFingerprint = fingerprint || createSaveFingerprint(persistedDto);
        setSaveStatus("saved", "Saved");
    } catch (error) {
        console.error("Failed to save player sheet DTO:", error);
        setSaveStatus("failed", "Save failed. Local edits are still on this page.");
    } finally {
        saveInFlight = false;
        if (pendingSaveDto) {
            if (saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
            void flushPendingSave();
        }
    }
}

function schedulePlayerSheetSave(nextDto, options = {}) {
    pendingSaveDto = nextDto;
    setSaveStatus("pending", "Unsaved changes");

    if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
    }

    const delay = options.immediate ? 0 : SAVE_DEBOUNCE_MS;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        void flushPendingSave();
    }, delay);
}

function hasUnsavedPlayerSheetChanges() {
    if (pendingSaveDto || saveInFlight) {
        return true;
    }

    const currentFingerprint = createSaveFingerprint(currentPlayerSheetDto);
    return Boolean(currentFingerprint && lastSavedFingerprint && currentFingerprint !== lastSavedFingerprint);
}

async function applyPlayerSheetDto(nextDto, options = {}) {
  const shouldPersist = options.persist !== false;
  const shouldResolveReferences = options.resolveReferences !== false;

  currentPlayerSheetDto = PlayerSheetDtoHelper.toSaveDto(normalizeDtoForCurrentCharacter(nextDto));

  if (!shouldResolveReferences) {
    currentReferenceResolution = null;
    currentRuntimePlayerSheetDto = currentPlayerSheetDto;
  } else {
    try {
      currentReferenceResolution = await resolvePlayerSheetReferences(currentPlayerSheetDto, api);
      currentRuntimePlayerSheetDto = applyResolvedReferencesToDto(currentPlayerSheetDto, currentReferenceResolution);
    } catch (error) {
      console.warn("Reference resolution failed; rendering from strict DTO only:", error);
      currentReferenceResolution = {
          ok: false,
          failures: [{ message: error?.message || String(error) }],
          byPath: {}
      };
      currentRuntimePlayerSheetDto = currentPlayerSheetDto;
    }
  }

  currentCharacterSheet = SheetCompiler.compile(currentPlayerSheetDto, {
    references: currentReferenceResolution
  });

  await renderCurrentPlayerSheet();

  if (shouldPersist) {
    schedulePlayerSheetSave(PlayerSheetDtoHelper.toSaveDto(currentPlayerSheetDto), options);
  }
}

async function hydratePlayerSheetReferences(dtoSnapshot) {
  const strictSnapshot = PlayerSheetDtoHelper.toSaveDto(dtoSnapshot);
  const snapshotFingerprint = createSaveFingerprint(strictSnapshot);

  try {
    const references = await resolvePlayerSheetReferences(strictSnapshot, api);
    if (snapshotFingerprint !== createSaveFingerprint(currentPlayerSheetDto)) {
      return;
    }

    currentReferenceResolution = references;
    currentRuntimePlayerSheetDto = applyResolvedReferencesToDto(currentPlayerSheetDto, references);
    currentCharacterSheet = SheetCompiler.compile(currentPlayerSheetDto, { references });
    await renderCurrentPlayerSheet();
  } catch (error) {
    console.warn("Background reference resolution failed; keeping the rendered strict DTO:", error);
  }
}

async function updateExperience(experience) {
  if (!currentPlayerSheetDto) {
    return;
  }

  const nextDto = PlayerSheetDtoHelper.patch(currentPlayerSheetDto, "identity.experience", experience);
  await applyPlayerSheetDto(nextDto);
}

async function renderCurrentPlayerSheet() {
  BuildPlayerSheetHeader(currentCharacterSheet, {
    onExperienceChange: updateExperience
  });
  BuildPlayerSheetSidebar(currentCharacterSheet);
  bootLevelEditor({
    dto: currentRuntimePlayerSheetDto || currentPlayerSheetDto,
    saveDto: currentPlayerSheetDto,
    compiled: currentCharacterSheet,
    references: currentReferenceResolution,
    onChange: applyPlayerSheetDto,
    api,
    showStructuredOptionCoverage: shouldShowStructuredOptionCoverage()
    });
  await window.setTab(currentTabName);
}

async function bootPlayersPage() {

    const CharId = getRequestedPlayerId();
    if (!CharId) {
        setSaveStatus("failed", "Unable to load character sheet: missing character id.");
        return;
    }

    const cached = readPlayerCharacterDto(CharId);
    if (cached?.value) {
        await applyPlayerSheetDto(cached.value, {
            persist: false,
            resolveReferences: false
        });
        lastSavedFingerprint = createSaveFingerprint(currentPlayerSheetDto);
        setSaveStatus("refreshing", "Loaded cached sheet. Refreshing...");
    }

    try {
        const loadedDto = await api.getCharacterSheet(CharId);
        rememberPlayerCharacterDto(CharId, loadedDto);
        await applyPlayerSheetDto(loadedDto, {
            persist: false,
            resolveReferences: false
        });
        lastSavedFingerprint = createSaveFingerprint(currentPlayerSheetDto);
        setSaveStatus("saved", "Saved");
        void hydratePlayerSheetReferences(currentPlayerSheetDto);
    } catch (error) {
        console.error("Failed to boot player sheet:", error);
        if (cached?.value) {
            setSaveStatus("offline", "Showing cached sheet. Refresh failed.");
        } else {
            setSaveStatus("failed", "Unable to load character sheet.");
        }
    }
}
//Render players in character sheet page 
// Load players via API

export function ShowPopup(modalId) {
    console.log(modalId);
    const modal = document.getElementById(modalId);
    // showModal() traps focus, makes the rest of the page inert, and enables
    // Escape-to-close — all handled by the browser.
    if (modal && typeof modal.showModal === "function") {
        modal.showModal();
    }
}

export function ClosePopup(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && typeof modal.close === "function") {
        modal.close();
    }
}

if (typeof window !== "undefined") {
    window.setTab = setTab;
    window.ShowPopup = ShowPopup;
    window.ClosePopup = ClosePopup;

    window.addEventListener("beforeunload", (event) => {
        if (!hasUnsavedPlayerSheetChanges()) {
            return;
        }

        event.preventDefault();
        event.returnValue = "";
    });

    bootPlayersPage();
}
