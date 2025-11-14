// D&D Background Search Widget for Obsidian CustomJS
// Provides a search bar interface with fuzzy search for the Background Lookup system
// Usage in markdown dataviewjs block:
//   ```dataviewjs
//   const {BackgroundSearchWidget} = await cJS()
//   await BackgroundSearchWidget.display(dv)
//   ```

class BackgroundSearchWidget {
    constructor() {
        this.csvData = null;
        this.isLoading = false;
        this.loadCallbacks = [];
        this.stylesInjected = false;
        this.backgroundLookupStylesInjected = false;
    }

    // Inject CSS styles for the search widget
    async injectStyles(dv) {
        if (this.stylesInjected) return;
        
        const styles = `
            .background-search-widget {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .background-search-container {
                margin-bottom: 20px;
            }
            .background-search-input-wrapper {
                position: relative;
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .background-search-input {
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
            .background-search-input:focus {
                border-color: var(--interactive-accent);
            }
            .background-search-input::placeholder {
                color: var(--text-muted);
            }
            .background-search-clear {
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
            .background-search-clear:hover {
                color: var(--text-normal);
            }
            .background-search-clear.visible {
                display: block;
            }
            .background-search-button {
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
            .background-search-button:hover {
                opacity: 0.8;
            }
            .background-search-button:active {
                opacity: 0.6;
            }
            .background-search-info {
                margin-top: 10px;
                font-size: 13px;
                color: var(--text-muted);
            }
            .background-search-results {
                margin-top: 20px;
            }
            .background-search-stats {
                padding: 10px 15px;
                margin-bottom: 15px;
                background-color: var(--background-secondary);
                border-left: 3px solid var(--interactive-accent);
                border-radius: 4px;
                font-size: 13px;
                color: var(--text-muted);
            }
            .background-search-no-results {
                padding: 20px;
                text-align: center;
                color: var(--text-muted);
                background-color: var(--background-secondary);
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
            }
            .background-search-loading {
                padding: 20px;
                text-align: center;
                color: var(--text-muted);
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'background-search-widget-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        this.stylesInjected = true;
    }

    // Inject CSS styles for background cards (from background-lookup.js logic)
    async injectBackgroundLookupStyles(dv) {
        if (this.backgroundLookupStylesInjected) return;
        
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
            // Inject base styles with background-specific class mapping
            const baseStyles = window.CommonLookupStyles.getBaseStyles('background-lookup-widget')
                .replace(/\.card(?![a-z-])/g, '.background-card')
                .replace(/\.card-name/g, '.background-name')
                .replace(/\.meta(?![a-z-])/g, '.background-meta')
                .replace(/\.badge(?![a-z-])/g, '.source-badge')
                .replace(/\.details(?![a-z-])/g, '.background-details')
                .replace(/\.description(?![a-z-])/g, '.background-description')
                .replace(/\.text-content/g, '.background-link');
            
            window.CommonLookupStyles.injectStyles('background-lookup-styles', baseStyles);
        }
        
        this.backgroundLookupStylesInjected = true;
    }

    // Parse CSV data properly handling multi-line fields
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const result = [];
        const headers = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        let isFirstRow = true;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];
                
                if (char === '"' && inQuotes && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    currentRow.push(currentField);
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            
            if (!inQuotes) {
                currentRow.push(currentField);
                currentField = '';
                
                if (isFirstRow) {
                    headers.push(...currentRow);
                    isFirstRow = false;
                } else if (currentRow.length > 0 && currentRow.some(f => f.trim())) {
                    const rowObj = {};
                    headers.forEach((header, index) => {
                        rowObj[header.trim()] = currentRow[index] || '';
                    });
                    result.push(rowObj);
                }
                currentRow = [];
            } else {
                currentField += '\n';
            }
        }
        
        return result;
    }

    // Load CSV data
    async loadCSVData(dv) {
        if (this.csvData) {
            return this.csvData;
        }

        if (this.isLoading) {
            return new Promise((resolve, reject) => {
                this.loadCallbacks.push({ resolve, reject });
            });
        }

        this.isLoading = true;

        try {
            const csvPath = 'Assets/Backgrounds/Backgrounds.csv';
            const csvText = await dv.io.load(csvPath);
            
            this.csvData = this.parseCSV(csvText);
            this.isLoading = false;
            
            this.loadCallbacks.forEach(cb => cb.resolve(this.csvData));
            this.loadCallbacks = [];
            
            return this.csvData;
        } catch (error) {
            this.isLoading = false;
            console.error('Error loading Backgrounds.csv:', error);
            
            this.loadCallbacks.forEach(cb => cb.reject(error));
            this.loadCallbacks = [];
            
            throw error;
        }
    }

    // Create HTML for backgrounds (from background-lookup.js)
    createBackgroundsHTML(backgrounds) {
        if (backgrounds.length === 0) {
            return '<div class="error">No backgrounds found. Check background names.</div>';
        }

        return backgrounds.map((background, index) => {
            const displayName = background.Name;
            const source = background.Source || 'Unknown';
            const page = background.Page ? ` (p. ${background.Page})` : '';
            const description = background.Description || 'No description available';
            
            let detailsHTML = '';
            
            if (description && description !== 'No description available') {
                detailsHTML += `<div class="background-description">${description}</div>`;
            } else {
                detailsHTML += `<div class="background-description"><em>No description available.</em></div>`;
            }
            
            detailsHTML += `
                <div class="detail-row">
                    <span class="detail-label">Source:</span> ${source}${page}
                </div>`;
            
            return `
                <details class="background-card">
                    <summary class="background-name">
                        <span class="expand-icon">▶</span>
                        ${displayName}
                        <span class="source-badge">${source}</span>
                    </summary>
                    <div class="background-details">
                        ${detailsHTML}
                    </div>
                </details>
            `;
        }).join('');
    }

    // Fuzzy search algorithm
    fuzzyMatch(searchTerm, backgroundName) {
        const search = searchTerm.toLowerCase().trim();
        const name = backgroundName.toLowerCase();
        
        if (name === search) {
            return 1000;
        }
        
        if (name.startsWith(search)) {
            return 500;
        }
        
        if (name.includes(search)) {
            return 100;
        }
        
        let searchIndex = 0;
        let matchScore = 0;
        let consecutiveMatches = 0;
        
        for (let i = 0; i < name.length && searchIndex < search.length; i++) {
            if (name[i] === search[searchIndex]) {
                searchIndex++;
                consecutiveMatches++;
                matchScore += consecutiveMatches * 2;
            } else {
                consecutiveMatches = 0;
            }
        }
        
        if (searchIndex === search.length) {
            return matchScore;
        }
        
        return 0;
    }

    // Search for backgrounds with fuzzy matching
    searchBackgrounds(query, maxResults = 50) {
        if (!this.csvData || !query) {
            return [];
        }
        
        const results = [];
        
        for (const background of this.csvData) {
            if (!background.Name) continue;
            
            const score = this.fuzzyMatch(query, background.Name);
            if (score > 0) {
                results.push({ background, score });
            }
        }
        
        results.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.background.Name.localeCompare(b.background.Name);
        });
        
        return results.slice(0, maxResults).map(r => r.background);
    }

    // Create the search interface HTML
    createSearchHTML(containerId) {
        return `
            <div class="background-search-widget" id="${containerId}">
                <div class="background-search-container">
                    <div class="background-search-input-wrapper">
                        <input 
                            type="text" 
                            class="background-search-input" 
                            placeholder="Search for backgrounds (e.g., 'acolyte', 'sage', 'soldier')..."
                            id="${containerId}-input"
                        />
                        <button 
                            class="background-search-clear" 
                            id="${containerId}-clear"
                            title="Clear search"
                        >×</button>
                        <button 
                            class="background-search-button" 
                            id="${containerId}-button"
                        >Search</button>
                    </div>
                    <div class="background-search-info">
                        Type to search through ${this.csvData ? this.csvData.length : '...'} backgrounds. Supports fuzzy matching.
                    </div>
                </div>
                <div class="background-search-results" id="${containerId}-results"></div>
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
        
        resultsContainer.innerHTML = '<div class="background-search-loading">Searching...</div>';
        
        const results = this.searchBackgrounds(query);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="background-search-no-results">
                    No backgrounds found for "${query}". Try a different search term.
                </div>
            `;
            return;
        }
        
        const statsHTML = `
            <div class="background-search-stats">
                Found ${results.length} background${results.length === 1 ? '' : 's'} matching "${query}"
            </div>
        `;
        
        const backgroundsHTML = this.createBackgroundsHTML(results);
        
        resultsContainer.innerHTML = statsHTML + backgroundsHTML;
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
        
        button.addEventListener('click', () => {
            this.executeSearch(dv, containerId, input.value);
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeSearch(dv, containerId, input.value);
            }
        });
        
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                clear.classList.add('visible');
            } else {
                clear.classList.remove('visible');
            }
        });
        
        clear.addEventListener('click', () => {
            input.value = '';
            clear.classList.remove('visible');
            document.getElementById(`${containerId}-results`).innerHTML = '';
            input.focus();
        });
        
        setTimeout(() => input.focus(), 100);
    }

    // Main display function for use in dataviewjs
    async display(dv, options = {}) {
        const {
            containerId = `background-search-${Date.now()}`,
            autoFocus = true
        } = options;
        
        await this.injectStyles(dv);
        await this.injectBackgroundLookupStyles(dv);
        await this.loadCSVData(dv);
        
        const html = this.createSearchHTML(containerId);
        
        const container = dv.el('div', '', { cls: 'background-search-widget-container' });
        container.innerHTML = html;
        
        setTimeout(() => {
            this.setupEventListeners(dv, containerId);
        }, 0);
    }

    // Display with initial search
    async displayWithSearch(dv, initialQuery, options = {}) {
        await this.display(dv, options);
        
        const containerId = options.containerId || `background-search-${Date.now()}`;
        setTimeout(() => {
            const input = document.getElementById(`${containerId}-input`);
            if (input) {
                input.value = initialQuery;
                this.executeSearch(dv, containerId, initialQuery);
            }
        }, 100);
    }
}
