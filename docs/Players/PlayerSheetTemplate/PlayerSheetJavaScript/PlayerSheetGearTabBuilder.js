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
const SPELL_SCROLL_SEARCH_LIMIT = 25;
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
    if (!id) {
        return "";
    }

    // Most normalized catalog IDs contain colons, but promoted Eldoria
    // homebrew records retain their legacy `item-name` refs. Those IDs are
    // still canonical API entity IDs and must be hydrated before rendering;
    // search results only contain the compact summary and omit rules text.
    return id.includes(":") || /^item-[a-z0-9][a-z0-9-]*$/iu.test(id) ? id : "";
}

function getContainedSpell(item = {}) {
    return item?.containedSpell || item?.spell || null;
}

function isSpellScroll(item, record = {}) {
    const text = [
        item?.name,
        item?.catalog?.name,
        record?.name,
        record?.type,
        record?._typeHtml,
        ...(Array.isArray(record?._typeListText) ? record._typeListText : [])
    ].filter(Boolean).join(" ").toLowerCase();
    return /\bspell\s+scroll\b/u.test(text);
}

function createRemoveGearButton(item, inventoryIndex, context = {}) {
    if (!Number.isInteger(inventoryIndex) || typeof context.onChange !== "function") {
        return null;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-sheet-button player-sheet-button--small player-sheet-gear-remove";
    button.textContent = "Remove";
    button.dataset.gearRemove = String(inventoryIndex);
    button.setAttribute("aria-label", `Remove ${item?.name || "item"} from gear`);
    button.addEventListener("click", async () => {
        button.disabled = true;
        try {
            const currentItems = PlayerSheetDtoHelper.getValue(context.dto, "inventory.items", []);
            const nextItems = currentItems.filter((_, index) => index !== inventoryIndex);
            const nextDto = PlayerSheetDtoHelper.patch(context.dto, "inventory.items", nextItems);
            await context.onChange(nextDto);
        } catch (error) {
            console.error("Failed to remove gear:", error);
            button.disabled = false;
        }
    });
    return button;
}

function toSpellIdentity(spell = {}) {
    const id = String(spell.id || spell.refId || spell.sourceId || spell.ref || "").trim().replace(/\.json$/iu, "");
    return {
        ...(id ? { id } : {}),
        name: String(spell.name || spell.label || "").trim(),
        source: String(spell.source || "").trim(),
        kind: "spells"
    };
}

function spellResultMeta(spell = {}) {
    const level = Number(spell.level);
    return [
        spell.source,
        Number.isFinite(level) ? (level === 0 ? "Cantrip" : `Level ${level}`) : "",
        spell.school?.name || spell.school
    ].filter(Boolean).join(" | ");
}

function buildSpellScrollAssignmentModal(context = {}) {
    const dialog = document.createElement("dialog");
    dialog.className = "modal player-sheet__modal player-sheet__modal--spell-scroll";
    dialog.setAttribute("aria-label", "Set Spell Scroll Spell");

    const content = createElement("div", "modal-content player-sheet__modal-content");
    const header = createElement("div", "player-sheet__modal-header");
    const title = createElement("h3", "player-sheet__modal-title", "Set Scroll Spell");
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close player-sheet__modal-close";
    closeButton.textContent = "X";
    closeButton.setAttribute("aria-label", "Close Set Scroll Spell");
    closeButton.addEventListener("click", () => dialog.close());
    header.append(title, closeButton);
    content.appendChild(header);

    const picker = createElement("div", "player-sheet-catalog-picker");
    picker.dataset.mobileView = "results";
    const controls = createElement("div", "player-sheet-catalog-picker__controls");
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "player-sheet-input";
    searchInput.placeholder = "Spell name";
    const searchButton = document.createElement("button");
    searchButton.type = "button";
    searchButton.className = "player-sheet-button";
    searchButton.textContent = "Search";
    controls.append(createModalField("Search spells", searchInput), searchButton);
    picker.appendChild(controls);

    const status = createElement("p", "player-sheet-catalog-picker__status", "Search for the spell contained in this scroll.");
    picker.appendChild(status);
    const main = createElement("div", "player-sheet-catalog-picker__main");
    const results = createElement("div", "player-sheet-catalog-picker__results");
    const detail = createElement("div", "player-sheet-catalog-picker__detail");
    main.append(results, detail);
    picker.appendChild(main);

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "player-sheet-button player-sheet-catalog-picker__back";
    backButton.textContent = "Back to results";
    backButton.addEventListener("click", () => {
        picker.dataset.mobileView = "results";
        searchInput.focus({ preventScroll: true });
    });

    const footer = createElement("div", "player-sheet-catalog-picker__footer");
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "player-sheet-button player-sheet-scroll-spell-clear";
    clearButton.textContent = "Clear Spell";
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "player-sheet-button player-sheet-button--primary";
    saveButton.textContent = "Save Spell";
    footer.append(clearButton, saveButton);
    picker.appendChild(footer);
    content.appendChild(picker);
    dialog.appendChild(content);

    let inventoryIndex = -1;
    let selectedSpell = null;
    let searchToken = 0;

    function renderSelection(spell) {
        detail.replaceChildren(backButton);
        if (!spell) {
            detail.appendChild(createElement("p", "player-sheet-empty-state", "Select a spell from the results."));
            saveButton.disabled = true;
            return;
        }
        const card = createElement("article", "player-sheet-info-card player-sheet-scroll-spell-card");
        card.appendChild(createElement("h4", "player-sheet-info-card__title", spell.name || "Unknown Spell"));
        const meta = spellResultMeta(spell);
        if (meta) card.appendChild(createElement("p", "player-sheet-info-card__description", meta));
        detail.appendChild(card);
        saveButton.disabled = typeof context.onChange !== "function";
    }

    async function runSearch() {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            status.textContent = query ? "Type at least 2 characters." : "Search for the spell contained in this scroll.";
            results.replaceChildren();
            return;
        }
        if (!context.api || typeof context.api.searchCatalog !== "function") {
            status.textContent = "Spell catalog API is unavailable.";
            return;
        }

        const token = ++searchToken;
        status.textContent = "Searching spells...";
        results.replaceChildren(createElement("p", "player-sheet-empty-state", "Searching..."));
        try {
            const response = await context.api.searchCatalog("spells", query, { limit: SPELL_SCROLL_SEARCH_LIMIT });
            if (token !== searchToken) return;
            const spells = listCatalogItems(response);
            results.replaceChildren();
            if (!spells.length) {
                results.appendChild(createElement("p", "player-sheet-empty-state", "No spells found."));
            }
            for (const spell of spells) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "player-sheet-catalog-result";
                button.appendChild(createElement("span", "player-sheet-catalog-result__name", spell.name || "Unknown Spell"));
                button.appendChild(createElement("span", "player-sheet-catalog-result__meta", spellResultMeta(spell)));
                button.addEventListener("click", () => {
                    selectedSpell = toSpellIdentity(spell);
                    renderSelection({ ...spell, ...selectedSpell });
                    picker.dataset.mobileView = "detail";
                    detail.scrollTop = 0;
                });
                results.appendChild(button);
            }
            status.textContent = `${spells.length} spell${spells.length === 1 ? "" : "s"} shown.`;
        } catch (error) {
            console.error("Spell scroll search failed:", error);
            results.replaceChildren(createElement("p", "player-sheet-empty-state", "Spell search failed."));
            status.textContent = "Spell search failed.";
        }
    }

    async function saveSelection(spell) {
        if (!Number.isInteger(inventoryIndex) || typeof context.onChange !== "function") return;
        const currentItems = PlayerSheetDtoHelper.getValue(context.dto, "inventory.items", []);
        const nextItems = currentItems.map((entry, index) => index === inventoryIndex
            ? { ...entry, containedSpell: spell }
            : entry);
        const nextDto = PlayerSheetDtoHelper.patch(context.dto, "inventory.items", nextItems);
        await context.onChange(nextDto);
        dialog.close();
    }

    searchButton.addEventListener("click", () => void runSearch());
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            void runSearch();
        }
    });
    saveButton.addEventListener("click", () => void saveSelection(selectedSpell));
    clearButton.addEventListener("click", () => void saveSelection(null));

    return {
        dialog,
        open(item, index) {
            inventoryIndex = index;
            selectedSpell = getContainedSpell(item);
            title.textContent = `Set Spell: ${item?.name || "Spell Scroll"}`;
            searchInput.value = selectedSpell?.name || "";
            results.replaceChildren();
            picker.dataset.mobileView = selectedSpell ? "detail" : "results";
            renderSelection(selectedSpell);
            clearButton.hidden = !selectedSpell;
            status.textContent = selectedSpell
                ? `Currently set to ${selectedSpell.name}. Search to change it.`
                : "Search for the spell contained in this scroll.";
            if (typeof dialog.showModal === "function") dialog.showModal();
        }
    };
}

