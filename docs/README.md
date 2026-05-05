# Eldoria Campaign Hub

Static public docs and table tools for the Eldoria D&D campaign.

Obsidian markdown remains the source of truth. The lean public build reads the vault's `Public/` markdown, extracts public player data from `Private/1. The Party/Players/Player Controls.md`, and writes lightweight HTML plus JSON indexes into `docs/`.

## Commands

From the `docs` folder:

```bash
npm run build-public
npm run validate-public
npm run api:login
npm run api:install-sqlcmd
npm run api:init-config
npm run api:check-config
npm run api:check-tools
npm run api:settings
npm run api:deploy
npm run api:migrate
npm run build
```

- `build-public` regenerates `docs/Public`, `docs/data`, `docs/search.html`, `docs/npc-index.json`, and `docs/location-index.json`.
- `validate-public` checks generated public HTML for broken local links and unresolved wiki-links.
- `api-smoke` checks the read-only public API handlers against the generated JSON.
- `api:login` signs Azure CLI in from this repo's PowerShell scripts.
- `api:install-sqlcmd` installs the modern Microsoft.Sqlcmd tool through winget.
- `api:init-config` creates ignored local Azure config files if they do not exist.
- `api:check-config` validates the ignored local Azure config before deploy/migration.
- `api:check-tools` checks for Azure CLI and `sqlcmd` before deploy/migration.
- `api:settings` pushes Function App settings and CORS from local config.
- `api:deploy` packages and deploys `docs/api` to an existing Azure Function App.
- `api:migrate` applies tracked SQL migrations to Azure SQL using local-only credentials.
- `build` runs the public build, validates it, smoke-tests the public API, then refreshes the Jarvis index.

The legacy `generate-index.js` script is still available as `npm run generate-index`, but the lean public generator now writes the NPC and location indexes directly.

The root utility pages remain canonical:

```text
background-search.html
feat-search.html
item-search.html
race-search.html
spell-search.html
```

The build also restores compatibility pages such as `Public/Item Searcher.html` so old public links and bookmarks continue to land on the right lookup tool.

## Generated Outputs

```text
docs/
├── api/                       # Azure Functions read API plus generated API data
├── Public/                    # Generated static HTML and copied public assets
│   ├── Players/               # Foundry-style tabbed player sheets
│   └── World/                 # Public world pages, preserving URL shape
├── data/
│   ├── players.json           # Public player sheet data
│   ├── entities.json          # Public entity metadata
│   ├── entity-index.json      # Alias for entity consumers
│   └── search-index.json      # Client-side public search documents
├── search.html                # Public docs search UI
├── npc-index.json             # Hub NPC browser data
└── location-index.json        # Hub location browser data
```

`docs/api/data` mirrors the same generated JSON used by the static site. That keeps the Azure Functions API self-contained when GitHub Pages serves the static files separately.

## Public Docs Workflow

1. Edit campaign content in Obsidian under `Public/`.
2. Keep player sheet values in the existing public player sheets and shared controls in `Private/1. The Party/Players/Player Controls.md`.
3. Run `npm run build-public`.
4. Run `npm run validate-public`.
5. Open `index.html` or serve the `docs` folder locally.

For local review with the existing static server:

```bash
node server.js
```

Then open `http://localhost:8086`.

The local server also exposes the read-only API routes:

```text
GET /api/players
GET /api/players/{slug}
PATCH /api/players/{slug}
GET /api/search?q=&type=&region=&location=
GET /api/entities/{slug}
```

## GitHub Pages + Azure API

If `docs` continues to be hosted by GitHub Pages, deploy the `docs/api` folder as a separate Azure Functions app and point the static site at it in `docs/site-assets/site-config.js`:

```js
window.ELDORIA_PUBLIC_CONFIG = {
  apiBaseUrl: "https://your-function-app.azurewebsites.net/api",
  apiTimeoutMs: 4000,
};
```

When `apiBaseUrl` is set, the public search page calls the Azure `/api/search` endpoint and player sheets call `/api/players/{slug}`. If the API is unavailable or the value is blank, the pages fall back to generated static JSON and pre-rendered HTML.

Player sheets support browser-saved and cloud-saved edits for HP, AC, speed, ability scores, gold, hero points, equipment, equipped items, spells, and notes. Spell tabs can search the generated spell catalog and add/remove spells in-page, while weapon cards show attack and damage math breakdowns. Combat toggles surface conditional effects such as Great Weapon Master and equipped item abilities like the Sigil of Thunderous Might. There is intentionally no edit token; the public write endpoint only accepts targeted sheet updates for an existing player id, clamps numeric values to safe ranges, length-limits equipment and spell strings, strips tag delimiters from player text, and stores merged patches through parameterized SQL.

The API responses include public CORS headers for browser calls from GitHub Pages. If you later restrict CORS in Azure, allow your GitHub Pages origin and local review origin:

```text
https://<github-user-or-org>.github.io
http://localhost:8086
```

## Local Azure Ops

Private deployment and migration settings live in ignored files:

```text
docs/api/config/azure.local.json
docs/api/local.settings.json
```

Tracked templates live beside them:

```text
docs/api/config/azure.local.example.json
docs/api/local.settings.sample.json
```

Fill `azure.local.json` with your subscription, resource group, Function App, GitHub Pages origin, SQL server, and migration login. Then run:

```powershell
npm run api:login
npm run api:check-config
npm run api:check-tools
npm run api:settings
npm run api:deploy
npm run api:migrate
```

The runtime API is set up for managed identity by default. The local migration runner uses Microsoft Entra auth through `sqlcmd -G` when `migrationAuthMode` is `entra`; SQL username/password remains available as an ignored local-only fallback.

If Azure CLI reports `AADSTS50076` or asks for MFA, keep `tenantId` and `loginUseDeviceCode` set in `azure.local.json`, then run `npm run api:login` again and complete the browser/device-code prompt.

For SQL migrations, use a current `sqlcmd` and Microsoft ODBC Driver 18. If your SQL Entra account requires MFA, set `sql.migrationUser` in ignored `azure.local.json`; the migration script will use interactive `sqlcmd -G -U <user>`.

If `api:migrate` reports `Microsoft Online Services Sign-In Assistant could not be found`, Windows is using an old ODBC 13-era `sqlcmd`. Run `npm run api:install-sqlcmd`, open a new terminal, then rerun `npm run api:check-tools`. If the old tool still wins PATH precedence, set `sql.sqlcmdPath` in ignored `azure.local.json` to the modern `sqlcmd.exe`.

## Player Sheets

Generated player sheets preserve the current public URLs:

```text
docs/Public/Players/* Player Sheet.html
```

Each generated sheet renders tabbed sections for overview, abilities, combat, skills/saves, equipment, spells, class info, and notes links. The build reuses the existing data first; repeated data can be moved into structured frontmatter or JSON later without changing public URLs.

## Azure Roadmap

- V1: Deploy generated static files only.
- V2: Host static files from GitHub Pages and deploy `docs/api` to Azure Functions for read-only player, entity, and search endpoints.
- V3: Move normalized public data into Azure SQL tables such as `Players`, `PlayerStats`, `Inventory`, `KnownSpells`, `PublicEntities`, and `SearchDocuments`.

Use custom Azure Functions over direct database exposure for public read APIs. Data API Builder can be evaluated later for admin/internal CRUD, and Azure AI Search can be added only if the local JSON search becomes too limited.

Optional Static Web Apps settings if the static host moves to Azure later:

```text
app_location: docs
api_location: api
output_location: .
```
