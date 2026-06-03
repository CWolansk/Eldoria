#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "docs", "data", "items.csv");
const DATA_DIR = path.join(ROOT, "docs", "character-sheets", "v1", "data");
const ITEMS_JSON_PATH = path.join(DATA_DIR, "items.json");
const MAGIC_VARIANTS_JSON_PATH = path.join(DATA_DIR, "magic-variants.json");
const ITEM_PROPERTIES_JSON_PATH = path.join(DATA_DIR, "item-properties.json");
const RULES_MANIFEST_PATH = path.join(DATA_DIR, "rules-manifest.json");
const RAW_ITEMS_PATH = path.join(ROOT, "docs", "5etools", "data", "items.json");
const RAW_BASE_ITEMS_PATH = path.join(ROOT, "docs", "5etools", "data", "items-base.json");
const RAW_MAGIC_VARIANTS_PATH = path.join(ROOT, "docs", "5etools", "data", "magicvariants.json");
const HOMEBREW_DIR = path.join(ROOT, "docs", "5etools", "homebrew");
const HOMEBREW_INDEX_PATH = path.join(HOMEBREW_DIR, "index.json");
const REPORT_PATH = path.join(ROOT, "tmp", "regenerate-items-json-report.json");

const HOMEBREW_RAW_BASE_URL = "https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/";

const REQUIRED_HOMEBREW_PACKAGES = [
  "collection/Ghostfire Gaming; Grim Hollow - Lairs of Etharis.json",
  "collection/Ghostfire Gaming; Dungeons of Drakkenheim.json",
  "collection/Darrington Press; Tal\u2019Dorei Campaign Setting Reborn.json",
  "creature/Kobold Press; Tome of Beasts 1 (2023 Edition).json"
];

const PRICE_ONLY_HOMEBREW_FILES = new Set([
  "Giddy; Sane Magic Item Prices Expanded.json",
  "Saidoro; Sane Magic Item Prices.json"
]);

const PRICE_ONLY_SOURCES = new Set([
  "SANEMAGICITEMPRICES",
  "SANEMAGICITEMPRICESEXPANDED"
]);

const SOURCE_ALIASES = new Map(Object.entries({
  BOET: "BOOKOFEBONTIDES",
  DODK: "DUNGEONSDRAKKENHEIM",
  DUNGEONSDRAKKENHEIM: "DUNGEONSDRAKKENHEIM",
  DUNGEONSOFDRAKKENHEIM: "DUNGEONSDRAKKENHEIM",
  FAIWG: "FFITEMSGALORE",
  FFAIWG: "FFITEMSGALORE",
  "FM!": "FLEEMORTALS",
  "GH:PP": "GRIMHOLLOWPLAYERPACK",
  GHPP: "GRIMHOLLOWPLAYERPACK",
  GHLOE: "GRIMHOLLOWLAIRSETHARIS",
  GRIMHOLLOWLAIRSETHARIS: "GRIMHOLLOWLAIRSETHARIS",
  GRIMHOLLOWLAIRSOFETHARIS: "GRIMHOLLOWLAIRSETHARIS",
  TDCSR: "TALDOREICAMPAIGNSETTINGREBORN",
  TALDOREICAMPAIGNSETTINGREBORN: "TALDOREICAMPAIGNSETTINGREBORN",
  TFTS: "TALESFROMTHESHADOWS",
  TOB123: "TOB12023",
  TOB12023: "TOB12023",
  TGS2: "GRIFFONSSADDLEBAG2",
  WEL: "WHEREEVILLIVES"
}));

const DAMAGE_TYPE_NAMES = {
  A: "acid",
  B: "bludgeoning",
  C: "cold",
  F: "fire",
  O: "force",
  L: "lightning",
  N: "necrotic",
  P: "piercing",
  I: "poison",
  Y: "psychic",
  R: "radiant",
  S: "slashing",
  T: "thunder"
};

function normalize(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeName(value) {
  return normalize(value).toLowerCase();
}

function normalizeSource(value) {
  return normalize(value).toUpperCase().replace(/[^A-Z0-9!]/g, "");
}

function canonicalSource(value) {
  const source = normalizeSource(value).replace(/(?:20)?(?:14|24)$/g, "");
  return SOURCE_ALIASES.get(source) || source;
}

function isPriceOnlySource(value) {
  return PRICE_ONLY_SOURCES.has(canonicalSource(value));
}

function makeExactKey(name, source) {
  return `${normalizeName(name)}|${normalizeSource(source)}`;
}

function makeAliasKey(name, source) {
  return `${normalizeName(name)}|${canonicalSource(source)}`;
}

function slugify(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function toArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(current);
      if (row.some((cell) => normalize(cell))) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => normalize(cell))) {
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values, rowIndex) => {
    const entry = { __row: rowIndex + 2 };
    headers.forEach((header, headerIndex) => {
      entry[header] = values[headerIndex] || "";
    });
    return entry;
  });
}

