try {
    if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
    }

    let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js'); 
    const filePath = 'Spells/Spells.csv';
    const compendiumPath = 'Spells/Spell Compendium/';
    const spellName = context.args.spellName;

    if (!spellName || typeof spellName !== "string") {
        console.error("❌ Invalid spell name received:", spellName);
        return;
    }

    const csvFile = app.vault.getAbstractFileByPath(filePath);
    if (!csvFile) {
        console.error(`❌ CSV file not found at: ${filePath}`);
        return;
    }

    let csvText = await app.vault.read(csvFile);
    if (!csvText.trim()) {
        console.error("❌ CSV file is empty.");
        return;
    }

    // Normalize line endings
    csvText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = csvText.trim().split("\n");

    // Extract headers
    let headers = lines[0].split(",").map(header => header.trim().replace(/(^"|"$)/g, ""));

    const nameIndex = headers.findIndex(h => h.toLowerCase() === "name");
    const levelIndex = headers.findIndex(h => h.toLowerCase() === "level");

    if (nameIndex === -1) {
        console.error("❌ 'Name' column not found in CSV.");
        return;
    }

    function parseCSVRow(row) {
        return row.match(/(".*?"|[^",\s]+|(?<=,)(?=,))/g).map(col => col.replace(/^"|"$/g, "").trim());
    }

    let selectedRow = null;
    let spellLevel = ""; 
    for (let i = 1; i < lines.length; i++) {
        let rowData = parseCSVRow(lines[i]);
        if (rowData[nameIndex].toLowerCase() === spellName.toLowerCase()) {
            selectedRow = rowData;
            spellLevel = rowData[levelIndex].toLowerCase();
            break;
        }
    }

    if (!selectedRow) {
        console.error(`❌ Spell not found: ${spellName}`);
        return;
    }

    const notePath = `${compendiumPath}${spellName}.md`;

    if (app.vault.getAbstractFileByPath(notePath)) {
        console.log(`ℹ️ Note already exists: ${notePath}`);
        return;
    }

    // Create spell markdown content
    let noteContent = `# ${spellName}\n\n`;

    // Group metadata
    //const excluded = ["Text", "At Higher Levels"];
    headers.forEach((header, i) => {
        noteContent += `**${header}:** ${selectedRow[i] || "_None_"}\n`;
    });


    // Append extra markdown utilities
    console.log(spellLevel)
    noteContent += mdUtils.addPlayerButtonLinkerMarkdown('Spells', spellLevel);
    noteContent += '\n\n';
    noteContent += mdUtils.AddMentionedInMarkdown();

    await app.vault.create(notePath, noteContent);
    console.log(`✅ Created spell note: ${notePath}`);

} catch (error) {
    console.error("❌ Error creating spell note:", error);
}
