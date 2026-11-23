// Stage 3 on the DM page: the city outline (no city maps), location and NPC pages,
// travelling NPCs, Rumours, search, the extra jot effects, and the Map.
// Run whole under jsdom against the real route handlers. Everything named is made up.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { DM_KEY, createApiFetch, makeWorld, testSetup } from "./helpers.mjs";

const html = await readFile(new URL("../../tools/world-sim/index.html", import.meta.url), "utf8");
const GLOBALS = ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "location"];
let boots = 0;

process.env.ELDORIA_DM_KEY = DM_KEY;

// Made-up outlines in the same format as docs/world-sim/regions.draft.json.
const REGIONS = {
  status: "test outlines",
  regions: [
    { id: "test-region", name: "Test Region", outline: [[0.9, 0.1], [0.9, 0.5], [0.5, 0.5], [0.5, 0.1]], basis: "made up" },
    { id: "other-region", name: "Other Region", outline: [[0.4, 0.5], [0.4, 0.9], [0.1, 0.9], [0.1, 0.5]] }
  ]
};

function setupWithPositions() {
  const setup = testSetup();
  setup.places[0].position = [0.8, 0.2]; // openton
  setup.places[1].position = [0.6, 0.4]; // secretville
  setup.places[2].position = [0.2, 0.7]; // farplace
  return setup;
}

async function waitFor(predicate, message, attempts = 400) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(typeof message === "function" ? message() : message);
}

async function openPage({ setup = setupWithPositions(), before } = {}) {
  const world = makeWorld();
  await world.service.startWorld({});
  if (setup) await world.service.putPlaces(setup);
  if (before) await before(world);

  const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/gu, ""), {
    url: "https://eldoria.test/tools/world-sim/index.html",
    pretendToBeVisual: true
  });
  for (const key of GLOBALS) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
  }
  globalThis.CSS = { escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/gu, "\\$&") };
  dom.window.ELDORIA_API_BASE_URL = "https://api.test/api";
  dom.window.localStorage.setItem("eldoria:dm-key", DM_KEY);
  const api = createApiFetch(world);
  const other = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input?.url || input);
    if (url.endsWith("/world-sim/regions.draft.json")) {
      other.push(url);
      return new Response(JSON.stringify(REGIONS), { status: 200, headers: { "content-type": "application/json" } });
    }
    return api(input, init);
  };
  const warn = console.warn;
  console.warn = () => {};
  await import(`../../tools/world-sim/world-sim.js?stage3=${(boots += 1)}`);
  console.warn = warn;

  const doc = dom.window.document;
  const page = {
    world,
    api,
    other,
    doc,
    dom,
    q: (selector) => doc.querySelector(selector),
    all: (selector) => [...doc.querySelectorAll(selector)],
    text: () => doc.querySelector("#ws-view").textContent.replace(/\s+/gu, " "),
    click(target) {
      const node = typeof target === "string" ? doc.querySelector(target) : target;
      assert.ok(node, `nothing to click: ${target}`);
      node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    },
    set(target, value) {
      const node = typeof target === "string" ? doc.querySelector(target) : target;
      assert.ok(node, `nothing to change: ${target}`);
      node.value = value;
      node.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    },
    typeInto(selector, value) {
      const node = doc.querySelector(selector);
      assert.ok(node, `nothing to type into: ${selector}`);
      node.value = value;
      node.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    },
    async tab(id, ready) {
      page.click(`[data-act='tab'][data-id='${id}']`);
      await waitFor(() => doc.querySelector(ready), () => `${id} should open: ${page.text()}`);
      await page.idle();
    },
    async idle() {
      await waitFor(() => !doc.querySelector("#ws-advance").disabled, "the page should finish what it is doing");
    },
    async advance() {
      const before = doc.querySelector("#ws-date").textContent;
      page.click("#ws-advance");
      await waitFor(() => doc.querySelector("#ws-date").textContent !== before, () => `the day should advance: ${page.text()}`);
      await page.idle();
    },
    async openTown(id) {
      await page.tab("places", "#ws-places");
      page.click(`.ws-placeitem[data-id='${id}']`);
      await waitFor(() => doc.querySelector(`#ws-place[data-place='${id}']`), "the town page should open");
      await page.idle();
    },
    async addEntry({ type, name, kind, district, location, note }) {
      doc.querySelector("#ws-city-add").open = true;
      page.set("#ws-city-type", type);
      await waitFor(() => doc.querySelector("#ws-city-type").value === type, "the form should switch");
      doc.querySelector("#ws-city-name").value = name;
      if (kind != null) doc.querySelector("#ws-city-kind").value = kind;
      if (note != null) doc.querySelector("#ws-city-note").value = note;
      if (district != null) page.set("#ws-city-district", district);
      if (location != null) page.set("#ws-city-location", location);
      const before = page.all("#ws-city [data-entry]").length;
      page.click("[data-act='city-add']");
      await waitFor(() => page.all("#ws-city [data-entry]").length > before, () => `the entry should be added: ${page.text()}`);
      await page.idle();
    }
  };
  await waitFor(() => doc.querySelector("#ws-jot"), () => `the page should load: ${page.text()}`);
  await page.idle();
  return page;
}

