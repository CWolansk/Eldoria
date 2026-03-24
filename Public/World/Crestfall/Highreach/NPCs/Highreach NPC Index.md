---
type: Reference
name: Highreach NPC Index
location: Highreach
region: Crestfall
tags:
  - Reference
  - Crestfall
  - Highreach
---

## NPCs of Highreach

```dataview
LIST
WHERE type = "NPC" AND location = "Highreach"
SORT file.name ASC
```

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]] AND "Public"
SORT file.name ASC
```