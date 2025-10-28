#MagicItem #Rare 
**Name:** Bracer of Piercing Arrows 
**Source:** Homebrew  
**Page:** —  
**Rarity:** rare  
**Type:** wondrous item  
**Attunement:** requires attunement by a creature with at least 1 level in Ranger  
**Damage:** _None_  
**Properties:** _Piercing Shot (3/day), Precise Aim (1/day)_  
**Mastery:** _None_  
**Weight:** _1 lb_  
**Value:** 1,500 gp  
**Text:**  This finely tooled leather bracer is decorated with intricate carvings of fletched arrows. When worn, it imbues the ranger’s shots with uncanny precision, enabling them to strike critical targets with deadly accuracy.
- **Piercing Shot (3/day):** Before making an attack roll with a ranged weapon, you can activate Piercing Shot and choose a specific body part to target. On a hit, the target suffers a special effect based on the location struck:
	- **Eyes** – Target has disadvantage on Wisdom (Perception) checks relying on sight and on ranged attack rolls until the end of its next turn.
	- **Arm/Hand** – Target cannot wield two-handed weapons and may only hold a single object at a time until the end of its next turn.
	- **Foot/Leg** – Target’s movement speed is halved until the end of its next turn.
	- **Torso** – Target must make a Constitution saving throw (DC = 10 + your proficiency bonus + your Dexterity modifier) the next time it attempts an action. On a failed save, the target loses its action and reactions until the start of its next turn.
- **Precise Aim (1/day):** As a bonus action at the start of your turn, you may activate Precise Aim. Until the end of your next turn, whenever you hit a creature with a weapon attack, all allies gain advantage on attack rolls against that target.

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
