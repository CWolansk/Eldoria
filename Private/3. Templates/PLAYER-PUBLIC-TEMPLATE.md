## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Character Name",
  class: "Class",
  subclass: "Subclass",
  level: 1,
  race: "Race",
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  ac: 10,
  speed: 30,
  saves: ['str', 'dex'],
  skills: ['athletics', 'acrobatics'],
  spellcasting: 'int',
  simpleWeapons: true,
  martialWeapons: false
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Item 1', 'Item 2'])
```

# Spells 
```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Spell 1', 'Spell 2'])
```


# Class Information 

## Background
```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['Background Name'])
```

## Feats
```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, ['Feat Name'])
```

## Race
```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Race Name'])
```
