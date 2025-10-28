export function parseCSV(csvText) {
    if (!csvText.trim()) {
        console.error("❌ CSV file is empty.");
        return { headers: [], data: [] };
    }

    // Normalize line endings
    csvText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const rows = [];
    let currentRow = [];
    let currentValue = "";
    let insideQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            currentValue += '"'; // Escaped quote
            i++; // Skip next character
        } else if (char === '"') {
            insideQuotes = !insideQuotes; // Toggle quote mode
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentValue);
            currentValue = "";
        } else if (char === '\n' && !insideQuotes) {
            currentRow.push(currentValue);
            rows.push(currentRow);
            currentRow = [];
            currentValue = "";
        } else {
            currentValue += char;
        }
    }

    // Push last row if not empty
    if (currentValue.length > 0 || currentRow.length > 0) {
        currentRow.push(currentValue);
        rows.push(currentRow);
    }

    if (rows.length === 0) {
        console.error("❌ CSV is empty or improperly formatted.");
        return { headers: [], data: [] };
    }

    const headers = rows[0].map(h => h.trim());
    const data = rows.slice(1).map(row => {
        const item = {};
        headers.forEach((header, i) => {
            item[header] = (row[i] || "").trim().replace(/\\n/g, "\n"); // Convert literal \n to actual line breaks
        });
        return item;
    });

    return { headers, data };
}


export function filterSpellsCSV(data, filters = {}) {
    const normalizeLevel = (levelStr) => {
        if (!levelStr) return -1;
        const lower = levelStr.toLowerCase();
        if (lower === "cantrip") return 0;
        const match = lower.match(/(\d+)/);
        return match ? parseInt(match[1]) : -1;
    };

    const normalize = str => typeof str === "string" ? str.trim().toLowerCase() : "";

    const minLevel = parseInt(filters.minLevel) ?? 0;
    const maxLevel = parseInt(filters.maxLevel) ?? 9;

    return data.filter(row => {
        const level = normalizeLevel(row["Level"]);
        if (level < minLevel || level > maxLevel) return false;

        // General column filters
        for (let key in filters) {
            if (["minLevel", "maxLevel"].includes(key)) continue;

            const rowValue = normalize(row[key]);
            const filterValue = normalize(filters[key]);

            if (!filterValue || filterValue === "any") continue;

            if (!rowValue.includes(filterValue)) return false;
        }

        return true;
    });
}


export function filterItemsCSV(data, filters) {
    // ✅ Define fixed column names
    const COLUMN_NAME = "Name";
    const COLUMN_RARITY = "Rarity";
    const COLUMN_TYPE = "Type";
    const COLUMN_DAMAGE = "Damage";
    const COLUMN_VALUE = "Value";
    const COLUMN_TEXT = "Text";

    // ✅ Convert filters to lowercase (case-insensitive matching)
    let searchTerm = filters.name?.trim().toLowerCase() || "";
    let searchRarity = filters.rarity?.trim().toLowerCase() || "";
    let searchType = filters.type?.trim().toLowerCase() || "";
    let searchDamage = filters.damage?.trim().toLowerCase() || "";
    let minValue = parseInt(filters.minValue) || 0;
    let maxValue = parseInt(filters.maxValue) || 1000000;

    let results = [];

    // ✅ Iterate over dataset manually (more predictable than `.filter()`)
    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        let name = item[COLUMN_NAME]?.toLowerCase() || "";
        let rarity = item[COLUMN_RARITY]?.toLowerCase() || "";
        let type = item[COLUMN_TYPE]?.toLowerCase() || "";
        let damage = item[COLUMN_DAMAGE]?.toLowerCase() || "";
        let text = item[COLUMN_TEXT]?.toLowerCase() || "";
        let value = parseInt(item[COLUMN_VALUE]?.replace(/[^\d]/g, ""), 10) || 0;

        // ✅ Apply filters with short-circuiting (faster execution)
        if (searchTerm && !name.includes(searchTerm)) continue;
        if (searchRarity && searchRarity !== "any" && rarity !== searchRarity) continue;
        if (searchType && !type.includes(searchType)) continue;
        if (searchDamage && !damage.includes(searchDamage) && !text.includes(searchDamage)) continue;
        if (value < minValue || value > maxValue) continue;

        // ✅ If all filters pass, add to results
        results.push(item);
    }

    return results;
}