function parseCurrencyToCopper(rawValue) {
  const original = normalize(rawValue);
  const text = original.replace(/,/g, "").toLowerCase();
  if (!text) {
    return { value: null, label: "" };
  }

  const match = text.match(/^(\d+(?:\.\d+)?)\s*(cp|sp|ep|gp|pp)$/i);
  if (!match) {
    return { value: null, label: original };
  }

  const amount = Number(match[1]);
  const multipliers = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
  const unit = match[2].toLowerCase();
  return {
    value: Number.isFinite(amount) ? Math.round(amount * multipliers[unit]) : null,
    label: original
  };
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`${response.statusCode} ${response.statusMessage || ""}`.trim()));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

function urlForRemotePath(remotePath) {
  return `${HOMEBREW_RAW_BASE_URL}${encodeURI(remotePath).replace(/#/g, "%23")}`;
}

async function downloadRequiredHomebrew() {
  const downloaded = [];

  for (const remotePath of REQUIRED_HOMEBREW_PACKAGES) {
    const fileName = path.basename(remotePath);
    const targetPath = path.join(HOMEBREW_DIR, fileName);
    const payload = await requestJson(urlForRemotePath(remotePath));
    writeJson(targetPath, payload);
    downloaded.push({ remotePath, fileName, targetPath: path.relative(ROOT, targetPath) });
  }

  const index = fs.existsSync(HOMEBREW_INDEX_PATH)
    ? loadJson(HOMEBREW_INDEX_PATH)
    : { readme: [], toImport: [] };
  const imports = new Set(toArray(index.toImport));
  downloaded.forEach((entry) => imports.add(entry.fileName));
  index.toImport = Array.from(imports);
  writeJson(HOMEBREW_INDEX_PATH, index);

  return downloaded;
}

function buildCsvMaps(csvRows) {
  const exact = new Map();
  const alias = new Map();

  csvRows.forEach((row) => {
    const price = parseCurrencyToCopper(row.Value);
    const valueEntry = {
      row: row.__row,
      name: row.Name,
      source: row.Source,
      value: price.value,
      valueLabel: price.label,
      rawValue: row.Value,
      csv: row
    };

    const exactKey = makeExactKey(row.Name, row.Source);
    const aliasKey = makeAliasKey(row.Name, row.Source);
    if (!exact.has(exactKey)) {
      exact.set(exactKey, valueEntry);
    }
    if (!alias.has(aliasKey)) {
      alias.set(aliasKey, valueEntry);
    }
  });

  return { exact, alias };
}

function getCsvMatch(csvMaps, name, source) {
  return csvMaps.exact.get(makeExactKey(name, source))
    || csvMaps.alias.get(makeAliasKey(name, source))
    || null;
}

function applyCsvValue(item, csvMaps) {
  const match = getCsvMatch(csvMaps, item.name, item.source);
  if (!match) {
    return { item, matched: false };
  }

  if (match.value != null) {
    item.value = match.value;
    if (isObject(item.raw)) {
      item.raw.value = match.value;
    }
  }

  if (match.valueLabel) {
    item.valueLabel = match.valueLabel;
  }

  item.csvRow = match.row;
  return { item, matched: true };
}

function parseTypedCode(value, defaultSource = "PHB") {
  const text = normalize(value);
  if (!text) {
    return { code: "", abbreviation: "", source: "" };
  }

  const [abbreviation, source] = text.split("|").map(normalize);
  return {
    code: text,
    abbreviation: abbreviation || text,
    source: source || defaultSource
  };
}

function makeTypeLookup(itemPropertiesPayload) {
  const lookup = new Map();
  toArray(itemPropertiesPayload.itemTypes).forEach((type) => {
    const keys = [
      type.abbreviation,
      type.raw?.abbreviation,
      type.sourceKey,
      `${type.abbreviation}|${type.source}`,
      type.name
    ].map((value) => normalize(value).toLowerCase()).filter(Boolean);

    keys.forEach((key) => {
      if (!lookup.has(key)) {
        lookup.set(key, type);
      }
    });
  });
  return lookup;
}

function makePropertyLookup(itemPropertiesPayload) {
  const lookup = new Map();
  toArray(itemPropertiesPayload.itemProperties).forEach((property) => {
    const keys = [
      property.abbreviation,
      property.raw?.abbreviation,
      property.sourceKey,
      `${property.abbreviation}|${property.source}`,
      property.name
    ].map((value) => normalize(value).toLowerCase()).filter(Boolean);

    keys.forEach((key) => {
      if (!lookup.has(key)) {
        lookup.set(key, property);
      }
    });
  });
  return lookup;
}

