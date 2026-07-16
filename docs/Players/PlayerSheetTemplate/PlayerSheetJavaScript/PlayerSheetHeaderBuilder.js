import { ABILITIES, GetJsonPathValues, formatModifier, getAbilityModifier } from "../JsonHelpers.js";

const DEPLOYED_PORTRAIT_BASE_URL = "https://raw.githubusercontent.com/CWolansk/Eldoria/refs/heads/master/docs/Assets/images";

const HEADER_ABILITY_CLASSES = {
    str: { scoreClass: "STR", saveClass: "STRSave" },
    dex: { scoreClass: "Dex", saveClass: "DEXSave" },
    con: { scoreClass: "con", saveClass: "ConSave" },
    int: { scoreClass: "int", saveClass: "IntSave" },
    wis: { scoreClass: "wis", saveClass: "WisSave" },
    cha: { scoreClass: "cha", saveClass: "ChaSave" }
};

function setHeaderText(headerHTML, className, text) {
    const element = headerHTML.querySelector("." + className);

    if(element != null) {
        element.textContent = text;
    }
}

function formatClassName(classRef) {
    if(classRef == null) {
        return "";
    }

    return String(classRef)
        .replace(/^class-/, "")
        .replace(/\.json$/, "")
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function getPrimaryClass(playerSheetObject) {
    const classes = playerSheetObject?.classes || [];
    return classes.find(entry => entry.isPrimary) || classes[0] || {};
}

function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

function toArray(value) {
    return Array.isArray(value) ? value : [];
}

function formatList(values, empty = "none") {
    const list = toArray(values).map((value) => String(value || "").trim()).filter(Boolean);
    return list.length ? list.join(", ") : empty;
}

function createDefenseChip(label, values, tone = "") {
    const chip = document.createElement("span");
    chip.className = ["player-sheet-defense-chip", tone ? `player-sheet-defense-chip--${tone}` : ""]
        .filter(Boolean)
        .join(" ");

    const chipLabel = document.createElement("span");
    chipLabel.className = "player-sheet-defense-chip__label";
    chipLabel.textContent = label;

    const chipValue = document.createElement("span");
    chipValue.className = "player-sheet-defense-chip__value";
    chipValue.textContent = formatList(values);

    chip.appendChild(chipLabel);
    chip.appendChild(chipValue);
    return chip;
}

function renderDefenseChips(headerHTML, playerSheetObject = {}) {
    const element = headerHTML.querySelector(".Defenses");
    if (!element) {
        return;
    }

    const defenses = playerSheetObject.defenses || {};
    const title = document.createElement("span");
    title.className = "player-sheet-defense-summary__title";
    title.textContent = "Defenses";

    const chipList = document.createElement("span");
    chipList.className = "player-sheet-defense-chip-list";
    chipList.appendChild(createDefenseChip("Resist", defenses.damageResistances, "resist"));
    chipList.appendChild(createDefenseChip("Immune", defenses.damageImmunities, "immune"));
    chipList.appendChild(createDefenseChip("Vuln", defenses.damageVulnerabilities, "vulnerable"));
    chipList.appendChild(createDefenseChip("Cond Imm", defenses.conditionImmunities, "condition"));

    element.replaceChildren(title, chipList);
}

function createConditionRuleCard(rule, tone = "") {
    const details = document.createElement("details");
    details.className = ["player-sheet-condition-rule", tone ? `player-sheet-condition-rule--${tone}` : ""]
        .filter(Boolean).join(" ");
    const summary = document.createElement("summary");
    const name = document.createElement("strong");
    name.textContent = rule.name;
    const description = document.createElement("span");
    description.textContent = rule.suppressedReason || rule.summary || "";
    summary.append(name, description);
    details.appendChild(summary);
    const list = document.createElement("ul");
    for (const text of rule.rules || []) {
        const item = document.createElement("li");
        item.textContent = text;
        list.appendChild(item);
    }
    details.appendChild(list);
    return details;
}

function getAutomaticEffectLabels(effects = {}) {
    const labels = [];
    if (effects.actions?.dead) labels.push("Dead at exhaustion 6");
    else if (effects.actions?.blocked) labels.push("Actions and reactions unavailable");
    if (effects.actions?.concentrationEnds) labels.push("Concentration ends");
    if (effects.movement?.zero) labels.push("All movement speeds set to 0");
    else if (effects.movement?.multiplier === 0.5) labels.push("All movement speeds halved");
    if (effects.hitPoints?.maxMultiplier === 0.5) labels.push("Maximum HP halved");
    if (effects.rolls?.attacks?.mode !== "normal") labels.push(`Attack rolls: ${effects.rolls.attacks.mode}`);
    if (effects.rolls?.abilityChecks?.mode !== "normal") labels.push(`Ability checks: ${effects.rolls.abilityChecks.mode}`);
    if (effects.rolls?.savingThrows?.mode !== "normal") labels.push(`Saving throws: ${effects.rolls.savingThrows.mode}`);
    if (effects.rolls?.savingThrows?.autoFail?.length) labels.push("STR and DEX saves automatically fail");
    if (effects.rolls?.incomingAttacks?.mode !== "normal") labels.push(`Incoming attacks: ${effects.rolls.incomingAttacks.mode}`);
    if (effects.defenses?.resistanceAll) labels.push("Resistance to all damage");
    return labels;
}

function renderConditionEffects(headerHTML, playerSheetObject = {}) {
    const existing = document.querySelector("#player-sheet-condition-effects");
    existing?.remove();
    const effects = playerSheetObject.conditionEffects || {};
    const rules = [
        ...(effects.active || []),
        ...(effects.exhaustion ? [effects.exhaustion] : []),
        ...(effects.suppressed || [])
    ];
    if (!rules.length) return;

    const panel = document.createElement("section");
    panel.id = "player-sheet-condition-effects";
    panel.className = "player-sheet-condition-effects";
    const heading = document.createElement("div");
    heading.className = "player-sheet-condition-effects__heading";
    const title = document.createElement("h3");
    title.textContent = "Active condition rules";
    const automatic = document.createElement("p");
    automatic.textContent = getAutomaticEffectLabels(effects).join(" · ") || "Rules reminder only; no deterministic stat change.";
    heading.append(title, automatic);
    panel.appendChild(heading);
    const grid = document.createElement("div");
    grid.className = "player-sheet-condition-effects__grid";
    for (const rule of effects.active || []) grid.appendChild(createConditionRuleCard(rule));
    if (effects.exhaustion) grid.appendChild(createConditionRuleCard(effects.exhaustion, "exhaustion"));
    for (const rule of effects.suppressed || []) grid.appendChild(createConditionRuleCard(rule, "suppressed"));
    panel.appendChild(grid);
    headerHTML.appendChild(panel);
}

function renderPortrait(playerSheetObject = {}) {
    const containerRoot = document.querySelector("#GlobalCharacterSheetPortrait");

    if (!containerRoot) {
        return;
    }

    let portraitContainer = containerRoot.querySelector(".Portrait");

    if (!portraitContainer) {
        portraitContainer = document.createElement("div");
        portraitContainer.className = "Portrait";
        portraitContainer.hidden = true;
        containerRoot.insertBefore(portraitContainer, containerRoot.firstChild);
    }

    const rawPortraitUrl = GetJsonPathValues(playerSheetObject, "identity.portraitUrl");
    const legacyPortraitMatch = /\/Public\/Players\/([^/?#]+)\.png(?:[?#].*)?$/iu.exec(rawPortraitUrl || "");
    const portraitUrl = legacyPortraitMatch
        ? `${DEPLOYED_PORTRAIT_BASE_URL}/${legacyPortraitMatch[1]}.png`
        : rawPortraitUrl;

    if (!portraitUrl) {
        portraitContainer.hidden = true;
        portraitContainer.replaceChildren();
        return;
    }

    let portraitImage = portraitContainer.querySelector("img");

    if (!portraitImage) {
        portraitImage = document.createElement("img");
        portraitImage.className = "player-sheet-portrait__image";
        portraitContainer.replaceChildren(portraitImage);
    }

    portraitImage.src = portraitUrl;
    portraitImage.alt = `${GetJsonPathValues(playerSheetObject, "identity.name") || "Character"} portrait`;
    portraitImage.decoding = "async";
    portraitImage.onerror = () => {
        portraitContainer.hidden = true;
        portraitContainer.replaceChildren();
    };
    portraitContainer.hidden = false;
}

function buildExperienceHint(playerSheetObject) {
    const progression = playerSheetObject?.progression || {};
    const nextLevelExperience = progression.nextLevelExperience;

    if (nextLevelExperience == null) {
        return "Level cap";
    }

    return `${formatNumber(progression.experienceToNextLevel)} to level ${progression.nextLevel}`;
}

function formatSpeed(playerSheetObject) {
    const speed = playerSheetObject?.speed || {};
    const walk = Number(speed.modes?.walk ?? speed.value) || 0;
    const modes = [`${walk} ft`];
    for (const [mode, value] of Object.entries(speed.modes || {})) {
        const amount = Number(value) || 0;
        if (mode !== "walk" && amount > 0) {
            modes.push(`${mode} ${amount} ft`);
        }
    }
    return modes.join(" / ");
}

function renderExperienceControl(headerHTML, playerSheetObject, options = {}) {
    const element = headerHTML.querySelector(".XP");
    if (!element) {
        return;
    }

    const experience = Math.max(Math.floor(Number(GetJsonPathValues(playerSheetObject, "identity.experience")) || 0), 0);
    const label = document.createElement("label");
    label.className = "player-sheet-header__xp-field";

    const labelText = document.createElement("span");
    labelText.className = "player-sheet-header__xp-label";
    labelText.textContent = "XP :";

    const input = document.createElement("input");
    input.className = "player-sheet-header__xp-input";
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = String(experience);
    input.setAttribute("aria-label", "Experience points");

    const hint = document.createElement("span");
    hint.className = "player-sheet-header__xp-hint";
    hint.textContent = buildExperienceHint(playerSheetObject);

    function commitExperience() {
        const nextExperience = Math.max(Math.floor(Number(input.value) || 0), 0);
        input.value = String(nextExperience);

        if (nextExperience === experience || typeof options.onExperienceChange !== "function") {
            return;
        }

        void options.onExperienceChange(nextExperience);
    }

    input.addEventListener("change", commitExperience);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            commitExperience();
            input.blur();
        }
    });

    label.appendChild(labelText);
    label.appendChild(input);
    element.replaceChildren(label, hint);
}

