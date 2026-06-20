import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { JSDOM } from "jsdom";
import { EldoriaApiClient } from "../../../api/apiClient/index.js";
import { ABILITIES, formatModifier } from "../JsonHelpers.js";
import { PlayerSheetDtoHelper } from "../PlayerSheetDtoHelper.js";
import {
  applyResolvedReferencesToDto,
  resolvePlayerSheetReferences
} from "../ReferenceResolver.js";
import { SheetCompiler } from "../SheetCompiler.js";
import { bootLevelEditor } from "../LevelEditorJavaScript/Core/LevelEditorBuilder.js";
import {
  buildLevelProgression,
  getClassLabel,
  getCurrentLevel,
  getLevelFeatures,
  getPrimaryClass,
  getSubclassLabel,
  getValue,
  isAsiLevelContext,
  MAX_CHARACTER_LEVEL,
  PROFICIENCY_UPDATE_LEVELS,
  shouldShowFeatPicker,
  shouldShowSubclassPicker,
  toArray,
  toNumber
} from "../LevelEditorJavaScript/Core/LevelEditorShared.js";
import {
  buildClassOptionStatus,
  hasClassOptionChoices
} from "../LevelEditorJavaScript/Progression/LevelEditorClassOptionBuilder.js";
import {
  buildBackgroundChoiceStatus,
  hasBackgroundChoiceOptions
} from "../LevelEditorJavaScript/Background/LevelEditorBackgroundChoiceBuilder.js";
import { hasFeatPickerChoices } from "../LevelEditorJavaScript/Progression/LevelEditorFeatBuilder.js";
import { buildRaceOptionStatus } from "../LevelEditorJavaScript/Race/LevelEditorRaceChoiceBuilder.js";
import { hasRaceChoiceOptions } from "../LevelEditorJavaScript/Race/LevelEditorRaceChoiceModel.js";
import { hasLanguagePickerChoices } from "../LevelEditorJavaScript/StartingChoices/LevelEditorLanguageBuilder.js";
import { hasMixedProficiencyPickerChoices } from "../LevelEditorJavaScript/StartingChoices/LevelEditorMixedProficiencyBuilder.js";
import { hasSkillPickerChoices } from "../LevelEditorJavaScript/StartingChoices/LevelEditorSkillBuilder.js";
import { hasToolPickerChoices } from "../LevelEditorJavaScript/StartingChoices/LevelEditorToolBuilder.js";
import { hasWeaponPickerChoices } from "../LevelEditorJavaScript/StartingChoices/LevelEditorWeaponBuilder.js";
import { BuildPlayerSheetFeatsTab } from "../PlayerSheetJavaScript/PlayerSheetFeatsTabBuilder.js";

const DEFAULT_API_BASE_URL = "https://fn-eldoria-ahakafekhxczebhn.eastus-01.azurewebsites.net/api";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(SCRIPT_DIR, "../../..");
const PLAYER_SHEET_HTML_PATH = path.resolve(SCRIPT_DIR, "../PlayerSheet.html");
const OPTIONAL_FEATURES_PATH = path.resolve(DOCS_DIR, "5etools/data/optionalfeatures.json");

function parseArgs(argv) {
  const args = {
    apiBaseUrl: DEFAULT_API_BASE_URL
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--api-base-url" && argv[index + 1]) {
      args.apiBaseUrl = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("--api-base-url=")) {
      args.apiBaseUrl = arg.slice("--api-base-url=".length);
    } else if (arg === "--no-local-fallback") {
      // Live API is always authoritative; accepted for old command lines.
    }
  }

  return args;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function toDisplayText(value, fallback = "") {
  const text = normalizeText(value);
  return text || fallback;
}

