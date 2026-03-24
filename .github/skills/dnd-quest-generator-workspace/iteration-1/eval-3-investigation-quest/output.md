# Eval 3 — Investigation Quest: Boat Race Sabotage

## Task
Create a D-rank investigation quest in Ardenville. Someone is sabotaging the boat race preparations — cutting sails, loosening moorings, and scaring off crew. The party needs to figure out who's behind it. Captain Gregor Woods suspects it might be connected to the Merchants Guild trying to rig the race. Include investigation DCs and clue mechanics.

---

## Searches Performed

### 1. Search for "Ardenville"
- **Result:** Ardenville exists in `Private/1. World Almanac/World/Crestfall/Ardenville/` and `Public/World/Crestfall/Ardenville/`
- **Key finding:** Lakeside port town in Crestfall, northern shore of Lake Arden, fishing and transport hub
- **NPCs found:** Isolde Fairweather (mayor), Kellen Redshore (harbormaster), Mira Softstep (innkeeper), Gregor Woods (guard captain), Edda Netsong (Fisherman's Guild), Salty Pete (boat captain), Corin Tidehammer
- **Stores found:** The Netted Nymph, The Enchanted Trinket, Steelshapers Forge, Merchants Guild Warehouse
- **Groups found:** Fishermans Guild, Merchants Guild Warehouse
- **Events found:** Lake Arden Boat Race (0496-03-15), Harvest Festival, Merchants Guild Warehouse Robbery

### 2. Search for "Gregor Woods"
- **Result:** NPC file exists at `Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods.md`
- **Key details:** Human guard captain, scarred cheek, slow to trust outsiders. Responsible for boat race security. Hires adventurers. Quietly backs the party after their clash with Merchants Guild bandits.
- **Public file:** `Public/World/Crestfall/Ardenville/NPCs/Gregor Woods.md`

### 3. Search for "Merchants Guild"
- **Result:** Multiple files found:
  - `Private/1. World Almanac/World/Groups/Merchants Guild.md` — world-level org led by Alistair Goldman
  - `Public/World/Groups/Merchants Guild.md` (public counterpart)
  - `Private/1. World Almanac/World/Crestfall/Ardenville/Merchants Guild Warehouse.md` — warehouse on the main pier
  - `Private/1. World Almanac/World/Crestfall/Highreach/HighReach Merchants Guild.md` — local Highreach chapter
- **Key details:** Dominant trade org, Alistair Goldman is guildmaster, employs Gareth Ironbrow as enforcer, uses strong-arm tactics, sponsors the boat race, controls the cliffside port elevator to Highreach

### 4. Search for "boat race"
- **Result:** `Private/2. Reference/Events/World Events/Timeline/0496-03-15 Lake Arden Boat Race.md`
- **Key details:** Takes place on day 15, first prize is The Tipping Tankard (JP's seized ship), sponsored by Alistair Goldman and the Merchants Guild. Older format file.

### 5. Search for existing quests
- **Result:** Found `Private/2. Reference/Events/Quests/Ideas/Sabotaged Sails Investigation.md` — an existing E-rank quest with similar theme but different:
  - Quest giver: Mayor Isolde Fairweather (not Gregor Woods)
  - Level: E (not D)
  - Suspects: Marla Vex (not Merchants Guild directly)
  - DCs: Lower (DC 12-13 range)
- **Decision:** These are distinct quests — different quest givers, difficulty levels, suspects, and scope. Created new quest rather than modifying existing.

### 6. Read Ardenville settlement file
- **Key context:** Merchants Guild warehouses dominate the main pier, Alistair Goldman presses for higher docking fees, Fisherman's Guild resists, simmering tensions between the guilds. Boat Race is a current event.

### 7. Read Salty Pete NPC file
- **Key connection:** Salty Pete owns *The Barnacle's Revenge*, his former crew was intimidated away before the boat race. Looking for replacements. This directly ties to the sabotage — his crew being scared off is part of the pattern.

### 8. Read Merchants Guild org file
- **Key context:** Goldman employs Gareth Ironbrow for dirty work, guild fees are partly a shakedown, uses "complications" against resisters. This supports the sabotage being a guild operation.

### 9. Read Kellen Redshore, Mira Softstep, Isolde Fairweather NPC files
- **Confirmed existence** of all three at expected paths under `Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/`
- **Kellen Redshore:** Harbormaster, collects docking fees for Merchants Guild, knows every hull on the lake. This makes him a potential obstacle/complication — he works for the guild.
- **Mira Softstep:** Innkeeper at The Netted Nymph, gossip source. Perfect for tavern-based clue gathering.

### 10. Verified store file
- **The Netted Nymph:** Exists at `Private/1. World Almanac/World/Crestfall/Ardenville/The Netted Nymph.md`
- **Merchants Guild Warehouse:** Exists at `Private/1. World Almanac/World/Crestfall/Ardenville/Merchants Guild Warehouse.md`

### 11. Read existing quest files for format reference
- Read `The Artifact Wars.md` (Active), `Merchants Guild Quest.md` (Completed), `Bandit Camp Highreach Ardenville route.md` (Idea), `Missing Netters on Lake Arden.md` (Idea), `Sabotaged Sails Investigation.md` (Idea)
- **Observed patterns:** Ideas folder quests use `status: Idea` and `fc-category: Available Quests`, dataview blocks vary (some at top, some at bottom), wiki-links use full private paths in private files

---

## Reasoning

### Quest Name
Chose **"Boat Race Sabotage"** — clear, scannable, distinct from existing "Sabotaged Sails Investigation." Describes exactly what the quest is about.

### File Path
`Private/2. Reference/Events/Quests/Ideas/Boat Race Sabotage.md` — placed in Ideas folder matching other unassigned quests. Quests are DM-only per the skill (no public counterpart).

### Level & Difficulty
- **D-rank** as requested (intermediate, level 5-7 party)
- **Medium difficulty** — investigation quest with social and exploration challenges, no mandatory combat
- DCs set at 12-15 range, appropriate for D-rank (higher than the E-rank Sabotaged Sails quest which uses DC 12-13)

### YAML Frontmatter
- `fc-date` and `fc-end` left blank — no specific in-game date assigned yet
- `fc-category: Available Quests` — matches existing Ideas folder quests
- `status: Idea` — consistent with other Ideas folder quests
- `level: D` — as requested
- `tags` include `DLevelQuest`, `Crestfall`, `Ardenville`, `Investigation`, `Idea` — PascalCase per conventions

### Reward
200 gp + Gregor's backing with the lake guard — scaled up from E-rank quests (50-100 gp) to reflect D-rank difficulty. The relationship reward (Gregor as contact) ties into his DM Notes about hiring adventurers.

### Structure
Followed the skill template exactly:
1. YAML frontmatter
2. Dataview block (top)
3. Quest Overview with quest giver, reward, status, difficulty, and 2-sentence summary
4. Objectives (4 bullets)
5. Key NPCs (4 entries with roles)
6. Investigation / Mechanics (included because user explicitly requested investigation DCs and clue mechanics)
7. Potential Outcomes (Success and Failure/Ignored)
8. Complications (included — the Merchants Guild connection creates investigative complications)
9. Connections (included — links to related quests and events)
10. DM Notes (empty for DM to fill)
11. Dataview block (bottom)

### Investigation / Mechanics Design
Created a structured investigation with three tiers:

**Sabotage Sites** (3 physical evidence checks):
- Cut sails — Investigation DC 14 (precise cuts point to a specific tool)
- Loosened moorings — Investigation DC 13 (professional knot work, not random vandalism)
- Scaring off crew — Persuasion DC 14 (social check to get witnesses to talk)

**Clue Trail** (5 information-gathering opportunities):
- Salty Pete — no check (freely given, connects to his NPC file where his crew was already intimidated)
- Dockworkers — Persuasion DC 13 or Intimidation DC 15 (alternative approaches)
- Tavern gossip via Mira — Persuasion DC 12 (easiest social check, rewards talking to the innkeeper)
- Dock stakeout — Perception DC 15 (highest DC, rewards patience and planning)
- Warehouse perimeter — Perception DC 14 (physical evidence linking to the warehouse)

**Evidence Threshold** (resolution mechanic):
- 3+ clues = Gregor can act officially → clean resolution
- Fewer than 3 = Gregor believes but can't move → quest partially succeeds but consequences may follow

This gives the party multiple approaches (social, stealth, investigation) and doesn't railroad them into a specific path.

### Wiki-Links
All links use full private paths since this is a DM-only file:
- NPCs: `[[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/{Name}|{Display}]]`
- Settlement: `[[Private/1. World Almanac/World/Crestfall/Ardenville/Ardenville|Ardenville]]`
- Groups: `[[Private/1. World Almanac/World/Groups/Merchants Guild|Merchants Guild]]`
- Stores: `[[Private/1. World Almanac/World/Crestfall/Ardenville/{Name}|{Display}]]`
- Events: `[[Private/2. Reference/Events/World Events/Timeline/0496-03-15 Lake Arden Boat Race|Lake Arden Boat Race]]`
- Quests: `[[Private/2. Reference/Events/Quests/{Status}/{Name}|{Display}]]`

All linked files verified to exist in the vault.

### Vault Integration
- **Salty Pete connection:** His NPC file mentions crew intimidation — this quest directly addresses that. Success outcome lets him re-crew and race.
- **Kellen Redshore complication:** His DM Notes say he collects fees for the Merchants Guild — natural obstacle for the investigation.
- **Mira Softstep as gossip source:** Her character is the town gossip — perfect for tavern-based clue gathering.
- **Merchants Guild Warehouse:** Physical location for the investigation trail to lead toward.
- **Lake Arden Boat Race:** The event at stake — linked in Connections.
- **Existing Sabotaged Sails Investigation:** Linked in Connections as a related quest from a different quest giver (Isolde vs. Gregor).
- **Merchants Guild Quest (Completed):** Party's prior history with the guild — linked in Connections for DM reference.

### Relationship to Existing "Sabotaged Sails Investigation"
The existing E-rank quest features Mayor Isolde as quest giver and targets "Marla Vex" as the culprit. This new D-rank quest features Gregor Woods as quest giver and targets the Merchants Guild more broadly. They can coexist as:
- Alternative quest hooks (different NPCs offering the same general problem)
- Escalating quests (Isolde's simpler E-rank version vs. Gregor's deeper D-rank investigation)
- Connected storylines (linked in the Connections section)

### Sections Included
- **Investigation / Mechanics** — explicitly requested by user
- **Complications** — included because the Merchants Guild connection creates meaningful investigative obstacles (Kellen's dual loyalty, hired-hand deniability, warehouse trespassing risk)
- **Connections** — included to link this quest to the broader boat race storyline and existing vault content

### Sections Omitted
- **Multiple Approaches** — not needed; the investigation mechanics already provide multiple paths
- No invented secrets or plot hooks beyond what the user specified

---

## File Created

### `Private/2. Reference/Events/Quests/Ideas/Boat Race Sabotage.md`

```markdown
---
fc-date:
fc-end:
fc-category: Available Quests
type: Quest
name: Boat Race Sabotage
status: Idea
level: D
location: Ardenville
region: Crestfall
quest_giver: Captain Gregor Woods
reward: 200 gp + lake guard backing
difficulty: Medium
tags:
  - Quest
  - DLevelQuest
  - Crestfall
  - Ardenville
  - Investigation
  - Idea
---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```

## Quest Overview

**Quest Giver**: [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods|Captain Gregor Woods]]
**Reward**: 200 gp + Gregor's backing with the lake guard
**Status**: Available
**Difficulty**: D

Someone is sabotaging boat race preparations in [[Private/1. World Almanac/World/Crestfall/Ardenville/Ardenville|Ardenville]] — cutting sails, loosening moorings, scaring off crew. [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods|Gregor]] suspects the [[Private/1. World Almanac/World/Groups/Merchants Guild|Merchants Guild]] is rigging the [[Private/2. Reference/Events/World Events/Timeline/0496-03-15 Lake Arden Boat Race|Lake Arden Boat Race]] and needs proof before he can act.

## Objectives
- Investigate sabotage sites along the docks
- Identify who is behind the attacks
- Gather enough evidence to confront the saboteurs or their employer
- Report findings to Gregor before race day

## Key NPCs
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Gregor Woods|Captain Gregor Woods]] — quest giver, lake guard captain
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Salty Pete|Salty Pete]] — victim, crew intimidated away from *The Barnacle's Revenge*
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Kellen Redshore|Kellen Redshore]] — harbormaster, collects fees for the Merchants Guild
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Mira Softstep|Mira Softstep]] — innkeeper at [[Private/1. World Almanac/World/Crestfall/Ardenville/The Netted Nymph|The Netted Nymph]], hears dock gossip

