import {
    ABILITY_KEYS,
    MAX_CHARACTER_LEVEL,
    PlayerSheetDtoHelper
} from "./PlayerSheetDtoHelper.js";
import { applyResolvedReferencesToDto } from "./ReferenceResolver.js";
import { createStructuredOptionCoverage } from "./StructuredOptionCoverage.js";

const SKILLS = [
    { key: "acrobatics", label: "Acrobatics", ability: "dex" },
    { key: "animalHandling", label: "Animal Handling", ability: "wis" },
    { key: "arcana", label: "Arcana", ability: "int" },
    { key: "athletics", label: "Athletics", ability: "str" },
    { key: "deception", label: "Deception", ability: "cha" },
    { key: "history", label: "History", ability: "int" },
    { key: "insight", label: "Insight", ability: "wis" },
    { key: "intimidation", label: "Intimidation", ability: "cha" },
    { key: "investigation", label: "Investigation", ability: "int" },
    { key: "medicine", label: "Medicine", ability: "wis" },
    { key: "nature", label: "Nature", ability: "int" },
    { key: "perception", label: "Perception", ability: "wis" },
    { key: "performance", label: "Performance", ability: "cha" },
    { key: "persuasion", label: "Persuasion", ability: "cha" },
    { key: "religion", label: "Religion", ability: "int" },
    { key: "sleightOfHand", label: "Sleight of Hand", ability: "dex" },
    { key: "stealth", label: "Stealth", ability: "dex" },
    { key: "survival", label: "Survival", ability: "wis" }
];

const CLASS_PROFICIENCY_FALLBACKS = {
    fighter: {
        savingThrows: ["str", "con"],
        armor: ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
        weapons: ["Simple Weapons", "Martial Weapons"],
        tools: [],
        languages: []
    }
};

const CLASS_FEATURE_FALLBACKS = {
    fighter: [
        { id: "class-feature:fighter-fighting-style-1:phb", name: "Fighting Style", source: "PHB", level: 1 },
        { id: "class-feature:fighter-second-wind-1:phb", name: "Second Wind", source: "PHB", level: 1 },
        { id: "class-feature:fighter-action-surge-2:phb", name: "Action Surge", source: "PHB", level: 2 },
        { id: "class-feature:fighter-martial-archetype-3:phb", name: "Martial Archetype", source: "PHB", level: 3 },
        { id: "class-feature:fighter-ability-score-improvement-4:phb", name: "Ability Score Improvement", source: "PHB", level: 4 },
        { id: "class-feature:fighter-martial-versatility-4:tce", name: "Martial Versatility", source: "TCE", level: 4 },
        { id: "class-feature:fighter-extra-attack-5:phb", name: "Extra Attack", source: "PHB", level: 5 }
    ]
};

const SUBCLASS_FEATURE_FALLBACKS = {
    "fighter:champion": [
        { id: "subclass-feature:fighter-champion-champion-3:phb", name: "Champion", source: "PHB", level: 3 },
        { id: "subclass-feature:fighter-champion-improved-critical-3:phb", name: "Improved Critical", source: "PHB", level: 3 }
    ]
};

const CLASS_SPELLCASTING_FALLBACKS = {
    ranger: {
        ability: "wis",
        casterProgression: "1/2",
        startLevel: 2,
        preparedSpells: "",
        progression: {
            cantripProgression: [],
            spellsKnownProgression: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
            classTableGroups: [
                {
                    title: "Spell Slots per Spell Level",
                    rowsSpellProgression: [
                        [0, 0, 0, 0, 0],
                        [2, 0, 0, 0, 0],
                        [3, 0, 0, 0, 0],
                        [3, 0, 0, 0, 0],
                        [4, 2, 0, 0, 0],
                        [4, 2, 0, 0, 0],
                        [4, 3, 0, 0, 0],
                        [4, 3, 0, 0, 0],
                        [4, 3, 2, 0, 0],
                        [4, 3, 2, 0, 0],
                        [4, 3, 3, 0, 0],
                        [4, 3, 3, 0, 0],
                        [4, 3, 3, 1, 0],
                        [4, 3, 3, 1, 0],
                        [4, 3, 3, 2, 0],
                        [4, 3, 3, 2, 0],
                        [4, 3, 3, 3, 1],
                        [4, 3, 3, 3, 1],
                        [4, 3, 3, 3, 2],
                        [4, 3, 3, 3, 2]
                    ]
                }
            ]
        }
    }
};

export const EXPERIENCE_LEVEL_THRESHOLDS = Object.freeze([
    0,
    300,
    900,
    2700,
    6500,
    14000,
    23000,
    34000,
    48000,
    64000,
    85000,
    100000,
    120000,
    140000,
    165000,
    195000,
    225000,
    265000,
    305000,
    355000
]);

