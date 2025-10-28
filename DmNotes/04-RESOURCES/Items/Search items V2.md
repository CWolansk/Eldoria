
Name : `INPUT[text(placeholder('Item Name')):memory^name]`

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

Description : `INPUT[text(placeholder('damage')):memory^description]` 

Min Value : `INPUT[number(placeholder(0)):memory^searchMinValue]` 

Max Value : `INPUT[number(placeholder(5000)):memory^searchMaxValue]`

Page : `INPUT[number(defaultValue(0)):memory^searchPage]`

`BUTTON[decrementSearchPage,incrementSearchPage]`
**
```meta-bind-button
label: "Next"
hidden: true
id: "incrementSearchPage"
style: default
actions:
  - type: updateMetadata
    bindTarget: memory^searchPage
    evaluate: true
    value: Math.min(10, (parseInt(x) || 0) + 1)
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
    value: Math.max(0, (parseInt(x) || 0) - 1)
```

```meta-bind-js-view
{memory^name} as name
{memory^searchPage} as searchPage
{memory^searchRarity} as searchRarity
{memory^searchType} as searchType
{memory^searchMinValue} as searchMinValue
{memory^searchMaxValue} as searchMaxValue
{memory^searchDamage} as searchDamage
{memory^description} as description
---
{
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js'); 
	let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');

    name = (context.bound.name || "").toLowerCase();
    searchPage = parseInt(context.bound.searchPage) || 0;
    searchRarity = (context.bound.searchRarity || "").toLowerCase();
    searchType = (context.bound.searchType || "").toLowerCase();
    searchMinValue = parseInt(context.bound.searchMinValue) || 0;
    searchMaxValue = parseInt(context.bound.searchMaxValue) || 1000000;
    searchDamage = (context.bound.searchDamage || "").toLowerCase();
    description = (context.bound.description || "").toLowerCase();

    const dbPath = "Scripts/DBScriptsTesting/DND.db"; 

    const filters = {
        name: name,
        rarity: searchRarity !== "any" ? searchRarity : undefined,
        type: searchType,
        damage: searchDamage,
        text: description
    };

let preBuiltQueries = [];

preBuiltQueries.push(`CAST(Value AS INTEGER) >= '${searchMinValue}' AND CAST(Value AS INTEGER) <= '${searchMaxValue}' `);

    const itemsPerPage = 10;
    const pagination = {
        limit: itemsPerPage,
        offset: searchPage * itemsPerPage
    };

    let results = await sqlUtils.filterRecordsInDb(dbPath, engine,'Items', filters,preBuiltQueries, pagination);
    if (!results || results.length === 0) {
        return engine.markdown.create("🛑 **No results found.**");
    }

    let markdownOutput = `## Search Results (Page ${searchPage + 1})\n`;
    results.forEach(row => {
        let headers = Object.keys(row);
        let itemDetails = headers.map(header => `**${header}:** ${row[header] || "_None_"}`).join("\n");

        markdownOutput += `
<details>
  <summary>**${row["Name"]}**</summary>

${itemDetails}
${mdUtils.AddCreateItemNoteButton(row["Name"])}
</details>\n`;
    });

    return engine.markdown.create(markdownOutput);
}

```