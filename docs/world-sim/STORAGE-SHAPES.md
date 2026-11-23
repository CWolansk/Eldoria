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

Still unused in Stage 1 (Stage 2 defines it; see section I). In Stage 1 every event is stored with `"effect": null`. Countdowns do not need it: the link between a countdown and its event is the tag. A shape for `effect` will be proposed with the first subject that changes numbers (Stage 2).

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

## New in Stage 2, needs your OK

Stage 2 adds markets. As before, the record is append only and the running state can always be rebuilt from the record and the seed. Nothing below is in real storage until you deploy and load the setup.

### I. What an event does: the `effect` field

Until now every event had `"effect": null`. An event may now carry one effect, which becomes a **pressure**: the only thing that shocks the economy. `null` still means "just a fact".

On what a town makes or uses of a good:

```json
"effect": { "type": "pressure", "target": "make", "place": "<place id>", "good": "<good id>", "multiplier": 0.3, "days": 10, "label": "<the event text>" }
```

On a road:

```json
"effect": { "type": "pressure", "target": "route", "route": "<road id>", "multiplier": 0, "days": null, "label": "<the event text>" }
```

- `target` is `make`, `use` or `route`.
- `multiplier` scales what is made or used (0.3 = about a third). For a road, 0 closes it and a value below 1 slows it: fewer caravans, and they take longer.
- `days` is how long it lasts. `null` means until you end it.
- A written event that carries an effect starts its pressure the next day and is named as its cause. The effect on a suggested event does nothing unless you accept it.
- An event with an effect must be dated today. A plain fact may still be dated in the past.

A countdown may carry the same `effect` inside its `countdown` object; it is copied onto the event it suggests.

### J. Ending a pressure early (a new row)

```json
{ "recordType": "pressure", "id": "x-0099310-1f0c", "action": "end", "pressureId": "p-e-0099306-a1", "day": 99310, "at": "2026-11-23T20:00:00.000Z" }
```

The pressure stops weighing on the numbers after that day. The event that caused it is untouched.

### K. Where the party is (a new row)

```json
{ "recordType": "party", "id": "y-0099306-77aa", "day": 99306, "place": "<place id or null>", "at": "2026-11-23T20:01:00.000Z" }
```

Only this row moves the party, and only you can write it. No rule in the simulation ever does. `null` means "not set / on the road". In the day snapshot it appears as `state.party = { "place": "...", "sinceDay": 99306 }`.

### L. The market setup (a new row each time you load or change it)

```json
{
  "recordType": "economy",
  "id": "m-0099306-3b9d",
  "action": "configure",
  "day": 99306,
  "at": "2026-11-23T20:02:00.000Z",
  "config": {
    "goods": [
      { "id": "<good id>", "name": "<name>", "unit": "<unit>", "basePrice": { "value": 5000, "estimate": false }, "madeFrom": [{ "good": "<other good id>", "perUnit": 5 }] }
    ],
    "routes": [
      { "id": "<a>--<b>", "a": "<place id>", "b": "<place id>", "travelDays": { "value": 1.5, "estimate": true } }
    ],
    "places": {
      "<place id>": {
        "name": "<name>",
        "knownToPlayers": false,
        "population": { "value": 3500, "estimate": false },
        "market": { "<good id>": { "make": { "value": 300, "estimate": true }, "use": { "value": 52.5, "estimate": true } } }
      }
    },
    "constants": {}
  }
}
```

- Prices are in copper pieces (5000 = 50 gp).
- `estimate: true` marks a figure that is a guess; the page labels it. A figure you change on the page is saved with `estimate: false`.
- Only places with full detail have a `market`; sketched places appear with an empty one so roads to them can be named.
- The whole setup is one row (about 10,000 characters for Crestfall; a row can hold 30,000, and the store refuses a larger one with a clear message). The sentences saying where each guess came from are not in the row; they stay in the DM-only setup document (N).
- Loading a changed setup keeps the stock and prices of every town and only works out "usual" again.

### M. The running state of the economy in the day snapshot

`state.systems.economy` in each snapshot, a saved copy that the record can rebuild:

