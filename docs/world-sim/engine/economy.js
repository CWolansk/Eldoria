// The economy: stock, prices, caravans and pressures.
//
// Every good is treated the same. Nothing in this file names a good, a place or a
// route: goods, where they are made and used, and what they are made from all come
// from the configuration the DM loads. A good that is "made from" another simply
// lists it in madeFrom; that link works for any pair of goods.
//
// The rule, per town and good, each day:
//   target stock  T  = daily use x targetStockDays
//   target price  p* = base x clamp((T / stock) ^ priceExponent, minPriceFactor, maxPriceFactor)
//   price         p  = p + priceStep x (p* - p)
//   stock         S  = S + made - used + arrived - shipped
//   made and used both lean on the price: dear goods are made more and bought less.
//   a caravan leaves when the price gap between two towns is more than the trip costs,
//   and its goods are in transit for the route's travel days.
//
// Nothing here is random: the same state and configuration always give the same day.
// Pressures (a timed multiplier on what is made or used, or a road slowed or closed)
// are the only thing that shocks it, and every pressure names the written event
// that caused it.

export const ECONOMY_SYSTEM_ID = "economy";

/** Starting constants. All tunable; a configuration may override any of them. */
export const ECONOMY_DEFAULTS = Object.freeze({
  targetStockDays: 30,
  priceExponent: 0.9,
  minPriceFactor: 0.25,
  maxPriceFactor: 4,
  priceStep: 0.25,
  // People buy less of what is dear: use x (price / base) ^ -demandElasticity.
  demandElasticity: 0.4,
  // Makers make more of what is dear and less of what is cheap, within limits:
  // made x clamp((price / base) ^ supplyElasticity, minSupplyFactor, maxSupplyFactor).
  supplyElasticity: 0.5,
  minSupplyFactor: 0.6,
  maxSupplyFactor: 1.6,
  // A town that makes a good but hardly uses it still keeps some in store.
  producerStockShare: 0.25,
  // Makers cut output when an input falls below this share of its target stock.
  inputRationBelow: 0.5,
  // Caravans.
  tripCostPerDay: 0.03, // share of base price, per day of travel
  shipShareOfStock: 0.15,
  shipShareOfTarget: 0.3,
  shipShareOfShortfall: 0.5, // of what the buying town is short of its target
  shipFullMargin: 0.3,
  shipMinShare: 0.2,
  minShipmentShare: 0.01, // of the sender's target stock
  // History, and how "usual" is worked out when a configuration is loaded.
  historyDays: 30,
  warmupDays: 240,
  usualAverageDays: 30,
  // Day report: fairness caps, so no good or town fills the list.
  reportMinChange: 0.05, // since the price was last mentioned
  maxPriceLines: 4,
  maxPriceLinesPerGood: 1,
  maxTradeLines: 2,
  // Everyday trade is not news. A caravan is mentioned only when it carries this much
  // more than that road has lately carried of that good (0.5 = half as much again).
  tradeReportSurge: 0.5,
  tradeMemory: 0.2, // how fast "lately" forgets: weight given to today
  // Story suggestions.
  shortageRatio: 1.5,
  glutRatio: 0.6,
  storyDays: 3,
  recoverRatioHigh: 1.25,
  recoverRatioLow: 0.8,
  maxSuggestionsPerDay: 2,
  maxSuggestionsPerGood: 1
});

export const PRESSURE_TARGET = Object.freeze({ MAKE: "make", USE: "use", ROUTE: "route" });

function fail(message) {
  return Object.assign(new TypeError(message), { statusCode: 400 });
}

