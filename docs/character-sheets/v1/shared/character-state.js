export const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

export const SKILL_TO_ABILITY = {
  acrobatics: "dex",
  animalHandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleightOfHand: "dex",
  stealth: "dex",
  survival: "wis"
};

const DEFAULT_ALLOWED_SOURCES = ["PHB"];

/**
 * Creates the default state object for one ability score entry.
 * Called by createEmptyCharacter() when building a new blank file.
 */
function createAbilityState() {
  return {
    score: 10,
    savingThrow: {
      proficient: false
    }
  };
}

/**
 * Creates the default HP stat block used in a new character.
 * Called by createEmptyCharacter().
 */
function createHpState() {
  return {
    base: 8,
    modifiers: [],
    max: 8,
    current: 8,
    temp: 0
  };
}

/**
 * Creates the default AC or speed stat block used in a new character.
 * Called by createEmptyCharacter() and normalizeStatBlock() fallbacks.
 */
function createValueState(value = 10) {
  return {
    base: value,
    modifiers: [],
    value
  };
}

/**
 * Deep-clones plain JSON-compatible data via stringify/parse.
 * Called throughout this module before normalization or nested updates.
 */
export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// This is the smallest editor-friendly shape that still satisfies the v1 schema.
// The app builds new characters from here, then normalizes them the same way it
// normalizes imported example files or user-authored JSON.
/**
 * Creates a brand-new character object with editor-safe defaults for every section.
 * Called when the user chooses "New Character" and when the module initializes state.
 */
export function createEmptyCharacter() {
  const abilities = {};

  for (const ability of ABILITY_ORDER) {
    abilities[ability] = createAbilityState();
  }

  return {
    schemaVersion: "v1",
    id: "char-new-character",
    lastModified: new Date().toISOString(),
    sourcePolicy: {
      ruleset: "2014",
      allowedSources: [...DEFAULT_ALLOWED_SOURCES],
      notes: ""
    },
    identity: {
      name: "New Character",
      playerName: "",
      alignment: "Unaligned",
      experience: 0,
      inspiration: false,
      portraitUrl: "",
      race: {
        ref: "",
        name: "",
        subrace: "",
        source: "PHB"
      },
      background: {
        ref: "",
        name: "",
        source: "PHB",
        feature: "",
        specialty: {}
      }
    },
    level: 1,
    proficiencyBonus: 2,
    initiative: 0,
    hp: createHpState(),
    ac: createValueState(10),
    speed: createValueState(30),
    hitDice: [],
    deathSaves: {
      successes: 0,
      failures: 0
    },
    abilities,
    skills: {},
    proficiencies: {
      armor: [],
      weapons: [],
      tools: [],
      languages: [],
      savingThrows: []
    },
    defenses: {
      damageResistances: [],
      damageImmunities: [],
      damageVulnerabilities: [],
      conditionImmunities: []
    },
    classes: [],
    spellSlots: null,
    resources: [],
    inventory: {
      currency: {
        cp: 0,
        sp: 0,
        ep: 0,
        gp: 0,
        pp: 0
      },
      carried: []
    },
    features: [],
    featureChoices: [],
    builderOverrides: [],
    notes: {
      freeform: "",
      conditions: [],
      exhaustion: 0
    },
    _meta: {
      exampleFor: "",
      demonstrates: []
    }
  };
}

/**
 * Reads a nested value using a path array or dot-separated string.
 * Called by draft generation helpers in the editor shell.
 */
export function getNestedValue(target, path) {
  const parts = Array.isArray(path) ? path : String(path).split(".");
  return parts.reduce((current, part) => current?.[part], target);
}

/**
 * Returns a cloned object with one nested path replaced.
 * Called by the guided editor when simple fields are edited.
 */
export function setNestedValue(target, path, value) {
  const parts = Array.isArray(path) ? path : String(path).split(".");
  const clone = deepClone(target);
  let current = clone;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const nextPart = parts[index + 1];

    if (current[part] == null || typeof current[part] !== "object") {
      current[part] = /^\d+$/.test(nextPart) ? [] : {};
    }

    current = current[part];
  }

  current[parts.at(-1)] = value;
  return clone;
}

/**
 * Ensures a value is an array, otherwise returns a fallback.
 * Called only inside normalizeCharacter()/normalize helpers.
 */
function toArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

/**
 * Ensures a value is a plain object, otherwise returns a fallback.
 * Called only inside normalizeCharacter()/normalize helpers.
 */
function toObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

/**
 * Normalizes the shape of hp/ac/speed blocks into editor-safe numeric objects.
 * Called by normalizeCharacter() for hp, ac, and speed.
 */
