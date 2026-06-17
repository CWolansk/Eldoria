import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createDescription
} from "../../PlayerSheetHtmlHelper.js";
import {
    appendCatalogDetailGrid,
    appendCatalogListSection,
    buildCatalogPickerContent,
    renderCatalogHeader
} from "../Catalog/LevelEditorCatalogPicker.js";
import {
    createSubclassDto,
    formatFeatureLabel,
    formatSpellGrant,
    getCatalogDisplayName,
    getCatalogDtoId,
    getCatalogFilterText,
    getCatalogSource,
    getSubclassUnlockLevel,
    identityMatchesCatalogEntity,
    subclassMatchesClass,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    renderRaceGrants
} from "../Race/LevelEditorRaceBuilder.js";
import {
    buildSubclassProfile
} from "../CatalogProfile/Builder.js";
import {
    formatProfileOptionSummaries
} from "../CatalogProfile/Formatter.js";

const SUBCLASS_FEATURE_FALLBACKS = {
    "fighter:champion": [
        { id: "subclass-feature:fighter-champion-champion-3:phb", name: "Champion", source: "PHB", level: 3 },
        { id: "subclass-feature:fighter-champion-improved-critical-3:phb", name: "Improved Critical", source: "PHB", level: 3 }
    ]
};

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function getSubclassFallbackKey(subclassRecord) {
    const classText = normalizeText([
        subclassRecord?.classId,
        subclassRecord?.className,
        subclassRecord?.classRef
    ].filter(Boolean).join(" "));
    const subclassText = normalizeText([
        subclassRecord?.id,
        subclassRecord?.name,
        subclassRecord?.shortName,
        subclassRecord?.ref,
        subclassRecord?.sourceId
    ].filter(Boolean).join(" "));

    if ((/\bfighter\b/u.test(classText) || /class:fighter|class-fighter/u.test(classText))
        && (/\bchampion\b/u.test(subclassText) || /fighter-champion/u.test(subclassText))) {
        return "fighter:champion";
    }

    return "";
}

