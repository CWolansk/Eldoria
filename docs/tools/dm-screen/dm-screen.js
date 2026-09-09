import { EldoriaApiClient } from "../../api/apiClient/index.js";
import "../item-normalizer.js?v=20260909";
import { mountSessionWorkspace } from "./session-workspace.mjs";
import { compileConditionEffects } from "../../Players/PlayerSheetTemplate/ConditionRules.js";

const state = { api: null, characters: [], grantCharacterId: "", grantItems: new Map(), editorItems: new Map(), pending: new Set(), history: [], loaded: false, stale: false, refreshing: false, lastSync: "", originalItem: null, baseline: null, savingItem: false };
let workspace;
const normalizeItem = globalThis.EldoriaItems.normalize;
const elements = {};
let editorTimer;
let grantTimer;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function apiBase() {
  return window.ELDORIA_API_BASE_URL || window.ELDORIA_SITE_CONFIG?.cloudApiBase || "/api";
}

function createApi() {
  return new EldoriaApiClient({ baseUrl: apiBase() });
}

function showNotice(message, tone = "success") {
  elements.notification.textContent = message;
  elements.notification.dataset.tone = tone;
  elements.notification.hidden = false;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => { elements.notification.hidden = true; }, 3500);
}

function setAccessStatus(message, connected = false) {
  elements.accessStatus.textContent = message;
  elements.accessStatus.dataset.connected = String(connected);
}

function getListResponseItems(response) {
  if (Array.isArray(response)) return response;
  return Array.isArray(response?.items) ? response.items : Array.isArray(response?.value) ? response.value : [];
}

function itemId(item) {
  return String(item?.id || item?.itemId || item?.catalogId || "").trim();
}

function itemDescription(item) { return normalizeItem(item).description; }

function itemResultButton(item, purpose) {
  const id = itemId(item);
  return `<button class="dm-item-result" type="button" data-${purpose}-item="${escapeHtml(id)}"><strong>${escapeHtml(item.name || "Unnamed item")}</strong><span>${escapeHtml(item.source || "Unknown source")} · ${escapeHtml(item.rarity || "none")} · ${escapeHtml(normalizeItem(item).type)}</span></button>`;
}

function hpPercent(character) {
  return character.hp?.max > 0 ? Math.min(100, Math.max(0, Math.round((character.hp.current / character.hp.max) * 100))) : 0;
}

function renderPartySummary() {
  const wounded = state.characters.filter((character) => character.hp.current < character.hp.max).length;
  const affected = state.characters.filter((character) => character.conditions.length || character.exhaustion).length;
  const totalHp = state.characters.reduce((sum, character) => sum + character.hp.current, 0);
  const maxHp = state.characters.reduce((sum, character) => sum + character.hp.max, 0);
  elements.partySummary.innerHTML = [
    `${state.characters.length} active characters`,
    state.characters.some(c => c.hp.complete === false || !c.hp.max) ? `${state.characters.filter(c => c.hp.complete === false || !c.hp.max).length} need HP setup` : `${totalHp}/${maxHp} combined HP`,
    `${wounded} wounded`,
    `${affected} with conditions/exhaustion`
  ].map((label) => `<span class="dm-summary-chip">${escapeHtml(label)}</span>`).join("");
}

function conditionMarkup(character) {
  if (!character.conditions.length) return '<span class="muted">No active conditions</span>';
  return character.conditions.map((condition) => `<span class="dm-condition">${escapeHtml(condition)}<button type="button" aria-label="Remove ${escapeHtml(condition)}" data-remove-condition="${escapeHtml(condition)}">Remove</button></span>`).join("");
}

function conditionRuleMarkup(rule, tone = "") {
  return `<details class="dm-condition-rule${tone ? ` dm-condition-rule--${tone}` : ""}"><summary><strong>${escapeHtml(rule.name)}</strong><span>${escapeHtml(rule.suppressedReason || rule.summary || "")}</span></summary><ul>${(rule.rules || []).map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul></details>`;
}

