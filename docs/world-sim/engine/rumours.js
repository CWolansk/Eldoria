// Rumours: what people are saying, as against what is true.
//
// A rumour exists only because the DM started it: about a written event (truth
// "written"), or as talk whose truth is not written (truth "unwritten"). It says five
// things: who, what, where, how big, and whether it flatters. It travels along the
// roads at the speed of travellers. Each hop may bend exactly one of the five (a
// seeded roll), so every town may be telling a slightly different tale. The truth is
// always kept beside each town's version, with what was bent and where.
//
// What a town says is only the DM's own words: who, what and where. Nothing is
// appended to it. How big it is, whether it flatters and whether the tale has gone
// vague are tags the DM sees beside the telling, never sentences.
//
// A rumour reaching a town is a running fact. Anything that follows from it (a town
// growing wary of travellers) is only suggested, with its effect attached.
// Players see none of it until the DM reveals a rumour in a town.

import { listRoads, isFullDetail, placeNameIn, roadBetween } from "./roads.js";

export const RUMOUR_SYSTEM_ID = "rumours";
export const RUMOUR_TRUTH = Object.freeze({ WRITTEN: "written", UNWRITTEN: "unwritten" });
export const RUMOUR_ATTRIBUTES = Object.freeze(["who", "what", "where", "size", "flatters"]);

export const RUMOUR_DEFAULTS = Object.freeze({
  bendChance: 0.5, // chance that a hop bends one attribute
  maxSuggestionsPerDay: 2,
  waryRoadFlow: 0.35,
  waryDays: 8
});

// How big, as one plain word for a tag. 2 is ordinary and has no tag.
const SIZE_WORDS = Object.freeze({ 1: "small", 3: "big", 4: "enormous", 5: "unheard of" });

// What changed on a hop, as the DM reads it.
export const RUMOUR_BEND_LABELS = Object.freeze({
  who: "who was lost",
  what: "what got vague",
  where: "place moved",
  size: "grew in the telling",
  flatters: "tone flipped"
});

// Worlds saved before 2026-11-23 marked a vague tale by appending this to "what" and
// a lost name as "a stranger". Both are still read, and no longer written.
const LEGACY_VAGUE = ", or something like it";
const LEGACY_LOST_WHO = "a stranger";
const LOST_WHO = "someone";

function isVague(version) {
  return version?.vague === true || String(version?.what ?? "").endsWith(LEGACY_VAGUE);
}

function plainWhat(version) {
  const what = String(version?.what ?? "");
  return what.endsWith(LEGACY_VAGUE) ? what.slice(0, -LEGACY_VAGUE.length) : what;
}

function plainWho(version) {
  const who = text(version?.who);
  return !who || who.toLowerCase() === LEGACY_LOST_WHO ? LOST_WHO : who;
}

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

function normalizeVersion(input = {}) {
  const size = input.size == null || input.size === "" ? 2 : Number(input.size);
  if (!Number.isInteger(size) || size < 1 || size > 5) {
    throw fail("How big is a whole number from 1 (small) to 5 (unheard of).");
  }
  const flatters = input.flatters === true || input.flatters === "true" ? true
    : input.flatters === false || input.flatters === "false" ? false : null;
  const what = text(input.what);
  if (!what) throw fail("Say what the rumour says happened.");
  return { who: text(input.who) || "someone", what, where: text(input.where) || null, size, flatters };
}

/** Row: the DM starts a rumour. `eventId` is the written event it is about, if any. */
export function createRumourStart(input) {
  const eventId = text(input.eventId) || null;
  const truth = input.truth === RUMOUR_TRUTH.WRITTEN ? RUMOUR_TRUTH.WRITTEN : RUMOUR_TRUTH.UNWRITTEN;
  if (truth === RUMOUR_TRUTH.WRITTEN && !eventId) {
    throw fail("A rumour that is true points at the written event it is about.");
  }
  const origin = text(input.origin);
  if (!origin) throw fail("Say where the rumour starts.");
  const version = normalizeVersion(input);
  if (!version.where) version.where = origin;
  const id = text(input.id);
  const rumourId = text(input.rumourId);
  if (!id || !rumourId) throw fail("Record id and rumour id are required.");
  return {
    recordType: "rumour", id, action: "start", rumourId, day: requireDay(input.day), at: input.at ?? null,
    rumour: { eventId, truth, origin, ...version }
  };
}

