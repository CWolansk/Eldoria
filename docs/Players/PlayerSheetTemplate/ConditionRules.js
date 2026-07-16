const CONDITION_DEFINITIONS = {
    blinded: {
        name: "Blinded",
        summary: "Cannot see; sight-based checks fail.",
        rules: ["Automatically fails ability checks that require sight.", "Attack rolls have disadvantage.", "Attack rolls against the creature have advantage."],
        effects: { attackDisadvantage: true, incomingAttackAdvantage: true }
    },
    charmed: {
        name: "Charmed",
        summary: "Cannot attack the charmer; the charmer has social advantage.",
        rules: ["Cannot attack the charmer or target the charmer with harmful abilities or magical effects.", "The charmer has advantage on social ability checks against the creature."]
    },
    deafened: {
        name: "Deafened",
        summary: "Cannot hear.",
        rules: ["Automatically fails ability checks that require hearing."]
    },
    frightened: {
        name: "Frightened",
        summary: "Hindered while the source of fear is visible.",
        rules: ["Has disadvantage on ability checks and attack rolls while the source of fear is within line of sight.", "Cannot willingly move closer to the source of fear."]
    },
    grappled: {
        name: "Grappled",
        summary: "Speed becomes 0.",
        rules: ["Speed is 0 and cannot benefit from bonuses to speed.", "Ends if the grappler is incapacitated or an effect moves the creature outside the grappler's reach."],
        effects: { speedZero: true }
    },
    incapacitated: {
        name: "Incapacitated",
        summary: "Cannot take actions or reactions.",
        rules: ["Cannot take actions or reactions.", "Cannot take bonus actions.", "Concentration ends."],
        effects: { actionsBlocked: true, reactionsBlocked: true, concentrationEnds: true }
    },
    invisible: {
        name: "Invisible",
        summary: "Unseen without special senses or magic.",
        rules: ["Cannot be seen without magic or a special sense, though location can still be detected by sound or tracks.", "Attack rolls have advantage.", "Attack rolls against the creature have disadvantage."],
        effects: { attackAdvantage: true, incomingAttackDisadvantage: true }
    },
    paralyzed: {
        name: "Paralyzed",
        summary: "Incapacitated, immobile, and vulnerable to nearby attacks.",
        rules: ["Is incapacitated and cannot move or speak.", "Automatically fails Strength and Dexterity saving throws.", "Attack rolls against the creature have advantage.", "A hit from within 5 feet is a critical hit."],
        effects: { actionsBlocked: true, reactionsBlocked: true, concentrationEnds: true, speedZero: true, speechBlocked: true, autoFailStrDex: true, incomingAttackAdvantage: true }
    },
    petrified: {
        name: "Petrified",
        summary: "Transformed, incapacitated, unaware, and resistant to damage.",
        rules: ["Is incapacitated, cannot move or speak, and is unaware of its surroundings.", "Automatically fails Strength and Dexterity saving throws.", "Attack rolls against the creature have advantage.", "Has resistance to all damage and is immune to poison and disease while petrified."],
        effects: { actionsBlocked: true, reactionsBlocked: true, concentrationEnds: true, speedZero: true, speechBlocked: true, unaware: true, autoFailStrDex: true, incomingAttackAdvantage: true, resistanceAll: true }
    },
    poisoned: {
        name: "Poisoned",
        summary: "Attack rolls and ability checks have disadvantage.",
        rules: ["Has disadvantage on attack rolls and ability checks."],
        effects: { attackDisadvantage: true, abilityCheckDisadvantage: true }
    },
    prone: {
        name: "Prone",
        summary: "Crawls unless it stands; attacks are hindered.",
        rules: ["Can crawl or stand by spending movement equal to half its speed.", "Attack rolls have disadvantage.", "Attack rolls from within 5 feet have advantage; attacks from farther away have disadvantage."],
        effects: { attackDisadvantage: true }
    },
    restrained: {
        name: "Restrained",
        summary: "Speed 0; attacks and Dexterity saves are hindered.",
        rules: ["Speed is 0 and cannot benefit from bonuses to speed.", "Attack rolls have disadvantage, and attack rolls against the creature have advantage.", "Dexterity saving throws have disadvantage."],
        effects: { speedZero: true, attackDisadvantage: true, incomingAttackAdvantage: true, dexSaveDisadvantage: true }
    },
    stunned: {
        name: "Stunned",
        summary: "Incapacitated, immobile, and easy to hit.",
        rules: ["Is incapacitated, cannot move, and can speak only falteringly.", "Automatically fails Strength and Dexterity saving throws.", "Attack rolls against the creature have advantage."],
        effects: { actionsBlocked: true, reactionsBlocked: true, concentrationEnds: true, speedZero: true, autoFailStrDex: true, incomingAttackAdvantage: true }
    },
    unconscious: {
        name: "Unconscious",
        summary: "Incapacitated, unaware, prone, and vulnerable to nearby attacks.",
        rules: ["Is incapacitated, cannot move or speak, and is unaware of its surroundings.", "Drops held items and falls prone.", "Automatically fails Strength and Dexterity saving throws.", "Attack rolls against the creature have advantage; a hit from within 5 feet is a critical hit."],
        effects: { actionsBlocked: true, reactionsBlocked: true, concentrationEnds: true, speedZero: true, speechBlocked: true, unaware: true, autoFailStrDex: true, incomingAttackAdvantage: true }
    }
};

