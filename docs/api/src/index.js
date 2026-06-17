"use strict";

const { app } = require("@azure/functions");
const {
  characterSheetHandler,
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
