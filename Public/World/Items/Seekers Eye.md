---
type: Item
name: Seekers Eye
tags:
  - Item
  - Artifact
  - Crestfall
---

```dataviewjs
const {ItemLookup} = await cJS()
await ItemLookup.display(dv, ['Seekers Eye'])
```

## What We Know
- An ogre's eye transformed into an artifact of great power — acts as a compass to find other artifacts
- Was hidden at the bottom of the [[Public/World/Crestfall/Highreach/Highreach Mines/Highreach Mines|Highreach Mines]], protected by a magical barrier
- The party retrieved it, but the evil wizard stole it and absorbed its power
- The wizard now uses it to hunt the remaining artifacts across Eldoria

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]] AND "Public"
SORT file.name ASC
```
