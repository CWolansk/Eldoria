// Stage 2 on the DM page: setup, Markets, Places, the party, a jot that changes the
// numbers, and the what-if run. Run whole under jsdom against the real route handlers.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { DM_KEY, createApiFetch, makeWorld, testSetup } from "./helpers.mjs";

const html = await readFile(new URL("../../tools/world-sim/index.html", import.meta.url), "utf8");
const GLOBALS = ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "location"];
let boots = 0;

process.env.ELDORIA_DM_KEY = DM_KEY;

async function waitFor(predicate, message, attempts = 400) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(typeof message === "function" ? message() : message);
}

/** A started world, with or without the test setup loaded, and the page open on it. */
async function openPage({ setup = testSetup() } = {}) {
  const world = makeWorld();
  await world.service.startWorld({});
  if (setup) await world.service.putPlaces(setup);

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
  const fetch = createApiFetch(world);
  globalThis.fetch = fetch;
  const warn = console.warn;
  console.warn = () => {};
  await import(`../../tools/world-sim/world-sim.js?economy=${(boots += 1)}`);
  console.warn = warn;

  const doc = dom.window.document;
  const page = {
    world,
    fetch,
    doc,
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
      node.value = value;
      node.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    },
    async tab(id, ready) {
      page.click(`[data-act='tab'][data-id='${id}']`);
      await waitFor(() => doc.querySelector(ready), () => `${id} should open: ${page.text()}`);
    },
    async idle() {
      await waitFor(() => !doc.querySelector("#ws-advance").disabled, "the page should finish what it is doing");
    },
    /** Presses "Advance a day" and waits until the page shows the new date. */
    async advance() {
      const before = doc.querySelector("#ws-date").textContent;
      page.click("#ws-advance");
      await waitFor(() => doc.querySelector("#ws-date").textContent !== before, () => `the day should advance: ${page.text()}`);
    },
    markets: () => world.service.getMarkets()
  };
  await waitFor(() => doc.querySelector("#ws-jot"), () => `the page should load: ${page.text()}`);
  await page.idle();
  return page;
}

const counts = async (world) => ({ rows: (await world.store.listRecords()).length, blobs: world.blobs.blobs.size });

test("with no setup loaded, Markets says so and a jot can only be a plain fact", async () => {
  const page = await openPage({ setup: null });
  await page.tab("markets", "#ws-markets");
  assert.match(page.text(), /No markets are set up yet/);
  assert.equal(page.q("#ws-market-table"), null);
  await page.tab("today", "#ws-jot");
  page.set("[data-effect-kind]", "scarce");
  await waitFor(() => page.q("[data-effect-note]"), "a note should explain");
  assert.match(page.q("[data-effect-note]").textContent, /No markets are set up yet/);
});

test("loading the setup file from Setup gives the towns their markets", async () => {
  const page = await openPage({ setup: null });
  page.q("#ws-setup").open = true;
  Object.defineProperty(page.q("#ws-places-file"), "files", {
    configurable: true,
    value: [{ text: async () => JSON.stringify(testSetup()) }]
  });
  page.click("[data-act='load-places']");
  await waitFor(() => /Setup loaded/.test(page.text()), () => `setup should load: ${page.text()}`);
  assert.equal((await page.markets()).configured, true);
  await page.tab("markets", "#ws-market-table");
  assert.deepEqual(page.all("[data-market-place]").map((row) => row.dataset.marketPlace), ["openton", "secretville"]);
});

test("Markets: a good picker, a table with a sparkline and stock, and estimates labelled", async () => {
  const page = await openPage();
  await page.tab("markets", "#ws-market-table");
  assert.deepEqual(page.all("[data-act='good']").map((button) => button.textContent), ["Bread", "Rope"]);
  assert.equal(page.q("[data-act='good'][aria-pressed='true']").textContent, "Bread");
  const row = page.q("[data-market-place='openton']");
  assert.match(row.textContent, /Openton/);
  assert.ok(row.querySelector("svg.ws-spark"), "a 14-day sparkline");
  assert.match(row.textContent, /\d+ days/);
  assert.ok(row.querySelector(".ws-chip--estimate"), "Openton's bread figures are a guess, and say so");
  assert.equal(page.q("[data-market-place='secretville'] .ws-chip--estimate"), null, "Secretville's bread figures are not");
  assert.match(page.text(), /Bread, per loaf\. Base price 1 gp/);

  page.click("[data-act='good'][data-id='rope']");
  await waitFor(() => /Rope, per coil/.test(page.text()), "the rope market should show");
  assert.match(page.text(), /Base price 10 gp estimate/, "an estimated base price is labelled");
});

