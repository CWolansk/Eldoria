import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import {
  createWrittenEvent, createSuggestedEvent, createDecision, foldRecord, DECISION,
  createInitialState, tick, toDay
} from "../engine/index.js";

const require = createRequire(import.meta.url);
const { createWorldStore, rowKeyFor, snapshotBlobName, currentBlobName } = require("../../api/src/worldStore.js");

/* In-memory stand-ins for Azure Table and Blob storage. */
function fakeTable() {
  const rows = new Map();
  return {
    rows,
    async createEntity(entity) {
      const key = `${entity.partitionKey}|${entity.rowKey}`;
      if (rows.has(key)) {
        throw Object.assign(new Error("EntityAlreadyExists"), { statusCode: 409 });
      }
      rows.set(key, structuredClone(entity));
    },
    async listEntities({ partitionKey, fromRowKey, toRowKey }) {
      return [...rows.values()]
        .filter((row) => row.partitionKey === partitionKey && row.rowKey >= fromRowKey && row.rowKey <= toRowKey)
        .map((row) => structuredClone(row));
    }
  };
}

function fakeBlobs() {
  const blobs = new Map();
  let counter = 0;
  return {
    blobs,
    async read(name) {
      const blob = blobs.get(name);
      return blob ? { document: structuredClone(blob.document), etag: blob.etag } : null;
    },
    async write(name, document, { ifMatch, ifNoneMatch } = {}) {
      const existing = blobs.get(name);
      if (ifNoneMatch === "*" && existing) {
        throw Object.assign(new Error("BlobAlreadyExists"), { statusCode: 409 });
      }
      if (ifMatch && (!existing || existing.etag !== ifMatch)) {
        throw Object.assign(new Error("ConditionNotMet"), { statusCode: 412 });
      }
      counter += 1;
      const etag = `"etag-${counter}"`;
      blobs.set(name, { document: structuredClone(document), etag });
      return { etag };
    }
  };
}

function makeStore(overrides = {}) {
  const table = fakeTable();
  const blobs = fakeBlobs();
  let ids = 0;
  const store = createWorldStore({
    tableClient: table,
    blobClient: blobs,
    now: () => "2026-11-23T00:00:00.000Z",
    newId: () => `commit-${(ids += 1)}`,
    ...overrides
  });
  return { store, table, blobs };
}

const DAY = toDay({ year: 496, monthIndex: 2, dayOfMonth: 7 });

test("store: row keys sort by day then sequence", () => {
  assert.equal(rowKeyFor(99306, 1), "0099306-00001");
  const keys = [rowKeyFor(99307, 1), rowKeyFor(99306, 12), rowKeyFor(99306, 2), rowKeyFor(9, 1), rowKeyFor(100000, 1)];
  assert.deepEqual([...keys].sort(), [rowKeyFor(9, 1), rowKeyFor(99306, 2), rowKeyFor(99306, 12), rowKeyFor(99307, 1), rowKeyFor(100000, 1)]);
});

test("store: appended records read back in the order they were recorded", async () => {
  const { store } = makeStore();
  await store.appendRecords(DAY + 1, createWrittenEvent({ id: "e3", day: DAY + 1, text: "Third." }));
  await store.appendRecords(DAY, [
    createWrittenEvent({ id: "e1", day: DAY, text: "First." }),
    createSuggestedEvent({ id: "s1", day: DAY, text: "Second." })
  ]);
  await store.appendRecords(DAY, createWrittenEvent({ id: "e2", day: DAY, text: "Later the same day." }));
  const records = await store.listRecords();
  assert.deepEqual(records.map((record) => record.id), ["e1", "s1", "e2", "e3"]);
  assert.deepEqual(records.map((record) => record._row.rowKey), ["0099306-00001", "0099306-00002", "0099306-00003", "0099307-00001"]);
  assert.deepEqual((await store.listRecords({ fromDay: DAY + 1 })).map((record) => record.id), ["e3"]);
  assert.deepEqual((await store.listRecords({ toDay: DAY })).map((record) => record.id), ["e1", "s1", "e2"]);
});

