import {
    formatRulesText,
    toArray,
    toNumber
} from "./LevelEditorJavaScript/Core/LevelEditorShared.js";

const DEFAULT_RULE_ENTRY_CLASSES = {
    text: "level-editor__race-entry-text",
    list: "level-editor__race-entry-list",
    table: "level-editor__race-table",
    section: "level-editor__race-entry",
    title: "level-editor__race-entry-title"
};

export function emitEditorChange(type, detail) {
    document.dispatchEvent(new CustomEvent("eldoria:level-editor-change", {
        detail: {
            type,
            ...detail
        }
    }));
}

export function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text) {
        element.textContent = text;
    }
    return element;
}

export function createDescription(text) {
    return createElement("p", "level-editor__modal-description", text);
}

export function createField(labelText, input) {
    const field = createElement("label", "level-editor__field");
    const label = createElement("span", "level-editor__field-label", labelText);
    field.appendChild(label);
    field.appendChild(input);
    return field;
}

export function createTextInput(label, value, detail) {
    const input = document.createElement("input");
    input.className = "level-editor__input";
    input.type = "text";
    input.value = value || "";
    input.addEventListener("input", () => {
        emitEditorChange(detail.type, {
            ...detail,
            value: input.value
        });
    });

    return createField(label, input);
}

export function createNumberInput(label, value, detail, options = {}) {
    const input = document.createElement("input");
    input.className = "level-editor__input level-editor__input--number";
    input.type = "number";
    input.value = String(value ?? "");
    input.min = String(options.min ?? 0);
    input.max = String(options.max ?? 999);
    input.step = String(options.step ?? 1);
    input.readOnly = Boolean(options.readOnly);
    input.addEventListener("input", () => {
        emitEditorChange(detail.type, {
            ...detail,
            value: toNumber(input.value, 0)
        });
    });

    return { field: createField(label, input), input };
}

export function createTextarea(label, value, detail, options = {}) {
    const textarea = document.createElement("textarea");
    textarea.className = "level-editor__textarea";
    textarea.value = value || "";
    textarea.rows = options.rows || 2;
    textarea.readOnly = Boolean(options.readOnly);
    textarea.addEventListener("input", () => {
        emitEditorChange(detail.type, {
            ...detail,
            value: textarea.value
        });
    });

    return createField(label, textarea);
}

export function createCheckbox(label, checked, detail) {
    const wrapper = createElement("label", "level-editor__checkbox");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(checked);
    input.addEventListener("change", () => {
        emitEditorChange(detail.type, {
            ...detail,
            value: input.checked
        });
    });

    wrapper.appendChild(input);
    wrapper.appendChild(createElement("span", "", label));
    return wrapper;
}

export function createSelect(label, options, selectedValue, detail) {
    const select = document.createElement("select");
    select.className = "level-editor__select";

    for (const option of options) {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        optionElement.selected = option.value === selectedValue;
        select.appendChild(optionElement);
    }

    select.addEventListener("change", () => {
        emitEditorChange(detail.type, {
            ...detail,
            value: select.value
        });
    });

    return createField(label, select);
}

export function createList(items, emptyText) {
    const list = document.createElement("ul");
    list.className = "level-editor__mini-list";

    const normalizedItems = toArray(items).filter(Boolean);
    if (!normalizedItems.length) {
        list.appendChild(createElement("li", "", emptyText));
        return list;
    }

    for (const item of normalizedItems) {
        list.appendChild(createElement("li", "", item));
    }

    return list;
}

function formatReferenceEntry(entry) {
    if (!entry || typeof entry !== "object") {
        return "";
    }

    const raw = entry.optionalfeature
        || entry.classFeature
        || entry.subclassFeature
        || entry.feat
        || entry.item
        || entry.spell
        || entry.ref
        || "";
    if (!raw) {
        return "";
    }

    const [name, source] = String(raw).split("|").map((part) => part.trim()).filter(Boolean);
    return [name || raw, source ? `(${source})` : ""].filter(Boolean).join(" ");
}

function appendReferenceText(container, text, classes) {
    if (!text) {
        return;
    }

    const tagName = String(container?.tagName || container?.tag || "").toLowerCase();
    const element = createElement(tagName === "li" ? "span" : "p", classes.text, formatRulesText(text));
    container.appendChild(element);
}

