// Common lookup widget styles shared across all D&D lookup widgets
// This file provides base styles that can be extended by specific lookup types

// Make it globally accessible
window.CommonLookupStyles = class CommonLookupStyles {
    static getBaseStyles(widgetClass = 'lookup-widget') {
        return `
            .${widgetClass} {
                font-family: var(--font-text);
                max-width: 800px;
                margin: 20px 0;
            }
            .${widgetClass} .card {
                border: 1px solid var(--background-modifier-border);
                margin: 10px 0;
                padding: 15px;
                border-radius: 4px;
                background-color: var(--background-secondary);
            }
            .${widgetClass} .card-name {
                font-weight: bold;
                font-size: 16px;
                color: var(--text-normal);
                cursor: pointer;
                user-select: none;
                list-style: none;
            }
            
            /* Hide default disclosure markers */
            .${widgetClass} .card-name::-webkit-details-marker {
                display: none;
            }
            .${widgetClass} .card-name::marker {
                content: '';
            }
            
            .${widgetClass} .card-name:hover {
                color: var(--text-accent);
            }
            .${widgetClass} .meta {
                color: var(--text-muted);
                font-size: 14px;
                margin-top: 5px;
            }
            .${widgetClass} .badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 11px;
                background-color: var(--background-modifier-border);
                color: var(--text-normal);
                margin-left: 5px;
            }
            .${widgetClass} .details {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .${widgetClass} .detail-row {
                margin: 8px 0;
                font-size: 14px;
                color: var(--text-normal);
                line-height: 1.5;
            }
            .${widgetClass} .detail-label {
                font-weight: bold;
                display: inline-block;
                min-width: 120px;
                color: var(--text-normal);
            }
            .${widgetClass} .description {
                margin: 12px 0;
                padding: 12px;
                background-color: var(--background-primary);
                border-radius: 4px;
                line-height: 1.7;
                font-size: 14px;
                border-left: 3px solid var(--interactive-accent);
                color: var(--text-normal);
            }
            .${widgetClass} .description p {
                margin: 0 0 12px 0;
                white-space: pre-wrap;
            }
            .${widgetClass} .description p:last-child {
                margin-bottom: 0;
            }
            .${widgetClass} .description em {
                color: var(--text-muted);
                font-style: italic;
            }
            .${widgetClass} .text-content {
                margin-top: 10px;
                padding: 10px;
                background-color: var(--background-primary);
                border-left: 3px solid var(--text-accent);
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-normal);
            }
            .${widgetClass} .text-content a {
                color: var(--text-accent);
                text-decoration: none;
            }
            .${widgetClass} .text-content a:hover {
                text-decoration: underline;
            }
            .${widgetClass} .loading {
                color: var(--text-muted);
                text-align: center;
                padding: 20px;
            }
            .${widgetClass} .error {
                color: var(--text-error);
                padding: 10px;
                background-color: var(--background-modifier-error);
                border-radius: 4px;
            }
            .${widgetClass} .expand-icon {
                display: inline-block;
                transition: transform 0.2s;
                margin-right: 5px;
            }
            .${widgetClass} .expand-icon.expanded {
                transform: rotate(90deg);
            }
        `;
    }

    static getSpellLevelStyles(widgetClass = 'spell-lookup-widget') {
        return `
            .${widgetClass} .spell-level {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 12px;
                margin-left: 10px;
            }
            .${widgetClass} .level-cantrip { background-color: #9e9e9e; color: white; }
            .${widgetClass} .level-1st { background-color: #8bc34a; color: white; }
            .${widgetClass} .level-2nd { background-color: #4caf50; color: white; }
            .${widgetClass} .level-3rd { background-color: #00bcd4; color: white; }
            .${widgetClass} .level-4th { background-color: #2196f3; color: white; }
            .${widgetClass} .level-5th { background-color: #3f51b5; color: white; }
            .${widgetClass} .level-6th { background-color: #9c27b0; color: white; }
            .${widgetClass} .level-7th { background-color: #e91e63; color: white; }
            .${widgetClass} .level-8th { background-color: #f44336; color: white; }
            .${widgetClass} .level-9th { background-color: #ff9800; color: white; }
            .${widgetClass} .higher-levels {
                margin-top: 10px;
                padding: 10px;
                background-color: var(--background-primary);
                border-left: 3px solid var(--color-purple);
                font-size: 13px;
                line-height: 1.6;
                color: var(--text-normal);
                font-style: italic;
            }
        `;
    }

    static getItemRarityStyles(widgetClass = 'item-lookup-widget') {
        return `
            .${widgetClass} .rarity {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 12px;
                margin-left: 10px;
            }
            .${widgetClass} .rarity-common { background-color: #9e9e9e; color: white; }
            .${widgetClass} .rarity-uncommon { background-color: #4caf50; color: white; }
            .${widgetClass} .rarity-rare { background-color: #2196f3; color: white; }
            .${widgetClass} .rarity-very-rare { background-color: #9c27b0; color: white; }
            .${widgetClass} .rarity-legendary { background-color: #ff9800; color: white; }
        `;
    }

    static injectStyles(styleId, cssContent) {
        if (document.getElementById(styleId)) {
            return; // Already injected
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = cssContent;
        document.head.appendChild(styleEl);
    }
}
