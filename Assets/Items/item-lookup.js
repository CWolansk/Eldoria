// D&D Item Lookup Widget for Obsidian CustomJS
// Usage in markdown dataviewjs block:
//   ```dataviewjs
//   const {ItemLookup} = await cJS()
//   await ItemLookup.display(dv, ['Longsword', 'Bag of Holding', '+1 Weapon'])
//   ```

class ItemLookup {
    constructor() {
        this.csvData = null;
        this.isLoading = false;
        this.loadCallbacks = [];
        this.stylesInjected = false;
        this.spellLookup = null;
    }

    // CSS styles (injected once)
    // Inject CSS styles into the document
    async injectStyles(dv) {
        if (this.stylesInjected) return;
        
        // Load common styles if not already available
        if (typeof window.CommonLookupStyles === 'undefined') {
            try {
                const commonStylesPath = 'Assets/common-lookup-styles.js';
                const commonStylesCode = await dv.io.load(commonStylesPath);
                eval(commonStylesCode);
            } catch (error) {
                console.error('Failed to load common-lookup-styles.js:', error);
                this.injectFallbackStyles();
                return;
            }
        }
        
        // Inject base styles with item-specific class mapping
        const baseStyles = window.CommonLookupStyles.getBaseStyles('item-lookup-widget')
            .replace(/\.card(?![a-z-])/g, '.item-card')
            .replace(/\.card-name/g, '.item-name')
            .replace(/\.meta(?![a-z-])/g, '.item-type')
            .replace(/\.details(?![a-z-])/g, '.item-details')
            .replace(/\.text-content/g, '.item-text');
        
        // Inject item-specific rarity styles
        const rarityStyles = window.CommonLookupStyles.getItemRarityStyles('item-lookup-widget');
        
        window.CommonLookupStyles.injectStyles('item-lookup-styles', baseStyles + rarityStyles);
        this.stylesInjected = true;
    }

