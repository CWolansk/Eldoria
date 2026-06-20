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

### Optional item search index

The API can accelerate lightweight `GET /api/catalog/items?q=...&limit=...` searches with a
separate Table Storage suffix/prefix index. The index lives outside the main catalog table, so
it can be seeded, ignored, or deleted without touching catalog rows.

Behavior:

- Enabled by default when the index table has a current manifest.
- Set `ELDORIA_ITEM_SEARCH_INDEX=false` to force rollback to the existing catalog scan.
- Uses `ELDORIA_CATALOG_SEARCH_TABLE` when set; otherwise defaults to `<ELDORIA_CATALOG_TABLE>search`.
- Only handles lightweight, unfiltered item searches. `full=true`, structured filters, too-short
  searches, stale/missing index data, and index errors fall back to the current scan path.
- The index preserves substring-style item-name matching by indexing suffixes of normalized item
  name/source tokens, so searches like `sword` still find `Longsword`, `Shortsword`, and
  `Greatsword`.

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
- `ELDORIA_ITEM_SEARCH_INDEX`: Set to `false`, `0`, `no`, `off`, or `disabled` to bypass the
  item search index and use the existing catalog scan path.
- `ELDORIA_BLOB_PREFIX`: Optional prefix for all API blobs. Use only when the seed script uses `--prefix`.
- `ELDORIA_CREATE_CONTAINER` / `ELDORIA_CREATE_TABLE`: Set to `false` to skip create-if-not-exists for the container/table.
- `ELDORIA_ALLOWED_ORIGINS`: Comma-separated CORS allowlist. Defaults to `*`. Deploy scripts
  also sync these origins into the Azure Function App CORS config so browser preflights include
  `Access-Control-Allow-Origin`.

Managed-identity deployments need both `Storage Blob Data Contributor` and
`Storage Table Data Contributor` on the storage account (the deploy scripts assign both
with `--assign-storage-role`).

See `seed/`, `apiDeploy/`, and `apiClient/` for the supporting scripts and client.
