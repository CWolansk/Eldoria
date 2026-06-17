import {
    appendEmptyState,
    createEquipToggle,
    createItemList,
    createItemListItem,
    createTabShell,
    formatDamageDiceWithBonus,
    getDamageTypeLabel,
    getItemDamageDice,
    getItemDamageType,
    resolveInventoryItems
} from "./PlayerSheetTabHelpers.js";

function getAttackForItem(playerSheetObject, item) {
    const name = String(item?.name || "").trim().toLowerCase();
    if (!name) {
        return null;
    }

    return (playerSheetObject?.attacks || [])
        .find((attack) => String(attack?.name || "").trim().toLowerCase() === name) || null;
}

function formatDamageOption(dice, type) {
    if (!dice) {
        return "";
    }

    return [
        dice,
        getDamageTypeLabel(type)
    ].filter(Boolean).join(" ");
}

function getDamageOptions(attack, record) {
    const options = [];
    const seen = new Set();
    const addOption = (value) => {
        const text = String(value || "").trim();
        const key = text.toLowerCase();
        if (!text || seen.has(key)) {
            return;
        }

        seen.add(key);
        options.push(text);
    };

    const damageType = attack?.damageType || getItemDamageType(record);
    addOption(formatDamageOption(attack?.damage, damageType));
    addOption(formatDamageOption(formatDamageDiceWithBonus(getItemDamageDice(record), record), damageType));
    addOption(formatDamageOption(formatDamageDiceWithBonus(getItemDamageDice(record, "versatile"), record), damageType));
    return options.join(" / ");
}

function getAttackMetrics(attack, record) {
    const metrics = [];
    if (attack?.attackBonus != null) {
        metrics.push({
            label: "Hit",
            value: `${attack.attackBonus >= 0 ? "+" : ""}${attack.attackBonus}`
        });
    }

    const damage = getDamageOptions(attack, record);
    if (damage) {
        metrics.push({
            label: "Damage",
            value: damage
        });
    }

    return metrics;
}

export async function BuildPlayerSheetOffenseTab(playerSheetObject, context = {}) {
    const shell = createTabShell("Offense");
    const list = createItemList();
    const resolvedItems = await resolveInventoryItems(playerSheetObject, context.api);
    const offensiveItems = resolvedItems.filter((entry) => entry.offensive);

    if (!offensiveItems.length) {
        appendEmptyState(shell, "No offensive gear recorded.");
        return;
    }

    for (const { item, record, inventoryIndex } of offensiveItems) {
        list.appendChild(createItemListItem(item, record, {
            actions: [createEquipToggle(item, inventoryIndex, context)],
            metrics: getAttackMetrics(getAttackForItem(playerSheetObject, item), record)
        }));
    }

    shell.appendChild(list);
}