function readPath(target, dotPath) {
  return String(dotPath || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, part) => current?.[part], target);
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function createReadOnlyFetch(nativeFetch, auditState) {
  return async (url, init = {}) => {
    const method = String(init?.method || "GET").toUpperCase();
    auditState.httpCalls.push({ method, url: String(url) });
    if (!["GET", "HEAD"].includes(method)) {
      const message = `Blocked non-read API request: ${method} ${url}`;
      auditState.blockedWrites.push(message);
      throw new Error(message);
    }
    return nativeFetch(url, init);
  };
}

function setupDom(html) {
  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    url: "http://127.0.0.1:8080/Players/PlayerSheetTemplate/PlayerSheet.html"
  });

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    HTMLDialogElement: globalThis.HTMLDialogElement,
    DocumentFragment: globalThis.DocumentFragment,
    CustomEvent: globalThis.CustomEvent,
    Event: globalThis.Event,
    Node: globalThis.Node
  };

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLDialogElement = dom.window.HTMLDialogElement;
  globalThis.DocumentFragment = dom.window.DocumentFragment;
  globalThis.CustomEvent = dom.window.CustomEvent;
  globalThis.Event = dom.window.Event;
  globalThis.Node = dom.window.Node;

  if (!dom.window.HTMLDialogElement?.prototype.showModal) {
    dom.window.HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }
  if (!dom.window.HTMLDialogElement?.prototype.close) {
    dom.window.HTMLDialogElement.prototype.close = function close() {
      this.open = false;
    };
  }

  return {
    dom,
    restore() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete globalThis[key];
        } else {
          globalThis[key] = value;
        }
      }
      dom.window.close();
    }
  };
}

function isHidden(element) {
  return Boolean(element?.hidden || element?.closest?.("[hidden]"));
}

function getRowValue(row) {
  return normalizeText(row?.querySelector(".level-editor__row-value")?.textContent);
}

function getRowText(row) {
  return normalizeText(row?.textContent).replace(/\s+/gu, " ");
}

function createFinding(category, message, pathName = "") {
  return {
    category,
    message,
    path: pathName
  };
}

function getLevelContext(compiled, dto, progression, characterLevel, api, optionalFeatureRecords = []) {
  const currentLevel = getCurrentLevel(compiled);
  const progressionEntry = progression.get(characterLevel) || {};
  const classEntry = progressionEntry.classEntry || getPrimaryClass(compiled);
  const levelData = progressionEntry.levelData || null;
  const classLevel = toNumber(progressionEntry.classLevel, characterLevel);
  const features = getLevelFeatures(levelData);

  return {
    api,
    dto,
    compiled,
    onChange: () => {},
    characterLevel,
    optionalFeatureRecords,
    currentLevel,
    classEntry,
    levelData,
    classLevel,
    classLabel: getClassLabel(classEntry),
    subclassLabel: getSubclassLabel(classEntry),
    features,
    isFutureLevel: characterLevel > currentLevel
  };
}

function getLevelDtoIndex(context) {
  return toNumber(context?.characterLevel, 1) - 1;
}

function getLevelHpValue(context) {
  const levelIndex = getLevelDtoIndex(context);
  return toNumber(PlayerSheetDtoHelper.getValue(
    context?.dto,
    `levels.${levelIndex}.hp`,
    context?.levelData?.hpRolled
  ), 0);
}

function normalizeAbilityIncreaseKey(value) {
  return String(value?.ability || value?.key || value?.value || value || "")
    .trim()
    .toLowerCase();
}

