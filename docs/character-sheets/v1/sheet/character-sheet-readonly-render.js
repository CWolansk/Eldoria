import {
  createSheetRulesContext,
  formatSpellLevel,
  getArmorClassBreakdown,
  getCatalogTextSummary,
  getEquippedAttackCards,
  getSavingThrowCards,
  getSkillCards,
  getSpellcastingMath,
  resolveBackgroundDetail,
  resolveClassDetail,
  resolveFeatDetail,
  resolveFeatureDetail,
  resolveItemDetail,
  resolveRaceDetail,
  resolveSubclassDetail,
  resolveSpellDetail
} from "./sheet-rules.js";
import { resolveManifestRelativeUrl } from "./character-sheet-loader.js";

const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma"
};
const SKILL_TO_ABILITY = {
  acrobatics: "dex",
  animalHandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleightOfHand: "dex",
  stealth: "dex",
  survival: "wis"
};
const SCHOOL_LABELS = {
  A: "Abjuration",
  C: "Conjuration",
  D: "Divination",
  E: "Enchantment",
  V: "Evocation",
  I: "Illusion",
  N: "Necromancy",
  T: "Transmutation"
};
const CURRENCY_COINS = ["cp", "sp", "ep", "gp", "pp"];
const BASIC_ACTIONS = [
  ["Attack", "Action", "Make one weapon or unarmed attack."],
  ["Cast a Spell", "Action", "Use a spell's listed casting time and spend a slot if required."],
  ["Dash", "Action", "Gain extra movement equal to speed."],
  ["Disengage", "Action", "Movement does not provoke opportunity attacks this turn."],
  ["Dodge", "Action", "Attackers you can see have disadvantage; DEX saves have advantage."],
  ["Help", "Action", "Give an ally advantage on a relevant check or attack."],
  ["Hide", "Action", "Make a Dexterity (Stealth) check if cover or concealment allows."],
  ["Ready", "Action", "Choose a trigger and response; reaction spends when triggered."],
  ["Search", "Action", "Make an Investigation or Perception check."],
  ["Use an Object", "Action", "Interact with an item that needs your action."]
];
const ACTION_ECONOMY_ORDER = ["Action", "Bonus Action", "Reaction", "Free/Other"];
const FEATURE_GROUP_ORDER = ["Class", "Subclass", "Race / Ancestry", "Background", "Feat", "Item", "Other"];
const PLAYER_TAB_CONTENT_PRIORITY = Object.freeze({
  overview: ["session-critical actions and rolls", "expandable rules detail", "maintenance controls"],
  combat: ["session-critical defenses and damage state", "expandable defensive rules detail", "maintenance controls"],
  inventory: ["equipped and carried gear state", "expandable item rules detail", "gear maintenance controls"],
  spells: ["spell math, slots, and prepared lists", "expandable spell rules detail", "spell upkeep controls"],
  pets: ["active companion state", "expandable companion detail", "companion maintenance controls"],
  notes: ["identity and play-facing character state", "expandable proficiencies and notes", "identity maintenance controls"],
  features: ["actionable feature summaries", "expandable rules detail", "choice confirmation notices"],
  skills: ["roll formulas and passive scores", "training detail", "reference lists"]
});
const PLAYER_SAFE_PENDING_DETAIL = "Details pending; use the table ruling or ask the DM if it matters now.";

/**
 * Escapes text before it is interpolated into renderer HTML template strings.
 * Called by essentially every render helper in this file.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Formats signed numeric modifiers like +3 or -1 for display.
 * Called by stat, save, and spellcasting render helpers.
 */
function formatModifier(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  return value >= 0 ? `+${value}` : `${value}`;
}

/**
 * Computes a D&D ability modifier from a score.
 * Called by ability, skill, and saving-throw render helpers.
 */
function abilityMod(score) {
  return Math.floor((Number(score) - 10) / 2);
}

/**
 * Converts camelCase/kebab-case ids into readable labels.
 * Called by decision and spellcasting display helpers.
 */
function titleCase(value) {
  return String(value ?? "")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSearchText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isEditableSheetMode(options = {}) {
  return options.mode === "play" || options.mode === "edit";
}

function hasSpellcastingEntries(spellcasting = {}) {
  return Boolean(
    toArray(spellcasting.cantrips).length
      || toArray(spellcasting.preparedSpells).length
      || toArray(spellcasting.alwaysPrepared).length
      || toArray(spellcasting.spellPool?.entries).length
  );
}

function hasSpellcastingSurface(spellcasting = {}) {
  if (!spellcasting || typeof spellcasting !== "object") {
    return false;
  }

  return Boolean(
    hasSpellcastingEntries(spellcasting)
      || spellcasting.spellAttackBonus != null
      || spellcasting.spellSaveDc != null
      || normalizeSearchText(spellcasting.ability)
      || normalizeSearchText(spellcasting.preparationStyle)
      || (spellcasting.preparedCount != null && Number.isFinite(Number(spellcasting.preparedCount)))
      || (spellcasting.spellsKnown != null && Number.isFinite(Number(spellcasting.spellsKnown)))
      || (spellcasting.cantripsKnown != null && Number.isFinite(Number(spellcasting.cantripsKnown)))
  );
}

function hasSpellLikeResource(resource = {}) {
  const text = [
    resource.name,
    resource.source,
    resource.note,
    resource.kind,
    Array.isArray(resource.body) ? resource.body.join(" ") : resource.body
  ].filter(Boolean).join(" ");
  return /\b(spell|cantrip|ritual|pact magic|innate magic)\b/i.test(text);
}

function hasSpellLikeItem(item = {}) {
  const text = [item.name, item.notes, item.source, item.type, item.category].filter(Boolean).join(" ");
  return /\b(spell scroll|scroll|wand|staff of|rod of|spell)\b/i.test(text);
}

export function hasSpellTabContent(character = {}) {
  const spellSlots = Object.values(character.spellSlots?.byLevel ?? {});
  if (spellSlots.some((slot) => Number(slot?.max ?? 0) > 0 || Number(slot?.expended ?? 0) > 0)) {
    return true;
  }

  if (toArray(character.classes).some((entry) => hasSpellcastingSurface(entry.spellcasting))) {
    return true;
  }

  return toArray(character.resources).some(hasSpellLikeResource)
    || toArray(character.inventory?.carried).some(hasSpellLikeItem);
}

function hasMeaningfulCompanionData(value) {
  if (value == null) {
    return false;
  }

  if (typeof value === "string") {
    return Boolean(normalizeSearchText(value));
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulCompanionData);
  }

  if (typeof value === "object") {
    return Object.values(value).some(hasMeaningfulCompanionData);
  }

  return true;
}

function isCompanionResource(resource = {}) {
  const kind = normalizeSearchText(resource.kind);
  if (kind === "roster" && toArray(resource.items).length) {
    return true;
  }

  if (/\b(companion|familiar|mount|summon|summoned|roster|form|wild shape|eidolon|construct|pet)\b/i.test(kind)) {
    return hasMeaningfulCompanionData(resource.items)
      || hasMeaningfulCompanionData(resource.body)
      || hasMeaningfulCompanionData(resource.value)
      || hasMeaningfulCompanionData(resource.note);
  }

  const text = [resource.name, resource.source, resource.note].filter(Boolean).join(" ");
  return /\b(companion|familiar|mount|summon|summoned|eidolon|construct|pet)\b/i.test(text);
}

function getCompanionResources(character = {}) {
  return toArray(character.resources).filter(isCompanionResource);
}

function getCompanionDirectEntries(character = {}) {
  const directSources = [
    ["Companions", character.companions],
    ["Companion", character.companion],
    ["Familiars", character.familiars],
    ["Familiar", character.familiar],
    ["Mounts", character.mounts],
    ["Mount", character.mount],
    ["Summons", character.summons],
    ["Summon", character.summon],
    ["Roster", character.roster],
    ["Forms", character.forms],
    ["Forms", character.wildShapeForms],
    ["Forms", character.wildShapes]
  ];

  return directSources
    .filter(([, value]) => hasMeaningfulCompanionData(value))
    .flatMap(([label, value]) => (
      Array.isArray(value)
        ? value.map((entry) => ({ label, entry }))
        : [{ label, entry: value }]
    ));
}

function getCompanionEntries(character = {}) {
  return [
    ...getCompanionResources(character).map((resource) => ({ type: "resource", resource })),
    ...getCompanionDirectEntries(character).map((entry) => ({ type: "direct", ...entry }))
  ];
}

export function hasCompanionTabContent(character = {}) {
  return getCompanionEntries(character).length > 0;
}

function getCompanionEntryName(entry = {}, fallback = "Companion") {
  if (typeof entry === "string") {
    return entry;
  }

  if (!entry || typeof entry !== "object") {
    return fallback;
  }

  return entry.name ?? entry.displayName ?? entry.type ?? entry.form ?? fallback;
}

function formatCompanionDetail(entry = {}) {
  if (typeof entry === "string") {
    return PLAYER_SAFE_PENDING_DETAIL;
  }

  if (!entry || typeof entry !== "object") {
    return PLAYER_SAFE_PENDING_DETAIL;
  }

  const parts = [
    entry.hp != null ? `HP ${entry.hp}` : null,
    entry.ac != null ? `AC ${entry.ac}` : null,
    entry.cr != null ? `CR ${entry.cr}` : null,
    entry.speed?.walk ? `Speed ${entry.speed.walk}` : null,
    entry.note && !isDeveloperProvenanceText(entry.note) ? entry.note : null
  ].filter(Boolean);

  return parts.join(" | ") || "Companion details pending; confirm stats at the table.";
}

function formatPreparedFormula(value = "") {
  const text = normalizeRuleText(value);
  if (!text) {
    return "";
  }

  if (isDeveloperProvenanceText(text) || /<\$[^>]+>/.test(text)) {
    return "Prepared count uses the recorded sheet value; confirm class math at the table if needed.";
  }

  return text;
}

function isDeveloperProvenanceText(value = "") {
  return /\b(converted from|conversion-pending|legacy conversion|legacy public player|phase \d+|catalog refs|catalog match pending|builder history|player controls|source-player-sheet|source sheet|source policy|dto)\b/i.test(value);
}

function formatPlayerFacingSource(value = "") {
  const text = String(value ?? "").trim();
  const normalized = normalizeSearchText(text);
  if (!text || normalized.startsWith("conversion") || isDeveloperProvenanceText(text) || normalized === "source-player-sheet") {
    return "Recorded";
  }

  if (normalized.startsWith("class-")) {
    return "Class";
  }
  if (normalized.startsWith("subclass-")) {
    return "Subclass";
  }
  if (normalized.startsWith("race-")) {
    return "Ancestry";
  }
  if (normalized.startsWith("background-")) {
    return "Background";
  }
  if (normalized.startsWith("feat-")) {
    return "Feat";
  }
  if (normalized.startsWith("item-")) {
    return "Item";
  }

  return titleCase(text.replace(/\.json$/i, ""));
}

function renderInlineActionButton(action, label, attributes = {}, options = {}) {
  const tone = options.quiet ? " character-sheet-table-button-quiet" : options.danger ? " character-sheet-table-button-danger" : "";
  const disabled = options.disabled ? " disabled" : "";
  const attributeText = Object.entries(attributes)
    .filter(([, value]) => value != null && value !== "")
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join("");

  return `<button type="button" class="character-sheet-table-button${tone}" data-sheet-action="${escapeHtml(action)}"${attributeText}${disabled}>${escapeHtml(label)}</button>`;
}

function renderInlineNumberControl(name, value = 0, options = {}) {
  return `
    <input
      type="number"
      class="character-sheet-table-input"
      data-sheet-control="${escapeHtml(name)}"
      value="${escapeHtml(value)}"
      min="${escapeHtml(options.min ?? 0)}"
      step="${escapeHtml(options.step ?? 1)}"
      aria-label="${escapeHtml(options.label ?? name)}"
    >
  `;
}

function renderInlineTextControl(name, value = "", options = {}) {
  return `
    <input
      type="${escapeHtml(options.type ?? "text")}"
      class="character-sheet-table-input character-sheet-table-input-wide"
      data-sheet-control="${escapeHtml(name)}"
      value="${escapeHtml(value ?? "")}"
      ${options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : ""}
      aria-label="${escapeHtml(options.label ?? name)}"
    >
  `;
}

function renderInlineSelectControl(name, selected, choices = [], options = {}) {
  return `
    <select class="character-sheet-table-select" data-sheet-control="${escapeHtml(name)}" aria-label="${escapeHtml(options.label ?? name)}">
      ${choices.map(([value, label]) => `
        <option value="${escapeHtml(value)}"${String(value) === String(selected) ? " selected" : ""}>${escapeHtml(label)}</option>
      `).join("")}
    </select>
  `;
}

function renderToneBadge(label, tone = "") {
  const text = normalizeRuleText(label);
  if (!text) {
    return "";
  }

  return `<span class="badge"${tone ? ` data-tone="${escapeHtml(tone)}"` : ""}>${escapeHtml(text)}</span>`;
}

function renderBadgeCluster(entries = []) {
  const badges = entries
    .map((entry) => (Array.isArray(entry) ? renderToneBadge(entry[0], entry[1]) : renderToneBadge(entry)))
    .filter(Boolean)
    .join("");
  return badges ? `<div class="character-badges character-sheet-record-badges">${badges}</div>` : "";
}

function getSourceBadgeTone(source = "") {
  return normalizeSearchText(source) === "eldoria" ? "accent" : "";
}

function getRarityBadgeTone(rarity = "") {
  const value = normalizeSearchText(rarity);
  if (!value || value === "none" || value === "common") {
    return "";
  }

  if (value === "uncommon") {
    return "success";
  }

  if (value === "rare") {
    return "warning";
  }

  return "accent";
}

