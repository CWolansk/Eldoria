---
name: dnd-session-digest
description: >
  Analyze session journals and propose world updates — new event files, NPC interaction entries, consequence
  records, and missing entity files — based on what happened during a session.
  Use this skill whenever the user wants to process a session journal, extract significant beats from a session,
  figure out what files need to be created or updated after a session, turn session notes into world content,
  or catch up on vault maintenance after playing.
  Also use when the user says things like "digest session 13", "what files should we create from this session",
  "process my session notes", "what did we miss from last session", "update the vault from session notes",
  or any request about turning raw session journals into structured vault content — even if they don't say
  "digest" explicitly.
  Do NOT use for creating a single event (use dnd-event-generator).
  Do NOT use for building future encounters (use dnd-encounter-builder).
  Do NOT use for checking broken links (use dnd-vault-auditor).
---

# Eldoria Session Digest

Read a session journal and propose a batch of vault updates — new event files, NPC interaction entries, consequence records, and flags for missing entities. The DM reviews and approves each proposal before anything gets created.

This skill is the bridge between messy session notes and a well-maintained vault. Session journals capture what happened at the table in real-time shorthand. This skill turns that into structured, linked, scannable world content.

## What You Need From the User

At minimum: which **session journal** to process. The user might say:
- "Digest Session 13"
- "Process my latest session notes"
- "What files should we create from Session 12?"

They may also specify focus areas ("just the NPC stuff") or exclude categories ("skip combat encounters, those were trivial").

If the user specifies a focus area, **only propose items in that category**. Don't include timeline events in an NPC-only digest, and don't propose NPC files in an events-only digest. Respect the scope.

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for file conventions, frontmatter, tags, dataview blocks, brevity, read-aloud formatting, search-before-create, and delegating creation to other skills.

It also delegates file creation to existing skills. Before creating any files, read the relevant skill:
- Timeline events → `dnd-event-generator`
- Consequences → `dnd-consequence-generator`
- Missing NPCs → `dnd-npc-generator`
- Missing stores/locations → `dnd-store-generator` / `dnd-location-generator`
- Missing groups → `dnd-group-generator`
- Quests → `dnd-quest-generator`

## The Digest Workflow

### Step 1: Read the Session Journal

Read the full session journal file from `Private/2. Session Journals/`. Session journals are raw DM notes — they contain encounter prep, read-aloud text, NPC dialogue, mechanical notes, and narrative beats mixed together. Your job is to separate "what actually happened" from "what was prepped but might not have happened."

Pay attention to:
- Sections that describe events in past tense or use phrases like "the party did X" → things that happened
- Sections with stat blocks, DC checks, dialogue options → encounter prep that *may* have happened
- Links to existing NPCs, locations, groups → entities already in the vault
- Names of NPCs, places, or groups with no wiki-links → possible missing entities

If the session journal links to a previous session (e.g., `[[Session 12 notes]]`), read that too for context on continuing storylines.

### Step 2: Search the Vault

Before proposing anything, search for what already exists:

1. **Existing timeline events** — Search `Private/2. Reference/Events/World Events/Timeline/` to avoid duplicating events that were already created
2. **Existing consequences** — Search `Private/2. Reference/Events/Consequences/` for active consequences
3. **Referenced NPCs** — For every NPC name mentioned, search the vault to check if they have files
4. **Referenced locations** — Same for settlements, shops, landmarks
5. **Referenced groups** — Same for guilds, factions, organizations
6. **Existing quests** — Search `Private/2. Reference/Events/Quests/` for quest files already covering these beats

### Step 3: Extract Significant Beats

Go through the session journal and identify every significant beat. A "significant beat" is anything that:
- Changes the world state (new alliances, broken trust, destroyed property, political shifts)
- Introduces a new NPC the party interacted with meaningfully
- Records a notable party accomplishment or failure
- Moves a quest forward, completes one, or picks up a new one
- Takes the party to a new location for the first time
- Involves a combat encounter worth recording
- Reveals important lore or secrets to the party
- Creates consequences that will ripple into future sessions

Categorize each beat as one of:

| Category | Description | Creates |
|---|---|---|
| **Timeline Event** | A notable thing that happened — meeting someone, arriving somewhere, a battle, a ceremony | Paired private + public event files |
| **Consequence** | A world change caused by party action (or inaction) that will matter later | Private consequence file |
| **NPC Interaction** | The party had a meaningful exchange with an existing NPC | Update to NPC's Interactions section |
| **Quest Update** | A quest was picked up, progressed, completed, or failed | New quest file or update to existing |
| **Missing Entity** | An NPC, location, or group mentioned in the session that has no vault file | Flag for creation |
| **Vault Maintenance** | An existing file that needs updating — old format, missing public counterpart, empty sections | Update to existing file |

### Step 4: Present the Proposal

Present findings as a numbered, scannable checklist grouped by category. This is the most important output — make it easy for the DM to quickly approve, reject, or modify items.

Format the proposal like this:

```markdown
## Session Digest: Session {N}

### Timeline Events (new paired files)
1. **"The Party Meets Salty Pete"** — Party encounters the washed-up captain in Ardenville who needs a crew for the boat race
   - Private: `Private/2. Reference/Events/World Events/Timeline/The Party Meets Salty Pete.md`
   - Public: `Public/World/Events/Timeline/The Party Meets Salty Pete.md`

2. **"Lake Arden Boat Race"** — The annual boat race on Lake Arden
   - Private: `Private/2. Reference/Events/World Events/Timeline/Lake Arden Boat Race.md`
   - Public: `Public/World/Events/Timeline/Lake Arden Boat Race.md`
   - ⚠️ Already exists as private-only — needs public counterpart

### Consequences (private-only)
3. **"Package Swap Fallout"** — If the party swapped the Exterminators Guild package, Pip Whiskerwind cuts them off
   - Path: `Private/2. Reference/Events/Consequences/Active/Package Swap Fallout.md`
   - Conditional: depends on what the party chose

### NPC Interaction Updates
4. **Salty Pete** — Add interaction link to `[[The Party Meets Salty Pete]]`
   - File: `Public/World/Crestfall/Ardenville/NPCs/Salty Pete.md`
   - Section: `## Interactions`

