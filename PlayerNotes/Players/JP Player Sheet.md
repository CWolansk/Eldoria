
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "JP's Character",
  class: "Wizard",
  level: 5,
  race: "Elf",
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
  simpleWeapons: true,
  martialWeapons: false
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Longsword', 'Bag of Holding', 'Ring of Protection'])
```

# Spells 
```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Fireball'])
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
await FeatLookup.display(dv, ['Alert', 'Lucky', 'War Caster'])
```

## Race 
```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Aasimar (MPMM)'])
```

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #wizard_phb,state:sub_abjuration_phb=b1
```
