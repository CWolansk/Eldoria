// Living world, Stage 3 views: the city outline (districts, locations, NPCs), location
// and NPC pages, travelling NPCs, Rumours, search, and the extra things a jot can do
// (people moving, a sickness starting or ending). There are no city maps.
//
// Like the rest of the page, this file holds no world data: every place, person and
// tale it shows is fetched with the DM key.

import { cityOutline, formatDay, formatDayShort } from "../../world-sim/engine/index.js";

const ENTRY_LABEL = { district: "District", location: "Location", npc: "NPC" };
const SIZE_LABELS = [[1, "A small thing"], [2, "Ordinary"], [3, "A big thing"], [4, "Enormous"], [5, "Never seen before"]];
const ATTRIBUTE_LABEL = { who: "who", what: "what", where: "where", size: "how big", flatters: "the tone" };

export function createStage3Views({ ui, esc, $, run, render, placeName, keepTyping }) {
  ui.overview = null;
  ui.city = null;
  ui.overviewStale = true;
  ui.entry = null;
  ui.search = "";
  ui.cityForm = { type: "location", name: "", kind: "", note: "", district: "", location: "" };
  ui.rumourForm = { eventId: "", origin: "", who: "", what: "", where: "", size: "2", tone: "", isTrue: true };
  ui.itinerary = null;

  /* ---------------- data ---------------- */

  const entries = () => ui.city?.entries || [];
  const entryById = (id) => entries().find((entry) => entry.id === id) || null;
  const towns = () => ui.places.filter((place) => !place.parent);
  const folded = () => ({ entries: entries(), byId: new Map(entries().map((entry) => [entry.id, entry])) });
  const travellerOf = (npcId) => (ui.overview?.travellers || ui.city?.travellers || []).find((who) => who.npcId === npcId) || null;

  async function loadStage3() {
    if (!ui.world?.initialized) {
      ui.overview = null;
      ui.city = null;
      return;
    }
    const [overview, city] = await Promise.all([ui.api.getWorldOverview(), ui.api.getWorldCity()]);
    ui.overview = overview;
    ui.city = city;
    ui.overviewStale = false;
  }

  /** A name for anything a jot can be about: a place, a location or a person. */
  function entryName(id) {
    const entry = entryById(id);
    return entry ? entry.name : "";
  }

  /** Extra choices for the "Where" box: locations and people the DM has added. */
  function entryOptions(selected) {
    const known = new Set(ui.places.map((place) => place.id));
    return entries().filter((entry) => !entry.retired && entry.type !== "district" && !known.has(entry.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => `<option value="${esc(entry.id)}"${entry.id === selected ? " selected" : ""}>${esc(entry.name)} (${esc(placeName(entry.town))})</option>`)
      .join("");
  }

  /* ---------------- names as links ---------------- */

  function linkTargets() {
    const targets = [];
    for (const place of towns()) targets.push({ name: place.name, act: "open-place", id: place.id });
    for (const entry of entries()) {
      if (!entry.retired) targets.push({ name: entry.name, act: "open-entry", id: entry.id });
    }
    for (const good of ui.markets?.goods || []) targets.push({ name: good.name, act: "open-good", id: good.id });
    return targets.filter((target) => target.name.length >= 3).sort((a, b) => b.name.length - a.name.length);
  }

  /** Escapes text and turns every place, location, person and good it names into a link. */
  function linked(text) {
    const source = String(text ?? "");
    const targets = linkTargets();
    if (!targets.length) return esc(source);
    const spans = [];
    const lower = source.toLowerCase();
    for (const target of targets) {
      const needle = target.name.toLowerCase();
      let from = 0;
      for (;;) {
        const at = lower.indexOf(needle, from);
        if (at < 0) break;
        const end = at + needle.length;
        from = end;
        const before = at === 0 ? "" : source[at - 1];
        const after = source[end] || "";
        if (/[A-Za-z0-9]/u.test(before) || /[A-Za-z0-9]/u.test(after)) continue;
        if (spans.some((span) => at < span.end && end > span.at)) continue;
        spans.push({ at, end, target });
      }
    }
    spans.sort((a, b) => a.at - b.at);
    let html = "";
    let cursor = 0;
    for (const span of spans) {
      html += esc(source.slice(cursor, span.at));
      html += `<button class="ws-link" type="button" data-act="${span.target.act}" data-id="${esc(span.target.id)}">${esc(source.slice(span.at, span.end))}</button>`;
      cursor = span.end;
    }
    return html + esc(source.slice(cursor));
  }

  /* ---------------- the city outline on a town's page ---------------- */

  const knowChip = (entry) => (entry.playersKnow
    ? `<span class="ws-chip ws-chip--shown">players know</span>` : "");

  function entryLink(entry) {
    return `<button class="ws-link" type="button" data-act="open-entry" data-id="${esc(entry.id)}">${esc(entry.name)}</button>`;
  }

  function whereabouts(npc) {
    const travel = travellerOf(npc.id);
    if (!travel) return "";
    if (travel.at) {
      return travel.at === npc.town ? "" : ` <span class="ws-meta">now in ${esc(travel.atName)}</span>`;
    }
    return ` <span class="ws-meta">on the road to ${esc(travel.toName)}, arriving ${esc(formatDayShort(travel.arriveDay))}</span>`;
  }

  function npcItem(npc) {
    return `<li data-entry="${esc(npc.id)}">${entryLink(npc)}${npc.kind ? ` <span class="ws-meta">${esc(npc.kind)}</span>` : ""} ${knowChip(npc)}${whereabouts(npc)}</li>`;
  }

  function locationBlock(location) {
    return `<li class="ws-city__location" data-entry="${esc(location.id)}">${entryLink(location)}${location.kind ? ` <span class="ws-meta">${esc(location.kind)}</span>` : ""} ${knowChip(location)}
      ${location.note ? `<div class="ws-meta">${esc(location.note)}</div>` : ""}
      ${location.npcs.length ? `<ul class="ws-plain ws-city__people">${location.npcs.map(npcItem).join("")}</ul>` : ""}</li>`;
  }

  function addForm(townId, outline) {
    const form = ui.cityForm;
    const type = form.type;
    const districts = outline.districts;
    const locations = [...outline.locations, ...outline.districts.flatMap((district) => district.locations)];
    return `<details class="ws-setup" id="ws-city-add"${form.open ? " open" : ""}><summary>Add a district, a place or a person</summary><div>
      <div class="ws-fields">
        <label>What<select data-bind="cityForm.type" data-rerender="true" id="ws-city-type">
          ${[["location", "A place (shop, inn, hall, landmark)"], ["npc", "A person"], ["district", "A district"]].map(([id, label]) => `<option value="${id}"${type === id ? " selected" : ""}>${label}</option>`).join("")}</select></label>
        <label class="ws-field--wide">Name<input class="ws-input" id="ws-city-name" type="text" data-bind="cityForm.name" value="${esc(form.name)}"></label>
        ${type === "district" ? "" : `<label>${type === "npc" ? "What they do" : "Kind"}<input class="ws-input" id="ws-city-kind" type="text" data-bind="cityForm.kind" value="${esc(form.kind)}" placeholder="${type === "npc" ? "Innkeeper" : "Inn"}"></label>`}
        ${type !== "district" && districts.length ? `<label>District<select data-bind="cityForm.district" id="ws-city-district"><option value="">No particular district</option>${
          districts.map((district) => `<option value="${esc(district.id)}"${form.district === district.id ? " selected" : ""}>${esc(district.name)}</option>`).join("")}</select></label>` : ""}
        ${type === "npc" && locations.length ? `<label>Where<select data-bind="cityForm.location" id="ws-city-location"><option value="">Somewhere in town</option>${
          locations.map((location) => `<option value="${esc(location.id)}"${form.location === location.id ? " selected" : ""}>${esc(location.name)}</option>`).join("")}</select></label>` : ""}
        <label class="ws-field--wide">A line about it<input class="ws-input" id="ws-city-note" type="text" data-bind="cityForm.note" value="${esc(form.note)}"></label>
      </div>
      <div class="ws-row"><button class="ws-btn ws-btn--small ws-btn--primary" type="button" data-act="city-add" data-id="${esc(townId)}">Add</button>
        <span class="ws-meta">Hidden from players until you say they know it.</span></div></div></details>`;
  }

  /** Districts, then places, then who is there. Shown on a town's page in place of any map. */
  function cityBlock(townId) {
    if (!ui.city) return `<div id="ws-city"><h3>In this town</h3><p class="ws-meta">Loading…</p></div>`;
    const outline = cityOutline(folded(), townId);
    const visiting = (ui.overview?.travellers || []).filter((who) => who.at === townId && entryById(who.npcId)?.town !== townId);
    const empty = !outline.districts.length && !outline.locations.length && !outline.npcs.length;
    return `<div id="ws-city" data-city="${esc(townId)}">
      <h3>In this town</h3>
      <p class="ws-meta">${empty
        ? "Nothing is recorded here yet. Add a district, a place or a person when you need one; nothing has to be complete."
        : "Districts, places and the people in them. Add to it whenever you need to."}</p>
      ${outline.districts.map((district) => `<details class="ws-city__district" open data-entry="${esc(district.id)}">
        <summary>${esc(district.name)} <span class="ws-meta">district</span> ${knowChip(district)}</summary>
        <div><p class="ws-meta">${entryLink({ id: district.id, name: "Open district" })}${district.note ? ` · ${esc(district.note)}` : ""}</p>
        ${district.locations.length ? `<ul class="ws-plain">${district.locations.map(locationBlock).join("")}</ul>` : ""}
        ${district.npcs.length ? `<p class="ws-meta">In the district, at no particular place</p><ul class="ws-plain ws-city__people">${district.npcs.map(npcItem).join("")}</ul>` : ""}
        ${!district.locations.length && !district.npcs.length ? `<p class="ws-meta">Nothing recorded in this district yet.</p>` : ""}</div></details>`).join("")}
      ${outline.locations.length ? `<div class="ws-city__group"><h4>${outline.districts.length ? "Places in no particular district" : "Places"}</h4><ul class="ws-plain">${outline.locations.map(locationBlock).join("")}</ul></div>` : ""}
      ${outline.npcs.length ? `<div class="ws-city__group"><h4>Somewhere in town</h4><ul class="ws-plain ws-city__people">${outline.npcs.map(npcItem).join("")}</ul></div>` : ""}
      ${visiting.length ? `<div class="ws-city__group"><h4>Passing through</h4><ul class="ws-plain">${visiting.map((who) => {
        const npc = entryById(who.npcId);
        return `<li>${npc ? entryLink(npc) : esc(who.name)} <span class="ws-meta">here until ${esc(formatDayShort(who.leaveDay))}</span></li>`;
      }).join("")}</ul></div>` : ""}
      ${addForm(townId, outline)}
      ${outline.retired.length ? `<details class="ws-setup"><summary>Retired (${outline.retired.length})</summary><div><ul class="ws-plain">${
        outline.retired.map((entry) => `<li>${entryLink(entry)} <span class="ws-meta">${ENTRY_LABEL[entry.type].toLowerCase()}</span></li>`).join("")}</ul></div></details>` : ""}
    </div>`;
  }

  /* ---------------- a location's or person's own page ---------------- */

  function itineraryForm(npc) {
    const travel = travellerOf(npc.id);
    const draft = ui.itinerary?.npcId === npc.id ? ui.itinerary : null;
    const places = towns();
    const options = (selected) => places.map((place) => `<option value="${esc(place.id)}"${place.id === selected ? " selected" : ""}>${esc(place.name)}</option>`).join("");
    let status = `<p class="ws-meta">${esc(npc.name)} is not travelling. They stay in ${esc(placeName(npc.town))} unless you give them an itinerary.</p>`;
    if (travel) {
      status = travel.at
        ? `<p data-travel-status>In <b>${esc(travel.atName)}</b>${travel.done ? ", at the end of their journey." : travel.held ? ", held up: no road onward is open." : ` until ${esc(formatDayShort(travel.leaveDay))}, then on to ${esc(placeName(travel.nextStop))}.`}</p>`
        : `<p data-travel-status>On the road from <b>${esc(travel.fromName)}</b> to <b>${esc(travel.toName)}</b>, arriving ${esc(formatDay(travel.arriveDay))}.</p>`;
      status += `<p class="ws-meta">Itinerary: ${travel.stops.map((stop) => `${esc(stop.name)} (${stop.stay} day${stop.stay === 1 ? "" : "s"})`).join(" → ")}${travel.loop ? " → and round again" : ""}</p>`;
    }
    return `<div id="ws-itinerary"><h3>Travels</h3>${status}
      ${draft ? `<div class="ws-card"><p class="ws-meta">Stops in order, with how many days they stay at each. They move along the roads at travel speed; nothing else happens to them unless you write it.</p>
        ${draft.stops.map((stop, index) => `<div class="ws-row" data-stop="${index}">
          <select data-stop-place="${index}" aria-label="Stop ${index + 1}">${options(stop.place)}</select>
          <label class="ws-meta">stays <input type="number" class="ws-days" min="0" max="2000" step="1" data-stop-stay="${index}" value="${esc(stop.stay)}"> days</label>
          ${draft.stops.length > 2 ? `<button class="ws-btn ws-btn--small ws-btn--quiet" type="button" data-act="itinerary-remove" data-id="${index}">Remove</button>` : ""}</div>`).join("")}
        <div class="ws-row"><button class="ws-btn ws-btn--small" type="button" data-act="itinerary-add-stop">Add a stop</button>
          <label class="ws-meta"><input type="checkbox" id="ws-itinerary-loop"${draft.loop ? " checked" : ""}> Go round again when they reach the end</label></div>
        <div class="ws-row"><button class="ws-btn ws-btn--small ws-btn--primary" type="button" data-act="itinerary-save" data-id="${esc(npc.id)}">Save itinerary</button>
          <button class="ws-btn ws-btn--small" type="button" data-act="itinerary-cancel">Cancel</button></div></div>`
        : `<div class="ws-row"><button class="ws-btn ws-btn--small" type="button" data-act="itinerary-edit" data-id="${esc(npc.id)}">${travel ? "Change itinerary" : "Give them an itinerary"}</button>
          ${travel ? `<button class="ws-btn ws-btn--small" type="button" data-act="itinerary-end" data-id="${esc(npc.id)}">End their travels</button>` : ""}</div>`}
    </div>`;
  }

  function entryPage(id) {
    const entry = entryById(id);
    if (!entry) return "";
    const all = folded();
    const outline = cityOutline(all, entry.town);
    const district = entry.district ? all.byId.get(entry.district) : null;
    const location = entry.location ? all.byId.get(entry.location) : null;
    const events = (ui.events || []).filter((event) => event.place === id && event.status === "written").slice(0, 8);
    const districts = outline.districts;
    const locations = [...outline.locations, ...outline.districts.flatMap((item) => item.locations)].filter((item) => item.id !== id);
    const here = entry.type === "location"
      ? entries().filter((item) => item.type === "npc" && item.location === id && !item.retired)
      : entry.type === "district"
        ? entries().filter((item) => item.type !== "district" && item.district === id && !item.retired)
        : [];
    const where = [
      location ? `at ${entryLink(location)}` : entry.type === "npc" ? "somewhere in town" : "",
      district ? `in ${entryLink(district)}` : "",
      `<button class="ws-link" type="button" data-act="open-place" data-id="${esc(entry.town)}">${esc(placeName(entry.town))}</button>`
    ].filter(Boolean).join(", ");

    return `<div class="ws-panel" id="ws-entry" data-entry-page="${esc(id)}">
      <div><h2>${esc(entry.name)}</h2>
        <p class="ws-meta">${ENTRY_LABEL[entry.type]}${entry.kind ? ` · ${esc(entry.kind)}` : ""} · ${where}${entry.retired ? " · retired" : ""}</p></div>
      <div class="ws-row">
        <button class="ws-btn ws-btn--small" type="button" aria-pressed="${entry.playersKnow === true}" data-act="city-know" data-id="${esc(id)}" data-show="${entry.playersKnow ? "false" : "true"}">${entry.playersKnow ? "Players know this" : "Hidden from players"}</button>
        ${entry.source ? `<span class="ws-meta">From your notes: ${esc(entry.source)}</span>` : ""}</div>
      ${entry.note ? `<p>${esc(entry.note)}</p>` : ""}
      ${here.length ? `<div><h3>${entry.type === "location" ? "Who is here" : "In this district"}</h3><ul class="ws-plain">${here.map((item) => `<li>${entryLink(item)}${item.kind ? ` <span class="ws-meta">${esc(item.kind)}</span>` : ""}</li>`).join("")}</ul></div>` : ""}
      ${entry.type === "npc" && !entry.retired ? itineraryForm(entry) : ""}
      <div><h3>Written ${entry.type === "npc" ? "about them" : "here"}</h3>
        ${events.length ? `<ul class="ws-plain">${events.map((event) => `<li><span class="ws-meta">${esc(formatDayShort(event.day))}</span> ${linked(event.text)}</li>`).join("")}</ul>`
          : `<p class="ws-meta">Nothing written yet.</p>`}</div>
      <div class="ws-row"><button class="ws-btn ws-btn--small" type="button" data-act="jot-here" data-id="${esc(id)}">Jot something ${entry.type === "npc" ? "about them" : "here"}</button></div>
      <details class="ws-setup" id="ws-entry-edit"><summary>Rename, move or retire</summary><div>
        <div class="ws-fields">
          <label class="ws-field--wide">Name<input class="ws-input" id="ws-entry-name" type="text" value="${esc(entry.name)}"></label>
          ${entry.type === "district" ? "" : `<label>${entry.type === "npc" ? "What they do" : "Kind"}<input class="ws-input" id="ws-entry-kind" type="text" value="${esc(entry.kind || "")}"></label>`}
          <label>Town<select id="ws-entry-town">${towns().map((place) => `<option value="${esc(place.id)}"${place.id === entry.town ? " selected" : ""}>${esc(place.name)}</option>`).join("")}</select></label>
          ${entry.type === "district" ? "" : `<label>District<select id="ws-entry-district"><option value="">No particular district</option>${
            districts.map((item) => `<option value="${esc(item.id)}"${item.id === entry.district ? " selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label>`}
          ${entry.type === "npc" ? `<label>Where<select id="ws-entry-location"><option value="">Somewhere in town</option>${
            locations.map((item) => `<option value="${esc(item.id)}"${item.id === entry.location ? " selected" : ""}>${esc(item.name)}</option>`).join("")}</select></label>` : ""}
          <label class="ws-field--wide">A line about it<input class="ws-input" id="ws-entry-note" type="text" value="${esc(entry.note || "")}"></label>
        </div>
        <div class="ws-row"><button class="ws-btn ws-btn--small ws-btn--primary" type="button" data-act="city-save" data-id="${esc(id)}">Save</button>
          ${entry.retired
            ? `<button class="ws-btn ws-btn--small" type="button" data-act="city-restore" data-id="${esc(id)}">Bring back</button>`
            : `<button class="ws-btn ws-btn--small" type="button" data-act="city-retire" data-id="${esc(id)}">Retire</button>`}
          <span class="ws-meta">Retiring keeps it in the record; nothing is deleted.</span></div></div></details>
      <p class="ws-meta${ui.error ? " ws-error" : ""}" role="status">${esc(ui.error || ui.message)}</p>
    </div>`;
  }

  /* ---------------- Rumours ---------------- */

  function rumourCard(rumour) {
    const chip = rumour.truth === "written"
      ? `<span class="ws-chip ws-chip--written">True, written</span>`
      : `<span class="ws-chip ws-chip--estimate">Truth not written</span>`;
    const written = (ui.events || []).filter((event) => event.status === "written").slice(0, 40);
    return `<div class="ws-card" data-rumour="${esc(rumour.id)}">
      <div class="ws-row">${chip}${rumour.ended ? `<span class="ws-chip ws-chip--plain">No longer spreading</span>` : ""}
        <span class="ws-meta">Started in ${linked(rumour.originName)} on ${esc(formatDayShort(rumour.startDay))}</span></div>
      <p class="ws-text" data-rumour-truth>${linked(rumour.trueText)}</p>
      <p class="ws-meta">${rumour.truth === "written" ? "That is what happened." : "That is what was first said. Whether it is true is yours to write."}</p>
      <div class="ws-tablewrap"><table class="ws-table">
        <thead><tr><th>Town</th><th>Heard</th><th>What they are saying</th><th>Bent on the way</th><th>Players</th></tr></thead>
        <tbody>${rumour.heard.map((heard) => `<tr data-heard="${esc(heard.place)}">
          <td>${linked(heard.name)}</td>
          <td style="white-space:nowrap">${esc(formatDayShort(heard.day))}</td>
          <td class="ws-what${heard.differs ? " ws-bent" : ""}">${linked(heard.text)}</td>
          <td class="ws-meta">${heard.bent ? `${esc(ATTRIBUTE_LABEL[heard.bent.attribute] || heard.bent.attribute)}, coming from ${esc(heard.fromName || "")}` : heard.differs ? "earlier on the road" : "told straight"}</td>
          <td><button class="ws-btn ws-btn--small" type="button" aria-pressed="${heard.playersVisible}" data-act="rumour-reveal" data-id="${esc(rumour.id)}" data-place="${esc(heard.place)}" data-show="${heard.playersVisible ? "false" : "true"}">${heard.playersVisible ? "Players have heard it" : "Not heard"}</button></td>
        </tr>`).join("")}</tbody></table></div>
      ${rumour.next.length ? `<p class="ws-meta"><b>Next:</b> ${rumour.next.map((next) => `${esc(next.name)} ${next.blocked ? "(road closed)" : `around ${esc(formatDayShort(next.day))}`}`).join(", ")}</p>` : ""}
      <div class="ws-row">
        <button class="ws-btn ws-btn--small" type="button" data-act="rumour-map" data-id="${esc(rumour.id)}">Show on map</button>
        ${rumour.ended ? "" : `<button class="ws-btn ws-btn--small" type="button" data-act="rumour-end" data-id="${esc(rumour.id)}">Stop it spreading</button>`}
        ${rumour.truth === "written" || !written.length ? "" : `<select id="ws-confirm-${esc(rumour.id)}" aria-label="The written event that makes it true">${
          written.map((event) => `<option value="${esc(event.id)}">${esc(formatDayShort(event.day))}: ${esc(event.text.slice(0, 60))}</option>`).join("")}</select>
          <button class="ws-btn ws-btn--small" type="button" data-act="rumour-confirm" data-id="${esc(rumour.id)}">Mark as true</button>`}
      </div></div>`;
  }

  function rumoursView() {
    const rumours = ui.overview?.rumours;
    const form = ui.rumourForm;
    const places = towns();
    const written = (ui.events || []).filter((event) => event.status === "written").slice(0, 40);
    return `<section id="ws-rumours">
      <h2>Rumours</h2>
      <p class="ws-lede">Talk travels along the roads at the speed of travellers, and may bend a little at each town. The truth is always shown beside what each town is saying. Players hear nothing until you say the party has heard it in a town.</p>
      ${rumours == null ? `<p class="ws-meta">Loading…</p>` : rumours.map(rumourCard).join("") || `<p class="ws-meta">No rumours yet. The simulation never starts one; you do, below.</p>`}
    </section>
    <section class="ws-card" id="ws-new-rumour">
      <h2>Start a rumour</h2>
      <div class="ws-fields">
        <label class="ws-field--wide">About<select id="ws-rumour-event" data-bind="rumourForm.eventId" data-rerender="true">
          <option value="">Talk whose truth is not written</option>
          ${written.map((event) => `<option value="${esc(event.id)}"${form.eventId === event.id ? " selected" : ""}>${esc(formatDayShort(event.day))}: ${esc(event.text.slice(0, 70))}</option>`).join("")}</select></label>
        ${form.eventId ? `<label class="ws-meta"><input type="checkbox" id="ws-rumour-true"${form.isTrue ? " checked" : ""} data-check="rumourForm.isTrue"> What it says is what happened</label>` : ""}
        <label>Starts in<select id="ws-rumour-origin" data-bind="rumourForm.origin"><option value="">${form.eventId ? "Where the event happened" : "Choose a place"}</option>${
          places.map((place) => `<option value="${esc(place.id)}"${form.origin === place.id ? " selected" : ""}>${esc(place.name)}</option>`).join("")}</select></label>
        <label>Who<input class="ws-input" id="ws-rumour-who" type="text" data-bind="rumourForm.who" value="${esc(form.who)}" placeholder="a band of strangers"></label>
        <label class="ws-field--wide">Did what<input class="ws-input" id="ws-rumour-what" type="text" data-bind="rumourForm.what" value="${esc(form.what)}" placeholder="held the gate against the rats"></label>
        <label>Where it is said to have happened<select id="ws-rumour-where" data-bind="rumourForm.where"><option value="">Where it starts</option>${
          places.map((place) => `<option value="${esc(place.id)}"${form.where === place.id ? " selected" : ""}>${esc(place.name)}</option>`).join("")}</select></label>
        <label>How big<select id="ws-rumour-size" data-bind="rumourForm.size">${SIZE_LABELS.map(([value, label]) => `<option value="${value}"${String(form.size) === String(value) ? " selected" : ""}>${label}</option>`).join("")}</select></label>
        <label>Tone<select id="ws-rumour-tone" data-bind="rumourForm.tone">
          <option value=""${form.tone === "" ? " selected" : ""}>Neither</option>
          <option value="true"${form.tone === "true" ? " selected" : ""}>Speaks well of them</option>
          <option value="false"${form.tone === "false" ? " selected" : ""}>Blames them</option></select></label>
      </div>
      <div class="ws-row"><button class="ws-btn ws-btn--primary" type="button" data-act="rumour-start">Start the rumour</button>
        <span class="ws-meta${ui.error ? " ws-error" : ""}" role="status">${esc(ui.error || ui.message)}</span></div>
    </section>`;
  }

  /* ---------------- search ---------------- */

  function searchResults() {
    const query = ui.search.trim().toLowerCase();
    if (query.length < 2) return "";
    const hit = (value) => String(value || "").toLowerCase().includes(query);
    const items = [];
    for (const place of towns()) {
      if (hit(place.name) || hit(place.kind)) items.push({ label: place.name, kind: place.kind || "Place", act: "open-place", id: place.id });
    }
    for (const entry of entries()) {
      if (hit(entry.name) || hit(entry.kind) || hit(entry.note)) {
        items.push({ label: entry.name, kind: `${ENTRY_LABEL[entry.type]}${entry.kind ? `, ${entry.kind}` : ""} · ${placeName(entry.town)}${entry.retired ? " · retired" : ""}`, act: "open-entry", id: entry.id });
      }
    }
    for (const good of ui.markets?.goods || []) {
      if (hit(good.name)) items.push({ label: good.name, kind: "Good", act: "open-good", id: good.id });
    }
    for (const rumour of ui.overview?.rumours || []) {
      if (hit(rumour.trueText)) items.push({ label: rumour.trueText, kind: "Rumour", act: "open-rumours", id: rumour.id });
    }
    for (const countdown of ui.world?.countdowns || []) {
      if (hit(countdown.label)) items.push({ label: countdown.label, kind: "Countdown", act: "open-countdowns", id: countdown.id });
    }
    if (!items.length) return `<p class="ws-meta">Nothing matches "${esc(ui.search.trim())}".</p>`;
    return `<ul class="ws-plain">${items.slice(0, 40).map((item) => `<li><button class="ws-link" type="button" data-act="${item.act}" data-id="${esc(item.id)}" data-search-hit>${esc(item.label)}</button> <span class="ws-meta">${esc(item.kind)}</span></li>`).join("")}</ul>
      ${items.length > 40 ? `<p class="ws-meta">${items.length - 40} more. Type more to narrow it.</p>` : ""}`;
  }

  /* ---------------- extra things a jot can do ---------------- */

  const EXTRA_EFFECT_KINDS = [
    ["people", "People leave here for somewhere else"],
    ["sick", "A sickness is real here"],
    ["well", "The sickness here is over"]
  ];

  function buildExtraEffect(model, placeId) {
    const place = towns().find((entry) => entry.id === placeId);
    if (!place) throw Object.assign(new Error("Choose a town first: this changes a town's numbers."), { status: 400 });
    if (model.kind === "people") {
      const people = Number(model.people);
      if (!Number.isInteger(people) || people < 1) throw Object.assign(new Error("Say how many people leave."), { status: 400 });
      if (!model.to) throw Object.assign(new Error("Say where they go."), { status: 400 });
      const days = String(model.days ?? "").trim() === "" ? 1 : Number(model.days);
      return { type: "people-move", from: placeId, to: model.to, people, days };
    }
    if (model.kind === "sick") {
      return { type: "sickness-start", place: placeId, name: String(model.name || "").trim() || "sickness" };
    }
    return { type: "sickness-end", place: placeId };
  }

  function describeExtraEffect(effect) {
    if (effect.type === "people-move") {
      return `${Number(effect.people).toLocaleString("en-GB")} people leave ${placeName(effect.from)} for ${placeName(effect.to)} over ${effect.days} day${effect.days === 1 ? "" : "s"}. Each town then uses more or less in proportion.`;
    }
    if (effect.type === "sickness-start") {
      return `The ${effect.name || "sickness"} is real in ${placeName(effect.place)}. The number of sick is followed from tomorrow; it can reach another town only if you accept that when it is suggested.`;
    }
    if (effect.type === "sickness-end") {
      return `The sickness in ${placeName(effect.place)} is over.`;
    }
    return "";
  }

  function extraEffectFields(model, placeId, bind) {
    const others = towns().filter((place) => place.id !== placeId);
    if (model.kind === "people") {
      return `<label>How many people<input type="number" min="1" step="1" data-bind="${bind}.people" data-rerender="true" data-effect-people value="${esc(model.people ?? "")}"></label>
        <label>Going to<select data-bind="${bind}.to" data-rerender="true" data-effect-to><option value="">Choose a place</option>${
          others.map((place) => `<option value="${esc(place.id)}"${model.to === place.id ? " selected" : ""}>${esc(place.name)}</option>`).join("")}</select></label>
        <label>Leaving over how many days<input type="number" min="1" max="2000" step="1" data-bind="${bind}.days" data-rerender="true" data-effect-days value="${esc(model.days ?? "")}" placeholder="1"></label>`;
    }
    if (model.kind === "sick") {
      return `<label>What it is called<input class="ws-input" type="text" data-bind="${bind}.name" data-rerender="true" data-effect-name value="${esc(model.name ?? "")}" placeholder="marsh fever"></label>`;
    }
    return "";
  }

  /* ---------------- actions ---------------- */

  function readItinerary() {
    if (!ui.itinerary) return;
    ui.itinerary.stops = ui.itinerary.stops.map((stop, index) => ({
      place: $(`[data-stop-place="${index}"]`)?.value ?? stop.place,
      stay: Number($(`[data-stop-stay="${index}"]`)?.value ?? stop.stay)
    }));
    const loop = $("#ws-itinerary-loop");
    if (loop) ui.itinerary.loop = loop.checked;
  }

  function goTo(tab) {
    ui.tab = tab;
    ui.error = "";
    ui.message = "";
    try { if (window.location.hash !== `#${tab}`) window.location.hash = tab; } catch (_error) { /* not needed */ }
  }

  function clearSearch() {
    ui.search = "";
    const box = $("#ws-search");
    if (box) box.value = "";
    const results = $("#ws-search-results");
    if (results) {
      results.innerHTML = "";
      results.hidden = true;
    }
  }

  const needRecord = () => (ui.events == null && ui.world?.initialized
    ? run(async () => { ui.events = (await ui.api.listWorldEvents({ status: "all" })).events || []; })
    : (render(), undefined));

  const actions = {
    "open-entry"(data) {
      keepTyping();
      clearSearch();
      ui.entry = data.id;
      ui.place = null;
      ui.itinerary = null;
      goTo("places");
      // The page it opens may be far up the screen from the link that was tapped.
      const shown = needRecord();
      Promise.resolve(shown).then(() => $("#ws-entry")?.scrollIntoView?.({ block: "start" }));
      return shown;
    },
    "open-good"(data) {
      clearSearch();
      ui.good = data.id;
      goTo("markets");
      render();
    },
    "open-rumours"() {
      clearSearch();
      goTo("rumours");
      return needRecord();
    },
    "open-countdowns"() {
      clearSearch();
      goTo("countdowns");
      render();
    },
    "city-add": (data) => run(async () => {
      const form = ui.cityForm;
      const name = ($("#ws-city-name")?.value ?? form.name).trim();
      if (!name) throw Object.assign(new Error("It needs a name."), { status: 400 });
      const result = await ui.api.addWorldCityEntry({
        type: form.type,
        town: data.id,
        name,
        kind: form.type === "district" ? null : ($("#ws-city-kind")?.value ?? form.kind),
        note: $("#ws-city-note")?.value ?? form.note,
        district: form.type === "district" ? null : form.district || null,
        location: form.type === "npc" ? form.location || null : null
      });
      ui.city = { ...ui.city, entries: result.entries, travellers: result.travellers };
      ui.cityForm = { ...form, name: "", kind: "", note: "", district: "", location: "", open: true };
    }, { message: "Added." }),
    "city-save": (data) => run(async () => {
      const entry = entryById(data.id);
      const changes = {};
      const name = $("#ws-entry-name")?.value.trim();
      if (name && name !== entry.name) changes.name = name;
      const kind = $("#ws-entry-kind");
      if (kind && kind.value.trim() !== (entry.kind || "")) changes.kind = kind.value.trim();
      const note = $("#ws-entry-note");
      if (note && note.value.trim() !== (entry.note || "")) changes.note = note.value.trim();
      const town = $("#ws-entry-town")?.value;
      if (town && town !== entry.town) changes.town = town;
      const district = $("#ws-entry-district");
      if (district && !changes.town && district.value !== (entry.district || "")) changes.district = district.value || null;
      const location = $("#ws-entry-location");
      if (location && !changes.town && location.value !== (entry.location || "")) {
        changes.location = location.value || null;
        // Moving to a location takes that location's district; leaving one keeps the district chosen.
        if (location.value && changes.district === undefined) changes.district = null;
      }
      if (!Object.keys(changes).length) throw Object.assign(new Error("Nothing was changed."), { status: 400 });
      ui.city = await ui.api.changeWorldCityEntry(data.id, { action: "change", changes });
    }, { message: "Saved." }),
    "city-know": (data) => run(async () => {
      ui.city = await ui.api.changeWorldCityEntry(data.id, { action: "change", changes: { playersKnow: data.show === "true" } });
    }),
    "city-retire": (data) => run(async () => {
      ui.city = await ui.api.changeWorldCityEntry(data.id, { action: "retire" });
    }, { message: "Retired. It is still in the record and can be brought back." }),
    "city-restore": (data) => run(async () => {
      ui.city = await ui.api.changeWorldCityEntry(data.id, { action: "restore" });
    }, { message: "Brought back." }),
    "city-import": () => run(async () => {
      const file = $("#ws-city-file")?.files?.[0];
      if (!file) throw Object.assign(new Error("Choose the city file first."), { status: 400 });
      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch (_error) {
        throw Object.assign(new Error("That file is not valid JSON."), { status: 400 });
      }
      const result = await ui.api.importWorldCity(parsed.entries);
      ui.city = { ...ui.city, entries: result.entries, travellers: result.travellers };
      return `${result.added} added, ${result.skipped} already there.`;
    }),
    "itinerary-edit"(data) {
      const npc = entryById(data.id);
      const travel = travellerOf(data.id);
      const places = towns();
      const second = places.find((place) => place.id !== npc.town)?.id || npc.town;
      ui.itinerary = {
        npcId: data.id,
        loop: travel?.loop ?? false,
        stops: travel ? travel.stops.map((stop) => ({ place: stop.place, stay: stop.stay })) : [{ place: npc.town, stay: 1 }, { place: second, stay: 1 }]
      };
      render();
    },
    "itinerary-add-stop"() {
      readItinerary();
      const places = towns();
      const last = ui.itinerary.stops[ui.itinerary.stops.length - 1]?.place;
      ui.itinerary.stops.push({ place: places.find((place) => place.id !== last)?.id || last, stay: 1 });
      render();
    },
    "itinerary-remove"(data) {
      readItinerary();
      ui.itinerary.stops.splice(Number(data.id), 1);
      render();
    },
    "itinerary-cancel"() {
      ui.itinerary = null;
      render();
    },
    "itinerary-save": (data) => run(async () => {
      readItinerary();
      ui.city = await ui.api.setWorldItinerary({ npcId: data.id, stops: ui.itinerary.stops, loop: ui.itinerary.loop });
      ui.itinerary = null;
      ui.overviewStale = true;
    }, { message: "Itinerary saved. They set out when their stay is up." }),
    "itinerary-end": (data) => run(async () => {
      ui.city = await ui.api.endWorldItinerary(data.id);
      ui.overviewStale = true;
    }, { message: "Their travels are over." }),
    "rumour-start": () => run(async () => {
      const form = ui.rumourForm;
      const what = ($("#ws-rumour-what")?.value ?? form.what).trim();
      const who = ($("#ws-rumour-who")?.value ?? form.who).trim();
      if (!what) throw Object.assign(new Error("Say what the rumour says happened."), { status: 400 });
      const isTrue = Boolean(form.eventId) && ($("#ws-rumour-true")?.checked ?? form.isTrue);
      const result = await ui.api.startWorldRumour({
        eventId: form.eventId || null,
        truth: isTrue ? "written" : "unwritten",
        origin: form.origin || null,
        who,
        what,
        where: form.where || null,
        size: Number(form.size) || 2,
        flatters: form.tone === "" ? null : form.tone === "true"
      });
      ui.overview = { ...ui.overview, rumours: result.rumours };
      ui.rumourForm = { ...form, who: "", what: "", where: "", eventId: "" };
    }, { message: "The rumour has started. It spreads as the days go by." }),
    "rumour-reveal": (data) => run(async () => {
      const result = await ui.api.changeWorldRumour(data.id, { action: "reveal", place: data.place, playersVisible: data.show === "true" });
      ui.overview = { ...ui.overview, rumours: result.rumours };
    }),
    "rumour-end": (data) => run(async () => {
      const result = await ui.api.changeWorldRumour(data.id, { action: "end" });
      ui.overview = { ...ui.overview, rumours: result.rumours };
    }, { message: "It spreads no further. What towns already say stays said." }),
    "rumour-confirm": (data) => run(async () => {
      const eventId = $(`#ws-confirm-${CSS.escape(data.id)}`)?.value;
      const result = await ui.api.changeWorldRumour(data.id, { action: "confirm", eventId });
      ui.overview = { ...ui.overview, rumours: result.rumours };
    }, { message: "Marked as true." }),
    "rumour-map"(data) {
      ui.map.rumour = data.id;
      ui.map.sel = null;
      goTo("map");
      render();
    }
  };

  function onInput(event) {
    if (event.target?.id !== "ws-search") return false;
    ui.search = event.target.value;
    const results = $("#ws-search-results");
    if (results) {
      const html = searchResults();
      results.innerHTML = html;
      results.hidden = !html;
    }
    return true;
  }

  function onChange(event) {
    const check = event.target?.dataset?.check;
    if (!check) return false;
    const path = check.split(".");
    const field = path.pop();
    path.reduce((holder, key) => holder[key], ui)[field] = event.target.checked;
    return true;
  }

  return {
    EXTRA_EFFECT_KINDS, actions, buildExtraEffect, cityBlock, describeExtraEffect, entryById, entryName,
    entryOptions, entryPage, extraEffectFields, linked, loadStage3, onChange, onInput, rumoursView, searchResults
  };
}
