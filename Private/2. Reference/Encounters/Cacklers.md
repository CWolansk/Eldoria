---
type: Encounter
encounter_type: Combat
name: Cacklers
status: Draft
location: Room 14 Level 3
difficulty: ""
party_level: 5
tags:
  - Encounter
  - Combat
  - Level5
---

# Cacklers

```encounter-yaml
schemaVersion: eldoria-encounter-v1
id: cacklers
type: combat
monsterGroups:
  - monsterId: "monster:cackler:ggr"
    name: Cackler
    quantity: 1
    source: GGR
    cr: 1/2
    xpEach: 100
    hp:
      average: 10
      formula: 3d6
    ac: 15
    speed: walk 30 ft.
    initiativeModifier: 3
runtimeDefaults:
  initiativeMode: individual
  hpMode: average
notes:
  tactics: []
  terrain: []
treasure:
  coins: ""
  items: []
```

## Overview
**Type**: Combat
**Location**: Room 14 Level 3
**Party Level**: 5
**Difficulty**: -

## Hook
> 

## Monsters

| Monster | Qty | AC | HP | CR | XP Each |
|---|---:|---:|---|---|---:|
| Cackler | 1 | 15 | 10 (3d6) | 1/2 | 100 |

## Combat Notes
- 

## Session Notes


## Mentioned In

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
