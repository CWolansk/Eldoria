"use strict";

// Storage for the living world.
//
//   Record    - Azure Table, append only. One row per event or decision.
//               PartitionKey = world id, RowKey = <day 7 digits>-<sequence 5 digits>,
//               so rows read back in the order things were recorded.
//   Snapshots - Blob. One immutable JSON blob per committed day, plus a small
//               "current" pointer blob. The pointer is written with an ETag
//               check, so when two devices commit the same day the second one
//               gets a 409 and is told to reload.
//
// The table and blob clients are passed in, so tests run against in-memory
// fakes. createDefaultWorldStore() wires the real Azure clients; nothing in
// this file registers a route or touches storage at load time.

const DEFAULT_WORLD_ID = "eldoria";
const DEFAULT_EVENT_TABLE = "eldoriaworldevents";
const DAY_DIGITS = 7;
const SEQUENCE_DIGITS = 5;
const MAX_APPEND_ATTEMPTS = 5;

function storeError(statusCode, message, details = {}) {
  return Object.assign(new Error(message), { statusCode, details });
}

function isConflict(error) {
  return Boolean(error) && (error.statusCode === 409 || error.statusCode === 412);
}

function assertDay(day) {
  if (!Number.isInteger(day) || day < 0 || String(day).length > DAY_DIGITS) {
    throw storeError(400, `day must be a whole number from 0 to ${"9".repeat(DAY_DIGITS)}, got ${day}`);
  }
}

function pad(value, digits) {
  return String(value).padStart(digits, "0");
}

function rowKeyFor(day, sequence) {
  return `${pad(day, DAY_DIGITS)}-${pad(sequence, SEQUENCE_DIGITS)}`;
}

function parseRowKey(rowKey) {
  const [day, sequence] = String(rowKey).split("-");
  return { day: Number(day), sequence: Number(sequence) };
}

const MAX_RECORD_CHARACTERS = 30000;

function snapshotBlobName(worldId, day, commitId) {
  return `world/${worldId}/days/${pad(day, DAY_DIGITS)}-${commitId}.json`;
}

function currentBlobName(worldId) {
  return `world/${worldId}/current.json`;
}

function placesBlobName(worldId) {
  return `world/${worldId}/places.json`;
}

function toEntity(worldId, day, sequence, record, recordedAt) {
  return {
    partitionKey: worldId,
    rowKey: rowKeyFor(day, sequence),
    recordType: String(record.recordType || ""),
    recordId: String(record.id || ""),
    // What the row is about: the event for a decision or reveal, the countdown for
    // a countdown change, otherwise the record itself.
    eventId: String(record.eventId || record.countdownId || record.id || ""),
    day,
    recordedAt,
    payload: JSON.stringify(record)
  };
}

function fromEntity(entity) {
  const { day, sequence } = parseRowKey(entity.rowKey);
  return {
    ...JSON.parse(entity.payload),
    _row: { rowKey: entity.rowKey, day, sequence, recordedAt: entity.recordedAt || null }
  };
}

/**
 * tableClient: { createEntity(entity) -> rejects with statusCode 409 if the row exists,
 *                listEntities({ partitionKey, fromRowKey, toRowKey }) -> array of entities }
 * blobClient:  { read(name) -> { document, etag } | null,
 *                write(name, document, { ifMatch?, ifNoneMatch? }) -> { etag },
 *                rejects with statusCode 409 or 412 when the condition fails }
 */
