// Living world: the DM's page (the ledger; from Stage 2 markets and places; from
// Stage 3 the map, rumours, people, travellers, sickness and the city outlines).
//
// This file holds no world data. Everything it shows is fetched with the DM key,
// which is kept only in this browser. The same engine files the Azure Function
// runs are imported here for dates and names of things.

import { EldoriaApiClient } from "../../api/apiClient/index.js";
import {
  COUNTDOWN_MODE, COUNTDOWN_SIZES, DAYS_PER_MONTH, MONTHS, formatDay, formatDayShort, fromDay, parseDay
} from "../../world-sim/engine/index.js";
import { createEconomyViews } from "./world-sim-economy.js";
import { createStage3Views } from "./world-sim-stage3.js";
import { createMapView } from "./world-sim-map.js";

const KEY_STORAGE = "eldoria:dm-key";
const TABS = [["today", "Today"], ["map", "Map"], ["places", "Places"], ["markets", "Markets"], ["rumours", "Rumours"], ["countdowns", "Countdowns"], ["record", "Record"]];
const noEffect = () => ({ kind: "note", good: "", road: "", days: "", to: "", people: "", name: "" });
const RECORD_FILTERS = [["all", "All"], ["written", "Written"], ["suggested", "Suggested"], ["rejected", "Rejected"]];

const ui = {
  api: null,
  unlocked: false,
  lockMessage: "",
  world: null,
  places: [],
  placesLoaded: false,
  events: null,
  tab: "today",
  recordFilter: "all",
  editId: null,
  message: "",
  error: "",
  lastAdvance: null,
  busy: false,
  jot: { text: "", place: "", when: "", effect: noEffect() },
  form: { label: "", mode: COUNTDOWN_MODE.CHANCE, size: 4, chanceInTen: 3, date: "", place: "", route: "", suggestionText: "", effect: noEffect() },
  // Stage 2: markets and places.
  setup: null,
  markets: null,
  marketsStale: false,
  good: "",
  place: null,
  placeQuery: "",
  whatIf: { days: 30, result: null }
};

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/gu, (character) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]
));

function apiBase() {
  return window.ELDORIA_API_BASE_URL || window.ELDORIA_SITE_CONFIG?.cloudApiBase || "/api";
}

function readStoredKey() {
  try {
    return window.localStorage.getItem(KEY_STORAGE) || "";
  } catch (_error) {
    return "";
  }
}

function storeKey(key) {
  try {
    if (key) window.localStorage.setItem(KEY_STORAGE, key);
    else window.localStorage.removeItem(KEY_STORAGE);
  } catch (_error) {
    // Storage can be unavailable; the key then lasts only for this visit.
  }
}

function describeError(error) {
  if (error?.status === 401) return "The DM key is not correct.";
  if (error?.status === 403) return "The server has no DM key set yet. Set ELDORIA_DM_KEY when deploying the API.";
  if (error?.status === 404) return error.message || "The world routes were not found. The API may need deploying.";
  if (error?.status >= 400 && error?.status < 500) return error.message || "That did not work.";
  return "Could not reach the server. Nothing was changed.";
}

/** "Fall 15, 496" or just "Fall 15" (this year). Null if it does not read as a date. */
function readDate(text) {
  const value = String(text || "").trim();
  if (!value) return null;
  const year = ui.world?.year ?? fromDay(ui.world?.day ?? 0).year;
  return parseDay(value) ?? parseDay(`${value}, ${year}`);
}

function placeName(id) {
  if (!id) return "";
  return ui.places.find((place) => place.id === id)?.name || stage3.entryName(id) || id;
}

function placeOptions(selected) {
  const options = [`<option value=""${selected ? "" : " selected"}>No particular place</option>`];
  for (const place of ui.places) {
    options.push(`<option value="${esc(place.id)}"${place.id === selected ? " selected" : ""}>${esc(place.name)}</option>`);
  }
  // Locations and people added to a town since the setup file was made.
  return options.join("") + stage3.entryOptions(selected);
}

const shared = {
  ui,
  esc,
  $,
  placeName,
  keepTyping: () => keepTyping(),
  run: (action, options) => run(action, options),
  render: () => render()
};

const stage3 = createStage3Views(shared);
const economy = createEconomyViews({ ...shared, hooks: stage3 });
const map = createMapView({
  ...shared,
  placePage: (id) => economy.placePage(id),
  regionsUrl: new URL("../../world-sim/regions.draft.json", import.meta.url).href
});

/* ---------------- loading ---------------- */

