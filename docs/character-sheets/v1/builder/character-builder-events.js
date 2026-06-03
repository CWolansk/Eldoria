const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const INLINE_PICK_TYPES = new Set(["skill", "tool", "language"]);
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
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

function escapeAttributeSelector(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}

function getPickerFieldFocusState(fieldTarget) {
  const fieldKind = fieldTarget?.dataset?.identityFeatPickerField ? "identity-feat" : "picker";
  const pickerField = String(fieldTarget?.dataset?.builderPickerField ?? fieldTarget?.dataset?.identityFeatPickerField ?? "").trim();
  if (!pickerField) {
    return null;
  }

  return {
    fieldKind,
    pickerField,
    selectionStart: Number.isFinite(fieldTarget.selectionStart) ? fieldTarget.selectionStart : null,
    selectionEnd: Number.isFinite(fieldTarget.selectionEnd) ? fieldTarget.selectionEnd : null
  };
}

function restorePickerFieldFocus(root, state) {
  if (!root || !state?.pickerField) {
    return;
  }

  const attribute = state.fieldKind === "identity-feat"
    ? "data-identity-feat-picker-field"
    : "data-builder-picker-field";
  const selector = `[${attribute}="${escapeAttributeSelector(state.pickerField)}"]`;
  const target = root.querySelector(selector);
  if (!target?.focus) {
    return;
  }

  try {
    target.focus({ preventScroll: true });
  } catch (_error) {
    target.focus();
  }

  if (
    typeof target.setSelectionRange === "function"
    && state.selectionStart !== null
    && state.selectionEnd !== null
  ) {
    target.setSelectionRange(state.selectionStart, state.selectionEnd);
  }
}

function getFeatPickerContext(target) {
  const explicit = String(target?.dataset?.featPickerContext ?? "").trim();
  if (explicit) {
    return explicit;
  }

  const form = target?.closest?.("[data-guided-overlay-form]");
  return form?.dataset?.overlayType === "feat" ? "level" : "identity";
}

function getPositiveChoiceLimit(value, fallback = 1) {
  const count = Number(value ?? fallback);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : fallback;
}

function formatChoiceLimitReason(count) {
  return `Limit reached: choose up to ${count} option${count === 1 ? "" : "s"}.`;
}

function getInputLabel(input) {
  return input?.closest?.("label") ?? null;
}

function setChoiceDisabled(input, disabled, reason = "") {
  if (!input) {
    return;
  }

  const label = getInputLabel(input);
  const reasonElement = label?.querySelector?.("[data-identity-choice-disabled-reason], [data-level-choice-disabled-reason]");
  const previousReason = input.dataset.identityDisabledReason ?? "";
  input.disabled = Boolean(disabled);
  if (label?.classList?.contains("character-builder-checkbox-card")) {
    label.classList.toggle("character-builder-checkbox-card-disabled", Boolean(disabled));
  }

  if (reason) {
    input.dataset.identityDisabledReason = reason;
    input.setAttribute("title", reason);
    label?.setAttribute?.("title", reason);
    if (reasonElement) {
      reasonElement.hidden = false;
      reasonElement.textContent = reason;
    }
    return;
  }

  if (previousReason && input.getAttribute("title") === previousReason) {
    input.removeAttribute("title");
  }

  if (previousReason && label?.getAttribute?.("title") === previousReason) {
    label.removeAttribute("title");
  }

  delete input.dataset.identityDisabledReason;
  if (reasonElement) {
    reasonElement.hidden = true;
    reasonElement.textContent = "";
  }
}

function syncCheckboxChoiceLimit(row) {
  const limit = getPositiveChoiceLimit(row?.dataset?.identityChoiceCount, 1);
  const inputs = [...(row?.querySelectorAll?.('[data-identity-picker-choice][type="checkbox"]') ?? [])]
    .filter((input) => !input.dataset.identityAsiPatternValue);
  const checkedCount = inputs.filter((input) => input.checked).length;
  const limitReached = checkedCount >= limit;

  for (const input of inputs) {
    const reason = limitReached && !input.checked
      ? formatChoiceLimitReason(limit)
      : "";
    setChoiceDisabled(input, Boolean(reason), reason);
  }
}

