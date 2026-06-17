import {
    appendRulesEntry,
    createDescription,
    createElement,
    createField,
    createList
} from "../../PlayerSheetHtmlHelper.js";
import {
    formatGrantGroup,
    getCatalogCache,
    getCatalogDisplayName,
    getCatalogSource,
    normalizeSearchText,
    toArray
} from "../Core/LevelEditorShared.js";

export function createCatalogDetailRow(label, value) {
    const row = createElement("div", "level-editor__catalog-detail-row");
    row.appendChild(createElement("span", "level-editor__catalog-detail-label", label));
    row.appendChild(createElement("span", "level-editor__catalog-detail-value", value || "-"));
    return row;
}

export function renderCatalogHeader(detailPane, entity, titleFallback = "Catalog Entry") {
    const header = createElement("div", "level-editor__catalog-detail-header");
    header.appendChild(createElement("h4", "level-editor__catalog-detail-title", getCatalogDisplayName(entity, titleFallback)));
    header.appendChild(createElement("p", "level-editor__catalog-detail-meta", [getCatalogSource(entity), entity?.page ? `p. ${entity.page}` : ""].filter(Boolean).join(" | ")));
    detailPane.appendChild(header);
}

export function appendCatalogDetailGrid(detailPane, rows) {
    const detailGrid = createElement("div", "level-editor__catalog-detail-grid");
    for (const [label, value] of rows) {
        detailGrid.appendChild(createCatalogDetailRow(label, value));
    }
    detailPane.appendChild(detailGrid);
}

export function appendCatalogListSection(detailPane, title, items, emptyText = "") {
    const normalizedItems = toArray(items).filter(Boolean);
    if (!normalizedItems.length && !emptyText) {
        return;
    }

    const section = createElement("section", "level-editor__catalog-section");
    section.appendChild(createElement("h4", "level-editor__catalog-section-title", title));
    section.appendChild(createList(normalizedItems, emptyText));
    detailPane.appendChild(section);
}

export function appendCatalogEntriesSection(detailPane, title, entries) {
    if (!toArray(entries).length) {
        return;
    }

    const section = createElement("section", "level-editor__catalog-section");
    section.appendChild(createElement("h4", "level-editor__catalog-section-title", title));
    appendRulesEntry(section, entries);
    detailPane.appendChild(section);
}

export function renderProficiencyGrants(title, grants) {
    const rows = [];
    for (const [label, key] of [
        ["Armor", "armor"],
        ["Weapons", "weapons"],
        ["Tools", "tools"],
        ["Skills", "skills"],
        ["Languages", "languages"]
    ]) {
        const value = formatGrantGroup(grants?.[key]);
        if (value) {
            rows.push(`${label}: ${value}`);
        }
    }

    if (!rows.length) {
        return null;
    }

    const section = createElement("section", "level-editor__catalog-section");
    section.appendChild(createElement("h4", "level-editor__catalog-section-title", title));
    section.appendChild(createList(rows, ""));
    return section;
}

