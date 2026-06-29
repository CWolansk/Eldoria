---
name: dnd-loot-generator
description: >
  Generate treasure, loot, and magic items for the Eldoria D&D campaign — coin and item hoards
  scaled by party level or monster CR, and individual magic items with full write-ups.
  Use this skill whenever the user wants to add loot, roll treasure, hand out a reward, stock a hoard,
  give the party a magic item, or decide what an enemy was carrying.
  Also use when the user mentions rewards, treasure parcels, dungeon loot, a found item, or what's in
  a chest/vault/body — even if they don't say "loot" explicitly.
---

# Eldoria Loot & Magic Item Generator

Produce treasure the DM can drop into a session immediately — a scaled hoard for a fight or dungeon, or a single magic item written up as a note. Loot is **DM-only by default**; the party doesn't get a public file for an item until they've found *and* identified it.

## What You Need From the User

- **For a hoard:** the party level (or the encounter's CR/tier) and the context (boss fight, dungeon hoard, pickpocketed purse, etc.).
- **For an item:** a name or concept, or a rarity/slot to roll within ("an uncommon wondrous item for the rogue").

Everything else can be invented or rolled.

## Shared Conventions

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md) for file pairing, frontmatter, tags, dataview, brevity, read-aloud formatting, and cascading creation.

## Before You Create

**Reuse the existing item catalog first.** The vault already has a curated item list at [docs/Assets/Items/Items.csv](../../../docs/Assets/Items/Items.csv) (the data behind the item-lookup widget — see `dnd-js-widgets`). Prefer an item that already exists there over inventing a new one; only write a fresh item when nothing fits. Also check `Private/2. Reference/Items/` for items you've already detailed.

This skill pairs with `dnd-encounter-builder`, which calculates treasure as part of building a fight — if the user is building an encounter, fold the loot into that file rather than creating a separate one.

## Mode 1 — Treasure Hoard

Scale the hoard to the party's tier. Use these rough bands as a starting point (adjust to taste — Eldoria is not a loot piñata):

| Tier | Levels | Coin (typical) | Magic items |
|---|---|---|---|
| 1 | 1–4 | tens–hundreds of gp | 0–1 minor (common/uncommon) |
| 2 | 5–10 | hundreds–low thousands gp | 1–2 (uncommon/rare) |
| 3 | 11–16 | thousands gp + gems/art | 1–3 (rare/very rare) |
| 4 | 17–20 | tens of thousands gp + valuables | 2–4 (very rare/legendary) |

Present a hoard as a scannable list:

```markdown
**Hoard — {context}** (Tier {N}, party level {L})
- **Coin:** {e.g. 350 gp, 1,200 sp}
- **Valuables:** {gems, art objects, trade goods — 1-3 items with rough value}
- **Magic items:** {1-2 items, each linked if it has a file}
- **Hidden / conditional:** {opt-in — loot behind a lock, trap, or skill check}
```

By default, **present the hoard in chat** or append it to the relevant encounter file under `Private/2. Reference/Encounters/`. Only create item files for the *notable* magic items (Mode 2) — don't make a file for 350 gp.

## Mode 2 — Single Magic Item

Write a notable or named magic item as a DM-only note in `Private/2. Reference/Items/{Item Name}.md`:

```markdown
---
type: Item
name: {Item Name}
item_type: {Weapon/Armor/Wondrous Item/Potion/Ring/Wand/Scroll/etc.}
rarity: {Common/Uncommon/Rare/Very Rare/Legendary/Artifact}
attunement: {Yes / Yes (by a spellcaster) / No}
tags:
  - Item
  - {Rarity}
  - {ItemType}
---

## Description
> {1-2 sentence read-aloud of what the item looks/feels like — what the party perceives before identifying it.}

## Properties
- {Mechanical effect, in fragments. Bonuses, charges, activation, save DCs.}
- {Attunement requirement if any.}

## DM Notes
{Leave empty, or note where it's hidden and how it's found.}

The following sections are **optional** — only include if requested:

## Origin
{1-2 bullets — who made it, why it matters in the world. Opt-in lore hook.}

## Curse / Catch
{Opt-in. The downside, drawback, or hidden cost.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

### When the party finds and identifies an item
Once an item is identified and kept, offer to create a **public** note so it shows up in player references — paired with the private file per [CONVENTIONS.md](../CONVENTIONS.md) (public note describes only what the party knows; the private note keeps any curse/catch hidden). Player-known items go under `Public/World/.../Items/`.

## Cascading Creation

- Did a specific NPC craft, own, or seek this item? Offer to create/link them via `dnd-npc-generator`.
- Is the hoard tied to a location or encounter without a file? Offer to create it (`dnd-location-generator` / `dnd-encounter-builder`).
- Does the item hook into a quest or storyline? Offer to record it (`dnd-quest-generator` / `dnd-storyline-tracker`).
