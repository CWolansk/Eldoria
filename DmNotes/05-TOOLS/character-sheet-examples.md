# Character Sheet Examples

## Example 1: Full Interactive Character Sheet

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Gandalf the Grey",
  class: "Wizard",
  level: 5,
  race: "Human",
  str: 10,
  dex: 14,
  con: 12,
  int: 18,
  wis: 16,
  cha: 14,
  ac: 12,
  speed: 30,
  saves: ['int', 'wis'],
  skills: ['arcana', 'history', 'investigation', 'perception']
})
```

## Example 2: Compact Stat Block

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.displayCompact(dv, {
  name: "Aragorn",
  class: "Ranger",
  level: 8,
  race: "Human",
  str: 16,
  dex: 15,
  con: 14,
  int: 12,
  wis: 14,
  cha: 13,
  ac: 16,
  speed: 30
})
```

## Example 3: Quick Reference from Data

```dataviewjs
const {CharacterSheetDisplay} = await cJS()

// You could also load this from a YAML frontmatter or data file
const characterData = {
  name: "Legolas",
  class: "Fighter",
  level: 7,
  race: "Elf",
  str: 12,
  dex: 18,
  con: 13,
  int: 13,
  wis: 15,
  cha: 11,
  ac: 17,
  speed: 35,
  saves: ['str', 'con'],
  skills: ['acrobatics', 'athletics', 'perception', 'survival']
}

await CharacterSheetDisplay.displayCompact(dv, characterData)
```

## How to Use

### Full Sheet (Interactive)
- Shows all abilities, skills, saves
- Automatically calculates modifiers
- Interactive checkboxes for proficiencies
- Export button to save character data

### Compact Sheet (Display Only)
- Quick reference stat block
- Shows ability scores and modifiers
- Shows AC, Initiative, Speed, Proficiency Bonus
- Smaller footprint for quick reference

### Available Parameters

```javascript
{
  name: "Character Name",      // Character name
  class: "Class Name",          // Character class
  level: 1,                     // Character level (1-20)
  race: "Race",                 // Character race
  str: 10,                      // Strength score
  dex: 10,                      // Dexterity score
  con: 10,                      // Constitution score
  int: 10,                      // Intelligence score
  wis: 10,                      // Wisdom score
  cha: 10,                      // Charisma score
  ac: 10,                       // Armor Class
  speed: 30,                    // Speed in feet
  saves: ['str', 'con'],        // Proficient saving throws
  skills: ['athletics', ...]    // Proficient skills
}
```

### Available Skills

- acrobatics, animalHandling, arcana, athletics
- deception, history, insight, intimidation
- investigation, medicine, nature, perception
- performance, persuasion, religion, sleightOfHand
- stealth, survival
