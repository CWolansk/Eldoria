// D&D Race Lookup Widget for Obsidian CustomJS
// Usage in markdown dataviewjs block:
//   ```dataviewjs
//   const {RaceLookup} = await cJS()
//   await RaceLookup.display(dv, ['Human', 'Elf', 'Dwarf'])
//   ```

class RaceLookup {
    constructor() {
        this.jsonData = null;
        this.isLoading = false;
        this.loadCallbacks = [];
        this.stylesInjected = false;
    }

    // Inject CSS styles into the document
    injectStyles() {
        if (this.stylesInjected) return;
        
        const styles = `
            .race-lookup-widget {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .race-lookup-widget .race-card {
                border: 1px solid var(--background-modifier-border);
                margin: 10px 0;
                padding: 15px;
                border-radius: 4px;
                background-color: var(--background-secondary);
            }
            .race-lookup-widget .race-name {
                font-weight: bold;
                font-size: 16px;
                color: var(--text-normal);
                cursor: pointer;
                user-select: none;
                list-style: none;
            }
            
            /* Hide default disclosure markers */
            .race-lookup-widget .race-name::-webkit-details-marker {
                display: none;
            }
            .race-lookup-widget .race-name::marker {
                content: '';
            }
            
            .race-lookup-widget .race-name:hover {
                color: var(--text-accent);
            }
            .race-lookup-widget .race-meta {
                color: var(--text-muted);
                font-size: 14px;
                margin-top: 5px;
            }
            .race-lookup-widget .source-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 11px;
                background-color: var(--background-modifier-border);
                color: var(--text-normal);
                margin-left: 5px;
            }
            .race-lookup-widget .race-details {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .race-lookup-widget .detail-row {
                margin: 5px 0;
                font-size: 14px;
                color: var(--text-normal);
            }
            .race-lookup-widget .detail-label {
                font-weight: bold;
                display: inline-block;
                min-width: 120px;
                color: var(--text-normal);
            }
            .race-lookup-widget .race-link {
                margin-top: 10px;
                padding: 10px;
                background-color: var(--background-primary);
                border-left: 3px solid var(--text-accent);
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-accent);
            }
            .race-lookup-widget .race-link a {
                color: var(--text-accent);
                text-decoration: none;
            }
            .race-lookup-widget .race-link a:hover {
                text-decoration: underline;
            }
            .race-lookup-widget .loading {
                color: var(--text-muted);
                text-align: center;
                padding: 20px;
            }
            .race-lookup-widget .error {
                color: var(--text-error);
                padding: 10px;
                background-color: var(--background-modifier-error);
                border-radius: 4px;
            }
            .race-lookup-widget .expand-icon {
                display: inline-block;
                transition: transform 0.2s;
                margin-right: 5px;
            }
            .race-lookup-widget .expand-icon.expanded {
                transform: rotate(90deg);
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.id = 'race-lookup-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        this.stylesInjected = true;
    }

    // Decode URL-encoded hash
    decodeHash(hash) {
        return decodeURIComponent(hash.replace(/%20/g, ' '));
    }

    // Extract race name from hash
    extractName(hash) {
        // Hash format is "name_source", decode and split
        const decoded = this.decodeHash(hash);
        const parts = decoded.split('_');
        // Return everything except the last part (which is the source)
        return parts.slice(0, -1).join('_');
    }

    // Extract source from hash
    extractSource(hash) {
        const decoded = this.decodeHash(hash);
        const parts = decoded.split('_');
        return parts[parts.length - 1].toUpperCase();
    }

    // Load JSON data
    async loadJSONData(dv) {
        if (this.jsonData) {
            return this.jsonData;
        }

        if (this.isLoading) {
            return new Promise((resolve, reject) => {
                this.loadCallbacks.push({ resolve, reject });
            });
        }

        this.isLoading = true;

        try {
            const jsonPath = 'Assets/races-sublist.json';
            const data = await dv.io.load(jsonPath);
            this.jsonData = JSON.parse(data);
            this.isLoading = false;
            
            this.loadCallbacks.forEach(cb => cb.resolve(this.jsonData));
            this.loadCallbacks = [];
            
            return this.jsonData;
        } catch (error) {
            this.isLoading = false;
            console.error('Error loading races-sublist.json:', error);
            
            this.loadCallbacks.forEach(cb => cb.reject(error));
            this.loadCallbacks = [];
            
            throw error;
        }
    }

    // Find races by names
    findRaces(data, raceNames) {
        const found = [];
        raceNames.forEach(searchName => {
            const normalizedSearch = searchName.toLowerCase().trim();
            
            const match = data.items.find(item => {
                const name = this.extractName(item.h);
                return name.toLowerCase().trim() === normalizedSearch;
            });
            
            if (match) {
                const name = this.extractName(match.h);
                if (!found.find(f => f.name === name)) {
                    found.push({
                        name: name,
                        source: this.extractSource(match.h),
                        hash: match.h
                    });
                }
            }
        });
        return found;
    }

    // Create HTML for races
    createRacesHTML(races) {
        if (races.length === 0) {
            return '<div class="error">No races found. Check race names.</div>';
        }

        return races.map((race, index) => {
            // Format name with proper capitalization
            const displayName = race.name
                .split(/\s+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // Create 5etools link
            const toolsLink = `https://5e.tools/races.html#${race.hash}`;
            
            return `
                <details class="race-card" ${index === 0 ? 'open' : ''}>
                    <summary class="race-name">
                        <span class="expand-icon">▶</span>
                        ${displayName}
                        <span class="source-badge">${race.source}</span>
                    </summary>
                    <div class="race-details">
                        <div class="detail-row">
                            <span class="detail-label">Source:</span> ${race.source}
                        </div>
                        <div class="race-link">
                            <a href="${toolsLink}" target="_blank">View on 5etools →</a>
                        </div>
                    </div>
                </details>
            `;
        }).join('');
    }

    // Main display function for use in dataviewjs
    async display(dv, raceNames) {
        this.injectStyles();

        try {
            const data = await this.loadJSONData(dv);
            const races = this.findRaces(data, raceNames);
            const html = this.createRacesHTML(races);
            
            dv.paragraph(`<div class="race-lookup-widget">${html}</div>`);
        } catch (error) {
            dv.paragraph(`<div class="race-lookup-widget"><div class="error">Error loading races: ${error.message}</div></div>`);
        }
    }

    // Alternative: return HTML string for custom rendering
    async getHTML(dv, raceNames) {
        this.injectStyles();

        try {
            const data = await this.loadJSONData(dv);
            const races = this.findRaces(data, raceNames);
            return `<div class="race-lookup-widget">${this.createRacesHTML(races)}</div>`;
        } catch (error) {
            return `<div class="race-lookup-widget"><div class="error">Error loading races: ${error.message}</div></div>`;
        }
    }

    // Get raw race data
    async getRaces(dv, raceNames) {
        const data = await this.loadJSONData(dv);
        return this.findRaces(data, raceNames);
    }
}
