// Create a comprehensive encounter page
try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }    const mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
    const sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js');

    console.log("Import debug - mdUtils type:", typeof mdUtils);
    console.log("Import debug - mdUtils keys:", Object.keys(mdUtils || {}));
    console.log("Import debug - generateEncounterMarkdown type:", typeof (mdUtils && mdUtils.generateEncounterMarkdown));    const dbFilePath = 'Scripts/DBScriptsTesting/DND.db';
    const encountersPath = 'Encounters/';

    // Extract encounter data from form - use context.bound for metabind values
    const encounterName = context.bound.encounterName || "Unnamed Encounter";
    const encounterDescription = context.bound.encounterDescription || "";
    const encounterLocation = context.bound.encounterLocation || "";
    const monsterListRaw = context.bound.monsterList || "";
    const partyLevel = parseInt(context.bound.partyLevel) || 4;
    const playerCount = parseInt(context.bound.playerCount) || 5;
    const includeTreasure = context.bound.includeTreasure === true;
    const treasureType = context.bound.treasureType || "Individual";
    const customNotes = context.bound.customNotes || "";

    // Debug logging
    console.log("Raw monster list received:", monsterListRaw);
    console.log("Monster list type:", typeof monsterListRaw);
    console.log("All context bound:", context.bound);

    if (!encounterName || encounterName.trim() === "Unnamed Encounter" || encounterName === "{memory^encounterName}") {
        console.error("❌ Encounter name is required or not properly bound");
        new Notice("❌ Please enter an encounter name");
        return;
    }

    if (!monsterListRaw || monsterListRaw.trim() === "" || monsterListRaw === "{memory^monsterList}") {
        console.error("❌ Monster list is required or not properly bound");
        console.log("Monster list value:", monsterListRaw);
        new Notice("❌ Please add some monsters to the encounter. Make sure to fill in the monster list field.");
        return;
    }// Parse monster list
    const monsterEntries = [];
    const lines = monsterListRaw.split('\n').filter(line => line.trim());
    
    console.log("Processing monster lines:", lines);
    
    for (const line of lines) {
        const match = line.trim().match(/^(\d+)x?\s+(.+)$/i);
        if (match) {
            const quantity = parseInt(match[1]);
            const monsterName = match[2].trim();
            console.log(`Found monster: ${quantity}x ${monsterName}`);
            monsterEntries.push({ quantity, name: monsterName });
        } else {
            // Try just the monster name without quantity
            const monsterName = line.trim();
            if (monsterName) {
                console.log(`Found monster (no quantity): ${monsterName}`);
                monsterEntries.push({ quantity: 1, name: monsterName });
            }
        }
    }

    console.log("Final monster entries:", monsterEntries);

    if (monsterEntries.length === 0) {
        console.error("❌ No valid monsters found");
        new Notice("❌ Please check monster list format (e.g., '2x Goblin')");
        return;
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
                // Fallback XP values for common CRs
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
            // Add placeholder for unknown monsters
            monsterData.push({
                Name: entry.name,
                quantity: entry.quantity,
                AC: "?",
                HP: "?",
                CR: "?",
                Speed: "?",
                xpValue: 0,
                totalXP: 0
            });
        }
    }

    // Calculate encounter multiplier
    let encounterMultiplier = 1;
    if (totalMonsterCount === 2) encounterMultiplier = 1.5;
    else if (totalMonsterCount >= 3 && totalMonsterCount <= 6) encounterMultiplier = 2;
    else if (totalMonsterCount >= 7 && totalMonsterCount <= 10) encounterMultiplier = 2.5;
    else if (totalMonsterCount >= 11 && totalMonsterCount <= 14) encounterMultiplier = 3;
    else if (totalMonsterCount >= 15) encounterMultiplier = 4;

    const adjustedXP = Math.floor(totalXP * encounterMultiplier);

    // Determine encounter difficulty
    const xpThresholds = {
        1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
        2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
        3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
        4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
        5: { easy: 250, medium: 500, hard: 750, deadly: 1100 }
    };

    const threshold = xpThresholds[Math.min(partyLevel, 5)] || xpThresholds[5];
    const partyThreshold = {
        easy: threshold.easy * playerCount,
        medium: threshold.medium * playerCount,
        hard: threshold.hard * playerCount,
        deadly: threshold.deadly * playerCount
    };

    let difficulty = "Easy";
    if (adjustedXP >= partyThreshold.deadly) difficulty = "Deadly";
    else if (adjustedXP >= partyThreshold.hard) difficulty = "Hard";
    else if (adjustedXP >= partyThreshold.medium) difficulty = "Medium";    // Generate encounter markdown
    console.log("About to call generateEncounterMarkdown...");
    console.log("Function exists:", typeof mdUtils.generateEncounterMarkdown);
    
    if (typeof mdUtils.generateEncounterMarkdown !== 'function') {
        console.error("❌ generateEncounterMarkdown is not a function");
        new Notice("❌ Internal error: encounter generation function not available");
        return;
    }
    
    const encounterContent = await mdUtils.generateEncounterMarkdown({
        encounterName,
        encounterDescription,
        encounterLocation,
        monsterData,
        totalXP,
        adjustedXP,
        difficulty,
        partyLevel,
        playerCount,
        totalMonsterCount,
        encounterMultiplier,
        includeTreasure,
        treasureType,
        customNotes
    });
    
    console.log("Generated encounter content length:", encounterContent ? encounterContent.length : "null");

    // Create the encounter file
    const fileName = `${encounterName}.md`;
    const filePath = encountersPath + fileName;
    
    await mdUtils.createOrUpdateNote(filePath, encounterContent);
    
    console.log(`✅ Created encounter: ${encounterName}`);
    new Notice(`✅ Encounter "${encounterName}" created successfully!`);

} catch (error) {
    console.error("❌ Error creating encounter:", error);
    new Notice(`❌ Error creating encounter: ${error.message}`);
}