function normalizeType(value, lookup) {
  const parsed = parseTypedCode(value);
  if (!parsed.code) {
    return { code: "", abbreviation: "", source: "", name: "", ref: "" };
  }

  const keys = [
    parsed.code,
    parsed.abbreviation,
    `${parsed.abbreviation}|${parsed.source}`
  ].map((entry) => entry.toLowerCase());
  const found = keys.map((key) => lookup.get(key)).find(Boolean);

  if (found) {
    return {
      code: parsed.code,
      abbreviation: found.abbreviation || parsed.abbreviation,
      source: found.source || parsed.source,
      name: found.name || parsed.abbreviation,
      ref: found.ref || ""
    };
  }

  return {
    code: parsed.code,
    abbreviation: parsed.abbreviation,
    source: parsed.source,
    name: parsed.abbreviation,
    ref: ""
  };
}

function normalizeProperty(value, lookup) {
  const parsed = parseTypedCode(isObject(value) ? value.code || value.abbreviation || value.name : value);
  if (!parsed.code) {
    return null;
  }

  const keys = [
    parsed.code,
    parsed.abbreviation,
    `${parsed.abbreviation}|${parsed.source}`
  ].map((entry) => entry.toLowerCase());
  const found = keys.map((key) => lookup.get(key)).find(Boolean);
  return {
    code: parsed.code,
    abbreviation: found?.abbreviation || parsed.abbreviation,
    source: found?.source || parsed.source,
    name: found?.name || value.name || parsed.abbreviation,
    ref: found?.ref || ""
  };
}

function normalizeProperties(values, lookup) {
  return toArray(values).map((value) => normalizeProperty(value, lookup)).filter(Boolean);
}

function parseRange(rawRange) {
  const text = normalize(rawRange);
  const match = text.match(/^(\d+)\/(\d+)$/);
  return {
    raw: text,
    normal: match ? Number(match[1]) : null,
    long: match ? Number(match[2]) : null
  };
}

function collectBooleanTags(raw) {
  const excluded = new Set([
    "srd",
    "basicRules",
    "name",
    "source",
    "page",
    "type",
    "typeAlt",
    "rarity",
    "value",
    "weight",
    "entries",
    "property",
    "range",
    "reload",
    "dmg1",
    "dmg2",
    "dmgType",
    "ac",
    "strength",
    "stealth",
    "weaponCategory",
    "reqAttune",
    "reqAttuneTags",
    "baseItem",
    "_copy"
  ]);
  const tags = {};

  Object.entries(raw || {}).forEach(([key, value]) => {
    if (!excluded.has(key) && value === true) {
      tags[key] = true;
    }
  });

  return tags;
}

function collectBonuses(raw) {
  const bonuses = {};
  [
    "bonusAc",
    "bonusWeapon",
    "bonusWeaponAttack",
    "bonusWeaponDamage",
    "bonusWeaponCritDamage",
    "bonusSpellAttack",
    "bonusSpellSaveDc",
    "bonusSavingThrow"
  ].forEach((key) => {
    if (raw?.[key] != null) {
      bonuses[key] = raw[key];
    }
  });
  return bonuses;
}

function normalizeAttunement(raw) {
  const reqAttune = raw?.reqAttune;
  const required = Boolean(reqAttune);
  let text = "";

  if (typeof reqAttune === "string") {
    text = reqAttune;
  } else if (required) {
    text = "required";
  }

  return {
    required,
    text,
    alternatives: toArray(raw?.reqAttuneAlt),
    tags: toArray(raw?.reqAttuneTags)
  };
}

function normalizeArmor(raw, type, bonuses) {
  const typeCode = normalize(type?.abbreviation || type?.code).toUpperCase();
  const hasArmor = Boolean(raw?.armor || raw?.ac != null || ["LA", "MA", "HA", "S"].includes(typeCode));
  if (!hasArmor) {
    return null;
  }

  return {
    ac: raw.ac ?? null,
    strength: raw.strength ?? "",
    stealth: Boolean(raw.stealth),
    type,
    bonuses
  };
}

function normalizeWeapon(raw, propertyLookup, bonuses) {
  const hasWeapon = Boolean(raw?.weapon || raw?.weaponCategory || raw?.dmg1);
  if (!hasWeapon) {
    return null;
  }

  return {
    category: normalize(raw.weaponCategory),
    properties: normalizeProperties(raw.property, propertyLookup),
    damage: {
      primary: normalize(raw.dmg1),
      versatile: normalize(raw.dmg2),
      type: {
        code: normalize(raw.dmgType),
        name: DAMAGE_TYPE_NAMES[normalize(raw.dmgType).toUpperCase()] || normalize(raw.dmgType)
      }
    },
    range: parseRange(raw.range),
    reload: raw.reload ?? null,
    reach: raw.reach ?? null,
    ammoType: normalize(raw.ammoType),
    bonuses,
    tags: collectBooleanTags(raw)
  };
}

