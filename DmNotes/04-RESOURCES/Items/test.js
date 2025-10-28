
    try {
        if (typeof app === 'undefined' || !app.vault) {
            console.error("❌ Obsidian app is not accessible.");
            return;
        }

        const filePath = 'Items/Items.csv'; // Ensure this matches your vault structure
        const compendiumPath = 'Items/Item Compendium/';
        const itemName = context.args.itemName; // Get item name from Metabind button args

        // Debug: Ensure we received a valid item name
        if (!itemName || typeof itemName !== "string") {
            console.error("❌ Invalid item name received:", itemName);
            return;
        }

        // Read CSV file
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

        // Ensure "Name" column exists
        const nameIndex = headers.findIndex(h => h.toLowerCase() === "name");
        if (nameIndex === -1) {
            console.error("❌ 'Name' column not found in CSV.");
            return;
        }

        // Debug: Ensure headers are correctly detected
        console.log(`🛠️ Detected Headers: ${headers.join(", ")}`);

        // Function to correctly parse CSV rows while handling quoted commas
        function parseCSVRow(row) {
            return row.match(/(".*?"|[^",\s]+|(?<=,)(?=,))/g).map(col => col.replace(/^"|"$/g, "").trim());
        }

        // Search for the item by name
        let selectedRow = null;
        for (let i = 1; i < lines.length; i++) {
            let rowData = parseCSVRow(lines[i]);
            if (rowData[nameIndex].toLowerCase() === itemName.toLowerCase()) {
                selectedRow = rowData;
                break;
            }
        }

        if (!selectedRow) {
            console.error(`❌ Item not found: ${itemName}`);
            return;
        }

        // Debug: Ensure row is parsed correctly
        console.log(`📌 Selected Item Row:`, selectedRow);

        let notePath = `${compendiumPath}${itemName}.md`;

        // Check if note already exists
        if (app.vault.getAbstractFileByPath(notePath)) {
            console.log(`ℹ️ Note already exists: ${notePath}`);
            return;
        }

        // Format note content
        let noteContent = `# ${itemName}\n\n`;
        headers.forEach((header, i) => {
            noteContent += `**${header}:** ${selectedRow[i] || "_None_"}\n`;
        });

        // Create the note
        await app.vault.create(notePath, noteContent);
        console.log(`✅ Created note: ${notePath}`);

    } catch (error) {
        console.error("❌ Error creating item note:", error);
    }

