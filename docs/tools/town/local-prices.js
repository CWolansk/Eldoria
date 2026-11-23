// Local prices for players: the maths and the "which items follow which good" rule.
// Shared by the town page, item search and the player sheet. Pure functions: no DOM,
// no network, nothing stored. The only input is the answer of GET world/public/prices,
// which holds prices for the one town the party is in and nothing else.

const COPPER = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

// Types match only ordinary items. Anything magical has to be listed by id.
const ORDINARY_RARITIES = new Set(["", "none", "common", "mundane"]);

function lower(value) {
  return String(value ?? "").trim().toLowerCase();
}

/** "15 gp", "2 sp", "11,015 gp", 1500 (already copper) -> copper pieces, or null. */
export function parseCopper(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  const match = /^\s*([\d,]+(?:\.\d+)?)\s*(cp|sp|ep|gp|pp)\s*$/iu.exec(String(value ?? ""));
  if (!match) {
    return null;
  }
  const amount = Number(match[1].replace(/,/gu, ""));
  return Number.isFinite(amount) ? amount * COPPER[match[2].toLowerCase()] : null;
}

/** Copper pieces as a player would say it: "16.8 gp", "2.3 sp", "4 cp". */
export function formatMoney(copper) {
  const value = Number(copper) || 0;
  const trim = (number) => String(Math.round(number * 10) / 10);
  if (value >= 100) return `${Number(trim(value / 100)).toLocaleString("en-US")} gp`;
  if (value >= 10) return `${trim(value / 10)} sp`;
  return `${trim(value)} cp`;
}

/** 0 -> "usual", 12 -> "+12%", -8 -> "-8%". */
export function percentText(percent) {
  const value = Math.round(Number(percent) || 0);
  if (value === 0) return "usual";
  return `${value > 0 ? "+" : "-"}${Math.abs(value)}%`;
}

/** "up", "down" or "" for the same colour language as the DM's Markets view. */
export function percentDirection(percent) {
  const value = Math.round(Number(percent) || 0);
  return value > 0 ? "up" : value < 0 ? "down" : "";
}

/** True for the empty answer the route gives whenever there is nothing players may see. */
export function isEmptyAnswer(answer) {
  return !answer || !answer.place || !answer.place.name || !Array.isArray(answer.prices) || answer.prices.length === 0;
}

function typeTokens(type) {
  return lower(type).split(/[|·,/]/u).map((token) => token.trim()).filter(Boolean);
}

/**
 * The good whose price an item follows, or null. An item listed by id always follows
 * that good. Otherwise it follows a good that covers its type, but only if the item is
 * ordinary: nothing of uncommon rarity or above, and nothing of unknown rarity.
 * When in doubt an item is not covered.
 */
export function findCoveringGood(answer, item = {}) {
  if (isEmptyAnswer(answer)) {
    return null;
  }
  const id = lower(item.id);
  if (id) {
    const byId = answer.prices.find((entry) => (entry.covers?.itemIds || []).some((itemId) => lower(itemId) === id));
    if (byId) return byId;
  }
  if (!ORDINARY_RARITIES.has(lower(item.rarity))) {
    return null;
  }
  const tokens = typeTokens(item.type);
  if (!tokens.length) {
    return null;
  }
  return answer.prices.find((entry) => (entry.covers?.types || []).some((type) => tokens.includes(lower(type)))) || null;
}

/**
 * What an item costs where the party is.
 * item: { id, rarity, type, value } where value is copper pieces or a label like "15 gp".
 * Returns null when the item is not covered, has no price, or there is no town to report.
 */
export function localPriceFor(answer, item = {}) {
  const good = findCoveringGood(answer, item);
  const catalog = parseCopper(item.value);
  const ratio = Number(good?.ratio);
  if (!good || catalog == null || catalog <= 0 || !(ratio > 0)) {
    return null;
  }
  const copper = Math.round(catalog * ratio * 100) / 100;
  const percent = Math.round((ratio - 1) * 100);
  const town = answer.place.name;
  const priceText = formatMoney(copper);
  return {
    town,
    copper,
    priceText,
    percent,
    percentText: percentText(percent),
    direction: percentDirection(percent),
    line: `In ${town}: ${priceText} (${percentText(percent)})`
  };
}
