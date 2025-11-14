// D&D Character Sheet Display for Obsidian CustomJS
// Usage in markdown dataviewjs block:
//   ```dataviewjs
//   const {CharacterSheetDisplay} = await cJS()
//   const charSheet = new CharacterSheetDisplay()
//   await charSheet.display(dv, {
//     name: "Gandalf",
//     class: "Wizard",
//     level: 5,
//     race: "Human",
//     str: 10,
//     dex: 14,
//     con: 12,
//     int: 18,
//     wis: 16,
//     cha: 14,
//     ac: 12,
//     speed: 30,
//     saves: ['int', 'wis'],
//     skills: ['arcana', 'history', 'investigation', 'perception'],
//     // Weapon proficiencies (always shown, true adds proficiency bonus)
//     simpleWeapons: true,      // add proficiency bonus to simple weapons?
//     martialWeapons: false,    // add proficiency bonus to martial weapons?
//     // Spellcasting (always shown, ability determines modifier, true/ability adds proficiency)
//     spellcasting: 'int'       // ability for spell attacks ('int', 'wis', 'cha', etc.) or false for no proficiency
//   })
//   ```
//       {name: 'Spell Slots (1st)', current: 4, max: 4},
//       {name: 'Spell Slots (2nd)', current: 3, max: 3},
//       {name: 'Spell Slots (3rd)', current: 2, max: 2}
//     ]
//   })
//   ```

class CharacterSheetDisplay {
    constructor() {
        this.stylesInjected = false;
    }