export async function syncNotesToCsv(folderPath, csvPath) {
    try {
        if (typeof app === "undefined" || !app.vault) {
            console.error("❌ Obsidian app is not accessible.");
            return;
        }

        const allFiles = app.vault.getFiles();
        const csvFile = allFiles.find(f => f.path === csvPath);
        if (!csvFile) {
            console.error(`❌ CSV file not found at: ${csvPath}`);
            return;
        }

        let csvText = await app.vault.read(csvFile);
        let headers = [];
        let existingRows = [];

        if (csvText.trim()) {
            csvText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            const lines = csvText.trim().split("\n");
            headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
            existingRows = lines.slice(1);
        }

        const nameIndex = headers.findIndex(h => h.toLowerCase() === "name");
        const existingNames = existingRows.map(row => {
            const cols = row.split(",");
            return cols[nameIndex]?.replace(/^"|"$/g, "").trim().toLowerCase();
        });

        const noteFiles = allFiles.filter(f => f.path.startsWith(folderPath) && f.extension === "md");

        const cleanValue = (value) => {
            return (value || "")
                .replace(/```[\s\S]*?```/g, "")      // Remove code blocks
                .replace(/\*\*(.*?)\*\*/g, "$1")     // Bold
                .replace(/\[(.*?)\]\(.*?\)/g, "$1")  // Markdown links
                .replace(/\[\[([^\]]+)\]\]/g, "$1")  // Obsidian links
                .replace(/[_*`]/g, "")               // Misc markdown
                .trim();
        };

        const updatedRows = [];

        for (const note of noteFiles) {
            const itemName = note.basename.trim();
            const content = await app.vault.read(note);

            let row = new Array(headers.length).fill("");
            let currentKey = null;
            let currentValue = "";

            const flushCurrent = () => {
                if (!currentKey) return;
                const index = headers.findIndex(h => h.toLowerCase() === currentKey.toLowerCase());
                if (index !== -1) {
                    row[index] = cleanValue(currentValue.trim());
                } else if (currentKey.toLowerCase() === "name") {
                    row[nameIndex] = cleanValue(currentValue.trim());
                }
                currentKey = null;
                currentValue = "";
            };

            const lines = content.split("\n");
            for (const line of lines) {
                const fieldMatch = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
                if (fieldMatch) {
                    flushCurrent();
                    currentKey = fieldMatch[1].trim();
                    currentValue = fieldMatch[2];
                } else if (currentKey) {
                    currentValue += "\n" + line;
                }
            }
            flushCurrent();

            if (!headers.length) {
                headers = row.map((_, idx) => `Column${idx}`);
                headers[nameIndex] = "Name";
            }

            if (nameIndex !== -1) {
                row[nameIndex] = cleanValue(itemName);
            }

            const quotedRow = row.map(cell => JSON.stringify(cell || "")); // Auto-quotes & escapes
            const newLine = quotedRow.join(",");

            const existingIndex = existingNames.findIndex(n => n === itemName.toLowerCase());
            if (existingIndex !== -1) {
                existingRows[existingIndex] = newLine;
                console.log(`🔄 Updated: ${itemName}`);
            } else {
                existingRows.push(newLine);
                console.log(`➕ Added: ${itemName}`);
            }
        }

        const updatedCsv = [headers.map(h => JSON.stringify(h)).join(","), ...existingRows].join("\n");
        await app.vault.modify(csvFile, updatedCsv);
        console.log("✅ Sync complete.");
    } catch (error) {
        console.error("❌ Sync Error:", error);
    }
}
