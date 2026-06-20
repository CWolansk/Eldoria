import { ABILITIES, GetJsonPathValues, formatModifier, getAbilityModifier } from "../JsonHelpers.js";

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

    const portraitUrl = GetJsonPathValues(playerSheetObject, "identity.portraitUrl");

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
    setHeaderText(headerHTML, "Speed", "Speed : " + (GetJsonPathValues(playerSheetObject, "speed.value") || "") + " ft");

    for(const ability of ABILITIES) {
        const headerClasses = HEADER_ABILITY_CLASSES[ability.key];
        const score = Number(GetJsonPathValues(playerSheetObject, "abilities." + ability.key + ".score")) || 0;
        const modifier = getAbilityModifier(score);
        const proficient = GetJsonPathValues(playerSheetObject, "abilities." + ability.key + ".savingThrow.proficient") === true;
        const saveBonus = modifier + (proficient ? proficiencyBonus : 0);

        setHeaderText(headerHTML, headerClasses.scoreClass, ability.label + " : " + score + " (" + formatModifier(modifier) + ")");
        setHeaderText(headerHTML, headerClasses.saveClass, ability.label + " Save : " + formatModifier(saveBonus));
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
}
