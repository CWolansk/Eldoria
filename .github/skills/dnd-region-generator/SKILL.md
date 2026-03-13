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

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, read-aloud formatting, batch creation order, and conversion guidance.

## Before You Create

Always **search the vault first**:
1. List `Private/1. World Almanac/World/` to see all existing regions — avoid duplicates
2. Check if the proposed region name conflicts with or overlaps an existing one
3. Look at existing region files to match tone and structure

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
---

## Overview
> {2-3 sentences. What defines this region — geography, culture, and strategic importance. Use blockquote for read-aloud text.}

## History
{3-4 bullet points. Key events that shaped the region. Format: **Bold label.** One sentence.}

## Settlements
{Bullet list of [[Settlement Name]] — one-line description. Link to private settlement files.}

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

# Public Notes
[[Public/World/{Region Name}/{Region Name}|{Region Name}]]

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
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
---

## Overview
{2-3 sentences. What this region is and where it sits in the world.}

## Geography
{Short paragraph or bullets. Terrain, climate, notable landmarks.}

## Known Settlements
{Bullet list linking to public settlement pages.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

### Brevity
- **10-second scan rule.** Regions are broad strokes — set tone and context, don't detail every village.
- History: 3-4 bullets max. Key events only.
- Settlements and Factions: bullet lists with one-line descriptions.
- Use fragments. No prose paragraphs.

### Read-Aloud Text
The Overview section can double as read-aloud text when the party enters a new region. Use `>` blockquote formatting.

### General
- Settlements, NPCs, and groups within the region should have their own files.
- If the user mentions settlements or factions that don't exist yet, ask if you should create them.
- Public notes only link to public files. Private notes can link to anything.

## Converting Existing Regions

Some existing regions may use older formats or lack YAML frontmatter. When converting:

1. **Read both private and public files** before changing anything
2. **Map old metadata to YAML frontmatter** — region name, tags
3. **Preserve all wiki-links** — settlement links, faction links, location references
4. **Condense prose descriptions** into scannable bullets
5. **Rewrite public file** as standalone cartographer's reference
6. **For batch conversions** — list files first, confirm with user, convert one at a time
