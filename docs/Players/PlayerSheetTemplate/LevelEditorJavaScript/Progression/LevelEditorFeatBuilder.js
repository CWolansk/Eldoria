import { PlayerSheetDtoHelper } from "../../PlayerSheetDtoHelper.js";
import {
    createDescription,
    createElement,
    createField
} from "../../PlayerSheetHtmlHelper.js";
import {
    appendCatalogDetailGrid,
    appendCatalogEntriesSection,
    appendCatalogListSection,
    buildCatalogPickerContent,
    renderCatalogHeader
} from "../Catalog/LevelEditorCatalogPicker.js";
import {
    createFeatDto,
    formatSpellGrant,
    getCatalogCache,
    getCatalogDisplayName,
    getCatalogDtoId,
    getCatalogFilterText,
    getCatalogSource,
    getFirstRulesText,
    getRaceFeatChoiceCount,
    getValue,
    identityMatchesCatalogEntity,
    normalizeSearchText,
    shouldShowFeatPicker,
    toArray,
    toNumber
} from "../Core/LevelEditorShared.js";
import { loadSelectedRaceRecords } from "../Race/LevelEditorRaceChoiceModel.js";
import {
    buildFeatProfile
} from "../CatalogProfile/Builder.js";
import {
    formatProfileOptionSummaries
} from "../CatalogProfile/Formatter.js";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const STATIC_SPELLS_URL = new URL("../../../../data/spells.json", import.meta.url).href;
const STATIC_SPELL_SOURCE_LOOKUP_URL = new URL("../../../../5etools/data/generated/gendata-spell-source-lookup.json", import.meta.url).href;
const spellRecordsByUrl = new Map();
const spellSourceLookupByUrl = new Map();

function asArray(valueOrArray) {
    // Normalize prerequisite values so downstream checks can iterate uniformly.
    return Array.isArray(valueOrArray) ? valueOrArray : (valueOrArray == null ? [] : [valueOrArray]);
}

function normalizeLookupValue(rawLookupValue) {
    // Strip catalog tags/source wrappers before comparing prerequisite identities.
    return normalizeSearchText(
        String(rawLookupValue || "")
            .replace(/\{@\w+\s+([^}|]+)(?:\|[^}]*)?\}/giu, "$1")
            .replace(/\.json$/iu, "")
            .replace(/^(?:feat|race|class|background)[:\s_-]*/iu, "")
            .replace(/[-_]+/gu, " ")
            .replace(/[^a-z0-9]+/giu, " ")
            .trim()
    );
}

function getLookupCandidates(rawLookupValue) {
    // Generate the common full-name/source/name-only candidates used in catalog refs.
    const rawLookupText = String(rawLookupValue || "").trim();
    const lookupParts = rawLookupText.split("|").map((lookupPart) => lookupPart.trim()).filter(Boolean);
    return [...new Set([rawLookupText, lookupParts[0], lookupParts[2]]
        .map(normalizeLookupValue)
        .filter(Boolean))];
}

function addLookupCandidates(candidateSet, rawLookupValue) {
    // Add every normalized identity candidate to the set used for matching.
    getLookupCandidates(rawLookupValue).forEach((lookupCandidate) => candidateSet.add(lookupCandidate));
}

function getCharacterLevel(editorContext) {
    // Prefer the editor level, then fall back to the number of populated class levels.
    const explicitLevel = toNumber(editorContext?.characterLevel, 0);
    if (explicitLevel > 0) {
        return explicitLevel;
    }

    return toArray(editorContext?.dto?.levels)
        .filter((level) => Boolean(level?.class))
        .length || 1;
}

function getAbilityScore(editorContext, abilityKey) {
    // Read compiled ability score first, falling back to base ability choices.
    const normalizedAbilityKey = normalizeLookupValue(abilityKey);
    if (!ABILITY_KEYS.includes(normalizedAbilityKey)) {
        return 0;
    }

    return toNumber(
        getValue(editorContext?.compiled, `abilities.${normalizedAbilityKey}.score`, undefined),
        toNumber(getValue(editorContext?.dto, `baseChoices.abilityScores.${normalizedAbilityKey}`, 0), 0)
    );
}

function getKnownFeatKeys(context, currentLevelIndex) {
    const keys = new Set();
    toArray(context?.dto?.levels).forEach((level, index) => {
        if (index === currentLevelIndex || !level?.feat) {
            return;
        }

        addLookupCandidates(keys, level.feat.name);
        addLookupCandidates(keys, level.feat.id);
        addLookupCandidates(keys, level.feat.ref);
        addLookupCandidates(keys, level.feat.options?.catalogId);
        addLookupCandidates(keys, level.feat.options?.ref);
    });
    return keys;
}

