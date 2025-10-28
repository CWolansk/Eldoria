**Name:** +1 Arming Sword
**Source:** DMG'14
**Page:** 213
**Rarity:** uncommon
**Type:** weapon, martial weapon, melee weapon
**Attunement:** _None_
**Damage:** 1d6 piercing
**Properties:** finesse, light, versatile (1d8)
**Mastery:** _None_
**Weight:** 3 lb.
**Value:** 200 gp
**Text:** The base item can be found in Armour, Items, and Weapons Galore.You have a +1 bonus to attack and damage rolls made with this magic weapon. Light. A light weapon is small and easy to handle, making it ideal for use when fighting with two weapons. Finesse. When making an attack with a finesse weapon, you use your choice of your Strength or Dexterity modifier for the attack and damage rolls. You must use the same modifier for both rolls. Versatile. This weapon can be used with one or two hands. A damage value in parentheses appears with the property—the damage when the weapon is used with two hands to make a melee attack.

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
let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
let noteName = filePath.split('\\').pop().replace('.md', '');

let markdownOutput = `
\`\`\`meta-bind-button
style: primary
label: Give to ${selectedPlayer}
action:
 type: inlineJS
 code: |
  let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
  mdUtils.addLinkToNote("${noteName}", "Magic Items", "Players/" + "${selectedPlayer}" + ".md");
\`\`\``

return engine.markdown.create(markdownOutput);
```
  


```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
