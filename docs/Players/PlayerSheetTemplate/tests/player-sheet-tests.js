import { PlayerSheetDtoHelper } from "../PlayerSheetDtoHelper.js";
import {
  applyResolvedReferencesToDto,
  resolvePlayerSheetReferences
} from "../ReferenceResolver.js";
import { SheetCompiler } from "../SheetCompiler.js";
import { createStructuredOptionCoverage } from "../StructuredOptionCoverage.js";
import { BuildPlayerSheetDefenseTab } from "../PlayerSheetJavaScript/PlayerSheetDefenseTabBuilder.js";
import { BuildPlayerSheetHeader } from "../PlayerSheetJavaScript/PlayerSheetHeaderBuilder.js";
import { createEquipToggle } from "../PlayerSheetJavaScript/PlayerSheetTabHelpers.js";

const results = document.querySelector("#test-results");
const summary = document.querySelector("#test-summary");
const fixture = document.querySelector("#test-fixture");

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
      experience: 6500
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
        feature: "Military Rank"
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
  ["structured option coverage reports mapped and unmapped choices", () => {
    const coverage = createStructuredOptionCoverage(createDto());
    assert(coverage.totalStructuredOptions >= 2, "coverage should count structured options");
    assert(coverage.missingMappings.some((item) => item.type === "mystery-option"), "unknown option type should need mapping");
  }],
  ["compiler owns defenses and table facts once", () => {
    const compiled = SheetCompiler.compile(createDto());
    assertEqual(compiled.displayIndex.facts.damageResistances, "header", "resistance display owner");
    assertEqual(compiled.displayIndex.facts.defensiveGear, "defense", "defensive gear display owner");
    assertEqual(compiled.displayIndex.facts.skills, "sidebar", "skill display owner");
    assertIncludes(compiled.defenses.damageResistances, "cold", "manual resistance should compile");
    assertIncludes(compiled.defenses.damageVulnerabilities, "radiant", "manual vulnerability should compile");
    assertIncludes(compiled.defenses.conditionImmunities, "poisoned", "manual condition immunity should compile");
    assertIncludes(compiled.defenses.damageImmunities, "poison", "item immunity should compile");
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
