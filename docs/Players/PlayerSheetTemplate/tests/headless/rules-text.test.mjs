// Item 7: the sheet never prints its own internals.
import test from "node:test";
import assert from "node:assert/strict";
import { loadSheetFixtures } from "./fixtures.mjs";

const fx = await loadSheetFixtures();
const {
  cleanRulesText, flattenRulesText, toDisplayRulesText,
  formatAttunementText, formatSourceLabel, isHealingSpell
} = await import("../../RulesText.js");
const { appendRulesEntry } = await import("../../PlayerSheetHtmlHelper.js");
const { getItemDetailRows, createItemCard } = await import("../../PlayerSheetJavaScript/PlayerSheetTabHelpers.js");
const { createSpellCard } = await import("../../PlayerSheetJavaScript/PlayerSheetSpellsTabBuilder.js");
const { BuildPlayerSheetSkillsTab } = await import("../../PlayerSheetJavaScript/PlayerSheetSkillsTabBuilder.js");
const { SheetCompiler } = await import("../../SheetCompiler.js");

const FINESSE = { type: "entries", name: "Finesse", entries: ["Use {@b Strength} or Dexterity. See {@item Longsword|PHB}."] };

test("tags are removed and the readable part kept", () => {
  assert.equal(cleanRulesText("Deals {@damage 1d8} to a {@creature goblin|MM}."), "Deals 1d8 to a goblin.");
  assert.equal(cleanRulesText(null), "");
});

test("display text leaves out structural keys and reads names as headings", () => {
  const text = toDisplayRulesText(FINESSE);
  assert.equal(text, "Finesse. Use Strength or Dexterity. See Longsword.");
  assert.doesNotMatch(text, /^entries/);
  assert.doesNotMatch(toDisplayRulesText({ type: "list", style: "list-hang", items: ["One", { type: "item", name: "Two", entry: "second" }] }), /list|item\b/);
  assert.equal(toDisplayRulesText({ reqAttune: true, name: "Ring" }), "Ring");
});

test("search text still includes every value", () => {
  assert.match(flattenRulesText(FINESSE), /^entries Finesse/);
});

test("attunement and source labels read as words", () => {
  assert.equal(formatAttunementText(true), "Required");
  assert.equal(formatAttunementText("true"), "Required");
  assert.equal(formatAttunementText("by a {@class wizard}"), "Required by a wizard");
  assert.equal(formatAttunementText(false), "");
  assert.equal(formatSourceLabel("baseChoices"), "Starting choices");
  assert.equal(formatSourceLabel("", "Character"), "Character");
  assert.equal(formatSourceLabel("Soldier"), "Soldier");
});

test("an item that requires attunement shows 'Required', never 'true'", () => {
  const rows = getItemDetailRows({ name: "Talisman" }, { name: "Talisman", reqAttune: true });
  assert.deepEqual(rows.find(([label]) => label === "Attunement"), ["Attunement", "Required"]);
});

test("item rules preview shows no raw type names, tags or JSON", () => {
  const card = createItemCard({ name: "Rapier" }, { name: "Rapier", weapon: true, dmg1: "1d8", dmgType: "P", entries: [FINESSE] });
  const text = card.textContent;
  assert.match(text, /Finesse.? ?Use Strength or Dexterity. See Longsword./);
  assert.doesNotMatch(text, /entries Finesse|\{@|"type"/);
});

test("an unknown rules object is shown as words, not JSON", () => {
  const box = document.createElement("div");
  appendRulesEntry(box, [{ type: "mystery", text: "Glows {@i faintly}." }, { type: "table", rows: [[{ type: "cell", roll: { exact: 3 }, text: "Three" }]] }]);
  assert.match(box.textContent, /Glows faintly\./);
  assert.doesNotMatch(box.textContent, /[{}"]|mystery|cell/);
});

test("healing spells are labelled Healing, damage spells Damage", () => {
  const cure = { name: "Cure Wounds", level: 1, entries: ["A creature you touch regains a number of hit points equal to {@dice 1d8} + your spellcasting ability modifier."], damageInflict: [], miscTags: ["HL"] };
  const bolt = { name: "Fire Bolt", level: 0, entries: ["On a hit, the target takes {@damage 1d10} fire damage."], damageInflict: ["fire"] };
  assert.equal(isHealingSpell(cure), true);
  assert.equal(isHealingSpell({ ...cure, miscTags: [] }), true, "falls back to the rules wording");
  assert.equal(isHealingSpell(bolt), false);

  const entry = (spell) => ({ spell: { name: spell.name }, record: spell, listKey: "known", index: 0, sourceLabel: "Known", spellcasting: {}, characterLevel: 1, fallbackLevel: spell.level });
  const cureText = createSpellCard(entry(cure), cure).textContent;
  assert.match(cureText, /Healing\s*1d8/);
  assert.doesNotMatch(cureText, /Damage/);
  assert.match(createSpellCard(entry(bolt), bolt).textContent, /Damage\s*1d10/);
});

test("skills tab says where a proficiency came from in plain words", async () => {
  const dto = fx.createDto();
  fx.mountTab();
  await BuildPlayerSheetSkillsTab(SheetCompiler.compile(dto), { api: fx.createFakeApi(), dto });
  assert.doesNotMatch(document.querySelector("#TabContent").textContent, /baseChoices/);
});
