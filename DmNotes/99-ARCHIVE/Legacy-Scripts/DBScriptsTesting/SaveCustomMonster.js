// Save a custom monster to the database and create a note
try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }

    let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js');

    const dbFilePath = 'Scripts/DND.db';
    const compendiumPath = 'Bestiary/Monster Compendium/';

    // Extract monster data from form
    const monsterData = {
        Name: context.args.name || "Unnamed Monster",
        Size: context.args.size || "Medium",
        Type: context.args.type || "",
        Alignment: context.args.alignment || "",
        AC: context.args.ac || "",
        HP: context.args.hp || "",
        Speed: context.args.speed || "",
        Strength: context.args.str || "",
        Dexterity: context.args.dex || "",
        Constitution: context.args.con || "",
        Intelligence: context.args.int || "",
        Wisdom: context.args.wis || "",
        Charisma: context.args.cha || "",
        "Saving Throws": context.args.saves || "",
        Skills: context.args.skills || "",
        "Damage Vulnerabilities": context.args.vulnerabilities || "",
        "Damage Resistances": context.args.resistances || "",
        "Damage Immunities": context.args.immunities || "",
        "Condition Immunities": context.args.conditionImmunities || "",
        Senses: context.args.senses || "",
        Languages: context.args.languages || "",
        CR: context.args.cr || "",
        Traits: context.args.traits || "",
        Actions: context.args.actions || "",
        "Bonus Actions": context.args.bonusActions || "",
        Reactions: context.args.reactions || "",
        "Legendary Actions": context.args.legendaryActions || "",
        "Mythic Actions": "",
        "Lair Actions": "",
        "Regional Effects": "",
        Environment: context.args.environment || "",
        Treasure: context.args.treasure || ""
    };

    if (!monsterData.Name || monsterData.Name.trim() === "Unnamed Monster") {
        console.error("❌ Monster name is required");
        return;
    }

    // Save to database
    const columns = Object.keys(monsterData);
    const values = Object.values(monsterData);
    const placeholders = columns.map(() => "?").join(", ");
    const quotedColumns = columns.map(col => `"${col}"`).join(", ");
    
    const insertQuery = `INSERT OR REPLACE INTO Monsters (${quotedColumns}) VALUES (${placeholders})`;
    
    await sqlUtils.runSqlStatement(dbFilePath, engine, insertQuery, values);
    console.log(`✅ Saved monster '${monsterData.Name}' to database`);

    // Create markdown note
    const noteContent = mdUtils.generateMonsterMarkdown(monsterData);
    const fileName = `${monsterData.Name}.md`;
    
    await mdUtils.createOrUpdateNote(compendiumPath + fileName, 
        noteContent + '\n\n' + 
        mdUtils.addPlayerButtonLinkerMarkdown("Monsters") + '\n\n' + 
        mdUtils.AddMentionedInMarkdown()
    );
    
    console.log(`✅ Created note for monster: ${monsterData.Name}`);
    
    // Show success message
    new Notice(`✅ Custom monster "${monsterData.Name}" saved successfully!`);

} catch (error) {
    console.error("❌ Error saving custom monster:", error);
    new Notice(`❌ Error saving monster: ${error.message}`);
}