function deepClone(value) {
    if (value == null) {
        return value;
    }

    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

function toArray(value) {
    return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clampCharacterLevel(value, fallback = 1) {
    const level = Math.floor(toNumber(value, fallback));
    return Math.min(Math.max(level, 1), MAX_CHARACTER_LEVEL);
}

export function getLevelFromExperience(experience) {
    const xp = Math.max(Math.floor(toNumber(experience, 0)), 0);
    let level = 1;

    for (let index = 0; index < EXPERIENCE_LEVEL_THRESHOLDS.length; index += 1) {
        if (xp >= EXPERIENCE_LEVEL_THRESHOLDS[index]) {
            level = index + 1;
        }
    }

    return clampCharacterLevel(level);
}

export function getExperienceForLevel(level) {
    const characterLevel = clampCharacterLevel(level);
    return EXPERIENCE_LEVEL_THRESHOLDS[characterLevel - 1] || 0;
}

export function getNextLevelExperience(level) {
    const characterLevel = clampCharacterLevel(level);
    return characterLevel >= MAX_CHARACTER_LEVEL
        ? null
        : getExperienceForLevel(characterLevel + 1);
}

export function getExperienceToNextLevel(experience) {
    const currentExperience = Math.max(Math.floor(toNumber(experience, 0)), 0);
    const nextLevelExperience = getNextLevelExperience(getLevelFromExperience(currentExperience));
    return nextLevelExperience == null
        ? null
        : Math.max(nextLevelExperience - currentExperience, 0);
}

function normalizeAbilityKey(value) {
    const key = String(value || "").trim().toLowerCase();
    return ABILITY_KEYS.includes(key) ? key : "";
}

function normalizeSearchText(value) {
    return String(value || "").trim().toLowerCase();
}

function titleCase(value) {
    return String(value || "")
        .replace(/([a-z])([A-Z])/gu, "$1 $2")
        .replace(/[-_]+/gu, " ")
        .replace(/\s+/gu, " ")
        .trim()
        .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function normalizeSaveAbility(value) {
    const key = normalizeAbilityKey(value);
    if (key) {
        return key;
    }

    const mapped = {
        strength: "str",
        dexterity: "dex",
        constitution: "con",
        intelligence: "int",
        wisdom: "wis",
        charisma: "cha"
    };

    return mapped[normalizeSearchText(value)] || "";
}

function formatAbilityLabel(key) {
    const labels = {
        str: "Strength",
        dex: "Dexterity",
        con: "Constitution",
        int: "Intelligence",
        wis: "Wisdom",
        cha: "Charisma"
    };
    return labels[key] || titleCase(key);
}

function addUnique(set, value) {
    const text = String(value || "").trim();
    if (text) {
        set.add(text);
    }
}

function toUniqueArray(set) {
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function identityKey(identity) {
    return String(identity?.id || identity?.name || "").trim().toLowerCase();
}

function identityName(identity, fallback = "") {
    return String(identity?.name || identity?.id || fallback || "").trim();
}

function getClassFallbackKey(classEntry = {}) {
    const entry = classEntry || {};
    const text = normalizeSearchText([
        entry.id,
        entry.name,
        entry.ref,
        entry.options?.ref,
        entry.options?.catalogId
    ].filter(Boolean).join(" "));

    if (/\bfighter\b/u.test(text) || /class-fighter/u.test(text)) {
        return "fighter";
    }

    return "";
}

function getClassFallbackProficiencies(classEntry, key) {
    const fallbackKey = getClassFallbackKey(classEntry);
    return fallbackKey ? toArray(CLASS_PROFICIENCY_FALLBACKS[fallbackKey]?.[key]) : [];
}

function getSubclassFallbackKey(classEntry = {}, subclassEntry = {}) {
    const subclass = subclassEntry || {};
    const classFallbackKey = getClassFallbackKey(classEntry);
    const subclassClassText = normalizeSearchText([
        subclass.classId,
        subclass.className,
        subclass.classRef,
        subclass.options?.classId,
        subclass.options?.className,
        subclass.options?.classRef,
        subclass.profile?.subclass?.classId,
        subclass.profile?.subclass?.className,
        subclass.profile?.subclass?.classRef
    ].filter(Boolean).join(" "));
    const subclassText = normalizeSearchText([
        subclass.id,
        subclass.name,
        subclass.ref,
        subclass.options?.ref,
        subclass.options?.catalogId,
        subclass.options?.shortName,
        subclass.profile?.subclass?.shortName
    ].filter(Boolean).join(" "));
    const isFighterSubclass = classFallbackKey === "fighter"
        || /\bfighter\b|class:fighter|class-fighter/u.test(subclassClassText)
        || /fighter-/u.test(subclassText);

    if (isFighterSubclass && (/\bchampion\b/u.test(subclassText) || /fighter-champion/u.test(subclassText))) {
        return "fighter:champion";
    }

    return "";
}

function getClassSavingThrows(classEntry = {}) {
    const entry = classEntry || {};
    return [
        ...toArray(entry.savingThrows),
        ...getClassFallbackProficiencies(entry, "savingThrows")
    ];
}

function formatFeatGrantLabel(grant) {
    if (typeof grant === "string") {
        return grant;
    }

    const name = identityName(grant, grant?.ref || grant?.value || "Feat");
    return [name, grant?.qualifier ? `(${grant.qualifier})` : ""].filter(Boolean).join(" ");
}

function formatFeatName(feat) {
    const name = identityName(feat, "Feat");
    const summary = feat?.choiceSummary
        || feat?.choices?.spellcastingClass?.label
        || feat?.choices?.spellcastingClass?.value
        || "";
    return [name, summary ? `(${summary})` : ""].filter(Boolean).join(" ");
}

function formatBackgroundFeatChoice(grant) {
    const count = Math.max(toNumber(grant?.count, 1), 1);
    const options = toArray(grant?.options)
        .map(formatFeatGrantLabel)
        .filter(Boolean)
        .join(", ");
    return [`Choose ${count} background feat`, options].filter(Boolean).join(": ");
}

function compileBackgroundGrantedFeats(dto) {
    const background = dto.baseChoices.background || {};

    return toArray(background.grantedFeats)
        .map((grant, index) => {
            if (grant?.type === "choice") {
                return {
                    id: grant.id || `background-feat-choice-${index + 1}`,
                    name: `Background Feat Choice: ${formatBackgroundFeatChoice(grant)}`,
                    source: background.id || background.name || "background",
                    category: "Background Feat"
                };
            }

            const label = formatFeatGrantLabel(grant);
            if (!label) {
                return null;
            }

            return {
                id: grant.id || grant.ref || `background-feat-${index + 1}`,
                name: `Background Feat: ${label}`,
                source: background.id || background.name || "background",
                category: "Background Feat"
            };
        })
        .filter(Boolean);
}

function getAbilityModifier(score) {
    return Math.floor((toNumber(score, 10) - 10) / 2);
}

function makeProficiencyEntries(values, grantedBy, formatter = null) {
    function cleanName(value) {
        const text = String(value || "").trim().replace(/'S\b/gu, "'s");
        if (text === text.toLowerCase()) {
            return text
                .replace(/\b[a-z]/gu, (letter) => letter.toUpperCase())
                .replace(/'S\b/gu, "'s");
        }

        return text;
    }

    const formatName = (value) => {
        const name = formatter ? formatter(value) : cleanName(value);
        return cleanName(name);
    };

    return toArray(values)
        .map((value) => {
            if (typeof value === "string") {
                return {
                    name: formatName(value),
                    grantedBy,
                    multiclass: false
                };
            }

            return {
                ...deepClone(value),
                name: formatName(value?.name || value?.id || value?.key),
                grantedBy: value?.grantedBy || grantedBy,
                multiclass: Boolean(value?.multiclass)
            };
        })
        .filter((entry) => entry.name);
}

function formatWeaponProficiencyName(value) {
    const key = normalizeSearchText(value);
    if (key === "simple") {
        return "Simple Weapons";
    }
    if (key === "martial") {
        return "Martial Weapons";
    }
    return value;
}

function isChoicePlaceholderProficiency(value) {
    const text = normalizeSearchText(value?.name || value?.value || value);
    return /\b(?:any|choice)\b/iu.test(text)
        && /\b(?:tool|weapon|armor|language|skill|instrument)\b/iu.test(text);
}

function uniqueProficiencyValues(values) {
    const seen = new Set();
    const result = [];

    for (const value of toArray(values)) {
        const rawName = typeof value === "string"
            ? value
            : value?.name || value?.id || value?.key || value?.label || "";
        const name = String(rawName || "").trim();
        const key = name.toLowerCase();

        if (!name || seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(value);
    }

    return result;
}

function getExplicitCompileLevel(options = {}) {
    for (const key of ["currentLevel", "characterLevel", "level"]) {
        const level = toNumber(options[key], 0);
        if (level > 0) {
            return clampCharacterLevel(level);
        }
    }

    return 0;
}

function compileCurrentLevel(dto, options = {}) {
    return getExplicitCompileLevel(options) || getLevelFromExperience(dto.identity?.experience);
}

function countPlannedLevels(dto) {
    return Math.max(1, toArray(dto.levels).filter((level) => Boolean(level?.class)).length);
}

function createActiveLevelDto(dto, activeLevel) {
    const levelCap = clampCharacterLevel(activeLevel);
    const next = deepClone(dto);
    next.levels = toArray(dto.levels).map((level, index) => index < levelCap ? level : null);
    return PlayerSheetDtoHelper.normalize(next);
}

function getSingleClassIdentity(dto, characterLevel = MAX_CHARACTER_LEVEL) {
    const classes = toArray(dto.levels)
        .slice(0, characterLevel)
        .map((level) => level?.class)
        .filter(Boolean);
    const keys = [...new Set(classes.map(identityKey).filter(Boolean))];
    return keys.length === 1 ? classes[0] : null;
}

function getCompiledLevelEntries(dto, characterLevel = MAX_CHARACTER_LEVEL) {
    const levelCap = clampCharacterLevel(characterLevel);
    const fallbackClass = getSingleClassIdentity(dto, levelCap);
    const classLevelCounts = new Map();
    let latestSubclass = null;

    return toArray(dto.levels)
        .slice(0, levelCap)
        .map((sourceLevel, index) => {
            const characterLevelNumber = index + 1;
            const baseLevel = sourceLevel || { characterLevel: characterLevelNumber };
            const hasExplicitClass = Boolean(baseLevel.class);
            const sourceClass = baseLevel.class || fallbackClass;
            const classKey = identityKey(sourceClass) || (sourceClass ? "primary-class" : "");
            let effectiveClass = sourceClass ? deepClone(sourceClass) : null;
            let effectiveClassLevel = 0;

            if (effectiveClass && classKey) {
                effectiveClassLevel = (classLevelCounts.get(classKey) || 0) + 1;
                classLevelCounts.set(classKey, effectiveClassLevel);
                effectiveClass.classLevel = hasExplicitClass
                    ? toNumber(effectiveClass.classLevel, effectiveClassLevel) || effectiveClassLevel
                    : effectiveClassLevel;
            }

            if (baseLevel.subclass) {
                latestSubclass = baseLevel.subclass;
            }

            return {
                ...baseLevel,
                characterLevel: characterLevelNumber,
                class: effectiveClass,
                subclass: baseLevel.subclass || (effectiveClass ? latestSubclass : null),
                effectiveClassLevel
            };
        });
}

function compileProficiencyBonus(characterLevel) {
    const level = Math.max(1, toNumber(characterLevel, 1));
    return 2 + Math.floor((level - 1) / 4);
}

function getRaceSelections(dto) {
    const selections = dto?.baseChoices?.raceChoices?.selections;
    return selections && typeof selections === "object" ? selections : {};
}

function getRaceSelectionList(dto) {
    return Object.values(getRaceSelections(dto)).filter(Boolean);
}

function getBackgroundSelections(dto) {
    const selections = dto?.baseChoices?.backgroundChoices?.selections;
    return selections && typeof selections === "object" ? selections : {};
}

function getBackgroundSelectionList(dto) {
    return Object.values(getBackgroundSelections(dto)).filter(Boolean);
}

function getRaceProfile(dto) {
    const profile = dto?.baseChoices?.race?.profile;
    return profile && typeof profile === "object" ? profile : null;
}

function getRaceSelectionValue(dto, choiceIdOrValueKey) {
    const selections = getRaceSelections(dto);
    const direct = selections[choiceIdOrValueKey];
    if (direct) {
        return direct.value ?? direct.values?.[0]?.value ?? "";
    }

    const match = Object.values(selections)
        .find((selection) => selection?.valueKey === choiceIdOrValueKey || selection?.choiceId === choiceIdOrValueKey);
    return match?.value ?? match?.values?.[0]?.value ?? "";
}

function getSelectionOptions(selection) {
    return toArray(selection?.values)
        .map((entry) => typeof entry === "object" ? entry : { value: entry, label: String(entry) });
}

function getSelectionLabel(selection) {
    const labels = getSelectionOptions(selection)
        .map((entry) => entry.label || entry.name || entry.value)
        .filter(Boolean);

    return labels.join(", ") || selection?.value || "";
}

function getRaceSourceText(dto, selection = null) {
    return normalizeSearchText([
        dto?.baseChoices?.race?.id,
        dto?.baseChoices?.race?.name,
        dto?.baseChoices?.race?.subrace,
        dto?.baseChoices?.race?.source,
        dto?.baseChoices?.race?.options?.displayName,
        dto?.baseChoices?.race?.options?.ref,
        dto?.baseChoices?.race?.options?.sourceId,
        selection?.choiceId,
        selection?.label,
        selection?.sourceName,
        selection?.source
    ].filter(Boolean).join(" "));
}

function isEgwDragonbornSelection(dto, selection) {
    const text = getRaceSourceText(dto, selection);
    return /\begw\b|draconblood|ravenite/iu.test(text);
}

function isFtdDragonbornSelection(dto, selection) {
    const text = getRaceSourceText(dto, selection);
    return /\bftd\b|chromatic|gem|metallic/iu.test(text);
}

function getDragonbornFamily(dto, selection) {
    const text = getRaceSourceText(dto, selection);
    if (/chromatic/iu.test(text)) {
        return "chromatic";
    }
    if (/gem/iu.test(text)) {
        return "gem";
    }
    if (/metallic/iu.test(text)) {
        return "metallic";
    }
    return "";
}

function compileRaceAbilityIncreases(dto) {
    const increases = [];

    // Fixed racial bonuses are applied automatically from the parsed profile.
    for (const increase of toArray(getRaceProfile(dto)?.abilities?.auto)) {
        const ability = normalizeAbilityKey(increase?.ability);
        const amount = toNumber(increase?.amount, 0);
        if (ability && amount) {
            increases.push({ ability, amount });
        }
    }

    for (const selection of getRaceSelectionList(dto)) {
        if (selection?.type !== "racial-asi") {
            continue;
        }

        // The profile now carries fixed increases; ignore any legacy auto selection.
        if (selection.choiceId === "race-auto-asi" || selection.auto) {
            continue;
        }

        const explicitIncreases = toArray(selection.abilityIncreases)
            .map((increase) => ({
                ability: normalizeAbilityKey(increase?.ability),
                amount: toNumber(increase?.amount, 1)
            }))
            .filter((increase) => increase.ability && increase.amount);

        if (explicitIncreases.length) {
            increases.push(...explicitIncreases);
            continue;
        }

        const amount = toNumber(selection.amount, 1) || 1;
        for (const option of getSelectionOptions(selection)) {
            const ability = normalizeAbilityKey(option.value || option.name || option.label);
            if (ability) {
                increases.push({ ability, amount });
            }
        }
    }

    return increases;
}

function compileAbilityScores(dto) {
    const scores = { ...dto.baseChoices.abilityScores };

    for (const increase of compileRaceAbilityIncreases(dto)) {
        scores[increase.ability] = toNumber(scores[increase.ability], 10) + increase.amount;
    }

    for (const level of dto.levels) {
        for (const ability of toArray(level.AbilityScoreIncrease)) {
            const key = normalizeAbilityKey(ability);
            if (key) {
                scores[key] = toNumber(scores[key], 10) + 1;
            }
        }
    }

    const savingThrows = new Set(dto.baseChoices.startingProficiencies.savingThrows || []);
    getClassSavingThrows(dto.levels?.[0]?.class || null)
        .map(normalizeSaveAbility)
        .filter(Boolean)
        .forEach((save) => savingThrows.add(save));
    const abilities = {};
    for (const key of ABILITY_KEYS) {
        const score = toNumber(scores[key], 10);
        abilities[key] = {
            score,
            modifier: getAbilityModifier(score),
            savingThrow: {
                proficient: savingThrows.has(key)
            }
        };
    }

    return abilities;
}

function normalizeSkillKey(value) {
    return normalizeSearchText(value).replace(/\s+/gu, "");
}

function compileSkills(dto) {
    const skillKeyByNormalized = new Map(SKILLS.flatMap((skill) => [
        [normalizeSkillKey(skill.key), skill.key],
        [normalizeSkillKey(skill.label), skill.key]
    ]));
    const proficientSkills = new Set(toArray(dto.baseChoices.startingProficiencies.skills)
        .map(normalizeSkillKey)
        .map((key) => skillKeyByNormalized.get(key) || key)
        .filter(Boolean));

    // Fixed skill proficiencies granted by the race (e.g. an elf's Perception).
    const profileSkills = toArray(getRaceProfile(dto)?.proficiencies?.skills?.fixed)
        .map(normalizeSkillKey)
        .filter(Boolean);
    for (const granted of profileSkills) {
        const key = skillKeyByNormalized.get(granted);
        if (key) {
            proficientSkills.add(key);
        }
    }

    const skills = {};

    for (const skill of SKILLS) {
        skills[skill.key] = {
            proficient: proficientSkills.has(skill.key),
            expertise: false,
            source: proficientSkills.has(skill.key) ? "baseChoices" : ""
        };
    }

    return skills;
}

function compileProficiencies(dto) {
    const starting = dto.baseChoices.startingProficiencies;
    const firstClass = toArray(dto.levels).find((level) => level?.class)?.class || {};
    const raceProficiencies = getRaceProfile(dto)?.proficiencies || {};

    function fixedClassProficiencies(key) {
        const fixed = toArray(firstClass?.startingProficiencies?.[key]?.fixed);
        const values = fixed.length ? fixed : getClassFallbackProficiencies(firstClass, key);
        return values.filter((value) => !isChoicePlaceholderProficiency(value));
    }

    function fixedRaceProficiencies(key) {
        return toArray(raceProficiencies[key]?.fixed);
    }

    function mergeProficiencies(key) {
        return uniqueProficiencyValues([
            ...fixedClassProficiencies(key),
            ...fixedRaceProficiencies(key),
            ...toArray(starting[key])
        ].filter(Boolean));
    }

    return {
        armor: makeProficiencyEntries(mergeProficiencies("armor"), "baseChoices"),
        weapons: makeProficiencyEntries(mergeProficiencies("weapons"), "baseChoices", formatWeaponProficiencyName),
        tools: makeProficiencyEntries(mergeProficiencies("tools"), "baseChoices"),
        languages: makeProficiencyEntries(mergeProficiencies("languages"), "baseChoices"),
        savingThrows: [...new Set([
            ...getClassSavingThrows(firstClass).map(normalizeSaveAbility).filter(Boolean),
            ...toArray(starting.savingThrows).map(normalizeSaveAbility).filter(Boolean)
        ])]
    };
}

function compileInventory(dto) {
    return {
        currency: deepClone(dto.inventory.currency),
        carried: toArray(dto.inventory.items).map((item, index) => ({
            ...deepClone(item),
            inventoryIndex: index,
            ref: item.catalog?.id || "",
            source: item.source || item.catalog?.source || "",
            attunement: Boolean(item.attuned),
            attuned: Boolean(item.attuned)
        }))
    };
}

function getSelectedFeatSpellValues(dto) {
    return toArray(dto.levels)
        .flatMap((level) => toArray(level?.feat?.choices?.spells)
            .flatMap((choice) => toArray(choice?.values).map((value) => ({
                ...deepClone(value),
                mode: value?.mode || choice?.mode || "known",
                ability: normalizeAbilityKey(value?.ability || choice?.ability || level?.feat?.spellcastingAbility),
                sourceFeat: level?.feat?.name || "Feat"
            }))));
}

function getCompiledSpellName(spell) {
    return spell?.name || spell?.label || spell?.value || "";
}

function addUniqueSpell(target, spell) {
    const name = getCompiledSpellName(spell);
    if (!name) {
        return;
    }

    const key = `${name}|${spell?.source || ""}`.toLowerCase();
    if (target.some((entry) => `${getCompiledSpellName(entry)}|${entry?.source || ""}`.toLowerCase() === key)) {
        return;
    }

    target.push(deepClone(spell));
}

function compileFeatSpells(dto, abilityScores, proficiencyBonus) {
    const selectedSpells = getSelectedFeatSpellValues(dto);
    if (!selectedSpells.length) {
        return {
            ability: "",
            spellAttackBonus: null,
            spellSaveDc: null,
            cantrips: [],
            known: [],
            innate: []
        };
    }

    const ability = selectedSpells.map((spell) => normalizeAbilityKey(spell.ability)).find(Boolean) || "";
    const cantrips = [];
    const known = [];
    const innate = [];

    for (const spell of selectedSpells) {
        if (toNumber(spell.level, 0) === 0) {
            addUniqueSpell(cantrips, spell);
            continue;
        }

        if (spell.mode === "innate") {
            addUniqueSpell(innate, spell);
            continue;
        }

        addUniqueSpell(known, spell);
    }

    const abilityModifier = ability ? abilityScores[ability]?.modifier || 0 : 0;
    return {
        ability,
        spellAttackBonus: ability ? abilityModifier + proficiencyBonus : null,
        spellSaveDc: ability ? 8 + abilityModifier + proficiencyBonus : null,
        cantrips,
        known,
        innate
    };
}

function getClassSpellcastingFallbackKey(classEntry = {}) {
    const entry = classEntry || {};
    const text = normalizeSearchText([
        entry.id,
        entry.name,
        entry.ref,
        entry.options?.catalogId,
        entry.options?.ref,
        entry.options?.sourceId,
        entry.options?.displayName
    ].filter(Boolean).join(" "));

    if (/\branger\b|class[:/-]ranger|class-ranger/u.test(text)) {
        return "ranger";
    }

    return "";
}

function getClassSpellcastingMeta(classEntry = {}) {
    const entry = classEntry || {};
    const fallback = CLASS_SPELLCASTING_FALLBACKS[getClassSpellcastingFallbackKey(entry)] || null;
    const directSpellcasting = entry.spellcasting
        || entry.profile?.spellcasting
        || entry.profile?.class?.spellcasting
        || null;
    const directProgression = entry.progression
        || entry.profile?.progression
        || entry.profile?.class?.progression
        || null;
    const ability = normalizeAbilityKey(directSpellcasting?.ability || fallback?.ability);

    if (!ability) {
        return null;
    }

    return {
        ability,
        casterProgression: directSpellcasting?.casterProgression || fallback?.casterProgression || "",
        preparedSpells: directSpellcasting?.preparedSpells ?? fallback?.preparedSpells ?? "",
        startLevel: toNumber(directSpellcasting?.startLevel ?? directSpellcasting?.level ?? fallback?.startLevel, 0),
        progression: directProgression || fallback?.progression || {}
    };
}

function getProgressionValue(progression = [], classLevel = 1) {
    const values = toArray(progression);
    const index = Math.max(toNumber(classLevel, 1), 1) - 1;
    return toNumber(values[Math.min(index, values.length - 1)], 0);
}

function getSpellSlotProgressionRows(progression = {}) {
    const directRows = toArray(progression.rowsSpellProgression);
    if (directRows.length) {
        return directRows;
    }

    const group = toArray(progression.classTableGroups)
        .find((entry) => toArray(entry?.rowsSpellProgression).length);
    return toArray(group?.rowsSpellProgression);
}

function getClassSpellSlotRow(meta = {}, classLevel = 1) {
    const source = meta || {};
    const rows = getSpellSlotProgressionRows(source.progression || {});
    if (!rows.length) {
        return [];
    }

    const index = Math.max(toNumber(classLevel, 1), 1) - 1;
    return toArray(rows[Math.min(index, rows.length - 1)]).map((value) => toNumber(value, 0));
}

function formatResourceRulesText(value) {
    return String(value || "")
        .replace(/[{]@[^}]+[}]/gu, (match) => {
            const content = match.slice(2, -1);
            const withoutTag = content.replace(/^[a-zA-Z]+ ?/u, "");
            return withoutTag.split("|")[0].trim();
        })
        .replace(/\s+/gu, " ")
        .trim();
}

function formatClassResourceLabel(value) {
    return formatResourceRulesText(value);
}

function shouldExcludeClassResourceLabel(value) {
    const label = normalizeSearchText(formatClassResourceLabel(value));
    if (!label) {
        return true;
    }

    return /cantrips?\s+known|spells?\s+known|spell\s+slots?|slot\s+level|\|spells?\||\blevel=\d+\b/u.test(label);
}

function formatSignedClassResourceBonus(value) {
    const number = toNumber(value, 0);
    return number >= 0 ? `+${number}` : String(number);
}

function formatDiceResourceValue(value) {
    const rolls = toArray(value?.toRoll)
        .map((roll) => {
            const number = toNumber(roll?.number, 0);
            const faces = toNumber(roll?.faces, 0);
            return number && faces ? `${number}d${faces}` : "";
        })
        .filter(Boolean);
    return rolls.join(" + ");
}

function formatClassResourceValue(value) {
    if (value == null) {
        return "";
    }

    if (typeof value === "number") {
        return String(value);
    }

    if (typeof value === "string" || typeof value === "boolean") {
        return formatResourceRulesText(value);
    }

    if (Array.isArray(value)) {
        return value.map(formatClassResourceValue).filter(Boolean).join(", ");
    }

    if (typeof value === "object") {
        if (value.type === "dice") {
            return formatDiceResourceValue(value);
        }
        if (value.type === "bonus") {
            return formatSignedClassResourceBonus(value.value);
        }
        if (value.type === "bonusSpeed") {
            const speed = toNumber(value.value, 0);
            return speed > 0 ? `+${speed} ft.` : "0 ft.";
        }

        const direct = value.label || value.name || value.entry || value.value;
        if (direct != null && direct !== value) {
            return formatClassResourceValue(direct);
        }

        return formatResourceRulesText(JSON.stringify(value));
    }

    return "";
}

function getClassProgression(classEntry = {}) {
    return classEntry?.progression
        || classEntry?.profile?.class?.progression
        || classEntry?.profile?.progression
        || classEntry?.raw?.progression
        || {};
}

function getClassResourceTableGroups(classEntry = {}) {
    const progressionGroups = toArray(getClassProgression(classEntry).classTableGroups);
    if (progressionGroups.length) {
        return progressionGroups;
    }

    return [
        ...toArray(classEntry?.classTableGroups),
        ...toArray(classEntry?.profile?.class?.classTableGroups),
        ...toArray(classEntry?.raw?.classTableGroups)
    ];
}

function createClassResourceTable(tableGroup = {}, classLevel = 1) {
    const rows = toArray(tableGroup.rows);
    const sourceLabels = toArray(tableGroup.colLabels);
    if (!rows.length || !sourceLabels.length) {
        return null;
    }

    const columns = sourceLabels
        .map((label, index) => ({
            index,
            label: formatClassResourceLabel(label)
        }))
        .filter((column) => column.label && !shouldExcludeClassResourceLabel(column.label));

    if (!columns.length) {
        return null;
    }

    const tableRows = rows
        .map((row, rowIndex) => {
            const sourceRow = toArray(row);
            const values = columns
                .map((column) => ({
                    label: column.label,
                    value: formatClassResourceValue(sourceRow[column.index])
                }))
                .filter((entry) => entry.value !== "");

            return {
                level: rowIndex + 1,
                current: rowIndex + 1 === classLevel,
                values
            };
        })
        .filter((row) => row.values.length);

    if (!tableRows.length) {
        return null;
    }

    return {
        title: formatResourceRulesText(tableGroup.title || "Class Progression"),
        columns: columns.map((column) => column.label),
        rows: tableRows
    };
}

function compileClassResources(dto, characterLevel = MAX_CHARACTER_LEVEL) {
    const groups = [];
    const groupByClass = new Map();

    for (const level of getCompiledLevelEntries(dto, characterLevel)) {
        if (!level.class) {
            continue;
        }

        const key = identityKey(level.class) || `class-${groups.length + 1}`;
        const classLevel = toNumber(level.class.classLevel, level.effectiveClassLevel) || level.effectiveClassLevel || 1;
        if (!groupByClass.has(key)) {
            const group = {
                id: level.class.id || "",
                className: identityName(level.class, "Class"),
                source: level.class.source || "",
                classLevel,
                classEntry: level.class
            };
            groupByClass.set(key, group);
            groups.push(group);
            continue;
        }

        const group = groupByClass.get(key);
        group.classLevel = Math.max(group.classLevel, classLevel);
        group.classEntry = level.class;
    }

    return groups
        .map((group) => {
            const tables = getClassResourceTableGroups(group.classEntry)
                .map((tableGroup) => createClassResourceTable(tableGroup, group.classLevel))
                .filter(Boolean);
            const currentValues = tables.flatMap((table) => {
                const row = table.rows.find((entry) => entry.current)
                    || table.rows.find((entry) => entry.level === group.classLevel)
                    || null;
                return toArray(row?.values);
            });

            if (!tables.length || !currentValues.length) {
                return null;
            }

            return {
                id: group.id,
                className: group.className,
                source: group.source,
                classLevel: group.classLevel,
                currentValues,
                tables
            };
        })
        .filter(Boolean);
}

function inferSpellcastingStartLevel(meta = {}) {
    if (toNumber(meta.startLevel, 0) > 0) {
        return toNumber(meta.startLevel, 1);
    }

    const progression = meta.progression || {};
    const known = toArray(progression.spellsKnownProgression);
    const cantrips = toArray(progression.cantripProgression);
    const slotRows = getSpellSlotProgressionRows(progression);
    const maxLength = Math.max(known.length, cantrips.length, slotRows.length);

    for (let index = 0; index < maxLength; index += 1) {
        const hasKnown = toNumber(known[index], 0) > 0;
        const hasCantrips = toNumber(cantrips[index], 0) > 0;
        const hasSlots = toArray(slotRows[index]).some((value) => toNumber(value, 0) > 0);
        if (hasKnown || hasCantrips || hasSlots) {
            return index + 1;
        }
    }

    return meta.ability ? 1 : MAX_CHARACTER_LEVEL + 1;
}

function getClassLevelForGroup(group = {}) {
    return Math.max(0, ...toArray(group.levels).map((level) => toNumber(level?.level, 0)));
}

function createSpellcastingBlock({
    dto,
    abilityScores,
    proficiencyBonus,
    group,
    meta,
    abilityOverride = "",
    preparationStyle = "",
    includeDtoSpells = true,
    requireStartLevel = true
}) {
    if (!meta && !abilityOverride) {
        return null;
    }

    const classLevel = getClassLevelForGroup(group);
    if (requireStartLevel && classLevel < inferSpellcastingStartLevel(meta)) {
        return null;
    }

    const ability = normalizeAbilityKey(abilityOverride || meta?.ability);
    if (!ability) {
        return null;
    }

    const abilityModifier = abilityScores[ability]?.modifier || 0;
    const knownCount = getProgressionValue(meta?.progression?.spellsKnownProgression, classLevel);
    const cantripCount = getProgressionValue(meta?.progression?.cantripProgression, classLevel);
    const preparedSpells = includeDtoSpells ? toArray(dto.spells.prepared) : [];
    const knownSpells = includeDtoSpells ? toArray(dto.spells.known) : [];
    const cantrips = includeDtoSpells ? toArray(dto.spells.cantrips) : [];

    return {
        ability,
        preparationStyle: preparationStyle || (meta?.preparedSpells ? "prepared" : "known"),
        casterProgression: meta?.casterProgression || "",
        spellPool: {
            type: preparationStyle === "dto" ? "dto" : "class",
            entries: []
        },
        preparedSpells,
        cantrips,
        knownSpells,
        innateSpells: [],
        alwaysPrepared: includeDtoSpells ? toArray(dto.spells.alwaysPrepared) : [],
        spellAttackBonus: abilityModifier + proficiencyBonus,
        spellSaveDc: 8 + abilityModifier + proficiencyBonus,
        preparedFormula: meta?.preparedSpells || "",
        preparedCount: preparedSpells.length,
        spellsKnown: knownCount || knownSpells.length,
        cantripsKnown: cantripCount || cantrips.length,
        slotProgression: getClassSpellSlotRow(meta, classLevel)
    };
}

function getClassLevelMap(levels) {
    const classLevelMap = new Map();
    for (const level of toArray(levels)) {
        if (!level?.class) {
            continue;
        }

        const key = identityKey(level.class) || `class-${classLevelMap.size + 1}`;
        const nextClassLevel = (classLevelMap.get(key) || 0) + 1;
        classLevelMap.set(key, nextClassLevel);
    }
    return classLevelMap;
}

function getPrimarySpellcastingAbility(dto) {
    const explicitAbility = normalizeAbilityKey(dto.spells.spellcastingAbility);
    if (explicitAbility) {
        return explicitAbility;
    }

    for (const level of toArray(dto.levels)) {
        const ability = normalizeAbilityKey(getClassSpellcastingMeta(level?.class)?.ability);
        if (ability) {
            return ability;
        }
    }

    return "";
}

function createClassChoiceSpellEntry(value = {}, choice = {}, level = {}) {
    const name = value.name || value.label || value.value || "";
    if (!name) {
        return null;
    }

    return {
        ...deepClone(value),
        name,
        ref: value.ref || value.recordId || value.value || "",
        source: value.source || choice.source || "",
        level: toNumber(value.level, 0),
        mode: value.mode || choice.mode || "known",
        sourceFeature: choice.label || choice.featureName || "Class Option",
        sourceClass: level.class?.name || ""
    };
}

function createClassGroupSpellEntry(spellGrant = {}, choice = {}, level = {}) {
    const name = spellGrant.name || spellGrant.label || spellGrant.value || "";
    if (!name) {
        return null;
    }

    return {
        ...deepClone(spellGrant),
        name,
        ref: spellGrant.ref || spellGrant.id || "",
        source: spellGrant.source || choice.source || "",
        level: toNumber(spellGrant.level, 0),
        mode: spellGrant.mode || "prepared",
        sourceFeature: choice.label || choice.featureName || "Class Option",
        sourceClass: level.class?.name || ""
    };
}

function addSpellByMode(groups, spell) {
    if (!spell) {
        return;
    }

    if (toNumber(spell.level, 0) === 0) {
        addUniqueSpell(groups.cantrips, spell);
        return;
    }

    if (spell.mode === "innate") {
        addUniqueSpell(groups.innate, spell);
        return;
    }

    if (spell.mode === "prepared") {
        addUniqueSpell(groups.alwaysPrepared, spell);
        return;
    }

    addUniqueSpell(groups.known, spell);
}

function compileClassChoiceSpells(dto, abilityScores, proficiencyBonus, characterLevel = MAX_CHARACTER_LEVEL) {
    const activeLevels = getCompiledLevelEntries(dto, characterLevel);
    const classLevelMap = getClassLevelMap(activeLevels);
    const groups = {
        cantrips: [],
        known: [],
        alwaysPrepared: [],
        innate: []
    };

    for (const level of activeLevels) {
        if (!level.class) {
            continue;
        }

        const classKey = identityKey(level.class);
        const currentClassLevel = classLevelMap.get(classKey) || toNumber(level.class.classLevel, level.effectiveClassLevel);
        for (const choice of toArray(level.choices).filter((entry) => entry?.type === "class-option")) {
            if (choice.spellChoice || choice.choiceType === "spell") {
                for (const value of toArray(choice.values)) {
                    addSpellByMode(groups, createClassChoiceSpellEntry(value, choice, level));
                }
                continue;
            }

            if (choice.spellGroupChoice || choice.choiceType === "spell-group") {
                for (const value of toArray(choice.values)) {
                    for (const spellGrant of toArray(value?.spellGrants)) {
                        const unlockAtLevel = toNumber(spellGrant.unlockAtLevel, 0);
                        if (unlockAtLevel && currentClassLevel < unlockAtLevel) {
                            continue;
                        }
                        addSpellByMode(groups, createClassGroupSpellEntry(spellGrant, choice, level));
                    }
                }
            }
        }
    }

    const ability = getPrimarySpellcastingAbility(dto);
    const abilityModifier = ability ? abilityScores[ability]?.modifier || 0 : 0;
    return {
        ability,
        spellAttackBonus: ability ? abilityModifier + proficiencyBonus : null,
        spellSaveDc: ability ? 8 + abilityModifier + proficiencyBonus : null,
        cantrips: groups.cantrips,
        known: groups.known,
        alwaysPrepared: groups.alwaysPrepared,
        innate: groups.innate
    };
}

function compileClasses(dto, abilityScores, proficiencyBonus, characterLevel = MAX_CHARACTER_LEVEL) {
    const groups = [];
    const groupByClass = new Map();
    const classLevelCounts = new Map();
    const spellcastingMetaByClass = new Map();
    const spellcastingAbility = normalizeAbilityKey(dto.spells.spellcastingAbility);

    for (const level of getCompiledLevelEntries(dto, characterLevel)) {
        if (!level.class) {
            continue;
        }

        const key = identityKey(level.class) || `class-${groups.length + 1}`;
        const nextClassLevel = (classLevelCounts.get(key) || 0) + 1;
        classLevelCounts.set(key, nextClassLevel);

        if (!groupByClass.has(key)) {
            const group = {
                main: identityName(level.class),
                id: level.class.id || "",
                source: level.class.source || "",
                sub: level.subclass?.name || "",
                subclassRef: level.subclass?.id || "",
                subclassVariant: null,
                isPrimary: groups.length === 0,
                isFirstClass: groups.length === 0,
                hitDieSize: toNumber(level.class.hitDie, 8),
                multiclassPrerequisite: null,
                fightingStyles: null,
                spellcasting: null,
                levels: []
            };
            groupByClass.set(key, group);
            groups.push(group);
        }

        if (!spellcastingMetaByClass.has(key)) {
            const meta = getClassSpellcastingMeta(level.class);
            if (meta) {
                spellcastingMetaByClass.set(key, meta);
            }
        }

        const group = groupByClass.get(key);
        if (!group.sub && level.subclass?.name) {
            group.sub = level.subclass.name;
            group.subclassRef = level.subclass.id || "";
        }

        const classLevel = toNumber(level.class.classLevel, level.effectiveClassLevel || nextClassLevel) || level.effectiveClassLevel || nextClassLevel;
        const featureNames = [
            ...toArray(level.features)
                .map(getFeatureName),
            ...getAutomaticClassFeaturesForLevel(level, classLevel)
                .map((feature) => feature.name),
            ...getAutomaticSubclassFeaturesForLevel(level, classLevel)
                .map((feature) => feature.name)
        ].filter(Boolean);

        group.levels.push({
            level: classLevel,
            hpRolled: toNumber(level.hp, 0),
            decisions: toArray(level.choices).map(deepClone),
            featuresGained: [...new Set(featureNames)]
        });
    }

    if (spellcastingAbility && groups.length) {
        const [primaryKey] = groupByClass.keys();
        groups[0].spellcasting = createSpellcastingBlock({
            dto,
            abilityScores,
            proficiencyBonus,
            group: groups[0],
            meta: spellcastingMetaByClass.get(primaryKey) || null,
            abilityOverride: spellcastingAbility,
            preparationStyle: "dto",
            includeDtoSpells: true,
            requireStartLevel: false
        });
    } else {
        for (const [key, group] of groupByClass.entries()) {
            group.spellcasting = createSpellcastingBlock({
                dto,
                abilityScores,
                proficiencyBonus,
                group,
                meta: spellcastingMetaByClass.get(key) || null,
                includeDtoSpells: group.isPrimary
            });
        }
    }

    return groups;
}

function getCanonicalCatalogId(identity, prefixes = []) {
    const candidates = [
        identity?.options?.catalogId,
        identity?.catalogId,
        identity?.featureId,
        identity?.id,
        identity?.sourceId,
        identity?.refId
    ];

    for (const candidate of candidates) {
        const text = String(candidate || "").trim();
        if (!text || !text.includes(":")) {
            continue;
        }

        if (!prefixes.length || prefixes.some((prefix) => text.startsWith(prefix))) {
            return text;
        }
    }

    return "";
}

function getFeatureName(feature) {
    return typeof feature === "string"
        ? feature
        : feature?.name || feature?.label || feature?.value || "";
}

function getFeatureIdentity(feature, prefixes = []) {
    if (!feature || typeof feature !== "object") {
        return "";
    }

    return getCanonicalCatalogId(feature, prefixes) || feature.id || feature.ref || "";
}

function featureRecordKey(feature) {
    const id = getFeatureIdentity(feature, ["class-feature:", "subclass-feature:"]);
    const name = getFeatureName(feature);
    const level = getFeatureLevel(feature);
    const source = typeof feature === "object" ? feature.source || "" : "";
    return [id, name, source, level].map((value) => String(value || "").toLowerCase()).join("|");
}

function uniqueFeatureRecords(records) {
    const seen = new Set();
    const result = [];

    for (const record of toArray(records)) {
        const name = getFeatureName(record);
        if (!name) {
            continue;
        }

        const key = featureRecordKey(record);
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(record);
    }

    return result;
}

function getClassFeatureRecords(classEntry = {}) {
    const entry = classEntry || {};
    const profileFeatures = [
        ...toArray(entry.profile?.features?.classFeatures),
        ...toArray(entry.features?.classFeatures),
        ...toArray(entry.classFeatures),
        ...toArray(entry.raw?.classFeatures)
    ];
    const fallbackKey = getClassFallbackKey(entry);
    const fallbackFeatures = fallbackKey ? toArray(CLASS_FEATURE_FALLBACKS[fallbackKey]) : [];
    return uniqueFeatureRecords([...profileFeatures, ...fallbackFeatures]);
}

function getSubclassFeatureRecords(classEntry = {}, subclassEntry = {}) {
    const subclass = subclassEntry || {};
    const profileFeatures = [
        ...toArray(subclass.profile?.features?.subclassFeatures),
        ...toArray(subclass.features?.subclassFeatures),
        ...toArray(subclass.subclassFeatures),
        ...toArray(subclass.raw?.subclassFeatures)
    ];
    const fallbackKey = getSubclassFallbackKey(classEntry, subclass);
    const fallbackFeatures = fallbackKey ? toArray(SUBCLASS_FEATURE_FALLBACKS[fallbackKey]) : [];
    return uniqueFeatureRecords([...profileFeatures, ...fallbackFeatures]);
}

function createCompiledFeature(feature, level, category, sourceFallback, prefixes) {
    const name = getFeatureName(feature);
    if (!name) {
        return null;
    }

    const catalogId = typeof feature === "object"
        ? getCanonicalCatalogId(feature, prefixes)
        : "";

    return {
        id: typeof feature === "object" ? feature.id || catalogId || feature.ref || "" : "",
        catalogId,
        name,
        source: typeof feature === "object" ? feature.source || sourceFallback : sourceFallback,
        category,
        level: typeof feature === "object" && getFeatureLevel(feature)
            ? getFeatureLevel(feature)
            : level.characterLevel,
        description: typeof feature === "object" ? feature.description || feature.summary || "" : "",
        rulesEntries: typeof feature === "object" ? feature.rulesEntries || feature.entries || feature.raw?.entries || null : null
    };
}

function isOptionalFeatureRecord(feature) {
    return typeof feature === "object" && feature !== null && feature.optional === true;
}

function featureOptInTokens(entry) {
    if (!entry) {
        return [];
    }

    if (typeof entry === "string") {
        return [entry.toLowerCase()];
    }

    return [
        entry.name,
        entry.label,
        entry.featureName,
        entry.id,
        entry.ref,
        entry.catalogId,
        getCanonicalCatalogId(entry, ["class-feature:", "subclass-feature:"])
    ].map((token) => String(token || "").toLowerCase()).filter(Boolean);
}

// Optional class/subclass features (e.g. Tasha's "Dedicated Weapon", "Ki-Fueled
// Attack") live inline in the catalog's classFeatures list with optional:true.
// They are only "gained" when the character explicitly opts in, which the level
// editor records into that level's stored features/choices. Collect those tokens
// so the automatic-feature pass can tell a chosen optional from an unchosen one.
function collectOptInKeysFromLevels(levels) {
    const keys = new Set();

    for (const level of toArray(levels)) {
        for (const feature of toArray(level?.features)) {
            featureOptInTokens(feature).forEach((token) => keys.add(token));
        }

        for (const choice of toArray(level?.choices)) {
            featureOptInTokens(choice).forEach((token) => keys.add(token));
            for (const value of toArray(choice?.values)) {
                featureOptInTokens(value).forEach((token) => keys.add(token));
            }
        }
    }

    return keys;
}

function isFeatureOptedIn(feature, optInKeys) {
    if (!optInKeys || optInKeys.size === 0) {
        return false;
    }

    return featureOptInTokens(feature).some((token) => optInKeys.has(token));
}

function includeAutomaticFeature(feature, optInKeys) {
    return !isOptionalFeatureRecord(feature) || isFeatureOptedIn(feature, optInKeys);
}

function getAutomaticClassFeaturesForLevel(level, classLevel) {
    const optInKeys = collectOptInKeysFromLevels([level]);
    return getClassFeatureRecords(level.class)
        .filter((feature) => getFeatureLevel(feature) === classLevel)
        .filter((feature) => includeAutomaticFeature(feature, optInKeys))
        .map((feature) => createCompiledFeature(
            feature,
            level,
            "Class Feature",
            level.class?.source || level.class?.name || "class",
            ["class-feature:"]
        ))
        .filter(Boolean);
}

function getAutomaticSubclassFeaturesForLevel(level, classLevel) {
    if (!level.subclass) {
        return [];
    }

    const optInKeys = collectOptInKeysFromLevels([level]);
    return getSubclassFeatureRecords(level.class, level.subclass)
        .filter((feature) => getFeatureLevel(feature) === classLevel)
        .filter((feature) => includeAutomaticFeature(feature, optInKeys))
        .map((feature) => createCompiledFeature(
            feature,
            level,
            "Subclass Feature",
            level.subclass?.source || level.subclass?.name || "subclass",
            ["subclass-feature:"]
        ))
        .filter(Boolean);
}

function normalizeBackgroundFeatureName(value) {
    return normalizeSearchText(String(value || "")
        .replace(/^feature:\s*/iu, "")
        .replace(/\s+/gu, " ")
        .trim());
}

function findBackgroundFeatureRules(background = {}) {
    const directRules = background.rulesEntries
        || background.featureRules
        || background.profile?.background?.featureRules
        || background.profile?.background?.featureEntries
        || null;
    if (directRules) {
        return directRules;
    }

    const featureName = normalizeBackgroundFeatureName(background.feature);
    const entries = [
        ...toArray(background.entries),
        ...toArray(background.raw?.entries),
        ...toArray(background.profile?.background?.entries)
    ].filter((entry) => entry && typeof entry === "object");
    const featureEntries = entries.filter((entry) => {
        const entryName = normalizeBackgroundFeatureName(entry.name);
        return Boolean(entry?.data?.isFeature)
            || /^feature:/iu.test(String(entry.name || ""))
            || (featureName && entryName === featureName);
    });

    if (!featureEntries.length) {
        return null;
    }

    return featureEntries.find((entry) => normalizeBackgroundFeatureName(entry.name) === featureName)
        || (featureEntries.length === 1 ? featureEntries[0] : null);
}

function featureOutputKey(feature) {
    return [
        feature.catalogId || feature.id || "",
        feature.category || "",
        feature.name || "",
        feature.level || ""
    ].map((value) => String(value || "").toLowerCase()).join("|");
}

function compileFeatures(dto, characterLevel = MAX_CHARACTER_LEVEL) {
    const features = [];
    const seen = new Set();

    function addFeature(feature) {
        if (!feature?.name) {
            return;
        }

        const key = featureOutputKey(feature);
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        features.push(feature);
    }

    if (dto.baseChoices.background?.feature) {
        const background = dto.baseChoices.background;
        addFeature({
            id: background.id || "background-feature",
            catalogId: background.options?.catalogId || background.id || "",
            name: background.feature,
            source: background.source || background.id || background.name || "background",
            category: "Background Feature",
            level: 1,
            rulesEntries: findBackgroundFeatureRules(background)
        });
    }

    for (const selection of getBackgroundSelectionList(dto)) {
        const valueLabel = getSelectionLabel(selection);
        if (!valueLabel) {
            continue;
        }

        addFeature({
            id: selection.choiceId || `background-${selection.type || "choice"}`,
            name: `${selection.label || "Background Option"}: ${valueLabel}`,
            source: selection.sourceName || dto.baseChoices.background?.name || "background",
            category: "Background Feature"
        });
    }

    compileBackgroundGrantedFeats(dto).forEach(addFeature);

    for (const level of getCompiledLevelEntries(dto, characterLevel)) {
        if (level.class) {
            for (const feature of toArray(level.features)) {
                addFeature(createCompiledFeature(
                    feature,
                    level,
                    "Class Feature",
                    level.class.source || level.class.name || "class",
                    ["class-feature:"]
                ));
            }

            for (const choice of toArray(level.choices).filter((entry) => entry?.type === "class-option" && !entry?.optionalFeature)) {
                // Optional-feature opt-ins (entry.optionalFeature) are recorded as
                // class-option choices too, but they describe a single toggled feature
                // rather than a "choose from a list" selection. They are surfaced
                // cleanly by the automatic class-feature pass (which now honors opt-in),
                // so skip them here to avoid a redundant "Feature: Feature" entry.
                const valueLabel = toArray(choice.values)
                    .map((value) => value?.label || value?.name || value?.value)
                    .filter(Boolean)
                    .join(", ");
                if (!valueLabel) {
                    continue;
                }

                const catalogId = getCanonicalCatalogId(choice, ["class-feature:", "subclass-feature:"]);
                addFeature({
                    id: choice.choiceId || "",
                    catalogId,
                    name: `${choice.label || choice.featureName || "Class Option"}: ${valueLabel}`,
                    source: choice.featureId || level.class.id || level.class.name || "class",
                    category: "Class Feature",
                    level: level.characterLevel
                });
            }

            const classLevel = toNumber(level.class.classLevel, level.effectiveClassLevel) || level.effectiveClassLevel;
            getAutomaticClassFeaturesForLevel(level, classLevel).forEach(addFeature);
            getAutomaticSubclassFeaturesForLevel(level, classLevel).forEach(addFeature);
        }

        if (toArray(level.AbilityScoreIncrease).length) {
            addFeature({
                id: `asi-${level.characterLevel}`,
                name: `Ability Score Increase: ${toArray(level.AbilityScoreIncrease).map((ability) => ability.toUpperCase()).join(", ")}`,
                source: `Level ${level.characterLevel}`,
                category: "Ability Score Increase",
                level: level.characterLevel
            });
        }

        if (level.feat) {
            const featCatalogId = getCanonicalCatalogId(level.feat, ["feat:"]);
            const featId = featCatalogId || level.feat.id || "";
            addFeature({
                id: featId,
                catalogId: featCatalogId,
                name: formatFeatName(level.feat),
                source: featCatalogId || level.feat.source || "feat",
                category: "ASI Feat",
                level: level.characterLevel
            });
        }
    }

    compileSubclassFeatures(dto, characterLevel).forEach(addFeature);
    return features;
}

function getClassLevelCounts(dto) {
    const classLevelCounts = new Map();

    for (const level of dto.levels) {
        if (!level.class) {
            continue;
        }

        const key = identityKey(level.class) || `class-${classLevelCounts.size + 1}`;
        classLevelCounts.set(key, (classLevelCounts.get(key) || 0) + 1);
    }

    return classLevelCounts;
}

function getFeatureLevel(feature) {
    return toNumber(feature?.level ?? feature?.classLevel ?? feature?.subclassLevel, 0);
}

function compileSubclassFeatures(dto, characterLevel = MAX_CHARACTER_LEVEL) {
    const classLevelCounts = getClassLevelCounts(dto);
    const levelEntries = getCompiledLevelEntries(dto, characterLevel);
    const optInKeys = collectOptInKeysFromLevels(levelEntries);
    const features = [];
    const seen = new Set();

    for (const level of levelEntries) {
        const subclass = level.subclass;
        if (!subclass) {
            continue;
        }

        const classKey = identityKey(level.class);
        const currentClassLevel = classKey
            ? level.effectiveClassLevel || classLevelCounts.get(classKey) || 0
            : toNumber(level.class?.classLevel, level.characterLevel);
        const source = subclass.id || subclass.name || "subclass";

        for (const feature of getSubclassFeatureRecords(level.class, subclass)) {
            const name = getFeatureName(feature);
            if (!name) {
                continue;
            }

            if (!includeAutomaticFeature(feature, optInKeys)) {
                continue;
            }

            const featureLevel = getFeatureLevel(feature);
            if (featureLevel && currentClassLevel && featureLevel > currentClassLevel) {
                continue;
            }

            const catalogId = typeof feature === "object"
                ? getCanonicalCatalogId(feature, ["subclass-feature:"])
                : "";
            const id = typeof feature === "object" ? feature.id || feature.ref || catalogId || name : name;
            const key = `${source}|${id}|${name}`.toLowerCase();
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            features.push({
                id,
                catalogId,
                name,
                source: typeof feature === "object" ? feature.source || source : source,
                category: "Subclass Feature",
                level: featureLevel || level.characterLevel,
                description: typeof feature === "object" ? feature.description || feature.summary || "" : "",
                rulesEntries: typeof feature === "object" ? feature.rulesEntries || feature.entries || feature.raw?.entries || null : null
            });
        }
    }

    return features;
}

function compileRaceFeatureChoices(dto) {
    return getRaceSelectionList(dto).map((selection) => ({
        id: selection.choiceId || "",
        type: selection.type || "",
        label: selection.label || "",
        value: getSelectionLabel(selection),
        source: selection.sourceName || dto.baseChoices.race?.name || "race"
    }));
}

function compileBackgroundFeatureChoices(dto) {
    return getBackgroundSelectionList(dto).map((selection) => ({
        id: selection.choiceId || "",
        type: selection.type || "",
        label: selection.label || "",
        value: getSelectionLabel(selection),
        source: selection.sourceName || dto.baseChoices.background?.name || "background"
    }));
}

function compileRaceFeatures(dto, characterLevel) {
    const features = [];

    function addFeature(id, name, source, description = "", category = "Race Feature") {
        if (!name) {
            return;
        }

        if (features.some((feature) => feature.id === id && feature.name === name)) {
            return;
        }

        features.push({
            id,
            name,
            source,
            description,
            category
        });
    }

    const raceProfile = getRaceProfile(dto);
    for (const grant of toArray(raceProfile?.feats?.granted)) {
        addFeature(
            grant?.id || grant?.ref || String(grant),
            `Race Feat: ${formatFeatGrantLabel(grant)}`,
            dto.baseChoices.race?.name || "race",
            "",
            "Race Feature"
        );
    }

    toArray(raceProfile?.feats?.choices).forEach((choice, index) => {
        const options = toArray(choice?.from).map(formatFeatGrantLabel).filter(Boolean).join(", ");
        addFeature(
            `race-feat-choice-${index + 1}`,
            [`Race Feat Choice: Choose ${Math.max(toNumber(choice?.count, 1), 1)}`, options].filter(Boolean).join(": "),
            dto.baseChoices.race?.name || "race",
            "",
            "Race Feature"
        );
    });

    for (const selection of getRaceSelectionList(dto)) {
        const source = selection.sourceName || dto.baseChoices.race?.name || "race";
        const valueLabel = getSelectionLabel(selection);
        const id = selection.choiceId || `race-${selection.type || "choice"}`;

        if (["racial-asi", "size", "spell-ability"].includes(selection.type)) {
            continue;
        }

        if (selection.type === "draconic-ancestry") {
            addFeature(id, `${selection.label || "Draconic Ancestry"}: ${valueLabel}`, source);

            if (isFtdDragonbornSelection(dto, selection) && characterLevel >= 5) {
                const family = getDragonbornFamily(dto, selection);
                const damageType = getSelectionOptions(selection)[0]?.damageType || "";
                if (family === "chromatic") {
                    addFeature("race-chromatic-warding", "Chromatic Warding", source, damageType ? `Gain immunity to ${damageType} damage for 1 minute once per long rest.` : "");
                } else if (family === "gem") {
                    addFeature("race-gem-flight", "Gem Flight", source, "Manifest spectral wings and fly for 1 minute once per long rest.");
                } else if (family === "metallic") {
                    addFeature("race-metallic-breath-weapon", "Metallic Breath Weapon", source, "Gain Enervating Breath and Repulsion Breath once per long rest.");
                }
            }
            continue;
        }

        if (selection.type === "cantrip") {
            addFeature(id, `Racial Cantrip: ${valueLabel}`, source);
            continue;
        }

        addFeature(id, `${selection.label || titleCase(selection.type)}: ${valueLabel}`, source);
    }

    return features;
}

function hasRecordedSpellSlots(slots = {}) {
    const byLevel = slots.byLevel || slots;
    return Object.values(byLevel).some((slot) => {
        if (slot && typeof slot === "object") {
            return toNumber(slot.max, 0) > 0 || toNumber(slot.expended, 0) > 0;
        }

        return toNumber(slot, 0) > 0;
    });
}

function createSpellSlotsFromProgression(row = []) {
    const byLevel = {};

    toArray(row).forEach((max, index) => {
        const value = toNumber(max, 0);
        if (value > 0) {
            byLevel[String(index + 1)] = {
                max: value,
                expended: 0
            };
        }
    });

    return { byLevel };
}

function compileSpellSlots(dto, classes = []) {
    const slots = dto.spells.spellSlots || {};
    if (slots.byLevel && hasRecordedSpellSlots(slots)) {
        return deepClone(slots);
    }

    if (!slots.byLevel && hasRecordedSpellSlots(slots)) {
        return {
            byLevel: deepClone(slots)
        };
    }

    const spellcaster = toArray(classes)
        .find((entry) => toArray(entry?.spellcasting?.slotProgression).some((value) => toNumber(value, 0) > 0));
    if (spellcaster) {
        return createSpellSlotsFromProgression(spellcaster.spellcasting.slotProgression);
    }

    return { byLevel: {} };
}

function getWeaponPropertyValues(record = {}) {
    return [
        ...toArray(record.property),
        ...toArray(record.weapon?.properties).flatMap((property) => [
            property?.code,
            property?.abbreviation,
            property?.name
        ])
    ].map((value) => String(value || "").trim()).filter(Boolean);
}

function getWeaponDamageDice(record = {}, mode = "primary") {
    if (mode === "versatile") {
        return record.dmg2 || record.weapon?.damage?.versatile || "";
    }

    return record.dmg1 || record.weapon?.damage?.primary || "";
}

function getWeaponDamageType(record = {}) {
    return record.dmgType
        || record.damageType
        || record.weapon?.damage?.type?.code
        || record.weapon?.damage?.type?.name
        || "";
}

function getFirstParsedBonus(candidates = []) {
    for (const candidate of candidates) {
        const bonus = parseOptionalNumber(candidate);
        if (bonus != null) {
            return bonus;
        }
    }

    return 0;
}

function getWeaponAttackBonus(record = {}) {
    return getFirstParsedBonus([
        record.bonusWeaponAttack,
        record.bonuses?.bonusWeaponAttack,
        record.weapon?.bonuses?.bonusWeaponAttack,
        record.raw?.bonusWeaponAttack,
        record.bonusWeapon,
        record.bonuses?.bonusWeapon,
        record.weapon?.bonuses?.bonusWeapon,
        record.raw?.bonusWeapon
    ]);
}

function getWeaponDamageBonus(record = {}) {
    return getFirstParsedBonus([
        record.bonusWeaponDamage,
        record.bonuses?.bonusWeaponDamage,
        record.weapon?.bonuses?.bonusWeaponDamage,
        record.raw?.bonusWeaponDamage,
        record.bonusWeapon,
        record.bonuses?.bonusWeapon,
        record.weapon?.bonuses?.bonusWeapon,
        record.raw?.bonusWeapon
    ]);
}

function formatWeaponDamageDice(dice, damageBonus) {
    const text = String(dice || "").trim();
    if (!text || !damageBonus || /(?:^|\s)[+-]\s*\d+\b/u.test(text)) {
        return text;
    }

    return `${text} ${damageBonus >= 0 ? "+" : "-"}${Math.abs(damageBonus)}`;
}

function isWeaponInventoryItem(item = {}) {
    const record = item.snapshot || {};
    return Boolean(
        item.equipped
        && (
            record.isWeapon === true
            || record.weapon === true
            || (record.weapon != null && typeof record.weapon === "object")
            || record.weaponCategory
            || getWeaponDamageDice(record)
        )
    );
}

function compileAttacks(dto, abilityScores, proficiencyBonus) {
    return toArray(dto.inventory.items)
        .filter(isWeaponInventoryItem)
        .map((item) => {
            const record = item.snapshot || {};
            const properties = getWeaponPropertyValues(record).map((value) => value.toUpperCase());
            const finesse = properties.includes("F") || properties.includes("FINESSE");
            const ranged = String(record.weaponCategory || record.weapon?.category || record.type || "").toLowerCase().includes("ranged");
            const ability = ranged || (finesse && abilityScores.dex.modifier > abilityScores.str.modifier) ? "dex" : "str";
            const modifier = abilityScores[ability].modifier;
            const attackBonus = getWeaponAttackBonus(record);
            const damageBonus = getWeaponDamageBonus(record);

            return {
                name: item.name,
                ability,
                attackBonus: modifier + proficiencyBonus + attackBonus,
                damage: formatWeaponDamageDice(getWeaponDamageDice(record), damageBonus),
                damageType: getWeaponDamageType(record),
                weaponBonus: attackBonus,
                damageBonus
            };
        });
}

function compileHitDice(classes) {
    return classes.map((entry) => ({
        size: `d${entry.hitDieSize || 8}`,
        total: entry.levels.length,
        remaining: entry.levels.length,
        class: entry.main || "Class"
    }));
}

function getStructuredDefenses(source = {}) {
    if (!source || typeof source !== "object") {
        return {};
    }

    return source.defenses
        || source.grants?.defenses
        || source.profile?.defenses
        || {};
}

function addDefenseGroup(targets, defenses = {}) {
    toArray(defenses.damageResistances).forEach((value) => addUnique(targets.damageResistances, value));
    toArray(defenses.resistances).forEach((value) => addUnique(targets.damageResistances, value));
    toArray(defenses.resistances?.fixed).forEach((value) => addUnique(targets.damageResistances, value));

    toArray(defenses.damageImmunities).forEach((value) => addUnique(targets.damageImmunities, value));
    toArray(defenses.immunities).forEach((value) => addUnique(targets.damageImmunities, value));
    toArray(defenses.immunities?.fixed).forEach((value) => addUnique(targets.damageImmunities, value));

    toArray(defenses.damageVulnerabilities).forEach((value) => addUnique(targets.damageVulnerabilities, value));
    toArray(defenses.vulnerabilities).forEach((value) => addUnique(targets.damageVulnerabilities, value));
    toArray(defenses.vulnerabilities?.fixed).forEach((value) => addUnique(targets.damageVulnerabilities, value));

    toArray(defenses.conditionImmunities).forEach((value) => addUnique(targets.conditionImmunities, value));
    toArray(defenses.conditionImmunities?.fixed).forEach((value) => addUnique(targets.conditionImmunities, value));
}

function addIdentityDefenses(targets, identity) {
    if (!identity || typeof identity !== "object") {
        return;
    }

    addDefenseGroup(targets, getStructuredDefenses(identity));
    addDefenseGroup(targets, identity);
}

function addItemDefenses(targets, item = {}) {
    const record = item.snapshot || {};
    addDefenseGroup(targets, getStructuredDefenses(item));
    addDefenseGroup(targets, getStructuredDefenses(record));
    addDefenseGroup(targets, record);

    toArray(record?._fRes).forEach((value) => addUnique(targets.damageResistances, value));
    toArray(record?._fImm).forEach((value) => addUnique(targets.damageImmunities, value));
    toArray(record?._fCondImm).forEach((value) => addUnique(targets.conditionImmunities, value));
}

function compileDefenses(dto) {
    const targets = {
        damageResistances: new Set(),
        damageImmunities: new Set(),
        damageVulnerabilities: new Set(),
        conditionImmunities: new Set()
    };

    // Fixed defenses granted directly by the race (Tiefling fire resistance,
    // Skeleton poison immunity, and so on).
    const profileDefenses = getRaceProfile(dto)?.defenses || {};
    addDefenseGroup(targets, profileDefenses);
    addDefenseGroup(targets, dto.combatState?.defenses);
    addDefenseGroup(targets, dto.combatState);
    addIdentityDefenses(targets, dto.baseChoices.race);
    addIdentityDefenses(targets, dto.baseChoices.subrace);
    addIdentityDefenses(targets, dto.baseChoices.background);

    for (const selection of getRaceSelectionList(dto)) {
        for (const option of getSelectionOptions(selection)) {
            const defenses = option?.grants?.defenses || {};
            const skipResistance = selection.type === "draconic-ancestry" && isEgwDragonbornSelection(dto, selection);

            if (!skipResistance) {
                toArray(defenses.damageResistances).forEach((value) => addUnique(targets.damageResistances, value));
            }
            toArray(defenses.damageImmunities).forEach((value) => addUnique(targets.damageImmunities, value));
            toArray(defenses.damageVulnerabilities).forEach((value) => addUnique(targets.damageVulnerabilities, value));
            toArray(defenses.conditionImmunities).forEach((value) => addUnique(targets.conditionImmunities, value));

            if (selection.type === "draconic-ancestry" && option.damageType && !skipResistance) {
                addUnique(targets.damageResistances, option.damageType);
            }
        }
    }

    for (const level of toArray(dto.levels)) {
        addIdentityDefenses(targets, level.class);
        addIdentityDefenses(targets, level.subclass);
        addIdentityDefenses(targets, level.feat);
        for (const choice of toArray(level.choices)) {
            addDefenseGroup(targets, choice?.grants?.defenses || choice?.defenses);
        }
    }

    for (const item of toArray(dto.inventory?.items)) {
        addItemDefenses(targets, item);
    }

    return {
        damageResistances: toUniqueArray(targets.damageResistances),
        damageImmunities: toUniqueArray(targets.damageImmunities),
        damageVulnerabilities: toUniqueArray(targets.damageVulnerabilities),
        conditionImmunities: toUniqueArray(targets.conditionImmunities)
    };
}

function getDragonBreathDice(dto, selection, characterLevel) {
    if (isFtdDragonbornSelection(dto, selection)) {
        if (characterLevel >= 17) {
            return "4d10";
        }
        if (characterLevel >= 11) {
            return "3d10";
        }
        if (characterLevel >= 5) {
            return "2d10";
        }
        return "1d10";
    }

    if (characterLevel >= 16) {
        return "5d6";
    }
    if (characterLevel >= 11) {
        return "4d6";
    }
    if (characterLevel >= 6) {
        return "3d6";
    }
    return "2d6";
}

function getDragonBreathArea(dto, selection, option) {
    if (option?.breathWeapon) {
        return option.breathWeapon;
    }

    if (isFtdDragonbornSelection(dto, selection)) {
        return getDragonbornFamily(dto, selection) === "chromatic"
            ? "30 ft. line, 5 ft. wide"
            : "15 ft. cone";
    }

    return "";
}

function getDragonBreathSave(selection, option) {
    const explicitSave = normalizeSaveAbility(option?.savingThrow);
    if (explicitSave) {
        return explicitSave;
    }

    const breath = normalizeSearchText(option?.breathWeapon);
    if (/\bcon\b|constitution/iu.test(breath)) {
        return "con";
    }

    if (/\bstr\b|strength/iu.test(breath)) {
        return "str";
    }

    if (/\bwis\b|wisdom/iu.test(breath)) {
        return "wis";
    }

    if (/\bcha\b|charisma/iu.test(breath)) {
        return "cha";
    }

    if (/\bint\b|intelligence/iu.test(breath)) {
        return "int";
    }

    void selection;
    return "dex";
}

function compileRaceActions(dto, abilityScores, proficiencyBonus, characterLevel) {
    const actions = [];

    for (const selection of getRaceSelectionList(dto)) {
        if (selection.type !== "draconic-ancestry") {
            continue;
        }

        const option = getSelectionOptions(selection)[0] || {};
        const damageType = option.damageType || "";
        const saveAbility = getDragonBreathSave(selection, option);
        const saveDc = 8 + (abilityScores.con?.modifier || 0) + proficiencyBonus;
        const area = getDragonBreathArea(dto, selection, option);
        const damageDice = getDragonBreathDice(dto, selection, characterLevel);
        const source = selection.sourceName || dto.baseChoices.race?.name || "race";
        const ancestry = option.label || option.value || selection.value || "";
        const ftd = isFtdDragonbornSelection(dto, selection);

        actions.push({
            id: selection.choiceId || "race-breath-weapon",
            name: ancestry ? `${ancestry} Breath Weapon` : "Breath Weapon",
            source,
            type: "racial",
            ability: "con",
            saveAbility,
            saveDc,
            area,
            damage: [damageDice, damageType].filter(Boolean).join(" "),
            damageType,
            uses: ftd ? `${proficiencyBonus} per long rest` : "1 per short or long rest",
            summary: `${area ? `${area}; ` : ""}${formatAbilityLabel(saveAbility)} save DC ${saveDc}; ${[damageDice, damageType].filter(Boolean).join(" ")} damage.`
        });

        if (ftd && characterLevel >= 5 && getDragonbornFamily(dto, selection) === "chromatic" && damageType) {
            actions.push({
                id: "race-chromatic-warding",
                name: "Chromatic Warding",
                source,
                type: "racial",
                uses: "1 per long rest",
                summary: `As an action, gain immunity to ${damageType} damage for 1 minute.`
            });
        }
    }

    return actions;
}

function compileRacialSpells(dto, abilityScores, proficiencyBonus) {
    const ability = normalizeAbilityKey(getRaceSelectionValue(dto, "spellAbility") || getRaceSelectionValue(dto, "race-spellcasting-ability"));
    const cantrips = [];
    const known = [];
    const innate = [];

    function createSpellEntry(selection, option) {
        return {
            name: option.name || option.label || option.value || selection.value || "Spell",
            ref: option.ref || option.value || "",
            source: option.source || selection.sourceName || "",
            level: toNumber(option.level, selection.type === "cantrip" ? 0 : 1),
            mode: "racial"
        };
    }

    for (const selection of getRaceSelectionList(dto)) {
        if (selection.type === "cantrip") {
            getSelectionOptions(selection).forEach((option) => cantrips.push(createSpellEntry(selection, option)));
            continue;
        }

        if (/spell/iu.test(String(selection.type || "")) && selection.type !== "spell-ability") {
            getSelectionOptions(selection).forEach((option) => {
                const entry = createSpellEntry(selection, option);
                if (entry.level === 0) {
                    cantrips.push(entry);
                } else {
                    known.push(entry);
                }
            });
        }
    }

    const abilityModifier = ability ? abilityScores[ability]?.modifier || 0 : 0;
    return {
        ability,
        spellAttackBonus: ability ? abilityModifier + proficiencyBonus : null,
        spellSaveDc: ability ? 8 + abilityModifier + proficiencyBonus : null,
        cantrips,
        known,
        innate
    };
}

function compileSenses(dto) {
    const profileSenses = getRaceProfile(dto)?.senses || {};
    let darkvision = Math.max(toNumber(profileSenses.darkvision, 0), 0);
    const blindsight = Math.max(toNumber(profileSenses.blindsight, 0), 0);
    const notes = [];

    for (const selection of getRaceSelectionList(dto)) {
        for (const option of getSelectionOptions(selection)) {
            const optionDarkvision = toNumber(option?.grants?.senses?.darkvision, 0);
            if (optionDarkvision > darkvision) {
                darkvision = optionDarkvision;
            }
            if (selection.type === "variable-trait" && normalizeSearchText(option.value) === "darkvision") {
                darkvision = Math.max(darkvision, 60);
            }
        }
    }

    return {
        darkvision,
        blindsight,
        notes
    };
}

function compileRaceAcModifiers(dto) {
    const modifiers = [];

    for (const selection of getRaceSelectionList(dto)) {
        const text = normalizeSearchText([selection.label, getSelectionLabel(selection)].join(" "));
        if (/carapace/iu.test(text)) {
            modifiers.push({
                source: selection.sourceName || "race",
                label: "Carapace",
                value: 1
            });
        }
    }

    return modifiers;
}

function getItemRecord(item = {}) {
    return item.snapshot && typeof item.snapshot === "object"
        ? item.snapshot
        : item;
}

function getArmorTypeValues(record = {}) {
    const type = record.type;
    return [
        record.typeCode,
        typeof type === "string" ? type : "",
        type?.code,
        type?.abbreviation,
        type?.name,
        record.raw?.type,
        record.category,
        record._typeHtml,
        record._subTypeHtml,
        ...toArray(record._typeListText)
    ].filter(Boolean);
}

function getArmorTypeText(record = {}) {
    return normalizeSearchText(getArmorTypeValues(record).join(" "));
}

function getArmorTypeCode(record = {}) {
    return String([
        record.typeCode,
        typeof record.type === "string" ? record.type : "",
        record.type?.code,
        record.type?.abbreviation,
        record.raw?.type
    ].find(Boolean) || "").trim().toUpperCase();
}

function getArmorCategory(record = {}) {
    const code = getArmorTypeCode(record);
    if (code === "LA") {
        return "light";
    }
    if (code === "MA") {
        return "medium";
    }
    if (code === "HA") {
        return "heavy";
    }

    const text = getArmorTypeText(record);
    if (/\blight armor\b/u.test(text)) {
        return "light";
    }
    if (/\bmedium armor\b/u.test(text)) {
        return "medium";
    }
    if (/\bheavy armor\b/u.test(text)) {
        return "heavy";
    }

    return "";
}

function getArmorAcValue(record = {}) {
    const value = record.armor?.ac
        ?? record.ac
        ?? record._fAc
        ?? record.raw?.ac;
    const ac = toNumber(value, Number.NaN);
    return Number.isFinite(ac) ? ac : null;
}

function parseOptionalNumber(value) {
    if (value == null || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const match = String(value).match(/[+-]?\d+/u);
    return match ? toNumber(match[0], 0) : null;
}

function getBonusAc(record = {}) {
    const candidates = [
        record.bonuses?.bonusAc,
        record.armor?.bonuses?.bonusAc,
        record.bonusAc,
        record.raw?.bonusAc
    ];

    for (const candidate of candidates) {
        const bonus = parseOptionalNumber(candidate);
        if (bonus != null) {
            return bonus;
        }
    }

    return 0;
}

function isShieldItem(record = {}) {
    const code = getArmorTypeCode(record);
    return code === "S" || /\bshield\b/u.test(getArmorTypeText(record));
}

function isArmorItem(record = {}) {
    if (isShieldItem(record)) {
        return false;
    }

    return record.isArmor === true
        || record.armor === true
        || record.armor?.armor === true
        || record.raw?.armor === true
        || Boolean(getArmorCategory(record))
        || /\barmor\b/u.test(getArmorTypeText(record));
}

function getArmorDexModifier(category, dexModifier) {
    if (category === "heavy") {
        return 0;
    }

    if (category === "medium") {
        return Math.min(dexModifier, 2);
    }

    return dexModifier;
}

function isMonkClassEntry(classEntry = {}) {
    const entry = classEntry || {};
    const text = normalizeSearchText([
        entry.id,
        entry.name,
        entry.ref,
        entry.options?.catalogId,
        entry.options?.ref,
        entry.options?.sourceId,
        entry.options?.displayName
    ].filter(Boolean).join(" "));

    return /\bmonk\b|class[:/-]monk|class-monk/u.test(text);
}

function getMonkLevel(dto, characterLevel = MAX_CHARACTER_LEVEL) {
    return getCompiledLevelEntries(dto, characterLevel)
        .filter((level) => isMonkClassEntry(level.class))
        .length;
}

function getMonkUnarmoredMovementBonus(monkLevel) {
    if (monkLevel >= 18) {
        return 30;
    }
    if (monkLevel >= 14) {
        return 25;
    }
    if (monkLevel >= 10) {
        return 20;
    }
    if (monkLevel >= 6) {
        return 15;
    }
    return monkLevel >= 2 ? 10 : 0;
}

function getEquippedArmorState(dto) {
    const equippedItems = toArray(dto.inventory.items).filter((entry) => entry?.equipped);
    return equippedItems.reduce((state, item) => {
        const record = getItemRecord(item);
        if (isShieldItem(record)) {
            state.hasShield = true;
        } else if (isArmorItem(record)) {
            state.hasArmor = true;
        }

        return state;
    }, {
        hasArmor: false,
        hasShield: false
    });
}

function compileEquipmentAc(dto, abilityScores, characterLevel = MAX_CHARACTER_LEVEL) {
    const dexModifier = abilityScores.dex.modifier;
    const wisModifier = abilityScores.wis.modifier;
    const monkLevel = getMonkLevel(dto, characterLevel);
    const armorState = getEquippedArmorState(dto);
    const monkUnarmored = monkLevel >= 1 && !armorState.hasArmor && !armorState.hasShield
        ? 10 + dexModifier + wisModifier
        : null;
    const unarmored = Math.max(10 + dexModifier, monkUnarmored ?? Number.NEGATIVE_INFINITY);
    const armorCandidates = [];
    const shieldCandidates = [];

    for (const item of toArray(dto.inventory.items).filter((entry) => entry?.equipped)) {
        const record = getItemRecord(item);
        const ac = getArmorAcValue(record);
        if (ac == null) {
            continue;
        }

        const bonusAc = getBonusAc(record);
        if (isShieldItem(record)) {
            shieldCandidates.push({
                name: item.name || record.name || "Shield",
                bonus: ac + bonusAc
            });
            continue;
        }

        if (!isArmorItem(record)) {
            continue;
        }

        const category = getArmorCategory(record);
        const dexBonus = getArmorDexModifier(category, dexModifier);
        armorCandidates.push({
            name: item.name || record.name || "Armor",
            category: category || "armor",
            ac,
            dexBonus,
            bonusAc,
            value: ac + dexBonus + bonusAc
        });
    }

    const armor = armorCandidates.sort((left, right) => right.value - left.value)[0] || null;
    const shield = shieldCandidates.sort((left, right) => right.bonus - left.bonus)[0] || null;

    return {
        unarmored,
        unarmoredSource: monkUnarmored === unarmored ? "Monk Unarmored Defense" : "Unarmored",
        monkUnarmored,
        armor,
        shield,
        value: (armor?.value ?? unarmored) + (shield?.bonus ?? 0)
    };
}

function compileAc(dto, abilityScores, characterLevel = MAX_CHARACTER_LEVEL) {
    const equipment = compileEquipmentAc(dto, abilityScores, characterLevel);
    const manualBase = toNumber(dto.combatState.ac, equipment.unarmored);
    const base = Math.max(manualBase, equipment.value);
    const modifiers = compileRaceAcModifiers(dto);
    const modifierTotal = modifiers.reduce((total, modifier) => total + toNumber(modifier.value, 0), 0);
    return {
        base,
        equipment,
        modifiers,
        value: base + modifierTotal
    };
}

function compileSpeed(dto, characterLevel = MAX_CHARACTER_LEVEL) {
    const base = toNumber(dto.baseChoices.race?.speed, 30);
    const armorState = getEquippedArmorState(dto);
    const monkMovementBonus = !armorState.hasArmor && !armorState.hasShield
        ? getMonkUnarmoredMovementBonus(getMonkLevel(dto, characterLevel))
        : 0;
    const walk = base + monkMovementBonus;
    const modes = {
        walk
    };
    const modifiers = [];

    if (monkMovementBonus) {
        modifiers.push({
            source: "class-monk",
            label: "Unarmored Movement",
            value: monkMovementBonus
        });
    }

    // Movement modes granted by the race (fly/swim/climb/burrow). A "walk"
    // sentinel means the mode equals the walking speed.
    for (const [mode, value] of Object.entries(getRaceProfile(dto)?.speeds || {})) {
        if (mode === "walk") {
            continue;
        }
        const resolved = value === "walk" ? walk : toNumber(value, 0);
        if (resolved > 0) {
            modes[mode] = resolved;
        }
    }

    for (const selection of getRaceSelectionList(dto)) {
        const text = normalizeSearchText(getSelectionLabel(selection));
        if (/nimble climber/iu.test(text)) {
            modes.climb = walk;
        }
        if (/underwater adaptation/iu.test(text)) {
            modes.swim = walk;
        }
        if (/swiftstride/iu.test(text)) {
            modifiers.push({
                source: selection.sourceName || "race",
                label: "Swiftstride Shifting",
                value: "+10 ft. while shifted"
            });
        }
    }

    return {
        base,
        modifiers,
        value: walk,
        modes
    };
}

function compileIdentity(dto) {
    const selectedSize = getRaceSelectionValue(dto, "size");
    const profile = getRaceProfile(dto);
    const creatureType = profile?.creatureType || {};
    return {
        ...deepClone(dto.identity),
        race: {
            ...deepClone(dto.baseChoices.race || {}),
            subrace: dto.baseChoices.subrace?.name || dto.baseChoices.race?.subrace || "",
            size: selectedSize || dto.baseChoices.race?.size || profile?.size?.fixed || "",
            creatureType: toArray(creatureType.types),
            creatureTypeTags: toArray(creatureType.tags)
        },
        background: deepClone(dto.baseChoices.background || {})
    };
}

function createDisplayIndex() {
    const facts = {
        identity: "header",
        level: "header",
        classSummary: "header",
        experience: "header",
        proficiencyBonus: "header",
        abilities: "stat-strip",
        savingThrows: "stat-strip",
        armorClass: "stat-strip",
        hitPoints: "stat-strip",
        initiative: "stat-strip",
        speed: "stat-strip",
        deathSaves: "header",
        conditions: "header",
        exhaustion: "header",
        damageResistances: "header",
        damageImmunities: "header",
        damageVulnerabilities: "header",
        conditionImmunities: "header",
        attacks: "offense",
        offensiveSpells: "offense",
        inventory: "gear",
        equippedItems: "gear",
        defensiveGear: "defense",
        attunement: "gear",
        currency: "gear",
        spellSlots: "spells",
        spellSaveDc: "spells",
        spellAttackBonus: "spells",
        knownSpells: "spells",
        preparedSpells: "spells",
        alwaysPreparedSpells: "spells",
        skills: "sidebar",
        passiveScores: "sidebar",
        tools: "skills",
        languages: "skills",
        classFeatures: "features",
        subclassFeatures: "features",
        raceFeatures: "features",
        backgroundFeatures: "features",
        featFeatures: "features",
        itemFeatures: "features",
        classResources: "reference"
    };

    const sections = {};
    for (const [fact, owner] of Object.entries(facts)) {
        if (!sections[owner]) {
            sections[owner] = [];
        }
        sections[owner].push(fact);
    }

    return {
        schemaVersion: 1,
        facts,
        sections
    };
}

export class SheetCompiler {
    static compile(dtoInput, _options = {}) {
        const sourceDto = _options.references
            ? PlayerSheetDtoHelper.normalize(applyResolvedReferencesToDto(dtoInput, _options.references))
            : PlayerSheetDtoHelper.normalize(dtoInput);
        const level = compileCurrentLevel(sourceDto, _options);
        const dto = createActiveLevelDto(sourceDto, level);
        const proficiencyBonus = compileProficiencyBonus(level);
        const abilities = compileAbilityScores(dto);
        const classes = compileClasses(dto, abilities, proficiencyBonus, level);
        const maxHp = dto.levels.reduce((total, levelEntry) => total + toNumber(levelEntry.hp, 0), 0);
        const dexModifier = abilities.dex.modifier;
        const racialSpells = compileRacialSpells(dto, abilities, proficiencyBonus);
        const featSpells = compileFeatSpells(dto, abilities, proficiencyBonus);
        const classChoiceSpells = compileClassChoiceSpells(dto, abilities, proficiencyBonus, level);
        const experience = toNumber(sourceDto.identity?.experience, 0);
        const nextLevelExperience = getNextLevelExperience(level);

        return {
            schemaVersion: "player-sheet-v2-compiled",
            id: dto.id,
            lastModified: dto.lastModified,
            sourcePolicy: deepClone(dto.metadata.sourcePolicy),
            identity: compileIdentity(dto),
            level,
            progression: {
                currentLevel: level,
                plannedLevel: countPlannedLevels(sourceDto),
                experience,
                nextLevel: level >= MAX_CHARACTER_LEVEL ? null : level + 1,
                nextLevelExperience,
                experienceToNextLevel: getExperienceToNextLevel(experience)
            },
            proficiencyBonus,
            initiative: dexModifier,
            hp: {
                base: maxHp,
                modifiers: [],
                max: maxHp,
                current: toNumber(dto.combatState.currentHp, maxHp),
                temp: toNumber(dto.combatState.tempHp, 0)
            },
            ac: {
                ...compileAc(dto, abilities, level)
            },
            speed: compileSpeed(dto, level),
            hitDice: compileHitDice(classes),
            deathSaves: deepClone(dto.combatState.deathSaves),
            abilities,
            skills: compileSkills(dto),
            proficiencies: compileProficiencies(dto),
            classes,
            classResources: compileClassResources(dto, level),
            spellSlots: compileSpellSlots(dto, classes),
            racialSpells,
            featSpells,
            classChoiceSpells,
            defenses: compileDefenses(dto),
            senses: compileSenses(dto),
            resources: deepClone(dto.resources),
            inventory: compileInventory(dto),
            attacks: compileAttacks(dto, abilities, proficiencyBonus),
            racialActions: compileRaceActions(dto, abilities, proficiencyBonus, level),
            features: [
                ...compileFeatures(dto, level),
                ...compileRaceFeatures(dto, level)
            ],
            featureChoices: [
                ...compileRaceFeatureChoices(dto),
                ...compileBackgroundFeatureChoices(dto)
            ],
            builderOverrides: [],
            notes: {
                ...deepClone(dto.notes),
                conditions: toArray(dto.combatState.conditions),
                exhaustion: toNumber(dto.combatState.exhaustion, 0)
            },
            metadata: deepClone(dto.metadata),
            displayIndex: createDisplayIndex(),
            optionCoverage: createStructuredOptionCoverage(dto),
            referenceResolution: {
                ok: _options.references?.ok ?? true,
                failures: toArray(_options.references?.failures),
                resolvedAt: _options.references?.resolvedAt || ""
            }
        };
    }

    static getCurrentLevel(dtoInput, options = {}) {
        return compileCurrentLevel(PlayerSheetDtoHelper.normalize(dtoInput), options);
    }

    static getProficiencyBonus(characterLevel) {
        return compileProficiencyBonus(characterLevel);
    }
}