function formatAbilityIncreaseSummary(values) {
  const counts = new Map(ABILITIES.map((ability) => [ability.key, 0]));
  for (const value of toArray(values)) {
    const key = normalizeAbilityIncreaseKey(value);
    if (counts.has(key)) {
      counts.set(key, counts.get(key) + 1);
    }
  }

  return ABILITIES
    .map((ability) => {
      const count = counts.get(ability.key) || 0;
      return count ? `${ability.label} ${formatModifier(count)}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function buildExpectedHpStatus(context) {
  const hp = getLevelHpValue(context);
  return hp > 0 ? String(hp) : context.characterLevel === 1 ? "Auto" : "Unset";
}

function buildExpectedAsiStatus(context) {
  const levelIndex = getLevelDtoIndex(context);
  const summary = formatAbilityIncreaseSummary(PlayerSheetDtoHelper.getValue(
    context?.dto,
    `levels.${levelIndex}.AbilityScoreIncrease`,
    []
  ));
  if (summary) {
    return summary;
  }
  return context.features.includes("Ability Score Improvement") ? "Available" : "ASI level";
}

function buildExpectedFeatStatus(dto, context) {
  const levelIndex = getLevelDtoIndex(context);
  const feat = PlayerSheetDtoHelper.getValue(dto, `levels.${levelIndex}.feat`, null);
  const summary = feat?.choiceSummary
    || feat?.choices?.spellcastingClass?.label
    || feat?.choices?.spellcastingClass?.value
    || "";
  return feat?.name ? [feat.name, summary ? `(${summary})` : ""].filter(Boolean).join(" ") : "Optional";
}

function checkRequiredRow(findings, document, id, label, options = {}) {
  const row = document.querySelector(`#${id}`);
  if (!row) {
    findings.push(createFinding("missingControls", `${label} row is missing.`, id));
    return null;
  }

  if (options.visible !== false && isHidden(row)) {
    findings.push(createFinding("hiddenControls", `${label} row is hidden but should be visible.`, id));
  }

  if (options.expectedStatus != null) {
    const actual = getRowValue(row);
    if (actual !== String(options.expectedStatus)) {
      findings.push(createFinding(
        "statusMismatches",
        `${label} status should be "${options.expectedStatus}" but rendered "${actual || "(blank)"}".`,
        id
      ));
    }
  }

  if (options.includes) {
    const text = getRowText(row).toLowerCase();
    const wanted = String(options.includes).toLowerCase();
    if (!text.includes(wanted)) {
      findings.push(createFinding(
        "statusMismatches",
        `${label} row does not include saved value "${options.includes}".`,
        id
      ));
    }
  }

  return row;
}

function checkOptionalChoiceRow(findings, document, id, label, hasChoices) {
  const row = document.querySelector(`#${id}`);
  if (!row) {
    if (hasChoices) {
      findings.push(createFinding("missingControls", `${label} row is missing but choices are available.`, id));
    }
    return null;
  }

  if (hasChoices && isHidden(row)) {
    findings.push(createFinding("hiddenControls", `${label} row is hidden but choices are available.`, id));
  }

  return row;
}

function collectReferenceTargets(dto) {
  const targets = [
    { path: "baseChoices.race", kind: "races" },
    { path: "baseChoices.subrace", kind: "subraces" },
    { path: "baseChoices.background", kind: "backgrounds" }
  ];

  toArray(dto?.levels).forEach((_level, index) => {
    targets.push(
      { path: `levels.${index}.class`, kind: "classes" },
      { path: `levels.${index}.subclass`, kind: "subclasses" },
      { path: `levels.${index}.feat`, kind: "feats" }
    );
  });

  toArray(dto?.inventory?.items).forEach((_item, index) => {
    targets.push({
      path: `inventory.items.${index}.catalog`,
      kind: "items"
    });
  });

  return targets;
}

function hasResolvableIdentity(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return [
    value.options?.catalogId,
    value.catalogId,
    value.id,
    value.refId,
    value.sourceId,
    value.ref,
    value.name
  ].some((entry) => normalizeText(entry));
}

function auditReferenceResolution(dto, references) {
  const findings = [];
  for (const failure of toArray(references?.failures)) {
    findings.push(createFinding(
      "referenceFailures",
      `${failure.kind || "catalog"} lookup failed: ${failure.message || "Unknown error"}.`,
      failure.path || ""
    ));
  }

  for (const target of collectReferenceTargets(dto)) {
    const identity = readPath(dto, target.path);
    if (!hasResolvableIdentity(identity)) {
      continue;
    }
    if (!references?.byPath?.[target.path]) {
      findings.push(createFinding(
        "unresolvedReferences",
        `${target.kind} reference was not resolved for ${toDisplayText(identity.name || identity.id || identity.ref, "selected value")}.`,
        target.path
      ));
    }
  }

  return findings;
}

function auditStructuredCoverage(compiled) {
  const findings = [];
  const coverage = compiled?.optionCoverage || {};
  for (const item of toArray(coverage.missingMappings)) {
    findings.push(createFinding(
      "unmappedStructuredOptions",
      `${item.source || "Catalog"}: ${item.label || item.type} (${item.type || "unknown"}) needs structured catalog mapping.`,
      item.path || ""
    ));
  }
  return findings;
}

function getFeatureNames(compiled) {
  return new Set(toArray(compiled?.features).map((feature) => normalizeText(feature?.name)).filter(Boolean));
}

function getExpectedSavedFeatureNames(dto) {
  const names = [];
  for (const level of toArray(dto?.levels)) {
    for (const feature of toArray(level?.features)) {
      const name = typeof feature === "string" ? feature : feature?.name;
      if (normalizeText(name)) {
        names.push(normalizeText(name));
      }
    }
    if (normalizeText(level?.feat?.name)) {
      names.push(normalizeText(level.feat.name));
    }
  }

  for (const feat of toArray(dto?.baseChoices?.background?.grantedFeats)) {
    if (normalizeText(feat?.name || feat)) {
      names.push(normalizeText(feat?.name || feat));
    }
  }

  return [...new Set(names)];
}

async function auditFeatureRendering(findings, compiled, dto, api, optionalFeatureRecords = []) {
  const featureNames = getFeatureNames(compiled);
  const expectedSavedNames = getExpectedSavedFeatureNames(dto);

  for (const name of expectedSavedNames) {
    if (!featureNames.has(name)) {
      findings.push(createFinding(
        "featureDiscrepancies",
        `Saved feature "${name}" is not present in compiled features.`
      ));
    }
  }

  const tabHost = document.querySelector("#TabContent");
  if (!tabHost) {
    findings.push(createFinding("missingControls", "Feats tab host is missing.", "TabContent"));
    return;
  }

  await BuildPlayerSheetFeatsTab(compiled, {
    api,
    dto,
    optionalFeatureRecords,
    onChange: () => {}
  });

  const renderedFeatureText = normalizeText(tabHost.textContent);
  for (const feature of toArray(compiled?.features)) {
    const name = normalizeText(feature?.name);
    if (name && !renderedFeatureText.includes(name)) {
      findings.push(createFinding(
        "featureDiscrepancies",
        `Compiled feature "${name}" did not render in the Feats tab data source.`
      ));
    }
  }
}

async function auditEditorRows(findings, compiled, runtimeDto, api, optionalFeatureRecords = []) {
  checkRequiredRow(findings, document, "characterNameDiv", "Character Name");
  checkRequiredRow(findings, document, "playerNameDiv", "Player Name");
  checkRequiredRow(findings, document, "raceDiv", "Race", {
    includes: getValue(compiled, "identity.race.name", "") || getValue(runtimeDto, "baseChoices.race.name", "")
  });
  checkRequiredRow(findings, document, "backgroundDiv", "Background", {
    includes: getValue(compiled, "identity.background.name", "") || getValue(runtimeDto, "baseChoices.background.name", "")
  });
  checkRequiredRow(findings, document, "abilityScoreDiv", "Ability Scores");

  const baseCoverage = compiled?.optionCoverage?.byScope?.base;
  if (baseCoverage?.total || baseCoverage?.missingMappings?.length) {
    checkRequiredRow(
      findings,
      document,
      "level-editor-base-body-base-structured-coverage",
      "Base structured options"
    );
  }

  const progression = buildLevelProgression(compiled, runtimeDto);
  for (let characterLevel = 1; characterLevel <= MAX_CHARACTER_LEVEL; characterLevel += 1) {
    const context = getLevelContext(compiled, runtimeDto, progression, characterLevel, api, optionalFeatureRecords);
    const levelIndex = characterLevel - 1;
    const classIdentity = getValue(runtimeDto, `levels.${levelIndex}.class`, null);
    const subclassIdentity = getValue(runtimeDto, `levels.${levelIndex}.subclass`, null);
    const featIdentity = getValue(runtimeDto, `levels.${levelIndex}.feat`, null);

    checkRequiredRow(
      findings,
      document,
      `level-editor-level-${characterLevel}-class`,
      `Level ${characterLevel} class`,
      {
        expectedStatus: `${context.classLabel} ${context.classLevel}`,
        includes: classIdentity?.name || ""
      }
    );

    if (shouldShowSubclassPicker(context)) {
      checkRequiredRow(
        findings,
        document,
        `level-editor-level-${characterLevel}-subclass`,
        `Level ${characterLevel} subclass`,
        {
          includes: subclassIdentity?.name || context.subclassLabel || ""
        }
      );
    }

    const hasClassChoices = await hasClassOptionChoices(context);
    checkOptionalChoiceRow(
      findings,
      document,
      `level-editor-level-${characterLevel}-class-options`,
      `Level ${characterLevel} class options`,
      hasClassChoices
    );
    const classOptionRow = document.querySelector(`#level-editor-level-${characterLevel}-class-options`);
    if (classOptionRow && !isHidden(classOptionRow)) {
      const expected = buildClassOptionStatus(runtimeDto, characterLevel, context);
      if (getRowValue(classOptionRow) !== expected) {
        findings.push(createFinding(
          "statusMismatches",
          `Level ${characterLevel} class options status should be "${expected}" but rendered "${getRowValue(classOptionRow) || "(blank)"}".`,
          `level-editor-level-${characterLevel}-class-options`
        ));
      }
    }

    if (characterLevel === 1) {
      const hasRaceChoices = await hasRaceChoiceOptions(context);
      checkOptionalChoiceRow(findings, document, "level-editor-level-1-race-options", "Level 1 race options", hasRaceChoices);
      const raceOptionsRow = document.querySelector("#level-editor-level-1-race-options");
      if (raceOptionsRow && !isHidden(raceOptionsRow)) {
        const expected = buildRaceOptionStatus(runtimeDto);
        if (getRowValue(raceOptionsRow) !== expected) {
          findings.push(createFinding(
            "statusMismatches",
            `Level 1 race options status should be "${expected}" but rendered "${getRowValue(raceOptionsRow) || "(blank)"}".`,
            "level-editor-level-1-race-options"
          ));
        }
      }

      const hasBackgroundChoices = await hasBackgroundChoiceOptions(context);
      checkOptionalChoiceRow(findings, document, "level-editor-level-1-background-options", "Level 1 background options", hasBackgroundChoices);
      const backgroundOptionsRow = document.querySelector("#level-editor-level-1-background-options");
      if (backgroundOptionsRow && !isHidden(backgroundOptionsRow)) {
        const expected = buildBackgroundChoiceStatus(runtimeDto);
        if (getRowValue(backgroundOptionsRow) !== expected) {
          findings.push(createFinding(
            "statusMismatches",
            `Level 1 background options status should be "${expected}" but rendered "${getRowValue(backgroundOptionsRow) || "(blank)"}".`,
            "level-editor-level-1-background-options"
          ));
        }
      }

      checkOptionalChoiceRow(findings, document, "level-editor-level-1-skills", "Level 1 skills", await hasSkillPickerChoices(context));
      checkOptionalChoiceRow(findings, document, "level-editor-level-1-languages", "Level 1 languages", await hasLanguagePickerChoices(context));
      checkOptionalChoiceRow(findings, document, "level-editor-level-1-tools", "Level 1 tools", await hasToolPickerChoices(context));
      checkOptionalChoiceRow(findings, document, "level-editor-level-1-weapons", "Level 1 weapons", await hasWeaponPickerChoices(context));
      checkOptionalChoiceRow(findings, document, "level-editor-level-1-mixed-proficiencies", "Level 1 mixed proficiencies", await hasMixedProficiencyPickerChoices(context));
    }

    checkRequiredRow(
      findings,
      document,
      `level-editor-level-${characterLevel}-hp`,
      `Level ${characterLevel} HP`,
      {
        expectedStatus: buildExpectedHpStatus(context)
      }
    );

    if (isAsiLevelContext(context)) {
      checkRequiredRow(
        findings,
        document,
        `level-editor-level-${characterLevel}-asi`,
        `Level ${characterLevel} ASI`,
        {
          expectedStatus: buildExpectedAsiStatus(context)
        }
      );
    }

    const levelCoverage = compiled?.optionCoverage?.byScope?.[`level-${characterLevel}`];
    if (levelCoverage?.total || levelCoverage?.missingMappings?.length) {
      checkRequiredRow(
        findings,
        document,
        `level-editor-level-${characterLevel}-body-level-${characterLevel}-structured-coverage`,
        `Level ${characterLevel} structured options`
      );
    }

    const featRowExpected = shouldShowFeatPicker(context) || (characterLevel === 1 && Boolean(getValue(runtimeDto, "baseChoices.race", null)));
    if (featRowExpected) {
      const hasFeatChoices = await hasFeatPickerChoices(context);
      checkOptionalChoiceRow(
        findings,
        document,
        `level-editor-level-${characterLevel}-feat`,
        `Level ${characterLevel} feat`,
        hasFeatChoices
      );
      const featRow = document.querySelector(`#level-editor-level-${characterLevel}-feat`);
      if (featRow && !isHidden(featRow)) {
        const expected = buildExpectedFeatStatus(runtimeDto, context);
        if (getRowValue(featRow) !== expected) {
          findings.push(createFinding(
            "statusMismatches",
            `Level ${characterLevel} feat status should be "${expected}" but rendered "${getRowValue(featRow) || "(blank)"}".`,
            `level-editor-level-${characterLevel}-feat`
          ));
        }
        if (featIdentity?.name && !getRowText(featRow).toLowerCase().includes(featIdentity.name.toLowerCase())) {
          findings.push(createFinding(
            "statusMismatches",
            `Level ${characterLevel} feat row does not include selected feat "${featIdentity.name}".`,
            `level-editor-level-${characterLevel}-feat`
          ));
        }
      }
    }

    checkRequiredRow(findings, document, `level-editor-level-${characterLevel}-summary-row`, `Level ${characterLevel} summary`);
    checkRequiredRow(findings, document, `level-editor-level-${characterLevel}-class-features`, `Level ${characterLevel} class features`);

    if (PROFICIENCY_UPDATE_LEVELS.has(characterLevel)) {
      checkRequiredRow(
        findings,
        document,
        `level-editor-level-${characterLevel}-proficiency-bonus`,
        `Level ${characterLevel} proficiency bonus`
      );
    }
  }
}

function categorizeFindings(findings) {
  const categories = {
    missingControls: [],
    hiddenControls: [],
    unmappedStructuredOptions: [],
    referenceFailures: [],
    unresolvedReferences: [],
    statusMismatches: [],
    featureDiscrepancies: [],
    blockedWrites: []
  };

  for (const finding of findings) {
    const bucket = categories[finding.category] || (categories[finding.category] = []);
    bucket.push(finding);
  }

  return categories;
}

function countFindings(categories) {
  return Object.values(categories).reduce((total, list) => total + list.length, 0);
}

function hasFailingFindings(categories) {
  return [
    "missingControls",
    "hiddenControls",
    "referenceFailures",
    "unresolvedReferences",
    "statusMismatches",
    "featureDiscrepancies",
    "blockedWrites"
  ].some((category) => categories[category]?.length);
}

function hasWarningFindings(categories) {
  return Boolean(categories.unmappedStructuredOptions?.length);
}

function statusForCategories(categories) {
  if (hasFailingFindings(categories)) {
    return "fail";
  }
  if (hasWarningFindings(categories)) {
    return "warn";
  }
  return "pass";
}

async function loadLiveRoster(api) {
  return {
    manifest: await api.getPlayersManifest(),
    source: "Live API"
  };
}

async function loadCharacter(api, player) {
  return api.getCharacterSheet(player.id);
}

async function auditCharacter(player, rawSheet, api, html, optionalFeatureRecords = []) {
  const findings = [];
  const normalized = PlayerSheetDtoHelper.normalize(rawSheet, {
    id: player.id || rawSheet?.id
  });
  const strictDto = PlayerSheetDtoHelper.toSaveDto(normalized, {
    id: player.id || normalized.id
  });

  const references = await resolvePlayerSheetReferences(strictDto, api);
  findings.push(...auditReferenceResolution(strictDto, references));

  const runtimeDto = applyResolvedReferencesToDto(strictDto, references);
  const compiled = SheetCompiler.compile(strictDto, {
    references
  });
  findings.push(...auditStructuredCoverage(compiled));

  const domHandle = setupDom(html);
  try {
    bootLevelEditor({
      dto: runtimeDto,
      saveDto: strictDto,
      compiled,
      references,
      api,
      showStructuredOptionCoverage: true,
      onChange: () => {
        findings.push(createFinding("blockedWrites", "Level editor attempted to emit a DTO change during audit render."));
      }
    });

    await auditEditorRows(findings, compiled, runtimeDto, api, optionalFeatureRecords);
    await auditFeatureRendering(findings, compiled, strictDto, api, optionalFeatureRecords);
  } finally {
    domHandle.restore();
  }

  const categories = categorizeFindings(findings);
  return {
    id: strictDto.id || player.id,
    playerName: player.playerName || strictDto.identity?.playerName || "",
    characterName: strictDto.identity?.name || player.characterName || player.id,
    level: compiled.level,
    classSummary: toArray(compiled.classes)
      .map((entry) => [entry.main || entry.name, entry.sub ? `(${entry.sub})` : "", entry.total ? `${entry.total}` : ""].filter(Boolean).join(" "))
      .join(", "),
    coverage: compiled.optionCoverage,
    references,
    categories,
    status: statusForCategories(categories),
    issueCount: countFindings(categories)
  };
}

function escapeMarkdown(value) {
  return String(value || "").replace(/\|/gu, "\\|");
}

function findingLine(finding) {
  return `- ${finding.path ? `\`${finding.path}\`: ` : ""}${finding.message}`;
}

function renderFindingsSection(character) {
  const groups = [
    ["Missing editor controls", character.categories.missingControls],
    ["Hidden controls that should be shown", character.categories.hiddenControls],
    ["Unmapped structured options", character.categories.unmappedStructuredOptions],
    ["Catalog/reference failures", [
      ...character.categories.referenceFailures,
      ...character.categories.unresolvedReferences
    ]],
    ["Compiled feature or status discrepancies", [
      ...character.categories.statusMismatches,
      ...character.categories.featureDiscrepancies
    ]],
    ["Read-only safety violations", character.categories.blockedWrites]
  ].filter(([, findings]) => findings.length);

  if (!groups.length) {
    return `### ${character.characterName}\n- No findings.`;
  }

  return [
    `### ${character.characterName}`,
    ...groups.flatMap(([title, findings]) => [
      `**${title}**`,
      ...findings.map(findingLine)
    ])
  ].join("\n");
}

