# Eval Output — Ember River Bridge Destroyed Consequence

## Step 1: Read Skill & Conventions

Read the `dnd-consequence-generator` skill at `.github/skills/dnd-consequence-generator/SKILL.md` and `CONVENTIONS.md` at `.github/skills/CONVENTIONS.md`.

Key rules from the skill:
- Consequences are **DM-only** — no public counterpart
- File path: `Private/2. Reference/Events/Consequences/Active/{Name}.md` (Active since this is ongoing)
- Required sections: Trigger, Impact, Current Status, DM Notes
- Optional sections (Escalation Path, Resolution Options, Related Files) — only if user specifies
- Severity scale: Minor / Moderate / Major
- Status options: Active / Resolved / Escalating
- Always link to triggering event/quest/session, affected NPCs, factions, locations
- 10-second scan rule — fragments over prose, 2-5 impact bullets

Key rules from CONVENTIONS.md:
- Tags in PascalCase, no `#` prefix in YAML
- Wiki-links: `[[Path/To/File|Display Name]]`
- Private notes can link to anything
- Search before creating

## Step 2: Vault Search Results

### Search for existing bridge/Ember River content
- **No existing consequence** for a bridge destruction or Ember River event
- No event file for the 0496-03-20 bridge destruction

### Search for Highreach
- **Found:** `Private/1. World Almanac/World/Crestfall/Highreach/Highreach.md` (private)
- **Found:** `Public/World/Crestfall/Highreach/Highreach.md` (public)
- Highreach is in the **Crestfall** region

### Search for Stonehaven
- **Found:** `Private/1. World Almanac/World/Crestfall/Stonehaven/Stonehaven.md` (private)
- **Found:** `Public/World/Crestfall/Stonehaven/Stonehaven.md` (public)
- Stonehaven is also in the **Crestfall** region
- Existing event: `The Sealed Gates of Stonehaven` — Stonehaven was previously under lockdown (separate storyline)

### Search for Merchants Guild
- **Found:** `Private/1. World Almanac/World/Groups/Merchants Guild.md` — led by [[Alistair Goldman]], dominant trade org in Highreach
- **Found:** `Public/World/Groups/Merchants Guild.md` (public)
- **Found:** `Private/1. World Almanac/World/Crestfall/Highreach/HighReach Merchants Guild.md` — local Highreach chapter
- Merchants Guild Quest Line is an ongoing storyline referenced in Overall.md
- Related consequences: `Jarek Ironfist gets killed` (Resolved), `Party Ambushed by Merchant Guild Bandits` (Resolved)

### Search for existing consequences
- Existing consequences in `Resolved/`: Jarek Ironfist gets killed, Party Ambushed by Merchant Guild Bandits, Highreach Duplirat Invasion
- Existing consequences in `Ideas/`: Randi Kills Looters Consequence, Flushed Heirloom Failed Quest Consequence, Escaped Imp
- **No `Active/` folder exists yet** — created with this file

### Search for triggering event
- No event file exists for 0496-03-20 bridge destruction
- No session journal explicitly covers this date
- The Merchants Guild Quest Line is the broader narrative context

## Step 3: Reasoning

**Severity: Major** — This consequence affects regional trade between two settlements, cuts off a town's supply routes, and angers a powerful faction (the Merchants Guild). Multiple entities impacted. This is clearly beyond Moderate (town-wide) and into Major (regional impact, multiple settlements, faction-level response).

**Status: Active** — The bridge is destroyed, no one has fixed it, and the impacts are ongoing. Not Escalating yet (no stated worsening beyond the initial impacts), but clearly Active.

**No triggering event file** — The user described the event but there's no event file in the vault for it. The Trigger section describes what happened with links to the relevant entities. Suggested creating an event file as a follow-up.

**Optional sections omitted** — The user didn't explicitly request Escalation Path, Resolution Options, or Related Files. Following the skill rule: "Sections like Secrets, Plot Hooks, and Relationships are opt-in only."

**Tags** — `Consequence` (entity type), `Crestfall` (region), `Highreach` and `Stonehaven` (affected cities). Following PascalCase convention.

## Step 4: Created File

**Path:** `Private/2. Reference/Events/Consequences/Active/Ember River Bridge Destroyed.md`

### Full File Content:

```markdown
---
fc-date: 0496-03-20
fc-category: Consequences
type: Consequence
name: Ember River Bridge Destroyed
status: Active
severity: Major
trigger: Party's escape from Merchants Guild enforcers
affected_entities:
  - "[[Private/1. World Almanac/World/Crestfall/Stonehaven/Stonehaven|Stonehaven]]"
  - "[[Private/1. World Almanac/World/Crestfall/Highreach/Highreach|Highreach]]"
  - "[[Private/1. World Almanac/World/Groups/Merchants Guild|Merchants Guild]]"
tags:
  - Consequence
  - Crestfall
  - Highreach
  - Stonehaven
---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```

## Trigger
Party destroyed the old stone bridge over the Ember River between [[Private/1. World Almanac/World/Crestfall/Highreach/Highreach|Highreach]] and [[Private/1. World Almanac/World/Crestfall/Stonehaven/Stonehaven|Stonehaven]] while fleeing [[Private/1. World Almanac/World/Groups/Merchants Guild|Merchants Guild]] enforcers on 0496-03-20.

## Impact
- Trade caravans between [[Private/1. World Almanac/World/Crestfall/Highreach/Highreach|Highreach]] and [[Private/1. World Almanac/World/Crestfall/Stonehaven/Stonehaven|Stonehaven]] can no longer cross the Ember River
- [[Private/1. World Almanac/World/Crestfall/Stonehaven/Stonehaven|Stonehaven]] cut off from supply routes — shortages imminent
- [[Private/1. World Almanac/World/Groups/Merchants Guild|Merchants Guild]] furious — likely to demand reparations or retaliate
- Regional trade disrupted; merchants forced to reroute through longer, costlier paths

## Current Status
Active. Bridge is destroyed, no reconstruction effort underway. Stonehaven's supply situation worsens daily. Merchants Guild has not yet responded formally but tensions are rising.

## DM Notes


---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Step 5: Follow-Up Suggestions

### Cascading Creation Opportunities

1. **Event file for the bridge destruction** — No event file exists for 0496-03-20. Want me to create one using the `dnd-event-generator` skill? This would give the Trigger section a proper `[[event link]]` to reference.

2. **Quest: Rebuild the Ember River Bridge** — Stonehaven or Highreach officials could post a quest to rebuild or find an alternate crossing. Want me to create a quest using the `dnd-quest-generator` skill?

3. **Quest: Merchants Guild Reparations** — The Merchants Guild may demand the party pay for damages or perform a task to make amends. Could be a quest or escalation encounter.

4. **Encounter: Merchants Guild Retaliation** — If the Guild decides to send enforcers after the party again, want me to prep an encounter using the `dnd-encounter-builder` skill?

5. **Location file: Ember River Bridge** — The bridge itself could be a location file (now a ruin/landmark) using the `dnd-location-generator` skill.

6. **Settlement file updates** — The Highreach and Stonehaven settlement files may need notes about the severed trade route added to their current affairs/events sections.
