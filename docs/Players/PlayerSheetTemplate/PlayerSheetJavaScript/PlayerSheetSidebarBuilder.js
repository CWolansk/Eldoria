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
  const halfProficiency = GetJsonPathValues(playerSheetObject, `skills.${skill.key}.halfProficiency`) === true;
  const proficiencyModifier = expertise
    ? 2 * proficiencyBonus
    : proficient
      ? proficiencyBonus
      : halfProficiency
        ? Math.floor(proficiencyBonus / 2)
        : 0;
  const bonus = getAbilityModifier(score) + proficiencyModifier;
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
  training.textContent = expertise ? "E" : (proficient ? "P" : (halfProficiency ? "J" : ""));
  training.title = expertise ? "Expertise" : (proficient ? "Proficient" : (halfProficiency ? "Jack of All Trades" : "Untrained"));
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
  const wasMobileOpen = sidebarHTML.dataset.mobileOpen === "true";
  const content = document.createElement("div");
  content.className = "player-sheet-sidebar__content";
  content.id = "player-sheet-sidebar-content";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "player-sheet-sidebar__mobile-toggle";
  toggle.setAttribute("aria-controls", content.id);

  const toggleLabel = document.createElement("span");
  toggleLabel.textContent = "Skills & Senses";
  const toggleAction = document.createElement("span");
  toggleAction.className = "player-sheet-sidebar__mobile-toggle-action";
  toggleAction.setAttribute("aria-hidden", "true");
  toggle.appendChild(toggleLabel);
  toggle.appendChild(toggleAction);

  const setMobileOpen = (isOpen) => {
    sidebarHTML.dataset.mobileOpen = isOpen ? "true" : "false";
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggleAction.textContent = isOpen ? "Hide" : "Show";
  };
  toggle.addEventListener("click", () => {
    setMobileOpen(sidebarHTML.dataset.mobileOpen !== "true");
  });
  setMobileOpen(wasMobileOpen);

  content.appendChild(createSidebarHeading("Skills"));
  for (const skill of SKILLS) {
    appendSkillRow(content, playerSheetObject, skill, proficiencyBonus);
  }

  const wisModifier = getAbilityModifier(GetJsonPathValues(playerSheetObject, "abilities.wis.score"));
  const perceptionProficient = GetJsonPathValues(playerSheetObject, "skills.perception.proficient") === true;
  const perceptionExpertise = GetJsonPathValues(playerSheetObject, "skills.perception.expertise") === true;
  const perceptionHalfProficiency = GetJsonPathValues(playerSheetObject, "skills.perception.halfProficiency") === true;
  const passivePerception = 10 + wisModifier + (perceptionExpertise
    ? 2 * proficiencyBonus
    : perceptionProficient
      ? proficiencyBonus
      : perceptionHalfProficiency
        ? Math.floor(proficiencyBonus / 2)
        : 0);
  content.appendChild(createSidebarHeading("Senses"));
  appendMetricRow(content, "Passive Perception", passivePerception);

  const darkvision = Number(GetJsonPathValues(playerSheetObject, "senses.darkvision")) || 0;
  if (darkvision > 0) {
    appendMetricRow(content, "Darkvision", `${darkvision} ft`);
  }

  const speedModes = GetJsonPathValues(playerSheetObject, "speed.modes") || {};
  const movementEntries = Object.entries(speedModes)
    .filter(([mode]) => mode !== "walk");
  if (movementEntries.length) {
    content.appendChild(createSidebarHeading("Movement"));
    for (const [mode, value] of movementEntries) {
      appendMetricRow(content, `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`, `${value} ft`);
    }
  }

  sidebarHTML.replaceChildren(toggle, content);
}
