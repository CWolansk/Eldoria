---
name: dnd-js-widgets
description: >
  Embed interactive JavaScript widgets in Obsidian notes for the Eldoria D&D campaign using
  the CustomJS plugin and the campaign's custom lookup/display scripts. Use this skill whenever
  the user wants to add a character sheet, spell list, item list, feat lookup, race lookup,
  background lookup, search widget, or interactive map to an Obsidian note. Also use when the
  user mentions embedding player stats, displaying equipment, looking up D&D data inline,
  adding a searchable spell/item/feat/race/background browser, creating or editing a player
  sheet, creating a map page, or any request involving the campaign's JavaScript tools —
  even if they don't say "widget" or "JavaScript" explicitly. Do NOT use for creating world
  content like NPCs, settlements, or stores (use the appropriate generator skill). Do NOT use
  for session logs or encounter building.
---

# Eldoria JavaScript Widgets

The Eldoria vault includes a library of custom JavaScript files that power interactive widgets inside Obsidian notes. These run via the **CustomJS** plugin (folder: `docs/Assets`) and the **Dataview** plugin's `dataviewjs` code blocks.

This skill documents every custom JS file, what it does, and exactly how to embed it in notes.

## Architecture Overview

```
docs/
├── Assets/
│   ├── character-sheet.js          # CharacterSheetDisplay — full & compact character sheets
│   ├── common-lookup-styles.js     # CommonLookupStyles — shared CSS for all lookup widgets
│   ├── Spells/
│   │   ├── spell-lookup.js         # SpellLookup — display spell cards by name
│   │   ├── spell-search-widget.js  # SpellSearchWidget — searchable spell browser
│   │   └── Spells.csv              # Spell data source
│   ├── Items/
│   │   ├── item-lookup.js          # ItemLookup — display item cards by name
│   │   ├── item-search-widget.js   # ItemSearchWidget — searchable item browser
│   │   └── Items.csv               # Item data source
│   ├── Races/
│   │   ├── race-lookup.js          # RaceLookup — display race cards by name
│   │   ├── race-search-widget.js   # RaceSearchWidget — searchable race browser
│   │   └── Races.csv               # Race data source
│   ├── Feats/
│   │   ├── feat-lookup.js          # FeatLookup — display feat cards by name
│   │   ├── feat-search-widget.js   # FeatSearchWidget — searchable feat browser
│   │   └── Feats.csv               # Feat data source
│   └── Backgrounds/
│       ├── background-lookup.js    # BackgroundLookup — display background cards by name
│       ├── background-search-widget.js  # BackgroundSearchWidget — searchable background browser
│       └── Backgrounds.csv         # Background data source
├── js/
│   └── map-logic.js                # Shared Leaflet map logic for interactive maps
├── server.js                       # Local Node server for map marker editing
├── generate-index.js               # Generates npc-index.json and location-index.json from Public/ HTML files
├── generate-jarvis-index.js        # Generates jarvis-index.json from the full vault for DM Jarvis dashboard
├── WorldMap.html                   # World map page using map-logic.js
├── MapTemplate.html                # Blank template for creating new map pages
├── dm-jarvis.html                  # DM Jarvis live dashboard (reads jarvis-index.json)
├── npc-reference.html              # Web-based NPC browser (reads npc-index.json)
└── location-reference.html         # Web-based location browser (reads location-index.json)
```

### How CustomJS Works

The **CustomJS** plugin is configured with `jsFolder: "docs/Assets"`. It recursively loads all `.js` files in that folder and makes their exported classes available via `await cJS()` inside `dataviewjs` blocks.

Each widget class is instantiated automatically by CustomJS. You destructure the class you need:

```js
const {ClassName} = await cJS()
```

### Data Sources

All lookup widgets load data from CSV files in their respective `docs/Assets/{Type}/` folders:
- `Spells.csv`, `Items.csv`, `Races.csv`, `Feats.csv`, `Backgrounds.csv`

The CSV files are loaded via Dataview's `dv.io.csv()` method at runtime. The widgets cache the data after first load.

---

## Widget Reference

### 1. CharacterSheetDisplay

**File:** `docs/Assets/character-sheet.js`
**Class:** `CharacterSheetDisplay`
**Purpose:** Renders a full interactive D&D 5e character stat sheet with ability scores, modifiers, saving throws, skills, combat stats, weapon attacks, and spellcasting — all auto-calculated.

