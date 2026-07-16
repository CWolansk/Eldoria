import { EldoriaApiClient } from "../../api/apiClient/index.js";
import { compileConditionEffects } from "../../Players/PlayerSheetTemplate/ConditionRules.js";

const state = { api: null, characters: [], grantCharacterId: "", grantItems: new Map(), editorItems: new Map() };
const elements = {};
let editorTimer;
let grantTimer;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function apiBase() {
  return window.ELDORIA_SITE_CONFIG?.cloudApiBase || "/api";
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

function itemDescription(item) {
  const flatten = (value) => {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join("\n");
    return flatten(value.entries || value.items || value.entry || value.text || "");
  };
  return String(item?.text || item?.entriesText || flatten(item?.entries) || "").trim();
}

function itemResultButton(item, purpose) {
  const id = itemId(item);
  return `<button class="dm-item-result" type="button" data-${purpose}-item="${escapeHtml(id)}"><strong>${escapeHtml(item.name || "Unnamed item")}</strong><span>${escapeHtml(item.source || "Unknown source")} · ${escapeHtml(item.rarity || "none")} · ${escapeHtml(item.type || item.category || "Item")}</span></button>`;
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
    `${totalHp}/${maxHp} combined HP`,
    `${wounded} wounded`,
    `${affected} with conditions/exhaustion`
  ].map((label) => `<span class="dm-summary-chip">${escapeHtml(label)}</span>`).join("");
}

function conditionMarkup(character) {
  if (!character.conditions.length) return '<span class="muted">No active conditions</span>';
  return character.conditions.map((condition) => `<span class="dm-condition">${escapeHtml(condition)}<button type="button" aria-label="Remove ${escapeHtml(condition)}" data-remove-condition="${escapeHtml(condition)}">×</button></span>`).join("");
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
  return `<article class="dm-character-card" data-character-id="${escapeHtml(character.id)}">
    <header class="dm-character-card__header">${portrait}<div class="dm-character-card__identity"><h3>${escapeHtml(character.name)}</h3><p>${escapeHtml(character.playerName)} · Level ${character.level} ${escapeHtml(classes)}</p></div><a class="button button-secondary" href="../../Players/PlayerSheetTemplate/PlayerSheet.html?id=${encodeURIComponent(character.id)}">Open sheet</a></header>
    <div class="dm-metrics"><div class="dm-metric"><strong>${character.ac}</strong><span>AC</span></div><div class="dm-metric"><strong>${character.hp.current}/${character.hp.max}</strong><span>HP</span></div><div class="dm-metric"><strong>${character.hp.temp}</strong><span>Temp HP</span></div><div class="dm-metric"><strong>${character.deathSaves.successes}/${character.deathSaves.failures}</strong><span>Death S/F</span></div></div>
    <div class="dm-hp-bar" style="--hp-percent:${hpPercent(character)}%"><span></span></div>
    <div class="dm-condition-row">${conditionMarkup(character)}</div>
    ${conditionEffectsMarkup(character)}
    <div class="dm-quick-actions"><input class="input" type="number" min="1" value="1" data-action-amount aria-label="HP amount"><button class="button button-danger" type="button" data-dm-action="damage">Damage</button><button class="button" type="button" data-dm-action="heal">Heal</button><button class="button button-secondary" type="button" data-dm-action="temp-hp">Temp HP</button></div>
    <div class="dm-secondary-actions"><input class="input" data-condition-select list="standard-condition-options" placeholder="Add condition…" aria-label="Condition"><button class="button button-secondary" type="button" data-dm-action="add-condition">Apply</button><button class="button button-secondary" type="button" data-open-give-item>Give item</button></div>
    <details><summary>More controls</summary><div class="dm-more-controls"><label>Exhaustion<select class="select" data-exhaustion>${[0,1,2,3,4,5,6].map((value) => `<option${value === character.exhaustion ? " selected" : ""}>${value}</option>`).join("")}</select></label><label>Death successes<input class="input" data-death-successes type="number" min="0" max="3" value="${character.deathSaves.successes}"></label><label>Death failures<input class="input" data-death-failures type="number" min="0" max="3" value="${character.deathSaves.failures}"></label><button class="button button-secondary" type="button" data-dm-action="set-death-saves">Save death saves</button></div></details>
    <footer class="dm-card-footer"><span>${character.items.length} inventory entries · ${character.currency.gp} gp</span><span>Exhaustion ${character.exhaustion}</span></footer>
  </article>`;
}

