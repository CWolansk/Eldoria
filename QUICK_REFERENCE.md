# Quick Reference: Reusable Search Widgets

## Adding Item Search to Any Page

In your HTML file, add this where you want the search widget:
```html
<link itemprop="include" href="Assets/item-search-widget.html">
```

That's it! The widget will automatically load and initialize.

## Updating After Changes

When you modify JavaScript files or CSV data in `Assets/`:

```powershell
# Sync just items
.\sync-assets.ps1 -Items

# Or sync everything
.\sync-assets.ps1 -All
```

## Creating Other Search Widgets (Spells, Feats, etc.)

Follow this pattern for spells, feats, races, or backgrounds:

### Step 1: Copy Files
```powershell
Copy-Item "Assets/Spells/spell-lookup.js" "docs/Assets/Spells/"
Copy-Item "Assets/Spells/spell-search-widget.js" "docs/Assets/Spells/"
Copy-Item "Assets/Spells/Spells.csv" "docs/Assets/Spells/"
```

### Step 2: Create Loader Script
Create `docs/Assets/spell-search-loader.js` based on `item-search-loader.js`:

1. Copy `item-search-loader.js`
2. Rename to `spell-search-loader.js`
3. Replace all instances of:
   - `ItemSearchWidget` → `SpellSearchWidget`
   - `item-search` → `spell-search`
   - `Items/Items.csv` → `Spells/Spells.csv`
   - `Items/item-lookup.js` → `Spells/spell-lookup.js`

### Step 3: Create HTML Include
Create `docs/Assets/spell-search-widget.html`:

```html
<div class="spell-search-widget-container">
    <div class="spell-search-widget" id="spell-search-widget">
        <div class="spell-search-container">
            <div class="spell-search-input-wrapper">
                <input 
                    type="text" 
                    class="spell-search-input" 
                    placeholder="Search for spells..."
                    id="spell-search-widget-input"
                />
                <button class="spell-search-clear" id="spell-search-widget-clear">×</button>
                <button class="spell-search-button" id="spell-search-widget-button">Search</button>
            </div>
            <div class="spell-search-info">Loading spell database...</div>
        </div>
        <div class="spell-search-results" id="spell-search-widget-results"></div>
    </div>
</div>
<script src="Assets/common-lookup-styles.js"></script>
<script src="Assets/Spells/spell-lookup.js"></script>
<script src="Assets/Spells/spell-search-widget.js"></script>
<script src="Assets/spell-search-loader.js"></script>
```

### Step 4: Use It
In any page:
```html
<link itemprop="include" href="Assets/spell-search-widget.html">
```

## Troubleshooting

### Widget doesn't appear
- Check browser console (F12) for errors
- Verify files exist in `docs/Assets/`
- Verify CSV exists in `docs/Assets/[Category]/`

### Search doesn't work
- Check if CSV loaded (look in console for "loaded CSV")
- Verify CSV path in loader script matches actual file location

### Styles look wrong
- Ensure `common-lookup-styles.js` is copied to `docs/Assets/`
- Check that the loader script is loading the styles

## File Checklist

For each widget type, you need:
- [ ] Lookup script: `[type]-lookup.js` in `docs/Assets/[Type]/`
- [ ] Search widget: `[type]-search-widget.js` in `docs/Assets/[Type]/`
- [ ] Loader script: `[type]-search-loader.js` in `docs/Assets/`
- [ ] HTML include: `[type]-search-widget.html` in `docs/Assets/`
- [ ] CSV data: `[Type].csv` in `docs/Assets/[Type]/`
- [ ] Common styles: `common-lookup-styles.js` in `docs/Assets/` (shared)
