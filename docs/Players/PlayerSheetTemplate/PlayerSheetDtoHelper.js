export const PLAYER_SHEET_SCHEMA_VERSION = "player-sheet-v2";
export const MAX_CHARACTER_LEVEL = 20;
export const ASI_CHARACTER_LEVELS = new Set([4, 8, 12, 16, 19]);
export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

const DEFAULT_ABILITY_SCORE = 10;

function isPlainObject(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
    if (value == null) {
        return value;
    }

    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
}

function nowIso() {
    return new Date().toISOString();
}

function toArray(value) {
    return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value) {
    return String(value || "").trim();
}

function stripForbiddenRuntimeFields(value) {
    if (Array.isArray(value)) {
        return value.map(stripForbiddenRuntimeFields);
    }

    if (!isPlainObject(value)) {
        return value;
    }

    const forbidden = new Set([
        "catalogRecord",
        "classFeatures",
        "entries",
        "grants",
        "profile",
        "raw",
        "rulesEntries",
        "snapshot",
        "startingEquipment",
        "startingProficiencies",
        "subclassFeatures",
        "_fullEntries"
    ]);
    const output = {};

    for (const [key, entry] of Object.entries(value)) {
        if (forbidden.has(key)) {
            continue;
        }

        output[key] = stripForbiddenRuntimeFields(entry);
    }

    return output;
}

function normalizeSaveIdentityRef(value, kind = "") {
    const identity = normalizeIdentityRef(value, kind);
    if (!identity) {
        return null;
    }

    const output = {
        id: identity.id,
        name: identity.name,
        source: identity.source,
        kind: identity.kind || kind
    };

    for (const key of ["classLevel", "hitDie", "size", "speed", "subrace"]) {
        if (identity[key] != null && identity[key] !== "") {
            output[key] = identity[key];
        }
    }

    if (identity.options && Object.keys(identity.options).length) {
        output.options = stripForbiddenRuntimeFields(identity.options);
    }

    for (const key of ["choices", "choiceSummary", "spellcastingAbility"]) {
        if (identity[key] != null && identity[key] !== "") {
            output[key] = stripForbiddenRuntimeFields(identity[key]);
        }
    }

    return output;
}

function normalizeSaveBaseChoices(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        race: normalizeSaveIdentityRef(source.race, "races"),
        subrace: normalizeSaveIdentityRef(source.subrace, "subraces"),
        raceChoices: isPlainObject(source.raceChoices) ? stripForbiddenRuntimeFields(source.raceChoices) : {},
        background: normalizeSaveIdentityRef(source.background, "backgrounds"),
        backgroundChoices: isPlainObject(source.backgroundChoices) ? stripForbiddenRuntimeFields(source.backgroundChoices) : {},
        abilityScores: normalizeAbilityScores(source.abilityScores),
        startingProficiencies: normalizeStartingProficiencies(source.startingProficiencies),
        proficiencyChoices: normalizeProficiencyChoices(source.proficiencyChoices)
    };
}

function normalizeSaveLevel(value = {}, index = 0) {
    const source = isPlainObject(value) ? value : {};
    const characterLevel = index + 1;
    const level = {
        characterLevel,
        class: normalizeSaveIdentityRef(source.class, "classes"),
        subclass: normalizeSaveIdentityRef(source.subclass, "subclasses"),
        hp: toNumber(source.hp, 0),
        choices: toArray(source.choices).map(stripForbiddenRuntimeFields)
    };

    if (source.feat != null) {
        level.feat = normalizeSaveIdentityRef(source.feat, "feats");
    }

    if (ASI_CHARACTER_LEVELS.has(characterLevel) || Array.isArray(source.AbilityScoreIncrease)) {
        level.AbilityScoreIncrease = normalizeStringList(source.AbilityScoreIncrease)
            .map((ability) => ability.toLowerCase())
            .filter((ability) => ABILITY_KEYS.includes(ability));
    }

    return level;
}

