function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const RENDER_FOCUS_KEY_ATTRIBUTE = "data-render-focus-key";
export const ADD_LEVEL_FOCUS_KEY = "add-level";
export const ADD_LEVEL_CLASS_FOCUS_KEY = "add-level-class";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

const ABILITY_LABELS = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
};

const ABILITY_ORDER = Object.keys(ABILITY_LABELS);
const INLINE_PICK_TYPES = new Set(["skill", "tool", "language"]);

function stripJsonExtension(value) {
  return String(value ?? "").trim().replace(/\.json$/i, "");
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll(/[-_]+/g, " ")
    .replaceAll(/\bdto\b/gi, "DTO")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function cleanRefName(ref) {
  return stripJsonExtension(ref)
    .replace(/^(background|class|race|subclass|feat)-/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeFocusKey(value) {
  return String(value ?? "").trim();
}

function escapeAttributeSelector(value) {
  return normalizeFocusKey(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}

export function getLevelFocusKey(characterLevel) {
  return `level-card-${Number(characterLevel ?? 0)}`;
}

function getLevelClassFocusKey(characterLevel) {
  return `level-${Number(characterLevel ?? 0)}-class`;
}

function getPickerFieldFocusKey(field) {
  const normalized = normalizeFocusKey(field);
  return normalized ? `picker-field-${normalized}` : "";
}

function getPickerResultFocusKey(ref) {
  const normalized = normalizeFocusKey(ref);
  return normalized ? `picker-result-${normalized}` : "";
}

function getIdentityFeatPickerLaunchFocusKey(choiceId) {
  const normalized = normalizeFocusKey(choiceId);
  return normalized ? `identity-feat-picker-${normalized}` : "";
}

function getIdentityFeatPickerFieldFocusKey(field) {
  const normalized = normalizeFocusKey(field);
  return normalized ? `identity-feat-field-${normalized}` : "";
}

function getIdentityFeatPickerResultFocusKey(ref) {
  const normalized = normalizeFocusKey(ref);
  return normalized ? `identity-feat-result-${normalized}` : "";
}

function formatStatusLabel(value, fallback = "idle") {
  const normalized = String(value ?? fallback).trim() || fallback;
  const labels = {
    idle: "Idle",
    loading: "Loading",
    loaded: "Loaded",
    "loaded-with-issues": "Loaded with issues",
    failed: "Failed",
    saving: "Saving",
    saved: "Saved",
    partial: "Partial save",
    unavailable: "Unavailable",
    conflict: "Conflict",
    blocked: "Blocked",
    "exported-compiled-dto": "Compiled DTO exported",
    "exported-builder-dto": "Builder DTO exported"
  };

  return labels[normalized] ?? titleCase(normalized);
}

function formatCount(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function isExportOnlyPersistence(snapshot = {}) {
  return snapshot.config?.persistenceMode === "export-only";
}

function formatRuleEntity(entity, emptyLabel = "Not selected") {
  if (!entity?.ref && !entity?.name) {
    return emptyLabel;
  }

  return entity.name || cleanRefName(entity.ref);
}

function formatEntityMeta(entity) {
  const parts = [
    entity?.source ? `Source ${entity.source}` : "",
    entity?.ref || ""
  ].filter(Boolean);

  return parts.join(" | ") || "No rule reference";
}

function formatSources(sources = []) {
  const list = toArray(sources).filter(Boolean);
  return list.length ? list.join(", ") : "All sources";
}

function mergeChoices(...choiceLists) {
  const seen = new Set();
  const merged = [];

  for (const choice of choiceLists.flatMap(toArray)) {
    const key = [
      choice.choiceId,
      choice.type,
      choice.classRef,
      choice.characterLevel ?? "",
      choice.unlockAtClassLevel ?? "",
      choice.blockedReason ?? ""
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(choice);
  }

  return merged;
}

function getStatusTone(type, value, count = 0) {
  const normalized = String(value ?? "").trim();

  if (type === "count") {
    return Number(count) > 0 ? "warning" : "good";
  }

  if (["loaded", "saved", "exported-compiled-dto"].includes(normalized)) {
    return "good";
  }

  if (["loaded-with-issues", "partial", "exported-builder-dto"].includes(normalized)) {
    return "warning";
  }

  if (["failed", "unavailable", "conflict", "blocked"].includes(normalized)) {
    return "danger";
  }

  if (["loading", "saving"].includes(normalized)) {
    return "info";
  }

  return "neutral";
}

function renderStatusPill(label, value, options = {}) {
  const tone = options.tone ?? getStatusTone(options.type, value, options.count);
  const display = options.type === "count"
    ? String(formatCount(options.count ?? value))
    : formatStatusLabel(value);

  return `
    <div class="character-builder-status-pill character-builder-status-${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(display)}</strong>
    </div>
  `;
}

function renderBuilderBadge(label, tone = "accent", options = {}) {
  const title = options.title ? ` title="${escapeHtml(options.title)}"` : "";
  const className = ["badge", options.className].filter(Boolean).join(" ");
  return `<span class="${escapeHtml(className)}" data-tone="${escapeHtml(tone)}"${title}>${escapeHtml(label)}</span>`;
}

function getRequiredChoiceStatus({ resolved = false, blocked = false, required = true, recommended = false } = {}) {
  if (blocked) {
    return {
      className: "character-builder-choice-conflict",
      label: "Conflict",
      tone: "danger"
    };
  }

  if (resolved) {
    return {
      className: "character-builder-choice-complete",
      label: "Complete",
      tone: "success"
    };
  }

  if (recommended) {
    return {
      className: "character-builder-choice-recommended",
      label: "Recommended",
      tone: "warning"
    };
  }

  if (required) {
    return {
      className: "character-builder-choice-required",
      label: "Required",
      tone: "accent"
    };
  }

  return {
    className: "character-builder-choice-optional",
    label: "",
    tone: ""
  };
}

function renderRequiredChoiceBadge(status, options = {}) {
  if (!status?.label) {
    return "";
  }

  return renderBuilderBadge(status.label, status.tone, {
    className: ["character-builder-choice-badge", options.className].filter(Boolean).join(" "),
    title: options.title
  });
}

function renderChoiceTitle(label, status, options = {}) {
  const tag = options.tag || "strong";
  return `
    <span class="character-builder-choice-title">
      <${tag}>${escapeHtml(label)}</${tag}>
      ${renderRequiredChoiceBadge(status)}
    </span>
  `;
}

function renderSummaryPanel(label, value, meta, options = {}) {
  const tone = options.tone ?? "neutral";
  const detail = options.detail ? `<p>${escapeHtml(options.detail)}</p>` : "";
  const actionHtml = options.actionHtml ? `<div class="character-builder-summary-actions">${options.actionHtml}</div>` : "";
  const ruleAttrs = options.ruleDetail
    ? ` ${renderBuilderRuleDetailAttributes(options.ruleDetail, { title: value, kind: label })} role="button" tabindex="0"`
    : "";
  const valueMarkup = options.ruleDetail
    ? renderBuilderRuleDetailButton(value, options.ruleDetail, { title: value, kind: label })
    : escapeHtml(value);

  return `
    <article class="character-builder-summary-panel character-builder-summary-${escapeHtml(tone)}"${ruleAttrs}>
      <span>${escapeHtml(label)}</span>
      <strong>${valueMarkup}</strong>
      <small>${escapeHtml(meta)}</small>
      ${detail}
      ${actionHtml}
    </article>
  `;
}

function formatSignedAmount(amount) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : String(value);
}

function formatAbilityDeltaMap(map = {}, emptyLabel = "No ability impact") {
  const entries = ABILITY_ORDER
    .map((ability) => {
      const amount = Number(map?.[ability] ?? 0);
      return Number.isFinite(amount) && amount !== 0
        ? `${ABILITY_LABELS[ability]} ${formatSignedAmount(amount)}`
        : "";
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : emptyLabel;
}

function formatAbilityScoreLine(scores = {}, options = {}) {
  const separator = options.separator ?? " ";
  const entries = ABILITY_ORDER
    .map((ability) => {
      const value = Number(scores?.[ability]);
      return Number.isFinite(value) ? `${ABILITY_LABELS[ability]} ${value}` : "";
    })
    .filter(Boolean);

  return entries.length ? entries.join(separator) : options.emptyLabel ?? "No base scores entered";
}

function formatIdentityChoiceRequirementSummary(requirements = [], scope, emptyLabel = "") {
  const entries = toArray(requirements).filter((entry) => entry.scope === scope);
  if (!entries.length) {
    return emptyLabel;
  }

  return entries.map((entry) => {
    const label = entry.definition?.label || titleCase(entry.definition?.choiceId || entry.choiceId || "Choice");
    if (entry.resolved) {
      const values = toArray(entry.matchedValues).filter(Boolean);
      return `${label}: ${values.length ? values.join(", ") : "resolved"}`;
    }

    return `${label}: ${entry.blockedReason ? "blocked" : "pending"}`;
  }).join(" | ");
}

function getAncestryAbilitySummary(summary = {}) {
  return summary.ancestry?.abilitySummary
    || summary.abilityImpactPreview?.selectedAncestry?.abilitySummary
    || formatAbilityDeltaMap(summary.abilityImpactPreview?.ancestryAbility)
    || "No ability impact";
}

function getGlobalStateRows(snapshot = {}) {
  const status = snapshot.builderStatus ?? {};
  const summary = snapshot.builderSummary ?? {};
  const profile = snapshot.rulesProfile ?? {};
  const ancestry = summary.ancestry ?? {};
  const background = summary.background ?? {};
  const totalLevel = formatCount(summary.totalLevel ?? status.totalLevels);
  const warningCount = formatCount(summary.warnings?.length ?? status.warningCount);
  const unresolvedCount = formatCount(toArray(summary.pendingChoices).length + toArray(summary.blockedChoices).length);
  const classCount = formatCount(status.classCount ?? toArray(summary.classes).length);
  const baseScoreComplete = Boolean(summary.abilityScores?.complete);
  const ancestryChoices = formatIdentityChoiceRequirementSummary(
    summary.identityChoiceRequirements,
    "race",
    "No ancestry choices recorded"
  );
  const backgroundChoices = formatIdentityChoiceRequirementSummary(
    summary.identityChoiceRequirements,
    "background",
    ""
  );
  const abilitySummary = getAncestryAbilitySummary(summary);
  const profileSource = profile.index?.source ?? "rules";

  return [
    {
      id: "ancestry",
      label: "Ancestry",
      value: formatRuleEntity(ancestry),
      meta: formatEntityMeta(ancestry),
      summary: [`Ability: ${abilitySummary}`, "Included in Ability Score Preview", ancestryChoices].filter(Boolean).join(" | "),
      tone: ancestry.ref ? ancestry.blocked || !ancestry.available ? "warning" : "good" : "warning",
      action: {
        type: "ancestry",
        label: ancestry.ref ? "Review" : "Choose"
      }
    },
    {
      id: "background",
      label: "Background",
      value: formatRuleEntity(background),
      meta: formatEntityMeta(background),
      summary: backgroundChoices || background.summary || "No background mechanics recorded",
      tone: background.ref ? background.blocked || !background.available ? "warning" : "good" : "warning",
      action: {
        type: "background",
        label: background.ref ? "Review" : "Choose"
      }
    },
    {
      id: "class-mix",
      label: "Class Mix",
      value: summary.classMix || "No class levels",
      meta: `${classCount} class group${classCount === 1 ? "" : "s"}`,
      summary: `${unresolvedCount} unresolved | ${warningCount} warnings`,
      tone: totalLevel ? "good" : "warning"
    },
    {
      id: "total-level",
      label: "Total Level",
      value: `Level ${totalLevel}`,
      meta: `${totalLevel} planned level${totalLevel === 1 ? "" : "s"}`,
      summary: `${unresolvedCount} unresolved | ${warningCount} warnings | ${baseScoreComplete ? "Base scores complete" : "Base scores incomplete"}`,
      tone: totalLevel && baseScoreComplete ? "good" : "warning"
    },
    {
      id: "base-scores",
      label: "Base Scores",
      value: formatAbilityScoreLine(summary.abilityScores?.scores),
      meta: `${summary.abilityScores?.method || "manual"} method | ${summary.abilityScores?.enteredCount ?? 0}/6 entered`,
      summary: "Level 1 manual scores before ancestry and level ASI bonuses",
      tone: baseScoreComplete ? "good" : "warning"
    },
    {
      id: "rules-profile",
      label: "Rules Profile",
      value: profile.ruleset ?? "2014",
      meta: `Sources ${formatSources(profile.allowedSources)} | ${profile.asiAndFeatAtAsiLevels ? "ASI+Feat on" : "ASI+Feat off"}`,
      summary: `${profileSource} | ${formatCount(profile.index?.classes)} classes | ${formatCount(profile.index?.feats)} feats indexed`,
      tone: "neutral"
    }
  ];
}

function renderGlobalBuilderStatePanel(snapshot = {}) {
  const summary = snapshot.builderSummary ?? {};
  const rows = getGlobalStateRows(snapshot);

  return `
    <section
      class="character-builder-global-state"
      data-global-builder-state
      data-global-state-layout="stacked"
      aria-labelledby="character-builder-global-state-title"
    >
      <header class="character-builder-global-header">
        <div>
          <p>Production Builder State</p>
          <h3 id="character-builder-global-state-title">Global Builder State</h3>
        </div>
        <span>${escapeHtml(summary.characterId || "new")}</span>
      </header>
      <div class="character-builder-global-stack">
        ${rows.map((row) => `
          <article class="character-builder-global-row character-builder-global-${escapeHtml(row.tone)}" data-global-state-row="${escapeHtml(row.id)}">
            <div class="character-builder-global-label">${escapeHtml(row.label)}</div>
            <div class="character-builder-global-copy">
              <strong>${escapeHtml(row.value)}</strong>
              <small>${escapeHtml(row.meta)}</small>
              <p>${escapeHtml(row.summary)}</p>
            </div>
            ${row.action ? `
              <div class="character-builder-global-actions">
                <button
                  type="button"
                  class="character-builder-button character-builder-button-compact"
                  data-builder-action="open-guided-overlay"
                  data-overlay-type="${escapeHtml(row.action.type)}"
                  aria-label="${escapeHtml(`${row.action.label} ${row.label}`)}"
                >${escapeHtml(row.action.label)}</button>
              </div>
            ` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function normalizeRuleText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chooseTaggedTextDisplay(body) {
  const parts = String(body ?? "").split("|").map((part) => part.trim()).filter(Boolean);
  const display = [...parts].reverse().find((part) => (
    !/^[a-z]{2,8}$/i.test(part)
    && !/^[a-z0-9_-]+\.html$/i.test(part)
    && !/^\d+$/.test(part)
  ));

  return display || parts[0] || "";
}

function cleanRulesText(value) {
  if (Array.isArray(value)) {
    return value.map(cleanRulesText).filter(Boolean).join(" ");
  }

  if (isObject(value)) {
    return cleanRulesText(value.entries ?? value.items ?? value.entry ?? value.name ?? "");
  }

  return normalizeRuleText(value)
    .replace(/\{@[a-zA-Z0-9_-]+\s+([^}]+)\}/g, (_, body) => chooseTaggedTextDisplay(body))
    .replace(/\{=([^}]+)\}/g, "$1")
    .replace(/\s+/g, " ");
}

function getRenderableRulesValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value : null;
  }

  if (isObject(value)) {
    return Object.keys(value).length ? value : null;
  }

  return normalizeRuleText(value) ? value : null;
}

function findCanonicalRulesSource(entity) {
  const entries = getRenderableRulesValue(entity?.entries);
  if (entries) {
    return { source: "entries", entries: toArray(entries) };
  }

  const rawEntries = getRenderableRulesValue(entity?.raw?.entries);
  if (rawEntries) {
    return { source: "raw.entries", entries: toArray(rawEntries) };
  }

  const summary = getRenderableRulesValue(entity?.summary);
  if (summary) {
    return { source: "summary", entries: [summary] };
  }

  const fullText = getRenderableRulesValue(entity?.fullText);
  if (fullText) {
    return { source: "fullText", entries: [fullText] };
  }

  return { source: "none", entries: [] };
}

function getCanonicalRulesContent(entity, fallbacks = []) {
  for (const candidate of [entity, ...toArray(fallbacks)]) {
    const content = findCanonicalRulesSource(candidate);
    if (content.entries.length) {
      return {
        ...content,
        entityRef: candidate?.ref ?? "",
        entityName: candidate?.name ?? ""
      };
    }
  }

  return { source: "none", entries: [], entityRef: "", entityName: "" };
}

function renderRulesTable(entry = {}) {
  const labels = toArray(entry.colLabels);
  const rows = toArray(entry.rows);

  return `
    <figure class="character-builder-picker-table-wrap">
      ${entry.caption ? `<figcaption>${escapeHtml(cleanRulesText(entry.caption))}</figcaption>` : ""}
      <table class="character-builder-picker-table">
        ${labels.length ? `
          <thead>
            <tr>${labels.map((label) => `<th>${escapeHtml(cleanRulesText(label))}</th>`).join("")}</tr>
          </thead>
        ` : ""}
        <tbody>
          ${rows.map((row) => `
            <tr>${toArray(row).map((cell) => `<td>${escapeHtml(cleanRulesText(cell))}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </figure>
  `;
}

function renderRulesListItem(item) {
  if (typeof item === "string") {
    return `<li>${escapeHtml(cleanRulesText(item))}</li>`;
  }

  if (!isObject(item)) {
    return "";
  }

  if (item.type === "item" || item.entry || item.entries) {
    const name = item.name ? `<strong>${escapeHtml(cleanRulesText(item.name))}</strong> ` : "";
    const body = item.entry
      ? escapeHtml(cleanRulesText(item.entry))
      : renderRulesEntries(item.entries ?? item.items);
    return `<li>${name}${body}</li>`;
  }

  return `<li>${renderRulesEntry(item)}</li>`;
}

function renderRulesEntry(entry) {
  if (typeof entry === "string") {
    const text = cleanRulesText(entry);
    return text ? `<p>${escapeHtml(text)}</p>` : "";
  }

  if (Array.isArray(entry)) {
    return renderRulesEntries(entry);
  }

  if (!isObject(entry)) {
    return "";
  }

  if (entry.type === "table") {
    return renderRulesTable(entry);
  }

  if (entry.type === "list" || entry.items) {
    return `
      <ul class="character-builder-picker-rule-list">
        ${toArray(entry.items).map(renderRulesListItem).join("")}
      </ul>
    `;
  }

  if (entry.type === "entries" || entry.entries) {
    return `
      <section class="character-builder-picker-rule-section">
        ${entry.name ? `<h4>${escapeHtml(cleanRulesText(entry.name))}</h4>` : ""}
        ${renderRulesEntries(entry.entries)}
      </section>
    `;
  }

  if (entry.entry) {
    return `<p>${escapeHtml(cleanRulesText(entry.entry))}</p>`;
  }

  const text = cleanRulesText(entry);
  return text ? `<p>${escapeHtml(text)}</p>` : "";
}

function renderRulesEntries(entries = []) {
  return toArray(entries).map(renderRulesEntry).filter(Boolean).join("");
}

function renderCanonicalRulesText(entity, fallbacks = []) {
  const content = getCanonicalRulesContent(entity, fallbacks);
  const body = renderRulesEntries(content.entries);

  return `
    <div
      class="character-builder-picker-rules-text"
      data-canonical-text-source="${escapeHtml(content.source)}"
      data-canonical-text-entity="${escapeHtml(content.entityRef)}"
    >
      ${body || `<p>No formatted rules text is recorded for this option.</p>`}
    </div>
  `;
}

function getBuilderRuleTitle(detail = {}, fallback = "Rule Detail") {
  return normalizeRuleText(detail.name ?? detail.shortName ?? detail.displayName ?? fallback) || fallback;
}

function getBuilderRuleBody(detail = {}, fallback = "") {
  return normalizeRuleText(
    detail.fullText
      || cleanRulesText(detail.entries)
      || cleanRulesText(detail.raw?.entries)
      || detail.summary
      || fallback
      || "No additional rules text is recorded for this entry."
  );
}

function renderBuilderRuleDetailAttributes(detail = {}, options = {}) {
  const title = getBuilderRuleTitle(detail, options.title);
  const subtitle = [
    options.kind || detail.kind || "Rule",
    detail.source ? `Source ${detail.source}` : "",
    detail.ref ?? ""
  ].filter(Boolean).join(" | ");

  return [
    'data-builder-rule-detail="true"',
    `data-rule-title="${escapeHtml(title)}"`,
    `data-rule-subtitle="${escapeHtml(subtitle)}"`,
    `data-rule-body="${escapeHtml(getBuilderRuleBody(detail, options.body))}"`,
    `aria-label="${escapeHtml(`Open details for ${title}`)}"`
  ].join(" ");
}

function renderBuilderRuleDetailButton(label, detail = {}, options = {}) {
  const text = normalizeRuleText(label) || getBuilderRuleTitle(detail, options.title);
  return `
    <button
      type="button"
      class="character-builder-rule-link"
      data-builder-rule-detail-button="true"
      ${renderBuilderRuleDetailAttributes(detail, {
        ...options,
        title: options.title || text
      })}
    >${escapeHtml(text)}</button>
  `;
}

function renderIdentitySelect(field, label, options = [], selectedRef = "") {
  const entries = toArray(options);
  const disabled = entries.length ? "" : " disabled";

  return `
    <label class="character-builder-field character-builder-field-summary">
      <span>${escapeHtml(label)}</span>
      <select
        data-builder-field="${escapeHtml(field)}"
        aria-label="${escapeHtml(label)}"
        ${disabled}
      >
        ${renderRuleOptions(entries, selectedRef, `Choose ${label.toLowerCase()}`)}
      </select>
    </label>
  `;
}

function renderIdentityChoiceSelect(requirement) {
  const definition = requirement.definition ?? {};
  const selected = requirement.matchedValues?.[0] ?? "";

  return `
    <label class="character-builder-field character-builder-field-summary">
      <span>${escapeHtml(definition.label || "Choice")}</span>
      <select
        data-builder-field="identity-choice"
        data-identity-choice-scope="${escapeHtml(requirement.scope)}"
        data-identity-choice-id="${escapeHtml(definition.choiceId)}"
        aria-label="${escapeHtml(definition.label || "Identity choice")}"
      >
        ${renderRuleOptions(definition.options, selected, `Choose ${definition.label || "option"}`)}
      </select>
    </label>
  `;
}

function renderIdentityChoiceCheckboxes(requirement) {
  const definition = requirement.definition ?? {};
  const selectedSet = new Set(toArray(requirement.matchedValues).map(normalizeComparable));

  return `
    <div class="character-builder-identity-checkboxes" role="group" aria-label="${escapeHtml(definition.label || "Identity choice")}">
      ${toArray(definition.options).map((option) => {
        const value = getOptionValue(option);
        const checked = selectedSet.has(normalizeComparable(value));
        return `
          <label class="character-builder-checkbox-card character-builder-checkbox-card-compact">
            <input
              type="checkbox"
              data-builder-field="identity-choice"
              data-identity-choice-scope="${escapeHtml(requirement.scope)}"
              data-identity-choice-id="${escapeHtml(definition.choiceId)}"
              value="${escapeHtml(value)}"
              ${checked ? "checked" : ""}
            >
            <span>${escapeHtml(formatOptionLabel(option))}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderIdentityChoiceControl(requirement) {
  if (requirement.unsupported || requirement.blockedReason) {
    return `
      <div class="character-builder-choice-blocker" role="status">
        ${escapeHtml(requirement.blockedReason || "This required choice cannot be normalized yet.")}
      </div>
    `;
  }

  const definition = requirement.definition ?? {};
  if (definition.control === "ability-score-pattern") {
    const overlayType = requirement.scope === "background" ? "background" : "ancestry";
    return `
      <button
        type="button"
        class="character-builder-button character-builder-button-compact"
        data-builder-action="open-guided-overlay"
        data-overlay-type="${escapeHtml(overlayType)}"
      >Choose Ability Scores</button>
    `;
  }

  if (definition.control === "checkbox" || Number(definition.count ?? 1) > 1) {
    return renderIdentityChoiceCheckboxes(requirement);
  }

  return renderIdentityChoiceSelect(requirement);
}

function renderIdentityChoiceRequirements(requirements = [], scope) {
  const entries = toArray(requirements).filter((entry) => entry.scope === scope);
  if (!entries.length) {
    return "";
  }

  return `
    <div class="character-builder-identity-choices">
      ${entries.map((requirement) => {
        const definition = requirement.definition ?? {};
        const status = requirement.resolved ? "resolved" : requirement.blockedReason ? "blocked" : "pending";
        const badge = getRequiredChoiceStatus({
          blocked: Boolean(requirement.blockedReason),
          recommended: Boolean(definition.recommended),
          required: definition.required !== false,
          resolved: Boolean(requirement.resolved)
        });
        const prompt = definition.prompt || requirement.blockedReason || "";
        return `
          <div class="character-builder-identity-choice-row character-builder-choice-${escapeHtml(status)} ${escapeHtml(badge.className)}" data-identity-choice-row>
            <div class="character-builder-identity-choice-copy">
              ${renderChoiceTitle(definition.label || definition.choiceId || "Choice", badge)}
              ${prompt ? `<p>${escapeHtml(prompt)}</p>` : ""}
              <small>${escapeHtml(requirement.sourceName || requirement.sourceRef || "")}</small>
            </div>
            ${renderIdentityChoiceControl(requirement)}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderClassMix(classes = []) {
  const entries = toArray(classes);
  if (!entries.length) {
    return `<p class="character-builder-empty">No class levels selected.</p>`;
  }

  return `
    <div class="character-builder-class-list">
      ${entries.map((entry) => `
        <div class="character-builder-class-row">
          <span>${escapeHtml(entry.name || cleanRefName(entry.classRef))}</span>
          <strong>${escapeHtml(entry.levels)} level${Number(entry.levels) === 1 ? "" : "s"}</strong>
          <small>${escapeHtml(toArray(entry.characterLevels).length ? `Character levels ${entry.characterLevels.join(", ")}` : entry.classRef)}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function renderWarningList(warnings = []) {
  const entries = toArray(warnings);
  if (!entries.length) {
    return `<p class="character-builder-empty">No warnings.</p>`;
  }

  return `
    <ul class="character-builder-diagnostic-list">
      ${entries.map((warning) => `
        <li>
          <strong>${escapeHtml(formatStatusLabel(warning.code ?? "warning"))}</strong>
          <span>${escapeHtml(warning.message ?? "Warning")}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderPendingList(choices = []) {
  const entries = toArray(choices);
  if (!entries.length) {
    return `<p class="character-builder-empty">No unresolved decisions.</p>`;
  }

  return `
    <ul class="character-builder-diagnostic-list">
      ${entries.map((choice) => {
        const classLabel = choice.classRef ? cleanRefName(choice.classRef) : "";
        const levelLabel = choice.characterLevel ? `Level ${choice.characterLevel}` : "";
        const sourceLabel = choice.sourceName || choice.sourceRef || "";
        const context = [levelLabel, classLabel, sourceLabel].filter(Boolean).join(" | ");
        return `
          <li>
            <strong>${escapeHtml(titleCase(choice.type || "decision"))}</strong>
            <span>${escapeHtml(context || choice.choiceId || "Builder choice")}</span>
            ${choice.blockedReason ? `<small>${escapeHtml(choice.blockedReason)}</small>` : ""}
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function createDecisionItem({ key, label, detail = "", level = "", blocked = false, resolved = false } = {}) {
  const status = getRequiredChoiceStatus({
    blocked,
    required: true,
    resolved
  });

  return {
    key: key || `${level}-${label}-${detail}`,
    label,
    detail,
    level,
    status
  };
}

function getOutstandingDecisionModel(snapshot = {}) {
  const summary = snapshot.builderSummary ?? {};
  const levels = toArray(summary.levelTimeline);
  const all = [];
  const outstanding = [];
  const seen = new Set();

  const add = (item) => {
    if (seen.has(item.key)) {
      return;
    }

    seen.add(item.key);
    all.push(item);
    if (item.status.label !== "Complete") {
      outstanding.push(item);
    }
  };

  for (const requirement of toArray(summary.identityChoiceRequirements)) {
    const definition = requirement.definition ?? {};
    if (definition.required === false) {
      continue;
    }

    const scope = requirement.scope === "background" ? "Background" : "Ancestry";
    add(createDecisionItem({
      key: requirement.choiceId || definition.choiceId || `${scope}-${definition.label}`,
      label: `${scope}: ${definition.label || definition.choiceId || "Choice"}`,
      detail: requirement.blockedReason || toArray(requirement.matchedValues).join(", ") || definition.prompt || requirement.sourceName || "",
      blocked: Boolean(requirement.blockedReason),
      resolved: Boolean(requirement.resolved)
    }));
  }

  if (levels.some((entry) => Number(entry.characterLevel) === 1)) {
    const abilityScores = summary.abilityScores ?? {};
    add(createDecisionItem({
      key: "level-1-base-ability-scores",
      label: "L1 Base ability scores",
      detail: abilityScores.complete ? formatAbilityScoreSummary(abilityScores) : "Enter six level 1 base scores",
      level: "L1",
      resolved: Boolean(abilityScores.complete)
    }));
  }

  for (const entry of levels) {
    const levelLabel = `L${entry.characterLevel ?? "?"}`;
    for (const requirement of toArray(entry.requirements)) {
      if (requirement.required === false) {
        continue;
      }

      add(createDecisionItem({
        key: requirement.decisionId || `${levelLabel}-${requirement.type}`,
        label: `${levelLabel} ${titleCase(requirement.type || "Decision")}`,
        detail: requirement.blockedReason
          || requirement.reason && titleCase(requirement.reason)
          || requirement.count && `Choose ${requirement.count}`
          || getChoiceSummary(entry, requirement),
        level: levelLabel,
        blocked: requirement.status === "blocked",
        resolved: Boolean(requirement.resolved)
      }));
    }

    for (const choice of toArray(entry.unresolvedChoices)) {
      add(createDecisionItem({
        key: choice.choiceId || `${levelLabel}-${choice.type}`,
        label: `${levelLabel} ${titleCase(choice.type || "Decision")}`,
        detail: choice.blockedReason || choice.choiceId || "Unresolved",
        level: levelLabel,
        blocked: Boolean(choice.blockedReason),
        resolved: false
      }));
    }
  }

  const completed = all.filter((item) => item.status.label === "Complete").length;
  return {
    all,
    completed,
    outstanding,
    total: all.length
  };
}

function renderOutstandingDecisionsPanel(snapshot = {}) {
  const model = getOutstandingDecisionModel(snapshot);
  const visibleOutstanding = model.outstanding.slice(0, 8);
  const hiddenCount = Math.max(0, model.outstanding.length - visibleOutstanding.length);

  return `
    <aside
      class="filter-sidebar character-builder-outstanding-sidebar"
      data-builder-outstanding-sidebar
      data-outstanding-count="${escapeHtml(model.outstanding.length)}"
      aria-label="Outstanding decisions"
    >
      <header class="character-builder-outstanding-header">
        <div>
          <h3>Outstanding decisions</h3>
          <span>${escapeHtml(`${model.outstanding.length} remaining`)}</span>
        </div>
        ${renderBuilderBadge(`${model.completed}/${model.total || 0}`, model.outstanding.length ? "accent" : "success", {
          className: "character-builder-choice-badge",
          title: "Completed required decisions"
        })}
      </header>
      ${visibleOutstanding.length
        ? `
          <ul class="character-builder-outstanding-list">
            ${visibleOutstanding.map((item) => `
              <li class="${escapeHtml(item.status.className)}">
                <span>${renderRequiredChoiceBadge(item.status)}</span>
                <div>
                  <strong>${escapeHtml(item.label)}</strong>
                  ${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}
                </div>
              </li>
            `).join("")}
          </ul>
          ${hiddenCount ? `<p class="character-builder-outstanding-more">${escapeHtml(`+${hiddenCount} more`)}</p>` : ""}
        `
        : `<p class="character-builder-empty character-builder-empty-compact">All required decisions resolved.</p>`}
      <footer class="character-builder-outstanding-total">Total: ${escapeHtml(model.completed)} / ${escapeHtml(model.total || 0)}</footer>
    </aside>
  `;
}

function renderLoadIssueList(issues = []) {
  const entries = toArray(issues);
  if (!entries.length) {
    return `<p class="character-builder-empty">No load issues.</p>`;
  }

  return `
    <ul class="character-builder-diagnostic-list">
      ${entries.map((issue) => `
        <li>
          <strong>${escapeHtml(titleCase(issue.type || "resource"))}</strong>
          <span>${escapeHtml(issue.message || issue.reason || "unavailable")}</span>
          ${issue.url ? `<small>${escapeHtml(issue.url)}</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderPersistenceResourceList(resources = []) {
  const entries = toArray(resources);
  if (!entries.length) {
    return `<p class="character-builder-empty character-builder-empty-compact">No persistence resources.</p>`;
  }

  return `
    <ul class="character-builder-level-list-small">
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

function renderExportFileList(files = []) {
  const entries = toArray(files);
  if (!entries.length) {
    return `<p class="character-builder-empty character-builder-empty-compact">No export files prepared.</p>`;
  }

  return `
    <ul class="character-builder-level-list-small">
      ${entries.map((file) => `
        <li>
          <strong>${escapeHtml(file.label || titleCase(file.kind || "file"))}</strong>
          <span>${escapeHtml(file.fileName || "export.json")}</span>
          ${file.byteLength ? `<small>${escapeHtml(file.byteLength)} bytes</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderPersistencePanel(snapshot = {}) {
  const saveResult = snapshot.lastSaveResult;
  const exportResult = snapshot.lastExportResult;
  const exportOnly = isExportOnlyPersistence(snapshot);

  if (exportOnly) {
    return `
      <article class="character-builder-panel character-builder-panel-wide">
        <div class="character-builder-panel-heading">
          <h3>Persistence</h3>
          <span>${escapeHtml(formatStatusLabel(exportResult?.status || "idle"))}</span>
        </div>
        <div class="character-builder-persistence-list">
          <section>
            <div class="character-builder-persistence-heading">
              <strong>Export Draft</strong>
              <span>${escapeHtml(formatStatusLabel(exportResult?.status || "idle"))}</span>
            </div>
            <p>${escapeHtml(exportResult?.message || "No draft export prepared.")}</p>
            ${exportResult?.downloadResult && !exportResult.downloadResult.ok
              ? `<small>${escapeHtml(formatStatusLabel(exportResult.downloadResult.reason))}</small>`
              : ""}
            ${exportResult ? renderExportFileList(exportResult.files) : ""}
          </section>
        </div>
      </article>
    `;
  }

  return `
    <article class="character-builder-panel character-builder-panel-wide">
      <div class="character-builder-panel-heading">
        <h3>Persistence</h3>
        <span>${escapeHtml(formatStatusLabel(saveResult?.status || exportResult?.status || "idle"))}</span>
      </div>
      <div class="character-builder-persistence-list">
        <section>
          <div class="character-builder-persistence-heading">
            <strong>Save</strong>
            <span>${escapeHtml(formatStatusLabel(saveResult?.status || "idle"))}</span>
          </div>
          <p>${escapeHtml(saveResult?.message || "No save attempted.")}</p>
          ${saveResult ? renderPersistenceResourceList(saveResult.resources) : ""}
        </section>
        <section>
          <div class="character-builder-persistence-heading">
            <strong>Export</strong>
            <span>${escapeHtml(formatStatusLabel(exportResult?.status || "idle"))}</span>
          </div>
          <p>${escapeHtml(exportResult?.message || "No export prepared.")}</p>
          ${exportResult?.downloadResult && !exportResult.downloadResult.ok
            ? `<small>${escapeHtml(formatStatusLabel(exportResult.downloadResult.reason))}</small>`
            : ""}
          ${exportResult ? renderExportFileList(exportResult.files) : ""}
        </section>
      </div>
    </article>
  `;
}

function getDecisionByType(entry, type) {
  return toArray(entry?.decisions).find((decision) => decision.type === type) ?? null;
}

function getDecisionValues(entry, type) {
  return toArray(entry?.decisions)
    .filter((decision) => decision.type === type)
    .flatMap((decision) => {
      const value = decision.value;
      if (Array.isArray(value)) {
        return value;
      }

      if (value && typeof value === "object") {
        const pluralKey = `${type}s`;
        if (Array.isArray(value[pluralKey])) {
          return value[pluralKey];
        }

        if (Array.isArray(value.picks)) {
          return value.picks;
        }

        return value[type] ? [value[type]] : [];
      }

      return value == null || value === "" ? [] : [value];
    })
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function getPickDecisionText(entry, type) {
  return getDecisionValues(entry, type).join(", ");
}

function getSubclassDecisionValue(entry) {
  const decision = getDecisionByType(entry, "subclass");
  const value = String(decision?.value ?? "").trim();
  const requirement = toArray(entry?.requirements).find((item) => item.type === "subclass");
  const option = findOptionByRef(requirement?.options, value);
  return option?.name || option?.shortName || value;
}

function getFeatDecisionValue(entry) {
  const decision = getDecisionByType(entry, "feat");
  const value = decision?.value;
  if (value && typeof value === "object") {
    return String(value.ref || value.feat || value.name || "").trim();
  }

  return String(value ?? "").trim();
}

function getAsiDecisionText(entry) {
  return getAsiDecisionIncreases(entry)
    .map((increase) => {
      const ability = String(increase?.ability ?? "").toLowerCase();
      const amount = Number(increase?.amount ?? 0);
      if (!ABILITY_LABELS[ability] || !Number.isFinite(amount) || amount === 0) {
        return "";
      }

      return `${ABILITY_LABELS[ability]} ${amount > 0 ? "+" : ""}${amount}`;
    })
    .filter(Boolean)
    .join(", ");
}

function getAsiDecisionIncreases(entry) {
  const decision = getDecisionByType(entry, "asi");
  const byAbility = new Map();
  for (const rawIncrease of toArray(decision?.value?.increases)) {
    const ability = String(rawIncrease?.ability ?? rawIncrease ?? "").toLowerCase();
    const amount = rawIncrease && typeof rawIncrease === "object"
      ? Number(rawIncrease.amount ?? 1)
      : 1;
    if (!ABILITY_LABELS[ability] || !Number.isFinite(amount) || amount === 0) {
      continue;
    }

    const existing = byAbility.get(ability);
    byAbility.set(ability, existing
      ? { ...existing, amount: existing.amount + amount }
      : { ability, amount });
  }

  return [...byAbility.values()];
}

function getOptionValue(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.ref || option?.value || option?.sourceId || option?.name || option?.shortName || option?.label || "";
}

function normalizeComparable(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getAncestryNameSearchText(entity = {}) {
  return [
    entity.name,
    entity.displayName,
    entity.raceName,
    entity.subraceName,
    entity.shortName
  ].map(normalizeComparable).filter(Boolean).join(" ");
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function getChoiceSummary(entry, requirement) {
  const type = String(requirement?.type ?? "");

  if (type === "subclass") {
    return getSubclassDecisionValue(entry) || "Choose subclass";
  }

  if (type === "feat") {
    return getFeatDecisionValue(entry) || "Choose feat";
  }

  if (INLINE_PICK_TYPES.has(type)) {
    return getPickDecisionText(entry, type) || `${titleCase(type)} picks`;
  }

  if (type === "asi") {
    return getAsiDecisionText(entry) || "Assign increases";
  }

  return "Edit";
}

function getOverlayLauncherType(requirementType) {
  return requirementType === "asi" ? "asi" : requirementType;
}

function formatDecisionValue(value) {
  if (value == null || value === "") {
    return "Unassigned";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatDecisionValue).join(", ");
  }

  if (Array.isArray(value.increases)) {
    const byAbility = new Map();
    for (const rawIncrease of value.increases) {
      const ability = String(rawIncrease?.ability ?? rawIncrease ?? "").toLowerCase();
      const amount = rawIncrease && typeof rawIncrease === "object"
        ? Number(rawIncrease.amount ?? 1)
        : 1;
      if (!ABILITY_LABELS[ability] || !Number.isFinite(amount) || amount === 0) {
        continue;
      }

      const existing = byAbility.get(ability);
      byAbility.set(ability, existing
        ? { ...existing, amount: existing.amount + amount }
        : { ability, amount });
    }

    const formatted = [...byAbility.values()]
      .map((increase) => {
        const ability = ABILITY_LABELS[String(increase?.ability ?? "").toLowerCase()] ?? String(increase?.ability ?? "").toUpperCase();
        const amount = Number(increase?.amount ?? 0);
        return ability && Number.isFinite(amount)
          ? `${ability} ${amount > 0 ? "+" : ""}${amount}`
          : "";
      })
      .filter(Boolean);
    return formatted.join(", ") || "Ability score increase";
  }

  for (const key of ["feat", "spell", "skill", "tool", "language", "specialty", "deity", "instrument"]) {
    if (value[key]) {
      return String(value[key]);
    }
  }

  for (const key of ["skills", "tools", "languages", "spells", "picks"]) {
    if (Array.isArray(value[key])) {
      return value[key].map(formatDecisionValue).join(", ");
    }
  }

  return JSON.stringify(value);
}

function renderDecisionList(decisions = [], entry = {}) {
  const entries = toArray(decisions);
  if (!entries.length) {
    return `<p class="character-builder-empty character-builder-empty-compact">No resolved decisions.</p>`;
  }

  return `
    <ul class="character-builder-level-list-small">
      ${entries.map((decision) => `
        <li>
          <strong>${escapeHtml(titleCase(decision.type || "decision"))}</strong>
          <span>${escapeHtml(decision.type === "subclass"
            ? getSubclassDecisionValue({ ...entry, decisions: [decision] })
            : formatDecisionValue(decision.value))}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function optionMatchesSelected(option, selectedValue) {
  const selected = String(selectedValue ?? "").trim().toLowerCase();
  if (!selected) {
    return false;
  }

  if (typeof option === "string") {
    return option.trim().toLowerCase() === selected;
  }

  return [
    option?.value,
    option?.ref,
    option?.sourceId,
    option?.name,
    option?.shortName,
    option?.label
  ].some((value) => String(value ?? "").trim().toLowerCase() === selected);
}

function formatOptionLabel(option) {
  if (typeof option === "string") {
    return cleanRefName(option);
  }

  const name = option?.label || option?.name || option?.shortName || cleanRefName(option?.ref || option?.value);
  const source = option?.source ? ` (${option.source})` : "";
  const blocked = option?.blocked ? " [blocked]" : "";
  return `${name}${source}${blocked}`;
}

function renderRuleOptions(options = [], selectedValue = "", emptyLabel = "Choose") {
  const entries = toArray(options);

  return `
    <option value="">${escapeHtml(emptyLabel)}</option>
    ${entries.map((option) => {
      const value = getOptionValue(option);
      const selected = optionMatchesSelected(option, selectedValue) ? " selected" : "";
      const disabled = option.blocked ? " disabled" : "";
      return `<option value="${escapeHtml(value)}"${selected}${disabled}>${escapeHtml(formatOptionLabel(option))}</option>`;
    }).join("")}
  `;
}

function renderClassOptions(classOptions = [], selectedRef = "") {
  return renderRuleOptions(classOptions, selectedRef, "Choose class");
}

function renderClassSelect(entry, classOptions = []) {
  return `
    <label class="character-builder-field">
      <span>Class</span>
      <select
        data-builder-field="level-class"
        data-character-level="${escapeHtml(entry.characterLevel)}"
        ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getLevelClassFocusKey(entry.characterLevel))}"
        aria-label="Class for level ${escapeHtml(entry.characterLevel)}"
      >
        ${renderClassOptions(classOptions, entry.classRef)}
      </select>
    </label>
  `;
}

function renderRequirementControl(entry, requirement) {
  const type = String(requirement?.type ?? "");
  const level = entry.characterLevel;

  if (!["subclass", "feat", "asi"].includes(type) && !INLINE_PICK_TYPES.has(type)) {
    return "";
  }

  const summary = getChoiceSummary(entry, requirement);
  return `
    <div class="character-builder-guided-launcher">
      <span>${escapeHtml(summary)}</span>
      <button
        type="button"
        class="character-builder-button character-builder-button-compact"
        data-builder-action="open-guided-overlay"
        data-overlay-type="${escapeHtml(getOverlayLauncherType(type))}"
        data-character-level="${escapeHtml(level)}"
        data-decision-type="${escapeHtml(type)}"
        aria-label="Edit ${escapeHtml(titleCase(type))} for level ${escapeHtml(level)}"
      >Edit</button>
    </div>
  `;
}

function formatAbilityScoreSummary(abilityScores = {}) {
  const scores = abilityScores.scores ?? {};
  const filled = Object.entries(ABILITY_LABELS)
    .map(([ability, label]) => {
      const value = scores[ability];
      return Number.isFinite(Number(value)) ? `${label} ${value}` : "";
    })
    .filter(Boolean);

  return filled.length ? filled.join(" | ") : "No base scores entered";
}

function renderAbilityScoreRequirement(abilityScores = {}) {
  const status = abilityScores.complete ? "resolved" : "pending";
  const badge = getRequiredChoiceStatus({
    required: true,
    resolved: Boolean(abilityScores.complete)
  });

  return `
    <div class="character-builder-decision-row character-builder-decision-${escapeHtml(status)} ${escapeHtml(badge.className)}">
      <div>
        ${renderChoiceTitle("Base Ability Scores", badge)}
        <span>${escapeHtml(abilityScores.complete ? "Resolved" : "Pending")}</span>
        <small>${escapeHtml(formatAbilityScoreSummary(abilityScores))}</small>
      </div>
      <div class="character-builder-guided-launcher">
        <span>${escapeHtml(abilityScores.complete ? `${abilityScores.enteredCount ?? 0}/6 entered` : "Enter level 1 base scores")}</span>
        <button
          type="button"
          class="character-builder-button character-builder-button-compact"
          data-builder-action="open-guided-overlay"
          data-overlay-type="abilities"
          data-character-level="1"
          aria-label="Edit level 1 base ability scores"
        >Edit</button>
      </div>
    </div>
  `;
}

function renderRequirementRows(entry, abilityScores = null) {
  const requirements = toArray(entry.requirements);
  const rows = [
    Number(entry.characterLevel) === 1 ? renderAbilityScoreRequirement(abilityScores ?? {}) : "",
    ...requirements.map((requirement) => {
      const status = requirement.resolved
        ? "resolved"
        : requirement.status === "blocked"
          ? "blocked"
          : "pending";
      const badge = getRequiredChoiceStatus({
        blocked: status === "blocked",
        recommended: Boolean(requirement.recommended),
        required: requirement.required !== false,
        resolved: status === "resolved"
      });
      const detail = [
        requirement.count ? `Pick ${requirement.count}` : "",
        requirement.reason ? titleCase(requirement.reason) : "",
        requirement.blockedReason || ""
      ].filter(Boolean).join(" | ");

      return `
        <div class="character-builder-decision-row character-builder-decision-${escapeHtml(status)} ${escapeHtml(badge.className)}">
          <div>
            ${renderChoiceTitle(titleCase(requirement.type || "decision"), badge)}
            <span>${escapeHtml(status === "resolved" ? "Resolved" : status === "blocked" ? "Blocked" : "Pending")}</span>
            ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
          </div>
          ${renderRequirementControl(entry, requirement)}
        </div>
      `;
    })
  ].filter(Boolean);

  if (!rows.length) {
    return `<p class="character-builder-empty character-builder-empty-compact">No required decisions.</p>`;
  }

  return `
    <div class="character-builder-decision-stack">
      ${rows.join("")}
    </div>
  `;
}

function renderFeatureList(entry) {
  const features = [...toArray(entry.classFeatures), ...toArray(entry.subclassFeatures)];
  if (!features.length) {
    return `<p class="character-builder-empty character-builder-empty-compact">No features granted.</p>`;
  }

  return `
    <ul class="character-builder-feature-list">
      ${features.map((feature) => `
        <li
          class="${feature.blocked ? "character-builder-feature-blocked" : ""}"
          ${renderBuilderRuleDetailAttributes(feature, { title: feature.name || "Feature", kind: "Feature" })}
          role="button"
          tabindex="0"
        >
          <strong>${renderBuilderRuleDetailButton(feature.name || "Feature", feature, { kind: "Feature" })}</strong>
          <span>${escapeHtml(feature.source || cleanRefName(feature.ref))}</span>
          ${feature.blockedReason ? `<small>${escapeHtml(feature.blockedReason)}</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderUnresolvedList(entry) {
  const unresolvedRequirements = toArray(entry.requirements)
    .filter((requirement) => requirement.required && !requirement.resolved)
    .map((requirement) => ({
      key: requirement.decisionId || `${requirement.type}-${requirement.characterLevel}`,
      label: titleCase(requirement.type || "decision"),
      detail: requirement.blockedReason || `Missing ${requirement.type} choice`
    }));
  const unresolvedChoices = toArray(entry.unresolvedChoices)
    .map((choice) => ({
      key: choice.choiceId || `${choice.type}-${choice.characterLevel}`,
      label: titleCase(choice.type || "decision"),
      detail: choice.blockedReason || choice.choiceId || "Unresolved"
    }));
  const seen = new Set();
  const entries = [...unresolvedRequirements, ...unresolvedChoices].filter((item) => {
    if (seen.has(item.key)) {
      return false;
    }

    seen.add(item.key);
    return true;
  });

  if (!entries.length) {
    return `<p class="character-builder-empty character-builder-empty-compact">No unresolved items.</p>`;
  }

  return `
    <ul class="character-builder-level-list-small">
      ${entries.map((item) => `
        <li>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.detail)}</span>
        </li>
      `).join("")}
    </ul>
  `;
}

function getLevelTone(entry) {
  const unresolved = toArray(entry.requirements).some((requirement) => requirement.required && !requirement.resolved)
    || toArray(entry.unresolvedChoices).length > 0;
  const blocked = toArray(entry.requirements).some((requirement) => requirement.status === "blocked")
    || toArray(entry.unresolvedChoices).some((choice) => choice.blockedReason);

  if (blocked) {
    return "danger";
  }

  if (!entry.classRef || unresolved) {
    return "warning";
  }

  return "good";
}

function renderAddLevelControls(classOptions = []) {
  const disabled = toArray(classOptions).length ? "" : " disabled";
  return `
    <div class="character-builder-add-level">
      <label class="character-builder-field">
        <span>Add Level</span>
        <select
          data-builder-field="new-level-class"
          ${RENDER_FOCUS_KEY_ATTRIBUTE}="${ADD_LEVEL_CLASS_FOCUS_KEY}"
          aria-label="Class for new level"${disabled}
        >
          ${renderClassOptions(classOptions)}
        </select>
      </label>
      <button
        type="button"
        class="character-builder-button"
        data-builder-action="add-level"
        ${RENDER_FOCUS_KEY_ATTRIBUTE}="${ADD_LEVEL_FOCUS_KEY}"${disabled}
      >Add</button>
    </div>
  `;
}

function renderAbilityScoreButton() {
  return `
    <button
      type="button"
      class="character-builder-button character-builder-button-compact"
      data-builder-action="open-guided-overlay"
      data-overlay-type="abilities"
      aria-label="Edit level 1 manual ability scores"
    >Edit Scores</button>
  `;
}

function renderAbilityImpactHeaderCells() {
  return ABILITY_ORDER.map((ability) => `<th scope="col">${escapeHtml(ABILITY_LABELS[ability])}</th>`).join("");
}

function renderAbilityImpactCell(row, ability) {
  const value = Number(row?.values?.[ability] ?? 0);
  return row?.kind === "delta"
    ? `<td>${escapeHtml(formatSignedAmount(value))}</td>`
    : `<td>${escapeHtml(Number.isFinite(value) ? value : 0)}</td>`;
}

function renderAbilityImpactRow(row = {}) {
  return `
    <tr data-ability-impact-row="${escapeHtml(row.id)}">
      <th scope="row">
        <span>${escapeHtml(row.label)}</span>
        <small>${escapeHtml(row.summary)}</small>
      </th>
      ${ABILITY_ORDER.map((ability) => renderAbilityImpactCell(row, ability)).join("")}
    </tr>
  `;
}

function renderAbilityImpactPreview(preview = null) {
  if (!preview) {
    return "";
  }

  const accepted = Boolean(preview.acceptedForExport);
  const ancestryMeta = [
    preview.selectedAncestry?.name,
    preview.selectedAncestry?.source ? `Source ${preview.selectedAncestry.source}` : "",
    preview.selectedAncestry?.page ? `p.${preview.selectedAncestry.page}` : ""
  ].filter(Boolean).join(" | ") || "No selected ancestry";

  return `
    <section
      class="character-builder-ability-preview"
      data-ability-impact-preview
      data-builder-ability-preview="true"
      aria-labelledby="character-builder-ability-preview-title"
    >
      <header class="character-builder-ability-preview-header">
        <div>
          <p>Before Export</p>
          <h3 id="character-builder-ability-preview-title">Ability Score Preview</h3>
        </div>
        <span>${escapeHtml(preview.characterId || "new")}</span>
      </header>

      <div class="character-builder-ability-preview-table-wrap">
        <table class="character-builder-ability-preview-table">
          <thead>
            <tr>
              <th scope="col">Source</th>
              ${renderAbilityImpactHeaderCells()}
            </tr>
          </thead>
          <tbody>
            ${toArray(preview.rows).map(renderAbilityImpactRow).join("")}
          </tbody>
        </table>
      </div>

      <div class="character-builder-ability-preview-details" data-ability-impact-ancestry>
        <div>
          <h4>Ancestry Ability Grants</h4>
          <p>${escapeHtml(ancestryMeta)}</p>
        </div>
        <strong>${escapeHtml(preview.selectedAncestry?.abilitySummary ?? "No ability impact")}</strong>
        <small>${escapeHtml(`Base ${formatAbilityScoreLine(preview.baseScores, { separator: " | " })} | Final ${formatAbilityScoreLine(preview.finalScores, { separator: " | " })}`)}</small>
      </div>

      <footer
        class="character-builder-ability-preview-verdict ${accepted ? "is-accepted" : "is-blocked"}"
        data-ability-impact-export-verdict="${accepted ? "accepted" : "blocked"}"
      >
        <strong>${escapeHtml(accepted ? "Export Accepted" : "Export Needs Review")}</strong>
        <span>${escapeHtml(preview.explanation || "")}</span>
      </footer>
    </section>
  `;
}

function renderIdentityChoicesPanel(requirements = []) {
  const entries = toArray(requirements);
  if (!entries.length) {
    return "";
  }

  return `
    <article class="character-builder-panel character-builder-panel-wide" data-builder-identity-choices-panel>
      <div class="character-builder-panel-heading">
        <h3>Required Identity Choices</h3>
        <span>${escapeHtml(entries.length)}</span>
      </div>
      <div class="character-builder-identity-choice-panel-body">
        ${entries.map((requirement) => {
          const definition = requirement.definition ?? {};
          const status = requirement.resolved ? "resolved" : requirement.blockedReason ? "blocked" : "pending";
          const badge = getRequiredChoiceStatus({
            blocked: Boolean(requirement.blockedReason),
            recommended: Boolean(definition.recommended),
            required: definition.required !== false,
            resolved: Boolean(requirement.resolved)
          });
          const overlayType = requirement.scope === "background" ? "background" : "ancestry";
          const selected = toArray(requirement.matchedValues).join(", ");
          return `
            <div class="character-builder-identity-choice-row character-builder-choice-${escapeHtml(status)} ${escapeHtml(badge.className)}" data-identity-choice-row>
              <div class="character-builder-identity-choice-copy">
                ${renderChoiceTitle(definition.label || definition.choiceId || "Choice", badge)}
                <p>${escapeHtml(requirement.blockedReason || definition.prompt || requirement.sourceName || "Resolve in the picker modal.")}</p>
                <small>${escapeHtml(selected || `${requirement.sourceName || requirement.sourceRef || "Selected identity"} | ${status}`)}</small>
              </div>
              <button
                type="button"
                class="character-builder-button character-builder-button-compact"
                data-builder-action="open-guided-overlay"
                data-overlay-type="${escapeHtml(overlayType)}"
              >Review ${escapeHtml(overlayType === "background" ? "Background" : "Ancestry")}</button>
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function renderGrantedSpellSourcesPanel(sources = []) {
  const entries = toArray(sources);
  if (!entries.length) {
    return "";
  }

  return `
    <article class="character-builder-panel">
      <div class="character-builder-panel-heading">
        <h3>Granted Spells</h3>
        <span>${escapeHtml(entries.length)}</span>
      </div>
      <div class="character-builder-granted-spell-list">
        ${entries.map((source) => {
          const spellCount = toArray(source.fixedSpells).length + toArray(source.selectedSpells).length;
          const choiceCount = toArray(source.choiceGrants).length;
          const detail = [
            spellCount ? `${spellCount} spell${spellCount === 1 ? "" : "s"}` : "",
            choiceCount ? `${choiceCount} choice${choiceCount === 1 ? "" : "s"}` : ""
          ].filter(Boolean).join(" | ") || "Manual source";

          return `
            <div class="character-builder-granted-spell-row">
              <div>
                <strong>${escapeHtml(source.name || cleanRefName(source.sourceRef))}</strong>
                <span>${escapeHtml(detail)}</span>
                ${source.source ? `<small>${escapeHtml(source.source)}</small>` : ""}
              </div>
              <button
                type="button"
                class="character-builder-button character-builder-button-compact"
                data-builder-action="open-guided-overlay"
                data-overlay-type="granted-spells"
                data-grant-source-ref="${escapeHtml(source.sourceRef)}"
                aria-label="Edit granted spells from ${escapeHtml(source.name || cleanRefName(source.sourceRef))}"
              >Edit</button>
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function formatPickerEntityName(entity, fallback = "Not selected") {
  return entity?.name || entity?.shortName || (entity?.ref ? cleanRefName(entity.ref) : fallback);
}

function formatPickerEntityMeta(entity) {
  const source = entity?.source ? `Source ${entity.source}` : "";
  const page = entity?.page ? `p.${entity.page}` : "";
  return [source, page, entity?.ref ?? ""].filter(Boolean).join(" | ") || "No rule reference";
}

function findOptionByRef(options = [], ref = "") {
  const normalized = normalizeComparable(ref);
  if (!normalized) {
    return null;
  }

  return toArray(options).find((option) => [
    option.ref,
    option.sourceId,
    option.name,
    option.shortName
  ].map(normalizeComparable).includes(normalized)) ?? null;
}

function getAncestryLineageFromOptions(options = [], entity = null) {
  if (!entity) {
    return [];
  }

  const lineage = [];
  const seen = new Set();
  let current = entity;

  while (current?.ref && !seen.has(current.ref)) {
    seen.add(current.ref);
    lineage.unshift(current);
    current = current.parentRef ? findOptionByRef(options, current.parentRef) : null;
  }

  return lineage.length ? lineage : [entity];
}

function getIdentityLineage(type, options = [], entity = null) {
  return type === "ancestry" ? getAncestryLineageFromOptions(options, entity) : toArray(entity ? [entity] : []);
}

function getAbilityRules(entity) {
  return toArray(entity?.ability ?? entity?.grants?.ability);
}

function sumFixedAbilityRules(rules = []) {
  const map = Object.fromEntries(ABILITY_ORDER.map((ability) => [ability, 0]));
  for (const rule of toArray(rules)) {
    if (!isObject(rule) || rule.choose) {
      continue;
    }

    for (const ability of ABILITY_ORDER) {
      const amount = Number(rule[ability] ?? 0);
      if (Number.isFinite(amount)) {
        map[ability] += amount;
      }
    }
  }

  return map;
}

function formatAbilityChoice(rule) {
  if (!isObject(rule?.choose)) {
    return "";
  }

  const patterns = toArray(rule.choose.patterns)
    .map((pattern) => normalizeString(pattern?.label || pattern?.value))
    .filter(Boolean);
  if (patterns.length) {
    return `Choose ability score increases (${patterns.join(" or ")})`;
  }

  const count = Number(rule.choose.count ?? rule.count ?? 1);
  const amount = Number(rule.choose.amount ?? rule.amount ?? 1);
  const options = toArray(rule.choose.from)
    .map((ability) => ABILITY_LABELS[normalizeComparable(ability)] ?? String(ability).toUpperCase())
    .join(", ");

  return `Choose ${Number.isFinite(count) ? count : 1} ability increase${count === 1 ? "" : "s"} ${formatSignedAmount(Number.isFinite(amount) ? amount : 1)}${options ? ` from ${options}` : ""}`;
}

function getIdentityChoiceDefinitions(type, options = [], entity = null) {
  const byId = new Map();
  for (const entry of getIdentityLineage(type, options, entity)) {
    for (const definition of toArray(entry?.choiceDefinitions)) {
      const id = definition.choiceId || definition.id || `${definition.type}-${byId.size}`;
      if (!byId.has(id)) {
        byId.set(id, definition);
      }
    }
  }

  return [...byId.values()];
}

function titleCaseChoice(value) {
  return String(value ?? "")
    .trim()
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/'S\b/g, "'s");
}

function formatCollectionGrant(label, grant = {}) {
  const fixed = toArray(grant.fixed).map(titleCaseChoice).filter(Boolean);
  const choices = toArray(grant.choices).map((choice) => {
    const count = Number(choice.count ?? 1);
    const options = toArray(choice.from).map(titleCaseChoice).join(", ");
    return `choose ${Number.isFinite(count) ? count : 1}${options ? ` from ${options}` : ""}`;
  });
  const parts = [...fixed, ...choices];

  return parts.length ? `${label}: ${parts.join(", ")}` : "";
}

function mergeIdentityGrants(entities = []) {
  const merged = {};
  for (const collection of ["skills", "tools", "languages", "skillToolLanguages", "feats"]) {
    merged[collection] = {
      fixed: [],
      choices: []
    };
  }

  for (const entity of toArray(entities)) {
    for (const collection of Object.keys(merged)) {
      merged[collection].fixed.push(...toArray(entity?.grants?.[collection]?.fixed));
      merged[collection].choices.push(...toArray(entity?.grants?.[collection]?.choices));
    }
  }

  for (const collection of Object.keys(merged)) {
    merged[collection].fixed = [...new Set(merged[collection].fixed)];
  }

  return merged;
}

function formatIdentityMechanics(type, options = [], entity = null) {
  if (!entity) {
    return ["No option selected."];
  }

  const lineage = getIdentityLineage(type, options, entity);
  const definitions = getIdentityChoiceDefinitions(type, options, entity);
  const grants = mergeIdentityGrants(lineage);
  const mechanics = [];

  if (type === "ancestry") {
    const abilityRules = lineage.flatMap(getAbilityRules);
    mechanics.push(`Ability: ${formatAbilityDeltaMap(sumFixedAbilityRules(abilityRules), "No fixed ability changes")}`);
    mechanics.push(...abilityRules.map(formatAbilityChoice).filter(Boolean).map((line) => `Ability: ${line}`));
  }

  mechanics.push(
    formatCollectionGrant("Skills", grants.skills),
    formatCollectionGrant("Tools", grants.tools),
    formatCollectionGrant("Languages", grants.languages),
    formatCollectionGrant("Skill/Tool/Language", grants.skillToolLanguages),
    formatCollectionGrant("Feats", grants.feats)
  );

  mechanics.push(definitions.length
    ? `Choices: ${definitions.map((definition) => {
        const count = Number(definition.count ?? 1);
        return `${definition.label || titleCaseChoice(definition.type || "Choice")} pick ${Number.isFinite(count) ? count : 1}`;
      }).join(", ")}`
    : "Choices: None");

  return mechanics.filter(Boolean);
}

function getIdentitySearchText(type, options = [], entity = null) {
  if (type === "ancestry") {
    return getAncestryNameSearchText(entity);
  }

  const lineage = getIdentityLineage(type, options, entity);
  return [
    entity?.name,
    entity?.shortName,
    entity?.source,
    entity?.ref,
    ...formatIdentityMechanics(type, options, entity),
    cleanRulesText(getCanonicalRulesContent(entity, lineage.filter((entry) => entry?.ref !== entity?.ref)).entries)
  ].join(" ").toLowerCase();
}

function getIdentityPickerConfig(type) {
  return type === "background"
    ? {
        label: "Background",
        title: "Choose Background",
        selectedRefKey: "background",
        optionsKey: "backgrounds",
        scope: "background",
        placeholder: "archaeologist"
      }
    : {
        label: "Ancestry",
        title: "Choose Ancestry",
        selectedRefKey: "ancestry",
        optionsKey: "ancestries",
        scope: "race",
        placeholder: "human"
      };
}

function createIdentityPickerModel(snapshot = {}, type = "ancestry") {
  const config = getIdentityPickerConfig(type);
  const options = toArray(snapshot.builderOptions?.[config.optionsKey]);
  const summary = snapshot.builderSummary ?? {};
  const selectedRef = summary[config.selectedRefKey]?.ref ?? "";
  const overlay = snapshot.uiState?.guidedOverlay ?? {};
  const filters = {
    query: overlay.query ?? "",
    source: overlay.source ?? "",
    choiceFilter: overlay.choiceFilter ?? "any"
  };
  const query = normalizeComparable(filters.query);
  const source = normalizeComparable(filters.source);
  const filtered = options.filter((entity) => {
    const definitions = getIdentityChoiceDefinitions(type, options, entity);
    const matchesQuery = !query || getIdentitySearchText(type, options, entity).includes(query);
    const matchesSource = !source || normalizeComparable(entity.source) === source;
    const matchesChoices = filters.choiceFilter === "any"
      || (filters.choiceFilter === "with" && definitions.length > 0)
      || (filters.choiceFilter === "without" && definitions.length === 0);

    return matchesQuery && matchesSource && matchesChoices;
  });
  const focusedRef = findOptionByRef(filtered, overlay.focusedRef)?.ref
    || findOptionByRef(filtered, selectedRef)?.ref
    || filtered[0]?.ref
    || selectedRef;
  const focusedEntity = findOptionByRef(options, focusedRef);
  const lineage = getIdentityLineage(type, options, focusedEntity);
  const sources = [...new Set(options.map((entity) => entity.source).filter(Boolean))].sort();
  const requirements = toArray(summary.identityChoiceRequirements)
    .filter((requirement) => requirement.scope === config.scope && requirement.sourceRef === focusedEntity?.ref);

  return {
    type,
    ...config,
    options,
    selectedRef,
    focusedRef,
    focusedEntity,
    fallbackEntities: lineage.filter((entry) => entry?.ref !== focusedEntity?.ref),
    results: filtered,
    sources,
    filters,
    mechanics: formatIdentityMechanics(type, options, focusedEntity),
    choiceDefinitions: getIdentityChoiceDefinitions(type, options, focusedEntity),
    requirements
  };
}

function renderPickerSourceFilter(model = {}) {
  return `
    <label class="character-builder-picker-filter">
      <span>Source</span>
      <select
        data-builder-picker-field="source"
        ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getPickerFieldFocusKey("source"))}"
      >
        <option value="">Any</option>
        ${toArray(model.sources).map((source) => `
          <option value="${escapeHtml(source)}" ${source === model.filters?.source ? "selected" : ""}>${escapeHtml(source)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderIdentityChoiceFilter(model = {}) {
  const selected = model.filters?.choiceFilter || "any";

  return `
    <label class="character-builder-picker-filter">
      <span>Has choices</span>
      <select
        data-builder-picker-field="choiceFilter"
        ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getPickerFieldFocusKey("choiceFilter"))}"
      >
        ${[
          ["any", "Any"],
          ["with", "Yes"],
          ["without", "No"]
        ].map(([value, label]) => `
          <option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderIdentityPickerResult(entity = {}, model = {}) {
  const active = entity.ref === model.focusedRef;
  const selected = entity.ref === model.selectedRef;
  const choiceCount = Number.isFinite(Number(entity.choiceCount))
    ? Number(entity.choiceCount)
    : getIdentityChoiceDefinitions(model.type, model.options, entity).length;

  return `
    <button
      type="button"
      class="character-builder-picker-result${active ? " is-active" : ""}"
      data-builder-action="focus-picker-result"
      data-picker-focused-ref="${escapeHtml(entity.ref)}"
      ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getPickerResultFocusKey(entity.ref))}"
      aria-pressed="${active ? "true" : "false"}"
    >
      <span>
        <strong>${escapeHtml(formatPickerEntityName(entity))}</strong>
        <small>${escapeHtml([entity.source, entity.page ? `p.${entity.page}` : ""].filter(Boolean).join(" | "))}</small>
      </span>
      ${selected ? `<em>Selected</em>` : ""}
      ${choiceCount ? `<i>${escapeHtml(`${choiceCount} choice${choiceCount === 1 ? "" : "s"}`)}</i>` : ""}
    </button>
  `;
}

function getIdentityChoiceValue(option = {}) {
  if (typeof option === "string") {
    return option;
  }

  return option.value || option.ref || option.sourceId || option.name || option.label || "";
}

function getIdentityChoiceLabel(option = {}) {
  if (typeof option === "string") {
    return titleCaseChoice(option);
  }

  return option.label || option.name || option.shortName || titleCaseChoice(getIdentityChoiceValue(option));
}

function getRequirementForDefinition(requirements = [], definition = {}) {
  const id = definition.choiceId || definition.id;
  return toArray(requirements).find((requirement) => (
    requirement.definition?.choiceId === id
    || requirement.definition?.id === id
  )) ?? null;
}

function getSavedChoiceForDefinition(savedChoices = [], definition = {}) {
  const id = definition.choiceId || definition.id;
  return toArray(savedChoices).find((choice) => choice.choiceId === id) ?? null;
}

function getAbilityPatternDefinitions(definition = {}) {
  return toArray(definition.patterns)
    .map((pattern) => ({
      ...pattern,
      value: normalizeString(pattern.value),
      groups: toArray(pattern.groups)
    }))
    .filter((pattern) => pattern.value && pattern.groups.length);
}

function getSavedAbilityPattern(savedChoice = null, definition = {}) {
  const patterns = getAbilityPatternDefinitions(definition);
  const savedPattern = normalizeString(savedChoice?.value?.pattern);
  return patterns.find((pattern) => pattern.value === savedPattern)?.value
    || patterns[0]?.value
    || "";
}

function getSavedAbilityPatternSet(savedChoice = null, patternValue = "", group = {}) {
  const groupId = normalizeString(group.id);
  const amount = Number(group.amount ?? 1);
  return new Set(toArray(savedChoice?.value?.increases)
    .filter((increase) => {
      const increasePattern = normalizeString(increase?.pattern);
      const increaseGroup = normalizeString(increase?.groupId || increase?.group);
      const increaseAmount = Number(increase?.amount ?? 0);
      return (!increasePattern || increasePattern === patternValue)
        && (!increaseGroup || increaseGroup === groupId)
        && (!Number.isFinite(increaseAmount) || increaseAmount === amount);
    })
    .map((increase) => normalizeComparable(increase?.ability))
    .filter(Boolean));
}

function getPositiveChoiceLimit(value, fallback = 1) {
  const count = Number(value ?? fallback);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : fallback;
}

function formatChoiceLimitReason(count) {
  return `Limit reached: choose up to ${count} option${count === 1 ? "" : "s"}.`;
}

function renderDisabledReasonText(reason = "") {
  return reason
    ? `<small class="character-builder-choice-disabled-reason" data-identity-choice-disabled-reason>${escapeHtml(reason)}</small>`
    : `<small class="character-builder-choice-disabled-reason" data-identity-choice-disabled-reason hidden></small>`;
}

function getSelectedOptionCount(options = [], selectedSet = new Set()) {
  return toArray(options).filter((option) => (
    [...selectedSet].some((savedValue) => optionMatchesSelected(option, savedValue))
  )).length;
}

function abilitySelectedInOtherGroup(selectedByGroup = new Map(), currentGroupId = "", ability = "") {
  const normalizedAbility = normalizeComparable(ability);
  if (!normalizedAbility) {
    return false;
  }

  for (const [groupId, selectedSet] of selectedByGroup.entries()) {
    if (groupId !== currentGroupId && selectedSet.has(normalizedAbility)) {
      return true;
    }
  }

  return false;
}

function getSavedChoiceValues(savedChoice = null, definition = {}) {
  const value = savedChoice?.value;
  if (!value) {
    return [];
  }

  if (definition.control === "ability-score-pattern") {
    return toArray(value.increases).map((increase) => increase?.ability).filter(Boolean);
  }

  if (definition.type === "racial-asi") {
    return toArray(value.increases).map((increase) => increase?.ability).filter(Boolean);
  }

  if (definition.type === "feat") {
    return [
      value.ref,
      value.feat,
      ...toArray(value.feats).flatMap((feat) => [feat?.ref, feat?.feat, feat?.name])
    ].filter(Boolean);
  }

  const valueKey = definition.valueKey || definition.type || "choice";
  const pluralKey = valueKey.endsWith("s") ? valueKey : `${valueKey}s`;
  return [
    value[valueKey],
    ...toArray(value[pluralKey]),
    ...toArray(value.picks)
  ].filter(Boolean);
}

function getSelectedFeatOptions(definition = {}, requirement = null) {
  const selectedValues = toArray(requirement?.matchedValues).length
    ? toArray(requirement.matchedValues)
    : getSavedChoiceValues(requirement?.choice, definition);
  return toArray(definition.options)
    .filter((option) => selectedValues.some((value) => optionMatchesSelected(option, value)));
}

function renderIdentityFeatChoiceControl(definition = {}, requirement = null) {
  const id = definition.choiceId || definition.id || definition.label || "choice";
  const label = definition.label || "Feat";
  const prompt = definition.prompt || "Choose a feat.";
  const badge = getRequiredChoiceStatus({
    blocked: Boolean(requirement?.blockedReason || requirement?.unsupported),
    recommended: Boolean(definition.recommended),
    required: definition.required !== false,
    resolved: Boolean(requirement?.resolved)
  });
  const selectedOptions = getSelectedFeatOptions(definition, requirement);
  const selectedValues = selectedOptions
    .map((option) => getIdentityChoiceValue(option))
    .filter(Boolean);
  const selectedLabel = selectedOptions.length
    ? selectedOptions.map((option) => getIdentityChoiceLabel(option)).join(", ")
    : "No feat selected";
  const selectedMeta = selectedOptions
    .map((option) => [option.source, option.page ? `p.${option.page}` : ""].filter(Boolean).join(" | "))
    .filter(Boolean)
    .join("; ");
  const primarySelected = selectedValues[0] ?? "";

  return `
    <article class="character-builder-picker-choice-row ${escapeHtml(badge.className)}" data-identity-feat-choice-row data-identity-choice-id="${escapeHtml(id)}">
      <div class="character-builder-identity-feat-choice-copy">
        ${renderChoiceTitle(label, badge)}
        <small>${escapeHtml(prompt)}</small>
        <p>${escapeHtml(selectedLabel)}</p>
        ${selectedMeta ? `<small>${escapeHtml(selectedMeta)}</small>` : ""}
      </div>
      ${selectedValues.map((value) => `
        <input
          type="hidden"
          data-identity-picker-choice
          data-identity-choice-id="${escapeHtml(id)}"
          name="identity-choice-${escapeHtml(id)}"
          value="${escapeHtml(value)}"
        >
      `).join("")}
      <button
        type="button"
        class="character-builder-button character-builder-button-compact"
        data-builder-action="open-identity-feat-picker"
        data-identity-choice-id="${escapeHtml(id)}"
        data-selected-feat-ref="${escapeHtml(primarySelected)}"
        ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getIdentityFeatPickerLaunchFocusKey(id))}"
      >Choose Feat</button>
    </article>
  `;
}

function createRequirementFromSavedChoice(savedChoices = [], definition = {}) {
  const savedChoice = getSavedChoiceForDefinition(savedChoices, definition);
  return savedChoice
    ? {
        matchedValues: getSavedChoiceValues(savedChoice, definition),
        choice: savedChoice,
        resolved: true
      }
    : null;
}

function renderIdentityPickerAbilityPatternControl(definition = {}, requirement = null) {
  const options = toArray(definition.options);
  const id = definition.choiceId || definition.id || definition.label || "choice";
  const patterns = getAbilityPatternDefinitions(definition);
  const selectedPattern = getSavedAbilityPattern(requirement?.choice, definition);
  const label = definition.label || "Ability Score Increase";
  const prompt = definition.prompt || "Choose ability score increases.";
  const badge = getRequiredChoiceStatus({
    blocked: Boolean(requirement?.blockedReason || requirement?.unsupported),
    recommended: Boolean(definition.recommended),
    required: definition.required !== false,
    resolved: Boolean(requirement?.resolved)
  });

  return `
    <fieldset
      class="character-builder-picker-choice-row character-builder-picker-asi-patterns ${escapeHtml(badge.className)}"
      data-identity-asi-pattern-choice
      data-identity-choice-id="${escapeHtml(id)}"
    >
      <legend>${renderChoiceTitle(label, badge, { tag: "span" })}</legend>
      <small>${escapeHtml(requirement?.blockedReason || prompt)}</small>
      ${patterns.map((pattern) => {
        const isSelectedPattern = pattern.value === selectedPattern;
        const patternGroups = toArray(pattern.groups).map((group) => {
          const groupId = normalizeString(group.id);
          return {
            group,
            groupId,
            limit: getPositiveChoiceLimit(group.count, 1),
            amount: Number(group.amount ?? 1),
            selectedSet: getSavedAbilityPatternSet(requirement?.choice, pattern.value, group)
          };
        });
        const selectedByGroup = new Map(patternGroups.map((groupModel) => [groupModel.groupId, groupModel.selectedSet]));
        return `
          <div
            class="character-builder-picker-asi-pattern ${isSelectedPattern ? "is-selected" : ""}"
            data-identity-asi-pattern
            data-identity-asi-pattern-value="${escapeHtml(pattern.value)}"
            data-identity-asi-pattern-distinct="${pattern.distinct === false ? "false" : "true"}"
          >
            <label class="character-builder-picker-asi-pattern-option">
              <input
                type="radio"
                data-identity-picker-choice
                data-identity-asi-pattern-selector
                data-identity-choice-id="${escapeHtml(id)}"
                name="identity-choice-${escapeHtml(id)}-pattern"
                value="pattern:${escapeHtml(pattern.value)}"
                ${isSelectedPattern ? "checked" : ""}
              >
              <span>${escapeHtml(pattern.label || pattern.value)}</span>
            </label>
            ${pattern.prompt ? `<small>${escapeHtml(pattern.prompt)}</small>` : ""}
            ${patternGroups.map(({ group, groupId, limit, amount: groupAmount, selectedSet }) => {
              return `
                <div
                  class="character-builder-picker-asi-group"
                  data-identity-asi-group
                  data-identity-asi-pattern-value="${escapeHtml(pattern.value)}"
                  data-identity-asi-group-id="${escapeHtml(groupId)}"
                  data-identity-asi-group-count="${escapeHtml(limit)}"
                >
                  <strong>${escapeHtml(group.label || `+${groupAmount} Ability`)}</strong>
                  ${group.prompt ? `<small>${escapeHtml(group.prompt)}</small>` : ""}
                  <div class="character-builder-picker-choice-grid">
                    ${options.map((option) => {
                      const value = getIdentityChoiceValue(option);
                      const token = `${pattern.value}:${groupId}:${value}:${groupAmount}`;
                      const checked = isSelectedPattern && selectedSet.has(normalizeComparable(value));
                      const disabledReason = !isSelectedPattern
                        ? "Inactive ability-score pattern."
                        : !checked && selectedSet.size >= limit
                          ? formatChoiceLimitReason(limit)
                          : !checked && pattern.distinct !== false && abilitySelectedInOtherGroup(selectedByGroup, groupId, value)
                            ? "Already selected in another ability-score group."
                            : "";
                      return `
                        <label ${disabledReason ? `title="${escapeHtml(disabledReason)}"` : ""}>
                          <input
                            type="checkbox"
                            data-identity-picker-choice
                            data-identity-asi-pattern-value="${escapeHtml(pattern.value)}"
                            data-identity-asi-group-id="${escapeHtml(groupId)}"
                            data-identity-asi-group-count="${escapeHtml(limit)}"
                            data-identity-asi-ability="${escapeHtml(value)}"
                            data-identity-asi-amount="${escapeHtml(groupAmount)}"
                            data-identity-choice-id="${escapeHtml(id)}"
                            name="identity-choice-${escapeHtml(id)}-${escapeHtml(pattern.value)}-${escapeHtml(groupId)}"
                            value="${escapeHtml(token)}"
                            ${checked ? "checked" : ""}
                            ${disabledReason ? "disabled" : ""}
                            ${disabledReason ? `title="${escapeHtml(disabledReason)}"` : ""}
                          >
                          <span>${escapeHtml(getIdentityChoiceLabel(option))}</span>
                          ${renderDisabledReasonText(disabledReason)}
                        </label>
                      `;
                    }).join("")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }).join("")}
    </fieldset>
  `;
}

function renderIdentityPickerChoiceControl(definition = {}, requirement = null) {
  const options = toArray(definition.options);
  const id = definition.choiceId || definition.id || definition.label || "choice";
  const selectedSet = new Set(toArray(requirement?.matchedValues).map(normalizeComparable));
  const label = definition.label || titleCaseChoice(definition.type || "Choice");
  const prompt = definition.prompt || `Choose ${Number(definition.count ?? 1)} ${label.toLowerCase()}.`;
  const badge = getRequiredChoiceStatus({
    blocked: Boolean(requirement?.blockedReason || requirement?.unsupported),
    recommended: Boolean(definition.recommended),
    required: definition.required !== false,
    resolved: Boolean(requirement?.resolved)
  });

  if (requirement?.blockedReason || requirement?.unsupported) {
    return `
      <article class="character-builder-picker-choice-row ${escapeHtml(badge.className)}">
        ${renderChoiceTitle(label, badge)}
        <small>${escapeHtml(requirement.blockedReason || prompt)}</small>
        <p>${escapeHtml("This choice cannot be completed from normalized options yet.")}</p>
      </article>
    `;
  }

  if (definition.control === "ability-score-pattern") {
    return renderIdentityPickerAbilityPatternControl(definition, requirement);
  }

  if (definition.type === "feat") {
    return renderIdentityFeatChoiceControl(definition, requirement);
  }

  if (!options.length) {
    return `
      <article class="character-builder-picker-choice-row ${escapeHtml(badge.className)}">
        ${renderChoiceTitle(label, badge)}
        <small>${escapeHtml(prompt)}</small>
        <p>${escapeHtml(toArray(requirement?.matchedValues).join(", ") || "No finite options recorded yet.")}</p>
      </article>
    `;
  }

  if (definition.control === "checkbox" || Number(definition.count ?? 1) > 1) {
    const count = getPositiveChoiceLimit(definition.count, 1);
    const selectedCount = getSelectedOptionCount(options, selectedSet);
    return `
      <fieldset
        class="character-builder-picker-choice-row ${escapeHtml(badge.className)}"
        data-identity-choice-limit-row
        data-identity-choice-id="${escapeHtml(id)}"
        data-identity-choice-count="${escapeHtml(count)}"
      >
        <legend>${renderChoiceTitle(label, badge, { tag: "span" })}</legend>
        <small>${escapeHtml(prompt)}</small>
        <div class="character-builder-picker-choice-grid">
          ${options.map((option) => {
            const value = getIdentityChoiceValue(option);
            const selected = [...selectedSet].some((savedValue) => optionMatchesSelected(option, savedValue));
            const disabledReason = !selected && selectedCount >= count
              ? formatChoiceLimitReason(count)
              : "";
            return `
              <label ${disabledReason ? `title="${escapeHtml(disabledReason)}"` : ""}>
                <input
                  type="checkbox"
                  data-identity-picker-choice
                  data-identity-choice-id="${escapeHtml(id)}"
                  data-identity-choice-count="${escapeHtml(count)}"
                  name="identity-choice-${escapeHtml(id)}"
                  value="${escapeHtml(value)}"
                  ${selected ? "checked" : ""}
                  ${disabledReason ? "disabled" : ""}
                  ${disabledReason ? `title="${escapeHtml(disabledReason)}"` : ""}
                >
                <span>${escapeHtml(getIdentityChoiceLabel(option))}</span>
                ${renderDisabledReasonText(disabledReason)}
              </label>
            `;
          }).join("")}
        </div>
      </fieldset>
    `;
  }

  return `
    <label class="character-builder-picker-choice-row ${escapeHtml(badge.className)}">
      <span>
        ${renderChoiceTitle(label, badge)}
        <small>${escapeHtml(prompt)}</small>
      </span>
      <select
        data-identity-picker-choice
        data-identity-choice-id="${escapeHtml(id)}"
        name="identity-choice-${escapeHtml(id)}"
      >
        <option value="">Choose</option>
        ${options.map((option) => {
          const value = getIdentityChoiceValue(option);
          const selected = [...selectedSet].some((savedValue) => optionMatchesSelected(option, savedValue));
          return `
            <option value="${escapeHtml(value)}" ${selected ? "selected" : ""}>
              ${escapeHtml(getIdentityChoiceLabel(option))}
            </option>
          `;
        }).join("")}
      </select>
    </label>
  `;
}

function renderIdentityPickerChoices(model = {}) {
  const definitions = toArray(model.focusedChoiceDefinitions ?? model.choiceDefinitions);

  return `
    <section class="character-builder-picker-preview-section" data-identity-picker-choices>
      <h3>Choices</h3>
      ${definitions.length
        ? definitions.map((definition) => renderIdentityPickerChoiceControl(
            definition,
            getRequirementForDefinition(model.requirements, definition)
              ?? createRequirementFromSavedChoice(model.savedChoices, definition)
          )).join("")
        : `<p class="character-builder-empty character-builder-empty-compact">None</p>`}
    </section>
  `;
}

function renderIdentityFeatPickerResult(feat = {}, model = {}) {
  const active = feat.ref === model.focusedRef;
  const selected = feat.selected || feat.ref === model.selectedRef;
  const context = model.context || "identity";
  const meta = [
    feat.source ? `Source ${feat.source}` : "",
    feat.page ? `p.${feat.page}` : ""
  ].filter(Boolean).join(" | ");

  return `
    <button
      type="button"
      class="character-builder-picker-result character-builder-feat-picker-result${active ? " is-active" : ""}"
      data-builder-action="focus-identity-feat-result"
      data-identity-feat-ref="${escapeHtml(feat.ref)}"
      data-feat-picker-context="${escapeHtml(context)}"
      data-character-level="${escapeHtml(model.characterLevel ?? "")}"
      ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getIdentityFeatPickerResultFocusKey(feat.ref))}"
      aria-pressed="${active ? "true" : "false"}"
    >
      <span>
        <strong>${escapeHtml(feat.name || cleanRefName(feat.ref))}</strong>
        <small>${escapeHtml(meta || feat.ref || "No feat reference")}</small>
      </span>
      ${selected ? `<em>Selected</em>` : ""}
    </button>
  `;
}

function renderIdentityFeatPickerOverlay(model = {}) {
  const featModel = model.featPickerModel ?? {};
  const focusedFeat = featModel.focusedFeat ?? {};
  const focusedName = focusedFeat.name || cleanRefName(focusedFeat.ref) || "Feat";
  const context = featModel.context || "identity";
  const isLevelContext = context === "level";
  const characterLevel = featModel.characterLevel ?? model.characterLevel ?? "";
  const selectedLabel = featModel.selectedFeat?.name
    || (featModel.selectedRef ? cleanRefName(featModel.selectedRef) : "No feat selected");
  const featMeta = [
    focusedFeat.source ? `Source ${focusedFeat.source}` : "",
    focusedFeat.page ? `p.${focusedFeat.page}` : "",
    focusedFeat.ref ?? ""
  ].filter(Boolean).join(" | ") || "No feat reference";
  const applyDisabled = !focusedFeat.ref;
  const title = model.title || "Choose Feat";
  const eyebrow = model.eyebrow
    || (isLevelContext && characterLevel ? `Level ${characterLevel} Feat` : `${model.label || "Identity"} Feat`);
  const rulesPreview = focusedFeat.fullText || focusedFeat.summary || "No rules preview is recorded for this feat.";

  return renderPickerOverlayShell({
    type: model.type,
    title,
    eyebrow,
    characterLevel,
    selectedValue: isLevelContext ? featModel.focusedRef : model.focusedRef,
    formAttributes: [
      'data-feat-picker-active="true"',
      `data-feat-picker-context="${escapeHtml(context)}"`,
      context === "identity" ? 'data-identity-feat-picker-active="true"' : ""
    ].filter(Boolean).join(" "),
    sidebar: `
      <label class="character-builder-picker-search">
        <span>Search Feats</span>
        <input
          type="search"
          value="${escapeHtml(featModel.filters?.query ?? "")}"
          placeholder="great weapon"
          data-identity-feat-picker-field="query"
          data-feat-picker-context="${escapeHtml(context)}"
          ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getIdentityFeatPickerFieldFocusKey("query"))}"
          autofocus
        >
      </label>
      <div class="character-builder-picker-filter-grid">
        <div class="character-builder-picker-filter">
          <span>Current</span>
          <strong>${escapeHtml(selectedLabel)}</strong>
        </div>
        <label class="character-builder-picker-filter">
          <span>Source</span>
          <select
            data-identity-feat-picker-field="source"
            data-feat-picker-context="${escapeHtml(context)}"
            ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getIdentityFeatPickerFieldFocusKey("source"))}"
          >
            <option value="">Any</option>
            ${toArray(featModel.sources).map((source) => `
              <option value="${escapeHtml(source)}" ${source === featModel.filters?.source ? "selected" : ""}>${escapeHtml(source)}</option>
            `).join("")}
          </select>
        </label>
      </div>
      <div class="character-builder-picker-results" data-builder-picker-results data-identity-feat-picker-results>
        <h3>Feats</h3>
        ${toArray(featModel.results).length
          ? featModel.results.map((feat) => renderIdentityFeatPickerResult(feat, featModel)).join("")
          : `<p class="character-builder-empty character-builder-empty-compact">No matching feats.</p>`}
      </div>
    `,
    preview: `
      <section class="character-builder-picker-preview" data-builder-picker-preview data-identity-feat-picker-preview>
        <header>
          <div>
            <h3>${escapeHtml(focusedName)}</h3>
            <p>${escapeHtml(featMeta)}</p>
          </div>
          ${focusedFeat.ref === featModel.selectedRef ? `<span>Selected</span>` : ""}
        </header>
        <section class="character-builder-picker-preview-section">
          <h3>Rules Preview</h3>
          <p class="character-builder-feat-picker-summary">${escapeHtml(rulesPreview)}</p>
        </section>
        ${focusedFeat.prerequisite ? `
          <section class="character-builder-picker-preview-section">
            <h3>Prerequisite</h3>
            <p class="character-builder-feat-picker-summary">${escapeHtml(focusedFeat.prerequisite)}</p>
          </section>
        ` : ""}
      </section>
    `,
    footer: `
      <button
        type="button"
        class="character-builder-button"
        data-builder-action="close-identity-feat-picker"
        data-feat-picker-context="${escapeHtml(context)}"
      >${isLevelContext ? "Cancel" : "Cancel Feat"}</button>
      <button
        type="button"
        class="character-builder-button character-builder-button-primary"
        data-builder-action="apply-identity-feat-picker"
        data-identity-choice-id="${escapeHtml(featModel.choiceId)}"
        data-identity-feat-ref="${escapeHtml(focusedFeat.ref)}"
        data-feat-picker-context="${escapeHtml(context)}"
        data-character-level="${escapeHtml(characterLevel)}"
        ${applyDisabled ? "disabled" : ""}
      >${isLevelContext ? "Save" : "Use"} ${escapeHtml(focusedName)}</button>
    `
  });
}

function renderIdentityPickerOverlay(snapshot = {}, type = "ancestry") {
  const model = snapshot.uiState?.guidedOverlay?.pickerModel ?? createIdentityPickerModel(snapshot, type);
  const focusedName = formatPickerEntityName(model.focusedEntity, model.label);

  if (model.featPickerModel) {
    return renderIdentityFeatPickerOverlay(model);
  }

  return renderPickerOverlayShell({
    type,
    title: model.title,
    eyebrow: model.label,
    selectedValue: model.focusedRef,
    sidebar: `
      <label class="character-builder-picker-search">
        <span>Search</span>
        <input
          type="search"
          value="${escapeHtml(model.filters.query)}"
          placeholder="${escapeHtml(model.searchPlaceholder ?? model.placeholder)}"
          data-builder-picker-field="query"
          ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getPickerFieldFocusKey("query"))}"
          autofocus
        >
      </label>
      <div class="character-builder-picker-filter-grid">
        ${renderPickerSourceFilter(model)}
        ${renderIdentityChoiceFilter(model)}
      </div>
      <div class="character-builder-picker-results" data-builder-picker-results data-identity-picker-results>
        <h3>Results</h3>
        ${model.results.length
          ? model.results.map((entity) => renderIdentityPickerResult(entity, model)).join("")
          : `<p class="character-builder-empty character-builder-empty-compact">No matching ${escapeHtml(model.label.toLowerCase())} options.</p>`}
      </div>
    `,
    preview: `
      <section class="character-builder-picker-preview" data-builder-picker-preview data-identity-picker-preview>
        <header>
          <div>
            <h3>${escapeHtml(focusedName)}</h3>
            <p>${escapeHtml(formatPickerEntityMeta(model.focusedEntity))}</p>
          </div>
          ${model.focusedEntity?.ref === model.selectedRef ? `<span>Current</span>` : ""}
        </header>
        <section class="character-builder-picker-preview-section" data-identity-picker-mechanics>
          <h3>Mechanical Impact</h3>
          <ul>${toArray(model.focusedMechanics ?? model.mechanics).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
        </section>
        <section class="character-builder-picker-preview-section" data-identity-picker-description>
          <h3>Description</h3>
          ${renderCanonicalRulesText(model.focusedEntity, model.fallbackEntities)}
        </section>
        ${renderIdentityPickerChoices(model)}
      </section>
    `,
    applyLabel: `Use ${focusedName}`
  });
}

function splitSubclassFeatures(features = [], currentClassLevel = 0) {
  const level = Number(currentClassLevel ?? 0);
  return {
    immediateFeatures: toArray(features).filter((feature) => Number(feature.level ?? 0) <= level),
    futureFeatures: toArray(features).filter((feature) => Number(feature.level ?? 0) > level)
  };
}

function groupSubclassFeaturesByLevel(features = []) {
  const groups = new Map();

  for (const feature of toArray(features)) {
    const level = Number(feature?.level ?? 0);
    const key = Number.isFinite(level) && level > 0 ? level : 0;
    groups.set(key, [...(groups.get(key) ?? []), feature]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([level, entries]) => ({
      level,
      features: entries
    }));
}

function normalizeSubclassFeatureTimeline(value = []) {
  const entries = toArray(value);
  if (!entries.length) {
    return [];
  }

  if (entries.some((entry) => Array.isArray(entry?.features))) {
    return entries
      .map((entry) => ({
        level: Number(entry?.level ?? 0),
        features: toArray(entry?.features)
      }))
      .filter((entry) => entry.features.length)
      .sort((left, right) => Number(left.level ?? 0) - Number(right.level ?? 0));
  }

  return groupSubclassFeaturesByLevel(entries);
}

function flattenSubclassFeatureTimeline(value = []) {
  return normalizeSubclassFeatureTimeline(value)
    .flatMap((group) => toArray(group.features));
}

function getSubclassResultFeatures(subclass = {}) {
  const timelineFeatures = flattenSubclassFeatureTimeline(subclass.featureTimeline);
  return timelineFeatures.length ? timelineFeatures : toArray(subclass.featurePreview);
}

function getSubclassSearchText(subclass = {}) {
  const featureSearchEntries = getSubclassResultFeatures(subclass);

  return [
    subclass.name,
    subclass.shortName,
    subclass.source,
    subclass.ref,
    subclass.className,
    ...featureSearchEntries.flatMap((feature) => [feature.name, feature.source, feature.level, feature.fullText, feature.summary])
  ].join(" ").toLowerCase();
}

function createSubclassPickerModel(entry = {}, requirement = {}, overlay = {}) {
  const options = toArray(requirement.options);
  const selectedValue = getSubclassDecisionValue(entry);
  const selected = findOptionByRef(options, selectedValue);
  const selectedRef = selected?.ref ?? selectedValue;
  const filters = {
    query: overlay.query ?? "",
    source: overlay.source ?? "",
    unlockFilter: overlay.unlockFilter ?? "available"
  };
  const query = normalizeComparable(filters.query);
  const source = normalizeComparable(filters.source);
  const filtered = options.filter((subclass) => {
    const matchesQuery = !query || getSubclassSearchText(subclass).includes(query);
    const matchesSource = !source || normalizeComparable(subclass.source) === source;
    const matchesUnlock = filters.unlockFilter === "all"
      || (filters.unlockFilter === "available" && !subclass.blocked)
      || (filters.unlockFilter === "locked" && Boolean(subclass.blocked));

    return matchesQuery && matchesSource && matchesUnlock;
  });
  const focusedRef = findOptionByRef(filtered, overlay.focusedRef)?.ref
    || findOptionByRef(filtered, selectedRef)?.ref
    || filtered[0]?.ref
    || selectedRef;
  const focusedEntity = findOptionByRef(options, focusedRef);
  const focusedFeatures = toArray(focusedEntity?.featurePreview);
  const featureTimeline = normalizeSubclassFeatureTimeline(focusedEntity?.featureTimeline ?? focusedFeatures);
  const { immediateFeatures, futureFeatures } = splitSubclassFeatures(focusedFeatures, entry.classLevel);
  const sources = [...new Set(options.map((option) => option.source).filter(Boolean))].sort();

  return {
    type: "subclass",
    title: `Choose ${requirement?.subclassTitle || "Subclass"}`,
    label: requirement?.subclassTitle || "Subclass",
    className: focusedEntity?.className || cleanRefName(entry.classRef),
    characterLevel: entry.characterLevel,
    classLevel: entry.classLevel,
    selectedRef,
    focusedRef,
    focusedEntity,
    featureTimeline,
    focusedFeatures,
    filters,
    sources,
    results: filtered,
    immediateFeatures,
    futureFeatures
  };
}

function renderSubclassUnlockFilter(model = {}) {
  const selected = model.filters?.unlockFilter || "available";

  return `
    <label class="character-builder-picker-filter">
      <span>Unlock</span>
      <select
        data-builder-picker-field="unlockFilter"
        ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getPickerFieldFocusKey("unlockFilter"))}"
      >
        ${[
          ["available", "Available"],
          ["locked", "Locked"],
          ["all", "All"]
        ].map(([value, label]) => `
          <option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderSubclassPickerResult(subclass = {}, model = {}) {
  const active = subclass.ref === model.focusedRef;
  const selected = subclass.ref === model.selectedRef;
  const resultFeatures = getSubclassResultFeatures(subclass);
  const resultTimeline = toArray(subclass.featureTimeline).length
    ? subclass.featureTimeline
    : resultFeatures;
  const meta = [
    subclass.source,
    subclass.unlockAtClassLevel ? `${subclass.className || model.className} ${subclass.unlockAtClassLevel}` : "",
    subclass.blockedReason
  ].filter(Boolean).join(" | ");

  return `
    <button
      type="button"
      class="character-builder-picker-result${active ? " is-active" : ""}${subclass.blocked ? " is-blocked" : ""}"
      data-builder-action="focus-picker-result"
      data-picker-focused-ref="${escapeHtml(subclass.ref)}"
      ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getPickerResultFocusKey(subclass.ref))}"
      aria-pressed="${active ? "true" : "false"}"
    >
      <span>
        <strong>${escapeHtml(formatPickerEntityName(subclass))}</strong>
        <small>${escapeHtml(meta)}</small>
      </span>
      ${selected ? `<em>Selected</em>` : ""}
      ${renderSubclassLevelTimeline(resultTimeline, {
        compact: true,
        emptyLabel: "No feature timeline recorded."
      })}
    </button>
  `;
}

function formatSubclassTimelineLevel(level) {
  const value = Number(level ?? 0);
  return Number.isFinite(value) && value > 0 ? `L${value}` : "Level ?";
}

function renderSubclassLevelTimeline(timelineOrFeatures = [], options = {}) {
  const groups = normalizeSubclassFeatureTimeline(timelineOrFeatures);
  if (!groups.length) {
    return `<p class="character-builder-empty character-builder-empty-compact">${escapeHtml(options.emptyLabel || "No subclass features recorded.")}</p>`;
  }

  if (options.compact) {
    return `
      <span class="character-builder-subclass-level-timeline character-builder-subclass-level-timeline-compact" data-subclass-level-timeline role="list">
        ${groups.map((group) => `
          <span role="listitem" data-subclass-feature-level="${escapeHtml(group.level)}">
            <span>${escapeHtml(formatSubclassTimelineLevel(group.level))}</span>
            <strong>${escapeHtml(toArray(group.features).map((feature) => feature.name || "Feature").join(", "))}</strong>
          </span>
        `).join("")}
      </span>
    `;
  }

  return `
    <ol class="character-builder-subclass-level-timeline" data-subclass-level-timeline>
      ${groups.map((group) => {
        const levelLabel = formatSubclassTimelineLevel(group.level);
        const features = toArray(group.features);
        return `
          <li data-subclass-feature-level="${escapeHtml(group.level)}">
            <span>${escapeHtml(levelLabel)}</span>
            <div>
              ${features.map((feature) => `
                <article
                  class="character-builder-subclass-feature-detail"
                  data-subclass-feature="${escapeHtml(feature.ref || feature.name)}"
                >
                  <h4>${escapeHtml(feature.name || "Feature")}</h4>
                  ${renderCanonicalRulesText(feature)}
                </article>
              `).join("")}
            </div>
          </li>
        `;
      }).join("")}
    </ol>
  `;
}

function renderSubclassPickerOverlay(entry = {}, requirement = {}, overlay = {}) {
  const model = overlay.pickerModel ?? createSubclassPickerModel(entry, requirement, overlay);
  const focusedName = formatPickerEntityName(model.focusedEntity, model.label);
  const previewTimeline = toArray(model.featureTimeline).length
    ? model.featureTimeline
    : toArray(model.focusedFeatures).length
      ? model.focusedFeatures
      : [
          ...toArray(model.immediateFeatures),
          ...toArray(model.futureFeatures)
        ];

  return renderPickerOverlayShell({
    type: "subclass",
    title: model.title,
    eyebrow: `${model.className} ${model.classLevel}`,
    characterLevel: model.characterLevel ?? entry.characterLevel,
    selectedValue: model.focusedRef,
    applyDisabled: Boolean(model.focusedEntity?.blocked),
    sidebar: `
      <label class="character-builder-picker-search">
        <span>Search</span>
        <input
          type="search"
          value="${escapeHtml(model.filters.query)}"
          placeholder="${escapeHtml(focusedName.toLowerCase())}"
          data-builder-picker-field="query"
          ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getPickerFieldFocusKey("query"))}"
          autofocus
        >
      </label>
      <div class="character-builder-picker-filter-grid">
        <div class="character-builder-picker-filter">
          <span>Class</span>
          <strong>${escapeHtml(model.className)}</strong>
        </div>
        ${renderPickerSourceFilter(model)}
        ${renderSubclassUnlockFilter(model)}
      </div>
      <div class="character-builder-picker-results" data-builder-picker-results data-subclass-picker-results>
        <h3>Results</h3>
        ${model.results.length
          ? model.results.map((subclass) => renderSubclassPickerResult(subclass, model)).join("")
          : `<p class="character-builder-empty character-builder-empty-compact">No matching subclass options.</p>`}
      </div>
    `,
    preview: `
      <section class="character-builder-picker-preview" data-builder-picker-preview data-subclass-picker-preview>
        <header>
          <div>
            <h3>${escapeHtml(focusedName)}</h3>
            <p>${escapeHtml([
              model.focusedEntity?.source ? `Source ${model.focusedEntity.source}` : "",
              model.focusedEntity?.page ? `p.${model.focusedEntity.page}` : "",
              model.focusedEntity?.unlockAtClassLevel ? `Unlock ${model.className} ${model.focusedEntity.unlockAtClassLevel}` : "",
              model.focusedEntity?.ref ?? ""
            ].filter(Boolean).join(" | ") || "No subclass reference")}</p>
          </div>
          ${model.focusedEntity?.ref === model.selectedRef ? `<span>Current</span>` : ""}
        </header>
        ${model.focusedEntity?.blocked ? `<p class="character-builder-picker-warning">${escapeHtml(model.focusedEntity.blockedReason || "This subclass is not available.")}</p>` : ""}
        <section class="character-builder-picker-preview-section" data-subclass-feature-timeline>
          <h3>Feature Timeline</h3>
          ${renderSubclassLevelTimeline(previewTimeline, {
            emptyLabel: "No subclass feature timeline is recorded."
          })}
        </section>
      </section>
    `,
    applyLabel: `Use ${focusedName}`
  });
}

function getFeatSearchText(feat = {}) {
  return [
    feat.name,
    feat.source,
    feat.ref,
    feat.summary,
    feat.prerequisite,
    feat.fullText
  ].map(normalizeComparable).join(" ");
}

function createFeatPickerModel(entry = {}, requirement = {}, overlay = {}) {
  const selectedValue = getFeatDecisionValue(entry);
  const options = toArray(requirement?.options).map((option) => {
    const ref = getOptionValue(option);
    const fullText = cleanRulesText(option?.fullText || option?.entries || option?.raw?.entries || option?.summary);
    const summary = option?.summary
      || (fullText.length > 220 ? `${fullText.slice(0, 219).trim()}...` : fullText);

    return {
      ref,
      name: option?.name || option?.label || cleanRefName(ref),
      source: option?.source || "",
      page: option?.page ?? null,
      prerequisite: cleanRulesText(option?.prerequisite ?? ""),
      summary,
      fullText,
      selected: optionMatchesSelected(option, selectedValue)
    };
  }).filter((feat) => feat.ref);
  const selectedFeat = options.find((feat) => feat.selected) ?? findOptionByRef(options, selectedValue) ?? null;
  const filters = {
    query: overlay.query ?? "",
    source: overlay.source ?? ""
  };
  const query = normalizeComparable(filters.query);
  const source = normalizeComparable(filters.source);
  const results = options.filter((feat) => (
    (!query || getFeatSearchText(feat).includes(query))
    && (!source || normalizeComparable(feat.source) === source)
  ));
  const focusedRef = findOptionByRef(options, overlay.focusedRef)?.ref
    || (selectedFeat?.ref && results.some((feat) => feat.ref === selectedFeat.ref) ? selectedFeat.ref : "")
    || results[0]?.ref
    || selectedFeat?.ref
    || "";

  return {
    type: "level-feat",
    context: "level",
    parentType: "level",
    choiceId: requirement?.decisionId || `level-${entry?.characterLevel ?? ""}-feat`,
    label: "Feat",
    characterLevel: entry?.characterLevel ?? overlay.characterLevel ?? "",
    filters,
    selectedRef: selectedFeat?.ref ?? "",
    selectedFeat,
    focusedRef,
    focusedFeat: findOptionByRef(options, focusedRef),
    sources: [...new Set(options.map((feat) => feat.source).filter(Boolean))].sort(),
    results,
    allResults: options
  };
}

function renderPickerOverlayShell({ type, title, eyebrow, characterLevel = "", selectedValue = "", sidebar, preview, applyLabel = "Apply", applyDisabled = false, footer = "", formAttributes = "" }) {
  const titleId = getOverlayTitleId(type, characterLevel, "");

  return `
    <div class="character-builder-overlay-backdrop" data-builder-overlay-backdrop>
      <form
        class="character-builder-guided-overlay character-builder-picker-overlay"
        data-guided-overlay-form
        data-overlay-type="${escapeHtml(type)}"
        data-character-level="${escapeHtml(characterLevel)}"
        ${formAttributes}
        role="dialog"
        aria-modal="true"
        aria-labelledby="${escapeHtml(titleId)}"
        tabindex="-1"
      >
        <input type="hidden" name="selectedValue" value="${escapeHtml(selectedValue)}">
        <header class="character-builder-overlay-header">
          <div>
            <span>${escapeHtml(eyebrow)}</span>
            <h3 id="${escapeHtml(titleId)}">${escapeHtml(title)}</h3>
          </div>
          <button
            type="button"
            class="character-builder-button character-builder-button-quiet character-builder-button-compact"
            data-builder-action="close-guided-overlay"
            aria-label="Close picker"
          >Close</button>
        </header>
        <div class="character-builder-picker-body">
          <aside class="character-builder-picker-sidebar">
            ${sidebar}
          </aside>
          ${preview}
        </div>
        <footer class="character-builder-overlay-footer">
          ${footer || `
            <button type="button" class="character-builder-button" data-builder-action="close-guided-overlay">Cancel</button>
            <button
              type="submit"
              class="character-builder-button character-builder-button-primary"
              data-builder-action="apply-guided-overlay"
              ${applyDisabled ? "disabled" : ""}
            >${escapeHtml(applyLabel)}</button>
          `}
        </footer>
      </form>
    </div>
  `;
}

function findTimelineEntry(snapshot, characterLevel) {
  const level = Number(characterLevel ?? 0);
  return toArray(snapshot.builderSummary?.levelTimeline)
    .find((entry) => Number(entry.characterLevel) === level) ?? null;
}

function findRequirement(entry, type) {
  const normalizedType = String(type ?? "").trim();
  return toArray(entry?.requirements).find((requirement) => requirement.type === normalizedType) ?? null;
}

function findChoiceModel(entry, requirement) {
  const requirementId = String(requirement?.decisionId ?? "").trim();
  return toArray(entry?.choiceModels).find((model) => (
    (requirementId && model.id === requirementId)
    || (!requirementId && model.type === requirement?.type)
  )) ?? null;
}

function findGrantedSpellSource(snapshot, sourceRef) {
  const normalizedRef = String(sourceRef ?? "").trim();
  return toArray(snapshot.builderSummary?.grantedSpellSources)
    .find((source) => source.sourceRef === normalizedRef) ?? null;
}

function getOverlayTitleId(type, characterLevel, sourceRef) {
  return [
    "character-builder-guided-title",
    type,
    characterLevel,
    sourceRef
  ]
    .map((part) => String(part ?? "").trim().replace(/[^a-zA-Z0-9_-]+/g, "-"))
    .filter(Boolean)
    .join("-");
}

function renderOverlayShell({ title, eyebrow, meta, type, characterLevel = "", sourceRef = "", body, showApply = true }) {
  const titleId = getOverlayTitleId(type, characterLevel, sourceRef);

  return `
    <div class="character-builder-overlay-backdrop" data-builder-overlay-backdrop>
      <form
        class="character-builder-guided-overlay"
        data-guided-overlay-form
        data-overlay-type="${escapeHtml(type)}"
        data-character-level="${escapeHtml(characterLevel)}"
        data-grant-source-ref="${escapeHtml(sourceRef)}"
        role="dialog"
        aria-modal="true"
        aria-labelledby="${escapeHtml(titleId)}"
        tabindex="-1"
      >
        <header class="character-builder-overlay-header">
          <div>
            <span>${escapeHtml(eyebrow)}</span>
            <h3 id="${escapeHtml(titleId)}">${escapeHtml(title)}</h3>
            ${meta ? `<p>${escapeHtml(meta)}</p>` : ""}
          </div>
          <button
            type="button"
            class="character-builder-button character-builder-button-quiet character-builder-button-compact"
            data-builder-action="close-guided-overlay"
            aria-label="Close guided editor"
          >Close</button>
        </header>
        <div class="character-builder-overlay-body">
          ${body}
        </div>
        <footer class="character-builder-overlay-footer">
          <button type="button" class="character-builder-button" data-builder-action="close-guided-overlay">Cancel</button>
          ${showApply
            ? `<button type="submit" class="character-builder-button character-builder-button-primary" data-builder-action="apply-guided-overlay">Apply</button>`
            : ""}
        </footer>
      </form>
    </div>
  `;
}

function renderRadioOptions(name, options = [], selectedValue = "", emptyLabel = "No options available") {
  const entries = toArray(options);
  if (!entries.length) {
    return `<p class="character-builder-empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `
    <div class="character-builder-option-grid" role="radiogroup">
      ${entries.map((option, index) => {
        const value = getOptionValue(option);
        const selected = optionMatchesSelected(option, selectedValue);
        const disabled = option?.blocked ? " disabled" : "";
        const label = formatOptionLabel(option);
        const meta = [
          option?.source ? `Source ${option.source}` : "",
          option?.blockedReason || ""
        ].filter(Boolean).join(" | ");

        return `
          <label class="character-builder-option-card${option?.blocked ? " character-builder-option-blocked" : ""}">
            <input
              type="radio"
              name="${escapeHtml(name)}"
              value="${escapeHtml(value)}"
              ${selected ? "checked" : ""}
              ${disabled}
            >
            <span>
              <strong>${renderBuilderRuleDetailButton(label, option, { title: label, kind: "Option" })}</strong>
              ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
            </span>
          </label>
        `;
      }).join("")}
    </div>
`;
}

function renderSubclassOverlay(entry, requirement) {
  const selected = getSubclassDecisionValue(entry);

  return renderOverlayShell({
    type: "subclass",
    characterLevel: entry?.characterLevel,
    eyebrow: `Level ${entry?.characterLevel ?? "-"}`,
    title: requirement?.subclassTitle || "Subclass Choice",
    meta: `${cleanRefName(entry?.classRef)} class level ${entry?.classLevel ?? "-"}`,
    body: `
      ${renderRadioOptions("selectedValue", requirement?.options, selected, "No legal subclass options are available.")}
    `
  });
}

function renderFeatOverlay(entry, requirement, overlay = {}) {
  const featPickerModel = overlay.pickerModel ?? createFeatPickerModel(entry, requirement, overlay);

  return renderIdentityFeatPickerOverlay({
    type: "feat",
    title: "Choose Feat",
    eyebrow: requirement?.campaignRule
      ? `Level ${entry?.characterLevel ?? "-"} | Campaign ASI+feat rule`
      : `Level ${entry?.characterLevel ?? "-"} | Feat alternative`,
    label: "Level",
    characterLevel: entry?.characterLevel,
    focusedRef: featPickerModel.focusedRef,
    featPickerModel
  });
}

function renderPickOverlay(entry, requirement) {
  const type = String(requirement?.type ?? "");
  const choiceModel = findChoiceModel(entry, requirement);
  const options = choiceModel?.options ?? toArray(requirement?.options).map((option) => {
    const value = getOptionValue(option);
    const selectedSet = new Set(getDecisionValues(entry, type).map(normalizeComparable));
    return {
      value,
      label: formatOptionLabel(option),
      checked: selectedSet.has(normalizeComparable(value)),
      disabled: false,
      reason: ""
    };
  });
  const count = choiceModel?.count ?? requirement?.count;
  const countLabel = count ? `Pick ${count}` : "Pick as needed";

  return renderOverlayShell({
    type,
    characterLevel: entry?.characterLevel,
    eyebrow: `Level ${entry?.characterLevel ?? "-"}`,
    title: `${titleCase(type)} Selection`,
    meta: `${countLabel} | ${requirement?.reason ? titleCase(requirement.reason) : "progression choice"}`,
    body: `
      ${options.length ? `
        <div
          class="character-builder-checkbox-grid"
          data-level-choice-model="${escapeHtml(choiceModel?.id ?? requirement?.decisionId ?? "")}"
          data-level-choice-count="${escapeHtml(count ?? "")}"
        >
          ${options.map((option) => {
            const value = option.value ?? getOptionValue(option);
            const checked = Boolean(option.checked);
            const disabled = Boolean(option.disabled);
            const reason = option.reason && option.reason !== "Available" && option.reason !== "Selected"
              ? option.reason
              : "";
            const staticDisabled = disabled && option.status !== "disabled" && !/already picked/i.test(reason);
            return `
              <label class="character-builder-checkbox-card${disabled ? " character-builder-checkbox-card-disabled" : ""}"${reason ? ` title="${escapeHtml(reason)}"` : ""}>
                <input
                  type="checkbox"
                  name="pick"
                  value="${escapeHtml(value)}"
                  data-level-choice-option
                  data-level-choice-static-disabled="${staticDisabled ? "true" : "false"}"
                  data-level-choice-static-reason="${escapeHtml(staticDisabled ? reason : "")}"
                  ${checked ? "checked" : ""}
                  ${disabled ? "disabled" : ""}
                  ${reason ? `title="${escapeHtml(reason)}"` : ""}
                >
                <span>
                  <strong>${escapeHtml(option.label ?? formatOptionLabel(option))}</strong>
                  <small data-level-choice-disabled-reason ${reason ? "" : "hidden"}>${escapeHtml(reason)}</small>
                </span>
              </label>
            `;
          }).join("")}
        </div>
      ` : `<p class="character-builder-empty">No structured options are available.</p>`}
      ${toArray(choiceModel?.violations).length ? `
        <ul class="character-builder-warning-list">
          ${choiceModel.violations.map((violation) => `<li>${escapeHtml(violation)}</li>`).join("")}
        </ul>
      ` : ""}
    `
  });
}

function renderAsiOverlay(entry) {
  const model = entry?.asiChoice;
  const ruleProfile = model?.ruleProfile ?? {};
  const pickLimit = Number(ruleProfile.pickLimit ?? model?.count ?? 2) || 2;
  const amountPerPick = Number(ruleProfile.amountPerPick ?? 1) || 1;
  const abilityCap = Number(ruleProfile.abilityCap ?? 20) || 20;
  const selectedPickCount = Number(model?.selectedPickCount ?? 0) || 0;
  const options = toArray(model?.options).length
    ? toArray(model?.options)
    : Object.entries(ABILITY_LABELS).map(([ability, label]) => ({
        ability,
        label,
        amount: 0,
        current: 0,
        next: 0,
        reason: "",
        incrementDisabled: false,
        decrementDisabled: true
      }));

  return renderOverlayShell({
    type: "asi",
    characterLevel: entry?.characterLevel,
    eyebrow: `Level ${entry?.characterLevel ?? "-"}`,
    title: "Ability Score Increase",
    meta: `Used ${selectedPickCount}/${pickLimit} | +${amountPerPick} each | cap ${abilityCap}`,
    body: `
      ${options.length ? `
        <div
          class="character-builder-asi-grid"
          data-asi-stepper-grid
          data-asi-pick-limit="${escapeHtml(pickLimit)}"
          data-asi-amount-per-pick="${escapeHtml(amountPerPick)}"
          data-asi-ability-cap="${escapeHtml(abilityCap)}"
        >
          ${options.map((option) => {
            const ability = String(option.ability ?? "").toLowerCase();
            const amount = Number(option.amount ?? 0) || 0;
            const current = Number(option.current ?? 0) || 0;
            const next = Number(option.next ?? current + amount) || 0;
            const reason = option.reason && option.reason !== "selected" ? option.reason : "";
            return `
            <article
              class="character-builder-asi-card${option.status === "invalid" ? " character-builder-asi-card-invalid" : ""}"
              data-asi-stepper
              data-asi-ability="${escapeHtml(ability)}"
              data-asi-current="${escapeHtml(current)}"
            >
              <input
                type="hidden"
                name="asi-${escapeHtml(ability)}"
                value="${escapeHtml(amount)}"
                data-asi-value
                data-asi-ability="${escapeHtml(ability)}"
              >
              <div class="character-builder-asi-head">
                <strong>${escapeHtml(option.label)}</strong>
                <span class="character-builder-asi-score" data-asi-current-label>${escapeHtml(current)}</span>
              </div>
              <div class="character-builder-asi-stepper" role="group" aria-label="${escapeHtml(option.label)} increase">
                <button
                  type="button"
                  class="character-builder-button character-builder-button-quiet character-builder-button-compact"
                  data-asi-step="-1"
                  data-asi-ability="${escapeHtml(ability)}"
                  ${option.decrementDisabled ? "disabled" : ""}
                  aria-label="Decrease ${escapeHtml(option.label)} ASI"
                >-</button>
                <span data-asi-display>+${escapeHtml(amount)}</span>
                <button
                  type="button"
                  class="character-builder-button character-builder-button-quiet character-builder-button-compact"
                  data-asi-step="1"
                  data-asi-ability="${escapeHtml(ability)}"
                  ${option.incrementDisabled ? "disabled" : ""}
                  aria-label="Increase ${escapeHtml(option.label)} ASI"
                >+</button>
              </div>
              <small data-asi-next>${amount ? `Next ${escapeHtml(next)}` : "No change"}</small>
              <small data-asi-reason ${reason ? "" : "hidden"}>${escapeHtml(reason)}</small>
            </article>
          `;
          }).join("")}
        </div>
      ` : `<p class="character-builder-empty">No ability score options are available.</p>`}
      ${toArray(model?.violations).length ? `
        <ul class="character-builder-warning-list">
          ${model.violations.map((violation) => `<li>${escapeHtml(violation)}</li>`).join("")}
        </ul>
      ` : ""}
    `
  });
}

function renderAbilityScoresOverlay(abilityScores = {}) {
  const scores = abilityScores.scores ?? {};

  return renderOverlayShell({
    type: "abilities",
    eyebrow: "Level 1",
    title: "Base Ability Scores",
    meta: abilityScores.complete ? "All six scores are entered." : "Missing scores are treated as incomplete.",
    body: `
      <div class="character-builder-ability-grid">
        ${Object.entries(ABILITY_LABELS).map(([ability, label]) => `
          <label class="character-builder-field">
            <span>${escapeHtml(label)}</span>
            <input
              type="number"
              name="ability-${escapeHtml(ability)}"
              value="${escapeHtml(scores[ability] ?? "")}"
              min="1"
              max="30"
              step="1"
              required
            >
          </label>
        `).join("")}
      </div>
    `
  });
}

function renderGrantedSpellsOverlay(source) {
  const fixedSpells = toArray(source?.fixedSpells);
  const choiceGrants = toArray(source?.choiceGrants);
  const selectedSpells = toArray(source?.selectedSpells);

  return renderOverlayShell({
    type: "granted-spells",
    sourceRef: source?.sourceRef ?? "",
    eyebrow: "Granted Spells",
    title: source?.name || cleanRefName(source?.sourceRef),
    meta: source?.source ? `Source ${source.source}` : source?.sourceRef ?? "",
    showApply: false,
    body: `
      ${fixedSpells.length ? `
        <section class="character-builder-overlay-section">
          <h4>Fixed Grants</h4>
          <ul class="character-builder-level-list-small">
            ${fixedSpells.map((spell) => `
              <li>
                <strong>${escapeHtml(spell.name || "Spell")}</strong>
                <span>${escapeHtml([spell.source, spell.level == null ? "" : `Level ${spell.level}`].filter(Boolean).join(" | "))}</span>
              </li>
            `).join("")}
          </ul>
        </section>
      ` : ""}
      ${choiceGrants.length ? `
        <section class="character-builder-overlay-section">
          <h4>Choice Grants</h4>
          <ul class="character-builder-level-list-small">
            ${choiceGrants.map((grant) => `
              <li>
                <strong>${escapeHtml(grant.filter || "Spell choice")}</strong>
                <span>${escapeHtml([grant.mode, grant.count ? `Pick ${grant.count}` : "", grant.unlockAtLevel ? `Level ${grant.unlockAtLevel}` : ""].filter(Boolean).join(" | "))}</span>
                <small>Resolve this through a normalized finite choice definition, not typed spell text.</small>
              </li>
            `).join("")}
          </ul>
        </section>
      ` : ""}
      ${selectedSpells.length ? `
        <section class="character-builder-overlay-section">
          <h4>Selected Spells</h4>
          <ul class="character-builder-level-list-small">
            ${selectedSpells.map((spell) => `
              <li>
                <strong>${escapeHtml(spell.name || spell.spell || "Spell")}</strong>
                <span>${escapeHtml([spell.source, spell.level == null ? "" : `Level ${spell.level}`].filter(Boolean).join(" | "))}</span>
              </li>
            `).join("")}
          </ul>
        </section>
      ` : `<p class="character-builder-empty">No selected spells are recorded.</p>`}
    `
  });
}

function renderGuidedOverlay(snapshot = {}) {
  const overlay = snapshot.uiState?.guidedOverlay;
  if (!overlay?.type) {
    return "";
  }

  if (overlay.type === "ancestry" || overlay.type === "background") {
    return renderIdentityPickerOverlay(snapshot, overlay.type);
  }

  if (overlay.type === "abilities") {
    return renderAbilityScoresOverlay(snapshot.builderSummary?.abilityScores);
  }

  if (overlay.type === "granted-spells") {
    const source = findGrantedSpellSource(snapshot, overlay.sourceRef);
    return source
      ? renderGrantedSpellsOverlay(source)
      : renderOverlayShell({
          type: "granted-spells",
          sourceRef: overlay.sourceRef,
          eyebrow: "Granted Spells",
          title: "Granted Spell Source",
          meta: overlay.sourceRef,
          body: `<p class="character-builder-empty">This granted spell source is no longer available.</p>`
        });
  }

  const entry = findTimelineEntry(snapshot, overlay.characterLevel);
  const requirement = findRequirement(entry, overlay.type);
  if (!entry) {
    return "";
  }

  if (overlay.type === "subclass") {
    return renderSubclassPickerOverlay(entry, requirement, overlay);
  }

  if (overlay.type === "feat") {
    return renderFeatOverlay(entry, requirement, overlay);
  }

  if (overlay.type === "asi") {
    return renderAsiOverlay(entry);
  }

  if (INLINE_PICK_TYPES.has(overlay.type)) {
    return renderPickOverlay(entry, requirement);
  }

  return "";
}

function renderLevelTimeline(snapshot = {}) {
  const levels = toArray(snapshot.builderSummary?.levelTimeline);
  const classOptions = toArray(snapshot.builderOptions?.classes);
  const abilityScores = snapshot.builderSummary?.abilityScores ?? {};

  return `
    <section class="character-builder-timeline" aria-label="Level timeline">
      <div class="character-builder-section-heading">
        <div>
          <h3>Level Timeline</h3>
          <span>${escapeHtml(levels.length)} level${levels.length === 1 ? "" : "s"}</span>
        </div>
        ${renderAddLevelControls(classOptions)}
      </div>
      ${levels.length
        ? `
          <div class="character-builder-level-timeline">
            ${levels.map((entry) => {
              const classSummary = entry.classSummary ?? {};
              const className = classSummary.name || cleanRefName(entry.classRef) || "No class";
              const tone = getLevelTone(entry);
              const levelStatus = tone === "danger"
                ? getRequiredChoiceStatus({ blocked: true })
                : tone === "good"
                  ? getRequiredChoiceStatus({ resolved: true })
                  : getRequiredChoiceStatus({ required: true });

              return `
                <details
                  class="card character-builder-level-card character-builder-level-${escapeHtml(tone)} ${escapeHtml(levelStatus.className)}"
                  data-character-level-card="${escapeHtml(entry.characterLevel)}"
                  ${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeHtml(getLevelFocusKey(entry.characterLevel))}"
                  tabindex="-1"
                  open
                >
                  <summary class="character-builder-level-summary">
                    <div>
                      <span class="character-builder-level-kicker">Level ${escapeHtml(entry.characterLevel)}</span>
                      <h3>${escapeHtml(className)} ${escapeHtml(entry.classLevel || "")}</h3>
                      <p>
                        <span>Character ${escapeHtml(entry.characterLevel)}</span>
                        <span>Class ${escapeHtml(entry.classLevel || "-")}</span>
                        <span>${escapeHtml(classSummary.source || entry.classRef || "No source")}</span>
                      </p>
                    </div>
                    <span class="character-builder-level-status">
                      ${renderRequiredChoiceBadge(levelStatus)}
                      <span>Toggle</span>
                    </span>
                  </summary>
                  <div class="character-builder-level-header">
                    ${renderClassSelect(entry, classOptions)}
                  </div>

                  <div class="character-builder-level-grid">
                    <section class="character-builder-level-block">
                      <h4>Required Decisions</h4>
                      ${renderRequirementRows(entry, abilityScores)}
                    </section>
                    <section class="character-builder-level-block">
                      <h4>Granted Features</h4>
                      ${renderFeatureList(entry)}
                    </section>
                    <details class="character-builder-level-block character-builder-disclosure">
                      <summary>Resolved Decisions</summary>
                      ${renderDecisionList(entry.decisions, entry)}
                    </details>
                    <details class="character-builder-level-block character-builder-disclosure">
                      <summary>Unresolved Items</summary>
                      ${renderUnresolvedList(entry)}
                    </details>
                  </div>
                </details>
              `;
            }).join("")}
          </div>
        `
        : `<p class="character-builder-empty">No class levels selected.</p>`}
    </section>
  `;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function resolveMountTarget(mount) {
  if (typeof document === "undefined") {
    return null;
  }

  if (mount instanceof Element) {
    return mount;
  }

  if (typeof mount === "string" && mount.trim()) {
    return document.querySelector(mount);
  }

  return null;
}

/**
 * Returns the active guided overlay identity so focus only resets when it changes.
 */
function getOverlayFocusKey(snapshot = {}) {
  const overlay = snapshot.uiState?.guidedOverlay;
  if (!overlay?.type) {
    return "";
  }

  return [
    overlay.type,
    overlay.characterLevel ?? "",
    overlay.sourceRef ?? ""
  ].join("|");
}

/**
 * Finds the best first focus target inside a newly rendered modal surface.
 */
function findInitialFocusTarget(container) {
  if (!container) {
    return null;
  }

  return container.querySelector("[autofocus]")
    ?? container.querySelector(".character-builder-overlay-body input:not([disabled]), .character-builder-overlay-body select:not([disabled])")
    ?? container.querySelector(FOCUSABLE_SELECTOR)
    ?? container;
}

/**
 * Focuses a modal target without scrolling the underlying page.
 */
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

function getDocumentForRoot(root) {
  return root?.ownerDocument ?? (typeof document !== "undefined" ? document : null);
}

function getWindowForDocument(documentRef) {
  return documentRef?.defaultView ?? (typeof window !== "undefined" ? window : null);
}

function readWindowScroll(windowRef) {
  return {
    x: Number(windowRef?.scrollX ?? windowRef?.pageXOffset ?? 0) || 0,
    y: Number(windowRef?.scrollY ?? windowRef?.pageYOffset ?? 0) || 0
  };
}

function scrollWindowTo(windowRef, scrollX, scrollY) {
  if (!windowRef) {
    return;
  }

  if (typeof windowRef.scrollTo === "function") {
    try {
      windowRef.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      return;
    } catch (_error) {
      windowRef.scrollTo(scrollX, scrollY);
      return;
    }
  }

  windowRef.scrollX = scrollX;
  windowRef.scrollY = scrollY;
  windowRef.pageXOffset = scrollX;
  windowRef.pageYOffset = scrollY;
}

function getBuilderScrollElement(root) {
  return root?.querySelector?.("[data-character-builder]") ?? root ?? null;
}

function getActiveOverlayElement(root) {
  return root?.querySelector?.("[data-guided-overlay-form]") ?? null;
}

function getOverlayBodyScrollElement(root) {
  return root?.querySelector?.("[data-guided-overlay-form] .character-builder-picker-body, [data-guided-overlay-form] .character-builder-overlay-body") ?? null;
}

function getPickerResultsElement(root) {
  return root?.querySelector?.("[data-builder-picker-results]") ?? root?.querySelector?.(".character-builder-picker-results") ?? null;
}

function getPickerSidebarElement(root) {
  return root?.querySelector?.("[data-guided-overlay-form] .character-builder-picker-sidebar") ?? null;
}

function getPickerPreviewElement(root) {
  return root?.querySelector?.("[data-builder-picker-preview]") ?? root?.querySelector?.(".character-builder-picker-preview") ?? null;
}

function readElementScroll(element) {
  return {
    left: Number(element?.scrollLeft ?? 0) || 0,
    top: Number(element?.scrollTop ?? 0) || 0
  };
}

function restoreElementScroll(element, scroll = {}) {
  if (!element) {
    return;
  }

  element.scrollLeft = Number(scroll.left ?? 0) || 0;
  element.scrollTop = Number(scroll.top ?? 0) || 0;
}

function getElementFocusKey(element) {
  if (!element || element === element.ownerDocument?.body) {
    return "";
  }

  if (typeof element.getAttribute === "function") {
    const dataKey = normalizeFocusKey(element.getAttribute(RENDER_FOCUS_KEY_ATTRIBUTE));
    if (dataKey) {
      return dataKey;
    }

    const pickerField = normalizeFocusKey(element.getAttribute("data-builder-picker-field"));
    if (pickerField) {
      return getPickerFieldFocusKey(pickerField);
    }

    const pickerFocusedRef = normalizeFocusKey(element.getAttribute("data-picker-focused-ref"));
    if (pickerFocusedRef) {
      return getPickerResultFocusKey(pickerFocusedRef);
    }
  }

  const id = normalizeFocusKey(element.id);
  return id ? `id:${id}` : "";
}

function getElementSelectionState(element) {
  const selectionStart = Number.isFinite(element?.selectionStart) ? element.selectionStart : null;
  const selectionEnd = Number.isFinite(element?.selectionEnd) ? element.selectionEnd : null;
  if (selectionStart === null || selectionEnd === null) {
    return null;
  }

  return {
    selectionStart,
    selectionEnd,
    selectionDirection: typeof element.selectionDirection === "string" ? element.selectionDirection : "none"
  };
}

function restoreElementSelection(element, selection = null) {
  if (!element || !selection || typeof element.setSelectionRange !== "function") {
    return;
  }

  const start = Number(selection.selectionStart);
  const end = Number(selection.selectionEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return;
  }

  try {
    element.setSelectionRange(start, end, selection.selectionDirection || "none");
  } catch (_error) {
    element.setSelectionRange(start, end);
  }
}

function getFormControlDescriptor(element) {
  if (!element?.closest || !element.name) {
    return null;
  }

  const form = element.closest("[data-guided-overlay-form]");
  if (!form) {
    return null;
  }

  const type = String(element.type ?? "").toLowerCase();
  return {
    overlayType: String(form.dataset?.overlayType ?? ""),
    characterLevel: String(form.dataset?.characterLevel ?? ""),
    sourceRef: String(form.dataset?.grantSourceRef ?? ""),
    name: String(element.name ?? ""),
    value: type === "checkbox" || type === "radio" ? String(element.value ?? "") : "",
    tagName: String(element.tagName ?? "").toLowerCase(),
    type
  };
}

function captureActiveElementState(root, documentRef) {
  const activeElement = documentRef?.activeElement ?? null;
  const isInRoot = Boolean(activeElement && (
    !root
    || typeof root.contains !== "function"
    || root.contains(activeElement)
  ));
  if (!isInRoot) {
    return {
      focusKey: "",
      pickerField: "",
      pickerFocusedRef: "",
      formControl: null,
      selection: null
    };
  }

  return {
    focusKey: getElementFocusKey(activeElement),
    pickerField: normalizeFocusKey(activeElement?.getAttribute?.("data-builder-picker-field")),
    pickerFocusedRef: normalizeFocusKey(activeElement?.getAttribute?.("data-picker-focused-ref")),
    formControl: getFormControlDescriptor(activeElement),
    selection: getElementSelectionState(activeElement)
  };
}

function findFormControlElement(root, descriptor = null) {
  if (!root || !descriptor?.name) {
    return null;
  }

  const forms = typeof root.querySelectorAll === "function"
    ? [...root.querySelectorAll("[data-guided-overlay-form]")]
    : [];
  const form = forms.find((candidate) => (
    (!descriptor.overlayType || String(candidate.dataset?.overlayType ?? "") === descriptor.overlayType)
    && (!descriptor.characterLevel || String(candidate.dataset?.characterLevel ?? "") === descriptor.characterLevel)
    && (!descriptor.sourceRef || String(candidate.dataset?.grantSourceRef ?? "") === descriptor.sourceRef)
  )) ?? forms[0] ?? null;
  if (!form?.querySelectorAll) {
    return null;
  }

  const controls = [...form.querySelectorAll("input, select, textarea, button")]
    .filter((control) => String(control.name ?? "") === descriptor.name);
  if (!controls.length) {
    return null;
  }

  if (descriptor.value) {
    return controls.find((control) => String(control.value ?? "") === descriptor.value) ?? controls[0];
  }

  return controls[0];
}

function findFocusElement(root, focusKey, activeElementState = {}) {
  const key = normalizeFocusKey(focusKey);
  if (!root || !key) {
    return findFormControlElement(root, activeElementState.formControl);
  }

  const documentRef = getDocumentForRoot(root);
  if (key.startsWith("id:") && typeof documentRef?.getElementById === "function") {
    return documentRef.getElementById(key.slice(3));
  }

  const focusTarget = typeof root.querySelector === "function"
    ? root.querySelector(`[${RENDER_FOCUS_KEY_ATTRIBUTE}="${escapeAttributeSelector(key)}"]`)
    : null;
  if (focusTarget) {
    return focusTarget;
  }

  if (activeElementState.pickerField && typeof root.querySelector === "function") {
    const selector = `[data-builder-picker-field="${escapeAttributeSelector(activeElementState.pickerField)}"]`;
    const pickerFieldTarget = root.querySelector(selector);
    if (pickerFieldTarget) {
      return pickerFieldTarget;
    }
  }

  if (activeElementState.pickerFocusedRef && typeof root.querySelector === "function") {
    const selector = `[data-picker-focused-ref="${escapeAttributeSelector(activeElementState.pickerFocusedRef)}"]`;
    const pickerResultTarget = root.querySelector(selector);
    if (pickerResultTarget) {
      return pickerResultTarget;
    }
  }

  return findFormControlElement(root, activeElementState.formControl);
}

function captureRenderState(root, options = {}) {
  const documentRef = getDocumentForRoot(root);
  const windowRef = getWindowForDocument(documentRef);
  const scrollElement = getBuilderScrollElement(root);
  const overlayElement = getActiveOverlayElement(root);
  const overlayBodyElement = getOverlayBodyScrollElement(root);
  const pickerResultsElement = getPickerResultsElement(root);
  const pickerSidebarElement = getPickerSidebarElement(root);
  const pickerPreviewElement = getPickerPreviewElement(root);
  const windowScroll = readWindowScroll(windowRef);
  const activeElement = captureActiveElementState(root, documentRef);
  const builderScroll = readElementScroll(scrollElement);
  const activeOverlayScroll = readElementScroll(overlayElement);
  const overlayBodyScroll = readElementScroll(overlayBodyElement);
  const pickerResultsScroll = readElementScroll(pickerResultsElement);
  const pickerSidebarScroll = readElementScroll(pickerSidebarElement);
  const pickerPreviewScroll = readElementScroll(pickerPreviewElement);
  const focusKey = normalizeFocusKey(activeElement.focusKey)
    || normalizeFocusKey(options.fallbackFocusKey);

  return {
    phase: 15,
    scrollX: windowScroll.x,
    scrollY: windowScroll.y,
    builderScrollLeft: builderScroll.left,
    builderScrollTop: builderScroll.top,
    containerScrollLeft: builderScroll.left,
    containerScrollTop: builderScroll.top,
    activeOverlayScrollLeft: activeOverlayScroll.left,
    activeOverlayScrollTop: activeOverlayScroll.top,
    overlayBodyScrollLeft: overlayBodyScroll.left,
    overlayBodyScrollTop: overlayBodyScroll.top,
    pickerResultsScrollLeft: pickerResultsScroll.left,
    pickerResultsScrollTop: pickerResultsScroll.top,
    pickerSidebarScrollLeft: pickerSidebarScroll.left,
    pickerSidebarScrollTop: pickerSidebarScroll.top,
    pickerPreviewScrollLeft: pickerPreviewScroll.left,
    pickerPreviewScrollTop: pickerPreviewScroll.top,
    focusKey,
    activeElement: {
      ...activeElement,
      focusKey
    }
  };
}

function restoreRenderState(root, anchor = {}, options = {}) {
  const documentRef = getDocumentForRoot(root);
  const windowRef = getWindowForDocument(documentRef);
  const scrollElement = getBuilderScrollElement(root);
  const overlayElement = getActiveOverlayElement(root);
  const overlayBodyElement = getOverlayBodyScrollElement(root);
  const pickerResultsElement = getPickerResultsElement(root);
  const pickerSidebarElement = getPickerSidebarElement(root);
  const pickerPreviewElement = getPickerPreviewElement(root);
  const scrollTolerance = Number(options.scrollTolerance ?? 24);
  const requestedFocusKey = normalizeFocusKey(options.focusKey)
    || normalizeFocusKey(anchor.activeElement?.focusKey)
    || normalizeFocusKey(anchor.focusKey)
    || normalizeFocusKey(options.focusFallbackKey);
  const fallbackFocusKey = normalizeFocusKey(options.focusFallbackKey);
  const activeElementState = anchor.activeElement ?? {};
  let focusTarget = findFocusElement(root, requestedFocusKey, activeElementState);
  let fallbackUsed = false;

  if (!focusTarget && fallbackFocusKey && fallbackFocusKey !== requestedFocusKey) {
    focusTarget = findFocusElement(root, fallbackFocusKey, activeElementState);
    fallbackUsed = Boolean(focusTarget);
  }

  if (focusTarget) {
    focusWithoutScroll(focusTarget);
    restoreElementSelection(focusTarget, activeElementState.selection);
  }

  const builderTargetScroll = {
    left: Number(anchor.builderScrollLeft ?? anchor.containerScrollLeft ?? 0) || 0,
    top: Number(anchor.builderScrollTop ?? anchor.containerScrollTop ?? 0) || 0
  };
  const activeOverlayTargetScroll = {
    left: Number(anchor.activeOverlayScrollLeft ?? 0) || 0,
    top: Number(anchor.activeOverlayScrollTop ?? 0) || 0
  };
  const overlayBodyTargetScroll = {
    left: Number(anchor.overlayBodyScrollLeft ?? 0) || 0,
    top: Number(anchor.overlayBodyScrollTop ?? 0) || 0
  };
  const pickerResultsTargetScroll = {
    left: Number(anchor.pickerResultsScrollLeft ?? 0) || 0,
    top: Number(anchor.pickerResultsScrollTop ?? 0) || 0
  };
  const pickerSidebarTargetScroll = {
    left: Number(anchor.pickerSidebarScrollLeft ?? anchor.pickerResultsScrollLeft ?? 0) || 0,
    top: Number(anchor.pickerSidebarScrollTop ?? anchor.pickerResultsScrollTop ?? 0) || 0
  };
  const pickerPreviewTargetScroll = {
    left: Number(anchor.pickerPreviewScrollLeft ?? 0) || 0,
    top: Number(anchor.pickerPreviewScrollTop ?? 0) || 0
  };

  restoreElementScroll(scrollElement, builderTargetScroll);
  restoreElementScroll(overlayElement, activeOverlayTargetScroll);
  restoreElementScroll(overlayBodyElement, overlayBodyTargetScroll);
  restoreElementScroll(pickerResultsElement, pickerResultsTargetScroll);
  restoreElementScroll(pickerSidebarElement, pickerSidebarTargetScroll);
  restoreElementScroll(pickerPreviewElement, pickerPreviewTargetScroll);

  scrollWindowTo(windowRef, Number(anchor.scrollX ?? 0) || 0, Number(anchor.scrollY ?? 0) || 0);

  const restoredWindowScroll = readWindowScroll(windowRef);
  const restoredFocusKey = getElementFocusKey(documentRef?.activeElement);
  const builderScroll = readElementScroll(scrollElement);
  const activeOverlayScroll = readElementScroll(overlayElement);
  const overlayBodyScroll = readElementScroll(overlayBodyElement);
  const pickerResultsScroll = readElementScroll(pickerResultsElement);
  const pickerSidebarScroll = readElementScroll(pickerSidebarElement);
  const pickerPreviewScroll = readElementScroll(pickerPreviewElement);
  const containerScrollDelta = Math.abs(builderScroll.top - builderTargetScroll.top);
  const activeOverlayScrollDelta = overlayElement ? Math.abs(activeOverlayScroll.top - activeOverlayTargetScroll.top) : 0;
  const overlayBodyScrollDelta = overlayBodyElement ? Math.abs(overlayBodyScroll.top - overlayBodyTargetScroll.top) : 0;
  const pickerResultsScrollDelta = pickerResultsElement ? Math.abs(pickerResultsScroll.top - pickerResultsTargetScroll.top) : 0;
  const pickerSidebarScrollDelta = pickerSidebarElement ? Math.abs(pickerSidebarScroll.top - pickerSidebarTargetScroll.top) : 0;
  const pickerPreviewScrollDelta = pickerPreviewElement ? Math.abs(pickerPreviewScroll.top - pickerPreviewTargetScroll.top) : 0;
  const windowScrollDelta = Math.abs(restoredWindowScroll.y - (Number(anchor.scrollY ?? 0) || 0));
  const scrollStable = [
    windowScrollDelta,
    containerScrollDelta,
    activeOverlayScrollDelta,
    overlayBodyScrollDelta,
    pickerResultsScrollDelta,
    pickerSidebarScrollDelta,
    pickerPreviewScrollDelta
  ].every((delta) => delta <= scrollTolerance);

  return {
    phase: 15,
    requestedFocusKey,
    restoredFocusKey,
    fallbackFocusKey,
    fallbackUsed,
    focusAttempted: Boolean(focusTarget),
    focusRestored: Boolean(requestedFocusKey) && [requestedFocusKey, fallbackFocusKey].includes(restoredFocusKey),
    scrollX: restoredWindowScroll.x,
    scrollY: restoredWindowScroll.y,
    builderScrollLeft: builderScroll.left,
    builderScrollTop: builderScroll.top,
    containerScrollLeft: builderScroll.left,
    containerScrollTop: builderScroll.top,
    activeOverlayScrollLeft: activeOverlayScroll.left,
    activeOverlayScrollTop: activeOverlayScroll.top,
    overlayBodyScrollLeft: overlayBodyScroll.left,
    overlayBodyScrollTop: overlayBodyScroll.top,
    pickerResultsScrollLeft: pickerResultsScroll.left,
    pickerResultsScrollTop: pickerResultsScroll.top,
    pickerSidebarScrollLeft: pickerSidebarScroll.left,
    pickerSidebarScrollTop: pickerSidebarScroll.top,
    pickerPreviewScrollLeft: pickerPreviewScroll.left,
    pickerPreviewScrollTop: pickerPreviewScroll.top,
    scrollDelta: windowScrollDelta,
    containerScrollDelta,
    activeOverlayScrollDelta,
    overlayBodyScrollDelta,
    pickerResultsScrollDelta,
    pickerSidebarScrollDelta,
    pickerPreviewScrollDelta,
    scrollStable
  };
}

/**
 * Produces the self-contained builder shell with the Phase 13 global state UI.
 */
export function renderCharacterBuilderShell(snapshot = {}) {
  const status = snapshot.builderStatus ?? {};
  const summary = snapshot.builderSummary ?? {};
  const mode = snapshot.config?.mode ?? "edit";
  const exportOnly = isExportOnlyPersistence(snapshot);
  const loadStatus = snapshot.loadStatus ?? "idle";
  const loadedRules = snapshot.loadedResources?.rules ?? {};
  const warningCount = formatCount(summary.warnings?.length ?? status.warningCount);
  const pendingCount = formatCount(summary.pendingChoices?.length ?? status.pendingChoiceCount);
  const blockedCount = formatCount(summary.blockedChoices?.length ?? status.blockedChoiceCount);
  const unresolvedChoices = mergeChoices(summary.pendingChoices, summary.blockedChoices);
  const unresolvedCount = unresolvedChoices.length || pendingCount + blockedCount;
  const characterId = summary.characterId || status.characterId || "new";

  return `
    <section
      class="character-builder-shell"
      data-character-builder
      data-builder-phase="15"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-builder-title"
      aria-describedby="character-builder-subtitle"
      tabindex="-1"
    >
      <header class="character-builder-header">
        <div class="character-builder-title-block">
          <p class="character-builder-kicker">Character Builder</p>
          <h2 id="character-builder-title">Progression Builder</h2>
          <p class="character-builder-subtitle" id="character-builder-subtitle">
            <span>${escapeHtml(formatStatusLabel(mode))}</span>
            <span>${escapeHtml(characterId)}</span>
          </p>
        </div>
        <div class="character-builder-actions">
          ${exportOnly
            ? `<button type="button" class="character-builder-button character-builder-button-primary" data-builder-action="export" title="Downloads draft JSON files. Canonical character files remain DM-controlled.">Export Draft</button>`
            : `
              <button type="button" class="character-builder-button character-builder-button-primary" data-builder-action="save">Save</button>
              <button type="button" class="character-builder-button" data-builder-action="export">Export</button>
            `}
          <button type="button" class="character-builder-button character-builder-button-quiet" data-builder-action="close">Close</button>
        </div>
      </header>

      <div class="character-builder-status-bar" aria-live="polite">
        ${renderStatusPill("Load", loadStatus)}
        ${exportOnly
          ? renderStatusPill("Export Draft", snapshot.exportStatus ?? "idle")
          : `${renderStatusPill("Save", snapshot.saveStatus ?? "idle")}${renderStatusPill("Export", snapshot.exportStatus ?? "idle")}`}
        ${renderStatusPill("Warnings", warningCount, { type: "count", count: warningCount })}
        ${renderStatusPill("Unresolved", unresolvedCount, { type: "count", count: unresolvedCount })}
      </div>

      <main class="character-builder-main">
        ${renderGlobalBuilderStatePanel(snapshot)}
        ${renderAbilityImpactPreview(summary.abilityImpactPreview)}

        <div class="filter-layout character-builder-decision-layout">
          ${renderOutstandingDecisionsPanel(snapshot)}
          ${renderLevelTimeline(snapshot)}
        </div>

        <section class="character-builder-workspace" aria-label="Builder status">
          <article class="character-builder-panel">
            <div class="character-builder-panel-heading">
              <h3>Warnings</h3>
              <span>${escapeHtml(warningCount)}</span>
            </div>
            ${renderWarningList(summary.warnings)}
          </article>

          <article class="character-builder-panel">
            <div class="character-builder-panel-heading">
              <h3>Unresolved Decisions</h3>
              <span>${escapeHtml(unresolvedCount)}</span>
            </div>
            ${renderPendingList(unresolvedChoices)}
          </article>

          ${renderIdentityChoicesPanel(summary.identityChoiceRequirements)}

          ${renderGrantedSpellSourcesPanel(summary.grantedSpellSources)}

          <details class="character-builder-panel character-builder-panel-wide character-builder-disclosure character-builder-advanced-panel">
            <summary>Build Details</summary>
            ${renderClassMix(summary.classes)}
            <div class="character-builder-meta-grid">
              <div>
                <span>Character ID</span>
                <strong>${escapeHtml(characterId)}</strong>
              </div>
              <div>
                <span>Builder Mode</span>
                <strong>${escapeHtml(formatStatusLabel(mode))}</strong>
              </div>
              <div>
                <span>Rules Loaded</span>
                <strong>${escapeHtml(formatCount(loadedRules.classCount))} classes</strong>
              </div>
              <div>
                <span>Spell Sources</span>
                <strong>${escapeHtml(formatCount(loadedRules.spellSourceCount))}</strong>
              </div>
            </div>
          </details>

          <details class="character-builder-panel character-builder-disclosure character-builder-advanced-panel">
            <summary>Load Details (${escapeHtml(formatCount((snapshot.loadIssues ?? []).length))})</summary>
            ${renderLoadIssueList(snapshot.loadIssues)}
          </details>
          ${renderPersistencePanel(snapshot)}
        </section>
      </main>

      ${renderGuidedOverlay(snapshot)}
    </section>
  `;
}

/**
 * DOM renderer owned by CharacterBuilderApp.
 * Rendering stays isolated here so domain state and event wiring do not interpolate
 * HTML directly.
 */
export class CharacterBuilderRenderer {
  #root = null;
  #ownsRoot = false;
  #previousActiveElement = null;
  #previousBodyOverflow = "";
  #previousBodyOverscrollBehavior = "";
  #focusedShell = false;
  #lastOverlayFocusKey = "";

  get root() {
    return this.#root;
  }

  /**
   * Mounts the builder into an existing element or creates a document-level root.
   * Owned roots lock background scroll and remember the opener for focus restore.
   */
  mount(mount) {
    if (typeof document === "undefined") {
      return this;
    }

    this.#previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.#focusedShell = false;
    this.#lastOverlayFocusKey = "";

    const existingTarget = resolveMountTarget(mount);
    if (existingTarget) {
      this.#root = existingTarget;
      this.#ownsRoot = false;
      return this;
    }

    this.#root = document.createElement("div");
    this.#root.className = "character-builder-root";
    document.body.append(this.#root);
    this.#ownsRoot = true;
    this.#lockDocumentScroll();
    return this;
  }

  /**
   * Renders the current app snapshot.
   * Guided overlays are composed from this entry point, then focus is synchronized.
   */
  render(snapshot = {}) {
    if (!this.#root) {
      return this;
    }

    this.#root.innerHTML = renderCharacterBuilderShell(snapshot);
    this.#syncModalFocus(snapshot);
    return this;
  }

  /**
   * Captures builder, overlay, picker, focus, and caret state before a full
   * shell rebuild.
   */
  captureRenderState(options = {}) {
    return captureRenderState(this.#root, options);
  }

  /**
   * Backward-compatible alias for level timeline transactions.
   */
  captureScrollFocusState(options = {}) {
    return this.captureRenderState(options);
  }

  /**
   * Restores scroll, focus, and caret state after a render transaction.
   */
  restoreRenderState(anchor = {}, options = {}) {
    return restoreRenderState(this.#root, anchor, options);
  }

  /**
   * Backward-compatible alias for level timeline transactions.
   */
  restoreScrollFocusState(anchor = {}, options = {}) {
    return this.restoreRenderState(anchor, options);
  }

  /**
   * Renders a snapshot and restores a previously captured render-state anchor.
   */
  renderWithRenderState(snapshot = {}, options = {}) {
    const anchor = options.anchor ?? this.captureRenderState(options);

    this.render(snapshot);
    return this.restoreRenderState(anchor, options);
  }

  /**
   * Backward-compatible alias for level timeline transactions.
   */
  renderWithScrollFocus(snapshot = {}, options = {}) {
    return this.renderWithRenderState(snapshot, options);
  }

  /**
   * Prevents background page scroll while an owned modal root is open.
   */
  #lockDocumentScroll() {
    if (typeof document === "undefined" || !this.#ownsRoot) {
      return;
    }

    this.#previousBodyOverflow = document.body.style.overflow;
    this.#previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
  }

  /**
   * Restores body scroll styles changed by #lockDocumentScroll().
   */
  #unlockDocumentScroll() {
    if (typeof document === "undefined" || !this.#ownsRoot) {
      return;
    }

    document.body.style.overflow = this.#previousBodyOverflow;
    document.body.style.overscrollBehavior = this.#previousBodyOverscrollBehavior;
    this.#previousBodyOverflow = "";
    this.#previousBodyOverscrollBehavior = "";
  }

  /**
   * Moves focus to the shell or newly opened guided overlay without stealing it
   * on ordinary re-renders.
   */
  #syncModalFocus(snapshot = {}) {
    const overlayKey = getOverlayFocusKey(snapshot);
    const overlay = this.#root.querySelector("[data-guided-overlay-form]");
    const shell = this.#root.querySelector("[data-character-builder]");

    if (overlay && overlayKey !== this.#lastOverlayFocusKey) {
      this.#lastOverlayFocusKey = overlayKey;
      focusWithoutScroll(findInitialFocusTarget(overlay));
      return;
    }

    if (!overlay && this.#lastOverlayFocusKey) {
      this.#lastOverlayFocusKey = "";
      focusWithoutScroll(shell);
      return;
    }

    if (!this.#focusedShell && shell) {
      this.#focusedShell = true;
      focusWithoutScroll(shell);
    }
  }

  /**
   * Gives focus back to the element that opened the builder when possible.
   */
  #restorePreviousFocus() {
    if (this.#previousActiveElement?.isConnected) {
      focusWithoutScroll(this.#previousActiveElement);
    }

    this.#previousActiveElement = null;
  }

  /**
   * Removes the owned root or clears an externally supplied mount target.
   * Called by CharacterBuilderApp.close().
   */
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
    this.#lastOverlayFocusKey = "";
    return this;
  }
}
