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
  const SKILL_LABELS = {
    acrobatics: 'Acrobatics',
    animalHandling: 'Animal Handling',
    arcana: 'Arcana',
    athletics: 'Athletics',
    deception: 'Deception',
    history: 'History',
    insight: 'Insight',
    intimidation: 'Intimidation',
    investigation: 'Investigation',
    medicine: 'Medicine',
    nature: 'Nature',
    perception: 'Perception',
    performance: 'Performance',
    persuasion: 'Persuasion',
    religion: 'Religion',
    sleightOfHand: 'Sleight of Hand',
    stealth: 'Stealth',
    survival: 'Survival',
  };
  const CLASS_SOURCE_BY_NAME = {
    artificer: 'tce',
    barbarian: 'phb',
    bard: 'phb',
    cleric: 'phb',
    druid: 'phb',
    fighter: 'phb',
    monk: 'phb',
    paladin: 'phb',
    ranger: 'phb',
    rogue: 'phb',
    sorcerer: 'phb',
    warlock: 'phb',
    wizard: 'phb',
  };
  const CLASS_WEAPON_PROFICIENCIES = {
    artificer: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons'] },
    barbarian: { simpleWeapons: true, martialWeapons: true, weapons: ['Simple weapons', 'Martial weapons'] },
    bard: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons', 'Hand crossbow', 'Longsword', 'Rapier', 'Shortsword'] },
    cleric: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons'] },
    druid: { simpleWeapons: false, martialWeapons: false, weapons: ['Club', 'Dagger', 'Dart', 'Javelin', 'Mace', 'Quarterstaff', 'Scimitar', 'Sickle', 'Sling', 'Spear'] },
    fighter: { simpleWeapons: true, martialWeapons: true, weapons: ['Simple weapons', 'Martial weapons'] },
    monk: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons', 'Shortsword'] },
    paladin: { simpleWeapons: true, martialWeapons: true, weapons: ['Simple weapons', 'Martial weapons'] },
    ranger: { simpleWeapons: true, martialWeapons: true, weapons: ['Simple weapons', 'Martial weapons'] },
    rogue: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons', 'Hand crossbow', 'Longsword', 'Rapier', 'Shortsword'] },
    sorcerer: { simpleWeapons: false, martialWeapons: false, weapons: ['Dagger', 'Dart', 'Sling', 'Quarterstaff', 'Light crossbow'] },
    warlock: { simpleWeapons: true, martialWeapons: false, weapons: ['Simple weapons'] },
    wizard: { simpleWeapons: false, martialWeapons: false, weapons: ['Dagger', 'Dart', 'Sling', 'Quarterstaff', 'Light crossbow'] },
  };
  const EQUIPMENT_ORGANIZATION_KEY = 'equipmentOrganization';
  const EQUIPMENT_UI_STORAGE_PREFIX = 'eldoria:player-sheet:equipment-ui:';
  const EQUIPMENT_UNASSIGNED_CONTAINER = '';
  const SPELL_SEARCH_CLASS_OPTIONS = Object.keys(CLASS_SOURCE_BY_NAME).map(titleCase);
  const SPELL_SEARCH_SCHOOL_OPTIONS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
  const EQUIPMENT_SEARCH_RARITY_OPTIONS = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact', 'custom'];
  const EQUIPMENT_SEARCH_CATEGORY_OPTIONS = [
    ['all', 'All types'],
    ['weapon', 'Weapons'],
    ['melee weapon', 'Melee weapons'],
    ['ranged weapon', 'Ranged weapons'],
    ['ammunition', 'Ammunition'],
    ['armor', 'Armor'],
    ['shield', 'Shields'],
    ['wondrous item', 'Wondrous items'],
    ['potion', 'Potions'],
    ['scroll', 'Scrolls'],
    ['ring', 'Rings'],
    ['rod', 'Rods'],
    ['staff', 'Staves'],
    ['wand', 'Wands'],
    ['tool', 'Tools'],
    ['adventuring gear', 'Adventuring gear'],
    ['vehicle', 'Vehicles'],
  ];
  const RULE_CATALOG_REFRESH_TOKEN = Date.now().toString(36);
  const RULE_CATALOG_API_ALIASES = {
    manifest: ['manifest', 'rules-manifest'],
    profile: ['profile', 'ruleset-profile'],
  };
  const CURRENCY_TO_GP = { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 };
  const EQUIPMENT_CONTAINER_NAMES = [
    'backpack',
    'pouch',
    'bag',
    'sack',
    'pack',
    'case',
    'chest',
    'box',
    'quiver',
    'scabbard',
    'sheath',
    'satchel',
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
  const CONDITIONS = [
    'blinded',
    'charmed',
    'deafened',
    'exhaustion',
    'frightened',
    'grappled',
    'incapacitated',
    'invisible',
    'paralyzed',
    'petrified',
    'poisoned',
    'prone',
    'restrained',
    'stunned',
    'unconscious',
  ];
  const CIRCLE_LAND_OPTIONS = ['Arctic', 'Coast', 'Desert', 'Forest', 'Grassland', 'Mountain', 'Swamp', 'Underdark'];
  const DRAGONBORN_ANCESTRY_DAMAGE = {
    black: 'acid',
    blue: 'lightning',
    brass: 'fire',
    bronze: 'lightning',
    copper: 'acid',
    gold: 'fire',
    green: 'acid',
    red: 'fire',
    silver: 'cold',
    white: 'cold',
  };
  const FEATURE_OPTION_FALLBACKS = [
    {
      id: 'subclass-ranger-hunter-3-colossus-slayer-phb',
      kind: 'subclass',
      name: 'Colossus Slayer',
      className: 'Ranger',
      subclassName: 'Hunter',
      level: 3,
      source: 'PHB',
      text: "Your tenacity can wear down the most potent foes. When you hit a creature with a weapon attack, the creature takes an extra 1d8 damage if it's below its hit point maximum. You can deal this extra damage only once per turn.",
      timing: 'Triggered',
      choiceGroup: "Hunter's Prey",
      selectedChoice: true,
    },
    {
      id: 'subclass-ranger-hunter-3-giant-killer-phb',
      kind: 'subclass',
      name: 'Giant Killer',
      className: 'Ranger',
      subclassName: 'Hunter',
      level: 3,
      source: 'PHB',
      text: 'When a Large or larger creature within 5 feet of you hits or misses you with an attack, you can use your reaction to attack that creature immediately after its attack, provided that you can see the creature.',
      timing: 'Reaction',
      choiceGroup: "Hunter's Prey",
      selectedChoice: true,
    },
    {
      id: 'subclass-ranger-hunter-3-horde-breaker-phb',
      kind: 'subclass',
      name: 'Horde Breaker',
      className: 'Ranger',
      subclassName: 'Hunter',
      level: 3,
      source: 'PHB',
      text: 'Once on each of your turns when you make a weapon attack, you can make another attack with the same weapon against a different creature that is within 5 feet of the original target and within range of your weapon.',
      timing: 'Triggered',
      choiceGroup: "Hunter's Prey",
      selectedChoice: true,
    },
  ];
  const WEAPON_BASES = [
    { key: 'corpse slayer flamberge bastard sword', baseName: 'Flamberge Bastard Sword', type: 'martial', style: 'melee', ability: 'str', damage: '2d4', damageType: 'slashing', properties: ['heavy', 'versatile (2d6)', 'special'] },
    { key: 'flamberge bastard sword', baseName: 'Flamberge Bastard Sword', type: 'martial', style: 'melee', ability: 'str', damage: '2d4', damageType: 'slashing', properties: ['heavy', 'versatile (2d6)', 'special'] },
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
    { id: 'haste', label: 'Haste', detail: '+2 AC, speed doubled, extra action while active.', duration: 'Concentration, up to 1 minute', acBonus: 2, speedMultiplier: 2 },
    { id: 'mageArmor', label: 'Mage Armor', detail: 'Base AC becomes 13 + Dexterity while not wearing armor.', duration: '8 hours', mageArmor: true },
    { id: 'shieldOfFaith', label: 'Shield of Faith', detail: '+2 AC while concentration is maintained.', duration: 'Concentration, up to 10 minutes', acBonus: 2 },
    { id: 'barkskin', label: 'Barkskin', detail: 'AC cannot be less than 16 while the spell lasts.', duration: 'Concentration, up to 1 hour', acFloor: 16 },
    { id: 'shieldSpell', label: 'Shield Spell', detail: '+5 AC until the start of your next turn.', duration: 'Until the start of your next turn', acBonus: 5 },
    { id: 'halfCover', label: 'Half Cover', detail: '+2 AC and Dexterity saving throws.', duration: 'While covered', acBonus: 2 },
    { id: 'threeQuartersCover', label: 'Three-quarters Cover', detail: '+5 AC and Dexterity saving throws.', duration: 'While covered', acBonus: 5 },
  ];
  const CLASS_STARTING_GEAR_DEFAULTS = {
    artificer: ['Light Crossbow', 'Crossbow Bolts (20)', 'Studded Leather Armor', "Thieves' Tools", "Dungeoneer's Pack"],
    barbarian: ['Greataxe', 'Handaxe', 'Handaxe', "Explorer's Pack", 'Javelin', 'Javelin', 'Javelin', 'Javelin'],
    bard: ['Rapier', "Diplomat's Pack", 'Lute', 'Leather Armor', 'Dagger'],
    cleric: ['Mace', 'Scale Mail', 'Shield', 'Holy Symbol', "Priest's Pack"],
    druid: ['Wooden Shield', 'Scimitar', 'Leather Armor', "Explorer's Pack", 'Druidic Focus'],
    fighter: ['Chain Mail', 'Longsword', 'Shield', 'Light Crossbow', 'Crossbow Bolts (20)', "Dungeoneer's Pack"],
    monk: ['Shortsword', "Dungeoneer's Pack", 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart'],
    paladin: ['Longsword', 'Shield', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', "Priest's Pack", 'Chain Mail', 'Holy Symbol'],
    ranger: ['Scale Mail', 'Shortsword', 'Shortsword', "Dungeoneer's Pack", 'Longbow', 'Arrows (20)'],
    rogue: ['Rapier', 'Shortbow', 'Arrows (20)', "Burglar's Pack", 'Leather Armor', 'Dagger', 'Dagger', "Thieves' Tools"],
    sorcerer: ['Light Crossbow', 'Crossbow Bolts (20)', 'Component Pouch', "Dungeoneer's Pack", 'Dagger', 'Dagger'],
    warlock: ['Light Crossbow', 'Crossbow Bolts (20)', 'Component Pouch', "Scholar's Pack", 'Leather Armor', 'Dagger', 'Dagger'],
    wizard: ['Quarterstaff', 'Component Pouch', "Scholar's Pack", 'Spellbook'],
  };
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
    const selectors = Array.from(root.querySelectorAll('[data-tab-select]'));
    if (!buttons.length || !panels.length) return;

    function activate(id) {
      if (!panels.some(panel => panel.dataset.tabPanel === id)) return;
      buttons.forEach(button => {
        const active = button.dataset.tabTarget === id;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(panel => panel.classList.toggle('active', panel.dataset.tabPanel === id));
      selectors.forEach(selector => {
        selector.value = id;
      });
    }

    buttons.forEach(button => {
      button.addEventListener('click', () => activate(button.dataset.tabTarget));
    });
    selectors.forEach(selector => {
      selector.addEventListener('change', () => activate(selector.value));
    });
    const hashTarget = decodeURIComponent(String(window.location.hash || '').replace(/^#/, ''));
    if (hashTarget) activate(hashTarget);
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

    if (!getApiBaseUrl()) {
      renderPlayerSheetError(root, 'Cloud API is not configured.');
      return;
    }

    try {
      const player = await fetchApi(`players/${encodeURIComponent(id)}`);
      hydratePlayerSheet(root, player);
    } catch (error) {
      renderPlayerSheetError(root, error.message);
    }
  }

  function hydratePlayerSheet(root, player) {
    if (!player || !player.name) return;
    root.dataset.apiState = 'loaded';
    const shellIdentity = getSheetShellIdentity(root);
    const hydrated = preparePlayer({
      ...player,
      portrait: player.portrait || player.portraitUrl || player.image || shellIdentity.portrait,
      classUrl: player.classUrl || shellIdentity.classUrl || buildClassInfoUrl(player),
      itemCatalog: root._itemCatalog,
      raceCatalog: root._raceCatalog,
    });
    root._playerState = hydrated;

    setText(root, '[data-player-field="name"]', hydrated.name);
    setText(root, '[data-player-summary]', [hydrated.race, formatClassSummary(hydrated), `Level ${hydrated.level}`].filter(Boolean).join(' / '));
    hydratePortrait(root, hydrated);

    setText(root, '[data-player-stat="ac"]', hydrated.ac);
    setText(root, '[data-player-stat="initiative"]', formatBonus(hydrated.initiative));
    setText(root, '[data-player-stat="proficiencyBonus"]', formatBonus(hydrated.proficiencyBonus));
    setText(root, '[data-player-stat="speed"]', formatSpeedSummary(hydrated));
    ensureHeroLayout(root, hydrated);

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
    renderDefenseSummary(root, hydrated);
    renderTemporaryEffectsPanel(root, hydrated);
    renderArmorClassPanel(root, hydrated);
    renderWeaponAttacks(root, hydrated);
    renderCombatFeatureActions(root, hydrated);
    renderClassInfoPanel(root, hydrated);
    renderRaceInfoPanel(root, hydrated);
    renderBackgroundInfoPanel(root, hydrated);
    renderFeatInfoPanel(root, hydrated);
    renderActionsPanel(root, hydrated);
    renderResourcesPanel(root, hydrated);
    renderEquipmentPanel(root, hydrated);
    renderSpellPanel(root, hydrated);
    renderNotesForm(root, hydrated);
    renderResourceLinks(root, hydrated);
    bindPlayerSheetEvents(root);
  }

  function ensureHeroLayout(root, player) {
    const hero = root.querySelector('.player-hero');
    if (!hero) return;
    const identity = hero.querySelector('[data-player-summary]') && hero.querySelector('[data-player-summary]').parentElement;
    if (identity) identity.classList.add('hero-identity');
    const stats = hero.querySelector('.hero-stats');
    let overview = hero.querySelector('.hero-overview');
    if (!overview) {
      overview = document.createElement('div');
      overview.className = 'hero-overview';
      if (stats && stats.nextSibling) hero.insertBefore(overview, stats.nextSibling);
      else hero.appendChild(overview);
    }
    overview.innerHTML = renderHeroOverview(player);

    let actions = hero.querySelector('.hero-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'hero-actions';
      hero.appendChild(actions);
    }

    if (!actions.querySelector('.hero-rest-actions')) {
      const rest = document.createElement('div');
      rest.className = 'hero-rest-actions';
      rest.setAttribute('aria-label', 'Rest controls');
      rest.innerHTML = '<button type="button" data-rest-type="short">Short Rest</button><button type="button" data-rest-type="long">Long Rest</button><span data-resource-status></span>';
      actions.insertBefore(rest, actions.firstChild);
    }

    const builderButton = actions.querySelector('[data-character-assistant-open]');
    if (builderButton && !builderButton.closest('.hero-builder-actions')) {
      const builderActions = document.createElement('div');
      builderActions.className = 'hero-builder-actions';
      builderButton.parentNode.insertBefore(builderActions, builderButton);
      builderActions.appendChild(builderButton);
    }

    removeOverviewTab(root);
  }

  function renderHeroOverview(player) {
    const identity = [
      renderHeroInfoCard('Class', player.class, 'class'),
      renderHeroInfoCard('Subclass', player.subclassShortName || player.subclass || '-', 'subclass'),
      renderHeroInfoCard('Race', player.race, 'race'),
      renderHeroInfoCard('Background', player.background, 'background'),
    ].join('');
    const progress = [
      renderHeroInfoCard('XP', player.experience || '-', 'experience'),
      renderHeroInfoCard('Gold', player.gold || 0, 'gold'),
      renderHeroInfoCard('Hero', player.heroPoints || 0, 'heroPoints'),
      renderHeroInfoCard('Guild', player.guildRank || '-', 'guildRank'),
      renderHeroInfoCard('GP', player.guildPoints || '-', 'guildPoints'),
    ].join('');
    return `<div class="hero-overview-group hero-overview-identity">${identity}</div><div class="hero-overview-group hero-overview-progress">${progress}</div>`;
  }

  function renderHeroInfoCard(label, value, field) {
    return `<div class="info-card"><span>${escapeHtml(label)}</span><strong data-player-field="${escapeAttr(field)}">${escapeHtml(String(value ?? '-'))}</strong></div>`;
  }

  function removeOverviewTab(root) {
    const overviewPanel = root.querySelector('[data-tab-panel="overview"]');
    const overviewButton = root.querySelector('[data-tab-target="overview"]');
    const wasActive = Boolean((overviewPanel && overviewPanel.classList.contains('active')) || (overviewButton && overviewButton.classList.contains('active')));
    if (overviewButton) overviewButton.remove();
    if (overviewPanel) overviewPanel.remove();
    root.querySelectorAll('[data-tab-select] option[value="overview"]').forEach(option => option.remove());
    if (wasActive) activateSheetTab(root, 'stats');
  }

  function activateSheetTab(root, id) {
    root.querySelectorAll('[data-tab-target]').forEach(button => {
      const active = button.dataset.tabTarget === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    root.querySelectorAll('[data-tab-panel]').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.tabPanel === id);
    });
    root.querySelectorAll('[data-tab-select]').forEach(selector => {
      selector.value = id;
    });
  }

  function hydratePortrait(root, player) {
    const target = root.querySelector('[data-player-portrait]');
    if (!target) return;
    const portraits = getPortraitCandidates(root, player);
    const fallback = `<span>${escapeHtml(String(player.name || '?').slice(0, 1) || '?')}</span>`;
    if (!portraits.length) {
      target.innerHTML = fallback;
      return;
    }
    renderPortraitCandidate(target, player, portraits, 0, fallback);
  }

  function renderPortraitCandidate(target, player, portraits, index, fallback) {
    const portrait = portraits[index];
    if (!portrait) {
      target.innerHTML = fallback;
      return;
    }
    target.innerHTML = `<img src="${escapeAttr(resolveSheetUrl(portrait))}" alt="${escapeAttr(player.name || 'Character')} portrait">`;
    const image = target.querySelector('img');
    if (image) image.addEventListener('error', () => {
      renderPortraitCandidate(target, player, portraits, index + 1, fallback);
    }, { once: true });
  }

  function renderResourceLinks(root, player) {
    const target = root.querySelector('[data-player-resource-links]');
    if (!target) return;
    const links = [];
    if (player.notesUrl) links.push(`<a href="${escapeAttr(resolveSheetUrl(player.notesUrl))}">Player notes</a>`);
    const classUrl = player.classUrl || buildClassInfoUrl(player);
    if (classUrl) links.push(`<a href="${escapeAttr(resolveSheetUrl(classUrl))}">${escapeHtml(player.class ? `${player.class} class info` : 'Full class info')}</a>`);
    links.push(`<a href="${escapeAttr(resolveSheetUrl('spell-search.html'))}">Quick spell lookup</a>`);
    target.innerHTML = links.join('');
  }

  function getSheetShellIdentity(root) {
    const builder = root && root.querySelector('[data-character-builder]');
    const portrait = cleanDetailValue(root && root.dataset.playerPortraitSrc)
      || cleanDetailValue(builder && builder.dataset.builderPortrait);
    const classUrl = cleanDetailValue(root && root.dataset.playerClassUrl);
    return { portrait, classUrl };
  }

  function getPortraitCandidates(root, player) {
    const shell = getSheetShellIdentity(root);
    const raw = [
      player && player.portrait,
      player && player.portraitUrl,
      player && player.image,
      shell.portrait,
    ].map(cleanDetailValue).filter(Boolean);
    const names = [
      player && player.name,
      player && player.sheetTitle,
      root && root.dataset.playerId,
    ].flatMap(getPortraitNameVariants);
    for (const name of names) {
      raw.push(`Public/Players/${name}Dnd.png`);
      raw.push(`Public/Players/${name}DnD.png`);
    }
    return uniqueStrings(raw);
  }

  function getPortraitNameVariants(value) {
    const text = cleanDetailValue(value).replace(/player sheet/ig, '').replace(/[-_]+/g, ' ').trim();
    if (!text) return [];
    const compact = text.replace(/[^A-Za-z0-9]/g, '');
    if (!compact) return [];
    const variants = [compact, titleCase(compact)];
    if (compact.length <= 3) variants.push(compact.toUpperCase());
    return uniqueStrings(variants);
  }

  function buildClassInfoUrl(player) {
    const className = cleanDetailValue(player && player.class);
    if (!className) return '';
    const classKey = normalizeName(className).replace(/\s+/g, '-');
    const source = CLASS_SOURCE_BY_NAME[normalizeName(className)] || 'phb';
    return `5etools/classes.html#${classKey}_${source}`;
  }

  function renderPlayerSheetError(root, message) {
    root.dataset.apiState = 'error';
    setText(root, '[data-player-summary]', `Cloud player sheet unavailable: ${message || 'API request failed'}`);
    root.querySelectorAll('[data-player-stat]').forEach(node => {
      node.textContent = '-';
    });
    root.querySelectorAll('[data-player-field]').forEach(node => {
      if (node.dataset.playerField !== 'name') node.textContent = '-';
    });
    root.querySelectorAll('[data-player-ability] strong, [data-player-ability] em, [data-player-save] strong, [data-player-skill] strong').forEach(node => {
      node.textContent = '-';
    });
    root.querySelectorAll('[data-player-notes-form] button').forEach(button => {
      button.disabled = true;
    });
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
      const bonus = calculateModifier(score) + (proficient ? prof : 0);
      setRollableLine(row, formatBonus(bonus), 'save', ability, `${ABILITY_NAMES[ability] || ability.toUpperCase()} save`);
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
      const bonus = calculateModifier(score) + (proficient ? prof : 0);
      setRollableLine(row, formatBonus(bonus), 'skill', skill, `${formatSkillLabel(skill)} check`);
    });
  }

  function setRollableLine(row, value, type, id, label) {
    let actions = row.querySelector('.line-stat-actions');
    let strong = actions && actions.querySelector('strong') || row.querySelector('strong');
    if (!strong) {
      strong = row.ownerDocument.createElement('strong');
      row.appendChild(strong);
    }
    if (!actions) {
      actions = row.ownerDocument.createElement('span');
      actions.className = 'line-stat-actions';
      strong.replaceWith(actions);
      actions.appendChild(strong);
    }
    strong.textContent = value;
    let button = actions.querySelector(`[data-roll-${type}]`);
    if (!button) {
      button = row.ownerDocument.createElement('button');
      button.className = 'roll-button stat-roll-button';
      button.type = 'button';
      button.textContent = 'Roll';
      actions.appendChild(button);
    }
    button.dataset[`roll${capitalize(type)}`] = id;
    button.setAttribute('aria-label', `Roll ${label}`);
    button.title = `Roll ${label}`;
  }

  function getSkillBonus(player, skill) {
    const abilityBySkill = Object.fromEntries(SKILLS);
    const ability = abilityBySkill[skill];
    const score = Number(player.abilities && player.abilities[ability]);
    const proficient = new Set((player.skills || []).map(String)).has(skill);
    return calculateModifier(Number.isFinite(score) ? score : 10) + (proficient ? Number(player.proficiencyBonus) || 0 : 0);
  }

  function getSaveBonus(player, ability) {
    const prof = Number(player.proficiencyBonus) || 0;
    const saves = new Set((player.saves || []).map(String));
    const score = Number(player.abilities && player.abilities[ability]);
    return calculateModifier(Number.isFinite(score) ? score : 10) + (saves.has(ability) ? prof : 0);
  }

  function formatSkillLabel(skill) {
    return SKILL_LABELS[skill] || titleCase(String(skill || '').replace(/([a-z])([A-Z])/g, '$1 $2'));
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

  function normalizePlayerDefenses(player) {
    const source = player && player.defenses && typeof player.defenses === 'object' ? player.defenses : {};
    return {
      resistances: normalizeDefenseEntries(source.resistances || player && (player.resistances || player.damageResistances || player.damageResistance), player, 'resistance'),
      vulnerabilities: normalizeDefenseEntries(source.vulnerabilities || player && (player.vulnerabilities || player.damageVulnerabilities || player.damageVulnerability), player, 'vulnerability'),
      immunities: normalizeDefenseEntries(source.immunities || player && (player.immunities || player.damageImmunities || player.damageImmunity), player, 'immunity'),
      conditionImmunities: normalizeDefenseEntries(source.conditionImmunities || player && player.conditionImmunities, player, 'conditionImmunity'),
    };
  }

  function normalizeDefenseEntries(value, player = null, kind = '') {
    const entries = Array.isArray(value) ? value : cleanDetailValue(value).split(/[,;/]|\band\b/i);
    return uniqueStrings(entries
      .map(entry => resolveDefenseEntryLabel(player, entry, kind))
      .map(entry => cleanDetailValue(entry).replace(/\s+damage$/i, '').trim())
      .filter(Boolean));
  }

  function resolveDefenseEntryLabel(player, value, kind = '') {
    const text = cleanDetailValue(value);
    if (!text) return '';
    if (kind === 'resistance' && isGenericDraconicAncestryDefense(text)) {
      const ancestry = getSelectedDraconicAncestry(player);
      const damage = ancestry && DRAGONBORN_ANCESTRY_DAMAGE[normalizeName(ancestry)];
      if (damage) return `${titleCase(damage)} Resistance`;
    }
    return text;
  }

  function isGenericDraconicAncestryDefense(value) {
    const clean = normalizeName(value);
    return clean === 'draconic ancestry'
      || clean === 'draconic ancestry damage type'
      || clean === 'damage type associated with your draconic ancestry'
      || clean.includes('associated with your draconic ancestry');
  }

  function getSelectedDraconicAncestry(player) {
    const choices = [
      player && player.draconicAncestry,
      player && player.dragonAncestry,
      player && player.ancestry,
    ];
    const featureChoices = {
      ...((player && player.ruleChoices && player.ruleChoices.featureChoices && typeof player.ruleChoices.featureChoices === 'object') ? player.ruleChoices.featureChoices : {}),
      ...((player && player.featureChoices && typeof player.featureChoices === 'object') ? player.featureChoices : {}),
    };
    Object.entries(featureChoices).forEach(([key, value]) => {
      if (!/draconic|dragonborn|ancestry/i.test(`${key} ${value}`)) return;
      if (Array.isArray(value)) choices.push(...value);
      else choices.push(value);
    });
    const featureText = [...(player && player.ruleFeatures || []), ...(player && player.ruleEffects || [])]
      .map(feature => `${feature && feature.selectedChoice || ''} ${feature && feature.choice || ''} ${feature && feature.ancestry || ''}`)
      .join(' ');
    if (featureText) choices.push(featureText);
    return choices.map(value => {
      const clean = normalizeName(value);
      return Object.keys(DRAGONBORN_ANCESTRY_DAMAGE).find(name => new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(clean));
    }).find(Boolean) || '';
  }

  function mergePlayerDefenses(base, inferred) {
    return {
      resistances: uniqueStrings([...(base && base.resistances || []), ...(inferred && inferred.resistances || [])]),
      vulnerabilities: uniqueStrings([...(base && base.vulnerabilities || []), ...(inferred && inferred.vulnerabilities || [])]),
      immunities: uniqueStrings([...(base && base.immunities || []), ...(inferred && inferred.immunities || [])]),
      conditionImmunities: uniqueStrings([...(base && base.conditionImmunities || []), ...(inferred && inferred.conditionImmunities || [])]),
    };
  }

  function inferPlayerDefenses(player) {
    const defenses = { resistances: [], vulnerabilities: [], immunities: [], conditionImmunities: [] };
    const rules = [
      ...(player.ruleEffects || []),
      ...(player.ruleFeatures || []),
      ...(player.featDetails || []),
      ...(player.backgroundDetails || []),
      ...(player.inventory || [])
        .filter(item => isItemEquipped(player, item))
        .flatMap(item => [item.details, ...(item.details && item.details.effects || [])]),
    ].filter(Boolean);

    for (const rule of rules) {
      addStructuredDefenseGrants(defenses, rule);
      const text = cleanRulesText(`${rule.name || rule.label || ''}. ${rule.text || rule.detail || rule.featureText || ''}`);
      addInferredDefenses(defenses, text, player);
    }

    return defenses;
  }

  function addStructuredDefenseGrants(defenses, rule) {
    const grants = Array.isArray(rule && rule.grants) ? rule.grants : [];
    grants.forEach(grant => {
      const type = normalizeName(grant && grant.type);
      const value = grant && (grant.damageType || grant.value || grant.target);
      if (!value) return;
      if (type === 'resistance') addUniqueText(defenses.resistances, value);
      if (type === 'vulnerability') addUniqueText(defenses.vulnerabilities, value);
      if (type === 'immunity') addUniqueText(defenses.immunities, value);
      if (type === 'condition immunity' || type === 'condition-immunity') addUniqueText(defenses.conditionImmunities, value);
    });
  }

  function addInferredDefenses(defenses, text, player = null) {
    const clean = cleanRulesText(text);
    if (!clean) return;
    splitDefenseRuleSegments(clean).forEach(segment => {
      addSelfDamageDefense(defenses.resistances, segment, 'resistance');
      addSelfDamageDefense(defenses.immunities, segment, 'immunity');
      addSelfDamageDefense(defenses.vulnerabilities, segment, 'vulnerability');
      addSelfConditionImmunities(defenses.conditionImmunities, segment);
    });
    if (/\bassociated with your draconic ancestry\b/i.test(clean)) addUniqueText(defenses.resistances, resolveDefenseEntryLabel(player, 'draconic ancestry', 'resistance'));
  }

  function splitDefenseRuleSegments(text) {
    return cleanRulesText(text)
      .split(/(?<=[.!?])\s+|;\s+|\s+-\s+/)
      .map(part => part.trim())
      .filter(Boolean);
  }

  function addSelfDamageDefense(target, segment, kind) {
    getSelfDamageDefensePhrases(segment, kind).forEach(phrase => {
      DAMAGE_TYPES.forEach(type => {
        if (new RegExp(`\\b${type}\\b`, 'i').test(phrase)) addUniqueText(target, type);
      });
      if (/\ball damage\b/i.test(phrase)) addUniqueText(target, 'all damage');
    });
  }

  function getSelfDamageDefensePhrases(segment, kind) {
    if (kind === 'resistance' && /\binstead of immunity\b/i.test(segment)) return [];
    if (kind === 'immunity' && /\binstead of resistance\b/i.test(segment)) return [];
    if (kind === 'immunity' && /\bif you already have\b/i.test(segment)) return [];
    const patterns = {
      resistance: [
        /\byou(?:\s+and\s+[^.;:]{1,80})?\s+(?:also\s+)?(?:have|gain|gains|gained)\s+resistance\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /\byou(?:\s+and\s+[^.;:]{1,80})?\s+are\s+resistant\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /^resistance\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /^resistant\s+to\s+([^.;:]+?\bdamage\b)/ig,
      ],
      immunity: [
        /\byou(?:\s+and\s+[^.;:]{1,80})?\s+(?:also\s+)?(?:have|gain|gains|gained)\s+immunity\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /\byou(?:\s+and\s+[^.;:]{1,80})?\s+are\s+immune\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /^immunity\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /^immune\s+to\s+([^.;:]+?\bdamage\b)/ig,
      ],
      vulnerability: [
        /\byou(?:\s+and\s+[^.;:]{1,80})?\s+(?:also\s+)?(?:have|gain|gains|gained)\s+vulnerability\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /\byou(?:\s+and\s+[^.;:]{1,80})?\s+(?:are|become)\s+vulnerable\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /^vulnerability\s+to\s+([^.;:]+?\bdamage\b)/ig,
        /^vulnerable\s+to\s+([^.;:]+?\bdamage\b)/ig,
      ],
    }[kind] || [];
    const out = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(segment))) out.push(match[1] || '');
    });
    return out;
  }

  function addSelfConditionImmunities(target, segment) {
    if (!/\byou\b/i.test(segment) && !/^(?:immune|immunity)\b/i.test(segment)) return;
    const phrases = [];
    [
      /\byou(?:\s+and\s+[^.;:]{1,80})?\s+are\s+immune\s+to\s+([^.;:]+)/ig,
      /\byou(?:\s+and\s+[^.;:]{1,80})?\s+(?:also\s+)?(?:have|gain|gains|gained)\s+immunity\s+to\s+([^.;:]+)/ig,
      /^immune\s+to\s+([^.;:]+)/ig,
      /^immunity\s+to\s+([^.;:]+)/ig,
    ].forEach(pattern => {
      let match;
      while ((match = pattern.exec(segment))) phrases.push(match[1] || '');
    });
    phrases.forEach(phrase => {
      CONDITIONS.forEach(condition => {
        if (new RegExp(`\\b${condition}\\b`, 'i').test(phrase)) addUniqueText(target, condition);
      });
    });
  }

  function addUniqueText(target, value) {
    const clean = cleanDetailValue(value).toLowerCase();
    if (clean && !target.some(entry => normalizeName(entry) === normalizeName(clean))) target.push(clean);
  }

  function preparePlayer(player) {
    const abilities = Object.fromEntries(Object.keys(ABILITY_NAMES).map(ability => [ability, Number(player.abilities && player.abilities[ability]) || 10]));
    const providedScrolls = Array.isArray(player.spellScrolls) ? player.spellScrolls.map(normalizeSpellScroll).filter(Boolean) : [];
    const baseAc = getBaseSheetValue(player.ac, player.baseAc, player.acProfile && player.acProfile.total, 10);
    const sourceSpeedProfile = normalizeSpeedProfile(player.speedProfile || player.speed, 30);
    const baseSpeed = getBaseSheetValue(typeof player.speed === 'object' ? sourceSpeedProfile.walk : player.speed, player.baseSpeed, sourceSpeedProfile.total, 30);
    const initiative = coalesceNumber(player.initiative, player.initiativeBonus, calculateModifier(abilities.dex));
    const prepared = {
      ...player,
      abilities,
      portrait: cleanDetailValue(player.portrait || player.portraitUrl || player.image),
      subclass: cleanDetailValue(player.subclass),
      subclassShortName: cleanDetailValue(player.subclassShortName),
      equipment: Array.isArray(player.equipment) ? player.equipment.filter(Boolean).map(String) : [],
      equipped: Array.isArray(player.equipped) ? player.equipped.map(String) : [],
      combatToggles: player.combatToggles && typeof player.combatToggles === 'object' ? player.combatToggles : {},
      spells: Array.isArray(player.spells) ? player.spells.filter(Boolean).map(String) : [],
      manualSpells: Array.isArray(player.manualSpells) ? player.manualSpells.filter(Boolean).map(String) : [],
      grantedSpells: Array.isArray(player.grantedSpells) ? player.grantedSpells.filter(Boolean).map(String) : [],
      spellMetadata: player.spellMetadata && typeof player.spellMetadata === 'object' ? player.spellMetadata : {},
      spellMetadataByName: player.spellMetadataByName && typeof player.spellMetadataByName === 'object' ? player.spellMetadataByName : {},
      itemDetails: player.itemDetails && typeof player.itemDetails === 'object' ? player.itemDetails : {},
      spellDetails: player.spellDetails && typeof player.spellDetails === 'object' ? player.spellDetails : {},
      backgroundDetails: normalizeRuleDetailArray(player.backgroundDetails),
      featDetails: normalizeRuleDetailArray(player.featDetails),
      ruleActions: Array.isArray(player.ruleActions) ? player.ruleActions : [],
      ruleActivations: Array.isArray(player.ruleActivations) ? player.ruleActivations : [],
      ruleEffects: Array.isArray(player.ruleEffects) ? player.ruleEffects : [],
      resources: Array.isArray(player.resources) ? player.resources : [],
      resourceUses: player.resourceUses && typeof player.resourceUses === 'object' ? player.resourceUses : {},
      spellSlots: player.spellSlots && typeof player.spellSlots === 'object' ? player.spellSlots : {},
      spellSlotUses: player.spellSlotUses && typeof player.spellSlotUses === 'object' ? player.spellSlotUses : {},
      itemCharges: player.itemCharges && typeof player.itemCharges === 'object' ? player.itemCharges : {},
      actionUses: player.actionUses && typeof player.actionUses === 'object' ? player.actionUses : {},
      preparedSpells: Array.isArray(player.preparedSpells) ? player.preparedSpells.filter(Boolean).map(String) : [],
      defenses: normalizePlayerDefenses(player),
      acMode: cleanDetailValue(player.acMode) === 'official' ? 'official' : 'custom',
      temporaryEffects: normalizeTemporaryEffects(player.temporaryEffects),
      conditions: Array.isArray(player.conditions) ? player.conditions.map(String).filter(Boolean) : [],
      concentration: cleanDetailValue(player.concentration),
      tempHp: Number(player.tempHp) || 0,
      experience: coalesceNumber(player.experience, player.xp, 0),
      gold: coalesceNumber(player.gold, 0),
      heroPoints: coalesceNumber(player.heroPoints, player.hero, 0),
      guildPoints: coalesceNumber(player.guildPoints, player.guild, 0),
      guildRank: cleanDetailValue(player.guildRank),
      notes: String(player.notes || ''),
      proficiencyBonus: Number(player.proficiencyBonus) || calculateProficiencyBonus(Number(player.level) || 1),
      initiative,
      baseAc,
      ac: baseAc,
      baseSpeed,
      speed: baseSpeed,
      currentHp: player.currentHp === null || player.currentHp === undefined ? null : Number(player.currentHp),
      maxHp: player.maxHp === null || player.maxHp === undefined ? null : Number(player.maxHp),
    };
    prepared.spellcasting = resolveSpellcastingAbility(prepared) || false;
    prepared.spellAttack = coalesceNullableNumber(prepared.spellAttack, calculateSpellAttack(prepared));
    prepared.spellSaveDc = coalesceNullableNumber(prepared.spellSaveDc, calculateSpellSaveDc(prepared));
    prepared.spellScrolls = buildCurrentSpellScrolls(prepared.equipment, providedScrolls);
    prepared.inventory = buildInventory(prepared);
    if (!prepared.equipped.length) prepared.equipped = inferDefaultEquipped(prepared.inventory);
    prepared.equippedNames = getEquippedItems(prepared).map(item => normalizeName(item.name));
    prepared.inventory = buildInventory(prepared);
    prepared.resources = uniqueRuleRecords([...(prepared.resources || []), ...buildInventoryResourceRecords(prepared)]);
    prepared.defenses = mergePlayerDefenses(prepared.defenses, inferPlayerDefenses(prepared));
    prepared.weapons = prepared.inventory.filter(item => item.weapon);
    prepared.acProfile = buildArmorClassProfile(prepared);
    prepared.ac = prepared.acProfile.total;
    prepared.speedProfile = buildSpeedProfile(prepared);
    prepared.speed = prepared.speedProfile.total;
    prepared.simpleMelee = calculateAttackBonus(prepared, 'str', hasWeaponCategoryProficiency(prepared, 'simple'));
    prepared.simpleRanged = calculateAttackBonus(prepared, 'dex', hasWeaponCategoryProficiency(prepared, 'simple'));
    prepared.martialMelee = calculateAttackBonus(prepared, 'str', hasWeaponCategoryProficiency(prepared, 'martial'));
    prepared.martialRanged = calculateAttackBonus(prepared, 'dex', hasWeaponCategoryProficiency(prepared, 'martial'));
    return prepared;
  }

  function coalesceNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return 0;
  }

  function coalesceNullableNumber(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function normalizeAbilityKey(value) {
    const clean = normalizeName(value);
    if (ABILITY_NAMES[clean]) return clean;
    for (const [key, label] of Object.entries(ABILITY_NAMES)) {
      if (clean === normalizeName(label) || clean === normalizeName(label.slice(0, 3))) return key;
    }
    return '';
  }

  function resolveSpellcastingAbility(player) {
    return normalizeAbilityKey(player && (player.spellcastingAbility || player.spellAbility || player.spellcasting));
  }

  function calculateAttackBonus(player, ability, proficient) {
    const score = Number(player.abilities && player.abilities[ability]) || 10;
    return calculateModifier(score) + (proficient ? Number(player.proficiencyBonus) || 0 : 0);
  }

  function normalizeRuleDetailArray(value) {
    const rows = Array.isArray(value)
      ? value
      : (value && typeof value === 'object' ? Object.values(value) : []);
    return rows.map(detail => ({
      id: cleanDetailValue(detail && detail.id),
      name: cleanDetailValue(detail && detail.name),
      source: cleanDetailValue(detail && detail.source),
      page: cleanDetailValue(detail && detail.page),
      prerequisites: cleanDetailValue(detail && detail.prerequisites),
      abilityScores: cleanDetailValue(detail && detail.abilityScores),
      repeatable: cleanDetailValue(detail && detail.repeatable),
      skillProficiencies: cleanDetailValue(detail && detail.skillProficiencies),
      toolProficiencies: cleanDetailValue(detail && detail.toolProficiencies),
      languages: cleanDetailValue(detail && detail.languages),
      equipment: cleanDetailValue(detail && detail.equipment),
      featureName: cleanDetailValue(detail && detail.featureName),
      featureText: cleanRulesText(detail && detail.featureText),
      text: cleanRulesText(detail && detail.text),
      timing: cleanDetailValue(detail && detail.timing),
      grants: Array.isArray(detail && detail.grants) ? detail.grants : [],
      missing: Boolean(detail && detail.missing),
    })).filter(detail => detail.name);
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
    const explicit = normalizeSpeedProfile(player.speedProfile || player.speeds, base);
    const racial = inferRaceSpeedProfile(player, base);
    const merged = mergeSpeedProfiles({ total: base, walk: base, speeds: { walk: base }, parts: [{ label: 'Base speed', mode: 'walk', display: `${base} ft` }] }, explicit, racial);
    const state = normalizeTemporaryEffects(player && player.temporaryEffects);
    const haste = state.effects.haste;
    const speeds = { ...(merged.speeds || { walk: merged.walk || merged.total || base }) };
    if (!speeds.walk) speeds.walk = merged.walk || merged.total || base;
    if (haste) {
      for (const mode of Object.keys(speeds)) speeds[mode] = Number(speeds[mode]) * 2;
    }
    return {
      total: speeds.walk,
      walk: speeds.walk,
      speeds,
      parts: [
        ...(merged.parts || [{ label: 'Base speed', mode: 'walk', display: `${base} ft` }]),
        haste ? { label: 'Haste', display: 'x2' } : null,
      ].filter(Boolean),
    };
  }

  function normalizeSpeedProfile(value, fallbackWalk = 30) {
    const speeds = normalizeSpeedMap(value && value.speeds ? value.speeds : value, fallbackWalk);
    const total = speeds.walk || Number(value && value.total) || Number(value && value.walk) || fallbackWalk;
    const parts = Array.isArray(value && value.parts) ? value.parts : [{ label: 'Base speed', mode: 'walk', display: `${total} ft` }];
    return { total, walk: total, speeds: { walk: total, ...speeds }, parts };
  }

  function normalizeSpeedMap(value, fallbackWalk = 30) {
    const source = value && typeof value === 'object' ? value : { walk: value };
    const walk = Number(source.walk || source.total || fallbackWalk) || fallbackWalk;
    const out = { walk };
    for (const mode of ['climb', 'swim', 'fly', 'burrow']) {
      const raw = source[mode];
      if (raw === true) out[mode] = walk;
      else if (Number(raw)) out[mode] = Number(raw);
    }
    return out;
  }

  function inferRaceSpeedProfile(player, fallbackWalk = 30) {
    const race = findPlayerRaceRule(player);
    if (!race || race.speed === '' || race.speed === null || race.speed === undefined) return null;
    const speeds = normalizeSpeedMap(race.speed, fallbackWalk);
    const parts = [{ label: race.name || 'Race speed', mode: 'walk', display: `${speeds.walk} ft` }];
    for (const mode of ['climb', 'swim', 'fly', 'burrow']) {
      if (speeds[mode]) parts.push({ label: `${capitalize(mode)} speed`, mode, display: `${speeds[mode]} ft` });
    }
    return { total: speeds.walk, walk: speeds.walk, speeds, parts };
  }

  function findPlayerRaceRule(player) {
    const catalog = Array.isArray(player && player.raceCatalog) ? player.raceCatalog : [];
    if (!catalog.length) return null;
    const ids = new Set([
      player.raceId,
      ...(Array.isArray(player.raceIds) ? player.raceIds : []),
    ].map(cleanDetailValue).filter(Boolean));
    if (ids.size) {
      const byId = catalog.find(race => ids.has(cleanDetailValue(race && race.id)));
      if (byId) return byId;
    }
    const names = [
      player.race,
      ...(Array.isArray(player.races) ? player.races : []),
    ].map(normalizeName).filter(Boolean);
    if (!names.length) return null;
    const matches = catalog.filter(race => {
      const keys = [race && race.name, race && race.baseName, race && race.subraceName, ...(Array.isArray(race && race.aliases) ? race.aliases : [])]
        .map(normalizeName)
        .filter(Boolean);
      return names.some(name => keys.includes(name));
    });
    return matches.sort((a, b) => raceSourceRank(a && a.source) - raceSourceRank(b && b.source) || compareText(a && a.name, b && b.name))[0] || null;
  }

  function raceSourceRank(source) {
    const order = ['PHB', 'VGM', 'EEPC', 'DMG', 'XGE', 'TCE', 'SCAG', 'MPMM'];
    const index = order.indexOf(String(source || '').toUpperCase());
    return index >= 0 ? index : order.length;
  }

  function mergeSpeedProfiles(...profiles) {
    const out = { total: 30, walk: 30, speeds: { walk: 30 }, parts: [] };
    for (const profile of profiles.filter(Boolean)) {
      const speeds = normalizeSpeedMap(profile.speeds || profile, out.walk || 30);
      out.speeds = { ...out.speeds, ...speeds };
      out.walk = speeds.walk || out.walk;
      out.total = out.walk;
      if (Array.isArray(profile.parts) && profile.parts.length) out.parts = profile.parts;
    }
    return out;
  }

  function formatSpeedSummary(player) {
    const profile = player && player.speedProfile ? player.speedProfile : normalizeSpeedProfile(player && player.speed, 30);
    const speeds = normalizeSpeedMap(profile.speeds || profile, Number(profile.total) || Number(player && player.speed) || 30);
    return [
      ['walk', 'Walk'],
      ['swim', 'Swim'],
      ['climb', 'Climb'],
      ['fly', 'Fly'],
      ['burrow', 'Burrow'],
    ]
      .filter(([mode]) => Number(speeds[mode]) > 0)
      .map(([mode, label]) => `${label} ${Number(speeds[mode])} ft`)
      .join(' / ') || '-';
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

  function buildInventoryResourceRecords(player) {
    return (Array.isArray(player && player.inventory) ? player.inventory : []).flatMap(item => {
      const resources = item && item.details && Array.isArray(item.details.resources) ? item.details.resources : [];
      return resources.map(resource => ({
        sourceType: 'item',
        sourceId: item.details && item.details.id || item.id,
        itemName: item.name,
        ...resource,
      }));
    });
  }

  function buildWeaponProfile(name, id, player, details = null) {
    const normalized = normalizeName(name);
    const detailType = normalizeName(details && details.type);
    if (detailType.includes('armor') || detailType.includes('shield')) return null;
    const ruleWeapon = details && details.weapon;
    const base = ruleWeapon || WEAPON_BASES.find(candidate => normalized.includes(candidate.key));
    if (!base) return null;

    const catalogDamage = parseCatalogDamage(details && details.damage);
    const properties = ruleWeapon && ruleWeapon.properties && ruleWeapon.properties.length ? ruleWeapon.properties : (details && details.properties ? splitProperties(details.properties) : base.properties || []);
    const magicBonus = ruleWeapon ? Number(ruleWeapon.magicBonus) || parseMagicBonus(name, details) : parseMagicBonus(name, details);
    const ability = resolveWeaponAbility(base, player, id, properties);
    const abilityMod = calculateModifier(Number(player.abilities && player.abilities[ability]) || 10);
    const proficient = isWeaponProficient(player, base, details, name);
    const proficiencyBonus = proficient ? Number(player.proficiencyBonus) || 0 : 0;
    const styleBonus = getStyleBonus(player, base);
    const baseDamage = (ruleWeapon && ruleWeapon.damage) || catalogDamage.damage || base.damage;
    const versatileDamage = (ruleWeapon && ruleWeapon.versatileDamage) || parseVersatileDamage(properties);
    const handMode = getWeaponHandMode(player, id, properties);
    const finesse = isFinesseWeapon(base, properties);
    const damage = handMode === 'two' && versatileDamage ? versatileDamage : baseDamage;
    const damageType = (ruleWeapon && ruleWeapon.damageType) || catalogDamage.damageType || base.damageType;
    const toggleEffects = getWeaponToggleEffects(player, { base, details, id, name, properties, style: base.style, damageType, proficient });
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
      finesse,
      damageType,
      damageBonus,
      damageFormula: formatFullDamageFormula(damage, damageBonus, toggleEffects.extraDamage),
      attackBonus,
      attackParts: buildWeaponAttackParts(ability, abilityMod, proficiencyBonus, magicBonus, styleBonus, proficient).concat(toggleEffects.attackParts),
      damageParts: buildWeaponDamageParts(ability, abilityMod, magicBonus).concat(toggleEffects.damageParts, toggleEffects.extraDamage.map(effect => ({ label: effect.label, display: `${effect.dice} ${effect.damageType}` }))),
      extraDamage: toggleEffects.extraDamage,
      onHitEffects: toggleEffects.onHitEffects,
      activationUses: toggleEffects.activationUses,
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
    const effects = {
      attackParts: [],
      damageParts: [],
      extraDamage: [],
      onHitEffects: [],
      activationUses: [],
      labels: [],
    };

    if (state.greatWeaponMaster && weaponEquipped && weaponContext.proficient && hasPlayerFeat(player, 'great weapon master') && heavyMelee) {
      effects.attackParts.push({ label: 'Great Weapon Master', value: -5 });
      effects.damageParts.push({ label: 'Great Weapon Master', value: 10 });
      effects.labels.push('Great Weapon Master');
    }

    if (state.corpseSlayerUndeadTarget && weaponEquipped && normalizeName(weaponContext.name).includes('corpse slayer')) {
      effects.extraDamage.push({ label: 'Corpse Slayer vs undead', dice: '1d8', damageType: weaponContext.damageType || 'weapon' });
      effects.onHitEffects.push({ label: 'Corpse Slayer vs undead', text: 'Undead target has disadvantage on saves against effects that turn undead until your next turn.' });
      effects.labels.push('Undead Target');
    }

    for (const toggle of getWeaponToggleRulesForWeapon(player, weaponContext)) {
      const toggleState = getWeaponToggleRuntimeState(player, weaponContext, toggle, state);
      if (!isWeaponToggleActive(toggleState, toggle)) continue;
      const sourceItem = findToggleSourceItem(player, toggle);
      if (sourceItem && !isItemEquipped(player, sourceItem)) continue;
      const resourceId = getWeaponToggleResourceId(player, sourceItem || weaponContext, toggle);
      const resourceState = resourceId ? getResourceUseState(player, resourceId) : null;
      const consumeOn = getWeaponToggleConsumeOn(toggle);
      const resourceCost = getWeaponToggleResourceCost(toggle, toggleState);
      if (resourceState && resourceState.max !== null && resourceState.available < resourceCost && consumeOn !== 'activation') continue;
      let hasOnHitEffect = false;
      for (const effect of toggle.effects || []) {
        if (effect.kind === 'extra-damage') {
          effects.extraDamage.push({
            label: effect.label || toggle.label,
            dice: effect.dice,
            damageType: effect.damageType === 'weapon' ? (weaponContext.damageType || 'weapon') : effect.damageType,
          });
        } else if (effect.kind === 'weapon-attack-bonus') {
          effects.attackParts.push({ label: effect.label || toggle.label, value: resolveWeaponToggleEffectValue(toggleState, toggle, effect) });
        } else if (effect.kind === 'weapon-damage-bonus') {
          effects.damageParts.push({ label: effect.label || toggle.label, value: resolveWeaponToggleEffectValue(toggleState, toggle, effect) });
        } else if (effect.kind === 'on-hit') {
          hasOnHitEffect = true;
          effects.onHitEffects.push({ label: effect.label || toggle.label, text: formatWeaponOnHitEffectText(player, effect, toggle) });
        }
      }
      if (!hasOnHitEffect && hasOnHitToggleText(toggle)) {
        effects.onHitEffects.push({ label: toggle.label || toggle.title || toggle.id, text: toggle.text || formatToggleEffects(toggle) });
      }
      if (resourceId && consumeOn === 'damage-roll') {
        effects.activationUses.push({
          toggleId: toggle.id,
          resourceId,
          resourceCost,
          label: toggle.label || toggle.title || toggle.id,
          consumeOn,
          shared: usesSharedWeaponToggleState(toggle),
          stateKey: getSharedWeaponToggleStateKey(toggle),
        });
      }
      if (resourceId && consumeOn === 'attack-roll') {
        effects.activationUses.push({
          toggleId: toggle.id,
          resourceId,
          resourceCost,
          label: toggle.label || toggle.title || toggle.id,
          consumeOn,
          shared: usesSharedWeaponToggleState(toggle),
          stateKey: getSharedWeaponToggleStateKey(toggle),
        });
      }
      effects.labels.push(toggle.label || toggle.id);
    }

    return effects;
  }

  function getWeaponToggleRulesForWeapon(player, weaponContext) {
    const explicitToggles = getApplicableWeaponRuleToggles(player, weaponContext);
    const inventoryItem = (Array.isArray(player && player.inventory) ? player.inventory : []).find(item => item.id === weaponContext.id);
    const implicitToggles = buildImplicitEquipmentWeaponToggles(player, inventoryItem || {
      id: weaponContext.id,
      name: weaponContext.name,
      weapon: true,
      details: weaponContext.details,
    }).filter(toggle => !hasEquivalentRuleToggle(explicitToggles, toggle));
    return uniqueRuleRecords([...explicitToggles, ...implicitToggles]);
  }

  function getWeaponToggleRuntimeState(player, weaponContext, toggle, weaponState = null) {
    if (usesSharedWeaponToggleState(toggle)) return getSharedWeaponToggleState(player, toggle);
    return weaponState || getWeaponCombatState(player, weaponContext.id, weaponContext.properties);
  }

  function hasEquivalentRuleToggle(toggles, target) {
    const targetKey = getRuleToggleEquivalenceKey(target);
    return Boolean(targetKey) && (toggles || []).some(toggle => getRuleToggleEquivalenceKey(toggle) === targetKey);
  }

  function getRuleToggleEquivalenceKey(toggle) {
    const title = normalizeName(toggle && (toggle.label || toggle.title));
    if (title) return title;
    const id = normalizeName(toggle && toggle.id);
    if (id.includes('crushing strike')) return 'crushing strike';
    if (id.includes('shielding impact')) return 'shielding impact';
    return id;
  }

  function isWeaponToggleActive(state, toggle) {
    return getWeaponToggleAliases(toggle).some(id => Boolean(state && state[id]));
  }

  function getWeaponToggleAliases(toggleOrId) {
    const aliases = new Set();
    const rawId = typeof toggleOrId === 'string' ? toggleOrId : cleanDetailValue(toggleOrId && toggleOrId.id);
    if (rawId) aliases.add(rawId);
    const haystack = normalizeName(typeof toggleOrId === 'string' ? toggleOrId : [
      toggleOrId && toggleOrId.id,
      toggleOrId && (toggleOrId.label || toggleOrId.title),
      toggleOrId && (toggleOrId.sourceName || toggleOrId.itemName),
    ].filter(Boolean).join(' '));
    if (haystack.includes('crushing strike')) {
      aliases.add('sigilCrushingStrike');
      aliases.add('sigil-crushing-strike');
      aliases.add('sigil-of-thunderous-might-sigil-crushing-strike');
    }
    if (haystack.includes('shielding impact')) {
      aliases.add('sigilShieldingImpact');
      aliases.add('sigil-shielding-impact');
      aliases.add('sigil-of-thunderous-might-sigil-shielding-impact');
    }
    return Array.from(aliases).filter(Boolean);
  }

  function getWeaponToggleConsumeOn(toggle) {
    const text = normalizeName(toggle && (toggle.consumeOn || toggle.consume || toggle.spendOn));
    if (text.includes('activation') || text.includes('activate') || text.includes('toggle')) return 'activation';
    if (text.includes('attack')) return 'attack-roll';
    if (text.includes('hit')) return 'damage-roll';
    if (text.includes('manual') || text.includes('none') || text.includes('never')) return 'manual';
    return 'damage-roll';
  }

  function usesSharedWeaponToggleState(toggle) {
    const scope = normalizeName(toggle && (toggle.stateScope || toggle.scope));
    if (scope === 'shared') return true;
    return normalizeName(toggle && toggle.appliesTo) === 'equipped weapon' && getWeaponToggleConsumeOn(toggle) === 'activation';
  }

  function getSharedWeaponToggleStateKey(toggle) {
    return cleanDetailValue(toggle && (toggle.stateKey || toggle.id || toggle.label)) || 'weapon-toggle';
  }

  function getSharedWeaponToggleState(player, toggle) {
    const key = getSharedWeaponToggleStateKey(toggle);
    const combatToggles = player && player.combatToggles && typeof player.combatToggles === 'object' ? player.combatToggles : {};
    const sharedToggles = combatToggles.weaponToggles && typeof combatToggles.weaponToggles === 'object' ? combatToggles.weaponToggles : {};
    const saved = sharedToggles[key] && typeof sharedToggles[key] === 'object' ? sharedToggles[key] : {};
    const aliases = getWeaponToggleAliases(toggle);
    const hasExplicitState = aliases.some(alias => Object.prototype.hasOwnProperty.call(saved, alias));
    if (hasExplicitState) return { ...saved };

    const legacy = findLegacyWeaponToggleState(player, toggle);
    return legacy ? { ...legacy, ...saved } : { ...saved };
  }

  function findLegacyWeaponToggleState(player, toggle) {
    const weapons = player && player.combatToggles && player.combatToggles.weapons;
    if (!weapons || typeof weapons !== 'object') return null;
    for (const state of Object.values(weapons)) {
      if (state && typeof state === 'object' && isWeaponToggleActive(state, toggle)) return state;
    }
    return null;
  }

  function isManualWeaponToggleEffect(effect) {
    const mode = normalizeName(effect && (effect.valueMode || effect.mode || effect.valueType));
    return Boolean(effect && (effect.manual || effect.value === 'manual' || mode === 'manual'));
  }

  function getManualWeaponToggleEffect(toggle) {
    return (toggle && toggle.effects || []).find(effect => {
      return effect && ['weapon-attack-bonus', 'weapon-damage-bonus'].includes(effect.kind) && isManualWeaponToggleEffect(effect);
    }) || null;
  }

  function getWeaponToggleValueKey(toggle, effect = null) {
    return cleanDetailValue(effect && effect.valueKey || toggle && toggle.valueKey || `${toggle && toggle.id || 'toggle'}-value`);
  }

  function getWeaponToggleDefaultValue(toggle, effect = null) {
    for (const value of [effect && effect.defaultValue, toggle && toggle.defaultValue, effect && effect.value]) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return 0;
  }

  function resolveWeaponToggleEffectValue(state, toggle, effect) {
    if (!isManualWeaponToggleEffect(effect)) return Number(effect && effect.value) || 0;
    const key = getWeaponToggleValueKey(toggle, effect);
    const values = state && state.toggleValues && typeof state.toggleValues === 'object' ? state.toggleValues : {};
    const nested = Object.prototype.hasOwnProperty.call(values, key) ? values[key] : undefined;
    const raw = nested === null || nested === undefined || nested === '' ? state && state[key] : nested;
    const fallback = getWeaponToggleDefaultValue(toggle, effect);
    const multiplier = Number(effect && effect.multiplier);
    const value = normalizeWeaponToggleManualValue(raw, toggle, effect, fallback);
    return Number.isFinite(multiplier) && multiplier !== 0 ? value * multiplier : value;
  }

  function normalizeWeaponToggleManualValue(value, toggle, effect = null, fallback = 0) {
    let number = value === null || value === undefined || value === '' ? fallback : Number(value);
    if (!Number.isFinite(number)) number = fallback;
    const min = Number((effect && effect.min) ?? (toggle && toggle.min));
    const max = Number((effect && effect.max) ?? (toggle && toggle.max));
    if (Number.isFinite(min)) number = Math.max(min, number);
    if (Number.isFinite(max)) number = Math.min(max, number);
    return number;
  }

  function getWeaponToggleResourceCost(toggle, state = null) {
    if (!toggle) return 1;
    const key = cleanDetailValue(toggle.resourceCostKey);
    if (key) {
      const values = state && state.toggleValues && typeof state.toggleValues === 'object' ? state.toggleValues : {};
      const raw = values[key] === null || values[key] === undefined || values[key] === '' ? state && state[key] : values[key];
      return clampNumber(Number(raw) || Number(toggle.defaultValue) || 1, Number(toggle.min) || 1, Number(toggle.max) || 99);
    }
    const cost = Number(toggle.resourceCost ?? toggle.cost ?? 1);
    return Number.isFinite(cost) ? Math.max(0, cost) : 1;
  }

  function getWeaponToggleResourceId(player, item, toggle) {
    const requestedIds = [
      cleanDetailValue(toggle && toggle.resourceId),
      cleanDetailValue(toggle && toggle.id),
      ...getWeaponToggleAliases(toggle),
    ].filter(Boolean);
    for (const requestedId of requestedIds) {
      const exact = findPlayerResource(player, requestedId);
      if (exact) return exact.id;
    }

    const resources = uniqueRuleRecords(player && player.resources || []);
    const title = normalizeName(toggle && (toggle.label || toggle.title));
    const source = normalizeName([
      toggle && (toggle.sourceName || toggle.itemName || toggle.sourceId),
      item && item.name,
      item && item.details && (item.details.name || item.details.id),
      item && item.id,
    ].filter(Boolean).join(' '));
    const requestedNames = requestedIds.map(normalizeName).filter(Boolean);
    const match = resources.find(resource => {
      const resourceId = normalizeName(resource.id);
      const resourceName = normalizeName(resource.name);
      const resourceSource = normalizeName([resource.itemName, resource.sourceId].filter(Boolean).join(' '));
      const requestedMatch = requestedNames.some(name => resourceId === name || resourceId.endsWith(name) || resourceId.includes(name));
      const titleMatch = title && (resourceName === title || resourceId.endsWith(title) || resourceId.includes(title));
      const sourceMatch = !source || resourceSource && (source.includes(resourceSource) || resourceSource.includes(source)) || source && resourceId.includes(source);
      return requestedMatch || titleMatch && sourceMatch;
    });
    return match ? match.id : (requestedIds[0] || '');
  }

  function getApplicableWeaponRuleToggles(player, weaponContext) {
    const inventory = Array.isArray(player && player.inventory) ? player.inventory : [];
    const weaponItem = inventory.find(item => item.id === weaponContext.id);
    const toggles = [];
    if (weaponContext && weaponContext.details && Array.isArray(weaponContext.details.toggles)) toggles.push(...weaponContext.details.toggles);
    if (weaponItem && weaponItem.details && Array.isArray(weaponItem.details.toggles)) toggles.push(...weaponItem.details.toggles);
    if (!hasUndeadTargetToggle(toggles)) toggles.push(...buildFallbackWeaponToggles(weaponContext));
    for (const item of inventory) {
      if (!item.details || !Array.isArray(item.details.toggles)) continue;
      for (const toggle of item.details.toggles) {
        if (toggle.appliesTo === 'equipped-weapon') toggles.push(toggle);
      }
    }
    toggles.push(...getRuntimeRuleActivationToggles(player, null, weaponContext));
    return uniqueRuleRecords(toggles).filter(toggle => {
      if (!toggle || !toggle.id) return false;
      return weaponToggleAppliesToWeapon(toggle, weaponContext);
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

  function isWeaponProficient(player, base, details, name) {
    const category = getWeaponProficiencyCategory(base, details);
    if (category && hasWeaponCategoryProficiency(player, category)) return true;
    const weaponNames = [name, base && base.baseName, details && details.name, details && details.weapon && details.weapon.baseName];
    return hasSpecificWeaponProficiency(player, weaponNames) || classGrantsSpecificWeapon(player, weaponNames);
  }

  function getWeaponProficiencyCategory(base, details) {
    const type = normalizeName([
      base && base.type,
      details && details.type,
      details && details.weapon && details.weapon.type,
    ].filter(Boolean).join(' '));
    if (type.includes('martial')) return 'martial';
    if (type.includes('simple')) return 'simple';
    return '';
  }

  function hasWeaponCategoryProficiency(player, category) {
    const clean = normalizeName(category);
    if (!clean) return false;
    if (clean === 'simple' && isTruthyFlag(player && player.simpleWeapons)) return true;
    if (clean === 'martial' && isTruthyFlag(player && player.martialWeapons)) return true;

    const proficiencies = getPlayerProficiencyText(player);
    if (proficiencies.includes(`${clean} weapons`) || proficiencies.includes(`${clean} weapon`)) return true;
    if (clean === 'martial' && classGrantsMartialWeapons(player)) return true;
    if (clean === 'simple' && (classGrantsMartialWeapons(player) || classGrantsSimpleWeapons(player))) return true;
    return false;
  }

  function hasSpecificWeaponProficiency(player, names) {
    const proficiencies = getPlayerProficiencyText(player);
    if (!proficiencies) return false;
    return normalizeWeaponProficiencyNames(names).some(name => name && proficiencies.includes(name));
  }

  function normalizeWeaponProficiencyNames(names) {
    const out = [];
    for (const name of names || []) {
      const normalized = normalizeName(name);
      if (!normalized) continue;
      out.push(normalized);
      out.push(normalized.replace(/^\+\d+\s+/, ''));
    }
    return [...new Set(out.filter(Boolean))];
  }

  function getPlayerProficiencyText(player) {
    const values = [];
    collectProficiencyValues(values, player && player.proficiencies);
    collectProficiencyValues(values, player && player.weaponProficiencies);
    collectProficiencyValues(values, player && player.armorProficiencies);
    collectProficiencyValues(values, player && player.toolProficiencies);
    collectProficiencyValues(values, player && player.rulesSource && player.rulesSource.proficiencies);
    for (const detail of [...(player && player.backgroundDetails || []), ...(player && player.featDetails || [])]) {
      collectProficiencyValues(values, detail && detail.weaponProficiencies);
      collectProficiencyValues(values, detail && detail.toolProficiencies);
      collectProficiencyValues(values, detail && detail.text);
    }
    return normalizeName(values.join(' '));
  }

  function collectProficiencyValues(out, value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(item => collectProficiencyValues(out, item));
      return;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach(item => collectProficiencyValues(out, item));
      return;
    }
    out.push(String(value));
  }

  function classGrantsMartialWeapons(player) {
    return getPlayerClassKeys(player).some(classKey => {
      const proficiencies = CLASS_WEAPON_PROFICIENCIES[classKey];
      return proficiencies && proficiencies.martialWeapons;
    });
  }

  function classGrantsSimpleWeapons(player) {
    return getPlayerClassKeys(player).some(classKey => {
      const proficiencies = CLASS_WEAPON_PROFICIENCIES[classKey];
      return proficiencies && (proficiencies.simpleWeapons || proficiencies.martialWeapons);
    });
  }

  function classGrantsSpecificWeapon(player, names) {
    const weaponNames = new Set(normalizeWeaponProficiencyNames(names));
    if (!weaponNames.size) return false;
    return getPlayerClassKeys(player).some(classKey => {
      const proficiencies = CLASS_WEAPON_PROFICIENCIES[classKey];
      return proficiencies && (proficiencies.weapons || []).some(weapon => weaponNames.has(normalizeName(weapon)));
    });
  }

  function getPlayerClassKeys(player) {
    const classText = normalizeName([
      player && player.class,
      player && player.className,
      player && player.classSummary,
      ...(Array.isArray(player && player.classLevels) ? player.classLevels.flatMap(level => [
        level && level.classId,
        level && level.class,
        level && level.className,
      ]) : []),
    ].filter(Boolean).join(' '));
    if (!classText) return [];
    return Object.keys(CLASS_WEAPON_PROFICIENCIES)
      .filter(classKey => new RegExp(`\\b${escapeRegExp(classKey)}\\b`).test(classText));
  }

  function isTruthyFlag(value) {
    if (value === true) return true;
    if (value === false || value === null || value === undefined) return false;
    return /^(true|yes|y|1|proficient)$/i.test(String(value).trim());
  }

  function hasUndeadTargetToggle(toggles) {
    return (toggles || []).some(toggle => normalizeName(`${toggle && toggle.id || ''} ${toggle && toggle.label || ''} ${toggle && toggle.text || ''}`).includes('undead'));
  }

  function buildFallbackWeaponToggles(weaponContext) {
    const haystack = normalizeName(`${weaponContext && weaponContext.name || ''} ${weaponContext && weaponContext.details && weaponContext.details.text || ''}`);
    const corpseSlayer = haystack.includes('corpse slayer') || (haystack.includes('undead') && haystack.includes('extra 1d8'));
    if (!corpseSlayer) return [];
    return [{
      id: 'corpseSlayerUndeadTarget',
      label: 'Undead target',
      timing: 'on-hit',
      appliesTo: 'this-weapon',
      effects: [{ kind: 'extra-damage', dice: '1d8', damageType: 'weapon', label: 'Corpse Slayer vs undead' }],
      text: 'On a hit against an undead creature, add 1d8 weapon damage and give it disadvantage on saves against turn undead effects until your next turn.',
    }];
  }

  function hasOnHitToggleText(toggle) {
    return /\b(on a hit|when you hit|when you damage|whenever you hit)\b/.test(normalizeName(toggle && toggle.text));
  }

  function getWeaponCombatState(player, weaponId, properties = []) {
    const weapons = player.combatToggles && player.combatToggles.weapons;
    const saved = weapons && weapons[weaponId] ? weapons[weaponId] : {};
    const abilityMode = saved.abilityMode === 'dex' || saved.abilityMode === 'str' ? saved.abilityMode : '';
    return {
      ...saved,
      abilityMode,
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

  function getWeaponAbilityMode(player, weaponId, base, properties = []) {
    if (!isFinesseWeapon(base, properties)) return normalizeWeaponAbility(base && base.ability, base && base.style);
    const saved = getWeaponCombatState(player, weaponId, properties).abilityMode;
    if (saved === 'dex' || saved === 'str') return saved;
    return getDefaultFinesseAbility(player);
  }

  function getDefaultFinesseAbility(player) {
    const str = calculateModifier(Number(player && player.abilities && player.abilities.str) || 10);
    const dex = calculateModifier(Number(player && player.abilities && player.abilities.dex) || 10);
    return dex > str ? 'dex' : 'str';
  }

  function isFinesseWeapon(base, properties = []) {
    if (normalizeName(base && base.ability) === 'finesse') return true;
    return (properties || []).some(property => normalizeName(property).includes('finesse'));
  }

  function normalizeWeaponAbility(ability, style) {
    const clean = normalizeName(ability);
    if (Object.prototype.hasOwnProperty.call(ABILITY_NAMES, clean)) return clean;
    return style === 'ranged' ? 'dex' : 'str';
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
    const playerDetail = findPlayerItemDetails(name, player);
    const catalogDetail = findCatalogItemDetails(name, player);
    if (catalogDetail || playerDetail) return normalizeItemDetails(mergeItemDetailSources(catalogDetail, playerDetail));

    const normalized = normalizeName(name);
    const custom = CUSTOM_ITEM_DETAILS.find(detail => normalized.includes(detail.key));
    if (custom) return normalizeItemDetails(custom);

    const fallbackWeapon = buildFallbackWeaponDetails(name);
    if (fallbackWeapon) return normalizeItemDetails(fallbackWeapon);

    const armor = buildFallbackArmorDetails(name);
    return armor ? normalizeItemDetails(armor) : null;
  }

  function findPlayerItemDetails(name, player) {
    const detailsByName = player && player.itemDetails && typeof player.itemDetails === 'object' ? player.itemDetails : {};
    const direct = detailsByName[name] || detailsByName[slugify(name)] || detailsByName[normalizeName(name)];
    if (direct) return direct;
    const lookupNames = getItemLookupNames(name);
    return Object.values(detailsByName).find(detail => {
      const detailNames = [detail && detail.name, detail && detail.id].map(normalizeName).filter(Boolean);
      return detailNames.some(detailName => lookupNames.includes(detailName));
    }) || null;
  }

  function findCatalogItemDetails(name, player) {
    const catalog = Array.isArray(player && player.itemCatalog) ? player.itemCatalog : [];
    const lookupNames = getItemLookupNames(name);
    return catalog.find(item => lookupNames.includes(normalizeName(item && item.name)) || lookupNames.includes(normalizeName(item && item.id))) || null;
  }

  function mergeItemDetailSources(catalogDetail, playerDetail) {
    if (!catalogDetail && !playerDetail) return null;
    const out = {};
    const fields = new Set([...Object.keys(playerDetail || {}), ...Object.keys(catalogDetail || {})]);
    fields.forEach(field => {
      if (['actions', 'effects', 'resources', 'toggles', 'abilities'].includes(field)) {
        out[field] = mergeDetailRecordArrays(catalogDetail && catalogDetail[field], playerDetail && playerDetail[field]);
        return;
      }
      const catalogValue = catalogDetail && catalogDetail[field];
      const playerValue = playerDetail && playerDetail[field];
      out[field] = isEmptyDetailValue(catalogValue) ? playerValue : catalogValue;
    });
    return out;
  }

  function mergeDetailRecordArrays(primary, secondary) {
    const rows = [
      ...(Array.isArray(primary) ? primary : []),
      ...(Array.isArray(secondary) ? secondary : []),
    ];
    const seen = new Set();
    return rows.filter(row => {
      const key = normalizeName(row && typeof row === 'object'
        ? row.id || `${row.title || row.name || ''} ${row.detail || row.text || ''}`
        : row);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function isEmptyDetailValue(value) {
    return value === null || value === undefined || value === '' || Array.isArray(value) && !value.length;
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

  function buildFallbackWeaponDetails(name) {
    const normalized = normalizeName(name);
    if (!normalized.includes('flamberge bastard sword')) return null;

    const id = slugify(name);
    const corpseSlayer = normalized.includes('corpse slayer');
    const magicBonus = parseMagicBonus(name) || (corpseSlayer ? 1 : 0);
    const properties = ['heavy', 'versatile (2d6)', 'special'];
    const text = [
      magicBonus ? `You gain a ${formatBonus(magicBonus)} bonus to attack and damage rolls made with this magic weapon.` : '',
      corpseSlayer ? 'When you hit an undead creature with an attack using this weapon, the attack deals an extra 1d8 damage of the weapon type, and the creature has disadvantage on saving throws against effects that turn undead until the start of your next turn.' : '',
      'Special. While wielding this weapon, you can use your reaction to add your proficiency bonus to your AC against one melee attack that would hit you.',
    ].filter(Boolean).join(' ');

    return {
      id,
      name,
      type: 'weapon, martial weapon, melee weapon',
      rarity: corpseSlayer ? 'rare' : (magicBonus ? 'uncommon' : ''),
      damage: '2d4 slashing',
      properties: properties.join(', '),
      text,
      weapon: {
        baseName: 'Flamberge Bastard Sword',
        type: 'martial',
        style: 'melee',
        ability: 'str',
        damage: '2d4',
        damageType: 'slashing',
        properties,
        versatileDamage: '2d6',
        magicBonus,
      },
      actions: [{
        id: `${id}-defensive-parry`,
        group: 'Reaction',
        type: 'Weapon',
        title: corpseSlayer ? 'Corpse Slayer Defensive Parry' : name,
        detail: 'While wielding this weapon, add proficiency bonus to AC against one melee attack that would hit you.',
        tags: ['Reaction', 'Melee attack', 'Wielding weapon'],
      }],
      effects: magicBonus ? [{
        id: `${id}-magic-weapon-bonus`,
        kind: 'weapon-bonus',
        name: 'Magic weapon bonus',
        value: magicBonus,
        text: `${formatBonus(magicBonus)} to attack and damage rolls with this weapon.`,
      }] : [],
      toggles: corpseSlayer ? [{
        id: `${id}-undead-target`,
        label: 'Undead target',
        timing: 'on-hit',
        appliesTo: 'this-weapon',
        effects: [{ kind: 'extra-damage', dice: '1d8', damageType: 'weapon', label: 'Corpse Slayer vs undead' }],
        text: 'On a hit against an undead creature, add 1d8 weapon damage and give it disadvantage on saves against turn undead effects until your next turn.',
      }] : [],
    };
  }

  function normalizeItemDetails(details) {
    if (!details) return null;
    return {
      id: cleanDetailValue(details.id),
      name: cleanDetailValue(details.name),
      source: cleanDetailValue(details.source),
      page: cleanDetailValue(details.page),
      rarity: cleanDetailValue(details.rarity),
      type: cleanDetailValue(details.type),
      attunement: cleanDetailValue(details.attunement),
      damage: cleanDetailValue(details.damage),
      properties: cleanDetailValue(details.properties),
      mastery: cleanDetailValue(details.mastery),
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
    const handledToggleNames = new Set((item.details && Array.isArray(item.details.toggles) ? item.details.toggles : [])
      .filter(usesSharedWeaponToggleState)
      .flatMap(toggle => [toggle.id, toggle.resourceId, toggle.label, toggle.title])
      .map(normalizeName)
      .filter(Boolean));
    if (item.details && item.details.abilities.length) abilities.push(...item.details.abilities);
    if (item.details && item.details.actions.length) abilities.push(...item.details.actions.map(action => `${action.title || action.name || item.name}: ${action.detail || action.text || ''}`));
    if (item.details && item.details.effects.length) abilities.push(...item.details.effects.map(effect => `${effect.name || effect.label || 'Effect'}: ${effect.text || formatEffectSummary(effect)}`));
    if (item.details && item.details.resources.length) abilities.push(...item.details.resources
      .filter(resource => !handledToggleNames.has(normalizeName(resource.name || resource.id)))
      .map(resource => `${resource.name}: ${formatResourceMax(resource, null)}; resets ${formatReset(resource.reset)}.`));
    if (item.details && item.details.toggles.length) abilities.push(...item.details.toggles
      .filter(toggle => !usesSharedWeaponToggleState(toggle))
      .map(formatToggleAbility)
      .filter(Boolean));
    if (!item.weapon && item.details && item.details.properties && hasActiveRulesText(item)) {
      const properties = splitProperties(item.details.properties)
        .filter(property => !matchesHandledToggleAbility(property, handledToggleNames));
      const extracted = extractItemPropertyAbilities(item.details.text, properties)
        .filter(text => !matchesHandledToggleAbility(text, handledToggleNames));
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

  function matchesHandledToggleAbility(text, handledToggleNames) {
    const clean = normalizeName(text);
    if (!clean || !handledToggleNames || !handledToggleNames.size) return false;
    return Array.from(handledToggleNames).some(name => name && (clean === name || clean.startsWith(name) || clean.includes(name)));
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

  function resolveWeaponAbility(base, player, weaponId, properties = []) {
    return getWeaponAbilityMode(player, weaponId, base, properties);
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
    const hero = root.querySelector('.player-hero');
    const actions = hero && hero.querySelector('.hero-actions');
    const equipped = getEquippedItems(player);
    const weaponItems = equipped.filter(item => item.weapon);

    target.innerHTML = `
      <div class="hero-loadout-grid">
        <section class="hero-loadout-panel hero-loadout-panel-equipment" aria-label="Equipped gear">
          <div class="hero-loadout-title">Equipped</div>
          <ul class="equipped-items">
            ${equipped.length ? equipped.map(item => renderEquippedItem(item)).join('') : '<li class="empty-note">None selected.</li>'}
          </ul>
        </section>
        <section class="hero-loadout-panel hero-loadout-panel-attacks" aria-label="Quick attacks" ${weaponItems.length ? '' : 'hidden'}>
          <div class="hero-loadout-title">Quick Attacks</div>
          <div class="quick-rolls">${weaponItems.map(item => renderQuickRoll(item.weapon)).join('')}</div>
        </section>
        <section class="hero-loadout-panel hero-loadout-panel-defenses" data-defense-panel aria-label="Resistances and conditions">
          <div class="hero-loadout-title">Resistances / Conditions</div>
          <div class="defense-summary" data-defense-summary></div>
        </section>
        <section class="hero-loadout-panel hero-loadout-panel-actions" data-hero-action-panel aria-label="Sheet actions">
          <div class="hero-loadout-title">Actions</div>
        </section>
      </div>
    `;
    const actionPanel = target.querySelector('[data-hero-action-panel]');
    if (actions && actionPanel) actionPanel.appendChild(actions);
  }

  function renderDefenseSummary(root, player) {
    const hero = root.querySelector('.player-hero');
    if (!hero) return;
    const groups = getDefenseGroups(player);
    let panel = hero.querySelector('[data-defense-panel]');
    let target = hero.querySelector('[data-defense-summary]');
    if (!target) {
      const equipped = hero.querySelector('[data-equipped-summary]');
      panel = document.createElement('section');
      panel.className = 'hero-loadout-panel hero-loadout-panel-defenses';
      panel.dataset.defensePanel = '';
      panel.setAttribute('aria-label', 'Resistances and conditions');
      target = document.createElement('div');
      target.className = 'defense-summary';
      target.dataset.defenseSummary = '';
      panel.innerHTML = '<div class="hero-loadout-title">Resistances / Conditions</div>';
      panel.appendChild(target);
      const actions = hero.querySelector('.hero-actions');
      const grid = equipped && equipped.querySelector('.hero-loadout-grid');
      const actionPanel = equipped && equipped.querySelector('[data-hero-action-panel]');
      if (grid && actionPanel) grid.insertBefore(panel, actionPanel);
      else if (grid) grid.appendChild(panel);
      else if (equipped && actions && actions.parentElement === equipped) equipped.insertBefore(panel, actions);
      else if (equipped) equipped.appendChild(panel);
      else if (actions) hero.insertBefore(panel, actions);
      else hero.appendChild(panel);
    } else {
      panel = target.closest('[data-defense-panel]') || panel;
    }
    if (panel) panel.hidden = false;
    if (!groups.length) {
      target.innerHTML = '<span class="defense-empty">None recorded.</span>';
      return;
    }
    target.innerHTML = groups.flatMap(group => (
      group.entries.map(entry => `<span><strong>${escapeHtml(group.shortLabel)}</strong> ${escapeHtml(formatDefenseEntry(entry))}</span>`)
    )).join('');
  }

  function getDefenseGroups(player) {
    const defenses = normalizePlayerDefenses(player || {});
    return [
      { key: 'resistances', label: 'Resistances', shortLabel: 'Resist', entries: defenses.resistances },
      { key: 'vulnerabilities', label: 'Vulnerabilities', shortLabel: 'Vuln', entries: defenses.vulnerabilities },
      { key: 'immunities', label: 'Immunities', shortLabel: 'Immune', entries: defenses.immunities },
      { key: 'conditionImmunities', label: 'Condition Immunities', shortLabel: 'Cond', entries: defenses.conditionImmunities },
    ].filter(group => group.entries && group.entries.length);
  }

  function formatDefenseEntry(value) {
    const text = cleanDetailValue(value);
    if (!text) return '';
    if (text === text.toUpperCase() && text.length <= 5) return text;
    return text.split(/\s+/).map(word => (
      ['and', 'or', 'to', 'of'].includes(word.toLowerCase()) ? word.toLowerCase() : titleCase(word)
    )).join(' ');
  }

  function renderEquippedItem(item) {
    if (!item.weapon) return `<li class="equipped-item"><span>${escapeHtml(item.name)}</span></li>`;
    return `<li class="equipped-item"><span>${escapeHtml(item.name)}</span><strong>${formatBonus(item.weapon.attackBonus)}</strong></li>`;
  }

  function renderQuickRoll(weapon) {
    return `<span class="quick-roll-group">
      <strong class="quick-roll-name">${escapeHtml(weapon.name)}</strong>
      <button class="roll-button" type="button" data-roll-type="attack" data-weapon-id="${escapeAttr(weapon.id)}">Hit ${formatBonus(weapon.attackBonus)}</button>
      <button class="roll-button" type="button" data-roll-type="damage" data-weapon-id="${escapeAttr(weapon.id)}">Dmg ${escapeHtml(weapon.damageFormula)}</button>
    </span>`;
  }

  function renderTemporaryEffectsPanel(root, player) {
    root.querySelectorAll('[data-temporary-effects-panel]').forEach(target => {
      if (target.closest('[data-tab-panel="combat"]')) {
        target.innerHTML = '';
        return;
      }
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
    const combatPanel = target.closest('[data-tab-panel="combat"]');
    if (combatPanel) {
      const section = target.closest('section');
      if (section) section.classList.add('combat-hidden-weapon-section');
      target.innerHTML = '';
      return;
    }
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

  function renderCombatFeatureActions(root, player) {
    const target = root.querySelector('[data-combat-features]');
    if (!target) return;
    const tabs = buildCombatSourceTabs(player, root);
    const quickCards = buildCombatReferenceActionCards(player);
    const allCards = [...tabs.flatMap(tab => tab.cards), ...quickCards];
    if (!allCards.length) {
      target.innerHTML = '';
      return;
    }
    const activeTab = getActiveCombatSourceTab(root, tabs);
    target.innerHTML = `<section class="combat-feature-section combat-options-panel">
      <div class="combat-section-heading">
        <h2>Combat Options</h2>
        ${renderCombatOptionSummary(allCards)}
      </div>
      <div class="combat-tabs-layout" data-combat-tabs>
        <nav class="combat-source-tabs" role="tablist" aria-label="Combat option sources">
          ${tabs.map(tab => renderCombatSourceTabButton(tab, tab.id === activeTab)).join('')}
        </nav>
        <div class="combat-source-panels">
          ${tabs.map(tab => renderCombatSourcePane(tab, tab.id === activeTab)).join('')}
        </div>
      </div>
      ${renderCombatReferenceActions(quickCards)}
      ${renderCombatActionDialog()}
    </section>`;
  }

  function buildCombatSourceTabs(player, root) {
    const ruleActivationCards = buildRuleActivationCards(player, root);
    const ruleCards = filterDuplicateRuleActivationActions(buildCombatRuleActionCards(player, root), ruleActivationCards);
    const classCards = ruleCards.filter(card => ['class', 'subclass', 'feat', 'background'].includes(card.sourceType));
    const raceCards = ruleCards.filter(card => card.sourceType === 'race');
    const classActivationCards = ruleActivationCards.filter(card => ['class', 'subclass', 'feat', 'background'].includes(card.sourceType));
    const raceActivationCards = ruleActivationCards.filter(card => card.sourceType === 'race');
    const equipmentActivationCards = buildEquipmentActivationCards(player);
    const equipmentCards = uniqueActionCards([
      ...equipmentActivationCards,
      ...filterDuplicateEquipmentActivationActions(buildCombatItemActionCards(player, root), equipmentActivationCards),
    ]);
    const effectCards = uniqueActionCards([
      ...buildTemporaryEffectCards(player),
      ...buildCombatToggleActivationCards(player),
      ...buildActiveConditionCards(player),
    ]);

    return [
      { id: 'attacks', label: 'Attacks', listLabel: 'Weapon Attacks', emptyText: 'No equipped weapon attacks found.', cards: buildWeaponActionCards(player) },
      { id: 'spells', label: 'Spells', listLabel: 'Spell Actions', emptyText: 'No combat spells found on this sheet.', cards: buildCombatSpellCards(player, root) },
      { id: 'class', label: 'Class', listLabel: 'Class, Feat, and Background Options', emptyText: 'No class combat options found.', cards: [...classActivationCards, ...classCards] },
      { id: 'race', label: 'Race', listLabel: 'Racial Options', emptyText: 'No racial combat options found.', cards: [...raceActivationCards, ...raceCards] },
      { id: 'equipment', label: 'Equipment', listLabel: 'Equipment Options', emptyText: 'No equipped item activations found.', cards: equipmentCards },
      { id: 'effects', label: 'Effects', listLabel: 'Conditions and Temporary Effects', emptyText: 'No temporary effects or conditions recorded.', cards: effectCards, extraHtml: renderTemporaryCustomEffectControls(player) },
    ].map(tab => ({
      ...tab,
      cards: uniqueActionCards(tab.cards.map(card => enhanceActionCard(player, card)))
        .filter(card => normalizeActionGroup(card.group) !== 'Out of Combat'),
    }));
  }

  function buildCombatRuleActionCards(player, root) {
    const cards = buildRuleActionCards(player, root);
    if (!hasCanonicalClassActions(player)) cards.push(...buildClassActionCards(player));
    return uniqueActionCards(cards).filter(card => normalizeActionGroup(card.group) !== 'Out of Combat');
  }

  function getActiveCombatSourceTab(root, tabs) {
    const ids = new Set(tabs.map(tab => tab.id));
    if (ids.has(root._combatSourceTab)) return root._combatSourceTab;
    const firstPopulated = tabs.find(tab => tab.cards.length);
    return firstPopulated ? firstPopulated.id : (tabs[0] && tabs[0].id || 'attacks');
  }

  function renderCombatSourceTabButton(tab, active) {
    return `<button class="combat-source-tab ${active ? 'active' : ''}" type="button" role="tab" data-combat-nav="${escapeAttr(tab.id)}" aria-selected="${active ? 'true' : 'false'}" aria-controls="combat-pane-${escapeAttr(tab.id)}">
      <span>${escapeHtml(tab.label)}</span>
      <strong>${escapeHtml(String(tab.cards.length))}</strong>
    </button>`;
  }

  function renderCombatSourcePane(tab, active) {
    const activationCards = tab.cards.filter(isCombatActivationCard);
    const standardCards = tab.cards.filter(card => !isCombatActivationCard(card));
    const showSplit = activationCards.length && standardCards.length;
    return `<section id="combat-pane-${escapeAttr(tab.id)}" class="combat-source-pane ${active ? 'active' : ''}" data-combat-pane="${escapeAttr(tab.id)}" role="tabpanel" ${active ? '' : 'hidden'}>
      ${activationCards.length ? renderCombatActionList(showSplit ? 'Activations' : tab.listLabel, activationCards) : ''}
      ${standardCards.length ? renderCombatActionList(showSplit ? tab.listLabel : tab.listLabel, standardCards) : ''}
      ${tab.extraHtml || ''}
      ${tab.cards.length ? '' : `<p class="empty-note">${escapeHtml(tab.emptyText)}</p>`}
    </section>`;
  }

  function renderCombatActionList(title, cards) {
    return `<section class="combat-list-section">
      <div class="combat-list-heading">
        <h3>${escapeHtml(title)}</h3>
        <span>${escapeHtml(String(cards.length))}</span>
      </div>
      <ul class="combat-action-list">
        ${cards.map(renderCombatActionRow).join('')}
      </ul>
    </section>`;
  }

  function renderCombatActionRow(card) {
    const categories = getActionCategories(card);
    const search = [
      card.group,
      card.type,
      card.title,
      card.meta,
      card.detail,
      ...(card.tags || []),
    ].filter(Boolean).join(' ');
    const hasDetails = hasActionDetailContent(card);
    return `<li class="combat-action-row" data-action-card data-action-group="${escapeAttr(card.group || '')}" data-action-kind="${escapeAttr(categories.join(' '))}" data-action-search="${escapeAttr(search)}">
      <div class="combat-action-main">
        <span class="combat-action-kicker">${escapeHtml(formatCombatActionKicker(card))}</span>
        <strong>${escapeHtml(card.title || 'Action')}</strong>
        ${card.meta ? `<small>${escapeHtml(card.meta)}</small>` : ''}
      </div>
      ${card.tags && card.tags.length ? `<div class="action-tags combat-action-row-tags">${card.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      ${card.controls ? `<div class="combat-action-row-controls">${card.controls}</div>` : ''}
      ${hasDetails ? `<button class="text-button compact-details-button" type="button" data-open-action-details>Details</button>` : ''}
      ${hasDetails ? `<template data-action-detail-template>${renderCombatActionDetailContent(card)}</template>` : ''}
    </li>`;
  }

  function formatCombatActionKicker(card) {
    if (card && card.isActivation) return card.group ? `Activation / ${card.group}` : 'Activation';
    return card && (card.group || card.type || card.sourceType) || 'Option';
  }

  function isCombatActivationCard(card) {
    if (!card) return false;
    if (card.isActivation) return true;
    const sourceType = normalizeName(card.sourceType);
    if (sourceType === 'weapon' || sourceType === 'spell') return false;
    const group = normalizeActionGroup(card.group);
    const text = normalizeName([
      card.type,
      card.title,
      card.meta,
      card.detail,
      card.fullDetail,
      ...(card.tags || []),
    ].filter(Boolean).join(' '));
    if (card.resourceId) return true;
    if (group === 'Action' || group === 'Bonus Action' || group === 'Reaction') {
      return /\b(activate|use|spend|expend|cast|enter|begin|start|as an action|as a bonus action|as a reaction)\b/.test(text);
    }
    if (group === 'Free / Utility') {
      return /\b(activation|activate|active|toggle|turn on|spend|expend|until the end|until your next|for 1 minute|for up to|while active|concentration)\b/.test(text);
    }
    return false;
  }

  function renderCombatReferenceActions(cards) {
    return `<section class="combat-reference-actions">
      <div class="combat-list-heading">
        <h3>Reference Actions</h3>
        <span>${escapeHtml(String(cards.length))}</span>
      </div>
      ${cards.length ? `<ul class="combat-action-list combat-reference-list">${cards.map(renderCombatActionRow).join('')}</ul>` : '<p class="empty-note">No reference actions found.</p>'}
    </section>`;
  }

  function renderCombatCompactSection(title, cards, emptyText, options = {}) {
    const open = options.open === false ? '' : ' open';
    return `<details class="combat-compact-section combat-section-${escapeAttr(slugify(title))}"${open}>
      <summary class="combat-compact-head">
        <h3>${escapeHtml(title)}</h3>
        <span class="combat-section-count">${escapeHtml(String(cards.length))}</span>
      </summary>
      <div class="combat-compact-list">
        ${cards.length ? cards.map(renderCompactActionCard).join('') : `<p class="empty-note">${escapeHtml(emptyText || 'No options found.')}</p>`}
      </div>
    </details>`;
  }

  function renderCombatActionDialog() {
    return `<dialog class="sheet-search-dialog combat-action-dialog" data-combat-action-dialog aria-label="Combat option details">
      <div class="sheet-search-frame" data-combat-action-dialog-content>
        <div class="sheet-search-head">
          <h2>Combat Option</h2>
          <button class="text-button" type="button" data-close-dialog>Close</button>
        </div>
        <p class="empty-note">Choose an option to view its details.</p>
      </div>
    </dialog>`;
  }

  function buildCombatReferenceActionCards(player) {
    const keep = new Set(['Dash', 'Disengage', 'Dodge', 'Help', 'Hide', 'Ready', 'Grapple / Shove', 'Opportunity Attack']);
    return buildCoreActionCards(player)
      .filter(card => keep.has(card.title))
      .filter(card => normalizeActionGroup(card.group) !== 'Out of Combat');
  }

  function buildCombatSpellCards(player, root) {
    return uniqueActionCards([
      ...buildProjectedSpellActionCards(player, root),
      ...buildSpellActionCards(player, root),
      ...buildSpellScrollActionCards(player, root),
    ])
      .filter(card => normalizeActionGroup(card.group) !== 'Out of Combat')
      .sort((a, b) => actionGroupSort(a.group) - actionGroupSort(b.group) || String(a.title || '').localeCompare(String(b.title || '')));
  }

  function renderCombatOptionSummary(cards) {
    const groups = new Map();
    (cards || []).forEach(card => {
      const key = card.group || 'Other';
      groups.set(key, (groups.get(key) || 0) + 1);
    });
    const limited = (cards || []).filter(card => card.resourceId).length;
    return `<div class="combat-option-summary">
      ${Array.from(groups.entries()).map(([group, count]) => `<span><strong>${escapeHtml(String(count))}</strong>${escapeHtml(group)}</span>`).join('')}
      ${limited ? `<span><strong>${escapeHtml(String(limited))}</strong>Limited uses</span>` : ''}
    </div>`;
  }

  function buildCombatFeatureCards(player, root = null) {
    const featureSources = new Set(['class', 'subclass', 'feat', 'race', 'background']);
    const featureCards = buildRuleActionCards(player, root)
      .filter(card => featureSources.has(card.sourceType))
      .filter(card => normalizeActionGroup(card.group) !== 'Out of Combat');
    const itemCards = buildCombatItemActionCards(player, root);
    return [...featureCards, ...itemCards]
      .sort((a, b) => actionGroupSort(a.group) - actionGroupSort(b.group) || String(a.title || '').localeCompare(String(b.title || '')));
  }

  function buildRuleActivationCards(player, root = null) {
    return getRuntimeRuleActivations(player, root)
      .map(activation => buildRuleActivationCard(player, activation))
      .filter(Boolean);
  }

  function buildRuleActivationCard(player, activation) {
    const toggle = isWeaponRuleActivation(activation) || normalizeName(activation.consumeOn) === 'manual'
      ? ruleActivationToWeaponToggle(activation)
      : null;
    const state = toggle ? getSharedWeaponToggleState(player, toggle) : null;
    const resourceId = activation.resourceId;
    const resourceState = resourceId ? getResourceUseState(player, resourceId) : null;
    const resourceCost = toggle ? getWeaponToggleResourceCost(toggle, state) : getRuleActivationResourceCost(activation);
    const active = toggle ? isWeaponToggleActive(state, toggle) : false;
    const available = !resourceState || resourceState.max === null || resourceState.available >= resourceCost || active;
    const group = normalizeActivationTiming(activation.timing);
    return {
      id: `rule-activation-${activation.id}`,
      group,
      sourceType: activation.sourceType || 'rule',
      sourceId: activation.sourceId,
      type: 'Activation',
      title: activation.label,
      meta: [activation.sourceName, formatRuleActivationTarget(activation)].filter(Boolean).join(' / '),
      detail: activation.text,
      fullDetail: activation.text,
      resourceId,
      tags: ['Activation', active ? 'Active' : '', activation.sourceName, resourceCost > 1 ? `Costs ${resourceCost}` : ''].filter(Boolean),
      controls: toggle
        ? renderWeaponToggleActivationControl(getSharedWeaponToggleStateKey(toggle), toggle.id, active, available, resourceState, renderWeaponManualValueInput(getSharedWeaponToggleStateKey(toggle), toggle, state || {}, available), resourceCost)
        : renderRuleActivationUseControl(activation, resourceState, resourceCost, available),
      isActivation: true,
    };
  }

  function filterDuplicateRuleActivationActions(cards, activationCards) {
    const activationSources = new Set((activationCards || []).map(card => card && card.sourceId).filter(Boolean));
    if (!activationSources.size) return cards || [];
    return (cards || []).filter(card => !activationSources.has(card && card.sourceId));
  }

  function formatRuleActivationTarget(activation) {
    const appliesTo = normalizeName(activation && activation.appliesTo);
    if (appliesTo === 'melee weapon attack') return 'Melee attacks';
    if (appliesTo === 'ranged weapon attack') return 'Ranged attacks';
    if (appliesTo === 'weapon attack' || appliesTo === 'attack roll') return 'Weapon attacks';
    if (appliesTo === 'bonus action attack') return 'Bonus attack';
    if (appliesTo === 'self') return 'Self';
    return cleanDetailValue(activation && activation.appliesTo);
  }

  function getRuleActivationResourceCost(activation) {
    const cost = Number(activation && activation.resourceCost);
    return Number.isFinite(cost) ? Math.max(0, cost) : (activation && activation.resourceId ? 1 : 0);
  }

  function renderRuleActivationUseControl(activation, resourceState, resourceCost, available) {
    const disabled = resourceState && resourceState.max !== null && !available;
    const status = resourceState && resourceState.max !== null
      ? `<span class="use-status">${escapeHtml(`${resourceState.available} / ${resourceState.max} left${resourceCost > 1 ? `; costs ${resourceCost}` : ''}`)}</span>`
      : '';
    return `<div class="action-controls">
      <button class="roll-button" type="button" data-rule-activation-use="${escapeAttr(activation.id)}" ${disabled ? 'disabled' : ''}>Activate</button>
      ${status}
    </div>`;
  }

  function buildCombatItemActionCards(player, root = null) {
    return buildItemActionCards(player, root)
      .filter(card => normalizeActionGroup(card.group) !== 'Out of Combat')
      .filter(card => (card.tags || []).some(tag => normalizeName(tag) === 'equipped'));
  }

  function buildEquipmentActivationCards(player) {
    const cards = [];
    for (const item of getEquippedItems(player)) {
      if (item.weapon) {
        const context = { id: item.id, name: item.name, details: item.details, properties: item.weapon.properties, style: item.weapon.style, damageType: item.weapon.damageType };
        const toggles = getWeaponToggleRulesForWeapon(player, context)
          .filter(toggle => !['class', 'subclass', 'feat', 'race', 'background'].includes(normalizeName(toggle && toggle.sourceType)));
        toggles.forEach(toggle => cards.push(buildWeaponToggleActivationCard(player, item, toggle)));
      }

      const generalToggles = item.details && Array.isArray(item.details.toggles)
        ? item.details.toggles.filter(toggle => !['this-weapon', 'equipped-weapon'].includes(toggle && toggle.appliesTo))
        : [];
      generalToggles.forEach(toggle => cards.push(buildGeneralToggleActivationCard(player, item, toggle)));
    }
    return uniqueActionCards(cards);
  }

  function filterDuplicateEquipmentActivationActions(cards, activationCards) {
    const activationKeys = new Set((activationCards || []).map(getEquipmentActivationDedupeKey).filter(Boolean));
    if (!activationKeys.size) return cards || [];
    return (cards || []).filter(card => !activationKeys.has(getEquipmentActivationDedupeKey(card)));
  }

  function getEquipmentActivationDedupeKey(card) {
    if (!card) return '';
    const title = normalizeName(card.title);
    const source = normalizeName(getPrimaryActionSource(card));
    return title && source ? `${source}:${title}` : '';
  }

  function getPrimaryActionSource(card) {
    const meta = cleanDetailValue(card && card.meta);
    if (meta) return meta.split('/')[0].trim();
    const tags = Array.isArray(card && card.tags) ? card.tags : [];
    return tags.find(tag => !['activation', 'active', 'inactive', 'equipped', 'inventory', 'attunement'].includes(normalizeName(tag))) || '';
  }

  function buildImplicitEquipmentWeaponToggles(player, item) {
    if (!item || !item.weapon && !item.id) return [];
    const out = [];
    if (hasEquippedNamed(player, 'sigil of thunderous might')) {
      out.push({
        id: 'sigilCrushingStrike',
        label: 'Crushing Strike',
        sourceName: 'Sigil of Thunderous Might',
        timing: 'Free / Utility',
        appliesTo: 'equipped-weapon',
        resourceId: 'sigil-crushing-strike',
        effects: [{ kind: 'extra-damage', dice: '2d6', damageType: 'thunder', label: 'Crushing Strike' }],
        text: 'Activate for this weapon attack. On hit, add 2d6 thunder damage.',
      });
      out.push({
        id: 'sigilShieldingImpact',
        label: 'Shielding Impact',
        sourceName: 'Sigil of Thunderous Might',
        timing: 'Free / Utility',
        appliesTo: 'equipped-weapon',
        resourceId: 'sigil-shielding-impact',
        effects: [{ kind: 'on-hit', label: 'Shielding Impact', text: 'Temp HP equals half damage dealt.' }],
        text: 'Activate for this weapon attack. On hit, gain temporary hit points equal to half the damage dealt.',
      });
    }
    return out;
  }

  function buildWeaponToggleActivationCard(player, item, toggle) {
    const shared = usesSharedWeaponToggleState(toggle);
    const sourceItem = findToggleSourceItem(player, toggle);
    const sourceName = cleanDetailValue(toggle.sourceName || (sourceItem && sourceItem.name) || item.name);
    const state = shared ? getSharedWeaponToggleState(player, toggle) : getWeaponCombatState(player, item.id, item.weapon && item.weapon.properties || []);
    const resourceId = getWeaponToggleResourceId(player, sourceItem || item, toggle);
    const resourceState = resourceId ? getResourceUseState(player, resourceId) : null;
    const consumeOn = getWeaponToggleConsumeOn(toggle);
    const active = isWeaponToggleActive(state, toggle);
    const resourceCost = getWeaponToggleResourceCost(toggle, state);
    const resourceAvailable = !resourceState || resourceState.max === null || resourceState.available >= resourceCost || active && consumeOn === 'activation';
    const checked = active && resourceAvailable;
    const sourceEquipped = !sourceItem || isItemEquipped(player, sourceItem);
    const enabled = (shared ? Boolean(getEquippedItems(player).some(candidate => candidate.weapon)) : isItemEquipped(player, item)) && sourceEquipped && (resourceAvailable || active);
    const detail = cleanRulesText(toggle.text || formatToggleEffects(toggle));
    const controlId = shared ? getSharedWeaponToggleStateKey(toggle) : item.id;
    const targetName = shared ? 'All equipped weapons' : item.name;
    return {
      id: shared ? `activation-${getSharedWeaponToggleStateKey(toggle)}` : `activation-${item.id}-${toggle.id}`,
      group: normalizeActivationTiming(toggle.timing),
      sourceType: 'item',
      type: 'Activation',
      title: toggle.label || toggle.title || toggle.id,
      meta: [sourceName, targetName].filter(Boolean).join(' / '),
      detail,
      fullDetail: detail,
      resourceId,
      tags: ['Activation', checked ? 'Active' : 'Inactive', sourceName].filter(Boolean),
      controls: renderWeaponToggleActivationControl(controlId, toggle.id, checked, enabled, resourceState, renderWeaponManualValueInput(controlId, toggle, state, enabled), resourceCost),
      isActivation: true,
    };
  }

  function buildGeneralToggleActivationCard(player, item, toggle) {
    const checked = Boolean(player.combatToggles && player.combatToggles[toggle.id]);
    const available = toggle.available !== false;
    const detail = cleanRulesText(toggle.text || formatToggleEffects(toggle));
    return {
      id: `activation-${item.id}-${toggle.id}`,
      group: normalizeActivationTiming(toggle.timing),
      sourceType: 'item',
      type: 'Activation',
      title: toggle.label || toggle.title || toggle.id,
      meta: item.name,
      detail,
      fullDetail: detail,
      tags: ['Activation', checked ? 'Active' : 'Inactive', item.name].filter(Boolean),
      controls: renderCombatToggleControl(toggle.id, checked, available),
      isActivation: true,
    };
  }

  function buildTemporaryEffectCards(player) {
    const state = normalizeTemporaryEffects(player.temporaryEffects);
    return TEMPORARY_EFFECT_DEFINITIONS.map(definition => {
      const checked = Boolean(state.effects[definition.id]);
      const detail = [definition.detail, definition.duration ? `Duration: ${definition.duration}.` : ''].filter(Boolean).join(' ');
      return {
        id: `temporary-effect-${definition.id}`,
        group: 'Free / Utility',
        sourceType: 'effect',
        type: 'Condition / Effect',
        title: definition.label,
        meta: definition.duration || 'Temporary effect',
        detail,
        fullDetail: detail,
        tags: ['Activation', checked ? 'Active' : 'Inactive', definition.duration].filter(Boolean),
        controls: renderTemporaryEffectControl(definition.id, checked),
        isActivation: true,
      };
    });
  }

  function buildCombatToggleActivationCards(player) {
    return (player.combatToggleDefinitions || []).map(definition => {
      const checked = Boolean(player.combatToggles && player.combatToggles[definition.id]) && definition.available !== false;
      const detail = cleanRulesText(definition.detail || definition.text || definition.description || '');
      return {
        id: `combat-toggle-${definition.id}`,
        group: normalizeActivationTiming(definition.timing || definition.group),
        sourceType: 'effect',
        type: 'Activation',
        title: definition.label || definition.title || definition.name || definition.id,
        meta: definition.source || definition.sourceName || '',
        detail,
        fullDetail: detail,
        tags: ['Activation', checked ? 'Active' : 'Inactive'].filter(Boolean),
        controls: renderCombatToggleControl(definition.id, checked, definition.available !== false),
        isActivation: true,
      };
    });
  }

  function buildActiveConditionCards(player) {
    const cards = [];
    (player.conditions || []).forEach(condition => {
      const title = cleanDetailValue(condition);
      if (!title) return;
      cards.push({
        id: `condition-${slugify(title)}`,
        group: 'Free / Utility',
        sourceType: 'effect',
        type: 'Condition',
        title,
        meta: 'Currently recorded',
        detail: `${title} is recorded on this sheet.`,
        tags: ['Condition'],
      });
    });
    if (player.concentration) {
      const title = cleanDetailValue(player.concentration);
      cards.push({
        id: `concentration-${slugify(title)}`,
        group: 'Free / Utility',
        sourceType: 'effect',
        type: 'Concentration',
        title: `Concentration: ${title}`,
        meta: 'Active spell or effect',
        detail: `${title} is recorded as the current concentration effect.`,
        tags: ['Concentration'],
      });
    }
    return cards;
  }

  function renderWeaponToggleActivationControl(weaponId, option, checked, enabled, resourceState = null, manualInput = '', resourceCost = 1) {
    const status = resourceState && resourceState.max !== null
      ? `<span class="use-status">${escapeHtml(`${resourceState.available} / ${resourceState.max} left${resourceCost > 1 ? `; costs ${resourceCost}` : ''}`)}</span>`
      : '';
    return `<div class="action-controls">${renderInlineCheckboxControl({
      attrs: `data-weapon-toggle="${escapeAttr(weaponId)}" data-weapon-option="${escapeAttr(option)}"`,
      checked,
      enabled,
      activeLabel: 'Active',
      inactiveLabel: 'Inactive',
    })}${manualInput}${status}</div>`;
  }

  function renderTemporaryEffectControl(effectId, checked) {
    return `<div class="action-controls">${renderInlineCheckboxControl({
      attrs: `data-temporary-effect="${escapeAttr(effectId)}"`,
      checked,
      enabled: true,
      activeLabel: 'Active',
      inactiveLabel: 'Inactive',
    })}</div>`;
  }

  function renderCombatToggleControl(toggleId, checked, enabled) {
    return `<div class="action-controls">${renderInlineCheckboxControl({
      attrs: `data-combat-toggle="${escapeAttr(toggleId)}"`,
      checked,
      enabled,
      activeLabel: 'Active',
      inactiveLabel: 'Inactive',
    })}</div>`;
  }

  function renderInlineCheckboxControl({ attrs, checked, enabled, activeLabel, inactiveLabel }) {
    return `<label class="combat-inline-toggle ${enabled ? '' : 'disabled'}">
      <input type="checkbox" ${attrs || ''} ${checked && enabled ? 'checked' : ''} ${enabled ? '' : 'disabled'}>
      <span>${escapeHtml(checked && enabled ? activeLabel : inactiveLabel)}</span>
    </label>`;
  }

  function renderTemporaryCustomEffectControls(player) {
    const state = normalizeTemporaryEffects(player && player.temporaryEffects);
    return `<section class="combat-custom-effect-controls">
      <div class="combat-list-heading">
        <h3>Custom Effect</h3>
      </div>
      <div class="temporary-custom">
        <label><span>Custom Label</span><input type="text" data-temporary-effect-name value="${escapeAttr(state.customName)}" placeholder="Blessing, cover, potion..."></label>
        <label><span>AC Bonus</span><input type="number" data-temporary-ac-bonus value="${state.customAcBonus || ''}" inputmode="numeric" min="-20" max="20"></label>
      </div>
    </section>`;
  }

  function normalizeActivationTiming(timing) {
    const text = normalizeName(timing);
    if (text.includes('bonus')) return 'Bonus Action';
    if (text.includes('reaction')) return 'Reaction';
    if (text.includes('hit') || text.includes('miss') || text.includes('trigger')) return 'Triggered';
    if (/\b(action|1 action)\b/.test(text) && !text.includes('no action')) return 'Action';
    return 'Free / Utility';
  }

  function uniqueActionCards(cards) {
    const seen = new Set();
    const out = [];
    for (const card of cards || []) {
      const key = normalizeName(card && (card.id || `${card.sourceType || ''} ${card.title || ''} ${card.group || ''}`));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(card);
    }
    return out;
  }

  function actionGroupSort(group) {
    const order = ['Action', 'Bonus Action', 'Reaction', 'Triggered', 'Free / Utility'];
    const index = order.indexOf(normalizeActionGroup(group));
    return index === -1 ? order.length : index;
  }

  function renderClassInfoPanel(root, player) {
    const target = root.querySelector('[data-class-info-panel]');
    if (!target) return;
    const features = getRuntimeRuleFeatures(player, root).filter(feature => feature.kind !== 'race');
    if (!features.length) {
      target.innerHTML = '<p>No class features found in canonical rules.</p>';
      ensureFeatureCatalog(root);
      return;
    }
    target.innerHTML = `<div class="class-feature-list">
      ${features.map(feature => renderClassFeatureRow(player, feature)).join('')}
    </div>`;
    ensureFeatureCatalog(root);
  }

  function renderRaceInfoPanel(root, player) {
    const target = root.querySelector('[data-race-info-panel]');
    if (!target) return;
    const features = getRuntimeRuleFeatures(player, root).filter(feature => feature.kind === 'race');
    if (!features.length) {
      target.innerHTML = '<p>No racial traits found in canonical rules.</p>';
      return;
    }
    target.innerHTML = `<div class="class-feature-list">
      ${features.map(feature => renderClassFeatureRow(player, feature)).join('')}
    </div>`;
  }

  function renderBackgroundInfoPanel(root, player) {
    const target = root.querySelector('[data-background-info-panel]');
    if (!target) return;
    target.innerHTML = renderRuleDetailRows(player.backgroundDetails || [], 'No background details found in canonical rules.');
  }

  function renderFeatInfoPanel(root, player) {
    const target = root.querySelector('[data-feat-info-panel]');
    if (!target) return;
    target.innerHTML = renderRuleDetailRows(player.featDetails || [], 'No feats recorded on this sheet.');
  }

  function renderRuleDetailRows(details, emptyText) {
    if (!details.length) return `<p>${escapeHtml(emptyText || 'No details found in canonical rules.')}</p>`;
    return `<div class="class-feature-list">
      ${details.map(renderRuleDetailRow).join('')}
    </div>`;
  }

  function renderRuleDetailRow(detail) {
    return `<details class="class-feature-row">
      <summary>
        <span>
          <strong>${escapeHtml(detail.name)}</strong>
          <small>${escapeHtml(formatRuleDetailMeta(detail))}</small>
        </span>
      </summary>
      ${renderRuleDetailFields(detail)}
      <p>${escapeHtml(formatRuleDetailText(detail))}</p>
    </details>`;
  }

  function renderRuleDetailFields(detail) {
    const rows = [
      ['Skill Proficiencies', detail.skillProficiencies],
      ['Tool Proficiencies', detail.toolProficiencies],
      ['Languages', detail.languages],
      ['Equipment', detail.equipment],
      ['Prerequisites', detail.prerequisites],
      ['Ability Score', detail.abilityScores],
      ['Repeatable', detail.repeatable],
    ].filter(([, value]) => value);
    if (!rows.length) return '';
    return `<dl class="equipment-detail-grid">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
  }

  function formatRuleDetailMeta(detail) {
    if (detail.missing) return 'Details unavailable';
    return [detail.featureName, formatSource(detail), detail.timing].filter(Boolean).join(' / ');
  }

  function formatRuleDetailText(detail) {
    if (detail.missing) return 'No canonical rules entry matched this sheet value yet.';
    if (detail.featureName && detail.featureText) return `${detail.featureName}: ${detail.featureText}`;
    return detail.featureText || detail.text || 'No rules text recorded.';
  }

  function renderClassFeatureRow(player, feature) {
    const controls = renderClassFeatureControls(player, feature);
    return `<details class="class-feature-row">
      <summary>
        <span>
          <strong>${escapeHtml(feature.name)}</strong>
          <small>${escapeHtml(formatClassFeatureMeta(feature))}</small>
        </span>
        ${controls}
      </summary>
      <p>${escapeHtml(feature.text || 'No feature text recorded.')}</p>
    </details>`;
  }

  function formatClassFeatureMeta(feature) {
    return [
      feature.kind === 'race' ? feature.raceName || 'Race' : (feature.kind === 'subclass' ? feature.subclassName : feature.className),
      feature.level ? `Level ${feature.level}` : '',
      feature.timing,
      feature.resourceHint,
    ].filter(Boolean).join(' / ');
  }

  function renderClassFeatureControls(player, feature) {
    const resourceId = getFeatureResourceId(player, feature);
    const controls = [];
    const state = getResourceUseState(player, resourceId);
    if (state && state.max !== null) {
      controls.push(renderResourceSpendButton(resourceId, 'Use', state.available <= 0));
      controls.push(`<span class="use-status">${escapeHtml(`${state.available} / ${state.max} left`)}</span>`);
    }
    const rollButton = renderFeatureRollButton(feature);
    if (rollButton) controls.push(rollButton);
    return controls.length ? `<span class="class-feature-controls">${controls.join('')}</span>` : '';
  }

  function getFeatureResourceId(player, feature) {
    if (!feature) return '';
    if (feature.resourceId && findPlayerResource(player, feature.resourceId)) return feature.resourceId;
    if (findPlayerResource(player, feature.id)) return feature.id;
    const bySource = uniqueRuleRecords(player && player.resources || []).find(resource => resource.sourceId === feature.id);
    if (bySource) return bySource.id;
    const name = normalizeName(feature.name);
    const hint = normalizeName(feature.resourceHint);
    const resource = uniqueRuleRecords(player && player.resources || []).find(candidate => {
      const candidateName = normalizeName(candidate.name || candidate.id);
      const candidateId = normalizeName(candidate.id);
      const nameMatches = candidateName && candidateName === name;
      const idMatches = candidateId && candidateId === slugify(feature.name || '');
      const hintMatches = candidateName && candidateName === hint || candidateId && candidateId === slugify(feature.resourceHint || '');
      return Boolean((nameMatches || idMatches || hintMatches) && featureUsesResource(feature, candidate));
    });
    if (resource) return resource.id;
    const channel = hint.includes('channel divinity') && findPlayerResource(player, 'cleric-channel-divinity');
    if (channel && featureUsesResource(feature, channel)) return channel.id;
    return '';
  }

  function featureUsesResource(feature, resource) {
    if (!feature || !resource) return false;
    if (resource.sourceId && resource.sourceId === feature.id) return true;
    const name = normalizeName(feature.name);
    const text = normalizeName(feature.text);
    const resourceName = normalizeName(resource.name || resource.id);
    if (name === resourceName) return true;
    if (name.startsWith(`${resourceName} `)) return true;
    const usesResource = text.includes(`use your ${resourceName}`) && !text.includes(`ways to use your ${resourceName}`)
      || text.includes(`uses your ${resourceName}`)
      || text.includes(`spend ${resourceName}`)
      || text.includes(`spend a use of your ${resourceName}`)
      || text.includes(`expend a use of your ${resourceName}`)
      || text.includes(`expend ${resourceName}`);
    return usesResource;
  }

  function getRuntimeRuleFeatures(player, root = null) {
    const records = [
      ...(Array.isArray(player && player.ruleFeatures) ? player.ruleFeatures : []),
      ...getSelectedFeatureOptionRecords(player, root),
    ];
    const seen = new Set();
    const out = [];
    for (const feature of records) {
      const normalized = normalizeRuntimeFeature(feature, player);
      const key = normalized.id || normalizeName(`${normalized.kind} ${normalized.name} ${normalized.level}`);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(normalized);
    }
    return out.sort((a, b) => Number(a.level || 0) - Number(b.level || 0) || `${a.kind} ${a.name}`.localeCompare(`${b.kind} ${b.name}`));
  }

  function getSelectedFeatureOptionRecords(player, root = null) {
    const selections = getSelectedFeatureOptionNames(player);
    if (!selections.length) return [];
    const catalog = [
      ...(root && Array.isArray(root._featureCatalog) ? root._featureCatalog : []),
      ...FEATURE_OPTION_FALLBACKS,
    ];
    const out = [];
    for (const selection of selections) {
      const selectedName = normalizeName(selection.value);
      if (!selectedName) continue;
      const match = catalog.find(feature => {
        if (!featureOptionAppliesToPlayer(feature, player)) return false;
        return normalizeName(feature.name) === selectedName || normalizeName(feature.id) === selectedName;
      });
      if (match) {
        out.push({
          ...match,
          choiceGroup: selection.group || match.choiceGroup || '',
          selectedChoice: true,
        });
      }
    }
    return out;
  }

  function getSelectedFeatureOptionNames(player) {
    const featureChoices = {
      ...((player && player.ruleChoices && player.ruleChoices.featureChoices && typeof player.ruleChoices.featureChoices === 'object') ? player.ruleChoices.featureChoices : {}),
      ...((player && player.featureChoices && typeof player.featureChoices === 'object') ? player.featureChoices : {}),
    };
    const out = [];
    for (const [group, value] of Object.entries(featureChoices)) {
      if (!isFeatureOptionChoiceGroup(group)) continue;
      const values = Array.isArray(value) ? value : String(value || '').split(/[;,|]/);
      values.map(cleanDetailValue).filter(Boolean).forEach(option => out.push({ group, value: option }));
    }
    return out;
  }

  function isFeatureOptionChoiceGroup(group) {
    const clean = normalizeName(group);
    return clean === 'hunter s prey' || clean.includes('feature option') || clean.includes('hunters prey');
  }

  function featureOptionAppliesToPlayer(feature, player) {
    if (!feature || !player) return false;
    if (Number(feature.level || 1) > Number(player.level || 1)) return false;
    const className = normalizeName(player.class);
    if (feature.className && normalizeName(feature.className) !== className) return false;
    if (feature.kind === 'subclass') {
      const subclass = normalizeName(player.subclassShortName || player.subclass);
      if (!subclass) return true;
      const haystack = normalizeName(`${feature.subclassName || ''} ${feature.subclassShortName || ''} ${feature.id || ''}`);
      return !haystack || haystack.includes(subclass);
    }
    return true;
  }

  function normalizeRuntimeFeature(feature, player) {
    return {
      id: cleanDetailValue(feature && feature.id),
      kind: cleanDetailValue(feature && feature.kind) || 'class',
      name: cleanDetailValue(feature && feature.name),
      className: cleanDetailValue(feature && feature.className) || cleanDetailValue(player && player.class),
      subclassName: cleanDetailValue(feature && (feature.subclassName || feature.subclassShortName)) || '',
      raceName: cleanDetailValue(feature && feature.raceName),
      baseRaceName: cleanDetailValue(feature && feature.baseRaceName),
      subraceName: cleanDetailValue(feature && feature.subraceName),
      raceId: cleanDetailValue(feature && feature.raceId),
      level: Number(feature && feature.level) || 1,
      source: cleanDetailValue(feature && feature.source),
      text: cleanRulesText(feature && feature.text),
      timing: cleanDetailValue(feature && feature.timing),
      resourceHint: cleanDetailValue(feature && feature.resourceHint),
      resourceId: cleanDetailValue(feature && feature.resourceId),
      activations: Array.isArray(feature && feature.activations) ? feature.activations : [],
      grants: Array.isArray(feature && feature.grants) ? feature.grants : [],
      optional: Boolean(feature && feature.optional),
      choiceGroup: cleanDetailValue(feature && feature.choiceGroup),
      selectedChoice: Boolean(feature && feature.selectedChoice),
    };
  }

  function getRuntimeRuleActivations(player, root = null) {
    const records = [
      ...(Array.isArray(player && player.ruleActivations) ? player.ruleActivations : []),
    ];
    const features = getRuntimeRuleFeatures(player, root);
    for (const feature of features) {
      const activations = Array.isArray(feature.activations) && feature.activations.length
        ? feature.activations
        : inferFeatureActivations(feature);
      activations.forEach(activation => records.push(normalizeRuleActivation(activation, feature)));
    }
    const seen = new Set();
    const out = [];
    for (const activation of records.map(record => normalizeRuleActivation(record, record)).filter(Boolean)) {
      const key = activation.id || normalizeName(`${activation.sourceId} ${activation.label} ${activation.appliesTo}`);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(activation);
    }
    return out;
  }

  function inferFeatureActivations(feature) {
    if (!feature) return [];
    const className = normalizeName(feature.className);
    const name = normalizeName(feature.name);
    if (className !== 'monk') return [];
    const common = { resourceId: feature.resourceId || (feature.resourceHint === 'Ki' ? 'monk-ki' : ''), sourceType: feature.kind || 'class' };
    if (name === 'flurry of blows') {
      return [{
        id: `${feature.id}-flurry-of-blows`,
        label: 'Flurry of Blows',
        timing: 'Bonus Action',
        appliesTo: 'bonus-action-attack',
        resourceCost: 1,
        consumeOn: 'activation',
        control: 'button',
        text: 'Spend 1 ki after taking the Attack action to make two unarmed strikes as a bonus action.',
        ...common,
      }];
    }
    if (name === 'patient defense') {
      return [{
        id: `${feature.id}-patient-defense`,
        label: 'Patient Defense',
        timing: 'Bonus Action',
        appliesTo: 'self',
        resourceCost: 1,
        consumeOn: 'activation',
        control: 'button',
        text: 'Spend 1 ki to take the Dodge action as a bonus action on your turn.',
        ...common,
      }];
    }
    if (name === 'step of the wind') {
      return [{
        id: `${feature.id}-step-of-the-wind`,
        label: 'Step of the Wind',
        timing: 'Bonus Action',
        appliesTo: 'self',
        resourceCost: 1,
        consumeOn: 'activation',
        control: 'button',
        text: 'Spend 1 ki to take the Dash or Disengage action as a bonus action; your jump distance doubles for the turn.',
        ...common,
      }];
    }
    if (name === 'ki fueled attack') {
      return [{
        id: `${feature.id}-ki-fueled-attack`,
        label: 'Ki-Fueled Attack',
        timing: 'Bonus Action',
        appliesTo: 'bonus-action-attack',
        resourceId: '',
        resourceCost: 0,
        consumeOn: 'manual',
        text: 'Turn on after spending 1 or more ki as part of your action; you can make one unarmed strike or monk weapon attack as a bonus action before the turn ends.',
        sourceType: feature.kind || 'class',
      }];
    }
    if (name === 'quickened healing') {
      return [{
        id: `${feature.id}-quickened-healing`,
        label: 'Quickened Healing',
        timing: 'Action',
        appliesTo: 'self',
        resourceCost: 2,
        consumeOn: 'activation',
        control: 'button',
        text: 'Spend 2 ki and roll a Martial Arts die; regain hit points equal to the roll plus proficiency bonus.',
        ...common,
      }];
    }
    if (name === 'focused aim') {
      return [{
        id: `${feature.id}-focused-aim`,
        label: 'Focused Aim',
        timing: 'after-miss',
        appliesTo: 'weapon-attack',
        resourceCostKey: 'focused-aim-ki',
        consumeOn: 'attack-roll',
        valueKey: 'focused-aim-ki',
        defaultValue: 1,
        min: 1,
        max: 3,
        step: 1,
        effects: [{
          kind: 'weapon-attack-bonus',
          label: 'Focused Aim',
          valueMode: 'manual',
          valueKey: 'focused-aim-ki',
          defaultValue: 1,
          min: 1,
          max: 3,
          step: 1,
          multiplier: 2,
          valueLabel: 'Ki points',
        }],
        text: 'After missing with an attack roll, spend 1 to 3 ki to increase the attack roll by 2 per ki point.',
        ...common,
      }];
    }
    if (name === 'stunning strike') {
      return [{
        id: `${feature.id}-stunning-strike`,
        label: 'Stunning Strike',
        timing: 'on-hit',
        appliesTo: 'melee-weapon-attack',
        resourceCost: 1,
        consumeOn: 'damage-roll',
        effects: [{
          kind: 'on-hit',
          label: 'Stunning Strike',
          saveAbility: 'con',
          saveDcSource: 'ki',
          text: 'Target makes a Constitution saving throw against your ki save DC or is stunned until the end of your next turn.',
        }],
        text: 'On a melee weapon hit, spend 1 ki to force a Constitution save against your ki save DC; on a failure, the target is stunned until the end of your next turn.',
        ...common,
      }];
    }
    return [];
  }

  function normalizeRuleActivation(activation, source = {}) {
    if (!activation || typeof activation !== 'object') return null;
    const sourceId = cleanDetailValue(activation.sourceId || source.id);
    const label = cleanDetailValue(activation.label || activation.title || activation.name || source.name);
    const id = cleanDetailValue(activation.id) || slugify(`${sourceId || source.kind || 'rule'}-${label || 'activation'}`);
    if (!id || !label) return null;
    const hasActivationResourceId = Object.prototype.hasOwnProperty.call(activation, 'resourceId');
    const resourceId = cleanDetailValue(hasActivationResourceId ? activation.resourceId : source.resourceId);
    const resourceCost = activation.resourceCost === '' || activation.resourceCost === null || activation.resourceCost === undefined
      ? undefined
      : Number(activation.resourceCost);
    return {
      id,
      label,
      title: label,
      sourceType: cleanDetailValue(activation.sourceType || source.kind || source.sourceType || 'rule'),
      sourceId,
      sourceName: cleanDetailValue(activation.sourceName || source.className || source.subclassName || source.raceName || source.type || source.kind || ''),
      className: cleanDetailValue(activation.className || source.className),
      subclassName: cleanDetailValue(activation.subclassName || source.subclassName),
      level: Number(activation.level || source.level) || '',
      timing: cleanDetailValue(activation.timing || source.timing || 'Free / Utility'),
      appliesTo: cleanDetailValue(activation.appliesTo || 'self'),
      stateScope: cleanDetailValue(activation.stateScope || activation.scope || 'shared'),
      resourceId,
      resourceCost: Number.isFinite(resourceCost) ? resourceCost : (resourceId ? 1 : 0),
      resourceCostKey: cleanDetailValue(activation.resourceCostKey),
      consumeOn: cleanDetailValue(activation.consumeOn || activation.consume || activation.spendOn || 'activation'),
      valueKey: cleanDetailValue(activation.valueKey),
      defaultValue: activation.defaultValue,
      min: activation.min,
      max: activation.max,
      step: activation.step,
      control: cleanDetailValue(activation.control),
      effects: Array.isArray(activation.effects) ? activation.effects : [],
      text: cleanRulesText(activation.text || activation.detail || source.text || ''),
      tags: Array.isArray(activation.tags) ? activation.tags.filter(Boolean) : [],
    };
  }

  function getRuntimeRuleActivationToggles(player, root = null, weaponContext = null) {
    return getRuntimeRuleActivations(player, root)
      .filter(isWeaponRuleActivation)
      .map(ruleActivationToWeaponToggle)
      .filter(toggle => !weaponContext || weaponToggleAppliesToWeapon(toggle, weaponContext));
  }

  function getRuntimeRuleControlToggles(player, root = null) {
    return getRuntimeRuleActivations(player, root)
      .filter(activation => isWeaponRuleActivation(activation) || normalizeName(activation.consumeOn) === 'manual')
      .map(ruleActivationToWeaponToggle);
  }

  function isWeaponRuleActivation(activation) {
    const appliesTo = normalizeName(activation && activation.appliesTo);
    return /\bweapon\b/.test(appliesTo) && /\b(attack|hit)\b/.test(appliesTo);
  }

  function ruleActivationToWeaponToggle(activation) {
    return {
      id: activation.id,
      label: activation.label,
      title: activation.label,
      timing: activation.timing,
      appliesTo: activation.appliesTo,
      stateScope: 'shared',
      sourceType: activation.sourceType,
      sourceId: activation.sourceId,
      sourceName: activation.sourceName || activation.className || activation.subclassName || activation.sourceType,
      resourceId: activation.resourceId,
      resourceCost: activation.resourceCost,
      resourceCostKey: activation.resourceCostKey,
      consumeOn: activation.consumeOn,
      valueKey: activation.valueKey,
      defaultValue: activation.defaultValue,
      min: activation.min,
      max: activation.max,
      step: activation.step,
      effects: activation.effects,
      text: activation.text,
      tags: activation.tags,
    };
  }

  function weaponToggleAppliesToWeapon(toggle, weaponContext) {
    if (!toggle || !toggle.id) return false;
    const appliesTo = normalizeName(toggle.appliesTo);
    if (!appliesTo || appliesTo === 'this weapon') return true;
    if (appliesTo === 'equipped weapon' || appliesTo === 'weapon attack' || appliesTo === 'attack roll') return true;
    if (appliesTo === 'melee weapon attack') return normalizeName(weaponContext && weaponContext.style) === 'melee';
    if (appliesTo === 'ranged weapon attack') return normalizeName(weaponContext && weaponContext.style) === 'ranged';
    if (appliesTo.includes('melee') && appliesTo.includes('weapon')) return normalizeName(weaponContext && weaponContext.style) === 'melee';
    if (appliesTo.includes('ranged') && appliesTo.includes('weapon')) return normalizeName(weaponContext && weaponContext.style) === 'ranged';
    return appliesTo.includes('weapon') && appliesTo.includes('attack');
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

    if (weapon.finesse) {
      controls.push(`<fieldset class="weapon-control">
        <legend>Ability</legend>
        <label><input type="radio" name="ability-${escapeAttr(item.id)}" data-weapon-ability="${escapeAttr(item.id)}" value="str" ${weapon.ability === 'str' ? 'checked' : ''}> <span>STR ${formatBonus(calculateModifier(Number(player.abilities && player.abilities.str) || 10))}</span></label>
        <label><input type="radio" name="ability-${escapeAttr(item.id)}" data-weapon-ability="${escapeAttr(item.id)}" value="dex" ${weapon.ability === 'dex' ? 'checked' : ''}> <span>DEX ${formatBonus(calculateModifier(Number(player.abilities && player.abilities.dex) || 10))}</span></label>
      </fieldset>`);
    }

    if (hasPlayerFeat(player, 'great weapon master') && weapon.proficient && weapon.style === 'melee' && weapon.properties.some(property => normalizeName(property).includes('heavy'))) {
      controls.push(renderWeaponCheckbox(item.id, 'greatWeaponMaster', 'Great Weapon Master', '-5 hit / +10 damage', state.greatWeaponMaster, equipped));
    }

    for (const toggle of getApplicableWeaponRuleToggles(player, { id: item.id, name: item.name, details: item.details, properties: weapon.properties, style: weapon.style, damageType: weapon.damageType })) {
      if (usesSharedWeaponToggleState(toggle)) continue;
      const sourceItem = findToggleSourceItem(player, toggle);
      const sourceEquipped = !sourceItem || isItemEquipped(player, sourceItem);
      const resourceId = getWeaponToggleResourceId(player, sourceItem || item, toggle);
      const resourceState = resourceId ? getResourceUseState(player, resourceId) : null;
      const consumeOn = getWeaponToggleConsumeOn(toggle);
      const active = isWeaponToggleActive(state, toggle);
      const resourceCost = getWeaponToggleResourceCost(toggle, state);
      const resourceAvailable = !resourceState || resourceState.max === null || resourceState.available >= resourceCost || active && consumeOn === 'activation';
      const enabled = equipped && sourceEquipped && (resourceAvailable || active);
      controls.push(renderWeaponCheckbox(
        item.id,
        toggle.id,
        toggle.label || toggle.title || toggle.id,
        toggle.text || formatToggleEffects(toggle),
        active && resourceAvailable,
        enabled,
        renderWeaponManualValueInput(item.id, toggle, state, enabled),
      ));
    }

    if (!controls.length) return '';
    return `<div class="weapon-controls">${controls.join('')}</div>`;
  }

  function renderWeaponActionControls(item, player) {
    const controls = [
      renderWeaponHandSelect(item),
      renderWeaponAbilitySelect(item, player),
      `<button class="roll-button" type="button" data-roll-type="attack" data-weapon-id="${escapeAttr(item.id)}">Attack</button>`,
      `<button class="roll-button" type="button" data-roll-type="damage" data-weapon-id="${escapeAttr(item.id)}">Damage</button>`,
    ].filter(Boolean);
    return `<div class="action-controls weapon-action-controls">${controls.join('')}</div>`;
  }

  function renderWeaponHandSelect(item) {
    const weapon = item.weapon;
    if (!weapon.versatileDamage) return '';
    return `<label class="weapon-action-select">
      <span>Hands</span>
      <select data-weapon-mode="${escapeAttr(item.id)}" aria-label="${escapeAttr(`${weapon.name} handedness`)}">
        <option value="one" ${weapon.handMode !== 'two' ? 'selected' : ''}>1H ${escapeHtml(weapon.baseDamage)}</option>
        <option value="two" ${weapon.handMode === 'two' ? 'selected' : ''}>2H ${escapeHtml(weapon.versatileDamage)}</option>
      </select>
    </label>`;
  }

  function renderWeaponAbilitySelect(item, player) {
    const weapon = item.weapon;
    if (!weapon.finesse) return '';
    const strMod = calculateModifier(Number(player.abilities && player.abilities.str) || 10);
    const dexMod = calculateModifier(Number(player.abilities && player.abilities.dex) || 10);
    return `<label class="weapon-action-select">
      <span>Ability</span>
      <select data-weapon-ability="${escapeAttr(item.id)}" aria-label="${escapeAttr(`${weapon.name} attack ability`)}">
        <option value="str" ${weapon.ability === 'str' ? 'selected' : ''}>STR ${formatBonus(strMod)}</option>
        <option value="dex" ${weapon.ability === 'dex' ? 'selected' : ''}>DEX ${formatBonus(dexMod)}</option>
      </select>
    </label>`;
  }

  function findToggleSourceItem(player, toggle) {
    return (player.inventory || []).find(item => item.details && Array.isArray(item.details.toggles) && item.details.toggles.some(candidate => candidate.id === toggle.id));
  }

  function formatToggleEffects(toggle) {
    return (toggle.effects || []).map(effect => {
      if (effect.kind === 'extra-damage') return `${effect.dice} ${effect.damageType} on hit`;
      if (effect.kind === 'weapon-attack-bonus') return isManualWeaponToggleEffect(effect) ? 'manual weapon attack bonus' : `${formatBonus(effect.value)} to weapon attack rolls`;
      if (effect.kind === 'weapon-damage-bonus') return isManualWeaponToggleEffect(effect) ? 'manual weapon damage bonus' : `${formatBonus(effect.value)} to weapon damage rolls`;
      if (effect.kind === 'on-hit') return effect.text || effect.label;
      return effect.label || effect.kind;
    }).filter(Boolean).join('; ');
  }

  function formatToggleAbility(toggle) {
    if (!toggle) return '';
    const title = cleanDetailValue(toggle.label || toggle.title || toggle.id || 'Item toggle');
    const detail = cleanRulesText(toggle.text || formatToggleEffects(toggle));
    return detail ? `${title}: ${detail}` : title;
  }

  function formatWeaponOnHitEffectText(player, effect, toggle) {
    const base = cleanRulesText(effect && effect.text || toggle && toggle.text || '');
    const saveAbility = cleanDetailValue(effect && (effect.saveAbility || effect.save));
    const dcSource = normalizeName(effect && (effect.saveDcSource || effect.dcSource));
    const dc = dcSource === 'ki' ? calculateKiSaveDc(player) : Number(effect && (effect.saveDc || effect.dc));
    const save = saveAbility ? `${saveAbility.toUpperCase()} save${Number.isFinite(dc) ? ` DC ${dc}` : ''}` : '';
    if (!save) return base;
    return base && !normalizeName(base).includes(normalizeName(save)) ? `${base} (${save})` : base || save;
  }

  function calculateKiSaveDc(player) {
    const wis = calculateModifier(Number(player && player.abilities && player.abilities.wis) || 10);
    return 8 + (Number(player && player.proficiencyBonus) || calculateProficiencyBonus(Number(player && player.level) || 1)) + wis;
  }

  function formatEffectSummary(effect) {
    if (!effect) return '';
    if (effect.kind === 'weapon-bonus' && Number(effect.value)) {
      return `${formatBonus(effect.value)} to attack and damage rolls with this weapon.`;
    }
    if (effect.kind === 'ac-bonus' && Number(effect.value)) return `${formatBonus(effect.value)} AC.`;
    if (effect.kind === 'weapon-attack-bonus' && Number(effect.value)) return `${formatBonus(effect.value)} to weapon attack rolls.`;
    if (effect.kind === 'weapon-damage-bonus' && Number(effect.value)) return `${formatBonus(effect.value)} to weapon damage rolls.`;
    if (effect.kind === 'weapon-attack-bonus' && isManualWeaponToggleEffect(effect)) return 'Manual weapon attack bonus.';
    if (effect.kind === 'weapon-damage-bonus' && isManualWeaponToggleEffect(effect)) return 'Manual weapon damage bonus.';
    if (effect.kind === 'extra-damage' && effect.dice) return `${effect.dice} ${effect.damageType || ''} damage.`;
    return cleanRulesText([effect.kind, effect.value !== undefined ? formatBonus(effect.value) : '', effect.damageType].filter(Boolean).join(' '));
  }

  function renderWeaponCheckbox(weaponId, option, label, detail, checked, enabled, extraControls = '') {
    return `<div class="weapon-control ${enabled ? '' : 'disabled'}">
      <label class="weapon-toggle-label">
        <input type="checkbox" data-weapon-toggle="${escapeAttr(weaponId)}" data-weapon-option="${escapeAttr(option)}" ${checked && enabled ? 'checked' : ''} ${enabled ? '' : 'disabled'}>
        <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(enabled ? detail : `${detail} (equip required)`)}</small></span>
      </label>
      ${extraControls}
    </div>`;
  }

  function renderWeaponManualValueInput(weaponId, toggle, state, enabled) {
    const effect = getManualWeaponToggleEffect(toggle);
    if (!effect) return '';
    const key = getWeaponToggleValueKey(toggle, effect);
    const value = resolveWeaponToggleEffectValue(state, toggle, effect);
    const label = effect.valueLabel || effect.inputLabel || toggle.valueLabel || 'Damage bonus';
    const min = Number(effect.min ?? toggle.min);
    const max = Number(effect.max ?? toggle.max);
    const step = Number(effect.step ?? toggle.step);
    const attrValue = value === null || value === undefined ? '' : String(value);
    return `<label class="weapon-manual-bonus">
      <span>${escapeHtml(label)}</span>
      <input type="number" value="${escapeAttr(attrValue)}" ${Number.isFinite(min) ? `min="${escapeAttr(String(min))}"` : ''} ${Number.isFinite(max) ? `max="${escapeAttr(String(max))}"` : ''} ${Number.isFinite(step) && step > 0 ? `step="${escapeAttr(String(step))}"` : 'step="1"'} data-weapon-toggle-value="${escapeAttr(weaponId)}" data-weapon-option="${escapeAttr(toggle.id)}" data-weapon-value-key="${escapeAttr(key)}" ${enabled ? '' : 'disabled'}>
    </label>`;
  }

  function renderActionsPanel(root, player) {
    const target = root.querySelector('[data-actions-panel]');
    if (!target) return;
    const groups = buildActionGroups(player, root);
    target.innerHTML = `<div class="actions-panel" data-active-action-filter="all">
      ${renderActionOverview(groups)}
      ${renderActionFilterControls(groups)}
      ${groups.map(group => renderActionGroup(group)).join('')}
      <div class="roll-log" data-roll-log></div>
    </div>`;
    ensureActionCatalog(root);
    ensureFeatureCatalog(root);
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

    buildWeaponActionCards(player).forEach(card => addActionCard(groups, card, player));
    buildProjectedSpellActionCards(player, root).forEach(card => addActionCard(groups, card, player));
    buildSpellActionCards(player, root).forEach(card => addActionCard(groups, card, player));
    buildSpellScrollActionCards(player, root).forEach(card => addActionCard(groups, card, player));
    const ruleActivationCards = buildRuleActivationCards(player, root);
    ruleActivationCards.forEach(card => addActionCard(groups, card, player));
    filterDuplicateRuleActivationActions(buildRuleActionCards(player, root), ruleActivationCards).forEach(card => addActionCard(groups, card, player));
    if (!hasCanonicalClassActions(player)) buildClassActionCards(player).forEach(card => addActionCard(groups, card, player));
    buildItemActionCards(player, root).forEach(card => addActionCard(groups, card, player));
    buildCoreActionCards(player).forEach(card => addActionCard(groups, card, player));

    return Array.from(groups.entries())
      .map(([name, cards]) => ({ name, cards }))
      .filter(group => group.cards.length);
  }

  function renderActionOverview(groups) {
    const visibleGroups = (groups || []).filter(group => group.cards && group.cards.length);
    if (!visibleGroups.length) return '';
    const total = visibleGroups.reduce((sum, group) => sum + group.cards.length, 0);
    const limited = visibleGroups.flatMap(group => group.cards).filter(card => card.resourceId).length;
    return `<div class="action-overview" aria-label="Action overview">
      <div>
        <strong>${escapeHtml(`${total} options`)}</strong>
        <small>${escapeHtml(limited ? `${limited} spend tracked resources` : 'No limited-use actions detected')}</small>
      </div>
      <div class="action-jump-list">
        ${visibleGroups.map(group => `<button class="text-button" type="button" data-action-group-jump="${escapeAttr(group.name)}">
          ${escapeHtml(group.name)} <span>${escapeHtml(String(group.cards.length))}</span>
        </button>`).join('')}
      </div>
    </div>`;
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

  function addActionCard(groups, card, player = null) {
    const enhanced = enhanceActionCard(player, card);
    const group = groups.has(enhanced.group) ? enhanced.group : 'Free / Utility';
    groups.get(group).push(enhanced);
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
        ${card.detail ? `<details class="action-detail-toggle"><summary>Details</summary><p>${escapeHtml(card.detail)}</p></details>` : ''}
      </div>
      <div class="action-side">
        ${card.tags && card.tags.length ? `<div class="action-tags">${card.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        ${card.controls || ''}
      </div>
      ${card.math && card.math.length ? `<details class="action-math"><summary>Math</summary>${renderActionMath(card.math)}</details>` : ''}
    </article>`;
  }

  function renderCompactActionCard(card) {
    const categories = getActionCategories(card);
    const search = [
      card.group,
      card.type,
      card.title,
      card.meta,
      card.detail,
      ...(card.tags || []),
    ].filter(Boolean).join(' ');
    const hasDetails = hasActionDetailContent(card);
    const controls = [
      card.controls ? `<div class="compact-action-rolls">${card.controls}</div>` : '',
      hasDetails ? '<button class="text-button compact-details-button" type="button" data-open-action-details>Details</button>' : '',
    ].filter(Boolean).join('');
    return `<article class="compact-action-card" data-action-card data-action-group="${escapeAttr(card.group || '')}" data-action-kind="${escapeAttr(categories.join(' '))}" data-action-search="${escapeAttr(search)}">
      <div class="compact-action-main">
        <span>${escapeHtml(card.group || card.type || 'Option')}</span>
        <strong>${escapeHtml(card.title || 'Action')}</strong>
        ${card.meta ? `<small>${escapeHtml(card.meta)}</small>` : ''}
      </div>
      ${controls ? `<div class="compact-action-controls">${controls}</div>` : ''}
      ${hasDetails ? `<template data-action-detail-template>${renderCombatActionDetailContent(card)}</template>` : ''}
    </article>`;
  }

  function hasActionDetailContent(card) {
    return Boolean(card && (card.detailHtml || card.fullDetail || card.detail || card.meta || card.tags && card.tags.length || card.math && card.math.length));
  }

  function renderCombatActionDetailContent(card) {
    const rows = [
      ['Timing', card.group],
      ['Type', card.type || card.sourceType],
      ['Summary', card.meta],
    ].filter(([, value]) => value);
    return `<div class="sheet-search-head combat-action-dialog-head">
      <div>
        <h2>${escapeHtml(card.title || 'Combat Option')}</h2>
        <p class="empty-note">${escapeHtml([card.group, card.type || card.sourceType].filter(Boolean).join(' / '))}</p>
      </div>
      <button class="text-button" type="button" data-close-dialog>Close</button>
    </div>
    <div class="combat-action-detail-body">
      ${rows.length ? `<dl class="equipment-detail-grid">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>` : ''}
      ${card.tags && card.tags.length ? `<div class="action-tags combat-action-detail-tags">${card.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      ${card.controls ? `<div class="combat-action-detail-controls">${card.controls}</div>` : ''}
      ${card.detailHtml || renderActionDetailText(card.fullDetail || card.detail || 'No detail text recorded.')}
      ${card.math && card.math.length ? `<section class="combat-action-detail-section"><h3>Math</h3>${renderActionMath(card.math)}</section>` : ''}
    </div>`;
  }

  function renderActionDetailText(text) {
    const paragraphs = String(text || '')
      .split(/\n{2,}/)
      .map(part => cleanRulesText(part))
      .filter(Boolean);
    if (!paragraphs.length) return '<p class="empty-note">No detail text recorded.</p>';
    return `<div class="combat-action-detail-text">${paragraphs.map(part => `<p>${escapeHtml(part)}</p>`).join('')}</div>`;
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

  function enhanceActionCard(player, card) {
    if (!card || !player || isPrecalculatedActionCard(card)) return card || {};
    const text = getActionRulesText(card);

    const id = card.id || slugify(`${card.sourceType || card.type || 'action'}-${card.title || card.name || 'roll'}`);
    const saveProfile = getActionSaveProfile(player, card, text);
    const rollProfile = getActionRollProfile(player, card, text);
    if (!text && !saveProfile && !rollProfile) return card;
    const extraControls = rollProfile ? renderActionRollButton(id, card, rollProfile) : '';
    const extraMath = [
      ...(saveProfile ? getActionSaveMathParts(saveProfile) : []),
      ...(rollProfile ? getActionRollMathParts(rollProfile) : []),
    ];
    const tags = [
      ...(card.tags || []),
      saveProfile ? formatActionSaveTag(saveProfile) : '',
      rollProfile ? rollProfile.formula : '',
    ].filter(Boolean);

    return {
      ...card,
      id,
      meta: augmentActionMeta(card.meta, saveProfile, rollProfile),
      tags: uniqueStrings(tags).slice(0, 7),
      controls: appendActionControls(card.controls, extraControls),
      math: [...(card.math || []), ...extraMath],
    };
  }

  function isPrecalculatedActionCard(card) {
    const sourceType = normalizeName(card && card.sourceType);
    return sourceType === 'weapon' || sourceType === 'spell' || sourceType === 'core';
  }

  function getActionRulesText(card) {
    return cleanRulesText([
      card && card.fullDetail,
      card && card.detail,
      card && card.meta,
      ...((card && card.tags) || []),
    ].filter(Boolean).join(' '));
  }

  function augmentActionMeta(meta, saveProfile, rollProfile) {
    const parts = [meta, saveProfile ? formatActionSaveLabel(saveProfile) : '', rollProfile ? `${capitalize(rollProfile.kind)} ${rollProfile.formula}` : '']
      .map(cleanDetailValue)
      .filter(Boolean);
    return uniqueStrings(parts).join(' / ');
  }

  function appendActionControls(existing, extraControls) {
    if (!extraControls) return existing || '';
    const wrapped = `<div class="action-controls action-roll-controls">${extraControls}</div>`;
    return existing ? `${existing}${wrapped}` : wrapped;
  }

  function renderActionRollButton(id, card, profile) {
    const label = profile.kind === 'healing'
      ? `Healing ${profile.formula}`
      : profile.kind === 'reduction'
        ? `Reduce ${profile.formula}`
        : `Damage ${profile.formula}`;
    return `<button class="roll-button" type="button"
      data-roll-action="${escapeAttr(id)}"
      data-roll-kind="${escapeAttr(profile.kind)}"
      data-roll-title="${escapeAttr(card.title || card.name || 'Action')}"
      data-roll-formula="${escapeAttr(profile.formula)}"
      data-roll-bonus="${escapeAttr(profile.bonus || 0)}"
      data-roll-bonus-label="${escapeAttr(profile.bonusLabel || '')}"
      data-roll-damage-type="${escapeAttr(profile.damageType || '')}">${escapeHtml(label)}</button>`;
  }

  function getActionSaveProfile(player, card, text) {
    const structured = getStructuredActionSaveProfile(player, card);
    if (structured) return structured;
    if (!/\bdc\b|spell save dc|saving throw/i.test(text)) return null;
    const saveAbility = getActionSaveAbility(text);

    const spellDc = player && player.spellSaveDc !== null && player.spellSaveDc !== undefined
      ? Number(player.spellSaveDc)
      : calculateSpellSaveDc(player);
    if (/\b(?:spell|paladin|cleric|druid|wizard|warlock|sorcerer|bard|ranger|artificer)\s+save\s+dc\b/i.test(text) && Number.isFinite(spellDc)) {
      return {
        kind: 'save',
        saveAbility,
        dc: spellDc,
        parts: getSpellDcMathParts(player, spellDc),
        source: 'spell',
      };
    }

    const formula = parseActionDcFormula(player, text);
    if (formula) return { kind: 'save', saveAbility, ...formula };

    const fixed = parseFixedDc(text);
    if (fixed !== null) {
      return {
        kind: saveAbility ? 'save' : 'dc',
        saveAbility,
        dc: fixed,
        parts: [{ label: 'Recorded DC', display: String(fixed) }],
        source: 'fixed',
      };
    }

    return null;
  }

  function getStructuredActionSaveProfile(player, card) {
    const save = getActionSaveDefinition(card);
    if (!save) return null;
    const saveAbility = normalizeAbilityKey(save.ability || save.saveAbility || card.saveAbility);
    const dcValue = save.dc ?? save.value ?? save.saveDc ?? card.saveDc;
    const source = normalizeName(save.source || save.dcSource || save.dcType || save.type || dcValue);

    const spellDc = player && player.spellSaveDc !== null && player.spellSaveDc !== undefined
      ? Number(player.spellSaveDc)
      : calculateSpellSaveDc(player);
    if ((source === 'spell' || source === 'spell save dc' || normalizeName(dcValue) === 'spell') && Number.isFinite(spellDc)) {
      return {
        kind: 'save',
        saveAbility,
        dc: spellDc,
        parts: getSpellDcMathParts(player, spellDc),
        source: 'spell',
      };
    }

    const fixed = Number(dcValue || save.fixed || save.fixedDc);
    if (Number.isFinite(fixed) && fixed > 0) {
      return {
        kind: saveAbility ? 'save' : 'dc',
        saveAbility,
        dc: fixed,
        parts: [{ label: 'Recorded DC', display: String(fixed) }],
        source: 'fixed',
      };
    }

    const formulaAbility = normalizeActionFormulaAbility(save.formulaAbility || save.ability || save.dcAbility || 'spellcasting ability', player);
    const base = Number(save.base || save.saveBase || card.saveBase || 8) || 8;
    if (source === 'formula' && formulaAbility) {
      const abilityMod = calculateModifier(Number(player.abilities && player.abilities[formulaAbility]) || 10);
      const proficiency = Number(player.proficiencyBonus) || 0;
      return {
        kind: 'save',
        saveAbility,
        dc: base + abilityMod + proficiency,
        ability: formulaAbility,
        parts: [
          { label: 'Base save DC', display: String(base) },
          { label: `${ABILITY_NAMES[formulaAbility] || formulaAbility.toUpperCase()} modifier`, value: abilityMod },
          { label: 'Proficiency', value: proficiency },
          { label: 'Save DC', display: String(base + abilityMod + proficiency) },
        ],
        source: 'formula',
      };
    }

    return null;
  }

  function getActionSaveDefinition(card) {
    if (!card) return null;
    if (card.save && typeof card.save === 'object' && !Array.isArray(card.save)) return card.save;
    if (card.saveDc || card.saveAbility || card.saveSource || card.saveBase || card.saveFormulaAbility) {
      return {
        dc: card.saveDc,
        ability: card.saveAbility,
        source: card.saveSource,
        base: card.saveBase,
        formulaAbility: card.saveFormulaAbility,
      };
    }
    return null;
  }

  function parseActionDcFormula(player, text) {
    const patterns = [
      /DC[^.]{0,90}?(?:equals?|is|=|equal to)\s*(\d+)\s*\+\s*your\s+([A-Za-z]+|spellcasting ability)\s+(?:ability\s+)?modifier\s*\+\s*(?:your\s+)?proficiency(?:\s+bonus)?/i,
      /DC[^.]{0,90}?(?:equals?|is|=|equal to)\s*(\d+)\s*\+\s*(?:your\s+|attacker's\s+)?proficiency(?:\s+bonus)?\s*\+\s*(?:your\s+)?([A-Za-z]+)\s+modifier/i,
    ];
    for (let i = 0; i < patterns.length; i += 1) {
      const match = text.match(patterns[i]);
      if (!match) continue;
      const base = Number(match[1]) || 8;
      const ability = normalizeActionFormulaAbility(match[2], player);
      if (!ability) continue;
      const abilityMod = calculateModifier(Number(player.abilities && player.abilities[ability]) || 10);
      const proficiency = Number(player.proficiencyBonus) || 0;
      const parts = i === 0
        ? [
          { label: 'Base save DC', display: String(base) },
          { label: `${ABILITY_NAMES[ability] || ability.toUpperCase()} modifier`, value: abilityMod },
          { label: 'Proficiency', value: proficiency },
          { label: 'Save DC', display: String(base + abilityMod + proficiency) },
        ]
        : [
          { label: 'Base save DC', display: String(base) },
          { label: 'Proficiency', value: proficiency },
          { label: `${ABILITY_NAMES[ability] || ability.toUpperCase()} modifier`, value: abilityMod },
          { label: 'Save DC', display: String(base + abilityMod + proficiency) },
        ];
      return {
        dc: base + abilityMod + proficiency,
        ability,
        parts,
        source: 'formula',
      };
    }
    return null;
  }

  function normalizeActionFormulaAbility(value, player) {
    const text = normalizeName(value);
    if (text === 'spellcasting' || text === 'spellcasting ability') return resolveSpellcastingAbility(player);
    return normalizeAbilityKey(value);
  }

  function parseFixedDc(text) {
    const patterns = [
      /\bsave\s+DC\s+of\s+(\d+)\b/i,
      /\bsave\s+DC\s*(\d+)\b/i,
      /\bDC\s*(?:of\s*)?(\d+)\s+(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw\b/i,
      /\b(?:DC|dc)\s*(\d+)\b/i,
      /\(DC\s*(\d+)\)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]) || null;
    }
    return null;
  }

  function getActionSaveAbility(text) {
    const match = String(text || '').match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw\b/i);
    return match ? normalizeAbilityKey(match[1]) : '';
  }

  function formatActionSaveLabel(profile) {
    if (!profile) return '';
    if (profile.saveAbility) return `${profile.saveAbility.toUpperCase()} save DC ${profile.dc}`;
    return `Save DC ${profile.dc}`;
  }

  function formatActionSaveTag(profile) {
    return profile ? `DC ${profile.dc}` : '';
  }

  function getActionSaveMathParts(profile) {
    if (!profile || !Array.isArray(profile.parts)) return [];
    return profile.parts.map(part => ({
      ...part,
      label: part.label === 'Save DC' ? formatActionSaveLabel(profile) : part.label,
    }));
  }

  function getActionRollProfile(player, card, text) {
    if (card && (card.roll === false || card.rollable === false || hasActionTag(card, 'NoAutoDamage'))) return null;
    if (!/\d+d\d+/i.test(text) || !/\b(damage|hit points?|heal|healing)\b/i.test(text)) return null;
    const sentences = splitSentences(text);
    const primary = findPrimaryRollSentence(sentences);
    if (!primary) return null;

    const scaled = getScaledDamageDice(text, Number(player.level) || 1);
    const sourceExpression = scaled || extractPrimaryDiceExpression(primary);
    const terms = parseDiceTerms(sourceExpression);
    if (!terms.length) return null;

    const bonus = parseActionRollBonus(player, primary);
    const kind = classifyActionRollKind(primary);
    return {
      kind,
      sourceId: card && card.id,
      diceTerms: terms,
      bonus: bonus.value,
      bonusLabel: bonus.label,
      damageType: kind === 'damage' ? getDamageTypesFromSentence(primary).join('/') : '',
      formula: formatDiceFormula(terms, bonus.value),
    };
  }

  function hasActionTag(card, tag) {
    const expected = normalizeName(tag);
    return (card && Array.isArray(card.tags) ? card.tags : []).some(value => normalizeName(value) === expected);
  }

  function findPrimaryRollSentence(sentences) {
    return (sentences || []).find(sentence => {
      const text = normalizeName(sentence);
      return /\d+d\d+/i.test(sentence)
        && /\b(damage|hit points?|heal|healing)\b/.test(text)
        && /\b(take|takes|deal|deals|regain|regains|restore|restores|heal|heals|reduce|reduces)\b/.test(text)
        && !/\b(?:damage|hit points?)\s+increases?\s+to\b/.test(text);
    }) || (sentences || []).find(sentence => /\d+d\d+/i.test(sentence) && /\b(damage|hit points?|heal|healing)\b/i.test(sentence));
  }

  function extractPrimaryDiceExpression(sentence) {
    const dice = String(sentence || '').match(/\d+d\d+/gi) || [];
    return dice.join(' + ');
  }

  function getScaledDamageDice(text, level) {
    const entries = [];
    const direct = /(\d+d\d+)\s+at\s+(\d+)(?:st|nd|rd|th)?(?:\s+level)?/gi;
    let match;
    while ((match = direct.exec(text))) {
      entries.push({ dice: match[1], level: Number(match[2]) || 0 });
    }
    const reach = /reach\s+(\d+)(?:st|nd|rd|th)?\s+level[^.]{0,120}?increases?\s+to\s+(\d+d\d+)/gi;
    while ((match = reach.exec(text))) {
      entries.push({ dice: match[2], level: Number(match[1]) || 0 });
    }
    const available = entries
      .filter(entry => entry.level && level >= entry.level)
      .sort((a, b) => b.level - a.level);
    return available[0] ? available[0].dice : '';
  }

  function parseActionRollBonus(player, sentence) {
    const out = { value: 0, label: '' };
    const numeric = String(sentence || '').match(/\d+d\d+\s*\+\s*(\d+)\b/i);
    if (numeric) {
      out.value += Number(numeric[1]) || 0;
      out.label = 'Flat bonus';
    }

    const modifier = String(sentence || '').match(/\+\s*your\s+([A-Za-z]+|spellcasting ability)\s+(?:ability\s+)?modifier\b/i);
    if (modifier) {
      const ability = normalizeActionFormulaAbility(modifier[1], player);
      if (ability) {
        const value = calculateModifier(Number(player.abilities && player.abilities[ability]) || 10);
        out.value += value;
        out.label = `${ABILITY_NAMES[ability] || ability.toUpperCase()} modifier`;
      }
    }

    const classLevel = String(sentence || '').match(/\+\s*your\s+([A-Za-z]+)\s+level\b/i);
    if (classLevel) {
      const level = getPlayerClassLevel(player, classLevel[1]) || Number(player.level) || 0;
      out.value += level;
      out.label = `${titleCase(classLevel[1])} level`;
    }

    return out;
  }

  function getPlayerClassLevel(player, className) {
    const target = normalizeName(className);
    const levels = Array.isArray(player && player.classLevels) ? player.classLevels : [];
    const matched = levels.find(entry => normalizeName(entry.className || entry.classId) === target || normalizeName(entry.classId || '').includes(target));
    return matched ? Number(matched.level) || 0 : 0;
  }

  function classifyActionRollKind(sentence) {
    const text = normalizeName(sentence);
    if (/\b(regain|regains|restore|restores|heal|heals|healing|hit points)\b/.test(text) && !/\bdamage\b/.test(text)) return 'healing';
    if (/\breduce|reduces|reduced\b/.test(text) && /\bdamage\b/.test(text)) return 'reduction';
    return 'damage';
  }

  function getDamageTypesFromSentence(sentence) {
    const types = [];
    const pattern = /\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s+damage\b/gi;
    let match;
    while ((match = pattern.exec(sentence))) types.push(match[1].toLowerCase());
    return uniqueStrings(types);
  }

  function getActionRollMathParts(profile) {
    if (!profile) return [];
    return [
      { label: `${capitalize(profile.kind)} roll`, display: `${profile.formula}${profile.damageType ? ` ${profile.damageType}` : ''}` },
      profile.bonus ? { label: profile.bonusLabel || 'Bonus', value: profile.bonus } : null,
    ].filter(Boolean);
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
        detail: formatWeaponActionDetail(weapon),
        fullDetail: formatWeaponActionDetail(weapon),
        detailHtml: renderWeaponActionDetailPanel(item, player),
        tags,
        controls: renderWeaponActionControls(item, player),
        math: [
          ...weapon.attackParts.map(part => ({ label: `Hit: ${part.label}`, value: part.value, display: part.display })),
          ...weapon.damageParts.map(part => ({ label: `Damage: ${part.label}`, value: part.value, display: part.display || (part.value === null ? weapon.damage : '') })),
        ].filter(part => part.display || part.value !== null && part.value !== undefined || part.label.includes('Damage: Damage die')),
      };
    });
  }

  function formatWeaponActionDetail(weapon) {
    const parts = [
      `${ABILITY_NAMES[weapon.ability] || weapon.abilityLabel} attack with ${formatBonus(weapon.attackBonus)} to hit; ${weapon.damageFormula} ${weapon.damageType} on hit.`,
    ];
    for (const effect of weapon.onHitEffects || []) {
      const text = cleanRulesText(effect.text || '');
      if (text) parts.push(`${effect.label || 'On hit'}: ${text}`);
    }
    return parts.join(' ');
  }

  function renderWeaponActionDetailPanel(item, player) {
    const weapon = item && item.weapon;
    if (!weapon) return '';
    const rows = [
      ['Attack Bonus', formatBonus(weapon.attackBonus)],
      ['Damage', `${weapon.damageFormula} ${weapon.damageType}`],
      ['Ability', weapon.abilityLabel],
      ['Base Weapon', weapon.baseName],
      ['Properties', weapon.properties.join(', ')],
    ].filter(([, value]) => value);
    return `<section class="combat-action-detail-section">
      <h3>Attack</h3>
      <dl class="equipment-detail-grid">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
      ${renderActionDetailText(formatWeaponActionDetail(weapon))}
      ${weapon.onHitEffects && weapon.onHitEffects.length ? `<div class="combat-action-detail-text">${weapon.onHitEffects.map(effect => `<p><strong>${escapeHtml(effect.label || 'On hit')}:</strong> ${escapeHtml(cleanRulesText(effect.text || ''))}</p>`).join('')}</div>` : ''}
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
    </section>
    ${item.details ? `<section class="combat-action-detail-section"><h3>Item Rules</h3>${renderEquipmentDetails(item, player, { fullText: true })}</section>` : ''}`;
  }

  function buildSpellActionCards(player, root) {
    const projected = getProjectedSpellActionKeys(player);
    return getSheetSpellDisplayNames(player, root).filter(name => {
      const spell = findSpellDetails(name, player, root);
      return shouldRenderSpellFallbackAction(player, name, spell, projected);
    }).map(name => {
      const spell = findSpellDetails(name, player, root);
      const math = getSpellMathParts(player, spell);
      return {
        id: `spell-fallback-${slugify(name)}`,
        group: classifySpellTiming(spell && spell.castingTime),
        sourceType: 'spell',
        type: 'Spell',
        title: `Cast ${name}`,
        meta: formatSpellMeta(spell),
        detail: summarizeSpellAction(player, spell),
        fullDetail: spell ? cleanRulesText([spell.text, spell.higherLevels ? `At Higher Levels: ${spell.higherLevels}` : ''].filter(Boolean).join('\n\n')) : '',
        detailHtml: spell ? renderSpellDetails(spell, player) : '',
        tags: buildSpellTags(player, spell),
        controls: renderSpellActionControls(player, spell, name),
        math,
      };
    });
  }

  function buildProjectedSpellActionCards(player, root) {
    return (Array.isArray(player && player.ruleActions) ? player.ruleActions : [])
      .filter(action => normalizeName(action && action.sourceType) === 'spell')
      .map(action => {
        const spell = findSpellDetailsByIdOrName(action.sourceId || action.spellId || action.title || action.name, player, root);
        const spellName = spell && spell.name || cleanDetailValue(action.title || action.name).replace(/^Cast\s+/i, '') || action.sourceId || 'Spell';
        const math = getSpellMathParts(player, spell);
        return {
          id: action.id || `spell-projected-${slugify(action.sourceId || spellName)}`,
          group: normalizeRuleActionGroup(action) || classifySpellTiming(spell && spell.castingTime),
          sourceType: 'spell',
          type: action.type || 'Spell',
          title: /^cast\s+/i.test(action.title || '') ? action.title : `Cast ${spellName}`,
          meta: [formatSpellMeta(spell), action.className, action.subclassName, action.raceName].filter(Boolean).join(' / '),
          detail: getRuleActionDetail(player, action) || summarizeSpellAction(player, spell),
          fullDetail: spell ? cleanRulesText([spell.text, spell.higherLevels ? `At Higher Levels: ${spell.higherLevels}` : ''].filter(Boolean).join('\n\n')) : getRuleActionFullDetail(player, action),
          detailHtml: spell ? renderSpellDetails(spell, player) : '',
          tags: buildSpellTags(player, spell),
          controls: renderSpellActionControls(player, spell, spellName),
          math,
        };
      });
  }

  function getProjectedSpellActionKeys(player) {
    const keys = new Set();
    (Array.isArray(player && player.ruleActions) ? player.ruleActions : [])
      .filter(action => normalizeName(action && action.sourceType) === 'spell')
      .forEach(action => {
        [action.sourceId, action.spellId, action.title, action.name].forEach(value => {
          const clean = normalizeName(String(value || '').replace(/^cast\s+/i, ''));
          if (clean) keys.add(clean);
        });
      });
    return keys;
  }

  function shouldRenderSpellFallbackAction(player, name, spell, projectedKeys) {
    const keys = [name, spell && spell.name, spell && spell.id].map(normalizeName).filter(Boolean);
    if (keys.some(key => projectedKeys && projectedKeys.has(key))) return false;
    const metadata = getSpellMetadata(player, name, spell);
    if (isGrantedLockedSpell(metadata) && !metadata.manual) return false;
    return true;
  }

  function renderSpellActionControls(player, spell, spellName) {
    if (!spell) {
      return `<div class="action-controls">
        <button class="roll-button" type="button" data-cast-spell="${escapeAttr(spellName)}" disabled>Cast</button>
        <span class="use-status">Rules missing</span>
      </div>`;
    }
    const featureCast = getFeatureCastSpellGrantState(player, spellName, spell);
    const slot = getSpellSlotState(player, spell);
    const featureAvailable = featureCast && featureCast.state && featureCast.state.available > 0;
    const slotAvailable = slot && (slot.level === 0 || slot.available > 0);
    const disabled = slot && slot.level > 0 && !featureAvailable && !slotAvailable;
    const rollProfile = getSpellRollProfile(player, spell, slot && slot.level);
    const controls = [
      renderSpellSlotChoiceSelect(player, spell, spellName),
      `<button class="roll-button" type="button" data-cast-spell="${escapeAttr(spellName)}" ${disabled ? 'disabled' : ''}>Cast</button>`,
      rollProfile ? `<button class="roll-button" type="button" data-roll-spell="${escapeAttr(spellName)}">${escapeHtml(formatSpellRollButtonLabel(rollProfile))}</button>` : '',
    ].filter(Boolean);
    if (featureCast && featureCast.state) controls.push(`<span class="use-status">${escapeHtml(formatSpellFeatureCastStatus(featureCast, slot))}</span>`);
    else if (slot) controls.push(`<span class="use-status">${escapeHtml(formatSpellSlotStatus(slot))}</span>`);
    return `<div class="action-controls">${controls.join('')}</div>`;
  }

  function buildSpellScrollActionCards(player, root) {
    return (player.spellScrolls || []).map(scroll => {
      const spell = findSpellDetails(scroll.spellName, player, root);
      const group = classifySpellTiming(scroll.castingTime || (spell && spell.castingTime));
      const castLevel = getSpellLevelNumber(scroll.level) || getSpellLevelNumber(spell && spell.level) || null;
      return {
        group,
        sourceType: 'spell',
        type: 'Scroll',
        title: `Use Scroll: ${scroll.spellName}`,
        meta: [scroll.source || scroll.scrollName || 'Spell Scroll', formatSpellMeta(spell)].filter(Boolean).join(' / '),
        detail: summarizeScrollAction(scroll, spell),
        fullDetail: spell ? cleanRulesText([spell.text, spell.higherLevels ? `At Higher Levels: ${spell.higherLevels}` : '', scroll.text ? `Scroll: ${scroll.text}` : ''].filter(Boolean).join('\n\n')) : cleanRulesText(scroll.text || ''),
        detailHtml: spell ? `${renderSpellDetails(spell, player, castLevel)}${scroll.text ? `<p class="item-rules"><strong>Scroll:</strong> ${escapeHtml(cleanRulesText(scroll.text))}</p>` : ''}` : '',
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

  function buildRuleActionCards(player, root = null) {
    return getRuntimeRuleActions(player, root)
      .filter(action => !isResourceContainerRuleAction(action))
      .filter(action => action.sourceType !== 'spell' && action.sourceType !== 'item')
      .map(action => {
        const resourceId = getRuleActionResourceId(player, action);
        const detail = getRuleActionDetail(player, action);
        const fullDetail = getRuleActionFullDetail(player, action);
        return {
          id: action.id || action.sourceId || slugify(action.title || action.name || 'rule-action'),
          group: normalizeRuleActionGroup(action),
          sourceType: action.sourceType || 'rule',
          type: action.type || action.sourceType || 'Rule',
          title: action.title || action.name || 'Action',
          meta: [action.sourceType, action.className, action.itemName].filter(Boolean).join(' / '),
          detail,
          fullDetail,
          tags: Array.isArray(action.tags) ? action.tags.filter(Boolean).slice(0, 5) : [],
          resourceId,
          save: action.save,
          saveAbility: action.saveAbility,
          saveDc: action.saveDc,
          saveSource: action.saveSource,
          saveBase: action.saveBase,
          saveFormulaAbility: action.saveFormulaAbility,
          controls: renderRuleActionControls(player, action, resourceId),
        };
      });
  }

  function isResourceContainerRuleAction(action) {
    const title = normalizeName(action && (action.title || action.name));
    const detail = normalizeName(action && (action.detail || action.text));
    if (title === 'ki' && detail.includes('ki points')) return true;
    return false;
  }

  function getRuntimeRuleActions(player, root = null) {
    const features = getRuntimeRuleFeatures(player, root);
    const featureIds = new Set(features.map(feature => feature.id).filter(Boolean));
    const records = [
      ...(Array.isArray(player && player.ruleActions) ? player.ruleActions : []),
      ...getCatalogFeatureActions(root, featureIds),
      ...features.map(featureToRuntimeAction).filter(Boolean),
    ];
    const seen = new Set();
    const out = [];
    for (const record of records) {
      const key = normalizeName(record && (record.id || `${record.sourceId || ''} ${record.title || record.name || ''} ${record.group || ''}`));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(record);
    }
    return out;
  }

  function getCatalogFeatureActions(root, featureIds) {
    if (!featureIds || !featureIds.size) return [];
    const catalog = root && Array.isArray(root._actionCatalog) ? root._actionCatalog : [];
    return catalog.filter(action => featureIds.has(action && action.sourceId));
  }

  function featureToRuntimeAction(feature) {
    if (!feature || !feature.id || !feature.text) return null;
    const group = normalizeActionGroup(feature.timing);
    if (group === 'Free / Utility' && normalizeName(feature.timing) === 'passive') return null;
    return {
      id: `feature-${feature.id}`,
      sourceType: feature.kind || 'class',
      sourceId: feature.id,
      title: feature.name,
      group,
      detail: feature.text,
      fullDetail: feature.text,
      tags: [feature.subclassName || feature.className || feature.raceName, feature.level ? `Level ${feature.level}` : ''].filter(Boolean),
    };
  }

  function renderRuleActionControls(player, action, resourceId) {
    const controls = [];
    const state = getResourceUseState(player, resourceId);
    if (state && state.max !== null) {
      controls.push(renderResourceSpendButton(resourceId, 'Use', state.available <= 0));
      controls.push(`<span class="use-status">${escapeHtml(`${state.available} / ${state.max} left`)}</span>`);
    }
    const rollButton = renderRuleActionRollButton(action);
    if (rollButton) controls.push(rollButton);
    return controls.length ? `<div class="action-controls">${controls.join('')}</div>` : '';
  }

  function renderRuleActionRollButton(action) {
    return renderFeatureRollButton({
      id: action && (action.sourceId || action.id),
      name: action && (action.title || action.name),
    });
  }

  function renderFeatureRollButton(feature) {
    const title = normalizeName(feature && feature.name);
    if (title === 'second wind') {
      return `<button class="roll-button" type="button" data-roll-feature="${escapeAttr(feature.id || '')}">Roll Heal</button>`;
    }
    return '';
  }

  function getRuleActionDetail(player, action) {
    return summarizeActionText(getRuleActionFullDetail(player, action), 720);
  }

  function getRuleActionFullDetail(player, action) {
    const detail = cleanRulesText(action && (action.detail || action.text));
    const feature = findRuleFeatureForAction(player, action);
    const ruleDetail = feature || findRuleDetailForAction(player, action);
    const featureText = cleanRulesText(ruleDetail && (ruleDetail.featureText || ruleDetail.text));
    return featureText && featureText.length > detail.length ? featureText : detail;
  }

  function findRuleFeatureForAction(player, action) {
    if (!player || !action) return null;
    const features = player.ruleFeatures || [];
    return features.find(feature => feature.id && feature.id === action.sourceId)
      || features.find(feature => normalizeName(feature.name) === normalizeName(action.title));
  }

  function findRuleDetailForAction(player, action) {
    if (!player || !action) return null;
    const sourceId = normalizeName(action.sourceId || action.id);
    const title = normalizeName(action.title || action.name);
    const details = [
      ...(player.featDetails || []),
      ...(player.backgroundDetails || []),
    ];
    return details.find(detail => sourceId && normalizeName(detail.id) === sourceId)
      || details.find(detail => title && normalizeName(detail.name) === title)
      || null;
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

  function normalizeItemActionGroup(action) {
    const current = normalizeActionGroup(action && action.group);
    const inferred = classifyRulesTiming(`${action && (action.title || action.name) || ''} ${action && (action.detail || action.text) || ''}`);
    if (['Action', 'Bonus Action', 'Reaction', 'Triggered'].includes(inferred)) return inferred;
    if (current === 'Free / Utility' && inferred === 'Out of Combat') return inferred;
    return current;
  }

  function getRuleActionResourceId(player, action) {
    if (!action) return '';
    if (action.resourceId && findPlayerResource(player, action.resourceId)) return action.resourceId;
    if (findPlayerResource(player, action.id)) return action.id;
    if (findPlayerResource(player, action.sourceId)) return action.sourceId;
    const bySource = uniqueRuleRecords(player && player.resources || []).find(resource => resource.sourceId && resource.sourceId === action.sourceId);
    if (bySource) return bySource.id;
    const titleId = slugify(action.title || action.name || '');
    if (findPlayerResource(player, titleId)) return titleId;
    const text = normalizeName(`${action.title || ''} ${action.detail || ''} ${Array.isArray(action.tags) ? action.tags.join(' ') : ''}`);
    if (text.includes('channel divinity') && findPlayerResource(player, 'cleric-channel-divinity')) return 'cleric-channel-divinity';
    if (/\bki\b|ki point/.test(text) && findPlayerResource(player, 'monk-ki')) return 'monk-ki';
    if (text.includes('bardic inspiration') && findPlayerResource(player, 'bardic-inspiration')) return 'bardic-inspiration';
    if (text.includes('wild shape') && findPlayerResource(player, 'druid-wild-shape')) return 'druid-wild-shape';
    if (text.includes('action surge') && findPlayerResource(player, 'action-surge')) return 'action-surge';
    if (text.includes('second wind') && findPlayerResource(player, 'second-wind')) return 'second-wind';
    if (text.includes('breath weapon') && findPlayerResource(player, 'race-dragonborn-breath-weapon-phb')) return 'race-dragonborn-breath-weapon-phb';
    if (text.includes('healing hands') && findPlayerResource(player, 'race-aasimar-healing-hands-vgm')) return 'race-aasimar-healing-hands-vgm';
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
        fullDetail: level >= 5
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
        fullDetail: 'When an undead of CR 1/2 or lower fails Claire\'s Turn Undead save, it is destroyed instead of only turned.',
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
        fullDetail: 'When a creature within 5 ft hits Claire, she can force a Dexterity save; failed save takes 2d8 lightning or thunder, success takes half.',
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
          fullDetail: 'When Claire rolls lightning or thunder damage, she can spend Channel Divinity to deal maximum damage instead of rolling.',
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
          fullDetail: 'When Claire deals lightning damage to a Large or smaller creature, she can push it up to 10 ft away.',
          tags: ['Lightning', 'Push 10 ft'],
        });
      }
    }

    return cards;
  }

  function buildItemActionCards(player, root = null) {
    return (player.inventory || []).flatMap(item => {
      const isEquipped = isItemEquipped(player, item);
      const actions = getItemActionRecords(player, item, root);
      const renderedActions = new Set(actions.map(action => normalizeName(action.title || action.name || action.id)));
      const cards = actions.map(action => ({
        id: action.id,
        resourceId: action.resourceId || action.id,
        group: normalizeItemActionGroup(action),
        sourceType: 'item',
        type: action.type || 'Item',
        title: action.title || action.name || item.name,
        meta: [item.name, formatItemSubtitle(item)].filter(Boolean).join(' / '),
        detail: summarizeActionText(action.detail || action.text || '', 720),
        fullDetail: cleanRulesText(action.detail || action.text || ''),
        detailHtml: item.details ? renderEquipmentDetails(item, player, { fullText: true }) : '',
        tags: [isEquipped ? 'Equipped' : 'Inventory', item.details && item.details.attunement ? 'Attunement' : '', ...(action.tags || [])].filter(Boolean),
        save: action.save,
        saveAbility: action.saveAbility,
        saveDc: action.saveDc,
        saveSource: action.saveSource,
        saveBase: action.saveBase,
        saveFormulaAbility: action.saveFormulaAbility,
        roll: action.roll,
        rollable: action.rollable,
        controls: renderActionResourceControls(player, action.resourceId || action.id),
      }));
      cards.push(...(item.abilities || [])
        .filter(text => isActionableItemAbility(text))
        .filter(text => {
          const normalized = normalizeName(text);
          return ![...renderedActions].some(name => name && normalized.startsWith(name));
        })
        .map(text => {
          const ability = parseItemAbilityText(text);
          return {
            group: classifyRulesTiming(text),
            sourceType: 'item',
            type: 'Item',
            title: ability.name || item.name,
            meta: [item.name, formatItemSubtitle(item)].filter(Boolean).join(' / '),
            detail: summarizeActionText(ability.detail || text, 720),
            fullDetail: cleanRulesText(ability.detail || text),
            detailHtml: item.details ? renderEquipmentDetails(item, player, { fullText: true }) : '',
            tags: [isEquipped ? 'Equipped' : 'Inventory', item.details && item.details.attunement ? 'Attunement' : ''].filter(Boolean),
          };
        }));
      return cards;
    });
  }

  function getItemActionRecords(player, item, root = null) {
    const records = [
      ...((item.details && Array.isArray(item.details.actions)) ? item.details.actions : []),
      ...getPlayerRuleItemActions(player, item),
      ...getCatalogItemActions(root, item),
    ];
    const seen = new Set();
    const out = [];
    for (const action of records) {
      const clean = normalizeItemActionRecord(action, item);
      const key = normalizeName(clean.id || `${clean.group} ${clean.title} ${clean.detail}`);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
    }
    return out;
  }

  function getPlayerRuleItemActions(player, item) {
    return (Array.isArray(player && player.ruleActions) ? player.ruleActions : [])
      .filter(isItemEquivalentAction)
      .filter(action => isActionForInventoryItem(action, item));
  }

  function getCatalogItemActions(root, item) {
    const catalog = root && Array.isArray(root._actionCatalog) ? root._actionCatalog : [];
    return catalog
      .filter(isItemEquivalentAction)
      .filter(action => isActionForInventoryItem(action, item));
  }

  function isActionForInventoryItem(action, item) {
    if (!action || !item) return false;
    if (!isItemEquivalentAction(action)) return false;
    const sourceType = normalizeName(action.sourceType || action.type);
    const actionItemNames = [
      action.itemName,
      action.item,
      action.sourceName,
      action.parentName,
      action.sourceId,
    ].map(normalizeName).filter(Boolean);
    const itemNames = getInventoryItemLookupNames(item);
    if (!actionItemNames.length) return sourceType === 'item' && itemNames.some(name => normalizeName(action.title || action.name || '').includes(name));
    return actionItemNames.some(name => itemNames.includes(name));
  }

  function isItemEquivalentAction(action) {
    const sourceType = normalizeName(action && action.sourceType);
    const type = normalizeName(action && action.type);
    const itemTypes = new Set(['item', 'equipment', 'gear', 'weapon', 'armor', 'shield']);
    if (sourceType) return itemTypes.has(sourceType);
    return itemTypes.has(type);
  }

  function getInventoryItemLookupNames(item) {
    return [...new Set([
      ...getItemLookupNames(item && item.name),
      item && item.id,
      item && item.details && item.details.id,
      item && item.details && item.details.name,
    ].map(normalizeName).filter(Boolean))];
  }

  function normalizeItemActionRecord(action, item) {
    return {
      id: cleanDetailValue(action && (action.id || action.resourceId)) || slugify(`${item && item.name || 'item'}-${action && (action.title || action.name) || 'action'}`),
      resourceId: cleanDetailValue(action && action.resourceId),
      group: cleanDetailValue(action && action.group),
      type: cleanDetailValue(action && action.type) || 'Item',
      title: cleanDetailValue(action && (action.title || action.name)) || (item && item.name) || 'Item Action',
      detail: cleanRulesText(action && (action.detail || action.text)),
      tags: Array.isArray(action && action.tags) ? action.tags.map(cleanDetailValue).filter(Boolean) : [],
      save: action && action.save && typeof action.save === 'object' && !Array.isArray(action.save) ? { ...action.save } : null,
      saveAbility: cleanDetailValue(action && action.saveAbility),
      saveDc: action && action.saveDc !== undefined ? action.saveDc : '',
      saveSource: cleanDetailValue(action && action.saveSource),
      saveBase: action && action.saveBase !== undefined ? action.saveBase : '',
      saveFormulaAbility: cleanDetailValue(action && action.saveFormulaAbility),
      roll: action && action.roll,
      rollable: action && action.rollable,
    };
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
    const ability = resolveSpellcastingAbility(player);
    if (!ability) return null;
    return 8 + calculateModifier(Number(player.abilities && player.abilities[ability]) || 10) + (Number(player.proficiencyBonus) || 0);
  }

  function calculateSpellAttack(player) {
    const ability = resolveSpellcastingAbility(player);
    if (!ability) return null;
    return calculateModifier(Number(player.abilities && player.abilities[ability]) || 10) + (Number(player.proficiencyBonus) || 0);
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
    return { group, sourceType: 'core', type, title, detail, fullDetail: detail, tags: [] };
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
    if (/\b(on a hit|when you hit|when you damage|whenever you hit|when you score a critical hit)\b/.test(normalized)) return 'Triggered';
    if (normalized.includes('short rest') || normalized.includes('long rest') || normalized.includes('minute') || normalized.includes('hour')) return 'Out of Combat';
    return 'Free / Utility';
  }

  function hasBonusActionTiming(clean) {
    return /\b(as a bonus action|use a bonus action|use your bonus action|uses a bonus action|bonus action to|take a bonus action)\b/.test(clean)
      || /\bbonus action\s+(?:\d+|pb|proficiency|at will|once|per|short|long|recharge|charges?)\b/.test(clean)
      || clean === 'bonus action'
      || clean === '1 bonus action';
  }

  function hasActionTiming(clean) {
    return /\b(as an action|use an action|use your action|uses an action|spend an action|take an action|you can take the action|action to|requires an action|requires your action)\b/.test(clean)
      || /\baction\s+(?:\d+|pb|proficiency|at will|once|per|short|long|recharge|charges?)\b/.test(clean)
      || clean === 'action'
      || clean === '1 action';
  }

  function hasReactionTiming(clean) {
    return /\b(as a reaction|use a reaction|use your reaction|uses its reaction|using your reaction|spend your reaction|take a reaction|reaction to)\b/.test(clean)
      || /\breaction\s+(?:\d+|pb|proficiency|at will|once|per|short|long|recharge|charges?)\b/.test(clean)
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

  function getFeatureCastSpellGrantState(player, spellName, spell = null) {
    const grant = getFeatureCastSpellGrant(player, spellName, spell);
    if (!grant) return null;
    const resourceId = grant.resourceId || grant.sourceFeatureId || '';
    const state = resourceId ? getResourceUseState(player, resourceId) : null;
    return state ? { grant, state } : null;
  }

  function getFeatureCastSpellGrant(player, spellName, spell = null) {
    const targets = [spellName, spell && spell.name, spell && spell.id].map(normalizeName).filter(Boolean);
    if (!targets.length) return null;
    return (Array.isArray(player && player.spellGrantDetails) ? player.spellGrantDetails : []).find(grant => {
      if (!grant || grant.listAddition) return false;
      const mode = normalizeName(grant.grantMode || '');
      if (!grant.featureCast && mode !== 'feature cast' && mode !== 'feature-cast') return false;
      if (!grant.uses && !grant.resourceId && !grant.sourceFeatureId) return false;
      const keys = [grant.spellId, grant.name, grant.spellName].map(normalizeName).filter(Boolean);
      return keys.some(key => targets.includes(key));
    }) || null;
  }

  function formatSpellFeatureCastStatus(featureCast, slot = null) {
    const state = featureCast && featureCast.state;
    if (!state) return slot ? formatSpellSlotStatus(slot) : '';
    const reset = state.resource && state.resource.reset ? `; resets ${formatReset(state.resource.reset)}` : '';
    const slotText = featureCast.grant && featureCast.grant.canUseSpellSlots && slot && slot.level > 0 ? `; slots ${formatSpellSlotStatus(slot)}` : '';
    return `${state.available} / ${state.max} ${state.resource.name || state.resource.id}${reset}${slotText}`;
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
      ${renderItemChargeTracker(player)}
      ${renderDefenseTracker(player)}
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

  function renderDefenseTracker(player) {
    const groups = getDefenseGroups(player);
    return `<section>
      <h2>Defenses</h2>
      ${groups.length ? groups.map(group => `<div class="defense-block">
        <h3>${escapeHtml(group.label)}</h3>
        <div class="defense-chip-list">${group.entries.map(entry => `<span>${escapeHtml(formatDefenseEntry(entry))}</span>`).join('')}</div>
      </div>`).join('') : '<p class="empty-note">No resistances, vulnerabilities, or immunities recorded.</p>'}
    </section>`;
  }

  function renderItemChargeTracker(player) {
    const entries = Object.entries(player.itemCharges || {}).filter(([, value]) => Number.isFinite(Number(value)));
    if (!entries.length) return '';
    return `<section>
      <h2>Item Charges</h2>
      <div class="resource-list">
        ${entries.map(([key, value]) => `<div class="resource-row"><span><strong>${escapeHtml(formatChargeKey(key))}</strong><small>${escapeHtml(String(value))} charge${Number(value) === 1 ? '' : 's'} recorded</small></span></div>`).join('')}
      </div>
    </section>`;
  }

  function formatChargeKey(key) {
    const item = (rootlessPlayerCatalogItemName(key) || key);
    return item.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  function rootlessPlayerCatalogItemName(key) {
    return String(key || '').trim();
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
    const records = resources.map(resource => {
      const max = evaluateResourceMax(resource, player);
      const used = max === null ? null : clampNumber(Number(player.resourceUses && player.resourceUses[resource.id]) || 0, 0, max);
      const reset = formatReset(resource.reset);
      const source = formatResourceSource(resource) || 'General';
      return { resource, max, used, reset, source };
    });
    return `${renderResourceOverview(records)}
      <div class="resource-groups">${groupResourceRecords(records).map(group => `<section class="resource-group">
        <div class="resource-group-heading">
          <h3>${escapeHtml(group.label)}</h3>
          <span>${escapeHtml(`${group.records.length} resource${group.records.length === 1 ? '' : 's'}`)}</span>
        </div>
        <div class="resource-list">${group.records.map(record => renderResourceRow(record.resource, player, record.max, record.used)).join('')}</div>
      </section>`).join('')}</div>`;
  }

  function renderResourceOverview(records) {
    const tracked = (records || []).filter(record => record.max !== null);
    const available = tracked.reduce((sum, record) => sum + Math.max(0, Number(record.max) - Number(record.used || 0)), 0);
    const manual = (records || []).length - tracked.length;
    const shortRest = records.filter(record => normalizeName(record.reset).includes('short rest')).length;
    const longRest = records.filter(record => normalizeName(record.reset).includes('long rest')).length;
    return `<div class="resource-overview" aria-label="Resource overview">
      <div><span>Available</span><strong>${escapeHtml(String(available))}</strong></div>
      <div><span>Short Rest</span><strong>${escapeHtml(String(shortRest))}</strong></div>
      <div><span>Long Rest</span><strong>${escapeHtml(String(longRest))}</strong></div>
      <div><span>Manual</span><strong>${escapeHtml(String(manual))}</strong></div>
    </div>`;
  }

  function groupResourceRecords(records) {
    const groups = new Map();
    for (const record of records || []) {
      const label = titleCase(record.reset || 'manual');
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(record);
    }
    return Array.from(groups.entries())
      .map(([label, groupRecords]) => ({ label, records: groupRecords.sort((a, b) => compareText(a.resource.name, b.resource.name)) }))
      .sort((a, b) => resourceGroupSort(a.label) - resourceGroupSort(b.label) || compareText(a.label, b.label));
  }

  function resourceGroupSort(label) {
    const clean = normalizeName(label);
    if (clean.includes('short rest')) return 1;
    if (clean.includes('long rest')) return 2;
    if (clean.includes('dawn')) return 3;
    if (clean.includes('manual')) return 9;
    return 5;
  }

  function renderResourceRow(resource, player, max = evaluateResourceMax(resource, player), used = null) {
    const currentUsed = max === null ? null : used === null ? clampNumber(Number(player.resourceUses && player.resourceUses[resource.id]) || 0, 0, max) : used;
    return `<div class="resource-row">
        <span>
          <strong>${escapeHtml(resource.name || resource.id)}</strong>
          <small>${escapeHtml(formatResourceLine(resource, max, currentUsed))}</small>
        </span>
        ${max === null ? '<span class="empty-note">Manual</span>' : `<span class="resource-controls">
          <input type="number" min="0" max="${max}" value="${currentUsed}" data-resource-use="${escapeAttr(resource.id)}" aria-label="${escapeAttr(resource.name || resource.id)} used">
          ${renderResourceSpendButton(resource.id, 'Use', currentUsed >= max)}
        </span>`}
      </div>`;
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
    const ui = getEquipmentUiState(root, player);
    root._equipmentUi = ui;
    const containers = getEquipmentContainers(player);
    target.innerHTML = `<div class="equipment-manager">
      <div class="manager-toolbar">
        <div>
          <h2>Gear</h2>
          <p data-equipment-summary>${escapeHtml(formatEquipmentSummary(player, ui))}</p>
        </div>
        <button class="icon-button" type="button" data-open-equipment-search aria-label="Add equipment" title="Add equipment">+</button>
      </div>
      <div class="equipment-controls">
        <label class="equipment-control-field equipment-search-field">
          <span>Find</span>
          <input data-equipment-filter type="search" value="${escapeAttr(ui.query)}" placeholder="Name, type, rules text..." aria-label="Filter gear">
        </label>
        <label class="equipment-control-field">
          <span>Kind</span>
          <select data-equipment-kind-filter aria-label="Filter gear kind">
            ${renderEquipmentKindOptions(ui.kind)}
          </select>
        </label>
        <label class="equipment-control-field">
          <span>Place</span>
          <select data-equipment-container-filter aria-label="Filter gear container">
            ${renderEquipmentContainerFilterOptions(containers, ui.container)}
          </select>
        </label>
        <label class="equipment-control-field">
          <span>Sort</span>
          <select data-equipment-sort aria-label="Sort gear">
            ${renderEquipmentSortOptions(ui.sort)}
          </select>
        </label>
        <label class="equipment-toggle-field">
          <input data-equipment-grouped type="checkbox" ${ui.grouped ? 'checked' : ''}>
          <span>Group</span>
        </label>
        <form class="equipment-container-form" data-equipment-container-form>
          <input data-equipment-new-container name="containerName" type="text" maxlength="48" placeholder="New backpack or pouch" aria-label="New container name">
          <button class="text-button" type="submit">Add</button>
        </form>
      </div>
      <div class="equipment-list" data-equipment-list role="list">
        ${renderEquipmentList(player, ui)}
      </div>
      <dialog class="sheet-search-dialog" data-equipment-search-dialog aria-label="Add equipment">
        <div class="sheet-search-frame">
          <div class="sheet-search-head">
            <h2>Add Equipment</h2>
            <button class="text-button" type="button" data-close-dialog>Close</button>
          </div>
          <input data-equipment-search-input type="search" placeholder="Search items by name, type, rarity, or rules text..." aria-label="Search equipment">
          ${renderEquipmentSearchFilters()}
          <div class="equipment-search-results" data-equipment-search-results></div>
        </div>
      </dialog>
      <dialog class="sheet-search-dialog" data-equipment-detail-dialog aria-label="Equipment details">
        <div class="sheet-search-frame" data-equipment-detail-content>
          <div class="sheet-search-head">
            <h2>Equipment Details</h2>
            <button class="text-button" type="button" data-close-dialog>Close</button>
          </div>
          <p class="empty-note">Choose an item to view its details.</p>
        </div>
      </dialog>
    </div>`;
    ensureItemCatalog(root);
    ensureStartingGearCatalogs(root);
  }

  function getEquipmentUiState(root, player = null) {
    const state = root && root._equipmentUi && typeof root._equipmentUi === 'object'
      ? root._equipmentUi
      : readEquipmentUiPreference(root, player);
    const kindValues = new Set(['all', 'equipped', 'weapon', 'armor', 'gear', 'attunement']);
    const sortValues = new Set(['sheet', 'name', 'kind', 'container', 'equipped']);
    return {
      query: cleanDetailValue(state.query).slice(0, 120),
      kind: kindValues.has(state.kind) ? state.kind : 'all',
      container: cleanEquipmentContainerFilter(state.container),
      sort: sortValues.has(state.sort) ? state.sort : 'sheet',
      grouped: Boolean(state.grouped),
    };
  }

  function getEquipmentUiStorageKey(root, player = null) {
    const id = cleanDetailValue(player && player.id)
      || cleanDetailValue(root && root.dataset && root.dataset.playerId)
      || cleanDetailValue(window.location && window.location.pathname);
    return id ? `${EQUIPMENT_UI_STORAGE_PREFIX}${id}` : '';
  }

  function readEquipmentUiPreference(root, player = null) {
    const key = getEquipmentUiStorageKey(root, player);
    if (!key) return {};
    try {
      const raw = window.localStorage && window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? { grouped: Boolean(parsed.grouped) } : {};
    } catch (error) {
      return {};
    }
  }

  function saveEquipmentUiPreference(root, player, ui) {
    const key = getEquipmentUiStorageKey(root, player);
    if (!key) return;
    try {
      window.localStorage && window.localStorage.setItem(key, JSON.stringify({ grouped: Boolean(ui && ui.grouped) }));
    } catch (error) {
      // localStorage can be blocked in private or embedded browser contexts.
    }
  }

  function readEquipmentUiState(root) {
    const current = getEquipmentUiState(root);
    const panel = root && root.querySelector('[data-equipment-panel]');
    if (!panel) return current;
    const filter = panel.querySelector('[data-equipment-filter]');
    const kind = panel.querySelector('[data-equipment-kind-filter]');
    const container = panel.querySelector('[data-equipment-container-filter]');
    const sort = panel.querySelector('[data-equipment-sort]');
    const grouped = panel.querySelector('[data-equipment-grouped]');
    return getEquipmentUiState({
      _equipmentUi: {
        query: filter ? filter.value : current.query,
        kind: kind ? kind.value : current.kind,
        container: container ? container.value : current.container,
        sort: sort ? sort.value : current.sort,
        grouped: grouped ? grouped.checked : current.grouped,
      },
    });
  }

  function updateEquipmentList(root) {
    const player = root && root._playerState;
    const list = root && root.querySelector('[data-equipment-list]');
    if (!player || !list) return;
    root._equipmentUi = readEquipmentUiState(root);
    saveEquipmentUiPreference(root, player, root._equipmentUi);
    list.innerHTML = renderEquipmentList(player, root._equipmentUi);
    const summary = root.querySelector('[data-equipment-summary]');
    if (summary) summary.textContent = formatEquipmentSummary(player, root._equipmentUi);
  }

  function formatEquipmentSummary(player, ui) {
    const total = player.inventory.length;
    const visible = getFilteredEquipmentItems(player, ui).length;
    const totalText = `${total} item${total === 1 ? '' : 's'} on this sheet`;
    if (!isEquipmentFiltered(ui) || visible === total) return totalText;
    return `${visible} of ${totalText}`;
  }

  function isEquipmentFiltered(ui) {
    const state = getEquipmentUiState({ _equipmentUi: ui || {} });
    return Boolean(state.query || state.kind !== 'all' || state.container !== 'all');
  }

  function renderEquipmentKindOptions(selected) {
    return [
      ['all', 'All'],
      ['equipped', 'Equipped'],
      ['weapon', 'Weapons'],
      ['armor', 'Armor'],
      ['gear', 'Gear'],
      ['attunement', 'Attunement'],
    ].map(([value, label]) => `<option value="${escapeAttr(value)}" ${selected === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
  }

  function renderEquipmentSortOptions(selected) {
    return [
      ['sheet', 'Sheet order'],
      ['name', 'Name'],
      ['kind', 'Kind'],
      ['container', 'Place'],
      ['equipped', 'Equipped'],
    ].map(([value, label]) => `<option value="${escapeAttr(value)}" ${selected === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
  }

  function renderEquipmentContainerFilterOptions(containers, selected) {
    return [
      ['all', 'All places'],
      [EQUIPMENT_UNASSIGNED_CONTAINER, 'Carried'],
      ...containers.map(container => [container.id, container.name]),
    ].map(([value, label]) => `<option value="${escapeAttr(value)}" ${selected === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
  }

  function renderEquipmentContainerOptions(containers, selected) {
    return [
      [EQUIPMENT_UNASSIGNED_CONTAINER, 'Carried'],
      ...containers.map(container => [container.id, container.name]),
    ].map(([value, label]) => `<option value="${escapeAttr(value)}" ${selected === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
  }

  function renderEquipmentList(player, ui) {
    const state = getEquipmentUiState({ _equipmentUi: ui || {} });
    const containers = getEquipmentContainers(player);
    const items = getFilteredEquipmentItems(player, state, containers);
    if (!player.inventory.length) return '<p class="empty-note">No gear recorded.</p>';
    if (!items.length) return '<p class="empty-note">No gear matches the current filters.</p>';
    if (!state.grouped) return items.map(item => renderEquipmentRow(item, player, containers)).join('');
    return renderEquipmentGroups(items, player, containers);
  }

  function renderEquipmentGroups(items, player, containers) {
    const groups = new Map();
    const orderedContainers = [
      { id: EQUIPMENT_UNASSIGNED_CONTAINER, name: 'Carried' },
      ...containers,
    ];
    for (const item of items) {
      const containerId = getItemContainerId(item, player, containers);
      if (!groups.has(containerId)) groups.set(containerId, []);
      groups.get(containerId).push(item);
    }
    return orderedContainers
      .filter(container => groups.has(container.id))
      .map(container => {
        const groupItems = groups.get(container.id);
        return `<section class="equipment-group">
          <div class="equipment-group-title">
            <h3>${escapeHtml(container.name)}</h3>
            <span>${escapeHtml(`${groupItems.length} item${groupItems.length === 1 ? '' : 's'}`)}</span>
          </div>
          <div class="equipment-group-list" role="list">
            ${groupItems.map(item => renderEquipmentRow(item, player, containers)).join('')}
          </div>
        </section>`;
      }).join('');
  }

  function getFilteredEquipmentItems(player, ui, containers = null) {
    const state = getEquipmentUiState({ _equipmentUi: ui || {} });
    const availableContainers = containers || getEquipmentContainers(player);
    const query = normalizeName(state.query);
    return [...(player.inventory || [])]
      .filter(item => !query || getEquipmentSearchText(item).includes(query))
      .filter(item => matchesEquipmentKind(item, player, state.kind))
      .filter(item => state.container === 'all' || getItemContainerId(item, player, availableContainers) === state.container)
      .sort((a, b) => compareEquipmentItems(a, b, player, state.sort, availableContainers));
  }

  function getEquipmentSearchText(item) {
    const details = item.details || {};
    return normalizeName([
      item.name,
      item.kind,
      formatItemSubtitle(item),
      formatItemStatline(item),
      details.type,
      details.rarity,
      details.attunement,
      details.source,
      details.text,
      ...(item.abilities || []),
    ].filter(Boolean).join(' '));
  }

  function matchesEquipmentKind(item, player, kind) {
    if (kind === 'all') return true;
    if (kind === 'equipped') return isItemEquipped(player, item);
    if (kind === 'weapon') return Boolean(item.weapon);
    if (kind === 'armor') return isArmorOrShieldItem(item);
    if (kind === 'gear') return !item.weapon && !isArmorOrShieldItem(item);
    if (kind === 'attunement') return Boolean(item.details && item.details.attunement);
    return true;
  }

  function compareEquipmentItems(a, b, player, sort, containers) {
    if (sort === 'name') return compareText(a.name, b.name) || compareNumber(a.sourceIndex, b.sourceIndex);
    if (sort === 'kind') return compareText(formatItemSubtitle(a), formatItemSubtitle(b)) || compareText(a.name, b.name);
    if (sort === 'container') return compareText(getItemContainerLabel(a, player, containers), getItemContainerLabel(b, player, containers)) || compareText(a.name, b.name);
    if (sort === 'equipped') return Number(isItemEquipped(player, b)) - Number(isItemEquipped(player, a)) || compareText(a.name, b.name);
    return compareNumber(a.sourceIndex, b.sourceIndex);
  }

  function compareText(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
  }

  function compareNumber(a, b) {
    return (Number(a) || 0) - (Number(b) || 0);
  }

  function getEquipmentOrganization(player) {
    const combatSource = player && player.combatToggles && typeof player.combatToggles === 'object'
      ? player.combatToggles[EQUIPMENT_ORGANIZATION_KEY]
      : null;
    const detailSource = player && player.itemDetails && typeof player.itemDetails === 'object'
      ? player.itemDetails.__equipmentOrganization
      : null;
    return normalizeEquipmentOrganization((player && player.equipmentOrganization) || combatSource || detailSource || {});
  }

  function normalizeEquipmentOrganization(value) {
    const source = value && typeof value === 'object' ? value : {};
    const containers = [];
    const seen = new Set();
    for (const container of Array.isArray(source.containers) ? source.containers : []) {
      const name = cleanEquipmentContainerName(container && container.name);
      const id = cleanEquipmentContainerId((container && container.id) || makeEquipmentContainerId(name));
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      containers.push({ id, name });
    }
    const assignments = {};
    if (source.assignments && typeof source.assignments === 'object') {
      for (const [key, value] of Object.entries(source.assignments)) {
        const cleanKey = cleanDetailValue(key).slice(0, 120);
        const cleanValue = cleanEquipmentContainerId(value);
        if (cleanKey && cleanValue) assignments[cleanKey] = cleanValue;
      }
    }
    return { version: 1, containers, assignments };
  }

  function getEquipmentContainers(player) {
    const organization = getEquipmentOrganization(player);
    const containers = [];
    const seenIds = new Set();
    const seenNames = new Set();
    const addContainer = (id, name, source = 'custom') => {
      const cleanId = cleanEquipmentContainerId(id);
      const cleanName = cleanEquipmentContainerName(name);
      const nameKey = normalizeName(cleanName);
      if (!cleanId || !cleanName || seenIds.has(cleanId) || seenNames.has(nameKey)) return;
      seenIds.add(cleanId);
      seenNames.add(nameKey);
      containers.push({ id: cleanId, name: cleanName, source });
    };

    for (const item of player.inventory || []) {
      if (isEquipmentContainerItem(item)) addContainer(makeEquipmentContainerId(item.name, 'auto'), item.name, 'item');
    }
    for (const container of organization.containers) {
      addContainer(container.id, container.name, 'custom');
    }
    return containers.sort((a, b) => compareText(a.name, b.name));
  }

  function isEquipmentContainerItem(item) {
    if (!item || item.weapon || isArmorOrShieldItem(item)) return false;
    const text = normalizeName(`${item.name || ''} ${item.kind || ''} ${item.details && item.details.type || ''}`);
    return EQUIPMENT_CONTAINER_NAMES.some(name => text.includes(name));
  }

  function getItemContainerId(item, player, containers = null) {
    const availableContainers = containers || getEquipmentContainers(player);
    const valid = new Set(availableContainers.map(container => container.id));
    const assignments = getEquipmentOrganization(player).assignments || {};
    for (const key of getEquipmentAssignmentKeys(item)) {
      const value = cleanEquipmentContainerId(assignments[key]);
      if (value && valid.has(value)) return value;
    }
    return EQUIPMENT_UNASSIGNED_CONTAINER;
  }

  function getItemContainerLabel(item, player, containers = null) {
    const availableContainers = containers || getEquipmentContainers(player);
    const containerId = getItemContainerId(item, player, availableContainers);
    if (!containerId) return 'Carried';
    const container = availableContainers.find(candidate => candidate.id === containerId);
    return container ? container.name : 'Carried';
  }

  function getEquipmentAssignmentKey(item) {
    return `name:${normalizeName(item && item.name)}`;
  }

  function getEquipmentAssignmentKeys(item) {
    return [
      getEquipmentAssignmentKey(item),
      normalizeName(item && item.name),
      item && item.id,
      item && item.sourceIndex !== undefined ? `index:${item.sourceIndex}` : '',
      item && item.sourceIndex !== undefined ? String(item.sourceIndex) : '',
    ].filter(Boolean).map(String);
  }

  function cleanEquipmentContainerFilter(value) {
    const raw = String(value === undefined || value === null ? 'all' : value).trim();
    if (raw === 'all' || raw === EQUIPMENT_UNASSIGNED_CONTAINER) return raw;
    return cleanEquipmentContainerId(raw) || 'all';
  }

  function cleanEquipmentContainerId(value) {
    return String(value || '').trim().replace(/[^a-zA-Z0-9:_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }

  function cleanEquipmentContainerName(value) {
    return cleanDetailValue(value).slice(0, 48);
  }

  function makeEquipmentContainerId(name, prefix = 'custom') {
    const slug = slugify(name) || 'container';
    return `${prefix}:${slug}`.slice(0, 80);
  }

  function saveEquipmentOrganization(root, player, organization) {
    const combatToggles = {
      ...(player.combatToggles || {}),
      [EQUIPMENT_ORGANIZATION_KEY]: normalizeEquipmentOrganization(organization),
    };
    return saveAndHydratePlayer(root, player, { combatToggles });
  }

  function saveEquipmentContainerAssignment(root, player, item, containerId) {
    const organization = getEquipmentOrganization(player);
    const assignments = { ...(organization.assignments || {}) };
    const key = getEquipmentAssignmentKey(item);
    const cleanContainerId = cleanEquipmentContainerId(containerId);
    if (cleanContainerId) assignments[key] = cleanContainerId;
    else delete assignments[key];
    return saveEquipmentOrganization(root, player, { ...organization, assignments });
  }

  function handleEquipmentContainerSubmit(root, form) {
    const player = root._playerState;
    if (!player) return;
    const input = form.querySelector('[data-equipment-new-container]');
    const name = cleanEquipmentContainerName(input && input.value);
    if (!name) return;
    const organization = getEquipmentOrganization(player);
    const existingContainers = getEquipmentContainers(player);
    const existingByName = existingContainers.find(container => normalizeName(container.name) === normalizeName(name));
    if (existingByName) {
      if (input) input.value = '';
      root._equipmentUi = { ...getEquipmentUiState(root), container: existingByName.id };
      updateEquipmentList(root);
      return;
    }
    const usedIds = new Set([
      ...existingContainers.map(container => container.id),
      ...organization.containers.map(container => container.id),
    ]);
    const baseId = makeEquipmentContainerId(name);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    const containers = [...organization.containers, { id, name }];
    if (input) input.value = '';
    saveEquipmentOrganization(root, player, { ...organization, containers });
    renderSheetLog(root, `${name} added`, 'Gear container saved.');
  }

  async function ensureItemCatalog(root) {
    if (root._itemCatalog) return root._itemCatalog;
    if (root._itemCatalogPromise) return root._itemCatalogPromise;
    const target = root.querySelector('[data-equipment-panel]');
    if (!target) return [];
    root._itemCatalogLoading = true;
    root._itemCatalogPromise = (async () => {
      try {
        root._itemCatalog = await loadRuleCatalog(root, 'items', target.dataset.itemsUrl || resolveRulesAssetUrl(root, 'items.json'), { array: true });
        if (root._playerState) hydratePlayerSheet(root, root._playerState);
      } catch (error) {
        root._itemCatalog = [];
      } finally {
        root._itemCatalogLoading = false;
      }
      return root._itemCatalog;
    })();
    return root._itemCatalogPromise;
  }

  async function ensureActionCatalog(root) {
    if (root._actionCatalog) return root._actionCatalog;
    if (root._actionCatalogPromise) return root._actionCatalogPromise;
    root._actionCatalogPromise = (async () => {
      try {
        const actions = await loadRuleCatalog(root, 'actions', resolveRulesAssetUrl(root, 'actions.json'), { array: true });
        root._actionCatalog = Array.isArray(actions) ? actions : [];
        if (root._playerState) {
          renderActionsPanel(root, root._playerState);
          renderCombatFeatureActions(root, root._playerState);
        }
      } catch {
        root._actionCatalog = [];
      }
      return root._actionCatalog;
    })();
    return root._actionCatalogPromise;
  }

  async function ensureFeatureCatalog(root) {
    if (root._featureCatalog) return root._featureCatalog;
    if (root._featureCatalogPromise) return root._featureCatalogPromise;
    root._featureCatalogPromise = (async () => {
      try {
        const features = await loadRuleCatalog(root, 'features', resolveRulesAssetUrl(root, 'features.json'), { array: true });
        root._featureCatalog = Array.isArray(features) ? features : [];
        if (root._playerState) {
          renderClassInfoPanel(root, root._playerState);
          renderRaceInfoPanel(root, root._playerState);
          renderActionsPanel(root, root._playerState);
          renderCombatFeatureActions(root, root._playerState);
        }
      } catch {
        root._featureCatalog = [];
      }
      return root._featureCatalog;
    })();
    return root._featureCatalogPromise;
  }

  async function ensureStartingGearCatalogs(root) {
    if (root._startingGearCatalogsLoaded) {
      return {
        classes: root._classCatalog || [],
        races: root._raceCatalog || [],
        backgrounds: root._backgroundCatalog || [],
      };
    }
    if (root._startingGearCatalogsPromise) return root._startingGearCatalogsPromise;
    const target = root.querySelector('[data-equipment-panel]');
    if (!target) return { classes: [], races: [], backgrounds: [] };
    root._startingGearCatalogsLoading = true;
    root._startingGearCatalogsPromise = (async () => {
      try {
        const [classes, races, backgrounds] = await Promise.all([
          loadRuleCatalog(root, 'classes', target.dataset.classesUrl || resolveRulesAssetUrl(root, 'classes.json'), { array: true }),
          loadRuleCatalog(root, 'races', target.dataset.racesUrl || resolveRulesAssetUrl(root, 'races.json'), { array: true }),
          loadRuleCatalog(root, 'backgrounds', target.dataset.backgroundsUrl || resolveRulesAssetUrl(root, 'backgrounds.json'), { array: true }),
        ]);
        root._classCatalog = Array.isArray(classes) ? classes : [];
        root._raceCatalog = Array.isArray(races) ? races : [];
        root._backgroundCatalog = Array.isArray(backgrounds) ? backgrounds : [];
        root._startingGearCatalogsLoaded = true;
        if (root._playerState) hydratePlayerSheet(root, root._playerState);
      } catch {
        root._classCatalog = [];
        root._raceCatalog = [];
        root._backgroundCatalog = [];
        root._startingGearCatalogsLoaded = true;
      } finally {
        root._startingGearCatalogsLoading = false;
      }
      return {
        classes: root._classCatalog || [],
        races: root._raceCatalog || [],
        backgrounds: root._backgroundCatalog || [],
      };
    })();
    return root._startingGearCatalogsPromise;
  }

  function resolveRulesAssetUrl(root, fileName) {
    const target = root && root.querySelector('[data-equipment-panel]');
    const base = String(target && target.dataset.rulesBase || '').trim()
      || String(target && target.dataset.itemsUrl || '../../Assets/Rules/items.json').replace(/items\.json(?:[?#].*)?$/i, '');
    return `${base.replace(/\/?$/, '/')}${String(fileName || '').replace(/^\/+/, '')}`;
  }

  async function loadRuleCatalog(root, collection, staticUrl, options = {}) {
    if (getApiBaseUrl()) {
      try {
        const cloudCatalog = await loadCloudRuleCatalog(root, collection, options);
        if (isUsableRuleCatalog(cloudCatalog, options)) return cloudCatalog;
      } catch (error) {
        // Static catalogs keep player sheets usable when the rules API is unavailable.
      }
    }
    return loadStaticRuleCatalog(staticUrl, options);
  }

  async function loadCloudRuleCatalog(root, collection, options = {}) {
    const aliases = RULE_CATALOG_API_ALIASES[collection] || [collection];
    let lastError = null;
    for (const alias of aliases) {
      try {
        const payload = await fetchApi(`rules/${encodeURIComponent(alias)}`, getRuleCatalogRequestParams(root));
        return extractRuleCatalog(payload, collection, options);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`Rules catalog ${collection} unavailable`);
  }

  async function loadStaticRuleCatalog(url, options = {}) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Rules catalog ${response.status}`);
    return extractRuleCatalog(await response.json(), '', options);
  }

  function getRuleCatalogRequestParams(root) {
    const version = getRuleCatalogVersion(root);
    return {
      v: version || RULE_CATALOG_REFRESH_TOKEN,
      _: RULE_CATALOG_REFRESH_TOKEN,
    };
  }

  function getRuleCatalogVersion(root) {
    const config = getConfig();
    const target = root && root.querySelector('[data-equipment-panel], [data-spell-panel], [data-character-builder]');
    return String(
      root && root.dataset && root.dataset.rulesVersion
      || target && target.dataset && target.dataset.rulesVersion
      || config.rulesCatalogVersion
      || config.rulesVersion
      || config.buildVersion
      || ''
    ).trim();
  }

  function extractRuleCatalog(payload, collection, options = {}) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return payload;
    if (options.array) {
      const direct = collection && payload[collection];
      if (Array.isArray(direct)) return direct;
      if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data[collection])) return payload.data[collection];
      for (const key of ['rules', 'items', 'records', 'rows', 'results', 'catalog', 'data']) {
        if (Array.isArray(payload[key])) return payload[key];
      }
    }
    return payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? payload.data
      : payload;
  }

  function isUsableRuleCatalog(catalog, options = {}) {
    if (options.array) return Array.isArray(catalog);
    return Boolean(catalog);
  }

  function setStartingGearStatus(root, message) {
    if (!root) return;
    root.querySelectorAll('[data-starting-gear-status]').forEach(status => {
      status.textContent = message || '';
    });
  }

  function renderSimpleOptions(options, selected) {
    return (options || []).map(([value, label]) => (
      `<option value="${escapeAttr(value)}" ${String(selected) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`
    )).join('');
  }

  function readControlValue(container, selector, fallback = '') {
    const control = container && container.querySelector(selector);
    return control ? String(control.value || '').trim() : fallback;
  }

  function renderEquipmentSearchFilters() {
    return `<div class="equipment-controls" data-equipment-search-filters>
      <label class="equipment-control-field">
        <span>Rarity</span>
        <select data-equipment-search-filter data-equipment-rarity-filter aria-label="Filter equipment rarity">
          ${renderSimpleOptions([['all', 'All rarities'], ...EQUIPMENT_SEARCH_RARITY_OPTIONS.map(rarity => [rarity, titleCase(rarity)])], 'all')}
        </select>
      </label>
      <label class="equipment-control-field">
        <span>Type</span>
        <select data-equipment-search-filter data-equipment-category-filter aria-label="Filter equipment type">
          ${renderSimpleOptions(EQUIPMENT_SEARCH_CATEGORY_OPTIONS, 'all')}
        </select>
      </label>
      <label class="equipment-control-field">
        <span>Min gp</span>
        <input data-equipment-search-filter data-equipment-value-min-filter type="number" min="0" step="1" placeholder="0" aria-label="Minimum equipment value in gold">
      </label>
      <label class="equipment-control-field">
        <span>Max gp</span>
        <input data-equipment-search-filter data-equipment-value-max-filter type="number" min="0" step="1" placeholder="Any" aria-label="Maximum equipment value in gold">
      </label>
      <label class="equipment-control-field">
        <span>Damage</span>
        <input data-equipment-search-filter data-equipment-damage-filter type="search" placeholder="1d8, fire..." aria-label="Filter equipment damage">
      </label>
      <label class="equipment-control-field">
        <span>Source / Meta</span>
        <input data-equipment-search-filter data-equipment-metadata-filter type="search" placeholder="PHB, attunement..." aria-label="Filter equipment source or metadata">
      </label>
    </div>`;
  }

  function readEquipmentSearchState(root, query = null) {
    const dialog = root && root.querySelector('[data-equipment-search-dialog]');
    const input = dialog && dialog.querySelector('[data-equipment-search-input]');
    return {
      query: query !== null ? String(query || '').trim() : String(input && input.value || '').trim(),
      rarity: readControlValue(dialog, '[data-equipment-rarity-filter]', 'all'),
      category: readControlValue(dialog, '[data-equipment-category-filter]', 'all'),
      minValue: nullableNumber(readControlValue(dialog, '[data-equipment-value-min-filter]', '')),
      maxValue: nullableNumber(readControlValue(dialog, '[data-equipment-value-max-filter]', '')),
      damage: readControlValue(dialog, '[data-equipment-damage-filter]', ''),
      metadata: readControlValue(dialog, '[data-equipment-metadata-filter]', ''),
    };
  }

  function hasEquipmentAdvancedSearchFilters(state) {
    return Boolean(
      (state && state.rarity && state.rarity !== 'all')
      || (state && state.category && state.category !== 'all')
      || (state && state.minValue !== null)
      || (state && state.maxValue !== null)
      || (state && state.damage)
      || (state && state.metadata)
    );
  }

  function hasEquipmentSearchState(state) {
    return Boolean(state && (state.query || hasEquipmentAdvancedSearchFilters(state)));
  }

  function renderEquipmentSearchResults(root, query) {
    const target = root.querySelector('[data-equipment-search-results]');
    if (!target) return;
    const state = readEquipmentSearchState(root, query);
    const clean = normalizeName(state.query);
    const catalog = Array.isArray(root._itemCatalog) ? root._itemCatalog : [];
    const hasAdvancedFilters = hasEquipmentAdvancedSearchFilters(state);
    const startingGearResults = hasAdvancedFilters ? [] : renderStartingGearSearchResults(root, clean);
    if (!hasEquipmentSearchState(state)) {
      target.innerHTML = '<p class="empty-note">Search by name, or use filters to browse the item catalog.</p>';
      return;
    }
    if (!catalog.length) {
      target.innerHTML = startingGearResults.length ? startingGearResults.join('') : '<p class="empty-note">Item catalog is still loading or unavailable.</p>';
      ensureItemCatalog(root);
      if (mayMatchStartingGearSearch(root, clean)) ensureStartingGearCatalogs(root);
      return;
    }

    const carried = new Set((root._playerState && root._playerState.equipment || []).map(normalizeName));
    const results = catalog
      .map(item => normalizeItemDetails(item))
      .filter(Boolean)
      .map(details => ({ details, score: clean ? scoreItemSearchResult(details, clean) : 1 }))
      .filter(result => (!clean || result.score > 0) && matchesEquipmentSearchFilters(result.details, state))
      .sort((a, b) => clean
        ? b.score - a.score || compareText(a.details.name, b.details.name)
        : compareText(a.details.name, b.details.name))
      .slice(0, 24);

    const itemResults = results.map(({ details }) => {
      const isCarried = carried.has(normalizeName(details.name));
      const meta = [details.type, details.rarity, details.value, details.damage, formatSource(details)].filter(Boolean).join(' / ');
      return `<article class="equipment-result">
        <span>
          <strong>${escapeHtml(details.name || 'Unnamed item')}</strong>
          <small>${escapeHtml(meta)}</small>
          ${details.text ? `<small>${escapeHtml(truncateText(details.text, 180))}</small>` : ''}
        </span>
        <div class="equipment-result-actions">
          <button class="text-button" type="button" data-add-equipment="${escapeAttr(details.name || '')}">${isCarried ? 'Add Another' : 'Add'}</button>
        </div>
      </article>`;
    });
    const renderedResults = [...startingGearResults, ...itemResults].filter(Boolean);
    target.innerHTML = renderedResults.length ? renderedResults.join('') : '<p class="empty-note">No items match those search filters.</p>';
  }

  function renderStartingGearSearchResults(root, query) {
    const player = root && root._playerState;
    if (!player || !mayMatchStartingGearSearch(root, query)) return [];
    const entries = getStartingGearEntries(root, player);
    const groups = groupStartingGearEntries(entries, player)
      .filter(group => matchesStartingGearGroupSearch(group, query));
    if (!groups.length && matchesStartingGearSearch(query)) {
      return [renderStartingGearGroupResult(player, {
        key: '',
        title: `${player.class || 'Class'} Starting Gear`,
        subtitle: 'Loads class starting gear from cloud/rules data.',
        entries: [],
      })];
    }
    return groups.map(group => renderStartingGearGroupResult(player, group));
  }

  function renderStartingGearGroupResult(player, group) {
    const missing = getMissingStartingGear(player, group.entries);
    const hasEntries = group.entries.length > 0;
    const alreadyAdded = hasEntries && missing.length === 0;
    const previewEntries = (missing.length ? missing : group.entries).slice(0, 6);
    const preview = previewEntries.length
      ? `<small>${escapeHtml(previewEntries.map(entry => entry.itemName || entry.label).filter(Boolean).join(' / '))}</small>`
      : '';
    const status = alreadyAdded
      ? 'This starting gear already appears on this sheet.'
      : hasEntries
        ? group.subtitle
        : 'Loads class starting gear from cloud/rules data.';
    const label = alreadyAdded ? 'Added' : hasEntries ? 'Add Gear' : 'Find Gear';
    return `<article class="equipment-result starting-gear-result" data-starting-gear-result>
      <span>
        <strong>${escapeHtml(group.title)}</strong>
        <small data-starting-gear-status>${escapeHtml(status)}</small>
        ${preview}
      </span>
      <div class="equipment-result-actions">
        <button class="text-button" type="button" data-add-starting-gear data-starting-gear-source="${escapeAttr(group.key || '')}" ${alreadyAdded ? 'disabled' : ''}>${escapeHtml(label)}</button>
      </div>
    </article>`;
  }

  function groupStartingGearEntries(entries, player) {
    const groups = new Map();
    for (const entry of entries || []) {
      const key = entry.sourceKey || 'starting-gear';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: formatStartingGearGroupTitle(entry, player),
          subtitle: formatStartingGearGroupSubtitle(entry),
          entries: [],
        });
      }
      groups.get(key).entries.push(entry);
    }
    return Array.from(groups.values());
  }

  function formatStartingGearGroupTitle(entry, player) {
    const label = cleanDetailValue(entry && entry.sourceLabel);
    if (/class$/i.test(label)) return `${label.replace(/\s+class$/i, '')} Starting Gear`;
    if (/race$/i.test(label)) return `${label.replace(/\s+race$/i, '')} Starting Gear`;
    if (/background$/i.test(label)) return `${label.replace(/\s+background$/i, '')} Background Gear`;
    return `${label || player && player.class || 'Class'} Starting Gear`;
  }

  function formatStartingGearGroupSubtitle(entry) {
    const label = cleanDetailValue(entry && entry.sourceLabel);
    if (/class$/i.test(label)) return `Adds ${label.replace(/\s+class$/i, '')} class starting equipment.`;
    if (/race$/i.test(label)) return `Adds ${label.replace(/\s+race$/i, '')} race starting equipment.`;
    if (/background$/i.test(label)) return `Adds ${label.replace(/\s+background$/i, '')} background starting equipment.`;
    return 'Adds starting equipment from rules data.';
  }

  function matchesStartingGearGroupSearch(group, query) {
    const clean = normalizeName(query);
    if (!clean) return false;
    if (matchesStartingGearSearch(clean)) return true;
    const haystack = normalizeName(`${group.title} ${group.subtitle} ${group.entries.map(entry => `${entry.label} ${entry.itemName} ${entry.sourceLabel}`).join(' ')}`);
    return clean.split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
  }

  function mayMatchStartingGearSearch(root, query) {
    if (matchesStartingGearSearch(query)) return true;
    const player = root && root._playerState;
    const haystack = normalizeName(`${player && player.class || ''} ${player && player.race || ''} ${player && player.background || ''} class race background starting gear`);
    return normalizeName(query).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
  }

  function matchesStartingGearSearch(query) {
    const clean = normalizeName(query);
    if (!clean) return false;
    const haystack = 'starting gear starting equipment starter kit class gear race gear background gear initial equipment add gear add equipment';
    const terms = clean.split(/\s+/).filter(Boolean);
    return haystack.includes(clean) || terms.every(term => haystack.includes(term));
  }

  function scoreItemSearchResult(item, query) {
    const clean = normalizeName(query);
    const details = normalizeItemDetails(item) || {};
    const name = normalizeName(details.name);
    const type = normalizeName(details.type);
    const rarity = normalizeName(details.rarity);
    const source = normalizeName(details.source);
    const haystack = getItemCatalogSearchText(details);
    const terms = clean.split(/\s+/).filter(Boolean);
    if (!clean) return 0;
    if (name === clean) return 120;
    if (name.startsWith(clean)) return 100;
    if (name.includes(clean)) return 80;
    if (terms.length > 1 && name.startsWith(terms[0]) && terms.every(term => haystack.includes(term))) return 75;
    if (`${type} ${rarity} ${source}`.includes(clean)) return 45;
    if (haystack.includes(clean)) return 20;
    if (terms.length > 1 && terms.every(term => haystack.includes(term))) return 15;
    return 0;
  }

  function matchesEquipmentSearchFilters(details, state) {
    if (!details || !state) return false;
    if (state.rarity && state.rarity !== 'all' && normalizeName(details.rarity) !== normalizeName(state.rarity)) return false;
    if (state.category && state.category !== 'all' && !matchesEquipmentSearchCategory(details, state.category)) return false;
    if ((state.minValue !== null || state.maxValue !== null) && !matchesItemValueRange(details, state.minValue, state.maxValue)) return false;
    if (state.damage && !matchesSearchTerms(getItemDamageSearchText(details), state.damage)) return false;
    if (state.metadata && !matchesSearchTerms(getItemMetadataSearchText(details), state.metadata)) return false;
    return true;
  }

  function matchesEquipmentSearchCategory(details, category) {
    const clean = normalizeName(category);
    if (!clean || clean === 'all') return true;
    const type = normalizeName(details && details.type);
    const name = normalizeName(details && details.name);
    const haystack = normalizeName([
      details && details.name,
      details && details.type,
      details && details.properties,
      details && details.text,
      details && details.weapon && details.weapon.type,
      details && details.weapon && details.weapon.style,
    ].filter(Boolean).join(' '));
    if (clean === 'weapon') return Boolean(details.weapon) || type.includes('weapon');
    if (clean === 'melee weapon') return (Boolean(details.weapon) || type.includes('weapon')) && (type.includes('melee') || haystack.includes('melee'));
    if (clean === 'ranged weapon') return (Boolean(details.weapon) || type.includes('weapon')) && (type.includes('ranged') || haystack.includes('ranged'));
    if (clean === 'armor') return type.includes('armor') || name.includes('armor');
    if (clean === 'shield') return type.includes('shield') || name.includes('shield');
    if (clean === 'staff') return type.includes('staff') || /\bstaff\b/.test(name);
    return haystack.includes(clean);
  }

  function matchesItemValueRange(details, minValue, maxValue) {
    const value = parseGoldValue(details && details.value);
    if (value === null) return false;
    if (minValue !== null && value < minValue) return false;
    if (maxValue !== null && value > maxValue) return false;
    return true;
  }

  function parseGoldValue(value) {
    const text = String(value || '').toLowerCase().replace(/,/g, '');
    if (!text.trim()) return null;
    const pattern = /(\d+(?:\.\d+)?)\s*(pp|gp|ep|sp|cp)\b/g;
    let total = 0;
    let matched = false;
    let match;
    while ((match = pattern.exec(text))) {
      matched = true;
      total += Number(match[1]) * (CURRENCY_TO_GP[match[2]] || 0);
    }
    if (matched) return total;
    const numeric = text.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    return numeric ? Number(numeric[1]) : null;
  }

  function matchesSearchTerms(haystack, query) {
    const text = normalizeName(haystack);
    const terms = normalizeName(query).split(/\s+/).filter(Boolean);
    return !terms.length || terms.every(term => text.includes(term));
  }

  function getItemCatalogSearchText(item) {
    const details = normalizeItemDetails(item) || {};
    return normalizeName([
      details.name,
      details.type,
      details.rarity,
      details.source,
      details.page,
      details.attunement,
      details.damage,
      details.properties,
      details.weight,
      details.value,
      details.mastery,
      details.text,
      details.weapon && details.weapon.type,
      details.weapon && details.weapon.style,
      details.weapon && details.weapon.damage,
      details.weapon && details.weapon.damageType,
      details.weapon && details.weapon.properties && details.weapon.properties.join(' '),
      ...(details.abilities || []),
      ...(details.actions || []).map(action => `${action.title || action.name || ''} ${action.detail || action.text || ''}`),
      ...(details.effects || []).map(effect => `${effect.name || effect.label || ''} ${effect.text || ''}`),
      ...(details.resources || []).map(resource => `${resource.name || resource.id || ''} ${resource.reset || ''}`),
    ].filter(Boolean).join(' '));
  }

  function getItemDamageSearchText(details) {
    return normalizeName([
      details && details.damage,
      details && details.weapon && details.weapon.damage,
      details && details.weapon && details.weapon.versatileDamage,
      details && details.weapon && details.weapon.damageType,
      details && details.text,
      ...(details && details.actions || []).map(action => `${action.title || ''} ${action.detail || action.text || ''}`),
      ...(details && details.effects || []).map(effect => `${effect.name || ''} ${effect.text || ''}`),
    ].filter(Boolean).join(' '));
  }

  function getItemMetadataSearchText(details) {
    return normalizeName([
      details && details.source,
      details && details.page,
      details && details.type,
      details && details.rarity,
      details && details.attunement,
      details && details.properties,
      details && details.weight,
      details && details.value,
      details && details.mastery,
    ].filter(Boolean).join(' '));
  }

  function getMissingStartingGear(player, entries = null) {
    const carried = new Set((player.equipment || []).map(startingGearMatchKey));
    const seen = new Set();
    return (entries || getStartingGearEntries(null, player))
      .filter(entry => {
        const itemName = entry && (entry.itemName || entry.label);
        const key = startingGearMatchKey(itemName);
        if (!key || carried.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  async function resolveStartingGearEntries(root, player) {
    if (!player) return [];
    const [, , character] = await Promise.all([
      ensureItemCatalog(root),
      ensureStartingGearCatalogs(root),
      fetchStartingGearCharacter(root, player),
    ]);
    return getStartingGearEntries(root, player, character);
  }

  async function fetchStartingGearCharacter(root, player) {
    if (!player || !player.id || !getApiBaseUrl()) return null;
    if (root._startingGearCharacterLoaded) return root._startingGearCharacter || null;
    if (root._startingGearCharacterPromise) return root._startingGearCharacterPromise;
    root._startingGearCharacterPromise = fetchApi(`characters/${encodeURIComponent(player.id)}`)
      .then(character => {
        root._startingGearCharacter = character && !character.error ? character : null;
        root._startingGearCharacterLoaded = true;
        return root._startingGearCharacter;
      })
      .catch(() => {
        root._startingGearCharacter = null;
        root._startingGearCharacterLoaded = true;
        return null;
      });
    return root._startingGearCharacterPromise;
  }

  function getStartingGearEntries(root, player, character = null) {
    if (!player) return [];
    const source = buildStartingGearSource(player, character);
    const classRow = findRuleRow(root && root._classCatalog, source.classId, source.class);
    const raceRow = findRuleRow(root && root._raceCatalog, source.raceId, source.race);
    const backgroundRow = findRuleRow(root && root._backgroundCatalog, source.backgroundId, source.background);
    const backgroundDetails = Array.isArray(player.backgroundDetails) ? player.backgroundDetails : [];
    const entries = [
      ...getRuleStartingGearEntries(classRow || { id: source.classId, name: source.class }, 'class'),
      ...getRuleStartingGearEntries(raceRow, 'race'),
      ...getRuleStartingGearEntries(backgroundRow, 'background'),
      ...backgroundDetails.flatMap(detail => getRuleStartingGearEntries(detail, 'background')),
    ];
    return uniqueStartingGearEntries(entries.map(entry => resolveStartingGearEntry(root, entry)));
  }

  function buildStartingGearSource(player, character) {
    const ruleChoices = player && player.ruleChoices && typeof player.ruleChoices === 'object' ? player.ruleChoices : {};
    const source = character && typeof character === 'object' ? character : {};
    return {
      ...player,
      classId: source.classId || firstString(source.classLevels && source.classLevels[0] && source.classLevels[0].classId) || player.classId || '',
      class: player.class || source.class || '',
      raceId: source.raceId || player.raceId || ruleChoices.raceId || firstString(ruleChoices.raceIds) || '',
      race: player.race || source.race || '',
      backgroundId: source.backgroundId || player.backgroundId || ruleChoices.backgroundId || firstString(ruleChoices.backgroundIds) || '',
      background: player.background || source.background || '',
    };
  }

  function firstString(values) {
    return Array.isArray(values) ? String(values.find(Boolean) || '') : String(values || '');
  }

  function findRuleRow(rows, id, name) {
    const idKey = normalizeName(id);
    const nameKey = normalizeName(name);
    return (Array.isArray(rows) ? rows : []).find(row => (
      idKey && normalizeName(row && row.id) === idKey
    ) || (
      nameKey && normalizeName(row && row.name) === nameKey
    )) || null;
  }

  function getRuleStartingGearEntries(row, sourceType) {
    if (!row) return [];
    const sourceLabel = `${row.name || titleCase(sourceType)} ${titleCase(sourceType)}`;
    const textEntries = getRuleStartingGearTexts(row)
      .flatMap(parseStartingGearText)
      .map(label => makeStartingGearEntry(label, sourceLabel, `${sourceType}:${row.id || slugify(row.name || sourceType)}`));
    if (textEntries.length || sourceType !== 'class') return textEntries;
    return getDefaultClassStartingGearLabels(row).map(label => makeStartingGearEntry(label, sourceLabel, `${sourceType}:${row.id || slugify(row.name || sourceType)}:default`));
  }

  function getRuleStartingGearTexts(row) {
    return ['startingEquipment', 'startingGear', 'equipment']
      .flatMap(field => {
        const value = row && row[field];
        if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : item && (item.name || item.item || item.label || item.text)).filter(Boolean);
        if (value && typeof value === 'object') return Object.values(value).flat().map(item => typeof item === 'string' ? item : item && (item.name || item.item || item.label || item.text)).filter(Boolean);
        return value ? [value] : [];
      });
  }

  function parseStartingGearText(text) {
    const clean = trimStartingGearText(text);
    if (!clean) return [];
    return clean
      .split(/,\s+|\s+and\s+/i)
      .map(normalizeStartingGearLabel)
      .filter(Boolean);
  }

  function trimStartingGearText(text) {
    let clean = cleanRulesText(text).replace(/^Equipment:\s*/i, '');
    clean = clean.replace(/\s+(Feature|Suggested Characteristics|Personality Trait|Ideal|Bond|Flaw)\b.*$/i, '');
    const coinMatch = clean.match(/^(.*?\b(?:\d+\s*(?:gp|sp|cp|pp)|\d+\s+gold flowers)\b)/i);
    if (coinMatch) clean = coinMatch[1];
    return clean.trim();
  }

  function normalizeStartingGearLabel(value) {
    let label = cleanRulesText(value)
      .replace(/^\s*(?:and\s+)?/i, '')
      .replace(/^(?:a|an|the)\s+/i, '')
      .replace(/^(?:one\s+)?set of\s+/i, '')
      .replace(/^any one\s+/i, '')
      .trim();
    if (!label) return '';
    if (/belt pouch|pouch containing|purse containing/i.test(label)) {
      label = label.replace(/^(?:belt\s+)?pouch containing.*$/i, 'Pouch').replace(/^purse containing.*$/i, 'Pouch');
    }
    return titleCase(label);
  }

  function getDefaultClassStartingGearLabels(row) {
    const keys = [
      row && row.id,
      row && row.name,
      row && row.className,
    ].map(normalizeName).filter(Boolean);
    for (const key of keys) {
      if (CLASS_STARTING_GEAR_DEFAULTS[key]) return CLASS_STARTING_GEAR_DEFAULTS[key];
    }
    return [];
  }

  function makeStartingGearEntry(label, sourceLabel, sourceKey, defaultSelected = true) {
    const cleanLabel = cleanDetailValue(label);
    return {
      key: `${sourceKey}:${slugify(cleanLabel)}`,
      label: cleanLabel,
      sourceLabel,
      sourceKey,
      defaultSelected,
    };
  }

  function uniqueStartingGearEntries(entries) {
    const seen = new Set();
    const out = [];
    for (const entry of entries || []) {
      const key = startingGearMatchKey(entry && (entry.itemName || entry.label));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
    }
    return out;
  }

  function resolveStartingGearEntry(root, entry) {
    if (!entry || !entry.label) return entry;
    const itemName = resolveStartingGearItemName(root, entry.label);
    return { ...entry, itemName };
  }

  function resolveStartingGearItemName(root, label) {
    const catalog = Array.isArray(root && root._itemCatalog) ? root._itemCatalog : [];
    const candidates = getStartingGearLookupNames(label);
    const found = catalog.find(item => {
      const keys = [item && item.name, item && item.id].map(normalizeName).filter(Boolean);
      return keys.some(key => candidates.includes(key));
    });
    return found && found.name || cleanDetailValue(label);
  }

  function getStartingGearLookupNames(label) {
    const clean = cleanDetailValue(label);
    const withoutQuantity = clean.replace(/^\d+\s+/, '').replace(/^(?:two|three|four|five|ten)\s+/i, '');
    const normalized = [
      clean,
      withoutQuantity,
      withoutQuantity.replace(/\([^)]*\)/g, '').trim(),
      withoutQuantity.replace(/\b(?:containing|with)\b.*$/i, '').trim(),
      withoutQuantity.replace(/'s\b/g, 's'),
    ].map(normalizeName).filter(Boolean);
    if (/^arrows?$/i.test(withoutQuantity)) normalized.push(normalizeName('Arrows (20)'));
    if (/^(?:crossbow\s+)?bolts?$/i.test(withoutQuantity)) normalized.push(normalizeName('Crossbow Bolts (20)'));
    if (/^sling bullets?$/i.test(withoutQuantity)) normalized.push(normalizeName('Sling Bullets (20)'));
    if (/shield/i.test(withoutQuantity)) normalized.push(normalizeName('Shield'));
    return [...new Set(normalized)];
  }

  function startingGearMatchKey(value) {
    return normalizeName(value).replace(/\s+/g, ' ').trim();
  }

  function renderSpellPanel(root, player) {
    const target = root.querySelector('[data-spell-panel]');
    if (!target) return;
    const spellGroups = splitKnownAndGrantedSpells(player, root);
    target.innerHTML = `<div class="spell-manager">
      <div class="manager-toolbar">
        <div>
          <h2>Spells</h2>
          <p>${escapeHtml(`${spellGroups.known.length} known, ${spellGroups.granted.length} granted, ${player.spellScrolls.length} scroll${player.spellScrolls.length === 1 ? '' : 's'}`)}</p>
        </div>
        <button class="icon-button" type="button" data-open-spell-search aria-label="Add spell" title="Add spell">+</button>
      </div>
      ${renderSpellcastingSummary(player)}
      ${spellGroups.granted.length ? `<section class="granted-spell-section">
        <h2>Granted Spells</h2>
        <p class="empty-note">Cannot be removed. Granted by class, subclass, feat, race, or background.</p>
        <div class="spell-list">
          ${renderKnownSpellGroups(player, root, spellGroups.granted, { locked: true })}
        </div>
      </section>` : ''}
      <section>
        <h2>Known Spells</h2>
        <div class="spell-list">
          ${renderKnownSpellGroups(player, root, spellGroups.known)}
        </div>
      </section>
      <section>
        <h2>Spell Scrolls</h2>
        <div class="spell-list">
          ${player.spellScrolls.length ? player.spellScrolls.map(scroll => renderSpellScroll(scroll, player, root)).join('') : '<p class="empty-note">No spell scrolls recorded.</p>'}
        </div>
      </section>
      <dialog class="sheet-search-dialog" data-spell-search-dialog aria-label="Add spell">
        <div class="sheet-search-frame">
          <div class="sheet-search-head">
            <h2>Add Spell</h2>
            <button class="text-button" type="button" data-close-dialog>Close</button>
          </div>
          <input data-spell-search-input type="search" placeholder="Search spells by name, school, class, or text..." aria-label="Search spells">
          ${renderSpellSearchFilters()}
          <div class="spell-search-results" data-spell-search-results></div>
        </div>
      </dialog>
      <div class="roll-log" data-roll-log></div>
    </div>`;

    ensureSpellCatalog(root);
  }

  function renderSpellcastingSummary(player) {
    const ability = resolveSpellcastingAbility(player);
    const attack = player && player.spellAttack !== null && player.spellAttack !== undefined ? formatBonus(player.spellAttack) : '-';
    const saveDc = player && player.spellSaveDc !== null && player.spellSaveDc !== undefined ? String(player.spellSaveDc) : '-';
    if (!ability && attack === '-' && saveDc === '-') return '';
    return `<section class="spellcasting-summary" aria-label="Spellcasting stats">
      <div>
        <span>Ability</span>
        <strong>${escapeHtml(ability ? ABILITY_NAMES[ability] : '-')}</strong>
      </div>
      <div>
        <span>Spell Attack</span>
        <strong>${escapeHtml(attack)}</strong>
      </div>
      <div>
        <span>Spell Save DC</span>
        <strong>${escapeHtml(saveDc)}</strong>
      </div>
    </section>`;
  }

  function renderKnownSpell(name, player, root, options = {}) {
    const spell = findSpellDetails(name, player, root);
    const prepared = isSpellPrepared(player, name);
    const metadata = getSpellMetadata(player, name, spell);
    const nonRemovable = Boolean(options.locked || isSpellNonRemovable(player, name, spell, root));
    const sourceLabel = metadata && metadata.granted ? 'Granted' : prepared ? 'Prepared' : 'Known';
    return `<details class="spell-row ${nonRemovable ? 'locked-spell-row' : ''}">
      <summary>
        <span>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml([formatSpellMeta(spell), sourceLabel].filter(Boolean).join(' / '))}</small>
        </span>
        <div class="spell-row-actions">
          ${renderSpellActionControls(player, spell, name)}
          ${nonRemovable ? '<span class="spell-source-pill">Locked</span>' : `<button class="text-button" type="button" data-remove-spell="${escapeAttr(name)}">Remove</button>`}
        </div>
      </summary>
      ${renderSpellDetails(spell, player)}
    </details>`;
  }

  function renderKnownSpellGroups(player, root, spellNames = null, options = {}) {
    const names = Array.isArray(spellNames) ? spellNames : Array.isArray(player.spells) ? player.spells : [];
    if (!names.length) return '<p class="empty-note">No spells recorded.</p>';
    const groups = groupSpellNamesByLevel(names, player, root);
    return groups.map(group => `<section class="spell-level-group">
      <div class="spell-level-heading">
        <h3>${escapeHtml(group.label)}</h3>
        <span>${escapeHtml(`${group.names.length} spell${group.names.length === 1 ? '' : 's'}`)}</span>
      </div>
      <div class="spell-level-list">
        ${group.names.map(name => renderKnownSpell(name, player, root, options)).join('')}
      </div>
    </section>`).join('');
  }

  function splitKnownAndGrantedSpells(player, root) {
    const known = [];
    const granted = uniqueSpellNames(getGrantedSpellDisplayNames(player, root));
    const grantedKeys = new Set(granted.map(normalizeName));
    for (const name of getSheetSpellDisplayNames(player, root)) {
      const spell = findSpellDetails(name, player, root);
      if (isGrantedSpell(player, name, spell, root)) {
        const key = normalizeName(name);
        if (!grantedKeys.has(key)) {
          granted.push(name);
          grantedKeys.add(key);
        }
      }
      else known.push(name);
    }
    return { known, granted };
  }

  function getSheetSpellDisplayNames(player, root) {
    return uniqueSpellNames([
      ...(Array.isArray(player && player.spells) ? player.spells : []),
      ...getGrantedSpellDisplayNames(player, root),
    ]);
  }

  function getGrantedSpellDisplayNames(player, root) {
    const names = [];
    names.push(...(Array.isArray(player && player.grantedSpells) ? player.grantedSpells : []));
    Object.values(player && player.grantedSpellDetails || {}).forEach(spell => names.push(spell && (spell.name || spell.id)));
    names.push(...getGrantedSpellActionNames(player, root));
    names.push(...getGrantedSpellFeatureNames(player, root));
    Object.values(player && player.spellMetadataByName || {}).forEach(meta => {
      if (isGrantedLockedSpell(meta)) names.push(meta.name);
    });
    Object.values(player && player.spellMetadata || {}).forEach(meta => {
      if (!isGrantedLockedSpell(meta)) return;
      if (meta.name) names.push(meta.name);
      else {
        const spell = findSpellDetailsByIdOrName(meta.id, player, root);
        if (spell && spell.name) names.push(spell.name);
      }
    });
    return uniqueSpellNames(names);
  }

  function uniqueSpellNames(names) {
    const seen = new Set();
    const out = [];
    for (const name of names || []) {
      const clean = cleanDetailValue(name);
      const key = normalizeName(clean);
      if (!clean || seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
    }
    return out;
  }

  function isGrantedSpell(player, name, spell = null, root = null) {
    const metadata = getSpellMetadata(player, name, spell);
    if (isGrantedLockedSpell(metadata)) return true;
    if (hasGrantedSpellAction(player, name, spell)) return true;
    if (hasGrantedSpellFeature(player, name, spell, root)) return true;
    const granted = new Set((player && player.grantedSpells || []).map(normalizeName));
    return granted.has(normalizeName(name)) || granted.has(normalizeName(spell && spell.name));
  }

  function getGrantedSpellActionNames(player, root) {
    const names = [];
    getGrantedSpellActions(player).forEach(action => {
      const spell = findSpellDetailsByIdOrName(action.sourceId || action.spellId || action.title || action.name, player, root);
      names.push(spell && spell.name || cleanDetailValue(action.title || action.name).replace(/^Cast\s+/i, '') || action.sourceId || action.spellId);
    });
    return uniqueSpellNames(names);
  }

  function hasGrantedSpellAction(player, name, spell = null) {
    const targets = [name, spell && spell.name, spell && spell.id].map(normalizeName).filter(Boolean);
    if (!targets.length) return false;
    return getGrantedSpellActions(player).some(action => {
      const actionKeys = [action.sourceId, action.spellId, action.title, action.name]
        .map(value => normalizeName(cleanDetailValue(value).replace(/^Cast\s+/i, '')))
        .filter(Boolean);
      return actionKeys.some(key => targets.includes(key));
    });
  }

  function getGrantedSpellActions(player) {
    return (Array.isArray(player && player.ruleActions) ? player.ruleActions : [])
      .filter(action => normalizeName(action && action.sourceType) === 'spell');
  }

  function getGrantedSpellFeatureNames(player, root) {
    const catalog = root && Array.isArray(root._spellCatalog) ? root._spellCatalog : [];
    const names = getStructuredGrantedSpellFeatureNames(player, root, catalog);
    if (!catalog.length) return uniqueSpellNames(names);
    for (const feature of getGrantedSpellFeatureRules(player)) {
      const text = cleanRulesText(`${feature.name || feature.label || ''}. ${feature.text || feature.detail || feature.featureText || ''}`);
      const progressionLevel = getGrantedSpellFeatureLevel(player, feature);
      names.push(...getCantripsGrantedByFeatureText(text, catalog));
      names.push(...getCastsGrantedByFeatureText(text, catalog, progressionLevel));
      names.push(...getTableSpellsGrantedByFeatureText(text, catalog, progressionLevel, player, feature));
    }
    return uniqueSpellNames(names);
  }

  function getStructuredGrantedSpellFeatureNames(player, root, catalog = []) {
    const names = [];
    for (const feature of getGrantedSpellFeatureSourceRules(player)) {
      const progressionLevel = getGrantedSpellFeatureLevel(player, feature);
      getStructuredFeatureSpellGrants(feature).forEach(grant => {
        const levelGate = Number(grant.levelGate || grant.level || feature.level || 1) || 1;
        if (levelGate > progressionLevel) return;
        const spell = findStructuredGrantSpell(grant, player, root, catalog);
        names.push(spell && spell.name || grant.spellName || grant.name || grant.spellId);
      });
    }
    return uniqueSpellNames(names);
  }

  function getStructuredFeatureSpellGrants(feature) {
    return (Array.isArray(feature && feature.grants) ? feature.grants : [])
      .filter(grant => normalizeName(grant && grant.type) === 'spell');
  }

  function findStructuredGrantSpell(grant, player, root, catalog = []) {
    const candidates = [grant && grant.spellId, grant && grant.spellName, grant && grant.name].filter(Boolean);
    for (const candidate of candidates) {
      const spell = findSpellDetailsByIdOrName(candidate, player, root);
      if (spell) return spell;
    }
    const keys = candidates.flatMap(value => [value, slugify(value)]).map(normalizeName).filter(Boolean);
    return (catalog || []).find(spell => {
      const spellKeys = [spell && spell.id, spell && spell.name, slugify(spell && spell.name)].map(normalizeName);
      return spellKeys.some(key => keys.includes(key));
    }) || null;
  }

  function hasGrantedSpellFeature(player, name, spell = null, root = null) {
    const granted = new Set(getGrantedSpellFeatureNames(player, root).map(normalizeName));
    return granted.has(normalizeName(name)) || granted.has(normalizeName(spell && spell.name));
  }

  function getGrantedSpellFeatureRules(player) {
    const structured = getGrantedSpellFeatureSourceRules(player).filter(record => getStructuredFeatureSpellGrants(record).length);
    const records = [
      ...getGrantedSpellFeatureSourceRules(player),
    ].filter(Boolean);
    const seen = new Set();
    return [...structured, ...records.filter(record => {
      const text = cleanRulesText(`${record.name || record.label || ''}. ${record.text || record.detail || record.featureText || ''}`);
      if (!/\b(?:domain|oath|circle|spells?|cantrip|cast)\b/i.test(text)) return false;
      if (!/\b(?:you know|you can cast|can also cast|add the listed spells|add the following spells|domain spells|oath spells|circle spells|spells table|always have it prepared|do not count|doesn't count)\b/i.test(text)) return false;
      const key = record.id || `${record.name || record.label || ''}:${text.slice(0, 120)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })].filter(record => {
      const key = record.id || `${record.name || record.label || ''}`;
      if (!key || seen.has(`final:${key}`)) return false;
      seen.add(`final:${key}`);
      return true;
    });
  }

  function getGrantedSpellFeatureSourceRules(player) {
    return [
      ...(Array.isArray(player && player.ruleFeatures) ? player.ruleFeatures : []),
      ...(Array.isArray(player && player.ruleEffects) ? player.ruleEffects : []),
      ...(Array.isArray(player && player.featDetails) ? player.featDetails : []),
      ...(Array.isArray(player && player.raceDetails) ? player.raceDetails : []),
      ...(Array.isArray(player && player.backgroundDetails) ? player.backgroundDetails : []),
    ].filter(Boolean);
  }

  function getGrantedSpellFeatureLevel(player, feature) {
    const playerLevel = clampNumber(Number(player && player.level) || 1, 1, 20);
    const featureClass = normalizeName(feature && feature.className);
    if (!featureClass || !Array.isArray(player && player.classLevels)) return playerLevel;
    const classLevel = player.classLevels.find(row => {
      const keys = [row && row.classId, row && row.className, row && row.name].map(normalizeName);
      return keys.includes(featureClass);
    });
    return clampNumber(Number(classLevel && classLevel.level) || playerLevel, 1, 20);
  }

  function getCantripsGrantedByFeatureText(text, catalog) {
    const names = [];
    const pattern = /\byou know (?:the )?([^.;:]{1,80}?) cantrip\b/ig;
    let match;
    while ((match = pattern.exec(text))) {
      const spell = findCatalogSpellByNameFragment(match[1], catalog);
      if (spell) names.push(spell.name);
    }
    return uniqueSpellNames(names);
  }

  function getCastsGrantedByFeatureText(text, catalog, progressionLevel) {
    const names = [];
    const segments = splitSentences(text);
    for (const segment of segments) {
      const levelGate = getFeatureTextLevelGate(segment);
      if (levelGate && progressionLevel < levelGate) continue;
      const pattern = /\byou can (?:also )?cast (?:the )?([^.;:]{1,100}?) spell\b/ig;
      let match;
      while ((match = pattern.exec(segment))) {
        const spell = findCatalogSpellByNameFragment(match[1], catalog);
        if (spell) names.push(spell.name);
      }
    }
    return uniqueSpellNames(names);
  }

  function getTableSpellsGrantedByFeatureText(text, catalog, progressionLevel, player = null, feature = null) {
    if (!/\b(?:domain spells|oath spells|circle spells|add the listed spells|add the following spells|always have it prepared|do not count|doesn't count)\b/i.test(text)) return [];
    const choiceTable = getChoiceSpellGrantTable(text, catalog, progressionLevel, player, feature);
    if (choiceTable) return choiceTable;
    const tableStart = findGrantedSpellTableStart(text);
    if (tableStart < 0) return [];
    const tableText = text.slice(tableStart);
    const markers = Array.from(tableText.matchAll(/\b(\d+)(?:st|nd|rd|th)(?:\s+level)?\b/ig));
    const names = [];
    markers.forEach((marker, index) => {
      const requiredLevel = Number(marker[1]) || 0;
      if (requiredLevel && progressionLevel < requiredLevel) return;
      const start = marker.index + marker[0].length;
      const end = index + 1 < markers.length ? markers[index + 1].index : tableText.length;
      names.push(...findCatalogSpellNamesInText(tableText.slice(start, end), catalog));
    });
    return uniqueSpellNames(names);
  }

  function getChoiceSpellGrantTable(text, catalog, progressionLevel, player, feature) {
    if (!/\bchoose that land\b|\bchoose the land\b|\bconnected to the land where\b|\bconsult the associated list of spells\b/i.test(text)) return null;
    const table = getNamedSpellGrantTable(text, CIRCLE_LAND_OPTIONS);
    if (!table || !table.options.length) return [];
    const choice = resolveChoiceSpellGrantOption(table, player, feature);
    if (!choice) return [];
    const option = table.options.find(row => normalizeName(row.name) === normalizeName(choice));
    if (!option) return [];
    const names = [];
    option.entries.forEach(entry => {
      if (entry.levelGate > progressionLevel) return;
      names.push(...findCatalogSpellNamesInText(entry.text, catalog));
    });
    return uniqueSpellNames(names);
  }

  function getNamedSpellGrantTable(text, optionNames) {
    const markers = [];
    for (const name of optionNames || []) {
      const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'ig');
      let match;
      while ((match = pattern.exec(text))) markers.push({ name, index: match.index, length: match[0].length });
    }
    const ordered = markers
      .filter(marker => /\b\d+(?:st|nd|rd|th)\b/i.test(text.slice(marker.index + marker.length, marker.index + marker.length + 80)))
      .sort((a, b) => a.index - b.index);
    const options = ordered.map((marker, index) => {
      const start = marker.index + marker.length;
      const end = index + 1 < ordered.length ? ordered[index + 1].index : text.length;
      return {
        name: marker.name,
        entries: parseLeveledSpellListText(text.slice(start, end)),
      };
    }).filter(option => option.entries.length);
    return options.length ? { options } : null;
  }

  function parseLeveledSpellListText(text) {
    const markers = Array.from(String(text || '').matchAll(/\b(\d+)(?:st|nd|rd|th)(?:\s+level)?\b/ig));
    return markers.map((marker, index) => {
      const start = marker.index + marker[0].length;
      const end = index + 1 < markers.length ? markers[index + 1].index : text.length;
      return {
        levelGate: Number(marker[1]) || 1,
        text: text.slice(start, end),
      };
    }).filter(entry => cleanDetailValue(entry.text));
  }

  function resolveChoiceSpellGrantOption(table, player, feature) {
    const explicit = getExplicitSpellGrantChoice(player, feature, table.options.map(option => option.name));
    if (explicit) return explicit;
    return inferSpellGrantChoiceFromPlayerSpells(table, player);
  }

  function getExplicitSpellGrantChoice(player, feature, options) {
    const sources = [
      player && player.featureChoices,
      player && player.ruleChoices && player.ruleChoices.featureChoices,
      player && player.levelChoices,
    ].filter(source => source && typeof source === 'object');
    const keys = [
      feature && feature.id,
      feature && feature.name,
      `${feature && feature.id}:choice`,
      `${feature && feature.id}:land`,
      `${feature && feature.id}:terrain`,
      `${feature && feature.name}:choice`,
      `${feature && feature.name}:land`,
      `${feature && feature.name}:terrain`,
      'Circle of the Land',
      'Circle Spells',
      'Druid Circle',
    ].map(normalizeName).filter(Boolean);
    const optionNames = (options || []).map(option => ({ raw: option, key: normalizeName(option) }));
    for (const source of sources) {
      for (const [rawKey, rawValue] of Object.entries(source)) {
        const key = normalizeName(rawKey);
        if (!keys.includes(key) && !keys.some(candidate => key.includes(candidate))) continue;
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        for (const value of values) {
          const valueKey = normalizeName(value);
          const matched = optionNames.find(option => option.key === valueKey);
          if (matched) return matched.raw;
        }
      }
    }
    return '';
  }

  function inferSpellGrantChoiceFromPlayerSpells(table, player) {
    const selected = new Set((player && player.spells || []).map(normalizeName));
    if (!selected.size) return '';
    const scores = (table.options || []).map(option => {
      const optionText = normalizeName(option.entries.map(entry => entry.text).join(' '));
      const tableNames = (player && player.spells || []).filter(name => {
        const key = normalizeName(name);
        return key && new RegExp(`\\b${escapeRegExp(key).replace(/\s+/g, '\\s+')}\\b`, 'i').test(optionText);
      });
      return {
        name: option.name,
        score: tableNames.filter(name => selected.has(normalizeName(name))).length,
      };
    }).sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
    if (!scores.length || scores[0].score <= 0) return '';
    if (scores[1] && scores[1].score === scores[0].score) return '';
    return scores[0].name;
  }

  function findGrantedSpellTableStart(text) {
    const patterns = [
      /\b[A-Z][A-Za-z' -]{0,40}\s+Domain Spells\b/,
      /\b[A-Z][A-Za-z' -]{0,40}\s+Oath Spells\b/,
      /\b[A-Z][A-Za-z' -]{0,40}\s+Circle Spells\b/,
      /\bspells table\b/i,
      /\badd the listed spells\b/i,
      /\badd the following spells\b/i,
    ];
    const starts = patterns
      .map(pattern => {
        const match = text.match(pattern);
        return match ? match.index : -1;
      })
      .filter(index => index >= 0);
    return starts.length ? Math.min(...starts) : -1;
  }

  function findCatalogSpellNamesInText(text, catalog) {
    const normalizedText = ` ${normalizeName(text)} `;
    const occupied = [];
    const names = [];
    catalog
      .filter(spell => spell && spell.name)
      .sort((a, b) => String(b.name).length - String(a.name).length)
      .forEach(spell => {
        const key = normalizeName(spell.name);
        if (!key) return;
        const pattern = new RegExp(`\\b${escapeRegExp(key).replace(/\s+/g, '\\s+')}\\b`, 'g');
        let match;
        while ((match = pattern.exec(normalizedText))) {
          const start = match.index;
          const end = start + match[0].length;
          if (occupied.some(range => start < range.end && end > range.start)) continue;
          occupied.push({ start, end });
          names.push(spell.name);
          break;
        }
      });
    return uniqueSpellNames(names);
  }

  function findCatalogSpellByNameFragment(value, catalog) {
    const clean = cleanRulesText(value)
      .replace(/\bas\s+a?\s*\d+(?:st|nd|rd|th)?[- ]level\b.*$/i, '')
      .replace(/\bwith this trait\b.*$/i, '')
      .replace(/\bwithout requiring\b.*$/i, '')
      .replace(/\bonce with this trait\b.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[,.;:\s]+|[,.;:\s]+$/g, '');
    const normalized = normalizeName(clean);
    if (!normalized) return null;
    return catalog.find(spell => normalizeName(spell && spell.name) === normalized)
      || catalog.find(spell => {
        const key = normalizeName(spell && spell.name);
        return key && normalized.includes(key);
      });
  }

  function getFeatureTextLevelGate(text) {
    const match = cleanRulesText(text).match(/\b(?:reach|reaches|starting at|when you reach|at)\s+(\d+)(?:st|nd|rd|th)?\s+level\b/i);
    return match ? Number(match[1]) || 0 : 0;
  }

  function groupSpellNamesByLevel(names, player, root) {
    const groups = new Map();
    for (const name of names || []) {
      const spell = findSpellDetails(name, player, root);
      const level = getSpellLevelNumber(spell && spell.level);
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level).push(name);
    }
    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, groupNames]) => ({
        level,
        label: level === 0 ? 'Cantrips' : `Level ${level}`,
        names: groupNames.sort((a, b) => compareSpellNames(a, b, player, root)),
      }));
  }

  function compareSpellNames(a, b, player, root) {
    const spellA = findSpellDetails(a, player, root);
    const spellB = findSpellDetails(b, player, root);
    return getSpellLevelNumber(spellA && spellA.level) - getSpellLevelNumber(spellB && spellB.level)
      || String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
  }

  function isSpellPrepared(player, name) {
    const prepared = new Set((player.preparedSpells || []).map(normalizeName));
    return prepared.has(normalizeName(name));
  }

  function getSpellMetadata(player, name, spell = null) {
    const byName = player && player.spellMetadataByName && typeof player.spellMetadataByName === 'object' ? player.spellMetadataByName : {};
    const byId = player && player.spellMetadata && typeof player.spellMetadata === 'object' ? player.spellMetadata : {};
    const normalized = normalizeName(name);
    for (const [key, value] of Object.entries(byName)) {
      if (normalizeName(key) === normalized || normalizeName(value && value.name) === normalized) return value;
    }
    const id = spell && spell.id;
    return id && byId[id] ? byId[id] : null;
  }

  function isGrantedLockedSpell(metadata) {
    return Boolean(metadata
      && (metadata.granted || metadata.autoGranted || Array.isArray(metadata.grantSources) && metadata.grantSources.length)
      && (metadata.nonRemovable || metadata.removable === false));
  }

  function isSpellNonRemovable(player, name, spell = null, root = null) {
    const metadata = getSpellMetadata(player, name, spell);
    return Boolean(metadata && (metadata.nonRemovable || metadata.removable === false))
      || hasGrantedSpellAction(player, name, spell)
      || hasGrantedSpellFeature(player, name, spell, root);
  }

  function findSpellDetailsByIdOrName(value, player, root) {
    const clean = cleanDetailValue(value).replace(/^Cast\s+/i, '');
    if (!clean) return null;
    const byName = findSpellDetails(clean, player, root);
    if (byName) return byName;
    const normalized = normalizeName(clean);
    const details = player && player.spellDetails || {};
    for (const spell of Object.values(details)) {
      if (normalizeName(spell && spell.id) === normalized || normalizeName(spell && spell.name) === normalized) return normalizeSpellDetails(spell);
    }
    const catalog = root && Array.isArray(root._spellCatalog) ? root._spellCatalog : [];
    const found = catalog.find(spell => normalizeName(spell.id) === normalized || normalizeName(spell.name) === normalized);
    return found ? normalizeSpellDetails(found) : null;
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
    const playerSpell = findPlayerSpellDetails(name, player);
    const catalogSpell = findCatalogSpellDetails(name, root);
    if (catalogSpell) return mergeSpellDetails(catalogSpell, playerSpell);
    return playerSpell ? normalizeSpellDetails(playerSpell) : null;
  }

  function findPlayerSpellDetails(name, player) {
    const details = player && player.spellDetails || {};
    const direct = details[name];
    if (direct) return direct;
    const normalized = normalizeName(name);
    for (const spell of Object.values(details)) {
      if (normalizeName(spell && spell.name) === normalized) return spell;
    }
    return null;
  }

  function findCatalogSpellDetails(name, root) {
    const normalized = normalizeName(name);
    const catalog = root && Array.isArray(root._spellCatalog) ? root._spellCatalog : [];
    const found = catalog.find(spell => normalizeName(spell.name) === normalized);
    return found || null;
  }

  function mergeSpellDetails(preferred, fallback) {
    const out = normalizeSpellDetails(fallback || {});
    const normalizedPreferred = normalizeSpellDetails(preferred || {});
    Object.entries(normalizedPreferred).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).length) return;
      out[key] = value;
    });
    return out.name ? out : null;
  }

  async function ensureSpellCatalog(root) {
    if (root._spellCatalog || root._spellCatalogLoading) return;
    const target = root.querySelector('[data-spell-panel]');
    if (!target) return;
    root._spellCatalogLoading = true;
    try {
      root._spellCatalog = await loadRuleCatalog(root, 'spells', target.dataset.spellsUrl || '../../data/spells.json', { array: true });
      if (root._playerState) {
        renderActionsPanel(root, root._playerState);
        renderCombatFeatureActions(root, root._playerState);
        renderSpellPanel(root, root._playerState);
      }
    } catch (error) {
      root._spellCatalog = [];
    } finally {
      root._spellCatalogLoading = false;
    }
  }

  function renderSpellSearchFilters() {
    return `<div class="equipment-controls" data-spell-search-filters>
      <label class="equipment-control-field">
        <span>Level</span>
        <select data-spell-search-filter data-spell-level-filter aria-label="Filter spell level">
          ${renderSimpleOptions([
            ['all', 'All levels'],
            ['0', 'Cantrips'],
            ['1', '1st'],
            ['2', '2nd'],
            ['3', '3rd'],
            ['4', '4th'],
            ['5', '5th'],
            ['6', '6th'],
            ['7', '7th'],
            ['8', '8th'],
            ['9', '9th'],
          ], 'all')}
        </select>
      </label>
      <label class="equipment-control-field">
        <span>Class</span>
        <select data-spell-search-filter data-spell-class-filter aria-label="Filter spell class">
          ${renderSimpleOptions([['all', 'All classes'], ...SPELL_SEARCH_CLASS_OPTIONS.map(className => [className, className])], 'all')}
        </select>
      </label>
      <label class="equipment-control-field">
        <span>School</span>
        <select data-spell-search-filter data-spell-school-filter aria-label="Filter spell school">
          ${renderSimpleOptions([['all', 'All schools'], ...SPELL_SEARCH_SCHOOL_OPTIONS.map(school => [school, school])], 'all')}
        </select>
      </label>
      <label class="equipment-control-field">
        <span>Source / Meta</span>
        <input data-spell-search-filter data-spell-metadata-filter type="search" placeholder="PHB, action, range..." aria-label="Filter spell source or metadata">
      </label>
    </div>`;
  }

  function readSpellSearchState(root, query = null) {
    const dialog = root && root.querySelector('[data-spell-search-dialog]');
    const input = dialog && dialog.querySelector('[data-spell-search-input]');
    return {
      query: query !== null ? String(query || '').trim() : String(input && input.value || '').trim(),
      level: readControlValue(dialog, '[data-spell-level-filter]', 'all'),
      className: readControlValue(dialog, '[data-spell-class-filter]', 'all'),
      school: readControlValue(dialog, '[data-spell-school-filter]', 'all'),
      metadata: readControlValue(dialog, '[data-spell-metadata-filter]', ''),
    };
  }

  function hasSpellAdvancedSearchFilters(state) {
    return Boolean(
      (state && state.level && state.level !== 'all')
      || (state && state.className && state.className !== 'all')
      || (state && state.school && state.school !== 'all')
      || (state && state.metadata)
    );
  }

  function hasSpellSearchState(state) {
    return Boolean(state && (state.query || hasSpellAdvancedSearchFilters(state)));
  }

  function renderSpellSearchResults(root, query) {
    const target = root.querySelector('[data-spell-search-results]');
    if (!target) return;
    const state = readSpellSearchState(root, query);
    const clean = normalizeName(state.query);
    const catalog = Array.isArray(root._spellCatalog) ? root._spellCatalog : [];
    if (!hasSpellSearchState(state)) {
      target.innerHTML = '<p class="empty-note">Search by name, or use filters to browse the spell catalog.</p>';
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
      .map(spell => normalizeSpellDetails(spell))
      .filter(Boolean)
      .map(spell => ({ spell, score: clean ? scoreSpell(spell, clean) : 1 }))
      .filter(match => (!clean || match.score > 0) && matchesSpellSearchFilters(match.spell, state))
      .sort((a, b) => clean
        ? b.score - a.score || compareText(a.spell.name, b.spell.name)
        : compareNumber(getSpellLevelNumber(a.spell.level), getSpellLevelNumber(b.spell.level)) || compareText(a.spell.name, b.spell.name))
      .slice(0, 24)
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
    }).join('') : '<p class="empty-note">No spells match those search filters.</p>';
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
    const clean = normalizeName(query);
    const name = normalizeName(spell && spell.name);
    const haystack = getSpellSearchText(spell);
    const terms = clean.split(/\s+/).filter(Boolean);
    if (!clean) return 0;
    if (name === clean) return 100;
    if (name.startsWith(clean)) return 80;
    if (name.includes(clean)) return 60;
    if (haystack.includes(clean)) return 25;
    if (terms.length > 1 && terms.every(term => haystack.includes(term))) return 15;
    return 0;
  }

  function matchesSpellSearchFilters(spell, state) {
    if (!spell || !state) return false;
    if (state.level && state.level !== 'all' && String(getSpellLevelNumber(spell.level)) !== String(state.level)) return false;
    if (state.className && state.className !== 'all' && !spellMatchesClass(spell, state.className)) return false;
    if (state.school && state.school !== 'all' && normalizeName(spell.school) !== normalizeName(state.school)) return false;
    if (state.metadata && !matchesSearchTerms(getSpellMetadataSearchText(spell), state.metadata)) return false;
    return true;
  }

  function spellMatchesClass(spell, className) {
    const clean = normalizeName(className);
    const haystack = normalizeName([
      spell && spell.classes,
      spell && spell.optionalClasses,
      spell && spell.subclasses,
    ].filter(Boolean).join(' '));
    return Boolean(clean && haystack.includes(clean));
  }

  function getSpellSearchText(spell) {
    return normalizeName([
      spell && spell.name,
      spell && spell.level,
      spell && spell.school,
      spell && spell.classes,
      spell && spell.optionalClasses,
      spell && spell.subclasses,
      spell && spell.source,
      spell && spell.page,
      spell && spell.castingTime,
      spell && spell.duration,
      spell && spell.range,
      spell && spell.components,
      spell && spell.timing,
      spell && spell.attackType,
      spell && spell.saveAbility,
      spell && spell.damage && spell.damage.dice,
      spell && spell.damage && spell.damage.damageType,
      spell && spell.text,
      spell && spell.higherLevels,
    ].filter(Boolean).join(' '));
  }

  function getSpellMetadataSearchText(spell) {
    return normalizeName([
      spell && spell.source,
      spell && spell.page,
      spell && spell.level,
      spell && spell.school,
      spell && spell.castingTime,
      spell && spell.duration,
      spell && spell.range,
      spell && spell.components,
      spell && spell.timing,
      spell && spell.attackType,
      spell && spell.saveAbility,
      spell && spell.damage && spell.damage.damageType,
    ].filter(Boolean).join(' '));
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

  function renderEquipmentRow(item, player, containers = null) {
    const equipped = isItemEquipped(player, item);
    const availableContainers = containers || getEquipmentContainers(player);
    const containerId = getItemContainerId(item, player, availableContainers);
    return `<article class="equipment-row ${equipped ? 'active' : ''}" role="listitem">
      <label class="equipment-check">
        <input type="checkbox" data-equip-id="${escapeAttr(item.id)}" ${equipped ? 'checked' : ''}>
        <span>${equipped ? 'Equipped' : 'Equip'}</span>
      </label>
      <details class="equipment-details-toggle">
        <summary data-open-equipment-details="${escapeAttr(item.id)}" aria-label="${escapeAttr(`Open details for ${item.name}`)}" title="Open details">
          <span class="equipment-title">
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(formatItemSubtitle(item))}</small>
          </span>
          <span class="equipment-meta">${renderItemBadges(item)}</span>
          <span class="equipment-statline">${escapeHtml(formatItemStatline(item))}</span>
        </summary>
      </details>
      <div class="equipment-row-actions">
        <label class="equipment-container-picker">
          <span>In</span>
          <select data-equipment-container="${escapeAttr(item.id)}" aria-label="${escapeAttr(`Container for ${item.name}`)}">
            ${renderEquipmentContainerOptions(availableContainers, containerId)}
          </select>
        </label>
        <button class="text-button" type="button" data-open-equipment-details="${escapeAttr(item.id)}">Details</button>
        <button class="text-button" type="button" data-remove-equipment="${escapeAttr(item.id)}">Remove</button>
      </div>
    </article>`;
  }

  function openEquipmentDetailDialog(root, itemId) {
    const player = root && root._playerState;
    const item = player && (player.inventory || []).find(candidate => candidate.id === itemId);
    const dialog = root && root.querySelector('[data-equipment-detail-dialog]');
    const content = dialog && dialog.querySelector('[data-equipment-detail-content]');
    if (!item || !dialog || !content) return;
    content.innerHTML = renderEquipmentDetailDialog(item, player);
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
    window.setTimeout(() => {
      const close = dialog.querySelector('[data-close-dialog]');
      if (close) close.focus();
    }, 0);
  }

  function openCombatActionDetailDialog(root, trigger) {
    const card = trigger && trigger.closest('[data-action-card]');
    const template = card && card.querySelector('[data-action-detail-template]');
    const dialog = root && root.querySelector('[data-combat-action-dialog]');
    const content = dialog && dialog.querySelector('[data-combat-action-dialog-content]');
    if (!template || !dialog || !content) return;
    content.innerHTML = template.innerHTML;
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
    window.setTimeout(() => {
      const close = dialog.querySelector('[data-close-dialog]');
      if (close) close.focus();
    }, 0);
  }

  function renderEquipmentDetailDialog(item, player) {
    return `<div class="sheet-search-head">
      <div>
        <h2>${escapeHtml(item.name)}</h2>
        <p class="empty-note">${escapeHtml([formatItemSubtitle(item), formatItemStatline(item)].filter(Boolean).join(' / '))}</p>
      </div>
      <button class="text-button" type="button" data-close-dialog>Close</button>
    </div>
    ${renderEquipmentDetails(item, player, { fullText: true })}`;
  }

  function renderEquipmentDetails(item, player, options = {}) {
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
      ${renderEquipmentEffectSection(item)}
      ${renderEquipmentResourceSection(item, player)}
      ${remainingAbilities.length ? `<section class="equipment-detail-section">
        <h3>Item Abilities</h3>
        <ul>${remainingAbilities.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>
      </section>` : ''}
      ${details.text ? `<p class="item-rules">${escapeHtml(options.fullText ? cleanRulesText(details.text) : truncateText(details.text, 1100))}</p>` : '<p class="empty-note">No item rules text is recorded yet.</p>'}
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

  function renderEquipmentEffectSection(item) {
    const effects = item.details && Array.isArray(item.details.effects) ? item.details.effects : [];
    if (!effects.length) return '';
    return `<section class="equipment-detail-section">
      <h3>Item Effects</h3>
      <div class="equipment-action-list">
        ${effects.map(effect => renderEquipmentEffect(item, effect)).join('')}
      </div>
    </section>`;
  }

  function renderEquipmentEffect(item, effect) {
    const title = effect.name || effect.label || effect.id || item.name;
    const meta = [effect.kind, effect.value !== undefined ? formatBonus(effect.value) : ''].filter(Boolean).join(' / ');
    const detail = cleanRulesText(effect.text || formatEffectSummary(effect));
    return `<div class="equipment-action">
      <div>
        <strong>${escapeHtml(title)}</strong>
        ${meta ? `<small>${escapeHtml(meta)}</small>` : ''}
      </div>
      ${detail ? `<p>${escapeHtml(detail)}</p>` : ''}
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

  function renderNotesForm(root, player) {
    const form = root.querySelector('[data-player-notes-form]');
    if (!form) return;
    setFormValue(form, 'notes', player.notes || '');
  }

  function bindPlayerSheetEvents(root) {
    if (root.dataset.playerEventsBound === 'true') return;
    root.dataset.playerEventsBound = 'true';

    root.addEventListener('input', event => {
      const weaponToggleValue = event.target.closest('[data-weapon-toggle-value]');
      if (!weaponToggleValue) return;
      queueWeaponToggleManualValueSave(root, weaponToggleValue);
    });

    root.addEventListener('change', event => {
      const weaponMode = event.target.closest('[data-weapon-mode]');
      if (weaponMode) {
        const player = root._playerState;
        if (!player) return;
        saveWeaponCombatState(root, player, weaponMode.dataset.weaponMode, { handMode: weaponMode.value === 'two' ? 'two' : 'one' });
        return;
      }

      const weaponAbility = event.target.closest('[data-weapon-ability]');
      if (weaponAbility) {
        const player = root._playerState;
        if (!player) return;
        const abilityMode = weaponAbility.value === 'dex' ? 'dex' : 'str';
        saveWeaponCombatState(root, player, weaponAbility.dataset.weaponAbility, { abilityMode });
        return;
      }

      const weaponToggle = event.target.closest('[data-weapon-toggle]');
      if (weaponToggle) {
        const player = root._playerState;
        if (!player) return;
        const option = weaponToggle.dataset.weaponOption;
        if (!option) return;
        saveWeaponToggleState(root, player, weaponToggle.dataset.weaponToggle, option, weaponToggle.checked);
        return;
      }

      const weaponToggleValue = event.target.closest('[data-weapon-toggle-value]');
      if (weaponToggleValue) {
        flushWeaponToggleManualValueSave(root, weaponToggleValue);
        return;
      }

      const combatToggle = event.target.closest('[data-combat-toggle]');
      if (combatToggle) {
        const player = root._playerState;
        if (!player) return;
        const combatToggles = { ...(player.combatToggles || {}), [combatToggle.dataset.combatToggle]: combatToggle.checked };
        saveAndHydratePlayer(root, player, { combatToggles });
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
        const panel = temporaryCustom.closest('.temporary-effects, .combat-custom-effect-controls');
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

      const equipmentUiControl = event.target.closest('[data-equipment-kind-filter], [data-equipment-container-filter], [data-equipment-sort], [data-equipment-grouped]');
      if (equipmentUiControl) {
        root._equipmentUi = readEquipmentUiState(root);
        updateEquipmentList(root);
        return;
      }

      const equipmentSearchFilter = event.target.closest('[data-equipment-search-filter]');
      if (equipmentSearchFilter) {
        renderEquipmentSearchResults(root);
        return;
      }

      const spellSearchFilter = event.target.closest('[data-spell-search-filter]');
      if (spellSearchFilter) {
        renderSpellSearchResults(root);
        return;
      }

      const equipmentContainer = event.target.closest('[data-equipment-container]');
      if (equipmentContainer) {
        const player = root._playerState;
        if (!player) return;
        const item = (player.inventory || []).find(candidate => candidate.id === equipmentContainer.dataset.equipmentContainer);
        if (!item) return;
        const containers = getEquipmentContainers(player);
        const targetContainer = cleanEquipmentContainerId(equipmentContainer.value);
        if (targetContainer && !containers.some(container => container.id === targetContainer)) return;
        saveEquipmentContainerAssignment(root, player, item, targetContainer);
        const label = targetContainer && containers.find(container => container.id === targetContainer);
        renderSheetLog(root, `${item.name} moved`, targetContainer && label ? `Stored in ${label.name}.` : 'Set to carried.');
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

      const actionJump = event.target.closest('[data-action-group-jump]');
      if (actionJump) {
        event.preventDefault();
        const group = findActionGroupSection(actionJump.closest('.actions-panel'), actionJump.dataset.actionGroupJump);
        if (group) group.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      const combatNav = event.target.closest('[data-combat-nav]');
      if (combatNav) {
        event.preventDefault();
        activateCombatSourceTab(root, combatNav.dataset.combatNav, combatNav.closest('[data-combat-tabs]'));
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

      const actionDetails = event.target.closest('[data-open-action-details]');
      if (actionDetails) {
        event.preventDefault();
        event.stopPropagation();
        openCombatActionDetailDialog(root, actionDetails);
        return;
      }

      const ruleActivationUse = event.target.closest('[data-rule-activation-use]');
      if (ruleActivationUse) {
        event.preventDefault();
        event.stopPropagation();
        const player = root._playerState;
        if (player) useRuleActivation(root, player, ruleActivationUse.dataset.ruleActivationUse);
        return;
      }

      const resourceSpend = event.target.closest('[data-resource-spend]');
      if (resourceSpend) {
        event.preventDefault();
        event.stopPropagation();
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
        event.preventDefault();
        const player = root._playerState;
        const item = player && Array.isArray(player.inventory) && player.inventory.find(candidate => candidate.id === rollButton.dataset.weaponId);
        if (item && item.weapon) {
          rollButton.disabled = true;
          renderRoll(root, player, item.weapon, rollButton.dataset.rollType)
            .finally(() => {
              if (rollButton.isConnected) rollButton.disabled = false;
            });
        }
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

      const actionRoll = event.target.closest('[data-roll-action]');
      if (actionRoll) {
        event.preventDefault();
        event.stopPropagation();
        renderActionRoll(root, actionRoll);
        return;
      }

      const featureRoll = event.target.closest('[data-roll-feature]');
      if (featureRoll) {
        event.preventDefault();
        event.stopPropagation();
        const player = root._playerState;
        if (player) renderFeatureRoll(root, player, featureRoll.dataset.rollFeature);
        return;
      }

      const saveRoll = event.target.closest('[data-roll-save]');
      if (saveRoll) {
        event.preventDefault();
        const player = root._playerState;
        const ability = saveRoll.dataset.rollSave;
        if (player && ability) renderD20Roll(root, `${ABILITY_NAMES[ability] || ability.toUpperCase()} save`, getSaveBonus(player, ability));
        return;
      }

      const skillRoll = event.target.closest('[data-roll-skill]');
      if (skillRoll) {
        event.preventDefault();
        const player = root._playerState;
        const skill = skillRoll.dataset.rollSkill;
        if (player && skill) renderD20Roll(root, `${formatSkillLabel(skill)} check`, getSkillBonus(player, skill));
        return;
      }

      const openEquipmentSearch = event.target.closest('[data-open-equipment-search]');
      if (openEquipmentSearch) {
        event.preventDefault();
        openSheetSearchDialog(root, '[data-equipment-search-dialog]', '[data-equipment-search-input]', renderEquipmentSearchResults);
        return;
      }

      const openSpellSearch = event.target.closest('[data-open-spell-search]');
      if (openSpellSearch) {
        event.preventDefault();
        openSheetSearchDialog(root, '[data-spell-search-dialog]', '[data-spell-search-input]', renderSpellSearchResults);
        return;
      }

      const closeDialog = event.target.closest('[data-close-dialog]');
      if (closeDialog) {
        event.preventDefault();
        closeSheetSearchDialog(closeDialog.closest('dialog'));
        return;
      }

      const reset = event.target.closest('[data-player-reset]');
      if (reset) {
        const player = root._playerState;
        if (!player) return;
        fetchApi(`players/${encodeURIComponent(player.id)}`)
          .then(cloudPlayer => hydratePlayerSheet(root, cloudPlayer))
          .catch(error => renderPlayerSheetError(root, error.message));
        return;
      }

      const rest = event.target.closest('[data-rest-type]');
      if (rest) {
        const player = root._playerState;
        if (!player) return;
        applyRest(root, player, rest.dataset.restType);
        return;
      }

      const addStartingGear = event.target.closest('[data-add-starting-gear]');
      if (addStartingGear) {
        event.preventDefault();
        const player = root._playerState;
        if (!player) return;
        addStartingGear.disabled = true;
        setStartingGearStatus(root, 'Loading cloud starting gear...');
        resolveStartingGearEntries(root, player)
          .then(entries => {
            const sourceKey = addStartingGear.dataset.startingGearSource || '';
            const scopedEntries = sourceKey ? entries.filter(entry => entry.sourceKey === sourceKey) : entries;
            const missing = getMissingStartingGear(player, scopedEntries);
            if (!entries.length) {
              renderSheetLog(root, 'Starting gear unavailable', 'No cloud character, sheet, or rules starting gear source was found.');
              setStartingGearStatus(root, 'No starting gear source found');
              addStartingGear.disabled = false;
              return null;
            }
            if (!missing.length) {
              renderSheetLog(root, 'Starting gear already added', 'No missing starting gear found.');
              setStartingGearStatus(root, 'All starting gear already present');
              addStartingGear.disabled = true;
              return null;
            }
            const added = missing.map(entry => entry.itemName || entry.label);
            const nextEquipment = [...(player.equipment || []), ...added];
            const edits = { ...loadPlayerEdits(player.id), equipment: nextEquipment };
            if (added.some(isArmorName)) {
              edits.acMode = 'official';
              edits.ac = null;
            }
            return saveAndHydratePlayer(root, player, edits).then(savedPlayer => {
              if (savedPlayer) renderSheetLog(root, 'Starting gear added', `${added.length} item${added.length === 1 ? '' : 's'} added from cloud/rules data.`);
              else addStartingGear.disabled = false;
              return savedPlayer;
            });
          })
          .catch(() => {
            renderSheetLog(root, 'Starting gear unavailable', 'Cloud/rules starting gear could not be loaded.');
            setStartingGearStatus(root, 'Starting gear load failed');
            addStartingGear.disabled = false;
          });
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

      const openEquipmentDetails = event.target.closest('[data-open-equipment-details]');
      if (openEquipmentDetails) {
        event.preventDefault();
        openEquipmentDetailDialog(root, openEquipmentDetails.dataset.openEquipmentDetails);
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
        edits.spellDetails = { ...(player.spellDetails || {}), [spell.name || addSpellScroll.dataset.addSpellScroll]: spell };
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
        if (spell) edits.spellDetails = { ...(player.spellDetails || {}), [spell.name || spellName]: spell };
        saveAndHydratePlayer(root, player, edits);
        return;
      }

      const removeSpell = event.target.closest('[data-remove-spell]');
      if (removeSpell) {
        event.preventDefault();
        const player = root._playerState;
        if (!player) return;
        const target = normalizeName(removeSpell.dataset.removeSpell);
        const currentSpell = (player.spells || []).find(name => normalizeName(name) === target);
        if (currentSpell && isSpellNonRemovable(player, currentSpell, findSpellDetails(currentSpell, player, root), root)) {
          renderSheetLog(root, `${currentSpell} is locked`, 'Class, subclass, race, and background spells cannot be removed from this sheet.');
          return;
        }
        const nextSpells = (player.spells || []).filter(name => normalizeName(name) !== target);
        const edits = { ...loadPlayerEdits(player.id), spells: nextSpells };
        edits.spellDetails = Object.fromEntries(Object.entries(player.spellDetails || {})
          .filter(([key, spell]) => nextSpells.some(name => normalizeName(name) === normalizeName(key) || normalizeName(name) === normalizeName(spell && spell.name))));
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

      const equipmentSearch = event.target.closest('[data-equipment-search-input], [data-equipment-search-filter]');
      if (equipmentSearch) {
        window.clearTimeout(root._equipmentSearchTimer);
        root._equipmentSearchTimer = window.setTimeout(() => renderEquipmentSearchResults(root), 160);
        return;
      }

      const equipmentFilter = event.target.closest('[data-equipment-filter]');
      if (equipmentFilter) {
        root._equipmentUi = readEquipmentUiState(root);
        updateEquipmentList(root);
        return;
      }

      const input = event.target.closest('[data-spell-search-input], [data-spell-search-filter]');
      if (!input) return;
      window.clearTimeout(root._spellSearchTimer);
      root._spellSearchTimer = window.setTimeout(() => renderSpellSearchResults(root), 160);
    });

    root.addEventListener('submit', event => {
      const containerForm = event.target.closest('[data-equipment-container-form]');
      if (!containerForm) return;
      event.preventDefault();
      handleEquipmentContainerSubmit(root, containerForm);
    });

    const notesForm = root.querySelector('[data-player-notes-form]');
    if (notesForm) {
      notesForm.addEventListener('submit', event => {
        event.preventDefault();
        handleNotesSubmit(root, notesForm);
      });
    }
  }

  async function handleNotesSubmit(root, form) {
    const player = root._playerState;
    if (!player) return;
    const formData = new FormData(form);
    const edits = {
      ...loadPlayerEdits(player.id),
      notes: String(formData.get('notes') || ''),
    };
    const status = root.querySelector('[data-player-notes-status]');
    if (status) status.textContent = 'Saving to cloud...';
    const savedPlayer = await trySavePlayerToApi(player.id, edits);
    if (savedPlayer) {
      if (status) status.textContent = 'Saved to cloud';
      hydratePlayerSheet(root, savedPlayer);
    } else if (status) {
      status.textContent = 'Cloud save failed';
    }
  }

  async function saveAndHydratePlayer(root, player, edits) {
    const savedPlayer = await trySavePlayerToApi(player.id, edits);
    if (savedPlayer) {
      hydratePlayerSheet(root, savedPlayer);
      return savedPlayer;
    }
    renderSheetLog(root, 'Cloud save failed', 'The sheet was not changed locally.');
    return null;
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

  function findActionGroupSection(panel, groupName) {
    const target = cleanDetailValue(groupName);
    if (!panel || !target) return null;
    return Array.from(panel.querySelectorAll('[data-action-group-section]'))
      .find(section => section.dataset.actionGroupSection === target) || null;
  }

  function activateCombatSourceTab(root, tabId, shell = null) {
    const target = cleanDetailValue(tabId);
    const container = shell || root && root.querySelector('[data-combat-tabs]');
    if (!target || !container) return;
    root._combatSourceTab = target;
    container.querySelectorAll('[data-combat-nav]').forEach(button => {
      const active = button.dataset.combatNav === target;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    container.querySelectorAll('[data-combat-pane]').forEach(panel => {
      const active = panel.dataset.combatPane === target;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
  }

  async function useRuleActivation(root, player, activationId) {
    const activation = getRuntimeRuleActivations(player, root).find(candidate => candidate.id === activationId);
    if (!activation) {
      renderSheetLog(root, 'Activation unavailable', 'This rule activation is not in the current rules data.');
      return;
    }
    const resourceId = activation.resourceId;
    if (!resourceId) {
      renderSheetLog(root, `${activation.label} activated`, activation.text || 'No tracked resource spent.');
      return;
    }
    const state = getResourceUseState(player, resourceId);
    const resourceCost = getRuleActivationResourceCost(activation);
    if (!state || state.max === null) {
      renderSheetLog(root, 'Resource not tracked', 'This activation does not have a spendable limit yet.');
      return;
    }
    if (state.available < resourceCost) {
      renderSheetLog(root, `${state.resource.name || state.resource.id}: empty`, `Resets on ${formatReset(state.resource.reset)}.`);
      return;
    }

    const resourceUses = { ...(player.resourceUses || {}), [state.resource.id]: state.used + resourceCost };
    const edits = { ...loadPlayerEdits(player.id), resourceUses };
    await saveAndHydratePlayer(root, player, edits);
    renderSheetLog(root, `${activation.label} activated`, `${state.available - resourceCost} / ${state.max} ${state.resource.name || state.resource.id} left; resets on ${formatReset(state.resource.reset)}.`);
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
    const featureCast = getFeatureCastSpellGrantState(player, spellName, spell);
    if (featureCast && featureCast.state && featureCast.state.available > 0) {
      await saveFeatureSpellCastSpend(root, player, featureCast, `${spell.name} cast`);
      return;
    }
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

  async function saveFeatureSpellCastSpend(root, player, featureCast, label) {
    const state = featureCast && featureCast.state;
    if (!state || !state.resource) return;
    const resourceUses = { ...(player.resourceUses || {}), [state.resource.id]: state.used + 1 };
    const edits = { ...loadPlayerEdits(player.id), resourceUses };
    await saveAndHydratePlayer(root, player, edits);
    renderSheetLog(root, label, `${state.available - 1} / ${state.max} ${state.resource.name || state.resource.id} left; resets on ${formatReset(state.resource.reset)}.`);
  }

  async function consumeWeaponRollActivations(root, player, weapon, rollType) {
    const consumeOn = rollType === 'attack' ? 'attack-roll' : 'damage-roll';
    const activations = uniqueWeaponActivationUses(weapon && weapon.activationUses)
      .filter(activation => normalizeName(activation && activation.consumeOn || 'damage-roll') === normalizeName(consumeOn));
    if (!activations.length) return '';

    const resourceUses = { ...(player.resourceUses || {}) };
    const combatToggles = { ...(player.combatToggles || {}) };
    const weapons = { ...(combatToggles.weapons || {}) };
    const weaponToggles = { ...(combatToggles.weaponToggles || {}) };
    const weaponState = { ...(weapons[weapon.id] || {}) };
    const spentLabels = [];

    for (const activation of activations) {
      const state = getResourceUseState(player, activation.resourceId);
      const resourceCost = Math.max(0, Number(activation.resourceCost) || 1);
      if (!state || state.max === null) continue;
      const currentUsed = clampNumber(Number(resourceUses[state.resource.id]) || state.used || 0, 0, state.max);
      const available = state.max - currentUsed;
      if (available < resourceCost) continue;
      resourceUses[state.resource.id] = currentUsed + resourceCost;
      spentLabels.push(`${activation.label || state.resource.name || state.resource.id} ${available - resourceCost} / ${state.max} left`);
      if (activation.shared) {
        const stateKey = activation.stateKey || activation.toggleId;
        const sharedState = { ...(weaponToggles[stateKey] || {}) };
        getWeaponToggleAliases(activation.toggleId).forEach(alias => {
          sharedState[alias] = false;
        });
        weaponToggles[stateKey] = sharedState;
      } else {
        getWeaponToggleAliases(activation.toggleId).forEach(alias => {
          weaponState[alias] = false;
        });
      }
    }

    if (!spentLabels.length) return '';
    weapons[weapon.id] = weaponState;
    combatToggles.weapons = weapons;
    combatToggles.weaponToggles = weaponToggles;
    const saved = await saveAndHydratePlayer(root, player, {
      ...loadPlayerEdits(player.id),
      resourceUses,
      combatToggles,
    });
    return saved ? `spent ${spentLabels.join(', ')}` : 'activation use was not saved';
  }

  function uniqueWeaponActivationUses(activations) {
    const seen = new Set();
    const out = [];
    for (const activation of activations || []) {
      const key = activation && [activation.toggleId, activation.resourceId, activation.consumeOn].filter(Boolean).join(':');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(activation);
    }
    return out;
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
    const resourceUses = { ...(player.resourceUses || {}) };
    for (const resource of player.resources || []) {
      if (restType === 'long' || resource.reset === 'shortRest' || resource.reset === 'longRestUntilFontOfInspirationThenShortRest') {
        delete resourceUses[resource.id];
      }
    }
    const edits = { resourceUses };
    if (restType === 'long') {
      edits.spellSlotUses = {};
      edits.tempHp = 0;
      if (player.maxHp !== null && player.maxHp !== undefined) edits.currentHp = player.maxHp;
    }
    setRestStatus(root, restType === 'long' ? 'Applying long rest...' : 'Applying short rest...');
    const savedPlayer = await saveAndHydratePlayer(root, player, edits);
    setRestStatus(root, savedPlayer ? (restType === 'long' ? 'Long rest applied' : 'Short rest applied') : 'Rest save failed');
  }

  function setRestStatus(root, message) {
    root.querySelectorAll('[data-resource-status]').forEach(status => {
      status.textContent = message;
    });
  }

  function saveWeaponCombatState(root, player, weaponId, patch) {
    if (!weaponId) return;
    const combatToggles = { ...(player.combatToggles || {}) };
    const weapons = { ...(combatToggles.weapons || {}) };
    weapons[weaponId] = { ...(weapons[weaponId] || {}), ...patch };
    combatToggles.weapons = weapons;
    saveAndHydratePlayer(root, player, { combatToggles });
  }

  async function saveWeaponToggleState(root, player, weaponId, option, checked) {
    if (!weaponId || !option) return;
    const item = getInventoryItemById(player, weaponId);
    const toggle = findWeaponToggleForControl(player, weaponId, option);
    const shared = toggle && usesSharedWeaponToggleState(toggle);
    const currentState = shared ? getSharedWeaponToggleState(player, toggle) : getWeaponCombatState(player, weaponId, item && item.weapon && item.weapon.properties || []);
    const wasActive = toggle ? isWeaponToggleActive(currentState, toggle) : Boolean(currentState && currentState[option]);
    const patch = { [option]: checked };
    getWeaponToggleAliases(toggle || option).forEach(alias => {
      if (alias !== option) patch[alias] = false;
    });
    const combatToggles = { ...(player.combatToggles || {}) };
    if (shared) {
      const key = getSharedWeaponToggleStateKey(toggle);
      const weaponToggles = { ...(combatToggles.weaponToggles || {}) };
      weaponToggles[key] = { ...(weaponToggles[key] || {}), ...patch };
      combatToggles.weaponToggles = weaponToggles;
    } else {
      const weapons = { ...(combatToggles.weapons || {}) };
      weapons[weaponId] = { ...(weapons[weaponId] || {}), ...patch };
      combatToggles.weapons = weapons;
    }
    const edits = { ...loadPlayerEdits(player.id), combatToggles };

    if (checked && toggle && !wasActive && getWeaponToggleConsumeOn(toggle) === 'activation') {
      const sourceItem = findToggleSourceItem(player, toggle);
      const resourceId = getWeaponToggleResourceId(player, sourceItem || item || { id: weaponId }, toggle);
      const resourceState = resourceId ? getResourceUseState(player, resourceId) : null;
      if (resourceState && resourceState.max !== null) {
        const resourceCost = getWeaponToggleResourceCost(toggle, currentState);
        if (resourceState.available < resourceCost) {
          renderSheetLog(root, `${resourceState.resource.name || resourceState.resource.id}: empty`, `Resets on ${formatReset(resourceState.resource.reset)}.`);
          return;
        }
        edits.resourceUses = { ...(player.resourceUses || {}), [resourceState.resource.id]: resourceState.used + resourceCost };
      }
    }

    await saveAndHydratePlayer(root, player, edits);
  }

  function getWeaponToggleValueTimerKey(input) {
    return [
      input && input.dataset.weaponToggleValue,
      input && input.dataset.weaponOption,
      input && input.dataset.weaponValueKey,
    ].filter(Boolean).join(':');
  }

  function queueWeaponToggleManualValueSave(root, input) {
    if (!root || !input) return;
    const key = getWeaponToggleValueTimerKey(input);
    if (!key) return;
    if (!root._weaponToggleValueTimers) root._weaponToggleValueTimers = new Map();
    const timers = root._weaponToggleValueTimers;
    if (timers.has(key)) clearTimeout(timers.get(key));
    const payload = {
      weaponId: input.dataset.weaponToggleValue,
      option: input.dataset.weaponOption,
      valueKey: input.dataset.weaponValueKey,
      value: input.value,
    };
    timers.set(key, window.setTimeout(() => {
      timers.delete(key);
      if (payload.value === '') return;
      const player = root._playerState;
      if (!player) return;
      saveWeaponToggleManualValue(root, player, payload.weaponId, payload.option, payload.valueKey, payload.value);
    }, 300));
  }

  function flushWeaponToggleManualValueSave(root, input) {
    if (!root || !input) return;
    const key = getWeaponToggleValueTimerKey(input);
    if (root._weaponToggleValueTimers && key && root._weaponToggleValueTimers.has(key)) {
      clearTimeout(root._weaponToggleValueTimers.get(key));
      root._weaponToggleValueTimers.delete(key);
    }
    if (input.value === '') return;
    const player = root._playerState;
    if (!player) return;
    saveWeaponToggleManualValue(root, player, input.dataset.weaponToggleValue, input.dataset.weaponOption, input.dataset.weaponValueKey, input.value);
  }

  function saveWeaponToggleManualValue(root, player, weaponId, option, valueKey, rawValue) {
    if (!weaponId || !valueKey || rawValue === '') return;
    const item = getInventoryItemById(player, weaponId);
    const toggle = findWeaponToggleForControl(player, weaponId, option);
    const effect = toggle ? getManualWeaponToggleEffect(toggle) : null;
    const shared = toggle && usesSharedWeaponToggleState(toggle);
    const state = shared ? getSharedWeaponToggleState(player, toggle) : getWeaponCombatState(player, weaponId, item && item.weapon && item.weapon.properties || []);
    const toggleValues = { ...(state.toggleValues && typeof state.toggleValues === 'object' ? state.toggleValues : {}) };
    const nextValue = normalizeWeaponToggleManualValue(rawValue, toggle, effect, getWeaponToggleDefaultValue(toggle, effect));
    const currentValue = normalizeWeaponToggleManualValue(
      toggleValues[valueKey] === null || toggleValues[valueKey] === undefined || toggleValues[valueKey] === '' ? state && state[valueKey] : toggleValues[valueKey],
      toggle,
      effect,
      getWeaponToggleDefaultValue(toggle, effect),
    );
    if (currentValue === nextValue && Number(state && state[valueKey]) === nextValue) return;
    toggleValues[valueKey] = nextValue;
    const valuePatch = { toggleValues, [valueKey]: nextValue };
    if (shared) {
      const combatToggles = { ...(player.combatToggles || {}) };
      const key = getSharedWeaponToggleStateKey(toggle);
      const weaponToggles = { ...(combatToggles.weaponToggles || {}) };
      weaponToggles[key] = { ...(weaponToggles[key] || {}), ...valuePatch };
      combatToggles.weaponToggles = weaponToggles;
      saveAndHydratePlayer(root, player, { combatToggles });
    } else {
      saveWeaponCombatState(root, player, weaponId, valuePatch);
    }
  }

  function getInventoryItemById(player, itemId) {
    return (Array.isArray(player && player.inventory) ? player.inventory : []).find(item => item.id === itemId) || null;
  }

  function findWeaponToggleForWeapon(player, weaponId, option) {
    const item = getInventoryItemById(player, weaponId);
    if (!item || !item.weapon) return null;
    const requested = new Set([option, ...getWeaponToggleAliases(option)].map(normalizeName).filter(Boolean));
    const context = {
      id: item.id,
      name: item.name,
      details: item.details,
      properties: item.weapon.properties || [],
      style: item.weapon.style,
      damageType: item.weapon.damageType,
    };
    return getWeaponToggleRulesForWeapon(player, context).find(toggle => {
      return getWeaponToggleAliases(toggle).some(alias => requested.has(normalizeName(alias)));
    }) || null;
  }

  function findWeaponToggleForControl(player, weaponId, option) {
    return findWeaponToggleForWeapon(player, weaponId, option) || findWeaponToggleByOption(player, option);
  }

  function findWeaponToggleByOption(player, option) {
    const requested = new Set([option, ...getWeaponToggleAliases(option)].map(normalizeName).filter(Boolean));
    for (const item of Array.isArray(player && player.inventory) ? player.inventory : []) {
      const toggles = item && item.details && Array.isArray(item.details.toggles) ? item.details.toggles : [];
      const match = toggles.find(toggle => {
        return getWeaponToggleAliases(toggle).some(alias => requested.has(normalizeName(alias)));
      });
      if (match) return match;
    }
    const ruleMatch = getRuntimeRuleControlToggles(player).find(toggle => {
      return getWeaponToggleAliases(toggle).some(alias => requested.has(normalizeName(alias)));
    });
    if (ruleMatch) return ruleMatch;
    return null;
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

  function openSheetSearchDialog(root, dialogSelector, inputSelector, renderResults) {
    const dialog = root && root.querySelector(dialogSelector);
    if (!dialog) return;
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
    const input = dialog.querySelector(inputSelector);
    resetSheetSearchDialog(dialog);
    if (input) {
      input.value = '';
    }
    renderResults(root, '');
    if (input) window.setTimeout(() => input.focus(), 0);
  }

  function resetSheetSearchDialog(dialog) {
    if (!dialog) return;
    dialog.querySelectorAll('[data-equipment-search-filter], [data-spell-search-filter]').forEach(control => {
      if (control.tagName === 'SELECT') control.value = 'all';
      else control.value = '';
    });
  }

  function closeSheetSearchDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  async function renderRoll(root, player, weapon, type) {
    const result = type === 'attack'
      ? rollAttack(weapon)
      : rollDamage(weapon);
    if (type === 'attack' || type === 'damage') {
      const consumption = await consumeWeaponRollActivations(root, player, weapon, type);
      if (consumption) result.detail = [result.detail, consumption].filter(Boolean).join('; ');
    }
    renderSheetLog(root, result.label, result.detail);
  }

  function renderD20Roll(root, label, bonus) {
    const die = rollDie(20);
    const total = die + (Number(bonus) || 0);
    renderSheetLog(root, `${label}: ${total}`, `d20 ${die} ${formatBonus(bonus)}`);
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

  function renderActionRoll(root, trigger) {
    const profile = {
      kind: trigger.dataset.rollKind || 'damage',
      title: trigger.dataset.rollTitle || 'Action',
      formula: trigger.dataset.rollFormula || '',
      diceTerms: parseDiceTerms(trigger.dataset.rollFormula || ''),
      bonus: Number(trigger.dataset.rollBonus) || 0,
      bonusLabel: trigger.dataset.rollBonusLabel || '',
      damageType: trigger.dataset.rollDamageType || '',
    };
    if (!profile.diceTerms.length) {
      renderSheetLog(root, `${profile.title} roll unavailable`, 'No damage or healing dice were detected for this action yet.');
      return;
    }
    const roll = rollActionProfile(profile);
    renderSheetLog(root, `${profile.title} ${profile.kind}: ${roll.total}`, roll.detail);
  }

  function renderFeatureRoll(root, player, featureId) {
    const feature = (player.ruleFeatures || []).find(candidate => candidate.id === featureId)
      || (player.ruleActions || []).find(candidate => candidate.sourceId === featureId || candidate.id === featureId);
    const title = feature && (feature.name || feature.title) || 'Feature';
    if (normalizeName(title) === 'second wind') {
      const die = rollDice('1d10');
      const level = Number(player.level) || 1;
      const total = die.total + level;
      renderSheetLog(root, `Second Wind healing: ${total}`, `${die.detail} + fighter level ${level}`);
      return;
    }
    renderSheetLog(root, `${title} roll unavailable`, 'No roll formula is recorded for this feature yet.');
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

  function rollActionProfile(profile) {
    const rolls = profile.diceTerms.map(term => {
      const values = Array.from({ length: term.count }, () => rollDie(term.sides));
      return { term, values, total: values.reduce((sum, value) => sum + value, 0) };
    });
    const diceTotal = rolls.reduce((sum, entry) => sum + entry.total, 0);
    const total = diceTotal + (Number(profile.bonus) || 0);
    const detail = [
      `${profile.formula} = ${rolls.map(entry => `${formatDiceTerm(entry.term)} [${entry.values.join(', ')}]`).join(' + ')}`,
      profile.bonus ? `${profile.bonusLabel || 'Bonus'} ${formatBonus(profile.bonus)}` : '',
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

  function loadPlayerEdits(playerId) {
    return {};
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
      const { updatedAt, ...apiEdits } = edits || {};
      if (!Object.keys(apiEdits).length) return fetchApi(`players/${encodeURIComponent(playerId)}`);
      const url = buildApiUrl(`players/${encodeURIComponent(playerId)}`);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(apiEdits),
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return payload.player || fetchApi(`players/${encodeURIComponent(playerId)}`);
    } catch (error) {
      return null;
    }
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
    if (field === 'initiative' || field === 'proficiencyBonus' || field === 'spellAttack' || field === 'simpleMelee' || field === 'simpleRanged' || field === 'martialMelee' || field === 'martialRanged') return value === null ? '-' : formatBonus(value);
    if (field === 'speed') return formatSpeedSummary(player);
    if (field === 'spellSaveDc') return value === null || value === undefined ? '-' : value;
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
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { accept: 'application/json' } });
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

  function resolveSheetUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(https?:|data:|blob:|mailto:|#)/i.test(raw)) return raw;
    const clean = raw.replace(/\\/g, '/').replace(/^docs\//i, '').replace(/^\.\//, '');
    if (clean.startsWith('/')) return resolveRootRelativeSheetUrl(clean);
    if (/^Public\//i.test(clean)) return new URL(clean, getSiteRootUrl()).toString();
    if (/^(Players|Storylines|World)\//i.test(clean)) return new URL(`Public/${clean}`, getSiteRootUrl()).toString();
    if (/^(Assets|data|api|site-assets|5etools)\//i.test(clean)) return new URL(clean, getSiteRootUrl()).toString();
    if (/^[^/]+\.html(?:[?#].*)?$/i.test(clean)) return new URL(clean, getSiteRootUrl()).toString();
    return new URL(clean, window.location.href).toString();
  }

  function resolveRootRelativeSheetUrl(value) {
    const clean = String(value || '').replace(/^\/docs\//i, '/');
    const rootRelative = clean.replace(/^\/+/, '');
    if (/^(Public|Players|Storylines|World|Assets|data|api|site-assets|5etools)\//i.test(rootRelative)) {
      const sitePath = /^(Players|Storylines|World)\//i.test(rootRelative) ? `Public/${rootRelative}` : rootRelative;
      return new URL(sitePath, getSiteRootUrl()).toString();
    }
    try {
      return new URL(clean, window.location.origin === 'null' ? window.location.href : window.location.origin).toString();
    } catch {
      return clean;
    }
  }

  function getSiteRootUrl() {
    const url = new URL('.', window.location.href);
    const publicIndex = url.pathname.indexOf('/Public/');
    if (publicIndex >= 0) {
      url.pathname = url.pathname.slice(0, publicIndex + 1);
      url.search = '';
      url.hash = '';
    }
    return url;
  }

  function getApiBaseUrl() {
    const config = getConfig();
    if (window.location.protocol.startsWith('http') && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return `${window.location.origin}/api`;
    }
    const configured = String(config.apiBaseUrl || '').trim();
    if (configured) return configured.replace(/\/+$/, '');
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

  function titleCase(value) {
    return String(value || '').replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  function uniqueStrings(values) {
    const seen = new Set();
    const out = [];
    for (const value of values || []) {
      const clean = cleanDetailValue(value);
      const key = normalizeName(clean);
      if (!clean || seen.has(key)) continue;
      seen.add(key);
      out.push(clean);
    }
    return out;
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

  window.EldoriaPlayerSheets = {
    hydrate: hydratePlayerSheet,
    prepare: preparePlayer,
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-tabs]').forEach(initTabs);
    document.querySelectorAll('[data-public-search]').forEach(initSearch);
    document.querySelectorAll('[data-player-sheet]').forEach(initPlayerSheet);
  });
})();
