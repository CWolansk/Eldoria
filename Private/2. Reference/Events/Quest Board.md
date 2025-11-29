---
tags: [dashboard, quests, events]
---

# Campaign Quest Board

## Active Quests
```dataview
TABLE status, location, reward, difficulty
FROM "Private/2. Reference/Events/01-Quests"
WHERE status != "Completed" AND status != "Failed"
SORT date ASC
```

## Completed Quests
```dataview
TABLE dateformat(fc-date, "MM-dd-yyyy") AS "Start", dateformat(fc-end, "MM-dd-yyyy") AS "end", status
FROM "Private/2. Reference/Events/01-Quests"
WHERE status = "Completed"
SORT fc-date DESC
```
## Failed Quests
```dataview
TABLE dateformat(fc-date, "MM-dd-yyyy") AS "start", dateformat(fc-end, "MM-dd-yyyy") AS "end", status
FROM "Private/2. Reference/Events/01-Quests"
WHERE status = "Failed"
SORT fc-date DESC
```
---

## 🌍 World Events

### 🏛️ Political Situation
```dataview
TABLE status, threat_level
FROM "Private/2. Reference/Events/02-World-Events/Town"
WHERE status = "Ongoing" OR status = "Escalating"
```

### 📅 Upcoming Holidays
```dataview
TABLE dateformat(fc-date, "MM-dd-yyyy") AS "Date", location
FROM "Private/2. Reference/Events/02-World-Events/Holidays"
SORT fc-date asc
```

### ⏳ Timeline (Recent History)
```dataview
TABLE dateformat(fc-date, "MM-dd-yyyy") AS "Date", summary
FROM "Private/2. Reference/Events/02-World-Events/Timeline"
SORT fc-date DESC
```

---

## ⚠️ Consequences & Fallout
```dataview
TABLE status, threat_level, estimated_duration
FROM "Private/2. Reference/Events/03-Consequences/Active"
SORT threat_level DESC
```

## 💡 Ideas & Drafts
```dataview
LIST
FROM "Private/2. Reference/Events/04-Ideas-and-Drafts"
```
