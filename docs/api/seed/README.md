# Seeding

## Player portrait migration

Portrait URLs are migrated separately so an image-only update cannot replace existing character sheets with placeholders. The command is a dry run unless `--apply` is supplied, and apply mode refuses to write until every deployed portrait URL returns an image.

```powershell
npm run migrate:player-portraits
npm run migrate:player-portraits -- --apply
```

Two seeders share the same storage configuration
(`ELDORIA_STORAGE_CONNECTION_STRING`, or `ELDORIA_STORAGE_ACCOUNT` for managed identity).

```powershell
cd docs/api
npm install
$env:ELDORIA_STORAGE_CONNECTION_STRING = "<storage connection string>"
```

## Character data → Blob Storage

`seedBlobStorage.js` uploads the players manifest and empty PlayerSheetDTO v2 placeholder
sheets for each manifest player into the API blob layout.

```powershell
npm run seed                 # or: npm run seed:characters
npm run seed -- --dry-run    # preview without writing
npm run seed:reset-players   # delete each manifest player's old sheet/builder blobs, then seed placeholders
```

Default source file:

- `players.json`

Use `node seed/seedBlobStorage.js --use-character-files --characters-dir <path>` only when
you intentionally want to upload existing v2 PlayerSheetDTO files instead of blank
placeholders. Builder DTOs are no longer seeded.

## Rules catalogs → Table Storage

`seedTableStorage.js` reads `docs/data/*.json` and upserts each catalog into the
`ELDORIA_CATALOG_TABLE` table (default `eldoriacatalog`), partitioned by `kind`. Every row
gets flattened index columns for filtering plus a chunked copy of the full normalized entity,
and a `_manifest` partition records per-kind counts.

```powershell
npm run seed:catalog                       # seed all kinds
npm run seed:catalog -- --dry-run          # build + validate, no writes
npm run seed:catalog -- --only items,spells
npm run seed:catalog -- --purge            # delete stale rows per kind first
```

Run `node seed/seedTableStorage.js --help` for the full option list and available kinds.

## Item search index → Table Storage

The v2 item search index accelerates substring search, browse, facets, and sorting without
rewriting the main catalog or legacy search table. It writes compact rows to
`ELDORIA_CATALOG_SEARCH_V2_TABLE`, defaulting to `<ELDORIA_CATALOG_TABLE>searchv2`.

```powershell
npm run seed:catalog:item-search -- --dry-run
npm run seed:catalog:item-search
npm run seed:catalog:item-search -- --purge-search-index
npm run seed:catalog:item-search -- --clear-search-index
```

After seeding, set `ELDORIA_ITEM_SEARCH_V2=true` on the API. Rollback is config-only: set it
back to `false` to return to the legacy search path. `--clear-search-index` is optional cleanup
for the separate v2 table.
