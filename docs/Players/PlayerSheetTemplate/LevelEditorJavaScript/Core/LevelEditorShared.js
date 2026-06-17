import { formatModifier, getAbilityModifier } from "../../JsonHelpers.js";
import { CatalogCache } from "../../CatalogCache.js";

export const MAX_CHARACTER_LEVEL = 20;
export const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);
export const PROFICIENCY_UPDATE_LEVELS = new Set([5, 9, 13, 17]);

const SUBCLASS_UNLOCK_LEVEL_BY_CLASS = {
    artificer: 3,
    barbarian: 3,
    bard: 3,
    cleric: 1,
    druid: 2,
    fighter: 3,
    monk: 3,
    paladin: 3,
    ranger: 3,
    rogue: 3,
    sorcerer: 1,
    warlock: 1,
    wizard: 2,
    "blood hunter": 3
};

export const SKILLS = [
    "acrobatics",
    "animalHandling",
    "arcana",
    "athletics",
    "deception",
    "history",
    "insight",
    "intimidation",
    "investigation",
    "medicine",
    "nature",
    "perception",
    "performance",
    "persuasion",
    "religion",
    "sleightOfHand",
    "stealth",
    "survival"
];

const SIZE_LABELS = {
    T: "Tiny",
    S: "Small",
    M: "Medium",
    L: "Large",
    H: "Huge",
    G: "Gargantuan"
};

const catalogCaches = new WeakMap();

export function toArray(value) {
    return Array.isArray(value) ? value : [];
}

