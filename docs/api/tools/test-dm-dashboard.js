"use strict";

const assert = require("node:assert/strict");
const { applyDmAction, loadCatalogRecords, summarizeCharacter } = require("../src/dmDashboard");

function sheet() {
  return {
    schemaVersion: "player-sheet-v2",
    id: "char-test-001",
    lastModified: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test Hero", playerName: "DM", experience: 8000 },
    baseChoices: { startingProficiencies: { languages: ["Common", "Dwarvish"] } },
    levels: [
      { characterLevel: 1, class: { name: "Fighter" }, hp: 12 },
      { characterLevel: 2, class: { name: "Fighter" }, hp: 8 }
    ],
    combatState: {
      ac: 17,
      currentHp: 15,
      tempHp: 5,
      conditions: [],
      exhaustion: 0,
      deathSaves: { successes: 0, failures: 0 },
      defenses: { damageResistances: ["cold"] }
    },
    inventory: {
      currency: { gp: 10 },
      items: [{
        name: "Ward",
        equipped: true,
        attuned: false,
        catalog: { id: "item-ward", kind: "items" }
      }]
    }
  };
}

let value = applyDmAction(sheet(), { type: "damage", amount: 8 });
assert.equal(value.combatState.tempHp, 0);
assert.equal(value.combatState.currentHp, 12);

value = applyDmAction(value, { type: "heal", amount: 99 });
assert.equal(value.combatState.currentHp, 20);

value = applyDmAction(value, { type: "add-condition", condition: "Poisoned" });
value = applyDmAction(value, { type: "add-condition", condition: "poisoned" });
assert.deepEqual(value.combatState.conditions, ["Poisoned"]);

value = applyDmAction(value, { type: "set-exhaustion", value: 9 });
assert.equal(value.combatState.exhaustion, 6);
value = applyDmAction(value, { type: "set-death-saves", successes: 2, failures: 1 });
assert.deepEqual(value.combatState.deathSaves, { successes: 2, failures: 1 });
value = applyDmAction(value, { type: "adjust-currency", currency: "gp", amount: -4 });
assert.equal(value.inventory.currency.gp, 6);

value = applyDmAction(value, {
  type: "give-item",
  item: { name: "Lightning Rod", source: "Homebrew", catalog: { id: "lightning-rod_homebrew", name: "Lightning Rod", source: "Homebrew", kind: "items" } },
  quantity: 2
});
value = applyDmAction(value, {
  type: "give-item",
  item: { name: "Lightning Rod", source: "Homebrew", catalog: { id: "lightning-rod_homebrew" } },
  quantity: 1
});
assert.equal(value.inventory.items.length, 2);
assert.equal(value.inventory.items.find((item) => item.name === "Lightning Rod").quantity, 3);

const summary = summarizeCharacter(value, {}, [{
  resist: ["poison"],
  _fImm: ["fire"],
  _fCondImm: ["charmed"],
  _fVuln: ["cold"],
  languageProficiencies: [{ common: true, primordial: true }]
}]);
assert.equal(summary.level, 5);
assert.equal(summary.hp.max, 20);
assert.deepEqual(summary.languages, ["Common", "Dwarvish", "Primordial"]);
assert.deepEqual(summary.defenses.damageResistances, ["cold", "poison"]);
assert.deepEqual(summary.defenses.damageImmunities, ["fire"]);
assert.deepEqual(summary.defenses.conditionImmunities, ["charmed"]);
assert.deepEqual(summary.defenses.damageVulnerabilities, ["cold"]);

void (async () => {
  const records = await loadCatalogRecords(sheet(), async (kind, id) => ({
    kind,
    id,
    reqAttune: kind === "items",
    _fRes: ["poison"]
  }));
  assert.equal(records.some((record) => record.kind === "items"), false, "Unattuned items must not grant defenses");
  console.log("DM dashboard action tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
