# Eldoria Campaign Hub

A dynamic web-based hub for managing your D&D Eldoria campaign.

## Features

- 📊 Player character sheets
- 🗺️ Interactive world map
- 🧙‍♂️ Dynamic NPC reference (auto-updated)
- 🏰 Dynamic location reference (auto-updated)
- ⚔️ Character creation tools (backgrounds, races, feats)
- 📚 Game resources (spells, items, 5etools integration)

## Setup

1. Make sure you have Node.js installed
2. Navigate to the `docs` folder
3. Run the index generator:

```bash
node generate-index.js
```

Or use npm:

```bash
npm run generate-index
```

## Adding New Content

### Adding NPCs

1. Create a new HTML file in the appropriate location:
   ```
   Public/World/[Region]/[Location]/NPCs/[NPC Name].html
   ```

2. Run the index generator:
   ```bash
   node generate-index.js
   ```

3. Refresh your browser - the new NPC will appear automatically!

### Adding Locations

1. Create a new folder and HTML file:
   ```
   Public/World/[Region]/[New Location]/[New Location].html
   ```

2. Add any sub-locations (shops, landmarks) as additional HTML files in the same folder

3. Run the index generator:
   ```bash
   node generate-index.js
   ```

4. Refresh your browser - the new location will appear automatically!

## File Structure

```
docs/
├── index.html                  # Main campaign hub
├── npc-reference.html         # NPC browser (loads npc-index.json)
├── location-reference.html    # Location browser (loads location-index.json)
├── generate-index.js          # Auto-generates JSON indices
├── npc-index.json            # Auto-generated NPC index
├── location-index.json       # Auto-generated location index
└── Public/
    ├── Players/              # Character sheets
    └── World/                # Campaign world content
        ├── Crestfall/
        ├── Ironpeak Mountains/
        ├── Silverleaf Lands/
        ├── Orcish Wastes/
        └── Groups/
```

## Automation

The `generate-index.js` script automatically:
- Scans the `Public/World` directory recursively
- Finds all NPC HTML files in `NPCs/` folders
- Finds all location HTML files and their sub-locations
- Generates `npc-index.json` and `location-index.json`
- Organizes everything by region and location

**You only need to run this script after adding new files!**

## Opening the Hub

Simply open `index.html` in your web browser. For best results, use a local web server:

```bash
# Python 3
python -m http.server 8000

# Node.js (install http-server globally)
npx http-server
```

Then navigate to `http://localhost:8000`
