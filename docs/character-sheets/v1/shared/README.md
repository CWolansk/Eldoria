# Core (shared) — canonical character data model, model wrapper, and rules-catalog loader

This folder is the foundation layer of the v1 character toolkit. It defines the canonical v1 character JSON shape and the pure functions that normalize, mutate, and export it (`character-state.js`); a thin runtime class that wraps one character for editor-time mutations and derived math (`character-model.js`); and a transport-agnostic loader that resolves and fetches the generated rules catalog from a base path plus a manifest (`rules-catalog-loader.js`). Both pillars — `builder/` and `sheet/` — import from here, so this layer is intentionally framework-free, side-effect-free, and unaware of the DOM.

## Modules

| File | Exports | Responsibility |
| --- | --- | --- |
| [character-state.js](./character-state.js) | Constants: `ABILITY_ORDER`, `SKILL_TO_ABILITY`. Functions: `deepClone`, `createEmptyCharacter`, `getNestedValue`, `setNestedValue`, `normalizeCharacter`, `deriveSavingThrowList`, `setSavingThrowState`, `setSkillState`, `cleanCharacterForExport`, `sanitizeFileName`, `parseCsvList`, `stringifyJson` | The canonical v1 data model. Builds blank characters, normalizes any raw/imported payload into the editor-safe runtime shape, applies nested/saving-throw/skill mutations, and produces the cleaned JSON written on export. Pure functions only — no classes, no I/O. |
| [character-model.js](./character-model.js) | `CharacterModel` (class; statics `createEmpty`, `fromInput`; getter `data`; methods `replace`, `setValue`, `setCsvValue`, `setSavingThrow`, `setSkill`, `getAbilityModifier`, `deriveProficiencyBonus`, `deriveInitiative`, `syncCurrentHpToMax`, `generateIdFromName`, `toExportObject`, `toJSONString`, `suggestFileName`) | Runtime wrapper around one normalized character. Holds the mutable `#data`, re-normalizes after every change, and exposes small derived calculations (ability modifier, proficiency bonus, initiative) plus export/filename helpers. Delegates all real logic to `character-state.js`. |
| [rules-catalog-loader.js](./rules-catalog-loader.js) | Constants: `RULES_CATALOG_FILE_BY_KEY`, `DEFAULT_RULES_CATALOG_KEYS`, `ALL_RULES_CATALOG_KEYS`. Function: `normalizeRulesCatalogConfig`. Class: `RulesCatalogLoader` (`configure`, `config`, `resolveCatalogUrl`, `loadCatalog`) | Transport-agnostic loader for the generated rules catalog. Given a `basePath` + manifest file, resolves and loads each catalog JSON (spells, classes, features, races, backgrounds, feats, items, etc.), expands the indexed Eldoria-items catalog, and returns a structured result with `catalogs`, `catalogIndex`, per-file `loadResults`, and `failures`. It does not fetch anything itself — the caller injects a `loadJson(url)` function. |

## Usage

These modules are not opened directly by an HTML entry point; they are imported by the `builder/` and `sheet/` app classes (`CharacterBuilderApp`, `CharacterSheetApp`), which sit behind the simpler `EldoriaCharacters` page API. The snippets below show how the two pillars consume the core layer.

### Normalizing and wrapping a character

```js
import {
  createEmptyCharacter,
  normalizeCharacter
} from "../shared/character-state.js";
import { CharacterModel } from "../shared/character-model.js";

// Start a blank character, or normalize a payload loaded from disk/API.
const blank = createEmptyCharacter();
const fromFile = normalizeCharacter(rawJsonFromLoader);

// Wrap it for editor-time mutation + derived math (the wrapper normalizes input itself).
const model = CharacterModel.fromInput(fromFile); // or CharacterModel.createEmpty()
model
  .setValue(["identity", "name"], "Claire")
  .setSkill("stealth", { proficient: true })
  .deriveInitiative();

const dto = model.toExportObject();   // normalized plain object, fresh lastModified
const json = model.toJSONString();    // pretty-printed JSON text for save/download
```

`model.data` is the always-normalized plain object the renderers read; every mutator returns `this` for chaining and re-normalizes internally.

### Loading the rules catalog

`RulesCatalogLoader` is intentionally I/O-free: you pass it a `loadJson(url)` callback so the same loader works behind a `fetch`-based path (browser) or a `node:fs` path (build/test). In both pillars the loader-class method `loadRulesCatalog()` constructs it like this:

```js
import { RulesCatalogLoader } from "../shared/rules-catalog-loader.js";

const catalogLoader = new RulesCatalogLoader({
  rulesCatalogBasePath: config.rulesCatalogBasePath, // e.g. "./data/"
  rulesCatalogManifestFile: config.rulesCatalogManifestFile, // defaults to "rules-manifest.json"
  rulesCatalogKeys: config.rulesCatalogKeys, // defaults to DEFAULT_RULES_CATALOG_KEYS
  loadJson: (url) => this.loadJson(url) // injected fetch/fs adapter
});

const result = await catalogLoader.loadCatalog();
if (result.ok) {
  const { catalogs, catalogIndex, failures } = result.data;
  // catalogs.spells, catalogs.classes, catalogs.races, ...
}
```

