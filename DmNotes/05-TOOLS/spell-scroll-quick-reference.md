# Spell Scroll Quick Reference

## Syntax

Use a pipe separator to specify which spell is on a spell scroll:

```
Spell Scroll (Level)|SpellName
```

**Examples:**
- `'Spell Scroll (1st Level)|Magic Missile'`
- `'Spell Scroll (3rd Level)|Fireball'`
- `'Spell Scroll (5th Level)|Cone of Cold'`

**Generic Scrolls (no spell details):**
- `'Spell Scroll (1st Level)'` - Shows just the scroll description
- `'Spell Scroll (3rd Level)'` - Shows just the scroll description

## Examples

```javascript
const {ItemLookup} = await cJS()

// Single spell scroll with spell details
await ItemLookup.display(dv, ['Spell Scroll (3rd Level)|Fireball'])

// Multiple spell scrolls
await ItemLookup.display(dv, [
    'Spell Scroll (1st Level)|Magic Missile',
    'Spell Scroll (2nd Level)|Invisibility',
    'Spell Scroll (3rd Level)|Fireball'
])

// Mixed with regular items and generic scrolls
await ItemLookup.display(dv, [
    'Bag of Holding',
    'Spell Scroll (1st Level)|Shield',
    'Potion of Healing',
    'Spell Scroll (2nd Level)'  // Generic - no spell details
])
```

## In YAML Frontmatter

```yaml
---
loot:
  - Spell Scroll (3rd Level)|Fireball
  - Spell Scroll (1st Level)|Shield
  - Potion of Greater Healing
  - Spell Scroll (2nd Level)
---
```

```javascript
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, dv.current().loot)
```

## Common Spell Scrolls

Quick copy-paste examples:

### Cantrips (use Spell Scroll (Cantrip)|SpellName)
- `'Spell Scroll (Cantrip)|Mage Hand'`
- `'Spell Scroll (Cantrip)|Prestidigitation'`
- `'Spell Scroll (Cantrip)|Light'`

### 1st Level
- `'Spell Scroll (1st Level)|Magic Missile'`
- `'Spell Scroll (1st Level)|Shield'`
- `'Spell Scroll (1st Level)|Cure Wounds'`
- `'Spell Scroll (1st Level)|Identify'`
- `'Spell Scroll (1st Level)|Detect Magic'`

### 2nd Level
- `'Spell Scroll (2nd Level)|Invisibility'`
- `'Spell Scroll (2nd Level)|Lesser Restoration'`
- `'Spell Scroll (2nd Level)|Misty Step'`
- `'Spell Scroll (2nd Level)|See Invisibility'`

### 3rd Level
- `'Spell Scroll (3rd Level)|Fireball'`
- `'Spell Scroll (3rd Level)|Lightning Bolt'`
- `'Spell Scroll (3rd Level)|Dispel Magic'`
- `'Spell Scroll (3rd Level)|Counterspell'`
- `'Spell Scroll (3rd Level)|Fly'`

### 4th Level
- `'Spell Scroll (4th Level)|Greater Invisibility'`
- `'Spell Scroll (4th Level)|Polymorph'`
- `'Spell Scroll (4th Level)|Dimension Door'`
- `'Spell Scroll (4th Level)|Banishment'`

### 5th Level
- `'Spell Scroll (5th Level)|Cone of Cold'`
- `'Spell Scroll (5th Level)|Wall of Force'`
- `'Spell Scroll (5th Level)|Teleportation Circle'`

## What Gets Displayed

For each spell scroll with pipe separator, you'll see:
1. **Item header** - Full name with rarity (e.g., "Spell Scroll (3rd Level)|Fireball")
2. **Item details** - Standard scroll information (DC, attack bonus, etc.)
3. **📜 Spell section** (highlighted) with:
   - Spell name
   - Level and school
   - Casting time and range
   - Components
   - Duration
   - Full description
   - Higher level effects

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Spell details not showing | Make sure you're using the pipe `\|` character |
| "Spell not found" error | Check spelling of spell name in Spells.csv |
| Wrong scroll level showing | Ensure base item name matches Items.csv exactly |
| Widget error | Ensure spell-lookup.js exists in Assets/Spells/ |
| Style issues | Check browser console for CSS errors |

## Tips

1. **Use pipe separator** - `'Spell Scroll (3rd Level)|Fireball'` not `'Spell Scroll (Fireball)'`
2. **Match scroll level to spell** - Use 3rd Level scroll for 3rd level spells
3. **Exact spelling matters** - "Fire Ball" won't work, use "Fireball"
4. **Case doesn't matter** - `'Spell Scroll (3rd Level)|FIREBALL'` works fine
5. **Generic scrolls still work** - `'Spell Scroll (1st Level)'` shows just the scroll
