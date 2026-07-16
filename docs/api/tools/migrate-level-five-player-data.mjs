import { EldoriaApiClient } from "../apiClient/index.js";

const DEFAULT_API_BASE_URL = "https://fn-eldoria-ahakafekhxczebhn.eastus-01.azurewebsites.net/api";

function readOptions(argv) {
  const options = { apiBaseUrl: DEFAULT_API_BASE_URL, apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--api-base-url" && argv[index + 1]) options.apiBaseUrl = argv[++index];
    else if (arg.startsWith("--api-base-url=")) options.apiBaseUrl = arg.slice("--api-base-url=".length);
  }
  return options;
}

function item(id, name, source, { equipped = false, attuned = false } = {}) {
  return {
    name,
    source,
    quantity: 1,
    equipped,
    attuned,
    catalog: { id, name, source, kind: "items", options: { catalogId: id } }
  };
}

function addMissingItems(sheet, additions) {
  const existing = new Set((sheet.inventory?.items || []).map((entry) => String(entry.name || "").toLowerCase()));
  return [...(sheet.inventory?.items || []), ...additions.filter((entry) => !existing.has(entry.name.toLowerCase()))];
}

function patchLevel(sheet, characterLevel, patch) {
  const levels = [...sheet.levels];
  const index = characterLevel - 1;
  levels[index] = { ...levels[index], ...patch };
  return levels;
}

function collectChangedPaths(before, after, path = "") {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (Array.isArray(before) || Array.isArray(after)) return [path || "<root>"];
  if (before && after && typeof before === "object" && typeof after === "object") {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...keys].flatMap((key) => collectChangedPaths(before[key], after[key], path ? `${path}.${key}` : key));
  }
  return [path || "<root>"];
}

