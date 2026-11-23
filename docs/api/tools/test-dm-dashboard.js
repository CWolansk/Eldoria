"use strict";

const assert = require("node:assert/strict");
const { applyDmAction, loadCatalogRecords, summarizeCharacter } = require("../src/dmDashboard");

function sheet() {
  return {
    schemaVersion: "player-sheet-v2",
    id: "char-test-001",
    lastModified: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test Hero", playerName: "DM", experience: 8000 },
    baseChoices: {
      race: { id: "dragonborn-phb", name: "Dragonborn", source: "PHB" },
      raceChoices: {
        selections: {
          "dragonborn-phb:draconic-ancestry:0": {
            type: "draconic-ancestry",
            values: [{ label: "Green - Poison", damageType: "poison" }]
          }
        }
      },
      backgroundChoices: {
        selections: {
          "background:language": {
            type: "language",
            values: [{ value: "Celestial", label: "Celestial" }]
          }
        }
      },
      startingProficiencies: { languages: ["Common", "Dwarvish"] }
    },
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
assert.equal(summary.hp.max, 10, "Exhaustion halves maximum HP on the DM summary too");
assert.deepEqual(summary.languages, ["Common", "Dwarvish", "Primordial", "Celestial"]);
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

  // ---- rest ----
  const tired = sheet();
  tired.combatState.currentHp = 3;
  tired.combatState.tempHp = 5;
  tired.combatState.exhaustion = 2;
  tired.combatState.conditions = ["Poisoned"];
  tired.combatState.deathSaves = { successes: 2, failures: 1 };
  tired.resources = [
    { id: "class-second-wind", used: 1 },
    { id: "class-arcane-recovery", used: 1 },
    { id: "custom-flask", name: "Flask", current: 1, max: 3 }
  ];
  tired.spells = { spellSlots: { byLevel: { "1": { expended: 2 }, "2": { max: 3, expended: 1 } } } };
  const rules = { resources: [
    { id: "class-second-wind", recharge: "short or long rest" },
    { id: "class-arcane-recovery", recharge: "long rest" }
  ] };
  const before = JSON.stringify(tired);

  const shortRest = applyDmAction(tired, { type: "rest", rest: "short" }, rules);
  assert.equal(JSON.stringify(tired), before, "A rest must not change the sheet it was given");
  assert.deepEqual(shortRest.resources.map((entry) => entry.id), ["class-arcane-recovery", "custom-flask"], "A short rest restores only short-rest features");
  assert.equal(shortRest.combatState.currentHp, 3, "A short rest leaves hit points alone");
  assert.equal(shortRest.combatState.exhaustion, 2, "A short rest leaves exhaustion alone");
  assert.deepEqual(shortRest.spells.spellSlots.byLevel["1"], { expended: 2 }, "A short rest leaves spell slots alone");
  assert.deepEqual(
    applyDmAction(tired, { type: "rest", rest: "short" }, {}).resources.map((entry) => entry.id),
    ["class-second-wind", "class-arcane-recovery", "custom-flask"],
    "Without the rules, a short rest restores nothing rather than guessing"
  );

  const longRest = applyDmAction(tired, { type: "rest", rest: "long" }, rules);
  assert.deepEqual(longRest.resources.map((entry) => entry.id), ["custom-flask"], "A long rest restores every tracked feature and keeps custom resources");
  assert.equal(longRest.combatState.currentHp, 20, "A long rest restores hit points to the maximum (12 + 8)");
  assert.equal(longRest.combatState.tempHp, 0, "A long rest clears temporary hit points");
  assert.equal(longRest.combatState.exhaustion, 1, "A long rest lowers exhaustion by one");
  assert.deepEqual(longRest.combatState.deathSaves, { successes: 0, failures: 0 });
  assert.deepEqual(longRest.combatState.conditions, ["Poisoned"], "A rest does not remove conditions");
  assert.deepEqual(longRest.spells.spellSlots.byLevel, { "2": { max: 3, expended: 0 } }, "Used slots are cleared; a recorded maximum is kept");
  assert.deepEqual(longRest.inventory, tired.inventory, "A rest does not touch inventory");
  assert.deepEqual(longRest.identity, tired.identity, "A rest does not touch identity");

  const noMax = sheet();
  noMax.levels = noMax.levels.map((level) => ({ ...level, hp: 0 }));
  noMax.combatState.currentHp = 7;
  assert.equal(applyDmAction(noMax, { type: "rest", rest: "long" }, rules).combatState.currentHp, 7, "With no maximum set, a long rest leaves hit points as they are");
  assert.throws(() => applyDmAction(tired, { type: "rest", rest: "nap" }, rules), /short or long/);
  assert.throws(() => applyDmAction(tired, { type: "rest" }, rules), /short or long/);

  console.log("DM dashboard action tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
