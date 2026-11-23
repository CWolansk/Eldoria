"use strict";

// HTTP routes for the living world. Every route needs the DM key except the two
// listed in WORLD_PUBLIC_ROUTES: local prices for players (prices and nothing else,
// see publicPrices in the engine) and the rumours the DM has revealed in the party's
// town (the telling and nothing else, see publicRumours).

const { httpError, json, withErrors } = require("./http");
const { requireDmKey } = require("./dmAuth");
const { createWorldService } = require("./worldService");

const MAX_BODY_BYTES = 256 * 1024;

async function readBody(request) {
  let raw = "";
  try {
    raw = typeof request.text === "function" ? await request.text() : "";
  } catch (_error) {
    raw = "";
  }
  if (!raw || !String(raw).trim()) {
    return {};
  }
  if (Buffer.byteLength(String(raw), "utf8") > MAX_BODY_BYTES) {
    throw httpError(413, "Request body is too large.");
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed;
  } catch (error) {
    throw httpError(400, "Request body must be a JSON object.", { cause: error.message });
  }
}

function queryValue(request, name) {
  const query = request.query;
  const value = typeof query?.get === "function" ? query.get(name) : query?.[name];
  return value == null || value === "" ? undefined : value;
}

/**
 * getService: () => Promise<service>. Tests pass one built on in-memory stores;
 * the default builds one on the real storage account the first time it is needed.
 */
function createWorldHandlers(getService = defaultService) {
  function route(methods, action) {
    return (request, context) => withErrors(request, context, async () => {
      // Checked first, before any storage is touched or any input is read.
      requireDmKey(request);
      const handler = methods[request.method];
      if (!handler) {
        throw httpError(405, "Method not allowed.");
      }
      try {
        const service = await getService();
        return json(request, 200, await handler(service, request));
      } catch (error) {
        // Engine validation speaks in TypeError / RangeError; that is the caller's mistake.
        if (!error.statusCode && (error instanceof TypeError || error instanceof RangeError)) {
          throw httpError(400, error.message);
        }
        throw error;
      }
    });
  }

  // The one route players may call. No key, read only, and it never says why.
  function publicRoute(action) {
    return (request, context) => withErrors(request, context, async () => {
      if (request.method !== "GET") {
        throw httpError(405, "Method not allowed.");
      }
      const service = await getService();
      return json(request, 200, await action(service, request));
    });
  }

  return {
    worldPublicPrices: publicRoute((service) => service.getPublicPrices()),
    worldPublicRumours: publicRoute((service) => service.getPublicRumours()),
    worldOverview: route({
      GET: (service) => service.getOverview()
    }),
    worldCity: route({
      GET: (service) => service.getCity(),
      POST: async (service, request) => service.addCityEntry(await readBody(request))
    }),
    worldCityImport: route({
      POST: async (service, request) => service.importCity(await readBody(request))
    }),
    worldCityEntry: route({
      POST: async (service, request) => service.changeCityEntry(request.params?.id, await readBody(request))
    }),
    worldRumours: route({
      GET: (service) => service.listRumours(),
      POST: async (service, request) => service.startRumour(await readBody(request))
    }),
    worldRumourAction: route({
      POST: async (service, request) => service.rumourAction(request.params?.id, await readBody(request))
    }),
    worldTravellers: route({
      POST: async (service, request) => service.setItinerary(await readBody(request))
    }),
    worldTravellerEnd: route({
      POST: (service, request) => service.clearItinerary(request.params?.id)
    }),
    worldMarkets: route({
      GET: (service) => service.getMarkets()
    }),
    worldState: route({
      GET: (service) => service.getState()
    }),
    worldParty: route({
      POST: async (service, request) => service.setParty(await readBody(request))
    }),
    worldPressureEnd: route({
      POST: (service, request) => service.endPressure(request.params?.id)
    }),
    world: route({
      GET: (service) => service.getWorld()
    }),
    worldStart: route({
      POST: async (service, request) => service.startWorld(await readBody(request))
    }),
    worldAdvance: route({
      POST: async (service, request) => service.advance(await readBody(request))
    }),
    worldEvents: route({
      GET: (service, request) => service.listEvents({
        fromDay: queryValue(request, "fromDay"),
        toDay: queryValue(request, "toDay"),
        status: queryValue(request, "status")
      }),
      POST: async (service, request) => service.jot(await readBody(request))
    }),
    worldEventDecision: route({
      POST: async (service, request) => service.decide(request.params?.id, await readBody(request))
    }),
    worldEventVisibility: route({
      POST: async (service, request) => service.setVisibility(request.params?.id, await readBody(request))
    }),
    worldCountdowns: route({
      GET: (service) => service.listCountdowns(),
      POST: async (service, request) => service.createCountdown(await readBody(request))
    }),
    worldCountdownAction: route({
      POST: async (service, request) => service.countdownAction(request.params?.id, await readBody(request))
    }),
    worldPlaces: route({
      GET: (service) => service.getPlaces(),
      PUT: async (service, request) => service.putPlaces(await readBody(request))
    })
  };
}

