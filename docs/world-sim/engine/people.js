// People moving. A town's head count changes only because a written event (or a
// suggestion the DM accepted) says N people go from A to B over D days. The simulation
// never invents a migration. Once written, the move is a running number: so many
// leave each day, spend the road's travel days in between, and arrive. Nobody is
// lost or made on the way. Head counts feed back into how much each town uses.

import { ECONOMY_SYSTEM_ID, figureValue } from "./economy.js";
import { EFFECT_TYPE, effectTakingHold } from "./effects.js";
import { listRoads, placeNameIn, quickestWay } from "./roads.js";

export const PEOPLE_SYSTEM_ID = "people";

/** Most lines about people in one day's report (see the ledger's per-subject cap too). */
export const PEOPLE_REPORT_MIN_SHARE = 0.01; // an arrival under 1% of a town is not news

// Only the CHANGE to each place's head count is kept here: people who have left count
// against it, people who have arrived count for it. The head count itself is the
// figure in the setup plus that change, so correcting a town's size in the setup
// carries straight through.
export function emptyPeopleState() {
  return { change: {}, moves: {}, onTheRoad: [], pendingEffects: {}, groupSeq: 0 };
}

/** A place's head count now: the setup's figure plus who has come and gone. null if it has no figure. */
export function headCountOf(state, placeId) {
  const figure = state?.systems?.[ECONOMY_SYSTEM_ID]?.config?.places?.[placeId]?.population;
  if (figure?.value == null) return null;
  const change = state?.systems?.[PEOPLE_SYSTEM_ID]?.change?.[placeId] || 0;
  return Math.max(0, Math.round(figureValue(figure)) + change);
}

/**
 * Applies one record to the people state, in place. Reads written events with a
 * "people-move" effect, suggested ones (kept until decided), and decisions on those.
 */
export function applyPeopleRecord(people, record) {
  const hold = effectTakingHold(people, record, [EFFECT_TYPE.PEOPLE_MOVE]);
  if (!hold) return false;
  const id = `mv-${hold.eventId}`;
  if (people.moves[id]) return false;
  const { effect } = hold;
  people.moves[id] = {
    id,
    from: effect.from,
    to: effect.to,
    people: effect.people,
    days: effect.days,
    left: 0,
    arrived: 0,
    fromDay: hold.day + 1,
    cause: hold.eventId,
    label: effect.label || String(hold.text || "").trim() || "A written event"
  };
  return true;
}

/**
 * Everyone the state knows about: in the places that have a head count, plus those on
 * the road. Used to prove that a move neither loses nor makes anybody.
 */
export function countPeople(state) {
  const config = state?.systems?.[ECONOMY_SYSTEM_ID]?.config;
  const people = state?.systems?.[PEOPLE_SYSTEM_ID] || emptyPeopleState();
  let total = (people.onTheRoad || []).reduce((sum, group) => sum + group.people, 0);
  for (const placeId of Object.keys(config?.places || {})) {
    total += headCountOf(state, placeId) ?? (people.change?.[placeId] || 0);
  }
  return total;
}

/** The DM's view: head counts against the setup, moves under way and groups on the road. */
export function describePeople(state) {
  const people = state?.systems?.[PEOPLE_SYSTEM_ID] || emptyPeopleState();
  const config = state?.systems?.[ECONOMY_SYSTEM_ID]?.config;
  return {
    population: Object.keys(config?.places || {}).sort().filter((placeId) => headCountOf(state, placeId) != null).map((placeId) => ({
      place: placeId,
      name: placeNameIn(state, placeId),
      now: headCountOf(state, placeId),
      usual: Math.round(figureValue(config.places[placeId].population)),
      change: people.change?.[placeId] || 0
    })),
    moves: Object.values(people.moves || {}).map((move) => ({
      ...move,
      fromName: placeNameIn(state, move.from),
      toName: placeNameIn(state, move.to),
      done: move.arrived >= move.people
    })),
    onTheRoad: (people.onTheRoad || []).map((group) => ({
      ...group,
      fromName: placeNameIn(state, group.from),
      toName: placeNameIn(state, group.to)
    }))
  };
}