export function BuildPlayerSheetHeader(playerSheetObject, options = {}) {
    const headerHTML = document.querySelector("#GlobalCharacterSheetInformationHeader");

    if(headerHTML == null) {
        return;
    }

    const primaryClass = getPrimaryClass(playerSheetObject);
    const proficiencyBonus = Number(GetJsonPathValues(playerSheetObject, "proficiencyBonus")) || 0;

    renderPortrait(playerSheetObject);
    setHeaderText(headerHTML, "Level", "Level : " + (GetJsonPathValues(playerSheetObject, "level") || ""));
    renderExperienceControl(headerHTML, playerSheetObject, options);
    setHeaderText(headerHTML, "Name", GetJsonPathValues(playerSheetObject, "identity.name") || "");
    setHeaderText(headerHTML, "Class", "Class : " + formatClassName(primaryClass.main));
    setHeaderText(headerHTML, "Subclass", "Subclass : " + (primaryClass.sub || ""));
    setHeaderText(headerHTML, "Proficiency", "Prof : +" + proficiencyBonus);

    setHeaderText(headerHTML, "Size", "Size : " + (GetJsonPathValues(playerSheetObject, "identity.race.size") || ""));
    setHeaderText(headerHTML, "Speed", "Speed : " + formatSpeed(playerSheetObject));

    for(const ability of ABILITIES) {
        const headerClasses = HEADER_ABILITY_CLASSES[ability.key];
        const score = Number(GetJsonPathValues(playerSheetObject, "abilities." + ability.key + ".score")) || 0;
        const modifier = getAbilityModifier(score);
        const proficient = GetJsonPathValues(playerSheetObject, "abilities." + ability.key + ".savingThrow.proficient") === true;
        const saveBonus = modifier + (proficient ? proficiencyBonus : 0);
        const autoFail = GetJsonPathValues(playerSheetObject, "abilities." + ability.key + ".savingThrow.autoFail") === true;
        const rollMode = GetJsonPathValues(playerSheetObject, "abilities." + ability.key + ".savingThrow.rollMode");
        const saveEffect = autoFail ? "AUTO FAIL" : rollMode && rollMode !== "normal" ? String(rollMode).toUpperCase() : "";

        setHeaderText(headerHTML, headerClasses.scoreClass, ability.label + " : " + score + " (" + formatModifier(modifier) + ")");
        setHeaderText(headerHTML, headerClasses.saveClass, ability.label + " Save : " + formatModifier(saveBonus) + (saveEffect ? ` (${saveEffect})` : ""));
    }

    setHeaderText(headerHTML, "AC", "AC : " + (GetJsonPathValues(playerSheetObject, "ac.value") || ""));
    setHeaderText(headerHTML, "CombatHP", "HP : " + (GetJsonPathValues(playerSheetObject, "hp.current") || 0) + " / " + (GetJsonPathValues(playerSheetObject, "hp.max") || 0));
    setHeaderText(headerHTML, "TempHP", "Temp HP : " + (GetJsonPathValues(playerSheetObject, "hp.temp") || 0));
    setHeaderText(headerHTML, "Initiative", "Initiative : " + formatModifier(Number(GetJsonPathValues(playerSheetObject, "initiative")) || 0));
    setHeaderText(headerHTML, "DeathSaves", "Death Saves : " + (GetJsonPathValues(playerSheetObject, "deathSaves.successes") || 0));
    setHeaderText(headerHTML, "DeathFailures", "Death Failures : " + (GetJsonPathValues(playerSheetObject, "deathSaves.failures") || 0));
    setHeaderText(headerHTML, "Conditions", "Conditions : " + formatList(playerSheetObject.notes?.conditions));
    setHeaderText(headerHTML, "Exhaustion", "Exhaustion : " + (GetJsonPathValues(playerSheetObject, "notes.exhaustion") || 0));
    renderDefenseChips(headerHTML, playerSheetObject);
    renderConditionEffects(headerHTML, playerSheetObject);
}
