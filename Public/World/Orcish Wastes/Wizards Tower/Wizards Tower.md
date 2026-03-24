---
type: Location
name: Wizards Tower
region: OrcishWastes
tags:
  - Location
  - OrcishWastes
---

## Overview
A mysterious tower rising from the Orcish Wastes. Said to belong to an ancient wizard.

---

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]] AND "Public"
SORT file.name ASC
```