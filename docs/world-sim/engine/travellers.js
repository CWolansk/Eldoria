// Travelling NPCs. A named person the DM has given an itinerary: a list of stops,
// each with how many days they stay. They move along the roads at travel speed and
// that is all: no goals, no needs, nothing happens to them unless the DM writes it.
// Where they are is a running number, like a caravan on the road.

import { listRoads, placeNameIn, quickestWay } from "./roads.js";

export const TRAVELLER_SYSTEM_ID = "travellers";
const MAX_STOPS = 12;

function fail(message) {
  return Object.assign(new TypeError(message), { statusCode: 400 });
}

function text(value) {
  return String(value ?? "").trim();
}

function requireDay(day) {
  if (!Number.isInteger(day) || day < 0) throw fail("day must be a whole number.");
  return day;
}

/** Row: the DM gives an NPC an itinerary (replacing any they had). */
export function createItinerary(input) {
  const id = text(input.id);
  const npcId = text(input.npcId);
  const name = text(input.name);
  if (!id || !npcId || !name) throw fail("Record id, the NPC and their name are required.");
  const stops = (Array.isArray(input.stops) ? input.stops : []).map((stop) => {
    const place = text(stop?.place);
    const stay = stop?.stay == null || stop.stay === "" ? 1 : Number(stop.stay);
    if (!place) throw fail("Each stop needs a place.");
    if (!Number.isInteger(stay) || stay < 0 || stay > 2000) throw fail("A stay is a whole number of days.");
    return { place, stay };
  });
  if (stops.length < 2) throw fail("An itinerary needs at least two stops.");
  if (stops.length > MAX_STOPS) throw fail(`An itinerary has at most ${MAX_STOPS} stops.`);
  for (let index = 1; index < stops.length; index += 1) {
    if (stops[index].place === stops[index - 1].place) throw fail("Two stops in a row are the same place.");
  }
  return {
    recordType: "traveller", id, action: "set", npcId, name, day: requireDay(input.day), at: input.at ?? null,
    stops, loop: input.loop === true
  };
}

/** Row: the DM ends an NPC's travels. They stay where they are (or go back to nowhere in particular). */
export function createItineraryClear(input) {
  const id = text(input.id);
  const npcId = text(input.npcId);
  if (!id || !npcId) throw fail("Record id and the NPC are required.");
  return { recordType: "traveller", id, action: "clear", npcId, day: requireDay(input.day), at: input.at ?? null };
}

export function emptyTravellerState() {
  return { items: {} };
}

export function applyTravellerRecord(travellers, record) {
  if (record?.recordType !== "traveller") return false;
  const items = travellers.items || (travellers.items = {});
  if (record.action === "set") {
    items[record.npcId] = {
      npcId: record.npcId,
      name: record.name,
      stops: record.stops.map((stop) => ({ ...stop })),
      loop: record.loop === true,
      index: 0,
      at: record.stops[0].place,
      leaveDay: record.day + record.stops[0].stay,
      from: null,
      to: null,
      departDay: null,
      arriveDay: null,
      roads: [],
      held: false,
      done: false
    };
    return true;
  }
  if (record.action === "clear") {
    if (!items[record.npcId]) return false;
    delete items[record.npcId];
    return true;
  }
  return false;
}

/** Where every travelling NPC is: in a place, or on the road between two. */
export function describeTravellers(state) {
  const items = state?.systems?.[TRAVELLER_SYSTEM_ID]?.items || {};
  return Object.values(items).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).map((item) => ({
    npcId: item.npcId,
    name: item.name,
    at: item.at,
    atName: item.at ? placeNameIn(state, item.at) : null,
    from: item.from,
    fromName: item.from ? placeNameIn(state, item.from) : null,
    to: item.to,
    toName: item.to ? placeNameIn(state, item.to) : null,
    departDay: item.departDay,
    arriveDay: item.arriveDay,
    leaveDay: item.at ? item.leaveDay : null,
    roads: item.roads || [],
    held: item.held === true,
    done: item.done === true,
    loop: item.loop,
    stops: item.stops.map((stop) => ({ ...stop, name: placeNameIn(state, stop.place) })),
    nextStop: item.done ? null : item.stops[(item.index + 1) % item.stops.length]?.place ?? null
  }));
}

export const travellersSystem = Object.freeze({
  id: TRAVELLER_SYSTEM_ID,
  init: emptyTravellerState,
  tick(ctx) {
    const items = ctx.state.items || (ctx.state.items = {});
    const roads = listRoads(ctx.world, ctx.day);
    for (const npcId of Object.keys(items).sort()) {
      const item = items[npcId];
      if (item.done) continue;

      if (!item.at && ctx.day >= item.arriveDay) {
        item.at = item.to;
        item.index = (item.index + 1) % item.stops.length;
        item.leaveDay = ctx.day + item.stops[item.index].stay;
        item.from = null;
        item.to = null;
        item.roads = [];
        ctx.report({ kind: "Traveller", text: `${item.name} arrives in ${placeNameIn(ctx.world, item.at)}.`, place: item.at, npcId });
        if (item.index === item.stops.length - 1 && !item.loop) {
          item.done = true;
        }
        continue;
      }

      if (item.at && ctx.day >= item.leaveDay) {
        const nextIndex = (item.index + 1) % item.stops.length;
        if (nextIndex === 0 && !item.loop) {
          item.done = true;
          continue;
        }
        const way = quickestWay(roads, item.at, item.stops[nextIndex].place);
        if (!way) {
          if (!item.held) {
            item.held = true;
            ctx.report({
              kind: "Traveller",
              text: `${item.name} cannot leave ${placeNameIn(ctx.world, item.at)} for ${placeNameIn(ctx.world, item.stops[nextIndex].place)}; no road is open.`,
              place: item.at,
              npcId
            });
          }
          continue;
        }
        item.held = false;
        item.from = item.at;
        item.to = item.stops[nextIndex].place;
        item.at = null;
        item.departDay = ctx.day;
        item.arriveDay = ctx.day + Math.max(1, way.days);
        item.roads = way.roads;
      }
    }
  }
});
