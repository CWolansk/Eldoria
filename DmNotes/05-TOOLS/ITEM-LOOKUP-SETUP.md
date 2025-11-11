# Item Lookup Widget - Setup Guide

## What is this?

The Item Lookup Widget allows you to display D&D item information from your `Items.csv` file directly in your Obsidian notes using interactive, expandable cards.

## Installation

### 1. Install Required Plugins

In Obsidian, install these community plugins:
- **CustomJS** - Allows loading custom JavaScript classes
- **Dataview** - Required for dataviewjs code blocks

### 2. Configure CustomJS

1. Open Obsidian Settings
2. Go to CustomJS settings
3. Add the `Assets` folder to the scripts folder list
4. Restart Obsidian

### 3. Verify Files

Make sure these files exist:
- `Assets/Items.csv` - Your D&D items database
- `Assets/item-lookup.js` - The widget script (class-based for CustomJS)

## Quick Start

### Basic Usage

In any Obsidian note, add a dataviewjs block:

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Longsword', 'Bag of Holding', 'Potion of Healing'])
\`\`\`

### Using YAML Frontmatter

Add items to your note's frontmatter:

\`\`\`yaml
---
items:
  - Longsword, +1
  - Ring of Protection
  - Cloak of Elvenkind
---
\`\`\`

Then display them:

\`\`\`dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, dv.current().items)
\`\`\`

## How It Works

1. **Class-Based**: Compatible with CustomJS plugin requirements
2. **Async Loading**: CSV data loads once and is cached
3. **Partial Matching**: Searches for partial item names (e.g., "Sword" finds "Longsword, +1")
4. **Theme Aware**: Uses Obsidian CSS variables to match your theme
5. **Interactive**: Click item names to expand/collapse details

## Available Methods

### `display(dv, itemNames)`
Renders items directly in a dataviewjs block
- `dv` - The dataview API object (required for file access)
- `itemNames` - Array of item name strings

### `getHTML(dv, itemNames)`
Returns HTML string for custom rendering
- `dv` - The dataview API object (required for file access)
- `itemNames` - Array of item name strings
- Returns: Promise<string> with HTML

### `getItems(dv, itemNames)`
Returns raw item data objects
- `dv` - The dataview API object (required for file access)
- `itemNames` - Array of item name strings
- Returns: Promise<Array> with item objects

## Examples

See `item-lookup-examples.md` for:
- Session loot tracking
- NPC inventory
- Character equipment
- Custom table displays
- Advanced queries

## Features

✅ **Expandable Cards** - Click to show/hide full item details  
✅ **Rarity Badges** - Color-coded: Common, Uncommon, Rare, Very Rare, Legendary  
✅ **Exact Matching** - Names must match exactly (case-insensitive)  
✅ **Cached Data** - CSV loads once per session  
✅ **Theme Integration** - Automatically matches your Obsidian theme  

## Troubleshooting

### Items not appearing
- Verify CustomJS plugin is enabled
- Check that `Assets/item-lookup.js` exists
- Ensure `Assets/Items.csv` exists
- Try restarting Obsidian

### "cJS is not defined" error
- Install CustomJS plugin
- Configure CustomJS to load from `Assets` folder
- Restart Obsidian

### Styling looks wrong
- The widget uses Obsidian CSS variables
- Should automatically match your theme
- Try switching themes to see if it adapts

### Item names not found
- Check spelling in `Items.csv`
- Remember: partial matches work (e.g., "Sword" finds "Longsword")
- Names are case-insensitive

## Technical Details

### File Structure
- **Class**: `ItemLookup`
- **Location**: `Assets/item-lookup.js`
- **CSV Path**: `Assets/Items.csv` (loaded via `dv.io.csv()`)
- **File Access**: Uses Dataview API for vault file access

### CSV Format
Expected columns: Name, Source, Page, Rarity, Type, Attunement, Damage, Properties, Mastery, Weight, Value, Text

### Browser Compatibility
Works with Obsidian's built-in browser (Electron/Chromium)

---

For more examples and advanced usage, see: `item-lookup-examples.md`