    // Inject CSS styles for the character sheet
    injectStyles() {
        if (this.stylesInjected) return;
        
        const styles = '\n' +
            '.dnd-char-sheet { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: #000; border: 2px solid #fff; padding: 30px; border-radius: 10px; max-width: 900px; margin: 20px auto; color: #fff; }\n' +
            '.dnd-char-sheet h1 { text-align: center; color: #fff; margin-bottom: 30px; font-size: 2em; text-transform: uppercase; letter-spacing: 2px; border-bottom: 3px solid #fff; padding-bottom: 15px; }\n' +
            '.dnd-char-sheet h2 { color: #fff; margin: 20px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #fff; }\n' +
            '.dnd-char-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #fff; }\n' +
            '.dnd-info-field { display: flex; flex-direction: column; text-align: center; }\n' +
            '.dnd-info-field label { font-size: 0.75em; color: #fff; margin-bottom: 5px; text-transform: uppercase; font-weight: bold; }\n' +
            '.dnd-info-value { padding: 8px; font-size: 1em; color: #fff; font-weight: 600; }\n' +
            '.dnd-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }\n' +
            '.dnd-stat-block { background: #1a1a1a; padding: 15px; border-radius: 10px; text-align: center; color: #fff; border: 2px solid #fff; }\n' +
            '.dnd-stat-block label { display: block; font-size: 0.9em; margin-bottom: 10px; text-transform: uppercase; font-weight: bold; color: #fff; }\n' +
            '.dnd-stat-value { font-size: 1.4em; font-weight: bold; color: #fff; margin-bottom: 10px; }\n' +
            '.dnd-modifier { font-size: 1.5em; font-weight: bold; background: #fff; color: #000; padding: 10px; border-radius: 5px; margin-top: 5px; border: 2px solid #fff; }\n' +
            '.dnd-combat-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }\n' +
            '.dnd-combat-stat { background: #1a1a1a; padding: 10px; border-radius: 6px; text-align: center; border: 2px solid #fff; }\n' +
            '.dnd-combat-stat label { display: block; font-size: 0.7em; color: #fff; margin-bottom: 5px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; }\n' +
            '.dnd-combat-stat .value { font-size: 1.3em; font-weight: bold; color: #fff; }\n' +
            '.dnd-combat-section { margin-bottom: 15px; }\n' +
            '.dnd-combat-section-title { font-size: 0.85em; color: #fff; margin-bottom: 8px; padding-left: 5px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; opacity: 0.8; }\n' +
            '.dnd-spellcasting { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }\n' +
            '.dnd-spell-stat { background: #1a1a1a; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #fff; }\n' +
            '.dnd-spell-stat label { display: block; font-size: 0.85em; color: #fff; margin-bottom: 8px; text-transform: uppercase; font-weight: bold; }\n' +
            '.dnd-spell-stat .value { font-size: 1.8em; font-weight: bold; color: #fff; }\n' +
            '.dnd-weapon-attacks { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }\n' +
            '.dnd-weapon-stat { background: #1a1a1a; padding: 15px; border-radius: 8px; text-align: center; border: 2px solid #fff; }\n' +
            '.dnd-weapon-stat label { display: block; font-size: 0.85em; color: #fff; margin-bottom: 8px; text-transform: uppercase; font-weight: bold; }\n' +
            '.dnd-weapon-stat .value { font-size: 1.8em; font-weight: bold; color: #fff; }\n' +
            '.dnd-hit-points { background: #1a1a1a; padding: 15px; border-radius: 8px; border: 2px solid #fff; margin-bottom: 20px; }\n' +
            '.dnd-hit-points .hp-header { text-align: center; font-size: 0.85em; color: #fff; margin-bottom: 10px; text-transform: uppercase; font-weight: bold; }\n' +
            '.dnd-hp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px; }\n' +
            '.dnd-hp-item { text-align: center; }\n' +
            '.dnd-hp-item label { display: block; font-size: 0.75em; color: #fff; margin-bottom: 5px; text-transform: uppercase; }\n' +
            '.dnd-hp-item .value { font-size: 1.5em; font-weight: bold; color: #fff; }\n' +
            '.dnd-hit-dice { text-align: center; padding-top: 10px; border-top: 1px solid #fff; }\n' +
            '.dnd-hit-dice label { display: block; font-size: 0.75em; color: #fff; margin-bottom: 5px; text-transform: uppercase; }\n' +
            '.dnd-hit-dice .value { font-size: 1.2em; font-weight: bold; color: #fff; }\n' +
            '.dnd-resources { margin-bottom: 20px; }\n' +
            '.dnd-resource-item { display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #1a1a1a; border: 2px solid #fff; border-radius: 5px; margin-bottom: 8px; }\n' +
            '.dnd-resource-name { font-weight: 600; color: #fff; font-size: 0.95em; }\n' +
            '.dnd-resource-value { font-weight: bold; color: #fff; min-width: 60px; text-align: right; font-size: 1.1em; }\n' +
            '.dnd-saving-throws { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 30px; }\n' +
            '.dnd-save-item { display: flex; align-items: center; padding: 12px; background: #1a1a1a; border: 2px solid #fff; border-radius: 5px; }\n' +
            '.dnd-save-indicator { width: 20px; height: 20px; margin-right: 10px; flex-shrink: 0; border-radius: 3px; border: 2px solid #fff; }\n' +
            '.dnd-save-indicator.proficient { background: #fff; }\n' +
            '.dnd-save-item label { flex: 1; font-weight: 600; color: #fff; margin-right: 10px; }\n' +
            '.dnd-save-bonus { font-weight: bold; color: #fff; min-width: 45px; text-align: right; flex-shrink: 0; }\n' +
            '.dnd-skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }\n' +
            '.dnd-skill-item { display: flex; align-items: center; padding: 10px; background: #1a1a1a; border: 2px solid #fff; border-radius: 5px; }\n' +
            '.dnd-skill-indicator { width: 20px; height: 20px; margin-right: 10px; flex-shrink: 0; border-radius: 3px; border: 2px solid #fff; }\n' +
            '.dnd-skill-indicator.proficient { background: #fff; }\n' +
            '.dnd-skill-item label { flex: 1; font-size: 0.95em; color: #fff; margin-right: 10px; }\n' +
            '.dnd-skill-bonus { font-weight: bold; color: #fff; min-width: 45px; text-align: right; flex-shrink: 0; }\n' +
            '@media (max-width: 768px) {\n' +
            '  .dnd-char-sheet { padding: 15px; margin: 10px; border-width: 1px; }\n' +
            '  .dnd-char-sheet h1 { font-size: 1.5em; margin-bottom: 20px; padding-bottom: 10px; letter-spacing: 1px; }\n' +
            '  .dnd-char-sheet h2 { font-size: 1.2em; margin: 15px 0 10px 0; }\n' +
            '  .dnd-char-info { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }\n' +
            '  .dnd-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }\n' +
            '  .dnd-stat-block { padding: 10px; }\n' +
            '  .dnd-stat-block label { font-size: 0.8em; margin-bottom: 5px; }\n' +
            '  .dnd-stat-value { font-size: 1.2em; margin-bottom: 5px; }\n' +
            '  .dnd-modifier { font-size: 1.3em; padding: 8px; }\n' +
            '  .dnd-combat-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }\n' +
            '  .dnd-combat-stat { padding: 8px; }\n' +
            '  .dnd-combat-stat label { font-size: 0.65em; }\n' +
            '  .dnd-combat-stat .value { font-size: 1.1em; }\n' +
            '  .dnd-saving-throws { grid-template-columns: 1fr; gap: 8px; }\n' +
            '  .dnd-save-item { padding: 10px; }\n' +
            '  .dnd-skills-grid { grid-template-columns: 1fr; gap: 8px; }\n' +
            '  .dnd-skill-item { padding: 8px; }\n' +
            '}\n' +
            '@media (max-width: 480px) {\n' +
            '  .dnd-char-sheet { padding: 10px; margin: 5px; }\n' +
            '  .dnd-char-sheet h1 { font-size: 1.3em; margin-bottom: 15px; }\n' +
            '  .dnd-char-info { grid-template-columns: 1fr; gap: 8px; }\n' +
            '  .dnd-info-field label { font-size: 0.7em; }\n' +
            '  .dnd-info-value { padding: 6px; font-size: 0.9em; }\n' +
            '  .dnd-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }\n' +
            '  .dnd-stat-block { padding: 8px; }\n' +
            '  .dnd-combat-stats { grid-template-columns: repeat(2, 1fr); gap: 6px; }\n' +
            '  .dnd-combat-stat { padding: 6px; }\n' +
            '  .dnd-skill-item label { font-size: 0.85em; }\n' +
            '}\n';
        
        const styleEl = document.createElement('style');
        styleEl.id = 'dnd-char-sheet-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        this.stylesInjected = true;
    }

