# Race Lookup Usage Examples

The Race Lookup tool allows you to display D&D race information from the Races.csv database.

## Basic Usage

### Single Race (All Sources)

To find all versions of a race from any source, just use the race name:

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, ['Aasimar']);
```

This will show **all** Aasimar variants (DMG, MPMM, VGM).

### Specific Source Using Parentheses

To get a specific version from a particular source book:

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, ['Aasimar (MPMM)']);
```

**Note**: The tool is smart enough to distinguish between:
- `'Aasimar (MPMM)'` → race "Aasimar" from source "MPMM"
- `'Elf (High)'` → race literally named "Elf (High)" from any source

It recognizes official D&D source abbreviations automatically.

### Specific Source Using Pipe

Alternative syntax using the pipe character (always treated as source filter):

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, ['Aasimar|DMG']);
```

**Tip**: Use pipe syntax if you need to filter by source for races with parentheses in their name:
```dataviewjs
// Get Elf (High) from PHB specifically
const raceLookup = new RaceLookup();
await raceLookup.display(dv, ['Elf (High)|PHB']);
```

## Multiple Races

You can look up multiple races at once:

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, [
    'Aasimar (MPMM)',
    'Dragonborn (Chromatic)',
    'Half-Elf'
]);
```

## Common Source Abbreviations

- **PHB** - Player's Handbook
- **DMG** - Dungeon Master's Guide
- **MPMM** - Mordenkainen Presents: Monsters of the Multiverse
- **VGM** - Volo's Guide to Monsters
- **MTF** - Mordenkainen's Tome of Foes
- **SCAG** - Sword Coast Adventurer's Guide
- **ERLW** - Eberron: Rising from the Last War
- **FTD** - Fizban's Treasury of Dragons
- **TCE** - Tasha's Cauldron of Everything

## Examples by Race Type

### Elves

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, [
    'Elf (High)',
    'Elf (Wood)',
    'Elf (Drow)',
    'Elf (Eladrin)'
]);
```

### Dwarves

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, [
    'Dwarf (Hill)',
    'Dwarf (Mountain)',
    'Dwarf (Duergar)'
]);
```

### Dragonborn

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, [
    'Dragonborn (Chromatic)',
    'Dragonborn (Metallic)',
    'Dragonborn (Gem)'
]);
```

### Genasi

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, [
    'Genasi (Air)',
    'Genasi (Earth)',
    'Genasi (Fire)',
    'Genasi (Water)'
]);
```

## Finding Subraces

For races with multiple subraces, include the full name:

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, [
    'Aasimar (Fallen)',
    'Aasimar (Protector)',
    'Aasimar (Scourge)'
]);
```

## Character Creation Quick Reference

For building a specific character, pull just what you need:

```dataviewjs
const raceLookup = new RaceLookup();
await raceLookup.display(dv, ['Half-Elf (Variant; Drow Descent)']);
```

## Display Format

Each race displays:
- **Name** with source badge
- **Ability Scores** • **Size** • **Speed** (compact metadata)
- **Source** and page number
- **Complete description** with all racial traits:
  - Age
  - Alignment
  - Size details
  - Speed details
  - Special abilities
  - Languages
  - And more...

## Tips

1. **Case insensitive**: `'aasimar'` works the same as `'Aasimar'`
2. **Exact name required**: Must match the race name exactly (e.g., `'Half-Elf'` not `'Half Elf'`)
3. **Check source**: Some races appear in multiple books with different rules
4. **Use subraces**: For races like Elf or Dwarf, specify the subrace: `'Elf (High)'`
5. **Latest rules**: MPMM often has updated versions of races from earlier books
