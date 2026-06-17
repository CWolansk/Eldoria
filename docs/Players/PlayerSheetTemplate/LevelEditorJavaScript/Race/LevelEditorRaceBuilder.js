import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    appendRulesEntry,
    createDescription,
    createElement,
    createField
} from "../../PlayerSheetHtmlHelper.js";
import {
    createRaceDto,
    formatAbilityGrant,
    formatChoice,
    formatGrantGroup,
    formatSpellGrant,
    getCatalogCache,
    getFirstRulesText,
    getRaceDisplayName,
    getRaceDtoId,
    getRaceSize,
    getRaceSource,
    getRaceSpeed,
    normalizeSearchText,
    raceGrantsFeatChoice,
    stripJsonExtension,
    toArray
} from "../Core/LevelEditorShared.js";
import { buildRaceProfile } from "./LevelEditorRaceProfile.js";

export function createRaceDetailRow(label, value) {
    const row = createElement("div", "level-editor__race-detail-row");
    row.appendChild(createElement("span", "level-editor__race-detail-label", label));
    row.appendChild(createElement("span", "level-editor__race-detail-value", value || "-"));
    return row;
}

export function appendRaceEntry(container, entry) {
    appendRulesEntry(container, entry);
}

function toGrantEntries(value) {
    if (Array.isArray(value)) {
        return value;
    }

    return value ? [value] : [];
}

export function renderRaceGrants(race) {
    const grants = race?.grants || {};
    const items = [];
    const ability = toArray(grants.ability).map(formatAbilityGrant).filter(Boolean).join("; ");

    if (ability) {
        items.push(["Ability", ability]);
    }

    for (const [label, key] of [
        ["Armor", "armor"],
        ["Weapons", "weapons"],
        ["Tools", "tools"],
        ["Skills", "skills"],
        ["Languages", "languages"],
        ["Skill/Tool/Language", "skillToolLanguages"],
        ["Feats", "feats"]
    ]) {
        const value = formatGrantGroup(grants[key]);
        if (value) {
            items.push([label, value]);
        }
    }

    const spells = toGrantEntries(grants.spells).map(formatSpellGrant).filter(Boolean).join("; ");
    if (spells) {
        items.push(["Spells", spells]);
    }

    if (!items.length) {
        return null;
    }

    const section = createElement("section", "level-editor__race-section");
    section.appendChild(createElement("h4", "level-editor__race-section-title", "Grants"));
    const list = createElement("ul", "level-editor__race-summary-list");
    for (const [label, value] of items) {
        const li = document.createElement("li");
        li.appendChild(createElement("strong", "", `${label}: `));
        li.appendChild(document.createTextNode(value));
        list.appendChild(li);
    }
    section.appendChild(list);
    return section;
}

export function renderRaceChoices(race) {
    const choices = toArray(race?.choiceDefinitions);
    if (!choices.length) {
        return null;
    }

    const section = createElement("section", "level-editor__race-section");
    section.appendChild(createElement("h4", "level-editor__race-section-title", "Choices"));
    const list = createElement("ul", "level-editor__race-summary-list");
    for (const choice of choices) {
        const label = choice.label || choice.type || "Choice";
        const prompt = choice.prompt || formatChoice(choice);
        const li = document.createElement("li");
        li.appendChild(createElement("strong", "", `${label}: `));
        li.appendChild(document.createTextNode(prompt));
        list.appendChild(li);
    }
    section.appendChild(list);
    return section;
}

export function renderRaceDetail(detailPane, race, parentRace = null) {
    detailPane.replaceChildren();

    if (!race) {
        detailPane.appendChild(createDescription("Pick a race to preview its catalog details."));
        return;
    }

    const header = createElement("div", "level-editor__race-detail-header");
    header.appendChild(createElement("h4", "level-editor__race-detail-title", getRaceDisplayName(race)));
    header.appendChild(createElement("p", "level-editor__race-detail-meta", [getRaceSource(race), race.page ? `p. ${race.page}` : ""].filter(Boolean).join(" | ")));
    detailPane.appendChild(header);

    const summary = getFirstRulesText(race.entries);
    if (summary) {
        detailPane.appendChild(createElement("p", "level-editor__race-summary", summary));
    }

    const detailGrid = createElement("div", "level-editor__race-detail-grid");
    detailGrid.appendChild(createRaceDetailRow("Race", race.raceName || race.name || ""));
    detailGrid.appendChild(createRaceDetailRow("Subrace", race.subraceName || ""));
    detailGrid.appendChild(createRaceDetailRow("Size", getRaceSize(race, parentRace)));
    detailGrid.appendChild(createRaceDetailRow("Speed", getRaceSpeed(race, parentRace)));
    detailGrid.appendChild(createRaceDetailRow("Traits", toArray(race.traits).join(", ")));
    detailGrid.appendChild(createRaceDetailRow("Catalog ID", getRaceDtoId(race)));
    if (parentRace) {
        detailGrid.appendChild(createRaceDetailRow("Parent", getRaceDisplayName(parentRace)));
    }
    detailPane.appendChild(detailGrid);

    const grants = renderRaceGrants(race);
    if (grants) {
        detailPane.appendChild(grants);
    }

    const choices = renderRaceChoices(race);
    if (choices) {
        detailPane.appendChild(choices);
    }

    if (toArray(race.entries).length) {
        const section = createElement("section", "level-editor__race-section");
        section.appendChild(createElement("h4", "level-editor__race-section-title", "Rules Text"));
        appendRaceEntry(section, race.entries);
        detailPane.appendChild(section);
    }
}

