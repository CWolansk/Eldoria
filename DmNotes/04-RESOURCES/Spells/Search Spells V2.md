Name : `INPUT[text(placeholder('Spell Name')):memory^name]`

Casting Time : `INPUT[text(placeholder('Action')):memory^castTime]` 

Duration : `INPUT[text(placeholder('1 hour')):memory^duration]` 

School : `INPUT[text(placeholder('Necromancy')):memory^school]` 

Range : `INPUT[text(placeholder('60 feet')):memory^range]` 

Components : `INPUT[text(placeholder('V, S, M')):memory^components]` 

Classes : `INPUT[text(placeholder('Wizard, Sorcer')):memory^classes]` 

Description : `INPUT[text(placeholder('Fire, Ice')):memory^searchDamage]` 

Min Level : `INPUT[number(defaultValue(0)):memory^minLevel]` 

Max Level : `INPUT[number(defaultValue(9)):memory^maxLevel]`

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
{memory^castTime} as castTime
{memory^duration} as duration
{memory^school} as school
{memory^range} as range
{memory^components} as components
{memory^classes} as classes
{memory^searchDamage} as searchDamage
{memory^minLevel} as minLevel
{memory^maxLevel} as maxLevel
{memory^searchPage} as searchPage
---
{
    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js'); 
	let mdUtils = await engine.importJs('Scripts/DBScriptsTesting/MarkdownUtilities.js');

    name = (context.bound.name || "").trim().toLowerCase();
    castTime = (context.bound.castTime || "").trim().toLowerCase();
    duration = (context.bound.duration || "").trim().toLowerCase();
    school = (context.bound.school || "").trim().toLowerCase();
    range = (context.bound.range || "").trim().toLowerCase();
    components = (context.bound.components || "").trim().toLowerCase();
    classes = (context.bound.classes || "").trim().toLowerCase();
    searchDamage = (context.bound.searchDamage || "").trim().toLowerCase();
levelMin = Number.isNaN(parseInt(context.bound.minLevel)) ? 0 : parseInt(context.bound.minLevel);
levelMax = Number.isNaN(parseInt(context.bound.maxLevel)) ? 9 : parseInt(context.bound.maxLevel);
    searchPage = parseInt(context.bound.searchPage) || 0;
console.log(name);
	const dbPath = "Scripts/DBScriptsTesting/DND.db"; 

    const filters = {
        name: name,
        "Casting Time": castTime,
        Duration: duration,
        School: school,
        Range: range,
        Components: components,
        Text: searchDamage,
    };
function buildLevelRangeQuery(levelMin, levelMax) {
  function normalizeLevel(levelStr) {
    const str = String(levelStr).toLowerCase();
    if (str === "cantrip") return 0;
    const parsed = parseInt(str);
    return isNaN(parsed) ? -1 : parsed;
  }

  const normalizedExpr = "(CASE WHEN LOWER(Level) = 'cantrip' THEN 0 ELSE CAST(Level AS INTEGER) END)";
  const min = normalizeLevel(levelMin ?? 0);
  const max = normalizeLevel(levelMax ?? 9);

  return [
    `${normalizedExpr} >= ${min}`,
    `${normalizedExpr} <= ${max}`
  ];
}

let preBuiltQueries = buildLevelRangeQuery(levelMin, levelMax);
preBuiltQueries.push(`(LOWER("Classes") LIKE '%${classes.toLowerCase()}%' OR LOWER("Optional/Variant Classes") LIKE '%${classes.toLowerCase()}%')`);


    const itemsPerPage = 10;
    const pagination = {
        limit: itemsPerPage,
        offset: searchPage * itemsPerPage
    };

    let results = await sqlUtils.filterRecordsInDb(dbPath, engine,'Spells', filters, preBuiltQueries, pagination);
    if (!results || results.length === 0) {
        return engine.markdown.create("🛑 **No results found.**");
    }

    // ✅ Markdown rendering
    const summaryHeaders = ["Level", "Casting Time", "Duration", "Range"];
    const hiddenHeaders = ["School", "Components", "Classes", "Optional/Variant Classes"];

    let md = `## Spell Results (Page ${searchPage + 1})\n`;

    results.forEach(row => {
        let name = row["Name"] || "(Unnamed)";

        // Render name
        md += `\n### 🧙‍♂️ ${name}\n`;

        // Render summary table with core info
        md += `| ${summaryHeaders.join(" | ")} |
|${summaryHeaders.map(() => "---").join("|")}|
| ${summaryHeaders.map(h => row[h] || "_None_").join(" | ")} |
`;

        // Add collapsible section for additional details and descriptions
        let fullText = row["Text"] || "_None_";
        let higherLevels = row["At Higher Levels"] || "_None_";

        md += `\n
        ${mdUtils.AddCreateSpellNoteButton(row["Name"])}
</details>
        <details>
  <summary>📜 More Details</summary>

**School:** ${row["School"] || "_None_"}  
**Components:** ${row["Components"] || "_None_"}  
**Classes:** ${row["Classes"] || "_None_"}  
**Optional/Variant Classes:** ${row["Optional/Variant Classes"] || "_None_"}  

---

**Description:**

${fullText}

**At Higher Levels:**

${higherLevels}

</details>
`;
    });

    return engine.markdown.create(md);
}
```


