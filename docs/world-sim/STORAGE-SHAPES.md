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

## New in Stage 1, needs your OK

Everything above is as you approved it. Stage 1 adds the pieces below. All of them follow the same rule: rows are only ever added.

### A. Every event starts hidden from players

Events gain nothing in storage for this; "hidden" is simply the default. A written event is shown to players only after a reveal row (below). Suggested and rejected events can never be shown.

### B. Reveal or hide for players (a new row in the record)

```json
{
  "recordType": "visibility",
  "id": "v-0099306-4c1f9a02b7",
  "eventId": "e-0099306-a1",
  "playersVisible": true,
  "day": 99306,
  "decidedAt": "2026-11-23T19:10:00.000Z"
}
```

The latest row for an event wins, so hiding again is another row with `false`. Nothing shows this to players yet (there is no players' view in Stage 1); the flag is recorded now so later stages can use it.

### C. Countdowns (new rows in the record)

A countdown is never stored as one editable thing. Each change is a row, and the current countdown is worked out by reading them in order.

Created:

```json
{
  "recordType": "countdown",
  "id": "k-0099306-0d2e7b91aa",
  "countdownId": "c-7f3a1c55e0",
  "action": "create",
  "day": 99306,
  "at": "2026-11-23T19:12:00.000Z",
  "countdown": {
    "label": "<your name for it>",
    "size": 6,
    "mode": "chance",
    "chance": 0.3,
    "dueDay": null,
    "fill": 0,
    "place": "<place id or null>",
    "suggestionText": "<the event to suggest when it comes due>"
  }
}
```

- `size` is 4, 6 or 8.
- `mode` is `chance` (a seeded roll each day, `chance` between 0 and 1) or `date` (`dueDay` is the day it comes due; `size` and `chance` are unused).

Changed by hand, one row each:

```json
{ "recordType": "countdown", "id": "k-...", "countdownId": "c-7f3a1c55e0", "action": "step", "day": 99308, "at": "...", "delta": 1 }
{ "recordType": "countdown", "id": "k-...", "countdownId": "c-7f3a1c55e0", "action": "edit", "day": 99308, "at": "...", "changes": { "label": "...", "chance": 0.5 } }
{ "recordType": "countdown", "id": "k-...", "countdownId": "c-7f3a1c55e0", "action": "finish", "day": 99308, "at": "..." }
```

`delta` is 1 or -1. `changes` may hold `label`, `chance`, `dueDay`, `place`, `suggestionText`. `finish` closes it without an event.

When a countdown fills up or its date comes, the simulation adds an ordinary suggested event (the shape you approved) tagged `countdown:<countdownId>`. Your decision row on that event is what finishes the countdown (accept or reword), or sends a rolling one back to half (reject).

### D. Countdown running state in the day snapshot

`state.systems.countdowns` in each snapshot now holds the worked-out countdowns, as a saved copy:

```json
"systems": {
  "countdowns": {
    "items": {
      "c-7f3a1c55e0": {
        "id": "c-7f3a1c55e0", "label": "...", "size": 6, "mode": "chance", "chance": 0.3,
        "dueDay": null, "fill": 2, "place": null, "suggestionText": "...",
        "createdDay": 99306, "waiting": false, "done": false, "suggestionId": null
      }
    }
  }
}
```

This can always be rebuilt from the record and the seed; a test does exactly that for every stored day.

### E. Suggestions kept beside the snapshot

Each day snapshot gains one field, `suggestions`: the suggested events that day's tick raised. They are also appended to the record. The copy in the snapshot exists so that if the connection drops between saving the day and appending them, they are put back the next time the world is read.

### F. The `effect` field on events

Still unused. In Stage 1 every event is stored with `"effect": null`. Countdowns do not need it: the link between a countdown and its event is the tag. A shape for `effect` will be proposed with the first subject that changes numbers (Stage 2).

### G. The DM-only list of places (Blob, replaced as a whole)

Blob name: `world/eldoria/places.json`. It is reference data for the "where" box on the DM page, not part of the record, and it is the one new blob that is overwritten when you load a newer list.

```json
{
  "schema": "eldoria-world-places/1",
  "updatedAt": "2026-11-23T19:20:00.000Z",
  "loaded": true,
  "places": [
    { "id": "<place id>", "name": "<name>", "kind": "Town", "region": "Crestfall", "parent": null, "knownToPlayers": false }
  ]
}
```

It holds hidden names, so it lives only in the storage account behind the DM key, never in `docs/`. The file to load is built from your notes into `Private/0.DM Screen/World Sim/places.upload.json`.

### H. The first day

Nothing exists in storage until you press "Start the world". That writes one snapshot for Fall 7, 496 (day 99306) with a random seed, no events and no countdowns.

## What is not stored here

- Routes, goods and people (the seed). The list of place names is section G above; the rest is still a draft: see `Private/0.DM Screen/World Sim/SEED-REVIEW.md`.
- Anything in the character sheet data. Nothing here touches it.
