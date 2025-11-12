# Item Lookup Widget - Usage Examples

## Setup

The Item Lookup Widget is implemented as a CustomJS class that can be used in any Obsidian note with dataviewjs blocks.

### Prerequisites
1. Install the CustomJS plugin in Obsidian
2. Place `item-lookup.js` in the `Assets/` folder
3. Configure CustomJS to load scripts from the `Assets/` folder

---

## Basic Usage

### Display Items in a Note

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Longsword', 'Bag of Holding', '+1 Weapon'])
\`\`\`

This will create an interactive widget with expandable cards for each item found.

### Display Items from a Dataview Query

\`\`\`dataviewjs
const {ItemLookup} = await cJS()

// Get item names from current note's YAML frontmatter
const items = dv.current().items || []
await ItemLookup.display(dv, items)
\`\`\`

---

## Advanced Usage

### Get Raw Item Data

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
const lookup = new ItemLookup()

// Get item objects (pass dv to the method)
const items = await lookup.getItems(dv, ['Longsword', 'Shield'])

// Display as a table
dv.table(
    ['Name', 'Type', 'Rarity', 'Value'],
    items.map(item => [item.Name, item.Type, item.Rarity, item.Value])
)
\`\`\`

### Get HTML for Custom Rendering

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
const lookup = new ItemLookup()

// Get HTML string (pass dv to the method)
const html = await lookup.getHTML(dv, ['Bag of Holding', 'Rope of Climbing'])

// Render it
dv.paragraph(html)
\`\`\`

---

## Example: Session Loot

Create a note for session loot:

\`\`\`markdown
---
session: 42
items:
  - Longsword, +1
  - Potion of Healing
  - Bag of Holding
---

# Session 42 - Loot

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, dv.current().items)
\`\`\`
\`\`\`

---

## Example: NPC Inventory

\`\`\`markdown
---
npc: Merchant Bob
inventory:
  - Rope of Climbing
  - Potion of Greater Healing
  - Ring of Protection
---

# Merchant Bob's Shop

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, dv.current().inventory)
\`\`\`
\`\`\`

---

## Example: Character Equipment

\`\`\`markdown
---
character: Thorin
equipment:
  - Warhammer, +2
  - Plate Armor
  - Shield, +1
---

# Thorin's Equipment

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, dv.current().equipment)
\`\`\`
\`\`\`

---

## Spell Scrolls

### Display Spell Scrolls with Specific Spells

The Item Lookup Widget supports embedding spell details in spell scrolls using a pipe separator pattern:

\`\`\`dataviewjs
const {ItemLookup} = await cJS()

// Pattern: 'Spell Scroll (Level)|SpellName'
await ItemLookup.display(dv, [
    'Spell Scroll (1st Level)|Magic Missile',
    'Spell Scroll (2nd Level)|Invisibility',
    'Spell Scroll (3rd Level)|Fireball'
])
\`\`\`

**Important Notes:**
- Generic spell scrolls still work: `'Spell Scroll (1st Level)'` displays the standard scroll
- Add `|SpellName` to embed spell details: `'Spell Scroll (1st Level)|Magic Missile'`
- The spell scroll level and spell must match (e.g., don't use a 1st level scroll with Fireball)

The widget will automatically:
1. Detect the pipe separator pattern
2. Load the base spell scroll item (e.g., "Spell Scroll (3rd Level)")
3. Load the spell details from `Spells.csv`
4. Display the spell information embedded within the item card

### Example: Treasure Hoard with Spell Scrolls

\`\`\`markdown
---
treasure:
  - Bag of Holding
  - Spell Scroll (3rd Level)|Fireball
  - Potion of Greater Healing
  - Spell Scroll (3rd Level)|Counterspell
  - Spell Scroll (1st Level)
---

# Dragon's Hoard

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, dv.current().treasure)
\`\`\`
\`\`\`

This will display:
- Regular items normally
- Generic spell scrolls without spell details
- Specific spell scrolls with embedded spell details including level, school, components, casting time, and full description
- A visual separator with a scroll emoji 📜 to distinguish the spell details

---

## Features

- **Exact Name Matching**: Item names must match exactly (case-insensitive)
- **Spell Scroll Integration**: Use `'Spell Scroll (Level)|SpellName'` to embed spell details
- **Expandable Cards**: Click item names to reveal full details
- **Rarity Badges**: Color-coded badges for Common, Uncommon, Rare, Very Rare, and Legendary items
- **Theme Integration**: Uses Obsidian CSS variables to match your theme
- **Efficient Caching**: CSV data is loaded once and cached for the session

---

## Troubleshooting

### Items not found
- Check that item names match those in `Items.csv` (partial matches work)
- Verify the CSV file is in the correct location (`Assets/Items.csv`)

### Widget not appearing
- Ensure CustomJS plugin is installed and enabled
- Check that the script path is configured correctly in CustomJS settings
- Verify dataviewjs is installed and enabled

### Styling issues
- The widget uses Obsidian CSS variables and should adapt to your theme
- Custom CSS can be added to customize appearance further

