// Common lookup widget style adapter.
// Phase 4 moved the CSS itself into docs/css/components.css. Existing lookup
// widgets still call these methods, so this adapter keeps that API stable
// without injecting page-local <style> blocks.

window.CommonLookupStyles = class CommonLookupStyles {
    static getBaseStyles(_widgetClass = 'lookup-widget') {
        return '';
    }

    static getSpellLevelStyles(_widgetClass = 'spell-lookup-widget') {
        return '';
    }

    static getItemRarityStyles(_widgetClass = 'item-lookup-widget') {
        return '';
    }

    static injectStyles(styleId, _cssContent = '') {
        if (document.getElementById(styleId)) {
            return;
        }

        const marker = document.createElement('meta');
        marker.id = styleId;
        marker.dataset.sharedCss = 'docs/css/components.css';
        document.head.appendChild(marker);
    }
}
