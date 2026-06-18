import {
    appendEmptyState,
    createEquipToggle,
    createItemList,
    createItemListItem,
    createSection,
    createTabShell,
    resolveInventoryItems
} from "./PlayerSheetTabHelpers.js";

export async function BuildPlayerSheetDefenseTab(playerSheetObject, context = {}) {
    const shell = createTabShell("Defense");
    const gearSection = createSection("Defensive Gear");
    const list = createItemList();
    const resolvedItems = await resolveInventoryItems(playerSheetObject, context.api);
    const defensiveItems = resolvedItems.filter((entry) => entry.defensive);

    if (!defensiveItems.length) {
        appendEmptyState(gearSection, "No defensive gear recorded.");
        shell.appendChild(gearSection);
        return;
    }

    for (const { item, record, inventoryIndex } of defensiveItems) {
        list.appendChild(createItemListItem(item, record, {
            actions: [createEquipToggle(item, inventoryIndex, context)],
            rows: ["AC", "Value", "Weight", "Attunement"]
        }));
    }

    gearSection.appendChild(list);
    shell.appendChild(gearSection);
}