function renderCharacters() {
  renderPartySummary();
  elements.characterGrid.innerHTML = state.characters.length ? state.characters.map(characterCard).join("") : '<p class="dm-empty">No active character sheets were found.</p>';
  renderReferenceParty();
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
  elements.referenceParty.innerHTML = state.characters.map((character) => `<div class="dm-reference-row"><strong>${escapeHtml(character.name)}</strong><span><b>Resist:</b> ${escapeHtml(defenseText(character, "damageResistances"))}</span><span><b>Immune:</b> ${escapeHtml(defenseText(character, "damageImmunities"))}</span><span><b>Languages:</b> ${escapeHtml(character.languages.join(", ") || "—")}</span></div>`).join("");
}

async function loadParty() {
  if (!state.api) return;
  elements.characterGrid.innerHTML = '<p class="dm-empty">Loading party…</p>';
  try {
    const response = await state.api.getDmParty();
    state.characters = Array.isArray(response?.characters) ? response.characters : [];
    renderCharacters();
    setAccessStatus(`Connected · ${state.characters.length} characters loaded`, true);
  } catch (error) {
    state.characters = [];
    renderCharacters();
    setAccessStatus(error.message || "Unable to load DM screen data.", false);
    throw error;
  }
}

async function connect() {
  state.api = createApi();
  try {
    await loadParty();
  } catch (_error) {
    state.api = null;
  }
}

function updateCharacter(updated) {
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
  renderCharacters();
}

async function applyAction(characterId, action) {
  try {
    const response = await state.api.applyDmCharacterAction(characterId, action);
    updateCharacter(response.character);
    showNotice(`${response.character.name} updated.`);
  } catch (error) {
    showNotice(error.message || "Unable to update character.", "danger");
  }
}

async function searchItems(query, target, map, purpose, full = false) {
  if (!state.api) return;
  if (query.trim().length < 2) {
    target.innerHTML = '<p class="dm-empty">Type at least two characters.</p>';
    return;
  }
  target.innerHTML = '<p class="dm-empty">Searching…</p>';
  try {
    const response = full ? await state.api.searchCatalogFull("items", query, { limit: 20 }) : await state.api.searchItems(query, { limit: 12, sort: "name" });
    const items = getListResponseItems(response);
    map.clear();
    items.forEach((item) => map.set(itemId(item), item));
    target.innerHTML = items.length ? items.map((item) => itemResultButton(item, purpose)).join("") : '<p class="dm-empty">No items found.</p>';
  } catch (error) {
    target.innerHTML = `<p class="dm-empty">${escapeHtml(error.message)}</p>`;
  }
}

function showGiveItem(characterId) {
  state.grantCharacterId = characterId;
  const character = state.characters.find((entry) => entry.id === characterId);
  elements.giveCharacter.textContent = `Give an item to ${character?.name || "this character"}.`;
  elements.giveSearch.value = "";
  elements.giveResults.innerHTML = '<p class="dm-empty">Type at least two characters.</p>';
  elements.giveDialog.showModal();
  elements.giveSearch.focus();
}

function populateItemForm(item) {
  elements.itemId.value = itemId(item);
  elements.itemName.value = item.name || "";
  elements.itemSource.value = item.source || "Eldoria";
  elements.itemRarity.value = String(item.rarity || "none").toLowerCase();
  elements.itemType.value = typeof item.type === "object" ? item.type.name || item.type.code || "" : item.type || item.category || "";
  elements.itemAttunement.value = item.attunementRequirement || item._attunement || (item.reqAttune ? "Requires attunement" : "");
  elements.itemValue.value = item.valueLabel || item._l_value || "";
  elements.itemWeight.value = item.weight ?? "";
  elements.itemDamage.value = item.damage || item.damageType || "";
  elements.itemProperties.value = Array.isArray(item.properties) ? item.properties.join(", ") : item.properties || "";
  elements.itemMastery.value = item.mastery || "";
  elements.itemDescription.value = itemDescription(item);
  elements.itemStatus.textContent = elements.itemId.value ? `Editing ${item.name}.` : "Creating a new item.";
}

function resetItemForm() {
  elements.itemForm.reset();
  elements.itemId.value = "";
  elements.itemSource.value = "Eldoria";
  elements.itemRarity.value = "none";
  elements.itemStatus.textContent = "Creating a new item.";
  elements.itemName.focus();
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
  const document = itemFormDocument();
  elements.itemStatus.textContent = "Saving…";
  try {
    const id = elements.itemId.value;
    const response = id ? await state.api.patchCatalogEntity("items", id, document) : await state.api.createCatalogEntity("items", document);
    populateItemForm({ ...response.entity, id: response.id });
    elements.itemStatus.textContent = `Saved ${response.entity.name}. Catalog changes are live; the optimized public search index updates on its next catalog index refresh.`;
    showNotice(`${response.entity.name} saved.`);
  } catch (error) {
    elements.itemStatus.textContent = error.message || "Unable to save item.";
    showNotice(elements.itemStatus.textContent, "danger");
  }
}

