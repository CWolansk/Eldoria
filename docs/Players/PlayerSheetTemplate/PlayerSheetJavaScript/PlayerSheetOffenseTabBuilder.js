import {
    appendEmptyState,
    createEquipToggle,
    createItemList,
    createItemListItem,
    createSection,
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

    const typeLabel = getDamageTypeLabel(type);
    const includesType = typeLabel
        && String(dice).toLowerCase().includes(String(typeLabel).toLowerCase());
    return [dice, includesType ? "" : typeLabel].filter(Boolean).join(" ");
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
    addOption(formatDamageOption(attack?.damageVersatile, damageType));
    if (!attack) {
        addOption(formatDamageOption(formatDamageDiceWithBonus(getItemDamageDice(record), record), damageType));
        addOption(formatDamageOption(formatDamageDiceWithBonus(getItemDamageDice(record, "versatile"), record), damageType));
    }
    return options.join(" / ");
}

function getActionMetrics(action = {}) {
    return [
        action.unavailable ? ["Condition", "Unavailable"] : action.rollMode && action.rollMode !== "normal" ? ["Roll", action.rollMode] : null,
        action.attackBonus != null ? ["Hit", `${action.attackBonus >= 0 ? "+" : ""}${action.attackBonus}`] : null,
        action.saveDc != null ? ["Save", `${String(action.saveAbility || "").toUpperCase()} DC ${action.saveDc}`] : null,
        action.damage ? ["Damage", formatDamageOption(action.damage, action.damageType)] : null,
        action.area ? ["Area", action.area] : null,
        action.uses ? ["Uses", action.uses] : null
    ].filter(Boolean);
}

function createActionRow(action = {}) {
    return createItemListItem({
        name: action.name || "Action",
        source: action.source || ""
    }, {
        entries: action.summary ? [action.summary] : []
    }, {
        showMeta: true,
        metrics: getActionMetrics(action)
    });
}

function getAttackMetrics(attack, record) {
    const metrics = [];
    if (attack?.unavailable) {
        metrics.push({ label: "Condition", value: "Unavailable" });
    } else if (attack?.rollMode && attack.rollMode !== "normal") {
        metrics.push({ label: "Roll", value: attack.rollMode });
    }
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
    if (playerSheetObject?.conditionEffects?.actions?.blocked) {
        const warning = document.createElement("p");
        warning.className = "player-sheet-condition-action-warning";
        warning.textContent = playerSheetObject.conditionEffects.actions.dead
            ? "Actions are unavailable: exhaustion level 6 is fatal."
            : "Actions and reactions are unavailable while this condition remains active.";
        shell.appendChild(warning);
    }
    const list = createItemList();
    const resolvedItems = await resolveInventoryItems(playerSheetObject, context.api);
    const offensiveItems = resolvedItems.filter((entry) => entry.offensive);
    const offensiveItemNames = new Set(offensiveItems.map(({ item }) => String(item?.name || "").trim().toLowerCase()));
    const standaloneAttacks = (playerSheetObject?.attacks || [])
        .filter((attack) => !offensiveItemNames.has(String(attack?.name || "").trim().toLowerCase()));
    const actions = [...standaloneAttacks, ...(playerSheetObject?.racialActions || [])];

    if (!offensiveItems.length && !actions.length) {
        appendEmptyState(shell, "No attacks, actions, or offensive gear recorded.");
        return;
    }

    if (actions.length) {
        const actionSection = createSection("Actions");
        const actionList = createItemList();
        actions.forEach((action) => actionList.appendChild(createActionRow(action)));
        actionSection.appendChild(actionList);
        shell.appendChild(actionSection);
    }

    if (offensiveItems.length) {
        const gearSection = createSection("Weapons & Offensive Gear");
        for (const { item, record, inventoryIndex } of offensiveItems) {
            list.appendChild(createItemListItem(item, record, {
                actions: [createEquipToggle(item, inventoryIndex, context)],
                metrics: getAttackMetrics(getAttackForItem(playerSheetObject, item), record)
            }));
        }
        gearSection.appendChild(list);
        shell.appendChild(gearSection);
    }
}
