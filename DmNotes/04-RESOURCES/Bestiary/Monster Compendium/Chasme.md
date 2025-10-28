**Name:** Chasme
**Size:** Large  
**Type:** Fiend (Demon)  
**Alignment:** chaotic evil  
**AC:** 15  
**HP:** 78 (12d10 + 12)  
**Speed:** 20 ft., fly 60 ft.  
**STR:** 15  
**DEX:** 15  
**CON:** 12  
**INT:** 11  
**WIS:** 14  
**CHA:** 10  
**Saving Throws:** Dex +5, Wis +5  
**Skills:** Perception +5  
**Damage Vulnerabilities:** -  
**Damage Resistances:** cold, fire, lightning  
**Damage Immunities:** poison  
**Condition Immunities:** poisoned  
**Senses:** blindsight 10 ft., darkvision 120 ft., passive Perception 15  
**Languages:** Abyssal; telepathy 120 ft.  
**CR:** 6 (2,300 XP)  
**Environment:** Planar (Abyss)  
**Treasure:** Relics  

**Traits:** Demonic Restoration. If the chasme dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss.
Magic Resistance. The chasme has Advantage on saving throws against spells and other magical effects.
Spider Climb. The chasme can climb difficult surfaces, including along ceilings, without needing to make an ability check.

**Actions:** Proboscis. Melee Attack Roll: +5, reach 5 ft. Hit: 16 (4d6 + 2) Piercing damage plus 21 (6d6) Necrotic damage. If the target is a creature, its Hit Point maximum decreases by an amount equal to the Necrotic damage taken.

**Bonus Actions:** Drone. Constitution Saving Throw: DC 12, each creature in a 30-foot Emanation originating from the chasme (demons automatically succeed on this save). Failure: The target has the Unconscious condition and repeats the save at the end of each of its turns. The target succeeds automatically after 10 minutes or if it takes damage or a creature within 5 feet of it takes an action to empty a flask of Holy Water on it. Success: The target is immune to this chasme's Drone for 24 hours.

**Reactions:** *No reactions listed.*

**Legendary Actions:** *No legendary actions listed.*

**Mythic Actions:** *No mythic actions listed.*

**Lair Actions:** *No lair actions listed.*

**Regional Effects:** *No regional effects listed.*


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
  mdUtils.addLinkToNote("${noteName}", "Monsters", "Players/" + "${selectedPlayer}" + ".md");
\`\`\``

return engine.markdown.create(markdownOutput);
```
  


```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
  