/* ---------------- no city maps; a city outline instead ---------------- */

test("there is no city map anywhere: not on the page, not in the page's files", async () => {
  const page = await openPage();
  await page.openTown("openton");
  assert.equal(page.q("[data-city-map]"), null);
  assert.doesNotMatch(page.text(), /city map/i);
  const folder = new URL("../../tools/world-sim/", import.meta.url);
  for (const name of await readdir(folder)) {
    if (!/\.(js|css|html)$/u.test(name) || name === "regions-preview.html") continue;
    const source = await readFile(new URL(name, folder), "utf8");
    assert.doesNotMatch(source, /City map goes here|data-city-map|ws-slot/, `${name} still has a city map slot`);
  }
});

test("a town starts with nothing recorded, and grows: a district, a place in it, a person there", async () => {
  const page = await openPage();
  await page.openTown("openton");
  assert.match(page.q("#ws-city").textContent, /Nothing is recorded here yet/);

  await page.addEntry({ type: "district", name: "Old Quarter" });
  await page.addEntry({ type: "location", name: "The Anchor", kind: "Inn", district: "openton--district--old-quarter", note: "Fish stew on Fridays" });
  await page.addEntry({ type: "npc", name: "Mara", kind: "Innkeeper", location: "openton--the-anchor" });
  await page.addEntry({ type: "npc", name: "Tob", kind: "Carter" });

  const city = page.q("#ws-city");
  const district = city.querySelector(".ws-city__district[data-entry='openton--district--old-quarter']");
  assert.ok(district, "the district is a collapsible section");
  assert.equal(district.tagName, "DETAILS");
  assert.match(district.querySelector("summary").textContent, /Old Quarter/);
  const inn = district.querySelector("[data-entry='openton--the-anchor']");
  assert.match(inn.textContent, /The Anchor\s*Inn/);
  assert.match(inn.textContent, /Fish stew on Fridays/);
  assert.match(inn.querySelector("[data-entry='npc--openton--mara']").textContent, /Mara\s*Innkeeper/, "the person is listed under the place they are at");
  assert.match(city.textContent, /Somewhere in town/);
  assert.ok(city.querySelector(".ws-city__group [data-entry='npc--openton--tob']"), "a person with no particular place is somewhere in town");
  assert.equal(city.querySelector(".ws-chip--shown"), null, "nothing is known to players until you say so");

  // Other towns are untouched, and may stay empty.
  await page.openTown("secretville");
  assert.match(page.q("#ws-city").textContent, /Nothing is recorded here yet/);
});