function normalizeStatBlock(input, kind) {
  const normalized = toObject(input, kind === "hp" ? createHpState() : createValueState(kind === "speed" ? 30 : 10));
  const base = Number(normalized.base ?? (kind === "speed" ? 30 : kind === "hp" ? 8 : 10));
  const modifiers = toArray(normalized.modifiers, []);

  if (kind === "hp") {
    return {
      base,
      modifiers,
      max: Number(normalized.max ?? base),
      current: Number(normalized.current ?? normalized.max ?? base),
      temp: Number(normalized.temp ?? 0)
    };
  }

  return {
    base,
    modifiers,
    value: Number(normalized.value ?? base)
  };
}

function normalizeInventoryItemName(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeCarriedInventory(inventory = {}) {
  const carried = toArray(inventory?.carried, []).map((item) => (
    item && typeof item === "object" && !Array.isArray(item)
      ? { ...item }
      : { name: String(item ?? ""), quantity: 1 }
  ));
  const equippedNames = Object.values(toObject(inventory?.equipped, {}))
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);

  if (!equippedNames.length) {
    return carried;
  }

  const carriedByName = new Map();
  carried.forEach((item, index) => {
    const key = normalizeInventoryItemName(item?.name);
    if (key && !carriedByName.has(key)) {
      carriedByName.set(key, index);
    }
  });

  for (const name of equippedNames) {
    const key = normalizeInventoryItemName(name);
    const existingIndex = carriedByName.get(key);
    if (existingIndex != null) {
      carried[existingIndex] = {
        ...carried[existingIndex],
        equipped: true
      };
      continue;
    }

    carriedByName.set(key, carried.length);
    carried.push({
      name,
      source: "PHB",
      quantity: 1,
      equipped: true,
      attunement: false,
      notes: "Migrated from the legacy equipped-slot model."
    });
  }

  return carried;
}

// Normalization is the contract between freeform JSON and the guided UI. It fills
// defaults, coerces primitives, and keeps optional containers present so the editor
// can update nested fields without guarding every access.
/**
 * Converts any imported/raw character payload into the editor's canonical runtime shape.
 * Called whenever characters are loaded, set, exported, or patched.
 */
export function normalizeCharacter(input) {
  const base = deepClone(input ?? createEmptyCharacter());
  const fallback = createEmptyCharacter();
  const abilities = {};

  for (const ability of ABILITY_ORDER) {
    const source = toObject(base.abilities?.[ability], fallback.abilities[ability]);
    abilities[ability] = {
      score: Number(source.score ?? 10),
      savingThrow: {
        proficient: Boolean(source.savingThrow?.proficient),
        grantedBy: source.savingThrow?.grantedBy ?? ""
      }
    };
  }

  const character = {
    schemaVersion: String(base.schemaVersion ?? "v1"),
    id: String(base.id ?? fallback.id),
    lastModified: String(base.lastModified ?? fallback.lastModified),
    sourcePolicy: {
      ruleset: String(base.sourcePolicy?.ruleset ?? "2014"),
      allowedSources: toArray(base.sourcePolicy?.allowedSources, [...DEFAULT_ALLOWED_SOURCES]).map((entry) => String(entry).trim()).filter(Boolean),
      notes: String(base.sourcePolicy?.notes ?? "")
    },
    identity: {
      name: String(base.identity?.name ?? fallback.identity.name),
      playerName: String(base.identity?.playerName ?? ""),
      alignment: String(base.identity?.alignment ?? fallback.identity.alignment),
      experience: Number(base.identity?.experience ?? 0),
      inspiration: Boolean(base.identity?.inspiration),
      portraitUrl: String(base.identity?.portraitUrl ?? ""),
      race: {
        ref: String(base.identity?.race?.ref ?? ""),
        name: String(base.identity?.race?.name ?? ""),
        subrace: String(base.identity?.race?.subrace ?? ""),
        source: String(base.identity?.race?.source ?? "PHB")
      },
      background: {
        ref: String(base.identity?.background?.ref ?? ""),
        name: String(base.identity?.background?.name ?? ""),
        source: String(base.identity?.background?.source ?? "PHB"),
        feature: String(base.identity?.background?.feature ?? ""),
        specialty: toObject(base.identity?.background?.specialty, {})
      }
    },
    level: Number(base.level ?? 1),
    proficiencyBonus: Number(base.proficiencyBonus ?? 2),
    initiative: Number(base.initiative ?? 0),
    hp: normalizeStatBlock(base.hp, "hp"),
    ac: normalizeStatBlock(base.ac, "ac"),
    speed: normalizeStatBlock(base.speed, "speed"),
    hitDice: toArray(base.hitDice, []),
    deathSaves: {
      successes: Number(base.deathSaves?.successes ?? 0),
      failures: Number(base.deathSaves?.failures ?? 0)
    },
    abilities,
    skills: toObject(base.skills, {}),
    proficiencies: {
      armor: toArray(base.proficiencies?.armor, []),
      weapons: toArray(base.proficiencies?.weapons, []),
      tools: toArray(base.proficiencies?.tools, []),
      languages: toArray(base.proficiencies?.languages, []).map((entry) => String(entry).trim()).filter(Boolean),
      savingThrows: []
    },
    defenses: {
      damageResistances: toArray(base.defenses?.damageResistances, []).map((entry) => String(entry).trim()).filter(Boolean),
      damageImmunities: toArray(base.defenses?.damageImmunities, []).map((entry) => String(entry).trim()).filter(Boolean),
      damageVulnerabilities: toArray(base.defenses?.damageVulnerabilities, []).map((entry) => String(entry).trim()).filter(Boolean),
      conditionImmunities: toArray(base.defenses?.conditionImmunities, []).map((entry) => String(entry).trim()).filter(Boolean)
    },
    classes: toArray(base.classes, []),
    spellSlots: base.spellSlots == null
      ? null
      : {
          byLevel: toObject(base.spellSlots?.byLevel, {})
        },
    resources: toArray(base.resources, []),
    inventory: {
      currency: {
        cp: Number(base.inventory?.currency?.cp ?? 0),
        sp: Number(base.inventory?.currency?.sp ?? 0),
        ep: Number(base.inventory?.currency?.ep ?? 0),
        gp: Number(base.inventory?.currency?.gp ?? 0),
        pp: Number(base.inventory?.currency?.pp ?? 0)
      },
      carried: normalizeCarriedInventory(base.inventory)
    },
    features: toArray(base.features, []),
    featureChoices: toArray(base.featureChoices, []),
    builderOverrides: toArray(base.builderOverrides, []),
    notes: {
      freeform: String(base.notes?.freeform ?? ""),
      conditions: toArray(base.notes?.conditions, []).map((entry) => String(entry).trim()).filter(Boolean),
      exhaustion: Number(base.notes?.exhaustion ?? 0)
    },
    _meta: {
      exampleFor: String(base._meta?.exampleFor ?? ""),
      demonstrates: toArray(base._meta?.demonstrates, []).map((entry) => String(entry))
    }
  };

  character.proficiencies.savingThrows = deriveSavingThrowList(character);
  return character;
}