async function loadPlaces() {
  try {
    const stored = await ui.api.getWorldPlaces();
    if (Array.isArray(stored?.places) && stored.places.length) {
      ui.places = stored.places;
      ui.setup = stored;
      ui.placesLoaded = true;
      return;
    }
  } catch (error) {
    console.warn("Places could not be loaded:", error);
  }
  // No DM list yet: offer what the site already shows players.
  ui.placesLoaded = false;
  try {
    const index = await ui.api.request("public-index/locations");
    const places = [];
    for (const [region, entry] of Object.entries(index || {})) {
      for (const [name, location] of Object.entries(entry?.locations || {})) {
        const id = name.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
        places.push({ id, name, region });
        for (const sub of location?.subLocations || []) {
          const subId = String(sub.name).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
          places.push({ id: `${id}--${subId}`, name: `${sub.name} (${name})`, region });
        }
      }
    }
    ui.places = places;
  } catch (_error) {
    ui.places = [];
  }
}

async function loadWorld() {
  ui.world = await ui.api.getWorld();
  ui.events = null;
}

async function loadRecord() {
  const result = await ui.api.listWorldEvents({ status: "all" });
  ui.events = result.events || [];
}

async function unlock(key) {
  ui.api.setDmKey(key);
  try {
    await ui.api.checkDmKey();
  } catch (error) {
    ui.api.setDmKey("");
    ui.unlocked = false;
    ui.lockMessage = describeError(error);
    if (error?.status === 401 || error?.status === 403) storeKey("");
    render();
    return false;
  }
  storeKey(key);
  ui.unlocked = true;
  ui.lockMessage = "";
  try {
    await Promise.all([loadWorld(), loadPlaces()]);
    await economy.loadMarkets();
    await stage3.loadStage3();
  } catch (error) {
    ui.error = describeError(error);
  }
  render();
  return true;
}

/* ---------------- views ---------------- */

function lockView() {
  return `<section class="ws-card ws-card--lock">
    <h2>DM key needed</h2>
    <p class="ws-lede">This page shows the living world, including things your players have not found. Enter the DM key once; it is kept in this browser only.</p>
    <form id="ws-lock-form" class="ws-row">
      <label class="ws-field--wide"><span class="ws-meta">DM key</span><br>
        <input class="ws-input" id="ws-key" type="password" autocomplete="off" required></label>
      <button class="ws-btn ws-btn--primary" type="submit">Unlock</button>
    </form>
    <p class="ws-meta ws-error" id="ws-lock-message" role="alert">${esc(ui.lockMessage)}</p>
  </section>`;
}

function startView() {
  const world = ui.world || {};
  return `<section class="ws-card">
    <h2>Start the world</h2>
    <p class="ws-lede">Nothing has been saved yet. Starting sets the first day and saves an empty world: no events and no countdowns. You write everything from there.</p>
    <div class="ws-fields">
      <label>First day<input class="ws-input" id="ws-start-date" type="text" value="${esc(world.suggestedStartDateText || "Fall 7, 496")}"></label>
    </div>
    <div class="ws-row"><button class="ws-btn ws-btn--primary" type="button" data-act="start">Start the world</button>
      <span class="ws-meta ws-error" role="alert">${esc(ui.error)}</span></div>
  </section>`;
}

function suggestionCard(event) {
  const editing = ui.editId === event.id;
  return `<div class="ws-card ws-card--sugg" data-event="${esc(event.id)}">
    <div class="ws-row"><span class="ws-chip ws-chip--suggested">Suggested</span>
      <span class="ws-meta">${esc(formatDayShort(event.day))}${event.place ? ` · ${stage3.linked(placeName(event.place))}` : ""}</span></div>
    <p class="ws-text">${editing
      ? `<input class="ws-input" style="width:100%" id="ws-edit-${esc(event.id)}" type="text" value="${esc(event.text)}" aria-label="Reword this event">`
      : stage3.linked(event.text)}</p>
    ${event.why ? `<p class="ws-meta"><b>Why:</b> ${stage3.linked(event.why)}</p>` : ""}
    <p class="ws-meta" data-if-accept><b>If you accept:</b> ${esc(economy.describeEffect(event.effect))} Reject it and it never happened.</p>
    <div class="ws-row">${editing
      ? `<button class="ws-btn ws-btn--primary ws-btn--small" type="button" data-act="save-reword" data-id="${esc(event.id)}">Save and accept</button>
         <button class="ws-btn ws-btn--small" type="button" data-act="cancel-reword">Cancel</button>`
      : `<button class="ws-btn ws-btn--primary ws-btn--small" type="button" data-act="accept" data-id="${esc(event.id)}">Accept</button>
         <button class="ws-btn ws-btn--small" type="button" data-act="reword" data-id="${esc(event.id)}">Reword</button>
         <button class="ws-btn ws-btn--small" type="button" data-act="reject" data-id="${esc(event.id)}">Reject</button>`}</div>
  </div>`;
}