    // Skill to ability mapping
    getSkillAbilities() {
        return {
            acrobatics: 'dex',
            animalHandling: 'wis',
            arcana: 'int',
            athletics: 'str',
            deception: 'cha',
            history: 'int',
            insight: 'wis',
            intimidation: 'cha',
            investigation: 'int',
            medicine: 'wis',
            nature: 'int',
            perception: 'wis',
            performance: 'cha',
            persuasion: 'cha',
            religion: 'int',
            sleightOfHand: 'dex',
            stealth: 'dex',
            survival: 'wis'
        };
    }

    // Calculate ability modifier
    calculateModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    // Calculate proficiency bonus
    calculateProficiencyBonus(level) {
        return Math.ceil(level / 4) + 1;
    }

    // Format bonus for display
    formatBonus(bonus) {
        return bonus >= 0 ? '+' + bonus : '' + bonus;
    }

    // Update all calculations for a character sheet
    updateCalculations(containerId, characterData) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const modifiers = {};
        
        // Update ability modifiers
        for (var i = 0; i < abilities.length; i++) {
            var ability = abilities[i];
            var score = characterData[ability] || 10;
            var modifier = this.calculateModifier(score);
            modifiers[ability] = modifier;
            var modEl = container.querySelector('#' + containerId + '-' + ability + 'Mod');
            if (modEl) modEl.textContent = this.formatBonus(modifier);
        }

        // Update proficiency bonus
        var level = characterData.level || 1;
        var profBonus = this.calculateProficiencyBonus(level);
        var profEl = container.querySelector('#' + containerId + '-profBonus');
        if (profEl) profEl.textContent = this.formatBonus(profBonus);

        // Update initiative
        var initEl = container.querySelector('#' + containerId + '-initiative');
        if (initEl) initEl.textContent = this.formatBonus(modifiers.dex);

        // Update saving throws
        var saves = {
            saveStr: 'str',
            saveDex: 'dex',
            saveCon: 'con',
            saveInt: 'int',
            saveWis: 'wis',
            saveCha: 'cha'
        };

        for (var saveId in saves) {
            var ability = saves[saveId];
            var isProficient = characterData.saves && characterData.saves.indexOf(ability) !== -1;
            var bonus = modifiers[ability] + (isProficient ? profBonus : 0);
            var bonusEl = container.querySelector('#' + containerId + '-' + saveId + 'Bonus');
            if (bonusEl) bonusEl.textContent = this.formatBonus(bonus);
        }

