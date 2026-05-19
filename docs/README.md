# Eldoria Campaign Hub

Static public docs and table tools for the Eldoria D&D campaign.

Obsidian markdown remains the source of truth. The lean public build reads the vault's `Public/` markdown, extracts public player data from `Private/1. The Party/Players/Player Controls.md`, and writes lightweight HTML plus JSON indexes into `docs/`.

## Commands

From the `docs` folder:

```bash
npm run build-public
npm run validate-public
npm run feedback:player-sheets
npm run api:login
npm run api:init-config
npm run api:check-config
npm run api:check-tools
npm run api:settings
npm run api:seed-player-sheets
npm run api:deploy
npm run build
```

- `build-public` regenerates `docs/Public`, `docs/data`, `docs/search.html`, `docs/npc-index.json`, and `docs/location-index.json`.
- `validate-public` checks generated public HTML for broken local links and unresolved wiki-links.
- `api-smoke` checks the read-only public API handlers against the generated JSON.
- `feedback:player-sheets` runs sequential Codex CLI inspector agents against the live review server and writes structured sheet reports.
- `feedback:player-sheets:fix` also lets a Codex fixer agent update generic docs/parser/runtime code between inspection passes, then reruns the loop.
- `api:login` signs Azure CLI in from this repo's PowerShell scripts.
- `api:init-config` creates ignored local Azure config files if they do not exist.
- `api:check-config` validates the ignored local Azure config before storage setup and deploy.
- `api:check-tools` checks Azure CLI login before storage setup and deploy.
- `api:settings` pushes Function App settings, CORS, managed identity, and Table Storage role assignment from local config.
- `api:seed-player-sheets` copies generated player sheet JSON into Azure Table Storage as full cloud sheet documents.
- `api:deploy` packages and deploys `docs/api` to an existing Azure Function App.
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

For Codex-driven live player sheet feedback loops, keep the same review server running and run:

```bash
npm run feedback:player-sheets -- --sheets Julie,JP --max-passes 1
npm run feedback:player-sheets:fix -- --max-passes 3 --verify full
```

The loop spawns one Codex CLI inspector per selected sheet. Each inspector uses Playwright against the rendered page, compares selected character options to the visible controls, and returns a JSON report under `docs/.codex-sheet-feedback/`. With `--fix`, a separate Codex fixer agent receives the findings, updates the owning generic layer, rebuilds, and starts the next inspection pass until all selected sheets pass or the max pass count is reached. If an inspector blocks but other inspectors returned issues, the fix-enabled loop continues with the completed findings and excludes the blocked report from the fixer prompt.

If Codex's sandbox blocks launching Chromium on Windows, rerun the inspectors with `--inspector-sandbox danger-full-access` or, for a fully trusted local run only, `--inspector-sandbox bypass`. The inspector prompt still forbids source edits; these modes only exist so Playwright can open the live sheet.

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

Player sheets support browser-saved and cloud-saved edits for HP, AC, speed, ability scores, gold, hero points, equipment, equipped items, spells, and notes. Spell tabs can search the generated spell catalog and add/remove spells in-page, while weapon cards show attack and damage math breakdowns. Combat toggles surface conditional effects such as Great Weapon Master and equipped item abilities like the Sigil of Thunderous Might. There is intentionally no edit token; the public write endpoint only accepts targeted sheet updates for an existing player id, clamps numeric values to safe ranges, length-limits equipment and spell strings, strips tag delimiters from player text, and writes the complete player sheet document back to Azure Table Storage.

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

Fill `azure.local.json` with your subscription, resource group, Function App, GitHub Pages origin, and Table Storage account. The current storage account is `eldoriargac5b`. Then run:

```powershell
npm run api:login
npm run api:check-config
npm run api:check-tools
npm run api:settings
npm run api:seed-player-sheets
npm run api:deploy
```

The runtime API uses managed identity with Azure Table Storage. `api:settings` assigns the Function App identity and grants `Storage Table Data Contributor` on the configured storage account.

If Azure CLI reports `AADSTS50076` or asks for MFA, keep `tenantId` and `loginUseDeviceCode` set in `azure.local.json`, then run `npm run api:login` again and complete the browser/device-code prompt.

Run `npm run api:seed-player-sheets` after `npm run build-public` when you want to bootstrap or refresh the cloud player sheet documents from generated vault data. The local seed script installs API dependencies if needed and uses a temporary storage account key from Azure CLI; the deployed API still uses managed identity. After seeding, the cloud `PlayerSheets` table is the API source of truth for player sheets.

## Player Sheets

Generated player sheets preserve the current public URLs:

```text
docs/Public/Players/* Player Sheet.html
```

Each generated sheet renders tabbed sections for overview, abilities, combat, skills/saves, equipment, spells, class info, and notes links. The build reuses the existing data first; repeated data can be moved into structured frontmatter or JSON later without changing public URLs.

## Azure Roadmap

- V1: Deploy generated static files only.
- V2: Host static files from GitHub Pages and deploy `docs/api` to Azure Functions for public player, entity, search, and character builder endpoints.
- V3: Keep player sheets and character builds in Azure Table Storage; add Azure AI Search only if the local JSON search becomes too limited.

Use custom Azure Functions over direct storage exposure for public APIs.

Optional Static Web Apps settings if the static host moves to Azure later:

```text
app_location: docs
api_location: api
output_location: .
```
