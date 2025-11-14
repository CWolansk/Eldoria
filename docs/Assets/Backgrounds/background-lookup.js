class BackgroundLookup {
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
        this.stylesInjected = true;
    }

    injectFallbackStyles() {
        const styles = `
            .background-lookup-widget {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .background-lookup-widget .background-card {
                border: 1px solid var(--background-modifier-border);
                margin: 10px 0;
                padding: 15px;
                border-radius: 4px;
                background-color: var(--background-secondary);
            }
            .background-lookup-widget .background-name {
                font-weight: bold;
                font-size: 16px;
                color: var(--text-normal);
                cursor: pointer;
                user-select: none;
                list-style: none;
            }
            .background-lookup-widget .background-name::-webkit-details-marker {
                display: none;
            }
            .background-lookup-widget .background-name::marker {
                content: '';
            }
            .background-lookup-widget .background-name:hover {
                color: var(--text-accent);
            }
            .background-lookup-widget .background-meta {
                color: var(--text-muted);
                font-size: 14px;
                margin-top: 5px;
            }
            .background-lookup-widget .source-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 11px;
                background-color: var(--background-modifier-border);
                color: var(--text-normal);
                margin-left: 5px;
            }
            .background-lookup-widget .background-details {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .background-lookup-widget .detail-row {
                margin: 8px 0;
                font-size: 14px;
                color: var(--text-normal);
                line-height: 1.5;
            }
            .background-lookup-widget .detail-label {
                font-weight: bold;
                display: inline-block;
                min-width: 120px;
                color: var(--text-normal);
            }
            .background-lookup-widget .background-description {
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
            .background-lookup-widget .background-description em {
                color: var(--text-muted);
                font-style: italic;
            }
            .background-lookup-widget .loading {
                color: var(--text-muted);
                text-align: center;
                padding: 20px;
            }
            .background-lookup-widget .error {
                color: var(--text-error);
                padding: 10px;
                background-color: var(--background-modifier-error);
                border-radius: 4px;
            }
            .background-lookup-widget .expand-icon {
                display: inline-block;
                transition: transform 0.2s;
                margin-right: 5px;
            }
            .background-lookup-widget .expand-icon.expanded {
                transform: rotate(90deg);
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'background-lookup-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        this.stylesInjected = true;
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
            
            // Parse CSV handling multi-line fields
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

    // Find backgrounds by names
    findBackgrounds(backgrounds, backgroundNames) {
        const found = [];
        backgroundNames.forEach(searchName => {
            const normalizedSearch = searchName.toLowerCase().trim();
            
            const match = backgrounds.find(background => 
                background.Name.toLowerCase().trim() === normalizedSearch
            );
            
            if (match && !found.find(b => b.Name === match.Name)) {
                found.push(match);
            }
        });
        return found;
    }

    // Create HTML for backgrounds
    createBackgroundsHTML(backgrounds) {
        if (backgrounds.length === 0) {
            return '<div class="error">No backgrounds found. Check background names.</div>';
        }

        return backgrounds.map((background, index) => {
            const displayName = background.Name;
            const source = background.Source || 'Unknown';
            const page = background.Page ? ` (p. ${background.Page})` : '';
            const description = background.Description || 'No description available';
            
            // Build details HTML - always show description prominently
            let detailsHTML = '';
            
            // Show description first and prominently if available
            if (description && description !== 'No description available') {
                detailsHTML += `<div class="background-description">${description}</div>`;
            } else {
                detailsHTML += `<div class="background-description"><em>No description available.</em></div>`;
            }
            
            // Then show metadata
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

    // Main display function for use in dataviewjs
    async display(dv, backgroundNames) {
        await this.injectStyles(dv);

        try {
            const backgrounds = await this.loadCSVData(dv);
            const found = this.findBackgrounds(backgrounds, backgroundNames);
            const html = this.createBackgroundsHTML(found);
            
            dv.paragraph(`<div class="background-lookup-widget">${html}</div>`);
        } catch (error) {
            dv.paragraph(`<div class="background-lookup-widget"><div class="error">Error loading backgrounds: ${error.message}</div></div>`);
        }
    }

    // Alternative: return HTML string for custom rendering
    async getHTML(dv, backgroundNames) {
        await this.injectStyles(dv);

        try {
            const backgrounds = await this.loadCSVData(dv);
            const found = this.findBackgrounds(backgrounds, backgroundNames);
            return `<div class="background-lookup-widget">${this.createBackgroundsHTML(found)}</div>`;
        } catch (error) {
            return `<div class="background-lookup-widget"><div class="error">Error loading backgrounds: ${error.message}</div></div>`;
        }
    }

    // Get raw background data
    async getBackgrounds(dv, backgroundNames) {
        const backgrounds = await this.loadCSVData(dv);
        return this.findBackgrounds(backgrounds, backgroundNames);
    }
}