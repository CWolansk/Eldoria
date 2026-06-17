#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_ITEMS_PATH = path.join(ROOT, "docs", "data", "items-page-full-normalized.json");
const DEFAULT_REPORT_PATH = path.join(ROOT, "tmp", "items-page-value-hydration-report.json");

const MODEL_VERSION = 1;

// Copper-piece values calibrated from the existing normalized items catalog.
const RARITY_BASE_CP = {
  none: 0,
  common: 4_000,
  uncommon: 30_000,
  rare: 1_100_000,
  "very rare": 3_000_000,
  legendary: 17_500_000,
  artifact: 50_000_000,
  varies: 30_000,
  unknown: 1_000,
  "unknown (magic)": 50_000
};

const MUNDANE_TYPE_DEFAULT_CP = {
  ammunition: 5,
  "food and drink": 10,
  "trade good": 100,
  "adventuring gear": 100,
  "tack and harness": 200,
  instrument: 2_000,
  "gaming set": 100,
  "artisan's tools": 2_500,
  tool: 2_500,
  "spellcasting focus": 1_000,
  poison: 10_000,
  explosive: 5_000,
  firearm: 50_000,
  "simple weapon": 500,
  "martial weapon": 1_500,
  weapon: 1_000,
  "light armor": 1_000,
  "medium armor": 5_000,
  "heavy armor": 30_000,
  shield: 1_000,
  "treasure (gemstone)": 10_000,
  "treasure (art object)": 75_000,
  "treasure (coinage)": 10_000,
  "luxury good": 50_000,
  mount: 7_500,
  "vehicle (land)": 10_000,
  "vehicle (water)": 50_000,
  "vehicle (air)": 500_000,
  "vehicle (space)": 1_000_000,
  "illegal drug": 10_000,
  other: 1_000,
  "item group": 1_000
};

