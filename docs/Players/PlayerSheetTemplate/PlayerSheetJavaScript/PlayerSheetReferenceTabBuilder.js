import { GetJsonPathValues } from "../JsonHelpers.js";
import { createElement } from "../PlayerSheetHtmlHelper.js";
import {
    appendEmptyState,
    createDefinitionList,
    createSection,
    createTabShell
} from "./PlayerSheetTabHelpers.js";

export function BuildPlayerSheetReferenceTab(PlayerSheetObj) {
    const raceName = GetJsonPathValues(PlayerSheetObj, "identity.race.name") || "";
    const subrace = GetJsonPathValues(PlayerSheetObj, "identity.race.subrace");
    const raceLabel = raceName + (subrace ? ", " + subrace : "");
    const shell = createTabShell("Reference");

    const characterSection = createSection("Character");
    characterSection.appendChild(createDefinitionList([
        ["Alignment", GetJsonPathValues(PlayerSheetObj, "identity.alignment") || "Unspecified"],
        ["Race", raceLabel || "Unspecified"],
        ["Background", GetJsonPathValues(PlayerSheetObj, "identity.background.name") || "Unspecified"],
        ["Background Feature", GetJsonPathValues(PlayerSheetObj, "identity.background.feature") || "None"],
        ["Ruleset", GetJsonPathValues(PlayerSheetObj, "sourcePolicy.ruleset") || "Unspecified"]
    ]));
    shell.appendChild(characterSection);

    appendTrackedResources(shell, PlayerSheetObj.resources || []);
    appendClassResources(shell, PlayerSheetObj.classResources || []);

    const sourceSection = createSection("Allowed Sources");
    const sources = GetJsonPathValues(PlayerSheetObj, "sourcePolicy.allowedSources") || [];
    sourceSection.appendChild(createElement("p", "player-sheet-reference__sources", sources.length ? sources.join(", ") : "None"));
    shell.appendChild(sourceSection);
}

function appendTrackedResources(shell, resources) {
    if (!resources.length) {
        return;
    }
    const section = createSection("Tracked Resources");
    const list = createElement("div", "player-sheet-class-resource-list");
    for (const resource of resources) {
        const card = createElement("article", "player-sheet-info-card player-sheet-class-resource");
        card.appendChild(createElement("h4", "player-sheet-info-card__title", resource.name || "Resource"));
        card.appendChild(createDefinitionList([
            ["Available", `${resource.current ?? resource.max ?? 0} / ${resource.max ?? resource.current ?? 0}`],
            ["Recharge", resource.recharge || "Unspecified"],
            ["Source", resource.source || ""]
        ].filter(([, value]) => value !== "")));
        if (resource.description) {
            card.appendChild(createElement("p", "player-sheet-info-card__description", resource.description));
        }
        list.appendChild(card);
    }
    section.appendChild(list);
    shell.appendChild(section);
}

function appendClassResources(shell, resources) {
    const section = createSection("Class Resources");
    if (!resources.length) {
        appendEmptyState(section, "No class resource progression to show.");
        shell.appendChild(section);
        return;
    }

    const list = createElement("div", "player-sheet-class-resource-list");
    for (const resource of resources) {
        list.appendChild(createClassResourceCard(resource));
    }
    section.appendChild(list);
    shell.appendChild(section);
}

function createClassResourceCard(resource) {
    const card = createElement("article", "player-sheet-info-card player-sheet-class-resource");
    const title = createElement("h4", "player-sheet-info-card__title", `${resource.className} Level ${resource.classLevel}`);
    card.appendChild(title);

    const current = createElement("div", "player-sheet-class-resource__current");
    for (const entry of resource.currentValues || []) {
        const item = createElement("div", "player-sheet-class-resource__current-item");
        item.appendChild(createElement("span", "player-sheet-class-resource__current-label", entry.label));
        item.appendChild(createElement("span", "player-sheet-class-resource__current-value", entry.value));
        current.appendChild(item);
    }
    card.appendChild(current);

    for (const table of resource.tables || []) {
        card.appendChild(createClassResourceTable(table));
    }

    return card;
}

function createClassResourceTable(table) {
    const wrapper = createElement("div", "player-sheet-class-resource__table-wrap");
    const label = table.title && table.title !== "Class Progression"
        ? table.title
        : "Progression";
    wrapper.appendChild(createElement("h5", "player-sheet-class-resource__table-title", label));

    const tableElement = createElement("table", "player-sheet-class-resource__table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.appendChild(createElement("th", "", "Level"));
    for (const column of table.columns || []) {
        headerRow.appendChild(createElement("th", "", column));
    }
    thead.appendChild(headerRow);
    tableElement.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const row of table.rows || []) {
        const tr = document.createElement("tr");
        if (row.current) {
            tr.className = "player-sheet-class-resource__row--current";
        }
        tr.appendChild(createElement("th", "", String(row.level)));
        for (const column of table.columns || []) {
            const value = (row.values || []).find((entry) => entry.label === column)?.value || "";
            tr.appendChild(createElement("td", "", value));
        }
        tbody.appendChild(tr);
    }
    tableElement.appendChild(tbody);

    wrapper.appendChild(tableElement);
    return wrapper;
}