function createWorldStore({ tableClient, blobClient, worldId = DEFAULT_WORLD_ID, now, newId } = {}) {
  if (!tableClient || !blobClient) {
    throw new TypeError("createWorldStore needs a tableClient and a blobClient.");
  }
  const clock = now || (() => new Date().toISOString());
  const makeId = newId || (() => require("node:crypto").randomUUID());

  async function listRecords({ fromDay = 0, toDay = Number("9".repeat(DAY_DIGITS)) } = {}) {
    assertDay(fromDay);
    assertDay(toDay);
    const entities = await tableClient.listEntities({
      partitionKey: worldId,
      fromRowKey: rowKeyFor(fromDay, 0),
      toRowKey: rowKeyFor(toDay, Number("9".repeat(SEQUENCE_DIGITS)))
    });
    return entities
      .slice()
      .sort((a, b) => (a.rowKey < b.rowKey ? -1 : a.rowKey > b.rowKey ? 1 : 0))
      .map(fromEntity);
  }

  async function nextSequence(day) {
    const existing = await tableClient.listEntities({
      partitionKey: worldId,
      fromRowKey: rowKeyFor(day, 0),
      toRowKey: rowKeyFor(day, Number("9".repeat(SEQUENCE_DIGITS)))
    });
    return existing.reduce((max, entity) => Math.max(max, parseRowKey(entity.rowKey).sequence), 0) + 1;
  }

  /**
   * Appends records for a day, in order. Never updates or deletes a row.
   * If another writer takes the same row key first, the sequence is re-read
   * and the append retried, so concurrent jots both land.
   */
  async function appendRecords(day, records) {
    assertDay(day);
    const list = Array.isArray(records) ? records : [records];
    const stored = [];
    for (const record of list) {
      if (!record || !record.recordType || !record.id) {
        throw storeError(400, "Each record needs a recordType and an id.");
      }
      // A table row's text column holds about 32,000 characters. Refuse before writing.
      if (JSON.stringify(record).length > MAX_RECORD_CHARACTERS) {
        throw storeError(413, "That is too much to record in one row. Split it, or shorten it.");
      }
      let attempt = 0;
      for (;;) {
        attempt += 1;
        const sequence = await nextSequence(day);
        const entity = toEntity(worldId, day, sequence, record, clock());
        try {
          await tableClient.createEntity(entity);
          stored.push(fromEntity(entity));
          break;
        } catch (error) {
          if (!isConflict(error) || attempt >= MAX_APPEND_ATTEMPTS) {
            throw error;
          }
        }
      }
    }
    return stored;
  }

  /** The current pointer and its ETag, or null before the first commit. */
  async function readCurrent() {
    const result = await blobClient.read(currentBlobName(worldId));
    return result ? { pointer: result.document, etag: result.etag } : null;
  }

  /** The committed snapshot for the current day (or a named blob), or null. */
  async function readSnapshot(blobName) {
    let name = blobName;
    if (!name) {
      const current = await readCurrent();
      if (!current) {
        return null;
      }
      name = current.pointer.snapshotBlob;
    }
    const result = await blobClient.read(name);
    return result ? result.document : null;
  }

  /**
   * Commits a day: writes its snapshot blob, then moves the current pointer.
   *   expectedEtag - the ETag of the pointer the caller based its work on;
   *                  null for the very first commit.
   * Fails with 409 if the pointer moved in the meantime (someone else
   * committed) or if the day is not after the current one.
   */
  async function commitDay({ day, state, report = [], suggestions = [], engineVersion = null, expectedEtag = null }) {
    assertDay(day);
    if (!state || state.day !== day) {
      throw storeError(400, "The state being committed must carry the same day.");
    }

    const current = await readCurrent();
    if (current && !expectedEtag) {
      throw storeError(409, "The world already has a committed day. Reload and try again.", {
        currentDay: current.pointer.day
      });
    }
    if (current && current.etag !== expectedEtag) {
      throw storeError(409, "Another device committed a day first. Reload and try again.", {
        currentDay: current.pointer.day
      });
    }
    if (!current && expectedEtag) {
      throw storeError(409, "The world has no committed day yet. Reload and try again.");
    }
    if (current && day <= current.pointer.day) {
      throw storeError(409, "That day is already committed.", { currentDay: current.pointer.day });
    }

    const commitId = makeId();
    const committedAt = clock();
    const blobName = snapshotBlobName(worldId, day, commitId);
    const snapshot = {
      schema: "eldoria-world-snapshot/1",
      worldId,
      day,
      commitId,
      committedAt,
      engineVersion,
      previousSnapshotBlob: current ? current.pointer.snapshotBlob : null,
      state,
      report,
      // Kept beside the state so a suggestion can be put back in the record if the
      // write that should have followed this commit was interrupted.
      suggestions
    };
    await blobClient.write(blobName, snapshot, { ifNoneMatch: "*" });

    const pointer = {
      schema: "eldoria-world-current/1",
      worldId,
      day,
      commitId,
      committedAt,
      engineVersion,
      snapshotBlob: blobName
    };
    try {
      const written = await blobClient.write(
        currentBlobName(worldId),
        pointer,
        current ? { ifMatch: current.etag } : { ifNoneMatch: "*" }
      );
      return { pointer, etag: written.etag, snapshot };
    } catch (error) {
      if (isConflict(error)) {
        // The snapshot blob written above is now unreferenced and harmless.
        throw storeError(409, "Another device committed a day first. Reload and try again.");
      }
      throw error;
    }
  }

  /** The DM-only list of places, or null if none has been loaded yet. */
  async function readPlaces() {
    const result = await blobClient.read(placesBlobName(worldId));
    return result ? { document: result.document, etag: result.etag } : null;
  }

  /** Replaces the DM-only list of places. Not part of the record; it is reference data. */
  async function writePlaces(document) {
    return blobClient.write(placesBlobName(worldId), document);
  }

  return { worldId, appendRecords, listRecords, readCurrent, readSnapshot, commitDay, readPlaces, writePlaces };
}

