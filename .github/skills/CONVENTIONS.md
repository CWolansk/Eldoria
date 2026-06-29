# CONVENTIONS.md — Shared Rules for All Eldoria Skills

This is the **single source of truth** for how content is formatted in the Eldoria vault. Every `dnd-*` skill defers to this file instead of restating these rules. Read it once; the per-skill files only cover what's unique to their entity type.

For repo orientation, the skill index, and common workflows, see [AGENTS.md](../../AGENTS.md). This file is the *formatting bible*; AGENTS.md is the *router*.

---

## 1. Every entity gets two files (paired private/public)

Most world entities (NPC, Store, Settlement, Region, Location, Group, Deity, and player-facing Events/Storylines) get **two files**:

- A **private DM note** under `Private/` — secrets, mechanics, hidden relationships, DM-only context.
- A **public player note** under `Public/` — only what players can see or have already learned.

**The private file embeds the public file — never duplicate text.** The public file is the single source of truth for player-visible content. The private file embeds it and adds DM-only sections below:

```markdown
![[Public/World/{Region}/{City}/{File}]]

## DM-only section
...
```

Updating the public file automatically updates what the private file shows. Don't maintain the same description in two places.

**DM-only entities have no public file:** Encounters, Quests, Consequences, Holidays, Narratives, and loot the party hasn't found live only in `Private/`.

### Public notes never leak secrets
If an NPC is secretly a spy, the public note says they're a merchant. If a shop is a front for a thieves' guild, the public note just describes the shop. Write every public note as if a player is reading it — because they are.

### Public links stay public
Public notes link **only** to other public notes under `Public/World/...`. Private notes can link to anything.

---

## 2. Directory map

```
Private/
├── 0.DM Screen/                          # At-the-table quick-reference & session prep
├── 0.Scratch Notes/                      # Working notes, unstructured ideas
├── 1. The Party/                         # Player character records
├── 1. World Almanac/World/               # ALL world entities
│   ├── {Region}/
│   │   ├── {Region}.md                   # Region file
│   │   └── {Settlement}/
│   │       ├── {Settlement}.md           # Settlement file
│   │       ├── NPCs/{NPC Name}.md        # NPCs for this settlement
│   │       └── {Shop Name}.md            # Stores/locations loose in settlement folder
│   ├── Groups/{Group Name}.md            # Factions/guilds (world-level)
│   └── Pantheon/{Deity Name}.md          # Deities (world-level)
├── 2. Reference/
│   ├── Encounters/{Encounter}.md
│   ├── Items/{Item}.md                   # Notable/named magic items (DM-only)
│   ├── Tables/{Table}.md                 # Reusable random tables
│   ├── Narratives/{Narrative}.md
│   ├── Storylines/{Storyline}.md
│   └── Events/
│       ├── Quests/{Active|Completed|Missed|Ideas}/{Quest}.md
│       ├── Consequences/{Active|Resolved|Ideas}/{Consequence}.md
│       └── World Events/
│           ├── Timeline/{fc-date} {Event}.md
│           ├── Town/{Event}.md
│           └── Holidays/{Culture} Holidays/{Holiday}.md
└── 2. Session Journals/Session {N} Notes.md

Public/                                   # Mirrors Private/ world structure, minus secrets
├── Players/
├── Storylines/{Storyline}.md
└── World/
    ├── {Region}/{Settlement}/...         # Same tree as Private, no DM-only content
    ├── Groups/
    ├── Pantheon/
    └── Events/Timeline/{fc-date} {Event}.md
```

**Discover regions and settlements dynamically** by listing `Private/1. World Almanac/World/` — each top-level folder is a region. Create directories as needed.

---

## 3. YAML frontmatter spec

Every entity file opens with YAML frontmatter.

- `type:` — one of: `NPC`, `Store`, `Settlement`, `Region`, `Location`, `Organization`, `Deity`, `Event`, `Quest`, `Consequence`, `Holiday`, `Storyline`, `Narrative`, `Encounter`, `Item`.
- `name:` — the entity's full name, matching the filename exactly.
- Location fields where applicable: `region:`, `location:` (the settlement).
- **Entity-specific fields** (defined in each skill): e.g. `profession`/`race`/`status` (NPC), `store_type`/`proprietor` (Store), `settlement_type`/`population` (Settlement), `influence`/`leader` (Group), `fc-date`/`fc-end`/`fc-category` (calendar-aware Events/Holidays), `level`/`quest_giver`/`reward` (Quest), `domains`/`symbol`/`alignment` (Deity).
- `tags:` — a YAML list, **PascalCase, no `#` prefix**. Always include the entity type plus its region/settlement/group as applicable.

Example:
```yaml
---
type: NPC
name: Corin Tidehammer
location: Ardenville
region: Crestfall
profession: Blacksmith
race: Human
status: Alive
tags:
  - NPC
  - Crestfall
  - Ardenville
---
```

---

## 4. Links, tags, and dataview

### Wiki links
Format: `[[Path/To/File|Display Name]]`. Always preserve existing links when updating a file — they are load-bearing cross-references.