```json
"economy": {
  "config": { "...": "the setup above" },
  "markets": { "<place id>": { "<good id>": { "stock": 1575, "price": 91.2, "usual": 90.4, "history": [90.1, 90.8, 91.2], "reported": 90.4, "highDays": 0, "lowDays": 0, "flag": null, "inputFactor": 1 } } },
  "shipments": [{ "id": "sh-99307-12", "good": "<good id>", "from": "<place id>", "to": "<place id>", "route": "<road id>", "quantity": 233.1, "departDay": 99307, "arriveDay": 99309 }],
  "pressures": { "p-<event id>": { "id": "p-<event id>", "target": "make", "place": "<place id>", "good": "<good id>", "route": null, "multiplier": 0.3, "fromDay": 99307, "untilDay": 99316, "cause": "<event id>", "label": "<the event text>" } },
  "pendingEffects": { "<suggested event id>": { "effect": { "...": "as in I" }, "text": "<its text>" } },
  "flows": { "<road id>|<good id>|<from place id>": 228.4 },
  "shipmentSeq": 12
}
```

- `history` keeps the last 30 daily prices (the page draws 14).
- `usual` is what the price settles at with no pressures, worked out when the setup is loaded.
- `flows` is what each road has lately carried, so only unusual trade is reported.
- With markets for five towns and ten goods, a day snapshot is about 60,000 characters.

These numbers become canon when you commit a day, as you decided. They are never suggestions. The story suggestions the simulation makes about them ("X is running short in Y") are ordinary suggested events with `"effect": null`, tagged `economy:shortage` or `economy:glut` and `good:<good id>`.

### N. The DM-only setup document (the places blob grows)

The blob `world/eldoria/places.json` (section G) becomes schema `eldoria-world-places/2`. Each place gains two fields, and the document gains an `economy` section. It is still replaced as a whole when you load or edit it, still DM-only, and still not part of the record: the part the simulation uses is copied into the record as row L.

```json
{
  "schema": "eldoria-world-places/2",
  "updatedAt": "2026-11-23T20:02:00.000Z",
  "loaded": true,
  "places": [
    { "id": "<place id>", "name": "<name>", "kind": "Town", "region": "Crestfall", "parent": null, "knownToPlayers": false,
      "detail": "full", "population": { "value": 3500, "estimate": false, "basis": "Stated in the notes" } }
  ],
  "economy": {
    "goods": [{ "id": "...", "name": "...", "unit": "...", "basePrice": { "value": 40, "estimate": true, "basis": "Not in the catalog. Guess: ..." }, "madeFrom": [] }],
    "routes": [{ "id": "<a>--<b>", "a": "...", "b": "...", "travelDays": { "value": 1.5, "estimate": true, "basis": "Estimate from the map" } }],
    "markets": { "<place id>": { "<good id>": { "make": { "value": 300, "estimate": true, "basis": "..." }, "use": { "value": 52.5, "estimate": true, "basis": "..." } } } },
    "constants": {}
  }
}
```

- `detail` is `full` (has a market), `sketched` (a name and a size, no market) or `landmark`.
- `basis` is the sentence saying where a figure came from. It is kept here only.

### O. What players can read without a key: local prices

One route needs no DM key: `GET /api/world/public/prices`. It answers for the town the party is in, and only if that town is marked known to players and has a market. This is its whole answer:

```json
{
  "place": { "name": "<the name of the town>" },
  "prices": [
    { "good": "Healing potion", "unit": "potion", "price": 5210.33, "priceText": "52.1 gp", "vsUsualPercent": 4 }
  ]
}
```

- `price` is in copper pieces; `vsUsualPercent` is against the usual price in that town.
- No reason, no stock, no other town, no event, no date, and no hidden name.
- In every other case (world not started, party not placed, party somewhere hidden, a place with no market) it answers exactly `{ "place": null, "prices": [] }`, so the answer does not reveal which case it is.
- Reading it never writes anything. A test checks the answer for leaks.
- No players' page uses it yet.

### P. Caps that keep any one subject or good from filling the day

These are constants in the engine, listed here because they shape what you see:

- Each subject (countdowns, economy) may add at most 6 lines to the report for a day; a closing line says how many were left out.
- The economy reports at most 4 price lines a day and at most 1 per good, each only when a price has moved 5% since it was last mentioned.
- Trade is reported only when a road carries half as much again as it lately has; at most 2 lines a day.
- The economy raises at most 2 suggestions a day and at most 1 per good. One held back today is raised on a following day.
- Countdown suggestions are never capped.

## New in Stage 3, needs your OK

Stage 3 adds the city outline (no city maps), rumours, people moving, travelling NPCs, threats on roads and sickness. Everything is still append only. Nothing below exists unless you write it: the world starts with no rumour, no sickness, no traveller and no move.

### Q. Cities are an outline, kept as rows (no maps)

A town is districts, locations and people. Each change is a new `city` row; nothing is deleted, an entry is retired and can be brought back. Every entry is hidden from players until you say they know it.

