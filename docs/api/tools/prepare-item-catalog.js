"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseHomebrewItemsCsv } = require("../src/homebrewItems");

const DATA = path.resolve(__dirname, "../../data");
const ITEMS_PATH = path.join(DATA, "items-page-full-normalized.json");
const INDEX_PATH = path.join(DATA, "eldoria-items-index.json");
const HOMEBREW_PATH = path.join(DATA, "eldoria-homebrew-items.csv");
const MANIFEST_PATH = path.join(DATA, "rules-manifest.json");
const SANE_SOURCE = "SaneMagicItemPricesExpanded";

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function itemCounts(items) {
  return {
    items: items.length,
    baseItems: items.filter((item) => item._isBaseItem || item._category === "Basic").length,
    itemGroups: items.filter((item) => item._isItemGroup).length,
    genericVariants: items.filter((item) => item._category === "Generic Variant").length,
    specificVariants: items.filter((item) => item._category === "Specific Variant").length,
    mundaneItems: items.filter((item) => item.rarity === "none" || item.rarity === "unknown" || item._category === "Basic").length,
    magicItems: items.filter((item) => !(item.rarity === "none" || item.rarity === "unknown" || item._category === "Basic")).length,
    noDisplayItems: items.filter((item) => item.noDisplay).length,
    sources: new Set(items.map((item) => item.source || item.inherits?.source).filter(Boolean)).size,
    pricedItems: items.filter((item) => item.value != null).length
  };
}

const catalog = JSON.parse(fs.readFileSync(ITEMS_PATH, "utf8"));
const before = catalog.items.length;
catalog.items = catalog.items.filter((item) => item.source !== SANE_SOURCE);
catalog.counts = itemCounts(catalog.items);
writeJson(ITEMS_PATH, catalog);

const homebrew = parseHomebrewItemsCsv(fs.readFileSync(HOMEBREW_PATH, "utf8"));
const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
const byRef = new Map(index.items.map((item) => [String(item.ref).toLowerCase(), item]));
for (const item of homebrew) {
  byRef.set(item.ref.toLowerCase(), {
    ref: item.ref,
    path: "eldoria-homebrew-items.csv",
    name: item.name,
    source: item.source,
    rarity: item.rarity
  });
}
index.items = [...byRef.values()].sort((left, right) => left.name.localeCompare(right.name));
index.counts.items = index.items.length;
writeJson(INDEX_PATH, index);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
manifest.counts.catalogs.items = catalog.counts;
manifest.counts.catalogs.eldoriaItems.items = index.items.length;
const itemCatalog = manifest.catalogs.find((entry) => entry.id === "items");
if (itemCatalog) itemCatalog.counts = catalog.counts;
const eldoriaCatalog = manifest.catalogs.find((entry) => entry.id === "eldoria-items");
if (eldoriaCatalog) eldoriaCatalog.counts.items = index.items.length;
writeJson(MANIFEST_PATH, manifest);

console.log(`Removed ${before - catalog.items.length} ${SANE_SOURCE} item(s).`);
console.log(`Normalized catalog now contains ${catalog.items.length} item(s).`);
console.log(`Eldoria index now contains ${index.items.length} item(s), including ${homebrew.length} full homebrew definition(s).`);
