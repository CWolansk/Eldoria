# Eval 1 — New Settlement (Tidecrest)

## Private File Output
```markdown
---
type: Settlement
name: Tidecrest
region: Crestfall
settlement_type: Village
population: ~80
status: Active
tags:
  - Settlement
  - Crestfall
  - Tidecrest
---

![[Public/World/Crestfall/Tidecrest/Tidecrest]]

## Notable NPCs
- None yet

## Guilds & Politics
- No formal governance — disputes settled by the loudest voice at the morning docks
- Fishing families share hauls informally; no guild structure

## DM Notes


---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
```

## Public File Output
```markdown
---
type: Settlement
name: Tidecrest
region: Crestfall
settlement_type: Village
tags:
  - Settlement
  - Crestfall
  - Tidecrest
---

## Overview
Tidecrest is a small fishing village on the western shore of [[Public/World/Crestfall/Crestfall|Lake Arden]] in Crestfall. A handful of families make their living pulling fish from the lake, selling the day's catch at a tiny open-air market.

## Geography
- Western shore of Lake Arden, sheltered by a low rocky bluff
- Pebble beach gives way to wooden jetties extending into shallow water
- Reeds and cattails line the shore to the north and south

## Infrastructure
- A dozen thatch-roofed cottages clustered near the waterfront
- Small open-air market — a few stalls, busiest at dawn when the boats come in
- Wooden jetties for mooring fishing skiffs

## Economy
- **Fishing** — sole industry; perch, pike, and freshwater crab from Lake Arden
- **Market trade** — surplus catch sold or bartered to passing travelers and nearby settlements

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]] AND "Public"
SORT file.name ASC
```
```
