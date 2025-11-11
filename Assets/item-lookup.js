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
    }

    // CSS styles (injected once)
    // Inject CSS styles into the document
    injectStyles() {
        if (this.stylesInjected) return;
        
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
            const csvPath = 'Assets/Items.csv';
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
            // Exact match only
            const match = allItems.find(item => 
                item.Name && item.Name.toLowerCase().trim() === normalizedSearch
            );
            if (match && !found.find(f => f.Name === match.Name)) {
                found.push(match);
            }
        });
        return found;
    }

    // Create HTML for items
    createItemsHTML(items) {
        if (items.length === 0) {
            return '<div class="error">No items found. Check item names.</div>';
        }

        return items.map((item, index) => {
            const rarityClass = `rarity-${(item.Rarity || 'common').toLowerCase().replace(/\s+/g, '-')}`;
            
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
                    </div>
                </details>
            `;
        }).join('');
    }

    // Main display function for use in dataviewjs
    async display(dv, itemNames) {
        this.injectStyles();

        try {
            const allItems = await this.loadCSVData(dv);
            const items = this.findItems(allItems, itemNames);
            const html = this.createItemsHTML(items);
            
            dv.paragraph(`<div class="item-lookup-widget">${html}</div>`);
        } catch (error) {
            dv.paragraph(`<div class="item-lookup-widget"><div class="error">Error loading items: ${error.message}</div></div>`);
        }
    }

    // Alternative: return HTML string for custom rendering
    async getHTML(dv, itemNames) {
        this.injectStyles();

        try {
            const allItems = await this.loadCSVData(dv);
            const items = this.findItems(allItems, itemNames);
            return `<div class="item-lookup-widget">${this.createItemsHTML(items)}</div>`;
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