```json
{
  "recordType": "city",
  "id": "c-0099306-ab12",
  "action": "add",
  "entryId": "<town>--<name>",
  "day": 99306,
  "at": "2026-11-23T19:04:11.000Z",
  "entry": {
    "type": "district | location | npc",
    "town": "<place id of the town>",
    "name": "<name>",
    "kind": "<Inn, Smith...; for a person, what they do> | null",
    "note": "<one line> | null",
    "district": "<district entry id> | null",
    "location": "<location entry id, people only> | null",
    "playersKnow": false,
    "source": "<where in your notes it came from> | null"
  }
}
```

Other actions on the same kind of row:

- `"action": "change"` with `"changes": { "name"?, "kind"?, "note"?, "town"?, "district"?, "location"?, "playersKnow"? }`. This is rename, move, and "the players know this".
- `"action": "retire"` and `"action": "restore"`.

Entry ids: a location is `<town>--<name>` (the same ids your setup file already uses for places in a town), a person is `npc--<town>--<name>`, a district is `<town>--district--<name>`. A person at a location is in that location's district. A person with neither is "somewhere in town".

The outline is read straight from the record. It is not part of the daily tick and is not in the day snapshot.

### R. Rumours (new rows; running state in the snapshot)

```json
{
  "recordType": "rumour",
  "id": "r-0099306-ab12",
  "action": "start",
  "rumourId": "rumour-cd34",
  "day": 99306,
  "at": "...",
  "rumour": {
    "eventId": "<the written event it is about> | null",
    "truth": "written | unwritten",
    "origin": "<place id where it starts>",
    "who": "<text>",
    "what": "<text>",
    "where": "<place id it is said to have happened in>",
    "size": 2,
    "flatters": true
  }
}
```

- `size` is 1 (a small thing) to 5 (never seen before). `flatters` is `true`, `false` or `null`.
- `"action": "end"` stops it spreading. `"action": "confirm"` with `eventId` marks it true, pointing at the written event.
- `"action": "reveal"` with `"place"` and `"playersVisible": true | false` lets the players hear it in that one town, or takes that back. It can only be revealed where it has arrived.

Running state, `state.systems.rumours.items.<rumourId>`:

```json
{
  "id": "rumour-cd34",
  "eventId": null,
  "truth": "unwritten",
  "origin": "<place id>",
  "startDay": 99306,
  "version": { "who": "...", "what": "...", "where": "<place id>", "size": 2, "flatters": false },
  "heard": {
    "<place id>": {
      "day": 99308,
      "from": "<place id it came from> | null",
      "bent": { "attribute": "who | what | where | size | flatters", "from": "...", "to": "..." },
      "version": { "who": "...", "what": "...", "where": "...", "size": 3, "flatters": false },
      "playersVisible": false
    }
  },
  "wary": { "<place id>": 99308 },
  "ended": false
}
```

`version` at the top is the truth and never changes. Each town keeps its own telling; `bent` is `null` when it was passed on unchanged. At most one attribute bends per hop.

### S. People moving (an effect on an event; running state in the snapshot)

A new kind of `effect` on an event (written by you, or carried by a suggestion you accept):

```json
{ "type": "people-move", "from": "<place id>", "to": "<place id>", "people": 300, "days": 2, "label": "<text> | null" }
```

Running state, `state.systems.people`: `change` (how many each place has gained or lost, so a head count is always the setup figure plus this), `moves` (moves still under way), `onTheRoad` (groups travelling, with the day they arrive). Nobody is made or lost. No move is ever started by the simulation.

### T. Sickness (effects on events; running state in the snapshot)

```json
{ "type": "sickness-start", "place": "<place id>", "name": "marsh fever", "label": null }
{ "type": "sickness-end", "place": "<place id>", "label": null }
```

Running state, `state.systems.sickness.items.<place id>`: `{ place, name, startDay, cause, sick, recovered, peak, ended, endDay, endedBy, raisesUseOf: "medicine", usePerSickShare, suggestedTo }`. A sickness exists only after a written event (or an accepted suggestion) with `sickness-start`. Reaching another town is only ever a suggestion carrying its own `sickness-start`.

Goods gain an optional `tags` list in the market setup (`"tags": ["medicine"]`). A sickness raises the use of goods with that tag; no good is special by its id.

### U. Travelling NPCs (new rows; running state in the snapshot)

```json
{
  "recordType": "traveller",
  "id": "t-0099306-ab12",
  "action": "set",
  "npcId": "npc--<town>--<name>",
  "name": "<their name, for the report>",
  "day": 99306,
  "at": "...",
  "stops": [{ "place": "<place id>", "stay": 2 }, { "place": "<place id>", "stay": 1 }],
  "loop": true
}
```

