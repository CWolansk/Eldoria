"use strict";

const assert = require("node:assert/strict");
const model = require("../src/catalogModel");
const {
  buildItemSearchEntities,
  getItemSearchQueryTerms,
  isReadyItemSearchManifest,
  itemSearchManifestEntity,
  scoreItemSearchResult,
  toItemSearchResult
} = require("../src/itemSearchIndex");

const sampleItems = [
  {
    name: "Longsword",
    source: "PHB",
    type: {
      name: "Weapon"
    },
    rarity: "none",
    weapon: {
      category: "martial",
      damage: {
        primary: "1d8",
        type: {
          name: "slashing"
        }
      }
    }
  },
  {
    name: "Shield",
    source: "PHB",
    type: {
      name: "Shield"
    },
    ac: 2
  },
  {
    name: "+1 Psychic Wind Greatsword",
    source: "SCat",
    type: {
      name: "Weapon"
    },
    rarity: "rare",
    weapon: {
      category: "martial",
      damage: {
        primary: "2d6",
        type: {
          name: "slashing"
        }
      }
    }
  },
  {
    name: "Potion of Healing",
    source: "DMG",
    type: {
      name: "Potion"
    },
    rarity: "common"
  }
];

function searchRowsInMemory(rows, query) {
  const terms = getItemSearchQueryTerms(query);
  if (!terms.length) {
    return [];
  }

  const byTerm = terms.map((term) => {
    const byId = new Map();
    for (const row of rows.filter((entry) => String(entry.term || "").startsWith(term))) {
      const existing = byId.get(row.itemId);
      if (!existing || Number(row.ordinal || 0) < Number(existing.ordinal || 0)) {
        byId.set(row.itemId, row);
      }
    }
    return byId;
  });

  if (byTerm.some((map) => !map.size)) {
    return [];
  }

  const smallest = byTerm.reduce((left, right) => (right.size < left.size ? right : left), byTerm[0]);
  const normalizedQuery = model.normalizeText(query);
  return [...smallest.entries()]
    .filter(([id, row]) => byTerm.every((map) => map.has(id)) && model.matchesText(row, normalizedQuery))
    .map(([, row]) => ({
      row,
      score: scoreItemSearchResult(row, terms)
    }))
    .sort((left, right) => left.score - right.score || Number(left.row.ordinal || 0) - Number(right.row.ordinal || 0))
    .map(({ row }) => toItemSearchResult(row));
}

const built = buildItemSearchEntities(sampleItems);
assert.equal(built.indexedItems, sampleItems.length);
assert.ok(built.entities.length > sampleItems.length);
assert.ok(isReadyItemSearchManifest(itemSearchManifestEntity({
  itemCount: built.indexedItems,
  rowCount: built.entities.length
})));

const swordNames = searchRowsInMemory(built.entities, "sword").map((item) => item.name);
assert.ok(swordNames.includes("Longsword"));
assert.ok(swordNames.includes("+1 Psychic Wind Greatsword"));
assert.ok(!swordNames.includes("Shield"));

const partialSwordNames = searchRowsInMemory(built.entities, "swo").map((item) => item.name);
assert.ok(partialSwordNames.includes("Longsword"));

const multiTermNames = searchRowsInMemory(built.entities, "psychic wind sword").map((item) => item.name);
assert.deepEqual(multiTermNames, ["+1 Psychic Wind Greatsword"]);

assert.deepEqual(getItemSearchQueryTerms("sw"), []);

console.log("Item search index tests passed.");
