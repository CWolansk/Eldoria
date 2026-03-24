# Eval Output — Dead Fish in the Eastern Shallows

## Task
Create a quest for the Ardenville quest board. The Fishermans Guild needs someone to investigate why fish in Lake Arden are dying in the eastern shallows. E-rank, reward is 75gp and guild standing with the Fishermans Guild. Quest giver is Captain Gregor Woods.

## Skills / Conventions Read
1. **dnd-quest-generator SKILL.md** — read in full for template, YAML frontmatter fields, section structure, writing guidelines, level ranks, status tracking, and file path conventions
2. **CONVENTIONS.md** — read in full for tag formatting, linking rules, brevity standards, batch creation order, plugin syntax

## Vault Searches Performed

### 1. Search for "Ardenville"
- **Result:** Ardenville exists in `Private/1. World Almanac/World/Crestfall/Ardenville/` and `Public/World/Crestfall/Ardenville/`
- **Key finding:** Ardenville is a lakeside port town in Crestfall, on the northern shore of Lake Arden. Contains NPCs (Gregor Woods, Edda Netsong, Salty Pete, etc.), stores (Netted Nymph, Enchanted Trinket, Steelshapers Forge), and groups (Fishermans Guild, Merchants Guild Warehouse)

### 2. Search for "Gregor Woods"
- **Result:** NPC files exist at:
  - `Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods.md`
  - `Public/World/Crestfall/Ardenville/NPCs/Gregor Woods.md`
- **Key finding:** Guard captain, broad-shouldered veteran with scarred cheek, commands the lake guard. Linked to Ardenville and Lake Arden Boat Race.

### 3. Search for "Lake Arden"
- **Result:** Location files exist at:
  - `Private/1. World Almanac/World/Crestfall/Ardenville/Lake Arden.md`
  - `Public/World/Crestfall/Ardenville/Lake Arden.md`
- **Key finding:** Inland sea separating Ardenville and Highreach

### 4. Search for "Fisherman" / "Fishermans Guild"
- **Result:** Group files exist at:
  - `Private/1. World Almanac/World/Groups/Fishermans Guild.md`
  - `Public/World/Groups/Fishermans Guild.md`
  - `Private/1. World Almanac/World/Crestfall/Ardenville/Fishermans Guild.md`
  - `Public/World/Crestfall/Ardenville/Fishermans Guild.md`
- **Key finding:** Oldest organization in Ardenville, headquarters there, guildmistress is Edda Netsong. Known members include Edda Netsong and Salty Pete.

### 5. Search for existing quests (duplicate check)
- **Searched:** `Private/2. Reference/Events/Quests/` for "fish dying", "dying fish", "eastern shallows"
- **Result:** No duplicates found
- **Existing quests reviewed:**
  - `Active/Exterminators Guild Induction.md` — different quest, active
  - `Ideas/Missing Netters on Lake Arden.md` — related (Lake Arden, Gregor Woods) but different concept (missing netters vs fish die-off)
  - `Ideas/Clear the Kelp Beds.md` — related (Ardenville, Fishermans Guild) but different concept (kelp clearing vs fish investigation)
  - `Ideas/Sabotaged Sails Investigation.md` — different quest
  - `Ideas/Secure the Collapsing Warehouse.md` — different quest
  - `Ideas/Bandit Camp Highreach Ardenville route.md` — different quest
  - `Active/Nightstalkers Collection Quest.md` — different quest
  - `Active/The Artifact Wars.md` — different quest

### 6. Existing quest pattern analysis
- **Idea quests** use: `status: Idea`, `fc-category: Available Quests`, empty `fc-date`/`fc-end`
- **Active quests** use: `status: Active`, `fc-category: Events`, populated `fc-date`
- Both use the same YAML frontmatter structure with `type: Quest`, `name`, `level`, `location`, `region`, `quest_giver`, `reward`, `tags`
- Tags follow PascalCase: `Quest`, `ELevelQuest`, `Crestfall`, `Ardenville`
- Wiki-links in quest files use private paths (e.g., `[[Gregor Woods]]` or full private paths)
- Dataview block at the end uses `FROM [[]]` or `FROM [[#this.file.name]]`

## Reasoning

### Quest Name
Chose "Dead Fish in the Eastern Shallows" — descriptive of the problem, matches the naming style of other quests (e.g., "Clear the Kelp Beds", "Missing Netters on Lake Arden").

### File Path
`Private/2. Reference/Events/Quests/Active/Dead Fish in the Eastern Shallows.md`

Placed in `Active/` because the skill defines `Available` as "on the quest board, no one has taken it yet" — this is a live quest on the Ardenville quest board, not just an idea the DM is considering. The `Ideas/` folder contains quests with `status: Idea` that haven't been finalized for the board yet.

