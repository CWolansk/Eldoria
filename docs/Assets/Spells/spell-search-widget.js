// D&D Spell Search Widget for Obsidian CustomJS
// Provides a search bar interface with fuzzy search for the Spell Lookup system
// Usage in markdown dataviewjs block:
//   ```dataviewjs
//   const {SpellSearchWidget} = await cJS()
//   await SpellSearchWidget.display(dv)
//   ```

class SpellSearchWidget {
    constructor() {
        this.csvData = null;
        this.isLoading = false;
        this.loadCallbacks = [];
        this.stylesInjected = false;
        this.spellLookupStylesInjected = false;
    }

    // Inject CSS styles for the search widget
    async injectStyles(dv) {
        if (this.stylesInjected) return;
        
        const styles = `
            .spell-search-widget {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .spell-search-container {
                margin-bottom: 20px;
            }
            .spell-search-input-wrapper {
                position: relative;
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .spell-search-input {
                flex: 1;
                padding: 10px 40px 10px 15px;
                font-size: 14px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background-color: var(--background-primary);
                color: var(--text-normal);
                outline: none;
                transition: border-color 0.2s;
            }
            .spell-search-input:focus {
                border-color: var(--interactive-accent);
            }
            .spell-search-input::placeholder {
                color: var(--text-muted);
            }
            .spell-search-clear {
                position: absolute;
                right: 130px;
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                font-size: 18px;
                padding: 5px 10px;
                display: none;
            }
            .spell-search-clear:hover {
                color: var(--text-normal);
            }
            .spell-search-clear.visible {
                display: block;
            }
            .spell-search-button {
                padding: 10px 20px;
                font-size: 14px;
                border: 1px solid var(--interactive-accent);
                border-radius: 4px;
                background-color: var(--interactive-accent);
                color: var(--text-on-accent);
                cursor: pointer;
                transition: opacity 0.2s;
                white-space: nowrap;
            }
            .spell-search-button:hover {
                opacity: 0.8;
            }
            .spell-search-button:active {
                opacity: 0.6;
            }
            .spell-search-info {
                margin-top: 10px;
                font-size: 13px;
                color: var(--text-muted);
            }
            .spell-search-results {
                margin-top: 20px;
            }
            .spell-search-stats {
                padding: 10px 15px;
                margin-bottom: 15px;
                background-color: var(--background-secondary);
                border-left: 3px solid var(--interactive-accent);
                border-radius: 4px;
                font-size: 13px;
                color: var(--text-muted);
            }
            .spell-search-no-results {
                padding: 20px;
                text-align: center;
                color: var(--text-muted);
                background-color: var(--background-secondary);
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
            }
            .spell-search-loading {
                padding: 20px;
                text-align: center;
                color: var(--text-muted);
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'spell-search-widget-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        this.stylesInjected = true;
    }

    // Inject CSS styles for spell cards (from spell-lookup.js logic)
    async injectSpellLookupStyles(dv) {
        if (this.spellLookupStylesInjected) return;
        
        // Load common styles if not already available
        if (typeof window.CommonLookupStyles === 'undefined') {
            try {
                const commonStylesPath = 'Assets/common-lookup-styles.js';
                const commonStylesCode = await dv.io.load(commonStylesPath);
                (0, eval)(commonStylesCode);
            } catch (error) {
                console.error('Failed to load common-lookup-styles.js:', error);
            }
        }
        
        if (typeof window.CommonLookupStyles !== 'undefined') {
            // Inject base styles with spell-specific class mapping
            const baseStyles = window.CommonLookupStyles.getBaseStyles('spell-lookup-widget')
                .replace(/\.card(?![a-z-])/g, '.spell-card')
                .replace(/\.card-name/g, '.spell-name')
                .replace(/\.meta(?![a-z-])/g, '.spell-meta')
                .replace(/\.badge(?![a-z-])/g, '.school-badge')
                .replace(/\.details(?![a-z-])/g, '.spell-details')
                .replace(/\.description(?![a-z-])/g, '.spell-text')
                .replace(/\.text-content/g, '.spell-text');
            
            // Inject spell-specific level styles
            const levelStyles = window.CommonLookupStyles.getSpellLevelStyles('spell-lookup-widget');
            
            window.CommonLookupStyles.injectStyles('spell-lookup-styles', baseStyles + levelStyles);
        }
        
        this.spellLookupStylesInjected = true;
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
            const csvPath = 'Assets/Spells/Spells.csv';
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

    // Create HTML for spells (from spell-lookup.js)
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

    // Fuzzy search algorithm
    fuzzyMatch(searchTerm, spellName) {
        const search = searchTerm.toLowerCase().trim();
        const name = spellName.toLowerCase();
        
        // Exact match gets highest score
        if (name === search) {
            return 1000;
        }
        
        // Starts with search term
        if (name.startsWith(search)) {
            return 500;
        }
        
        // Contains search term
        if (name.includes(search)) {
            return 100;
        }
        
        // Fuzzy matching: check if all characters in search appear in order
        let searchIndex = 0;
        let matchScore = 0;
        let consecutiveMatches = 0;
        
        for (let i = 0; i < name.length && searchIndex < search.length; i++) {
            if (name[i] === search[searchIndex]) {
                searchIndex++;
                consecutiveMatches++;
                matchScore += consecutiveMatches * 2; // Bonus for consecutive matches
            } else {
                consecutiveMatches = 0;
            }
        }
        
        // If all characters were found in order, return score
        if (searchIndex === search.length) {
            return matchScore;
        }
        
        return 0;
    }

    // Search for spells with fuzzy matching
    searchSpells(query, maxResults = 50) {
        if (!this.csvData || !query) {
            return [];
        }
        
        const results = [];
        
        for (const spell of this.csvData) {
            if (!spell.Name) continue;
            
            const score = this.fuzzyMatch(query, spell.Name);
            if (score > 0) {
                results.push({ spell, score });
            }
        }
        
        // Sort by score (highest first), then alphabetically
        results.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.spell.Name.localeCompare(b.spell.Name);
        });
        
        // Return top results
        return results.slice(0, maxResults).map(r => r.spell);
    }

    // Create the search interface HTML
    createSearchHTML(containerId) {
        return `
            <div class="spell-search-widget" id="${containerId}">
                <div class="spell-search-container">
                    <div class="spell-search-input-wrapper">
                        <input 
                            type="text" 
                            class="spell-search-input" 
                            placeholder="Search for spells (e.g., 'fireball', 'cure', 'magic missile')..."
                            id="${containerId}-input"
                        />
                        <button 
                            class="spell-search-clear" 
                            id="${containerId}-clear"
                            title="Clear search"
                        >×</button>
                        <button 
                            class="spell-search-button" 
                            id="${containerId}-button"
                        >Search</button>
                    </div>
                    <div class="spell-search-info">
                        Type to search through ${this.csvData ? this.csvData.length : '...'} spells. Supports fuzzy matching.
                    </div>
                </div>
                <div class="spell-search-results" id="${containerId}-results"></div>
            </div>
        `;
    }

    // Handle search execution
    async executeSearch(dv, containerId, query) {
        const resultsContainer = document.getElementById(`${containerId}-results`);
        
        if (!query || query.trim().length === 0) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        // Show loading
        resultsContainer.innerHTML = '<div class="spell-search-loading">Searching...</div>';
        
        // Perform search
        const results = this.searchSpells(query);
        
        // Display results
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="spell-search-no-results">
                    No spells found for "${query}". Try a different search term.
                </div>
            `;
            return;
        }
        
