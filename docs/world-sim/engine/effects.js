// What an event does to the running numbers. null means "just a fact".
//
//   pressure        make / use of a good in a place, or a road slowed or closed (economy.js)
//   people-move     N people go from one place to another over D days (people.js)
//   sickness-start  a sickness is real in a place (sickness.js)
//   sickness-end    it is over there
//
// One effect per event. Each subject reads only its own kind, and every kind works
// the same way: a written event applies it; a suggested event carries it until the DM
// accepts (applies) or rejects (dropped).

import { effectProblem, normalizeEffect } from "./economy.js";
import { ECONOMY_SYSTEM_ID } from "./economy.js";

export const EFFECT_TYPE = Object.freeze({
  PRESSURE: "pressure",
  PEOPLE_MOVE: "people-move",
  SICKNESS_START: "sickness-start",
  SICKNESS_END: "sickness-end"
});

function fail(message) {
  return Object.assign(new TypeError(message), { statusCode: 400 });
}

function text(value) {
  return String(value ?? "").trim();
}

/** Checks and tidies any effect. Throws a TypeError with a plain message if it is not valid. */
export function normalizeWorldEffect(input) {
  if (input == null) {
    return null;
  }
  if (typeof input !== "object") {
    throw fail("An effect must be an object or left out.");
  }
  const type = text(input.type);
  if (type === EFFECT_TYPE.PRESSURE) {
    return normalizeEffect(input);
  }
  if (type === EFFECT_TYPE.PEOPLE_MOVE) {
    const from = text(input.from);
    const to = text(input.to);
    const people = Number(input.people);
    const days = input.days == null || input.days === "" ? 1 : Number(input.days);
    if (!from || !to || from === to) throw fail("Say where the people leave and where they go: two different places.");
    if (!Number.isInteger(people) || people < 1 || people > 10_000_000) throw fail("Say how many people, as a whole number.");
    if (!Number.isInteger(days) || days < 1 || days > 2000) throw fail("People leave over a whole number of days.");
    return { type, from, to, people, days, label: text(input.label) || null };
  }
  if (type === EFFECT_TYPE.SICKNESS_START) {
    const place = text(input.place);
    if (!place) throw fail("Say where the sickness is.");
    return { type, place, name: text(input.name) || "sickness", label: text(input.label) || null };
  }
  if (type === EFFECT_TYPE.SICKNESS_END) {
    const place = text(input.place);
    if (!place) throw fail("Say where the sickness has ended.");
    return { type, place, label: text(input.label) || null };
  }
  throw fail("That kind of effect is not known.");
}

/** Why an effect cannot apply to the world as it is, or "" if it can. */
export function worldEffectProblem(state, effect) {
  if (!effect) return "";
  if (effect.type === EFFECT_TYPE.PRESSURE) {
    return effectProblem(state, effect);
  }
  const config = state?.systems?.[ECONOMY_SYSTEM_ID]?.config;
  if (!config) {
    return "No places are set up yet, so an event cannot change the numbers. Load the setup file first.";
  }
  const known = (id) => Boolean(config.places[id]);
  const counted = (id) => config.places[id]?.population?.value != null;
  if (effect.type === EFFECT_TYPE.PEOPLE_MOVE) {
    if (!known(effect.from) || !known(effect.to)) return "People move between places in your setup. One of those is not in it.";
    if (!counted(effect.from)) return "The place they leave has no head count yet. Give it one first, or write this as a plain fact.";
    return "";
  }
  if (effect.type === EFFECT_TYPE.SICKNESS_START) {
    if (!known(effect.place)) return "That place is not in your setup.";
    if (!counted(effect.place)) return "That place has no head count yet, so a sickness there cannot be followed. Give it one, or write this as a plain fact.";
    if (state?.systems?.sickness?.items?.[effect.place] && !state.systems.sickness.items[effect.place].ended) {
      return "A sickness is already being followed there.";
    }
    return "";
  }
  if (effect.type === EFFECT_TYPE.SICKNESS_END) {
    const item = state?.systems?.sickness?.items?.[effect.place];
    return item && !item.ended ? "" : "No sickness is being followed there.";
  }
  return "That kind of effect is not known.";
}

/**
 * The shared rule for when an effect takes hold, for one subject's kind(s) of effect.
 * `holder.pendingEffects` remembers effects on suggested events until the DM decides.
 * Returns { effect, eventId, day, text } when the row makes an effect take hold now,
 * otherwise null. Applying the same rows again changes nothing (ids guard that).
 */
export function effectTakingHold(holder, record, types) {
  const pending = holder.pendingEffects || (holder.pendingEffects = {});
  if (record?.recordType === "event" && record.effect && types.includes(record.effect.type)) {
    if (record.status === "written") {
      return { effect: record.effect, eventId: record.id, day: record.day, text: record.text };
    }
    if (record.status === "suggested") {
      pending[record.id] = { effect: record.effect, text: record.text };
    }
    return null;
  }
  if (record?.recordType === "decision" && pending[record.eventId]) {
    const waiting = pending[record.eventId];
    delete pending[record.eventId];
    if (record.decision === "reject") {
      return null;
    }
    return { effect: waiting.effect, eventId: record.eventId, day: record.day, text: record.text || waiting.text };
  }
  return null;
}