function syncLevelChoiceLimit(grid) {
  const inputs = [...(grid?.querySelectorAll?.('[data-level-choice-option][type="checkbox"]') ?? [])];
  if (!inputs.length) {
    return;
  }

  const limit = getPositiveChoiceLimit(grid.dataset.levelChoiceCount, inputs.length);
  const checkedCount = inputs.filter((input) => input.checked).length;
  const limitReached = checkedCount >= limit;

  for (const input of inputs) {
    const staticDisabled = input.dataset.levelChoiceStaticDisabled === "true";
    const staticReason = input.dataset.levelChoiceStaticReason ?? "";
    const reason = staticDisabled
      ? staticReason
      : limitReached && !input.checked
        ? formatChoiceLimitReason(limit)
        : "";
    setChoiceDisabled(input, Boolean(reason), reason);
  }
}

function syncLevelChoiceLimits(container) {
  for (const grid of container?.querySelectorAll?.("[data-level-choice-model]") ?? []) {
    syncLevelChoiceLimit(grid);
  }
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function syncAsiStepperGrid(grid) {
  const cards = [...(grid?.querySelectorAll?.("[data-asi-stepper]") ?? [])];
  if (!cards.length) {
    return;
  }

  const pickLimit = getPositiveChoiceLimit(grid.dataset.asiPickLimit, 2);
  const amountPerPick = getPositiveChoiceLimit(grid.dataset.asiAmountPerPick, 1);
  const abilityCap = getPositiveChoiceLimit(grid.dataset.asiAbilityCap, 20);
  const amounts = cards.map((card) => Math.max(0, toFiniteNumber(card.querySelector("[data-asi-value]")?.value, 0)));
  const totalPicks = amounts.reduce((total, amount) => total + (amount / amountPerPick), 0);

  cards.forEach((card, index) => {
    const input = card.querySelector("[data-asi-value]");
    const amount = amounts[index] ?? 0;
    const current = toFiniteNumber(card.dataset.asiCurrent, 0);
    const next = current + amount;
    const maxByCap = Math.max(0, abilityCap - current);
    const plusDisabled = totalPicks >= pickLimit || amount + amountPerPick > maxByCap;
    const minusDisabled = amount <= 0;
    const reason = amount > maxByCap
      ? `would exceed ${abilityCap}`
      : amount <= 0 && plusDisabled
        ? totalPicks >= pickLimit
          ? formatChoiceLimitReason(pickLimit)
          : `Would exceed ${abilityCap}.`
        : "";

    if (input) {
      input.value = String(amount);
    }

    card.querySelector('[data-asi-step="-1"]')?.toggleAttribute("disabled", minusDisabled);
    card.querySelector('[data-asi-step="1"]')?.toggleAttribute("disabled", plusDisabled);

    const display = card.querySelector("[data-asi-display]");
    if (display) {
      display.textContent = `+${amount}`;
    }

    const nextElement = card.querySelector("[data-asi-next]");
    if (nextElement) {
      nextElement.textContent = amount ? `Next ${next}` : "No change";
    }

    const reasonElement = card.querySelector("[data-asi-reason]");
    if (reasonElement) {
      reasonElement.hidden = !reason;
      reasonElement.textContent = reason;
    }
  });
}

function syncAsiStepperLimits(container) {
  for (const grid of container?.querySelectorAll?.("[data-asi-stepper-grid]") ?? []) {
    syncAsiStepperGrid(grid);
  }
}

function updateAsiStepper(button) {
  const card = button?.closest?.("[data-asi-stepper]");
  const grid = button?.closest?.("[data-asi-stepper-grid]");
  const input = card?.querySelector?.("[data-asi-value]");
  if (!card || !grid || !input) {
    return;
  }

  const pickLimit = getPositiveChoiceLimit(grid.dataset.asiPickLimit, 2);
  const amountPerPick = getPositiveChoiceLimit(grid.dataset.asiAmountPerPick, 1);
  const abilityCap = getPositiveChoiceLimit(grid.dataset.asiAbilityCap, 20);
  const delta = toFiniteNumber(button.dataset.asiStep, 0) * amountPerPick;
  const currentAmount = Math.max(0, toFiniteNumber(input.value, 0));
  const currentScore = toFiniteNumber(card.dataset.asiCurrent, 0);
  const otherAmount = [...grid.querySelectorAll("[data-asi-value]")]
    .filter((item) => item !== input)
    .reduce((total, item) => total + Math.max(0, toFiniteNumber(item.value, 0)), 0);
  const maxByLimit = Math.max(0, (pickLimit * amountPerPick) - otherAmount);
  const maxByCap = Math.max(0, abilityCap - currentScore);
  const maxAmount = Math.min(maxByLimit, maxByCap);
  input.value = String(clampNumber(currentAmount + delta, 0, maxAmount));
  syncAsiStepperGrid(grid);
}

function normalizePatternValue(value = "") {
  return String(value ?? "").trim().replace(/^pattern:/, "");
}

function getActiveAbilityPatternValue(fieldset) {
  const selected = fieldset?.querySelector?.("[data-identity-asi-pattern-selector]:checked")
    ?? fieldset?.querySelector?.("[data-identity-asi-pattern-selector]");
  return normalizePatternValue(selected?.value);
}

function syncAbilityPatternChoice(fieldset) {
  const activePattern = getActiveAbilityPatternValue(fieldset);
  const patterns = [...(fieldset?.querySelectorAll?.("[data-identity-asi-pattern]") ?? [])];

  for (const pattern of patterns) {
    const patternValue = String(pattern.dataset.identityAsiPatternValue ?? "").trim();
    const isActivePattern = patternValue === activePattern;
    const requiresDistinct = pattern.dataset.identityAsiPatternDistinct !== "false";
    const groups = [...pattern.querySelectorAll("[data-identity-asi-group]")];
    const selectedByGroup = new Map();

    pattern.classList.toggle("is-selected", isActivePattern);

    for (const group of groups) {
      const groupId = String(group.dataset.identityAsiGroupId ?? "").trim();
      const selectedAbilities = new Set(
        [...group.querySelectorAll('[data-identity-picker-choice][type="checkbox"]:checked')]
          .map((input) => String(input.dataset.identityAsiAbility ?? "").trim().toLowerCase())
          .filter(Boolean)
      );
      selectedByGroup.set(groupId, selectedAbilities);
    }

    const isSelectedElsewhere = (ability, currentGroupId) => {
      const normalizedAbility = String(ability ?? "").trim().toLowerCase();
      if (!normalizedAbility) {
        return false;
      }

      for (const [groupId, selectedAbilities] of selectedByGroup.entries()) {
        if (groupId !== currentGroupId && selectedAbilities.has(normalizedAbility)) {
          return true;
        }
      }

      return false;
    };

    for (const group of groups) {
      const groupId = String(group.dataset.identityAsiGroupId ?? "").trim();
      const limit = getPositiveChoiceLimit(group.dataset.identityAsiGroupCount, 1);
      const inputs = [...group.querySelectorAll('[data-identity-picker-choice][type="checkbox"]')];
      const checkedCount = inputs.filter((input) => input.checked).length;

      for (const input of inputs) {
        const ability = String(input.dataset.identityAsiAbility ?? "").trim();
        const reason = !isActivePattern
          ? "Inactive ability-score pattern."
          : !input.checked && checkedCount >= limit
            ? formatChoiceLimitReason(limit)
            : !input.checked && requiresDistinct && isSelectedElsewhere(ability, groupId)
              ? "Already selected in another ability-score group."
              : "";

        setChoiceDisabled(input, Boolean(reason), reason);
      }
    }
  }
}

function syncIdentityChoiceLimits(container) {
  if (!container?.querySelectorAll) {
    return;
  }

  for (const row of container.querySelectorAll("[data-identity-choice-limit-row]")) {
    syncCheckboxChoiceLimit(row);
  }

  for (const fieldset of container.querySelectorAll("[data-identity-asi-pattern-choice]")) {
    syncAbilityPatternChoice(fieldset);
  }
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

function validateLevelChoicePayload(form, values = []) {
  const grid = form?.querySelector?.("[data-level-choice-model]");
  if (!grid) {
    return;
  }

  const limit = getPositiveChoiceLimit(grid.dataset.levelChoiceCount, 0);
  if (limit && values.length > limit) {
    throw new Error(`Choose no more than ${limit} option${limit === 1 ? "" : "s"}.`);
  }
}

function normalizeAsiPayload(formData) {
  return ABILITY_KEYS
    .map((ability) => ({
      ability,
      amount: Number(formData.get(`asi-${ability}`) ?? 0)
    }))
    .filter((increase) => Number.isFinite(increase.amount) && increase.amount !== 0);
}

/**
 * Reads a guided overlay form into the app-level mutation payload.
 */
function collectGuidedPayload(form) {
  const formData = new FormData(form);
  const type = form.dataset.overlayType ?? "";
  const characterLevel = Number(form.dataset.characterLevel ?? 0);
  const selectedValue = String(formData.get("selectedValue") ?? "").trim();

  if (type === "ancestry" || type === "background") {
    const choicesById = new Map();
    const activeAsiPatterns = new Map();

    for (const control of form.querySelectorAll("[data-identity-asi-pattern-selector]")) {
      if (!control.checked) {
        continue;
      }

      const choiceId = String(control.dataset.identityChoiceId ?? "").trim();
      const pattern = String(control.value ?? "").trim().replace(/^pattern:/, "");
      if (choiceId && pattern) {
        activeAsiPatterns.set(choiceId, pattern);
      }
    }

    for (const control of form.querySelectorAll("[data-identity-picker-choice]")) {
      const choiceId = String(control.dataset.identityChoiceId ?? "").trim();
      const value = String(control.value ?? "").trim();
      const patternValue = String(control.dataset.identityAsiPatternValue ?? "").trim();
      if (!choiceId || !value || (control.type === "checkbox" && !control.checked)) {
        continue;
      }

      if (patternValue && activeAsiPatterns.get(choiceId) !== patternValue) {
        continue;
      }

      const previous = choicesById.get(choiceId) ?? [];
      choicesById.set(choiceId, [...previous, value]);
    }

    return {
      type,
      value: selectedValue,
      choices: [...choicesById.entries()].map(([choiceId, values]) => ({
        choiceId,
        values
      }))
    };
  }

  if (type === "subclass" || type === "feat") {
    return {
      type,
      characterLevel,
      value: selectedValue
    };
  }

  if (INLINE_PICK_TYPES.has(type)) {
    const values = formData.getAll("pick").map((value) => String(value ?? "").trim()).filter(Boolean);
    validateLevelChoicePayload(form, values);
    return {
      type,
      characterLevel,
      values
    };
  }

  if (type === "asi") {
    const checkedAbilities = formData.getAll("asi").map((value) => String(value ?? "").trim()).filter(Boolean);
    if (checkedAbilities.length) {
      return {
        type,
        characterLevel,
        increases: checkedAbilities.map((ability) => ({
          ability,
          amount: 1
        }))
      };
    }

    return {
      type,
      characterLevel,
      increases: normalizeAsiPayload(formData)
    };
  }

  if (type === "abilities") {
    return {
      type,
      scores: Object.fromEntries(ABILITY_KEYS.map((ability) => [
        ability,
        Number(formData.get(`ability-${ability}`))
      ]).filter(([, score]) => Number.isFinite(score)))
    };
  }

  if (type === "granted-spells") {
    return {
      type,
      sourceRef: form.dataset.grantSourceRef ?? "",
      spells: []
    };
  }

  return { type, characterLevel };
}

/**
 * Returns the active modal container for keyboard trapping.
 */
function getActiveKeyboardContainer(root) {
  return root.querySelector("[data-guided-overlay-form]")
    ?? root.querySelector("[data-character-builder]")
    ?? root;
}

/**
 * Returns focusable controls that are still connected and visible enough to use.
 */
function getFocusableElements(container) {
  if (!container?.querySelectorAll) {
    return [];
  }

  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter((element) => element.isConnected)
    .filter((element) => element.getAttribute("aria-hidden") !== "true");
}

/**
 * Keeps Tab and Shift+Tab inside the active builder dialog or guided overlay.
 */
function trapFocus(event, container) {
  const focusable = getFocusableElements(container);
  const doc = container?.ownerDocument ?? document;

  if (!focusable.length) {
    event.preventDefault();
    container?.focus?.({ preventScroll: true });
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = doc.activeElement;

  if (event.shiftKey && (!container.contains(active) || active === first)) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  } else if (!container.contains(active)) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}

function getRuleDialog(root) {
  return root?.querySelector?.("[data-builder-rule-detail-dialog]") ?? null;
}

function closeRuleDialog(root) {
  getRuleDialog(root)?.remove();
}

function openRuleDialog(root, trigger) {
  if (!root || !trigger?.dataset?.builderRuleDetail) {
    return false;
  }

  closeRuleDialog(root);
  const title = trigger.dataset.ruleTitle || "Rule Detail";
  const subtitle = trigger.dataset.ruleSubtitle || "";
  const body = trigger.dataset.ruleBody || "";
  const dialog = document.createElement("div");
  dialog.className = "character-builder-rule-dialog-backdrop";
  dialog.dataset.builderRuleDetailDialog = "true";
  dialog.innerHTML = `
    <section
      class="character-builder-rule-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-builder-rule-dialog-title"
      aria-describedby="character-builder-rule-dialog-body"
      tabindex="-1"
    >
      <header>
        <div>
          <h3 id="character-builder-rule-dialog-title">${escapeHtml(title)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <button type="button" class="character-builder-button character-builder-button-quiet character-builder-button-compact" data-builder-rule-detail-close>Close</button>
      </header>
      <div class="character-builder-rule-dialog-body" id="character-builder-rule-dialog-body">
        ${splitRuleParagraphs(body).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      </div>
    </section>
  `;
  root.append(dialog);
  dialog.querySelector("[data-builder-rule-detail-close]")?.focus?.({ preventScroll: true });
  return true;
}

function isCardRuleClick(event, target) {
  if (!target?.matches?.("[data-builder-rule-detail]")) {
    return false;
  }

  const interactive = event.target?.closest?.([
    "[data-builder-rule-detail-button]",
    "[data-builder-action]",
    "[data-builder-field]",
    "button",
    "a[href]",
    "input",
    "select",
  ].join(","));

  return !interactive || interactive === target;
}

/**
 * Detects the browser save shortcut so the host page can delegate it to the app.
 */
function isSaveShortcut(event) {
  return (event.ctrlKey || event.metaKey) && String(event.key ?? "").toLowerCase() === "s";
}

/**
 * Runs button actions exposed by data-builder-action attributes.
 */
async function runAction(actionTarget, app, root) {
  if (actionTarget.disabled || actionTarget.getAttribute("aria-disabled") === "true") {
    return;
  }

  const action = actionTarget.dataset.builderAction;
  if (action === "close") {
    app.close();
  } else if (action === "save") {
    await app.save();
  } else if (action === "export") {
    app.export({
      download: true,
      touchModified: true
    });
  } else if (action === "add-level") {
    const classSelect = root.querySelector('[data-builder-field="new-level-class"]');
    await app.appendClassLevel(classSelect?.value);
  } else if (action === "open-guided-overlay") {
    await app.openGuidedOverlay({
      type: actionTarget.dataset.overlayType || actionTarget.dataset.decisionType,
      characterLevel: actionTarget.dataset.characterLevel,
      sourceRef: actionTarget.dataset.grantSourceRef
    });
  } else if (action === "focus-picker-result") {
    await app.updateGuidedOverlay?.({
      focusedRef: actionTarget.dataset.pickerFocusedRef
    }, {
      focusKey: actionTarget.getAttribute("data-render-focus-key")
    });
  } else if (action === "open-identity-feat-picker") {
    const form = actionTarget.closest?.("[data-guided-overlay-form]");
    const payload = form ? collectGuidedPayload(form) : {};
    await app.openIdentityFeatPicker?.({
      choiceId: actionTarget.dataset.identityChoiceId,
      value: payload.value,
      choices: payload.choices,
      selectedFeatRef: actionTarget.dataset.selectedFeatRef
    });
  } else if (action === "focus-identity-feat-result") {
    const pickerContext = getFeatPickerContext(actionTarget);
    const patch = {
      focusedRef: actionTarget.dataset.identityFeatRef
    };
    const options = {
      focusKey: actionTarget.getAttribute("data-render-focus-key")
    };
    if (pickerContext === "level") {
      await app.updateGuidedOverlay?.(patch, options);
    } else {
      await app.updateIdentityFeatPicker?.(patch, options);
    }
  } else if (action === "close-identity-feat-picker") {
    if (getFeatPickerContext(actionTarget) === "level") {
      app.closeGuidedOverlay();
    } else {
      await app.closeIdentityFeatPicker?.();
    }
  } else if (action === "apply-identity-feat-picker") {
    if (getFeatPickerContext(actionTarget) === "level") {
      const characterLevel = actionTarget.dataset.characterLevel
        ?? actionTarget.closest?.("[data-guided-overlay-form]")?.dataset?.characterLevel;
      await app.applyGuidedOverlay("feat", {
        characterLevel,
        value: actionTarget.dataset.identityFeatRef
      });
    } else {
      await app.applyIdentityFeatPicker?.({
        choiceId: actionTarget.dataset.identityChoiceId,
        featRef: actionTarget.dataset.identityFeatRef
      });
    }
  } else if (action === "close-guided-overlay") {
    app.closeGuidedOverlay();
  }
}

/**
 * Applies direct field edits from timeline controls.
 */
async function runFieldChange(fieldTarget, app) {
  const identityFeatPickerField = fieldTarget.dataset.identityFeatPickerField;
  if (identityFeatPickerField) {
    const patch = {
      [identityFeatPickerField]: fieldTarget.value,
      focusedRef: ""
    };
    const options = {
      focusKey: fieldTarget.getAttribute("data-render-focus-key")
    };
    if (getFeatPickerContext(fieldTarget) === "level") {
      await app.updateGuidedOverlay?.(patch, options);
    } else {
      await app.updateIdentityFeatPicker?.(patch, options);
    }
    return;
  }

  const pickerField = fieldTarget.dataset.builderPickerField;
  if (pickerField) {
    await app.updateGuidedOverlay?.({
      [pickerField]: fieldTarget.value,
      focusedRef: ""
    });
    return;
  }

  const field = fieldTarget.dataset.builderField;
  const characterLevel = Number(fieldTarget.dataset.characterLevel ?? 0);
  const decisionType = fieldTarget.dataset.decisionType ?? "";

  if (field === "level-class") {
    await app.setClassAtLevel(characterLevel, fieldTarget.value);
  } else if (field === "identity-ancestry") {
    await app.setAncestry(fieldTarget.value);
  } else if (field === "identity-background") {
    await app.setBackground(fieldTarget.value);
  } else if (field === "identity-choice") {
    const scope = fieldTarget.dataset.identityChoiceScope ?? "";
    const choiceId = fieldTarget.dataset.identityChoiceId ?? "";
    const row = fieldTarget.closest?.("[data-identity-choice-row]");
    const values = fieldTarget.type === "checkbox"
      ? [...(row?.querySelectorAll?.('[data-builder-field="identity-choice"]:checked') ?? [])]
        .filter((input) => input.dataset.identityChoiceId === choiceId)
        .map((input) => input.value)
      : [fieldTarget.value];
    await app.assignIdentityChoice(scope, choiceId, values);
  } else if (field === "level-subclass") {
    await app.assignSubclassAtLevel(characterLevel, fieldTarget.value);
  } else if (field === "level-feat") {
    await app.assignFeatAtLevel(characterLevel, fieldTarget.value);
  } else if (field === "level-picks") {
    await app.assignLevelPicks(characterLevel, decisionType, fieldTarget.value);
  } else if (field === "level-asi") {
    await app.assignAsiAtLevel(characterLevel, fieldTarget.value);
  }
}

/**
 * Reports UI-event failures through the app callback contract.
 */
function reportEventError(app, error) {
  app.config?.callbacks?.onError?.(error);
}

/**
 * Event wiring for the character builder shell.
 * This file owns DOM-to-app command mapping so renderer code stays declarative and
 * CharacterBuilderApp stays focused on orchestration.
 */
export class CharacterBuilderEvents {
  #disposers = [];

  /**
   * Binds delegated shell events for the current render root.
   * Timeline controls are delegated here so re-rendered cards keep working.
   */
  bind({ app, root } = {}) {
    this.unbind();

    if (!app || !root) {
      return this;
    }

    const doc = root.ownerDocument ?? document;
    syncIdentityChoiceLimits(root);
    syncLevelChoiceLimits(root);
    syncAsiStepperLimits(root);

    const handleClick = async (event) => {
      if (event.target?.closest?.("[data-builder-rule-detail-close]") || event.target?.matches?.("[data-builder-rule-detail-dialog]")) {
        event.preventDefault();
        closeRuleDialog(root);
        return;
      }

      const ruleButton = event.target?.closest?.("[data-builder-rule-detail-button]");
      if (ruleButton && root.contains(ruleButton)) {
        event.preventDefault();
        event.stopPropagation();
        openRuleDialog(root, ruleButton);
        return;
      }

      const ruleCard = event.target?.closest?.("[data-builder-rule-detail]");
      if (ruleCard && root.contains(ruleCard) && isCardRuleClick(event, ruleCard)) {
        event.preventDefault();
        openRuleDialog(root, ruleCard);
        return;
      }

      if (event.target?.matches?.("[data-builder-overlay-backdrop]")) {
        app.closeGuidedOverlay();
        return;
      }

      const asiStepTarget = event.target?.closest?.("[data-asi-step]");
      if (asiStepTarget && root.contains(asiStepTarget)) {
        event.preventDefault();
        updateAsiStepper(asiStepTarget);
        return;
      }

      const actionTarget = event.target?.closest?.("[data-builder-action]");
      if (!actionTarget || !root.contains(actionTarget)) {
        return;
      }

      if (actionTarget.dataset.builderAction === "apply-guided-overlay") {
        return;
      }

      event.preventDefault();

      try {
        await runAction(actionTarget, app, root);
      } catch (error) {
        reportEventError(app, error);
      }
    };

    const handleChange = async (event) => {
      const identityChoiceTarget = event.target?.closest?.("[data-identity-picker-choice]");
      if (identityChoiceTarget && root.contains(identityChoiceTarget)) {
        syncIdentityChoiceLimits(identityChoiceTarget.closest("[data-guided-overlay-form]") ?? root);
        return;
      }

      const levelChoiceTarget = event.target?.closest?.("[data-level-choice-option]");
      if (levelChoiceTarget && root.contains(levelChoiceTarget)) {
        syncLevelChoiceLimit(levelChoiceTarget.closest("[data-level-choice-model]"));
        return;
      }

      const fieldTarget = event.target?.closest?.("[data-builder-field], [data-builder-picker-field], [data-identity-feat-picker-field]");
      if (!fieldTarget || !root.contains(fieldTarget)) {
        return;
      }

      try {
        await runFieldChange(fieldTarget, app);
      } catch (error) {
        reportEventError(app, error);
      }
    };

    const handleInput = async (event) => {
      const fieldTarget = event.target?.closest?.("[data-builder-picker-field], [data-identity-feat-picker-field]");
      if (!fieldTarget || !root.contains(fieldTarget)) {
        return;
      }

      const focusState = getPickerFieldFocusState(fieldTarget);

      try {
        await runFieldChange(fieldTarget, app);
        restorePickerFieldFocus(root, focusState);
      } catch (error) {
        reportEventError(app, error);
      }
    };

    const handleSubmit = async (event) => {
      const form = event.target?.closest?.("[data-guided-overlay-form]");
      if (!form || !root.contains(form)) {
        return;
      }

      event.preventDefault();

      try {
        if (form.dataset.identityFeatPickerActive || form.dataset.featPickerActive) {
          return;
        }

        const payload = collectGuidedPayload(form);
        await app.applyGuidedOverlay(payload.type, payload);
      } catch (error) {
        reportEventError(app, error);
      }
    };

    const handleDocumentKeydown = async (event) => {
      if (!root.isConnected || event.defaultPrevented) {
        return;
      }

      const ruleDialog = getRuleDialog(root)?.querySelector?.("[role='dialog']");
      const activeContainer = ruleDialog ?? getActiveKeyboardContainer(root);

      if (ruleDialog && ["Enter", " "].includes(event.key)) {
        return;
      }

      if (!ruleDialog && ["Enter", " "].includes(event.key)) {
        const ruleTarget = event.target?.closest?.("[data-builder-rule-detail]");
        if (ruleTarget && root.contains(ruleTarget)) {
          event.preventDefault();
          openRuleDialog(root, ruleTarget);
          return;
        }
      }

      if (event.key === "Tab") {
        trapFocus(event, activeContainer);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (ruleDialog) {
          closeRuleDialog(root);
          return;
        }

        if (root.querySelector("[data-guided-overlay-form]")) {
          app.closeGuidedOverlay();
        } else {
          app.close();
        }
        return;
      }

      if (isSaveShortcut(event)) {
        event.preventDefault();
        try {
          await app.save();
        } catch (error) {
          reportEventError(app, error);
        }
      }
    };

    root.addEventListener("click", handleClick);
    root.addEventListener("change", handleChange);
    root.addEventListener("input", handleInput);
    root.addEventListener("submit", handleSubmit);
    doc.addEventListener("keydown", handleDocumentKeydown, true);
    this.#disposers.push(() => root.removeEventListener("click", handleClick));
    this.#disposers.push(() => root.removeEventListener("change", handleChange));
    this.#disposers.push(() => root.removeEventListener("input", handleInput));
    this.#disposers.push(() => root.removeEventListener("submit", handleSubmit));
    this.#disposers.push(() => doc.removeEventListener("keydown", handleDocumentKeydown, true));
    return this;
  }

  /**
   * Removes all listeners from the previous render root.
   * Called before rebinding and when the app closes.
   */
  unbind() {
    for (const dispose of this.#disposers.splice(0)) {
      dispose();
    }

    return this;
  }
}
