---
name: dnd-encounter-builder
description: >
  Build combat, social, and mixed encounters for the Eldoria D&D campaign with initiative tracking,
  difficulty scaling, custom stat blocks, and character spotlights.
  Use this skill whenever the user wants to create an encounter, build a fight, design a combat,
  set up a social challenge, or prepare a mixed encounter.
  Also use when the user says "build a medium encounter", "make a hard fight", "create an encounter
  with a custom creature", "give this enemy legendary actions", or any request involving encounter
  difficulty, XP budgets, monster selection, or combat preparation — even if they don't say "encounter" explicitly.
---

# Eldoria Encounter Builder

Create encounters as markdown files in the Eldoria vault with initiative tracking, difficulty scaling, stat blocks, and character spotlights. Encounters are **session prep** — they describe what the party *might* face, not what happened (that's the event generator's job).

## What You Need From the User

There are two modes of encounter creation. Determine which one the user wants:

### Mode 1: Difficulty-Based (Auto-Build)
The user specifies a **difficulty level** and optionally a theme or location. You handle creature selection and XP math.

Minimum input:
- Difficulty: Easy / Medium / Hard / Deadly
- (Optional) Theme, location, creature type, narrative context

Example prompts:
- "Build a medium difficulty encounter for the current party"
- "Hard encounter in the Blackwood Forest with undead"
- "Deadly boss fight in the mines"

Your job: look up the party (level, size) → calculate XP thresholds → select appropriate creatures → build the full encounter file.

### Mode 2: Custom Creature (DM-Designed)
The user provides a **specific creature** with custom abilities, stats, or mechanics. You build the stat block and encounter around it.

Minimum input:
- Creature name or concept
- Key abilities or mechanics the DM wants

The DM may specify any of:
- Custom actions, bonus actions, reactions
- Legendary actions and how many per round
- Lair actions
- Movement modifications (extra movement, flying, burrowing)
- Resistances, immunities, condition immunities
- Spellcasting abilities
- Multi-phase mechanics (form changes, HP thresholds)

Example prompts:
- "Build an encounter with a corrupted treant that has legendary actions and can move twice per turn"
- "Hard encounter using a homebrew shadow assassin — give it these abilities..."
- "Boss fight with a dragon that has 3 legendary actions and lair actions"

Your job: build the stat block from the DM's specifications → calculate CR → set difficulty → build the full encounter file.

### In Both Modes, Also Look For:
- Location or terrain features
- Narrative hook (why is this happening?)
- Environmental hazards or special mechanics
- Whether the DM wants social/exploration approaches (mixed encounter) or pure combat
- Treasure preferences

## Shared Conventions

This skill follows the rules in [CONVENTIONS.md](../CONVENTIONS.md). Read that file for tag formatting, linking rules, brevity standards, plugin syntax, and batch creation order.

## Before You Create

1. **Search `Private/1. The Party/Players/`** for current party members, levels, and abilities
2. **Check the initiative-tracker plugin data** — the party roster is defined there (currently: Claire, JP, Julie, Justin, Liz, Randi)
3. **Search `Private/2. Reference/Encounters/`** for existing encounters — don't duplicate, and match the format
4. **Search the vault** for the location, relevant NPCs, and factions to link to
5. **Check recent session journals** in `Private/2. Session Journals/` for context on where the party is

## XP Thresholds (5e)

Use these to determine creature selection for difficulty-based encounters:

| Party Level | Easy | Medium | Hard | Deadly |
|---|---|---|---|---|
| 1 | 25 | 50 | 75 | 100 |
| 2 | 50 | 100 | 150 | 200 |
| 3 | 75 | 150 | 225 | 400 |
| 4 | 125 | 250 | 375 | 500 |
| 5 | 250 | 500 | 750 | 1,100 |
| 6 | 300 | 600 | 900 | 1,400 |
| 7 | 350 | 750 | 1,100 | 1,700 |
| 8 | 450 | 900 | 1,400 | 2,100 |
| 9 | 550 | 1,100 | 1,600 | 2,400 |
| 10 | 600 | 1,200 | 1,900 | 2,800 |

**Per-player thresholds.** Multiply by party size to get the encounter budget.

### Encounter Multiplier

| # of Monsters | Multiplier |
|---|---|
| 1 | ×1 |
| 2 | ×1.5 |
| 3-6 | ×2 |
| 7-10 | ×2.5 |
| 11-14 | ×3 |
| 15+ | ×4 |

**Adjusted XP** = Total monster XP × multiplier. Compare adjusted XP to the party's threshold budget.

