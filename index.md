Players
- [[Claire Player Sheet]]
- [[JP Player Sheet]]
- [[Julie Player Sheet]]
- [[Justin Player Sheet]]
- [[Liz Player Sheet]]
- [[Randi Player Sheet]]
- [[Vanessa Player Sheet]] 

Reference 
- [[Item Searcher]] 
- [[Feat Searcher]] 
- [[Spell Searcher]] 
- [[Race Searcher]] 
- [[Background Searcher]] 

<div id="local-links">
<!-- Links will be injected here -->
</div>

<script>
// Inject local links dynamically
(function() {
    const links = [
        { name: "Compendium", href: "./5etools/5etools.html" },
        { name: "World Map", href: "./WorldMap.html" },
    ];

    const container = document.getElementById('local-links');
    if (container) {
        const linkElements = links.map(link => 
            `<a href="${link.href}" style="margin-right: 15px;">${link.name}</a>`
        ).join(' | ');
        
        container.innerHTML = `<div style="padding: 10px 0;">${linkElements}</div>`;
    }
})();
</script>


