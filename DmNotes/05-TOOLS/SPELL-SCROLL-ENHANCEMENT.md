# Item Lookup Enhancement: Spell Scroll Integration

## Summary

Updated `item-lookup.js` to automatically detect and display spell details when looking up spell scrolls with specific spell names.

## Changes Made

### 1. Enhanced Constructor
- Added `spellLookup` property to cache the SpellLookup instance

### 2. New Method: `loadSpellLookup(dv)`
- Dynamically loads the `SpellLookup` class from `spell-lookup.js`
- Caches the instance for efficient reuse
- Handles errors gracefully

### 3. Enhanced `findItems()` Method
- Detects spell scroll patterns:
  - `"Spell Scroll (SpellName)"` - e.g., "Spell Scroll (Fireball)"
  - `"Spell Scroll of SpellName"` - e.g., "Spell Scroll of Lightning Bolt"
- Uses regex pattern matching: `/^spell scroll\s*(?:\(([^)]+)\)|of\s+(.+))$/i`
- Finds a generic spell scroll entry to use as template
- Creates a custom item with spell metadata markers

### 4. Updated `createItemsHTML()` Method
- Now accepts `dv` parameter and returns a Promise
- Uses `Promise.all()` to handle async spell lookups
- For spell scrolls with `_isSpellScroll` flag:
  - Loads the SpellLookup instance
  - Queries for the specified spell
  - Generates embedded spell details HTML
  - Includes styled section with:
    - 📜 emoji indicator
    - Spell name as heading
    - Spell metadata (level, school, casting time, range)
    - Components and duration
    - Full spell text
    - "At Higher Levels" information

### 5. Updated `display()` and `getHTML()` Methods
- Now properly await the async `createItemsHTML()` method
- Pass `dv` parameter through the call chain

## Usage

### Basic Example
```javascript
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, [
    'Spell Scroll (Fireball)',
    'Spell Scroll of Cure Wounds'
])
```

### In Frontmatter
```yaml
---
treasure:
  - Spell Scroll (Magic Missile)
  - Bag of Holding
  - Spell Scroll of Shield
---
```

```javascript
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, dv.current().treasure)
```

## Visual Design

Spell details are displayed in a distinct section with:
- Purple left border (`var(--color-purple)`)
- Background color matching Obsidian theme (`var(--background-primary)`)
- 📜 scroll emoji for quick visual identification
- Hierarchical information display
- Proper spacing and typography

## Dependencies

- Requires `spell-lookup.js` in `Assets/Spells/`
- Requires `Spells.csv` with spell data
- Works with existing `common-lookup-styles.js`

## Error Handling

- Gracefully handles missing spell-lookup.js
- Shows error message if spell not found
- Shows error message if spell lookup fails
- Continues to display other items even if one spell scroll fails

## Backward Compatibility

- All existing functionality preserved
- Regular items work exactly as before
- Generic spell scrolls (without spell name) still work
- No breaking changes to API

## Testing

A test file has been created at:
`DmNotes/05-TOOLS/spell-scroll-test-example.md`

This includes multiple test cases to verify the functionality.

## Documentation

Updated documentation files:
- `item-lookup-examples.md` - Added spell scroll section with examples
- `spell-scroll-test-example.md` - New comprehensive test cases

## Technical Notes

### Pattern Matching
The regex pattern matches both formats case-insensitively:
- Parentheses format: `Spell Scroll (SpellName)`
- Of format: `Spell Scroll of SpellName`

### Performance
- Spell lookups are done in parallel using `Promise.all()`
- SpellLookup instance is cached after first load
- CSV data is cached by both ItemLookup and SpellLookup classes

### Styling
Inline styles were used for the spell section to ensure it works regardless of theme, while still using CSS variables for consistency.