// Exactly what the two open routes answer right now: what a player's page would show.
function playersPreview() {
  const seen = ui.players;
  const town = seen?.prices?.place?.name || seen?.rumours?.place?.name || "";
  const prices = town ? (seen?.prices?.prices || []) : [];
  const rumours = town ? (seen?.rumours?.rumours || []) : [];
  const body = !seen
    ? `<p class="ws-meta">Not checked yet.</p>`
    : !town || (!prices.length && !rumours.length)
      ? `<p id="ws-players-empty">Players see only: <q>No news from town yet.</q></p>
         <p class="ws-meta">That is what they get until the world is started, the party is set in a town they know, and that town has prices or a rumour you have let them hear.</p>`
      : `<p id="ws-players-town">Players see <b>Word in ${esc(town)}</b>.</p>
         <div class="ws-tablewrap"><table class="ws-table" id="ws-players-prices">
           <thead><tr><th>Good</th><th class="ws-num">Price</th><th class="ws-num">Against usual</th><th>Items that follow it</th></tr></thead>
           <tbody>${prices.map((entry) => `<tr><td>${esc(entry.good)} <span class="ws-meta">per ${esc(entry.unit)}</span></td>
             <td class="ws-num">${esc(entry.priceText)}</td>
             <td class="ws-num">${entry.vsUsualPercent === 0 ? "usual" : `<span class="${entry.vsUsualPercent > 0 ? "ws-up" : "ws-down"}">${entry.vsUsualPercent > 0 ? "+" : "-"}${Math.abs(entry.vsUsualPercent)}%</span>`}</td>
             <td class="ws-meta">${esc([...(entry.covers?.types || []), ...((entry.covers?.itemIds || []).length ? [`${entry.covers.itemIds.length} by id`] : [])].join(", ") || "none")}</td></tr>`).join("")
             || `<tr><td colspan="4" class="ws-meta">No prices.</td></tr>`}</tbody></table></div>
         <h3>Rumours they have heard here</h3>
         ${rumours.length ? `<ul class="ws-plain" id="ws-players-rumours">${rumours.map((entry) => `<li><q>${esc(entry.text)}</q></li>`).join("")}</ul>`
           : `<p class="ws-meta" id="ws-players-norumours">None. Reveal one from the Rumours tab when the party hears it.</p>`}`;
  return `<section class="ws-card" id="ws-players">
    <h2>What players see</h2>
    <p class="ws-lede">The answer of the two open routes right now, nothing more. Check it before a session.</p>
    ${body}
    <div class="ws-row">
      <button class="ws-btn ws-btn--small" type="button" data-act="players-preview">${seen ? "Check again" : "Check now"}</button>
      <a class="ws-btn ws-btn--small" href="#rumours">Reveal or hide rumours</a>
      <a class="ws-btn ws-btn--small" href="../town/index.html">Open the players' page</a>
    </div>
  </section>`;
}

