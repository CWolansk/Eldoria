"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");
const { httpError } = require("./http");

const DEFAULT_CONTAINER = "eldoria-character-data";
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

let containerClientPromise;

function cleanEnv(name) {
  return String(process.env[name] || "").trim();
}

function getContainerName() {
  return cleanEnv("ELDORIA_CHARACTER_CONTAINER")
    || cleanEnv("CHARACTERS_CONTAINER")
    || DEFAULT_CONTAINER;
}

function getBlobPrefix() {
  return cleanEnv("ELDORIA_BLOB_PREFIX").replace(/^\/+|\/+$/gu, "");
}

function joinBlobName(...parts) {
  return parts
    .filter((part) => part != null && String(part).trim())
    .map((part) => String(part).replace(/^\/+|\/+$/gu, ""))
    .filter(Boolean)
    .join("/");
}

function createBlobServiceClient() {
  const connectionString = cleanEnv("ELDORIA_STORAGE_CONNECTION_STRING")
    || cleanEnv("AzureWebJobsStorage");

  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const storageAccount = cleanEnv("ELDORIA_STORAGE_ACCOUNT") || cleanEnv("STORAGE_ACCOUNT");
  if (!storageAccount) {
    throw new Error(
      "Missing storage configuration. Set ELDORIA_STORAGE_CONNECTION_STRING or ELDORIA_STORAGE_ACCOUNT."
    );
  }

  return new BlobServiceClient(
    `https://${storageAccount}.blob.core.windows.net`,
    new DefaultAzureCredential()
  );
}

async function getContainerClient() {
  if (!containerClientPromise) {
    containerClientPromise = (async () => {
      const serviceClient = createBlobServiceClient();
      const containerClient = serviceClient.getContainerClient(getContainerName());
      if (cleanEnv("ELDORIA_CREATE_CONTAINER").toLowerCase() !== "false") {
        await containerClient.createIfNotExists();
      }
      return containerClient;
    })();
  }

  return containerClientPromise;
}

function normalizeDocumentId(value) {
  let id = String(value || "").trim();
  if (id.toLowerCase().endsWith(".json")) {
    id = id.slice(0, -5);
  }

  if (!id) {
    throw httpError(400, "Character id is required.");
  }

  if (!ID_PATTERN.test(id)) {
    throw httpError(400, "Character id may only contain letters, numbers, '.', '_', and '-'.", {
      id
    });
  }

  return id;
}

function getDocumentBlobName(id) {
  const normalizedId = normalizeDocumentId(id);
  return joinBlobName(getBlobPrefix(), `characters/${normalizedId}/sheet.json`);
}

function getPlayersManifestBlobName() {
  return joinBlobName(getBlobPrefix(), "manifests/players.json");
}

function isBlobNotFound(error) {
  return Boolean(
    error
      && (
        error.statusCode === 404
        || error.code === "BlobNotFound"
        || error.details?.errorCode === "BlobNotFound"
      )
  );
}

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

async function readJsonBlob(blobName) {
  const containerClient = await getContainerClient();
  const blobClient = containerClient.getBlobClient(blobName);

  try {
    const response = await blobClient.download();
    const text = response.readableStreamBody
      ? await streamToString(response.readableStreamBody)
      : "";
    return JSON.parse(text);
  } catch (error) {
    if (isBlobNotFound(error)) {
      return null;
    }
    throw error;
  }
}

function sanitizeMetadataValue(value, fallback = "") {
  const raw = value == null ? fallback : String(value);
  const ascii = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (ascii || fallback || "").slice(0, 256);
}

function getDocumentDisplayName(id, document) {
  const candidates = [
    document?.identity?.name,
    document?.identity?.playerName,
    document?.characterName,
    document?.name,
    document?.summary?.name,
    document?.profile?.name,
    document?.character?.name
  ];
  return sanitizeMetadataValue(candidates.find(Boolean), id);
}

async function writeJsonBlob(blobName, document, metadata = {}) {
  const containerClient = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const body = `${JSON.stringify(document, null, 2)}\n`;

  await blockBlobClient.uploadData(Buffer.from(body, "utf8"), {
    blobHTTPHeaders: {
      blobContentType: "application/json; charset=utf-8"
    },
    metadata: Object.fromEntries(
      Object.entries(metadata)
        .filter(([, value]) => value != null && String(value).trim())
        .map(([key, value]) => [key.toLowerCase(), sanitizeMetadataValue(value)])
    )
  });

  return document;
}

async function deleteJsonBlob(blobName) {
  const containerClient = await getContainerClient();
  await containerClient.getBlockBlobClient(blobName).deleteIfExists();
}

async function readCharacterSheet(id) {
  return readJsonBlob(getDocumentBlobName(id));
}

async function writeCharacterSheet(id, document) {
  const normalizedId = normalizeDocumentId(id);
  const stored = {
    ...document,
    id: normalizedId
  };

  return writeJsonBlob(getDocumentBlobName(normalizedId), stored, {
    kind: "sheet",
    characterId: normalizedId,
    name: getDocumentDisplayName(normalizedId, stored),
    updatedAt: new Date().toISOString()
  });
}

async function deleteCharacterSheet(id) {
  await deleteJsonBlob(getDocumentBlobName(id));
}

async function readPlayersManifest() {
  return readJsonBlob(getPlayersManifestBlobName());
}

async function writePlayersManifest(manifest) {
  return writeJsonBlob(getPlayersManifestBlobName(), manifest, {
    kind: "players-manifest",
    name: "Eldoria Players Manifest",
    updatedAt: new Date().toISOString()
  });
}

function getBlobLastModified(blob, metadata) {
  const metadataDate = metadata?.updatedat ? new Date(metadata.updatedat) : null;
  const propertyDate = blob.properties?.lastModified || null;
  const bestDate = metadataDate && !Number.isNaN(metadataDate.valueOf())
    ? metadataDate
    : propertyDate;
  return bestDate ? bestDate.toISOString() : null;
}

async function listCharacters() {
  const containerClient = await getContainerClient();
  const characters = [];
  const prefix = getBlobPrefix();
  const prefixPath = prefix ? `${prefix}/` : "";

  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    const relativeBlobName = prefixPath
      ? (blob.name.startsWith(prefixPath) ? blob.name.slice(prefixPath.length) : "")
      : blob.name;
    const match = /^characters\/([^/]+)\/sheet\.json$/u.exec(relativeBlobName);
    if (!match) {
      continue;
    }

    const [, id] = match;
    const metadata = blob.metadata || {};
    const lastModified = getBlobLastModified(blob, metadata);

    characters.push({
      id,
      name: sanitizeMetadataValue(metadata.name, id),
      lastModified,
      blobName: blob.name,
      contentLength: blob.properties?.contentLength || null,
      etag: blob.properties?.etag || null
    });
  }

  return characters.sort((left, right) => {
    const modified = String(right.lastModified || "").localeCompare(String(left.lastModified || ""));
    return modified || left.id.localeCompare(right.id);
  });
}

module.exports = {
  getContainerClient,
  listCharacters,
  normalizeDocumentId,
  readCharacterSheet,
  readPlayersManifest,
  writeCharacterSheet,
  writePlayersManifest,
  deleteCharacterSheet
};