function makeCatalogIdentity(kind, name, source) {
  const sourceSlug = slugify(source);
  const nameSlug = slugify(name);
  const prefix = kind === "baseItem"
    ? "base-item"
    : kind === "magicVariant"
      ? "magic-variant"
      : kind === "composedMagicVariant"
        ? "generated-item"
        : "item";

  return {
    id: `${prefix}:${nameSlug}:${sourceSlug}`,
    ref: `${prefix}-${nameSlug}-${sourceSlug}.json`,
    refId: `${prefix}-${nameSlug}-${sourceSlug}`
  };
}

function normalizeRawItem(raw, kind, context) {
  const type = normalizeType(raw.type, context.typeLookup);
  const typeAlt = raw.typeAlt ? normalizeType(raw.typeAlt, context.typeLookup) : null;
  const bonuses = collectBonuses(raw);
  const identity = makeCatalogIdentity(kind, raw.name, raw.source);
  const weapon = normalizeWeapon(raw, context.propertyLookup, bonuses);
  const armor = normalizeArmor(raw, type, bonuses);

  return {
    ...identity,
    kind,
    name: normalize(raw.name),
    source: normalize(raw.source),
    page: raw.page ?? "",
    sourceKey: `${normalize(raw.name)}|${normalize(raw.source)}`,
    baseItem: raw.baseItem
      ? {
        ref: normalize(raw.baseItem),
        name: normalize(raw.baseItem).split("|")[0],
        source: normalize(raw.baseItem).split("|")[1] || ""
      }
      : null,
    type,
    typeAlt,
    rarity: normalize(raw.rarity) || "none",
    value: raw.value ?? null,
    weight: raw.weight ?? null,
    attunement: normalizeAttunement(raw),
    tags: {
      ...collectBooleanTags(raw),
      ...(weapon ? { weapon: true } : {}),
      ...(armor ? { armor: true } : {})
    },
    bonuses,
    weapon,
    armor,
    conditionalDamage: [],
    mechanics: {
      ...(raw.focus ? { focus: toArray(raw.focus) } : {}),
      ...(raw.age ? { age: raw.age } : {}),
      ...(raw.scfType ? { scfType: raw.scfType } : {})
    },
    entries: toArray(raw.entries),
    raw: deepClone(raw)
  };
}

function normalizeVariantInherits(rawInherits = {}, context) {
  const bonuses = collectBonuses(rawInherits);
  return {
    namePrefix: rawInherits.namePrefix == null ? "" : String(rawInherits.namePrefix),
    nameSuffix: rawInherits.nameSuffix == null ? "" : String(rawInherits.nameSuffix),
    source: normalize(rawInherits.source),
    page: rawInherits.page ?? "",
    rarity: normalize(rawInherits.rarity),
    tier: normalize(rawInherits.tier),
    valueExpression: normalize(rawInherits.valueExpression),
    value: rawInherits.value ?? null,
    attunement: normalizeAttunement(rawInherits),
    bonuses,
    weapon: {
      bonuses
    },
    armor: Object.keys(bonuses).length ? { bonuses } : null,
    mechanics: {},
    propertyAdd: normalizeProperties(rawInherits.propertyAdd, context.propertyLookup),
    propertyRemove: toArray(rawInherits.propertyRemove),
    conditionalDamage: toArray(rawInherits.conditionalDamage),
    entries: toArray(rawInherits.entries)
  };
}

function normalizeRawMagicVariant(raw, context) {
  const source = normalize(raw.inherits?.source || raw.source);
  const identity = makeCatalogIdentity("magicVariant", raw.name, source);
  const inherits = normalizeVariantInherits(raw.inherits, context);
  const type = normalizeType(raw.type || "GV|DMG", context.typeLookup);

  return {
    ...identity,
    kind: "magicVariant",
    name: normalize(raw.name),
    source,
    page: raw.page ?? raw.inherits?.page ?? "",
    sourceKey: `${normalize(raw.name)}|${source}`,
    type,
    typeAlt: null,
    rarity: normalize(inherits.rarity) || "common",
    value: inherits.value ?? null,
    valueLabel: "",
    weight: null,
    attunement: inherits.attunement,
    tags: { genericVariant: true },
    bonuses: inherits.bonuses,
    weapon: null,
    armor: null,
    conditionalDamage: toArray(raw.conditionalDamage).concat(toArray(inherits.conditionalDamage)),
    mechanics: {},
    entries: toArray(raw.entries).concat(toArray(inherits.entries)),
    requires: toArray(raw.requires),
    excludes: raw.excludes || {},
    inherits,
    raw: deepClone(raw)
  };
}

function rawValueMatches(actual, expected) {
  const actualValues = toArray(actual).map((value) => normalize(value).toLowerCase()).filter(Boolean);
  const expectedValues = toArray(expected).map((value) => normalize(value).toLowerCase()).filter(Boolean);
  if (!actualValues.length || !expectedValues.length) {
    return false;
  }
  return expectedValues.some((expectedValue) => actualValues.includes(expectedValue));
}

