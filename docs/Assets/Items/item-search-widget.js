// D&D Item Search Widget for Obsidian CustomJS
// Provides a search bar interface with fuzzy search for the Item Lookup system
// Usage in markdown dataviewjs block:
//   ```dataviewjs
//   const {ItemSearchWidget} = await cJS()
//   await ItemSearchWidget.display(dv)
//   ```

class ItemSearchWidget {
    constructor() {
        this.csvData = null;
        this.isLoading = false;
        this.loadCallbacks = [];
        this.stylesInjected = false;
        this.itemLookupStylesInjected = false;
    }

    // Inject CSS styles for the search widget
    async injectStyles(dv) {
        if (this.stylesInjected) return;
        
        const styles = `
            .item-search-widget {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .item-search-container {
                margin-bottom: 20px;
            }
            .item-search-input-wrapper {
                position: relative;
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .item-search-input {
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
            .item-search-input:focus {
                border-color: var(--interactive-accent);
            }
            .item-search-input::placeholder {
                color: var(--text-muted);
            }
            .item-search-clear {
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
            .item-search-clear:hover {
                color: var(--text-normal);
            }
            .item-search-clear.visible {
                display: block;
            }
            .item-search-button {
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
            .item-search-button:hover {
                opacity: 0.8;
            }
            .item-search-button:active {
                opacity: 0.6;
            }
            .item-search-filters {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 8px;
                margin-top: 8px;
            }
            .item-search-filter,
            .item-search-reset {
                min-width: 0;
                padding: 7px 10px;
                font-size: 13px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background-color: var(--background-primary);
                color: var(--text-normal);
            }
            .item-search-filter {
                cursor: pointer;
            }
            .item-search-filter:focus,
            .item-search-reset:focus {
                border-color: var(--interactive-accent);
                outline: none;
            }
            .item-search-reset {
                cursor: pointer;
                white-space: nowrap;
            }
            .item-search-reset:hover {
                color: var(--text-accent);
                border-color: var(--interactive-accent);
            }
            .item-search-info {
                margin-top: 10px;
                font-size: 13px;
                color: var(--text-muted);
            }
            .item-search-results {
                margin-top: 20px;
            }
            .item-search-stats {
                padding: 10px 15px;
                margin-bottom: 15px;
                background-color: var(--background-secondary);
                border-left: 3px solid var(--interactive-accent);
                border-radius: 4px;
                font-size: 13px;
                color: var(--text-muted);
            }
            .item-search-no-results {
                padding: 20px;
                text-align: center;
                color: var(--text-muted);
                background-color: var(--background-secondary);
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
            }
            .item-search-loading {
                padding: 20px;
                text-align: center;
                color: var(--text-muted);
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'item-search-widget-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        this.stylesInjected = true;
    }

    // Inject CSS styles for item cards (from item-lookup.js logic)
    async injectItemLookupStyles(dv) {
        if (this.itemLookupStylesInjected) return;
        
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
        }
        
        this.itemLookupStylesInjected = true;
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

    escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    titleCase(value) {
        return (value || '').replace(/\b\w/g, char => char.toUpperCase());
    }

    getItemRarities() {
        const availableRarities = new Set(this.csvData.map(item => item.Rarity).filter(Boolean));
        const rarityOrder = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact', 'none'];
        const orderedRarities = rarityOrder.filter(rarity => availableRarities.has(rarity));
        const extraRarities = Array.from(availableRarities)
            .filter(rarity => !rarityOrder.includes(rarity))
            .sort((a, b) => a.localeCompare(b));

        return orderedRarities.concat(extraRarities);
    }

    getItemCategories() {
        const categories = new Set();
        this.csvData.forEach(item => {
            this.getItemCategoriesForItem(item).forEach(category => categories.add(category));
        });

        const categoryOrder = [
            'Weapon',
            'Armor',
            'Shield',
            'Ammunition',
            'Wondrous Item',
            'Potion',
            'Ring',
            'Rod',
            'Scroll',
            'Staff',
            'Wand',
            'Adventuring Gear',
            'Tool/Instrument',
            'Spellcasting Focus',
            'Trade Good',
            'Generic Variant',
            'Other'
        ];

        return categoryOrder.filter(category => categories.has(category));
    }

    getItemCategoriesForItem(item) {
        const type = (item.Type || '').toLowerCase();
        const categories = [];
        const addCategory = category => {
            if (!categories.includes(category)) {
                categories.push(category);
            }
        };

        if (!type) {
            addCategory('Other');
            return categories;
        }

        if (type.includes('weapon')) addCategory('Weapon');
        if (type.includes('armor')) addCategory('Armor');
        if (type.includes('shield')) addCategory('Shield');
        if (type.includes('ammunition')) addCategory('Ammunition');
        if (type.includes('wondrous item')) addCategory('Wondrous Item');
        if (type.includes('potion')) addCategory('Potion');
        if (type.includes('ring')) addCategory('Ring');
        if (type.includes('rod')) addCategory('Rod');
        if (type.includes('scroll')) addCategory('Scroll');
        if (type.includes('staff')) addCategory('Staff');
        if (type.includes('wand')) addCategory('Wand');
        if (type.includes('adventuring gear')) addCategory('Adventuring Gear');
        if (type.includes('instrument') || type.includes('tool')) addCategory('Tool/Instrument');
        if (type.includes('spellcasting focus')) addCategory('Spellcasting Focus');
        if (type.includes('trade good')) addCategory('Trade Good');
        if (type.includes('generic variant')) addCategory('Generic Variant');

        if (categories.length === 0) {
            addCategory('Other');
        }

        return categories;
    }

    getItemSources() {
        const sources = new Set();
        this.csvData.forEach(item => {
            if (item.Source) {
                sources.add(item.Source);
            }
        });
        return Array.from(sources).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    createSelectOptions(values, labelFormatter = value => value) {
        return values.map(value => {
            const escapedValue = this.escapeHTML(value);
            const escapedLabel = this.escapeHTML(labelFormatter(value));
            return `<option value="${escapedValue}">${escapedLabel}</option>`;
        }).join('');
    }

    getActiveFilters(containerId) {
        const getValue = suffix => {
            const element = document.getElementById(`${containerId}-${suffix}`);
            return element ? element.value : '';
        };

        return {
            rarity: getValue('rarity'),
            category: getValue('category'),
            source: getValue('source')
        };
    }

    hasActiveSearch(query, filters) {
        return Boolean(
            (query && query.trim()) ||
            filters.rarity ||
            filters.category ||
            filters.source
        );
    }

    itemMatchesFilters(item, filters) {
        if (filters.rarity && item.Rarity !== filters.rarity) {
            return false;
        }

        if (filters.category && !this.getItemCategoriesForItem(item).includes(filters.category)) {
            return false;
        }

        if (filters.source && item.Source !== filters.source) {
            return false;
        }

        return true;
    }

    describeSearch(query, filters) {
        const parts = [];
        const trimmedQuery = query ? query.trim() : '';

        if (trimmedQuery) {
            parts.push(`"${trimmedQuery}"`);
        }
        if (filters.rarity) {
            parts.push(this.titleCase(filters.rarity));
        }
        if (filters.category) {
            parts.push(filters.category);
        }
        if (filters.source) {
            parts.push(filters.source);
        }

        return parts.length > 0 ? parts.join(' + ') : 'all items';
    }

    // Create HTML for items (from item-lookup.js)
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

    // Fuzzy search algorithm
    fuzzyMatch(searchTerm, itemName) {
        const search = searchTerm.toLowerCase().trim();
        const name = itemName.toLowerCase();
        
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

    // Search for items with fuzzy matching
    searchItems(query, filters = {}, maxResults = 50) {
        if (!this.csvData || !this.hasActiveSearch(query, filters)) {
            return [];
        }
        
        const results = [];
        const trimmedQuery = query ? query.trim() : '';
        
        for (const item of this.csvData) {
            if (!item.Name) continue;

            if (!this.itemMatchesFilters(item, filters)) {
                continue;
            }
            
            const score = trimmedQuery ? this.fuzzyMatch(trimmedQuery, item.Name) : 1;
            if (score > 0) {
                results.push({ item, score });
            }
        }
        
        // Sort by score (highest first), then alphabetically
        results.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.item.Name.localeCompare(b.item.Name);
        });
        
        // Return top results
        return results.slice(0, maxResults).map(r => r.item);
    }

    // Create the search interface HTML
    createSearchHTML(containerId) {
        const rarityOptions = this.createSelectOptions(this.getItemRarities(), rarity => this.titleCase(rarity));
        const categoryOptions = this.createSelectOptions(this.getItemCategories());
        const sourceOptions = this.createSelectOptions(this.getItemSources());

        return `
            <div class="item-search-widget" id="${containerId}">
                <div class="item-search-container">
                    <div class="item-search-input-wrapper">
                        <input 
                            type="text" 
                            class="item-search-input" 
                            placeholder="Search for items (e.g., 'sword', 'potion', 'bag')..."
                            id="${containerId}-input"
                        />
                        <button 
                            class="item-search-clear" 
                            id="${containerId}-clear"
                            title="Clear search"
                        >×</button>
                        <button 
                            class="item-search-button" 
                            id="${containerId}-button"
                        >Search</button>
                    </div>
                    <div class="item-search-filters" id="${containerId}-filters">
                        <select class="item-search-filter" id="${containerId}-rarity" aria-label="Filter by item rarity">
                            <option value="">Rarity</option>
                            ${rarityOptions}
                        </select>
                        <select class="item-search-filter" id="${containerId}-category" aria-label="Filter by item category">
                            <option value="">Type</option>
                            ${categoryOptions}
                        </select>
                        <select class="item-search-filter" id="${containerId}-source" aria-label="Filter by item source">
                            <option value="">Source</option>
                            ${sourceOptions}
                        </select>
                        <button class="item-search-reset" id="${containerId}-reset" title="Reset search and filters">Reset</button>
                    </div>
                    <div class="item-search-info">
                        Search ${this.csvData ? this.csvData.length : '...'} items by name, rarity, type, and source.
                    </div>
                </div>
                <div class="item-search-results" id="${containerId}-results"></div>
            </div>
        `;
    }

    // Handle search execution
    async executeSearch(dv, containerId, query) {
        const resultsContainer = document.getElementById(`${containerId}-results`);
        const filters = this.getActiveFilters(containerId);
        
        if (!this.hasActiveSearch(query, filters)) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        // Show loading
        resultsContainer.innerHTML = '<div class="item-search-loading">Searching...</div>';
        
        // Perform search
        const results = this.searchItems(query, filters);
        const searchDescription = this.describeSearch(query, filters);
        const escapedDescription = this.escapeHTML(searchDescription);
        
        // Display results
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="item-search-no-results">
                    No items found matching ${escapedDescription}. Try a different search term or filter.
                </div>
            `;
            return;
        }
        
