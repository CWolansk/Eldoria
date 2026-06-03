# Builder — D&D 5e character creation app

The `builder/` folder is the character **creation** application for the v1 toolkit. [character-builder-app.js](./character-builder-app.js) exposes the low-level `CharacterBuilderApp` class whose `open(config)` method renders a builder shell into the page. Most pages should use `mountBuilder(...)` from [`../eldoria-characters.js`](../eldoria-characters.js), which handles DTO loading and embedded-page wiring. The app orchestrates a stack of single-responsibility modules — a loader (rules data + builder/character DTOs), a rules query adapter, a runtime decision model, a compiler (builder decisions → final v1 character DTO), a proficiency ledger, an HTML renderer, and a delegated DOM event binder — without owning detailed rule logic itself. These are hand-authored native ES modules loaded directly in the browser with no build step; they import shared core (`createEmptyCharacter`, `normalizeCharacter`, `CharacterModel`, `RulesCatalogLoader`) from `../shared/`.

## Modules

| File | Exports | Responsibility |
| --- | --- | --- |
| [character-builder-app.js](./character-builder-app.js) | `CharacterBuilderApp` (class), `normalizeCharacterBuilderConfig`, `DEFAULT_CHARACTER_BUILDER_CONFIG` | Public entry point. Owns orchestration between loader/rules/compiler/renderer/events, the `open(config)` lifecycle, render-state transactions, identity/level/ASI/feat/spell mutation commands, guided overlays, `save()`, `export()`, `close()`, and `getSnapshot()`. |
| [character-builder.js](./character-builder.js) | `CharacterBuilder` (class), `BUILDER_SCHEMA_VERSION`, `createEmptyBuilderDecisions`, `normalizeBuilderDecisions`, `reconstructBuilderDecisionsFromCharacter` | Runtime owner of builder-decision state (the `"builder-decisions-v1"` DTO). Holds the chronological level plan, identity choices, ability scores, granted spells, proficiency replacements; computes rules-backed requirements, pending/blocked choices, and ASI/bounded-choice models. UI-free. |
| [character-builder-compiler.js](./character-builder-compiler.js) | `CharacterBuilderCompiler` (class), `BUILDER_COMPILED_SYSTEMS`, `BUILDER_EXTERNAL_SYSTEMS`, `createAbilityImpactPreview` | Compiles a `CharacterBuilder` into a final playable v1 character DTO (`toCharacterDto`), builds the proficiency ledger (`createProficiencyLedger`), and derives deterministic baselines (HP, AC, proficiency bonus, spell slots, spellcasting blocks). Preserves external sheet-owned fields (inventory, spellbook, combat tuning). |
| [character-builder-events.js](./character-builder-events.js) | `CharacterBuilderEvents` (class) | Delegated DOM-to-app command mapping for the render root. Binds click/change/input/submit and a document keydown handler (focus trap, Escape, Ctrl/Cmd+S), enforces choice/ASI limits, collects guided-overlay payloads, and routes actions/fields to app methods. |
| [character-builder-loader.js](./character-builder-loader.js) | `CharacterBuilderLoader` (class), `CharacterBuilderLoaderError` (class) | Load/save abstraction treating static JSON and API endpoints uniformly. Resolves rules/catalog/builder/character URLs, loads normalized catalog (via shared `RulesCatalogLoader`) and legacy 5etools data, and reads/writes DTOs via fetch or the Node filesystem; returns structured result objects instead of throwing for ordinary misses. |
| [character-builder-proficiency-ledger.js](./character-builder-proficiency-ledger.js) | `createProficiencyLedger`, `createProficiencyLedgerFromInputs`, `collectProficiencyInputs`, `createReplacementKey`, `normalizeProficiencyChoiceValue` | Aggregates fixed grants and choice groups from ancestry/background/class/level decisions, detects duplicate-grant collisions, and produces choice models plus skill-replacement requests/models. |
| [character-builder-render.js](./character-builder-render.js) | `CharacterBuilderRenderer` (class), `renderCharacterBuilderShell`, `getLevelFocusKey`, `RENDER_FOCUS_KEY_ATTRIBUTE`, `ADD_LEVEL_FOCUS_KEY`, `ADD_LEVEL_CLASS_FOCUS_KEY` | Pure HTML-string renderer for the builder shell, global state panel, level timeline, outstanding-decisions sidebar, guided overlays, rules-text dialogs, and persistence panels. Owns `mount`, `render`, render-state capture/restore, and scroll/focus preservation across re-renders. |
| [character-builder-rules.js](./character-builder-rules.js) | `CharacterBuilderRules` (class), `normalizeRulesProfile`, `ASI_2014_RULE_PROFILE`, `createEmptyAbilityMap`, `addAbilityMaps`, `normalizeAbilityIncrease`, `getAbilityIncreasesFromValue`, `createBoundedChoiceModel`, `createAsiChoiceModelFromState` | Stable query layer over normalized-catalog or legacy 5etools rules JSON. Indexes ancestries/backgrounds/classes/subclasses/feats/spells/features, applies source-policy filtering, and answers `getAvailableX`, `getValidLevelDecisions`, `getClassFeaturesForLevel`, `getGrantedSpells`, `getRuleEntity`, etc. Also owns ASI/bounded-choice rule math. |
| [character-builder-styles.css](./character-builder-styles.css) | (CSS, no JS exports) | Scoped `.character-builder-*` styling for the modal shell, status bar, timeline cards, guided/picker overlays, ASI steppers, and rule dialogs. Reads site design tokens (`--bg`, `--accent`, …) and is responsive at 980px/680px breakpoints. |

