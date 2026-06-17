import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createDescription,
    createField
} from "../../PlayerSheetHtmlHelper.js";
import {
    appendCatalogDetailGrid,
    appendCatalogListSection,
    buildCatalogPickerContent,
    renderCatalogHeader,
    renderProficiencyGrants
} from "../Catalog/LevelEditorCatalogPicker.js";
import {
    createClassDto,
    formatFeatureLabel,
    formatHitDie,
    formatSpellcasting,
    getCatalogDisplayName,
    getCatalogDtoId,
    getCatalogFilterText,
    getCatalogSource,
    identityMatchesCatalogEntity,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import {
    buildClassProfile
} from "../CatalogProfile/Builder.js";
import {
    formatProfileOptionSummaries
} from "../CatalogProfile/Formatter.js";

function createClassFeatureDtos(classRecord, selectedClassLevel) {
    // Persist class features granted at the selected class level, including optional
    // class features such as Martial Versatility.
    return toArray(classRecord?.classFeatures)
        .filter((featureRecord) => toNumber(featureRecord?.level, 0) === toNumber(selectedClassLevel, 0))
        .map((featureRecord) => ({
            id: getCatalogDtoId(featureRecord),
            catalogId: getCatalogDtoId(featureRecord),
            name: getCatalogDisplayName(featureRecord, ""),
            source: getCatalogSource(featureRecord),
            level: toNumber(featureRecord?.level, selectedClassLevel)
        }))
        .filter((featureDto) => featureDto.name);
}

export function renderClassDetail(detailPane, classRecord) {
    // Rebuild the right-side preview for the currently highlighted class record.
    detailPane.replaceChildren();

    if (!classRecord) {
        detailPane.appendChild(createDescription("Pick a class to preview its catalog details."));
        return;
    }

    renderCatalogHeader(detailPane, classRecord, "Class");
    appendCatalogDetailGrid(detailPane, [
        ["Hit Die", formatHitDie(classRecord.hitDie)],
        ["Saving Throws", toArray(classRecord.savingThrows).map((savingThrowKey) => String(savingThrowKey).toUpperCase()).join(", ")],
        ["Spellcasting", formatSpellcasting(classRecord.spellcasting)],
        ["Subclass", [classRecord.subclassTitle, classRecord.subclassUnlockLevel ? `level ${classRecord.subclassUnlockLevel}` : ""].filter(Boolean).join(" at ")],
        ["Catalog ID", getCatalogDtoId(classRecord)]
    ]);

    const proficiencyGrantElement = renderProficiencyGrants("Starting Proficiencies", classRecord.startingProficiencies);
    if (proficiencyGrantElement) {
        detailPane.appendChild(proficiencyGrantElement);
    }

    appendCatalogListSection(
        detailPane,
        "Class Features",
        toArray(classRecord.classFeatures).map(formatFeatureLabel).filter(Boolean).slice(0, 12),
        "No class features listed."
    );

    appendCatalogListSection(
        detailPane,
        "Player Options",
        formatProfileOptionSummaries(buildClassProfile(classRecord)),
        ""
    );
}

export function buildClassContent(editorContext) {
    // Build the catalog picker that writes the selected class and level features into the DTO.
    const levelIndex = editorContext.characterLevel - 1;
    const selectedClassIdentity = PlayerSheetDtoHelper.getValue(editorContext.dto, `levels.${levelIndex}.class`) || {};

    return buildCatalogPickerContent(editorContext, {
        kind: "classes",
        label: "Class",
        pluralLabel: "classes",
        searchLabel: "Class Name",
        getDisplayName: (classRecord) => getCatalogDisplayName(classRecord, "Unknown Class"),
        getMeta: (classRecord) => [getCatalogSource(classRecord), formatHitDie(classRecord.hitDie), classRecord.subclassTitle].filter(Boolean).join(" | "),
        getFilterText: (classRecord) => getCatalogFilterText(classRecord, [
            classRecord.subclassTitle,
            formatSpellcasting(classRecord.spellcasting),
            toArray(classRecord.savingThrows).join(" "),
            toArray(classRecord.classFeatures).map(formatFeatureLabel).join(" ")
        ]),
        isCurrent: (classRecord) => identityMatchesCatalogEntity(classRecord, [selectedClassIdentity]),
        renderDetail: renderClassDetail,
        buildExtraControls: () => {
            // Let the user choose which class level should be applied for multiclass entries.
            const classLevelInput = document.createElement("input");
            classLevelInput.className = "level-editor__input level-editor__input--number";
            classLevelInput.type = "number";
            classLevelInput.min = "1";
            classLevelInput.max = "20";
            classLevelInput.step = "1";
            classLevelInput.value = String(editorContext.classLevel || 1);

            return {
                element: createField("Class Level", classLevelInput),
                getValue: () => toNumber(classLevelInput.value, editorContext.classLevel || 1)
            };
        },
        applySelection: (characterDto, classRecord, selectedClassLevel) => {
            // Store the new class and clear dependent subclass/class-option selections.
            const classDto = createClassDto(classRecord, selectedClassLevel);
            classDto.profile = buildClassProfile(classRecord);
            let nextDto = PlayerSheetDtoHelper.patch(characterDto, `levels.${levelIndex}.class`, classDto);
            nextDto = PlayerSheetDtoHelper.patch(nextDto, `levels.${levelIndex}.subclass`, null);
            nextDto = PlayerSheetDtoHelper.patch(nextDto, `levels.${levelIndex}.features`, createClassFeatureDtos(classRecord, selectedClassLevel));
            nextDto = PlayerSheetDtoHelper.patch(nextDto, `levels.${levelIndex}.choices`, []);
            return nextDto;
        }
    });
}