function itemHasTag(item, key) {
  if (key === "weapon") {
    return Boolean(item.weapon || item.tags?.weapon);
  }
  if (key === "armor") {
    return Boolean(item.armor || item.tags?.armor);
  }
  if (key === "net") {
    return normalizeName(item.name) === "net";
  }
  if (key === "ammo") {
    return normalize(item.type?.code || item.type?.abbreviation).toUpperCase() === "A";
  }
  return Boolean(item.tags?.[key] || item.weapon?.tags?.[key] || item.raw?.[key]);
}

function itemMatchesRequirement(item, key, expected) {
  if (expected === false) {
    return !itemMatchesRequirement(item, key, true);
  }

  const normalizedKey = normalize(key);
  if (normalizedKey === "type") {
    return rawValueMatches([item.type?.code, item.type?.abbreviation, item.type?.name].filter(Boolean), expected);
  }
  if (normalizedKey === "weapon") {
    return itemHasTag(item, "weapon");
  }
  if (normalizedKey === "armor") {
    return itemHasTag(item, "armor");
  }
  if (normalizedKey === "weaponCategory") {
    return rawValueMatches(item.weapon?.category, expected);
  }
  if (normalizedKey === "property") {
    const propertyKeys = toArray(item.weapon?.properties)
      .flatMap((property) => [property.code, property.abbreviation, property.name])
      .map((value) => normalize(value).toLowerCase())
      .filter(Boolean);
    return toArray(expected).length
      ? toArray(expected).some((value) => propertyKeys.includes(normalize(isObject(value) ? value.code || value.abbreviation || value.name : value).toLowerCase()))
      : propertyKeys.includes(normalize(isObject(expected) ? expected.code || expected.abbreviation || expected.name : expected).toLowerCase());
  }
  if (normalizedKey === "dmgType") {
    return rawValueMatches([item.weapon?.damage?.type?.code, item.weapon?.damage?.type?.name].filter(Boolean), expected);
  }
  if (normalizedKey === "name") {
    return rawValueMatches(item.name, expected);
  }
  if (normalizedKey === "source") {
    return rawValueMatches(item.source, expected);
  }
  if (expected === true) {
    return itemHasTag(item, normalizedKey);
  }
  return rawValueMatches(item.raw?.[normalizedKey] ?? item.tags?.[normalizedKey], expected);
}

function itemMatchesVariant(item, variant) {
  const requirements = toArray(variant.requires);
  const requirementMatch = !requirements.length || requirements.some((requirement) => (
    Object.entries(requirement || {}).every(([key, expected]) => itemMatchesRequirement(item, key, expected))
  ));
  if (!requirementMatch) {
    return false;
  }

  const excludes = variant.excludes;
  if (isObject(excludes) && Object.keys(excludes).length) {
    const excluded = Object.entries(excludes).every(([key, expected]) => itemMatchesRequirement(item, key, expected));
    if (excluded) {
      return false;
    }
  }

  return true;
}

function hasMeaningfulValue(value) {
  if (value == null || value === "") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (isObject(value)) {
    return Object.values(value).some(hasMeaningfulValue);
  }
  return true;
}

function mergeMeaningful(base, patch) {
  const merged = { ...(isObject(base) ? base : {}) };
  Object.entries(isObject(patch) ? patch : {}).forEach(([key, value]) => {
    if (isObject(value) && isObject(merged[key])) {
      merged[key] = mergeMeaningful(merged[key], value);
    } else if (hasMeaningfulValue(value)) {
      merged[key] = value;
    }
  });
  return merged;
}

function mergeProperties(baseProperties, inherits) {
  const byCode = new Map();
  toArray(baseProperties).forEach((property) => {
    const code = normalize(property.code || property.abbreviation || property.name).toUpperCase();
    if (code) {
      byCode.set(code, property);
    }
  });
  toArray(inherits.propertyAdd).forEach((property) => {
    const code = normalize(property.code || property.abbreviation || property.name).toUpperCase();
    if (code) {
      byCode.set(code, property);
    }
  });
  toArray(inherits.propertyRemove).forEach((property) => {
    const code = normalize(property.code || property.abbreviation || property.name || property).toUpperCase();
    if (code) {
      byCode.delete(code);
    }
  });
  return Array.from(byCode.values());
}

function evaluateValueExpression(expression, baseValue) {
  const text = normalize(expression);
  if (!text || baseValue == null) {
    return null;
  }

  const replaced = text.replace(/\[\[baseItem\.value\]\]/g, String(baseValue));
  if (!/^[\d+\-*/ ().]+$/.test(replaced)) {
    return null;
  }

  try {
    const value = Function(`"use strict"; return (${replaced});`)();
    return Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
  } catch {
    return null;
  }
}