## Usage

Most embedding pages should call `mountBuilder(...)` from [`../eldoria-characters.js`](../eldoria-characters.js). Use `CharacterBuilderApp` directly only when you need lower-level control. Construct once, then call `open(config)`:

```js
import { CharacterBuilderApp } from "./builder/character-builder-app.js";

const builder = new CharacterBuilderApp();

builder.open({
  mode: "edit",                       // "new" | "edit"
  characterId: "char-claire-001",
  rulesCatalogBasePath: "./data/",    // normalized catalog JSON base
  builderUrl: "./builder-decisions/char-claire-001.json",
  characterUrl: "./characters/char-claire-001.json",
  rulesProfile: {
    ruleset: "2014",
    allowedSources: ["PHB", "XGE", "TCE", "SCAG"],
    sourcePolicy: "all",
    asiAndFeatAtAsiLevels: true
  },
  persistenceMode: "export-only",     // "save" | "export-only"
  callbacks: {
    onError(error) { console.error(error); }
  }
});

// Later: builder.close();
```

`open(config)` renders the shell immediately in a loading state, binds events, fires `callbacks.onOpen`, and returns `this`. The async load completes on `builder.ready` (rules + builder DTO + final character DTO), then `callbacks.onLoad` fires.

Config fields actually consumed (see `DEFAULT_CHARACTER_BUILDER_CONFIG` / `normalizeCharacterBuilderConfig`):

- **`mode`** — `"new"` starts an empty draft; `"edit"` loads existing DTOs by `characterId`.
- **`characterId`** — stable id shared by the builder-decision DTO and the final character DTO.
- **`mount`** — optional selector/element for the shell; omitted, the renderer mounts a fixed-position root on the document.
- **`rulesCatalogBasePath`** — base path for the generated normalized catalog JSON (preferred rules source). `rulesCatalogKeys` optionally restricts which catalog files load.
- **`rulesBasePath`** / **`rulesFiles`** — legacy 5etools JSON base and core-file overrides (fallback while migrating to the catalog).
- **`characterUrl`** / **`builderUrl`** — direct or path-template (`{characterId}`, `{id}`, `:characterId`, `:id`) URLs for the final and builder DTOs. **`characterBaseUrl`** / **`builderBaseUrl`** are collection bases that append `<characterId>.json`.
- **`rulesProfile`** — `{ ruleset, allowedSources, asiAndFeatAtAsiLevels, sourcePolicy }`; campaign/source rules that gate available choices and ASI+feat behavior.
- **`persistenceMode`** — `"save"` allows writing DTOs; `"export-only"` only prepares draft JSON for download.
- **`saveMethod`** — HTTP method for remote saves (default `PUT`).
- **`callbacks`** — `onOpen`, `onLoad`, `onClose`, `onSave`, `onExport`, `onError`, owned by the embedding page.

For the shared core relied on by both pillars (builder and sheet), the typical imports are:

```js
import { createEmptyCharacter, normalizeCharacter } from "../shared/character-state.js";
import { CharacterModel } from "../shared/character-model.js";
import { RulesCatalogLoader } from "../shared/rules-catalog-loader.js";

const character = normalizeCharacter(createEmptyCharacter());
const catalog = await new RulesCatalogLoader({ rulesCatalogBasePath }).loadCatalog();
```

## Dependencies

From `../shared/`:

