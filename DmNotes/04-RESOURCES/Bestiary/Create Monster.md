# Create Custom Monster

**Name:** `INPUT[text(placeholder('Monster Name')):memory^monsterName]`

**Size:** 
```meta-bind
INPUT[inlineSelect(
	option('Tiny'), 
	option('Small'), 
	option('Medium'), 
	option('Large'), 
	option('Huge'), 
	option('Gargantuan'),
	defaultValue('Medium')
):memory^monsterSize]
```

**Type:** `INPUT[text(placeholder('Beast, Dragon, Humanoid, etc.')):memory^monsterType]`

**Alignment:** `INPUT[text(placeholder('Lawful Good, Chaotic Evil, etc.')):memory^monsterAlignment]`

**Armor Class:** `INPUT[text(placeholder('15 (Natural Armor)')):memory^monsterAC]`

**Hit Points:** `INPUT[text(placeholder('45 (7d8 + 14)')):memory^monsterHP]`

**Speed:** `INPUT[text(placeholder('30 ft., fly 60 ft.')):memory^monsterSpeed]`

**Challenge Rating:** `INPUT[text(placeholder('3 (700 XP)')):memory^monsterCR]`

**STR:** `INPUT[number(placeholder(12)):memory^monsterSTR]`
**DEX:** `INPUT[number(placeholder(14)):memory^monsterDEX]`
**CON:** `INPUT[number(placeholder(13)):memory^monsterCON]`
**INT:** `INPUT[number(placeholder(10)):memory^monsterINT]`
**WIS:** `INPUT[number(placeholder(12)):memory^monsterWIS]`
**CHA:** `INPUT[number(placeholder(8)):memory^monsterCHA]`

**Saving Throws:** `INPUT[text(placeholder('Dex +4, Wis +3')):memory^monsterSaves]`

**Skills:** `INPUT[text(placeholder('Perception +3, Stealth +4')):memory^monsterSkills]`

**Damage Vulnerabilities:** `INPUT[text(placeholder('Fire')):memory^monsterVulnerabilities]`

**Damage Resistances:** `INPUT[text(placeholder('Cold, Necrotic')):memory^monsterResistances]`

**Damage Immunities:** `INPUT[text(placeholder('Poison')):memory^monsterImmunities]`

**Condition Immunities:** `INPUT[text(placeholder('Charmed, Poisoned')):memory^monsterConditionImmunities]`

**Senses:** `INPUT[text(placeholder('Darkvision 60 ft., passive Perception 13')):memory^monsterSenses]`

**Languages:** `INPUT[text(placeholder('Common, Draconic')):memory^monsterLanguages]`

**Environment:** `INPUT[text(placeholder('Forest, Mountain')):memory^monsterEnvironment]`

**Treasure:** `INPUT[text(placeholder('Standard')):memory^monsterTreasure]`

**Traits:** `INPUT[textArea(placeholder('Special abilities and features')):memory^monsterTraits]`

**Actions:** `INPUT[textArea(placeholder('Attack actions and abilities')):memory^monsterActions]`

**Bonus Actions:** `INPUT[textArea(placeholder('Bonus action abilities')):memory^monsterBonusActions]`

**Reactions:** `INPUT[textArea(placeholder('Reaction abilities')):memory^monsterReactions]`

**Legendary Actions:** `INPUT[textArea(placeholder('Legendary actions (if any)')):memory^monsterLegendaryActions]`

```meta-bind-button
style: primary
label: "Save Custom Monster"
action:
  type: js
  file: Scripts/DBScriptsTesting/SaveCustomMonster.js
  args:
    name: "{memory^monsterName}"
    size: "{memory^monsterSize}"
    type: "{memory^monsterType}"
    alignment: "{memory^monsterAlignment}"
    ac: "{memory^monsterAC}"
    hp: "{memory^monsterHP}"
    speed: "{memory^monsterSpeed}"
    cr: "{memory^monsterCR}"
    str: "{memory^monsterSTR}"
    dex: "{memory^monsterDEX}"
    con: "{memory^monsterCON}"
    int: "{memory^monsterINT}"
    wis: "{memory^monsterWIS}"
    cha: "{memory^monsterCHA}"
    saves: "{memory^monsterSaves}"
    skills: "{memory^monsterSkills}"
    vulnerabilities: "{memory^monsterVulnerabilities}"
    resistances: "{memory^monsterResistances}"
    immunities: "{memory^monsterImmunities}"
    conditionImmunities: "{memory^monsterConditionImmunities}"
    senses: "{memory^monsterSenses}"
    languages: "{memory^monsterLanguages}"
    environment: "{memory^monsterEnvironment}"
    treasure: "{memory^monsterTreasure}"
    traits: "{memory^monsterTraits}"
    actions: "{memory^monsterActions}"
    bonusActions: "{memory^monsterBonusActions}"
    reactions: "{memory^monsterReactions}"
    legendaryActions: "{memory^monsterLegendaryActions}"
```

---

## Instructions

Fill out the form above to create a custom monster. All fields are optional except for the Name. Click "Save Custom Monster" to add it to your bestiary database and create a markdown note for it.

The monster will be saved to both:
- Your local database (for searching)
- A markdown note in the Monster Compendium folder
