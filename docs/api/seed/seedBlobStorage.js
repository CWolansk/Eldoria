"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");
const {
  PLAYER_SHEET_SCHEMA_VERSION,
  createPlaceholderPlayerSheetDto,
  normalizePlayerSheetDto
} = require("../src/playerSheetDto");

const API_ROOT = path.resolve(__dirname, "..");
const DOCS_ROOT = path.resolve(API_ROOT, "..");
const DEFAULT_CONTAINER = "eldoria-character-data";

const DEFAULTS = {
  charactersDir: path.join(DOCS_ROOT, "character-sheets/v1/characters"),
  playersManifest: path.join(DOCS_ROOT, "character-sheets/v1/players.json")
};

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function parseArgs(argv) {
  const options = {
    container: readEnv("ELDORIA_CHARACTER_CONTAINER") || readEnv("CHARACTERS_CONTAINER") || DEFAULT_CONTAINER,
    prefix: "",
    dryRun: false,
    includeCharacters: true,
    includePlayersManifest: true,
    purgeCharacterDocuments: false,
    useCharacterFiles: false,
    ...DEFAULTS
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      return argv[index];
    };

    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--skip-characters") options.includeCharacters = false;
    else if (arg === "--skip-builders") {
      // Accepted for old command lines; builder uploads are always skipped in v2.
    }
    else if (arg === "--include-builders") throw new Error("Builder DTO uploads are no longer supported by the PlayerSheetDTO v2 API.");
    else if (arg === "--skip-players-manifest") options.includePlayersManifest = false;
    else if (arg === "--purge-character-documents") options.purgeCharacterDocuments = true;
    else if (arg === "--use-character-files") options.useCharacterFiles = true;
    else if (arg === "--container") options.container = next();
    else if (arg === "--prefix") options.prefix = next();
    else if (arg === "--characters-dir") options.charactersDir = path.resolve(next());
    else if (arg === "--builders-dir") next();
    else if (arg === "--players-manifest") options.playersManifest = path.resolve(next());
    else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.prefix = options.prefix.replace(/^\/+|\/+$/gu, "");
  return options;
}

function printHelp() {
  console.log(`Seed Eldoria character data into Azure Blob Storage.

Usage:
  node seed/seedBlobStorage.js [options]

Options:
  --dry-run                    Print planned uploads without writing blobs.
  --container <name>           Blob container. Defaults to ELDORIA_CHARACTER_CONTAINER or ${DEFAULT_CONTAINER}.
  --prefix <path>              Optional blob prefix.
  --characters-dir <path>      Source v2 PlayerSheetDTO folder when --use-character-files is set.
  --players-manifest <path>    Source players manifest JSON file.
  --skip-characters            Do not upload sheet DTOs.
  --skip-builders              No-op legacy flag; builder DTOs are not uploaded in v2.
  --skip-players-manifest      Do not upload players manifest.
  --purge-character-documents  Delete each manifest player's old sheet and builder blobs before seeding.
  --use-character-files        Upload v2 DTOs from --characters-dir instead of blank placeholders.

Rules catalogs (docs/data/*.json) now live in Azure Table Storage.
Seed them with: node seed/seedTableStorage.js
`);
}

function createBlobServiceClient() {
  const connectionString = readEnv("ELDORIA_STORAGE_CONNECTION_STRING") || readEnv("AzureWebJobsStorage");
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const storageAccount = readEnv("ELDORIA_STORAGE_ACCOUNT") || readEnv("STORAGE_ACCOUNT");
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

function joinBlobName(prefix, blobName) {
  return [prefix, blobName]
    .filter(Boolean)
    .join("/")
    .replace(/\/+/gu, "/");
}

async function readJsonFile(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return {
    text,
    data: JSON.parse(text)
  };
}

async function listJsonFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => path.join(dir, entry.name))
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
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

function normalizeMetadata(metadata) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value != null && String(value).trim())
      .map(([key, value]) => [key.toLowerCase(), sanitizeMetadataValue(value)])
  );
}

function getCharacterName(id, data) {
  return data?.identity?.name
    || data?.identity?.playerName
    || data?.characterName
    || data?.name
    || id;
}

function normalizePlayersManifest(manifest = {}) {
  const characters = Array.isArray(manifest.characters) ? manifest.characters : [];
  return {
    schemaVersion: "player-sheet-v2-manifest",
    characters: characters
      .map((character) => ({
        id: String(character?.id || "").trim(),
        playerName: String(character?.playerName || "").trim(),
        characterName: "",
        portraitUrl: String(character?.portraitUrl || "").trim(),
        characterUrl: `characters/${String(character?.id || "").trim()}`,
        status: String(character?.status || "active").trim() || "active"
      }))
      .filter((character) => character.id)
  };
}

async function readPlayersManifestSource(options) {
  try {
    const { data } = await readJsonFile(options.playersManifest);
    return normalizePlayersManifest(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`Players manifest not found: ${options.playersManifest}`);
      return normalizePlayersManifest();
    }
    throw error;
  }
}

