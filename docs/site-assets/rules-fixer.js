(function () {
  'use strict';

  const COLLECTIONS = [
    { id: 'items', label: 'Items', file: 'Assets/Rules/items.json' },
    { id: 'spells', label: 'Spells', file: 'Assets/Rules/spells.json' },
    { id: 'features', label: 'Features', file: 'Assets/Rules/features.json' },
    { id: 'actions', label: 'Actions', file: 'Assets/Rules/actions.json' },
    { id: 'resources', label: 'Resources', file: 'Assets/Rules/resources.json' },
    { id: 'effects', label: 'Effects', file: 'Assets/Rules/effects.json' },
    { id: 'backgrounds', label: 'Backgrounds', file: 'Assets/Rules/backgrounds.json', optional: true },
    { id: 'feats', label: 'Feats', file: 'Assets/Rules/feats.json', optional: true },
    { id: 'races', label: 'Races', file: 'Assets/Rules/races.json', optional: true },
    { id: 'classes', label: 'Classes', file: 'Assets/Rules/classes.json', optional: true },
    { id: 'subclasses', label: 'Subclasses', file: 'Assets/Rules/subclasses.json', optional: true },
  ];

  const ABILITIES = [
    ['str', 'Strength'],
    ['dex', 'Dexterity'],
    ['con', 'Constitution'],
    ['int', 'Intelligence'],
    ['wis', 'Wisdom'],
    ['cha', 'Charisma'],
  ];

  const TIMING_OPTIONS = [
    'Passive',
    'Action',
    'Bonus Action',
    'Reaction',
    'Triggered',
    'Out of Combat',
    'Short Rest',
    'Long Rest',
  ];

  const SPELL_SCHOOLS = [
    'Abjuration',
    'Conjuration',
    'Divination',
    'Enchantment',
    'Evocation',
    'Illusion',
    'Necromancy',
    'Transmutation',
  ];

  const EFFECT_KINDS = [
    'note',
    'bonus',
    'attack-bonus',
    'damage-bonus',
    'weapon-attack-bonus',
    'weapon-damage-bonus',
    'extra-damage',
    'ac-bonus',
    'save-bonus',
    'skill-advantage',
    'condition-immunity',
    'on-hit',
  ];

  const DAMAGE_TYPES = [
    'acid',
    'bludgeoning',
    'cold',
    'fire',
    'force',
    'lightning',
    'necrotic',
    'piercing',
    'poison',
    'psychic',
    'radiant',
    'slashing',
    'thunder',
  ];

  const LANGUAGES = [
    'Common',
    'Draconic',
    'Dwarvish',
    'Elvish',
    'Giant',
    'Gnomish',
    'Goblin',
    'Halfling',
    'Orc',
    'Primordial',
    'Sylvan',
    'Undercommon',
  ];

  const MOVEMENT_TYPES = ['walk', 'climb', 'swim', 'fly', 'burrow'];

  const SAVE_DC_TYPES = [
    ['none', 'No save'],
    ['spell', 'Spell save DC'],
    ['fixed', 'Fixed DC'],
    ['formula', '8 + ability + proficiency'],
  ];

  const COMMON_TAGS = [
    'AbilityScoreIncrease',
    'Attack',
    'Bonus',
    'Choice',
    'Combat',
    'Damage',
    'Healing',
    'NoAutoDamage',
    'NoWeaponAttack',
    'Passive',
    'Resource',
    'Social',
    'Utility',
  ];

  const TAGS_BY_COLLECTION = {
    items: ['Attunement', 'Equipped', 'Magic', 'Weapon', 'Armor', 'Consumable', 'NoWeaponAttack', 'NoAutoDamage'],
    spells: ['Concentration', 'Ritual', 'Attack', 'Save', 'Damage', 'Healing', 'Area', 'Control', 'Buff', 'Debuff'],
    feats: ['AbilityScoreIncrease', 'Combat', 'Social', 'Utility', 'Deception', 'Performance', 'Mimicry', 'Repeatable'],
    features: ['ClassFeature', 'SubclassFeature', 'RaceFeature', 'Choice', 'Passive', 'Resource', 'Reaction'],
    actions: ['Attack', 'Save', 'Damage', 'Healing', 'Utility', 'Item', 'Class', 'Spell'],
    resources: ['ShortRest', 'LongRest', 'Charges', 'Uses', 'ProficiencyBonus', 'AbilityModifier'],
    effects: ['Temporary', 'Passive', 'Bonus', 'Damage', 'Defense', 'Movement', 'Condition'],
    backgrounds: ['Skill', 'Tool', 'Language', 'Equipment', 'Feature'],
    races: ['Ancestry', 'AbilityScoreIncrease', 'Speed', 'Size', 'Language', 'Trait'],
    classes: ['Spellcasting', 'Martial', 'Caster', 'HalfCaster', 'Expertise', 'Prepared'],
    subclasses: ['SubclassFeature', 'Spellcasting', 'Choice', 'Passive', 'Resource'],
  };

  const state = {
    root: null,
    catalogs: {},
    storage: {},
    availableCollections: [],
    collection: 'items',
    selectedKey: '',
    query: '',
    status: '',
    statusKind: '',
    saving: false,
    apiAvailable: false,
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    state.root = document.querySelector('[data-rules-fixer]');
    if (!state.root) return;

    const fileMode = window.location.protocol === 'file:';
    state.root.querySelector('[data-file-warning]').hidden = !fileMode;
    if (fileMode) {
      const summary = state.root.querySelector('[data-summary]');
      if (summary) summary.textContent = 'Open this page through the docs server.';
      return;
    }

    bindEvents();
    setStatus('Loading rules database...');
    await loadAll();
    render();
  }

  function bindEvents() {
    state.root.querySelector('[data-search]').addEventListener('input', event => {
      state.query = event.target.value || '';
      state.selectedKey = '';
      render();
    });

    state.root.addEventListener('click', event => {
      const tab = event.target.closest('[data-collection]');
      if (tab) {
        state.collection = tab.dataset.collection;
        state.selectedKey = '';
        render();
        return;
      }

      const row = event.target.closest('[data-record-key]');
      if (row) {
        state.selectedKey = row.dataset.recordKey;
        render();
        return;
      }

      const action = event.target.closest('[data-action]');
      if (!action) return;
      handleAction(action.dataset.action, action);
    });

    state.root.addEventListener('change', event => {
      if (event.target.matches('[data-no-weapon]')) applyNoWeaponAttack(event.target.checked);
      if (event.target.matches('[data-quick-field]')) applyQuickField(event.target);
      if (event.target.matches('[data-tag-input]')) applyTagInput(event.target);
    });

    state.root.addEventListener('keydown', event => {
      if (!event.target.matches('[data-tag-input]') || event.key !== 'Enter') return;
      event.preventDefault();
      applyTagInput(event.target);
    });
  }

  async function loadAll() {
    const results = await Promise.all(COLLECTIONS.map(loadCollection));
    state.availableCollections = [];
    state.apiAvailable = results.some(result => result.fromApi);

    for (const result of results) {
      if (!result.records.length && result.collection.optional) continue;
      state.catalogs[result.collection.id] = result.records;
      state.storage[result.collection.id] = result.storage || (result.fromApi ? 'api' : 'static');
      state.availableCollections.push(result.collection);
    }

    const source = state.apiAvailable ? 'API-backed rules database' : 'static rule files';
    setStatus(`Loaded ${source}.`, 'ok');
  }

  async function loadCollection(collection) {
    try {
      const payload = await fetchJson(buildApiUrl(`rules/${encodeURIComponent(collection.id)}`));
      const records = extractRecords(payload, collection.id);
      if (Array.isArray(records)) {
        return { collection, records, storage: payload.storage || 'api', fromApi: true };
      }
    } catch {
      // Static files keep the editor usable before cloud storage is configured.
    }

    try {
      const records = await fetchJson(collection.file);
      return { collection, records: Array.isArray(records) ? records : [], storage: 'static', fromApi: false };
    } catch (error) {
      if (!collection.optional) setStatus(`Could not load ${collection.label}: ${error.message}`, 'error');
      return { collection, records: [], storage: 'missing', fromApi: false };
    }
  }

  function extractRecords(payload, collection) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.rules)) return payload.rules;
    if (Array.isArray(payload[collection])) return payload[collection];
    if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data[collection])) return payload.data[collection];
    for (const key of ['items', 'records', 'rows', 'results', 'catalog', 'data']) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    return [];
  }

  async function fetchJson(url, options = {}) {
    const headers = { accept: 'application/json', 'content-type': 'application/json', ...(options.headers || {}) };
    const response = await fetch(addRefreshParam(url), {
      ...options,
      cache: 'no-store',
      headers,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
    return response.json();
  }

  function addRefreshParam(url) {
    const next = new URL(url, window.location.href);
    if (!/\/api(?:\/|$)/i.test(next.pathname)) return url;
    next.searchParams.set('_', Date.now().toString(36));
    return next.toString();
  }

  function buildApiUrl(route) {
    const base = getApiBaseUrl();
    if (!base) return `/api/${String(route || '').replace(/^\/+/, '')}`;
    return `${base.replace(/\/+$/, '')}/${String(route || '').replace(/^\/+/, '')}`;
  }

  function getApiBaseUrl() {
    const config = window.ELDORIA_PUBLIC_CONFIG || {};
    if (window.location.protocol.startsWith('http') && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return `${window.location.origin}/api`;
    }
    const configured = String(config.apiBaseUrl || '').trim();
    if (configured) return configured.replace(/\/+$/, '');
    return '';
  }

  function render() {
    renderSummary();
    renderTabs();
    renderList();
    renderDetail();
  }

  function renderSummary() {
    const total = state.availableCollections.reduce((sum, collection) => sum + getRecords(collection.id).length, 0);
    const storageKinds = uniqueText(state.availableCollections.map(collection => state.storage[collection.id]));
    state.root.querySelector('[data-summary]').textContent = `${total.toLocaleString()} records / ${storageKinds.join(', ') || 'unloaded'}`;
  }

  function renderTabs() {
    const target = state.root.querySelector('[data-tabs]');
    target.innerHTML = state.availableCollections.map(collection => {
      const count = getRecords(collection.id).length;
      return `<button type="button" role="tab" data-collection="${escapeAttr(collection.id)}" aria-selected="${collection.id === state.collection}">
        ${escapeHtml(collection.label)} <span>${count.toLocaleString()}</span>
      </button>`;
    }).join('');
  }

  function renderList() {
    const target = state.root.querySelector('[data-record-list]');
    const records = getFilteredRecords();
    const selected = getSelectedRecord(records);
    const countTarget = state.root.querySelector('[data-list-count]');
    if (countTarget) {
      const total = getRecords(state.collection).length;
      countTarget.textContent = `${records.length.toLocaleString()} shown / ${total.toLocaleString()} total`;
    }
    if (selected) state.selectedKey = getRecordKey(selected);

    target.innerHTML = records.length ? records.map(record => {
      const key = getRecordKey(record);
      const meta = [
        record.id,
        record.sourceType || record.kind || record.type || record.level || '',
        record.source || record.className || record.raceName || '',
      ].filter(Boolean).slice(0, 3).join(' / ');
      return `<button type="button" class="record-row" data-record-key="${escapeAttr(key)}" aria-selected="${key === state.selectedKey}">
        <strong>${escapeHtml(getRecordName(record))}</strong>
        <span>${escapeHtml(meta || key)}</span>
        <span class="override-badge">${escapeHtml(state.storage[state.collection] || 'rules')}</span>
      </button>`;
    }).join('') : '<p class="empty-note">No matching rules found.</p>';
  }

  function renderDetail() {
    const target = state.root.querySelector('[data-detail]');
    const record = getSelectedRecord();
    if (!record) {
      target.innerHTML = '<p class="empty-note">Select a rule to inspect or edit its database record.</p>';
      return;
    }

    const key = getRecordKey(record);
    const isItem = state.collection === 'items';
    const statusClass = state.statusKind ? ` ${state.statusKind}` : '';
    target.innerHTML = `
      <section class="summary-panel">
        <h2>${escapeHtml(getRecordName(record))}</h2>
        <p class="record-meta">${escapeHtml([state.collection, record.id || key, state.storage[state.collection] || ''].filter(Boolean).join(' / '))}</p>
        ${isItem ? renderItemQuickControls(record) : ''}
        ${renderGuidedEditor(record)}
        ${renderFactGrid(record)}
        ${renderRuleCollections(record)}
        <h3>Record Preview</h3>
        <pre class="original-json"><code>${escapeHtml(JSON.stringify(record, null, 2))}</code></pre>
      </section>
      <section class="json-panel">
        <h2>Edit Record JSON</h2>
        <p class="field-note">Saving replaces this ${escapeHtml(state.collection)} record in the rules database. Local fallback writes the static JSON file.</p>
        <textarea class="json-editor" data-record-editor spellcheck="false">${escapeHtml(JSON.stringify(record, null, 2))}</textarea>
        <div class="fixer-actions">
          <button type="button" class="primary" data-action="save-record" ${state.saving ? 'disabled' : ''}>Save Record</button>
          <button type="button" data-action="reload" ${state.saving ? 'disabled' : ''}>Reload Rules</button>
          <button type="button" data-action="reset-editor" ${state.saving ? 'disabled' : ''}>Reset Editor</button>
        </div>
        <p class="status-line${statusClass}" data-status>${escapeHtml(state.status)}</p>
      </section>`;
  }

  function renderItemQuickControls(record) {
    const noWeapon = record.weapon === false || (Array.isArray(record.tags) && record.tags.includes('NoWeaponAttack'));
    return `<div class="quick-controls">
      <label class="${noWeapon ? 'active' : ''}">
        <input type="checkbox" data-no-weapon ${noWeapon ? 'checked' : ''}>
        Not a weapon attack
      </label>
      <button type="button" data-action="copy-item-actions">Normalize item actions</button>
    </div>`;
  }

  function renderFactGrid(record) {
    const facts = [
      ['ID', record.id],
      ['Name', getRecordName(record)],
      ['Type', record.type || record.kind || record.sourceType],
      ['Timing', record.group || record.timing || record.castingTime],
      ['Damage', record.damage || (record.weapon && `${record.weapon.damage || ''} ${record.weapon.damageType || ''}`.trim())],
      ['Source', record.source || record.sourceBook || record.className || record.raceName],
    ].filter(([, value]) => value !== undefined && value !== null && value !== '');
    return `<dl class="fact-grid">${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(formatValue(value))}</dd></div>`).join('')}</dl>`;
  }

  function renderRuleCollections(record) {
    const groups = ['grants', 'actions', 'resources', 'effects', 'toggles']
      .map(name => ({ name, rows: Array.isArray(record[name]) ? record[name] : [] }))
      .filter(group => group.rows.length);
    if (!groups.length) return '<p class="empty-note">No embedded grants, actions, resources, effects, or toggles.</p>';
    return groups.map(group => `
      <section>
        <h3>${escapeHtml(capitalize(group.name))}</h3>
        <table class="mini-table">
          <thead><tr><th>Name</th><th>Timing / Kind</th><th>Detail</th></tr></thead>
          <tbody>
            ${group.rows.map(row => `<tr>
              <td>${escapeHtml(row.title || row.name || row.label || row.id || 'Rule')}</td>
              <td>${escapeHtml(row.group || row.kind || row.timing || row.reset || '')}</td>
              <td>${escapeHtml(truncate([formatActionSaveDefinition(row), row.detail || row.text || formatValue(row.effects || '')].filter(Boolean).join(' / '), 180))}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </section>`).join('');
  }

  function renderGuidedEditor(record) {
    return `<section class="guided-editor" aria-label="Guided record edits">
      <header>
        <h3>Quick Edits</h3>
        <span>These stage changes in the JSON editor. Save Record persists them.</span>
      </header>
      <p class="status-line${state.statusKind ? ` ${state.statusKind}` : ''}" data-guided-status>${escapeHtml(state.status)}</p>
      ${renderBasicQuickFields(record)}
      ${renderTagQuickEditor(record)}
      ${state.collection === 'feats' ? renderFeatQuickEditor(record) : ''}
      ${state.collection === 'spells' ? renderSpellQuickEditor(record) : ''}
      ${supportsCharacterGrants(record) ? renderCharacterGrantEditor(record) : ''}
      ${renderExistingEmbeddedEditors(record)}
      ${renderEmbeddedBuilders()}
    </section>`;
  }

  function renderBasicQuickFields(record) {
    const timingValue = record.timing || record.group || record.castingTime || '';
    return `<section class="guided-section">
      <h4>Basics</h4>
      <div class="guided-grid">
        ${renderTextControl('name', 'Name', getRecordName(record))}
        ${renderTextControl('source', 'Source', record.source || record.sourceBook || '')}
        ${renderTextControl('page', 'Page', record.page || '')}
        ${renderTextControl(getTypeFieldName(record), 'Type / Kind', record.type || record.kind || record.sourceType || '')}
        <label>
          <span>Timing</span>
          <select data-quick-field="timing">
            ${renderSelectOptions(['', ...TIMING_OPTIONS], timingValue)}
          </select>
        </label>
      </div>
    </section>`;
  }

  function renderTextControl(field, label, value) {
    return `<label>
      <span>${escapeHtml(label)}</span>
      <input type="text" data-quick-field="${escapeAttr(field)}" value="${escapeAttr(value || '')}">
    </label>`;
  }

  function renderTagQuickEditor(record) {
    const tags = Array.isArray(record.tags) ? record.tags : [];
    const options = uniqueText([...(TAGS_BY_COLLECTION[state.collection] || []), ...COMMON_TAGS]);
    return `<section class="guided-section">
      <h4>Tags</h4>
      <div class="tag-row">
        ${tags.length ? tags.map(tag => `<button type="button" class="rf-chip active" data-action="remove-tag" data-tag="${escapeAttr(tag)}" title="Remove ${escapeAttr(tag)}">${escapeHtml(tag)} ×</button>`).join('') : '<span class="field-note">No tags yet.</span>'}
      </div>
      <div class="tag-row">
        ${options.map(tag => `<button type="button" class="rf-chip" data-action="add-tag" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`).join('')}
      </div>
      <label class="inline-editor">
        <span>Custom tag</span>
        <input type="text" data-tag-input placeholder="Type a tag and press Enter or leave field">
      </label>
    </section>`;
  }

  function renderFeatQuickEditor(record) {
    return `<section class="guided-section">
      <h4>Feat Helpers</h4>
      <div class="guided-grid compact">
        <label>
          <span>Ability increase</span>
          <select data-builder-field="featAbility">
            ${renderSelectOptions(['choose', ...ABILITIES.map(([, label]) => label)], getFeatAbilityLabel(record) || 'choose')}
          </select>
        </label>
        <label>
          <span>Amount</span>
          <input type="number" min="1" max="2" step="1" data-builder-field="featAbilityAmount" value="1">
        </label>
      </div>
      <div class="quick-controls">
        <button type="button" data-action="apply-feat-ability">Set Ability Increase</button>
        <button type="button" data-action="set-feat-any-ability">Choose Any Ability +1</button>
        <button type="button" data-action="clear-feat-ability">Clear Ability Data</button>
        <button type="button" data-action="set-passive">Set Passive</button>
        <button type="button" data-action="set-triggered">Set Triggered</button>
      </div>
    </section>`;
  }

  function renderSpellQuickEditor(record) {
    const levels = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return `<section class="guided-section">
      <h4>Spell Helpers</h4>
      <div class="guided-grid compact">
        <label><span>Level</span><select data-builder-field="spellLevel">${renderSelectOptions(levels, String(record.level || '0'))}</select></label>
        <label><span>School</span><select data-builder-field="spellSchool">${renderSelectOptions(['', ...SPELL_SCHOOLS], record.school || '')}</select></label>
        ${renderBuilderInput('spellCastingTime', 'Casting', record.castingTime || '')}
        ${renderBuilderInput('spellRange', 'Range', record.range || '')}
        ${renderBuilderInput('spellDuration', 'Duration', record.duration || '')}
      </div>
      <div class="quick-controls">
        <button type="button" data-action="apply-spell-basics">Apply Spell Basics</button>
        <button type="button" data-action="tag-concentration">Tag Concentration</button>
        <button type="button" data-action="tag-ritual">Tag Ritual</button>
      </div>
    </section>`;
  }

  function supportsCharacterGrants(record) {
    return Array.isArray(record && record.grants)
      || ['features', 'races', 'classes', 'subclasses', 'backgrounds', 'feats', 'items'].includes(state.collection);
  }

  function renderCharacterGrantEditor(record) {
    const grants = Array.isArray(record.grants) ? record.grants : [];
    const spellOptions = getRecords('spells').map(spell => spell.name || spell.id).filter(Boolean).slice(0, 800);
    const featOptions = getRecords('feats').map(feat => feat.name || feat.id).filter(Boolean).slice(0, 800);
    const defaultLevel = Number(record.level || 1) || 1;
    return `<section class="guided-section">
      <h4>Character Grants</h4>
      <p class="field-note">${escapeHtml(grants.length ? `${grants.length} structured grant(s) on this rule.` : 'No structured grants yet.')}</p>
      <details open>
        <summary>Feat Grant</summary>
        <div class="guided-grid compact">
          <label><span>Mode</span><select data-builder-field="grantFeatMode">${renderSelectOptions(['choice', 'granted'], 'choice')}</select></label>
          <label><span>Feat</span><input list="rf-feat-options" data-builder-field="grantFeatName" placeholder="Leave blank for any feat"></label>
          <datalist id="rf-feat-options">${featOptions.map(name => `<option value="${escapeAttr(name)}"></option>`).join('')}</datalist>
          ${renderBuilderInput('grantFeatCount', 'Count', '1', 'number')}
          ${renderBuilderInput('grantFeatLevelGate', 'Level Gate', String(defaultLevel), 'number')}
          <button type="button" data-action="add-grant-feat">Add Feat Grant</button>
        </div>
      </details>
      <details open>
        <summary>Spell Grant</summary>
        <div class="guided-grid compact">
          <label><span>Spell</span><input list="rf-spell-options" data-builder-field="grantSpellName" placeholder="Shape Water"></label>
          <datalist id="rf-spell-options">${spellOptions.map(name => `<option value="${escapeAttr(name)}"></option>`).join('')}</datalist>
          <label><span>Mode</span><select data-builder-field="grantSpellMode">${renderSelectOptions(['known', 'feature-cast', 'prepared', 'spell-list'], 'known')}</select></label>
          ${renderBuilderInput('grantSpellLevelGate', 'Level Gate', '1', 'number')}
          <label><span>Ability</span><select data-builder-field="grantSpellAbility">${renderSelectOptions(['', ...ABILITIES.map(([key, label]) => `${key} ${label}`), 'choice int,wis,cha'], '')}</select></label>
          ${renderBuilderInput('grantSpellCastLevel', 'Cast Level', '', 'number')}
          ${renderBuilderInput('grantSpellUses', 'Uses', '', 'number')}
          <label><span>Reset</span><select data-builder-field="grantSpellReset">${renderSelectOptions(['', 'longRest', 'shortRest', 'dawn'], '')}</select></label>
          <label class="check-row"><input type="checkbox" data-builder-field="grantSpellSlots"> <span>Can also use spell slots</span></label>
          <button type="button" data-action="add-grant-spell">Add Spell Grant</button>
        </div>
      </details>
      <details>
        <summary>Proficiency / Defense / Speed</summary>
        <div class="guided-grid compact">
          <label><span>Proficiency</span><select data-builder-field="grantProficiencyType">${renderSelectOptions(['skill', 'tool', 'weapon', 'saving-throw'], 'skill')}</select></label>
          ${renderBuilderInput('grantProficiencyValue', 'Value', '')}
          ${renderBuilderInput('grantProficiencyLevelGate', 'Level Gate', String(defaultLevel), 'number')}
          <button type="button" data-action="add-grant-proficiency">Add Proficiency</button>
          <label><span>Language</span><select data-builder-field="grantLanguage">${renderSelectOptions(['', ...LANGUAGES], '')}</select></label>
          <button type="button" data-action="add-grant-language">Add Language</button>
          <label><span>Resistance</span><select data-builder-field="grantResistance">${renderSelectOptions(['', ...DAMAGE_TYPES], '')}</select></label>
          <button type="button" data-action="add-grant-resistance">Add Resistance</button>
          <label><span>Movement</span><select data-builder-field="grantMovement">${renderSelectOptions(MOVEMENT_TYPES, 'swim')}</select></label>
          ${renderBuilderInput('grantMovementValue', 'Speed / Equals', '30')}
          <button type="button" data-action="add-grant-speed">Add Speed</button>
        </div>
      </details>
    </section>`;
  }

  function renderEmbeddedBuilders() {
    return `<section class="guided-section" data-add-embedded>
      <h4>Add Embedded Rule</h4>
      <div class="quick-controls">
        <button type="button" data-action="infer-action-saves">Infer Save/DC Metadata</button>
      </div>
      <div class="builder-tabs">
        <details>
          <summary>Action</summary>
          <div class="guided-grid">
            ${renderBuilderInput('actionTitle', 'Title', '')}
            <label><span>Timing</span><select data-builder-field="actionGroup">${renderSelectOptions(TIMING_OPTIONS, 'Action')}</select></label>
            ${renderBuilderInput('actionType', 'Type', getDefaultEmbeddedType())}
            <label class="wide"><span>Detail</span><textarea data-builder-field="actionDetail" rows="3" placeholder="What the action does"></textarea></label>
            <label class="check-row"><input type="checkbox" data-builder-field="actionRoll"> <span>Creates roll button</span></label>
            <label>
              <span>Save Ability</span>
              <select data-builder-field="actionSaveAbility">${renderSelectOptions(['None', ...ABILITIES.map(([, label]) => label)], 'None')}</select>
            </label>
            <label>
              <span>Save DC</span>
              <select data-builder-field="actionSaveDcType">${SAVE_DC_TYPES.map(([value, label]) => `<option value="${escapeAttr(value)}">${escapeHtml(label)}</option>`).join('')}</select>
            </label>
            ${renderBuilderInput('actionFixedDc', 'Fixed DC', '', 'number')}
            <label>
              <span>Formula Ability</span>
              <select data-builder-field="actionFormulaAbility">${renderSelectOptions(['Spellcasting Ability', ...ABILITIES.map(([, label]) => label)], 'Spellcasting Ability')}</select>
            </label>
            <button type="button" data-action="add-action">Add Action</button>
          </div>
        </details>
        <details>
          <summary>Resource</summary>
          <div class="guided-grid">
            ${renderBuilderInput('resourceName', 'Name', '')}
            ${renderBuilderInput('resourceMax', 'Uses', '1', 'number')}
            <label><span>Reset</span><select data-builder-field="resourceReset">${renderSelectOptions(['long rest', 'short rest', 'dawn', 'none'], 'long rest')}</select></label>
            <button type="button" data-action="add-resource">Add Resource</button>
          </div>
        </details>
        <details>
          <summary>Effect</summary>
          <div class="guided-grid">
            ${renderBuilderInput('effectLabel', 'Label', '')}
            <label><span>Kind</span><select data-builder-field="effectKind">${renderSelectOptions(EFFECT_KINDS, 'note')}</select></label>
            ${renderBuilderInput('effectValue', 'Value / Dice', '')}
            ${renderBuilderInput('effectDamageType', 'Damage Type', '')}
            <label class="wide"><span>Text</span><textarea data-builder-field="effectText" rows="3" placeholder="Short effect text"></textarea></label>
            <button type="button" data-action="add-effect">Add Effect</button>
          </div>
        </details>
        <details>
          <summary>Toggle</summary>
          <div class="guided-grid">
            ${renderBuilderInput('toggleLabel', 'Label', '')}
            <label><span>Timing</span><select data-builder-field="toggleTiming">${renderSelectOptions(['manual', 'on-hit', 'attack', 'damage', 'temporary'], 'manual')}</select></label>
            ${renderBuilderInput('toggleResource', 'Resource ID', '')}
            <label class="wide"><span>Text</span><textarea data-builder-field="toggleText" rows="3" placeholder="What the toggle enables"></textarea></label>
            <button type="button" data-action="add-toggle">Add Toggle</button>
          </div>
        </details>
      </div>
    </section>`;
  }

  function renderBuilderInput(name, label, value, type = 'text') {
    return `<label>
      <span>${escapeHtml(label)}</span>
      <input type="${escapeAttr(type)}" data-builder-field="${escapeAttr(name)}" value="${escapeAttr(value || '')}">
    </label>`;
  }

  function renderExistingEmbeddedEditors(record) {
    const groups = ['actions', 'resources', 'effects', 'toggles', 'grants']
      .map(field => ({ field, rows: Array.isArray(record && record[field]) ? record[field] : [] }))
      .filter(group => group.rows.length);
    if (!groups.length) return '';
    return `<section class="guided-section embedded-editors" data-existing-embedded>
      <h4>Edit Existing Embedded Rules</h4>
      ${groups.map(group => `
        <section class="embedded-group">
          <header>
            <strong>${escapeHtml(capitalize(group.field))}</strong>
            <span>${escapeHtml(String(group.rows.length))}</span>
          </header>
          <div class="embedded-card-list">
            ${group.rows.map((row, index) => renderEmbeddedEditorCard(group.field, row, index)).join('')}
          </div>
        </section>
      `).join('')}
    </section>`;
  }

  function renderEmbeddedEditorCard(field, row, index) {
    const title = getEmbeddedRowTitle(row, field) || `${capitalize(field.slice(0, -1))} ${index + 1}`;
    return `<details class="embedded-editor-card" data-existing-field="${escapeAttr(field)}" data-existing-index="${escapeAttr(index)}">
      <summary>
        <span>${escapeHtml(title)}</span>
        <small>${escapeHtml(formatEmbeddedRowMeta(row, field))}</small>
      </summary>
      ${renderEmbeddedEditorFields(field, row, index)}
      <div class="quick-controls embedded-card-actions">
        <button type="button" data-action="apply-embedded-edit" data-existing-field="${escapeAttr(field)}" data-existing-index="${escapeAttr(index)}">Apply Edit</button>
        <button type="button" data-action="duplicate-embedded" data-existing-field="${escapeAttr(field)}" data-existing-index="${escapeAttr(index)}">Duplicate</button>
        <button type="button" data-action="remove-embedded" data-existing-field="${escapeAttr(field)}" data-existing-index="${escapeAttr(index)}">Remove</button>
      </div>
    </details>`;
  }

  function renderEmbeddedEditorFields(field, row, index) {
    if (field === 'grants') return renderGrantEditorFields(row);
    const base = `
      <div class="guided-grid">
        ${renderExistingInput(field, index, 'id', 'ID', row.id || '')}
        ${renderExistingInput(field, index, getEmbeddedNameProp(field, row), getEmbeddedNameLabel(field), row.title || row.name || row.label || '')}
        ${renderExistingInput(field, index, 'tags', 'Tags', Array.isArray(row.tags) ? row.tags.join(', ') : '')}
      </div>`;
    if (field === 'actions') {
      return `${base}
        <div class="guided-grid">
          <label><span>Timing</span><select data-existing-prop="group">${renderSelectOptions(TIMING_OPTIONS, row.group || 'Action')}</select></label>
          ${renderExistingInput(field, index, 'type', 'Type', row.type || getDefaultEmbeddedType())}
          <label class="check-row"><input type="checkbox" data-existing-prop="roll" ${row.roll ? 'checked' : ''}> <span>Creates roll button</span></label>
          <label class="wide"><span>Detail</span><textarea data-existing-prop="detail" rows="4">${escapeHtml(row.detail || row.text || '')}</textarea></label>
        </div>
        ${renderExistingSaveFields(row)}`;
    }
    if (field === 'resources') {
      return `${base}
        <div class="guided-grid">
          ${renderExistingInput(field, index, 'max', 'Uses', row.max || row.uses || '', 'number')}
          <label><span>Reset</span><select data-existing-prop="reset">${renderSelectOptions(['long rest', 'short rest', 'dawn', 'none'], row.reset || 'long rest')}</select></label>
          ${renderExistingInput(field, index, 'sourceId', 'Source ID', row.sourceId || '')}
        </div>`;
    }
    if (field === 'effects') {
      return `${base}
        <div class="guided-grid">
          <label><span>Kind</span><select data-existing-prop="kind">${renderSelectOptions(EFFECT_KINDS, row.kind || 'note')}</select></label>
          ${renderExistingInput(field, index, 'value', 'Value', row.value || '')}
          ${renderExistingInput(field, index, 'dice', 'Dice', row.dice || '')}
          ${renderExistingInput(field, index, 'damageType', 'Damage Type', row.damageType || '')}
          <label class="wide"><span>Text</span><textarea data-existing-prop="text" rows="4">${escapeHtml(row.text || row.detail || '')}</textarea></label>
        </div>`;
    }
    if (field === 'toggles') {
      return `${base}
        <div class="guided-grid">
          <label><span>Timing</span><select data-existing-prop="timing">${renderSelectOptions(['manual', 'on-hit', 'before-attack', 'attack', 'damage', 'temporary'], row.timing || 'manual')}</select></label>
          <label><span>Applies To</span><select data-existing-prop="appliesTo">${renderSelectOptions(['', 'this-weapon', 'equipped-weapon'], row.appliesTo || '')}</select></label>
          <label><span>Consume On</span><select data-existing-prop="consumeOn">${renderSelectOptions(['', 'damage-roll', 'activation', 'manual'], row.consumeOn || '')}</select></label>
          ${renderExistingInput(field, index, 'resourceId', 'Resource ID', row.resourceId || '')}
          ${renderExistingInput(field, index, 'valueKey', 'Value Key', row.valueKey || '')}
          ${renderExistingInput(field, index, 'defaultValue', 'Default Value', row.defaultValue ?? '', 'number')}
          ${renderExistingInput(field, index, 'min', 'Min', row.min ?? '', 'number')}
          ${renderExistingInput(field, index, 'max', 'Max', row.max ?? '', 'number')}
          ${renderExistingInput(field, index, 'step', 'Step', row.step ?? '', 'number')}
          <label class="wide"><span>Text</span><textarea data-existing-prop="text" rows="4">${escapeHtml(row.text || row.detail || '')}</textarea></label>
        </div>`;
    }
    return `${base}
      <div class="guided-grid">
        <label><span>Timing</span><select data-existing-prop="timing">${renderSelectOptions(['manual', 'on-hit', 'attack', 'damage', 'temporary'], row.timing || 'manual')}</select></label>
        ${renderExistingInput(field, index, 'resourceId', 'Resource ID', row.resourceId || '')}
        <label class="wide"><span>Text</span><textarea data-existing-prop="text" rows="4">${escapeHtml(row.text || row.detail || '')}</textarea></label>
      </div>`;
  }

  function renderGrantEditorFields(row) {
    const type = row.type || 'spell';
    const grantMode = row.grantMode || row.mode || 'known';
    return `
      <div class="guided-grid">
        <label><span>Type</span><select data-existing-prop="type">${renderSelectOptions(['spell', 'feat', 'language', 'skill', 'tool', 'weapon', 'saving-throw', 'resistance', 'immunity', 'vulnerability', 'speed', 'trait', 'size', 'sense', 'ability-score', 'spellcasting', 'hit-die'], type)}</select></label>
        ${renderExistingInput('grants', 0, 'spellId', 'Spell ID', row.spellId || '')}
        ${renderExistingInput('grants', 0, 'spellName', 'Spell Name', row.spellName || row.name || '')}
        ${renderExistingInput('grants', 0, 'featId', 'Feat ID', row.featId || '')}
        ${renderExistingInput('grants', 0, 'featName', 'Feat Name', row.featName || '')}
        <label><span>Mode</span><select data-existing-prop="mode">${renderSelectOptions(['', 'choice', 'known', 'feature-cast', 'prepared', 'spell-list', 'granted'], grantMode)}</select></label>
        ${renderExistingInput('grants', 0, 'count', 'Count', row.count || '', 'number')}
        ${renderExistingInput('grants', 0, 'optionSet', 'Option Set', row.optionSet || '')}
        ${renderExistingInput('grants', 0, 'options', 'Options', Array.isArray(row.options) ? row.options.join(', ') : row.options || '')}
        ${renderExistingInput('grants', 0, 'levelGate', 'Level Gate', row.levelGate || '', 'number')}
        ${renderExistingInput('grants', 0, 'castLevel', 'Cast Level', row.castLevel ?? '', 'number')}
        <label><span>Ability</span><select data-existing-prop="ability">${renderSelectOptions(['', ...ABILITIES.map(([key, label]) => `${key} ${label}`)], getAbilityLabel(row.ability || '') || '')}</select></label>
        ${renderExistingInput('grants', 0, 'abilityOptions', 'Ability Options', Array.isArray(row.abilityOptions) ? row.abilityOptions.join(', ') : '')}
        ${renderExistingInput('grants', 0, 'uses', 'Uses', row.uses || '', 'number')}
        <label><span>Reset</span><select data-existing-prop="reset">${renderSelectOptions(['', 'longRest', 'shortRest', 'dawn', 'long rest', 'short rest'], row.reset || '')}</select></label>
        ${renderExistingInput('grants', 0, 'language', 'Language', row.language || '')}
        ${renderExistingInput('grants', 0, 'skill', 'Skill', row.skill || '')}
        ${renderExistingInput('grants', 0, 'tool', 'Tool', row.tool || '')}
        ${renderExistingInput('grants', 0, 'weapon', 'Weapon', row.weapon || '')}
        ${renderExistingInput('grants', 0, 'damageType', 'Damage Type', row.damageType || '')}
        ${renderExistingInput('grants', 0, 'movement', 'Movement', row.movement || '')}
        ${renderExistingInput('grants', 0, 'value', 'Value', row.value ?? '')}
        ${renderExistingInput('grants', 0, 'equals', 'Equals', row.equals || '')}
        ${renderExistingInput('grants', 0, 'sense', 'Sense', row.sense || '')}
        ${renderExistingInput('grants', 0, 'range', 'Range', row.range || '', 'number')}
        ${renderExistingInput('grants', 0, 'name', 'Name', row.name || '')}
        ${renderExistingInput('grants', 0, 'resourceId', 'Resource ID', row.resourceId || '')}
        <label class="check-row"><input type="checkbox" data-existing-prop="autoKnown" ${row.autoKnown ? 'checked' : ''}> <span>Auto known</span></label>
        <label class="check-row"><input type="checkbox" data-existing-prop="nonRemovable" ${row.nonRemovable ? 'checked' : ''}> <span>Non-removable</span></label>
        <label class="check-row"><input type="checkbox" data-existing-prop="canUseSpellSlots" ${row.canUseSpellSlots ? 'checked' : ''}> <span>Can use spell slots</span></label>
        <label class="check-row"><input type="checkbox" data-existing-prop="consumesSlot" ${row.consumesSlot ? 'checked' : ''}> <span>Consumes slot</span></label>
      </div>`;
  }

  function renderExistingInput(field, index, prop, label, value, type = 'text') {
    return `<label>
      <span>${escapeHtml(label)}</span>
      <input type="${escapeAttr(type)}" data-existing-prop="${escapeAttr(prop)}" value="${escapeAttr(value || '')}">
    </label>`;
  }

  function renderExistingSaveFields(row) {
    const save = getSaveDefinition(row) || {};
    const dcType = getSaveDcType(save);
    return `<fieldset class="save-editor">
      <legend>Save / DC</legend>
      <div class="guided-grid">
        <label>
          <span>Save Ability</span>
          <select data-existing-prop="save.ability">${renderSelectOptions(['None', ...ABILITIES.map(([, label]) => label)], getAbilityLabel(save.ability || save.saveAbility || '') || 'None')}</select>
        </label>
        <label>
          <span>Save DC</span>
          <select data-existing-prop="save.dcType">${SAVE_DC_TYPES.map(([value, label]) => `<option value="${escapeAttr(value)}" ${value === dcType ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>
        </label>
        ${renderExistingInput('actions', 0, 'save.fixedDc', 'Fixed DC', getFixedSaveValue(save), 'number')}
        <label>
          <span>Formula Ability</span>
          <select data-existing-prop="save.formulaAbility">${renderSelectOptions(['Spellcasting Ability', ...ABILITIES.map(([, label]) => label)], getAbilityLabel(save.formulaAbility || 'spellcasting') || 'Spellcasting Ability')}</select>
        </label>
      </div>
    </fieldset>`;
  }

  async function handleAction(action, element) {
    if (action === 'copy-item-actions') {
      normalizeItemActions();
      return;
    }
    if (action === 'add-tag') {
      addTag(element && element.dataset.tag);
      return;
    }
    if (action === 'remove-tag') {
      removeTag(element && element.dataset.tag);
      return;
    }
    if (action === 'apply-feat-ability') {
      applyFeatAbility();
      return;
    }
    if (action === 'set-feat-any-ability') {
      setFeatAnyAbility();
      return;
    }
    if (action === 'clear-feat-ability') {
      clearFeatAbility();
      return;
    }
    if (action === 'set-passive' || action === 'set-triggered') {
      setTiming(action === 'set-passive' ? 'Passive' : 'Triggered');
      return;
    }
    if (action === 'apply-spell-basics') {
      applySpellBasics();
      return;
    }
    if (action === 'tag-concentration' || action === 'tag-ritual') {
      addTag(action === 'tag-concentration' ? 'Concentration' : 'Ritual');
      return;
    }
    if (action === 'add-grant-spell') {
      addGrantSpell();
      return;
    }
    if (action === 'add-grant-feat') {
      addGrantFeat();
      return;
    }
    if (action === 'add-grant-proficiency') {
      addGrantProficiency();
      return;
    }
    if (action === 'add-grant-language') {
      addGrantLanguage();
      return;
    }
    if (action === 'add-grant-resistance') {
      addGrantResistance();
      return;
    }
    if (action === 'add-grant-speed') {
      addGrantSpeed();
      return;
    }
    if (action === 'add-action') {
      addEmbeddedAction();
      return;
    }
    if (action === 'add-resource') {
      addEmbeddedResource();
      return;
    }
    if (action === 'add-effect') {
      addEmbeddedEffect();
      return;
    }
    if (action === 'add-toggle') {
      addEmbeddedToggle();
      return;
    }
    if (action === 'infer-action-saves') {
      inferActionSaves();
      return;
    }
    if (action === 'apply-embedded-edit') {
      applyEmbeddedEdit(element);
      return;
    }
    if (action === 'duplicate-embedded') {
      duplicateEmbeddedRow(element);
      return;
    }
    if (action === 'remove-embedded') {
      removeEmbeddedRow(element);
      return;
    }
    if (action === 'reset-editor') {
      const original = getSelectedRecord() || {};
      setEditorRecord(original);
      refreshRecordPreview(original);
      refreshExistingEmbeddedEditors(original);
      setStatus('Editor reset.', 'ok');
      return;
    }
    if (action === 'reload') {
      await reloadRules();
      return;
    }
    if (action === 'save-record') {
      await saveRecord();
    }
  }

  function applyQuickField(input) {
    const field = input.dataset.quickField;
    if (!field) return;
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    const value = String(input.value || '').trim();
    if (field === 'timing') {
      if (state.collection === 'spells') next.castingTime = value;
      else next.timing = value;
    } else if (field) {
      if (value) next[field] = value;
      else delete next[field];
    }
    stageRecord(next, `Updated ${field}. Save to persist.`);
  }

  function applyTagInput(input) {
    const value = String(input.value || '').trim();
    if (!value) return;
    addTag(value);
    input.value = '';
  }

  function applyNoWeaponAttack(checked) {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    if (checked) {
      next.weapon = false;
      next.damage = '';
      next.tags = uniqueText([...(Array.isArray(next.tags) ? next.tags : []), 'NoWeaponAttack', 'NoAutoDamage']);
    } else {
      if (next.weapon === false) delete next.weapon;
      if (next.damage === '') delete next.damage;
      if (Array.isArray(next.tags)) next.tags = next.tags.filter(tag => !['NoWeaponAttack', 'NoAutoDamage'].includes(tag));
    }
    stageRecord(next, 'Quick edit staged. Save to update the rule record.');
  }

  function normalizeItemActions() {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    next.actions = (Array.isArray(next.actions) ? next.actions : []).map(action => ({
      id: action.id || slugify(action.title || action.name || 'item-action'),
      group: action.group || 'Action',
      type: action.type || 'Item',
      title: action.title || action.name || '',
      detail: action.detail || action.text || '',
      tags: Array.isArray(action.tags) ? action.tags : [],
      roll: Boolean(action.roll),
    }));
    stageRecord(next, 'Item actions normalized in the editor.');
  }

  function addTag(tag) {
    const clean = String(tag || '').trim();
    if (!clean) return;
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    next.tags = uniqueText([...(Array.isArray(next.tags) ? next.tags : []), clean]);
    stageRecord(next, `Added ${clean} tag. Save to persist.`);
  }

  function removeTag(tag) {
    const clean = String(tag || '').trim().toLowerCase();
    if (!clean) return;
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    next.tags = (Array.isArray(next.tags) ? next.tags : []).filter(value => String(value || '').trim().toLowerCase() !== clean);
    if (!next.tags.length) delete next.tags;
    stageRecord(next, 'Removed tag. Save to persist.');
  }

  function applyFeatAbility() {
    const abilityLabel = getBuilderValue('featAbility');
    const ability = getAbilityKey(abilityLabel);
    const amount = Math.max(1, Math.min(2, Number(getBuilderValue('featAbilityAmount')) || 1));
    if (!ability) return setStatus('Choose an ability first.', 'error');
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    next.ability = [{ [ability]: amount }];
    next.abilityScores = `${getAbilityLabel(ability)} +${amount}, maximum 20`;
    next.tags = uniqueText([...(Array.isArray(next.tags) ? next.tags : []), 'AbilityScoreIncrease']);
    if (!next.timing) next.timing = 'Passive';
    stageRecord(next, `Set ${getAbilityLabel(ability)} +${amount}. Save to persist.`);
  }

  function setFeatAnyAbility() {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    next.ability = [{ choose: { from: ABILITIES.map(([key]) => key), amount: 1 } }];
    next.abilityScores = 'Choose one ability score +1, maximum 20';
    next.tags = uniqueText([...(Array.isArray(next.tags) ? next.tags : []), 'AbilityScoreIncrease', 'Choice']);
    if (!next.timing) next.timing = 'Passive';
    stageRecord(next, 'Set choose-any ability increase. Save to persist.');
  }

  function clearFeatAbility() {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    delete next.ability;
    delete next.abilityScores;
    if (Array.isArray(next.tags)) next.tags = next.tags.filter(tag => tag !== 'AbilityScoreIncrease');
    if (Array.isArray(next.tags) && !next.tags.length) delete next.tags;
    stageRecord(next, 'Cleared feat ability data. Save to persist.');
  }

  function setTiming(value) {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    next.timing = value;
    stageRecord(next, `Set timing to ${value}. Save to persist.`);
  }

  function applySpellBasics() {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    next.level = getBuilderValue('spellLevel');
    next.school = getBuilderValue('spellSchool');
    next.castingTime = getBuilderValue('spellCastingTime');
    next.range = getBuilderValue('spellRange');
    next.duration = getBuilderValue('spellDuration');
    stageRecord(next, 'Applied spell basics. Save to persist.');
  }

  function addEmbeddedAction() {
    const title = getBuilderValue('actionTitle');
    if (!title) return setStatus('Action title is required.', 'error');
    const save = buildActionSaveDefinitionFromBuilder();
    const action = {
      id: slugify(title),
      group: getBuilderValue('actionGroup') || 'Action',
      type: getBuilderValue('actionType') || getDefaultEmbeddedType(),
      title,
      detail: getBuilderValue('actionDetail'),
      tags: save ? ['Save'] : [],
      roll: Boolean(getBuilderChecked('actionRoll')),
    };
    if (save) action.save = save;
    appendEmbeddedRecord('actions', action, `Added ${title} action. Save to persist.`);
  }

  function addGrantSpell() {
    const spellName = getBuilderValue('grantSpellName');
    if (!spellName) return setStatus('Spell name is required.', 'error');
    const mode = getBuilderValue('grantSpellMode') || 'known';
    const ability = parseGrantAbility(getBuilderValue('grantSpellAbility'));
    const grant = {
      type: 'spell',
      spellId: slugify(spellName),
      spellName,
      mode,
      grantMode: mode,
      levelGate: Number(getBuilderValue('grantSpellLevelGate')) || 1,
      ...ability,
      nonRemovable: true,
    };
    const castLevel = Number(getBuilderValue('grantSpellCastLevel'));
    const uses = Number(getBuilderValue('grantSpellUses'));
    if (Number.isFinite(castLevel) && castLevel >= 0) grant.castLevel = castLevel;
    if (Number.isFinite(uses) && uses > 0) grant.uses = uses;
    const reset = getBuilderValue('grantSpellReset');
    if (reset) grant.reset = reset;
    if (getBuilderChecked('grantSpellSlots')) grant.canUseSpellSlots = true;
    appendGrantRecord(grant, `Added ${spellName} spell grant. Save to persist.`);
  }

  function addGrantFeat() {
    const mode = getBuilderValue('grantFeatMode') || 'choice';
    const featName = getBuilderValue('grantFeatName');
    const count = Math.max(1, Number(getBuilderValue('grantFeatCount')) || 1);
    const levelGate = Math.max(1, Number(getBuilderValue('grantFeatLevelGate')) || 1);
    const grant = {
      type: 'feat',
      mode,
      count,
      levelGate,
      optionSet: 'feats',
      nonRemovable: true,
    };
    if (featName) {
      if (mode === 'granted') {
        grant.featName = featName;
        grant.featId = slugify(featName);
      } else {
        grant.options = [featName];
      }
    }
    appendGrantRecord(grant, `Added ${mode === 'granted' && featName ? featName : 'feat choice'} grant. Save to persist.`);
  }

  function addGrantProficiency() {
    const type = getBuilderValue('grantProficiencyType') || 'skill';
    const value = getBuilderValue('grantProficiencyValue');
    if (!value) return setStatus('Proficiency value is required.', 'error');
    const grantType = type === 'saving-throw' ? 'saving-throw' : type;
    const prop = grantType === 'saving-throw' ? 'ability' : grantType;
    const grant = {
      type: grantType,
      [prop]: grantType === 'saving-throw' ? getAbilityKey(value) || value : value,
      levelGate: Math.max(1, Number(getBuilderValue('grantProficiencyLevelGate')) || 1),
    };
    appendGrantRecord(grant, `Added ${value} ${type} grant. Save to persist.`);
  }

  function addGrantLanguage() {
    const language = getBuilderValue('grantLanguage');
    if (!language) return setStatus('Choose a language first.', 'error');
    appendGrantRecord({ type: 'language', language }, `Added ${language} language grant. Save to persist.`);
  }

  function addGrantResistance() {
    const damageType = getBuilderValue('grantResistance');
    if (!damageType) return setStatus('Choose a damage type first.', 'error');
    appendGrantRecord({ type: 'resistance', damageType }, `Added ${damageType} resistance grant. Save to persist.`);
  }

  function addGrantSpeed() {
    const movement = getBuilderValue('grantMovement') || 'walk';
    const rawValue = getBuilderValue('grantMovementValue') || '30';
    const numeric = Number(rawValue);
    const grant = {
      type: 'speed',
      movement,
      value: Number.isFinite(numeric) && rawValue.trim() !== '' ? numeric : rawValue,
    };
    if (!Number.isFinite(numeric) && rawValue) grant.equals = rawValue;
    appendGrantRecord(grant, `Added ${movement} speed grant. Save to persist.`);
  }

  function appendGrantRecord(grant, message) {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const record = parsed.value;
    const grants = Array.isArray(record.grants) ? record.grants.slice() : [];
    const key = grantKey(grant);
    const index = grants.findIndex(existing => grantKey(existing) === key);
    if (index >= 0) grants[index] = { ...grants[index], ...grant };
    else grants.push(grant);
    stageRecord({ ...record, grants }, message);
  }

  function grantKey(grant) {
    return [
      grant && grant.type,
      grant && (grant.spellId || grant.featId || grant.spellName || grant.featName || grant.language || grant.skill || grant.tool || grant.weapon || grant.ability || grant.damageType || grant.movement || grant.value || grant.optionSet),
      grant && (grant.levelGate || ''),
      grant && (grant.mode || grant.grantMode || ''),
      grant && (grant.count || ''),
    ]
      .map(value => String(value || '').toLowerCase())
      .join(':');
  }

  function parseGrantAbility(value) {
    const clean = String(value || '').trim();
    if (!clean) return {};
    if (/^choice\b/i.test(clean)) {
      const options = clean.replace(/^choice/i, '').split(/[,/| ]+/).map(part => part.trim().slice(0, 3).toLowerCase()).filter(Boolean);
      return options.length ? { abilityOptions: options } : {};
    }
    const key = clean.slice(0, 3).toLowerCase();
    return ABILITIES.some(([ability]) => ability === key) ? { ability: key } : {};
  }

  function addEmbeddedResource() {
    const name = getBuilderValue('resourceName');
    if (!name) return setStatus('Resource name is required.', 'error');
    appendEmbeddedRecord('resources', {
      id: slugify(name),
      name,
      max: Number(getBuilderValue('resourceMax')) || 1,
      reset: getBuilderValue('resourceReset') || 'long rest',
    }, `Added ${name} resource. Save to persist.`);
  }

  function addEmbeddedEffect() {
    const label = getBuilderValue('effectLabel');
    if (!label) return setStatus('Effect label is required.', 'error');
    const kind = getBuilderValue('effectKind') || 'note';
    const value = getBuilderValue('effectValue');
    const effect = {
      id: slugify(label),
      label,
      kind,
      text: getBuilderValue('effectText'),
    };
    if (kind === 'extra-damage') {
      effect.dice = value;
      effect.damageType = getBuilderValue('effectDamageType') || 'weapon';
    } else if (value) {
      effect.value = Number(value) || value;
    }
    appendEmbeddedRecord('effects', effect, `Added ${label} effect. Save to persist.`);
  }

  function addEmbeddedToggle() {
    const label = getBuilderValue('toggleLabel');
    if (!label) return setStatus('Toggle label is required.', 'error');
    const toggle = {
      id: slugify(label),
      label,
      timing: getBuilderValue('toggleTiming') || 'manual',
      text: getBuilderValue('toggleText'),
    };
    const resourceId = getBuilderValue('toggleResource');
    if (resourceId) toggle.resourceId = resourceId;
    appendEmbeddedRecord('toggles', toggle, `Added ${label} toggle. Save to persist.`);
  }

  function appendEmbeddedRecord(field, row, message) {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    next[field] = [...(Array.isArray(next[field]) ? next[field] : []), row];
    stageRecord(next, message);
  }

  function applyEmbeddedEdit(element) {
    const pointer = getEmbeddedPointer(element);
    if (!pointer) return setStatus('Could not identify embedded rule.', 'error');
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const rows = Array.isArray(parsed.value[pointer.field]) ? parsed.value[pointer.field].slice() : [];
    if (!rows[pointer.index]) return setStatus('Embedded rule no longer exists.', 'error');
    rows[pointer.index] = readEmbeddedEditCard(pointer.card, pointer.field, rows[pointer.index]);
    parsed.value[pointer.field] = rows;
    stageRecord(parsed.value, `Updated ${getEmbeddedRowTitle(rows[pointer.index], pointer.field)}. Save to persist.`);
  }

  function duplicateEmbeddedRow(element) {
    const pointer = getEmbeddedPointer(element);
    if (!pointer) return setStatus('Could not identify embedded rule.', 'error');
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const rows = Array.isArray(parsed.value[pointer.field]) ? parsed.value[pointer.field].slice() : [];
    const source = rows[pointer.index];
    if (!source) return setStatus('Embedded rule no longer exists.', 'error');
    const copy = cloneEmbeddedRow(source, rows);
    rows.splice(pointer.index + 1, 0, copy);
    parsed.value[pointer.field] = rows;
    stageRecord(parsed.value, `Duplicated ${getEmbeddedRowTitle(source, pointer.field)}. Save to persist.`);
  }

  function removeEmbeddedRow(element) {
    const pointer = getEmbeddedPointer(element);
    if (!pointer) return setStatus('Could not identify embedded rule.', 'error');
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const rows = Array.isArray(parsed.value[pointer.field]) ? parsed.value[pointer.field].slice() : [];
    const removed = rows.splice(pointer.index, 1)[0];
    if (!removed) return setStatus('Embedded rule no longer exists.', 'error');
    if (rows.length) parsed.value[pointer.field] = rows;
    else delete parsed.value[pointer.field];
    stageRecord(parsed.value, `Removed ${getEmbeddedRowTitle(removed, pointer.field)}. Save to persist.`);
  }

  function getEmbeddedPointer(element) {
    const card = element && element.closest('.embedded-editor-card');
    const field = element && (element.dataset.existingField || card && card.dataset.existingField);
    const index = Number(element && (element.dataset.existingIndex || card && card.dataset.existingIndex));
    if (!field || !Number.isInteger(index) || index < 0 || !card) return null;
    return { field, index, card };
  }

  function readEmbeddedEditCard(card, field, original) {
    const next = { ...(original || {}) };
    card.querySelectorAll('[data-existing-prop]').forEach(input => {
      const prop = input.dataset.existingProp;
      if (!prop || prop.startsWith('save.')) return;
      let value = input.type === 'checkbox' ? input.checked : String(input.value || '').trim();
      if (prop === 'tags') {
        const tags = parseTagList(value);
        if (tags.length) next.tags = tags;
        else delete next.tags;
        return;
      }
      if (prop === 'ability') {
        const ability = getAbilityKey(value);
        if (ability) next.ability = ability;
        else delete next.ability;
        return;
      }
      if (prop === 'abilityOptions') {
        const options = parseCsvList(value).map(item => item.slice(0, 3).toLowerCase()).filter(Boolean);
        if (options.length) next.abilityOptions = options;
        else delete next.abilityOptions;
        return;
      }
      if (prop === 'options') {
        const options = parseCsvList(value);
        if (options.length) next.options = options;
        else delete next.options;
        return;
      }
      if (['max', 'value', 'levelGate', 'castLevel', 'uses', 'count', 'range', 'defaultValue', 'min', 'step'].includes(prop) && value !== '') {
        const number = Number(value);
        value = Number.isFinite(number) ? number : value;
      }
      if (prop === 'roll') {
        next.roll = Boolean(value);
        return;
      }
      if (value === '') delete next[prop];
      else next[prop] = value;
    });

    if (field === 'actions') {
      const save = readEmbeddedSaveFields(card);
      if (save) {
        next.save = save;
        next.tags = uniqueText([...(Array.isArray(next.tags) ? next.tags : []), 'Save']);
      } else {
        delete next.save;
        if (Array.isArray(next.tags)) next.tags = next.tags.filter(tag => String(tag || '').toLowerCase() !== 'save');
        if (Array.isArray(next.tags) && !next.tags.length) delete next.tags;
      }
    }

    if (field === 'grants') {
      if (next.grantMode && !next.mode) next.mode = next.grantMode;
      if (next.mode && !next.grantMode) next.grantMode = next.mode;
      if (next.spellName && !next.spellId) next.spellId = slugify(next.spellName);
      if (next.featName && !next.featId && next.mode === 'granted') next.featId = slugify(next.featName);
      if (next.type !== 'spell') {
        delete next.spellId;
        delete next.spellName;
        delete next.grantMode;
        delete next.castLevel;
        delete next.autoKnown;
        delete next.canUseSpellSlots;
        delete next.consumesSlot;
      }
      if (next.type !== 'feat') {
        delete next.featId;
        delete next.featName;
      }
      if (!next.id) delete next.id;
    } else if (!next.id) next.id = slugify(getEmbeddedRowTitle(next, field));
    return next;
  }

  function readEmbeddedSaveFields(card) {
    const ability = getAbilityKey(getExistingValue(card, 'save.ability'));
    const dcType = getExistingValue(card, 'save.dcType') || 'none';
    if (dcType === 'none' && !ability) return null;
    const save = {};
    if (ability) save.ability = ability;
    if (dcType === 'spell') {
      save.dc = 'spell';
      save.source = 'spell';
    } else if (dcType === 'fixed') {
      const fixed = Number(getExistingValue(card, 'save.fixedDc'));
      if (!Number.isFinite(fixed) || fixed <= 0) return ability ? save : null;
      save.dc = fixed;
      save.source = 'fixed';
    } else if (dcType === 'formula') {
      save.dc = 'formula';
      save.source = 'formula';
      save.base = 8;
      save.formulaAbility = getAbilityKey(getExistingValue(card, 'save.formulaAbility')) || 'spellcasting';
    }
    return Object.keys(save).length ? save : null;
  }

  function getExistingValue(card, prop) {
    const field = card.querySelector(`[data-existing-prop="${cssEscape(prop)}"]`);
    if (!field) return '';
    return field.type === 'checkbox' ? (field.checked ? 'true' : '') : String(field.value || '').trim();
  }

  function cloneEmbeddedRow(row, siblings) {
    const copy = JSON.parse(JSON.stringify(row || {}));
    const titleProp = copy.title !== undefined ? 'title' : copy.name !== undefined ? 'name' : copy.label !== undefined ? 'label' : '';
    if (titleProp) copy[titleProp] = `${copy[titleProp] || 'Rule'} Copy`;
    const baseId = slugify(`${copy.id || copy[titleProp] || 'rule'}-copy`);
    const used = new Set((siblings || []).map(item => item && item.id).filter(Boolean));
    let id = baseId;
    let suffix = 2;
    while (used.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    copy.id = id;
    return copy;
  }

  function parseTagList(value) {
    return uniqueText(String(value || '').split(/[,|]/).map(item => item.trim()));
  }

  function parseCsvList(value) {
    return uniqueText(String(value || '').split(/[,|/]/).map(item => item.trim()));
  }

  function inferActionSaves() {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');
    const next = parsed.value;
    let updated = 0;

    if (state.collection === 'actions') {
      const save = inferSaveDefinition(`${next.detail || next.text || ''} ${next.meta || ''}`);
      if (save) {
        next.save = save;
        next.tags = uniqueText([...(Array.isArray(next.tags) ? next.tags : []), 'Save']);
        updated += 1;
      }
    }

    if (Array.isArray(next.actions)) {
      next.actions = next.actions.map(action => {
        const save = inferSaveDefinition(`${action && (action.detail || action.text) || ''} ${action && action.meta || ''}`);
        if (!save) return action;
        updated += 1;
        return {
          ...action,
          save,
          tags: uniqueText([...(Array.isArray(action && action.tags) ? action.tags : []), 'Save']),
        };
      });
    }

    if (!updated) return setStatus('No action save DC text found to infer.', 'error');
    stageRecord(next, `Added save/DC metadata to ${updated} action${updated === 1 ? '' : 's'}. Save to persist.`);
  }

  function buildActionSaveDefinitionFromBuilder() {
    const dcType = getBuilderValue('actionSaveDcType') || 'none';
    const ability = getAbilityKey(getBuilderValue('actionSaveAbility'));
    if (dcType === 'none' && !ability) return null;
    const save = {};
    if (ability) save.ability = ability;
    if (dcType === 'spell') {
      save.dc = 'spell';
      save.source = 'spell';
    } else if (dcType === 'fixed') {
      const fixed = Number(getBuilderValue('actionFixedDc'));
      if (!Number.isFinite(fixed) || fixed <= 0) return null;
      save.dc = fixed;
      save.source = 'fixed';
    } else if (dcType === 'formula') {
      save.dc = 'formula';
      save.source = 'formula';
      save.base = 8;
      save.formulaAbility = getAbilityKey(getBuilderValue('actionFormulaAbility')) || 'spellcasting';
    }
    return Object.keys(save).length ? save : null;
  }

  function inferSaveDefinition(text) {
    const value = String(text || '');
    if (!/\bdc\b|spell save dc|saving throw/i.test(value)) return null;
    const ability = getSaveAbilityFromText(value);
    const formula = getFormulaSaveFromText(value, ability);
    if (formula) return formula;
    if (/spell save dc/i.test(value)) return { ability, dc: 'spell', source: 'spell' };
    const fixed = getFixedSaveDcFromText(value);
    if (fixed) return { ability, dc: fixed, source: 'fixed' };
    return ability ? { ability, dc: 'spell', source: 'spell' } : null;
  }

  function getSaveAbilityFromText(text) {
    const match = String(text || '').match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw\b/i);
    return match ? getAbilityKey(match[1]) : '';
  }

  function getFormulaSaveFromText(text, saveAbility) {
    const match = String(text || '').match(/\bDC\b[^.]{0,100}?(?:is|=|equals?|equal to)?\s*8\s*\+\s*(?:your\s+)?([A-Za-z]+|spellcasting ability)\s+(?:ability\s+)?modifier\s*\+\s*(?:your\s+)?proficiency/i);
    if (!match) return null;
    return {
      ability: saveAbility || '',
      dc: 'formula',
      source: 'formula',
      base: 8,
      formulaAbility: getAbilityKey(match[1]) || 'spellcasting',
    };
  }

  function getFixedSaveDcFromText(text) {
    const patterns = [
      /\bsave\s+DC\s+of\s+(\d+)\b/i,
      /\bsave\s+DC\s*(\d+)\b/i,
      /\bDC\s*(?:of\s*)?(\d+)\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw\b/i,
      /\bDC\s*(\d+)\b/i,
      /\(DC\s*(\d+)\)/i,
    ];
    for (const pattern of patterns) {
      const match = String(text || '').match(pattern);
      if (match) return Number(match[1]) || 0;
    }
    return 0;
  }

  async function reloadRules() {
    const selected = state.selectedKey;
    setStatus('Reloading rules database...');
    await loadAll();
    state.selectedKey = selected;
    render();
  }

  async function saveRecord() {
    const parsed = readEditorRecord();
    if (!parsed.ok) return setStatus(parsed.error, 'error');

    const id = getRecordKey(parsed.value);
    if (!id) return setStatus('Record needs an id, name, title, or label.', 'error');

    state.saving = true;
    renderDetail();
    try {
      const result = await putRuleRecord(id, parsed.value);
      const saved = result.rule || parsed.value;
      upsertRecord(state.collection, saved);
      state.selectedKey = getRecordKey(saved);
      setStatus(`Saved ${getRecordName(saved)} to ${result.storage || 'rules database'}.`, 'ok');
    } catch (error) {
      setStatus(`Save failed: ${error.message}`, 'error');
    } finally {
      state.saving = false;
      render();
    }
  }

  function putRuleRecord(id, record) {
    return fetchJson(buildApiUrl(`rules/${encodeURIComponent(state.collection)}/${encodeURIComponent(id)}`), {
      method: 'PUT',
      body: JSON.stringify(record),
    });
  }

  function readEditorRecord() {
    const editor = state.root.querySelector('[data-record-editor]');
    if (!editor) return { ok: true, value: {} };
    const text = editor.value.trim();
    if (!text) return { ok: false, error: 'Record JSON cannot be empty.' };
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: false, error: 'Record must be a JSON object.' };
      }
      return { ok: true, value };
    } catch (error) {
      return { ok: false, error: `Invalid record JSON: ${error.message}` };
    }
  }

  function setEditorRecord(value) {
    const editor = state.root.querySelector('[data-record-editor]');
    if (editor) editor.value = JSON.stringify(value || {}, null, 2);
  }

  function stageRecord(value, message) {
    setEditorRecord(value);
    refreshRecordPreview(value);
    refreshExistingEmbeddedEditors(value);
    setStatus(message || 'Quick edit staged. Save to update the rule record.', 'ok');
  }

  function refreshRecordPreview(value) {
    const target = state.root && state.root.querySelector('.original-json code');
    if (target) target.textContent = JSON.stringify(value || {}, null, 2);
  }

  function refreshExistingEmbeddedEditors(value) {
    if (!state.root) return;
    const html = renderExistingEmbeddedEditors(value);
    const current = state.root.querySelector('[data-existing-embedded]');
    if (current) {
      if (html) current.outerHTML = html;
      else current.remove();
      return;
    }
    if (!html) return;
    const anchor = state.root.querySelector('[data-add-embedded]');
    if (anchor) anchor.insertAdjacentHTML('beforebegin', html);
  }

  function getBuilderValue(name) {
    const field = state.root.querySelector(`[data-builder-field="${cssEscape(name)}"]`);
    if (!field) return '';
    if (field.type === 'checkbox') return field.checked ? 'true' : '';
    return String(field.value || '').trim();
  }

  function getBuilderChecked(name) {
    const field = state.root.querySelector(`[data-builder-field="${cssEscape(name)}"]`);
    return Boolean(field && field.checked);
  }

  function renderSelectOptions(values, selected) {
    const selectedText = String(selected || '').toLowerCase();
    return values.map(value => {
      const text = String(value || '');
      const active = text.toLowerCase() === selectedText;
      return `<option value="${escapeAttr(text)}" ${active ? 'selected' : ''}>${escapeHtml(text || 'Unset')}</option>`;
    }).join('');
  }

  function getTypeFieldName(record) {
    if (Object.prototype.hasOwnProperty.call(record || {}, 'kind')) return 'kind';
    if (Object.prototype.hasOwnProperty.call(record || {}, 'sourceType')) return 'sourceType';
    return 'type';
  }

  function isRaceFeatureRecord(record) {
    return state.collection === 'features' && String(record && record.kind || '').toLowerCase() === 'race';
  }

  function getDefaultEmbeddedType() {
    const singular = state.collection.endsWith('s') ? state.collection.slice(0, -1) : state.collection;
    return capitalize(singular);
  }

  function getEmbeddedNameProp(field, row) {
    if (field === 'actions') return 'title';
    if (field === 'effects') return row && row.name !== undefined ? 'name' : 'label';
    return 'name';
  }

  function getEmbeddedNameLabel(field) {
    if (field === 'actions') return 'Title';
    if (field === 'effects') return 'Label / Name';
    return 'Name';
  }

  function formatEmbeddedRowMeta(row, field) {
    if (field === 'grants') {
      const parts = [
        row.type || 'grant',
        row.grantMode || row.mode || '',
        row.spellName || row.featName || row.language || row.skill || row.tool || row.weapon || row.ability || row.damageType || row.movement || row.sense || row.value || row.optionSet || '',
        row.count ? `${row.count} choice${Number(row.count) === 1 ? '' : 's'}` : '',
        row.levelGate ? `level ${row.levelGate}` : '',
        row.uses ? `${row.uses} use${Number(row.uses) === 1 ? '' : 's'}` : '',
        row.reset || '',
      ];
      return parts.filter(Boolean).join(' / ');
    }
    return [row.group || row.kind || row.timing || row.reset || '', formatActionSaveDefinition(row)].filter(Boolean).join(' / ');
  }

  function getEmbeddedRowTitle(row, field) {
    if (field === 'grants') {
      return String(row && (row.spellName || row.featName || row.language || row.skill || row.tool || row.weapon || row.ability || row.damageType || row.movement || row.sense || row.name || row.value || row.optionSet || row.id) || 'Grant');
    }
    return String(row && (row.title || row.name || row.label || row.id) || `${capitalize(String(field || 'rule').replace(/s$/, ''))}`);
  }

  function getSaveDefinition(row) {
    if (row && row.save && typeof row.save === 'object' && !Array.isArray(row.save)) return row.save;
    if (row && (row.saveDc || row.saveAbility || row.saveSource || row.saveBase || row.saveFormulaAbility)) {
      return {
        ability: row.saveAbility,
        dc: row.saveDc,
        source: row.saveSource,
        base: row.saveBase,
        formulaAbility: row.saveFormulaAbility,
      };
    }
    return null;
  }

  function getSaveDcType(save) {
    if (!save) return 'none';
    const dc = String(save.dc || save.value || save.saveDc || '').toLowerCase();
    const source = String(save.source || save.dcSource || save.dcType || '').toLowerCase();
    if (dc === 'spell' || source === 'spell' || source === 'spell save dc') return 'spell';
    if (dc === 'formula' || source === 'formula') return 'formula';
    if (Number(save.dc || save.value || save.saveDc || save.fixed || save.fixedDc) > 0) return 'fixed';
    return 'none';
  }

  function getFixedSaveValue(save) {
    if (!save) return '';
    const value = save.dc || save.value || save.saveDc || save.fixed || save.fixedDc || '';
    return Number(value) > 0 ? value : '';
  }

  function getFeatAbilityLabel(record) {
    const rows = Array.isArray(record && record.ability) ? record.ability : [];
    for (const row of rows) {
      for (const [ability, label] of ABILITIES) {
        if (row && row[ability]) return label;
      }
    }
    const text = String(record && record.abilityScores || '');
    return ABILITIES.find(([, label]) => new RegExp(`\\b${escapeRegExp(label)}\\b`, 'i').test(text))?.[1] || '';
  }

  function getAbilityKey(value) {
    const clean = normalizeSearch(value);
    return ABILITIES.find(([key, label]) => {
      const keyText = normalizeSearch(key);
      const labelText = normalizeSearch(label);
      return clean === keyText || clean === labelText || clean.startsWith(`${keyText} `) || clean.endsWith(` ${labelText}`);
    })?.[0] || '';
  }

  function getAbilityLabel(ability) {
    return ABILITIES.find(([key]) => key === ability)?.[1] || ability;
  }

  function formatActionSaveDefinition(row) {
    const save = row && row.save && typeof row.save === 'object' && !Array.isArray(row.save)
      ? row.save
      : row && (row.saveDc || row.saveAbility || row.saveSource)
        ? { ability: row.saveAbility, dc: row.saveDc, source: row.saveSource }
        : null;
    if (!save) return '';
    const ability = getAbilityLabel(save.ability || save.saveAbility || '');
    const dc = save.dc || save.value || save.saveDc || '';
    const source = save.source || save.dcSource || '';
    const dcText = dc === 'spell' || source === 'spell'
      ? 'spell save DC'
      : dc === 'formula' || source === 'formula'
        ? `DC ${save.base || 8} + ${getAbilityLabel(save.formulaAbility || 'spellcasting')} + proficiency`
        : dc
          ? `DC ${dc}`
          : 'save DC';
    return `${ability ? `${ability} save` : 'Save'} vs ${dcText}`;
  }

  function upsertRecord(collection, record) {
    const records = getRecords(collection).slice();
    const key = getRecordKey(record);
    const index = records.findIndex(candidate => getRecordKey(candidate) === key);
    if (index >= 0) records[index] = record;
    else records.push(record);
    state.catalogs[collection] = records.sort(compareRecords);
  }

  function getRecords(collectionId) {
    return state.catalogs[collectionId] || [];
  }

  function getFilteredRecords() {
    const query = normalizeSearch(state.query);
    const records = getRecords(state.collection);
    if (!query) return records.slice(0, 500);
    return records.filter(record => normalizeSearch([
      record.id,
      getRecordName(record),
      record.type,
      record.kind,
      record.sourceType,
      record.group,
      record.source,
      record.text,
      record.detail,
    ].filter(Boolean).join(' ')).includes(query)).slice(0, 500);
  }

  function getSelectedRecord(records = getFilteredRecords()) {
    if (state.selectedKey) {
      const found = getRecords(state.collection).find(record => getRecordKey(record) === state.selectedKey);
      if (found) return found;
    }
    return records[0] || null;
  }

  function getRecordKey(record) {
    return slugify(record && (record.id || record.name || record.title || record.label));
  }

  function getRecordName(record) {
    return String(record && (record.name || record.title || record.label || record.id) || 'Untitled');
  }

  function setStatus(message, kind = '') {
    state.status = message || '';
    state.statusKind = kind;
    const targets = state.root ? state.root.querySelectorAll('[data-status], [data-guided-status]') : [];
    targets.forEach(target => {
      target.textContent = state.status;
      target.className = `status-line${kind ? ` ${kind}` : ''}`;
    });
  }

  function compareRecords(a, b) {
    return getRecordName(a).localeCompare(getRecordName(b)) || getRecordKey(a).localeCompare(getRecordKey(b));
  }

  function normalizeSearch(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
  }

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_.:-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'rule';
  }

  function uniqueText(values) {
    const seen = new Set();
    const out = [];
    for (const value of values || []) {
      const clean = String(value || '').trim();
      const key = clean.toLowerCase();
      if (!clean || seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
    }
    return out;
  }

  function capitalize(value) {
    const clean = String(value || '');
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
  }

  function formatValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value || '');
  }

  function truncate(value, length) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > length ? `${text.slice(0, length - 1).trim()}...` : text;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value || ''));
    return String(value || '').replace(/["\\]/g, '\\$&');
  }
})();
