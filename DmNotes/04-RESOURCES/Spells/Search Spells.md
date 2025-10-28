
Name : `INPUT[text(placeholder('Spell Name')):memory^name]`

Casting Time : `INPUT[text(placeholder('Action')):memory^castTime]` 

Duration : `INPUT[text(placeholder('1 hour')):memory^duration]` 

School : `INPUT[text(placeholder('Necromancy')):memory^school]` 

Range : `INPUT[text(placeholder('60 feet')):memory^range]` 

Components : `INPUT[text(placeholder('V, S, M')):memory^components]` 

Classes : `INPUT[text(placeholder('Wizard, Sorcer')):memory^classes]` 

Damage Type : `INPUT[text(placeholder('Fire, Ice')):memory^searchDamage]` 

Min Level : `INPUT[number(placeholder(0)):memory^minLevel]` 

Max Level : `INPUT[number(placeholder(9)):memory^maxLevel]`

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
    let csvUtils = await engine.importJs('Scripts/csvUtils.js'); // ✅ Load CSV utilities

    const filePath = "Spells/Spells.csv"; // ✅ CSV location for spells

    name = (context.bound.name || "").trim().toLowerCase();
    castTime = (context.bound.castTime || "").trim().toLowerCase();
    duration = (context.bound.duration || "").trim().toLowerCase();
    school = (context.bound.school || "").trim().toLowerCase();
    range = (context.bound.range || "").trim().toLowerCase();
    components = (context.bound.components || "").trim().toLowerCase();
    classes = (context.bound.classes || "").trim().toLowerCase();
    searchDamage = (context.bound.searchDamage || "").trim().toLowerCase();
    minLevel = parseInt(context.bound.minLevel) || 0;
    maxLevel = parseInt(context.bound.maxLevel) || 9;
    searchPage = parseInt(context.bound.searchPage) || 0;
    
    // ✅ Read CSV
    const allFiles = app.vault.getFiles();
    const file = allFiles.find(f => f.path === filePath);
    if (!file) return engine.markdown.create("❌ **Spells CSV file not found.**");
    const csvText = await app.vault.read(file);
    if (!csvText.trim()) return engine.markdown.create("⚠️ **Spells CSV is empty.**");

    const { headers, data } = csvUtils.parseCSV(csvText);

    const filters = {
        Name: name,
        "Casting Time": castTime,
        Duration: duration,
        School: school,
        Range: range,
        Components: components,
        Classes: classes,
        Text: searchDamage,
        minLevel,
        maxLevel
    };


    const results = csvUtils.filterSpellsCSV(data, filters);
    if (!results || results.length === 0) {
        return engine.markdown.create("🛑 **No results found.**");
    }

    // ✅ Pagination
    const itemsPerPage = 10;
    const startIndex = searchPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = results.slice(startIndex, endIndex);

    // ✅ Markdown rendering
    const summaryHeaders = ["Level", "Casting Time", "Duration", "Range"];
    const hiddenHeaders = ["School", "Components", "Classes", "Optional/Variant Classes"];

    let md = `## Spell Results (Page ${searchPage + 1})\n`;

    paginated.forEach(row => {
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
\`\`\`meta-bind-button
style: primary 
label: Create ${name}
action: 
 type: js 
 file: Scripts/CreateSpellNote.js
 args:
  spellName: ${name}
\`\`\`
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


