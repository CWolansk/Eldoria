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

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, read-aloud formatting, batch creation order, and conversion guidance.

## Before You Create

Always **search the vault first**:
1. Search `Private/1. World Almanac/World/` to discover existing regions (each top-level folder is a region)
2. Search within the target region folder for existing settlements
3. Search `*/NPCs/` within the settlement to check if the NPC already exists
4. Look at neighboring NPC files to match tone and detail level

This prevents duplicates and catches opportunities to link to existing content.

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

## Description
> {1-2 sentences max. Fragments are fine. Physical snapshot, one standout sensory detail (a smell, a sound, a habit). A DM glancing at this mid-session should instantly know how to describe this person. Use blockquote for read-aloud text.}

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
FROM [[#this.file.name]]
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
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

These guidelines are about producing NPCs that actually work at a D&D table, not just NPCs that read well on paper.

### Keep It Light
Brevity is the rule. Use sentence fragments, short bullets, and single-line entries. No prose paragraphs — the DM should be able to scan the entire NPC in 10 seconds during a session. If a section has more than 3 bullets or 2 sentences, it's too long. Ideals and Flaws are a word or short phrase, not a full sentence.

### Make Them Playable
Every NPC needs at least one thing that makes them **fun to roleplay**: a distinctive voice, a nervous habit, an opinion they won't shut up about. The Quirk field exists for this — use it well. "Speaks in a monotone" is fine. "Always refers to herself in the third person when nervous" is better.

### Secrets Should Create Tension
The Secrets & Motivations section is what separates a background character from a memorable one. Even a simple shopkeeper can have a secret that makes an encounter crackle — they're overcharging because they owe money to the wrong people, they're actually a retired adventurer hiding from their past, they report everything they overhear to the local thieves' guild. The secret doesn't need to be dramatic, just interesting enough that it could matter if the players poke at it.

### Plot Hooks Should Be Open-Ended
Don't write quest scripts. Write threads the DM can pull. "Has been noticing strange noises from the cellar at night" is a hook. "Will ask the party to investigate the cellar where they'll find a hidden passage to the underdark" is a railroad. Leave room for the DM to decide what's actually down there.

### Public Notes Stay Clean
The public note must never leak DM secrets. If the NPC is secretly a spy, the public note just says they're a merchant. If they're plotting against the king, the public note says they're a loyal citizen. Write as if a player is reading this — because they are.

### Links Follow Obsidian Conventions
- Use `[[wiki links]]` with display text: `[[Path/To/File|Display Name]]`
- **Public notes only link to other public notes** under `Public/World/...`
- **Private notes can link to anything** — other private NPCs, public notes, factions, locations
- Tag format in frontmatter uses the location/region naming without `#` (tags in YAML don't need the hash)

### Naming Conventions
- Filenames match the NPC's full name exactly: `Aldric Brightwater.md`
- Tags in YAML frontmatter should be PascalCase or match existing tags (e.g., `Highreach`, `Ardenville`, `NPC`)
- Check the existing tag conventions in the vault and match them

## When Generating Multiple NPCs

If asked to populate a location or generate a batch, create variety:
- Mix races, genders, ages, and social classes
- Give them different relationships to each other (rivals, friends, family, strangers)
- Vary the tone — not every NPC needs a dark secret; some are just pleasant people with small problems
- Make sure their professions and roles make sense for the location (a fishing village needs fisherfolk, a university needs professors)

## Updating Existing NPCs

If the user asks to flesh out or modify an existing NPC, read their current file first. Preserve everything the user wrote and add to it — don't overwrite hand-crafted content.

## Converting Existing NPCs to the New Template

Many existing NPCs use an older `::` metadata format. When asked to convert one or more NPCs, follow this process:

### What the old format looks like
```
Location :: #HighReach #SturdyMugg
Profession :: #Barkeep
Description :: Towering, barrel-chested man...
Alive? :: Yes
Notes :: Barkeep at the [[Sturdy Mugg]] ^ee5257

# Public Notes
[[Public/World/.../NPC Name|NPC Name]]
```

Some older files may also have loose tags, inline links, or freeform text instead of structured fields.

### Conversion steps

1. **Read both private and public files** for the NPC before changing anything.
2. **Extract all existing content** — map old fields to new template sections:
   - `Location ::` → `location` and `region` in YAML frontmatter, plus tags
   - `Profession ::` → `profession` in frontmatter
   - `Description ::` → `## Description` (trim to fragments if it's too long)
   - `Alive? ::` → `status` in frontmatter (`Alive` or `Dead`)
   - `Notes ::` — split into the appropriate sections: public-safe info goes to Description or Relationships, DM secrets go to `## Secrets & Motivations`, plot threads go to `## Plot Hooks`
   - Any `^blockid` reference can be dropped — the new public files are standalone, not embeds
   - Existing `[[wiki links]]` to locations, workplaces, and events must be preserved in the `## Links` section — never drop these during conversion
3. **Invent only what's missing.** If there's no personality info, create Ideal/Bond/Flaw/Quirk. If there are no secrets, invent a small one that fits. But don't fabricate details that contradict what the DM already wrote.
4. **Rewrite the public file** as a standalone note (not an embed). Pull only public-safe content from the private file into the Appearance, What We Know, and First Impressions sections.
5. **Preserve the `# Public Notes` link and dataview query** at the bottom of the private file.

### Batch conversion

If the user asks to convert all NPCs in a location (e.g., "convert all Highreach NPCs"), list the files first and confirm with the user before proceeding. Convert them one at a time, showing the user each result. This avoids silent mistakes on NPCs the DM has specific intentions for.

## Cascading Creation

When creating an NPC, check if they need supporting content that doesn't exist yet:
- Does the NPC work at a shop/tavern/forge? If that store doesn't have a file, ask if you should create one using the **dnd-store-generator** skill.
- Is the NPC part of a guild, faction, or organization? If that group doesn't have a file, ask if you should create one using the **dnd-group-generator** skill.
- Is the NPC's settlement documented? If not, ask if you should create it using the **dnd-settlement-generator** skill.
- Is the NPC's region documented? If not, ask if you should create it using the **dnd-region-generator** skill.
