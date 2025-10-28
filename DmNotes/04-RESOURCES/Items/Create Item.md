Name: `INPUT[text(placeholder('Item Name')):memory^name]`

Rarity : 
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

Type: `INPUT[text(placeholder('Weapon, martial, melee')):memory^type]`

Attunement?: `INPUT[toggle(defaultValue(true)):memory^attunement]`

Damage: `INPUT[text(placeholder('1D8 piercing')):memory^damage]`

Properties: `INPUT[text(placeholder('finesse, light, versailte(1D8)')):memory^properties]`

Weight: `INPUT[text(placeholder('3 lb')):memory^weight]`

Value: `INPUT[number(placeholder('200 gp')):memory^value]`

Text: `INPUT[textArea(placeholder('Item Description')):memory^text]`

```meta-bind-js-view
{memory^name} as itemName
{memory^rarity} as itemRarity
{memory^attunement} as itemAttunement
{memory^damage} as itemDamage
{memory^properties} as itemProperties
{memory^weight} as itemWeight
{memory^value} as itemValue
{memory^text} as itemText
---
itemName = context.bound.name;
itemRarity = context.bound.rarity;
itemAttunement = context.bound.attunement;
itemDamage = context.bound.damage;
itemProperties = context.bound.properties;
itemWeight = context.bound.weight;
itemValue = context.bound.value;
itemText = context.bound.text;

if (!itemName || itemName === '' || 
 !itemRarity || itemRarity === '' ||
 !itemAttunement || itemAttunement === '' ||
 !itemDamage || itemDamage === '' ||
 !itemProperties || itemProperties === '' ||
 !itemWeight || itemWeight === '' ||
 !itemValue || itemValue === '' ||
 !itemText || itemText === '' ) {
return engine.markdown.create("⚠️ **Fill out item fields**");
}

let filePath = app.vault.adapter.getFullPath(app.workspace.getActiveFile().path);
let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
let noteName = filePath.split('\\').pop().replace('.md', '');

let markdownOutput = `
\`\`\`meta-bind-button
style: primary
label: Create Item
action:
 type: inlineJS
 code: |
  let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
  mdUtils.addLinkToNote("${noteName}", "Magic Items", "Players/" + "${selectedPlayer}" + ".md");
\`\`\``

return engine.markdown.create(markdownOutput);
```