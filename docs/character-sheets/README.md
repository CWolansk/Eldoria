# Character Sheets — D&D 5e character toolkit (v1)

This directory holds the Eldoria **character toolkit**: a no-build, vanilla-JavaScript (native ES modules) system for **building**, **displaying**, and **playing** D&D 5e characters in the browser. Everything ships as plain `.js`/`.css`/`.json` served statically — there is no bundler, transpiler, or framework.

The toolkit exposes a small page/API layer over two deeper apps and one shared core:

| Pillar | What it does | Public class / API | Docs |
| --- | --- | --- | --- |
| **Page API** | Loads current player/character DTOs, mounts sheet or builder HTML, exposes sheet changes and builder compile/export. | `EldoriaCharacters` | [v1/eldoria-characters.js](v1/eldoria-characters.js) |
| **Rules API** | Runtime sheet math and character-state changes without mounting UI. | `EldoriaCharacterRules` | [v1/character-rules.js](v1/character-rules.js) |
| **Builder** | Character **creation/progression** — level plan, ancestry/background/class, ASI/feats, spells, proficiency choices. Compiles authoring decisions into a final character DTO. | `CharacterBuilderApp` (low-level) | [v1/builder/README.md](v1/builder/README.md) |
| **Sheet** | Character **display/play** — loads a final DTO, runs all runtime math, renders an interactive (or read-only) sheet with HP, slots, rests, inventory, attacks, library. | `CharacterSheetApp` (low-level) + `renderCharacterSheet()` | [v1/sheet/README.md](v1/sheet/README.md) |
| **Shared core** | Canonical character data model, a runtime model wrapper, and the rules-catalog loader. Imported by **both** pillars; DOM- and framework-free. | `createEmptyCharacter` / `normalizeCharacter`, `CharacterModel`, `RulesCatalogLoader` | [v1/shared/README.md](v1/shared/README.md) |

## Folder map

```
character-sheets/
├── README.md         (this file)
└── v1/               The versioned toolkit (code + data + saved characters)
    ├── sheet.html            Reusable character sheet page (+ builder handoff)
    ├── sheet-boot.js         Thin boot loader for sheet.html
    ├── sheet-page.js         Compatibility alias for sheet-boot.js
    ├── builder.html          Reusable character builder page
    ├── builder-boot.js       Thin boot loader for builder.html / builder-preview.html
    ├── builder-preview.html  Compatibility builder page
    ├── builder-preview-page.js  Compatibility alias for builder-boot.js
    ├── eldoria-characters.js Public page API + global window.EldoriaCharacters
    ├── character-rules.js    Rules/change API + global window.EldoriaCharacterRules
    ├── shared/        Core: character-state, character-model, rules-catalog-loader  → README
    ├── builder/       CharacterBuilderApp + supporting modules + styles            → README
    ├── sheet/         CharacterSheetApp, read-only renderer, sheet-rules + styles  → README
    ├── data/          Generated rules catalog JSON + rules-manifest.json
    ├── characters/    Saved final character DTOs
    ├── builder-decisions/  Saved builder-decision DTOs (authoring state)
    └── players.json   Roster manifest (id → character/builder URLs)
```

> The v1 character/DTO schema reference is not currently present in this `docs/` tree.

> **Why `shared/builder/sheet/` instead of a flat `src/`?** These three folders were split out of a single `v1/src/` directory so the two apps and their common core are obviously separated. As part of that move the old, confusingly-generic `v1/src/app.js` (the read-only renderer) was renamed to [`v1/sheet/character-sheet-readonly-render.js`](v1/sheet/character-sheet-readonly-render.js).

## Simple public surface

### 1. Interactive sheet (play / edit a character)

Used by [v1/sheet.html](v1/sheet.html). The page loads [v1/sheet-boot.js](v1/sheet-boot.js), which fetches the current final character DTO from `players.json`/URL params and calls `EldoriaCharacters.mountSheet(...)`.

