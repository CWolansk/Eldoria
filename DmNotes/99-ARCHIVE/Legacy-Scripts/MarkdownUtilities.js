export function AddMentionedInMarkdown() {

return `
\`\`\`dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
\`\`\`
`
}

export function addPlayerButtonLinkerMarkdown(category, subcategoryKey = null) {
    const subKeyArg = subcategoryKey ? `, "${subcategoryKey}"` : "";
    return `
\`\`\`meta-bind
INPUT[inlineSelect(
option('Claire'), 
option('JP'), 
option('Julie'), 
option('Justin'), 
option('Liz'), 
option('None'), 
defaultValue('None')
):memory^selectedPlayer]
\`\`\`
  
\`\`\`meta-bind-js-view
{memory^selectedPlayer} as selectedPlayer
---
selectedPlayer = context.bound.selectedPlayer;
if (!selectedPlayer || selectedPlayer === 'None') {
return engine.markdown.create("⚠️ **Select a Player**");
}

let filePath = app.vault.adapter.getFullPath(app.workspace.getActiveFile().path);
let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
let noteName = filePath.split('\\\\').pop().replace('.md', '');

let markdownOutput = \`
\\\`\\\`\\\`meta-bind-button
style: primary
label: Give to \${selectedPlayer}
action:
 type: inlineJS
 code: |
  let mdUtils = await engine.importJs('Scripts/MarkdownUtilities.js');
  mdUtils.addLinkToNote(\"\${noteName}\", "${category}", "Players/" + \"\${selectedPlayer}\" + ".md"${subKeyArg});
\\\`\\\`\\\`\`

return engine.markdown.create(markdownOutput);
\`\`\`
  `;
  }
  
  export async function addLinkToNote(noteName, category, targetNotePath, subcategory = null) {
    try {
      if (typeof app === 'undefined' || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return;
      }
  
      const noteFile = await app.vault.getAbstractFileByPath(targetNotePath);
      if (!noteFile) {
        console.error(`❌ Note not found at: ${targetNotePath}`);
        return;
      }
  
      const itemLink = `[[${noteName}]]`;
      let noteText = await app.vault.read(noteFile);
      let lines = noteText.split('\n');
  
      // 🟡 Move any dataview to the bottom and find its index
      const dataviewStart = lines.findIndex(line => line.trim().startsWith("```dataview"));
      const dataviewLines = dataviewStart !== -1 ? lines.splice(dataviewStart) : [];
  
      // 🟢 Ensure the main category header exists
      const categoryHeader = `## ${category}`;
      let categoryIndex = lines.findIndex(line => line.trim() === categoryHeader);
      if (categoryIndex === -1) {
        lines.push(categoryHeader);
        categoryIndex = lines.length - 1;
      }
  
      // 🔵 Handle spells with level-based subcategories
      if (subcategory) {
        const startIdx = categoryIndex + 1;
        const subBlocks = new Map();
  
        let i = startIdx;
        while (i < lines.length && lines[i].startsWith('- ')) {
          const subHeader = lines[i].trim();
          if (!subBlocks.has(subHeader)) subBlocks.set(subHeader, []);
          i++;
          while (i < lines.length && lines[i].startsWith('  - ')) {
            subBlocks.get(subHeader).push(lines[i]);
            i++;
          }
        }
  
        const subHeader = `- ${subcategory}`;
        const items = subBlocks.get(subHeader) || [];
  
        // Prevent duplicates
        if (items.includes(`  - ${itemLink}`)) {
          console.log("⚠️ Already linked, skipping.");
          return;
        }
  
        items.push(`  - ${itemLink}`);
        subBlocks.set(subHeader, items);
  
        // 🔢 Sort headers properly: Cantrip → 1st → 2nd → ... 9th
        const levelOrder = ["cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
        const sortedHeaders = Array.from(subBlocks.keys()).sort((a, b) => {
          const aLevel = a.slice(2).toLowerCase();
          const bLevel = b.slice(2).toLowerCase();
          return levelOrder.indexOf(aLevel) - levelOrder.indexOf(bLevel);
        });
  
        // 🧱 Rebuild the section
        const newSection = [categoryHeader];
        sortedHeaders.forEach(header => {
          newSection.push(header);
          newSection.push(...subBlocks.get(header));
        });
  
        // ✂️ Remove old category block
        lines.splice(categoryIndex, i - categoryIndex, ...newSection);
      } else {
        // 🔧 Handle non-spell (no subcategory)
        let insertIndex = categoryIndex + 1;
        while (insertIndex < lines.length && lines[insertIndex].startsWith('- ')) {
          if (lines[insertIndex].includes(itemLink)) return;
          insertIndex++;
        }
        lines.splice(insertIndex, 0, `- ${itemLink}`);
      }
  
      // 🧷 Add dataview block back at bottom if it existed
      if (dataviewLines.length) lines.push(...dataviewLines);
  
      await app.vault.modify(noteFile, lines.join('\n'));
      console.log(`✅ Linked ${itemLink} in ${targetNotePath}`);
    } catch (error) {
      console.error("❌ Failed to modify note", error);
    }
  }
  