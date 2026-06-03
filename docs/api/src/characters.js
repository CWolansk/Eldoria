"use strict";

const { deleteDocs, listCharacters, readDoc, writeDoc } = require("./blobStore");

const MAX_BODY_BYTES = 512 * 1024;

function json(status, body) {
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function noContent() {
  return { status: 204 };
}

function getId(request) {
  const id = request.params?.id;
  if (!id || !String(id).trim()) {
    throw Object.assign(new Error("Character id is required."), { statusCode: 400 });
  }
  return String(id).trim();
}

function getSearchParams(request) {
  return new URL(request.url).searchParams;
}

function getKind(request, { required = true } = {}) {
  const kind = getSearchParams(request).get("kind");
  if (!kind && !required) {
    return null;
  }
  if (kind !== "build" && kind !== "sheet") {
    throw Object.assign(new Error("Query parameter 'kind' must be 'build' or 'sheet'."), {
      statusCode: 400,
    });
  }
  return kind;
}

async function readRequestJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Request body is too large."), { statusCode: 413 });
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Request body is too large."), { statusCode: 413 });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { statusCode: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw Object.assign(new Error("Request body must be a JSON object."), { statusCode: 400 });
  }

  return body;
}

function errorResponse(error, context) {
  const status = error.statusCode || error.status || 500;
  if (status >= 500) {
    context.error(error);
  }

  return json(status, {
    error: status >= 500 ? "Internal server error." : error.message,
  });
}

async function withErrors(context, action) {
  try {
    return await action();
  } catch (error) {
    return errorResponse(error, context);
  }
}

async function listCharactersHandler(request, context) {
  return withErrors(context, async () => json(200, { characters: await listCharacters() }));
}

async function getCharacterHandler(request, context) {
  return withErrors(context, async () => {
    const doc = await readDoc(getId(request), getKind(request));
    if (!doc) {
      return json(404, { error: "Character document not found." });
    }
    return json(200, doc);
  });
}

async function putCharacterHandler(request, context) {
  return withErrors(context, async () => {
    const id = getId(request);
    const kind = getKind(request);
    const body = await readRequestJson(request);
    body.id = id;
    const stored = await writeDoc(id, kind, body);
    return json(200, stored);
  });
}

async function deleteCharacterHandler(request, context) {
  return withErrors(context, async () => {
    await deleteDocs(getId(request), getKind(request, { required: false }));
    return noContent();
  });
}

module.exports = {
  deleteCharacterHandler,
  getCharacterHandler,
  listCharactersHandler,
  putCharacterHandler,
};
