import {
    ABILITIES,
    formatModifier
} from "../../JsonHelpers.js";
import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    buildInfoRow,
    buildModalHtml,
    createElement
} from "../../PlayerSheetHtmlHelper.js";
import { buildAbilityScoreContent } from "../Character/LevelEditorAbilityScoreBuilder.js";
import {
    buildBackgroundChoiceContent,
    buildBackgroundChoiceStatus,
    hasBackgroundChoiceOptions
} from "../Background/LevelEditorBackgroundChoiceBuilder.js";
import { buildAsiContent } from "../Character/LevelEditorAsiBuilder.js";
import { buildBackgroundContent } from "../Background/LevelEditorBackgroundBuilder.js";
import { resolveCatalogEntity } from "../Catalog/LevelEditorCatalogChoiceResolver.js";
import {
    buildBackgroundProfile,
    buildClassProfile,
    buildFeatProfile,
    buildSubclassProfile
} from "../CatalogProfile/Builder.js";
import { getOptionCoverageForScope } from "../../StructuredOptionCoverage.js";
import { buildRaceProfile } from "../Race/LevelEditorRaceProfile.js";
import { buildCharacterNameContent } from "../Character/LevelEditorCharacterNameBuilder.js";
import { buildClassContent } from "../Progression/LevelEditorClassBuilder.js";
import {
    buildClassOptionContent,
    buildClassOptionStatus,
    hasClassOptionChoices
} from "../Progression/LevelEditorClassOptionBuilder.js";
import {
    buildFeatContent,
    hasFeatPickerChoices
} from "../Progression/LevelEditorFeatBuilder.js";
import { buildHpContent } from "../Character/LevelEditorHpBuilder.js";
import {
    buildLanguagePickerContent,
    hasLanguagePickerChoices
} from "../StartingChoices/LevelEditorLanguageBuilder.js";
import {
    buildMixedProficiencyPickerContent,
    hasMixedProficiencyPickerChoices
} from "../StartingChoices/LevelEditorMixedProficiencyBuilder.js";
import { buildPlayerNameContent } from "../Character/LevelEditorPlayerNameBuilder.js";
import { hasRaceChoiceOptions } from "../Race/LevelEditorRaceChoiceModel.js";
import {
    buildRaceChoiceContent,
    buildRaceOptionStatus
} from "../Race/LevelEditorRaceChoiceBuilder.js";
import { buildRaceContent } from "../Race/LevelEditorRaceBuilder.js";
import {
    buildSkillPickerContent,
    hasSkillPickerChoices
} from "../StartingChoices/LevelEditorSkillBuilder.js";
import { buildSubclassContent } from "../Progression/LevelEditorSubclassBuilder.js";
import {
    buildToolPickerContent,
    hasToolPickerChoices
} from "../StartingChoices/LevelEditorToolBuilder.js";
import {
    buildWeaponPickerContent,
    hasWeaponPickerChoices
} from "../StartingChoices/LevelEditorWeaponBuilder.js";
import {
    buildLevelProgression,
    formatBackgroundGrantedFeatLabel,
    getCatalogCache,
    getCatalogDisplayName,
    getBackgroundLabel,
    getBackgroundGrantedFeats,
    getClassLabel,
    getCurrentLevel,
    getLevelFeatures,
    getPrimaryClass,
    getProficientSkills,
    getProficiencySummary,
    getRaceLabel,
    getSavingThrows,
    isAsiLevelContext,
    shouldShowFeatPicker,
    shouldShowSubclassPicker,
    getSubclassLabel,
    getValue,
    MAX_CHARACTER_LEVEL,
    PROFICIENCY_UPDATE_LEVELS,
    titleCase,
    toArray,
    toNumber
} from "./LevelEditorShared.js";

function createLevelContext(playerSheetObject, progression, characterLevel) {
    const currentLevel = getCurrentLevel(playerSheetObject);
    const context = progression.get(characterLevel) || {};
    const classEntry = context.classEntry || getPrimaryClass(playerSheetObject);
    const levelData = context.levelData || null;
    const classLevel = toNumber(context.classLevel, characterLevel);
    const classLabel = getClassLabel(classEntry);
    const subclassLabel = getSubclassLabel(classEntry);
    const features = getLevelFeatures(levelData);

    return {
        characterLevel,
        currentLevel,
        classEntry,
        levelData,
        classLevel,
        classLabel,
        subclassLabel,
        features,
        isFutureLevel: characterLevel > currentLevel
    };
}

function getLevelSummary(context) {
    if (context.isFutureLevel) {
        return "Future level.";
    }

    if (context.features.length) {
        return context.features.join(", ");
    }

    return `${context.classLabel} level ${context.classLevel}.`;
}

function setInfoRowValue(row, value) {
    const valueElement = row?.querySelector(".level-editor__row-value");
    if (valueElement && value) {
        valueElement.textContent = value;
    }
}