## Investigation / Mechanics

### Sabotage Sites
- **Cut sails** — Investigation DC 14: cuts are precise, made with a short hooked blade, not a sailor's tool
- **Loosened moorings** — Investigation DC 13: knots professionally untied, not cut — someone who knows rigging
- **Scaring off crew** — Persuasion DC 14 to get spooked dockworkers to talk; they describe hooded figures flashing guild tokens

### Clue Trail
- **Question [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Salty Pete|Salty Pete]]** — no check: freely shares his crew was threatened by men "who smelled like warehouse tar"
- **Question dockworkers** — Persuasion DC 13 or Intimidation DC 15: one saw a woman matching a guild agent near the targeted boats
- **Tavern gossip** — Persuasion DC 12 with [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Mira Softstep|Mira]]: she overheard warehouse workers joking about "clearing the field"
- **Dock stakeout** — Perception DC 15: spot a figure moving between boats after midnight, heading toward the [[Private/1. World Almanac/World/Crestfall/Ardenville/Merchants Guild Warehouse|Merchants Guild Warehouse]]
- **Search warehouse perimeter** — Perception DC 14: find a stash of hooked blades and cut rope hidden behind crates

### Evidence Threshold
- 3+ clues pointing to the Merchants Guild = enough for Gregor to act officially
- Fewer than 3 = Gregor believes the party but can't move without proof

