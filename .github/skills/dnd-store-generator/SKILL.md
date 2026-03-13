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

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, read-aloud formatting, batch creation order, and conversion guidance.

## Before You Create

Always **search the vault first**:
1. Search `Private/1. World Almanac/World/` to discover existing regions
2. Search within the target settlement folder for existing stores — avoid duplicates (e.g., don't create a second blacksmith if one exists)
3. Check if the proposed proprietor already has an NPC file
4. Look at neighboring store files to match tone and detail level

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
---

## Description
> {2-3 sentences. What the place looks like, sounds like, smells like. Use blockquote for read-aloud text — this is what the DM says when the party walks in.}

## Proprietor
[[{Owner NPC Name}]] — {one-line description}

## Inventory
{Bullet list of notable items or services. Don't list every mundane item — focus on what's interesting or unique.}

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
FROM [[#this.file.name]]
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
---

## Description
{What you see when you walk in — sights, sounds, smells. 2-3 sentences.}

## Proprietor
[[Public/World/{Region}/{City}/NPCs/{Owner Name}|{Owner Name}]] — {one-line public impression}

## Services & Wares
{Bullet list. What can the party buy or do here? Focus on categories and specialties, not exhaustive price lists.}

## Reputation
{1-2 sentences. What do locals say about this place?}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

### Brevity
- **10-second scan rule.** The DM should be able to scan the entire store file in 10 seconds mid-session.
- Use fragments and short bullets. No prose paragraphs.
- Inventory lists should highlight what's special, not catalog everything. "Standard adventuring gear plus..." is fine.
- Section limits: 2-5 inventory bullets, 1-2 sentences for descriptions.

### Read-Aloud Text
The Description section doubles as read-aloud text. Use `>` blockquote formatting so the DM can instantly spot what to say when the party walks in.

### General
- The proprietor should be a real NPC — if they don't have a file yet, **ask the user** if you should create one using the NPC generator skill.
- Public notes only link to public files. Private notes can link to anything.
- Match existing store conventions in the vault (check the settlement folder for neighboring stores as reference).

## Converting Existing Stores

Some existing stores use older templates with `::` metadata or prose-heavy descriptions. When converting:

1. **Read both private and public files** before changing anything
2. **Map old fields to YAML frontmatter** — store type, proprietor, location, region
3. **Preserve all wiki-links** — proprietor links, location references, inventory items that link to other pages
4. **Condense prose descriptions** into 2-3 sentence blockquote read-alouds
5. **Trim inventory lists** to notable/unique items only
6. **Rewrite public file** as standalone note
7. **For batch conversions** — list files first, confirm with user, convert one at a time

## Cascading Creation

When creating a store, check if it needs supporting content:
- Does the proprietor have an NPC file? If not, ask if you should create one.
- Is the proprietor part of a guild or group? If that group doesn't exist, ask.
- Does the settlement the store is in have a file? If not, ask.