test("Places: a searchable list by region, and a place page with an empty city map slot", async () => {
  const page = await openPage();
  await page.tab("places", "#ws-places");
  assert.deepEqual(page.all(".ws-placegroup h3").map((node) => node.textContent), ["Test Region", "Other Region"]);
  assert.equal(page.all(".ws-placeitem").length, 4);
  page.typeInto("#ws-place-query", "secret");
  assert.deepEqual(page.all(".ws-placeitem b").map((node) => node.textContent), ["Secretville"]);
  page.typeInto("#ws-place-query", "");

  page.click(".ws-placeitem[data-id='openton']");
  await waitFor(() => page.q("#ws-place[data-place='openton']"), "the place page should open");
  const panel = page.q("#ws-place");
  assert.match(panel.textContent, /Town · Test Region/);
  assert.match(panel.textContent, /known to players/);
  assert.equal(panel.querySelector("[data-detail]").textContent, "Full detail: prices tracked daily");
  assert.match(panel.textContent, /People 2,000/);
  const slot = panel.querySelector("[data-city-map]");
  assert.equal(slot.textContent, "City map goes here. None yet.");
  assert.equal(slot.children.length, 0, "the slot is empty: no map, no controls");
  assert.ok(panel.querySelector("#ws-place-prices"), "prices are listed");
  assert.match(panel.querySelector("#ws-place-roads").textContent, /Secretville/);
  assert.equal(panel.querySelector("#ws-place-roads input[data-road]").value, "2");
  assert.ok(panel.querySelector("#ws-place-roads .ws-chip--estimate"), "an estimated travel time is labelled");

  page.click(".ws-placeitem[data-id='openton--inn']");
  await waitFor(() => page.q("#ws-place[data-place='openton--inn']"), "the shop page should open");
  assert.equal(page.q("#ws-place [data-city-map]"), null, "a shop has no city map slot");
  assert.equal(page.q("#ws-place [data-detail]").textContent, "Place in a town");

  page.click(".ws-placeitem[data-id='farplace']");
  await waitFor(() => page.q("#ws-place[data-place='farplace']"), "the village page should open");
  assert.equal(page.q("#ws-place [data-detail]").textContent, "Sketched: no market yet");
  assert.equal(page.q("#ws-place-prices"), null);
  assert.match(page.q("#ws-place").textContent, /hidden from players/);
});

test("only the DM sets where the party is; advancing days does not move them", async () => {
  const page = await openPage();
  await page.tab("places", "#ws-places");
  assert.match(page.text(), /You have not said where the party is/);
  page.click(".ws-placeitem[data-id='openton']");
  await waitFor(() => page.q("[data-act='set-party'][data-id='openton']"), "the set-party button should show");
  page.click("[data-act='set-party'][data-id='openton']");
  await waitFor(() => /The party is in Openton/.test(page.text()), () => page.text());
  assert.equal((await page.world.service.getWorld()).party.place, "openton");

  await page.advance();
  await page.advance();
  assert.equal((await page.world.service.getWorld()).party.place, "openton");
  await page.tab("places", "#ws-places");
  assert.match(page.text(), /The party is in Openton/);
});

