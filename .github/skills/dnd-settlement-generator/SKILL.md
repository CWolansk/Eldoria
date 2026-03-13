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

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, read-aloud formatting, batch creation order, and conversion guidance.

## Before You Create

Always **search the vault first**:
1. Search `Private/1. World Almanac/World/` to discover existing regions (each top-level folder is a region)
2. Search within the target region for existing settlements — avoid duplicates
3. Look at neighboring settlement files to match tone and detail level
4. Check if related NPCs, shops, or groups already exist

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
---

## Overview
> {2-3 sentences. What is this place and why does it matter? What's the first thing a DM needs to know? Use blockquote for read-aloud text.}

## History
{3-4 bullet points. Key founding moments and events that shaped the settlement. Format: **Bold label.** One sentence.}

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

# Public Notes
[[Public/World/{Region}/{Settlement Name}/{Settlement Name}|{Settlement Name}]]

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
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
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

### Brevity
- **10-second scan rule.** A DM mid-session should get what they need from any section at a glance.
- Use fragments and short bullets. No prose paragraphs.
- Section limits: 2-4 bullets or 1-3 sentences per section. If it's longer, trim it.
- Don't catalog — curate. List what's interesting, not everything.

### Read-Aloud Text
The Overview/Description in the private note doubles as read-aloud text. Use `>` blockquote formatting so the DM can instantly spot it.

### General
- Settlements exist to give NPCs a home and the party a place to visit — don't over-describe.
- NPCs and shops mentioned should link to their own files; if those files don't exist yet, **ask the user** if you should create them.
- Public notes only link to public files. Private notes can link to anything.
- Match existing tag conventions (PascalCase region/city names, no `#` in YAML).

## Converting Existing Settlements

Some existing settlements use older templates with `::` metadata, prose-heavy descriptions, or inline metadata instead of YAML frontmatter. When converting:

1. **Read both private and public files** before changing anything
2. **Map old fields to YAML frontmatter** — population, government, settlement type, region
3. **Preserve all wiki-links** — NPC links, shop links, location references
4. **Trim descriptions to fragments** — condense prose paragraphs into scannable bullets
5. **Rewrite public file** as standalone gazetteer entry
6. **For batch conversions** — list files first, confirm with user, convert one at a time

## Cascading Creation

When creating a settlement, check if it needs supporting content:
- Does it have NPCs? Ask if you should create them.
- Does it have shops or taverns? Ask if you should create those.
- Does it belong to a region that doesn't exist yet? Ask if you should create the region.
- Does it have guilds or organizations? Ask if you should create those.

Don't silently create supporting content — always confirm with the user first.