function buildLikelyFixes(results) {
  const fixes = [];
  const allCategories = results.flatMap((result) => Object.entries(result.categories)
    .flatMap(([category, findings]) => findings.map((finding) => ({ category, finding, character: result.characterName }))));

  if (allCategories.some((entry) => entry.category === "unresolvedReferences" || entry.category === "referenceFailures")) {
    fixes.push("- Resolve missing catalog IDs/names in saved DTO references or seed the missing catalog records.");
  }
  if (allCategories.some((entry) => entry.category === "unmappedStructuredOptions")) {
    fixes.push("- Add structured option mapping support for the reported catalog choice types or mark truly unsupported types explicitly.");
  }
  if (allCategories.some((entry) => entry.category === "hiddenControls" || entry.category === "missingControls")) {
    fixes.push("- Align level editor row rendering with the exported choice predicates for the reported controls.");
  }
  if (allCategories.some((entry) => entry.category === "statusMismatches")) {
    fixes.push("- Reconcile affected status builders with the DTO values used by `bootLevelEditor`.");
  }
  if (allCategories.some((entry) => entry.category === "featureDiscrepancies")) {
    fixes.push("- Update `SheetCompiler.compile` feature collection or Feats tab hydration for the reported saved features.");
  }
  if (allCategories.some((entry) => entry.category === "blockedWrites")) {
    fixes.push("- Remove side effects from level editor boot/render paths before using the audit in CI.");
  }

  return fixes.length ? fixes.join("\n") : "- No confirmed renderer/compiler fixes needed.";
}

