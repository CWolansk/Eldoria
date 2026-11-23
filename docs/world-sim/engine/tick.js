// The daily tick. Pure: given the same state, written events and seed it
// returns the same result, and it never touches its inputs.
//
// The tick itself knows nothing about goods, people, travellers, threats,
// roads or rumours. Each of those is a "subject system" registered in a
// registry. Every system gets the same context and the same powers, so no
// subject is built in more deeply than another. Stage 0 ships with none.

import { createRng, daySeed } from "./rng.js";
import { createSuggestedEvent } from "./events.js";

export const ENGINE_VERSION = "0.2.0";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

/**
 * A registry of subject systems. A system is:
 *   {
 *     id: "goods",                      // unique, also its state key and rng stream
 *     init?(world) -> state,            // starting state for this system (optional)
 *     tick(ctx) -> void                 // advance one day
 *   }
 * ctx = {
 *   day,            // the day being simulated (the new day)
 *   rng,            // seeded generator private to this system and day
 *   rngFor(name),   // a further generator for one named thing inside the system,
 *                   // so adding a second thing does not change the first one's rolls
 *   state,          // this system's own state; mutate it freely (it is a copy)
 *   world,          // read-only view of the whole state before this tick
 *   writtenEvents,  // canon events, read-only
 *   report(entry),  // add a running-number line: { kind, text, place?, ... }
 *   suggest(event)  // propose an event: { text, place?, why?, causedBy?, effect?, tags? };
 *                   // returns the suggested event record (with its id)
 * }
 * Systems run in id order so registration order cannot change the outcome.
 */
export function createRegistry(systems = []) {
  const byId = new Map();
  const registry = {
    register(system) {
      const id = String(system?.id ?? "").trim();
      if (!id) {
        throw new TypeError("A subject system needs an id.");
      }
      if (typeof system.tick !== "function") {
        throw new TypeError(`Subject system "${id}" needs a tick function.`);
      }
      if (byId.has(id)) {
        throw new Error(`Subject system "${id}" is already registered.`);
      }
      byId.set(id, system);
      return registry;
    },
    list() {
      return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    },
    has(id) {
      return byId.has(id);
    }
  };
  systems.forEach((system) => registry.register(system));
  return registry;
}

/** A world state with no content: just the day and the seed. */
export function createInitialState({ day, worldSeed, registry } = {}) {
  if (!Number.isInteger(day) || day < 0) {
    throw new RangeError(`day must be a non-negative whole number, got ${day}`);
  }
  const state = { engineVersion: ENGINE_VERSION, day, worldSeed: String(worldSeed ?? ""), systems: {} };
  for (const system of registry ? registry.list() : []) {
    state.systems[system.id] = typeof system.init === "function"
      ? clone(system.init(clone(state))) ?? {}
      : {};
  }
  return state;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}

/**
 * Advance one day.
 *   state            - the last committed world state
 *   writtenEvents    - canon events (folded, status "written")
 *   options.seed     - overrides state.worldSeed (for what-if runs)
 *   options.registry - subject systems; none by default
 * Returns { state, report, suggestions }:
 *   state        - the new state (a fresh object; the input is untouched)
 *   report       - running-number lines for the day, each tagged with its system
 *   suggestions  - suggested event records, ready to append to the record
 */
export function tick(state, writtenEvents = [], options = {}) {
  if (!state || !Number.isInteger(state.day)) {
    throw new TypeError("tick needs a state with a whole-number day.");
  }
  const registry = options.registry || createRegistry();
  const worldSeed = options.seed != null ? String(options.seed) : String(state.worldSeed ?? "");
  const day = state.day + 1;

  const world = deepFreeze(clone(state));
  const canon = deepFreeze(clone(writtenEvents || []));
  const next = clone(state);
  next.day = day;
  next.engineVersion = ENGINE_VERSION;
  next.systems = next.systems || {};

  const report = [];
  const suggestions = [];

  for (const system of registry.list()) {
    const systemState = next.systems[system.id]
      ?? (typeof system.init === "function" ? clone(system.init(world)) ?? {} : {});
    let suggestionCount = 0;
    system.tick({
      day,
      rng: createRng(daySeed(worldSeed, day, system.id)),
      rngFor(name) {
        return createRng(daySeed(worldSeed, day, `${system.id}:${String(name)}`));
      },
      state: systemState,
      world,
      writtenEvents: canon,
      report(entry) {
        report.push({ ...clone(entry), day, system: system.id });
      },
      suggest(event) {
        suggestionCount += 1;
        const suggested = createSuggestedEvent({
          ...clone(event),
          id: `s-${day}-${system.id}-${suggestionCount}`,
          day,
          tags: [...(event.tags || []), `system:${system.id}`]
        });
        suggestions.push(suggested);
        return clone(suggested);
      }
    });
    next.systems[system.id] = systemState;
  }

  return { state: next, report, suggestions };
}

/** Advance several days in a row, feeding nothing back. For what-if runs and tests. */
export function tickMany(state, writtenEvents, days, options = {}) {
  let current = state;
  const report = [];
  const suggestions = [];
  for (let index = 0; index < days; index += 1) {
    const result = tick(current, writtenEvents, options);
    current = result.state;
    report.push(...result.report);
    suggestions.push(...result.suggestions);
  }
  return { state: current, report, suggestions };
}
