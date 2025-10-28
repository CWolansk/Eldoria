<%*
if (!app?.vault?.adapter) {
    tR = "Error: Obsidian API is not fully initialized.";
    return;
}

const relativeCsvPath = "items/items.csv";

// Read the file using Obsidian's Data Adapter API
let csvContent;
try {
    csvContent = await app.vault.adapter.read(relativeCsvPath);
    console.log("✅ Successfully read CSV file.");
} catch (error) {
    tR = "Error: Could not read CSV file - " + error.message;
    return;
}

// Function to roll dice
function rollDice(numDice, numSides) {
    let sum = 0;
    for (let i = 0; i < numDice; i++) {
        sum += Math.floor(Math.random() * numSides) + 1;
    }
    return sum;
}

// Properly split CSV while handling quotes
function parseCSV(csvString) {
    return csvString.trim().split('\n').map(line => 
        line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(cell => cell.replace(/^"|"$/g, '').trim()) || []
    );
}

// Convert parsed CSV into an array of objects
function csvToObjects(parsedCsv) {
    if (parsedCsv.length < 2) {
        console.error("❌ CSV does not have enough rows (Header & Data).");
        return [];
    }

    const header = parsedCsv[0].map(h => h.replace(/^"|"$/g, '').trim()); // Fully remove quotes

    return parsedCsv.slice(1).map(row => {
        let item = {};
        header.forEach((key, index) => {
            item[key] = row[index]?.replace(/^"|"$/g, '').trim() || ""; // Remove quotes from data
        });
        return item;
    });
}

// Convert objects back to CSV format (ensuring proper quotes)
function objectsToCsv(items, header) {
    return [
        header.map(h => `"${h}"`).join(','),  // Ensure headers are quoted properly
        ...items.map(item => 
            header.map(key => `"${(item[key] || "").replace(/"/g, '""')}"`).join(',') // Properly escape quotes inside values
        )
    ].join('\n');
}

// Parse CSV
let items = parseCSV(csvContent);
if (items.length === 0) {
    tR = "Error: CSV file is empty or malformed.";
    return;
}

let header = items[0].map(h => h.replace(/^"|"$/g, '').trim());  // Remove quotes from headers

let itemObjects = csvToObjects(items);

// Find the index of the "Value" column to ensure it's being updated
const valueIndex = header.indexOf("Value");
if (valueIndex === -1) {
    console.error("❌ 'Value' column not found! Headers detected:", header);
    tR = "Error: 'Value' column not found in CSV.";
    return;
}

// Iterate and update values
let updatedCount = 0;

for (let item of itemObjects) {
    let cleanedValue = item.Value ? item.Value.replace(/,/g, '').replace(/ gp/g, '').trim() : "";

    if (cleanedValue && !isNaN(parseFloat(cleanedValue)) && isFinite(cleanedValue)) {
        continue; // Skip if value already exists
    }

    let value = 0;
    switch (item.Rarity) {
        case "common": value = (rollDice(1, 5) + 1) * 10; break;
        case "uncommon": value = rollDice(1, 6) * 100; break;
        case "rare": value = rollDice(2, 10) * 1000; break;
        case "very rare": value = (rollDice(1, 4) + 1) * 10000; break;
        case "legendary": value = rollDice(2, 6) * 25000; break;
        default: value = 0;
    }

    // Reduce value for consumables
    if (item.Type && item.Type.match(/Potion|Scroll/i)) {
        value = Math.round(value / 2);
    }

    item.Value = `${value} gp`; // Append " gp" to the value
    updatedCount++;
}

// If no values were updated, log it
if (updatedCount === 0) {
    console.warn("⚠ No items were updated. Check if all items already had values.");
}

// Convert back to CSV
const updatedCsvContent = objectsToCsv(itemObjects, header);

// Write updated CSV file using Obsidian's Data Adapter API
try {
    await app.vault.adapter.write(relativeCsvPath, updatedCsvContent);
    tR = "CSV file updated successfully!";
} catch (error) {
    tR = "Error: Could not write CSV file - " + error.message;
}
%>