export function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function titleCase(value) {
    return String(value || "")
        .replace(/([a-z])([A-Z])/gu, "$1 $2")
        .replace(/[-_]+/gu, " ")
        .replace(/\s+/gu, " ")
        .trim()
        .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

export function toKebab(value) {
    return String(value || "")
        .replace(/([a-z])([A-Z])/gu, "$1-$2")
        .replace(/[^a-zA-Z0-9]+/gu, "-")
        .replace(/^-+|-+$/gu, "")
        .toLowerCase();
}

export function stripJsonExtension(value) {
    return String(value || "").replace(/\.json$/iu, "");
}

function stripKnownCatalogPrefix(value, prefix) {
    return String(value || "").replace(new RegExp(`^${prefix}[-:]`, "iu"), "");
}

function normalizeClassKey(value) {
    return normalizeSearchText(stripJsonExtension(value))
        .replace(/^class[:\s_-]*/u, "")
        .replace(/[:|].*$/u, "")
        .replace(/[^a-z0-9]+/gu, " ")
        .trim();
}

function addClassKey(keys, value) {
    const key = normalizeClassKey(value);
    if (key && key !== "class") {
        keys.add(key);
    }
}

function getClassIdentityKeys(classIdentity) {
    const keys = new Set();
    addClassKey(keys, classIdentity?.id);
    addClassKey(keys, classIdentity?.ref);
    addClassKey(keys, classIdentity?.main);
    addClassKey(keys, classIdentity?.name);
    addClassKey(keys, classIdentity?.className);
    addClassKey(keys, classIdentity?.options?.ref);
    addClassKey(keys, classIdentity?.options?.id);
    addClassKey(keys, getClassLabel(classIdentity));
    return keys;
}

function getSubclassClassKeys(subclass) {
    const keys = new Set();
    addClassKey(keys, subclass?.classId);
    addClassKey(keys, subclass?.classRef);
    addClassKey(keys, subclass?.className);
    addClassKey(keys, subclass?.class?.id);
    addClassKey(keys, subclass?.class?.ref);
    addClassKey(keys, subclass?.class?.name);
    addClassKey(keys, subclass?.raw?.classId);
    addClassKey(keys, subclass?.raw?.classRef);
    addClassKey(keys, subclass?.raw?.className);
    return keys;
}

export function getValue(obj, path, fallback = undefined) {
    const parts = String(path || "").split(".");
    let current = obj;

    for (const part of parts) {
        if (current == null) {
            return fallback;
        }

        current = current[part];
    }

    return current ?? fallback;
}

export function formatRefName(ref) {
    return titleCase(
        String(ref || "")
            .replace(/\.json$/iu, "")
            .replace(/^class-/iu, "")
            .replace(/^subclass-/iu, "")
            .replace(/^race-/iu, "")
            .replace(/^background-/iu, "")
            .replace(/^feat-/iu, "")
    );
}

export function getClassLabel(classEntry) {
    return classEntry?.name
        || formatRefName(classEntry?.main)
        || "Class";
}

export function getSubclassLabel(classEntry) {
    return classEntry?.sub
        || classEntry?.subclassName
        || formatRefName(classEntry?.subclassRef)
        || "";
}

export function getSelectedClassIdentity(context) {
    const levelIndex = toNumber(context?.characterLevel, 1) - 1;
    return getValue(context?.dto, `levels.${levelIndex}.class`, null)
        || context?.classEntry
        || null;
}

export function hasSelectedClass(classIdentity) {
    return getClassIdentityKeys(classIdentity).size > 0;
}

export function getClassSubclassUnlockLevel(classIdentity) {
    const directUnlockLevel = [
        classIdentity?.subclassUnlockLevel,
        classIdentity?.unlockAtClassLevel,
        classIdentity?.options?.subclassUnlockLevel,
        classIdentity?.options?.unlockAtClassLevel
    ]
        .map((value) => toNumber(value, 0))
        .find((value) => value > 0);

    if (directUnlockLevel) {
        return directUnlockLevel;
    }

    for (const key of getClassIdentityKeys(classIdentity)) {
        if (SUBCLASS_UNLOCK_LEVEL_BY_CLASS[key]) {
            return SUBCLASS_UNLOCK_LEVEL_BY_CLASS[key];
        }
    }

    return 0;
}

export function getSubclassUnlockLevel(subclass, classIdentity = null) {
    return [
        subclass?.unlockAtClassLevel,
        subclass?.subclassUnlockLevel,
        subclass?.options?.unlockAtClassLevel,
        subclass?.options?.subclassUnlockLevel,
        getClassSubclassUnlockLevel(classIdentity)
    ]
        .map((value) => toNumber(value, 0))
        .find((value) => value > 0) || 0;
}

export function subclassMatchesClass(subclass, classIdentity) {
    const classKeys = getClassIdentityKeys(classIdentity);
    if (!classKeys.size) {
        return false;
    }

    const subclassClassKeys = getSubclassClassKeys(subclass);
    if (!subclassClassKeys.size) {
        return false;
    }

    return Array.from(subclassClassKeys).some((key) => classKeys.has(key));
}

export function shouldShowSubclassPicker(context) {
    const selectedClass = getSelectedClassIdentity(context);
    if (!hasSelectedClass(selectedClass)) {
        return false;
    }

    const classLevel = toNumber(
        context?.classLevel,
        toNumber(selectedClass?.classLevel, toNumber(context?.characterLevel, 0))
    );
    const unlockLevel = getClassSubclassUnlockLevel(selectedClass);
    const levelIndex = toNumber(context?.characterLevel, 1) - 1;
    const levelSubclass = getValue(context?.dto, `levels.${levelIndex}.subclass`, null);
    const hasSubclassDecision = [
        ...toArray(context?.levelData?.decisions),
        ...toArray(getValue(context?.dto, `levels.${levelIndex}.choices`, []))
    ].some((decision) => decision?.type === "subclass");

    if (unlockLevel > 0) {
        return classLevel === unlockLevel || Boolean(levelSubclass);
    }

    return Boolean(levelSubclass) || hasSubclassDecision;
}

export function getRaceLabel(playerSheetObject) {
    const race = playerSheetObject?.identity?.race || {};
    const baseRace = race.name || formatRefName(race.ref);
    const subrace = race.subrace || "";
    return [subrace, baseRace].filter(Boolean).join(" ") || "Unset";
}

export function getBackgroundLabel(playerSheetObject) {
    const background = playerSheetObject?.identity?.background || {};
    return background.name || formatRefName(background.ref) || "Unset";
}

export function getCatalogCache(api) {
    if (!api) {
        return null;
    }

    if (!catalogCaches.has(api)) {
        catalogCaches.set(api, new CatalogCache(api));
    }

    return catalogCaches.get(api);
}

export function getRaceDisplayName(race) {
    if (!race) {
        return "Unknown Race";
    }

    const name = String(race.name || "").trim();
    const raceName = String(race.raceName || "").trim();
    const subraceName = String(race.subraceName || "").trim() || (isVariantRaceRecord(race) ? "Variant" : "");

    if (raceName && subraceName && (!name || normalizeSearchText(name) === normalizeSearchText(raceName))) {
        return `${raceName} ${subraceName}`;
    }

    if (isVariantRaceRecord(race) && normalizeSearchText(name) === "human") {
        return "Human Variant";
    }

    return name
        || [raceName, subraceName].filter(Boolean).join(" ")
        || "Unknown Race";
}

export function getRaceSource(race) {
    return String(race?.source || race?.raceSource || "").trim();
}

export function getRaceCatalogId(race) {
    return String(
        race?.options?.catalogId
        || race?.catalogId
        || race?.id
        || race?.ref
        || race?.refId
        || race?.sourceId
        || ""
    ).trim();
}

export function getRaceDtoId(race) {
    return stripJsonExtension(getRaceCatalogId(race) || race?.id || "").trim();
}

export function isVariantRaceRecord(race) {
    return [
        race?.name,
        race?.subraceName,
        race?.ref,
        race?.refId,
        race?.sourceId,
        race?.id
    ].some((value) => /\bvariant\b/iu.test(String(value || "").replace(/[-_]+/gu, " ")));
}

function getChoiceCount(group) {
    return toArray(group?.choices)
        .reduce((total, choice) => total + Math.max(toNumber(choice?.count, 1), 0), 0);
}

function getChoiceDefinitionCount(entity, type) {
    return toArray(entity?.choiceDefinitions || entity?.choices)
        .filter((choice) => normalizeSearchText(choice?.type) === type)
        .reduce((total, choice) => total + Math.max(toNumber(choice?.count, 1), 0), 0);
}

function getRawFeatChoiceCount(race) {
    return [
        ...toArray(race?.feats),
        ...toArray(race?.raw?.feats)
    ].reduce((total, entry) => {
        if (!entry || typeof entry !== "object") {
            return total;
        }

        const chooseCount = entry.choose && typeof entry.choose === "object"
            ? toNumber(entry.choose.count, 1)
            : 0;
        const keyedCounts = Object.entries(entry)
            .filter(([key]) => key !== "choose")
            .reduce((sum, [, value]) => sum + Math.max(toNumber(value, 0), 0), 0);

        return total + Math.max(chooseCount, keyedCounts, 0);
    }, 0);
}

export function getRaceFeatChoiceCount(race) {
    return getChoiceCount(race?.grants?.feats) || getChoiceDefinitionCount(race, "feat") || getRawFeatChoiceCount(race);
}

export function raceGrantsFeatChoice(race) {
    return getRaceFeatChoiceCount(race) > 0;
}

export function getCatalogDisplayName(entity, fallback = "Unknown") {
    if (!entity) {
        return fallback;
    }

    return entity.name
        || entity.title
        || entity.shortName
        || formatRefName(entity.ref)
        || fallback;
}

export function getCatalogSource(entity) {
    return String(entity?.source || entity?.book || "").trim();
}

export function getCatalogId(entity) {
    return String(entity?.id || entity?.refId || entity?.sourceId || stripJsonExtension(entity?.ref) || "").trim();
}

export function getCatalogDtoId(entity) {
    return stripJsonExtension(getCatalogId(entity));
}

export function formatRaceSize(size) {
    const sizes = toArray(Array.isArray(size) ? size : [size])
        .map((entry) => SIZE_LABELS[String(entry || "").trim().toUpperCase()] || String(entry || "").trim())
        .filter(Boolean);
    return sizes.join(", ");
}

export function getRaceSize(selectedRace, parentRace = null) {
    const selectedSize = formatRaceSize(selectedRace?.size);
    return selectedSize || formatRaceSize(parentRace?.size);
}

export function formatRaceSpeed(speed) {
    if (speed == null || speed === "") {
        return "";
    }

    if (typeof speed === "number" || /^\d+$/u.test(String(speed))) {
        return `${speed} ft.`;
    }

    if (typeof speed === "object") {
        return Object.entries(speed)
            .filter(([, value]) => value != null && value !== "")
            .map(([key, value]) => `${titleCase(key)} ${value} ft.`)
            .join(", ");
    }

    return String(speed);
}

export function getRaceSpeed(selectedRace, parentRace = null) {
    return formatRaceSpeed(selectedRace?.speed) || formatRaceSpeed(parentRace?.speed);
}

export function getRaceWalkSpeed(selectedRace, parentRace = null) {
    const speed = selectedRace?.speed ?? parentRace?.speed;

    if (typeof speed === "number") {
        return speed;
    }

    if (typeof speed === "object" && speed) {
        const parsed = Number(speed.walk);
        return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(speed);
    return Number.isFinite(parsed) ? parsed : null;
}

export function formatRulesText(value) {
    return String(value || "")
        .replace(/[{]@[^}]+[}]/gu, (match) => {
            const content = match.slice(2, -1);
            const withoutTag = content.replace(/^[a-zA-Z]+ ?/u, "");
            return withoutTag.split("|")[0].trim();
        })
        .replace(/\s+/gu, " ")
        .trim();
}

export function getFirstRulesText(value) {
    if (typeof value === "string") {
        return formatRulesText(value);
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const text = getFirstRulesText(item);
            if (text) {
                return text;
            }
        }
        return "";
    }

    if (value && typeof value === "object") {
        return getFirstRulesText(value.entries || value.items || value.entry || "");
    }

    return "";
}