function parseArgs(argv) {
  const options = {
    input: DEFAULT_ITEMS_PATH,
    report: DEFAULT_REPORT_PATH,
    write: false,
    overwriteExisting: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };

    if (arg === "--write") options.write = true;
    else if (arg === "--overwrite-existing") options.overwriteExisting = true;
    else if (arg === "--input") options.input = path.resolve(next());
    else if (arg === "--report") options.report = path.resolve(next());
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Hydrate values in docs/data/items-page-full-normalized.json.

Usage:
  node scripts/hydrate-items-page-values.js [options]

Options:
  --write                 Write changes to the input JSON. Default is dry-run.
  --overwrite-existing    Recompute even when an item already has a numeric value.
  --input <path>          Input items-page-full-normalized JSON path.
  --report <path>         Report path. Default: ${path.relative(process.cwd(), DEFAULT_REPORT_PATH)}
  --help                  Show this help.
`);
}

function normalize(value) {
  return String(value == null ? "" : value).trim();
}

function lower(value) {
  return normalize(value).toLowerCase();
}

function toArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function comparableName(value) {
  return lower(value)
    .replace(/\s+\(\*\)$/u, "")
    .replace(/['"]/gu, "")
    .replace(/[^a-z0-9]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function comparableSource(value) {
  return lower(value).replace(/[^a-z0-9!]+/gu, "");
}

function itemKey(name, source) {
  return `${comparableName(name)}|${comparableSource(source)}`;
}

function splitBaseItemRef(value) {
  const [name, source] = normalize(value).split("|");
  return {
    name: name || "",
    source: source || ""
  };
}

function isNumericValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function getNumericValue(item) {
  return isNumericValue(item.value) ? Math.round(Number(item.value)) : null;
}

function labelsForItem(item) {
  return toArray(item._typeListText).map(lower).filter(Boolean);
}

function hasLabel(item, pattern) {
  return labelsForItem(item).some((label) => pattern.test(label));
}

function getTypeBucket(item) {
  const labels = labelsForItem(item);
  const type = lower(item.type);

  if (item.__prop === "itemGroup") return "item group";
  if (labels.includes("treasure (gemstone)")) return "treasure (gemstone)";
  if (labels.includes("treasure (art object)")) return "treasure (art object)";
  if (hasLabel(item, /\bvehicle \(space\)\b/u)) return "vehicle (space)";
  if (hasLabel(item, /\bvehicle \(air\)\b/u)) return "vehicle (air)";
  if (hasLabel(item, /\bvehicle \(water\)\b/u)) return "vehicle (water)";
  if (hasLabel(item, /\bvehicle \(land\)\b/u)) return "vehicle (land)";
  if (labels.includes("treasure (coinage)")) return "treasure (coinage)";
  if (labels.includes("luxury good")) return "luxury good";
  if (labels.includes("mount")) return "mount";
  if (hasLabel(item, /\bheavy armor\b/u)) return "heavy armor";
  if (hasLabel(item, /\bmedium armor\b/u)) return "medium armor";
  if (hasLabel(item, /\blight armor\b/u)) return "light armor";
  if (labels.includes("shield")) return "shield";
  if (labels.includes("ammunition")) return "ammunition";
  if (labels.includes("potion")) return "potion";
  if (labels.includes("scroll")) return "scroll";
  if (labels.includes("ring")) return "ring";
  if (labels.includes("rod")) return "rod";
  if (labels.includes("staff")) return "staff";
  if (labels.includes("wand")) return "wand";
  if (labels.includes("wondrous item")) return "wondrous item";
  if (labels.includes("firearm") || type === "firearm") return "firearm";
  if (hasLabel(item, /\bmartial weapon\b/u)) return "martial weapon";
  if (hasLabel(item, /\bsimple weapon\b/u)) return "simple weapon";
  if (hasLabel(item, /\bweapon\b/u) || item.weapon || item.weaponCategory || item.dmg1) return "weapon";
  if (labels.includes("spellcasting focus")) return "spellcasting focus";
  if (labels.includes("artisan's tools")) return "artisan's tools";
  if (labels.includes("tool")) return "tool";
  if (labels.includes("gaming set")) return "gaming set";
  if (labels.includes("instrument")) return "instrument";
  if (labels.includes("illegal drug")) return "illegal drug";
  if (labels.includes("poison")) return "poison";
  if (labels.includes("explosive")) return "explosive";
  if (labels.includes("food and drink")) return "food and drink";
  if (labels.includes("trade good")) return "trade good";
  if (labels.includes("tack and harness")) return "tack and harness";
  if (labels.includes("adventuring gear")) return "adventuring gear";
  return labels[0] || "other";
}

function getBonus(item) {
  const values = [
    item.bonusWeapon,
    item.bonusAc,
    item.bonusWeaponAttack,
    item.bonusWeaponDamage
  ].map(normalize).filter(Boolean);

  for (const value of values) {
    const match = value.match(/^\+?([1-3])$/u);
    if (match) return Number(match[1]);
  }

  const nameMatch = normalize(item.name).match(/^\+([1-3])\b/u);
  return nameMatch ? Number(nameMatch[1]) : 0;
}

function isMagicItem(item) {
  const rarity = lower(item.rarity);
  if (rarity && !["none", "unknown"].includes(rarity)) return true;
  if (item.__prop === "magicvariant" || item.genericVariant) return true;
  if (toArray(item._fMisc).map(lower).includes("magic")) return true;
  return hasLabel(item, /\bwondrous item\b|\bring\b|\brod\b|\bstaff\b|\bwand\b|\bpotion\b|\bscroll\b/u);
}

function inferRarity(item) {
  const rarity = lower(item.rarity) || "unknown";
  if (!["unknown", "unknown (magic)", "varies"].includes(rarity)) return rarity;

  const bonus = getBonus(item);
  const typeBucket = getTypeBucket(item);
  if (bonus) {
    if (typeBucket === "light armor" || typeBucket === "medium armor" || typeBucket === "heavy armor") {
      return bonus === 1 ? "rare" : bonus === 2 ? "very rare" : "legendary";
    }
    return bonus === 1 ? "uncommon" : bonus === 2 ? "rare" : "very rare";
  }

  if (rarity === "varies") return "uncommon";
  if (rarity === "unknown (magic)" || isMagicItem(item)) return "unknown (magic)";
  return "unknown";
}

function typeMultiplier(item, typeBucket) {
  if (["potion", "scroll"].includes(typeBucket)) return 0.5;
  if (typeBucket === "ammunition") return 1;
  if (item.__prop === "itemGroup") return 1;
  return 1;
}

function adjustMundaneDefault(item, value) {
  let adjusted = value;
  if (hasLabel(item, /\bfuturistic\b/u)) adjusted = Math.max(adjusted, 50_000);
  if (hasLabel(item, /\bmodern\b/u)) adjusted = Math.max(adjusted, 5_000);
  if (hasLabel(item, /\brenaissance\b/u)) adjusted = Math.max(adjusted, 2_500);
  if (getTypeBucket(item) === "heavy armor" && hasLabel(item, /\bfuturistic\b/u)) adjusted = Math.max(adjusted, 17_500_000);
  return adjusted;
}

function roundCopper(value) {
  const number = Math.max(0, Math.round(Number(value) || 0));
  if (number >= 10_000) return Math.round(number / 100) * 100;
  return number;
}

function formatInteger(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
}

function formatCopperValue(cp) {
  const value = Math.max(0, Math.round(Number(cp) || 0));
  if (value === 0) return "0 gp";
  if (value % 100 === 0) return `${formatInteger(value / 100)} gp`;
  if (value % 10 === 0) return `${formatInteger(value / 10)} sp`;
  return `${formatInteger(value)} cp`;
}

function buildIndexes(items) {
  const byKey = new Map();
  items.forEach((item, index) => {
    const key = itemKey(item.name, item.source);
    if (!byKey.has(key)) byKey.set(key, index);
  });
  return { byKey };
}

function resolveBaseIndex(item, indexes) {
  if (!item.baseItem) return null;
  const base = splitBaseItemRef(item.baseItem);
  if (!base.name) return null;
  return indexes.byKey.get(itemKey(base.name, base.source)) ?? null;
}

function computeValues(items, options) {
  const indexes = buildIndexes(items);
  const memo = new Map();
  const stack = new Set();

  function compute(index) {
    if (memo.has(index)) return memo.get(index);
    if (stack.has(index)) return null;
    stack.add(index);

    const item = items[index];
    const existingValue = getNumericValue(item);
    if (existingValue != null && !options.overwriteExisting) {
      const result = {
        value: existingValue,
        strategy: "existing",
        formula: "existing value",
        typeBucket: getTypeBucket(item),
        rarity: lower(item.rarity) || "unknown",
        baseValue: 0,
        rarityValue: 0,
        multiplier: 1
      };
      memo.set(index, result);
      stack.delete(index);
      return result;
    }

    const typeBucket = getTypeBucket(item);
    const baseIndex = resolveBaseIndex(item, indexes);
    const baseResult = baseIndex == null ? null : compute(baseIndex);
    const baseValue = baseResult?.value || 0;
    const rarity = inferRarity(item);

    let result;
    if (isMagicItem(item)) {
      const rarityValue = RARITY_BASE_CP[rarity] ?? RARITY_BASE_CP["unknown (magic)"];
      const multiplier = typeMultiplier(item, typeBucket);
      result = {
        value: roundCopper(baseValue + (rarityValue * multiplier)),
        strategy: "magic-formula",
        formula: "baseItemValue + rarityBase * typeMultiplier",
        typeBucket,
        rarity,
        baseValue,
        rarityValue,
        multiplier
      };
    } else {
      const defaultValue = MUNDANE_TYPE_DEFAULT_CP[typeBucket] ?? MUNDANE_TYPE_DEFAULT_CP.other;
      result = {
        value: adjustMundaneDefault(item, defaultValue),
        strategy: "mundane-formula",
        formula: "typeDefault",
        typeBucket,
        rarity,
        baseValue: 0,
        rarityValue: 0,
        multiplier: 1
      };
    }

    memo.set(index, result);
    stack.delete(index);
    return result;
  }

  return items.map((_item, index) => compute(index));
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function hydrate(payload, options) {
  if (!Array.isArray(payload.items)) {
    throw new Error("Input JSON must contain an items array.");
  }

  const items = payload.items;
  const computed = computeValues(items, options);
  const byStrategy = new Map();
  const byRarity = new Map();
  const byTypeBucket = new Map();
  const samples = [];
  let changed = 0;
  let alreadyHadValue = 0;
  let formulaApplied = 0;
  let overwritten = 0;

  items.forEach((item, index) => {
    const result = computed[index];
    if (!result) return;

    const existingValue = getNumericValue(item);
    const shouldWriteValue = options.overwriteExisting || existingValue == null;
    const nextValue = Math.max(0, Math.round(result.value));
    const nextLabel = formatCopperValue(nextValue);
    const before = {
      value: item.value,
      valueLabel: item.valueLabel,
      _l_value: item._l_value,
      _fValue: item._fValue
    };

    if (existingValue != null) alreadyHadValue += 1;
    if (result.strategy !== "existing" || options.overwriteExisting) formulaApplied += 1;
    if (existingValue != null && options.overwriteExisting) overwritten += 1;

    if (shouldWriteValue) item.value = nextValue;
    item.valueLabel = nextLabel;
    item._l_value = nextLabel.replace(/ /gu, "\u00a0");
    item._fValue = nextValue;

    const after = {
      value: item.value,
      valueLabel: item.valueLabel,
      _l_value: item._l_value,
      _fValue: item._fValue
    };

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed += 1;
      if (samples.length < 50) {
        samples.push({
          name: item.name,
          source: item.source,
          oldValue: before.value,
          newValue: item.value,
          valueLabel: item.valueLabel,
          strategy: result.strategy,
          formula: result.formula,
          rarity: result.rarity,
          typeBucket: result.typeBucket,
          baseValue: result.baseValue,
          rarityValue: result.rarityValue,
          multiplier: result.multiplier
        });
      }
    }

    increment(byStrategy, result.strategy);
    increment(byRarity, result.rarity);
    increment(byTypeBucket, result.typeBucket);
  });

  const missingAfter = items.filter((item) => getNumericValue(item) == null).length;

  return {
    payload,
    report: {
      generatedAt: new Date().toISOString(),
      script: path.relative(ROOT, __filename),
      modelVersion: MODEL_VERSION,
      mode: options.write ? "write" : "dry-run",
      input: path.relative(ROOT, options.input),
      overwriteExisting: options.overwriteExisting,
      stats: {
        total: items.length,
        alreadyHadValue,
        formulaApplied,
        overwritten,
        changed,
        missingAfter,
        byStrategy: sortedObject(byStrategy),
        byRarity: sortedObject(byRarity),
        byTypeBucket: sortedObject(byTypeBucket)
      },
      formula: {
        rarityBaseCp: RARITY_BASE_CP,
        mundaneTypeDefaultCp: MUNDANE_TYPE_DEFAULT_CP,
        magic: "baseItemValue + rarityBase * typeMultiplier",
        mundane: "typeDefault, adjusted upward for modern/futuristic tags"
      },
      samples
    }
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const payload = JSON.parse(fs.readFileSync(options.input, "utf8"));
  const { payload: hydratedPayload, report } = hydrate(payload, options);

  writeJson(options.report, report);
  if (options.write) {
    writeJson(options.input, hydratedPayload);
  }

  console.log(JSON.stringify({
    mode: report.mode,
    input: path.relative(ROOT, options.input),
    report: path.relative(ROOT, options.report),
    stats: report.stats
  }, null, 2));
}

main();