function todayView() {
  const world = ui.world;
  const moved = ui.lastAdvance?.report ?? world.report ?? [];
  const many = ui.lastAdvance && ui.lastAdvance.days > 1;
  return `<section class="ws-card" id="ws-jot">
    <h2>Jot something down</h2>
    <textarea id="ws-jot-text" placeholder="What happened?" aria-label="What happened">${esc(ui.jot.text)}</textarea>
    <div class="ws-fields">
      <label>Where<select id="ws-jot-place" data-bind="jot.place" data-rerender="true">${placeOptions(ui.jot.place)}</select></label>
      <label>When<input class="ws-input" id="ws-jot-when" type="text" data-bind="jot.when" value="${esc(ui.jot.when)}" placeholder="${esc(formatDay(world.day))} (today)"></label>
      ${economy.effectFields(ui.jot.effect, ui.jot.place, "jot.effect")}
    </div>
    <div class="ws-row"><button class="ws-btn ws-btn--primary" type="button" data-act="jot">Write it down</button>
      <span class="ws-meta${ui.error ? " ws-error" : ""}" id="ws-message" role="status">${esc(ui.error || ui.message || "Anything you write here is canon as soon as you save it. Players do not see it unless you show it to them.")}</span></div>
  </section>
  <section id="ws-pending">
    <h2>Waiting for your call <span class="ws-meta">(${world.pending.length})</span></h2>
    <p class="ws-lede">The simulation thinks these could happen. They are not true until you accept them.</p>
    ${world.pending.map(suggestionCard).join("") || `<p class="ws-meta">Nothing is waiting. Advance a day to see what the world proposes next.</p>`}
  </section>
  <section id="ws-moved">
    <h2>What moved ${many ? `since ${esc(formatDayShort(ui.lastAdvance.fromDay))}` : "overnight"}</h2>
    <p class="ws-lede">Running numbers that follow from what is written. They are not events.</p>
    <ul class="ws-moves">${moved.map((line) => `<li><span class="ws-kind">${many ? `${esc(formatDayShort(line.day))} ` : ""}${esc(line.kind || "")}</span><span>${stage3.linked(line.text)}</span></li>`).join("")
      || `<li><span class="ws-meta">Nothing moved enough to mention.</span></li>`}</ul>
  </section>
  <section id="ws-written">
    <h2>Written on ${esc(formatDayShort(world.day))}</h2>
    ${world.writtenToday.map((event) => `<div class="ws-card"><p class="ws-text">${stage3.linked(event.text)}</p>
      <p class="ws-meta">${event.place ? `${stage3.linked(placeName(event.place))} · ` : ""}${event.source === "dm" ? "written by you" : "suggested by the simulation, accepted by you"}${event.day !== world.day ? ` · dated ${esc(formatDayShort(event.day))}` : ""}</p></div>`).join("")
      || `<p class="ws-meta">Nothing written yet today.</p>`}
  </section>
  ${playersPreview()}
  <details class="ws-setup" id="ws-setup">
    <summary>Setup</summary>
    <div>
      <p>${ui.placesLoaded
        ? `${ui.places.length} places loaded from your DM list${world.marketsConfigured ? ", with markets set up" : ", no markets yet"}.`
        : "No DM place list is loaded, so the Where box offers only places your players already know."}
        Load the setup file made from your notes (places, goods, roads, and a first guess at what each town makes and uses):</p>
      <div class="ws-row"><input id="ws-places-file" type="file" accept="application/json,.json" aria-label="Places file">
        <button class="ws-btn ws-btn--small" type="button" data-act="load-places">Load setup file</button></div>
      <p>Districts, places and people in your towns, from your notes (${(ui.city?.entries || []).length} so far). Loading the file again adds only what is new; you can also add them one at a time on each town's page.</p>
      <div class="ws-row"><input id="ws-city-file" type="file" accept="application/json,.json" aria-label="City file">
        <button class="ws-btn ws-btn--small" type="button" data-act="city-import">Load city file</button></div>
      <div class="ws-row"><button class="ws-btn ws-btn--small" type="button" data-act="forget-key">Forget the DM key on this device</button></div>
    </div>
  </details>`;
}

function countdownCard(item) {
  const world = ui.world;
  const state = item.done
    ? `<span class="ws-chip ws-chip--plain">Finished</span>`
    : item.waiting ? `<span class="ws-chip ws-chip--suggested">Waiting for your call</span>` : "";
  const body = item.mode === COUNTDOWN_MODE.DATE
    ? `<p class="ws-meta">Fixed date: ${esc(formatDay(item.dueDay))}${item.dueDay > world.day ? ` (${item.dueDay - world.day} day${item.dueDay - world.day === 1 ? "" : "s"} away)` : ""}</p>`
    : `<div class="ws-row"><div class="ws-clock" role="img" aria-label="${item.fill} of ${item.size}">${
        Array.from({ length: item.size }, (_, index) => `<i class="${index < item.fill ? "is-on" : ""}"></i>`).join("")}</div>
        ${item.done || item.waiting ? "" : `<button class="ws-btn ws-btn--small" type="button" data-act="step" data-id="${esc(item.id)}" data-delta="-1" aria-label="One step back">−</button>
        <button class="ws-btn ws-btn--small" type="button" data-act="step" data-id="${esc(item.id)}" data-delta="1" aria-label="One step forward">+</button>`}</div>
       <p class="ws-meta">About ${Math.round(item.chance * 10)} in 10 chance of a step each day.</p>`;
  return `<div class="ws-card" data-countdown="${esc(item.id)}">
    <div class="ws-row"><h3>${esc(item.label)}</h3>${state}${item.place ? `<span class="ws-meta">${stage3.linked(placeName(item.place))}</span>` : ""}${
      item.route ? `<span class="ws-meta" data-countdown-road>${esc(roadLabel(item.route))}</span>` : ""}</div>
    ${body}
    <p class="ws-meta"><b>When it comes due it suggests:</b> ${esc(item.suggestionText)}</p>
    ${item.done || item.waiting ? "" : `<div class="ws-row"><button class="ws-btn ws-btn--small ws-btn--quiet" type="button" data-act="finish" data-id="${esc(item.id)}">Close without an event</button></div>`}
  </div>`;
}

