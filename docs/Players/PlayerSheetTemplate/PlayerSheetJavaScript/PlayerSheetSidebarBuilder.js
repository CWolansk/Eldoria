import { GetJsonPathValues, formatModifier, getAbilityModifier } from "../JsonHelpers.js";

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

function createSidebarHeading(text) {
  const heading = document.createElement("h3");
  heading.textContent = text;
  return heading;
}

function appendMetricRow(sidebarHTML, label, value) {
  const row = document.createElement("div");
  row.className = "player-sheet-sidebar-metric";

  const labelElement = document.createElement("span");
  labelElement.className = "player-sheet-sidebar-metric__label";
  labelElement.textContent = label;

  const valueElement = document.createElement("span");
  valueElement.className = "player-sheet-sidebar-metric__value";
  valueElement.textContent = value;

  row.appendChild(labelElement);
  row.appendChild(valueElement);
  sidebarHTML.appendChild(row);
}

function appendSkillRow(sidebarHTML, playerSheetObject, skill, proficiencyBonus) {
  const score = Number(GetJsonPathValues(playerSheetObject, `abilities.${skill.ability}.score`)) || 0;
  const proficient = GetJsonPathValues(playerSheetObject, `skills.${skill.key}.proficient`) === true;
  const expertise = GetJsonPathValues(playerSheetObject, `skills.${skill.key}.expertise`) === true;
  const proficiencyMultiplier = expertise ? 2 : (proficient ? 1 : 0);
  const bonus = getAbilityModifier(score) + (proficiencyMultiplier * proficiencyBonus);
  const row = document.createElement("div");
  row.className = "player-sheet-skill-row";
  if (proficient) {
    row.classList.add("player-sheet-skill-row--proficient");
  }
  if (expertise) {
    row.classList.add("player-sheet-skill-row--expertise");
  }

  const name = document.createElement("span");
  name.className = "player-sheet-skill-row__name";
  name.textContent = skill.label;

  const ability = document.createElement("span");
  ability.className = "player-sheet-skill-row__ability";
  ability.textContent = skill.ability.toUpperCase();

  const value = document.createElement("span");
  value.className = "player-sheet-skill-row__value";
  value.textContent = formatModifier(bonus);

  const training = document.createElement("span");
  training.className = "player-sheet-skill-row__training";
  training.textContent = expertise ? "E" : (proficient ? "P" : "");
  training.title = expertise ? "Expertise" : (proficient ? "Proficient" : "Untrained");
  training.setAttribute("aria-label", training.title);

  row.appendChild(name);
  row.appendChild(ability);
  row.appendChild(value);
  row.appendChild(training);
  sidebarHTML.appendChild(row);
}

export function BuildPlayerSheetSidebar(playerSheetObject) {
  const sidebarHTML = document.querySelector("#GlobalCharacterSheetSidebar");

  if (sidebarHTML == null) {
    return;
  }

  const proficiencyBonus = Number(GetJsonPathValues(playerSheetObject, "proficiencyBonus")) || 0;

  sidebarHTML.replaceChildren(createSidebarHeading("Skills"));
  for (const skill of SKILLS) {
    appendSkillRow(sidebarHTML, playerSheetObject, skill, proficiencyBonus);
  }

  const wisModifier = getAbilityModifier(GetJsonPathValues(playerSheetObject, "abilities.wis.score"));
  const perceptionProficient = GetJsonPathValues(playerSheetObject, "skills.perception.proficient") === true;
  const passivePerception = 10 + wisModifier + (perceptionProficient ? proficiencyBonus : 0);
  sidebarHTML.appendChild(createSidebarHeading("Senses"));
  appendMetricRow(sidebarHTML, "Passive Perception", passivePerception);

  const darkvision = Number(GetJsonPathValues(playerSheetObject, "senses.darkvision")) || 0;
  if (darkvision > 0) {
    appendMetricRow(sidebarHTML, "Darkvision", `${darkvision} ft`);
  }

  const speedModes = GetJsonPathValues(playerSheetObject, "speed.modes") || {};
  const movementEntries = Object.entries(speedModes)
    .filter(([mode]) => mode !== "walk");
  if (movementEntries.length) {
    sidebarHTML.appendChild(createSidebarHeading("Movement"));
    for (const [mode, value] of movementEntries) {
      appendMetricRow(sidebarHTML, `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`, `${value} ft`);
    }
  }
}