export const peopleSystem = Object.freeze({
  id: PEOPLE_SYSTEM_ID,
  init: emptyPeopleState,
  tick(ctx) {
    const people = ctx.state;
    people.change = people.change || {};
    people.moves = people.moves || {};
    people.onTheRoad = people.onTheRoad || [];
    // Head counts as they stand while today is worked out.
    const view = { systems: { ...ctx.world.systems, [PEOPLE_SYSTEM_ID]: people } };
    const roads = listRoads(ctx.world, ctx.day);

    // 1. Groups that arrive today.
    const stillOut = [];
    const arrivals = new Map();
    for (const group of people.onTheRoad) {
      if (group.arriveDay <= ctx.day) {
        people.change[group.to] = (people.change[group.to] || 0) + group.people;
        const move = people.moves[group.move];
        if (move) move.arrived += group.people;
        const key = `${group.move}|${group.to}`;
        arrivals.set(key, { ...(arrivals.get(key) || { move: group.move, to: group.to, from: group.from, people: 0 }) });
        arrivals.get(key).people += group.people;
      } else {
        stillOut.push(group);
      }
    }
    people.onTheRoad = stillOut;

    // 2. People who set out today. A closed road holds them where they are.
    for (const id of Object.keys(people.moves).sort()) {
      const move = people.moves[id];
      if (move.fromDay > ctx.day || move.left >= move.people) continue;
      const way = quickestWay(roads, move.from, move.to);
      if (!way) {
        if (!move.heldSince) {
          move.heldSince = ctx.day;
          ctx.report({
            kind: "People",
            text: `People leaving ${placeNameIn(ctx.world, move.from)} for ${placeNameIn(ctx.world, move.to)} cannot get through; no road is open.`,
            place: move.from
          });
        }
        continue;
      }
      move.heldSince = null;
      const dayNumber = ctx.day - move.fromDay + 1;
      const daysLeft = Math.max(1, move.days - dayNumber + 1);
      const wanted = Math.ceil((move.people - move.left) / daysLeft);
      const available = Math.max(0, headCountOf(view, move.from) ?? 0);
      const going = Math.min(wanted, available, move.people - move.left);
      if (going <= 0) continue;
      people.change[move.from] = (people.change[move.from] || 0) - going;
      move.left += going;
      people.groupSeq = (people.groupSeq || 0) + 1;
      people.onTheRoad.push({
        id: `pg-${ctx.day}-${people.groupSeq}`,
        move: id,
        from: move.from,
        to: move.to,
        people: going,
        departDay: ctx.day,
        arriveDay: ctx.day + Math.max(1, way.days),
        roads: way.roads
      });
    }

    // 3. Finished moves are dropped once everyone has arrived.
    for (const id of Object.keys(people.moves).sort()) {
      const move = people.moves[id];
      if (move.arrived >= move.people) {
        ctx.report({
          kind: "People",
          text: `The last of ${move.people.toLocaleString("en-GB")} people from ${placeNameIn(ctx.world, move.from)} have reached ${placeNameIn(ctx.world, move.to)}.`,
          place: move.to
        });
        delete people.moves[id];
      }
    }

    // 4. Arrivals worth a line: a noticeable share of the town they reach.
    for (const arrival of [...arrivals.values()].sort((a, b) => b.people - a.people || (a.to < b.to ? -1 : 1))) {
      const size = headCountOf(view, arrival.to) || 0;
      if (people.moves[arrival.move] && arrival.people >= Math.max(1, size * PEOPLE_REPORT_MIN_SHARE)) {
        ctx.report({
          kind: "People",
          text: `${arrival.people.toLocaleString("en-GB")} people from ${placeNameIn(ctx.world, arrival.from)} arrive in ${placeNameIn(ctx.world, arrival.to)}.`,
          place: arrival.to
        });
      }
    }
  }
});
