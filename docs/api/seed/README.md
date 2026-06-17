# Seeding

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

- `../character-sheets/v1/players.json`

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