function roadLabel(routeId) {
  const road = (ui.markets?.routes || []).find((entry) => entry.id === routeId);
  return road ? `on the road between ${road.aName} and ${road.bName}` : "on a road";
}

function countdownsView() {
  const world = ui.world;
  const open = world.countdowns.filter((item) => !item.done);
  const done = world.countdowns.filter((item) => item.done);
  const form = ui.form;
  const dated = form.mode === COUNTDOWN_MODE.DATE;
  return `<section id="ws-countdowns">
    <h2>Countdowns</h2>
    <p class="ws-lede">Things building up off screen. When one fills up, or its date comes, the simulation suggests the event and waits for you. You can nudge any of them by hand.</p>
    ${open.map(countdownCard).join("") || `<p class="ws-meta">No countdowns yet. Add one below.</p>`}
  </section>
  <section class="ws-card" id="ws-new-countdown">
    <h2>New countdown</h2>
    <div class="ws-fields">
      <label class="ws-field--wide">Name<input class="ws-input" id="ws-cd-label" type="text" data-bind="form.label" value="${esc(form.label)}"></label>
      <label>How it moves<select id="ws-cd-mode" data-bind="form.mode" data-rerender="true">
        <option value="${COUNTDOWN_MODE.CHANCE}"${dated ? "" : " selected"}>Rolls each day</option>
        <option value="${COUNTDOWN_MODE.DATE}"${dated ? " selected" : ""}>Fixed date</option></select></label>
      ${dated
        ? `<label>Date<input class="ws-input" id="ws-cd-date" type="text" data-bind="form.date" value="${esc(form.date)}" placeholder="${esc(MONTHS[fromDay(world.day).monthIndex])} 15"></label>`
        : `<label>Steps<select id="ws-cd-size" data-bind="form.size">${COUNTDOWN_SIZES.map((size) => `<option value="${size}"${Number(form.size) === size ? " selected" : ""}>${size}</option>`).join("")}</select></label>
           <label>Chance each day, in 10<input id="ws-cd-chance" type="number" min="1" max="10" step="1" data-bind="form.chanceInTen" value="${esc(form.chanceInTen)}"></label>`}
      <label>Where<select id="ws-cd-place" data-bind="form.place" data-rerender="true">${placeOptions(form.place)}</select></label>
      ${(ui.markets?.routes || []).length ? `<label>Or on a road<select id="ws-cd-route" data-bind="form.route"><option value="">Not on a road</option>${
        ui.markets.routes.map((road) => `<option value="${esc(road.id)}"${form.route === road.id ? " selected" : ""}>${esc(road.aName)} to ${esc(road.bName)}</option>`).join("")}</select></label>` : ""}
      ${economy.effectFields(form.effect, form.place, "form.effect")}
    </div>
    <label class="ws-meta">When it comes due, suggest this event
      <textarea id="ws-cd-suggestion" data-bind="form.suggestionText" aria-label="Event to suggest when it comes due">${esc(form.suggestionText)}</textarea></label>
    <div class="ws-row"><button class="ws-btn ws-btn--primary" type="button" data-act="create-countdown">Add countdown</button>
      <span class="ws-meta${ui.error ? " ws-error" : ""}" role="status">${esc(ui.error || ui.message)}</span></div>
  </section>
  ${done.length ? `<section id="ws-finished"><h2>Finished</h2>${done.map(countdownCard).join("")}</section>` : ""}`;
}

function recordView() {
  const events = (ui.events || []).filter((event) => ui.recordFilter === "all" || event.status === ui.recordFilter);
  const chip = (event) => `<span class="ws-chip ws-chip--${esc(event.status)}">${event.status === "written" ? "Written" : event.status === "suggested" ? "Suggested" : "Rejected"}</span>`;
  return `<section id="ws-record">
    <h2>Record</h2>
    <p class="ws-lede">Everything written, proposed or turned down, newest first. Only written entries are canon. Players see an entry only if you show it to them.</p>
    <div class="ws-row" role="group" aria-label="Show">${RECORD_FILTERS.map(([id, label]) => `<button class="ws-btn ws-btn--small" type="button" aria-pressed="${ui.recordFilter === id}" data-act="filter" data-id="${id}">${label}</button>`).join("")}</div>
    ${ui.events == null ? `<p class="ws-meta">Loading…</p>` : `<div class="ws-tablewrap"><table class="ws-table">
      <thead><tr><th>Day</th><th>Status</th><th>What</th><th>Where</th><th>From</th><th>Players</th></tr></thead>
      <tbody>${events.map((event) => `<tr data-event="${esc(event.id)}">
        <td style="white-space:nowrap">${esc(formatDayShort(event.day))}</td>
        <td>${chip(event)}</td>
        <td class="ws-what">${stage3.linked(event.text)}${event.status === "written"
          ? ` <button class="ws-btn ws-btn--small ws-btn--quiet" type="button" data-act="rumour-about" data-id="${esc(event.id)}">Start a rumour about this</button>` : ""}</td>
        <td>${stage3.linked(placeName(event.place))}</td>
        <td class="ws-meta">${event.source === "dm" ? "You" : "Simulation"}</td>
        <td>${event.status === "written"
          ? `<button class="ws-btn ws-btn--small" type="button" aria-pressed="${event.playersVisible === true}" data-act="reveal" data-id="${esc(event.id)}" data-show="${event.playersVisible ? "false" : "true"}">${event.playersVisible ? "Shown to players" : "Hidden"}</button>`
          : `<span class="ws-meta">Hidden</span>`}</td></tr>`).join("")
        || `<tr><td colspan="6" class="ws-meta">Nothing here yet.</td></tr>`}</tbody></table></div>`}
  </section>`;
}

