"use strict";

const {
  deleteCharacterSheet,
  listCharacters,
  normalizeDocumentId,
  readCharacterSheet,
  readPlayersManifest,
  writeCharacterSheet,
  writePlayersManifest
} = require("./blobStore");
const { httpError, json, noContent, withErrors } = require("./http");
const {
  normalizePlayerSheetDto
} = require("./playerSheetDto");

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

function getMaxBodyBytes() {
  const configured = Number(process.env.ELDORIA_MAX_BODY_BYTES || DEFAULT_MAX_BODY_BYTES);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_BODY_BYTES;
}

function getId(request) {
  return normalizeDocumentId(request.params?.id);
}

async function readRequestJson(request) {
  const maxBodyBytes = getMaxBodyBytes();
  const contentLength = Number(request.headers?.get?.("content-length") || 0);
  if (contentLength > maxBodyBytes) {
    throw httpError(413, "Request body is too large.", {
      maxBodyBytes
    });
  }

  const raw = await request.text();
  if (!raw.trim()) {
    throw httpError(400, "Request body must be valid JSON.");
  }

  if (Buffer.byteLength(raw, "utf8") > maxBodyBytes) {
    throw httpError(413, "Request body is too large.", {
      maxBodyBytes
    });
  }

  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("JSON payload must be an object.");
    }
    return body;
  } catch (error) {
    throw httpError(400, "Request body must be a JSON object.", {
      cause: error.message
    });
  }
}

async function healthHandler(request, context) {
  return withErrors(request, context, async () => json(request, 200, {
    status: "ok",
    service: "eldoria-character-api",
    timestamp: new Date().toISOString()
  }));
}

async function playersManifestHandler(request, context) {
  return withErrors(request, context, async () => {
    if (request.method === "GET") {
      const manifest = await readPlayersManifest();
      if (!manifest) {
        return json(request, 404, {
          error: "Players manifest not found."
        });
      }
      return json(request, 200, manifest);
    }

    if (request.method === "PUT") {
      const manifest = await readRequestJson(request);
      return json(request, 200, await writePlayersManifest(manifest));
    }

    throw httpError(405, "Method not allowed.");
  });
}

async function listCharactersHandler(request, context) {
  return withErrors(request, context, async () => {
    const characters = await listCharacters();
    return json(request, 200, {
      count: characters.length,
      characters
    });
  });
}

async function getCharacterSheetHandler(request, context) {
  return withErrors(request, context, async () => {
    const id = getId(request);
    const sheet = await readCharacterSheet(id);
    if (!sheet) {
      return json(request, 404, {
        error: "Character sheet not found."
      });
    }
    return json(request, 200, normalizePlayerSheetDto(sheet, { id }));
  });
}

async function saveCharacterSheetHandler(request, context) {
  return withErrors(request, context, async () => {
    const id = getId(request);
    const body = await readRequestJson(request);
    const timestamp = new Date().toISOString();
    const dto = normalizePlayerSheetDto(body, {
      id,
      lastModified: timestamp
    });
    dto.lastModified = timestamp;
    const stored = await writeCharacterSheet(id, dto);
    return json(request, 200, stored);
  });
}

async function deleteCharacterSheetHandler(request, context) {
  return withErrors(request, context, async () => {
    await deleteCharacterSheet(getId(request));
    return noContent(request);
  });
}

async function characterSheetHandler(request, context) {
  if (request.method === "GET") {
    return getCharacterSheetHandler(request, context);
  }

  if (request.method === "POST" || request.method === "PUT") {
    return saveCharacterSheetHandler(request, context);
  }

  if (request.method === "DELETE") {
    return deleteCharacterSheetHandler(request, context);
  }

  return withErrors(request, context, async () => {
    throw httpError(405, "Method not allowed.");
  });
}

module.exports = {
  characterSheetHandler,
  healthHandler,
  listCharactersHandler,
  playersManifestHandler
};
