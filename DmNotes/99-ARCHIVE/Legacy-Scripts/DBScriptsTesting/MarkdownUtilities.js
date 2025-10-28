export function AddMentionedInMarkdown() {
  return `
\`\`\`dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
\`\`\`
  `;
}

export function AddCreateItemNoteButton(itemName) {
  return `
\`\`\`meta-bind-button
style: primary 
label: Create ${itemName}
action: 
 type: js 
 file: Scripts/DBScriptsTesting/CreateItemNote.js
 args:
  itemName: ${itemName}
\`\`\`
        `
}

export function AddCreateSpellNoteButton(SpellName) {
  return `
\`\`\`meta-bind-button
style: primary 
label: Create ${SpellName}
action: 
 type: js 
 file: Scripts/DBScriptsTesting/CreateSpellNote.js
 args:
  spellName: ${SpellName}
\`\`\`
`
}

export function AddCreateMonsterNoteButton(monsterName) {
  return `
\`\`\`meta-bind-button
style: primary 
label: Create ${monsterName}
action: 
 type: js 
 file: Scripts/DBScriptsTesting/CreateMonsterNote.js
 args:
  monsterName: ${monsterName}
\`\`\`
`
}

// Generate encounter markdown content
export async function generateEncounterMarkdown(encounterData) {
  const {
    encounterName,
    encounterDescription,
    encounterLocation,
    monsterData,
    totalXP,
    adjustedXP,
    difficulty,
    partyLevel,
    playerCount,
    totalMonsterCount,
    encounterMultiplier,
    includeTreasure,
    treasureType,
    customNotes
  } = encounterData;

  let content = `# ${encounterName}

${encounterLocation ? `**Location:** ${encounterLocation}\n` : ''}
${encounterDescription ? `**Description:** ${encounterDescription}\n` : ''}

---

## Encounter Overview

**Difficulty:** ${difficulty} (Level ${partyLevel} party of ${playerCount})  
**Total XP:** ${totalXP} (Adjusted: ${adjustedXP})  
**Encounter Multiplier:** x${encounterMultiplier} (${totalMonsterCount} creatures)

---

## Monsters

`;

  // Monster summary table
  content += `| Monster | Qty | AC | HP | Speed | CR | XP Each | Total XP |
|---------|-----|----|----|-------|----|---------|---------|\n`;

  for (const monster of monsterData) {
    const monsterLink = monster.Name !== "?" ? `[[${monster.Name}]]` : monster.Name;
    content += `| ${monsterLink} | ${monster.quantity} | ${monster.AC || "?"} | ${monster.HP || "?"} | ${monster.Speed || "?"} | ${monster.CR || "?"} | ${monster.xpValue || 0} | ${monster.totalXP || 0} |\n`;
  }

  content += `\n---

## Initiative Tracker

| Initiative | Character/Monster | AC | HP | Notes |
|------------|-------------------|----|----|-------|`;
  // Add players
  const players = ["Claire", "JP", "Julie", "Justin", "Liz"];
  for (const player of players) {
    content += `\n| \`INPUT[number():memory^init${player}]\` | [[${player}]] | - | - | \`INPUT[text():memory^notes${player}]\` |`;
  }

  // Add monsters
  let monsterIndex = 1;
  for (const monster of monsterData) {
    for (let i = 0; i < monster.quantity; i++) {
      const monsterName = monster.quantity > 1 ? `${monster.Name} ${i + 1}` : monster.Name;
      const hpDefault = monster.HP ? monster.HP.split(' ')[0] : 0;
      content += `\n| \`INPUT[number():memory^init${monster.Name.replace(/\s+/g, '')}${i + 1}]\` | ${monsterName} | ${monster.AC || "?"} | \`INPUT[number(defaultValue(${hpDefault})):memory^hp${monster.Name.replace(/\s+/g, '')}${i + 1}]\` | \`INPUT[text():memory^notes${monster.Name.replace(/\s+/g, '')}${i + 1}]\` |`;
    }
  }
  content += `\n\n### Initiative Controls
\`BUTTON[sortInitiative]\`

\`\`\`meta-bind-button
label: "Sort by Initiative"
hidden: true
id: "sortInitiative"
style: default
action:
  type: command
  command: obsidian-sort-table:sort-table
\`\`\`

---

## Combat Notes

**Environmental Factors:**
${customNotes || "_None specified_"}

**Special Mechanics:**
- [ ] Surprise round?
- [ ] Difficult terrain?
- [ ] Cover available?
- [ ] Special conditions?

**Turn Tracking:**
- [ ] Round 1
- [ ] Round 2  
- [ ] Round 3
- [ ] Round 4
- [ ] Round 5

---`;

  // Add treasure section if requested
  if (includeTreasure) {
    content += await generateTreasureSection(encounterData);
  }

  // Add monster stat blocks section
  content += `
## Monster Details

`;

  for (const monster of monsterData) {
    if (monster.Name && monster.Name !== "?") {
      content += `### ${monster.Name} ${monster.quantity > 1 ? `(x${monster.quantity})` : ''}

**Quick Stats:** AC ${monster.AC || "?"}, HP ${monster.HP || "?"}, Speed ${monster.Speed || "?"}

<details>
<summary>📖 Full Stats</summary>

**STR/DEX/CON/INT/WIS/CHA:** ${monster.Strength || "?"}/${monster.Dexterity || "?"}/${monster.Constitution || "?"}/${monster.Intelligence || "?"}/${monster.Wisdom || "?"}/${monster.Charisma || "?"}

**Saving Throws:** ${monster["Saving Throws"] || "_None_"}
**Skills:** ${monster.Skills || "_None_"}
**Damage Resistances:** ${monster["Damage Resistances"] || "_None_"}
**Damage Immunities:** ${monster["Damage Immunities"] || "_None_"}
**Condition Immunities:** ${monster["Condition Immunities"] || "_None_"}
**Senses:** ${monster.Senses || "_None_"}
**Languages:** ${monster.Languages || "_None_"}

**Traits:**
${monster.Traits || "_No traits listed._"}

**Actions:**
${monster.Actions || "_No actions listed._"}

${monster["Legendary Actions"] ? `**Legendary Actions:**\n${monster["Legendary Actions"]}` : ""}

</details>

[[${monster.Name}]] - Full monster page

`;
    }
  }

  content += `
---

## Session Notes

**What Happened:**


**Player Actions:**


**Memorable Moments:**


**Loot Distributed:**


---

\`\`\`dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
\`\`\`
`;

  return content;
}

