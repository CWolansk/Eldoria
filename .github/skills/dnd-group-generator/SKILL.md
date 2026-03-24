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

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, read-aloud formatting, batch creation order, and conversion guidance.

## Before You Create

Always **search the vault first**:
1. Search `Private/1. World Almanac/World/Groups/` and `Public/World/Groups/` for existing groups — avoid duplicates
2. Check if the proposed leader and members already have NPC files
3. Check if the headquarters settlement/location exists
4. Look at existing group files (Foundation, Fisherman's Guild, Adventurers Guild) to match tone5. If the group already exists, **do not create a duplicate** — offer to review or update the existing files instead. If the user wants to see what you’d generate, show a preview in chat without creating files.
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

### Brevity
- **10-second scan rule.** The DM should scan the entire group file at a glance mid-session.
- Use fragments and short bullets. No prose paragraphs.
- Goals: 2-4 bullets max. What they want, not their philosophy.
- Structure: Don't over-detail ranks. "Leader > Lieutenants > Members" with a few names is plenty.
- Relations: One bullet per ally/rival/enemy.

### General
- Groups should feel alive — they want things and they conflict with other groups.
- Leaders and notable members should be real NPCs — if they don't have files yet, **ask the user** if you should create them using the NPC generator skill.
- Public notes only link to public files. Private notes can link to anything.
- Mottos and catchphrases are great flavor — add them if they fit the group's personality.

## Converting Existing Organizations

Some existing organizations use older templates with `::` metadata or prose-heavy descriptions. When converting:

1. **Read both private and public files** before changing anything
2. **Map old fields to YAML frontmatter** — org type, headquarters, leader, influence, region
3. **Preserve all wiki-links** — member NPC links, headquarters links, ally/rival/enemy references
4. **Condense prose descriptions** into short bullet-point sections
5. **Rewrite public file** as standalone note with only publicly known information
6. **For batch conversions** — list files first, confirm with user, convert one at a time

## Cascading Creation

When creating a group, check if it needs supporting content:
- Do the leaders and notable members have NPC files? If not, ask.
- Does the headquarters location have a file? If not, ask.
- Is the group based in a settlement? Does that settlement have a file? If not, ask.

**Reminder:** After generating a group file, always check this section and ask the DM about any NPCs or locations mentioned that don’t have their own files yet.
