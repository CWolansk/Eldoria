// Living world: the Map view. A flat map (the site's own map image) with the region
// outlines over it, drawn with SVG and moved with plain CSS transforms and pointer
// events. No map library and nothing in 3D.
//
// Three levels, with a trail to step back out: the world (tap a region), a region
// (its towns and roads), a place (its page opens beside the map, or below it on a
// phone). The region outlines are a draft file the DM can correct; the places, their
// positions and everything named come from the API with the DM key. This file names
// no place.

import { formatDayShort } from "../../world-sim/engine/index.js";

const SIZE = 1000;
const MAX_SCALE = 6;
const OVERLAYS = [
  ["routes", "Roads"],
  ["road", "On the road"],
  ["cost", "Cost of living"],
  ["threats", "Threats"],
  ["sickness", "Sickness"],
  ["party", "Party"]
];

const xy = (position) => [position[1] * SIZE, (1 - position[0]) * SIZE];
const points = (list) => list.map((point) => xy(point).map((value) => value.toFixed(1)).join(",")).join(" ");
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function createMapView({ ui, esc, $, render, placeName, placePage, regionsUrl }) {
  ui.map = {
    sel: null,
    overlays: { routes: true, road: true, cost: false, threats: true, sickness: true, party: true },
    rumour: "",
    view: { scale: 1, x: 0, y: 0 },
    regions: null,
    regionsFailed: false,
    dragged: false
  };

  const positioned = () => ui.places.filter((place) => Array.isArray(place.position) && !place.parent);
  const placeById = (id) => ui.places.find((place) => place.id === id) || null;
  const pointOf = (id) => {
    const place = placeById(id);
    return place?.position ? xy(place.position) : null;
  };
  const regionOfPlace = (place) => (ui.map.regions || []).find((region) => region.name === place?.region) || null;
  const selectedRegion = () => {
    const sel = ui.map.sel;
    if (!sel) return null;
    if (sel.type === "region") return (ui.map.regions || []).find((region) => region.id === sel.id) || null;
    return regionOfPlace(placeById(sel.id));
  };

  async function loadRegions() {
    if (ui.map.regions || ui.map.regionsFailed) return;
    try {
      const response = await fetch(regionsUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const draft = await response.json();
      ui.map.regions = Array.isArray(draft.regions) ? draft.regions : [];
      ui.map.regionsStatus = draft.status || "";
    } catch (error) {
      console.warn("Region outlines could not be loaded:", error);
      ui.map.regions = [];
      ui.map.regionsFailed = true;
    }
  }

  /* ---------------- view box ---------------- */

  function fitView(outline) {
    const all = outline.map(xy);
    const xs = all.map((point) => point[0] / SIZE);
    const ys = all.map((point) => point[1] / SIZE);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const scale = clamp(Math.min(0.92 / (x1 - x0 || 1), 0.92 / (y1 - y0 || 1)), 1, 3.5);
    return {
      scale,
      x: clamp(0.5 - (x0 + x1) / 2 * scale, 1 - scale, 0),
      y: clamp(0.5 - (y0 + y1) / 2 * scale, 1 - scale, 0)
    };
  }

  function setView(view) {
    const scale = clamp(view.scale, 1, MAX_SCALE);
    ui.map.view = { scale, x: clamp(view.x, 1 - scale, 0), y: clamp(view.y, 1 - scale, 0) };
    const inner = $("#ws-map-inner");
    if (inner) inner.style.transform = transformOf(ui.map.view);
  }

  const transformOf = (view) => `translate(${(view.x * 100).toFixed(3)}%, ${(view.y * 100).toFixed(3)}%) scale(${view.scale.toFixed(4)})`;

  /** Zoom by `factor` keeping the point (fx, fy), in 0..1 of the box, where it is. */
  function zoomAt(factor, fx = 0.5, fy = 0.5) {
    const { scale, x, y } = ui.map.view;
    const next = clamp(scale * factor, 1, MAX_SCALE);
    const ratio = next / scale;
    setView({ scale: next, x: fx - (fx - x) * ratio, y: fy - (fy - y) * ratio });
  }

  /* ---------------- drawing ---------------- */

  function costOf(placeId) {
    const market = ui.markets?.places?.find((place) => place.id === placeId);
    if (!market?.hasMarket || !market.goods.length) return null;
    // Every good counts the same: the plain average of price against usual.
    return market.goods.reduce((sum, entry) => sum + entry.price / entry.usual, 0) / market.goods.length;
  }

  function along(from, to, share) {
    return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
  }

  // The points a road is drawn through: its two ends, and any waypoints between them
  // (a road that goes around a lake). Returned in the direction asked for.
  function roadPath(from, to) {
    const a = pointOf(from);
    const b = pointOf(to);
    if (!a || !b) return null;
    const road = (ui.overview?.roads || []).find((entry) => (entry.a === from && entry.b === to) || (entry.a === to && entry.b === from));
    const via = (road?.via || []).map(xy);
    return [a, ...(road && road.a === to ? via.slice().reverse() : via), b];
  }

  // A point a share of the way along a path, measured by length.
  function alongPath(path, share) {
    const lengths = path.slice(1).map((point, index) => Math.hypot(point[0] - path[index][0], point[1] - path[index][1]));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let left = total * share;
    for (let index = 0; index < lengths.length; index += 1) {
      if (left <= lengths[index] || index === lengths.length - 1) {
        return along(path[index], path[index + 1], lengths[index] ? Math.min(1, left / lengths[index]) : 0);
      }
      left -= lengths[index];
    }
    return path[0];
  }

  function svgMarkup() {
    const map = ui.map;
    const k = 1 / map.view.scale; // keeps marks the same size on screen as the map zooms
    const region = selectedRegion();
    const selectedPlace = map.sel?.type === "place" ? map.sel.id : null;
    const overview = ui.overview || {};
    const day = ui.world?.day ?? 0;
    let out = "";

    for (const item of map.regions || []) {
      const off = region && region.id !== item.id;
      out += `<polygon class="ws-map__region${off ? " ws-map__region--off" : ""}${region?.id === item.id ? " ws-map__region--on" : ""}" points="${points(item.outline)}" stroke-width="${(region?.id === item.id ? 3.5 : 2) * k}" data-act="map-region" data-id="${esc(item.id)}"><title>${esc(item.name)}</title></polygon>`;
    }
    if (!region) {
      for (const item of map.regions || []) {
        const all = item.outline.map(xy);
        const cx = all.reduce((sum, point) => sum + point[0], 0) / all.length;
        const cy = all.reduce((sum, point) => sum + point[1], 0) / all.length;
        out += `<text class="ws-map__regionlabel" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="${30 * k}" stroke-width="${5 * k}">${esc(item.name)}</text>`;
      }
    } else {
      for (const sub of region.subAreas || []) {
        const place = placeById(sub.id);
        out += `<polygon class="ws-map__sub" points="${points(sub.outline)}" stroke-width="${2.5 * k}"${place ? ` data-act="map-place" data-id="${esc(sub.id)}"` : ""}><title>${esc(sub.name)}</title></polygon>`;
      }
    }

    if (map.overlays.routes) {
      for (const road of overview.roads || []) {
        const path = roadPath(road.a, road.b);
        if (!path) continue;
        out += `<polyline class="ws-map__road ws-map__road--${esc(road.status)}" points="${path.map((point) => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(" ")}" stroke-width="${(road.status === "open" ? 2.5 : 4) * k}" stroke-dasharray="${road.status === "closed" ? `${3 * k} ${5 * k}` : `${9 * k} ${5 * k}`}" data-road="${esc(road.id)}"><title>${esc(road.aName)} to ${esc(road.bName)}: ${road.status}${road.travel ? `, ${road.travel} day${road.travel === 1 ? "" : "s"}` : ""}</title></polyline>`;
      }
    }

    if (map.overlays.road) {
      const dot = (from, to, departDay, arriveDay, kind, title) => {
        const path = roadPath(from, to);
        if (!path) return "";
        const share = clamp((day - departDay) / Math.max(1, arriveDay - departDay), 0.08, 0.92);
        const [x, y] = alongPath(path, share);
        return `<circle class="ws-map__moving ws-map__moving--${kind}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${5 * k}" stroke-width="${1.5 * k}" data-moving="${kind}"><title>${esc(title)}</title></circle>`;
      };
      for (const shipment of ui.markets?.shipments || []) {
        const good = ui.markets.goods.find((entry) => entry.id === shipment.good);
        out += dot(shipment.from, shipment.to, shipment.departDay, shipment.arriveDay, "goods",
          `${good?.name || shipment.good} from ${placeName(shipment.from)} to ${placeName(shipment.to)}, arriving ${formatDayShort(shipment.arriveDay)}`);
      }
      for (const group of overview.people?.onTheRoad || []) {
        out += dot(group.from, group.to, group.departDay, group.arriveDay, "people",
          `${group.people} people from ${group.fromName} to ${group.toName}, arriving ${formatDayShort(group.arriveDay)}`);
      }
      for (const who of overview.travellers || []) {
        if (who.at) continue;
        out += dot(who.from, who.to, who.departDay, who.arriveDay, "traveller", `${who.name}, on the way to ${who.toName}, arriving ${formatDayShort(who.arriveDay)}`);
      }
    }

    const rumour = map.rumour ? (overview.rumours || []).find((item) => item.id === map.rumour) : null;
    if (rumour) {
      for (const heard of rumour.heard) {
        const at = pointOf(heard.place);
        if (!at) continue;
        out += `<circle class="ws-map__rumour" cx="${at[0].toFixed(1)}" cy="${at[1].toFixed(1)}" r="${22 * k}" stroke-width="${2.5 * k}" data-rumour-reached="${esc(heard.place)}"></circle>
          <text class="ws-map__label" x="${(at[0] + 14 * k).toFixed(1)}" y="${(at[1] + 24 * k).toFixed(1)}" font-size="${15 * k}" stroke-width="${4 * k}">${esc(formatDayShort(heard.day))}</text>`;
      }
    }

    if (map.overlays.sickness) {
      for (const ill of overview.sickness || []) {
        const at = pointOf(ill.place);
        if (!at || ill.ended) continue;
        out += `<circle class="ws-map__sick" cx="${at[0].toFixed(1)}" cy="${at[1].toFixed(1)}" r="${(14 + Math.min(16, ill.share * 200)) * k}" stroke-width="${3 * k}" data-sick="${esc(ill.place)}"><title>${esc(ill.sick)} sick with the ${esc(ill.name)}</title></circle>`;
      }
    }

    for (const place of positioned()) {
      const [x, y] = xy(place.position);
      const selected = selectedPlace === place.id;
      const town = place.detail !== "landmark";
      const r = (place.detail === "full" ? 9 : town ? 7 : 5) * k;
      let tone = "";
      if (map.overlays.cost) {
        const cost = costOf(place.id);
        tone = cost == null ? "" : cost >= 1.2 ? " ws-map__place--hot" : cost >= 1.06 ? " ws-map__place--warm" : cost <= 0.95 ? " ws-map__place--cool" : "";
      }
      const party = map.overlays.party && ui.world?.party?.place === place.id;
      out += `<g class="ws-map__place${tone}${selected ? " ws-map__place--on" : ""}" data-act="map-place" data-id="${esc(place.id)}" data-place="${esc(place.id)}"><title>${esc(place.name)}</title>
        <circle class="ws-map__hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${22 * k}"></circle>
        ${party ? `<circle class="ws-map__party" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${16 * k}" stroke-width="${4 * k}"></circle>` : ""}
        ${town
          ? `<circle class="ws-map__dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" stroke-width="${(selected ? 4 : 2.5) * k}"></circle>`
          : `<rect class="ws-map__dot" x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${2 * r}" height="${2 * r}" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})" stroke-width="${(selected ? 4 : 2) * k}"></rect>`}
        ${selected || party || region || map.view.scale >= 1.8
          ? `<text class="ws-map__label" x="${(x + 13 * k).toFixed(1)}" y="${(y - 11 * k).toFixed(1)}" font-size="${17 * k}" stroke-width="${4.5 * k}">${esc(place.name)}</text>` : ""}</g>`;
    }

    if (map.overlays.threats) {
      for (const threat of overview.threats || []) {
        let at = threat.place ? pointOf(threat.place) || pointOf(placeById(threat.place)?.parent) : null;
        if (!at && threat.route) {
          const road = (overview.roads || []).find((entry) => entry.id === threat.route);
          const a = road && pointOf(road.a);
          const b = road && pointOf(road.b);
          if (a && b) at = along(a, b, 0.5);
        }
        if (!at) continue;
        const [x, y] = at;
        out += `<polygon class="ws-map__threat" points="${x.toFixed(1)},${(y - 14 * k).toFixed(1)} ${(x + 12 * k).toFixed(1)},${(y + 9 * k).toFixed(1)} ${(x - 12 * k).toFixed(1)},${(y + 9 * k).toFixed(1)}" stroke-width="${2 * k}" data-threat="${esc(threat.id)}"><title>${esc(threat.label)}${threat.mode === "chance" ? `: ${threat.fill} of ${threat.size}` : ""}</title></polygon>`;
      }
    }
    return out;
  }

  /* ---------------- the panel beside the map ---------------- */

  function worldPanel() {
    const regions = ui.map.regions || [];
    const party = ui.world?.party?.place;
    return `<div class="ws-panel" id="ws-map-panel"><div><h2>Eldoria</h2><p class="ws-meta">${esc(ui.world?.dateText || "")}</p></div>
      <p>Tap a region to move in, then a town. Towns can be tapped straight from here.</p>
      ${regions.length ? `<div><h3>Regions</h3><ul class="ws-plain">${regions.map((region) => `<li><button class="ws-link" type="button" data-act="map-region" data-id="${esc(region.id)}">${esc(region.name)}</button>
        <span class="ws-meta">${positioned().filter((place) => place.region === region.name && place.detail !== "landmark").length} towns</span></li>`).join("")}</ul>
        <p class="ws-meta">The region outlines are a draft for you to correct.</p></div>`
        : `<p class="ws-meta">${ui.map.regionsFailed ? "The region outlines could not be loaded; the towns are still shown." : "Loading the region outlines…"}</p>`}
      <p class="ws-meta">${party ? `The party is in ${esc(placeName(party))}.` : "You have not said where the party is."}</p></div>`;
  }

  function regionPanel(region) {
    const places = positioned().filter((place) => place.region === region.name);
    const ids = new Set(places.map((place) => place.id));
    const roads = (ui.overview?.roads || []).filter((road) => ids.has(road.a) || ids.has(road.b));
    return `<div class="ws-panel" id="ws-map-panel" data-region="${esc(region.id)}"><div><h2>${esc(region.name)}</h2><p class="ws-meta">Region</p></div>
      ${region.basis ? `<p class="ws-meta">Outline (draft): ${esc(region.basis)}</p>` : ""}
      <div><h3>Places</h3><ul class="ws-plain">${places.map((place) => `<li><button class="ws-link" type="button" data-act="map-place" data-id="${esc(place.id)}">${esc(place.name)}</button>
        <span class="ws-meta">${esc(place.kind || "")}${ui.world?.party?.place === place.id ? " · the party is here" : ""}</span></li>`).join("") || `<li class="ws-meta">No places are marked here yet.</li>`}</ul></div>
      ${roads.length ? `<div><h3>Roads</h3><ul class="ws-plain" id="ws-map-roads">${roads.map((road) => `<li>${esc(road.aName)} to ${esc(road.bName)}
        <span class="ws-meta">${road.days} day${road.days === 1 ? "" : "s"}</span>
        ${road.status === "open" ? "" : `<span class="ws-up">${road.status}${road.untilDay != null ? ` until ${esc(formatDayShort(road.untilDay))}` : ""}${road.why?.length ? `: ${esc(road.why.join("; "))}` : ""}</span>`}</li>`).join("")}</ul></div>` : ""}</div>`;
  }

  function mapView() {
    const map = ui.map;
    const region = selectedRegion();
    const place = map.sel?.type === "place" ? placeById(map.sel.id) : null;
    const rumours = ui.overview?.rumours || [];
    const missing = ui.placesLoaded && !positioned().length;
    return `<section id="ws-map">
      <nav class="ws-crumbs" aria-label="Where you are on the map">${map.sel
        ? `<button class="ws-link" type="button" data-act="map-world">Eldoria</button>` : `<b>Eldoria</b>`}${
        region ? ` › ${place ? `<button class="ws-link" type="button" data-act="map-region" data-id="${esc(region.id)}">${esc(region.name)}</button>` : `<b>${esc(region.name)}</b>`}` : ""}${
        place ? ` › <b>${esc(place.name)}</b>` : ""}</nav>
      <div class="ws-row" role="group" aria-label="Show on the map">${OVERLAYS.map(([id, label]) => `<button class="ws-btn ws-btn--small" type="button" aria-pressed="${map.overlays[id] === true}" data-act="map-toggle" data-id="${id}">${label}</button>`).join("")}
        <select id="ws-map-rumour" data-bind="map.rumour" data-rerender="true" aria-label="Show how far a rumour has spread">
          <option value="">No rumour shown</option>${rumours.map((rumour) => `<option value="${esc(rumour.id)}"${map.rumour === rumour.id ? " selected" : ""}>Rumour: ${esc(rumour.trueText.slice(0, 44))}</option>`).join("")}</select></div>
      ${missing ? `<p class="ws-meta ws-error">Your places have no map positions yet. Load the current setup file (Today, then Setup) to place them.</p>` : ""}
      ${ui.placesLoaded ? "" : `<p class="ws-meta">Only the outlines are shown. Load the setup file (Today, then Setup) to see your places on the map.</p>`}
      <div class="ws-cols ws-cols--map">
        <div class="ws-mapcol">
          <div class="ws-mapbox" id="ws-mapbox">
            <div class="ws-map__inner" id="ws-map-inner" style="transform:${transformOf(map.view)}">
              <img src="../../Assets/images/eldoria-map.jpg" alt="Map of Eldoria" draggable="false">
              <svg viewBox="0 0 ${SIZE} ${SIZE}" id="ws-map-svg" role="img" aria-label="Regions, towns and roads">${svgMarkup()}</svg>
            </div>
            <div class="ws-map__zoom"><button class="ws-btn ws-btn--small" type="button" data-act="map-zoom" data-id="in" aria-label="Zoom in">+</button>
              <button class="ws-btn ws-btn--small" type="button" data-act="map-zoom" data-id="out" aria-label="Zoom out">−</button>
              <button class="ws-btn ws-btn--small" type="button" data-act="map-zoom" data-id="reset">Whole map</button></div>
          </div>
          <div class="ws-legend">
            ${map.overlays.party ? `<span><i class="ws-legend__party"></i>Party</span>` : ""}
            ${map.overlays.routes ? `<span><i class="ws-legend__slowed"></i>Road slowed</span><span><i class="ws-legend__closed"></i>Road closed</span>` : ""}
            ${map.overlays.road ? `<span><i class="ws-legend__goods"></i>Caravan</span><span><i class="ws-legend__people"></i>People</span><span><i class="ws-legend__traveller"></i>Traveller</span>` : ""}
            ${map.overlays.cost ? `<span><i class="ws-legend__hot"></i>Much dearer than usual (all goods)</span><span><i class="ws-legend__warm"></i>Dearer</span><span><i class="ws-legend__cool"></i>Cheaper</span>` : ""}
            ${map.overlays.threats ? `<span><i class="ws-legend__threat"></i>Threat</span>` : ""}
            ${map.overlays.sickness ? `<span><i class="ws-legend__sick"></i>Sickness</span>` : ""}
            ${map.rumour ? `<span><i class="ws-legend__rumour"></i>Rumour has arrived (date shown)</span>` : ""}
            <span>Round = town, diamond = landmark</span>
          </div>
        </div>
        ${place ? placePage(place.id) : region ? regionPanel(region) : worldPanel()}
      </div>
    </section>`;
  }

  /* ---------------- actions and gestures ---------------- */

  const actions = {
    "map-world"() {
      ui.map.sel = null;
      ui.map.view = { scale: 1, x: 0, y: 0 };
      render();
    },
    "map-region"(data) {
      if (ui.map.dragged) return;
      const region = (ui.map.regions || []).find((item) => item.id === data.id);
      if (!region) return;
      ui.map.sel = { type: "region", id: region.id };
      ui.map.view = fitView(region.outline);
      render();
    },
    "map-place"(data) {
      if (ui.map.dragged) return;
      const place = placeById(data.id);
      if (!place) return;
      ui.map.sel = { type: "place", id: place.id };
      ui.place = place.id;
      ui.entry = null;
      const region = regionOfPlace(place);
      if (region && ui.map.view.scale === 1) ui.map.view = fitView(region.outline);
      render();
    },
    "map-toggle"(data) {
      ui.map.overlays[data.id] = !ui.map.overlays[data.id];
      render();
    },
    "map-zoom"(data) {
      if (data.id === "reset") setView({ scale: 1, x: 0, y: 0 });
      else zoomAt(data.id === "in" ? 1.5 : 1 / 1.5);
      render();
    }
  };

  // Drag to pan, wheel or pinch to zoom. Bound once on the document; the map box is
  // replaced on every render, so nothing is attached to it directly.
  function bindGestures() {
    const active = new Map();
    let pinch = null;
    let wheelTimer = null;
    const boxOf = (event) => event.target?.closest?.("#ws-mapbox");

    document.addEventListener("pointerdown", (event) => {
      const box = boxOf(event);
      if (!box || event.target.closest(".ws-map__zoom")) return;
      active.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
      ui.map.dragged = false;
      if (active.size === 2) {
        const [a, b] = [...active.values()];
        pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
      }
    });
    document.addEventListener("pointermove", (event) => {
      const held = active.get(event.pointerId);
      const box = $("#ws-mapbox");
      if (!held || !box) return;
      const rect = box.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dx = event.clientX - held.x;
      const dy = event.clientY - held.y;
      held.x = event.clientX;
      held.y = event.clientY;
      if (Math.hypot(event.clientX - held.startX, event.clientY - held.startY) > 6) ui.map.dragged = true;
      if (active.size === 2 && pinch) {
        const [a, b] = [...active.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        zoomAt(distance / pinch.distance, ((a.x + b.x) / 2 - rect.left) / rect.width, ((a.y + b.y) / 2 - rect.top) / rect.height);
        pinch.distance = distance;
        return;
      }
      if (ui.map.dragged) {
        setView({ scale: ui.map.view.scale, x: ui.map.view.x + dx / rect.width, y: ui.map.view.y + dy / rect.height });
      }
    });
    const release = (event) => {
      if (!active.delete(event.pointerId)) return;
      if (active.size < 2) pinch = null;
      // The click that ends a drag must not open whatever was under the finger.
      if (ui.map.dragged) {
        setTimeout(() => {
          ui.map.dragged = false;
          render();
        }, 0);
      }
    };
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    document.addEventListener("wheel", (event) => {
      const box = boxOf(event);
      if (!box) return;
      event.preventDefault();
      const rect = box.getBoundingClientRect();
      zoomAt(event.deltaY < 0 ? 1.2 : 1 / 1.2, rect.width ? (event.clientX - rect.left) / rect.width : 0.5, rect.height ? (event.clientY - rect.top) / rect.height : 0.5);
      // Marks are drawn at a fixed size on screen; redraw them once the wheel settles.
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(render, 160);
    }, { passive: false });
  }

  return { actions, bindGestures, loadRegions, mapView };
}
