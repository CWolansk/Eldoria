// "Word in town": what the players may know about where the party is.
// Prices in that one town, and the rumours the DM has let them hear there.
//
// It asks two open routes and nothing else, sends no key, and stores nothing.
// The server decides what players may see; when there is nothing, both routes give the
// same empty answer whatever the reason, and this page says only "No news from town yet."

import { EldoriaApiClient } from "../../api/apiClient/index.js";
import { isEmptyAnswer, percentDirection, percentText } from "./local-prices.js";

// Checked again when the tab comes back into view, and every few minutes. No faster.
export const RECHECK_MS = 5 * 60 * 1000;

const view = () => document.querySelector("#town-view");
const esc = (value) => String(value ?? "").replace(/[&<>"']/gu, (character) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]
));

function apiBase() {
  return window.ELDORIA_API_BASE_URL || window.ELDORIA_SITE_CONFIG?.cloudApiBase || "/api";
}

const state = { api: null, loading: false, loaded: false, failed: false, prices: null, rumours: null };

function versus(percent) {
  const direction = percentDirection(percent);
  return `<span class="town-versus${direction ? ` town-versus--${direction}` : ""}">${esc(percentText(percent))}</span>`;
}

function render() {
  const root = view();
  if (!root) return;

  if (state.failed) {
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

  const prices = isEmptyAnswer(state.prices) ? [] : state.prices.prices;
  const town = state.prices?.place?.name || state.rumours?.place?.name || "";
  const rumours = town && Array.isArray(state.rumours?.rumours) ? state.rumours.rumours.filter((entry) => entry?.text) : [];

  if (!town || (!prices.length && !rumours.length)) {
    root.innerHTML = `<section class="town-card" id="town-empty">
      <h1>Word in town</h1>
      <p>No news from town yet.</p>
    </section>`;
    return;
  }

  document.title = `Word in ${town} | Eldoria Player Wiki`;
  root.innerHTML = `<header class="town-header">
      <p class="town-kicker">Where the party is</p>
      <h1 id="town-name">Word in ${esc(town)}</h1>
    </header>
    <section class="town-section" id="town-prices" aria-labelledby="town-prices-title">
      <h2 id="town-prices-title">What things cost here</h2>
      ${prices.length ? `<div class="town-tablewrap"><table class="town-table">
        <thead><tr><th scope="col">Good</th><th scope="col" class="town-num">Price</th><th scope="col" class="town-num">Against usual</th></tr></thead>
        <tbody>${prices.map((entry) => `<tr>
          <th scope="row">${esc(entry.good)} <span class="town-unit">per ${esc(entry.unit)}</span></th>
          <td class="town-num">${esc(entry.priceText)}</td>
          <td class="town-num">${versus(entry.vsUsualPercent)}</td></tr>`).join("")}</tbody></table></div>
        <p class="town-meta">"Usual" is what this town normally pays.</p>` : `<p class="town-meta">No prices to report.</p>`}
    </section>
    <section class="town-section" id="town-rumours" aria-labelledby="town-rumours-title">
      <h2 id="town-rumours-title">What people are saying</h2>
      ${rumours.length ? `<ul class="town-rumours">${rumours.map((entry) => `<li><q>${esc(entry.text)}</q></li>`).join("")}</ul>
        <p class="town-meta">Talk is talk. Whether any of it is true is another matter.</p>` : `<p class="town-meta">Nothing you have heard yet.</p>`}
    </section>`;
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
