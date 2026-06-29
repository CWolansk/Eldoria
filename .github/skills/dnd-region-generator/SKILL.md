---
name: dnd-region-generator
description: >
  Generate regions for the Eldoria D&D campaign with paired private (DM) and public (player-facing) Obsidian markdown notes.
  Use this skill whenever the user wants to create a new region, kingdom, territory, or large geographic area,
  expand the world map, or define the character of a broad area that contains multiple settlements.
  Also use when the user mentions creating a new land, continent section, biome, or named territory — even if they don't say "region" explicitly.
---

# Eldoria Region Generator

Create regions as paired Obsidian markdown files: a **private DM note** with lore, secrets, and political details, and a **public player note** written like a cartographer's reference.

Regions are the broadest organizational unit — they contain settlements, places of interest, and groups. Keep them high-level and evocative.

## What You Need From the User

At minimum: a **name** and a **general concept** (frozen wastes, volcanic archipelago, etc.). Look for:

- Name
- Geography/terrain type
- Known settlements within it
- Major factions or powers
- Tone (civilized, wild, war-torn, mysterious)

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for paired private/public files, frontmatter, tags, dataview blocks, the 10-second scan / brevity rule, read-aloud blockquotes, search-before-create, batch creation order, and old-format conversion. Only the region-specific details are below.

## Before You Create

Search the vault first (CONVENTIONS.md §7) — specifically list `Private/1. World Almanac/World/` (each top-level folder is a region) and check the proposed name doesn't conflict with or overlap an existing region.

## File Paths

```
Private/1. World Almanac/World/{Region Name}/{Region Name}.md
Public/World/{Region Name}/{Region Name}.md
```

Discover existing regions dynamically by listing `Private/1. World Almanac/World/`. Create new directories as needed.

## Private Note (DM Version)

```markdown
---
type: Region
name: {Region Name}
tags:
  - Region
  - {RegionName}
---

![[Public/World/{Region Name}/{Region Name}]]

## History
{3-4 bullet points. Key events that shaped the region. Format: **Bold label.** One sentence.}

## Settlements
{Bullet list with full private paths. Example:}
- [[Private/1. World Almanac/World/{Region}/{Settlement}/{Settlement}|{Settlement}]] — one-line description

## Factions & Powers
{Bullet list. Who holds power here, who's rising, who's falling.}

## DM Notes
{Leave empty. DM fills this in during play.}

The following sections are **optional** — only include if the user specifies:

## Secrets
{What's hidden about this region.}

## Current Events
{What's happening at the regional level right now.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Public Note (Player Version)

```markdown
---
type: Region
name: {Region Name}
tags:
  - Region
  - {RegionName}
---

## Overview
{2-3 sentences. What this region is and where it sits in the world.}

## Geography
{Short paragraph or bullets. Terrain, climate, notable landmarks.}

## Known Settlements
{Bullet list with full public paths. Example:}
- [[Public/World/{Region}/{Settlement}/{Settlement}|{Settlement}]] — one-line description

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Writing Guidelines

- Regions are broad strokes — set tone and context, don't detail every village.
- History: 3-4 bullets max. Key events only.
- Settlements and Factions: bullet lists with one-line descriptions.
- Settlements, NPCs, and groups within the region should have their own files.

## Converting Existing Regions

Convert old `::` files per CONVENTIONS.md §11. Region-specific field mapping:
- Old metadata → `name` and `tags` in YAML frontmatter
- Condense prose descriptions into scannable bullets
- Rewrite the public file as a standalone cartographer's reference

## Cascading Creation

When creating a region, check if it needs supporting content:
- Does it have settlements that need files? Ask if you should create them using the **dnd-settlement-generator** skill.
- Does it have factions or organizations? Ask if you should create them using the **dnd-group-generator** skill.
- Does it have notable locations (ruins, forests, landmarks)? Ask if you should create them using the **dnd-location-generator** skill.
