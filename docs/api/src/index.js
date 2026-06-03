"use strict";

const { app } = require("@azure/functions");
const {
  deleteCharacterHandler,
  getCharacterHandler,
  listCharactersHandler,
  putCharacterHandler,
} = require("./characters");

app.http("listCharacters", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "characters",
  handler: listCharactersHandler,
});

app.http("getCharacter", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "characters/{id}",
  handler: getCharacterHandler,
});

app.http("putCharacter", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "characters/{id}",
  handler: putCharacterHandler,
});

app.http("deleteCharacter", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "characters/{id}",
  handler: deleteCharacterHandler,
});
