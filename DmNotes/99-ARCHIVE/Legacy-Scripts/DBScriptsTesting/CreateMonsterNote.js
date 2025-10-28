// Load and query the SQLite database for monster data
try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }

    let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js')

    const dbFilePath = 'Scripts/DND.db';
    const compendiumPath = 'Bestiary/Monster Compendium/';
    const monsterName = context.args.monsterName;

    if (!monsterName || typeof monsterName !== "string") {
        console.error("❌ Invalid monster name received:", monsterName);
        return;
    }

    const query = `SELECT * FROM Monsters WHERE Name = ? COLLATE NOCASE LIMIT 1`;

    var result = await sqlUtils.runSqlStatement(dbFilePath, engine, query, [monsterName])

    if (!result || result.length === 0) {
        console.error("❌ Monster not found:", monsterName);
        return;
    }

    var noteContent = mdUtils.generateMonsterMarkdown(result[0]);
    noteContent += '\n\n';
    noteContent += mdUtils.addPlayerButtonLinkerMarkdown("Monsters");
    noteContent += '\n\n'
    noteContent += mdUtils.AddMentionedInMarkdown();

    const fileName = `${result[0].Name}.md`;

    await mdUtils.createOrUpdateNote(compendiumPath + fileName, noteContent);
    console.log(`✅ Created/updated note for monster: ${result[0].Name}`);

} catch (error) {
    console.error("❌ Error generating monster note:", error);
}
