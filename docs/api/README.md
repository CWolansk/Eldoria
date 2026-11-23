# Eldoria Character API

Node.js Azure Functions API for cloud-backed PlayerSheetDTO v2 JSON (Blob Storage)
and the read-only rules catalogs from `docs/data` (Table Storage).

## Character endpoints (Blob Storage)

- `GET /api/health`
- `GET /api/players`
- `PUT /api/players`
- `GET /api/characters`
- `GET /api/characters/{id}`
- `POST /api/characters/{id}` — browser-friendly save alias
- `PUT /api/characters/{id}`
- `DELETE /api/characters/{id}`

Character saves use `lastModified` plus Blob ETags to reject stale whole-sheet writes with
`409 Conflict` instead of silently overwriting a newer DM or player change.

## DM lock

Some routes change data that only the DM should change. They need the DM key, a shared
secret held in the Function App setting `ELDORIA_DM_KEY` and sent in the
`x-eldoria-dm-key` header. The key is never stored in the site's files.

| Route | Needs the DM key |
|---|---|
| `GET /api/dm/session` | Yes. Returns `{ "ok": true }`; use it to check a key. |
| `POST /api/catalog/{kind}`, `PATCH /api/catalog/{kind}/{id}` | Yes |
| `PUT /api/players` | Yes |
| `DELETE /api/characters/{id}` | Yes |
| `GET`, `POST`, `PUT /api/characters/{id}` | No. Players read and save their own sheets. |
| `POST /api/dm/characters/{id}/actions`, `GET /api/dm/party` | No, for now. |
| Every `/api/world...` route | Yes |
| Every other `GET` | No |

- If `ELDORIA_DM_KEY` is not set, the locked routes refuse everyone (403).
- A missing or wrong key gets 401.
- `/api/health` reports `"dmLock": "set"` or `"not-set"`, never the key.
- Set the key when deploying: `deploy.ps1 -DmKey "<your key>"`, or set
  `$env:ELDORIA_DM_KEY` first. Deploying without one leaves the existing key in place.
- `EldoriaApiClient` sends the key when created with `{ dmKey }` or after `setDmKey(key)`.
- Tests: `npm run test:dm-key`.

## Living world endpoints (DM only, plus two public read routes)

Every route here needs the DM key (see "DM lock"), except `GET /api/world/public/prices` and `GET /api/world/public/rumours` at the end of the table.
The Function runs the same engine files as the browser (`docs/world-sim/engine`); the deploy
scripts copy them into `src/world-runtime` with `tools/stage-world-runtime.js`.

