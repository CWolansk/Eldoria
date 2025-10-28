 **Name:** Longbow
  **Rarity:** none  
  **Type:** weapon, martial weapon, ranged weapon  
  **Attunement:** -  
  **Damage:** 1d8 piercing  
  **Properties:** ammunition (150/600 ft.), heavy, two‑handed  
  **Mastery:** -  
  **Weight:** 2 lb.  
  **Source:** PHB'14  
  **Page:** 149  
  **Value:** 50 gp  
  **Text:** Range. A weapon that can be used to make a ranged attack has a range shown in parentheses after the ammunition or thrown property. The range lists two numbers. The first is the weapon's normal range in feet, and the second indicates the weapon's maximum range. When attacking a target beyond normal range, you have disadvantage on the attack roll. You can't attack a target beyond the weapon's long range. Ammunition. You can use a weapon that has the ammunition property to make a ranged attack only if you have ammunition to fire from the weapon. Each time you attack with the weapon, you expend one piece of ammunition. Drawing the ammunition from a quiver, case, or other container is part of the attack. Loading a one-handed weapon requires a free hand. At the end of the battle, you can recover half your expended ammunition by taking a minute to search the battlefield.If you use a weapon that has the ammunition property to make a melee attack, you treat the weapon as an improvised weapon. A sling must be loaded to deal any damage when used in this way. Heavy. Creatures that are Small or Tiny have disadvantage on attack rolls with heavy weapons. A heavy weapon's size and bulk make it too large for a Small or Tiny creature to use effectively. Two-Handed. This weapon requires two hands to use. This property is relevant only when you attack with the weapon, not when you simply hold it.
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
  