```js
import { loadCurrentCharacter, mountSheet } from "./v1/eldoria-characters.js";

const current = await loadCurrentCharacter({
  characterId: "char-claire-001",
  includeCharacterDto: true,
  includeBuilderDto: true
});

const sheet = mountSheet({
  mount: "#sheet-root",
  characterId: current.id,
  characterDto: current.characterDto,
  characterUrl: current.characterUrl,
  builderDto: current.builderDto,
  builderUrl: current.builderUrl,
  rulesCatalogBasePath: "./data/",
  persistenceMode: "export-only"
});

await sheet.ready;
sheet.apply("hp-damage", { amount: 5 });
```

### 2. Builder (create / level a character)

Used by [v1/builder.html](v1/builder.html). The page loads [v1/builder-boot.js](v1/builder-boot.js), which fetches the builder-decision DTO, final character DTO, and rules catalog path before mounting the builder.

```js
import { loadCurrentCharacter, mountBuilder } from "./v1/eldoria-characters.js";

const current = await loadCurrentCharacter({
  characterId: "char-claire-001",
  includeCharacterDto: true,
  includeBuilderDto: true
});

const builder = mountBuilder({
  mount: "#builder-root",
  characterId: current.id,
  characterDto: current.characterDto,
  builderDto: current.builderDto,
  rulesCatalogBasePath: "./data/",
  persistenceMode: "export-only"
});

await builder.ready;
```

## Entry points & consumers

| File | Imports from here | Purpose |
| --- | --- | --- |
| [v1/sheet.html](v1/sheet.html) → [v1/sheet-boot.js](v1/sheet-boot.js) | `eldoria-characters.js` | Canonical interactive sheet page with builder handoff. |
| [v1/builder.html](v1/builder.html) → [v1/builder-boot.js](v1/builder-boot.js) | `eldoria-characters.js` | Canonical reusable builder page. |
| [v1/builder-preview.html](v1/builder-preview.html) → [v1/builder-boot.js](v1/builder-boot.js) | `eldoria-characters.js` | Compatibility builder page. |
| [../players.html](../players.html) | `builder/character-builder-app.js`, `*/…styles.css` | Roster page; "Create Character" launches the builder. |

The 7 player pages under [../players/](../players/) link to `v1/sheet.html?character=<id>`; those URLs are unaffected by the internal reorganization. `v1/sheet.html` is the canonical player-facing entrypoint.

## Data & DTO flow

```
rules catalog (v1/data/*.json + rules-manifest.json)
        │  loaded by RulesCatalogLoader (shared/)
        ▼
Builder decisions DTO ──compiler──▶ Final character DTO ──▶ Sheet (display/play)
(v1/builder-decisions/)              (v1/characters/)
```

- The **builder** reads/writes a *builder-decisions* DTO (authoring state) and compiles it into a *final character* DTO.
- The **sheet** consumes the final DTO and runs all runtime math via `sheet/sheet-rules.js`.
- `players.json` maps each roster `id` to its `characterUrl` (+ optional `builderUrl`).
- The character/DTO shapes are defined by the current `v1` code and data files in this folder.

## Conventions

- **No build step.** Native ES modules loaded straight from disk. Every relative import must keep its explicit `.js` extension (e.g. `../shared/character-state.js`) — there is no resolver to add it or rewrite paths.
- **HTML entrypoints stay thin.** Page boot logic belongs in `sheet-boot.js` / `builder-boot.js`; reusable behavior belongs in `eldoria-characters.js` and `character-rules.js`.
- **One-way dependency.** `builder/` and `sheet/` import from `shared/`; `shared/` never imports back. The two pillars don't import each other except where `sheet.html` wires the builder in for handoff.
- **Runtime math lives in `sheet/sheet-rules.js`; build-time rule modeling lives in `builder/character-builder-rules.js`.** They are deliberately separate (display vs. construction) and share only constants/utilities from the core — see the pillar READMEs.
- **`v1/` is a schema-version boundary.** It bundles code with the data/fixtures/saved characters it understands (`rules-manifest.json` carries the schema version).
