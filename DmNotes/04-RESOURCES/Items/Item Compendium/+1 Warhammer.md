**Name:** +1 Warhammer
**Source:** DMG'14
**Page:** 213
**Rarity:** uncommon
**Type:** weapon, martial weapon, melee weapon
**Attunement:** _None_
**Damage:** 1d8 bludgeoning
**Properties:** versatile (1d10)
**Mastery:** _None_
**Weight:** 2 lb.
**Value:** 400 gp
**Text:** You have a +1 bonus to attack and damage rolls made with this magic weapon. Versatile. This weapon can be used with one or two hands. A damage value in parentheses appears with the property—the damage when the weapon is used with two hands to make a melee attack.

```meta-bind
INPUT[inlineSelect(
	option('Claire'), 
	option('JP'), 
	option('Julie'), 
	option('Justin'), 
	option('Liz'), 
	option('None'), 
	defaultValue('None')
):memory^selectedPlayer]
```

```meta-bind-js-view
{memory^selectedPlayer} as selectedPlayer
---
	selectedPlayer = context.bound.selectedPlayer;
if (!selectedPlayer || selectedPlayer === 'None'){
	return engine.markdown.create("⚠️ **Select a Player**");
}
let filePath = app.vault.adapter.getFullPath(app.workspace.getActiveFile().path)
let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
let itemName = filePath.split('\\').pop().replace('.md', '');

let markdownOutput = `
\`\`\`meta-bind-button
style: primary 
label: Give Item To ${selectedPlayer}
action: 
 type: inlineJS
 code: |
  let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
  mdUtils.addLinkToNote(\'${itemName}\','Magic Items' ,'Players/' + \'${selectedPlayer}\' + '.md');
\`\`\`
`;

return engine.markdown.create(markdownOutput);
```


```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