`"action": "clear"` ends their travels. Running state, `state.systems.travellers.items.<npcId>`: `{ npcId, name, stops, loop, index, at, leaveDay, from, to, departDay, arriveDay, roads, held, done }`.

### V. Threats on roads

A countdown may carry `"route": "<road id>"` as well as, or in place of, `"place"`. Its suggestion is tagged `route:<road id>` and may carry a road pressure as its effect.

### W. Map positions

Each place in the setup document may carry `"position": [<fraction up from the bottom>, <fraction across from the left>]` on the world map image, the same convention the site's world map uses. The region outlines are not stored: they are the draft file `docs/world-sim/regions.draft.json`.

A road in the setup may carry `"via": [[<up>, <across>], ...]`, waypoints in the same convention listed from end `a` to end `b`, so it is drawn around a lake or a range instead of straight through it. Waypoints change only how the road is drawn and where things on it appear; travel days stay whatever the DM set. (Added 2026-11-23 at the DM's request: the Ardenville to Highreach road goes around Lake Arden.)

### X. What players can read without a key: rumours you revealed

`GET /api/world/public/rumours` answers with the rumours you have revealed in the town the party is in, as that town tells them, and only if the players know that town:

```json
{ "place": { "name": "<town>" }, "rumours": [{ "text": "<what that town is saying>" }] }
```

Never the truth, never where else it has spread, never a rumour you did not reveal there, no ids. A place in the tale that the players do not know is left out of the sentence. In every other case (world not started, no party set, a town the players do not know) the answer is exactly `{ "place": null, "rumours": [] }`.

### Y. Caps

Every subject (countdowns, goods, people, sickness, rumours, travellers) may add at most 6 lines to a day's report, with a closing line saying how many were held back. Rumours raise at most 2 suggestions a day; a sickness raises at most one "reaches another town" suggestion a day per place, and only once per neighbour.

## New in Stage 4, needs your OK

Stage 4 is the players' side: a page that shows what the party's town knows, and local prices beside items in item search and on the character sheets. It stores one new thing and widens one answer.

### Z1. Which catalog items follow a good (in the setup document)

Each good in the DM-only setup may carry a `covers` rule, so a player can be shown what an item costs where the party is:

```json
{
  "id": "weapons",
  "covers": {
    "itemIds": ["<catalog item id>", "..."],
    "types": ["simple weapon", "martial weapon"],
    "reference": "<the catalog item this good was priced from>",
    "estimate": true,
    "basis": "<one line on why these items>"
  }
}
```

- An item listed in `itemIds` always follows the good.
- An item whose type is in `types` follows the good only if it is ordinary: rarity none or common. Anything uncommon or rarer, or of unknown rarity, follows a good only when listed by id.
- A good with no rule, or an item no rule matches, changes nothing: the item shows its catalog price only.
- The rule changes only what players are shown. It has no effect on stock, prices or trade.
- It is edited on the DM page under Markets ("Which items follow this price for players"). Saving it there marks it as yours, not an estimate.

### Z2. The open prices answer gains two fields per good

`GET /api/world/public/prices` (section O) now answers:

```json
{
  "place": { "name": "<town>" },
  "prices": [
    {
      "good": "Weapons", "unit": "weapon", "price": 1680, "priceText": "16.8 gp", "vsUsualPercent": 12,
      "ratio": 1.12,
      "covers": { "itemIds": [], "types": ["martial weapon", "simple weapon"] }
    }
  ]
}
```

- `ratio` is this town's price for the good divided by the good's base price. An item's local price is its catalog price times `ratio`.
- `covers` carries only the item ids and types from Z1. The `reference`, `estimate` and `basis` fields stay with the DM.
- Nothing else is added: still no stock, no reasons, no other town, no events. The empty answer is unchanged: exactly `{ "place": null, "prices": [] }` when the world has not started, no party is set, or the party is somewhere the players do not know.

### Z3. What the players' pages do with it

- `docs/tools/town/` ("Word in town") reads the two open routes, sends no key and stores nothing in the browser. Whatever the reason for an empty answer, it says only "No news from town yet."
- Item search and the character sheet ask the prices route once per page load, in the background. If there is no answer they show catalog prices exactly as before. Nothing about the town is saved with a character.

## What is not stored here

- People (NPCs). Places, goods and roads are sections G, L and N; every estimate in them is listed in `Private/0.DM Screen/World Sim/SEED-REVIEW.md`.
- Anything in the character sheet data. Nothing here touches it.
