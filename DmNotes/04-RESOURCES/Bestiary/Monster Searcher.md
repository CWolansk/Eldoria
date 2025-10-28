# Monster Searcher (Quick Search)

Name : `INPUT[text(placeholder('Monster Name')):memory^name]`

Size : `INPUT[text(placeholder('Medium, Large')):memory^size]` 

Type : `INPUT[text(placeholder('Beast, Dragon')):memory^type]` 

Alignment : `INPUT[text(placeholder('Chaotic Evil')):memory^alignment]` 

Vulnerabilities : `INPUT[text(placeholder('Fire, Cold')):memory^vulnerabilities]` 

Resistances : `INPUT[text(placeholder('Slashing, Piercing')):memory^resistances]` 

Damage Immunities : `INPUT[text(placeholder('Poison, Necrotic')):memory^dmgimmunities]` 

Condition Immunities : `INPUT[text(placeholder('Charmed, Frightened')):memory^cndimmunities]` 

Environment : `INPUT[text(placeholder('Forest, Desert')):memory^environment]` 

Min CR : `INPUT[number(defaultValue(0)):memory^minCR]` 

Max CR : `INPUT[number(defaultValue(30)):memory^maxCR]`

Search in Abilities : `INPUT[text(placeholder('Spellcasting, Flying')):memory^abilities]`