5. **Pip Whiskerwind** — Add interaction for package delivery
   - File: `Public/World/Crestfall/Highreach/NPCs/Pip Whiskerwind.md`
   - Section: `## Interactions`

### Quest Updates
6. **Exterminators Guild Delivery** — Party completes the package delivery quest
   - Update: mark as completed in existing quest file, or create new if none exists

### Missing Entities (no vault file found)
7. **Dancin' Pete** — NPC mentioned in session, no file exists. Short comedic character who follows Salty Pete
   - Create? Private + Public NPC files in Ardenville

8. **Mara Kells, Brother Aiden Brinesong, Barefoot Kesh...** — Salty Pete's former crew members (6 NPCs)
   - Create? Batch NPC creation if they'll appear in the campaign

### Vault Maintenance (existing files needing updates)
9. **Lake Arden Boat Race** — Existing event file in old `::` format with no public counterpart. Now that the party is preparing for it, modernize and create public file.
```

### Step 5: Wait for Approval

Do **not** create any files until the DM reviews the proposal. They may:
- Approve all items
- Approve some, reject others
- Modify items (rename events, change paths, adjust scope)
- Add items you missed
- Flag conditional items ("only create the consequence if the party swapped the package")

Ask: "Which of these should I create? You can say 'all', list numbers, or tell me what to change."

### Step 6: Execute Approved Items

For each approved item, delegate to the appropriate skill template:

**Timeline Events** — Follow the `dnd-event-generator` template with these additions:
- Create **both** private and public files
- The private file **embeds** the public file using `![[Public/World/Events/Timeline/{Event Name}]]`
- DM-only sections (Consequences, Secrets, Follow-Up Hooks, DM Notes) go below the embed in the private file
- The public file contains only what the party experienced, using public wiki-links

**Consequences** — Follow the `dnd-consequence-generator` template exactly.

**NPC Interaction Updates** — Add a bullet to the `## Interactions` section of the NPC's **public** file:
```markdown
## Interactions
- [[Public/World/Events/Timeline/{Event Name}|{Short description}]]
```
Since private NPC files embed the public file, the interaction automatically appears in both views.

**Quest Updates** — Follow the `dnd-quest-generator` template, or update the existing quest file's status.

**Missing Entities** — Follow the relevant generator skill (`dnd-npc-generator`, `dnd-store-generator`, etc.).

### Step 7: Summary

After creating all approved files, present a brief summary:
- Files created (with paths)
- Files updated (with what changed)
- Items skipped (with reason)
- Any follow-up suggestions ("Session 14 might need an encounter prepped for the boat race")

## Event File Templates

These are the specific templates for paired timeline events created by this skill. They extend the `dnd-event-generator` format to support the embed pattern.

### Private Timeline Event

```markdown
---
fc-date: {YYYY-MM-DD}
fc-end: {YYYY-MM-DD if multi-day}
fc-category: Events
type: Event
name: {Event Name}
location: {Where it happened}
region: {Region}
tags:
  - Event
  - {Region}
  - {City}
---

![[Public/World/Events/Timeline/{Event Name}]]

## Consequences
{Bullet list. What changed because of this event? Link to consequence files if created.}

## DM Notes
{Leave empty. DM fills in during play.}

## Links
{Wiki-links to related NPCs, locations, quests, sessions. One per line.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

### Public Timeline Event

```markdown
---
fc-date: {YYYY-MM-DD}
fc-end: {YYYY-MM-DD if multi-day}
fc-category: Events
type: Event
name: {Event Name}
location: {Where it happened}
region: {Region}
tags:
  - Event
  - {Region}
  - {City}
---

## What Happened
{3-5 bullet points. What the party experienced, from their perspective. Use **public** wiki-links only.}

## Key Takeaways
{1-3 bullets. What the party learned, gained, or should remember.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
```

## Edge Cases

### Conditional outcomes
Session journals often describe branching paths ("if they swap the package... if they don't..."). Flag these in the proposal and ask the DM which path the party actually took before creating files.

### Events that already exist
If a timeline event file already exists for a beat, check whether it needs updating rather than creating a duplicate. If it exists as private-only, propose creating the public counterpart.

### Trivial interactions
Not every NPC mention needs an event file. A shopkeeper the party bought a potion from doesn't need "The Party Visits Bob's Potions." Use judgment — if the interaction had no narrative weight, skip it. When in doubt, include it in the proposal and let the DM cut it.

### Multi-session arcs
Some beats span multiple sessions (a boat race that starts in Session 13 and concludes in Session 14). Note these as "in progress" and suggest completing the event file after the arc resolves.

### Missing context
Session journals sometimes use shorthand the DM understands but that's ambiguous without context. If you're unsure what happened, ask rather than guess. "I see a reference to 'the gnome with the package' — is this a new NPC or an existing one?"

## What This Skill Does NOT Do

- **Run during a session** — this is a post-session processing tool
- **Create files automatically** — everything requires DM approval
- **Replace other skills** — it identifies what needs creating and delegates to the right generator skill
- **Edit session journals** — the journal is a historical record, never modified
- **Audit for broken links** — use `dnd-vault-auditor` for that
