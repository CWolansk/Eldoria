const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { handleEntities, handlePlayers, handleSearch, _test } = require('./shared/public-data');
const { handleCharacters } = require('./shared/character-builds');
const { handleRules } = require('./shared/rules-data');
const EldoriaRuleset = require('../site-assets/eldoria-ruleset');

(async () => {
  const projectedSheet = _test.sanitizePlayerSheet({
    id: 'spell-projection-smoke',
    name: 'Spell Projection Smoke',
    level: 5,
    abilities: {},
    spells: ['Shape Water', 'Thunderwave'],
    manualSpells: ['Thunderwave'],
    manualSpellIds: ['thunderwave'],
    grantedSpells: ['Shape Water'],
    grantedSpellIds: ['shape-water'],
    grantedSpellDetails: {
      'shape-water': { id: 'shape-water', name: 'Shape Water', level: 'Cantrip' },
    },
    spellGrantDetails: [
      { spellId: 'shape-water', name: 'Shape Water', nonRemovable: true, sourceType: 'race', raceName: 'Genasi (Water)' },
    ],
    spellMetadataByName: {
      'Shape Water': { id: 'shape-water', name: 'Shape Water', granted: true, nonRemovable: true, removable: false },
    },
    ruleActivations: [{ id: 'smoke-attack-toggle', label: 'Smoke Attack Toggle', uiSurface: 'combat-global', category: 'attack-modifier' }],
  });
  assert.deepStrictEqual(projectedSheet.grantedSpells, ['Shape Water'], 'expected granted spell names to survive API sanitization');
  assert.strictEqual(projectedSheet.spellMetadataByName['Shape Water'].nonRemovable, true, 'expected locked spell metadata to survive API sanitization');
  assert.strictEqual(projectedSheet.ruleActivations[0].id, 'smoke-attack-toggle', 'expected rule activations to survive API sanitization');
  assert.strictEqual(projectedSheet.ruleActivations[0].uiSurface, 'combat-global', 'expected rule activation UI surface to survive API sanitization');
  assert.strictEqual(projectedSheet.ruleActivations[0].category, 'attack-modifier', 'expected rule activation category to survive API sanitization');
  assertClaireGrantedSpellProjection();
  assertVanessaGrantedSpellProjection();

  const players = await handlePlayers();
  assert.ok([200, 503].includes(players.status), 'expected players or unconfigured storage');
  if (players.status === 200) {
    assert.ok(Array.isArray(players.body.players), 'expected player list');

    const save = await handlePlayers(
      { slug: 'smoke-test-player' },
      {},
      { method: 'PUT', body: { id: 'smoke-test-player', name: 'Smoke Test Player', level: 1, abilities: {} }, headers: {} }
    );
    assert.strictEqual(save.status, 200);

    const player = await handlePlayers({ slug: 'smoke-test-player' });
    assert.strictEqual(player.status, 200);
    assert.ok(player.body.name, 'expected player name');
  } else {
    assert.strictEqual(players.body.error, 'storage_unavailable');
  }

  const search = handleSearch({}, { q: 'Highreach', limit: 5 });
  assert.strictEqual(search.status, 200);
  assert.ok(search.body.count > 0, 'expected search results');

  const entity = handleEntities({ slug: search.body.results[0].id });
  assert.strictEqual(entity.status, 200);
  assert.ok(entity.body.name, 'expected entity name');

  const characters = await handleCharacters();
  assert.strictEqual(characters.status, 200);
  assert.ok(Array.isArray(characters.body.characters), 'expected character list');

  const localSave = await handleCharacters(
    { slug: 'smoke-test-character' },
    {},
    { method: 'PUT', body: { id: 'smoke-test-character', name: 'Smoke Test', level: 1 }, headers: {} }
  );
  assert.ok([200, 503].includes(localSave.status), 'expected character save or unconfigured storage');

  const ruleCollections = await handleRules();
  assert.strictEqual(ruleCollections.status, 200);
  assert.ok(Array.isArray(ruleCollections.body.collections), 'expected rules collection summary');

  const items = await handleRules({ collection: 'items' });
  assert.strictEqual(items.status, 200);
  assert.ok(Array.isArray(items.body.rules), 'expected item rules catalog');

  const medallion = await handleRules({ collection: 'items', id: 'medallion-of-harmonious-resonance' });
  assert.strictEqual(medallion.status, 200);
  assert.ok(!medallion.body.rule.weapon, 'expected medallion to be non-weapon in rules database');
  assert.ok((medallion.body.rule.tags || []).includes('NoWeaponAttack'), 'expected medallion no-weapon tag');

  console.log('Public API smoke test passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

function assertClaireGrantedSpellProjection() {
  const ruleset = createSmokeRuleset();
  const claire = {
    id: 'claire-player-sheet',
    name: 'Claire',
    level: 5,
    classId: 'cleric',
    subclassId: 'cleric-tempest',
    classLevels: [{ classId: 'cleric', subclassId: 'cleric-tempest', level: 5 }],
    raceId: 'race-genasi-water-eepc',
    backgroundId: 'sailor',
    featIds: ['elemental-adept'],
    spellIds: [],
    abilities: { str: 16, dex: 8, con: 16, int: 14, wis: 18, cha: 12 },
  };
  const projection = ruleset.project(claire, {}).projection;
  const granted = projection.grantedSpells || [];
  const expected = [
    'Shape Water',
    'Create or Destroy Water',
    'Fog Cloud',
    'Thunderwave',
    'Gust of Wind',
    'Shatter',
    'Call Lightning',
    'Sleet Storm',
  ];
  for (const spell of expected) {
    assert.ok(granted.includes(spell), `expected Claire to receive granted spell ${spell}`);
    assert.strictEqual(projection.spellMetadataByName[spell].nonRemovable, true, `expected ${spell} to be locked`);
  }
  assert.ok(!granted.includes('Fear'), 'Tempest Domain prose should not grant the Fear spell');
  const ruleActions = Array.isArray(projection.ruleActions) ? projection.ruleActions : [];
  const findAction = (label) => ruleActions.find(action => action.label === label || action.title === label || action.name === label);
  assert.strictEqual(findAction('Ability Score Improvement').uiSurface, 'passive', 'expected passive feature notes to be classified');
  assert.strictEqual(findAction('Spellcasting').uiSurface, 'out-of-combat', 'expected spell slot recovery to stay off the Combat tab');
  assert.strictEqual(findAction('Cast Thunderwave').uiSurface, 'spell-action', 'expected direct spell casts to classify as spell actions');
  assert.strictEqual(findAction('Channel Divinity: Turn Undead').uiSurface, 'action-card', 'expected limited-use combat actions to classify as action cards');
  assert.strictEqual(findAction('Wrath of the Storm').uiSurface, 'action-card', 'expected reactions to classify as action cards');
  assert.deepStrictEqual(projection.defenses.resistances, ['Acid'], 'expected immunity-normalized defenses to keep only acid resistance for Claire');
  assert.deepStrictEqual(projection.defenses.immunities, [], 'expected no duplicate lightning immunity for Claire');
}

function assertVanessaGrantedSpellProjection() {
  const ruleset = createSmokeRuleset();
  const vanessa = {
    id: 'vanessa-player-sheet',
    name: 'Vanessa',
    level: 5,
    classId: 'druid',
    subclassId: 'druid-land',
    classLevels: [{ classId: 'druid', subclassId: 'druid-land', level: 5 }],
    raceId: 'race-dragonborn-phb',
    backgroundId: 'hermit',
    featIds: ['lucky'],
    spellIds: [
      'acid-splash',
      'cure-wounds',
      'ice-knife',
      'barkskin',
      'flame-blade',
      'pass-without-trace',
      'call-lightning',
      'plant-growth',
      'water-breathing',
    ],
    optionalFeatureIds: ['class-druid-4-cantrip-versatility-tce'],
    featureChoices: {
      'race-dragonborn-draconic-ancestry-phb': 'Green',
      'class-druid-4-ability-score-improvement-phb:allocation': ['Wisdom', 'Wisdom'],
    },
    abilities: { str: 15, dex: 14, con: 16, int: 13, wis: 17, cha: 13 },
  };
  const projection = ruleset.project(vanessa, {}).projection;
  const granted = projection.grantedSpells || [];
  const expected = ['Barkskin', 'Spider Climb', 'Call Lightning', 'Plant Growth'];
  for (const spell of expected) {
    assert.ok(granted.includes(spell), `expected Vanessa to receive granted spell ${spell}`);
    assert.strictEqual(projection.spellMetadataByName[spell].nonRemovable, true, `expected ${spell} to be locked`);
  }
  assert.ok(!granted.includes('Water Breathing'), 'Circle of the Land should not grant off-terrain circle spells');
  assert.ok(!granted.includes('Pass without Trace'), 'Circle of the Land should not grant off-terrain circle spells');
}

function createSmokeRuleset() {
  const rulesRoot = path.join(__dirname, '..', 'Assets', 'Rules');
  const files = {
    classes: 'classes.json',
    subclasses: 'subclasses.json',
    races: 'races.json',
    backgrounds: 'backgrounds.json',
    feats: 'feats.json',
    items: 'items.json',
    spells: 'spells.json',
    features: 'features.json',
    actions: 'actions.json',
    resources: 'resources.json',
    profile: 'ruleset-profile.json',
    manifest: 'manifest.json',
  };
  const data = Object.fromEntries(Object.entries(files)
    .map(([key, file]) => [key, JSON.parse(fs.readFileSync(path.join(rulesRoot, file), 'utf8'))]));
  return EldoriaRuleset.createRuleset(data, data.profile || {});
}
