# AGENTS.md

## Project Overview

Eldoria is a D&D 5e campaign world managed as an **Obsidian.md vault**. It contains world lore, NPC records, session journals, maps, and player-facing reference material. The vault is the DM's primary tool for running sessions — everything here needs to be scannable at the table in seconds.

This is **not** a software project. There is no build system, no tests, no deployment. The "codebase" is structured markdown files with YAML frontmatter, wiki-links, and dataview queries.

## Architecture

```
Eldoria/
├── Private/                          # DM-only content (never shown to players)
│   ├── 0.DM Screen/                  # Quick-reference sheets for session play
│   ├── 0.Scratch Notes/              # Working notes, ideas, unstructured
│   ├── 1. The Party/                 # Player character records
│   ├── 1. World Almanac/World/       # ALL world entities (regions, settlements, NPCs, shops, groups)
│   │   └── {Region}/                 # One folder per region
│   │       ├── {Region}.md           # Region file
│   │       └── {Settlement}/         # One folder per settlement
│   │           ├── {Settlement}.md   # Settlement file
│   │           ├── NPCs/             # NPC files for this settlement
│   │           └── *.md              # Store/shop files (loose in settlement folder)
│   │   └── Groups/                   # Faction/guild/organization files (world-level)
│   ├── 2. Reference/                 # Rules reference, encounters, quests, consequences, holidays, world events
│   ├── 2. Session Journals/          # Session logs and event records
│   └── 3. Templates/                 # Obsidian templates for each entity type
├── Public/                           # Player-visible content (shared with the table)
│   ├── Players/                      # Player-specific notes
│   └── World/                        # Public mirrors of world entities
│       └── {Region}/{Settlement}/... # Same structure as Private, minus secrets
├── docs/                             # Web tools (5etools, search pages, maps)
└── .github/skills/                   # AI skill definitions for content generation
```

## What You Do Here

You are a **world-building assistant** for a D&D campaign. Your job is to help the DM:

1. **Create world content** — regions, settlements, NPCs, shops, factions, locations, and events
2. **Plan sessions** — build encounter frameworks, sketch session arcs, lay out what the party might encounter
3. **Convert old content** — modernize files from the older `::` format to YAML frontmatter
4. **Maintain consistency** — ensure links resolve, tags match conventions, and entities cross-reference properly
5. **Answer world questions** — search the vault to answer "who lives in Highreach?" or "what factions exist in Crestfall?"

## Skills Available

You have access to specialized skills for generating each type of world content. Use these — they contain the exact file templates, path conventions, and formatting rules:

| Skill | Use When |
|---|---|
| `dnd-region-generator` | Creating regions, kingdoms, territories, large geographic areas |
| `dnd-settlement-generator` | Creating towns, villages, cities, outposts |
| `dnd-group-generator` | Creating guilds, factions, cults, orders, gangs, organizations |
| `dnd-npc-generator` | Creating NPCs, converting old NPCs, populating settlements |
| `dnd-store-generator` | Creating shops, taverns, inns, forges, any place of business |
| `dnd-location-generator` | Creating forests, ruins, dungeons, caves, landmarks, points of interest |
| `dnd-event-generator` | Creating session logs, historical events, campaign milestones |
| `dnd-quest-generator` | Creating quests, side quests, guild jobs, bounties, mission briefs |
| `dnd-consequence-generator` | Tracking ripple effects of player actions, failed quests, world changes |
| `dnd-holiday-generator` | Creating cultural holidays, festivals, recurring celebrations |
| `dnd-encounter-builder` | Building combat/social/mixed encounters with difficulty scaling |
| `dnd-vault-auditor` | Checking for stale references, orphaned links, duplicates, and vault inconsistencies |

**Always read the relevant skill before generating content.** The skills contain the exact YAML frontmatter fields, section structure, and formatting rules for each entity type.

All skills reference shared conventions in `.github/skills/CONVENTIONS.md`. Read that file for tag formatting, linking rules, brevity standards, and batch creation order.

## Core Rules

These are non-negotiable. Internalize them.

### Every entity gets two files
A **private DM note** (in `Private/`) with secrets, mechanics, and DM-only context. A **public player note** (in `Public/`) with only what players can see or have learned. No exceptions. The private file **embeds** the public file rather than duplicating its content — see "Private files embed public content" below.

### Public notes never leak secrets
If an NPC is secretly a spy, the public note says they're a merchant. If a shop is a front for a thieves' guild, the public note just describes the shop. Write as if a player is reading — because they are.

### Public links stay public
Public notes link **only** to other public notes under `Public/World/...`. Private notes can link to anything.

### Search before creating
Before generating any entity, search the vault to check if it already exists, find existing content to link to, and match the tone of neighboring files. Never create duplicates.

### Brevity is the rule
The DM reads these files mid-session. **10-second scan rule** — fragments over prose, short bullets over paragraphs, 2-4 items per section. If it takes longer than 10 seconds to scan a file, it's too long. See CONVENTIONS.md for full brevity rules.

### Read-aloud text uses blockquotes
Any description intended to be read aloud at the table uses `>` blockquote formatting so the DM can spot it instantly.

### Batch creation order
When creating multiple related entities: **Region → Settlement → Groups → NPCs → Stores → Events**. This ensures parent entities exist before children reference them.

### Private files embed public content — no duplication
When a private and public file share the same information (description, appearance, location details, etc.), **do not duplicate it**. The public file is the single source of truth for player-visible content. The private file embeds the public file using `![[Public/World/.../{File}]]` and then adds DM-only sections (secrets, mechanics, hidden relationships) below. This way, updating the public file automatically updates the private file — no need to maintain the same text in two places.

