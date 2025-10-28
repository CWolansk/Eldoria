// Load and query the SQLite database for item data
try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }

    let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js')

    const dbFilePath = 'Scripts/DND.db';
    const compendiumPath = 'Items/Item Compendium/';
    const itemName = context.args.itemName;

    if (!itemName || typeof itemName !== "string") {
        console.error("❌ Invalid item name received:", itemName);
        return;
    }

    const query = `SELECT * FROM Items WHERE Name = ? COLLATE NOCASE LIMIT 1`;

    var result = await sqlUtils.runSqlStatement(dbFilePath, engine, query, [itemName])

    var noteContent = mdUtils.generateItemMarkdown(result[0]);
    noteContent += mdUtils.addPlayerButtonLinkerMarkdown("Magic Items");
    noteContent += '\n\n'
    noteContent += mdUtils.AddMentionedInMarkdown();

    const fileName = `${result[0].Name}.md`;

    await mdUtils.createOrUpdateNote(compendiumPath + fileName, noteContent);
    console.log(`✅ Created/updated note for item: ${result.Name}`);

} catch (error) {
    console.error("❌ Error generating item note:", error);
}