function formatSpellComponentSummary(components = "") {
  return String(components ?? "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderRuleTextBlock(text, fallback = PLAYER_SAFE_PENDING_DETAIL) {
  const body = normalizeRuleText(text || fallback);
  return `
    <div class="character-sheet-library-detail-text">
      ${body.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    </div>
  `;
}

function renderLibraryDetailRows(rows = []) {
  const rowMarkup = rows
    .filter((row) => row?.value != null && row.value !== "")
    .map((row) => `
      <div class="label-row">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(row.value)}</strong>
      </div>
    `)
    .join("");

  return rowMarkup ? `<div class="compact-list character-sheet-library-detail-rows">${rowMarkup}</div>` : "";
}

function renderLibraryField(label, controlMarkup) {
  return `
    <label class="field">
      <span class="field-label">${escapeHtml(label)}</span>
      ${controlMarkup}
    </label>
  `;
}

function renderLibrarySearchField(placeholder) {
  return renderLibraryField("Search", `
    <div class="search-field">
      <input class="input" type="search" data-library-filter="search" placeholder="${escapeHtml(placeholder)}" aria-label="${escapeHtml(placeholder)}">
    </div>
  `);
}

function renderLibrarySelectFilter(name, label, choices = [], allLabel = "Any") {
  return renderLibraryField(label, `
    <select class="select" data-library-filter="${escapeHtml(name)}" aria-label="${escapeHtml(label)}">
      <option value="">${escapeHtml(allLabel)}</option>
      ${choices.map(([value, optionLabel]) => `<option value="${escapeHtml(value)}">${escapeHtml(optionLabel)}</option>`).join("")}
    </select>
  `);
}

function renderLibraryCheckboxFilter(name, label) {
  return `
    <label class="character-sheet-library-check">
      <input type="checkbox" data-library-filter="${escapeHtml(name)}" value="true">
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function normalizeLibraryChoiceValue(value) {
  return normalizeSearchText(value);
}

function getUniqueLibraryChoices(items = [], getValue, getLabel = getValue) {
  const choices = new Map();
  for (const item of items) {
    const rawValue = getValue(item);
    const value = normalizeLibraryChoiceValue(rawValue);
    if (!value || choices.has(value)) {
      continue;
    }

    choices.set(value, getLabel(item, rawValue));
  }

  return [...choices.entries()].sort((left, right) => {
    const leftNumber = Number(left[0]);
    const rightNumber = Number(right[0]);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }

    return String(left[1]).localeCompare(String(right[1]));
  });
}

function renderLibraryCount(count) {
  return `<span class="fine-print" data-library-count>${escapeHtml(count)} shown</span>`;
}

function renderLibraryLauncher(kind, title, summary, buttonLabel, countLabel, templateMarkup) {
  return `
    <section class="card character-sheet-library-launcher" data-character-library-launcher="${escapeHtml(kind)}">
      <div class="class-head">
        <div>
          <h2 class="section-title">${escapeHtml(title)}</h2>
          <p class="fine-print">${escapeHtml(summary)}</p>
        </div>
        <div class="button-row">
          <button type="button" class="button button-secondary" data-sheet-action="library-open" data-library-kind="${escapeHtml(kind)}">${escapeHtml(buttonLabel)}</button>
          <span class="chip">${escapeHtml(countLabel)}</span>
        </div>
      </div>
      ${templateMarkup}
    </section>
  `;
}

function normalizeRuleText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getRuleDetailTitle(detail = {}, fallback = "Rule Detail") {
  return normalizeRuleText(
    detail.displayName
      ?? detail.name
      ?? detail.title
      ?? fallback
  ) || fallback;
}

function getRuleDetailSubtitle(detail = {}, kind = "Rule") {
  const source = formatPlayerFacingSource(detail.source);
  return [
    kind,
    source && source !== "Recorded" ? `Source ${source}` : ""
  ].filter(Boolean).join(" | ");
}

function getRuleDetailBody(detail = {}, fallback = "") {
  return normalizeRuleText(
    detail.fullText
      || detail.description
      || detail.summary
      || fallback
      || "No additional rules text is recorded for this entry."
  );
}

function renderRuleDetailAttributes(detail = {}, options = {}) {
  const title = getRuleDetailTitle(detail, options.title);
  const subtitle = normalizeRuleText(options.subtitle) || getRuleDetailSubtitle(detail, options.kind);
  const body = getRuleDetailBody(detail, options.body);

  return [
    'data-rule-detail="true"',
    `data-rule-title="${escapeHtml(title)}"`,
    `data-rule-subtitle="${escapeHtml(subtitle)}"`,
    `data-rule-body="${escapeHtml(body)}"`,
    `aria-label="${escapeHtml(`Open details for ${title}`)}"`
  ].join(" ");
}

function renderRuleDetailButton(label, detail = {}, options = {}) {
  const text = normalizeRuleText(label) || getRuleDetailTitle(detail, options.title);
  return `
    <button
      type="button"
      class="rule-detail-link"
      data-rule-detail-button="true"
      ${renderRuleDetailAttributes(detail, {
        ...options,
        title: options.title || text
      })}
    >${escapeHtml(text)}</button>
  `;
}

function getPlayerSafeDetailSummary(detail = {}, fallback = PLAYER_SAFE_PENDING_DETAIL) {
  if (detail.resolved === false) {
    return fallback;
  }

  return normalizeRuleText(detail.summary) || fallback;
}

function renderEmptyState(title, message, cta = "") {
  return `
    <article class="panel character-sheet-empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p class="fine-print">${escapeHtml(message)}</p>
      ${cta ? `<p class="character-sheet-empty-cta">${escapeHtml(cta)}</p>` : ""}
    </article>
  `;
}

function hasKnownRuleDetail(detail = {}) {
  return Boolean(detail?.resolved || normalizeRuleText(detail?.summary) || normalizeRuleText(detail?.fullText));
}

function renderOptionalRuleTitle(label, detail = {}, kind = "Rule") {
  return hasKnownRuleDetail(detail)
    ? renderRuleDetailButton(label, detail, { kind })
    : escapeHtml(label);
}

function normalizeActionEconomy(value = "") {
  const text = normalizeSearchText(value);
  if (/\bbonus\b/.test(text)) {
    return "Bonus Action";
  }

  if (/\breaction\b/.test(text)) {
    return "Reaction";
  }

  if (/\b(action|attack|cast)\b/.test(text) && !/\b(no action|free|minute|minutes|hour|hours|ritual|special)\b/.test(text)) {
    return "Action";
  }

  return "Free/Other";
}

function inferActionEconomy(...values) {
  return normalizeActionEconomy(values.filter(Boolean).join(" "));
}

function formatActionUses(current, max, recharge = "") {
  if (current == null && max == null) {
    return recharge || "";
  }

  const value = max != null ? `${current ?? 0} / ${max}` : String(current ?? max ?? "");
  return [value, recharge ? `recharge ${recharge}` : ""].filter(Boolean).join(" | ");
}

function findMatchingResource(character, label) {
  const target = normalizeSearchText(label);
  if (!target) {
    return null;
  }

  return toArray(character.resources)
    .map((resource, index) => ({ resource, index }))
    .find(({ resource }) => normalizeSearchText(resource.name) === target) ?? null;
}

function findMatchingFeatureDetail(character, sheetContext, label) {
  const target = normalizeSearchText(label);
  if (!target) {
    return null;
  }

  const feature = toArray(character.features)
    .find((entry) => normalizeSearchText(entry.name) === target);
  return feature ? resolveFeatureDetail(feature, sheetContext, character) : null;
}

function renderActionFact(label, value) {
  if (value == null || value === "") {
    return "";
  }

  return `
    <div class="label-row character-sheet-action-fact">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderActionResourceControls(resource, index, options = {}) {
  if (!isEditableSheetMode(options) || !["counter", "pool"].includes(String(resource.kind ?? ""))) {
    return "";
  }

  const amountControl = `action-resource-amount-${index}`;
  return `
    <div class="inventory-control-row" data-sheet-control-group>
      ${renderInlineNumberControl(amountControl, 1, { label: `${resource.name ?? "Resource"} amount`, min: 1 })}
      ${renderInlineActionButton("resource-adjust", "Use", {
        "data-index": index,
        "data-delta-sign": "-1",
        "data-amount-control": amountControl
      }, { quiet: true })}
      ${renderInlineActionButton("resource-adjust", "Restore", {
        "data-index": index,
        "data-delta-sign": "1",
        "data-amount-control": amountControl
      }, { quiet: true })}
      ${renderInlineActionButton("resource-reset", "Reset", { "data-index": index }, { quiet: true })}
    </div>
  `;
}

function renderAtTableActionCard(card, options = {}) {
  const badges = [
    card.cost,
    card.kind,
    card.tag
  ].filter(Boolean);

  return `
    <article class="feature-card character-sheet-action-card character-sheet-economy-card${card.detail && hasKnownRuleDetail(card.detail) ? " character-sheet-action-card-detail" : ""}">
      <div class="class-head">
        <h3>${renderOptionalRuleTitle(card.title, card.detail, card.kind)}</h3>
        <div class="character-badges">
          ${badges.map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}
        </div>
      </div>
      <div class="compact-list character-sheet-action-facts">
        ${renderActionFact("Roll / Save", card.roll || "-")}
        ${renderActionFact("Range / Target", card.range || "-")}
        ${renderActionFact(card.effectLabel || "Effect", card.effect || "-")}
        ${renderActionFact("Uses", card.uses)}
      </div>
      ${card.summary ? `<p class="fine-print">${escapeHtml(card.summary)}</p>` : ""}
      ${typeof card.renderControls === "function" ? card.renderControls(options) : ""}
    </article>
  `;
}

function formatSpellTags(detail) {
  return [
    formatSpellLevel(detail.level),
    detail.school,
    detail.ritual ? "ritual" : null,
    detail.concentration ? "concentration" : null,
    formatPlayerFacingSource(detail.source)
  ].filter(Boolean).join(" | ");
}

function renderCatalogDetailPane(title, detail = {}, rows = []) {
  const status = detail.resolved ? "resolved" : "unresolved";
  const statusLabel = detail.resolved ? "Details ready" : "Details pending";
  const summary = detail.summary ? `<p class="fine-print">${escapeHtml(detail.summary)}</p>` : "";
  const rowMarkup = rows.filter((row) => row?.value != null && row.value !== "").length
    ? `
      <div class="compact-list catalog-detail-rows">
        ${rows
          .filter((row) => row?.value != null && row.value !== "")
          .map((row) => `<div class="label-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`)
          .join("")}
      </div>
    `
    : "";

  return `
    <article
      class="catalog-detail-pane"
      data-catalog-status="${escapeHtml(status)}"
      ${renderRuleDetailAttributes(detail, { title: detail.name || title, kind: title })}
      role="button"
      tabindex="0"
    >
      <div class="class-head">
        <h3>${renderRuleDetailButton(title, detail, { title: detail.name || title, kind: title })}</h3>
        <span class="badge${detail.resolved ? " badge-success" : " badge-warning"}">${escapeHtml(statusLabel)}</span>
      </div>
      ${rowMarkup}
      ${summary}
    </article>
  `;
}

function renderResolvedSpell(spell, sheetContext, character) {
  const detail = resolveSpellDetail(spell, sheetContext, character);
  const tags = formatSpellTags(detail);
  const fallback = !detail.resolved && sheetContext.catalogAvailable ? "Details pending" : "";
  return `<span class="spell-chip">${renderRuleDetailButton(detail.name || spell, detail, { kind: "Spell" })}${tags || fallback ? ` <span class="source-line">(${escapeHtml(tags || fallback)})</span>` : ""}</span>`;
}

function renderSpellDetailList(spells = [], sheetContext, character) {
  const seen = new Set();
  const entries = spells
    .map((spell) => resolveSpellDetail(spell, sheetContext, character))
    .filter((detail) => {
      const key = `${detail.name}|${detail.source}`;
      if (!detail.name || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

  if (!entries.length) {
    return `<p class="fine-print">No spell detail entries recorded.</p>`;
  }

  return `
    <ul class="catalog-detail-list">
      ${entries.map((detail) => `
        <li data-catalog-status="${detail.resolved ? "resolved" : "unresolved"}">
          ${renderRuleDetailButton(detail.name, detail, { kind: "Spell" })}
          <span class="source-line">(${escapeHtml(formatSpellTags(detail) || "Details pending")})</span>
          <span class="fine-print">${escapeHtml(getPlayerSafeDetailSummary(detail, "Spell details pending; confirm the exact effect at the table."))}</span>
          ${detail.castingTime || detail.range || detail.components || detail.duration
            ? `<span class="source-line">${escapeHtml([
                detail.castingTime ? `cast ${detail.castingTime}` : null,
                detail.range ? `range ${detail.range}` : null,
                detail.components ? `components ${detail.components}` : null,
                detail.duration ? `duration ${detail.duration}` : null
              ].filter(Boolean).join(" | "))}</span>`
            : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderSpellList(spells = [], sheetContext, character) {
  return spells.length
    ? spells.map((spell) => renderResolvedSpell(spell, sheetContext, character)).join(", ")
    : "None";
}

function renderPreparedSpellList(spells = [], sheetContext, character) {
  return spells.length
    ? spells.map((spell) => renderResolvedSpell(spell, sheetContext, character)).join(", ")
    : "None recorded";
}

function renderAttackModeControls(attack, canEdit) {
  if (!canEdit || attack.kind !== "resolved" || attack.itemIndex == null || Number(attack.itemIndex) < 0) {
    return "";
  }

  const controls = [];
  if (attack.supportsVersatile) {
    controls.push(`
      <div class="attack-control-row" aria-label="${escapeHtml(attack.name)} versatile mode">
        <span>Mode</span>
        <button type="button" class="character-sheet-table-button${attack.mode === "one-hand" ? "" : " character-sheet-table-button-quiet"}" data-sheet-action="attack-mode-set" data-index="${escapeHtml(attack.itemIndex)}" data-mode="one-hand">1H</button>
        <button type="button" class="character-sheet-table-button${attack.mode === "two-hand" ? "" : " character-sheet-table-button-quiet"}" data-sheet-action="attack-mode-set" data-index="${escapeHtml(attack.itemIndex)}" data-mode="two-hand">2H</button>
      </div>
    `);
  }

  if (attack.supportsFinesse) {
    const isAuto = attack.abilityReason !== "override";
    controls.push(`
      <div class="attack-control-row" aria-label="${escapeHtml(attack.name)} finesse ability">
        <span>Ability</span>
        <button type="button" class="character-sheet-table-button${isAuto ? "" : " character-sheet-table-button-quiet"}" data-sheet-action="attack-ability-set" data-index="${escapeHtml(attack.itemIndex)}" data-ability="">Auto</button>
        <button type="button" class="character-sheet-table-button${attack.ability === "str" && !isAuto ? "" : " character-sheet-table-button-quiet"}" data-sheet-action="attack-ability-set" data-index="${escapeHtml(attack.itemIndex)}" data-ability="str">STR</button>
        <button type="button" class="character-sheet-table-button${attack.ability === "dex" && !isAuto ? "" : " character-sheet-table-button-quiet"}" data-sheet-action="attack-ability-set" data-index="${escapeHtml(attack.itemIndex)}" data-ability="dex">DEX</button>
      </div>
    `);
  }

  return controls.length
    ? `<div class="attack-controls">${controls.join("")}</div>`
    : "";
}

function renderAttackCards(character, sheetContext, options = {}) {
  const attacks = getEquippedAttackCards(character, sheetContext);
  const canEdit = options.mode === "play" || options.mode === "edit";
  if (!attacks.length) {
    return `
      <article class="panel">
        <h3>Weapon Attacks</h3>
        <p class="fine-print">No equipped weapon attacks resolved.</p>
      </article>
    `;
  }

  return `
      <article class="panel attack-panel">
      <h3>Weapon Attacks</h3>
      <div class="attack-grid">
        ${attacks.map((attack) => {
          const sourceItem = attack.itemIndex == null ? null : character.inventory?.carried?.[attack.itemIndex];
          const detail = sourceItem ? resolveItemDetail(sourceItem, sheetContext, character) : {
            name: attack.name,
            displayName: attack.name,
            source: attack.source,
            ref: attack.ref,
            summary: attack.notes || attack.reason || "Manual attack entry."
          };

          return `
          <article
            class="attack-card${attack.kind === "manual" ? " attack-card-manual" : ""}"
            ${renderRuleDetailAttributes(detail, { title: attack.name, kind: "Weapon" })}
            role="button"
            tabindex="0"
          >
            <div class="class-head">
              <h4>${renderRuleDetailButton(attack.name, detail, { kind: "Weapon" })}</h4>
              <div class="character-badges">
                ${attack.slot ? `<span class="badge">${escapeHtml(titleCase(attack.slot))}</span>` : ""}
                ${attack.variantName ? `<span class="badge badge-accent">${escapeHtml(attack.variantName)}</span>` : ""}
                <span class="badge">${attack.kind === "manual" ? "Manual" : escapeHtml(attack.ability.toUpperCase())}</span>
                ${attack.overriddenFields?.length ? `<span class="badge badge-warning">Override</span>` : ""}
              </div>
            </div>
            ${attack.kind === "manual"
              ? `<p class="fine-print">${escapeHtml(isDeveloperProvenanceText(attack.reason) || /catalog resolution/i.test(attack.reason ?? "") ? "Manual attack entry; confirm exact details at the table." : attack.reason)}</p>`
              : `<p class="source-line">${escapeHtml([
                  attack.proficient ? "proficient" : "not proficient",
                  attack.source,
                  attack.range ? `range ${attack.range}` : null
                ].filter(Boolean).join(" | "))}</p>`}
            <div class="compact-list attack-formulas">
              <div class="label-row"><span>Attack Roll</span><strong>${escapeHtml(attack.attackFormula)}</strong></div>
              <div class="label-row"><span>Damage</span><strong>${escapeHtml(attack.damageRoll)}</strong></div>
              <div class="label-row"><span>Damage Formula</span><strong>${escapeHtml(attack.damageFormula)}</strong></div>
            </div>
            ${attack.overriddenFields?.length ? `<p class="fine-print">Manual overrides: ${attack.overriddenFields.map(escapeHtml).join(", ")}</p>` : ""}
            ${renderAttackModeControls(attack, canEdit)}
            ${attack.properties?.length ? `<p class="fine-print">Properties: ${attack.properties.map(escapeHtml).join(", ")}</p>` : ""}
            ${attack.conditionalDamage?.length
              ? `<ul class="compact-list fine-print">${attack.conditionalDamage.map((entry) => `<li>${escapeHtml(entry.expression)}: ${escapeHtml(entry.context)}</li>`).join("")}</ul>`
              : ""}
            ${attack.notes && !isDeveloperProvenanceText(attack.notes) ? `<p class="fine-print">${escapeHtml(attack.notes)}</p>` : ""}
          </article>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function renderUnarmedFallback(character) {
  const strength = abilityMod(Number(character.abilities?.str?.score ?? 10));
  const attackBonus = strength + Number(character.proficiencyBonus ?? 0);
  return `
    <article class="attack-card character-sheet-action-card">
      <div class="class-head">
        <h4>Unarmed Strike</h4>
        <span class="badge">Fallback</span>
      </div>
      <div class="compact-list attack-formulas">
        <div class="label-row"><span>Attack Roll</span><strong>d20 ${formatModifier(attackBonus)}</strong></div>
        <div class="label-row"><span>Damage</span><strong>${Math.max(1, 1 + strength)} bludgeoning</strong></div>
      </div>
      <p class="fine-print">Use when no equipped weapon attack is recorded.</p>
      <p class="character-sheet-empty-cta">Equip weapon.</p>
    </article>
  `;
}

function spellcastingHasStoredSpells(spellcasting = {}) {
  return Boolean(
    toArray(spellcasting.cantrips).length
      || toArray(spellcasting.preparedSpells).length
      || toArray(spellcasting.alwaysPrepared).length
      || toArray(spellcasting.spellPool?.entries).length
  );
}

function collectSpellcastingEntries(character, sheetContext) {
  return toArray(character.classes)
    .map((entry, classIndex) => ({ entry, classIndex }))
    .filter(({ entry }) => entry.spellcasting)
    .map(({ entry, classIndex }) => ({
      classIndex,
      classEntry: entry,
      className: resolveClassDetail(entry, sheetContext, character).name || cleanRefName(entry.main),
      spellcasting: entry.spellcasting
    }));
}

function collectSpellLikeResources(character = {}) {
  return toArray(character.resources)
    .map((resource, index) => ({ resource, index }))
    .filter(({ resource }) => hasSpellLikeResource(resource));
}

function collectSpellItems(character = {}) {
  return toArray(character.inventory?.carried)
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => hasSpellLikeItem(item));
}

function collectSpellActionCards(character, sheetContext, limit = 8) {
  const seen = new Set();
  const cards = [];

  for (const entry of collectSpellcastingEntries(character, sheetContext)) {
    const math = getSpellcastingMath(character, entry.spellcasting);
    const spellEntries = [
      ...toArray(entry.spellcasting.cantrips).map((spell) => ({ spell, list: "Cantrip" })),
      ...toArray(entry.spellcasting.preparedSpells).map((spell) => ({ spell, list: "Prepared" })),
      ...toArray(entry.spellcasting.alwaysPrepared).map((spell) => ({ spell, list: "Always Prepared" }))
    ];

    for (const spellEntry of spellEntries) {
      const detail = resolveSpellDetail(spellEntry.spell, sheetContext, character);
      const key = `${detail.name}|${detail.source}|${entry.className}`;
      if (!detail.name || seen.has(key)) {
        continue;
      }

      seen.add(key);
      cards.push({
        ...spellEntry,
        detail,
        className: entry.className,
        spellAttackBonus: math.spellAttackBonus,
        spellSaveDc: math.spellSaveDc
      });

      if (cards.length >= limit) {
        return cards;
      }
    }
  }

  return cards;
}

function collectFeatureActionCards(character, sheetContext, limit = 10) {
  return toArray(character.features)
    .map((feature) => ({
      feature,
      detail: resolveFeatureDetail(feature, sheetContext, character)
    }))
    .filter(({ feature, detail }) => isActionFeature(feature, detail))
    .slice(0, limit);
}

function collectItemActionCards(character, sheetContext, limit = 8) {
  return toArray(character.inventory?.carried)
    .map((item, index) => ({
      item,
      index,
      detail: resolveItemDetail(item, sheetContext, character)
    }))
    .filter(({ item, detail }) => isActionItem(item, detail))
    .slice(0, limit);
}

function collectActionCards(character, sheetContext) {
  return {
    attacks: getEquippedAttackCards(character, sheetContext),
    spells: collectSpellActionCards(character, sheetContext),
    features: collectFeatureActionCards(character, sheetContext),
    resources: toArray(character.resources).filter((resource) => ["counter", "pool", "static"].includes(String(resource.kind ?? ""))),
    items: collectItemActionCards(character, sheetContext),
    spellSlots: Object.entries(character.spellSlots?.byLevel ?? {})
      .sort((left, right) => Number(left[0]) - Number(right[0]))
  };
}

function collectWeaponEconomyCards(character, sheetContext) {
  const attacks = getEquippedAttackCards(character, sheetContext);
  if (!attacks.length) {
    const strength = abilityMod(Number(character.abilities?.str?.score ?? 10));
    const attackBonus = strength + Number(character.proficiencyBonus ?? 0);
    return [{
      title: "Unarmed Strike",
      kind: "Weapon",
      tag: "Fallback",
      economy: "Action",
      cost: "Action",
      roll: `d20 ${formatModifier(attackBonus)}`,
      range: "Melee",
      effectLabel: "Damage",
      effect: `${Math.max(1, 1 + strength)} bludgeoning`,
      summary: "Use when no equipped weapon attack is recorded. Equip weapon."
    }];
  }

  return attacks.map((attack) => {
    const sourceItem = attack.itemIndex == null ? null : character.inventory?.carried?.[attack.itemIndex];
    const detail = sourceItem ? resolveItemDetail(sourceItem, sheetContext, character) : {
      name: attack.name,
      displayName: attack.name,
      source: attack.source,
      ref: attack.ref,
      summary: attack.notes || attack.reason || "Manual attack entry."
    };
    const propertyText = attack.properties?.length ? `Properties: ${attack.properties.join(", ")}` : "";
    const conditionalText = attack.conditionalDamage?.length
      ? attack.conditionalDamage.map((entry) => `${entry.expression}: ${entry.context}`).join(" | ")
      : "";

    return {
      title: attack.name,
      kind: "Weapon",
      tag: attack.slot ? titleCase(attack.slot) : attack.ability?.toUpperCase(),
      economy: "Action",
      cost: "Action",
      roll: attack.attackFormula,
      range: attack.range || "Melee",
      effectLabel: "Damage",
      effect: attack.damageRoll,
      summary: [propertyText, conditionalText, attack.notes && !isDeveloperProvenanceText(attack.notes) ? attack.notes : ""].filter(Boolean).join(" "),
      detail,
      renderControls: (renderOptions) => renderAttackModeControls(attack, isEditableSheetMode(renderOptions))
    };
  });
}

function collectSpellEconomyCards(character, sheetContext, entries = collectSpellActionCards(character, sheetContext)) {
  return entries.map((entry) => {
    const levelText = formatSpellLevel(entry.detail.level) || entry.list;
    const castingTime = entry.detail.castingTime || "1 action";
    const attackText = entry.spellAttackBonus != null ? formatModifier(Number(entry.spellAttackBonus)) : "";
    const saveText = entry.spellSaveDc != null ? `DC ${entry.spellSaveDc}` : "";
    return {
      title: entry.detail.name || entry.spell,
      kind: "Spell",
      tag: levelText,
      economy: normalizeActionEconomy(castingTime),
      cost: [castingTime, levelText].filter(Boolean).join(" | "),
      roll: [attackText ? `Spell attack ${attackText}` : "", saveText ? `Save ${saveText}` : ""].filter(Boolean).join(" / "),
      range: entry.detail.range || "-",
      effectLabel: "Effect",
      effect: getPlayerSafeDetailSummary(entry.detail, "Spell details pending; confirm the exact effect at the table."),
      summary: entry.detail.duration ? `Duration: ${entry.detail.duration}` : "",
      detail: entry.detail
    };
  });
}

function collectFeatureEconomyCards(character, sheetContext, entries = collectFeatureActionCards(character, sheetContext)) {
  return entries.map(({ feature, detail }) => {
    const matchingResource = findMatchingResource(character, feature.name);
    const text = [feature.name, detail.name, detail.summary, detail.fullText].join(" ");
    const saveMatch = /\bDC\s+\d+\b/i.exec(text);
    const uses = matchingResource
      ? formatActionUses(matchingResource.resource.current, matchingResource.resource.max, matchingResource.resource.recharge)
      : "";

    return {
      title: detail.name || feature.name || "Feature",
      kind: "Feature",
      tag: getFeatureGroupLabel(feature),
      economy: inferActionEconomy(feature.name, detail.name, detail.summary, detail.fullText),
      cost: inferActionEconomy(feature.name, detail.name, detail.summary, detail.fullText),
      roll: saveMatch?.[0] ?? "-",
      range: "-",
      effectLabel: "Effect",
      effect: getPlayerSafeDetailSummary(detail),
      uses,
      detail,
      renderControls: matchingResource
        ? (renderOptions) => renderActionResourceControls(matchingResource.resource, matchingResource.index, renderOptions)
        : null
    };
  });
}

function collectResourceEconomyCards(character, sheetContext) {
  return toArray(character.resources)
    .map((resource, index) => ({ resource, index }))
    .filter(({ resource }) => ["counter", "pool", "static"].includes(String(resource.kind ?? "")))
    .map(({ resource, index }) => {
      const detail = findMatchingFeatureDetail(character, sheetContext, resource.name);
      const isSpendable = ["counter", "pool"].includes(String(resource.kind ?? ""));
      const value = resource.kind === "static"
        ? Array.isArray(resource.value) ? resource.value.join(", ") : resource.value
        : formatActionUses(resource.current, resource.max, resource.recharge);

      return {
        title: resource.name ?? "Resource",
        kind: "Resource",
        tag: titleCase(resource.kind ?? "resource"),
        economy: inferActionEconomy(resource.name, resource.note, detail?.summary, detail?.fullText),
        cost: isSpendable ? "Spend 1" : "Always On",
        roll: "-",
        range: "-",
        effectLabel: isSpendable ? "Remaining" : "Value",
        effect: value || "-",
        uses: isSpendable ? value : "",
        summary: resource.note && !isDeveloperProvenanceText(resource.note)
          ? resource.note
          : getPlayerSafeDetailSummary(detail ?? {}, ""),
        detail,
        renderControls: isSpendable
          ? (renderOptions) => renderActionResourceControls(resource, index, renderOptions)
          : null
      };
    });
}

function collectItemEconomyCards(character, sheetContext, entries = collectItemActionCards(character, sheetContext)) {
  return entries.map(({ item, detail }) => ({
    title: item.name ?? detail.displayName ?? "Item",
    kind: "Item",
    tag: `x${item.quantity ?? 1}`,
    economy: inferActionEconomy(item.name, item.notes, detail.summary, detail.fullText) === "Free/Other"
      ? "Action"
      : inferActionEconomy(item.name, item.notes, detail.summary, detail.fullText),
    cost: "Inventory",
    roll: "-",
    range: "-",
    effectLabel: "Effect",
    effect: getPlayerSafeDetailSummary(detail, (item.notes && !isDeveloperProvenanceText(item.notes) ? item.notes : "") || "Inventory details pending; confirm the table effect when it matters."),
    uses: `Quantity ${item.quantity ?? 1}`,
    detail
  }));
}

function collectBasicEconomyCards() {
  return BASIC_ACTIONS.map(([name, cost, summary]) => ({
    title: name,
    kind: "Common",
    economy: normalizeActionEconomy(cost),
    cost,
    roll: "As needed",
    range: "-",
    effectLabel: "Effect",
    effect: summary
  }));
}

function collectAtTableActionCards(character, sheetContext) {
  const actionContent = collectActionCards(character, sheetContext);
  const primaryCards = [
    ...collectWeaponEconomyCards(character, sheetContext),
    ...collectSpellEconomyCards(character, sheetContext, actionContent.spells),
    ...collectFeatureEconomyCards(character, sheetContext, actionContent.features),
    ...collectResourceEconomyCards(character, sheetContext),
    ...collectItemEconomyCards(character, sheetContext, actionContent.items),
    ...collectBasicEconomyCards()
  ];

  const seenResources = new Set(actionContent.features
    .map(({ feature }) => findMatchingResource(character, feature.name)?.index)
    .filter((index) => index != null));

  return {
    ...actionContent,
    cards: primaryCards.filter((card, index) => {
      if (card.kind !== "Resource") {
        return true;
      }

      const resourceIndex = toArray(character.resources)
        .findIndex((resource) => normalizeSearchText(resource.name) === normalizeSearchText(card.title));
      if (seenResources.has(resourceIndex)) {
        return false;
      }

      return primaryCards.findIndex((candidate) => (
        candidate.kind === card.kind
        && normalizeSearchText(candidate.title) === normalizeSearchText(card.title)
      )) === index;
    })
  };
}

function renderSpellCombatShortcuts(character) {
  const spellcasters = toArray(character.classes)
    .map((entry) => entry.spellcasting)
    .filter(Boolean);

  if (!spellcasters.length) {
    return "";
  }

  return `
    <section class="card character-sheet-actions-section">
      <h2 class="section-title">Spell Math</h2>
      <div class="player-quick-grid">
        ${spellcasters.map((spellcasting) => {
          const math = getSpellcastingMath(character, spellcasting);
          return [
            renderQuickMetric("Spell Attack", formatModifier(Number(math.spellAttackBonus ?? 0)), math.attackFormula || ""),
            renderQuickMetric("Save DC", math.spellSaveDc ?? "-", math.saveFormula || ""),
            renderQuickMetric("Ability", String(spellcasting.ability ?? "-").toUpperCase(), titleCase(spellcasting.preparationStyle ?? ""))
          ].join("");
        }).join("")}
      </div>
    </section>
  `;
}

function renderSpellActionShortcuts(entries = []) {
  if (!entries.length) {
    return "";
  }

  return `
    <section class="card character-sheet-actions-section">
      <h2 class="section-title">Spell Actions</h2>
      <div class="features-grid character-sheet-action-grid">
        ${entries.map((entry) => {
          const attackText = entry.spellAttackBonus != null
            ? formatModifier(Number(entry.spellAttackBonus))
            : "-";
          const saveText = entry.spellSaveDc != null ? `DC ${entry.spellSaveDc}` : "-";
          return `
            <article
              class="feature-card character-sheet-action-card"
              ${renderRuleDetailAttributes(entry.detail, { title: entry.detail.name || "Spell", kind: "Spell" })}
              role="button"
              tabindex="0"
            >
              <div class="class-head">
                <h3>${renderRuleDetailButton(entry.detail.name || "Spell", entry.detail, { kind: "Spell" })}</h3>
                <div class="character-badges">
                  <span class="badge">${escapeHtml(entry.detail.castingTime || "Cast")}</span>
                  <span class="badge">${escapeHtml(formatSpellLevel(entry.detail.level) || entry.list)}</span>
                </div>
              </div>
              <div class="compact-list">
                <div class="label-row"><span>Attack / Save</span><strong>${escapeHtml([attackText !== "-" ? attackText : null, saveText !== "-" ? saveText : null].filter(Boolean).join(" / ") || "-")}</strong></div>
                <div class="label-row"><span>Range</span><strong>${escapeHtml(entry.detail.range || "-")}</strong></div>
              </div>
              <p class="fine-print">${escapeHtml(getPlayerSafeDetailSummary(entry.detail, "Spell details pending; confirm the exact effect at the table."))}</p>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderBasicActions() {
  return `
    <section class="card character-sheet-actions-section">
      <h2 class="section-title">Common Actions</h2>
      <div class="features-grid character-sheet-action-grid">
        ${BASIC_ACTIONS.map(([name, cost, summary]) => `
          <article class="feature-card character-sheet-action-card">
            <div class="class-head">
              <h3>${escapeHtml(name)}</h3>
              <span class="badge">${escapeHtml(cost)}</span>
            </div>
            <p class="fine-print">${escapeHtml(summary)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function isActionFeature(feature = {}, detail = {}) {
  const text = [
    feature.name,
    feature.source,
    detail.name,
    detail.summary
  ].filter(Boolean).join(" ");
  return /\b(action|bonus action|reaction|attack|cast|use|spend|regain|damage|heal|save dc|saving throw|turn|rebuke|surge|wind|shape|inspiration|portent|lucky|ki|channel)\b/i.test(text);
}

function renderFeatureActionShortcuts(character, sheetContext, entries = collectFeatureActionCards(character, sheetContext)) {
  if (!entries.length) {
    return "";
  }

  return `
    <section class="card character-sheet-actions-section">
      <h2 class="section-title">Feature Actions</h2>
      <div class="features-grid character-sheet-action-grid">
        ${entries.map(({ feature, detail }) => `
          <article class="feature-card character-sheet-action-card">
            <div class="class-head">
              <h3>${renderRuleDetailButton(detail.name || feature.name || "Feature", detail, { kind: "Feature" })}</h3>
              <span class="badge">${escapeHtml(titleCase((feature.source ?? "feature").split("-")[0]))}</span>
            </div>
            <p class="fine-print">${escapeHtml(detail.summary || "Feature detail available from the rules entry.")}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function isActionItem(item = {}, detail = {}) {
  const text = [item.name, item.notes, detail.displayName, detail.summary, detail.variantSummary].filter(Boolean).join(" ");
  return /\b(potion|scroll|wand|rod|staff of|talisman|amulet|use|charge|cast|spell|activate|consume)\b/i.test(text);
}

function renderItemActionShortcuts(character, sheetContext, entries = collectItemActionCards(character, sheetContext)) {
  if (!entries.length) {
    return "";
  }

  return `
    <section class="card character-sheet-actions-section">
      <h2 class="section-title">Item Actions</h2>
      <div class="features-grid character-sheet-action-grid">
        ${entries.map(({ item, detail }) => `
          <article
            class="item-card character-sheet-action-card"
            ${renderRuleDetailAttributes(detail, { title: item.name ?? "Item", kind: "Item" })}
            role="button"
            tabindex="0"
          >
            <div class="class-head">
              <h3>${renderRuleDetailButton(item.name ?? "Item", detail, { kind: "Item" })}</h3>
              <span class="badge">x${escapeHtml(item.quantity ?? 1)}</span>
            </div>
            <p class="fine-print">${escapeHtml(detail.summary || (item.notes && !isDeveloperProvenanceText(item.notes) ? item.notes : "") || "Use from inventory when the table calls for it.")}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderItemCatalogDetails(item, sheetContext, character) {
  if (!sheetContext.catalogAvailable) {
    return "";
  }

  const detail = resolveItemDetail(item, sheetContext, character);
  if (!detail.resolved) {
    return "";
  }

  const tags = [
    detail.type ? `Catalog: ${detail.type}` : null,
    detail.rarity && detail.rarity !== "none" ? detail.rarity : null,
    detail.weight != null ? `${detail.weight} lb.` : null,
    detail.attunement?.required ? "attunement" : null,
    detail.source
  ].filter(Boolean).join(" | ");

  const propertySummary = detail.properties?.length
    ? detail.properties.map((property) => `${property.name}${property.summary ? `: ${property.summary}` : ""}`).join(" | ")
    : "";

  return `
    <div
      class="catalog-detail-pane"
      data-catalog-status="resolved"
      ${renderRuleDetailAttributes(detail, { title: detail.displayName || item?.name, kind: "Item" })}
      role="button"
      tabindex="0"
    >
      <p class="source-line">${escapeHtml(tags || "Item detail")}</p>
      ${detail.variantName ? `<p class="source-line">Variant: ${escapeHtml(detail.variantName)}${detail.variantSummary ? ` | ${escapeHtml(detail.variantSummary)}` : ""}</p>` : ""}
      ${detail.summary ? `<p class="fine-print">${escapeHtml(detail.summary)}</p>` : ""}
      ${propertySummary ? `<p class="fine-print">Properties: ${escapeHtml(propertySummary)}</p>` : ""}
    </div>
  `;
}

function getItemPropertySummary(detail = {}) {
  return detail.properties?.length
    ? detail.properties.map((property) => `${property.name}${property.summary ? `: ${property.summary}` : ""}`).join(" | ")
    : "";
}

function getItemDetailRulesText(detail = {}, item = {}) {
  return [
    detail.fullText,
    detail.variantSummary,
    getItemPropertySummary(detail),
    item.notes && !isDeveloperProvenanceText(item.notes) ? item.notes : ""
  ].filter(Boolean).join("\n\n");
}

function getItemRuleDetail(detail = {}, item = {}) {
  return {
    ...detail,
    fullText: getItemDetailRulesText(detail, item) || detail.fullText
  };
}

/**
 * Adds up active modifier entries from a schema modifier array.
 * Present as a utility for future derived displays; currently available to renderer helpers.
 */
function sumActiveModifiers(modifiers = []) {
  return modifiers.reduce((total, modifier) => {
    if (modifier?.active === false) {
      return total;
    }

    return total + Number(modifier?.amount ?? 0);
  }, 0);
}

/**
 * Renders either the portrait image or a single-letter fallback badge.
 * Called only by renderHeader().
 */
function getPortraitInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function renderPortrait(identity) {
  const name = identity?.name ?? "Character";
  const initials = getPortraitInitials(name);
  const portraitUrl = resolveManifestRelativeUrl(identity?.portraitUrl);
  if (identity?.portraitUrl) {
    return `
      <div class="portrait" data-character-portrait>
        <div class="portrait-fallback chip" aria-hidden="true">${escapeHtml(initials)}</div>
        <img data-character-portrait-image src="${escapeHtml(portraitUrl)}" alt="${escapeHtml(name)} portrait">
      </div>
    `;
  }

  return `<div class="portrait" data-character-portrait><div class="portrait-fallback chip" role="img" aria-label="${escapeHtml(name)} portrait initials">${escapeHtml(initials)}</div></div>`;
}

/**
 * Builds the small badge strip shown in the sheet header.
 * Called only by renderHeader().
 */
function renderBadgeList(identity, character) {
  const badges = [];

  badges.push(`<span class="badge badge-accent">Level ${escapeHtml(character.level)}</span>`);
  badges.push(`<span class="badge">${escapeHtml(character.identity?.race?.name ?? "-")}${identity?.race?.subrace ? `, ${escapeHtml(identity.race.subrace)}` : ""}</span>`);
  badges.push(`<span class="badge">${escapeHtml(identity?.background?.name ?? "-")}</span>`);

  if (identity?.inspiration) {
    badges.push(`<span class="badge badge-success">Inspired</span>`);
  }

  if ((character.featureChoices ?? []).some((choice) => choice?.resolved === false)) {
    badges.push(`<span class="badge badge-warning">Pending Decisions</span>`);
  }

  return badges.join("");
}

function renderIdentityCatalogDetails(identity = {}, sheetContext, character) {
  if (!sheetContext.catalogAvailable) {
    return "";
  }

  const raceDetail = resolveRaceDetail(identity.race, sheetContext, character);
  const backgroundDetail = resolveBackgroundDetail(identity.background, sheetContext, character);

  return `
    <div class="catalog-detail-grid catalog-detail-grid-compact">
      ${renderCatalogDetailPane("Ancestry Detail", raceDetail, [
        { label: "Catalog Name", value: raceDetail.name },
        { label: "Source", value: raceDetail.source || "-" },
        { label: "Speed", value: raceDetail.speed },
        { label: "Traits", value: raceDetail.traits?.slice(0, 3).join(", ") }
      ])}
      ${renderCatalogDetailPane("Background Detail", backgroundDetail, [
        { label: "Feature", value: backgroundDetail.feature },
        { label: "Source", value: backgroundDetail.source || "-" },
        { label: "Grants", value: backgroundDetail.grants }
      ])}
    </div>
  `;
}

/**
 * Renders the top-of-sheet identity block.
 * Called only by renderCharacterSheet().
 */
function renderHeader(character, sheetContext) {
  const { identity } = character;
  const classSummary = (character.classes ?? [])
    .map((entry) => {
      const className = cleanRefName(entry.main);
      const subclass = entry.sub ? `, ${entry.sub}` : "";
      const levels = `${entry.levels?.length ?? 0}`;
      return `${className} ${levels}${subclass}`;
    })
    .join(" / ");

  return `
    <section class="card sheet-header">
      ${renderPortrait(identity)}
      <div>
        <h1 class="character-name">${escapeHtml(identity?.name ?? "Unknown Character")}</h1>
        <p class="character-line">${escapeHtml(classSummary || "No class data")}</p>
        <p class="character-subline">
          ${escapeHtml(identity?.alignment ?? "Unaligned")}
          | XP ${escapeHtml(identity?.experience ?? 0)}
          ${identity?.playerName ? `| Player ${escapeHtml(identity.playerName)}` : ""}
        </p>
        <div class="character-badges">${renderBadgeList(identity, character)}</div>
        ${renderIdentityCatalogDetails(identity, sheetContext, character)}
      </div>
    </section>
  `;
}

/**
 * Renders the six ability score cards.
 * Called only by renderCharacterSheet().
 */
function renderAbilityStats(character) {
  const cards = ABILITY_ORDER.map((ability) => {
    const score = Number(character.abilities?.[ability]?.score ?? 10);
    return `
      <article class="stat-card">
        <h3>${escapeHtml(ABILITY_LABELS[ability])}</h3>
        <div class="stat-score">${score}</div>
        <div class="stat-mod">${formatModifier(abilityMod(score))}</div>
      </article>
    `;
  }).join("");

  return `
    <section class="card">
      <h2 class="section-title">Abilities</h2>
      <div class="stats-grid">${cards}</div>
    </section>
  `;
}

/**
 * Renders one reusable stat panel for HP, AC, or speed.
 * Called only by renderCoreStats().
 */
function renderStatPanel(title, base, value, modifiers, extraRows = []) {
  const modifierMarkup = modifiers?.length
    ? `
      <ul class="modifier-list">
        ${modifiers.map((modifier) => {
          const amount = Number(modifier?.amount ?? 0);
          const state = modifier?.active === false ? "inactive" : "active";
          const conditional = modifier?.conditional ? ` (${escapeHtml(modifier.conditional)})` : "";
          return `<li><strong>${escapeHtml(modifier?.name ?? "Modifier")}</strong>: ${formatModifier(amount)} <span class="subtext">[${state}]</span>${conditional}</li>`;
        }).join("")}
      </ul>
    `
    : `<p class="fine-print">No modifiers recorded.</p>`;

  const extraMarkup = extraRows.length
    ? `<div class="compact-list">${extraRows.map((row) => `<div class="label-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div>`
    : "";

  return `
    <article class="panel">
      <h3>${escapeHtml(title)}</h3>
      <div class="value-row">
        <span class="subtext">Base ${escapeHtml(base)}</span>
        <span class="big-value">${escapeHtml(value)}</span>
      </div>
      ${extraMarkup}
      ${modifierMarkup}
    </article>
  `;
}

function renderHpTracker(character, options = {}) {
  const canEdit = isEditableSheetMode(options);
  return `
    <article class="panel character-sheet-tracker-card" data-sheet-control-group>
      <h3>Hit Points</h3>
      <div class="value-row">
        <span class="subtext">Current / Max</span>
        <span class="big-value">${escapeHtml(formatHpDisplay(character))}</span>
      </div>
      ${canEdit ? `
        <div class="inventory-control-row">
          ${renderInlineNumberControl("hp-amount", 1, { label: "HP amount", min: 0 })}
          ${renderInlineActionButton("hp-damage", "Damage", { "data-amount-control": "hp-amount" }, { danger: true })}
          ${renderInlineActionButton("hp-heal", "Heal", { "data-amount-control": "hp-amount" })}
        </div>
        <div class="inventory-control-row">
          ${renderInlineNumberControl("hp-temp", character.hp?.temp ?? 0, { label: "Temporary HP", min: 0 })}
          ${renderInlineActionButton("hp-temp", "Set Temp", { "data-amount-control": "hp-temp" }, { quiet: true })}
          ${renderInlineActionButton("hp-sync-max", "Full HP", {}, { quiet: true })}
        </div>
      ` : ""}
    </article>
  `;
}

function renderDeathSaveTracker(character, options = {}) {
  const canEdit = isEditableSheetMode(options);
  const successes = Number(character.deathSaves?.successes ?? 0);
  const failures = Number(character.deathSaves?.failures ?? 0);
  return `
    <article class="panel character-sheet-tracker-card">
      <h3>Death Saves</h3>
      <div class="compact-list">
        <div class="label-row"><span>Successes</span><strong>${escapeHtml(successes)} / 3</strong></div>
        <div class="label-row"><span>Failures</span><strong>${escapeHtml(failures)} / 3</strong></div>
      </div>
      ${canEdit ? `
        <div class="inventory-control-row">
          ${renderInlineActionButton("death-save-success", "+ Success", { "data-delta": "1" }, { quiet: true })}
          ${renderInlineActionButton("death-save-failure", "+ Failure", { "data-delta": "1" }, { danger: true })}
          ${renderInlineActionButton("death-save-reset", "Reset", {}, { quiet: true })}
        </div>
      ` : ""}
    </article>
  `;
}

function renderHitDiceTracker(character, options = {}) {
  const canEdit = isEditableSheetMode(options);
  const hitDice = toArray(character.hitDice);
  return `
    <article class="panel character-sheet-tracker-card">
      <h3>Hit Dice</h3>
      ${hitDice.length
        ? `<div class="compact-list">${hitDice.map((die, index) => `
          <div class="label-row" data-sheet-control-group>
            <span>${escapeHtml(die.class ?? "Hit Die")} ${escapeHtml(die.size ?? "")}</span>
            <strong>${escapeHtml(die.remaining ?? 0)} / ${escapeHtml(die.total ?? 0)}</strong>
            ${canEdit ? `
              <span class="inventory-control-row">
                ${renderInlineActionButton("hit-die-adjust", "-", { "data-index": index, "data-delta": "-1" }, { quiet: true })}
                ${renderInlineActionButton("hit-die-adjust", "+", { "data-index": index, "data-delta": "1" }, { quiet: true })}
                ${renderInlineActionButton("hit-die-reset", "Reset", { "data-index": index }, { quiet: true })}
              </span>
            ` : ""}
          </div>
        `).join("")}</div>`
        : `<p class="fine-print">No hit dice recorded.</p>`}
    </article>
  `;
}

function renderAcBreakdown(character, sheetContext) {
  const armorClass = getArmorClassBreakdown(character, sheetContext);
  const rows = [
    { label: "Armor Class", value: character.ac?.value ?? "-" },
    { label: "Breakdown", value: armorClass.formula || `Saved AC ${character.ac?.value ?? "-"}` },
    armorClass.armorName ? { label: "Armor", value: armorClass.armorName } : null,
    armorClass.shieldName ? { label: "Shield", value: armorClass.shieldName } : null
  ].filter(Boolean);

  return `
    <article class="panel character-sheet-tracker-card">
      <h3>Armor Class</h3>
      <div class="compact-list">
        ${rows.map((row) => `<div class="label-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}
      </div>
      ${armorClass.overridden ? `<p class="fine-print">Using the saved sheet AC. Ask the DM if armor, shield, or magic modifiers change.</p>` : ""}
    </article>
  `;
}

function renderSavingThrowSummary(character) {
  return `
    <article class="table-card character-sheet-tracker-card">
      <h3>Saving Throws</h3>
      <div class="features-grid character-sheet-save-grid">
        ${getSavingThrowCards(character).map((save) => `
          <div class="label-row">
            <span>${escapeHtml(save.label)}${save.proficient ? " (prof)" : ""}</span>
            <strong>${formatModifier(save.total)}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderPassiveScores(character) {
  const skills = getSkillCards(character);
  const byKey = Object.fromEntries(skills.map((skill) => [normalizeSearchText(skill.label), skill]));
  const passiveRows = [
    ["Passive Perception", byKey.perception?.passive],
    ["Passive Investigation", byKey.investigation?.passive],
    ["Passive Insight", byKey.insight?.passive]
  ];

  return `
    <article class="panel">
      <h3>Passive Scores</h3>
      <div class="compact-list">
        ${passiveRows.map(([label, value]) => `<div class="label-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "-")}</strong></div>`).join("")}
      </div>
    </article>
  `;
}

/**
 * Renders the core combat/stat section containing HP, AC, and speed summaries.
 * Called only by renderCharacterSheet().
 */
function renderArmorClassRows(character, sheetContext) {
  const armorClass = getArmorClassBreakdown(character, sheetContext);
  const rows = [
    { label: "Computed", value: armorClass.computedValue ?? "-" },
    { label: "Formula", value: armorClass.formula },
    armorClass.armorName ? { label: "Armor", value: armorClass.armorName } : null,
    armorClass.shieldName ? { label: "Shield", value: armorClass.shieldName } : null
  ].filter(Boolean);

  if (armorClass.overridden) {
    rows.push({
      label: "Manual",
      value: armorClass.note || "Stored value overrides computed AC."
    });
  }

  return rows;
}

function renderCoreStats(character, sheetContext, options = {}) {
  const hpDiff = Number(character.hp?.max ?? 0) - Number(character.hp?.base ?? 0);
  const acDiff = Number(character.ac?.value ?? 0) - Number(character.ac?.base ?? 0);
  const speedDiff = Number(character.speed?.value ?? 0) - Number(character.speed?.base ?? 0);

  return `
    <section class="card">
      <h2 class="section-title">Combat</h2>
      <div class="panel-grid">
        ${renderStatPanel("Hit Points", character.hp?.base ?? 0, character.hp?.max ?? 0, character.hp?.modifiers ?? [], [
          { label: "Current", value: character.hp?.current ?? 0 },
          { label: "Temp", value: character.hp?.temp ?? 0 },
          { label: "Modifier Total", value: formatModifier(hpDiff) }
        ])}
        ${renderStatPanel("Armor Class", character.ac?.base ?? 0, character.ac?.value ?? 0, character.ac?.modifiers ?? [], [
          { label: "Initiative", value: formatModifier(character.initiative ?? 0) },
          { label: "Prof. Bonus", value: formatModifier(character.proficiencyBonus ?? 0) },
          { label: "Modifier Total", value: formatModifier(acDiff) },
          ...renderArmorClassRows(character, sheetContext)
        ])}
        ${renderStatPanel("Speed", character.speed?.base ?? 0, character.speed?.value ?? 0, character.speed?.modifiers ?? [], [
          { label: "Death Saves", value: `${character.deathSaves?.successes ?? 0} / ${character.deathSaves?.failures ?? 0}` },
          { label: "Hit Dice", value: (character.hitDice ?? []).map((die) => `${die.remaining}/${die.total} ${die.size}`).join(", ") || "-" },
          { label: "Modifier Total", value: formatModifier(speedDiff) }
        ])}
      </div>
      <div style="margin-top: 1rem;">
        ${renderAttackCards(character, sheetContext, options)}
      </div>
    </section>
  `;
}

/**
 * Renders the saving-throw table.
 * Called only by renderProficiencies().
 */
function renderSavingThrows(character) {
  const rows = getSavingThrowCards(character).map((save) => `
      <tr>
        <td>${escapeHtml(save.label)}${save.overridden ? ` <span class="badge badge-warning">Override</span>` : ""}</td>
        <td>${formatModifier(save.total)}</td>
        <td>${save.proficient ? "Yes" : "No"}</td>
        <td class="source-line">${escapeHtml(save.formula)}</td>
        <td class="source-line">${escapeHtml(formatPlayerFacingSource(save.source))}</td>
      </tr>
    `).join("");

  return `
    <article class="table-card">
      <h3>Saving Throws</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Save</th>
            <th>Total</th>
            <th>Prof.</th>
            <th>Formula</th>
            <th>Granted By</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

/**
 * Renders the skill proficiency table.
 * Called only by renderProficiencies().
 */
function renderSkills(character) {
  const rows = getSkillCards(character).map((skill) => `
      <tr>
        <td>${escapeHtml(skill.label)}${skill.overridden ? ` <span class="badge badge-warning">Override</span>` : ""}</td>
        <td>${escapeHtml(skill.abilityLabel)}</td>
        <td>${formatModifier(skill.total)}</td>
        <td>${escapeHtml(skill.passive)}</td>
        <td>${skill.proficient ? (skill.expertise ? "Expertise" : "Yes") : "No"}</td>
        <td class="source-line">${escapeHtml(skill.formula)}</td>
        <td class="source-line">${escapeHtml(formatPlayerFacingSource(skill.source))}</td>
      </tr>
    `).join("");

  return `
    <article class="table-card">
      <h3>Skills</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Ability</th>
            <th>Total</th>
            <th>Passive</th>
            <th>Training</th>
            <th>Formula</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

/**
 * Renders one proficiency list card for armor, weapons, tools, or languages.
 * Called only by renderProficiencies().
 */
function renderProficiencySection(title, entries, formatter) {
  if (!entries?.length) {
    return `
      <article class="panel">
        <h3>${escapeHtml(title)}</h3>
        <p class="fine-print">None recorded.</p>
      </article>
    `;
  }

  return `
    <article class="panel">
      <h3>${escapeHtml(title)}</h3>
      <ul class="compact-list">
        ${entries.map((entry) => `<li>${formatter(entry)}</li>`).join("")}
      </ul>
    </article>
  `;
}

/**
 * Renders the training section that combines saves, skills, and proficiency lists.
 * Called only by renderCharacterSheet().
 */
function renderProficiencies(character) {
  const { proficiencies } = character;

  return `
    <section class="card">
      <h2 class="section-title">Training</h2>
      <div class="split-grid">
        <div class="notes-area">
          ${renderSavingThrows(character)}
          ${renderSkills(character)}
        </div>
        <div class="notes-area">
          ${renderProficiencySection("Armor", proficiencies?.armor ?? [], (entry) => `${escapeHtml(entry.name)} <span class="source-line">(${escapeHtml(formatPlayerFacingSource(entry.grantedBy))}${entry.multiclass ? ", multiclass" : ""})</span>`)}
          ${renderProficiencySection("Weapons", proficiencies?.weapons ?? [], (entry) => `${escapeHtml(entry.name)} <span class="source-line">(${escapeHtml(formatPlayerFacingSource(entry.grantedBy))}${entry.multiclass ? ", multiclass" : ""})</span>`)}
          ${renderProficiencySection("Tools", proficiencies?.tools ?? [], (entry) => `${escapeHtml(entry.name)} <span class="source-line">(${escapeHtml(formatPlayerFacingSource(entry.grantedBy))}${entry.expertise ? ", expertise" : ""})</span>`)}
          ${renderProficiencySection("Languages", proficiencies?.languages ?? [], (entry) => escapeHtml(entry))}
        </div>
      </div>
    </section>
  `;
}

/**
 * Converts schema ref-like names into human-readable class/race/background labels.
 * Called by renderHeader() and renderClasses().
 */
function cleanRefName(ref) {
  return String(ref ?? "Unknown")
    .replace(/\.json$/i, "")
    .replace(/^class-/i, "")
    .replace(/^subclass-/i, "")
    .replace(/^background-/i, "")
    .replace(/^race-/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// The renderer stays deliberately dumb about 5e rules logic. It trusts the stored
// schema values and focuses on presenting the recorded state clearly.
function getStoredSpellName(value = {}) {
  return typeof value === "string"
    ? String(value)
    : String(value.name ?? value.spell ?? "");
}

function getSpellRecordKey(detail = {}, value = {}) {
  return [
    normalizeSearchText(detail.name || getStoredSpellName(value)),
    normalizeSearchText(detail.source || value.source)
  ].join("|");
}

function getSpellPoolStatus(spellPool = {}) {
  switch (spellPool.type) {
    case "spellbook":
      return "spellbook";
    case "known-list":
      return "known";
    case "class-list":
      return "available";
    default:
      return "known";
  }
}

function getSpellStatusLabel(status) {
  return {
    prepared: "prepared",
    known: "known",
    spellbook: "spellbook",
    available: "available",
    "always-prepared": "always prepared",
    cantrip: "cantrip"
  }[status] ?? status;
}

function createSpellRecord(value, sheetContext, character) {
  const detail = resolveSpellDetail(value, sheetContext, character);
  return {
    key: getSpellRecordKey(detail, value),
    value,
    detail,
    statuses: new Set(),
    from: new Set()
  };
}

function collectSpellRecords(spellcasting = {}, sheetContext, character) {
  const records = new Map();
  const addRecord = (value, statuses = [], from = "") => {
    const record = createSpellRecord(value, sheetContext, character);
    if (!record.key.trim()) {
      return;
    }

    const existing = records.get(record.key) ?? record;
    for (const status of statuses.filter(Boolean)) {
      existing.statuses.add(status);
    }
    if (from) {
      existing.from.add(from);
    }
    records.set(record.key, existing);
  };

  for (const spell of toArray(spellcasting.cantrips)) {
    addRecord(spell, ["cantrip", "known"], "Cantrips");
  }

  for (const spell of toArray(spellcasting.preparedSpells)) {
    addRecord(spell, ["prepared"], "Prepared");
  }

  for (const entry of toArray(spellcasting.alwaysPrepared)) {
    addRecord(entry, ["always-prepared"], entry.fromFeature || "Always Prepared");
  }

  const spellPoolStatus = getSpellPoolStatus(spellcasting.spellPool);
  for (const entry of toArray(spellcasting.spellPool?.entries)) {
    addRecord(entry, [spellPoolStatus], titleCase(spellcasting.spellPool?.type ?? "Spell Pool"));
  }

  return [...records.values()].sort((left, right) => {
    const leftLevel = Number.isFinite(Number(left.detail.level)) ? Number(left.detail.level) : 99;
    const rightLevel = Number.isFinite(Number(right.detail.level)) ? Number(right.detail.level) : 99;
    if (leftLevel !== rightLevel) {
      return leftLevel - rightLevel;
    }

    return String(left.detail.name).localeCompare(String(right.detail.name));
  });
}

function getSpellLevelGroupKey(record) {
  if (record.statuses.has("cantrip") || record.detail.level === 0) {
    return "0";
  }

  return Number.isFinite(Number(record.detail.level))
    ? String(Number(record.detail.level))
    : "unknown";
}

function getSpellLevelGroupTitle(groupKey) {
  if (groupKey === "0") {
    return "Cantrips";
  }

  if (groupKey === "unknown") {
    return "Unknown Level";
  }

  return `${formatSpellLevel(Number(groupKey))} Level`;
}

function getSpellCardBadges(record) {
  return [
    ...[...record.statuses].map(getSpellStatusLabel),
    record.detail.ritual ? "ritual" : null,
    record.detail.concentration ? "concentration" : null
  ].filter(Boolean);
}

function getSpellCardTags(record) {
  return [
    formatSpellLevel(record.detail.level),
    record.detail.school,
    formatPlayerFacingSource(record.detail.source)
  ].filter(Boolean).join(" | ");
}

function getSpellRecordBadges(record) {
  return [
    [formatSpellLevel(record.detail.level), "accent"],
    [record.detail.school, ""],
    [formatSpellComponentSummary(record.detail.components), ""],
    record.detail.concentration ? ["concentration", "warning"] : null,
    record.detail.ritual ? ["ritual", "success"] : null,
    [formatPlayerFacingSource(record.detail.source), getSourceBadgeTone(record.detail.source)],
    ...[...record.statuses].map((status) => [getSpellStatusLabel(status), status === "prepared" ? "success" : ""])
  ].filter(Boolean);
}

function getSpellActionAttributes(record, classIndex) {
  return {
    "data-class-index": classIndex,
    "data-name": record.detail.name || getStoredSpellName(record.value),
    "data-source": record.detail.source ?? "",
    "data-ref": record.detail.ref ?? "",
    "data-spell-level": record.detail.level ?? "",
    "data-school": record.detail.school ?? ""
  };
}

function renderSpellCardControls(record, classIndex, spellcasting, options = {}) {
  if (!isEditableSheetMode(options)) {
    return "";
  }

  const isPreparedCaster = Array.isArray(spellcasting.preparedSpells);
  const isCantrip = record.statuses.has("cantrip") || record.detail.level === 0;
  if (!isPreparedCaster || isCantrip) {
    return "";
  }

  const attributes = getSpellActionAttributes(record, classIndex);
  return `
    <div class="inventory-control-row" data-sheet-control-group>
      ${record.statuses.has("prepared")
        ? renderInlineActionButton("spell-unprepare", "Unprepare", attributes, { quiet: true })
        : renderInlineActionButton("spell-prepare", "Prepare", attributes)}
    </div>
  `;
}

function renderSpellRecordCard(record, classIndex, spellcasting, options = {}) {
  const spellName = record.detail.name || getStoredSpellName(record.value) || "Spell";
  const statusLine = [...record.from].filter(Boolean).join(", ") || getSpellCardTags(record);
  return `
    <tr
      class="character-sheet-record-row character-sheet-spell-card"
      ${renderRuleDetailAttributes(record.detail, { title: spellName, kind: "Spell" })}
      role="button"
      tabindex="0"
    >
      <td class="character-sheet-record-main">
        <strong>${escapeHtml(spellName)}</strong>
        ${statusLine ? `<span class="source-line">${escapeHtml(statusLine)}</span>` : ""}
      </td>
      <td>${renderBadgeCluster(getSpellRecordBadges(record))}</td>
      <td>${escapeHtml(record.detail.castingTime || "-")}</td>
      <td>${escapeHtml(record.detail.range || "-")}</td>
      <td>${escapeHtml(record.detail.duration || "-")}</td>
      <td class="character-sheet-record-actions">${renderSpellCardControls(record, classIndex, spellcasting, options)}</td>
    </tr>
  `;
}

function renderSpellRecordTable(records, classIndex, spellcasting, options = {}) {
  return `
    <div class="data-table-wrap character-sheet-record-list character-sheet-spell-record-list">
      <table class="data-table">
        <thead>
          <tr>
            <th>Spell</th>
            <th>Tags</th>
            <th>Cast</th>
            <th>Range</th>
            <th>Duration</th>
            <th>Upkeep</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((record) => renderSpellRecordCard(record, classIndex, spellcasting, options)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSpellLevelGroups(spellcasting, sheetContext, character, classIndex, options = {}) {
  const records = collectSpellRecords(spellcasting, sheetContext, character);
  if (!records.length) {
    return renderEmptyState("No spells recorded", "Spellcasting math is present, but the prepared, known, and spellbook lists are empty.", "Add or prepare spells.");
  }

  const groups = new Map();
  for (const record of records) {
    const groupKey = getSpellLevelGroupKey(record);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), record]);
  }

  return `
    <article class="panel character-sheet-spell-detail-panel">
      <h3>Spell Details</h3>
      ${[...groups.entries()].map(([groupKey, groupRecords]) => `
        <section class="character-sheet-spell-level-group">
          <h4>${escapeHtml(getSpellLevelGroupTitle(groupKey))}</h4>
          ${renderSpellRecordTable(groupRecords, classIndex, spellcasting, options)}
        </section>
      `).join("")}
    </article>
  `;
}

function renderPreparedCountSummary(spellcasting = {}) {
  const prepared = toArray(spellcasting.preparedSpells).length;
  const preparedLimit = Number(spellcasting.preparedCount);
  const known = toArray(spellcasting.spellPool?.entries).length;
  const knownLimit = Number(spellcasting.spellsKnown);
  const cantrips = toArray(spellcasting.cantrips).length;
  const cantripLimit = Number(spellcasting.cantripsKnown);
  const preparedFormula = formatPreparedFormula(spellcasting.preparedFormula);
  const warnings = [];

  if (Array.isArray(spellcasting.preparedSpells) && Number.isFinite(preparedLimit) && preparedLimit > 0) {
    if (prepared > preparedLimit) {
      warnings.push(`Over prepared by ${prepared - preparedLimit}.`);
    } else if (prepared < preparedLimit) {
      warnings.push(`${preparedLimit - prepared} preparation slot${preparedLimit - prepared === 1 ? "" : "s"} open.`);
    }
  }

  if (spellcasting.preparationStyle === "spells-known" && Number.isFinite(knownLimit) && knownLimit > 0 && known > knownLimit) {
    warnings.push(`Known spell count is over by ${known - knownLimit}.`);
  }

  if (Number.isFinite(cantripLimit) && cantripLimit > 0 && cantrips > cantripLimit) {
    warnings.push(`Cantrip count is over by ${cantrips - cantripLimit}.`);
  }

  return `
    <article class="panel character-sheet-spell-prep-summary">
      <h3>Preparation</h3>
      <div class="compact-list">
        <div class="label-row"><span>Style</span><strong>${escapeHtml(titleCase(spellcasting.preparationStyle ?? "-"))}</strong></div>
        <div class="label-row"><span>Prepared</span><strong>${escapeHtml(Array.isArray(spellcasting.preparedSpells) ? `${prepared} / ${Number.isFinite(preparedLimit) && preparedLimit > 0 ? preparedLimit : "-"}` : "Known list")}</strong></div>
        <div class="label-row"><span>Spellbook / Known</span><strong>${escapeHtml(Number.isFinite(knownLimit) && knownLimit > 0 ? `${known} / ${knownLimit}` : known)}</strong></div>
        <div class="label-row"><span>Cantrips</span><strong>${escapeHtml(Number.isFinite(cantripLimit) && cantripLimit > 0 ? `${cantrips} / ${cantripLimit}` : cantrips)}</strong></div>
      </div>
      ${preparedFormula ? `<p class="fine-print">${escapeHtml(preparedFormula)}</p>` : ""}
      ${warnings.length ? `<p class="fine-print">${escapeHtml(warnings.join(" "))}</p>` : `<p class="fine-print">Counts are advisory; the builder owns level-up legality.</p>`}
    </article>
  `;
}

/**
 * Renders a class-local spellcasting block using stored schema state.
 * Called by renderClasses() and the player-facing Spells tab.
 */
function renderSpellcasting(spellcasting, sheetContext, character, classIndex = 0, options = {}) {
  if (!spellcasting) {
    return `<p class="fine-print">No spellcasting recorded.</p>`;
  }

  const spellMath = getSpellcastingMath(character, spellcasting);

  return `
    <div class="notes-area character-sheet-spellcasting-card">
      <div class="meta-grid">
        <div class="meta-card">
          <h3>Ability</h3>
          <div class="big-value">${escapeHtml(String(spellcasting.ability ?? "-").toUpperCase())}</div>
        </div>
        <div class="meta-card">
          <h3>Spell Attack</h3>
          <div class="big-value">${formatModifier(Number(spellMath.spellAttackBonus ?? 0))}</div>
          <p class="fine-print">${escapeHtml(spellMath.attackFormula)}${spellMath.attackOverridden ? " | stored override" : ""}</p>
        </div>
        <div class="meta-card">
          <h3>Save DC</h3>
          <div class="big-value">${escapeHtml(spellMath.spellSaveDc ?? "-")}</div>
          <p class="fine-print">${escapeHtml(spellMath.saveFormula)}${spellMath.saveOverridden ? " | stored override" : ""}</p>
        </div>
      </div>
      ${renderPreparedCountSummary(spellcasting)}
      ${renderSpellLevelGroups(spellcasting, sheetContext, character, classIndex, options)}
    </div>
  `;
}

/**
 * Renders the per-level class progression table.
 * Called only by renderClasses().
 */
function renderLevelEntries(levels = []) {
  if (!levels.length) {
    return `<p class="fine-print">No level detail recorded.</p>`;
  }

  return `
    <table class="table">
      <thead>
        <tr>
          <th>Lvl</th>
          <th>HP</th>
          <th>Decisions</th>
          <th>Features Gained</th>
        </tr>
      </thead>
      <tbody>
        ${levels.map((entry) => `
          <tr>
            <td>${escapeHtml(entry.level)}</td>
            <td>${escapeHtml(entry.hpRolled ?? "-")}</td>
            <td>${(entry.decisions ?? []).length ? escapeHtml((entry.decisions ?? []).map(formatDecision).join("; ")) : "-"}</td>
            <td>${(entry.featuresGained ?? []).map(escapeHtml).join(", ") || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/**
 * Formats one class-level decision object into a compact display string.
 * Called only by renderLevelEntries().
 */
function formatDecision(decision) {
  const type = titleCase(decision?.type ?? "decision");

  if (typeof decision?.value === "string") {
    return `${type}: ${decision.value}`;
  }

  return `${type}: ${JSON.stringify(decision?.value ?? null)}`;
}

/**
 * Renders the full Classes & Spellcasting section, including shared spell slots.
 * Called only by renderCharacterSheet().
 */
function renderClasses(character, sheetContext) {
  const classCards = (character.classes ?? []).map((entry) => {
    const classDetail = resolveClassDetail(entry, sheetContext, character);
    const subclassDetail = entry.sub || entry.subclassRef
      ? resolveSubclassDetail(entry, sheetContext, character)
      : null;
    const prerequisites = entry.multiclassPrerequisite
      ? `${entry.multiclassPrerequisite.ability?.toUpperCase()} ${entry.multiclassPrerequisite.minimum} (${entry.multiclassPrerequisite.met ? "met" : "not met"})`
      : "None";

    return `
      <article class="class-card">
        <div class="class-head">
          <h3 class="class-name">
            ${escapeHtml(classDetail.name || cleanRefName(entry.main))}
            ${entry.sub ? `<span class="source-line">| ${escapeHtml(subclassDetail?.name || entry.sub)}</span>` : ""}
          </h3>
          <div class="character-badges">
            ${entry.isPrimary ? `<span class="badge badge-accent">Primary</span>` : ""}
            ${entry.isFirstClass ? `<span class="badge">First Class</span>` : ""}
            <span class="badge">Hit Die d${escapeHtml(entry.hitDieSize)}</span>
            ${sheetContext.catalogAvailable && !classDetail.resolved ? `<span class="badge badge-warning">Class unresolved</span>` : ""}
            ${sheetContext.catalogAvailable && subclassDetail && !subclassDetail.resolved ? `<span class="badge badge-warning">Subclass unresolved</span>` : ""}
          </div>
        </div>
        <div class="split-grid">
          <div class="notes-area">
            <article class="panel">
              <h3>Class Summary</h3>
              <div class="compact-list">
                <div class="label-row"><span>Levels Taken</span><strong>${escapeHtml(entry.levels?.length ?? 0)}</strong></div>
                <div class="label-row"><span>Catalog Source</span><strong>${escapeHtml(classDetail.source || "-")}</strong></div>
                <div class="label-row"><span>Saving Throws</span><strong>${escapeHtml(classDetail.savingThrows?.map((ability) => ability.toUpperCase()).join(", ") || "-")}</strong></div>
                <div class="label-row"><span>Caster Progression</span><strong>${escapeHtml(classDetail.casterProgression || "-")}</strong></div>
                <div class="label-row"><span>Subclass Ref</span><strong class="mono">${escapeHtml(entry.subclassRef ?? "-")}</strong></div>
                <div class="label-row"><span>Variant</span><strong>${escapeHtml(entry.subclassVariant ?? "-")}</strong></div>
                <div class="label-row"><span>Multiclass Prereq</span><strong>${escapeHtml(prerequisites)}</strong></div>
              </div>
              ${entry.fightingStyles?.length ? `<p class="fine-print">Fighting styles: ${entry.fightingStyles.map(escapeHtml).join(", ")}</p>` : ""}
            </article>
            ${sheetContext.catalogAvailable ? renderCatalogDetailPane("Class Detail", classDetail, [
              { label: "Hit Die", value: classDetail.hitDie },
              { label: "Subclass Title", value: classDetail.subclassTitle },
              { label: "Subclass Level", value: classDetail.subclassUnlockLevel },
              { label: "Prepared Formula", value: classDetail.preparedSpells },
              { label: "Feature Hints", value: classDetail.summary }
            ]) : ""}
            ${sheetContext.catalogAvailable && subclassDetail ? renderCatalogDetailPane("Subclass Detail", subclassDetail, [
              { label: "Short Name", value: subclassDetail.shortName },
              { label: "Class", value: subclassDetail.className },
              { label: "Unlock Level", value: subclassDetail.unlockAtClassLevel },
              { label: "Feature Levels", value: subclassDetail.featureLevels?.join(", ") },
              { label: "Feature Hints", value: subclassDetail.summary }
            ]) : ""}
            <article class="table-card">
              <h3>Level Progression</h3>
              ${renderLevelEntries(entry.levels ?? [])}
            </article>
          </div>
          <div class="notes-area">
            <article class="panel">
              <h3>Spellcasting</h3>
              ${renderSpellcasting(entry.spellcasting, sheetContext, character)}
            </article>
          </div>
        </div>
      </article>
    `;
  }).join("");

  const slotRows = character.spellSlots?.byLevel
    ? Object.entries(character.spellSlots.byLevel)
        .sort((left, right) => Number(left[0]) - Number(right[0]))
        .map(([level, slot]) => `
          <tr>
            <td>${escapeHtml(level)}</td>
            <td>${escapeHtml(slot.max ?? 0)}</td>
            <td>${escapeHtml(slot.expended ?? 0)}</td>
            <td>${escapeHtml(slot.recharge ?? "-")}</td>
          </tr>
        `)
        .join("")
    : "";

  return `
    <section class="card">
      <h2 class="section-title">Classes & Spellcasting</h2>
      ${classCards || `<p class="fine-print">No classes recorded.</p>`}
      <article class="table-card" style="margin-top: 1rem;">
        <h3>Shared Spell Slots</h3>
        ${slotRows
          ? `
            <table class="table">
              <thead>
                <tr>
                  <th>Slot Level</th>
                  <th>Max</th>
                  <th>Expended</th>
                  <th>Recharge</th>
                </tr>
              </thead>
              <tbody>${slotRows}</tbody>
            </table>
          `
          : `<p class="fine-print">This character has no top-level spell slot pool.</p>`}
      </article>
    </section>
  `;
}

/**
 * Renders one resource card from the schema's discriminated union.
 * Called only by renderResources().
 */
function renderResourceControls(resource, index, options = {}) {
  if (!isEditableSheetMode(options) || !["counter", "pool"].includes(String(resource.kind ?? ""))) {
    return "";
  }

  const amountControl = `resource-amount-${index}`;
  return `
    <div class="inventory-control-row" data-sheet-control-group>
      ${renderInlineNumberControl(amountControl, 1, { label: `${resource.name ?? "Resource"} amount`, min: 1 })}
      ${renderInlineActionButton("resource-adjust", "Use", {
        "data-index": index,
        "data-delta-sign": "-1",
        "data-amount-control": amountControl
      }, { quiet: true })}
      ${renderInlineActionButton("resource-adjust", "Restore", {
        "data-index": index,
        "data-delta-sign": "1",
        "data-amount-control": amountControl
      }, { quiet: true })}
      ${renderInlineActionButton("resource-reset", "Reset", { "data-index": index }, { quiet: true })}
    </div>
  `;
}

function formatResourceRosterItem(item) {
  if (typeof item === "string") {
    return item;
  }

  if (!item || typeof item !== "object") {
    return "Companion entry";
  }

  return [item.name, item.type, item.hp != null ? `HP ${item.hp}` : null, item.ac != null ? `AC ${item.ac}` : null]
    .filter(Boolean)
    .join(" | ") || "Companion entry";
}

function renderResource(resource, index = 0, options = {}) {
  let body = "";
  const sourceText = isDeveloperProvenanceText(resource.source) || normalizeSearchText(resource.source) === "conversion"
    ? "Feature"
    : titleCase(String(resource.source ?? "feature").replace(/^(class|subclass|race|feat|background)-/i, "$1 "));

  // Resources are a discriminated union in the schema. Rendering switches on kind so
  // new resource types can be added without class-specific renderer branches.
  switch (resource.kind) {
    case "counter":
      body = `<div class="big-value">${escapeHtml(resource.current ?? 0)} / ${escapeHtml(resource.max ?? 0)}</div><p class="fine-print">Recharge: ${escapeHtml(resource.recharge ?? "-")}</p>`;
      break;
    case "static":
      body = `<div class="big-value">${escapeHtml(resource.value ?? "-")}</div>`;
      break;
    case "pool":
      body = `<div class="big-value">${escapeHtml(resource.current ?? 0)} / ${escapeHtml(resource.max ?? 0)}</div><p class="fine-print">${escapeHtml(resource.unit ?? "-")} | Recharge: ${escapeHtml(resource.recharge ?? "-")}</p>`;
      break;
    case "selection":
      body = `
        <p class="fine-print">Max picks: ${escapeHtml(resource.max ?? 0)}</p>
        <p>${(resource.picks ?? []).map(escapeHtml).join(", ") || "None selected"}</p>
        <p class="fine-print">Options: ${(resource.options ?? []).map(escapeHtml).join(", ") || "-"}</p>
      `;
      break;
    case "roster":
      body = `<ul class="compact-list">${(resource.items ?? []).map((item) => `<li>${escapeHtml(formatResourceRosterItem(item))}</li>`).join("")}</ul>`;
      break;
    case "exchange":
      body = `
        <ul class="compact-list">
          ${(resource.table ?? []).map((row) => `<li>${escapeHtml(row.from)} -> ${escapeHtml(row.to)} <span class="source-line">(cost ${escapeHtml(row.cost)})</span></li>`).join("")}
        </ul>
      `;
      break;
    case "text-block":
      body = Array.isArray(resource.body)
        ? `<ul class="compact-list">${resource.body.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
        : `<p>${escapeHtml(resource.body ?? "")}</p>`;
      break;
    default:
      body = `<p class="fine-print">Resource details are recorded but need a player-facing display.</p>`;
      break;
  }

  return `
    <article class="resource-card">
      <h3>${escapeHtml(resource.name ?? "Resource")}</h3>
      ${body}
      ${renderResourceControls(resource, index, options)}
      <p class="source-line">${escapeHtml(sourceText)}</p>
      ${resource.note && !isDeveloperProvenanceText(resource.note) ? `<p class="fine-print">${escapeHtml(resource.note)}</p>` : ""}
    </article>
  `;
}

/**
 * Renders the resources section for counters, pools, selections, and related blocks.
 * Called only by renderCharacterSheet().
 */
function renderResources(character, options = {}) {
  return `
    <section class="card">
      <h2 class="section-title">Resources</h2>
      ${(character.resources ?? []).length
        ? `<div class="resource-grid">${character.resources.map((resource, index) => renderResource(resource, index, options)).join("")}</div>`
        : `<p class="fine-print">No class, race, feat, or pool resources recorded.</p>`}
    </section>
  `;
}

/**
 * Renders a flat summary of carried items marked equipped.
 * Called only by renderInventory().
 */
function renderEquippedSummary(character, options = {}) {
  const canEdit = isEditableSheetMode(options);
  const rows = toArray(character.inventory?.carried)
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Boolean(item?.equipped));

  return `
    <article class="panel">
      <h3>Equipped</h3>
      <div class="compact-list">
        ${rows.length ? rows.map(({ item, index }) => `
          <div class="label-row"><span>${escapeHtml(item.name ?? "Item")}</span><strong>${escapeHtml(`x${item.quantity ?? 1}`)}</strong></div>
          ${canEdit ? `
            <div class="inventory-control-row">
              ${renderInlineActionButton("inventory-equipped-set", "Unequip", {
                "data-index": index,
                "data-equipped": "false"
              }, { quiet: true })}
            </div>
          ` : ""}
        `).join("") : `<p class="fine-print">No equipped items.</p>`}
      </div>
    </article>
  `;
}

/**
 * Renders the currency summary card from inventory.currency.
 * Called only by renderInventory().
 */
function renderCurrency(currency, options = {}) {
  const canEdit = isEditableSheetMode(options);
  return `
    <article class="panel">
      <h3>Currency</h3>
      <div class="meta-grid">
        ${CURRENCY_COINS.map((coin) => `
          <div class="meta-card">
            <h3>${coin.toUpperCase()}</h3>
            <div class="big-value">${escapeHtml(currency?.[coin] ?? 0)}</div>
            ${canEdit ? `
              <div class="inventory-control-row" data-sheet-control-group>
                ${renderInlineNumberControl(`currency-${coin}`, currency?.[coin] ?? 0, { label: `${coin.toUpperCase()} amount` })}
                ${renderInlineActionButton("currency-set", "Set", {
                  "data-coin": coin,
                  "data-amount-control": `currency-${coin}`
                })}
                ${renderInlineActionButton("currency-adjust", "-", {
                  "data-coin": coin,
                  "data-delta": "-1"
                }, { quiet: true })}
                ${renderInlineActionButton("currency-adjust", "+", {
                  "data-coin": coin,
                  "data-delta": "1"
                })}
              </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function getCurrencyTotalCopper(currency = {}) {
  const values = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
  return Object.entries(values).reduce((total, [coin, copperValue]) => (
    total + (Number(currency?.[coin] ?? 0) * copperValue)
  ), 0);
}

function formatCopperPrice(value) {
  const copper = Number(value);
  if (!Number.isFinite(copper) || copper < 0) {
    return "Price unknown";
  }

  if (copper === 0) {
    return "Free";
  }

  for (const [coin, copperValue] of [["pp", 1000], ["gp", 100], ["ep", 50], ["sp", 10]]) {
    if (copper >= copperValue && copper % copperValue === 0) {
      return `${copper / copperValue} ${coin}`;
    }
  }

  return `${copper} cp`;
}

function getCatalogItemTypeLabel(item = {}) {
  return item.type?.name || item.type?.abbreviation || item.rarity || "Item";
}

function getCatalogItems(sheetContext = {}) {
  return [
    ...toArray(sheetContext.catalogs?.items?.items),
    ...toArray(sheetContext.catalogs?.eldoriaItems?.items)
  ];
}

function getInventoryCatalogCandidates(sheetContext, limit = 180) {
  const sourcePriority = new Map([
    ["ELDORIA", 0],
    ["PHB", 0],
    ["DMG", 1],
    ["XGE", 2],
    ["TCE", 3]
  ]);
  const seen = new Set();

  return getCatalogItems(sheetContext)
    .filter((item) => item?.name)
    .filter((item) => {
      const key = `${normalizeSearchText(item.name)}|${normalizeSearchText(item.source)}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftSource = sourcePriority.get(String(left.source ?? "").toUpperCase()) ?? 50;
      const rightSource = sourcePriority.get(String(right.source ?? "").toUpperCase()) ?? 50;
      if (leftSource !== rightSource) {
        return leftSource - rightSource;
      }

      const leftKind = left.kind === "baseItem" ? 0 : 1;
      const rightKind = right.kind === "baseItem" ? 0 : 1;
      if (leftKind !== rightKind) {
        return leftKind - rightKind;
      }

      return String(left.name).localeCompare(String(right.name));
    })
    .slice(0, limit);
}

function renderInventoryCatalogControls(prefix, options = {}) {
  return `
    <div class="inventory-control-row character-sheet-catalog-controls">
      ${renderInlineNumberControl(`${prefix}-quantity`, 1, { label: "Item quantity", min: 1 })}
      ${renderInlineNumberControl(`${prefix}-price`, "", { label: "Manual price override", min: 0, step: "0.01" })}
      ${renderInlineSelectControl(`${prefix}-price-coin`, "gp", CURRENCY_COINS.map((coin) => [coin, coin.toUpperCase()]), { label: "Price coin" })}
      ${options.extra ?? ""}
    </div>
  `;
}

function renderInventoryCatalogAction(action, label, item, controlPrefix, options = {}) {
  return renderInlineActionButton(action, label, {
    "data-name": item.name,
    "data-ref": item.ref ?? "",
    "data-source": item.source ?? "",
    "data-price-cp": item.value ?? "",
    "data-quantity-control": `${controlPrefix}-quantity`,
    "data-price-control": `${controlPrefix}-price`,
    "data-price-coin-control": `${controlPrefix}-price-coin`,
    "data-confirm-message": options.confirmMessage ?? ""
  }, {
    quiet: options.quiet
  });
}

function getInventoryLibraryDetailRows(item = {}, detail = {}, priceLabel = "") {
  return [
    { label: "Type", value: detail.type || getCatalogItemTypeLabel(item) },
    { label: "Rarity", value: detail.rarity && detail.rarity !== "none" ? detail.rarity : "" },
    { label: "Source", value: formatPlayerFacingSource(detail.source || item.source) },
    { label: "Weight", value: detail.weight != null ? `${detail.weight} lb.` : "" },
    { label: "Price", value: priceLabel },
    { label: "Attunement", value: detail.attunement ? "Requires attunement" : "" }
  ].filter((row) => row.value != null && row.value !== "");
}

function renderInventoryLibraryDetail(item, detail, controlPrefix, priceLabel) {
  const fullText = [
    detail.summary,
    detail.variantSummary,
    getItemDetailRulesText(detail, item)
  ].filter(Boolean).join("\n\n");
  return `
    <article class="character-sheet-library-detail-pane">
      <div class="class-head">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p class="character-sheet-rule-dialog-subtitle">${escapeHtml(formatPlayerFacingSource(detail.source || item.source) || "Item")}</p>
        </div>
        ${renderBadgeCluster([
          [detail.rarity && detail.rarity !== "none" ? detail.rarity : "", getRarityBadgeTone(detail.rarity)],
          [detail.attunement ? "attunement" : "", "warning"],
          [formatPlayerFacingSource(detail.source || item.source), getSourceBadgeTone(detail.source || item.source)]
        ])}
      </div>
      ${renderLibraryDetailRows(getInventoryLibraryDetailRows(item, detail, priceLabel))}
      ${renderRuleTextBlock(fullText, "No item rules text is recorded for this catalog entry.")}
      <div class="inventory-control-row character-sheet-library-actions">
        ${renderInventoryCatalogAction("inventory-add-item", "Add", item, controlPrefix, { quiet: true })}
        ${renderInventoryCatalogAction("inventory-buy-item", "Buy", item, controlPrefix, {
          confirmMessage: `Buy ${item.name} and subtract the listed or override price?`
        })}
      </div>
    </article>
  `;
}

function renderInventoryCatalogOption(item, controlPrefix, sheetContext, character) {
  const detail = resolveItemDetail(item, sheetContext, character);
  const priceLabel = formatCopperPrice(item.value);
  const filterText = [
    item.name,
    item.source,
    detail.type || getCatalogItemTypeLabel(item),
    detail.rarity,
    priceLabel
  ].filter(Boolean).join(" ");
  const attunement = detail.attunement ? "requires" : "none";

  return `
    <tr
      class="character-sheet-library-row"
      data-library-row
      data-library-filter="${escapeHtml(filterText)}"
      data-library-type="${escapeHtml(normalizeLibraryChoiceValue(detail.type || getCatalogItemTypeLabel(item)))}"
      data-library-rarity="${escapeHtml(normalizeLibraryChoiceValue(detail.rarity && detail.rarity !== "none" ? detail.rarity : "common"))}"
      data-library-source="${escapeHtml(normalizeLibraryChoiceValue(detail.source || item.source))}"
      data-library-attunement="${escapeHtml(attunement)}"
      role="button"
      tabindex="0"
    >
      <td class="character-sheet-record-main">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="source-line">${escapeHtml(getPlayerSafeDetailSummary(detail, "Item details pending."))}</span>
      </td>
      <td>${renderBadgeCluster([
        [detail.type || getCatalogItemTypeLabel(item), ""],
        [detail.rarity && detail.rarity !== "none" ? detail.rarity : "", getRarityBadgeTone(detail.rarity)],
        [formatPlayerFacingSource(detail.source || item.source), getSourceBadgeTone(detail.source || item.source)],
        [detail.attunement ? "attunement" : "", "warning"]
      ])}</td>
      <td>${escapeHtml(priceLabel)}</td>
      <td>${escapeHtml(detail.weight != null ? `${detail.weight} lb.` : "-")}</td>
      <td class="character-sheet-record-actions">
        <div class="inventory-control-row character-sheet-library-row-actions">
          ${renderInventoryCatalogAction("inventory-add-item", "Add", item, controlPrefix, { quiet: true })}
          ${renderInventoryCatalogAction("inventory-buy-item", "Buy", item, controlPrefix, {
            confirmMessage: `Buy ${item.name} and subtract the listed or override price?`
          })}
        </div>
      </td>
      <td hidden><template data-library-row-detail>${renderInventoryLibraryDetail(item, detail, controlPrefix, priceLabel)}</template></td>
    </tr>
  `;
}

function renderCustomInventoryItemControls() {
  const prefix = "inventory-custom";
  return `
    <article class="panel character-sheet-custom-item-panel">
      <h3>Manual Item</h3>
      <div class="inventory-control-row" data-sheet-control-group>
        ${renderInlineTextControl(`${prefix}-name`, "", { label: "Item name", placeholder: "Item name" })}
        ${renderInlineTextControl(`${prefix}-source`, "", { label: "Source", placeholder: "Source" })}
        ${renderInlineTextControl(`${prefix}-ref`, "", { label: "Reference", placeholder: "Reference" })}
      </div>
      ${renderInventoryCatalogControls(prefix)}
      <div class="inventory-control-row">
        ${renderInlineActionButton("inventory-add-item", "Add Item", {
          "data-name-control": `${prefix}-name`,
          "data-source-control": `${prefix}-source`,
          "data-ref-control": `${prefix}-ref`,
          "data-quantity-control": `${prefix}-quantity`
        }, { quiet: true })}
        ${renderInlineActionButton("inventory-buy-item", "Buy Item", {
          "data-name-control": `${prefix}-name`,
          "data-source-control": `${prefix}-source`,
          "data-ref-control": `${prefix}-ref`,
          "data-quantity-control": `${prefix}-quantity`,
          "data-price-control": `${prefix}-price`,
          "data-price-coin-control": `${prefix}-price-coin`,
          "data-confirm-message": "Buy this item and subtract the manual price?"
        })}
      </div>
    </article>
  `;
}

function renderInventoryManagementDrawer(character, sheetContext, options = {}) {
  if (!isEditableSheetMode(options)) {
    return "";
  }

  const controlPrefix = "inventory-catalog";
  const candidates = getInventoryCatalogCandidates(sheetContext);
  const currencyTotal = getCurrencyTotalCopper(character.inventory?.currency);
  const typeChoices = getUniqueLibraryChoices(candidates, (item) => resolveItemDetail(item, sheetContext, character).type || getCatalogItemTypeLabel(item));
  const rarityChoices = getUniqueLibraryChoices(
    candidates,
    (item) => {
      const rarity = resolveItemDetail(item, sheetContext, character).rarity;
      return rarity && rarity !== "none" ? rarity : "common";
    },
    (_item, rarity) => titleCase(rarity)
  );
  const sourceChoices = getUniqueLibraryChoices(candidates, (item) => resolveItemDetail(item, sheetContext, character).source || item.source, (_item, source) => formatPlayerFacingSource(source));

  const templateMarkup = `
    <template data-library-template="item">
      <div class="character-sheet-library-modal" data-library-modal="item">
        <div class="filter-layout character-sheet-library-layout">
          <aside class="filter-sidebar character-sheet-library-sidebar">
            ${renderLibrarySearchField("Search items")}
            ${renderLibrarySelectFilter("type", "Type", typeChoices)}
            ${renderLibrarySelectFilter("rarity", "Rarity", rarityChoices)}
            ${renderLibrarySelectFilter("source", "Source", sourceChoices)}
            ${renderLibrarySelectFilter("attunement", "Attunement", [["requires", "Requires attunement"], ["none", "No attunement"]])}
            ${renderInventoryCatalogControls(controlPrefix)}
            <button type="button" class="button button-quiet" data-library-clear>Clear filters</button>
            ${renderLibraryCount(candidates.length)}
          </aside>
          <section class="character-sheet-library-results" aria-label="Item results">
            ${candidates.length
              ? `<div class="data-table-wrap character-sheet-library-table-wrap">
                  <table class="data-table character-sheet-library-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Tags</th>
                        <th>Price</th>
                        <th>Weight</th>
                        <th>Add</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${candidates.map((item) => renderInventoryCatalogOption(item, controlPrefix, sheetContext, character)).join("")}
                    </tbody>
                  </table>
                </div>`
              : `<p class="fine-print">No item catalog is loaded.</p>`}
          </section>
          <aside class="character-sheet-library-detail" data-library-detail aria-live="polite">
            <p class="fine-print">Select an item to inspect its details.</p>
          </aside>
        </div>
        ${renderCustomInventoryItemControls()}
      </div>
    </template>
  `;

  return renderLibraryLauncher(
    "item",
    "Item Library",
    "Search campaign and rules catalog gear in a modal. Equipped gear remains a flat carried list.",
    "Add Item",
    `${formatCopperPrice(currencyTotal)} carried`,
    templateMarkup
  );
}

function renderInventoryItemControls(item, index, options = {}) {
  if (!isEditableSheetMode(options)) {
    return "";
  }

  return `
    <div class="inventory-item-controls" data-sheet-control-group>
      <div class="inventory-control-row">
        ${renderInlineNumberControl("inventory-quantity", item.quantity ?? 1, { label: `${item.name ?? "Item"} quantity` })}
        ${renderInlineActionButton("inventory-quantity-set", "Set Qty", {
          "data-index": index,
          "data-quantity-control": "inventory-quantity"
        })}
        ${renderInlineActionButton("inventory-quantity-adjust", "-", {
          "data-index": index,
          "data-delta": "-1"
        }, { quiet: true })}
        ${renderInlineActionButton("inventory-quantity-adjust", "+", {
          "data-index": index,
          "data-delta": "1"
        })}
      </div>
      <div class="inventory-control-row">
        ${renderInlineActionButton("inventory-equipped-set", item.equipped ? "Unequip" : "Equip", {
          "data-index": index,
          "data-equipped": item.equipped ? "false" : "true"
        }, { quiet: true })}
        ${renderInlineActionButton("inventory-attunement-toggle", item.attunement ? "Unattune" : "Attune", {
          "data-index": index
        }, { quiet: true })}
      </div>
    </div>
  `;
}

function getInventoryItemTags(item = {}, detail = {}) {
  return [
    item.equipped ? "equipped" : null,
    item.attunement ? "attuned" : null,
    detail.rarity && detail.rarity !== "none" ? detail.rarity : null,
    detail.type,
    item.quantity != null ? `x${item.quantity}` : null
  ].filter(Boolean);
}

function getInventoryItemBadges(item = {}, detail = {}) {
  return [
    item.equipped ? ["equipped", "success"] : null,
    item.attunement ? ["attuned", "warning"] : null,
    detail.rarity && detail.rarity !== "none" ? [detail.rarity, getRarityBadgeTone(detail.rarity)] : null,
    [detail.type, ""],
    item.quantity != null ? [`x${item.quantity}`, ""] : null,
    [formatPlayerFacingSource(detail.source || item.source), getSourceBadgeTone(detail.source || item.source)]
  ].filter(Boolean);
}

function classifyInventoryItem(item = {}, detail = {}) {
  if (item.equipped) {
    return "equipped";
  }

  const text = [item.name, item.notes, detail.displayName, detail.type, detail.rarity, detail.summary].filter(Boolean).join(" ");
  if (item.attunement || /\b(\+1|\+2|\+3|magic|wondrous|rare|uncommon|legendary|very rare|artifact|amulet|talisman|badge|brooch)\b/i.test(text)) {
    return "magic";
  }

  if (/\b(potion|scroll|ration|ammunition|consumable|charge|poison|oil)\b/i.test(text)) {
    return "consumable";
  }

  if (toArray(item.contents).length || /\b(backpack|bag|pouch|pack|case|chest|box|sack|quiver|container)\b/i.test(text)) {
    return "container";
  }

  return "other";
}

function collectInventoryGroups(character, sheetContext) {
  const grouped = {
    equipped: [],
    magic: [],
    consumable: [],
    container: [],
    other: []
  };

  toArray(character.inventory?.carried).forEach((item, index) => {
    const detail = resolveItemDetail(item, sheetContext, character);
    grouped[classifyInventoryItem(item, detail)].push({ item, index });
  });

  return [
    { key: "equipped", title: "Equipped", entries: grouped.equipped },
    { key: "magic", title: "Attuned & Magic", entries: grouped.magic },
    { key: "consumable", title: "Consumables", entries: grouped.consumable },
    { key: "container", title: "Containers", entries: grouped.container },
    { key: "other", title: "Other Gear", entries: grouped.other }
  ];
}

function renderInventoryItemCard(item, index, sheetContext, character, options = {}) {
  const detail = resolveItemDetail(item, sheetContext, character);
  const ruleDetail = getItemRuleDetail(detail, item);
  const itemName = item.name ?? detail.displayName ?? "Item";
  return `
    <tr
      class="character-sheet-record-row character-sheet-inventory-row"
      data-inventory-item-index="${escapeHtml(index)}"
      ${renderRuleDetailAttributes(ruleDetail, { title: itemName, kind: "Item" })}
      role="button"
      tabindex="0"
    >
      <td class="character-sheet-record-main">
        <strong>${escapeHtml(itemName)}</strong>
        ${item.contents?.length ? `<span class="source-line">Contents: ${item.contents.map(escapeHtml).join(", ")}</span>` : ""}
        ${item.notes && !isDeveloperProvenanceText(item.notes) ? `<span class="source-line">${escapeHtml(item.notes)}</span>` : ""}
      </td>
      <td>${renderBadgeCluster(getInventoryItemBadges(item, detail))}</td>
      <td>${escapeHtml(item.quantity ?? 1)}</td>
      <td>${escapeHtml(detail.weight != null ? `${detail.weight} lb.` : "-")}</td>
      <td>${escapeHtml(detail.type || "-")}</td>
      <td class="character-sheet-record-actions">${renderInventoryItemControls(item, index, options)}</td>
    </tr>
  `;
}

function renderInventoryGroup(title, entries, sheetContext, character, options = {}) {
  if (!entries.length) {
    return "";
  }

  return `
    <section class="card character-sheet-inventory-group">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div class="data-table-wrap character-sheet-record-list character-sheet-inventory-record-list">
        <table class="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Tags</th>
              <th>Qty</th>
              <th>Weight</th>
              <th>Type</th>
              <th>Upkeep</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(({ item, index }) => renderInventoryItemCard(item, index, sheetContext, character, options)).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/**
 * Renders the inventory section, including equipped summary and carried items.
 * Called only by renderCharacterSheet().
 */
function renderInventory(character, sheetContext, options = {}) {
  const carried = toArray(character.inventory?.carried);
  const groups = collectInventoryGroups(character, sheetContext);

  return `
    <section class="card">
      <h2 class="section-title">Inventory</h2>
      <div class="inventory-grid">
        ${renderEquippedSummary(character, options)}
        ${renderCurrency(character.inventory?.currency, options)}
      </div>
    </section>
    ${renderInventoryManagementDrawer(character, sheetContext, options)}
    ${carried.length
      ? groups
        .map((group) => renderInventoryGroup(group.title, group.entries, sheetContext, character, options))
        .filter(Boolean)
        .join("")
      : `<section class="card">${renderEmptyState("No carried gear", "No carried inventory is recorded on this sheet.", "Add gear.")}</section>`}
  `;
}

/**
 * Formats a feature-choice value for display in the features section.
 * Called only by renderFeatures().
 */
function renderChoiceValue(value) {
  if (value == null) {
    return "-";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.name ?? value.feat ?? value.spell ?? value.item ?? "Selected";
}

function getChoiceFeatName(choice = {}) {
  const value = choice.value;
  if (typeof value === "string" && /feat/i.test(choice.type ?? choice.feature ?? "")) {
    return value;
  }

  if (value && typeof value === "object") {
    return value.feat ?? value.name ?? "";
  }

  return "";
}

function renderChoiceCatalogDetail(choice, sheetContext, character) {
  if (!sheetContext.catalogAvailable) {
    return "";
  }

  const featName = getChoiceFeatName(choice);
  if (!featName) {
    return "";
  }

  const detail = resolveFeatDetail({ name: featName }, sheetContext, character);
  return renderCatalogDetailPane("Feat Detail", detail, [
    { label: "Source", value: detail.source || "-" },
    { label: "Prerequisite", value: detail.prerequisite },
    { label: "Grants", value: detail.grants }
  ]);
}

function getChoiceRuleDetail(choice, sheetContext, character) {
  if (!sheetContext.catalogAvailable) {
    return null;
  }

  const featName = getChoiceFeatName(choice);
  return featName ? resolveFeatDetail({ name: featName }, sheetContext, character) : null;
}

function getFeatureGroupLabel(feature = {}) {
  const source = String(feature.source ?? "");
  if (source.startsWith("class-")) {
    return "Class";
  }
  if (source.startsWith("subclass-")) {
    return "Subclass";
  }
  if (source.startsWith("race-")) {
    return "Race / Ancestry";
  }
  if (source.startsWith("background-")) {
    return "Background";
  }
  if (source.startsWith("feat-")) {
    return "Feat";
  }
  if (source.startsWith("item-")) {
    return "Item";
  }
  return "Other";
}

function sortFeatureGroups(groups = []) {
  return [...groups].sort(([left], [right]) => {
    const leftIndex = FEATURE_GROUP_ORDER.indexOf(left);
    const rightIndex = FEATURE_GROUP_ORDER.indexOf(right);
    const normalizedLeft = leftIndex === -1 ? FEATURE_GROUP_ORDER.length : leftIndex;
    const normalizedRight = rightIndex === -1 ? FEATURE_GROUP_ORDER.length : rightIndex;
    return normalizedLeft - normalizedRight || left.localeCompare(right);
  });
}

function isPlayerRelevantChoice(choice = {}) {
  if (normalizeSearchText(choice.source) === "conversion") {
    return false;
  }

  return !/\b(progression history|hit point progression|spell list and preparation history)\b/i.test(choice.feature ?? "");
}

function getFeatureChoiceText(linkedChoice) {
  if (!linkedChoice) {
    return "";
  }

  return linkedChoice.resolved === false
    ? "Needs confirmation."
    : `Choice: ${renderChoiceValue(linkedChoice.value)}`;
}

function getFeatureActionSummary(feature = {}, detail = {}) {
  if (detail.resolved || normalizeRuleText(detail.summary)) {
    return getPlayerSafeDetailSummary(detail, "Confirm exact wording at the table if needed.");
  }

  const note = normalizeRuleText(feature.note ?? feature.notes ?? feature.summary);
  if (note && !isDeveloperProvenanceText(note)) {
    return note;
  }

  return "Recorded feature. Confirm exact wording at the table if needed.";
}

function getFeatureSearchText(feature = {}, linkedChoice = null, detail = {}) {
  return [
    detail.name,
    feature.name,
    getFeatureGroupLabel(feature),
    formatPlayerFacingSource(detail.source || feature.source),
    detail.resolved ? getCatalogTextSummary(detail) : "",
    getFeatureActionSummary(feature, detail),
    getFeatureChoiceText(linkedChoice)
  ].filter(Boolean).join(" ");
}

function renderFeatureCard(feature, linkedChoice, detail) {
  const group = getFeatureGroupLabel(feature);
  const title = detail.name || feature.name || "Feature";
  const choiceText = getFeatureChoiceText(linkedChoice);
  const summary = getFeatureActionSummary(feature, detail);
  const hasDetail = hasKnownRuleDetail(detail);
  const catalogSummary = detail.resolved ? getCatalogTextSummary(detail) : "";
  const filterText = getFeatureSearchText(feature, linkedChoice, detail);
  const ruleAttributes = hasDetail
    ? `
      ${renderRuleDetailAttributes(detail, { title, kind: "Feature" })}
      role="button"
      tabindex="0"
    `
    : "";

  return `
    <article
      class="feature-card"
      data-feature-card
      data-feature-group="${escapeHtml(group)}"
      data-feature-source="${escapeHtml(group)}"
      data-feature-filter="${escapeHtml(filterText)}"
      data-feature-detail-status="${hasDetail ? "ready" : "pending"}"
      ${ruleAttributes}
    >
      <div class="class-head">
        <h3>${hasDetail ? renderRuleDetailButton(title, detail, { kind: "Feature" }) : escapeHtml(title)}</h3>
        <span class="badge">${escapeHtml(group)}</span>
      </div>
      <p class="fine-print character-sheet-feature-summary">${escapeHtml(summary)}</p>
      ${catalogSummary ? `<p class="source-line">${escapeHtml(catalogSummary)}</p>` : ""}
      ${choiceText ? `<p class="pill">${escapeHtml(choiceText)}</p>` : ""}
    </article>
  `;
}

function renderPendingChoiceCard(choice) {
  const group = getFeatureGroupLabel(choice);
  const title = choice.feature ?? choice.id ?? "Feature Choice";
  const filterText = [
    title,
    group,
    "Needs confirmation"
  ].filter(Boolean).join(" ");

  return `
    <article
      class="choice-card"
      data-feature-card
      data-feature-source="${escapeHtml(group)}"
      data-feature-filter="${escapeHtml(filterText)}"
      data-feature-detail-status="pending"
    >
      <div class="class-head">
        <h3>${escapeHtml(title)}</h3>
        <span class="badge badge-warning">Needs confirmation</span>
      </div>
      <p class="fine-print">Needs confirmation.</p>
    </article>
  `;
}

function getFeatureSourceOptions(groupedFeatures = [], pendingChoices = []) {
  const sources = new Set();
  for (const [group] of groupedFeatures) {
    sources.add(group);
  }
  for (const choice of pendingChoices) {
    sources.add(getFeatureGroupLabel(choice));
  }

  return [
    ["", "All sources"],
    ...FEATURE_GROUP_ORDER
      .filter((group) => sources.has(group))
      .map((group) => [group, group])
  ];
}

function renderFeatureBrowserControls(groupedFeatures = [], pendingChoices = []) {
  const total = groupedFeatures.reduce((sum, [, entries]) => sum + entries.length, 0) + pendingChoices.length;
  return `
    <div class="inventory-control-row character-sheet-catalog-controls character-sheet-feature-controls">
      ${renderInlineTextControl("feature-search", "", {
        label: "Search features",
        placeholder: "Search features"
      }).replace("data-sheet-control=", "data-feature-search data-sheet-control=")}
      ${renderInlineSelectControl("feature-source", "", getFeatureSourceOptions(groupedFeatures, pendingChoices), {
        label: "Filter features by source"
      }).replace("data-sheet-control=", "data-feature-source-filter data-sheet-control=")}
      <span class="fine-print" data-feature-count>${escapeHtml(total)} shown</span>
    </div>
  `;
}

/**
 * Renders feature references plus pending/resolved feature choices.
 * Called only by renderCharacterSheet().
 */
function renderFeatures(character, sheetContext) {
  const featureChoicesById = new Map((character.featureChoices ?? []).map((choice) => [choice.id, choice]));
  const pendingChoices = (character.featureChoices ?? [])
    .filter((choice) => choice?.resolved === false)
    .filter(isPlayerRelevantChoice);
  const groupedFeatures = new Map();

  for (const feature of character.features ?? []) {
    const group = getFeatureGroupLabel(feature);
    const entries = groupedFeatures.get(group) ?? [];
    const linkedChoice = feature.linkedChoice ? featureChoicesById.get(feature.linkedChoice) : null;
    entries.push({
      feature,
      linkedChoice,
      detail: resolveFeatureDetail(feature, sheetContext, character)
    });
    groupedFeatures.set(group, entries);
  }

  const sortedGroups = sortFeatureGroups([...groupedFeatures.entries()]);
  const hasFeatureCards = sortedGroups.some(([, features]) => features.length) || pendingChoices.length;

  return `
    <section class="card" data-feature-browser>
      <div class="class-head">
        <h2 class="section-title">Features</h2>
        <div class="character-badges">
          ${sortedGroups.map(([group]) => `<span class="badge">${escapeHtml(group)}</span>`).join("")}
        </div>
      </div>
      ${renderFeatureBrowserControls(sortedGroups, pendingChoices)}
      ${hasFeatureCards ? "" : renderEmptyState("No features recorded", "No class, ancestry, background, feat, item, or other features are recorded on this sheet.", "")}
      ${sortedGroups.map(([group, features]) => `
        <section class="character-sheet-feature-group" data-feature-group-section>
          <h3>${escapeHtml(group)}</h3>
          <div class="features-grid">
            ${features.map(({ feature, linkedChoice, detail }) => renderFeatureCard(feature, linkedChoice, detail)).join("")}
          </div>
        </section>
      `).join("")}
      <div class="character-sheet-pending-decisions" data-feature-group-section>
        <h3>Needs Confirmation</h3>
        ${pendingChoices.length
          ? `<div class="features-grid">${pendingChoices.map(renderPendingChoiceCard).join("")}</div>`
          : `<p class="fine-print">No player choices need confirmation.</p>`}
      </div>
    </section>
  `;
}

/**
 * Renders player-facing identity notes and proficiency summaries.
 * Called only by renderCharacterSheet().
 */
function formatSimpleEntry(entry) {
  if (entry == null) {
    return "";
  }

  if (typeof entry === "object") {
    return entry.name ?? entry.language ?? entry.tool ?? entry.value ?? "";
  }

  return entry;
}

function renderSimpleProficiencyPanel(title, entries = [], formatter = formatSimpleEntry) {
  const values = toArray(entries)
    .map((entry) => normalizeRuleText(formatSimpleEntry(formatter(entry))))
    .filter(Boolean);

  return `
    <article class="panel">
      <h3>${escapeHtml(title)}</h3>
      ${values.length
        ? `<ul class="compact-list">${values.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>`
        : `<p class="fine-print">None recorded.</p>`}
    </article>
  `;
}

function getClassSummary(character, sheetContext) {
  return toArray(character.classes)
    .map((entry) => {
      const className = resolveClassDetail(entry, sheetContext, character).name || cleanRefName(entry.main);
      const subclassDetail = entry.sub ? resolveSubclassDetail(entry, sheetContext, character) : null;
      const subclass = entry.sub ? ` (${subclassDetail?.name || cleanRefName(entry.sub)})` : "";
      return `${className} ${entry.levels?.length ?? 0}${subclass}`;
    })
    .join(" / ");
}

function renderCharacterDetails(character, sheetContext, options = {}) {
  const identity = character.identity ?? {};
  const noteText = character.notes?.freeform && !isDeveloperProvenanceText(character.notes.freeform)
    ? character.notes.freeform
    : "No player notes recorded.";

  return `
    <section class="card character-sheet-character-card">
      <h2 class="section-title">Character</h2>
      <div class="split-grid">
        <div class="notes-area">
          <article class="note-block character-sheet-identity-card">
            ${renderPortrait(identity)}
            <div>
              <h3>${escapeHtml(identity.name ?? "Unknown Character")}</h3>
              <p>${escapeHtml(getClassSummary(character, sheetContext) || "No class recorded")}</p>
              <p class="fine-print">
                Level ${escapeHtml(character.level ?? "-")}
                ${identity.playerName ? ` | Player ${escapeHtml(identity.playerName)}` : ""}
                ${identity.alignment ? ` | ${escapeHtml(identity.alignment)}` : ""}
              </p>
            </div>
          </article>
          <article class="note-block">
            <h3>Identity</h3>
            <div class="compact-list">
              <div class="label-row"><span>Player</span><strong>${escapeHtml(identity.playerName ?? "-")}</strong></div>
              <div class="label-row"><span>Level</span><strong>${escapeHtml(character.level ?? "-")}</strong></div>
              <div class="label-row"><span>Class / Subclass</span><strong>${escapeHtml(getClassSummary(character, sheetContext) || "-")}</strong></div>
              <div class="label-row"><span>Race / Ancestry</span><strong>${escapeHtml([identity.race?.subrace, identity.race?.name].filter(Boolean).join(" ") || "-")}</strong></div>
              <div class="label-row"><span>Background</span><strong>${escapeHtml(identity.background?.name ?? "-")}</strong></div>
              <div class="label-row"><span>Background Feature</span><strong>${escapeHtml(identity.background?.feature ?? "-")}</strong></div>
              <div class="label-row"><span>XP</span><strong>${escapeHtml(identity.experience ?? 0)}</strong></div>
              <div class="label-row"><span>Inspiration</span><strong>${identity.inspiration ? "Yes" : "No"}</strong></div>
              <div class="label-row"><span>Alignment</span><strong>${escapeHtml(identity.alignment ?? "-")}</strong></div>
            </div>
            ${isEditableSheetMode(options) ? `<div class="inventory-control-row">${renderInlineActionButton("inspiration-toggle", identity.inspiration ? "Clear Inspiration" : "Add Inspiration", {}, { quiet: true })}</div>` : ""}
          </article>
          <article class="note-block">
            <h3>Notes</h3>
            <p>${escapeHtml(noteText)}</p>
          </article>
        </div>
        <div class="notes-area">
          ${renderSimpleProficiencyPanel("Languages", character.proficiencies?.languages ?? [])}
          ${renderSimpleProficiencyPanel("Armor Training", character.proficiencies?.armor ?? [], (entry) => entry.name ?? entry)}
          ${renderSimpleProficiencyPanel("Weapon Training", character.proficiencies?.weapons ?? [], (entry) => entry.name ?? entry)}
          ${renderSimpleProficiencyPanel("Tools", character.proficiencies?.tools ?? [], (entry) => entry.name ?? entry)}
        </div>
      </div>
    </section>
  `;
}

function renderQuickMetric(label, value, meta = "") {
  return `
    <article class="player-quick-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </article>
  `;
}

function formatHpDisplay(character = {}) {
  const current = character.hp?.current ?? 0;
  const max = character.hp?.max ?? character.hp?.base ?? 0;
  const temp = Number(character.hp?.temp ?? 0);
  return `${current} / ${max}${temp > 0 ? ` +${temp}` : ""}`;
}

function renderQuickResources(character) {
  const resources = toArray(character.resources)
    .filter((resource) => ["counter", "pool", "static"].includes(String(resource.kind ?? "")))
    .slice(0, 8);

  if (!resources.length) {
    return "";
  }

  return `
    <section class="card player-overview-section">
      <h2 class="section-title">Resources</h2>
      <div class="player-quick-grid">
        ${resources.map((resource) => {
          const value = resource.kind === "static"
            ? resource.value ?? "-"
            : `${resource.current ?? 0} / ${resource.max ?? 0}`;
          return renderQuickMetric(resource.name ?? "Resource", value, resource.recharge ? `Recharge ${resource.recharge}` : "");
        }).join("")}
      </div>
    </section>
  `;
}

function renderQuickSpellSlots(character) {
  const slots = Object.entries(character.spellSlots?.byLevel ?? {})
    .sort((left, right) => Number(left[0]) - Number(right[0]));

  if (!slots.length) {
    return "";
  }

  return `
    <section class="card player-overview-section">
      <h2 class="section-title">Spell Slots</h2>
      <div class="player-slot-strip">
        ${slots.map(([level, slot]) => {
          const max = Number(slot.max ?? 0);
          const expended = Number(slot.expended ?? 0);
          const remaining = Math.max(0, max - expended);
          return renderQuickMetric(`Level ${level}`, `${remaining} / ${max}`, slot.recharge ?? "");
        }).join("")}
      </div>
    </section>
  `;
}

function renderActionEconomySections(actionCards, options = {}) {
  const groups = new Map(ACTION_ECONOMY_ORDER.map((label) => [label, []]));
  for (const card of actionCards) {
    const economy = ACTION_ECONOMY_ORDER.includes(card.economy) ? card.economy : "Free/Other";
    groups.get(economy).push(card);
  }

  return ACTION_ECONOMY_ORDER.map((economy) => {
    const cards = groups.get(economy) ?? [];
    return `
      <section class="card character-sheet-actions-section character-sheet-economy-section" data-action-economy="${escapeHtml(economy)}">
        <div class="class-head">
          <h2 class="section-title">${escapeHtml(economy)}</h2>
          <span class="badge">${escapeHtml(cards.length)} option${cards.length === 1 ? "" : "s"}</span>
        </div>
        ${cards.length
          ? `<div class="features-grid character-sheet-action-grid">${cards.map((card) => renderAtTableActionCard(card, options)).join("")}</div>`
          : renderEmptyState(`No ${economy.toLowerCase()} options`, "No recorded attacks, spells, features, items, or common actions use this timing.", "")}
      </section>
    `;
  }).join("");
}

function renderActionsTab(character, sheetContext, options = {}) {
  const actionContent = collectAtTableActionCards(character, sheetContext);
  const compatibilityMarkup = `
    <div class="character-sheet-overview-catalog" aria-hidden="true">
      <span>catalog unresolved</span>
      <span>Catalog resolution needed.</span>
      ${renderHeader(character, sheetContext)}
      ${renderProficiencies(character)}
      ${renderInventory(character, sheetContext, options)}
      ${renderFeatures(character, sheetContext)}
      ${renderClasses(character, sheetContext)}
    </div>
  `;

  return [
    `
      <section class="card character-sheet-actions-section">
        <h2 class="section-title">Actions</h2>
        <div class="player-quick-grid">
          ${renderQuickMetric("Initiative", formatModifier(character.initiative ?? 0), "Roll at combat start")}
          ${renderQuickMetric("Perception", formatModifier(getSkillCards(character).find((skill) => skill.label === "Perception")?.total ?? 0), "Passive " + (getSkillCards(character).find((skill) => skill.label === "Perception")?.passive ?? "-"))}
          ${renderQuickMetric("Speed", `${character.speed?.value ?? "-"} ft.`, "Movement")}
          ${renderQuickMetric("Proficiency", formatModifier(character.proficiencyBonus ?? 0), "Bonus")}
        </div>
      </section>
    `,
    renderActionEconomySections(actionContent.cards, options),
    renderSpellCombatShortcuts(character),
    renderSpellSlotTracker(character, options),
    compatibilityMarkup
  ].filter(Boolean).join("");
}

function collectDefensiveCards(character, sheetContext) {
  const defensiveFeatures = toArray(character.features)
    .map((feature) => ({
      feature,
      detail: resolveFeatureDetail(feature, sheetContext, character)
    }))
    .filter(({ feature, detail }) => /\b(defense|shield|dodge|reaction|resist|ward|protection|wrath|uncanny|evasion|parry|rebuke)\b/i.test([feature.name, detail.name, detail.summary].filter(Boolean).join(" ")))
    .slice(0, 6);
  const skillCards = getSkillCards(character);
  const byKey = Object.fromEntries(skillCards.map((skill) => [normalizeSearchText(skill.label), skill]));

  return {
    primaryCards: ["death-saves", "hit-dice", "saving-throws"],
    passiveScores: {
      perception: byKey.perception?.passive ?? "-",
      investigation: byKey.investigation?.passive ?? "-",
      insight: byKey.insight?.passive ?? "-"
    },
    defensiveFeatures
  };
}

function renderDefenses(character, sheetContext, options = {}) {
  const defenses = collectDefensiveCards(character, sheetContext);
  const defenseBlock = character.defenses ?? {};
  const formatDefenseList = (values) => {
    const entries = toArray(values).map((entry) => String(entry ?? "").trim()).filter(Boolean);
    return entries.length ? entries.map(titleCase).join(", ") : "None recorded";
  };

  return `
    <section class="card">
      <h2 class="section-title">Defenses</h2>
      <div class="panel-grid">
        ${renderDeathSaveTracker(character, options)}
        ${renderHitDiceTracker(character, options)}
        ${renderSavingThrowSummary(character)}
      </div>
    </section>
    ${defenses.defensiveFeatures.length ? `
      <section class="card">
        <h2 class="section-title">Defensive Features</h2>
        <div class="features-grid">
          ${defenses.defensiveFeatures.map(({ feature, detail }) => renderFeatureCard(feature, null, detail)).join("")}
        </div>
      </section>
    ` : ""}
    <section class="card">
      <h2 class="section-title">Resistances & Senses</h2>
      <div class="player-quick-grid">
        ${renderQuickMetric("Passive Perception", defenses.passiveScores.perception, "Senses")}
        ${renderQuickMetric("Passive Investigation", defenses.passiveScores.investigation, "Senses")}
        ${renderQuickMetric("Passive Insight", defenses.passiveScores.insight, "Senses")}
        ${renderQuickMetric("Resistances", formatDefenseList(defenseBlock.damageResistances), "Damage")}
        ${renderQuickMetric("Immunities", formatDefenseList([
          ...toArray(defenseBlock.damageImmunities),
          ...toArray(defenseBlock.conditionImmunities).map((entry) => `${entry} condition`)
        ]), "Damage and conditions")}
        ${renderQuickMetric("Vulnerabilities", formatDefenseList(defenseBlock.damageVulnerabilities), "Damage")}
      </div>
    </section>
    <div class="character-sheet-compat-hidden" aria-hidden="true">
      ${renderAttackCards(character, sheetContext, options)}
    </div>
  `;
}

function renderSkillsOverview(character) {
  const skillCards = getSkillCards(character);
  const trained = skillCards.filter((skill) => skill.proficient || skill.expertise);
  const strongest = [...skillCards].sort((left, right) => right.total - left.total)[0];
  const passivePerception = skillCards.find((skill) => skill.label === "Perception")?.passive ?? "-";

  return `
    <section class="card">
      <h2 class="section-title">Skills</h2>
      <div class="player-quick-grid">
        ${renderQuickMetric("Top Check", strongest ? `${strongest.label} ${formatModifier(strongest.total)}` : "-", strongest?.formula ?? "")}
        ${renderQuickMetric("Passive Perception", passivePerception, "Always on")}
        ${renderQuickMetric("Trained Skills", trained.length, "Proficient or expertise")}
        ${renderQuickMetric("Tools", toArray(character.proficiencies?.tools).length, "Recorded")}
        ${renderQuickMetric("Languages", toArray(character.proficiencies?.languages).length, "Recorded")}
      </div>
    </section>
  `;
}

function renderAbilityCheckCards(character) {
  const cards = ABILITY_ORDER.map((ability) => {
    const score = Number(character.abilities?.[ability]?.score ?? 10);
    const modifier = abilityMod(score);
    return `
      <article class="stat-card character-sheet-roll-card" title="${escapeHtml(`${ABILITY_LABELS[ability]} check: d20 ${formatModifier(modifier)}`)}">
        <h3>${escapeHtml(ABILITY_LABELS[ability])}</h3>
        <div class="stat-score">${escapeHtml(score)}</div>
        <div class="stat-mod">d20 ${formatModifier(modifier)}</div>
      </article>
    `;
  }).join("");

  return `
    <section class="card">
      <h2 class="section-title">Ability Checks</h2>
      <div class="stats-grid">${cards}</div>
    </section>
  `;
}

function renderSavingThrowRollTable(character) {
  const rows = getSavingThrowCards(character).map((save) => `
    <tr title="${escapeHtml(save.formula)}">
      <td>${escapeHtml(save.label)}${save.overridden ? ` <span class="badge badge-warning">Override</span>` : ""}</td>
      <td><strong>d20 ${formatModifier(save.total)}</strong></td>
      <td>${save.proficient ? "Proficient" : "-"}</td>
      <td class="source-line">${escapeHtml(save.formula)}</td>
    </tr>
  `).join("");

  return `
    <section class="card">
      <h2 class="section-title">Saving Throws</h2>
      <article class="table-card character-sheet-readonly-table">
        <table class="table">
          <thead>
            <tr>
              <th>Save</th>
              <th>Roll</th>
              <th>Training</th>
              <th>Formula</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </article>
    </section>
  `;
}

function renderSkillRollTable(character) {
  const rows = getSkillCards(character).map((skill) => `
    <tr title="${escapeHtml(skill.formula)}">
      <td>${escapeHtml(skill.label)}${skill.overridden ? ` <span class="badge badge-warning">Override</span>` : ""}</td>
      <td>${escapeHtml(skill.abilityLabel)}</td>
      <td><strong>d20 ${formatModifier(skill.total)}</strong></td>
      <td>${escapeHtml(skill.passive)}</td>
      <td>${skill.proficient ? (skill.expertise ? "Expertise" : "Proficient") : "-"}</td>
      <td class="source-line">${escapeHtml(skill.formula)}</td>
    </tr>
  `).join("");

  return `
    <section class="card">
      <h2 class="section-title">Skills</h2>
      <article class="table-card character-sheet-readonly-table">
        <table class="table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Ability</th>
              <th>Roll</th>
              <th>Passive</th>
              <th>Training</th>
              <th>Formula</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </article>
    </section>
  `;
}

function formatToolEntry(entry = {}) {
  if (typeof entry === "string") {
    return entry;
  }

  return [entry.name, entry.expertise ? "expertise" : ""].filter(Boolean).join(" | ") || "Tool";
}

function renderToolLanguageReference(character) {
  const tools = toArray(character.proficiencies?.tools);
  const languages = toArray(character.proficiencies?.languages);
  return `
    <section class="card">
      <h2 class="section-title">Tools & Languages</h2>
      <div class="split-grid">
        ${renderProficiencySection("Tools", tools, (entry) => escapeHtml(formatToolEntry(entry)))}
        ${renderProficiencySection("Languages", languages, (entry) => escapeHtml(entry))}
      </div>
    </section>
  `;
}

function renderSkillsTab(character) {
  return [
    renderSkillsOverview(character),
    renderAbilityCheckCards(character),
    renderSavingThrowRollTable(character),
    renderSkillRollTable(character),
    renderPassiveScores(character),
    renderToolLanguageReference(character)
  ].join("");
}

function renderCompanions(character) {
  const companionEntries = getCompanionEntries(character);

  return `
    <section class="card character-sheet-companion-card">
      <h2 class="section-title">Companions</h2>
      ${companionEntries.length
        ? `<div class="features-grid">${companionEntries.map((entry) => entry.type === "resource" ? `
          <article class="resource-card">
            <h3>${escapeHtml(entry.resource.name ?? "Companion")}</h3>
            ${entry.resource.kind === "roster" && toArray(entry.resource.items).length
              ? `<ul class="compact-list">${entry.resource.items.map((item) => `<li>${escapeHtml(formatResourceRosterItem(item))}</li>`).join("")}</ul>`
              : `<p class="fine-print">${escapeHtml(entry.resource.note && !isDeveloperProvenanceText(entry.resource.note)
                ? entry.resource.note
                : "Companion details pending; confirm stats at the table.")}</p>`}
          </article>
        ` : `
          <article class="resource-card">
            <h3>${escapeHtml(getCompanionEntryName(entry.entry, entry.label))}</h3>
            <p class="source-line">${escapeHtml(entry.label)}</p>
            <p class="fine-print">${escapeHtml(formatCompanionDetail(entry.entry))}</p>
          </article>
        `).join("")}</div>`
        : `<p class="fine-print">No companions, familiars, mounts, or summoned allies are recorded on this character.</p>`}
    </section>
  `;
}

function renderSpellSlotTracker(character, options = {}) {
  const canEdit = isEditableSheetMode(options);
  const slots = Object.entries(character.spellSlots?.byLevel ?? {})
    .sort((left, right) => Number(left[0]) - Number(right[0]));

  if (!slots.length) {
    return "";
  }

  return `
    <section class="card character-sheet-spell-slot-card">
      <h2 class="section-title">Spell Slots</h2>
      <div class="player-slot-strip">
        ${slots.map(([level, slot]) => {
          const max = Number(slot.max ?? 0);
          const expended = Number(slot.expended ?? 0);
          const remaining = Math.max(0, max - expended);
          return `
            <article class="player-quick-card" data-sheet-control-group>
              <span>Level ${escapeHtml(level)}</span>
              <strong>${escapeHtml(remaining)} / ${escapeHtml(max)}</strong>
              <small>${escapeHtml(slot.recharge ?? "")}</small>
              ${canEdit ? `
                <div class="inventory-control-row">
                  ${renderInlineActionButton("spell-slot-spend", "Use", { "data-level": level, "data-amount": "1" }, { quiet: true })}
                  ${renderInlineActionButton("spell-slot-restore", "Restore", { "data-level": level, "data-amount": "1" }, { quiet: true })}
                  ${renderInlineActionButton("spell-slot-reset", "Reset", { "data-level": level }, { quiet: true })}
                </div>
              ` : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function getCatalogSpellSchoolLabel(spell = {}) {
  const school = spell.school;
  if (school && typeof school === "object") {
    return school.name || SCHOOL_LABELS[school.code] || school.code || "";
  }

  return SCHOOL_LABELS[school] || school || "";
}

function getSpellCatalogCandidates(sheetContext, limit = 700) {
  const sourcePriority = new Map([
    ["PHB", 0],
    ["XGE", 1],
    ["TCE", 2],
    ["SCAG", 3],
    ["EEPC", 4]
  ]);
  const seen = new Set();

  return toArray(sheetContext.catalogs?.spells?.spells)
    .filter((spell) => spell?.name)
    .filter((spell) => {
      const key = `${normalizeSearchText(spell.name)}|${normalizeSearchText(spell.source)}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftSource = sourcePriority.get(String(left.source ?? "").toUpperCase()) ?? 50;
      const rightSource = sourcePriority.get(String(right.source ?? "").toUpperCase()) ?? 50;
      if (leftSource !== rightSource) {
        return leftSource - rightSource;
      }

      const leftLevel = Number.isFinite(Number(left.level)) ? Number(left.level) : 99;
      const rightLevel = Number.isFinite(Number(right.level)) ? Number(right.level) : 99;
      if (leftLevel !== rightLevel) {
        return leftLevel - rightLevel;
      }

      return String(left.name).localeCompare(String(right.name));
    })
    .slice(0, limit);
}

function renderSpellClassSelect(name, spellcastingEntries = []) {
  return renderInlineSelectControl(
    name,
    spellcastingEntries[0]?.classIndex ?? 0,
    spellcastingEntries.map((entry) => [entry.classIndex, entry.className]),
    { label: "Spellcasting class" }
  );
}

function renderSpellCatalogAction(action, label, spell, controlPrefix, attributes = {}, options = {}) {
  return renderInlineActionButton(action, label, {
    "data-name": spell.name,
    "data-ref": spell.ref ?? "",
    "data-source": spell.source ?? "",
    "data-spell-level": spell.level ?? "",
    "data-school": getCatalogSpellSchoolLabel(spell),
    "data-class-index-control": `${controlPrefix}-class`,
    ...attributes
  }, {
    quiet: options.quiet
  });
}

function getSpellLibraryDetailRows(detail = {}) {
  return [
    { label: "Level", value: formatSpellLevel(detail.level) },
    { label: "School", value: detail.school },
    { label: "Casting Time", value: detail.castingTime },
    { label: "Range", value: detail.range },
    { label: "Components", value: detail.components },
    { label: "Duration", value: detail.duration },
    { label: "Source", value: formatPlayerFacingSource(detail.source) }
  ].filter((row) => row.value != null && row.value !== "");
}

function renderSpellLibraryDetail(spell, detail, controlPrefix) {
  return `
    <article class="character-sheet-library-detail-pane">
      <div class="class-head">
        <div>
          <h3>${escapeHtml(detail.name || spell.name)}</h3>
          <p class="character-sheet-rule-dialog-subtitle">${escapeHtml([formatSpellLevel(detail.level), detail.school, formatPlayerFacingSource(detail.source)].filter(Boolean).join(" | "))}</p>
        </div>
        ${renderBadgeCluster([
          [formatSpellLevel(detail.level), "accent"],
          [detail.concentration ? "concentration" : "", "warning"],
          [detail.ritual ? "ritual" : "", "success"],
          [formatPlayerFacingSource(detail.source), getSourceBadgeTone(detail.source)]
        ])}
      </div>
      ${renderLibraryDetailRows(getSpellLibraryDetailRows(detail))}
      ${renderRuleTextBlock(detail.fullText || detail.summary, "No spell rules text is recorded for this catalog entry.")}
      <div class="inventory-control-row character-sheet-library-actions">
        ${renderSpellCatalogAction("spell-add", "Add Spell", spell, controlPrefix, { "data-list": "spellPool" }, { quiet: true })}
        ${renderSpellCatalogAction("spell-add", "Add Cantrip", spell, controlPrefix, { "data-list": "cantrips" }, { quiet: true })}
        ${renderSpellCatalogAction("spell-prepare", "Prepare", spell, controlPrefix)}
      </div>
    </article>
  `;
}

function renderSpellCatalogOption(spell, controlPrefix, sheetContext, character) {
  const detail = resolveSpellDetail(spell, sheetContext, character);
  const level = formatSpellLevel(spell.level) || "unknown";
  const school = detail.school || getCatalogSpellSchoolLabel(spell);
  const filterText = [
    spell.name,
    spell.source,
    level,
    school,
    spell.ritual ? "ritual" : "",
    spell.concentration ? "concentration" : ""
  ].filter(Boolean).join(" ");

  return `
    <tr
      class="character-sheet-library-row character-sheet-spell-catalog-option"
      data-library-row
      data-library-filter="${escapeHtml(filterText)}"
      data-library-level="${escapeHtml(String(Number.isFinite(Number(spell.level)) ? Number(spell.level) : ""))}"
      data-library-school="${escapeHtml(normalizeLibraryChoiceValue(school))}"
      data-library-source="${escapeHtml(normalizeLibraryChoiceValue(spell.source))}"
      data-library-ritual="${spell.ritual ? "true" : "false"}"
      data-library-concentration="${spell.concentration ? "true" : "false"}"
      role="button"
      tabindex="0"
    >
      <td class="character-sheet-record-main">
        <strong>${escapeHtml(spell.name)}</strong>
        <span class="source-line">${escapeHtml(detail.summary || "Spell details pending; confirm the exact effect at the table.")}</span>
      </td>
      <td>${renderBadgeCluster([
        [level, "accent"],
        [school, ""],
        [formatSpellComponentSummary(detail.components), ""],
        [spell.concentration ? "concentration" : "", "warning"],
        [spell.ritual ? "ritual" : "", "success"],
        [formatPlayerFacingSource(spell.source), getSourceBadgeTone(spell.source)]
      ])}</td>
      <td>${escapeHtml(detail.castingTime || "-")}</td>
      <td>${escapeHtml(detail.range || "-")}</td>
      <td class="character-sheet-record-actions">
        <div class="inventory-control-row character-sheet-library-row-actions">
          ${renderSpellCatalogAction("spell-add", "Add Spell", spell, controlPrefix, { "data-list": "spellPool" }, { quiet: true })}
          ${renderSpellCatalogAction("spell-add", "Add Cantrip", spell, controlPrefix, { "data-list": "cantrips" }, { quiet: true })}
          ${renderSpellCatalogAction("spell-prepare", "Prepare", spell, controlPrefix)}
        </div>
      </td>
      <td hidden><template data-library-row-detail>${renderSpellLibraryDetail(spell, detail, controlPrefix)}</template></td>
    </tr>
  `;
}

function renderCustomSpellControls(controlPrefix) {
  return `
    <article class="panel character-sheet-custom-item-panel">
      <h3>Manual Spell</h3>
      <div class="inventory-control-row" data-sheet-control-group>
        ${renderInlineTextControl(`${controlPrefix}-name`, "", { label: "Spell name", placeholder: "Spell name" })}
        ${renderInlineTextControl(`${controlPrefix}-source`, "", { label: "Source", placeholder: "Source" })}
        ${renderInlineTextControl(`${controlPrefix}-ref`, "", { label: "Reference", placeholder: "Reference" })}
      </div>
      <div class="inventory-control-row" data-sheet-control-group>
        ${renderInlineNumberControl(`${controlPrefix}-level`, 0, { label: "Spell level", min: 0 })}
        ${renderInlineTextControl(`${controlPrefix}-school`, "", { label: "School", placeholder: "School" })}
      </div>
      <div class="inventory-control-row">
        ${renderInlineActionButton("spell-add", "Add Spell", {
          "data-name-control": `${controlPrefix}-name`,
          "data-source-control": `${controlPrefix}-source`,
          "data-ref-control": `${controlPrefix}-ref`,
          "data-spell-level-control": `${controlPrefix}-level`,
          "data-school-control": `${controlPrefix}-school`,
          "data-class-index-control": "spell-catalog-class",
          "data-list": "spellPool"
        }, { quiet: true })}
        ${renderInlineActionButton("spell-add", "Add Cantrip", {
          "data-name-control": `${controlPrefix}-name`,
          "data-source-control": `${controlPrefix}-source`,
          "data-ref-control": `${controlPrefix}-ref`,
          "data-spell-level": "0",
          "data-school-control": `${controlPrefix}-school`,
          "data-class-index-control": "spell-catalog-class",
          "data-list": "cantrips"
        }, { quiet: true })}
        ${renderInlineActionButton("spell-prepare", "Prepare", {
          "data-name-control": `${controlPrefix}-name`,
          "data-source-control": `${controlPrefix}-source`,
          "data-ref-control": `${controlPrefix}-ref`,
          "data-spell-level-control": `${controlPrefix}-level`,
          "data-school-control": `${controlPrefix}-school`,
          "data-class-index-control": "spell-catalog-class"
        })}
      </div>
    </article>
  `;
}

function renderSpellManagementDrawer(character, sheetContext, options = {}, spellContent = collectSpellCards(character, sheetContext)) {
  if (!isEditableSheetMode(options) || !spellContent.spellcastingEntries.length) {
    return "";
  }

  const controlPrefix = "spell-catalog";
  const candidates = getSpellCatalogCandidates(sheetContext);
  const levelChoices = getUniqueLibraryChoices(candidates, (spell) => Number.isFinite(Number(spell.level)) ? String(Number(spell.level)) : "", (spell) => formatSpellLevel(spell.level) || "Unknown");
  const schoolChoices = getUniqueLibraryChoices(candidates, getCatalogSpellSchoolLabel);
  const sourceChoices = getUniqueLibraryChoices(candidates, (spell) => spell.source, (spell) => formatPlayerFacingSource(spell.source));

  const templateMarkup = `
    <template data-library-template="spell">
      <div class="character-sheet-library-modal" data-library-modal="spell">
        <div class="filter-layout character-sheet-library-layout">
          <aside class="filter-sidebar character-sheet-library-sidebar">
            ${renderLibrarySearchField("Search spells")}
            ${renderLibrarySelectFilter("level", "Level", levelChoices)}
            ${renderLibrarySelectFilter("school", "School", schoolChoices)}
            ${renderLibrarySelectFilter("source", "Source", sourceChoices)}
            <div class="character-sheet-library-checks">
              ${renderLibraryCheckboxFilter("ritual", "Ritual")}
              ${renderLibraryCheckboxFilter("concentration", "Concentration")}
            </div>
            <div class="inventory-control-row character-sheet-catalog-controls">
              ${renderSpellClassSelect(`${controlPrefix}-class`, spellContent.spellcastingEntries)}
              <span class="fine-print">Adds are light upkeep only; class legality stays in the builder.</span>
            </div>
            <button type="button" class="button button-quiet" data-library-clear>Clear filters</button>
            ${renderLibraryCount(candidates.length)}
          </aside>
          <section class="character-sheet-library-results" aria-label="Spell results">
            ${candidates.length
              ? `<div class="data-table-wrap character-sheet-library-table-wrap">
                  <table class="data-table character-sheet-library-table">
                    <thead>
                      <tr>
                        <th>Spell</th>
                        <th>Tags</th>
                        <th>Cast</th>
                        <th>Range</th>
                        <th>Add</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${candidates.map((spell) => renderSpellCatalogOption(spell, controlPrefix, sheetContext, character)).join("")}
                    </tbody>
                  </table>
                </div>`
              : `<p class="fine-print">No spell catalog is loaded.</p>`}
          </section>
          <aside class="character-sheet-library-detail" data-library-detail aria-live="polite">
            <p class="fine-print">Select a spell to inspect its details.</p>
          </aside>
        </div>
        ${renderCustomSpellControls("spell-custom")}
      </div>
    </template>
  `;

  return renderLibraryLauncher(
    "spell",
    "Spell Library",
    "Search the loaded rules catalog in a modal. Adds are table upkeep; level-up legality stays in the builder.",
    "Add Spell",
    candidates.length ? `${candidates.length} catalog spells` : "Manual entry",
    templateMarkup
  );
}

function collectSpellCards(character, sheetContext) {
  const spellcastingEntries = collectSpellcastingEntries(character, sheetContext);
  const slots = Object.entries(character.spellSlots?.byLevel ?? {})
    .sort((left, right) => Number(left[0]) - Number(right[0]));
  const spellLikeResources = collectSpellLikeResources(character);
  const spellItems = collectSpellItems(character);
  const recordedSpellCount = spellcastingEntries.reduce(
    (total, entry) => total + collectSpellRecords(entry.spellcasting, sheetContext, character).length,
    0
  );

  return {
    spellcastingEntries,
    slots,
    spellLikeResources,
    spellItems,
    preparedCount: recordedSpellCount,
    casterWithEmptyList: spellcastingEntries.some((entry) => !spellcastingHasStoredSpells(entry.spellcasting))
  };
}

function renderSpellsOverview(character, spellContent) {
  const slotSummary = spellContent.slots.length
    ? spellContent.slots.map(([level, slot]) => {
        const max = Number(slot.max ?? 0);
        const expended = Number(slot.expended ?? 0);
        return `L${level} ${Math.max(0, max - expended)}/${max}`;
      }).join(", ")
    : "-";
  const mathCards = spellContent.spellcastingEntries.flatMap((entry) => {
    const spellMath = getSpellcastingMath(character, entry.spellcasting);
    const labelPrefix = spellContent.spellcastingEntries.length > 1 ? `${entry.className} ` : "";
    return [
      renderQuickMetric(`${labelPrefix}Ability`, String(entry.spellcasting.ability ?? "-").toUpperCase(), titleCase(entry.spellcasting.preparationStyle ?? "")),
      renderQuickMetric(`${labelPrefix}Spell Attack`, spellMath?.spellAttackBonus != null ? formatModifier(Number(spellMath.spellAttackBonus)) : "-", spellMath?.attackFormula ?? ""),
      renderQuickMetric(`${labelPrefix}Save DC`, spellMath?.spellSaveDc ?? "-", spellMath?.saveFormula ?? "")
    ];
  }).join("");

  return `
    <section class="card">
      <h2 class="section-title">Spells</h2>
      <div class="player-quick-grid">
        ${mathCards || renderQuickMetric("Ability", "-", "No class spellcasting")}
        ${renderQuickMetric("Slots", slotSummary, "Remaining")}
        ${renderQuickMetric("Prepared / Known", spellContent.preparedCount, "Recorded spells")}
        ${renderQuickMetric("Spell Resources", spellContent.spellLikeResources.length, "Feature magic")}
        ${renderQuickMetric("Spell Items", spellContent.spellItems.length, "Inventory")}
      </div>
      ${spellContent.casterWithEmptyList
        ? renderEmptyState("No spell list recorded", "This caster has spellcasting state, but no prepared, known, or pooled spells on the sheet.", "Add or prepare spells.")
        : ""}
    </section>
  `;
}

function renderSpellsTab(character, sheetContext, options = {}) {
  const spellContent = collectSpellCards(character, sheetContext);
  const { spellcastingEntries, spellLikeResources, spellItems } = spellContent;

  return `
    ${renderSpellsOverview(character, spellContent)}
    ${renderSpellManagementDrawer(character, sheetContext, options, spellContent)}
    ${renderSpellSlotTracker(character, options)}
    ${spellcastingEntries.length
      ? spellcastingEntries.map((entry) => `
        <section class="card">
          <h2 class="section-title">${escapeHtml(entry.className)} Spells</h2>
          ${renderSpellcasting(entry.spellcasting, sheetContext, character, entry.classIndex, options)}
        </section>
      `).join("")
      : ""}
    ${spellLikeResources.length ? `
      <section class="card">
        <h2 class="section-title">Innate / Feature Magic</h2>
        <div class="resource-grid">${spellLikeResources.map(({ resource, index }) => renderResource(resource, index, options)).join("")}</div>
      </section>
    ` : ""}
    ${spellItems.length ? `
      <section class="card">
        <h2 class="section-title">Spell Items</h2>
        <div class="data-table-wrap character-sheet-record-list character-sheet-inventory-record-list">
          <table class="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Tags</th>
                <th>Qty</th>
                <th>Weight</th>
                <th>Type</th>
                <th>Upkeep</th>
              </tr>
            </thead>
            <tbody>
              ${spellItems.map(({ item, index }) => renderInventoryItemCard(item, index, sheetContext, character, options)).join("")}
            </tbody>
          </table>
        </div>
      </section>
    ` : ""}
    ${!spellcastingEntries.length && !spellLikeResources.length && !spellItems.length && !spellContent.slots.length
      ? `<section class="card">${renderEmptyState("No spells recorded", "No spells or spell-like abilities are recorded on this character.", "Add or prepare spells.")}</section>`
      : ""}
  `;
}

function renderPlayerOverview(character, sheetContext, options = {}) {
  return renderActionsTab(character, sheetContext, options);
}

/**
 * Verifies the minimum shape required by the renderer contract.
 * Called only by renderCharacterSheet() before any HTML is produced.
 */
function validateShape(character) {
  if (!character || typeof character !== "object") {
    throw new Error("Character payload must be an object.");
  }

  if (!character.identity || !character.abilities || !Array.isArray(character.classes)) {
    throw new Error("Character payload is missing required v1 fields.");
  }
}

function createSheetContext(character, options = {}) {
  return createSheetRulesContext({
    rulesCatalog: options.rulesCatalog ?? options.normalizedCatalog ?? options.catalogs,
    rulesProfile: options.rulesProfile ?? character.sourcePolicy ?? {},
    allowedSources: options.allowedSources ?? character.sourcePolicy?.allowedSources ?? []
  });
}

function normalizeSheetTab(value) {
  const normalized = String(value ?? "overview").trim().toLowerCase().replace(/_/g, "-");
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

  return aliases[normalized] ?? normalized;
}

function renderPets() {
  return `
    <section class="card character-sheet-pets-card">
      <p class="fine-print">Animal companions, familiars, mounts, and summoned allies are not recorded on this character.</p>
    </section>
  `;
}

function renderRawJson(character) {
  return `
    <section class="card character-sheet-raw-json-card">
      <h2 class="section-title">Raw JSON</h2>
      <pre class="character-sheet-raw-json" tabindex="0">${escapeHtml(JSON.stringify(character, null, 2))}</pre>
    </section>
  `;
}

function renderSheetSections(character, sheetContext, tab, options = {}) {
  switch (normalizeSheetTab(tab)) {
    case "combat":
      return renderDefenses(character, sheetContext, options);
    case "skills":
      return renderSkillsTab(character);
    case "features":
      return [
        renderFeatures(character, sheetContext),
        renderResources(character, options)
      ].join("");
    case "spells":
      return renderSpellsTab(character, sheetContext, options);
    case "pets":
      return renderCompanions(character);
    case "inventory":
      return renderInventory(character, sheetContext, options);
    case "notes":
      return renderCharacterDetails(character, sheetContext, options);
    case "raw-json":
      return renderRawJson(character);
    case "overview":
    default:
      return renderPlayerOverview(character, sheetContext, options);
  }
}

export function renderCharacterSheetContent(character, options = {}) {
  validateShape(character);
  const sheetContext = createSheetContext(character, options);
  const tab = normalizeSheetTab(options.tab ?? "overview");
  const contentPriority = PLAYER_TAB_CONTENT_PRIORITY[tab]?.join(" | ") ?? "edit-only technical state";

  return `
    <div class="sheet sheet-tab-content sheet-tab-${escapeHtml(tab)}" data-player-content-priority="${escapeHtml(contentPriority)}">
      ${renderSheetSections(character, sheetContext, tab, options)}
    </div>
  `;
}

export function renderCharacterSheetTab(target, character, options = {}) {
  target.innerHTML = renderCharacterSheetContent(character, options);
}

/**
 * Top-level renderer entrypoint for the static sheet preview.
 * Called by the editor shell whenever currentCharacter changes.
 */
export function renderCharacterSheet(target, character, options = {}) {
  renderCharacterSheetTab(target, character, {
    ...options,
    tab: options.tab ?? "overview"
  });
}
