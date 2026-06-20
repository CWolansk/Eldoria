import { PlayerSheetDtoHelper } from "../PlayerSheetDtoHelper.js";
import {
  applyResolvedReferencesToDto,
  resolvePlayerSheetReferences
} from "../ReferenceResolver.js";
import { SheetCompiler } from "../SheetCompiler.js";
import { createStructuredOptionCoverage } from "../StructuredOptionCoverage.js";
import { BuildPlayerSheetDefenseTab } from "../PlayerSheetJavaScript/PlayerSheetDefenseTabBuilder.js";
import { BuildPlayerSheetFeatsTab } from "../PlayerSheetJavaScript/PlayerSheetFeatsTabBuilder.js";
import { buildItemSearchModal } from "../PlayerSheetJavaScript/PlayerSheetGearTabBuilder.js";
import { BuildPlayerSheetHeader } from "../PlayerSheetJavaScript/PlayerSheetHeaderBuilder.js";
import {
  BuildPlayerSheetNotesTab,
  sanitizeNotesHtml
} from "../PlayerSheetJavaScript/PlayerSheetNotesTabBuilder.js";
import { BuildPlayerSheetReferenceTab } from "../PlayerSheetJavaScript/PlayerSheetReferenceTabBuilder.js";
import {
  BuildPlayerSheetSpellsTab,
  buildSpellSearchModal
} from "../PlayerSheetJavaScript/PlayerSheetSpellsTabBuilder.js";
import {
  buildClassOptionContent,
  buildClassOptionModel
} from "../LevelEditorJavaScript/Progression/LevelEditorClassOptionBuilder.js";
import {
  buildBackgroundChoiceContent,
  buildBackgroundChoiceModel,
  buildBackgroundChoiceStatus
} from "../LevelEditorJavaScript/Background/LevelEditorBackgroundChoiceBuilder.js";
import {
  buildToolPickerContent
} from "../LevelEditorJavaScript/StartingChoices/LevelEditorToolBuilder.js";
import {
  getDefinedChoices
} from "../LevelEditorJavaScript/CatalogProfile/Choices.js";
import {
  bootLevelEditor
} from "../LevelEditorJavaScript/Core/LevelEditorBuilder.js";
import { CatalogCache } from "../CatalogCache.js";
import {
  createEquipToggle,
  createItemListItem
} from "../PlayerSheetJavaScript/PlayerSheetTabHelpers.js";

const results = document.querySelector("#test-results");
const summary = document.querySelector("#test-summary");
const fixture = document.querySelector("#test-fixture");
const TEST_PORTRAIT_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'%3E%3Crect width='4' height='5' fill='%23121b25'/%3E%3C/svg%3E";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function assertIncludes(values, expected, message) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(`${message} Expected ${JSON.stringify(values)} to include ${JSON.stringify(expected)}.`);
  }
}

function waitForMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function renderLevelEditorForCoverageFlag(showStructuredOptionCoverage) {
  const dto = createDto();
  const compiled = SheetCompiler.compile(dto);
  fixture.innerHTML = [
    "<div id=\"characterNameDiv\"></div>",
    "<div id=\"playerNameDiv\"></div>",
    "<div id=\"raceDiv\"></div>",
    "<div id=\"backgroundDiv\"></div>",
    "<div id=\"abilityScoreDiv\"></div>",
    "<div id=\"level-editor-base-body\"></div>"
  ].join("");

  bootLevelEditor({
    dto,
    compiled,
    api: createFakeApi(),
    showStructuredOptionCoverage,
    onChange() {}
  });

  return fixture.querySelector("#level-editor-base-body-base-structured-coverage");
}

async function waitForCondition(predicate, message, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) {
      return;
    }
    await waitForMicrotasks();
  }
  throw new Error(message);
}

function report(name, status, error = null) {
  const row = document.createElement("article");
  row.className = "test-result";
  row.dataset.status = status;
  row.append(`${status === "pass" ? "PASS" : "FAIL"}: ${name}`);
  if (error) {
    const detail = document.createElement("pre");
    detail.textContent = error.stack || error.message || String(error);
    row.appendChild(detail);
  }
  results.appendChild(row);
}

function createDto() {
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-test-001",
    identity: {
      name: "Test Hero",
      playerName: "Tester",
      experience: 6500,
      portraitUrl: TEST_PORTRAIT_URL
    },
    baseChoices: {
      race: {
        id: "race:dragonborn:phb",
        name: "Dragonborn",
        source: "PHB",
        kind: "races",
        profile: {
          defenses: {
            resistances: { fixed: ["fire"] }
          }
        }
      },
      background: {
        id: "background:soldier:phb",
        name: "Soldier",
        source: "PHB",
        kind: "backgrounds",
        grants: {
          feats: {
            choices: [{ type: "feat", from: ["tough"], count: 1 }]
          }
        }
      },
      abilityScores: {
        str: 16,
        dex: 12,
        con: 14,
        int: 10,
        wis: 11,
        cha: 9
      }
    },
    levels: [
      {
        characterLevel: 1,
        class: {
          id: "class:fighter:phb",
          name: "Fighter",
          source: "PHB",
          kind: "classes",
          classLevel: 1,
          hitDie: 10,
          startingProficiencies: {
            skills: {
              choices: [{ type: "skill", from: ["athletics", "survival"], count: 1 }]
            }
          },
          profile: {
            choices: {
              all: [
                { type: "class-option", label: "Fighting Style", count: 1 },
                { type: "mystery-option", label: "Unknown Structured Choice", count: 1 }
              ]
            }
          }
        },
        hp: 12,
        choices: []
      }
    ],
    combatState: {
      currentHp: 12,
      tempHp: 3,
      defenses: {
        damageResistances: ["cold"],
        damageImmunities: [],
        damageVulnerabilities: ["radiant"],
        conditionImmunities: ["poisoned"]
      }
    },
    inventory: {
      items: [
        {
          name: "Test Blade",
          quantity: 1,
          equipped: true,
          catalog: {
            id: "item:test-blade:homebrew",
            name: "Test Blade",
            source: "Homebrew",
            kind: "items"
          },
          snapshot: {
            name: "Test Blade",
            weapon: true,
            dmg1: "1d8",
            dmgType: "S",
            _fImm: ["poison"]
          }
        },
        {
          name: "Test Shield",
          quantity: 1,
          equipped: true,
          catalog: {
            id: "item:test-shield:homebrew",
            name: "Test Shield",
            source: "Homebrew",
            kind: "items"
          },
          snapshot: {
            name: "Test Shield",
            type: "shield",
            armor: true,
            ac: 2
          }
        }
      ]
    }
  });
}

function createSoldierBackgroundFeatureDto(options = {}) {
  const dto = createDto();
  dto.baseChoices.background = {
    id: "background:soldier:phb",
    name: "Soldier",
    source: "PHB",
    kind: "backgrounds",
    feature: "Military Rank",
    ...(options.withProfile !== false
      ? {
          profile: {
            background: {
              feature: "Military Rank",
              featureRules: {
                name: "Feature: Military Rank",
                type: "entries",
                entries: [
                  "You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence."
                ],
                data: { isFeature: true }
              }
            }
          }
        }
      : {})
  };
  return PlayerSheetDtoHelper.normalize(dto);
}

function createMonkDto(options = {}) {
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-monk-test-001",
    identity: {
      name: "Monk Test",
      playerName: "Tester",
      experience: 6500
    },
    baseChoices: {
      race: {
        id: "race:half-orc:phb",
        name: "Half-Orc",
        source: "PHB",
        kind: "races",
        speed: 30
      },
      abilityScores: {
        str: 12,
        dex: 14,
        con: 12,
        int: 10,
        wis: 16,
        cha: 10
      }
    },
    levels: [
      {
        characterLevel: 1,
        class: {
          id: "class:monk:phb",
          name: "Monk",
          source: "PHB",
          kind: "classes",
          classLevel: 1,
          hitDie: 8,
          savingThrows: ["str", "dex"]
        },
        hp: 8,
        choices: []
      }
    ],
    combatState: {
      currentHp: 8
    },
    inventory: {
      items: options.shield
        ? [{
            name: "Shield",
            quantity: 1,
            equipped: true,
            snapshot: {
              name: "Shield",
              type: "shield",
              armor: true,
              ac: 2
            }
          }]
        : []
    }
  });
}

// Mirrors the normalized catalog shape (docs/data/classes.json):
// Monk classFeatures carry level + optional flags, with the four Tasha's optional
// features (optional:true) listed inline alongside the mandatory ones.
const MONK_CLASS_FEATURES = [
  { id: "class-feature:monk-unarmored-defense-1:phb", name: "Unarmored Defense", source: "PHB", level: 1, optional: false },
  { id: "class-feature:monk-martial-arts-1:phb", name: "Martial Arts", source: "PHB", level: 1, optional: false },
  { id: "class-feature:monk-ki-2:phb", name: "Ki", source: "PHB", level: 2, optional: false },
  { id: "class-feature:monk-dedicated-weapon-2:tce", name: "Dedicated Weapon", source: "TCE", level: 2, optional: true },
  { id: "class-feature:monk-unarmored-movement-2:phb", name: "Unarmored Movement", source: "PHB", level: 2, optional: false },
  { id: "class-feature:monk-deflect-missiles-3:phb", name: "Deflect Missiles", source: "PHB", level: 3, optional: false },
  { id: "class-feature:monk-monastic-tradition-3:phb", name: "Monastic Tradition", source: "PHB", level: 3, optional: false },
  { id: "class-feature:monk-ki-fueled-attack-3:tce", name: "Ki-Fueled Attack", source: "TCE", level: 3, optional: true },
  { id: "class-feature:monk-ability-score-improvement-4:phb", name: "Ability Score Improvement", source: "PHB", level: 4, optional: false },
  { id: "class-feature:monk-slow-fall-4:phb", name: "Slow Fall", source: "PHB", level: 4, optional: false },
  { id: "class-feature:monk-quickened-healing-4:tce", name: "Quickened Healing", source: "TCE", level: 4, optional: true },
  { id: "class-feature:monk-extra-attack-5:phb", name: "Extra Attack", source: "PHB", level: 5, optional: false },
  { id: "class-feature:monk-stunning-strike-5:phb", name: "Stunning Strike", source: "PHB", level: 5, optional: false },
  { id: "class-feature:monk-focused-aim-5:tce", name: "Focused Aim", source: "TCE", level: 5, optional: true }
];

function resourceDie(faces) {
  return {
    type: "dice",
    toRoll: [{ number: 1, faces }],
    rollable: true
  };
}

