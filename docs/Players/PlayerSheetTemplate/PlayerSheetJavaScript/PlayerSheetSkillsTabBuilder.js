import { formatModifier, getAbilityModifier } from "../JsonHelpers.js";
import {
    appendEmptyState,
    appendPillList,
    createCardGrid,
    createDefinitionList,
    createSection,
    createTabShell
} from "./PlayerSheetTabHelpers.js";

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

const ABILITY_LABELS = {
    str: "STR",
    dex: "DEX",
    con: "CON",
    int: "INT",
    wis: "WIS",
    cha: "CHA"
};

function getProficiencyName(entry) {
    return typeof entry === "string"
        ? entry
        : entry?.name || entry?.label || entry?.id || "";
}

function formatProficiencyDisplayName(value) {
    const text = String(value || "").trim();
    if (!text) {
        return "";
    }

    if (text === text.toLowerCase()) {
        return text
            .replace(/\b[a-z]/gu, (letter) => letter.toUpperCase())
            .replace(/'S\b/gu, "'s");
    }

    return text.replace(/'S\b/gu, "'s");
}

function uniqueDisplayValues(values) {
    const seen = new Set();
    const result = [];

    for (const value of values) {
        const display = formatProficiencyDisplayName(value);
        const key = display.toLowerCase();
        if (!display || seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(display);
    }

    return result;
}

function appendProficiencyPills(shell, title, entries) {
    const values = uniqueDisplayValues((entries || []).map(getProficiencyName));
    const section = createSection(title);

    if (!values.length) {
        appendEmptyState(section, "None.");
    } else {
        appendPillList(section, values);
    }

    shell.appendChild(section);
}

function appendSkillCards(shell, playerSheetObject) {
    const section = createSection("Skill Proficiencies");
    const proficiencyBonus = Number(playerSheetObject?.proficiencyBonus) || 0;
    const grid = createCardGrid();

    for (const skill of SKILLS) {
        const detail = playerSheetObject?.skills?.[skill.key];
        if (!detail?.proficient) {
            continue;
        }

        const abilityScore = Number(playerSheetObject?.abilities?.[skill.ability]?.score) || 10;
        const multiplier = detail.expertise ? 2 : 1;
        const bonus = getAbilityModifier(abilityScore) + (multiplier * proficiencyBonus);
        const card = document.createElement("article");
        card.className = "player-sheet-info-card";
        const heading = document.createElement("h4");
        heading.className = "player-sheet-info-card__title";
        heading.textContent = skill.label;
        card.appendChild(heading);
        card.appendChild(createDefinitionList([
            ["Bonus", formatModifier(bonus)],
            ...(detail.rollMode && detail.rollMode !== "normal" ? [["Roll", detail.rollMode]] : []),
            ["Ability", ABILITY_LABELS[skill.ability]],
            ["Training", detail.expertise ? "Expertise" : "Proficient"],
            ["Source", detail.source || "Character"]
        ]));
        grid.appendChild(card);
    }

    if (!grid.children.length) {
        appendEmptyState(section, "None.");
    } else {
        section.appendChild(grid);
    }

    shell.appendChild(section);
}

function appendSavingThrows(shell, playerSheetObject) {
    const values = (playerSheetObject?.proficiencies?.savingThrows || [])
        .map((ability) => {
            const key = String(ability || "").toLowerCase();
            const detail = playerSheetObject?.abilities?.[key]?.savingThrow || {};
            const effect = detail.autoFail ? "auto fail" : detail.rollMode && detail.rollMode !== "normal" ? detail.rollMode : "";
            const label = ABILITY_LABELS[key] || String(ability || "").toUpperCase();
            return effect ? `${label} (${effect})` : label;
        })
        .filter(Boolean);
    const section = createSection("Saving Throw Proficiencies");
    if (!values.length) {
        appendEmptyState(section, "None.");
    } else {
        appendPillList(section, values);
    }
    shell.appendChild(section);
}

export function BuildPlayerSheetSkillsTab(playerSheetObject) {
    const shell = createTabShell("Skills");

    appendSkillCards(shell, playerSheetObject);
    appendSavingThrows(shell, playerSheetObject);
    appendProficiencyPills(shell, "Armor Proficiencies", playerSheetObject?.proficiencies?.armor);
    appendProficiencyPills(shell, "Weapon Proficiencies", playerSheetObject?.proficiencies?.weapons);
    appendProficiencyPills(shell, "Tool Proficiencies", playerSheetObject?.proficiencies?.tools);
    appendProficiencyPills(shell, "Languages", playerSheetObject?.proficiencies?.languages);
}
