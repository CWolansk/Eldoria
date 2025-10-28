
export function parseCSV(csvText) {
    if (!csvText.trim()) {
        console.error("❌ CSV file is empty.");
        return { headers: [], data: [] };
    }

    // Normalize line endings
    csvText = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = csvText.trim().split("\n");

    // Extract headers
    let headers = lines[0].split(",").map(header => header.trim().replace(/(^"|"$)/g, ""));

    // Function to correctly split CSV rows while handling quoted commas
    function parseCSVRow(row) {
        return row.match(/(".*?"|[^",\s]+|(?<=,)(?=,))/g).map(col => col.replace(/^"|"$/g, "").trim());
    }

    // Parse all rows into objects
    let data = lines.slice(1).map(row => {
        let values = parseCSVRow(row);
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || "";
        });
        return obj;
    });

    return { headers, data };
}

export function filterCSV(data, filters) {
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

