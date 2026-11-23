// The DM page, run whole under jsdom against the real route handlers on in-memory storage.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { DM_KEY, createApiFetch, engine, makeWorld } from "./helpers.mjs";

const html = await readFile(new URL("../../tools/world-sim/index.html", import.meta.url), "utf8");
const GLOBALS = ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "location"];
let boots = 0;

process.env.ELDORIA_DM_KEY = DM_KEY;

async function waitFor(predicate, message, attempts = 300) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(typeof message === "function" ? message() : message);
}

/** Boots a fresh copy of the page. `storedKey` is what an earlier visit left behind. */
async function bootPage({ storedKey, world = makeWorld(), hash = "" } = {}) {
  const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/gu, ""), {
    url: `https://eldoria.test/tools/world-sim/index.html${hash}`,
    pretendToBeVisual: true
  });
  for (const key of GLOBALS) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
  }
  globalThis.CSS = { escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/gu, "\\$&") };
  dom.window.ELDORIA_API_BASE_URL = "https://api.test/api";
  if (storedKey) dom.window.localStorage.setItem("eldoria:dm-key", storedKey);
  const fetch = createApiFetch(world);
  globalThis.fetch = fetch;
  const warn = console.warn;
  console.warn = () => {};
  await import(`../../tools/world-sim/world-sim.js?boot=${(boots += 1)}`);
  console.warn = warn;

  const doc = dom.window.document;
  const page = {
    world,
    fetch,
    doc,
    text: () => doc.querySelector("#ws-view").textContent.replace(/\s+/gu, " "),
    q: (selector) => doc.querySelector(selector),
    all: (selector) => [...doc.querySelectorAll(selector)],
    click(selector) {
      const node = typeof selector === "string" ? doc.querySelector(selector) : selector;
      assert.ok(node, `nothing to click: ${selector}`);
      node.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    },
    type(selector, value) {
      const node = doc.querySelector(selector);
      assert.ok(node, `nothing to type into: ${selector}`);
      node.value = value;
      node.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    },
    async unlock(key = DM_KEY) {
      await waitFor(() => doc.querySelector("#ws-key"), "the lock form should show");
      doc.querySelector("#ws-key").value = key;
      doc.querySelector("#ws-lock-form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    },
    async started() {
      await waitFor(() => doc.querySelector("[data-act='start']") || doc.querySelector("#ws-jot"), "the page should load");
      if (doc.querySelector("[data-act='start']")) {
        page.click("[data-act='start']");
        await waitFor(() => doc.querySelector("#ws-jot"), () => `the world should start: ${page.text()}`);
      }
    },
    async serverWorld() {
      return world.service.getWorld();
    }
  };
  return page;
}

async function readyPage(options = {}) {
  const page = await bootPage({ storedKey: DM_KEY, ...options });
  await page.started();
  return page;
}

async function addCountdown(page, { label = "Test build-up", chanceInTen = 10, size = "4", suggestion = "The build-up comes to a head." } = {}) {
  page.click("[data-act='tab'][data-id='countdowns']");
  await waitFor(() => page.q("#ws-new-countdown"), "countdowns tab should open");
  page.type("#ws-cd-label", label);
  page.type("#ws-cd-size", size);
  page.type("#ws-cd-chance", String(chanceInTen));
  page.q("#ws-cd-suggestion").value = suggestion;
  page.click("[data-act='create-countdown']");
  await waitFor(() => page.all("[data-countdown]").some((card) => card.textContent.includes(label)), () => `countdown should appear: ${page.text()}`);
}

test("without a key the page shows only the lock, and asks the server for nothing about the world", async () => {
  const page = await bootPage();
  await waitFor(() => page.q("#ws-lock-form"), "lock form");
  assert.equal(page.q("#ws-bar").hidden, true);
  assert.equal(page.q("#ws-tabs").hidden, true);
  assert.equal(page.q("#ws-jot"), null);
  assert.deepEqual(page.fetch.calls, [], "no request before a key is entered");
});

test("a wrong key is refused, shown as such, and not kept", async () => {
  const page = await bootPage();
  await page.unlock("not-the-key");
  await waitFor(() => /not correct/.test(page.q("#ws-lock-message")?.textContent || ""), "wrong key message");
  assert.equal(window.localStorage.getItem("eldoria:dm-key"), null);
  assert.equal(page.q("#ws-jot"), null);
  assert.ok(page.fetch.calls.every((call) => call.url.endsWith("/dm/session")), "only the key check was sent");
});

test("the right key is kept in this browser only and opens the world", async () => {
  const page = await bootPage();
  await page.unlock();
  await waitFor(() => page.q("[data-act='start']"), () => `start view: ${page.text()}`);
  assert.equal(window.localStorage.getItem("eldoria:dm-key"), DM_KEY);
  assert.match(page.q("#ws-start-date").value, /Fall 7, 496/);
  assert.equal(page.world.blobs.blobs.size, 0, "nothing is saved until the DM starts the world");

  page.click("[data-act='start']");
  await waitFor(() => page.q("#ws-jot"), "today view");
  assert.equal(page.q("#ws-bar").hidden, false);
  assert.match(page.q("#ws-date").textContent, /Fall 7, 496.*Day 7 of 50 in Fall/s);
  assert.deepEqual(page.all("#ws-tab-row a").map((tab) => tab.textContent), ["Today", "Countdowns", "Record"], "no dead tabs");
  assert.match(page.text(), /Nothing is waiting/);
  assert.match(page.text(), /Nothing written yet today/);
});

test("a key left by an earlier visit is checked, then used", async () => {
  const page = await readyPage();
  assert.ok(page.fetch.calls[0].url.endsWith("/dm/session"));
  assert.equal((await page.serverWorld()).day, engine.WORLD_START_DAY);
});

test("forgetting the key locks the page again", async () => {
  const page = await readyPage();
  page.click("[data-act='forget-key']");
  await waitFor(() => page.q("#ws-lock-form"), "locked again");
  assert.equal(window.localStorage.getItem("eldoria:dm-key"), null);
  assert.equal(page.q("#ws-jot"), null);
});

test("a jot writes a canon event and shows it under today", async () => {
  const page = await readyPage();
  page.q("#ws-jot-text").value = "A test thing happened.";
  page.click("[data-act='jot']");
  await waitFor(() => /A test thing happened\./.test(page.q("#ws-written").textContent), () => page.text());
  assert.match(page.q("#ws-written").textContent, /written by you/);
  assert.equal(page.q("#ws-jot-text").value, "", "the box is cleared");
  const events = (await page.world.service.listEvents()).events;
  assert.deepEqual(events.map((event) => [event.text, event.status, event.playersVisible]), [["A test thing happened.", "written", false]]);
});

test("a jot can be dated in the past; an unreadable or future date is refused", async () => {
  const page = await readyPage();
  page.q("#ws-jot-text").value = "Earlier thing.";
  page.type("#ws-jot-when", "Fall 3");
  page.click("[data-act='jot']");
  await waitFor(() => /Written\./.test(page.q("#ws-message").textContent), () => page.text());
  assert.equal((await page.world.service.listEvents()).events[0].day, engine.WORLD_START_DAY - 4);

  page.q("#ws-jot-text").value = "Bad date.";
  page.type("#ws-jot-when", "next week");
  page.click("[data-act='jot']");
  await waitFor(() => /Write the date like/.test(page.q("#ws-message").textContent), () => page.text());

  page.type("#ws-jot-when", "Fall 20, 496");
  page.click("[data-act='jot']");
  await waitFor(() => /cannot be dated after today/.test(page.q("#ws-message").textContent), () => page.text());
  assert.equal(page.q("#ws-jot-text").value, "Bad date.", "what was typed is kept");
  assert.equal((await page.world.service.listEvents()).events.length, 1);
});

test("an empty jot asks for text and writes nothing", async () => {
  const page = await readyPage();
  page.click("[data-act='jot']");
  await waitFor(() => /Write what happened first/.test(page.q("#ws-message").textContent), () => page.text());
  assert.equal(page.world.table.rows.size, 0);
});

test("a countdown can be created and stepped by hand", async () => {
  const page = await readyPage();
  await addCountdown(page, { chanceInTen: 2, size: "6" });
  const card = () => page.q("[data-countdown]");
  assert.equal(card().querySelectorAll(".ws-clock i").length, 6);
  assert.equal(card().querySelectorAll(".ws-clock i.is-on").length, 0);
  assert.match(card().textContent, /About 2 in 10 chance/);

  page.click("[data-act='step'][data-delta='1']");
  await waitFor(() => card().querySelectorAll(".ws-clock i.is-on").length === 1, "one step forward");
  page.click("[data-act='step'][data-delta='1']");
  await waitFor(() => card().querySelectorAll(".ws-clock i.is-on").length === 2, "two steps forward");
  page.click("[data-act='step'][data-delta='-1']");
  await waitFor(() => card().querySelectorAll(".ws-clock i.is-on").length === 1, "one step back");
  assert.equal((await page.serverWorld()).countdowns[0].fill, 1);
});

test("a countdown needs a name and something to suggest", async () => {
  const page = await readyPage();
  page.click("[data-act='tab'][data-id='countdowns']");
  await waitFor(() => page.q("#ws-new-countdown"), "countdowns tab");
  page.click("[data-act='create-countdown']");
  await waitFor(() => /required/.test(page.q("#ws-new-countdown").textContent), () => page.text());
  assert.equal((await page.serverWorld()).countdowns.length, 0);
});

test("a dated countdown shows its date and how far off it is", async () => {
  const page = await readyPage();
  page.click("[data-act='tab'][data-id='countdowns']");
  await waitFor(() => page.q("#ws-cd-mode"), "countdowns tab");
  page.type("#ws-cd-mode", "date");
  await waitFor(() => page.q("#ws-cd-date"), "date field");
  page.type("#ws-cd-label", "Test occasion");
  page.type("#ws-cd-date", "Fall 15");
  page.q("#ws-cd-suggestion").value = "The occasion takes place.";
  page.click("[data-act='create-countdown']");
  await waitFor(() => page.q("[data-countdown]"), () => page.text());
  assert.match(page.q("[data-countdown]").textContent, /Fixed date: Fall 15, 496 \(8 days away\)/);
});

test("advance a day moves the date and reports what moved", async () => {
  const page = await readyPage();
  await addCountdown(page);
  page.click("#ws-advance");
  await waitFor(() => /Fall 8, 496/.test(page.q("#ws-date").textContent), () => page.q("#ws-date").textContent);
  assert.match(page.q("#ws-moved").textContent, /moves to 1 of 4/);
  assert.equal(page.q("#ws-tab-row a[aria-current='page']").textContent, "Today");
  assert.equal((await page.serverWorld()).day, engine.WORLD_START_DAY + 1);
});

test("run to next decision stops when something needs a call; accept writes it", async () => {
  const page = await readyPage();
  await addCountdown(page);
  page.click("#ws-run");
  await waitFor(() => page.q(".ws-card--sugg"), () => page.text());
  assert.match(page.q("#ws-date").textContent, /Fall 11, 496/);
  assert.match(page.q(".ws-card--sugg").textContent, /The build-up comes to a head\..*Why:.*filled up/s);
  assert.equal(page.q("#ws-tab-row .ws-count").textContent, "1");
  assert.match(page.q("#ws-moved").textContent, /since Fall 7/);

  page.click("[data-act='accept']");
  await waitFor(() => !page.q(".ws-card--sugg"), "the suggestion is decided");
  assert.match(page.q("#ws-written").textContent, /The build-up comes to a head\..*suggested by the simulation, accepted by you/s);
  assert.equal(page.q("#ws-tab-row .ws-count"), null);
  const world = await page.serverWorld();
  assert.equal(world.countdowns[0].done, true);
  assert.equal(world.pending.length, 0);
});

test("reword saves the DM's wording and keeps the original in the record", async () => {
  const page = await readyPage();
  await addCountdown(page);
  page.click("#ws-run");
  await waitFor(() => page.q("[data-act='reword']"), () => page.text());
  page.click("[data-act='reword']");
  await waitFor(() => page.q(".ws-card--sugg input"), "reword box");
  page.q(".ws-card--sugg input").value = "It ended quietly.";
  page.click("[data-act='save-reword']");
  await waitFor(() => /It ended quietly\./.test(page.q("#ws-written").textContent), () => page.text());
  const event = (await page.world.service.listEvents()).events[0];
  assert.deepEqual([event.status, event.text, event.originalText], ["written", "It ended quietly.", "The build-up comes to a head."]);
});

test("reject drops the suggestion and the countdown carries on from half", async () => {
  const page = await readyPage();
  await addCountdown(page);
  page.click("#ws-run");
  await waitFor(() => page.q("[data-act='reject']"), () => page.text());
  page.click("[data-act='reject']");
  await waitFor(() => !page.q(".ws-card--sugg"), "the suggestion is decided");
  assert.match(page.text(), /Nothing written yet today/);
  const world = await page.serverWorld();
  assert.deepEqual([world.countdowns[0].done, world.countdowns[0].fill], [false, 2]);
  assert.equal((await page.world.service.listEvents({ status: "rejected" })).events.length, 1);
});

test("the record lists everything, filters by status, and reveals an event to players on request", async () => {
  const page = await readyPage();
  page.q("#ws-jot-text").value = "A written thing.";
  page.click("[data-act='jot']");
  await waitFor(() => /A written thing\./.test(page.q("#ws-written").textContent), () => page.text());
  await addCountdown(page);
  page.click("#ws-run");
  await waitFor(() => page.q(".ws-card--sugg"), () => page.text());

  page.click("[data-act='tab'][data-id='record']");
  await waitFor(() => page.all("#ws-record tbody tr[data-event]").length === 2, () => page.text());
  const statuses = () => page.all("#ws-record tbody tr[data-event] .ws-chip").map((chip) => chip.textContent);
  assert.deepEqual(statuses(), ["Suggested", "Written"]);

  page.click("[data-act='filter'][data-id='written']");
  assert.deepEqual(statuses(), ["Written"]);
  const toggle = () => page.q("[data-act='reveal']");
  assert.equal(toggle().textContent, "Hidden", "hidden from players by default");
  assert.equal(toggle().getAttribute("aria-pressed"), "false");

  page.click(toggle());
  await waitFor(() => toggle().textContent === "Shown to players", () => page.text());
  assert.equal((await page.world.service.listEvents({ status: "written" })).events[0].playersVisible, true);
  page.click(toggle());
  await waitFor(() => toggle().textContent === "Hidden", () => page.text());
  assert.equal((await page.world.service.listEvents({ status: "written" })).events[0].playersVisible, false);

  page.click("[data-act='filter'][data-id='suggested']");
  assert.deepEqual(statuses(), ["Suggested"]);
  assert.equal(page.q("[data-act='reveal']"), null, "a suggestion cannot be shown to players");
});

test("when another device advanced first, this one is told and shows the newer day", async () => {
  const page = await readyPage();
  const before = await page.serverWorld();
  await page.world.service.advance({ days: 2, expectedEtag: before.etag });
  page.click("#ws-advance");
  await waitFor(() => /Fall 9, 496/.test(page.q("#ws-date").textContent), () => page.q("#ws-date").textContent);
  assert.match(page.q("#ws-message").textContent, /moved on|Reload/);
  assert.equal((await page.serverWorld()).day, engine.WORLD_START_DAY + 2, "nothing was advanced twice");
});

test("the Where box offers the DM place list once it is loaded", async () => {
  const page = await readyPage();
  assert.match(page.q("#ws-setup").textContent, /No DM place list is loaded/);
  const input = page.q("#ws-places-file");
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [{ text: async () => JSON.stringify({ places: [{ id: "place-1", name: "Test Town" }, { id: "place-2", name: "Hidden Test Town" }] }) }]
  });
  page.click("[data-act='load-places']");
  await waitFor(() => page.all("#ws-jot-place option").length === 3, () => page.text());
  assert.deepEqual(page.all("#ws-jot-place option").map((option) => option.textContent), ["No particular place", "Test Town", "Hidden Test Town"]);

  page.q("#ws-jot-text").value = "Something there.";
  page.type("#ws-jot-place", "place-2");
  page.click("[data-act='jot']");
  await waitFor(() => /Hidden Test Town/.test(page.q("#ws-written").textContent), () => page.text());
  assert.equal((await page.world.service.listEvents()).events[0].place, "place-2");
});

test("every request the page makes goes to the API, and world requests carry the key", async () => {
  const page = await readyPage();
  page.q("#ws-jot-text").value = "A test thing happened.";
  page.click("[data-act='jot']");
  await waitFor(() => /A test thing happened\./.test(page.q("#ws-written").textContent), () => page.text());
  for (const call of page.fetch.calls) {
    assert.match(call.url, /^https:\/\/api\.test\/api\//, call.url);
    assert.doesNotMatch(call.url, new RegExp(DM_KEY), "the key is never put in a URL");
  }
});
