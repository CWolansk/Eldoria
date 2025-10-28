// Load and query the SQLite database for spell data
try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }

    let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js')

    const dbFilePath = 'Scripts/DND.db';
    const compendiumPath = 'Spells/Spell Compendium/';
    const spellName = context.args.spellName;

    if (!spellName || typeof spellName !== "string") {
        console.error("❌ Invalid spell name received:", spellName);
        return;
    }

    const query = `SELECT * FROM Spells WHERE Name = ? COLLATE NOCASE LIMIT 1`;

    var result = await sqlUtils.runSqlStatement(dbFilePath, engine, query, [spellName])
    
    var noteContent = mdUtils.generateSpellMarkdown(result[0]);
    noteContent += mdUtils.addPlayerButtonLinkerMarkdown("Spells", result[0].Level);
    noteContent += '\n\n'
    noteContent += mdUtils.AddMentionedInMarkdown();
    const fileName = `${result[0].Name}.md`;

    await mdUtils.createOrUpdateNote(compendiumPath + fileName, noteContent);
    console.log(`✅ Created/updated note for spell: ${result.Name}`);

} catch (error) {
    console.error("❌ Error generating spell note:", error);
}