function resourceSpeed(value) {
  return {
    type: "bonusSpeed",
    value
  };
}

function resourceBonus(value) {
  return {
    type: "bonus",
    value
  };
}

function cloneResourceTableGroups(groups) {
  return JSON.parse(JSON.stringify(groups));
}

const MONK_CLASS_TABLE_GROUPS = [{
  colLabels: ["Martial Arts", "Ki Points", "Unarmored Movement"],
  rows: [
    [resourceDie(4), 0, resourceSpeed(0)],
    [resourceDie(4), 2, resourceSpeed(10)],
    [resourceDie(4), 3, resourceSpeed(10)],
    [resourceDie(4), 4, resourceSpeed(10)],
    [resourceDie(6), 5, resourceSpeed(10)],
    [resourceDie(6), 6, resourceSpeed(15)],
    [resourceDie(6), 7, resourceSpeed(15)],
    [resourceDie(6), 8, resourceSpeed(15)],
    [resourceDie(6), 9, resourceSpeed(15)],
    [resourceDie(6), 10, resourceSpeed(20)],
    [resourceDie(8), 11, resourceSpeed(20)],
    [resourceDie(8), 12, resourceSpeed(20)],
    [resourceDie(8), 13, resourceSpeed(20)],
    [resourceDie(8), 14, resourceSpeed(25)],
    [resourceDie(8), 15, resourceSpeed(25)],
    [resourceDie(8), 16, resourceSpeed(25)],
    [resourceDie(10), 17, resourceSpeed(25)],
    [resourceDie(10), 18, resourceSpeed(30)],
    [resourceDie(10), 19, resourceSpeed(30)],
    [resourceDie(10), 20, resourceSpeed(30)]
  ]
}];

const BARBARIAN_CLASS_TABLE_GROUPS = [{
  colLabels: ["Rages", "Rage Damage"],
  rows: [
    ["2", resourceBonus(2)],
    ["2", resourceBonus(2)],
    ["3", resourceBonus(2)],
    ["3", resourceBonus(2)],
    ["3", resourceBonus(2)],
    ["4", resourceBonus(2)],
    ["4", resourceBonus(2)],
    ["4", resourceBonus(2)],
    ["4", resourceBonus(3)],
    ["4", resourceBonus(3)],
    ["4", resourceBonus(3)],
    ["5", resourceBonus(3)],
    ["5", resourceBonus(3)],
    ["5", resourceBonus(3)],
    ["5", resourceBonus(3)],
    ["5", resourceBonus(4)],
    ["6", resourceBonus(4)],
    ["6", resourceBonus(4)],
    ["6", resourceBonus(4)],
    ["Unlimited", resourceBonus(4)]
  ]
}];

function monkClassForLevel(classLevel) {
  return {
    id: "class:monk:phb",
    name: "Monk",
    source: "PHB",
    kind: "classes",
    classLevel,
    hitDie: 8,
    savingThrows: ["str", "dex"],
    startingProficiencies: {
      weapons: {
        fixed: ["simple", "shortsword"]
      },
      tools: {
        fixed: ["any one type of artisan's tools or any one musical instrument of your choice"]
      }
    },
    profile: {
      class: {
        progression: {
          classTableGroups: cloneResourceTableGroups(MONK_CLASS_TABLE_GROUPS)
        }
      },
      features: {
        classFeatures: MONK_CLASS_FEATURES.map((feature) => ({ ...feature }))
      }
    }
  };
}

// optInsByLevelIndex: { [zeroBasedLevelIndex]: [featureRecord, ...] } simulates the
// level editor recording an opt-in into that level's stored features.
function createMonkLevelFiveDto(optInsByLevelIndex = {}) {
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-monk-five-001",
    identity: {
      name: "Grum Test",
      playerName: "Tester",
      experience: 6500
    },
    baseChoices: {
      race: {
        id: "race:half-orc:phb",
        name: "Half-Orc",
        source: "PHB",
        kind: "races",
        speed: 30
      },
      abilityScores: {
        str: 12,
        dex: 14,
        con: 12,
        int: 10,
        wis: 16,
        cha: 10
      }
    },
    levels: [1, 2, 3, 4, 5].map((classLevel) => ({
      characterLevel: classLevel,
      class: monkClassForLevel(classLevel),
      hp: 8,
      choices: [],
      features: optInsByLevelIndex[classLevel - 1] || []
    })),
    combatState: {
      currentHp: 30
    }
  });
}

function barbarianClassForLevel(classLevel) {
  return {
    id: "class:barbarian:phb",
    name: "Barbarian",
    source: "PHB",
    kind: "classes",
    classLevel,
    hitDie: 12,
    savingThrows: ["str", "con"],
    profile: {
      class: {
        progression: {
          classTableGroups: cloneResourceTableGroups(BARBARIAN_CLASS_TABLE_GROUPS)
        }
      }
    }
  };
}

function createBarbarianLevelFiveDto() {
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-barbarian-five-001",
    identity: {
      name: "Barbarian Test",
      playerName: "Tester",
      experience: 6500
    },
    baseChoices: {
      race: {
        id: "race:human:phb",
        name: "Human",
        source: "PHB",
        kind: "races",
        speed: 30
      },
      abilityScores: {
        str: 16,
        dex: 12,
        con: 14,
        int: 8,
        wis: 10,
        cha: 10
      }
    },
    levels: [1, 2, 3, 4, 5].map((classLevel) => ({
      characterLevel: classLevel,
      class: barbarianClassForLevel(classLevel),
      hp: 12,
      choices: []
    })),
    combatState: {
      currentHp: 60
    }
  });
}

function compiledFeatureNames(compiled) {
  return compiled.features.map((feature) => feature.name);
}

function createRangerDto(experience = 6500) {
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-ranger-test-001",
    identity: {
      name: "Ranger Test",
      playerName: "Tester",
      experience
    },
    baseChoices: {
      race: {
        id: "race:human:phb",
        name: "Human",
        source: "PHB",
        kind: "races",
        speed: 30
      },
      abilityScores: {
        str: 10,
        dex: 14,
        con: 12,
        int: 10,
        wis: 14,
        cha: 10
      }
    },
    levels: [
      {
        characterLevel: 1,
        class: {
          id: "class:ranger:phb",
          name: "Ranger",
          source: "PHB",
          kind: "classes",
          classLevel: 1,
          hitDie: 10,
          savingThrows: ["str", "dex"]
        },
        hp: 10,
        choices: []
      }
    ],
    combatState: {
      currentHp: 10
    }
  });
}

function createRangerHunterDto() {
  const rangerClass = (classLevel) => ({
    id: "class:ranger:phb",
    name: "Ranger",
    source: "PHB",
    kind: "classes",
    classLevel,
    hitDie: 10,
    savingThrows: ["str", "dex"]
  });
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-ranger-hunter-test-001",
    identity: {
      name: "Hunter Test",
      playerName: "Tester",
      experience: 900
    },
    baseChoices: {
      race: {
        id: "race:human:phb",
        name: "Human",
        source: "PHB",
        kind: "races",
        speed: 30
      },
      abilityScores: {
        str: 10,
        dex: 14,
        con: 12,
        int: 10,
        wis: 14,
        cha: 10
      }
    },
    levels: [1, 2, 3].map((classLevel) => ({
      characterLevel: classLevel,
      class: rangerClass(classLevel),
      subclass: classLevel === 3
        ? {
            id: "subclass:ranger-hunter:phb",
            name: "Hunter",
            shortName: "Hunter",
            source: "PHB",
            kind: "subclasses",
            className: "Ranger",
            classId: "class:ranger:phb",
            unlockAtClassLevel: 3
          }
        : null,
      hp: 8,
      choices: []
    })),
    combatState: {
      currentHp: 24
    }
  });
}

function createHermitDto() {
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-hermit-test-001",
    identity: {
      name: "Hermit Test",
      playerName: "Tester",
      experience: 0
    },
    baseChoices: {
      race: {
        id: "race:human:phb",
        name: "Human",
        source: "PHB",
        kind: "races",
        speed: 30
      },
      background: {
        id: "background:hermit:phb",
        name: "Hermit",
        source: "PHB",
        kind: "backgrounds"
      },
      abilityScores: {
        str: 10,
        dex: 12,
        con: 12,
        int: 10,
        wis: 14,
        cha: 10
      }
    },
    levels: [{
      characterLevel: 1,
      class: {
        id: "class:fighter:phb",
        name: "Fighter",
        source: "PHB",
        kind: "classes",
        classLevel: 1,
        hitDie: 10
      },
      hp: 10,
      choices: []
    }],
    combatState: {
      currentHp: 10
    }
  });
}

function bardClassForLevel(classLevel) {
  return {
    id: "class:bard:phb",
    name: "Bard",
    source: "PHB",
    kind: "classes",
    classLevel,
    hitDie: 8,
    savingThrows: ["dex", "cha"],
    spellcasting: {
      ability: "cha",
      startLevel: 1,
      casterProgression: "full",
      progression: {
        spellsKnownProgression: [4, 5, 6, 7, 8, 9],
        cantripProgression: [2, 2, 2, 3, 3, 3]
      }
    }
  };
}

function createLoreBardDto() {
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-lore-bard-test-001",
    identity: {
      name: "Lore Bard Test",
      playerName: "Tester",
      experience: 14000
    },
    baseChoices: {
      race: {
        id: "race:human:phb",
        name: "Human",
        source: "PHB",
        kind: "races",
        speed: 30
      },
      abilityScores: {
        str: 8,
        dex: 14,
        con: 12,
        int: 10,
        wis: 10,
        cha: 16
      }
    },
    levels: [1, 2, 3, 4, 5, 6].map((classLevel) => ({
      characterLevel: classLevel,
      class: bardClassForLevel(classLevel),
      subclass: classLevel === 3
        ? {
            id: "subclass:bard-lore:phb",
            name: "College of Lore",
            shortName: "Lore",
            source: "PHB",
            kind: "subclasses",
            className: "Bard",
            classId: "class:bard:phb",
            unlockAtClassLevel: 3
          }
        : null,
      hp: 7,
      choices: []
    })),
    combatState: {
      currentHp: 36
    }
  });
}

function druidClassForLevel(classLevel) {
  return {
    id: "class:druid:phb",
    name: "Druid",
    source: "PHB",
    kind: "classes",
    classLevel,
    hitDie: 8,
    savingThrows: ["int", "wis"],
    spellcasting: {
      ability: "wis",
      startLevel: 1,
      casterProgression: "full",
      preparedSpells: "wis+level",
      progression: {
        cantripProgression: [2, 2, 2, 3, 3],
        rowsSpellProgression: [
          [2],
          [3],
          [4, 2],
          [4, 3],
          [4, 3, 2]
        ]
      }
    }
  };
}

