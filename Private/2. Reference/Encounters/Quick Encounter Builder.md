# Quick Encounter Builder

This utility provides quick templates for common encounter types.

## Quick Templates

### Goblin Ambush (CR 1-2)
```meta-bind-button
style: default
label: "Create Goblin Ambush"
action:
  type: js
  file: Scripts/DBScriptsTesting/CreateQuickEncounter.js
  args:
    template: "goblin_ambush"
```

### Orc Patrol (CR 2-3)
```meta-bind-button
style: default
label: "Create Orc Patrol"
action:
  type: js
  file: Scripts/DBScriptsTesting/CreateQuickEncounter.js
  args:
    template: "orc_patrol"
```

### Bandit Hideout (CR 3-4)
```meta-bind-button
style: default
label: "Create Bandit Hideout"
action:
  type: js
  file: Scripts/DBScriptsTesting/CreateQuickEncounter.js
  args:
    template: "bandit_hideout"
```

### Undead Encounter (CR 2-4)
```meta-bind-button
style: default
label: "Create Undead Encounter"
action:
  type: js
  file: Scripts/DBScriptsTesting/CreateQuickEncounter.js
  args:
    template: "undead_encounter"
```

### Beast Pack (CR 1-3)
```meta-bind-button
style: default
label: "Create Beast Pack"
action:
  type: js
  file: Scripts/DBScriptsTesting/CreateQuickEncounter.js
  args:
    template: "beast_pack"
```

---

## Custom Encounter Builder

For more complex encounters, use the [[Create Encounter]] page.

---

## Recently Created Encounters

```dataview
TABLE 
  file.ctime as "Created",
  length(file.outlinks) as "Monsters"
FROM "Encounters" AND -"Create Encounter" AND -"Quick Encounter Builder"
SORT file.ctime DESC
LIMIT 10
```