let servicePromise;

function defaultService() {
  servicePromise ||= (async () => {
    const { createDefaultWorldStore } = require("./worldStore");
    const { getWorldEngine } = require("./worldRuntime");
    const [store, engine] = await Promise.all([createDefaultWorldStore(), getWorldEngine()]);
    return createWorldService({ store, engine });
  })().catch((error) => {
    servicePromise = undefined;
    throw error;
  });
  return servicePromise;
}

/** Route table: name, path, methods and handler key. index.js registers these. */
const WORLD_ROUTES = Object.freeze([
  { name: "world", route: "world", methods: ["GET"], handler: "world" },
  { name: "worldStart", route: "world/start", methods: ["POST"], handler: "worldStart" },
  { name: "worldAdvance", route: "world/advance", methods: ["POST"], handler: "worldAdvance" },
  { name: "worldEvents", route: "world/events", methods: ["GET", "POST"], handler: "worldEvents" },
  { name: "worldEventDecision", route: "world/events/{id}/decision", methods: ["POST"], handler: "worldEventDecision" },
  { name: "worldEventVisibility", route: "world/events/{id}/visibility", methods: ["POST"], handler: "worldEventVisibility" },
  { name: "worldCountdowns", route: "world/countdowns", methods: ["GET", "POST"], handler: "worldCountdowns" },
  { name: "worldCountdownAction", route: "world/countdowns/{id}/actions", methods: ["POST"], handler: "worldCountdownAction" },
  { name: "worldPlaces", route: "world/places", methods: ["GET", "PUT"], handler: "worldPlaces" },
  { name: "worldMarkets", route: "world/markets", methods: ["GET"], handler: "worldMarkets" },
  { name: "worldState", route: "world/state", methods: ["GET"], handler: "worldState" },
  { name: "worldParty", route: "world/party", methods: ["POST"], handler: "worldParty" },
  { name: "worldPressureEnd", route: "world/pressures/{id}/end", methods: ["POST"], handler: "worldPressureEnd" },
  { name: "worldOverview", route: "world/overview", methods: ["GET"], handler: "worldOverview" },
  { name: "worldCity", route: "world/city", methods: ["GET", "POST"], handler: "worldCity" },
  { name: "worldCityImport", route: "world/city/import", methods: ["POST"], handler: "worldCityImport" },
  { name: "worldCityEntry", route: "world/city/{id}/actions", methods: ["POST"], handler: "worldCityEntry" },
  { name: "worldRumours", route: "world/rumours", methods: ["GET", "POST"], handler: "worldRumours" },
  { name: "worldRumourAction", route: "world/rumours/{id}/actions", methods: ["POST"], handler: "worldRumourAction" },
  { name: "worldTravellers", route: "world/travellers", methods: ["POST"], handler: "worldTravellers" },
  { name: "worldTravellerEnd", route: "world/travellers/{id}/end", methods: ["POST"], handler: "worldTravellerEnd" }
]);

/** Routes that need no key. Keep this list short and every entry leak-tested. */
const WORLD_PUBLIC_ROUTES = Object.freeze([
  { name: "worldPublicPrices", route: "world/public/prices", methods: ["GET"], handler: "worldPublicPrices" },
  { name: "worldPublicRumours", route: "world/public/rumours", methods: ["GET"], handler: "worldPublicRumours" }
]);

function registerWorldRoutes(app, handlers = createWorldHandlers()) {
  for (const entry of [...WORLD_ROUTES, ...WORLD_PUBLIC_ROUTES]) {
    app.http(entry.name, {
      methods: [...entry.methods, "OPTIONS"],
      authLevel: "anonymous",
      route: entry.route,
      handler: handlers[entry.handler]
    });
  }
}

module.exports = { WORLD_PUBLIC_ROUTES, WORLD_ROUTES, createWorldHandlers, registerWorldRoutes };
