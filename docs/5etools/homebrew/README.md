# Homebrew Content - Static Files

This directory contains statically served homebrew content for 5etools.

## Overview

Previously, the homebrew content was loaded dynamically from GitHub URLs. Now all homebrew JSON files are downloaded and served locally for better performance and reliability.

## Current Files

The following homebrew collections are included:
- **Kobold Press**: Book of Ebon Tides, Tales from the Shadows
- **MCDM Productions**: Flee, Mortals!, Where Evil Lives
- **Ghostfire Gaming**: Grim Hollow - Player Pack
- **Griffin Macaulay**: The Griffon's Saddlebag, Book 2
- **Magic Item Collections**: Sane Magic Item Prices (Saidoro & Giddy), Common Magic Items (Aofhaocv), Armour, Items, and Weapons Galore (Foxfire94)
- **SailorCat**: GachaBox

## Updating Homebrew Content

### Checking for Updates

To check if any homebrew files have been updated on GitHub:
```bash
node check-updates.js
```

This will compare your local files with the remote versions and report any differences.

### Downloading Updates

To update the homebrew content or add new sources:

1. If you want to add new content from GitHub, edit `index.json` and add the GitHub raw URL to the `toImport` array
2. Run the download script:
   ```bash
   node download-homebrew.js
   # or
   npm run update-homebrew
   ```
3. The script will:
   - Download all remote files from URLs in `toImport`
   - Save them locally with appropriate filenames
   - Update `index.json` to reference the local files

## Manual Updates

To manually update a specific homebrew file:
1. Download the JSON file from its source
2. Save it in this directory with the same naming pattern: `Author; Title.json`
3. Add the filename to the `toImport` array in `index.json`

## Benefits of Static Files

- **Faster Loading**: No external HTTP requests needed
- **Offline Support**: Works without internet connection
- **Reliability**: No dependency on external servers being available
- **Version Control**: Content is versioned with your repository

## Notes

- All files are in JSON format and follow the 5etools homebrew schema
- The semicolon naming convention (`;`) is used to separate author from title
- Files are automatically validated as valid JSON during download
