# SQL Migrations

Migration files are tracked and safe to commit. Connection information stays in `docs/api/config/azure.local.json`, which is ignored by git.

Run migrations from `docs/api`:

```powershell
.\scripts\Run-SqlMigrations.ps1
```

The first migration creates a `publicapi` schema with read-model tables for:

- `Players`
- `PlayerAbilities`
- `PlayerLists`
- `PublicEntities`
- `SearchDocuments`

Runtime API access should use managed identity when possible. The local migration runner supports Microsoft Entra auth through `sqlcmd -G` with `migrationAuthMode: "entra"`, or SQL authentication through ignored local credentials with `migrationAuthMode: "sql"`.

For Entra migrations, use a current `sqlcmd` and Microsoft ODBC Driver 18. If your account requires MFA, set `sql.migrationUser` in ignored `azure.local.json`; the runner will call `sqlcmd -G -U <user>` for interactive authentication.