function normalizeSaveLevels(levels = []) {
    const sourceLevels = toArray(levels);
    const normalized = [];

    for (let index = 0; index < MAX_CHARACTER_LEVEL; index += 1) {
        normalized.push(normalizeSaveLevel(sourceLevels[index], index));
    }

    return normalized;
}

function normalizeDefenseList(value) {
    return normalizeStringList(value).map((entry) => entry.toLowerCase());
}

function normalizeCombatDefenses(source = {}) {
    const direct = source.defenses && typeof source.defenses === "object" ? source.defenses : {};

    return {
        damageResistances: normalizeDefenseList(source.damageResistances || direct.damageResistances),
        damageImmunities: normalizeDefenseList(source.damageImmunities || direct.damageImmunities),
        damageVulnerabilities: normalizeDefenseList(source.damageVulnerabilities || direct.damageVulnerabilities),
        conditionImmunities: normalizeDefenseList(source.conditionImmunities || direct.conditionImmunities)
    };
}

function normalizeStartingProficiencyGrantGroup(value = {}) {
    const source = isPlainObject(value) ? value : {};
    return {
        fixed: normalizeStringList(source.fixed),
        choices: toArray(source.choices).map((choice) => deepClone(choice))
    };
}

function normalizeClassStartingProficiencies(value = {}) {
    const source = isPlainObject(value) ? value : {};
    const result = {};

    for (const key of ["armor", "weapons", "tools", "skills", "languages"]) {
        const group = normalizeStartingProficiencyGrantGroup(source[key]);
        if (group.fixed.length || group.choices.length) {
            result[key] = group;
        }
    }

    return result;
}

function normalizeIdentityRef(value, kind = "") {
    if (value == null || value === "") {
        return null;
    }

    if (!isPlainObject(value)) {
        return null;
    }

    const options = isPlainObject(value.options) ? deepClone(value.options) : {};
    const identity = {
        id: normalizeString(
            options.catalogId
            || value.catalogId
            || value.id
            || value.refId
            || value.sourceId
            || value.ref
        ).replace(/\.json$/iu, ""),
        name: normalizeString(value.name),
        source: normalizeString(value.source),
        kind: normalizeString(value.kind || kind)
    };

    if (!identity.id && !identity.name && !identity.source) {
        return null;
    }

    if (value.classLevel != null) {
        identity.classLevel = toNumber(value.classLevel, 0);
    }

    if (value.hitDie != null) {
        identity.hitDie = toNumber(value.hitDie, 0);
    }

    for (const key of ["ref", "refId", "sourceId", "catalogId"]) {
        if (options[key] == null && value[key] != null && value[key] !== "") {
            options[key] = key === "ref" ? normalizeString(value[key]).replace(/\.json$/iu, "") : value[key];
        }
    }

    if (options.catalogId == null && String(identity.id || "").includes(":")) {
        options.catalogId = identity.id;
    }

    if (Object.keys(options).length) {
        identity.options = options;
    }

    if (value.choices != null) {
        identity.choices = deepClone(value.choices);
    }

    if (value.choiceSummary != null && value.choiceSummary !== "") {
        identity.choiceSummary = normalizeString(value.choiceSummary);
    }

    if (value.spellcastingAbility != null && value.spellcastingAbility !== "") {
        identity.spellcastingAbility = normalizeString(value.spellcastingAbility);
    }

    if (value.savingThrows != null) {
        identity.savingThrows = normalizeStringList(value.savingThrows)
            .map((entry) => entry.toLowerCase())
            .filter((entry) => ABILITY_KEYS.includes(entry));
    }

    if (value.startingProficiencies != null) {
        const startingProficiencies = normalizeClassStartingProficiencies(value.startingProficiencies);
        if (Object.keys(startingProficiencies).length) {
            identity.startingProficiencies = startingProficiencies;
        }
    }

    if (value.grantedFeats != null) {
        const grantedFeats = toArray(value.grantedFeats).map((entry) => deepClone(entry));
        if (grantedFeats.length) {
            identity.grantedFeats = grantedFeats;
        }
    }

    if (identity.kind === "backgrounds" && value.grants != null) {
        identity.grants = deepClone(value.grants);
    }

    if (isPlainObject(value.profile)) {
        identity.profile = deepClone(value.profile);
    }

    for (const key of ["size", "speed", "feature", "subrace"]) {
        if (value[key] != null && value[key] !== "") {
            identity[key] = value[key];
        }
    }

    return identity;
}

