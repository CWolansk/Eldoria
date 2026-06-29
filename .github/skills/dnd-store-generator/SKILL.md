---
name: dnd-store-generator
description: >
  Generate shops, taverns, inns, and other establishments for the Eldoria D&D campaign with paired private (DM) and public (player-facing) Obsidian markdown notes.
  Use this skill whenever the user wants to create a new shop, tavern, inn, forge, apothecary, market stall, or any place of business.
  Also use when the user mentions creating a business, establishment, or place where the party can buy, sell, eat, drink, or sleep — even if they don't say "shop" explicitly.
---

# Eldoria Store & Establishment Generator

Create shops and establishments as paired Obsidian markdown files: a **private DM note** with owner details and DM-only info, and a **public player note** describing what the party sees and can buy.

Keep it practical — what does this place sell, who runs it, and what's it like to walk in?

## What You Need From the User

At minimum: a **name** (or concept) and a **location**. Everything else can be invented. Look for:

- Shop name
- Location (region and city)
- Type (smithy, tavern, inn, general store, magic shop, etc.)
- Proprietor (name, race, personality — or invent one)
- Specialty or notable inventory
- Atmosphere/vibe

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for paired private/public files, frontmatter, tags, dataview blocks, the 10-second scan / brevity rule, read-aloud blockquotes, search-before-create, batch creation order, and old-format conversion. Only the store-specific details are below.

## Before You Create

Search the vault first (CONVENTIONS.md §7) — specifically check the target settlement folder for existing stores (e.g., don't create a second blacksmith if one exists) and check whether the proposed proprietor already has an NPC file.

## File Paths

Stores sit alongside other location files in the settlement directory:

```
Private/1. World Almanac/World/{Region}/{City}/{Shop Name}.md
Public/World/{Region}/{City}/{Shop Name}.md
```

## Private Note (DM Version)

```markdown
---
type: Store
name: {Shop Name}
location: {City}
region: {Region}
store_type: {Smithy/Tavern/Inn/General Store/etc.}
proprietor: {Owner Name}
tags:
  - Store
  - {Region}
  - {City}
  - {StoreType}
---

![[Public/World/{Region}/{City}/{Shop Name}]]

## Proprietor
[[{Owner NPC Name}]] — {one-line description}

## Inventory
{Bullet list of notable items or services. Don't list every mundane item — focus on what's interesting or unique. Include DM-only items here (hidden stock, illegal goods, etc.).}

## DM Notes
{Leave empty. DM fills this in during play.}

The following sections are **optional** — only include if the user specifies:

## Secrets
{Hidden inventory, illegal goods, the shop is a front for something, etc.}

## Plot Hooks
{Open-ended threads tied to this establishment.}

---

# Public Notes
[[Public/World/{Region}/{City}/{Shop Name}|{Shop Name}]]

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Public Note (Player Version)

```markdown
---
type: Store
name: {Shop Name}
location: {City}
region: {Region}
store_type: {Smithy/Tavern/Inn/General Store/etc.}
tags:
  - Store
  - {Region}
  - {City}
  - {StoreType}
---

## Description
> {2-3 sentences. What the place looks like, sounds like, smells like. Use blockquote for read-aloud text so the DM can spot it instantly when embedding this file.}

## Proprietor
[[Public/World/{Region}/{City}/NPCs/{Owner Name}|{Owner Name}]] — {one-line public impression}

## Services & Wares
{Bullet list. What can the party buy or do here? Focus on categories and specialties, not exhaustive price lists.}

## Reputation
{1-2 sentences. What do locals say about this place?}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
```

## Writing Guidelines

- Inventory lists should highlight what's special, not catalog everything. "Standard adventuring gear plus..." is fine.
- Section limits: 2-5 inventory bullets, 1-2 sentences for descriptions.
- The proprietor should be a real NPC — if they don't have a file yet, **ask the user** if you should create one using the NPC generator skill.

## Converting Existing Stores

Convert old `::` files per CONVENTIONS.md §11. Store-specific field mapping:
- Old metadata → `store_type`, `proprietor`, `location`, `region` in YAML frontmatter
- Condense prose descriptions into 2-3 sentence blockquote read-alouds
- Trim inventory lists to notable/unique items only

## Cascading Creation

When creating a store, check if it needs supporting content:
- Does the proprietor have an NPC file? If not, ask if you should create one.
- Is the proprietor part of a guild or group? If that group doesn't exist, ask.
- Does the settlement the store is in have a file? If not, ask.
