---
name: dnd-group-generator
description: >
  Generate guilds, factions, secret societies, and organizations for the Eldoria D&D campaign with paired private (DM) and public (player-facing) Obsidian markdown notes.
  Use this skill whenever the user wants to create a new guild, faction, organization, cult, order, brotherhood, alliance, gang, or any named group of people.
  Also use when the user mentions adding factions to the world, creating political groups, trade guilds, criminal organizations, religious orders, or military companies — even if they don't say "group" explicitly.
---

# Eldoria Group & Organization Generator

Create groups and organizations as paired Obsidian markdown files: a **private DM note** with inner workings and secrets, and a **public player note** describing what the world knows.

Groups are the political and social fabric of the world. Keep them simple — what do they want, who runs them, and how does the party encounter them?

## What You Need From the User

At minimum: a **name** (or concept). Everything else can be invented. Look for:

- Group name
- Type (guild, faction, cult, order, gang, alliance, etc.)
- Headquarters or primary location
- Leader(s)
- Purpose or goals
- Influence level (local, regional, continental)

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for paired private/public files, frontmatter, tags, dataview blocks, the 10-second scan / brevity rule, read-aloud blockquotes, search-before-create, batch creation order, and old-format conversion. Only the group-specific details are below.

## Before You Create

Search the vault first (CONVENTIONS.md §7) — specifically check `Private/1. World Almanac/World/Groups/` and `Public/World/Groups/` for existing groups (e.g., Foundation, Fisherman's Guild, Adventurers Guild).

## File Paths

All groups go in the world-level Groups folder, regardless of where they're headquartered:

```
Private/1. World Almanac/World/Groups/{Group Name}.md
Public/World/Groups/{Group Name}.md
```

## Private Note (DM Version)

```markdown
---
type: Organization
name: {Group Name}
headquarters: {City or Location}
region: {Region}  # readable name with spaces, not PascalCase tag
org_type: {Guild/Faction/Cult/Order/Gang/Alliance/etc.}
leader: {Leader Name}
influence: {Local/Regional/Continental}
tags:
  - Organization
  - {Region}
  - {OrgType}
  - {GroupName}
---

![[Public/World/Groups/{Group Name}]]

## Goals
{Bullet list. What does the organization want? Keep it to 2-4 items.}

## Structure
{Brief description of hierarchy/ranks. Bullet list is fine. Don't over-detail — just enough to know who's in charge and how they're organized.}

## Notable Members
{Bullet list with wiki-links to NPC files.}
- [[{Leader Name}]] — {role, one-line description}

## Relations
{Who are their allies, rivals, enemies? Bullet list.}

## DM Notes
{Leave empty. DM fills this in during play.}

The following sections are **optional** — only include if the user specifies:

## Secrets
{Hidden agendas, the real power behind the organization, betrayals, etc.}

## Plot Hooks
{Open-ended threads tied to this group.}

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
type: Organization
name: {Group Name}
headquarters: {City or Location}
region: {Region}  # readable name with spaces, not PascalCase tag
org_type: {Guild/Faction/Cult/Order/Gang/Alliance/etc.}
tags:
  - Organization
  - {Region}
  - {OrgType}
  - {GroupName}
---

## Overview
{What the public knows about this group. 2-3 sentences.}

## Reputation
{1-2 sentences. What do common folk think of them?}

## Known Members
{Only members the party has met or heard of. Bullet list with public wiki-links.}
- [[Public/World/{Region}/{City}/NPCs/{Name}|{Name}]] — {public role}

## Services
{If applicable — what can the party get from this group? Membership, contracts, training, etc.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
```

## Writing Guidelines

- Goals: 2-4 bullets max. What they want, not their philosophy.
- Structure: Don't over-detail ranks. "Leader > Lieutenants > Members" with a few names is plenty.
- Relations: One bullet per ally/rival/enemy.
- Groups should feel alive — they want things and they conflict with other groups.
- Leaders and notable members should be real NPCs — if they don't have files yet, **ask the user** if you should create them using the NPC generator skill.
- Mottos and catchphrases are great flavor — add them if they fit the group's personality.

## Converting Existing Organizations

Convert old `::` files per CONVENTIONS.md §11. Organization-specific field mapping:
- Old metadata → `org_type`, `headquarters`, `leader`, `influence`, `region` in YAML frontmatter
- Condense prose descriptions into short bullet-point sections
- Rewrite the public file as a standalone note with only publicly known information

## Cascading Creation

When creating a group, check if it needs supporting content:
- Do the leaders and notable members have NPC files? If not, ask.
- Does the headquarters location have a file? If not, ask.
- Is the group based in a settlement? Does that settlement have a file? If not, ask.
