import { PlayerSheetDtoHelper } from "../PlayerSheetDtoHelper.js";
import { createElement } from "../PlayerSheetHtmlHelper.js";
import {
    appendEmptyState,
    createEquipToggle,
    createInventoryItemFromCatalog,
    getCatalogItemId,
    createItemCard,
    createItemList,
    createItemListItem,
    createSection,
    createTabShell,
    resolveInventoryItems
} from "./PlayerSheetTabHelpers.js";
import {
    getCatalogCache,
    toNumber
} from "../LevelEditorJavaScript/Core/LevelEditorShared.js";

const ITEM_SEARCH_LIMIT = 25;
const ITEM_SEARCH_DEBOUNCE_MS = 250;
const CURRENCY_KEYS = ["pp", "gp", "ep", "sp", "cp"];

function listCatalogItems(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    if (Array.isArray(response?.value)) {
        return response.value;
    }

    return [];
}

function createModalField(labelText, input) {
    const label = createElement("label", "player-sheet-field");
    label.appendChild(createElement("span", "player-sheet-field__label", labelText));
    label.appendChild(input);
    return label;
}

function createCheckbox(labelText, checked = false) {
    const label = createElement("label", "player-sheet-checkbox");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(checked);
    label.appendChild(input);
    label.appendChild(createElement("span", "", labelText));
    return { label, input };
}

function buildItemResultButton(item, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-sheet-catalog-result";
    button.appendChild(createElement("span", "player-sheet-catalog-result__name", item?.name || "Unknown Item"));
    button.appendChild(createElement("span", "player-sheet-catalog-result__meta", [
        item?.source,
        item?.rarity,
        item?._typeListText?.join(", ") || item?.type
    ].filter(Boolean).join(" | ")));
    button.addEventListener("click", () => onSelect(item, button));
    return button;
}

function clearElement(element) {
    element.replaceChildren();
}

function getSearchableItemId(item) {
    const id = getCatalogItemId(item);
    return id && id.includes(":") ? id : "";
}

