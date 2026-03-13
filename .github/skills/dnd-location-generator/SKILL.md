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

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, read-aloud formatting, batch creation order, and conversion guidance.

## Before You Create

Always **search the vault first**:
1. Search `Private/1. World Almanac/World/{Region}/` for existing locations — avoid duplicates
2. Check if the region and nearby settlement exist
3. Look at existing location files (Blackwood Forest, Lake Arden) to match tone and structure

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

## Description
> {2-3 sentences. What it looks like, feels like. Use blockquote for read-aloud text — this is what the DM says when the party arrives.}

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
FROM [[#this.file.name]]
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
{What the party sees or has heard about this place. 2-3 sentences.}

## Known Features
{What's visible or commonly known. Bullet list.}

## Rumors
{What locals say about this place. 1-3 bullets. Mix truth and fiction.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

### Brevity
- **10-second scan rule.** The DM should be able to scan the entire location file at a glance mid-session.
- Use fragments and short bullets. No prose paragraphs.
- Key Features: 3-5 bullets max. What's notable, not what's obvious.
- Hazards: 2-4 bullets. What's dangerous, with enough info to run an encounter.

### Read-Aloud Text
The Description section doubles as read-aloud text. Use `>` blockquote formatting so the DM can instantly spot what to say when the party arrives. Keep it to 2-3 lines.

### General
- Focus on what's *actionable* — what can the party interact with, fight, or investigate?
- Don't map out every room of a dungeon. Provide the concept, atmosphere, and key encounters. Detail comes at the table.
- Public notes only link to public files. Private notes can link to anything.

## Converting Existing Locations

Some existing locations use older templates with `::` metadata or prose-heavy descriptions. When converting:

1. **Read both private and public files** before changing anything
2. **Map old fields to YAML frontmatter** — location type, travel difficulty, region
3. **Preserve all wiki-links** — NPC references, settlement links, faction references
4. **Condense prose descriptions** into 2-3 sentence blockquote read-alouds
5. **Trim feature/hazard lists** to notable items only
6. **Rewrite public file** as standalone note
7. **For batch conversions** — list files first, confirm with user, convert one at a time

## Cascading Creation

When creating a location, check if it needs supporting content:
- Are there creatures or NPCs living here? Ask if you should create NPC files.
- Is there a faction or group that controls this place? Ask if the group needs a file.
- Is the region it's in documented? If not, ask.
