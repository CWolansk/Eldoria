# Character Sheet (`sheet/`) — the play/display app for final v1 character DTOs

This folder is the **character DISPLAY/PLAY app**: it loads a final v1 character DTO, runs all D&D 5e math over it, and renders an interactive sheet (view / play / edit) with HP, slots, rests, inventory, attacks, and a spell/item library. [`CharacterSheetApp`](./character-sheet-app.js) is the low-level controller used by the simpler [`../eldoria-characters.js`](../eldoria-characters.js) page API. The same renderer it uses internally also powers the static read-only sheet on the public index page, and the app can hand off to the builder for progression edits. There is **no build step** — these are native ES modules loaded straight into the browser (see [`../sheet.html`](../sheet.html)), so every import must keep its `.js` extension.

## Modules

| File | Exports | Responsibility |
| --- | --- | --- |
| [character-sheet-app.js](./character-sheet-app.js) | `CharacterSheetApp`, `DEFAULT_CHARACTER_SHEET_CONFIG`, `normalizeCharacterSheetConfig` | Public entry. Owns config, the `CharacterModel`, rules catalog, load/save/export/reload lifecycle, builder handoff, validation summary, dirty-tracking, and the `getSnapshot()` that every renderer consumes. |
| [character-sheet-actions.js](./character-sheet-actions.js) | `applyTableStateAction`, `patchCharacterModel`, `syncCurrentHpToMax`, `applyHpDamage`, `applyHpHealing`, `setTemporaryHp`, `updateDeathSave`, `resetDeathSaves`, `toggleInspiration`, `adjustHitDie`, `resetHitDie`, `adjustResource`, `resetResource`, `adjustSpellSlot`, `resetSpellSlot`, `addSpellToClass`, `prepareSpell`, `unprepareSpell`, `setCurrencyAmount`, `adjustCurrencyAmount`, `addInventoryItem`, `buyInventoryItem`, `setInventoryItemQuantity`, `adjustInventoryItemQuantity`, `setInventoryItemEquipped`, `toggleInventoryItemAttunement`, `setAttackMode`, `setAttackAbility`, `setAttackProficiency`, `applyShortRest`, `applyLongRest`, `createUnavailableSheetAction` | Pure table-state mutations on the `CharacterModel` (HP, death saves, hit dice, resources, spell slots, prepared spells, currency, inventory, attack overrides, rests). `applyTableStateAction` is the action dispatcher the app calls. |
| [character-sheet-events.js](./character-sheet-events.js) | `CharacterSheetEvents` | Delegated DOM event binding on the rendered root: tab clicks/keyboard nav, table-state action buttons, rule/HP/AC/library modals, feature & library filtering, focus trapping, Ctrl/Cmd+S save, Escape-to-close, and `beforeunload` unsaved-changes guard. |
| [character-sheet-loader.js](./character-sheet-loader.js) | `CharacterSheetLoader`, `CharacterSheetLoaderError`, `resolveManifestRelativeUrl` | Fetch/file-system abstraction for loading & saving final DTOs and loading the rules catalog. Resolves character URLs (path templates, `{characterId}` tokens), parses JSON, reports `not-found`/`save-endpoint-unavailable`, and delegates catalog loading to `RulesCatalogLoader`. |
| [character-sheet-render.js](./character-sheet-render.js) | `CharacterSheetRenderer`, `DEFAULT_CHARACTER_SHEET_TABS`, `normalizeCharacterSheetTabId`, `resolveCharacterSheetTabs` | Builds and mounts the interactive shell (header, status pills, summary strip, top console, table-state trackers, left rail, tab nav, persistence footer), then delegates the active tab body to the read-only renderer. Owns mount/unmount, scroll lock, and focus management. |
| [character-sheet-validation.js](./character-sheet-validation.js) | `validateCharacterSheet`, `hasBlockingSheetIssues`, `summarizeSheetValidation` | Fast sheet-facing DTO validation (schema version, id, name, abilities, classes, spell-slot/spellcasting consistency). Not a full schema validator — flags app-blocking and table-facing issues. |
| [character-sheet-readonly-render.js](./character-sheet-readonly-render.js) | `renderCharacterSheet`, `renderCharacterSheetTab`, `renderCharacterSheetContent`, `hasSpellTabContent`, `hasCompanionTabContent` | Static read-only renderer (formerly `app.js`). Renders the per-tab sheet content (actions/defenses/inventory/spells/companions/character/features/skills/raw-json) from a character + rules context. Used directly by the public index page **and** reused by `CharacterSheetRenderer`. |
| [sheet-rules.js](./sheet-rules.js) | `createSheetRulesContext`, `getArmorClassBreakdown`, `getSavingThrowCards`, `getSkillCards`, `getSpellcastingMath`, `getEquippedAttackCards`, `formatSpellLevel`, `getCatalogTextSummary`, `resolveSpellDetail`, `resolveFeatureDetail`, `resolveClassDetail`, `resolveSubclassDetail`, `resolveRaceDetail`, `resolveBackgroundDetail`, `resolveFeatDetail`, `resolveItemPropertyDetail`, `resolveItemDetail` | All runtime D&D math and catalog resolution: ability modifiers, AC breakdown, saves, skills, spell DC/attack, equipped weapon attack cards, plus catalog lookups (spell/feature/class/subclass/race/background/feat/item) with a built-in 2014 weapon/armor fallback table. |
| [character-sheet-styles.css](./character-sheet-styles.css) | _(stylesheet, no JS exports)_ | All styling for the sheet shell, console/rail, tabs, table-state trackers, rule/library dialogs, and the `.character-sheet-render-target` read-only content skin. Built on the shared site tokens. |

