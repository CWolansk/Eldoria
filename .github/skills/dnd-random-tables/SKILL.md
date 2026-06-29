---
name: dnd-random-tables
description: >
  Generate, roll, and save random tables and culturally-consistent names for the Eldoria D&D campaign —
  rumors, weather, urban and wilderness encounters, complications, loot flavor, shop and tavern names,
  and NPC or place names that fit a given region or race.
  Use this skill whenever the user wants a random table, a quick roll, a batch of names, a "give me an idea"
  spark, or something to fill a blank on the fly.
  Also use when the user mentions needing names, rumors, a roll table, random encounters, or improv fodder —
  even if they don't say "table" explicitly.
---

# Eldoria Random Tables & Name Generator

Two jobs: **(1)** spin up random tables the DM can roll at the table, and **(2)** generate names that match the campaign's established style. Output is **in-chat by default** — only save a file when the user wants a table they'll reuse.

## Shared Conventions

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md) for tags, dataview, brevity, and file conventions.

## Before You Generate

**Match what already exists.** Before inventing names, sample the vault so your output fits Eldoria's flavor:
- For NPC names, read a few existing files in the target settlement's `NPCs/` folder and match the naming style for that region/race.
- For place names, look at neighboring settlements and locations in the region.
- For tables, check `Private/2. Reference/Tables/` so you don't recreate one that exists.

Consistency is the whole point — dwarven names should look like the dwarven names already in the vault, not generic fantasy filler.

## Function 1 — Random Tables

Roll on demand and present results in chat. Common table types: rumors & gossip, weather, urban encounters, wilderness encounters, travel complications, tavern menus, NPC mannerisms, what's-in-their-pockets, plot complications.

Default: **roll it and show the result** plus the table you rolled on, so the DM can re-roll. Build the table sized to the request (d6 for quick, d20 for variety).

### Saving a reusable table
If the user wants to keep a table, save it to `Private/2. Reference/Tables/{Table Name}.md` in a **dice-roller-compatible** markdown table (the vault uses the dice-roller plugin — see [CONVENTIONS.md](../CONVENTIONS.md) §12):

```markdown
---
type: Table
name: {Table Name}
tags:
  - Table
  - {Topic}
---

# {Table Name}

`dice: [[{Table Name}]]`

| d12 | Result |
|----:|--------|
| 1   | {entry} |
| 2   | {entry} |
| ... | ...     |

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

Keep entries to fragments — a roll result should be graspable instantly.

## Function 2 — Names

Generate names that fit a culture, race, or region. Default output is a **quick batch** the DM can pick from:

- Ask (or infer) the race/culture and whether it's a person, place, or business.
- Sample existing vault names for that group first (see "Before You Generate").
- Offer 5–10 options as a simple list. For people, optionally pair a surname/epithet ("Corin Tidehammer", "Mira the Quiet").
- For businesses, match the tone of existing Eldoria shop names (evocative, not punny unless the DM wants that).

Names are presented in chat — they don't get their own files. When the DM picks one and wants the entity built, hand off to the matching generator (`dnd-npc-generator`, `dnd-store-generator`, etc.).

## Cascading Creation

This skill produces raw material, not entities. When the DM turns a rolled result or a chosen name into something real, delegate:
- A rumor that becomes a lead → `dnd-quest-generator` or `dnd-storyline-tracker`.
- A name that becomes a character → `dnd-npc-generator`.
- A rolled encounter the DM wants to run → `dnd-encounter-builder`.