| Route | What it does |
|---|---|
| `GET /api/world` | Current day, countdowns, suggestions waiting, what was written today, the day's report, and the `etag` to send back when advancing. Before the world is started it returns `{ "initialized": false }` and writes nothing. |
| `POST /api/world/start` | First commit. Body `{ "day"?, "worldSeed"? }`; defaults to Fall 7, 496 and a random seed. Only once. |
| `POST /api/world/advance` | Body `{ "days": 1..30, "expectedEtag" }` or `{ "untilDecision": true, "expectedEtag" }` (stops when something waits for a decision, at most 7 days). 409 with "Reload and try again" if another device advanced first. |
| `GET /api/world/events?fromDay=&toDay=&status=` | Events with their current status (`written`, `suggested`, `rejected`, or `all`). |
| `POST /api/world/events` | The DM writes an event: `{ "text", "place"?, "day"?, "tags"?, "effect"? }`. Canon at once; `day` may be today or earlier. `effect` (see `STORAGE-SHAPES.md`, section I) makes it change what a town makes or uses, or a road; an event with an effect must be dated today. |
| `POST /api/world/events/{id}/decision` | `{ "decision": "accept" | "reword" | "reject", "text"? }` on a suggested event. Recorded as a new row. |
| `POST /api/world/events/{id}/visibility` | `{ "playersVisible": true | false }`. Every event is hidden from players until this says otherwise; written events only. |
| `GET /api/world/countdowns` | Countdowns as they stand. |
| `POST /api/world/countdowns` | `{ "label", "suggestionText", "place"?, "mode": "chance", "size": 4 | 6 | 8, "chance": 0..1 }` or `{ ..., "mode": "date", "dueDay" }`. |
| `POST /api/world/countdowns/{id}/actions` | `{ "action": "step", "delta": 1 | -1 }`, `{ "action": "edit", "changes": {...} }` or `{ "action": "finish" }`. |
| `GET /api/world/places`, `PUT /api/world/places` | The DM-only setup document: places and, from Stage 2, the market setup. `PUT` replaces it: `{ "places": [{ "id", "name", "kind"?, "region"?, "parent"?, "knownToPlayers"?, "detail"?, "population"? }], "economy"?: { "goods", "routes", "markets", "constants"? } }`. The engine validates the whole document; a changed market setup is also appended to the record as one row. |
| `GET /api/world/markets` | Every full-detail town with its prices, stock, 14-day history and reasons; roads with travel days and whether they are open; pressures; caravans on the road. Figures that are guesses are flagged. |
| `GET /api/world/state` | The current state, for a what-if run in the browser. Reading it saves nothing. |
| `POST /api/world/party` | `{ "place": "<place id>" | null }`. The DM says where the party is. Nothing else ever moves the party. |
| `POST /api/world/pressures/{id}/end` | Ends a pressure early. A new row. |
| `GET /api/world/overview` | Everything the Map and Rumours views need: roads with their state, rumours (the truth beside each town's telling), head counts and moves, sickness, travelling NPCs, and threats (open countdowns tied to a place or a road). |
| `GET /api/world/city`, `POST /api/world/city` | The city outline: every district, location and NPC (retired ones included) and who is travelling. `POST` adds one: `{ "type": "district" | "location" | "npc", "town", "name", "kind"?, "note"?, "district"?, "location"?, "playersKnow"? }`. There are no city maps. |
| `POST /api/world/city/import` | `{ "entries": [{ "id", "type", "town", "name", ... }] }`. Adds the ones not already there; loading the same list twice adds nothing. |
| `POST /api/world/city/{id}/actions` | `{ "action": "change", "changes": {...} }` (rename, move, "players know this"), `{ "action": "retire" }` or `{ "action": "restore" }`. Nothing is deleted. |
| `GET /api/world/rumours`, `POST /api/world/rumours` | Rumours as they stand. `POST` starts one: `{ "eventId"?, "truth": "written" | "unwritten", "origin"?, "who", "what", "where"?, "size": 1..5, "flatters": true | false | null }`. Only the DM starts a rumour. |
| `POST /api/world/rumours/{id}/actions` | `{ "action": "end" }`, `{ "action": "confirm", "eventId" }` or `{ "action": "reveal", "place", "playersVisible" }`. |
| `POST /api/world/travellers` | Gives an NPC from the city outline an itinerary: `{ "npcId", "stops": [{ "place", "stay" }], "loop"? }`. |
| `POST /api/world/travellers/{id}/end` | Ends that NPC's travels. |
| `GET /api/world/public/prices` | **No key.** Prices in the town the party is in, only if the players know that town: `{ "place": { "name" } | null, "prices": [...] }`. A commodity (a real thing with a unit) is `{ "good", "kind": "commodity", "unit", "price", "priceText", "vsUsualPercent", "ratio", "covers": { "itemIds", "types" } }`. A modifier (a class of catalog items, such as ordinary weapons) is `{ "good", "kind": "modifier", "ratio", "covers" }` and never carries a unit or a price. `ratio` is the town's price over the good's base price and `covers` says which catalog items follow it, so the town page, item search and the sheets show a real item's local price as its own catalog price times `ratio`. Never a reason, a stock level or another town; the same empty answer in every other case. |
| `GET /api/world/public/rumours` | **No key.** Rumours the DM has revealed in the town the party is in, as that town tells them: `{ "place": { "name" } | null, "rumours": [{ "text" }] }`. Never the truth, never where else a rumour has spread; the same empty answer in every other case. |

- Storage: events in the table `eldoriaworldevents` (override with `ELDORIA_WORLD_EVENT_TABLE`), one blob per committed day plus a pointer under `world/<world id>/` in the character container. The exact shapes are in `docs/world-sim/STORAGE-SHAPES.md`.
- The record is append only: a decision, a reveal, every countdown change, every change to a city, a rumour or an itinerary is a new row.
- An event's `effect` may also be `{ "type": "people-move", "from", "to", "people", "days" }`, `{ "type": "sickness-start", "place", "name" }` or `{ "type": "sickness-end", "place" }`. A sickness never starts or spreads unless the DM writes or accepts it.
- A countdown may carry `"route": "<road id>"` to sit on a road.
- Nothing is stored until `POST /api/world/start`.
- The DM page is `docs/tools/world-sim/index.html`. It asks for the DM key once and keeps it in that browser.
- To try the page with nothing deployed: `node docs/world-sim/tools/dev-server.mjs 8090 "<setup file>"` serves the site and the world routes from memory (DM key `dev`), and forgets everything when stopped.
- Tests: `npm run test:world` (engine, store, routes and the page under jsdom; needs `npm install` in `docs/world-sim` for jsdom).

## DM dashboard endpoints

### September 2026 DM workspace release

Deploy the API **and** publish the updated `docs/` assets. GitHub Pages publication
does not register Azure Functions. The deployment scripts now package the exact
player-sheet compiler and its imports into `src/sheet-runtime`; do not omit that
directory from a manually assembled API package. `/api/health` advertises the
release version and `dm-actions-v2` / `dm-undo` capabilities.

After deployment, verify that `/api/health` advertises the release capabilities
and `/api/dm/party` returns all active characters.
Existing HP values are not migrated or guessed: enter each character's
confirmed base maximum in **Party Control → Manage → Set base max HP** (before
exhaustion), or complete their level HP on the sheet. Unknown maximum HP is shown
as `?`, preserving stored current HP and preventing healing until setup is complete.

Actions accept `expectedLastModified` and return a version-bound undo snapshot.
The UI sends this precondition and prevents overlapping actions per character.
`restore` requires that version; a later player or DM update invalidates the undo.
New actions include `set-max-hp`, `set-concentration`, and `restore`. The player sheet also sends
`damage`, `heal`, `temp-hp`, conditions, exhaustion and death saves through this route, so a
player's change and a DM's change made together both land.

`rest` takes `"rest": "short"` or `"long"`. A short rest clears the used count of features
that come back on a short rest (the sheet compiler decides which). A long rest also restores
hit points to the maximum, clears temporary hit points and death saves, clears used spell
slots and every feature's used count, and lowers exhaustion by one. A rest changes nothing else. ETags continue
to protect the storage write. A partial party response contains `unavailable` IDs;
an entirely unavailable party returns 503 instead of pretending to be empty.

The encounter's initiative, NPC HP, effect timers, notes, and pinned references
are stored **in the current browser**, separately from cloud character data.
Export a session backup to transfer devices. Timers expire at the beginning of a
new round; zero means no automatic expiry. Item drafts also survive reloads.
Party action history is limited to the current page visit. References open in
new tabs so the encounter stays available. The DM screen no longer links to the
incomplete local 5etools bundle.

- `GET /api/dm/party` — one compact summary response for every active character.
- `POST /api/dm/characters/{id}/actions` — targeted damage, healing, temporary HP,
  condition, exhaustion, death-save, currency, and inventory actions.

DM dashboard and catalog mutation routes are intentionally open, matching the rest of the
campaign website API.

Character sheet reads and writes normalize to `schemaVersion: "player-sheet-v2"`.
Legacy builder documents are no longer accepted by the API.
Browser clients should prefer the API client's default `POST` save path, which sends the JSON
body as `text/plain` to avoid an Azure `OPTIONS` preflight for local cross-origin sheet editing.

Blob layout:

- `manifests/players.json`
- `characters/{id}/sheet.json`

## Rules catalog endpoints (Table Storage)

The `docs/data/*.json` catalogs are seeded into a single table partitioned by `kind`.
Each row carries flattened, filterable index columns plus a chunked copy of the full
normalized entity. Available kinds: `items`, `spells`, `races`, `backgrounds`, `feats`,
`classes`, `subclasses`, `class-features`, `subclass-features`, `magic-variants`,
`eldoria-items`.

The `items` catalog is sourced from `docs/data/items-page-full-normalized.json`, which
contains the full item-page data, including base items, item groups, generic variants,
and generated specific variants.

- `GET /api/catalog` — manifest of seeded kinds with counts.
- `GET /api/catalog/{kind}` — lightweight index rows for a kind. Query params:
  - any index column ⇒ exact-match filter, e.g. `?rarity=rare`, `?level=3&school=evocation`,
    `?ritual=true`, `?source=PHB` (pushed to the Table query).
  - `q` ⇒ case-insensitive name/source substring filter (applied in the function).
    Lightweight unfiltered item searches can use the optional item search index table before
    falling back to the catalog scan.
  - `limit` ⇒ cap the number of rows returned.
  - `skip` or `offset` ⇒ skip this many matching rows before returning results.
  - `cursor` ⇒ opaque v2 continuation cursor; do not combine with nonzero `skip`.
  - item `sort` ⇒ `relevance`, `name`, `rarity`, `type`, or `source`.
  - repeated item facet params ⇒ OR within one facet and AND across facets.
  - item `facets=true` ⇒ return complete facet values/counts for the filtered result set.
  - Paged responses include `skip`, `limit`, `hasMore`, and `nextSkip` when `limit` or
    `skip` is supplied.
  - `full=true` ⇒ return full normalized JSON entities instead of lightweight index rows.
- `GET /api/catalog/{kind}/odata` — OData-style full-object list endpoint. Query params:
  - `$filter` ⇒ Table Storage/OData filter over indexed columns, e.g.
    `$filter=rarity eq 'rare' and source eq 'DMG'`.
  - `$orderby` ⇒ comma-separated sort fields over full object paths, e.g.
    `$orderby=level asc,name asc` or `$orderby=school/name asc`.
  - `$select` ⇒ comma-separated full object paths to project, e.g. `$select=name,source,level,school`.
    `$select=*` returns the full object.
  - `$expand` ⇒ include full nested paths when `$select` is used, e.g. `$expand=entries,school`.
    `$expand=*` returns the full object.
  - `$skip` or `$skiptoken` ⇒ offset into the filtered/sorted result set.
  - `$top` or `limit` ⇒ cap the number of full objects returned (max 1000).
  - `$count=true` ⇒ response includes the total matching count before `$skip`/`$top`.
  - `q` ⇒ optional in-process name/source substring filter.
  - Response includes OData-style `value` plus the existing `items` alias; both contain the
    same page of full or projected catalog objects. `count` is page size. `totalCount` and
    `@odata.count` are only emitted with `$count=true`. `@odata.nextLink` is emitted when
    another page is available.
  - Performance: `$filter` is pushed to Table Storage. Requests without `$count=true` or
    `$orderby` stream until the requested page is found. `$count=true` and `$orderby` require
    scanning all matching rows before paging.
- `POST /api/catalog/{kind}` — create one full catalog entity. The entity id is derived from
  the same catalog model used by the seeder. Returns `409` if the id already exists.
  Use `?upsert=true` to replace an existing entity.
- `GET /api/catalog/{kind}/{id}` — the full normalized entity (reassembled from chunks).
- `PATCH /api/catalog/{kind}/{id}` — JSON merge-patch an existing full catalog entity.
  `null` deletes a field; objects merge recursively; arrays replace. The route id remains
  the storage id even if patched fields such as `name` or `source` change.

## Public index endpoints

- `GET /api/public-index/locations` — public location reference index JSON.
- `GET /api/public-index/npcs` — public NPC reference index JSON.

Table Storage filters only support equality/comparison (no substring), so structured
filters are evaluated by the table and free-text `q` is evaluated in-process. `kind` accepts
aliases (e.g. `item`, `classFeatures`, `magic-variant`).

### Versioned item search index

The API can accelerate lightweight item search and browse requests with a compact v2 Table
Storage index. The side-by-side index contains substring postings, ordered browse rows, and
facet rows without any full-document chunks.

Behavior:

- Enable with `ELDORIA_ITEM_SEARCH_V2=true` after the v2 manifest is seeded and validated.
- Uses `ELDORIA_CATALOG_SEARCH_V2_TABLE`, defaulting to `<ELDORIA_CATALOG_TABLE>searchv2`.
- Supports two-character substring queries, empty-query browse, server-side facets and sorting,
  cursor paging, and the legacy `skip`/`nextSkip` response contract.
- Missing, stale, disabled, or errored v2 indexes fall back to the existing v1/search behavior.

Seed only the search index:

```powershell
cd docs/api
npm run seed:catalog:item-search -- --dry-run
npm run seed:catalog:item-search
```

Rebuild from scratch:

```powershell
npm run seed:catalog:item-search -- --purge-search-index
```

Optional cleanup after rollback:

```powershell
npm run seed:catalog:item-search -- --clear-search-index
```

## Local Setup

```powershell
cd docs/api
copy local.settings.sample.json local.settings.json
npm install
npm run seed -- --dry-run          # v2 placeholder character/player blobs
npm run seed:reset-players         # purge old sheet/builder blobs for manifest players, then seed empty v2 sheets
npm run seed:catalog -- --dry-run  # rules catalogs into Table Storage
npm run seed:catalog:item-search -- --dry-run  # optional item search index only
npm start
```

For real local writes, run Azurite (Blob + Table) or set `ELDORIA_STORAGE_CONNECTION_STRING`
to an Azure Storage connection string.

## Environment

- `ELDORIA_STORAGE_CONNECTION_STRING`: Storage connection string. Used for both Blob and Table access. Good for local dev and simple deployments.
- `ELDORIA_STORAGE_ACCOUNT`: Storage account name. Used with managed identity when no connection string is set.
- `ELDORIA_CHARACTER_CONTAINER`: Blob container name. Defaults to `eldoria-character-data`.
- `ELDORIA_CATALOG_TABLE`: Rules catalog table name. Defaults to `eldoriacatalog`.
- `ELDORIA_CATALOG_SEARCH_TABLE`: Optional item search index table name. Defaults to
  `<ELDORIA_CATALOG_TABLE>search`.
- `ELDORIA_CATALOG_SEARCH_V2_TABLE`: Compact v2 item search table. Defaults to
  `<ELDORIA_CATALOG_TABLE>searchv2`.
- `ELDORIA_ITEM_SEARCH_V2`: Set to `true` after seeding to prefer v2 item search and browse.
- `ELDORIA_ITEM_SEARCH_INDEX`: Set to `false`, `0`, `no`, `off`, or `disabled` to bypass the
  item search index and use the existing catalog scan path.
- `ELDORIA_BLOB_PREFIX`: Optional prefix for all API blobs. Use only when the seed script uses `--prefix`.
- `ELDORIA_CREATE_CONTAINER` / `ELDORIA_CREATE_TABLE`: Set to `false` to skip create-if-not-exists for the container/table.
- `ELDORIA_DM_KEY`: Shared secret for the DM-only routes (see "DM lock"). Unset means those routes are closed.
- `ELDORIA_ALLOWED_ORIGINS`: Comma-separated CORS allowlist. Defaults to `*`. Deploy scripts
  also sync these origins into the Azure Function App CORS config so browser preflights include
  `Access-Control-Allow-Origin`.

Managed-identity deployments need both `Storage Blob Data Contributor` and
`Storage Table Data Contributor` on the storage account (the deploy scripts assign both
with `--assign-storage-role`).

See `seed/`, `apiDeploy/`, and `apiClient/` for the supporting scripts and client.