function createSpellScrollButton(item, inventoryIndex, scrollModal, context = {}) {
    if (!Number.isInteger(inventoryIndex) || typeof context.onChange !== "function") return null;
    const spell = getContainedSpell(item);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-sheet-button player-sheet-button--small player-sheet-scroll-spell";
    button.textContent = spell ? "Change Spell" : "Set Spell";
    button.dataset.scrollSpell = String(inventoryIndex);
    button.setAttribute("aria-label", `${spell ? "Change" : "Set"} spell for ${item?.name || "spell scroll"}`);
    button.addEventListener("click", () => scrollModal.open(item, inventoryIndex));
    return button;
}

function getPagedSearchState(response, skip, items) {
    const nextSkip = Number(response?.nextSkip);
    const hasExplicitPaging = response && typeof response === "object"
        && ("hasMore" in response || "nextSkip" in response);
    const hasMore = Boolean(response?.hasMore)
        || (Number.isFinite(nextSkip) && nextSkip > skip);

    return {
        hasMore: hasExplicitPaging && hasMore,
        nextSkip: hasMore && Number.isFinite(nextSkip) ? nextSkip : skip + items.length,
        nextCursor: hasMore ? String(response?.nextCursor || "") : ""
    };
}

async function searchCatalogItemPage(api, query, { skip = 0, cursor = "", signal } = {}) {
    if (api && typeof api.searchItems === "function") {
        const response = await api.searchItems(query, {
            limit: ITEM_SEARCH_LIMIT,
            ...(cursor ? { cursor } : { skip })
        }, { signal });
        const items = listCatalogItems(response);
        return { items, ...getPagedSearchState(response, skip, items) };
    }
    if (api && typeof api.searchCatalog === "function") {
        const response = await api.searchCatalog("items", query, {
            full: false,
            limit: ITEM_SEARCH_LIMIT,
            skip
        });
        const items = listCatalogItems(response);
        return {
            items,
            ...getPagedSearchState(response, skip, items)
        };
    }

    const items = await getCatalogCache(api).searchForPicker("items", query, {
        full: false,
        limit: ITEM_SEARCH_LIMIT,
        skip
    });
    return {
        items: listCatalogItems(items),
        hasMore: false,
        nextSkip: skip + listCatalogItems(items).length
    };
}

