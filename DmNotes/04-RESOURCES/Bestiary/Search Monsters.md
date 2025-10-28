# Monster Search

Name : `INPUT[text(placeholder('Monster Name')):memory^name]`

Size : 
```meta-bind
INPUT[inlineSelect(
	option('Any'), 
	option('Tiny'), 
	option('Small'), 
	option('Medium'), 
	option('Large'), 
	option('Huge'), 
	option('Gargantuan'),
	defaultValue('Any')
):memory^searchSize]
```

Type : `INPUT[text(placeholder('Beast, Dragon, Humanoid')):memory^searchType]` 

Alignment : `INPUT[text(placeholder('Lawful Good, Chaotic Evil')):memory^searchAlignment]` 

Challenge Rating : `INPUT[text(placeholder('1/4, 5, 15')):memory^searchCR]` 

Environment : `INPUT[text(placeholder('Forest, Dungeon, Urban')):memory^searchEnvironment]`

Min CR : `INPUT[number(placeholder(0)):memory^searchMinCR]` 

Max CR : `INPUT[number(placeholder(30)):memory^searchMaxCR]`

Damage Type (in actions/traits) : `INPUT[text(placeholder('Fire, Necrotic')):memory^searchDamage]` 

Description/Abilities : `INPUT[text(placeholder('Flying, Spellcaster')):memory^description]` 

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
{memory^searchSize} as searchSize
{memory^searchType} as searchType
{memory^searchAlignment} as searchAlignment
{memory^searchCR} as searchCR
{memory^searchEnvironment} as searchEnvironment
{memory^searchMinCR} as searchMinCR
{memory^searchMaxCR} as searchMaxCR
{memory^searchDamage} as searchDamage
{memory^description} as description
---
{
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js'); 
	let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');

    name = (context.bound.name || "").toLowerCase();
    searchPage = parseInt(context.bound.searchPage) || 0;
    searchSize = (context.bound.searchSize || "").toLowerCase();
    searchType = (context.bound.searchType || "").toLowerCase();
    searchAlignment = (context.bound.searchAlignment || "").toLowerCase();
    searchCR = (context.bound.searchCR || "").toLowerCase();
    searchEnvironment = (context.bound.searchEnvironment || "").toLowerCase();
    searchMinCR = parseFloat(context.bound.searchMinCR) || 0;
    searchMaxCR = parseFloat(context.bound.searchMaxCR) || 30;
    searchDamage = (context.bound.searchDamage || "").toLowerCase();
    description = (context.bound.description || "").toLowerCase();

    const dbPath = "Scripts/DND.db"; 

    const filters = {
        Name: name,
        Size: searchSize !== "any" ? searchSize : undefined,
        Type: searchType,
        Alignment: searchAlignment,
        CR: searchCR,
        Environment: searchEnvironment,
        Actions: searchDamage,
        Traits: description
    };

    // Helper function to parse CR values for comparison
    function parseCR(crStr) {
        if (!crStr) return 0;
        const str = String(crStr).toLowerCase().trim();
        
        if (str.includes('/')) {
            // Handle fractions like "1/2", "1/4", "1/8"
            const parts = str.split('/');
            return parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Build CR range queries
    let preBuiltQueries = [];
    
    // For the database query, we need to handle fractional CRs
    // We'll do a more complex comparison that handles both fractional and integer CRs
    if (searchMinCR !== undefined && searchMaxCR !== undefined) {
        preBuiltQueries.push(`(
            CASE 
                WHEN CR LIKE '%/%' THEN 
                    CAST(SUBSTR(CR, 1, INSTR(CR, '/') - 1) AS REAL) / CAST(SUBSTR(CR, INSTR(CR, '/') + 1) AS REAL)
                ELSE 
                    CAST(CR AS REAL)
            END >= ${searchMinCR} 
            AND 
            CASE 
                WHEN CR LIKE '%/%' THEN 
                    CAST(SUBSTR(CR, 1, INSTR(CR, '/') - 1) AS REAL) / CAST(SUBSTR(CR, INSTR(CR, '/') + 1) AS REAL)
                ELSE 
                    CAST(CR AS REAL)
            END <= ${searchMaxCR}
        )`);
    }

    const itemsPerPage = 10;
    const pagination = {
        limit: itemsPerPage,
        offset: searchPage * itemsPerPage
    };

    let results = await sqlUtils.filterRecordsInDb(dbPath, engine,'Monsters', filters, preBuiltQueries, pagination);
    if (!results || results.length === 0) {
        return engine.markdown.create("🛑 **No results found.**");
    }

    let markdownOutput = `## Monster Search Results (Page ${searchPage + 1})\n`;
    
    results.forEach(row => {
        let name = row["Name"] || "(Unnamed)";
        let size = row["Size"] || "Unknown";
        let type = row["Type"] || "Unknown";
        let cr = row["CR"] || "?";
        let ac = row["AC"] || "?";
        let hp = row["HP"] || "?";

        // Create a summary table for quick reference
        markdownOutput += `\n### 👹 ${name}\n`;
        markdownOutput += `| Size | Type | CR | AC | HP |
|------|------|----|----|-------|
| ${size} | ${type} | ${cr} | ${ac} | ${hp} |

`;

        // Add collapsible section for full details
        markdownOutput += `<details>
  <summary>📖 Full Monster Details</summary>

**Alignment:** ${row["Alignment"] || "_None_"}  
**Speed:** ${row["Speed"] || "_None_"}  
**STR/DEX/CON/INT/WIS/CHA:** ${row["Strength"] || "?"}/${row["Dexterity"] || "?"}/${row["Constitution"] || "?"}/${row["Intelligence"] || "?"}/${row["Wisdom"] || "?"}/${row["Charisma"] || "?"}  
**Saving Throws:** ${row["Saving Throws"] || "_None_"}  
**Skills:** ${row["Skills"] || "_None_"}  
**Damage Resistances:** ${row["Damage Resistances"] || "_None_"}  
**Damage Immunities:** ${row["Damage Immunities"] || "_None_"}  
**Condition Immunities:** ${row["Condition Immunities"] || "_None_"}  
**Senses:** ${row["Senses"] || "_None_"}  
**Languages:** ${row["Languages"] || "_None_"}  
**Environment:** ${row["Environment"] || "_None_"}  

---

**Traits:**
${row["Traits"] || "_No traits listed._"}

**Actions:**
${row["Actions"] || "_No actions listed._"}

**Legendary Actions:**
${row["Legendary Actions"] || "_No legendary actions._"}

${mdUtils.AddCreateMonsterNoteButton(row["Name"])}

</details>\n`;
    });

    return engine.markdown.create(markdownOutput);
}
```