export function formatChoice(choice) {
    const count = toNumber(choice?.count, 1) || 1;
    const from = toArray(choice?.from)
        .map((entry) => typeof entry === "string" ? entry : entry?.label || entry?.name || entry?.value)
        .filter(Boolean)
        .join(", ");
    return from ? `Choose ${count} from ${from}` : `Choose ${count}`;
}

export function formatAbilityGrant(entry) {
    if (!entry || typeof entry !== "object") {
        return "";
    }

    if (entry.choose) {
        return formatChoice(entry.choose);
    }

    return Object.entries(entry)
        .filter(([, value]) => Number.isFinite(Number(value)))
        .map(([key, value]) => `${key.toUpperCase()} ${formatModifier(toNumber(value, 0))}`)
        .join(", ");
}

export function formatGrantGroup(group) {
    const fixed = toArray(group?.fixed).filter(Boolean).join(", ");
    const choices = toArray(group?.choices).map(formatChoice).filter(Boolean).join("; ");
    return [fixed, choices].filter(Boolean).join("; ");
}

function normalizeFeatGrantSource(source) {
    return String(source || "").trim().toUpperCase();
}

function formatFeatGrantName(value) {
    const lowerWords = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "nor", "of", "on", "or", "the", "to", "with"]);
    return titleCase(value)
        .replace(/'S\b/gu, "'s")
        .split(" ")
        .map((word, index) => index > 0 && lowerWords.has(word.toLowerCase()) ? word.toLowerCase() : word)
        .join(" ");
}