function text(value) {
  return String(value ?? "").trim();
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

/**
 * A figure may be a bare number or { value, estimate, basis }. The engine keeps the
 * value and whether it is an estimate. The basis (a sentence saying where a guess came
 * from) stays in the DM's setup document, so rows in the record stay small.
 */
export function figureValue(figure, fallback = 0) {
  const raw = figure && typeof figure === "object" ? figure.value : figure;
  const number = Number(raw);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeFigure(figure, label, { min = 0, allowNull = false } = {}) {
  const isObject = figure && typeof figure === "object";
  const raw = isObject ? figure.value : figure;
  if (raw == null || raw === "") {
    if (allowNull) {
      return { value: null, estimate: Boolean(isObject && figure.estimate) };
    }
    throw fail(`${label} is required.`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min) {
    throw fail(`${label} must be a number of at least ${min}.`);
  }
  return { value, estimate: Boolean(isObject && figure.estimate) };
}

/** Copper pieces as the usual coins: 5000 -> "50 gp", 20 -> "2 sp", 1 -> "1 cp". */
export function formatMoney(copper) {
  const value = Number(copper) || 0;
  const trim = (number) => (Math.round(number * 10) / 10).toString();
  if (value >= 100) return `${trim(value / 100)} gp`;
  if (value >= 10) return `${trim(value / 10)} sp`;
  return `${trim(value)} cp`;
}

function formatQuantity(quantity) {
  return quantity >= 10 ? String(Math.round(quantity)) : (Math.round(quantity * 10) / 10).toString();
}

/**
 * What an event does to the numbers. null means "just a fact".
 *   { type: "pressure", target: "make" | "use", place, good, multiplier, days }
 *   { type: "pressure", target: "route", route, multiplier, days }   (0 closes the road)
 * days is how long it lasts; null means until the DM ends it.
 */
export function normalizeEffect(input) {
  if (input == null) {
    return null;
  }
  if (typeof input !== "object" || input.type !== "pressure") {
    throw fail('An effect must be { type: "pressure", ... } or left out.');
  }
  const target = text(input.target);
  if (!Object.values(PRESSURE_TARGET).includes(target)) {
    throw fail("An effect acts on what is made, what is used, or a road.");
  }
  const multiplier = Number(input.multiplier);
  if (!Number.isFinite(multiplier) || multiplier < 0 || multiplier > 10) {
    throw fail("The multiplier must be a number from 0 to 10.");
  }
  let days = null;
  if (input.days != null && input.days !== "") {
    days = Number(input.days);
    if (!Number.isInteger(days) || days < 1 || days > 2000) {
      throw fail("An effect lasts a whole number of days, or is open-ended.");
    }
  }
  const effect = { type: "pressure", target, multiplier, days, label: text(input.label) || null };
  if (target === PRESSURE_TARGET.ROUTE) {
    if (multiplier > 1) {
      throw fail("A road can be slowed (below 1) or closed (0), not sped up.");
    }
    effect.route = text(input.route);
    if (!effect.route) throw fail("Say which road.");
  } else {
    effect.place = text(input.place);
    effect.good = text(input.good);
    if (!effect.place || !effect.good) throw fail("Say which place and which good.");
  }
  return effect;
}

/**
 * The configuration: goods, roads and each full-detail town's market.
 *   goods:  [{ id, kind?, name, unit, basePrice, madeFrom: [{ good, perUnit }], covers? }]
 *   routes: [{ id, a, b, travelDays, via? }]
 *   places: { <placeId>: { name, knownToPlayers, population, market: { <goodId>: { make, use } } } }
 * basePrice (copper), travelDays, population, make and use are figures: a number, or
 * { value, estimate } so the page can show which ones are guesses.
 */
// Which catalog items follow a good's price, so players can be shown what an item costs
// where they are. Optional and DM-editable. Items listed by id always follow the good;
// item types match only ordinary items (the clients enforce that, see
// docs/tools/town/local-prices.js). Nothing here changes the economy itself.
function normalizeCovers(input, goodId) {
  if (input == null) return null;
  if (typeof input !== "object" || Array.isArray(input)) throw fail(`Good "${goodId}": covers must be an object.`);
  const list = (value, label, max, lowerCase) => {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > max) throw fail(`Good "${goodId}": covers.${label} must be a list of at most ${max}.`);
    const cleaned = value.map((entry) => (lowerCase ? text(entry).toLowerCase() : text(entry))).filter(Boolean);
    if (cleaned.some((entry) => entry.length > 200)) throw fail(`Good "${goodId}": a covers.${label} entry is too long.`);
    return [...new Set(cleaned)].sort();
  };
  const covers = {
    itemIds: list(input.itemIds, "itemIds", 200, false),
    types: list(input.types, "types", 40, true),
    reference: text(input.reference).slice(0, 200),
    estimate: input.estimate === true,
    basis: text(input.basis).slice(0, 300)
  };
  return covers.itemIds.length || covers.types.length ? covers : null;
}

// Two kinds of good.
//   commodity: a real thing sold by a real unit (a sack of grain). It has a price.
//   modifier:  a whole class of catalog items (ordinary weapons). It is never shown as a
//              thing with a price: only as a percentage against each item's own list
//              price. The economy still tracks it against a reference price so that it
//              has something to move, but that figure is never shown to anyone.
export const GOOD_KIND = Object.freeze({ COMMODITY: "commodity", MODIFIER: "modifier" });

export function isModifierGood(good) {
  return good?.kind === GOOD_KIND.MODIFIER;
}

/** 0.78 -> "22% below list price"; 1.08 -> "8% above list price"; 1 -> "at list price". */
export function listPriceText(ratio) {
  const percent = Math.round((Number(ratio) - 1) * 100);
  if (!Number.isFinite(percent) || percent === 0) return "at list price";
  return `${Math.abs(percent)}% ${percent > 0 ? "above" : "below"} list price`;
}

export function normalizeEconomyConfig(input = {}) {
  const goods = [];
  const goodIds = new Set();
  for (const good of input.goods || []) {
    const id = text(good?.id);
    if (!id) throw fail("Each good needs an id.");
    if (goodIds.has(id)) throw fail(`Good "${id}" appears twice.`);
    goodIds.add(id);
    const kind = good.kind == null || good.kind === "" ? GOOD_KIND.COMMODITY : text(good.kind);
    if (kind !== GOOD_KIND.COMMODITY && kind !== GOOD_KIND.MODIFIER) {
      throw fail(`Good "${id}": kind must be "commodity" or "modifier".`);
    }
    goods.push({
      id,
      kind,
      name: text(good.name) || id,
      // A modifier is not sold by any unit.
      unit: kind === GOOD_KIND.MODIFIER ? "" : (text(good.unit) || "unit"),
      basePrice: normalizeFigure(good.basePrice, `Base price of ${id}`, { min: 0.01 }),
      // Free labels the other subjects read, e.g. "medicine". No good is special by id.
      tags: Array.isArray(good.tags) ? [...new Set(good.tags.map(text).filter(Boolean))].sort() : [],
      madeFrom: (good.madeFrom || []).map((input) => ({
        good: text(input?.good),
        perUnit: figureValue(input?.perUnit, 0)
      }))
    });
    const covers = normalizeCovers(good.covers, id);
    if (covers) goods[goods.length - 1].covers = covers;
    if (kind === GOOD_KIND.MODIFIER && !covers) {
      throw fail(`Good "${id}" is a modifier, so it must say which catalog items it applies to (covers).`);
    }
  }
  for (const good of goods) {
    for (const input of good.madeFrom) {
      if (!goodIds.has(input.good) || input.good === good.id) {
        throw fail(`${good.id} is made from "${input.good}", which is not another good in the list.`);
      }
      if (!(input.perUnit > 0)) throw fail(`${good.id} needs a positive amount of ${input.good} per unit.`);
    }
  }

  const places = {};
  for (const [placeId, place] of Object.entries(input.places || {})) {
    const id = text(placeId);
    if (!id) continue;
    const market = {};
    for (const [goodId, entry] of Object.entries(place?.market || {})) {
      if (!goodIds.has(goodId)) throw fail(`${id} lists "${goodId}", which is not in the goods list.`);
      const make = normalizeFigure(entry?.make ?? 0, `What ${id} makes of ${goodId}`);
      const use = normalizeFigure(entry?.use ?? 0, `What ${id} uses of ${goodId}`);
      if (make.value > 0 || use.value > 0) {
        market[goodId] = { make, use };
      }
    }
    places[id] = {
      name: text(place?.name) || id,
      knownToPlayers: place?.knownToPlayers === true,
      population: normalizeFigure(place?.population, `Population of ${id}`, { allowNull: true }),
      market
    };
  }

  const routes = [];
  const routeIds = new Set();
  for (const route of input.routes || []) {
    const id = text(route?.id);
    const a = text(route?.a);
    const b = text(route?.b);
    if (!id || !a || !b || a === b) throw fail("Each road needs an id and two different ends.");
    if (routeIds.has(id)) throw fail(`Road "${id}" appears twice.`);
    routeIds.add(id);
    const entry = { id, a, b, travelDays: normalizeFigure(route.travelDays, `Travel days of ${id}`, { min: 0.25 }) };
    // Optional waypoints so a road can be drawn around a lake or a mountain instead of
    // straight through it. Same convention as a place's position: [up, across], 0 to 1,
    // listed from end "a" to end "b". They change only how the road is drawn.
    if (route?.via != null) {
      if (!Array.isArray(route.via) || route.via.length > 24) throw fail(`Road "${id}": via must be a list of at most 24 points.`);
      entry.via = route.via.map((point) => {
        const ok = Array.isArray(point) && point.length === 2
          && point.every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1);
        if (!ok) throw fail(`Road "${id}": each via point is [up, across], both between 0 and 1.`);
        return [point[0], point[1]];
      });
      if (!entry.via.length) delete entry.via;
    }
    routes.push(entry);
  }
  routes.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

  const constants = {};
  for (const [key, value] of Object.entries(input.constants || {})) {
    if (key in ECONOMY_DEFAULTS && Number.isFinite(Number(value))) constants[key] = Number(value);
  }
  return { goods, routes, places, constants };
}

/** Row: the DM loads or changes the market setup. The whole configuration is kept in the row. */
export function createEconomyConfigure(input) {
  const id = text(input.id);
  if (!id) throw fail("Record id is required.");
  if (!Number.isInteger(input.day) || input.day < 0) throw fail("day must be a whole number.");
  return {
    recordType: ECONOMY_SYSTEM_ID,
    id,
    action: "configure",
    day: input.day,
    at: input.at ?? null,
    config: normalizeEconomyConfig(input.config)
  };
}

/** Row: the DM ends a pressure early. It stops weighing on the numbers after today. */
export function createPressureEnd(input) {
  const id = text(input.id);
  const pressureId = text(input.pressureId);
  if (!id || !pressureId) throw fail("Record id and pressure id are required.");
  if (!Number.isInteger(input.day) || input.day < 0) throw fail("day must be a whole number.");
  return { recordType: "pressure", id, action: "end", pressureId, day: input.day, at: input.at ?? null };
}

export function emptyEconomyState() {
  return { config: null, markets: {}, shipments: [], pressures: {}, pendingEffects: {}, flows: {}, shipmentSeq: 0 };
}

function constantsOf(eco) {
  return { ...ECONOMY_DEFAULTS, ...(eco.config?.constants || {}) };
}

function goodById(config, id) {
  return config.goods.find((good) => good.id === id) || null;
}

/** Everything a town uses of a good in a day at usual prices: its own use plus what its makers need. */
function nominalUse(config, placeId, goodId) {
  const market = config.places[placeId]?.market || {};
  let total = figureValue(market[goodId]?.use);
  for (const good of config.goods) {
    const made = figureValue(market[good.id]?.make);
    if (!made) continue;
    for (const input of good.madeFrom) {
      if (input.good === goodId) total += made * input.perUnit;
    }
  }
  return total;
}

/** Target stock for one town and good. Zero means the town has no market in it. */
export function targetStock(config, placeId, goodId, constants = ECONOMY_DEFAULTS) {
  const make = figureValue(config.places[placeId]?.market?.[goodId]?.make);
  const use = nominalUse(config, placeId, goodId);
  return Math.max(use, make * constants.producerStockShare) * constants.targetStockDays;
}

/** The price a stock level pulls toward. */
export function targetPrice(basePrice, target, stock, constants = ECONOMY_DEFAULTS) {
  const ratio = target / Math.max(stock, target * 1e-6, 1e-9);
  return basePrice * clamp(Math.pow(ratio, constants.priceExponent), constants.minPriceFactor, constants.maxPriceFactor);
}

export function activePressures(eco, day) {
  return Object.values(eco.pressures).filter((pressure) => pressure.fromDay <= day
    && (pressure.untilDay == null || pressure.untilDay >= day));
}

function multiplierFor(pressures, target, placeId, goodId) {
  let multiplier = 1;
  for (const pressure of pressures) {
    if (pressure.target === target && pressure.place === placeId && pressure.good === goodId) {
      multiplier *= pressure.multiplier;
    }
  }
  return multiplier;
}

export function routeMultiplier(pressures, routeId) {
  let multiplier = 1;
  for (const pressure of pressures) {
    if (pressure.target === PRESSURE_TARGET.ROUTE && pressure.route === routeId) {
      multiplier *= pressure.multiplier;
    }
  }
  return multiplier;
}

function inboundQuantity(eco, placeId, goodId) {
  let total = 0;
  for (const shipment of eco.shipments) {
    if (shipment.to === placeId && shipment.good === goodId) total += shipment.quantity;
  }
  return total;
}

function freshMarkets(config, constants) {
  const markets = {};
  for (const placeId of Object.keys(config.places).sort()) {
    const entries = {};
    for (const good of config.goods) {
      const target = targetStock(config, placeId, good.id, constants);
      if (target > 0) {
        const base = good.basePrice.value;
        entries[good.id] = { stock: target, price: base, usual: base, history: [base], reported: base, highDays: 0, lowDays: 0, flag: null, inputFactor: 1 };
      }
    }
    if (Object.keys(entries).length) markets[placeId] = entries;
  }
  return markets;
}

/**
 * One day of the economy, in place. `out` collects what happened:
 *   out.eased, out.arrived, out.shipped, out.moves
 */
function stepEconomy(eco, day, out = {}) {
  const config = eco.config;
  if (!config) return;
  const constants = constantsOf(eco);
  // Other subjects (people, sickness) may scale what a town uses of a good today.
  const useFactor = typeof out.useFactor === "function" ? out.useFactor : () => 1;
  const eased = out.eased || (out.eased = []);
  const shipped = out.shipped || (out.shipped = []);
  const moves = out.moves || (out.moves = []);

  // 1. Pressures that have run their course.
  for (const id of Object.keys(eco.pressures).sort()) {
    const pressure = eco.pressures[id];
    if (pressure.untilDay != null && pressure.untilDay < day) {
      eased.push(pressure);
      delete eco.pressures[id];
    }
  }
  const pressures = activePressures(eco, day);
  const placeIds = Object.keys(eco.markets).sort();

  // 2. Caravans that arrive today.
  const stillTravelling = [];
  for (const shipment of eco.shipments) {
    const entry = eco.markets[shipment.to]?.[shipment.good];
    if (shipment.arriveDay <= day) {
      if (entry) entry.stock += shipment.quantity;
    } else {
      stillTravelling.push(shipment);
    }
  }
  eco.shipments = stillTravelling;

  // 3. Made and used. Makers first draw what they need from the town's own stock of each input.
  const before = {};
  for (const placeId of placeIds) {
    const entries = eco.markets[placeId];
    const market = config.places[placeId]?.market || {};
    before[placeId] = {};
    for (const good of config.goods) {
      const entry = entries[good.id];
      if (!entry) continue;
      before[placeId][good.id] = entry.price;
      let make = figureValue(market[good.id]?.make)
        * multiplierFor(pressures, PRESSURE_TARGET.MAKE, placeId, good.id)
        * clamp(Math.pow(entry.price / good.basePrice.value, constants.supplyElasticity), constants.minSupplyFactor, constants.maxSupplyFactor);
      let inputFactor = 1;
      for (const input of good.madeFrom) {
        const inputEntry = entries[input.good];
        const inputTarget = targetStock(config, placeId, input.good, constants);
        const available = inputEntry ? inputEntry.stock : 0;
        const rationed = inputTarget > 0 ? available / (inputTarget * constants.inputRationBelow) : 0;
        const enough = make > 0 ? available / (make * input.perUnit) : 1;
        inputFactor = Math.min(inputFactor, clamp(Math.min(rationed, enough), 0, 1));
      }
      make *= inputFactor;
      for (const input of good.madeFrom) {
        const inputEntry = entries[input.good];
        if (inputEntry) inputEntry.stock = Math.max(0, inputEntry.stock - make * input.perUnit);
      }
      entry.inputFactor = good.madeFrom.length ? inputFactor : 1;
      const wanted = figureValue(market[good.id]?.use)
        * useFactor(placeId, good)
        * multiplierFor(pressures, PRESSURE_TARGET.USE, placeId, good.id)
        * Math.pow(entry.price / good.basePrice.value, -constants.demandElasticity);
      entry.stock = Math.max(0, entry.stock + make - Math.min(wanted, entry.stock + make));
    }
  }

  // 4. Caravans that leave today, toward the dearer town, if the gap beats the cost of the trip.
  for (const route of config.routes) {
    const marketA = eco.markets[route.a];
    const marketB = eco.markets[route.b];
    if (!marketA || !marketB) continue; // a road to a sketched place carries no simulated trade
    const flow = routeMultiplier(pressures, route.id);
    if (flow <= 0) continue;
    const travel = Math.max(1, Math.ceil(route.travelDays.value / flow));
    for (const good of config.goods) {
      const a = marketA[good.id];
      const b = marketB[good.id];
      if (!a || !b || a.price === b.price) continue;
      const [fromId, from, toId, to] = a.price < b.price ? [route.a, a, route.b, b] : [route.b, b, route.a, a];
      const base = good.basePrice.value;
      const toTarget = targetStock(config, toId, good.id, constants);
      const expected = targetPrice(base, toTarget, to.stock + inboundQuantity(eco, toId, good.id), constants);
      const gap = Math.min(to.price, expected) - from.price;
      const cost = base * constants.tripCostPerDay * travel;
      if (gap <= cost) continue;
      const fromTarget = targetStock(config, fromId, good.id, constants);
      // A caravan carries what the buyer is short of, not everything the seller can spare:
      // a big town does not flood a small one.
      const shortfall = toTarget - (to.stock + inboundQuantity(eco, toId, good.id));
      if (shortfall <= 0) continue;
      const quantity = Math.min(
        from.stock * constants.shipShareOfStock,
        fromTarget * constants.shipShareOfTarget,
        shortfall * constants.shipShareOfShortfall
      )
        * Math.min(1, flow)
        * Math.min(1, (gap - cost) / (base * constants.shipFullMargin) + constants.shipMinShare);
      if (quantity < Math.min(fromTarget, toTarget) * constants.minShipmentShare || quantity <= 0) continue;
      from.stock -= quantity;
      eco.shipmentSeq += 1;
      const shipment = {
        id: `sh-${day}-${eco.shipmentSeq}`, good: good.id, from: fromId, to: toId, route: route.id,
        quantity, departDay: day, arriveDay: day + travel
      };
      eco.shipments.push(shipment);
      const flowKey = `${route.id}|${good.id}|${fromId}`;
      const lately = eco.flows[flowKey] || 0;
      shipped.push({ ...shipment, value: quantity * base, flowKey, surge: quantity > lately * (1 + constants.tradeReportSurge) });
    }
  }
  // Remember what each road has lately carried, so only a change is reported.
  const today = {};
  for (const shipment of shipped) today[shipment.flowKey] = (today[shipment.flowKey] || 0) + shipment.quantity;
  for (const key of new Set([...Object.keys(eco.flows), ...Object.keys(today)])) {
    const next = (eco.flows[key] || 0) * (1 - constants.tradeMemory) + (today[key] || 0) * constants.tradeMemory;
    if (next < 1e-6) delete eco.flows[key];
    else eco.flows[key] = next;
  }

  // 5. Prices follow stock.
  for (const placeId of placeIds) {
    for (const good of config.goods) {
      const entry = eco.markets[placeId][good.id];
      if (!entry) continue;
      const target = targetStock(config, placeId, good.id, constants);
      const wanted = targetPrice(good.basePrice.value, target, entry.stock, constants);
      entry.price += constants.priceStep * (wanted - entry.price);
      entry.history.push(entry.price);
      if (entry.history.length > constants.historyDays) entry.history.shift();
      // Measured against the price last mentioned in a report, so a slow slide is
      // reported once it adds up, not lost because no single day was large.
      const change = entry.price / (entry.reported ?? before[placeId][good.id]) - 1;
      if (Math.abs(change) >= constants.reportMinChange) {
        moves.push({ place: placeId, good: good.id, change, price: entry.price });
      }
    }
  }
}

/** Settled markets for a configuration with nothing unusual going on. */
function warmUp(config) {
  const eco = { ...emptyEconomyState(), config };
  const constants = constantsOf(eco);
  eco.markets = freshMarkets(config, constants);
  for (let day = 1; day <= constants.warmupDays; day += 1) {
    stepEconomy(eco, day);
  }
  for (const entries of Object.values(eco.markets)) {
    for (const entry of Object.values(entries)) {
      const recent = entry.history.slice(-constants.usualAverageDays);
      entry.usual = recent.reduce((sum, price) => sum + price, 0) / recent.length;
      entry.history = [entry.price];
      entry.reported = entry.price;
      entry.highDays = 0;
      entry.lowDays = 0;
      entry.flag = null;
    }
  }
  return { markets: eco.markets, flows: eco.flows };
}

/** Loads a configuration into the running state. Existing stock and prices are kept. */
function applyConfig(eco, config) {
  const { markets: settled, flows: settledFlows } = warmUp(config);
  const markets = {};
  for (const [placeId, entries] of Object.entries(settled)) {
    markets[placeId] = {};
    for (const [goodId, entry] of Object.entries(entries)) {
      const existing = eco.markets?.[placeId]?.[goodId];
      markets[placeId][goodId] = existing ? { ...existing, usual: entry.usual } : entry;
    }
  }
  eco.config = config;
  eco.markets = markets;
  eco.flows = settledFlows;
  eco.shipments = (eco.shipments || []).filter((shipment) => markets[shipment.to]?.[shipment.good]);
  for (const [id, pressure] of Object.entries(eco.pressures || {})) {
    const gone = pressure.target === PRESSURE_TARGET.ROUTE
      ? !config.routes.some((route) => route.id === pressure.route)
      : !markets[pressure.place]?.[pressure.good];
    if (gone) delete eco.pressures[id];
  }
}

/** Why an effect cannot apply to the world as it is, or "" if it can. */
export function effectProblem(state, effect) {
  if (!effect) return "";
  const eco = state?.systems?.[ECONOMY_SYSTEM_ID];
  if (!eco?.config) return "No markets are set up yet, so an event cannot change prices. Load the setup file first.";
  if (effect.target === PRESSURE_TARGET.ROUTE) {
    return eco.config.routes.some((route) => route.id === effect.route) ? "" : "That road is not in the setup.";
  }
  if (!eco.markets[effect.place]) return "That place has no market yet. Give it one first, or write this as a plain fact.";
  if (!eco.markets[effect.place][effect.good]) return "That place neither makes nor uses that good.";
  return "";
}

function addPressure(eco, effect, { eventId, day, text: eventText }) {
  const id = `p-${eventId}`;
  if (eco.pressures[id]) return false;
  eco.pressures[id] = {
    id,
    target: effect.target,
    place: effect.place ?? null,
    good: effect.good ?? null,
    route: effect.route ?? null,
    multiplier: effect.multiplier,
    fromDay: day + 1,
    untilDay: effect.days == null ? null : day + effect.days,
    cause: eventId,
    label: effect.label || text(eventText) || "A written event"
  };
  return true;
}

/**
 * Applies one record to the economy state, in place. Reads:
 *   economy rows   (action "configure")
 *   pressure rows  (action "end")
 *   written events with an effect            -> a pressure, starting the next day
 *   suggested events with an effect          -> remembered until the DM decides
 *   decisions on those                       -> accept or reword starts the pressure
 * Returns true if the row changed anything.
 */
export function applyEconomyRecord(eco, record) {
  if (record?.recordType === ECONOMY_SYSTEM_ID && record.action === "configure") {
    applyConfig(eco, normalizeEconomyConfig(record.config));
    return true;
  }
  if (record?.recordType === "pressure" && record.action === "end") {
    const pressure = eco.pressures[record.pressureId];
    if (!pressure) return false;
    pressure.untilDay = record.day;
    return true;
  }
  if (record?.recordType === "event" && record.effect) {
    if (!eco.config || effectProblem({ systems: { [ECONOMY_SYSTEM_ID]: eco } }, record.effect)) return false;
    if (record.status === "written") {
      return addPressure(eco, record.effect, { eventId: record.id, day: record.day, text: record.text });
    }
    if (record.status === "suggested") {
      eco.pendingEffects[record.id] = { effect: record.effect, text: record.text };
      return true;
    }
    return false;
  }
  if (record?.recordType === "decision") {
    const pending = eco.pendingEffects?.[record.eventId];
    if (!pending) return false;
    delete eco.pendingEffects[record.eventId];
    if (record.decision === "reject") return true;
    return addPressure(eco, pending.effect, { eventId: record.eventId, day: record.day, text: record.text || pending.text });
  }
  return false;
}

/**
 * How much of its usual use a town has today, from the other subjects' running numbers:
 *   people   - head count against the population in the setup
 *   sickness - extra use of any good carrying a tag the sickness names (e.g. "medicine")
 * Both read yesterday's committed state, so the order systems run in cannot matter.
 */
export function createUseFactor(world) {
  const config = world?.systems?.[ECONOMY_SYSTEM_ID]?.config;
  const change = world?.systems?.people?.change || {};
  const sickness = world?.systems?.sickness?.items || {};
  return (placeId, good) => {
    let factor = 1;
    const usual = Math.round(figureValue(config?.places?.[placeId]?.population, 0));
    const now = Math.max(0, usual + (change[placeId] || 0));
    if (usual > 0) {
      factor *= now / usual;
    }
    for (const item of Object.values(sickness)) {
      if (item.place !== placeId || item.ended || !(item.sick > 0)) continue;
      if (!(good.tags || []).includes(item.raisesUseOf)) continue;
      if (now > 0) factor *= 1 + item.usePerSickShare * Math.min(1, item.sick / now);
    }
    return factor;
  };
}

function nameOfPlace(config, id) {
  return config.places[id]?.name || id;
}

/**
 * The subject system. Runs the day's numbers, then reports the larger moves and
 * suggests a story consequence where a good has been far from its usual price
 * for several days. Caps keep any one good from filling the report or the
 * suggestions; what is held back today is still there to be raised tomorrow.
 */
export const economySystem = Object.freeze({
  id: ECONOMY_SYSTEM_ID,
  init: emptyEconomyState,
  tick(ctx) {
    const eco = ctx.state;
    if (!eco.config) return;
    const config = eco.config;
    const constants = constantsOf(eco);
    // What people and sickness did up to yesterday scales today's use, the same way
    // for every good: head count for all goods, and the sick for goods tagged for it.
    const out = { useFactor: createUseFactor(ctx.world) };
    stepEconomy(eco, ctx.day, out);

    for (const pressure of out.eased) {
      ctx.report({ kind: "Eases", text: `"${pressure.label}" no longer weighs on the numbers.`, place: pressure.place ?? null });
    }

    const perGood = new Map();
    let priceLines = 0;
    for (const move of [...out.moves].sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || (a.place + a.good < b.place + b.good ? -1 : 1))) {
      if (priceLines >= constants.maxPriceLines) break;
      const used = perGood.get(move.good) || 0;
      if (used >= constants.maxPriceLinesPerGood) continue;
      perGood.set(move.good, used + 1);
      priceLines += 1;
      eco.markets[move.place][move.good].reported = move.price;
      const good = goodById(config, move.good);
      ctx.report({
        kind: "Price",
        text: isModifierGood(good)
          ? `${good.name} in ${nameOfPlace(config, move.place)} now ${listPriceText(move.price / good.basePrice.value)}, ${move.change > 0 ? "up" : "down"} ${Math.abs(Math.round(move.change * 100))}% since last mentioned.`
          : `${good.name} in ${nameOfPlace(config, move.place)} ${move.change > 0 ? "up" : "down"} ${Math.abs(Math.round(move.change * 100))}% to ${formatMoney(move.price)} since last mentioned.`,
        place: move.place,
        good: move.good,
        direction: move.change > 0 ? "up" : "down"
      });
    }

    for (const shipment of out.shipped.filter((entry) => entry.surge).sort((a, b) => b.value - a.value || (a.id < b.id ? -1 : 1)).slice(0, constants.maxTradeLines)) {
      const good = goodById(config, shipment.good);
      const days = shipment.arriveDay - shipment.departDay;
      ctx.report({
        kind: "Trade",
        text: isModifierGood(good)
          ? `More ${good.name.toLowerCase()} than usual left ${nameOfPlace(config, shipment.from)} for ${nameOfPlace(config, shipment.to)}, ${days} day${days === 1 ? "" : "s"} on the road.`
          : `More ${good.name.toLowerCase()} than usual left ${nameOfPlace(config, shipment.from)} for ${nameOfPlace(config, shipment.to)}: ${formatQuantity(shipment.quantity)} ${good.unit}${shipment.quantity === 1 ? "" : "s"}, ${days} day${days === 1 ? "" : "s"} on the road.`,
        place: shipment.to,
        good: shipment.good
      });
    }

    // Story consequences: a good far above or below its usual price for several days.
    const candidates = [];
    for (const placeId of Object.keys(eco.markets).sort()) {
      for (const good of config.goods) {
        const entry = eco.markets[placeId][good.id];
        if (!entry || !(entry.usual > 0)) continue;
        const ratio = entry.price / entry.usual;
        entry.highDays = ratio >= constants.shortageRatio ? entry.highDays + 1 : 0;
        entry.lowDays = ratio <= constants.glutRatio ? entry.lowDays + 1 : 0;
        if (entry.flag && ratio < constants.recoverRatioHigh && ratio > constants.recoverRatioLow) entry.flag = null;
        if (entry.flag) continue;
        if (entry.highDays >= constants.storyDays) candidates.push({ kind: "short", placeId, good, entry, weight: ratio });
        else if (entry.lowDays >= constants.storyDays) candidates.push({ kind: "glut", placeId, good, entry, weight: 1 / ratio });
      }
    }
    candidates.sort((a, b) => b.weight - a.weight || (a.placeId + a.good.id < b.placeId + b.good.id ? -1 : 1));
    const suggestedPerGood = new Map();
    let raised = 0;
    for (const candidate of candidates) {
      if (raised >= constants.maxSuggestionsPerDay) break;
      const used = suggestedPerGood.get(candidate.good.id) || 0;
      if (used >= constants.maxSuggestionsPerGood) continue;
      suggestedPerGood.set(candidate.good.id, used + 1);
      raised += 1;
      candidate.entry.flag = candidate.kind;
      const place = nameOfPlace(config, candidate.placeId);
      const percent = Math.abs(Math.round((candidate.entry.price / candidate.entry.usual - 1) * 100));
      const days = candidate.kind === "short" ? candidate.entry.highDays : candidate.entry.lowDays;
      ctx.suggest(candidate.kind === "short"
        ? {
            text: `${candidate.good.name} is running short in ${place}.`,
            place: candidate.placeId,
            why: `${candidate.good.name} there has cost about ${percent}% more than usual for ${days} days.`,
            tags: ["economy:shortage", `good:${candidate.good.id}`]
          }
        : {
            text: `${candidate.good.name} is piling up unsold in ${place}.`,
            place: candidate.placeId,
            why: `${candidate.good.name} there has cost about ${percent}% less than usual for ${days} days.`,
            tags: ["economy:glut", `good:${candidate.good.id}`]
          });
    }
  }
});

