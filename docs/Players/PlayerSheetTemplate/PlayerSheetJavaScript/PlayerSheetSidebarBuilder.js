import { GetJsonPathValues, createTextHTML, formatModifier, getAbilityModifier } from "../JsonHelpers.js";

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

export function BuildPlayerSheetSidebar(PlayerSheetObj) {
    const sidebarHTML = document.querySelector("#GlobalCharacterSheetSidebar");

    if (sidebarHTML == null) {
        return;
    }

    const proficiencyBonus = Number(GetJsonPathValues(PlayerSheetObj, "proficiencyBonus")) || 0;

    // Skills (expertise doubles the proficiency bonus)
    sidebarHTML.replaceChildren(createTextHTML("h3", "Skills"));
    for(const skill of SKILLS) {
        const score = Number(GetJsonPathValues(PlayerSheetObj, "abilities." + skill.ability + ".score")) || 0;
        const proficient = GetJsonPathValues(PlayerSheetObj, "skills." + skill.key + ".proficient") === true;
        const expertise = GetJsonPathValues(PlayerSheetObj, "skills." + skill.key + ".expertise") === true;
        const proficiencyMultiplier = expertise ? 2 : (proficient ? 1 : 0);
        const bonus = getAbilityModifier(score) + (proficiencyMultiplier * proficiencyBonus);
        const marker = expertise ? " (expertise)" : (proficient ? " (proficient)" : "");
        sidebarHTML.appendChild(createTextHTML("h2", skill.label + " : " + formatModifier(bonus) + marker));
    }

    // Senses
    const wisModifier = getAbilityModifier(GetJsonPathValues(PlayerSheetObj, "abilities.wis.score"));
    const perceptionProficient = GetJsonPathValues(PlayerSheetObj, "skills.perception.proficient") === true;
    const passivePerception = 10 + wisModifier + (perceptionProficient ? proficiencyBonus : 0);
    sidebarHTML.appendChild(createTextHTML("h3", "Senses"));
    sidebarHTML.appendChild(createTextHTML("h2", "Passive Perception : " + passivePerception));
    const darkvision = Number(GetJsonPathValues(PlayerSheetObj, "senses.darkvision")) || 0;
    if (darkvision > 0) {
        sidebarHTML.appendChild(createTextHTML("h2", "Darkvision : " + darkvision + " ft"));
    }

    const speedModes = GetJsonPathValues(PlayerSheetObj, "speed.modes") || {};
    const movementEntries = Object.entries(speedModes)
        .filter(([mode]) => mode !== "walk");
    if (movementEntries.length) {
        sidebarHTML.appendChild(createTextHTML("h3", "Movement"));
        for (const [mode, value] of movementEntries) {
            sidebarHTML.appendChild(createTextHTML("h2", mode.charAt(0).toUpperCase() + mode.slice(1) + " : " + value + " ft"));
        }
    }
}