- `character-builder-app.js` → `CharacterModel` (`character-model.js`); `ABILITY_ORDER`, `deepClone`, `sanitizeFileName`, `stringifyJson` (`character-state.js`).
- `character-builder.js` → `ABILITY_ORDER`, `deepClone`, `normalizeCharacter` (`character-state.js`).
- `character-builder-compiler.js` → `CharacterModel`; `ABILITY_ORDER`, `SKILL_TO_ABILITY`, `createEmptyCharacter`, `deepClone`, `normalizeCharacter` (`character-state.js`).
- `character-builder-loader.js` → `createEmptyCharacter`, `deepClone`, `normalizeCharacter`, `stringifyJson` (`character-state.js`); `RulesCatalogLoader` (`rules-catalog-loader.js`).
- `character-builder-proficiency-ledger.js` and `character-builder-rules.js` → `ABILITY_ORDER` / `SKILL_TO_ABILITY` (`character-state.js`).

Within `builder/`: `character-builder-app.js` imports every sibling module (`character-builder.js`, `-compiler`, `-events`, `-loader`, `-render`, `-rules`, `-proficiency-ledger`). The compiler and proficiency ledger import `CharacterBuilder` from `character-builder.js`; the compiler also imports `createProficiencyLedger` from `character-builder-proficiency-ledger.js`. `character-builder.js` and the compiler import rule helpers (`ASI_2014_RULE_PROFILE`, `createAsiChoiceModelFromState`, `createBoundedChoiceModel`, …) from `character-builder-rules.js`.

Who imports this area: [`../eldoria-characters.js`](../eldoria-characters.js) imports `CharacterBuilderApp` from `character-builder-app.js` for [builder.html](../builder.html), [builder-preview.html](../builder-preview.html), and sheet handoff. The shared modules under `../shared/` are imported by this builder pillar; they have no dependency back on `builder/`.

## Notes / gotchas

- **No build step / keep `.js` extensions.** These run as native browser ES modules. Every relative import (including `../shared/...`) must keep the explicit `.js` extension; do not introduce bare specifiers, path aliases, or a bundler step.
- **`CharacterBuilderApp` is the low-level entry.** It is a named export of `character-builder-app.js` (not a default export). Construct with `new CharacterBuilderApp()` (optionally inject `loader`/`rules`/`compiler`/`renderer`/`events`/`builder` for tests) and drive it via `open(config)`. Page code should usually use `mountBuilder(...)` instead. (For the record: the file renamed in this reorg was the *sheet's* read-only renderer — old `app.js` → [`../sheet/character-sheet-readonly-render.js`](../sheet/character-sheet-readonly-render.js); the builder entry has always been `character-builder-app.js`.)
- **Rules has two index paths.** `CharacterBuilderRules` builds a normalized-catalog index when `rulesCatalogBasePath` data is present, and otherwise falls back to a legacy 5etools index — `character-builder-rules.js` owns all runtime rules math (source filtering, level decisions, ASI/bounded-choice models). Render and app code should query this adapter rather than parsing raw rules JSON.
- **Two renderers / pure-string rendering.** `character-builder-render.js` emits HTML strings only and has no event logic; all interactivity is delegated by `character-builder-events.js` on the render root, which is why re-rendered cards keep working. Re-renders go through render-state transactions (`captureRenderState` / `renderWithRenderState`) to preserve scroll and focus.
- **Loader never throws on ordinary misses.** Missing/404/static-save-unavailable cases return structured result objects (`reason`, `missing`, `data`); only genuine caller mistakes (e.g. edit mode without a `characterId`) throw `CharacterBuilderLoaderError`. In the browser, static files cannot be written, so saves report `save-endpoint-unavailable` rather than pretending success — use `persistenceMode: "export-only"` for static hosting.
- **Compiler boundaries.** `BUILDER_COMPILED_SYSTEMS` vs `BUILDER_EXTERNAL_SYSTEMS` document what the compiler computes (identity, levels, proficiencies, deterministic HP/AC/slots) versus what stays sheet-owned and is preserved from the base DTO (inventory, general spellbook/known/prepared curation, rolled HP and conditional combat tuning).
- **Lossy character→builder reconstruction.** When a builder DTO is unavailable, `reconstructBuilderDecisionsFromCharacter` rebuilds a resumable draft from the final character DTO; this is intentionally best-effort (records a load issue) since the final DTO does not preserve every authoring branch.
- **Builder DTO schema** is versioned as `BUILDER_SCHEMA_VERSION` (`"builder-decisions-v1"`); the level plan is always canonicalized (re-sorted, character/class levels recomputed) on every mutation.
