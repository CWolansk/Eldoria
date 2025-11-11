# Goblin Ambush

**Location:** Forest Road

**Description:** A group of goblins springs from hiding to ambush the party on a forest path.


---

## Encounter Overview

**Difficulty:** Deadly (Level 2 party of 5)  
**Total XP:** 500 (Adjusted: 1000)  
**Encounter Multiplier:** x2 (4 creatures)

---

## Monsters

| Monster | Qty | AC | HP | Speed | CR | XP Each | Total XP |
|---------|-----|----|----|-------|----|---------|---------|
| [[Goblin Assassin]] | 3 | 15 (studded leather) | 16 (3d6 + 6) | 30 ft., climb 20 ft. | 1/2 (100 XP) | 100 | 300 |
| [[Goblin Boss]] | 1 | 17 | 21 (6d6) | 30 ft. | 1 (200 XP) | 200 | 200 |

---

## Initiative Tracker

| Initiative                                   | Character/Monster | AC                   | HP                                                         | Notes                                       |
| -------------------------------------------- | ----------------- | -------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| `INPUT[number():memory^initClaire]`          | [[Private Claire notes]]        | -                    | -                                                          | `INPUT[text():memory^notesClaire]`          |
| `INPUT[number():memory^initJP]`              | [[JP Player Sheet]]            | -                    | -                                                          | `INPUT[text():memory^notesJP]`              |
| `INPUT[number():memory^initJulie]`           | [[Julie]]         | -                    | -                                                          | `INPUT[text():memory^notesJulie]`           |
| `INPUT[number():memory^initJustin]`          | [[Justin]]        | -                    | -                                                          | `INPUT[text():memory^notesJustin]`          |
| `INPUT[number():memory^initLiz]`             | [[Liz]]           | -                    | -                                                          | `INPUT[text():memory^notesLiz]`             |
| `INPUT[number():memory^initGoblinAssassin1]` | Goblin Assassin 1 | 15 (studded leather) | `INPUT[number(defaultValue(16)):memory^hpGoblinAssassin1]` | `INPUT[text():memory^notesGoblinAssassin1]` |
| `INPUT[number():memory^initGoblinAssassin2]` | Goblin Assassin 2 | 15 (studded leather) | `INPUT[number(defaultValue(16)):memory^hpGoblinAssassin2]` | `INPUT[text():memory^notesGoblinAssassin2]` |
| `INPUT[number():memory^initGoblinAssassin3]` | Goblin Assassin 3 | 15 (studded leather) | `INPUT[number(defaultValue(16)):memory^hpGoblinAssassin3]` | `INPUT[text():memory^notesGoblinAssassin3]` |
| `INPUT[number():memory^initGoblinBoss1]`     | Goblin Boss       | 17                   | `INPUT[number(defaultValue(21)):memory^hpGoblinBoss1]`     | `INPUT[text():memory^notesGoblinBoss1]`     |

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

---

## Combat Notes

**Environmental Factors:**
Goblins have advantage on Stealth checks in forest terrain. They use hit-and-run tactics.

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

---
## Treasure

**Treasure Type:** Individual  
**Based on Encounter Difficulty:** Deadly

**Suggested Coins:** 8d6 sp, 6d6 gp, 2d6 pp
**Suggested Items:** 1-2 minor items, 75% chance of 1 magic item, 25% chance of 1 rare item

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

---
## Monster Details

### Goblin Assassin (x3)

**Quick Stats:** AC 15 (studded leather), HP 16 (3d6 + 6), Speed 30 ft., climb 20 ft.

<details>
<summary>📖 Full Stats</summary>

**STR/DEX/CON/INT/WIS/CHA:** 8/16/14/10/10/8

**Saving Throws:** _None_
**Skills:** Stealth +7
**Damage Resistances:** _None_
**Damage Immunities:** _None_
**Condition Immunities:** _None_
**Senses:** darkvision 60 ft., passive Perception 10
**Languages:** Common, Goblin

**Traits:**
Backstab. When the assassin has advantage on their attack roll against a creature who isn't a Construct or an Undead, their attacks deal an extra 3 (1d6) damage and inflict a bleeding wound on the target that lasts until the bleeding creature regains at least 1 hit point. A bleeding creature loses 2 hit points for each bleeding wound they have at the start of their turn. Any creature who can reach the target can use an action to stanch all the target's wounds, ending the effect.
Crafty. The assassin doesn't provoke opportunity attacks when they move out of an enemy's reach.

**Actions:**
Scimitar. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.
Dagger. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 5 (1d4 + 3) piercing damage.
Summon Shadows (1/Day). A 10-foot-radius sphere of magical darkness emanates from a point the assassin can see for 1 minute. The darkness spreads around corners. Except for the assassin, a creature with darkvision can't see through this darkness, and mundane light can't illuminate it. At the start of their turn, the assassin can move the darkness up to 30 feet to a point they can see (no action required). If the assassin takes damage, the effect ends.



</details>

[[Goblin Assassin]] - Full monster page

### Goblin Boss 

**Quick Stats:** AC 17, HP 21 (6d6), Speed 30 ft.

<details>
<summary>📖 Full Stats</summary>

**STR/DEX/CON/INT/WIS/CHA:** 10/15/10/10/8/10

**Saving Throws:** _None_
**Skills:** Stealth +6
**Damage Resistances:** _None_
**Damage Immunities:** _None_
**Condition Immunities:** _None_
**Senses:** darkvision 60 ft., passive Perception 9
**Languages:** Common, Goblin

**Traits:**
_No traits listed._

**Actions:**
Multiattack. The goblin makes two attacks, using Scimitar or Shortbow in any combination.
Scimitar. Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage, plus 2 (1d4) Slashing damage if the attack roll had Advantage.
Shortbow. Ranged Attack Roll: +4, range 80/320 ft. Hit: 5 (1d6 + 2) Piercing damage, plus 2 (1d4) Piercing damage if the attack roll had Advantage.



</details>

[[Goblin Boss]] - Full monster page


---

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