function createLandDruidDto() {
  return PlayerSheetDtoHelper.normalize({
    schemaVersion: "player-sheet-v2",
    id: "char-land-druid-test-001",
    identity: {
      name: "Land Druid Test",
      playerName: "Tester",
      experience: 6500
    },
    baseChoices: {
      race: {
        id: "race:human:phb",
        name: "Human",
        source: "PHB",
        kind: "races",
        speed: 30
      },
      abilityScores: {
        str: 8,
        dex: 12,
        con: 14,
        int: 10,
        wis: 16,
        cha: 10
      }
    },
    levels: [1, 2, 3, 4, 5].map((classLevel) => ({
      characterLevel: classLevel,
      class: druidClassForLevel(classLevel),
      subclass: classLevel === 2
        ? {
            id: "subclass:druid-land:phb",
            name: "Circle of the Land",
            shortName: "Land",
            source: "PHB",
            kind: "subclasses",
            className: "Druid",
            classId: "class:druid:phb",
            unlockAtClassLevel: 2
          }
        : null,
      hp: 7,
      choices: []
    })),
    combatState: {
      currentHp: 35
    }
  });
}

function getDruidSpellSourceLookup() {
  return {
    phb: {
      druidcraft: { class: { phb: { Druid: true } } },
      "produce flame": { class: { phb: { Druid: true } } },
      "sacred flame": { class: { phb: { Cleric: true } } }
    }
  };
}

function createFakeApi() {
  const calls = [];
  const records = {
    classes: {
      "class:fighter:phb": {
        id: "class:fighter:phb",
        name: "Fighter",
        source: "PHB",
        hitDie: 10,
        savingThrows: ["str", "con"],
        startingProficiencies: {
          skills: {
            choices: [{ type: "skill", from: ["athletics", "survival"], count: 1 }]
          }
        },
        choices: [{ type: "class-option", label: "Fighting Style", count: 1 }]
      },
      "class:cache-test:homebrew": {
        id: "class:cache-test:homebrew",
        name: "Cache Test",
        source: "Homebrew",
        hitDie: 8,
        savingThrows: ["dex", "wis"]
      },
      "class:monk:phb": {
        id: "class:monk:phb",
        name: "Monk",
        source: "PHB",
        hitDie: 8,
        savingThrows: ["str", "dex"],
        startingProficiencies: {
          weapons: {
            fixed: ["simple", "shortsword"]
          },
          tools: {
            fixed: ["any one type of artisan's tools or any one musical instrument of your choice"]
          }
        },
        progression: {
          classTableGroups: cloneResourceTableGroups(MONK_CLASS_TABLE_GROUPS)
        },
        classFeatures: MONK_CLASS_FEATURES.map((feature) => ({ ...feature }))
      },
      "class:bard:phb": {
        id: "class:bard:phb",
        name: "Bard",
        source: "PHB",
        hitDie: 8,
        savingThrows: ["dex", "cha"],
        spellcasting: {
          ability: "cha",
          startLevel: 1,
          casterProgression: "full",
          progression: {
            spellsKnownProgression: [4, 5, 6, 7, 8, 9],
            cantripProgression: [2, 2, 2, 3, 3, 3]
          }
        }
      },
      "class:druid:phb": {
        id: "class:druid:phb",
        name: "Druid",
        source: "PHB",
        hitDie: 8,
        savingThrows: ["int", "wis"],
        spellcasting: {
          ability: "wis",
          startLevel: 1,
          casterProgression: "full",
          preparedSpells: "wis+level",
          progression: {
            cantripProgression: [2, 2, 2, 3, 3],
            rowsSpellProgression: [
              [2],
              [3],
              [4, 2],
              [4, 3],
              [4, 3, 2]
            ]
          }
        }
      }
    },
    "class-features": {
      "class-feature:monk-dedicated-weapon-2:tce": {
        id: "class-feature:monk-dedicated-weapon-2:tce",
        ref: "class-feature-monk-2-dedicated-weapon.json",
        kind: "classFeature",
        name: "Dedicated Weapon",
        source: "TCE",
        className: "Monk",
        classSource: "PHB",
        level: 2,
        optional: true,
        entries: [
          "You train yourself to use a variety of weapons as monk weapons.",
          "The chosen weapon must be a simple or martial weapon, you must be proficient with it, and it must lack the heavy and special properties."
        ]
      }
    },
    subclasses: {
      "subclass:ranger-hunter:phb": {
        id: "subclass:ranger-hunter:phb",
        name: "Hunter",
        shortName: "Hunter",
        source: "PHB",
        kind: "subclass",
        className: "Ranger",
        classId: "class:ranger:phb",
        unlockAtClassLevel: 3,
        subclassFeatures: [{
          id: "subclass-feature:ranger-hunter-hunters-prey-3:phb",
          name: "Hunter's Prey",
          source: "PHB",
          level: 3
        }]
      },
      "subclass:bard-lore:phb": {
        id: "subclass:bard-lore:phb",
        name: "College of Lore",
        shortName: "Lore",
        source: "PHB",
        kind: "subclass",
        className: "Bard",
        classId: "class:bard:phb",
        unlockAtClassLevel: 3,
        grants: {
          spells: [
            {
              type: "choice",
              mode: "known",
              choose: "level=0;1;2;3",
              filter: "level=0;1;2;3",
              count: 1,
              unlockAtLevel: 6,
              group: "Additional Magical Secrets"
            },
            {
              type: "choice",
              mode: "known",
              choose: "level=0;1;2;3",
              filter: "level=0;1;2;3",
              count: 1,
              unlockAtLevel: 6,
              group: "Additional Magical Secrets"
            }
          ]
        }
      },
      "subclass:druid-land:phb": {
        id: "subclass:druid-land:phb",
        name: "Circle of the Land",
        shortName: "Land",
        source: "PHB",
        kind: "subclass",
        className: "Druid",
        classId: "class:druid:phb",
        unlockAtClassLevel: 2,
        grants: {
          spells: [
            {
              type: "choice",
              mode: "known",
              choose: "level=0|class=Druid",
              filter: "level=0|class=Druid",
              count: 1,
              unlockAtLevel: 1,
              group: "Arctic"
            },
            {
              type: "choice",
              mode: "known",
              choose: "level=0|class=Druid",
              filter: "level=0|class=Druid",
              count: 1,
              unlockAtLevel: 1,
              group: "Coast"
            },
            { type: "spell", mode: "prepared", id: "spell:hold-person:phb", name: "Hold Person", source: "PHB", level: 2, unlockAtLevel: 3, group: "Arctic" },
            { type: "spell", mode: "prepared", id: "spell:spike-growth:phb", name: "Spike Growth", source: "PHB", level: 2, unlockAtLevel: 3, group: "Arctic" },
            { type: "spell", mode: "prepared", id: "spell:mirror-image:phb", name: "Mirror Image", source: "PHB", level: 2, unlockAtLevel: 3, group: "Coast" },
            { type: "spell", mode: "prepared", id: "spell:misty-step:phb", name: "Misty Step", source: "PHB", level: 2, unlockAtLevel: 3, group: "Coast" }
          ]
        }
      }
    },
    "subclass-features": {
      "subclass-feature:ranger-hunter-hunters-prey-3:phb": {
        id: "subclass-feature:ranger-hunter-hunters-prey-3:phb",
        kind: "subclassFeature",
        name: "Hunter's Prey",
        source: "PHB",
        className: "Ranger",
        subclassShortName: "Hunter",
        level: 3,
        entries: [{
          type: "options",
          count: 1,
          entries: [
            { type: "refSubclassFeature", subclassFeature: "Colossus Slayer|Ranger||Hunter||3" },
            { type: "refSubclassFeature", subclassFeature: "Giant Killer|Ranger||Hunter||3" },
            { type: "refSubclassFeature", subclassFeature: "Horde Breaker|Ranger||Hunter||3" }
          ]
        }]
      }
    },
    races: {
      "race:dragonborn:phb": {
        id: "race:dragonborn:phb",
        name: "Dragonborn",
        source: "PHB",
        resist: ["fire"],
        size: ["M"],
        speed: 30
      }
    },
    backgrounds: {
      "background:soldier:phb": {
        id: "background:soldier:phb",
        name: "Soldier",
        source: "PHB",
        feature: "Military Rank",
        entries: [{
          name: "Feature: Military Rank",
          type: "entries",
          entries: [
            "You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence."
          ],
          data: { isFeature: true }
        }]
      },
      "background:hermit:phb": {
        id: "background:hermit:phb",
        name: "Hermit",
        source: "PHB",
        feature: "Discovery",
        choiceDefinitions: [{
          id: "background:hermit:life-of-seclusion",
          choiceId: "background:hermit:life-of-seclusion",
          type: "lifeOfSeclusion",
          label: "Life of Seclusion",
          prompt: "Choose the reason for your seclusion.",
          sourceName: "Hermit",
          count: 1,
          valueKey: "lifeOfSeclusion",
          options: [
            {
              value: "I was searching for spiritual enlightenment.",
              label: "I was searching for spiritual enlightenment.",
              roll: "1"
            },
            {
              value: "I needed a quiet place to work on my art, literature, music, or manifesto.",
              label: "I needed a quiet place to work on my art, literature, music, or manifesto.",
              roll: "5"
            }
          ]
        }]
      }
    },
    items: {
      "item:test-blade:homebrew": {
        id: "item:test-blade:homebrew",
        name: "Test Blade",
        source: "Homebrew",
        weapon: true,
        dmg1: "1d8",
        dmgType: "S",
        _fImm: ["poison"]
      },
      "item:test-shield:homebrew": {
        id: "item:test-shield:homebrew",
        name: "Test Shield",
        source: "Homebrew",
        type: "shield",
        armor: true,
        ac: 2
      }
    },
    spells: {
      "spell:sacred-flame:phb": {
        id: "spell:sacred-flame:phb",
        name: "Sacred Flame",
        source: "PHB",
        level: 0,
        school: { code: "V", name: "evocation" },
        time: [{ number: 1, unit: "action" }],
        range: { type: "point", distance: { type: "feet", amount: 60 } },
        components: { v: true, s: true },
        duration: [{ type: "instant" }],
        damageInflict: ["radiant"],
        savingThrow: ["dexterity"],
        scalingLevelDice: {
          label: "radiant damage",
          scaling: { 1: "1d8", 5: "2d8", 11: "3d8", 17: "4d8" }
        },
        entries: [
          "Flame-like radiance descends on a creature within range. The target must succeed on a Dexterity saving throw or take {@damage 1d8} radiant damage."
        ]
      },
      "spell:hunters-mark:phb": {
        id: "spell:hunters-mark:phb",
        name: "Hunter's Mark",
        source: "PHB",
        level: 1,
        school: { code: "D", name: "divination" },
        concentration: true,
        time: [{ number: 1, unit: "bonus" }],
        range: { type: "point", distance: { type: "feet", amount: 90 } },
        components: { v: true },
        duration: [{ type: "timed", duration: { amount: 1, type: "hour" }, concentration: true }],
        entries: [
          "You choose a creature you can see within range and mystically mark it as your quarry. Until the spell ends, you deal an extra {@damage 1d6} damage to the target whenever you hit it with a weapon attack, and you have advantage on Wisdom checks to find it. If the target drops to 0 hit points before this spell ends, you can use a bonus action on a later turn to mark a new creature."
        ],
        entriesHigherLevel: [{
          type: "entries",
          name: "At Higher Levels",
          entries: ["At higher spell slots, you can maintain concentration for longer durations."]
        }]
      },
      "spell:fireball:phb": {
        id: "spell:fireball:phb",
        name: "Fireball",
        source: "PHB",
        level: 3,
        school: { code: "V", name: "evocation" },
        time: [{ number: 1, unit: "action" }],
        range: { type: "point", distance: { type: "feet", amount: 150 } },
        components: { v: true, s: true, m: "a tiny ball of bat guano and sulfur" },
        duration: [{ type: "instant" }],
        damageInflict: ["fire"],
        savingThrow: ["dexterity"],
        entries: [
          "Each creature in a 20-foot-radius sphere must make a Dexterity saving throw. A target takes {@damage 8d6} fire damage on a failed save, or half as much damage on a successful one."
        ]
      },
      "spell:druidcraft:phb": {
        id: "spell:druidcraft:phb",
        name: "Druidcraft",
        source: "PHB",
        level: 0,
        school: { code: "T", name: "transmutation" },
        entries: ["Whispering to the spirits of nature, you create one of several minor sensory effects."]
      },
      "spell:produce-flame:phb": {
        id: "spell:produce-flame:phb",
        name: "Produce Flame",
        source: "PHB",
        level: 0,
        school: { code: "C", name: "conjuration" },
        damageInflict: ["fire"],
        entries: ["A flickering flame appears in your hand and can be hurled at a creature."]
      },
      "spell:hold-person:phb": {
        id: "spell:hold-person:phb",
        name: "Hold Person",
        source: "PHB",
        level: 2,
        school: { code: "E", name: "enchantment" },
        savingThrow: ["wisdom"],
        entries: ["Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration."]
      },
      "spell:spike-growth:phb": {
        id: "spell:spike-growth:phb",
        name: "Spike Growth",
        source: "PHB",
        level: 2,
        school: { code: "T", name: "transmutation" },
        damageInflict: ["piercing"],
        entries: ["The ground in a 20-foot radius sprouts hard spikes and thorns."]
      },
      "spell:mirror-image:phb": {
        id: "spell:mirror-image:phb",
        name: "Mirror Image",
        source: "PHB",
        level: 2,
        school: { code: "I", name: "illusion" },
        entries: ["Three illusory duplicates of yourself appear in your space."]
      },
      "spell:misty-step:phb": {
        id: "spell:misty-step:phb",
        name: "Misty Step",
        source: "PHB",
        level: 2,
        school: { code: "C", name: "conjuration" },
        entries: ["Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see."]
      }
    }
  };

  return {
    calls,
    async getCatalogEntity(kind, id) {
      calls.push({ kind, id });
      const record = records[kind]?.[id];
      if (!record) {
        const error = new Error(`Missing ${kind}/${id}`);
        error.status = 404;
        throw error;
      }
      return record;
    },
    async searchCatalogFull(kind, query) {
      calls.push({ kind, query });
      return {
        items: Object.values(records[kind] || {}).filter((record) => record.name === query)
      };
    },
    async listCatalogFull(kind) {
      calls.push({ kind, query: "" });
      return {
        items: Object.values(records[kind] || {})
      };
    },
    async listCatalog(kind) {
      return this.listCatalogFull(kind);
    },
    async searchCatalog(kind, query) {
      return this.searchCatalogFull(kind, query);
    }
  };
}