const corrections = {
  "char-vanessa-001": (sheet) => ({
    ...sheet,
    baseChoices: {
      ...sheet.baseChoices,
      abilityScores: { ...sheet.baseChoices.abilityScores, str: 11, wis: 17, cha: 11 }
    },
    levels: patchLevel(sheet, 4, { AbilityScoreIncrease: [] }),
    combatState: { ...sheet.combatState, ac: 15, maxHp: 36, currentHp: 36 },
    inventory: {
      ...sheet.inventory,
      items: addMissingItems(sheet, [
        item("base-item:leather-armor:phb", "Leather Armor", "PHB", { equipped: true }),
        item("base-item:shield:phb", "Wooden Shield", "PHB", { equipped: true }),
        item("base-item:scimitar:phb", "Scimitar", "PHB", { equipped: true })
      ])
    },
    spells: {
      ...sheet.spells,
      prepared: ["Cure Wounds", "Ice Knife", "Barkskin", "Flame Blade", "Pass without Trace", "Call Lightning", "Plant Growth", "Water Breathing"]
    }
  }),
  "char-claire-001": (sheet) => ({
    ...sheet,
    baseChoices: {
      ...sheet.baseChoices,
      abilityScores: { str: 16, dex: 8, con: 14, int: 14, wis: 17, cha: 12 },
      startingProficiencies: {
        ...sheet.baseChoices.startingProficiencies,
        skills: ["insight", "medicine", "perception", "persuasion", "religion"]
      }
    },
    levels: patchLevel(sheet, 4, {
      AbilityScoreIncrease: [],
      feat: {
        id: "feat:elemental-adept:phb",
        name: "Elemental Adept",
        source: "PHB",
        kind: "feats",
        options: { ref: "feat-elemental-adept", catalogId: "feat:elemental-adept:phb" },
        choices: {}
      }
    }),
    combatState: { ...sheet.combatState, ac: 18 },
    spells: { ...sheet.spells, prepared: ["Guiding Bolt"] }
  }),
  "char-grum-ironjaw-001": (sheet) => ({
    ...sheet,
    baseChoices: {
      ...sheet.baseChoices,
      abilityScores: { ...sheet.baseChoices.abilityScores, dex: 14, cha: 11 }
    },
    levels: patchLevel(sheet, 4, { AbilityScoreIncrease: [] })
  }),
  "char-julie-001": (sheet) => ({
    ...sheet,
    baseChoices: {
      ...sheet.baseChoices,
      race: {
        ...sheet.baseChoices.race,
        id: "human-variant-phb",
        name: "Human",
        subrace: "Variant",
        options: { ...sheet.baseChoices.race.options, catalogId: "human-variant-phb", displayName: "Human (Variant)" }
      },
      abilityScores: { str: 17, dex: 14, con: 15, int: 6, wis: 11, cha: 11 }
    },
    levels: patchLevel(sheet, 4, { AbilityScoreIncrease: [] }),
    inventory: {
      ...sheet.inventory,
      items: addMissingItems(sheet, [item("item-sigil-of-thunderous-might", "Sigil of Thunderous Might", "Homebrew")])
    }
  }),
  "char-austin-001": (sheet) => {
    const hunterChoice = {
      type: "class-option",
      choiceId: "subclass-feature:ranger-hunter-hunters-prey-3:phb:options:0",
      featureId: "subclass-feature:ranger-hunter-hunters-prey-3:phb",
      featureName: "Hunter's Prey",
      label: "Hunter's Prey",
      sourceName: "Hunter's Prey",
      source: "PHB",
      count: 1,
      value: "Colossus Slayer|Ranger||Hunter||3",
      values: [{
        value: "Colossus Slayer|Ranger||Hunter||3",
        label: "Colossus Slayer",
        source: "PHB",
        recordId: "subclass-feature:ranger-hunter-colossus-slayer-3:phb"
      }]
    };
    const levelThree = sheet.levels[2];
    const choices = (levelThree.choices || []).some((choice) => choice.featureName === "Hunter's Prey")
      ? levelThree.choices
      : [...(levelThree.choices || []), hunterChoice];
    return {
      ...sheet,
      baseChoices: {
        ...sheet.baseChoices,
        abilityScores: { str: 16, dex: 17, con: 14, int: 12, wis: 14, cha: 12 },
        startingProficiencies: {
          ...sheet.baseChoices.startingProficiencies,
          tools: ["Artisan's Tools", "Vehicles (Land)"],
          languages: ["Goblin"]
        }
      },
      levels: patchLevel(sheet, 3, { choices }),
      combatState: {
        ...sheet.combatState,
        ac: 15,
        maxHp: 38,
        currentHp: 38,
        conditions: [...new Set([...(sheet.combatState.conditions || []), "Cursed: Cannot taste"])]
      },
      inventory: {
        ...sheet.inventory,
        items: addMissingItems(sheet, [
          item("base-item:shortsword:phb", "Shortsword", "PHB"),
          item("generated-item:1-longbow:dmg:longbow-phb", "+1 Longbow", "DMG", { equipped: true }),
          item("item-bracer-of-piercing-arrows", "Bracer of Piercing Arrows", "Homebrew", { equipped: true, attuned: true }),
          item("item-hat-of-vermin:xge", "Hat of Vermin", "XGE"),
          item("item-prospecting-compass", "Prospecting Compass", "Eldoria"),
          item("base-item:leather-armor:phb", "Leather Armor", "PHB", { equipped: true })
        ])
      },
      spells: { ...sheet.spells, known: ["Cure Wounds", "Ensnaring Strike", "Zephyr Strike"] }
    };
  },
  "char-liz-001": (sheet) => ({
    ...sheet,
    baseChoices: {
      ...sheet.baseChoices,
      startingProficiencies: {
        ...sheet.baseChoices.startingProficiencies,
        skills: ["perception", "insight", "religion", "acrobatics", "animalHandling", "arcana", "investigation", "performance", "persuasion"]
      }
    }
  }),
  "char-zazpoh-the-matyr-001": (sheet) => ({
    ...sheet,
    baseChoices: {
      ...sheet.baseChoices,
      startingProficiencies: {
        ...sheet.baseChoices.startingProficiencies,
        tools: ["Calligrapher's Supplies"]
      }
    },
    combatState: { ...sheet.combatState, ac: 15 },
    inventory: {
      ...sheet.inventory,
      items: addMissingItems(sheet, [
        item("item-the-aegis-codex", "The Aegis Codex", "Homebrew"),
        item("base-item:quarterstaff:phb", "Quarterstaff", "PHB", { equipped: true }),
        item("base-item:dagger:phb", "Dagger", "PHB"),
        item("item:calligrapher-s-supplies:phb", "Calligrapher's Supplies", "PHB"),
        item("item:scholar-s-pack:phb", "Scholar's Pack", "PHB"),
        item("item-group:arcane-focus:phb", "Arcane Focus (Staff)", "PHB", { equipped: true })
      ])
    }
  })
};

const ALLOWED_SOURCES = ["PHB", "XGE", "TCE", "SCAG", "EEPC", "ToA", "DMG", "Eldoria", "Homebrew"];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function hasNamedItem(sheet, name) {
  return (sheet.inventory?.items || []).some((entry) => String(entry.name || "").toLowerCase() === name.toLowerCase());
}