function parseBackgroundFeatRef(value) {
    if (!value) {
        return null;
    }

    const rawRef = typeof value === "string"
        ? value
        : value.ref || value.id || value.value || value.name || "";
    const parts = String(rawRef || "").split("|").map((part) => part.trim());
    const rawName = value?.label || value?.name || parts[0] || rawRef;
    const source = value?.source || parts[1] || "";
    const grant = {
        id: toKebab([rawName, source].filter(Boolean).join("-")),
        ref: String(rawRef || rawName).trim(),
        name: formatFeatGrantName(rawName),
        source: normalizeFeatGrantSource(source)
    };

    if (value && typeof value === "object" && value.qualifier) {
        grant.qualifier = formatFeatGrantName(value.qualifier);
    }

    return grant;
}

export function getBackgroundGrantedFeats(background) {
    const stored = toArray(background?.grantedFeats).filter(Boolean);
    if (stored.length) {
        return stored;
    }

    const fixedRefs = toArray(background?.grants?.feats?.fixed).filter(Boolean);
    const choiceDefs = toArray(background?.grants?.feats?.choices).filter(Boolean);
    const grants = [];

    if (fixedRefs.length) {
        fixedRefs
            .map(parseBackgroundFeatRef)
            .filter(Boolean)
            .forEach((option) => {
                grants.push({
                    type: "fixed",
                    ...option
                });
            });
    }

    for (const choice of choiceDefs) {
        const options = toArray(choice.from || choice.options || choice.values)
            .map(parseBackgroundFeatRef)
            .filter(Boolean);
        if (!options.length) {
            continue;
        }
        grants.push({
            type: "choice",
            id: choice.id || choice.key || `background-feat-choice-${grants.length + 1}`,
            label: choice.label || choice.name || "Background Feat Choice",
            count: Math.max(toNumber(choice.count, 1), 1),
            source: getCatalogSource(background),
            options
        });
    }

    return grants;
}

export function formatBackgroundGrantedFeatLabel(grant) {
    if (!grant) {
        return "";
    }

    function optionLabel(option) {
        const name = option?.name || formatFeatGrantName(option?.ref || option?.id || option?.value || "");
        return [name, option?.qualifier ? `(${option.qualifier})` : ""].filter(Boolean).join(" ");
    }

    if (grant.type === "choice") {
        const options = toArray(grant.options).map(optionLabel).filter(Boolean);
        const count = Math.max(toNumber(grant.count, 1), 1);
        const label = grant.label && grant.label !== "Background Feat Choice"
            ? grant.label
            : `Choose ${count} background feat`;
        return [label, options.join(", ")].filter(Boolean).join(": ");
    }

    return optionLabel(grant);
}

export function normalizeSearchText(value) {
    return String(value || "").trim().toLowerCase();
}

export function formatSpellAbility(ability) {
    if (!ability) {
        return "";
    }

    if (typeof ability === "string") {
        return ability.toUpperCase();
    }

    if (Array.isArray(ability)) {
        return ability.map(formatSpellAbility).filter(Boolean).join("/");
    }

    if (ability.choose) {
        return `Choose ${formatSpellAbility(ability.choose)}`;
    }

    return formatRulesText(JSON.stringify(ability));
}

export function formatSpellLevel(level) {
    if (level == null || level === "") {
        return "";
    }

    if (String(level).includes(";")) {
        return String(level)
            .split(";")
            .map((entry) => formatSpellLevel(entry))
            .filter(Boolean)
            .join(", ");
    }

    const parsed = Number(level);
    if (!Number.isFinite(parsed)) {
        return "";
    }

    return parsed === 0 ? "Cantrip" : `Level ${parsed} spell`;
}

export function formatSpellFilter(filter) {
    if (filter == null || filter === "") {
        return "";
    }

    if (typeof filter === "object") {
        const nested = filter.filter || filter.choose;
        if (nested && nested !== filter) {
            return formatSpellFilter(nested);
        }

        const objectParts = [
            filter.class ? titleCase(filter.class) : "",
            filter.level != null ? formatSpellLevel(filter.level) : "",
            filter.school ? `school ${String(filter.school).toUpperCase()}` : "",
            filter.source || ""
        ].filter(Boolean);

        return objectParts.join(" ") || formatRulesText(JSON.stringify(filter));
    }

    const parts = String(filter || "")
        .split("|")
        .map((part) => part.split("="))
        .reduce((result, [key, value]) => {
            if (key && value) {
                result[normalizeSearchText(key)] = value.trim();
            }
            return result;
        }, {});

    const spellLevel = formatSpellLevel(parts.level);
    const className = parts.class ? titleCase(parts.class) : "";
    const school = parts.school ? `school ${parts.school.toUpperCase()}` : "";
    const ritual = parts["components & miscellaneous"]
        ? titleCase(parts["components & miscellaneous"])
        : "";
    const spellAttack = parts["spell attack"]
        ? `spell attack ${parts["spell attack"].toUpperCase()}`
        : "";

    if (className && spellLevel && !school && !ritual && !spellAttack) {
        return `${className} ${spellLevel.toLowerCase()}`;
    }

    const parsedParts = [className, className ? spellLevel.toLowerCase() : spellLevel, school, ritual, spellAttack].filter(Boolean);
    if (parsedParts.length) {
        return parsedParts.join(", ");
    }

    return formatRulesText(filter);
}

