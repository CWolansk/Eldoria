
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Claire",
  class: "Cleric",
  level: 5,
  race: "Water Genasi",
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
await ItemLookup.display(dv, ['Amulet of Divine Retribution', '+1 Warhammer', 'Spell Scroll (1st Level)|Burning Hands','Lightning Rod', 'Warhammer of Warning'])
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
await BackgroundLookup.display(dv, ['Sailor'])
```

## Feats
```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, ['Alert', 'Lucky', 'War Caster'])
```

## Race 
```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Genasi (Water)'])
```

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #cleric_phb,state:sub_abjuration_phb=b1
```
