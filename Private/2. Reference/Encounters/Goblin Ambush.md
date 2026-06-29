---
type: Encounter
encounter_type: Combat
name: Goblin Ambush
status: Draft
location: Forest Road
difficulty: Deadly
party_level: 2
tags:
  - Encounter
  - Combat
  - Level2
---

# Goblin Ambush

```encounter-yaml
schemaVersion: eldoria-encounter-v1
id: goblin-ambush
type: combat
monsterGroups:
  - monsterId: "monster:goblin:mm"
    name: Goblin
    quantity: 6
    source: MM
    cr: 1/4
    xpEach: 50
    hp:
      average: 7
      formula: 2d6
    ac: 15
    speed: walk 30 ft.
    initiativeModifier: 2
runtimeDefaults:
  initiativeMode: individual
  hpMode: average
notes:
  tactics:
    - "**Environmental Factors:**"
  terrain: []
treasure:
  coins: ""
  items: []
```

## Overview
**Type**: Combat
**Location**: Forest Road
**Party Level**: 2
**Difficulty**: Deadly

## Hook
> 

## Monsters

| Monster | Qty | AC | HP | CR | XP Each |
|---|---:|---:|---|---|---:|
| Goblin | 6 | 15 | 7 (2d6) | 1/4 | 50 |

## Combat Notes
**Environmental Factors:**

## Session Notes
**What Happened:**

## Mentioned In

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[]]
SORT file.name ASC
```
