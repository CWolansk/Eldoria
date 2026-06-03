import {
  createSheetRulesContext,
  getArmorClassBreakdown
} from "./sheet-rules.js";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function splitRuleParagraphs(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return ["No additional rules text is recorded for this entry."];
  }

  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function isEditableSheetMode(mode) {
  return mode === "play" || mode === "edit";
}

function formatHpDisplay(character = {}) {
  const current = character.hp?.current ?? 0;
  const max = character.hp?.max ?? character.hp?.base ?? 0;
  const temp = Number(character.hp?.temp ?? 0);
  return `${current} / ${max}${temp > 0 ? ` +${temp} temp` : ""}`;
}

function formatDefenseList(values = []) {
  const entries = toArray(values).map((entry) => String(entry ?? "").trim()).filter(Boolean);
  return entries.length ? entries.join(", ") : "None recorded";
}

function renderDetailRows(rows = []) {
  return `
    <div class="compact-list">
      ${rows.filter(Boolean).map((row) => `
        <div class="label-row">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value ?? "-")}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderDetailNumberControl(name, value = 0, options = {}) {
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

function renderDetailActionButton(action, label, attributes = {}, options = {}) {
  const tone = options.quiet ? " character-sheet-table-button-quiet" : options.danger ? " character-sheet-table-button-danger" : "";
  const attributeText = Object.entries(attributes)
    .filter(([, value]) => value != null && value !== "")
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join("");

  return `<button type="button" class="character-sheet-table-button${tone}" data-sheet-action="${escapeHtml(action)}"${attributeText}>${escapeHtml(label)}</button>`;
}

function createRulesContext(snapshot = {}, character = {}) {
  return createSheetRulesContext({
    rulesCatalog: snapshot.rulesCatalog ?? snapshot.normalizedCatalog,
    rulesProfile: snapshot.rulesProfile ?? character.sourcePolicy ?? {},
    allowedSources: snapshot.rulesProfile?.allowedSources ?? character.sourcePolicy?.allowedSources ?? []
  });
}

function renderHpDetailBody(character = {}, mode = "view") {
  const canEdit = isEditableSheetMode(mode);
  const hitDice = toArray(character.hitDice);
  const deathSaves = character.deathSaves ?? {};
  const defenses = character.defenses ?? {};

  return `
    <section class="character-sheet-detail-section">
      <h3>Hit Points</h3>
      ${renderDetailRows([
        { label: "Current / Max", value: formatHpDisplay(character) },
        { label: "Base Max", value: character.hp?.base ?? 0 },
        { label: "Temporary", value: character.hp?.temp ?? 0 }
      ])}
      ${canEdit ? `
        <div class="inventory-control-row" data-sheet-control-group>
          ${renderDetailNumberControl("hp-detail-amount", 1, { label: "HP amount", min: 0 })}
          ${renderDetailActionButton("hp-damage", "Damage", { "data-amount-control": "hp-detail-amount" }, { danger: true })}
          ${renderDetailActionButton("hp-heal", "Heal", { "data-amount-control": "hp-detail-amount" })}
          ${renderDetailActionButton("hp-sync-max", "Full HP", {}, { quiet: true })}
        </div>
        <div class="inventory-control-row" data-sheet-control-group>
          ${renderDetailNumberControl("hp-detail-temp", character.hp?.temp ?? 0, { label: "Temporary HP", min: 0 })}
          ${renderDetailActionButton("hp-temp", "Set Temp", { "data-amount-control": "hp-detail-temp" }, { quiet: true })}
        </div>
      ` : ""}
    </section>
    <section class="character-sheet-detail-section">
      <h3>Hit Dice</h3>
      ${hitDice.length ? `
        <div class="compact-list">
          ${hitDice.map((die, index) => `
            <div class="label-row" data-sheet-control-group>
              <span>${escapeHtml([die.class, die.size].filter(Boolean).join(" ") || "Hit Die")}</span>
              <strong>${escapeHtml(die.remaining ?? 0)} / ${escapeHtml(die.total ?? 0)}</strong>
              ${canEdit ? `
                <span class="inventory-control-row">
                  ${renderDetailActionButton("hit-die-adjust", "-", { "data-index": index, "data-delta": "-1" }, { quiet: true })}
                  ${renderDetailActionButton("hit-die-adjust", "+", { "data-index": index, "data-delta": "1" })}
                  ${renderDetailActionButton("hit-die-reset", "Reset", { "data-index": index }, { quiet: true })}
                </span>
              ` : ""}
            </div>
          `).join("")}
        </div>
      ` : `<p>No hit dice recorded.</p>`}
    </section>
    <section class="character-sheet-detail-section">
      <h3>Death Saves</h3>
      ${renderDetailRows([
        { label: "Successes", value: `${deathSaves.successes ?? 0} / 3` },
        { label: "Failures", value: `${deathSaves.failures ?? 0} / 3` }
      ])}
      ${canEdit ? `
        <div class="inventory-control-row">
          ${renderDetailActionButton("death-save-success", "+ Success", { "data-delta": "1" }, { quiet: true })}
          ${renderDetailActionButton("death-save-failure", "+ Failure", { "data-delta": "1" }, { danger: true })}
          ${renderDetailActionButton("death-save-reset", "Clear", {}, { quiet: true })}
        </div>
      ` : ""}
    </section>
    <section class="character-sheet-detail-section">
      <h3>Resistances</h3>
      ${renderDetailRows([
        { label: "Resistances", value: formatDefenseList(defenses.damageResistances) },
        { label: "Immunities", value: formatDefenseList([...toArray(defenses.damageImmunities), ...toArray(defenses.conditionImmunities)]) },
        { label: "Vulnerabilities", value: formatDefenseList(defenses.damageVulnerabilities) }
      ])}
    </section>
  `;
}

function renderAcDetailBody(snapshot = {}) {
  const character = snapshot.character ?? {};
  const armorClass = getArmorClassBreakdown(character, createRulesContext(snapshot, character));
  const modifierRows = toArray(character.ac?.modifiers)
    .map((modifier) => {
      const active = modifier?.active === false ? "inactive" : "active";
      const amount = Number(modifier?.amount ?? 0);
      const sign = amount >= 0 ? `+${amount}` : String(amount);
      return {
        label: modifier?.name || modifier?.source || "Modifier",
        value: [sign, active, modifier?.conditional].filter(Boolean).join(" | ")
      };
    });

  return `
    <section class="character-sheet-detail-section">
      <h3>Armor Class</h3>
      ${renderDetailRows([
        { label: "Current AC", value: character.ac?.value ?? "-" },
        { label: "Breakdown", value: armorClass.formula || `Stored AC ${character.ac?.value ?? "-"}` },
        armorClass.armorName ? { label: "Armor", value: armorClass.armorName } : null,
        armorClass.shieldName ? { label: "Shield", value: armorClass.shieldName } : null,
        armorClass.overridden ? { label: "Manual note", value: armorClass.note || "Stored AC overrides computed AC." } : null
      ])}
    </section>
    <section class="character-sheet-detail-section">
      <h3>Recorded Modifiers</h3>
      ${modifierRows.length ? renderDetailRows(modifierRows) : `<p>No AC modifiers recorded.</p>`}
    </section>
  `;
}

export class CharacterSheetEvents {
  #root = null;
  #controller = null;

  #escapeControlName(value) {
    const text = String(value ?? "");
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(text);
    }

    return text.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  }

  #readControlValue(button, controlName) {
    const name = String(controlName ?? "").trim();
    if (!name || !this.#root?.querySelector) {
      return "";
    }

    const selector = `[data-sheet-control="${this.#escapeControlName(name)}"]`;
    const group = button.closest("[data-sheet-control-group]");
    const target = group?.querySelector?.(selector)
      ?? this.#root.querySelector(selector);
    return target?.value ?? "";
  }

  #readAmount(button) {
    return button.dataset.amount
      ?? this.#readControlValue(button, button.dataset.amountControl)
      ?? 1;
  }

  #readCondition(button) {
    for (const value of [
      button.dataset.condition,
      this.#readControlValue(button, button.dataset.conditionInput),
      this.#readControlValue(button, button.dataset.conditionSelect)
    ]) {
      const text = String(value ?? "").trim();
      if (text) {
        return text;
      }
    }

    return "";
  }

  #collectTableStatePayload(button) {
    const amount = this.#readAmount(button);
    const payload = {
      amount,
      delta: button.dataset.delta,
      index: button.dataset.index,
      classIndex: button.dataset.classIndex
        ?? this.#readControlValue(button, button.dataset.classIndexControl),
      level: button.dataset.level,
      spellLevel: button.dataset.spellLevel
        ?? this.#readControlValue(button, button.dataset.spellLevelControl),
      mode: button.dataset.mode,
      ability: button.dataset.ability,
      proficient: button.dataset.proficient,
      list: button.dataset.list
        ?? this.#readControlValue(button, button.dataset.listControl),
      condition: this.#readCondition(button),
      coin: button.dataset.coin,
      price: button.dataset.price
        ?? this.#readControlValue(button, button.dataset.priceControl),
      priceCoin: button.dataset.priceCoin
        ?? this.#readControlValue(button, button.dataset.priceCoinControl),
      priceCp: button.dataset.priceCp,
      name: button.dataset.name
        ?? this.#readControlValue(button, button.dataset.nameControl),
      ref: button.dataset.ref
        ?? this.#readControlValue(button, button.dataset.refControl),
      source: button.dataset.source
        ?? this.#readControlValue(button, button.dataset.sourceControl),
      school: button.dataset.school
        ?? this.#readControlValue(button, button.dataset.schoolControl),
      spell: button.dataset.spell
        ?? this.#readControlValue(button, button.dataset.spellControl),
      notes: button.dataset.notes
        ?? this.#readControlValue(button, button.dataset.notesControl),
      quantity: button.dataset.quantity
        ?? this.#readControlValue(button, button.dataset.quantityControl),
      slot: button.dataset.slot
        ?? this.#readControlValue(button, button.dataset.slotControl),
      value: button.dataset.value
        ?? this.#readControlValue(button, button.dataset.valueControl),
      equipped: button.dataset.equipped
    };

    if (button.dataset.deltaSign) {
      payload.delta = Number(amount) * Number(button.dataset.deltaSign);
    } else if (payload.delta == null || payload.delta === "") {
      payload.delta = payload.amount;
    }

    return payload;
  }

  #confirmAction(button) {
    const message = button.dataset.confirmMessage;
    if (!message) {
      return true;
    }

    if (typeof window === "undefined" || typeof window.confirm !== "function") {
      return true;
    }

    return window.confirm(message);
  }

  #confirmUnsaved(app, action = "close") {
    if (!app?.getSnapshot?.().isDirty) {
      return true;
    }

    if (typeof window === "undefined" || typeof window.confirm !== "function") {
      return false;
    }

    const message = action === "reload"
      ? "Reload this character and discard unsaved sheet changes?"
      : "Close this sheet and discard unsaved changes?";
    return window.confirm(message);
  }

  #isSaveShortcut(event) {
    return (event.ctrlKey || event.metaKey) && String(event.key ?? "").toLowerCase() === "s";
  }

  #isExportOnly(app) {
    return app?.getSnapshot?.().config?.persistenceMode === "export-only";
  }

  #exportDraft(app) {
    app.export?.({
      download: true,
      touchModified: true
    });
  }

  #getOwnedShell() {
    return this.#root?.querySelector?.('[data-character-sheet][data-character-sheet-mount="owned"]') ?? null;
  }

  #getFocusableElements(container) {
    if (!container?.querySelectorAll) {
      return [];
    }

    return [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
      .filter((element) => element.isConnected)
      .filter((element) => element.getAttribute("aria-hidden") !== "true");
  }

  #focusWithoutScroll(element) {
    if (!element?.focus) {
      return;
    }

    try {
      element.focus({ preventScroll: true });
    } catch (_error) {
      element.focus();
    }
  }

  #trapFocus(event, container) {
    const focusable = this.#getFocusableElements(container);
    const doc = container?.ownerDocument ?? (typeof document !== "undefined" ? document : null);

    if (!focusable.length) {
      event.preventDefault();
      this.#focusWithoutScroll(container);
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = doc?.activeElement;

    if (event.shiftKey && (!container.contains(active) || active === first)) {
      event.preventDefault();
      this.#focusWithoutScroll(last);
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      this.#focusWithoutScroll(first);
    } else if (!container.contains(active)) {
      event.preventDefault();
      this.#focusWithoutScroll(first);
    }
  }

  #getTabButtons() {
    return [...(this.#root?.querySelectorAll?.("[data-sheet-tab]") ?? [])]
      .filter((button) => !button.disabled && button.getAttribute("aria-disabled") !== "true");
  }

  #getNextTabId(activeButton, key) {
    const buttons = this.#getTabButtons();
    if (!buttons.length) {
      return "";
    }

    const currentIndex = Math.max(0, buttons.indexOf(activeButton));
    const lastIndex = buttons.length - 1;
    const nextIndex = {
      ArrowRight: currentIndex === lastIndex ? 0 : currentIndex + 1,
      ArrowDown: currentIndex === lastIndex ? 0 : currentIndex + 1,
      ArrowLeft: currentIndex === 0 ? lastIndex : currentIndex - 1,
      ArrowUp: currentIndex === 0 ? lastIndex : currentIndex - 1,
      Home: 0,
      End: lastIndex
    }[key];

    return Number.isInteger(nextIndex) ? buttons[nextIndex]?.dataset.sheetTab ?? "" : "";
  }

  #focusActiveTab(tabId) {
    const selector = `[data-sheet-tab="${this.#escapeControlName(tabId)}"]`;
    const target = this.#root?.querySelector?.(selector)
      ?? this.#root?.querySelector?.('[data-sheet-tab][aria-selected="true"]');
    this.#focusWithoutScroll(target);
  }

  #getRuleDialog() {
    return this.#root?.querySelector?.("[data-rule-detail-dialog]") ?? null;
  }

  #closeRuleDialog() {
    this.#getRuleDialog()?.remove();
  }

  #openRuleDialog(trigger) {
    if (!trigger?.dataset?.ruleDetail) {
      return false;
    }

    this.#closeRuleDialog();
    const title = trigger.dataset.ruleTitle || "Rule Detail";
    const subtitle = trigger.dataset.ruleSubtitle || "";
    const body = trigger.dataset.ruleBody || "";
    const dialog = document.createElement("div");
    dialog.className = "character-sheet-rule-dialog-backdrop";
    dialog.dataset.ruleDetailDialog = "true";
    dialog.innerHTML = `
      <section
        class="character-sheet-rule-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-sheet-rule-dialog-title"
        aria-describedby="character-sheet-rule-dialog-body"
        tabindex="-1"
      >
        <header>
          <div>
            <h2 id="character-sheet-rule-dialog-title">${escapeHtml(title)}</h2>
            ${subtitle ? `<p class="character-sheet-rule-dialog-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          </div>
          <button type="button" class="character-sheet-rule-dialog-close" data-rule-detail-close>Close</button>
        </header>
        <div class="character-sheet-rule-dialog-body" id="character-sheet-rule-dialog-body">
          ${splitRuleParagraphs(body).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </div>
      </section>
    `;
    this.#root.append(dialog);
    this.#focusWithoutScroll(dialog.querySelector("[data-rule-detail-close]") ?? dialog.querySelector("[role='dialog']"));
    return true;
  }

  #openSheetDetailDialog(kind, app) {
    const snapshot = app?.getSnapshot?.() ?? {};
    const character = snapshot.character ?? null;
    if (!character) {
      return false;
    }

    const detailKind = String(kind ?? "").trim().toLowerCase();
    const title = detailKind === "ac" ? "Armor Class Details" : "Hit Point Details";
    const subtitle = detailKind === "ac"
      ? `Current AC ${character.ac?.value ?? "-"}`
      : `HP ${formatHpDisplay(character)}`;
    const body = detailKind === "ac"
      ? renderAcDetailBody(snapshot)
      : renderHpDetailBody(character, snapshot.config?.mode ?? "view");

    this.#closeRuleDialog();
    const dialog = document.createElement("div");
    dialog.className = "character-sheet-rule-dialog-backdrop";
    dialog.dataset.ruleDetailDialog = "true";
    dialog.dataset.sheetDetailDialog = detailKind === "ac" ? "ac" : "hp";
    dialog.innerHTML = `
      <section
        class="character-sheet-rule-dialog character-sheet-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-sheet-rule-dialog-title"
        aria-describedby="character-sheet-rule-dialog-body"
        tabindex="-1"
      >
        <header>
          <div>
            <h2 id="character-sheet-rule-dialog-title">${escapeHtml(title)}</h2>
            <p class="character-sheet-rule-dialog-subtitle">${escapeHtml(subtitle)}</p>
          </div>
          <button type="button" class="character-sheet-rule-dialog-close" data-rule-detail-close>Close</button>
        </header>
        <div class="character-sheet-rule-dialog-body" id="character-sheet-rule-dialog-body">
          ${body}
        </div>
      </section>
    `;
    this.#root.append(dialog);
    this.#focusWithoutScroll(dialog.querySelector("[data-rule-detail-close]") ?? dialog.querySelector("[role='dialog']"));
    return true;
  }

  #getLibraryTemplate(kind) {
    const libraryKind = String(kind ?? "").trim().toLowerCase();
    if (!libraryKind || !this.#root?.querySelector) {
      return null;
    }

    return this.#root.querySelector(`template[data-library-template="${this.#escapeControlName(libraryKind)}"]`);
  }

  #openLibraryModal(trigger) {
    const kind = trigger?.dataset?.libraryKind ?? "";
    const template = this.#getLibraryTemplate(kind);
    if (!template) {
      return false;
    }

    const libraryKind = String(kind).trim().toLowerCase();
    this.#closeRuleDialog();
    const dialog = document.createElement("div");
    dialog.className = "character-sheet-rule-dialog-backdrop";
    dialog.dataset.ruleDetailDialog = "true";
    dialog.dataset.libraryDialog = libraryKind;
    dialog.innerHTML = `
      <section
        class="character-sheet-rule-dialog character-sheet-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-sheet-rule-dialog-title"
        tabindex="-1"
      >
        <header>
          <div>
            <h2 id="character-sheet-rule-dialog-title">${escapeHtml(libraryKind === "spell" ? "Spell Library" : "Item Library")}</h2>
            <p class="character-sheet-rule-dialog-subtitle">Filter the loaded catalog, then select a row for full details.</p>
          </div>
          <button type="button" class="character-sheet-rule-dialog-close" data-rule-detail-close>Close</button>
        </header>
        <div class="character-sheet-rule-dialog-body character-sheet-library-dialog-body">
          ${template.innerHTML}
        </div>
      </section>
    `;
    this.#root.append(dialog);
    const libraryModal = dialog.querySelector("[data-library-modal]");
    this.#filterLibraryModal(libraryModal);
    this.#focusWithoutScroll(dialog.querySelector("[data-library-filter='search']") ?? dialog.querySelector("[data-rule-detail-close]") ?? dialog.querySelector("[role='dialog']"));
    return true;
  }

  #isCardRuleClick(event, target) {
    if (!target?.matches?.("[data-rule-detail]")) {
      return false;
    }

    const interactive = event.target?.closest?.([
      "[data-rule-detail-button]",
      "[data-sheet-action]",
      "[data-sheet-tab]",
      "button",
      "a[href]",
      "input",
      "select",
      "textarea"
    ].join(","));

    return !interactive || interactive === target;
  }

  #handleTabKeydown(event, app) {
    const tabButton = event.target?.closest?.("[data-sheet-tab]");
    if (!tabButton || !this.#root?.contains?.(tabButton)) {
      return false;
    }

    const nextTabId = this.#getNextTabId(tabButton, event.key);
    if (!nextTabId) {
      return false;
    }

    event.preventDefault();
    const result = app.setActiveTab?.(nextTabId);
    this.#focusActiveTab(result?.activeTab ?? nextTabId);
    return true;
  }

  #handleRuleDetailKeydown(event) {
    if (!["Enter", " "].includes(event.key)) {
      return false;
    }

    const target = event.target?.closest?.("[data-rule-detail]");
    if (!target || !this.#root?.contains?.(target)) {
      return false;
    }

    const interactive = event.target?.closest?.([
      "[data-rule-detail-button]",
      "[data-sheet-action]",
      "button",
      "a[href]",
      "input",
      "select",
      "textarea"
    ].join(","));
    if (interactive && interactive !== target) {
      return false;
    }

    event.preventDefault();
    return this.#openRuleDialog(target);
  }

  #getLibraryFilterValue(control) {
    if (control?.type === "checkbox") {
      return control.checked ? String(control.value || "true").trim().toLowerCase() : "";
    }

    return String(control?.value ?? "").trim().toLowerCase();
  }

  #getLibraryRowValue(row, key) {
    switch (key) {
      case "search":
        return String(row.dataset.libraryFilter ?? "").toLowerCase();
      case "level":
        return String(row.dataset.libraryLevel ?? "").toLowerCase();
      case "school":
        return String(row.dataset.librarySchool ?? "").toLowerCase();
      case "source":
        return String(row.dataset.librarySource ?? "").toLowerCase();
      case "ritual":
        return String(row.dataset.libraryRitual ?? "").toLowerCase();
      case "concentration":
        return String(row.dataset.libraryConcentration ?? "").toLowerCase();
      case "type":
        return String(row.dataset.libraryType ?? "").toLowerCase();
      case "rarity":
        return String(row.dataset.libraryRarity ?? "").toLowerCase();
      case "attunement":
        return String(row.dataset.libraryAttunement ?? "").toLowerCase();
      default:
        return "";
    }
  }

  #selectLibraryRow(row) {
    const modal = row?.closest?.("[data-library-modal]");
    if (!modal) {
      return false;
    }

    for (const candidate of modal.querySelectorAll("[data-library-row]")) {
      candidate.removeAttribute("aria-selected");
      candidate.classList.remove("character-sheet-library-row-selected");
    }

    row.setAttribute("aria-selected", "true");
    row.classList.add("character-sheet-library-row-selected");

    const detailPane = modal.querySelector("[data-library-detail]");
    const template = row.querySelector("template[data-library-row-detail]");
    if (detailPane) {
      detailPane.innerHTML = template?.innerHTML
        || `<p class="fine-print">${escapeHtml(row.querySelector(".character-sheet-record-main strong")?.textContent ?? "No detail available.")}</p>`;
    }

    return true;
  }

  #filterLibraryModal(controlOrModal) {
    const modal = controlOrModal?.matches?.("[data-library-modal]")
      ? controlOrModal
      : controlOrModal?.closest?.("[data-library-modal]");
    if (!modal) {
      return false;
    }

    const filters = [...modal.querySelectorAll("[data-library-filter]")]
      .map((control) => [control.dataset.libraryFilter, this.#getLibraryFilterValue(control)])
      .filter(([key, value]) => key && value);
    let visibleCount = 0;
    let selectedVisible = null;
    let firstVisible = null;

    for (const row of modal.querySelectorAll("[data-library-row]")) {
      const hidden = filters.some(([key, value]) => {
        const rowValue = this.#getLibraryRowValue(row, key);
        return key === "search"
          ? !rowValue.includes(value)
          : rowValue !== value;
      });
      row.hidden = hidden;
      row.classList.toggle("character-sheet-library-row-hidden", hidden);
      if (!hidden) {
        visibleCount += 1;
        firstVisible ??= row;
        if (row.getAttribute("aria-selected") === "true") {
          selectedVisible = row;
        }
      }
    }

    const countTarget = modal.querySelector("[data-library-count]");
    if (countTarget) {
      countTarget.textContent = `${visibleCount} shown`;
    }

    if (selectedVisible) {
      this.#selectLibraryRow(selectedVisible);
    } else if (firstVisible) {
      this.#selectLibraryRow(firstVisible);
    } else {
      const detailPane = modal.querySelector("[data-library-detail]");
      if (detailPane) {
        detailPane.innerHTML = `<p class="fine-print">No matching catalog entries.</p>`;
      }
    }

    return true;
  }

  #clearLibraryFilters(button) {
    const modal = button?.closest?.("[data-library-modal]");
    if (!modal) {
      return false;
    }

    for (const control of modal.querySelectorAll("[data-library-filter]")) {
      if (control.type === "checkbox") {
        control.checked = false;
      } else {
        control.value = "";
      }
    }

    return this.#filterLibraryModal(modal);
  }

  #filterFeatures(control) {
    const browser = control?.closest?.("[data-feature-browser]");
    if (!browser) {
      return false;
    }

    const query = String(browser.querySelector("[data-feature-search]")?.value ?? "").trim().toLowerCase();
    const source = String(browser.querySelector("[data-feature-source-filter]")?.value ?? "").trim();
    let visibleCount = 0;
    const cards = browser.querySelectorAll("[data-feature-card]");
    for (const card of cards) {
      const haystack = String(card.dataset.featureFilter ?? "").toLowerCase();
      const cardSource = String(card.dataset.featureSource ?? "");
      const hidden = (Boolean(query) && !haystack.includes(query))
        || (Boolean(source) && cardSource !== source);
      card.hidden = hidden;
      card.classList.toggle("character-sheet-feature-hidden", hidden);
      if (!hidden) {
        visibleCount += 1;
      }
    }

    for (const group of browser.querySelectorAll("[data-feature-group-section]")) {
      const groupCards = [...group.querySelectorAll("[data-feature-card]")];
      group.hidden = groupCards.length > 0 && groupCards.every((card) => card.hidden);
    }

    const countTarget = browser.querySelector("[data-feature-count]");
    if (countTarget) {
      countTarget.textContent = `${visibleCount} shown`;
    }

    return true;
  }

  bind({ app, root }) {
    this.unbind();
    this.#controller = new AbortController();
    this.#root = root ?? null;

    if (!this.#root) {
      return this;
    }

    this.#root.addEventListener("click", (event) => {
      if (event.target?.closest?.("[data-rule-detail-close]") || event.target?.matches?.("[data-rule-detail-dialog]")) {
        event.preventDefault();
        this.#closeRuleDialog();
        return;
      }

      const libraryClear = event.target?.closest?.("[data-library-clear]");
      if (libraryClear && this.#root.contains(libraryClear)) {
        event.preventDefault();
        this.#clearLibraryFilters(libraryClear);
        return;
      }

      const libraryRow = event.target?.closest?.("[data-library-row]");
      if (libraryRow && this.#root.contains(libraryRow)) {
        const interactive = event.target?.closest?.("button,a[href],input,select,textarea,[data-sheet-action]");
        if (!interactive) {
          event.preventDefault();
          this.#selectLibraryRow(libraryRow);
          return;
        }
      }

      const ruleButton = event.target?.closest?.("[data-rule-detail-button]");
      if (ruleButton && this.#root.contains(ruleButton)) {
        event.preventDefault();
        this.#openRuleDialog(ruleButton);
        return;
      }

      const ruleCard = event.target?.closest?.("[data-rule-detail]");
      if (ruleCard && this.#root.contains(ruleCard) && this.#isCardRuleClick(event, ruleCard)) {
        event.preventDefault();
        this.#openRuleDialog(ruleCard);
        return;
      }

      const tabButton = event.target.closest("[data-sheet-tab]");
      if (tabButton) {
        if (tabButton.disabled || tabButton.getAttribute("aria-disabled") === "true") {
          return;
        }

        event.preventDefault();
        const result = app.setActiveTab?.(tabButton.dataset.sheetTab);
        this.#focusActiveTab(result?.activeTab ?? tabButton.dataset.sheetTab);
        return;
      }

      const button = event.target.closest("[data-sheet-action]");
      if (!button) {
        return;
      }

      if (button.disabled || button.getAttribute("aria-disabled") === "true") {
        return;
      }

      event.preventDefault();
      const action = button.dataset.sheetAction;
      if (action === "save") {
        if (this.#isExportOnly(app)) {
          this.#exportDraft(app);
          return;
        }

        void app.save().catch((error) => app.handleError?.(error));
        return;
      }

      if (action === "export") {
        this.#exportDraft(app);
        return;
      }

      if (action === "reload") {
        if (this.#confirmUnsaved(app, "reload")) {
          void app.load(undefined, { force: true }).catch((error) => app.handleError?.(error));
        }
        return;
      }

      if (action === "open-builder") {
        void Promise.resolve(app.openBuilder()).catch((error) => app.handleError?.(error));
        return;
      }

      if (action === "library-open") {
        this.#openLibraryModal(button);
        return;
      }

      if (action === "hp-details" || action === "ac-details") {
        this.#openSheetDetailDialog(action === "ac-details" ? "ac" : "hp", app);
        return;
      }

      if (typeof app.applyTableStateAction === "function") {
        if (!this.#confirmAction(button)) {
          return;
        }

        const openDetailKind = button.closest("[data-sheet-detail-dialog]")?.dataset.sheetDetailDialog ?? "";
        const result = app.applyTableStateAction(action, this.#collectTableStatePayload(button));
        if (result?.ok && openDetailKind) {
          this.#openSheetDetailDialog(openDetailKind, app);
        }
      }
    }, {
      signal: this.#controller.signal
    });

    this.#root.addEventListener("input", (event) => {
      const libraryFilter = event.target?.closest?.("[data-library-filter]");
      if (libraryFilter && this.#root.contains(libraryFilter)) {
        this.#filterLibraryModal(libraryFilter);
      }

      const featureInput = event.target?.closest?.("[data-feature-search]");
      if (featureInput && this.#root.contains(featureInput)) {
        this.#filterFeatures(featureInput);
      }
    }, {
      signal: this.#controller.signal
    });

    this.#root.addEventListener("change", (event) => {
      const libraryFilter = event.target?.closest?.("[data-library-filter]");
      if (libraryFilter && this.#root.contains(libraryFilter)) {
        this.#filterLibraryModal(libraryFilter);
      }

      const featureFilter = event.target?.closest?.("[data-feature-source-filter]");
      if (featureFilter && this.#root.contains(featureFilter)) {
        this.#filterFeatures(featureFilter);
      }
    }, {
      signal: this.#controller.signal
    });

    this.#root.addEventListener("error", (event) => {
      const image = event.target?.closest?.("[data-character-portrait-image]");
      if (!image || !this.#root?.contains?.(image)) {
        return;
      }

      const portrait = image.closest("[data-character-portrait]");
      portrait?.classList.add("portrait-missing");
      const fallback = portrait?.querySelector?.(".portrait-fallback");
      fallback?.removeAttribute("aria-hidden");
      image.remove();
    }, {
      capture: true,
      signal: this.#controller.signal
    });

    this.#root.addEventListener("keydown", (event) => {
      if (["Enter", " "].includes(event.key)) {
        const libraryRow = event.target?.closest?.("[data-library-row]");
        if (libraryRow && this.#root.contains(libraryRow)) {
          event.preventDefault();
          this.#selectLibraryRow(libraryRow);
          return;
        }
      }

      if (this.#handleRuleDetailKeydown(event)) {
        return;
      }

      this.#handleTabKeydown(event, app);
    }, {
      signal: this.#controller.signal
    });

    const beforeUnloadHandler = (event) => {
      if (!app?.getSnapshot?.().isDirty) {
        return undefined;
      }

      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    const keydownHandler = (event) => {
      if (!this.#root?.isConnected || event.defaultPrevented) {
        return undefined;
      }

      const ownedShell = this.#getOwnedShell();
      const ruleDialog = this.#getRuleDialog()?.querySelector?.("[role='dialog']");

      if (ruleDialog) {
        if (event.key === "Tab") {
          this.#trapFocus(event, ruleDialog);
          return undefined;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          this.#closeRuleDialog();
          return undefined;
        }
      }

      if (event.key === "Tab" && ownedShell) {
        this.#trapFocus(event, ownedShell);
        return undefined;
      }

      if (event.key === "Escape" && ownedShell) {
        event.preventDefault();
        if (this.#confirmUnsaved(app, "close")) {
          app.close({ force: true });
        }
        return undefined;
      }

      if (!this.#isSaveShortcut(event)) {
        return undefined;
      }

      event.preventDefault();
      if (this.#isExportOnly(app)) {
        this.#exportDraft(app);
        return undefined;
      }

      void app.save().catch((error) => app.handleError?.(error));
      return undefined;
    };

    const doc = this.#root.ownerDocument ?? (typeof document !== "undefined" ? document : null);
    if (doc?.addEventListener) {
      doc.addEventListener("keydown", keydownHandler, {
        capture: true,
        signal: this.#controller.signal
      });
    }

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("beforeunload", beforeUnloadHandler, {
        signal: this.#controller.signal
      });
    }

    return this;
  }

  unbind() {
    this.#controller?.abort();
    this.#controller = null;
    this.#root = null;
    return this;
  }
}