function whyFor(eco, day, placeId, goodId) {
  const config = eco.config;
  const lines = [];
  for (const pressure of activePressures(eco, day + 1).concat(activePressures(eco, day)).filter((p, i, all) => all.indexOf(p) === i)) {
    const until = pressure.untilDay == null ? null : pressure.untilDay;
    if (pressure.target === PRESSURE_TARGET.ROUTE) {
      const route = config.routes.find((entry) => entry.id === pressure.route);
      if (route && (route.a === placeId || route.b === placeId)) {
        const other = nameOfPlace(config, route.a === placeId ? route.b : route.a);
        lines.push({ pressureId: pressure.id, text: `${pressure.multiplier === 0 ? "Road closed" : "Road slowed"} to ${other}: ${pressure.label}`, untilDay: until });
      }
    } else if (pressure.place === placeId && (!goodId || pressure.good === goodId)) {
      lines.push({ pressureId: pressure.id, text: pressure.label, untilDay: until });
    }
  }
  if (goodId) {
    const entry = eco.markets[placeId]?.[goodId];
    const good = goodById(config, goodId);
    if (entry && good.madeFrom.length && entry.inputFactor < 0.999) {
      const names = good.madeFrom.map((input) => goodById(config, input.good).name.toLowerCase()).join(" and ");
      lines.push({ pressureId: null, text: `Makers are short of ${names}, so less is being made`, untilDay: null });
    }
  }
  return lines;
}