function render() {
  const bar = $("#ws-bar");
  const tabs = $("#ws-tabs");
  const view = $("#ws-view");
  if (!view) return;

  const live = ui.unlocked && ui.world?.initialized;
  bar.hidden = !live;
  tabs.hidden = !live;
  const results = $("#ws-search-results");
  if (results) {
    const found = live ? stage3.searchResults() : "";
    results.innerHTML = found;
    results.hidden = !found;
  }

  if (!ui.unlocked) {
    view.innerHTML = lockView();
    return;
  }
  if (!ui.world) {
    view.innerHTML = `<p class="ws-meta ws-error" role="alert">${esc(ui.error || "The world could not be loaded.")}</p>
      <div class="ws-row"><button class="ws-btn" type="button" data-act="reload">Try again</button>
      <button class="ws-btn ws-btn--quiet" type="button" data-act="forget-key">Forget the DM key on this device</button></div>`;
    return;
  }
  if (!ui.world.initialized) {
    view.innerHTML = startView();
    return;
  }

  // The region outlines are a static file of the site; fetched the first time the map is opened.
  if (ui.tab === "map" && !ui.map.regions && !ui.map.regionsLoading) {
    ui.map.regionsLoading = true;
    map.loadRegions().finally(() => {
      ui.map.regionsLoading = false;
      render();
    });
  }

  const world = ui.world;
  $("#ws-date").innerHTML = `${esc(world.dateText)}<span>Day ${world.dayOfMonth} of ${world.daysPerMonth || DAYS_PER_MONTH} in ${esc(world.month)}</span>`;
  $("#ws-advance").disabled = ui.busy;
  $("#ws-run").disabled = ui.busy;
  $("#ws-tab-row").innerHTML = TABS.map(([id, label]) => `<a href="#${id}"${ui.tab === id ? ' aria-current="page"' : ""} data-act="tab" data-id="${id}">${label}${
    id === "today" && world.pending.length ? `<span class="ws-count">${world.pending.length}</span>` : ""}</a>`).join("");
  view.innerHTML = ui.tab === "countdowns" ? countdownsView()
    : ui.tab === "record" ? recordView()
      : ui.tab === "markets" ? economy.marketsView()
        : ui.tab === "places" ? economy.placesView()
          : ui.tab === "map" ? map.mapView()
            : ui.tab === "rumours" ? stage3.rumoursView()
              : todayView();
}

/* ---------------- actions ---------------- */

async function run(action, { message = "" } = {}) {
  if (ui.busy) return;
  ui.busy = true;
  ui.error = "";
  ui.message = "";
  try {
    // An action may return its own message (a count, say); otherwise the fixed one is used.
    const said = await action();
    ui.message = typeof said === "string" ? said : message;
  } catch (error) {
    ui.error = describeError(error);
    if (error?.status === 401 || error?.status === 403) {
      ui.unlocked = false;
      ui.lockMessage = ui.error;
    } else if (error?.status === 409) {
      // Someone else (or another tab) changed the world: show what is there now.
      try { await loadWorld(); } catch (_ignored) { /* keep the first error */ }
    }
  } finally {
    ui.busy = false;
    const live = ui.unlocked && ui.world?.initialized;
    if (live && ["record", "places", "rumours", "map"].includes(ui.tab) && ui.events == null) {
      try { await loadRecord(); } catch (_ignored) { ui.events = []; }
    }
    if (live && (ui.marketsStale || ui.markets == null)) {
      try { await economy.loadMarkets(); } catch (_ignored) { /* the next action tries again */ }
    }
    if (live && (ui.overviewStale || ui.overview == null || ui.city == null)) {
      try { await stage3.loadStage3(); } catch (_ignored) { /* the next action tries again */ }
    }
    render();
  }
}

