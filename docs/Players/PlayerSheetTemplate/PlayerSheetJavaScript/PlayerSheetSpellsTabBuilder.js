import { GetJsonPathValues, createTextHTML, formatModifier } from "../JsonHelpers.js";

function formatSpellName(spell) {
  if (typeof spell === "string") {
    return spell;
  }

  return spell?.name || spell?.label || spell?.ref || "Spell";
}

function appendSpellList(container, heading, spells){
  const values = spells || [];
  if(values.length === 0) {
    return;
  }

  container.appendChild(createTextHTML("h3", heading));
  const list = document.createElement("ul");
  for(const spell of values) {
    list.appendChild(createTextHTML("li", formatSpellName(spell)));
  }
  container.appendChild(list);
}

export function BuildPlayerSheetSpellsTab(PlayerSheetObj) {
    const tabContentContainer = document.querySelector("#TabContent");

    tabContentContainer.replaceChildren(createTextHTML("h3", "Spells"));

    const classes = GetJsonPathValues(PlayerSheetObj, "classes") || [];
    const spellcasters = classes.filter((characterClass) => characterClass.spellcasting != null);
    const racialSpells = GetJsonPathValues(PlayerSheetObj, "racialSpells") || {};
    const hasRacialSpells = (racialSpells.cantrips || []).length
        || (racialSpells.known || []).length
        || (racialSpells.innate || []).length;
    const featSpells = GetJsonPathValues(PlayerSheetObj, "featSpells") || {};
    const hasFeatSpells = (featSpells.cantrips || []).length
        || (featSpells.known || []).length
        || (featSpells.innate || []).length;

    if(spellcasters.length === 0 && !hasRacialSpells && !hasFeatSpells) {
        tabContentContainer.appendChild(createTextHTML("p", "This character has no spellcasting."));
        return;
    }

    if (hasRacialSpells) {
        tabContentContainer.appendChild(createTextHTML("h2", "Racial Spellcasting Ability : " + (racialSpells.ability ? String(racialSpells.ability).toUpperCase() : "Varies")));
        if (racialSpells.spellAttackBonus != null) {
            tabContentContainer.appendChild(createTextHTML("h2", "Racial Spell Attack Bonus : " + formatModifier(Number(racialSpells.spellAttackBonus) || 0)));
        }
        if (racialSpells.spellSaveDc != null) {
            tabContentContainer.appendChild(createTextHTML("h2", "Racial Spell Save DC : " + (Number(racialSpells.spellSaveDc) || 0)));
        }
        appendSpellList(tabContentContainer, "Racial Cantrips", racialSpells.cantrips);
        appendSpellList(tabContentContainer, "Racial Spells", [...(racialSpells.known || []), ...(racialSpells.innate || [])]);
    }

    if (hasFeatSpells) {
        tabContentContainer.appendChild(createTextHTML("h2", "Feat Spellcasting Ability : " + (featSpells.ability ? String(featSpells.ability).toUpperCase() : "Varies")));
        if (featSpells.spellAttackBonus != null) {
            tabContentContainer.appendChild(createTextHTML("h2", "Feat Spell Attack Bonus : " + formatModifier(Number(featSpells.spellAttackBonus) || 0)));
        }
        if (featSpells.spellSaveDc != null) {
            tabContentContainer.appendChild(createTextHTML("h2", "Feat Spell Save DC : " + (Number(featSpells.spellSaveDc) || 0)));
        }
        appendSpellList(tabContentContainer, "Feat Cantrips", featSpells.cantrips);
        appendSpellList(tabContentContainer, "Feat Spells", [...(featSpells.known || []), ...(featSpells.innate || [])]);
    }

    for(const characterClass of spellcasters) {
        const spellcasting = characterClass.spellcasting;
        tabContentContainer.appendChild(createTextHTML("h2", "Spellcasting Ability : " + String(spellcasting.ability || "").toUpperCase()));
        tabContentContainer.appendChild(createTextHTML("h2", "Spell Attack Bonus : " + formatModifier(Number(spellcasting.spellAttackBonus) || 0)));
        tabContentContainer.appendChild(createTextHTML("h2", "Spell Save DC : " + (Number(spellcasting.spellSaveDc) || 0)));

        appendSpellList(tabContentContainer, "Cantrips", spellcasting.cantrips);
        appendSpellList(tabContentContainer, "Known Spells", spellcasting.knownSpells);
        appendSpellList(tabContentContainer, "Prepared Spells", spellcasting.preparedSpells);
        appendSpellList(tabContentContainer, "Innate Spells", spellcasting.innateSpells);
    }

    // Spell slots remaining per level
    const byLevel = GetJsonPathValues(PlayerSheetObj, "spellSlots.byLevel");
    if(byLevel != null) {
        tabContentContainer.appendChild(createTextHTML("h3", "Spell Slots"));
        const slotList = document.createElement("ul");
        for(const level of Object.keys(byLevel)) {
            const slot = byLevel[level];
            const available = (Number(slot.max) || 0) - (Number(slot.expended) || 0);
            slotList.appendChild(createTextHTML("li", "Level " + level + " : " + available + " / " + (Number(slot.max) || 0)));
        }
        tabContentContainer.appendChild(slotList);
    }
}