// Generate treasure section based on encounter difficulty
async function generateTreasureSection(encounterData) {
  const { difficulty, totalXP, treasureType } = encounterData;
  
  let treasureContent = `
## Treasure

**Treasure Type:** ${treasureType}  
**Based on Encounter Difficulty:** ${difficulty}

`;

  // Simple treasure suggestions based on difficulty
  const treasureSuggestions = {
    "Easy": {
      coins: "2d6 × 10 cp, 3d6 sp",
      items: "50% chance of 1 minor mundane item"
    },
    "Medium": {
      coins: "4d6 × 10 cp, 6d6 sp, 2d6 gp",
      items: "75% chance of 1 minor item, 25% chance of 1 magic consumable"
    },
    "Hard": {
      coins: "2d6 × 10 sp, 4d6 gp, 1d6 pp",
      items: "1 minor item, 50% chance of 1 magic item (minor)"
    },
    "Deadly": {
      coins: "8d6 sp, 6d6 gp, 2d6 pp",
      items: "1-2 minor items, 75% chance of 1 magic item, 25% chance of 1 rare item"
    }
  };

  const suggestion = treasureSuggestions[difficulty] || treasureSuggestions["Easy"];

  treasureContent += `**Suggested Coins:** ${suggestion.coins}
**Suggested Items:** ${suggestion.items}

**Actual Treasure Found:**
- [ ] Coins: 
- [ ] Items: 
- [ ] Magic Items: 

**Distribution:**
- [ ] Claire: 
- [ ] JP: 
- [ ] Julie: 
- [ ] Justin: 
- [ ] Liz: 

---`;

  return treasureContent;
}