function selectTab(name) {
  document.querySelectorAll("[data-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.tab === name)));
  document.querySelectorAll("[role='tabpanel']").forEach((panel) => { panel.hidden = panel.id !== `${name}-panel`; });
}

function bindEvents() {
  elements.reconnect.addEventListener("click", () => void connect());
  elements.refresh.addEventListener("click", () => void loadParty().catch(() => {}));
  document.querySelector(".dm-tabs").addEventListener("click", (event) => { const tab = event.target.closest("[data-tab]"); if (tab) selectTab(tab.dataset.tab); });
  elements.characterGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-character-id]");
    if (!card || !state.api) return;
    const id = card.dataset.characterId;
    const condition = event.target.closest("[data-remove-condition]");
    if (condition) return void applyAction(id, { type: "remove-condition", condition: condition.dataset.removeCondition });
    if (event.target.closest("[data-open-give-item]")) return showGiveItem(id);
    const actionButton = event.target.closest("[data-dm-action]");
    if (!actionButton) return;
    const type = actionButton.dataset.dmAction;
    if (["damage", "heal", "temp-hp"].includes(type)) return void applyAction(id, { type, amount: card.querySelector("[data-action-amount]").value });
    if (type === "add-condition") return void applyAction(id, { type, condition: card.querySelector("[data-condition-select]").value });
    if (type === "set-death-saves") return void applyAction(id, { type, successes: card.querySelector("[data-death-successes]").value, failures: card.querySelector("[data-death-failures]").value });
  });
  elements.characterGrid.addEventListener("change", (event) => { const card = event.target.closest("[data-character-id]"); if (card && event.target.matches("[data-exhaustion]")) void applyAction(card.dataset.characterId, { type: "set-exhaustion", value: event.target.value }); });
  elements.giveSearch.addEventListener("input", () => { clearTimeout(grantTimer); grantTimer = setTimeout(() => void searchItems(elements.giveSearch.value, elements.giveResults, state.grantItems, "grant", true), 250); });
  elements.giveResults.addEventListener("click", (event) => { const button = event.target.closest("[data-grant-item]"); if (!button) return; const item = state.grantItems.get(button.dataset.grantItem); if (!item) return; elements.giveDialog.close(); void applyAction(state.grantCharacterId, { type: "give-item", item: { name: item.name, source: item.source, catalog: { id: itemId(item), name: item.name, source: item.source, kind: "items" } }, quantity: 1 }); });
  elements.itemSearch.addEventListener("input", () => { clearTimeout(editorTimer); editorTimer = setTimeout(() => void searchItems(elements.itemSearch.value, elements.itemResults, state.editorItems, "edit", true), 300); });
  elements.itemResults.addEventListener("click", async (event) => { const button = event.target.closest("[data-edit-item]"); if (!button || !state.api) return; elements.itemStatus.textContent = "Loading item…"; try { populateItemForm(await state.api.getCatalogEntity("items", button.dataset.editItem)); } catch (error) { elements.itemStatus.textContent = error.message; } });
  elements.newItem.addEventListener("click", resetItemForm);
  elements.itemForm.addEventListener("submit", saveItem);
}

function cacheElements() {
  Object.assign(elements, {
    accessStatus: document.querySelector("#dm-access-status"), reconnect: document.querySelector("#dm-reconnect"), refresh: document.querySelector("#refresh-party"), partySummary: document.querySelector("#party-summary"), characterGrid: document.querySelector("#character-grid"), referenceParty: document.querySelector("#reference-party"), notification: document.querySelector("#dm-notification"), giveDialog: document.querySelector("#give-item-dialog"), giveCharacter: document.querySelector("#give-item-character"), giveSearch: document.querySelector("#give-item-search"), giveResults: document.querySelector("#give-item-results"), itemSearch: document.querySelector("#item-editor-search"), itemResults: document.querySelector("#item-editor-results"), itemForm: document.querySelector("#item-form"), newItem: document.querySelector("#new-item"), itemStatus: document.querySelector("#item-form-status"), itemId: document.querySelector("#item-id"), itemName: document.querySelector("#item-name"), itemSource: document.querySelector("#item-source"), itemRarity: document.querySelector("#item-rarity"), itemType: document.querySelector("#item-type"), itemAttunement: document.querySelector("#item-attunement"), itemValue: document.querySelector("#item-value"), itemWeight: document.querySelector("#item-weight"), itemDamage: document.querySelector("#item-damage"), itemProperties: document.querySelector("#item-properties"), itemMastery: document.querySelector("#item-mastery"), itemDescription: document.querySelector("#item-description")
  });
}

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindEvents();
  void connect();
});