    injectFallbackStyles() {
        const styles = `
            .item-lookup-widget {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .item-lookup-widget .item-card {
                border: 1px solid var(--background-modifier-border);
                margin: 10px 0;
                padding: 15px;
                border-radius: 4px;
                background-color: var(--background-secondary);
            }
            .item-lookup-widget .item-name {
                font-weight: bold;
                font-size: 16px;
                color: var(--text-normal);
                cursor: pointer;
                user-select: none;
                list-style: none;
            }
            .item-lookup-widget .item-name::-webkit-details-marker {
                display: none;
            }
            .item-lookup-widget .item-name::marker {
                content: '';
            }
            .item-lookup-widget .item-name:hover {
                color: var(--text-accent);
            }
            .item-lookup-widget .item-type {
                color: var(--text-muted);
                font-size: 14px;
                margin-top: 5px;
            }
            .item-lookup-widget .rarity {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 12px;
                margin-left: 10px;
            }
            .item-lookup-widget .rarity-common { background-color: #9e9e9e; color: white; }
            .item-lookup-widget .rarity-uncommon { background-color: #4caf50; color: white; }
            .item-lookup-widget .rarity-rare { background-color: #2196f3; color: white; }
            .item-lookup-widget .rarity-very-rare { background-color: #9c27b0; color: white; }
            .item-lookup-widget .rarity-legendary { background-color: #ff9800; color: white; }
            .item-lookup-widget .item-details {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .item-lookup-widget .detail-row {
                margin: 5px 0;
                font-size: 14px;
                color: var(--text-normal);
            }
            .item-lookup-widget .detail-label {
                font-weight: bold;
                display: inline-block;
                min-width: 100px;
                color: var(--text-normal);
            }
            .item-lookup-widget .item-text {
                margin-top: 10px;
                padding: 10px;
                background-color: var(--background-primary);
                border-left: 3px solid var(--text-accent);
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-normal);
            }
            .item-lookup-widget .loading {
                color: var(--text-muted);
                text-align: center;
                padding: 20px;
            }
            .item-lookup-widget .error {
                color: var(--text-error);
                padding: 10px;
                background-color: var(--background-modifier-error);
                border-radius: 4px;
            }
            .item-lookup-widget .expand-icon {
                display: inline-block;
                transition: transform 0.2s;
                margin-right: 5px;
            }
            .item-lookup-widget .expand-icon.expanded {
                transform: rotate(90deg);
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'item-lookup-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        this.stylesInjected = true;
    }

    // Parse CSV line with proper quote handling
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    // Parse entire CSV (fallback if dv.io.csv doesn't work)
    parseCSV(text) {
        const lines = text.split('\n');
        const headers = this.parseCSVLine(lines[0]);
        const items = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length === headers.length) {
                    const item = {};
                    headers.forEach((header, index) => {
                        item[header] = values[index];
                    });
                    items.push(item);
                }
            }
        }
        return items;
    }

    // Load CSV data using Dataview API
    async loadCSVData(dv) {
        if (this.csvData) {
            return this.csvData;
        }

        if (this.isLoading) {
            // Wait for existing load to complete
            return new Promise((resolve, reject) => {
                this.loadCallbacks.push({ resolve, reject });
            });
        }

        this.isLoading = true;

        try {
            // Use Dataview's CSV loader
            const csvPath = 'Assets/Items/Items.csv';
            const data = await dv.io.csv(csvPath);
            
            // Convert DataArray to plain array of objects
            this.csvData = data.array();
            this.isLoading = false;
            
            // Resolve any waiting callbacks
            this.loadCallbacks.forEach(cb => cb.resolve(this.csvData));
            this.loadCallbacks = [];
            
            return this.csvData;
        } catch (error) {
            this.isLoading = false;
            console.error('Error loading Items.csv:', error);
            
            // Reject any waiting callbacks
            this.loadCallbacks.forEach(cb => cb.reject(error));
            this.loadCallbacks = [];
            
            throw error;
        }
    }

    // Find items by exact names
    findItems(allItems, itemNames) {
        const found = [];
        itemNames.forEach(searchName => {
            const normalizedSearch = searchName.toLowerCase().trim();
            
            // Check for spell scroll pattern with pipe: "Spell Scroll (Level)|SpellName"
            const spellScrollMatch = searchName.match(/^(.+?)\s*\|\s*(.+)$/);
            
            if (spellScrollMatch) {
                const itemName = spellScrollMatch[1].trim();
                const spellName = spellScrollMatch[2].trim();
                
                // Check if the base item is a spell scroll
                const normalizedItemName = itemName.toLowerCase().trim();
                if (normalizedItemName.startsWith('spell scroll')) {
                    console.log('Spell scroll with pipe pattern matched:', searchName);
                    console.log('Item name:', itemName, 'Spell name:', spellName);
                    
                    // Look for the exact spell scroll item
                    const scrollItem = allItems.find(item => 
                        item.Name && item.Name.toLowerCase().trim() === normalizedItemName
                    );
                    
                    console.log('Base scroll item found:', scrollItem ? scrollItem.Name : 'NONE');
                    
                    if (scrollItem) {
                        // Create a custom item for this specific spell scroll
                        const customScroll = {
                            ...scrollItem,
                            Name: searchName, // Use the full name with pipe
                            _isSpellScroll: true,
                            _spellName: spellName
                        };
                        console.log('Created custom scroll:', customScroll);
                        found.push(customScroll);
                    }
                    // Don't continue to exact match if we found spell scroll pattern
                    return;
                }
            }
            
            // Exact match for normal items
            const match = allItems.find(item => 
                item.Name && item.Name.toLowerCase().trim() === normalizedSearch
            );
            if (match && !found.find(f => f.Name === match.Name)) {
                found.push(match);
            }
        });
        console.log('Final found items:', found.length, found.map(i => ({name: i.Name, isSpellScroll: i._isSpellScroll, spellName: i._spellName})));
        return found;
    }

    // Load SpellLookup if needed
    async loadSpellLookup(dv) {
        if (this.spellLookup) return this.spellLookup;
        
        try {
            const spellLookupPath = 'Assets/Spells/spell-lookup.js';
            const spellLookupCode = await dv.io.load(spellLookupPath);
            
            // Use Function constructor to evaluate in a scope that returns the class
            const spellLookupFunc = new Function(spellLookupCode + '\nreturn SpellLookup;');
            const SpellLookupClass = spellLookupFunc();
            
            this.spellLookup = new SpellLookupClass();
            return this.spellLookup;
        } catch (error) {
            console.error('Failed to load spell-lookup.js:', error);
            return null;
        }
    }

    // Create HTML for items
    async createItemsHTML(items, dv) {
        if (items.length === 0) {
            return '<div class="error">No items found. Check item names.</div>';
        }

        const itemHTMLPromises = items.map(async (item, index) => {
            const rarityClass = `rarity-${(item.Rarity || 'common').toLowerCase().replace(/\s+/g, '-')}`;
            
            let spellDetailsHTML = '';
            
            // If this is a spell scroll with a specific spell, look up the spell
            if (item._isSpellScroll && item._spellName) {
                console.log('Spell scroll detected:', item.Name, 'Spell:', item._spellName);
                const spellLookup = await this.loadSpellLookup(dv);
                if (spellLookup) {
                    try {
                        console.log('Looking up spell:', item._spellName);
                        const spells = await spellLookup.getSpells(dv, [item._spellName]);
                        console.log('Spells found:', spells);
                        if (spells && spells.length > 0) {
                            const spell = spells[0];
                            spellDetailsHTML = `
                                <div class="spell-details-section" style="margin-top: 15px; padding: 10px; background-color: var(--background-primary); border-left: 3px solid var(--color-purple); border-radius: 4px;">
                                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: var(--text-accent);">📜 Spell: ${spell.Name}</div>
                                    <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 5px;">
                                        ${spell.Level || 'Cantrip'} • ${spell.School || ''} • ${spell['Casting Time'] || ''} • ${spell.Range || ''}
                                    </div>
                                    ${spell.Components ? `<div style="font-size: 12px; margin: 5px 0;"><strong>Components:</strong> ${spell.Components}</div>` : ''}
                                    ${spell.Duration ? `<div style="font-size: 12px; margin: 5px 0;"><strong>Duration:</strong> ${spell.Duration}</div>` : ''}
                                    ${spell.Text ? `<div style="margin-top: 8px; font-size: 13px; line-height: 1.6;">${spell.Text}</div>` : ''}
                                    ${spell['At Higher Levels'] ? `<div style="margin-top: 8px; font-size: 12px; font-style: italic;"><strong>At Higher Levels:</strong> ${spell['At Higher Levels']}</div>` : ''}
                                </div>
                            `;
                        } else {
                            spellDetailsHTML = `<div class="error" style="margin-top: 10px; padding: 8px; font-size: 12px;">Spell "${item._spellName}" not found.</div>`;
                        }
                    } catch (error) {
                        console.error('Error loading spell:', error);
                        spellDetailsHTML = `<div class="error" style="margin-top: 10px; padding: 8px; font-size: 12px;">Error loading spell details.</div>`;
                    }
                }
            }
            
            return `
                <details class="item-card">
                    <summary class="item-name">
                        ${item.Name}
                        <span class="rarity ${rarityClass}">${item.Rarity || 'Common'}</span>
                    </summary>
                    <div class="item-details">
                        <div class="item-type">${item.Type || 'Item'}</div>
                        ${item.Source ? `<div class="detail-row"><span class="detail-label">Source:</span> ${item.Source} (pg. ${item.Page || 'N/A'})</div>` : ''}
                        ${item.Attunement ? `<div class="detail-row"><span class="detail-label">Attunement:</span> ${item.Attunement}</div>` : ''}
                        ${item.Damage ? `<div class="detail-row"><span class="detail-label">Damage:</span> ${item.Damage}</div>` : ''}
                        ${item.Properties ? `<div class="detail-row"><span class="detail-label">Properties:</span> ${item.Properties}</div>` : ''}
                        ${item.Weight ? `<div class="detail-row"><span class="detail-label">Weight:</span> ${item.Weight}</div>` : ''}
                        ${item.Value ? `<div class="detail-row"><span class="detail-label">Value:</span> ${item.Value}</div>` : ''}
                        ${item.Text ? `<div class="item-text">${item.Text}</div>` : ''}
                        ${spellDetailsHTML}
                    </div>
                </details>
            `;
        });

        const itemHTMLs = await Promise.all(itemHTMLPromises);
        return itemHTMLs.join('');
    }

    // Main display function for use in dataviewjs
    async display(dv, itemNames) {
        await this.injectStyles(dv);

        try {
            const allItems = await this.loadCSVData(dv);
            const items = this.findItems(allItems, itemNames);
            const html = await this.createItemsHTML(items, dv);
            
            dv.paragraph(`<div class="item-lookup-widget">${html}</div>`);
        } catch (error) {
            dv.paragraph(`<div class="item-lookup-widget"><div class="error">Error loading items: ${error.message}</div></div>`);
        }
    }

    // Alternative: return HTML string for custom rendering
    async getHTML(dv, itemNames) {
        await this.injectStyles(dv);

        try {
            const allItems = await this.loadCSVData(dv);
            const items = this.findItems(allItems, itemNames);
            const html = await this.createItemsHTML(items, dv);
            return `<div class="item-lookup-widget">${html}</div>`;
        } catch (error) {
            return `<div class="item-lookup-widget"><div class="error">Error loading items: ${error.message}</div></div>`;
        }
    }

    // Get raw item data
    async getItems(dv, itemNames) {
        const allItems = await this.loadCSVData(dv);
        return this.findItems(allItems, itemNames);
    }
}