// Utility to fetch a single row by name from a given table (case-insensitive match)
  /**
   * Add a link to a spell or item note within a character sheet based on a specific header
   * @param {string} noteName - The opened SQLite database instance.
   * @param {string} header - The main header to insert the linked note text to 
   * @param {string} targetNotePath - The target note to put the link to, usually a character sheet
   * @param {string} subHeader - Optional subHeader for spells, ex : 'Cantrip', 'Level 1'
   */
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
  
  /**
   * Utility to take in the markdown content of a note and return a spell or item class object
   * @param {string} content - Markdown content to parse for a spell or item
   * @returns {Promise<Object>} - An spell or Item class object
   */
  export async function parseMarkdown(content) {
    // Remove all code blocks (meta-bind, dataview, etc.)
    const cleaned = content.replace(/```[\s\S]*?```/g, "");
    const lines = cleaned.split("\n");
    let current = {};
    let currentKey = null;
    let currentValue = "";
  
    for (const line of lines) {
      const fieldMatch = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
      if (fieldMatch) {
        // Flush previous field
        if (currentKey) {
          current[currentKey] = currentValue.trim().replace(/^_+|_+$/g, "");
        }
  
        // Start new field
        currentKey = fieldMatch[1].trim();
        currentValue = fieldMatch[2].trim();
      } else if (currentKey) {
        // Multiline continuation
        currentValue += "\n" + line.trim();
      }
    }
  
    // Flush last field
    if (currentKey) {
      current[currentKey] = currentValue.trim().replace(/^_+|_+$/g, "");
    }
  
    // Import classes and return the correct one
    const { Item, Spell } = await engine.importJs("Scripts/sqlUtils.js");
    if ("Level" in current) {
      return new Spell(current);
    } else {
      return new Item(current);
    }
  }
  

  export async function parseNoteFile(filePath) {
    try {
      if (typeof app === "undefined" || !app.vault) {
        console.error("❌ Obsidian app is not accessible.");
        return null;
      }
  
      const file = app.vault.getAbstractFileByPath(filePath);
      if (!file) {
        console.error(`❌ File not found at: ${filePath}`);
        return null;
      }
  
      const content = await app.vault.read(file);
      const parsed = await parseMarkdown(content);
      return parsed;
    } catch (err) {
      console.error("❌ Failed to parse note file:", err);
      return null;
    }
  }
  
  export function generateItemMarkdown(item) {
    return ` **Name:** ${item.Name}
  **Rarity:** ${item.Rarity || "-"}  
  **Type:** ${item.Type || "-"}  
  **Attunement:** ${item.Attunement || "-"}  
  **Damage:** ${item.Damage || "-"}  
  **Properties:** ${item.Properties || "-"}  
  **Mastery:** ${item.Mastery || "-"}  
  **Weight:** ${item.Weight || "-"}  
  **Source:** ${item.Source || "-"}  
  **Page:** ${item.Page || "-"}  
  **Value:** ${item.Value || "-"}  
  **Text:** ${item.Text || "*No description available.*"}`;
  }

  // Format a spell into a note body
export function generateSpellMarkdown(spell) {
  return ` **Name:** ${spell.Name}
**Level:** ${spell.Level || "-"}  
**Casting Time:** ${spell["Casting Time"] || "-"}  
**Duration:** ${spell.Duration || "-"}  
**School:** ${spell.School || "-"}  
**Range:** ${spell.Range || "-"}  
**Components:** ${spell.Components || "-"}  
**Classes:** ${spell.Classes || "-"}  
**Optional/Variant Classes:** ${spell["Optional/Variant Classes"] || "-"}  
**Source:** ${spell.Source || "-"}  
**Page:** ${spell.Page || "-"}  
**Text:** ${spell.Text || "*No description available.*"}
**At Higher Levels:** ${spell["At Higher Levels"] || "*None.*"}`;
}

// Write or update a file with markdown content
export async function createOrUpdateNote(filePath, content) {
  const existingFile = app.vault.getAbstractFileByPath(filePath);

  if (existingFile) {
    await app.vault.modify(existingFile, content);
  } else {
    await app.vault.create(filePath, content);
  }
}

export function generateMonsterMarkdown(monster) {
  return `**Name:** ${monster.Name}
**Size:** ${monster.Size || "-"}  
**Type:** ${monster.Type || "-"}  
**Alignment:** ${monster.Alignment || "-"}  
**AC:** ${monster.AC || "-"}  
**HP:** ${monster.HP || "-"}  
**Speed:** ${monster.Speed || "-"}  
**STR:** ${monster.Strength || "-"}  
**DEX:** ${monster.Dexterity || "-"}  
**CON:** ${monster.Constitution || "-"}  
**INT:** ${monster.Intelligence || "-"}  
**WIS:** ${monster.Wisdom || "-"}  
**CHA:** ${monster.Charisma || "-"}  
**Saving Throws:** ${monster["Saving Throws"] || "-"}  
**Skills:** ${monster.Skills || "-"}  
**Damage Vulnerabilities:** ${monster["Damage Vulnerabilities"] || "-"}  
**Damage Resistances:** ${monster["Damage Resistances"] || "-"}  
**Damage Immunities:** ${monster["Damage Immunities"] || "-"}  
**Condition Immunities:** ${monster["Condition Immunities"] || "-"}  
**Senses:** ${monster.Senses || "-"}  
**Languages:** ${monster.Languages || "-"}  
**CR:** ${monster.CR || "-"}  
**Environment:** ${monster.Environment || "-"}  
**Treasure:** ${monster.Treasure || "-"}  

**Traits:** ${monster.Traits || "*No traits listed.*"}

**Actions:** ${monster.Actions || "*No actions listed.*"}

**Bonus Actions:** ${monster["Bonus Actions"] || "*No bonus actions listed.*"}

**Reactions:** ${monster.Reactions || "*No reactions listed.*"}

**Legendary Actions:** ${monster["Legendary Actions"] || "*No legendary actions listed.*"}

**Mythic Actions:** ${monster["Mythic Actions"] || "*No mythic actions listed.*"}

**Lair Actions:** ${monster["Lair Actions"] || "*No lair actions listed.*"}

**Regional Effects:** ${monster["Regional Effects"] || "*No regional effects listed.*"}`;
}