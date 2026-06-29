---
name: dnd-session-prep
description: >
  Assemble a prep sheet for the next Eldoria D&D session by pulling together the party's current
  location and level, active quests, open consequences, live storylines and narratives, and the NPCs,
  locations, and encounters likely to come up — into one scannable "run this session" document.
  Use this skill whenever the user wants to prep, plan, or get ready to run the next session, asks what
  they should have ready, or wants to know what's hanging over the party right now.
  Also use when the user mentions session planning, getting ready to run, or "what do I need for next time" —
  even if they don't say "prep" explicitly. This is the forward-looking counterpart to dnd-session-digest.
---

# Eldoria Session Prep

Pull the campaign's live state into a single prep sheet the DM can run from. This is the **bookend to `dnd-session-digest`**: digest processes a session *after* it's played; prep gets the DM ready *before*. Like digest, this skill is **read-and-propose** — it researches and drafts, the DM approves, then it writes.

## What You Need From the User

- Which session is coming up (or just "next session").
- Optionally: where the party is headed, or anything specific the DM wants to set up.

If unspecified, infer from the most recent session journal.

## Shared Conventions

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md) for searching the vault, brevity, read-aloud formatting, and delegating creation to other skills.

## Step 1 — Research the Live State

Search the vault to reconstruct where things stand (do **not** create anything yet):

- **Where we left off:** the latest `Private/2. Session Journals/Session {N} Notes.md`.
- **Party status:** levels, current location, and standing from `Private/1. The Party/`.
- **Active quests:** `Private/2. Reference/Events/Quests/Active/`.
- **Open consequences:** `Private/2. Reference/Events/Consequences/Active/` — fallout that may surface.
- **Live storylines & narratives:** `Private/2. Reference/Storylines/` and `Private/2. Reference/Narratives/`.
- **Local context:** NPCs, stores, groups, and locations near the party's current/expected position.

## Step 2 — Propose the Prep Sheet

Present a draft **in chat** for the DM to approve, edit, or trim. Keep every section to the 10-second-scan standard. Structure:

```markdown
---
type: SessionPrep
session: {N}
date: {real-world or in-world date if given}
tags:
  - SessionPrep
---

## Where We Left Off
- {1-3 bullets from the last journal — the cliffhanger, the open question.}

## Party Status
- **Level:** {L}  **Location:** [[...]]
- {Notable conditions, resources, debts, or boons.}

## Active Threads
- **Quests:** {linked active quests + one-line "next beat".}
- **Consequences:** {fallout that could surface this session.}
- **Storylines:** {personal/faction arcs that are warm right now.}

## Likely This Session
- **NPCs:** {who the party may meet — links.}
- **Places:** {locations they may visit — links.}
- **Encounters:** {fights/social challenges to have ready — links or "build needed".}

## Prep Checklist
- [ ] {Things to build before play — encounters, NPCs, a map, a handout.}

## DM Notes
{Reminders, pacing notes, what you want to happen — open-ended.}
```

## Step 3 — Write & Delegate

On approval:
1. Save the prep sheet to `Private/0.DM Screen/Session {N} Prep.md` (at-the-table use). Confirm the location if the DM prefers it beside the journals.
2. For each unchecked item that needs new content, **delegate** — don't build it inline:
   - Encounters → `dnd-encounter-builder`
   - A planted story beat or guided setup → `dnd-narrative-planner`
   - Missing NPCs / stores / locations → the matching generator
3. Confirm with the DM before creating each piece (per [CONVENTIONS.md](../CONVENTIONS.md) — confirm before bulk operations).

## Relationship to Other Skills

- **`dnd-session-digest`** runs after the session; this runs before. Together they bookend play.
- **`dnd-storyline-tracker`** answers "where are we with thread X"; this answers "what's hot across *all* threads for next time".
- **`dnd-narrative-planner`** plans how to land a specific goal; this surfaces which goals are ripe to pursue.