export function buildCatalogPickerContent(context, options) {
    const fragment = document.createDocumentFragment();
    const dto = context.dto;
    const onChange = context.onChange;
    const catalog = getCatalogCache(context.api);
    let selectedItem = null;
    let allItems = [];
    let searchToken = 0;
    let searchTimer = null;

    const wrapper = createElement("div", "level-editor__catalog-picker");
    const controls = createElement("div", "level-editor__catalog-controls");
    const searchInput = document.createElement("input");
    searchInput.className = "level-editor__input";
    searchInput.type = "search";
    searchInput.placeholder = `Filter ${options.pluralLabel || options.label || "entries"}`;
    searchInput.value = "";

    const filterButton = document.createElement("button");
    filterButton.className = "level-editor__button";
    filterButton.type = "button";
    filterButton.textContent = "Filter";
    controls.appendChild(createField(options.searchLabel || "Name", searchInput));
    controls.appendChild(filterButton);

    const status = createElement("p", "level-editor__catalog-status", catalog ? `Loading ${options.pluralLabel || "catalog"}...` : "Catalog API client is unavailable.");
    const main = createElement("div", "level-editor__catalog-picker-main");
    const results = createElement("div", "level-editor__catalog-results");
    const detailPane = createElement("div", "level-editor__catalog-detail");
    const footer = createElement("div", "level-editor__catalog-picker-footer");
    const acceptButton = document.createElement("button");
    acceptButton.className = "level-editor__button level-editor__button--primary";
    acceptButton.type = "button";
    acceptButton.textContent = "Accept";
    acceptButton.disabled = true;
    const extraControls = typeof options.buildExtraControls === "function"
        ? options.buildExtraControls({ onValidityChange: syncAcceptButton })
        : null;
    const extraControlElement = extraControls?.element || extraControls || null;
    const getExtraValue = typeof extraControls?.getValue === "function" ? extraControls.getValue : () => undefined;
    const extraControlsPlacement = options.extraControlsPlacement || "top";
    const extraControlsInDetail = extraControlsPlacement === "detail";

    if (extraControlElement && !extraControlsInDetail) {
        wrapper.classList.add("level-editor__catalog-picker--with-extra");
    }

    function setStatus(message) {
        status.textContent = message;
    }

    function extraControlsAreValid() {
        return typeof extraControls?.isValid !== "function" || extraControls.isValid(selectedItem);
    }

    function syncAcceptButton() {
        acceptButton.disabled = !selectedItem || !extraControlsAreValid();
    }

    function setSelectedItem(item, button = null) {
        selectedItem = item;

        results.querySelectorAll(".level-editor__catalog-result").forEach((resultButton) => {
            resultButton.classList.toggle("level-editor__catalog-result--selected", resultButton === button);
        });

        options.renderDetail(detailPane, item);
        if (typeof extraControls?.setItem === "function") {
            extraControls.setItem(item);
        }
        if (extraControlsInDetail && extraControlElement) {
            detailPane.appendChild(extraControlElement);
        }
        syncAcceptButton();
    }

    function getFilteredItems() {
        const terms = normalizeSearchText(searchInput.value).split(/\s+/u).filter(Boolean);
        if (!terms.length) {
            return allItems;
        }

        return allItems.filter((item) => {
            const searchable = options.getFilterText(item);
            return terms.every((term) => searchable.includes(term));
        });
    }

    function renderResults(items, preferredItem = null) {
        results.replaceChildren();

        if (!items.length) {
            results.appendChild(createDescription(allItems.length ? `No ${options.pluralLabel || "entries"} match the current filter.` : `No ${options.pluralLabel || "entries"} found.`));
            setSelectedItem(null);
            return;
        }

        let preferredButton = null;
        let currentButton = null;

        for (const item of items) {
            const resultButton = document.createElement("button");
            resultButton.type = "button";
            resultButton.className = "level-editor__catalog-result";

            const name = createElement("span", "level-editor__catalog-result-name", options.getDisplayName(item));
            const meta = createElement("span", "level-editor__catalog-result-meta", options.getMeta(item));
            resultButton.appendChild(name);
            resultButton.appendChild(meta);
            resultButton.addEventListener("click", () => {
                setSelectedItem(item, resultButton);
            });
            results.appendChild(resultButton);

            if (item === preferredItem) {
                preferredButton = resultButton;
            }

            if (!currentButton && options.isCurrent(item)) {
                currentButton = resultButton;
            }
        }

        const selectedButton = preferredButton || currentButton || results.querySelector(".level-editor__catalog-result");
        const selectedIndex = Array.from(results.children).indexOf(selectedButton);
        setSelectedItem(items[selectedIndex] || items[0], selectedButton);
    }

    function applyFilter() {
        const filteredItems = getFilteredItems();
        renderResults(filteredItems, selectedItem && filteredItems.includes(selectedItem) ? selectedItem : null);
        const query = searchInput.value.trim();
        setStatus(query
            ? `${filteredItems.length} of ${allItems.length} ${options.pluralLabel || "entries"} shown.`
            : `${allItems.length} ${options.pluralLabel || "entries"} loaded.`);
    }

    async function loadItems() {
        if (!catalog) {
            return;
        }

        const token = searchToken + 1;
        searchToken = token;
        setStatus(`Loading ${options.pluralLabel || "entries"}...`);
        results.replaceChildren();
        results.appendChild(createDescription(`Loading ${options.pluralLabel || "entries"}...`));
        setSelectedItem(null);

        try {
            const items = await catalog.searchForPicker(options.kind, "", {
                full: true
            });

            if (token !== searchToken) {
                return;
            }

            allItems = typeof options.filterItems === "function" ? items.filter(options.filterItems) : items;
            applyFilter();
        } catch (error) {
            if (token !== searchToken) {
                return;
            }
            console.error(`${options.label || "Catalog"} load failed:`, error);
            results.replaceChildren();
            results.appendChild(createDescription(`${options.label || "Catalog"} load failed. Check the API connection and try again.`));
            setSelectedItem(null);
            setStatus(`${options.label || "Catalog"} load failed.`);
        }
    }

    function scheduleFilter() {
        if (searchTimer) {
            clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(applyFilter, 250);
    }

    searchInput.addEventListener("input", scheduleFilter);
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            applyFilter();
        }
    });
    filterButton.addEventListener("click", applyFilter);

    acceptButton.addEventListener("click", () => {
        if (!selectedItem || typeof onChange !== "function") {
            return;
        }

        if (!extraControlsAreValid()) {
            setStatus(typeof extraControls?.getInvalidMessage === "function"
                ? extraControls.getInvalidMessage(selectedItem)
                : "Complete the required choices before accepting.");
            syncAcceptButton();
            return;
        }

        const nextDto = options.applySelection(dto, selectedItem, getExtraValue());
        onChange(nextDto);
        acceptButton.closest("dialog")?.close();
    });

    main.appendChild(results);
    main.appendChild(detailPane);
    footer.appendChild(acceptButton);
    wrapper.appendChild(controls);
    wrapper.appendChild(status);
    if (extraControlElement && !extraControlsInDetail) {
        wrapper.appendChild(extraControlElement);
    }
    wrapper.appendChild(main);
    wrapper.appendChild(footer);
    fragment.appendChild(wrapper);

    options.renderDetail(detailPane, null);
    if (catalog) {
        void loadItems();
    }

    return fragment;
}
