// The record: an append-only list of two kinds of row.
//
//   event    - something that happened or might have. Created "written" when
//              the DM jots it, "suggested" when the simulation proposes it.
//   decision - the DM's call on a suggested event: accept, reword or reject.
//              A decision is a NEW row pointing at the event. Nothing is ever
//              edited or deleted, so the history of every call stays readable.
//
// Stage 1 adds two more kinds of row, both also append-only:
//
//   visibility - the DM reveals an event to the players, or hides it again.
//                Every event starts hidden. Only this row can change that.
//   countdown  - a change to a countdown (see countdowns.js). The event fold
//                skips these; the countdown fold reads them.
//
// Stage 2 adds three more, also append-only and also skipped by the event fold:
//
//   economy    - the DM loads or changes the market setup (see economy.js).
//   pressure   - the DM ends a pressure early.
//   party      - the DM says where the party is. Nothing else ever moves the party.
//
// An event may now carry an `effect` (see normalizeEffect in economy.js): what it
// does to the numbers. null means it is just a fact.
//
// Only events whose folded status is "written" are canon.
// These helpers are pure: ids and timestamps are supplied by the caller.

export const EVENT_STATUS = Object.freeze({
  SUGGESTED: "suggested",
  WRITTEN: "written",
  REJECTED: "rejected"
});

export const DECISION = Object.freeze({
  ACCEPT: "accept",
  REWORD: "reword",
  REJECT: "reject"
});

export const EVENT_SOURCE = Object.freeze({ DM: "dm", SIM: "sim" });

function requireText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new TypeError(`${label} is required.`);
  }
  return text;
}

function requireDay(day) {
  if (!Number.isInteger(day) || day < 0) {
    throw new RangeError(`day must be a non-negative whole number, got ${day}`);
  }
  return day;
}

function baseEvent(input, status, source) {
  return {
    recordType: "event",
    id: requireText(input.id, "Event id"),
    day: requireDay(input.day),
    status,
    source,
    text: requireText(input.text, "Event text"),
    place: input.place ?? null,
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
    causedBy: input.causedBy ?? null,
    why: input.why ?? null,
    effect: input.effect ?? null,
    createdAt: input.createdAt ?? null
  };
}

/**
 * The DM reveals an event to the players (playersVisible true) or hides it again.
 * Nothing is visible to players unless a row like this says so.
 */
export function createVisibility(input) {
  return {
    recordType: "visibility",
    id: requireText(input.id, "Visibility id"),
    eventId: requireText(input.eventId, "Visibility eventId"),
    playersVisible: input.playersVisible === true,
    day: requireDay(input.day),
    decidedAt: input.decidedAt ?? null
  };
}

/** The DM says where the party is. `place` may be null for "on the road / not set". */
export function createPartyMove(input) {
  return {
    recordType: "party",
    id: requireText(input.id, "Record id"),
    day: requireDay(input.day),
    place: input.place == null || String(input.place).trim() === "" ? null : String(input.place).trim(),
    at: input.at ?? null
  };
}

/** An event the DM wrote. Canon from the moment it is recorded. */
export function createWrittenEvent(input) {
  return baseEvent(input, EVENT_STATUS.WRITTEN, EVENT_SOURCE.DM);
}

/** An event the simulation proposes. Not canon until a decision accepts it. */
export function createSuggestedEvent(input) {
  return baseEvent(input, EVENT_STATUS.SUGGESTED, EVENT_SOURCE.SIM);
}

/** The DM's call on a suggested event. `text` is required for a reword. */
export function createDecision(input) {
  const decision = String(input.decision ?? "");
  if (!Object.values(DECISION).includes(decision)) {
    throw new TypeError(`Unknown decision "${decision}".`);
  }
  const text = decision === DECISION.REWORD ? requireText(input.text, "Reworded text") : null;
  return {
    recordType: "decision",
    id: requireText(input.id, "Decision id"),
    eventId: requireText(input.eventId, "Decision eventId"),
    decision,
    text,
    day: requireDay(input.day),
    decidedAt: input.decidedAt ?? null
  };
}

/**
 * Folds the append-only record, in order, into the current view.
 * Returns:
 *   events  - every event with its current status and text, in first-seen order.
 *             A reworded event keeps `originalText`. `playersVisible` is false
 *             unless the latest visibility row for the event says true.
 *   byId    - Map of the same objects by id.
 *   ignored - rows that could not be applied, each with a reason:
 *             "unknown-event"   decision points at an id that is not in the record
 *             "already-decided" the event is no longer "suggested" (first call wins)
 *             "duplicate-event" an event id seen before (first one wins)
 *             "unknown-record"  not an event or decision row
 * The input is not modified.
 */
export function foldRecord(records) {
  const byId = new Map();
  const events = [];
  const ignored = [];

  for (const record of records || []) {
    if (record?.recordType === "event") {
      if (byId.has(record.id)) {
        ignored.push({ record, reason: "duplicate-event" });
        continue;
      }
      const view = {
        ...record,
        tags: [...(record.tags || [])],
        originalText: record.text,
        playersVisible: false,
        decidedBy: null,
        decidedOnDay: null
      };
      byId.set(record.id, view);
      events.push(view);
      continue;
    }

    if (record?.recordType === "decision") {
      const view = byId.get(record.eventId);
      if (!view) {
        ignored.push({ record, reason: "unknown-event" });
        continue;
      }
      if (view.status !== EVENT_STATUS.SUGGESTED) {
        ignored.push({ record, reason: "already-decided" });
        continue;
      }
      if (record.decision === DECISION.REJECT) {
        view.status = EVENT_STATUS.REJECTED;
      } else {
        view.status = EVENT_STATUS.WRITTEN;
        if (record.decision === DECISION.REWORD && record.text) {
          view.text = record.text;
        }
      }
      view.decidedBy = record.id;
      view.decidedOnDay = record.day;
      continue;
    }

    if (record?.recordType === "visibility") {
      const view = byId.get(record.eventId);
      if (!view) {
        ignored.push({ record, reason: "unknown-event" });
        continue;
      }
      view.playersVisible = record.playersVisible === true;
      continue;
    }

    // Rows read by other folds: countdowns, the economy setup, pressures ended early,
    // and where the party is.
    if (["countdown", "economy", "pressure", "party"].includes(record?.recordType)) {
      continue;
    }

    ignored.push({ record, reason: "unknown-record" });
  }

  return { events, byId, ignored };
}

/** Canon only: folded events whose status is "written". */
export function writtenEvents(records) {
  return foldRecord(records).events.filter((event) => event.status === EVENT_STATUS.WRITTEN);
}

/** Folded events still waiting for the DM's call. */
export function pendingSuggestions(records) {
  return foldRecord(records).events.filter((event) => event.status === EVENT_STATUS.SUGGESTED);
}
