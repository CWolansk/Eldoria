import { EldoriaApiClient } from "../api/apiClient/index.js";
import { loadCachedJson, normalizeCacheKeyPart, readCachedJson, writeCachedJson } from "./web-cache.js";

const api = new EldoriaApiClient({
  baseUrl: "https://fn-eldoria-ahakafekhxczebhn.eastus-01.azurewebsites.net/api"
});

const PLAYER_ROSTER_CACHE_TTL_MS = 10 * 60 * 1000;
const PLAYER_CHARACTER_CACHE_TTL_MS = 10 * 60 * 1000;
const PLAYER_CHARACTER_MISS_CACHE_TTL_MS = 60 * 1000;
const PLAYER_CACHE_MAX_BYTES = 750 * 1024;

function normalizeText(value, fallback = "Unknown") {
  const text = String(value || "").trim();
  return text || fallback;
}

function readText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function getPlayerName(player) {
  return readText(
    player?.playerName,
    player?.identity?.playerName,
    player?.player?.name
  ) || "Player";
}

function getExplicitCharacterName(player) {
  return readText(
    player?.characterName,
    player?.identity?.name,
    player?.name,
    player?.displayName,
    player?.summary?.name,
    player?.profile?.name,
    player?.character?.name
  );
}

function getCharacterName(player) {
  return getExplicitCharacterName(player) || "-";
}

function getPortraitUrl(player) {
  return normalizePortraitUrl(readText(
    player?.portraitUrl,
    player?.identity?.portraitUrl,
    player?.profile?.portraitUrl,
    player?.character?.portraitUrl
  ));
}

function normalizePortraitUrl(value) {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }
  if (/^(?:[a-z][a-z0-9+.-]*:|data:)/iu.test(url)) {
    return url;
  }
  if (url.startsWith("/assets/")) {
    return `..${url}`;
  }
  return url;
}

function getInitials(name) {
  return normalizeText(name, "?")
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
}

function getPlayerCharacterCacheKey(characterId) {
  return `player-sheet:character:${normalizeCacheKeyPart(characterId)}`;
}

function getPlayerCharacterMissCacheKey(characterId) {
  return `player-sheet:character-miss:${normalizeCacheKeyPart(characterId)}`;
}

function formatCacheSource(label, status) {
  if (status === "network") {
    return label;
  }

  if (status === "stale") {
    return `${label} cached`;
  }

  return `${label} cache`;
}

async function loadPlayersManifest() {
  const apiCachedManifest = readCachedJson("players:manifest", {
    ttlMs: PLAYER_ROSTER_CACHE_TTL_MS
  });
  if (apiCachedManifest) {
    return {
      manifest: apiCachedManifest.value,
      source: formatCacheSource("API roster", apiCachedManifest.status)
    };
  }

  try {
    const result = await loadCachedJson(
      "players:manifest",
      () => api.getPlayersManifest(),
      {
        maxStorageBytes: PLAYER_CACHE_MAX_BYTES,
        staleOnError: true,
        ttlMs: PLAYER_ROSTER_CACHE_TTL_MS
      }
    );
    return {
      manifest: result.value,
      source: formatCacheSource("API roster", result.status)
    };
  } catch (error) {
    console.warn("Unable to load API players manifest.", error);
    throw error;
  }
}

