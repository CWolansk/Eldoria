---
name: dnd-consequence-generator
description: >
  Generate consequence files tracking the ripple effects of player actions in the Eldoria D&D campaign.
  Use this skill whenever the user wants to record what happened because of a player choice, failed quest,
  NPC death, collateral damage, or any cascading world change triggered by the party's actions.
  Also use when the user mentions consequences, fallout, repercussions, ripple effects, world reactions,
  NPC revenge, reputation damage, or tracking how a past event changes the world — even if they don't say "consequence" explicitly.
  Do NOT use for session logs (use dnd-event-generator).
  Do NOT use for quest definitions (use dnd-quest-generator).
  Do NOT use for encounter prep (use dnd-encounter-builder).
---

# Eldoria Consequence Generator

Create consequence files that track how player actions ripple through the world. Consequences are **DM-only** notes that link a triggering event to its cascading effects across NPCs, factions, locations, and future sessions.

Consequences are distinct from:
- **Events** (`dnd-event-generator`) — what happened during a session
- **Quests** (`dnd-quest-generator`) — jobs the party can take
- **Encounters** (`dnd-encounter-builder`) — combat/social prep

A consequence answers: "Because the party did X, the world changed in these ways."

## What You Need From the User

At minimum: a **triggering event** and what **changed** because of it. Look for:

- What the party did (or failed to do)
- Which event/quest/session triggered this
- Which NPCs, factions, or locations are affected
- Whether it's resolved or still active
- How severe the impact is (minor, moderate, major)
- Any future complications or escalation paths

## Shared Conventions

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, plugin syntax, and batch creation order.

## Before You Create

Always **search the vault first**:
1. Search `Private/2. Reference/Events/03-Consequences/` for existing consequence files — don't duplicate
2. Find the triggering event or quest file to link to
3. Check that affected NPCs, factions, and locations have files
4. Look at existing consequence files to match format conventions

## File Paths

Consequences are organized by resolution status:

```
Private/2. Reference/Events/03-Consequences/Active/{Consequence Name}.md
Private/2. Reference/Events/03-Consequences/Resolved/{Consequence Name}.md
```

Consequences are **DM-only** — they do not get a public counterpart. If the players can see the effects, those go in the relevant NPC, location, or event public files instead.

## Consequence Template

```markdown
---
fc-date: {YYYY-MM-DD in-game date when consequence began}
fc-end: {YYYY-MM-DD in-game date when resolved, if applicable}
fc-category: Consequences
type: Consequence
name: {Consequence Name}
status: {Active / Resolved / Escalating}
severity: {Minor / Moderate / Major}
trigger: {Name of triggering event/quest/session}
affected_entities:
  - {NPC, faction, or location name}
tags:
  - Consequence
  - {Region}
  - {City}
---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```

## Trigger
{1-2 sentences. What the party did or failed to do. Link to the triggering event, quest, or session file.}

Consequences of the results of [[{Triggering Event or Quest}]]

## Impact
- {Bullet list of what changed in the world}
- {Who is affected and how — link to NPC/faction/location files}
- {Keep to 2-5 bullets}

## Current Status
{1-2 sentences. Is this consequence still playing out? Has it been resolved? Is it escalating?}

## DM Notes
{Leave empty. DM fills this in during play.}

The following sections are **optional** — only include if the user specifies:

## Escalation Path
{What happens if the party doesn't address this? How does it get worse over time?}

## Resolution Options
{How can the party fix, mitigate, or address this consequence?}

## Related Files
{Wiki-links to connected quests, events, NPCs, and consequences.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

### Brevity
- **10-second scan rule.** The DM should scan the consequence at a glance.
- Use fragments and short bullets. No prose.
- Impact section: 2-5 bullets. Each describes one concrete change.
- The trigger should be 1-2 sentences with a link, not a recap of the whole session.

### Consequences Are World Changes
Focus on **what changed**, not what happened. "Guard captain now hostile to party" is a consequence. "The party fought the guards and killed three of them" is an event. Keep consequences forward-looking — they describe the new state of the world.

### Severity Scale
- **Minor** — local reputation change, one NPC's attitude shifts, small economic impact
- **Moderate** — faction relations change, multiple NPCs affected, quest giver becomes hostile, town-wide impact
- **Major** — regional political shift, war escalation, permanent NPC death with cascading effects, new threats emerge

### Status Tracking
- `Active` — still affecting the world, party hasn't addressed it
- `Resolved` — party has dealt with it or time has passed and it's settled
- `Escalating` — getting worse because the party hasn't addressed it

### General
- Always link back to the triggering event/quest/session.
- Link to every affected NPC, faction, and location.
- If a consequence creates a new quest opportunity, note it and ask if you should create one using the **dnd-quest-generator** skill.
- If a consequence leads to an encounter, note it and ask if you should prep it using the **dnd-encounter-builder** skill.

## Converting Existing Consequences

Some existing consequence files have minimal YAML and freeform content. When converting:

1. **Read the existing file** before changing anything
2. **Add missing frontmatter fields** — most already have `fc-date`, `fc-category`; add `type`, `name`, `status`, `severity`, `trigger`, `affected_entities`, `tags`
3. **Restructure content** into Trigger, Impact, and Current Status sections
4. **Preserve all wiki-links** — triggering event links, NPC references, session links
5. **Don't invent content** — if the file is a stub, add the structure but keep content minimal
6. **For batch conversions** — list files first, confirm with user, convert one at a time

## Cascading Creation

When creating a consequence, check if it needs supporting content:
- Are there affected NPCs that don't have files? Ask if you should create them using the **dnd-npc-generator** skill.
- Does the consequence create a new quest the party could take? Ask if you should create it using the **dnd-quest-generator** skill.
- Does the consequence involve a faction or group without a file? Ask if you should create one using the **dnd-group-generator** skill.
- Does the consequence escalate into a specific encounter? Ask if you should prep it using the **dnd-encounter-builder** skill.
- Does the consequence affect a location that should be updated? Note the location file that needs editing.