## File Path

Encounters go in the DM reference folder:

```
Private/2. Reference/Encounters/{Encounter Name}.md
```

Encounters are **DM-only** — they do not get a public counterpart.

## Encounter Template

```markdown
# {Encounter Name}

#Encounter #{Type} #{Region} #Level{N} {additional tags}

```dataview
TABLE WITHOUT ID file.link AS "Related"
FROM [[{Encounter Name}]]
WHERE file.name != this.file.name
SORT file.name ASC
```

## Overview
**Type**: {Combat / Social / Mixed}
**Kingdom**: {Region (route or area)}
**Party Level**: {N}
**Difficulty**: {Easy / Medium / Hard / Deadly}
**Total XP**: {base XP} (Adjusted: {adjusted XP})
**Encounter Multiplier**: ×{N} ({count} creatures)

{1-2 sentence hook. What's happening and why. Link to relevant NPCs, locations, factions.}

## Hook
> {Read-aloud text. 2-4 lines max. What the party sees/hears/feels as the encounter begins.}

## Monsters

| Monster | Qty | AC | HP | Speed | CR | XP Each | Total XP |
|---------|-----|----|----|-------|----|---------|----------|
| [[{Monster}]] | {N} | {AC} | {HP (dice)} | {speed} | {CR} ({XP}) | {XP} | {total} |

## Initiative Tracker

| Initiative | Character/Monster | AC | HP | Notes |
|---|---|---|---|---|
| `INPUT[number():memory^initClaire]` | [[Private Claire notes]] | - | - | `INPUT[text():memory^notesClaire]` |
| `INPUT[number():memory^initJP]` | [[JP Player Sheet]] | - | - | `INPUT[text():memory^notesJP]` |
| `INPUT[number():memory^initJulie]` | [[Julie]] | - | - | `INPUT[text():memory^notesJulie]` |
| `INPUT[number():memory^initJustin]` | [[Justin]] | - | - | `INPUT[text():memory^notesJustin]` |
| `INPUT[number():memory^initLiz]` | [[Liz]] | - | - | `INPUT[text():memory^notesLiz]` |
| `INPUT[number():memory^initRandi]` | [[Randi]] | - | - | `INPUT[text():memory^notesRandi]` |
| `INPUT[number():memory^init{Monster}1]` | {Monster} 1 | {AC} | `INPUT[number(defaultValue({HP})):memory^hp{Monster}1]` | `INPUT[text():memory^notes{Monster}1]` |

### Initiative Controls
`BUTTON[sortInitiative]`

```meta-bind-button
label: "Sort by Initiative"
hidden: true
id: "sortInitiative"
style: default
action:
  type: command
  command: obsidian-sort-table:sort-table
```

## Combat Notes

**Environmental Factors:**
{Terrain features, cover, difficult terrain, lighting.}

**Tactics:**
{How the creatures fight. 2-3 bullets.}

**Special Mechanics:**
- [ ] Surprise round?
- [ ] Difficult terrain?
- [ ] Cover available?
- [ ] Special conditions?

**Turn Tracking:**
- [ ] Round 1
- [ ] Round 2
- [ ] Round 3
- [ ] Round 4
- [ ] Round 5

## Treasure

**Treasure Type:** {Individual / Hoard / Custom}
**Based on Encounter Difficulty:** {difficulty}

**Suggested Coins:** {dice expression}
**Suggested Items:** {brief list}

**Actual Treasure Found:**
- [ ] Coins:
- [ ] Items:
- [ ] Magic Items:

**Distribution:**
- [ ] Claire:
- [ ] JP:
- [ ] Julie:
- [ ] Justin:
- [ ] Liz:
- [ ] Randi:

## Monster Details

### {Monster Name} (×{qty})

**Quick Stats:** AC {AC}, HP {HP} ({dice}), Speed {speed}

<details>
<summary>📖 Full Stats</summary>

**STR/DEX/CON/INT/WIS/CHA:** {scores}

**Saving Throws:** {saves}
**Skills:** {skills}
**Damage Resistances:** {resistances}
**Damage Immunities:** {immunities}
**Condition Immunities:** {condition immunities}
**Senses:** {senses}
**Languages:** {languages}

**Traits:**
{trait descriptions}

**Actions:**
{action descriptions}

{Include if custom creature has them:}

**Bonus Actions:**
{bonus action descriptions}

**Reactions:**
{reaction descriptions}

**Legendary Actions ({N}/round):**
{The creature can take {N} legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The creature regains spent legendary actions at the start of its turn.}
{legendary action descriptions with costs}

**Lair Actions (Initiative 20):**
{lair action descriptions}

</details>

## Session Notes

**What Happened:**


**Player Actions:**


**Memorable Moments:**


**Loot Distributed:**


---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Optional Sections

Include these **only when the user asks** or the encounter warrants it:

### Character Spotlights
When the DM wants per-player moments. One subsection per party member with an opportunity and mechanic:
```markdown
## Character Spotlights

