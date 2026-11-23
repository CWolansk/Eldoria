// Countdowns: things building up off screen (fronts, plans, dated occasions).
//
// A countdown has 4, 6 or 8 steps. It either gains a step by a seeded daily
// chance, or it has a fixed date. When it fills up, or its date comes, it
// suggests one event and waits for the DM's call:
//   accept / reword -> the countdown is finished
//   reject          -> a chance countdown drops back to half and carries on;
//                      a dated one is finished (the occasion did not happen)
//
// Every change is an appended "countdown" row; nothing is edited in place.
// The running state under state.systems.countdowns can always be rebuilt from
// the record and the seed (see ledger.js).

export const COUNTDOWN_SIZES = Object.freeze([4, 6, 8]);
export const COUNTDOWN_MODE = Object.freeze({ CHANCE: "chance", DATE: "date" });
export const COUNTDOWN_ACTION = Object.freeze({
  CREATE: "create",
  STEP: "step",
  EDIT: "edit",
  FINISH: "finish"
});
export const COUNTDOWN_SYSTEM_ID = "countdowns";
const DEFAULT_CHANCE = 0.25;

function fail(message) {
  return Object.assign(new TypeError(message), { statusCode: 400 });
}

function text(value) {
  return String(value ?? "").trim();
}

function requireText(value, label) {
  const result = text(value);
  if (!result) {
    throw fail(`${label} is required.`);
  }
  return result;
}

function requireDay(day, label = "day") {
  if (!Number.isInteger(day) || day < 0) {
    throw fail(`${label} must be a non-negative whole number, got ${day}`);
  }
  return day;
}

function normalizeChance(value) {
  const chance = Number(value);
  if (!Number.isFinite(chance) || chance <= 0 || chance > 1) {
    throw fail("The daily chance must be more than 0 and at most 1.");
  }
  return Math.round(chance * 1000) / 1000;
}

function normalizeSize(value) {
  const size = Number(value);
  if (!COUNTDOWN_SIZES.includes(size)) {
    throw fail(`A countdown has ${COUNTDOWN_SIZES.join(", ")} steps, got ${value}.`);
  }
  return size;
}

function clampFill(fill, size) {
  return Math.max(0, Math.min(size, Math.trunc(Number(fill) || 0)));
}

/** tag that ties a suggested event to the countdown that raised it */
export function countdownTag(countdownId) {
  return `countdown:${countdownId}`;
}

function countdownIdFromEvent(event) {
  const tag = (event?.tags || []).find((entry) => String(entry).startsWith("countdown:"));
  return tag ? String(tag).slice("countdown:".length) : "";
}

/** A new countdown. Row for the record; `day` is the day it was created. */
export function createCountdown(input) {
  const mode = input.mode === COUNTDOWN_MODE.DATE ? COUNTDOWN_MODE.DATE : COUNTDOWN_MODE.CHANCE;
  const size = mode === COUNTDOWN_MODE.DATE && input.size == null ? COUNTDOWN_SIZES[0] : normalizeSize(input.size);
  const day = requireDay(input.day);
  const countdown = {
    label: requireText(input.label, "Countdown name"),
    size,
    mode,
    chance: mode === COUNTDOWN_MODE.CHANCE ? normalizeChance(input.chance ?? DEFAULT_CHANCE) : null,
    dueDay: mode === COUNTDOWN_MODE.DATE ? requireDay(input.dueDay, "The date") : null,
    fill: mode === COUNTDOWN_MODE.CHANCE ? clampFill(input.fill, size) : 0,
    place: input.place ?? null,
    // A threat may sit on a road instead of (or as well as) a place.
    route: text(input.route) || null,
    suggestionText: requireText(input.suggestionText, "What it suggests when it comes due"),
    // What the suggested event does to the numbers if the DM accepts it; null for a plain fact.
    effect: input.effect ?? null
  };
  if (mode === COUNTDOWN_MODE.DATE && countdown.dueDay <= day) {
    throw fail("The date must be after today.");
  }
  return {
    recordType: "countdown",
    id: requireText(input.id, "Record id"),
    countdownId: requireText(input.countdownId, "Countdown id"),
    action: COUNTDOWN_ACTION.CREATE,
    day,
    at: input.at ?? null,
    countdown
  };
}

/** One step forward (delta 1) or back (delta -1), by hand. */
export function createCountdownStep(input) {
  const delta = Number(input.delta);
  if (delta !== 1 && delta !== -1) {
    throw fail("A step is one forward or one back.");
  }
  return {
    recordType: "countdown",
    id: requireText(input.id, "Record id"),
    countdownId: requireText(input.countdownId, "Countdown id"),
    action: COUNTDOWN_ACTION.STEP,
    day: requireDay(input.day),
    at: input.at ?? null,
    delta
  };
}

/** Change the name, chance, date, place or suggested text. Only given fields change. */
export function createCountdownEdit(input) {
  const changes = {};
  const source = input.changes || {};
  if (source.label !== undefined) changes.label = requireText(source.label, "Countdown name");
  if (source.chance !== undefined) changes.chance = normalizeChance(source.chance);
  if (source.dueDay !== undefined) changes.dueDay = requireDay(source.dueDay, "The date");
  if (source.place !== undefined) changes.place = source.place ?? null;
  if (source.route !== undefined) changes.route = text(source.route) || null;
  if (source.suggestionText !== undefined) {
    changes.suggestionText = requireText(source.suggestionText, "What it suggests when it comes due");
  }
  if (!Object.keys(changes).length) {
    throw fail("Nothing to change.");
  }
  return {
    recordType: "countdown",
    id: requireText(input.id, "Record id"),
    countdownId: requireText(input.countdownId, "Countdown id"),
    action: COUNTDOWN_ACTION.EDIT,
    day: requireDay(input.day),
    at: input.at ?? null,
    changes
  };
}