/* ---------- adapters for the real Azure clients (not used by tests) ---------- */

function escapeOData(value) {
  return String(value).replace(/'/gu, "''");
}

function createAzureTableAdapter(client) {
  return {
    async createEntity(entity) {
      await client.createEntity(entity);
    },
    async listEntities({ partitionKey, fromRowKey, toRowKey }) {
      const filter = `PartitionKey eq '${escapeOData(partitionKey)}'`
        + ` and RowKey ge '${escapeOData(fromRowKey)}' and RowKey le '${escapeOData(toRowKey)}'`;
      const entities = [];
      for await (const entity of client.listEntities({ queryOptions: { filter } })) {
        entities.push(entity);
      }
      return entities;
    }
  };
}

async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function createAzureBlobAdapter(containerClient, prefix = "") {
  const fullName = (name) => (prefix ? `${prefix.replace(/\/+$/u, "")}/${name}` : name);
  return {
    async read(name) {
      try {
        const response = await containerClient.getBlobClient(fullName(name)).download();
        const text = response.readableStreamBody ? await streamToString(response.readableStreamBody) : "";
        return { document: JSON.parse(text), etag: response.etag || null };
      } catch (error) {
        if (error && (error.statusCode === 404 || error.code === "BlobNotFound")) {
          return null;
        }
        throw error;
      }
    },
    async write(name, document, { ifMatch, ifNoneMatch } = {}) {
      const body = Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
      const response = await containerClient.getBlockBlobClient(fullName(name)).uploadData(body, {
        blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8" },
        conditions: {
          ...(ifMatch ? { ifMatch } : {}),
          ...(ifNoneMatch ? { ifNoneMatch } : {})
        }
      });
      return { etag: response.etag || null };
    }
  };
}

/** Real storage: same account, container and prefix settings as the rest of the API. */
async function createDefaultWorldStore(options = {}) {
  const { cleanEnv, createEnsuredTableClient } = require("./tableClient");
  const { getContainerClient } = require("./blobStore");
  const tableName = cleanEnv("ELDORIA_WORLD_EVENT_TABLE") || DEFAULT_EVENT_TABLE;
  const prefix = cleanEnv("ELDORIA_BLOB_PREFIX").replace(/^\/+|\/+$/gu, "");
  return createWorldStore({
    tableClient: createAzureTableAdapter(await createEnsuredTableClient(tableName)),
    blobClient: createAzureBlobAdapter(await getContainerClient(), prefix),
    worldId: options.worldId || cleanEnv("ELDORIA_WORLD_ID") || DEFAULT_WORLD_ID
  });
}

module.exports = {
  DEFAULT_EVENT_TABLE,
  DEFAULT_WORLD_ID,
  createAzureBlobAdapter,
  createAzureTableAdapter,
  createDefaultWorldStore,
  createWorldStore,
  currentBlobName,
  placesBlobName,
  rowKeyFor,
  snapshotBlobName
};