function normalizeIdentity(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        name: normalizeString(source.name),
        playerName: normalizeString(source.playerName),
        alignment: normalizeString(source.alignment),
        experience: toNumber(source.experience, 0),
        portraitUrl: normalizeString(source.portraitUrl),
        inspiration: Boolean(source.inspiration)
    };
}

function normalizeAbilityScores(value = {}) {
    const source = isPlainObject(value) ? value : {};
    const scores = {};

    for (const ability of ABILITY_KEYS) {
        scores[ability] = toNumber(source[ability], DEFAULT_ABILITY_SCORE);
    }

    return scores;
}

function normalizeStringList(value) {
    return toArray(value)
        .map((entry) => normalizeString(entry))
        .filter(Boolean);
}

function normalizeStartingProficiencies(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        skills: normalizeStringList(source.skills),
        tools: normalizeStringList(source.tools),
        languages: normalizeStringList(source.languages),
        armor: normalizeStringList(source.armor),
        weapons: normalizeStringList(source.weapons),
        savingThrows: normalizeStringList(source.savingThrows)
            .map((entry) => entry.toLowerCase())
            .filter((entry) => ABILITY_KEYS.includes(entry))
    };
}

function normalizeProficiencyChoices(value = {}) {
    return isPlainObject(value) ? deepClone(value) : {};
}

function normalizeBaseChoices(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        race: normalizeIdentityRef(source.race, "races"),
        subrace: normalizeIdentityRef(source.subrace, "subraces"),
        raceChoices: isPlainObject(source.raceChoices) ? deepClone(source.raceChoices) : {},
        background: normalizeIdentityRef(source.background, "backgrounds"),
        backgroundChoices: isPlainObject(source.backgroundChoices) ? deepClone(source.backgroundChoices) : {},
        abilityScores: normalizeAbilityScores(source.abilityScores),
        startingProficiencies: normalizeStartingProficiencies(source.startingProficiencies),
        proficiencyChoices: normalizeProficiencyChoices(source.proficiencyChoices)
    };
}

function normalizeLevel(value = {}, index = 0) {
    const source = isPlainObject(value) ? value : {};
    const characterLevel = index + 1;
    const level = {
        characterLevel,
        class: normalizeIdentityRef(source.class, "classes"),
        subclass: normalizeIdentityRef(source.subclass, "subclasses"),
        feat: normalizeIdentityRef(source.feat, "feats"),
        hp: toNumber(source.hp, 0),
        choices: toArray(source.choices).map(deepClone)
    };

    if (Array.isArray(source.features)) {
        level.features = source.features.map(deepClone);
    }

    if (ASI_CHARACTER_LEVELS.has(characterLevel) || Array.isArray(source.AbilityScoreIncrease)) {
        level.AbilityScoreIncrease = normalizeStringList(source.AbilityScoreIncrease)
            .map((ability) => ability.toLowerCase())
            .filter((ability) => ABILITY_KEYS.includes(ability));
    }

    return level;
}

export function guarantee20Levels(levels = []) {
    const sourceLevels = toArray(levels);
    const normalized = [];

    for (let index = 0; index < MAX_CHARACTER_LEVEL; index += 1) {
        normalized.push(normalizeLevel(sourceLevels[index], index));
    }

    return normalized;
}

function normalizeCombatState(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        ac: toNumber(source.ac, 10),
        maxHp: toNumber(source.maxHp, 0),
        currentHp: toNumber(source.currentHp, 0),
        tempHp: toNumber(source.tempHp, 0),
        deathSaves: {
            successes: toNumber(source.deathSaves?.successes, 0),
            failures: toNumber(source.deathSaves?.failures, 0)
        },
        conditions: normalizeStringList(source.conditions),
        exhaustion: toNumber(source.exhaustion, 0),
        defenses: normalizeCombatDefenses(source)
    };
}

