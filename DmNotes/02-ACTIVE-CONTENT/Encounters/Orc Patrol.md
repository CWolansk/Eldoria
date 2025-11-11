# Orc Patrol

**Location:** Orc Territory

**Description:** An orc war party patrols their territory, ready to eliminate any intruders.


---

## Encounter Overview

**Difficulty:** Deadly (Level 3 party of 5)  
**Total XP:** 2400 (Adjusted: 4800)  
**Encounter Multiplier:** x2 (3 creatures)

---

## Monsters

| Monster | Qty | AC | HP | Speed | CR | XP Each | Total XP |
|---------|-----|----|----|-------|----|---------|---------|
| [[Fiendish Orc]] | 2 | 16 (chain mail) | 93 (11d8 + 44) | 30 ft. | 4 (1,100 XP) | 1100 | 2200 |
| [[Goblin Boss]] | 1 | 17 | 21 (6d6) | 30 ft. | 1 (200 XP) | 200 | 200 |

---

## Initiative Tracker

| Initiative | Character/Monster | AC | HP | Notes |
|------------|-------------------|----|----|-------|
| `INPUT[number():memory^initClaire]` | [[Private Claire notes]] | - | - | `INPUT[text():memory^notesClaire]` |
| `INPUT[number():memory^initJP]` | [[JP Player Sheet]] | - | - | `INPUT[text():memory^notesJP]` |
| `INPUT[number():memory^initJulie]` | [[Julie]] | - | - | `INPUT[text():memory^notesJulie]` |
| `INPUT[number():memory^initJustin]` | [[Justin]] | - | - | `INPUT[text():memory^notesJustin]` |
| `INPUT[number():memory^initLiz]` | [[Liz]] | - | - | `INPUT[text():memory^notesLiz]` |
| `INPUT[number():memory^initFiendishOrc1]` | Fiendish Orc 1 | 16 (chain mail) | `INPUT[number(defaultValue(93)):memory^hpFiendishOrc1]` | `INPUT[text():memory^notesFiendishOrc1]` |
| `INPUT[number():memory^initFiendishOrc2]` | Fiendish Orc 2 | 16 (chain mail) | `INPUT[number(defaultValue(93)):memory^hpFiendishOrc2]` | `INPUT[text():memory^notesFiendishOrc2]` |
| `INPUT[number():memory^initGoblinBoss1]` | Goblin Boss | 17 | `INPUT[number(defaultValue(21)):memory^hpGoblinBoss1]` | `INPUT[text():memory^notesGoblinBoss1]` |

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
Orcs fight to the death. The boss uses tactical commands.

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

### Fiendish Orc (x2)

**Quick Stats:** AC 16 (chain mail), HP 93 (11d8 + 44), Speed 30 ft.

<details>
<summary>📖 Full Stats</summary>

**STR/DEX/CON/INT/WIS/CHA:** 18/12/18/11/11/16

**Saving Throws:** Str +6, Con +6, Wis +2
**Skills:** Intimidation +5
**Damage Resistances:** _None_
**Damage Immunities:** fire, poison
**Condition Immunities:** _None_
**Senses:** darkvision 60 ft., passive Perception 10
**Languages:** Abyssal, Common, Orc

**Traits:**
Aggressive. As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.
Gruumsh's Fury. The orc deals an extra 4 (1d8) damage when it hits with a weapon attack (included in the attacks).

**Actions:**
Multiattack. The orc makes two attacks with its greataxe or its spear.
Greataxe. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 15 (1d12 + 4 plus 1d8) slashing damage.
Spear. Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 12 (1d6 + 4 plus 1d8) piercing damage, or 13 (2d8 + 4) piercing damage if used with two hands to make a melee attack.
Battle Cry (1/Day). Each creature of the war chief's choice that is within 30 feet of it, can hear it, and not already affected by Battle Cry gain advantage on attack rolls until the start of the war chief's next turn. The war chief can then make one attack as a bonus action.



</details>

[[Fiendish Orc]] - Full monster page

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
