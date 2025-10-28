#Rare #MagicItem 
**Name:** Amulet of Divine Retribution  
**Source:** Homebrew  
**Page:** —  
**Rarity:** rare  
**Type:** wondrous item  
**Attunement:** requires attunement by a creature with at least 1 level in Cleric  
**Damage:** _None_  
**Properties:** _Divine Wrath (1/day), Divine Protection (1/day)_  
**Mastery:** _None_  
**Weight:** _½ lb_  
**Value:** 1,500 gp  
**Text:**  This silver amulet, engraved with glowing holy runes, hums faintly with divine power. When a cleric channels their faith, the amulet lashes out at their foes, turning holy resolve into swift judgment.
- **Divine Wrath (1/day):**  As an action, you may target one hostile creature you can see within 60 feet. That creature must make an Intelligence saving throw against your spell save DC. On a failed save, the creature becomes **vulnerable to radiant and fire damage** for 1 minute. The creature may repeat the saving throw at the end of each of its turns, ending the effect on a success.
- **Divine Protection (1/day):**  As an action, you radiate a protective aura of holy energy. At the start of each of your turns for up to 1 minute (as long as you maintain concentration), all allies within 30 feet regain **1d10 hit points**. This effect ends early if your concentration is broken.

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
  mdUtils.addLinkToNote(\'${filePath}\','Magic Items' ,'Players/' + \'${selectedPlayer}\' + '.md');
\`\`\`

            `;
            return engine.markdown.create(markdownOutput);
```


```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
