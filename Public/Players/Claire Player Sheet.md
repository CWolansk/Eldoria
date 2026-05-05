
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Claire",
  portrait: "Public/Players/ClaireDnD.png",
  class: "Cleric",
  subclass: "Tempest Domain",
  level: dv.page("Player Controls").level,
  race: "Water Genasi",
  background: "Sailor",
  experience: dv.page("Player Controls").ExperiencePoints,
  guildPoints: dv.page("Player Controls").GuildPoints,
  guildRank: dv.page("Player Controls").GuildRank,
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
    '+1 Warhammer',
    'Light Crossbow',
    'Lightning Rod',
    'Warhammer of Warning',
    "E-tier Adventurer's Guild Badge",
    "Spell Scroll (1st Level)|Burning Hands",
    'Amulet of Divine Retribution',
    'Griffon Key Loop',
    'Silverleaf Brooch',
])
```

# Spells 
```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, [])
```
- [Full Spell List with Filters](https://cwolansk.github.io/Eldoria/5etools/spells.html#abi-dalzim's%20horrid%20wilting_xge)
- [Quick Spell lookup](https://cwolansk.github.io/Eldoria/spell-search.html)


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

Direct link if Embed isn't working : https://u.cave.su/p/EldoriaClaireDnDNotes
```custom-frames
frame: ClaireNotes
style: height: 1000px;
```

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #cleric_phb,state:sub_tempest_phb=b1
```
