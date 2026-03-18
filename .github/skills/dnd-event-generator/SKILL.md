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

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, read-aloud formatting, batch creation order, and conversion guidance.

## Before You Create

Always **search the vault first**:
1. Search `Private/2. Session Journals/` for existing session logs — don't duplicate
2. Search `*/Events/` directories for existing world events
3. Check that NPCs, locations, and groups mentioned in the event have files to link to
4. Look at existing session journals (Session 1, Session 2) to match format conventions

## File Paths

Events go in a dedicated Events directory within the region or campaign:

```
Private/2. Session Journals/{Event Name}.md
Public/World/Events/{Event Name}.md
```

For historical events not tied to a session:
```
Private/1. World Almanac/World/{Region}/Events/{Event Name}.md
Public/World/{Region}/Events/{Event Name}.md
```

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

![[Public/World/Events/{Event Name}]]

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
FROM [[#this.file.name]]
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
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Writing Guidelines

### Brevity
- **10-second scan rule.** Events are records, not stories. Bullets over prose. Facts over flavor.
- Summary sections: 3-5 bullets max. Each bullet is one beat.
- Consequences: 2-4 bullets max. What changed, not how it felt.
- Use fragments. "Guard captain arrested" not "The guard captain was placed under arrest by the city watch."

### General
- Link generously — events are the connective tissue between NPCs, locations, and groups.
- The private note captures DM truth (what actually happened and why). The public note captures player truth (what the party saw and knows).
- Match existing session journal conventions in the vault. Existing sessions use `fc-date`, `fc-end`, `fc-category` frontmatter and date tags.
- Public notes only link to public files. Private notes can link to anything.
- Don't duplicate session journals — if this is a full session log, place it in `Private/2. Session Journals/`. If it's a specific in-world event referenced by sessions, it goes in the World directory.

## Converting Existing Events

Some existing session journals or event notes use older formats. When converting:

1. **Read the existing file** before changing anything
2. **Map old metadata to YAML frontmatter** — `fc-date`, `fc-category`, region, location
3. **Preserve all wiki-links** — NPC mentions, location references, group references
4. **Condense prose recaps** into bullet-point summaries
5. **Split DM-only info** into Consequences/Secrets sections
6. **Create public version** with only player-known information
7. **For batch conversions** — list files first, confirm with user, convert one at a time

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
