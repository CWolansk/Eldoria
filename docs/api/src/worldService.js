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
//   - Players see prices only: one town (where the party is), only if they know
//     that town, and never a reason, a stock level or another town.
//   - Players hear a rumour only where the DM has revealed it, as that town tells it.
//   - Nothing is seeded: no event, rumour, sickness or traveller exists until the DM
//     writes it. A sickness never starts or spreads on its own.
//   - Cities are an outline (districts, locations, NPCs) grown by appended rows.
//     There are no city maps. Nothing is deleted; entries are retired.

const crypto = require("node:crypto");

const PLACES_SCHEMA = "eldoria-world-places/2";
const PLACE_DETAIL = Object.freeze(["full", "sketched", "landmark"]);

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
      party: state.party || null,
      marketsConfigured: Boolean(state.systems?.[engine.ECONOMY_SYSTEM_ID]?.config),
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
    const stored = await store.readPlaces();
    const config = stored ? economyConfigFrom(stored.document) : null;
    if (config) {
      await store.appendRecords(day, [engine.createEconomyConfigure({ id: `m-${pad7(day)}-${makeId()}`, day, at: clock(), config })]);
    }
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
    const effect = checkedEffect(world, input.effect, cleanText(input.text));
    if (effect && day !== world.day) {
      throw fail(400, "An event that changes the numbers starts today. Leave the date empty, or write it as a plain fact.");
    }
    const event = engine.createWrittenEvent({
      id: `e-${pad7(day)}-${makeId()}`,
      day,
      text: input.text,
      place: cleanText(input.place) || null,
      tags: Array.isArray(input.tags) ? input.tags.map(cleanText).filter(Boolean) : [],
      effect,
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
      effect: checkedEffect(world, input.effect, cleanText(input.suggestionText)),
      size: input.size == null ? undefined : Number(input.size),
      chance: input.chance == null ? undefined : Number(input.chance),
      dueDay: input.dueDay == null ? undefined : Number(input.dueDay),
      fill: input.fill == null ? 0 : Number(input.fill),
      place: cleanText(input.place) || null,
      route: checkedRoad(world, input.route),
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
      if (changes.route !== undefined) changes.route = checkedRoad(world, changes.route);
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

  // An effect is checked against the world as it is: the place must have a market,
  // the road must exist. null means the event is just a fact.
  function checkedEffect(world, input, label) {
    if (input == null) {
      return null;
    }
    const effect = engine.normalizeWorldEffect({ ...input, label: cleanText(input.label) || label || null });
    const problem = engine.worldEffectProblem(world.state, effect);
    if (problem) {
      throw fail(400, problem);
    }
    return effect;
  }

  // A threat may sit on a road. The road must be one in the setup.
  function checkedRoad(world, value) {
    const id = cleanText(value);
    if (!id) return null;
    if (!engine.listRoads(world.state).some((road) => road.id === id)) {
      throw fail(400, "That road is not in the setup.");
    }
    return id;
  }

  /** The engine's configuration from the setup document, or null if it has no market setup. */
  function economyConfigFrom(document) {
    const economy = document?.economy;
    if (!economy || !Array.isArray(economy.goods) || !economy.goods.length) {
      return null;
    }
    const places = {};
    for (const place of document.places || []) {
      if (place.parent) continue; // shops and districts are not markets of their own
      places[place.id] = {
        name: place.name,
        knownToPlayers: place.knownToPlayers === true,
        population: place.population ?? null,
        // Only full-detail places have a market. Sketched ones keep their name and roads.
        market: place.detail === "full" ? economy.markets?.[place.id] || {} : {}
      };
    }
    return engine.normalizeEconomyConfig({
      goods: economy.goods,
      routes: economy.routes || [],
      places,
      constants: economy.constants || {}
    });
  }

  /** Everything the DM's Markets and Places views need. */
  async function getMarkets() {
    const world = await loadWorld();
    return { day: world.day, party: world.state.party || null, ...engine.describeEconomy(world.state) };
  }

  /** The current state, for a what-if run in the browser. Nothing is saved by reading it. */
  async function getState() {
    const world = await loadWorld();
    return { day: world.day, state: world.state };
  }

  /** The DM says where the party is. Nothing else ever moves the party. */
  async function setParty(input = {}) {
    const world = await loadWorld();
    const place = cleanText(input.place) || null;
    if (place) {
      const stored = await store.readPlaces();
      const known = (stored?.document?.places || []).some((entry) => entry.id === place);
      if (!known) {
        throw fail(400, "That place is not in your list of places.");
      }
    }
    const row = engine.createPartyMove({ id: `y-${pad7(world.day)}-${makeId()}`, day: world.day, place, at: clock() });
    await store.appendRecords(world.day, [row]);
    return { world: await getWorld() };
  }

  /** End a pressure early. A new row; the pressure stops weighing on the numbers after today. */
  async function endPressure(pressureId) {
    const world = await loadWorld();
    const id = cleanText(pressureId);
    if (!world.state.systems?.[engine.ECONOMY_SYSTEM_ID]?.pressures?.[id]) {
      throw fail(404, "That is not weighing on anything now.");
    }
    await store.appendRecords(world.day, [engine.createPressureEnd({
      id: `x-${pad7(world.day)}-${makeId()}`, pressureId: id, day: world.day, at: clock()
    })]);
    return getMarkets();
  }

  /**
   * What players may see: prices in the town the party is in, and only if the players
   * know that town. Reads only; never writes. Every other case gives the same empty answer.
   */
  async function getPublicPrices() {
    const committed = await loadCommitted();
    if (!committed) {
      return engine.publicPrices(null, null);
    }
    const day = committed.pointer.day;
    const records = (await store.listRecords({ fromDay: day, toDay: day })).map(stripRow);
    const state = engine.applyRecords(committed.snapshot.state, engine.recordsForDay(records, day));
    return engine.publicPrices(state, state.party?.place ?? null);
  }

  function checkedPosition(value, name) {
    if (value == null) return null;
    if (!Array.isArray(value) || value.length !== 2 || !value.every((part) => Number.isFinite(Number(part)) && Number(part) >= 0 && Number(part) <= 1)) {
      throw fail(400, `The map position of ${name} must be two numbers from 0 to 1.`);
    }
    return [Number(value[0]), Number(value[1])];
  }

  /* ---------------- Stage 3: the city outline ---------------- */

  const MAX_CITY_IMPORT = 600;

  async function townIds() {
    const stored = await store.readPlaces();
    return new Set((stored?.document?.places || []).filter((place) => !place.parent).map((place) => place.id));
  }

  function describeCity(world) {
    const folded = engine.foldCity(world.records);
    return { day: world.day, entries: folded.entries, travellers: engine.describeTravellers(world.state) };
  }

  /** Every district, location and NPC, retired ones included, and who is travelling. */
  async function getCity() {
    return describeCity(await loadWorld());
  }

  // Pointers must stay inside the town and point at the right kind of thing.
  function checkPointers(folded, entry) {
    if (entry.district) {
      const district = folded.byId.get(entry.district);
      if (!district || district.type !== "district" || district.town !== entry.town || district.retired) {
        throw fail(400, "That district is not in this town.");
      }
    }
    if (entry.location) {
      const location = folded.byId.get(entry.location);
      if (!location || location.type !== "location" || location.town !== entry.town || location.retired) {
        throw fail(400, "That location is not in this town.");
      }
    }
  }

  function freeEntryId(folded, wanted) {
    let id = wanted;
    for (let attempt = 2; folded.byId.has(id); attempt += 1) {
      id = `${wanted}-${attempt}`;
    }
    return id;
  }

  /** Add a district, a location or an NPC to a town. Hidden from players unless said otherwise. */
  async function addCityEntry(input = {}) {
    const world = await loadWorld();
    const folded = engine.foldCity(world.records);
    const town = cleanText(input.town);
    if (!(await townIds()).has(town)) {
      throw fail(400, "That town is not in your list of places.");
    }
    const type = cleanText(input.type);
    const slug = engine.slugify(input.name);
    if (!slug) throw fail(400, "It needs a name.");
    const wanted = type === "npc" ? `npc--${town}--${slug}` : type === "district" ? `${town}--district--${slug}` : `${town}--${slug}`;
    const row = engine.createCityAdd({
      id: `c-${pad7(world.day)}-${makeId()}`,
      entryId: freeEntryId(folded, wanted),
      day: world.day,
      at: clock(),
      entry: { ...input, town, source: null }
    });
    checkPointers(folded, row.entry);
    await store.appendRecords(world.day, [row]);
    return { entryId: row.entryId, ...(await getCity()) };
  }

  /** Rename, re-describe, move, mark as known to players, retire or restore. A new row each time. */
  async function changeCityEntry(entryId, input = {}) {
    const world = await loadWorld();
    const folded = engine.foldCity(world.records);
    const entry = folded.byId.get(cleanText(entryId));
    if (!entry) {
      throw fail(404, "That is not in your cities.");
    }
    const action = cleanText(input.action);
    const base = { id: `c-${pad7(world.day)}-${makeId()}`, entryId: entry.id, day: world.day, at: clock() };
    let row;
    if (action === engine.CITY_ACTION.RETIRE || action === engine.CITY_ACTION.RESTORE) {
      if ((action === engine.CITY_ACTION.RETIRE) === entry.retired) {
        throw fail(409, entry.retired ? "That is already retired." : "That is not retired.");
      }
      row = engine.createCityRetire({ ...base, restore: action === engine.CITY_ACTION.RESTORE });
    } else if (action === engine.CITY_ACTION.CHANGE) {
      row = engine.createCityChange({ ...base, changes: input.changes });
      if (row.changes.town !== undefined && !(await townIds()).has(row.changes.town)) {
        throw fail(400, "That town is not in your list of places.");
      }
      const after = { ...entry, ...row.changes };
      if (row.changes.town !== undefined && row.changes.town !== entry.town) {
        // Moving town leaves the old district and location behind unless new ones are given.
        if (row.changes.district === undefined) { row.changes.district = null; after.district = null; }
        if (row.changes.location === undefined) { row.changes.location = null; after.location = null; }
      }
      if (after.type === "district") { after.district = null; after.location = null; }
      if (after.type === "location") after.location = null;
      checkPointers(folded, after);
    } else {
      throw fail(400, "action must be change, retire or restore.");
    }
    await store.appendRecords(world.day, [row]);
    return getCity();
  }

  /**
   * Add many entries at once, from the seed made from the notes. An entry whose id is
   * already in the record is left alone, so loading the same file twice adds nothing.
   */
  async function importCity(input = {}) {
    if (!Array.isArray(input.entries)) {
      throw fail(400, "entries must be a list.");
    }
    if (input.entries.length > MAX_CITY_IMPORT) {
      throw fail(413, `At most ${MAX_CITY_IMPORT} entries at a time.`);
    }
    const world = await loadWorld();
    const folded = engine.foldCity(world.records);
    const towns = await townIds();
    const order = { district: 0, location: 1, npc: 2 };
    const sorted = [...input.entries].sort((a, b) => (order[a?.type] ?? 9) - (order[b?.type] ?? 9));
    const rows = [];
    const known = new Map(folded.byId);
    let skipped = 0;
    for (const source of sorted) {
      const entryId = cleanText(source?.id);
      if (!entryId) throw fail(400, "Each entry needs an id.");
      if (known.has(entryId)) {
        skipped += 1;
        continue;
      }
      if (!towns.has(cleanText(source.town))) {
        throw fail(400, `"${cleanText(source.name)}" is in a town that is not in your list of places.`);
      }
      const row = engine.createCityAdd({ id: `c-${pad7(world.day)}-${makeId()}`, entryId, day: world.day, at: clock(), entry: source });
      checkPointers({ byId: known }, row.entry);
      known.set(entryId, { id: entryId, ...row.entry, retired: false });
      rows.push(row);
    }
    if (rows.length) {
      await store.appendRecords(world.day, rows);
    }
    return { added: rows.length, skipped, ...(await getCity()) };
  }

  /* ---------------- Stage 3: rumours ---------------- */

  async function listRumours() {
    const world = await loadWorld();
    return { day: world.day, rumours: engine.describeRumours(world.state) };
  }

  function knownPlace(world, placeId) {
    return Boolean(world.state.systems?.[engine.ECONOMY_SYSTEM_ID]?.config?.places?.[placeId]);
  }

  /**
   * The DM starts a rumour: about a written event (true), or as talk whose truth is
   * not written. It then travels by itself. Nothing is ever started by the simulation.
   */
  async function startRumour(input = {}) {
    const world = await loadWorld();
    const eventId = cleanText(input.eventId) || null;
    let event = null;
    if (eventId) {
      event = world.folded.byId.get(eventId);
      if (!event || event.status !== engine.EVENT_STATUS.WRITTEN) {
        throw fail(400, "A rumour can only be about an event that is written.");
      }
    }
    const origin = cleanText(input.origin) || event?.place || "";
    if (!knownPlace(world, origin)) {
      throw fail(400, origin
        ? "A rumour starts in a town or place on the map that is in your setup."
        : "Say where the rumour starts.");
    }
    const row = engine.createRumourStart({
      ...input,
      eventId,
      origin,
      truth: cleanText(input.truth) === engine.RUMOUR_TRUTH.WRITTEN ? engine.RUMOUR_TRUTH.WRITTEN : engine.RUMOUR_TRUTH.UNWRITTEN,
      where: cleanText(input.where) || origin,
      id: `r-${pad7(world.day)}-${makeId()}`,
      rumourId: `rumour-${makeId()}`,
      day: world.day,
      at: clock()
    });
    await store.appendRecords(world.day, [row]);
    return { rumourId: row.rumourId, ...(await listRumours()) };
  }

  /** End a rumour, mark it true (pointing at a written event), or reveal it to players in one town. */
  async function rumourAction(rumourId, input = {}) {
    const world = await loadWorld();
    const id = cleanText(rumourId);
    const item = world.state.systems?.[engine.RUMOUR_SYSTEM_ID]?.items?.[id];
    if (!item) {
      throw fail(404, "That rumour does not exist.");
    }
    const action = cleanText(input.action);
    const base = { id: `r-${pad7(world.day)}-${makeId()}`, rumourId: id, day: world.day, at: clock() };
    let row;
    if (action === "end") {
      if (item.ended) throw fail(409, "That rumour has already stopped spreading.");
      row = engine.createRumourEnd(base);
    } else if (action === "confirm") {
      const event = world.folded.byId.get(cleanText(input.eventId));
      if (!event || event.status !== engine.EVENT_STATUS.WRITTEN) {
        throw fail(400, "Point at the written event that makes it true.");
      }
      row = engine.createRumourConfirm({ ...base, eventId: event.id });
    } else if (action === "reveal") {
      if (typeof input.playersVisible !== "boolean") {
        throw fail(400, "playersVisible must be true or false.");
      }
      const place = cleanText(input.place);
      if (!item.heard[place]) {
        throw fail(409, "That rumour has not reached that town, so nobody there can tell it.");
      }
      row = engine.createRumourReveal({ ...base, place, playersVisible: input.playersVisible });
    } else {
      throw fail(400, "action must be end, confirm or reveal.");
    }
    await store.appendRecords(world.day, [row]);
    return listRumours();
  }

  /* ---------------- Stage 3: travelling NPCs ---------------- */

  /** Give an NPC from the city outline an itinerary. They then move along the roads by themselves. */
  async function setItinerary(input = {}) {
    const world = await loadWorld();
    const npc = engine.foldCity(world.records).byId.get(cleanText(input.npcId));
    if (!npc || npc.type !== "npc" || npc.retired) {
      throw fail(400, "Pick an NPC from your cities.");
    }
    const stops = Array.isArray(input.stops) ? input.stops : [];
    for (const stop of stops) {
      if (!knownPlace(world, cleanText(stop?.place))) {
        throw fail(400, "Every stop must be a town or place on the map that is in your setup.");
      }
    }
    const row = engine.createItinerary({
      id: `t-${pad7(world.day)}-${makeId()}`, npcId: npc.id, name: npc.name, day: world.day, at: clock(),
      stops, loop: input.loop === true
    });
    await store.appendRecords(world.day, [row]);
    return getCity();
  }

  async function clearItinerary(npcId) {
    const world = await loadWorld();
    const id = cleanText(npcId);
    if (!world.state.systems?.[engine.TRAVELLER_SYSTEM_ID]?.items?.[id]) {
      throw fail(404, "That NPC is not travelling.");
    }
    await store.appendRecords(world.day, [engine.createItineraryClear({ id: `t-${pad7(world.day)}-${makeId()}`, npcId: id, day: world.day, at: clock() })]);
    return getCity();
  }

  /* ---------------- Stage 3: everything the Map and Rumours views need ---------------- */

  async function getOverview() {
    const world = await loadWorld();
    const state = world.state;
    return {
      day: world.day,
      party: state.party || null,
      roads: engine.listRoads(state).map((road) => ({
        ...road,
        travel: Number.isFinite(road.travel) ? road.travel : null,
        aName: engine.placeNameIn(state, road.a),
        bName: engine.placeNameIn(state, road.b)
      })),
      rumours: engine.describeRumours(state),
      people: engine.describePeople(state),
      sickness: engine.describeSickness(state),
      travellers: engine.describeTravellers(state),
      threats: engine.listCountdowns(state).filter((item) => !item.done && (item.place || item.route))
        .map((item) => ({ id: item.id, label: item.label, place: item.place ?? null, route: item.route ?? null, fill: item.fill, size: item.size, mode: item.mode, dueDay: item.dueDay, waiting: item.waiting }))
    };
  }

  /**
   * What players may hear: rumours the DM has revealed in the town the party is in, and
   * only if the players know that town. Reads only. Every other case is the same empty answer.
   */
  async function getPublicRumours() {
    const committed = await loadCommitted();
    if (!committed) {
      return engine.publicRumours(null, null);
    }
    const day = committed.pointer.day;
    const records = (await store.listRecords({ fromDay: day, toDay: day })).map(stripRow);
    const state = engine.applyRecords(committed.snapshot.state, engine.recordsForDay(records, day));
    return engine.publicRumours(state, state.party?.place ?? null);
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
      const detail = cleanText(place.detail).toLowerCase();
      return {
        id,
        name,
        kind: cleanText(place.kind) || null,
        region: cleanText(place.region) || null,
        parent: cleanText(place.parent) || null,
        knownToPlayers: place.knownToPlayers === true,
        // "full" places have a market; "sketched" ones are a name and a size; "landmark" is neither.
        detail: PLACE_DETAIL.includes(detail) ? detail : null,
        population: place.population ?? null,
        // Where it sits on the world map: [fraction up from the bottom, fraction across from the left].
        position: checkedPosition(place.position, name)
      };
    });
    const document = { schema: PLACES_SCHEMA, updatedAt: clock(), loaded: true, places };

    // The market setup (goods, roads, what each full-detail town makes and uses) rides
    // in the same document. It is validated by the engine before anything is saved.
    let config = null;
    if (input.economy != null) {
      document.economy = {
        goods: input.economy.goods || [],
        routes: input.economy.routes || [],
        markets: input.economy.markets || {},
        constants: input.economy.constants || {}
      };
      for (const placeId of Object.keys(document.economy.markets)) {
        if (!seen.has(placeId)) {
          throw fail(400, `The market setup lists "${placeId}", which is not in the places.`);
        }
      }
      for (const route of document.economy.routes) {
        if (!seen.has(cleanText(route?.a)) || !seen.has(cleanText(route?.b))) {
          throw fail(400, `Road "${cleanText(route?.id)}" joins a place that is not in the places.`);
        }
      }
      // Validated by the engine here; the document itself keeps the figures as given,
      // including the sentence saying where each estimate came from.
      config = economyConfigFrom(document);
    }

    await store.writePlaces(document);

    // Once the world is running, a new setup takes effect through the record, like
    // everything else: one appended row holding the whole configuration.
    if (config && await store.readCurrent()) {
      const world = await loadWorld();
      const current = world.state.systems?.[engine.ECONOMY_SYSTEM_ID]?.config;
      if (JSON.stringify(current) !== JSON.stringify(config)) {
        await store.appendRecords(world.day, [engine.createEconomyConfigure({
          id: `m-${pad7(world.day)}-${makeId()}`, day: world.day, at: clock(), config
        })]);
      }
    }
    return document;
  }

  return {
    addCityEntry, advance, changeCityEntry, clearItinerary, countdownAction, createCountdown, decide,
    endPressure, getCity, getMarkets, getOverview, getPlaces, getPublicPrices, getPublicRumours, getState,
    getWorld, importCity, jot, listCountdowns, listEvents, listRumours, putPlaces, rumourAction,
    setItinerary, setParty, setVisibility, startRumour, startWorld
  };
}

module.exports = { PLACES_SCHEMA, createWorldService };
