"use strict";

const assert = require("node:assert/strict");
const v2 = require("../src/itemSearchV2Index");
const store = require("../src/itemSearchV2Store");

const sampleItems = [
  { name: "Longsword", source: "PHB", rarity: "none", type: "M", weaponCategory: "martial", dmgType: "S", property: ["V"] },
  { name: "Shield", source: "PHB", rarity: "none", type: "S", ac: 2 },
  { name: "+1 Psychic Wind Greatsword", source: "SCat", rarity: "rare", type: "M", reqAttune: true, dmgType: "S" },
  { name: "Potion of Healing", source: "DMG", rarity: "common", type: "P" }
];

const built = v2.buildItemSearchV2Entities(sampleItems);
assert.equal(built.indexedItems, sampleItems.length);
assert.equal(built.version, v2.ITEM_SEARCH_V2_VERSION);
assert.ok(built.entities.length > sampleItems.length);
assert.deepEqual(v2.getQueryTerms("sw"), ["sw"]);
assert.deepEqual(v2.getQueryTerms("s"), []);
assert.deepEqual(v2.getQueryTerms("psychic wind sword"), ["psychic", "wind", "sword"]);
assert.deepEqual(v2.getQueryTerms("COrpse Slayer"), ["corpse", "slayer"]);

const swordRange = v2.textRange("sword");
const swordRows = built.entities.filter((row) => row.partitionKey === v2.textPartition("sword")
  && row.rowKey >= swordRange.start && row.rowKey < swordRange.end);
assert.ok(swordRows.some((row) => row.name === "Longsword"));
assert.ok(swordRows.some((row) => row.name.includes("Greatsword")));

const browseRows = built.entities.filter((row) => row.partitionKey === `${v2.ITEM_SEARCH_V2_PREFIX}:b:name`);
assert.equal(browseRows.length, sampleItems.length);
assert.deepEqual([...browseRows].sort((a, b) => a.rowKey.localeCompare(b.rowKey)).map((row) => row.name), [
  "+1 Psychic Wind Greatsword", "Longsword", "Potion of Healing", "Shield"
]);

assert.ok(built.facets.rarity.some((entry) => entry.value === "rare" && entry.count === 1));
assert.ok(v2.isReadyManifest(v2.manifestEntity({
  itemCount: built.indexedItems,
  rowCount: built.entities.length,
  facets: built.facets
})));

const longsword = swordRows.find((row) => row.name === "Longsword");
assert.equal(v2.toPublicResult(longsword).id, longsword.itemId);
assert.ok(v2.score({ ...longsword, name: "Sword Oil" }, ["sword"]) < v2.score(longsword, ["sword"]));

const workshopItem = {
  id: "item:glow-clay:eldoria",
  name: "Glow Clay",
  source: "Eldoria",
  rarity: "common",
  type: "Wondrous Item"
};
const workshopBuilt = v2.buildItemSearchV2Entities([workshopItem], { ordinalOffset: 99_999_999 });
assert.equal(workshopBuilt.indexedItems, 1);
assert.ok(workshopBuilt.entities.every((row) => row.itemId === workshopItem.id && row.ordinal === 99_999_999));
assert.ok(workshopBuilt.entities.some((row) => row.partitionKey === v2.textPartition("glow") && row.name === "Glow Clay"));

const narrowedFacets = store._test.buildFacets([longsword], built.facets);
assert.ok(narrowedFacets.rarity.some((entry) => entry.value === "rare" && entry.count === 0));
assert.ok(narrowedFacets.rarity.some((entry) => entry.value === "none" && entry.count === 1));

const filters = store._test.normalizeFilters({ rarity: ["Rare", "rare"], attunement: "Required" });
assert.deepEqual(filters, { rarity: ["rare"], attunement: ["required"] });
const psychicSword = swordRows.find((row) => row.name.includes("Psychic"));
assert.ok(store._test.matchesFilters(psychicSword, filters));
assert.ok(!store._test.matchesFilters(longsword, filters));
const addedManifest = store._test.updateManifestData({
  itemCount: built.indexedItems,
  rowCount: built.entities.length,
  facets: built.facets
}, {}, workshopBuilt.facets, {
  previousIndexed: false,
  previousRowCount: 0,
  nextRowCount: workshopBuilt.entities.length
});
assert.equal(addedManifest.itemCount, built.indexedItems + 1);
assert.equal(addedManifest.rowCount, built.entities.length + workshopBuilt.entities.length);
assert.ok(addedManifest.facets.source.some((entry) => entry.value === "Eldoria" && entry.count === 1));

const renamedItem = { ...workshopItem, name: "Radiant Clay", rarity: "rare" };
const renamedBuilt = v2.buildItemSearchV2Entities([renamedItem], { ordinalOffset: 99_999_999 });
const editedManifest = store._test.updateManifestData(addedManifest, workshopBuilt.facets, renamedBuilt.facets, {
  previousIndexed: true,
  previousRowCount: workshopBuilt.entities.length,
  nextRowCount: renamedBuilt.entities.length
});
assert.equal(editedManifest.itemCount, addedManifest.itemCount);
assert.ok(!editedManifest.facets.rarity.some((entry) => entry.value === "common" && entry.count > built.facets.rarity.find((value) => value.value === "common").count));
assert.equal(editedManifest.facets.rarity.find((entry) => entry.value === "rare").count, 2);
const cursorOptions = { q: "sword", sort: "relevance", filters: {} };
const cursor = store._test.encodeCursor(25, cursorOptions);
assert.equal(store._test.decodeCursor(cursor, cursorOptions), 25);
assert.throws(() => store._test.decodeCursor(cursor, { ...cursorOptions, q: "shield" }), /invalid/iu);

console.log("Item search v2 index tests passed.");
