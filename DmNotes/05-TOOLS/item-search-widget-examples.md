# Item Search Widget - Usage Examples

## Setup

The Item Search Widget provides an interactive search bar with fuzzy search capabilities for finding D&D items.

### Prerequisites
1. Install the CustomJS plugin in Obsidian
2. Place `item-search-widget.js` in the `Assets/Items/` folder
3. Ensure `Items.csv` is in the `Assets/Items/` folder
4. Configure CustomJS to load scripts from the `Assets/` folder

---

## Basic Usage

### Display Search Widget

```dataviewjs
const {ItemSearchWidget} = await cJS()
await ItemSearchWidget.display(dv)
```

This will create an interactive search bar where you can:
- Type any search term (e.g., "sword", "potion", "bag")
- Use fuzzy matching (e.g., "lng swd" will find "Longsword")
- View expandable cards for each item found
- Search through all items in the database

---

## Advanced Usage

### Display with Initial Search

```dataviewjs
const {ItemSearchWidget} = await cJS()
const widget = new ItemSearchWidget()
await widget.displayWithSearch(dv, 'potion')
```

This will display the search widget with "potion" pre-filled and search results already shown.

### Custom Container ID

```dataviewjs
const {ItemSearchWidget} = await cJS()
await ItemSearchWidget.display(dv, {
    containerId: 'my-custom-search'
})
```

Useful if you have multiple search widgets on the same page.

---

## Example: Weapons Search Page

Create a dedicated weapons search note:

```markdown
# Weapons Browser

Search for any weapon in the database:

```dataviewjs
const {ItemSearchWidget} = await cJS()
const widget = new ItemSearchWidget()
await widget.displayWithSearch(dv, 'sword')
```
```

---

## Example: Magic Items Finder

```markdown
# Magic Items Finder

Find magic items by name or type:

```dataviewjs
const {ItemSearchWidget} = await cJS()
await ItemSearchWidget.display(dv)
```

Try searching for:
- **Potions**: `potion`
- **Rings**: `ring`
- **Weapons**: `sword`, `bow`, `axe`
- **Armor**: `armor`, `shield`
- **Wondrous Items**: `bag`, `cloak`, `boots`
```

---

## Example: Shop Inventory Browser

```markdown
# Merchant's Inventory Browser

Browse available items:

```dataviewjs
const {ItemSearchWidget} = await cJS()
await ItemSearchWidget.display(dv)
```
```

---

## Fuzzy Search Examples

The search widget supports fuzzy matching, which means:

- **Exact match**: `"Bag of Holding"` → Highest priority
- **Starts with**: `"Bag"` → High priority
- **Contains**: `"of Hold"` → Medium priority
- **Fuzzy**: `"bghld"` → Low priority (all letters in order)

### Try These Searches:
- `sword` → Finds all swords (Longsword, Shortsword, etc.)
- `+1` → Finds all +1 items
- `potion heal` → Finds healing potions
- `bag` → Finds bags (Bag of Holding, etc.)
- `ring prot` → Finds Ring of Protection
- `cloak` → Finds all cloaks

---

## Features

- **Fuzzy Search**: Finds items even with partial or misspelled terms
- **Smart Ranking**: Exact matches appear first, followed by close matches
- **Real-time Search**: Search as you type (press Enter or click Search)
- **Clear Button**: Quickly clear search and start over
- **Item Count**: Shows how many items match your search
- **Expandable Cards**: Click any item name to see full details
- **Theme Integration**: Matches your Obsidian theme automatically

---

## Search Tips

1. **Start broad**: Begin with general terms like "sword" or "potion"
2. **Be specific**: Add modifiers like "+1", "rare", or "magic"
3. **Use partial names**: "long" will find "Longsword"
4. **Try abbreviations**: "pot heal" for "Potion of Healing"
5. **Mix and match**: Search works with any part of the item name

---

## Combining with Item Lookup

You can use both widgets in the same note:

```markdown
# My Equipment

## Quick Search
```dataviewjs
const {ItemSearchWidget} = await cJS()
await ItemSearchWidget.display(dv)
```

## Current Equipment
```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Longsword', 'Shield', 'Potion of Healing'])
```
```

---

## Troubleshooting

### Search widget not appearing
- Ensure CustomJS plugin is installed and enabled
- Check that `item-search-widget.js` is in `Assets/Items/` folder
- Verify `Items.csv` is in the correct location (`Assets/Items/Items.csv`)
- Make sure dataviewjs is installed and enabled

### No results found
- Try a simpler search term
- Check spelling (fuzzy search helps but isn't perfect)
- Verify `Items.csv` is in the correct location
- Ensure CSV data is properly formatted

### Styling issues
- The widget uses Obsidian CSS variables
- Should adapt to your theme automatically
- Can be customized with CSS snippets if needed

---

## Technical Notes

- Search runs on the client side (no external API calls)
- All items are loaded once and cached
- Supports searching through thousands of items
- Results are limited to top 50 matches for performance
- Search is case-insensitive
