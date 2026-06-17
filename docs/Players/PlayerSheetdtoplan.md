# PlayerSheetDTO V2 Level Editor Implementation Plan

## Summary
Build the v2 character sheet around one saved `PlayerSheetDTO`. The level editor is the main authoring UI. Each phase adds one part of the editor, starting with base character choices, then Level 1, Level 2, and continuing through Level 20.

The sheet should update in real time from the DTO. The API stores only the DTO. Helpers compile the displayed character sheet from the DTO plus deployed API catalog records.

## Phase 1: Base DTO And Shared Helpers

Create the v2 DTO contract first.

Use `docs/Players/PlayerSheetDTO.json` as the example/template. It should contain:

- `schemaVersion: "player-sheet-v2"`
- `id`
- `lastModified`
- `identity`
- `baseChoices`
- `levels` with exactly 20 entries
- `combatState`
- `inventory`
- `spells`
- `resources`
- `notes`
- `metadata`

Rules:
- No local `.json` refs in the DTO.
- Use API identities like `id`, `name`, `source`, and `kind`.
- Future levels exist as skeleton entries.
- Non-ASI levels do not include `feat` or `AbilityScoreIncrease`.

Add shared helpers:

- `PlayerSheetDtoHelper`
  - create empty v2 DTO
  - normalize loaded DTO
  - guarantee 20 levels
  - patch nested DTO values
  - update `lastModified`

- `CatalogCache`
  - wraps API calls
  - caches by `kind + id`
  - caches by `kind + name + source`
  - exposes search methods for picker modals

- `SheetCompiler`
  - computes current level
  - computes proficiency bonus
  - computes ability scores/modifiers
  - computes max HP from `levels[].hp`
  - compiles saves, skills, attacks, features, spell slots, resources

Acceptance:
- Loading an empty or partial DTO produces a valid normalized DTO.
- `levels.length === 20` always.
- No sheet tab depends on builder DTO data.

## Phase 2: Base Level Editor Objects

Build the Base section of the level editor.

Base section fields:

- Identity
  - character name
  - player name
  - alignment
  - experience
  - portrait URL
  - inspiration

- Race
  - selected race identity from API
  - subrace if applicable
  - race-specific choices

- Background
  - selected background identity from API
  - background-specific choices

- Ability Scores
  - STR, DEX, CON, INT, WIS, CHA base scores

- Starting Proficiencies
  - skills
  - tools
  - languages

Base picker modals:
- Race picker
- Background picker
- Skill picker
- Tool picker
- Language picker

Modal layout:
- Search bar at the top
- Left pane: API-backed result list
- Right pane: selected result summary
- Select/apply button updates the DTO
- Cancel closes without changes

Acceptance:
- Editing base fields patches `baseChoices` or `identity`.
- Race/background search uses deployed API data.
- Selecting race/background refreshes relevant required choices.
- Sheet rerenders immediately after changes.

## Phase 3: Level 1 Editor

Build Level 1 as the first full level editor card.

Level 1 fields:

- Class picker
- Subclass picker if the selected class requires subclass at level 1
- HP field
- Level choices
- Starting class proficiencies
- Starting class equipment choices
- Starting spells/cantrips if class spellcasting starts at level 1

DTO shape for Level 1:

```json
{
  "characterLevel": 1,
  "class": {
    "id": "class:cleric:phb",
    "name": "Cleric",
    "source": "PHB",
    "classLevel": 1
  },
  "subclass": {
    "id": "subclass:cleric-tempest:phb",
    "name": "Tempest Domain",
    "source": "PHB"
  },
  "hp": 12,
  "choices": []
}
```

Implementation notes for junior dev:
- When class changes, load the class record from API.
- Use `hitDie`, `savingThrows`, `startingProficiencies`, `startingEquipment`, `spellcasting`, and `subclassUnlockLevel`.
- If `subclassUnlockLevel === 1`, show subclass picker.
- Do not hardcode class names or subclass lists.
- Patch `levels[0]`, then recompile the sheet.

Acceptance:
- Choosing a class fills Level 1 class data.
- If subclass is needed, subclass picker appears.
- HP contributes to max HP.
- Level 1 features appear in the rendered sheet.

## Phase 4: Level 2 Editor

Build Level 2 as the first repeated progression card.

Level 2 fields:

- Class picker
- HP field
- Subclass picker only if class unlocks subclass at class level 2
- Level choices from class features
- Spell/progression choices if applicable

Implementation notes:
- Calculate class level by counting prior levels with the same class id.
- If Level 1 is Cleric and Level 2 is Cleric, class level is 2.
- If Level 2 is a multiclass level, class level is 1 for that new class.
- Use the selected class API record to determine features at class level 2.

Acceptance:
- Level 2 can continue the same class or begin multiclassing.
- Class level is calculated correctly.
- Features and choices are derived from the API class record.
- Sheet rerenders after edits.

## Phase 5: Levels 3-20 Editor