function composeItemWithVariant(baseItem, variant) {
  const inherits = variant.inherits || {};
  const prefix = inherits.namePrefix == null ? "" : String(inherits.namePrefix);
  const suffix = inherits.nameSuffix == null ? "" : String(inherits.nameSuffix);
  if (!prefix && !suffix) {
    return null;
  }

  const name = `${prefix}${baseItem.name}${suffix}`;
  const source = normalize(inherits.source || variant.source || baseItem.source);
  const identity = makeCatalogIdentity("composedMagicVariant", name, source);
  const bonuses = {
    ...baseItem.bonuses,
    ...inherits.bonuses
  };
  const weapon = baseItem.weapon
    ? {
      ...mergeMeaningful(baseItem.weapon, inherits.weapon),
      damage: mergeMeaningful(baseItem.weapon.damage, inherits.weapon?.damage),
      range: mergeMeaningful(baseItem.weapon.range, inherits.weapon?.range),
      bonuses: {
        ...baseItem.weapon.bonuses,
        ...inherits.weapon?.bonuses,
        ...bonuses
      },
      tags: {
        ...baseItem.weapon.tags,
        ...inherits.weapon?.tags
      },
      properties: mergeProperties(baseItem.weapon.properties, inherits)
    }
    : null;
  const expressionValue = evaluateValueExpression(inherits.valueExpression, baseItem.value);

  return {
    ...identity,
    kind: "composedMagicVariant",
    name,
    source,
    page: inherits.page ?? variant.page ?? baseItem.page ?? "",
    sourceKey: `${name}|${source}`,
    baseItem: {
      ref: baseItem.ref,
      id: baseItem.id,
      name: baseItem.name,
      source: baseItem.source
    },
    type: baseItem.type,
    typeAlt: baseItem.typeAlt,
    rarity: normalize(inherits.rarity) || baseItem.rarity,
    value: inherits.value ?? expressionValue ?? null,
    weight: baseItem.weight ?? null,
    attunement: inherits.attunement?.required ? inherits.attunement : baseItem.attunement,
    tags: {
      ...baseItem.tags,
      generated: true
    },
    bonuses,
    weapon,
    armor: baseItem.armor || inherits.armor
      ? {
        ...baseItem.armor,
        ...inherits.armor
      }
      : null,
    conditionalDamage: [
      ...toArray(baseItem.conditionalDamage),
      ...toArray(variant.conditionalDamage),
      ...toArray(inherits.conditionalDamage)
    ],
    mechanics: {
      ...baseItem.mechanics,
      ...inherits.mechanics
    },
    entries: [
      ...toArray(variant.entries),
      ...toArray(inherits.entries)
    ],
    generatedFrom: {
      variantName: variant.name,
      variantSource: variant.source,
      variantRef: variant.ref,
      baseItemName: baseItem.name,
      baseItemSource: baseItem.source,
      baseItemRef: baseItem.ref
    },
    raw: {
      generated: true,
      variantName: variant.name,
      variantSource: variant.source,
      baseItemName: baseItem.name,
      baseItemSource: baseItem.source
    }
  };
}

function makeCsvBackfillItem(row) {
  const source = normalize(row.Source);
  const name = normalize(row.Name);
  const identity = makeCatalogIdentity("item", name, source || "Homebrew");
  const price = parseCurrencyToCopper(row.Value);
  const typeText = normalize(row.Type) || "item";
  const lowerType = typeText.toLowerCase();
  const isWeapon = lowerType.includes("weapon");
  const isArmor = lowerType.includes("armor") || lowerType.includes("shield");

  return {
    ...identity,
    kind: "csvBackfill",
    name,
    source,
    page: normalize(row.Page),
    sourceKey: `${name}|${source}`,
    baseItem: null,
    type: {
      code: "",
      abbreviation: "",
      source: source,
      name: typeText,
      ref: ""
    },
    typeAlt: null,
    rarity: normalize(row.Rarity) || "common",
    value: price.value,
    valueLabel: price.label,
    weight: null,
    attunement: {
      required: Boolean(normalize(row.Attunement)),
      text: normalize(row.Attunement).replace(/^requires attunement\s*/i, ""),
      alternatives: [],
      tags: []
    },
    tags: {
      csvBackfill: true,
      wondrous: lowerType.includes("wondrous"),
      ...(isWeapon ? { weapon: true } : {}),
      ...(isArmor ? { armor: true } : {})
    },
    bonuses: {},
    weapon: isWeapon
      ? {
        category: lowerType.includes("martial") ? "martial" : lowerType.includes("simple") ? "simple" : "",
        properties: [],
        damage: { primary: normalize(row.Damage), versatile: "", type: { code: "", name: "" } },
        range: { raw: "", normal: null, long: null },
        reload: null,
        reach: null,
        ammoType: "",
        bonuses: {},
        tags: {}
      }
      : null,
    armor: isArmor ? { ac: null, strength: "", stealth: false, bonuses: {} } : null,
    conditionalDamage: [],
    mechanics: {},
    entries: normalize(row.Text) ? [normalize(row.Text)] : [],
    csvRow: row.__row,
    raw: {
      csv: row
    }
  };
}

