// Item Search Widget Loader for Published HTML
// This script loads and initializes the item search widget without requiring Obsidian's CustomJS

(async function() {
    'use strict';
    
    // Load a script dynamically
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Simple CSV parser (since we don't have Dataview in published HTML)
    async function loadCSV(path) {
        const response = await fetch(path);
        const text = await response.text();
        return parseCSV(text);
    }
    
    function parseCSVLine(line) {
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
    
    function parseCSV(text) {
        const lines = text.split('\n');
        const headers = parseCSVLine(lines[0]);
        const items = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = parseCSVLine(lines[i]);
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
    
    // Mock Dataview API for compatibility with existing code
    const mockDV = {
        csvData: null,
        
        async loadData() {
            if (!this.csvData) {
                this.csvData = await loadCSV('Assets/items/items.csv');
            }
            return this.csvData;
        },
        
        io: {
            async csv(path) {
                const data = await loadCSV(path);
                // Return object with array() method to match Dataview's DataArray
                return {
                    array: () => data
                };
            },
            async load(path) {
                const response = await fetch(path);
                return await response.text();
            }
        },
        
        el(tag, content, options = {}) {
            const el = document.createElement(tag);
            if (content) {
                el.innerHTML = content;
            }
            if (options.cls) {
                el.className = options.cls;
            }
            return el;
        },
        
        paragraph(html) {
            // For published HTML, we'll append directly to the widget container
            return html;
        }
    };
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    try {
        // Load dependencies in order
        await loadScript('Assets/common-lookup-styles.js');
        await loadScript('Assets/items/item-lookup.js');
        await loadScript('Assets/items/item-search-widget.js');
        
        console.log('Item search widget scripts loaded');
        
        // Find all item search widget containers and initialize them
        const containers = document.querySelectorAll('.item-search-widget-container');
        
        for (const container of containers) {
            const widgetDiv = container.querySelector('.item-search-widget');
            if (!widgetDiv) continue;
            
            const widgetId = widgetDiv.id;
            
            // Initialize the widget
            const widget = new ItemSearchWidget();
            await widget.injectStyles(mockDV);
            await widget.injectItemLookupStyles(mockDV);
            await widget.loadCSVData(mockDV);
            
            // Update the info text with actual count
            const infoDiv = widgetDiv.querySelector('.item-search-info');
            if (infoDiv) {
                infoDiv.textContent = `Type to search through ${widget.csvData.length} items. Supports fuzzy matching.`;
            }
            
            // Setup event listeners
            widget.setupEventListeners(mockDV, widgetId);
            
            console.log(`Initialized item search widget: ${widgetId}`);
        }
        
        console.log('Item search widgets initialized successfully');
        
    } catch (error) {
        console.error('Error loading item search widget:', error);
    }
})();
