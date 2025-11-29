---
tags: [dashboard, quests, events]
---

# 🛡️ Campaign Quest Board

## ⚔️ Active Quests
```dataview
TABLE status, location, reward, difficulty
FROM "Private/2. Reference/Events/01-Quests"
WHERE status != "Completed" AND status != "Failed"
SORT date ASC
```

## 📜 Quest Log (Completed)
```dataview
TABLE fc-date, fc-end, status
FROM "Private/2. Reference/Events/01-Quests"
WHERE status = "Completed"
SORT fc-date DESC
```

```dataview
TABLE fc-date, fc-end, status
FROM "Private/2. Reference/Events/01-Quests"
WHERE status = "Failed"
SORT fc-date DESC
```
---

## 🌍 World Events

### 🏛️ Political Situation
```dataview
TABLE status, threat_level
FROM "Private/2. Reference/Events/02-World-Events/Political"
WHERE status = "Ongoing" OR status = "Escalating"
```

### 📅 Upcoming Holidays
```dataview
TABLE fc-date, location
FROM "Private/2. Reference/Events/02-World-Events/Holidays"
SORT date ASC
LIMIT 5
```

### ⏳ Timeline (Recent History)
```dataview
TABLE fc-date, summary
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
LIMIT 10
```
