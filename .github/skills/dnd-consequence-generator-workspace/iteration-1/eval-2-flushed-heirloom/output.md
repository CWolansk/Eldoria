# Consequence Request: Flushed Heirloom Failed Quest

## Vault Search Results

### 1. Searched `Private/2. Reference/Events/Consequences/` for existing consequence files

Found 6 consequence files in the vault:

**Resolved:**
- `Party Ambushed by Merchant Guild Bandits.md`
- `Jarek Ironfist gets killed.md`
- `Highreach Duplirat Invasion.md`

**Ideas:**
- **`Flushed Heirloom Failed Quest Consequence.md`** — **existing file for this exact scenario**
- `Randi Kills Looters Consequence.md`
- `Escaped Imp.md`

### 2. Searched vault for the Flushed Heirloom quest file

Found the quest file at `Private/2. Reference/Events/Quests/Missed/Flushed Heirloom.md`:

```markdown
---
fc-date: 0496-03-06
fc-end: 
fc-category: Not Available Quests
type: Quest
name: Flushed Heirloom
status: Missed
level: E
location: Highreach
region: Crestfall
quest_giver: Beatrix Goldleaf
---

## Quest Overview

**Quest Giver**: [[Beatrix Goldleaf]]
**Status**: Missed
**Difficulty**: E

A very wealthy lady has dropped a family heirloom down a sewer grate and needs some adventurers to retrieve it for her.
The gang must enter the Sewers along with everything that entails minus the raatma.

## Key NPCs
- [[Beatrix Goldleaf]]

## Links
- [[Flushed Heirloom Failed Quest Consequence]]
```

The quest already links to the existing consequence file. Status is "Missed."

### 3. Searched vault for the quest giver NPC

Found `Private/2. Reference/NPCs/All NPCS/Beatrix Goldleaf.md`:

- **Race:** Human
- **Profession:** Jewelry Connoisseur
- **Location:** Highreach, Crestfall
- **Description:** Late 30s, warm honey-toned skin, cascade of thick dark blonde curls, deep emerald gown with gold embroidery
- **Flaw:** Materialistic to a fault
- **Bond:** Her jewelry collection — she'd do anything to protect it
- **DM Notes:** After the heirloom quest failed, she pulled funding from the Highreach Adventurers Guild and dislikes adventurers

The NPC file already references both `[[Flushed Heirloom Failed Quest Consequence]]` and `[[Flushed Heirloom]]`.

### 4. Searched vault for Highreach Adventurers Guild

Found at `Private/1. World Almanac/World/Crestfall/Highreach/Highreach Adventurers Guild.md`. Multiple NPCs are linked to the guild (Aric Stormblade, Ingrid Hightower, Thaldrin Stormblade as Guildmaster, etc.). The guild is referenced in the Highreach settlement file under Central Plaza.

---

## Existing File Found and Updated

An existing consequence file was found at:

`Private/2. Reference/Events/Consequences/Ideas/Flushed Heirloom Failed Quest Consequence.md`

The file existed but was incomplete — it had `status: Idea`, an `Idea` tag, prose-format Impact section instead of bullets, used the old `FROM [[#this.file.name]]` dataview syntax, and was missing the Current Status and DM Notes sections required by the skill template.

**I updated the existing file** to match the full skill template with the user's additional details about reputation damage.

### Changes Made:
- `status: Idea` → `Active`
- Removed `Idea` tag
- Restructured Trigger to be 1-2 sentences with wiki-link (per template)
- Converted Impact from prose paragraph to bullet list (2-5 bullets, per template)
- Added reputation damage detail from user's request ("word spread that adventurers can't be trusted with personal favors")
- Added missing `## Current Status` section
- Added missing `## DM Notes` section (empty — DM fills in during play)
- Fixed dataview: `FROM [[#this.file.name]]` → `FROM [[]]`

### Updated File Content:

```markdown
---
fc-date: 0496-03-04
fc-end: 
fc-category: Consequences
type: Consequence
name: Flushed Heirloom Failed Quest Consequence
status: Active
severity: Moderate
trigger: Flushed Heirloom quest failure
affected_entities:
  - "[[Private/2. Reference/NPCs/All NPCS/Beatrix Goldleaf|Beatrix Goldleaf]]"
  - "[[Highreach Adventurers Guild]]"
tags:
  - Consequence
  - Crestfall
  - Highreach
---

## Trigger

The party never pursued the [[Flushed Heirloom]] quest — the heirloom remains lost in the Highreach sewers.

Consequences of the results of [[Flushed Heirloom]]

## Impact

- [[Private/2. Reference/NPCs/All NPCS/Beatrix Goldleaf|Beatrix Goldleaf]] is devastated — now openly hostile toward adventurers
- Beatrix pulled funding from the [[Highreach Adventurers Guild]]
- Word spread through [[Private/1. World Almanac/World/Crestfall/Highreach/Highreach|Highreach]] that the party can't be trusted with personal favors
- Future personal-favor quests in Highreach may be harder to come by

## Current Status

Active. Beatrix remains hostile and the funding cut stands. Reputation damage spreading through Highreach — locals hesitate to ask adventurers for personal help.

## DM Notes


---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

---

## Follow-Up Suggestions

1. **Move to Active folder** — The file is currently in `Consequences/Ideas/`. Since the status is now Active, it should be moved to `Consequences/Active/Flushed Heirloom Failed Quest Consequence.md`.

2. **No public file created** — Consequences are DM-only per the skill. The visible effects (Beatrix's attitude, guild funding cut) are already reflected in her NPC file and the Highreach Adventurers Guild file.

3. **Cascading creation opportunities:**
   - **Quest:** The heirloom is still in the sewers. If the party ever wants to repair the relationship, a follow-up retrieval quest could be created using the `dnd-quest-generator` skill.
   - **NPC update:** Beatrix Goldleaf's DM Notes already reflect her hostility. No further update needed.
   - **Guild impact:** If the funding cut should have mechanical effects on the Highreach Adventurers Guild (fewer resources, reduced quest board, etc.), the guild file could be updated.

4. **No optional sections included** — The user didn't request Escalation Path, Resolution Options, or Related Files, so those were omitted per the skill's opt-in rule.