function buildItemSearchModal(context = {}) {
    const dialog = document.createElement("dialog");
    dialog.className = "modal player-sheet__modal player-sheet__modal--item-search";
    dialog.setAttribute("aria-label", "Add Item");

    const content = createElement("div", "modal-content player-sheet__modal-content");
    const header = createElement("div", "player-sheet__modal-header");
    header.appendChild(createElement("h3", "player-sheet__modal-title", "Add Item"));

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close player-sheet__modal-close";
    closeButton.textContent = "X";
    closeButton.setAttribute("aria-label", "Close Add Item");
    closeButton.addEventListener("click", () => dialog.close());
    header.appendChild(closeButton);
    content.appendChild(header);

    const picker = createElement("div", "player-sheet-catalog-picker");
    const controls = createElement("div", "player-sheet-catalog-picker__controls");
    const searchInput = document.createElement("input");
    searchInput.className = "player-sheet-input";
    searchInput.type = "search";
    searchInput.placeholder = "Item name";

    const searchButton = document.createElement("button");
    searchButton.type = "button";
    searchButton.className = "player-sheet-button";
    searchButton.textContent = "Search";
    controls.appendChild(createModalField("Search", searchInput));
    controls.appendChild(searchButton);
    picker.appendChild(controls);

    const extraControls = createElement("div", "player-sheet-catalog-picker__extra-controls");
    const quantityInput = document.createElement("input");
    quantityInput.className = "player-sheet-input player-sheet-input--number";
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.step = "1";
    quantityInput.value = "1";
    extraControls.appendChild(createModalField("Quantity", quantityInput));
    const equipped = createCheckbox("Equipped");
    const attuned = createCheckbox("Attuned");
    extraControls.appendChild(equipped.label);
    extraControls.appendChild(attuned.label);
    picker.appendChild(extraControls);

    const status = createElement("p", "player-sheet-catalog-picker__status", context.api ? "Search for an item." : "Item catalog API client is unavailable.");
    picker.appendChild(status);

    const main = createElement("div", "player-sheet-catalog-picker__main");
    const results = createElement("div", "player-sheet-catalog-picker__results");
    const detail = createElement("div", "player-sheet-catalog-picker__detail");
    detail.appendChild(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
    main.appendChild(results);
    main.appendChild(detail);
    picker.appendChild(main);

    const footer = createElement("div", "player-sheet-catalog-picker__footer");
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "player-sheet-button player-sheet-button--primary";
    addButton.textContent = "Add Item";
    addButton.disabled = true;
    footer.appendChild(addButton);
    picker.appendChild(footer);
    content.appendChild(picker);
    dialog.appendChild(content);

    let selectedItem = null;
    let searchToken = 0;
    let searchTimer = null;
    const itemDetailsById = new Map();

    function setStatus(message) {
        status.textContent = message;
    }

    async function getFullItemRecord(item) {
        const catalogId = getSearchableItemId(item);
        if (!catalogId || !context.api) {
            return item;
        }

        if (!itemDetailsById.has(catalogId)) {
            const catalog = getCatalogCache(context.api);
            itemDetailsById.set(catalogId, catalog.getById("items", catalogId).then((record) => record || item));
        }

        return itemDetailsById.get(catalogId);
    }

    async function setSelectedItem(item, button = null) {
        const token = searchToken;
        selectedItem = item;
        results.querySelectorAll(".player-sheet-catalog-result").forEach((resultButton) => {
            resultButton.classList.toggle("player-sheet-catalog-result--selected", resultButton === button);
        });

        detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Loading item details..."));
        addButton.disabled = true;

        try {
            const fullItem = await getFullItemRecord(item);
            if (token !== searchToken) {
                return;
            }

            selectedItem = fullItem;
            detail.replaceChildren(createItemCard(fullItem, fullItem, {
                badge: "Catalog",
                rows: ["Type", "Rarity", "Damage", "Versatile", "AC", "Value", "Weight", "Attunement"]
            }));
            addButton.disabled = !selectedItem || typeof context.onChange !== "function";
        } catch (error) {
            if (token !== searchToken) {
                return;
            }

            console.warn("Item detail lookup failed:", error);
            selectedItem = item;
            detail.replaceChildren(createItemCard(item, item, {
                badge: "Catalog",
                rows: ["Type", "Rarity", "Damage", "Versatile", "AC", "Value", "Weight", "Attunement"]
            }));
            addButton.disabled = !selectedItem || typeof context.onChange !== "function";
        }
    }

    function renderResults(items) {
        clearElement(results);
        detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
        selectedItem = null;
        addButton.disabled = true;

        if (!items.length) {
            results.appendChild(createElement("p", "player-sheet-empty-state", "No items found."));
            return;
        }

        for (const item of items) {
            results.appendChild(buildItemResultButton(item, setSelectedItem));
        }

        const firstButton = results.querySelector(".player-sheet-catalog-result");
        if (firstButton) {
            setSelectedItem(items[0], firstButton);
        }
    }

    async function runSearch() {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            clearElement(results);
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
            selectedItem = null;
            addButton.disabled = true;
            setStatus(query ? "Type at least 2 characters." : "Search for an item.");
            return;
        }

        if (!context.api) {
            setStatus("Item catalog API client is unavailable.");
            return;
        }

        const token = searchToken + 1;
        searchToken = token;
        setStatus("Searching items...");
        results.replaceChildren(createElement("p", "player-sheet-empty-state", "Searching..."));

        try {
            const response = typeof context.api.searchCatalog === "function"
                ? await context.api.searchCatalog("items", query, { limit: ITEM_SEARCH_LIMIT })
                : await context.api.searchCatalogFull("items", query, { limit: ITEM_SEARCH_LIMIT });
            if (token !== searchToken) {
                return;
            }

            const items = listCatalogItems(response);
            renderResults(items);
            setStatus(`${items.length} item${items.length === 1 ? "" : "s"} found.`);
        } catch (error) {
            if (token !== searchToken) {
                return;
            }
            console.error("Item catalog search failed:", error);
            results.replaceChildren(createElement("p", "player-sheet-empty-state", "Item search failed."));
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
            selectedItem = null;
            addButton.disabled = true;
            setStatus("Item search failed.");
        }
    }

    function scheduleSearch() {
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }

        searchTimer = setTimeout(() => {
            searchTimer = null;
            void runSearch();
        }, ITEM_SEARCH_DEBOUNCE_MS);
    }

    searchButton.addEventListener("click", () => {
        if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
        }
        void runSearch();
    });
    searchInput.addEventListener("input", scheduleSearch);
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (searchTimer) {
                clearTimeout(searchTimer);
                searchTimer = null;
            }
            void runSearch();
        }
    });

    addButton.addEventListener("click", async () => {
        if (!selectedItem || typeof context.onChange !== "function") {
            return;
        }

        const currentItems = PlayerSheetDtoHelper.getValue(context.dto, "inventory.items", []);
        const nextItem = createInventoryItemFromCatalog(selectedItem, {
            quantity: quantityInput.value,
            equipped: equipped.input.checked,
            attuned: attuned.input.checked
        });
        const nextDto = PlayerSheetDtoHelper.patch(context.dto, "inventory.items", [
            ...currentItems,
            nextItem
        ]);
        await context.onChange(nextDto);
        dialog.close();
    });

    return dialog;
}

