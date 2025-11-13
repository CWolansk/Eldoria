
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Julie",
  class: "Fighter",
  level: 5,
  race: "Human",
  str: 8,
  dex: 14,
  con: 12,
  int: 18,
  wis: 13,
  cha: 10,
  ac: 12,
  speed: 30,
  saves: ['int', 'wis'],
  skills: ['arcana', 'history', 'investigation', 'perception'],
  spellcasting: 'int',
  spellcasting: false,
  simpleWeapons: true,
  martialWeapons: false
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Corpse Slayer Bastard Sword', 'Sigil of Thunderous Might'])
```


# Class Information 

## Background
```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['Acolyte'])
```

## Feats
```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, ['Great Weapon Master'])
```

## Race 
```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Human'])
```

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #fighter_phb,state:sub_champion_phb=b1
```
