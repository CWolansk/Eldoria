// Living world, Stage 2 views: Markets, Places, the jot's "what it does" picker and
// the what-if run. Like the rest of the page, this file holds no world data: every
// place, good and figure it shows is fetched with the DM key.

import {
  REPORT_LINES_PER_SUBJECT, createLedgerRegistry, describeEconomy, estimateMarket, figureValue,
  formatDay, formatDayShort, formatMoney, normalizeEconomyConfig, tickMany
} from "../../world-sim/engine/index.js";

export const EFFECT_KINDS = [
  ["note", "Just a written fact"],
  ["scarce", "Makes a good scarce here"],
  ["flood", "Floods a good here"],
  ["close", "Closes a road"],
  ["slow", "Slows a road"]
];

const SCARCE_MAKE = 0.3;
const SCARCE_USE = 2;
const FLOOD_MAKE = 2.2;
const FLOOD_USE = 0.5;
const SLOW_ROAD = 0.35;

/** A figure in the setup document may be a bare number or { value, estimate, basis }. */
function figure(raw) {
  if (raw && typeof raw === "object") {
    return { value: raw.value ?? null, estimate: raw.estimate === true, basis: raw.basis || "" };
  }
  return { value: raw ?? null, estimate: false, basis: "" };
}

export function createEconomyViews({ ui, esc, run, render, placeName, keepTyping, $ }) {
  const estimateChip = (isEstimate, basis = "") => (isEstimate
    ? `<span class="ws-chip ws-chip--estimate" title="${esc(basis || "A best guess for you to correct")}">estimate</span>`
    : "");

  const marketPlace = (id) => ui.markets?.places?.find((place) => place.id === id) || null;
  const goodOf = (id) => ui.markets?.goods?.find((good) => good.id === id) || null;
  const routesAt = (id) => (ui.markets?.routes || []).filter((route) => route.a === id || route.b === id);
  const setupPlace = (id) => ui.setup?.places?.find((place) => place.id === id) || null;

  async function loadMarkets() {
    ui.markets = ui.world?.initialized ? await ui.api.getWorldMarkets() : null;
    ui.marketsStale = false;
    if (ui.markets?.goods?.length && !goodOf(ui.good)) ui.good = ui.markets.goods[0].id;
  }

  /** Saves a changed copy of the setup document; the server validates all of it. */
  async function saveSetup(change) {
    if (!ui.setup?.places?.length) {
      throw Object.assign(new Error("Load the setup file first (Today, Setup)."), { status: 400 });
    }
    const next = structuredClone(ui.setup);
    next.economy = next.economy || { goods: [], routes: [], markets: {} };
    change(next);
    ui.setup = await ui.api.saveWorldPlaces(next);
    ui.places = ui.setup.places;
    ui.world = await ui.api.getWorld();
    await loadMarkets();
  }

  function spark(entry) {
    const points = entry.history.length > 1 ? entry.history : [entry.price, entry.price];
    const low = Math.min(...points, entry.usual) * 0.97;
    const high = Math.max(...points, entry.usual) * 1.03;
    const width = 96;
    const height = 26;
    const x = (index) => 3 + index * (width - 8) / Math.max(1, points.length - 1);
    const y = (value) => height - 3 - (value - low) / (high - low || 1) * (height - 6);
    const last = points[points.length - 1];
    const tone = last > entry.usual * 1.03 ? "up" : last < entry.usual * 0.97 ? "down" : "flat";
    return `<svg class="ws-spark ws-spark--${tone}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price over the last ${points.length} days">
      <line x1="2" x2="${width - 2}" y1="${y(entry.usual).toFixed(1)}" y2="${y(entry.usual).toFixed(1)}" class="ws-spark__usual"></line>
      <polyline points="${points.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ")}" class="ws-spark__line"></polyline>
      <circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="2.6" class="ws-spark__dot"></circle></svg>`;
  }

  function versus(percent) {
    if (!percent) return `<span class="ws-meta">usual</span>`;
    return `<span class="${percent > 0 ? "ws-up" : "ws-down"}">${percent > 0 ? "+" : ""}${percent}%</span>`;
  }

  function whyList(lines, { end = true } = {}) {
    if (!lines?.length) return "";
    return lines.map((line) => `<span class="ws-why">${esc(line.text)}${line.untilDay != null ? ` <span class="ws-meta">(until ${esc(formatDayShort(line.untilDay))})</span>` : line.pressureId ? ` <span class="ws-meta">(until you end it)</span>` : ""}${
      end && line.pressureId ? ` <button class="ws-btn ws-btn--small ws-btn--quiet" type="button" data-act="end-pressure" data-id="${esc(line.pressureId)}">End now</button>` : ""}</span>`).join("<br>");
  }

  /* ---------------- what the jot does ---------------- */

  function effectModel(model, placeId) {
    const place = marketPlace(placeId);
    const goods = place?.hasMarket ? place.goods : [];
    const roads = routesAt(placeId);
    const good = goods.find((entry) => entry.good === model.good) || goods[0] || null;
    const road = roads.find((route) => route.id === model.road) || roads[0] || null;
    return { place, goods, roads, good, road };
  }

  /** The effect a jot or countdown carries, from the picker. null means "just a fact". */
  function buildEffect(model, placeId) {
    if (!model || model.kind === "note" || !model.kind) return null;
    const { good, road } = effectModel(model, placeId);
    const days = String(model.days ?? "").trim() === "" ? null : Number(model.days);
    if (model.kind === "close" || model.kind === "slow") {
      if (!road) throw Object.assign(new Error("No road from that place is in the setup."), { status: 400 });
      return { type: "pressure", target: "route", route: road.id, multiplier: model.kind === "close" ? 0 : SLOW_ROAD, days };
    }
    if (!good) throw Object.assign(new Error("That place has no market yet, so this can only be written as a plain fact."), { status: 400 });
    const makes = good.make > 0;
    const multiplier = model.kind === "scarce" ? (makes ? SCARCE_MAKE : SCARCE_USE) : (makes ? FLOOD_MAKE : FLOOD_USE);
    return { type: "pressure", target: makes ? "make" : "use", place: placeId, good: good.good, multiplier, days };
  }

  /** In plain words, what an effect does. Used under the picker and on suggestion cards. */
  function describeEffect(effect) {
    if (!effect) return "It is written down as canon. No numbers change.";
    const length = effect.days == null ? "until you end it" : `for ${effect.days} day${effect.days === 1 ? "" : "s"}`;
    if (effect.target === "route") {
      const route = (ui.markets?.routes || []).find((entry) => entry.id === effect.route);
      const name = route ? `${route.aName} and ${route.bName}` : "that road";
      return effect.multiplier === 0
        ? `The road between ${name} is closed ${length}; no caravans pass.`
        : `The road between ${name} is slowed ${length}: fewer caravans, and they take longer.`;
    }
    const good = goodOf(effect.good)?.name || effect.good;
    const where = placeName(effect.place);
    const times = effect.multiplier === 0 ? "nothing" : `${Math.round(effect.multiplier * 100)}% of the usual amount`;
    return effect.target === "make"
      ? `${where} makes ${times} of ${good.toLowerCase()} ${length}. Prices follow from the stock.`
      : `${where} uses ${times} of ${good.toLowerCase()} ${length}. Prices follow from the stock.`;
  }

  function effectFields(model, placeId, bind) {
    const { place, goods, roads, good, road } = effectModel(model, placeId);
    const kind = model.kind || "note";
    const wantsGood = kind === "scarce" || kind === "flood";
    const wantsRoad = kind === "close" || kind === "slow";
    let note = "";
    if (kind !== "note") {
      if (!ui.markets?.configured) {
        note = "No markets are set up yet, so this can only be written as a plain fact. Load the setup file under Setup.";
      } else if (wantsGood && !goods.length) {
        note = `${placeId ? esc(placeName(placeId)) : "No place"} has no market yet, so this can only be written as a plain fact.`;
      } else if (wantsRoad && !roads.length) {
        note = "No road from this place is in the setup.";
      } else {
        try {
          note = esc(describeEffect(buildEffect(model, placeId)));
        } catch (_error) {
          note = "";
        }
      }
    }
    return `<label>What it does<select data-bind="${bind}.kind" data-rerender="true" data-effect-kind>${
      EFFECT_KINDS.map(([id, label]) => `<option value="${id}"${kind === id ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      ${wantsGood && goods.length ? `<label>Which good<select data-bind="${bind}.good" data-rerender="true" data-effect-good>${
        goods.map((entry) => `<option value="${esc(entry.good)}"${good?.good === entry.good ? " selected" : ""}>${esc(goodOf(entry.good)?.name || entry.good)}</option>`).join("")}</select></label>` : ""}
      ${wantsRoad && roads.length ? `<label>Road to<select data-bind="${bind}.road" data-rerender="true" data-effect-road>${
        roads.map((route) => `<option value="${esc(route.id)}"${road?.id === route.id ? " selected" : ""}>${esc(route.a === placeId ? route.bName : route.aName)}</option>`).join("")}</select></label>` : ""}
      ${kind !== "note" ? `<label>For how many days<input type="number" min="1" max="2000" step="1" data-bind="${bind}.days" data-rerender="true" data-effect-days value="${esc(model.days ?? "")}" placeholder="until you end it"></label>` : ""}
      ${note ? `<p class="ws-meta ws-field--wide" data-effect-note>${note}</p>` : ""}`;
  }

  /* ---------------- Markets ---------------- */

  function whatIfPanel() {
    const result = ui.whatIf.result;
    const good = goodOf(ui.good);
    let body = "";
    if (result && good) {
      const rows = result.places.filter((place) => place.hasMarket).map((place) => {
        const then = place.goods.find((entry) => entry.good === good.id);
        const now = marketPlace(place.id)?.goods.find((entry) => entry.good === good.id);
        if (!then || !now) return "";
        return `<tr><td>${esc(place.name)}</td><td class="ws-num">${esc(now.priceText)}</td><td class="ws-num">${esc(then.priceText)}</td><td class="ws-num">${versus(then.vsUsualPercent)}</td></tr>`;
      }).join("");
      body = `<div class="ws-tablewrap"><table class="ws-table"><thead><tr><th>Town</th><th class="ws-num">Now</th><th class="ws-num">After ${result.days} days</th><th class="ws-num">vs usual then</th></tr></thead><tbody>${rows}</tbody></table></div>
        ${result.suggestions.length
          ? `<p class="ws-meta"><b>It would suggest:</b></p><ul class="ws-plain">${result.suggestions.map((text) => `<li>${esc(text)}</li>`).join("")}</ul>`
          : `<p class="ws-meta">It would suggest nothing in that time.</p>`}
        <p class="ws-meta" data-whatif-note>This was a trial run in your browser, ending ${esc(formatDay(result.toDay))}. Nothing was saved and the world has not moved.</p>`;
    }
    return `<section class="ws-card" id="ws-whatif">
      <h2>What if nothing changes?</h2>
      <p class="ws-lede">Runs the same rules forward on a throwaway copy, with what is written now and nothing new. It saves nothing.</p>
      <div class="ws-row"><label class="ws-meta">Days ahead <input type="number" id="ws-whatif-days" min="1" max="120" step="1" data-bind="whatIf.days" value="${esc(ui.whatIf.days)}"></label>
        <button class="ws-btn" type="button" data-act="what-if">Try it</button></div>
      ${body}
    </section>`;
  }

  function marketsView() {
    const markets = ui.markets;
    if (!markets) return `<section><h2>Markets</h2><p class="ws-meta">Loading…</p></section>`;
    if (!markets.configured) {
      return `<section id="ws-markets"><h2>Markets</h2>
        <p class="ws-lede">No markets are set up yet. Load the setup file made from your notes (Today, then Setup). It holds the goods, the roads, and a first guess at what each town makes and uses for you to correct.</p></section>`;
    }
    const good = goodOf(ui.good) || markets.goods[0];
    const towns = markets.places.filter((place) => place.hasMarket && place.goods.some((entry) => entry.good === good.id));
    const anyEstimate = good.basePriceEstimate || towns.some((place) => {
      const entry = place.goods.find((item) => item.good === good.id);
      return entry.makeEstimate || entry.useEstimate;
    });
    const madeFrom = good.madeFrom.map((input) => `${input.perUnit} ${esc(goodOf(input.good)?.unit || "unit")}s of ${esc((goodOf(input.good)?.name || input.good).toLowerCase())}`).join(" and ");
    return `<section id="ws-markets">
      <h2>Markets</h2>
      <div class="ws-row" role="group" aria-label="Good">${markets.goods.map((entry) => `<button class="ws-btn ws-btn--small" type="button" aria-pressed="${entry.id === good.id}" data-act="good" data-id="${esc(entry.id)}">${esc(entry.name)}</button>`).join("")}</div>
      <p class="ws-lede">${esc(good.name)}, per ${esc(good.unit)}. Base price ${esc(good.basePriceText)} ${estimateChip(good.basePriceEstimate)}.${madeFrom ? ` Made from ${madeFrom}.` : ""} "Usual" is what each town settles at with nothing unusual going on.</p>
      <div class="ws-tablewrap"><table class="ws-table" id="ws-market-table">
        <thead><tr><th>Town</th><th class="ws-num">Price</th><th class="ws-num">vs usual</th><th>14 days</th><th class="ws-num">Stock lasts</th><th>Why</th></tr></thead>
        <tbody>${towns.map((place) => {
          const entry = place.goods.find((item) => item.good === good.id);
          return `<tr data-market-place="${esc(place.id)}">
            <td><button class="ws-link" type="button" data-act="open-place" data-id="${esc(place.id)}">${esc(place.name)}</button>${entry.makeEstimate || entry.useEstimate ? ` ${estimateChip(true, "What this town makes or uses of this good is a guess")}` : ""}</td>
            <td class="ws-num">${esc(entry.priceText)}</td>
            <td class="ws-num">${versus(entry.vsUsualPercent)}</td>
            <td>${spark(entry)}</td>
            <td class="ws-num">${entry.daysLeft == null ? "—" : `${entry.daysLeft} days`}</td>
            <td class="ws-whycell">${whyList(entry.why) || "—"}</td></tr>`;
        }).join("") || `<tr><td colspan="6" class="ws-meta">No town trades in this yet.</td></tr>`}</tbody></table></div>
      ${anyEstimate ? `<p class="ws-meta">Anything marked <span class="ws-chip ws-chip--estimate">estimate</span> is a best guess, not something from your notes. Open a town to correct what it makes and uses.</p>` : ""}
      <div class="ws-fields">
        <label>Base price of ${esc(good.name.toLowerCase())}, in copper pieces (100 = 1 gp)
          <input type="number" id="ws-base-price" min="0.01" step="any" value="${esc(good.basePrice)}"></label>
        <button class="ws-btn ws-btn--small" type="button" data-act="save-base-price" data-id="${esc(good.id)}">Save base price</button>
      </div>
      <p class="ws-meta${ui.error ? " ws-error" : ""}" role="status">${esc(ui.error || ui.message)}</p>
    </section>
    ${whatIfPanel()}`;
  }

  /* ---------------- Places ---------------- */

  const DETAIL_TEXT = {
    full: "Full detail: prices tracked daily",
    sketched: "Sketched: no market yet",
    landmark: "Landmark"
  };

  function placeList() {
    const query = ui.placeQuery.trim().toLowerCase();
    const matches = ui.places.filter((place) => !query
      || place.name.toLowerCase().includes(query)
      || String(place.kind || "").toLowerCase().includes(query));
    const regions = new Map();
    for (const place of matches) {
      const region = place.region || "Elsewhere";
      if (!regions.has(region)) regions.set(region, []);
      regions.get(region).push(place);
    }
    if (!matches.length) return `<p class="ws-meta">No place matches that.</p>`;
    return [...regions.entries()].map(([region, places]) => `<div class="ws-placegroup"><h3>${esc(region)}</h3>${
      places.map((place) => `<button class="ws-placeitem${place.parent ? " ws-placeitem--sub" : ""}" type="button" data-act="open-place" data-id="${esc(place.id)}" aria-current="${ui.place === place.id}">
        <span><b>${esc(place.name)}</b> <span class="ws-meta">${esc(place.kind || "")}</span></span>
        <span class="ws-meta">${ui.world?.party?.place === place.id ? "party here" : marketPlace(place.id)?.hasMarket ? "market" : ""}</span></button>`).join("")}</div>`).join("");
  }

  function placePage(id) {
    const place = ui.places.find((entry) => entry.id === id);
    if (!place) return `<div class="ws-card"><p class="ws-lede">Pick a place to open it.</p></div>`;
    const market = marketPlace(id);
    const setup = setupPlace(id);
    const population = figure(setup?.population);
    const isSettlement = !place.parent && place.detail !== "landmark";
    const partyHere = ui.world?.party?.place === id;
    const roads = routesAt(id);
    const events = (ui.events || []).filter((event) => event.place === id && event.status === "written").slice(0, 6);
    const canPromote = isSettlement && !market?.hasMarket && ui.markets?.configured;
    const detail = place.parent ? "Place in a town" : DETAIL_TEXT[place.detail] || "Not set";

    const prices = market?.hasMarket ? `<div><h3>Prices</h3><div class="ws-tablewrap"><table class="ws-table" id="ws-place-prices">
        <thead><tr><th>Good</th><th class="ws-num">Price</th><th class="ws-num">vs usual</th><th>14 days</th><th class="ws-num">Stock lasts</th></tr></thead>
        <tbody>${market.goods.map((entry) => `<tr><td>${esc(goodOf(entry.good)?.name || entry.good)}</td><td class="ws-num">${esc(entry.priceText)}</td>
          <td class="ws-num">${versus(entry.vsUsualPercent)}</td><td>${spark(entry)}</td><td class="ws-num">${entry.daysLeft == null ? "—" : `${entry.daysLeft} days`}</td></tr>`).join("")}</tbody></table></div></div>` : "";

    const makesAndUses = market?.hasMarket ? `<details class="ws-setup" id="ws-place-figures"><summary>What it makes and uses each day</summary><div>
        <p class="ws-meta">A figure you change stops being an estimate. Saving re-works what is usual; stock and prices carry on from where they are.</p>
        <div class="ws-tablewrap"><table class="ws-table"><thead><tr><th>Good</th><th>Makes</th><th>Uses</th></tr></thead><tbody>${
          (ui.markets.goods || []).map((good) => {
            const stored = ui.setup?.economy?.markets?.[id]?.[good.id] || {};
            const make = figure(stored.make ?? 0);
            const use = figure(stored.use ?? 0);
            return `<tr><td>${esc(good.name)} <span class="ws-meta">${esc(good.unit)}s</span></td>
              <td><input type="number" min="0" step="any" data-figure="make" data-good="${esc(good.id)}" value="${esc(make.value ?? 0)}" aria-label="${esc(good.name)} made each day"> ${estimateChip(make.estimate, make.basis)}</td>
              <td><input type="number" min="0" step="any" data-figure="use" data-good="${esc(good.id)}" value="${esc(use.value ?? 0)}" aria-label="${esc(good.name)} used each day"> ${estimateChip(use.estimate, use.basis)}</td></tr>`;
          }).join("")}</tbody></table></div>
        <div class="ws-row"><button class="ws-btn ws-btn--small" type="button" data-act="save-figures" data-id="${esc(id)}">Save these figures</button></div></div></details>` : "";

    const promote = canPromote ? `<div class="ws-card" id="ws-promote"><h3>Give this place a market</h3>
        <p class="ws-meta">It is only sketched. Enter roughly how many people live here and it gets a first guess at what it uses, scaled from the other towns and marked as estimates. It makes nothing until you say what.</p>
        <div class="ws-row"><label class="ws-meta">People <input type="number" id="ws-promote-people" min="1" step="1" value="${esc(population.value ?? "")}"></label>
          <button class="ws-btn ws-btn--small" type="button" data-act="promote" data-id="${esc(id)}">Give it a market</button></div></div>` : "";

    return `<div class="ws-panel" id="ws-place" data-place="${esc(id)}">
      <div><h2>${esc(place.name)}</h2>
        <p class="ws-meta">${esc(place.kind || "Place")}${place.region ? ` · ${esc(place.region)}` : ""}${partyHere ? " · the party is here" : ""}${place.knownToPlayers ? " · known to players" : " · hidden from players"}</p></div>
      <div class="ws-row"><span class="ws-chip ws-chip--plain" data-detail>${esc(detail)}</span>
        ${population.value != null ? `<span>People <b>${Number(population.value).toLocaleString("en-GB")}</b> ${estimateChip(population.estimate, population.basis)}</span>` : ""}</div>
      ${isSettlement ? `<div class="ws-slot" data-city-map>City map goes here. None yet.</div>` : ""}
      ${prices}
      ${market?.why?.length ? `<div><h3>Why things are moving</h3><p>${whyList(market.why)}</p></div>` : ""}
      ${makesAndUses}
      ${promote}
      ${roads.length ? `<div><h3>Roads</h3><ul class="ws-plain" id="ws-place-roads">${roads.map((route) => {
        const other = route.a === id ? route.b : route.a;
        return `<li><button class="ws-link" type="button" data-act="open-place" data-id="${esc(other)}">${esc(route.a === id ? route.bName : route.aName)}</button>
          <label class="ws-meta"><input type="number" class="ws-days" min="0.25" step="0.25" data-road="${esc(route.id)}" value="${esc(route.travelDays)}" aria-label="Travel days"> days ${estimateChip(route.travelDaysEstimate)}</label>
          ${route.status !== "open" ? `<span class="ws-up">${route.status}${route.untilDay != null ? ` until ${esc(formatDayShort(route.untilDay))}` : ""}</span>` : ""}
          ${route.simulated ? "" : `<span class="ws-meta">no trade simulated</span>`}</li>`;
      }).join("")}</ul>
        <div class="ws-row"><button class="ws-btn ws-btn--small" type="button" data-act="save-roads" data-id="${esc(id)}">Save travel days</button>
          <span class="ws-meta">Used for caravans and as a hint to you. They never move the party.</span></div></div>` : ""}
      ${events.length ? `<div><h3>Written here</h3><ul class="ws-plain">${events.map((event) => `<li><span class="ws-meta">${esc(formatDayShort(event.day))}</span> ${esc(event.text)}</li>`).join("")}</ul></div>` : ""}
      <div class="ws-row">
        <button class="ws-btn ws-btn--small" type="button" data-act="jot-here" data-id="${esc(id)}">Jot something here</button>
        ${partyHere
          ? `<button class="ws-btn ws-btn--small" type="button" data-act="set-party" data-id="">The party has left</button>`
          : `<button class="ws-btn ws-btn--small" type="button" data-act="set-party" data-id="${esc(id)}">Set the party here</button>`}
      </div>
      <p class="ws-meta${ui.error ? " ws-error" : ""}" role="status">${esc(ui.error || ui.message)}</p>
    </div>`;
  }

  function placesView() {
    const party = ui.world?.party?.place;
    return `<section id="ws-places">
      <h2>Places</h2>
      <p class="ws-lede">${party ? `The party is in ${esc(placeName(party))}.` : "You have not said where the party is."} Only you move the party; the simulation never does.</p>
      ${ui.placesLoaded ? "" : `<p class="ws-meta">Only places your players already know are listed. Load the setup file (Today, Setup) to see every place.</p>`}
      <div class="ws-cols">
        <div class="ws-placecol"><input class="ws-input ws-search" id="ws-place-query" type="search" placeholder="Search places" value="${esc(ui.placeQuery)}" aria-label="Search places">
          <div id="ws-place-list">${placeList()}</div></div>
        ${placePage(ui.place)}
      </div>
    </section>`;
  }

  /* ---------------- actions ---------------- */

  const actions = {
    good(data) {
      ui.good = data.id;
      render();
    },
    "open-place"(data) {
      keepTyping();
      ui.place = data.id;
      ui.tab = "places";
      ui.error = "";
      ui.message = "";
      try { if (window.location.hash !== "#places") window.location.hash = "places"; } catch (_error) { /* not needed */ }
      if (ui.events == null && ui.world?.initialized) {
        return run(async () => { ui.events = (await ui.api.listWorldEvents({ status: "all" })).events || []; });
      }
      render();
      return undefined;
    },
    "jot-here"(data) {
      ui.jot.place = data.id;
      ui.tab = "today";
      render();
      $("#ws-jot-text")?.focus();
    },
    "set-party": (data) => run(async () => {
      ui.world = (await ui.api.setWorldParty(data.id || null)).world;
    }, { message: "Saved." }),
    "end-pressure": (data) => run(async () => {
      ui.markets = await ui.api.endWorldPressure(data.id);
    }, { message: "Ended. It stops weighing on the numbers after today." }),
    "save-base-price": (data) => run(async () => {
      const value = Number($("#ws-base-price")?.value);
      if (!(value > 0)) throw Object.assign(new Error("Enter a base price above zero."), { status: 400 });
      await saveSetup((setup) => {
        const good = setup.economy.goods.find((entry) => entry.id === data.id);
        if (good) good.basePrice = { value, estimate: false, basis: "Set by you" };
      });
    }, { message: "Base price saved." }),
    "save-figures": (data) => run(async () => {
      const inputs = [...document.querySelectorAll("#ws-place-figures [data-figure]")];
      await saveSetup((setup) => {
        const market = setup.economy.markets[data.id] || (setup.economy.markets[data.id] = {});
        for (const input of inputs) {
          const value = Number(input.value);
          if (!Number.isFinite(value) || value < 0) {
            throw Object.assign(new Error("Figures must be numbers of zero or more."), { status: 400 });
          }
          const entry = market[input.dataset.good] || (market[input.dataset.good] = { make: 0, use: 0 });
          const before = figure(entry[input.dataset.figure] ?? 0);
          if (Number(before.value ?? 0) !== value) {
            entry[input.dataset.figure] = { value, estimate: false, basis: "Set by you" };
          }
        }
      });
    }, { message: "Saved. What is usual has been worked out again." }),
    "save-roads": () => run(async () => {
      const inputs = [...document.querySelectorAll("#ws-place-roads [data-road]")];
      await saveSetup((setup) => {
        for (const input of inputs) {
          const value = Number(input.value);
          if (!(value >= 0.25)) throw Object.assign(new Error("Travel takes at least a quarter of a day."), { status: 400 });
          const route = setup.economy.routes.find((entry) => entry.id === input.dataset.road);
          if (route && figureValue(route.travelDays) !== value) {
            route.travelDays = { value, estimate: false, basis: "Set by you" };
          }
        }
      });
    }, { message: "Travel days saved." }),
    promote: (data) => run(async () => {
      const people = Number($("#ws-promote-people")?.value);
      if (!(people >= 1)) throw Object.assign(new Error("Enter roughly how many people live there."), { status: 400 });
      await saveSetup((setup) => {
        const place = setup.places.find((entry) => entry.id === data.id);
        const places = {};
        for (const entry of setup.places) {
          if (!entry.parent && entry.detail === "full") {
            places[entry.id] = { name: entry.name, population: entry.population ?? null, market: setup.economy.markets[entry.id] || {} };
          }
        }
        const config = normalizeEconomyConfig({ goods: setup.economy.goods, places });
        place.detail = "full";
        place.population = { value: people, estimate: true, basis: "Entered when the place was given a market" };
        setup.economy.markets[data.id] = estimateMarket(config, people);
      });
    }, { message: "It has a market now. Every figure is an estimate until you change it." }),
    "what-if": () => run(async () => {
      const days = Math.max(1, Math.min(120, Math.round(Number(ui.whatIf.days) || 0)));
      ui.whatIf.days = days;
      const { state, day } = await ui.api.getWorldState();
      const trial = tickMany(state, [], days, { registry: createLedgerRegistry(), reportLinesPerSystem: REPORT_LINES_PER_SUBJECT });
      ui.whatIf.result = {
        days,
        toDay: day + days,
        places: describeEconomy(trial.state).places,
        suggestions: trial.suggestions.map((event) => `${formatDayShort(event.day)}: ${event.text}`)
      };
    })
  };

  function onInput(event) {
    if (event.target?.id !== "ws-place-query") return false;
    ui.placeQuery = event.target.value;
    const list = $("#ws-place-list");
    if (list) list.innerHTML = placeList();
    return true;
  }

  return { actions, buildEffect, describeEffect, effectFields, loadMarkets, marketsView, onInput, placesView };
}

export { formatMoney };
