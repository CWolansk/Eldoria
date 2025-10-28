// Create quick encounter templates
try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }

    let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');

    const template = context.args.template;
    const encountersPath = 'Encounters/';

    // Define encounter templates
    const templates = {        goblin_ambush: {
            encounterName: "Goblin Ambush",
            encounterDescription: "A group of goblins springs from hiding to ambush the party on a forest path.",
            encounterLocation: "Forest Road",
            monsterList: "3x Goblin Assassin\n1x Goblin Boss",
            partyLevel: 2,
            playerCount: 5,
            includeTreasure: true,
            treasureType: "Individual",
            customNotes: "Goblins have advantage on Stealth checks in forest terrain. They use hit-and-run tactics."
        },
        orc_patrol: {
            encounterName: "Orc Patrol",
            encounterDescription: "An orc war party patrols their territory, ready to eliminate any intruders.",
            encounterLocation: "Orc Territory",
            monsterList: "2x Fiendish Orc\n1x Goblin Boss",
            partyLevel: 3,
            playerCount: 5,
            includeTreasure: true,
            treasureType: "Individual",
            customNotes: "Orcs fight to the death. The boss uses tactical commands."
        },        bandit_hideout: {
            encounterName: "Bandit Hideout",
            encounterDescription: "The party discovers a bandit camp hidden in the wilderness.",
            encounterLocation: "Hidden Camp",
            monsterList: "3x Vistana Bandit\n1x Vistana Bandit Captain",
            partyLevel: 3,
            playerCount: 5,
            includeTreasure: true,
            treasureType: "Hoard",
            customNotes: "Bandits may attempt to negotiate or surrender if reduced to half numbers."
        },
        undead_encounter: {
            encounterName: "Undead Encounter",
            encounterDescription: "Restless undead emerge from their graves to attack the living.",
            encounterLocation: "Ancient Graveyard",
            monsterList: "4x Skeleton\n2x Zombie",
            partyLevel: 2,
            playerCount: 5,
            includeTreasure: false,
            treasureType: "Individual",
            customNotes: "Undead are immune to charm and fear effects. Consider difficult terrain from uneven ground."
        },
        beast_pack: {
            encounterName: "Beast Pack",
            encounterDescription: "A pack of wild beasts attacks the party, defending their territory.",
            encounterLocation: "Wilderness",
            monsterList: "1x Werewolf (Krallenhorde)\n2x Wolf Reaver Dwarf",
            partyLevel: 2,
            playerCount: 5,
            includeTreasure: false,
            treasureType: "Individual",
            customNotes: "Wolves use pack tactics. The werewolf leads the pack and focuses on isolated targets."
        }
    };

    if (!templates[template]) {
        console.error(`❌ Unknown template: ${template}`);
        new Notice(`❌ Unknown encounter template: ${template}`);
        return;
    }

    const encounterData = templates[template];    // Use the same logic as CreateEncounter.js but with pre-filled data
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js');
    const dbFilePath = 'Scripts/DBScriptsTesting/DND.db';

    // Parse monster list
    const monsterEntries = [];
    const lines = encounterData.monsterList.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        const match = line.trim().match(/^(\d+)x?\s+(.+)$/i);
        if (match) {
            const quantity = parseInt(match[1]);
            const monsterName = match[2].trim();
            monsterEntries.push({ quantity, name: monsterName });
        }
    }

    // Fetch monster data from database
    const monsterData = [];
    let totalXP = 0;
    let totalMonsterCount = 0;

    for (const entry of monsterEntries) {
        const query = `SELECT * FROM Monsters WHERE Name = ? COLLATE NOCASE LIMIT 1`;
        const result = await sqlUtils.runSqlStatement(dbFilePath, engine, query, [entry.name]);
        
        if (result && result.length > 0) {
            const monster = result[0];
            
            // Parse XP from CR
            let xpValue = 0;
            const crText = monster.CR || "";
            const xpMatch = crText.match(/\(([0-9,]+)\s*XP\)/);
            if (xpMatch) {
                xpValue = parseInt(xpMatch[1].replace(/,/g, ''));
            } else {
                // Fallback XP values
                const crValue = crText.split(' ')[0];
                const xpTable = {
                    "0": 10, "1/8": 25, "1/4": 50, "1/2": 100,
                    "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800,
                    "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900
                };
                xpValue = xpTable[crValue] || 0;
            }

            monsterData.push({
                ...monster,
                quantity: entry.quantity,
                xpValue: xpValue,
                totalXP: xpValue * entry.quantity
            });
            
            totalXP += xpValue * entry.quantity;
            totalMonsterCount += entry.quantity;
        } else {
            console.warn(`⚠️ Monster '${entry.name}' not found in database`);
        }
    }

    // Calculate encounter multiplier and difficulty
    let encounterMultiplier = 1;
    if (totalMonsterCount === 2) encounterMultiplier = 1.5;
    else if (totalMonsterCount >= 3 && totalMonsterCount <= 6) encounterMultiplier = 2;
    else if (totalMonsterCount >= 7 && totalMonsterCount <= 10) encounterMultiplier = 2.5;
    else if (totalMonsterCount >= 11 && totalMonsterCount <= 14) encounterMultiplier = 3;
    else if (totalMonsterCount >= 15) encounterMultiplier = 4;

    const adjustedXP = Math.floor(totalXP * encounterMultiplier);

    // Determine difficulty
    const xpThresholds = {
        1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
        2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
        3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
        4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
        5: { easy: 250, medium: 500, hard: 750, deadly: 1100 }
    };

    const threshold = xpThresholds[Math.min(encounterData.partyLevel, 5)] || xpThresholds[5];
    const partyThreshold = {
        easy: threshold.easy * encounterData.playerCount,
        medium: threshold.medium * encounterData.playerCount,
        hard: threshold.hard * encounterData.playerCount,
        deadly: threshold.deadly * encounterData.playerCount
    };

    let difficulty = "Easy";
    if (adjustedXP >= partyThreshold.deadly) difficulty = "Deadly";
    else if (adjustedXP >= partyThreshold.hard) difficulty = "Hard";
    else if (adjustedXP >= partyThreshold.medium) difficulty = "Medium";

    // Generate encounter content
    const fullEncounterData = {
        ...encounterData,
        monsterData,
        totalXP,
        adjustedXP,
        difficulty,
        totalMonsterCount,
        encounterMultiplier
    };

    const encounterContent = await mdUtils.generateEncounterMarkdown(fullEncounterData);

    // Create the encounter file
    const fileName = `${encounterData.encounterName}.md`;
    const filePath = encountersPath + fileName;
    
    await mdUtils.createOrUpdateNote(filePath, encounterContent);
    
    console.log(`✅ Created quick encounter: ${encounterData.encounterName}`);
    new Notice(`✅ "${encounterData.encounterName}" created successfully!`);

} catch (error) {
    console.error("❌ Error creating quick encounter:", error);
    new Notice(`❌ Error creating encounter: ${error.message}`);
}