test("every name opens its own page; an entry can be shown to players, renamed, moved and retired", async () => {
  const page = await openPage({ before: async (world) => {
    await world.service.importCity({ entries: [
      { id: "openton--district--docks", type: "district", town: "openton", name: "Docks" },
      { id: "openton--chandlery", type: "location", town: "openton", name: "Chandlery", kind: "Shop", source: "notes/chandlery.md" },
      { id: "npc--openton--pell", type: "npc", town: "openton", name: "Pell", kind: "Chandler", location: "openton--chandlery" }
    ] });
    await world.service.jot({ text: "Pell sold the party a rope.", place: "npc--openton--pell" });
  } });
  await page.openTown("openton");
  page.click("#ws-city [data-act='open-entry'][data-id='openton--chandlery']");
  await waitFor(() => page.q("[data-entry-page='openton--chandlery']"), "the location page should open");
  let panel = page.q("#ws-entry");
  assert.match(panel.textContent, /Location · Shop/);
  assert.match(panel.textContent, /From your notes: notes\/chandlery\.md/);
  assert.match(panel.textContent, /Who is here\s*Pell/);
  assert.ok(panel.querySelector("[data-act='jot-here']"));
  assert.ok(panel.querySelector("[data-act='open-place'][data-id='openton']"), "it links back to its town");

  // Players know it.
  assert.equal(panel.querySelector("[data-act='city-know']").getAttribute("aria-pressed"), "false");
  page.click("[data-act='city-know']");
  await waitFor(() => page.q("[data-act='city-know']")?.getAttribute("aria-pressed") === "true", "it should be marked as known");
  await page.idle();

  // Rename it and move it into the district.
  page.q("#ws-entry-name").value = "Pell's Chandlery";
  page.q("#ws-entry-district").value = "openton--district--docks";
  page.click("[data-act='city-save']");
  await waitFor(() => /Pell's Chandlery/.test(page.q("#ws-entry h2")?.textContent || ""), "the new name should show");
  await page.idle();
  let stored = (await page.world.service.getCity()).entries.find((entry) => entry.id === "openton--chandlery");
  assert.deepEqual([stored.name, stored.district, stored.playersKnow], ["Pell's Chandlery", "openton--district--docks", true]);

  // The person's page: where they are, and what is written about them.
  page.click("#ws-entry [data-act='open-entry'][data-id='npc--openton--pell']");
  await waitFor(() => page.q("[data-entry-page='npc--openton--pell']"), "the NPC page should open");
  panel = page.q("#ws-entry");
  assert.match(panel.textContent, /NPC · Chandler · at Pell's Chandlery, in Docks, Openton/);
  assert.match(panel.textContent, /Written about them/);
  assert.match(panel.textContent, /Pell sold the party a rope/);
  assert.match(panel.querySelector("[data-act='jot-here']").textContent, /about them/);

  // Retire: gone from the outline, kept in the record, and can come back.
  page.click("[data-act='city-retire']");
  await waitFor(() => /retired/.test(page.q("#ws-entry .ws-meta")?.textContent || ""), "it should be retired");
  await page.idle();
  await page.openTown("openton");
  assert.equal(page.q("#ws-city .ws-city__location [data-entry='npc--openton--pell']"), null);
  assert.match(page.q("#ws-city").textContent, /Retired \(1\)/);
  stored = (await page.world.service.getCity()).entries.find((entry) => entry.id === "npc--openton--pell");
  assert.equal(stored.retired, true);
  assert.equal((await page.world.service.getCity()).entries.length, 3, "nothing was deleted");
});

test("the city file from the notes loads from Setup, and loading it twice adds nothing", async () => {
  const page = await openPage();
  const file = { entries: [
    { id: "openton--inn", type: "location", town: "openton", name: "The Inn", kind: "Inn", playersKnow: true },
    { id: "npc--openton--ada", type: "npc", town: "openton", name: "Ada", kind: "Baker" }
  ] };
  const load = async () => {
    page.q("#ws-setup").open = true;
    Object.defineProperty(page.q("#ws-city-file"), "files", { configurable: true, value: [{ text: async () => JSON.stringify(file) }] });
    page.click("[data-act='city-import']");
  };
  await load();
  await waitFor(() => /2 added, 0 already there/.test(page.text()), () => `the city should load: ${page.text()}`);
  await page.idle();
  await load();
  await waitFor(() => /0 added, 2 already there/.test(page.text()), () => `the second load should add nothing: ${page.text()}`);
  assert.equal((await page.world.service.getCity()).entries.length, 2);
  await page.openTown("openton");
  assert.ok(page.q("#ws-city [data-entry='openton--inn'] .ws-chip--shown"), "what the notes mark as public is known to players");
  // A location that was already a place opens its own page, with who is there.
  page.click(".ws-placeitem[data-id='openton--inn']");
  await waitFor(() => page.q("[data-entry-page='openton--inn']"), "the location page should open from the list");
});

/* ---------------- travelling NPCs ---------------- */

test("an NPC is given an itinerary on their page, sets out, and shows where they are", async () => {
  const page = await openPage({ before: (world) => world.service.addCityEntry({ type: "npc", town: "openton", name: "Old Vintner", kind: "Wine merchant" }) });
  await page.openTown("openton");
  page.click("#ws-city [data-act='open-entry'][data-id='npc--openton--old-vintner']");
  await waitFor(() => page.q("#ws-itinerary"), "the NPC page should open");
  assert.match(page.q("#ws-itinerary").textContent, /is not travelling/);

  page.click("[data-act='itinerary-edit']");
  await waitFor(() => page.all("[data-stop]").length === 2, "the itinerary form should open with two stops");
  assert.equal(page.q("[data-stop-place='0']").value, "openton", "it starts where they live");
  page.q("[data-stop-place='1']").value = "secretville";
  page.q("[data-stop-stay='0']").value = "1";
  page.q("[data-stop-stay='1']").value = "2";
  page.q("#ws-itinerary-loop").checked = true;
  page.click("[data-act='itinerary-save']");
  await waitFor(() => /Itinerary saved/.test(page.text()), () => `the itinerary should save: ${page.text()}`);
  await page.idle();
  assert.match(page.q("[data-travel-status]").textContent, /In Openton until Fall 8, then on to Secretville/);

  await page.advance();
  await page.openTown("openton");
  assert.match(page.q("#ws-city [data-entry='npc--openton--old-vintner']").textContent, /on the road to Secretville, arriving Fall 10/);
  await page.advance();
  await page.advance();
  assert.match(page.q("#ws-moved").textContent, /Old Vintner arrives in Secretville/);
  assert.ok(page.q("#ws-moved [data-act='open-entry'][data-id='npc--openton--old-vintner']"), "their name in the report is a link");

  await page.openTown("secretville");
  assert.match(page.q("#ws-city").textContent, /Passing through\s*Old Vintner/);
  page.click("#ws-city [data-act='open-entry'][data-id='npc--openton--old-vintner']");
  await waitFor(() => page.q("[data-act='itinerary-end']"), "the NPC page should open");
  page.click("[data-act='itinerary-end']");
  await waitFor(() => /is not travelling/.test(page.q("#ws-itinerary")?.textContent || ""), "their travels should end");
  assert.deepEqual((await page.world.service.getOverview()).travellers, []);
});

/* ---------------- rumours ---------------- */

test("Rumours: the DM starts one; each town's telling is shown beside the truth, with a reveal per town", async () => {
  const page = await openPage();
  await page.tab("rumours", "#ws-rumours");
  assert.match(page.text(), /No rumours yet\. The simulation never starts one/);

  page.set("#ws-rumour-origin", "openton");
  page.q("#ws-rumour-who").value = "a ghost";
  page.q("#ws-rumour-what").value = "walks the walls";
  page.set("#ws-rumour-tone", "false");
  page.click("[data-act='rumour-start']");
  await waitFor(() => page.q("[data-rumour]"), () => `the rumour should start: ${page.text()}`);
  await page.idle();
  let card = page.q("[data-rumour]");
  assert.match(card.textContent, /Truth not written/);
  assert.equal(card.querySelector("[data-rumour-truth]").textContent, "A ghost walks the walls in Openton. People blame them for it.");
  assert.deepEqual([...card.querySelectorAll("[data-heard]")].map((row) => row.dataset.heard), ["openton"]);
  assert.match(card.textContent, /Next: Secretville around Fall 9/);
  assert.ok(card.querySelector("[data-rumour-truth] [data-act='open-place'][data-id='openton']"), "the town in the tale is a link");

  await page.advance();
  await page.advance();
  assert.match(page.q("#ws-moved").textContent, /Word reaches Secretville/);
  await page.tab("rumours", "#ws-rumours");
  card = page.q("[data-rumour]");
  const there = card.querySelector("[data-heard='secretville']");
  assert.ok(there, "it has reached the next town");
  assert.match(there.textContent, /Fall 9/);
  assert.match(there.textContent, /told straight|coming from Openton/);

  // Reveal it to the players in Openton; nothing shows for them until then.
  await page.world.service.setParty({ place: "openton" });
  assert.deepEqual((await page.world.service.getPublicRumours()).rumours, []);
  await page.idle();
  assert.equal(page.q("[data-act='rumour-reveal'][data-place='openton']").textContent, "Not heard");
  page.click("[data-act='rumour-reveal'][data-place='openton']");
  await waitFor(() => page.q("[data-act='rumour-reveal'][data-place='openton']")?.getAttribute("aria-pressed") === "true", "it should be revealed");
  await page.idle();
  assert.equal((await page.world.service.getPublicRumours()).rumours.length, 1);
  assert.equal(page.q("[data-act='rumour-reveal'][data-place='secretville']").getAttribute("aria-pressed"), "false", "revealed in one town only");

  page.click("[data-act='rumour-end']");
  await waitFor(() => /No longer spreading/.test(page.q("[data-rumour]")?.textContent || ""), "it should stop");
});

test("a rumour can be started from a written event in the Record, and is then marked true", async () => {
  const page = await openPage({ before: (world) => world.service.jot({ text: "Strangers held the gate at Openton.", place: "openton" }) });
  await page.tab("record", "#ws-record");
  await waitFor(() => page.q("[data-act='rumour-about']"), "the record should load");
  page.click("[data-act='rumour-about']");
  await waitFor(() => page.q("#ws-rumour-event")?.value, "the rumour form should open on that event");
  await page.idle();
  assert.equal(page.q("#ws-rumour-true").checked, true);
  page.q("#ws-rumour-who").value = "strangers";
  page.q("#ws-rumour-what").value = "held the gate";
  page.set("#ws-rumour-tone", "true");
  page.click("[data-act='rumour-start']");
  await waitFor(() => page.q("[data-rumour]"), () => `the rumour should start: ${page.text()}`);
  assert.match(page.q("[data-rumour]").textContent, /True, written/);
  const [rumour] = (await page.world.service.listRumours()).rumours;
  assert.deepEqual([rumour.truth, rumour.origin, rumour.version.flatters], ["written", "openton", true]);
});

/* ---------------- what a jot can do ---------------- */

test("a jot can move people or make a sickness real, and says in plain words what it will do", async () => {
  const page = await openPage();
  page.set("#ws-jot-place", "openton");
  await waitFor(() => page.q("[data-effect-kind]"), "the picker should show");
  assert.deepEqual([...page.q("[data-effect-kind]").options].map((option) => option.value),
    ["note", "scarce", "flood", "close", "slow", "people", "sick", "well"]);

  page.set("[data-effect-kind]", "people");
  await waitFor(() => page.q("[data-effect-people]"), "the people fields should show");
  page.set("[data-effect-people]", "200");
  await waitFor(() => page.q("[data-effect-to]"), "still there");
  page.set("[data-effect-to]", "secretville");
  await waitFor(() => /200 people leave Openton for Secretville over 1 day/.test(page.q("[data-effect-note]")?.textContent || ""), () => `the note should describe it: ${page.text()}`);
  page.q("#ws-jot-text").value = "A fire drives families out of Openton.";
  page.click("[data-act='jot']");
  await waitFor(() => /Written\. It is in the Record/.test(page.text()), () => `it should be written: ${page.text()}`);
  await page.idle();
  assert.equal((await page.world.service.getOverview()).people.moves.length, 1);

  page.set("[data-effect-kind]", "sick");
  await waitFor(() => page.q("[data-effect-name]"), "the sickness field should show");
  page.set("[data-effect-name]", "marsh fever");
  await waitFor(() => /The marsh fever is real in Openton/.test(page.q("[data-effect-note]")?.textContent || ""), "the note should describe it");
  assert.match(page.q("[data-effect-note]").textContent, /only if you accept/);
  page.q("#ws-jot-text").value = "Marsh fever is confirmed in Openton.";
  page.click("[data-act='jot']");
  await waitFor(() => /Marsh fever is confirmed/.test(page.q("#ws-written")?.textContent || ""), () => `it should be written: ${page.text()}`);
  await page.idle();
  assert.deepEqual((await page.world.service.getOverview()).sickness.map((entry) => entry.name), ["marsh fever"]);

  await page.advance();
  assert.match(page.q("#ws-moved").textContent, /sick with the marsh fever in Openton/);
});

/* ---------------- search ---------------- */

test("search finds places, locations, people, goods, rumours and countdowns from anywhere", async () => {
  const page = await openPage({ before: async (world) => {
    await world.service.importCity({ entries: [
      { id: "openton--the-anchor", type: "location", town: "openton", name: "The Anchor", kind: "Inn" },
      { id: "npc--openton--mara", type: "npc", town: "openton", name: "Mara Anchorsmith", kind: "Innkeeper" }
    ] });
    await world.service.startRumour({ origin: "openton", who: "someone", what: "dropped an anchor in the square" });
    await world.service.createCountdown({ label: "The anchor chain rusts", size: 4, chance: 0.5, suggestionText: "It snaps." });
  } });
  assert.equal(page.q("#ws-search-results").hidden, true);
  page.typeInto("#ws-search", "anchor");
  const hits = page.all("#ws-search-results [data-search-hit]").map((node) => [node.dataset.act, node.textContent]);
  assert.deepEqual(hits.map(([act]) => act).sort(), ["open-countdowns", "open-entry", "open-entry", "open-rumours"]);
  assert.equal(page.q("#ws-search-results").hidden, false);

  page.typeInto("#ws-search", "bread");
  assert.deepEqual(page.all("#ws-search-results [data-search-hit]").map((node) => node.dataset.act), ["open-good"]);
  page.typeInto("#ws-search", "secret");
  assert.deepEqual(page.all("#ws-search-results [data-search-hit]").map((node) => node.textContent), ["Secretville"]);
  page.typeInto("#ws-search", "zzzz");
  assert.match(page.q("#ws-search-results").textContent, /Nothing matches/);

  page.typeInto("#ws-search", "mara");
  page.click("#ws-search-results [data-search-hit]");
  await waitFor(() => page.q("[data-entry-page='npc--openton--mara']"), "the person's page should open from search");
  assert.equal(page.q("#ws-search").value, "", "the search box clears once you pick something");
  assert.equal(page.q("#ws-search-results").hidden, true);
});

/* ---------------- the map ---------------- */

test("Map: the world with its regions; tap a region, then a town; a trail leads back out", async () => {
  const page = await openPage();
  await page.tab("map", "#ws-map");
  await waitFor(() => page.all(".ws-map__region").length === 2, "the region outlines should load");
  assert.equal(page.q(".ws-mapbox img").getAttribute("src"), "../../Assets/images/eldoria-map.jpg");
  assert.deepEqual(page.all(".ws-map__regionlabel").map((node) => node.textContent), ["Test Region", "Other Region"]);
  assert.deepEqual(page.all(".ws-map__place").map((node) => node.dataset.place), ["openton", "secretville", "farplace"]);
  assert.equal(page.q(".ws-crumbs").textContent.trim(), "Eldoria");
  assert.match(page.q("#ws-map-panel").textContent, /Test Region\s*2 towns/);
  assert.match(page.q("#ws-map-inner").getAttribute("style"), /scale\(1\.0000\)/);

  page.click(".ws-map__region[data-id='test-region']");
  await waitFor(() => page.q("#ws-map-panel[data-region='test-region']"), "the region should open");
  assert.equal(page.q(".ws-crumbs").textContent.replace(/\s+/gu, " ").trim(), "Eldoria › Test Region");
  assert.ok(Number(/scale\(([\d.]+)\)/.exec(page.q("#ws-map-inner").getAttribute("style"))[1]) > 1, "the map zooms to the region");
  assert.ok(page.q(".ws-map__region--off"), "the other region is dimmed");
  assert.match(page.q("#ws-map-panel").textContent, /Openton/);
  assert.match(page.q("#ws-map-roads").textContent, /Openton to Secretville\s*2 days/);

  page.click(".ws-map__place[data-place='openton']");
  await waitFor(() => page.q("#ws-map #ws-place[data-place='openton']"), "the town's page should open beside the map");
  assert.equal(page.q(".ws-crumbs").textContent.replace(/\s+/gu, " ").trim(), "Eldoria › Test Region › Openton");
  assert.ok(page.q("#ws-map #ws-city"), "with its outline of districts, places and people");
  assert.doesNotMatch(page.q("#ws-map").textContent, /city map/i);

  page.click(".ws-crumbs [data-act='map-region']");
  await waitFor(() => page.q("#ws-map-panel[data-region='test-region']"), "back to the region");
  page.click(".ws-crumbs [data-act='map-world']");
  await waitFor(() => !page.q(".ws-crumbs [data-act='map-world']"), "back to the world");
  assert.match(page.q("#ws-map-inner").getAttribute("style"), /scale\(1\.0000\)/);
  assert.deepEqual(page.other, [page.other[0]], "the outlines were fetched once");
});

test("Map: overlays toggle; roads show their state; a rumour's spread, threats, sickness and the party are drawn", async () => {
  const page = await openPage({ before: async (world) => {
    await world.service.setParty({ place: "openton" });
    await world.service.jot({ text: "The ford is flooded.", place: "openton", effect: { type: "pressure", target: "route", route: "openton--secretville", multiplier: 0, days: 9 } });
    await world.service.jot({ text: "Fever.", place: "secretville", effect: { type: "sickness-start", place: "secretville", name: "fever" } });
    await world.service.startRumour({ origin: "openton", who: "someone", what: "saw a light" });
    await world.service.createCountdown({ label: "Wolves gather", size: 4, chance: 0.01, place: "farplace", suggestionText: "Wolves attack." });
    await world.service.createCountdown({ label: "Bandits", size: 4, chance: 0.01, route: "secretville--farplace", suggestionText: "Bandits strike." });
  } });
  await page.advance();
  await page.tab("map", "#ws-map");
  await waitFor(() => page.all(".ws-map__region").length === 2, "the map should load");

  assert.deepEqual(page.all("[data-act='map-toggle']").map((button) => [button.dataset.id, button.getAttribute("aria-pressed")]), [
    ["routes", "true"], ["road", "true"], ["cost", "false"], ["threats", "true"], ["sickness", "true"], ["party", "true"]
  ]);
  assert.deepEqual(page.all(".ws-map__road").map((line) => [line.dataset.road, line.getAttribute("class").split(" ")[1]]), [
    ["openton--secretville", "ws-map__road--closed"], ["secretville--farplace", "ws-map__road--open"]
  ]);
  assert.equal(page.all(".ws-map__threat").length, 2, "one threat at a place, one on a road");
  assert.equal(page.all(".ws-map__sick").length, 1);
  assert.equal(page.all(".ws-map__party").length, 1);
  assert.equal(page.all(".ws-map__rumour").length, 0, "no rumour is shown until one is chosen");

  page.click("[data-act='map-toggle'][data-id='routes']");
  await waitFor(() => page.all(".ws-map__road").length === 0, "roads should hide");
  page.click("[data-act='map-toggle'][data-id='threats']");
  page.click("[data-act='map-toggle'][data-id='sickness']");
  page.click("[data-act='map-toggle'][data-id='party']");
  await waitFor(() => !page.q(".ws-map__threat") && !page.q(".ws-map__sick") && !page.q(".ws-map__party"), "overlays should hide");
  page.click("[data-act='map-toggle'][data-id='cost']");
  await waitFor(() => page.q("[data-act='map-toggle'][data-id='cost']").getAttribute("aria-pressed") === "true", "cost of living should turn on");
  assert.match(page.q(".ws-legend").textContent, /all goods/, "cost of living weighs every good the same");

  const rumour = (await page.world.service.listRumours()).rumours[0];
  page.set("#ws-map-rumour", rumour.id);
  await waitFor(() => page.all(".ws-map__rumour").length === 1, "the rumour's reach should be drawn");
  assert.equal(page.q(".ws-map__rumour").dataset.rumourReached, "openton");

  page.click("[data-act='map-zoom'][data-id='in']");
  await waitFor(() => /scale\(1\.5000\)/.test(page.q("#ws-map-inner").getAttribute("style")), "zoom in");
  page.click("[data-act='map-zoom'][data-id='reset']");
  await waitFor(() => /scale\(1\.0000\)/.test(page.q("#ws-map-inner").getAttribute("style")), "whole map again");
});

test("Map: built for phones as well as desktops, and holds no place names", async () => {
  const css = await readFile(new URL("../../tools/world-sim/world-sim.css", import.meta.url), "utf8");
  assert.match(css, /\.ws-mapbox \{[^}]*aspect-ratio: 1;[^}]*max-width: 100%;[^}]*touch-action: none;/s, "the map is a square that never exceeds the screen and takes its own gestures");
  assert.match(css, /@media \(max-width: 820px\) \{[^@]*\.ws-cols--map \{ grid-template-columns: minmax\(0, 1fr\); \}/s, "on a phone the panel stacks under the map");
  assert.doesNotMatch(css, /min-width:\s*\d{3,}px/, "nothing forces the page wider than a phone");
  const source = await readFile(new URL("../../tools/world-sim/world-sim-map.js", import.meta.url), "utf8");
  assert.match(source, /pointerdown/, "drag and pinch use pointer events");
  assert.doesNotMatch(source, /leaflet|three\.js|openlayers|maplibre|import\s+[^;]*from\s+"https?:/i, "no map library");
  assert.doesNotMatch(source, /Crestfall|Highreach|Ardenville|Ironpeak|Silverleaf/, "everything named comes from data at run time");
});

test("a threat can be put on a road from the Countdowns form", async () => {
  const page = await openPage();
  await page.tab("countdowns", "#ws-new-countdown");
  page.q("#ws-cd-label").value = "Bandits on the road";
  page.q("#ws-cd-suggestion").value = "Bandits rob a caravan.";
  page.set("#ws-cd-route", "openton--secretville");
  page.click("[data-act='create-countdown']");
  await waitFor(() => page.q("[data-countdown-road]"), () => `the countdown should be added: ${page.text()}`);
  assert.equal(page.q("[data-countdown-road]").textContent, "on the road between Openton and Secretville");
  assert.deepEqual((await page.world.service.getOverview()).threats.map((threat) => threat.route), ["openton--secretville"]);
});
