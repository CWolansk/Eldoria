# Common Monster Names Reference

This page helps you find the exact monster names to use in encounter creation.

## Quick Monster Search

**Search for monsters:** `INPUT[text(placeholder('goblin, orc, skeleton')):memory^monsterSearch]`

```meta-bind-js-view
{memory^monsterSearch} as monsterSearch
---
{
    if (!monsterSearch || monsterSearch.trim() === "") {
        return engine.markdown.create("Enter a search term above to find monsters.");
    }

    let sqlUtils = await engine.importJs('Scripts/DBScriptsTesting/sqlUtils.js');
    const dbPath = "Scripts/DBScriptsTesting/DND.db";
    
    const searchTerm = monsterSearch.toLowerCase().trim();
    const query = `SELECT Name, CR FROM Monsters WHERE LOWER(Name) LIKE ? ORDER BY Name LIMIT 20`;
    const results = await sqlUtils.runSqlStatement(dbPath, engine, query, [`%${searchTerm}%`]);
    
    if (!results || results.length === 0) {
        return engine.markdown.create("🛑 **No monsters found matching your search.**");
    }

    let output = `## Found ${results.length} monsters matching "${searchTerm}"\n\n`;
    
    results.forEach(monster => {
        output += `- **${monster.Name}** (CR ${monster.CR})\n`;
    });
    
    output += `\n*Use these exact names in your encounter creation.*`;
    
    return engine.markdown.create(output);
}
```

---

## Common Monster Categories

### Goblins & Small Humanoids
- **Goblin Assassin** (CR 1/2)
- **Goblin Boss** (CR 1)
- **Goblin Boss Archer** (CR 1)
- **Dum-Dum Goblin** (CR 1/4)
- **Dust Goblin** (CR 1/4)

### Undead
- **Skeleton** (CR 1/4)
- **Zombie** (CR 1/4)
- **Decrepit Skeleton** (CR 1/4)
- **Rotting Zombie** (CR 1/4)
- **Giant Zombie** (CR 4)

### Orcs & Warriors
- **Fiendish Orc** (CR 4)
- **Wolf Reaver Dwarf** (CR 3)

### Beasts & Lycanthropes
- **Werewolf (Krallenhorde)** (CR 3)
- **Werewolf Ravager** (CR 7)

### Bandits & NPCs
- **Bandit** (CR 1/8)
- **Bandit Captain** (CR 2)

---

## Tips for Encounter Creation

1. **Use Exact Names**: Copy the monster names exactly as shown above
2. **Check CR Ratings**: Make sure the encounter difficulty matches your party level
3. **Search Function**: Use the search box above to find specific monster types
4. **Monster Database**: Visit [[Search Monsters]] for detailed monster information

---

## Recent Searches
```dataview
TABLE WITHOUT ID file.link AS "Encounter"
FROM "Encounters"
WHERE file.name != "Create Encounter" AND file.name != "Quick Encounter Builder"
SORT file.ctime DESC
LIMIT 5
```