export function buildItemSearchModal(context = {}) {
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
    picker.dataset.mobileView = "results";
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

    const pager = createElement("div", "player-sheet-catalog-picker__pager");
    const loadMoreButton = document.createElement("button");
    loadMoreButton.type = "button";
    loadMoreButton.className = "player-sheet-button";
    loadMoreButton.textContent = "Load More";
    loadMoreButton.hidden = true;
    loadMoreButton.disabled = true;
    loadMoreButton.dataset.itemSearchLoadMore = "true";
    pager.appendChild(loadMoreButton);
    picker.appendChild(pager);

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
    let activeQuery = "";
    let loadedCount = 0;
    let nextSkip = 0;
    let nextCursor = "";
    let hasMore = false;
    let loadingPage = false;
    let searchAbortController = null;
    const itemDetailsById = new Map();
    let selectedResultButton = null;

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "player-sheet-button player-sheet-catalog-picker__back";
    backButton.textContent = "Back to results";
    backButton.addEventListener("click", () => {
        picker.dataset.mobileView = "results";
        selectedResultButton?.focus({ preventScroll: true });
    });

    function renderSelectedItem(item) {
        detail.replaceChildren(backButton, createItemCard(item, item, {
            badge: "Catalog",
            rows: ["Type", "Rarity", "Damage", "Versatile", "AC", "Value", "Weight", "Attunement"]
        }));

        if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 800px)").matches) {
            detail.querySelectorAll(".player-sheet-item-card__rules-details").forEach((rules) => {
                rules.open = true;
            });
        }
    }

    function setStatus(message) {
        status.textContent = message;
    }

    function updatePager() {
        const shouldShow = hasMore || loadingPage;
        loadMoreButton.hidden = !shouldShow;
        loadMoreButton.disabled = loadingPage || !hasMore;
        loadMoreButton.textContent = loadingPage ? "Loading..." : "Load More";
    }

    function setSearchIdleState(message = "Search for an item.") {
        clearElement(results);
        detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
        selectedItem = null;
        addButton.disabled = true;
        activeQuery = "";
        loadedCount = 0;
        nextSkip = 0;
        nextCursor = "";
        hasMore = false;
        loadingPage = false;
        updatePager();
        setStatus(message);
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

    async function setSelectedItem(item, button = null, options = {}) {
        const token = searchToken;
        selectedItem = item;
        selectedResultButton = button;
        results.querySelectorAll(".player-sheet-catalog-result").forEach((resultButton) => {
            resultButton.classList.toggle("player-sheet-catalog-result--selected", resultButton === button);
        });

        if (!item) {
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
            addButton.disabled = true;
            return;
        }

        renderSelectedItem(item);
        if (options.revealDetail !== false) {
            picker.dataset.mobileView = "detail";
            detail.scrollTop = 0;
        }
        addButton.disabled = typeof context.onChange !== "function";

        try {
            const fullItem = await getFullItemRecord(item);
            if (token !== searchToken) {
                return;
            }

            selectedItem = fullItem;
            renderSelectedItem(fullItem);
            if (options.revealDetail !== false) {
                detail.scrollTop = 0;
            }
            addButton.disabled = !selectedItem || typeof context.onChange !== "function";
        } catch (error) {
            if (token !== searchToken) {
                return;
            }

            console.warn("Item detail lookup failed:", error);
            selectedItem = item;
            addButton.disabled = !selectedItem || typeof context.onChange !== "function";
        }
    }

    function appendResults(items, { append = false } = {}) {
        if (!append) {
            clearElement(results);
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
            selectedItem = null;
            addButton.disabled = true;
        }

        if (!items.length && !append) {
            results.appendChild(createElement("p", "player-sheet-empty-state", "No items found."));
            return;
        }

        for (const item of items) {
            results.appendChild(buildItemResultButton(item, setSelectedItem));
        }

        const firstButton = !append ? results.querySelector(".player-sheet-catalog-result") : null;
        if (firstButton && items.length) {
            setSelectedItem(items[0], firstButton, { revealDetail: false });
        }
    }

    async function loadSearchPage({ append = false } = {}) {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            setSearchIdleState(query ? "Type at least 2 characters." : "Search for an item.");
            return;
        }

        if (!context.api) {
            setStatus("Item catalog API client is unavailable.");
            return;
        }

        if (append && (loadingPage || !hasMore || query !== activeQuery)) {
            return;
        }

        const token = searchToken + 1;
        searchToken = token;
        if (!append) {
            searchAbortController?.abort();
            searchAbortController = typeof AbortController === "function" ? new AbortController() : null;
        }
        loadingPage = true;
        updatePager();
        if (!append) {
            activeQuery = query;
            loadedCount = 0;
            nextSkip = 0;
            nextCursor = "";
            hasMore = false;
            setStatus("Searching items...");
            results.replaceChildren(createElement("p", "player-sheet-empty-state", "Searching..."));
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
            selectedItem = null;
            addButton.disabled = true;
        } else {
            setStatus(`Loading more items for "${query}"...`);
        }

        try {
            const page = await searchCatalogItemPage(context.api, query, {
                skip: append ? nextSkip : 0,
                cursor: append ? nextCursor : "",
                signal: searchAbortController?.signal
            });
            if (token !== searchToken) {
                return;
            }

            appendResults(page.items, { append });
            loadedCount = append ? loadedCount + page.items.length : page.items.length;
            nextSkip = page.nextSkip;
            nextCursor = page.nextCursor;
            hasMore = page.hasMore;
            setStatus(hasMore
                ? `${loadedCount} items shown. Scroll or load more for additional matches.`
                : `${loadedCount} item${loadedCount === 1 ? "" : "s"} shown.`);
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }
            if (token !== searchToken) {
                return;
            }
            console.error("Item catalog search failed:", error);
            results.replaceChildren(createElement("p", "player-sheet-empty-state", "Item search failed."));
            detail.replaceChildren(createElement("p", "player-sheet-empty-state", "Select an item to preview it."));
            selectedItem = null;
            addButton.disabled = true;
            setStatus("Item search failed.");
        } finally {
            if (token === searchToken) {
                loadingPage = false;
                updatePager();
            }
        }
    }

    function runSearch() {
        return loadSearchPage({ append: false });
    }

    function loadMoreResults() {
        return loadSearchPage({ append: true });
    }

    function maybeLoadMoreFromScroll() {
        if (!hasMore || loadingPage) {
            return;
        }

        const remaining = results.scrollHeight - results.scrollTop - results.clientHeight;
        if (remaining <= 64) {
            void loadMoreResults();
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
    loadMoreButton.addEventListener("click", () => {
        void loadMoreResults();
    });
    results.addEventListener("scroll", maybeLoadMoreFromScroll);

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
    const scrollSpellModal = buildSpellScrollAssignmentModal(context);
    shell.appendChild(scrollSpellModal.dialog);

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
        const scrollSpell = getContainedSpell(item);
        const actions = [createEquipToggle(item, inventoryIndex, context)];
        if (isSpellScroll(item, record)) {
            actions.push(createSpellScrollButton(item, inventoryIndex, scrollSpellModal, context));
        }
        actions.push(createRemoveGearButton(item, inventoryIndex, context));
        list.appendChild(createItemListItem(item, record, {
            actions,
            metrics: scrollSpell?.name ? [["Spell", scrollSpell.name]] : [],
            rows: ["Damage", "Versatile", "AC", "Value", "Weight", "Attunement"]
        }));
    }
    section.appendChild(list);
    shell.appendChild(section);
}