test("store: a decision is a new row; the suggestion row is never changed", async () => {
  const { store, table } = makeStore();
  await store.appendRecords(DAY, createSuggestedEvent({ id: "s1", day: DAY, text: "Might happen." }));
  const before = JSON.stringify([...table.rows.values()]);
  await store.appendRecords(DAY + 1, createDecision({ id: "d1", eventId: "s1", decision: DECISION.REWORD, text: "Did happen.", day: DAY + 1 }));
  assert.equal(table.rows.size, 2);
  assert.equal(JSON.stringify([...table.rows.values()].slice(0, 1)), before);
  const { events } = foldRecord(await store.listRecords());
  assert.equal(events.length, 1);
  assert.equal(events[0].status, "written");
  assert.equal(events[0].text, "Did happen.");
  assert.equal(events[0].originalText, "Might happen.");
});

test("store: the stored row has the documented shape", async () => {
  const { store, table } = makeStore();
  await store.appendRecords(DAY, createWrittenEvent({ id: "e1", day: DAY, text: "First.", place: "p1", createdAt: "t" }));
  const [row] = [...table.rows.values()];
  assert.deepEqual(Object.keys(row).sort(), ["day", "eventId", "partitionKey", "payload", "recordId", "recordType", "recordedAt", "rowKey"]);
  assert.equal(row.partitionKey, "eldoria");
  assert.equal(row.rowKey, "0099306-00001");
  assert.equal(row.recordType, "event");
  assert.equal(row.recordId, "e1");
  assert.equal(JSON.parse(row.payload).text, "First.");
});

test("store: two writers racing for the same row both land", async () => {
  const { store, table } = makeStore();
  const realList = table.listEntities.bind(table);
  let stale = true;
  // The first sequence lookup of the second writer sees an empty day (stale read).
  table.listEntities = async (query) => {
    if (stale) {
      stale = false;
      await store2Append();
      return [];
    }
    return realList(query);
  };
  const store2 = createWorldStore({ tableClient: { createEntity: table.createEntity, listEntities: realList }, blobClient: fakeBlobs(), now: () => "t" });
  const store2Append = () => store2.appendRecords(DAY, createWrittenEvent({ id: "other", day: DAY, text: "From the other device." }));
  await store.appendRecords(DAY, createWrittenEvent({ id: "mine", day: DAY, text: "From this device." }));
  const records = await store.listRecords();
  assert.deepEqual(records.map((record) => record.id), ["other", "mine"]);
});

test("store: bad input is refused", async () => {
  const { store } = makeStore();
  await assert.rejects(store.appendRecords(-1, createWrittenEvent({ id: "e", day: 1, text: "x" })), { statusCode: 400 });
  await assert.rejects(store.appendRecords(DAY, { text: "no id" }), { statusCode: 400 });
  assert.throws(() => createWorldStore({}), TypeError);
});

test("store: first commit creates the snapshot and the current pointer", async () => {
  const { store, blobs } = makeStore();
  assert.equal(await store.readCurrent(), null);
  assert.equal(await store.readSnapshot(), null);
  const state = createInitialState({ day: DAY, worldSeed: "eldoria" });
  const result = await store.commitDay({ day: DAY, state, report: [], engineVersion: state.engineVersion });
  assert.equal(result.pointer.day, DAY);
  assert.equal(result.pointer.snapshotBlob, snapshotBlobName("eldoria", DAY, "commit-1"));
  assert.ok(blobs.blobs.has(currentBlobName("eldoria")));
  const current = await store.readCurrent();
  assert.equal(current.etag, result.etag);
  assert.deepEqual((await store.readSnapshot()).state, state);
  assert.equal((await store.readSnapshot()).previousSnapshotBlob, null);
});