function setOptionalInfoRowValue(row, value) {
    if (!row) {
        return;
    }

    if (!value) {
        row.remove();
        return;
    }

    setInfoRowValue(row, value);
    row.hidden = false;
}

function appendSummaryDetail(summary, label, detail) {
    if (!detail) {
        return summary;
    }

    const base = String(summary || "").trim().replace(/\.+$/u, "");
    return `${base}. ${label}: ${detail}.`;
}

function formatDisplayName(value) {
    return titleCase(String(value || "").replace(/\s+/gu, " ").trim())
        .replace(/'S\b/gu, "'s");
}

function formatArmorProficiency(value) {
    const key = String(value || "").toLowerCase();
    if (key === "light") {
        return "Light Armor";
    }
    if (key === "medium") {
        return "Medium Armor";
    }
    if (key === "heavy") {
        return "Heavy Armor";
    }
    if (key === "shield") {
        return "Shields";
    }
    return formatDisplayName(value);
}

function formatWeaponProficiency(value) {
    const key = String(value || "").toLowerCase();
    if (key === "simple") {
        return "Simple Weapons";
    }
    if (key === "martial") {
        return "Martial Weapons";
    }
    return formatDisplayName(value);
}

function addUniqueFormatted(target, values, formatter = formatDisplayName) {
    const existing = new Set(target.map((value) => value.toLowerCase()));
    for (const value of toArray(values)) {
        const formatted = formatter(value?.name || value?.value || value);
        if (formatted && !existing.has(formatted.toLowerCase())) {
            target.push(formatted);
            existing.add(formatted.toLowerCase());
        }
    }
}

function isChoicePlaceholderProficiency(value) {
    const text = String(value?.name || value?.value || value || "").toLowerCase();
    return /\b(?:any|choice)\b/iu.test(text)
        && /\b(?:tool|weapon|armor|language|skill|instrument)\b/iu.test(text);
}

function getClassFixedProficiencies(classRecord, key) {
    return toArray(getValue(classRecord, `startingProficiencies.${key}.fixed`, []))
        .filter((value) => !isChoicePlaceholderProficiency(value));
}

function buildLevelOneProficiencySummary(playerSheetObject, classRecord) {
    const proficiencies = playerSheetObject?.proficiencies || {};
    const armor = [];
    const weapons = [];
    const tools = [];

    addUniqueFormatted(armor, getClassFixedProficiencies(classRecord, "armor"), formatArmorProficiency);
    addUniqueFormatted(armor, proficiencies.armor, formatArmorProficiency);
    addUniqueFormatted(weapons, getClassFixedProficiencies(classRecord, "weapons"), formatWeaponProficiency);
    addUniqueFormatted(weapons, proficiencies.weapons, formatWeaponProficiency);
    addUniqueFormatted(tools, getClassFixedProficiencies(classRecord, "tools"));
    addUniqueFormatted(tools, proficiencies.tools);

    return [
        armor.length ? `Armor: ${armor.join(", ")}` : "",
        weapons.length ? `Weapons: ${weapons.join(", ")}` : "",
        tools.length ? `Tools: ${tools.join(", ")}` : ""
    ].filter(Boolean).join("\n") || getProficiencySummary(playerSheetObject);
}

function formatSavingThrowList(saves) {
    const labels = new Map(ABILITIES.map((ability) => [ability.key, ability.label]));
    return toArray(saves)
        .map((save) => labels.get(String(save || "").toLowerCase()) || String(save || "").toUpperCase())
        .filter(Boolean)
        .join(", ");
}

function formatRacialAbilitySummary(dto) {
    const abilityLabels = new Map(ABILITIES.map((ability) => [ability.key, ability.key.toUpperCase()]));
    const increases = toArray(getValue(dto, "baseChoices.race.profile.abilities.auto", []))
        .map((increase) => {
            const ability = String(increase?.ability || "").trim().toLowerCase();
            const amount = toNumber(increase?.amount, 0);
            const label = abilityLabels.get(ability);
            return label && amount ? `${label} ${formatModifier(amount)}` : "";
        })
        .filter(Boolean);

    return increases.join(", ");
}

function getLevelDtoIndex(context) {
    return toNumber(context?.characterLevel, 1) - 1;
}

function getLevelHpValue(context) {
    const levelIndex = getLevelDtoIndex(context);
    return toNumber(PlayerSheetDtoHelper.getValue(
        context?.dto,
        `levels.${levelIndex}.hp`,
        context?.levelData?.hpRolled
    ), 0);
}

function getLevelAsiIncreases(context) {
    const levelIndex = getLevelDtoIndex(context);
    return toArray(PlayerSheetDtoHelper.getValue(
        context?.dto,
        `levels.${levelIndex}.AbilityScoreIncrease`,
        []
    ));
}

function normalizeAbilityIncreaseKey(value) {
    return String(value?.ability || value?.key || value?.value || value || "")
        .trim()
        .toLowerCase();
}

function formatAbilityIncreaseSummary(values) {
    const counts = new Map(ABILITIES.map((ability) => [ability.key, 0]));

    for (const value of toArray(values)) {
        const key = normalizeAbilityIncreaseKey(value);
        if (counts.has(key)) {
            counts.set(key, counts.get(key) + 1);
        }
    }

    return ABILITIES
        .map((ability) => {
            const count = counts.get(ability.key) || 0;
            return count ? `${ability.label} ${formatModifier(count)}` : "";
        })
        .filter(Boolean)
        .join(", ");
}

function buildHpStatus(context) {
    const hp = getLevelHpValue(context);
    if (hp > 0) {
        return String(hp);
    }

    return context.characterLevel === 1 ? "Auto" : "Unset";
}

function buildAsiStatus(context) {
    const summary = formatAbilityIncreaseSummary(getLevelAsiIncreases(context));
    if (summary) {
        return summary;
    }

    return context.features.includes("Ability Score Improvement") ? "Available" : "ASI level";
}

function getClassLevelFeatures(classRecord, classLevel) {
    return toArray(classRecord?.classFeatures)
        .filter((feature) => toNumber(feature?.level, 0) === toNumber(classLevel, 0))
        .map((feature) => feature?.name || getCatalogDisplayName(feature, ""))
        .filter(Boolean);
}

function getBackgroundIdentity(context) {
    return context?.dto?.baseChoices?.background || null;
}

async function resolveSelectedClassRecord(context) {
    const identity = getValue(context?.dto, `levels.${toNumber(context?.characterLevel, 1) - 1}.class`, null);
    if (!identity) {
        return null;
    }

    const catalog = getCatalogCache(context.api);
    if (!catalog) {
        return identity?.classFeatures || identity?.startingProficiencies || identity?.savingThrows ? identity : null;
    }

    const ids = [
        identity.options?.catalogId,
        identity.catalogId,
        identity.id
    ]
        .map((value) => String(value || "").trim())
        .filter((value) => value.includes(":"));

    for (const id of ids) {
        try {
            const record = await catalog.getById("classes", id);
            if (record) {
                return record;
            }
        } catch (_error) {
            // Try the next identity shape before falling back to name matching.
        }
    }

    return null;
}

function getBackgroundIdCandidates(identity) {
    const ids = [
        identity?.id,
        identity?.ref,
        identity?.refId,
        identity?.sourceId,
        identity?.options?.ref,
        identity?.options?.id,
        identity?.options?.catalogId,
        identity?.options?.refId,
        identity?.options?.sourceId
    ].filter(Boolean);
    const result = new Set();

    for (const id of ids) {
        const text = String(id || "").trim();
        if (!text) {
            continue;
        }
        if (text.includes(":")) {
            result.add(text);
        }
    }

    return Array.from(result).filter(Boolean);
}

async function resolveSelectedBackgroundRecord(context, playerSheetObject) {
    const identity = getBackgroundIdentity(context);
    if (!identity) {
        return null;
    }

    if (getBackgroundGrantedFeats(identity).length) {
        return identity;
    }

    const catalog = getCatalogCache(context.api);
    if (!catalog) {
        return identity;
    }

    for (const id of getBackgroundIdCandidates(identity)) {
        try {
            const record = await catalog.getById("backgrounds", id);
            if (record) {
                return record;
            }
        } catch (_error) {
            // Try the next identity shape before falling back to name matching.
        }
    }

    return identity;
}

function buildBackgroundFeatSummary(backgroundRecord) {
    return getBackgroundGrantedFeats(backgroundRecord)
        .map(formatBackgroundGrantedFeatLabel)
        .filter(Boolean)
        .join("; ");
}

function hydrateLevelSummaryRows(context, playerSheetObject, rows) {
    void Promise.all([
        resolveSelectedClassRecord(context),
        resolveSelectedBackgroundRecord(context, playerSheetObject)
    ])
        .then(([classRecord, backgroundRecord]) => {
            const backgroundFeatSummary = context.characterLevel === 1
                ? buildBackgroundFeatSummary(backgroundRecord)
                : "";

            const features = context.features.length
                ? context.features
                : classRecord
                    ? getClassLevelFeatures(classRecord, context.classLevel)
                    : [];
            const baseSummary = features.length
                ? `${context.classLabel} level ${context.classLevel}: ${features.join(", ")}.`
                : getLevelSummary(context);
            const racialAbilitySummary = context.characterLevel === 1
                ? formatRacialAbilitySummary(context.dto)
                : "";
            const asiSummary = context.characterLevel === 1
                ? ""
                : formatAbilityIncreaseSummary(getLevelAsiIncreases(context));
            const summaryValue = appendSummaryDetail(
                appendSummaryDetail(
                    appendSummaryDetail(baseSummary, "Racial ASI", racialAbilitySummary),
                    "ASI",
                    asiSummary
                ),
                "Background Feat",
                backgroundFeatSummary
            );

            setInfoRowValue(rows.summaryRow, summaryValue);

            if (features.length) {
                setInfoRowValue(rows.classFeaturesRow, features.join(", "));
            }

            if (context.characterLevel !== 1) {
                return;
            }

            setOptionalInfoRowValue(rows.backgroundFeatsRow, backgroundFeatSummary);

            if (classRecord) {
                setInfoRowValue(rows.proficienciesRow, buildLevelOneProficiencySummary(playerSheetObject, classRecord));
            }

            const savingThrows = getSavingThrows(playerSheetObject, ABILITIES)
                || formatSavingThrowList(classRecord?.savingThrows);
            setInfoRowValue(rows.savingThrowsRow, savingThrows || "None recorded.");

            setInfoRowValue(
                rows.generalInfoRow,
                [
                    getRaceLabel(playerSheetObject),
                    getBackgroundLabel(playerSheetObject),
                    `${context.classLabel} ${context.classLevel}`,
                    `PB +${toNumber(playerSheetObject?.proficiencyBonus, 2)}`
                ].join(" | ")
            );
        })
        .catch((error) => {
            console.warn("Level editor summary enrichment failed:", error);
        });
}

function hideRowWhenNoChoices(row, context, hasChoices) {
    if (typeof hasChoices !== "function") {
        return;
    }

    row.hidden = true;
    void hasChoices(context)
        .then((available) => {
            if (!row.isConnected) {
                return;
            }

            if (!available) {
                row.remove();
                return;
            }

            row.hidden = false;
        })
        .catch((error) => {
            console.warn("Level editor choice visibility check failed:", error);
            if (row.isConnected) {
                row.hidden = false;
            }
        });
}

function buildBaseEditor(context) {
    const dto = context.dto;
    const playerSheetObject = context.compiled;

    buildModalHtml(document.querySelector("#characterNameDiv"), {
        type: "characterName",
        label: "Character Name",
        status: PlayerSheetDtoHelper.getValue(dto, "identity.name") || "Unset",
        modalId: "level-editor-characterName-modal",
        description: "Set Character Name",
        buildContent: () => buildCharacterNameContent(context)
    });

    buildModalHtml(document.querySelector("#playerNameDiv"), {
        type: "playerName",
        label: "Player Name",
        status: PlayerSheetDtoHelper.getValue(dto, "identity.playerName") || "Unset",
        modalId: "level-editor-playerName-modal",
        description: "Set Player Name.",
        buildContent: () => buildPlayerNameContent(context)
    });

    buildModalHtml(document.querySelector("#raceDiv"), {
        type: "race",
        label: "Race",
        status: getRaceLabel(playerSheetObject),
        modalId: "level-editor-race-modal",
        description: "Set ancestry and subrace details.",
        lazyContent: true,
        buildContent: () => buildRaceContent(context)
    });

    buildModalHtml(document.querySelector("#backgroundDiv"), {
        type: "background",
        label: "Background",
        status: getBackgroundLabel(playerSheetObject),
        modalId: "level-editor-background-modal",
        description: "Set background and background feature details.",
        lazyContent: true,
        buildContent: () => buildBackgroundContent(context)
    });

    buildModalHtml(document.querySelector("#abilityScoreDiv"), {
        type: "ability-scores",
        label: "Ability Scores",
        status: ABILITIES
            .map((ability) => `${ability.label} ${getValue(playerSheetObject, `abilities.${ability.key}.score`, 10)}`)
            .join(" / "),
        modalId: "level-editor-ability-scores-modal",
        description: "Set base ability scores before level increases.",
        buildContent: () => buildAbilityScoreContent(context)
    });

    renderStructuredOptionCoverageRow("level-editor-base-body", "base", context);
}

function createStructuredCoverageContent(scope, context) {
    const coverage = getOptionCoverageForScope(context.compiled?.optionCoverage, scope);
    const wrapper = createElement("section", "level-editor__coverage-panel");
    wrapper.appendChild(createElement("p", "level-editor__modal-description", `${coverage.mapped} of ${coverage.total} structured options are mapped to editor controls.`));

    if (!coverage.missingMappings.length) {
        wrapper.appendChild(createElement("p", "level-editor__choice-status", "No unmapped structured options for this section."));
        return wrapper;
    }

    const list = createElement("ul", "level-editor__mini-list");
    for (const item of coverage.missingMappings) {
        list.appendChild(createElement("li", "", `${item.source || "Catalog"}: ${item.label || item.type} needs structured catalog mapping (${item.path}).`));
    }
    wrapper.appendChild(list);
    return wrapper;
}

function renderStructuredOptionCoverageRow(bodyId, scope, context) {
    if (context?.showStructuredOptionCoverage !== true) {
        return;
    }

    const coverage = getOptionCoverageForScope(context.compiled?.optionCoverage, scope);
    if (!coverage.total && !coverage.missingMappings.length) {
        return;
    }

    const body = document.querySelector(`#${bodyId}`);
    if (!body) {
        return;
    }

    const row = createElement("div");
    row.id = `${bodyId}-${scope}-structured-coverage`;
    buildModalHtml(row, {
        type: "structured-options",
        label: "Structured Options",
        status: coverage.missingMappings.length
            ? `${coverage.missingMappings.length} need mapping`
            : `${coverage.total} mapped`,
        modalId: `${bodyId}-${scope}-structured-coverage-modal`,
        description: "Catalog choices are read from structured JSON fields only. Prose is not parsed.",
        buildContent: () => createStructuredCoverageContent(scope, context)
    });
    body.appendChild(row);
}

function buildLevelEditor(playerSheetObject, context) {
    const dto = context.dto;
    const body = document.querySelector(`#level-editor-level-${context.characterLevel}-body`);
    if (!body) {
        return;
    }

    body.replaceChildren();

    const classRow = createElement("div");
    classRow.id = `level-editor-level-${context.characterLevel}-class`;
    buildModalHtml(classRow, {
        type: "class",
        label: "Class",
        status: `${context.classLabel} ${context.classLevel}`,
        modalId: `level-editor-level-${context.characterLevel}-class-modal`,
        characterLevel: context.characterLevel,
        description: "Set the class taken at this character level.",
        lazyContent: true,
        buildContent: () => buildClassContent(context)
    });
    body.appendChild(classRow);

    if (shouldShowSubclassPicker(context)) {
        const subclassRow = createElement("div");
        subclassRow.id = `level-editor-level-${context.characterLevel}-subclass`;
        buildModalHtml(subclassRow, {
            type: "subclass",
            label: "Subclass",
            status: context.subclassLabel || `${context.classLabel} subclass`,
            modalId: `level-editor-level-${context.characterLevel}-subclass-modal`,
            characterLevel: context.characterLevel,
            description: "Conditional on the selected class and subclass unlock level.",
            lazyContent: true,
            buildContent: () => buildSubclassContent(context)
        });
        body.appendChild(subclassRow);
    }

    const classOptionsRow = createElement("div");
    classOptionsRow.id = `level-editor-level-${context.characterLevel}-class-options`;
    buildModalHtml(classOptionsRow, {
        type: "class-options",
        label: "Class Options",
        status: buildClassOptionStatus(dto, context.characterLevel, context),
        modalId: `level-editor-level-${context.characterLevel}-class-options-modal`,
        characterLevel: context.characterLevel,
        description: "Set choices granted by class features at this level.",
        lazyContent: true,
        buildContent: () => buildClassOptionContent(context)
    });
    body.appendChild(classOptionsRow);
    hideRowWhenNoChoices(classOptionsRow, context, hasClassOptionChoices);

    if (context.characterLevel === 1) {
        const raceOptionsRow = createElement("div");
        raceOptionsRow.id = "level-editor-level-1-race-options";
        buildModalHtml(raceOptionsRow, {
            type: "race-options",
            label: "Race Options",
            status: buildRaceOptionStatus(dto),
            modalId: "level-editor-level-1-race-options-modal",
            characterLevel: context.characterLevel,
            description: "Set required options granted by the selected race.",
            lazyContent: true,
            buildContent: () => buildRaceChoiceContent(context)
        });
        body.appendChild(raceOptionsRow);
        hideRowWhenNoChoices(raceOptionsRow, context, hasRaceChoiceOptions);

        const backgroundOptionsRow = createElement("div");
        backgroundOptionsRow.id = "level-editor-level-1-background-options";
        buildModalHtml(backgroundOptionsRow, {
            type: "background-options",
            label: "Background Options",
            status: buildBackgroundChoiceStatus(dto),
            modalId: "level-editor-level-1-background-options-modal",
            characterLevel: context.characterLevel,
            description: "Set required options granted by the selected background.",
            lazyContent: true,
            buildContent: () => buildBackgroundChoiceContent(context)
        });
        body.appendChild(backgroundOptionsRow);
        hideRowWhenNoChoices(backgroundOptionsRow, context, hasBackgroundChoiceOptions);

        const skillRow = createElement("div");
        skillRow.id = "level-editor-level-1-skills";
        buildModalHtml(skillRow, {
            type: "skills",
            label: "Skills",
            status: getProficientSkills(playerSheetObject).map(titleCase).join(", ") || "None",
            modalId: "level-editor-level-1-skills-modal",
            characterLevel: context.characterLevel,
            description: "Set starting skill proficiencies.",
            lazyContent: true,
            buildContent: () => buildSkillPickerContent(context)
        });
        body.appendChild(skillRow);
        hideRowWhenNoChoices(skillRow, context, hasSkillPickerChoices);

        const languageRow = createElement("div");
        languageRow.id = "level-editor-level-1-languages";
        buildModalHtml(languageRow, {
            type: "languages",
            label: "Languages",
            status: getLanguageStatus(playerSheetObject),
            modalId: "level-editor-level-1-languages-modal",
            characterLevel: context.characterLevel,
            description: "Set starting languages.",
            lazyContent: true,
            buildContent: () => buildLanguagePickerContent(context)
        });
        body.appendChild(languageRow);
        hideRowWhenNoChoices(languageRow, context, hasLanguagePickerChoices);

        const toolRow = createElement("div");
        toolRow.id = "level-editor-level-1-tools";
        buildModalHtml(toolRow, {
            type: "tools",
            label: "Tools",
            status: getNamedProficiencyStatus(playerSheetObject, "tools"),
            modalId: "level-editor-level-1-tools-modal",
            characterLevel: context.characterLevel,
            description: "Set starting tool proficiencies.",
            lazyContent: true,
            buildContent: () => buildToolPickerContent(context)
        });
        body.appendChild(toolRow);
        hideRowWhenNoChoices(toolRow, context, hasToolPickerChoices);

        const weaponRow = createElement("div");
        weaponRow.id = "level-editor-level-1-weapons";
        buildModalHtml(weaponRow, {
            type: "weapons",
            label: "Weapons",
            status: getNamedProficiencyStatus(playerSheetObject, "weapons"),
            modalId: "level-editor-level-1-weapons-modal",
            characterLevel: context.characterLevel,
            description: "Set starting weapon proficiencies.",
            lazyContent: true,
            buildContent: () => buildWeaponPickerContent(context)
        });
        body.appendChild(weaponRow);
        hideRowWhenNoChoices(weaponRow, context, hasWeaponPickerChoices);

        const mixedRow = createElement("div");
        mixedRow.id = "level-editor-level-1-mixed-proficiencies";
        buildModalHtml(mixedRow, {
            type: "mixed-proficiencies",
            label: "Mixed Proficiencies",
            status: getMixedProficiencyStatus(dto),
            modalId: "level-editor-level-1-mixed-proficiencies-modal",
            characterLevel: context.characterLevel,
            description: "Set race or background choices that can become a skill, tool, or language.",
            lazyContent: true,
            buildContent: () => buildMixedProficiencyPickerContent(context)
        });
        body.appendChild(mixedRow);
        hideRowWhenNoChoices(mixedRow, context, hasMixedProficiencyPickerChoices);
    }

    const hpRow = createElement("div");
    hpRow.id = `level-editor-level-${context.characterLevel}-hp`;
    buildModalHtml(hpRow, {
        type: "hp",
        label: "HP",
        status: buildHpStatus(context),
        modalId: `level-editor-level-${context.characterLevel}-hp-modal`,
        characterLevel: context.characterLevel,
        description: "Set hit points gained at this level.",
        buildContent: () => buildHpContent(playerSheetObject, context)
    });
    body.appendChild(hpRow);

    if (isAsiLevelContext(context)) {
        const asiRow = createElement("div");
        asiRow.id = `level-editor-level-${context.characterLevel}-asi`;
        buildModalHtml(asiRow, {
            type: "asi",
            label: "Ability Score Improvement",
            status: buildAsiStatus(context),
            modalId: `level-editor-level-${context.characterLevel}-asi-modal`,
            characterLevel: context.characterLevel,
            description: "Set ASI picks for this class level.",
            buildContent: () => buildAsiContent(context)
        });
        body.appendChild(asiRow);

    }

    renderStructuredOptionCoverageRow(`level-editor-level-${context.characterLevel}-body`, `level-${context.characterLevel}`, context);

    const hasLevelOneRaceIdentity = context.characterLevel === 1
        && Boolean(getValue(context.dto, "baseChoices.race", null));
    if (shouldShowFeatPicker(context) || hasLevelOneRaceIdentity) {
        const featRow = createElement("div");
        featRow.id = `level-editor-level-${context.characterLevel}-feat`;
        buildModalHtml(featRow, {
            type: "feat",
            label: "Feat",
            status: buildFeatStatus(playerSheetObject, context),
            modalId: `level-editor-level-${context.characterLevel}-feat-modal`,
            characterLevel: context.characterLevel,
            description: context.characterLevel === 1
                ? "Set the feat granted by the selected race."
                : "Use when the ASI is replaced by or paired with a feat.",
            lazyContent: true,
            buildContent: () => buildFeatContent(context)
        });
        body.appendChild(featRow);
        hideRowWhenNoChoices(featRow, context, hasFeatPickerChoices);
    }

    const summaryRow = buildInfoRow({
        id: `level-editor-level-${context.characterLevel}-summary-row`,
        type: "summary",
        label: "Summary",
        value: getLevelSummary(context),
        characterLevel: context.characterLevel
    });
    body.appendChild(summaryRow);

    const classFeaturesRow = buildInfoRow({
        id: `level-editor-level-${context.characterLevel}-class-features`,
        type: "class-features",
        label: "Class Features",
        value: context.features.join(", ") || "No features recorded.",
        characterLevel: context.characterLevel
    });
    body.appendChild(classFeaturesRow);

    if (PROFICIENCY_UPDATE_LEVELS.has(context.characterLevel)) {
        body.appendChild(buildInfoRow({
            id: `level-editor-level-${context.characterLevel}-proficiency-bonus`,
            type: "proficiency-bonus",
            label: "Proficiency Bonus Update",
            value: `Current bonus: +${toNumber(playerSheetObject?.proficiencyBonus, 2)}`,
            characterLevel: context.characterLevel
        }));
    }

    let proficienciesRow = null;
    let savingThrowsRow = null;
    let generalInfoRow = null;
    let backgroundFeatsRow = null;

    if (context.characterLevel === 1) {
        backgroundFeatsRow = buildInfoRow({
            id: "level-editor-level-1-background-feats",
            type: "background-feats",
            label: "Background Feats",
            value: "",
            characterLevel: context.characterLevel
        });
        backgroundFeatsRow.hidden = true;
        body.appendChild(backgroundFeatsRow);

        proficienciesRow = buildInfoRow({
            id: "level-editor-level-1-proficiencies",
            type: "proficiencies",
            label: "Proficiencies",
            value: getProficiencySummary(playerSheetObject),
            characterLevel: context.characterLevel
        });
        body.appendChild(proficienciesRow);

        savingThrowsRow = buildInfoRow({
            id: "level-editor-level-1-saving-throws",
            type: "saving-throws",
            label: "Saving Throws",
            value: getSavingThrows(playerSheetObject, ABILITIES) || "None recorded.",
            characterLevel: context.characterLevel
        });
        body.appendChild(savingThrowsRow);

        generalInfoRow = buildInfoRow({
            id: "level-editor-level-1-general-information",
            type: "general-information",
            label: "General Information",
            value: `${getRaceLabel(playerSheetObject)} | ${getBackgroundLabel(playerSheetObject)}`,
            characterLevel: context.characterLevel
        });
        body.appendChild(generalInfoRow);
    }

    hydrateLevelSummaryRows(context, playerSheetObject, {
        summaryRow,
        classFeaturesRow,
        backgroundFeatsRow,
        proficienciesRow,
        savingThrowsRow,
        generalInfoRow
    });

    if (context.characterLevel === MAX_CHARACTER_LEVEL) {
        body.appendChild(buildInfoRow({
            id: "level-editor-level-20-capstone",
            type: "capstone",
            label: "Capstone Feature",
            value: context.features.join(", ") || "Set when class capstone is known.",
            characterLevel: context.characterLevel
        }));
    }
}

function buildFeatStatus(playerSheetObject, context) {
    const levelIndex = context.characterLevel - 1;
    const feat = PlayerSheetDtoHelper.getValue(context.dto, `levels.${levelIndex}.feat`, null);
    const summary = feat?.choiceSummary
        || feat?.choices?.spellcastingClass?.label
        || feat?.choices?.spellcastingClass?.value
        || "";
    const featName = feat?.name ? [feat.name, summary ? `(${summary})` : ""].filter(Boolean).join(" ") : "";
    void playerSheetObject;
    return featName || "Optional";
}

function getLanguageStatus(playerSheetObject) {
    return toArray(playerSheetObject?.proficiencies?.languages)
        .map((entry) => entry?.name || entry)
        .filter(Boolean)
        .join(", ") || "None";
}

function getNamedProficiencyStatus(playerSheetObject, key) {
    return toArray(playerSheetObject?.proficiencies?.[key])
        .map((entry) => entry?.name || entry)
        .filter(Boolean)
        .map(formatDisplayName)
        .join(", ") || "None";
}

function getMixedProficiencyStatus(dto) {
    const groups = PlayerSheetDtoHelper.getValue(dto, "baseChoices.proficiencyChoices.skillToolLanguages", {});
    const values = Object.values(groups || {})
        .flatMap((group) => toArray(group?.values))
        .map(formatMixedProficiencyValue)
        .filter(Boolean);

    return values.length ? values.join(", ") : "Review";
}

function formatMixedProficiencyValue(entry) {
    const value = String(entry?.label || entry?.name || entry?.value || entry || "");
    if (value.startsWith("skill:")) {
        return `Skill: ${titleCase(value.slice(6))}`;
    }
    if (value.startsWith("tool:")) {
        return `Tool: ${value.slice(5)}`;
    }
    if (value.startsWith("language:")) {
        return `Language: ${value.slice(9)}`;
    }
    return value;
}

function isResolvedProfileSource(record, identity) {
    return Boolean(
        record
        && typeof record === "object"
        && (
            record !== identity
            ||
            record.__prop === "race"
            || Array.isArray(record.entries)
            || Array.isArray(record.ability)
            || Array.isArray(record.languageProficiencies)
            || Array.isArray(record.raw?.ability)
            || record.grants
            || record.startingProficiencies
            || Array.isArray(record.choiceDefinitions)
            || Array.isArray(record.choices)
            || Array.isArray(record.classFeatures)
            || Array.isArray(record.subclassFeatures)
            || Array.isArray(record.prerequisite)
            || Array.isArray(record.additionalSpells)
            || Array.isArray(record.grantedFeats)
        )
    );
}

function getProfileTargets(dto) {
    const targets = [
        {
            path: "baseChoices.race",
            kind: "races",
            buildProfile: buildRaceProfile
        },
        {
            path: "baseChoices.background",
            kind: "backgrounds",
            buildProfile: buildBackgroundProfile
        }
    ];

    toArray(dto?.levels).forEach((_level, index) => {
        targets.push(
            {
                path: `levels.${index}.class`,
                kind: "classes",
                buildProfile: buildClassProfile
            },
            {
                path: `levels.${index}.subclass`,
                kind: "subclasses",
                buildProfile: buildSubclassProfile
            },
            {
                path: `levels.${index}.feat`,
                kind: "feats",
                buildProfile: buildFeatProfile
            }
        );
    });

    return targets;
}

// Parsed catalog profiles drive fixed grants and expose structured player
// choices. Newly selected entities get profiles from their picker builders, but
// older saved sheets need them backfilled. Resolve catalog records once and
// patch profiles only when there is structured data to profile; this avoids
// persisting empty profiles during catalog outages.
async function ensureCatalogProfiles(context) {
    // Profiles are now runtime-only. ReferenceResolver hydrates the DTO used for
    // rendering, while PlayerSheetDtoHelper.toSaveDto strips catalog payloads
    // before persistence.
    void context;
    return;

    let nextDto = context.dto;
    let changed = false;

    for (const target of getProfileTargets(context.dto)) {
        const identity = getValue(nextDto, target.path, null);
        if (!identity || identity.profile) {
            continue;
        }

        let record = null;
        try {
            record = await resolveCatalogEntity(context, target.kind, identity, {
                fallbackIdentity: false
            });
        } catch (error) {
            console.warn(`${target.kind} profile lookup failed:`, error);
            continue;
        }

        if (!isResolvedProfileSource(record, identity)) {
            continue;
        }

        const profile = target.buildProfile(record);
        if (!profile) {
            continue;
        }

        nextDto = PlayerSheetDtoHelper.patch(nextDto, `${target.path}.profile`, profile, {
            touch: false
        });
        changed = true;
    }

    if (changed) {
        context.onChange(PlayerSheetDtoHelper.touch(nextDto));
    }
}

function setCurrentLevelCard(playerSheetObject) {
    const currentLevel = getCurrentLevel(playerSheetObject);

    document.querySelectorAll(".level-editor__section--level").forEach((section) => {
        const sectionLevel = toNumber(section.dataset.characterLevel, 0);
        const summary = section.querySelector(".level-editor__level-summary");
        const listItem = document.querySelector(`#level-editor-level-${sectionLevel}-item`);
        const isCurrentLevel = sectionLevel === currentLevel;

        summary?.classList.toggle("currentLevelCard", isCurrentLevel);
        summary?.classList.toggle("level-editor__level-summary--current", isCurrentLevel);
        section.classList.toggle("level-editor__section--current", isCurrentLevel);
        listItem?.classList.toggle("level-editor__list-item--current", isCurrentLevel);

        if (isCurrentLevel) {
            section.open = true;
        }
    });
}

export function bootLevelEditor(context) {
    const dto = context.dto;
    const compiled = context.compiled;
    const onChange = context.onChange;

    const progression = buildLevelProgression(compiled, dto);
    const editorContext = {
        ...context,
        dto,
        compiled,
        onChange,
        api: context.api
    };

    buildBaseEditor(editorContext);

    for (let level = 1; level <= MAX_CHARACTER_LEVEL; level += 1) {
        buildLevelEditor(compiled, {
            ...createLevelContext(compiled, progression, level),
            ...editorContext
        });
    }

    setCurrentLevelCard(compiled);
    void ensureCatalogProfiles(editorContext);
}