/** Close a countdown by hand, without an event. */
export function createCountdownFinish(input) {
  return {
    recordType: "countdown",
    id: requireText(input.id, "Record id"),
    countdownId: requireText(input.countdownId, "Countdown id"),
    action: COUNTDOWN_ACTION.FINISH,
    day: requireDay(input.day),
    at: input.at ?? null
  };
}

export function emptyCountdownState() {
  return { items: {} };
}

/** True when the countdown should raise its suggestion now. */
export function isCountdownDue(item, day) {
  if (!item || item.done || item.waiting) {
    return false;
  }
  return item.mode === COUNTDOWN_MODE.DATE ? day >= item.dueDay : item.fill >= item.size;
}

/** The event a due countdown suggests (without id or day; the caller adds those). */
export function countdownSuggestion(item) {
  return {
    text: item.suggestionText,
    place: item.place ?? null,
    why: item.mode === COUNTDOWN_MODE.DATE
      ? `The date for "${item.label}" has come.`
      : `The countdown "${item.label}" filled up.`,
    effect: item.effect ?? null,
    tags: item.route ? [countdownTag(item.id), `route:${item.route}`] : [countdownTag(item.id)]
  };
}

/**
 * Applies one record to the countdown state, in place. Reads three kinds of row:
 * countdown rows, suggested events raised by a countdown, and decisions on those.
 * Applying the same rows in the same order always gives the same state, and a
 * suggested event that the state already knows about changes nothing.
 * Returns true if the row was understood.
 */
export function applyCountdownRecord(systemState, record) {
  const items = systemState.items || (systemState.items = {});

  if (record?.recordType === "countdown") {
    const id = record.countdownId;
    if (record.action === COUNTDOWN_ACTION.CREATE) {
      if (items[id]) {
        return false;
      }
      items[id] = {
        id,
        ...record.countdown,
        createdDay: record.day,
        waiting: false,
        done: false,
        suggestionId: null
      };
      return true;
    }
    const item = items[id];
    if (!item) {
      return false;
    }
    if (record.action === COUNTDOWN_ACTION.STEP) {
      if (item.done || item.mode !== COUNTDOWN_MODE.CHANCE) {
        return false;
      }
      item.fill = clampFill(item.fill + record.delta, item.size);
      return true;
    }
    if (record.action === COUNTDOWN_ACTION.EDIT) {
      const changes = record.changes || {};
      if (changes.label !== undefined) item.label = changes.label;
      if (changes.place !== undefined) item.place = changes.place;
      if (changes.route !== undefined) item.route = changes.route;
      if (changes.suggestionText !== undefined) item.suggestionText = changes.suggestionText;
      if (changes.chance !== undefined && item.mode === COUNTDOWN_MODE.CHANCE) item.chance = changes.chance;
      if (changes.dueDay !== undefined && item.mode === COUNTDOWN_MODE.DATE) item.dueDay = changes.dueDay;
      return true;
    }
    if (record.action === COUNTDOWN_ACTION.FINISH) {
      item.done = true;
      item.waiting = false;
      return true;
    }
    return false;
  }

  if (record?.recordType === "event" && record.status === "suggested") {
    const item = items[countdownIdFromEvent(record)];
    if (!item || item.done) {
      return false;
    }
    item.waiting = true;
    item.suggestionId = record.id;
    return true;
  }

  if (record?.recordType === "decision") {
    const item = Object.values(items).find((entry) => entry.waiting && entry.suggestionId === record.eventId);
    if (!item) {
      return false;
    }
    item.waiting = false;
    if (record.decision === "reject" && item.mode === COUNTDOWN_MODE.CHANCE) {
      item.fill = Math.floor(item.size / 2);
      item.suggestionId = null;
    } else {
      item.done = true;
    }
    return true;
  }

  return false;
}

/** Countdowns as a list, oldest first, for display. */
export function listCountdowns(state) {
  const items = state?.systems?.[COUNTDOWN_SYSTEM_ID]?.items || {};
  return Object.values(items).sort((a, b) => a.createdDay - b.createdDay || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * The subject system. Each day, every open countdown that is not waiting either
 * rolls for a step (its own seeded stream, so one countdown never changes
 * another's rolls) or checks its date, and raises its suggestion when due.
 */
export const countdownsSystem = Object.freeze({
  id: COUNTDOWN_SYSTEM_ID,
  init: emptyCountdownState,
  tick(ctx) {
    const items = ctx.state.items || (ctx.state.items = {});
    for (const id of Object.keys(items).sort()) {
      const item = items[id];
      if (item.done || item.waiting) {
        continue;
      }
      if (item.mode === COUNTDOWN_MODE.CHANCE && item.fill < item.size && ctx.rngFor(id).chance(item.chance)) {
        item.fill += 1;
        ctx.report({
          kind: "Countdown",
          text: `"${item.label}" moves to ${item.fill} of ${item.size}.`,
          place: item.place ?? null,
          countdownId: id
        });
      }
      if (isCountdownDue(item, ctx.day)) {
        const suggested = ctx.suggest(countdownSuggestion(item));
        item.waiting = true;
        item.suggestionId = suggested.id;
      }
    }
  }
});
