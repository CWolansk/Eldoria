// Item 6: the attack line comes first, rules are folded away, unequipped weapons
// still show what to add, and Extra Attack is mentioned.
import test from "node:test";
import assert from "node:assert/strict";
import { loadSheetFixtures } from "./fixtures.mjs";

const fx = await loadSheetFixtures();
const { SheetCompiler } = await import("../../SheetCompiler.js");
const { BuildPlayerSheetOffenseTab } = await import("../../PlayerSheetJavaScript/PlayerSheetOffenseTabBuilder.js");

const weapon = (name, equipped, snapshot) => ({ name, quantity: 1, equipped, snapshot: { name, weapon: true, ...snapshot } });

function makeDto() {
  const dto = fx.createDto(); // STR 16 (+3), DEX 12 (+1), level 5 by experience: proficiency +3
  dto.inventory.items = [
    weapon("Longsword", true, { dmg1: "1d8", dmg2: "1d10", dmgType: "S", property: ["V"], entries: [{ type: "entries", name: "Versatile", entries: ["Can be used with one or two hands."] }] }),
    weapon("Greataxe", false, { dmg1: "1d12", dmgType: "S", property: ["H", "2H"] }),
    weapon("Handaxe", true, { dmg1: "1d6", dmgType: "S", property: ["L", "T"], range: "20/60" }),
    weapon("Dagger", true, { dmg1: "1d4", dmgType: "P", property: ["F", "L", "T"], range: "20/60" }),
    weapon("Shortbow", true, { dmg1: "1d6", dmgType: "P", property: ["A", "2H"], range: "80/320", type: "R" })
  ];
  return dto;
}

async function render(compiled, dto) {
  const tab = fx.mountTab();
  await BuildPlayerSheetOffenseTab(compiled, { api: fx.createFakeApi(), dto, onChange: async () => {} });
  const rows = Object.fromEntries([...tab.querySelectorAll(".player-sheet-item-row")]
    .map((row) => [row.querySelector(".player-sheet-item-row__title").textContent, row]));
  return { tab, rows };
}

const line = (row) => row.querySelector("[data-attack-line]")?.textContent || "";

test("thrown melee weapons use Strength; finesse and ranged weapons use the right ability", () => {
  const compiled = SheetCompiler.compile(makeDto());
  const byName = Object.fromEntries(compiled.attacks.map((attack) => [attack.name, attack]));
  assert.equal(compiled.proficiencyBonus, 3);
  assert.equal(byName.Longsword.attackBonus, 6);
  assert.equal(byName.Handaxe.ability, "str");
  assert.equal(byName.Handaxe.attackBonus, 6, "handaxe: Strength +3, proficiency +3");
  assert.equal(byName.Dagger.ability, "str", "finesse picks the better of the two; Strength is higher here");
  assert.equal(byName.Shortbow.ability, "dex");
  assert.equal(byName.Shortbow.attackBonus, 4);
  assert.equal(byName.Greataxe, undefined, "unequipped weapons stay out of the attacks list");
  assert.equal(compiled.unequippedAttacks.find((attack) => attack.name === "Greataxe").attackBonus, 6);
});

test("each weapon row leads with to-hit and damage, directly under its name", async () => {
  const dto = makeDto();
  const { rows } = await render(SheetCompiler.compile(dto), dto);
  assert.match(line(rows.Longsword), /^\+6 to hit · 1d8 ?\+3 slashing \/ 1d10 ?\+3 slashing$/);
  assert.match(line(rows.Handaxe), /^\+6 to hit · 1d6 ?\+3 slashing$/);
  assert.match(line(rows.Shortbow), /^\+4 to hit · 1d6 ?\+1 piercing$/);
  const identity = rows.Longsword.querySelector(".player-sheet-item-row__identity");
  assert.equal(identity.children[1].dataset.attackLine, "true", "the line is the first thing after the title");
});

test("an unequipped weapon still shows what to add, marked as not equipped", async () => {
  const dto = makeDto();
  const { rows } = await render(SheetCompiler.compile(dto), dto);
  assert.match(line(rows.Greataxe), /^\+6 to hit · 1d12 ?\+3 slashing · not equipped$/);
});

test("rules are folded behind a Rules line and still complete when opened", async () => {
  const dto = makeDto();
  const { rows } = await render(SheetCompiler.compile(dto), dto);
  const details = rows.Longsword.querySelector(".player-sheet-item-card__rules--folded details");
  assert.ok(details, "rules are in a details element");
  assert.equal(details.open, false);
  assert.equal(details.querySelector("summary").textContent, "Rules");
  assert.match(details.textContent, /Versatile/);
  assert.equal(rows.Longsword.querySelector(".player-sheet-item-card__rules-preview"), null, "no rules preview above the fold");
});

test("Extra Attack is stated at the top, with the right count", async () => {
  const dto = makeDto();
  const compiled = SheetCompiler.compile(dto);
  let { tab } = await render(compiled, dto);
  const without = compiled.features.some((feature) => /^Extra Attack/.test(feature.name));
  assert.equal(Boolean(tab.querySelector("[data-extra-attack]")), without);

  const withExtra = { ...compiled, features: [...compiled.features.filter((f) => !/^Extra Attack/.test(f.name)), { name: "Extra Attack" }], classes: [{ name: "Fighter", level: 5 }] };
  ({ tab } = await render(withExtra, dto));
  assert.equal(tab.querySelector("[data-extra-attack]").textContent, "Extra Attack: 2 attacks when you take the Attack action.");
  assert.ok(tab.querySelector("[data-extra-attack]").compareDocumentPosition(tab.querySelector(".player-sheet-item-row")) & 4, "the note comes before the rows");

  ({ tab } = await render({ ...withExtra, classes: [{ name: "Fighter", level: 11 }] }, dto));
  assert.match(tab.querySelector("[data-extra-attack]").textContent, /3 attacks/);
  ({ tab } = await render({ ...withExtra, features: compiled.features.filter((f) => !/^Extra Attack/.test(f.name)) }, dto));
  assert.equal(tab.querySelector("[data-extra-attack]"), null);
});

test("a condition that blocks actions shows on the attack line", async () => {
  const dto = makeDto();
  dto.combatState.conditions = ["Stunned"];
  const { rows } = await render(SheetCompiler.compile(dto), dto);
  assert.equal(line(rows.Longsword), "Unavailable right now");
});
