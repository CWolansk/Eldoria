
Name : `INPUT[text(placeholder('Item Name')):memory^searchTerm]`

Rarity : 
```meta-bind
INPUT[inlineSelect(
	option('Any'), 
	option('none'), 
	option('common'), 
	option('uncommon'), 
	option('rare'), 
	option('very rare'), 
	option('legendary'), 
	option('artifact'),
	defaultValue('Any')
):memory^searchRarity]
```

Item Type `INPUT[text(placeholder('type')):memory^searchType]` 

Damage Type : `INPUT[text(placeholder('damage')):memory^searchDamage]` 

Min Value : `INPUT[number(placeholder(0)):memory^searchMinValue]` 

Max Value : `INPUT[number(placeholder(5000)):memory^searchMaxValue]`

Page : `INPUT[number(defaultValue(0)):memory^searchPage]`

`BUTTON[decrementSearchPage,incrementSearchPage]`

```meta-bind-button
label: "Next"
hidden: true
id: "incrementSearchPage"
style: default
actions:
  - type: updateMetadata
    bindTarget: memory^searchPage
    evaluate: true
    value: Math.min(10, x + 1)
```

```meta-bind-button
label: "Previous"
hidden: true
id: "decrementSearchPage"
style: default
actions:
  - type: updateMetadata
    bindTarget: memory^searchPage
    evaluate: true
    value: Math.max(0, x - 1)
```

```meta-bind-js-view
{memory^searchTerm} as searchTerm
{memory^searchPage} as searchPage
{memory^searchRarity} as searchRarity
{memory^searchType} as searchType
{memory^searchMinValue} as searchMinValue
{memory^searchMaxValue} as searchMaxValue
{memory^searchDamage} as searchDamage
---
{
    let csvUtils = await engine.importJs('Scripts/csvUtils.js'); // ✅ Load CSV utilities

    // ✅ Get search parameters
    searchTerm = (context.bound.searchTerm || "").trim().toLowerCase();
    searchPage = context.bound.searchPage || 0;
    searchRarity = (context.bound.searchRarity || "").trim().toLowerCase();
    searchType = (context.bound.searchType || "").trim().toLowerCase();
    searchMinValue = parseInt(context.bound.searchMinValue) || 0;
    searchMaxValue = parseInt(context.bound.searchMaxValue) || 1000000;
    searchDamage = (context.bound.searchDamage || "").trim().toLowerCase();

    const filePath = "Items/Items.csv"; // CSV location

    // ✅ Read CSV asynchronously inside the note
    let allFiles = app.vault.getFiles();
    let file = allFiles.find(f => f.path === filePath);

    if (!file) {
        console.error(`File not found: ${filePath}`);
        return engine.markdown.create("❌ **File not found.**");
    }

    let csvText = await app.vault.read(file);
    if (!csvText.trim()) {
        console.error("File is empty.");
        return engine.markdown.create("⚠️ **The CSV file is empty.**");
    }

    // ✅ Parse CSV using `csvUtils`
    let { headers, data } = csvUtils.parseCSV(csvText);

    // ✅ Set up filters
    const filters = {
        name: searchTerm,
        rarity: searchRarity,
        type: searchType,
        damage: searchDamage,
        minValue: searchMinValue,
        maxValue: searchMaxValue
    };

    // ✅ Call the filter function synchronously
    let results = csvUtils.filterItemsCSV(data, filters);

    if (!results || results.length === 0) {
        return engine.markdown.create("🛑 **No results found.**");
    }

    // ✅ Pagination logic
    const itemsPerPage = 10;
    const startIndex = searchPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    let paginatedRows = results.slice(startIndex, endIndex);

    // ✅ Build collapsible Markdown sections
    let markdownOutput = `## Search Results (Page ${searchPage + 1})\n`;
    paginatedRows.forEach(row => {
        let name = row["Name"];
        let itemDetails = headers.map(header => `**${header}:** ${row[header] || "_None_"}`).join("\n");

        markdownOutput += `
<details>
  <summary>**${name}**</summary>

${itemDetails}
\`\`\`meta-bind-button
style: primary 
label: Create ${name}
action: 
 type: js 
 file: Scripts/CreateItemNote.js
 args:
  itemName: ${name}
\`\`\`
</details>
        `;
    });

    return engine.markdown.create(markdownOutput);
}

```