### [[Private Claire notes]]
**Opportunity**: {what this PC can uniquely contribute}
**Mechanics**: {relevant skill checks, abilities, or RP beats}

### [[JP Player Sheet]]
**Opportunity**: {what this PC can uniquely contribute}
**Mechanics**: {relevant skill checks, abilities, or RP beats}
```

### Multiple Approaches (Mixed Encounters)
When the encounter has social, stealth, or exploration paths alongside or instead of combat:
```markdown
## Multiple Approaches

### 1. {Approach Name} ({Type})
- **Description**: {what the party does}
- **Primary Skills**: {skill} (DC {N})
- **Success**: {outcome}
- **Failure**: {outcome}
```

### Consequences
For encounters that have lasting world impact:
```markdown
## Consequences

### Immediate
- {what changes right now}

### Long-Term
- {what changes in the future}
```

### Scaling Options
For encounters the DM might reuse at different levels:
```markdown
## Scaling Options

### Lower Level (Levels {N-2})
- {adjustments}

### Higher Level (Levels {N+2})
- {adjustments}
```

## Custom Creature Construction

When the DM provides a custom creature, build the stat block using these guidelines:

### CR Estimation
Use total effective HP, damage per round, AC, and attack bonus to estimate CR:

| CR | Prof | AC | HP | Attack | Damage/Round | Save DC |
|---|---|---|---|---|---|---|
| 1 | +2 | 13 | 78 | +3 | 9-14 | 13 |
| 2 | +2 | 13 | 93 | +3 | 15-20 | 13 |
| 3 | +2 | 13 | 108 | +4 | 21-26 | 13 |
| 4 | +2 | 14 | 123 | +5 | 27-32 | 14 |
| 5 | +3 | 15 | 138 | +6 | 33-38 | 15 |
| 6 | +3 | 15 | 153 | +6 | 39-44 | 15 |
| 7 | +3 | 15 | 168 | +6 | 45-50 | 15 |
| 8 | +3 | 16 | 183 | +7 | 51-56 | 16 |
| 9 | +4 | 16 | 198 | +7 | 57-62 | 16 |
| 10 | +4 | 17 | 213 | +7 | 63-68 | 16 |

### Legendary Actions
- Standard: 3 per round unless the DM specifies otherwise
- Each costs 1 action unless stated otherwise (some cost 2-3)
- Regained at the start of the creature's turn
- Common options: movement (no opportunity attacks), single attack, ability use

### Custom Movement
If the DM says "can move twice" or "extra movement":
- **Double movement**: Grant a bonus action dash, or a trait like "Relentless Stride: Can take the Dash action as a bonus action on each turn"
- **Extra movement type**: Add fly, burrow, climb, or swim speeds as the DM specifies

### Lair Actions
- Trigger on initiative count 20 (losing ties)
- Typically 3 options, one per round
- Affect the environment — tremors, darkness, hazards, terrain changes

## Writing Guidelines

### Brevity
- **10-second scan rule.** The DM needs to run combat from this file. Every section must be instantly scannable.
- Monster table: stats at a glance. Full details in collapsible blocks.
- Tactics: 2-3 bullets max. How they fight, when they flee.
- Hook read-aloud: 2-4 lines. Set the scene, get to initiative.

### General
- Every encounter gets an initiative tracker table with all current party members and all monsters
- Use meta-bind INPUT fields for initiative rolls, HP tracking, and notes (see CONVENTIONS.md for syntax)
- Monster stat blocks go in `<details>` collapsible sections — quick stats visible, full stats on click
- Link to existing monster pages, NPC files, location files, and faction files where they exist
- Tag with `#Encounter`, type, region, and level

## Cascading Creation

When building an encounter, check if supporting content is needed:
- Does the location have a file? If not, ask if you should create one (use `dnd-location-generator`)
- Are there named NPCs in the encounter? Check if they have files (use `dnd-npc-generator`)
- Is a faction involved? Check for an organization file (use `dnd-group-generator`)
- Don't create supporting files without asking — the DM may want a lightweight encounter without full world-building
