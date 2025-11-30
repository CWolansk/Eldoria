
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Claire",
  class: "Cleric",
  level: 5,
  race: "Water Genasi",
  str: 16,
  dex: 8,
  con: 16,
  int: 14,
  wis: 18,
  cha: 12,
  ac: 18,
  speed: 30,
  saves: ['wis', 'cha'],
  skills: ['insight', 'medicine', 'perception', 'persuasion', 'religion'],
  spellcasting: 'wis',
  simpleWeapons: true,
  martialWeapons: true
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, [
    'Warhammer +1',
    'Light Crossbow',
    'Lightning Rod',
    'Warhammer of Warning',
    'Collapsible Rod',
    "E-tier Adventurer's Guild Badge",
    'Spell Scroll',
    'Amulet of Divine Retribution',
    'Griffin Key Loop',
    'Snare Kit',
    'Formal Invite to Elven Lands'
])
```

# Spells 
```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, [])
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
await FeatLookup.display(dv, ['Elemental Adept'])
```

## Race 
```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Genasi (Water)'])
```

## Notes
```custom-frames
frame: ClaireNotes
style: height: 1000px;
```

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #cleric_phb,state:sub_abjuration_phb=b1
```
