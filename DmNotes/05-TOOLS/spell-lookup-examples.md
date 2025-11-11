# Spell Lookup Widget - Usage Examples

## Setup

The Spell Lookup Widget is implemented as a CustomJS class that can be used in any Obsidian note with dataviewjs blocks.

### Prerequisites
1. Install the CustomJS plugin in Obsidian
2. Place `spell-lookup.js` in the `Assets/` folder
3. Configure CustomJS to load scripts from the `Assets/` folder

---

## Basic Usage

### Display Spells in a Note

\`\`\`dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Fireball', 'Magic Missile', 'Cure Wounds'])
\`\`\`

This will create an interactive widget with expandable cards for each spell found.

### Display Spells from a Dataview Query

\`\`\`dataviewjs
const {SpellLookup} = await cJS()

// Get spell names from current note's YAML frontmatter
const spells = dv.current().spells || []
await SpellLookup.display(dv, spells)
\`\`\`

---

## Advanced Usage

### Get Raw Spell Data

\`\`\`dataviewjs
const {SpellLookup} = await cJS()
const lookup = new SpellLookup()

// Get spell objects (pass dv to the method)
const spells = await lookup.getSpells(dv, ['Fireball', 'Shield'])

// Display as a table
dv.table(
    ['Name', 'Level', 'School', 'Casting Time'],
    spells.map(spell => [spell.Name, spell.Level, spell.School, spell['Casting Time']])
)
\`\`\`

### Get HTML for Custom Rendering

\`\`\`dataviewjs
const {SpellLookup} = await cJS()
const lookup = new SpellLookup()

// Get HTML string (pass dv to the method)
const html = await lookup.getHTML(dv, ['Wish', 'Power Word Kill'])

// Render it
dv.paragraph(html)
\`\`\`

---

## Example: Wizard Spellbook

Create a note for a wizard character:

\`\`\`markdown
---
character: Gandalf the Grey
spells:
  - Magic Missile
  - Shield
  - Fireball
  - Counterspell
  - Dimension Door
---

# Gandalf's Spellbook

\`\`\`dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, dv.current().spells)
\`\`\`
\`\`\`

---

## Example: Prepared Spells by Level

\`\`\`markdown
---
character: Cleric
level1:
  - Cure Wounds
  - Bless
  - Shield of Faith
level2:
  - Spiritual Weapon
  - Aid
level3:
  - Spirit Guardians
  - Revivify
---

# Today's Prepared Spells

## 1st Level
\`\`\`dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, dv.current().level1)
\`\`\`

## 2nd Level
\`\`\`dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, dv.current().level2)
\`\`\`

## 3rd Level
\`\`\`dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, dv.current().level3)
\`\`\`
\`\`\`

---

## Example: Encounter Spells

\`\`\`markdown
---
encounter: Dragon's Lair
enemy-spells:
  - Fireball
  - Counterspell
  - Wall of Force
  - Cone of Cold
---

# Dragon Spellcasting Abilities

\`\`\`dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, dv.current()['enemy-spells'])
\`\`\`
\`\`\`

---

## Example: Class Spell List

\`\`\`dataviewjs
const {SpellLookup} = await cJS()
const lookup = new SpellLookup()

// Get all spells and filter by class
const allSpells = await lookup.loadCSVData(dv)
const wizardCantrips = allSpells.filter(spell => 
    spell.Level === 'Cantrip' && 
    spell.Classes && spell.Classes.includes('Wizard')
).slice(0, 5)  // First 5 for example

await SpellLookup.display(dv, wizardCantrips.map(s => s.Name))
\`\`\`

---

## Features

- **Exact Name Matching**: Spell names must match exactly (case-insensitive)
- **Expandable Cards**: Click spell names to reveal full details
- **Level Badges**: Color-coded badges for Cantrip and levels 1-9
- **School Badges**: Shows spell school (Evocation, Abjuration, etc.)
- **At Higher Levels**: Displays upcast information when available
- **Theme Integration**: Uses Obsidian CSS variables to match your theme
- **Efficient Caching**: CSV data is loaded once and cached for the session

---

## Spell Information Displayed

- **Name & Level**: Spell name with color-coded level badge
- **School**: Spell school (Evocation, Conjuration, etc.)
- **Casting Time**: Action, Bonus Action, Reaction, etc.
- **Range**: Spell range
- **Duration**: How long the spell lasts
- **Components**: V, S, M requirements
- **Classes**: Which classes can learn this spell
- **Subclasses**: Which subclasses get access
- **Description**: Full spell text
- **At Higher Levels**: Upcast effects

---

## Troubleshooting

### Spells not found
- Check that spell names match those in `Spells.csv` exactly
- Verify the CSV file is in the correct location (`Assets/Spells.csv`)

### Widget not appearing
- Ensure CustomJS plugin is installed and enabled
- Check that the script path is configured correctly in CustomJS settings
- Verify dataviewjs is installed and enabled

### Styling issues
- The widget uses Obsidian CSS variables and should adapt to your theme
- Custom CSS can be added to customize appearance further
