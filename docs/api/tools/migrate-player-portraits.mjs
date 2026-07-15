import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { EldoriaApiClient } from "../apiClient/index.js";

const DEFAULT_API_BASE_URL = "https://fn-eldoria-ahakafekhxczebhn.eastus-01.azurewebsites.net/api";
const seedUrl = new URL("../seed/players.json", import.meta.url);

function readOptions(argv) {
  const options = { apiBaseUrl: DEFAULT_API_BASE_URL, apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--api-base-url" && argv[index + 1]) {
      options.apiBaseUrl = argv[++index];
    } else if (arg.startsWith("--api-base-url=")) {
      options.apiBaseUrl = arg.slice("--api-base-url=".length);
    }
  }
  return options;
}

async function requirePublishedPortraits(characters) {
  const failures = [];
  for (const character of characters) {
    try {
      const response = await fetch(character.portraitUrl, { method: "HEAD" });
      const contentType = String(response.headers.get("content-type") || "");
      if (!response.ok || !contentType.startsWith("image/")) {
        failures.push(`${character.id}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      failures.push(`${character.id}: ${error.message}`);
    }
  }

  if (failures.length) {
    throw new Error(`Portrait assets are not published yet:\n${failures.join("\n")}`);
  }
}

const options = readOptions(process.argv.slice(2));
const seed = JSON.parse(await readFile(fileURLToPath(seedUrl), "utf8"));
const characters = Array.isArray(seed.characters) ? seed.characters : [];

console.log(`${options.apply ? "Applying" : "Dry run for"} ${characters.length} player portrait updates.`);
characters.forEach((character) => console.log(`- ${character.id}: ${character.portraitUrl}`));

if (!options.apply) {
  console.log("No cloud data changed. Publish the portrait assets, then rerun with --apply.");
  process.exit(0);
}

await requirePublishedPortraits(characters);
const api = new EldoriaApiClient({ baseUrl: options.apiBaseUrl });
const currentManifest = await api.getPlayersManifest();
const currentById = new Map((currentManifest.characters || []).map((character) => [character.id, character]));

for (const character of characters) {
  const sheet = await api.getCharacterSheet(character.id);
  await api.saveCharacterSheet(character.id, {
    ...sheet,
    identity: {
      ...(sheet.identity || {}),
      portraitUrl: character.portraitUrl
    }
  });
  console.log(`Updated sheet ${character.id}.`);
}

await api.savePlayersManifest({
  ...currentManifest,
  schemaVersion: seed.schemaVersion || currentManifest.schemaVersion,
  characters: characters.map((character) => ({
    ...(currentById.get(character.id) || {}),
    ...character,
    characterUrl: `characters/${character.id}`
  }))
});

console.log("Updated the live player manifest.");
