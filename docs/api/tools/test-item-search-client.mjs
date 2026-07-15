import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("../apiClient/index.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const { EldoriaApiClient } = await import(moduleUrl);

let captured;
const controller = new AbortController();
const api = new EldoriaApiClient({
  baseUrl: "https://example.test/api",
  async fetch(url, init) {
    captured = { url, init };
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
});

await api.searchItems("sword", {
  limit: 25,
  rarity: ["rare", "uncommon"],
  type: ["Weapon"]
}, { signal: controller.signal });

const url = new URL(captured.url);
assert.equal(url.pathname, "/api/catalog/items");
assert.equal(url.searchParams.get("q"), "sword");
assert.deepEqual(url.searchParams.getAll("rarity"), ["rare", "uncommon"]);
assert.deepEqual(url.searchParams.getAll("type"), ["Weapon"]);
assert.equal(captured.init.signal, controller.signal);

console.log("Item search API client tests passed.");
