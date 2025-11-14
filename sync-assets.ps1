# Sync Assets to Published Docs
# This script copies the necessary JavaScript and data files from Assets/ to docs/
# Run this after making changes to any lookup widgets or data files

param(
    [switch]$All,
    [switch]$Items,
    [switch]$Spells,
    [switch]$Races,
    [switch]$Feats,
    [switch]$Backgrounds
)

$sourceRoot = "Assets"
$destRoot = "docs"

Write-Host "=== Syncing Assets to Published Docs ===" -ForegroundColor Cyan

# Always sync common styles
Write-Host "`nSyncing common-lookup-styles.js..." -ForegroundColor Yellow
Copy-Item "$sourceRoot/common-lookup-styles.js" "$destRoot/Assets/" -Force
Write-Host "  ✓ Copied common-lookup-styles.js" -ForegroundColor Green

# Sync Items
if ($All -or $Items) {
    Write-Host "`nSyncing Items..." -ForegroundColor Yellow
    
    # Ensure directory exists (lowercase to match existing structure)
    New-Item -ItemType Directory -Force -Path "$destRoot/Assets/items" | Out-Null
    
    # Copy files
    Copy-Item "$sourceRoot/Items/item-lookup.js" "$destRoot/Assets/items/" -Force
    Copy-Item "$sourceRoot/Items/item-search-widget.js" "$destRoot/Assets/items/" -Force
    Copy-Item "$sourceRoot/Items/Items.csv" "$destRoot/Assets/items/items.csv" -Force
    
    Write-Host "  ✓ Copied item-lookup.js" -ForegroundColor Green
    Write-Host "  ✓ Copied item-search-widget.js" -ForegroundColor Green
    Write-Host "  ✓ Copied items.csv" -ForegroundColor Green
}

# Sync Spells
if ($All -or $Spells) {
    Write-Host "`nSyncing Spells..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "$destRoot/Assets/Spells" | Out-Null
    
    Copy-Item "$sourceRoot/Spells/spell-lookup.js" "$destRoot/site-lib/scripts/" -Force -ErrorAction SilentlyContinue
    Copy-Item "$sourceRoot/Spells/spell-search-widget.js" "$destRoot/site-lib/scripts/" -Force -ErrorAction SilentlyContinue
    Copy-Item "$sourceRoot/Spells/Spells.csv" "$destRoot/Assets/Spells/" -Force -ErrorAction SilentlyContinue
    
    Write-Host "  ✓ Copied spell files (if they exist)" -ForegroundColor Green
}

# Sync Races
if ($All -or $Races) {
    Write-Host "`nSyncing Races..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "$destRoot/Assets/Races" | Out-Null
    
    Copy-Item "$sourceRoot/Races/race-lookup.js" "$destRoot/site-lib/scripts/" -Force -ErrorAction SilentlyContinue
    Copy-Item "$sourceRoot/Races/race-search-widget.js" "$destRoot/site-lib/scripts/" -Force -ErrorAction SilentlyContinue
    Copy-Item "$sourceRoot/Races/Races.csv" "$destRoot/Assets/Races/" -Force -ErrorAction SilentlyContinue
    
    Write-Host "  ✓ Copied race files (if they exist)" -ForegroundColor Green
}

# Sync Feats
if ($All -or $Feats) {
    Write-Host "`nSyncing Feats..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "$destRoot/Assets/Feats" | Out-Null
    
    Copy-Item "$sourceRoot/Feats/feat-lookup.js" "$destRoot/site-lib/scripts/" -Force -ErrorAction SilentlyContinue
    Copy-Item "$sourceRoot/Feats/feat-search-widget.js" "$destRoot/site-lib/scripts/" -Force -ErrorAction SilentlyContinue
    Copy-Item "$sourceRoot/Feats/Feats.csv" "$destRoot/Assets/Feats/" -Force -ErrorAction SilentlyContinue
    
    Write-Host "  ✓ Copied feat files (if they exist)" -ForegroundColor Green
}

# Sync Backgrounds
if ($All -or $Backgrounds) {
    Write-Host "`nSyncing Backgrounds..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Force -Path "$destRoot/Assets/Backgrounds" | Out-Null
    
    Copy-Item "$sourceRoot/Backgrounds/background-lookup.js" "$destRoot/site-lib/scripts/" -Force -ErrorAction SilentlyContinue
    Copy-Item "$sourceRoot/Backgrounds/background-search-widget.js" "$destRoot/site-lib/scripts/" -Force -ErrorAction SilentlyContinue
    Copy-Item "$sourceRoot/Backgrounds/Backgrounds.csv" "$destRoot/Assets/Backgrounds/" -Force -ErrorAction SilentlyContinue
    
    Write-Host "  ✓ Copied background files (if they exist)" -ForegroundColor Green
}

if (-not ($All -or $Items -or $Spells -or $Races -or $Feats -or $Backgrounds)) {
    Write-Host "`nNo category specified. Use one of: -All, -Items, -Spells, -Races, -Feats, -Backgrounds" -ForegroundColor Red
    Write-Host "`nExample: .\sync-assets.ps1 -Items" -ForegroundColor Yellow
    Write-Host "Example: .\sync-assets.ps1 -All" -ForegroundColor Yellow
}

Write-Host "`n=== Sync Complete ===" -ForegroundColor Cyan
