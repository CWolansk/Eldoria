// Save a custom magic item to the database and create a note
try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }

    let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js');

    const dbFilePath = 'Scripts/DND.db';
    const compendiumPath = 'Items/Item Compendium/';    // Debug: Log what we're receiving
    console.log("🔍 Debug - Received context args:", context.args);

    // Extract item data from form
    const itemData = {
        Name: context.args.name || "Unnamed Item",
        Rarity: context.args.rarity || "common",
        Type: context.args.type || "",
        Attunement: context.args.attunement === "true" ? "requires attunement" : "no attunement required",
        Damage: context.args.damage || "",
        Properties: context.args.properties || "",
        Mastery: "", // Not used in the form but required by DB
        Weight: context.args.weight || "",
        Source: "Custom", // Mark as custom creation
        Page: "", // Not applicable for custom items
        Value: context.args.value ? `${context.args.value} gp` : "",
        Text: context.args.text || ""
    };

    console.log("🔍 Debug - Processed item data:", itemData);    if (itemData.Name.includes("{memory^") || itemData.Name === "Unnamed Item" || itemData.Name.trim() === "") {
        console.error("❌ Item name contains unresolved memory variables or is empty:", itemData.Name);
        new Notice("❌ Please fill out the item name field before saving");
        return;
    }

    // Save to database
    const columns = Object.keys(itemData);
    const values = Object.values(itemData);
    const placeholders = columns.map(() => "?").join(", ");
    const quotedColumns = columns.map(col => `"${col}"`).join(", ");
    
    const insertQuery = `INSERT OR REPLACE INTO Items (${quotedColumns}) VALUES (${placeholders})`;
    
    await sqlUtils.runSqlStatement(dbFilePath, engine, insertQuery, values);
    console.log(`✅ Saved item '${itemData.Name}' to database`);    // Create markdown note
    const noteContent = mdUtils.generateItemMarkdown(itemData);
    const fileName = `${itemData.Name}.md`;
    
    await mdUtils.createOrUpdateNote(compendiumPath + fileName, 
        noteContent + '\n\n' + 
        mdUtils.AddMentionedInMarkdown()
    );
    
    console.log(`✅ Created note for item: ${itemData.Name}`);
    
    // Show success message
    new Notice(`✅ Custom magic item "${itemData.Name}" saved successfully!`);

} catch (error) {
    console.error("❌ Error saving custom magic item:", error);
    new Notice(`❌ Error saving item: ${error.message}`);
}