        // Update skills
        var skillAbilities = this.getSkillAbilities();
        for (var skill in skillAbilities) {
            var ability = skillAbilities[skill];
            var isProficient = characterData.skills && characterData.skills.indexOf(skill) !== -1;
            var bonus = modifiers[ability] + (isProficient ? profBonus : 0);
            var bonusEl = container.querySelector('#' + containerId + '-' + skill + 'Bonus');
            if (bonusEl) bonusEl.textContent = this.formatBonus(bonus);
        }
    }

    // Display a full interactive character sheet
    async display(dv, characterData) {
        this.injectStyles();
        
        var instanceId = 'char-sheet-' + Date.now();
        var self = this;
        var skillAbilities = this.getSkillAbilities();
        
        // Pre-calculate all values
        var abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        var modifiers = {};
        for (var i = 0; i < abilities.length; i++) {
            var ability = abilities[i];
            modifiers[ability] = this.calculateModifier(characterData[ability] || 10);
        }
        var profBonus = this.calculateProficiencyBonus(characterData.level || 1);
        var initiative = modifiers.dex;
        
        var html = '<div class="dnd-char-sheet" id="' + instanceId + '">';
        html += '<h1>D&D 5e Character Stats</h1>';
        
        // Character Info
        html += '<div class="dnd-char-info">';
        html += '<div class="dnd-info-field"><label>Character Name</label><div class="dnd-info-value" id="' + instanceId + '-name">' + (characterData.name || '-') + '</div></div>';
        html += '<div class="dnd-info-field"><label>Class</label><div class="dnd-info-value" id="' + instanceId + '-class">' + (characterData.class || '-') + '</div></div>';
        html += '<div class="dnd-info-field"><label>Level</label><div class="dnd-info-value" id="' + instanceId + '-level">' + (characterData.level || 1) + '</div></div>';
        html += '<div class="dnd-info-field"><label>Race</label><div class="dnd-info-value" id="' + instanceId + '-race">' + (characterData.race || '-') + '</div></div>';
        html += '</div>';
        
        // Ability Scores
        html += '<div class="dnd-stats-grid">';
        var abilities = [
            {id: 'str', name: 'Strength'},
            {id: 'dex', name: 'Dexterity'},
            {id: 'con', name: 'Constitution'},
            {id: 'int', name: 'Intelligence'},
            {id: 'wis', name: 'Wisdom'},
            {id: 'cha', name: 'Charisma'}
        ];
        
        for (var i = 0; i < abilities.length; i++) {
            var ability = abilities[i];
            html += '<div class="dnd-stat-block">';
            html += '<label>' + ability.name + '</label>';
            html += '<div class="dnd-stat-value">' + (characterData[ability.id] || 10) + '</div>';
            html += '<div class="dnd-modifier" id="' + instanceId + '-' + ability.id + 'Mod">' + this.formatBonus(modifiers[ability.id]) + '</div>';
            html += '</div>';
        }
        html += '</div>';
        
        // Combat Stats
        html += '<h2>Combat Stats</h2>';
        
        // Core Stats
        html += '<div class="dnd-combat-section">';
        html += '<div class="dnd-combat-stats">';
        html += '<div class="dnd-combat-stat"><label>Prof Bonus</label><div class="value" id="' + instanceId + '-profBonus">' + this.formatBonus(profBonus) + '</div></div>';
        html += '<div class="dnd-combat-stat"><label>Initiative</label><div class="value" id="' + instanceId + '-initiative">' + this.formatBonus(initiative) + '</div></div>';
        html += '<div class="dnd-combat-stat"><label>Armor Class</label><div class="value">' + (characterData.ac || 10) + '</div></div>';
        html += '<div class="dnd-combat-stat"><label>Speed</label><div class="value">' + (characterData.speed || 30) + ' ft</div></div>';
        html += '</div>';
        html += '</div>';
        
        // Weapon Attack Bonuses - Always shown, proficiency depends on flags
        var simpleProf = characterData.simpleWeapons === true;
        var martialProf = characterData.martialWeapons === true;
        var strMod = modifiers.str || 0;
        var dexMod = modifiers.dex || 0;
        
        // Simple & Martial Weapons
        html += '<div class="dnd-combat-section">';
        html += '<div class="dnd-combat-section-title">Weapon Attacks</div>';
        html += '<div class="dnd-combat-stats">';
        
        // Simple weapons
        var simpleMelee = strMod + (simpleProf ? profBonus : 0);
        var simpleRanged = dexMod + (simpleProf ? profBonus : 0);
        html += '<div class="dnd-combat-stat"><label>Simple Melee</label><div class="value">' + this.formatBonus(simpleMelee) + '</div></div>';
        html += '<div class="dnd-combat-stat"><label>Simple Ranged</label><div class="value">' + this.formatBonus(simpleRanged) + '</div></div>';
        
        // Martial weapons
        var martialMelee = strMod + (martialProf ? profBonus : 0);
        var martialRanged = dexMod + (martialProf ? profBonus : 0);
        html += '<div class="dnd-combat-stat"><label>Martial Melee</label><div class="value">' + this.formatBonus(martialMelee) + '</div></div>';
        html += '<div class="dnd-combat-stat"><label>Martial Ranged</label><div class="value">' + this.formatBonus(martialRanged) + '</div></div>';
        
        html += '</div>';
        html += '</div>';
        
        // Spellcasting
        html += '<div class="dnd-combat-section">';
        html += '<div class="dnd-combat-section-title">Spellcasting</div>';
        html += '<div class="dnd-combat-stats">';
        
        var spellAbility = characterData.spellcasting || 'int';
        var spellProf = characterData.spellcasting !== false;
        var spellMod = modifiers[spellAbility] || 0;
        var spellAttack = spellMod + (spellProf ? profBonus : 0);
        var spellSaveDC = 8 + spellMod + (spellProf ? profBonus : 0);
        html += '<div class="dnd-combat-stat"><label>Spell Attack</label><div class="value">' + this.formatBonus(spellAttack) + '</div></div>';
        html += '<div class="dnd-combat-stat"><label>Spell Save DC</label><div class="value">' + spellSaveDC + '</div></div>';
        
        html += '</div>';
        html += '</div>';

        
        // Spellcasting (optional)
        if (characterData.showSpellcasting) {
            var spellAbility = characterData.spellcastingAbility || 'int';
            var spellMod = modifiers[spellAbility];
            var spellAttack = spellMod + profBonus;
            var spellSaveDC = 8 + profBonus + spellMod;
            
            html += '<h2>Spellcasting</h2>';
            html += '<div class="dnd-spellcasting">';
            html += '<div class="dnd-spell-stat"><label>Spell Attack</label><div class="value">' + this.formatBonus(spellAttack) + '</div></div>';
            html += '<div class="dnd-spell-stat"><label>Spell Save DC</label><div class="value">' + spellSaveDC + '</div></div>';
            html += '</div>';
        }
        
        // Weapon Attacks (optional)
        if (characterData.showWeaponAttacks) {
            var meleeAttack = Math.max(modifiers.str, modifiers.dex) + profBonus;
            var rangedAttack = modifiers.dex + profBonus;
            
            html += '<h2>Weapon Attacks</h2>';
            html += '<div class="dnd-weapon-attacks">';
            html += '<div class="dnd-weapon-stat"><label>Melee Attack</label><div class="value">' + this.formatBonus(meleeAttack) + '</div></div>';
            html += '<div class="dnd-weapon-stat"><label>Ranged Attack</label><div class="value">' + this.formatBonus(rangedAttack) + '</div></div>';
            html += '</div>';
        }
        
        // Hit Points (optional)
        if (characterData.showHitPoints) {
            html += '<h2>Hit Points</h2>';
            html += '<div class="dnd-hit-points">';
            html += '<div class="dnd-hp-grid">';
            html += '<div class="dnd-hp-item"><label>Current HP</label><div class="value">' + (characterData.currentHp || characterData.maxHp || 0) + '</div></div>';
            html += '<div class="dnd-hp-item"><label>Max HP</label><div class="value">' + (characterData.maxHp || 0) + '</div></div>';
            html += '<div class="dnd-hp-item"><label>Temp HP</label><div class="value">' + (characterData.tempHp || 0) + '</div></div>';
            html += '</div>';
            if (characterData.hitDice) {
                html += '<div class="dnd-hit-dice"><label>Hit Dice</label><div class="value">' + characterData.hitDice + '</div></div>';
            }
            html += '</div>';
        }
        
        // Resources (optional)
        if (characterData.showResources && characterData.resources && characterData.resources.length > 0) {
            html += '<h2>Resources</h2>';
            html += '<div class="dnd-resources">';
            for (var r = 0; r < characterData.resources.length; r++) {
                var resource = characterData.resources[r];
                html += '<div class="dnd-resource-item">';
                html += '<span class="dnd-resource-name">' + resource.name + '</span>';
                html += '<span class="dnd-resource-value">' + (resource.current || 0) + ' / ' + (resource.max || 0) + '</span>';
                html += '</div>';
            }
            html += '</div>';
        }
        
        // Saving Throws
        html += '<h2>Saving Throws</h2>';
        html += '<div class="dnd-saving-throws">';
        var saves = [
            {id: 'saveStr', name: 'Strength', ability: 'str'},
            {id: 'saveDex', name: 'Dexterity', ability: 'dex'},
            {id: 'saveCon', name: 'Constitution', ability: 'con'},
            {id: 'saveInt', name: 'Intelligence', ability: 'int'},
            {id: 'saveWis', name: 'Wisdom', ability: 'wis'},
            {id: 'saveCha', name: 'Charisma', ability: 'cha'}
        ];
        
        for (var i = 0; i < saves.length; i++) {
            var save = saves[i];
            var isProficient = characterData.saves && characterData.saves.indexOf(save.ability) !== -1;
            var saveBonus = modifiers[save.ability] + (isProficient ? profBonus : 0);
            html += '<div class="dnd-save-item">';
            html += '<div class="dnd-save-indicator' + (isProficient ? ' proficient' : '') + '"></div>';
            html += '<label>' + save.name + '</label>';
            html += '<span class="dnd-save-bonus" id="' + instanceId + '-' + save.id + 'Bonus">' + this.formatBonus(saveBonus) + '</span>';
            html += '</div>';
        }
        html += '</div>';
        
        // Skills
        html += '<h2>Skills</h2>';
        html += '<div class="dnd-skills-grid">';
        var skills = [
            {id: 'acrobatics', name: 'Acrobatics (Dex)'},
            {id: 'animalHandling', name: 'Animal Handling (Wis)'},
            {id: 'arcana', name: 'Arcana (Int)'},
            {id: 'athletics', name: 'Athletics (Str)'},
            {id: 'deception', name: 'Deception (Cha)'},
            {id: 'history', name: 'History (Int)'},
            {id: 'insight', name: 'Insight (Wis)'},
            {id: 'intimidation', name: 'Intimidation (Cha)'},
            {id: 'investigation', name: 'Investigation (Int)'},
            {id: 'medicine', name: 'Medicine (Wis)'},
            {id: 'nature', name: 'Nature (Int)'},
            {id: 'perception', name: 'Perception (Wis)'},
            {id: 'performance', name: 'Performance (Cha)'},
            {id: 'persuasion', name: 'Persuasion (Cha)'},
            {id: 'religion', name: 'Religion (Int)'},
            {id: 'sleightOfHand', name: 'Sleight of Hand (Dex)'},
            {id: 'stealth', name: 'Stealth (Dex)'},
            {id: 'survival', name: 'Survival (Wis)'}
        ];
        
        for (var i = 0; i < skills.length; i++) {
            var skill = skills[i];
            var isProficient = characterData.skills && characterData.skills.indexOf(skill.id) !== -1;
            var skillAbility = skillAbilities[skill.id];
            var skillBonus = modifiers[skillAbility] + (isProficient ? profBonus : 0);
            html += '<div class="dnd-skill-item">';
            html += '<div class="dnd-skill-indicator' + (isProficient ? ' proficient' : '') + '"></div>';
            html += '<label>' + skill.name + '</label>';
            html += '<span class="dnd-skill-bonus" id="' + instanceId + '-' + skill.id + 'Bonus">' + this.formatBonus(skillBonus) + '</span>';
            html += '</div>';
        }
        html += '</div>';
        
        html += '</div>';
        
        dv.paragraph(html);
    }
    
    // Create a simple inline stat block (compact version)
    async displayCompact(dv, characterData) {
        var calcMod = function(score) { return Math.floor((score - 10) / 2); };
        var formatBonus = function(bonus) { return bonus >= 0 ? '+' + bonus : '' + bonus; };
        var calcProfBonus = function(level) { return Math.ceil(level / 4) + 1; };
        
        var profBonus = calcProfBonus(characterData.level || 1);
        
        var html = '<div style="background: #000; border: 2px solid #fff; padding: 20px; border-radius: 10px; font-family: \'Segoe UI\', sans-serif; color: #fff;">' +
                '<h3 style="margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #fff; color: #fff;">' +
                    (characterData.name || 'Character') + ' - Level ' + (characterData.level || 1) + ' ' + (characterData.class || '') + ' ' + (characterData.race ? '(' + characterData.race + ')' : '') +
                '</h3>' +
                '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 10px; margin-bottom: 15px;">' +
                    '<div style="text-align: center; background: #1a1a1a; color: #fff; padding: 10px; border-radius: 5px; border: 2px solid #fff;">' +
                        '<div style="font-size: 0.75em; font-weight: bold;">STR</div>' +
                        '<div style="font-size: 1.1em;">' + (characterData.str || 10) + '</div>' +
                        '<div style="font-size: 0.9em;">' + formatBonus(calcMod(characterData.str || 10)) + '</div>' +
                    '</div>' +
                    '<div style="text-align: center; background: #1a1a1a; color: #fff; padding: 10px; border-radius: 5px; border: 2px solid #fff;">' +
                        '<div style="font-size: 0.75em; font-weight: bold;">DEX</div>' +
                        '<div style="font-size: 1.1em;">' + (characterData.dex || 10) + '</div>' +
                        '<div style="font-size: 0.9em;">' + formatBonus(calcMod(characterData.dex || 10)) + '</div>' +
                    '</div>' +
                    '<div style="text-align: center; background: #1a1a1a; color: #fff; padding: 10px; border-radius: 5px; border: 2px solid #fff;">' +
                        '<div style="font-size: 0.75em; font-weight: bold;">CON</div>' +
                        '<div style="font-size: 1.1em;">' + (characterData.con || 10) + '</div>' +
                        '<div style="font-size: 0.9em;">' + formatBonus(calcMod(characterData.con || 10)) + '</div>' +
                    '</div>' +
                    '<div style="text-align: center; background: #1a1a1a; color: #fff; padding: 10px; border-radius: 5px; border: 2px solid #fff;">' +
                        '<div style="font-size: 0.75em; font-weight: bold;">INT</div>' +
                        '<div style="font-size: 1.1em;">' + (characterData.int || 10) + '</div>' +
                        '<div style="font-size: 0.9em;">' + formatBonus(calcMod(characterData.int || 10)) + '</div>' +
                    '</div>' +
                    '<div style="text-align: center; background: #1a1a1a; color: #fff; padding: 10px; border-radius: 5px; border: 2px solid #fff;">' +
                        '<div style="font-size: 0.75em; font-weight: bold;">WIS</div>' +
                        '<div style="font-size: 1.1em;">' + (characterData.wis || 10) + '</div>' +
                        '<div style="font-size: 0.9em;">' + formatBonus(calcMod(characterData.wis || 10)) + '</div>' +
                    '</div>' +
                    '<div style="text-align: center; background: #1a1a1a; color: #fff; padding: 10px; border-radius: 5px; border: 2px solid #fff;">' +
                        '<div style="font-size: 0.75em; font-weight: bold;">CHA</div>' +
                        '<div style="font-size: 1.1em;">' + (characterData.cha || 10) + '</div>' +
                        '<div style="font-size: 0.9em;">' + formatBonus(calcMod(characterData.cha || 10)) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; text-align: center;">' +
                    '<div style="border: 2px solid #fff; padding: 8px; border-radius: 5px; background: #1a1a1a;">' +
                        '<div style="font-size: 0.75em; font-weight: bold; color: #fff;">PROF</div>' +
                        '<div style="font-size: 1.2em; color: #fff;">' + formatBonus(profBonus) + '</div>' +
                    '</div>' +
                    '<div style="border: 2px solid #fff; padding: 8px; border-radius: 5px; background: #1a1a1a;">' +
                        '<div style="font-size: 0.75em; font-weight: bold; color: #fff;">INIT</div>' +
                        '<div style="font-size: 1.2em; color: #fff;">' + formatBonus(calcMod(characterData.dex || 10)) + '</div>' +
                    '</div>' +
                    '<div style="border: 2px solid #fff; padding: 8px; border-radius: 5px; background: #1a1a1a;">' +
                        '<div style="font-size: 0.75em; font-weight: bold; color: #fff;">AC</div>' +
                        '<div style="font-size: 1.2em; color: #fff;">' + (characterData.ac || 10) + '</div>' +
                    '</div>' +
                    '<div style="border: 2px solid #fff; padding: 8px; border-radius: 5px; background: #1a1a1a;">' +
                        '<div style="font-size: 0.75em; font-weight: bold; color: #fff;">SPEED</div>' +
                        '<div style="font-size: 1.2em; color: #fff;">' + (characterData.speed || 30) + ' ft</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        dv.paragraph(html);
    }
}
