// Eldoria calendar: four 50-day months, 200-day year.
// A "day" everywhere in the simulation is one absolute integer:
//   day = year * 200 + monthIndex * 50 + (dayOfMonth - 1)
// so "Fall 7, 496" is 496 * 200 + 2 * 50 + 6 = 99306.
// The vault's timeline notes use the form 0496-03-07 (month 1..4); toIso and
// parseIso convert to and from that.

export const MONTHS = Object.freeze(["Spring", "Summer", "Fall", "Winter"]);
export const DAYS_PER_MONTH = 50;
export const DAYS_PER_YEAR = MONTHS.length * DAYS_PER_MONTH;

function assertDay(day) {
  if (!Number.isInteger(day) || day < 0) {
    throw new RangeError(`Day must be a non-negative whole number, got ${day}`);
  }
}

/** Absolute day number from its parts. monthIndex is 0..3, dayOfMonth is 1..50. */
export function toDay({ year, monthIndex, dayOfMonth }) {
  if (!Number.isInteger(year) || year < 0) {
    throw new RangeError(`Year must be a non-negative whole number, got ${year}`);
  }
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex >= MONTHS.length) {
    throw new RangeError(`Month index must be 0..${MONTHS.length - 1}, got ${monthIndex}`);
  }
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > DAYS_PER_MONTH) {
    throw new RangeError(`Day of month must be 1..${DAYS_PER_MONTH}, got ${dayOfMonth}`);
  }
  return year * DAYS_PER_YEAR + monthIndex * DAYS_PER_MONTH + (dayOfMonth - 1);
}

/** Parts of an absolute day number. */
export function fromDay(day) {
  assertDay(day);
  const year = Math.floor(day / DAYS_PER_YEAR);
  const dayOfYear = day % DAYS_PER_YEAR;
  const monthIndex = Math.floor(dayOfYear / DAYS_PER_MONTH);
  return {
    year,
    monthIndex,
    month: MONTHS[monthIndex],
    dayOfMonth: (dayOfYear % DAYS_PER_MONTH) + 1,
    dayOfYear: dayOfYear + 1
  };
}

/** "Fall 7, 496" */
export function formatDay(day) {
  const parts = fromDay(day);
  return `${parts.month} ${parts.dayOfMonth}, ${parts.year}`;
}

/** "Fall 7" */
export function formatDayShort(day) {
  const parts = fromDay(day);
  return `${parts.month} ${parts.dayOfMonth}`;
}

/** Parses "Fall 7, 496" (case-insensitive, comma optional). Returns null if it does not parse. */
export function parseDay(text) {
  const match = /^\s*([A-Za-z]+)\s+(\d{1,2})\s*,?\s+(\d{1,5})\s*$/u.exec(String(text ?? ""));
  if (!match) {
    return null;
  }
  const monthIndex = MONTHS.findIndex((name) => name.toLowerCase() === match[1].toLowerCase());
  const dayOfMonth = Number(match[2]);
  const year = Number(match[3]);
  if (monthIndex < 0 || dayOfMonth < 1 || dayOfMonth > DAYS_PER_MONTH) {
    return null;
  }
  return toDay({ year, monthIndex, dayOfMonth });
}

/** "0496-03-07", the form used by the timeline note file names. */
export function toIso(day) {
  const parts = fromDay(day);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.monthIndex + 1).padStart(2, "0"),
    String(parts.dayOfMonth).padStart(2, "0")
  ].join("-");
}

/** Parses "0496-03-07". Returns null if it does not parse. */
export function parseIso(text) {
  const match = /^\s*(\d{1,5})-(\d{1,2})-(\d{1,2})\s*$/u.exec(String(text ?? ""));
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const dayOfMonth = Number(match[3]);
  if (monthIndex < 0 || monthIndex >= MONTHS.length || dayOfMonth < 1 || dayOfMonth > DAYS_PER_MONTH) {
    return null;
  }
  return toDay({ year, monthIndex, dayOfMonth });
}