        // Show results count
        const statsHTML = `
            <div class="item-search-stats">
                Showing ${results.length} item${results.length === 1 ? '' : 's'} matching ${escapedDescription}
            </div>
        `;
        
        // Use ItemLookup rendering to display the items
        const itemsHTML = this.createItemsHTML(results);
        
        resultsContainer.innerHTML = statsHTML + itemsHTML;
    }

    updateClearVisibility(containerId) {
        const input = document.getElementById(`${containerId}-input`);
        const clear = document.getElementById(`${containerId}-clear`);
        if (!input || !clear) return;

        const filters = this.getActiveFilters(containerId);
        if (this.hasActiveSearch(input.value, filters)) {
            clear.classList.add('visible');
        } else {
            clear.classList.remove('visible');
        }
    }

    resetSearch(containerId) {
        const input = document.getElementById(`${containerId}-input`);
        const resultsContainer = document.getElementById(`${containerId}-results`);
        const filters = ['rarity', 'category', 'source']
            .map(suffix => document.getElementById(`${containerId}-${suffix}`))
            .filter(Boolean);

        if (input) {
            input.value = '';
        }
        filters.forEach(filter => {
            filter.value = '';
        });
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
        this.updateClearVisibility(containerId);
        if (input) {
            input.focus();
        }
    }

    // Setup event listeners
    setupEventListeners(dv, containerId, autoFocus = true) {
        const input = document.getElementById(`${containerId}-input`);
        const button = document.getElementById(`${containerId}-button`);
        const clear = document.getElementById(`${containerId}-clear`);
        const reset = document.getElementById(`${containerId}-reset`);
        const filters = ['rarity', 'category', 'source']
            .map(suffix => document.getElementById(`${containerId}-${suffix}`))
            .filter(Boolean);
        
        // Check if elements exist before adding listeners
        if (!input || !button || !clear || !reset) {
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
            this.updateClearVisibility(containerId);
        });

        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.updateClearVisibility(containerId);
                this.executeSearch(dv, containerId, input.value);
            });
        });
        
        // Clear button functionality
        clear.addEventListener('click', () => {
            this.resetSearch(containerId);
        });

        reset.addEventListener('click', () => {
            this.resetSearch(containerId);
        });
        
        // Focus input on load
        if (autoFocus) {
            setTimeout(() => input.focus(), 100);
        }
    }

    // Main display function for use in dataviewjs
    async display(dv, options = {}) {
        const {
            containerId = `item-search-${Date.now()}`,
            autoFocus = true
        } = options;
        
        await this.injectStyles(dv);
        await this.injectItemLookupStyles(dv);
        await this.loadCSVData(dv);
        
        const html = this.createSearchHTML(containerId);
        
        // Create a container div and inject the HTML
        const container = dv.el('div', '', { cls: 'item-search-widget-container' });
        container.innerHTML = html;
        
        // Setup event listeners after DOM is ready
        setTimeout(() => {
            this.setupEventListeners(dv, containerId, autoFocus);
        }, 0);
    }

    // Display with initial search
    async displayWithSearch(dv, initialQuery, options = {}) {
        if (!options.containerId) {
            options = { ...options, containerId: `item-search-${Date.now()}` };
        }
        await this.display(dv, options);
        
        // Execute initial search after a short delay
        const containerId = options.containerId;
        setTimeout(() => {
            const input = document.getElementById(`${containerId}-input`);
            if (input) {
                input.value = initialQuery;
                this.updateClearVisibility(containerId);
                this.executeSearch(dv, containerId, initialQuery);
            }
        }, 100);
    }
}