async function loadCharacterSummary(player) {
  const characterId = readText(player?.id);
  if (!characterId || getExplicitCharacterName(player)) {
    return player;
  }

  const recentMiss = readCachedJson(getPlayerCharacterMissCacheKey(characterId), {
    ttlMs: PLAYER_CHARACTER_MISS_CACHE_TTL_MS
  });
  if (recentMiss) {
    return player;
  }

  try {
    const result = await loadCachedJson(
      getPlayerCharacterCacheKey(characterId),
      () => api.getCharacterSheet(characterId),
      {
        maxStorageBytes: PLAYER_CACHE_MAX_BYTES,
        staleOnError: true,
        ttlMs: PLAYER_CHARACTER_CACHE_TTL_MS
      }
    );
    const sheet = result.value;
    return {
      ...player,
      characterName: getCharacterName(sheet),
      playerName: getPlayerName(player) === "Player" ? getPlayerName(sheet) : getPlayerName(player),
      portraitUrl: readText(player?.portraitUrl, sheet?.identity?.portraitUrl),
      identity: {
        ...(player?.identity || {}),
        ...(sheet?.identity || {})
      }
    };
  } catch (error) {
    writeCachedJson(getPlayerCharacterMissCacheKey(characterId), true, {
      maxStorageBytes: 1000,
      ttlMs: PLAYER_CHARACTER_MISS_CACHE_TTL_MS
    });
    console.warn(`Unable to load character summary for ${characterId}.`, error);
    return player;
  }
}

async function enrichPlayers(players) {
  const results = await Promise.allSettled(players.map(loadCharacterSummary));
  return results.map((result, index) => result.status === "fulfilled" ? result.value : players[index]);
}

function buildPlayerCard(player) {
  const playerName = getPlayerName(player);
  const characterName = getCharacterName(player);
  const characterId = normalizeText(player?.id, "");
  const status = normalizeText(player?.status, "active");
  const portraitUrl = getPortraitUrl(player);

  const link = document.createElement("a");
  link.className = "player-card player-roster-card";
  link.href = `PlayerSheetTemplate/PlayerSheet.html?id=${encodeURIComponent(characterId)}`;
  link.setAttribute("aria-label", `Open ${characterName} character sheet`);

  const portrait = document.createElement("div");
  portrait.className = "player-card__portrait";
  if (portraitUrl) {
    const image = document.createElement("img");
    image.className = "player-card__portrait-image";
    image.src = portraitUrl;
    image.alt = "";
    image.loading = "lazy";
    portrait.append(image);
  } else {
    const initials = document.createElement("span");
    initials.className = "player-card__initials";
    initials.textContent = getInitials(characterName);
    portrait.append(initials);
  }

  const body = document.createElement("div");
  body.className = "player-card__body";

  const playerLabel = document.createElement("p");
  playerLabel.className = "player-name";
  playerLabel.textContent = playerName;

  const title = document.createElement("h2");
  title.className = "character-name";
  title.textContent = characterName;

  const meta = document.createElement("div");
  meta.className = "player-card__meta";

  const action = document.createElement("span");
  action.className = "player-card__action";
  action.textContent = "Open Sheet";

  body.append(playerLabel, title, meta);
  link.append(portrait, body, action);
  return link;
}

async function bootPlayersPage() {
  const container = document.querySelector("#player-sheet-list");
  if (!container) {
    return;
  }

  container.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "player-roster-loading";
  loading.textContent = "Loading player sheets...";
  container.append(loading);

  try {
    const result = await loadPlayersManifest();
    const players = await enrichPlayers(Array.isArray(result.manifest?.characters) ? result.manifest.characters : []);
    const sortedPlayers = [...players].sort((left, right) =>
      getPlayerName(left).localeCompare(getPlayerName(right), undefined, { sensitivity: "base" })
    );

    setText("[data-player-count]", String(sortedPlayers.length));
    setText("[data-player-roster-status]", result.source);
    container.replaceChildren();

    if (!sortedPlayers.length) {
      const empty = document.createElement("p");
      empty.className = "player-roster-empty";
      empty.textContent = "No player sheets are available.";
      container.append(empty);
      return;
    }

    container.append(...sortedPlayers.map(buildPlayerCard));
  } catch (error) {
    console.error("Unable to render players page.", error);
    setText("[data-player-count]", "0");
    setText("[data-player-roster-status]", "Roster unavailable");
    const empty = document.createElement("p");
    empty.className = "player-roster-empty player-roster-empty--error";
    empty.textContent = "Unable to load player sheets.";
    container.replaceChildren(empty);
  }
}

bootPlayersPage();
