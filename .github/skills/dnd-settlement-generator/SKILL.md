---
name: dnd-settlement-generator
description: >
  Generate towns and settlements for the Eldoria D&D campaign with paired private (DM) and public (player-facing) Obsidian markdown notes.
  Use this skill whenever the user wants to create a new town, village, city, hamlet, or settlement, populate a region with communities,
  flesh out a location the party is traveling to, or needs a place for NPCs to live.
  Also use when the user mentions creating a port town, frontier outpost, capital city, or any inhabited place — even if they don't say "settlement" explicitly.
---

# Eldoria Settlement Generator

Create towns and settlements as paired Obsidian markdown files: a **private DM note** with history, politics, and secrets, and a **public player note** written like a gazetteer or travel journal.

Settlements should be **sketched, not exhaustively detailed** — enough to run a session in, but with room to discover what the town becomes during play.

## What You Need From the User

At minimum: a **name** and a **region**. Everything else can be invented. Look for:

- Name
- Region (Crestfall, Ironpeak Mountains, Orcish Wastes, Silverleaf Lands, or new)
- Type (village, town, city, outpost, etc.)
- Vibe or concept ("fishing port", "dwarven mining town", "haunted crossroads")
- Key NPCs or shops that should exist there
- Any current events or conflicts

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for paired private/public files, frontmatter, tags, dataview blocks, the 10-second scan / brevity rule, read-aloud blockquotes, search-before-create, batch creation order, and old-format conversion. Only the settlement-specific details are below.

## Before You Create

Search the vault first (CONVENTIONS.md §7) — specifically check the target region folder under `Private/1. World Almanac/World/` for existing settlements.

## File Paths

```
Private/1. World Almanac/World/{Region}/{Settlement Name}/{Settlement Name}.md
Public/World/{Region}/{Settlement Name}/{Settlement Name}.md
```

Also create NPC and shop subdirectories as needed:
```
Private/1. World Almanac/World/{Region}/{Settlement Name}/NPCs/
Public/World/{Region}/{Settlement Name}/NPCs/
```

## Private Note (DM Version)

```markdown
---
type: Settlement
name: {Settlement Name}
region: {Region}
settlement_type: {Village/Town/City/Outpost}
population: {Approximate}
status: Active
tags:
  - Settlement
  - {Region}
  - {SettlementName}
---

![[Public/World/{Region}/{Settlement Name}/{Settlement Name}]]

## Notable NPCs
{Bullet list of [[NPC Name]] — one-line role description. Link to private NPC files.}

## Guilds & Politics
{Bullet list of power structures, factions, tensions. Keep it short — who has power, who wants it, who's losing it.}

## DM Notes
{Leave empty. DM fills this in during play.}

The following sections are **optional** — only include if the user specifies:

## Current Events
{What's happening right now that the party might walk into.}

## Secrets
{What the players don't know about this place.}

## Quest Hooks
{Open-ended threads, not scripts.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Public Note (Player Version)

Written like a gazetteer entry — factual, informative, no DM secrets.

```markdown
---
type: Settlement
name: {Settlement Name}
region: {Region}
settlement_type: {Village/Town/City/Outpost}
tags:
  - Settlement
  - {Region}
  - {SettlementName}
---

## Overview
{2-3 sentences. What the settlement is and where it sits.}

## Geography
{One short paragraph or bullet list. Physical setting, nearby landmarks.}

## Infrastructure
{Bullet list. Key buildings, defenses, notable structures.}

## Economy
{Bullet list. What drives the local economy.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
```

## Writing Guidelines

- Section limits: 2-4 bullets or 1-3 sentences per section. If it's longer, trim it.
- Don't catalog — curate. List what's interesting, not everything.
- Settlements exist to give NPCs a home and the party a place to visit — don't over-describe.
- NPCs and shops mentioned should link to their own files; if those files don't exist yet, **ask the user** if you should create them.

## Converting Existing Settlements

Convert old `::` files per CONVENTIONS.md §11. Settlement-specific field mapping:
- Old metadata → `population`, `government`, `settlement_type`, `region` in YAML frontmatter
- Trim descriptions to fragments — condense prose paragraphs into scannable bullets
- Rewrite the public file as a standalone gazetteer entry

## Cascading Creation

When creating a settlement, check if it needs supporting content:
- Does it have NPCs? Ask if you should create them.
- Does it have shops or taverns? Ask if you should create those.
- Does it belong to a region that doesn't exist yet? Ask if you should create the region.
- Does it have guilds or organizations? Ask if you should create those.
