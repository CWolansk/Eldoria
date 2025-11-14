// D&D Feat Lookup Widget for Obsidian CustomJS
// Usage in markdown dataviewjs block:
//   ```dataviewjs
//   const {FeatLookup} = await cJS()
//   await FeatLookup.display(dv, ['Alert', 'Lucky', 'War Caster'])
//   ```

class FeatLookup {
    constructor() {
        this.csvData = null;
        this.isLoading = false;
        this.loadCallbacks = [];
        this.stylesInjected = false;
    }

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
        
        // Inject base styles with feat-specific class mapping
        const baseStyles = window.CommonLookupStyles.getBaseStyles('feat-lookup-widget')
            .replace(/\.card(?![a-z-])/g, '.feat-card')
            .replace(/\.card-name/g, '.feat-name')
            .replace(/\.meta(?![a-z-])/g, '.feat-meta')
            .replace(/\.badge(?![a-z-])/g, '.source-badge')
            .replace(/\.details(?![a-z-])/g, '.feat-details')
            .replace(/\.description(?![a-z-])/g, '.feat-description')
            .replace(/\.text-content/g, '.feat-description');
        
        window.CommonLookupStyles.injectStyles('feat-lookup-styles', baseStyles);
        this.stylesInjected = true;
    }

    injectFallbackStyles() {
        const styles = `
            .feat-lookup-widget {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .feat-lookup-widget .feat-card {
                border: 1px solid var(--background-modifier-border);
                margin: 10px 0;
                padding: 15px;
                border-radius: 4px;
                background-color: var(--background-secondary);
            }
            .feat-lookup-widget .feat-name {
                font-weight: bold;
                font-size: 16px;
                color: var(--text-normal);
                cursor: pointer;
                user-select: none;
                list-style: none;
            }
            .feat-lookup-widget .feat-name::-webkit-details-marker {
                display: none;
            }
            .feat-lookup-widget .feat-name::marker {
                content: '';
            }
            .feat-lookup-widget .feat-name:hover {
                color: var(--text-accent);
            }
            .feat-lookup-widget .feat-meta {
                color: var(--text-muted);
                font-size: 14px;
                margin-top: 5px;
            }
            .feat-lookup-widget .source-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 11px;
                background-color: var(--background-modifier-border);
                color: var(--text-normal);
                margin-left: 5px;
            }
            .feat-lookup-widget .feat-details {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .feat-lookup-widget .detail-row {
                margin: 8px 0;
                font-size: 14px;
                color: var(--text-normal);
                line-height: 1.5;
            }
            .feat-lookup-widget .detail-label {
                font-weight: bold;
                display: inline-block;
                min-width: 120px;
                color: var(--text-normal);
            }
            .feat-lookup-widget .feat-description {
                margin: 0 0 12px 0;
                padding: 12px;
                background-color: var(--background-primary);
                border-radius: 4px;
                line-height: 1.7;
                white-space: pre-wrap;
                font-size: 14px;
                border-left: 3px solid var(--interactive-accent);
                color: var(--text-normal);
            }
            .feat-lookup-widget .feat-description em {
                color: var(--text-muted);
                font-style: italic;
            }
            .feat-lookup-widget .loading {
                color: var(--text-muted);
                text-align: center;
                padding: 20px;
            }
            .feat-lookup-widget .error {
                color: var(--text-error);
                padding: 10px;
                background-color: var(--background-modifier-error);
                border-radius: 4px;
            }
            .feat-lookup-widget .expand-icon {
                display: inline-block;
                transition: transform 0.2s;
                margin-right: 5px;
            }
            .feat-lookup-widget .expand-icon.expanded {
                transform: rotate(90deg);
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'feat-lookup-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        this.stylesInjected = true;
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
                    // Escaped quote within quotes
                    currentField += '"';
                    i++; // Skip next quote
                } else if (char === '"') {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    // End of field
                    currentRow.push(currentField);
                    currentField = '';
                } else {
                    // Regular character
                    currentField += char;
                }
            }
            
            // End of line
            if (!inQuotes) {
                // Line complete, push field and row
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
                // Field continues on next line
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
            const csvPath = 'Assets/Feats/Feats.csv';
            const csvText = await dv.io.load(csvPath);
            
            // Parse CSV handling multi-line fields
            this.csvData = this.parseCSV(csvText);
            this.isLoading = false;
            
            this.loadCallbacks.forEach(cb => cb.resolve(this.csvData));
            this.loadCallbacks = [];
            
            return this.csvData;
        } catch (error) {
            this.isLoading = false;
            console.error('Error loading Feats.csv:', error);
            
            this.loadCallbacks.forEach(cb => cb.reject(error));
            this.loadCallbacks = [];
            
            throw error;
        }
    }

    // Find feats by names
    findFeats(feats, featNames) {
        const found = [];
        featNames.forEach(searchName => {
            const normalizedSearch = searchName.toLowerCase().trim();
            
            const match = feats.find(feat => 
                feat.Name.toLowerCase().trim() === normalizedSearch
            );
            
            if (match && !found.find(f => f.Name === match.Name)) {
                found.push(match);
            }
        });
        return found;
    }

    // Create HTML for feats
    createFeatsHTML(feats) {
        if (feats.length === 0) {
            return '<div class="error">No feats found. Check feat names.</div>';
        }

        return feats.map((feat, index) => {
            const displayName = feat.Name;
            const source = feat.Source;
            const page = feat.Page ? ` (p. ${feat.Page})` : '';
            const prerequisites = feat.Prerequisites || '';
            const abilityScores = feat['Ability Scores'] || '';
            const repeatable = feat.Repeatable || 'No';
            const description = feat.Description || 'No description available';
            
            // Build details HTML - always show description prominently
            let detailsHTML = '';
            
            // Show description first and prominently if available
            if (description && description !== 'Data not found in feats.json' && description !== 'No description available' && description !== 'See 5etools link for full description') {
                detailsHTML += `<div class="feat-description">${description}</div>`;
            } else if (description === 'Data not found in feats.json' || description === 'See 5etools link for full description') {
                detailsHTML += `<div class="feat-description"><em>Full description not available in database.</em></div>`;
            }
            
            // Then show metadata
            if (prerequisites && prerequisites !== 'None' && prerequisites !== '') {
                detailsHTML += `
                    <div class="detail-row">
                        <span class="detail-label">Prerequisites:</span> ${prerequisites}
                    </div>`;
            }
            
            if (abilityScores && abilityScores !== 'None' && abilityScores !== '') {
                detailsHTML += `
                    <div class="detail-row">
                        <span class="detail-label">Ability Scores:</span> ${abilityScores}
                    </div>`;
            }
            
            if (repeatable === 'Yes') {
                detailsHTML += `
                    <div class="detail-row">
                        <span class="detail-label">Repeatable:</span> Yes
                    </div>`;
            }
            
            detailsHTML += `
                <div class="detail-row">
                    <span class="detail-label">Source:</span> ${source}${page}
                </div>`;
            
            return `
                <details class="feat-card">
                    <summary class="feat-name">
                        <span class="expand-icon">▶</span>
                        ${displayName}
                        <span class="source-badge">${source}</span>
                    </summary>
                    <div class="feat-details">
                        ${detailsHTML}
                    </div>
                </details>
            `;
        }).join('');
    }

    // Main display function for use in dataviewjs
    async display(dv, featNames) {
        await this.injectStyles(dv);

        try {
            const feats = await this.loadCSVData(dv);
            const found = this.findFeats(feats, featNames);
            const html = this.createFeatsHTML(found);
            
            dv.paragraph(`<div class="feat-lookup-widget">${html}</div>`);
        } catch (error) {
            dv.paragraph(`<div class="feat-lookup-widget"><div class="error">Error loading feats: ${error.message}</div></div>`);
        }
    }

    // Alternative: return HTML string for custom rendering
    async getHTML(dv, featNames) {
        await this.injectStyles(dv);

        try {
            const feats = await this.loadCSVData(dv);
            const found = this.findFeats(feats, featNames);
            return `<div class="feat-lookup-widget">${this.createFeatsHTML(found)}</div>`;
        } catch (error) {
            return `<div class="feat-lookup-widget"><div class="error">Error loading feats: ${error.message}</div></div>`;
        }
    }

    // Get raw feat data
    async getFeats(dv, featNames) {
        const feats = await this.loadCSVData(dv);
        return this.findFeats(feats, featNames);
    }
}
