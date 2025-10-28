# Create Magic Item

**Name:** `INPUT[text(placeholder('Item Name')):memory^name]`

**Rarity:** 
```meta-bind
INPUT[inlineSelect(  
	option('common'), 
	option('uncommon'), 
	option('rare'), 
	option('very rare'), 
	option('legendary'), 
	option('artifact'),
	defaultValue('common')
):memory^rarity]
```

**Type:** `INPUT[text(placeholder('Weapon, martial, melee')):memory^type]`

**Attunement Required:** `INPUT[toggle(defaultValue(true)):memory^attunement]`

**Damage:** `INPUT[text(placeholder('1D8 piercing')):memory^damage]`

**Properties:** `INPUT[text(placeholder('finesse, light, versatile(1D8)')):memory^properties]`

**Weight:** `INPUT[text(placeholder('3 lb')):memory^weight]`

**Value:** `INPUT[number(placeholder(200)):memory^value]` gp

**Description:** `INPUT[textArea(placeholder('Item Description')):memory^text]`

```meta-bind-button
style: primary
label: "Save Magic Item"
action:
  type: js
  file: Scripts/DBScriptsTesting/SaveMagicItem.js
  args:
    name: "{memory^name}"
    rarity: "{memory^rarity}"
    type: "{memory^type}"
    attunement: "{memory^attunement}"
    damage: "{memory^damage}"
    properties: "{memory^properties}"
    weight: "{memory^weight}"
    value: "{memory^value}"
    text: "{memory^text}"
```

---

## Instructions

Fill out the form above to create a magic item. Required fields are Name and Rarity. Click "Save Magic Item" to add it to your item database and create a markdown note for it.

The item will be saved to:
- Your magic items database (for searching)
- A markdown note in the Magic Items folder
