# Eval Output — Cursed Grove of the Corrupted Dryad (Custom Boss Encounter)

**Prompt:** Build a hard encounter with a custom creature: a Corrupted Dryad that lives in a cursed grove near Hillcrest. She has legendary actions (2 per round), can entangle enemies with vines, and casts thorn-based spells. CR should be around 4-5. Include full stat block.

## Research Phase

### 1. Skills Read
- **`dnd-encounter-builder/SKILL.md`** — Full read (all sections including Custom Creature Construction, CR Estimation table, Legendary Actions guidelines, encounter template, initiative tracker format)
- **`CONVENTIONS.md`** — Full read (tag conventions, linking rules, brevity rules, plugin syntax for initiative tracker, meta-bind, dice roller, collapsible stat blocks)

### 2. Party Discovery
- **Source:** `Private/1. The Party/Players/Player Controls.md`
- **Party Level:** 5
- **Party Size:** 6 players
- **Roster:**
  - **Claire** — Water Genasi Tempest Cleric (status: Cursed — cannot taste)
  - **JP** — Half-Orc Monk (status: Cursed — cannot taste)
  - **Julie** — Human Fighter / Great Weapon Master (status: Healthy)
  - **Justin** — Human Ranger / Guild Merchant (status: Cursed — cannot taste)
  - **Liz** — Elf Bard / College of Lore (status: Healthy)
  - **Randi** — Aarakocra Wizard (status: Healthy)

### 3. Existing Encounters Reviewed
- Checked `Private/2. Reference/Encounters/` — found 13 existing encounter files
- Read **Goblin Ambush.md** (clean modern format with YAML frontmatter, initiative tracker with all party members, meta-bind buttons, monster table, collapsible stat blocks) — used as primary format reference
- Read **High Reach Mines Boss Fight.md** (older format, simpler structure, boss fight precedent)
- Read **Shambling mound Fight.md** (older format, environmental hazards precedent)
- New encounter matches the modern format from Goblin Ambush

### 4. Vault Searches for Hillcrest / The Lowlands
- **grep_search for "Hillcrest"** — 20+ matches found
  - `Private/1. World Almanac/World/Crestfall/Hillcrest/Hillcrest.md` — Hillcrest is a **village in the Crestfall region** (not The Lowlands)
  - `Public/World/Crestfall/Hillcrest/Hillcrest.md` — public counterpart exists
  - Hillcrest has extensive lore: wine country, Great Blight history, NPC Mayor Linden Hearthwood, current vineyard crisis linked to the Seekers Eye artifact
- **grep_search for "The Lowlands"** — exists as a separate region with Greymoor settlement, but Hillcrest is NOT in The Lowlands
- **file_search for `**/Hillcrest/Hillcrest.md`** — confirmed both private and public settlement files exist
- **Decision:** Linked encounter to Hillcrest in Crestfall using wiki-links: `[[Private/1. World Almanac/World/Crestfall/Hillcrest/Hillcrest|Hillcrest]]`

## CR Calculation & Stat Block Reasoning

### XP Budget
| Threshold | Per Player (Level 5) | Party of 6 |
|---|---|---|
| Easy | 250 | 1,500 |
| Medium | 500 | 3,000 |
| **Hard** | **750** | **4,500** |
| Deadly | 1,100 | 6,600 |

### Creature Composition

| Monster | CR | XP Each | Qty | Total XP | Role |
|---|---|---|---|---|---|
| Corrupted Dryad | 5 | 1,800 | 1 | 1,800 | Custom boss — vine entanglement, thorn spells, legendary actions |
| Vine Blight | 1/2 | 100 | 2 | 200 | Melee grapplers — restrain frontline fighters |
| Needle Blight | 1/4 | 50 | 4 | 200 | Ranged support — thorn needle volleys at squishies |

- **Total Base XP:** 2,200
- **Creature Count:** 7 → **Multiplier: ×2.5**
- **Adjusted XP:** 2,200 × 2.5 = **5,500**
- **Result:** 5,500 is between Hard (4,500) and Deadly (6,600) — **solidly Hard** ✓

### Why These Minions?
- Vine Blights and Needle Blights are thematically perfect (plant creatures in a corrupted grove)
- Vine Blights provide additional entanglement (Entangling Plants) that stacks with the Dryad's Grasping Vines for a vine-heavy encounter
- Needle Blights add ranged thorn damage that mirrors the Dryad's thorn theme
- The mix of melee grapplers + ranged shooters + legendary-action boss creates tactical complexity without being deadly