test("store: a second device committing the same day gets a 409 and changes nothing", async () => {
  const { store } = makeStore();
  const day0 = createInitialState({ day: DAY, worldSeed: "eldoria" });
  const first = await store.commitDay({ day: DAY, state: day0 });

  // Both devices load the same pointer, then both advance a day.
  const phone = await store.readCurrent();
  const laptop = await store.readCurrent();
  const next = tick(day0, []).state;

  const won = await store.commitDay({ day: DAY + 1, state: next, expectedEtag: phone.etag });
  await assert.rejects(
    store.commitDay({ day: DAY + 1, state: { ...next, worldSeed: "laptop-version" }, expectedEtag: laptop.etag }),
    (error) => error.statusCode === 409 && /Reload/u.test(error.message)
  );

  const current = await store.readCurrent();
  assert.equal(current.pointer.day, DAY + 1);
  assert.equal(current.pointer.commitId, won.pointer.commitId);
  const snapshot = await store.readSnapshot();
  assert.equal(snapshot.state.worldSeed, "eldoria");
  assert.equal(snapshot.previousSnapshotBlob, first.pointer.snapshotBlob);
});

test("store: the ETag check itself stops a commit that slips past the first read", async () => {
  const { store, blobs } = makeStore();
  const day0 = createInitialState({ day: DAY, worldSeed: "eldoria" });
  const first = await store.commitDay({ day: DAY, state: day0 });
  const next = tick(day0, []).state;

  // Simulate the other device moving the pointer between this commit's read and its write.
  const realWrite = blobs.write.bind(blobs);
  let raced = false;
  blobs.write = async (name, document, options) => {
    if (name === currentBlobName("eldoria") && !raced) {
      raced = true;
      await realWrite(name, { ...document, commitId: "the-other-device" }, { ifMatch: first.etag });
    }
    return realWrite(name, document, options);
  };

  await assert.rejects(
    store.commitDay({ day: DAY + 1, state: next, expectedEtag: first.etag }),
    { statusCode: 409 }
  );
  assert.equal((await store.readCurrent()).pointer.commitId, "the-other-device");
});

test("store: commits must move forward and carry the right day", async () => {
  const { store } = makeStore();
  const day0 = createInitialState({ day: DAY, worldSeed: "eldoria" });
  const first = await store.commitDay({ day: DAY, state: day0 });
  await assert.rejects(store.commitDay({ day: DAY, state: day0, expectedEtag: first.etag }), { statusCode: 409 });
  await assert.rejects(store.commitDay({ day: DAY + 1, state: day0, expectedEtag: first.etag }), { statusCode: 400 });
  await assert.rejects(store.commitDay({ day: DAY + 1, state: tick(day0, []).state }), { statusCode: 409 });
  await assert.rejects(
    makeStore().store.commitDay({ day: DAY, state: day0, expectedEtag: '"stale"' }),
    { statusCode: 409 }
  );
});

test("store: a committed day's snapshot is never overwritten", async () => {
  const { store, blobs } = makeStore();
  const day0 = createInitialState({ day: DAY, worldSeed: "eldoria" });
  const first = await store.commitDay({ day: DAY, state: day0 });
  const before = JSON.stringify(blobs.blobs.get(first.pointer.snapshotBlob));
  const second = await store.commitDay({ day: DAY + 1, state: tick(day0, []).state, expectedEtag: first.etag });
  assert.notEqual(second.pointer.snapshotBlob, first.pointer.snapshotBlob);
  assert.equal(JSON.stringify(blobs.blobs.get(first.pointer.snapshotBlob)), before);
  assert.deepEqual((await store.readSnapshot(first.pointer.snapshotBlob)).state, day0);
});

test("store: loading the module registers no routes and touches no storage", () => {
  const source = require("node:fs").readFileSync(require.resolve("../../api/src/worldStore.js"), "utf8");
  assert.ok(!source.includes("app.http"));
  const index = require("node:fs").readFileSync(require.resolve("../../api/src/index.js"), "utf8");
  assert.ok(!index.includes("worldStore"), "no world routes are registered in Stage 0");
});
