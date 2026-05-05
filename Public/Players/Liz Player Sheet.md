
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Liz",
  portrait: "Public/Players/LizDnD.png",
  class: "Bard",
  subclass: "College of Lore",
  level: dv.page("Player Controls").level,
  race: "Elf",
  experience: dv.page("Player Controls").ExperiencePoints,
  guildPoints: dv.page("Player Controls").GuildPoints,
  guildRank: dv.page("Player Controls").GuildRank,
  str: 11,
  dex: 16,
  con: 14,
  int: 13,
  wis: 14,
  cha: 17,
  ac: 15,
  speed: 35,
  saves: ['dex', 'cha'],
  skills: ['Acrobatics', 'Animal Handling', 'Arcana', 'Insight', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of hand'],
  spellcasting: 'cha',
  simpleWeapons: true,
  martialWeapons: false,
})
```

## Equipment

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['+1 repeating Crossbow', 'Bag of Holding', 'Ring of Protection'])
```

# Spells 
```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Fireball'])
```
- [Full Spell List with Filters](https://cwolansk.github.io/Eldoria/5etools/spells.html#abi-dalzim's%20horrid%20wilting_xge)
- [Quick Spell lookup](https://cwolansk.github.io/Eldoria/spell-search.html)


# Class Information 

## Background
```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['Acolyte'])
```

## Feats
```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, ['Jack of All Trades',])
```

## Race 
```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Elf'])
```

## Notes

Direct link if Embed isn't working : https://u.cave.su/p/EldoriaLizDnDNotes

```custom-frames
frame: LizNotes
style: height: 1000px;
```

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #bard_phb,state:sub_lore_phb=b1
```