Build the remaining levels using the same reusable `LevelEditorCard`.

Each level card should support:

- Class picker
- Subclass picker when class level reaches subclass unlock
- HP field
- Feature choices
- Spell choices
- Resource choices
- ASI/feat fields only on ASI levels

ASI-capable levels:
- 4
- 8
- 12
- 16
- 19

Only these level objects include:

```json
"feat": null,
"AbilityScoreIncrease": []
```

Example ASI level:

```json
{
  "characterLevel": 4,
  "class": {
    "id": "class:cleric:phb",
    "name": "Cleric",
    "source": "PHB",
    "classLevel": 4
  },
  "subclass": null,
  "hp": 6,
  "feat": {
    "id": "feat:elemental-adept:phb",
    "name": "Elemental Adept",
    "source": "PHB",
    "options": {
      "damageType": "Lightning"
    }
  },
  "AbilityScoreIncrease": ["STR", "STR"],
  "choices": []
}
```

Example non-ASI level:

```json
{
  "characterLevel": 5,
  "class": {
    "id": "class:cleric:phb",
    "name": "Cleric",
    "source": "PHB",
    "classLevel": 5
  },
  "subclass": null,
  "hp": 7,
  "choices": []
}
```

Future skeleton level:

```json
{
  "characterLevel": 6,
  "class": null,
  "subclass": null,
  "hp": 0,
  "choices": []
}
```

Acceptance:
- Every level from 1-20 renders.
- Future levels do not affect current character level.
- Level 5 does not show feat/ASI fields.
- Level 8, 12, 16, and 19 do show feat/ASI fields.
- Multiclass class levels compute correctly.

## Phase 6: Inventory And Gear Editor

Build inventory editing after levels are functional.

Inventory fields:

- currency
- item list
- equipped flag
- attuned flag
- quantity
- item source
- item snapshot

Item DTO shape:

```json
{
  "name": "+1 Warhammer",
  "source": "DMG",
  "quantity": 1,
  "equipped": true,
  "attuned": false,
  "catalog": {
    "kind": "items",
    "name": "+1 Warhammer",
    "source": "DMG",
    "baseItem": "warhammer|phb"
  },
  "snapshot": {
    "type": "M",
    "rarity": "uncommon",
    "weight": 2,
    "weapon": true,
    "weaponCategory": "martial",
    "property": ["V"],
    "dmg1": "1d8",
    "dmg2": "1d10",
    "dmgType": "B",
    "bonusWeapon": "+1",
    "value": 31500,
    "valueLabel": "315 gp",
    "_fProperties": ["Versatile"],
    "_typeListText": ["martial weapon", "melee weapon"],
    "_attunementCategory": "No Attunement Required"
  }
}
```

Item picker modal:
- Search API OData `items`
- Left pane shows matching item names/source/rarity
- Right pane shows damage, properties, value, attunement, description
- Selecting item stores `catalog` identity and useful `snapshot`

Acceptance:
- Gear tab renders without extra API calls when snapshots exist.
- Refreshing an item updates its snapshot from API.
- Equipped weapons produce attack cards.

## Phase 7: Save And Real-Time Update Flow

Wire the editor to the API.

Flow:
1. Page loads DTO with `api.getCharacterSheet(id)`.
2. Normalize DTO.
3. Compile DTO.
4. Render sheet and level editor.
5. User edits a field.
6. Patch in-memory DTO.
7. Recompile affected sections.
8. Rerender affected UI.
9. Debounce save with `api.saveCharacterSheet(id, dto)`.

Implementation notes:
- Use one in-memory `currentPlayerSheetDto`.
- Do not fetch builder data.
- Do not save partial compiled sheet data.
- Keep save status visible somewhere small.

Acceptance:
- Reload after save restores all editor values.
- Rapid edits debounce into fewer API calls.
- Failed save does not destroy local edits.

## Follow-Up Polish: Rich Picker Modals

After core editing works, polish picker modals.

Shared picker modal design:
- Header: title and search input
- Left pane: result list
- Right pane: selected result summary
- Footer: Apply, Cancel, Refresh
- Keyboard support:
  - Escape closes
  - Enter applies selected item
  - Arrow keys move through result list

Picker types:
- Race picker
- Background picker
- Class picker
- Subclass picker
- Feat picker
- Item picker
- Spell picker
- Skill/tool/language picker

Right-side summaries:
- Race: speed, size, traits, languages, choice prompts
- Background: proficiencies, feature, equipment, choice prompts
- Class: hit die, saves, starting proficiencies, subclass unlock, spellcasting
- Subclass: feature levels and summary
- Feat: prerequisites, ability options, custom options
- Item: damage, properties, value, rarity, attunement, description
- Spell: level, school, casting time, range, components, duration

Acceptance:
- All major editor pickers use the same modal component.
- Search calls are cached and debounced.
- Selecting from a modal patches the DTO consistently.