## Usage

Most embedding pages should call `mountSheet(...)` from [`../eldoria-characters.js`](../eldoria-characters.js). Use `CharacterSheetApp` directly only when you need lower-level control. Adapted from the page API:

```js
import { CharacterSheetApp } from "./sheet/character-sheet-app.js";

const sheetApp = new CharacterSheetApp();

sheetApp.open({
  mode: "play",                      // "view" | "play" | "edit"
  mount: document.querySelector("#sheet-root"),
  characterId,                       // stable final DTO id to load/save
  characterUrl,                      // direct/path-template final DTO URL
  builderUrl,                        // builder-decision DTO URL (for handoff)
  rulesCatalogBasePath: "./data/",   // base path for the generated normalized catalog JSON
  rulesProfile: {                    // campaign/source filtering profile
    ruleset: "2014",
    allowedSources: ["PHB", "XGE", "TCE", "SCAG"],
    sourcePolicy: "all"
  },
  persistenceMode: "export-only",    // "save" writes remotely; "export-only" downloads draft JSON
  activeTab: "overview",
  builder: {                         // optional builder handoff
    enabled: true,
    open(config) { return builderApp.open(config); },
    openMode: "edit",
    config: { persistenceMode: "export-only" },
    callbacks: { /* onLoad/onSave/onExport/onClose/onError */ }
  },
  callbacks: {                       // lifecycle hooks owned by the embedding page
    onLoad(snapshot) { /* ... */ },
    onExport(result) { /* ... */ },
    onOpenBuilder(result) { /* ... */ },
    onClose() { /* ... */ },
    onError(error) { /* ... */ }
  }
});

await sheetApp.ready;   // resolves once the character + rules catalog have loaded
```

Config fields actually consumed by the app (see `DEFAULT_CHARACTER_SHEET_CONFIG` / `normalizeCharacterSheetConfig`):

- **`mode`** — `"view"` (read-only), `"play"`, or `"edit"`; gates table-state edits and the edit-only Raw JSON tab.
- **`mount`** — selector string or element to embed the sheet into; if omitted, the renderer creates an owned full-screen modal root.
- **`characterId`** — stable final DTO id used to resolve load/save URLs and to detect id conflicts on save.
- **`characterDto`** — an already-loaded final v1 DTO (skips fetching).
- **`characterUrl` / `characterBaseUrl`** — direct or path-template URL / base path for the final DTO (`{characterId}` / `:id` tokens supported).
- **`builderUrl` / `builderBaseUrl`** — URL / base path for builder-decision DTOs, forwarded to the builder on handoff.
- **`rulesCatalog` / `normalizedCatalog`** — a preloaded normalized catalog (skips fetching); otherwise…
- **`rulesCatalogBasePath`**, **`rulesCatalogManifestFile`**, **`rulesCatalogKeys`** — where and what to load for the generated normalized catalog.
- **`rulesProfile`** — `{ ruleset, allowedSources, sourcePolicy }` source filtering applied across catalog resolution.
- **`persistenceMode`** — `"save"` (may write to a remote endpoint) or `"export-only"` (Save becomes "Export Draft", downloads JSON only).
- **`saveMethod`** / **`checkStaleOnSave`** — HTTP method for remote saves and whether to re-read the persisted DTO before saving.
- **`visibleTabs` / `activeTab`** — host tab allowlist and the initially selected tab.
- **`builder`** — `{ enabled, openMode, mount, app, open, config, callbacks }` handoff configuration; supply `open(config)` or an `app` with an `open` method.
- **`callbacks`** — `onOpen`, `onLoad`, `onChange`, `onSave`, `onExport`, `onClose`, `onOpenBuilder`, `onError`.

