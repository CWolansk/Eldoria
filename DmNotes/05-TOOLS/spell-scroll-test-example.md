# Spell Scroll Test Example

This note demonstrates the new spell scroll functionality in the Item Lookup Widget.

## Test Case 1: Basic Spell Scrolls with Pipe Separator

```dataviewjs
const {ItemLookup} = await cJS()

await ItemLookup.display(dv, [
    'Spell Scroll (3rd Level)|Fireball',
    'Spell Scroll (1st Level)|Magic Missile',
    'Spell Scroll (1st Level)|Cure Wounds'
])
```

## Test Case 2: Mixed Generic and Specific Scrolls

```dataviewjs
const {ItemLookup} = await cJS()

await ItemLookup.display(dv, [
    'Spell Scroll (1st Level)|Shield',
    'Spell Scroll (2nd Level)',  // Generic - no spell details
    'Spell Scroll (3rd Level)|Counterspell'
])
```

## Test Case 3: Mixed Items

```dataviewjs
const {ItemLookup} = await cJS()

await ItemLookup.display(dv, [
    'Bag of Holding',
    'Spell Scroll (3rd Level)|Fireball',
    'Potion of Healing',
    'Spell Scroll (1st Level)|Feather Fall',
    'Longsword'
])
```

## Test Case 4: From Frontmatter

---
loot:
  - Spell Scroll (3rd Level)|Lightning Bolt
  - Ring of Protection
  - Spell Scroll (3rd Level)|Dispel Magic
  - Cloak of Protection
  - Spell Scroll (2nd Level)
---

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, dv.current().loot)
```

## Expected Behavior

Each spell scroll with pipe separator should display:
1. The spell scroll item name with rarity badge (showing full name with pipe)
2. Standard spell scroll description (DC, attack bonus, etc.)
3. **A highlighted section** containing:
   - Spell name with 📜 icon
   - Spell level, school, casting time, and range
   - Components and duration
   - Full spell description
   - "At Higher Levels" text (if applicable)

Generic spell scrolls (without pipe) should display only the scroll description.

## Troubleshooting

If spell details don't appear:
- Verify you're using the pipe `|` character: `'Spell Scroll (3rd Level)|Fireball'`
- Verify `spell-lookup.js` exists in `Assets/Spells/`
- Check that the spell name matches exactly in `Spells.csv`
- Ensure `Spells.csv` is in the correct location
- Check browser console for error messages