```meta-bind-js-view
{memory^name} as name
{memory^size} as size
{memory^type} as type
{memory^alignment} as alignment
{memory^vulnerabilities} as vulnerabilities
{memory^resistances} as resistances
{memory^dmgimmunities} as dmgimmunities
{memory^cndimmunities} as cndimmunities
{memory^environment} as environment
{memory^minCR} as minCR
{memory^maxCR} as maxCR
{memory^abilities} as abilities
---
{
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js'); 
	let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');

    // Process search terms
    name = (context.bound.name || "").toLowerCase().trim();
    size = (context.bound.size || "").toLowerCase().trim();
    type = (context.bound.type || "").toLowerCase().trim();
    alignment = (context.bound.alignment || "").toLowerCase().trim();
    vulnerabilities = (context.bound.vulnerabilities || "").toLowerCase().trim();
    resistances = (context.bound.resistances || "").toLowerCase().trim();
    dmgimmunities = (context.bound.dmgimmunities || "").toLowerCase().trim();
    cndimmunities = (context.bound.cndimmunities || "").toLowerCase().trim();
    environment = (context.bound.environment || "").toLowerCase().trim();
    minCR = parseFloat(context.bound.minCR) || 0;
    maxCR = parseFloat(context.bound.maxCR) || 30;
    abilities = (context.bound.abilities || "").toLowerCase().trim();

    const dbPath = "Scripts/DND.db"; 

    // If no search terms, show message
    if (!name && !size && !type && !alignment && !vulnerabilities && !resistances && 
        !dmgimmunities && !cndimmunities && !environment && !abilities && 
        minCR === 0 && maxCR === 30) {
        return engine.markdown.create("Enter search terms above to find monsters.");
    }

    const filters = {
        Name: name,
        Size: size,
        Type: type,
        Alignment: alignment,
        "Damage Vulnerabilities": vulnerabilities,
        "Damage Resistances": resistances,
        "Damage Immunities": dmgimmunities,
        "Condition Immunities": cndimmunities,
        Environment: environment,
        Traits: abilities,
        Actions: abilities
    };

    // Build CR range query
    let preBuiltQueries = [];
    if (minCR !== 0 || maxCR !== 30) {
        preBuiltQueries.push(`(
            CASE 
                WHEN CR LIKE '%/%' THEN 
                    CAST(SUBSTR(CR, 1, INSTR(CR, '/') - 1) AS REAL) / CAST(SUBSTR(CR, INSTR(CR, '/') + 1) AS REAL)
                ELSE 
                    CAST(CR AS REAL)
            END >= ${minCR} 
            AND 
            CASE 
                WHEN CR LIKE '%/%' THEN 
                    CAST(SUBSTR(CR, 1, INSTR(CR, '/') - 1) AS REAL) / CAST(SUBSTR(CR, INSTR(CR, '/') + 1) AS REAL)
                ELSE 
                    CAST(CR AS REAL)
            END <= ${maxCR}
        )`);
    }

    // Limit results to prevent overwhelming output
    const pagination = { limit: 20, offset: 0 };

    let results = await sqlUtils.filterRecordsInDb(dbPath, engine, 'Monsters', filters, preBuiltQueries, pagination);
    
    if (!results || results.length === 0) {
        return engine.markdown.create("🛑 **No monsters found matching your criteria.**");
    }

    let markdownOutput = `## Monster Results (${results.length} found)\n\n`;
    
    results.forEach(row => {
        let name = row["Name"] || "(Unnamed)";
        let size = row["Size"] || "?";
        let type = row["Type"] || "?";
        let cr = row["CR"] || "?";
        let alignment = row["Alignment"] || "?";

        markdownOutput += `**${name}** - ${size} ${type}, ${alignment} (CR ${cr})  
${mdUtils.AddCreateMonsterNoteButton(row["Name"])}

`;
    });

    return engine.markdown.create(markdownOutput);
}
``` 

Max Ac : `INPUT[number(defaultValue(9)):memory^maxAc]`

Min hp : `INPUT[number(defaultValue(0)):memory^minhp]` 

Max hp : `INPUT[number(defaultValue(9)):memory^maxhp]`

Min CR : `INPUT[number(defaultValue(0)):memory^minCR]` 

Max CR : `INPUT[number(defaultValue(9)):memory^maxCR]`

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
{memory^size} as size
{memory^type} as type
{memory^alignment} as alignment
{memory^Vulnerabilities} as Vulnerabilities
{memory^Resistances} as Resistances
{memory^dmgimmunities} as dmgimmunities
{memory^cndimmunities} as cndimmunities
{memory^environment} as environment
{memory^minAc} as minAc
{memory^maxAc} as maxAc
{memory^minhp} as minhp
{memory^maxhp} as maxhp
{memory^minCR} as minCR
{memory^maxCR} as maxCR
{memory^searchPage} as searchPage
---
{
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js'); 
    let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');

    const dbPath = "Scripts/DBScriptsTesting/DND.db"; 
    const filters = {
        Name: (context.bound.name || "").trim().toLowerCase(),
        Size: (context.bound.size || "").trim().toLowerCase(),
        Type: (context.bound.type || "").trim().toLowerCase(),
        Alignment: (context.bound.alignment || "").trim().toLowerCase(),
        Vulnerabilities: (context.bound.Vulnerabilities || "").trim().toLowerCase(),
        Resistances: (context.bound.Resistances || "").trim().toLowerCase(),
        "Damage Immunities": (context.bound.dmgimmunities || "").trim().toLowerCase(),
        "Condition Immunities": (context.bound.cndimmunities || "").trim().toLowerCase(),
        Environment: (context.bound.environment || "").trim().toLowerCase(),
    };

    const preBuiltQueries = [
        `(CAST(SUBSTR(AC, 1, INSTR(AC || ' ', ' ') - 1) AS INTEGER) >= ${parseInt(context.bound.minAc) || 0})`,
        `(CAST(SUBSTR(AC, 1, INSTR(AC || ' ', ' ') - 1) AS INTEGER) <= ${parseInt(context.bound.maxAc) || 99})`,
        `(CAST(SUBSTR(HP, 1, INSTR(HP || ' ', ' ') - 1) AS INTEGER) >= ${parseInt(context.bound.minhp) || 0})`,
        `(CAST(SUBSTR(HP, 1, INSTR(HP || ' ', ' ') - 1) AS INTEGER) <= ${parseInt(context.bound.maxhp) || 999})`,
        `(CASE WHEN INSTR(CR, ' ') > 0 THEN SUBSTR(CR, 1, INSTR(CR, ' ') - 1) ELSE CR END) >= '${context.bound.minCR || 0}'`,
        `(CASE WHEN INSTR(CR, ' ') > 0 THEN SUBSTR(CR, 1, INSTR(CR, ' ') - 1) ELSE CR END) <= '${context.bound.maxCR || 99}'`
    ];

    const pagination = {
        limit: 10,
        offset: (parseInt(context.bound.searchPage) || 0) * 10
    };

    let results = await sqlUtils.filterRecordsInDb(dbPath, engine, 'Bestiary', filters, preBuiltQueries, pagination);

    if (!results || results.length === 0) {
        return engine.markdown.create("🛑 **No monsters found.**");
    }

    const summaryHeaders = ["Name", "HP", "CR", "Type"];
    const detailHeaders = Object.keys(filters);
    let md = `## Monster Results (Page ${parseInt(context.bound.searchPage) + 1})\n`;

    for (const row of results) {
        const name = row["Name"] || "(Unnamed)";

        md += `\n### 👾 ${name}\n`;
        md += `| ${summaryHeaders.join(" | ")} |
|${summaryHeaders.map(() => "---").join("|")}|
| ${summaryHeaders.map(h => row[h] || "_None_").join(" | ")} |
`;

        // Details section for all keys in filters
        md += `\n<details>\n<summary>📜 Full Monster Details</summary>\n\n`;
        for (const key of Object.keys(filters)) {
            md += `**${key}:** ${row[key] || "_None_"}  \n`;
        }

        if (row["Text"]) {
            md += `\n---\n\n**Description:**\n\n${row["Text"]}\n`;
        }

        md += `\n</details>\n`;

        //md += `\n${mdUtils.AddCreateMonsterNoteButton(row["Name"])}\n`;
    }
    return engine.markdown.create(md);
}

```


