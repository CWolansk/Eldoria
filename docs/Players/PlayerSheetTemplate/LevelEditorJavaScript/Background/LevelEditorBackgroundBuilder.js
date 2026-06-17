import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createDescription,
    createElement
} from "../../PlayerSheetHtmlHelper.js";
import {
    appendCatalogDetailGrid,
    appendCatalogEntriesSection,
    appendCatalogListSection,
    buildCatalogPickerContent,
    renderCatalogHeader
} from "../Catalog/LevelEditorCatalogPicker.js";
import {
    createBackgroundDto,
    getCatalogDisplayName,
    getCatalogDtoId,
    getCatalogFilterText,
    getCatalogSource,
    getFirstRulesText,
    identityMatchesCatalogEntity
} from "../Core/LevelEditorShared.js";
import {
    buildBackgroundProfile
} from "../CatalogProfile/Builder.js";
import {
    formatProfileOptionSummaries
} from "../CatalogProfile/Formatter.js";
import {
    renderRaceChoices,
    renderRaceGrants
} from "../Race/LevelEditorRaceBuilder.js";

export function renderBackgroundDetail(detailPane, backgroundRecord) {
    // Rebuild the right-side preview for the currently highlighted background record.
    detailPane.replaceChildren();

    if (!backgroundRecord) {
        detailPane.appendChild(createDescription("Pick a background to preview its catalog details."));
        return;
    }

    renderCatalogHeader(detailPane, backgroundRecord, "Background");
    appendCatalogDetailGrid(detailPane, [
        ["Feature", backgroundRecord.feature || ""],
        ["Choices", backgroundRecord.hasChoices ? "Yes" : "No"],
        ["Catalog ID", getCatalogDtoId(backgroundRecord)]
    ]);

    const grantSummaryElement = renderRaceGrants(backgroundRecord);
    if (grantSummaryElement) {
        detailPane.appendChild(grantSummaryElement);
    }

    const choiceSummaryElement = renderRaceChoices(backgroundRecord);
    if (choiceSummaryElement) {
        detailPane.appendChild(choiceSummaryElement);
    }

    appendCatalogListSection(
        detailPane,
        "Player Options",
        formatProfileOptionSummaries(buildBackgroundProfile(backgroundRecord)),
        ""
    );

    const backgroundRulesEntries = backgroundRecord.entries || backgroundRecord.raw?.entries || [];
    const firstRulesSummary = getFirstRulesText(backgroundRulesEntries);
    if (firstRulesSummary) {
        detailPane.appendChild(createElement("p", "level-editor__catalog-summary", firstRulesSummary));
    }

    appendCatalogEntriesSection(detailPane, "Rules Text", backgroundRulesEntries);
}

export function buildBackgroundContent(editorContext) {
    // Build the catalog picker that writes the selected background and its profile into the DTO.
    const selectedBackgroundIdentity = editorContext.dto?.baseChoices?.background || {};

    return buildCatalogPickerContent(editorContext, {
        kind: "backgrounds",
        label: "Background",
        pluralLabel: "backgrounds",
        searchLabel: "Background Name",
        getDisplayName: (backgroundRecord) => getCatalogDisplayName(backgroundRecord, "Unknown Background"),
        getMeta: (backgroundRecord) => [getCatalogSource(backgroundRecord), backgroundRecord.feature].filter(Boolean).join(" | "),
        getFilterText: (backgroundRecord) => getCatalogFilterText(backgroundRecord, [
            backgroundRecord.feature,
            getFirstRulesText(backgroundRecord.entries || backgroundRecord.raw?.entries),
            JSON.stringify(backgroundRecord.grants || {})
        ]),
        isCurrent: (backgroundRecord) => identityMatchesCatalogEntity(backgroundRecord, [selectedBackgroundIdentity]),
        renderDetail: renderBackgroundDetail,
        applySelection: (characterDto, backgroundRecord) => {
            // Store the normalized identity and reset dependent background choices.
            const backgroundDto = createBackgroundDto(backgroundRecord);
            backgroundDto.profile = buildBackgroundProfile(backgroundRecord);
            let nextDto = PlayerSheetDtoHelper.patch(characterDto, "baseChoices.background", backgroundDto);
            nextDto = PlayerSheetDtoHelper.patch(nextDto, "baseChoices.backgroundChoices", {});
            return nextDto;
        }
    });
}