test("a jot that makes a good scarce changes prices, says why, and can be ended early", async () => {
  const page = await openPage();
  page.set("#ws-jot-place", "openton");
  await waitFor(() => page.q("[data-effect-kind]"), "the effect picker should show");
  page.set("[data-effect-kind]", "scarce");
  await waitFor(() => page.q("[data-effect-good]"), "the good picker should show");
  page.set("[data-effect-good]", "bread");
  page.set("[data-effect-days]", "12");
  await waitFor(() => /Openton makes 30% of the usual amount of bread for 12 days/.test(page.q("[data-effect-note]")?.textContent || ""), () => page.q("[data-effect-note]")?.textContent);
  page.q("#ws-jot-text").value = "Blight in the wheat fields.";
  page.click("[data-act='jot']");
  await waitFor(() => /Written\. It is in the Record/.test(page.text()), () => page.text());

  let view = await page.markets();
  assert.equal(view.pressures.length, 1);
  assert.equal(view.pressures[0].target, "make");
  assert.equal(view.pressures[0].multiplier, 0.3);
  const before = view.places.find((place) => place.id === "openton").goods.find((entry) => entry.good === "bread").price;

  let moved = "";
  for (let day = 0; day < 6; day += 1) {
    await page.advance();
    moved += page.q("#ws-moved").textContent;
  }
  assert.match(moved, /Bread in Openton up \d+%/, "a day report says bread got dearer");
  assert.equal(page.all("#ws-pending [data-event]").length, 0, "a price change is not a suggestion");

  await page.tab("markets", "#ws-market-table");
  const row = page.q("[data-market-place='openton']");
  assert.match(row.textContent, /Blight in the wheat fields\./);
  assert.ok(row.querySelector(".ws-up"), "shown as above usual");
  view = await page.markets();
  assert.ok(view.places.find((place) => place.id === "openton").goods.find((entry) => entry.good === "bread").price > before);

  page.click(row.querySelector("[data-act='end-pressure']"));
  await waitFor(() => /Ended/.test(page.text()), () => page.text());
  view = await page.markets();
  assert.equal(view.pressures[0].untilDay, view.day, "it stops after today");
});

test("a jot that closes a road shows on the place page", async () => {
  const page = await openPage();
  page.set("#ws-jot-place", "openton");
  await waitFor(() => page.q("[data-effect-kind]"), "the effect picker should show");
  page.set("[data-effect-kind]", "close");
  await waitFor(() => /road between Openton and Secretville is closed until you end it/.test(page.q("[data-effect-note]")?.textContent || ""), () => page.q("[data-effect-note]")?.textContent);
  page.q("#ws-jot-text").value = "A rockfall blocks the road.";
  page.click("[data-act='jot']");
  await waitFor(() => /Written\. It is in the Record/.test(page.text()), () => page.text());
  await page.advance();
  await page.tab("places", "#ws-places");
  page.click(".ws-placeitem[data-id='openton']");
  await waitFor(() => page.q("#ws-place[data-place='openton']"), "place page");
  assert.match(page.q("#ws-place-roads").textContent, /closed/);
  assert.match(page.q("#ws-place").textContent, /Road closed to Secretville: A rockfall blocks the road\./);
});

test("what-if runs in the browser and saves nothing", async () => {
  const page = await openPage();
  await page.world.service.jot({ text: "The ovens are cold.", place: "openton", effect: { type: "pressure", target: "make", place: "openton", good: "bread", multiplier: 0, days: null } });
  await page.tab("markets", "#ws-whatif");
  const before = await counts(page.world);
  const dayBefore = (await page.world.service.getWorld()).day;
  const writes = () => page.fetch.calls.filter((call) => call.method !== "GET").length;
  const writesBefore = writes();

  page.set("#ws-whatif-days", "40");
  page.click("[data-act='what-if']");
  await waitFor(() => page.q("[data-whatif-note]"), () => `the trial should finish: ${page.text()}`);
  assert.match(page.q("[data-whatif-note]").textContent, /Nothing was saved and the world has not moved/);
  assert.match(page.q("#ws-whatif").textContent, /After 40 days/);
  assert.match(page.q("#ws-whatif").textContent, /Bread is running short in Openton/, "it shows what the simulation would suggest");

  assert.deepEqual(await counts(page.world), before, "no row and no blob was written");
  assert.equal(writes(), writesBefore, "the page sent no write");
  assert.equal((await page.world.service.getWorld()).day, dayBefore);
  assert.equal((await page.world.service.getWorld()).pending.length, 0, "and nothing is waiting for a decision");
});

