import {
  cleanCharacterForExport,
  createEmptyCharacter,
  normalizeCharacter,
  parseCsvList,
  sanitizeFileName,
  setNestedValue,
  setSavingThrowState,
  setSkillState,
  stringifyJson
} from "./character-state.js";

/**
 * Runtime wrapper around a v1 character JSON object.
 * The saved files remain plain JSON; this class owns editor-time mutations,
 * small derived calculations, and export helpers.
 */
export class CharacterModel {
  #data;

  constructor(input) {
    this.#data = normalizeCharacter(input);
  }

  /**
   * Builds a model around a fresh blank character payload.
   * Called when the editor starts and when the user creates a new character.
   */
  static createEmpty() {
    return new CharacterModel(createEmptyCharacter());
  }

  /**
   * Builds a model from imported JSON or bundled example data.
   * Called by load/import/save flows in the app shell.
   */
  static fromInput(input) {
    return new CharacterModel(input);
  }

  /**
   * Exposes the current normalized plain-object data for rendering and forms.
   * Read by the app shell and sheet renderer.
   */
  get data() {
    return this.#data;
  }

  /**
   * Replaces the entire runtime character with a newly normalized payload.
   * Useful when applying a full raw JSON document.
   */
  replace(input) {
    this.#data = normalizeCharacter(input);
    return this;
  }

  /**
   * Replaces one nested path inside the character data, then re-normalizes.
   * Used by most guided editor fields.
   */
  setValue(path, value) {
    this.#data = normalizeCharacter(setNestedValue(this.#data, path, value));
    return this;
  }

  /**
   * Updates a comma-separated string field by storing it as a trimmed array.
   * Used by language, condition, and allowed-source inputs.
   */
  setCsvValue(path, rawValue) {
    return this.setValue(path, parseCsvList(rawValue));
  }

  /**
   * Updates one saving-throw entry and keeps the mirrored proficiency list in sync.
   * Used by the abilities table in the editor.
   */
  setSavingThrow(ability, patch) {
    this.#data = setSavingThrowState(this.#data, ability, patch);
    return this;
  }

  /**
   * Updates one skill proficiency/expertise/source block.
   * Used by the skills table in the editor.
   */
  setSkill(skill, patch) {
    this.#data = setSkillState(this.#data, skill, patch);
    return this;
  }

  /**
   * Computes an ability modifier from the current character data.
   * Used by editor-side derived actions such as initiative recomputation.
   */
  getAbilityModifier(ability) {
    const score = Number(this.#data.abilities?.[ability]?.score ?? 10);
    return Math.floor((score - 10) / 2);
  }

  /**
   * Derives proficiency bonus from total level and stores it on the character.
   * Used by the combat tab helper action.
   */
  deriveProficiencyBonus() {
    const level = Number(this.#data.level ?? 1);
    const proficiencyBonus = Math.ceil(level / 4) + 1;
    return this.setValue(["proficiencyBonus"], proficiencyBonus);
  }

  /**
   * Recomputes initiative from the current Dexterity score.
   * Used by the combat tab helper action.
   */
  deriveInitiative() {
    return this.setValue(["initiative"], this.getAbilityModifier("dex"));
  }

  /**
   * Sets current HP equal to max HP.
   * Used by the combat tab helper action.
   */
  syncCurrentHpToMax() {
    return this.setValue(["hp", "current"], this.#data.hp?.max ?? 0);
  }

  /**
   * Generates a character id from the current character name.
   * Used by the identity tab helper action.
   */
  generateIdFromName() {
    const id = `char-${sanitizeFileName(this.#data.identity?.name || "new-character")}`;
    return this.setValue(["id"], id);
  }

  /**
   * Produces a normalized plain object ready for save/copy/export.
   * Called by app shell persistence and raw draft helpers.
   */
  toExportObject(options = {}) {
    return cleanCharacterForExport(this.#data, options);
  }

  /**
   * Produces the exported JSON text form of the current character.
   * Called by save/download/copy flows and raw draft generation.
   */
  toJSONString(options = {}) {
    return stringifyJson(this.toExportObject(options));
  }

  /**
   * Returns a filesystem-friendly filename stem based on the current character.
   * Called by save/download flows.
   */
  suggestFileName() {
    return sanitizeFileName(this.#data.identity?.name || this.#data.id);
  }
}