async function uploadJsonData(containerClient, sourceLabel, document, blobName, metadata, options) {
  const fullBlobName = joinBlobName(options.prefix, blobName);
  const text = `${JSON.stringify(document, null, 2)}\n`;

  if (options.dryRun) {
    console.log(`[dry-run] ${sourceLabel} -> ${fullBlobName}`);
    return {
      blobName: fullBlobName,
      sourcePath: sourceLabel,
      dryRun: true,
      data: document
    };
  }

  await containerClient.getBlockBlobClient(fullBlobName).uploadData(Buffer.from(text, "utf8"), {
    blobHTTPHeaders: {
      blobContentType: "application/json; charset=utf-8"
    },
    metadata: normalizeMetadata({
      ...metadata,
      seededAt: new Date().toISOString(),
      sourcePath: sourceLabel
    })
  });

  console.log(`${sourceLabel} -> ${fullBlobName}`);
  return {
    blobName: fullBlobName,
    sourcePath: sourceLabel,
    data: document
  };
}

async function uploadJson(containerClient, sourcePath, blobName, metadata, options) {
  const { text, data } = await readJsonFile(sourcePath);
  const fullBlobName = joinBlobName(options.prefix, blobName);
  const relativeSource = path.relative(DOCS_ROOT, sourcePath).replace(/\\/gu, "/");

  if (options.dryRun) {
    console.log(`[dry-run] ${relativeSource} -> ${fullBlobName}`);
    return {
      blobName: fullBlobName,
      sourcePath,
      dryRun: true,
      data
    };
  }

  await containerClient.getBlockBlobClient(fullBlobName).uploadData(Buffer.from(text, "utf8"), {
    blobHTTPHeaders: {
      blobContentType: "application/json; charset=utf-8"
    },
    metadata: normalizeMetadata({
      ...metadata,
      seededAt: new Date().toISOString(),
      sourcePath: relativeSource
    })
  });

  console.log(`${relativeSource} -> ${fullBlobName}`);
  return {
    blobName: fullBlobName,
    sourcePath,
    data
  };
}

async function seedCharacters(containerClient, options) {
  if (!options.useCharacterFiles) {
    throw new Error("seedCharacters requires a manifest argument when generating placeholder sheets.");
  }

  const files = await listJsonFiles(options.charactersDir);
  const uploads = [];

  for (const filePath of files) {
    const id = path.basename(filePath, ".json");
    const { data } = await readJsonFile(filePath);
    const dto = normalizePlayerSheetDto(data, { id });
    uploads.push(await uploadJsonData(
      containerClient,
      path.relative(DOCS_ROOT, filePath).replace(/\\/gu, "/"),
      dto,
      `characters/${id}/sheet.json`,
      {
        kind: "sheet",
        characterId: id,
        name: getCharacterName(id, dto),
        schemaVersion: PLAYER_SHEET_SCHEMA_VERSION
      },
      options
    ));
  }

  return uploads;
}

async function seedPlaceholderCharacters(containerClient, manifest, options) {
  const uploads = [];
  const timestamp = new Date().toISOString();

  for (const character of manifest.characters) {
    const dto = createPlaceholderPlayerSheetDto(character, {
      lastModified: timestamp
    });
    uploads.push(await uploadJsonData(
      containerClient,
      `placeholder:${character.id}`,
      dto,
      `characters/${character.id}/sheet.json`,
      {
        kind: "sheet",
        characterId: character.id,
        name: getCharacterName(character.id, dto),
        schemaVersion: PLAYER_SHEET_SCHEMA_VERSION
      },
      options
    ));
  }

  return uploads;
}

async function seedPlayersManifest(containerClient, manifest, options) {
  return [await uploadJsonData(
    containerClient,
    path.relative(DOCS_ROOT, options.playersManifest).replace(/\\/gu, "/"),
    manifest,
    "manifests/players.json",
    {
      kind: "players-manifest",
      name: "Eldoria Players Manifest"
    },
    options
  )];
}

async function purgeCharacterDocuments(containerClient, manifest, options) {
  let deleted = 0;
  for (const character of manifest.characters) {
    for (const kind of ["sheet", "builder"]) {
      const blobName = joinBlobName(options.prefix, `characters/${character.id}/${kind}.json`);
      if (options.dryRun) {
        console.log(`[dry-run] delete ${blobName}`);
        deleted += 1;
        continue;
      }

      const response = await containerClient.getBlockBlobClient(blobName).deleteIfExists();
      if (response.succeeded) {
        console.log(`deleted ${blobName}`);
        deleted += 1;
      }
    }
  }
  return deleted;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const containerClient = options.dryRun
    ? null
    : createBlobServiceClient().getContainerClient(options.container);

  if (containerClient) {
    await containerClient.createIfNotExists();
  }

  const manifest = await readPlayersManifestSource(options);
  if (!manifest.characters.length) {
    console.warn("No manifest characters found; no placeholder sheets will be seeded.");
  }

  if (options.purgeCharacterDocuments) {
    const deleted = await purgeCharacterDocuments(containerClient, manifest, options);
    console.log(`Purge complete. ${deleted} character sheet cleanup blob(s) ${options.dryRun ? "planned" : "deleted"}.`);
  }

  const uploads = [];
  if (options.includePlayersManifest) {
    uploads.push(...await seedPlayersManifest(containerClient, manifest, options));
  }
  if (options.includeCharacters) {
    uploads.push(...(options.useCharacterFiles
      ? await seedCharacters(containerClient, options)
      : await seedPlaceholderCharacters(containerClient, manifest, options)));
  }

  console.log(`Seed complete. ${uploads.length} blob(s) ${options.dryRun ? "planned" : "uploaded"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
