**Name:** +1 Greatsword
**Source:** DMG'14
**Page:** 213
**Rarity:** uncommon
**Type:** weapon, martial weapon, melee weapon
**Attunement:** _None_
**Damage:** 2d6 slashing
**Properties:** heavy, two‑handed
**Mastery:** _None_
**Weight:** 6 lb.
**Value:** 600 gp
**Text:** You have a +1 bonus to attack and damage rolls made with this magic weapon. Heavy. Creatures that are Small or Tiny have disadvantage on attack rolls with heavy weapons. A heavy weapon's size and bulk make it too large for a Small or Tiny creature to use effectively. Two-Handed. This weapon requires two hands to use. This property is relevant only when you attack with the weapon, not when you simply hold it.

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
  mdUtils.addLinkToNote(\'${itemName}\', 'Magic Items' ,'Players/' + \'${selectedPlayer}\' + '.md');
\`\`\`
`;

return engine.markdown.create(markdownOutput);
```


```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
