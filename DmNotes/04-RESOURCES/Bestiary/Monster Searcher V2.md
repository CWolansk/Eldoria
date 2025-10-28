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