### Status and Category
- `status: Available` — posted on the quest board, not yet accepted by the party
- `fc-category: Available Quests` — matches the calendarium category used by other available quests
- `fc-date` and `fc-end` left empty — no specific in-game date specified by the user

### Level and Difficulty
- `level: E` — user specified E-rank, which per the skill means Novice (level 3-5 party)
- No `difficulty` field (Easy/Medium/Hard/Deadly) — user didn't specify combat difficulty, and this is primarily an investigation quest

### Tags
- `Quest` — entity type
- `ELevelQuest` — matches pattern from existing quests (e.g., `ELevelQuest` in Missing Netters and Clear the Kelp Beds)
- `Crestfall` — region tag
- `Ardenville` — city tag
- Did NOT add `Idea` tag since this is Available, not an Idea

### Wiki-Links
Used full private paths since this is a DM-only file:
- `[[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods|Captain Gregor Woods]]`
- `[[Private/1. World Almanac/World/Groups/Fishermans Guild|Fishermans Guild]]`
- `[[Private/1. World Almanac/World/Crestfall/Ardenville/Lake Arden|Lake Arden]]`
- `[[Private/1. World Almanac/World/Crestfall/Ardenville/Ardenville|Ardenville]]`
- `[[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Edda Netsong|Edda Netsong]]`

### Sections Included
- **Quest Overview** — quest giver, reward, status, difficulty, brief description
- **Objectives** — 3 clear bullets (travel, investigate, report)
- **Key NPCs** — Gregor Woods (quest giver) and Edda Netsong (who noticed the die-off)
- **Investigation / Mechanics** — 4 DCs for the investigation (Nature, Survival, Perception, Investigation)
- **Potential Outcomes** — Success (reward + guild standing) and Failure/Ignored (die-off spreads, follow-up quest)
- **DM Notes** — empty, for the DM to fill during play

### Sections NOT Included
- **Multiple Approaches** — user didn't specify branching paths (opt-in only per skill)
- **Complications** — user didn't specify twists or moral dilemmas (opt-in only)
- **Connections** — user didn't specify links to other quest chains (opt-in only)

### No Public File
Per the skill: "Quests live in the DM's reference folder and are **DM-only** (no public counterpart)." No public file created.

### Cascading Creation
Checked all linked entities — all exist in the vault:
- ✅ Gregor Woods NPC — exists
- ✅ Fishermans Guild group — exists
- ✅ Lake Arden location — exists
- ✅ Ardenville settlement — exists
- ✅ Edda Netsong NPC — exists

No cascading creation needed.

## File Created

### Path
`Private/2. Reference/Events/Quests/Active/Dead Fish in the Eastern Shallows.md`

### Full Content

```markdown
---
fc-date:
fc-end:
fc-category: Available Quests
type: Quest
name: Dead Fish in the Eastern Shallows
status: Available
level: E
location: Lake Arden / Ardenville
region: Crestfall
quest_giver: Captain Gregor Woods
reward: 75 gp + Fishermans Guild standing
tags:
  - Quest
  - ELevelQuest
  - Crestfall
  - Ardenville
---

## Quest Overview

**Quest Giver**: [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods|Captain Gregor Woods]]
**Reward**: 75 gp + guild standing with the [[Private/1. World Almanac/World/Groups/Fishermans Guild|Fishermans Guild]]
**Status**: Available
**Difficulty**: E

The [[Private/1. World Almanac/World/Groups/Fishermans Guild|Fishermans Guild]] reports fish floating belly-up in the eastern shallows of [[Private/1. World Almanac/World/Crestfall/Ardenville/Lake Arden|Lake Arden]]. Nets come back empty or full of dead catch. Captain [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods|Gregor Woods]] posted the job on the [[Private/1. World Almanac/World/Crestfall/Ardenville/Ardenville|Ardenville]] quest board — needs someone to investigate the cause.

## Objectives
- Travel to the eastern shallows of Lake Arden
- Investigate the source of the fish die-off
- Report findings to Captain Gregor Woods

## Key NPCs
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods|Captain Gregor Woods]] — quest giver, captain of the lake guard
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Edda Netsong|Edda Netsong]] — Fishermans Guild guildmistress, first noticed the die-off

## Investigation / Mechanics
- Nature DC 12 to identify the dead fish aren't diseased — something in the water is killing them
- Survival DC 13 to track the pattern of dead fish toward the source
- Perception DC 14 to spot discoloration in the water near the eastern shore
- Investigation DC 15 to find the cause at the source

## Potential Outcomes

### Success
- 75 gp paid by the Fishermans Guild
- Party gains standing with the Fishermans Guild
- Eastern shallows fishing resumes

### Failure / Ignored
- Fish die-off spreads westward, affecting Ardenville's primary food supply
- Fishermans Guild grows desperate — may post a higher-ranked follow-up quest

## DM Notes


---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```
