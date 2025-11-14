class RaceLookup {
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
        
        // Inject base styles with race-specific class mapping
        const baseStyles = window.CommonLookupStyles.getBaseStyles('race-lookup-widget')
            .replace(/\.card(?![a-z-])/g, '.race-card')
            .replace(/\.card-name/g, '.race-name')
            .replace(/\.meta(?![a-z-])/g, '.race-meta')
            .replace(/\.badge(?![a-z-])/g, '.source-badge')
            .replace(/\.details(?![a-z-])/g, '.race-details')
            .replace(/\.description(?![a-z-])/g, '.race-description')
            .replace(/\.text-content/g, '.race-link');
        
        window.CommonLookupStyles.injectStyles('race-lookup-styles', baseStyles);
        this.stylesInjected = true;
    }

    injectFallbackStyles() {
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
                margin: 8px 0;
                font-size: 14px;
                color: var(--text-normal);
                line-height: 1.5;
            }
            .race-lookup-widget .detail-label {
                font-weight: bold;
                display: inline-block;
                min-width: 120px;
                color: var(--text-normal);
            }
            .race-lookup-widget .race-description {
                margin: 12px 0;
                padding: 12px;
                background-color: var(--background-primary);
                border-radius: 4px;
                line-height: 1.7;
                font-size: 14px;
                border-left: 3px solid var(--interactive-accent);
                color: var(--text-normal);
            }
            .race-lookup-widget .race-description p {
                margin: 0 0 12px 0;
                white-space: pre-wrap;
            }
            .race-lookup-widget .race-description p:last-child {
                margin-bottom: 0;
            }
            .race-lookup-widget .race-description em {
                color: var(--text-muted);
                font-style: italic;
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
            const csvPath = 'Assets/Races/Races.csv';
            const csvText = await dv.io.load(csvPath);
            
            // Parse CSV handling multi-line fields
            this.csvData = this.parseCSV(csvText);
            this.isLoading = false;
            
            this.loadCallbacks.forEach(cb => cb.resolve(this.csvData));
            this.loadCallbacks = [];
            
            return this.csvData;
        } catch (error) {
            this.isLoading = false;
            console.error('Error loading Races.csv:', error);
            
            this.loadCallbacks.forEach(cb => cb.reject(error));
            this.loadCallbacks = [];
            
            throw error;
        }
    }


    // Parse CSV data properly handling multi-line fields
    parseCSV(csvText) {
        // Normalize line endings to \n
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedText.split('\n');
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
                    // Regular character - skip \r if present
                    if (char !== '\r') {
                        currentField += char;
                    }
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
                        rowObj[header.trim()] = (currentRow[index] || '').trim();
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

    // Find races by names with optional source specification
    // Supports formats: 
    //   'Aasimar' - finds all Aasimar from any source
    //   'Aasimar (MPMM)' - finds Aasimar from MPMM source only
    //   'Aasimar|MPMM' - alternative pipe syntax
    //   'Elf (High)' - finds race literally named "Elf (High)" from any source
    findRaces(races, raceNames) {
        const found = [];
        
        raceNames.forEach(searchName => {
            const trimmedSearch = searchName.trim();
            
            // Try to parse as "RaceName (SOURCE)" or "RaceName|SOURCE"
            // But be careful - some race names themselves contain parentheses like "Elf (High)"
            
            let raceName = trimmedSearch;
            let sourceFilter = null;
            
            // Check for pipe syntax first (unambiguous)
            const pipeMatch = trimmedSearch.match(/^(.+?)\s*\|\s*(.+?)\s*$/);
            if (pipeMatch) {
                raceName = pipeMatch[1].trim();
                sourceFilter = pipeMatch[2].trim().toUpperCase();
            } else {
                // For parentheses, only treat as source if it matches known sources
                // This allows "Elf (High)" to be treated as a race name, not "Elf" with source "High"
                const parenMatch = trimmedSearch.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
                if (parenMatch) {
                    const potentialRaceName = parenMatch[1].trim();
                    const potentialSource = parenMatch[2].trim().toUpperCase();
                    
                    // Common D&D source abbreviations
                    const knownSources = [
                        'PHB', 'DMG', 'MPMM', 'VGM', 'MTF', 'SCAG', 'ERLW', 'FTD', 
                        'TCE', 'EEPC', 'GGR', 'MOT', 'IDRotF', 'SCC', 'VRGR', 'WBtW',
                        'AAG', 'DSotDQ', 'AI', 'EGW', 'PSA', 'PSD', 'PSI', 'PSX', 
                        'PSK', 'PSZ', 'TTP', 'AWM', 'LR', 'OGA', 'BoET', 'GH:PP',
                        'HWCS', 'O:TTG', 'TGS2', 'TLotRR'
                    ];
                    
                    // If the potential source is a known source abbreviation, treat it as source filter
                    if (knownSources.includes(potentialSource)) {
                        raceName = potentialRaceName;
                        sourceFilter = potentialSource;
                    }
                    // Otherwise, treat the whole thing as the race name
                }
            }
            
            const normalizedRaceName = raceName.toLowerCase();
            
            // Find all matching races
            const matches = races.filter(race => {
                const nameMatches = race.Name.toLowerCase().trim() === normalizedRaceName;
                if (!nameMatches) return false;
                
                // If source filter specified, check it matches
                if (sourceFilter) {
                    return race.Source && race.Source.toUpperCase() === sourceFilter;
                }
                
                return true;
            });
            
            // Add matches that aren't already in the found array
            matches.forEach(match => {
                const isDuplicate = found.some(r => 
                    r.Name === match.Name && r.Source === match.Source
                );
                if (!isDuplicate) {
                    found.push(match);
                }
            });
        });
        
        return found;
    }

    // Create HTML for races
    createRacesHTML(races) {
        if (races.length === 0) {
            return '<div class="error">No races found. Check race names.</div>';
        }

        return races.map((race, index) => {
            const displayName = race.Name;
            const source = race.Source || 'Unknown';
            const page = race.Page ? ` p${race.Page}` : '';
            const abilityScores = race['Ability Scores'] || '';
            const size = race.Size || '';
            const speed = race.Speed || '';
            const description = race.Description || 'No description available';
            
            // Build details HTML - show metadata first, then description
            let detailsHTML = '';
            
            // Show metadata in a compact format at the top
            const metadataItems = [];
            
            if (abilityScores && abilityScores.trim() !== '') {
                metadataItems.push(`<strong>Ability Scores:</strong> ${abilityScores}`);
            }
            
            if (size && size.trim() !== '') {
                metadataItems.push(`<strong>Size:</strong> ${size}`);
            }
            
            if (speed && speed.trim() !== '') {
                metadataItems.push(`<strong>Speed:</strong> ${speed}`);
            }
            
            if (metadataItems.length > 0) {
                detailsHTML += `
                    <div class="detail-row">
                        ${metadataItems.join(' • ')}
                    </div>`;
            }
            
            detailsHTML += `
                <div class="detail-row">
                    <span class="detail-label">Source:</span> ${source}${page}
                </div>`;
            
            // Show description prominently with proper formatting
            if (description && description.trim() !== '' && description !== 'No description available') {
                // Convert the description to HTML, preserving paragraph breaks
                const formattedDescription = description
                    .split('\n\n')
                    .map(para => `<p>${para.trim()}</p>`)
                    .join('');
                
                detailsHTML += `<div class="race-description">${formattedDescription}</div>`;
            } else {
                detailsHTML += `<div class="race-description"><em>No description available.</em></div>`;
            }
            
            return `
                <details class="race-card">
                    <summary class="race-name">
                        <span class="expand-icon">▶</span>
                        ${displayName}
                        <span class="source-badge">${source}</span>
                    </summary>
                    <div class="race-details">
                        ${detailsHTML}
                    </div>
                </details>
            `;
        }).join('');
    }

    // Main display function for use in dataviewjs
    async display(dv, raceNames) {
        await this.injectStyles(dv);

        try {
            const races = await this.loadCSVData(dv);
            const found = this.findRaces(races, raceNames);
            const html = this.createRacesHTML(found);
            
            dv.paragraph(`<div class="race-lookup-widget">${html}</div>`);
        } catch (error) {
            dv.paragraph(`<div class="race-lookup-widget"><div class="error">Error loading races: ${error.message}</div></div>`);
        }
    }

    // Alternative: return HTML string for custom rendering
    async getHTML(dv, raceNames) {
        await this.injectStyles(dv);

        try {
            const races = await this.loadCSVData(dv);
            const found = this.findRaces(races, raceNames);
            return `<div class="race-lookup-widget">${this.createRacesHTML(found)}</div>`;
        } catch (error) {
            return `<div class="race-lookup-widget"><div class="error">Error loading races: ${error.message}</div></div>`;
        }
    }

    // Get raw race data
    async getRaces(dv, raceNames) {
        const races = await this.loadCSVData(dv);
        return this.findRaces(races, raceNames);
    }
}