## Potential Outcomes

### Success
- Gregor confronts the Merchants Guild with evidence; sabotage stops
- 200 gp paid from town coffers
- Gregor becomes a reliable contact for future work
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Salty Pete|Salty Pete]] can re-crew and race — offers the party spots on *The Barnacle's Revenge*

### Failure / Ignored
- Sabotage continues; several boats withdraw
- [[Private/1. World Almanac/World/Groups/Merchants Guild|Merchants Guild]]-backed boat wins by default
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Salty Pete|Salty Pete]] loses his chance to compete
- Gregor's reputation suffers — less willing to hire adventurers

## Complications
- [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Kellen Redshore|Kellen Redshore]] collects fees for the Merchants Guild — may stonewall the investigation or tip off warehouse workers
- The saboteurs are hired hands, not guild members — the Merchants Guild can deny involvement unless the party finds a contract or catches someone willing to talk
- Breaking into the warehouse for evidence risks arrest by dock guards

## Connections
- [[Private/2. Reference/Events/World Events/Timeline/0496-03-15 Lake Arden Boat Race|Lake Arden Boat Race]] — the event being sabotaged
- [[Private/2. Reference/Events/Quests/Ideas/Sabotaged Sails Investigation|Sabotaged Sails Investigation]] — related quest from [[Private/1. World Almanac/World/Crestfall/Ardenville/NPCs/Isolde Fairweather|Mayor Isolde]]
- [[Private/2. Reference/Events/Quests/Completed/Merchants Guild Quest|Merchants Guild Quest]] — party's prior entanglement with the guild