Config is normalized via `normalizeRulesCatalogConfig`, which accepts either the short keys (`basePath`, `manifestFile`, `catalogKeys`) or the namespaced ones (`rulesCatalogBasePath`, `rulesCatalogManifestFile`, `rulesCatalogKeys`). Unknown/empty catalog keys are dropped; a missing `basePath` returns `reason: "rules-catalog-base-path-unavailable"` rather than throwing.

For the full page surface (`EldoriaCharacters.mountBuilder(...)` / `EldoriaCharacters.mountSheet(...)`) and the meaning of common config fields such as `mode`, `characterId`, `characterDto`, `builderDto`, `characterUrl`, `builderUrl`, `rulesCatalogBasePath`, `rulesProfile`, `persistenceMode`, `mount`, and `callbacks`, see [`../eldoria-characters.js`](../eldoria-characters.js), the `builder/` and `sheet/` READMEs, and the entry pages `builder.html` / `sheet.html` one level up.

## Dependencies

This is the bottom of the import graph. It imports nothing from sibling areas (`builder/`, `sheet/`, `data/`) and no third-party packages — only standard browser/JS globals. Internally:

- `character-model.js` imports from `./character-state.js` (`createEmptyCharacter`, `normalizeCharacter`, `cleanCharacterForExport`, `setNestedValue`, `setSavingThrowState`, `setSkillState`, `parseCsvList`, `sanitizeFileName`, `stringifyJson`).
- `rules-catalog-loader.js` and `character-state.js` have no intra-folder imports.

Who imports this area (all via `../shared/...` or deeper relative paths — the `.js` extension is required):

- `character-state.js` → `../shared/character-state.js` is imported by `builder/character-builder-loader.js`, `sheet/character-sheet-loader.js`, `sheet/character-sheet-app.js`, and is the engine behind `character-model.js`.
- `character-model.js` → `../shared/character-model.js` (`CharacterModel`) is imported by both pillar apps (`sheet/character-sheet-app.js`, `builder/character-builder-app.js`, `builder/character-builder-compiler.js`).
- `rules-catalog-loader.js` → `../shared/rules-catalog-loader.js` (`RulesCatalogLoader`) is imported by `builder/character-builder-loader.js` and `sheet/character-sheet-loader.js`, each of which injects its own `loadJson` adapter.

## Notes / gotchas

- **No build step.** These are native ES modules loaded straight into the browser. Every import path must be explicit and keep the `.js` extension (e.g. `../shared/character-state.js`) — there is no bundler/resolver to add it.
- **`normalizeCharacter` is the contract.** It fills defaults, coerces primitives, and keeps optional containers present so renderers can read deep paths without guarding. Run anything that crosses the freeform-JSON ↔ guided-UI boundary (load, set, patch, export) through it. `CharacterModel` re-normalizes after every mutation, so callers rarely call it directly.
- **Saving throws are mirrored, deliberately.** Proficiency lives both per-ability (`abilities.<abil>.savingThrow.proficient`) and as the derived top-level list `proficiencies.savingThrows`. Use `setSavingThrowState` / `deriveSavingThrowList` (or `model.setSavingThrow`) to keep them aligned — do not hand-edit one side.
- **Export cleanup differs from normalize.** `cleanCharacterForExport` (and `model.toExportObject`) drops empty skill entries and, by default, stamps a fresh `lastModified`. Pass `{ touchModified: false }` when you need a stable timestamp.
- **This layer is the model only.** Runtime sheet math (final AC/HP/save/skill totals, spellcasting, etc.) is NOT here — that lives in `sheet/sheet-rules.js`. The `CharacterModel` "derive*" helpers are small editor conveniences, not the authoritative play-time calculator.
- **Two renderers downstream.** The `sheet/` pillar ships both an editable renderer (`character-sheet-render.js`) and a read-only renderer (`character-sheet-readonly-render.js`); both consume `model.data` from this layer. Keep `normalizeCharacter`'s output shape stable, since changing a field name ripples into both renderers plus the builder.
- **The app classes were renamed.** What older docs/snippets call `app.js` is now `sheet/character-sheet-app.js` (`CharacterSheetApp`) and `builder/character-builder-app.js` (`CharacterBuilderApp`).
- **Loader is pure transport.** `RulesCatalogLoader` never calls `fetch`/`fs` itself — it requires an injected `loadJson(url)`. If you instantiate it without one, every load returns `reason: "load-json-unavailable"`. Path joining tolerates Windows drive paths, `file://` URLs, and HTTP bases.
