"use strict";

const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

const KINDS = new Set(["build", "sheet"]);
const DEFAULT_CONTAINER = "characters";

let containerClientPromise;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function assertValidId(id) {
  if (typeof id !== "string" || !id.trim()) {
    throw Object.assign(new Error("Character id is required."), { statusCode: 400 });
  }

  const normalized = id.trim();
  if (
    normalized.length > 128 ||
    /[\\/]/u.test(normalized) ||
    /[^\x20-\x7e]/u.test(normalized)
  ) {
    throw Object.assign(new Error("Character id contains invalid characters."), {
      statusCode: 400,
    });
  }

  return normalized;
}

function assertValidKind(kind) {
  if (!KINDS.has(kind)) {
    throw Object.assign(new Error("Character kind must be 'build' or 'sheet'."), {
      statusCode: 400,
    });
  }
  return kind;
}

function blobName(id, kind) {
  return `${assertValidId(id)}/${assertValidKind(kind)}.json`;
}

function isBlobNotFound(error) {
  return (
    error &&
    (error.statusCode === 404 ||
      error.code === "BlobNotFound" ||
      error.details?.errorCode === "BlobNotFound")
  );
}

async function getContainer() {
  if (!containerClientPromise) {
    containerClientPromise = (async () => {
      const storageAccount = getRequiredEnv("STORAGE_ACCOUNT");
      const containerName =
        (process.env.CHARACTERS_CONTAINER || DEFAULT_CONTAINER).trim() || DEFAULT_CONTAINER;
      const serviceClient = new BlobServiceClient(
        `https://${storageAccount}.blob.core.windows.net`,
        new DefaultAzureCredential()
      );
      const containerClient = serviceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();
      return containerClient;
    })();
  }

  return containerClientPromise;
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

function getDocumentName(id, obj) {
  const candidates = [
    obj?.name,
    obj?.characterName,
    obj?.character?.name,
    obj?.profile?.name,
    obj?.summary?.name,
  ];
  return sanitizeMetadataValue(candidates.find((value) => value), id);
}

async function readDoc(id, kind) {
  const containerClient = await getContainer();
  const client = containerClient.getBlockBlobClient(blobName(id, kind));

  try {
    const buffer = await client.downloadToBuffer();
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    if (isBlobNotFound(error)) {
      return null;
    }
    throw error;
  }
}

async function writeDoc(id, kind, obj) {
  const normalizedId = assertValidId(id);
  const normalizedKind = assertValidKind(kind);
  const lastModified = new Date().toISOString();
  const stored = {
    ...obj,
    id: normalizedId,
    lastModified,
  };
  const payload = Buffer.from(`${JSON.stringify(stored, null, 2)}\n`, "utf8");
  const containerClient = await getContainer();
  const client = containerClient.getBlockBlobClient(blobName(normalizedId, normalizedKind));

  await client.uploadData(payload, {
    blobHTTPHeaders: {
      blobContentType: "application/json; charset=utf-8",
    },
    metadata: {
      name: getDocumentName(normalizedId, stored),
      kind: normalizedKind,
      lastmodified: lastModified,
    },
  });

  return stored;
}

async function deleteDocs(id, kind) {
  const normalizedId = assertValidId(id);
  const kinds = kind ? [assertValidKind(kind)] : Array.from(KINDS);
  const containerClient = await getContainer();

  await Promise.all(
    kinds.map((docKind) =>
      containerClient.getBlockBlobClient(blobName(normalizedId, docKind)).deleteIfExists()
    )
  );
}

function getBlobLastModified(blob, metadata) {
  const metadataDate = metadata?.lastmodified ? new Date(metadata.lastmodified) : null;
  const propertyDate = blob.properties?.lastModified || null;
  const bestDate =
    metadataDate && !Number.isNaN(metadataDate.valueOf()) ? metadataDate : propertyDate;
  return bestDate ? bestDate.toISOString() : null;
}

async function listCharacters() {
  const containerClient = await getContainer();
  const groups = new Map();

  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    const match = /^([^/]+)\/(build|sheet)\.json$/u.exec(blob.name);
    if (!match) {
      continue;
    }

    const [, id, kind] = match;
    const metadata = blob.metadata || {};
    const blobLastModified = getBlobLastModified(blob, metadata);
    const existing = groups.get(id) || {
      id,
      name: sanitizeMetadataValue(metadata.name, id),
      kinds: [],
      lastModified: null,
    };

    if (!existing.kinds.includes(kind)) {
      existing.kinds.push(kind);
    }

    if (!existing.lastModified || (blobLastModified && blobLastModified > existing.lastModified)) {
      existing.lastModified = blobLastModified;
      existing.name = sanitizeMetadataValue(metadata.name, existing.name || id);
    }

    groups.set(id, existing);
  }

  return Array.from(groups.values())
    .map((entry) => ({
      ...entry,
      kinds: entry.kinds.sort(),
    }))
    .sort((left, right) => {
      const modified = String(right.lastModified || "").localeCompare(String(left.lastModified || ""));
      return modified || left.id.localeCompare(right.id);
    });
}

module.exports = {
  KINDS,
  deleteDocs,
  getContainer,
  listCharacters,
  readDoc,
  writeDoc,
};
