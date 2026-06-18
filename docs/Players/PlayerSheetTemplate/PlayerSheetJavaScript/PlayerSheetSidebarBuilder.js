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

function appendSkillRow(sidebarHTML, playerSheetObject, skill, proficiencyBonus) {
  const score = Number(GetJsonPathValues(playerSheetObject, `abilities.${skill.ability}.score`)) || 0;
  const proficient = GetJsonPathValues(playerSheetObject, `skills.${skill.key}.proficient`) === true;
  const expertise = GetJsonPathValues(playerSheetObject, `skills.${skill.key}.expertise`) === true;
  const proficiencyMultiplier = expertise ? 2 : (proficient ? 1 : 0);
  const bonus = getAbilityModifier(score) + (proficiencyMultiplier * proficiencyBonus);
  const marker = expertise ? " (expertise)" : (proficient ? " (proficient)" : "");
  sidebarHTML.appendChild(createTextHTML("h2", `${skill.label} : ${formatModifier(bonus)}${marker}`));
}

export function BuildPlayerSheetSidebar(playerSheetObject) {
  const sidebarHTML = document.querySelector("#GlobalCharacterSheetSidebar");

  if (sidebarHTML == null) {
    return;
  }

  const proficiencyBonus = Number(GetJsonPathValues(playerSheetObject, "proficiencyBonus")) || 0;

  sidebarHTML.replaceChildren(createTextHTML("h3", "Skills"));
  for (const skill of SKILLS) {
    appendSkillRow(sidebarHTML, playerSheetObject, skill, proficiencyBonus);
  }

  const wisModifier = getAbilityModifier(GetJsonPathValues(playerSheetObject, "abilities.wis.score"));
  const perceptionProficient = GetJsonPathValues(playerSheetObject, "skills.perception.proficient") === true;
  const passivePerception = 10 + wisModifier + (perceptionProficient ? proficiencyBonus : 0);
  sidebarHTML.appendChild(createTextHTML("h3", "Senses"));
  sidebarHTML.appendChild(createTextHTML("h2", `Passive Perception : ${passivePerception}`));

  const darkvision = Number(GetJsonPathValues(playerSheetObject, "senses.darkvision")) || 0;
  if (darkvision > 0) {
    sidebarHTML.appendChild(createTextHTML("h2", `Darkvision : ${darkvision} ft`));
  }

  const speedModes = GetJsonPathValues(playerSheetObject, "speed.modes") || {};
  const movementEntries = Object.entries(speedModes)
    .filter(([mode]) => mode !== "walk");
  if (movementEntries.length) {
    sidebarHTML.appendChild(createTextHTML("h3", "Movement"));
    for (const [mode, value] of movementEntries) {
      sidebarHTML.appendChild(createTextHTML("h2", `${mode.charAt(0).toUpperCase()}${mode.slice(1)} : ${value} ft`));
    }
  }
}

