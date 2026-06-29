---
name: dnd-deity-generator
description: >
  Generate deities, pantheons, faiths, and religious orders for the Eldoria D&D campaign with paired
  private (DM) and public (player-facing) Obsidian markdown notes.
  Use this skill whenever the user wants to create a god, goddess, deity, pantheon, religion, faith,
  divine power, patron, or define what worshippers believe and how they worship.
  Also use when the user mentions creating temples' gods, a clergy's deity, divine domains, holy symbols,
  or the religion behind a cult or order — even if they don't say "deity" explicitly.
---

# Eldoria Deity & Pantheon Generator

Create deities as paired Obsidian notes: a **public note** with what worshippers believe and how the faith presents itself, and a **private note** with the god's true nature and divine agenda. Players know their gods, so the public note carries real lore — secrets live in the private file.

## What You Need From the User

- A **name** or concept (the god of what?).
- Ideally: domains/portfolio, alignment, the cultures or races that worship them, and how the faith behaves in the world.

Everything else can be invented to fit Eldoria's existing pantheon — sample neighboring deities first.

## Shared Conventions

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md) for paired private/public files, frontmatter, tags, dataview, brevity, read-aloud formatting, and cascading creation.

## File Paths

Deities live at the **world level**, alongside Groups:

```
Private/1. World Almanac/World/Pantheon/{Deity Name}.md
Public/World/Pantheon/{Deity Name}.md
```

## Public Note (Player Version)

```markdown
---
type: Deity
name: {Deity Name}
domains: [{Domain}, {Domain}]
alignment: {LG/NG/CG/LN/N/CN/LE/NE/CE}
symbol: {short description of the holy symbol}
tags:
  - Deity
  - {Pantheon or Culture}
---

## Overview
> {1-2 sentence read-aloud — how this god is spoken of, the feeling their name evokes.}

## Domains & Portfolio
- {What they govern: sea, war, harvest, the dead, etc. — 2-4 bullets.}

## Symbol & Worship
- **Symbol:** {holy symbol}
- **Worshippers:** {who follows them — races, professions, regions}
- **Tenets:** {1-3 short commandments or beliefs}

## Holy Days
{Links to related holidays, if any. Otherwise omit.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
```

## Private Note (DM Version)

```markdown
---
type: Deity
name: {Deity Name}
domains: [{Domain}, {Domain}]
alignment: {alignment}
symbol: {short description}
tags:
  - Deity
  - {Pantheon or Culture}
---

![[Public/World/Pantheon/{Deity Name}]]

## DM Notes
{Leave empty. The DM fills this in during play.}

The following sections are **optional** — only include if the user requests them:

## True Nature
{The reality behind the worship — is the god real, dead, sleeping, a fraud, something else? 2-3 bullets.}

## Divine Agenda
{What the god (or its church) actually wants. Open-ended threads, not scripts.}

## Secrets
{Hidden truths only the DM knows — heresies, schisms, a buried covenant.}

## Related
{Wiki links to temples, religious orders, and notable clergy.}

---

# Public Notes
[[Public/World/Pantheon/{Deity Name}|{Deity Name}]]

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Writing Guidelines

- **A faith is more memorable than a stat line.** Lead with what worshippers *do* — the rite, the taboo, the festival — not an abstract domain list.
- Keep tenets to a few sharp lines players can actually invoke ("the sea takes what it's owed").
- Secrets and True Nature are opt-in — a god can simply be a god. Only add a hidden twist if the DM wants one.

## Cascading Creation

A new deity often implies other entities — **offer, don't auto-create**:
- A **temple** where they're worshipped → `dnd-location-generator` (or `dnd-store-generator` for a temple that offers services).
- A **religious order, church, or cult** → `dnd-group-generator`.
- **Holy days and festivals** → `dnd-holiday-generator` (holidays already reference deities — cross-link them).
- **Clergy NPCs** (high priest, zealot, heretic) → `dnd-npc-generator`.