function conditionEffectsMarkup(character) {
  const effects = compileConditionEffects(character.conditions, character.exhaustion, {
    conditionImmunities: character.defenses?.conditionImmunities || []
  });
  const rules = [
    ...(effects.active || []).map((rule) => conditionRuleMarkup(rule)),
    ...(effects.exhaustion ? [conditionRuleMarkup(effects.exhaustion, "exhaustion")] : []),
    ...(effects.suppressed || []).map((rule) => conditionRuleMarkup(rule, "suppressed"))
  ];
  return rules.length ? `<div class="dm-condition-rules"><p>Rules and automatic sheet effects</p>${rules.join("")}</div>` : "";
}

function characterCard(character) {
  const classes = character.classes.length ? character.classes.join(" / ") : "Class not set";
  const portrait = character.portraitUrl ? `<img class="dm-character-card__portrait" src="${escapeHtml(character.portraitUrl)}" alt="">` : '<div class="dm-character-card__portrait"></div>';
  return `<article class="dm-character-card" id="card-${escapeHtml(character.id)}" data-character-id="${escapeHtml(character.id)}">
    <header class="dm-character-card__header">${portrait}<div class="dm-character-card__identity"><h3>${escapeHtml(character.name)}</h3><p>${escapeHtml(character.playerName)} · Level ${character.level} ${escapeHtml(classes)}</p></div><a class="button button-secondary" href="../../Players/PlayerSheetTemplate/PlayerSheet.html?id=${encodeURIComponent(character.id)}">Open sheet</a></header>
    <div class="dm-metrics"><div class="dm-metric"><strong>${character.ac}</strong><span>AC</span></div><div class="dm-metric"><strong>${character.hp.current}/${character.hp.complete === false || !character.hp.max ? "?" : character.hp.max}</strong><span>HP</span></div><div class="dm-metric"><strong>${character.hp.temp}</strong><span>Temp HP</span></div><div class="dm-metric"><strong>${character.deathSaves.successes}/${character.deathSaves.failures}</strong><span>Death S/F</span></div></div>
    ${character.hp.complete === false || !character.hp.max ? '<p class="dm-hp-incomplete">HP setup incomplete — set the base maximum below.</p>' : ""}
    <div class="dm-condition-row">${conditionMarkup(character)}</div>
    <div class="dm-concentration-status">${character.concentration ? `<span><strong>Concentration:</strong> ${escapeHtml(character.concentration)}</span><button type="button" class="button button-secondary" data-end-concentration>End concentration</button>` : '<span class="muted">Not concentrating</span>'}</div>
    <details class="dm-card-controls"><summary>Manage ${escapeHtml(character.name)}</summary>
    <div class="dm-hp-bar" style="--hp-percent:${hpPercent(character)}%"><span></span></div>
    ${conditionEffectsMarkup(character)}
    <div class="dm-quick-actions"><input class="input" type="number" min="1" value="1" data-action-amount aria-label="HP amount"><button class="button button-danger" type="button" data-dm-action="damage">Damage</button><button class="button" type="button" data-dm-action="heal">Heal</button><button class="button button-secondary" type="button" data-dm-action="temp-hp">Temp HP</button></div>
    <div class="dm-secondary-actions"><input class="input" data-condition-select list="standard-condition-options" placeholder="Add condition…" aria-label="Condition"><button class="button button-secondary" type="button" data-dm-action="add-condition">Apply</button><button class="button button-secondary" type="button" data-open-give-item>Give item</button></div>
    <details><summary>More controls</summary><div class="dm-more-controls"><label>Exhaustion<select class="select" data-exhaustion>${[0,1,2,3,4,5,6].map((value) => `<option${value === character.exhaustion ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Death successes<input class="input" data-death-successes type="number" min="0" max="3" value="${character.deathSaves.successes}"></label><label>Death failures<input class="input" data-death-failures type="number" min="0" max="3" value="${character.deathSaves.failures}"></label><button class="button button-secondary" type="button" data-dm-action="set-death-saves">Save death saves</button></div></details>
    <div class="dm-secondary-actions"><input class="input" data-concentration maxlength="120" placeholder="Concentration spell" aria-label="Concentration spell" value="${escapeHtml(character.concentration || "")}"><button class="button button-secondary" data-dm-action="set-concentration">Set concentration</button></div>
    <div class="dm-secondary-actions"><input class="input" data-max-hp type="number" min="1" max="1000000" placeholder="Base maximum HP" aria-label="Base maximum HP before exhaustion"><button class="button button-secondary" data-dm-action="set-max-hp">Set base max HP</button></div>
    </details>
    <footer class="dm-card-footer"><span>${character.items.length} inventory entries · ${character.currency.gp} gp</span><span>Exhaustion ${character.exhaustion}</span></footer>
  </article>`;
}

function renderCharacters() {
  renderPartySummary();
  if (state.characters.length && elements.characterGrid.querySelector('[data-character-id]')) {
    for (const card of elements.characterGrid.querySelectorAll('[data-character-id]')) if (!state.characters.some(c => c.id === card.dataset.characterId)) card.remove();
    for (const character of state.characters) {
      if (document.getElementById(`card-${character.id}`)) updateCharacter(character);
      else elements.characterGrid.insertAdjacentHTML('beforeend', characterCard(character));
    }
  } else elements.characterGrid.innerHTML = state.characters.length ? state.characters.map(characterCard).join("") : '<p class="dm-empty">No active character sheets were found.</p>';
  renderReferenceParty();
  renderOverview();
  workspace?.refresh();
}

function defenseText(character, key) {
  const values = character.defenses?.[key];
  return Array.isArray(values) && values.length ? values.join(", ") : "—";
}

function renderReferenceParty() {
  if (!state.characters.length) {
    elements.referenceParty.innerHTML = '<p class="dm-empty">Load the party to populate this reference.</p>';
    return;
  }
  elements.referenceParty.innerHTML = state.characters.map((character) => `<div class="dm-reference-row"><strong>${escapeHtml(character.name)}</strong><span><b>Resist:</b> ${escapeHtml(defenseText(character, "damageResistances"))}</span><span><b>Damage immune:</b> ${escapeHtml(defenseText(character, "damageImmunities"))}</span><span><b>Condition immune:</b> ${escapeHtml(defenseText(character, "conditionImmunities"))}</span><span><b>Vulnerable:</b> ${escapeHtml(defenseText(character, "damageVulnerabilities"))}</span><span><b>Languages:</b> ${escapeHtml((character.languages || []).join(", ") || "—")}</span></div>`).join("");
}

async function loadParty() {
  if (state.refreshing || state.pending.size) return;
  state.api ||= createApi();
  state.refreshing = true;
  elements.refresh.disabled = elements.reconnect.disabled = true;
  setAccessStatus(state.loaded ? "Refreshing party…" : "Connecting to party…");
  if (!state.loaded) elements.characterGrid.innerHTML = '<p class="dm-empty">Loading party…</p>';
  try {
    const response = await state.api.getDmParty();
    if (!Array.isArray(response?.characters)) throw new Error("The party response is invalid. Update the API and reconnect.");
    state.characters = response.characters;
    state.loaded = true; state.stale = false;
    state.lastSync = new Date().toLocaleTimeString();
    renderCharacters();
    setAccessStatus(`Synced ${state.lastSync} · ${state.characters.length} characters${response.unavailable?.length ? ` · ${response.unavailable.length} sheets unavailable; retry to refresh` : ''}`, !response.unavailable?.length);
  } catch (error) {
    state.stale = true;
    const message = error.status === 404 ? "Party service unavailable — deploy the updated API, then reconnect. Item search and session tools remain available." : error.message || "Unable to load party.";
    setAccessStatus(`${message}${state.loaded ? ` Showing data from ${state.lastSync}.` : ""}`);
    if (!state.loaded) {
      elements.partySummary.textContent = "";
      elements.characterGrid.innerHTML = '<p class="dm-empty">Party data is unavailable. Use Reconnect to retry.</p>';
    }
  } finally {
    state.refreshing = false;
    elements.refresh.disabled = elements.reconnect.disabled = false;
    refreshActionAvailability();
    renderHistory();
  }
}

async function connect() { state.api ||= createApi(); await loadParty(); }

function refreshActionAvailability() {
  for (const card of elements.characterGrid.querySelectorAll('[data-character-id]')) {
    const pending = state.pending.has(card.dataset.characterId);
    card.setAttribute('aria-busy', String(pending));
    card.querySelectorAll('button, input, select').forEach(control => { control.disabled = pending || state.stale || state.refreshing; });
    const character = state.characters.find(c => c.id === card.dataset.characterId);
    if (!character?.hp.max) card.querySelector('[data-dm-action="heal"]').disabled = true;
  }
}

function renderOverview() {
  elements.overview.innerHTML = state.characters.length ? `<div class="dm-table-scroll"><table class="dm-overview"><caption>Party at a glance</caption><thead><tr><th>Character</th><th>HP / Temp</th><th>AC</th><th>Initiative</th><th>Passive Perception</th><th>Concentration / conditions</th></tr></thead><tbody>${state.characters.map(c => `<tr><th><a href="#card-${escapeHtml(c.id)}">${escapeHtml(c.name)}</a></th><td>${c.hp.current}/${c.hp.complete === false || !c.hp.max ? '?' : c.hp.max} · ${c.hp.temp}</td><td>${c.ac}</td><td>${c.initiative ?? '—'}</td><td>${c.passivePerception ?? '—'}</td><td>${escapeHtml([c.concentration, ...c.conditions, c.exhaustion ? `Exhaustion ${c.exhaustion}` : ''].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('')}</tbody></table></div>` : '';
}

function renderHistory() {
  elements.history.innerHTML = state.history.length ? state.history.map((entry,index) => `<li><span>${escapeHtml(entry.label)} · ${escapeHtml(entry.time)}</span><button class="button button-secondary" data-undo="${index}" ${!entry.undo || state.stale || state.characters.find(c => c.id === entry.id)?.lastModified !== entry.undo.expectedLastModified ? 'disabled' : ''}>Undo</button></li>`).join('') : '<li>No actions in this visit yet.</li>';
}

function updateCharacter(updated, resetDrafts = []) {
  const index = state.characters.findIndex((character) => character.id === updated.id);
  if (index >= 0) {
    const previous = state.characters[index];
    state.characters[index] = {
      ...previous,
      ...updated,
      name: updated.name && updated.name !== updated.id ? updated.name : previous.name,
      playerName: updated.playerName || previous.playerName,
      portraitUrl: updated.portraitUrl || previous.portraitUrl
    };
  }
  const old = document.getElementById(`card-${updated.id}`);
  if (old && index >= 0) {
    const openDetails = [...old.querySelectorAll('details')].map(d => d.open);
    const amount = old.querySelector('[data-action-amount]').value;
    const drafts = ['data-condition-select', 'data-max-hp', 'data-concentration'].map(attribute => {
      const input = old.querySelector(`[${attribute}]`);
      return [attribute, !resetDrafts.includes(attribute) && input.value !== input.defaultValue ? input.value : null];
    });
    const focused = old.contains(document.activeElement) ? [...document.activeElement.attributes].find(a => a.name.startsWith('data-')) : null;
    old.outerHTML = characterCard(state.characters[index]);
    const card = document.getElementById(`card-${updated.id}`);
    card.querySelectorAll('details').forEach((d,i) => { d.open = openDetails[i] || false; });
    card.querySelector('[data-action-amount]').value = amount;
    for (const [attribute,value] of drafts) if (value != null) card.querySelector(`[${attribute}]`).value = value;
    if (focused) card.querySelector(`[${focused.name}]`)?.focus();
  }
  renderPartySummary(); renderOverview(); renderReferenceParty(); workspace?.refresh();
}

async function applyAction(characterId, action) {
  if (state.pending.has(characterId) || state.stale || state.refreshing) return;
  const character = state.characters.find(c => c.id === characterId);
  if (!character) return;
  const amount = action.amount ?? (action.type === 'set-max-hp' ? action.value : null);
  if (amount != null && (!Number.isInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > 1000000)) return showNotice('Enter a whole number from 1 to 1,000,000.', 'danger');
  if (action.type === 'add-condition' && !action.condition.trim()) return showNotice('Enter a condition to apply.', 'danger');
  state.pending.add(characterId); refreshActionAvailability();
  try {
    const response = await state.api.applyDmCharacterAction(characterId, { expectedLastModified: character.lastModified, ...action });
    updateCharacter(response.character, action.type === 'set-concentration' ? ['data-concentration'] : action.type === 'add-condition' ? ['data-condition-select'] : []);
    state.history.unshift({ id: characterId, label: `${character.name}: ${action.type}${action.amount ? ` ${action.amount}` : ''}`, time: new Date().toLocaleTimeString(), undo: action.type === 'restore' ? null : response.undo });
    state.history = state.history.slice(0,30);
    showNotice(action.type === 'damage' && character.concentration ? `${character.name} updated. Check concentration for ${character.concentration}.` : `${character.name} updated.`);
  } catch (error) {
    showNotice(error.status === 409 ? "Character changed elsewhere. Refresh the party and review before trying again." : `${error.message || "Update failed."} Refresh to verify before retrying.`, "danger");
    if (error.status !== 400) {
      state.stale = true;
      setAccessStatus("Refresh the party before making more changes.");
    }
  } finally {
    state.pending.delete(characterId); refreshActionAvailability(); renderHistory();
  }
}

async function searchItems(query, target, map, purpose, full = false) {
  state.api ||= createApi();
  const requestId = (target.requestId || 0) + 1; target.requestId = requestId;
  if (query.trim().length < 2) {
    target.innerHTML = '<p class="dm-empty">Type at least two characters.</p>';
    return;
  }
  target.innerHTML = '<p class="dm-empty">Searching…</p>';
  try {
    const response = full ? await state.api.searchCatalogFull("items", query, { limit: 20 }) : await state.api.searchItems(query, { limit: 12, sort: "name" });
    if (target.requestId !== requestId) return;
    const items = getListResponseItems(response);
    map.clear();
    items.forEach((item) => map.set(itemId(item), item));
    target.innerHTML = items.length ? items.map((item) => itemResultButton(item, purpose)).join("") : '<p class="dm-empty">No items found.</p>';
  } catch (error) {
    if (target.requestId === requestId) target.innerHTML = `<p class="dm-empty">${escapeHtml(error.message)}</p>`;
  }
}

function showGiveItem(characterId) {
  state.grantCharacterId = characterId;
  state.grantItems.clear();
  elements.giveResults.requestId = (elements.giveResults.requestId || 0) + 1;
  clearTimeout(grantTimer);
  elements.giveQuantity.value = "1";
  const character = state.characters.find((entry) => entry.id === characterId);
  elements.giveCharacter.textContent = `Give an item to ${character?.name || "this character"}.`;
  elements.giveSearch.value = "";
  elements.giveResults.innerHTML = '<p class="dm-empty">Type at least two characters.</p>';
  elements.giveDialog.showModal();
  elements.giveSearch.focus();
}

function populateItemForm(raw) {
  state.originalItem = structuredClone(raw);
  const item = normalizeItem(raw);
  elements.itemId.value = item.id;
  for (const [key,value] of Object.entries({itemName:item.name,itemSource:item.source || 'Eldoria',itemType:item.type,itemAttunement:item.attunement,itemValue:item.valueLabel,itemWeight:item.weight,itemDamage:item.damage,itemProperties:item.properties.join(', '),itemMastery:item.mastery,itemDescription:item.description})) elements[key].value = value;
  if (![...elements.itemRarity.options].some(o => o.value === item.rarity)) elements.itemRarity.add(new Option(item.rarity,item.rarity));
  elements.itemRarity.value = item.rarity;
  state.baseline = itemFormDocument();
  elements.itemStatus.textContent = `Editing ${item.name}. Unchanged catalog fields are preserved.`;
  renderItemPreview();
}

function renderItemPreview() {
  const item = itemFormDocument();
  elements.itemPreview.textContent = [item.name, `${item.rarity} · ${item.type}`, item.damage, item.properties.join(', '), item.attunementRequirement, item.text].filter(Boolean).join('\n');
}

function saveDraft() {
  state.itemRequest = (state.itemRequest || 0) + 1;
  renderItemPreview();
  try { localStorage.setItem('eldoria-item-draft-v1', JSON.stringify({original:state.originalItem, baseline:state.baseline, fields:itemFormDocument(), id:elements.itemId.value})); }
  catch (_) { elements.itemStatus.textContent = 'Draft cannot be saved in this browser.'; }
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem('eldoria-item-draft-v1') || 'null');
    if (!draft?.fields) return;
    populateItemForm({...draft.fields,id:draft.id});
    state.originalItem = draft.original; state.baseline = draft.baseline;
    elements.itemStatus.textContent = 'Restored your unsaved draft.';
  } catch (_) { /* Keep the new-item form usable if browser storage is unavailable. */ }
}

function resetItemForm() {
  if (state.savingItem) return;
  state.originalItem = null; state.baseline = null;
  elements.itemForm.reset();
  elements.itemId.value = "";
  elements.itemSource.value = "Eldoria";
  elements.itemRarity.value = "none";
  elements.itemStatus.textContent = "Creating a new item.";
  elements.itemName.focus();
  saveDraft();
}

function itemFormDocument() {
  const attunementRequirement = elements.itemAttunement.value.trim();
  const description = elements.itemDescription.value.trim();
  return {
    name: elements.itemName.value.trim(),
    source: elements.itemSource.value.trim(),
    rarity: elements.itemRarity.value,
    type: elements.itemType.value.trim(),
    reqAttune: Boolean(attunementRequirement),
    attunementRequirement,
    valueLabel: elements.itemValue.value.trim(),
    weight: elements.itemWeight.value.trim(),
    damage: elements.itemDamage.value.trim(),
    properties: elements.itemProperties.value.split(",").map((value) => value.trim()).filter(Boolean),
    mastery: elements.itemMastery.value.trim(),
    text: description,
    entries: description ? [description] : []
  };
}

async function saveItem(event) {
  event.preventDefault();
  if (!state.api) return showNotice("The DM screen is not connected to the API.", "danger");
  if (state.savingItem) return;
  const fields = itemFormDocument();
  let changed;
  try { changed = globalThis.EldoriaItems.editPatch(fields, state.baseline); }
  catch (error) { elements.itemStatus.textContent = error.message; return; }
  state.savingItem = true;
  const document = state.originalItem ? (elements.itemId.value ? changed : { ...state.originalItem, ...changed }) : changed;
  if (!('text' in document)) delete document.entries;
  delete document.id; delete document.itemId; delete document.catalogId;
  elements.itemForm.querySelectorAll('button,input,textarea,select').forEach(b => { b.disabled = true; });
  elements.itemStatus.textContent = "Saving…";
  try {
    const id = elements.itemId.value;
    const response = id ? await state.api.patchCatalogEntity("items", id, document) : await state.api.createCatalogEntity("items", document);
    populateItemForm({ ...response.entity, id: response.id });
    elements.itemStatus.textContent = response.searchIndexed
      ? `Saved ${response.entity.name}. It is available in Item Search now.`
      : `Saved ${response.entity.name}, but Item Search could not be updated immediately. Try again or contact the site administrator.`;
    try { localStorage.removeItem("eldoria-item-draft-v1"); } catch (_) {}
    showNotice(`${response.entity.name} saved.`);
  } catch (error) {
    elements.itemStatus.textContent = error.message || "Unable to save item.";
    showNotice(elements.itemStatus.textContent, "danger");
  } finally {
    state.savingItem = false; elements.itemForm.querySelectorAll("button,input,textarea,select").forEach(b => { b.disabled = false; });
  }
}

function selectTab(name) {
  if (!['party', 'items', 'reference', 'encounter'].includes(name)) name = 'party';
  document.querySelectorAll('[data-tab]').forEach(button => { const selected = button.dataset.tab === name; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; });
  document.querySelectorAll('[role="tabpanel"]').forEach(panel => { panel.hidden = panel.id !== `${name}-panel`; });
  try { localStorage.setItem('eldoria-dm-tab', name); } catch (_) {}
  if (name === 'encounter') workspace?.refresh();
}

function bindEvents() {
  elements.history.addEventListener('click', event => {
    const button = event.target.closest('[data-undo]'); if (!button) return;
    const entry = state.history[Number(button.dataset.undo)]; if (entry?.undo) void applyAction(entry.id, {type:'restore', ...entry.undo});
  });
  document.querySelector('.dm-tabs').addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('[data-tab]')]; const index = tabs.indexOf(event.target);
    if (index < 0 || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabs[next].dataset.tab); tabs[next].focus();
  });
  elements.itemForm.addEventListener('input', saveDraft);
  elements.copyItem.addEventListener('click', () => {
    if (!state.originalItem) return showNotice('Load an item to create a copy.', 'danger');
    elements.itemId.value = ''; elements.itemSource.value = 'Eldoria'; elements.itemName.value += ' (Eldoria)';
    elements.itemStatus.textContent = 'Creating an Eldoria copy. The original stays in the catalog.'; saveDraft();
  });
  elements.reconnect.addEventListener("click", () => void connect());
  elements.refresh.addEventListener("click", () => void loadParty().catch(() => {}));
  document.querySelector(".dm-tabs").addEventListener("click", (event) => { const tab = event.target.closest("[data-tab]"); if (tab) selectTab(tab.dataset.tab); });
  elements.characterGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-character-id]");
    if (!card || !state.api) return;
    const id = card.dataset.characterId;
    const condition = event.target.closest("[data-remove-condition]");
    if (condition) return void applyAction(id, { type: "remove-condition", condition: condition.dataset.removeCondition });
    if (event.target.closest('[data-end-concentration]')) return void applyAction(id, { type: 'set-concentration', value: '' });
    if (event.target.closest("[data-open-give-item]")) return showGiveItem(id);
    const actionButton = event.target.closest("[data-dm-action]");
    if (!actionButton) return;
    const type = actionButton.dataset.dmAction;
    if (["damage", "heal", "temp-hp"].includes(type)) return void applyAction(id, { type, amount: card.querySelector("[data-action-amount]").value });
    if (type === "set-concentration") return void applyAction(id, {type, value:card.querySelector('[data-concentration]').value});
    if (type === "set-max-hp") return void applyAction(id, {type, value:card.querySelector('[data-max-hp]').value});
    if (type === "add-condition") return void applyAction(id, { type, condition: card.querySelector("[data-condition-select]").value });
    if (type === "set-death-saves") return void applyAction(id, { type, successes: card.querySelector("[data-death-successes]").value, failures: card.querySelector("[data-death-failures]").value });
  });
  elements.characterGrid.addEventListener("change", (event) => { const card = event.target.closest("[data-character-id]"); if (card && event.target.matches("[data-exhaustion]")) void applyAction(card.dataset.characterId, { type: "set-exhaustion", value: event.target.value }); });
  elements.giveSearch.addEventListener("input", () => { elements.giveResults.requestId = (elements.giveResults.requestId || 0) + 1; state.grantItems.clear(); clearTimeout(grantTimer); grantTimer = setTimeout(() => void searchItems(elements.giveSearch.value, elements.giveResults, state.grantItems, "grant", true), 250); });
  elements.giveResults.addEventListener("click", (event) => { const button = event.target.closest("[data-grant-item]"); if (!button) return; const item = state.grantItems.get(button.dataset.grantItem); if (!item) return; if (!elements.giveQuantity.reportValidity()) return; elements.giveDialog.close(); void applyAction(state.grantCharacterId, { type: "give-item", item: { name: item.name, source: item.source, catalog: { id: itemId(item), name: item.name, source: item.source, kind: "items" } }, quantity: Number(elements.giveQuantity.value) }); });
  elements.itemSearch.addEventListener("input", () => { elements.itemResults.requestId = (elements.itemResults.requestId || 0) + 1; state.editorItems.clear(); clearTimeout(editorTimer); editorTimer = setTimeout(() => void searchItems(elements.itemSearch.value, elements.itemResults, state.editorItems, "edit", true), 300); });
  elements.itemResults.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-edit-item]");
    if (!button || !state.api || state.savingItem || !state.editorItems.has(button.dataset.editItem)) return;
    const requestId = state.itemRequest = (state.itemRequest || 0) + 1;
    elements.itemStatus.textContent = "Loading item…";
    try {
      const item = await state.api.getCatalogEntity("items", button.dataset.editItem);
      if (state.itemRequest === requestId) populateItemForm(item);
    } catch (error) { if (state.itemRequest === requestId) elements.itemStatus.textContent = error.message; }
  });
  elements.newItem.addEventListener("click", resetItemForm);
  elements.itemForm.addEventListener("submit", saveItem);
}

