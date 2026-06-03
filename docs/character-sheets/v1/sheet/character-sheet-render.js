import {
  hasCompanionTabContent,
  hasSpellTabContent,
  renderCharacterSheetTab
} from "./character-sheet-readonly-render.js";
import {
  getSavingThrowCards,
  getSkillCards,
  getSpellcastingMath
} from "./sheet-rules.js";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(",");
const CHARACTER_SHEET_TAB_DEFINITIONS = [
  { id: "overview", label: "Actions" },
  { id: "combat", label: "Defenses" },
  { id: "inventory", label: "Inventory" },
  { id: "spells", label: "Spells" },
  { id: "pets", label: "Companions" },
  { id: "notes", label: "Character" },
  { id: "features", label: "Features" },
  { id: "skills", label: "Skills" },
  { id: "raw-json", label: "Raw JSON", editOnly: true }
];
const CHARACTER_SHEET_TAB_IDS = new Set(CHARACTER_SHEET_TAB_DEFINITIONS.map((tab) => tab.id));

export const DEFAULT_CHARACTER_SHEET_TABS = CHARACTER_SHEET_TAB_DEFINITIONS.map((tab) => tab.id);

export function normalizeCharacterSheetTabId(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/_/g, "-");
  const aliases = {
    all: "overview",
    full: "overview",
    weapons: "overview",
    attacks: "overview",
    action: "overview",
    actions: "overview",
    defense: "combat",
    defenses: "combat",
    gear: "inventory",
    inventory: "inventory",
    details: "notes",
    character: "notes",
    feats: "features",
    feature: "features",
    proficiencies: "skills",
    training: "skills",
    skill: "skills",
    classes: "spells",
    spellcasting: "spells",
    equipment: "inventory",
    companions: "pets",
    status: "notes",
    raw: "raw-json",
    json: "raw-json"
  };
  const id = aliases[normalized] ?? normalized;
  return CHARACTER_SHEET_TAB_IDS.has(id) ? id : "";
}

function uniqueTabs(values = []) {
  const seen = new Set();
  const tabs = [];

  for (const value of values) {
    const id = normalizeCharacterSheetTabId(value);
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    tabs.push(id);
  }

  return tabs;
}

function tabHasVisibleContent(tab, character, mode) {
  if (!character || mode === "edit") {
    return true;
  }

  if (tab.id === "spells") {
    return hasSpellTabContent(character);
  }

  if (tab.id === "pets") {
    return hasCompanionTabContent(character);
  }

  return true;
}

