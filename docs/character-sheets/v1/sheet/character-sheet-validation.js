function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function createIssue(severity, code, message, details = {}) {
  return {
    severity,
    code,
    message,
    details
  };
}

/**
 * Performs fast sheet-facing validation over the final playable DTO shape.
 * This is intentionally not a full schema validator; it catches app-blocking
 * and table-facing issues while the schema remains the authoritative contract.
 */
export function validateCharacterSheet(character, options = {}) {
  const issues = [];

  if (!isObject(character)) {
    return [
      createIssue("error", "missing-character", "Character DTO is missing or not an object.")
    ];
  }

  if (normalizeString(character.schemaVersion) !== "v1") {
    issues.push(createIssue(
      "warning",
      "unsupported-schema-version",
      `Expected schemaVersion "v1"; found "${normalizeString(character.schemaVersion) || "blank"}".`,
      { schemaVersion: character.schemaVersion }
    ));
  }

  if (!normalizeString(character.id)) {
    issues.push(createIssue("error", "missing-character-id", "Character id is blank."));
  }

  if (options.characterId && normalizeString(character.id) && normalizeString(options.characterId) !== normalizeString(character.id)) {
    issues.push(createIssue(
      "warning",
      "character-id-mismatch",
      `Loaded character id "${character.id}" does not match requested id "${options.characterId}".`,
      {
        requestedId: options.characterId,
        loadedId: character.id
      }
    ));
  }

  if (!isObject(character.identity) || !normalizeString(character.identity?.name)) {
    issues.push(createIssue("warning", "missing-character-name", "Character name is blank."));
  }

  if (!isObject(character.abilities)) {
    issues.push(createIssue("error", "missing-abilities", "Ability scores are missing."));
  }

  if (!Array.isArray(character.classes)) {
    issues.push(createIssue("error", "missing-classes-array", "Classes must be an array."));
  } else if (!character.classes.length) {
    issues.push(createIssue("warning", "no-classes", "No class blocks are recorded."));
  }

  if (character.spellSlots && !character.classes?.some((entry) => entry?.spellcasting)) {
    issues.push(createIssue(
      "warning",
      "spell-slots-without-spellcasting",
      "Spell slots exist, but no class spellcasting block is present."
    ));
  }

  return issues;
}

export function hasBlockingSheetIssues(issues = []) {
  return issues.some((issue) => issue?.severity === "error");
}

export function summarizeSheetValidation(issues = []) {
  const errors = issues.filter((issue) => issue?.severity === "error").length;
  const warnings = issues.filter((issue) => issue?.severity === "warning").length;

  return {
    ok: errors === 0,
    errors,
    warnings,
    issueCount: issues.length
  };
}
