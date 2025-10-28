
`BUTTON[syncItems]`

```meta-bind-button
label: "Sync Items"
hidden: true
id: "syncItems"
style: default
actions:
  - type: inlineJS
    code: |
     let csvUtils = await engine.importJs('Scripts/csvUtils.js');
     csvUtils.syncNotesToCsv("Items/Item Compendium/", "Items/Items.csv");
```
