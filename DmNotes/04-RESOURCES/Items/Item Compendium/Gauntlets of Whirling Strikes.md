 **Name:** Gauntlets of Whirling Strikes
  **Rarity:** rare  
  **Type:** wondrous item (gauntlets)  
  **Attunement:** requires attunement by a creature with at least 1 level in Monk  
  **Damage:** -  
  **Properties:** Whirling Fury (1/day), Evasive Maneuver (1/day)  
  **Mastery:** -  
  **Weight:** 1 lb  
  **Source:** Homebrew  
  **Page:** —  
  **Value:** 1,600 gp  
  **Text:** Crafted from dark leather reinforced with steel studs, these gauntlets radiate kinetic energy. They sharpen a monk’s timing and precision.\n- Whirling Fury (1/day): When you hit a single target with multiple consecutive attacks, each hit deals +1 additional damage of the same type. This bonus resets if you miss or switch targets.\n- Evasive Maneuver (1/day): As a bonus action, grant yourself and all allies within 10 feet a +1 bonus to AC and Dexterity saving throws for 1 minute.
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
  