export function resolveCharacterSheetTabs(options = {}) {
  const mode = options.mode ?? "view";
  const character = options.character ?? options.characterDto ?? null;
  const requestedTabs = Array.isArray(options.visibleTabs) && options.visibleTabs.length
    ? uniqueTabs(options.visibleTabs)
    : [...DEFAULT_CHARACTER_SHEET_TABS];
  const visibleTabs = CHARACTER_SHEET_TAB_DEFINITIONS
    .filter((tab) => requestedTabs.includes(tab.id))
    .filter((tab) => !tab.editOnly || mode === "edit")
    .filter((tab) => tabHasVisibleContent(tab, character, mode));
  const fallbackTabs = visibleTabs.length
    ? visibleTabs
    : CHARACTER_SHEET_TAB_DEFINITIONS.filter((tab) => tab.id === "overview");
  const activeTab = normalizeCharacterSheetTabId(options.activeTab) || "overview";
  const resolvedActiveTab = fallbackTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : fallbackTabs[0].id;

  return {
    activeTab: resolvedActiveTab,
    visibleTabs: fallbackTabs.map((tab) => tab.id),
    tabs: fallbackTabs.map((tab) => ({
      ...tab,
      active: tab.id === resolvedActiveTab
    }))
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll(/[-_]+/g, " ")
    .replaceAll(/\bdto\b/gi, "DTO")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function formatStatus(value, fallback = "idle") {
  const normalized = String(value ?? fallback).trim() || fallback;
  const labels = {
    idle: "Idle",
    loading: "Loading",
    loaded: "Loaded",
    "loaded-with-issues": "Loaded with issues",
    failed: "Failed",
    conflict: "Conflict",
    saving: "Saving",
    saved: "Saved",
    unavailable: "Unavailable",
    exported: "Exported",
    downloaded: "Downloaded",
    "download-unavailable": "Download unavailable",
    "stale-loaded-data": "Stale loaded data",
    "character-id-conflict": "Character id conflict",
    available: "Available",
    disabled: "Disabled",
    dirty: "Unsaved",
    clean: "Clean",
    "view-only": "View only",
    "missing-character": "No character",
    "opener-unavailable": "Opener unavailable",
    opening: "Opening",
    opened: "Opened",
    "save-synced": "Save synced",
    "save-issues": "Save issues",
    "export-synced": "Export synced",
    "export-issues": "Export issues"
  };

  return labels[normalized] ?? titleCase(normalized);
}

function getStatusTone(value, options = {}) {
  const normalized = String(value ?? "").trim();

  if (options.count != null) {
    return Number(options.count) > 0 ? "warning" : "good";
  }

  if (["loaded", "saved", "exported", "available", "clean", "opened", "save-synced", "export-synced"].includes(normalized)) {
    return "good";
  }

  if (["loading", "saving", "dirty", "opening"].includes(normalized)) {
    return "info";
  }

  if (["loaded-with-issues", "view-only", "save-issues", "export-issues"].includes(normalized)) {
    return "warning";
  }

  if (["failed", "unavailable", "missing-character", "opener-unavailable", "conflict"].includes(normalized)) {
    return "danger";
  }

  return "neutral";
}

function isDomElement(value) {
  return Boolean(value)
    && typeof value === "object"
    && (value.nodeType === 1 || (typeof Element !== "undefined" && value instanceof Element));
}

function resolveMountTarget(mount) {
  if (typeof document === "undefined") {
    return null;
  }

  if (isDomElement(mount)) {
    return mount;
  }

  if (typeof mount === "string" && mount.trim() && typeof document.querySelector === "function") {
    return document.querySelector(mount);
  }

  return null;
}

function stripJsonExtension(value) {
  return String(value ?? "").trim().replace(/\.json$/i, "");
}

function cleanRefName(ref) {
  return stripJsonExtension(ref)
    .replace(/^(background|class|race|subclass|feat)-/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatModifier(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "-";
  }

  return number >= 0 ? `+${number}` : String(number);
}

function formatClassSummary(character) {
  const classes = Array.isArray(character?.classes) ? character.classes : [];
  const summary = classes
    .map((entry) => {
      const className = cleanRefName(entry?.main || entry?.classRef || entry?.name);
      const level = Array.isArray(entry?.levels) ? entry.levels.length : Number(entry?.level ?? 0);
      const subclass = entry?.sub ? ` (${entry.sub})` : "";
      return `${className}${level ? ` ${level}` : ""}${subclass}`;
    })
    .filter(Boolean)
    .join(" / ");

  return summary || `Level ${character?.level ?? "-"} character`;
}

function formatRace(identity = {}) {
  const race = identity.race ?? {};
  return [race.name, race.subrace].filter(Boolean).join(", ") || "-";
}

function formatBackground(identity = {}) {
  return identity.background?.name || "-";
}

function formatHp(character = {}) {
  const current = character.hp?.current ?? 0;
  const max = character.hp?.max ?? character.hp?.base ?? 0;
  const temp = Number(character.hp?.temp ?? 0);
  return `${current}/${max}${temp > 0 ? ` +${temp} temp` : ""}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getValidationStatus(snapshot = {}) {
  const summary = snapshot.validationSummary ?? {};
  return summary.ok ? "loaded" : "loaded-with-issues";
}

function getBuilderDisplayStatus(snapshot = {}) {
  const handoffStatus = String(snapshot.builderHandoffStatus ?? "idle").trim();
  if (handoffStatus && handoffStatus !== "idle") {
    return handoffStatus;
  }

  const status = snapshot.builderStatus ?? {};
  if (!status.enabled) {
    return "disabled";
  }

  if (!status.hasCharacter) {
    return "missing-character";
  }

  return status.hasOpener ? "available" : "opener-unavailable";
}

function isExportOnlyPersistence(snapshot = {}) {
  return snapshot.config?.persistenceMode === "export-only";
}

function renderStatusPill(label, value, options = {}) {
  const tone = options.tone ?? getStatusTone(value, options);
  const detail = options.detail ? `<small>${escapeHtml(options.detail)}</small>` : "";

  return `
    <div class="character-sheet-status-pill character-sheet-status-${escapeHtml(tone)}" data-status="${escapeHtml(value)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(formatStatus(value))}</strong>
      ${detail}
    </div>
  `;
}

function renderValidationList(issues = []) {
  if (!issues.length) {
    return "";
  }

  return `
    <aside class="character-sheet-issues" aria-label="Character sheet warnings">
      <ul>
        ${issues.map((issue) => `
          <li data-severity="${escapeHtml(issue.severity)}">
            <strong>${escapeHtml(titleCase(issue.code || issue.severity || "issue"))}</strong>
            <span>${escapeHtml(issue.message || "Sheet issue")}</span>
          </li>
        `).join("")}
      </ul>
    </aside>
  `;
}

function renderActionButton(action, label, options = {}) {
  const disabled = options.disabled ? " disabled" : "";
  const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  const tone = options.primary ? " character-sheet-button-primary" : options.quiet ? " character-sheet-button-quiet" : "";

  return `
    <button
      type="button"
      class="character-sheet-button${tone}"
      data-sheet-action="${escapeHtml(action)}"
      ${disabled}${title}
    >${escapeHtml(label)}</button>
  `;
}

function renderActions(snapshot = {}) {
  const character = snapshot.character ?? null;
  const config = snapshot.config ?? {};
  const mode = config.mode ?? "view";
  const builderStatus = snapshot.builderStatus ?? {};
  const exportOnly = isExportOnlyPersistence(snapshot);
  const canSave = Boolean(character && mode !== "view" && !exportOnly);
  const canExport = Boolean(character);
  const canReload = Boolean(config.characterId && (config.characterUrl || config.characterBaseUrl));
  const canOpenBuilder = Boolean(
    config.builder?.enabled
    && builderStatus.hasCharacter
    && builderStatus.hasOpener
    && mode !== "view"
  );

  return `
    <div class="character-sheet-app-actions">
      ${exportOnly
        ? renderActionButton("export", "Export Draft", {
            primary: true,
            disabled: !canExport,
            title: "Downloads a draft JSON file. Canonical character files remain DM-controlled."
          })
        : [
            renderActionButton("save", "Save", {
              primary: true,
              disabled: !canSave,
              title: mode === "view" ? "Save is disabled in view mode." : ""
            }),
            renderActionButton("export", "Export", {
              disabled: !canExport
            })
          ].join("")}
      ${renderActionButton("reload", "Reload", {
        disabled: !canReload,
        quiet: true
      })}
      ${config.builder?.enabled ? renderActionButton("open-builder", "Open Builder", {
        disabled: !canOpenBuilder,
        quiet: true,
        title: !builderStatus.hasOpener ? "No builder opener was supplied." : ""
      }) : ""}
    </div>
  `;
}

function renderSummaryItem(label, value, options = {}) {
  const accent = options.accent ? " character-sheet-summary-accent" : "";
  return `
    <div class="character-sheet-summary-item${accent}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderCharacterSummaryStrip(snapshot = {}) {
  const character = snapshot.character ?? null;
  if (!character) {
    return "";
  }

  const identity = character.identity ?? {};
  const issueCount = Number(snapshot.validationSummary?.issueCount ?? snapshot.validationIssues?.length ?? 0);
  const warningLabel = issueCount === 1 ? "1 issue" : `${issueCount} issues`;

  return `
    <section class="character-sheet-summary-strip" aria-label="Character summary">
      ${renderSummaryItem("Level", `Level ${character.level ?? "-"}`, { accent: true })}
      ${renderSummaryItem("Class", formatClassSummary(character))}
      ${renderSummaryItem("Ancestry", formatRace(identity))}
      ${renderSummaryItem("Background", formatBackground(identity))}
      ${renderSummaryItem("Init", formatModifier(character.initiative))}
      ${renderSummaryItem("Prof", formatModifier(character.proficiencyBonus))}
      ${renderSummaryItem("Warnings", warningLabel)}
    </section>
  `;
}

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_SHORT_LABELS = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
};

function getAbilityModifier(character = {}, ability) {
  const score = Number(character.abilities?.[ability]?.score ?? 10);
  return Math.floor((score - 10) / 2);
}

function getPrimaryClass(character = {}) {
  return toArray(character.classes)[0] ?? null;
}

function getPrimaryClassName(character = {}) {
  const primary = getPrimaryClass(character);
  return cleanRefName(primary?.main || primary?.classRef || primary?.name || "Class");
}

function getPrimarySpellcasting(character = {}) {
  return toArray(character.classes).find((entry) => entry?.spellcasting)?.spellcasting ?? null;
}

function getClassDc(character = {}) {
  const spellcasting = getPrimarySpellcasting(character);
  if (spellcasting) {
    const math = getSpellcastingMath(character, spellcasting);
    if (Number.isFinite(Number(math.spellSaveDc))) {
      return {
        label: `${String(spellcasting.ability ?? "").toUpperCase() || "Spell"} DC`,
        value: math.spellSaveDc
      };
    }
  }

  const bestAbilityModifier = Math.max(...ABILITY_ORDER.map((ability) => getAbilityModifier(character, ability)));
  return {
    label: `${getPrimaryClassName(character)} DC`,
    value: 8 + Number(character.proficiencyBonus ?? 0) + bestAbilityModifier
  };
}

function getShieldLabel(character = {}) {
  const shieldItem = toArray(character.inventory?.carried)
    .find((item) => item?.equipped && /shield/i.test(item?.name ?? ""));
  return shieldItem?.name ?? "No Shield";
}

function renderConsoleField(label, value, options = {}) {
  const action = options.action ? ` data-sheet-action="${escapeHtml(options.action)}"` : "";
  const disabled = options.disabled ? " disabled" : "";
  const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  const tag = options.action ? "button" : "div";

  return `
    <${tag} class="character-sheet-console-field${options.action ? " character-sheet-console-button" : ""}"${action}${disabled}${title}>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </${tag}>
  `;
}

function renderAbilityConsole(character = {}) {
  return `
    <div class="character-sheet-ability-console" aria-label="Ability modifiers">
      ${ABILITY_ORDER.map((ability) => `
        <div class="character-sheet-ability-cell">
          <span>${escapeHtml(ABILITY_SHORT_LABELS[ability])}</span>
          <strong>${escapeHtml(formatModifier(getAbilityModifier(character, ability)))}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMovementConsole(character = {}) {
  return `
    <div class="character-sheet-movement-console" aria-label="Size and speed">
      <div class="character-sheet-icon-metric">
        <span class="character-sheet-metric-mark">SZ</span>
        <span><strong>SIZE</strong>${escapeHtml(character.identity?.size ?? "Medium")}</span>
      </div>
      <div class="character-sheet-icon-metric">
        <span class="character-sheet-metric-mark">MV</span>
        <span><strong>SPEED</strong>${escapeHtml(character.speed?.value ?? "-")} ft.</span>
      </div>
    </div>
  `;
}

function renderSavingThrowConsole(character = {}) {
  return `
    <div class="character-sheet-save-console" aria-label="Saving throws">
      ${getSavingThrowCards(character).map((save) => `
        <div class="character-sheet-save-row">
          <span class="character-sheet-prof-dot${save.proficient ? " character-sheet-prof-trained" : ""}">${save.proficient ? "P" : "-"}</span>
          <strong>${escapeHtml(formatModifier(save.total))}</strong>
          <span>${escapeHtml(save.label)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTopConsole(snapshot = {}) {
  const character = snapshot.character ?? null;
  if (!character) {
    return "";
  }

  const mode = snapshot.config?.mode ?? "view";
  const hpCurrent = character.hp?.current ?? 0;
  const hpMax = character.hp?.max ?? character.hp?.base ?? 0;

  return `
    <div class="character-sheet-top-console">
      <section class="character-sheet-identity-console" aria-label="Character identity and core combat stats">
        <div class="character-sheet-console-row character-sheet-console-row-fields">
          ${renderConsoleField("Level", character.level ?? "-")}
          ${renderConsoleField("XP", character.identity?.experience ?? 0)}
          ${renderConsoleField("Character Name", character.identity?.name ?? "Unknown Adventurer")}
        </div>
        <div class="character-sheet-console-row character-sheet-console-row-stats">
          ${renderMovementConsole(character)}
          ${renderAbilityConsole(character)}
        </div>
        <div class="character-sheet-combat-console">
          <button
            type="button"
            class="character-sheet-ac-badge character-sheet-console-chip-button"
            data-sheet-action="ac-details"
            aria-label="Open armor class details"
          >
            <span>AC</span>
            <strong>${escapeHtml(character.ac?.value ?? "-")}</strong>
          </button>
          <div class="character-sheet-vitals">
            <button
              type="button"
              class="character-sheet-hp-bar character-sheet-console-chip-button"
              data-sheet-action="hp-details"
              aria-label="Open hit point details"
            ><span>HP ${escapeHtml(hpCurrent)} / ${escapeHtml(hpMax)}</span></button>
            <div class="character-sheet-shield-bar"><span>${escapeHtml(getShieldLabel(character))}</span></div>
          </div>
          ${renderSavingThrowConsole(character)}
        </div>
      </section>

      <section class="character-sheet-action-console" aria-label="Table actions">
        <button type="button" class="character-sheet-wide-action" data-sheet-action="long-rest"${mode === "view" ? " disabled" : ""}>Rest</button>
        <div class="character-sheet-utility-actions">
          ${renderActions(snapshot)}
        </div>
      </section>
    </div>
  `;
}

function renderLeftRailMetric(label, value, detail = "") {
  return `
    <div class="character-sheet-rail-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </div>
  `;
}

function renderSkillTrainingDot(skill = {}) {
  if (skill.expertise) {
    return `<span class="character-sheet-prof-dot character-sheet-prof-expert">E</span>`;
  }

  if (skill.proficient) {
    return `<span class="character-sheet-prof-dot character-sheet-prof-trained">P</span>`;
  }

  return `<span class="character-sheet-prof-dot">-</span>`;
}

function renderLeftRail(character = {}) {
  const classDc = getClassDc(character);
  const perception = getSkillCards(character).find((skill) => skill.skill === "perception");
  const skills = getSkillCards(character);

  return `
    <aside class="character-sheet-left-rail" aria-label="Quick reference">
      <section class="character-sheet-rail-card">
        ${renderLeftRailMetric(classDc.label, classDc.value)}
      </section>
      <section class="character-sheet-rail-card character-sheet-rail-stack">
        ${renderLeftRailMetric("Perception", perception ? formatModifier(perception.total) : "-", perception ? `Passive ${perception.passive}` : "")}
        ${renderLeftRailMetric("Initiative", formatModifier(character.initiative ?? 0))}
      </section>
      <section class="character-sheet-rail-card character-sheet-skill-list">
        ${skills.map((skill) => `
          <div class="character-sheet-skill-row">
            ${renderSkillTrainingDot(skill)}
            <strong>${escapeHtml(formatModifier(skill.total))}</strong>
            <span>${escapeHtml(skill.label)}</span>
          </div>
        `).join("")}
      </section>
    </aside>
  `;
}

function renderTableStateButton(action, label, attributes = {}, options = {}) {
  const disabled = options.disabled ? " disabled" : "";
  const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  const tone = options.danger ? " character-sheet-table-button-danger" : options.quiet ? " character-sheet-table-button-quiet" : "";
  const attributeText = Object.entries(attributes)
    .filter(([, value]) => value != null && value !== "")
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join("");

  return `
    <button
      type="button"
      class="character-sheet-table-button${tone}"
      data-sheet-action="${escapeHtml(action)}"
      ${disabled}${title}${attributeText}
    >${escapeHtml(label)}</button>
  `;
}

function renderNumberControl(name, value = 1, options = {}) {
  return `
    <input
      type="number"
      class="character-sheet-table-input"
      data-sheet-control="${escapeHtml(name)}"
      value="${escapeHtml(value)}"
      min="${escapeHtml(options.min ?? 0)}"
      max="${escapeHtml(options.max ?? "")}"
      step="${escapeHtml(options.step ?? 1)}"
      aria-label="${escapeHtml(options.label ?? name)}"
    >
  `;
}

function renderTableStateMetric(label, value) {
  return `
    <div class="character-sheet-table-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderHpControls(character, disabled) {
  const hp = character.hp ?? {};
  return `
    <article class="character-sheet-table-card character-sheet-table-card-accent" data-sheet-control-group>
      <div class="character-sheet-table-card-head">
        <h3>HP</h3>
        <strong>${escapeHtml(hp.current ?? 0)} / ${escapeHtml(hp.max ?? 0)}${toNumber(hp.temp) > 0 ? ` +${escapeHtml(hp.temp)} temp` : ""}</strong>
      </div>
      <div class="character-sheet-table-row">
        ${renderNumberControl("hp-amount", 1, { label: "HP amount" })}
        ${renderTableStateButton("hp-damage", "Damage", { "data-amount-control": "hp-amount" }, { disabled, danger: true })}
        ${renderTableStateButton("hp-heal", "Heal", { "data-amount-control": "hp-amount" }, { disabled })}
      </div>
      <div class="character-sheet-table-row">
        ${renderNumberControl("hp-temp", hp.temp ?? 0, { label: "Temporary HP" })}
        ${renderTableStateButton("hp-temp", "Set Temp", { "data-amount-control": "hp-temp" }, { disabled, quiet: true })}
        ${renderTableStateButton("hp-sync-max", "Full HP", {}, { disabled, quiet: true })}
      </div>
    </article>
  `;
}

function renderDeathSaveControls(character, disabled) {
  const deathSaves = character.deathSaves ?? {};
  return `
    <article class="character-sheet-table-card" data-sheet-control-group>
      <div class="character-sheet-table-card-head">
        <h3>Death Saves</h3>
        <strong>${escapeHtml(deathSaves.successes ?? 0)} / ${escapeHtml(deathSaves.failures ?? 0)}</strong>
      </div>
      <div class="character-sheet-stepper">
        <span>Success</span>
        <strong>${escapeHtml(deathSaves.successes ?? 0)} / 3</strong>
        ${renderTableStateButton("death-save-success", "-", { "data-delta": "-1" }, { disabled, quiet: true })}
        ${renderTableStateButton("death-save-success", "+", { "data-delta": "1" }, { disabled })}
      </div>
      <div class="character-sheet-stepper">
        <span>Failure</span>
        <strong>${escapeHtml(deathSaves.failures ?? 0)} / 3</strong>
        ${renderTableStateButton("death-save-failure", "-", { "data-delta": "-1" }, { disabled, quiet: true })}
        ${renderTableStateButton("death-save-failure", "+", { "data-delta": "1" }, { disabled, danger: true })}
      </div>
      <div class="character-sheet-table-row">
        ${renderTableStateButton("death-save-reset", "Clear", {}, { disabled, quiet: true })}
      </div>
    </article>
  `;
}

function renderStatusControls(character, disabled) {
  return `
    <article class="character-sheet-table-card" data-sheet-control-group>
      <div class="character-sheet-table-card-head">
        <h3>Inspiration</h3>
        <strong>${escapeHtml(character.identity?.inspiration ? "Inspired" : "No inspiration")}</strong>
      </div>
      <div class="character-sheet-table-row">
        ${renderTableStateButton("inspiration-toggle", character.identity?.inspiration ? "Clear Inspiration" : "Set Inspiration", {}, { disabled })}
      </div>
    </article>
  `;
}

function renderHitDiceControls(character, disabled) {
  const hitDice = toArray(character.hitDice);
  return `
    <article class="character-sheet-table-card">
      <div class="character-sheet-table-card-head">
        <h3>Hit Dice</h3>
        <strong>${escapeHtml(hitDice.map((die) => `${die.remaining ?? 0}/${die.total ?? 0} ${die.size ?? ""}`).join(", ") || "-")}</strong>
      </div>
      <div class="character-sheet-table-list">
        ${hitDice.length
          ? hitDice.map((die, index) => `
            <div class="character-sheet-table-list-row">
              <span>${escapeHtml([die.class, die.size].filter(Boolean).join(" "))}</span>
              <strong>${escapeHtml(die.remaining ?? 0)} / ${escapeHtml(die.total ?? 0)}</strong>
              ${renderTableStateButton("hit-die-adjust", "Use", { "data-index": index, "data-delta": "-1" }, { disabled, quiet: true })}
              ${renderTableStateButton("hit-die-adjust", "+", { "data-index": index, "data-delta": "1" }, { disabled })}
              ${renderTableStateButton("hit-die-reset", "Full", { "data-index": index }, { disabled, quiet: true })}
            </div>
          `).join("")
          : `<p class="character-sheet-table-empty">No hit dice.</p>`}
      </div>
    </article>
  `;
}

function renderResourceControls(character, disabled) {
  const resources = toArray(character.resources)
    .map((resource, index) => ({ resource, index }))
    .filter(({ resource }) => ["counter", "pool"].includes(String(resource.kind ?? "")));

  return `
    <article class="character-sheet-table-card character-sheet-table-card-wide">
      <div class="character-sheet-table-card-head">
        <h3>Resources</h3>
        <strong>${escapeHtml(resources.length)}</strong>
      </div>
      <div class="character-sheet-table-list">
        ${resources.length
          ? resources.map(({ resource, index }) => `
            <div class="character-sheet-table-list-row" data-sheet-control-group>
              <span>${escapeHtml(resource.name ?? resource.id ?? "Resource")}</span>
              <strong>${escapeHtml(resource.current ?? 0)} / ${escapeHtml(resource.max ?? 0)}</strong>
              ${renderNumberControl("resource-amount", 1, { label: `${resource.name ?? "Resource"} amount` })}
              ${renderTableStateButton("resource-adjust", "Use", {
                "data-index": index,
                "data-amount-control": "resource-amount",
                "data-delta-sign": "-1"
              }, { disabled, quiet: true })}
              ${renderTableStateButton("resource-adjust", "+", {
                "data-index": index,
                "data-amount-control": "resource-amount",
                "data-delta-sign": "1"
              }, { disabled })}
              ${renderTableStateButton("resource-reset", "Reset", { "data-index": index }, { disabled, quiet: true })}
            </div>
          `).join("")
          : `<p class="character-sheet-table-empty">No tracked resources.</p>`}
      </div>
    </article>
  `;
}

function renderSpellSlotControls(character, disabled) {
  const slots = Object.entries(character.spellSlots?.byLevel ?? {})
    .sort((left, right) => Number(left[0]) - Number(right[0]));

  return `
    <article class="character-sheet-table-card character-sheet-table-card-wide">
      <div class="character-sheet-table-card-head">
        <h3>Spell Slots</h3>
        <strong>${escapeHtml(slots.length ? `${slots.length} levels` : "None")}</strong>
      </div>
      <div class="character-sheet-slot-grid">
        ${slots.length
          ? slots.map(([level, slot]) => {
              const max = toNumber(slot.max, 0);
              const expended = toNumber(slot.expended, 0);
              const remaining = Math.max(0, max - expended);
              return `
                <div class="character-sheet-slot-row">
                  ${renderTableStateMetric(`Level ${level}`, `${remaining}/${max}`)}
                  ${renderTableStateButton("spell-slot-spend", "Use", { "data-level": level, "data-amount": "1" }, { disabled, quiet: true })}
                  ${renderTableStateButton("spell-slot-restore", "+", { "data-level": level, "data-amount": "1" }, { disabled })}
                  ${renderTableStateButton("spell-slot-reset", "Reset", { "data-level": level }, { disabled, quiet: true })}
                </div>
              `;
            }).join("")
          : `<p class="character-sheet-table-empty">No spell slots.</p>`}
      </div>
    </article>
  `;
}

function renderRestControls(disabled) {
  return `
    <article class="character-sheet-table-card">
      <div class="character-sheet-table-card-head">
        <h3>Rest</h3>
        <strong>Reset</strong>
      </div>
      <div class="character-sheet-table-row">
        ${renderTableStateButton("short-rest", "Short Rest", {
          "data-confirm-message": "Apply short rest resets for resources and slots marked short rest?"
        }, { disabled })}
        ${renderTableStateButton("long-rest", "Long Rest", {
          "data-confirm-message": "Apply long rest resets for HP, death saves, resources, and slots marked long rest?"
        }, { disabled })}
      </div>
    </article>
  `;
}

function renderTableStateControls(snapshot = {}) {
  const character = snapshot.character ?? null;
  const mode = snapshot.config?.mode ?? "view";
  if (!character || mode === "view") {
    return "";
  }

  const disabled = false;
  return `
    <details class="character-sheet-table-state" aria-label="Table state controls">
      <summary>Table Trackers</summary>
      <div class="character-sheet-table-state-grid">
        ${renderHpControls(character, disabled)}
        ${renderDeathSaveControls(character, disabled)}
        ${renderStatusControls(character, disabled)}
        ${renderHitDiceControls(character, disabled)}
        ${renderResourceControls(character, disabled)}
        ${renderSpellSlotControls(character, disabled)}
        ${renderRestControls(disabled)}
      </div>
    </details>
  `;
}

function getSnapshotTabs(snapshot = {}) {
  return snapshot.sheetTabs ?? resolveCharacterSheetTabs({
    mode: snapshot.config?.mode ?? "view",
    visibleTabs: snapshot.config?.visibleTabs,
    activeTab: snapshot.config?.activeTab,
    character: snapshot.character
  });
}

function renderTabNav(snapshot = {}) {
  if (!snapshot.character) {
    return "";
  }

  const sheetTabs = getSnapshotTabs(snapshot);
  if (!sheetTabs.tabs?.length) {
    return "";
  }

  return `
    <nav class="character-sheet-tabs" aria-label="Character sheet sections">
      <div class="character-sheet-tab-list" role="tablist">
        ${sheetTabs.tabs.map((tab) => `
          <button
            type="button"
            id="character-sheet-tab-${escapeHtml(tab.id)}"
            class="character-sheet-tab-button${tab.active ? " character-sheet-tab-button-active" : ""}"
            data-sheet-tab="${escapeHtml(tab.id)}"
            role="tab"
            aria-selected="${tab.active ? "true" : "false"}"
            aria-controls="character-sheet-tab-panel"
            tabindex="${tab.active ? "0" : "-1"}"
          >${escapeHtml(tab.label)}</button>
        `).join("")}
      </div>
    </nav>
  `;
}

function renderPersistenceSummary(snapshot = {}) {
  const save = snapshot.lastSaveResult;
  const exported = snapshot.lastExportResult;
  const builder = snapshot.lastBuilderResult;
  const close = snapshot.lastCloseResult;
  const reload = snapshot.lastReloadResult;
  const exportOnly = isExportOnlyPersistence(snapshot);

  if (!save && !exported && !builder && !close && !reload && !snapshot.lastError) {
    return "";
  }

  const saveText = save
    ? save.message || [save.reason, save.url].filter(Boolean).join(" | ") || formatStatus(snapshot.saveStatus)
    : "No save attempted";
  const exportText = exported?.file
    ? `${exported.file.fileName} (${exported.file.byteLength} bytes)`
    : exported?.reason || "No export prepared";
  const exportDetail = exported?.downloadResult && !exported.downloadResult.ok
    ? formatStatus(exported.downloadResult.reason)
    : "";
  const builderText = builder
    ? [builder.message, builder.reason].filter(Boolean).join(" | ")
    : "No builder handoff";
  const builderIssueText = builder?.issues?.length
    ? builder.issues.map((issue) => issue.message || issue.reason).filter(Boolean).join(" | ")
    : "";
  const errorText = snapshot.lastError?.message ?? "";

  return `
    <footer class="character-sheet-runtime-summary" aria-label="Sheet runtime summary">
      ${!exportOnly || save ? `
        <div>
          <span>${escapeHtml(exportOnly ? "Draft" : "Save")}</span>
          <strong>${escapeHtml(saveText)}</strong>
          ${renderPersistenceResourceList(save?.resources)}
          ${renderPersistenceIssueList(save?.issues)}
        </div>
      ` : ""}
      <div>
        <span>${escapeHtml(exportOnly ? "Export Draft" : "Export")}</span>
        <strong>${escapeHtml(exportText)}</strong>
        ${exportDetail ? `<small>${escapeHtml(exportDetail)}</small>` : ""}
        ${renderExportFileList(exported?.files)}
      </div>
      ${builder ? `
        <div class="${builder.issues?.length ? "character-sheet-runtime-warning" : ""}">
          <span>Builder</span>
          <strong>${escapeHtml(builderIssueText || builderText)}</strong>
        </div>
      ` : ""}
      ${reload && !reload.ok ? `
        <div class="character-sheet-runtime-warning">
          <span>Reload</span>
          <strong>${escapeHtml(reload.message || reload.reason)}</strong>
        </div>
      ` : ""}
      ${close && !close.ok ? `
        <div class="character-sheet-runtime-warning">
          <span>Close</span>
          <strong>${escapeHtml(close.message || close.reason)}</strong>
        </div>
      ` : ""}
      ${errorText ? `
        <div class="character-sheet-runtime-error">
          <span>Error</span>
          <strong>${escapeHtml(errorText)}</strong>
        </div>
      ` : ""}
    </footer>
  `;
}

function renderPersistenceResourceList(resources = []) {
  const entries = toArray(resources);
  if (!entries.length) {
    return "";
  }

  return `
    <ul class="character-sheet-runtime-list">
      ${entries.map((resource) => {
        const detail = [
          resource.reason || "",
          resource.status ? `HTTP ${resource.status}` : "",
          resource.url || ""
        ].filter(Boolean).join(" | ");

        return `
          <li>
            <strong>${escapeHtml(resource.label || "Resource")}: ${escapeHtml(resource.ok ? "OK" : "Issue")}</strong>
            <span>${escapeHtml(detail || "No endpoint")}</span>
            ${resource.error?.message ? `<small>${escapeHtml(resource.error.message)}</small>` : ""}
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function renderPersistenceIssueList(issues = []) {
  const entries = toArray(issues);
  if (!entries.length) {
    return "";
  }

  return `
    <ul class="character-sheet-runtime-list character-sheet-runtime-issues">
      ${entries.map((issue) => `
        <li>
          <strong>${escapeHtml(formatStatus(issue.reason || issue.type || "issue"))}</strong>
          <span>${escapeHtml(issue.message || issue.reason || "Persistence issue")}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderExportFileList(files = []) {
  const entries = toArray(files);
  if (!entries.length) {
    return "";
  }

  return `
    <ul class="character-sheet-runtime-list">
      ${entries.map((file) => `
        <li>
          <strong>${escapeHtml(file.label || titleCase(file.kind || "file"))}</strong>
          <span>${escapeHtml(file.fileName || "character.json")}</span>
          ${file.byteLength ? `<small>${escapeHtml(file.byteLength)} bytes</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function getShellTitle(character, config) {
  const identity = character?.identity ?? {};
  return identity.name || character?.id || (config.characterId ? `Loading ${config.characterId}` : "No character loaded");
}

export function renderCharacterSheetShell(snapshot = {}) {
  const character = snapshot.character ?? null;
  const config = snapshot.config ?? {};
  const identity = character?.identity ?? {};
  const mode = config.mode ?? "view";
  const exportOnly = isExportOnlyPersistence(snapshot);
  const sheetTabs = getSnapshotTabs(snapshot);
  const activeTab = sheetTabs.activeTab;
  const panelLabelId = character ? `character-sheet-tab-${activeTab}` : "character-sheet-title";
  const mountKind = snapshot.mountKind ?? snapshot.renderer?.mountKind ?? "embedded";
  const isOwned = mountKind === "owned";
  const title = getShellTitle(character, config);
  const subtitle = [
    formatStatus(mode),
    character?.id ?? config.characterId,
    identity.playerName ? `Player ${identity.playerName}` : ""
  ].filter(Boolean).join(" | ");
  const shellRole = isOwned
    ? `role="dialog" aria-modal="true"`
    : `role="region"`;

  return `
    <section
      class="character-sheet-app"
      data-character-sheet
      data-character-sheet-phase="10"
      data-character-sheet-mode="${escapeHtml(config.mode ?? "view")}"
      data-character-sheet-active-tab="${escapeHtml(activeTab)}"
      data-character-sheet-mount="${escapeHtml(mountKind)}"
      ${shellRole}
      aria-labelledby="character-sheet-title"
      aria-describedby="character-sheet-subtitle"
      tabindex="-1"
    >
      <header class="character-sheet-app-header character-sheet-sr-header">
        <div class="character-sheet-title-block">
          <p class="character-sheet-kicker">Character Sheet</p>
          <h2 id="character-sheet-title">${escapeHtml(title)}</h2>
          <p id="character-sheet-subtitle">${escapeHtml(subtitle || "Reusable final DTO sheet")}</p>
        </div>
      </header>

      <div class="character-sheet-status-bar character-sheet-sr-status" aria-live="polite">
        ${renderStatusPill("Load", snapshot.loadStatus)}
        ${exportOnly
          ? renderStatusPill("Export Draft", snapshot.exportStatus)
          : `${renderStatusPill("Save", snapshot.saveStatus)}${renderStatusPill("Export", snapshot.exportStatus)}`}
        ${renderStatusPill("Validation", getValidationStatus(snapshot), {
          detail: `${snapshot.validationSummary?.errors ?? 0} errors, ${snapshot.validationSummary?.warnings ?? 0} warnings`
        })}
        ${renderStatusPill("Builder", getBuilderDisplayStatus(snapshot))}
        ${renderStatusPill("Changes", snapshot.isDirty ? "dirty" : "clean")}
      </div>

      ${renderCharacterSummaryStrip(snapshot)}
      ${renderTopConsole(snapshot)}
      ${renderTableStateControls(snapshot)}
      ${renderValidationList(snapshot.validationIssues ?? [])}

      <div class="character-sheet-play-layout">
        ${character ? renderLeftRail(character) : ""}
        <div class="character-sheet-content-column">
          ${renderTabNav({
            ...snapshot,
            sheetTabs
          })}

          <main
            id="character-sheet-tab-panel"
            class="character-sheet-render-target"
            data-sheet-body
            data-sheet-active-tab="${escapeHtml(activeTab)}"
            role="tabpanel"
            aria-labelledby="${escapeHtml(panelLabelId)}"
          >
            ${character ? "" : `<p class="character-sheet-empty">No character DTO loaded.</p>`}
          </main>

          ${renderPersistenceSummary(snapshot)}
        </div>
      </div>
    </section>
  `;
}

function focusWithoutScroll(element) {
  if (!element?.focus) {
    return;
  }

  try {
    element.focus({ preventScroll: true });
  } catch (_error) {
    element.focus();
  }
}

function findInitialFocusTarget(container) {
  return container?.querySelector?.(FOCUSABLE_SELECTOR) ?? container;
}

export class CharacterSheetRenderer {
  #root = null;
  #ownsRoot = false;
  #previousActiveElement = null;
  #previousBodyOverflow = "";
  #previousBodyOverscrollBehavior = "";
  #focusedShell = false;

  get root() {
    return this.#root;
  }

  mount(mount) {
    if (typeof document === "undefined") {
      return this;
    }

    if (this.#root) {
      this.unmount();
    }

    this.#previousActiveElement = document.activeElement && typeof document.activeElement.focus === "function"
      ? document.activeElement
      : null;
    this.#focusedShell = false;

    const existingTarget = resolveMountTarget(mount);
    if (existingTarget) {
      this.#root = existingTarget;
      this.#ownsRoot = false;
      return this;
    }

    this.#root = document.createElement("div");
    this.#root.className = "character-sheet-root character-sheet-root-owned";
    document.body.append(this.#root);
    this.#ownsRoot = true;
    this.#lockDocumentScroll();
    return this;
  }

  render(snapshot = {}) {
    if (!this.#root) {
      return this;
    }

    this.#root.innerHTML = renderCharacterSheetShell({
      ...snapshot,
      mountKind: this.#ownsRoot ? "owned" : "embedded"
    });
    const target = this.#root.querySelector("[data-sheet-body]");
    if (target && snapshot.character) {
      const sheetTabs = getSnapshotTabs(snapshot);
      renderCharacterSheetTab(target, snapshot.character, {
        tab: sheetTabs.activeTab,
        mode: snapshot.config?.mode ?? "view",
        rulesCatalog: snapshot.rulesCatalog,
        normalizedCatalog: snapshot.rulesCatalog,
        rulesProfile: snapshot.rulesProfile ?? snapshot.character.sourcePolicy ?? {},
        allowedSources: snapshot.rulesProfile?.allowedSources ?? snapshot.character.sourcePolicy?.allowedSources ?? []
      });
    }

    this.#syncOwnedFocus();
    return this;
  }

  #lockDocumentScroll() {
    if (!this.#ownsRoot || typeof document === "undefined" || !document.body?.style) {
      return;
    }

    this.#previousBodyOverflow = document.body.style.overflow;
    this.#previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
  }

  #unlockDocumentScroll() {
    if (!this.#ownsRoot || typeof document === "undefined" || !document.body?.style) {
      return;
    }

    document.body.style.overflow = this.#previousBodyOverflow;
    document.body.style.overscrollBehavior = this.#previousBodyOverscrollBehavior;
    this.#previousBodyOverflow = "";
    this.#previousBodyOverscrollBehavior = "";
  }

  #syncOwnedFocus() {
    if (!this.#ownsRoot || this.#focusedShell || !this.#root) {
      return;
    }

    const shell = this.#root.querySelector("[data-character-sheet]");
    this.#focusedShell = true;
    focusWithoutScroll(findInitialFocusTarget(shell));
  }

  #restorePreviousFocus() {
    if (this.#previousActiveElement?.isConnected) {
      focusWithoutScroll(this.#previousActiveElement);
    }

    this.#previousActiveElement = null;
  }

  unmount() {
    if (!this.#root) {
      return this;
    }

    if (this.#ownsRoot) {
      this.#root.remove();
    } else {
      this.#root.innerHTML = "";
    }

    this.#unlockDocumentScroll();
    this.#restorePreviousFocus();
    this.#root = null;
    this.#ownsRoot = false;
    this.#focusedShell = false;
    return this;
  }
}
