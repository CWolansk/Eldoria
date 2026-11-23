// Seeded randomness for the living world. Pure: no built-in random source, no clock.
// The same (worldSeed, day, stream) always yields the same sequence, in the
// browser and in the Azure Function.

/** mulberry32: small, fast 32-bit generator. Returns a function giving [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string to an unsigned 32-bit integer. */
export function hashString(text) {
  let hash = 0x811c9dc5;
  const value = String(text);
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Seed for one day and one named stream (a subject system, a countdown...).
 * Separate streams mean adding a system later does not change what the
 * existing systems roll on the same day.
 */
export function daySeed(worldSeed, day, stream = "") {
  return hashString(`${String(worldSeed)}|${Number(day)}|${String(stream)}`);
}

/** Generator with a few convenience draws, all derived from one stream. */
export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    /** Integer in [min, max], inclusive. */
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    /** True with the given probability (0..1). */
    chance(probability) {
      return next() < probability;
    },
    /** One element of a non-empty array; undefined for an empty one. */
    pick(list) {
      return list.length ? list[Math.floor(next() * list.length)] : undefined;
    }
  };
}