export function appendRulesEntry(container, entry, classNames = DEFAULT_RULE_ENTRY_CLASSES) {
    const classes = {
        ...DEFAULT_RULE_ENTRY_CLASSES,
        ...classNames
    };

    if (!entry) {
        return;
    }

    if (typeof entry === "string") {
        const text = formatRulesText(entry);
        if (text) {
            container.appendChild(createElement("p", classes.text, text));
        }
        return;
    }

    if (Array.isArray(entry)) {
        for (const item of entry) {
            appendRulesEntry(container, item, classes);
        }
        return;
    }

    if (entry.type === "options" && Array.isArray(entry.entries)) {
        const list = createElement("ul", classes.list);
        for (const item of entry.entries) {
            const li = document.createElement("li");
            appendRulesEntry(li, item, classes);
            list.appendChild(li);
        }
        container.appendChild(list);
        return;
    }

    if (entry.type === "list" && Array.isArray(entry.items)) {
        const list = createElement("ul", classes.list);
        for (const item of entry.items) {
            const li = document.createElement("li");
            appendRulesEntry(li, item, classes);
            list.appendChild(li);
        }
        container.appendChild(list);
        return;
    }

    if (entry.type === "table" && Array.isArray(entry.rows)) {
        const table = createElement("table", classes.table);
        if (Array.isArray(entry.colLabels)) {
            const thead = document.createElement("thead");
            const tr = document.createElement("tr");
            for (const label of entry.colLabels) {
                tr.appendChild(createElement("th", "", formatRulesText(label)));
            }
            thead.appendChild(tr);
            table.appendChild(thead);
        }
        const tbody = document.createElement("tbody");
        for (const row of entry.rows) {
            const tr = document.createElement("tr");
            for (const cell of toArray(row)) {
                const text = typeof cell === "string" ? cell : cell?.name || cell?.entry || JSON.stringify(cell);
                tr.appendChild(createElement("td", "", formatRulesText(text)));
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        container.appendChild(table);
        return;
    }

    if (String(entry.type || "").startsWith("ref")) {
        appendReferenceText(container, formatReferenceEntry(entry), classes);
        return;
    }

    if (entry.name || entry.entries) {
        const section = createElement("section", classes.section);
        if (entry.name) {
            section.appendChild(createElement("h5", classes.title, formatRulesText(entry.name)));
        }
        appendRulesEntry(section, entry.entries || entry.items, classes);
        container.appendChild(section);
        return;
    }

    container.appendChild(createElement("p", classes.text, formatRulesText(JSON.stringify(entry))));
}

export function buildModalHtml(containerObj, config) {
    if (!containerObj) {
        return;
    }

    const type = config.type || config.label;
    const modalId = config.modalId || `level-editor-${type}-modal`;
    let body = null;
    let contentBuilt = false;

    function buildBodyContent() {
        if (!body || contentBuilt) {
            return;
        }

        const content = typeof config.buildContent === "function"
            ? config.buildContent()
            : createDescription("No editor fields are configured yet.");
        body.replaceChildren(content);
        contentBuilt = true;
    }

    containerObj.classList.add("level-editor__row", `level-editor__row--${type}`);
    containerObj.dataset.editorControl = type;
    if (config.characterLevel) {
        containerObj.dataset.characterLevel = String(config.characterLevel);
    }

    const rowMain = createElement("div", "level-editor__row-main");
    const rowLabel = createElement("span", "level-editor__row-label", config.label);
    const rowValue = createElement("span", "level-editor__row-value", config.status || "Unset");
    rowMain.appendChild(rowLabel);
    rowMain.appendChild(rowValue);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-editor__button";
    button.textContent = config.buttonText || "Edit";

    const dialog = document.createElement("dialog");
    dialog.id = modalId;
    dialog.className = `modal level-editor__modal level-editor__modal--${type}`;
    dialog.setAttribute("aria-label", config.label);

    button.addEventListener("click", () => {
        buildBodyContent();
        if (typeof dialog.showModal === "function") {
            dialog.showModal();
        }
    });

    const dialogContent = createElement("div", "modal-content level-editor__modal-content");
    const modalHeader = createElement("div", "level-editor__modal-header");
    modalHeader.appendChild(createElement("h3", "level-editor__modal-title", config.label));

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close level-editor__close";
    closeButton.textContent = "X";
    closeButton.setAttribute("aria-label", `Close ${config.label}`);
    closeButton.addEventListener("click", () => {
        dialog.close();
    });

    modalHeader.appendChild(closeButton);
    dialogContent.appendChild(modalHeader);

    if (config.description) {
        dialogContent.appendChild(createDescription(config.description));
    }

    body = createElement("div", "level-editor__modal-body");
    if (config.lazyContent) {
        body.appendChild(createDescription(config.lazyDescription || "Loading options..."));
    } else {
        buildBodyContent();
    }
    dialogContent.appendChild(body);
    dialog.appendChild(dialogContent);

    containerObj.replaceChildren(rowMain, button, dialog);
}

export function buildInfoRow(config) {
    const row = createElement("div", `level-editor__row level-editor__row--${config.type}`);
    row.id = config.id;
    row.dataset.editorControl = config.type;
    if (config.characterLevel) {
        row.dataset.characterLevel = String(config.characterLevel);
    }

    const label = createElement("span", "level-editor__row-label", config.label);
    const value = createElement("span", "level-editor__row-value", config.value || "None.");
    row.appendChild(label);
    row.appendChild(value);
    return row;
}
