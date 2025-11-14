# Item Search Widget - Implementation Summary

## Problem
The Item Searcher page wasn't working in the published HTML because:
1. The `dataviewjs` code blocks from Obsidian don't execute in static HTML
2. The JavaScript files weren't being loaded/bundled into the published site
3. The widget depended on Obsidian's CustomJS plugin (`cJS()`) which doesn't exist in published HTML

## Solution
Created a **reusable, standalone system** that works in published HTML without Obsidian dependencies.

## What Was Created

### 1. Copied JavaScript Files to Published Site
**Location:** `docs/Assets/` and `docs/Assets/Items/`

- `common-lookup-styles.js` - Shared CSS styles for all lookup widgets
- `item-lookup.js` - Item card rendering logic (in Items/ subfolder)
- `item-search-widget.js` - Search functionality and fuzzy matching (in Items/ subfolder)

### 2. Created Standalone Loader Script
**File:** `docs/Assets/item-search-loader.js`

This script:
- Loads all dependencies dynamically (no Obsidian required)
- Implements a mock Dataview API for compatibility
- Includes CSV parsing (since we can't use Obsidian's `dv.io.csv()`)
- Automatically initializes all item search widgets on the page

### 3. Created Reusable HTML Include
**File:** `docs/Assets/item-search-widget.html`

A reusable component that can be included in any page with:
```html
<link itemprop="include" href="Assets/item-search-widget.html">
```

### 4. Copied Data Files
**Location:** `docs/Assets/Items/Items.csv`

The item database is now accessible from the published site.

### 5. Created Sync Script
**File:** `sync-assets.ps1`

PowerShell script to easily sync files from `Assets/` to `docs/`:
```powershell
.\sync-assets.ps1 -Items      # Sync just items
.\sync-assets.ps1 -All        # Sync everything
```

## How It Works

1. **Page loads** → The `loadIncludes()` function (already in your site) runs
2. **Include processed** → The `<link itemprop="include">` loads `item-search-widget.html`
3. **Widget HTML injected** → Search bar and container appear on page
4. **Loader script runs** → `item-search-loader.js` loads dependencies:
   - Loads `common-lookup-styles.js`
   - Loads `item-lookup.js`
   - Loads `item-search-widget.js`
   - Fetches `Items.csv` data
5. **Widget initialized** → Event listeners attached, ready to search!

## File Structure
```
Eldoria/
├── Assets/                          # Source files (Obsidian)
│   ├── common-lookup-styles.js
│   └── Items/
│       ├── item-lookup.js
│       ├── item-search-widget.js
│       └── Items.csv
│
├── docs/                            # Published site
│   └── Assets/
│       ├── common-lookup-styles.js          ← Copied
│       ├── item-search-loader.js            ← New (standalone)
│       ├── item-search-widget.html          ← New (reusable)
│       └── Items/
│           ├── item-lookup.js               ← Copied
│           ├── item-search-widget.js        ← Copied
│           └── Items.csv                    ← Copied
│
└── sync-assets.ps1                  # Automation script
```

## Using the Widget

### In New Pages
Add this line where you want the search widget:
```html
<link itemprop="include" href="Assets/item-search-widget.html">
```

### Updating Data/Code
When you modify files in `Assets/`, sync them to `docs/`:
```powershell
.\sync-assets.ps1 -Items
```

### Creating Similar Widgets
To create spell/feat/race search widgets:
1. Copy the pattern from `item-search-loader.js`
2. Create a new loader script (e.g., `spell-search-loader.js`)
3. Create a new HTML include (e.g., `spell-search-widget.html`)
4. Update `sync-assets.ps1` to include the new category

## Benefits
✅ **Reusable** - One line to add to any page  
✅ **No Obsidian dependency** - Works in static HTML  
✅ **Easy to maintain** - Sync script keeps files updated  
✅ **Extensible** - Can create similar widgets for spells, feats, etc.  
✅ **Performance** - Scripts load asynchronously  
✅ **Consistent** - Same widget works in Obsidian and published site  

## Testing
Open `docs/public/item-searcher.html` in a browser to verify:
1. Search bar appears
2. Typing shows matching items
3. Clicking items expands details
4. Fuzzy matching works