Beyond `open`, the app exposes `load()`, `save()`, `export()`, `reloadRulesCatalog()`, `setActiveTab()`, `patch()`, `applyTableStateAction()`, `openBuilder()`, `close()`, and `getSnapshot()`.

## Dependencies

**Imports from `../shared/`:**
- [character-sheet-app.js](./character-sheet-app.js) → `CharacterModel` from `../shared/character-model.js`; `deepClone`, `stringifyJson` from `../shared/character-state.js`.
- [character-sheet-loader.js](./character-sheet-loader.js) → `deepClone`, `normalizeCharacter`, `stringifyJson` from `../shared/character-state.js`; `RulesCatalogLoader` (via `new RulesCatalogLoader(...).loadCatalog()`) from `../shared/rules-catalog-loader.js`.

**Internal wiring inside `sheet/`:**
- `character-sheet-app.js` composes `character-sheet-actions.js`, `character-sheet-events.js`, `character-sheet-loader.js`, `character-sheet-render.js`, and `character-sheet-validation.js`.
- `character-sheet-render.js` imports `renderCharacterSheetTab` (+ `hasSpellTabContent`/`hasCompanionTabContent`) from `character-sheet-readonly-render.js` and math helpers from `sheet-rules.js`.
- `character-sheet-readonly-render.js` imports the catalog/math resolvers from `sheet-rules.js` and `resolveManifestRelativeUrl` from `character-sheet-loader.js`.
- `character-sheet-events.js` imports `createSheetRulesContext` / `getArmorClassBreakdown` from `sheet-rules.js` (for the HP/AC detail dialogs).
- `sheet-rules.js` is the leaf math/catalog module; the render layers depend on it, and it depends only on its own local data.

**Who imports this area:** [`../eldoria-characters.js`](../eldoria-characters.js) constructs `new CharacterSheetApp().open(config)` for [`../sheet.html`](../sheet.html), and pairs it with `CharacterBuilderApp` from `../builder/` for handoff. The public read-only index page imports `renderCharacterSheet` / `renderCharacterSheetContent` from `character-sheet-readonly-render.js` directly. `../shared/` does **not** import from `sheet/` — the dependency is one-way (`sheet/` → `shared/`).

## Notes / gotchas

- **`app.js` was renamed to `character-sheet-readonly-render.js`** during this reorg to kill the duplicate-`app.js` confusion. It is the static read-only renderer; its exports (`renderCharacterSheet`, `renderCharacterSheetTab`, `renderCharacterSheetContent`) are the stable surface used by both the public index page and the interactive renderer.
- **There are two renderers in `sheet/`.** `character-sheet-render.js` (`CharacterSheetRenderer`) builds the interactive shell/chrome and mount lifecycle; `character-sheet-readonly-render.js` produces the read-only per-tab body and is reused inside the shell. Don't duplicate tab content in the shell — render it through the read-only module.
- **`sheet-rules.js` owns all runtime D&D math and catalog resolution.** AC, saves, skills, spell DC/attack, and attack cards live here (not in the renderers). It degrades gracefully: `createSheetRulesContext` returns `catalogAvailable: false` when no catalog is loaded, and it carries a built-in 2014 weapon/armor fallback table so attacks still resolve.
- **No build step / native ES modules.** All imports must keep the explicit `.js` extension and use relative paths (`../shared/...` to reach shared). Nothing here is transpiled or bundled.
- **`mode: "view"` is read-only.** `applyTableStateAction` short-circuits with `view-mode-read-only`, and edit-only tabs (Raw JSON) are filtered out unless `mode === "edit"`.
- **Persistence is conflict-aware.** `save()` blocks on id mismatch and (when `checkStaleOnSave` is set) on stale-loaded-data by re-reading the persisted DTO. In a static/`file:`/no-endpoint context the loader reports `save-endpoint-unavailable`; `export-only` hosts should rely on Export Draft (download) instead, as the live page does.
- **The app is snapshot-driven.** Renderers and events consume the immutable object from `getSnapshot()`; mutations flow `event → app.applyTableStateAction/patch → CharacterModel → re-render`, so keep new state on the model and surface it through the snapshot rather than mutating the DOM directly.