test("a figure the DM changes stops being an estimate and is saved through the record", async () => {
  const page = await openPage();
  await page.tab("places", "#ws-places");
  page.click(".ws-placeitem[data-id='openton']");
  await waitFor(() => page.q("#ws-place-figures"), "figures editor");
  const input = page.q("#ws-place-figures [data-figure='make'][data-good='bread']");
  assert.equal(input.value, "30");
  assert.ok(input.parentElement.querySelector(".ws-chip--estimate"));
  input.value = "36";
  page.click("[data-act='save-figures']");
  await waitFor(() => /Saved\. What is usual has been worked out again/.test(page.text()), () => page.text());

  const stored = await page.world.service.getPlaces();
  assert.deepEqual(stored.economy.markets.openton.bread.make, { value: 36, estimate: false, basis: "Set by you" });
  assert.equal(stored.economy.markets.openton.bread.use, 20, "figures that were not touched are left as they were");
  const view = await page.markets();
  const bread = view.places.find((place) => place.id === "openton").goods.find((entry) => entry.good === "bread");
  assert.equal(bread.make, 36);
  assert.equal(bread.makeEstimate, false);
  assert.equal((await page.world.store.listRecords()).filter((row) => row.recordType === "economy").length, 2, "one new setup row");
  assert.equal(page.q("#ws-place-figures [data-figure='make'][data-good='bread']").parentElement.querySelector(".ws-chip--estimate"), null);
});

test("travel days can be corrected on the place page", async () => {
  const page = await openPage();
  await page.tab("places", "#ws-places");
  page.click(".ws-placeitem[data-id='openton']");
  await waitFor(() => page.q("#ws-place-roads [data-road]"), "roads");
  page.q("#ws-place-roads [data-road='openton--secretville']").value = "3";
  page.click("[data-act='save-roads']");
  await waitFor(() => /Travel days saved/.test(page.text()), () => page.text());
  const route = (await page.markets()).routes.find((entry) => entry.id === "openton--secretville");
  assert.equal(route.travelDays, 3);
  assert.equal(route.travelDaysEstimate, false);
});

test("a sketched place can be given a market, with every figure marked as an estimate", async () => {
  const page = await openPage();
  await page.tab("places", "#ws-places");
  page.click(".ws-placeitem[data-id='farplace']");
  await waitFor(() => page.q("#ws-promote"), "the promote box should show");
  page.q("#ws-promote-people").value = "600";
  page.click("[data-act='promote']");
  await waitFor(() => /It has a market now/.test(page.text()), () => page.text());
  const place = (await page.markets()).places.find((entry) => entry.id === "farplace");
  assert.equal(place.hasMarket, true);
  assert.ok(place.goods.length > 0);
  assert.ok(place.goods.every((entry) => entry.useEstimate && entry.make === 0));
  assert.equal(place.populationEstimate, true);
  assert.equal(page.q("#ws-place [data-detail]").textContent, "Full detail: prices tracked daily");
  assert.equal(page.q("#ws-promote"), null);
});

test("a countdown's suggestion can carry an effect, and the card says what accepting does", async () => {
  const page = await openPage();
  await page.tab("countdowns", "#ws-new-countdown");
  page.set("#ws-cd-label", "Millers' strike");
  page.set("#ws-cd-chance", "10");
  page.set("#ws-cd-place", "openton");
  await waitFor(() => page.q("#ws-new-countdown [data-effect-kind]"), "effect picker in the countdown form");
  page.set("#ws-new-countdown [data-effect-kind]", "scarce");
  await waitFor(() => page.q("#ws-new-countdown [data-effect-days]"), "days field");
  page.set("#ws-new-countdown [data-effect-days]", "8");
  page.q("#ws-cd-suggestion").value = "The millers walk out.";
  page.click("[data-act='create-countdown']");
  await waitFor(() => page.all("[data-countdown]").length === 1, () => page.text());

  for (let day = 0; day < 5 && !(await page.world.service.getWorld()).pending.length; day += 1) {
    await page.advance();
  }
  await page.tab("today", "#ws-pending [data-event]");
  const card = page.q("#ws-pending [data-event]");
  assert.match(card.textContent, /The millers walk out\./);
  assert.match(card.querySelector("[data-if-accept]").textContent, /Openton makes 30% of the usual amount of bread for 8 days/);
  assert.equal((await page.markets()).pressures.length, 0, "nothing changes until it is accepted");
  page.click(card.querySelector("[data-act='accept']"));
  await waitFor(() => page.all("#ws-pending [data-event]").length === 0, "the card should go");
  assert.equal((await page.markets()).pressures.length, 1);
});
