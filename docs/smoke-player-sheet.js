const { chromium } = require('@playwright/test');

const DEFAULT_PAGE_URL = 'http://localhost:8086/Public/Players/E2E%20Test%20Player%20Sheet.html';
const DEFAULT_SMOKE_ID = 'e2e-test-player-sheet';
const SHEET_GEAR_ITEMS = ['Chain Mail', 'Longsword', 'Shield', 'Bullseye Lantern'];

const pageUrl = process.env.PLAYER_SHEET_SMOKE_URL || DEFAULT_PAGE_URL;
const smokeId = process.env.PLAYER_SHEET_SMOKE_ID || DEFAULT_SMOKE_ID;
const apiBase = (process.env.ELDORIA_API_BASE_URL || readConfiguredApiBase()).replace(/\/+$/, '');

function readConfiguredApiBase() {
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, 'site-assets', 'site-config.js');
  const text = fs.readFileSync(configPath, 'utf8');
  const match = text.match(/apiBaseUrl:\s*["']([^"']+)["']/);
  if (!match) throw new Error(`Could not find apiBaseUrl in ${configPath}`);
  return match[1];
}

async function callApi(method, path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Leave json null and include the raw response in the error if needed.
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} failed ${response.status}: ${text}`);
  }
  return json;
}

function seededCharacter() {
  return {
    id: smokeId,
    name: 'E2E Test Player Sheet',
    builderVersion: 'fresh-v1',
    rulesetId: 'eldoria-5e',
    rulesVersion: 'eldoria-5e-2014-v1',
    level: 5,
    classId: 'fighter',
    subclassId: 'fighter-champion',
    classLevels: [{ classId: 'fighter', subclassId: 'fighter-champion', level: 5 }],
    raceId: 'race-human-phb',
    backgroundId: 'archaeologist',
    itemIds: [],
    featIds: [],
    spellIds: [],
    optionalFeatureIds: [],
    selectedFeatureIds: [],
    featureChoices: {
      'archaeologist:background:tools:0': ["Cartographer's tools"],
      'archaeologist:background:languages': ['Dwarvish'],
    },
    levelChoices: {},
    abilityMethod: 'manual',
    hpMode: 'manual',
    maxHp: 44,
    currentHp: 44,
    experience: 6500,
    gold: 12,
    heroPoints: 1,
    guildRank: 'Initiate',
    guildPoints: 2,
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    proficiencies: { skills: ['athletics', 'history', 'survival'], languages: ['dwarvish'], tools: ["Cartographer's tools"] },
    startingGear: { enabled: [], disabled: [] },
  };
}

function seededPlayer() {
  return {
    id: smokeId,
    name: 'E2E Test Player Sheet',
    sheetTitle: 'E2E Test Player Sheet',
    builderVersion: 'fresh-v1',
    rulesetId: 'eldoria-5e',
    rulesVersion: 'eldoria-5e-2014-v1',
    class: 'Fighter',
    classId: 'fighter',
    subclass: 'Champion',
    subclassId: 'fighter-champion',
    subclassShortName: 'Champion',
    classLevels: [{ classId: 'fighter', subclassId: 'fighter-champion', level: 5 }],
    race: 'Human',
    raceId: 'race-human-phb',
    raceIds: ['race-human-phb'],
    background: 'Archaeologist',
    backgroundId: 'archaeologist',
    backgroundIds: ['archaeologist'],
    portrait: 'Public/Players/JulieDnd.png',
    level: 5,
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    currentHp: 44,
    maxHp: 44,
    proficiencyBonus: 3,
    saves: ['str', 'con'],
    skills: ['athletics', 'history', 'survival'],
    simpleWeapons: true,
    martialWeapons: true,
    experience: 6500,
    gold: 12,
    heroPoints: 1,
    guildRank: 'Initiate',
    guildPoints: 2,
    equipment: [],
    itemIds: [],
    spells: [],
    resources: [{
      id: 'test-breath-weapon',
      name: 'Breath Weapon',
      max: 1,
      reset: 'shortRest',
      sourceType: 'race',
      sourceId: 'test-breath-weapon',
    }],
    ruleActions: [{
      id: 'feature-test-breath-weapon',
      sourceType: 'race',
      sourceId: 'test-breath-weapon',
      group: 'Action',
      type: 'Dragonborn',
      title: 'Breath Weapon',
      detail: 'The DC for this saving throw equals 8 + your Constitution modifier + your proficiency bonus. A creature takes 2d6 damage on a failed save, and half as much damage on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level.',
      tags: ['Dragonborn', 'Level 1', 'Breath Weapon'],
    }],
    ruleFeatures: [],
    featureChoices: {
      'archaeologist:background:tools:0': ["Cartographer's tools"],
      'archaeologist:background:languages': ['Dwarvish'],
    },
    proficiencies: { skills: ['athletics', 'history', 'survival'], languages: ['dwarvish'], tools: ["Cartographer's tools"] },
  };
}

async function seedSmokeRecords() {
  await callApi('PUT', `/players/${encodeURIComponent(smokeId)}`, seededPlayer());
  await callApi('PUT', `/characters/${encodeURIComponent(smokeId)}`, seededCharacter());
}

function assertApiCall(apiCalls, method, targetPath, label) {
  const matched = apiCalls.some(call => call.includes(targetPath) && call.includes(method) && call.endsWith('200'));
  if (!matched) {
    throw new Error(`${label} ${method} did not complete against the expected API route:\n${apiCalls.join('\n')}`);
  }
}

async function runSmoke() {
  await seedSmokeRecords();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  const apiCalls = [];

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    const failure = request.failure();
    if (failure) consoleErrors.push(`request failed ${request.method()} ${request.url()} ${failure.errorText}`);
  });
  page.on('response', response => {
    const url = response.url();
    const path = new URL(url).pathname;
    const encodedId = encodeURIComponent(smokeId);
    if (path.endsWith(`/api/players/${encodedId}`) || path.endsWith(`/api/characters/${encodedId}`)) {
      apiCalls.push(`${response.request().method()} ${path} ${response.status()}`);
    }
  });

  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-player-sheet][data-api-state="loaded"]', { timeout: 15000 });
  await assertBaseRenderedSheet(page, 'initial load', '+6');
  await assertGenericActionRolls(page, 'initial load');
  await page.getByRole('button', { name: 'Level Up / Audit' }).click();
  await page.waitForSelector('[data-character-assistant-modal][open]', { timeout: 5000 });
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-builder-status]')?.textContent || '';
    return text && !/Loading rules/i.test(text) && !/Could not load/i.test(text);
  }, null, { timeout: 15000 });

  await exerciseBuilderControls(page);
  await page.locator('[data-save-cloud]').click();
  await page.waitForFunction(() => (
    document.querySelector('[data-builder-status]')?.textContent || ''
  ).includes('Saved to cloud'), null, { timeout: 20000 });
  await page.waitForSelector('[data-builder-toast]:not([hidden])', { timeout: 5000 });

  const toast = await page.locator('[data-builder-toast]').textContent();
  const status = await page.locator('[data-builder-status]').textContent();
  const sheetState = await page.locator('[data-player-sheet]').getAttribute('data-api-state');
  const sheetName = await page.locator('[data-player-field="name"]').first().textContent();
  await page.locator('[data-character-assistant-close]').click();
  await page.waitForFunction(() => !document.querySelector('[data-character-assistant-modal]')?.hasAttribute('open'), null, { timeout: 5000 });

  const encodedId = encodeURIComponent(smokeId);
  await assertBuilderSaveDidNotAddStartingGear('after builder save');
  await addStartingGearFromSheetGearArea(page, encodedId);
  await assertCompletedRenderedSheet(page, 'after sheet Gear adds');

  await page.locator('[data-tab-target="resources"]').click();
  await page.waitForSelector('[data-tab-panel="resources"].active [data-resource-spend="action-surge"]', { timeout: 5000 });
  const useButton = page.locator('[data-tab-panel="resources"].active [data-resource-spend="action-surge"]');
  const useButtonCount = await useButton.count();
  if (useButtonCount !== 1) {
    throw new Error(`Action Surge resource use button count was ${useButtonCount}, expected 1 in the Resources panel.`);
  }
  const patchPromise = page.waitForResponse(response => {
    const path = new URL(response.url()).pathname;
    return path.endsWith(`/api/players/${encodedId}`) && response.request().method() === 'PATCH' && response.status() === 200;
  }, { timeout: 15000 });
  await useButton.click();
  await patchPromise;
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-resources-panel]')?.textContent || '';
    return text.includes('0 / 1 left') || text.includes('0 / 1 available') || text.includes('0/1') || text.includes('used');
  }, null, { timeout: 5000 });
  await browser.close();

  const smokePlayer = await callApi('GET', `/players/${encodeURIComponent(smokeId)}`);
  const smokeCharacter = await callApi('GET', `/characters/${encodeURIComponent(smokeId)}`);
  const browserErrors = consoleErrors.filter(line => !/favicon/i.test(line)).concat(pageErrors);
  if (browserErrors.length) {
    throw new Error(`Browser errors:\n${browserErrors.join('\n')}`);
  }
  assertApiCall(apiCalls, 'PUT', `/api/players/${encodeURIComponent(smokeId)}`, 'Player sheet');
  assertApiCall(apiCalls, 'PUT', `/api/characters/${encodeURIComponent(smokeId)}`, 'Character build');
  assertApiCall(apiCalls, 'PATCH', `/api/players/${encodeURIComponent(smokeId)}`, 'Player resource use');
  if (smokePlayer.class !== 'Fighter' || smokePlayer.race !== 'Human' || smokePlayer.background !== 'Archaeologist') {
    throw new Error(`Projected sheet is incomplete: ${JSON.stringify({
      class: smokePlayer.class,
      race: smokePlayer.race,
      background: smokePlayer.background,
    })}`);
  }
  if (!Array.isArray(smokePlayer.equipment) || !smokePlayer.equipment.includes('Longsword')) {
    throw new Error(`Projected equipment did not populate: ${JSON.stringify(smokePlayer.equipment || [])}`);
  }
  assertCloudProjection(smokePlayer, smokeCharacter);
  if (!Array.isArray(smokePlayer.ruleFeatures) || !smokePlayer.ruleFeatures.length) {
    throw new Error('Projected class/race features did not populate.');
  }
  if (!Array.isArray(smokePlayer.classLevels) || !smokePlayer.classLevels.some(row => row.classId === 'fighter' && row.subclassId === 'fighter-champion')) {
    throw new Error(`Builder source class levels were not saved to the player sheet: ${JSON.stringify(smokePlayer.classLevels || [])}`);
  }
  if (smokePlayer.raceId !== 'race-human-phb' || smokePlayer.backgroundId !== 'archaeologist') {
    throw new Error(`Builder source origin ids were not saved: ${JSON.stringify({ raceId: smokePlayer.raceId, backgroundId: smokePlayer.backgroundId })}`);
  }
  if (!smokePlayer.proficiencies || !Array.isArray(smokePlayer.proficiencies.skills) || !smokePlayer.proficiencies.skills.includes('athletics')) {
    throw new Error(`Builder proficiencies were not saved: ${JSON.stringify(smokePlayer.proficiencies || {})}`);
  }

  console.log(`page: ${pageUrl}`);
  console.log(`status: ${status}`);
  console.log(`toast: ${toast}`);
  console.log(`sheet state: ${sheetState}`);
  console.log(`sheet name: ${sheetName}`);
  console.log(`smoke player id: ${smokePlayer.id}, level: ${smokePlayer.level}, class: ${smokePlayer.class}, race: ${smokePlayer.race}, background: ${smokePlayer.background}`);
  console.log(`smoke character id: ${smokeCharacter.id}, builderVersion: ${smokeCharacter.builderVersion}`);
  console.log('api calls:');
  for (const call of apiCalls) console.log(`  ${call}`);
}

async function exerciseBuilderControls(page) {
  const pickCounts = page.locator('[data-pick-counts]');
  if (await pickCounts.count()) {
    const pickCountsBefore = await pickCounts.textContent();
    const featGateBefore = await page.locator('[data-feat-gate]').textContent();
    if (!pickCountsBefore.includes('0/0 feats') || !/No feat slot is available/i.test(featGateBefore)) {
      throw new Error(`ASI feat slots were available before the level feat checkbox was enabled: ${JSON.stringify({ pickCountsBefore, featGateBefore })}`);
    }
  }

  const asiCard = page.locator('.asi-choice-group').filter({ hasText: 'Level 4: Ability Score Increase' });
  const asiCardCount = await asiCard.count();
  if (asiCardCount !== 1) throw new Error(`Expected one level 4 ASI card, found ${asiCardCount}.`);
  if (await asiCard.locator('[data-choice-pick-kind="feat"]').count()) {
    throw new Error('Level 4 feat picker rendered before Enable feat for this level was checked.');
  }

  await asiCard.locator('[data-bonus-feat-toggle]').check();
  await page.waitForFunction(() => {
    const card = [...document.querySelectorAll('.asi-choice-group')].find(node => node.textContent.includes('Level 4: Ability Score Increase'));
    return card
      && card.querySelector('[data-choice-pick-kind="feat"]')
      && [...card.querySelectorAll('[data-asi-slot]')].every(select => !select.disabled)
      && !card.textContent.includes('1/1 feat');
  }, null, { timeout: 5000 });
  const featSelect = asiCard.locator('[data-choice-pick-kind="feat"]');
  await featSelect.selectOption('great-weapon-master');
  await asiCard.locator('[data-choice-add-kind="feat"]').click();
  await page.waitForFunction(() => {
    const card = [...document.querySelectorAll('.asi-choice-group')].find(node => node.textContent.includes('Level 4: Ability Score Increase'));
    return card
      && card.textContent.includes('1/1 feat')
      && [...card.querySelectorAll('[data-asi-slot]')].every(select => !select.disabled)
      && !/feat selected instead of ability increases/i.test(card.textContent || '');
  }, null, { timeout: 5000 });
  await asiCard.locator('[data-asi-slot="0"]').selectOption('Strength');
  await asiCard.locator('[data-asi-slot="1"]').selectOption('Strength');

  await page.evaluate(() => {
    const values = {
      experience: '12345',
      gold: '77',
      heroPoints: '3',
      guildRank: 'Journeyman',
      guildPoints: '42',
    };
    for (const [field, value] of Object.entries(values)) {
      const input = document.querySelector(`[data-field="${field}"]`);
      if (!input) throw new Error(`Missing builder campaign progress field ${field}`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}

async function assertBuilderSaveDidNotAddStartingGear(label) {
  const player = await callApi('GET', `/players/${encodeURIComponent(smokeId)}`);
  const equipment = Array.isArray(player.equipment) ? player.equipment : [];
  const projected = SHEET_GEAR_ITEMS.filter(item => equipment.includes(item));
  if (projected.length) {
    throw new Error(`${label}: starting gear was added before the sheet Gear area was used: ${JSON.stringify(projected)} in ${JSON.stringify(equipment)}`);
  }
}

async function addStartingGearFromSheetGearArea(page, encodedId) {
  await page.locator('[data-tab-target="equipment"]').click();
  await page.waitForSelector('[data-tab-panel="equipment"].active [data-equipment-panel] [data-add-starting-gear]:not([disabled])', { timeout: 10000 });
  const patchPromise = page.waitForResponse(response => {
    const path = new URL(response.url()).pathname;
    return path.endsWith(`/api/players/${encodedId}`) && response.request().method() === 'PATCH' && response.status() === 200;
  }, { timeout: 15000 });
  await page.locator('[data-tab-panel="equipment"].active [data-add-starting-gear]').click();
  await patchPromise;
  await page.waitForFunction(items => {
    const text = document.querySelector('[data-equipment-panel]')?.textContent || '';
    return items.every(item => text.includes(item));
  }, SHEET_GEAR_ITEMS, { timeout: 5000 });
}

async function assertBaseRenderedSheet(page, label, expectedSimpleMelee) {
  const summary = await page.locator('[data-player-summary]').textContent();
  if (!summary.includes('Human') || !summary.includes('Fighter') || !summary.includes('Level 5')) {
    throw new Error(`${label}: cloud summary did not render complete character data: ${summary}`);
  }

  const classText = await page.locator('[data-player-field="class"]').first().textContent();
  const raceText = await page.locator('[data-player-field="race"]').first().textContent();
  const backgroundText = await page.locator('[data-player-field="background"]').first().textContent();
  if (classText !== 'Fighter' || raceText !== 'Human' || backgroundText !== 'Archaeologist') {
    throw new Error(`${label}: overview cards did not hydrate: ${JSON.stringify({ classText, raceText, backgroundText })}`);
  }

  const simpleMelee = await page.locator('[data-player-field="simpleMelee"]').textContent();
  if (expectedSimpleMelee && simpleMelee !== expectedSimpleMelee) {
    throw new Error(`${label}: derived attack card did not hydrate from cloud stats: ${simpleMelee}`);
  }

  const initiative = await page.locator('[data-player-stat="initiative"]').textContent();
  const speed = await page.locator('[data-player-stat="speed"]').textContent();
  if (initiative !== '+2' || speed !== '30 ft') {
    throw new Error(`${label}: initiative/speed did not derive from cloud rules: ${JSON.stringify({ initiative, speed })}`);
  }

  const portraitLoaded = await page.locator('[data-player-portrait] img').evaluate(img => Boolean(img.complete && img.naturalWidth > 0));
  if (!portraitLoaded) throw new Error(`${label}: character portrait image did not load.`);

  const bodyText = await page.locator('body').textContent();
  if (/Edit Overview|Edit Stats|Edit Combat|Edit Resources/i.test(bodyText)) {
    throw new Error(`${label}: removed inline sheet editor text is still visible.`);
  }
  const localEditForms = await page.locator('[data-player-edit-form]').count();
  if (localEditForms) throw new Error(`${label}: local sheet edit forms still exist in the DOM.`);
}

async function assertCompletedRenderedSheet(page, label) {
  await assertBaseRenderedSheet(page, label, '+7');
  await page.waitForFunction(() => {
    const equipment = document.querySelector('[data-equipment-panel]')?.textContent || '';
    const features = document.querySelector('[data-class-info-panel]')?.textContent || '';
    const resources = document.querySelector('[data-resources-panel]')?.textContent || '';
    return equipment.includes('Longsword')
      && equipment.includes('Shield')
      && features.includes('Action Surge')
      && resources.includes('Action Surge')
      && (resources.includes('1 / 1 left') || resources.includes('1 / 1 available'));
  }, null, { timeout: 10000 });

  const featureOrActionUseButtons = await page.locator('[data-tab-panel="features"] [data-resource-spend="action-surge"], [data-tab-panel="actions"] [data-resource-spend="action-surge"]').count();
  if (!featureOrActionUseButtons) {
    throw new Error(`${label}: Action Surge was not rendered with a Use button on the feature/action surface.`);
  }

  const combatFeatureText = await page.locator('[data-tab-panel="combat"] .combat-section-features').textContent();
  if (!combatFeatureText.includes('Action Surge')) {
    throw new Error(`${label}: Action Surge was not rendered in the Combat Features section.`);
  }
  const combatFeatureUseButtons = await page.locator('[data-tab-panel="combat"] .combat-section-features [data-resource-spend="action-surge"]').count();
  if (!combatFeatureUseButtons) {
    throw new Error(`${label}: Action Surge was not rendered with a Use button in the Combat Features section.`);
  }
  await assertVisibleQuickRollLabels(page, label, ['Longsword']);
}

async function assertGenericActionRolls(page, label) {
  await page.locator('[data-tab-target="actions"]').click();
  await page.waitForSelector('[data-tab-panel="actions"].active [data-roll-action="feature-test-breath-weapon"]', { timeout: 5000 });
  const actionPanelText = await page.locator('[data-tab-panel="actions"].active').textContent();
  if (!actionPanelText.includes('Save DC 13') || !actionPanelText.includes('Damage 2d6')) {
    throw new Error(`${label}: generic action DC/damage controls did not render for Breath Weapon: ${actionPanelText}`);
  }
  await page.locator('[data-tab-panel="actions"].active [data-roll-action="feature-test-breath-weapon"]').click();
  await page.waitForFunction(() => {
    const dock = document.querySelector('[data-roll-dock]')?.textContent || '';
    return dock.includes('Breath Weapon damage:');
  }, null, { timeout: 5000 });
  await page.evaluate(() => {
    const root = document.querySelector('[data-player-sheet]');
    window.EldoriaPlayerSheets.hydrate(root, { ...root._playerState, level: 11 });
  });
  await page.waitForFunction(() => {
    const text = document.querySelector('[data-tab-panel="actions"]')?.textContent || '';
    return text.includes('Save DC 13') && text.includes('Damage 4d6');
  }, null, { timeout: 5000 });
  await page.evaluate(() => {
    const root = document.querySelector('[data-player-sheet]');
    window.EldoriaPlayerSheets.hydrate(root, { ...root._playerState, level: 5 });
  });
}

async function assertVisibleQuickRollLabels(page, label, expectedNames) {
  await page.waitForSelector('[data-equipped-summary] .quick-roll-group .quick-roll-name', { timeout: 5000 });
  const groups = await page.locator('[data-equipped-summary] .quick-roll-group').evaluateAll(nodes => nodes.map(node => ({
    text: node.innerText,
    labels: Array.from(node.querySelectorAll('.quick-roll-name')).map(labelNode => {
      const style = window.getComputedStyle(labelNode);
      return {
        text: labelNode.innerText,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && labelNode.getClientRects().length > 0,
      };
    }),
  })));
  for (const expectedName of expectedNames) {
    const group = groups.find(candidate => candidate.text.includes(expectedName));
    if (!group) {
      throw new Error(`${label}: quick roll group did not visibly include "${expectedName}": ${JSON.stringify(groups)}`);
    }
    const visibleLabel = group.labels.some(labelNode => labelNode.visible && labelNode.text.includes(expectedName));
    if (!visibleLabel) {
      throw new Error(`${label}: quick roll label for "${expectedName}" exists but is hidden: ${JSON.stringify(group)}`);
    }
  }
}

function assertCloudProjection(smokePlayer, smokeCharacter) {
  const equipment = Array.isArray(smokePlayer.equipment) ? smokePlayer.equipment : [];
  for (const item of SHEET_GEAR_ITEMS) {
    if (!equipment.includes(item)) throw new Error(`Projected starting gear is missing ${item}: ${JSON.stringify(equipment)}`);
  }
  if (equipment.includes("Cartographer's tools")) {
    throw new Error(`Tool proficiency was saved as equipment without being added from the Gear area: ${JSON.stringify(equipment)}`);
  }
  if (smokePlayer.abilities?.str !== 18) {
    throw new Error(`ASI ability increases were not saved to cloud: ${JSON.stringify({ player: smokePlayer.abilities, character: smokeCharacter.abilities })}`);
  }
  const asiAllocation = Object.entries(smokeCharacter.featureChoices || {})
    .find(([key]) => key.includes('ability-score-improvement') && key.endsWith(':allocation'))?.[1] || [];
  if (asiAllocation.join('|') !== 'Strength|Strength') {
    throw new Error(`ASI source choices were not saved to the character build: ${JSON.stringify(smokeCharacter.featureChoices || {})}`);
  }
  if (!(smokePlayer.featIds || []).includes('great-weapon-master') || !(smokeCharacter.featIds || []).includes('great-weapon-master')) {
    throw new Error(`ASI feat was not saved alongside ability increases: ${JSON.stringify({ player: smokePlayer.featIds, character: smokeCharacter.featIds })}`);
  }
  if (smokePlayer.initiative !== 2 || smokePlayer.speed !== 30 || smokePlayer.baseSpeed !== 30) {
    throw new Error(`Projected initiative/speed are wrong: ${JSON.stringify({ initiative: smokePlayer.initiative, speed: smokePlayer.speed, baseSpeed: smokePlayer.baseSpeed })}`);
  }
  const actionSurge = (smokePlayer.resources || []).find(resource => resource.id === 'action-surge');
  if (!actionSurge || actionSurge.reset !== 'shortRest' || !String(actionSurge.maxFormula || '').includes('level >= 17')) {
    throw new Error(`Action Surge resource was not projected correctly: ${JSON.stringify(actionSurge || null)}`);
  }
  if (!(smokePlayer.ruleActions || []).some(action => action.resourceId === 'action-surge')) {
    throw new Error('Action Surge action is not linked to the Action Surge resource.');
  }
  if (!(smokePlayer.actionWells || []).some(well => well.resourceId === 'action-surge')) {
    throw new Error('Action Surge action well was not projected.');
  }
  if (!smokePlayer.resourceUses || smokePlayer.resourceUses['action-surge'] !== 1) {
    throw new Error(`Action Surge use was not saved to cloud: ${JSON.stringify(smokePlayer.resourceUses || {})}`);
  }
  for (const [field, value] of Object.entries({ experience: 12345, gold: 77, heroPoints: 3, guildPoints: 42 })) {
    if (smokePlayer[field] !== value || smokeCharacter[field] !== value) {
      throw new Error(`Campaign progress field ${field} did not save to cloud: ${JSON.stringify({ player: smokePlayer[field], character: smokeCharacter[field] })}`);
    }
  }
  if (smokePlayer.guildRank !== 'Journeyman' || smokeCharacter.guildRank !== 'Journeyman') {
    throw new Error(`Guild rank did not save to cloud: ${JSON.stringify({ player: smokePlayer.guildRank, character: smokeCharacter.guildRank })}`);
  }
}

runSmoke().catch(error => {
  console.error(error && error.stack || error);
  process.exit(1);
});
