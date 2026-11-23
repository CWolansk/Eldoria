"use strict";

// What the living world can do, on top of the store and the shared engine.
// No HTTP in here: worldRoutes.js maps requests onto these functions, and tests
// call them with in-memory stores.
//
// Rules this file keeps:
//   - Nothing is canon until the DM writes it. The simulation only appends
//     "suggested" events; a decision row makes one written or rejected.
//   - The record is append only. Every change is a new row.
//   - Running numbers become canon when a day is committed (advance).
//   - Players see nothing unless the DM reveals it (visibility rows).
//   - Nothing here moves the party. The DM writes where the party is.

const crypto = require("node:crypto");

const PLACES_SCHEMA = "eldoria-world-places/1";

function fail(statusCode, message, details = {}) {
  return Object.assign(new Error(message), { statusCode, details });
}

function shortId() {
  return crypto.randomBytes(5).toString("hex");
}

function pad7(day) {
  return String(day).padStart(7, "0");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function stripRow(record) {
  const { _row, ...rest } = record;
  return rest;
}

function createWorldService({ store, engine, now, newId } = {}) {
  if (!store || !engine) {
    throw new TypeError("createWorldService needs a store and the engine.");
  }
  const clock = now || (() => new Date().toISOString());
  const makeId = newId || shortId;

  async function loadCommitted() {
    const current = await store.readCurrent();
    if (!current) {
      return null;
    }
    const snapshot = await store.readSnapshot(current.pointer.snapshotBlob);
    if (!snapshot) {
      throw fail(500, "The committed day could not be read.");
    }
    return { pointer: current.pointer, etag: current.etag, snapshot };
  }

  async function requireCommitted() {
    const committed = await loadCommitted();
    if (!committed) {
      throw fail(409, "The world has not been started yet.");
    }
    return committed;
  }

  // If a commit succeeded but the suggestions that go with it were not appended
  // (connection dropped in between), put them back. Appending is idempotent here
  // because suggestion ids are fixed by day and subject.
  async function healSuggestions(committed, records) {
    const wanted = committed.snapshot.suggestions || [];
    if (!wanted.length) {
      return records;
    }
    const known = new Set(records.filter((record) => record.recordType === "event").map((record) => record.id));
    const missing = wanted.filter((suggestion) => !known.has(suggestion.id));
    if (!missing.length) {
      return records;
    }
    await store.appendRecords(committed.pointer.day, missing);
    return store.listRecords();
  }

  async function loadWorld() {
    const committed = await requireCommitted();
    const records = (await healSuggestions(committed, await store.listRecords())).map(stripRow);
    const day = committed.pointer.day;
    const state = engine.applyRecords(committed.snapshot.state, engine.recordsForDay(records, day));
    return { committed, records, day, state, folded: engine.foldRecord(records) };
  }

  function describe(world, extra = {}) {
    const { committed, day, state, folded } = world;
    const parts = engine.fromDay(day);
    return {
      initialized: true,
      day,
      dateText: engine.formatDay(day),
      dayOfMonth: parts.dayOfMonth,
      month: parts.month,
      year: parts.year,
      daysPerMonth: engine.DAYS_PER_MONTH,
      etag: committed.etag,
      engineVersion: committed.pointer.engineVersion,
      countdowns: engine.listCountdowns(state),
      pending: folded.events.filter((event) => event.status === engine.EVENT_STATUS.SUGGESTED),
      writtenToday: folded.events.filter((event) => event.status === engine.EVENT_STATUS.WRITTEN
        && (event.day === day || event.decidedOnDay === day)),
      report: committed.snapshot.report || [],
      ...extra
    };
  }

  async function getWorld() {
    const committed = await loadCommitted();
    if (!committed) {
      return {
        initialized: false,
        suggestedStartDay: engine.WORLD_START_DAY,
        suggestedStartDateText: engine.formatDay(engine.WORLD_START_DAY)
      };
    }
    return describe(await loadWorld());
  }

  /** First commit. Nothing exists in storage before the DM does this. */
  async function startWorld(input = {}) {
    if (await store.readCurrent()) {
      throw fail(409, "The world has already been started.");
    }
    const day = input.day == null ? engine.WORLD_START_DAY : Number(input.day);
    if (!Number.isInteger(day) || day < 0) {
      throw fail(400, "The starting day must be a whole number.");
    }
    const worldSeed = cleanText(input.worldSeed) || crypto.randomBytes(8).toString("hex");
    const state = engine.createStartState({ day, worldSeed });
    await store.commitDay({ day, state, report: [], suggestions: [], engineVersion: engine.ENGINE_VERSION, expectedEtag: null });
    return getWorld();
  }

  async function listEvents({ fromDay, toDay, status } = {}) {
    const world = await loadWorld();
    const from = fromDay == null ? 0 : Number(fromDay);
    const to = toDay == null ? Number.MAX_SAFE_INTEGER : Number(toDay);
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      throw fail(400, "fromDay and toDay must be numbers.");
    }
    const wanted = cleanText(status).toLowerCase();
    if (wanted && wanted !== "all" && !Object.values(engine.EVENT_STATUS).includes(wanted)) {
      throw fail(400, "status must be all, written, suggested or rejected.");
    }
    const events = world.folded.events
      .filter((event) => event.day >= from && event.day <= to)
      .filter((event) => !wanted || wanted === "all" || event.status === wanted)
      .sort((a, b) => b.day - a.day || 0);
    return { day: world.day, events };
  }

  /** The DM writes something down. Canon at once. May be dated today or earlier. */
  async function jot(input = {}) {
    const world = await loadWorld();
    const day = input.day == null ? world.day : Number(input.day);
    if (!Number.isInteger(day) || day < 0) {
      throw fail(400, "The date must be a whole day number.");
    }
    if (day > world.day) {
      throw fail(400, "An event cannot be dated after today. Use a dated countdown for something still to come.");
    }
    const event = engine.createWrittenEvent({
      id: `e-${pad7(day)}-${makeId()}`,
      day,
      text: input.text,
      place: cleanText(input.place) || null,
      tags: Array.isArray(input.tags) ? input.tags.map(cleanText).filter(Boolean) : [],
      effect: null,
      createdAt: clock()
    });
    await store.appendRecords(day, [event]);
    return { event: { ...event, originalText: event.text, playersVisible: false }, world: await getWorld() };
  }

  async function decide(eventId, input = {}) {
    const world = await loadWorld();
    const event = world.folded.byId.get(cleanText(eventId));
    if (!event) {
      throw fail(404, "That event is not in the record.");
    }
    if (event.status !== engine.EVENT_STATUS.SUGGESTED) {
      throw fail(409, "That suggestion has already been decided. Reload to see it.");
    }
    const decision = engine.createDecision({
      id: `d-${pad7(world.day)}-${makeId()}`,
      eventId: event.id,
      decision: cleanText(input.decision),
      text: input.text,
      day: world.day,
      decidedAt: clock()
    });
    await store.appendRecords(world.day, [decision]);
    return { world: await getWorld() };
  }

  /** Reveal a written event to the players, or hide it again. Hidden is the default. */
  async function setVisibility(eventId, input = {}) {
    if (typeof input.playersVisible !== "boolean") {
      throw fail(400, "playersVisible must be true or false.");
    }
    const world = await loadWorld();
    const event = world.folded.byId.get(cleanText(eventId));
    if (!event) {
      throw fail(404, "That event is not in the record.");
    }
    if (event.status !== engine.EVENT_STATUS.WRITTEN) {
      throw fail(409, "Only written events can be shown to players.");
    }
    const row = engine.createVisibility({
      id: `v-${pad7(world.day)}-${makeId()}`,
      eventId: event.id,
      playersVisible: input.playersVisible,
      day: world.day,
      decidedAt: clock()
    });
    await store.appendRecords(world.day, [row]);
    return { event: { ...event, playersVisible: input.playersVisible } };
  }

  async function listCountdowns() {
    const world = await loadWorld();
    return { day: world.day, countdowns: engine.listCountdowns(world.state) };
  }

  async function createCountdown(input = {}) {
    const world = await loadWorld();
    const row = engine.createCountdown({
      ...input,
      size: input.size == null ? undefined : Number(input.size),
      chance: input.chance == null ? undefined : Number(input.chance),
      dueDay: input.dueDay == null ? undefined : Number(input.dueDay),
      fill: input.fill == null ? 0 : Number(input.fill),
      place: cleanText(input.place) || null,
      id: `k-${pad7(world.day)}-${makeId()}`,
      countdownId: `c-${makeId()}`,
      day: world.day,
      at: clock()
    });
    await store.appendRecords(world.day, [row]);
    await raiseIfDue(row.countdownId);
    return { countdownId: row.countdownId, world: await getWorld() };
  }

  // A countdown filled by hand raises its suggestion at once, like one filled by a roll.
  async function raiseIfDue(countdownId) {
    const world = await loadWorld();
    const item = engine.listCountdowns(world.state).find((entry) => entry.id === countdownId);
    if (!item || !engine.isCountdownDue(item, world.day)) {
      return;
    }
    const suggestion = engine.createSuggestedEvent({
      ...engine.countdownSuggestion(item),
      tags: [...engine.countdownSuggestion(item).tags, `system:${engine.COUNTDOWN_SYSTEM_ID}`],
      id: `s-${world.day}-${engine.COUNTDOWN_SYSTEM_ID}-now-${makeId()}`,
      day: world.day,
      createdAt: clock()
    });
    await store.appendRecords(world.day, [suggestion]);
  }

  async function countdownAction(countdownId, input = {}) {
    const world = await loadWorld();
    const id = cleanText(countdownId);
    const item = engine.listCountdowns(world.state).find((entry) => entry.id === id);
    if (!item) {
      throw fail(404, "That countdown does not exist.");
    }
    if (item.done) {
      throw fail(409, "That countdown is finished.");
    }
    const action = cleanText(input.action);
    const base = { id: `k-${pad7(world.day)}-${makeId()}`, countdownId: id, day: world.day, at: clock() };
    let row;
    if (action === engine.COUNTDOWN_ACTION.STEP) {
      if (item.mode !== engine.COUNTDOWN_MODE.CHANCE) {
        throw fail(400, "A dated countdown has no steps. Change its date instead.");
      }
      if (item.waiting) {
        throw fail(409, "That countdown is waiting for your call on its suggestion.");
      }
      row = engine.createCountdownStep({ ...base, delta: Number(input.delta) });
    } else if (action === engine.COUNTDOWN_ACTION.EDIT) {
      const changes = { ...(input.changes || {}) };
      if (changes.chance !== undefined) changes.chance = Number(changes.chance);
      if (changes.dueDay !== undefined) {
        changes.dueDay = Number(changes.dueDay);
        if (changes.dueDay <= world.day) {
          throw fail(400, "The date must be after today.");
        }
      }
      row = engine.createCountdownEdit({ ...base, changes });
    } else if (action === engine.COUNTDOWN_ACTION.FINISH) {
      if (item.waiting) {
        throw fail(409, "Decide on its suggestion first.");
      }
      row = engine.createCountdownFinish(base);
    } else {
      throw fail(400, "action must be step, edit or finish.");
    }
    await store.appendRecords(world.day, [row]);
    await raiseIfDue(id);
    return { world: await getWorld() };
  }

  /**
   * Advance the world. Each day: tick, commit the day (ETag checked), then append
   * what the tick suggested. A second device working from an older ETag is refused.
   *   days            1..MAX_ADVANCE_DAYS
   *   untilDecision   stop after the first day that leaves something waiting for the
   *                   DM, at most MAX_RUN_TO_DECISION_DAYS days
   *   expectedEtag    the etag from the world the caller was looking at
   */
  async function advance(input = {}) {
    const untilDecision = input.untilDecision === true;
    const limit = untilDecision ? engine.MAX_RUN_TO_DECISION_DAYS : Number(input.days == null ? 1 : input.days);
    if (!Number.isInteger(limit) || limit < 1 || limit > engine.MAX_ADVANCE_DAYS) {
      throw fail(400, `days must be a whole number from 1 to ${engine.MAX_ADVANCE_DAYS}.`);
    }
    const expectedEtag = cleanText(input.expectedEtag);
    if (!expectedEtag) {
      throw fail(400, "expectedEtag is required so two devices cannot advance the same day.");
    }

    let world = await loadWorld();
    if (world.committed.etag !== expectedEtag) {
      throw fail(409, "The world moved on since this page loaded. Reload and try again.", {
        currentDay: world.day
      });
    }

    const fromDay = world.day;
    const report = [];
    let etag = world.committed.etag;
    let daysAdvanced = 0;
    for (;;) {
      const result = engine.advanceDay(world.committed.snapshot.state, world.records);
      const committed = await store.commitDay({
        day: result.state.day,
        state: result.state,
        report: result.report,
        suggestions: result.suggestions,
        engineVersion: engine.ENGINE_VERSION,
        expectedEtag: etag
      });
      etag = committed.etag;
      if (result.suggestions.length) {
        await store.appendRecords(result.state.day, result.suggestions);
      }
      report.push(...result.report);
      daysAdvanced += 1;
      world = await loadWorld();
      const waiting = world.folded.events.some((event) => event.status === engine.EVENT_STATUS.SUGGESTED);
      if (daysAdvanced >= limit || (untilDecision && waiting)) {
        break;
      }
    }

    return describe(world, { advanced: { fromDay, toDay: world.day, days: daysAdvanced, report } });
  }

  async function getPlaces() {
    const stored = await store.readPlaces();
    return stored ? stored.document : { schema: PLACES_SCHEMA, places: [], loaded: false };
  }

  /** Replace the DM-only list of places the jot box offers. Reference data, not canon. */
  async function putPlaces(input = {}) {
    if (!Array.isArray(input.places)) {
      throw fail(400, "places must be a list.");
    }
    const seen = new Set();
    const places = input.places.map((place) => {
      const id = cleanText(place?.id);
      const name = cleanText(place?.name);
      if (!id || !name) {
        throw fail(400, "Each place needs an id and a name.");
      }
      if (seen.has(id)) {
        throw fail(400, `Place id "${id}" appears twice.`);
      }
      seen.add(id);
      return {
        id,
        name,
        kind: cleanText(place.kind) || null,
        region: cleanText(place.region) || null,
        parent: cleanText(place.parent) || null,
        knownToPlayers: place.knownToPlayers === true
      };
    });
    const document = { schema: PLACES_SCHEMA, updatedAt: clock(), loaded: true, places };
    await store.writePlaces(document);
    return document;
  }

  return {
    advance, countdownAction, createCountdown, decide, getPlaces, getWorld, jot,
    listCountdowns, listEvents, putPlaces, setVisibility, startWorld
  };
}

module.exports = { PLACES_SCHEMA, createWorldService };