function cacheElements() {
  Object.assign(elements, {
    overview: document.querySelector("#party-overview"), history: document.querySelector("#action-history"), giveQuantity: document.querySelector("#give-item-quantity"), itemPreview: document.querySelector("#item-preview"), copyItem: document.querySelector("#copy-item"),
    accessStatus: document.querySelector("#dm-access-status"), reconnect: document.querySelector("#dm-reconnect"), refresh: document.querySelector("#refresh-party"), partySummary: document.querySelector("#party-summary"), characterGrid: document.querySelector("#character-grid"), referenceParty: document.querySelector("#reference-party"), notification: document.querySelector("#dm-notification"), giveDialog: document.querySelector("#give-item-dialog"), giveCharacter: document.querySelector("#give-item-character"), giveSearch: document.querySelector("#give-item-search"), giveResults: document.querySelector("#give-item-results"), itemSearch: document.querySelector("#item-editor-search"), itemResults: document.querySelector("#item-editor-results"), itemForm: document.querySelector("#item-form"), newItem: document.querySelector("#new-item"), itemStatus: document.querySelector("#item-form-status"), itemId: document.querySelector("#item-id"), itemName: document.querySelector("#item-name"), itemSource: document.querySelector("#item-source"), itemRarity: document.querySelector("#item-rarity"), itemType: document.querySelector("#item-type"), itemAttunement: document.querySelector("#item-attunement"), itemValue: document.querySelector("#item-value"), itemWeight: document.querySelector("#item-weight"), itemDamage: document.querySelector("#item-damage"), itemProperties: document.querySelector("#item-properties"), itemMastery: document.querySelector("#item-mastery"), itemDescription: document.querySelector("#item-description")
  });
}

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  workspace = mountSessionWorkspace(document.querySelector('#encounter-panel'), () => state.characters, showNotice);
  try { selectTab(localStorage.getItem('eldoria-dm-tab') || 'party'); } catch (_) { selectTab('party'); }
  restoreDraft(); renderHistory();
  void connect();
  setInterval(() => {
    if (!document.hidden && !state.pending.size && !document.activeElement?.matches('input,textarea,select') && state.loaded && !state.stale) void loadParty();
  }, 30000);
});
