
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Vanessa",
  class: "Druid (Circle of the Land)",
  level: 5,
  race: "Dragonborn",
  background: "Hermit",
  str: 13,
  dex: 14,
  con: 16,
  int: 13,
  wis: 17,
  cha: 12,
  ac: 15,
  speed: 30,
  hp: 36,
  hitDice: '5d8',
  proficiencyBonus: 3,
  saves: ['int', 'wis'],
  skills: ['medicine', 'nature', 'religion', 'survival'],
  spellcasting: 'wis',
  simpleWeapons: true,
  martialWeapons: false
})
```

## Equipment


```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Talisman of Elemental Fury','Leather Armor', 'Wooden Shield', 'Scimitar', 'Shield',])
```


# Spells

**Note** : Quick reference spells for druid go here. 
```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Poison Spray', 'Frostbite'])
```


# Class Information 

## Background

```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['Hermit'])
```

## Feats
**Note** : feats are optional but you have one available  
```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, [])
```
## Race

```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Dragonborn'])
```

## Notes
```custom-frames
frame: VanessaNotes
style: height: 1000px;
```


## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #druid_phb,state:sub_land_phb=b1
```
