export function AddMentionedInMarkdown() {

return `
\`\`\`dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
\`\`\`
`
}

export function addPlayerButtonLinkerMarkdown() {

return `
\`\`\`meta-bind
INPUT[inlineSelect(
\toption('Claire'), 
\toption('JP'), 
\toption('Julie'), 
\toption('Justin'), 
\toption('Liz'), 
\toption('None'), 
\tdefaultValue('None')
):memory^selectedPlayer]
\`\`\`

\`\`\`meta-bind-js-view
{memory^selectedPlayer} as selectedPlayer
---
\tselectedPlayer = context.bound.selectedPlayer;
if (!selectedPlayer || selectedPlayer === 'None'){
\treturn engine.markdown.create("⚠️ **Select a Player**");
}
let filePath = app.vault.adapter.getFullPath(app.workspace.getActiveFile().path)
let mdUtils = await engine.importJs('Items/MarkdownUtilities.js');
let itemName = filePath.split('\\\\').pop().replace('.md', '');

let markdownOutput = \`
\\\`\\\`\\\`meta-bind-button
style: primary 
label: Give Item To \${selectedPlayer}
action: 
 type: inlineJS
 code: |
  let mdUtils = await engine.importJs('Items/MarkdownUtilities.js');
  mdUtils.addLinkToNote(\\'\${itemName}\\' ,'Players/' + \\\'\${selectedPlayer}\\\' + '.md');
\\\`\\\`\\\`
\`;

return engine.markdown.create(markdownOutput);
\`\`\``
}

export async function addLinkToNote(itemName, targetNotePath) {
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

        const itemLink = `[[${itemName}]]`;

        let noteText = await app.vault.read(noteFile);

        // Check if the item is already mentioned
        if (noteText.includes(itemLink)) {
            console.log("✅ Item already linked. Skipping.");
            return;
        }

        // Find the Magic Items section
        const magicItemsHeader = "## Magic Items";
        let lines = noteText.split('\n');
        let insertIndex = lines.findIndex(line => line.trim() === magicItemsHeader);

        if (insertIndex !== -1) {
            insertIndex++; // move to the line after the header

            // Find next section or end of file
            while (insertIndex < lines.length && lines[insertIndex].startsWith('-')) {
                insertIndex++;
            }

            lines.splice(insertIndex, 0, `- ${itemLink}`);
            noteText = lines.join('\n');
        } else {
            // If no Magic Items section, add one
            noteText += `\n\n## Magic Items\n- ${itemLink}`;
        }

        await app.vault.modify(noteFile, noteText);
        console.log(`✅ Added ${itemLink} to ${targetNotePath}`);
    } catch (error) {
        console.error("❌ Failed to modify note", error);
    }
}
