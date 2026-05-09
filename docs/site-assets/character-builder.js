(() => {
  const RULE_FILES = {
    classes: 'Assets/Rules/classes.json',
    subclasses: 'Assets/Rules/subclasses.json',
    races: 'Assets/Rules/races.json',
    backgrounds: 'Assets/Rules/backgrounds.json',
    feats: 'Assets/Rules/feats.json',
    items: 'Assets/Rules/items.json',
    spells: 'Assets/Rules/spells.json',
    features: 'Assets/Rules/features.json',
    actions: 'Assets/Rules/actions.json',
    resources: 'Assets/Rules/resources.json',
    manifest: 'Assets/Rules/manifest.json',
    profile: 'Assets/Rules/ruleset-profile.json',
  };
  const RULE_CATALOG_REFRESH_TOKEN = Date.now().toString(36);
  const RULE_CATALOG_API_ALIASES = {
    manifest: ['manifest', 'rules-manifest'],
    profile: ['profile', 'ruleset-profile'],
  };

  const OPTIONAL_FEATURE_NAMES = new Set([
    'additional artificer infusions',
    'additional bard spells',
    'additional cleric spells',
    'additional druid spells',
    'additional paladin spells',
    'additional ranger spells',
    'additional sorcerer spells',
    'additional warlock spells',
    'additional wizard spells',
    'additional monk weapons',
    'bardic versatility',
    'blessed strikes',
    'cantrip formulas',
    'cantrip versatility',
    'dedicated weapon',
    'deft explorer',
    'expanded spell list',
    'favored foe',
    'focused aim',
    'harness divine power',
    'instinctive pounce',
    'ki fueled attack',
    'magical inspiration',
    'martial versatility',
    'primal awareness',
    'primal knowledge',
    'quickened healing',
    'spell versatility',
    'spellcasting focus',
    'steady aim',
    'wild companion',
  ]);

  const FEATURE_CHOICE_GROUPS = [
    {
      className: 'Ranger',
      subclassName: 'Hunter',
      level: 3,
      group: "Hunter's Prey",
      options: ['Colossus Slayer', 'Giant Killer', 'Horde Breaker'],
    },
  ];
  const FIGHTING_STYLE_DETAILS = {
    archery: 'You gain a +2 bonus to attack rolls you make with ranged weapons.',
    defense: 'While you are wearing armor, you gain a +1 bonus to AC.',
    dueling: 'When wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.',
    'great weapon fighting': 'When you roll a 1 or 2 on a damage die for an attack with a two-handed or versatile melee weapon, reroll the die and use the new roll.',
    protection: 'When a creature you can see attacks a target other than you within 5 feet, use your reaction with a shield to impose disadvantage.',
    'two weapon fighting': 'When you engage in two-weapon fighting, add your ability modifier to the damage of the second attack.',
  };
  const METAMAGIC_OPTIONS = [
    'Careful Spell',
    'Distant Spell',
    'Empowered Spell',
    'Extended Spell',
    'Heightened Spell',
    'Quickened Spell',
    'Seeking Spell',
    'Subtle Spell',
    'Transmuted Spell',
    'Twinned Spell',
  ];

  const RESOURCE_ALIASES = [
    { match: /channel divinity/i, resourceId: 'cleric-channel-divinity' },
    { match: /ki\b|ki point/i, resourceId: 'monk-ki' },
    { match: /bardic inspiration/i, resourceId: 'bardic-inspiration' },
    { match: /wild shape/i, resourceId: 'druid-wild-shape' },
    { match: /action surge/i, resourceId: 'action-surge' },
    { match: /second wind/i, resourceId: 'second-wind' },
    { match: /portent/i, resourceId: 'wizard-portent' },
    { match: /healing hands/i, resourceId: 'race-aasimar-healing-hands-vgm' },
    { match: /breath weapon/i, resourceId: 'race-dragonborn-breath-weapon-phb' },
    { match: /luck points|lucky/i, resourceId: 'feat-lucky-luck-points' },
  ];
  const ABILITY_NAMES = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  };
  const SKILL_ABILITIES = {
    acrobatics: 'dex',
    animalhandling: 'wis',
    arcana: 'int',
    athletics: 'str',
    deception: 'cha',
    history: 'int',
    insight: 'wis',
    intimidation: 'cha',
    investigation: 'int',
    medicine: 'wis',
    nature: 'int',
    perception: 'wis',
    performance: 'cha',
    persuasion: 'cha',
    religion: 'int',
    sleightofhand: 'dex',
    stealth: 'dex',
    survival: 'wis',
  };

  const els = {};
  const data = {};
  const indexes = {};
  const STEPS = ['levels'];
  const XP_BY_LEVEL = {
    1: 0,
    2: 300,
    3: 900,
    4: 2700,
    5: 6500,
    6: 14000,
    7: 23000,
    8: 34000,
    9: 48000,
    10: 64000,
    11: 85000,
    12: 100000,
    13: 120000,
    14: 140000,
    15: 165000,
    16: 195000,
    17: 225000,
    18: 265000,
    19: 305000,
    20: 355000,
  };
  const FULL_CASTER_MAX_SPELL_LEVEL = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9, 9];
  const BUILDER_DRAFT_VERSION = 'fresh-v1';
  const BUILDER_STORAGE_PREFIX = `eldoria.characterBuilder.${BUILDER_DRAFT_VERSION}`;
  const BUILDER_NUMBER_FIELDS = {
    experience: [0, 9999999],
    gold: [0, 999999],
    heroPoints: [0, 99],
    guildPoints: [0, 999999],
  };
  let root = null;
  let state = makeDefaultState();
  let currentStep = 'levels';
  let ruleset = null;
  let activeChoiceGroups = [];
  let statusToastTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    root = document.querySelector('[data-character-builder]');
    wireAssistantModal();
    if (!root) return;
    cacheElements(root);
    wireEvents();
    setStatus('Loading rules...');
    try {
      await loadData();
      buildIndexes();
      populateStaticOptions();
      await loadCloudCharacters();
      await loadInitialState();
      render();
      setStatus('Ready');
    } catch (error) {
      console.error(error);
      setStatus(`Could not load builder data: ${error.message}`);
    }
  }

  function wireAssistantModal() {
    const modal = document.querySelector('[data-character-assistant-modal]');
    if (!modal || modal.dataset.assistantEventsBound === 'true') return;
    modal.dataset.assistantEventsBound = 'true';
    document.querySelectorAll('[data-character-assistant-open]').forEach(button => {
      button.addEventListener('click', () => {
        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
        currentStep = 'levels';
        render();
      });
    });
    modal.querySelectorAll('[data-character-assistant-close]').forEach(button => {
      button.addEventListener('click', () => {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
      });
    });
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
      }
    });
  }

  function ensureBuilderUiExtensions(scope) {
    const identityPanel = scope.querySelector('#identity-title') && scope.querySelector('#identity-title').closest('[data-step]');
    if (identityPanel && !scope.querySelector('[data-builder-save-fields]')) {
      identityPanel.insertAdjacentHTML('beforeend', `
        <div data-builder-save-fields>
          <h3>Campaign Progress</h3>
          <div class="form-grid">
            <label>
              Experience
              <input type="number" data-field="experience" min="0" max="9999999">
            </label>
            <label>
              Gold
              <input type="number" data-field="gold" min="0" max="999999">
            </label>
            <label>
              Hero Points
              <input type="number" data-field="heroPoints" min="0" max="99">
            </label>
            <label>
              Guild Rank
              <input type="text" data-field="guildRank" autocomplete="off">
            </label>
            <label>
              Guild Points
              <input type="number" data-field="guildPoints" min="0" max="999999">
            </label>
          </div>
        </div>
      `);
    }

    if (!scope.querySelector('[data-builder-toast]')) {
      scope.insertAdjacentHTML('beforeend', '<div data-builder-toast role="status" aria-live="polite" hidden style="position: fixed; right: 1rem; bottom: 1rem; z-index: 10000; max-width: 24rem; padding: 0.75rem 1rem; border-radius: 0.5rem; background: #123524; color: #fff; box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.25);"></div>');
    }
  }

  function cacheElements(scope) {
    ensureBuilderUiExtensions(scope);
    els.status = scope.querySelector('[data-builder-status]');
    els.statusToast = scope.querySelector('[data-builder-toast]');
    els.characterSelect = scope.querySelector('[data-character-select]');
    els.newDraft = scope.querySelector('[data-new-draft]');
    els.levelUp = scope.querySelector('[data-level-up]');
    els.saveCloud = scope.querySelector('[data-save-cloud]');
    els.storageNote = scope.querySelector('[data-storage-note]');
    els.currentState = scope.querySelector('[data-current-state]');
    els.copyExport = scope.querySelector('[data-copy-export]');
    els.stepPanels = [...scope.querySelectorAll('[data-step]')];
    els.stepButtons = [...scope.querySelectorAll('[data-step-target]')];
    els.prevStep = scope.querySelector('[data-prev-step]');
    els.nextStep = scope.querySelector('[data-next-step]');
    els.fields = Object.fromEntries([...scope.querySelectorAll('[data-field]')].map(field => [field.dataset.field, field]));
    els.abilityFields = Object.fromEntries([...scope.querySelectorAll('[data-ability-field]')].map(field => [field.dataset.abilityField, field]));
    els.addInputs = Object.fromEntries([...scope.querySelectorAll('[data-add-input]')].map(field => [field.dataset.addInput, field]));
    els.addButtons = [...scope.querySelectorAll('[data-add-kind]')];
    els.chipLists = Object.fromEntries([...scope.querySelectorAll('[data-chip-list]')].map(node => [node.dataset.chipList, node]));
    els.pickPanel = scope.querySelector('[aria-labelledby="picks-title"]');
    if (els.pickPanel) els.pickPanel.hidden = true;
    els.ruleDetails = Object.fromEntries([...scope.querySelectorAll('[data-rule-detail]')].map(node => [node.dataset.ruleDetail, node]));
    els.subclassField = scope.querySelector('[data-subclass-field]');
    els.rulePreviews = Object.fromEntries([...scope.querySelectorAll('[data-rule-preview]')].map(node => [node.dataset.rulePreview, node]));
    els.datalists = {
      feat: scope.querySelector('#feat-options'),
      item: scope.querySelector('#item-options'),
      spell: scope.querySelector('#spell-options'),
    };
    els.classGate = scope.querySelector('[data-class-gate]');
    els.featGate = scope.querySelector('[data-feat-gate]');
    els.spellGate = scope.querySelector('[data-spell-gate]');
    els.pickCounts = scope.querySelector('[data-pick-counts]');
    els.featureSummary = scope.querySelector('[data-feature-summary]');
    els.auditSummary = scope.querySelector('[data-audit-summary]');
    els.auditList = scope.querySelector('[data-audit-list]');
    els.nextLevelSummary = scope.querySelector('[data-next-level-summary]');
    els.choiceGroups = scope.querySelector('[data-choice-groups]');
    els.featureList = scope.querySelector('[data-feature-list]');
    els.actionSummary = scope.querySelector('[data-action-summary]');
    els.resourceList = scope.querySelector('[data-resource-list]');
    els.actionList = scope.querySelector('[data-action-list]');
    els.exportPacket = scope.querySelector('[data-export-packet]');
  }

  function wireEvents() {
    els.characterSelect.addEventListener('change', async () => {
      if (!els.characterSelect.value) {
        state = makeDefaultState();
      } else {
        await loadCharacterState(els.characterSelect.value);
      }
      render();
    });

    els.newDraft.addEventListener('click', () => {
      if (isSheetMode()) {
        state = getSheetInitialState();
        els.characterSelect.value = state.characterId || '';
      } else {
        els.characterSelect.value = '';
        state = makeDefaultState();
      }
      render();
      setStatus(isSheetMode() ? 'New character draft' : 'New character');
    });

    els.levelUp.addEventListener('click', () => {
      const next = getNextAllowedLevel();
      if (Number(state.level || 1) >= next) {
        setStatus('Already at level 20');
        return;
      }
      state.level = next;
      enforceLevelGates();
      currentStep = 'levels';
      render();
      setStatus(`Level ${state.level} draft`);
    });

    els.saveCloud.addEventListener('click', saveCharacterBuild);

    els.stepButtons.forEach(button => {
      button.addEventListener('click', () => {
        currentStep = button.dataset.stepTarget;
        renderSteps();
      });
    });

    els.prevStep.addEventListener('click', () => moveStep(-1));
    els.nextStep.addEventListener('click', () => moveStep(1));

    if (els.copyExport) {
      els.copyExport.addEventListener('click', async () => {
        const text = els.exportPacket.value;
        try {
          await navigator.clipboard.writeText(text);
          setStatus('Build JSON copied');
        } catch {
          els.exportPacket.focus();
          els.exportPacket.select();
          setStatus('Build JSON selected');
        }
      });
    }

    for (const [name, field] of Object.entries(els.fields)) {
      field.addEventListener('input', () => {
        if (name === 'level') state.level = clamp(Number(field.value) || 1, 1, 20);
        else if (name === 'maxHp' || name === 'currentHp') state[name] = normalizeHpInput(field.value);
        else if (Object.prototype.hasOwnProperty.call(BUILDER_NUMBER_FIELDS, name)) state[name] = normalizeNumberInput(field.value, ...BUILDER_NUMBER_FIELDS[name]);
        else if (name === 'hpMode') state.hpMode = field.value || 'auto-average';
        else state[name] = field.value;
        if (name === 'classId') {
          state.subclassId = '';
        }
        if (name === 'level' || name === 'classId' || name === 'hpMode') {
          enforceLevelGates();
        }
        render();
      });
    }

    for (const [ability, field] of Object.entries(els.abilityFields || {})) {
      field.addEventListener('input', () => {
        state.abilities = { ...(state.abilities || {}), [ability]: clamp(Number(field.value) || 10, 1, 30) };
        if (ability === 'con') enforceLevelGates();
        render();
      });
    }

    els.addButtons.forEach(button => {
      button.addEventListener('click', () => addRulePick(button.dataset.addKind));
    });

    Object.values(els.addInputs).forEach(input => {
      input.addEventListener('input', () => renderRulePickerPreview(input.dataset.addInput));
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        addRulePick(input.dataset.addInput);
      });
    });

    if (els.featureList) {
      els.featureList.addEventListener('change', event => {
        const checkbox = event.target.closest('[data-optional-feature-id]');
        if (!checkbox) return;
        toggleListValue(state.optionalFeatureIds, checkbox.dataset.optionalFeatureId, checkbox.checked);
        render();
      });
    }

    root.addEventListener('change', event => {
      if (!event.target.closest('[data-choice-scope]')) return;
      const picker = event.target.closest('[data-choice-pick-kind]');
      if (picker) {
        renderChoicePickerPreview(picker);
        return;
      }
      const asiSlot = event.target.closest('[data-asi-slot]');
      if (asiSlot) {
        const key = asiSlot.dataset.choiceGroup;
        const card = asiSlot.closest('[data-choice-scope]');
        const values = [...card.querySelectorAll(`[data-asi-slot][data-choice-group="${cssEscape(key)}"]`)]
          .map(slot => slot.value)
          .filter(Boolean);
        state.featureChoices[key] = values;
        updateAutomaticHitPoints();
        render();
        return;
      }
      const bonusFeat = event.target.closest('[data-bonus-feat-toggle]');
      if (bonusFeat) {
        const bonusKey = bonusFeat.dataset.choiceGroup;
        if (bonusFeat.checked) {
          state.featureChoices[bonusKey] = ['enabled'];
        } else {
          clearChoiceRulePicks('feat', bonusKey);
        }
        updateAutomaticHitPoints();
        render();
        return;
      }
      const optional = event.target.closest('[data-optional-feature-id]');
      if (optional) {
        toggleListValue(state.optionalFeatureIds, optional.dataset.optionalFeatureId, optional.checked);
        render();
        return;
      }
      const subclassPick = event.target.closest('[data-subclass-choice]');
      if (subclassPick) {
        state.subclassId = subclassPick.value;
        render();
        return;
      }
      const input = event.target.closest('[data-choice-group]');
      if (!input) return;
      const key = input.dataset.choiceGroup;
      if (input.type === 'checkbox') {
        const current = Array.isArray(state.featureChoices[key])
          ? state.featureChoices[key].slice()
          : String(state.featureChoices[key] || '').split(/[;,|]/).map(item => item.trim()).filter(Boolean);
        const count = Number(input.dataset.choiceCount) || 1;
        if (input.checked && !current.includes(input.value) && current.length >= count) {
          input.checked = false;
          setStatus(`Choose at most ${count} option${count === 1 ? '' : 's'} for this rule.`);
          return;
        }
        toggleListValue(current, input.value, input.checked);
        state.featureChoices[key] = current;
      } else {
        state.featureChoices[key] = input.value;
      }
      render();
    });

    root.addEventListener('click', event => {
      const choiceAdd = event.target.closest('[data-choice-add-kind]');
      if (choiceAdd) {
        addChoiceRulePick(choiceAdd);
        return;
      }
      const remove = event.target.closest('[data-remove-kind]');
      if (!remove) return;
      removeRulePick(remove.dataset.removeKind, remove.dataset.removeId, remove.dataset.removeGroup || '');
    });
  }

  async function loadData() {
    await Promise.all([
      ...Object.entries(RULE_FILES).map(async ([key, file]) => {
        data[key] = await loadRuleCatalog(key, file);
      }),
    ]);
    if (!window.EldoriaRuleset || typeof window.EldoriaRuleset.createRuleset !== 'function') {
      throw new Error('Shared Eldoria ruleset engine is not loaded.');
    }
    ruleset = window.EldoriaRuleset.createRuleset(data, data.profile || {});
    Object.assign(data, ruleset.rules);
    data.characters = [];
  }

  async function loadRuleCatalog(collection, file) {
    if (getApiBaseUrl()) {
      try {
        const cloudCatalog = await loadCloudRuleCatalog(collection);
        if (isUsableRuleCatalog(collection, cloudCatalog)) return cloudCatalog;
      } catch (error) {
        // Static catalogs keep the builder usable when the rules API is unavailable.
      }
    }
    return loadJson(resolveRuleUrl(file));
  }

  async function loadCloudRuleCatalog(collection) {
    const aliases = RULE_CATALOG_API_ALIASES[collection] || [collection];
    let lastError = null;
    for (const alias of aliases) {
      try {
        const payload = await fetchApi(`rules/${encodeURIComponent(alias)}`, {
          method: 'GET',
          query: getRuleCatalogRequestParams(),
        });
        return extractRuleCatalog(payload, collection);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`Rules catalog ${collection} unavailable`);
  }

  async function loadJson(url) {
    const response = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function resolveRuleUrl(file) {
    const base = String(root && root.dataset.rulesBase || '').trim();
    if (!base) return file;
    return `${base.replace(/\/?$/, '/')}${String(file || '').replace(/^\/+/, '')}`;
  }

  function getRuleCatalogRequestParams() {
    const version = getRuleCatalogVersion();
    return {
      v: version || RULE_CATALOG_REFRESH_TOKEN,
      _: RULE_CATALOG_REFRESH_TOKEN,
    };
  }

  function getRuleCatalogVersion() {
    const config = window.ELDORIA_PUBLIC_CONFIG || {};
    return String(
      root && root.dataset && root.dataset.rulesVersion
      || config.rulesCatalogVersion
      || config.rulesVersion
      || config.buildVersion
      || ''
    ).trim();
  }

  function extractRuleCatalog(payload, collection) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return payload;
    if (collection === 'manifest' || collection === 'profile') {
      const wrapped = payload.document || payload[collection] || payload.data || payload.catalog;
      return wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped) ? wrapped : payload;
    }
    const direct = payload[collection];
    if (Array.isArray(direct)) return direct;
    if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data[collection])) return payload.data[collection];
    for (const key of ['rules', 'items', 'records', 'rows', 'results', 'catalog', 'data']) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    return payload;
  }

  function isUsableRuleCatalog(collection, catalog) {
    if (collection === 'manifest' || collection === 'profile') {
      return Boolean(catalog && typeof catalog === 'object' && !Array.isArray(catalog));
    }
    return Array.isArray(catalog);
  }

  async function loadCloudCharacters() {
    try {
      const payload = await fetchApi('characters');
      data.characters = payload.characters || [];
      if (isSheetMode()) {
        const characterId = root.dataset.builderCharacterId || '';
        els.characterSelect.innerHTML = characterId ? `<option value="${escapeAttr(characterId)}">${escapeHtml(characterId)}</option>` : '';
        els.characterSelect.value = characterId;
      } else {
        fillSelect(els.characterSelect, data.characters.map(character => ({
          value: character.id,
          label: `${character.name} [${character.id}]`,
        })), 'New character');
      }
      els.storageNote.textContent = payload.storage === 'table'
        ? 'Cloud storage connected.'
        : 'Cloud storage is not configured here; player sheets require the API.';
    } catch (error) {
      data.characters = [];
      if (!isSheetMode()) fillSelect(els.characterSelect, [], 'New character');
      els.storageNote.textContent = `Cloud character list unavailable: ${error.message}`;
    }
  }

  async function loadCharacterState(characterId) {
    try {
      const character = await fetchApi(`characters/${encodeURIComponent(characterId)}`);
      if (!isFreshBuilderBuild(character)) {
        state = makeDefaultState();
        setStatus('Legacy cloud build ignored; start a new builder-confirmed character.');
        return;
      }
      state = { ...makeDefaultState(), ...normalizeLoadedBuild(character) };
      enforceLevelGates();
      setStatus('Cloud character loaded');
    } catch (error) {
      state = makeDefaultState();
      setStatus(`Could not load cloud character: ${error.message}`);
    }
  }

  async function saveCharacterBuild() {
    const packet = buildExportPacket(buildPacket());
    const id = isSheetMode()
      ? root.dataset.builderCharacterId || packet.id || slugify(packet.name || 'new-character')
      : packet.id || slugify(packet.name || 'new-character');
    if (!id || id === 'new-character') {
      setStatus('Name the character before saving');
      currentStep = 'levels';
      renderSteps();
      return;
    }
    packet.id = id;
    try {
      const response = await fetchApi(`characters/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(packet),
      });
      state.characterId = response.character && response.character.id || id;
      packet.id = state.characterId;
      const playerResponse = await fetchApi(`players/${encodeURIComponent(state.characterId)}`, {
        method: 'PUT',
        body: JSON.stringify(buildProjectedSheetFromPacket(packet)),
      });
      await loadCloudCharacters();
      els.characterSelect.value = state.characterId;
      if (playerResponse.player && window.EldoriaPlayerSheets && typeof window.EldoriaPlayerSheets.hydrate === 'function') {
        const sheet = document.querySelector(`[data-player-sheet][data-player-id="${cssEscape(state.characterId)}"]`);
        if (sheet) window.EldoriaPlayerSheets.hydrate(sheet, playerResponse.player);
      }
      setStatus('Saved to cloud');
      showTransientStatus('Saved to cloud');
    } catch (error) {
      state.characterId = id;
      setStatus(`Cloud save failed: ${error.message}`);
    }
  }

  function refreshSheetFromState() {
    refreshSheetFromPacket(buildExportPacket(buildPacket()));
  }

  function refreshSheetFromPacket(packet) {
    if (!isSheetMode() || !ruleset || !window.EldoriaPlayerSheets) return;
    const sheet = document.querySelector(`[data-player-sheet][data-player-id="${cssEscape(packet.id || root.dataset.builderCharacterId || '')}"]`);
    if (!sheet) return;
    const nextPlayer = buildProjectedSheetFromPacket(packet);
    if (typeof window.EldoriaPlayerSheets.hydrate === 'function') {
      window.EldoriaPlayerSheets.hydrate(sheet, nextPlayer);
    }
  }

  function buildProjectedSheetFromPacket(packet) {
    const base = getProjectionBasePlayer(packet);
    const apiBase = { ...base };
    delete apiBase.itemCatalog;
    delete apiBase.inventory;
    delete apiBase.weapons;
    delete apiBase.acProfile;
    delete apiBase.speedProfile;
    delete apiBase.equippedNames;
    delete apiBase.modifiers;
    const projected = ruleset.project(packet, base);
    const projection = projected.projection || {};
    const equipment = mergeSheetTextList(projection.equipment, base.equipment);
    const spells = mergeSheetTextList(projection.spells, base.spells);
    const out = {
      ...apiBase,
      ...projection,
      builderVersion: packet.builderVersion || BUILDER_DRAFT_VERSION,
      classId: projection.classId || packet.classId || base.classId || '',
      subclassId: projection.subclassId || packet.subclassId || base.subclassId || '',
      raceId: packet.raceId || first(projection.raceIds) || base.raceId || '',
      backgroundId: packet.backgroundId || first(projection.backgroundIds) || base.backgroundId || '',
      classLevels: Array.isArray(packet.classLevels) ? packet.classLevels : [],
      abilityMethod: packet.abilityMethod || base.abilityMethod || 'manual',
      optionalFeatureIds: Array.isArray(packet.optionalFeatureIds) ? packet.optionalFeatureIds : [],
      selectedFeatureIds: Array.isArray(packet.selectedFeatureIds) ? packet.selectedFeatureIds : [],
      featureChoices: packet.featureChoices && typeof packet.featureChoices === 'object' ? packet.featureChoices : {},
      levelChoices: packet.levelChoices && typeof packet.levelChoices === 'object' ? packet.levelChoices : {},
      proficiencies: mergeProjectedProficiencies(projection.proficiencies, packet.proficiencies, base.proficiencies),
      experience: normalizeNumberInput(packet.experience, ...BUILDER_NUMBER_FIELDS.experience),
      gold: normalizeNumberInput(packet.gold, ...BUILDER_NUMBER_FIELDS.gold),
      heroPoints: normalizeNumberInput(packet.heroPoints, ...BUILDER_NUMBER_FIELDS.heroPoints),
      guildRank: packet.guildRank || '',
      guildPoints: normalizeNumberInput(packet.guildPoints, ...BUILDER_NUMBER_FIELDS.guildPoints),
      equipment,
      itemIds: mergeSheetTextList(projection.itemIds, packet.itemIds),
      spells,
      preparedSpells: filterPreparedSpells(base.preparedSpells, spells),
      spellIds: mergeSheetTextList(projection.spellIds, packet.spellIds),
      spellScrolls: Array.isArray(base.spellScrolls) ? base.spellScrolls : [],
      itemDetails: { ...(base.itemDetails || {}), ...(projection.itemDetails || {}) },
      spellDetails: { ...(base.spellDetails || {}), ...(projection.spellDetails || {}) },
    };
    ['initiative', 'speed', 'baseSpeed', 'speedProfile'].forEach(field => {
      if (Object.prototype.hasOwnProperty.call(projection, field)) out[field] = projection[field];
    });
    return out;
  }

  function mergeProjectedProficiencies(projected, packet, base) {
    const out = {};
    [base, packet, projected].forEach(source => {
      if (!source || typeof source !== 'object') return;
      Object.entries(source).forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        out[key] = uniqueText([...(out[key] || []), ...value]);
      });
    });
    return out;
  }

  function mergeSheetTextList(primary, secondary) {
    return uniqueText([...(Array.isArray(primary) ? primary : []), ...(Array.isArray(secondary) ? secondary : [])]);
  }

  function filterPreparedSpells(preparedSpells, spells) {
    const known = new Set((spells || []).map(normalize));
    return (Array.isArray(preparedSpells) ? preparedSpells : []).filter(spell => known.has(normalize(spell)));
  }

  function normalizeLoadedBuild(character) {
    return {
      characterId: character.id || '',
      name: character.name || '',
      level: clamp(Number(character.level) || 1, 1, 20),
      classId: character.classId || '',
      subclassId: character.subclassId || '',
      raceId: character.raceId || '',
      backgroundId: character.backgroundId || '',
      abilityMethod: character.abilityMethod || 'manual',
      hpMode: character.hpMode || 'auto-average',
      maxHp: normalizeHpInput(character.maxHp),
      currentHp: normalizeHpInput(character.currentHp),
      experience: normalizeNumberInput(character.experience, ...BUILDER_NUMBER_FIELDS.experience),
      gold: normalizeNumberInput(character.gold, ...BUILDER_NUMBER_FIELDS.gold),
      heroPoints: normalizeNumberInput(character.heroPoints, ...BUILDER_NUMBER_FIELDS.heroPoints),
      guildRank: character.guildRank || '',
      guildPoints: normalizeNumberInput(character.guildPoints, ...BUILDER_NUMBER_FIELDS.guildPoints),
      abilities: character.abilities && typeof character.abilities === 'object' ? { ...character.abilities } : {},
      classLevels: Array.isArray(character.classLevels) ? character.classLevels : [],
      featIds: normalizeIds(character.featIds || []),
      itemIds: normalizeIds(character.itemIds || []),
      spellIds: normalizeIds(character.spellIds || []),
      optionalFeatureIds: normalizeIds(character.optionalFeatureIds || []),
      selectedFeatureIds: normalizeIds(character.selectedFeatureIds || []),
      featureChoices: { ...(character.featureChoices || {}) },
      levelChoices: { ...(character.levelChoices || {}) },
      proficiencies: character.proficiencies && typeof character.proficiencies === 'object' ? { ...character.proficiencies } : {},
    };
  }

  function isFreshBuilderBuild(character) {
    return character && character.builderVersion === BUILDER_DRAFT_VERSION;
  }

  function getLinkedPlayerSheet() {
    const sheetId = root && root.dataset.builderCharacterId || '';
    if (!sheetId) return null;
    return document.querySelector(`[data-player-sheet][data-player-id="${cssEscape(sheetId)}"]`);
  }

  function getCloudSheetPlayer() {
    const sheet = getLinkedPlayerSheet();
    return sheet && sheet._playerState && typeof sheet._playerState === 'object' ? sheet._playerState : null;
  }

  function waitForCloudSheetPlayer(timeoutMs = 5000) {
    if (!isSheetMode()) return Promise.resolve(null);
    const sheet = getLinkedPlayerSheet();
    if (!sheet || sheet._playerState || sheet.dataset.apiState === 'error') {
      return Promise.resolve(getCloudSheetPlayer());
    }

    return new Promise(resolve => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        observer.disconnect();
        resolve(getCloudSheetPlayer());
      };
      const observer = new MutationObserver(() => {
        if (sheet._playerState || sheet.dataset.apiState === 'loaded' || sheet.dataset.apiState === 'error') finish();
      });
      const timer = window.setTimeout(finish, timeoutMs);
      observer.observe(sheet, { attributes: true, attributeFilter: ['data-api-state'] });
    });
  }

  function getSheetInitialState() {
    const player = getSheetIdentity();
    const cloudPlayer = getCloudSheetPlayer() || {};
    const ruleChoices = cloudPlayer.ruleChoices && typeof cloudPlayer.ruleChoices === 'object' ? cloudPlayer.ruleChoices : {};
    const classId = resolveCloudRuleId('class', cloudPlayer.classId, cloudPlayer.class);
    const subclassId = resolveCloudRuleId('subclass', cloudPlayer.subclassId, cloudPlayer.subclass || cloudPlayer.subclassShortName);
    const raceId = resolveCloudRuleId('race', cloudPlayer.raceId || ruleChoices.raceId, cloudPlayer.race, cloudPlayer.raceIds);
    const backgroundId = resolveCloudRuleId('background', cloudPlayer.backgroundId || ruleChoices.backgroundId, cloudPlayer.background, cloudPlayer.backgroundIds);
    const level = clamp(Number(cloudPlayer.level) || 1, 1, 20);
    return {
      characterId: player.id || root.dataset.builderCharacterId || '',
      name: player.name || '',
      level,
      classId,
      subclassId,
      classLevels: normalizeCloudClassLevels(cloudPlayer.classLevels, classId, subclassId, level),
      raceId,
      backgroundId,
      abilityMethod: cloudPlayer.abilityMethod || 'manual',
      hpMode: cloudPlayer.hpMode || 'auto-average',
      maxHp: normalizeHpInput(cloudPlayer.maxHp),
      currentHp: normalizeHpInput(cloudPlayer.currentHp),
      experience: normalizeNumberInput(cloudPlayer.experience, ...BUILDER_NUMBER_FIELDS.experience),
      gold: normalizeNumberInput(cloudPlayer.gold, ...BUILDER_NUMBER_FIELDS.gold),
      heroPoints: normalizeNumberInput(cloudPlayer.heroPoints, ...BUILDER_NUMBER_FIELDS.heroPoints),
      guildRank: cloudPlayer.guildRank || '',
      guildPoints: normalizeNumberInput(cloudPlayer.guildPoints, ...BUILDER_NUMBER_FIELDS.guildPoints),
      abilities: cloudPlayer.abilities && typeof cloudPlayer.abilities === 'object' ? { ...cloudPlayer.abilities } : {},
      featIds: normalizeCloudRuleIds('feat', cloudPlayer.featIds),
      itemIds: normalizeCloudRuleIds('item', cloudPlayer.itemIds),
      spellIds: normalizeCloudRuleIds('spell', cloudPlayer.spellIds),
      optionalFeatureIds: normalizeIds(cloudPlayer.optionalFeatureIds || ruleChoices.optionalFeatures || []),
      selectedFeatureIds: normalizeIds(cloudPlayer.selectedFeatureIds || ruleChoices.includeFeatures || []),
      featureChoices: { ...(cloudPlayer.featureChoices || ruleChoices.featureChoices || {}) },
      levelChoices: { ...(cloudPlayer.levelChoices || {}) },
      proficiencies: normalizeCloudProficiencies(cloudPlayer),
    };
  }

  function getSheetIdentity() {
    const cloudPlayer = getCloudSheetPlayer() || {};
    return {
      id: cloudPlayer.id || root && root.dataset.builderCharacterId || '',
      name: cloudPlayer.name || root && root.dataset.builderPlayerName || '',
      sheetTitle: cloudPlayer.sheetTitle || root && root.dataset.builderSheetTitle || '',
      portrait: cloudPlayer.portrait || root && root.dataset.builderPortrait || '',
      url: cloudPlayer.url || '',
    };
  }

  function getProjectionBasePlayer(packet = {}) {
    const cloudPlayer = getCloudSheetPlayer() || {};
    const identity = getSheetIdentity();
    const packetMaxHp = Object.prototype.hasOwnProperty.call(packet, 'maxHp') ? packet.maxHp : cloudPlayer.maxHp;
    const packetCurrentHp = Object.prototype.hasOwnProperty.call(packet, 'currentHp') ? packet.currentHp : cloudPlayer.currentHp;
    return {
      ...cloudPlayer,
      id: packet.id || identity.id || cloudPlayer.id || '',
      name: packet.name || identity.name || cloudPlayer.name || '',
      sheetTitle: identity.sheetTitle || '',
      portrait: identity.portrait || '',
      url: identity.url || '',
      builderVersion: BUILDER_DRAFT_VERSION,
      rulesetId: ruleset ? ruleset.id : 'eldoria-5e',
      rulesVersion: ruleset ? ruleset.version : '',
      abilities: { ...getDefaultAbilities(), ...(cloudPlayer.abilities || {}) },
      hpMode: packet.hpMode || cloudPlayer.hpMode || 'auto-average',
      maxHp: normalizeHpInput(packetMaxHp),
      currentHp: normalizeHpInput(packetCurrentHp),
      experience: normalizeNumberInput(Object.prototype.hasOwnProperty.call(packet, 'experience') ? packet.experience : cloudPlayer.experience, ...BUILDER_NUMBER_FIELDS.experience),
      gold: normalizeNumberInput(Object.prototype.hasOwnProperty.call(packet, 'gold') ? packet.gold : cloudPlayer.gold, ...BUILDER_NUMBER_FIELDS.gold),
      heroPoints: normalizeNumberInput(Object.prototype.hasOwnProperty.call(packet, 'heroPoints') ? packet.heroPoints : cloudPlayer.heroPoints, ...BUILDER_NUMBER_FIELDS.heroPoints),
      guildRank: Object.prototype.hasOwnProperty.call(packet, 'guildRank') ? packet.guildRank || '' : cloudPlayer.guildRank || '',
      guildPoints: normalizeNumberInput(Object.prototype.hasOwnProperty.call(packet, 'guildPoints') ? packet.guildPoints : cloudPlayer.guildPoints, ...BUILDER_NUMBER_FIELDS.guildPoints),
      equipment: Array.isArray(cloudPlayer.equipment) ? cloudPlayer.equipment : [],
      spells: Array.isArray(cloudPlayer.spells) ? cloudPlayer.spells : [],
      spellScrolls: Array.isArray(cloudPlayer.spellScrolls) ? cloudPlayer.spellScrolls : [],
      itemDetails: cloudPlayer.itemDetails && typeof cloudPlayer.itemDetails === 'object' ? cloudPlayer.itemDetails : {},
      spellDetails: cloudPlayer.spellDetails && typeof cloudPlayer.spellDetails === 'object' ? cloudPlayer.spellDetails : {},
      featDetails: Array.isArray(cloudPlayer.featDetails) ? cloudPlayer.featDetails : [],
      backgroundDetails: Array.isArray(cloudPlayer.backgroundDetails) ? cloudPlayer.backgroundDetails : [],
    };
  }

  function resolveCloudRuleId(kind, ...values) {
    const index = getRuleIndex(kind);
    if (!index) return '';
    const candidates = values.flatMap(value => normalizeIds(value));
    for (const candidate of candidates) {
      if (index.has(candidate)) return candidate;
    }

    const rows = Array.from(index.values());
    for (const candidate of candidates) {
      const target = normalize(candidate);
      if (!target) continue;
      const row = rows.find(rule => {
        const names = [rule.id, rule.name, rule.shortName, ...(Array.isArray(rule.aliases) ? rule.aliases : [])];
        return names.some(name => normalize(name) === target);
      });
      if (row) return row.id;
    }
    return '';
  }

  function normalizeCloudRuleIds(kind, values) {
    return normalizeIds(values).map(value => resolveCloudRuleId(kind, value) || value).filter(Boolean);
  }

  function normalizeCloudClassLevels(values, classId, subclassId, level) {
    const rows = Array.isArray(values) ? values : [];
    const out = rows.map(row => ({
      classId: resolveCloudRuleId('class', row && row.classId, row && row.class),
      subclassId: resolveCloudRuleId('subclass', row && row.subclassId, row && row.subclass),
      level: clamp(Number(row && row.level) || level || 1, 1, 20),
    })).filter(row => row.classId).slice(0, 12);
    if (out.length) return out;
    return classId ? [{ classId, subclassId: subclassId || '', level: clamp(Number(level) || 1, 1, 20) }] : [];
  }

  function normalizeCloudProficiencies(player) {
    const source = player && player.proficiencies && typeof player.proficiencies === 'object' ? player.proficiencies : {};
    return {
      skills: normalizeIds(source.skills || player && player.skills || []),
      languages: normalizeIds(source.languages || []),
      tools: normalizeIds(source.tools || []),
    };
  }

  function getRuleIndex(kind) {
    const keys = {
      class: 'classesById',
      subclass: 'subclassesById',
      race: 'racesById',
      background: 'backgroundsById',
      feat: 'featsById',
      item: 'itemsById',
      spell: 'spellsById',
    };
    return indexes[keys[kind]];
  }

  function getSheetAbilities() {
    const abilities = getDefaultAbilities();
    return {
      str: Number(abilities.str) || 10,
      dex: Number(abilities.dex) || 10,
      con: Number(abilities.con) || 10,
      int: Number(abilities.int) || 10,
      wis: Number(abilities.wis) || 10,
      cha: Number(abilities.cha) || 10,
    };
  }

  function getDefaultAbilities() {
    return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  }

  function getBaseAbilities() {
    return { ...getSheetAbilities(), ...(state.abilities || {}) };
  }

  function getCurrentAbilities() {
    return applyAbilityScoreIncreases(getBaseAbilities());
  }

  function applyAbilityScoreIncreases(baseAbilities) {
    const abilities = { ...baseAbilities };
    Object.entries(getAbilityScoreIncreaseBonuses()).forEach(([ability, bonus]) => {
      abilities[ability] = clamp((Number(abilities[ability]) || 10) + bonus, 1, 30);
    });
    return abilities;
  }

  function getAbilityScoreIncreaseBonuses() {
    const bonuses = Object.fromEntries(Object.keys(ABILITY_NAMES).map(ability => [ability, 0]));
    const race = indexes.racesById && indexes.racesById.get(state.raceId);
    if (race && Array.isArray(race.ability)) {
      race.ability.forEach((entry, index) => {
        Object.keys(ABILITY_NAMES).forEach(ability => {
          bonuses[ability] += Number(entry && entry[ability]) || 0;
        });
        const choice = entry && entry.choose;
        if (!choice) return;
        const count = Number(choice.count) || 1;
        const choiceValue = Number(choice.amount || choice.amountPer || 1) || 1;
        const values = getFeatureChoiceValues(`${race.id}:ability:${index}`)
          .map(getAbilityKeyFromChoice)
          .filter(Boolean)
          .slice(0, count);
        if (values.length < count) return;
        values.forEach(ability => {
          bonuses[ability] = (bonuses[ability] || 0) + choiceValue;
        });
      });
    }
    if (!state.featureChoices || typeof state.featureChoices !== 'object') return bonuses;
    Object.entries(state.featureChoices).forEach(([key, value]) => {
      const featureId = getAsiFeatureIdFromAllocationGroup(key);
      if (!featureId || !isActiveAbilityScoreImprovementFeature(featureId)) return;
      const values = getFeatureChoiceValuesFromValue(value)
        .map(getAbilityKeyFromChoice)
        .filter(Boolean)
        .slice(0, 2);
      if (values.length < 2) return;
      values.forEach(ability => {
        bonuses[ability] = (bonuses[ability] || 0) + 1;
      });
    });
    getSelectedFeatAbilityScoreIncreaseBonuses().forEach(bonus => {
      bonuses[bonus.ability] = (bonuses[bonus.ability] || 0) + bonus.amount;
    });
    return bonuses;
  }

  function getSelectedFeatAbilityScoreIncreaseBonuses() {
    const out = [];
    getSelectedFeatChoiceGroups()
      .filter(group => group.choiceType === 'ability')
      .forEach(group => {
        const count = Number(group.count) || 1;
        const amount = Number(group.choiceValue) || 1;
        const selected = getFeatureChoiceValues(group)
          .map(getAbilityKeyFromChoice)
          .filter(Boolean)
          .slice(0, count);
        if (selected.length < count) return;
        selected.forEach(ability => out.push({ ability, amount }));
      });
    return out;
  }

  function getAbilityKeyFromChoice(value) {
    const clean = normalize(value);
    if (!clean) return '';
    return Object.entries(ABILITY_NAMES).find(([key, label]) => clean === normalize(key) || clean === normalize(label))?.[0] || '';
  }

  function getAbilityLabelFromChoice(value) {
    const key = getAbilityKeyFromChoice(value);
    return key ? ABILITY_NAMES[key] : '';
  }

  function getAsiFeatureIdFromAllocationGroup(groupName) {
    const key = String(groupName || '');
    return key.endsWith(':allocation') ? key.slice(0, -':allocation'.length) : '';
  }

  function isActiveAbilityScoreImprovementFeature(featureId) {
    const feature = indexes.featuresById && indexes.featuresById.get(featureId);
    if (!feature || feature.kind !== 'class' || normalize(feature.name) !== 'ability score improvement') return false;
    const cls = getCurrentClass();
    if (cls && normalize(feature.className) !== normalize(cls.name)) return false;
    return Number(feature.level || 1) <= Number(state.level || 1);
  }

  async function fetchApi(route, options = {}) {
    const { query, ...fetchOptions } = options;
    const config = window.ELDORIA_PUBLIC_CONFIG || {};
    const timeout = Number(config.apiTimeoutMs) || 4000;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(buildApiUrl(route, query || {}), {
        ...fetchOptions,
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(fetchOptions.headers || {}),
        },
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(payload.message || payload.error || `${response.status}`);
      }
      return payload;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function buildApiUrl(route, params = {}) {
    const cleanRoute = String(route || '').replace(/^\/+/, '');
    const base = getApiBaseUrl();
    let rawUrl;
    if (base) rawUrl = `${base}/${cleanRoute}`;
    else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') rawUrl = `/api/${cleanRoute}`;
    else rawUrl = `api/${cleanRoute}`;
    const url = new URL(rawUrl, window.location.href);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    return url.toString();
  }

  function getApiBaseUrl() {
    const config = window.ELDORIA_PUBLIC_CONFIG || {};
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
    const base = String(config.apiBaseUrl || '').replace(/\/+$/, '');
    if (base) return base;
    return '';
  }

  function buildIndexes() {
    indexes.classesById = byId(data.classes);
    indexes.subclassesById = byId(data.subclasses);
    indexes.racesById = byId(data.races);
    indexes.backgroundsById = byId(data.backgrounds);
    indexes.featsById = byId(data.feats);
    indexes.itemsById = byId(data.items);
    indexes.spellsById = byId(data.spells);
    indexes.featuresById = byId(data.features);
    indexes.labelToFeatId = labelIndex(data.feats);
    indexes.labelToItemId = labelIndex(data.items);
    indexes.labelToSpellId = labelIndex(data.spells);
  }

  function populateStaticOptions() {
    fillSelect(els.fields.classId, sortByName(data.classes).map(row => ({
      value: row.id,
      label: sourceLabel(row),
    })), 'Choose class');

    fillSelect(els.fields.raceId, sortRules(data.races).map(row => ({
      value: row.id,
      label: sourceLabel(row),
    })), 'Choose race');

    fillSelect(els.fields.backgroundId, sortRules(data.backgrounds).map(row => ({
      value: row.id,
      label: sourceLabel(row),
    })), 'Choose background');

    fillDatalist(els.datalists.feat, data.feats);
    fillDatalist(els.datalists.item, data.items);
    fillDatalist(els.datalists.spell, data.spells);
  }

  async function loadInitialState() {
    if (isSheetMode()) {
      await waitForCloudSheetPlayer();
      const sheetState = getSheetInitialState();
      const characterId = root.dataset.builderCharacterId || sheetState.characterId;
      state = { ...makeDefaultState(), ...sheetState, characterId };

      if (characterId) {
        try {
          const character = await fetchApi(`characters/${encodeURIComponent(characterId)}`);
          if (isFreshBuilderBuild(character)) {
            state = { ...makeDefaultState(), ...sheetState, ...normalizeLoadedBuild(character), characterId };
            enforceLevelGates();
            setStatus('Cloud build loaded');
            return;
          }
        } catch (error) {
          setStatus(`Cloud build not found: ${error.message}`);
        }
      }

      enforceLevelGates();
      setStatus('New character draft');
      return;
    }

    const lastDraftKey = getDraftKeyForId('last');
    const lastDraft = localStorage.getItem(lastDraftKey);
    if (lastDraft) {
      try {
        state = { ...makeDefaultState(), ...JSON.parse(lastDraft) };
        enforceLevelGates();
        return;
      } catch {
        localStorage.removeItem(lastDraftKey);
      }
    }
  }

  function render() {
    if (!data.classes) return;
    enforceLevelGates();
    if (!isSheetMode()) localStorage.setItem(getDraftKeyForId('last'), JSON.stringify(state));
    renderSteps();
    syncFields();
    syncAbilityFields();
    renderPicks();
    let packet = buildPacket();
    activeChoiceGroups = getPacketChoiceGroups(packet);
    if (sanitizeFeatureChoices(activeChoiceGroups)) {
      updateAutomaticHitPoints();
      if (!isSheetMode()) localStorage.setItem(getDraftKeyForId('last'), JSON.stringify(state));
      packet = buildPacket();
      activeChoiceGroups = getPacketChoiceGroups(packet);
    }
    renderSelectionDetails(packet);
    renderRulePickerPreviews();
    renderCurrentState(packet);
    renderAudit(packet);
    renderChoiceGroups(packet);
    renderFeatures(packet.allFeatures, packet.selectedFeatures);
    renderActions(packet);
    renderExport(packet);
  }

  function renderAudit(packet) {
    if (!els.auditList) return;
    const issues = packet.evaluation && Array.isArray(packet.evaluation.issues) ? packet.evaluation.issues : [];
    const problems = issues.filter(issue => issue.severity === 'error' || issue.severity === 'warning');
    const suggestions = issues.filter(issue => issue.severity !== 'error' && issue.severity !== 'warning');
    els.auditSummary.textContent = `${problems.length} problem${problems.length === 1 ? '' : 's'}, ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`;
    els.auditList.innerHTML = issues.length
      ? issues.map(issue => `<div class="audit-row ${escapeAttr(issue.severity || 'info')}">
          <strong>${escapeHtml(getAuditLabel(issue))}</strong>
          <span>${escapeHtml(getAuditMessage(issue))}${getAuditHelp(issue) ? `<small>${escapeHtml(getAuditHelp(issue))}</small>` : ''}</span>
        </div>`).join('')
      : '<div class="empty-state">No ruleset problems found for the current sheet choices.</div>';
    const next = packet.evaluation && packet.evaluation.nextLevel;
    if (!els.nextLevelSummary) return;
    if (!next || !next.available) {
      els.nextLevelSummary.innerHTML = '<div class="empty-state">No next level is available.</div>';
      return;
    }
    const steps = Array.isArray(next.steps) && next.steps.length
      ? next.steps.map(step => `<li>${escapeHtml(step.label || step.kind)}</li>`).join('')
      : '<li>No required picks detected for the next level.</li>';
    const features = Array.isArray(next.newFeatures) && next.newFeatures.length
      ? next.newFeatures.slice(0, 8).map(feature => `<span>${escapeHtml(feature.name)}</span>`).join('')
      : '<span>No new feature rows detected.</span>';
    els.nextLevelSummary.innerHTML = `
      <h3>Next Level: ${escapeHtml(String(next.fromLevel))} to ${escapeHtml(String(next.toLevel))}</h3>
      <ul>${steps}</ul>
      <div class="chip-list">${features}</div>
    `;
  }

  function getAuditLabel(issue) {
    const labels = {
      optional_feature_unselected: 'Optional Rule Available',
      race_ability_choice_unresolved: 'Origin Choice Needed',
      race_feature_choice_unresolved: 'Origin Choice Needed',
      race_feat_choice_unresolved: 'Origin Feat Needed',
      class_feature_choice_unresolved: 'Class Choice Needed',
      subclass_choice_unresolved: 'Subclass Needed',
      background_choice_unresolved: 'Background Choice Needed',
      ability_score_choice_unresolved: 'ASI Choice Needed',
      race_subrace_required: 'Subrace Needed',
      missing_item_rule: 'Item Needs Review',
      spell_list_unverified: 'Spell Needs Review',
      feature_choice_unresolved: 'Feature Choice Needed',
      too_many_feats: 'Too Many Feats',
    };
    return labels[issue && issue.kind] || titleCase(String(issue && issue.kind || 'ruleset').replace(/_/g, ' '));
  }

  function getAuditMessage(issue) {
    if (!issue) return '';
    if (issue.kind === 'optional_feature_unselected') {
      return `Optional rule "${issue.feature || 'feature'}" is available but not selected.`;
    }
    return issue.message || '';
  }

  function getAuditHelp(issue) {
    if (!issue) return '';
    if (issue.kind === 'optional_feature_unselected') {
      if (normalize(issue.feature) === 'martial versatility') {
        return 'For fighters, this optional Tasha rule lets you swap a Fighting Style when you reach an ASI level. Julie can ignore this unless she wants to change her fighting style.';
      }
      return 'This is optional 2014-era content. Ignore it unless the player wants to opt into that optional feature.';
    }
    if (issue.kind === 'race_ability_choice_unresolved') return 'Choose the listed ability increases so the sheet can record the origin bonuses explicitly.';
    if (issue.kind === 'race_feature_choice_unresolved') return 'Choose the listed origin option so the sheet can track the final skill, language, tool, or ancestry result.';
    if (issue.kind === 'background_choice_unresolved') return 'Choose the background skill, language, or tool option from its level 1 bucket.';
    if (issue.kind === 'class_feature_choice_unresolved') return 'Choose the listed class option so lower-level class features are explicitly tracked on the sheet.';
    if (issue.kind === 'subclass_choice_unresolved') return 'Choose the subclass unlocked at this level so subclass features can be applied.';
    if (issue.kind === 'ability_score_choice_unresolved') return 'Choose whether that level used an ASI or feat, then record the exact ability increase if ASI was selected.';
    return '';
  }

  function renderSteps() {
    els.stepPanels.forEach(panel => {
      panel.hidden = panel.dataset.step !== currentStep;
    });
    els.stepButtons.forEach(button => {
      const active = button.dataset.stepTarget === currentStep;
      button.setAttribute('aria-current', active ? 'step' : 'false');
    });
    const index = STEPS.indexOf(currentStep);
    if (els.prevStep) els.prevStep.hidden = STEPS.length <= 1;
    if (els.nextStep) els.nextStep.hidden = STEPS.length <= 1;
    if (els.prevStep) els.prevStep.disabled = index <= 0;
    if (els.nextStep) {
      els.nextStep.textContent = index >= STEPS.length - 1 ? 'Review' : 'Next';
      els.nextStep.disabled = index >= STEPS.length - 1;
    }
  }

  function moveStep(delta) {
    const index = STEPS.indexOf(currentStep);
    const next = clamp(index + delta, 0, STEPS.length - 1);
    currentStep = STEPS[next];
    renderSteps();
  }

  function syncFields() {
    const subclasses = getAvailableSubclassesForClass(state.classId, state.level);
    const subclassLevel = getSubclassUnlockLevel(state.classId);
    const subclassLocked = state.classId && Number(state.level || 1) < subclassLevel;
    const subclassVisible = Boolean(state.classId && !subclassLocked);
    fillSelect(els.fields.subclassId, subclasses.map(row => ({
      value: row.id,
      label: sourceLabel(row),
    })), subclassLocked ? `Subclass unlocks at level ${subclassLevel}` : subclasses.length ? 'Choose subclass' : 'No subclass');

    if (state.subclassId && !subclasses.some(row => row.id === state.subclassId)) {
      state.subclassId = '';
    }

    if (els.subclassField) els.subclassField.hidden = !subclassVisible;
    els.fields.subclassId.disabled = Boolean(!subclassVisible || !subclasses.length);
    els.classGate.textContent = state.classId
      ? subclassVisible
        ? `Subclass choice is unlocked at level ${subclassLevel}.`
        : `Subclass unlocks at level ${subclassLevel}.`
      : 'Choose a class to see level-gated options.';

    els.characterSelect.value = state.characterId || '';
    for (const [name, field] of Object.entries(els.fields)) {
      field.value = state[name] === null || state[name] === undefined ? '' : state[name];
    }
    if (els.fields.hpMode) els.fields.hpMode.value = state.hpMode || 'auto-average';
    if (els.fields.maxHp) {
      els.fields.maxHp.value = state.maxHp === null || state.maxHp === undefined ? '' : state.maxHp;
      els.fields.maxHp.disabled = isAutoHpMode();
    }
    if (els.fields.currentHp) {
      els.fields.currentHp.value = state.currentHp === null || state.currentHp === undefined ? '' : state.currentHp;
      els.fields.currentHp.disabled = isAutoHpMode();
    }
    els.fields.level.value = state.level || 1;
    els.fields.level.min = '1';
    els.fields.level.max = '20';
  }

  function syncAbilityFields() {
    const abilities = getBaseAbilities();
    Object.entries(els.abilityFields || {}).forEach(([ability, field]) => {
      field.value = abilities[ability] || 10;
    });
  }

  function renderPicks() {
    renderChips('feat', state.featIds, indexes.featsById);
    renderChips('item', state.itemIds, indexes.itemsById);
    renderChips('spell', state.spellIds, indexes.spellsById);
    const featSlots = getFeatSlots();
    const maxSpellLevel = getMaxSpellLevel();
    if (els.pickCounts) els.pickCounts.textContent = `${state.featIds.length}/${featSlots} feats, ${state.itemIds.length} items, ${state.spellIds.length} spells`;
    if (els.featGate) {
      els.featGate.textContent = featSlots
        ? `Feat slots explicitly enabled: ${featSlots}.`
        : 'No feat slot is available until an origin feature grants one or an ASI level is set to feat.';
    }
    if (els.spellGate) {
      els.spellGate.textContent = getCurrentClass() && maxSpellLevel > 0
        ? `Current class can add spells up to level ${maxSpellLevel}.`
        : 'This class and level has no spell slots from class progression.';
    }
  }

  function renderCurrentState(packet) {
    if (!els.currentState) return;
    const projected = packet.projection || {};
    const player = isSheetMode() ? getProjectionBasePlayer({ id: state.characterId, name: state.name }) : {};
    const abilities = getCurrentAbilities();
    const featSlots = getFeatSlots();
    const groups = packet.evaluation && packet.evaluation.availableChoices && packet.evaluation.availableChoices.featureChoiceGroups || [];
    const choiceSummary = getChoiceStateSummary([...groups, ...getSelectedFeatChoiceGroups()]);
    const originAsi = getOriginAbilitySummary(indexes.racesById.get(state.raceId), groups);
    const skillNames = (player.skills || []).map(formatSkillName).filter(Boolean).slice(0, 10);
    const hpSummary = getHitPointSummary();
    els.currentState.innerHTML = `
      <h3>Current State</h3>
      <dl class="current-state-list">
        <div><dt>Build</dt><dd>${escapeHtml(state.name || 'Unnamed')} · Level ${escapeHtml(String(state.level || 1))}</dd></div>
        <div><dt>Origin</dt><dd>${escapeHtml([projected.race || rowName(indexes.racesById.get(state.raceId)), projected.background || rowName(indexes.backgroundsById.get(state.backgroundId))].filter(Boolean).join(' / ') || '-')}</dd></div>
        ${originAsi ? `<div><dt>Origin ASI</dt><dd>${escapeHtml(originAsi)}</dd></div>` : ''}
        <div><dt>Path</dt><dd>${escapeHtml([projected.class || rowName(indexes.classesById.get(state.classId)), projected.subclass || rowName(indexes.subclassesById.get(state.subclassId))].filter(Boolean).join(' / ') || '-')}</dd></div>
        <div><dt>Health</dt><dd>${escapeHtml(hpSummary || '-')}</dd></div>
        <div><dt>Feats</dt><dd>${escapeHtml(String(state.featIds.length))}/${escapeHtml(String(featSlots))}</dd></div>
        <div><dt>Spell Cap</dt><dd>${escapeHtml(String(getMaxSpellLevel() || 'None'))}</dd></div>
        <div><dt>Issues</dt><dd>${escapeHtml(String(packet.evaluation && packet.evaluation.issues ? packet.evaluation.issues.length : 0))}</dd></div>
      </dl>
      <div class="current-ability-grid">
        ${Object.entries(ABILITY_NAMES).map(([key, label]) => {
          const score = Number(abilities[key]) || 10;
          return `<span><strong>${escapeHtml(key.toUpperCase())}</strong>${escapeHtml(String(score))} <small>${escapeHtml(formatModifier(score))}</small></span>`;
        }).join('')}
      </div>
      ${choiceSummary ? `<div class="current-choice-summary">${choiceSummary}</div>` : ''}
      ${skillNames.length ? `<div class="current-skill-summary"><strong>Sheet Skills</strong><span>${escapeHtml(skillNames.join(', '))}</span></div>` : ''}
    `;
  }

  function getOriginAbilitySummary(race, groups) {
    if (!race || !Array.isArray(race.ability)) return '';
    const bonuses = {};
    race.ability.forEach((row, index) => {
      Object.entries(ABILITY_NAMES).forEach(([key, label]) => {
        if (row && row[key]) bonuses[label] = (bonuses[label] || 0) + Number(row[key]);
      });
      const choice = row && row.choose;
      if (!choice) return;
      const group = (groups || []).find(candidate => candidate.group === `${race.id}:ability:${index}`);
      getFeatureChoiceValues(group).forEach(label => {
        bonuses[label] = (bonuses[label] || 0) + (Number(group && group.choiceValue) || 1);
      });
    });
    return Object.entries(bonuses).map(([label, value]) => `${label} +${value}`).join(', ');
  }

  function getChoiceStateSummary(groups) {
    const rows = [];
    groups.forEach(group => {
      const selected = getChoiceValuesForGroup(group);
      const result = getChoiceResultText(group, selected);
      if (!result) return;
      rows.push(`<div><dt>${escapeHtml(group.label || group.group)}</dt><dd>${escapeHtml(result)}</dd></div>`);
    });
    return rows.length ? `<dl class="current-state-list choice-state-list">${rows.join('')}</dl>` : '';
  }

  function getChoiceResultText(group, selectedValues) {
    const selected = selectedValues || [];
    const fixedBonuses = Array.isArray(group.fixedBonuses) ? group.fixedBonuses : [];
    if (group.choiceType === 'ability') {
      const bonuses = {};
      fixedBonuses.forEach(bonus => {
        bonuses[bonus.option] = (bonuses[bonus.option] || 0) + (Number(bonus.value) || 1);
      });
      selected.forEach(option => {
        bonuses[option] = (bonuses[option] || 0) + (Number(group.choiceValue) || 1);
      });
      return Object.entries(bonuses).map(([name, value]) => `${name} +${value}`).join(', ');
    }
    if (group.choiceType === 'ability-allocation') {
      const bonuses = {};
      selected.forEach(option => {
        bonuses[option] = (bonuses[option] || 0) + 1;
      });
      return Object.entries(bonuses).map(([name, value]) => `${name} +${value}`).join(', ');
    }
    const fixed = (group.fixedOptions || []).map(option => findOriginalOption(group.options, normalize(option)) || option);
    const values = [...fixed, ...selected];
    return (group.allowDuplicate ? values : uniqueText(values)).join(', ');
  }

  function renderChips(kind, ids, index) {
    const list = els.chipLists[kind];
    if (!list) return;
    if (!ids.length) {
      list.innerHTML = '<div class="empty-state">None selected.</div>';
      return;
    }
    list.innerHTML = ids.map(id => {
      const row = index.get(id);
      return `<span class="chip">${escapeHtml(row ? sourceLabel(row) : id)}<button type="button" data-remove-kind="${kind}" data-remove-id="${escapeAttr(id)}" aria-label="Remove ${escapeAttr(id)}">x</button></span>`;
    }).join('');
  }

  function renderSelectionDetails(packet) {
    renderRuleDetailSlot('race', indexes.racesById.get(state.raceId), packet);
    renderRuleDetailSlot('background', indexes.backgroundsById.get(state.backgroundId), packet);
    renderRuleDetailSlot('class', indexes.classesById.get(state.classId), packet);
    const subclassSlot = els.ruleDetails && els.ruleDetails.subclass;
    const showSubclass = Boolean(state.classId && Number(state.level || 1) >= getSubclassUnlockLevel(state.classId));
    if (subclassSlot) {
      subclassSlot.hidden = !showSubclass;
      if (!showSubclass) subclassSlot.innerHTML = '';
      else renderRuleDetailSlot('subclass', indexes.subclassesById.get(state.subclassId), packet);
    }
  }

  function renderRuleDetailSlot(kind, row, packet) {
    const slot = els.ruleDetails && els.ruleDetails[kind];
    if (!slot) return;
    slot.innerHTML = row
      ? renderRuleDetail(kind, row, { packet })
      : `<div class="rule-detail-card empty-state">Choose a ${escapeHtml(kind)} to see its rules.</div>`;
  }

  function renderRulePickerPreviews() {
    ['feat', 'item', 'spell'].forEach(renderRulePickerPreview);
  }

  function renderRulePickerPreview(kind) {
    const node = els.rulePreviews && els.rulePreviews[kind];
    const input = els.addInputs && els.addInputs[kind];
    if (!node || !input) return;
    const id = resolvePickId(kind, input.value.trim());
    const row = id ? indexes[`${kind}sById`].get(id) : null;
    node.innerHTML = row ? renderRuleDetail(kind, row, { compact: true, includeChoices: kind === 'feat' }) : '';
  }

  function renderChoicePickerPreview(select) {
    const kind = select && select.dataset.choicePickKind;
    const row = kind && select.value ? indexes[`${kind}sById`].get(select.value) : null;
    const node = select && select.closest('[data-choice-card]') && select.closest('[data-choice-card]').querySelector('[data-choice-pick-preview]');
    if (node) node.innerHTML = row ? renderRuleDetail(kind, row, { compact: true, includeChoices: kind === 'feat' }) : '';
  }

  function renderRuleDetail(kind, row, context = {}) {
    const facts = getRuleFacts(kind, row).filter(([, value]) => value !== '' && value !== null && value !== undefined);
    const text = getRuleDetailText(kind, row, context);
    const features = context.compact ? [] : getDetailFeatureRows(kind, row);
    const choices = context.includeChoices || !context.compact ? getEmbeddedChoiceGroups(kind, row, context.packet) : [];
    return `
      <article class="rule-detail-card ${escapeAttr(kind)}">
        <header>
          <h3>${escapeHtml(row.name || row.shortName || row.id)}</h3>
          <span>${escapeHtml([row.source, row.page ? `p. ${row.page}` : ''].filter(Boolean).join(' · '))}</span>
        </header>
        ${facts.length ? `<dl>${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>` : ''}
        ${text ? `<p class="rule-detail-text">${escapeHtml(text)}</p>` : ''}
        ${features.length ? renderFeatureSnippets(features, kind === 'race' ? 'Traits' : 'Unlocked Features') : ''}
        ${choices.length ? `<div class="embedded-choice-list">${choices.map(renderChoiceCard).join('')}</div>` : ''}
      </article>
    `;
  }

  function getRuleDetailText(kind, row, context = {}) {
    const text = getRuleText(kind, row);
    if (!text) return '';
    if (kind === 'feat') return cleanText(text);
    return firstWords(text, context.compact ? 44 : 70);
  }

  function getRuleFacts(kind, row) {
    if (!row) return [];
    if (kind === 'race') {
      return [
        ['Type', [row.baseName && row.baseName !== row.name ? row.baseName : '', row.subraceName].filter(Boolean).join(' / ')],
        ['Ability Scores', formatAbilityRows(row.ability)],
        ['Speed', Array.isArray(row.speed) ? row.speed.join(', ') : row.speed || 'See trait text'],
        ['Size', Array.isArray(row.size) ? row.size.join(', ') : row.size || 'See trait text'],
      ];
    }
    if (kind === 'background') {
      return [
        ['Skills', row.skillProficiencies || ''],
        ['Tools', row.toolProficiencies || ''],
        ['Languages', row.languages || ''],
        ['Equipment', firstWords(row.equipment || '', 22)],
      ];
    }
    if (kind === 'class') {
      return [
        ['Hit Die', row.hitDie || ''],
        ['Saves', formatList(row.proficiency || row.savingThrows)],
        ['Spellcasting', row.spellcastingAbility ? `${ABILITY_NAMES[row.spellcastingAbility] || row.spellcastingAbility} · ${row.casterProgression || 'full'} progression` : 'None'],
        ['Subclass', `Level ${getSubclassUnlockLevel(row.id)}`],
      ];
    }
    if (kind === 'subclass') {
      return [
        ['Class', row.className || ''],
        ['Short Name', row.shortName || ''],
      ];
    }
    if (kind === 'feat') {
      return [
        ['Prerequisite', row.prerequisites || 'None'],
        ['Repeatable', row.repeatable || ''],
        ['Timing', row.timing || ''],
      ];
    }
    if (kind === 'item') {
      return [
        ['Type', row.type || ''],
        ['Rarity', row.rarity || ''],
        ['Damage', row.damage || row.weapon && row.weapon.damage || ''],
        ['Properties', formatList(row.properties || row.weapon && row.weapon.properties)],
        ['Attunement', row.attunement || ''],
      ];
    }
    if (kind === 'spell') {
      return [
        ['Level', row.level || 'Cantrip'],
        ['School', row.school || ''],
        ['Casting', row.castingTime || ''],
        ['Range', row.range || ''],
        ['Duration', row.duration || ''],
        ['Classes', firstWords(`${row.classes || ''} ${row.optionalClasses || ''}`, 18)],
      ];
    }
    return [];
  }

  function getRuleText(kind, row) {
    if (!row) return '';
    if (kind === 'background') return row.featureName ? `${row.featureName}. ${row.featureText || row.text || ''}` : row.featureText || row.text || '';
    if (kind === 'spell') return [row.text, row.higherLevels].filter(Boolean).join(' ');
    if (kind === 'class') return `Level 1 ${row.name} choices and proficiencies.`;
    if (kind === 'subclass') return `${row.name} features for ${row.className || 'this class'}.`;
    return row.text || row.featureText || '';
  }

  function getDetailFeatureRows(kind, row) {
    if (!row) return [];
    if (kind === 'race') {
      return data.features
        .filter(feature => Number(feature.level || 1) <= Number(state.level || 1) && raceFeatureMatches(feature, row))
        .sort(sortFeatureRows)
        .slice(0, 8);
    }
    if (kind === 'class') {
      const className = normalize(row.name);
      return data.features
        .filter(feature => feature.kind === 'class' && normalize(feature.className) === className && Number(feature.level || 1) <= Number(state.level || 1))
        .sort(sortFeatureRows)
        .slice(0, 12);
    }
    if (kind === 'subclass') {
      const names = new Set([row.name, row.shortName].map(normalize).filter(Boolean));
      return data.features
        .filter(feature => feature.kind === 'subclass'
          && normalize(feature.className) === normalize(row.className)
          && (names.has(normalize(feature.subclassName)) || names.has(normalize(feature.subclassShortName)))
          && Number(feature.level || 1) <= Number(state.level || 1))
        .sort(sortFeatureRows)
        .slice(0, 8);
    }
    return [];
  }

  function getEmbeddedChoiceGroups(kind, row, packet) {
    if (!row) return [];
    if (kind === 'feat') return getFeatChoiceGroups(row);
    if (!packet || !packet.evaluation || !packet.evaluation.availableChoices) return [];
    const groups = packet.evaluation.availableChoices.featureChoiceGroups || [];
    return groups.filter(group => {
      const groupLevel = Number(group.level || 1);
      if (kind === 'subclass') {
        if (groupLevel > Number(state.level || 1)) return false;
      } else if (groupLevel !== 1) {
        return false;
      }
      if (kind === 'race') {
        const accepted = new Set([row.id, row.parentRaceId].filter(Boolean));
        return (String(group.kind || '').startsWith('race') && accepted.has(group.raceId))
          || accepted.has(group.group && String(group.group).split(':')[0]);
      }
      if (kind === 'background') {
        return String(group.kind || '').startsWith('background') && group.backgroundId === row.id;
      }
      if (kind === 'class') {
        return (group.kind === 'class-skill-choice' || group.kind === 'class-tool-choice' || group.kind === 'class-feature-choice')
          && normalize(group.className) === normalize(row.name);
      }
      if (kind === 'subclass') {
        return group.kind === 'class-feature-choice'
          && normalize(group.subclassName) === normalize(row.shortName || row.name);
      }
      return false;
    });
  }

  function getSelectedFeatChoiceGroups() {
    if (!indexes.featsById) return [];
    return (state.featIds || [])
      .map(id => indexes.featsById.get(id))
      .filter(Boolean)
      .flatMap(getFeatChoiceGroups);
  }

  function getFeatChoiceGroups(feat) {
    if (!feat || !feat.id) return [];
    return [
      ...getFeatAbilityChoiceGroups(feat),
      ...getFeatMetamagicChoiceGroups(feat),
    ];
  }

  function getFeatAbilityChoiceGroups(feat) {
    const structured = getStructuredFeatAbilityChoiceGroups(feat);
    if (structured.length) return structured;
    const inferred = getTextInferableFeatAbilityChoiceGroup(feat);
    return inferred ? [inferred] : [];
  }

  function getStructuredFeatAbilityChoiceGroups(feat) {
    const entries = Array.isArray(feat && feat.ability) ? feat.ability : [];
    return entries.map((entry, index) => {
      const choice = entry && entry.choose;
      if (!choice || typeof choice !== 'object') return null;
      const options = normalizeFeatAbilityChoiceList(choice.from || choice.weighted && choice.weighted.from || choice);
      return buildFeatAbilityChoiceGroup(feat, index, options, Number(choice.amount || choice.amountPer || 1) || 1);
    }).filter(Boolean);
  }

  function getTextInferableFeatAbilityChoiceGroup(feat) {
    const text = cleanText(`${feat && feat.abilityScores || ''} ${feat && feat.text || ''}`);
    if (!text) return null;
    const chosenScore = text.match(/choose one ability score[^.]{0,160}?increase (?:the chosen|that) ability score by (\d+)/i);
    if (chosenScore) {
      return buildFeatAbilityChoiceGroup(feat, 0, Object.keys(ABILITY_NAMES), Number(chosenScore[1]) || 1);
    }
    const matches = [...text.matchAll(/increase (?:your )?([^.;:]+?) by (\d+)/gi)];
    for (const match of matches) {
      const options = getAbilityOptionsFromChoiceText(match[1]);
      if (options.length > 1) {
        return buildFeatAbilityChoiceGroup(feat, 0, options, Number(match[2]) || 1);
      }
    }
    return null;
  }

  function buildFeatAbilityChoiceGroup(feat, index, abilities, amount) {
    const abilityKeys = uniqueText((abilities || []).map(getAbilityKeyFromChoice).filter(Boolean));
    if (abilityKeys.length < 2) return null;
    return {
      kind: 'feat-choice',
      choiceType: 'ability',
      group: `${feat.id}:ability:${index}`,
      label: `${feat.name}: Ability Score Increase`,
      featId: feat.id,
      level: 1,
      count: 1,
      choiceValue: Number(amount) || 1,
      options: abilityKeys.map(ability => ABILITY_NAMES[ability] || ability),
      description: `Choose the ability score increased by ${feat.name}.`,
      prompt: 'Choose the ability score increased by this feat.',
    };
  }

  function getAbilityOptionsFromChoiceText(value) {
    const text = String(value || '');
    if (/one ability score/i.test(text)) return Object.keys(ABILITY_NAMES);
    return Object.entries(ABILITY_NAMES)
      .filter(([, label]) => new RegExp(`\\b${label}\\b`, 'i').test(text))
      .map(([ability]) => ability);
  }

  function normalizeFeatAbilityChoiceList(value) {
    const raw = Array.isArray(value)
      ? value
      : value && typeof value === 'object'
        ? Object.keys(value).length ? Object.keys(value) : Object.values(value)
        : [value];
    return raw.map(getAbilityKeyFromChoice).filter(Boolean);
  }

  function getFeatMetamagicChoiceGroups(feat) {
    const text = cleanText(feat && feat.text || '');
    const isMetamagicAdept = normalize(feat && feat.id) === 'metamagic adept'
      || /learn two metamagic options/i.test(text);
    if (!isMetamagicAdept) return [];
    return [{
      kind: 'feat-choice',
      choiceType: 'feature-option',
      group: `${feat.id}:metamagic:0`,
      label: `${feat.name}: Metamagic Options`,
      featId: feat.id,
      level: 1,
      count: 2,
      options: METAMAGIC_OPTIONS,
      description: 'Choose the two Metamagic options learned from this feat.',
      prompt: 'Choose the two Metamagic options learned from this feat.',
      resultLabel: 'metamagic option',
    }];
  }

  function isEmbeddedLevelOneGroup(group) {
    if (Number(group.level || 1) !== 1) return false;
    const kind = String(group.kind || '');
    return kind.startsWith('race')
      || kind.startsWith('background')
      || kind === 'class-skill-choice'
      || kind === 'class-tool-choice'
      || kind === 'class-feature-choice';
  }

  function renderFeatureSnippets(features, title) {
    return `
      <div class="rule-detail-features">
        <h4>${escapeHtml(title)}</h4>
        ${features.map(feature => `
          <details>
            <summary>${escapeHtml(feature.name)} <span>Level ${escapeHtml(String(feature.level || 1))}</span></summary>
            <p>${escapeHtml(firstWords(feature.text || '', 55))}</p>
          </details>
        `).join('')}
      </div>
    `;
  }

  function formatAbilityRows(abilityRows) {
    const rows = Array.isArray(abilityRows) ? abilityRows : [];
    const parts = [];
    rows.forEach(row => {
      Object.entries(ABILITY_NAMES).forEach(([key, label]) => {
        if (row && row[key]) parts.push(`${label} +${row[key]}`);
      });
      if (row && row.choose && Array.isArray(row.choose.from)) {
        parts.push(`Choose ${row.choose.count || 1} from ${row.choose.from.map(key => ABILITY_NAMES[key] || key).join(', ')}`);
      }
    });
    return parts.join('; ');
  }

  function formatList(value) {
    if (Array.isArray(value)) return value.join(', ');
    return value || '';
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Number(value) || 0);
  }

  function rowName(row) {
    return row && (row.name || row.shortName) || '';
  }

  function calculateModifier(score) {
    return Math.floor(((Number(score) || 10) - 10) / 2);
  }

  function formatModifier(score) {
    const mod = calculateModifier(score);
    return mod >= 0 ? `+${mod}` : String(mod);
  }

  function calculateProficiencyBonus(level) {
    return Math.ceil((Number(level) || 1) / 4) + 1;
  }

  function formatSkillName(value) {
    return String(value || '')
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  function getKnownSkillSet() {
    return new Set(normalizeIds(state.proficiencies && state.proficiencies.skills || []).map(normalizeSkillChoice).filter(Boolean));
  }

  function getKnownLanguageSet() {
    return new Set(normalizeIds(state.proficiencies && state.proficiencies.languages || []).map(normalize).filter(Boolean));
  }

  function getKnownToolSet() {
    return new Set(normalizeIds(state.proficiencies && state.proficiencies.tools || []).map(normalize).filter(Boolean));
  }

  function normalizeSkillChoice(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function sortFeatureRows(a, b) {
    return Number(a.level || 0) - Number(b.level || 0) || String(a.name).localeCompare(String(b.name));
  }

  function renderChoiceGroups(packet) {
    const groups = activeChoiceGroups.length ? activeChoiceGroups : getPacketChoiceGroups(packet);
    const visibleGroups = groups.filter(group => !isEmbeddedLevelOneGroup(group));
    const buckets = groupChoicesByLevel(packet, visibleGroups);
    if (!buckets.length) {
      els.choiceGroups.innerHTML = '';
      return;
    }
    els.choiceGroups.innerHTML = buckets
      .map(bucket => `
        <section class="level-choice-section">
          <header>
            <h3>Level ${escapeHtml(String(bucket.level))}</h3>
            <span>${escapeHtml(bucket.total ? `${bucket.completed}/${bucket.total} complete` : 'feature checkpoint')}</span>
          </header>
          ${bucket.level === 1 ? renderLevelOneWalkthrough(packet) : renderAdvancementWalkthrough(bucket, packet)}
          ${renderLevelFeatureChips(bucket.features)}
          <div class="level-choice-list">${bucket.groups.map(renderChoiceCard).join('')}</div>
        </section>
      `).join('');
  }

  function renderChoiceCard(group) {
    if (group.choiceType === 'ability-allocation') return renderAsiChoiceCard(group);
    const explicitValues = getFeatureChoiceValues(group);
    const selectedValues = getChoiceValuesForGroup(group);
    const inferredOptions = normalizeChoiceOptions(group.inferredSelections || []);
    const softInferred = true;
    const valuesForCap = softInferred ? explicitValues : selectedValues;
    const label = group.label || group.group;
    const count = Number(group.count) || 1;
    const fixedOptions = normalizeChoiceOptions(group.fixedOptions || []);
    const fixedBonuses = Array.isArray(group.fixedBonuses) ? group.fixedBonuses : [];
    const inputType = count === 1 ? 'radio' : 'checkbox';
    const options = (group.options || [])
      .filter(option => !fixedOptions.includes(normalize(option)))
      .map(option => {
      const explicitSelected = explicitValues.some(value => normalize(value) === normalize(option));
      const fixed = fixedOptions.includes(normalize(option));
      const inferred = !explicitValues.length && inferredOptions.includes(normalize(option));
      const selected = explicitSelected || inferred;
      const unavailable = isChoiceOptionUnavailable(group, option, selected);
      const capped = inputType === 'checkbox' && valuesForCap.length >= count && !selected;
      return `
        <label class="${unavailable || inferred ? 'choice-unavailable' : ''}">
          <input type="${inputType}" name="choice-${slugify(group.group)}" data-choice-group="${escapeAttr(group.group)}" data-choice-count="${escapeAttr(String(count))}" data-choice-type="${escapeAttr(group.choiceType || '')}" value="${escapeAttr(option)}" ${selected || fixed || inferred ? 'checked' : ''} ${fixed || (inferred && !softInferred) || unavailable || capped ? 'disabled' : ''}>
          ${formatChoiceOptionLabel(group, option)}${inferred ? `<small>${softInferred ? 'suggested' : 'already on sheet'}</small>` : unavailable ? '<small>already on sheet</small>' : ''}
        </label>
      `;
    }).join('');
    const complete = isChoiceComplete(group, selectedValues);
    const fixedHtml = fixedBonuses.length
      ? `<div class="choice-options choice-fixed-list">${fixedBonuses.map(bonus => `<label><input type="checkbox" checked disabled> ${escapeHtml(bonus.option)} +${escapeHtml(String(bonus.value || 1))}</label>`).join('')}</div>`
      : fixedOptions.length
        ? `<div class="choice-options choice-fixed-list">${fixedOptions.map(option => `<label><input type="checkbox" checked disabled> ${escapeHtml(findOriginalOption(group.options, option) || option)}</label>`).join('')}</div>`
        : '';
    const result = renderChoiceResult(group, selectedValues);
    const body = group.autoComplete
      ? ''
      : group.coveredBy
        ? group.coveredBy === 'optionalFeatureIds'
          ? renderOptionalFeatureToggle(group)
          : group.coveredBy === 'subclassId'
            ? renderSubclassChoicePicker(group)
            : renderChoiceRulePicker(group)
        : options
        ? `<div class="choice-options">${options}</div>`
        : `<p class="builder-note">${escapeHtml(group.description || 'Use the matching picker on this sheet to make this choice explicit.')}</p>`;
    const selectedCount = group.coveredBy === 'optionalFeatureIds' || group.coveredBy === 'subclassId' ? (complete ? 1 : 0) : group.autoComplete ? (group.fixedOptions || []).length : selectedValues.length;
    const prompt = group.prompt || (group.coveredBy === 'optionalFeatureIds'
      ? 'Enable this only if the player wants to use the optional rule.'
      : `Pick ${count === 1 ? 'one option' : `${count} options`} to clear this ruleset problem.`);
    return `<div class="choice-group ${complete ? 'complete' : 'incomplete'}" data-choice-scope><div class="choice-heading"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(selectedCount))}/${escapeHtml(String(count))} selected</span></div>${fixedHtml}${complete || group.autoComplete ? '' : `<p class="builder-note">${escapeHtml(prompt)}</p>`}${body}${result}${renderChoiceOptionDetails(group, selectedValues)}</div>`;
  }

  function renderAsiChoiceCard(group) {
    const selected = getFeatureChoiceValues(group);
    const slots = [selected[0] || '', selected[1] || ''];
    const bonusKey = `${group.group}:bonus-feat`;
    const bonusGroup = getAsiBonusChoiceGroup(group);
    const bonusValues = getFeatureChoiceValues(bonusKey);
    const featSelectedCount = getChoiceRuleSelectedIds('feat', bonusGroup).length;
    const bonusChecked = bonusValues.includes('enabled') || featSelectedCount > 0;
    const selectedCount = slots.filter(Boolean).length;
    const complete = selectedCount >= 2;
    const countText = bonusChecked
      ? `${escapeHtml(String(selectedCount))}/2 increases, ${escapeHtml(String(featSelectedCount))}/1 feat`
      : `${escapeHtml(String(selectedCount))}/2 increases`;
    const selectHtml = slots.map((value, index) => `
      <label>
        +1 Increase ${index + 1}
        <select data-asi-slot="${escapeAttr(String(index))}" data-choice-group="${escapeAttr(group.group)}">
          <option value="">Choose ability</option>
          ${(group.options || Object.values(ABILITY_NAMES)).map(option => `<option value="${escapeAttr(option)}" ${normalize(option) === normalize(value) ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
        </select>
      </label>
    `).join('');
    return `
      <div class="choice-group ${complete ? 'complete' : 'incomplete'} asi-choice-group" data-choice-scope>
        <div class="choice-heading">
          <strong>${escapeHtml(group.label || 'Ability Score Increase')}</strong>
          <span>${countText}</span>
        </div>
        <p class="builder-note">${escapeHtml(group.description || 'Choose two +1 increases, or choose the same ability twice for +2.')}</p>
        <div class="asi-picker">${selectHtml}</div>
        ${renderChoiceResult(group, selected)}
        <label class="optional-rule-toggle bonus-feat-toggle">
          <input type="checkbox" data-bonus-feat-toggle data-choice-group="${escapeAttr(bonusKey)}" ${bonusChecked ? 'checked' : ''}>
          Enable feat for this level
        </label>
        ${bonusChecked ? renderChoiceRulePicker(bonusGroup) : ''}
      </div>
    `;
  }

  function groupChoicesByLevel(packet, groups) {
    const buckets = new Map();
    const rulesetBuckets = packet.evaluation
      && packet.evaluation.availableChoices
      && Array.isArray(packet.evaluation.availableChoices.levelBuckets)
      ? packet.evaluation.availableChoices.levelBuckets
      : [];
    rulesetBuckets.forEach(bucket => {
      const level = clamp(Number(bucket.level) || 1, 1, 20);
      if (!buckets.has(level)) buckets.set(level, { level, groups: [], features: [] });
      const current = buckets.get(level);
      current.features.push(...(bucket.features || []));
    });
    (groups || []).forEach(group => {
      const level = clamp(Number(group.level) || 1, 1, 20);
      if (!buckets.has(level)) buckets.set(level, { level, groups: [], features: [] });
      buckets.get(level).groups.push(group);
    });
    for (let level = 1; level <= Number(state.level || 1); level += 1) {
      if (!buckets.has(level)) buckets.set(level, { level, groups: [], features: [] });
    }
    return [...buckets.values()]
      .sort((a, b) => a.level - b.level)
      .map(bucket => {
        const uniqueFeatures = uniqueBy(bucket.features || [], feature => feature.id || `${feature.kind}:${feature.name}:${feature.level}`);
        return {
          ...bucket,
          features: uniqueFeatures,
          total: bucket.groups.length,
          completed: bucket.groups.filter(group => isChoiceComplete(group, getChoiceValuesForGroup(group))).length,
        };
      });
  }

  function getPacketChoiceGroups(packet) {
    return packet
      && packet.evaluation
      && packet.evaluation.availableChoices
      && Array.isArray(packet.evaluation.availableChoices.featureChoiceGroups)
      ? packet.evaluation.availableChoices.featureChoiceGroups
      : getActiveChoiceGroups(packet && packet.allFeatures || []);
  }

  function sanitizeFeatureChoices(groups) {
    if (!state.featureChoices || typeof state.featureChoices !== 'object') return false;
    let changed = false;
    (groups || []).forEach(group => {
      if (!group || group.choiceType !== 'ability-allocation' || !group.group) return;
      const values = getFeatureChoiceValues(group);
      const next = values
        .map(getAbilityLabelFromChoice)
        .filter(Boolean)
        .slice(0, Number(group.count) || 2);
      const hasStoredValue = Boolean(findFeatureChoiceStoredKey(group.group));
      if (deleteFeatureChoiceAliases(group)) changed = true;
      if (!next.length) {
        if (hasStoredValue) {
          delete state.featureChoices[group.group];
          changed = true;
        }
      } else {
        if (!hasStoredValue || next.length !== values.length || next.some((value, index) => value !== values[index])) {
          state.featureChoices[group.group] = next;
          changed = true;
        }
      }
    });
    const used = {
      skill: new Set(),
      language: new Set(),
      tool: new Set(),
    };
    (groups || []).forEach(group => {
      if (!group || !['skill', 'language', 'tool'].includes(group.choiceType)) return;
      const normalizer = group.choiceType === 'skill' ? normalizeSkillChoice : normalize;
      (group.fixedOptions || []).forEach(option => used[group.choiceType].add(normalizer(option)));
      if (group.autoComplete) {
        if (deleteFeatureChoiceValues(group)) changed = true;
        return;
      }
      const values = getFeatureChoiceValues(group);
      const next = [];
      values.forEach(value => {
        const key = normalizer(value);
        if (!key || used[group.choiceType].has(key)) {
          changed = true;
          return;
        }
        used[group.choiceType].add(key);
        next.push(value);
      });
      const count = Number(group.count) || 1;
      const capped = group.allowDuplicate ? next.slice(0, count) : uniqueText(next).slice(0, count);
      if (capped.length !== values.length || capped.some((value, index) => value !== values[index])) {
        changed = true;
      }
      const storedKey = findFeatureChoiceStoredKey(group.group);
      const hasStoredValue = Boolean(storedKey);
      if (deleteFeatureChoiceAliases(group)) changed = true;
      if (!capped.length) {
        if (Object.prototype.hasOwnProperty.call(state.featureChoices, group.group) || hasStoredValue) {
          delete state.featureChoices[group.group];
          changed = true;
        }
      } else {
        if (!hasStoredValue || storedKey !== group.group) changed = true;
        state.featureChoices[group.group] = capped;
      }
      (group.inferredSelections || []).forEach(option => used[group.choiceType].add(normalizer(option)));
    });

    (groups || []).forEach(group => {
      if (!group || getChoiceRuleKind(group) !== 'feat' || !group.group) return;
      const values = getFeatureChoiceValues(group);
      const resolved = uniqueText(values.map(value => indexes.featsById.has(value) ? value : resolvePickId('feat', value)).filter(Boolean));
      if (String(group.group || '').endsWith(':bonus-feat') && values.includes('enabled') && !resolved.length) {
        const storedKey = findFeatureChoiceStoredKey(group.group);
        if (!storedKey || storedKey !== group.group || values.length !== 1) {
          if (storedKey) delete state.featureChoices[storedKey];
          state.featureChoices[group.group] = ['enabled'];
          changed = true;
        }
        return;
      }
      const capped = resolved.slice(0, Number(group.count) || 1);
      const storedKey = findFeatureChoiceStoredKey(group.group);
      const hasStoredValue = Boolean(storedKey);
      if (deleteFeatureChoiceAliases(group)) changed = true;
      if (capped.length !== values.length || capped.some((value, index) => value !== values[index]) || (hasStoredValue && storedKey !== group.group)) {
        changed = true;
        if (capped.length) state.featureChoices[group.group] = capped;
        else delete state.featureChoices[group.group];
      } else if (capped.length && !Object.prototype.hasOwnProperty.call(state.featureChoices, group.group)) {
        state.featureChoices[group.group] = capped;
        changed = true;
      }
    });
    return changed;
  }

  function renderLevelOneWalkthrough(packet) {
    const projected = packet.projection || {};
    const race = indexes.racesById.get(state.raceId);
    const background = indexes.backgroundsById.get(state.backgroundId);
    const cls = indexes.classesById.get(state.classId);
    const subclass = indexes.subclassesById.get(state.subclassId);
    const abilities = getCurrentAbilities();
    const abilityText = Object.entries(ABILITY_NAMES)
      .map(([key]) => `${key.toUpperCase()} ${Number(abilities[key]) || 10} (${formatModifier(abilities[key])})`)
      .join(', ');
    const originAsi = getOriginAbilitySummary(race, packet.evaluation && packet.evaluation.availableChoices && packet.evaluation.availableChoices.featureChoiceGroups || []);
    const size = getCurrentSize(projected, race);
    const speed = projected.speed || getRaceSpeed(race) || 30;
    const hpSummary = getHitPointSummary();
    return `
      <div class="walkthrough-grid">
        ${renderWalkthroughCard('0', 'Character Description', [
          ['Name', state.name || 'Not selected'],
          ['Size', size || 'Not selected'],
          ['Speed', `${speed} ft`],
          ['Hit Points', hpSummary || 'Choose class and CON'],
        ], Boolean(state.name && size))}
        ${renderWalkthroughCard('1', 'Ability Scores', [
          ['Method', titleCase(String(state.abilityMethod || 'manual').replace(/-/g, ' '))],
          ['Scores', abilityText],
        ], Object.values(abilities).every(score => Number(score) > 0))}
        ${renderWalkthroughCard('2', 'Race And Background', [
          ['Race', rowName(race) || projected.race || 'Not selected'],
          ['Background', rowName(background) || projected.background || 'Not selected'],
          ['Origin ASI', originAsi || 'Not resolved'],
        ], Boolean(state.raceId && state.backgroundId))}
        ${renderWalkthroughCard('3', 'Class And Training', [
          ['Class', rowName(cls) || projected.class || 'Not selected'],
          ['Subclass', rowName(subclass) || projected.subclass || getSubclassUnlockText()],
          ['Proficiency Bonus', `+${calculateProficiencyBonus(Number(state.level || 1))}`],
        ], Boolean(state.classId && (!isSubclassRequired() || state.subclassId)))}
        ${renderWalkthroughCard('4', 'Starting Picks', [
          ['Feats', `${state.featIds.length}/${getFeatSlots()}`],
          ['Items', String(state.itemIds.length)],
          ['Spells', getMaxSpellLevel() ? `${state.spellIds.length} selected` : 'No class spell slots'],
        ], true)}
      </div>
    `;
  }

  function renderAdvancementWalkthrough(bucket, packet) {
    const features = bucket.features || [];
    const level = Number(bucket.level || 1);
    const hasAsi = bucket.groups.some(group => group.choiceType === 'ability-allocation');
    const maxSpellLevel = getMaxSpellLevelForLevel(level);
    return `
      <div class="walkthrough-grid compact">
        ${renderWalkthroughCard('A', 'Advancement', [
          ['XP Threshold', formatNumber(XP_BY_LEVEL[level] || 0)],
          ['Proficiency Bonus', `+${calculateProficiencyBonus(level)}`],
          ['Hit Points', `Gain 1 Hit Die; add ${getHitDieForLevel()} + CON ${formatModifier(getCurrentAbilities().con)} or fixed value`],
        ], true)}
        ${renderWalkthroughCard('B', 'Class Features', [
          ['Unlocked', features.length ? features.map(feature => feature.name).slice(0, 4).join(', ') : 'No new feature rows found'],
          ['ASI / Feat', hasAsi ? 'Choice required at this level' : 'No ASI gate at this level'],
          ['Spell Access', maxSpellLevel ? `Up to spell level ${maxSpellLevel}` : 'No class spell slots'],
        ], !bucket.total || bucket.completed === bucket.total)}
      </div>
    `;
  }

  function renderWalkthroughCard(step, title, rows, complete) {
    return `
      <article class="walkthrough-card ${complete ? 'complete' : 'incomplete'}">
        <div class="walkthrough-card-heading">
          <span>${escapeHtml(step)}</span>
          <strong>${escapeHtml(title)}</strong>
          <em>${complete ? 'Picked' : 'Needs pick'}</em>
        </div>
        <dl>
          ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value || ''))}</dd></div>`).join('')}
        </dl>
      </article>
    `;
  }

  function renderLevelFeatureChips(features = []) {
    if (!features.length) return '';
    return `
      <div class="level-feature-details">
        ${features.slice(0, 12).map(feature => {
          const source = [feature.kind, feature.className || feature.subclassName || feature.raceName || feature.source].filter(Boolean).join(' · ');
          const row = indexes.featuresById.get(feature.id) || feature;
          const text = row.text || feature.text || '';
          return `
            <details>
              <summary>${escapeHtml(feature.name || feature.id || 'Feature')} <span>${escapeHtml(source)}</span></summary>
              <p>${escapeHtml(firstWords(text || 'Rules text not available in the current catalog.', 90))}</p>
            </details>
          `;
        }).join('')}
      </div>
    `;
  }

  function getCurrentSize(projected, race) {
    const values = [];
    if (projected.size) values.push(projected.size);
    getRaceOriginRows(race, 'size').forEach(grant => {
      if (grant && grant.value) values.push(grant.value);
      if (grant && Array.isArray(grant.options)) values.push(...grant.options);
    });
    if (race && Array.isArray(race.size)) values.push(...race.size);
    if (race && race.parentRaceId) {
      const parent = indexes.racesById.get(race.parentRaceId);
      if (parent && Array.isArray(parent.size)) values.push(...parent.size);
    }
    const size = values.find(Boolean);
    return formatRaceSizeValue(size);
  }

  function getRaceSpeed(race) {
    if (!race) return 0;
    const originSpeed = getRaceOriginRows(race, 'speed');
    if (originSpeed.length) {
      const profile = normalizeRaceSpeed(originSpeed);
      if (Number(profile.walk)) return Number(profile.walk);
    }
    if (Number(race.speed)) return Number(race.speed);
    if (race.parentRaceId) {
      const parent = indexes.racesById.get(race.parentRaceId);
      if (parent && Number(parent.speed)) return Number(parent.speed);
    }
    return 0;
  }

  function getRaceOriginRows(race, key) {
    const origin = race && typeof race.origin === 'object' ? race.origin : race && typeof race.rules === 'object' ? race.rules : {};
    return Array.isArray(origin && origin[key]) ? origin[key] : [];
  }

  function normalizeRaceSpeed(value) {
    const out = {};
    const deferred = [];
    (Array.isArray(value) ? value : []).forEach(grant => {
      if (!grant || typeof grant !== 'object') return;
      const mode = String(grant.movement || 'walk').toLowerCase();
      if (grant.equals === 'walk' || grant.value === true || String(grant.value || '').toLowerCase() === 'walk') {
        deferred.push(mode);
        return;
      }
      const number = Number(grant.value);
      if (Number.isFinite(number) && number > 0) out[mode] = number;
    });
    if (!out.walk) out.walk = 30;
    deferred.forEach(mode => {
      out[mode] = out.walk;
    });
    return out;
  }

  function formatRaceSizeValue(value) {
    const clean = String(value || '').trim().toLowerCase();
    if (clean === 'm' || clean === 'medium') return 'Medium';
    if (clean === 's' || clean === 'small') return 'Small';
    if (clean === 'l' || clean === 'large') return 'Large';
    if (clean === 't' || clean === 'tiny') return 'Tiny';
    if (clean === 'h' || clean === 'huge') return 'Huge';
    if (clean === 'g' || clean === 'gargantuan') return 'Gargantuan';
    return String(value || '').trim();
  }

  function isSubclassRequired() {
    return Boolean(state.classId && Number(state.level || 1) >= getSubclassUnlockLevel(state.classId));
  }

  function getSubclassUnlockText() {
    return state.classId ? `Unlocks at level ${getSubclassUnlockLevel(state.classId)}` : 'Not selected';
  }

  function getHitDieForLevel() {
    const cls = getCurrentClass();
    return cls && cls.hitDie || 'class hit die';
  }

  function getMaxSpellLevelForLevel(level) {
    if (!ruleset) return 0;
    return ruleset.getMaxSpellLevel({
      level,
      classId: state.classId,
      subclassId: state.subclassId,
      classLevels: state.classId ? [{ classId: state.classId, subclassId: state.subclassId, level }] : [],
      spellIds: state.spellIds,
      abilities: getBaseAbilities(),
    });
  }

  function isChoiceComplete(group, selectedValues = []) {
    const count = Number(group.count) || 1;
    if (group.autoComplete) return true;
    if (group.choiceType === 'ability-allocation') {
      return selectedValues.length >= count;
    }
    if (group.coveredBy === 'featIds') return state.featIds.length >= count;
    if (group.coveredBy === 'subclassId') return Boolean(state.subclassId);
    if (group.coveredBy === 'optionalFeatureIds') return isOptionalFeatureSelected(group);
    return selectedValues.length >= count;
  }

  function renderOptionalFeatureToggle(group) {
    const checked = isOptionalFeatureSelected(group);
    return `
      <label class="optional-rule-toggle">
        <input type="checkbox" data-optional-feature-id="${escapeAttr(group.featureId || group.group)}" ${checked ? 'checked' : ''}>
        Enable ${escapeHtml((group.options || [])[0] || group.label || 'optional rule')}
      </label>
      ${group.description ? `<p class="builder-note">${escapeHtml(cleanText(group.description))}</p>` : ''}
    `;
  }

  function renderSubclassChoicePicker(group) {
    const rows = getAvailableSubclassesForClass(group.classId || state.classId, Number(state.level || 1));
    return `
      <label class="subclass-choice-picker">
        Subclass
        <select data-subclass-choice>
          <option value="">Choose subclass</option>
          ${rows.map(row => `<option value="${escapeAttr(row.id)}" ${row.id === state.subclassId ? 'selected' : ''}>${escapeHtml(sourceLabel(row))}</option>`).join('')}
        </select>
      </label>
      ${group.description ? `<p class="builder-note">${escapeHtml(cleanText(group.description))}</p>` : ''}
    `;
  }

  function isOptionalFeatureSelected(group) {
    const selected = new Set([...(state.optionalFeatureIds || []), ...(state.selectedFeatureIds || [])].map(normalize));
    return selected.has(normalize(group.featureId || group.group)) || selected.has(normalize((group.options || [])[0]));
  }

  function isChoiceOptionUnavailable(group, option, selected) {
    if (selected) return false;
    if (group.choiceType === 'skill') return getKnownChoiceSet('skill', group).has(normalizeSkillChoice(option));
    if (group.choiceType === 'language') return getKnownChoiceSet('language', group).has(normalize(option));
    if (group.choiceType === 'tool') return getKnownChoiceSet('tool', group).has(normalize(option));
    return false;
  }

  function getKnownChoiceSet(choiceType, currentGroup) {
    const normalizer = choiceType === 'skill' ? normalizeSkillChoice : normalize;
    const values = choiceType === 'skill'
      ? [...getKnownSkillSet()]
      : choiceType === 'language'
        ? [...getKnownLanguageSet()]
        : [...getKnownToolSet()];
    (activeChoiceGroups || []).forEach(group => {
      if (!group || group.choiceType !== choiceType) return;
      if (currentGroup && group.group === currentGroup.group) return;
      [...(group.fixedOptions || []), ...(group.inferredSelections || []), ...getFeatureChoiceValues(group)]
        .forEach(value => values.push(normalizer(value)));
    });
    return new Set(values.map(value => String(value || '').trim()).filter(Boolean));
  }

  function renderChoiceResult(group, selectedValues) {
    if (group.choiceType === 'ability') {
      const text = getChoiceResultText(group, selectedValues);
      return `<p class="choice-result">Resulting increase: ${escapeHtml(text || 'none selected yet')}</p>`;
    }
    if (group.choiceType === 'ability-allocation') {
      const text = getChoiceResultText(group, selectedValues);
      return `<p class="choice-result">Resulting ASI: ${escapeHtml(text || 'none selected yet')}</p>`;
    }
    if (['skill', 'language', 'tool', 'cantrip', 'ancestry', 'size', 'fighting-style', 'favored-enemy', 'favored-terrain', 'feature-option'].includes(group.choiceType)) {
      const text = getChoiceResultText(group, selectedValues);
      const label = group.resultLabel || group.choiceType;
      return `<p class="choice-result">Resulting ${escapeHtml(label)}${text.includes(',') ? 's' : ''}: ${escapeHtml(text || 'none selected yet')}</p>`;
    }
    if (group.choiceType === 'subclass') {
      const text = getChoiceResultText(group, selectedValues);
      return `<p class="choice-result">Selected subclass: ${escapeHtml(text || 'none selected yet')}</p>`;
    }
    return '';
  }

  function renderChoiceOptionDetails(group, selectedValues) {
    const selected = (selectedValues || []).filter(Boolean);
    const detailRows = selected
      .map(option => ({ option, text: getChoiceOptionDetail(group, option) }))
      .filter(row => row.text);
    if (!detailRows.length && group.description && ['favored-enemy', 'favored-terrain'].includes(group.choiceType)) {
      detailRows.push({ option: group.label || 'Rule detail', text: group.description });
    }
    if (!detailRows.length) return '';
    return `
      <div class="choice-option-details">
        ${detailRows.map(row => `
          <details open>
            <summary>${escapeHtml(row.option)}</summary>
            <p>${escapeHtml(firstWords(row.text, 85))}</p>
          </details>
        `).join('')}
      </div>
    `;
  }

  function getChoiceOptionDetail(group, option) {
    if (!group || !option) return '';
    if (group.choiceType === 'fighting-style') {
      return FIGHTING_STYLE_DETAILS[normalize(option)] || '';
    }
    if (group.coveredBy === 'subclassId') {
      const subclass = indexes.subclassesById.get(state.subclassId);
      if (!subclass) return '';
      const names = new Set([subclass.name, subclass.shortName].map(normalize).filter(Boolean));
      const features = (data.features || [])
        .filter(feature => feature.kind === 'subclass'
          && normalize(feature.className) === normalize(subclass.className)
          && (names.has(normalize(feature.subclassName)) || names.has(normalize(feature.subclassShortName)))
          && Number(feature.level || 1) <= Number(state.level || 1))
        .sort(sortFeatureRows);
      return features.length
        ? features.map(feature => `${feature.name}: ${feature.text || ''}`).join(' ')
        : getRuleText('subclass', subclass);
    }
    const groupClass = normalize(group.className || '');
    const groupSubclass = normalize(group.subclassName || '');
    const optionKey = normalize(option);
    const feature = (data.features || []).find(row => {
      if (normalize(row.name) !== optionKey) return false;
      if (groupClass && normalize(row.className) !== groupClass) return false;
      if (groupSubclass) {
        const names = [row.subclassName, row.subclassShortName].map(normalize);
        if (!names.includes(groupSubclass)) return false;
      }
      return Number(row.level || 1) <= Number(state.level || 1);
    });
    return feature ? feature.text || '' : '';
  }

  function normalizeChoiceOptions(options) {
    return (options || []).map(normalize).filter(Boolean);
  }

  function findOriginalOption(options, normalizedOption) {
    return (options || []).find(option => normalize(option) === normalizedOption) || '';
  }

  function renderChoiceRulePicker(group) {
    const kind = getChoiceRuleKind(group);
    if (!kind) return `<p class="builder-note">${escapeHtml(group.description || 'Use the matching picker on this sheet to make this choice explicit.')}</p>`;
    const selectedIds = getChoiceRuleSelectedIds(kind, group);
    const rows = getChoicePickerRows(kind);
    const groupLimit = Number(group.count) || 1;
    const totalSlots = kind === 'feat' ? getFeatSlots() : null;
    const displaySlots = kind === 'feat' && String(group.group || '').endsWith(':bonus-feat') ? groupLimit : totalSlots;
    const atGroupLimit = selectedIds.length >= groupLimit;
    const atSheetLimit = kind === 'feat' && (state.featIds || []).length >= totalSlots && !selectedIds.length;
    const atLimit = atGroupLimit || atSheetLimit;
    const selected = selectedIds
      .map(id => indexes[`${kind}sById`] && indexes[`${kind}sById`].get(id))
      .filter(Boolean);
    const selectedHtml = selected.length
      ? selected.map(row => `<span class="chip">${escapeHtml(sourceLabel(row))}<button type="button" data-remove-kind="${escapeAttr(kind)}" data-remove-group="${escapeAttr(group.group)}" data-remove-id="${escapeAttr(row.id)}" aria-label="Remove ${escapeAttr(row.name)}">x</button></span>`).join('')
      : '<div class="empty-state">None selected for this rule yet.</div>';
    const selectedDetails = kind === 'feat' && selected.length
      ? `<div class="choice-selection-details">${selected.map(row => renderRuleDetail(kind, row, { compact: true, includeChoices: true })).join('')}</div>`
      : '';
    return `
      <div class="choice-rule-picker" data-choice-card>
        <div class="choice-rule-adder">
          <select data-choice-pick-kind="${escapeAttr(kind)}" data-choice-pick-group="${escapeAttr(group.group)}" ${atLimit ? 'disabled' : ''}>
            <option value="">Choose ${escapeHtml(kind)}</option>
            ${rows.map(row => `<option value="${escapeAttr(row.id)}">${escapeHtml(sourceLabel(row))}</option>`).join('')}
          </select>
          <button type="button" data-choice-add-kind="${escapeAttr(kind)}" data-choice-add-group="${escapeAttr(group.group)}" ${atLimit ? 'disabled' : ''}>Add ${escapeHtml(capitalize(kind))}</button>
        </div>
        ${kind === 'feat' ? `<p class="builder-note">${escapeHtml(getFeatRuleLimitText(group, groupLimit, displaySlots))}</p>` : ''}
        <div class="rule-preview" data-choice-pick-preview></div>
        <div class="chip-list choice-selection-list">${selectedHtml}</div>
        ${selectedDetails}
      </div>
    `;
  }

  function getFeatRuleLimitText(group, groupLimit, slots) {
    const ruleText = `This rule can hold ${groupLimit} feat${groupLimit === 1 ? '' : 's'}.`;
    return group && group.group ? ruleText : `${ruleText} Total feat slots available: ${slots}.`;
  }

  function getChoiceRuleSelectedIds(kind, group) {
    const explicit = getFeatureChoiceValues(group)
      .map(value => indexes[`${kind}sById`] && indexes[`${kind}sById`].has(value) ? value : resolvePickId(kind, value))
      .filter(Boolean);
    if (explicit.length) return uniqueText(explicit).slice(0, Number(group.count) || 1);
    if (kind !== 'feat') return state[`${kind}Ids`] || [];
    if (group.kind === 'race-feat') return (state.featIds || []).slice(0, Number(group.count) || 1);
    if (String(group.group || '').endsWith(':bonus-feat')) {
      return [];
    }
    return (state.featIds || []).slice(0, Number(group.count) || 1);
  }

  function getChoiceRuleKind(group) {
    if (group.input) return group.input;
    if (group.coveredBy === 'featIds') return 'feat';
    if (group.coveredBy === 'spellIds') return 'spell';
    if (group.coveredBy === 'itemIds') return 'item';
    return '';
  }

  function getAsiBonusChoiceGroup(group) {
    const source = group && typeof group === 'object'
      ? group
      : getChoiceGroupByName(getAsiAllocationGroupFromBonusKey(group)) || {
        group: getAsiAllocationGroupFromBonusKey(group),
        featureId: getAsiFeatureIdFromAllocationGroup(getAsiAllocationGroupFromBonusKey(group)),
        kind: 'ability-score-choice',
      };
    return {
      ...source,
      group: `${source.group}:bonus-feat`,
      coveredBy: 'featIds',
      input: 'feat',
      count: 1,
      description: 'Choose the feat taken at this ASI level.',
    };
  }

  function getAsiAllocationGroupFromBonusKey(bonusKey) {
    return String(bonusKey || '').replace(/:bonus-feat$/, '');
  }

  function getChoicePickerRows(kind) {
    const rows = data[`${kind}s`] || [];
    const selected = new Set(state[`${kind}Ids`] || []);
    if (kind === 'spell') {
      const maxLevel = getMaxSpellLevel();
      return sortRules(rows.filter(row => !selected.has(row.id) && Number(row.level || 0) <= maxLevel));
    }
    return sortRules(rows.filter(row => !selected.has(row.id)));
  }

  function getFeatureChoiceValues(group) {
    if (!state.featureChoices || typeof state.featureChoices !== 'object') return [];
    if (group && typeof group === 'object') {
      for (const key of getFeatureChoiceKeyCandidates(group)) {
        const match = findFeatureChoiceStoredKey(key);
        if (match) return getFeatureChoiceValuesFromValue(state.featureChoices[match]);
      }
      return [];
    }
    const match = findFeatureChoiceStoredKey(group);
    const value = match ? state.featureChoices[match] : undefined;
    return getFeatureChoiceValuesFromValue(value);
  }

  function getFeatureChoiceValuesFromValue(value) {
    if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
    return String(value || '').split(/[;,|]/).map(item => item.trim()).filter(Boolean);
  }

  function getFeatureChoiceKeyCandidates(group) {
    if (!group || typeof group !== 'object') return [group].filter(Boolean);
    return [group.group, group.label, group.featureId].filter(Boolean);
  }

  function findFeatureChoiceStoredKey(key) {
    const target = normalize(key);
    if (!target || !state.featureChoices || typeof state.featureChoices !== 'object') return '';
    return Object.keys(state.featureChoices).find(candidate => normalize(candidate) === target) || '';
  }

  function deleteFeatureChoiceAliases(group) {
    let deleted = false;
    getFeatureChoiceKeyCandidates(group).forEach(key => {
      const stored = findFeatureChoiceStoredKey(key);
      if (stored && stored !== group.group) {
        delete state.featureChoices[stored];
        deleted = true;
      }
    });
    return deleted;
  }

  function deleteFeatureChoiceValues(group) {
    let deleted = false;
    getFeatureChoiceKeyCandidates(group).forEach(key => {
      const stored = findFeatureChoiceStoredKey(key);
      if (stored) {
        delete state.featureChoices[stored];
        deleted = true;
      }
    });
    return deleted;
  }

  function getChoiceValuesForGroup(group) {
    if (group && group.coveredBy === 'subclassId') {
      const subclass = indexes.subclassesById.get(state.subclassId);
      return subclass ? [sourceLabel(subclass)] : [];
    }
    if (group && group.autoComplete) {
      const fixedValues = [
        ...(Array.isArray(group.fixedOptions) ? group.fixedOptions : []),
        ...(Array.isArray(group.fixedBonuses) ? group.fixedBonuses.map(bonus => bonus.option).filter(Boolean) : []),
      ];
      return group.allowDuplicate ? fixedValues.filter(Boolean) : uniqueText(fixedValues);
    }
    const explicit = getFeatureChoiceValues(group);
    const inferred = Array.isArray(group.inferredSelections) ? group.inferredSelections : [];
    const fixed = group.autoComplete && Array.isArray(group.fixedOptions) ? group.fixedOptions : [];
    const values = [...fixed, ...inferred, ...explicit];
    return group.allowDuplicate ? values.filter(Boolean) : uniqueText(values);
  }

  function formatChoiceOptionLabel(group, option) {
    if (group.choiceType !== 'skill') return escapeHtml(option);
    const key = normalizeSkillChoice(option);
    const ability = SKILL_ABILITIES[key];
    if (!ability) return escapeHtml(option);
    const score = Number(getCurrentAbilities()[ability]) || 10;
    return `${escapeHtml(option)} <small>${escapeHtml(ability.toUpperCase())} ${escapeHtml(formatModifier(score))}</small>`;
  }

  function renderFeatures(allFeatures, selectedFeatures) {
    const selectedIds = new Set(selectedFeatures.map(feature => feature.id));
    if (els.featureSummary) els.featureSummary.textContent = `${selectedFeatures.length} selected from ${allFeatures.length} available`;
    if (!els.featureList) return;
    if (!allFeatures.length) {
      els.featureList.innerHTML = '<div class="empty-state">Choose a class, race, and level to preview features.</div>';
      return;
    }
    els.featureList.innerHTML = allFeatures
      .sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || String(a.name).localeCompare(String(b.name)))
      .map(feature => {
        const optional = Boolean(feature.optional) || isOptionalFeature(feature);
        const checked = selectedIds.has(feature.id);
        const source = [feature.kind, feature.className || feature.raceName || feature.subclassShortName || feature.source, `level ${feature.level || 1}`].filter(Boolean).join(' · ');
        return `
          <div class="feature-row">
            <input type="checkbox" ${optional ? `data-optional-feature-id="${escapeAttr(feature.id)}"` : 'disabled'} ${checked ? 'checked' : ''}>
            <div>
              <strong>${escapeHtml(feature.name)}</strong>
              <div class="feature-meta">${escapeHtml(source)}${optional ? ' · optional' : ''}</div>
            </div>
          </div>
        `;
      }).join('');
  }

  function renderActions(packet) {
    if (!els.actionSummary || !els.resourceList || !els.actionList) return;
    els.actionSummary.textContent = `${packet.actions.length} actions, ${packet.resources.length} wells`;
    if (!packet.resources.length) {
      els.resourceList.innerHTML = '<div class="empty-state">No limited-use resource wells found yet.</div>';
    } else {
      els.resourceList.innerHTML = packet.resources.map(resource => `
        <div class="resource-card">
          <strong>${escapeHtml(resource.name || resource.id)}</strong>
          <dl>
            <dt>Max</dt><dd>${escapeHtml(String(resource.max || resource.maxFormula || ''))}</dd>
            <dt>Reset</dt><dd>${escapeHtml(resource.reset || '')}</dd>
            <dt>Source</dt><dd>${escapeHtml(resource.sourceType || '')}</dd>
          </dl>
        </div>
      `).join('');
    }

    if (!packet.actions.length) {
      els.actionList.innerHTML = '<tr><td colspan="3">No rule actions found for the current choices.</td></tr>';
      return;
    }

    els.actionList.innerHTML = packet.actions.slice(0, 80).map(action => `
      <tr>
        <td><strong>${escapeHtml(action.title || action.name || 'Action')}</strong><div class="action-meta">${escapeHtml(firstWords(action.detail || action.text || '', 22))}</div></td>
        <td>${escapeHtml([action.sourceType, action.group].filter(Boolean).join(' · '))}</td>
        <td>${escapeHtml(action.resourceName || action.resourceId || '')}</td>
      </tr>
    `).join('');
  }

  function renderExport(packet) {
    if (!els.exportPacket) return;
    els.exportPacket.value = JSON.stringify(buildExportPacket(packet), null, 2);
  }

  function buildExportPacket(packet) {
    return {
      id: packet.id,
      name: packet.name,
      builderVersion: BUILDER_DRAFT_VERSION,
      rulesVersion: packet.rulesVersion,
      level: packet.level,
      classId: packet.classId,
      subclassId: packet.subclassId,
      raceId: packet.raceId,
      backgroundId: packet.backgroundId,
      abilityMethod: packet.abilityMethod,
      hpMode: packet.hpMode,
      maxHp: packet.maxHp,
      currentHp: packet.currentHp,
      experience: packet.experience,
      gold: packet.gold,
      heroPoints: packet.heroPoints,
      guildRank: packet.guildRank,
      guildPoints: packet.guildPoints,
      abilities: packet.abilities,
      classLevels: packet.classLevels,
      featIds: packet.featIds,
      itemIds: packet.itemIds,
      spellIds: packet.spellIds,
      optionalFeatureIds: packet.optionalFeatureIds,
      featureChoices: packet.featureChoices,
      selectedFeatureIds: packet.selectedFeatureIds,
      levelChoices: packet.levelChoices || {},
      proficiencies: packet.proficiencies || {},
    };
  }

  function buildPacket() {
    const cls = indexes.classesById.get(state.classId) || null;
    const subclass = indexes.subclassesById.get(state.subclassId) || null;
    const race = indexes.racesById.get(state.raceId) || null;
    const background = indexes.backgroundsById.get(state.backgroundId) || null;
    const feats = state.featIds.map(id => indexes.featsById.get(id)).filter(Boolean);
    const selectedItemIds = uniqueText(state.itemIds);
    const items = selectedItemIds.map(id => indexes.itemsById.get(id)).filter(Boolean);
    const spells = state.spellIds.map(id => indexes.spellsById.get(id)).filter(Boolean);
    const player = isSheetMode() ? getProjectionBasePlayer({ id: state.characterId, name: state.name }) : {};
    const character = {
      id: state.characterId || slugify(state.name || 'new-character'),
      name: state.name || '',
      rulesetId: ruleset ? ruleset.id : 'eldoria-5e',
      rulesVersion: ruleset ? ruleset.version : data.manifest && data.manifest.schemaVersion || 'canonical-json',
      level: state.level || 1,
      classId: cls ? cls.id : '',
      subclassId: subclass ? subclass.id : '',
      classLevels: cls ? [{ classId: cls.id, subclassId: subclass ? subclass.id : '', level: state.level || 1 }] : [],
      raceId: race ? race.id : '',
      backgroundId: background ? background.id : '',
      featIds: feats.map(row => row.id),
      itemIds: items.map(row => row.id),
      spellIds: spells.map(row => row.id),
      optionalFeatureIds: state.optionalFeatureIds.slice(),
      featureChoices: { ...state.featureChoices },
      selectedFeatureIds: state.selectedFeatureIds ? state.selectedFeatureIds.slice() : [],
      abilityMethod: state.abilityMethod || 'manual',
      hpMode: state.hpMode || 'auto-average',
      maxHp: normalizeHpInput(state.maxHp),
      currentHp: normalizeHpInput(state.currentHp),
      experience: normalizeNumberInput(state.experience, ...BUILDER_NUMBER_FIELDS.experience),
      gold: normalizeNumberInput(state.gold, ...BUILDER_NUMBER_FIELDS.gold),
      heroPoints: normalizeNumberInput(state.heroPoints, ...BUILDER_NUMBER_FIELDS.heroPoints),
      guildRank: state.guildRank || '',
      guildPoints: normalizeNumberInput(state.guildPoints, ...BUILDER_NUMBER_FIELDS.guildPoints),
      abilities: getBaseAbilities(),
      proficiencies: {
        skills: normalizeIds(state.proficiencies && state.proficiencies.skills || []),
        languages: normalizeIds(state.proficiencies && state.proficiencies.languages || []),
        tools: normalizeIds(state.proficiencies && state.proficiencies.tools || []),
      },
      levelChoices: state.levelChoices || {},
    };
    const projected = ruleset
      ? ruleset.project(character, player)
      : { evaluation: { features: [], resources: [], actions: [], actionWells: [], issues: [], nextLevel: {} }, projection: {} };
    const allFeatures = projected.evaluation.features || [];
    const selectedFeatures = allFeatures;
    const resources = projected.projection.resources || projected.evaluation.resources || [];
    const actions = projected.projection.ruleActions || projected.evaluation.actions || [];

    return {
      ...character,
      resources,
      actions,
      actionWells: projected.projection.actionWells || projected.evaluation.actionWells || [],
      allFeatures,
      selectedFeatures,
      evaluation: projected.evaluation,
      projection: projected.projection,
    };
  }

  function getAvailableFeatures(cls, subclass, race, level) {
    if (!cls) return race ? getRaceFeatures(race, level) : [];
    const className = normalize(cls.name);
    const subclassNames = new Set([subclass && subclass.name, subclass && subclass.shortName].map(normalize).filter(Boolean));
    const features = data.features.filter(feature => {
      if (Number(feature.level || 1) > level) return false;
      if (feature.kind === 'race') return raceFeatureMatches(feature, race);
      if (feature.kind === 'class') return normalize(feature.className) === className;
      if (feature.kind === 'subclass') {
        return normalize(feature.className) === className
          && (subclassNames.has(normalize(feature.subclassName)) || subclassNames.has(normalize(feature.subclassShortName)));
      }
      return false;
    });
    return uniqueBy(features, feature => feature.id);
  }

  function getRaceFeatures(race, level) {
    return data.features.filter(feature => Number(feature.level || 1) <= level && raceFeatureMatches(feature, race));
  }

  function raceFeatureMatches(feature, race) {
    if (!race || feature.kind !== 'race') return false;
    return feature.raceId === race.id || (race.parentRaceId && feature.raceId === race.parentRaceId);
  }

  function selectFeatures(features) {
    const optionalIds = new Set([...(state.optionalFeatureIds || []), ...(state.selectedFeatureIds || [])].map(normalize));
    const groups = getActiveChoiceGroups(features);
    const groupedOptionNames = new Map();
    groups.forEach(group => {
      const selected = state.featureChoices[group.group] || group.options[0];
      group.options.forEach(option => groupedOptionNames.set(normalize(option), selected === option));
    });

    return features.filter(feature => {
      const groupedSelected = groupedOptionNames.get(normalize(feature.name));
      if (groupedSelected === false) return false;
      if (isOptionalFeature(feature)) return optionalIds.has(normalize(feature.id)) || optionalIds.has(normalize(feature.name));
      return true;
    });
  }

  function getActiveChoiceGroups(features) {
    const featureNames = new Set(features.map(feature => normalize(feature.name)));
    const cls = indexes.classesById.get(state.classId);
    const subclass = indexes.subclassesById.get(state.subclassId);
    return FEATURE_CHOICE_GROUPS.filter(group => {
      if (cls && normalize(cls.name) !== normalize(group.className)) return false;
      if (subclass && normalize(subclass.shortName || subclass.name) !== normalize(group.subclassName)) return false;
      if (Number(state.level || 1) < group.level) return false;
      return group.options.every(option => featureNames.has(normalize(option)));
    });
  }

  function isRuleSourceSelected(row, sourceIds) {
    if (!row || !row.sourceId) return false;
    return sourceIds.has(row.sourceId) || sourceIds.has(row.id);
  }

  function inferFeatureResource(feature) {
    if (!feature) return null;
    const text = cleanText(feature.text || '');
    const hint = feature.resourceHint || '';
    const common = {
      sourceType: feature.kind || 'feature',
      sourceId: feature.id,
      source: feature.source || '',
      text: firstWords(text, 40),
    };
    if (hint === 'Channel Divinity') return { id: 'cleric-channel-divinity', name: 'Channel Divinity', maxFormula: 'clericChannelDivinityUses(level)', reset: 'shortRest', ...common };
    if (hint === 'Bardic Inspiration') return { id: 'bardic-inspiration', name: 'Bardic Inspiration', maxFormula: 'max(1, chaMod)', reset: 'longRestUntilFontOfInspirationThenShortRest', ...common };
    if (hint === 'Ki') return { id: 'monk-ki', name: 'Ki', maxFormula: 'level', reset: 'shortRest', ...common };
    if (hint === 'Wild Shape') return { id: 'druid-wild-shape', name: 'Wild Shape', max: 2, reset: 'shortRest', ...common };
    if (hint === 'Action Surge') return { id: 'action-surge', name: 'Action Surge', maxFormula: 'level >= 17 ? 2 : 1', reset: 'shortRest', ...common };
    if (hint === 'Second Wind') return { id: 'second-wind', name: 'Second Wind', max: 1, reset: 'shortRest', ...common };
    if (hint === 'Portent') return { id: 'wizard-portent', name: 'Portent', maxFormula: 'level >= 14 ? 3 : 2', reset: 'longRest', ...common };
    const abilityUses = text.match(/number of times equal to your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier \(a minimum of once\).*?regain all expended uses when you finish a (short|long) rest/i);
    if (abilityUses) {
      return {
        id: feature.id,
        name: feature.name,
        maxFormula: `${abilityUses[1].slice(0, 3).toLowerCase()}Mod`,
        reset: `${abilityUses[2].toLowerCase()}Rest`,
        ...common,
      };
    }
    if (/\bonce per day\b/i.test(text) || /\bcan't use (?:it|this feature|this ability|the feature|the ability|this trait|the trait|this action|this reaction)?[^.]{0,180}again until you finish a long rest\b/i.test(text)) {
      return { id: feature.id, name: feature.name, max: 1, reset: 'longRest', ...common };
    }
    if (/\bcan't use (?:it|this feature|this ability|the feature|the ability|this trait|the trait|this action|this reaction)?[^.]{0,180}again until you finish a short or long rest\b/i.test(text)) {
      return { id: feature.id, name: feature.name, max: 1, reset: 'shortRest', ...common };
    }
    return null;
  }

  function linkActionToResource(action, resources, features) {
    const resourceId = findResourceIdForAction(action, resources, features);
    const resource = resourceId ? resources.find(row => row.id === resourceId) : null;
    return {
      ...action,
      resourceId: resourceId || '',
      resourceName: resource ? resource.name : '',
      resourceCost: resourceId ? 1 : 0,
    };
  }

  function findResourceIdForAction(action, resources, features) {
    if (!action || !resources.length) return '';
    const title = normalize(action.title || action.name || '');
    const feature = action.sourceId ? features.find(row => row.id === action.sourceId) : null;
    const haystack = `${action.title || ''} ${action.detail || action.text || ''} ${(action.tags || []).join(' ')} ${feature ? `${feature.name} ${feature.resourceHint || ''} ${feature.text || ''}` : ''}`;
    const clean = normalize(haystack);

    for (const resource of resources) {
      const resourceName = normalize(resource.name || resource.id);
      const resourceId = normalize(resource.id || '');
      if (title && (title === resourceName || title === resourceId || title.includes(resourceName))) return resource.id;
      if (resourceName && (clean.includes(`spend ${resourceName}`) || clean.includes(`expend ${resourceName}`) || clean.includes(`use your ${resourceName}`))) return resource.id;
    }

    const sourceResources = action.sourceId ? resources.filter(resource => resource.sourceId === action.sourceId) : [];
    if (sourceResources.length === 1) return sourceResources[0].id;

    for (const alias of RESOURCE_ALIASES) {
      if (!alias.match.test(haystack)) continue;
      const resource = resources.find(row => row.id === alias.resourceId);
      if (resource) return resource.id;
    }
    return '';
  }

  function addRulePick(kind) {
    const input = els.addInputs[kind];
    const value = input.value.trim();
    const id = resolvePickId(kind, value);
    if (!id) {
      setStatus(`No ${kind} matched`);
      return;
    }
    if (!addRulePickById(kind, id)) return;
    input.value = '';
    render();
  }

  function addChoiceRulePick(button) {
    const kind = button.dataset.choiceAddKind;
    const groupName = button.dataset.choiceAddGroup || '';
    const group = String(groupName).endsWith(':bonus-feat')
      ? getAsiBonusChoiceGroup(groupName)
      : getChoiceGroupByName(groupName);
    const card = button.closest('[data-choice-card]');
    const picker = card && card.querySelector(`[data-choice-pick-kind="${kind}"]`);
    const id = picker && picker.value;
    if (!kind || !id) {
      setStatus(`Choose a ${kind || 'rule option'} first.`);
      return;
    }
    if (!addRulePickById(kind, id, group)) return;
    picker.value = '';
    render();
  }

  function addRulePickById(kind, id, group = null) {
    if (!canAddRulePick(kind, id, group)) return false;
    if (group && group.group) {
      const count = Number(group.count) || 1;
      const current = getFeatureChoiceValues(group)
        .map(value => indexes[`${kind}sById`] && indexes[`${kind}sById`].has(value) ? value : resolvePickId(kind, value))
        .filter(Boolean);
      const next = count === 1 ? [id] : uniqueText([...current, id]).slice(0, count);
      state.featureChoices[group.group] = next;
    }
    const listName = `${kind}Ids`;
    if (!state[listName].includes(id)) state[listName].push(id);
    return true;
  }

  function removeRulePick(kind, id, groupName = '') {
    if (groupName && state.featureChoices && Object.prototype.hasOwnProperty.call(state.featureChoices, groupName)) {
      const next = getFeatureChoiceValues(groupName).filter(value => {
        const resolved = indexes[`${kind}sById`] && indexes[`${kind}sById`].has(value) ? value : resolvePickId(kind, value);
        return resolved !== id;
      });
      if (next.length) state.featureChoices[groupName] = next;
      else if (String(groupName).endsWith(':bonus-feat')) state.featureChoices[groupName] = ['enabled'];
      else delete state.featureChoices[groupName];
    }
    const listName = `${kind}Ids`;
    if (!isRulePickUsedByFeatureChoices(kind, id)) {
      state[listName] = state[listName].filter(value => value !== id);
    }
    if (kind === 'feat' && !state[listName].includes(id)) clearFeatChoiceValues(id);
    render();
  }

  function clearFeatChoiceValues(featId) {
    if (!featId || !state.featureChoices || typeof state.featureChoices !== 'object') return false;
    let changed = false;
    const prefix = `${featId}:`;
    Object.keys(state.featureChoices).forEach(key => {
      if (key !== featId && !key.startsWith(prefix)) return;
      delete state.featureChoices[key];
      changed = true;
    });
    return changed;
  }

  function clearChoiceRulePicks(kind, groupName) {
    if (!groupName || !state.featureChoices) return false;
    const group = String(groupName).endsWith(':bonus-feat')
      ? getAsiBonusChoiceGroup(groupName)
      : getChoiceGroupByName(groupName) || { group: groupName, count: 1, input: kind };
    const ids = getChoiceRuleSelectedIds(kind, group);
    const stored = findFeatureChoiceStoredKey(groupName);
    let changed = false;
    if (stored) {
      delete state.featureChoices[stored];
      changed = true;
    }
    const listName = `${kind}Ids`;
    if (Array.isArray(state[listName])) {
      ids.forEach(id => {
        if (isRulePickUsedByFeatureChoices(kind, id)) return;
        const before = state[listName].length;
        state[listName] = state[listName].filter(value => value !== id);
        if (state[listName].length !== before) changed = true;
      });
    }
    return changed;
  }

  function getChoiceGroupByName(groupName) {
    const key = normalize(groupName);
    return (activeChoiceGroups || []).find(group => normalize(group.group) === key) || null;
  }

  function isRulePickUsedByFeatureChoices(kind, id) {
    if (!state.featureChoices) return false;
    return Object.values(state.featureChoices).some(value => getFeatureChoiceValuesFromValue(value).some(choice => {
      const resolved = indexes[`${kind}sById`] && indexes[`${kind}sById`].has(choice) ? choice : resolvePickId(kind, choice);
      return resolved === id;
    }));
  }

  function resolvePickId(kind, value) {
    const index = indexes[`labelTo${capitalize(kind)}Id`];
    const byLabel = index && index.get(value);
    if (byLabel) return byLabel;
    const rows = data[`${kind}s`] || [];
    const exact = rows.find(row => row.id === value || normalize(row.name) === normalize(value));
    return exact ? exact.id : '';
  }

  function canAddRulePick(kind, id, group = null) {
    if (kind === 'feat') {
      const slots = getFeatSlots();
      const selectedForGroup = group ? getChoiceRuleSelectedIds(kind, group) : [];
      const groupLimit = group ? Number(group.count) || 1 : slots;
      if (group && selectedForGroup.length >= groupLimit && !selectedForGroup.includes(id)) {
        setStatus(`This rule can choose only ${groupLimit} feat${groupLimit === 1 ? '' : 's'}.`);
        return false;
      }
      if (state.featIds.includes(id)) return true;
      if (state.featIds.length >= slots) {
        setStatus(`No feat slot is available at level ${state.level}.`);
        return false;
      }
    }
    if (kind === 'spell') {
      const spell = indexes.spellsById.get(id);
      const cls = getCurrentClass();
      const maxLevel = getMaxSpellLevel();
      if (!cls || !cls.spellcastingAbility || !spell || Number(spell.level || 0) > maxLevel) {
        setStatus(`That spell is above the current spell level cap (${maxLevel}).`);
        return false;
      }
    }
    return true;
  }

  function getAvailableSubclassesForClass(classId, level) {
    if (ruleset) return ruleset.getAvailableSubclassesForClass(classId, level);
    const cls = indexes.classesById.get(classId);
    if (!cls) return [];
    if (Number(level || 1) < getSubclassUnlockLevel(classId)) return [];
    return sortByName(data.subclasses.filter(subclass => normalize(subclass.className) === normalize(cls.name)));
  }

  function getSubclassUnlockLevel(classId) {
    if (ruleset) return ruleset.getSubclassUnlockLevel(classId);
    const cls = indexes.classesById.get(classId);
    if (!cls || !Array.isArray(cls.classFeatures)) return 3;
    const levels = cls.classFeatures
      .filter(feature => feature && typeof feature === 'object' && feature.gainSubclassFeature)
      .map(feature => Number(String(feature.classFeature || '').split('|').pop()) || 0)
      .filter(Boolean);
    return levels.length ? Math.min(...levels) : 3;
  }

  function enforceLevelGates() {
    state.level = clamp(Number(state.level) || 1, 1, 20);
    const availableSubclasses = getAvailableSubclassesForClass(state.classId, state.level);
    if (state.subclassId && !availableSubclasses.some(subclass => subclass.id === state.subclassId)) {
      state.subclassId = '';
    }
    updateAutomaticHitPoints();

    const featSlots = getFeatSlots();
    if (state.featIds.length > featSlots) {
      state.featIds = state.featIds.slice(0, featSlots);
      setStatus(`Feat choices trimmed to ${featSlots} slot(s) for level ${state.level}.`);
    }

    const maxSpellLevel = getMaxSpellLevel();
    state.spellIds = state.spellIds.filter(id => {
      const spell = indexes.spellsById.get(id);
      return spell && Number(spell.level || 0) <= maxSpellLevel;
    });
  }

  function getFeatSlots() {
    return getRaceOriginFeatCount() + getExplicitAsiBonusFeatSlotCount();
  }

  function getExplicitAsiBonusFeatSlotCount() {
    if (!state.featureChoices || typeof state.featureChoices !== 'object') return 0;
    const enabledGroups = new Set();
    Object.keys(state.featureChoices).forEach(key => {
      if (!isAsiBonusFeatEnabled(key)) return;
      const allocationGroup = getAsiAllocationGroupFromBonusKey(key);
      if (allocationGroup) enabledGroups.add(normalize(allocationGroup));
    });
    return enabledGroups.size;
  }

  function isAsiBonusFeatEnabled(groupName) {
    const key = String(groupName || '');
    if (!key.endsWith(':bonus-feat')) return false;
    const allocationGroup = getAsiAllocationGroupFromBonusKey(key);
    const featureId = getAsiFeatureIdFromAllocationGroup(allocationGroup);
    if (!featureId || !isActiveAbilityScoreImprovementFeature(featureId)) return false;
    const values = getFeatureChoiceValues(key);
    return values.includes('enabled') || values.some(value => Boolean(resolvePickId('feat', value)));
  }

  function updateAutomaticHitPoints() {
    if (!isAutoHpMode()) return;
    const maxHp = calculateAverageHitPoints();
    state.maxHp = maxHp;
    state.currentHp = maxHp;
  }

  function calculateAverageHitPoints() {
    const cls = getCurrentClass();
    const hitDie = getHitDieValue(cls);
    if (!hitDie) return null;
    const level = clamp(Number(state.level) || 1, 1, 20);
    const conMod = calculateModifier(Number(getCurrentAbilities().con) || 10);
    const firstLevel = Math.max(1, hitDie + conMod);
    if (level <= 1) return firstLevel;
    const laterLevelGain = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
    return firstLevel + ((level - 1) * laterLevelGain);
  }

  function getHitDieValue(cls) {
    const match = String(cls && (cls.hitDie || cls.hitDice || '') || '').match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function isAutoHpMode() {
    return (state.hpMode || 'auto-average') === 'auto-average';
  }

  function getHitPointSummary() {
    const maxHp = normalizeHpInput(state.maxHp);
    if (maxHp === null) return '';
    const currentHp = normalizeHpInput(state.currentHp);
    const mode = isAutoHpMode() ? 'avg' : 'manual';
    return `${currentHp === null ? maxHp : currentHp}/${maxHp} HP (${mode})`;
  }

  function getMaxSpellLevel() {
    if (ruleset) return ruleset.getMaxSpellLevel({
      level: state.level,
      classId: state.classId,
      subclassId: state.subclassId,
      classLevels: state.classId ? [{ classId: state.classId, subclassId: state.subclassId, level: state.level }] : [],
      spellIds: state.spellIds,
      abilities: getCurrentAbilities(),
    });
    const cls = getCurrentClass();
    if (!cls || !cls.spellcastingAbility) return 0;
    const progression = cls.casterProgression || 'full';
    const level = Number(state.level || 1);
    if (progression === 'pact') return level < 3 ? 1 : level < 5 ? 2 : level < 7 ? 3 : level < 9 ? 4 : 5;
    if (progression === 'half') return FULL_CASTER_MAX_SPELL_LEVEL[Math.floor(level / 2)] || 0;
    if (progression === 'third') return FULL_CASTER_MAX_SPELL_LEVEL[Math.floor(level / 3)] || 0;
    return FULL_CASTER_MAX_SPELL_LEVEL[level] || 0;
  }

  function getRaceOriginFeatCount() {
    const race = indexes.racesById.get(state.raceId);
    if (!race) return 0;
    const accepted = new Set([race.id, race.parentRaceId].filter(Boolean));
    return data.features.filter(feature => {
      if (feature.kind !== 'race' || !accepted.has(feature.raceId)) return false;
      if (Number(feature.level || 1) > Number(state.level || 1)) return false;
      const name = normalize(feature.name);
      const text = normalize(feature.text);
      return name === 'feat' || text.includes('gain one feat');
    }).length;
  }

  function getCurrentClass() {
    return indexes.classesById.get(state.classId) || null;
  }

  function findByName(rows, name) {
    const target = normalize(name);
    return (rows || []).find(row => [row.name, row.id, row.shortName, ...(row.aliases || [])].some(value => normalize(value) === target)) || null;
  }

  function fillSelect(select, rows, placeholder) {
    const current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(placeholder || 'Choose')}</option>${rows.map(row => `<option value="${escapeAttr(row.value)}">${escapeHtml(row.label)}</option>`).join('')}`;
    select.value = rows.some(row => row.value === current) ? current : '';
  }

  function fillDatalist(list, rows) {
    if (!list) return;
    list.innerHTML = sortRules(rows).map(row => `<option value="${escapeAttr(sourceLabel(row))}"></option>`).join('');
  }

  function labelIndex(rows) {
    const out = new Map();
    for (const row of rows || []) {
      out.set(sourceLabel(row), row.id);
      out.set(row.name, row.id);
      out.set(row.id, row.id);
    }
    return out;
  }

  function sourceLabel(row) {
    if (!row) return '';
    const source = row.source ? ` ${row.source}` : '';
    return `${row.name}${source} [${row.id}]`;
  }

  function makeDefaultState() {
    return {
      characterId: '',
      name: '',
      level: 1,
      classId: '',
      subclassId: '',
      raceId: '',
      backgroundId: '',
      experience: 0,
      gold: 0,
      heroPoints: 0,
      guildRank: '',
      guildPoints: 0,
      featIds: [],
      itemIds: [],
      spellIds: [],
      optionalFeatureIds: [],
      selectedFeatureIds: [],
      featureChoices: {},
      levelChoices: {},
      abilityMethod: 'manual',
      hpMode: 'auto-average',
      maxHp: null,
      currentHp: null,
      abilities: {},
      classLevels: [],
      proficiencies: {},
    };
  }

  function getDraftKey() {
    const sheetId = root && root.dataset.builderCharacterId;
    return getDraftKeyForId(isSheetMode() && sheetId ? sheetId : state.characterId || slugify(state.name || 'draft'));
  }

  function getDraftKeyForId(id) {
    return `${BUILDER_STORAGE_PREFIX}.${id || 'draft'}`;
  }

  function isSheetMode() {
    return root && root.dataset.builderMode === 'sheet';
  }

  function getNextAllowedLevel() {
    return clamp(Number(state.level || 1) + 1, 1, 20);
  }

  function byId(rows) {
    return new Map((rows || []).filter(row => row && row.id).map(row => [row.id, row]));
  }

  function sortByName(rows) {
    return (rows || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  function sortRules(rows) {
    return (rows || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)) || sourcePriority(a.source) - sourcePriority(b.source));
  }

  function sourcePriority(source) {
    const order = ['PHB', 'DMG', 'XGE', 'TCE', 'VGM', 'EEPC', 'SCAG', 'MPMM'];
    const index = order.indexOf(String(source || '').toUpperCase());
    return index === -1 ? order.length : index;
  }

  function normalizeIds(values) {
    const raw = Array.isArray(values)
      ? values
      : values && typeof values === 'object'
        ? Object.values(values).flat()
        : [values];
    return [...new Set(raw.map(value => String(value || '').trim()).filter(Boolean))];
  }

  function normalizeHpInput(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return clamp(Math.floor(number), 0, 999);
  }

  function normalizeNumberInput(value, min = 0, max = 999999) {
    if (value === null || value === undefined || value === '') return min;
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return clamp(Math.floor(number), min, max);
  }

  function compactObject(object) {
    const out = {};
    for (const [key, value] of Object.entries(object)) {
      if (Array.isArray(value) && !value.length) continue;
      if (value && typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) continue;
      if (value === '' || value === null || value === undefined) continue;
      out[key] = value;
    }
    return out;
  }

  function uniqueBy(rows, keyFn) {
    const seen = new Set();
    const out = [];
    for (const row of rows || []) {
      const key = keyFn(row);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }

  function uniqueText(values) {
    const seen = new Set();
    const out = [];
    (values || []).forEach(value => {
      const clean = String(value || '').trim();
      const key = normalize(clean);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(clean);
    });
    return out;
  }

  function toggleListValue(list, value, enabled) {
    const index = list.indexOf(value);
    if (enabled && index === -1) list.push(value);
    if (!enabled && index !== -1) list.splice(index, 1);
  }

  function isOptionalFeature(feature) {
    return OPTIONAL_FEATURE_NAMES.has(normalize(feature.name)) || /^optional\b/i.test(feature.name || '');
  }

  function first(values) {
    return Array.isArray(values) ? values[0] : values;
  }

  function firstChoice(...values) {
    for (const value of values) {
      if (Array.isArray(value) && value.length) return value;
      if (value && !Array.isArray(value)) return value;
    }
    return '';
  }

  function firstWords(value, count) {
    return cleanText(value).split(/\s+/).filter(Boolean).slice(0, count).join(' ');
  }

  function cleanText(value) {
    return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
  }

  function slugify(value) {
    return normalize(value).replace(/\s+/g, '-');
  }

  function capitalize(value) {
    return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
  }

  function titleCase(value) {
    return String(value || '').replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setStatus(message) {
    if (els.status) els.status.textContent = message;
  }

  function showTransientStatus(message) {
    if (!els.statusToast) return;
    els.statusToast.textContent = message;
    els.statusToast.hidden = false;
    if (statusToastTimer) window.clearTimeout(statusToastTimer);
    statusToastTimer = window.setTimeout(() => {
      els.statusToast.hidden = true;
      statusToastTimer = null;
    }, 3200);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value || ''));
    return String(value || '').replace(/["\\]/g, '\\$&');
  }
})();
