---
name: dnd-storyline-tracker
description: >
  Track, summarize, and brainstorm storylines in the Eldoria D&D campaign by searching the vault
  for all content related to a plot thread, character arc, or quest chain, then presenting a timeline
  and suggesting next steps. Use this skill whenever the user wants to trace a storyline through the vault,
  get a summary of where a plot thread stands, brainstorm personal storylines for a player character,
  identify loose threads that need attention, or figure out what should happen next in a narrative arc.
  Also use when the user says things like "where are we with the artifact quest", "what's happening with
  Jon's plan", "give me storyline ideas for Randi", "trace the merchants guild thread", "what loose plot
  threads do we have", "what should happen next with the Foundation", "summarize the main quest",
  "brainstorm a character arc for JP", or any request about following narrative threads through session
  journals, events, consequences, and quests — even if they don't say "storyline" explicitly.
  Do NOT use for creating individual events (use dnd-event-generator).
  Do NOT use for session-to-vault processing (use dnd-session-digest).
  Do NOT use for broken link audits (use dnd-vault-auditor).
---

# Eldoria Storyline Tracker

Search the vault for everything related to a storyline, plot thread, or character arc. Pull it together into a scannable timeline with a status check and suggestions for what could happen next. The DM reviews suggestions and decides what to develop — nothing gets created without approval.

This skill has two modes:

1. **Storyline Audit** — trace an existing plot thread (a quest chain, faction conflict, NPC arc, the main campaign storyline) through session journals, events, consequences, and quests. Produce a timeline of what's happened and where things stand.
2. **Storyline Ideation** — brainstorm new personal storylines for a player character or faction based on their class, backstory, relationships, and recent events. Suggest hooks, not scripts.

Both modes end with suggestions presented in chat. The DM picks what sounds good, and then you use the appropriate generator skills to create the actual files.

## What You Need From the User

**For Storyline Audit:**
- A storyline name, quest, NPC, faction, or concept to trace (e.g., "the artifact collection", "Jon's master plan", "Merchants Guild corruption")
- Optionally: which sessions or time range to focus on

**For Storyline Ideation:**
- A player character name (e.g., "Randi", "JP", "Liz")
- Or a faction/group name to develop
- Optionally: a tone or theme ("something personal", "comedic", "dark secret from their past")

If the user is vague ("what storylines do we have?"), run a broad audit — scan session journals and the Overall.md campaign summary to identify all active threads, then present them as a menu for the DM to pick from.

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for tag formatting, linking rules, and brevity standards.

This skill produces analysis in chat first. After presenting results, it can **save storyline notes** as paired private/public files. For entity creation suggested by the audit (new quests, NPCs, events, etc.), delegate to the appropriate skill:
- Storyline notes → this skill (see "Creating Storyline Notes" below)
- New quests → `dnd-quest-generator`
- New events → `dnd-event-generator`
- New NPCs → `dnd-npc-generator`
- New consequences → `dnd-consequence-generator`
- New encounters → `dnd-encounter-builder`
- New locations → `dnd-location-generator`

## Mode 1: Storyline Audit

### Step 1: Identify the Thread

Figure out what the DM is asking about. A "storyline" could be:
- **Main campaign arc** — the artifact collection quest, Jon's master plan
- **Faction thread** — Merchants Guild corruption, Exterminators Guild politics, the Foundation
- **NPC arc** — a recurring character's trajectory across sessions
- **Regional thread** — what's happening in a specific region or settlement
- **Player character arc** — how a PC's personal story has developed

### Step 2: Search the Vault

Cast a wide net. For the target storyline, search across:

1. **Overall.md** — `Private/2. Reference/Overall.md` has the campaign summary with act structure and loose threads
2. **Session journals** — `Private/2. Session Journals/Session * notes.md` for raw session content mentioning the thread
3. **Events** — `Private/2. Reference/Events/World Events/` for timeline events related to the thread
4. **Consequences** — `Private/2. Reference/Events/Consequences/` for active/resolved consequences
5. **Quests** — `Private/2. Reference/Events/Quests/` for quest files (active, completed, missed, ideas)
6. **NPCs** — grep for key NPC names involved in the thread
7. **Groups** — check faction files for relevant organizations
8. **DM scratch notes** — `Private/0.Scratch Notes/` may have planning notes

Use grep broadly — search for the storyline name, key NPC names, location names, and related keywords. A storyline often spans many files under different names (e.g., "the artifact quest" touches Jon, the Seekers Eye, the mines, the Nightstalkers, etc.).

### Step 3: Build the Timeline

Assemble everything into a chronological timeline. Each entry should be:

```markdown
## Storyline: {Thread Name}

### Timeline
| Session | Date (in-game) | What Happened | Key Files |
|---------|----------------|---------------|-----------|
| 1-2 | 0496-02-50 | Party summoned, deceived by Jon, sent to retrieve Seekers Eye | [[Party Summoned to world]], [[Party Visits Wizards Tower]] |
| 3-9 | 0496-03-01 | Mine exploration, found Nightstalkers, Jon's betrayal revealed | [[Party becomes E Rank Adventurers]], [[Merchants Guild Quest Line]] |
| 9 | 0496-03-06 | Jon steals Seekers Eye, reveals himself as lich, mine collapses | — |

### Current Status
- **Where things stand**: {1-3 bullets on the current state}
- **Active consequences**: {Link to any active consequence files}
- **Open quests**: {Link to any related active quests}
- **Unresolved threads**: {Dangling plot points with no resolution yet}

### What's Missing
- {Events mentioned in session journals but no event file exists}
- {NPCs referenced in sessions or events but no NPC file created}
- {Consequences that should be tracked but aren't — party actions with unrecorded ripple effects}
- {Existing files in old `::` format that need modernizing}
- {Private-only files that need a public counterpart}
```

Keep the timeline scannable. One row per major beat, not per minor detail.

### Step 4: Suggest Next Steps

Based on the timeline and current status, suggest 3-5 possible next beats for this storyline. These are **hooks, not scripts** — short ideas the DM can riff on. Frame them as questions or "what if" prompts:

```markdown
### Suggested Next Steps
1. **The Seekers Eye activates** — Jon now has the compass. What's he looking for next? The party could learn through rumors or a faction contact that artifacts in the Silverleaf Lands are being sought.
2. **Nightstalker widows seek answers** — The widows know the party went into the mines. Do they come asking for closure? Could become a personal quest or a guilt-driven investigation.
3. **The Foundation reaches out** — The secret society noticed the party. A cryptic message, a meeting in the shadows. What do they know about Jon?
```

Don't over-explain. Each suggestion is 1-2 sentences. The DM decides which to pursue, and you create the actual quest/event/NPC files using the relevant skills.

## Mode 2: Storyline Ideation

### Step 1: Research the Character

Read the player's file from `Private/1. The Party/Players/` and search the vault for everything involving them:

- **Character sheet basics** — class, race, background, status
- **Session appearances** — grep session journals for the character name and player name
- **Existing interactions** — NPCs they've built relationships with
- **Mechanical interests** — what abilities they use, what kind of encounters they gravitate toward
- **Campaign summary** — check Overall.md for any existing character-specific threads

Also check `Private/2. Reference/Overall.md` for campaign themes and tone — storyline ideas should fit the "Saturday morning cartoon adventure" feel with consequence-driven choices.

### Step 2: Identify Story Seeds

Look for natural hooks based on:

- **Class/subclass** — a Wizard might encounter rival arcanists, lost spellbooks, magical anomalies. A Fighter with an Archaeologist background might find ancient ruins relevant to their expertise.
- **Race** — an Aarakocra in a human kingdom is unusual. Who else is like them? What's their connection to home?
- **Background** — Sailor backgrounds connect to port towns, ships, naval conflicts. Guild Merchants connect to trade disputes.
- **Existing relationships** — NPCs they've bonded with, organizations they've joined, enemies they've made
- **Recent events** — what happened in the last few sessions that could spin off into a personal thread?
- **Gaps** — what *hasn't* this character explored yet? Every PC should have a thread that's uniquely theirs.

### Step 3: Pitch 3-5 Ideas

Present storyline ideas as short pitches. Each pitch is a concept and a possible opening hook — not a full quest outline. The DM picks what resonates and you develop it from there.

```markdown
## Storyline Ideas for {Player/Character}

### 1. {Pitch Title}
{1-2 sentences. What's the concept? What's the opening hook — the thing that would happen in the next session or two to kick this off?}

### 2. {Pitch Title}
{Same format.}

### 3. {Pitch Title}
{Same format.}
```

Keep each pitch to 2-3 sentences max. The point is to spark the DM's imagination, not to write the story for them. If the DM likes a pitch, ask follow-up questions to flesh it out, then create the appropriate files (quest, NPC, event, location) using the relevant generator skills.

### Pitch Quality Guide

Good pitches:
- Connect to something that already exists in the vault (an NPC, a location, a faction)
- Fit the campaign's tone (adventurous, consequence-driven, a bit humorous)
- Give the player character something only *they* can do or care about
- Have a clear first step ("next session, this NPC approaches them" or "they find a mysterious letter")

Bad pitches:
- Generic fantasy tropes with no vault connection ("a mysterious stranger appears")
- Require the DM to build an entire subplot from scratch
- Overshadow the main campaign storyline
- Force the spotlight away from other players for too long

## Broad Audit: "What Storylines Do We Have?"

When the DM asks for a general overview rather than tracing a specific thread:

1. Read `Private/2. Reference/Overall.md` for the campaign summary and loose threads
2. Scan recent session journals (last 3-4 sessions) for active plot points
3. Check `Private/2. Reference/Events/Consequences/Active/` for unresolved consequences
4. Check `Private/2. Reference/Events/Quests/Active/` for open quests

Present a menu of active threads:

```markdown
## Active Storylines

### Main Arc
- **The Artifact Collection** — Jon has the Seekers Eye. Party knows he's a lich. Next artifacts are in Silverleaf Lands. {Status: Act 1 complete}

### Faction Threads
- **Merchants Guild Corruption** — Jarek Ironfist killed, party ambushed by guild bandits. {Status: Unresolved}
- **The Foundation** — Party inducted into secret society. Elder Rowan gave badges. {Status: Just introduced}
- **Exterminators Guild** — Party are members. Pip Whiskerwind connection. {Status: Active, minor}

### Character Threads
- **JP's Ship** — Impounded at Ardenville docks. {Status: Unresolved}
- **Randi's Looter Incident** — Killed looters during rat invasion. {Status: Consequence active}

### Loose Threads
- **Dr. Brule the Mule** — Fled during chaos, hoofprints toward Ardenville
- **Vineyard Blight** — Rumors from Eastvale
- **Blackwood Forest Whispers** — Unsettling reports

Which of these would you like me to trace in detail, or should I brainstorm next steps for any of them?
```

The DM picks threads to dive into, and you switch to Mode 1 (audit) or suggest next steps as appropriate.

## Creating Storyline Notes

After an audit or ideation session, the DM may want to save the results as vault files. Storyline notes follow the standard paired private/public pattern.

### File Paths

| Scope | Path |
|-------|------|
| Private | `Private/2. Reference/Storylines/{Storyline Name}.md` |
| Public | `Public/Storylines/{Storyline Name}.md` |

Create the directories if they don't exist yet — the Storylines folders may not have been created until the first storyline note is saved.

### Public Template

The public file is the single source of truth for what the **party** knows. Write as if a player is reading.

```yaml
---
type: Storyline
tags:
  - Storyline
  - {RegionTag or FactionTag as relevant}
status: active  # active | resolved | dormant
---
```

```markdown
# {Storyline Name}

## Summary
> {1-2 sentence recap the DM can read aloud — "the story so far" from the party's perspective}

## What the Party Knows
- {Key facts the party has learned}
- {Events they witnessed}
- {Decisions they made}

## Key People
- [[Public/World/.../NPC Name|NPC Name]] — {role in storyline}

## Key Places
- [[Public/World/.../Location Name|Location Name]] — {relevance}

## Open Questions
- {Things the party is wondering about or investigating}

## Timeline
| Session | What Happened |
|---------|---------------|
| 3 | Discovered the mines were corrupted |
| 9 | Jon revealed as a lich, stole the Seekers Eye |

---
```dataview
LIST
FROM [[]] AND "Public"
WHERE file.path != this.file.path
```
```

**Public linking rules apply** — link only to other public files under `Public/`.

### Private Template

The private file **embeds** the public file and adds DM-only content below. No duplicating what's in the public file.

```yaml
---
type: Storyline
tags:
  - Storyline
  - {RegionTag or FactionTag as relevant}
status: active  # active | resolved | dormant
---
```

```markdown
# {Storyline Name}

![[Public/Storylines/{Storyline Name}]]

## DM Notes
- {Hidden context, motivations, connections the party doesn't know}

## Secrets
- {Reveals the party will discover later}
- {Hidden NPC motivations}

## Future Plans
- {Where this storyline is heading}
- {Suggested next beats from the audit}

## Vault Gaps
- {Missing files that should be created}
- {Stub events that need fleshing out}

## Related Files
- [[Private/.../File|Display Name]]

---
```dataview
LIST
FROM [[]]
WHERE file.path != this.file.path
```
```

### When to Create Storyline Notes

- After a **storyline audit** — save the timeline, status, and DM plans as a persistent reference
- After a **broad audit** — save the overview of all active threads so the DM can reference it between sessions
- After **storyline ideation** — save approved character arc ideas so they don't get lost
- When the DM says **"save this"**, **"make a note of this"**, or **"I want to track this"**

Always present the audit or ideation results in chat first. Only create files when the DM confirms.

### Updating Existing Storyline Notes

Storyline notes are living documents. After each session digest or new audit:
- Update the **public file** timeline and "What the Party Knows" with newly revealed info
- Update the **private file** DM Notes, Secrets (remove revealed ones), and Future Plans
- Keep both files in sync — but never leak unrevealed secrets into the public file

## What This Skill Does NOT Do

- **Does not replace session digest** — session-digest processes a single session into vault updates. This skill traces themes *across* sessions.
- **Does not plan encounters** — use dnd-encounter-builder for that. This skill might *suggest* that an encounter would be a good next beat, but it doesn't build the stat blocks.
- **Does not build narrative roadmaps** — if the DM has a specific goal ("I want Julie to find a cursed sword") and needs a plan for how to get there across sessions, use `dnd-narrative-planner`. This skill identifies *what could happen*; the narrative planner plans *how to make it happen*.
- **Does not audit vault consistency** — use dnd-vault-auditor for broken links and stale references. This skill is about narrative, not file hygiene.