/**
 * Rebuilds the top-level saving-throw proficiency list from ability state.
 * Called by normalization and saving-throw mutation helpers.
 */
export function deriveSavingThrowList(character) {
  return ABILITY_ORDER.filter((ability) => Boolean(character.abilities?.[ability]?.savingThrow?.proficient));
}

// Saving-throw proficiency lives in two places in the schema: the per-ability state
// and the top-level proficiencies.savingThrows array. These helpers keep them aligned.
/**
 * Updates one saving-throw entry and re-derives proficiencies.savingThrows.
 * Called by the editor's delegated ability-save input handler.
 */
export function setSavingThrowState(character, ability, patch) {
  const next = normalizeCharacter(character);
  next.abilities[ability].savingThrow = {
    ...next.abilities[ability].savingThrow,
    ...patch
  };
  next.proficiencies.savingThrows = deriveSavingThrowList(next);
  return next;
}

/**
 * Updates one skill proficiency entry, adding or removing it as needed.
 * Called by the editor's delegated skill-table input handler.
 */
export function setSkillState(character, skill, patch) {
  const next = normalizeCharacter(character);
  const previous = toObject(next.skills?.[skill], {});
  const merged = {
    ...previous,
    ...patch
  };

  merged.proficient = Boolean(merged.proficient);
  merged.expertise = Boolean(merged.expertise);
  merged.source = String(merged.source ?? "").trim();

  if (!merged.proficient && !merged.expertise && !merged.source) {
    delete next.skills[skill];
    return next;
  }

  next.skills[skill] = merged;
  return next;
}

// Exports run through one final cleanup pass so the JSON on disk is normalized, has a
// fresh lastModified timestamp when requested, and does not keep empty skill entries.
/**
 * Produces the final normalized JSON object that should be copied, saved, or downloaded.
 * Called by export/save flows and by getDraftValue("raw") in the editor shell.
 */
export function cleanCharacterForExport(character, options = {}) {
  const { touchModified = true } = options;
  const next = normalizeCharacter(character);
  if (touchModified) {
    next.lastModified = new Date().toISOString();
  }

  for (const [skill, entry] of Object.entries(next.skills)) {
    if (!entry?.proficient && !entry?.expertise && !String(entry?.source ?? "").trim()) {
      delete next.skills[skill];
    }
  }

  next.proficiencies.savingThrows = deriveSavingThrowList(next);
  return next;
}

/**
 * Converts a character name into a filesystem-friendly slug.
 * Called when generating ids and suggested JSON filenames.
 */
export function sanitizeFileName(value) {
  return String(value ?? "character")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "character";
}

/**
 * Parses a comma-separated text field into a trimmed string array.
 * Called by CSV-backed guided editor fields such as languages and conditions.
 */
export function parseCsvList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Pretty-prints a value as indented JSON text for the raw editor panels.
 * Called whenever a JSON draft is generated or reformatted.
 */
export function stringifyJson(value) {
  return JSON.stringify(value, null, 2);
}