/** Row: the DM stops a rumour spreading further. What towns already say stays said. */
export function createRumourEnd(input) {
  const id = text(input.id);
  const rumourId = text(input.rumourId);
  if (!id || !rumourId) throw fail("Record id and rumour id are required.");
  return { recordType: "rumour", id, action: "end", rumourId, day: requireDay(input.day), at: input.at ?? null };
}

/** Row: the DM writes that a rumour is true after all, pointing at the written event. */
export function createRumourConfirm(input) {
  const id = text(input.id);
  const rumourId = text(input.rumourId);
  const eventId = text(input.eventId);
  if (!id || !rumourId || !eventId) throw fail("Record id, rumour id and the written event are required.");
  return { recordType: "rumour", id, action: "confirm", rumourId, eventId, day: requireDay(input.day), at: input.at ?? null };
}

/** Row: the DM lets the players hear a rumour in one town (or takes that back). */
export function createRumourReveal(input) {
  const id = text(input.id);
  const rumourId = text(input.rumourId);
  const place = text(input.place);
  if (!id || !rumourId || !place) throw fail("Record id, rumour id and the town are required.");
  return {
    recordType: "rumour", id, action: "reveal", rumourId, place,
    playersVisible: input.playersVisible === true, day: requireDay(input.day), at: input.at ?? null
  };
}

export function emptyRumourState() {
  return { items: {} };
}

/** Applies one rumour row to the state, in place. Returns true if it changed anything. */
export function applyRumourRecord(rumours, record) {
  if (record?.recordType !== "rumour") return false;
  const items = rumours.items || (rumours.items = {});
  if (record.action === "start") {
    if (items[record.rumourId]) return false;
    const { eventId, truth, origin, ...version } = record.rumour;
    items[record.rumourId] = {
      id: record.rumourId,
      eventId,
      truth,
      origin,
      startDay: record.day,
      version,
      heard: { [origin]: { day: record.day, from: null, bent: null, version: { ...version }, playersVisible: false } },
      wary: {},
      ended: false
    };
    return true;
  }
  const item = items[record.rumourId];
  if (!item) return false;
  if (record.action === "end") {
    item.ended = true;
    item.endDay = record.day;
    return true;
  }
  if (record.action === "confirm") {
    item.truth = RUMOUR_TRUTH.WRITTEN;
    item.eventId = record.eventId;
    return true;
  }
  if (record.action === "reveal") {
    const heard = item.heard[record.place];
    if (!heard) return false;
    heard.playersVisible = record.playersVisible === true;
    return true;
  }
  return false;
}

function capital(value) {
  const words = text(value);
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : words;
}

/** One town's telling: who, what and where, in the DM's own words. Nothing is appended. */
export function rumourText(version, state) {
  const where = version.where ? placeNameIn(state, version.where) : "";
  return `${capital(plainWho(version))} ${plainWhat(version)}${where ? ` in ${where}` : ""}.`;
}

/** The parts of a telling that are not in its words, as short tags for the DM. */
export function rumourTags(version) {
  const tags = [];
  if (version?.flatters === true) tags.push("flattering");
  if (version?.flatters === false) tags.push("unflattering");
  if (SIZE_WORDS[version?.size]) tags.push(SIZE_WORDS[version.size]);
  if (isVague(version)) tags.push("vague");
  return tags;
}