#### Full Display

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Character Name",
  class: "Fighter",
  level: 5,
  race: "Human",
  background: "Soldier",
  str: 16,
  dex: 14,
  con: 14,
  int: 10,
  wis: 12,
  cha: 8,
  ac: 18,
  speed: 30,
  saves: ['str', 'con'],
  skills: ['athletics', 'intimidation', 'perception', 'survival'],
  simpleWeapons: true,
  martialWeapons: true,
  spellcasting: false
})
```

#### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Character name |
| `class` | string | yes | Character class |
| `level` | number | yes | Character level (drives proficiency bonus) |
| `race` | string | yes | Character race |
| `background` | string | no | Background name |
| `str/dex/con/int/wis/cha` | number | yes | Ability scores (raw values, modifiers auto-calculated) |
| `ac` | number | yes | Armor class |
| `speed` | number | yes | Movement speed in feet |
| `saves` | string[] | yes | Proficient saving throws (lowercase ability abbreviations) |
| `skills` | string[] | yes | Proficient skills (camelCase: `sleightOfHand`, `animalHandling`) |
| `simpleWeapons` | boolean | yes | Whether proficient with simple weapons |
| `martialWeapons` | boolean | yes | Whether proficient with martial weapons |
| `spellcasting` | string/false | yes | Spellcasting ability (`'int'`, `'wis'`, `'cha'`) or `false` for none |

#### Optional Parameters (sections appear only when set)

| Parameter | Type | Description |
|---|---|---|
| `experience` | number | Experience points |
| `guildRank` | string | Guild rank display |
| `guildPoints` | number | Guild points |
| `showHitPoints` | boolean | Show HP section |
| `maxHp` / `currentHp` / `tempHp` | number | HP values (requires `showHitPoints: true`) |
| `hitDice` | string | Hit dice display (e.g., `"5d10"`) |
| `showResources` | boolean | Show resources section |
| `resources` | array | `[{name: 'Ki Points', current: 5, max: 5}]` |

#### Dynamic Level from Player Controls

Player sheets pull level from a shared "Player Controls" note:

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Claire",
  class: "Cleric",
  level: dv.page("Player Controls").level,
  experience: dv.page("Player Controls").ExperiencePoints,
  guildPoints: dv.page("Player Controls").GuildPoints,
  guildRank: dv.page("Player Controls").GuildRank,
  // ... rest of stats
})
```

#### Compact Display

A smaller inline version for quick reference:

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.displayCompact(dv, {
  name: "Claire",
  class: "Cleric",
  level: 5,
  race: "Water Genasi",
  str: 16, dex: 8, con: 16, int: 14, wis: 18, cha: 12,
  ac: 18, speed: 30,
  saves: ['wis', 'cha'],
  skills: ['insight', 'medicine', 'perception', 'persuasion', 'religion'],
  spellcasting: 'wis',
  simpleWeapons: true,
  martialWeapons: true
})
```

#### Valid Skill IDs

Use these camelCase identifiers in the `skills` array:

`acrobatics`, `animalHandling`, `arcana`, `athletics`, `deception`, `history`, `insight`, `intimidation`, `investigation`, `medicine`, `nature`, `perception`, `performance`, `persuasion`, `religion`, `sleightOfHand`, `stealth`, `survival`

---

### 2. SpellLookup

**File:** `docs/Assets/Spells/spell-lookup.js`
**Class:** `SpellLookup`
**Purpose:** Displays expandable spell cards with full details (school, level, casting time, range, components, duration, description, higher levels). Loads from `Spells.csv`.

```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Fireball', 'Magic Missile', 'Cure Wounds'])
```

Pass an array of spell names. Each renders as a collapsible card with color-coded level badges. Names must match the CSV data (case-insensitive matching is built in).

Pass an empty array `[]` to display nothing (useful as a placeholder).

---

### 3. SpellSearchWidget

**File:** `docs/Assets/Spells/spell-search-widget.js`
**Class:** `SpellSearchWidget`
**Purpose:** Renders a search bar with fuzzy search across all spells in the CSV. Results display as the same spell cards from SpellLookup.

```dataviewjs
const {SpellSearchWidget} = await cJS()
await SpellSearchWidget.display(dv)
```

No parameters needed — it provides a full search UI.

---

### 4. ItemLookup

**File:** `docs/Assets/Items/item-lookup.js`
**Class:** `ItemLookup`
**Purpose:** Displays expandable item cards with rarity, type, weight, attunement, and description. Color-coded by rarity (Common through Legendary). Loads from `Items.csv`.

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Longsword', 'Bag of Holding', '+1 Weapon'])
```

#### Special Syntax — Item with Context Name

Use `pipe` syntax to search by a different name than displayed:

```
'Spell Scroll (1st Level)|Burning Hands'
```

This searches the CSV for "Spell Scroll (1st Level)" and displays it. The pipe portion provides additional context.

---

### 5. ItemSearchWidget

**File:** `docs/Assets/Items/item-search-widget.js`
**Class:** `ItemSearchWidget`
**Purpose:** Searchable item browser with fuzzy search across all items in the CSV.