### Tags
PascalCase, no `#` in YAML frontmatter (e.g. `Crestfall`, `Ardenville`, `NPC`, `TheLowlands`). Match existing tag conventions in neighboring files.

### "Mentioned In" dataview block
Every file ends with a dataview block for cross-referencing.

**Private files** (all mentions):
````markdown
```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
````

**Public files** (public mentions only — note the `AND "Public"`):
````markdown
```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]] AND "Public"
SORT file.name ASC
```
````

In a private note that embeds a public note, the public link + dataview block go at the very bottom under a `# Public Notes` heading:
```markdown
# Public Notes
[[Public/World/{Region}/{City}/{File}|{Name}]]
```

---

## 5. Brevity — the 10-second scan rule

The DM reads these files mid-session. **If a file takes longer than 10 seconds to scan, it's too long.**

- Fragments over prose. Short bullets over paragraphs.
- 2-4 items per section; 1-2 sentences max for descriptions.
- Ideals, Flaws, quirks, etc. are a word or short phrase, not a sentence.
- Lists highlight what's notable — never catalog everything ("standard gear plus…" is fine).

---

## 6. Read-aloud text uses blockquotes

Any text meant to be read aloud at the table uses `>` blockquote formatting so the DM can spot it instantly when the file is embedded:

```markdown
## Description
> The forge glows orange against the dusk. Hammer-fall rings out in steady rhythm, and the air tastes of coal smoke and hot iron.
```

---

## 7. Search before creating

Before generating any entity:

1. Search `Private/1. World Almanac/World/` to discover existing regions/settlements.
2. Search the target folder to check the entity doesn't already exist — **never create duplicates**.
3. Check that entities you'll link to (proprietor, faction, settlement) have files.
4. Read neighboring files to match tone, detail level, and tag conventions.

If the entity already exists, **offer to review or update it** instead of creating a duplicate. If the user just wants to see a preview, show it in chat without writing files.

---

## 8. Opt-in detail only

Sections like **Secrets**, **Plot Hooks**, and **Relationships** are **opt-in** — only include them when the user explicitly provides or requests them. Don't pad files with invented drama, backstory, or quests the DM didn't ask for. `DM Notes` is left empty for the DM to fill during play.

---

## 9. Cascading creation

When an entity references other entities that don't have files yet, **offer to create them — never silently auto-create.** After generating any file, scan it for mentioned entities (NPCs, stores, groups, locations, deities) and ask the DM about the gaps. Delegate to the matching skill (`dnd-npc-generator`, `dnd-store-generator`, etc.).

### Batch creation order
When creating multiple related entities, build parents before children:

**Region → Settlement → Groups → NPCs → Stores → Events**

### Confirm before bulk operations
For batch conversions or populating an entire settlement, **list what you plan to create and confirm with the DM first.** Convert/create one at a time, showing each result, so the DM can catch mistakes early.

---

## 10. Status folders

Quests and Consequences are filed by resolution status into subfolders rather than tracked with a status field alone:

- **Quests:** `Active/`, `Completed/`, `Missed/`, `Ideas/`
- **Consequences:** `Active/`, `Resolved/`, `Ideas/`

Move the file between folders as its status changes.

---

## 11. Converting old `::` files to YAML

Many older files use an inline `::` metadata format (e.g. `Location :: #Highreach`, `Alive? :: Yes`). When you touch one, convert it:

1. **Read both private and public files** before changing anything.
2. **Map old fields** to YAML frontmatter and template sections (`Location ::` → `location`/`region` + tags; `Description ::` → the description section, trimmed to fragments; `Alive? ::` → `status`; `Notes ::` → split public-safe info into the public note, secrets into DM-only sections).
3. **Preserve every `[[wiki link]]`** — never drop cross-references.
4. **Drop `^blockid` anchors** — public files are standalone notes now, not embeds.
5. **Rewrite the public file as a standalone note** (not an embed) with only public-safe content.
6. **For batch conversions**, list files first, confirm with the DM, convert one at a time.
7. **Invent only what's missing** — don't fabricate detail that contradicts what the DM already wrote.

---

## 12. Obsidian plugin syntax

Generated content must stay compatible with the vault's plugins:

| Plugin | Purpose | Key syntax |
|---|---|---|
| **initiative-tracker** | Combat initiative & HP | Meta-bind `INPUT` fields in tables |
| **obsidian-5e-statblocks** | Monster stat blocks | `<details>` collapsible blocks |
| **obsidian-dice-roller** | Inline rollable dice | `` `dice: 2d6+3` `` |
| **calendarium** | Fantasy calendar dates | `fc-date`, `fc-end`, `fc-category` frontmatter |
| **meta-bind** | Interactive forms/inputs | `INPUT[type():memory^key]` |
| **dataview** | Queries & cross-references | `dataview` code blocks (see §4) |
| **obsidian-leaflet-plugin** | Interactive maps | Map embeds |
| **obsidian-excalidraw-plugin** | Diagrams | Excalidraw files |

Date-prefix timeline events with the `fc-date` for chronological sorting (e.g. `0496-03-01 Party Visits Wizards Tower.md`).
