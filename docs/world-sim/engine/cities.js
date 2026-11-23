// Cities, as an outline the DM grows over time. There are no city maps.
//
// A settlement has, all optional and all addable later:
//   district  - a part of town
//   location  - a shop, guild hall, inn, temple or landmark; in a district or just in town
//   npc       - a person; at a location, in a district, or simply "somewhere in town"
//
// Every change is an appended "city" row: add, change (rename, move, note, whether
// the players know it), retire, restore. Nothing is deleted; a retired entry stays in
// the record and can be brought back. Every entry is hidden from players until the
// DM says they know it.
//
// This is reference structure, not simulation: it is folded straight from the record
// and is not part of the daily tick.

export const CITY_ENTRY_TYPES = Object.freeze(["district", "location", "npc"]);
export const CITY_ACTION = Object.freeze({ ADD: "add", CHANGE: "change", RETIRE: "retire", RESTORE: "restore" });

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

/** "The Sturdy Mugg" -> "the-sturdy-mugg". Used to make readable ids. */
export function slugify(value) {
  return text(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function normalizeEntry(input = {}) {
  const type = text(input.type);
  if (!CITY_ENTRY_TYPES.includes(type)) throw fail("An entry is a district, a location or an NPC.");
  const town = text(input.town);
  const name = text(input.name);
  if (!town) throw fail("Say which town it is in.");
  if (!name) throw fail("It needs a name.");
  const entry = {
    type,
    town,
    name,
    kind: text(input.kind) || null, // "Inn", "Smith", "Guild hall"; for an NPC, what they do
    note: text(input.note) || null,
    district: type === "district" ? null : text(input.district) || null,
    location: type === "npc" ? text(input.location) || null : null,
    playersKnow: input.playersKnow === true,
    source: text(input.source) || null // where in the notes this came from, if it did
  };
  return entry;
}

/** Row: a new district, location or NPC. */
export function createCityAdd(input) {
  const id = text(input.id);
  const entryId = text(input.entryId);
  if (!id || !entryId) throw fail("Record id and entry id are required.");
  return {
    recordType: "city", id, action: CITY_ACTION.ADD, entryId,
    day: requireDay(input.day), at: input.at ?? null, entry: normalizeEntry(input.entry)
  };
}

/** Row: rename, re-describe, move, or say whether the players know it. Only given fields change. */
export function createCityChange(input) {
  const id = text(input.id);
  const entryId = text(input.entryId);
  if (!id || !entryId) throw fail("Record id and entry id are required.");
  const source = input.changes || {};
  const changes = {};
  if (source.name !== undefined) {
    changes.name = text(source.name);
    if (!changes.name) throw fail("It needs a name.");
  }
  if (source.kind !== undefined) changes.kind = text(source.kind) || null;
  if (source.note !== undefined) changes.note = text(source.note) || null;
  if (source.town !== undefined) {
    changes.town = text(source.town);
    if (!changes.town) throw fail("Say which town it is in.");
  }
  if (source.district !== undefined) changes.district = text(source.district) || null;
  if (source.location !== undefined) changes.location = text(source.location) || null;
  if (source.playersKnow !== undefined) changes.playersKnow = source.playersKnow === true;
  if (!Object.keys(changes).length) throw fail("Nothing to change.");
  return { recordType: "city", id, action: CITY_ACTION.CHANGE, entryId, day: requireDay(input.day), at: input.at ?? null, changes };
}

/** Row: retire an entry (it stays in the record) or bring it back. */
export function createCityRetire(input) {
  const id = text(input.id);
  const entryId = text(input.entryId);
  if (!id || !entryId) throw fail("Record id and entry id are required.");
  return {
    recordType: "city", id, action: input.restore === true ? CITY_ACTION.RESTORE : CITY_ACTION.RETIRE, entryId,
    day: requireDay(input.day), at: input.at ?? null
  };
}

/**
 * Folds the "city" rows, in order, into the current outline.
 * Returns { entries, byId }: every entry ever added, with `retired` set on those the
 * DM has retired. A change that would leave an entry pointing at something that is not
 * there (a district in another town, say) is tidied: the stale pointer is dropped, so
 * the entry is simply "somewhere in town".
 */
export function foldCity(records) {
  const byId = new Map();
  const entries = [];
  for (const record of records || []) {
    if (record?.recordType !== "city") continue;
    if (record.action === CITY_ACTION.ADD) {
      if (byId.has(record.entryId)) continue;
      const entry = { id: record.entryId, ...record.entry, retired: false, addedDay: record.day };
      byId.set(entry.id, entry);
      entries.push(entry);
      continue;
    }
    const entry = byId.get(record.entryId);
    if (!entry) continue;
    if (record.action === CITY_ACTION.CHANGE) {
      Object.assign(entry, record.changes);
      if (entry.type === "district") {
        entry.district = null;
        entry.location = null;
      }
      if (entry.type === "location") entry.location = null;
    } else if (record.action === CITY_ACTION.RETIRE) {
      entry.retired = true;
      entry.retiredDay = record.day;
    } else if (record.action === CITY_ACTION.RESTORE) {
      entry.retired = false;
      entry.retiredDay = null;
    }
  }
  // Pointers must stay inside the same town and point at something of the right kind.
  for (const entry of entries) {
    const district = entry.district ? byId.get(entry.district) : null;
    if (entry.district && (!district || district.type !== "district" || district.town !== entry.town)) entry.district = null;
    const location = entry.location ? byId.get(entry.location) : null;
    if (entry.location && (!location || location.type !== "location" || location.town !== entry.town)) entry.location = null;
    // An NPC at a location is in that location's district.
    if (entry.type === "npc" && entry.location) entry.district = byId.get(entry.location).district || null;
  }
  return { entries, byId };
}

/**
 * One town as an outline:
 *   { districts: [{ ...district, locations: [{ ...location, npcs }], npcs }],
 *     locations: [...not in a district],  npcs: [...somewhere in town] }
 * Retired entries are left out unless includeRetired is set.
 */
export function cityOutline(folded, town, { includeRetired = false } = {}) {
  const live = folded.entries.filter((entry) => entry.town === town && (includeRetired || !entry.retired));
  const byName = (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || (a.id < b.id ? -1 : 1);
  const npcsAt = (locationId) => live.filter((entry) => entry.type === "npc" && entry.location === locationId).sort(byName);
  const locationsIn = (districtId) => live
    .filter((entry) => entry.type === "location" && (entry.district || null) === districtId)
    .sort(byName)
    .map((location) => ({ ...location, npcs: npcsAt(location.id) }));
  return {
    town,
    districts: live.filter((entry) => entry.type === "district").sort(byName).map((district) => ({
      ...district,
      locations: locationsIn(district.id),
      npcs: live.filter((entry) => entry.type === "npc" && !entry.location && entry.district === district.id).sort(byName)
    })),
    locations: locationsIn(null),
    npcs: live.filter((entry) => entry.type === "npc" && !entry.location && !entry.district).sort(byName),
    retired: folded.entries.filter((entry) => entry.town === town && entry.retired).sort(byName)
  };
}
