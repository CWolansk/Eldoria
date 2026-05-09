# Local Azure Configuration

Use `azure.local.example.json` as the template for your private local config.

```powershell
Copy-Item .\config\azure.local.example.json .\config\azure.local.json
```

`azure.local.json` is ignored by git. Put subscription, Function App, GitHub Pages, and Table Storage details there.

Keep these rules:

- Do not commit `azure.local.json`.
- If Azure requires MFA or tenant-specific login, set `tenantId` and keep `loginUseDeviceCode: true`.
- Set `storage.accountName` to the Azure Storage account that owns the Table Storage tables.
- Local `docs/server.js` loads this config and uses Azure CLI to fetch a storage account key in memory when `storage.useAccountKeyForLocalDev` is not `false`. This keeps localhost saves on the real Table Storage API without writing the key to disk.
- If you prefer RBAC-only local access, set `storage.useAccountKeyForLocalDev` to `false` and make sure your signed-in Azure user has `Storage Table Data Contributor` on the storage account.
- Leave `storage.tableEndpoint` blank to derive `https://<account>.table.core.windows.net`.
- Set `storage.rulesTable` if the rules API should use a table name other than `Rules`.
- `api:settings` assigns the Function App managed identity and grants it `Storage Table Data Contributor` on the storage account.
- Run `npm run api:seed-player-sheets` once after public data generation to copy current player sheets into the `PlayerSheets` table. Local seeding installs API dependencies if needed and uses a temporary storage account key from Azure CLI; the deployed API still uses managed identity.
- Run `powershell -ExecutionPolicy Bypass -File .\scripts\Seed-Rules.ps1` from `docs/api` after rule imports to copy `docs/Assets/Rules/*.json` into the `Rules` table. Array catalogs become one entity per rule; document catalogs such as `manifest`, `ruleset-profile`, and `rule-overrides` are stored as single document records.
- The public GitHub Pages origin is not secret, but keeping it local lets you test different deployment targets.
