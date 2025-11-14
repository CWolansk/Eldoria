
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Julie",
  class: "Fighter",
  level: 5,
  race: "Human",
  str: 18,
  dex: 14,
  con: 16,
  int: 6,
  wis: 11,
  cha: 11,
  ac: 17,
  speed: 30,
  saves: ['str', 'con'],
  skills: ['acrobatics', 'athletics', 'intimidation','perception', 'survival'],
  spellcasting: 'int',
  spellcasting: false,
  simpleWeapons: true,
  martialWeapons: true
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Corpse Slayer Flamberge Bastard Sword', 'Greataxe', 'Sigil of Thunderous Might', 'Scourge Armblade','Chain Mail', 'Potion of healing', 'pipe of smoke monsters', 'Explorer\'s Pack', 'Grappling Hook', 'handaxe'])
```


# Class Information 

## Background
```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['Archaeologist'])
```

## Feats
```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, ['Great Weapon Master', 'Tough'])
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
