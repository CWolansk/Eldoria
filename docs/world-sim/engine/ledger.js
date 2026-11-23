// The ledger: how the record and the daily tick fit together.
//
//   current state  = last committed day's state + that day's rows applied in order
//   advance a day  = tick(current state)  ->  new state, report, suggestions
//
// Because every change is a row and the tick is seeded, the whole state can be
// rebuilt from the starting state, the record and the seed (rebuildState).
// A committed snapshot is a saved copy of that, never the only source.

import { createRegistry, createInitialState, tick } from "./tick.js";
import { foldRecord, EVENT_STATUS } from "./events.js";
import {
  COUNTDOWN_SYSTEM_ID, applyCountdownRecord, countdownsSystem, emptyCountdownState
} from "./countdowns.js";

/** The first in-world day of the simulation: Fall 7, 496. */
export const WORLD_START_DAY = 99306;

/** Most days one advance may cover, and the cap for "run to next decision". */
export const MAX_ADVANCE_DAYS = 30;
export const MAX_RUN_TO_DECISION_DAYS = 7;

/** The subject systems that exist in Stage 1. Later stages register more here. */
export function createLedgerRegistry() {
  return createRegistry([countdownsSystem]);
}

/** The world on its first day: no events, no countdowns. */
export function createStartState({ day = WORLD_START_DAY, worldSeed } = {}) {
  return createInitialState({ day, worldSeed, registry: createLedgerRegistry() });
}

/**
 * Applies rows to a state and returns the new state; the input is untouched.
 * Rows are applied in the order given. Only rows that change running state
 * matter here (countdown rows, countdown suggestions, decisions on them);
 * everything else passes through.
 */
export function applyRecords(state, records = []) {
  const next = structuredClone(state);
  next.systems = next.systems || {};
  const countdowns = next.systems[COUNTDOWN_SYSTEM_ID] || (next.systems[COUNTDOWN_SYSTEM_ID] = emptyCountdownState());
  for (const record of records) {
    applyCountdownRecord(countdowns, record);
  }
  return next;
}

/** Rows that belong to one in-world day, in recorded order. */
export function recordsForDay(records, day) {
  return (records || []).filter((record) => record?.day === day);
}

/**
 * One day forward from the committed state of `state.day`.
 *   records - every row recorded for state.day (others are ignored)
 * Returns { state, report, suggestions } for the next day.
 */
export function advanceDay(state, records = [], options = {}) {
  const current = applyRecords(state, recordsForDay(records, state.day));
  const canon = foldRecord(records).events.filter((event) => event.status === EVENT_STATUS.WRITTEN);
  return tick(current, canon, { registry: createLedgerRegistry(), ...options });
}

/**
 * Rebuilds the state for `toDay` from the starting state and the whole record.
 * Returns { state, suggestions } where state has the rows of `toDay` applied
 * (the "current state") and suggestions are every event the ticks raised on
 * the way. Used to prove that snapshots are only a saved copy.
 */
export function rebuildState(startState, records = [], toDay = startState.day, options = {}) {
  if (toDay < startState.day) {
    throw new RangeError("toDay is before the starting day.");
  }
  let state = structuredClone(startState);
  const suggestions = [];
  while (state.day < toDay) {
    const result = advanceDay(state, records, options);
    suggestions.push(...result.suggestions);
    state = result.state;
  }
  return { state: applyRecords(state, recordsForDay(records, state.day)), suggestions };
}