/**
 * How one attribute bends on a hop from `from`: { from, to, apply(version) }, or null if
 * it cannot bend further. A bend changes a field; it never adds words to the telling.
 */
function bendOf(attribute, version, from) {
  if (attribute === "who") {
    // The teller no longer knows who it was.
    if (plainWho(version) === LOST_WHO) return null;
    return { from: version.who, to: LOST_WHO, apply: (next) => { next.who = LOST_WHO; } };
  }
  if (attribute === "what") {
    // The tale goes vague: the words stay as the DM wrote them, and a tag says so.
    if (isVague(version)) return null;
    return { from: "clear", to: "vague", apply: (next) => { next.vague = true; } };
  }
  if (attribute === "where") {
    if (!from || from === version.where) return null;
    return { from: version.where, to: from, apply: (next) => { next.where = from; } };
  }
  if (attribute === "size") {
    if (!(version.size < 5)) return null;
    return { from: version.size, to: version.size + 1, apply: (next) => { next.size = version.size + 1; } };
  }
  if (attribute === "flatters") {
    if (version.flatters == null) return null;
    return { from: version.flatters, to: !version.flatters, apply: (next) => { next.flatters = !version.flatters; } };
  }
  return null;
}

/** The DM's view: the truth, and what each town is saying, when, bent how, and where next. */
export function describeRumours(state) {
  const items = state?.systems?.[RUMOUR_SYSTEM_ID]?.items || {};
  const roads = listRoads(state, state?.day);
  return Object.values(items).sort((a, b) => a.startDay - b.startDay || (a.id < b.id ? -1 : 1)).map((item) => {
    const next = [];
    if (!item.ended) {
      for (const road of roads) {
        for (const [source, target] of [[road.a, road.b], [road.b, road.a]]) {
          if (!item.heard[source] || item.heard[target]) continue;
          next.push({
            place: target, name: placeNameIn(state, target), from: source,
            day: Number.isFinite(road.travel) ? Math.max(state.day + 1, item.heard[source].day + road.travel) : null,
            blocked: !Number.isFinite(road.travel)
          });
        }
      }
    }
    const soonest = new Map();
    for (const entry of next) {
      const known = soonest.get(entry.place);
      if (!known || (entry.day != null && (known.day == null || entry.day < known.day))) soonest.set(entry.place, entry);
    }
    return {
      id: item.id,
      eventId: item.eventId,
      truth: item.truth,
      origin: item.origin,
      originName: placeNameIn(state, item.origin),
      startDay: item.startDay,
      ended: item.ended,
      version: { ...item.version },
      trueText: rumourText(item.version, state),
      tags: rumourTags(item.version),
      heard: Object.keys(item.heard).sort((a, b) => item.heard[a].day - item.heard[b].day || (a < b ? -1 : 1)).map((place) => {
        const heard = item.heard[place];
        return {
          place,
          name: placeNameIn(state, place),
          day: heard.day,
          from: heard.from,
          fromName: heard.from ? placeNameIn(state, heard.from) : null,
          bent: heard.bent,
          bentLabel: heard.bent ? (RUMOUR_BEND_LABELS[heard.bent.attribute] || heard.bent.attribute) : null,
          text: rumourText(heard.version, state),
          tags: rumourTags(heard.version),
          differs: JSON.stringify(heard.version) !== JSON.stringify(item.version),
          playersVisible: heard.playersVisible === true
        };
      }),
      next: [...soonest.values()].sort((a, b) => (a.day ?? Infinity) - (b.day ?? Infinity) || (a.place < b.place ? -1 : 1))
    };
  });
}

/**
 * What players may hear: rumours the DM has revealed in one town, as that town tells
 * them, and only if the players know the town. Never the truth, never where else a
 * rumour has reached, never one that was not revealed there.
 * Returns { place: { name } | null, rumours: [{ text }] }; every other case is empty.
 */