function renderReport({ source, roster, results, auditState }) {
  const overall = results.some((result) => result.status === "fail")
    ? "fail"
    : results.some((result) => result.status === "warn")
      ? "warn"
      : "pass";

  const lines = [
    "# Player Sheet Level Editor Audit",
    "",
    `Overall status: **${overall.toUpperCase()}**`,
    `Source: ${source}`,
    `Active sheets audited: ${results.length} of ${toArray(roster.characters).length}`,
    `HTTP methods observed: ${[...new Set(auditState.httpCalls.map((call) => call.method))].join(", ") || "none"}`,
    auditState.blockedWrites.length
      ? `Blocked write attempts: ${auditState.blockedWrites.length}`
      : "Blocked write attempts: 0",
    "",
    "## Per-character summary",
    "",
    "| Character | Player | Level | Class | Status | Issues | Structured Options | Reference Failures |",
    "|---|---|---:|---|---|---:|---:|---:|",
    ...results.map((result) => [
      escapeMarkdown(result.characterName),
      escapeMarkdown(result.playerName),
      result.level,
      escapeMarkdown(result.classSummary || "Unknown"),
      result.status.toUpperCase(),
      result.issueCount,
      `${result.coverage?.mappedStructuredOptions || 0}/${result.coverage?.totalStructuredOptions || 0}`,
      toArray(result.references?.failures).length
    ].join(" | ")).map((row) => `| ${row} |`),
    "",
    "## Findings",
    "",
    ...results.map(renderFindingsSection),
    "",
    "## Likely fixes",
    "",
    buildLikelyFixes(results)
  ];

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv);
  const auditState = {
    httpCalls: [],
    blockedWrites: []
  };
  const api = new EldoriaApiClient({
    baseUrl: options.apiBaseUrl,
    fetch: createReadOnlyFetch(globalThis.fetch.bind(globalThis), auditState)
  });
  const html = await readFile(PLAYER_SHEET_HTML_PATH, "utf8");
  const optionalFeatureData = await readJsonFile(OPTIONAL_FEATURES_PATH);
  const optionalFeatureRecords = toArray(optionalFeatureData?.optionalfeature);
  const { manifest, source } = await loadLiveRoster(api);
  const activePlayers = toArray(manifest?.characters).filter((player) => normalizeText(player?.status || "active") === "active");
  const results = [];

  for (const player of activePlayers) {
    const rawSheet = await loadCharacter(api, player);
    results.push(await auditCharacter(player, rawSheet, api, html, optionalFeatureRecords));
  }

  console.log(renderReport({
    source,
    roster: manifest,
    results,
    auditState
  }));
}

main().catch((error) => {
  console.error(`# Player Sheet Level Editor Audit\n\nOverall status: **ERROR**\n\n${error.stack || error.message || String(error)}`);
  process.exitCode = 1;
});