### Custom Stat Block: Corrupted Dryad (CR 5)

**Design Approach:** Started from the standard Dryad (CR 1) and heavily modified upward to match the DM's specs: legendary actions, vine entanglement, thorn spells.

**Defensive CR Estimation:**
- Base HP 110 → maps to ~CR 3-4
- Magic Resistance increases effective HP by ~50% vs. spell-using enemies → effective HP ~165 → CR ~5-6
- AC 15 matches CR 5 benchmark exactly
- **Defensive CR: ~5**

**Offensive CR Estimation:**
- Multiattack: Thorn Lash (2d6+2 piercing + 1d6 poison = ~12.5) + Barkskin Slam (2d8+2 = ~11) = ~23.5 per turn
- 2 Legendary Actions per round: if Thorn Burst × 2 = ~14 additional damage
- Total damage/round: ~37.5 → maps to CR 5 (33-38 range)
- Attack bonus +5 (slightly low for CR 5, offset by spell save DC 15 which matches CR 5)
- **Offensive CR: ~5**

**Final CR: (5 + 5) / 2 = 5** ✓

**Abilities Matching User Requirements:**
| Requested | Implemented |
|---|---|
| Legendary actions (2/round) | ✓ Thorn Burst (1 action), Vine Snare (1 action), Cursed Step (2 actions) |
| Entangle enemies with vines | ✓ Grasping Vines (Recharge 5-6) — 20 ft. AoE restrain, DC 15 STR; also Thorn Lash pulls targets 10 ft.; also Vine Snare legendary action |
| Thorn-based spells | ✓ Thorn whip (at will), entangle (3/day), spike growth (3/day), plant growth (1/day), blight (1/day) |
| CR 4-5 | ✓ CR 5 (1,800 XP) |
| Full stat block | ✓ Complete stat block in collapsible `<details>` section |

**Additional Flavor:**
- Corrupted Aura (necrotic damage to nearby creatures — suggests corruption)
- Tree Stride (repositioning between 3 large trees in the clearing — tactical mobility)
- Magic Resistance (makes her harder to control with spells — boss-appropriate)

## Files Created

| File | Path | Type |
|---|---|---|
| Cursed Grove of the Corrupted Dryad | `Private/2. Reference/Encounters/Cursed Grove of the Corrupted Dryad.md` | Encounter (DM-only) |

No public file created — encounters are DM-only per the skill rules.

## Key Decisions

1. **Hillcrest is in Crestfall, not The Lowlands.** Vault search confirmed this. Tagged with `Crestfall` and `Hillcrest`. Linked to the Hillcrest settlement file using proper wiki-link syntax.

2. **Added thematic minions (Vine Blights + Needle Blights)** to reach Hard difficulty. A single CR 5 creature against 6 level-5 PCs would only be ~1,800 adjusted XP (Easy). The blights are thematically coherent and push the encounter to 5,500 adjusted XP (Hard).

3. **2 legendary actions per round as specified** (not the standard 3). Designed three options with varied costs: Thorn Burst (ranged damage, 1 action), Vine Snare (control, 1 action), and Cursed Step (reposition + attack, costs 2 actions). This gives the DM tactical choice — burn both on control/damage, or save up for a big reposition turn.

4. **Environmental design** supports the creature's abilities: 3 large trees for Tree Stride, thorn-covered ground as difficult terrain, dim light canopy. The 60 ft. clearing gives ranged characters space but the Dryad can close distance with Tree Stride.

5. **All 6 party members in initiative tracker** with proper meta-bind INPUT fields matching the format from existing encounters (Goblin Ambush). Each monster gets its own row with defaultValue HP tracking.

6. **Stat block in collapsible `<details>` section** per CONVENTIONS.md. Quick stats visible at a glance, full details one click away. Same treatment for Vine Blight and Needle Blight stat blocks.

7. **YAML frontmatter** includes all required fields: type, encounter_type, location, difficulty, party_level, and PascalCase tags per conventions.

8. **No public file created** — encounters are DM-only preparation material per the skill definition ("Encounters are **DM-only** — they do not get a public counterpart").