function keepTyping() {
  const text = $("#ws-jot-text");
  if (text) ui.jot.text = text.value;
  const suggestion = $("#ws-cd-suggestion");
  if (suggestion) ui.form.suggestionText = suggestion.value;
  const label = $("#ws-cd-label");
  if (label) ui.form.label = label.value;
}

const actions = {
  tab(data) {
    keepTyping();
    ui.tab = TABS.some(([id]) => id === data.id) ? data.id : "today";
    ui.error = "";
    ui.message = "";
    try { if (window.location.hash !== `#${ui.tab}`) window.location.hash = ui.tab; } catch (_error) { /* not needed */ }
    if (ui.tab === "record") {
      ui.events = null;
      render();
      return run(() => loadRecord());
    }
    if (["markets", "places", "rumours", "map"].includes(ui.tab) && (ui.markets == null || (ui.tab !== "markets" && ui.events == null))) {
      render();
      return run(async () => {});
    }
    render();
    return undefined;
  },
  reload: () => run(async () => { await Promise.all([loadWorld(), loadPlaces()]); }),
  start: () => run(async () => {
    const day = readDate($("#ws-start-date")?.value);
    if (day == null) throw Object.assign(new Error('Write the first day like "Fall 7, 496".'), { status: 400 });
    ui.world = await ui.api.startWorld({ day });
    ui.marketsStale = true;
    ui.overviewStale = true;
  }),
  advance: () => run(async () => {
    keepTyping();
    const from = ui.world.day;
    ui.world = await ui.api.advanceWorld({ days: 1, expectedEtag: ui.world.etag });
    ui.lastAdvance = { ...ui.world.advanced, fromDay: from };
    ui.events = null;
    ui.marketsStale = true;
    ui.overviewStale = true;
    ui.whatIf.result = null;
    ui.tab = "today";
  }),
  run: () => run(async () => {
    keepTyping();
    const from = ui.world.day;
    ui.world = await ui.api.advanceWorld({ untilDecision: true, expectedEtag: ui.world.etag });
    ui.lastAdvance = { ...ui.world.advanced, fromDay: from };
    ui.events = null;
    ui.marketsStale = true;
    ui.overviewStale = true;
    ui.whatIf.result = null;
    ui.tab = "today";
  }),
  jot: () => run(async () => {
    keepTyping();
    const text = ui.jot.text.trim();
    if (!text) throw Object.assign(new Error("Write what happened first."), { status: 400 });
    let day;
    if (ui.jot.when.trim()) {
      day = readDate(ui.jot.when);
      if (day == null) throw Object.assign(new Error('Write the date like "Fall 5, 496", or leave it empty for today.'), { status: 400 });
    }
    const effect = economy.buildEffect(ui.jot.effect, ui.jot.place);
    const result = await ui.api.writeWorldEvent({ text, place: ui.jot.place || null, day, effect });
    ui.world = result.world;
    ui.events = null;
    ui.marketsStale = Boolean(effect);
    ui.overviewStale = true;
    ui.whatIf.result = null;
    ui.jot = { text: "", place: ui.jot.place, when: "", effect: noEffect() };
  }, { message: "Written. It is in the Record." }),
  accept: (data) => decide(data.id, { decision: "accept" }),
  reject: (data) => decide(data.id, { decision: "reject" }),
  reword(data) {
    keepTyping();
    ui.editId = data.id;
    render();
    $(`#ws-edit-${CSS.escape(data.id)}`)?.focus();
  },
  "cancel-reword"() {
    ui.editId = null;
    render();
  },
  "save-reword"(data) {
    const text = $(`#ws-edit-${CSS.escape(data.id)}`)?.value.trim() || "";
    return decide(data.id, text ? { decision: "reword", text } : { decision: "accept" });
  },
  step: (data) => run(async () => {
    ui.world = (await ui.api.changeWorldCountdown(data.id, { action: "step", delta: Number(data.delta) })).world;
    ui.events = null;
  }),
  finish: (data) => run(async () => {
    ui.world = (await ui.api.changeWorldCountdown(data.id, { action: "finish" })).world;
  }),
  "create-countdown": () => run(async () => {
    keepTyping();
    const form = ui.form;
    const payload = {
      label: form.label,
      mode: form.mode,
      place: form.place || null,
      route: form.route || null,
      suggestionText: form.suggestionText,
      effect: economy.buildEffect(form.effect, form.place)
    };
    if (form.mode === COUNTDOWN_MODE.DATE) {
      const day = readDate(form.date);
      if (day == null) throw Object.assign(new Error('Write the date like "Fall 15, 496".'), { status: 400 });
      payload.dueDay = day;
    } else {
      payload.size = Number(form.size);
      payload.chance = Math.min(10, Math.max(1, Number(form.chanceInTen) || 0)) / 10;
    }
    ui.world = (await ui.api.createWorldCountdown(payload)).world;
    ui.form = { ...ui.form, label: "", date: "", route: "", suggestionText: "", effect: noEffect() };
    ui.overviewStale = true;
  }, { message: "Countdown added." }),
  filter(data) {
    ui.recordFilter = RECORD_FILTERS.some(([id]) => id === data.id) ? data.id : "all";
    render();
  },
  reveal: (data) => run(async () => {
    const show = data.show === "true";
    await ui.api.setWorldEventVisibility(data.id, show);
    const event = (ui.events || []).find((entry) => entry.id === data.id);
    if (event) event.playersVisible = show;
  }),
  "load-places": () => run(async () => {
    const file = $("#ws-places-file")?.files?.[0];
    if (!file) throw Object.assign(new Error("Choose the places file first."), { status: 400 });
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (_error) {
      throw Object.assign(new Error("That file is not valid JSON."), { status: 400 });
    }
    const saved = await ui.api.saveWorldPlaces({ places: parsed.places, economy: parsed.economy ?? undefined });
    ui.places = saved.places;
    ui.setup = saved;
    ui.placesLoaded = true;
    ui.marketsStale = true;
    ui.overviewStale = true;
    if (ui.world?.initialized) ui.world = await ui.api.getWorld();
  }, { message: "Setup loaded." }),
  "rumour-about"(data) {
    ui.rumourForm = { ...ui.rumourForm, eventId: data.id, isTrue: true };
    return actions.tab({ id: "rumours" });
  },
  "forget-key"() {
    storeKey("");
    ui.api.setDmKey("");
    ui.unlocked = false;
    ui.overview = null;
    ui.city = null;
    ui.world = null;
    ui.events = null;
    ui.markets = null;
    ui.setup = null;
    ui.places = [];
    ui.lockMessage = "";
    render();
  }
};