function getRaceKeys(context) {
    const race = getValue(context?.dto, "baseChoices.race", null) || {};
    const keys = new Set();
    const displayName = race?.options?.displayName;
    const subrace = race?.subrace || race?.subraceName;

    [
        race?.id,
        race?.ref,
        race?.refId,
        race?.sourceId,
        race?.name,
        race?.raceName,
        subrace,
        displayName,
        race?.name && subrace ? `${race.name} ${subrace}` : "",
        race?.raceName && subrace ? `${race.raceName} ${subrace}` : ""
    ].forEach((value) => addLookupCandidates(keys, value));

    return keys;
}

function getBackgroundKeys(context) {
    const background = getValue(context?.dto, "baseChoices.background", null) || {};
    const keys = new Set();
    [
        background?.id,
        background?.ref,
        background?.name,
        background?.options?.displayName,
        background?.options?.catalogId
    ].forEach((value) => addLookupCandidates(keys, value));
    return keys;
}

function getClassEntries(context) {
    return toArray(context?.dto?.levels).map((level) => level?.class).filter(Boolean);
}

function getClassKeys(classEntry) {
    const keys = new Set();
    [
        classEntry?.id,
        classEntry?.ref,
        classEntry?.name,
        classEntry?.main,
        classEntry?.className,
        classEntry?.options?.ref,
        classEntry?.options?.catalogId
    ].forEach((value) => addLookupCandidates(keys, value));
    return keys;
}

function meetsClassRequirement(context, classRequirement) {
    const wantedNames = [
        classRequirement?.name,
        classRequirement?.className,
        classRequirement
    ].flatMap(getLookupCandidates);

    if (!wantedNames.length) {
        return true;
    }

    return getClassEntries(context).some((classEntry) => {
        const classKeys = getClassKeys(classEntry);
        return wantedNames.some((wanted) => classKeys.has(wanted));
    });
}

function meetsLevelRequirement(context, requirement) {
    const levelRequirement = typeof requirement === "object" && requirement !== null
        ? toNumber(requirement.level, 0)
        : toNumber(requirement, 0);

    if (!levelRequirement) {
        return true;
    }

    if (typeof requirement === "object" && requirement?.class && !meetsClassRequirement(context, requirement.class)) {
        return false;
    }

    return getCharacterLevel(context) >= levelRequirement;
}

function meetsAbilityRequirement(context, requirement) {
    const requirements = toArray(requirement);
    if (requirements.length) {
        return requirements.some((entry) => meetsAbilityRequirement(context, entry));
    }

    if (!requirement || typeof requirement !== "object") {
        return true;
    }

    return Object.entries(requirement)
        .filter(([ability]) => ABILITY_KEYS.includes(normalizeLookupValue(ability)))
        .every(([ability, score]) => getAbilityScore(context, ability) >= toNumber(score, 0));
}

function matchesRaceRequirement(context, requirement) {
    const requirements = toArray(requirement);
    if (requirements.length) {
        return requirements.some((entry) => matchesRaceRequirement(context, entry));
    }

    const raceKeys = getRaceKeys(context);
    const wantedRace = typeof requirement === "string" ? requirement : requirement?.name;
    const wantedRaceKeys = getLookupCandidates(wantedRace);
    const wantedSubraceKeys = getLookupCandidates(requirement?.subrace);

    const raceMatches = !wantedRaceKeys.length || wantedRaceKeys.some((wanted) => (
        raceKeys.has(wanted)
        || Array.from(raceKeys).some((key) => key.startsWith(`${wanted} `))
    ));
    const subraceMatches = !wantedSubraceKeys.length || wantedSubraceKeys.some((wanted) => raceKeys.has(wanted));
    return raceMatches && subraceMatches;
}

function matchesBackgroundRequirement(context, requirement) {
    const requirements = toArray(requirement);
    if (requirements.length) {
        return requirements.some((entry) => matchesBackgroundRequirement(context, entry));
    }

    const backgroundKeys = getBackgroundKeys(context);
    return getLookupCandidates(typeof requirement === "string" ? requirement : requirement?.name)
        .some((wanted) => backgroundKeys.has(wanted));
}

