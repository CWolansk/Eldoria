
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Zazpoh the Matyr",
  class: "Wizard",
  level: dv.page("Player Controls").level,
  race: "Aasimar",
  background: "Cloistered Scholar",
  experience: dv.page("Player Controls").ExperiencePoints,
  guildPoints: dv.page("Player Controls").GuildPoints,
  guildRank: dv.page("Player Controls").GuildRank,
  str: 10,
  dex: 13,
  con: 14,
  int: 19,
  wis: 16,
  cha: 12,
  ac: 15,
  speed: 30,
  saves: ['int', 'wis'],
  skills: ['arcana', 'history', 'investigation'],
  spellcasting: 'int',
  simpleWeapons: true,
  martialWeapons: false
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, [ 'The Aegis Codex', 'Quarterstaff', 'Dagger', 'Calligrapher\'s Supplies', 'Scholar\'s Pack', 'Arcane Focus (Staff)'])
```

# Spells 
```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Light', 'Lesser Restoration', 'Daylight'])
```
- [Full Spell List with Filters](https://cwolansk.github.io/Eldoria/5etools/spells.html#abi-dalzim's%20horrid%20wilting_xge)
- [Quick Spell lookup](https://cwolansk.github.io/Eldoria/spell-search.html)


# Class Information 

## Background
```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['Cloistered Scholar'])
```

## Feats
```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, [])
```

## Race 
```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Aasimar'])
```

## Notes

Direct link if Embed isn't working : https://u.cave.su/p/EldoriaRandiDnDNotes

```custom-frames
frame: RandiNotes
style: height: 1000px;
```

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #wizard_phb,state:sub_divination_phb=b1
```
