 **Name:** Aid
**Level:** 2nd  
**Casting Time:** Action  
**Duration:** 8 hours  
**School:** Abjuration  
**Range:** 30 feet  
**Components:** V, S, M (a tiny strip of white cloth)  
**Classes:** Artificer, Cleric, Paladin  
**Optional/Variant Classes:** Bard, Ranger  
**Source:** PHB'14  
**Page:** 211  
**Text:** Your spell bolsters your allies with toughness and resolve. Choose up to three creatures within range. Each target's hit point maximum and current hit points increase by 5 for the duration.
**At Higher Levels:**  At Higher Levels. When you cast this spell using a spell slot of 3rd level or higher, a target's hit points increase by an additional 5 for each slot level above 2nd.
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
  mdUtils.addLinkToNote("${noteName}", "Spells", "Players/" + "${selectedPlayer}" + ".md", "2nd");
\`\`\``

return engine.markdown.create(markdownOutput);
```
  


```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
  