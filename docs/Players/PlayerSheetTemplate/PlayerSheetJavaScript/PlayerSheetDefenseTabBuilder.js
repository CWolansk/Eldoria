import {
    appendEmptyState,
    createEquipToggle,
    createItemList,
    createItemListItem,
    createTabShell,
    resolveInventoryItems
} from "./PlayerSheetTabHelpers.js";

export async function BuildPlayerSheetDefenseTab(playerSheetObject, context = {}) {
    const shell = createTabShell("Defense");
    const list = createItemList();
    const resolvedItems = await resolveInventoryItems(playerSheetObject, context.api);
    const defensiveItems = resolvedItems.filter((entry) => entry.defensive);

    if (!defensiveItems.length) {
        appendEmptyState(shell, "No defensive gear recorded.");
        return;
    }

    for (const { item, record, inventoryIndex } of defensiveItems) {
        list.appendChild(createItemListItem(item, record, {
            actions: [createEquipToggle(item, inventoryIndex, context)],
            rows: ["AC", "Value", "Weight", "Attunement"]
        }));
    }

    shell.appendChild(list);
}