function normalizeInventory(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        currency: {
            cp: toNumber(source.currency?.cp, 0),
            sp: toNumber(source.currency?.sp, 0),
            ep: toNumber(source.currency?.ep, 0),
            gp: toNumber(source.currency?.gp, 0),
            pp: toNumber(source.currency?.pp, 0)
        },
        items: toArray(source.items).map((item) => ({
            name: normalizeString(item?.name),
            source: normalizeString(item?.source),
            quantity: toNumber(item?.quantity, 1),
            equipped: Boolean(item?.equipped),
            attuned: Boolean(item?.attuned),
            catalog: normalizeIdentityRef(item?.catalog, "items"),
            containedSpell: normalizeIdentityRef(item?.containedSpell || item?.spell, "spells"),
            snapshot: isPlainObject(item?.snapshot) ? deepClone(item.snapshot) : null
        }))
    };
}

function normalizeSpells(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        spellcastingAbility: normalizeString(source.spellcastingAbility).toLowerCase(),
        cantrips: normalizeStringList(source.cantrips),
        known: normalizeStringList(source.known),
        prepared: normalizeStringList(source.prepared),
        alwaysPrepared: normalizeStringList(source.alwaysPrepared),
        spellSlots: isPlainObject(source.spellSlots) ? deepClone(source.spellSlots) : { byLevel: {} }
    };
}

function normalizeNotes(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        freeform: normalizeString(source.freeform),
        richText: normalizeString(source.richText || source.html),
        conditions: normalizeStringList(source.conditions),
        exhaustion: toNumber(source.exhaustion, 0)
    };
}

function normalizeMetadata(value = {}) {
    const source = isPlainObject(value) ? value : {};

    return {
        sourcePolicy: {
            ruleset: normalizeString(source.sourcePolicy?.ruleset || "2014"),
            allowedSources: normalizeStringList(source.sourcePolicy?.allowedSources)
        },
        tags: normalizeStringList(source.tags)
    };
}

function assertV2OrEmpty(input) {
    if (input?.schemaVersion && input.schemaVersion !== PLAYER_SHEET_SCHEMA_VERSION) {
        throw new TypeError(`Unsupported player sheet schemaVersion "${input.schemaVersion}". Expected "${PLAYER_SHEET_SCHEMA_VERSION}".`);
    }
}

export function createEmptyPlayerSheetDto(options = {}) {
    return normalizePlayerSheetDto({
        schemaVersion: PLAYER_SHEET_SCHEMA_VERSION,
        id: options.id || "",
        lastModified: options.lastModified || nowIso(),
        identity: options.identity || {},
        baseChoices: options.baseChoices || {},
        levels: options.levels || [],
        combatState: options.combatState || {},
        inventory: options.inventory || {},
        spells: options.spells || {},
        resources: options.resources || [],
        notes: options.notes || {},
        metadata: options.metadata || {}
    });
}

export function normalizePlayerSheetDto(input = {}, options = {}) {
    const source = isPlainObject(input) ? input : {};
    assertV2OrEmpty(source);

    return {
        schemaVersion: PLAYER_SHEET_SCHEMA_VERSION,
        id: normalizeString(source.id || options.id),
        lastModified: normalizeString(source.lastModified || options.lastModified || nowIso()),
        identity: normalizeIdentity(source.identity),
        baseChoices: normalizeBaseChoices(source.baseChoices),
        levels: guarantee20Levels(source.levels),
        combatState: normalizeCombatState(source.combatState),
        inventory: normalizeInventory(source.inventory),
        spells: normalizeSpells(source.spells),
        resources: toArray(source.resources).map(deepClone),
        notes: normalizeNotes(source.notes),
        metadata: normalizeMetadata(source.metadata)
    };
}