function createCurrencyInput(key, value) {
    const input = document.createElement("input");
    input.className = "player-sheet-input player-sheet-input--number player-sheet-currency__input";
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = String(Math.max(toNumber(value, 0), 0));
    input.dataset.currency = key;
    return input;
}

function appendCurrency(shell, currency = {}, context = {}) {
    const section = createSection("Currency");
    const form = createElement("form", "player-sheet-currency");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (typeof context.onChange !== "function") {
            return;
        }

        const nextCurrency = {};
        for (const input of form.querySelectorAll("[data-currency]")) {
            nextCurrency[input.dataset.currency] = Math.max(toNumber(input.value, 0), 0);
        }

        const nextDto = PlayerSheetDtoHelper.patch(context.dto, "inventory.currency", nextCurrency);
        await context.onChange(nextDto);
    });

    for (const key of CURRENCY_KEYS) {
        const label = createElement("label", "player-sheet-field player-sheet-currency__field");
        label.appendChild(createElement("span", "player-sheet-field__label", key.toUpperCase()));
        label.appendChild(createCurrencyInput(key, currency[key]));
        form.appendChild(label);
    }

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "player-sheet-button player-sheet-button--primary player-sheet-currency__save";
    saveButton.textContent = "Update";
    saveButton.disabled = typeof context.onChange !== "function";
    form.appendChild(saveButton);

    section.appendChild(form);
    shell.appendChild(section);
}

export async function BuildPlayerSheetGearTab(playerSheetObject, context = {}) {
    const shell = createTabShell("Gear");
    const header = shell.querySelector(".player-sheet-tab__header");
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "player-sheet-button player-sheet-button--primary";
    addButton.textContent = "Add Item";
    header.appendChild(addButton);

    const modal = buildItemSearchModal(context);
    addButton.addEventListener("click", () => {
        if (typeof modal.showModal === "function") {
            modal.showModal();
        }
    });
    shell.appendChild(modal);

    appendCurrency(shell, playerSheetObject?.inventory?.currency || {}, context);

    const resolvedItems = await resolveInventoryItems(playerSheetObject, context.api);
    const section = createSection("Items");
    if (!resolvedItems.length) {
        appendEmptyState(section, "No gear recorded.");
        shell.appendChild(section);
        return;
    }

    const list = createItemList();
    for (const { item, record, inventoryIndex } of resolvedItems) {
        list.appendChild(createItemListItem(item, record, {
            actions: [createEquipToggle(item, inventoryIndex, context)],
            rows: ["Damage", "Versatile", "AC", "Value", "Weight", "Attunement"]
        }));
    }
    section.appendChild(list);
    shell.appendChild(section);
}
