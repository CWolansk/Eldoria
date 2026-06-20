import { PlayerSheetDtoHelper } from "./PlayerSheetDtoHelper.js";

const KNOWN_CHOICE_TYPES = new Set([
    "ability",
    "asi",
    "background",
    "class-option",
    "deity",
    "draconic-ancestry",
    "expertise",
    "feat",
    "instrument",
    "language",
    "languages",
    "lifeofseclusion",
    "origin",
    "racial-asi",
    "resistance",
    "scam",
    "size",
    "skill",
    "skills",
    "spell",
    "spellcasting-ability",
    "spells",
    "subclass",
    "tool",
    "tools",
    "weapon",
    "weapons"
]);

function toArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
    return String(value || "").trim();
}

function choiceType(choice) {
    return normalizeText(choice?.type || choice?.kind || choice?.category || "").toLowerCase();
}

function choiceLabel(choice, fallback = "Structured option") {
    return normalizeText(choice?.label || choice?.name || choice?.feature || choice?.id || choice?.choiceId || fallback);
}

function addChoice(items, scope, source, choice, path) {
    if (!choice || typeof choice !== "object") {
        return;
    }

    const type = choiceType(choice);
    const count = Math.max(Number(choice.count ?? choice.choose?.count ?? 1) || 1, 1);
    items.push({
        scope,
        source: normalizeText(source),
        type: type || "unknown",
        label: choiceLabel(choice),
        count,
        path,
        mapped: Boolean(type && KNOWN_CHOICE_TYPES.has(type))
    });
}

function addGrantGroupChoices(items, scope, source, group, path, typeFallback) {
    toArray(group?.choices).forEach((choice, index) => {
        addChoice(items, scope, source, {
            ...choice,
            type: choice.type || typeFallback
        }, `${path}.choices.${index}`);
    });
}

function addProfileChoices(items, scope, source, profile, path) {
    if (!profile || typeof profile !== "object") {
        return;
    }

    toArray(profile.choices?.all).forEach((choice, index) => {
        addChoice(items, scope, source, choice, `${path}.profile.choices.all.${index}`);
    });

    if (profile.abilities?.choice) {
        addChoice(items, scope, source, {
            ...profile.abilities.choice,
            type: profile.abilities.choice.type || "racial-asi"
        }, `${path}.profile.abilities.choice`);
    }

    toArray(profile.abilities?.choices).forEach((choice, index) => {
        addChoice(items, scope, source, choice, `${path}.profile.abilities.choices.${index}`);
    });

    for (const key of ["skills", "tools", "weapons", "armor", "languages"]) {
        addGrantGroupChoices(items, scope, source, profile.proficiencies?.[key], `${path}.profile.proficiencies.${key}`, key);
    }

    addGrantGroupChoices(items, scope, source, profile.feats, `${path}.profile.feats`, "feat");

    toArray(profile.spells?.choices).forEach((choice, index) => {
        addChoice(items, scope, source, {
            ...choice,
            rawType: choice.type || "",
            type: "spell"
        }, `${path}.profile.spells.choices.${index}`);
    });

    if (profile.spells?.abilityChoice) {
        addChoice(items, scope, source, {
            type: "spellcasting-ability",
            label: "Spellcasting ability"
        }, `${path}.profile.spells.abilityChoice`);
    }

    toArray(profile.features?.expanded).forEach((feature, featureIndex) => {
        toArray(feature.choices).forEach((choice, choiceIndex) => {
            addChoice(items, scope, feature.name || source, choice, `${path}.profile.features.expanded.${featureIndex}.choices.${choiceIndex}`);
        });
    });
}

function addIdentityChoices(items, scope, identity, path) {
    const source = identity?.name || identity?.id || scope;

    toArray(identity?.choiceDefinitions).forEach((choice, index) => {
        addChoice(items, scope, source, choice, `${path}.choiceDefinitions.${index}`);
    });

    toArray(identity?.choices).forEach((choice, index) => {
        addChoice(items, scope, source, choice, `${path}.choices.${index}`);
    });

    addProfileChoices(items, scope, source, identity?.profile, path);
    addGrantGroupChoices(items, scope, source, identity?.grants?.feats, `${path}.grants.feats`, "feat");

    for (const key of ["skills", "tools", "weapons", "armor", "languages"]) {
        addGrantGroupChoices(items, scope, source, identity?.startingProficiencies?.[key], `${path}.startingProficiencies.${key}`, key);
    }
}

function dedupe(items) {
    const seen = new Set();
    return items.filter((item) => {
        const key = [item.scope, item.source, item.type, item.label, item.path].join("|").toLowerCase();
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function summarizeByScope(items) {
    const byScope = {};
    for (const item of items) {
        if (!byScope[item.scope]) {
            byScope[item.scope] = {
                total: 0,
                mapped: 0,
                missingMappings: []
            };
        }

        byScope[item.scope].total += item.count;
        if (item.mapped) {
            byScope[item.scope].mapped += item.count;
        } else {
            byScope[item.scope].missingMappings.push(item);
        }
    }

    return byScope;
}

export function createStructuredOptionCoverage(dtoInput) {
    const dto = PlayerSheetDtoHelper.normalize(dtoInput);
    const items = [];

    addIdentityChoices(items, "base", dto.baseChoices.race, "baseChoices.race");
    addIdentityChoices(items, "base", dto.baseChoices.subrace, "baseChoices.subrace");
    addIdentityChoices(items, "base", dto.baseChoices.background, "baseChoices.background");

    toArray(dto.levels).forEach((level, index) => {
        const scope = `level-${index + 1}`;
        addIdentityChoices(items, scope, level.class, `levels.${index}.class`);
        addIdentityChoices(items, scope, level.subclass, `levels.${index}.subclass`);
        addIdentityChoices(items, scope, level.feat, `levels.${index}.feat`);
        toArray(level.choices).forEach((choice, choiceIndex) => {
            addChoice(items, scope, `Level ${index + 1}`, choice, `levels.${index}.choices.${choiceIndex}`);
        });
    });

    const deduped = dedupe(items);
    const byScope = summarizeByScope(deduped);
    const missingMappings = deduped.filter((item) => !item.mapped);

    return {
        schemaVersion: 1,
        totalStructuredOptions: deduped.reduce((total, item) => total + item.count, 0),
        mappedStructuredOptions: deduped.filter((item) => item.mapped).reduce((total, item) => total + item.count, 0),
        items: deduped,
        byScope,
        missingMappings
    };
}

export function getOptionCoverageForScope(coverage, scope) {
    return coverage?.byScope?.[scope] || {
        total: 0,
        mapped: 0,
        missingMappings: []
    };
}
