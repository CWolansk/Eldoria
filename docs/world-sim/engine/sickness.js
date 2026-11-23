// Sickness. Nothing here ever starts on its own. Until the DM writes that a sickness
// is real in a place, a "plague" is only a rumour like any other. Once written:
//   - the number of sick grows by a simple logistic rule, capped at a share of the town
//   - the sick recover, so in time it burns out
//   - when it is bad enough, the simulation SUGGESTS that it reaches a connected town;
//     it spreads only if the DM accepts
//   - the town uses more of any good tagged for it in the setup (by tag, never by id)
//   - it ends when the DM writes that it is over, or when it has burnt out

import { EFFECT_TYPE, effectTakingHold } from "./effects.js";
import { headCountOf } from "./people.js";
import { isFullDetail, listRoads, placeNameIn } from "./roads.js";

export const SICKNESS_SYSTEM_ID = "sickness";

/** Starting constants; all in one place and tunable per sickness later. */
export const SICKNESS_DEFAULTS = Object.freeze({
  firstCasesShare: 0.002, // of the town, on the first day (at least firstCasesMin)
  firstCasesMin: 5,
  growth: 0.3, // per day, before the cap bites
  capShare: 0.12, // most of the town that can catch it in all
  recoveryDays: 14, // a case lasts about this long
  spreadSuggestShare: 0.01, // sick share of the town at which it may be suggested elsewhere
  raisesUseOf: "medicine", // the goods tag whose use goes up
  usePerSickShare: 20, // use x (1 + this x sick share): 5% sick doubles it
  burntOutBelow: 1
});

export function emptySicknessState() {
  return { items: {}, pendingEffects: {} };
}

function headCount(world, placeId) {
  return headCountOf(world, placeId) ?? 0;
}

/**
 * Applies one record. Reads written events with a sickness effect, suggested ones
 * (kept until decided) and decisions on those. `world` gives the head count.
 */
export function applySicknessRecord(sickness, record, world) {
  const items = sickness.items || (sickness.items = {});
  const hold = effectTakingHold(sickness, record, [EFFECT_TYPE.SICKNESS_START, EFFECT_TYPE.SICKNESS_END]);
  if (!hold) return false;
  const { effect } = hold;
  if (effect.type === EFFECT_TYPE.SICKNESS_END) {
    const item = items[effect.place];
    if (!item || item.ended) return false;
    item.ended = true;
    item.endDay = hold.day;
    item.endedBy = hold.eventId;
    item.sick = 0;
    return true;
  }
  const existing = items[effect.place];
  if (existing && !existing.ended) return false;
  const people = headCount(world, effect.place);
  items[effect.place] = {
    place: effect.place,
    name: effect.name || "sickness",
    startDay: hold.day,
    cause: hold.eventId,
    sick: Math.min(people, Math.max(SICKNESS_DEFAULTS.firstCasesMin, Math.round(people * SICKNESS_DEFAULTS.firstCasesShare))),
    recovered: 0,
    peak: 0,
    ended: false,
    endDay: null,
    endedBy: null,
    raisesUseOf: SICKNESS_DEFAULTS.raisesUseOf,
    usePerSickShare: SICKNESS_DEFAULTS.usePerSickShare,
    suggestedTo: {}
  };
  return true;
}

/** The DM's view of every sickness the record has made real. */
export function describeSickness(state) {
  const items = state?.systems?.[SICKNESS_SYSTEM_ID]?.items || {};
  return Object.values(items).sort((a, b) => a.startDay - b.startDay || (a.place < b.place ? -1 : 1)).map((item) => {
    const people = headCount(state, item.place);
    return {
      place: item.place,
      placeName: placeNameIn(state, item.place),
      name: item.name,
      startDay: item.startDay,
      sick: Math.round(item.sick),
      recovered: Math.round(item.recovered),
      share: people > 0 ? item.sick / people : 0,
      ended: item.ended,
      endDay: item.endDay,
      cause: item.cause
    };
  });
}

export const sicknessSystem = Object.freeze({
  id: SICKNESS_SYSTEM_ID,
  init: emptySicknessState,
  tick(ctx) {
    const items = ctx.state.items || (ctx.state.items = {});
    const constants = SICKNESS_DEFAULTS;
    const roads = listRoads(ctx.world, ctx.day);
    for (const placeId of Object.keys(items).sort()) {
      const item = items[placeId];
      if (item.ended || item.startDay >= ctx.day) continue;
      const people = headCount(ctx.world, placeId);
      const cap = people * constants.capShare;
      const room = Math.max(0, 1 - (item.sick + item.recovered) / Math.max(cap, 1e-9));
      const caught = constants.growth * item.sick * room;
      const better = item.sick / constants.recoveryDays;
      const before = item.sick;
      item.sick = Math.max(0, item.sick + caught - better);
      item.recovered += better;
      item.peak = Math.max(item.peak, item.sick);

      if (item.sick < constants.burntOutBelow) {
        item.ended = true;
        item.endDay = ctx.day;
        item.sick = 0;
        ctx.report({ kind: "Sickness", text: `The ${item.name} in ${placeNameIn(ctx.world, placeId)} has burnt itself out.`, place: placeId, direction: "down" });
        continue;
      }
      // One line when the count has moved by a fifth since it was last mentioned.
      const mentioned = item.reported ?? 0;
      if (mentioned === 0 || Math.abs(item.sick - mentioned) >= mentioned * 0.2) {
        item.reported = item.sick;
        ctx.report({
          kind: "Sickness",
          text: `${Math.round(item.sick).toLocaleString("en-GB")} sick with the ${item.name} in ${placeNameIn(ctx.world, placeId)}.`,
          place: placeId,
          direction: item.sick >= before ? "up" : "down"
        });
      }

      // It may reach a neighbour, but only as a suggestion, once per neighbour.
      if (people > 0 && item.sick / people >= constants.spreadSuggestShare) {
        for (const road of roads) {
          if (road.status === "closed") continue;
          const other = road.a === placeId ? road.b : road.b === placeId ? road.a : null;
          if (!other || item.suggestedTo[other] || !isFullDetail(ctx.world, other)) continue;
          const there = items[other];
          if (there && !there.ended) continue;
          item.suggestedTo[other] = ctx.day;
          ctx.suggest({
            text: `The ${item.name} reaches ${placeNameIn(ctx.world, other)}.`,
            place: other,
            why: `About ${Math.round(item.sick / people * 100)}% of ${placeNameIn(ctx.world, placeId)} is sick, and the road to ${placeNameIn(ctx.world, other)} is open.`,
            causedBy: item.cause,
            effect: { type: EFFECT_TYPE.SICKNESS_START, place: other, name: item.name, label: null },
            tags: ["sickness:spread"]
          });
          break; // at most one such suggestion a day from one place
        }
      }
    }
  }
});
