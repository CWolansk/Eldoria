---
name: dnd-location-generator
description: >
  Generate places of interest (forests, ruins, dungeons, landmarks, battlefields, temples, caves, etc.) for the Eldoria D&D campaign with paired private (DM) and public (player-facing) Obsidian markdown notes.
  Use this skill whenever the user wants to create a new location that isn't a settlement or store — such as a dungeon, ruin, forest, cave, shrine, monument, battlefield, tower, bridge, or any notable geographic or built feature.
  Also use when the user mentions adding a landmark, point of interest, exploration site, or encounter location — even if they don't say "location" explicitly.
---

# Eldoria Place of Interest Generator

Create locations as paired Obsidian markdown files: a **private DM note** with hazards, encounters, and secrets, and a **public player note** describing what the party knows or can see.

Locations are places the party goes to *do something* — explore, fight, discover. Keep them adventure-ready.

## What You Need From the User

At minimum: a **name** (or concept) and rough **location**. Everything else can be invented. Look for:

- Location name
- Region (and nearby settlement if applicable)
- Type (forest, ruin, dungeon, cave, shrine, tower, lake, mountain pass, etc.)
- Atmosphere or hazard level
- Why it matters (what's there to find, fight, or discover)

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for paired private/public files, frontmatter, tags, dataview blocks, the 10-second scan / brevity rule, read-aloud blockquotes, search-before-create, batch creation order, and old-format conversion. Only the location-specific details are below.

## Before You Create

Search the vault first (CONVENTIONS.md §7) — specifically check `Private/1. World Almanac/World/{Region}/` for existing locations (e.g., Blackwood Forest, Lake Arden).

## File Paths

Places of interest sit in the region directory:

```
Private/1. World Almanac/World/{Region}/{Location Name}.md
Public/World/{Region}/{Location Name}.md
```

If closely tied to a specific settlement:
```
Private/1. World Almanac/World/{Region}/{City}/{Location Name}.md
Public/World/{Region}/{City}/{Location Name}.md
```

## Private Note (DM Version)

```markdown
---
type: Location
name: {Location Name}
region: {Region}
location_type: {Forest/Ruin/Dungeon/Cave/Shrine/Tower/etc.}
travel_difficulty: {Easy/Moderate/Hard/Deadly}
tags:
  - Location
  - {Region}
  - {LocationType}
---

![[Public/World/{Region}/{Location Name}]]

## Key Features
{Bullet list. What's notable? Landmarks, structures, natural features. 3-5 items.}

## Hazards & Inhabitants
{What's dangerous here? Creatures, traps, environmental hazards. Bullet list.}

## DM Notes
{Leave empty. DM fills this in during play.}

The following sections are **optional** — only include if the user specifies:

## Secrets
{Hidden areas, buried treasure, lore reveals, etc.}

## Encounters
{Specific encounter ideas tied to this location.}

## History
{What happened here and why it matters now.}

---

# Public Notes
[[Public/World/{Region}/{Location Name}|{Location Name}]]

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Public Note (Player Version)

```markdown
---
type: Location
name: {Location Name}
region: {Region}
location_type: {Forest/Ruin/Dungeon/Cave/Shrine/Tower/etc.}
tags:
  - Location
  - {Region}
  - {LocationType}
---

## Description
> {What the party sees or has heard about this place. 2-3 sentences. Use blockquote for read-aloud text so the DM can spot it instantly when embedding this file.}

## Known Features
{What's visible or commonly known. Bullet list.}

## Rumors
{What locals say about this place. 1-3 bullets. Mix truth and fiction.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
```

## Writing Guidelines

- Key Features: 3-5 bullets max. What's notable, not what's obvious.
- Hazards: 2-4 bullets. What's dangerous, with enough info to run an encounter.
- Focus on what's *actionable* — what can the party interact with, fight, or investigate?
- Don't map out every room of a dungeon. Provide the concept, atmosphere, and key encounters. Detail comes at the table.

## Converting Existing Locations

Convert old `::` files per CONVENTIONS.md §11. Location-specific field mapping:
- Old metadata → `location_type`, `travel_difficulty`, `region` in YAML frontmatter
- Condense prose descriptions into 2-3 sentence blockquote read-alouds
- Trim feature/hazard lists to notable items only

## Cascading Creation

When creating a location, check if it needs supporting content:
- Are there creatures or NPCs living here? Ask if you should create NPC files.
- Is there a faction or group that controls this place? Ask if the group needs a file.
- Is the region it's in documented? If not, ask.
