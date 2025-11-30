## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Grum 'Grog Guzzler' Ironjaw (JP)",
  class: "Monk (Drunken Master)",
  level: 5,
  race: "Half-Orc",
  str: 12,
  dex: 14,
  con: 12,
  int: 10,
  wis: 14,
  cha: 12,
  ac: 14,
  speed: 40,
  saves: ['str', 'dex'],
  skills: ['athletics', 'acrobatics', 'stealth', 'intimidation', 'performance'],
  spellcasting: 'wis',
  simpleWeapons: true,
  martialWeapons: false
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['+1 Quarterstaff',  'Gauntlets of Whirling Strikes','Blowgun', 'Robe of Useful Items', 'Fabulist Gem','Pole of Angling', 'Commoners Veneer', 'Adamantium Ingot'])
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
await FeatLookup.display(dv, ['Actor'])
```

## Race
```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Half-Orc'])
```

## Notes
```custom-frames
frame: JPNotes
style: height: 1000px;
```

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #wizard_phb,state:sub_abjuration_phb=b1
```