/** The DM's view of the markets: every town, good, road, pressure and caravan. */
export function describeEconomy(state) {
  const eco = state?.systems?.[ECONOMY_SYSTEM_ID];
  if (!eco?.config) {
    return { configured: false, goods: [], places: [], routes: [], pressures: [], shipments: [] };
  }
  const config = eco.config;
  const constants = constantsOf(eco);
  const day = state.day;
  const pressures = activePressures(eco, day + 1).concat(activePressures(eco, day)).filter((p, i, all) => all.indexOf(p) === i);
  return {
    configured: true,
    constants,
    goods: config.goods.map((good) => ({
      id: good.id, kind: good.kind || GOOD_KIND.COMMODITY, name: good.name, unit: good.unit,
      basePrice: good.basePrice.value,
      // A modifier's reference figure is bookkeeping, not a price anyone pays.
      basePriceText: isModifierGood(good) ? "" : formatMoney(good.basePrice.value),
      basePriceEstimate: good.basePrice.estimate,
      tags: good.tags || [],
      madeFrom: good.madeFrom,
      covers: good.covers || null
    })),
    places: Object.keys(config.places).sort().map((placeId) => {
      const place = config.places[placeId];
      return {
        id: placeId,
        name: place.name,
        population: place.population.value,
        populationEstimate: place.population.estimate,
        hasMarket: Boolean(eco.markets[placeId]),
        why: whyFor(eco, day, placeId, null),
        goods: config.goods.filter((good) => eco.markets[placeId]?.[good.id]).map((good) => {
          const entry = eco.markets[placeId][good.id];
          const market = place.market[good.id] || {};
          const use = nominalUse(config, placeId, good.id);
          const modifier = isModifierGood(good);
          return {
            good: good.id,
            kind: good.kind || GOOD_KIND.COMMODITY,
            price: entry.price,
            // A modifier is read only as a percentage against list price, never in coin.
            priceText: modifier ? "" : formatMoney(entry.price),
            usual: entry.usual,
            usualText: modifier ? "" : formatMoney(entry.usual),
            listPercent: Math.round((entry.price / good.basePrice.value - 1) * 100),
            listText: listPriceText(entry.price / good.basePrice.value),
            usualListText: listPriceText(entry.usual / good.basePrice.value),
            vsUsualPercent: Math.round((entry.price / entry.usual - 1) * 100),
            stock: entry.stock,
            daysLeft: use > 0 ? Math.round(entry.stock / use) : null,
            history: entry.history.slice(-14),
            make: figureValue(market.make), makeEstimate: Boolean(market.make?.estimate),
            use: figureValue(market.use), useEstimate: Boolean(market.use?.estimate),
            why: whyFor(eco, day, placeId, good.id)
          };
        })
      };
    }),
    routes: config.routes.map((route) => {
      const flow = routeMultiplier(pressures, route.id);
      const blocking = pressures.filter((p) => p.target === PRESSURE_TARGET.ROUTE && p.route === route.id);
      return {
        id: route.id, a: route.a, b: route.b,
        aName: nameOfPlace(config, route.a), bName: nameOfPlace(config, route.b),
        travelDays: route.travelDays.value, travelDaysEstimate: route.travelDays.estimate,
        status: flow === 0 ? "closed" : flow < 1 ? "slowed" : "open",
        untilDay: blocking.length ? Math.max(...blocking.map((p) => (p.untilDay == null ? Infinity : p.untilDay))) : null,
        simulated: Boolean(eco.markets[route.a] && eco.markets[route.b])
      };
    }).map((route) => ({ ...route, untilDay: route.untilDay === Infinity ? null : route.untilDay })),
    pressures: pressures.map((pressure) => ({ ...pressure })),
    shipments: eco.shipments.map((shipment) => ({ ...shipment }))
  };
}