## DM Notes


---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
```

---

## Cascading Creation Check

The skill requires checking if supporting entities need to be created:

| Entity | Exists? | Action |
|---|---|---|
| Gregor Woods (NPC) | Yes — `Private/.../NPCs/Gregor Woods.md` | Linked |
| Salty Pete (NPC) | Yes — `Private/.../NPCs/Salty Pete.md` | Linked |
| Kellen Redshore (NPC) | Yes — `Private/.../NPCs/Kellen Redshore.md` | Linked |
| Mira Softstep (NPC) | Yes — `Private/.../NPCs/Mira Softstep.md` | Linked |
| Isolde Fairweather (NPC) | Yes — `Private/.../NPCs/Isolde Fairweather.md` | Linked |
| Merchants Guild (Org) | Yes — `Private/.../Groups/Merchants Guild.md` | Linked |
| Merchants Guild Warehouse (Store) | Yes — `Private/.../Ardenville/Merchants Guild Warehouse.md` | Linked |
| The Netted Nymph (Store) | Yes — `Private/.../Ardenville/The Netted Nymph.md` | Linked |
| lake Arden Boat Race (Event) | Yes — `Private/.../Timeline/0496-03-15 Lake Arden Boat Race.md` | Linked |
| Ardenville (Settlement) | Yes — `Private/.../Ardenville/Ardenville.md` | Linked |

**All referenced entities already exist in the vault.** No cascading creation needed.
