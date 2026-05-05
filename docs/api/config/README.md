# Local Azure Configuration

Use `azure.local.example.json` as the template for your private local config.

```powershell
Copy-Item .\config\azure.local.example.json .\config\azure.local.json
```

`azure.local.json` is ignored by git. Put subscription, Function App, GitHub Pages, and SQL migration details there.

Keep these rules:

- Do not commit `azure.local.json`.
- If Azure requires MFA or tenant-specific login, set `tenantId` and keep `loginUseDeviceCode: true`.
- Prefer `runtimeAuthMode: "managed_identity"` for the Function App.
- For Microsoft Entra migrations, use `migrationAuthMode: "entra"` and run migrations from a signed-in Windows/Entra session with `sqlcmd -G`.
- If your Entra account requires MFA for SQL, set `sql.migrationUser` to your Entra email; the runner will use interactive `sqlcmd -G -U <user>`.
- If Windows finds an older `sqlcmd` first, either run `npm run api:install-sqlcmd` or set `sql.sqlcmdPath` to the modern `sqlcmd.exe`.
- If migrations use SQL username/password, keep those values only in `azure.local.json`.
- The public GitHub Pages origin is not secret, but keeping it local lets you test different deployment targets.
