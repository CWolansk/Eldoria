 **Name:** +1 Ammunition
  **Rarity:** uncommon  
  **Type:** ammunition, generic variant  
  **Attunement:** -  
  **Damage:** -  
  **Properties:** -  
  **Mastery:** -  
  **Weight:** -  
  **Source:** DMG'14  
  **Page:** 150  
  **Value:** 600 gp  
  **Text:** You have a +1 bonus to attack and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical. Base items. This item variant can be applied to the following base items:Arrow (+1 Arrow)Blowgun Needle (+1 Blowgun Needle)Crossbow Bolt (+1 Crossbow Bolt)Draconite Bolt (+1 Draconite Bolt)Energy Cell (+1 Energy Cell)Metal Shot (+1 Metal Shot)Modern Bullet (+1 Modern Bullet)Renaissance Bullet (+1 Renaissance Bullet)Sling Bullet (+1 Sling Bullet)
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
  