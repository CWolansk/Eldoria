---
ExperiencePoints: 6500
level: 5
GuildPoints: 51
GuildRank: E
---

Add Experience Points : `INPUT[number(defaultValue(0)):memory^xptoadd]` `BUTTON[addxp]`

Increment Level : `BUTTON[lvl]`

Add Guild Points : `INPUT[number(defaultValue(0)):memory^gptoadd]` `BUTTON[addGP]` 

Set Guild Rank : `INPUT[inlineSelect(option(S),option(A),option(B), option(C), option(D),option(E),option(F)):GuildRank]`

```meta-bind-button
label: "Add"
hidden: true
id: "addxp"
style: default
actions:
  - type: updateMetadata
    bindTarget: ExperiencePoints
    evaluate: true
    value: x + getMetadata(`memory^xptoadd`)
```
```meta-bind-button
label: "Increment Level"
hidden: true
id: "lvl"
style: default
actions:
  - type: updateMetadata
    bindTarget: level
    evaluate: true
    value: x + 1
```
- Group Items 
	- Map of the Continent [[Eldoira.jpg]] 
```meta-bind-button
label: "Add"
hidden: true
id: "addGP"
style: default
actions:
  - type: updateMetadata
    bindTarget: GuildPoints
    evaluate: true
    value: x + getMetadata(`memory^gptoadd`)
```

```dataview
TABLE WITHOUT ID file.link AS "Mentioned In"
FROM [[#this.file.name]]
SORT file.name ASC
```
