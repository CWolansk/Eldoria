const DEFAULT_CACHE_NAMESPACE = "eldoria-js-cache";
const DEFAULT_CACHE_VERSION = "2026-06-19";
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_STORAGE_BYTES = 500 * 1024;

const memoryRecords = new Map();
const pendingRecords = new Map();

function nowMs() {
  return Date.now();
}

function getTtlMs(options = {}) {
  const ttlMs = Number(options.ttlMs);
  return Number.isFinite(ttlMs) && ttlMs >= 0 ? ttlMs : DEFAULT_TTL_MS;
}

function getMaxStorageBytes(options = {}) {
  const maxStorageBytes = Number(options.maxStorageBytes);
  return Number.isFinite(maxStorageBytes) && maxStorageBytes > 0
    ? maxStorageBytes
    : DEFAULT_MAX_STORAGE_BYTES;
}

function buildStorageKey(key, options = {}) {
  const namespace = String(options.namespace || DEFAULT_CACHE_NAMESPACE).trim() || DEFAULT_CACHE_NAMESPACE;
  const version = String(options.version || DEFAULT_CACHE_VERSION).trim() || DEFAULT_CACHE_VERSION;
  return `${namespace}:${version}:${String(key || "")}`;
}

function getStorage(options = {}) {
  if (options.persist === false) {
    return null;
  }

  const storageName = options.storage || "localStorage";
  if (typeof storageName === "object" && storageName) {
    return storageName;
  }

  if (typeof globalThis === "undefined") {
    return null;
  }

  try {
    return globalThis[storageName] || null;
  } catch (_error) {
    return null;
  }
}

function isRecordFresh(record, timestamp = nowMs()) {
  return Boolean(record && typeof record.expiresAt === "number" && record.expiresAt > timestamp);
}

function readStorageRecord(storage, storageKey) {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const record = JSON.parse(raw);
    return record && typeof record === "object" ? record : null;
  } catch (_error) {
    try {
      storage.removeItem(storageKey);
    } catch (_removeError) {
      // Ignore storage cleanup failures; the cache should never block rendering.
    }
    return null;
  }
}

function writeStorageRecord(storage, storageKey, record, options = {}) {
  if (!storage) {
    return;
  }

  try {
    const raw = JSON.stringify(record);
    if (raw.length > getMaxStorageBytes(options)) {
      return;
    }
    storage.setItem(storageKey, raw);
  } catch (_error) {
    // Storage quotas and privacy settings vary by browser. Keep the in-memory cache.
  }
}

function createRecord(value, options = {}) {
  const createdAt = nowMs();
  const ttlMs = getTtlMs(options);
  return {
    createdAt,
    expiresAt: createdAt + ttlMs,
    value
  };
}

export function normalizeCacheKeyPart(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, " ");
}

export function readCachedJson(key, options = {}) {
  const timestamp = nowMs();
  const storageKey = buildStorageKey(key, options);
  const memoryRecord = memoryRecords.get(storageKey);
  if (isRecordFresh(memoryRecord, timestamp)) {
    return {
      ageMs: timestamp - memoryRecord.createdAt,
      status: "memory",
      value: memoryRecord.value
    };
  }

  const storage = getStorage(options);
  const storageRecord = readStorageRecord(storage, storageKey);
  if (isRecordFresh(storageRecord, timestamp)) {
    memoryRecords.set(storageKey, storageRecord);
    return {
      ageMs: timestamp - storageRecord.createdAt,
      status: "storage",
      value: storageRecord.value
    };
  }

  return null;
}

export function writeCachedJson(key, value, options = {}) {
  const storageKey = buildStorageKey(key, options);
  const record = createRecord(value, options);
  memoryRecords.set(storageKey, record);
  writeStorageRecord(getStorage(options), storageKey, record, options);
  return {
    ageMs: 0,
    status: "write",
    value
  };
}

export async function loadCachedJson(key, loader, options = {}) {
  const storageKey = buildStorageKey(key, options);
  const storage = getStorage(options);
  const timestamp = nowMs();

  if (!options.refresh) {
    const memoryRecord = memoryRecords.get(storageKey);
    if (isRecordFresh(memoryRecord, timestamp)) {
      return {
        ageMs: timestamp - memoryRecord.createdAt,
        status: "memory",
        value: memoryRecord.value
      };
    }

    const storageRecord = readStorageRecord(storage, storageKey);
    if (isRecordFresh(storageRecord, timestamp)) {
      memoryRecords.set(storageKey, storageRecord);
      return {
        ageMs: timestamp - storageRecord.createdAt,
        status: "storage",
        value: storageRecord.value
      };
    }
  }

  if (!options.refresh && pendingRecords.has(storageKey)) {
    return pendingRecords.get(storageKey);
  }

  const staleRecord = memoryRecords.get(storageKey) || readStorageRecord(storage, storageKey);
  const request = Promise.resolve()
    .then(() => loader())
    .then((value) => writeCachedJson(key, value, options))
    .then((result) => ({
      ...result,
      status: "network"
    }))
    .catch((error) => {
      if (options.staleOnError && staleRecord) {
        return {
          ageMs: timestamp - Number(staleRecord.createdAt || timestamp),
          error,
          status: "stale",
          value: staleRecord.value
        };
      }
      throw error;
    })
    .finally(() => {
      pendingRecords.delete(storageKey);
    });

  pendingRecords.set(storageKey, request);
  return request;
}

export async function getCachedJson(key, loader, options = {}) {
  return (await loadCachedJson(key, loader, options)).value;
}

export function clearCachedJson(prefix = "", options = {}) {
  const storagePrefix = buildStorageKey(prefix, options);

  for (const key of [...memoryRecords.keys()]) {
    if (key.startsWith(storagePrefix)) {
      memoryRecords.delete(key);
    }
  }

  for (const key of [...pendingRecords.keys()]) {
    if (key.startsWith(storagePrefix)) {
      pendingRecords.delete(key);
    }
  }

  const storage = getStorage(options);
  if (!storage) {
    return;
  }

  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(storagePrefix)) {
        storage.removeItem(key);
      }
    }
  } catch (_error) {
    // Cache clearing is best effort.
  }
}
