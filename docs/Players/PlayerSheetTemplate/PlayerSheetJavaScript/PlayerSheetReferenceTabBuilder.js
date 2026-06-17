import { GetJsonPathValues, createTextHTML } from "../JsonHelpers.js";

export function BuildPlayerSheetReferenceTab(PlayerSheetObj) {
    const tabContentContainer = document.querySelector("#TabContent");

    const subrace = GetJsonPathValues(PlayerSheetObj, "identity.race.subrace");
    const raceLabel = GetJsonPathValues(PlayerSheetObj, "identity.race.name") + (subrace ? ", " + subrace : "");

    tabContentContainer.replaceChildren(createTextHTML("h3", "Reference"));
    tabContentContainer.appendChild(createTextHTML("h2", "Alignment : " + GetJsonPathValues(PlayerSheetObj, "identity.alignment")));
    tabContentContainer.appendChild(createTextHTML("h2", "Race : " + raceLabel));
    tabContentContainer.appendChild(createTextHTML("h2", "Background : " + GetJsonPathValues(PlayerSheetObj, "identity.background.name")));
    tabContentContainer.appendChild(createTextHTML("h2", "Background Feature : " + GetJsonPathValues(PlayerSheetObj, "identity.background.feature")));
    tabContentContainer.appendChild(createTextHTML("h2", "Ruleset : " + GetJsonPathValues(PlayerSheetObj, "sourcePolicy.ruleset")));

    tabContentContainer.appendChild(createTextHTML("h3", "Allowed Sources"));
    const sources = GetJsonPathValues(PlayerSheetObj, "sourcePolicy.allowedSources") || [];
    tabContentContainer.appendChild(createTextHTML("p", sources.length ? sources.join(", ") : "None"));
}
