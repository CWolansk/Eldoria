// "Word in town": what the players may know about where the party is.
// What staples cost in that one town, what any item from the catalog costs there, and
// the rumours the DM has let them hear.
//
// It asks two open world routes and, for the item lookup, the same catalog search the
// item search tool uses. It sends no key and stores nothing.
// The server decides what players may see; when there is nothing, both world routes give
// the same empty answer whatever the reason, and this page says only "No news from town yet."
//
// Two different comparisons appear here and are never mixed:
//   staples (grain, fish, ...) are compared with what this town usually pays;
//   items from the catalog are compared with their own list price.

import { EldoriaApiClient } from "../../api/apiClient/index.js";
import {
  commodityRows, describeItemPrice, isEmptyAnswer, percentDirection, percentText
} from "./local-prices.js";

// Checked again when the tab comes back into view, and every few minutes. No faster.
export const RECHECK_MS = 5 * 60 * 1000;
// The lookup waits for a pause in typing, and needs at least this many letters.
export const LOOKUP_DEBOUNCE_MS = 300;
export const LOOKUP_MIN_LETTERS = 2;
const LOOKUP_LIMIT = 20;

const view = () => document.querySelector("#town-view");
const esc = (value) => String(value ?? "").replace(/[&<>"']/gu, (character) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]
));

function apiBase() {
  return window.ELDORIA_API_BASE_URL || window.ELDORIA_SITE_CONFIG?.cloudApiBase || "/api";
}

const state = {
  api: null, loading: false, loaded: false, failed: false, prices: null, rumours: null,
  shown: "", // what was last drawn, so a re-check that changes nothing does not disturb typing
  lookup: { query: "", status: "idle", items: [], timer: null, request: 0 }
};

function versus(percent) {
  const direction = percentDirection(percent);
  return `<span class="town-versus${direction ? ` town-versus--${direction}` : ""}">${esc(percentText(percent))}</span>`;
}

/* ---------------- item lookup ---------------- */

function lookupResults() {
  const lookup = state.lookup;
  if (lookup.status === "idle") {
    return `<p class="town-meta" id="town-lookup-hint">Type at least ${LOOKUP_MIN_LETTERS} letters of an item's name.</p>`;
  }
  if (lookup.status === "searching") {
    return `<p class="town-meta" id="town-lookup-searching" role="status">Searching…</p>`;
  }
  if (lookup.status === "failed") {
    return `<p id="town-lookup-error" role="alert">Could not reach the item list. Check your connection and try again.</p>`;
  }
  if (!lookup.items.length) {
    return `<p class="town-meta" id="town-lookup-none">No item by that name.</p>`;
  }
  return `<ul class="town-items" id="town-lookup-list">${lookup.items.map((item) => {
    const price = describeItemPrice(state.prices, item);
    let cost;
    if (!price.listText) {
      // The catalog gives no price for it, so none is made up.
      cost = `<span class="town-item__none">No list price</span>`;
    } else if (price.local) {
      cost = `<span class="town-item__here"><b>${esc(price.local.priceText)}</b> here</span>
        <span class="town-versus${price.local.direction ? ` town-versus--${price.local.direction}` : ""}">${esc(price.local.percentText)}</span>
        <span class="town-item__list">List price ${esc(price.listText)}</span>`;
    } else {
      cost = `<span class="town-item__here"><b>${esc(price.listText)}</b></span>
        <span class="town-versus">list price</span>`;
    }
    return `<li class="town-item" data-item-id="${esc(item.id)}">
      <span class="town-item__name">${esc(item.name)}</span>
      <span class="town-item__cost">${cost}</span></li>`;
  }).join("")}</ul>
  <p class="town-meta">Percentages here are against each item's own list price.</p>`;
}

function drawLookupResults() {
  const box = view()?.querySelector("#town-lookup-results");
  if (box) box.innerHTML = lookupResults();
}

async function runLookup(query) {
  const lookup = state.lookup;
  const request = (lookup.request += 1);
  lookup.status = "searching";
  drawLookupResults();
  try {
    const answer = await state.api.searchItems(query, { limit: LOOKUP_LIMIT });
    if (request !== lookup.request) return; // a newer search has started
    lookup.items = (Array.isArray(answer?.items) ? answer.items : []).map((row) => ({
      id: String(row?.id || ""),
      name: String(row?.name || ""),
      rarity: row?.rarity ?? "",
      type: row?.type ?? "",
      value: row?.valueLabel ?? ""
    })).filter((item) => item.id && item.name);
    lookup.status = "done";
  } catch (_error) {
    if (request !== lookup.request) return;
    lookup.items = [];
    lookup.status = "failed";
  }
  drawLookupResults();
}

function onLookupInput(value) {
  const lookup = state.lookup;
  lookup.query = value;
  if (lookup.timer) clearTimeout(lookup.timer);
  const query = value.trim();
  if (query.length < LOOKUP_MIN_LETTERS) {
    lookup.request += 1;
    lookup.status = "idle";
    lookup.items = [];
    drawLookupResults();
    return;
  }
  lookup.timer = setTimeout(() => { void runLookup(query); }, LOOKUP_DEBOUNCE_MS);
  lookup.timer?.unref?.();
}