function getRaceFilterText(race) {
    return normalizeSearchText([
        getRaceDisplayName(race),
        race?.raceName,
        race?.subraceName,
        getRaceSource(race),
        toArray(race?.traits).join(" ")
    ].filter(Boolean).join(" "));
}

export function buildRaceContent(context) {
    const fragment = document.createDocumentFragment();
    const dto = context.dto;
    const onChange = context.onChange;
    const currentRace = dto?.baseChoices?.race || {};
    const catalog = getCatalogCache(context.api);
    let selectedRace = null;
    let selectedParentRace = null;
    let allRaces = [];
    let searchToken = 0;
    let searchTimer = null;

    const wrapper = createElement("div", "level-editor__race-picker");
    const controls = createElement("div", "level-editor__race-controls");
    const searchInput = document.createElement("input");
    searchInput.className = "level-editor__input";
    searchInput.type = "search";
    searchInput.placeholder = "Filter races";
    searchInput.value = "";

    const searchButton = document.createElement("button");
    searchButton.className = "level-editor__button";
    searchButton.type = "button";
    searchButton.textContent = "Filter";
    controls.appendChild(createField("Race Name", searchInput));
    controls.appendChild(searchButton);

    const status = createElement("p", "level-editor__race-status", catalog ? "Loading race catalog..." : "Race catalog API client is unavailable.");
    const main = createElement("div", "level-editor__race-picker-main");
    const results = createElement("div", "level-editor__race-results");
    const detailPane = createElement("div", "level-editor__race-detail");
    const footer = createElement("div", "level-editor__race-picker-footer");
    const acceptButton = document.createElement("button");
    acceptButton.className = "level-editor__button level-editor__button--primary";
    acceptButton.type = "button";
    acceptButton.textContent = "Accept";
    acceptButton.disabled = true;

    function setStatus(message) {
        status.textContent = message;
    }

    function setSelectedRace(race, button = null) {
        selectedRace = race;
        selectedParentRace = null;
        acceptButton.disabled = !race;

        results.querySelectorAll(".level-editor__race-result").forEach((resultButton) => {
            resultButton.classList.toggle("level-editor__race-result--selected", resultButton === button);
        });

        renderRaceDetail(detailPane, race);

        if (race?.parentId && catalog) {
            catalog.getById("races", race.parentId)
                .then((parentRace) => {
                    if (selectedRace === race) {
                        selectedParentRace = parentRace;
                        renderRaceDetail(detailPane, race, parentRace);
                    }
                })
                .catch(() => {
                    selectedParentRace = null;
                });
        }
    }

    function isCurrentRace(race) {
        const currentIds = [
            currentRace.id,
            currentRace.ref,
            currentRace.refId,
            currentRace.sourceId,
            currentRace.options?.ref,
            currentRace.options?.refId,
            currentRace.options?.sourceId,
            currentRace.options?.catalogId
        ]
            .map((value) => normalizeSearchText(stripJsonExtension(value)))
            .filter(Boolean);
        const raceId = normalizeSearchText(getRaceDtoId(race));

        if (raceId && currentIds.includes(raceId)) {
            return true;
        }

        const currentName = normalizeSearchText(currentRace.name);
        const currentSubrace = normalizeSearchText(currentRace.subrace);
        const currentSource = normalizeSearchText(currentRace.source);
        const raceName = normalizeSearchText(race.raceName || race.name);
        const displayName = normalizeSearchText(getRaceDisplayName(race));
        const subraceName = normalizeSearchText(race.subraceName);
        const raceSource = normalizeSearchText(getRaceSource(race));

        if (currentSubrace) {
            return currentName === raceName
                && currentSubrace === subraceName
                && (!currentSource || currentSource === raceSource);
        }

        return Boolean(currentName)
            && (currentName === displayName || currentName === raceName)
            && (!currentSource || currentSource === raceSource);
    }

    function getFilteredRaces() {
        const terms = normalizeSearchText(searchInput.value).split(/\s+/u).filter(Boolean);
        if (!terms.length) {
            return allRaces;
        }

        return allRaces.filter((race) => {
            const searchable = getRaceFilterText(race);
            return terms.every((term) => searchable.includes(term));
        });
    }

    function renderResults(races, preferredRace = null) {
        results.replaceChildren();

        if (!races.length) {
            results.appendChild(createDescription(allRaces.length ? "No races match the current filter." : "No races found."));
            setSelectedRace(null);
            return;
        }

        let selectedButton = null;
        let preferredButton = null;
        let currentButton = null;

        for (const race of races) {
            const resultButton = document.createElement("button");
            resultButton.type = "button";
            resultButton.className = "level-editor__race-result";

            const name = createElement("span", "level-editor__race-result-name", getRaceDisplayName(race));
            const meta = createElement("span", "level-editor__race-result-meta", [getRaceSource(race), race.subraceName ? "Subrace" : "Race"].filter(Boolean).join(" | "));
            resultButton.appendChild(name);
            resultButton.appendChild(meta);
            resultButton.addEventListener("click", () => {
                setSelectedRace(race, resultButton);
            });
            results.appendChild(resultButton);

            if (race === preferredRace) {
                preferredButton = resultButton;
            }

            if (!currentButton && isCurrentRace(race)) {
                currentButton = resultButton;
            }
        }

        selectedButton = preferredButton || currentButton || results.querySelector(".level-editor__race-result");
        const selectedIndex = Array.from(results.children).indexOf(selectedButton);
        setSelectedRace(races[selectedIndex] || races[0], selectedButton);
    }

    function applyRaceFilter() {
        const filteredRaces = getFilteredRaces();
        renderResults(filteredRaces, selectedRace && filteredRaces.includes(selectedRace) ? selectedRace : null);
        const query = searchInput.value.trim();
        setStatus(query
            ? `${filteredRaces.length} of ${allRaces.length} race${allRaces.length === 1 ? "" : "s"} shown.`
            : `${allRaces.length} race${allRaces.length === 1 ? "" : "s"} loaded.`);
    }

    async function loadRaces() {
        if (!catalog) {
            return;
        }

        const token = searchToken + 1;
        searchToken = token;
        setStatus("Loading races...");
        results.replaceChildren();
        results.appendChild(createDescription("Loading races..."));
        setSelectedRace(null);

        try {
            const races = await catalog.searchForPicker("races", "", {
                full: true
            });

            if (token !== searchToken) {
                return;
            }

            allRaces = races;
            applyRaceFilter();
        } catch (error) {
            if (token !== searchToken) {
                return;
            }
            console.error("Race catalog load failed:", error);
            results.replaceChildren();
            results.appendChild(createDescription("Race catalog load failed. Check the API connection and try again."));
            setSelectedRace(null);
            setStatus("Race catalog load failed.");
        }
    }

    function scheduleSearch() {
        if (searchTimer) {
            clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(() => {
            applyRaceFilter();
        }, 250);
    }

    searchInput.addEventListener("input", scheduleSearch);
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            applyRaceFilter();
        }
    });
    searchButton.addEventListener("click", () => {
        applyRaceFilter();
    });

    acceptButton.addEventListener("click", () => {
        if (!selectedRace || typeof onChange !== "function") {
            return;
        }

        const raceDto = createRaceDto(selectedRace, selectedParentRace);
        const profile = buildRaceProfile(selectedRace, selectedParentRace);
        if (profile) {
            raceDto.profile = profile;
        }
        let nextDto = PlayerSheetDtoHelper.patch(dto, "baseChoices.race", raceDto);
        nextDto = PlayerSheetDtoHelper.patch(nextDto, "baseChoices.subrace", null);
        nextDto = PlayerSheetDtoHelper.patch(nextDto, "baseChoices.raceChoices", {});
        nextDto = PlayerSheetDtoHelper.patch(nextDto, "baseChoices.proficiencyChoices", {});
        if (!raceGrantsFeatChoice(selectedRace)) {
            nextDto = PlayerSheetDtoHelper.patch(nextDto, "levels.0.feat", null);
        }
        onChange(nextDto);
        acceptButton.closest("dialog")?.close();
    });

    main.appendChild(results);
    main.appendChild(detailPane);
    footer.appendChild(acceptButton);
    wrapper.appendChild(controls);
    wrapper.appendChild(status);
    wrapper.appendChild(main);
    wrapper.appendChild(footer);
    fragment.appendChild(wrapper);

    renderRaceDetail(detailPane, null);
    if (catalog) {
        void loadRaces();
    }

    return fragment;
}