function uniqueFeatureDtos(features) {
    const seen = new Set();
    const result = [];

    for (const feature of toArray(features)) {
        const id = getCatalogDtoId(feature) || feature?.id || feature?.catalogId || "";
        const name = getCatalogDisplayName(feature, feature?.name || "");
        const level = toNumber(feature?.level, 0);
        const key = [id, name, level].map((value) => String(value || "").toLowerCase()).join("|");
        if (!name || seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push({
            ...(feature && typeof feature === "object" ? feature : {}),
            id,
            catalogId: id,
            name,
            source: getCatalogSource(feature),
            level
        });
    }

    return result;
}

function createSubclassFeatureDtos(subclassRecord, selectedClassLevel) {
    const fallbackKey = getSubclassFallbackKey(subclassRecord);
    const features = [
        ...toArray(subclassRecord?.subclassFeatures || subclassRecord?.raw?.subclassFeatures),
        ...toArray(SUBCLASS_FEATURE_FALLBACKS[fallbackKey])
    ];

    return uniqueFeatureDtos(features)
        .filter((feature) => feature.level === toNumber(selectedClassLevel, 0));
}

function mergeLevelFeatures(existingFeatures, subclassFeatures) {
    const retainedFeatures = toArray(existingFeatures).filter((feature) => {
        const id = getCatalogDtoId(feature) || feature?.id || feature?.catalogId || "";
        return !String(id || "").startsWith("subclass-feature:");
    });

    return uniqueFeatureDtos([
        ...retainedFeatures,
        ...subclassFeatures
    ]);
}

export function renderSubclassDetail(detailPane, subclassRecord) {
    // Rebuild the right-side preview for the currently highlighted subclass record.
    detailPane.replaceChildren();

    if (!subclassRecord) {
        detailPane.appendChild(createDescription("Pick a subclass to preview its catalog details."));
        return;
    }

    renderCatalogHeader(detailPane, subclassRecord, "Subclass");
    appendCatalogDetailGrid(detailPane, [
        ["Class", subclassRecord.className || ""],
        ["Unlock", subclassRecord.unlockAtClassLevel ? `${subclassRecord.className || "Class"} level ${subclassRecord.unlockAtClassLevel}` : ""],
        ["Short Name", subclassRecord.shortName || ""],
        ["Catalog ID", getCatalogDtoId(subclassRecord)]
    ]);

    const grantSummaryElement = renderRaceGrants(subclassRecord);
    if (grantSummaryElement) {
        detailPane.appendChild(grantSummaryElement);
    }

    appendCatalogListSection(
        detailPane,
        "Subclass Features",
        toArray(subclassRecord.subclassFeatures || subclassRecord.raw?.subclassFeatures).map(formatFeatureLabel).filter(Boolean),
        "No subclass features listed."
    );

    appendCatalogListSection(
        detailPane,
        "Player Options",
        formatProfileOptionSummaries(buildSubclassProfile(subclassRecord)),
        ""
    );
}

export function buildSubclassContent(editorContext) {
    // Build the subclass picker constrained to the currently selected class and unlock level.
    const levelIndex = editorContext.characterLevel - 1;
    const selectedClassIdentity = PlayerSheetDtoHelper.getValue(editorContext.dto, `levels.${levelIndex}.class`)
        || editorContext.classEntry
        || null;
    const selectedClassLevel = Number(editorContext.classLevel || selectedClassIdentity?.classLevel || editorContext.characterLevel) || 0;
    const selectedSubclassIdentity = PlayerSheetDtoHelper.getValue(editorContext.dto, `levels.${levelIndex}.subclass`) || {};

    return buildCatalogPickerContent(editorContext, {
        kind: "subclasses",
        label: "Subclass",
        pluralLabel: "subclasses",
        searchLabel: "Subclass Name",
        getDisplayName: (subclassRecord) => getCatalogDisplayName(subclassRecord, "Unknown Subclass"),
        getMeta: (subclassRecord) => [subclassRecord.className, getCatalogSource(subclassRecord), subclassRecord.unlockAtClassLevel ? `level ${subclassRecord.unlockAtClassLevel}` : ""].filter(Boolean).join(" | "),
        getFilterText: (subclassRecord) => getCatalogFilterText(subclassRecord, [
            subclassRecord.className,
            subclassRecord.classRef,
            subclassRecord.classId,
            subclassRecord.shortName,
            toArray(subclassRecord.subclassFeatures || subclassRecord.raw?.subclassFeatures).map(formatFeatureLabel).join(" "),
            formatSpellGrant(subclassRecord.grants?.spells)
        ]),
        filterItems: (subclassRecord) => {
            // Hide subclasses that do not belong to the selected class or are not unlocked yet.
            if (!subclassMatchesClass(subclassRecord, selectedClassIdentity)) {
                return false;
            }

            const subclassUnlockLevel = getSubclassUnlockLevel(subclassRecord, selectedClassIdentity);
            return !subclassUnlockLevel || subclassUnlockLevel <= selectedClassLevel;
        },
        isCurrent: (subclassRecord) => identityMatchesCatalogEntity(subclassRecord, [selectedSubclassIdentity]),
        renderDetail: renderSubclassDetail,
        applySelection: (characterDto, subclassRecord) => {
            // Store the subclass identity and its profile on the current level.
            const subclassDto = createSubclassDto(subclassRecord);
            subclassDto.profile = buildSubclassProfile(subclassRecord);
            const existingFeatures = PlayerSheetDtoHelper.getValue(characterDto, `levels.${levelIndex}.features`, []);
            const nextFeatures = mergeLevelFeatures(existingFeatures, createSubclassFeatureDtos(subclassRecord, selectedClassLevel));
            let nextDto = PlayerSheetDtoHelper.patch(characterDto, `levels.${levelIndex}.subclass`, subclassDto);
            nextDto = PlayerSheetDtoHelper.patch(nextDto, `levels.${levelIndex}.features`, nextFeatures);
            return nextDto;
        }
    });
}