/* ---------------- the page ---------------- */

function render() {
  const root = view();
  if (!root) return;

  if (state.failed) {
    state.shown = "";
    root.innerHTML = `<section class="town-card" id="town-error">
      <h1>Word in town</h1>
      <p role="alert">Could not reach the server. Check your connection.</p>
      <button class="town-button" type="button" id="town-retry">Try again</button>
    </section>`;
    root.querySelector("#town-retry").addEventListener("click", () => { void refresh(); });
    return;
  }

  if (!state.loaded) {
    root.innerHTML = `<p class="town-meta" id="town-loading" role="status">Loading…</p>`;
    return;
  }

  const empty = isEmptyAnswer(state.prices);
  const staples = commodityRows(state.prices);
  const town = state.prices?.place?.name || state.rumours?.place?.name || "";
  const rumours = town && Array.isArray(state.rumours?.rumours) ? state.rumours.rumours.filter((entry) => entry?.text) : [];

  if (!town || (empty && !rumours.length)) {
    state.shown = "";
    root.innerHTML = `<section class="town-card" id="town-empty">
      <h1>Word in town</h1>
      <p>No news from town yet.</p>
    </section>`;
    return;
  }

  // A re-check that brings nothing new leaves the page alone, so typing is not interrupted.
  const signature = JSON.stringify([state.prices, state.rumours]);
  if (signature === state.shown && root.querySelector("#town-name")) {
    return;
  }
  state.shown = signature;

  document.title = `Word in ${town} | Eldoria Player Wiki`;
  root.innerHTML = `<header class="town-header">
      <p class="town-kicker">Where the party is</p>
      <h1 id="town-name">Word in ${esc(town)}</h1>
    </header>
    ${staples.length ? `<section class="town-section" id="town-prices" aria-labelledby="town-prices-title">
      <h2 id="town-prices-title">Staples: what they cost here</h2>
      <div class="town-tablewrap"><table class="town-table">
        <thead><tr><th scope="col">Staple</th><th scope="col" class="town-num">Price</th><th scope="col" class="town-num">Against usual</th></tr></thead>
        <tbody>${staples.map((entry) => `<tr>
          <th scope="row">${esc(entry.good)} <span class="town-unit">per ${esc(entry.unit)}</span></th>
          <td class="town-num">${esc(entry.priceText)}</td>
          <td class="town-num">${versus(entry.vsUsualPercent)}</td></tr>`).join("")}</tbody></table></div>
      <p class="town-meta">"Usual" is what this town normally pays for it.</p>
    </section>` : ""}
    ${empty ? "" : `<section class="town-section" id="town-lookup" aria-labelledby="town-lookup-title">
      <h2 id="town-lookup-title">Look up an item</h2>
      <p class="town-meta">Any item from the item list, with what it costs in ${esc(town)}.</p>
      <label class="town-search"><span class="town-search__label">Item name</span>
        <input type="search" id="town-lookup-input" autocomplete="off" spellcheck="false" placeholder="For example: longsword" value="${esc(state.lookup.query)}"></label>
      <div id="town-lookup-results" aria-live="polite">${lookupResults()}</div>
    </section>`}
    <section class="town-section" id="town-rumours" aria-labelledby="town-rumours-title">
      <h2 id="town-rumours-title">What people are saying</h2>
      ${rumours.length ? `<ul class="town-rumours">${rumours.map((entry) => `<li><q>${esc(entry.text)}</q></li>`).join("")}</ul>
        <p class="town-meta">Talk is talk. Whether any of it is true is another matter.</p>` : `<p class="town-meta">Nothing you have heard yet.</p>`}
    </section>`;

  const input = root.querySelector("#town-lookup-input");
  if (input) {
    input.addEventListener("input", () => onLookupInput(input.value));
  }
}

export async function refresh() {
  if (state.loading) return;
  state.loading = true;
  try {
    const [prices, rumours] = await Promise.all([
      state.api.getWorldPublicPrices(),
      state.api.getWorldPublicRumours()
    ]);
    state.prices = prices;
    state.rumours = rumours;
    state.failed = false;
    state.loaded = true;
  } catch (_error) {
    // Keep showing what was loaded before; only an empty page turns into the error card.
    state.failed = !state.loaded;
  } finally {
    state.loading = false;
    render();
    // Prices may have moved: redo the lookup's figures without touching what is typed.
    if (state.lookup.status === "done") drawLookupResults();
  }
}

function start() {
  state.api = new EldoriaApiClient({ baseUrl: apiBase() });
  render();
  void refresh();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void refresh();
  });
  const timer = setInterval(() => {
    if (!document.hidden) void refresh();
  }, RECHECK_MS);
  timer?.unref?.();
}

if (typeof document !== "undefined") {
  start();
}