        // Show results count
        const statsHTML = `
            <div class="spell-search-stats">
                Found ${results.length} spell${results.length === 1 ? '' : 's'} matching "${query}"
            </div>
        `;
        
        // Use SpellLookup rendering to display the spells
        const spellsHTML = this.createSpellsHTML(results);
        
        resultsContainer.innerHTML = statsHTML + spellsHTML;
    }

    // Setup event listeners
    setupEventListeners(dv, containerId) {
        const input = document.getElementById(`${containerId}-input`);
        const button = document.getElementById(`${containerId}-button`);
        const clear = document.getElementById(`${containerId}-clear`);
        
        // Check if elements exist before adding listeners
        if (!input || !button || !clear) {
            console.warn(`Search widget elements not found for container: ${containerId}`);
            return;
        }
        
        // Search on button click
        button.addEventListener('click', () => {
            this.executeSearch(dv, containerId, input.value);
        });
        
        // Search on Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeSearch(dv, containerId, input.value);
            }
        });
        
        // Show/hide clear button
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                clear.classList.add('visible');
            } else {
                clear.classList.remove('visible');
            }
        });
        
        // Clear button functionality
        clear.addEventListener('click', () => {
            input.value = '';
            clear.classList.remove('visible');
            document.getElementById(`${containerId}-results`).innerHTML = '';
            input.focus();
        });
        
        // Focus input on load
        setTimeout(() => input.focus(), 100);
    }

    // Main display function for use in dataviewjs
    async display(dv, options = {}) {
        const {
            containerId = `spell-search-${Date.now()}`,
            autoFocus = true
        } = options;
        
        await this.injectStyles(dv);
        await this.injectSpellLookupStyles(dv);
        await this.loadCSVData(dv);
        
        const html = this.createSearchHTML(containerId);
        
        // Create a container div and inject the HTML
        const container = dv.el('div', '', { cls: 'spell-search-widget-container' });
        container.innerHTML = html;
        
        // Setup event listeners after DOM is ready
        setTimeout(() => {
            this.setupEventListeners(dv, containerId);
        }, 0);
    }

    // Display with initial search
    async displayWithSearch(dv, initialQuery, options = {}) {
        await this.display(dv, options);
        
        // Execute initial search after a short delay
        const containerId = options.containerId || `spell-search-${Date.now()}`;
        setTimeout(() => {
            const input = document.getElementById(`${containerId}-input`);
            if (input) {
                input.value = initialQuery;
                this.executeSearch(dv, containerId, initialQuery);
            }
        }, 100);
    }
}
