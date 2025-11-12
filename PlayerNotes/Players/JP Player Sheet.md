---
level: 1
proficiency_bonus: 2
dg-publish: true
---

```event-btns
items:
  - name: Short Rest
    value: short-rest
  - name: Long Rest
    value: long-rest
```

```healthpoints
state_key: my_character_hp
health: 28
hitdice:
  dice: d8
  value: 3
```

```ability
abilities:
  strength: 14
  dexterity: 16
  constitution: 13
  intelligence: 12
  wisdom: 10
  charisma: 8

proficiencies:
  - dexterity
  - intelligence
```

```skills
proficiencies:
  - stealth
  - investigation
  - perception

expertise:
  - stealth
```

```consumable
items:
  - label: "Level 1 Spells"
    state_key: my_character_spells_1
    uses: 3
    reset_on: "long-rest"
  - label: "Sneak Attack"
    state_key: my_character_sneak_attack
    uses: 1
    reset_on: ["short-rest", "long-rest"]
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Longsword', 'Bag of Holding', 'Ring of Protection'])
```
