---
name: dnd-npc-generator
description: >
  Generate NPCs for the Eldoria D&D campaign with paired private (DM) and public (player-facing) Obsidian markdown notes.
  Use this skill whenever the user wants to create a new NPC, generate a character for a location or shop,
  populate a town with NPCs, flesh out a throwaway character, or needs a quick NPC for an encounter.
  Also use when the user mentions adding characters to the world, creating shopkeepers, tavern owners, guards,
  quest givers, villains, or any named person in the campaign — even if they don't say "NPC" explicitly.
---

# Eldoria NPC Generator

Create NPCs for the Eldoria campaign as paired Obsidian markdown files: a **private DM note** with secrets and plot hooks, and a **public player note** written like a wiki entry or field journal.

The goal is to produce NPCs that are **lightweight but evocative** — enough personality and hooks to improvise with at the table, but not so detailed that there's no room to discover who the character becomes during play.

## What You Need From the User

At minimum, you need a **name** and a **location**. Everything else can be invented. But the more the user gives you, the better — so look for any of these:

- Name
- Location (region and city/town — needed for file paths)
- Race
- Profession or role
- A concept or vibe ("shady merchant", "retired adventurer who runs the bakery", "overly cheerful guard")
- Any relationships to existing NPCs or factions
- Specific plot hooks or secrets the DM wants baked in

If the user gives you just a name and location, invent the rest. If they give you a detailed concept, honor it faithfully and fill gaps.

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for paired private/public files, frontmatter, tags, dataview blocks, the 10-second scan / brevity rule, read-aloud blockquotes, search-before-create, batch creation order, and old-format conversion. Only the NPC-specific details are below.

## Before You Create

Search the vault first (CONVENTIONS.md §7) — specifically check `*/NPCs/` within the target settlement.

## File Paths

The Eldoria vault uses this directory structure:

```
Private/1. World Almanac/World/{Region}/{City}/NPCs/{NPC Name}.md
Public/World/{Region}/{City}/NPCs/{NPC Name}.md
```

Discover regions and cities dynamically by listing `Private/1. World Almanac/World/`. Create new directories if a location doesn't exist yet.

## Private Note (DM Version)

The private note is what the DM sees. It has structured metadata for Obsidian queries, narrative content for roleplay, and secrets the players should never see.

Use this structure:

```markdown
---
type: NPC
name: {Full Name}
location: {City}
region: {Region}
profession: {Profession}
race: {Race}
status: Alive
tags:
  - NPC
  - {Region}
  - {City}
  - {Other relevant tags}
---

![[Public/World/{Region}/{City}/NPCs/{NPC Name}]]

## Personality
- **Ideal:** {One or two words, e.g. "Truth" or "Freedom"}
- **Bond:** {One short phrase — who or what they'd sacrifice for}
- **Flaw:** {One short phrase}
- **Quirk:** {One behavioral tic — the thing players will remember}

## Links
{Obsidian wiki links to locations where they work/live and events they've been involved in. Format: one link per line. These are important cross-references in the vault — always preserve existing links when updating an NPC, and add workplace/location links for new NPCs if those pages exist.}

## DM Notes
{Leave empty. The DM fills this in during play.}

The following sections are **optional** — only include them if the user explicitly provides or requests them:

## Secrets & Motivations
{2-3 short bullet points. No prose — just the facts the DM needs. What the players don't know.}

## Plot Hooks
{1-2 bullet points. Open-ended threads, not quest scripts.}

## Relationships
{Short bullet points with Obsidian wiki links. Format: `[[Name]] — one-line relationship note`. Private notes can link to both private and public notes.}

---

# Public Notes
[[Public/World/{Region}/{City}/NPCs/{NPC Name}|{NPC Name}]]

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Public Note (Player Version)

The public note reads like a wiki article or a journal entry — the kind of notes a player might write after meeting someone. It should contain **only** information that is publicly obvious or that players have already learned. No secrets, no hidden motivations, no plot hooks.

Use this structure:

```markdown
---
type: NPC
name: {Full Name}
location: {City}
region: {Region}
profession: {Profession}
race: {Race}
status: Alive
tags:
  - NPC
  - {Region}
  - {City}
---

## Appearance
{Physical snapshot in 1-2 sentences. Fragments are fine. Only observable details.}

## What We Know
{2-3 sentences max. Where they work, their role, general reputation. Wiki-like tone.}

## First Impressions
{One sentence. The vibe a player gets from a brief interaction.}

## Interactions
{Start empty. This is where players record encounters during the campaign.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
```

## Writing Guidelines

These guidelines are about producing NPCs that actually work at a D&D table, not just NPCs that read well on paper.

### Make Them Playable
Every NPC needs at least one thing that makes them **fun to roleplay**: a distinctive voice, a nervous habit, an opinion they won't shut up about. The Quirk field exists for this — use it well. "Speaks in a monotone" is fine. "Always refers to herself in the third person when nervous" is better.

### Secrets Should Create Tension
The Secrets & Motivations section is what separates a background character from a memorable one. Even a simple shopkeeper can have a secret that makes an encounter crackle — they're overcharging because they owe money to the wrong people, they're actually a retired adventurer hiding from their past, they report everything they overhear to the local thieves' guild. The secret doesn't need to be dramatic, just interesting enough that it could matter if the players poke at it.

### Plot Hooks Should Be Open-Ended
Don't write quest scripts. Write threads the DM can pull. "Has been noticing strange noises from the cellar at night" is a hook. "Will ask the party to investigate the cellar where they'll find a hidden passage to the underdark" is a railroad. Leave room for the DM to decide what's actually down there.

## When Generating Multiple NPCs

If asked to populate a location or generate a batch, create variety:
- Mix races, genders, ages, and social classes
- Give them different relationships to each other (rivals, friends, family, strangers)
- Vary the tone — not every NPC needs a dark secret; some are just pleasant people with small problems
- Make sure their professions and roles make sense for the location (a fishing village needs fisherfolk, a university needs professors)

## Updating Existing NPCs

If the user asks to flesh out or modify an existing NPC, read their current file first. Preserve everything the user wrote and add to it — don't overwrite hand-crafted content.

## Converting Existing NPCs to the New Template

Convert old `::` files per CONVENTIONS.md §11. NPC-specific field mapping:
- `Location ::` → `location` and `region` in YAML frontmatter, plus tags
- `Profession ::` → `profession` in frontmatter
- `Description ::` → `## Description` (trim to fragments if it's too long)
- `Alive? ::` → `status` in frontmatter (`Alive` or `Dead`)
- `Notes ::` — split into the appropriate sections: public-safe info goes to Description or Relationships, DM secrets go to `## Secrets & Motivations`, plot threads go to `## Plot Hooks`
- Existing `[[wiki links]]` to locations, workplaces, and events must be preserved in the `## Links` section — never drop these during conversion

If there's no personality info, create Ideal/Bond/Flaw/Quirk; if there are no secrets, invent a small one that fits.

## Cascading Creation

When creating an NPC, check if they need supporting content that doesn't exist yet:
- Does the NPC work at a shop/tavern/forge? If that store doesn't have a file, ask if you should create one using the **dnd-store-generator** skill.
- Is the NPC part of a guild, faction, or organization? If that group doesn't have a file, ask if you should create one using the **dnd-group-generator** skill.
- Is the NPC's settlement documented? If not, ask if you should create it using the **dnd-settlement-generator** skill.
- Is the NPC's region documented? If not, ask if you should create it using the **dnd-region-generator** skill.
