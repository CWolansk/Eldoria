# Monster System Guide

## Overview
The monster system provides searchable access to D&D 5e monsters with the ability to create custom monsters and save them locally.

## Features

### 🔍 Search Monsters
- **Search Monsters.md** - Full search interface with detailed results
- **Monster Searcher V2.md** - Quick search with compact results
- **Monster Searcher.md** - (Legacy version, use V2 instead)

### 📝 Create Custom Monsters
- **Create Monster.md** - Form to create custom monsters
- Saves to database and creates markdown notes automatically

### 🗂️ Monster Storage
- **Monster Compendium/** - Folder containing individual monster notes
- **Scripts/DND.db** - Database containing all monster data (1458+ monsters)

## How to Use

### Searching for Monsters
1. Open `Search Monsters.md` for detailed search
2. Use filters like:
   - Name, Size, Type, Alignment
   - Challenge Rating (supports fractions like 1/4, 1/2)
   - Environment, Damage types
   - Abilities (searches in traits and actions)
3. Results show summary tables and collapsible details
4. Click "Create [Monster Name]" to generate a note

### Creating Custom Monsters
1. Open `Create Monster.md`
2. Fill in the form (only Name is required)
3. Click "Save Custom Monster"
4. Monster is added to database and note is created

### Generated Monster Notes
- Automatically formatted with all monster stats
- Includes player linking buttons
- "Mentioned In" dataview section
- Stored in `Monster Compendium/`

## Database Structure
The Monsters table includes all standard D&D 5e monster statistics:

**Basic Info:** Name, Size, Type, Alignment, AC, HP, Speed, CR
**Abilities:** STR, DEX, CON, INT, WIS, CHA
**Defenses:** Saving Throws, Skills, Resistances, Immunities
**Senses:** Darkvision, Languages, etc.
**Combat:** Traits, Actions, Bonus Actions, Reactions, Legendary Actions
**Environment:** Habitat and Treasure information

## Files Created

```
Bestiary/
├── Search Monsters.md          # Main search interface
├── Monster Searcher V2.md      # Quick search
├── Create Monster.md           # Custom monster creator
└── Monster Compendium/         # Individual monster notes
    ├── Adult Black Dragon.md
    ├── Goblin.md
    └── [Custom Monster].md

Scripts/
├── ImportMonsters.py           # CSV import script
└── DBScriptsTesting/
    ├── CreateMonsterNote.js    # Generate monster notes
    ├── SaveCustomMonster.js    # Save custom monsters
    └── DND.db                  # Database with 1458+ monsters
```

## Integration
- Uses same database pattern as Items and Spells
- Compatible with existing metabind/js-engine setup
- Follows same markdown generation patterns
- Integrates with player linking system

## Data Source
Monster data imported from `Bestiary/Bestiary.csv` containing 1458 D&D 5e monsters with complete stat blocks.
