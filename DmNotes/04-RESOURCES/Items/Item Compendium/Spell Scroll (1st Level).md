**Name:** Spell Scroll (1st Level)
**Source:** DMG'14
**Page:** 200
**Rarity:** common
**Type:** scroll
**Attunement:** _None_
**Damage:** _None_
**Properties:** _None_
**Mastery:** _None_
**Weight:** _None_
**Value:** 15 gp
**Text:** A spell scroll bears the words of a single spell, written as a mystical cipher. If the spell is on your class's spell list, you can read the scroll and cast its spell without providing any material components. Otherwise, the scroll is unintelligible. Casting the spell by reading the scroll requires the spell's normal casting time. Once the spell is cast, the words on the scroll fade, and it crumbles to dust. If the casting is interrupted, the scroll is not lost.If the spell is on your class's spell list but of a higher level than you can normally cast, you must make an ability check using your spellcasting ability to determine whether you cast it successfully. The DC is 11. On a failed check, the spell disappears from the scroll with no other effect.Once the spell is cast, the words on the scroll fade, and the scroll itself crumbles to dust.A spell cast from this scroll has a save DC of 13 and an attack bonus of +5.A wizard spell on a spell scroll can be copied just as spells in spellbooks can be copied. When a spell is copied from a spell scroll, the copier must succeed on a DC 11 Intelligence (Arcana) check. If the check succeeds, the spell is successfully copied. Whether the check succeeds or fails, the spell scroll is destroyed.

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