function validateCorrection(characterId, sheet) {
  requireValue(sheet.schemaVersion === "player-sheet-v2", `${characterId}: schema changed unexpectedly.`);
  requireValue(Number(sheet.identity?.experience) === 8000, `${characterId}: expected 8,000 XP.`);
  requireValue(sheet.levels?.length >= 5 && sheet.levels.slice(0, 5).every((level, index) => level?.characterLevel === index + 1), `${characterId}: expected the first five level records.`);
  requireValue(sheet.levels.every((level) => !(level?.feat && (level.AbilityScoreIncrease || []).length)), `${characterId}: feat and ASI cannot coexist at one level.`);
  requireValue(ALLOWED_SOURCES.every((source) => sheet.metadata?.sourcePolicy?.allowedSources?.includes(source)), `${characterId}: source policy is incomplete.`);

  if (characterId === "char-vanessa-001") {
    requireValue(sheet.baseChoices.abilityScores.str === 11 && sheet.baseChoices.abilityScores.wis === 17 && sheet.baseChoices.abilityScores.cha === 11, "Vanessa: pre-racial scores must preserve the legal historical totals.");
    requireValue(sheet.levels[3].feat?.name === "Lucky", "Vanessa: Lucky must remain the level-four choice.");
    requireValue(sheet.combatState.maxHp === 36 && sheet.combatState.currentHp === 36 && sheet.combatState.ac === 15, "Vanessa: HP/AC restoration failed.");
    requireValue(sheet.spells.prepared?.length === 8, "Vanessa: expected eight documented prepared spells.");
    requireValue(["Leather Armor", "Wooden Shield", "Scimitar"].every((name) => hasNamedItem(sheet, name)), "Vanessa: documented equipment restoration failed.");
  } else if (characterId === "char-claire-001") {
    requireValue(JSON.stringify(sheet.baseChoices.abilityScores) === JSON.stringify({ str: 16, dex: 8, con: 14, int: 14, wis: 17, cha: 12 }), "Claire: base scores are incorrect.");
    requireValue(sheet.levels[3].feat?.name === "Elemental Adept" && sheet.combatState.ac === 18, "Claire: feat or AC restoration failed.");
    requireValue(sheet.spells.prepared?.includes("Guiding Bolt"), "Claire: documented Guiding Bolt is missing.");
  } else if (characterId === "char-grum-ironjaw-001") {
    requireValue(sheet.baseChoices.abilityScores.dex === 14 && sheet.baseChoices.abilityScores.cha === 11, "Grum: legal Actor repair failed.");
    requireValue(sheet.levels[3].feat?.name === "Actor", "Grum: Actor must remain the level-four choice.");
  } else if (characterId === "char-julie-001") {
    requireValue(sheet.baseChoices.race.id === "human-variant-phb" && sheet.baseChoices.race.options?.catalogId === "human-variant-phb", "Julie: race must resolve as Variant Human.");
    requireValue(sheet.levels[3].feat?.name === "Great Weapon Master", "Julie: Great Weapon Master must remain the level-four choice.");
    requireValue(hasNamedItem(sheet, "Sigil of Thunderous Might"), "Julie: Sigil of Thunderous Might is missing.");
  } else if (characterId === "char-austin-001") {
    requireValue(sheet.combatState.maxHp === 38 && sheet.combatState.currentHp === 38 && sheet.combatState.ac === 15, "Austin: HP/AC restoration failed.");
    requireValue(sheet.levels[2].choices?.some((choice) => choice.value === "Colossus Slayer|Ranger||Hunter||3"), "Austin: Colossus Slayer is missing.");
    requireValue(["Cure Wounds", "Ensnaring Strike", "Zephyr Strike"].every((name) => sheet.spells.known?.includes(name)), "Austin: documented ranger spells are missing.");
    requireValue(hasNamedItem(sheet, "+1 Longbow") && hasNamedItem(sheet, "Bracer of Piercing Arrows"), "Austin: documented ranged equipment is missing.");
  } else if (characterId === "char-liz-001") {
    requireValue(sheet.baseChoices.startingProficiencies.skills?.length === 9, "Liz: expected nine legal level-five skill proficiencies.");
    requireValue(sheet.levels[3].AbilityScoreIncrease?.join(",") === "cha,cha", "Liz: level-four Charisma ASI changed unexpectedly.");
  } else if (characterId === "char-zazpoh-the-matyr-001") {
    requireValue(sheet.baseChoices.race.id === "aarakocra-eepc", "Zazpoh: intentional Aarakocra race must be preserved.");
    requireValue(sheet.combatState.ac === 15 && hasNamedItem(sheet, "The Aegis Codex"), "Zazpoh: documented AC or Aegis Codex is missing.");
  }
}

const options = readOptions(process.argv.slice(2));
const api = new EldoriaApiClient({ baseUrl: options.apiBaseUrl });

console.log(`${options.apply ? "Applying" : "Dry run for"} level-five player corrections.`);
for (const [characterId, correct] of Object.entries(corrections)) {
  const current = await api.getCharacterSheet(characterId);
  if (current.schemaVersion !== "player-sheet-v2" || Number(current.identity?.experience) !== 8000) {
    throw new Error(`${characterId} is not the expected level-five player-sheet-v2 record.`);
  }
  const corrected = correct(current);
  const next = {
    ...corrected,
    metadata: {
      ...corrected.metadata,
      sourcePolicy: {
        ...corrected.metadata?.sourcePolicy,
        ruleset: "2014",
        allowedSources: ALLOWED_SOURCES
      }
    }
  };
  validateCorrection(characterId, next);
  const changedPaths = collectChangedPaths(current, next);
  console.log(`- ${characterId}: ${changedPaths.length ? "update required" : "unchanged"}`);
  if (changedPaths.length) console.log(`  ${changedPaths.join("\n  ")}`);
  if (options.apply) {
    await api.saveCharacterSheet(characterId, next);
    const saved = await api.getCharacterSheet(characterId);
    validateCorrection(characterId, saved);
    console.log("  verified after save");
  }
}

console.log(options.apply ? "Live character corrections applied." : "No cloud data changed. Re-run with --apply after reviewing the dry run.");