export function publicRumours(state, placeId) {
  const empty = { place: null, rumours: [] };
  const places = state?.systems?.economy?.config?.places || {};
  const place = places[placeId];
  if (!place || place.knownToPlayers !== true) {
    return empty;
  }
  const items = state?.systems?.[RUMOUR_SYSTEM_ID]?.items || {};
  const rumours = Object.values(items)
    .filter((item) => item.heard[placeId]?.playersVisible === true)
    .sort((a, b) => a.heard[placeId].day - b.heard[placeId].day || (a.id < b.id ? -1 : 1))
    .map((item) => {
      const version = { ...item.heard[placeId].version };
      // A place the players do not know is never named: the tale simply does not say where.
      if (places[version.where] && places[version.where].knownToPlayers !== true) {
        version.where = null;
      }
      return { text: rumourText(version, state) };
    });
  return { place: { name: place.name }, rumours };
}

export const rumoursSystem = Object.freeze({
  id: RUMOUR_SYSTEM_ID,
  init: emptyRumourState,
  tick(ctx) {
    const items = ctx.state.items || (ctx.state.items = {});
    const constants = RUMOUR_DEFAULTS;
    const roads = listRoads(ctx.world, ctx.day);
    let suggested = 0;
    for (const id of Object.keys(items).sort()) {
      const item = items[id];
      if (item.ended) continue;
      // Who had heard it before today: a rumour moves one town at a time.
      const before = { ...item.heard };
      const arrivals = new Map();
      for (const road of roads) {
        if (!Number.isFinite(road.travel)) continue; // a closed road carries no talk
        for (const [source, target] of [[road.a, road.b], [road.b, road.a]]) {
          const told = before[source];
          if (!told || before[target] || ctx.day < told.day + road.travel) continue;
          const known = arrivals.get(target);
          if (!known || told.day < known.told.day || (told.day === known.told.day && road.id < known.road.id)) {
            arrivals.set(target, { source, told, road });
          }
        }
      }
      for (const target of [...arrivals.keys()].sort()) {
        const { source, told } = arrivals.get(target);
        const version = { ...told.version };
        let bent = null;
        const roll = ctx.rngFor(`${id}:${target}`);
        if (roll.chance(constants.bendChance)) {
          const able = RUMOUR_ATTRIBUTES.filter((attribute) => bendOf(attribute, version, source) != null);
          const attribute = roll.pick(able);
          if (attribute) {
            const bend = bendOf(attribute, version, source);
            bent = { attribute, from: bend.from, to: bend.to };
            bend.apply(version);
          }
        }
        item.heard[target] = { day: ctx.day, from: source, bent, version, playersVisible: false };
        ctx.report({
          kind: "Rumour",
          text: `Word reaches ${placeNameIn(ctx.world, target)}: "${rumourText(version, ctx.world)}"`,
          place: target,
          rumourId: id
        });

        // A consequence is only ever suggested: a town that hears ill of a neighbour
        // it shares a road with may grow wary of travellers from there.
        const road = roadBetween(roads, target, item.origin);
        if (version.flatters === false && target !== item.origin && road && road.status !== "closed"
          && isFullDetail(ctx.world, target) && !item.wary[target] && suggested < constants.maxSuggestionsPerDay) {
          suggested += 1;
          item.wary[target] = ctx.day;
          ctx.suggest({
            text: `${placeNameIn(ctx.world, target)} grows wary of travellers from ${placeNameIn(ctx.world, item.origin)}.`,
            place: target,
            why: `The talk reached ${placeNameIn(ctx.world, target)} today: "${rumourText(version, ctx.world)}"`,
            causedBy: item.eventId,
            effect: {
              type: "pressure", target: "route", route: road.id, multiplier: constants.waryRoadFlow,
              days: constants.waryDays, label: `${placeNameIn(ctx.world, target)} wary of ${placeNameIn(ctx.world, item.origin)}`
            },
            tags: ["rumour:wary", `rumour:${id}`]
          });
        }
      }
    }
  }
});
