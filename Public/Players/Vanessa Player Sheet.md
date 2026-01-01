
## Character Stats

```dataviewjs
const {CharacterSheetDisplay} = await cJS()
await CharacterSheetDisplay.display(dv, {
  name: "Vanessa",
  class: "Druid (Circle of the Land)",
  level: dv.page("Player Controls").level,
  race: "Dragonborn",
  experience: dv.page("Player Controls").ExperiencePoints,
  guildPoints: dv.page("Player Controls").GuildPoints,
  guildRank: dv.page("Player Controls").GuildRank,
  background: "Hermit",
  str: 13,
  dex: 14,
  con: 16,
  int: 13,
  wis: 17,
  cha: 12,
  ac: 15,
  speed: 30,
  hp: 36,
  hitDice: '5d8',
  proficiencyBonus: 3,
  saves: ['int', 'wis'],
  skills: ['medicine', 'nature', 'religion', 'survival'],
  spellcasting: 'wis',
  simpleWeapons: true,
  martialWeapons: false
})
```

## Equipment


```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Talisman of Elemental Fury','Leather Armor', 'Wooden Shield', 'Scimitar', 'Shield',])
```


# Spells

```dataviewjs
const {SpellLookup} = await cJS()
await SpellLookup.display(dv, ['Poison Spray', 'Frostbite'])
```
- [Full Spell List with Filters](https://cwolansk.github.io/Eldoria/5etools/spells.html#abi-dalzim's%20horrid%20wilting_xge)
- [Quick Spell lookup](https://cwolansk.github.io/Eldoria/spell-search.html)

# Class Information 

## Background

```dataviewjs
const {BackgroundLookup} = await cJS()
await BackgroundLookup.display(dv, ['Hermit'])
```

## Feats
**Note** : feats are optional but you have one available  
```dataviewjs
const {FeatLookup} = await cJS()
await FeatLookup.display(dv, [])
```
## Race

```dataviewjs
const {RaceLookup} = await cJS()
await RaceLookup.display(dv, ['Dragonborn'])
```

## Notes
<iframe sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-top-navigation-by-user-activation allow-downloads allow-storage-access-by-user-activation" allow="encrypted-media; fullscreen; oversized-images; picture-in-picture; sync-xhr; geolocation; storage-access;" style="height: 1000px; width: 100%; border: none;" src="https://u.cave.su/p/EldoriaVanessaDnDNotes?showControls=true&showChat=true&showLineNumbers=true&useMonospaceFont=false"></iframe>

## Full Class Info
```custom-frames
frame: 5etoolsClass
style: height: 1000px;
urlSuffix: #druid_phb,state:sub_land_phb=b1
```