function getKnownProficiencyValues(context, kind) {
    const values = new Set();
    const pluralKey = kind === "armor" ? "armor" : `${kind}s`;

    for (const value of toArray(getValue(context?.dto, `baseChoices.startingProficiencies.${pluralKey}`, []))) {
        addLookupCandidates(values, value);
    }

    for (const value of toArray(getValue(context?.compiled, `proficiencies.${pluralKey}`, []))) {
        addLookupCandidates(values, value?.name || value?.value || value);
    }

    for (const level of toArray(context?.dto?.levels)) {
        const fixed = getValue(level, `class.startingProficiencies.${pluralKey}.fixed`, []);
        for (const value of toArray(fixed)) {
            addLookupCandidates(values, value);
        }
    }

    return values;
}

function matchesProficiencyRequirement(context, requirement) {
    const requirements = toArray(requirement);
    if (requirements.length) {
        return requirements.every((entry) => matchesProficiencyRequirement(context, entry));
    }

    if (!requirement || typeof requirement !== "object") {
        return true;
    }

    return Object.entries(requirement).every(([kind, wanted]) => {
        const normalizedKind = normalizeLookupValue(kind);
        const knownValues = getKnownProficiencyValues(context, normalizedKind);
        if (!knownValues.size) {
            return true;
        }

        return getLookupCandidates(wanted).some((candidate) => knownValues.has(candidate));
    });
}

function hasSpellcasting(context) {
    if (getValue(context?.dto, "spells.spellcastingAbility", "")) {
        return true;
    }

    if (toArray(getValue(context?.dto, "spells.cantrips", [])).length
        || toArray(getValue(context?.dto, "spells.known", [])).length
        || toArray(getValue(context?.dto, "spells.prepared", [])).length) {
        return true;
    }

    return toArray(context?.dto?.levels)
        .some((level) => Boolean(level?.class?.spellcasting?.ability || level?.class?.profile?.spellcasting?.ability));
}

function getCampaignKeys(context) {
    const keys = new Set();
    [
        ...toArray(getValue(context?.dto, "metadata.campaigns", [])),
        ...toArray(getValue(context?.dto, "metadata.tags", [])),
        ...toArray(getValue(context?.dto, "metadata.sourcePolicy.campaigns", []))
    ].forEach((value) => addLookupCandidates(keys, value));
    return keys;
}

function meetsFeatRequirement(context, requirement, currentLevelIndex) {
    const knownFeatKeys = getKnownFeatKeys(context, currentLevelIndex);
    return asArray(requirement)
        .flatMap(getLookupCandidates)
        .some((wanted) => knownFeatKeys.has(wanted));
}

function meetsPrerequisiteEntry(context, entry, currentLevelIndex) {
    if (!entry || typeof entry === "string") {
        return true;
    }

    if (entry.level != null && !meetsLevelRequirement(context, entry.level)) {
        return false;
    }

    if (entry.ability != null && !meetsAbilityRequirement(context, entry.ability)) {
        return false;
    }

    if (entry.race != null && !matchesRaceRequirement(context, entry.race)) {
        return false;
    }

    if (entry.background != null && !matchesBackgroundRequirement(context, entry.background)) {
        return false;
    }

    if (entry.class != null && !meetsClassRequirement(context, entry.class)) {
        return false;
    }

    if (entry.feat != null && !meetsFeatRequirement(context, entry.feat, currentLevelIndex)) {
        return false;
    }

    if (entry.spellcasting && !hasSpellcasting(context)) {
        return false;
    }

    if (entry.proficiency != null && !matchesProficiencyRequirement(context, entry.proficiency)) {
        return false;
    }

    if (entry.campaign != null) {
        const campaignKeys = getCampaignKeys(context);
        const requiredCampaigns = asArray(entry.campaign).flatMap(getLookupCandidates);
        if (!requiredCampaigns.some((campaign) => campaignKeys.has(campaign))) {
            return false;
        }
    }

    return true;
}

export function featPrerequisitesMet(featRecord, editorContext, currentLevelIndex = 0) {
    // A feat is available when any prerequisite block is satisfied.
    const prerequisites = toArray(featRecord?.prerequisite);
    if (!prerequisites.length) {
        return true;
    }

    return prerequisites.some((prerequisiteEntry) => meetsPrerequisiteEntry(editorContext, prerequisiteEntry, currentLevelIndex));
}

