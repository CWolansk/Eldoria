#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "docs", "data", "items.csv");
const NORMALIZED_ITEMS_PATH = path.join(ROOT, "docs", "character-sheets", "v1", "data", "items.json");
const NORMALIZED_MAGIC_VARIANTS_PATH = path.join(ROOT, "docs", "character-sheets", "v1", "data", "magic-variants.json");
const ELDORIA_ITEMS_DIR = path.join(ROOT, "docs", "character-sheets", "v1", "data", "eldoria-items");
const RAW_ITEMS_PATH = path.join(ROOT, "docs", "5etools", "data", "items.json");
const RAW_BASE_ITEMS_PATH = path.join(ROOT, "docs", "5etools", "data", "items-base.json");
const RAW_MAGIC_VARIANTS_PATH = path.join(ROOT, "docs", "5etools", "data", "magicvariants.json");
const HOMEBREW_DIR = path.join(ROOT, "docs", "5etools", "homebrew");

const DEFAULT_OUT_PATH = path.join(ROOT, "tmp", "generated-item-catalog-report.json");
const DEFAULT_CATALOG_OUT_PATH = path.join(ROOT, "tmp", "generated-item-catalog.json");

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

function normalize(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeName(value) {
  return normalize(value).toLowerCase();
}

function normalizeSource(value) {
  return normalize(value).toUpperCase();
}

function canonicalSource(value) {
  const source = normalizeSource(value)
    .replace(/(?:['"])?(?:20)?(14|24)$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return SOURCE_ALIASES.get(source) || source;
}

function makeExactKey(name, source) {
  return `${normalizeName(name)}|${normalizeSource(source)}`;
}

function makeAliasKey(name, source) {
  return `${normalizeName(name)}|${canonicalSource(source)}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getPathSegments(pathExpression) {
  return normalize(pathExpression).split(".").filter(Boolean);
}

function getByPath(object, pathExpression) {
  return getPathSegments(pathExpression).reduce((current, segment) => {
    if (current == null) {
      return undefined;
    }
    return current[segment];
  }, object);
}

function setByPath(object, pathExpression, value) {
  const segments = getPathSegments(pathExpression);
  let current = object;

  segments.slice(0, -1).forEach((segment) => {
    if (current[segment] == null || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment];
  });

  current[segments[segments.length - 1]] = value;
}

function applyCopyMods(target, mods) {
  Object.entries(mods || {}).forEach(([pathExpression, mod]) => {
    if (!mod || typeof mod !== "object") {
      return;
    }

    if (mod.mode === "setProp") {
      setByPath(target, pathExpression, mod.value);
      return;
    }

    if (mod.mode === "appendArr") {
      const existing = getByPath(target, pathExpression);
      const next = Array.isArray(existing) ? existing.slice() : [];
      setByPath(target, pathExpression, next.concat(toArray(mod.items)));
    }
  });
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

function sourceKindForFile(filePath) {
  return filePath.includes(`${path.sep}homebrew${path.sep}`) ? "homebrew" : "official";
}

function collectRawPayloads() {
  const payloads = [
    {
      filePath: RAW_ITEMS_PATH,
      payload: loadJson(RAW_ITEMS_PATH),
      kind: "official"
    },
    {
      filePath: RAW_BASE_ITEMS_PATH,
      payload: loadJson(RAW_BASE_ITEMS_PATH),
      kind: "official"
    },
    {
      filePath: RAW_MAGIC_VARIANTS_PATH,
      payload: loadJson(RAW_MAGIC_VARIANTS_PATH),
      kind: "official"
    }
  ];

  getHomebrewJsonFiles().forEach((filePath) => {
    payloads.push({
      filePath,
      payload: loadJson(filePath),
      kind: sourceKindForFile(filePath)
    });
  });

  return payloads;
}

function makeRecord(entity, filePath, bucket, kind) {
  return {
    name: entity.name,
    source: entity.source || entity.inherits?.source || entity._copy?.source || "",
    page: entity.page ?? entity.inherits?.page ?? entity._copy?.page ?? "",
    file: path.relative(ROOT, filePath),
    bucket,
    kind
  };
}

function collectNormalizedRecords() {
  const records = [];

  const itemsPayload = fs.existsSync(NORMALIZED_ITEMS_PATH) ? loadJson(NORMALIZED_ITEMS_PATH) : {};
  toArray(itemsPayload.items).forEach((item) => {
    records.push({
      name: item.name,
      source: item.source,
      page: item.page ?? item.raw?.page ?? "",
      file: path.relative(ROOT, NORMALIZED_ITEMS_PATH),
      bucket: "normalized-item",
      kind: "normalized"
    });
  });

  const magicVariantsPayload = fs.existsSync(NORMALIZED_MAGIC_VARIANTS_PATH) ? loadJson(NORMALIZED_MAGIC_VARIANTS_PATH) : {};
  toArray(magicVariantsPayload.magicVariants).forEach((variant) => {
    records.push({
      name: variant.name,
      source: variant.source || variant.inherits?.source || "",
      page: variant.page ?? variant.inherits?.page ?? variant.raw?.page ?? "",
      file: path.relative(ROOT, NORMALIZED_MAGIC_VARIANTS_PATH),
      bucket: "normalized-magicvariant",
      kind: "normalized"
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
          bucket: "normalized-eldoria-item",
          kind: "normalized"
        });
      });
  }

  return records;
}

function collectDirectRecords(payloads) {
  const records = [];

  payloads.forEach(({ filePath, payload, kind }) => {
    toArray(payload.item).forEach((item) => {
      records.push(makeRecord(item, filePath, "raw-item", kind));
    });

    toArray(payload.baseitem).forEach((item) => {
      records.push(makeRecord(item, filePath, "raw-baseitem", kind));
    });

    toArray(payload.magicvariant).forEach((variant) => {
      records.push(makeRecord(variant, filePath, "raw-magicvariant", kind));
    });
  });

  return records;
}

function collectBaseItems(payloads) {
  const baseItems = [];

  payloads.forEach(({ filePath, payload, kind }) => {
    toArray(payload.baseitem).forEach((baseItem) => {
      baseItems.push({
        ...deepClone(baseItem),
        __file: path.relative(ROOT, filePath),
        __kind: kind
      });
    });
  });

  return baseItems;
}

function collectMagicVariants(payloads) {
  const variants = [];
  const byKey = new Map();

  payloads.forEach(({ filePath, payload, kind }) => {
    toArray(payload.magicvariant).forEach((variant) => {
      const cloned = {
        ...deepClone(variant),
        __file: path.relative(ROOT, filePath),
        __kind: kind
      };
      variants.push(cloned);
      byKey.set(makeExactKey(cloned.name, cloned.source || cloned.inherits?.source || ""), cloned);
    });
  });

  return variants.map((variant) => {
    if (!variant._copy) {
      return variant;
    }

    const copied = byKey.get(makeExactKey(variant._copy.name, variant._copy.source));
    if (!copied) {
      return variant;
    }

    const resolved = deepClone(copied);
    const override = deepClone(variant);
    delete override._copy;
    Object.assign(resolved, override);
    resolved.__file = variant.__file;
    resolved.__kind = variant.__kind;
    applyCopyMods(resolved, variant._copy._mod);
    return resolved;
  });
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

function combineName(variant, baseItem) {
  const prefix = variant.inherits?.namePrefix == null ? "" : String(variant.inherits.namePrefix);
  const suffix = variant.inherits?.nameSuffix == null ? "" : String(variant.inherits.nameSuffix);
  if (!prefix && !suffix) {
    return "";
  }
  return `${prefix}${baseItem.name}${suffix}`;
}

function generateVariantRecords(baseItems, variants) {
  const records = [];

  variants.forEach((variant) => {
    const variantName = combineName(variant, { name: "" });
    if (!variantName) {
      return;
    }

    baseItems.forEach((baseItem) => {
      if (!rawItemMatchesVariant(baseItem, variant)) {
        return;
      }

      records.push({
        name: combineName(variant, baseItem),
        source: variant.inherits?.source || variant.source || baseItem.source || "",
        page: variant.inherits?.page ?? variant.page ?? baseItem.page ?? "",
        bucket: "generated-magicvariant",
        kind: variant.__kind === baseItem.__kind ? variant.__kind : "cross-source",
        variantName: variant.name,
        variantSource: variant.inherits?.source || variant.source || "",
        variantFile: variant.__file,
        baseItemName: baseItem.name,
        baseItemSource: baseItem.source,
        baseItemFile: baseItem.__file
      });
    });
  });

  return records;
}

function addToIndex(index, key, record) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(record);
}

function buildRecordIndexes(records) {
  const exact = new Map();
  const alias = new Map();

  records.forEach((record) => {
    addToIndex(exact, makeExactKey(record.name, record.source), record);
    addToIndex(alias, makeAliasKey(record.name, record.source), record);
  });

  return { exact, alias };
}

function countUnique(records, keyFn) {
  return new Set(records.map(keyFn)).size;
}

function buildUniqueCatalog(records) {
  const catalog = new Map();

  records.forEach((record) => {
    const key = makeAliasKey(record.name, record.source);
    if (!catalog.has(key)) {
      catalog.set(key, slimRecord(record));
    }
  });

  return Array.from(catalog.values())
    .sort((left, right) => normalizeName(left.name).localeCompare(normalizeName(right.name)) || canonicalSource(left.source).localeCompare(canonicalSource(right.source)));
}

function countBy(records, valueFn) {
  const counts = new Map();
  records.forEach((record) => {
    const value = normalize(valueFn(record)) || "(blank)";
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([value, count]) => ({ value, count }));
}

function sourceCounts(rows) {
  return countBy(rows, (row) => row.source || row.Source);
}

function slimRecord(record) {
  return {
    name: record.name,
    source: record.source,
    page: record.page,
    bucket: record.bucket,
    kind: record.kind,
    file: record.file,
    variantName: record.variantName,
    variantSource: record.variantSource,
    variantFile: record.variantFile,
    baseItemName: record.baseItemName,
    baseItemSource: record.baseItemSource,
    baseItemFile: record.baseItemFile
  };
}

function classifyCsvRows(csvRows, normalizedRecords, directRecords, generatedRecords) {
  const normalizedIndexes = buildRecordIndexes(normalizedRecords);
  const directIndexes = buildRecordIndexes(directRecords);
  const generatedIndexes = buildRecordIndexes(generatedRecords);
  const normalizedMatches = [];
  const directMatches = [];
  const generatedMatches = [];
  const missing = [];

  csvRows.forEach((row) => {
    const exactKey = makeExactKey(row.Name, row.Source);
    const aliasKey = makeAliasKey(row.Name, row.Source);

    const normalized = (normalizedIndexes.exact.get(exactKey) || []).concat(normalizedIndexes.alias.get(aliasKey) || []);
    if (normalized.length) {
      normalizedMatches.push({
        row: row.__row,
        name: row.Name,
        source: row.Source,
        matches: normalized.slice(0, 5).map(slimRecord)
      });
      return;
    }

    const direct = (directIndexes.exact.get(exactKey) || []).concat(directIndexes.alias.get(aliasKey) || []);
    if (direct.length) {
      directMatches.push({
        row: row.__row,
        name: row.Name,
        source: row.Source,
        matches: direct.slice(0, 5).map(slimRecord)
      });
      return;
    }

    const generated = (generatedIndexes.exact.get(exactKey) || []).concat(generatedIndexes.alias.get(aliasKey) || []);
    if (generated.length) {
      generatedMatches.push({
        row: row.__row,
        name: row.Name,
        source: row.Source,
        matches: generated.slice(0, 5).map(slimRecord)
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
    normalizedMatches,
    directMatches,
    generatedMatches,
    missing
  };
}

function analyze() {
  const csvRows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const payloads = collectRawPayloads();
  const normalizedRecords = collectNormalizedRecords();
  const directRecords = collectDirectRecords(payloads);
  const baseItems = collectBaseItems(payloads);
  const variants = collectMagicVariants(payloads);
  const generatedRecords = generateVariantRecords(baseItems, variants);
  const classified = classifyCsvRows(csvRows, normalizedRecords, directRecords, generatedRecords);
  const allCatalogRecords = normalizedRecords.concat(directRecords, generatedRecords);
  const uniqueCatalog = buildUniqueCatalog(allCatalogRecords);

  const report = {
    generatedAt: new Date().toISOString(),
    paths: {
      csv: path.relative(ROOT, CSV_PATH),
      normalizedItems: path.relative(ROOT, NORMALIZED_ITEMS_PATH),
      normalizedMagicVariants: path.relative(ROOT, NORMALIZED_MAGIC_VARIANTS_PATH),
      rawItems: path.relative(ROOT, RAW_ITEMS_PATH),
      rawBaseItems: path.relative(ROOT, RAW_BASE_ITEMS_PATH),
      rawMagicVariants: path.relative(ROOT, RAW_MAGIC_VARIANTS_PATH),
      homebrewDir: path.relative(ROOT, HOMEBREW_DIR)
    },
    counts: {
      csvRows: csvRows.length,
      normalizedRecords: normalizedRecords.length,
      directRawRecords: directRecords.length,
      baseItems: baseItems.length,
      magicVariants: variants.length,
      generatedVariantRecords: generatedRecords.length,
      uniqueGeneratedVariantNameSource: countUnique(generatedRecords, (record) => makeAliasKey(record.name, record.source)),
      totalCatalogRecords: allCatalogRecords.length,
      uniqueCatalogNameSource: uniqueCatalog.length,
      csvCoveredByNormalized: classified.normalizedMatches.length,
      csvCoveredByDirectRaw: classified.directMatches.length,
      csvCoveredByGeneratedVariants: classified.generatedMatches.length,
      csvStillMissing: classified.missing.length
    },
    generatedByVariantSource: countBy(generatedRecords, (record) => record.variantSource).slice(0, 50),
    generatedByBaseItemSource: countBy(generatedRecords, (record) => record.baseItemSource).slice(0, 50),
    generatedByKind: countBy(generatedRecords, (record) => record.kind),
    csvGeneratedCoverageBySource: sourceCounts(classified.generatedMatches),
    csvStillMissingBySource: sourceCounts(classified.missing),
    generatedCoverageSample: classified.generatedMatches.slice(0, 100),
    stillMissingSample: classified.missing.slice(0, 100),
    stillMissing: classified.missing
  };

  return {
    report,
    catalog: {
      generatedAt: report.generatedAt,
      schema: "eldoria.generated-item-catalog-preview",
      note: "Preview only. Generated by combining raw 5etools/homebrew magic variants with raw base items. This file is not consumed by the website.",
      counts: {
        records: uniqueCatalog.length,
        generatedVariantRecords: generatedRecords.length
      },
      records: uniqueCatalog
    }
  };
}

function main() {
  const outIndex = process.argv.indexOf("--out");
  const outPath = outIndex >= 0 ? process.argv[outIndex + 1] : DEFAULT_OUT_PATH;
  const catalogOutIndex = process.argv.indexOf("--catalog-out");
  const catalogOutPath = catalogOutIndex >= 0 ? process.argv[catalogOutIndex + 1] : DEFAULT_CATALOG_OUT_PATH;
  const { report, catalog } = analyze();
  const resolvedOutPath = path.resolve(process.cwd(), outPath);
  const resolvedCatalogOutPath = path.resolve(process.cwd(), catalogOutPath);

  fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
  fs.writeFileSync(resolvedOutPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.mkdirSync(path.dirname(resolvedCatalogOutPath), { recursive: true });
  fs.writeFileSync(resolvedCatalogOutPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(`Wrote report to ${resolvedOutPath}`);
  console.log(`Wrote catalog preview to ${resolvedCatalogOutPath}`);
  console.log(JSON.stringify(report.counts, null, 2));
}

main();
