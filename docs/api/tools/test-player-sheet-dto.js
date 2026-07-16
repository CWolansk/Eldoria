"use strict";

const assert = require("node:assert/strict");
const { normalizePlayerSheetDto } = require("../src/playerSheetDto");

const dto = normalizePlayerSheetDto({
  schemaVersion: "player-sheet-v2",
  inventory: {
    items: [{
      name: "Spell Scroll (3rd Level)",
      catalog: { id: "item:spell-scroll-3rd-level:dmg", name: "Spell Scroll (3rd Level)", source: "DMG" },
      containedSpell: { id: "spell:fireball:phb", name: "Fireball", source: "PHB" }
    }]
  }
});

assert.equal(dto.inventory.items[0].containedSpell.id, "spell:fireball:phb");
assert.equal(dto.inventory.items[0].containedSpell.name, "Fireball");
assert.equal(dto.inventory.items[0].containedSpell.kind, "spells");

console.log("Player sheet DTO tests passed.");
