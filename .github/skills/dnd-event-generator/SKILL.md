---
name: dnd-event-generator
description: >
  Generate campaign events, session logs, and historical records for the Eldoria D&D campaign with paired private (DM) and public (player-facing) Obsidian markdown notes.
  Use this skill whenever the user wants to create a session log, historical event, quest entry, or campaign milestone.
  Also use when the user mentions logging a session, recording what happened, creating a quest entry, or writing up a campaign event — even if they don't say "event" explicitly.
  Do NOT use for building encounters or combat prep — use the dnd-encounter-builder skill for that.
---

# Eldoria Event Generator

Create events as paired Obsidian markdown files: a **private DM note** with consequences and hidden context, and a **public player note** summarizing what the party experienced.

Events are things that *happened* — sessions played, quests completed, historical moments. They log the past and link the world together through time. They are **not** encounter prep — use `dnd-encounter-builder` for building fights and challenges the party hasn't faced yet.

## What You Need From the User

At minimum: a **name or description** of what happened. Everything else can be invented or inferred. Look for:

- Event name
- When it happened (in-game date or session number)
- Where it happened
- Who was involved (NPCs, groups, party members)
- What happened (key beats)
- What it means for the future

## Shared Conventions

This skill follows [CONVENTIONS.md](../CONVENTIONS.md) for file conventions, frontmatter, tags, dataview blocks, the 10-second scan / brevity rule, read-aloud blockquotes, search-before-create, status folders, and old-format conversion. Only the event-specific details are below.

## Before You Create

Search `Private/2. Session Journals/` and `*/Events/` for existing session logs and world events before creating, and match existing session journal format (Session 1, Session 2).

## File Naming

Event files are **prefixed with their `fc-date`** so they sort chronologically in the file explorer. Use the format `{fc-date} {Event Name}.md`:

```
0496-03-01 Party Visits Wizards Tower.md
0496-03-06 Highreach Mine Collapses.md
```

- The date prefix is the `fc-date` value from the YAML frontmatter (e.g., `0496-03-01`)
- One space between the date and the event name
- **Historical events without a specific date** — omit the prefix (e.g., `Wizarding Wars.md`)

## File Paths

All timeline events (session-related and historical) go in:

```
Private/2. Reference/Events/World Events/Timeline/{fc-date} {Event Name}.md
Public/World/Events/Timeline/{fc-date} {Event Name}.md
```

Town-level events (local, ongoing, or location-specific) go in:
```
Private/2. Reference/Events/World Events/Town/{Event Name}.md
```

Session journals (raw DM prep notes, not structured events) stay in:
```
Private/2. Session Journals/Session {N} Notes.md
```

Historical events without a specific date omit the `{fc-date}` prefix from the filename.

## Private Note (DM Version)

The private note **embeds** the public note rather than duplicating player-visible content. DM-only sections go below the embed.

```markdown
---
type: Event
name: {Event Name}
fc-date: {YYYY-MM-DD if applicable}
fc-end: {YYYY-MM-DD if multi-day}
fc-category: {Sessions/Historical/Quest}
location: {Where it happened}
region: {Region}
tags:
  - Event
  - {Region}
  - {Category}
---

![[Public/World/Events/Timeline/{fc-date} {Event Name}]]

## Consequences
{Bullet list. What changed because of this event? NPC reactions, political shifts, world changes.}

## DM Notes
{Leave empty. DM fills this in during play.}

The following sections are **optional** — only include if the user specifies:

## Secrets
{Things the party doesn't know yet that resulted from or were revealed by this event.}

## Follow-Up Hooks
{What threads does this event leave dangling?}

## Links
{Wiki-links to related NPCs, locations, quests, sessions. One per line.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

## Public Note (Player Version)

```markdown
---
type: Event
name: {Event Name}
fc-date: {YYYY-MM-DD if applicable}
location: {Where it happened}
region: {Region}
tags:
  - Event
  - {Region}
---

## What Happened
{3-5 bullet points. What the party experienced, from their perspective. Use public wiki-links to NPCs and locations.}

## Key Takeaways
{1-3 bullets. What the party learned or gained.}

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
```

## Writing Guidelines

### Event-Specific Brevity
- Events are records, not stories. Facts over flavor.
- Summary sections: 3-5 bullets max. Each bullet is one beat.
- Consequences: 2-4 bullets max. What changed, not how it felt.

### General
- Link generously — events are the connective tissue between NPCs, locations, and groups.
- The private note captures DM truth (what actually happened and why). The public note captures player truth (what the party saw and knows).
- Don't duplicate session journals — if this is a full session log, place it in `Private/2. Session Journals/`. If it's a specific in-world event referenced by sessions, it goes in the World directory.

## Converting Existing Events

Convert old files per CONVENTIONS.md §11. Event-specific mapping:

- Map old metadata to YAML frontmatter — `fc-date`, `fc-category`, region, location.
- Condense prose recaps into bullet-point summaries.
- Split DM-only info into Consequences/Secrets sections.

## Impact Discovery

After processing what the user tells you about an event, **ask the DM about cascading impacts** before finalizing the file. Events ripple through the world — your job is to help the DM think through what changed.

Ask questions like:
- "This event happened in {location} — does it change how that place works? (New leadership, destroyed buildings, shifted reputation?)"
- "The {faction/group} was involved — does this change their goals, resources, or standing?"
- "Does this affect any other NPCs beyond those directly involved? (Allies, rivals, dependents?)"
- "Are there other regions or settlements that would hear about this or react to it?"
- "Does this create any new threats, opportunities, or time pressure for the party?"

Don't invent answers to these questions — ask and wait. The DM knows their world. Fold their answers into the Consequences section.

If the DM says "no" or "that's it," respect that and don't push. Some events are small.

## Cascading Creation

When creating an event, check if it needs supporting content:
- Are there NPCs mentioned that don't have files? Ask if you should create them.
- Are there locations mentioned that don't have files? Ask if you should create them.
- Did the event involve a group or faction? Does that group have a file? If not, ask.
