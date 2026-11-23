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
import {
  ECONOMY_SYSTEM_ID, applyEconomyRecord, economySystem, emptyEconomyState
} from "./economy.js";
import { PEOPLE_SYSTEM_ID, applyPeopleRecord, emptyPeopleState, peopleSystem } from "./people.js";
import { SICKNESS_SYSTEM_ID, applySicknessRecord, emptySicknessState, sicknessSystem } from "./sickness.js";
import { RUMOUR_SYSTEM_ID, applyRumourRecord, emptyRumourState, rumoursSystem } from "./rumours.js";
import { TRAVELLER_SYSTEM_ID, applyTravellerRecord, emptyTravellerState, travellersSystem } from "./travellers.js";

/** The first in-world day of the simulation: Fall 7, 496. */
export const WORLD_START_DAY = 99306;

/** Most days one advance may cover, and the cap for "run to next decision". */
export const MAX_ADVANCE_DAYS = 30;
export const MAX_RUN_TO_DECISION_DAYS = 7;

/**
 * Most lines one subject may add to a day's report. Every subject (countdowns, goods,
 * people, sickness, rumours, travellers) gets the same allowance, so none crowds the
 * others out; a closing line says how many were left out.
 */
export const REPORT_LINES_PER_SUBJECT = 6;

/** The subject systems that exist so far. Later stages register more here. */
export function createLedgerRegistry() {
  return createRegistry([countdownsSystem, economySystem, peopleSystem, sicknessSystem, rumoursSystem, travellersSystem]);
}

/** The world on its first day: no events, no countdowns. */
export function createStartState({ day = WORLD_START_DAY, worldSeed } = {}) {
  return createInitialState({ day, worldSeed, registry: createLedgerRegistry() });
}

/**
 * Applies rows to a state and returns the new state; the input is untouched.
 * Rows are applied in the order given. Only rows that change running state
 * matter here (countdown rows, the market setup, pressures, events that carry an
 * effect, decisions, and where the party is); everything else passes through.
 */
export function applyRecords(state, records = []) {
  const next = structuredClone(state);
  next.systems = next.systems || {};
  const countdowns = next.systems[COUNTDOWN_SYSTEM_ID] || (next.systems[COUNTDOWN_SYSTEM_ID] = emptyCountdownState());
  const economy = next.systems[ECONOMY_SYSTEM_ID] || (next.systems[ECONOMY_SYSTEM_ID] = emptyEconomyState());
  // Stage 3 subjects. A world saved before they existed simply gains empty ones.
  const people = next.systems[PEOPLE_SYSTEM_ID] || (next.systems[PEOPLE_SYSTEM_ID] = emptyPeopleState());
  const sickness = next.systems[SICKNESS_SYSTEM_ID] || (next.systems[SICKNESS_SYSTEM_ID] = emptySicknessState());
  const rumours = next.systems[RUMOUR_SYSTEM_ID] || (next.systems[RUMOUR_SYSTEM_ID] = emptyRumourState());
  const travellers = next.systems[TRAVELLER_SYSTEM_ID] || (next.systems[TRAVELLER_SYSTEM_ID] = emptyTravellerState());
  for (const record of records) {
    applyCountdownRecord(countdowns, record);
    applyEconomyRecord(economy, record);
    applyPeopleRecord(people, record);
    applySicknessRecord(sickness, record, next);
    applyRumourRecord(rumours, record);
    applyTravellerRecord(travellers, record);
    if (record?.recordType === "party") {
      // Only the DM's own row moves the party. No system ever writes this.
      next.party = { place: record.place ?? null, sinceDay: record.day };
    }
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
  return tick(current, canon, {
    registry: createLedgerRegistry(),
    reportLinesPerSystem: REPORT_LINES_PER_SUBJECT,
    ...options
  });
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
