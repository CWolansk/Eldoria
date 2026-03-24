# Eval Output — Harvest Festival Event

## Task
Create an event for the party attending a harvest festival in Ardenville on 0496-03-15 where Claire won a pie-eating contest and they met a traveling bard who told them about ruins to the south.

## Skills & Conventions Read
- **Skill:** `c:\Users\caiwo\source\repos\Eldoria\.github\skills\dnd-event-generator\SKILL.md`
- **Conventions:** `c:\Users\caiwo\source\repos\Eldoria\.github\skills\CONVENTIONS.md`

## Vault Searches Performed

### 1. Search for "Ardenville"
- **Result:** Ardenville exists in `Private/1. World Almanac/World/Crestfall/Ardenville/` and `Public/World/Crestfall/Ardenville/`
- **Region:** Crestfall
- **Key finding:** Multiple files exist — settlement file, NPCs (Edda Netsong, Salty Pete, Mira Softstep, Kellen Redshore, Isolde Fairweather, Gregor Woods, Corin Tidehammer), stores (The Netted Nymph, The Enchanted Trinket, Steelshapers Forge), groups (Fishermans Guild, Merchants Guild Warehouse)
- **Key finding:** Existing event `0496-03-15 Lake Arden Boat Race` is on the same date

### 2. Search for existing events in Timeline directories
- **Private:** `Private/2. Reference/Events/World Events/Timeline/` — 37 results found, including `0496-03-15 Lake Arden Boat Race.md`
- **Public:** `Public/World/Events/Timeline/` — 35 results found; no `0496-03-15` public events exist (the boat race has a private file but no public counterpart)
- **No existing harvest festival event found** — safe to create

### 3. Search for "harvest festival"
- **Result:** Search timed out, but no matches were returned before timeout

### 4. Search for "traveling bard" / "ruins to the south"
- **Result:** Search timed out, no matches found — these are new entities

### 5. Search for Claire in party files
- **Result:** `Private/1. The Party/Players/Private Claire notes.md` and `Public/Players/Claire Player Sheet.md` exist
- Claire is a confirmed party member (CONVENTIONS.md lists party: Claire, JP, Julie, Justin, Liz, Randi)

### 6. Read existing event files to match format
- Read `Private/2. Reference/Events/World Events/Timeline/0496-03-15 Lake Arden Boat Race.md` — older format, no public embed
- Read `Private/2. Reference/Events/World Events/Timeline/0496-03-07 Party Departs Highreach for Silverleaf Lands.md` — newer format with public embed
- Read `Public/World/Events/Timeline/0496-03-07 Party Departs Highreach for Silverleaf Lands.md` — public note format
- Read `Private/2. Reference/Events/World Events/Timeline/0496-03-06 Party Saves Highreach from Duplirat Crisis.md` — confirmed embed pattern
- Read `Public/World/Events/Timeline/0496-03-06 Party Saves Highreach from Duplirat Crisis.md` — confirmed public note format

### 7. Read Ardenville settlement file
- **Public:** `Public/World/Crestfall/Ardenville/Ardenville.md` — lakeside port town on northern shore of Lake Arden, fishing and transport hub

## Reasoning

### Event Name
Chose "Harvest Festival in Ardenville" — descriptive, matches the naming pattern of other events (e.g., "Lake Arden Boat Race", "Foundation Induction Ceremony").

### File Name
`0496-03-15 Harvest Festival in Ardenville.md` — follows the `{fc-date} {Event Name}.md` prefix format specified in the skill.

### File Paths
- **Private:** `Private/2. Reference/Events/World Events/Timeline/0496-03-15 Harvest Festival in Ardenville.md`
- **Public:** `Public/World/Events/Timeline/0496-03-15 Harvest Festival in Ardenville.md`

These match the pattern used by all existing timeline events in the vault.

### YAML Frontmatter Decisions
- `fc-category: Events` — matches existing in-campaign events (same as 0496-03-07 and 0496-03-06 events)
- `location: Ardenville` — specific location where it happened
- `region: Crestfall` — Ardenville's region
- `tags: Event, Crestfall, Ardenville` — matches tag conventions (PascalCase, entity type + region + city)

### Public Note
- Followed the skill template exactly: `## What Happened` with 4 bullet points, `## Key Takeaways` with 2 bullets
- Used public wiki-link for Ardenville: `[[Public/World/Crestfall/Ardenville/Ardenville|Ardenville]]`
- No private links — public notes only link to public files
- Dataview block filters to "Public" folder as per skill template
- Kept within brevity rules — scannable in well under 10 seconds

### Private Note
- Embeds the public note via `![[Public/World/Events/Timeline/0496-03-15 Harvest Festival in Ardenville]]`
- `## Consequences` — two light bullets: Claire's local recognition and the ruins hint as a future hook
- `## DM Notes` — left empty for DM to fill in during/after play
- `## Links` — cross-references to Ardenville settlement and the Lake Arden Boat Race (same date event)
- Did NOT include optional sections (Secrets, Follow-Up Hooks) since the user didn't ask for them
- Dataview block is unfiltered (private notes can reference anything)

### What I Did NOT Create
- **Traveling bard NPC** — no name given, likely a throwaway encounter. The skill says to ask the DM before creating supporting entities.
- **Southern ruins location** — no name or specific details provided. Would need DM input to create.
- **No Secrets/Follow-Up Hooks sections** — skill says these are opt-in only when user explicitly asks.

### Cascading Impact Discovery
Per the skill, I should ask the DM about cascading impacts. The event is relatively small (a festival), so impacts are minimal:
- Claire's pie-eating victory could give her local fame in Ardenville
- The traveling bard's info about southern ruins is a plot seed the DM can develop
- No faction/political shifts from this event

## Files Created

### File 1: Public Note
**Path:** `Public/World/Events/Timeline/0496-03-15 Harvest Festival in Ardenville.md`

```markdown
---
type: Event
name: Harvest Festival in Ardenville
fc-date: 0496-03-15
fc-end: 0496-03-15
fc-category: Events
location: Ardenville
region: Crestfall
tags:
  - Event
  - Crestfall
  - Ardenville
---

## What Happened
- The party attended the harvest festival in [[Public/World/Crestfall/Ardenville/Ardenville|Ardenville]]
- Entered a pie-eating contest — Claire won
- Met a traveling bard who shared tales of ruins to the south
- Festival atmosphere: food stalls, music, lakeside celebrations

## Key Takeaways
- Claire is the reigning pie-eating champion of the Ardenville harvest festival
- Ruins to the south may be worth investigating

---

\```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]] AND "Public"
SORT file.name ASC
\```
```

### File 2: Private Note
**Path:** `Private/2. Reference/Events/World Events/Timeline/0496-03-15 Harvest Festival in Ardenville.md`

```markdown
---
fc-date: 0496-03-15
fc-end: 0496-03-15
fc-category: Events
type: Event
name: Harvest Festival in Ardenville
location: Ardenville
region: Crestfall
tags:
  - Event
  - Crestfall
  - Ardenville
---

![[Public/World/Events/Timeline/0496-03-15 Harvest Festival in Ardenville]]

## Consequences
- Claire gained local recognition as pie-eating champion — townsfolk may remember her
- The traveling bard's mention of southern ruins plants a seed for future exploration

## DM Notes


## Links
- [[Public/World/Crestfall/Ardenville/Ardenville|Ardenville]]
- [[Private/2. Reference/Events/World Events/Timeline/0496-03-15 Lake Arden Boat Race|Lake Arden Boat Race]]

---

\```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
\```
```
