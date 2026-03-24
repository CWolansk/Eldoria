# Eval Output — Medium Combat Encounter (Bandit Ambush)

## Skills Read
1. `.github/skills/dnd-encounter-builder/SKILL.md` — full file (lines 1–300), encounter template, XP thresholds, multiplier table, initiative tracker format, monster details template
2. `.github/skills/CONVENTIONS.md` — full file, tag conventions (PascalCase), brevity rules, linking rules, plugin syntax

## Vault Searches Performed

| Search | Purpose | Key Findings |
|---|---|---|
| `Private/1. The Party/Players/` directory listing | Find party member files | 6 players: Claire, JP, Julie, Justin, Liz, Randi (+ Vanessa, inactive) |
| `Player Controls.md` | Get party level | Level 5, 8000 XP, E-rank guild |
| Each player file (Claire, JP, Julie, Justin, Liz, Randi) | Classes, races, equipment | Claire (Tempest Cleric/Water Genasi), JP (Monk/Half-Orc), Julie (Fighter-GWM/Human), Justin (Ranger/Human), Liz (Bard/Elf), Randi (Wizard/Aarakocra) |
| `Private/2. Reference/Encounters/` directory listing | Existing encounters, format reference | 13 existing encounters found |
| `Orc Patrol.md` (full read) | Match existing encounter format | Used as format reference — YAML frontmatter not present in template, tags inline, initiative tracker with meta-bind INPUT fields, full stat blocks in `<details>` blocks |
| Grep: "Ardenville" in World Almanac | Find Ardenville's location/region | Ardenville is in `Crestfall` region — coastal fishing town |
| Grep: "Highreach" in World Almanac | Find Highreach's location/region | Highreach is in `Crestfall` region — has Merchants Guild, Adventurers Guild, Exterminators Guild |

## XP Calculations

### Party Budget
- **Party size:** 6 players
- **Party level:** 5
- **Medium threshold per player (level 5):** 500 XP
- **Total Medium budget:** 6 × 500 = **3,000 adjusted XP**
- **Hard threshold (for reference):** 6 × 750 = 4,500 adjusted XP

### Creature Selection
| Creature | Qty | CR | XP Each | Total Base XP |
|---|---|---|---|---|
| Bandit Captain | 1 | 2 | 450 | 450 |
| Veteran | 1 | 3 | 700 | 700 |
| Thug | 4 | 1/2 | 100 | 400 |
| **Totals** | **6** | — | — | **1,550** |

### Adjusted XP
- **Total creatures:** 6
- **Encounter multiplier (3-6 creatures):** ×2
- **Adjusted XP:** 1,550 × 2 = **3,100**
- **Result:** 3,100 is just above Medium (3,000) and well below Hard (4,500) — solidly Medium difficulty

## Files Created

| File | Full Path |
|---|---|
| Bandit Ambush - Ardenville Road.md | `Private/2. Reference/Encounters/Bandit Ambush - Ardenville Road.md` |

No public file created — encounters are DM-only per the skill template.

## Decisions Made

### Creature Composition
- **Bandit Captain (CR 2)** — the leader who delivers the ultimatum; stays at range first round, then engages in melee. Provides the social hook ("Toll road. Everything on the cart.").
- **Veteran (CR 3)** — the muscle/lieutenant; a former soldier turned bandit. Charges the frontline fighter. Higher CR gives the encounter teeth without pushing into Hard.
- **4 Thugs (CR 1/2)** — rank-and-file bandits working in flanking pairs. Pack Tactics gives them relevance against a level 5 party despite low CR. Enough bodies to create tactical pressure without overwhelming.

### Why This Mix
- Bandits (CR 1/8) were considered but too weak for a level 5 party of 6 — they'd drop before getting a turn
- Berserkers (CR 2) were considered but felt too elite for common road bandits
- The Captain + Veteran + Thugs blend gives a clear hierarchy (leader → enforcer → grunts) that fits the "organized bandit crew" theme
- 6 creatures hits the sweet spot — enough to surround without triggering the ×2.5 multiplier

### Environmental Design
- **Felled tree as difficult terrain** — creates a chokepoint and makes the ambush feel planned
- **Tree line providing half cover** — gives ranged bandits a reason to stay at distance and creates tactical decisions for the party
- **Merchant cart behind the party** — stakes beyond just "kill the bandits"; cargo matters
- **Perception DC 14 for surprise** — not trivially easy, not impossibly hard. Justin (Ranger) likely has high Perception.

### Tactical Design
- **Morale break on Captain death** — prevents the encounter from dragging once the leader drops; remaining thugs scatter
- **Flanking pairs for thugs** — Pack Tactics is their main threat; pairs ensure they can use it
- **Veteran targets melee (Julie)** — draws the GWM fighter into a meaningful duel rather than letting her cleave through thugs uncontested

### Narrative Connections
- The road between Ardenville and Highreach is in the Crestfall region — tagged accordingly
- Justin owns a merchant cart and is a Merchants Guild member — this scenario could feel personal if the bandits specifically target merchant carts
- The Captain's military insignia is a dangling thread — could connect to a veteran's storyline later if the DM wants
- The crude trade route map could lead to discovering more ambush sites or a bandit hideout

### Template Adherence
- Followed the skill template exactly: Overview → Hook → Monsters table → Initiative Tracker → Combat Notes → Treasure → Monster Details → Session Notes → Dataview
- All 6 party members included in initiative tracker with meta-bind INPUT fields
- All 6 monster entries have meta-bind HP tracking and notes fields
- Initiative Controls with sort button included
- Stat blocks in collapsible `<details>` blocks
- Read-aloud hook in blockquote format
- Dice roller syntax used for treasure (`` `dice: 4d6` ``)
- Distribution section includes all 6 party members (including Randi, who was missing from some older encounters)
