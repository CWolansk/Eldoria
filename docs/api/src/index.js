"use strict";

const { app } = require("@azure/functions");
const {
  characterSheetHandler,
  dmSessionHandler,
  healthHandler,
  listCharactersHandler,
  playersManifestHandler
} = require("./characters");
const {
  catalogManifestHandler,
  catalogListHandler,
  catalogODataListHandler,
  catalogEntityHandler
} = require("./catalog");
const { publicIndexHandler } = require("./publicIndexes");
const { dmCharacterActionHandler, dmPartyHandler } = require("./dmDashboard");
const { registerWorldRoutes } = require("./worldRoutes");

app.http("health", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "health",
  handler: healthHandler
});

app.http("playersManifest", {
  methods: ["GET", "PUT", "OPTIONS"],
  authLevel: "anonymous",
  route: "players",
  handler: playersManifestHandler
});

app.http("listCharacters", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "characters",
  handler: listCharactersHandler
});

app.http("characterSheet", {
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "characters/{id}",
  handler: characterSheetHandler
});

app.http("dmSession", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "dm/session",
  handler: dmSessionHandler
});

app.http("dmParty", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "dm/party",
  handler: dmPartyHandler
});

app.http("dmCharacterAction", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "dm/characters/{id}/actions",
  handler: dmCharacterActionHandler
});

app.http("catalogManifest", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "catalog",
  handler: catalogManifestHandler
});

app.http("catalogList", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "catalog/{kind}",
  handler: catalogListHandler
});

app.http("catalogODataList", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "catalog/{kind}/odata",
  handler: catalogODataListHandler
});

app.http("catalogEntity", {
  methods: ["GET", "PATCH", "OPTIONS"],
  authLevel: "anonymous",
  route: "catalog/{kind}/{id}",
  handler: catalogEntityHandler
});

app.http("publicIndex", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "public-index/{kind}",
  handler: publicIndexHandler
});

// Living world (DM only): world, world/start, world/advance, world/events,
// world/events/{id}/decision, world/events/{id}/visibility, world/countdowns,
// world/countdowns/{id}/actions, world/places, world/markets, world/state,
// world/party, world/pressures/{id}/end. One route needs no key and answers with
// local prices only: world/public/prices.
registerWorldRoutes(app);