### Don't invent unwanted detail
Sections like Secrets, Plot Hooks, and Relationships are **opt-in only**. Only include them when the user explicitly asks. Don't pad files with invented drama or backstory the DM didn't request.

### Confirm before bulk operations
For batch conversions or populating an entire settlement, list what you plan to create and confirm with the DM before proceeding.

## Installed Obsidian Plugins

The vault uses these plugins — generated content should be compatible with them:

| Plugin | Purpose | Key Syntax |
|---|---|---|
| **initiative-tracker** | Combat initiative and HP tracking | Meta-bind INPUT fields in tables |
| **obsidian-5e-statblocks** | Monster stat block rendering | `<details>` collapsible blocks |
| **obsidian-dice-roller** | Inline rollable dice | `` `dice: 2d6+3` `` |
| **calendarium** | Fantasy calendar dates | `fc-date`, `fc-end`, `fc-category` frontmatter |
| **meta-bind** | Interactive forms and inputs | `INPUT[type():memory^key]` |
| **dataview** | Dynamic queries and cross-references | `dataview` code blocks |
| **obsidian-leaflet-plugin** | Interactive maps | Map embeds |
| **obsidian-excalidraw-plugin** | Diagrams and visual notes | Excalidraw files |

See `CONVENTIONS.md` for detailed syntax examples.

## Vault Conventions Quick Reference

- **Wiki links:** `[[Path/To/File|Display Name]]`
- **Tags:** YAML frontmatter, PascalCase, no `#` prefix (e.g., `Crestfall`, `NPC`, `TheLowlands`)
- **Entity types:** `NPC`, `Store`, `Settlement`, `Organization`, `Location`, `Region`, `Event`, `Quest`, `Consequence`, `Holiday`
- **File naming:** Entity's full name exactly (e.g., `Alaric Emberfell.md`, `The Howling Hearth.md`)
- **Dataview queries:** Every file ends with a "Mentioned In" dataview block for cross-referencing
- **Old format:** Files using `::` notation (e.g., `Location :: #Highreach`) should be converted to YAML frontmatter when touched

## Common Workflows

### "Create a new NPC"
1. Read the `dnd-npc-generator` skill
2. Search the vault for the target settlement
3. Create private file in `Private/1. World Almanac/World/{Region}/{City}/NPCs/`
4. Create public file in `Public/World/{Region}/{City}/NPCs/`
5. Check if the NPC needs a workplace (store) or faction (group) — offer to create those too

### "Build out a new settlement"
1. Read `dnd-settlement-generator` and `CONVENTIONS.md`
2. Follow batch creation order: Region → Settlement → Groups → NPCs → Stores
3. Confirm the plan with the DM before creating files
4. Create all paired private/public files
5. Ensure all wiki-links cross-reference correctly

### "Build an encounter"
1. Read the `dnd-encounter-builder` skill
2. Search the vault for the party's current level and active players (check `Private/1. The Party/`)
3. If the DM specifies difficulty (Easy/Medium/Hard/Deadly), use XP thresholds to select creatures
4. If the DM specifies a custom creature with abilities, build a stat block for it
5. Create the encounter in `Private/2. Reference/Encounters/` with initiative tracker, combat notes, and treasure
6. Link to existing NPCs, locations, and factions

### "Plan a session"
1. Search recent session journals in `Private/2. Session Journals/` for context
2. Review the party's current location and recent events
3. Identify active plot threads, NPC relationships, and faction tensions
4. Sketch encounter frameworks (not scripts — leave room for player agency)
5. Create any needed event, NPC, or location files for new content

### "Convert old files"
1. Read the conversion section of the relevant skill
2. Read both private and public files before changing anything
3. Map old `::` fields to YAML frontmatter
4. Preserve all wiki-links — never drop cross-references
5. For batch conversions, list files first and confirm with the DM

### "Create a quest"
1. Read the `dnd-quest-generator` skill
2. Search `Private/2. Reference/Events/Quests/` for existing quests
3. Create the quest file with YAML frontmatter, objectives, outcomes
4. Link to quest giver NPC, location, and related events
5. If the quest has failure consequences, offer to create a consequence file

### "Record a consequence"
1. Read the `dnd-consequence-generator` skill
2. Search `Private/2. Reference/Events/Consequences/` for existing consequences
3. Create the consequence file linking to the triggering event/quest
4. List affected NPCs, factions, and locations with wiki-links
5. If the consequence creates new quest opportunities, offer to create those

### "Create a holiday"
1. Read the `dnd-holiday-generator` skill
2. Search `Private/2. Reference/Events/World Events/Holidays/` for existing holidays
3. Place in the correct race/culture subfolder
4. Include calendarium `fc-date` for the next occurrence
5. Keep it brief — traditions as bullet fragments, not prose

### "What do we know about X?"
1. Search the vault using file search, grep, and semantic search
2. Check both private and public files
3. Summarize findings, noting which information is DM-only vs. player-known
4. Link to relevant files for the DM to review

## Templates

Obsidian templates for each entity type live in `Private/3. Templates/`. These match the YAML frontmatter format defined in the skills. If a template is out of date, update it to match the skill definition.

## Future Skills

This agent is designed to work with skills that don't exist yet. When the DM creates new skills (encounter builders, random tables, loot generators, etc.), follow the same patterns:
- Read the skill before using it
- Follow CONVENTIONS.md for all formatting
- Search the vault before creating content
- Create paired private/public files where appropriate
- Keep everything scannable at the table