```dataviewjs
const {ItemSearchWidget} = await cJS()
await ItemSearchWidget.display(dv)
```

---

### 6. RaceLookup

**File:** `docs/Assets/Races/race-lookup.js`
**Class:** `RaceLookup`
**Purpose:** Displays expandable race cards with traits, ability score increases, size, speed, and description. Loads from `Races.csv`.

```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Genasi (Water)', 'Half-Elf'])
```

Race names must match CSV format — subraces use parenthetical notation: `'Genasi (Water)'`, `'Elf (High)'`.

---

### 7. RaceSearchWidget

**File:** `docs/Assets/Races/race-search-widget.js`
**Class:** `RaceSearchWidget`
**Purpose:** Searchable race browser with fuzzy search.

```dataviewjs
const {RaceSearchWidget} = await cJS()
await RaceSearchWidget.display(dv)
```

---

### 8. FeatLookup

**File:** `docs/Assets/Feats/feat-lookup.js`
**Class:** `FeatLookup`
**Purpose:** Displays expandable feat cards with prerequisites, description, and source. Loads from `Feats.csv`.

```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, ['Alert', 'Lucky', 'War Caster'])
```

---

### 9. FeatSearchWidget

**File:** `docs/Assets/Feats/feat-search-widget.js`
**Class:** `FeatSearchWidget`
**Purpose:** Searchable feat browser with fuzzy search.

```dataviewjs
const {FeatSearchWidget} = await cJS()
await FeatSearchWidget.display(dv)
```

---

### 10. BackgroundLookup

**File:** `docs/Assets/Backgrounds/background-lookup.js`
**Class:** `BackgroundLookup`
**Purpose:** Displays expandable background cards with skill proficiencies, tool proficiencies, languages, equipment, and feature description. Loads from `Backgrounds.csv`.

```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['Sailor', 'Noble', 'Acolyte'])
```

---

### 11. BackgroundSearchWidget

**File:** `docs/Assets/Backgrounds/background-search-widget.js`
**Class:** `BackgroundSearchWidget`
**Purpose:** Searchable background browser with fuzzy search.

```dataviewjs
const {BackgroundSearchWidget} = await cJS()
await BackgroundSearchWidget.display(dv)
```

---

### 12. CommonLookupStyles

**File:** `docs/Assets/common-lookup-styles.js`
**Class:** `CommonLookupStyles` (on `window`)
**Purpose:** Shared CSS factory used internally by all lookup widgets. Provides `getBaseStyles()`, `getSpellLevelStyles()`, `getItemRarityStyles()`, and `injectStyles()` methods. **You never call this directly** — the lookup widgets load it automatically.

---

## Interactive Maps

Maps are standalone HTML pages in `docs/` that use **Leaflet.js** and the shared `docs/js/map-logic.js`.

### How Maps Work

1. An HTML page loads Leaflet, includes `js/map-logic.js`, and calls `initMap()` with an image path and markers array.
2. Each marker has: `name`, `position` (as `[y%, x%]` of image dimensions, 0-1 range), `link` (path to an HTML file in `Public/`), and `description`.
3. The map supports **Shift+Click** to add markers interactively (requires the Node server running).

### WorldMap.html

The main world map. Markers correspond to settlements and landmarks with links to public HTML exports.

### MapTemplate.html

A blank template for creating new regional/area maps:

```html
<script src="js/map-logic.js"></script>
<script>
    const markers = [
        {
            name: "Location Name",
            position: [0.500, 0.500],  // [y%, x%] of image
            link: "Public/World/Region/Settlement/Settlement.html",
            description: "Brief description"
        },
        // Add more markers here
    ];

    initMap({
        imagePath: './Assets/YourMapImage.jpg',
        markers: markers
    });
</script>
```

To create a new map page: copy `MapTemplate.html`, rename it, set the `imagePath` to the map image, and populate the markers array.

### Map Marker Server

`docs/server.js` runs a local Node.js HTTP server on port 8086 that:
- Serves all files under `docs/` as static content
- Provides `POST /api/markers` to add markers to a map HTML file
- Provides `DELETE /api/markers` to remove markers from a map HTML file

Start it with:
```bash
cd docs
node server.js
```

Then open `http://localhost:8086/WorldMap.html`. **Shift+Click** on the map to add a marker interactively.

---

## Index Generators (Node.js CLI Scripts)

These are run from the command line, not embedded in notes.

### generate-index.js

Scans `docs/Public/World/` for exported HTML files and generates:
- `npc-index.json` — NPCs organized by region and settlement
- `location-index.json` — Settlements and locations organized by region

Used by `npc-reference.html` and `location-reference.html` for web-based browsing.

```bash
cd docs
node generate-index.js
```

Run this after adding new HTML exports to `docs/Public/`.

### generate-jarvis-index.js

