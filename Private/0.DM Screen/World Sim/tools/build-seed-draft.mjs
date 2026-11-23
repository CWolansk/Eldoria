// Builds "Private/0.DM Screen/World Sim/crestfall-seed.draft.json" (kept out of docs/, which is the public site) from what already exists:
//   - marker positions in docs/tools/world-map.html
//   - the vault notes (front matter, plus a few verbatim lines)
//   - item prices from the live API (GET only)
// It copies facts and their sources. It never fills a gap: anything the notes
// do not state is written as null with "missing": true.
//
// Run from anywhere:  node "Private/0.DM Screen/World Sim/tools/build-seed-draft.mjs"
// This tool lives under Private/ because it names DM-only places.
// Add --offline to skip the API (prices are then null and marked missing).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const docsRoot = path.join(repoRoot, "docs");
const almanac = path.join(repoRoot, "Private", "1. World Almanac", "World");
const publicWorld = path.join(repoRoot, "Public", "World");
const outFile = path.join(repoRoot, "Private", "0.DM Screen", "World Sim", "crestfall-seed.draft.json");
const placesFile = path.join(repoRoot, "Private", "0.DM Screen", "World Sim", "places.upload.json");
const offline = process.argv.includes("--offline");

const rel = (file) => path.relative(repoRoot, file).split(path.sep).join("/");
const slug = (text) => String(text).toLowerCase().replace(/['’]/gu, "").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
const missing = (need) => ({ value: null, missing: true, need });
const found = (value, source, extra = {}) => ({ value, source, ...extra });

function readFrontMatter(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(text);
  const data = {};
  if (match) {
    let listKey = null;
    for (const line of match[1].split(/\r?\n/u)) {
      const item = /^\s+-\s+(.*)$/u.exec(line);
      if (item && listKey) {
        data[listKey].push(item[1].trim());
        continue;
      }
      const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/u.exec(line);
      if (pair) {
        const value = pair[2].trim().replace(/^["']|["']$/gu, "");
        if (value === "") {
          data[pair[1]] = [];
          listKey = pair[1];
        } else {
          data[pair[1]] = value;
          listKey = null;
        }
      }
    }
  }
  return { data, text };
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

/** Lines of a note that match a pattern, verbatim, with their line numbers. */
function quoteLines(file, pattern, limit = 3) {
  if (!fs.existsSync(file)) {
    return [];
  }
  const out = [];
  fs.readFileSync(file, "utf8").split(/\r?\n/u).forEach((line, index) => {
    if (out.length < limit && pattern.test(line)) {
      out.push({ quote: line.trim().slice(0, 400), source: `${rel(file)}:${index + 1}` });
    }
  });
  return out;
}

/* ---------- visibility: which pages the players can already see ---------- */
const pagesConfig = JSON.parse(fs.readFileSync(path.join(docsRoot, "world-pages.config.json"), "utf8"));
const whitelist = new Set((pagesConfig.visibility?.whitelist || []).map((entry) => entry.toLowerCase()));
const isPublic = (worldRelPath) => whitelist.has(worldRelPath.toLowerCase());

/* ---------- map markers ---------- */
const mapHtml = fs.readFileSync(path.join(docsRoot, "tools", "world-map.html"), "utf8");
const mapConfig = JSON.parse(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/u.exec(mapHtml)[1]);
const markerSource = "docs/tools/world-map.html (map config script)";
const markers = mapConfig.markers.map((marker) => {
  const link = marker.sourceLink || marker.link || "";
  const regionSlug = (/^world\/([^/]+)\//u.exec(link) || [])[1] || null;
  return {
    id: slug(marker.sourceName || marker.name),
    name: marker.sourceName || marker.name,
    regionSlug,
    position: marker.position ?? null,
    mapDescription: marker.sourceDescription || marker.description || null,
    link
  };
});
const markerById = new Map(markers.map((marker) => [marker.id, marker]));

/* ---------- Crestfall towns ---------- */
const TOWNS = ["Highreach", "Ardenville", "Fairfield", "Hillcrest", "Stonehaven"];

function parsePopulation(raw) {
  if (raw == null) {
    return null;
  }
  const digits = String(raw).replace(/[^0-9]/gu, "");
  return digits ? { number: Number(digits), asWritten: String(raw), approximate: /~|about|approx/iu.test(String(raw)) } : null;
}

function buildTown(name) {
  const dir = path.join(almanac, "Crestfall", name);
  const file = path.join(dir, `${name}.md`);
  const { data } = readFrontMatter(file);
  const marker = markerById.get(slug(name));
  const population = parsePopulation(data.population);
  const worldRel = `Crestfall/${name}/${name}.md`;

  const subLocations = listFiles(dir)
    .filter((entry) => path.basename(entry) !== `${name}.md`)
    .map((entry) => {
      const front = readFrontMatter(entry).data;
      const base = path.basename(entry, ".md");
      return {
        id: slug(base),
        name: front.name || base,
        type: front.type || null,
        locationType: front.location_type || front.shop_type || null,
        knownToPlayers: isPublic(`Crestfall/${name}/${base}.md`),
        hasMapMarker: markerById.has(slug(front.name || base)),
        source: rel(entry)
      };
    });

  const npcs = listFiles(path.join(dir, "NPCs"))
    .map((entry) => ({ entry, front: readFrontMatter(entry).data, base: path.basename(entry, ".md") }))
    .filter(({ front }) => String(front.type || "").toLowerCase() === "npc")
    .map(({ entry, front, base }) => ({
      id: slug(front.name || base),
      name: front.name || base,
      town: front.location || null,
      profession: front.profession || null,
      race: front.race || null,
      status: front.status || null,
      knownToPlayers: isPublic(`Crestfall/${name}/NPCs/${base}.md`),
      source: rel(entry)
    }));

  // NPC pages that exist only in the player-facing tree (no DM note yet).
  const privateNames = new Set(listFiles(path.join(dir, "NPCs")).map((entry) => path.basename(entry)));
  const publicOnlyNpcs = listFiles(path.join(publicWorld, "Crestfall", name, "NPCs"))
    .filter((entry) => !privateNames.has(path.basename(entry)))
    .map((entry) => ({
      id: slug(path.basename(entry, ".md")),
      name: path.basename(entry, ".md"),
      town: name,
      knownToPlayers: isPublic(`Crestfall/${name}/NPCs/${path.basename(entry)}`),
      note: "Only a player-facing page exists; no DM note with front matter.",
      source: rel(entry)
    }));

  return {
    id: slug(name),
    name,
    region: found(data.region || null, `${rel(file)} (front matter)`),
    settlementType: data.settlement_type
      ? found(data.settlement_type, `${rel(file)} (front matter)`)
      : missing("Settlement type"),
    status: data.status ? found(data.status, `${rel(file)} (front matter)`) : missing("Status"),
    knownToPlayers: isPublic(worldRel),
    position: marker
      ? found(marker.position, markerSource)
      : missing("Map position"),
    mapDescription: marker?.mapDescription && marker.mapDescription !== "????"
      ? found(marker.mapDescription, markerSource)
      : missing("One-line description (the map marker says ????)"),
    population: population
      ? found(population.number, `${rel(file)} (front matter)`, { asWritten: population.asWritten, approximate: population.approximate })
      : missing("Population"),
    production: missing("What this place makes or grows, per good"),
    consumption: missing("What this place uses, per good"),
    detailLevel: missing("Full detail or sketched"),
    cityMap: null,
    subLocations,
    npcs: [...npcs, ...publicOnlyNpcs]
  };
}

/* ---------- other places on the map (outside the five towns) ---------- */
function buildOtherPlace(marker) {
  const regionNames = {
    crestfall: "Crestfall",
    "silverleaf-lands": "Silverleaf Lands",
    "ironpeak-mountains": "Ironpeak Mountains",
    "orcish-wastes": "Orcish Wastes"
  };
  return {
    id: marker.id,
    name: marker.name,
    region: found(regionNames[marker.regionSlug] || marker.regionSlug, `${markerSource}, from the marker's page link`),
    position: found(marker.position, markerSource),
    mapDescription: marker.mapDescription && marker.mapDescription !== "????"
      ? found(marker.mapDescription, markerSource)
      : missing("One-line description (the map marker says ????)"),
    population: missing("Population or rough size"),
    detailLevel: found("sketched", "Proposal: everything outside Crestfall starts as a name only")
  };
}

/* ---------- routes: only what the notes actually say ---------- */
function buildRoutes() {
  const fairfield = path.join(almanac, "Crestfall", "Fairfield", "Fairfield.md");
  const ardenville = path.join(almanac, "Crestfall", "Ardenville", "Ardenville.md");
  const lakeArden = path.join(almanac, "Crestfall", "Ardenville", "Lake Arden.md");
  const hillcrest = path.join(almanac, "Crestfall", "Hillcrest", "Hillcrest.md");
  const stonehaven = path.join(almanac, "Crestfall", "Stonehaven", "Stonehaven.md");
  const lakeFront = fs.existsSync(lakeArden) ? readFrontMatter(lakeArden).data : {};
  return [
    {
      id: "highreach--fairfield",
      a: "highreach",
      b: "fairfield",
      travelDays: missing("Travel days for ordinary travellers and caravans. The note gives only a hard-ride figure."),
      mode: missing("Road, river or other"),
      notesSay: quoteLines(fairfield, /days'? hard ride/iu),
      openQuestion: "The note says Fairfield is WEST of Highreach. On the map Fairfield's marker is to the right (east) of Highreach's. Which is right?"
    },
    {
      id: "fairfield--starfall",
      a: "fairfield",
      b: "starfall",
      travelDays: missing("Travel days. The note says only 'mere hours from the Silverleaf border'."),
      mode: missing("Road, river or other"),
      notesSay: quoteLines(fairfield, /Starfall visible|hours from the Silverleaf border/iu, 2)
    },
    {
      id: "ardenville--highreach",
      a: "ardenville",
      b: "highreach",
      travelDays: missing("Travel days across Lake Arden and up the cliff elevator"),
      mode: missing("Boat plus the cargo elevator, or a road as well?"),
      travelDifficulty: lakeFront.travel_difficulty
        ? found(lakeFront.travel_difficulty, `${rel(lakeArden)} (front matter, Lake Arden)`)
        : missing("Travel difficulty"),
      notesSay: quoteLines(ardenville, /Cliffside Port|cargo elevator/iu, 2)
    },
    {
      id: "highreach--hillcrest",
      a: "highreach",
      b: "hillcrest",
      travelDays: missing("Travel days. The note gives a direction only."),
      mode: missing("Road, river or other"),
      notesSay: quoteLines(hillcrest, /southwest of \[\[Highreach\]\]/iu, 1)
    },
    {
      id: "stonehaven--(unknown)",
      a: "stonehaven",
      b: null,
      travelDays: missing("Which towns Stonehaven connects to, and the travel days"),
      mode: missing("Road, river or other"),
      notesSay: quoteLines(stonehaven, /Sealed Gates Crisis|southeastern edge/iu, 2)
    }
  ];
}

/* ---------- situations the notes already describe ---------- */
function buildSituations() {
  const base = path.join(almanac, "Crestfall");
  return [
    { place: "ardenville", about: "Lake Arden Boat Race", notesSay: quoteLines(path.join(base, "Ardenville", "Ardenville.md"), /Boat Race/u, 1) },
    { place: "hillcrest", about: "Vineyard blight", notesSay: quoteLines(path.join(base, "Hillcrest", "Hillcrest.md"), /Current Crisis/u, 1) },
    { place: "stonehaven", about: "Sealed gates", notesSay: quoteLines(path.join(base, "Stonehaven", "Stonehaven.md"), /Sealed Gates Crisis/u, 1) },
    { place: "fairfield", about: "Diluted health potions", notesSay: quoteLines(path.join(base, "Fairfield", "Fairfield.md"), /crime family led by Valeris/u, 1) },
    { place: "fairfield", about: "Caravan attacks", notesSay: quoteLines(path.join(base, "Fairfield", "Fairfield.md"), /bandit camp occupies/u, 1) },
    { place: "highreach", about: "Duplirats and the mine collapse", notesSay: quoteLines(path.join(base, "Crestfall.md"), /duplirats/iu, 1) },
    { place: "crestfall", about: "War with the orc tribes", notesSay: quoteLines(path.join(base, "Crestfall.md"), /Orc Wars/u, 1) }
  ].map((entry) => ({ ...entry, countdown: missing("Whether this becomes a countdown, its size and how fast it moves") }));
}

/* ---------- goods: the ten from the proposal, mapped to catalog items ---------- */
const GOODS = [
  { id: "grain", name: "Grain", catalogIds: ["item:wheat:phb", "item:flour:phb"], search: "wheat" },
  { id: "fish", name: "Fish", catalogIds: [], search: "fish", gap: "The catalog has no fish as a trade good (only fishing tackle and magic items)." },
  { id: "wine", name: "Wine", catalogIds: ["item:common-wine-pitcher:phb", "item:fine-wine-bottle:phb"], search: "wine" },
  { id: "ore", name: "Ore", catalogIds: ["item:iron:phb", "item:copper:phb"], search: "iron" },
  { id: "timber", name: "Timber", catalogIds: [], search: "timber", gap: "The catalog has no timber or lumber item." },
  { id: "herbs", name: "Herbs", catalogIds: [], search: "herb", gap: "The catalog has no herb trade good (only the Herbalism Kit, a tool)." },
  { id: "healing-potions", name: "Healing potions", catalogIds: ["item:potion-of-healing:dmg"], search: "potion of healing" },
  { id: "weapons", name: "Weapons", catalogIds: ["base-item:longsword:phb"], search: "longsword", note: "A category. One item is listed only as a reference price; which item stands for the category is your call." },
  { id: "cloth", name: "Cloth", catalogIds: ["item:cotton-cloth-1-sq-yd:phb", "item:linen-1-sq-yd:phb", "item:canvas-1-sq-yd:phb"], search: "cloth" },
  { id: "luxuries", name: "Luxuries", catalogIds: ["item:silk-1-sq-yd:phb", "item:saffron:phb"], search: "silk", note: "A category. Two items are listed only as reference prices." }
];

async function lookupCatalogItem(apiBase, id) {
  const name = id.split(":")[1].replace(/-/gu, " ");
  const route = `/catalog/items?limit=25&q=${encodeURIComponent(name)}`;
  const response = await fetch(`${apiBase}${route}`);
  if (!response.ok) {
    throw new Error(`GET ${route} returned ${response.status}`);
  }
  const body = await response.json();
  const hit = (body.items || []).find((item) => item.id === id);
  return hit ? { id, name: hit.name, catalogSource: hit.source, type: hit.type, priceLabel: hit.valueLabel ?? null, weight: hit.weight ?? null, source: `API GET ${route}` } : null;
}

async function buildGoods() {
  const config = fs.readFileSync(path.join(docsRoot, "site-assets", "site-config.js"), "utf8");
  const apiBase = (/cloudApiBase:\s*"([^"]+)"/u.exec(config) || [])[1];
  const goods = [];
  for (const good of GOODS) {
    const catalogItems = [];
    for (const id of good.catalogIds) {
      if (offline || !apiBase) {
        catalogItems.push({ id, priceLabel: null, missing: true, need: "Run without --offline to read the price from the API" });
        continue;
      }
      const item = await lookupCatalogItem(apiBase, id);
      catalogItems.push(item || { id, priceLabel: null, missing: true, need: "Not found in the API by this id" });
    }
    goods.push({
      id: good.id,
      name: good.name,
      proposedBy: "Living world proposal (ten starting goods). Proposed list, not yet agreed.",
      catalogItems,
      catalogGap: good.gap || null,
      note: good.note || null,
      unit: missing("The unit a market trades in (sack, cask, ingot...)"),
      basePrice: missing(good.catalogIds.length
        ? "Which catalog price, if any, is the base price for this good"
        : "A base price; nothing in the catalog to take it from")
    });
  }
  return { apiBase, goods };
}

/* ---------- assemble ---------- */
const { apiBase, goods } = await buildGoods();
const towns = TOWNS.map(buildTown);
const townIds = new Set(towns.map((town) => town.id));
const subLocationIds = new Set(towns.flatMap((town) => town.subLocations.map((entry) => entry.id)));

/* ---------- travel-day estimates from the map (the DM asked for a best guess) ---------- */
// Method, so every number can be checked and changed:
//   straight = straight-line distance between the two map markers, in map widths
//   path     = straight x 1.2 (roads wind), or the stated detour
//   days     = path x terrain / PACE, rounded to the nearest half day, never under half a day
//   PACE     = 0.15 map widths of path per day. Calibrated on the one figure the DM gave:
//              Highreach to Ardenville is about a day, going around Lake Arden
//              (straight 0.101, around the lake about 1.5 times that).
//   terrain  = 1 open lowland, 1.5 forest or hills, 2.5 mountains
// These are defaults for off-screen things (caravans, rumours) and a hint for the DM.
// They never move the party: the DM says how long the party travels.
const PACE = 0.15;
const TERRAIN = { lowland: 1, "forest or hills": 1.5, mountains: 2.5 };
const ROUTE_GUESSES = [
  ["ardenville", "highreach", "lowland", { detour: 1.5, how: "around Lake Arden", stated: 1 }],
  ["highreach", "hillcrest", "lowland"],
  ["highreach", "fairfield", "lowland"],
  ["hillcrest", "stonehaven", "lowland"],
  ["highreach", "stonehaven", "lowland"],
  ["fairfield", "stonehaven", "forest or hills"],
  ["fairfield", "starfall", "lowland"],
  ["starfall", "frostglade", "lowland"],
  ["starfall", "stardew", "forest or hills"],
  ["frostglade", "serenity-hollow", "lowland"],
  ["frostglade", "moonshade", "forest or hills"],
  ["fairfield", "ironroot", "mountains"],
  ["stonehaven", "gemstone-hollow", "forest or hills"],
  ["gemstone-hollow", "ironroot", "mountains"],
  ["stonehaven", "forgepeak", "mountains"],
  ["forgepeak", "steamhammer", "mountains"],
  ["steamhammer", "stoneforge", "mountains"]
];

function buildRouteEstimates() {
  const round = (value) => Math.max(0.5, Math.round(value * 2) / 2);
  return ROUTE_GUESSES.map(([a, b, terrain, extra = {}]) => {
    const from = markerById.get(a);
    const to = markerById.get(b);
    if (!from?.position || !to?.position) {
      return { id: `${a}--${b}`, a, b, travelDays: missing("One end is not on the map") };
    }
    const straight = Math.hypot(from.position[0] - to.position[0], from.position[1] - to.position[1]);
    const detour = extra.detour || 1.2;
    const computed = round(straight * detour * TERRAIN[terrain] / PACE);
    const value = extra.stated ?? computed;
    return {
      id: `${a}--${b}`,
      a,
      b,
      travelDays: {
        value,
        estimate: !extra.stated,
        editable: true,
        source: extra.stated
          ? "The DM, 2026-11-23: about a day, going around Lake Arden"
          : "Estimate from the map (see routeEstimatesMethod)",
        derivation: {
          straightMapWidths: Math.round(straight * 1000) / 1000,
          pathFactor: detour,
          how: extra.how || "roads wind, so 1.2 times the straight line",
          terrain,
          terrainFactor: TERRAIN[terrain],
          computedDays: computed
        }
      },
      connection: { value: "assumed", estimate: true, source: "Guessed from the map: nearest neighbours with no range or water between. The DM decides which roads exist." }
    };
  });
}

const timelineDir = path.join(publicWorld, "Events", "Timeline");
const timeline = fs.existsSync(timelineDir)
  ? fs.readdirSync(timelineDir).filter((name) => /^\d{4}-\d{2}-\d{2} /u.test(name)).sort()
  : [];

const draft = {
  schema: "eldoria-world-seed-draft/1",
  status: "DRAFT FOR REVIEW. Not loaded by anything. Contains DM-only names; do not publish.",
  generatedBy: "docs/world-sim/tools/build-seed-draft.mjs",
  rules: [
    "Every value has a source. Anything the notes do not state is null with missing: true and says what is needed.",
    "No number or name here was invented or taken from the prototype's example data."
  ],
  calendar: {
    monthNames: found(["Spring", "Summer", "Fall", "Winter"], "Living world proposal; timeline note names use months 01-04"),
    daysPerMonth: found(50, "Timeline note Public/World/Events/Timeline/0496-02-50 Party Summoned to world.md (a day 50 exists)"),
    latestTimelineNote: timeline.length
      ? found(timeline.at(-1), "Public/World/Events/Timeline (last file by name)")
      : missing("No timeline notes found"),
    today: found({ day: 99306, text: "Fall 7, 496" }, "The DM, 2026-11-23")
  },
  positionFormat: found(
    "[fraction up from the bottom edge, fraction across from the left edge] of eldoria-map.jpg",
    "docs/tools/world-map.js renderWorldMapMarkers (Leaflet, y grows upward). Copied as stored, not converted.",
    { caution: "The no-Leaflet fallback in the same file treats the first number as distance from the TOP, which disagrees. Confirm on the real map before use." }
  ),
  region: {
    id: "crestfall",
    name: "Crestfall",
    source: rel(path.join(almanac, "Crestfall", "Crestfall.md")),
    border: found(
      "docs/world-sim/regions.draft.json",
      "Suggested outline for the DM to correct. The DM, 2026-11-23: the mountain range is Ironpeak (dwarven lands), so Crestfall is the lowlands up to the foot of the mountains.",
      { estimate: true }
    )
  },
  settlements: towns,
  otherPlacesOnMap: markers
    .filter((marker) => !townIds.has(marker.id))
    .map((marker) => ({ ...buildOtherPlace(marker), alsoListedUnderTown: subLocationIds.has(marker.id) })),
  routes: buildRoutes(),
  routesNote: "What the notes say about connections, quoted. Travel-day guesses are in routeEstimates.",
  routeEstimates: buildRouteEstimates(),
  routeEstimatesMethod: {
    pace: `${PACE} map widths of path per day`,
    calibration: "The figure the DM gave: Highreach to Ardenville takes about a day, going around Lake Arden (straight line 0.101 map widths, about 1.5 times that around the lake).",
    path: "straight line x 1.2 unless a detour is stated",
    terrainFactors: TERRAIN,
    rounding: "nearest half day, never less than half a day",
    conflict: "The Fairfield note gives a hard ride of two days from Highreach. This method gives 1.5 days for ordinary travel on the same road, which is faster than a hard ride should be. One of the two needs changing; the estimate is left as computed so the conflict is visible.",
    partyRule: "These numbers never move the party. The DM decides how long the party travels. They are only the default for off-screen things (caravans, rumours) in later stages, and a hint shown to the DM."
  },
  situationsInNotes: buildSituations(),
  goods,
  openQuestions: [
    {
      id: "potion-base-price",
      question: "Which healing potion price is the base price?",
      catalog: goods.find((good) => good.id === "healing-potions")?.catalogItems[0] || null,
      notes: "Settled by the DM, 2026-11-23: the catalog price (50 gp) is the base price.",
      resolved: true
    },
    {
      id: "fairfield-direction",
      question: "Is Fairfield west of Highreach (notes) or east of it (map marker)?",
      notes: "Settled by the DM, 2026-11-23: east, as the map shows. The notes have been corrected.",
      resolved: true
    },
    {
      id: "herb-job",
      question: "The declined herb-gathering job is not in the notes. Where was it offered, by whom, and on what date?",
      notes: "Settled by the DM, 2026-11-23: it did not happen at the table, so it is not canon and is left out.",
      resolved: true
    }
  ],
  api: { base: apiBase || null, usedOffline: offline }
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(draft, null, 2)}\n`);

// The DM-only list of places the world page offers in its "where" box. Upload it from
// the world page ("Load places file"); it is stored in the storage account, never in docs/.
const placeList = [];
for (const town of towns) {
  placeList.push({
    id: town.id,
    name: town.name,
    kind: town.settlementType?.value || "Settlement",
    region: "Crestfall",
    parent: null,
    knownToPlayers: isPublic(`Crestfall/${town.name}/${town.name}.md`)
  });
  for (const sub of town.subLocations) {
    placeList.push({
      id: `${town.id}--${sub.id}`,
      name: `${sub.name} (${town.name})`,
      kind: "Place in town",
      region: "Crestfall",
      parent: town.id,
      knownToPlayers: (sub.knownToPlayers?.value ?? sub.knownToPlayers) === true
    });
  }
}
for (const place of draft.otherPlacesOnMap) {
  if (placeList.some((entry) => entry.id === place.id || entry.id.endsWith(`--${place.id}`))) continue;
  placeList.push({
    id: place.id,
    name: place.name,
    kind: "On the map",
    region: place.region?.value || null,
    parent: null,
    knownToPlayers: false
  });
}
// ---- Market setup (Stage 2) ----
// What each town makes and uses is NOT in the notes. It comes from market-estimates.json,
// a file of best guesses for the DM to correct, and every figure taken from it is marked
// "estimate" with a line saying what it is based on. Base prices come from the catalog
// where the catalog has the item; the rest are estimates too.
const estimatesFile = path.join(repoRoot, "Private", "0.DM Screen", "World Sim", "market-estimates.json");
const reviewFile = path.join(repoRoot, "Private", "0.DM Screen", "World Sim", "SEED-REVIEW.md");
const estimates = JSON.parse(fs.readFileSync(estimatesFile, "utf8"));
const round = (value, places = 2) => Math.round(value * 10 ** places) / 10 ** places;
const COIN = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

function copperFromLabel(label) {
  const match = /^([\d.,]+)\s*(cp|sp|ep|gp|pp)$/iu.exec(String(label || "").trim());
  return match ? Number(match[1].replace(/,/gu, "")) * COIN[match[2].toLowerCase()] : null;
}

function catalogCopper(goodId, itemId) {
  const item = (draft.goods.find((good) => good.id === goodId)?.catalogItems || []).find((entry) => entry.id === itemId);
  return item ? copperFromLabel(item.priceLabel) : null;
}

const landmark = new RegExp(estimates.landmarkNamePattern, "u");
const marketTownIds = towns.map((town) => town.id);
const marketPopulation = {};
for (const town of towns) {
  const stated = town.population?.value ?? null;
  const guess = estimates.populationEstimates?.[town.id];
  marketPopulation[town.id] = stated != null
    ? { value: stated, estimate: false, basis: `Stated in the notes for ${town.name}` }
    : guess ? { value: guess.value, estimate: true, basis: guess.basis } : null;
}
for (const place of placeList) {
  if (place.parent) continue;
  if (marketTownIds.includes(place.id)) {
    place.detail = "full";
    place.population = marketPopulation[place.id];
  } else {
    place.detail = landmark.test(place.name) ? "landmark" : "sketched";
    place.population = null;
  }
}

const marketGoods = [];
const marketProblems = [];
for (const good of estimates.goods) {
  let basePrice;
  if (good.price.catalogItem) {
    const copper = catalogCopper(good.id, good.price.catalogItem);
    if (copper == null) {
      marketProblems.push(`${good.id}: the catalog price for ${good.price.catalogItem} could not be read (run without --offline)`);
      continue;
    }
    basePrice = { value: round(copper * (good.price.times || 1)), estimate: good.price.estimate === true, basis: good.price.basis };
  } else {
    basePrice = { value: good.price.estimateCopper, estimate: true, basis: good.price.basis };
  }
  marketGoods.push({ id: good.id, name: good.name, unit: good.unit, basePrice, madeFrom: (good.madeFrom || []).map(({ good: input, perUnit }) => ({ good: input, perUnit })) });
}
if (marketProblems.length) {
  throw new Error(`Market setup not written:\n  ${marketProblems.join("\n  ")}`);
}

// What each town uses: the same per head everywhere.
const directUse = {};
for (const town of towns) {
  directUse[town.id] = {};
  for (const good of estimates.goods) {
    directUse[town.id][good.id] = round((marketPopulation[town.id]?.value || 0) / 1000 * good.usePerThousandPeoplePerDay, 2);
  }
}
// What each town makes: its share of everything the five towns need, makers' inputs included.
// Goods that are inputs are worked out after the goods made from them.
const made = Object.fromEntries(marketTownIds.map((id) => [id, {}]));
const order = [...estimates.goods].sort((a, b) => Number(Boolean(b.madeFrom)) - Number(Boolean(a.madeFrom)));
for (const good of order) {
  let need = marketTownIds.reduce((sum, id) => sum + directUse[id][good.id], 0);
  for (const other of estimates.goods) {
    for (const input of other.madeFrom || []) {
      if (input.good === good.id) {
        need += marketTownIds.reduce((sum, id) => sum + (made[id][other.id] || 0) * input.perUnit, 0);
      }
    }
  }
  const shares = marketTownIds.map((id) => estimates.makes?.[id]?.[good.id]?.share || 0);
  const totalShare = shares.reduce((sum, share) => sum + share, 0);
  if (Math.abs(totalShare - 1) > 0.001) {
    throw new Error(`market-estimates.json: the shares for ${good.id} add up to ${totalShare}, not 1.`);
  }
  marketTownIds.forEach((id, index) => { made[id][good.id] = round(need * shares[index], 2); });
}

const markets = {};
const estimateRows = [];
for (const town of towns) {
  markets[town.id] = {};
  for (const good of estimates.goods) {
    const make = made[town.id][good.id] || 0;
    const use = directUse[town.id][good.id] || 0;
    const makeBasis = estimates.makes?.[town.id]?.[good.id]?.basis || "Not known for making this";
    const useBasis = `${good.useBasis}; ${marketPopulation[town.id]?.value ?? "?"} people`;
    markets[town.id][good.id] = {
      make: { value: make, estimate: true, basis: makeBasis },
      use: { value: use, estimate: true, basis: useBasis }
    };
    estimateRows.push(`| ${town.name} | ${good.name} | ${make} | ${makeBasis} | ${use} | ${good.unit} a day |`);
  }
}

const marketRoutes = (draft.routeEstimates || []).map((route) => ({
  id: route.id,
  a: route.a,
  b: route.b,
  travelDays: {
    value: route.travelDays.value,
    estimate: route.travelDays.estimate === true,
    basis: route.travelDays.source
  }
})).filter((route) => placeList.some((place) => place.id === route.a) && placeList.some((place) => place.id === route.b));

const upload = {
  schema: "eldoria-world-places/2",
  note: "DM only. Load this from the Living World page (Setup). Every figure marked estimate is a guess for you to correct.",
  places: placeList,
  economy: { goods: marketGoods, routes: marketRoutes, markets }
};
fs.writeFileSync(placesFile, `${JSON.stringify(upload, null, 2)}\n`);
console.log(`Wrote ${rel(placesFile)} (${placeList.length} places, ${marketGoods.length} goods, ${marketRoutes.length} roads, ${estimateRows.length} make/use estimates)`);

// The one table of every estimate, kept in SEED-REVIEW.md between two markers.
const money = (copper) => (copper >= 100 ? `${round(copper / 100, 1)} gp` : copper >= 10 ? `${round(copper / 10, 1)} sp` : `${copper} cp`);
const block = [
  "<!-- market-estimates:start (written by tools/build-seed-draft.mjs; edit market-estimates.json, not this table) -->",
  "",
  "**Base prices**",
  "",
  "| Good | Unit | Base price | Estimate? | Based on |",
  "|---|---|---|---|---|",
  ...marketGoods.map((good) => `| ${good.name} | ${good.unit} | ${money(good.basePrice.value)} | ${good.basePrice.estimate ? "estimate" : "catalog"} | ${good.basePrice.basis} |`),
  "",
  "**Made from**",
  "",
  "| Good | Made from | Based on |",
  "|---|---|---|",
  ...estimates.goods.flatMap((good) => (good.madeFrom || []).map((input) => `| ${good.name} | ${input.perUnit} ${estimates.goods.find((entry) => entry.id === input.good).unit}s of ${estimates.goods.find((entry) => entry.id === input.good).name.toLowerCase()} | estimate: ${input.basis} |`)),
  "",
  "**Populations**",
  "",
  "| Town | People | Estimate? | Based on |",
  "|---|---|---|---|",
  ...towns.map((town) => `| ${town.name} | ${marketPopulation[town.id]?.value ?? "?"} | ${marketPopulation[town.id]?.estimate ? "estimate" : "from the notes"} | ${marketPopulation[town.id]?.basis || ""} |`),
  "",
  "**What each town makes and uses, per day (every figure is an estimate)**",
  "",
  "| Town | Good | Makes | Why it makes that much | Uses | Unit |",
  "|---|---|---|---|---|---|",
  ...estimateRows,
  "",
  "<!-- market-estimates:end -->"
].join("\n");
if (fs.existsSync(reviewFile)) {
  const review = fs.readFileSync(reviewFile, "utf8");
  const start = review.indexOf("<!-- market-estimates:start");
  const end = review.indexOf("<!-- market-estimates:end -->");
  if (start >= 0 && end > start) {
    fs.writeFileSync(reviewFile, `${review.slice(0, start)}${block}${review.slice(end + "<!-- market-estimates:end -->".length)}`);
    console.log(`Updated the estimates table in ${rel(reviewFile)}`);
  } else {
    console.warn(`${rel(reviewFile)} has no market-estimates markers; the table was not written.`);
  }
}

const count = (list, test) => list.filter(test).length;
console.log(`Wrote ${rel(outFile)}`);
console.log(`  settlements: ${towns.length}, sub-locations: ${towns.reduce((sum, town) => sum + town.subLocations.length, 0)}, NPCs: ${towns.reduce((sum, town) => sum + town.npcs.length, 0)}`);
console.log(`  populations found: ${count(towns, (town) => !town.population.missing)} of ${towns.length}`);
console.log(`  other map places: ${draft.otherPlacesOnMap.length}, routes mentioned in notes: ${draft.routes.length}`);
console.log(`  goods: ${goods.length}, with a catalog item: ${count(goods, (good) => good.catalogItems.some((item) => !item.missing))}`);
