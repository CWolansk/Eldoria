(() => {
  const ABILITY_NAMES = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  };
  const SKILLS = [
    ['acrobatics', 'dex'],
    ['animalHandling', 'wis'],
    ['arcana', 'int'],
    ['athletics', 'str'],
    ['deception', 'cha'],
    ['history', 'int'],
    ['insight', 'wis'],
    ['intimidation', 'cha'],
    ['investigation', 'int'],
    ['medicine', 'wis'],
    ['nature', 'int'],
    ['perception', 'wis'],
    ['performance', 'cha'],
    ['persuasion', 'cha'],
    ['religion', 'int'],
    ['sleightOfHand', 'dex'],
    ['stealth', 'dex'],
    ['survival', 'wis'],
  ];
  const WEAPON_BASES = [
    { key: 'corpse slayer flamberge bastard sword', baseName: 'Bastard Sword', type: 'martial', style: 'melee', ability: 'str', damage: '1d10', damageType: 'slashing', properties: ['versatile'] },
    { key: 'bastard sword', baseName: 'Bastard Sword', type: 'martial', style: 'melee', ability: 'str', damage: '1d10', damageType: 'slashing', properties: ['versatile'] },
    { key: 'greatsword', baseName: 'Greatsword', type: 'martial', style: 'melee', ability: 'str', damage: '2d6', damageType: 'slashing', properties: ['heavy', 'two-handed'] },
    { key: 'longsword', baseName: 'Longsword', type: 'martial', style: 'melee', ability: 'str', damage: '1d8', damageType: 'slashing', properties: ['versatile (1d10)'] },
    { key: 'shortsword', baseName: 'Shortsword', type: 'martial', style: 'melee', ability: 'finesse', damage: '1d6', damageType: 'piercing', properties: ['finesse', 'light'] },
    { key: 'scimitar', baseName: 'Scimitar', type: 'martial', style: 'melee', ability: 'finesse', damage: '1d6', damageType: 'slashing', properties: ['finesse', 'light'] },
    { key: 'greataxe', baseName: 'Greataxe', type: 'martial', style: 'melee', ability: 'str', damage: '1d12', damageType: 'slashing', properties: ['heavy', 'two-handed'] },
    { key: 'warhammer', baseName: 'Warhammer', type: 'martial', style: 'melee', ability: 'str', damage: '1d8', damageType: 'bludgeoning', properties: ['versatile (1d10)'] },
    { key: 'handaxe', baseName: 'Handaxe', type: 'simple', style: 'melee', ability: 'str', damage: '1d6', damageType: 'slashing', properties: ['light', 'thrown (20/60)'] },
    { key: 'quarterstaff', baseName: 'Quarterstaff', type: 'simple', style: 'melee', ability: 'str', damage: '1d6', damageType: 'bludgeoning', properties: ['versatile (1d8)'] },
    { key: 'dagger', baseName: 'Dagger', type: 'simple', style: 'melee', ability: 'finesse', damage: '1d4', damageType: 'piercing', properties: ['finesse', 'light', 'thrown (20/60)'] },
    { key: 'longbow', baseName: 'Longbow', type: 'martial', style: 'ranged', ability: 'dex', damage: '1d8', damageType: 'piercing', properties: ['ammunition', 'heavy', 'two-handed'] },
    { key: 'light crossbow', baseName: 'Light Crossbow', type: 'simple', style: 'ranged', ability: 'dex', damage: '1d8', damageType: 'piercing', properties: ['ammunition', 'loading', 'two-handed'] },
    { key: 'repeating crossbow', baseName: 'Repeating Crossbow', type: 'simple', style: 'ranged', ability: 'dex', damage: '1d8', damageType: 'piercing', properties: ['ammunition'] },
    { key: 'crossbow', baseName: 'Crossbow', type: 'simple', style: 'ranged', ability: 'dex', damage: '1d8', damageType: 'piercing', properties: ['ammunition', 'loading'] },
    { key: 'blowgun', baseName: 'Blowgun', type: 'martial', style: 'ranged', ability: 'dex', damage: '1', damageType: 'piercing', properties: ['ammunition', 'loading'] },
    { key: 'armblade', baseName: 'Armblade', type: 'martial', style: 'melee', ability: 'str', damage: '1d8', damageType: 'slashing', properties: ['custom'] },
    { key: 'sword', baseName: 'Sword', type: 'martial', style: 'melee', ability: 'str', damage: '1d8', damageType: 'slashing', properties: ['custom'] },
    { key: 'staff', baseName: 'Staff', type: 'simple', style: 'melee', ability: 'str', damage: '1d6', damageType: 'bludgeoning', properties: ['versatile (1d8)'] },
  ];
  const EQUIPMENT_HINTS = [
    { key: 'shield', kind: 'shield' },
    { key: 'armor', kind: 'armor' },
    { key: 'chain mail', kind: 'armor' },
    { key: 'leather armor', kind: 'armor' },
    { key: 'ring of protection', kind: 'wondrous' },
  ];
  const ARMOR_BASES = [
    { key: 'studded leather armor', base: 12, dexMode: 'full' },
    { key: 'studded leather', base: 12, dexMode: 'full' },
    { key: 'leather armor', base: 11, dexMode: 'full' },
    { key: 'leather', base: 11, dexMode: 'full' },
    { key: 'padded armor', base: 11, dexMode: 'full' },
    { key: 'padded', base: 11, dexMode: 'full' },
    { key: 'half plate armor', base: 15, dexMode: 'max', dexMax: 2 },
    { key: 'half plate', base: 15, dexMode: 'max', dexMax: 2 },
    { key: 'breastplate armor', base: 14, dexMode: 'max', dexMax: 2 },
    { key: 'breastplate', base: 14, dexMode: 'max', dexMax: 2 },
    { key: 'scale mail', base: 14, dexMode: 'max', dexMax: 2 },
    { key: 'chain shirt', base: 13, dexMode: 'max', dexMax: 2 },
    { key: 'hide armor', base: 12, dexMode: 'max', dexMax: 2 },
    { key: 'hide', base: 12, dexMode: 'max', dexMax: 2 },
    { key: 'plate armor', base: 18, dexMode: 'none' },
    { key: 'plate', base: 18, dexMode: 'none' },
    { key: 'splint armor', base: 17, dexMode: 'none' },
    { key: 'splint mail', base: 17, dexMode: 'none' },
    { key: 'splint', base: 17, dexMode: 'none' },
    { key: 'chain mail', base: 16, dexMode: 'none' },
    { key: 'ring mail', base: 14, dexMode: 'none' },
  ];
  const TEMPORARY_EFFECT_DEFINITIONS = [
    { id: 'haste', label: 'Haste', detail: '+2 AC, speed doubled, extra action while active.', acBonus: 2, speedMultiplier: 2 },
    { id: 'mageArmor', label: 'Mage Armor', detail: 'Base AC becomes 13 + Dexterity while not wearing armor.', mageArmor: true },
    { id: 'shieldOfFaith', label: 'Shield of Faith', detail: '+2 AC while concentration is maintained.', acBonus: 2 },
    { id: 'barkskin', label: 'Barkskin', detail: 'AC cannot be less than 16 while the spell lasts.', acFloor: 16 },
    { id: 'shieldSpell', label: 'Shield Spell', detail: '+5 AC until the start of your next turn.', acBonus: 5 },
    { id: 'halfCover', label: 'Half Cover', detail: '+2 AC and Dexterity saving throws.', acBonus: 2 },
    { id: 'threeQuartersCover', label: 'Three-quarters Cover', detail: '+5 AC and Dexterity saving throws.', acBonus: 5 },
  ];
  const CUSTOM_ITEM_DETAILS = [
    customItem('bracer of piercing arrows', 'Bracer of Piercing Arrows', 'Custom wondrous item', [
      'Custom E-rank reward. Exact arrow-piercing mechanics are not recorded in the public item catalog yet.',
    ]),
    customItem('prospecting compass', 'Prospecting Compass', 'Custom wondrous item', [
      'Custom utility item. Exact prospecting rules are not recorded in the public item catalog yet.',
    ]),
    customItem('lightning rod', 'Lightning Rod', 'Custom wondrous item', [
      'Custom item. Exact lightning rules are not recorded in the public item catalog yet.',
    ]),
    customItem('amulet of divine retribution', 'Amulet of Divine Retribution', 'Custom wondrous item', [
      'Custom E-rank reward. Exact divine retribution mechanics are not recorded in the public item catalog yet.',
    ]),
    customItem('gauntlets of whirling strikes', 'Gauntlets of Whirling Strikes', 'Custom wondrous item', [
      'Custom E-rank reward. Exact extra strike mechanics are not recorded in the public item catalog yet.',
    ]),
    customItem('fabulist gem', 'Fabulist Gem', 'Custom wondrous item', [
      'Custom item. Exact fabulist gem rules are not recorded in the public item catalog yet.',
    ]),
    customItem('commoners veneer', 'Commoners Veneer', 'Custom wondrous item', [
      'Custom item. Exact disguise or social rules are not recorded in the public item catalog yet.',
    ]),
    customItem('sigil of thunderous might', 'Sigil of Thunderous Might', 'Custom wondrous item', [
      'Custom E-rank reward. Exact thunderous might mechanics are not recorded in the public item catalog yet.',
    ]),
    customItem('talisman of elemental fury', 'Talisman of Elemental Fury', 'Custom wondrous item', [
      'Custom item. Exact elemental fury mechanics are not recorded in the public item catalog yet.',
    ]),
    customItem('the aegis codex', 'The Aegis Codex', 'Custom wondrous item', [
      'Custom item. Exact aegis codex rules are not recorded in the public item catalog yet.',
    ]),
  ];

  function initTabs(root) {
    const buttons = Array.from(root.querySelectorAll('[data-tab-target]'));
    const panels = Array.from(root.querySelectorAll('[data-tab-panel]'));
    if (!buttons.length || !panels.length) return;

    function activate(id) {
      buttons.forEach(button => {
        const active = button.dataset.tabTarget === id;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(panel => panel.classList.toggle('active', panel.dataset.tabPanel === id));
    }

    buttons.forEach(button => {
      button.addEventListener('click', () => activate(button.dataset.tabTarget));
    });
  }

  async function initSearch(root) {
    const input = root.querySelector('.public-search-input');
    const results = root.querySelector('.search-results');
    if (!input || !results) return;

    let localIndexPromise = null;
    let requestId = 0;

    async function getLocalIndex() {
      if (!localIndexPromise) {
        localIndexPromise = fetch('./data/search-index.json').then(response => response.json());
      }
      return localIndexPromise;
    }

    async function render(query) {
      const currentRequest = ++requestId;
      try {
        const matches = await searchDocuments(query, getLocalIndex);
        if (currentRequest === requestId) renderSearchResults(results, matches);
      } catch (error) {
        if (currentRequest === requestId) {
          results.innerHTML = '<p class="empty-note">Search index could not be loaded.</p>';
        }
      }
    }

    input.addEventListener('input', debounce(() => render(input.value), 180));
    render('');
  }

  async function searchDocuments(query, getLocalIndex) {
    const clean = query.trim();
    const apiBase = getApiBaseUrl();

    if (apiBase) {
      try {
        const data = await fetchApi('search', { q: clean, limit: clean ? 40 : 30 });
        return Array.isArray(data.results) ? data.results : [];
      } catch (error) {
        // Static JSON keeps GitHub Pages useful if Azure is offline or not configured yet.
      }
    }

    const index = await getLocalIndex();
    const normalized = clean.toLowerCase();
    if (!normalized) return index.slice(0, 30);
    return index
      .map(item => ({ item, score: scoreLocalSearch(item, normalized) }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 40)
      .map(match => match.item);
  }

  function renderSearchResults(results, matches) {
    if (!matches.length) {
      results.innerHTML = '<p class="empty-note">No public notes match that search.</p>';
      return;
    }

    results.innerHTML = matches.map(item => {
      const title = item.title || item.name || 'Untitled';
      const href = item.url ? `./${encodeURI(item.url)}` : './search.html';
      return `
        <a class="result-card" href="${escapeAttr(href)}">
          <span>${escapeHtml(item.type || 'Page')}${item.region ? ` / ${escapeHtml(item.region)}` : ''}</span>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(item.summary || '')}</p>
        </a>
      `;
    }).join('');
  }

  function scoreLocalSearch(item, query) {
    const haystack = `${item.title} ${item.type} ${item.region} ${item.location} ${item.summary} ${item.text}`.toLowerCase();
    const title = String(item.title || '').toLowerCase();
    if (title === query) return 100;
    if (title.startsWith(query)) return 80;
    if (title.includes(query)) return 60;
    if (haystack.includes(query)) return 30;

    let cursor = 0;
    for (const char of haystack) {
      if (char === query[cursor]) cursor++;
      if (cursor === query.length) return 10;
    }
    return 0;
  }

  async function initPlayerSheet(root) {
    const id = root.dataset.playerId;
    if (!id) return;

    let player = getBootstrapPlayer(root);

    if (getApiBaseUrl()) {
      try {
        player = await fetchApi(`players/${encodeURIComponent(id)}`);
      } catch (error) {
        root.dataset.apiState = 'fallback';
      }
    }

    if (player) hydratePlayerSheet(root, player);
  }

  function hydratePlayerSheet(root, player) {
    if (!player || !player.name) return;
    root.dataset.apiState = 'loaded';
    const localEdits = loadPlayerEdits(player.id || root.dataset.playerId);
    const hydrated = preparePlayer({
      ...player,
      ...localEdits,
      itemCatalog: root._itemCatalog,
      abilities: { ...(player.abilities || {}), ...((localEdits && localEdits.abilities) || {}) },
      spellDetails: { ...(player.spellDetails || {}), ...((localEdits && localEdits.spellDetails) || {}) },
    });
    root._playerState = hydrated;

    setText(root, '[data-player-field="name"]', hydrated.name);
    setText(root, '[data-player-summary]', [hydrated.race, formatClassSummary(hydrated), `Level ${hydrated.level}`].filter(Boolean).join(' / '));

    setText(root, '[data-player-stat="ac"]', hydrated.ac);
    setText(root, '[data-player-stat="initiative"]', formatBonus(hydrated.initiative));
    setText(root, '[data-player-stat="proficiencyBonus"]', formatBonus(hydrated.proficiencyBonus));
    setText(root, '[data-player-stat="speed"]', hydrated.speed ? `${hydrated.speed} ft` : '-');

    root.querySelectorAll('[data-player-field]').forEach(node => {
      const field = node.dataset.playerField;
      const value = fieldValue(hydrated, field);
      if (value !== undefined) node.textContent = value;
    });

    root.querySelectorAll('[data-player-ability]').forEach(card => {
      const ability = card.dataset.playerAbility;
      const score = Number(hydrated.abilities && hydrated.abilities[ability]);
      if (!Number.isFinite(score)) return;
      const label = card.querySelector('span');
      const strong = card.querySelector('strong');
      const mod = card.querySelector('em');
      if (label) label.textContent = ABILITY_NAMES[ability] || ability.toUpperCase();
      if (strong) strong.textContent = score;
      if (mod) mod.textContent = formatBonus(calculateModifier(score));
    });

    hydrateSaves(root, hydrated);
    hydrateSkills(root, hydrated);
    hydrateLists(root, hydrated);
    renderEquippedSummary(root, hydrated);
    renderTemporaryEffectsPanel(root, hydrated);
    renderArmorClassPanel(root, hydrated);
    renderWeaponAttacks(root, hydrated);
    renderActionsPanel(root, hydrated);
    renderResourcesPanel(root, hydrated);
    renderEquipmentPanel(root, hydrated);
    renderSpellPanel(root, hydrated);
    renderEditForm(root, hydrated);
    renderNotesForm(root, hydrated);
    bindPlayerSheetEvents(root);
  }

  function hydrateSaves(root, player) {
    const prof = Number(player.proficiencyBonus) || 0;
    const saves = new Set((player.saves || []).map(String));
    root.querySelectorAll('[data-player-save]').forEach(row => {
      const ability = row.dataset.playerSave;
      const score = Number(player.abilities && player.abilities[ability]);
      if (!Number.isFinite(score)) return;
      const proficient = saves.has(ability);
      row.classList.toggle('proficient', proficient);
      const value = row.querySelector('strong');
      if (value) value.textContent = formatBonus(calculateModifier(score) + (proficient ? prof : 0));
    });
  }

  function hydrateSkills(root, player) {
    const prof = Number(player.proficiencyBonus) || 0;
    const skills = new Set((player.skills || []).map(String));
    const abilityBySkill = Object.fromEntries(SKILLS);
    root.querySelectorAll('[data-player-skill]').forEach(row => {
      const skill = row.dataset.playerSkill;
      const ability = row.dataset.ability || abilityBySkill[skill];
      const score = Number(player.abilities && player.abilities[ability]);
      if (!Number.isFinite(score)) return;
      const proficient = skills.has(skill);
      row.classList.toggle('proficient', proficient);
      const value = row.querySelector('strong');
      if (value) value.textContent = formatBonus(calculateModifier(score) + (proficient ? prof : 0));
    });
  }

  function getSkillBonus(player, skill) {
    const abilityBySkill = Object.fromEntries(SKILLS);
    const ability = abilityBySkill[skill];
    const score = Number(player.abilities && player.abilities[ability]);
    const proficient = new Set((player.skills || []).map(String)).has(skill);
    return calculateModifier(Number.isFinite(score) ? score : 10) + (proficient ? Number(player.proficiencyBonus) || 0 : 0);
  }

  function hydrateLists(root, player) {
    root.querySelectorAll('[data-player-list]').forEach(list => {
      const field = list.dataset.playerList;
      const items = Array.isArray(player[field]) ? player[field] : [];
      const empty = list.dataset.empty || 'Nothing recorded.';
      list.innerHTML = items.length
        ? items.map(item => `<span>${escapeHtml(item)}</span>`).join('')
        : `<span>${escapeHtml(empty)}</span>`;
    });
  }

  function getBootstrapPlayer(root) {
    const script = root.ownerDocument.querySelector('script[data-player-bootstrap]');
    if (!script) return null;
    try {
      return JSON.parse(script.textContent || '{}');
    } catch (error) {
      return null;
    }
  }

  function preparePlayer(player) {
    const abilities = Object.fromEntries(Object.keys(ABILITY_NAMES).map(ability => [ability, Number(player.abilities && player.abilities[ability]) || 10]));
    const providedScrolls = Array.isArray(player.spellScrolls) ? player.spellScrolls.map(normalizeSpellScroll).filter(Boolean) : [];
    const baseAc = getBaseSheetValue(player.ac, player.baseAc, player.acProfile && player.acProfile.total, 10);
    const baseSpeed = getBaseSheetValue(player.speed, player.baseSpeed, player.speedProfile && player.speedProfile.total, 30);
    const prepared = {
      ...player,
      abilities,
      subclass: cleanDetailValue(player.subclass),
      subclassShortName: cleanDetailValue(player.subclassShortName),
      equipment: Array.isArray(player.equipment) ? player.equipment.filter(Boolean).map(String) : [],
      equipped: Array.isArray(player.equipped) ? player.equipped.map(String) : [],
      combatToggles: player.combatToggles && typeof player.combatToggles === 'object' ? player.combatToggles : {},
      spells: Array.isArray(player.spells) ? player.spells.filter(Boolean).map(String) : [],
      itemDetails: player.itemDetails && typeof player.itemDetails === 'object' ? player.itemDetails : {},
      spellDetails: player.spellDetails && typeof player.spellDetails === 'object' ? player.spellDetails : {},
      ruleActions: Array.isArray(player.ruleActions) ? player.ruleActions : [],
      ruleEffects: Array.isArray(player.ruleEffects) ? player.ruleEffects : [],
      resources: Array.isArray(player.resources) ? player.resources : [],
      resourceUses: player.resourceUses && typeof player.resourceUses === 'object' ? player.resourceUses : {},
      spellSlots: player.spellSlots && typeof player.spellSlots === 'object' ? player.spellSlots : {},
      spellSlotUses: player.spellSlotUses && typeof player.spellSlotUses === 'object' ? player.spellSlotUses : {},
      itemCharges: player.itemCharges && typeof player.itemCharges === 'object' ? player.itemCharges : {},
      actionUses: player.actionUses && typeof player.actionUses === 'object' ? player.actionUses : {},
      acMode: cleanDetailValue(player.acMode) === 'official' ? 'official' : 'custom',
      temporaryEffects: normalizeTemporaryEffects(player.temporaryEffects),
      conditions: Array.isArray(player.conditions) ? player.conditions.map(String).filter(Boolean) : [],
      concentration: cleanDetailValue(player.concentration),
      tempHp: Number(player.tempHp) || 0,
      gold: Number(player.gold) || 0,
      heroPoints: Number(player.heroPoints) || 0,
      notes: String(player.notes || ''),
      proficiencyBonus: Number(player.proficiencyBonus) || calculateProficiencyBonus(Number(player.level) || 1),
      baseAc,
      ac: baseAc,
      baseSpeed,
      speed: baseSpeed,
      currentHp: player.currentHp === null || player.currentHp === undefined ? null : Number(player.currentHp),
      maxHp: player.maxHp === null || player.maxHp === undefined ? null : Number(player.maxHp),
    };
    prepared.spellScrolls = buildCurrentSpellScrolls(prepared.equipment, providedScrolls);
    prepared.inventory = buildInventory(prepared);
    if (!prepared.equipped.length) prepared.equipped = inferDefaultEquipped(prepared.inventory);
    prepared.equippedNames = getEquippedItems(prepared).map(item => normalizeName(item.name));
    prepared.inventory = buildInventory(prepared);
    prepared.weapons = prepared.inventory.filter(item => item.weapon);
    prepared.acProfile = buildArmorClassProfile(prepared);
    prepared.ac = prepared.acProfile.total;
    prepared.speedProfile = buildSpeedProfile(prepared);
    prepared.speed = prepared.speedProfile.total;
    return prepared;
  }

  function getBaseSheetValue(currentValue, baseValue, previousTotal, fallback) {
    const current = Number(currentValue);
    const base = Number(baseValue);
    const previous = Number(previousTotal);
    const hasBase = Number.isFinite(base) && base > 0;
    const hasCurrent = Number.isFinite(current) && current > 0;
    if (hasBase && hasCurrent && Number.isFinite(previous) && current === previous) return base;
    if (hasCurrent) return current;
    if (hasBase) return base;
    return fallback;
  }

  function getPositiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function normalizeTemporaryEffects(value) {
    const raw = value && typeof value === 'object' ? value : {};
    const rawEffects = raw.effects && typeof raw.effects === 'object' ? raw.effects : raw;
    const effects = {};
    for (const definition of TEMPORARY_EFFECT_DEFINITIONS) {
      effects[definition.id] = Boolean(rawEffects[definition.id]);
    }
    return {
      effects,
      customName: cleanDetailValue(raw.customName).slice(0, 80),
      customAcBonus: clampNumber(Number(raw.customAcBonus) || 0, -20, 20),
    };
  }

  function buildArmorClassProfile(player) {
    const context = buildArmorClassContext(player);
    const candidates = buildOfficialBaseAcCandidates(player, context);
    const selected = chooseOfficialBaseAcCandidate(candidates);
    const parts = [...selected.parts];
    const warnings = candidates.filter(candidate => candidate.reason).map(candidate => candidate.reason);
    let rulesTotal = selected.total;

    if (context.armorEntries.length > 1) {
      warnings.push(`Multiple armor suits are equipped; official rules use one suit at a time. Using ${selected.itemName || 'the best legal armor formula'}.`);
    }

    if (context.shield) {
      rulesTotal += context.shield.rule.bonus;
      parts.push(...buildShieldAcParts(context.shield));
    }
    if (context.shieldEntries.length > 1) {
      warnings.push('Multiple shields are equipped; official rules let you benefit from only one shield.');
    }

    const passiveParts = getPassiveAcBonusParts(player, context);
    for (const part of passiveParts.applied) {
      rulesTotal += part.value || 0;
      parts.push(part);
    }
    warnings.push(...passiveParts.warnings);

    const staticRulesTotal = rulesTotal;
    const sheetBaseAc = getPositiveNumber(player.baseAc) || getPositiveNumber(player.ac);
    let total = rulesTotal;
    if (player.acMode !== 'official' && sheetBaseAc && sheetBaseAc !== staticRulesTotal) {
      const difference = sheetBaseAc - staticRulesTotal;
      parts.push({ label: 'Sheet AC override (unexplained by official rules data)', value: difference });
      warnings.push(`Official rules currently explain AC ${staticRulesTotal}; the saved sheet AC is ${sheetBaseAc}. Add/equip the missing armor, shield, feature, or item to remove this override.`);
      total = sheetBaseAc;
    }

    const tempParts = getTemporaryAcParts(player, total, context, selected);
    for (const part of tempParts) {
      if (part.floor) {
        if (total < part.floor) {
          part.value = part.floor - total;
          part.display = `minimum ${part.floor}`;
          total = part.floor;
        } else {
          part.value = 0;
          part.display = 'already higher';
        }
      } else {
        total += part.value || 0;
      }
      parts.push(part);
    }

    return {
      total,
      officialTotal: staticRulesTotal,
      mode: player.acMode,
      hasOverride: player.acMode !== 'official' && Boolean(sheetBaseAc && sheetBaseAc !== staticRulesTotal),
      parts,
      warnings: [...new Set(warnings.filter(Boolean))],
      alternatives: candidates
        .filter(candidate => candidate.valid && candidate.id !== selected.id)
        .map(candidate => ({ label: candidate.label, total: candidate.total })),
      activeLabels: getActiveTemporaryEffectLabels(player),
    };
  }

  function buildArmorClassContext(player) {
    const equipped = getEquippedItems(player);
    const parsed = equipped.map(item => ({ item, rule: parseArmorAcRule(item) })).filter(entry => entry.rule);
    const armorEntries = parsed
      .filter(entry => entry.rule.kind === 'armor')
      .sort((a, b) => calculateArmorRuleTotal(b.rule, player) - calculateArmorRuleTotal(a.rule, player));
    const shieldEntries = parsed
      .filter(entry => entry.rule.kind === 'shield')
      .sort((a, b) => b.rule.bonus - a.rule.bonus);
    return {
      equipped,
      armorEntries,
      shieldEntries,
      armor: armorEntries[0] || null,
      shield: shieldEntries[0] || null,
      dexMod: calculateModifier(Number(player.abilities && player.abilities.dex) || 10),
      conMod: calculateModifier(Number(player.abilities && player.abilities.con) || 10),
      wisMod: calculateModifier(Number(player.abilities && player.abilities.wis) || 10),
    };
  }

  function buildOfficialBaseAcCandidates(player, context) {
    const candidates = [];
    const hasArmor = Boolean(context.armor);
    const hasShield = Boolean(context.shield);
    if (hasArmor) {
      for (const entry of context.armorEntries) candidates.push(buildArmorCandidate(entry, context));
      const state = normalizeTemporaryEffects(player && player.temporaryEffects);
      if (state.effects.mageArmor) {
        candidates.push({
          id: 'mage-armor-blocked',
          label: 'Mage Armor',
          total: 0,
          parts: [],
          valid: false,
          reason: 'Mage Armor is not applied while wearing armor.',
        });
      }
    } else {
      candidates.push({
        id: 'core-unarmored',
        label: 'Unarmored',
        total: 10 + context.dexMod,
        parts: [
          { label: 'Unarmored base', display: '10' },
          { label: 'Dexterity modifier', value: context.dexMod },
        ],
        valid: true,
      });

      if (normalizeName(player.class) === 'barbarian') {
        candidates.push({
          id: 'barbarian-unarmored-defense',
          label: 'Barbarian Unarmored Defense',
          total: 10 + context.dexMod + context.conMod,
          parts: [
            { label: 'Barbarian Unarmored Defense', display: '10' },
            { label: 'Dexterity modifier', value: context.dexMod },
            { label: 'Constitution modifier', value: context.conMod },
          ],
          valid: true,
        });
      }

      if (normalizeName(player.class) === 'monk') {
        candidates.push({
          id: 'monk-unarmored-defense',
          label: 'Monk Unarmored Defense',
          total: 10 + context.dexMod + context.wisMod,
          parts: [
            { label: 'Monk Unarmored Defense', display: '10' },
            { label: 'Dexterity modifier', value: context.dexMod },
            { label: 'Wisdom modifier', value: context.wisMod },
          ],
          valid: !hasShield,
          reason: hasShield ? 'Monk Unarmored Defense is not applied while wielding a shield.' : '',
        });
      }

      if (hasDraconicResilience(player)) {
        candidates.push({
          id: 'draconic-resilience',
          label: 'Draconic Resilience',
          total: 13 + context.dexMod,
          parts: [
            { label: 'Draconic Resilience', display: '13' },
            { label: 'Dexterity modifier', value: context.dexMod },
          ],
          valid: true,
        });
      }

      const naturalArmor = getNaturalArmorCandidate(player, context);
      if (naturalArmor) candidates.push(naturalArmor);

      const state = normalizeTemporaryEffects(player && player.temporaryEffects);
      if (state.effects.mageArmor) {
        candidates.push({
          id: 'mage-armor',
          label: 'Mage Armor',
          total: 13 + context.dexMod,
          parts: [
            { label: 'Mage Armor base', display: '13' },
            { label: 'Dexterity modifier', value: context.dexMod },
          ],
          valid: true,
        });
      }
    }

    if (!candidates.length) {
      candidates.push({
        id: 'fallback-unarmored',
        label: 'Unarmored',
        total: 10 + context.dexMod,
        parts: [
          { label: 'Unarmored base', display: '10' },
          { label: 'Dexterity modifier', value: context.dexMod },
        ],
        valid: true,
      });
    }
    return candidates;
  }

  function chooseOfficialBaseAcCandidate(candidates) {
    const legal = candidates.filter(candidate => candidate.valid);
    return (legal.length ? legal : candidates)
      .slice()
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))[0];
  }

  function buildArmorCandidate(entry, context) {
    const rule = entry.rule;
    const dexApplied = applyArmorDexBonus(context.dexMod, rule);
    const parts = [{ label: entry.item.name, display: String(rule.base) }];
    if (rule.dexMode !== 'none') {
      parts.push({ label: `Dexterity modifier${rule.dexMode === 'max' ? ` (max ${rule.dexMax})` : ''}`, value: dexApplied });
    }
    if (rule.bonus) parts.push({ label: `${entry.item.name} magic bonus`, value: rule.bonus });
    return {
      id: `armor-${entry.item.id}`,
      label: entry.item.name,
      itemName: entry.item.name,
      total: rule.base + dexApplied + (rule.bonus || 0),
      parts,
      valid: true,
    };
  }

  function parseArmorAcRule(item) {
    if (!item) return null;
    const details = item.details || {};
    const type = normalizeName(`${item.kind || ''} ${details.type || ''} ${item.name || ''}`);
    const damage = String(details.damage || '');
    const text = String(details.text || '');
    if (type.includes('shield')) {
      const enhancement = parseShieldEnhancementBonus(item, damage, text);
      const regularShieldBonus = 2;
      const printedBonus = parseAcBonus(damage) || parseAcBonus(text);
      const bonus = enhancement ? regularShieldBonus + enhancement : (printedBonus || regularShieldBonus);
      return { kind: 'shield', bonus, regularShieldBonus, enhancement };
    }
    if (!type.includes('armor') && !type.includes('mail') && !type.includes('plate') && !type.includes('leather')) return null;
    const match = damage.match(/AC\s*(\d+)(?:\s*\+\s*Dex(?:terity)?(?:\s*\(max\s*(\d+)\))?)?/i);
    const fallback = findArmorBaseRule(item.name);
    if (!match && !fallback) return null;
    const dexMode = match ? (/\+\s*Dex/i.test(damage) ? (match[2] ? 'max' : 'full') : 'none') : fallback.dexMode;
    return {
      kind: 'armor',
      base: match ? Number(match[1]) || 10 : fallback.base,
      dexMode,
      dexMax: match && match[2] ? Number(match[2]) || 0 : fallback && fallback.dexMax || null,
      bonus: parseArmorEnhancementBonus(item, text),
    };
  }

  function findArmorBaseRule(name) {
    const normalized = normalizeName(name);
    return ARMOR_BASES.find(rule => normalized.includes(rule.key)) || null;
  }

  function applyArmorDexBonus(dexMod, rule) {
    if (!rule || rule.dexMode === 'none') return 0;
    if (rule.dexMode === 'max') return Math.min(dexMod, rule.dexMax || 0);
    return dexMod;
  }

  function calculateArmorRuleTotal(rule, player) {
    const dexMod = calculateModifier(Number(player.abilities && player.abilities.dex) || 10);
    return (rule && rule.base || 10) + applyArmorDexBonus(dexMod, rule) + (rule && rule.bonus || 0);
  }

  function parseArmorEnhancementBonus(item, text) {
    const named = parseMagicItemPlus(item && item.name);
    if (named) return named;
    const match = String(text || '').match(/\+(\d+)\s+bonus to AC while (?:wearing|you wear) this armor/i);
    return match ? Number(match[1]) || 0 : 0;
  }

  function parseShieldEnhancementBonus(item, damage, text) {
    const named = parseMagicItemPlus(item && item.name);
    if (named) return named;
    const bonus = parseAcBonus(text);
    if (bonus && /in addition to the shield's normal bonus|while holding this shield/i.test(text)) return bonus;
    const printed = parseAcBonus(damage);
    if (printed && printed !== 2 && /shield/i.test(item && item.name || '')) return printed;
    return 0;
  }

  function parseMagicItemPlus(name) {
    const text = String(name || '');
    const match = text.match(/(?:^|\s|\()\+(\d+)\b|,\s*\+(\d+)\b/i);
    return match ? Number(match[1] || match[2]) || 0 : 0;
  }

  function buildShieldAcParts(entry) {
    if (!entry || !entry.rule) return [];
    if (entry.rule.enhancement) {
      return [
        { label: `${entry.item.name} shield bonus`, value: entry.rule.regularShieldBonus || 2 },
        { label: `${entry.item.name} magic bonus`, value: entry.rule.enhancement },
      ];
    }
    return [{ label: entry.item.name, value: entry.rule.bonus }];
  }

  function getPassiveAcBonusParts(player, context) {
    const armorId = context.armor && context.armor.item.id;
    const shieldId = context.shield && context.shield.item.id;
    const applied = [];
    const warnings = [];
    for (const item of context.equipped) {
      if (item.id === armorId || item.id === shieldId) continue;
      const part = getPassiveAcBonusPart(item, context);
      if (!part) continue;
      if (part.applies) applied.push({ label: part.label, value: part.value });
      else warnings.push(part.reason);
    }
    applied.push(...getFeatureAcBonusParts(player, context));
    return { applied, warnings };
  }

  function getPassiveAcBonusPart(item, context) {
    const name = normalizeName(item && item.name);
    const text = cleanRulesText(`${item && item.name || ''} ${item && item.details && item.details.text || ''}`);
    if (!text) return null;

    if (name.includes('bracers of defense')) {
      const blocked = Boolean(context.armor || context.shield);
      return {
        label: item.name,
        value: 2,
        applies: !blocked,
        reason: blocked ? 'Bracers of Defense are not applied while wearing armor or wielding a shield.' : '',
      };
    }

    if (name.includes('ring of protection') || name.includes('cloak of protection') || name.includes('ioun stone protection')) {
      return { label: item.name, value: 1, applies: true };
    }

    if (!/\+(\d+)\s+(?:bonus to AC|bonus to Armor Class)/i.test(text)) return null;
    if (/\b(reaction|bonus action|action|until the start|until the end|against one|when you are hit|whenever|choose|concentration|1\/day|charge)\b/i.test(text)) return null;
    if (!/\bwhile (?:wearing|holding|wielding|carrying)|orbits your head\b/i.test(text)) return null;

    const value = parseAcBonus(text);
    return value ? { label: item.name, value, applies: true } : null;
  }

  function parseAcBonus(text) {
    const match = String(text || '').match(/\+(\d+)\s+(?:bonus to AC|AC|bonus to Armor Class)|AC\s*\+(\d+)|Armor Class(?:\s+is)?\s+increases by\s+(\d+)|increases your Armor Class by\s+(\d+)/i);
    return match ? Number(match[1] || match[2] || match[3] || match[4]) || 0 : 0;
  }

  function getFeatureAcBonusParts(player, context) {
    const text = normalizeName(`${player.searchText || ''} ${(player.ruleEffects || []).map(effect => `${effect.name} ${effect.text}`).join(' ')}`);
    const parts = [];
    if (context.armor && /\bdefense fighting style\b|\bfighting style defense\b/.test(text)) {
      parts.push({ label: 'Defense Fighting Style', value: 1 });
    }
    if (/\bdual wielder\b/.test(text) && hasTwoMeleeWeaponsEquipped(player)) {
      parts.push({ label: 'Dual Wielder', value: 1 });
    }
    if (/\bwarforged\b/.test(normalizeName(player.race)) || /\bintegrated protection\b/.test(text)) {
      parts.push({ label: 'Integrated Protection', value: 1 });
    }
    return parts;
  }

  function hasTwoMeleeWeaponsEquipped(player) {
    return getEquippedItems(player).filter(item => item.weapon && item.weapon.style === 'melee').length >= 2;
  }

  function hasDraconicResilience(player) {
    const text = normalizeName(`${player.class || ''} ${player.subclass || ''} ${player.searchText || ''}`);
    return text.includes('sorcerer') && (text.includes('draconic resilience') || text.includes('draconic bloodline'));
  }

  function getNaturalArmorCandidate(player, context) {
    const race = normalizeName(player.race);
    if (race.includes('lizardfolk')) {
      return {
        id: 'lizardfolk-natural-armor',
        label: 'Lizardfolk Natural Armor',
        total: 13 + context.dexMod,
        parts: [
          { label: 'Lizardfolk Natural Armor', display: '13' },
          { label: 'Dexterity modifier', value: context.dexMod },
        ],
        valid: true,
      };
    }
    if (race.includes('loxodon')) {
      return {
        id: 'loxodon-natural-armor',
        label: 'Loxodon Natural Armor',
        total: 12 + context.conMod,
        parts: [
          { label: 'Loxodon Natural Armor', display: '12' },
          { label: 'Constitution modifier', value: context.conMod },
        ],
        valid: true,
      };
    }
    if (race.includes('tortle')) {
      return {
        id: 'tortle-natural-armor',
        label: 'Tortle Natural Armor',
        total: 17,
        parts: [{ label: 'Tortle Natural Armor', display: '17' }],
        valid: true,
      };
    }
    return null;
  }

  function getTemporaryAcParts(player, currentTotal, context = null) {
    const state = normalizeTemporaryEffects(player && player.temporaryEffects);
    const parts = [];
    for (const definition of TEMPORARY_EFFECT_DEFINITIONS) {
      if (!state.effects[definition.id] || !definition.acBonus) continue;
      if (definition.requiresShield && !(context && context.shield)) {
        parts.push({ label: definition.label, value: 0, display: 'equip shield first' });
        continue;
      }
      parts.push({ label: definition.label, value: definition.acBonus });
    }
    for (const definition of TEMPORARY_EFFECT_DEFINITIONS) {
      if (!state.effects[definition.id] || !definition.acFloor) continue;
      parts.push({
        label: definition.label,
        floor: definition.acFloor,
        value: currentTotal < definition.acFloor ? definition.acFloor - currentTotal : 0,
      });
    }
    if (state.customAcBonus) {
      parts.push({ label: state.customName || 'Custom temporary AC', value: state.customAcBonus });
    }
    return parts;
  }

  function getActiveTemporaryEffectLabels(player) {
    const state = normalizeTemporaryEffects(player && player.temporaryEffects);
    const labels = TEMPORARY_EFFECT_DEFINITIONS
      .filter(definition => state.effects[definition.id])
      .map(definition => definition.label);
    if (state.customAcBonus) labels.push(`${state.customName || 'Custom AC'} ${formatBonus(state.customAcBonus)}`);
    return labels;
  }

  function buildSpeedProfile(player) {
    const base = Number(player.baseSpeed) || Number(player.speed) || 30;
    const state = normalizeTemporaryEffects(player && player.temporaryEffects);
    const haste = state.effects.haste;
    return {
      total: haste ? base * 2 : base,
      parts: [
        { label: 'Base speed', display: `${base} ft` },
        haste ? { label: 'Haste', display: 'x2' } : null,
      ].filter(Boolean),
    };
  }

  function buildInventory(player) {
    const seen = new Map();
    return player.equipment.map((name, index) => {
      const baseId = slugify(name) || `item-${index + 1}`;
      const count = seen.get(baseId) || 0;
      seen.set(baseId, count + 1);
      const id = count ? `${baseId}-${count + 1}` : baseId;
      const details = findItemDetails(name, player);
      const weapon = buildWeaponProfile(name, id, player, details);
      const hint = EQUIPMENT_HINTS.find(item => normalizeName(name).includes(item.key));
      const kind = inferItemKind(name, weapon, hint, details);
      const item = {
        id,
        name,
        sourceIndex: index,
        kind,
        weapon,
        details,
      };
      item.abilities = buildItemAbilities(item);
      return item;
    });
  }

  function buildWeaponProfile(name, id, player, details = null) {
    const normalized = normalizeName(name);
    const detailType = normalizeName(details && details.type);
    if (detailType.includes('armor') || detailType.includes('shield')) return null;
    const ruleWeapon = details && details.weapon;
    const base = ruleWeapon || WEAPON_BASES.find(candidate => normalized.includes(candidate.key));
    if (!base) return null;

    const magicBonus = ruleWeapon ? Number(ruleWeapon.magicBonus) || parseMagicBonus(name, details) : parseMagicBonus(name, details);
    const ability = resolveWeaponAbility(base, player);
    const abilityMod = calculateModifier(Number(player.abilities && player.abilities[ability]) || 10);
    const proficient = base.type === 'simple' ? Boolean(player.simpleWeapons) : Boolean(player.martialWeapons);
    const proficiencyBonus = proficient ? Number(player.proficiencyBonus) || 0 : 0;
    const styleBonus = getStyleBonus(player, base);
    const catalogDamage = parseCatalogDamage(details && details.damage);
    const properties = ruleWeapon && ruleWeapon.properties && ruleWeapon.properties.length ? ruleWeapon.properties : (details && details.properties ? splitProperties(details.properties) : base.properties || []);
    const baseDamage = (ruleWeapon && ruleWeapon.damage) || catalogDamage.damage || base.damage;
    const versatileDamage = (ruleWeapon && ruleWeapon.versatileDamage) || parseVersatileDamage(properties);
    const handMode = getWeaponHandMode(player, id, properties);
    const damage = handMode === 'two' && versatileDamage ? versatileDamage : baseDamage;
    const damageType = (ruleWeapon && ruleWeapon.damageType) || catalogDamage.damageType || base.damageType;
    const toggleEffects = getWeaponToggleEffects(player, { base, details, id, name, properties, style: base.style, damageType });
    const attackToggleBonus = toggleEffects.attackParts.reduce((sum, part) => sum + part.value, 0);
    const damageToggleBonus = toggleEffects.damageParts.reduce((sum, part) => sum + part.value, 0);
    const attackBonus = abilityMod + proficiencyBonus + magicBonus + styleBonus + attackToggleBonus;
    const damageBonus = abilityMod + magicBonus + damageToggleBonus;

    return {
      id,
      name,
      baseName: base.baseName,
      type: base.type,
      style: base.style,
      ability,
      abilityLabel: ability.toUpperCase(),
      damage,
      baseDamage,
      versatileDamage,
      handMode,
      damageType,
      damageBonus,
      damageFormula: formatFullDamageFormula(damage, damageBonus, toggleEffects.extraDamage),
      attackBonus,
      attackParts: buildWeaponAttackParts(ability, abilityMod, proficiencyBonus, magicBonus, styleBonus, proficient).concat(toggleEffects.attackParts),
      damageParts: buildWeaponDamageParts(ability, abilityMod, magicBonus).concat(toggleEffects.damageParts, toggleEffects.extraDamage.map(effect => ({ label: effect.label, display: `${effect.dice} ${effect.damageType}` }))),
      extraDamage: toggleEffects.extraDamage,
      onHitEffects: toggleEffects.onHitEffects,
      activeToggleLabels: toggleEffects.labels,
      magicBonus,
      proficient,
      properties,
      styleBonus,
    };
  }

  function buildWeaponAttackParts(ability, abilityMod, proficiencyBonus, magicBonus, styleBonus, proficient) {
    return [
      { label: `${ABILITY_NAMES[ability] || ability.toUpperCase()} modifier`, value: abilityMod },
      { label: proficient ? 'Proficiency' : 'Proficiency (not applied)', value: proficiencyBonus },
      { label: 'Magic weapon bonus', value: magicBonus },
      { label: 'Archery Fighting Style', value: styleBonus },
    ].filter(part => part.value || part.label.includes('modifier') || part.label.includes('not applied'));
  }

  function buildWeaponDamageParts(ability, abilityMod, magicBonus) {
    return [
      { label: 'Damage die', value: null },
      { label: `${ABILITY_NAMES[ability] || ability.toUpperCase()} modifier`, value: abilityMod },
      { label: 'Magic weapon bonus', value: magicBonus },
    ].filter(part => part.value || part.value === null || part.label.includes('modifier'));
  }

  function getWeaponToggleEffects(player, weaponContext) {
    const state = getWeaponCombatState(player, weaponContext.id, weaponContext.properties);
    const properties = weaponContext.properties || [];
    const heavyMelee = weaponContext.style === 'melee' && properties.some(property => normalizeName(property).includes('heavy'));
    const weaponEquipped = isItemEquipped(player, { id: weaponContext.id, name: weaponContext.name, details: weaponContext.details });
    const sigilEquipped = hasEquippedNamed(player, 'sigil of thunderous might');
    const effects = {
      attackParts: [],
      damageParts: [],
      extraDamage: [],
      onHitEffects: [],
      labels: [],
    };

    if (state.greatWeaponMaster && weaponEquipped && hasPlayerFeat(player, 'great weapon master') && heavyMelee) {
      effects.attackParts.push({ label: 'Great Weapon Master', value: -5 });
      effects.damageParts.push({ label: 'Great Weapon Master', value: 10 });
      effects.labels.push('Great Weapon Master');
    }

    if (state.sigilCrushingStrike && weaponEquipped && sigilEquipped) {
      effects.extraDamage.push({ label: 'Crushing Strike', dice: '2d6', damageType: 'thunder' });
      effects.labels.push('Crushing Strike');
    }

    if (state.sigilShieldingImpact && weaponEquipped && sigilEquipped) {
      effects.onHitEffects.push({ label: 'Shielding Impact', text: 'Temp HP equals half damage dealt.' });
      effects.labels.push('Shielding Impact');
    }

    if (state.corpseSlayerUndeadTarget && weaponEquipped && normalizeName(weaponContext.name).includes('corpse slayer')) {
      effects.extraDamage.push({ label: 'Corpse Slayer vs undead', dice: '1d8', damageType: weaponContext.damageType || 'weapon' });
      effects.onHitEffects.push({ label: 'Corpse Slayer vs undead', text: 'Undead target has disadvantage on saves against effects that turn undead until your next turn.' });
      effects.labels.push('Undead Target');
    }

    for (const toggle of getApplicableWeaponRuleToggles(player, weaponContext)) {
      if (!state[toggle.id]) continue;
      for (const effect of toggle.effects || []) {
        if (effect.kind === 'extra-damage') {
          effects.extraDamage.push({
            label: effect.label || toggle.label,
            dice: effect.dice,
            damageType: effect.damageType === 'weapon' ? (weaponContext.damageType || 'weapon') : effect.damageType,
          });
        } else if (effect.kind === 'weapon-attack-bonus') {
          effects.attackParts.push({ label: effect.label || toggle.label, value: Number(effect.value) || 0 });
        } else if (effect.kind === 'weapon-damage-bonus') {
          effects.damageParts.push({ label: effect.label || toggle.label, value: Number(effect.value) || 0 });
        } else if (effect.kind === 'on-hit') {
          effects.onHitEffects.push({ label: effect.label || toggle.label, text: effect.text || toggle.text || '' });
        }
      }
      effects.labels.push(toggle.label || toggle.id);
    }

    return effects;
  }

  function getApplicableWeaponRuleToggles(player, weaponContext) {
    const inventory = Array.isArray(player && player.inventory) ? player.inventory : [];
    const weaponItem = inventory.find(item => item.id === weaponContext.id);
    const toggles = [];
    if (weaponContext && weaponContext.details && Array.isArray(weaponContext.details.toggles)) toggles.push(...weaponContext.details.toggles);
    if (weaponItem && weaponItem.details && Array.isArray(weaponItem.details.toggles)) toggles.push(...weaponItem.details.toggles);
    for (const item of inventory) {
      if (!item.details || !Array.isArray(item.details.toggles)) continue;
      for (const toggle of item.details.toggles) {
        if (toggle.appliesTo === 'equipped-weapon') toggles.push(toggle);
      }
    }
    return uniqueRuleRecords(toggles).filter(toggle => {
      if (!toggle || !toggle.id) return false;
      if (toggle.appliesTo === 'equipped-weapon') return true;
      return !toggle.appliesTo || toggle.appliesTo === 'this-weapon';
    });
  }

  function uniqueRuleRecords(records) {
    const seen = new Set();
    return (records || []).filter(record => {
      const key = record && record.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getWeaponCombatState(player, weaponId, properties = []) {
    const weapons = player.combatToggles && player.combatToggles.weapons;
    const saved = weapons && weapons[weaponId] ? weapons[weaponId] : {};
    return {
      ...saved,
      handMode: saved.handMode || getDefaultHandMode(properties),
    };
  }

  function getWeaponHandMode(player, weaponId, properties = []) {
    return getWeaponCombatState(player, weaponId, properties).handMode;
  }

  function getDefaultHandMode(properties = []) {
    const versatile = Boolean(parseVersatileDamage(properties));
    if (!versatile) return 'one';
    const heavy = properties.some(property => normalizeName(property).includes('heavy'));
    return heavy ? 'two' : 'one';
  }

  function hasPlayerFeat(player, featName) {
    const target = normalizeName(featName);
    return Array.isArray(player.feats) && player.feats.some(feat => normalizeName(feat).includes(target));
  }

  function hasEquippedNamed(player, itemName) {
    const target = normalizeName(itemName);
    return (player.equippedNames || []).some(name => name.includes(target));
  }

  function findItemDetails(name, player) {
    const detailsByName = player.itemDetails || {};
    const direct = detailsByName[name];
    if (direct) return normalizeItemDetails(direct);

    const normalized = normalizeName(name);
    for (const detail of Object.values(detailsByName)) {
      if (normalizeName(detail && detail.name) === normalized) return normalizeItemDetails(detail);
    }

    const catalog = Array.isArray(player.itemCatalog) ? player.itemCatalog : [];
    const lookupNames = getItemLookupNames(name);
    const found = catalog.find(item => lookupNames.includes(normalizeName(item && item.name)) || lookupNames.includes(normalizeName(item && item.id)));
    if (found) return normalizeItemDetails(found);

    const custom = CUSTOM_ITEM_DETAILS.find(detail => normalized.includes(detail.key));
    if (custom) return normalizeItemDetails(custom);

    const armor = buildFallbackArmorDetails(name);
    return armor ? normalizeItemDetails(armor) : null;
  }

  function getItemLookupNames(name) {
    const raw = String(name || '').trim();
    const pieces = [raw];
    if (raw.includes('|')) pieces.push(...raw.split('|').map(part => part.trim()));
    return [...new Set(pieces.map(normalizeName).filter(Boolean))];
  }

  function buildFallbackArmorDetails(name) {
    const normalized = normalizeName(name);
    if (normalized.includes('shield')) {
      return {
        id: slugify(name),
        name,
        type: 'armor (shield)',
        damage: 'AC +2',
        text: 'A shield increases Armor Class by 2 while equipped.',
      };
    }

    const rule = findArmorBaseRule(name);
    if (!rule) return null;
    const dexText = rule.dexMode === 'full'
      ? ' + Dexterity modifier'
      : rule.dexMode === 'max'
        ? ` + Dexterity modifier (max ${rule.dexMax || 2})`
        : '';
    return {
      id: slugify(name),
      name,
      type: 'armor',
      damage: `AC ${rule.base}${dexText}`,
      text: `${name} sets base Armor Class to ${rule.base}${dexText}.`,
    };
  }

  function normalizeItemDetails(details) {
    if (!details) return null;
    return {
      name: cleanDetailValue(details.name),
      source: cleanDetailValue(details.source),
      page: cleanDetailValue(details.page),
      rarity: cleanDetailValue(details.rarity),
      type: cleanDetailValue(details.type),
      attunement: cleanDetailValue(details.attunement),
      damage: cleanDetailValue(details.damage),
      properties: cleanDetailValue(details.properties),
      weight: cleanDetailValue(details.weight),
      value: cleanDetailValue(details.value),
      text: cleanRulesText(details.text),
      abilities: Array.isArray(details.abilities) ? details.abilities.map(cleanRulesText).filter(Boolean) : [],
      weapon: details.weapon && typeof details.weapon === 'object' ? normalizeWeaponRule(details.weapon) : null,
      actions: Array.isArray(details.actions) ? details.actions : [],
      effects: Array.isArray(details.effects) ? details.effects : [],
      resources: Array.isArray(details.resources) ? details.resources : [],
      toggles: Array.isArray(details.toggles) ? details.toggles : [],
      key: details.key || '',
    };
  }

  function normalizeWeaponRule(rule) {
    return {
      baseName: cleanDetailValue(rule.baseName),
      type: cleanDetailValue(rule.type),
      style: cleanDetailValue(rule.style),
      ability: cleanDetailValue(rule.ability),
      damage: cleanDetailValue(rule.damage),
      damageType: cleanDetailValue(rule.damageType),
      properties: Array.isArray(rule.properties) ? rule.properties.map(cleanDetailValue).filter(Boolean) : splitProperties(rule.properties || ''),
      range: cleanDetailValue(rule.range),
      versatileDamage: cleanDetailValue(rule.versatileDamage),
      magicBonus: Number(rule.magicBonus) || 0,
    };
  }

  function inferItemKind(name, weapon, hint, details) {
    const type = normalizeName(details && details.type);
    if (type.includes('shield')) return 'shield';
    if (type.includes('armor')) return 'armor';
    if (weapon) return 'weapon';
    if (/\bring\b/.test(type)) return 'ring';
    if (type.includes('wondrous')) return 'wondrous';
    if (hint && hint.kind) return hint.kind;
    return 'item';
  }

  function buildItemAbilities(item) {
    const abilities = [];
    if (item.details && item.details.abilities.length) abilities.push(...item.details.abilities);
    if (item.details && item.details.actions.length) abilities.push(...item.details.actions.map(action => `${action.title || action.name || item.name}: ${action.detail || action.text || ''}`));
    if (item.details && item.details.effects.length) abilities.push(...item.details.effects.map(effect => `${effect.name || effect.label || 'Effect'}: ${effect.text || formatEffectSummary(effect)}`));
    if (item.details && item.details.resources.length) abilities.push(...item.details.resources.map(resource => `${resource.name}: ${formatResourceMax(resource, null)}; resets ${formatReset(resource.reset)}.`));
    if (!item.weapon && item.details && item.details.properties && hasActiveRulesText(item)) {
      const properties = splitProperties(item.details.properties);
      const extracted = extractItemPropertyAbilities(item.details.text, properties);
      abilities.push(...(extracted.length ? extracted : properties));
    }
    if (item.weapon && item.weapon.magicBonus) {
      abilities.push(`${formatBonus(item.weapon.magicBonus)} to attack and damage rolls with this weapon.`);
    }
    if (item.weapon && item.weapon.styleBonus) {
      abilities.push(`Archery style included: ${formatBonus(item.weapon.styleBonus)} to ranged attack rolls.`);
    }

    const summary = abilities.length ? '' : summarizeItemRules(item);
    if (summary && !abilities.some(text => normalizeName(text) === normalizeName(summary))) abilities.push(summary);
    return [...new Set(abilities)];
  }

  function extractItemPropertyAbilities(text, properties) {
    const rules = cleanRulesText(text);
    if (!rules || !properties.length) return [];
    return properties.map(property => {
      const name = String(property || '').split('(')[0].trim();
      if (!name || /^none$/i.test(name)) return '';
      const pattern = new RegExp(`(?:^|\\s-\\s*)${escapeRegExp(name)}(?:\\s*\\([^)]+\\))?\\s*:\\s*([\\s\\S]*?)(?=\\s-\\s*[A-Z][^:]{1,80}:|$)`, 'i');
      const match = rules.match(pattern);
      return match ? `${property}: ${match[1].trim()}` : '';
    }).filter(Boolean);
  }

  function summarizeItemRules(item) {
    const details = item.details;
    if (!details || !details.text || !hasActiveRulesText(item)) return '';
    return findRulesSentence(details.text, 260);
  }

  function hasActiveRulesText(item) {
    const details = item.details || {};
    if (details.abilities && details.abilities.length) return true;
    if (details.actions && details.actions.length) return true;
    if (details.effects && details.effects.length) return true;
    if (details.resources && details.resources.length) return true;
    if (item.weapon && (item.weapon.magicBonus || normalizeName(item.name).includes('warning'))) return true;
    return Boolean(findRulesSentence(details.text, 260));
  }

  function findRulesSentence(text, maxLength) {
    const sentences = splitSentences(text);
    const index = sentences.findIndex(isRulesSentence);
    if (index < 0) return '';
    const chosen = [sentences[index]];
    const next = sentences[index + 1];
    if (next && chosen.join(' ').length + next.length < maxLength && isRulesContinuationSentence(next)) chosen.push(next);
    return truncateText(chosen.join(' '), maxLength);
  }

  function isRulesSentence(sentence) {
    const text = normalizeName(sentence);
    if (!text) return false;
    return /^(as|when|whenever|while|if|once|after|before|provided)\b/.test(text)
      || /\byou (can|may|gain|have|regain|recover|are|become|must|can't|cannot|use|expend|cast|ignore|know|learn)\b/.test(text)
      || /\b(creature|target|wearer|wielder|allies|companions?)\b.*\b(must|can|gains?|has|takes?|regains?|becomes?|is|are)\b/.test(text)
      || /\b(advantage|disadvantage|resistance|immune|immunity|bonus|armor class| ac |dc |charges?|hit points?|temporary hit points?|saving throw|attack roll|ability check|damage|spell|condition|concentration|attunement)\b/.test(` ${text} `);
  }

  function isRulesContinuationSentence(sentence) {
    const text = normalizeName(sentence);
    return /\b(must|causes?|can't|cannot|takes?|gains?|regains?|loses?|becomes?|disappears?|ends?|lasts?|charges?|uses?|saving throw|damage|hit points?|minute|round|action|bonus action|reaction|command word)\b/.test(text)
      || isRulesSentence(sentence);
  }

  function parseCatalogDamage(value) {
    const match = String(value || '').match(/(\d+d\d+|\d+)\s+([a-z]+)/i);
    return match ? { damage: match[1], damageType: match[2].toLowerCase() } : {};
  }

  function chooseWeaponDamage(baseDamage, properties) {
    const versatile = parseVersatileDamage(properties);
    const heavy = (properties || []).some(property => normalizeName(property).includes('heavy'));
    return heavy && versatile ? versatile : baseDamage;
  }

  function parseVersatileDamage(properties) {
    const property = (properties || []).find(item => normalizeName(item).includes('versatile'));
    const match = String(property || '').match(/\((\d+d\d+)\)/i);
    return match ? match[1] : '';
  }

  function splitProperties(value) {
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  function resolveWeaponAbility(base, player) {
    if (base.ability !== 'finesse') return base.ability;
    const str = calculateModifier(Number(player.abilities && player.abilities.str) || 10);
    const dex = calculateModifier(Number(player.abilities && player.abilities.dex) || 10);
    return dex > str ? 'dex' : 'str';
  }

  function getStyleBonus(player, base) {
    if (base.style !== 'ranged') return 0;
    if (player.attackBonuses && Number(player.attackBonuses.ranged)) return Number(player.attackBonuses.ranged);
    const haystack = `${player.class || ''} ${player.searchText || ''}`.toLowerCase();
    return haystack.includes('archery fighting style') ? 2 : 0;
  }

  function parseMagicBonus(name, details = null) {
    const match = String(name || '').match(/\+(\d+)/);
    if (match) return Number(match[1]) || 0;
    const textMatch = String(details && details.text || '').match(/\+(\d+)\s+bonus to attack and damage rolls/i);
    return textMatch ? Number(textMatch[1]) || 0 : 0;
  }

  function formatDamageFormula(dice, bonus) {
    if (dice === '1') return String(1 + bonus);
    if (!bonus) return dice;
    return `${dice}${bonus > 0 ? '+' : ''}${bonus}`;
  }

  function formatFullDamageFormula(dice, bonus, extraDamage = []) {
    const base = formatDamageFormula(dice, bonus);
    const extra = extraDamage.map(effect => `${effect.dice} ${effect.damageType}`).join(' + ');
    return extra ? `${base} + ${extra}` : base;
  }

  function inferDefaultEquipped(inventory) {
    const equipped = [];
    const firstMelee = inventory.find(item => item.weapon && item.weapon.style === 'melee');
    const firstRanged = inventory.find(item => item.weapon && item.weapon.style === 'ranged');
    inventory
      .filter(item => item.kind === 'armor' || item.kind === 'shield')
      .forEach(item => equipped.push(item.id));
    if (firstMelee) equipped.push(firstMelee.id);
    if (firstRanged && firstRanged.id !== (firstMelee && firstMelee.id)) equipped.push(firstRanged.id);
    return [...new Set(equipped)];
  }

  function renderEquippedSummary(root, player) {
    const target = root.querySelector('[data-equipped-summary]');
    if (!target) return;
    const equipped = getEquippedItems(player);
    const weaponItems = equipped.filter(item => item.weapon);

    target.innerHTML = `
      <div class="equipped-title">Equipped</div>
      <div class="equipped-items">
        ${equipped.length ? equipped.map(item => renderEquippedItem(item)).join('') : '<span class="empty-note">None selected.</span>'}
      </div>
      ${weaponItems.length ? `<div class="quick-rolls">${weaponItems.map(item => renderQuickRoll(item.weapon)).join('')}</div>` : ''}
    `;
  }

  function renderEquippedItem(item) {
    if (!item.weapon) return `<span class="equipped-item">${escapeHtml(item.name)}</span>`;
    return `<span class="equipped-item">${escapeHtml(item.name)} <strong>${formatBonus(item.weapon.attackBonus)}</strong></span>`;
  }

  function renderQuickRoll(weapon) {
    return `<span class="quick-roll-group">
      <span>${escapeHtml(weapon.name)}</span>
      <button class="roll-button" type="button" data-roll-type="attack" data-weapon-id="${escapeAttr(weapon.id)}">Hit ${formatBonus(weapon.attackBonus)}</button>
      <button class="roll-button" type="button" data-roll-type="damage" data-weapon-id="${escapeAttr(weapon.id)}">Dmg ${escapeHtml(weapon.damageFormula)}</button>
    </span>`;
  }

  function renderTemporaryEffectsPanel(root, player) {
    root.querySelectorAll('[data-temporary-effects-panel]').forEach(target => {
      const state = normalizeTemporaryEffects(player.temporaryEffects);
      target.innerHTML = `<section class="combat-toggles temporary-effects">
        <h3>Temporary Effects</h3>
        <div class="combat-toggle-list">
          ${TEMPORARY_EFFECT_DEFINITIONS.map(definition => `<label class="combat-toggle">
            <input type="checkbox" data-temporary-effect="${escapeAttr(definition.id)}" ${state.effects[definition.id] ? 'checked' : ''}>
            <span>
              <strong>${escapeHtml(definition.label)}</strong>
              <small>${escapeHtml(definition.detail)}</small>
            </span>
          </label>`).join('')}
        </div>
        <div class="temporary-custom">
          <label><span>Custom Label</span><input type="text" data-temporary-effect-name value="${escapeAttr(state.customName)}" placeholder="Blessing, cover, potion..."></label>
          <label><span>AC Bonus</span><input type="number" data-temporary-ac-bonus value="${state.customAcBonus || ''}" inputmode="numeric" min="-20" max="20"></label>
        </div>
      </section>`;
    });
  }

  function renderArmorClassPanel(root, player) {
    root.querySelectorAll('[data-ac-panel]').forEach(target => {
      const profile = player.acProfile || buildArmorClassProfile(player);
      target.innerHTML = `<section class="ac-breakdown-panel">
        <div>
          <h2>Armor Class</h2>
          <p>${profile.mode === 'official' ? 'Using official equipment and rules math.' : 'Using saved sheet AC when it differs from official rules math.'}</p>
        </div>
        <strong class="ac-total">${profile.total}</strong>
        <div class="ac-controls">
          <button class="text-button" type="button" data-ac-mode="official" ${profile.mode === 'official' ? 'disabled' : ''}>${profile.mode === 'official' ? 'Official AC Active' : 'Use Official AC'}</button>
        </div>
        <details class="math-breakdown" open>
          <summary>AC math</summary>
          ${renderMathParts(profile.parts, profile.total, '', String(profile.total))}
        </details>
        ${profile.alternatives && profile.alternatives.length ? `<details class="math-breakdown ac-alternatives">
          <summary>Other legal base formulas</summary>
          <div class="math-list">${profile.alternatives.map(item => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(String(item.total))}</strong></div>`).join('')}</div>
        </details>` : ''}
        ${profile.warnings && profile.warnings.length ? `<div class="ac-warning-list">${profile.warnings.map(warning => `<p>${escapeHtml(warning)}</p>`).join('')}</div>` : ''}
        ${profile.activeLabels.length ? `<div class="active-effect-tags">${profile.activeLabels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div>` : ''}
      </section>`;
    });
  }

  function renderCombatToggles(root, player) {
    const target = root.querySelector('[data-combat-toggles]');
    if (!target) return;
    const definitions = player.combatToggleDefinitions || [];
    if (!definitions.length) {
      target.innerHTML = '';
      return;
    }

    target.innerHTML = `<section class="combat-toggles">
      <h3>Combat Toggles</h3>
      <div class="combat-toggle-list">
        ${definitions.map(definition => {
          const checked = Boolean(player.combatToggles && player.combatToggles[definition.id]) && definition.available;
          return `<label class="combat-toggle ${definition.available ? '' : 'disabled'}">
            <input type="checkbox" data-combat-toggle="${escapeAttr(definition.id)}" ${checked ? 'checked' : ''} ${definition.available ? '' : 'disabled'}>
            <span>
              <strong>${escapeHtml(definition.label)}</strong>
              <small>${escapeHtml(definition.source)} / ${escapeHtml(definition.available ? definition.description : definition.unavailableReason || definition.description)}</small>
            </span>
          </label>`;
        }).join('')}
      </div>
    </section>`;
  }

  function renderWeaponAttacks(root, player) {
    const target = root.querySelector('[data-weapon-attacks]');
    if (!target) return;
    const equippedWeapons = getEquippedItems(player).filter(item => item.weapon);
    if (!equippedWeapons.length) {
      target.innerHTML = '<p class="empty-note">No equipped weapons.</p>';
      return;
    }

    target.innerHTML = equippedWeapons.map(item => {
      const weapon = item.weapon;
      const equipped = true;
      return `<article class="weapon-card ${equipped ? 'equipped' : ''}">
        <div>
          <h3>${escapeHtml(weapon.name)}</h3>
          <p>${escapeHtml([weapon.baseName, weapon.type, weapon.style, weapon.properties.join(', ')].filter(Boolean).join(' / '))}</p>
          ${weapon.activeToggleLabels.length ? `<div class="active-effect-tags">${weapon.activeToggleLabels.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div>` : ''}
        </div>
        <div class="weapon-stats">
          <div><span>To Hit</span><strong>${formatBonus(weapon.attackBonus)}</strong></div>
          <div><span>Damage</span><strong>${escapeHtml(weapon.damageFormula)}</strong></div>
          <div><span>Type</span><strong>${escapeHtml(weapon.damageType)}</strong></div>
          <div><span>Ability</span><strong>${weapon.abilityLabel}</strong></div>
        </div>
        ${renderWeaponControls(item, player)}
        <details class="math-breakdown">
          <summary>Show math</summary>
          <div class="math-columns">
            <section>
              <h4>Attack Bonus</h4>
              ${renderMathParts(weapon.attackParts, weapon.attackBonus)}
            </section>
            <section>
              <h4>Damage Bonus</h4>
              ${renderMathParts(weapon.damageParts, weapon.damageBonus, weapon.damage, weapon.damageFormula)}
            </section>
          </div>
        </details>
        <div class="weapon-actions">
          <button class="roll-button" type="button" data-roll-type="attack" data-weapon-id="${escapeAttr(item.id)}">Attack</button>
          <button class="roll-button" type="button" data-roll-type="damage" data-weapon-id="${escapeAttr(item.id)}">Damage</button>
        </div>
      </article>`;
    }).join('');
  }

  function renderWeaponControls(item, player) {
    const weapon = item.weapon;
    const equipped = isItemEquipped(player, item);
    const state = getWeaponCombatState(player, item.id, weapon.properties);
    const controls = [];

    if (weapon.versatileDamage) {
      controls.push(`<fieldset class="weapon-control">
        <legend>Hands</legend>
        <label><input type="radio" name="hands-${escapeAttr(item.id)}" data-weapon-mode="${escapeAttr(item.id)}" value="one" ${state.handMode !== 'two' ? 'checked' : ''}> <span>1H ${escapeHtml(weapon.baseDamage)}</span></label>
        <label><input type="radio" name="hands-${escapeAttr(item.id)}" data-weapon-mode="${escapeAttr(item.id)}" value="two" ${state.handMode === 'two' ? 'checked' : ''}> <span>2H ${escapeHtml(weapon.versatileDamage)}</span></label>
      </fieldset>`);
    }

    if (hasPlayerFeat(player, 'great weapon master') && weapon.style === 'melee' && weapon.properties.some(property => normalizeName(property).includes('heavy'))) {
      controls.push(renderWeaponCheckbox(item.id, 'greatWeaponMaster', 'Great Weapon Master', '-5 hit / +10 damage', state.greatWeaponMaster, equipped));
    }

    for (const toggle of getApplicableWeaponRuleToggles(player, { id: item.id, name: item.name, details: item.details, properties: weapon.properties, style: weapon.style, damageType: weapon.damageType })) {
      const sourceItem = findToggleSourceItem(player, toggle);
      const sourceEquipped = !sourceItem || isItemEquipped(player, sourceItem);
      const enabled = equipped && sourceEquipped;
      controls.push(renderWeaponCheckbox(item.id, toggle.id, toggle.label || toggle.title || toggle.id, toggle.text || formatToggleEffects(toggle), state[toggle.id], enabled));
    }

    if (!controls.length) return '';
    return `<div class="weapon-controls">${controls.join('')}</div>`;
  }

  function findToggleSourceItem(player, toggle) {
    return (player.inventory || []).find(item => item.details && Array.isArray(item.details.toggles) && item.details.toggles.some(candidate => candidate.id === toggle.id));
  }

  function formatToggleEffects(toggle) {
    return (toggle.effects || []).map(effect => {
      if (effect.kind === 'extra-damage') return `${effect.dice} ${effect.damageType} on hit`;
      if (effect.kind === 'on-hit') return effect.text || effect.label;
      return effect.label || effect.kind;
    }).filter(Boolean).join('; ');
  }

  function renderWeaponCheckbox(weaponId, option, label, detail, checked, enabled) {
    return `<label class="weapon-control ${enabled ? '' : 'disabled'}">
      <input type="checkbox" data-weapon-toggle="${escapeAttr(weaponId)}" data-weapon-option="${escapeAttr(option)}" ${checked && enabled ? 'checked' : ''} ${enabled ? '' : 'disabled'}>
      <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(enabled ? detail : `${detail} (equip required)`)}</small></span>
    </label>`;
  }

  function renderActionsPanel(root, player) {
    const target = root.querySelector('[data-actions-panel]');
    if (!target) return;
    const groups = buildActionGroups(player, root);
    target.innerHTML = `<div class="actions-panel" data-active-action-filter="all">
      ${renderActionFilterControls(groups)}
      ${groups.map(group => renderActionGroup(group)).join('')}
      <div class="roll-log" data-roll-log></div>
    </div>`;
  }

  function buildActionGroups(player, root) {
    const groups = new Map([
      ['Action', []],
      ['Bonus Action', []],
      ['Reaction', []],
      ['Triggered', []],
      ['Free / Utility', []],
      ['Out of Combat', []],
    ]);

    buildWeaponActionCards(player).forEach(card => addActionCard(groups, card));
    buildSpellActionCards(player, root).forEach(card => addActionCard(groups, card));
    buildSpellScrollActionCards(player, root).forEach(card => addActionCard(groups, card));
    buildRuleActionCards(player).forEach(card => addActionCard(groups, card));
    if (!hasCanonicalClassActions(player)) buildClassActionCards(player).forEach(card => addActionCard(groups, card));
    buildItemActionCards(player).forEach(card => addActionCard(groups, card));
    buildCoreActionCards(player).forEach(card => addActionCard(groups, card));

    return Array.from(groups.entries())
      .map(([name, cards]) => ({ name, cards }))
      .filter(group => group.cards.length);
  }

  function renderActionFilterControls(groups) {
    const cards = groups.flatMap(group => group.cards);
    const filters = [
      ['all', 'All'],
      ['attack', 'Attacks'],
      ['spell', 'Spells'],
      ['item', 'Items'],
      ['class', 'Class'],
      ['core', 'Core'],
      ['equipped', 'Equipped'],
    ].filter(([key]) => key === 'all' || cards.some(card => getActionCategories(card).includes(key)));

    return `<div class="action-filter-bar">
      <div class="action-filter-buttons" role="group" aria-label="Action filters">
        ${filters.map(([key, label]) => `<button class="text-button ${key === 'all' ? 'active' : ''}" type="button" data-action-filter-button data-action-filter="${escapeAttr(key)}">${escapeHtml(label)}</button>`).join('')}
      </div>
      <input data-action-search type="search" placeholder="Filter actions..." aria-label="Filter actions">
    </div>`;
  }

  function addActionCard(groups, card) {
    const group = groups.has(card.group) ? card.group : 'Free / Utility';
    groups.get(group).push(card);
  }

  function renderActionGroup(group) {
    return `<section class="action-group" data-action-group-section="${escapeAttr(group.name)}">
      <h2>${escapeHtml(group.name)}</h2>
      <div class="action-row">
        ${group.cards.map(renderActionCard).join('')}
      </div>
    </section>`;
  }

  function renderActionCard(card) {
    const categories = getActionCategories(card);
    const search = [
      card.group,
      card.type,
      card.title,
      card.meta,
      card.detail,
      ...(card.tags || []),
    ].filter(Boolean).join(' ');
    return `<article class="action-card" data-action-card data-action-group="${escapeAttr(card.group || '')}" data-action-kind="${escapeAttr(categories.join(' '))}" data-action-search="${escapeAttr(search)}">
      <div class="action-card-head">
        <span>${escapeHtml(card.type || card.group)}</span>
        <strong>${escapeHtml(card.title)}</strong>
      </div>
      <div class="action-main">
        ${card.meta ? `<p class="action-meta">${escapeHtml(card.meta)}</p>` : ''}
        ${card.detail ? `<p>${escapeHtml(card.detail)}</p>` : ''}
      </div>
      <div class="action-side">
        ${card.tags && card.tags.length ? `<div class="action-tags">${card.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        ${card.controls || ''}
      </div>
      ${card.math && card.math.length ? `<details class="action-math"><summary>Math</summary>${renderActionMath(card.math)}</details>` : ''}
    </article>`;
  }

  function getActionCategories(card) {
    const categories = new Set();
    const sourceType = normalizeName(card && card.sourceType);
    const type = normalizeName(card && card.type);
    const title = normalizeName(card && card.title);
    const meta = normalizeName(card && card.meta);
    const tags = normalizeName(((card && card.tags) || []).join(' '));
    const haystack = `${sourceType} ${type} ${title} ${meta} ${tags}`;

    if (haystack.includes('attack')) categories.add('attack');
    if (sourceType === 'spell' || type === 'spell' || type === 'scroll' || title.startsWith('cast ')) categories.add('spell');
    if (sourceType === 'item' || type === 'item' || meta.includes('wondrous item')) categories.add('item');
    if (sourceType === 'class' || sourceType === 'subclass' || sourceType === 'feat' || sourceType === 'race' || sourceType === 'background') categories.add('class');
    if (type === 'core' || type === 'contest' || type === 'travel' || type === 'rest') categories.add('core');
    if (tags.includes('equipped')) categories.add('equipped');
    if (!categories.size) categories.add('other');
    return Array.from(categories);
  }

  function renderActionMath(parts) {
    return `<div class="math-list">${parts.map(part => `<div><span>${escapeHtml(part.label)}</span><strong>${escapeHtml(part.display || formatBonus(part.value))}</strong></div>`).join('')}</div>`;
  }

  function buildWeaponActionCards(player) {
    return getEquippedItems(player).filter(item => item.weapon).map(item => {
      const weapon = item.weapon;
      const tags = [
        'Equipped',
        `${formatBonus(weapon.attackBonus)} hit`,
        `${weapon.damageFormula} ${weapon.damageType}`,
        weapon.handMode === 'two' && weapon.versatileDamage ? 'Two hands' : '',
        ...weapon.activeToggleLabels,
      ].filter(Boolean);
      return {
        group: 'Action',
        sourceType: 'weapon',
        type: weapon.style === 'ranged' ? 'Ranged Attack' : 'Melee Attack',
        title: `Attack: ${weapon.name}`,
        meta: [weapon.baseName, weapon.properties.join(', ')].filter(Boolean).join(' / '),
        detail: `${ABILITY_NAMES[weapon.ability] || weapon.abilityLabel} attack with ${formatBonus(weapon.attackBonus)} to hit; ${weapon.damageFormula} ${weapon.damageType} on hit.`,
        tags,
        controls: `<div class="action-controls">
          <button class="roll-button" type="button" data-roll-type="attack" data-weapon-id="${escapeAttr(item.id)}">Attack</button>
          <button class="roll-button" type="button" data-roll-type="damage" data-weapon-id="${escapeAttr(item.id)}">Damage</button>
        </div>`,
        math: [
          ...weapon.attackParts.map(part => ({ label: `Hit: ${part.label}`, value: part.value, display: part.display })),
          ...weapon.damageParts.map(part => ({ label: `Damage: ${part.label}`, value: part.value, display: part.display || (part.value === null ? weapon.damage : '') })),
        ].filter(part => part.display || part.value !== null && part.value !== undefined || part.label.includes('Damage: Damage die')),
      };
    });
  }

  function buildSpellActionCards(player, root) {
    return (player.spells || []).map(name => {
      const spell = findSpellDetails(name, player, root);
      const math = getSpellMathParts(player, spell);
      return {
        group: classifySpellTiming(spell && spell.castingTime),
        sourceType: 'spell',
        type: 'Spell',
        title: `Cast ${name}`,
        meta: formatSpellMeta(spell),
        detail: summarizeSpellAction(player, spell),
        tags: buildSpellTags(player, spell),
        controls: renderSpellActionControls(player, spell, name),
        math,
      };
    });
  }

  function renderSpellActionControls(player, spell, spellName) {
    if (!spell) {
      return `<div class="action-controls">
        <button class="roll-button" type="button" data-cast-spell="${escapeAttr(spellName)}" disabled>Cast</button>
        <span class="use-status">Rules missing</span>
      </div>`;
    }
    const slot = getSpellSlotState(player, spell);
    const disabled = slot && slot.level > 0 && slot.available <= 0;
    const rollProfile = getSpellRollProfile(player, spell, slot && slot.level);
    const controls = [
      renderSpellSlotChoiceSelect(player, spell, spellName),
      `<button class="roll-button" type="button" data-cast-spell="${escapeAttr(spellName)}" ${disabled ? 'disabled' : ''}>Cast</button>`,
      rollProfile ? `<button class="roll-button" type="button" data-roll-spell="${escapeAttr(spellName)}">${escapeHtml(formatSpellRollButtonLabel(rollProfile))}</button>` : '',
    ].filter(Boolean);
    if (slot) controls.push(`<span class="use-status">${escapeHtml(formatSpellSlotStatus(slot))}</span>`);
    return `<div class="action-controls">${controls.join('')}</div>`;
  }

  function buildSpellScrollActionCards(player, root) {
    return (player.spellScrolls || []).map(scroll => {
      const spell = findSpellDetails(scroll.spellName, player, root);
      const group = classifySpellTiming(scroll.castingTime || (spell && spell.castingTime));
      return {
        group,
        sourceType: 'spell',
        type: 'Scroll',
        title: `Use Scroll: ${scroll.spellName}`,
        meta: [scroll.source || scroll.scrollName || 'Spell Scroll', formatSpellMeta(spell)].filter(Boolean).join(' / '),
        detail: summarizeScrollAction(scroll, spell),
        tags: buildSpellScrollTags(scroll, spell),
        controls: renderSpellScrollActionControls(player, scroll, spell),
        math: getScrollMathParts(scroll, spell),
      };
    });
  }

  function renderSpellScrollActionControls(player, scroll, spell) {
    const id = scroll && scroll.id ? scroll.id : slugify(`${scroll && scroll.scrollName || 'spell-scroll'}-${scroll && scroll.spellName || ''}`);
    const used = clampNumber(Number(player.actionUses && player.actionUses[id]) || 0, 0, 1);
    const castLevel = getSpellLevelNumber(scroll && scroll.level) || getSpellLevelNumber(spell && spell.level);
    const rollProfile = getSpellRollProfile(player, spell, castLevel);
    const controls = [
      `<button class="roll-button" type="button" data-use-scroll="${escapeAttr(id)}" ${used >= 1 ? 'disabled' : ''}>${used >= 1 ? 'Used' : 'Use Scroll'}</button>`,
    ];
    if (rollProfile) controls.push(`<button class="roll-button" type="button" data-roll-scroll="${escapeAttr(id)}">${escapeHtml(formatSpellRollButtonLabel(rollProfile))}</button>`);
    controls.push(`<span class="use-status">${used >= 1 ? 'Used' : 'Ready'}</span>`);
    return `<div class="action-controls">${controls.join('')}</div>`;
  }

  function buildRuleActionCards(player) {
    return (player.ruleActions || [])
      .filter(action => action.sourceType !== 'spell' && action.sourceType !== 'item')
      .map(action => {
        const resourceId = getRuleActionResourceId(player, action);
        const detail = getRuleActionDetail(player, action);
        return {
          group: normalizeRuleActionGroup(action),
          sourceType: action.sourceType || 'rule',
          type: action.type || action.sourceType || 'Rule',
          title: action.title || action.name || 'Action',
          meta: [action.sourceType, action.className, action.itemName].filter(Boolean).join(' / '),
          detail,
          tags: Array.isArray(action.tags) ? action.tags.filter(Boolean).slice(0, 5) : [],
          controls: resourceId ? renderActionResourceControls(player, resourceId) : '',
        };
      });
  }

  function getRuleActionDetail(player, action) {
    const detail = cleanRulesText(action && (action.detail || action.text));
    const feature = findRuleFeatureForAction(player, action);
    const featureText = cleanRulesText(feature && feature.text);
    if (featureText && featureText.length > detail.length) return summarizeActionText(featureText, 620);
    return detail;
  }

  function findRuleFeatureForAction(player, action) {
    if (!player || !action) return null;
    const features = player.ruleFeatures || [];
    return features.find(feature => feature.id && feature.id === action.sourceId)
      || features.find(feature => normalizeName(feature.name) === normalizeName(action.title));
  }

  function summarizeActionText(text, maxLength) {
    const sentences = splitSentences(text);
    let out = '';
    let count = 0;
    for (const sentence of sentences) {
      const next = `${out} ${sentence}`.trim();
      if (next.length > maxLength) break;
      out = next;
      count += 1;
      if (count >= 5) break;
    }
    return out || truncateText(text, maxLength);
  }

  function hasCanonicalClassActions(player) {
    return (player.ruleActions || []).some(action => action.sourceType === 'class' || action.sourceType === 'subclass');
  }

  function normalizeActionGroup(group) {
    const text = cleanDetailValue(group);
    const allowed = new Set(['Action', 'Bonus Action', 'Reaction', 'Triggered', 'Free / Utility', 'Out of Combat']);
    return allowed.has(text) ? text : 'Free / Utility';
  }

  function normalizeRuleActionGroup(action) {
    const current = normalizeActionGroup(action && action.group);
    const detail = normalizeName(action && action.detail);
    if (hasBonusActionTiming(detail)) return 'Bonus Action';
    if (hasActionTiming(detail)) return 'Action';
    if (hasReactionTiming(detail)) return 'Reaction';
    return current;
  }

  function getRuleActionResourceId(player, action) {
    if (!action) return '';
    if (findPlayerResource(player, action.id)) return action.id;
    if (findPlayerResource(player, action.sourceId)) return action.sourceId;
    const titleId = slugify(action.title || action.name || '');
    if (findPlayerResource(player, titleId)) return titleId;
    const text = normalizeName(`${action.title || ''} ${action.detail || ''} ${Array.isArray(action.tags) ? action.tags.join(' ') : ''}`);
    if (text.includes('channel divinity') && findPlayerResource(player, 'cleric-channel-divinity')) return 'cleric-channel-divinity';
    return '';
  }

  function buildClassActionCards(player) {
    const cards = [];
    if (!isCleric(player)) return cards;

    const level = Number(player.level) || 1;
    const spellDc = Number(player.spellSaveDc) || calculateSpellSaveDc(player);
    const channelUses = getClericChannelUses(level);
    const channelTag = channelUses ? `${channelUses}/rest` : 'Channel Divinity';

    if (level >= 2) {
      cards.push({
        group: 'Action',
        sourceType: 'class',
        type: 'Channel Divinity',
        title: 'Turn Undead',
        meta: `30 ft / WIS save DC ${spellDc}`,
        detail: level >= 5
          ? `Undead that fail are turned for up to 1 minute. CR 1/2 or lower undead are destroyed by Claire at level ${level}.`
          : 'Undead that fail are turned for up to 1 minute.',
        tags: [channelTag, 'Undead', level >= 5 ? 'Destroy CR 1/2' : ''],
        controls: findPlayerResource(player, 'cleric-channel-divinity') ? renderActionResourceControls(player, 'cleric-channel-divinity') : '',
        math: getSpellDcMathParts(player, spellDc),
      });
    }

    if (level >= 5) {
      cards.push({
        group: 'Triggered',
        sourceType: 'class',
        type: 'Cleric',
        title: 'Destroy Undead',
        meta: 'Turn Undead rider',
        detail: 'When an undead of CR 1/2 or lower fails Claire\'s Turn Undead save, it is destroyed instead of only turned.',
        tags: ['Level 5', 'CR 1/2 or lower'],
      });
    }

    if (isTempestCleric(player)) {
      cards.push({
        group: 'Reaction',
        sourceType: 'subclass',
        type: 'Tempest Cleric',
        title: 'Wrath of the Storm',
        meta: `5 ft / DEX save DC ${spellDc}`,
        detail: 'When a creature within 5 ft hits Claire, she can force a Dexterity save; failed save takes 2d8 lightning or thunder, success takes half.',
        tags: [`${Math.max(calculateModifier(Number(player.abilities && player.abilities.wis) || 10), 1)}/long rest`, 'Lightning/Thunder'],
        math: getSpellDcMathParts(player, spellDc),
      });

      if (level >= 2) {
        cards.push({
          group: 'Triggered',
          sourceType: 'subclass',
          type: 'Channel Divinity',
          title: 'Destructive Wrath',
          meta: 'Lightning or thunder damage',
          detail: 'When Claire rolls lightning or thunder damage, she can spend Channel Divinity to deal maximum damage instead of rolling.',
          tags: [channelTag, 'Max damage'],
          controls: findPlayerResource(player, 'cleric-channel-divinity') ? renderActionResourceControls(player, 'cleric-channel-divinity') : '',
        });
      }

      if (level >= 6) {
        cards.push({
          group: 'Triggered',
          sourceType: 'subclass',
          type: 'Tempest Cleric',
          title: 'Thunderbolt Strike',
          meta: 'Large or smaller creature',
          detail: 'When Claire deals lightning damage to a Large or smaller creature, she can push it up to 10 ft away.',
          tags: ['Lightning', 'Push 10 ft'],
        });
      }
    }

    return cards;
  }

  function buildItemActionCards(player) {
    return (player.inventory || []).flatMap(item => {
      if (item.details && item.details.actions.length) {
        return item.details.actions.map(action => {
          const isEquipped = isItemEquipped(player, item);
          return {
            group: normalizeActionGroup(action.group),
            sourceType: 'item',
            type: action.type || 'Item',
            title: action.title || action.name || item.name,
            meta: [item.name, formatItemSubtitle(item)].filter(Boolean).join(' / '),
            detail: truncateText(action.detail || action.text || '', 280),
            tags: [isEquipped ? 'Equipped' : 'Inventory', item.details && item.details.attunement ? 'Attunement' : '', ...(action.tags || [])].filter(Boolean),
            controls: renderActionResourceControls(player, action.id),
          };
        });
      }
      return (item.abilities || [])
        .filter(text => isActionableItemAbility(text))
        .map(text => {
          const ability = parseItemAbilityText(text);
          const isEquipped = isItemEquipped(player, item);
          return {
            group: classifyRulesTiming(text),
            sourceType: 'item',
            type: 'Item',
            title: ability.name || item.name,
            meta: [item.name, formatItemSubtitle(item)].filter(Boolean).join(' / '),
            detail: truncateText(ability.detail || text, 280),
            tags: [isEquipped ? 'Equipped' : 'Inventory', item.details && item.details.attunement ? 'Attunement' : ''].filter(Boolean),
          };
        });
    });
  }

  function isActionableItemAbility(text) {
    const normalized = normalizeName(text);
    return normalized.includes('as an action')
      || normalized.includes('use an action')
      || normalized.includes('bonus action')
      || normalized.includes('reaction')
      || normalized.includes('before determining')
      || normalized.includes('on a hit')
      || normalized.includes('when you are')
      || normalized.includes('whenever you')
      || normalized.includes('1 day');
  }

  function parseItemAbilityText(text) {
    const match = String(text || '').match(/^([^:]{2,80}):\s*(.+)$/);
    return match
      ? { name: match[1].trim(), detail: match[2].trim() }
      : { name: '', detail: String(text || '').trim() };
  }

  function isCleric(player) {
    return normalizeName(player.class).includes('cleric') || normalizeName(player.classUrl).includes('cleric');
  }

  function isTempestCleric(player) {
    const haystack = normalizeName(`${player.class || ''} ${player.classUrl || ''} ${player.searchText || ''}`);
    return haystack.includes('tempest');
  }

  function getClericChannelUses(level) {
    if (level >= 18) return 3;
    if (level >= 6) return 2;
    if (level >= 2) return 1;
    return 0;
  }

  function calculateSpellSaveDc(player) {
    const ability = player.spellcasting;
    if (!ability) return null;
    return 8 + calculateModifier(Number(player.abilities && player.abilities[ability]) || 10) + (Number(player.proficiencyBonus) || 0);
  }

  function getSpellDcMathParts(player, spellDc) {
    const ability = player.spellcasting;
    if (!ability || !spellDc) return [];
    return [
      { label: 'Base save DC', display: '8' },
      { label: `${ABILITY_NAMES[ability]} modifier`, value: calculateModifier(Number(player.abilities && player.abilities[ability]) || 10) },
      { label: 'Proficiency', value: Number(player.proficiencyBonus) || 0 },
      { label: 'Save DC', display: String(spellDc) },
    ];
  }

  function buildCoreActionCards(player) {
    const athletics = getSkillBonus(player, 'athletics');
    const stealth = getSkillBonus(player, 'stealth');
    const investigation = getSkillBonus(player, 'investigation');
    const perception = getSkillBonus(player, 'perception');
    return [
      coreAction('Action', 'Core', 'Attack', 'Make one weapon attack, or more if a class feature grants extra attacks.'),
      coreAction('Action', 'Core', 'Cast a Spell', 'Cast a spell or use a spell scroll with a casting time of 1 action.'),
      coreAction('Action', 'Core', 'Dash', 'Gain extra movement equal to your speed.'),
      coreAction('Action', 'Core', 'Disengage', 'Your movement does not provoke opportunity attacks this turn.'),
      coreAction('Action', 'Core', 'Dodge', 'Attackers you can see have disadvantage; Dexterity saves have advantage.'),
      coreAction('Action', 'Core', 'Help', 'Give an ally advantage on a check or attack against a nearby target.'),
      coreAction('Action', 'Core', 'Hide', `Dexterity (Stealth) ${formatBonus(stealth)}.`),
      coreAction('Action', 'Core', 'Ready', 'Prepare a reaction for a trigger you choose.'),
      coreAction('Action', 'Core', 'Search', `Investigation ${formatBonus(investigation)} or Perception ${formatBonus(perception)}.`),
      coreAction('Action', 'Core', 'Use an Object', 'Use an object that needs your action.'),
      coreAction('Action', 'Contest', 'Grapple / Shove', `Strength (Athletics) ${formatBonus(athletics)} contested by the target.`),
      coreAction('Reaction', 'Core', 'Opportunity Attack', 'Make one melee attack when a creature leaves your reach.'),
      coreAction('Free / Utility', 'Core', 'Interact with Object', 'Draw, stow, open, pick up, or otherwise handle one simple object.'),
      coreAction('Out of Combat', 'Travel', 'Investigate / Scout', `Investigation ${formatBonus(investigation)}, Perception ${formatBonus(perception)}, or Stealth ${formatBonus(stealth)}.`),
      coreAction('Out of Combat', 'Rest', 'Short Rest', 'Spend hit dice and recover short-rest resources.'),
    ];
  }

  function coreAction(group, type, title, detail) {
    return { group, sourceType: 'core', type, title, detail, tags: [] };
  }

  function classifySpellTiming(castingTime) {
    const text = normalizeName(castingTime);
    if (text.includes('bonus action')) return 'Bonus Action';
    if (text.includes('reaction')) return 'Reaction';
    if (text.includes('minute') || text.includes('hour')) return 'Out of Combat';
    return 'Action';
  }

  function classifyRulesTiming(text) {
    const normalized = normalizeName(text);
    if (hasBonusActionTiming(normalized)) return 'Bonus Action';
    if (hasActionTiming(normalized)) return 'Action';
    if (hasReactionTiming(normalized)) return 'Reaction';
    if (normalized.includes('short rest') || normalized.includes('long rest') || normalized.includes('minute') || normalized.includes('hour')) return 'Out of Combat';
    return 'Free / Utility';
  }

  function hasBonusActionTiming(clean) {
    return /\b(as a bonus action|use a bonus action|use your bonus action|uses a bonus action|bonus action to|take a bonus action)\b/.test(clean)
      || clean === 'bonus action'
      || clean === '1 bonus action';
  }

  function hasActionTiming(clean) {
    return /\b(as an action|use an action|use your action|uses an action|spend an action|take an action|you can take the action|action to|requires an action|requires your action)\b/.test(clean)
      || clean === 'action'
      || clean === '1 action';
  }

  function hasReactionTiming(clean) {
    return /\b(as a reaction|use a reaction|use your reaction|uses its reaction|using your reaction|spend your reaction|take a reaction|reaction to)\b/.test(clean)
      || clean === 'reaction'
      || clean === '1 reaction';
  }

  function summarizeSpellAction(player, spell) {
    if (!spell) return 'Spell rules are not loaded yet.';
    const save = getSpellSaveAbility(spell);
    const needsAttack = spellNeedsAttack(spell);
    const parts = [];
    if (needsAttack && player.spellAttack !== null && player.spellAttack !== undefined) parts.push(`spell attack ${formatBonus(player.spellAttack)}`);
    if (save && player.spellSaveDc !== null && player.spellSaveDc !== undefined) parts.push(`${save.toUpperCase()} save DC ${player.spellSaveDc}`);
    if (spell.range) parts.push(`range ${spell.range}`);
    return parts.length ? parts.join('; ') : truncateText(spell.text || '', 220);
  }

  function summarizeScrollAction(scroll, spell) {
    const save = getSpellSaveAbility(spell);
    const parts = [];
    if (scroll.attackBonus) parts.push(`scroll attack +${scroll.attackBonus}`);
    if (scroll.saveDc) parts.push(`${save ? `${save.toUpperCase()} save ` : ''}DC ${scroll.saveDc}`);
    if (spell && spell.range) parts.push(`range ${spell.range}`);
    if (parts.length) return parts.join('; ');
    return spell ? truncateText(spell.text || '', 220) : 'Spell scroll rules are not loaded yet.';
  }

  function buildSpellTags(player, spell) {
    if (!spell) return [];
    return [
      spell.level || 'Cantrip',
      spell.school,
      spell.castingTime,
      spellNeedsAttack(spell) && player.spellAttack !== null ? `Hit ${formatBonus(player.spellAttack)}` : '',
      getSpellSaveAbility(spell) && player.spellSaveDc !== null ? `DC ${player.spellSaveDc}` : '',
    ].filter(Boolean);
  }

  function buildSpellScrollTags(scroll, spell) {
    return [
      'Consumable',
      scroll.level || (spell && spell.level),
      scroll.school || (spell && spell.school),
      scroll.castingTime || (spell && spell.castingTime),
      scroll.attackBonus ? `Hit +${scroll.attackBonus}` : '',
      scroll.saveDc ? `DC ${scroll.saveDc}` : '',
    ].filter(Boolean);
  }

  function getSpellMathParts(player, spell) {
    if (!spell) return [];
    const ability = player.spellcasting;
    const abilityMod = ability ? calculateModifier(Number(player.abilities && player.abilities[ability]) || 10) : null;
    const rollProfile = getSpellRollProfile(player, spell, getSpellLevelNumber(spell.level));
    const parts = [];
    if (rollProfile) {
      parts.push({ label: `${capitalize(rollProfile.kind)} roll`, display: `${rollProfile.formula}${rollProfile.damageType ? ` ${rollProfile.damageType}` : ''}` });
      if (rollProfile.bonusLabel) parts.push({ label: rollProfile.bonusLabel, value: rollProfile.bonus });
      if (rollProfile.upcast) parts.push({ label: 'At higher levels', display: `+${rollProfile.upcast.dice} per slot above level ${rollProfile.upcast.aboveLevel}` });
    }
    if (spellNeedsAttack(spell) && player.spellAttack !== null && ability) {
      parts.push({ label: `${ABILITY_NAMES[ability]} modifier`, value: abilityMod });
      parts.push({ label: 'Proficiency', value: Number(player.proficiencyBonus) || 0 });
      parts.push({ label: 'Spell attack', display: formatBonus(player.spellAttack) });
    }
    if (getSpellSaveAbility(spell) && player.spellSaveDc !== null && ability) {
      parts.push({ label: 'Base save DC', display: '8' });
      parts.push({ label: `${ABILITY_NAMES[ability]} modifier`, value: abilityMod });
      parts.push({ label: 'Proficiency', value: Number(player.proficiencyBonus) || 0 });
      parts.push({ label: 'Spell save DC', display: String(player.spellSaveDc) });
    }
    return parts;
  }

  function getScrollMathParts(scroll, spell) {
    const parts = [];
    if (scroll.attackBonus) parts.push({ label: 'Scroll attack bonus', display: `+${scroll.attackBonus}` });
    if (scroll.saveDc) parts.push({ label: `${getSpellSaveAbility(spell) ? `${getSpellSaveAbility(spell).toUpperCase()} save ` : ''}DC`, display: String(scroll.saveDc) });
    if (scroll.source) parts.push({ label: 'Source', display: scroll.source });
    return parts;
  }

  function renderSpellSlotChoiceSelect(player, spell, spellName) {
    const choices = getSpellSlotChoices(player, spell);
    if (!choices.length) return '';
    const selected = getDefaultSpellSlotChoice(player, spell);
    return `<select class="spell-slot-select" data-spell-slot-choice="${escapeAttr(spellName)}" aria-label="${escapeAttr(`${spellName} slot level`)}">
      ${choices.map(choice => {
        const value = formatSpellSlotChoiceValue(choice);
        const label = `${choice.label} (${choice.available}/${choice.max})`;
        return `<option value="${escapeAttr(value)}" ${selected && value === formatSpellSlotChoiceValue(selected) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
      }).join('')}
    </select>`;
  }

  function getSpellSlotChoices(player, spell) {
    const baseLevel = getSpellLevelNumber(spell && spell.level);
    if (!baseLevel) return [];
    return getSpellSlotChoicesForLevel(player, baseLevel);
  }

  function getSpellSlotChoicesForLevel(player, minLevel) {
    const slots = player.spellSlots || {};
    const uses = player.spellSlotUses || {};
    const choices = Object.entries(slots)
      .filter(([level, max]) => level !== 'pact' && Number(level) >= minLevel && Number(max) > 0)
      .map(([level, max]) => {
        const total = Number(max);
        const used = clampNumber(Number(uses[level]) || 0, 0, total);
        return { level: Number(level), slotKey: String(level), label: `Level ${level}`, max: total, used, available: total - used };
      });

    const pact = slots.pact && typeof slots.pact === 'object' ? slots.pact : null;
    if (pact && Number(pact.slots) > 0 && Number(pact.level) >= minLevel) {
      const total = Number(pact.slots);
      const used = clampNumber(Number(uses.pact) || 0, 0, total);
      choices.push({ level: Number(pact.level), slotKey: 'pact', label: `Pact L${pact.level}`, max: total, used, available: total - used });
    }

    return choices.sort((a, b) => a.level - b.level || (a.slotKey === 'pact' ? 1 : -1));
  }

  function getDefaultSpellSlotChoice(player, spell) {
    const choices = getSpellSlotChoices(player, spell);
    return choices.find(choice => choice.available > 0) || choices[0] || null;
  }

  function getSelectedSpellSlotChoice(trigger, player, spell) {
    const controls = trigger && trigger.closest && trigger.closest('.action-controls');
    const select = controls && controls.querySelector('[data-spell-slot-choice]');
    if (!select) return getDefaultSpellSlotChoice(player, spell);
    return parseSpellSlotChoice(select.value, player, spell) || getDefaultSpellSlotChoice(player, spell);
  }

  function parseSpellSlotChoice(value, player, spell) {
    const target = String(value || '');
    return getSpellSlotChoices(player, spell).find(choice => formatSpellSlotChoiceValue(choice) === target) || null;
  }

  function formatSpellSlotChoiceValue(choice) {
    return `${choice.slotKey}|${choice.level}`;
  }

  function getSpellRollProfile(player, spell, castLevel = null) {
    if (!spell) return null;
    const baseLevel = getSpellLevelNumber(spell.level);
    const level = Math.max(baseLevel, Number(castLevel) || baseLevel || 0);
    const healing = parseSpellHealing(spell);
    const baseDice = spell.damage && spell.damage.dice ? spell.damage.dice : healing && healing.dice;
    if (!baseDice) return null;

    const kind = spell.damage && spell.damage.dice ? 'damage' : 'healing';
    const damageType = kind === 'damage' ? spell.damage.damageType : '';
    const terms = parseDiceTerms(baseDice);
    if (!terms.length) return null;

    const upcast = getSpellUpcastRule(spell, kind);
    const steps = upcast && level > upcast.aboveLevel ? level - upcast.aboveLevel : 0;
    if (upcast && steps > 0) {
      parseDiceTerms(upcast.dice).forEach(term => addDiceTerm(terms, { ...term, count: term.count * steps }));
    }

    const ability = healing && healing.abilityModifier ? player.spellcasting : '';
    const bonus = ability ? calculateModifier(Number(player.abilities && player.abilities[ability]) || 10) : 0;
    const bonusLabel = ability ? `${ABILITY_NAMES[ability]} modifier` : '';

    return {
      kind,
      spellName: spell.name,
      castLevel: level,
      baseLevel,
      diceTerms: terms,
      bonus,
      bonusLabel,
      damageType,
      upcast,
      upcastSteps: steps,
      formula: formatDiceFormula(terms, bonus),
    };
  }

  function parseSpellHealing(spell) {
    const text = cleanRulesText(`${spell && spell.text || ''} ${spell && spell.higherLevels || ''}`);
    const match = text.match(/regain(?:s)?(?: a number of)? hit points equal to (\d+d\d+)(?:\s*\+\s*your spellcasting ability modifier)?/i);
    if (!match) return null;
    return {
      dice: match[1],
      abilityModifier: /regain(?:s)?(?: a number of)? hit points equal to \d+d\d+\s*\+\s*your spellcasting ability modifier/i.test(text),
    };
  }

  function getSpellUpcastRule(spell, kind) {
    const text = cleanRulesText(spell && spell.higherLevels);
    if (!text) return null;
    const kindPattern = kind === 'healing' ? 'healing' : 'damage';
    let match = text.match(new RegExp(`${kindPattern} increases by (\\d+d\\d+) for each slot level above (\\d+)(?:st|nd|rd|th)`, 'i'));
    if (!match) match = text.match(/increases by (\d+d\d+) for each slot level above (\d+)(?:st|nd|rd|th)/i);
    if (!match) return null;
    return { dice: match[1], aboveLevel: Number(match[2]) || getSpellLevelNumber(spell.level) };
  }

  function parseDiceTerms(expression) {
    const matches = String(expression || '').match(/\d+d\d+/gi) || [];
    const terms = [];
    matches.forEach(match => {
      const [, count, sides] = match.match(/(\d+)d(\d+)/i) || [];
      if (!count || !sides) return;
      addDiceTerm(terms, { count: Number(count), sides: Number(sides) });
    });
    return terms;
  }

  function addDiceTerm(terms, term) {
    if (!term || !term.count || !term.sides) return;
    const existing = terms.find(candidate => candidate.sides === term.sides);
    if (existing) existing.count += term.count;
    else terms.push({ count: term.count, sides: term.sides });
  }

  function formatDiceFormula(terms, bonus = 0) {
    const pieces = terms.map(formatDiceTerm);
    if (bonus) pieces.push(String(bonus));
    return pieces.join(' + ').replace(/\+ -/g, '- ');
  }

  function formatDiceTerm(term) {
    return `${term.count}d${term.sides}`;
  }

  function formatSpellRollButtonLabel(profile) {
    return profile && profile.kind === 'healing' ? 'Healing' : 'Damage';
  }

  function capitalize(value) {
    const text = String(value || '');
    return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
  }

  function spellNeedsAttack(spell) {
    if (spell && spell.attackType) return true;
    const text = normalizeName(`${spell && spell.text} ${spell && spell.higherLevels}`);
    return text.includes('spell attack');
  }

  function getSpellSaveAbility(spell) {
    if (spell && spell.saveAbility) return spell.saveAbility;
    const text = String(`${spell && spell.text || ''} ${spell && spell.higherLevels || ''}`);
    const match = text.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw/i);
    return match ? match[1].slice(0, 3).toLowerCase() : '';
  }

  function renderMathParts(parts, total, baseLabel = '', totalDisplay = '') {
    const rows = (parts || []).map(part => {
      const value = part.display || (part.value === null || part.value === undefined ? baseLabel : formatBonus(part.value));
      return `<div><span>${escapeHtml(part.label)}</span><strong>${escapeHtml(value)}</strong></div>`;
    }).join('');
    return `<div class="math-list">${rows}<div class="math-total"><span>Total</span><strong>${escapeHtml(totalDisplay || (baseLabel ? formatDamageFormula(baseLabel, total) : formatBonus(total)))}</strong></div></div>`;
  }

  function getSpellSlotState(player, spell) {
    const level = getSpellLevelNumber(spell && spell.level);
    if (!level) return { level: 0, slotKey: '', label: 'Cantrip', max: null, used: 0, available: null };
    return getAvailableSpellSlot(player, level) || { level, slotKey: String(level), label: `Level ${level}`, max: 0, used: 0, available: 0 };
  }

  function getAvailableSpellSlot(player, minLevel) {
    const options = getSpellSlotChoicesForLevel(player, minLevel);
    return options.find(option => option.available > 0) || options[0] || null;
  }

  function getSpellLevelNumber(level) {
    const text = normalizeName(level);
    if (!text || text.includes('cantrip')) return 0;
    const match = text.match(/\d+/);
    return match ? Number(match[0]) || 0 : 0;
  }

  function formatSpellSlotStatus(slot) {
    if (!slot) return '';
    if (slot.level === 0) return 'Cantrip';
    if (!slot.max) return 'No slots';
    return `${slot.available} / ${slot.max} ${slot.label}`;
  }

  function findPlayerResource(player, resourceId) {
    if (!resourceId) return null;
    return uniqueRuleRecords(player && player.resources || []).find(resource => resource.id === resourceId) || null;
  }

  function getResourceUseState(player, resourceId) {
    const resource = findPlayerResource(player, resourceId);
    if (!resource) return null;
    const max = evaluateResourceMax(resource, player);
    if (max === null) return { resource, max, used: null, available: null };
    const used = clampNumber(Number(player.resourceUses && player.resourceUses[resource.id]) || 0, 0, max);
    return { resource, max, used, available: max - used };
  }

  function renderActionResourceControls(player, resourceId, label = 'Use') {
    const state = getResourceUseState(player, resourceId);
    if (!state || state.max === null) return '';
    return `<div class="action-controls">
      ${renderResourceSpendButton(resourceId, label, state.available <= 0)}
      <span class="use-status">${escapeHtml(`${state.available} / ${state.max} left`)}</span>
    </div>`;
  }

  function renderResourceSpendButton(resourceId, label, disabled = false) {
    return `<button class="roll-button" type="button" data-resource-spend="${escapeAttr(resourceId)}" ${disabled ? 'disabled' : ''}>${escapeHtml(label || 'Use')}</button>`;
  }

  function renderResourcesPanel(root, player) {
    const target = root.querySelector('[data-resources-panel]');
    if (!target) return;
    target.innerHTML = `<div class="resources-panel">
      <section class="resource-toolbar">
        <div>
          <h2>Rest</h2>
          <p class="empty-note">Rest buttons reset tracked uses on this sheet and save the change.</p>
        </div>
        <div class="form-actions">
          <button type="button" data-rest-type="short">Short Rest</button>
          <button type="button" data-rest-type="long">Long Rest</button>
          <span data-resource-status></span>
        </div>
      </section>
      <section>
        <h2>Health</h2>
        <div class="resource-grid">
          ${renderResourceStat('Current HP', player.currentHp === null ? '-' : player.currentHp)}
          ${renderResourceStat('Temp HP', player.tempHp || 0)}
          ${renderResourceStat('Max HP', player.maxHp === null ? '-' : player.maxHp)}
          ${renderResourceStat('Hit Dice', player.hitDice || '-')}
        </div>
      </section>
      <section>
        <h2>Spell Slots</h2>
        ${renderSpellSlotTracker(player)}
      </section>
      <section>
        <h2>Resources</h2>
        ${renderResourceTracker(player)}
      </section>
      <section>
        <h2>Conditions</h2>
        <div class="chip-list">${player.conditions.length ? player.conditions.map(condition => `<span>${escapeHtml(condition)}</span>`).join('') : '<span>No conditions tracked.</span>'}</div>
        <p class="empty-note">Concentration: ${escapeHtml(player.concentration || 'None')}</p>
      </section>
      <div class="roll-log" data-roll-log></div>
    </div>`;
  }

  function renderResourceStat(label, value) {
    return `<div class="info-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function renderSpellSlotTracker(player) {
    const slots = player.spellSlots || {};
    const entries = Object.entries(slots)
      .filter(([level, max]) => level !== 'pact' && Number(max) > 0)
      .sort((a, b) => Number(a[0]) - Number(b[0]));
    const pact = slots.pact && typeof slots.pact === 'object' ? slots.pact : null;
    if (!entries.length && !pact) return '<p class="empty-note">No spell slots tracked.</p>';
    const rows = entries.map(([level, max]) => renderSlotRow(`Level ${level}`, level, Number(max), player.spellSlotUses && player.spellSlotUses[level]));
    if (pact) rows.push(renderSlotRow(`Pact slots (L${pact.level})`, 'pact', Number(pact.slots), player.spellSlotUses && player.spellSlotUses.pact));
    return `<div class="resource-list">${rows.join('')}</div>`;
  }

  function renderSlotRow(label, slotKey, max, usedValue) {
    const used = clampNumber(Number(usedValue) || 0, 0, max);
    return `<div class="resource-row">
      <span><strong>${escapeHtml(label)}</strong><small>${max - used} / ${max} available</small></span>
      <span class="resource-controls">
        <input type="number" min="0" max="${max}" value="${used}" data-spell-slot-use="${escapeAttr(slotKey)}" aria-label="${escapeAttr(label)} used">
        <button class="roll-button" type="button" data-spell-slot-spend="${escapeAttr(slotKey)}" ${used >= max ? 'disabled' : ''}>Use</button>
      </span>
    </div>`;
  }

  function renderResourceTracker(player) {
    const resources = uniqueRuleRecords(player.resources || [])
      .filter(resource => resource.id !== 'spell-slots')
      .slice(0, 40);
    if (!resources.length) return '<p class="empty-note">No limited resources tracked.</p>';
    return `<div class="resource-list">${resources.map(resource => {
      const max = evaluateResourceMax(resource, player);
      const used = max === null ? null : clampNumber(Number(player.resourceUses && player.resourceUses[resource.id]) || 0, 0, max);
      return `<div class="resource-row">
        <span>
          <strong>${escapeHtml(resource.name || resource.id)}</strong>
          <small>${escapeHtml(formatResourceLine(resource, max, used))}</small>
        </span>
        ${max === null ? '<span class="empty-note">Manual</span>' : `<span class="resource-controls">
          <input type="number" min="0" max="${max}" value="${used}" data-resource-use="${escapeAttr(resource.id)}" aria-label="${escapeAttr(resource.name || resource.id)} used">
          ${renderResourceSpendButton(resource.id, 'Use', used >= max)}
        </span>`}
      </div>`;
    }).join('')}</div>`;
  }

  function formatResourceLine(resource, max, used) {
    const reset = formatReset(resource.reset);
    const source = formatResourceSource(resource);
    const prefix = source ? `${source}; ` : '';
    if (max === null) return `${prefix}${formatResourceMax(resource, null)}; resets ${reset}`;
    return `${prefix}${max - used} / ${max} available; resets ${reset}`;
  }

  function formatResourceSource(resource) {
    if (!resource) return '';
    if (resource.itemName) return resource.itemName;
    if (resource.subclassName) return resource.subclassName;
    if (resource.className) return resource.className;
    if (resource.sourceType && resource.sourceType !== 'core') return capitalize(resource.sourceType);
    return '';
  }

  function evaluateResourceMax(resource, player) {
    if (Number.isFinite(Number(resource.max))) return Number(resource.max);
    const formula = String(resource.maxFormula || '');
    if (!player || !formula) return null;
    const level = Number(player.level) || 1;
    const wisMod = calculateModifier(Number(player.abilities && player.abilities.wis) || 10);
    const chaMod = calculateModifier(Number(player.abilities && player.abilities.cha) || 10);
    if (formula === 'level') return level;
    if (formula === 'level * 5') return level * 5;
    if (formula.includes('clericChannelDivinityUses')) return level >= 18 ? 3 : level >= 6 ? 2 : level >= 2 ? 1 : 0;
    if (formula.includes('barbarianRages')) return level >= 20 ? 999 : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
    if (formula.includes('chaMod')) return Math.max(1, chaMod);
    if (formula.includes('level >= 17')) return level >= 17 ? 2 : 1;
    if (formula.includes('level >= 14')) return level >= 14 ? 3 : 2;
    if (formula.includes('wisMod')) return Math.max(1, wisMod);
    return null;
  }

  function formatResourceMax(resource, player) {
    const max = evaluateResourceMax(resource, player);
    if (max !== null) return `${max} use${max === 1 ? '' : 's'}`;
    return resource.maxFormula || 'manual tracking';
  }

  function formatReset(reset) {
    const map = {
      shortRest: 'short rest',
      longRest: 'long rest',
      longRestHalf: 'long rest',
      dawn: 'dawn',
      dawnLose1d6: 'dawn, loses 1d6 charges',
      longRestUntilFontOfInspirationThenShortRest: 'long rest, then short rest at Bard 5',
      manual: 'manual',
    };
    return map[reset] || reset || 'manual';
  }

  function renderEquipmentPanel(root, player) {
    const target = root.querySelector('[data-equipment-panel]');
    if (!target) return;
    target.innerHTML = `<div class="equipment-manager">
      <div class="equipment-list" role="list">
        ${player.inventory.map(item => renderEquipmentRow(item, player)).join('')}
      </div>
      <section class="equipment-search-box">
        <h2>Add Equipment</h2>
        <input data-equipment-search-input type="search" placeholder="Search items by name, type, rarity, or rules text..." aria-label="Search equipment">
        <div class="equipment-search-results" data-equipment-search-results></div>
      </section>
    </div>`;
    ensureItemCatalog(root);
  }

  async function ensureItemCatalog(root) {
    if (root._itemCatalog || root._itemCatalogLoading) return;
    const target = root.querySelector('[data-equipment-panel]');
    if (!target) return;
    root._itemCatalogLoading = true;
    try {
      const response = await fetch(target.dataset.itemsUrl || '../../Assets/Rules/items.json');
      if (!response.ok) throw new Error(`Item catalog ${response.status}`);
      root._itemCatalog = await response.json();
      if (root._playerState) hydratePlayerSheet(root, root._playerState);
    } catch (error) {
      root._itemCatalog = [];
    } finally {
      root._itemCatalogLoading = false;
    }
  }

  function renderEquipmentSearchResults(root, query) {
    const target = root.querySelector('[data-equipment-search-results]');
    if (!target) return;
    const clean = normalizeName(query);
    const catalog = Array.isArray(root._itemCatalog) ? root._itemCatalog : [];
    if (!clean) {
      target.innerHTML = '<p class="empty-note">Start typing to search the item catalog.</p>';
      return;
    }
    if (!catalog.length) {
      target.innerHTML = '<p class="empty-note">Item catalog is still loading or unavailable.</p>';
      ensureItemCatalog(root);
      return;
    }

    const carried = new Set((root._playerState && root._playerState.equipment || []).map(normalizeName));
    const results = catalog
      .map(item => ({ item, score: scoreItemSearchResult(item, clean) }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || String(a.item.name || '').localeCompare(String(b.item.name || '')))
      .slice(0, 16);

    target.innerHTML = results.length ? results.map(({ item }) => {
      const details = normalizeItemDetails(item);
      const isCarried = carried.has(normalizeName(details.name));
      return `<article class="equipment-result">
        <span>
          <strong>${escapeHtml(details.name || item.name || 'Unnamed item')}</strong>
          <small>${escapeHtml([details.type, details.rarity, formatSource(details)].filter(Boolean).join(' / '))}</small>
          ${details.text ? `<small>${escapeHtml(truncateText(details.text, 180))}</small>` : ''}
        </span>
        <div class="equipment-result-actions">
          <button class="text-button" type="button" data-add-equipment="${escapeAttr(details.name || item.name || '')}">${isCarried ? 'Add Another' : 'Add'}</button>
        </div>
      </article>`;
    }).join('') : '<p class="empty-note">No matching items found.</p>';
  }

  function scoreItemSearchResult(item, query) {
    const name = normalizeName(item && item.name);
    const type = normalizeName(item && item.type);
    const rarity = normalizeName(item && item.rarity);
    const source = normalizeName(item && item.source);
    const text = normalizeName(`${item && item.properties || ''} ${item && item.text || ''}`);
    const haystack = `${name} ${type} ${rarity} ${source} ${text}`;
    const terms = query.split(/\s+/).filter(Boolean);
    if (name === query) return 120;
    if (name.startsWith(query)) return 100;
    if (name.includes(query)) return 80;
    if (terms.length > 1 && name.startsWith(terms[0]) && terms.every(term => haystack.includes(term))) return 75;
    if (`${type} ${rarity} ${source}`.includes(query)) return 45;
    if (haystack.includes(query)) return 20;
    if (terms.length > 1 && terms.every(term => haystack.includes(term))) return 15;
    return 0;
  }

  function renderSpellPanel(root, player) {
    const target = root.querySelector('[data-spell-panel]');
    if (!target) return;
    target.innerHTML = `<div class="spell-manager">
      <section>
        <h2>Known Spells</h2>
        <div class="spell-list">
          ${player.spells.length ? player.spells.map(name => renderKnownSpell(name, player, root)).join('') : '<p class="empty-note">No spells recorded.</p>'}
        </div>
      </section>
      <section>
        <h2>Spell Scrolls</h2>
        <div class="spell-list">
          ${player.spellScrolls.length ? player.spellScrolls.map(scroll => renderSpellScroll(scroll, player, root)).join('') : '<p class="empty-note">No spell scrolls recorded.</p>'}
        </div>
      </section>
      <section class="spell-search-box">
        <h2>Add Spell</h2>
        <input data-spell-search-input type="search" placeholder="Search spells by name, school, class, or text..." aria-label="Search spells">
        <div class="spell-search-results" data-spell-search-results></div>
      </section>
      <div class="roll-log" data-roll-log></div>
    </div>`;

    ensureSpellCatalog(root);
  }

  function renderKnownSpell(name, player, root) {
    const spell = findSpellDetails(name, player, root);
    return `<details class="spell-row">
      <summary>
        <span>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(formatSpellMeta(spell))}</small>
        </span>
        <div class="spell-row-actions">
          ${renderSpellActionControls(player, spell, name)}
          <button class="text-button" type="button" data-remove-spell="${escapeAttr(name)}">Remove</button>
        </div>
      </summary>
      ${renderSpellDetails(spell, player)}
    </details>`;
  }

  function renderSpellScroll(scroll, player, root) {
    const spell = findSpellDetails(scroll.spellName, player, root);
    return `<details class="spell-row spell-scroll-row">
      <summary>
        <span>
          <strong>${escapeHtml(scroll.spellName)}</strong>
          <small>${escapeHtml([scroll.source || scroll.scrollName || 'Spell Scroll', formatSpellMeta(spell), scroll.saveDc ? `DC ${scroll.saveDc}` : '', scroll.attackBonus ? `Attack +${scroll.attackBonus}` : ''].filter(Boolean).join(' / '))}</small>
        </span>
        <div class="spell-row-actions">
          ${renderSpellScrollActionControls(player, scroll, spell)}
          <span class="spell-source-pill">Scroll</span>
        </div>
      </summary>
      ${renderSpellDetails(spell, player, getSpellLevelNumber(scroll.level) || null)}
      ${scroll.text ? `<p class="item-rules"><strong>Scroll:</strong> ${escapeHtml(truncateText(scroll.text, 500))}</p>` : ''}
    </details>`;
  }

  function renderSpellDetails(spell, player = null, castLevel = null) {
    if (!spell) return '<p class="empty-note">No spell rules found yet.</p>';
    const rows = [
      ['Level', spell.level],
      ['School', spell.school],
      ['Casting Time', spell.castingTime],
      ['Range', spell.range],
      ['Duration', spell.duration],
      ['Components', spell.components],
      ['Classes', spell.classes || spell.optionalClasses],
      ['Source', spell.page ? `${spell.source} p. ${spell.page}` : spell.source],
    ].filter(([, value]) => value);
    return `<div class="spell-details-panel">
      <dl class="equipment-detail-grid">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
      ${renderSpellRollPreview(player, spell, castLevel)}
      ${spell.text ? `<p class="item-rules">${escapeHtml(spell.text)}</p>` : ''}
      ${spell.higherLevels ? `<p class="item-rules"><strong>At Higher Levels:</strong> ${escapeHtml(spell.higherLevels)}</p>` : ''}
    </div>`;
  }

  function renderSpellRollPreview(player, spell, castLevel = null) {
    const profile = getSpellRollProfile(player || {}, spell, castLevel || getSpellLevelNumber(spell && spell.level));
    if (!profile) return '';
    const rows = [
      ['Base roll', `${profile.formula}${profile.damageType ? ` ${profile.damageType}` : ''}`],
      profile.upcast ? ['Upcast', `+${profile.upcast.dice} per slot above level ${profile.upcast.aboveLevel}`] : null,
      profile.bonusLabel ? ['Modifier', `${profile.bonusLabel} ${formatBonus(profile.bonus)}`] : null,
    ].filter(Boolean);
    return `<div class="spell-roll-preview">
      <strong>${escapeHtml(`${capitalize(profile.kind)} Math`)}</strong>
      <div class="math-list">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>
    </div>`;
  }

  function formatSpellMeta(spell) {
    if (!spell) return 'Details unavailable';
    return [spell.level || 'Cantrip', spell.school, spell.castingTime, spell.range].filter(Boolean).join(' / ');
  }

  function findSpellDetails(name, player, root) {
    const details = player.spellDetails || {};
    const direct = details[name];
    if (direct) return normalizeSpellDetails(direct);
    const normalized = normalizeName(name);
    for (const spell of Object.values(details)) {
      if (normalizeName(spell && spell.name) === normalized) return normalizeSpellDetails(spell);
    }
    const catalog = root && Array.isArray(root._spellCatalog) ? root._spellCatalog : [];
    const found = catalog.find(spell => normalizeName(spell.name) === normalized);
    return found ? normalizeSpellDetails(found) : null;
  }

  async function ensureSpellCatalog(root) {
    if (root._spellCatalog || root._spellCatalogLoading) return;
    const target = root.querySelector('[data-spell-panel]');
    if (!target) return;
    root._spellCatalogLoading = true;
    try {
      const response = await fetch(target.dataset.spellsUrl || '../../data/spells.json');
      if (!response.ok) throw new Error(`Spell catalog ${response.status}`);
      root._spellCatalog = await response.json();
      if (root._playerState) {
        renderActionsPanel(root, root._playerState);
        renderSpellPanel(root, root._playerState);
      }
    } catch (error) {
      root._spellCatalog = [];
    } finally {
      root._spellCatalogLoading = false;
    }
  }

  function renderSpellSearchResults(root, query) {
    const target = root.querySelector('[data-spell-search-results]');
    if (!target) return;
    const clean = String(query || '').trim().toLowerCase();
    const catalog = Array.isArray(root._spellCatalog) ? root._spellCatalog : [];
    if (!clean) {
      target.innerHTML = '<p class="empty-note">Start typing to search the spell catalog.</p>';
      return;
    }
    if (!catalog.length) {
      target.innerHTML = '<p class="empty-note">Spell catalog is still loading or unavailable.</p>';
      ensureSpellCatalog(root);
      return;
    }

    const known = new Set((root._playerState.spells || []).map(name => normalizeName(name)));
    const equipment = new Set((root._playerState.equipment || []).map(name => normalizeName(name)));
    const matches = catalog
      .map(spell => ({ spell, score: scoreSpell(spell, clean) }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score || a.spell.name.localeCompare(b.spell.name))
      .slice(0, 8)
      .map(match => match.spell);

    target.innerHTML = matches.length ? matches.map(spell => {
      const isKnown = known.has(normalizeName(spell.name));
      const scrollItemName = formatSpellScrollEquipmentName(spell);
      const hasScroll = equipment.has(normalizeName(scrollItemName));
      return `<article class="spell-result">
        <div>
          <strong>${escapeHtml(spell.name)}</strong>
          <small>${escapeHtml(formatSpellMeta(spell))}</small>
        </div>
        <div class="spell-result-actions">
          <button class="text-button" type="button" data-add-spell="${escapeAttr(spell.name)}" ${isKnown ? 'disabled' : ''}>${isKnown ? 'Known' : 'Add'}</button>
          <button class="text-button" type="button" data-add-spell-scroll="${escapeAttr(spell.name)}" ${hasScroll ? 'disabled' : ''}>${hasScroll ? 'Scroll Added' : 'Add Scroll'}</button>
        </div>
      </article>`;
    }).join('') : '<p class="empty-note">No spells found.</p>';
  }

  function formatSpellScrollEquipmentName(spell) {
    const level = getSpellLevelNumber(spell && spell.level);
    const label = level ? `${formatOrdinal(level)} Level` : 'Cantrip';
    return `Spell Scroll (${label})|${spell && spell.name || 'Unknown Spell'}`;
  }

  function formatOrdinal(number) {
    const value = Number(number) || 0;
    if (value === 1) return '1st';
    if (value === 2) return '2nd';
    if (value === 3) return '3rd';
    return `${value}th`;
  }

  function scoreSpell(spell, query) {
    const name = String(spell.name || '').toLowerCase();
    const haystack = `${spell.name} ${spell.level} ${spell.school} ${spell.classes} ${spell.text}`.toLowerCase();
    if (name === query) return 100;
    if (name.startsWith(query)) return 80;
    if (name.includes(query)) return 60;
    return haystack.includes(query) ? 20 : 0;
  }

  function buildCurrentSpellScrolls(equipment, providedScrolls) {
    const providedByItem = new Map((providedScrolls || []).map(scroll => [normalizeName(scroll.itemName || `${scroll.scrollName}|${scroll.spellName}`), scroll]));
    const parsed = (equipment || []).map(parseSpellScrollItem).filter(Boolean);
    if (!parsed.length) return providedScrolls || [];
    return parsed.map(scroll => ({
      ...(providedByItem.get(normalizeName(scroll.itemName)) || {}),
      ...scroll,
    }));
  }

  function parseSpellScrollItem(itemName) {
    const match = String(itemName || '').match(/^(Spell Scroll \([^)]+\))\s*\|\s*(.+)$/i);
    if (!match) return null;
    const scrollName = match[1].trim();
    const spellName = match[2].trim();
    return {
      id: slugify(itemName),
      itemName,
      scrollName,
      spellName,
      source: scrollName,
    };
  }

  function normalizeSpellScroll(scroll) {
    if (!scroll || !scroll.spellName) return null;
    return {
      id: cleanDetailValue(scroll.id) || slugify(`${scroll.scrollName || 'spell-scroll'}-${scroll.spellName}`),
      itemName: cleanDetailValue(scroll.itemName),
      scrollName: cleanDetailValue(scroll.scrollName),
      spellName: cleanDetailValue(scroll.spellName),
      source: cleanDetailValue(scroll.source),
      castingTime: cleanDetailValue(scroll.castingTime),
      level: cleanDetailValue(scroll.level),
      school: cleanDetailValue(scroll.school),
      range: cleanDetailValue(scroll.range),
      saveDc: Number(scroll.saveDc) || null,
      attackBonus: Number(scroll.attackBonus) || null,
      text: cleanRulesText(scroll.text),
    };
  }

  function normalizeSpellDetails(spell) {
    return {
      name: cleanDetailValue(spell.name),
      source: cleanDetailValue(spell.source),
      page: cleanDetailValue(spell.page),
      level: cleanDetailValue(spell.level),
      castingTime: cleanDetailValue(spell.castingTime),
      duration: cleanDetailValue(spell.duration),
      school: cleanDetailValue(spell.school),
      range: cleanDetailValue(spell.range),
      components: cleanDetailValue(spell.components),
      classes: cleanDetailValue(spell.classes),
      optionalClasses: cleanDetailValue(spell.optionalClasses),
      subclasses: cleanDetailValue(spell.subclasses),
      text: cleanRulesText(spell.text),
      higherLevels: cleanRulesText(spell.higherLevels),
      timing: cleanDetailValue(spell.timing),
      attackType: cleanDetailValue(spell.attackType),
      saveAbility: cleanDetailValue(spell.saveAbility),
      damage: spell.damage && typeof spell.damage === 'object' ? {
        dice: cleanDetailValue(spell.damage.dice),
        damageType: cleanDetailValue(spell.damage.damageType),
      } : null,
    };
  }

  function renderEquippedAbilities(player) {
    const abilities = getEquippedItems(player)
      .flatMap(item => (item.abilities || []).map(text => ({ item, text })));
    if (!abilities.length) {
      return `<section class="equipped-abilities">
        <h2>Equipped Item Abilities</h2>
        <p class="empty-note">No equipped item abilities detected.</p>
      </section>`;
    }

    return `<section class="equipped-abilities">
      <h2>Equipped Item Abilities</h2>
      <div class="equipment-ability-list">
        ${abilities.map(({ item, text }) => `<div class="equipment-ability">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(text)}</span>
        </div>`).join('')}
      </div>
    </section>`;
  }

  function renderEquipmentRow(item, player) {
    const equipped = isItemEquipped(player, item);
    return `<article class="equipment-row ${equipped ? 'active' : ''}" role="listitem">
      <label class="equipment-check">
        <input type="checkbox" data-equip-id="${escapeAttr(item.id)}" ${equipped ? 'checked' : ''}>
        <span>${equipped ? 'Equipped' : 'Equip'}</span>
      </label>
      <details class="equipment-details-toggle">
        <summary>
          <span class="equipment-title">
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(formatItemSubtitle(item))}</small>
          </span>
          <span class="equipment-meta">${renderItemBadges(item)}</span>
          <span class="equipment-statline">${escapeHtml(formatItemStatline(item))}</span>
        </summary>
        ${renderEquipmentDetails(item, player)}
      </details>
      <div class="equipment-row-actions">
        <button class="text-button" type="button" data-remove-equipment="${escapeAttr(item.id)}">Remove</button>
      </div>
    </article>`;
  }

  function renderEquipmentDetails(item, player) {
    const details = item.details || {};
    const rows = [
      ['Type', details.type || item.kind],
      ['Rarity', details.rarity],
      ['Attunement', details.attunement],
      ['Damage', formatItemDamageDetail(item)],
      ['Properties', details.properties || (item.weapon && item.weapon.properties.join(', '))],
      ['Weight', details.weight],
      ['Value', details.value],
      ['Source', formatSource(details)],
    ].filter(([, value]) => value);
    const renderedActions = new Set((details.actions || []).map(action => normalizeName(action.title || action.name || action.id)));
    const renderedResources = new Set((details.resources || []).map(resource => normalizeName(resource.name || resource.id)));
    const renderedEffects = new Set((details.effects || []).map(effect => normalizeName(effect.name || effect.label || effect.id)));
    const remainingAbilities = (item.abilities || []).filter(text => {
      const normalized = normalizeName(text);
      return ![...renderedActions, ...renderedResources, ...renderedEffects].some(name => name && normalized.startsWith(name));
    });

    return `<div class="equipment-details">
      ${rows.length ? `<dl class="equipment-detail-grid">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>` : ''}
      ${renderEquipmentActionSection(item, player)}
      ${renderEquipmentResourceSection(item, player)}
      ${remainingAbilities.length ? `<section class="equipment-detail-section">
        <h3>Item Abilities</h3>
        <ul>${remainingAbilities.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>
      </section>` : ''}
      ${details.text ? `<p class="item-rules">${escapeHtml(truncateText(details.text, 1100))}</p>` : '<p class="empty-note">No item rules text is recorded yet.</p>'}
    </div>`;
  }

  function renderEquipmentActionSection(item, player) {
    const actions = item.details && Array.isArray(item.details.actions) ? item.details.actions : [];
    if (!actions.length) return '';
    return `<section class="equipment-detail-section">
      <h3>Item Actions</h3>
      <div class="equipment-action-list">
        ${actions.map(action => renderEquipmentAction(item, player, action)).join('')}
      </div>
    </section>`;
  }

  function renderEquipmentAction(item, player, action) {
    const title = action.title || action.name || item.name;
    const group = normalizeActionGroup(action.group);
    const detail = cleanRulesText(action.detail || action.text || '');
    const resourceId = action.id || '';
    const state = getResourceUseState(player, resourceId);
    const controls = state && state.max !== null
      ? `<div class="equipment-action-controls">
          ${renderResourceSpendButton(resourceId, 'Use', state.available <= 0)}
          <small>${escapeHtml(`${state.available} / ${state.max} left; resets ${formatReset(state.resource.reset)}`)}</small>
        </div>`
      : '';
    return `<div class="equipment-action">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml([group, action.type || 'Item'].filter(Boolean).join(' / '))}</small>
      </div>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ''}
      ${controls}
    </div>`;
  }

  function renderEquipmentResourceSection(item, player) {
    const resources = item.details && Array.isArray(item.details.resources) ? item.details.resources : [];
    const actionIds = new Set(((item.details && item.details.actions) || []).map(action => action.id).filter(Boolean));
    const standalone = resources.filter(resource => !actionIds.has(resource.id));
    if (!standalone.length) return '';
    return `<section class="equipment-detail-section">
      <h3>Item Uses</h3>
      <div class="resource-list equipment-resource-list">
        ${standalone.map(resource => renderEquipmentResource(player, resource)).join('')}
      </div>
    </section>`;
  }

  function renderEquipmentResource(player, resource) {
    const state = getResourceUseState(player, resource.id);
    if (!state || state.max === null) {
      return `<div class="resource-row"><span><strong>${escapeHtml(resource.name || resource.id)}</strong><small>${escapeHtml(formatResourceMax(resource, null))}; resets ${escapeHtml(formatReset(resource.reset))}</small></span></div>`;
    }
    return `<div class="resource-row">
      <span><strong>${escapeHtml(state.resource.name || resource.name || resource.id)}</strong><small>${escapeHtml(formatResourceLine(state.resource, state.max, state.used))}</small></span>
      <span class="resource-controls">${renderResourceSpendButton(state.resource.id, 'Use', state.available <= 0)}</span>
    </div>`;
  }

  function formatItemDamageDetail(item) {
    if (!item.weapon) return item.details && item.details.damage;
    const active = `${item.weapon.damage} ${item.weapon.damageType}`;
    const recorded = item.details && item.details.damage;
    if (recorded && normalizeName(recorded) !== normalizeName(active)) return `${active} (catalog base: ${recorded})`;
    return active;
  }

  function formatItemSubtitle(item) {
    const details = item.details || {};
    return [details.type || item.kind, details.rarity].filter(Boolean).join(' / ') || item.kind;
  }

  function formatItemStatline(item) {
    if (item.weapon) return `${formatBonus(item.weapon.attackBonus)} hit / ${item.weapon.damageFormula} ${item.weapon.damageType}`;
    if (item.details && item.details.attunement) return 'Attunement';
    if (item.abilities && item.abilities.length) return `${item.abilities.length} item abilit${item.abilities.length === 1 ? 'y' : 'ies'}`;
    return item.kind;
  }

  function renderItemBadges(item) {
    const details = item.details || {};
    const badges = [item.kind, details.rarity, details.attunement ? 'attunement' : '']
      .filter(Boolean)
      .slice(0, 3);
    return badges.map(badge => `<span>${escapeHtml(badge)}</span>`).join('');
  }

  function formatSource(details) {
    if (!details || !details.source) return '';
    return details.page ? `${details.source} p. ${details.page}` : details.source;
  }

  function renderEditForm(root, player) {
    root.querySelectorAll('[data-player-edit-form]').forEach(form => {
      setFormValue(form, 'currentHp', player.currentHp);
      setFormValue(form, 'tempHp', player.tempHp);
      setFormValue(form, 'maxHp', player.maxHp);
      setFormValue(form, 'ac', player.baseAc || player.ac);
      setFormValue(form, 'speed', player.baseSpeed || player.speed);
      setFormValue(form, 'gold', player.gold);
      setFormValue(form, 'heroPoints', player.heroPoints);
      Object.keys(ABILITY_NAMES).forEach(ability => setFormValue(form, ability, player.abilities[ability]));
      setFormValue(form, 'equipment', player.equipment.join('\n'));
    });
  }

  function renderNotesForm(root, player) {
    const form = root.querySelector('[data-player-notes-form]');
    if (!form) return;
    setFormValue(form, 'notes', player.notes || '');
  }

  function bindPlayerSheetEvents(root) {
    if (root.dataset.playerEventsBound === 'true') return;
    root.dataset.playerEventsBound = 'true';

    root.addEventListener('change', event => {
      const weaponMode = event.target.closest('[data-weapon-mode]');
      if (weaponMode) {
        const player = root._playerState;
        if (!player) return;
        saveWeaponCombatState(root, player, weaponMode.dataset.weaponMode, { handMode: weaponMode.value === 'two' ? 'two' : 'one' });
        return;
      }

      const weaponToggle = event.target.closest('[data-weapon-toggle]');
      if (weaponToggle) {
        const player = root._playerState;
        if (!player) return;
        const option = weaponToggle.dataset.weaponOption;
        if (!option) return;
        saveWeaponCombatState(root, player, weaponToggle.dataset.weaponToggle, { [option]: weaponToggle.checked });
        return;
      }

      const combatToggle = event.target.closest('[data-combat-toggle]');
      if (combatToggle) {
        const player = root._playerState;
        if (!player) return;
        const combatToggles = { ...(player.combatToggles || {}), [combatToggle.dataset.combatToggle]: combatToggle.checked };
        const edits = { ...loadPlayerEdits(player.id), combatToggles };
        savePlayerEdits(player.id, edits);
        hydratePlayerSheet(root, { ...player, combatToggles });
        return;
      }

      const temporaryEffect = event.target.closest('[data-temporary-effect]');
      if (temporaryEffect) {
        const player = root._playerState;
        if (!player) return;
        const temporaryEffects = normalizeTemporaryEffects(player.temporaryEffects);
        temporaryEffects.effects[temporaryEffect.dataset.temporaryEffect] = temporaryEffect.checked;
        saveTemporaryEffects(root, player, temporaryEffects);
        return;
      }

      const temporaryCustom = event.target.closest('[data-temporary-effect-name], [data-temporary-ac-bonus]');
      if (temporaryCustom) {
        const player = root._playerState;
        if (!player) return;
        const panel = temporaryCustom.closest('.temporary-effects');
        const temporaryEffects = normalizeTemporaryEffects(player.temporaryEffects);
        const label = panel && panel.querySelector('[data-temporary-effect-name]');
        const bonus = panel && panel.querySelector('[data-temporary-ac-bonus]');
        temporaryEffects.customName = cleanDetailValue(label && label.value).slice(0, 80);
        temporaryEffects.customAcBonus = clampNumber(Number(bonus && bonus.value) || 0, -20, 20);
        saveTemporaryEffects(root, player, temporaryEffects);
        return;
      }

      const resourceUse = event.target.closest('[data-resource-use]');
      if (resourceUse) {
        const player = root._playerState;
        if (!player) return;
        const resourceUses = { ...(player.resourceUses || {}), [resourceUse.dataset.resourceUse]: nullableNumber(resourceUse.value) || 0 };
        const edits = { ...loadPlayerEdits(player.id), resourceUses };
        saveAndHydratePlayer(root, player, edits);
        return;
      }

      const spellSlotUse = event.target.closest('[data-spell-slot-use]');
      if (spellSlotUse) {
        const player = root._playerState;
        if (!player) return;
        const spellSlotUses = { ...(player.spellSlotUses || {}), [spellSlotUse.dataset.spellSlotUse]: nullableNumber(spellSlotUse.value) || 0 };
        const edits = { ...loadPlayerEdits(player.id), spellSlotUses };
        saveAndHydratePlayer(root, player, edits);
        return;
      }

      const spellSlotChoice = event.target.closest('[data-spell-slot-choice]');
      if (spellSlotChoice) {
        const player = root._playerState;
        const spell = player && findSpellDetails(spellSlotChoice.dataset.spellSlotChoice, player, root);
        const choice = spell && parseSpellSlotChoice(spellSlotChoice.value, player, spell);
        updateSpellControlStatus(spellSlotChoice.closest('.action-controls'), choice);
        return;
      }

      const checkbox = event.target.closest('[data-equip-id]');
      if (!checkbox) return;
      const player = root._playerState;
      if (!player) return;
      const id = checkbox.dataset.equipId;
      const item = (player.inventory || []).find(candidate => candidate.id === id) || { id };
      const next = new Set(player.equipped || []);
      if (checkbox.checked) next.add(id);
      else {
        const aliases = new Set(getItemEquipKeys(item).map(normalizeName));
        next.delete(id);
        for (const value of Array.from(next)) {
          if (aliases.has(normalizeName(value))) next.delete(value);
        }
      }
      const edits = { ...loadPlayerEdits(player.id), equipped: Array.from(next) };
      if (isArmorOrShieldItem(item)) {
        edits.acMode = 'official';
        edits.ac = null;
      }
      saveAndHydratePlayer(root, player, edits);
    });

    root.addEventListener('click', event => {
      const rollDockClear = event.target.closest('[data-roll-dock-clear]');
      if (rollDockClear) {
        root._rollHistory = [];
        renderRollDock(root);
        return;
      }

      const actionFilter = event.target.closest('[data-action-filter-button]');
      if (actionFilter) {
        const panel = actionFilter.closest('.actions-panel');
        if (panel) panel.dataset.activeActionFilter = actionFilter.dataset.actionFilter || 'all';
        applyActionFilters(root, panel);
        return;
      }

      const acMode = event.target.closest('[data-ac-mode]');
      if (acMode) {
        event.preventDefault();
        const player = root._playerState;
        if (!player) return;
        const mode = acMode.dataset.acMode === 'official' ? 'official' : 'custom';
        const edits = { ...loadPlayerEdits(player.id), acMode: mode };
        if (mode === 'official') edits.ac = null;
        else edits.ac = player.baseAc || player.ac;
        saveAndHydratePlayer(root, player, edits);
        return;
      }

      const resourceSpend = event.target.closest('[data-resource-spend]');
      if (resourceSpend) {
        event.preventDefault();
        const player = root._playerState;
        if (player) spendResource(root, player, resourceSpend.dataset.resourceSpend);
        return;
      }

      const spellSlotSpend = event.target.closest('[data-spell-slot-spend]');
      if (spellSlotSpend) {
        event.preventDefault();
        const player = root._playerState;
        if (player) spendSpellSlot(root, player, spellSlotSpend.dataset.spellSlotSpend);
        return;
      }

      const castSpellButton = event.target.closest('[data-cast-spell]');
      if (castSpellButton) {
        event.preventDefault();
        const player = root._playerState;
        if (player) castSpell(root, player, castSpellButton.dataset.castSpell, castSpellButton);
        return;
      }

      const useScroll = event.target.closest('[data-use-scroll]');
      if (useScroll) {
        event.preventDefault();
        const player = root._playerState;
        if (player) markSpellScrollUsed(root, player, useScroll.dataset.useScroll);
        return;
      }

      const rollButton = event.target.closest('[data-roll-type][data-weapon-id]');
      if (rollButton) {
        const player = root._playerState;
        const item = player && Array.isArray(player.inventory) && player.inventory.find(candidate => candidate.id === rollButton.dataset.weaponId);
        if (item && item.weapon) renderRoll(root, item.weapon, rollButton.dataset.rollType);
        return;
      }

      const scrollRoll = event.target.closest('[data-roll-scroll]');
      if (scrollRoll) {
        event.preventDefault();
        const player = root._playerState;
        const scroll = player && (player.spellScrolls || []).find(candidate => candidate.id === scrollRoll.dataset.rollScroll);
        const spell = scroll && findSpellDetails(scroll.spellName, player, root);
        if (spell) renderSpellRoll(root, player, spell, scrollRoll, getSpellLevelNumber(scroll.level) || getSpellLevelNumber(spell.level));
        return;
      }

      const spellRoll = event.target.closest('[data-roll-spell]');
      if (spellRoll) {
        event.preventDefault();
        const player = root._playerState;
        const spell = player && findSpellDetails(spellRoll.dataset.rollSpell, player, root);
        if (spell) renderSpellRoll(root, player, spell, spellRoll);
        return;
      }

      const reset = event.target.closest('[data-player-reset]');
      if (reset) {
        const player = root._playerState;
        if (!player) return;
        localStorage.removeItem(playerStorageKey(player.id));
        const bootstrap = getBootstrapPlayer(root);
        hydratePlayerSheet(root, bootstrap || player);
        return;
      }

      const rest = event.target.closest('[data-rest-type]');
      if (rest) {
        const player = root._playerState;
        if (!player) return;
        applyRest(root, player, rest.dataset.restType);
        return;
      }

      const addEquipment = event.target.closest('[data-add-equipment]');
      if (addEquipment) {
        event.preventDefault();
        const player = root._playerState;
        if (!player) return;
        const itemName = addEquipment.dataset.addEquipment;
        if (!itemName) return;
        const nextEquipment = [...(player.equipment || []), itemName];
        const edits = { ...loadPlayerEdits(player.id), equipment: nextEquipment };
        if (isArmorName(itemName)) {
          edits.acMode = 'official';
          edits.ac = null;
        }
        saveAndHydratePlayer(root, player, edits);
        renderSheetLog(root, `${itemName} added`, 'Equipment updated.');
        return;
      }

      const removeEquipment = event.target.closest('[data-remove-equipment]');
      if (removeEquipment) {
        event.preventDefault();
        const player = root._playerState;
        if (!player) return;
        const item = (player.inventory || []).find(candidate => candidate.id === removeEquipment.dataset.removeEquipment);
        if (!item) return;
        const nextEquipment = removeEquipmentBySourceIndex(player.equipment || [], item.sourceIndex);
        const remainingItems = buildInventory({ ...player, equipment: nextEquipment });
        const remainingKeys = new Set(remainingItems.flatMap(getItemEquipKeys).map(normalizeName));
        const equipped = (player.equipped || []).filter(id => remainingKeys.has(normalizeName(id)));
        const edits = { ...loadPlayerEdits(player.id), equipment: nextEquipment, equipped };
        if (isArmorOrShieldItem(item)) {
          edits.acMode = 'official';
          edits.ac = null;
        }
        saveAndHydratePlayer(root, player, edits);
        renderSheetLog(root, `${item.name} removed`, 'Equipment updated.');
        return;
      }

      const addSpellScroll = event.target.closest('[data-add-spell-scroll]');
      if (addSpellScroll) {
        event.preventDefault();
        const player = root._playerState;
        if (!player) return;
        const spell = findSpellDetails(addSpellScroll.dataset.addSpellScroll, player, root);
        if (!spell) return;
        const itemName = formatSpellScrollEquipmentName(spell);
        const nextEquipment = [...new Set([...(player.equipment || []), itemName])];
        const edits = { ...loadPlayerEdits(player.id), equipment: nextEquipment };
        edits.spellDetails = { ...(edits.spellDetails || {}), [spell.name || addSpellScroll.dataset.addSpellScroll]: spell };
        saveAndHydratePlayer(root, player, edits);
        renderSheetLog(root, `${spell.name} scroll added`, `${itemName} added to equipment.`);
        return;
      }

      const addSpell = event.target.closest('[data-add-spell]');
      if (addSpell) {
        event.preventDefault();
        const player = root._playerState;
        if (!player) return;
        const spellName = addSpell.dataset.addSpell;
        const nextSpells = [...new Set([...(player.spells || []), spellName])].sort((a, b) => a.localeCompare(b));
        const edits = { ...loadPlayerEdits(player.id), spells: nextSpells };
        const spell = findSpellDetails(spellName, player, root);
        if (spell) edits.spellDetails = { ...(edits.spellDetails || {}), [spell.name || spellName]: spell };
        saveAndHydratePlayer(root, player, edits);
        return;
      }

      const removeSpell = event.target.closest('[data-remove-spell]');
      if (removeSpell) {
        event.preventDefault();
        const player = root._playerState;
        if (!player) return;
        const target = normalizeName(removeSpell.dataset.removeSpell);
        const nextSpells = (player.spells || []).filter(name => normalizeName(name) !== target);
        const edits = { ...loadPlayerEdits(player.id), spells: nextSpells };
        if (edits.spellDetails) {
          edits.spellDetails = Object.fromEntries(Object.entries(edits.spellDetails)
            .filter(([key, spell]) => nextSpells.some(name => normalizeName(name) === normalizeName(key) || normalizeName(name) === normalizeName(spell && spell.name))));
        }
        saveAndHydratePlayer(root, player, edits);
        return;
      }
    });

    root.addEventListener('input', event => {
      const actionSearch = event.target.closest('[data-action-search]');
      if (actionSearch) {
        applyActionFilters(root, actionSearch.closest('.actions-panel'));
        return;
      }

      const equipmentSearch = event.target.closest('[data-equipment-search-input]');
      if (equipmentSearch) {
        window.clearTimeout(root._equipmentSearchTimer);
        root._equipmentSearchTimer = window.setTimeout(() => renderEquipmentSearchResults(root, equipmentSearch.value), 160);
        return;
      }

      const input = event.target.closest('[data-spell-search-input]');
      if (!input) return;
      window.clearTimeout(root._spellSearchTimer);
      root._spellSearchTimer = window.setTimeout(() => renderSpellSearchResults(root, input.value), 160);
    });

    root.querySelectorAll('[data-player-edit-form]').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        handleEditSubmit(root, form);
      });
    });

    const notesForm = root.querySelector('[data-player-notes-form]');
    if (notesForm) {
      notesForm.addEventListener('submit', event => {
        event.preventDefault();
        handleNotesSubmit(root, notesForm);
      });
    }
  }

  async function handleEditSubmit(root, form) {
    const player = root._playerState;
    if (!player) return;
    const formData = new FormData(form);
    const edits = { ...loadPlayerEdits(player.id) };
    if (hasFormField(form, 'currentHp')) edits.currentHp = nullableNumber(formData.get('currentHp'));
    if (hasFormField(form, 'tempHp')) edits.tempHp = nullableNumber(formData.get('tempHp')) || 0;
    if (hasFormField(form, 'maxHp')) edits.maxHp = nullableNumber(formData.get('maxHp'));
    const hasAcField = hasFormField(form, 'ac');
    const submittedAc = hasAcField ? nullableNumber(formData.get('ac')) : undefined;
    const displayedAc = Number(player.baseAc || player.ac);
    if (hasAcField && submittedAc === null) {
      edits.ac = null;
      edits.acMode = 'official';
    } else if (hasAcField && submittedAc !== undefined && submittedAc !== displayedAc) {
      edits.ac = submittedAc;
      edits.acMode = 'custom';
    }
    if (hasFormField(form, 'speed')) edits.speed = nullableNumber(formData.get('speed')) || player.baseSpeed || player.speed;
    if (hasFormField(form, 'gold')) edits.gold = nullableNumber(formData.get('gold')) || 0;
    if (hasFormField(form, 'heroPoints')) edits.heroPoints = nullableNumber(formData.get('heroPoints')) || 0;
    const abilityFields = Object.keys(ABILITY_NAMES).filter(ability => hasFormField(form, ability));
    if (abilityFields.length) {
      const abilities = { ...(player.abilities || {}), ...((edits && edits.abilities) || {}) };
      abilityFields.forEach(ability => {
        abilities[ability] = nullableNumber(formData.get(ability)) || player.abilities[ability];
      });
      edits.abilities = abilities;
    }
    if (hasFormField(form, 'equipment')) {
      const nextEquipment = String(formData.get('equipment') || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
      const equipmentChanged = nextEquipment.join('\n') !== (player.equipment || []).join('\n');
      edits.equipment = nextEquipment;
      if (equipmentChanged && (!hasAcField || submittedAc === displayedAc)) {
        edits.acMode = 'official';
        edits.ac = null;
      }
    }
    savePlayerEdits(player.id, edits);
    const status = form.querySelector('[data-player-edit-status]') || root.querySelector('[data-player-edit-status]');
    if (status) status.textContent = 'Saved on this device';
    if (getApiBaseUrl()) {
      const savedToApi = await trySavePlayerToApi(player.id, edits);
      if (status) status.textContent = savedToApi ? 'Saved to cloud' : 'Saved on this device';
    }
    hydratePlayerSheet(root, {
      ...player,
      ...edits,
      abilities: { ...(player.abilities || {}), ...((edits && edits.abilities) || {}) },
      spellDetails: { ...(player.spellDetails || {}), ...((edits && edits.spellDetails) || {}) },
    });
  }

  async function handleNotesSubmit(root, form) {
    const player = root._playerState;
    if (!player) return;
    const formData = new FormData(form);
    const edits = {
      ...loadPlayerEdits(player.id),
      notes: String(formData.get('notes') || ''),
    };
    savePlayerEdits(player.id, edits);
    const status = root.querySelector('[data-player-notes-status]');
    if (status) status.textContent = 'Saved on this device';
    if (getApiBaseUrl()) {
      const savedToApi = await trySavePlayerToApi(player.id, edits);
      if (status) status.textContent = savedToApi ? 'Saved to cloud' : 'Saved on this device';
    }
    hydratePlayerSheet(root, { ...player, ...edits });
  }

  async function saveAndHydratePlayer(root, player, edits) {
    savePlayerEdits(player.id, edits);
    if (getApiBaseUrl()) await trySavePlayerToApi(player.id, edits);
    hydratePlayerSheet(root, {
      ...player,
      ...edits,
      abilities: { ...(player.abilities || {}), ...((edits && edits.abilities) || {}) },
      spellDetails: { ...(player.spellDetails || {}), ...((edits && edits.spellDetails) || {}) },
    });
  }

  function updateSpellControlStatus(controls, choice) {
    if (!controls || !choice) return;
    const castButton = controls.querySelector('[data-cast-spell]');
    if (castButton) castButton.disabled = choice.available <= 0;
    const status = controls.querySelector('.use-status');
    if (status) status.textContent = formatSpellSlotStatus(choice);
  }

  function applyActionFilters(root, panel = null) {
    panel = panel || root.querySelector('[data-tab-panel].active .actions-panel') || root.querySelector('.actions-panel');
    if (!panel) return;
    const active = panel.dataset.activeActionFilter || 'all';
    const searchInput = panel.querySelector('[data-action-search]');
    const query = normalizeName(searchInput ? searchInput.value : '');

    panel.querySelectorAll('[data-action-filter-button]').forEach(button => {
      button.classList.toggle('active', (button.dataset.actionFilter || 'all') === active);
    });

    panel.querySelectorAll('[data-action-card]').forEach(card => {
      const kinds = String(card.dataset.actionKind || '').split(/\s+/).filter(Boolean);
      const matchesKind = active === 'all' || kinds.includes(active);
      const matchesSearch = !query || normalizeName(card.dataset.actionSearch).includes(query);
      const filtered = !(matchesKind && matchesSearch);
      card.hidden = filtered;
      card.classList.toggle('filtered-out', filtered);
    });

    panel.querySelectorAll('[data-action-group-section]').forEach(section => {
      const filtered = !section.querySelector('[data-action-card]:not(.filtered-out)');
      section.hidden = filtered;
      section.classList.toggle('filtered-out', filtered);
    });
  }

  async function spendResource(root, player, resourceId) {
    const state = getResourceUseState(player, resourceId);
    if (!state || state.max === null) {
      renderSheetLog(root, 'Resource not tracked', 'This resource does not have a spendable limit yet.');
      return;
    }
    if (state.available <= 0) {
      renderSheetLog(root, `${state.resource.name || state.resource.id}: empty`, `Resets on ${formatReset(state.resource.reset)}.`);
      return;
    }

    const resourceUses = { ...(player.resourceUses || {}), [state.resource.id]: state.used + 1 };
    const edits = { ...loadPlayerEdits(player.id), resourceUses };
    await saveAndHydratePlayer(root, player, edits);
    renderSheetLog(root, `${state.resource.name || state.resource.id} used`, `${state.available - 1} / ${state.max} left; resets on ${formatReset(state.resource.reset)}.`);
  }

  async function spendSpellSlot(root, player, slotKey) {
    const slot = getSpellSlotByKey(player, slotKey);
    if (!slot || slot.available <= 0) {
      renderSheetLog(root, 'No spell slot available', 'Choose a slot with uses remaining.');
      return;
    }
    await saveSpellSlotSpend(root, player, slot, `${slot.label} used`);
  }

  async function castSpell(root, player, spellName, trigger = null) {
    const spell = findSpellDetails(spellName, player, root);
    if (!spell) {
      renderSheetLog(root, 'Spell rules missing', `${spellName || 'That spell'} is on the sheet but rules are not loaded yet.`);
      return;
    }

    const slot = getSelectedSpellSlotChoice(trigger, player, spell) || getSpellSlotState(player, spell);
    if (slot.level === 0) {
      renderSheetLog(root, `${spell.name} cast`, 'Cantrip; no spell slot spent.');
      return;
    }
    if (!slot.max || slot.available <= 0) {
      renderSheetLog(root, `${spell.name} not cast`, `No level ${getSpellLevelNumber(spell.level)}+ spell slots available.`);
      return;
    }

    await saveSpellSlotSpend(root, player, slot, `${spell.name} cast`);
  }

  async function saveSpellSlotSpend(root, player, slot, label) {
    const spellSlotUses = { ...(player.spellSlotUses || {}), [slot.slotKey]: slot.used + 1 };
    const edits = { ...loadPlayerEdits(player.id), spellSlotUses };
    await saveAndHydratePlayer(root, player, edits);
    renderSheetLog(root, label, `${slot.available - 1} / ${slot.max} ${slot.label} slots left.`);
  }

  function getSpellSlotByKey(player, slotKey) {
    const slots = player.spellSlots || {};
    const uses = player.spellSlotUses || {};
    if (slotKey === 'pact') {
      const pact = slots.pact && typeof slots.pact === 'object' ? slots.pact : null;
      if (!pact || !Number(pact.slots)) return null;
      const max = Number(pact.slots);
      const used = clampNumber(Number(uses.pact) || 0, 0, max);
      return { slotKey: 'pact', label: `Pact L${pact.level}`, max, used, available: max - used };
    }
    const max = Number(slots[slotKey]);
    if (!max) return null;
    const used = clampNumber(Number(uses[slotKey]) || 0, 0, max);
    return { slotKey: String(slotKey), label: `Level ${slotKey}`, max, used, available: max - used };
  }

  async function markSpellScrollUsed(root, player, scrollId) {
    const scroll = (player.spellScrolls || []).find(candidate => candidate.id === scrollId);
    const actionUses = { ...(player.actionUses || {}), [scrollId]: 1 };
    const edits = { ...loadPlayerEdits(player.id), actionUses };
    await saveAndHydratePlayer(root, player, edits);
    renderSheetLog(root, `${scroll ? scroll.spellName : 'Spell scroll'} used`, 'Scroll marked consumed on this sheet.');
  }

  async function applyRest(root, player, restType) {
    const edits = { ...loadPlayerEdits(player.id) };
    const resourceUses = { ...(player.resourceUses || {}) };
    for (const resource of player.resources || []) {
      if (restType === 'long' || resource.reset === 'shortRest' || resource.reset === 'longRestUntilFontOfInspirationThenShortRest') {
        delete resourceUses[resource.id];
      }
    }
    edits.resourceUses = resourceUses;
    if (restType === 'long') {
      edits.spellSlotUses = {};
      edits.tempHp = 0;
      if (player.maxHp !== null && player.maxHp !== undefined) edits.currentHp = player.maxHp;
    }
    const status = root.querySelector('[data-resource-status]');
    if (status) status.textContent = restType === 'long' ? 'Long rest applied' : 'Short rest applied';
    await saveAndHydratePlayer(root, player, edits);
  }

  function saveWeaponCombatState(root, player, weaponId, patch) {
    if (!weaponId) return;
    const combatToggles = { ...(player.combatToggles || {}) };
    const weapons = { ...(combatToggles.weapons || {}) };
    weapons[weaponId] = { ...(weapons[weaponId] || {}), ...patch };
    combatToggles.weapons = weapons;
    const edits = { ...loadPlayerEdits(player.id), combatToggles };
    savePlayerEdits(player.id, edits);
    hydratePlayerSheet(root, { ...player, combatToggles });
  }

  function saveTemporaryEffects(root, player, temporaryEffects) {
    const edits = { ...loadPlayerEdits(player.id), temporaryEffects: normalizeTemporaryEffects(temporaryEffects) };
    saveAndHydratePlayer(root, player, edits);
  }

  function getEquippedItems(player) {
    return (Array.isArray(player.inventory) ? player.inventory : []).filter(item => isItemEquipped(player, item));
  }

  function isItemEquipped(player, item) {
    if (!player || !item) return false;
    const selected = Array.isArray(player.equipped) ? player.equipped.map(String) : [];
    if (!selected.length) return false;
    const selectedRaw = new Set(selected);
    const selectedNames = new Set(selected.map(normalizeName));
    return getItemEquipKeys(item).some(key => selectedRaw.has(key) || selectedNames.has(normalizeName(key)));
  }

  function getItemEquipKeys(item) {
    return [
      item && item.id,
      item && item.name,
      item && item.details && item.details.id,
      item && item.details && item.details.name,
    ].filter(Boolean).map(String);
  }

  function isArmorOrShieldItem(item) {
    if (!item) return false;
    const haystack = normalizeName(`${item.kind || ''} ${item.name || ''} ${item.details && item.details.type || ''}`);
    return haystack.includes('armor') || haystack.includes('shield') || Boolean(findArmorBaseRule(item.name));
  }

  function isArmorName(name) {
    const normalized = normalizeName(name);
    return normalized.includes('shield') || normalized.includes('armor') || Boolean(findArmorBaseRule(name));
  }

  function removeEquipmentBySourceIndex(equipment, sourceIndex) {
    const index = Number(sourceIndex);
    if (!Number.isInteger(index) || index < 0 || index >= equipment.length) return [...equipment];
    return equipment.filter((_, itemIndex) => itemIndex !== index);
  }

  function renderRoll(root, weapon, type) {
    const result = type === 'attack'
      ? rollAttack(weapon)
      : rollDamage(weapon);
    renderSheetLog(root, result.label, result.detail);
  }

  function renderSpellRoll(root, player, spell, trigger = null, fixedCastLevel = null) {
    const choice = fixedCastLevel ? { level: fixedCastLevel } : getSelectedSpellSlotChoice(trigger, player, spell);
    const profile = getSpellRollProfile(player, spell, choice && choice.level);
    if (!profile) {
      renderSheetLog(root, `${spell && spell.name || 'Spell'} roll unavailable`, 'No damage or healing dice were detected for this spell yet.');
      return;
    }
    const roll = rollSpellProfile(profile);
    renderSheetLog(root, `${spell.name} ${profile.kind}: ${roll.total}`, roll.detail);
  }

  function renderSheetLog(root, label, detail) {
    root._rollHistory = [
      {
        label: String(label || ''),
        detail: String(detail || ''),
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      },
      ...(root._rollHistory || []),
    ].slice(0, 5);
    renderRollDock(root);

    const targets = Array.from(root.querySelectorAll('[data-roll-log]'));
    if (!targets.length) return;
    targets.forEach(target => {
      target.innerHTML = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span>`;
    });
  }

  function ensureRollDock(root) {
    let dock = root.querySelector('[data-roll-dock]');
    if (dock) return dock;

    dock = root.ownerDocument.createElement('aside');
    dock.className = 'roll-dock';
    dock.dataset.rollDock = 'true';
    dock.setAttribute('aria-live', 'polite');
    dock.hidden = true;
    dock.innerHTML = `<div class="roll-dock-head">
      <span>Rolls</span>
      <button class="text-button" type="button" data-roll-dock-clear aria-label="Clear rolls">Clear</button>
    </div>
    <div class="roll-dock-latest" data-roll-dock-latest></div>
    <div class="roll-dock-history" data-roll-dock-history></div>`;
    root.appendChild(dock);
    return dock;
  }

  function renderRollDock(root) {
    const dock = ensureRollDock(root);
    const history = root._rollHistory || [];
    dock.hidden = !history.length;
    if (!history.length) return;

    const [latest, ...previous] = history;
    const latestTarget = dock.querySelector('[data-roll-dock-latest]');
    if (latestTarget) {
      latestTarget.innerHTML = `<strong>${escapeHtml(latest.label)}</strong><span>${escapeHtml(latest.detail)}</span><small>${escapeHtml(latest.time)}</small>`;
    }

    const historyTarget = dock.querySelector('[data-roll-dock-history]');
    if (historyTarget) {
      historyTarget.innerHTML = previous.map(entry => `<div>
        <strong>${escapeHtml(entry.label)}</strong>
        <span>${escapeHtml(entry.detail)}</span>
        <small>${escapeHtml(entry.time)}</small>
      </div>`).join('');
    }
  }

  function rollAttack(weapon) {
    const die = rollDie(20);
    return {
      label: `${weapon.name} attack: ${die + weapon.attackBonus}`,
      detail: `d20 ${die} ${formatBonus(weapon.attackBonus)}`,
    };
  }

  function rollDamage(weapon) {
    const dice = rollDice(weapon.damage);
    const extraRolls = (weapon.extraDamage || []).map(effect => ({ effect, roll: rollDice(effect.dice) }));
    const extraTotal = extraRolls.reduce((sum, entry) => sum + entry.roll.total, 0);
    const total = dice.total + weapon.damageBonus + extraTotal;
    const extraDetail = extraRolls.map(entry => `${entry.effect.label}: ${entry.roll.detail} ${entry.effect.damageType}`).join('; ');
    const onHitDetail = (weapon.onHitEffects || []).map(effect => {
      if (effect.label === 'Shielding Impact') return `${effect.label}: ${Math.floor(total / 2)} temp HP`;
      return `${effect.label}: ${effect.text}`;
    }).join('; ');
    return {
      label: `${weapon.name} damage: ${total}`,
      detail: [ `${dice.detail}${weapon.damageBonus ? ` ${formatBonus(weapon.damageBonus)}` : ''} ${weapon.damageType}`, extraDetail, onHitDetail ].filter(Boolean).join('; '),
    };
  }

  function rollSpellProfile(profile) {
    const rolls = profile.diceTerms.map(term => {
      const values = Array.from({ length: term.count }, () => rollDie(term.sides));
      return { term, values, total: values.reduce((sum, value) => sum + value, 0) };
    });
    const diceTotal = rolls.reduce((sum, entry) => sum + entry.total, 0);
    const total = diceTotal + profile.bonus;
    const detail = [
      `${profile.formula} = ${rolls.map(entry => `${formatDiceTerm(entry.term)} [${entry.values.join(', ')}]`).join(' + ')}`,
      profile.bonus ? `${profile.bonusLabel} ${formatBonus(profile.bonus)}` : '',
      profile.upcastSteps ? `cast at level ${profile.castLevel}; upcast +${profile.upcast.dice} x ${profile.upcastSteps}` : `cast at level ${profile.castLevel || 'cantrip'}`,
      profile.damageType,
    ].filter(Boolean).join('; ');
    return { total, detail };
  }

  function rollDice(expression) {
    const fixed = Number(expression);
    if (Number.isFinite(fixed)) return { total: fixed, detail: String(fixed) };
    const match = String(expression || '').match(/^(\d+)d(\d+)$/i);
    if (!match) return { total: 0, detail: expression || '0' };
    const count = Number(match[1]);
    const sides = Number(match[2]);
    const rolls = Array.from({ length: count }, () => rollDie(sides));
    return { total: rolls.reduce((sum, value) => sum + value, 0), detail: `${expression} [${rolls.join(', ')}]` };
  }

  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  function setFormValue(form, name, value) {
    const field = form.elements[name];
    if (field) field.value = value === null || value === undefined ? '' : value;
  }

  function hasFormField(form, name) {
    return Boolean(form && form.elements && form.elements[name]);
  }

  function loadPlayerEdits(playerId) {
    if (!playerId) return {};
    try {
      return sanitizePlayerEdits(JSON.parse(localStorage.getItem(playerStorageKey(playerId)) || '{}'));
    } catch (error) {
      return {};
    }
  }

  function savePlayerEdits(playerId, edits) {
    if (!playerId) return;
    localStorage.setItem(playerStorageKey(playerId), JSON.stringify({ ...sanitizePlayerEdits(edits), updatedAt: new Date().toISOString() }));
  }

  function sanitizePlayerEdits(edits) {
    if (!edits || typeof edits !== 'object') return {};
    const out = {};
    copyNullableNumberEdit(out, edits, 'currentHp');
    copyNullableNumberEdit(out, edits, 'tempHp');
    copyNullableNumberEdit(out, edits, 'maxHp');
    copyNullableNumberEdit(out, edits, 'ac');
    copyNullableNumberEdit(out, edits, 'speed');
    copyNullableNumberEdit(out, edits, 'gold');
    copyNullableNumberEdit(out, edits, 'heroPoints');
    if (edits.acMode === 'official' || edits.acMode === 'custom') out.acMode = edits.acMode;
    copyStringEdit(out, edits, 'concentration');
    copyStringEdit(out, edits, 'notes');
    copyStringArrayEdit(out, edits, 'equipment');
    copyStringArrayEdit(out, edits, 'equipped');
    copyStringArrayEdit(out, edits, 'spells');
    copyStringArrayEdit(out, edits, 'preparedSpells');
    copyStringArrayEdit(out, edits, 'conditions');
    if (edits.abilities && typeof edits.abilities === 'object') {
      out.abilities = {};
      Object.keys(ABILITY_NAMES).forEach(ability => {
        const value = nullableNumber(edits.abilities[ability]);
        if (value !== undefined && value !== null) out.abilities[ability] = clampNumber(value, 1, 30);
      });
      if (!Object.keys(out.abilities).length) delete out.abilities;
    }
    copyNumberMapEdit(out, edits, 'resourceUses');
    copyNumberMapEdit(out, edits, 'spellSlotUses');
    copyNumberMapEdit(out, edits, 'itemCharges');
    copyNumberMapEdit(out, edits, 'actionUses');
    if (edits.temporaryEffects && typeof edits.temporaryEffects === 'object') out.temporaryEffects = normalizeTemporaryEffects(edits.temporaryEffects);
    if (edits.combatToggles && typeof edits.combatToggles === 'object') out.combatToggles = edits.combatToggles;
    if (edits.spellDetails && typeof edits.spellDetails === 'object') out.spellDetails = edits.spellDetails;
    if (Array.isArray(edits.spellScrolls)) out.spellScrolls = edits.spellScrolls.map(normalizeSpellScroll).filter(Boolean);
    return out;
  }

  function copyNullableNumberEdit(out, edits, field) {
    if (!Object.prototype.hasOwnProperty.call(edits, field)) return;
    const value = nullableNumber(edits[field]);
    if (value !== undefined) out[field] = value;
  }

  function copyStringEdit(out, edits, field) {
    if (Object.prototype.hasOwnProperty.call(edits, field)) out[field] = String(edits[field] || '');
  }

  function copyStringArrayEdit(out, edits, field) {
    if (Array.isArray(edits[field])) out[field] = edits[field].map(String).filter(Boolean);
  }

  function copyNumberMapEdit(out, edits, field) {
    if (!edits[field] || typeof edits[field] !== 'object') return;
    out[field] = {};
    for (const [key, value] of Object.entries(edits[field])) {
      const number = nullableNumber(value);
      if (number !== undefined && number !== null) out[field][key] = number;
    }
  }

  async function trySavePlayerToApi(playerId, edits) {
    try {
      const { spellDetails, updatedAt, ...apiEdits } = edits || {};
      if (!Object.keys(apiEdits).length) return true;
      const url = buildApiUrl(`players/${encodeURIComponent(playerId)}`);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(apiEdits),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  function playerStorageKey(playerId) {
    return `eldoria.player.${playerId}`;
  }

  function nullableNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function clampNumber(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  function fieldValue(player, field) {
    const value = player[field];
    if (field === 'classSummary') return formatClassSummary(player) || '-';
    if (field === 'subclass') return player.subclassShortName || player.subclass || '-';
    if (field === 'initiative' || field === 'proficiencyBonus' || field === 'spellAttack') return value === null ? '-' : formatBonus(value);
    if (field === 'speed') return value ? `${value} ft` : '-';
    if (field === 'spellSaveDc') return value === null ? '-' : value;
    if (Array.isArray(value)) return value.join(', ') || '-';
    if (value === null || value === undefined || value === '') return '-';
    return value;
  }

  function formatClassSummary(player) {
    if (!player) return '';
    const subclass = player.subclassShortName || player.subclass;
    return [player.class, subclass ? `(${subclass})` : ''].filter(Boolean).join(' ');
  }

  function setText(root, selector, value) {
    const node = root.querySelector(selector);
    if (node) node.textContent = value === null || value === undefined || value === '' ? '-' : value;
  }

  async function fetchApi(route, params = {}) {
    const url = buildApiUrl(route, params);
    const timeout = getConfig().apiTimeoutMs || 4000;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`API ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  function buildApiUrl(route, params = {}) {
    const base = getApiBaseUrl();
    const url = new URL(`${base.replace(/\/+$/, '')}/${route.replace(/^\/+/, '')}`, window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    return url.toString();
  }

  function getApiBaseUrl() {
    const config = getConfig();
    const configured = String(config.apiBaseUrl || '').trim();
    if (configured) return configured.replace(/\/+$/, '');
    if (window.location.protocol.startsWith('http') && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return `${window.location.origin}/api`;
    }
    return '';
  }

  function getConfig() {
    return window.ELDORIA_PUBLIC_CONFIG || {};
  }

  function calculateModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  function formatBonus(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return num >= 0 ? `+${num}` : String(num);
  }

  function calculateProficiencyBonus(level) {
    return Math.ceil(Number(level || 1) / 4) + 1;
  }

  function normalizeName(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
  }

  function customItem(key, name, type, abilities) {
    return {
      key,
      name,
      type,
      rarity: 'Custom',
      text: abilities.join(' '),
      abilities,
    };
  }

  function cleanDetailValue(value) {
    const text = String(value || '').trim();
    return /^none$/i.test(text) ? '' : text;
  }

  function cleanRulesText(value) {
    return String(value || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/([a-z0-9.)])([A-Z])/g, '$1 $2')
      .trim();
  }

  function splitSentences(value) {
    return cleanRulesText(value).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  }

  function truncateText(value, maxLength) {
    const text = cleanRulesText(value);
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}...`;
  }

  function slugify(value) {
    return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-tabs]').forEach(initTabs);
    document.querySelectorAll('[data-public-search]').forEach(initSearch);
    document.querySelectorAll('[data-player-sheet]').forEach(initPlayerSheet);
  });
})();