const EXHAUSTION_RULES = [
    "Disadvantage on ability checks.",
    "Speed is halved.",
    "Disadvantage on attack rolls and saving throws.",
    "Hit point maximum is halved.",
    "Speed becomes 0.",
    "The creature dies."
];

function normalizeName(value) {
    return String(value || "").trim().toLowerCase();
}

function rollMode(hasAdvantage, hasDisadvantage) {
    if (hasAdvantage === hasDisadvantage) return "normal";
    return hasAdvantage ? "advantage" : "disadvantage";
}

export function getConditionRule(condition) {
    const name = String(condition || "").trim();
    return CONDITION_DEFINITIONS[normalizeName(name)] || {
        name: name || "Unknown condition",
        summary: "Custom condition; no automatic rules are defined.",
        rules: ["Use the condition's source text for its effects."],
        effects: {},
        custom: true
    };
}

export function compileConditionEffects(conditions = [], exhaustion = 0, options = {}) {
    const immunities = new Set((options.conditionImmunities || []).map(normalizeName));
    const active = [];
    const suppressed = [];
    const accumulator = {
        attackAdvantage: false,
        attackDisadvantage: false,
        incomingAttackAdvantage: false,
        incomingAttackDisadvantage: false,
        abilityCheckDisadvantage: false,
        savingThrowDisadvantage: false,
        dexSaveDisadvantage: false,
        autoFailStrDex: false,
        actionsBlocked: false,
        reactionsBlocked: false,
        concentrationEnds: false,
        speedZero: false,
        speechBlocked: false,
        unaware: false,
        resistanceAll: false,
        dead: false
    };

    for (const rawCondition of conditions) {
        const rule = getConditionRule(rawCondition);
        if (immunities.has(normalizeName(rule.name))) {
            suppressed.push({ ...rule, suppressedReason: `Immune to ${rule.name}` });
            continue;
        }
        active.push(rule);
        for (const [key, value] of Object.entries(rule.effects || {})) {
            if (value === true) accumulator[key] = true;
        }
    }

    const exhaustionLevel = Math.max(0, Math.min(6, Math.trunc(Number(exhaustion) || 0)));
    if (exhaustionLevel >= 1) accumulator.abilityCheckDisadvantage = true;
    if (exhaustionLevel >= 3) {
        accumulator.attackDisadvantage = true;
        accumulator.savingThrowDisadvantage = true;
    }
    if (exhaustionLevel >= 5) accumulator.speedZero = true;
    if (exhaustionLevel >= 6) accumulator.dead = true;

    const exhaustionRule = exhaustionLevel ? {
        name: `Exhaustion ${exhaustionLevel}`,
        summary: EXHAUSTION_RULES[exhaustionLevel - 1],
        rules: EXHAUSTION_RULES.slice(0, exhaustionLevel)
    } : null;

    return {
        active,
        suppressed,
        exhaustion: exhaustionRule,
        rolls: {
            attacks: { mode: rollMode(accumulator.attackAdvantage, accumulator.attackDisadvantage) },
            incomingAttacks: { mode: rollMode(accumulator.incomingAttackAdvantage, accumulator.incomingAttackDisadvantage) },
            abilityChecks: { mode: accumulator.abilityCheckDisadvantage ? "disadvantage" : "normal" },
            savingThrows: {
                mode: accumulator.savingThrowDisadvantage ? "disadvantage" : "normal",
                dexMode: accumulator.savingThrowDisadvantage || accumulator.dexSaveDisadvantage ? "disadvantage" : "normal",
                autoFail: accumulator.autoFailStrDex ? ["str", "dex"] : []
            }
        },
        movement: {
            multiplier: exhaustionLevel >= 2 && exhaustionLevel < 5 ? 0.5 : 1,
            zero: accumulator.speedZero
        },
        hitPoints: { maxMultiplier: exhaustionLevel >= 4 ? 0.5 : 1 },
        actions: {
            blocked: accumulator.actionsBlocked || accumulator.dead,
            reactionsBlocked: accumulator.reactionsBlocked || accumulator.dead,
            concentrationEnds: accumulator.concentrationEnds,
            speechBlocked: accumulator.speechBlocked,
            unaware: accumulator.unaware,
            dead: accumulator.dead
        },
        defenses: { resistanceAll: accumulator.resistanceAll }
    };
}

export function formatRollMode(mode) {
    if (mode === "advantage") return "Advantage";
    if (mode === "disadvantage") return "Disadvantage";
    return "Normal";
}
