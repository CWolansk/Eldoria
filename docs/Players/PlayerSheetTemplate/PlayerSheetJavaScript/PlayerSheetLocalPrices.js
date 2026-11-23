// What an item costs where the party is, shown beside its catalog value.
//
// Asked for once per page load, in the background. It never blocks or slows the sheet:
// if the route is missing, slow, fails, or has nothing to say, the sheet shows catalog
// values exactly as before. Nothing here is saved with the character.

import { localPriceFor } from "../../../tools/town/local-prices.js";

let answer = null;
let started = false;

function list(value) {
    return Array.isArray(value) ? value : value == null ? [] : [value];
}

/** For tests: forget what was loaded. */
export function resetLocalPrices() {
    answer = null;
    started = false;
}

/** For tests and previews: use this answer instead of asking the server. */
export function setLocalPrices(next) {
    answer = next && next.place?.name && Array.isArray(next.prices) && next.prices.length ? next : null;
}

/**
 * Ask once. onReady is called only if there is something to show.
 * @param {{ getWorldPublicPrices?: () => Promise<object> }} api
 */
export function primeLocalPrices(api, onReady) {
    if (started || typeof api?.getWorldPublicPrices !== "function") {
        return;
    }
    started = true;
    Promise.resolve()
        .then(() => api.getWorldPublicPrices())
        .then((result) => {
            setLocalPrices(result);
            if (answer && typeof onReady === "function") {
                onReady();
            }
        })
        .catch(() => {
            // No local prices; catalog values stay as they are.
        });
}

/** "In Ardenville: 16.8 gp (+12%)", or "" when there is nothing to add. */
export function getLocalPriceLine(item = {}, record = {}) {
    if (!answer) {
        return "";
    }
    const types = [
        ...list(record?._typeListText),
        record?.weaponCategory ? `${record.weaponCategory} weapon` : "",
        typeof record?.type === "string" && record.type.length > 2 ? record.type : ""
    ].filter(Boolean).join(" | ");
    const local = localPriceFor(answer, {
        id: item?.catalog?.id || record?.id || "",
        rarity: record?.rarity ?? "",
        type: types,
        value: typeof record?.value === "number" ? record.value : (record?.valueLabel || record?._l_value || "")
    });
    return local ? local.line : "";
}