function getHomebrewJsonFiles() {
  return fs.readdirSync(HOMEBREW_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
    .filter((fileName) => !["index.json", "package.json"].includes(fileName.toLowerCase()))
    .filter((fileName) => !PRICE_ONLY_HOMEBREW_FILES.has(fileName))
    .map((fileName) => path.join(HOMEBREW_DIR, fileName));
}

function collectRawPayloads() {
  const payloads = [
    { filePath: RAW_ITEMS_PATH, payload: loadJson(RAW_ITEMS_PATH) },
    { filePath: RAW_BASE_ITEMS_PATH, payload: loadJson(RAW_BASE_ITEMS_PATH) },
    { filePath: RAW_MAGIC_VARIANTS_PATH, payload: loadJson(RAW_MAGIC_VARIANTS_PATH) }
  ];

  getHomebrewJsonFiles().forEach((filePath) => {
    payloads.push({ filePath, payload: loadJson(filePath) });
  });

  return payloads;
}

function addItem(items, indexes, item) {
  if (!item?.name) {
    return false;
  }

  const aliasKey = makeAliasKey(item.name, item.source);
  if (indexes.alias.has(aliasKey)) {
    return false;
  }

  const exactKey = makeExactKey(item.name, item.source);
  indexes.exact.set(exactKey, item);
  indexes.alias.set(aliasKey, item);
  items.push(item);
  return true;
}

function buildItemIndexes(items) {
  const indexes = { exact: new Map(), alias: new Map() };
  items.forEach((item) => {
    indexes.exact.set(makeExactKey(item.name, item.source), item);
    indexes.alias.set(makeAliasKey(item.name, item.source), item);
  });
  return indexes;
}

function countCsvCoverage(csvRows, indexes) {
  const missing = [];
  csvRows.forEach((row) => {
    if (!indexes.exact.has(makeExactKey(row.Name, row.Source)) && !indexes.alias.has(makeAliasKey(row.Name, row.Source))) {
      missing.push({
        row: row.__row,
        name: row.Name,
        source: row.Source,
        value: row.Value
      });
    }
  });
  return {
    covered: csvRows.length - missing.length,
    missing
  };
}

function updateRulesManifest(itemsPayload) {
  if (!fs.existsSync(RULES_MANIFEST_PATH)) {
    return false;
  }

  const manifest = loadJson(RULES_MANIFEST_PATH);
  const itemCounts = itemsPayload.counts;
  if (manifest.counts?.catalogs?.items) {
    manifest.counts.catalogs.items = itemCounts;
  }

  const itemEntry = toArray(manifest.catalogs).find((entry) => entry.id === "items");
  if (itemEntry) {
    itemEntry.schema = itemsPayload.schema;
    itemEntry.schemaVersion = itemsPayload.schemaVersion;
    itemEntry.path = "items.json";
    itemEntry.counts = itemCounts;
  }

  manifest.generatedAt = itemsPayload.generatedAt;
  if (manifest.counts?.csv) {
    manifest.counts.csv.items = itemsPayload.counts.csvRows;
  }
  writeJson(RULES_MANIFEST_PATH, manifest);
  return true;
}

async function main() {
  const downloadedHomebrew = await downloadRequiredHomebrew();
  const csvRows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const csvMaps = buildCsvMaps(csvRows);
  const itemPropertiesPayload = loadJson(ITEM_PROPERTIES_JSON_PATH);
  const context = {
    typeLookup: makeTypeLookup(itemPropertiesPayload),
    propertyLookup: makePropertyLookup(itemPropertiesPayload)
  };
  const existingPayload = loadJson(ITEMS_JSON_PATH);
  const generatedKinds = new Set(["composedMagicVariant", "csvBackfill"]);
  const existingItems = toArray(existingPayload.items)
    .filter((item) => !generatedKinds.has(item.kind))
    .filter((item) => !isPriceOnlySource(item.source))
    .map((item) => applyCsvValue(deepClone(item), csvMaps).item);
  const items = [];
  const indexes = { exact: new Map(), alias: new Map() };
  const stats = {
    existing: 0,
    rawItemsAdded: 0,
    rawBaseItemsAdded: 0,
    rawMagicVariantsAdded: 0,
    generatedAdded: 0,
    csvBackfillAdded: 0,
    valuesFromCsv: 0
  };

  existingItems.forEach((item) => {
    if (addItem(items, indexes, item)) {
      stats.existing += 1;
      if (item.csvRow) stats.valuesFromCsv += 1;
    }
  });

  const payloads = collectRawPayloads();
  const normalizedBaseItems = [];
  const normalizedVariants = [];

  payloads.forEach(({ payload }) => {
    toArray(payload.item).forEach((raw) => {
      const item = normalizeRawItem(raw, "item", context);
      const before = Boolean(item.csvRow);
      applyCsvValue(item, csvMaps);
      if (addItem(items, indexes, item)) {
        stats.rawItemsAdded += 1;
        if (!before && item.csvRow) stats.valuesFromCsv += 1;
      }
    });

    toArray(payload.baseitem).forEach((raw) => {
      const item = normalizeRawItem(raw, "baseItem", context);
      const before = Boolean(item.csvRow);
      applyCsvValue(item, csvMaps);
      normalizedBaseItems.push(item);
      if (addItem(items, indexes, item)) {
        stats.rawBaseItemsAdded += 1;
        if (!before && item.csvRow) stats.valuesFromCsv += 1;
      }
    });

    toArray(payload.magicvariant).forEach((raw) => {
      const variant = normalizeRawMagicVariant(raw, context);
      const before = Boolean(variant.csvRow);
      applyCsvValue(variant, csvMaps);
      normalizedVariants.push(variant);
      if (addItem(items, indexes, variant)) {
        stats.rawMagicVariantsAdded += 1;
        if (!before && variant.csvRow) stats.valuesFromCsv += 1;
      }
    });
  });

  const baseItems = items.filter((item) => item.kind === "baseItem").concat(normalizedBaseItems)
    .filter((item, index, all) => all.findIndex((candidate) => makeAliasKey(candidate.name, candidate.source) === makeAliasKey(item.name, item.source)) === index);
  const variants = normalizedVariants
    .filter((variant, index, all) => all.findIndex((candidate) => makeAliasKey(candidate.name, candidate.source) === makeAliasKey(variant.name, variant.source)) === index);

  variants.forEach((variant) => {
    baseItems.forEach((baseItem) => {
      if (!itemMatchesVariant(baseItem, variant)) {
        return;
      }

      const generated = composeItemWithVariant(baseItem, variant);
      if (!generated) {
        return;
      }

      const before = Boolean(generated.csvRow);
      applyCsvValue(generated, csvMaps);
      if (addItem(items, indexes, generated)) {
        stats.generatedAdded += 1;
        if (!before && generated.csvRow) stats.valuesFromCsv += 1;
      }
    });
  });

  csvRows.forEach((row) => {
    if (indexes.exact.has(makeExactKey(row.Name, row.Source)) || indexes.alias.has(makeAliasKey(row.Name, row.Source))) {
      return;
    }

    const item = makeCsvBackfillItem(row);
    if (addItem(items, indexes, item)) {
      stats.csvBackfillAdded += 1;
      if (item.value != null || item.valueLabel) stats.valuesFromCsv += 1;
    }
  });

  items.sort((left, right) => normalizeName(left.name).localeCompare(normalizeName(right.name)) || canonicalSource(left.source).localeCompare(canonicalSource(right.source)));
  const finalIndexes = buildItemIndexes(items);
  const coverage = countCsvCoverage(csvRows, finalIndexes);
  const generatedAt = new Date().toISOString();
  const counts = {
    items: items.length,
    baseItems: items.filter((item) => item.kind === "baseItem").length,
    magicItems: items.filter((item) => item.kind !== "baseItem").length,
    magicVariants: items.filter((item) => item.kind === "magicVariant").length,
    preGeneratedCombinations: items.filter((item) => item.kind === "composedMagicVariant").length,
    csvBackfill: items.filter((item) => item.kind === "csvBackfill").length,
    pricedItems: items.filter((item) => item.value != null || item.valueLabel).length,
    csvRows: csvRows.length,
    csvRowsCovered: coverage.covered,
    csvRowsMissing: coverage.missing.length
  };
  const output = {
    schema: "eldoria.normalized-rules-catalog.items",
    schemaVersion: 4,
    generatedAt,
    generator: {
      name: "regenerate-items-json-with-values",
      inputs: [
        path.relative(ROOT, CSV_PATH),
        path.relative(ROOT, RAW_ITEMS_PATH),
        path.relative(ROOT, RAW_BASE_ITEMS_PATH),
        path.relative(ROOT, RAW_MAGIC_VARIANTS_PATH),
        path.relative(ROOT, HOMEBREW_DIR)
      ]
    },
    counts,
    items
  };

  writeJson(ITEMS_JSON_PATH, output);
  const manifestUpdated = updateRulesManifest(output);
  const report = {
    generatedAt,
    downloadedHomebrew,
    stats,
    counts,
    manifestUpdated,
    csvMissing: coverage.missing
  };
  writeJson(REPORT_PATH, report);

  console.log(`Wrote ${path.relative(ROOT, ITEMS_JSON_PATH)}`);
  console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}`);
  console.log(JSON.stringify({ counts, stats, downloadedHomebrew: downloadedHomebrew.map((entry) => entry.fileName) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