/**
 * What players may see: prices in one town, and only if that town is known to them.
 * Returns { place: { name } | null, prices: [...] } where each entry is one of:
 *   a commodity: { good, kind: "commodity", unit, price, priceText, vsUsualPercent, ratio, covers }
 *   a modifier:  { good, kind: "modifier", ratio, covers }  (no unit and no price at all)
 * ratio is this town's price over the good's base price; covers says which catalog items
 * follow the good, so a client shows an item's local price as its own catalog price times
 * ratio. A modifier exists only to be applied to real items like that.
 * No stock, no reasons, no other town. An unknown, hidden or market-less town gives
 * the same empty answer as a world that has not started.
 */
export function publicPrices(state, placeId) {
  const empty = { place: null, prices: [] };
  const eco = state?.systems?.[ECONOMY_SYSTEM_ID];
  const place = eco?.config?.places?.[placeId];
  if (!place || place.knownToPlayers !== true || !eco.markets[placeId]) {
    return empty;
  }
  return {
    place: { name: place.name },
    prices: eco.config.goods.filter((good) => eco.markets[placeId][good.id]).map((good) => {
      const entry = eco.markets[placeId][good.id];
      const ratio = Math.round((entry.price / good.basePrice.value) * 10000) / 10000;
      const covers = { itemIds: [...(good.covers?.itemIds || [])], types: [...(good.covers?.types || [])] };
      if (isModifierGood(good)) {
        return { good: good.name, kind: GOOD_KIND.MODIFIER, ratio, covers };
      }
      return {
        good: good.name,
        kind: GOOD_KIND.COMMODITY,
        unit: good.unit,
        price: Math.round(entry.price * 100) / 100,
        priceText: formatMoney(entry.price),
        vsUsualPercent: Math.round((entry.price / entry.usual - 1) * 100),
        ratio,
        covers
      };
    })
  };
}

/**
 * A first guess at a market for a place being given one: what it uses, scaled from
 * what the existing towns use per head. It makes nothing until the DM says so.
 * Every figure is marked as an estimate.
 */
export function estimateMarket(config, population) {
  const people = Number(population) || 0;
  let totalPeople = 0;
  const totals = {};
  for (const place of Object.values(config.places)) {
    const size = figureValue(place.population.value == null ? 0 : place.population);
    if (!size || !Object.keys(place.market).length) continue;
    totalPeople += size;
    for (const [goodId, entry] of Object.entries(place.market)) {
      totals[goodId] = (totals[goodId] || 0) + figureValue(entry.use);
    }
  }
  const market = {};
  for (const good of config.goods) {
    const perHead = totalPeople ? (totals[good.id] || 0) / totalPeople : 0;
    const use = Math.round(perHead * people * 100) / 100;
    if (use > 0) {
      market[good.id] = {
        make: { value: 0, estimate: true, basis: "Not stated; set what this place makes" },
        use: { value: use, estimate: true, basis: "Scaled by population from what the other towns use per head" }
      };
    }
  }
  return market;
}
