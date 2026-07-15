"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseHomebrewItemsCsv } = require("../src/homebrewItems");

const items = parseHomebrewItemsCsv(fs.readFileSync(path.resolve(__dirname, "../../data/eldoria-homebrew-items.csv"), "utf8"));
assert.equal(items.length, 26);

const sigil = items.find((item) => item.name === "Sigil of Thunderous Might");
assert.equal(sigil.value, 150000);
assert.equal(sigil.reqAttune, true);
assert.equal(sigil.entries.length, 3);
assert.deepEqual(sigil.properties, ["Crushing Strike (1/day)", "Shielding Impact (1/day)"]);

const lightningRod = items.find((item) => item.name === "Lightning Rod");
assert.equal(lightningRod.page, undefined);
assert.equal(lightningRod.damage, "1d6 piercing");

const scroll = items.find((item) => item.name === "Scroll of the Vanquisher's Amulet");
assert.equal(scroll.reqAttune, false);
assert.equal(scroll.weight, 0.5);

const prospectingCompass = items.find((item) => item.name === "Prospecting Compass");
assert.equal(prospectingCompass.rarity, "rare");
assert.equal(prospectingCompass.value, 10000);
assert.equal(prospectingCompass.reqAttune, false);

console.log("Homebrew item tests passed.");