export function formatSpellGrant(spell) {
    if (Array.isArray(spell)) {
        return spell.map(formatSpellGrant).filter(Boolean).join("; ");
    }

    if (typeof spell === "string") {
        return formatRulesText(spell);
    }

    if (!spell || typeof spell !== "object") {
        return "";
    }

    const count = toNumber(spell.count, 1) || 1;
    const isChoice = spell.type === "choice" || Boolean(spell.choose || spell.filter);
    const choiceFilter = formatSpellFilter(spell.filter || spell.choose);
    const choiceName = choiceFilter
        ? `Choose ${count} ${choiceFilter}${count === 1 ? "" : "s"}`
        : `Choose ${count} spell${count === 1 ? "" : "s"}`;
    const name = spell.name || (isChoice ? choiceName : "");
    const details = [
        formatSpellLevel(spell.level ?? spell.spellLevel),
        spell.mode ? titleCase(spell.mode) : "",
        spell.unlockAtLevel ? `Character level ${spell.unlockAtLevel}` : "",
        spell.uses ? `Uses ${spell.uses}` : "",
        spell.recharge ? `Recharge ${spell.recharge}` : "",
        spell.ability ? `Spellcasting ability: ${formatSpellAbility(spell.ability)}` : "",
        spell.group ? titleCase(spell.group) : "",
        spell.source || ""
    ].filter(Boolean);

    if (!name) {
        return details.join("; ") || formatRulesText(JSON.stringify(spell));
    }

    return details.length ? `${name} (${details.join("; ")})` : name;
}

export function formatHitDie(hitDie) {
    if (hitDie == null || hitDie === "") {
        return "";
    }

    if (typeof hitDie === "number") {
        return `d${hitDie}`;
    }

    if (typeof hitDie === "object") {
        const faces = toNumber(hitDie.faces, 0);
        return hitDie.formula || (faces ? `d${faces}` : "");
    }

    return String(hitDie);
}

