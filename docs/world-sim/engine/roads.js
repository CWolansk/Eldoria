// Roads, as every subject sees them. The roads themselves (ends and travel days) are
// part of the setup the economy holds; a road is open, slowed or closed by the
// pressures written events put on it. Rumours, people and travellers all move along
// the same roads at the same speed as caravans, so this is the one place that says
// how long a road takes today.

import { ECONOMY_SYSTEM_ID, activePressures, figureValue, routeMultiplier } from "./economy.js";

/**
 * Every road in the setup with its state on `day`.
 *   { id, a, b, days, flow, travel, status, why }
 * flow is 1 when open, below 1 when slowed, 0 when closed. travel is the whole number
 * of days a crossing takes today (Infinity when closed). why names what weighs on it.
 */
export function listRoads(state, day = state?.day) {
  const eco = state?.systems?.[ECONOMY_SYSTEM_ID];
  if (!eco?.config) {
    return [];
  }
  const pressures = activePressures(eco, day);
  return eco.config.routes.map((route) => {
    const flow = routeMultiplier(pressures, route.id);
    const days = figureValue(route.travelDays, 1);
    const blocking = pressures.filter((pressure) => pressure.target === "route" && pressure.route === route.id);
    return {
      id: route.id,
      a: route.a,
      b: route.b,
      days,
      flow,
      travel: flow <= 0 ? Infinity : Math.max(1, Math.ceil(days / flow)),
      status: flow <= 0 ? "closed" : flow < 1 ? "slowed" : "open",
      why: blocking.map((pressure) => pressure.label),
      untilDay: blocking.length && blocking.every((pressure) => pressure.untilDay != null)
        ? Math.max(...blocking.map((pressure) => pressure.untilDay))
        : null
    };
  });
}

/** The road joining two places directly, or null. */
export function roadBetween(roads, a, b) {
  return roads.find((road) => (road.a === a && road.b === b) || (road.a === b && road.b === a)) || null;
}

/**
 * The quickest way from one place to another over roads that are open today.
 * Returns { places: [from, ..., to], roads: [roadId, ...], days } or null if there is
 * no way through. Ties are broken by road id, so the answer never depends on order.
 */
export function quickestWay(roads, from, to) {
  if (from === to) {
    return { places: [from], roads: [], days: 0 };
  }
  const best = new Map([[from, { days: 0, via: null, road: null }]]);
  const open = new Set([from]);
  const done = new Set();
  while (open.size) {
    let current = null;
    for (const id of [...open].sort()) {
      if (current == null || best.get(id).days < best.get(current).days) current = id;
    }
    open.delete(current);
    done.add(current);
    if (current === to) break;
    for (const road of roads) {
      if (!Number.isFinite(road.travel)) continue;
      const other = road.a === current ? road.b : road.b === current ? road.a : null;
      if (other == null || done.has(other)) continue;
      const days = best.get(current).days + road.travel;
      const known = best.get(other);
      if (!known || days < known.days || (days === known.days && road.id < known.road)) {
        best.set(other, { days, via: current, road: road.id });
        open.add(other);
      }
    }
  }
  if (!best.has(to)) {
    return null;
  }
  const places = [];
  const used = [];
  for (let at = to; at != null; at = best.get(at).via) {
    places.unshift(at);
    if (best.get(at).road) used.unshift(best.get(at).road);
  }
  return { places, roads: used, days: best.get(to).days };
}

/** A place's name from the setup, or its id if the setup does not list it. */
export function placeNameIn(state, id) {
  if (!id) return "";
  return state?.systems?.[ECONOMY_SYSTEM_ID]?.config?.places?.[id]?.name || String(id);
}

/** True for a place with a market: the places the simulation follows in full. */
export function isFullDetail(state, id) {
  return Boolean(state?.systems?.[ECONOMY_SYSTEM_ID]?.markets?.[id]);
}
