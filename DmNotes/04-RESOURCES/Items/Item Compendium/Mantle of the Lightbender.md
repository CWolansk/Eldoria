 **Name:** Mantle of the Lightbender
  **Rarity:** uncommon  
  **Type:** wondrous item  
  **Attunement:** requires attunement  
  **Damage:** -  
  **Properties:** -  
  **Mastery:** -  
  **Weight:** -  
  **Source:** FM!  
  **Page:** 180  
  **Value:** 600 gp  
  **Text:** This elegant cloak is lined with the iridescent mane of a lightbender. When you're hit with an attack while wearing this cloak, you can use your reaction to reveal that the attacker is attacking a past visual imprint of you. You appear in an unoccupied space you can see within 30 feet of your imprint, the attack misses, then the imprint disappears. You can't use this reaction if the attacker relies on senses other than sight, such as blindsight, or if they can perceive illusions as false, as with truesight. Once you use the cloak to reveal a past visual imprint of yourself, you can't do so again until the next dawn.
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
if (!selectedPlayer || selectedPlayer === 'None') {
return engine.markdown.create("⚠️ **Select a Player**");
}

let filePath = app.vault.adapter.getFullPath(app.workspace.getActiveFile().path);
let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
let noteName = filePath.split('\\').pop().replace('.md', '');

let markdownOutput = `
\`\`\`meta-bind-button
style: primary
label: Give to ${selectedPlayer}
action:
 type: inlineJS
 code: |
  let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
  mdUtils.addLinkToNote("${noteName}", "Magic Items", "Players/" + "${selectedPlayer}" + ".md");
\`\`\``

return engine.markdown.create(markdownOutput);
```
  


```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
  