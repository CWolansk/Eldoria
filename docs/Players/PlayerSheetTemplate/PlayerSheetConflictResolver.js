function isPlainObject(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function valuesMatch(left, right) {
    if (Object.is(left, right)) return true;
    if (left == null || right == null || typeof left !== "object" || typeof right !== "object") return false;
    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch (_error) {
        return false;
    }
}

function joinPath(path, key) {
    return path ? `${path}.${key}` : String(key);
}

function inventoryItemKey(item) {
    const catalogId = String(item?.catalog?.id || "").trim().toLowerCase();
    if (catalogId) return `catalog:${catalogId}`;
    return `name:${String(item?.name || "").trim().toLowerCase()}|${String(item?.source || "").trim().toLowerCase()}`;
}

function keyInventoryItems(items) {
    const occurrences = new Map();
    const keyed = new Map();
    for (const item of items) {
        const baseKey = inventoryItemKey(item);
        const occurrence = occurrences.get(baseKey) || 0;
        occurrences.set(baseKey, occurrence + 1);
        keyed.set(`${baseKey}#${occurrence}`, item);
    }
    return keyed;
}

function mergeInventoryItems(base, local, remote, path, conflicts) {
    const baseItems = keyInventoryItems(base);
    const localItems = keyInventoryItems(local);
    const remoteItems = keyInventoryItems(remote);
    const keys = [...new Set([...remoteItems.keys(), ...localItems.keys(), ...baseItems.keys()])];
    const result = [];

    for (const key of keys) {
        const baseHas = baseItems.has(key);
        const localHas = localItems.has(key);
        const remoteHas = remoteItems.has(key);
        const itemPath = `${path}[${key}]`;

        if (!baseHas) {
            if (localHas && remoteHas && !valuesMatch(localItems.get(key), remoteItems.get(key))) {
                conflicts.push(itemPath);
            }
            if (localHas || remoteHas) result.push(clone(localHas ? localItems.get(key) : remoteItems.get(key)));
            continue;
        }

        if (!localHas && !remoteHas) continue;
        if (!localHas) {
            if (!valuesMatch(remoteItems.get(key), baseItems.get(key))) conflicts.push(itemPath);
            continue;
        }
        if (!remoteHas) {
            if (!valuesMatch(localItems.get(key), baseItems.get(key))) conflicts.push(itemPath);
            continue;
        }

        result.push(mergeValue(
            baseItems.get(key),
            localItems.get(key),
            remoteItems.get(key),
            itemPath,
            conflicts
        ));
    }

    return result;
}

function mergeValue(base, local, remote, path, conflicts) {
    if (valuesMatch(local, base)) return clone(remote);
    if (valuesMatch(remote, base) || valuesMatch(local, remote)) return clone(local);

    if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
        if (path === "inventory.items") {
            return mergeInventoryItems(base, local, remote, path, conflicts);
        }
        if (base.length !== local.length || base.length !== remote.length) {
            conflicts.push(path || "root");
            return clone(local);
        }

        return base.map((entry, index) => mergeValue(
            entry,
            local[index],
            remote[index],
            joinPath(path, index),
            conflicts
        ));
    }

    if (isPlainObject(base) && isPlainObject(local) && isPlainObject(remote)) {
        const result = {};
        const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
        for (const key of keys) {
            if (key === "lastModified") {
                result[key] = clone(remote[key]);
                continue;
            }
            const merged = mergeValue(base[key], local[key], remote[key], joinPath(path, key), conflicts);
            if (merged !== undefined) result[key] = merged;
        }
        return result;
    }

    conflicts.push(path || "root");
    return clone(local);
}

export function mergePlayerSheetChanges(baseDto, localDto, remoteDto) {
    if (!baseDto || !localDto || !remoteDto) {
        return {
            value: clone(localDto),
            conflicts: ["root"]
        };
    }

    const conflicts = [];
    const value = mergeValue(baseDto, localDto, remoteDto, "", conflicts);
    value.lastModified = remoteDto.lastModified;
    return { value, conflicts: [...new Set(conflicts)] };
}
