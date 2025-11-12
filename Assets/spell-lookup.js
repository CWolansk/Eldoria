// D&D Spell Lookup Widget for Obsidian CustomJS
// Usage in markdown dataviewjs block:
//   ```dataviewjs
//   const {SpellLookup} = await cJS()
//   await SpellLookup.display(dv, ['Fireball', 'Magic Missile', 'Cure Wounds'])
//   ```

class SpellLookup {
    constructor() {
        this.csvData = null;
        this.isLoading = false;
        this.loadCallbacks = [];
        this.stylesInjected = false;
    }

    // Inject CSS styles into the document
    injectStyles() {
        if (this.stylesInjected) return;
        
        const styles = `
            .spell-lookup-widget {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .spell-lookup-widget .spell-card {
                border: 1px solid var(--background-modifier-border);
                margin: 10px 0;
                padding: 15px;
                border-radius: 4px;
                background-color: var(--background-secondary);
            }
            .spell-lookup-widget .spell-name {
                font-weight: bold;
                font-size: 16px;
                color: var(--text-normal);
                cursor: pointer;
                user-select: none;
                list-style: none;
            }
            
            /* Hide default disclosure markers */
            .spell-lookup-widget .spell-name::-webkit-details-marker {
                display: none;
            }
            .spell-lookup-widget .spell-name::marker {
                content: '';
            }
            
            .spell-lookup-widget .spell-name:hover {
                color: var(--text-accent);
            }
            .spell-lookup-widget .spell-meta {
                color: var(--text-muted);
                font-size: 14px;
                margin-top: 5px;
            }
            .spell-lookup-widget .spell-level {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 12px;
            margin-left: 10px;
        }
            .spell-lookup-widget .level-cantrip { background-color: #9e9e9e; color: white; }
            .spell-lookup-widget .level-1st { background-color: #8bc34a; color: white; }
            .spell-lookup-widget .level-2nd { background-color: #4caf50; color: white; }
            .spell-lookup-widget .level-3rd { background-color: #00bcd4; color: white; }
            .spell-lookup-widget .level-4th { background-color: #2196f3; color: white; }
            .spell-lookup-widget .level-5th { background-color: #3f51b5; color: white; }
            .spell-lookup-widget .level-6th { background-color: #9c27b0; color: white; }
            .spell-lookup-widget .level-7th { background-color: #e91e63; color: white; }
            .spell-lookup-widget .level-8th { background-color: #f44336; color: white; }
            .spell-lookup-widget .level-9th { background-color: #ff9800; color: white; }
            .spell-lookup-widget .school-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 11px;
                background-color: var(--background-modifier-border);
                color: var(--text-normal);
                margin-left: 5px;
            }
            .spell-lookup-widget .spell-details {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .spell-lookup-widget .detail-row {
                margin: 5px 0;
                font-size: 14px;
                color: var(--text-normal);
            }
            .spell-lookup-widget .detail-label {
                font-weight: bold;
                display: inline-block;
                min-width: 120px;
                color: var(--text-normal);
            }
            .spell-lookup-widget .spell-text {
                margin-top: 10px;
                padding: 10px;
                background-color: var(--background-primary);
                border-left: 3px solid var(--text-accent);
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-normal);
            }
            .spell-lookup-widget .higher-levels {
                margin-top: 10px;
                padding: 10px;
                background-color: var(--background-primary);
                border-left: 3px solid var(--color-purple);
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-normal);
                font-style: italic;
            }
            .spell-lookup-widget .loading {
                color: var(--text-muted);
                text-align: center;
                padding: 20px;
            }
            .spell-lookup-widget .error {
                color: var(--text-error);
                padding: 10px;
                background-color: var(--background-modifier-error);
                border-radius: 4px;
            }
            .spell-lookup-widget .expand-icon {
                display: inline-block;
                transition: transform 0.2s;
                margin-right: 5px;
            }
            .spell-lookup-widget .expand-icon.expanded {
                transform: rotate(90deg);
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.id = 'spell-lookup-styles';
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
        const spells = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length === headers.length) {
                    const spell = {};
                    headers.forEach((header, index) => {
                        spell[header] = values[index];
                    });
                    spells.push(spell);
                }
            }
        }
        return spells;
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
            const csvPath = 'Assets/Spells.csv';
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
            console.error('Error loading Spells.csv:', error);
            
            // Reject any waiting callbacks
            this.loadCallbacks.forEach(cb => cb.reject(error));
            this.loadCallbacks = [];
            
            throw error;
        }
    }

    // Find spells by exact names
    findSpells(allSpells, spellNames) {
        const found = [];
        spellNames.forEach(searchName => {
            const normalizedSearch = searchName.toLowerCase().trim();
            // Exact match only
            const match = allSpells.find(spell => 
                spell.Name && spell.Name.toLowerCase().trim() === normalizedSearch
            );
            if (match && !found.find(f => f.Name === match.Name)) {
                found.push(match);
            }
        });
        return found;
    }

    // Create HTML for spells
    createSpellsHTML(spells) {
        if (spells.length === 0) {
            return '<div class="error">No spells found. Check spell names.</div>';
        }

        return spells.map((spell, index) => {
            const levelClass = `level-${(spell.Level || 'cantrip').toLowerCase().replace(/\s+/g, '-')}`;
            
            return `
                <details class="spell-card">
                    <summary class="spell-name">
                        ${spell.Name}
                        <span class="spell-level ${levelClass}">${spell.Level || 'Cantrip'}</span>
                        ${spell.School ? `<span class="school-badge">${spell.School}</span>` : ''}
                    </summary>
                    <div class="spell-details">
                        <div class="spell-meta">
                            ${spell['Casting Time'] ? `${spell['Casting Time']}` : ''} • 
                            ${spell.Range ? `${spell.Range}` : ''} • 
                            ${spell.Duration ? `${spell.Duration}` : ''}
                        </div>
                        ${spell.Components ? `<div class="detail-row"><span class="detail-label">Components:</span> ${spell.Components}</div>` : ''}
                        ${spell.Classes ? `<div class="detail-row"><span class="detail-label">Classes:</span> ${spell.Classes}</div>` : ''}
                        ${spell.Source ? `<div class="detail-row"><span class="detail-label">Source:</span> ${spell.Source} (pg. ${spell.Page || 'N/A'})</div>` : ''}
                        ${spell.Subclasses ? `<div class="detail-row"><span class="detail-label">Subclasses:</span> ${spell.Subclasses}</div>` : ''}
                        ${spell.Text ? `<div class="spell-text">${spell.Text}</div>` : ''}
                        ${spell['At Higher Levels'] ? `<div class="higher-levels"><strong>At Higher Levels:</strong> ${spell['At Higher Levels']}</div>` : ''}
                    </div>
                </details>
            `;
        }).join('');
    }

    // Main display function for use in dataviewjs
    async display(dv, spellNames) {
        this.injectStyles();

        try {
            const allSpells = await this.loadCSVData(dv);
            const spells = this.findSpells(allSpells, spellNames);
            const html = this.createSpellsHTML(spells);
            
            dv.paragraph(`<div class="spell-lookup-widget">${html}</div>`);
        } catch (error) {
            dv.paragraph(`<div class="spell-lookup-widget"><div class="error">Error loading spells: ${error.message}</div></div>`);
        }
    }

    // Alternative: return HTML string for custom rendering
    async getHTML(dv, spellNames) {
        this.injectStyles();

        try {
            const allSpells = await this.loadCSVData(dv);
            const spells = this.findSpells(allSpells, spellNames);
            return `<div class="spell-lookup-widget">${this.createSpellsHTML(spells)}</div>`;
        } catch (error) {
            return `<div class="spell-lookup-widget"><div class="error">Error loading spells: ${error.message}</div></div>`;
        }
    }

    // Get raw spell data
    async getSpells(dv, spellNames) {
        const allSpells = await this.loadCSVData(dv);
        return this.findSpells(allSpells, spellNames);
    }
}
