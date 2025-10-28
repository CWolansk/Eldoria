#MagicItem #Artifact #Item #SilverLeafLands 

**Name:** Aetherstone Compass
**Source:** CAL
**Page:** 1
**Rarity:** artifact
**Type:** wondrous item
**Attunement:** requires attunement
**Damage:** _None_
**Properties:** _None_
**Mastery:** _None_
**Weight:** _None_
**Value:** 0 gp
**Text:** Located in the Silverleaf Lands. Hidden in a ruined outpost at the edge of the Everwood. The party must defeat the wizard’s forces attempting to claim it and secure it for themselves. The compass will guide them on the safest and quickest path to the wizard’s stronghold

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

            let markdownOutput = `
\`\`\`meta-bind-button
style: primary 
label: Give Item To ${selectedPlayer}
action: 
 type: inlineJS
 code: |
  let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
  mdUtils.addLinkToNote(\'${filePath}\' ,'Magic Items','Players/' + \'${selectedPlayer}\' + '.md');
\`\`\`

            `;
            return engine.markdown.create(markdownOutput);
```


```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```