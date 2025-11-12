
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
  martialWeapons: true
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Longsword', 'Bag of Holding', 'Ring of Protection'])
```