const tests = [
  ["strict DTO save strips runtime/catalog payloads", () => {
    const dto = createDto();
    const saveDto = PlayerSheetDtoHelper.toSaveDto(dto);
    assert(!saveDto.baseChoices.race.profile, "race profile should not be saved");
    assert(!saveDto.baseChoices.background.grants, "background grants should not be saved");
    assert(!saveDto.levels[0].class.profile, "class profile should not be saved");
    assert(!saveDto.levels[0].class.startingProficiencies, "class starting proficiencies should not be saved");
    assert(!saveDto.inventory.items[0].snapshot, "item snapshot should not be saved");
    assertEqual(saveDto.schemaVersion, "player-sheet-v2", "save DTO schema");
  }],
  ["compiled sheets are rejected before save", () => {
    let threw = false;
    try {
      PlayerSheetDtoHelper.toSaveDto({ schemaVersion: "player-sheet-v2-compiled" });
    } catch (_error) {
      threw = true;
    }
    assert(threw, "compiled DTO save should throw");
  }],
  ["reference resolver hydrates runtime DTO without changing save DTO", async () => {
    const dto = PlayerSheetDtoHelper.toSaveDto(createDto());
    const api = createFakeApi();
    const references = await resolvePlayerSheetReferences(dto, api);
    const runtimeDto = applyResolvedReferencesToDto(dto, references);
    assert(runtimeDto.levels[0].class.profile, "runtime class profile should be hydrated");
    assert(runtimeDto.inventory.items[0].snapshot, "runtime item snapshot should be hydrated");
    assert(api.calls.some((call) => call.kind === "classes"), "class reference should be fetched");
    assert(!PlayerSheetDtoHelper.toSaveDto(runtimeDto).inventory.items[0].snapshot, "hydrated snapshot should still be stripped on save");
  }],
  ["catalog cache reuses lookups across instances", async () => {
    CatalogCache.clearShared();
    const api = createFakeApi();
    const firstCatalog = new CatalogCache(api);
    const secondCatalog = new CatalogCache(api);

    const firstRecord = await firstCatalog.getById("classes", "class:cache-test:homebrew");
    const firstCallCount = api.calls.length;
    const secondRecord = await secondCatalog.getById("classes", "class:cache-test:homebrew");

    assertEqual(firstRecord.name, "Cache Test", "first catalog lookup");
    assertEqual(secondRecord.name, "Cache Test", "second catalog lookup");
    assertEqual(api.calls.length, firstCallCount, "second catalog instance should reuse cached record");
    CatalogCache.clearShared();
  }],
  ["structured option coverage reports mapped and unmapped choices", () => {
    const coverage = createStructuredOptionCoverage(createDto());
    assert(coverage.totalStructuredOptions >= 2, "coverage should count structured options");
    assert(coverage.missingMappings.some((item) => item.type === "mystery-option"), "unknown option type should need mapping");
  }],
  ["level editor hides structured option coverage by default", () => {
    const coverageRow = renderLevelEditorForCoverageFlag(false);
    assert(!coverageRow, "structured option coverage row should be hidden for player-facing sheets");
  }],
  ["level editor shows structured option coverage when explicitly enabled", () => {
    const coverageRow = renderLevelEditorForCoverageFlag(true);
    assert(coverageRow, "structured option coverage row should render when the debug flag is enabled");
    assert(coverageRow.textContent.includes("Structured Options"), "coverage row should keep the developer-facing label");
  }],
  ["catalog profile maps referenced subclass feature option blocks", () => {
    const choices = getDefinedChoices({
      id: "subclass-feature:ranger-hunter-hunters-prey-3:phb",
      name: "Hunter's Prey",
      source: "PHB",
      kind: "subclassFeature",
      entries: [{
        type: "options",
        count: 1,
        entries: [
          { type: "refSubclassFeature", subclassFeature: "Colossus Slayer|Ranger||Hunter||3" },
          { type: "refSubclassFeature", subclassFeature: "Giant Killer|Ranger||Hunter||3" },
          { type: "refSubclassFeature", subclassFeature: "Horde Breaker|Ranger||Hunter||3" }
        ]
      }]
    });

    assertEqual(choices.length, 1, "Hunter's Prey should expose one feature choice");
    assertEqual(choices[0].type, "class-option", "referenced feature options should use class-option rendering");
    assertEqual(choices[0].options.length, 3, "Hunter's Prey should expose all three options");
    assertIncludes(choices[0].options.map((option) => option.label), "Colossus Slayer", "referenced option label");
  }],
  ["compiler owns defenses and table facts once", () => {
    const compiled = SheetCompiler.compile(createDto());
    assertEqual(compiled.displayIndex.facts.damageResistances, "header", "resistance display owner");
    assertEqual(compiled.displayIndex.facts.defensiveGear, "defense", "defensive gear display owner");
    assertEqual(compiled.displayIndex.facts.skills, "sidebar", "skill display owner");
    assertEqual(compiled.displayIndex.facts.notes, "notes", "notes display owner");
    assertIncludes(compiled.defenses.damageResistances, "cold", "manual resistance should compile");
    assertIncludes(compiled.defenses.damageVulnerabilities, "radiant", "manual vulnerability should compile");
    assertIncludes(compiled.defenses.conditionImmunities, "poisoned", "manual condition immunity should compile");
    assertIncludes(compiled.defenses.damageImmunities, "poison", "item immunity should compile");
  }],
  ["notes DTO preserves rich text and plain text", () => {
    const dto = PlayerSheetDtoHelper.normalize({
      schemaVersion: "player-sheet-v2",
      notes: {
        freeform: "Plain note",
        richText: "<p><strong>Rich note</strong></p>"
      }
    });

    assertEqual(dto.notes.freeform, "Plain note", "plain notes should normalize");
    assertEqual(dto.notes.richText, "<p><strong>Rich note</strong></p>", "rich notes should normalize");
    assertEqual(PlayerSheetDtoHelper.toSaveDto(dto).notes.richText, "<p><strong>Rich note</strong></p>", "rich notes should save");
  }],
  ["notes sanitizer strips unsafe markup", () => {
    const sanitized = sanitizeNotesHtml("<p>Hello <strong>world</strong><script>alert(1)</script><a href=\"javascript:bad()\">bad</a><a href=\"https://example.com\">ok</a></p>");
    assert(sanitized.includes("<strong>world</strong>"), "sanitizer should preserve allowed formatting");
    assert(!sanitized.includes("<script"), "sanitizer should remove scripts");
    assert(!sanitized.includes("alert"), "sanitizer should remove script contents");
    assert(!sanitized.includes("javascript:"), "sanitizer should remove unsafe links");
    assert(sanitized.includes("href=\"https://example.com\""), "sanitizer should preserve safe links");
  }],
  ["notes tab edits and saves rich text", async () => {
    const dto = createDto();
    dto.notes.richText = "<p>Existing <strong>note</strong></p>";
    const compiled = SheetCompiler.compile(dto);
    let patchedDto = null;
    fixture.innerHTML = "<div id=\"TabContent\"></div>";

    BuildPlayerSheetNotesTab(compiled, {
      dto,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });

    const editor = fixture.querySelector(".player-sheet-notes__editor");
    assert(editor, "notes editor should render");
    assert(editor.innerHTML.includes("<strong>note</strong>"), "notes editor should render rich text");
    editor.innerHTML = "<p>Session <strong>lead</strong></p><script>bad()</script>";
    editor.dispatchEvent(new InputEvent("input", { bubbles: true }));

    const save = fixture.querySelector(".player-sheet-notes__save");
    assertEqual(save.dataset.dirty, "true", "notes save button should mark dirty");
    save.click();

    await waitForCondition(() => patchedDto != null, "notes save should patch DTO");
    assert(patchedDto.notes.richText.includes("<strong>lead</strong>"), "patched DTO should keep rich text");
    assert(!patchedDto.notes.richText.includes("<script"), "patched DTO should save sanitized notes");
    assertEqual(patchedDto.notes.freeform, "Session lead", "patched DTO should keep plain text notes");
  }],
  ["compiler attaches background feature rules from resolved profiles", () => {
    const compiled = SheetCompiler.compile(createSoldierBackgroundFeatureDto());
    const feature = compiled.features.find((entry) => entry.category === "Background Feature" && entry.name === "Military Rank");

    assert(feature, "soldier background feature should compile");
    assert(feature.rulesEntries, "soldier background feature should keep rules entries");
    assert(
      JSON.stringify(feature.rulesEntries).includes("Soldiers loyal to your former military organization"),
      "soldier background feature should include Military Rank rules"
    );
  }],
  ["feats tab renders background feature rules and hydrates strict DTO fallback", async () => {
    const dto = createSoldierBackgroundFeatureDto({ withProfile: false });
    const compiled = SheetCompiler.compile(dto);
    fixture.innerHTML = "<div id=\"TabContent\"></div>";

    await BuildPlayerSheetFeatsTab(compiled, {
      api: createFakeApi(),
      dto
    });

    assert(fixture.textContent.includes("Military Rank"), "Feats tab should show the background feature name");
    assert(
      fixture.textContent.includes("Soldiers loyal to your former military organization"),
      "Feats tab should render hydrated background feature rules"
    );
  }],
  ["compiler applies monk unarmored defense and movement only when eligible", () => {
    const compiled = SheetCompiler.compile(createMonkDto());
    assertEqual(compiled.ac.value, 15, "monk unarmored defense should use 10 + DEX + WIS");
    assertEqual(compiled.ac.equipment.unarmoredSource, "Monk Unarmored Defense", "monk AC source");
    assertEqual(compiled.speed.value, 40, "level 5 monk should gain +10 ft speed");
    assertEqual(compiled.speed.modes.walk, 40, "walk mode should include monk movement");
    assert(compiled.speed.modifiers.some((modifier) => modifier.label === "Unarmored Movement" && modifier.value === 10), "monk movement modifier should be recorded");

    const shielded = SheetCompiler.compile(createMonkDto({ shield: true }));
    assertEqual(shielded.ac.value, 14, "shield should block monk unarmored defense");
    assertEqual(shielded.ac.equipment.monkUnarmored, null, "shielded monk AC should not keep monk formula");
    assertEqual(shielded.speed.value, 30, "shield should block monk unarmored movement");
    assert(!shielded.speed.modifiers.some((modifier) => modifier.label === "Unarmored Movement"), "shielded monk should not record movement bonus");
  }],
  ["compiler surfaces class resource progression tables", () => {
    const monk = SheetCompiler.compile(createMonkLevelFiveDto()).classResources
      .find((resource) => resource.className === "Monk");
    assert(monk, "monk class resources should compile");
    assertIncludes(monk.tables[0].columns, "Ki Points", "monk resource table should include Ki Points");
    assertIncludes(monk.tables[0].columns, "Unarmored Movement", "monk resource table should include Unarmored Movement");

    const monkValues = new Map(monk.currentValues.map((entry) => [entry.label, entry.value]));
    assertEqual(monkValues.get("Martial Arts"), "1d6", "level 5 monk martial arts die");
    assertEqual(monkValues.get("Ki Points"), "5", "level 5 monk ki points");
    assertEqual(monkValues.get("Unarmored Movement"), "+10 ft.", "level 5 monk unarmored movement bonus");

    const barbarian = SheetCompiler.compile(createBarbarianLevelFiveDto()).classResources
      .find((resource) => resource.className === "Barbarian");
    assert(barbarian, "barbarian class resources should compile");
    const barbarianValues = new Map(barbarian.currentValues.map((entry) => [entry.label, entry.value]));
    assertEqual(barbarianValues.get("Rages"), "3", "level 5 barbarian rages");
    assertEqual(barbarianValues.get("Rage Damage"), "+2", "level 5 barbarian rage damage");
  }],
  ["reference tab renders class resource current values and full progression", () => {
    fixture.innerHTML = "<div id=\"TabContent\"></div>";
    BuildPlayerSheetReferenceTab(SheetCompiler.compile(createMonkLevelFiveDto()));

    const tab = fixture.querySelector("#TabContent");
    assert(tab.textContent.includes("Class Resources"), "reference tab should include class resources section");
    assert(tab.textContent.includes("Monk Level 5"), "reference tab should identify the active monk level");
    assert(tab.textContent.includes("Ki Points"), "reference tab should render Ki Points");
    assert(tab.textContent.includes("+10 ft."), "reference tab should render current unarmored movement");
    assert(tab.querySelector(".player-sheet-class-resource__table"), "reference tab should render a resource table");
    assert(tab.querySelector(".player-sheet-class-resource__row--current"), "current class level row should be highlighted");
  }],
  ["compiler surfaces mandatory monk features and excludes unchosen optional features", () => {
    const compiled = SheetCompiler.compile(createMonkLevelFiveDto());
    const names = compiledFeatureNames(compiled);

    for (const mandatory of [
      "Unarmored Defense",
      "Martial Arts",
      "Ki",
      "Unarmored Movement",
      "Deflect Missiles",
      "Slow Fall",
      "Extra Attack",
      "Stunning Strike"
    ]) {
      assertIncludes(names, mandatory, `level 5 monk should gain ${mandatory} by reference.`);
    }

    for (const optional of ["Dedicated Weapon", "Ki-Fueled Attack", "Quickened Healing", "Focused Aim"]) {
      assert(!names.includes(optional), `unchosen optional feature ${optional} should not be compiled as granted.`);
    }
  }],
  ["compiler includes an optional monk feature once the character opts in", () => {
    const optIn = {
      id: "class-feature:monk-ki-fueled-attack-3:tce",
      name: "Ki-Fueled Attack",
      source: "TCE",
      level: 3,
      optional: true
    };
    const compiled = SheetCompiler.compile(createMonkLevelFiveDto({ 2: [optIn] }));
    const names = compiledFeatureNames(compiled);

    assertIncludes(names, "Ki-Fueled Attack", "opted-in optional feature should be compiled.");
    assertEqual(
      names.filter((name) => name === "Ki-Fueled Attack").length,
      1,
      "opted-in optional feature should appear exactly once (no duplicate from the automatic pass)."
    );
    for (const stillOff of ["Dedicated Weapon", "Quickened Healing", "Focused Aim"]) {
      assert(!names.includes(stillOff), `un-opted optional feature ${stillOff} should remain excluded.`);
    }
    assertIncludes(names, "Deflect Missiles", "mandatory features should still be present when opting into an optional.");
  }],
  ["compiler honors an optional feature opted in via the level editor choice shape", () => {
    // Shape mirrors createOptionalFeatureSelection() in LevelEditorClassOptionBuilder.
    const editorChoice = {
      type: "class-option",
      choiceId: "optional-feature:class-feature:monk-ki-fueled-attack-3:tce",
      optionalFeature: true,
      featureId: "class-feature:monk-ki-fueled-attack-3:tce",
      featureName: "Ki-Fueled Attack",
      label: "Ki-Fueled Attack",
      source: "TCE",
      value: "class-feature:monk-ki-fueled-attack-3:tce",
      values: [{
        value: "class-feature:monk-ki-fueled-attack-3:tce",
        id: "class-feature:monk-ki-fueled-attack-3:tce",
        label: "Ki-Fueled Attack",
        source: "TCE"
      }]
    };
    const dto = createMonkLevelFiveDto();
    dto.levels[2].choices = [editorChoice];
    const names = compiledFeatureNames(SheetCompiler.compile(dto));

    assertIncludes(names, "Ki-Fueled Attack", "editor opt-in (choice shape) should surface the optional feature.");
    assertEqual(
      names.filter((name) => name === "Ki-Fueled Attack").length,
      1,
      "editor opt-in should surface the feature once."
    );
    assert(!names.some((name) => name.includes(": Ki-Fueled Attack")), "opt-in should not produce a redundant 'Feature: Feature' entry.");
  }],
  ["starting tools let monks choose artisan tools or musical instruments", async () => {
    CatalogCache.clearShared();
    const dto = createMonkLevelFiveDto();
    const compiled = SheetCompiler.compile(dto);
    assert(
      !compiled.proficiencies.tools.some((entry) => /artisan|instrument|choice/iu.test(entry.name)),
      "unresolved monk tool choice text should not compile as an actual proficiency"
    );

    let patchedDto = null;
    const content = buildToolPickerContent({
      api: createFakeApi(),
      dto,
      compiled,
      characterLevel: 1,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });
    fixture.replaceChildren(content);

    await waitForCondition(() => fixture.textContent.includes("Tool Proficiency"), "Monk tool choice group should render");
    assert(fixture.textContent.includes("Alchemist's Supplies"), "artisan tool choices should be shown");
    assert(fixture.textContent.includes("Lute"), "musical instrument choices should be shown");
    assert(!fixture.textContent.includes("any one type of artisan's tools"), "placeholder choice text should not render as a fixed proficiency");

    const luteLabel = [...fixture.querySelectorAll(".level-editor__choice-checkbox")]
      .find((label) => label.textContent.includes("Lute"));
    assert(luteLabel, "Lute option should be selectable");
    const luteInput = luteLabel.querySelector("input");
    luteInput.checked = true;
    luteInput.dispatchEvent(new Event("change", { bubbles: true }));

    const apply = fixture.querySelector(".level-editor__button--primary");
    assert(apply && !apply.disabled, "Apply should enable after selecting a monk tool proficiency");
    apply.click();

    await waitForCondition(() => patchedDto != null, "Tool proficiency apply should patch DTO");
    assertIncludes(
      patchedDto.baseChoices.startingProficiencies.tools,
      "Lute",
      "DTO should store the selected monk tool proficiency"
    );
    CatalogCache.clearShared();
  }],
  ["class options let monks choose a Dedicated Weapon after opting into the feature", async () => {
    CatalogCache.clearShared();
    const dto = createMonkLevelFiveDto();
    const compiled = SheetCompiler.compile(dto);
    let patchedDto = null;
    const content = buildClassOptionContent({
      api: createFakeApi(),
      dto,
      compiled,
      characterLevel: 2,
      classLevel: 2,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });
    fixture.replaceChildren(content);

    await waitForCondition(() => fixture.textContent.includes("0/1 optional feature enabled"), "Dedicated Weapon optional feature should load");
    assertEqual(fixture.querySelectorAll("label[data-option-value]").length, 0, "weapon choices should be gated until Dedicated Weapon is enabled");

    const dedicatedToggle = fixture.querySelector("label[data-optional-feature] input");
    assert(dedicatedToggle, "Dedicated Weapon toggle should render");
    dedicatedToggle.checked = true;
    dedicatedToggle.dispatchEvent(new Event("change", { bubbles: true }));

    await waitForCondition(() => fixture.textContent.includes("Shortsword"), "Dedicated Weapon choices should render after opt-in");
    assert(fixture.textContent.includes("Club"), "simple proficient weapons should be shown");
    assert(fixture.textContent.includes("Shortsword"), "specific monk weapon proficiency should be shown");
    assert(!fixture.textContent.includes("Longsword"), "unproficient martial weapons should be hidden");
    assert(!fixture.textContent.includes("Greatsword"), "heavy weapons should be hidden");

    const shortsword = fixture.querySelector("label[data-option-value='base-item:shortsword:phb'] input");
    assert(shortsword, "Shortsword radio option should be selectable");
    shortsword.checked = true;
    shortsword.dispatchEvent(new Event("change", { bubbles: true }));

    const apply = fixture.querySelector(".level-editor__button--primary");
    assert(apply && !apply.disabled, "Apply should enable after selecting the dedicated weapon");
    apply.click();

    await waitForCondition(() => patchedDto != null, "Dedicated Weapon apply should patch DTO");
    const choices = patchedDto.levels[1].choices;
    assert(choices.some((choice) => choice.optionalFeature && choice.featureName === "Dedicated Weapon"), "DTO should store the Dedicated Weapon opt-in");
    assert(choices.some((choice) => choice.weaponChoice === "dedicated-weapon" && choice.value === "base-item:shortsword:phb"), "DTO should store the chosen dedicated weapon");
    CatalogCache.clearShared();
  }],
  ["class options include selected subclass feature option blocks", async () => {
    CatalogCache.clearShared();
    const dto = createRangerHunterDto();
    const compiled = SheetCompiler.compile(dto);
    let patchedDto = null;
    const content = buildClassOptionContent({
      api: createFakeApi(),
      dto,
      compiled,
      characterLevel: 3,
      classLevel: 3,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });
    fixture.replaceChildren(content);

    await waitForCondition(() => fixture.textContent.includes("Hunter's Prey"), "Hunter's Prey class option should load");
    assert(fixture.textContent.includes("Colossus Slayer"), "Hunter option should include Colossus Slayer");
    assert(fixture.textContent.includes("Giant Killer"), "Hunter option should include Giant Killer");
    assert(fixture.textContent.includes("Horde Breaker"), "Hunter option should include Horde Breaker");

    const colossus = fixture.querySelector("label[data-option-value='Colossus Slayer|Ranger||Hunter||3'] input");
    assert(colossus, "Colossus Slayer radio option should be selectable");
    colossus.checked = true;
    colossus.dispatchEvent(new Event("change", { bubbles: true }));

    const apply = fixture.querySelector(".level-editor__button--primary");
    assert(apply && !apply.disabled, "Apply should enable after selecting Hunter's Prey");
    apply.click();

    await waitForCondition(() => patchedDto != null, "Hunter's Prey apply should patch DTO");
    assert(patchedDto.levels[2].choices.some((choice) => (
      choice.featureName === "Hunter's Prey"
      && choice.value === "Colossus Slayer|Ranger||Hunter||3"
    )), "DTO should store the selected Hunter's Prey option");
    CatalogCache.clearShared();
  }],
  ["background options surface Hermit Life of Seclusion", async () => {
    CatalogCache.clearShared();
    const dto = createHermitDto();
    const api = createFakeApi();
    const model = await buildBackgroundChoiceModel({ api, dto });
    assertEqual(model.choices.length, 1, "Hermit should expose one background option");
    assertEqual(model.choices[0].label, "Life of Seclusion", "Hermit choice label");

    let patchedDto = null;
    const content = buildBackgroundChoiceContent({
      api,
      dto,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });
    fixture.replaceChildren(content);

    await waitForCondition(() => fixture.textContent.includes("Life of Seclusion"), "Hermit background option should load");
    const select = fixture.querySelector("select");
    assert(select, "Hermit background option should render a select");
    select.value = "I was searching for spiritual enlightenment.";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    const apply = fixture.querySelector(".level-editor__button--primary");
    assert(apply && !apply.disabled, "Apply should enable after selecting Life of Seclusion");
    apply.click();

    await waitForCondition(() => patchedDto != null, "Hermit background option apply should patch DTO");
    assert(buildBackgroundChoiceStatus(patchedDto).includes("spiritual enlightenment"), "Hermit status should show the saved selection");

    const compiled = SheetCompiler.compile(patchedDto);
    assert(compiled.featureChoices.some((choice) => (
      choice.label === "Life of Seclusion"
      && choice.value.includes("spiritual enlightenment")
    )), "compiled feature choices should include Life of Seclusion");
    assert(compiled.features.some((feature) => (
      feature.category === "Background Feature"
      && feature.name.includes("Life of Seclusion")
      && feature.name.includes("spiritual enlightenment")
    )), "compiled features should include the selected Hermit option");
    CatalogCache.clearShared();
  }],
  ["class options surface College of Lore Additional Magical Secrets spell choices", async () => {
    CatalogCache.clearShared();
    const dto = createLoreBardDto();
    const api = createFakeApi();
    const context = {
      api,
      dto,
      compiled: SheetCompiler.compile(dto),
      characterLevel: 6,
      classLevel: 6,
      subclassEntry: {
        id: "subclass:bard-lore:phb",
        name: "College of Lore",
        shortName: "Lore",
        source: "PHB",
        kind: "subclasses"
      }
    };
    const model = await buildClassOptionModel(context);
    const loreChoices = model.choices.filter((choice) => choice.spellChoice);
    assertEqual(loreChoices.length, 1, "Lore duplicate spell choices should collapse into one editor choice");
    assertEqual(loreChoices[0].count, 2, "Additional Magical Secrets should allow two spells");
    assert(loreChoices[0].label.includes("Additional Magical Secrets"), "Lore spell choice should keep its feature label");
    assertIncludes(loreChoices[0].options.map((option) => option.label), "Sacred Flame", "Lore spell options should include cantrips");
    assertIncludes(loreChoices[0].options.map((option) => option.label), "Fireball", "Lore spell options should include 3rd-level spells");

    let patchedDto = null;
    const content = buildClassOptionContent({
      ...context,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });
    fixture.replaceChildren(content);

    await waitForCondition(() => fixture.textContent.includes("Additional Magical Secrets"), "Lore spell choice should load");
    const sacredFlame = fixture.querySelector("label[data-option-value='Sacred Flame|PHB'] input");
    const fireball = fixture.querySelector("label[data-option-value='Fireball|PHB'] input");
    assert(sacredFlame, "Sacred Flame should be selectable");
    assert(fireball, "Fireball should be selectable");
    sacredFlame.checked = true;
    sacredFlame.dispatchEvent(new Event("change", { bubbles: true }));
    fireball.checked = true;
    fireball.dispatchEvent(new Event("change", { bubbles: true }));

    const apply = fixture.querySelector(".level-editor__button--primary");
    assert(apply && !apply.disabled, "Apply should enable after selecting two Lore spells");
    apply.click();

    await waitForCondition(() => patchedDto != null, "Lore spell choice apply should patch DTO");
    const selection = patchedDto.levels[5].choices.find((choice) => choice.spellChoice);
    assert(selection, "DTO should store the Lore spell choice");
    assertEqual(selection.count, 2, "DTO should store the collapsed two-spell count");
    assertIncludes(selection.values.map((value) => value.label), "Sacred Flame", "DTO should store Sacred Flame");
    assertIncludes(selection.values.map((value) => value.label), "Fireball", "DTO should store Fireball");

    const compiled = SheetCompiler.compile(patchedDto);
    assertIncludes(compiled.classChoiceSpells.cantrips.map((spell) => spell.name), "Sacred Flame", "compiled class choice cantrips");
    assertIncludes(compiled.classChoiceSpells.known.map((spell) => spell.name), "Fireball", "compiled class choice known spells");
    CatalogCache.clearShared();
  }],
  ["class options surface Circle of the Land terrain and bonus cantrip choices", async () => {
    CatalogCache.clearShared();
    const dto = createLandDruidDto();
    const api = createFakeApi();
    const context = {
      api,
      dto,
      compiled: SheetCompiler.compile(dto),
      characterLevel: 2,
      classLevel: 2,
      spellSourceLookup: getDruidSpellSourceLookup()
    };
    const model = await buildClassOptionModel(context);
    const spellChoices = model.choices.filter((choice) => choice.spellChoice);
    const spellGroupChoices = model.choices.filter((choice) => choice.spellGroupChoice);
    assertEqual(spellChoices.length, 1, "Land cantrip choices should collapse across terrain groups");
    assertEqual(spellChoices[0].count, 1, "Land bonus cantrip should choose one cantrip");
    assertIncludes(spellChoices[0].options.map((option) => option.label), "Druidcraft", "Land bonus cantrip options should include Druidcraft");
    assertEqual(spellGroupChoices.length, 1, "Land terrain spell groups should expose one group choice");
    assertIncludes(spellGroupChoices[0].options.map((option) => option.label), "Arctic", "Land group choice should include Arctic");
    assertIncludes(spellGroupChoices[0].options.map((option) => option.label), "Coast", "Land group choice should include Coast");

    let patchedDto = null;
    const content = buildClassOptionContent({
      ...context,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });
    fixture.replaceChildren(content);

    await waitForCondition(() => (
      fixture.textContent.includes("Circle of the Land: Spell Group")
      && fixture.textContent.includes("Druidcraft")
    ), "Land spell group and cantrip choices should load");
    const arctic = fixture.querySelector("label[data-option-value='Arctic'] input");
    const druidcraft = fixture.querySelector("label[data-option-value='Druidcraft|PHB'] input");
    assert(arctic, "Arctic terrain should be selectable");
    assert(druidcraft, "Druidcraft should be selectable");
    arctic.checked = true;
    arctic.dispatchEvent(new Event("change", { bubbles: true }));
    druidcraft.checked = true;
    druidcraft.dispatchEvent(new Event("change", { bubbles: true }));

    const apply = fixture.querySelector(".level-editor__button--primary");
    assert(apply && !apply.disabled, "Apply should enable after selecting Land choices");
    apply.click();

    await waitForCondition(() => patchedDto != null, "Land choices apply should patch DTO");
    const levelTwoChoices = patchedDto.levels[1].choices;
    assert(levelTwoChoices.some((choice) => choice.spellGroupChoice && choice.value === "Arctic"), "DTO should store the selected Land terrain");
    assert(levelTwoChoices.some((choice) => choice.spellChoice && choice.value === "Druidcraft|PHB"), "DTO should store the selected Land bonus cantrip");

    const compiled = SheetCompiler.compile(patchedDto);
    const preparedNames = compiled.classChoiceSpells.alwaysPrepared.map((spell) => spell.name);
    assertIncludes(compiled.classChoiceSpells.cantrips.map((spell) => spell.name), "Druidcraft", "compiled Land bonus cantrip");
    assertIncludes(preparedNames, "Hold Person", "Arctic prepared spells should compile when level 3+ is reached");
    assertIncludes(preparedNames, "Spike Growth", "Arctic prepared spells should compile when level 3+ is reached");
    assert(!preparedNames.includes("Mirror Image"), "Coast spells should not compile when Arctic is selected");
    assert(!preparedNames.includes("Misty Step"), "Coast spells should not compile when Arctic is selected");

    fixture.innerHTML = `<div id="TabContent"></div>`;
    await BuildPlayerSheetSpellsTab(compiled, { api, dto: patchedDto });
    const tabText = fixture.querySelector("#TabContent").textContent;
    assert(tabText.includes("Druidcraft"), "spells tab should render the selected Land cantrip");
    assert(tabText.includes("Hold Person"), "spells tab should render selected Land always-prepared spells");
    assert(tabText.includes("Class Feature"), "spells tab should label class feature spells");
    CatalogCache.clearShared();
  }],
  ["feats tab renders mandatory monk features and hides unchosen optional features", async () => {
    const compiled = SheetCompiler.compile(createMonkLevelFiveDto());
    fixture.innerHTML = `<div id="TabContent"></div>`;
    await BuildPlayerSheetFeatsTab(compiled, {});
    const tabText = fixture.querySelector("#TabContent").textContent;
    assert(tabText.includes("Deflect Missiles"), "feats tab should show Deflect Missiles.");
    assert(tabText.includes("Slow Fall"), "feats tab should show Slow Fall.");
    assert(tabText.includes("Stunning Strike"), "feats tab should show Stunning Strike.");
    assert(!tabText.includes("Focused Aim"), "feats tab should not show unchosen Focused Aim.");
    assert(!tabText.includes("Ki-Fueled Attack"), "feats tab should not show unchosen Ki-Fueled Attack.");
  }],
  ["compiler applies ranger spellcasting from class progression", () => {
    const levelOne = SheetCompiler.compile(createRangerDto(0));
    assertEqual(levelOne.classes[0].spellcasting, null, "level 1 ranger should not have 2014 PHB spellcasting");

    const compiled = SheetCompiler.compile(createRangerDto());
    const spellcasting = compiled.classes[0].spellcasting;
    assert(spellcasting, "level 5 ranger should have spellcasting");
    assertEqual(spellcasting.ability, "wis", "ranger spellcasting ability");
    assertEqual(spellcasting.spellAttackBonus, 5, "ranger spell attack bonus");
    assertEqual(spellcasting.spellSaveDc, 13, "ranger spell save DC");
    assertEqual(spellcasting.spellsKnown, 4, "level 5 ranger spells known");
    assertEqual(compiled.spellSlots.byLevel["1"].max, 4, "level 5 ranger 1st-level slots");
    assertEqual(compiled.spellSlots.byLevel["2"].max, 2, "level 5 ranger 2nd-level slots");
  }],
  ["compiler tolerates missing class references", () => {
    const dto = createDto();
    dto.levels[0].class = null;
    dto.levels[1] = {
      characterLevel: 2,
      class: null,
      hp: 0,
      choices: []
    };
    const compiled = SheetCompiler.compile(dto);
    assertEqual(compiled.schemaVersion, "player-sheet-v2-compiled", "compiled schema");
    assertEqual(compiled.classes.length, 0, "missing class refs should not create class groups");
    assertEqual(compiled.abilities.str.savingThrow.proficient, false, "missing class refs should not imply class saves");
  }],
  ["spells tab renders slots, levels, compact rules, and remove action", async () => {
    CatalogCache.clearShared();
    const dto = createRangerDto();
    dto.spells.cantrips = ["Sacred Flame"];
    dto.spells.known = ["Hunter's Mark"];
    const compiled = SheetCompiler.compile(dto);
    const api = createFakeApi();
    let patchedDto = null;

    fixture.innerHTML = `<div id="TabContent"></div>`;
    await BuildPlayerSheetSpellsTab(compiled, {
      api,
      dto,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });

    const tab = fixture.querySelector("#TabContent");
    const text = tab.textContent;
    assert(text.includes("Cantrips"), "cantrip section should render");
    assert(text.includes("1st-Level Spells"), "1st-level section should render");
    assert(text.includes("9th-Level Spells"), "9th-level section should render even when empty");
    assert(text.includes("4 / 4"), "1st-level slot availability should render");
    assert(text.includes("2 / 2"), "2nd-level slot availability should render");
    assert(text.includes("Sacred Flame"), "cantrip should render");
    assert(text.includes("Hunter's Mark"), "known spell should render");
    assert(text.includes("DEX DC 13"), "saving throw and save DC should render in compact metrics");
    assert(text.includes("2d8 radiant damage"), "scaled cantrip damage should render in compact metrics");
    assert(tab.querySelector(".player-sheet-item-card__rules-details"), "long spell rules should be expandable");

    const remove = tab.querySelector("[data-spell-remove='known:0']");
    assert(remove, "known spell should have a remove action");
    remove.click();
    await waitForCondition(() => patchedDto != null, "remove action should patch DTO");
    assertEqual(patchedDto.spells.known.length, 0, "remove should delete spell from known list");
    CatalogCache.clearShared();
  }],
  ["feats tab filters by rules text and category with readable details", async () => {
    fixture.innerHTML = `<div id="TabContent"></div>`;
    await BuildPlayerSheetFeatsTab({
      features: [
        {
          name: "Sneak Attack",
          category: "Class Feature",
          source: "Rogue",
          level: 1,
          rulesEntries: ["Once per turn, you can deal extra damage when you have advantage."]
        },
        {
          name: "Cunning Action",
          category: "Class Feature",
          source: "Rogue",
          level: 2,
          rulesEntries: ["You can take a bonus action to Dash, Disengage, or Hide."]
        },
        {
          name: "Lucky",
          category: "ASI Feat",
          source: "PHB",
          level: 4,
          rulesEntries: ["You have 3 luck points. Spend one when you make an attack roll, ability check, or saving throw."]
        },
        {
          name: "Darkvision",
          category: "Race Feature",
          source: "Elf",
          rulesEntries: ["You can see in dim light within 60 feet as if it were bright light."]
        }
      ],
      featureChoices: []
    });

    const tab = fixture.querySelector("#TabContent");
    const input = tab.querySelector(".player-sheet-feature-filter__input");
    const category = tab.querySelector(".player-sheet-feature-filter__select");
    const rows = Array.from(tab.querySelectorAll(".player-sheet-feature-list__item"));
    assert(input, "feature filter search should render");
    assert(category, "feature category filter should render");
    assertEqual(rows.length, 4, "all feature rows should render");

    const lucky = rows.find((row) => row.textContent.includes("Lucky"));
    const luckyDetails = lucky.querySelector(".player-sheet-feature-card");
    luckyDetails.open = true;
    assert(lucky.querySelector(".player-sheet-feature-card__body"), "expanded feature rules body should render");
    assert(lucky.textContent.includes("3 luck points"), "expanded feature rules should remain readable in the card");

    input.value = "luck points";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assertEqual(rows.filter((row) => !row.hidden).length, 1, "rules text search should narrow the feature list");
    assert(!lucky.hidden, "matching feat should stay visible");
    assert(tab.textContent.includes("Showing 1 of 4"), "filter status should show narrowed results");

    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    category.value = "Class Features";
    category.dispatchEvent(new Event("change", { bubbles: true }));
    const visibleRows = rows.filter((row) => !row.hidden);
    assertEqual(visibleRows.length, 2, "category filter should narrow to class features");
    assert(visibleRows.every((row) => row.dataset.featureCategory === "Class Features"), "visible rows should match selected category");

    tab.querySelector(".player-sheet-feature-filter__clear").click();
    assertEqual(rows.filter((row) => !row.hidden).length, 4, "clear should restore all feature rows");
  }],
  ["header shows defense state while defense tab shows gear only", async () => {
    fixture.innerHTML = `
      <div id="GlobalCharacterSheetInformationHeader">
        <div class="Level"></div><div class="XP"></div><div class="Name"></div>
        <div class="Class"></div><div class="Subclass"></div><div class="Proficiency"></div>
        <div class="Size"></div><div class="Speed"></div>
        <div class="STR"></div><div class="Dex"></div><div class="con"></div>
        <div class="int"></div><div class="wis"></div><div class="cha"></div>
        <div class="AC"></div><div class="CombatHP"></div><div class="TempHP"></div>
        <div class="Initiative"></div><div class="DeathSaves"></div><div class="DeathFailures"></div>
        <div class="Conditions"></div><div class="Exhaustion"></div><div class="Defenses"></div>
        <div class="STRSave"></div><div class="DEXSave"></div><div class="ConSave"></div>
        <div class="IntSave"></div><div class="WisSave"></div><div class="ChaSave"></div>
      </div>
      <div id="TabContent"></div>
    `;
    const compiled = SheetCompiler.compile(createDto());
    BuildPlayerSheetHeader(compiled);
    await BuildPlayerSheetDefenseTab(compiled);
    const headerText = fixture.querySelector("#GlobalCharacterSheetInformationHeader").textContent;
    const tabText = fixture.querySelector("#TabContent").textContent;
    assert(headerText.includes("cold"), "resistance should be visible in the header");
    assert(headerText.includes("poison"), "immunity should be visible in the header");
    assert(headerText.includes("radiant"), "vulnerability should be visible in the header");
    assert(headerText.includes("poisoned"), "condition immunity should be visible in the header");
    assert(tabText.includes("Test Shield"), "defensive gear should be visible in the defense tab");
    assert(!tabText.includes("cold"), "resistance state should not be repeated in the defense tab");
    assert(!tabText.includes("Test Blade"), "offensive-only gear should not be shown in the defense tab");
  }],
  ["header XP edit reports a DTO-owned change", async () => {
    fixture.innerHTML = `
      <div id="GlobalCharacterSheetInformationHeader">
        <div class="Level"></div><div class="XP"></div><div class="Name"></div>
        <div class="Class"></div><div class="Subclass"></div><div class="Proficiency"></div>
        <div class="Size"></div><div class="Speed"></div>
        <div class="STR"></div><div class="Dex"></div><div class="con"></div>
        <div class="int"></div><div class="wis"></div><div class="cha"></div>
        <div class="AC"></div><div class="CombatHP"></div><div class="TempHP"></div>
        <div class="Initiative"></div><div class="DeathSaves"></div><div class="DeathFailures"></div>
        <div class="Conditions"></div><div class="Exhaustion"></div><div class="Defenses"></div>
        <div class="STRSave"></div><div class="DEXSave"></div><div class="ConSave"></div>
        <div class="IntSave"></div><div class="WisSave"></div><div class="ChaSave"></div>
      </div>
    `;
    let nextXp = null;
    BuildPlayerSheetHeader(SheetCompiler.compile(createDto()), {
      onExperienceChange(value) {
        nextXp = value;
      }
    });
    const input = fixture.querySelector(".player-sheet-header__xp-input");
    input.value = "9000";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    assertEqual(nextXp, 9000, "XP edit callback");
  }],
  ["header renders portrait image", async () => {
    fixture.innerHTML = `
      <div id="GlobalCharacterSheetInformationHeader">
        <div class="CharacterHeaderContainer">
          <div class="HeaderInfo">
            <div class="Level"></div><div class="XP"></div><div class="Name"></div><div class="ClassArea"><div class="Class"></div><div class="Subclass"></div></div><div class="Proficiency"></div>
          </div>
          <div class="FooterInfo"><div class="Size"></div><div class="Speed"></div><div class="AbilityScoresSummary" aria-label="Ability scores"></div></div>
          <div class="CombatHeader"><div class="AC"></div><div class="HP"></div><div class="Area3"></div><div class="DefenseState"></div><div class="SavingThrows"></div></div>
        </div>
      </div>
      <div id="GlobalCharacterSheetPortrait"><div class="Portrait" hidden></div></div>
    `;
    BuildPlayerSheetHeader(SheetCompiler.compile(createDto()));
    const portrait = fixture.querySelector("#GlobalCharacterSheetPortrait .Portrait");
    const image = fixture.querySelector(".player-sheet-portrait__image");
    assert(!portrait.hidden, "portrait container should be visible");
    assertEqual(image.getAttribute("src"), TEST_PORTRAIT_URL, "portrait source");
    assert(image.alt.includes("Test Hero"), "portrait alt text");
  }],
  ["equip toggle patches inventory item state", async () => {
    const dto = PlayerSheetDtoHelper.toSaveDto(createDto());
    let patchedDto = null;
    const toggle = createEquipToggle(dto.inventory.items[0], 0, {
      dto,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    });
    const input = toggle.querySelector("input");
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
    assertEqual(patchedDto.inventory.items[0].equipped, false, "equip toggle should patch DTO");
  }],
  ["gear rules show inline under 250 characters and expand above 250", () => {
    const shortRules = "This shield grants a steady defensive bonus while worn.";
    const shortRow = createItemListItem({ name: "Short Shield" }, {
      name: "Short Shield",
      armor: true,
      entries: [shortRules]
    });
    assert(shortRow.textContent.includes(shortRules), "short rules should be visible inline");
    assert(!shortRow.querySelector(".player-sheet-item-card__rules-details"), "short rules should not be hidden behind details");

    const longRules = [
      "This blade hums when drawn and carries a deep archive of combat instructions for the table. ",
      "When you hit with a weapon attack, you can invoke the stored charge to add thunder damage, ",
      "force a saving throw, and trigger a secondary effect described by the item. The full wording ",
      "continues so the preview must stop at a predictable character limit before expansion."
    ].join("");
    const longRow = createItemListItem({ name: "Long Blade" }, {
      name: "Long Blade",
      weapon: true,
      entries: [longRules]
    });
    const preview = longRow.querySelector(".player-sheet-item-card__rules-preview");
    const details = longRow.querySelector(".player-sheet-item-card__rules-details");
    assert(preview, "long rules should show a preview");
    assert(details, "long rules should offer an expansion");
    assert(preview.textContent.endsWith("..."), "long rules preview should end with ellipsis");
    assert(preview.textContent.length <= 253, "long rules preview should cap at 250 characters plus ellipsis");
    assert(details.textContent.includes("The full wording"), "expanded rules should retain the full text");
  }],
  ["spell search modal adds selected spell to the chosen list", async () => {
    CatalogCache.clearShared();
    const dto = createRangerDto();
    const compiled = SheetCompiler.compile(dto);
    const api = createFakeApi();
    let patchedDto = null;
    const modal = buildSpellSearchModal({
      api,
      dto,
      async onChange(nextDto) {
        patchedDto = nextDto;
      }
    }, compiled);
    modal.close = () => {
      modal.dataset.closed = "true";
    };
    fixture.replaceChildren(modal);

    const input = modal.querySelector(".player-sheet-input[type='search']");
    const searchButton = modal.querySelector(".player-sheet-catalog-picker__controls .player-sheet-button");
    input.value = "Fireball";
    searchButton.click();
    await waitForCondition(() => modal.textContent.includes("1 spell shown"), "spell search should render result");

    const listSelect = modal.querySelector(".player-sheet-select");
    listSelect.value = "prepared";
    const addButton = modal.querySelector(".player-sheet-catalog-picker__footer .player-sheet-button");
    await waitForCondition(() => !addButton.disabled, "add spell button should enable after selection");
    addButton.click();

    await waitForCondition(() => patchedDto != null, "add spell should patch DTO");
    assertIncludes(patchedDto.spells.prepared, "Fireball", "selected spell should be added to prepared list");
    assertEqual(modal.dataset.closed, "true", "modal should close after adding a spell");
    CatalogCache.clearShared();
  }],
  ["item search uses backend paging and load more", async () => {
    const calls = [];
    const catalogItems = Array.from({ length: 27 }, (_, index) => ({
      id: `item:test-sword-${index + 1}:homebrew`,
      kind: "items",
      name: index === 0 ? "Longsword" : `Test Sword ${index + 1}`,
      source: "Homebrew",
      type: "weapon"
    }));
    const api = {
      async searchCatalog(kind, query, options = {}) {
        calls.push({ method: "searchCatalog", kind, query, options });
        const skip = Number(options.skip || 0);
        const limit = Number(options.limit || 25);
        const items = catalogItems.slice(skip, skip + limit);
        return {
          items,
          count: items.length,
          hasMore: skip + items.length < catalogItems.length,
          nextSkip: skip + items.length < catalogItems.length ? skip + items.length : undefined
        };
      },
      async getCatalogEntity(kind, id) {
        calls.push({ method: "getCatalogEntity", kind, id });
        return {
          id,
          kind,
          name: id.includes("test-sword-1") ? "Longsword" : "Test Sword",
          source: "Homebrew",
          weapon: true,
          dmg1: "1d8",
          dmgType: "S"
        };
      }
    };
    const modal = buildItemSearchModal({
      api,
      dto: createDto(),
      async onChange() {}
    });
    fixture.replaceChildren(modal);

    const input = modal.querySelector(".player-sheet-input[type='search']");
    const searchButton = modal.querySelector(".player-sheet-catalog-picker__controls .player-sheet-button");
    input.value = "sword";
    searchButton.click();
    await waitForCondition(() => modal.textContent.includes("25 items shown"), "first page should render");

    assert(modal.textContent.includes("Longsword"), "backend search should show first page item names");
    assertEqual(modal.querySelectorAll(".player-sheet-catalog-result").length, 25, "first page result count");
    const loadMore = modal.querySelector("[data-item-search-load-more='true']");
    assert(loadMore && !loadMore.hidden, "load more should be visible when backend reports more results");
    loadMore.click();
    await waitForCondition(() => modal.querySelectorAll(".player-sheet-catalog-result").length === 27, "second page should append");

    const searchCalls = calls.filter((call) => call.method === "searchCatalog");
    assertEqual(searchCalls.length, 2, "backend search should be called for each page");
    assertEqual(searchCalls[0].options.skip, 0, "first page skip");
    assertEqual(searchCalls[0].options.limit, 25, "first page limit");
    assertEqual(searchCalls[1].options.skip, 25, "second page skip");
    assertEqual(searchCalls[1].options.limit, 25, "second page limit");
  }]
];

let passed = 0;
for (const [name, test] of tests) {
  try {
    await test();
    passed += 1;
    report(name, "pass");
  } catch (error) {
    report(name, "fail", error);
  }
}

summary.textContent = `${passed}/${tests.length} browser tests passed.`;
summary.dataset.status = passed === tests.length ? "pass" : "fail";
