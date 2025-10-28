# Encounter Creator

## Basic Information

**Encounter Name:** `INPUT[text(placeholder('Forest Ambush')):memory^encounterName]`

**Encounter Description:** `INPUT[textArea(placeholder('A group of goblins ambush the party on the forest road...')):memory^encounterDescription]`

**Location:** `INPUT[text(placeholder('Forest Road, Room 12, etc.')):memory^encounterLocation]`

---

## Monster Selection

**Add Monsters:** Enter monster names and quantities (one per line, format: "3x Goblin Boss" or "1x Adult Red Dragon")

`INPUT[textArea(placeholder('2x Goblin Boss\n1x Vistana Bandit\n1x Dust Goblin')):memory^monsterList]`

---

## Party Level (for XP calculations)

**Average Party Level:** `INPUT[number(defaultValue(4)):memory^partyLevel]`

**Number of Players:** `INPUT[number(defaultValue(5)):memory^playerCount]`

---

## Optional Settings

**Include Treasure:** `INPUT[toggle():memory^includeTreasure]`

**Treasure Type:** 
```meta-bind
INPUT[inlineSelect(
	option('Individual'), 
	option('Hoard'), 
	option('Custom'),
	defaultValue('Individual')
):memory^treasureType]
```

**Custom Notes:** `INPUT[textArea(placeholder('Special mechanics, environmental hazards, etc.')):memory^customNotes]`

---

## Generate Encounter

```meta-bind-button
style: primary
label: "Create Encounter"
action:
  type: js
  file: Scripts/DBScriptsTesting/CreateEncounter.js
```

---

## Instructions

1. **Enter basic encounter information** - Name, description, and location
2. **Add monsters** - List monsters with quantities (e.g., "2x Goblin", "1x Owlbear")
3. **Set party details** - Average level and number of players for XP calculations
4. **Configure options** - Choose treasure generation settings
5. **Click "Create Encounter"** - Generates a complete encounter page

### Monster Name Format
- Use exact names from your monster database
- Format: "[Number]x [Monster Name]"
- Examples: "3x Goblin Boss", "1x Adult Black Dragon", "2x Vistana Bandit"
- **Available monsters include:** Goblin Boss, Vistana Bandit, Dust Goblin, Adult Red Dragon, etc.
- **Tip:** Use the [[Bestiary/Monster Names Reference]] page to find correct names

### Features Generated
- **Monster Stats Summary** - Quick reference AC, HP, CR for each monster
- **Initiative Tracker** - Pre-loaded with all players and monsters
- **XP Calculation** - Total XP and adjusted XP based on encounter multipliers  
- **Challenge Rating** - Overall encounter difficulty
- **Treasure** - Optional treasure generation based on encounter CR
- **Monster Links** - Direct links to individual monster pages
