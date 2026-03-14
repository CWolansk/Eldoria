---
name: dnd-holiday-generator
description: >
  Generate cultural holidays, festivals, and recurring celebrations for the Eldoria D&D campaign.
  Use this skill whenever the user wants to create a new holiday, festival, celebration, religious observance,
  cultural tradition, or seasonal event tied to a race or region.
  Also use when the user mentions creating festivals, feast days, harvest celebrations, religious rites,
  coming-of-age ceremonies, or any recurring cultural event — even if they don't say "holiday" explicitly.
  Do NOT use for one-off world events or political crises (use dnd-event-generator).
  Do NOT use for session logs (use dnd-event-generator).
  Do NOT use for quests that happen during a holiday (use dnd-quest-generator).
---

# Eldoria Holiday & Festival Generator

Create holidays as markdown files in the Eldoria vault. Holidays are **recurring cultural events** tied to races, regions, or religions. They add world flavor, provide adventure hooks, and give the DM something to drop into a session when the party is in town.

Holidays are **DM-only** reference files — they do not get a public counterpart unless the party has experienced one, in which case the DM can create event files using the `dnd-event-generator`.

Holidays are distinct from:
- **Events** (`dnd-event-generator`) — one-off things that happened
- **Quests** (`dnd-quest-generator`) — jobs the party can take
- **Consequences** (`dnd-consequence-generator`) — ripple effects of player actions

## What You Need From the User

At minimum: a **holiday name** or **concept** (e.g., "a dwarven forging festival"). Everything else can be invented. Look for:

- Holiday name
- Race or culture it belongs to (Human, Dwarven, Elven, Orc, or multi-cultural)
- When it occurs (specific calendarium date, season, or recurring interval)
- What the celebration involves (rituals, competitions, feasts, observances)
- Location where it's celebrated
- How often it recurs (annual, every N years, triggered by event)

## Shared Conventions

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, plugin syntax, and batch creation order.

## Before You Create

Always **search the vault first**:
1. Search `Private/2. Reference/Events/World Events/Holidays/` for existing holidays — don't duplicate
2. Check if the race/culture folder exists (Dwarven Holidays, Elven Holidays, Human Holidays, Orc Holidays)
3. Look at existing holiday files to match format conventions
4. Check for related NPCs, locations, or groups to link to

## File Paths

Holidays are organized by race/culture:

```
Private/2. Reference/Events/World Events/Holidays/Dwarven Holidays/{Holiday Name}.md
Private/2. Reference/Events/World Events/Holidays/Elven Holidays/{Holiday Name}.md
Private/2. Reference/Events/World Events/Holidays/Human Holidays/{Holiday Name}.md
Private/2. Reference/Events/World Events/Holidays/Orc Holidays/{Holiday Name}.md
```

For multi-cultural holidays, place in the most relevant race folder or create a shared folder if needed.

## Holiday Template

```markdown
---
fc-date: {YYYY-MM-DD next occurrence in the campaign calendar}
fc-end: {YYYY-MM-DD end date if multi-day, omit if single day}
fc-category: Holiday
type: Holiday
name: {Holiday Name}
culture: {Human / Dwarven / Elven / Orc / Multi-Cultural}
region: {Where it's primarily celebrated}
recurrence: {Annual / Every N Years / Triggered / One-Time}
tags:
  - Holiday
  - {Culture}
  - {Region}
---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```

## Overview
{2-4 sentences. What this holiday is, who celebrates it, and why it matters to that culture. Use wiki-links to locations, groups, or deities when relevant.}

## Traditions
- {Bullet list of what happens during the celebration}
- {Rituals, competitions, feasts, performances, observances}
- {Keep to 3-5 items}

## Adventure Hooks
- {1-2 optional hooks for how the party could get involved}
- {Omit if the DM doesn't need them}

## DM Notes
{Leave empty. DM fills this in during play.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

### Brevity
- **10-second scan rule.** The DM should glance at the holiday and know what's happening.
- Overview: 2-4 sentences max. What, who, why.
- Traditions: 3-5 bullets. Each is one activity or ritual.
- Adventure Hooks are **opt-in only** — don't invent them unless the user asks.

### Cultural Authenticity
- Match the established tone for each race in the vault:
  - **Dwarven** — craftsmanship, forging, endurance, clan honor, Moradin
  - **Elven** — nature, ancestry, arcane arts, long cycles, Sylvana
  - **Human** — harvest, seasons, governance, community, practical piety
  - **Orc** — strength, hunting, combat, tribal leadership, survival
- Check existing holidays for the same culture and don't contradict their themes.

### Calendarium Integration
- Always include `fc-date` for the next occurrence in the campaign calendar.
- Use the Eldoria calendar format: `YYYY-MM-DD` (e.g., `0496-03-50` for end of month 3, year 496).
- For recurring holidays, note the recurrence interval in the `recurrence` field.
- Multi-day festivals should have both `fc-date` and `fc-end`.

### General
- Holidays are world flavor first, adventure hooks second. Not every festival needs a plot.
- Link to locations where the holiday is celebrated and deities/cultural figures it honors.
- If a holiday involves NPCs with files, link to them.

## Converting Existing Holidays

Some existing holidays have inconsistent YAML frontmatter. When converting:

1. **Read the existing file** before changing anything
2. **Add missing frontmatter fields** — some already have `fc-date` and `fc-category`; add `type: Holiday`, `name`, `culture`, `region`, `recurrence`, `tags`
3. **Restructure content** into Overview and Traditions sections
4. **Preserve the dataview block** — all files should end with the "Mentioned In" query
5. **Don't add unwanted sections** — if the existing file has no adventure hooks, don't invent them
6. **For batch conversions** — list files first, confirm with user, convert one at a time

## Cascading Creation

When creating a holiday, check if it references supporting content:
- Does the holiday involve a specific location that doesn't have a file? Ask if you should create it using the **dnd-location-generator** or **dnd-settlement-generator** skill.
- Does the holiday name-drop a deity or cultural figure that could be an NPC? Ask if you should create them using the **dnd-npc-generator** skill.
- Could the holiday serve as the backdrop for an encounter? Ask if you should prep one using the **dnd-encounter-builder** skill.
- Does the holiday tie into a faction or guild's activities? Note the **dnd-group-generator** skill.
