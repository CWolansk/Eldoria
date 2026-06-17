# Eldoria API Client

ES module client for the deployed Azure Functions API.

```js
import { EldoriaApiClient } from "./apiClient/index.js";

const api = new EldoriaApiClient({
  baseUrl: "https://<function-app>.azurewebsites.net/api"
});

const sheet = await api.getCharacterSheet("char-austin-001");
await api.saveCharacterSheet(sheet.id, sheet);
```

`saveCharacterSheet` uses `POST` with a `text/plain` JSON body by default. That keeps browser
saves from triggering an Azure `OPTIONS` preflight when the sheet is edited from localhost.
Pass `{ method: "PUT", simpleCors: false }` as the third argument only when you specifically
need the canonical REST method outside a browser.

Rules catalog helpers:

```js
const spellIndex = await api.listCatalog("spells", { limit: 20 });
const fullSpells = await api.listCatalogFull("spells");
const matches = await api.searchCatalogFull("items", "moonblade");
const rareItems = await api.listCatalogOData("items", {
  "$filter": "rarity eq 'rare' and source eq 'DMG'",
  "$orderby": "name asc",
  "$select": "name,source,rarity,valueLabel",
  "$count": true,
  "$top": 25
});
await api.createCatalogEntity("items", { name: "Test Wand", source: "Eldoria", rarity: "common" });
await api.patchCatalogEntity("items", "item:test-wand:eldoria", { rarity: "uncommon" });
const locations = await api.getLocationIndex();
const npcs = await api.getNpcIndex();
```

Use with sheet loaders:

```js
const loaderConfig = api.getLoaderConfig();
// characterBaseUrl: https://.../api/characters/{id}
```

If the Function App uses function keys:

```js
const api = new EldoriaApiClient({
  baseUrl: "https://<function-app>.azurewebsites.net/api",
  functionKey: "<key>"
});
```

## API Buddy tester deploy/seed actions

`tester.html` can call the API directly from the browser. Deploying and seeding require local
shell access, so start the localhost action helper first:

```powershell
cd docs/api
npm run buddy:actions
```

Paste the printed action key into the tester's `Actions key` field. The Deployment tabs can then
run API deploys, catalog seeding, and character seeding through `http://127.0.0.1:8787`.
