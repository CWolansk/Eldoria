#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "docs", "data", "items.csv");
const ITEMS_JSON_PATH = path.join(ROOT, "docs", "character-sheets", "v1", "data", "items.json");
const MAGIC_VARIANTS_PATH = path.join(ROOT, "docs", "character-sheets", "v1", "data", "magic-variants.json");
const ELDORIA_ITEMS_DIR = path.join(ROOT, "docs", "character-sheets", "v1", "data", "eldoria-items");
const RAW_ITEMS_PATH = path.join(ROOT, "docs", "5etools", "data", "items.json");
const RAW_ITEMS_BASE_PATH = path.join(ROOT, "docs", "5etools", "data", "items-base.json");
const RAW_MAGIC_VARIANTS_PATH = path.join(ROOT, "docs", "5etools", "data", "magicvariants.json");
const HOMEBREW_DIR = path.join(ROOT, "docs", "5etools", "homebrew");

function normalize(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeName(value) {
  return normalize(value).toLowerCase();
}

function normalizeSource(value) {
  return normalize(value).toUpperCase();
}

const SOURCE_ALIASES = new Map(Object.entries({
  BOET: "BOOKOFEBONTIDES",
  DODK: "DUNGEONSDRAKKENHEIM",
  FAIWG: "FFITEMSGALORE",
  FFAIWG: "FFITEMSGALORE",
  "FM!": "FLEEMORTALS",
  "GH:PP": "GRIMHOLLOWPLAYERPACK",
  GHLOE: "GRIMHOLLOWLAIRSETHARIS",
  TDCSR: "TALDOREICAMPAIGNSETTINGREBORN",
  TFTS: "TALESFROMTHESHADOWS",
  TGS2: "GRIFFONSSADDLEBAG2",
  WEL: "WHEREEVILLIVES"
}));

function canonicalSource(value) {
  const source = normalizeSource(value)
    .replace(/(?:['"])?(?:20)?(14|24)$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return SOURCE_ALIASES.get(source) || source;
}

function makeKey(name, source) {
  return `${normalizeName(name)}|${normalizeSource(source)}`;
}

function makeAliasKey(name, source) {
  return `${normalizeName(name)}|${canonicalSource(source)}`;
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

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadJsonRecords() {
  const records = [];

  const itemsPayload = loadJson(ITEMS_JSON_PATH);
  (Array.isArray(itemsPayload.items) ? itemsPayload.items : []).forEach((item) => {
    records.push({
      name: item.name,
      source: item.source,
      page: item.page ?? item.raw?.page ?? "",
      file: path.relative(ROOT, ITEMS_JSON_PATH),
      bucket: "items",
      refId: item.refId || item.id || ""
    });
  });

  const magicVariantsPayload = loadJson(MAGIC_VARIANTS_PATH);
  (Array.isArray(magicVariantsPayload.magicVariants) ? magicVariantsPayload.magicVariants : []).forEach((item) => {
    records.push({
      name: item.name,
      source: item.source || item.inherits?.source || "",
      page: item.page ?? item.inherits?.page ?? item.raw?.page ?? "",
      file: path.relative(ROOT, MAGIC_VARIANTS_PATH),
      bucket: "magicVariants",
      refId: item.refId || item.id || ""
    });
  });

  if (fs.existsSync(ELDORIA_ITEMS_DIR)) {
    fs.readdirSync(ELDORIA_ITEMS_DIR)
      .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
      .forEach((fileName) => {
        const filePath = path.join(ELDORIA_ITEMS_DIR, fileName);
        const item = loadJson(filePath);
        records.push({
          name: item.name,
          source: item.source,
          page: item.page ?? item.raw?.page ?? "",
          file: path.relative(ROOT, filePath),
          bucket: "eldoriaItems",
          refId: item.refId || item.id || ""
        });
      });
  }

  return records;
}

function buildIndexes(records) {
  const exact = new Map();
  const alias = new Map();
  const byName = new Map();

  records.forEach((record) => {
    const exactKey = makeKey(record.name, record.source);
    const aliasKey = makeAliasKey(record.name, record.source);
    const nameKey = normalizeName(record.name);

    if (!exact.has(exactKey)) {
      exact.set(exactKey, []);
    }
    exact.get(exactKey).push(record);

    if (!alias.has(aliasKey)) {
      alias.set(aliasKey, []);
    }
    alias.get(aliasKey).push(record);

    if (!byName.has(nameKey)) {
      byName.set(nameKey, []);
    }
    byName.get(nameKey).push(record);
  });

  return { exact, alias, byName };
}

function toSourceCounts(rows) {
  const counts = new Map();
  rows.forEach((row) => {
    const source = normalize(row.Source) || "(blank)";
    counts.set(source, (counts.get(source) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([source, count]) => ({ source, count }));
}

function mapRecord(record) {
  return {
    name: record.name,
    source: record.source,
    page: record.page,
    bucket: record.bucket,
    file: record.file,
    refId: record.refId
  };
}

function mapRawRecord(record) {
  return {
    name: record.name,
    source: record.source,
    page: record.page,
    bucket: record.bucket,
    file: record.file,
    variantName: record.variantName || "",
    variantSource: record.variantSource || "",
    baseItemName: record.baseItemName || "",
    baseItemSource: record.baseItemSource || ""
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function rawValueMatches(actual, expected) {
  const actualValues = toArray(actual).map((value) => normalize(value).toLowerCase()).filter(Boolean);
  const expectedValues = toArray(expected).map((value) => normalize(value).toLowerCase()).filter(Boolean);
  if (!actualValues.length || !expectedValues.length) {
    return false;
  }
  return expectedValues.some((expectedValue) => actualValues.includes(expectedValue));
}

function rawItemHasTag(rawItem, key) {
  if (key === "weapon") {
    return Boolean(rawItem.weapon || rawItem.weaponCategory || rawItem.dmg1);
  }
  if (key === "armor") {
    return ["LA", "MA", "HA", "S"].includes(normalize(rawItem.type).toUpperCase()) || rawItem.bardingType != null;
  }
  if (key === "net") {
    return normalizeName(rawItem.name) === "net";
  }
  if (key === "ammo") {
    return normalize(rawItem.type).toUpperCase() === "A";
  }
  return Boolean(rawItem[key]);
}

function rawItemMatchesRequirement(rawItem, key, expected) {
  if (expected === false) {
    return !rawItemMatchesRequirement(rawItem, key, true);
  }

  const normalizedKey = normalize(key);
  if (normalizedKey === "type") {
    return rawValueMatches(rawItem.type, expected);
  }
  if (normalizedKey === "weapon") {
    return rawItemHasTag(rawItem, "weapon");
  }
  if (normalizedKey === "armor") {
    return rawItemHasTag(rawItem, "armor");
  }
  if (normalizedKey === "weaponCategory") {
    return rawValueMatches(rawItem.weaponCategory, expected);
  }
  if (normalizedKey === "property") {
    return rawValueMatches(rawItem.property, expected);
  }
  if (normalizedKey === "dmgType") {
    return rawValueMatches(rawItem.dmgType, expected);
  }
  if (normalizedKey === "name") {
    return rawValueMatches(rawItem.name, expected);
  }
  if (normalizedKey === "source") {
    return rawValueMatches(rawItem.source, expected);
  }
  if (expected === true) {
    return rawItemHasTag(rawItem, normalizedKey);
  }
  return rawValueMatches(rawItem[normalizedKey], expected);
}

function rawItemMatchesRequirementSet(rawItem, requirement) {
  return Object.entries(requirement || {}).every(([key, expected]) => rawItemMatchesRequirement(rawItem, key, expected));
}

function rawItemMatchesVariant(rawItem, variant) {
  const requirements = toArray(variant.requires);
  const requirementMatch = !requirements.length || requirements.some((requirement) => rawItemMatchesRequirementSet(rawItem, requirement));
  if (!requirementMatch) {
    return false;
  }

  const excludes = variant.excludes;
  if (excludes && Object.keys(excludes).length && rawItemMatchesRequirementSet(rawItem, excludes)) {
    return false;
  }

  return true;
}

function loadRaw5eToolsRecords() {
  const itemsPayload = loadJson(RAW_ITEMS_PATH);
  const itemsBasePayload = loadJson(RAW_ITEMS_BASE_PATH);
  const magicVariantsPayload = loadJson(RAW_MAGIC_VARIANTS_PATH);

  const exactRecords = [];
  const generatedRecords = [];

  toArray(itemsPayload.item).forEach((item) => {
    exactRecords.push({
      name: item.name,
      source: item.source,
      page: item.page ?? "",
      file: path.relative(ROOT, RAW_ITEMS_PATH),
      bucket: "5etools-item"
    });
  });

  toArray(itemsBasePayload.baseitem).forEach((item) => {
    exactRecords.push({
      name: item.name,
      source: item.source,
      page: item.page ?? "",
      file: path.relative(ROOT, RAW_ITEMS_BASE_PATH),
      bucket: "5etools-baseitem"
    });
  });

  toArray(magicVariantsPayload.magicvariant).forEach((variant) => {
    exactRecords.push({
      name: variant.name,
      source: variant.inherits?.source || variant.source || "",
      page: variant.inherits?.page ?? variant.page ?? "",
      file: path.relative(ROOT, RAW_MAGIC_VARIANTS_PATH),
      bucket: "5etools-magicvariant"
    });
  });

  const baseItems = toArray(itemsBasePayload.baseitem);
  const variants = toArray(magicVariantsPayload.magicvariant);
  variants.forEach((variant) => {
    const prefix = variant.inherits?.namePrefix == null ? "" : String(variant.inherits.namePrefix);
    const suffix = variant.inherits?.nameSuffix == null ? "" : String(variant.inherits.nameSuffix);
    if (!prefix && !suffix) {
      return;
    }

    baseItems.forEach((baseItem) => {
      if (!rawItemMatchesVariant(baseItem, variant)) {
        return;
      }

      generatedRecords.push({
        name: `${prefix}${baseItem.name}${suffix}`,
        source: variant.inherits?.source || variant.source || baseItem.source || "",
        page: variant.inherits?.page ?? variant.page ?? baseItem.page ?? "",
        file: path.relative(ROOT, RAW_MAGIC_VARIANTS_PATH),
        bucket: "5etools-generated-magicvariant",
        variantName: variant.name,
        variantSource: variant.inherits?.source || variant.source || "",
        baseItemName: baseItem.name,
        baseItemSource: baseItem.source
      });
    });
  });

  return {
    exactRecords,
    generatedRecords
  };
}

function getHomebrewJsonFiles() {
  if (!fs.existsSync(HOMEBREW_DIR)) {
    return [];
  }

  return fs.readdirSync(HOMEBREW_DIR)
    .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
    .filter((fileName) => !["index.json", "package.json"].includes(fileName.toLowerCase()))
    .map((fileName) => path.join(HOMEBREW_DIR, fileName));
}

function loadHomebrewRecords() {
  const exactRecords = [];
  const generatedRecords = [];

  getHomebrewJsonFiles().forEach((filePath) => {
    const payload = loadJson(filePath);
    const relativeFile = path.relative(ROOT, filePath);

    toArray(payload.item).forEach((item) => {
      exactRecords.push({
        name: item.name,
        source: item.source || item._copy?.source || "",
        page: item.page ?? item._copy?.page ?? "",
        file: relativeFile,
        bucket: "homebrew-item"
      });
    });

    toArray(payload.baseitem).forEach((item) => {
      exactRecords.push({
        name: item.name,
        source: item.source || item._copy?.source || "",
        page: item.page ?? item._copy?.page ?? "",
        file: relativeFile,
        bucket: "homebrew-baseitem"
      });
    });

    toArray(payload.magicvariant).forEach((variant) => {
      exactRecords.push({
        name: variant.name,
        source: variant.inherits?.source || variant.source || "",
        page: variant.inherits?.page ?? variant.page ?? "",
        file: relativeFile,
        bucket: "homebrew-magicvariant"
      });
    });

    const baseItems = toArray(payload.baseitem);
    const variants = toArray(payload.magicvariant);
    variants.forEach((variant) => {
      const prefix = variant.inherits?.namePrefix == null ? "" : String(variant.inherits.namePrefix);
      const suffix = variant.inherits?.nameSuffix == null ? "" : String(variant.inherits.nameSuffix);
      if (!prefix && !suffix) {
        return;
      }

      baseItems.forEach((baseItem) => {
        if (!rawItemMatchesVariant(baseItem, variant)) {
          return;
        }

        generatedRecords.push({
          name: `${prefix}${baseItem.name}${suffix}`,
          source: variant.inherits?.source || variant.source || baseItem.source || "",
          page: variant.inherits?.page ?? variant.page ?? baseItem.page ?? "",
          file: relativeFile,
          bucket: "homebrew-generated-magicvariant",
          variantName: variant.name,
          variantSource: variant.inherits?.source || variant.source || "",
          baseItemName: baseItem.name,
          baseItemSource: baseItem.source
        });
      });
    });
  });

  return {
    exactRecords,
    generatedRecords
  };
}

function buildRaw5eToolsIndexes() {
  const { exactRecords, generatedRecords } = loadRaw5eToolsRecords();
  const { exactRecords: homebrewExactRecords, generatedRecords: homebrewGeneratedRecords } = loadHomebrewRecords();
  const exact = new Map();
  const exactAlias = new Map();
  const generated = new Map();
  const generatedAlias = new Map();

  [...exactRecords, ...homebrewExactRecords].forEach((record) => {
    const key = makeKey(record.name, record.source);
    const aliasKey = makeAliasKey(record.name, record.source);
    if (!exact.has(key)) {
      exact.set(key, []);
    }
    exact.get(key).push(record);
    if (!exactAlias.has(aliasKey)) {
      exactAlias.set(aliasKey, []);
    }
    exactAlias.get(aliasKey).push(record);
  });

  [...generatedRecords, ...homebrewGeneratedRecords].forEach((record) => {
    const key = makeKey(record.name, record.source);
    const aliasKey = makeAliasKey(record.name, record.source);
    if (!generated.has(key)) {
      generated.set(key, []);
    }
    generated.get(key).push(record);
    if (!generatedAlias.has(aliasKey)) {
      generatedAlias.set(aliasKey, []);
    }
    generatedAlias.get(aliasKey).push(record);
  });

    return {
      exact,
      exactAlias,
      generated,
      generatedAlias,
      exactRecordCount: exactRecords.length,
      generatedRecordCount: generatedRecords.length,
      homebrewExactRecordCount: homebrewExactRecords.length,
      homebrewGeneratedRecordCount: homebrewGeneratedRecords.length
    };
}

function analyze() {
  const csvRows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const jsonRecords = loadJsonRecords();
  const indexes = buildIndexes(jsonRecords);
  const raw5eToolsIndexes = buildRaw5eToolsIndexes();

  const exactMatches = [];
  const aliasMatches = [];
  const nameOnlyMatches = [];
  const resolvedIn5eTools = [];
  const missing = [];

  csvRows.forEach((row) => {
    const exact = indexes.exact.get(makeKey(row.Name, row.Source)) || [];
    if (exact.length) {
      exactMatches.push(row);
      return;
    }

    const alias = indexes.alias.get(makeAliasKey(row.Name, row.Source)) || [];
    if (alias.length) {
      aliasMatches.push({
        csv: row,
        jsonMatches: alias.map(mapRecord)
      });
      return;
    }

    const nameOnly = indexes.byName.get(normalizeName(row.Name)) || [];
    if (nameOnly.length) {
      nameOnlyMatches.push({
        csv: row,
        jsonMatches: nameOnly.map(mapRecord)
      });
      return;
    }

    const rawExact = raw5eToolsIndexes.exact.get(makeKey(row.Name, row.Source)) || [];
    const rawExactAlias = raw5eToolsIndexes.exactAlias.get(makeAliasKey(row.Name, row.Source)) || [];
    const rawGenerated = raw5eToolsIndexes.generated.get(makeKey(row.Name, row.Source)) || [];
    const rawGeneratedAlias = raw5eToolsIndexes.generatedAlias.get(makeAliasKey(row.Name, row.Source)) || [];

    if (rawExact.length || rawExactAlias.length || rawGenerated.length || rawGeneratedAlias.length) {
      resolvedIn5eTools.push({
        row: row.__row,
        name: row.Name,
        source: row.Source,
        page: row.Page,
        type: row.Type,
        rarity: row.Rarity,
        value: row.Value,
        rawMatches: [
          ...rawExact,
          ...rawExactAlias,
          ...rawGenerated,
          ...rawGeneratedAlias
        ].map(mapRawRecord)
      });
      return;
    }

    missing.push({
      row: row.__row,
      name: row.Name,
      source: row.Source,
      page: row.Page,
      type: row.Type,
      rarity: row.Rarity,
      value: row.Value
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    paths: {
      csv: path.relative(ROOT, CSV_PATH),
      itemsJson: path.relative(ROOT, ITEMS_JSON_PATH),
      magicVariantsJson: path.relative(ROOT, MAGIC_VARIANTS_PATH),
      eldoriaItemsDir: path.relative(ROOT, ELDORIA_ITEMS_DIR),
      rawItems: path.relative(ROOT, RAW_ITEMS_PATH),
      rawItemsBase: path.relative(ROOT, RAW_ITEMS_BASE_PATH),
      rawMagicVariants: path.relative(ROOT, RAW_MAGIC_VARIANTS_PATH),
      homebrewDir: path.relative(ROOT, HOMEBREW_DIR)
    },
    counts: {
      csvRows: csvRows.length,
      jsonRecords: jsonRecords.length,
      raw5eToolsExactRecords: raw5eToolsIndexes.exactRecordCount,
      raw5eToolsGeneratedVariantRecords: raw5eToolsIndexes.generatedRecordCount,
      homebrewExactRecords: raw5eToolsIndexes.homebrewExactRecordCount,
      homebrewGeneratedVariantRecords: raw5eToolsIndexes.homebrewGeneratedRecordCount,
      exactMatches: exactMatches.length,
      aliasMatches: aliasMatches.length,
      nameOnlyMatches: nameOnlyMatches.length,
      resolvedIn5eTools: resolvedIn5eTools.length,
      missing: missing.length
    },
    missingBySource: toSourceCounts(missing.map((entry) => ({ Source: entry.source }))),
    aliasMatchesSample: aliasMatches.slice(0, 50).map((entry) => ({
      row: entry.csv.__row,
      name: entry.csv.Name,
      csvSource: entry.csv.Source,
      jsonMatches: entry.jsonMatches
    })),
    nameOnlyMatchesSample: nameOnlyMatches.slice(0, 50).map((entry) => ({
      row: entry.csv.__row,
      name: entry.csv.Name,
      csvSource: entry.csv.Source,
      jsonMatches: entry.jsonMatches
    })),
    resolvedIn5eToolsSample: resolvedIn5eTools.slice(0, 100),
    unresolvedBySource: toSourceCounts(missing.map((entry) => ({ Source: entry.source }))),
    missing
  };
}

function main() {
  const outIndex = process.argv.indexOf("--out");
  const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : "";
  const report = analyze();
  const output = `${JSON.stringify(report, null, 2)}\n`;

  if (outPath) {
    const resolvedOutPath = path.resolve(process.cwd(), outPath);
    fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
    fs.writeFileSync(resolvedOutPath, output, "utf8");
    console.log(`Wrote report to ${resolvedOutPath}`);
    return;
  }

  process.stdout.write(output);
}

main();
