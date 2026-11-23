# Living world: what gets stored (for sign-off)

Nothing below exists in real storage yet. The code is in `docs/api/src/worldStore.js` and is exercised only against in-memory stand-ins by `docs/world-sim/tests/store.test.mjs`. No API route uses it. Sign-off on these shapes is needed before anything is written to the storage account.

Two things are stored, both in the same storage account the site already uses.

## 1. The record (Azure Table, append only)

- Table: `eldoriaworldevents` (override with `ELDORIA_WORLD_EVENT_TABLE`).
- One row per event or decision. Rows are only ever added. No row is updated or deleted.
- `PartitionKey` is the world id (`eldoria`).
- `RowKey` is the day as 7 digits, a dash, then a 5-digit sequence within that day: `0099306-00001`. Rows therefore read back in the order things were recorded.
- The day is the absolute day number: `year * 200 + (month - 1) * 50 + (day - 1)`. Fall 7, 496 is `99306`.

Row columns:

| Column | Meaning |
|---|---|
| `partitionKey` | World id |
| `rowKey` | Day and sequence |
| `recordType` | `event` or `decision` |
| `recordId` | The record's own id |
| `eventId` | The event this row is about (its own id for an event, the target for a decision) |
| `day` | Absolute day number |
| `recordedAt` | Real-world time the row was saved |
| `payload` | The full record as JSON text (below) |

### An event you wrote (canon at once)

```json
{
  "recordType": "event",
  "id": "e-0099306-a1",
  "day": 99306,
  "status": "written",
  "source": "dm",
  "text": "<what you typed>",
  "place": "<place id or null>",
  "tags": [],
  "causedBy": null,
  "why": null,
  "effect": null,
  "createdAt": "2026-11-23T19:04:11.000Z"
}
```

### An event the simulation suggests (not canon)

Same shape, with `"status": "suggested"`, `"source": "sim"`, a `why` line, a `causedBy` pointing at the written event that led to it, and a tag naming the subject that proposed it (`system:rumours`, `system:goods` and so on). Its id is built from the day, the subject and a counter, for example `s-99307-rumours-1`, so the same day always produces the same ids.

### Your call on a suggestion (a new row; the suggestion row is untouched)

```json
{
  "recordType": "decision",
  "id": "d-0099307-b7",
  "eventId": "s-99307-rumours-1",
  "decision": "reword",
  "text": "<your wording; only for a reword>",
  "day": 99307,
  "decidedAt": "2026-11-23T19:06:40.000Z"
}
```

`decision` is `accept`, `reword` or `reject`. The current status of every event is worked out by reading the rows in order: accept and reword make it `written`, reject makes it `rejected`. The first decision on an event wins; a later one is kept in the table but ignored and reported.

`effect` is left open on purpose. Stage 0 stores it as given and does nothing with it. Its shape will be proposed with the subjects that use it (Stage 1 onward) and will come back for sign-off then.

## 2. Committed days (Blob)

Container and prefix: the same ones the character sheets use (`ELDORIA_CHARACTER_CONTAINER`, `ELDORIA_BLOB_PREFIX`).

### One snapshot per committed day, never overwritten

Blob name: `world/eldoria/days/<day 7 digits>-<commit id>.json`

```json
{
  "schema": "eldoria-world-snapshot/1",
  "worldId": "eldoria",
  "day": 99307,
  "commitId": "3f6c0c1e-...",
  "committedAt": "2026-11-23T19:06:41.000Z",
  "engineVersion": "0.1.0",
  "previousSnapshotBlob": "world/eldoria/days/0099306-9b2d....json",
  "state": {
    "engineVersion": "0.1.0",
    "day": 99307,
    "worldSeed": "<seed text>",
    "systems": {}
  },
  "report": []
}
```

`state.systems` is empty in Stage 0. Each later subject (goods, people, travellers, threats, roads, rumours) keeps its running numbers under its own key there. `report` holds that day's running-number lines. A committed day is stored as it came out, so it does not change if rules are tuned later.

### One small pointer to the current day

Blob name: `world/eldoria/current.json`

```json
{
  "schema": "eldoria-world-current/1",
  "worldId": "eldoria",
  "day": 99307,
  "commitId": "3f6c0c1e-...",
  "committedAt": "2026-11-23T19:06:41.000Z",
  "engineVersion": "0.1.0",
  "snapshotBlob": "world/eldoria/days/0099307-3f6c0c1e-....json"
}
```

The pointer is the only blob that is ever replaced, and only with an ETag check. When two devices advance the same day, the first moves the pointer; the second is refused with a 409 and the message "Another device committed a day first. Reload and try again." The loser's snapshot blob is left behind unreferenced and does no harm.

## What is not stored here

- Places, routes, goods and people (the seed). That shape is still a draft: see `Private/0.DM Screen/World Sim/SEED-REVIEW.md`.
- Anything in the character sheet data. Nothing here touches it.