Scans the entire vault (both `Private/` and `Public/`) and generates `jarvis-index.json` — a comprehensive entity index with frontmatter metadata, summaries, wiki-link mentions, and full markdown bodies.

Used by `dm-jarvis.html` for the DM Jarvis live dashboard.

```bash
cd docs
node generate-jarvis-index.js
```

Run this after significant vault changes to keep the dashboard current.

---

## Web Dashboards (HTML Pages)

These are standalone HTML pages, not Obsidian notes. They're accessed via browser or embedded in Obsidian using the **Custom Frames** plugin.

### dm-jarvis.html
Full-featured DM dashboard with entity search, filtering by type, and detailed entity views. Reads `jarvis-index.json`.

### npc-reference.html
Player-facing NPC browser. Search and browse NPCs by region and settlement. Reads `npc-index.json`.

### location-reference.html
Player-facing location browser. Search and browse locations by region. Reads `location-index.json`.

### Embedding Web Pages in Notes

The **Custom Frames** plugin allows embedding external URLs or local server pages directly in Obsidian notes:

```custom-frames
frame: FrameName
style: height: 1000px;
```

Or with URL suffix for deep-linking:
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #cleric_phb,state:sub_tempest_phb=b1
```

Frame names must be pre-configured in the Custom Frames plugin settings.

---

## Standard Player Sheet Pattern

Player sheets in `Public/Players/` follow a consistent structure using these widgets. Here's the complete pattern:

```markdown
## Character Stats

\```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "CharacterName",
  class: "Class",
  level: dv.page("Player Controls").level,
  race: "Race",
  background: "Background",
  experience: dv.page("Player Controls").ExperiencePoints,
  guildPoints: dv.page("Player Controls").GuildPoints,
  guildRank: dv.page("Player Controls").GuildRank,
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  ac: 10,
  speed: 30,
  saves: ['ability1', 'ability2'],
  skills: ['skill1', 'skill2'],
  spellcasting: 'ability',  // or false
  simpleWeapons: true,
  martialWeapons: false
})
\```

## Equipment

\```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, [
    'Longsword',
    'Shield',
    'Chain Mail',
])
\```

## Spells (if spellcaster)

\```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Spell Name 1', 'Spell Name 2'])
\```

## Background

\```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['BackgroundName'])
\```

## Feats

\```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, ['Feat1', 'Feat2'])
\```

## Race

\```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Race (Subrace)'])
\```

## Notes
Direct link if Embed isn't working : https://...
\```custom-frames
frame: PlayerNotesFrame
style: height: 1000px;
\```

## Full Class Info
\```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #class_source
\```
```

**Note:** The backslashes before triple-backticks above are escape notation for this skill document. In actual notes, use plain triple-backticks.

---

## When to Use Which Widget

| Want to... | Use |
|---|---|
| Show a player's full stat sheet | `CharacterSheetDisplay.display()` |
| Show a compact stat summary | `CharacterSheetDisplay.displayCompact()` |
| List specific spells by name | `SpellLookup.display(dv, [...names])` |
| Browse/search all spells | `SpellSearchWidget.display(dv)` |
| List specific items/equipment | `ItemLookup.display(dv, [...names])` |
| Browse/search all items | `ItemSearchWidget.display(dv)` |
| Show specific race info | `RaceLookup.display(dv, [...names])` |
| Browse/search all races | `RaceSearchWidget.display(dv)` |
| Show specific feat info | `FeatLookup.display(dv, [...names])` |
| Browse/search all feats | `FeatSearchWidget.display(dv)` |
| Show specific background info | `BackgroundLookup.display(dv, [...names])` |
| Browse/search all backgrounds | `BackgroundSearchWidget.display(dv)` |
| Create a new interactive map | Copy `MapTemplate.html`, configure image + markers |
| Add markers to existing map | Run `server.js`, Shift+Click on map |
| Regenerate NPC/location indexes | Run `node generate-index.js` |
| Regenerate full vault index | Run `node generate-jarvis-index.js` |
| Embed a web dashboard in a note | Use `custom-frames` code block |

---

## Troubleshooting

- **Widget shows nothing / error:** Check that the CustomJS plugin is enabled and `jsFolder` is set to `docs/Assets` in its settings.
- **Lookup returns no results:** Verify the item/spell/feat name matches the CSV data exactly (check the relevant CSV file).
- **Map markers not saving:** Ensure `node server.js` is running in the `docs/` directory.
- **Styles look wrong:** The widgets use Obsidian CSS variables (`--font-text`, `--background-secondary`, etc.) and auto-adapt to light/dark themes.
- **"Player Controls" errors:** The character sheet pulls dynamic level/XP from a note called "Player Controls" — make sure it exists with `level`, `ExperiencePoints`, `GuildPoints`, and `GuildRank` frontmatter fields.
