# API Deploy

Scripts here zip-deploy `docs/api/src` into an existing Azure Function App.

PowerShell:

```powershell
cd docs/api
.\apiDeploy\deploy.ps1 `
  -ResourceGroupName "<resource-group>" `
  -FunctionAppName "<function-app>" `
  -StorageAccountName "<storage-account>" `
  -AssignStorageRole
```

Bash:

```bash
cd docs/api
./apiDeploy/deploy.sh \
  --resource-group "<resource-group>" \
  --function-app "<function-app>" \
  --storage-account "<storage-account>" \
  --assign-storage-role
```

The scripts set these app settings:

- `ELDORIA_STORAGE_ACCOUNT`
- `ELDORIA_CHARACTER_CONTAINER`
- `ELDORIA_CATALOG_TABLE`
- `ELDORIA_ALLOWED_ORIGINS`

The scripts also add each `ELDORIA_ALLOWED_ORIGINS` value to the Function App's Azure CORS
configuration. This is required because Azure can answer browser `OPTIONS` preflight requests
before the JavaScript handler runs.

For a one-off fix on an already-deployed app:

```powershell
az functionapp cors add `
  --resource-group "<resource-group>" `
  --name "<function-app>" `
  --allowed-origins "http://127.0.0.1:8080" "http://localhost:8080"
```

`--assign-storage-role` / `-AssignStorageRole` grants the Function App's managed identity both
`Storage Blob Data Contributor` (character data) and `Storage Table Data Contributor` (rules
catalogs) on the storage account.

Use `--storage-connection-string` / `-StorageConnectionString` only if you want the Function App to use connection-string auth instead of managed identity.