export function getHitDieFaces(hitDie, fallback = 8) {
    if (typeof hitDie === "number") {
        return hitDie;
    }

    if (typeof hitDie === "object" && hitDie) {
        const faces = toNumber(hitDie.faces, fallback);
        return faces || fallback;
    }

    const parsed = Number(hitDie);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function formatFeatureLabel(feature) {
    if (!feature) {
        return "";
    }

    if (typeof feature === "string") {
        return formatRulesText(feature).split("|")[0].trim();
    }

    const name = feature.name || formatRulesText(feature.rawRef || feature.ref || "");
    const level = feature.level ? ` ${feature.level}` : "";
    return [name, level].filter(Boolean).join(" ").trim();
}

export function formatSpellcasting(spellcasting) {
    if (!spellcasting || typeof spellcasting !== "object") {
        return "";
    }

    return [
        spellcasting.ability ? spellcasting.ability.toUpperCase() : "",
        spellcasting.casterProgression ? titleCase(spellcasting.casterProgression) : "",
        spellcasting.preparedSpells ? `Prepared: ${spellcasting.preparedSpells}` : ""
    ].filter(Boolean).join(" | ");
}

export function createRaceDto(selectedRace, parentRace = null) {
    const options = {};
    const selectedRef = selectedRace?.ref || selectedRace?.refId || selectedRace?.sourceId || "";
    const selectedCatalogId = selectedRace?.id || "";
    const featChoiceCount = getRaceFeatChoiceCount(selectedRace);
    const inferredSubrace = selectedRace?.subraceName || (isVariantRaceRecord(selectedRace) ? "Variant" : "");

    if (selectedRef) {
        options.ref = stripJsonExtension(selectedRef);
    }

    if (selectedCatalogId) {
        options.catalogId = selectedCatalogId;
    }

    if (selectedRace?.sourceId) {
        options.sourceId = selectedRace.sourceId;
    }

    if (selectedRace?.refId) {
        options.refId = selectedRace.refId;
    }

    if (featChoiceCount > 0) {
        options.featChoiceCount = featChoiceCount;
    }

    const displayName = getRaceDisplayName(selectedRace);
    if (displayName) {
        options.displayName = displayName;
    }

    const dtoRace = {
        id: getRaceDtoId(selectedRace),
        name: selectedRace?.raceName || selectedRace?.name || "",
        source: getRaceSource(selectedRace) || getRaceSource(parentRace),
        kind: "races"
    };

    if (inferredSubrace) {
        dtoRace.subrace = inferredSubrace;
    }

    const size = getRaceSize(selectedRace, parentRace);
    if (size) {
        dtoRace.size = size;
    }

    const walkSpeed = getRaceWalkSpeed(selectedRace, parentRace);
    if (walkSpeed != null) {
        dtoRace.speed = walkSpeed;
    }

    if (Object.keys(options).length) {
        dtoRace.options = options;
    }

    return dtoRace;
}

export function createBackgroundDto(background) {
    const grantedFeats = getBackgroundGrantedFeats(background);
    const catalogId = getCatalogDtoId(background);
    const dtoBackground = {
        id: catalogId,
        name: getCatalogDisplayName(background, ""),
        source: getCatalogSource(background),
        kind: "backgrounds"
    };

    if (catalogId) {
        dtoBackground.options = { catalogId };
    }

    if (background?.feature) {
        dtoBackground.feature = background.feature;
    }

    if (grantedFeats.length) {
        dtoBackground.grantedFeats = grantedFeats;
    }

    return dtoBackground;
}

function cloneStartingProficiencyChoice(choice) {
    if (!choice || typeof choice !== "object") {
        return choice;
    }

    return {
        ...choice,
        from: toArray(choice.from).slice(),
        options: toArray(choice.options).slice()
    };
}

function cloneStartingProficiencyGroup(group) {
    return {
        fixed: toArray(group?.fixed).slice(),
        choices: toArray(group?.choices).map(cloneStartingProficiencyChoice)
    };
}

function createClassStartingProficienciesDto(classEntity) {
    const source = classEntity?.startingProficiencies || {};
    const result = {};

    for (const key of ["armor", "weapons", "tools", "skills", "languages"]) {
        const group = cloneStartingProficiencyGroup(source[key]);
        if (group.fixed.length || group.choices.length) {
            result[key] = group;
        }
    }

    return result;
}

export function createClassDto(classEntity, classLevel) {
    const options = {};
    const catalogId = getCatalogDtoId(classEntity);
    const subclassUnlockLevel = toNumber(classEntity?.subclassUnlockLevel, 0);
    const savingThrows = toArray(classEntity?.savingThrows).slice();
    const startingProficiencies = createClassStartingProficienciesDto(classEntity);

    if (catalogId) {
        options.catalogId = catalogId;
    }

    if (classEntity?.ref) {
        options.ref = classEntity.ref;
    }

    if (subclassUnlockLevel > 0) {
        options.subclassUnlockLevel = subclassUnlockLevel;
    }

    if (classEntity?.subclassTitle) {
        options.subclassTitle = classEntity.subclassTitle;
    }

    const dto = {
        id: catalogId,
        name: getCatalogDisplayName(classEntity, ""),
        source: getCatalogSource(classEntity),
        kind: "classes",
        classLevel: Math.min(Math.max(toNumber(classLevel, 1), 1), MAX_CHARACTER_LEVEL),
        hitDie: getHitDieFaces(classEntity?.hitDie, 8)
    };

    if (Object.keys(options).length) {
        dto.options = options;
    }

    if (savingThrows.length) {
        dto.savingThrows = savingThrows;
    }

    if (Object.keys(startingProficiencies).length) {
        dto.startingProficiencies = startingProficiencies;
    }

    return dto;
}

export function createSubclassDto(subclass) {
    const options = {};
    const catalogId = getCatalogDtoId(subclass);

    if (catalogId) {
        options.catalogId = catalogId;
    }

    for (const [key, value] of [
        ["className", subclass?.className],
        ["classId", subclass?.classId],
        ["classRef", subclass?.classRef],
        ["unlockAtClassLevel", subclass?.unlockAtClassLevel],
        ["shortName", subclass?.shortName]
    ]) {
        if (value != null && value !== "") {
            options[key] = value;
        }
    }

    const dto = {
        id: catalogId,
        name: getCatalogDisplayName(subclass, ""),
        source: getCatalogSource(subclass),
        kind: "subclasses"
    };

    if (Object.keys(options).length) {
        dto.options = options;
    }

    return dto;
}

export function createFeatDto(feat, extra = {}) {
    const ref = stripJsonExtension(feat?.ref || feat?.refId || feat?.sourceId || "");
    const id = getCatalogDtoId(feat);

    const dto = {
        id,
        name: getCatalogDisplayName(feat, ""),
        source: getCatalogSource(feat),
        kind: "feats"
    };

    const options = {};
    if (ref) {
        options.ref = ref;
    }

    if (feat?.id) {
        options.catalogId = feat.id;
    }

    if (Object.keys(options).length) {
        dto.options = options;
    }

    if (extra?.choices && typeof extra.choices === "object") {
        dto.choices = JSON.parse(JSON.stringify(extra.choices));
    }

    if (extra?.choiceSummary) {
        dto.choiceSummary = String(extra.choiceSummary);
    }

    if (extra?.spellcastingAbility) {
        dto.spellcastingAbility = String(extra.spellcastingAbility);
    }

    return dto;
}

export function raceIdentityGrantsFeatChoice(raceIdentity) {
    if (toNumber(raceIdentity?.options?.featChoiceCount, 0) > 0) {
        return true;
    }

    return raceGrantsFeatChoice(raceIdentity);
}

function isAbilityScoreImprovementFeature(feature) {
    return String(feature || "").trim().toLowerCase() === "ability score improvement";
}

export function isAsiLevelContext(context) {
    return ASI_LEVELS.has(toNumber(context?.classLevel, 0))
        || getLevelFeatures(context?.levelData).some(isAbilityScoreImprovementFeature);
}

export function shouldShowFeatPicker(context) {
    const levelIndex = toNumber(context?.characterLevel, 1) - 1;
    const levelFeat = getValue(context?.dto, `levels.${levelIndex}.feat`, null);
    const isLevelOneRaceFeat = toNumber(context?.characterLevel, 0) === 1
        && raceIdentityGrantsFeatChoice(getValue(context?.dto, "baseChoices.race", null));

    return Boolean(levelFeat) || isAsiLevelContext(context) || isLevelOneRaceFeat;
}

export function identityMatchesCatalogEntity(entity, identities = []) {
    const entityIds = [
        entity?.id,
        entity?.ref,
        entity?.refId,
        entity?.sourceId
    ].map((value) => normalizeSearchText(stripJsonExtension(value))).filter(Boolean);
    const entityName = normalizeSearchText(getCatalogDisplayName(entity, ""));
    const entitySource = normalizeSearchText(getCatalogSource(entity));

    return toArray(identities).some((identity) => {
        if (!identity) {
            return false;
        }

        const ids = [
            identity.id,
            identity.ref,
            identity.refId,
            identity.sourceId,
            identity.main,
            identity.subclassRef,
            identity.options?.ref,
            identity.options?.refId,
            identity.options?.sourceId,
            identity.options?.catalogId
        ].map((value) => normalizeSearchText(stripJsonExtension(value))).filter(Boolean);

        if (ids.some((id) => entityIds.includes(id))) {
            return true;
        }

        const name = normalizeSearchText(identity.name || identity.main || identity.sub || identity.subclassName);
        const source = normalizeSearchText(identity.source);
        return Boolean(name)
            && name === entityName
            && (!source || source === entitySource);
    });
}

export function getCatalogFilterText(entity, extraValues = []) {
    return normalizeSearchText([
        getCatalogDisplayName(entity, ""),
        entity?.shortName,
        getCatalogSource(entity),
        entity?.ref,
        entity?.id,
        ...toArray(extraValues)
    ].filter(Boolean).join(" "));
}

export function getCurrentLevel(playerSheetObject) {
    const directLevel = toNumber(playerSheetObject?.level, 0);
    if (directLevel > 0) {
        return Math.min(directLevel, MAX_CHARACTER_LEVEL);
    }

    const classLevelTotal = toArray(playerSheetObject?.classes)
        .reduce((total, classEntry) => total + toArray(classEntry?.levels).length, 0);

    return Math.min(Math.max(classLevelTotal, 1), MAX_CHARACTER_LEVEL);
}

export function getPrimaryClass(playerSheetObject) {
    const classes = toArray(playerSheetObject?.classes);
    return classes.find((classEntry) => classEntry?.isPrimary) || classes[0] || null;
}

function getPlannedClassKey(classIdentity, fallbackLevel) {
    return normalizeSearchText(stripJsonExtension(
        classIdentity?.id
        || classIdentity?.ref
        || classIdentity?.options?.ref
        || classIdentity?.name
        || classIdentity?.main
        || `level-${fallbackLevel}`
    ));
}

function hasPlannedLevelData(levelEntry) {
    return Boolean(
        levelEntry?.class
        || levelEntry?.subclass
        || levelEntry?.feat
        || toNumber(levelEntry?.hp, 0) > 0
        || toArray(levelEntry?.features).length
        || toArray(levelEntry?.choices).length
        || toArray(levelEntry?.AbilityScoreIncrease).length
    );
}

function createPlannedClassEntry(levelEntry, fallbackClassEntry = null) {
    const classIdentity = levelEntry?.class || null;
    const subclassIdentity = levelEntry?.subclass || null;

    if (!classIdentity && !fallbackClassEntry) {
        return null;
    }

    const hitDieSize = toNumber(
        classIdentity?.hitDie ?? classIdentity?.hitDieSize,
        toNumber(fallbackClassEntry?.hitDieSize ?? fallbackClassEntry?.hitDie, 8)
    );

    return {
        ...(fallbackClassEntry || {}),
        ...(classIdentity || {}),
        main: classIdentity?.name
            || classIdentity?.main
            || fallbackClassEntry?.main
            || fallbackClassEntry?.name
            || "",
        id: classIdentity?.id || fallbackClassEntry?.id || "",
        source: classIdentity?.source || fallbackClassEntry?.source || "",
        sub: subclassIdentity?.name
            || classIdentity?.sub
            || classIdentity?.subclassName
            || fallbackClassEntry?.sub
            || "",
        subclassRef: subclassIdentity?.id || fallbackClassEntry?.subclassRef || "",
        hitDieSize
    };
}

function createPlannedLevelData(levelEntry, classLevel, fallbackLevelData = null) {
    const featureNames = [
        ...toArray(fallbackLevelData?.featuresGained),
        ...toArray(levelEntry?.features)
            .map((feature) => typeof feature === "string" ? feature : feature?.name)
    ].filter(Boolean);

    return {
        level: classLevel,
        hpRolled: toNumber(levelEntry?.hp, toNumber(fallbackLevelData?.hpRolled, 0)),
        decisions: toArray(levelEntry?.choices),
        featuresGained: [...new Set(featureNames)]
    };
}

export function buildLevelProgression(playerSheetObject, dto = null) {
    const progression = new Map();
    let characterLevel = 1;

    for (const classEntry of toArray(playerSheetObject?.classes)) {
        const levels = toArray(classEntry?.levels);

        for (const levelData of levels) {
            progression.set(characterLevel, {
                characterLevel,
                classEntry,
                classLevel: toNumber(levelData?.level, characterLevel),
                levelData
            });
            characterLevel += 1;
        }
    }

    const primaryClass = getPrimaryClass(playerSheetObject);

    if (Array.isArray(dto?.levels)) {
        const classLevelCounts = new Map();

        dto.levels.forEach((levelEntry, index) => {
            const plannedCharacterLevel = index + 1;
            const classIdentity = levelEntry?.class || null;
            let plannedClassLevel = 0;

            if (classIdentity) {
                const classKey = getPlannedClassKey(classIdentity, plannedCharacterLevel);
                const nextClassLevel = (classLevelCounts.get(classKey) || 0) + 1;
                classLevelCounts.set(classKey, nextClassLevel);
                plannedClassLevel = toNumber(classIdentity.classLevel, nextClassLevel) || nextClassLevel;
            }

            if (!hasPlannedLevelData(levelEntry)) {
                return;
            }

            const existing = progression.get(plannedCharacterLevel) || {};
            const classLevel = plannedClassLevel || toNumber(existing.classLevel, plannedCharacterLevel);
            progression.set(plannedCharacterLevel, {
                characterLevel: plannedCharacterLevel,
                classEntry: createPlannedClassEntry(levelEntry, existing.classEntry || primaryClass),
                classLevel,
                levelData: createPlannedLevelData(levelEntry, classLevel, existing.levelData)
            });
        });
    }

    for (let level = 1; level <= MAX_CHARACTER_LEVEL; level += 1) {
        if (!progression.has(level)) {
            progression.set(level, {
                characterLevel: level,
                classEntry: primaryClass,
                classLevel: level,
                levelData: null
            });
        }
    }

    return progression;
}

export function getConModifier(playerSheetObject) {
    return getAbilityModifier(toNumber(getValue(playerSheetObject, "abilities.con.score", 10), 10));
}

export function getLevelFeatures(levelData) {
    return toArray(levelData?.featuresGained).filter(Boolean);
}

export function getFeatFeatures(playerSheetObject) {
    return toArray(playerSheetObject?.features)
        .filter((feature) => String(feature?.source || "").startsWith("feat-"))
        .map((feature) => feature?.name)
        .filter(Boolean);
}

export function getProficientSkills(playerSheetObject) {
    const skills = playerSheetObject?.skills || {};
    return Object.entries(skills)
        .filter(([, detail]) => Boolean(detail?.proficient))
        .map(([skill]) => skill);
}

export function getSavingThrows(playerSheetObject, abilities) {
    const directList = toArray(playerSheetObject?.proficiencies?.savingThrows);
    if (directList.length) {
        return directList.map((save) => String(save).toUpperCase()).join(", ");
    }

    return abilities
        .filter((ability) => Boolean(getValue(playerSheetObject, `abilities.${ability.key}.savingThrow.proficient`, false)))
        .map((ability) => ability.label)
        .join(", ");
}

function formatProficiencyName(entry) {
    const value = entry?.name || entry?.value || entry;
    return titleCase(String(value || "").replace(/\s+/gu, " ").trim())
        .replace(/'S\b/gu, "'s");
}

export function getProficiencySummary(playerSheetObject) {
    const proficiencies = playerSheetObject?.proficiencies || {};
    const armor = toArray(proficiencies.armor).map(formatProficiencyName).filter(Boolean);
    const weapons = toArray(proficiencies.weapons).map(formatProficiencyName).filter(Boolean);
    const tools = toArray(proficiencies.tools).map(formatProficiencyName).filter(Boolean);

    return [
        armor.length ? `Armor: ${armor.join(", ")}` : "",
        weapons.length ? `Weapons: ${weapons.join(", ")}` : "",
        tools.length ? `Tools: ${tools.join(", ")}` : ""
    ].filter(Boolean).join(" | ") || "No proficiencies recorded.";
}
