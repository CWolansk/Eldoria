---
name: dnd-quest-generator
description: >
  Generate quests for the Eldoria D&D campaign with structured YAML frontmatter and scannable markdown.
  Use this skill whenever the user wants to create a new quest, side quest, guild quest, bounty, errand,
  or any task the party can accept and complete for a reward.
  Also use when the user mentions creating quest board entries, mission briefs, investigation quests,
  fetch quests, escort missions, or any named job with objectives and rewards — even if they don't say "quest" explicitly.
  Do NOT use for session logs or historical events (use dnd-event-generator).
  Do NOT use for encounter/combat prep (use dnd-encounter-builder).
  Do NOT use for consequences of player actions (use dnd-consequence-generator).
---

# Eldoria Quest Generator

Create quests as markdown files in the Eldoria vault. Quests are **jobs the party can take** — they have objectives, rewards, and outcomes. They live in the DM's reference folder and are **DM-only** (no public counterpart).

Quests are distinct from:
- **Events** (`dnd-event-generator`) — things that *happened*
- **Encounters** (`dnd-encounter-builder`) — combat/social challenges to prep
- **Consequences** (`dnd-consequence-generator`) — ripple effects of player actions

## What You Need From the User

At minimum: a **quest concept** or **name**. Everything else can be invented. Look for:

- Quest name
- Quest giver (NPC or organization)
- Location (where it takes place)
- Difficulty / adventure rank (F through A)
- Objectives
- Rewards (gold, items, guild points, reputation)
- Status (Available / Active / Completed / Failed)
- Any complications, investigation DCs, or branching outcomes

## Shared Conventions

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, plugin syntax, and batch creation order.

## Before You Create

Always **search the vault first**:
1. Search `Private/2. Reference/Events/01-Quests/` for existing quests — don't duplicate
2. Search `Private/2. Reference/Events/04-Ideas-and-Drafts/` for draft quest ideas that may already cover this
3. Check that the quest giver NPC and location have files to link to
4. Look at existing quest files (completed and active) to match format conventions

## File Paths

Quests are organized by status:

```
Private/2. Reference/Events/01-Quests/Completed/{Quest Name}.md
Private/2. Reference/Events/01-Quests/Side Quests/{Quest Name}.md
```

Draft or future quests go in:
```
Private/2. Reference/Events/04-Ideas-and-Drafts/Future Concepts/{Quest Name}.md
Private/2. Reference/Events/04-Ideas-and-Drafts/Missed Opportunities/{Quest Name}.md
```

## Quest Template

```markdown
---
fc-date: {YYYY-MM-DD in-game start date}
fc-end: {YYYY-MM-DD in-game end date, if completed}
fc-category: {Quests / Available Quests / Not Available Quests}
type: Quest
name: {Quest Name}
status: {Available / Active / Completed / Failed}
level: {F / E / D / C / B / A}
location: {Where it takes place}
region: {Region}
quest_giver: {NPC or organization name}
reward: {Brief reward summary}
difficulty: {Easy / Medium / Hard / Deadly, if applicable}
tags:
  - Quest
  - {Level}LevelQuest
  - {Region}
  - {City}
---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```

## Quest Overview

**Quest Giver**: [[{NPC or Org}]]
**Reward**: {Gold, items, guild points, reputation}
**Status**: {Available / Active / Completed / Failed}
**Difficulty**: {Level rank and/or Easy-Deadly}

{1-3 sentences. What the quest is and why it matters. Use wiki-links to NPCs, locations, groups.}

## Objectives
- {Bullet list of what the party needs to do}
- {Keep to 2-5 items}

## Key NPCs
- [[{NPC Name}]] — {role in this quest, one line}

## Investigation / Mechanics
{DCs, skill checks, clues, or mechanics relevant to this quest. Bullet list.}
{Omit entirely if this is a straightforward combat/fetch quest.}

## Potential Outcomes

### Success
- {What happens if the party completes the quest}
- {Rewards distributed}

### Failure / Ignored
- {What happens if the party fails or ignores the quest}
- {Consequences — link to consequence files if they exist}

## DM Notes
{Leave empty. DM fills this in during play.}

The following sections are **optional** — only include if the user specifies:

## Multiple Approaches
{If the quest has branching paths or multiple valid solutions.}

## Complications
{Twists, traps, moral dilemmas, or things that make this quest harder than it seems.}

## Connections
{Links to other quests, events, or plot threads this quest ties into.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

### Brevity
- **10-second scan rule.** The DM should scan the entire quest at a glance mid-session.
- Use fragments and short bullets. No prose paragraphs.
- Objectives: 2-5 bullets. Each is one clear task.
- Outcomes: 2-3 bullets per path. What changes, not how it feels.

### Quests Are Not Scripts
Write objectives and outcomes, not step-by-step scripts. "Rescue the missing netters" is a quest objective. "The party follows the trail to the lake and finds the boat" is a railroad. Leave room for the party to approach the quest however they want.

### Status Tracking
- `Available` — on the quest board, no one has taken it yet
- `Active` — the party has accepted it and is working on it
- `Completed` — done, rewards distributed
- `Failed` — the party failed or the quest expired

### Level Ranks
Match the vault's existing rank system:
- **F** — Beginner (level 1-2 party)
- **E** — Novice (level 3-5 party)
- **D** — Intermediate (level 5-7 party)
- **C** — Advanced (level 7-9 party)
- **B** — Expert (level 9-12 party)
- **A** — Master (level 12+ party)

### General
- Link generously to NPCs, locations, and groups involved.
- If the quest has investigation mechanics, include specific DCs and skill checks.
- Completed quests should record what actually happened in DM Notes.
- Failed/missed quests should link to their consequence files if consequences exist.

## Converting Existing Quests

Many existing quests have ad-hoc YAML frontmatter and inconsistent section structure. When converting:

1. **Read the existing file** before changing anything
2. **Map existing frontmatter** — most already have `fc-date`, `fc-end`, `fc-category`, `status`, `level`
3. **Add missing fields** — `type: Quest`, `name`, `location`, `region`, `quest_giver`, `reward`, `tags`
4. **Restructure sections** to match the template above — preserve all existing content
5. **Preserve all wiki-links** — NPC mentions, location references, event references
6. **Don't trim gameplay detail** — existing quests often have DCs, mechanics, and investigation branches that should be kept as-is
7. **For batch conversions** — list files first, confirm with user, convert one at a time

## Cascading Creation

When creating a quest, check if it needs supporting content:
- Does the quest giver have an NPC file? If not, ask if you should create one using the **dnd-npc-generator** skill.
- Does the quest location have a file? If not, ask if you should create it using the **dnd-location-generator** or **dnd-settlement-generator** skill.
- Is the quest tied to a guild or faction? Does that group have a file? If not, ask if you should create one using the **dnd-group-generator** skill.
- Does the quest have consequences if failed? Ask if you should create a consequence file using the **dnd-consequence-generator** skill.
- Does the quest involve a specific encounter? Ask if you should prep it using the **dnd-encounter-builder** skill.
