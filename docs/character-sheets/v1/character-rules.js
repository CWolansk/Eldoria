import { CharacterModel } from './shared/character-model.js';
import { deepClone, normalizeCharacter } from './shared/character-state.js';
import {
  applyTableStateAction as applyTableStateActionToModel,
  patchCharacterModel
} from './sheet/character-sheet-actions.js';
import {
  createSheetRulesContext,
  formatSpellLevel,
  getArmorClassBreakdown,
  getCatalogTextSummary,
  getEquippedAttackCards,
  getSavingThrowCards,
  getSkillCards,
  getSpellcastingMath,
  resolveBackgroundDetail,
  resolveClassDetail,
  resolveFeatDetail,
  resolveFeatureDetail,
  resolveItemDetail,
  resolveItemPropertyDetail,
  resolveRaceDetail,
  resolveSpellDetail,
  resolveSubclassDetail
} from './sheet/sheet-rules.js';

export {
  applyHpDamage,
  applyHpHealing,
  applyLongRest,
  applyShortRest,
  applyTableStateAction,
  patchCharacterModel,
  resetDeathSaves,
  setTemporaryHp,
  syncCurrentHpToMax,
  toggleInspiration
} from './sheet/character-sheet-actions.js';

export {
  createSheetRulesContext,
  formatSpellLevel,
  getArmorClassBreakdown,
  getCatalogTextSummary,
  getEquippedAttackCards,
  getSavingThrowCards,
  getSkillCards,
  getSpellcastingMath,
  resolveBackgroundDetail,
  resolveClassDetail,
  resolveFeatDetail,
  resolveFeatureDetail,
  resolveItemDetail,
  resolveItemPropertyDetail,
  resolveRaceDetail,
  resolveSpellDetail,
  resolveSubclassDetail
} from './sheet/sheet-rules.js';

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function createSnapshot(model, rulesCatalog, rulesProfile) {
  const character = deepClone(model.data);
  const rulesContext = createSheetRulesContext({
    rulesCatalog,
    rulesProfile
  });

  return {
    character,
    rulesCatalog,
    rulesProfile,
    rulesContext
  };
}

export function createCharacterRuntime(characterDto, options = {}) {
  const model = CharacterModel.fromInput(normalizeCharacter(characterDto));
  let rulesCatalog = options.rulesCatalog ?? options.normalizedCatalog ?? null;
  let rulesProfile = toObject(options.rulesProfile);

  function getSnapshot() {
    return createSnapshot(model, rulesCatalog, rulesProfile);
  }

  function withSnapshot(result) {
    return {
      ...toObject(result),
      snapshot: getSnapshot()
    };
  }

  return {
    model,
    get character() {
      return deepClone(model.data);
    },
    get rulesCatalog() {
      return rulesCatalog;
    },
    get rulesProfile() {
      return { ...rulesProfile };
    },
    getSnapshot,
    setCharacter(nextCharacterDto) {
      model.replace(normalizeCharacter(nextCharacterDto));
      return getSnapshot();
    },
    setRulesCatalog(nextRulesCatalog) {
      rulesCatalog = nextRulesCatalog ?? null;
      return getSnapshot();
    },
    setRulesProfile(nextRulesProfile) {
      rulesProfile = toObject(nextRulesProfile);
      return getSnapshot();
    },
    patch(path, value) {
      return withSnapshot(patchCharacterModel(model, path, value));
    },
    apply(action, payload = {}) {
      return withSnapshot(applyTableStateActionToModel(model, action, payload));
    },
    getArmorClassBreakdown() {
      const snapshot = getSnapshot();
      return getArmorClassBreakdown(snapshot.character, snapshot.rulesContext);
    },
    getSavingThrowCards() {
      return getSavingThrowCards(model.data);
    },
    getSkillCards() {
      return getSkillCards(model.data);
    },
    getEquippedAttackCards() {
      const snapshot = getSnapshot();
      return getEquippedAttackCards(snapshot.character, snapshot.rulesContext);
    },
    getSpellcastingMath(spellcasting = {}) {
      return getSpellcastingMath(model.data, spellcasting);
    }
  };
}

export const EldoriaCharacterRules = Object.freeze({
  createCharacterRuntime,
  createSheetRulesContext,
  formatSpellLevel,
  getArmorClassBreakdown,
  getCatalogTextSummary,
  getEquippedAttackCards,
  getSavingThrowCards,
  getSkillCards,
  getSpellcastingMath,
  resolveBackgroundDetail,
  resolveClassDetail,
  resolveFeatDetail,
  resolveFeatureDetail,
  resolveItemDetail,
  resolveItemPropertyDetail,
  resolveRaceDetail,
  resolveSpellDetail,
  resolveSubclassDetail
});

if (typeof window !== 'undefined') {
  window.EldoriaCharacterRules = EldoriaCharacterRules;
}