function formatPrerequisites(prerequisite) {
    return toArray(prerequisite)
        .map((entry) => {
            if (typeof entry === "string") {
                return entry;
            }

            if (entry?.ability) {
                return Object.entries(entry.ability)
                    .map(([ability, score]) => `${ability.toUpperCase()} ${score}`)
                    .join(", ");
            }

            if (entry?.race) {
                return `Race: ${toArray(entry.race).join(", ")}`;
            }

            if (entry?.spellcasting) {
                return "Spellcasting";
            }

            return getFirstRulesText(entry) || JSON.stringify(entry);
        })
        .filter(Boolean)
        .join("; ");
}

function formatClassLabel(value) {
    return String(value || "")
        .replace(/[-_]+/gu, " ")
        .replace(/\s+/gu, " ")
        .trim()
        .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function parseSpellChoiceFilter(value) {
    const result = {};
    if (!value || typeof value !== "string") {
        return result;
    }

    for (const part of value.split("|")) {
        const [rawKey, rawValue] = part.split("=");
        const key = String(rawKey || "").trim().toLowerCase();
        if (key && rawValue) {
            result[key] = rawValue.trim();
        }
    }

    return result;
}

export function getFeatSpellcastingClassChoices(featRecord) {
    // Some spell feats require choosing which class list/ability to use.
    const spellcastingClassChoicesByKey = new Map();
    const featProfile = buildFeatProfile(featRecord);
    for (const spellChoiceDefinition of toArray(featProfile?.spells?.choices)) {
        const spellChoiceFilter = parseSpellChoiceFilter(spellChoiceDefinition.choose || spellChoiceDefinition.filter);
        const classNames = String(spellChoiceFilter.class || "")
            .split(";")
            .map(formatClassLabel)
            .filter(Boolean);

        if (classNames.length !== 1) {
            continue;
        }

        const className = classNames[0];
        const classChoiceKey = normalizeLookupValue(className);
        if (!classChoiceKey || spellcastingClassChoicesByKey.has(classChoiceKey)) {
            continue;
        }

        spellcastingClassChoicesByKey.set(classChoiceKey, {
            value: className,
            label: className,
            ability: typeof spellChoiceDefinition.ability === "string" ? spellChoiceDefinition.ability : "",
            group: spellChoiceDefinition.group || `${className} Spells`
        });
    }

    const spellcastingClassChoices = Array.from(spellcastingClassChoicesByKey.values())
        .sort((a, b) => a.label.localeCompare(b.label));
    return spellcastingClassChoices.length > 1 ? spellcastingClassChoices : [];
}

export function getFeatSpellChoiceDefinitions(featRecord) {
    const featProfile = buildFeatProfile(featRecord);
    return toArray(featProfile?.spells?.choices)
        .map((spellChoiceDefinition, index) => {
            const filter = spellChoiceDefinition.choose || spellChoiceDefinition.filter || "";
            const id = [
                "feat-spell",
                spellChoiceDefinition.mode || "spell",
                filter,
                spellChoiceDefinition.ability || "",
                index + 1
            ].map((part) => String(part || "").replace(/\s+/gu, " ").trim()).join(":");

            return {
                ...spellChoiceDefinition,
                id,
                label: formatSpellChoiceLabel(spellChoiceDefinition, index)
            };
        });
}

function formatSpellChoiceLabel(spellChoiceDefinition, index) {
    const filter = parseSpellChoiceFilter(spellChoiceDefinition.choose || spellChoiceDefinition.filter);
    const level = toNumber(filter.level, NaN);
    const levelLabel = Number.isFinite(level)
        ? level === 0
            ? "Cantrip"
            : `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"}-level Spell`
        : `Spell ${index + 1}`;
    const classLabel = String(filter.class || "")
        .split(";")
        .map(formatClassLabel)
        .filter(Boolean)
        .join("/");
    return [spellChoiceDefinition.group || levelLabel, classLabel].filter(Boolean).join(" - ");
}

function getExistingSpellChoiceMap(currentFeat) {
    const spellChoices = toArray(currentFeat?.choices?.spells);
    return new Map(spellChoices.map((choice) => [choice.choiceId, toArray(choice.values).map((value) => value?.value || value).filter(Boolean)]));
}

function getSpellRecordName(spell) {
    return String(spell?.name || spell?.label || "").trim();
}

function getSpellRecordSource(spell) {
    return String(spell?.source || "").trim();
}

function getSpellRecordValue(spell) {
    return [getSpellRecordName(spell), getSpellRecordSource(spell)].filter(Boolean).join("|");
}

function getSpellLookupKey(value) {
    return String(value || "").trim().toLowerCase();
}

async function loadStaticSpellRecords(context = {}) {
    if (Array.isArray(context.spellRecords)) {
        return context.spellRecords;
    }

    if (typeof fetch !== "function") {
        return [];
    }

    const url = context.spellDataUrl || STATIC_SPELLS_URL;
    if (!spellRecordsByUrl.has(url)) {
        spellRecordsByUrl.set(url, fetch(url)
            .then((response) => response.ok ? response.json() : null)
            .then((data) => toArray(data?.spells || data?.spell || data))
            .catch((error) => {
                console.warn("Spell fallback data failed to load:", error);
                return [];
            }));
    }

    return spellRecordsByUrl.get(url);
}

async function loadSpellRecords(context = {}) {
    const catalog = getCatalogCache(context.api);
    if (catalog) {
        try {
            const records = await catalog.searchForPicker("spells", "", { full: true });
            if (toArray(records).length) {
                return records;
            }
        } catch (error) {
            console.warn("Spell catalog lookup failed:", error);
        }
    }

    return loadStaticSpellRecords(context);
}

async function loadSpellSourceLookup(context = {}) {
    if (context.spellSourceLookup && typeof context.spellSourceLookup === "object") {
        return context.spellSourceLookup;
    }

    if (typeof fetch !== "function") {
        return {};
    }

    const url = context.spellSourceLookupUrl || STATIC_SPELL_SOURCE_LOOKUP_URL;
    if (!spellSourceLookupByUrl.has(url)) {
        spellSourceLookupByUrl.set(url, fetch(url)
            .then((response) => response.ok ? response.json() : null)
            .then((data) => data && typeof data === "object" ? data : {})
            .catch((error) => {
                console.warn("Spell source lookup failed to load:", error);
                return {};
            }));
    }

    return spellSourceLookupByUrl.get(url);
}

function getSpellSourceLookupEntry(spellSourceLookup, spell) {
    const sourceBucket = spellSourceLookup?.[getSpellLookupKey(getSpellRecordSource(spell))]
        || spellSourceLookup?.[normalizeLookupValue(getSpellRecordSource(spell))]
        || null;
    if (!sourceBucket) {
        return null;
    }

    return sourceBucket[getSpellLookupKey(getSpellRecordName(spell))]
        || sourceBucket[normalizeLookupValue(getSpellRecordName(spell))]
        || null;
}

function sourceGroupHasClass(sourceGroup, className) {
    const wantedClass = normalizeLookupValue(className);
    return Object.values(sourceGroup || {}).some((classesByName) => (
        classesByName
        && typeof classesByName === "object"
        && Object.keys(classesByName).some((name) => normalizeLookupValue(name) === wantedClass)
    ));
}

function spellMatchesClassFilter(spellSourceLookup, spell, classFilter) {
    const classNames = String(classFilter || "")
        .split(";")
        .map(formatClassLabel)
        .filter(Boolean);
    if (!classNames.length) {
        return true;
    }

    const lookupEntry = getSpellSourceLookupEntry(spellSourceLookup, spell);
    if (!lookupEntry) {
        return false;
    }

    return classNames.some((className) => (
        sourceGroupHasClass(lookupEntry.class, className)
        || sourceGroupHasClass(lookupEntry.classVariant, className)
    ));
}

function spellMatchesFilter(spell, spellChoiceDefinition, spellSourceLookup) {
    const filter = parseSpellChoiceFilter(spellChoiceDefinition.choose || spellChoiceDefinition.filter);
    if (filter.level != null && filter.level !== "") {
        const wantedLevels = String(filter.level).split(";").map((level) => toNumber(level, NaN));
        if (!wantedLevels.some((level) => Number.isFinite(level) && toNumber(spell?.level, NaN) === level)) {
            return false;
        }
    }

    if (!spellMatchesClassFilter(spellSourceLookup, spell, filter.class)) {
        return false;
    }

    if (filter.school) {
        const schoolKey = normalizeLookupValue(spell?.school?.code || spell?.school?.name || spell?.school || "");
        const wantedSchools = String(filter.school).split(";").map(normalizeLookupValue).filter(Boolean);
        if (wantedSchools.length && !wantedSchools.includes(schoolKey)) {
            return false;
        }
    }

    if (normalizeLookupValue(filter["components & miscellaneous"]) === "ritual" && !spell?.ritual) {
        return false;
    }

    if (filter["spell attack"]) {
        const wantedAttacks = String(filter["spell attack"])
            .split(";")
            .map((entry) => entry.trim().toUpperCase())
            .filter(Boolean);
        const spellAttacks = toArray(spell?.spellAttack).map((entry) => String(entry || "").trim().toUpperCase()).filter(Boolean);
        if (wantedAttacks.length && !spellAttacks.some((entry) => wantedAttacks.includes(entry))) {
            return false;
        }
    }

    return true;
}

export async function getSpellOptionsForChoice(context, spellChoiceDefinition) {
    const [spellRecords, spellSourceLookup] = await Promise.all([
        loadSpellRecords(context),
        loadSpellSourceLookup(context)
    ]);

    return toArray(spellRecords)
        .filter((spell) => spellMatchesFilter(spell, spellChoiceDefinition, spellSourceLookup))
        .map((spell) => ({
            value: getSpellRecordValue(spell),
            label: getSpellRecordName(spell),
            name: getSpellRecordName(spell),
            source: getSpellRecordSource(spell),
            level: toNumber(spell?.level, 0)
        }))
        .filter((option) => option.value && option.label)
        .sort((left, right) => left.label.localeCompare(right.label));
}

export async function hasFeatPickerChoices(editorContext) {
    // Feat picker appears for normal feat levels or race-granted feat choices at level 1.
    if (shouldShowFeatPicker(editorContext)) {
        return true;
    }

    if (toNumber(editorContext?.characterLevel, 0) !== 1) {
        return false;
    }

    const selectedRaceRecords = await loadSelectedRaceRecords(editorContext);
    return selectedRaceRecords.some((raceRecord) => getRaceFeatChoiceCount(raceRecord) > 0);
}

function buildFeatExtraControls(currentFeat, editorContext) {
    return ({ onValidityChange } = {}) => {
        const section = createElement("section", "level-editor__catalog-extra-controls level-editor__feat-extra-controls");
        section.hidden = true;
        let selectedFeat = null;
        let selectedClass = currentFeat?.choices?.spellcastingClass?.value || "";
        let classChoices = [];
        let spellChoices = [];
        let spellSelections = new Map(getExistingSpellChoiceMap(currentFeat));
        let spellOptionsByChoiceId = new Map();
        let spellChoicesLoading = false;
        let spellChoiceError = "";
        let spellChoiceToken = 0;

        function resetSpellChoicesForFeat(feat) {
            spellChoices = getFeatSpellChoiceDefinitions(feat);
            spellOptionsByChoiceId = new Map();
            spellChoiceError = "";
            spellChoicesLoading = false;
            spellSelections = identityMatchesCatalogEntity(feat, [currentFeat])
                ? new Map(getExistingSpellChoiceMap(currentFeat))
                : new Map();
        }

        function getSpellChoiceSelection(choice) {
            return toArray(spellSelections.get(choice.id)).slice(0, Math.max(toNumber(choice.count, 1), 1));
        }

        function setSpellChoiceSelection(choice, values) {
            const count = Math.max(toNumber(choice.count, 1), 1);
            const normalizedValues = toArray(values).filter(Boolean).slice(0, count);
            if (normalizedValues.length) {
                spellSelections.set(choice.id, normalizedValues);
            } else {
                spellSelections.delete(choice.id);
            }
            onValidityChange?.();
        }

        function createSpellSelect(choice) {
            const options = toArray(spellOptionsByChoiceId.get(choice.id));
            const count = Math.max(toNumber(choice.count, 1), 1);
            const selectedValues = new Set(getSpellChoiceSelection(choice));
            const select = document.createElement("select");
            select.className = "level-editor__select";
            select.multiple = count > 1;
            if (select.multiple) {
                select.size = Math.min(Math.max(options.length, count + 2), 8);
            } else {
                const empty = document.createElement("option");
                empty.value = "";
                empty.textContent = "Choose spell...";
                select.appendChild(empty);
            }

            for (const option of options) {
                const optionElement = document.createElement("option");
                optionElement.value = option.value;
                optionElement.textContent = [option.label, option.source].filter(Boolean).join(" ");
                optionElement.selected = selectedValues.has(option.value);
                select.appendChild(optionElement);
            }

            select.addEventListener("change", () => {
                const values = Array.from(select.selectedOptions)
                    .map((option) => option.value)
                    .filter(Boolean);
                setSpellChoiceSelection(choice, values);
            });

            return createField(choice.label, select);
        }

        function renderSpellChoices() {
            if (!spellChoices.length) {
                return;
            }

            section.appendChild(createElement("h4", "level-editor__catalog-section-title", "Spell Choices"));
            section.appendChild(createDescription("Choose the spells granted by this feat."));

            if (spellChoicesLoading) {
                section.appendChild(createDescription("Loading spell options..."));
                return;
            }

            if (spellChoiceError) {
                section.appendChild(createDescription(spellChoiceError));
                return;
            }

            for (const choice of spellChoices) {
                const options = toArray(spellOptionsByChoiceId.get(choice.id));
                if (!options.length) {
                    section.appendChild(createDescription(`${choice.label}: no matching spells found.`));
                    continue;
                }

                section.appendChild(createSpellSelect(choice));
            }
        }

        async function loadSpellChoices(token) {
            if (!spellChoices.length) {
                return;
            }

            spellChoicesLoading = true;
            render();

            try {
                const entries = await Promise.all(spellChoices.map(async (choice) => [
                    choice.id,
                    await getSpellOptionsForChoice(editorContext, choice)
                ]));
                if (token !== spellChoiceToken) {
                    return;
                }
                spellOptionsByChoiceId = new Map(entries);
                spellChoiceError = "";
            } catch (error) {
                if (token !== spellChoiceToken) {
                    return;
                }
                console.error("Feat spell choices failed to load:", error);
                spellOptionsByChoiceId = new Map();
                spellChoiceError = "Spell choices failed to load. Check the spell catalog data and try again.";
            } finally {
                if (token === spellChoiceToken) {
                    spellChoicesLoading = false;
                    render();
                }
            }
        }

        function render() {
            section.replaceChildren();
            classChoices = getFeatSpellcastingClassChoices(selectedFeat);
            section.hidden = !classChoices.length && !spellChoices.length;

            if (!classChoices.length && !spellChoices.length) {
                onValidityChange?.();
                return;
            }

            if (classChoices.length) {
                section.appendChild(createElement("h4", "level-editor__catalog-section-title", "Feat Choices"));
                section.appendChild(createDescription("Choose the spellcasting class for this feat."));

                if (!classChoices.some((entry) => entry.value === selectedClass)) {
                    selectedClass = "";
                }

                const select = document.createElement("select");
                select.className = "level-editor__select";
                const empty = document.createElement("option");
                empty.value = "";
                empty.textContent = "Choose class...";
                select.appendChild(empty);

                for (const choice of classChoices) {
                    const option = document.createElement("option");
                    option.value = choice.value;
                    option.textContent = choice.ability ? `${choice.label} (${choice.ability.toUpperCase()})` : choice.label;
                    option.selected = choice.value === selectedClass;
                    select.appendChild(option);
                }

                select.addEventListener("change", () => {
                    selectedClass = select.value;
                    onValidityChange?.();
                });

                section.appendChild(createField("Class", select));
            }

            renderSpellChoices();
            onValidityChange?.();
        }

        return {
            element: section,
            setItem(feat) {
                selectedFeat = feat;
                if (identityMatchesCatalogEntity(feat, [currentFeat])) {
                    selectedClass = selectedClass || currentFeat?.choices?.spellcastingClass?.value || "";
                } else {
                    selectedClass = "";
                }
                resetSpellChoicesForFeat(feat);
                if (spellChoices.length) {
                    const token = spellChoiceToken + 1;
                    spellChoiceToken = token;
                    void loadSpellChoices(token);
                }
                render();
            },
            isValid() {
                const classChoiceValid = !classChoices.length || Boolean(selectedClass);
                const spellChoicesValid = !spellChoices.length
                    || (!spellChoicesLoading && !spellChoiceError && spellChoices.every((choice) => getSpellChoiceSelection(choice).length >= Math.max(toNumber(choice.count, 1), 1)));
                return classChoiceValid && spellChoicesValid;
            },
            getInvalidMessage() {
                if (classChoices.length && !selectedClass) {
                    return "Choose a class for this feat before accepting.";
                }

                if (spellChoicesLoading) {
                    return "Wait for spell choices to finish loading.";
                }

                if (spellChoiceError) {
                    return spellChoiceError;
                }

                return "Choose the spells granted by this feat before accepting.";
            },
            getValue() {
                const choice = classChoices.find((entry) => entry.value === selectedClass);
                const choices = {};
                const choiceSummary = [];
                let spellcastingAbility = choice?.ability || "";

                if (choice) {
                    choices.spellcastingClass = {
                        type: "spellcasting-class",
                        ...choice
                    };
                    choiceSummary.push(choice.label);
                }

                const spellChoiceValues = spellChoices.map((spellChoice) => {
                    const selectedValues = getSpellChoiceSelection(spellChoice);
                    const options = toArray(spellOptionsByChoiceId.get(spellChoice.id));
                    const values = selectedValues
                        .map((selectedValue) => options.find((option) => option.value === selectedValue))
                        .filter(Boolean)
                        .map((option) => ({
                            ...option,
                            mode: spellChoice.mode || "known",
                            ability: spellChoice.ability || spellcastingAbility || "",
                            recharge: spellChoice.recharge || "",
                            uses: spellChoice.uses || "",
                            choiceId: spellChoice.id,
                            choiceLabel: spellChoice.label
                        }));

                    if (!spellcastingAbility && values.some((value) => value.ability)) {
                        spellcastingAbility = values.find((value) => value.ability)?.ability || "";
                    }

                    values.forEach((value) => {
                        choiceSummary.push(`${spellChoice.label}: ${value.label}`);
                    });

                    return {
                        type: "spell-choice",
                        choiceId: spellChoice.id,
                        label: spellChoice.label,
                        filter: spellChoice.filter || spellChoice.choose || "",
                        mode: spellChoice.mode || "known",
                        ability: spellChoice.ability || spellcastingAbility || "",
                        count: Math.max(toNumber(spellChoice.count, 1), 1),
                        values
                    };
                }).filter((spellChoice) => spellChoice.values.length);

                if (spellChoiceValues.length) {
                    choices.spells = spellChoiceValues;
                }

                return {
                    choices,
                    choiceSummary: choiceSummary.join("; "),
                    spellcastingAbility
                };
            }
        };
    };
}

export function renderFeatDetail(detailPane, featRecord) {
    // Rebuild the right-side preview for the currently highlighted feat record.
    detailPane.replaceChildren();

    if (!featRecord) {
        detailPane.appendChild(createDescription("Pick a feat to preview its catalog details."));
        return;
    }

    renderCatalogHeader(detailPane, featRecord, "Feat");
    appendCatalogDetailGrid(detailPane, [
        ["Prerequisite", formatPrerequisites(featRecord.prerequisite)],
        ["Catalog ID", getCatalogDtoId(featRecord)]
    ]);

    const featRulesEntries = featRecord.entries || featRecord.raw?.entries || [];
    const firstRulesSummary = getFirstRulesText(featRulesEntries);
    if (firstRulesSummary) {
        detailPane.appendChild(createDescription(firstRulesSummary));
    }

    appendCatalogListSection(
        detailPane,
        "Player Options",
        formatProfileOptionSummaries(buildFeatProfile(featRecord)),
        ""
    );

    appendCatalogEntriesSection(detailPane, "Rules Text", featRulesEntries);
}

export function buildFeatContent(editorContext) {
    // Build the feat picker for the current level, including any required extra feat controls.
    const levelIndex = editorContext.characterLevel - 1;
    const selectedFeatIdentity = PlayerSheetDtoHelper.getValue(editorContext.dto, `levels.${levelIndex}.feat`) || {};

    return buildCatalogPickerContent(editorContext, {
        kind: "feats",
        label: "Feat",
        pluralLabel: "feats",
        searchLabel: "Feat Name",
        getDisplayName: (featRecord) => getCatalogDisplayName(featRecord, "Unknown Feat"),
        getMeta: (featRecord) => [getCatalogSource(featRecord), formatPrerequisites(featRecord.prerequisite)].filter(Boolean).join(" | "),
        getFilterText: (featRecord) => getCatalogFilterText(featRecord, [
            formatPrerequisites(featRecord.prerequisite),
            getFirstRulesText(featRecord.entries || featRecord.raw?.entries)
        ]),
        filterItems: (featRecord) => featPrerequisitesMet(featRecord, editorContext, levelIndex),
        isCurrent: (featRecord) => identityMatchesCatalogEntity(featRecord, [selectedFeatIdentity]),
        renderDetail: renderFeatDetail,
        buildExtraControls: buildFeatExtraControls(selectedFeatIdentity, editorContext),
        extraControlsPlacement: "detail",
        applySelection: (characterDto, featRecord, extraFeatChoices) => {
            // Store the feat identity, profile, and any required feat-specific choices.
            const featDto = createFeatDto(featRecord, extraFeatChoices);
            featDto.profile = buildFeatProfile(featRecord);
            return PlayerSheetDtoHelper.patch(characterDto, `levels.${levelIndex}.feat`, featDto);
        }
    });
}