export function toSavePlayerSheetDto(input = {}, options = {}) {
    if (input?.schemaVersion === "player-sheet-v2-compiled") {
        throw new TypeError("Compiled player sheets are runtime-only and cannot be saved. Save the player-sheet-v2 DTO instead.");
    }

    const source = normalizePlayerSheetDto(input, options);
    return {
        schemaVersion: PLAYER_SHEET_SCHEMA_VERSION,
        id: normalizeString(source.id || options.id),
        lastModified: normalizeString(source.lastModified || options.lastModified || nowIso()),
        identity: normalizeIdentity(source.identity),
        baseChoices: normalizeSaveBaseChoices(source.baseChoices),
        levels: normalizeSaveLevels(source.levels),
        combatState: normalizeCombatState(source.combatState),
        inventory: {
            currency: deepClone(source.inventory.currency),
            items: toArray(source.inventory.items).map((item) => ({
                name: normalizeString(item?.name),
                source: normalizeString(item?.source),
                quantity: toNumber(item?.quantity, 1),
                equipped: Boolean(item?.equipped),
                attuned: Boolean(item?.attuned),
                catalog: normalizeSaveIdentityRef(item?.catalog, "items"),
                containedSpell: normalizeSaveIdentityRef(item?.containedSpell, "spells")
            }))
        },
        spells: stripForbiddenRuntimeFields(normalizeSpells(source.spells)),
        resources: toArray(source.resources).map(stripForbiddenRuntimeFields),
        notes: normalizeNotes(source.notes),
        metadata: normalizeMetadata(source.metadata)
    };
}

function parsePath(path) {
    return normalizeString(path)
        .replace(/\[(\d+)\]/gu, ".$1")
        .split(".")
        .map((part) => part.trim())
        .filter(Boolean);
}

export function getNestedValue(obj, path, fallback = undefined) {
    let current = obj;

    for (const part of parsePath(path)) {
        if (current == null) {
            return fallback;
        }

        current = current[part];
    }

    return current === undefined ? fallback : current;
}

export function setNestedValue(obj, path, value) {
    const parts = parsePath(path);
    if (!parts.length) {
        return obj;
    }

    let current = obj;

    for (let index = 0; index < parts.length - 1; index += 1) {
        const part = parts[index];
        const nextPart = parts[index + 1];

        if (current[part] == null || typeof current[part] !== "object") {
            current[part] = /^\d+$/u.test(nextPart) ? [] : {};
        }

        current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    return obj;
}

export function touchPlayerSheetDto(dto, timestamp = nowIso()) {
    const next = normalizePlayerSheetDto(dto);
    next.lastModified = timestamp;
    return next;
}

export function patchPlayerSheetDto(dto, path, value, options = {}) {
    const next = normalizePlayerSheetDto(deepClone(dto || {}), options);
    setNestedValue(next, path, value);

    const normalized = normalizePlayerSheetDto(next, options);
    return options.touch === true
        ? touchPlayerSheetDto(normalized, options.lastModified || nowIso())
        : normalized;
}

export class PlayerSheetDtoHelper {
    static createEmpty(options = {}) {
        return createEmptyPlayerSheetDto(options);
    }

    static createEmptyDto(options = {}) {
        return createEmptyPlayerSheetDto(options);
    }

    static normalize(dto, options = {}) {
        return normalizePlayerSheetDto(dto, options);
    }

    static guarantee20Levels(levels = []) {
        return guarantee20Levels(levels);
    }

    static patch(dto, path, value, options = {}) {
        return patchPlayerSheetDto(dto, path, value, options);
    }

    static toSaveDto(dto, options = {}) {
        return toSavePlayerSheetDto(dto, options);
    }

    static touch(dto, timestamp = nowIso()) {
        return touchPlayerSheetDto(dto, timestamp);
    }

    static getValue(obj, path, fallback = undefined) {
        return getNestedValue(obj, path, fallback);
    }

    static setValue(obj, path, value) {
        return setNestedValue(obj, path, value);
    }
}
