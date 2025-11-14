# Encounter Dashboard

## Quick Actions

| Action | Description |
|--------|-------------|
| [[Create Encounter]] | Full encounter creation tool with custom monsters |
| [[Quick Encounter Builder]] | Pre-made encounter templates |

---

## Encounter Statistics

```dataview
TABLE 
  choice(contains(file.name, "Goblin"), "🟢 Easy", 
    choice(contains(file.name, "Orc"), "🟡 Medium",
      choice(contains(file.name, "Dragon"), "🔴 Deadly", "⚪ Unknown"))) as Difficulty,
  file.ctime as Created,
  file.mtime as "Last Modified"
FROM "Encounters" 
WHERE file.name != "Create Encounter" 
  AND file.name != "Quick Encounter Builder"
  AND file.name != "Encounter Dashboard"
SORT file.mtime DESC
```

---

## Recent Combat Sessions

```dataview
LIST
FROM "Sessions"
WHERE contains(file.content, "encounter") OR contains(file.content, "combat")
SORT file.ctime DESC
LIMIT 5
```

---

## Monster Usage Statistics

```dataview
TABLE
  length(rows.file) as "Times Used",
  rows.file.link as "In Encounters"
FROM "Encounters"
FLATTEN file.outlinks as monster
WHERE contains(string(monster), "Monster Compendium")
GROUP BY monster
SORT length(rows.file) DESC
LIMIT 10
```

---

## XP Tracking

**Current Party Level:** `VIEW[{frontmatter^Player Controls#level}]`  
**Current XP:** `VIEW[{frontmatter^Player Controls#ExperiencePoints}]`

### XP Calculator

**XP to Award:** `INPUT[number(placeholder(500)):memory^xpAmount]`

```meta-bind-button
style: primary
label: "Award XP to Party"
action:
  type: js
  file: Scripts/DBScriptsTesting/AwardXP.js
  args:
    xpAmount: "{memory^xpAmount}"
```

---

## Campaign Encounter Log

### Easy Encounters (CR 1-2)
```dataview
LIST
FROM "Encounters"
WHERE contains(file.content, "Easy") OR contains(file.name, "Goblin") OR contains(file.name, "Wolf")
SORT file.ctime DESC
```

### Medium Encounters (CR 3-5)
```dataview
LIST
FROM "Encounters"
WHERE contains(file.content, "Medium") OR contains(file.name, "Orc") OR contains(file.name, "Bandit")
SORT file.ctime DESC
```

### Hard Encounters (CR 6-10)
```dataview
LIST
FROM "Encounters"
WHERE contains(file.content, "Hard") OR contains(file.name, "Owlbear") OR contains(file.name, "Troll")
SORT file.ctime DESC
```

### Deadly Encounters (CR 11+)
```dataview
LIST
FROM "Encounters"
WHERE contains(file.content, "Deadly") OR contains(file.name, "Dragon") OR contains(file.name, "Lich")
SORT file.ctime DESC
```