Object.assign(actions, economy.actions, stage3.actions, map.actions);

// No key is needed for these two routes; the answer is the same with or without one.
actions["players-preview"] = async () => {
  try {
    const [prices, rumours] = await Promise.all([ui.api.getWorldPublicPrices(), ui.api.getWorldPublicRumours()]);
    ui.players = { prices, rumours };
    ui.error = "";
  } catch (error) {
    ui.error = error?.message || "Could not check what players see.";
  }
  render();
};

function decide(id, decision) {
  return run(async () => {
    keepTyping();
    ui.world = (await ui.api.decideWorldEvent(id, decision)).world;
    ui.editId = null;
    ui.events = null;
    ui.marketsStale = true;
    ui.overviewStale = true;
  });
}

function bind() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest?.("[data-act]");
    if (!target) return;
    const action = actions[target.dataset.act];
    if (!action) return;
    event.preventDefault();
    action(target.dataset);
  });
  document.addEventListener("submit", (event) => {
    if (event.target?.id !== "ws-lock-form") return;
    event.preventDefault();
    const key = $("#ws-key")?.value.trim() || "";
    if (key) unlock(key);
  });
  document.addEventListener("change", (event) => {
    if (stage3.onChange(event)) return;
    const target = event.target.closest?.("[data-bind]");
    if (!target) return;
    const path = target.dataset.bind.split(".");
    const field = path.pop();
    path.reduce((holder, key) => holder[key], ui)[field] = target.value;
    if (target.dataset.rerender) {
      keepTyping();
      render();
    }
  });
  document.addEventListener("input", (event) => {
    if (!stage3.onInput(event)) economy.onInput(event);
  });
  map.bindGestures();
  window.addEventListener("hashchange", () => {
    const wanted = window.location.hash.slice(1);
    if (ui.unlocked && wanted !== ui.tab && TABS.some(([id]) => id === wanted)) actions.tab({ id: wanted });
  });
}

async function boot() {
  ui.api = new EldoriaApiClient({ baseUrl: apiBase() });
  const wanted = window.location.hash.slice(1);
  if (TABS.some(([id]) => id === wanted)) ui.tab = wanted;
  bind();
  const key = readStoredKey();
  if (!key) {
    render();
    return;
  }
  const ok = await unlock(key);
  if (ok && ui.tab === "record" && ui.world?.initialized) {
    await run(() => loadRecord());
  }
}

boot();
