#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MISSING_REPORT_PATH = path.join(ROOT, "tmp", "generated-item-catalog-report.json");
const HOMEBREW_INDEX_PATH = path.join(ROOT, "tmp", "5etools-homebrew-index-sources.json");
const RAW_BASE_ITEMS_PATH = path.join(ROOT, "docs", "5etools", "data", "items-base.json");
const HOMEBREW_DIR = path.join(ROOT, "docs", "5etools", "homebrew");
const OUT_PATH = path.join(ROOT, "tmp", "missing-items-homebrew-source-report.json");

const HOMEBREW_RAW_BASE_URL = "https://raw.githubusercontent.com/TheGiddyLimit/homebrew/master/";
const PACKAGE_TYPES = new Set(["book", "collection", "creature", "item"]);

const SOURCE_ALIASES = new Map(Object.entries({
  BOET: "BOOKOFEBONTIDES",
  DODK: "DUNGEONSDRAKKENHEIM",
  DUNGEONSDRAKKENHEIM: "DUNGEONSDRAKKENHEIM",
  DUNGEONSOFDRAKKENHEIM: "DUNGEONSDRAKKENHEIM",
  DRAKKENHEIM: "DUNGEONSDRAKKENHEIM",
  FAIWG: "FFITEMSGALORE",
  FFAIWG: "FFITEMSGALORE",
  "FM!": "FLEEMORTALS",
  "GH:PP": "GRIMHOLLOWPLAYERPACK",
  GHLOE: "GRIMHOLLOWLAIRSETHARIS",
  GRIMHOLLOWLAIRSETHARIS: "GRIMHOLLOWLAIRSETHARIS",
  GRIMHOLLOWLAIRSOFETHARIS: "GRIMHOLLOWLAIRSETHARIS",
  LAIRSOFETHARIS: "GRIMHOLLOWLAIRSETHARIS",
  TDCSR: "TALDOREICAMPAIGNSETTINGREBORN",
  TALDOREICAMPAIGNSETTINGREBORN: "TALDOREICAMPAIGNSETTINGREBORN",
  TFTS: "TALESFROMTHESHADOWS",
  TOB123: "TOB12023",
  TOB12023: "TOB12023",
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
  return normalize(value).toUpperCase().replace(/[^A-Z0-9!]/g, "");
}

function canonicalSource(value) {
  const source = normalizeSource(value).replace(/(?:20)?(?:14|24)$/g, "");
  return SOURCE_ALIASES.get(source) || source;
}

function makeExactKey(name, source) {
  return `${normalizeName(name)}|${normalizeSource(source)}`;
}

function makeAliasKey(name, source) {
  return `${normalizeName(name)}|${canonicalSource(source)}`;
}

function normalizeComparableName(value) {
  return normalizeName(value)
    .replace(/\s+\((?:dormant|awakened|exalted)\)$/i, "")
    .trim();
}

function makeComparableAliasKey(name, source) {
  return `${normalizeComparableName(name)}|${canonicalSource(source)}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
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

function loadLocalBaseItems() {
  const baseItems = [];

  toArray(loadJson(RAW_BASE_ITEMS_PATH).baseitem).forEach((baseItem) => {
    baseItems.push({
      ...deepClone(baseItem),
      __file: path.relative(ROOT, RAW_BASE_ITEMS_PATH),
      __package: "official base items",
      __remotePath: ""
    });
  });

  getHomebrewJsonFiles().forEach((filePath) => {
    const payload = loadJson(filePath);
    toArray(payload.baseitem).forEach((baseItem) => {
      baseItems.push({
        ...deepClone(baseItem),
        __file: path.relative(ROOT, filePath),
        __package: path.basename(filePath),
        __remotePath: ""
      });
    });
  });

  return baseItems;
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

function getCandidateRemotePaths(index) {
  const paths = new Set();

  Object.values(index).forEach((remotePath) => {
    const type = normalize(remotePath).split("/")[0];
    if (PACKAGE_TYPES.has(type)) {
      paths.add(remotePath);
    }
  });

  return Array.from(paths).sort();
}

function addMatch(matchesByRow, row, match) {
  if (!matchesByRow.has(row.row)) {
    matchesByRow.set(row.row, []);
  }
  matchesByRow.get(row.row).push(match);
}

function toItemRecord(item, remotePath, prop) {
  return {
    name: item.name,
    source: item.source || item.inherits?.source || item._copy?.source || "",
    page: item.page ?? item.inherits?.page ?? item._copy?.page ?? "",
    remotePath,
    url: urlForRemotePath(remotePath),
    prop
  };
}

function matchType(row, record) {
  if (makeExactKey(row.name, row.source) === makeExactKey(record.name, record.source)) {
    return "source-exact";
  }
  if (makeAliasKey(row.name, row.source) === makeAliasKey(record.name, record.source)) {
    return "source-alias";
  }
  if (makeComparableAliasKey(row.name, row.source) === makeComparableAliasKey(record.name, record.source)) {
    return "source-alias-item-family";
  }
  if (normalizeName(row.name) === normalizeName(record.name)) {
    return "name-only";
  }
  if (normalizeComparableName(row.name) === normalizeComparableName(record.name)) {
    return "name-only-item-family";
  }
  return "";
}

async function analyze() {
  const missingRows = loadJson(MISSING_REPORT_PATH).stillMissing;
  const index = loadJson(HOMEBREW_INDEX_PATH);
  const baseItems = loadLocalBaseItems();
  const matchesByRow = new Map();
  const packageMatches = new Map();
  const errors = [];
  const remotePaths = getCandidateRemotePaths(index);

  for (const remotePath of remotePaths) {
    let payload;
    try {
      payload = await requestJson(urlForRemotePath(remotePath));
    } catch (error) {
      errors.push({ remotePath, error: error.message });
      continue;
    }

    const packageMatchedRows = new Set();
    const directRecords = [];

    ["item", "baseitem", "magicvariant"].forEach((prop) => {
      toArray(payload[prop]).forEach((item) => {
        directRecords.push(toItemRecord(item, remotePath, prop));
      });
    });

    directRecords.forEach((record) => {
      missingRows.forEach((row) => {
        const type = matchType(row, record);
        if (!type) {
          return;
        }

        packageMatchedRows.add(row.row);
        addMatch(matchesByRow, row, {
          matchType: type,
          matchKind: "direct",
          name: record.name,
          source: record.source,
          page: record.page,
          prop: record.prop,
          remotePath: record.remotePath,
          url: record.url
        });
      });
    });

    const remoteBaseItems = toArray(payload.baseitem).map((baseItem) => ({
      ...deepClone(baseItem),
      __file: remotePath,
      __package: path.basename(remotePath),
      __remotePath: remotePath
    }));
    const combinedBaseItems = baseItems.concat(remoteBaseItems);

    toArray(payload.magicvariant).forEach((variant) => {
      if (!combineName(variant, { name: "" })) {
        return;
      }

      combinedBaseItems.forEach((baseItem) => {
        if (!rawItemMatchesVariant(baseItem, variant)) {
          return;
        }

        const generated = {
          name: combineName(variant, baseItem),
          source: variant.inherits?.source || variant.source || baseItem.source || "",
          page: variant.inherits?.page ?? variant.page ?? baseItem.page ?? "",
          remotePath,
          url: urlForRemotePath(remotePath),
          prop: "magicvariant"
        };

        missingRows.forEach((row) => {
          const type = matchType(row, generated);
          if (!type) {
            return;
          }

          packageMatchedRows.add(row.row);
          addMatch(matchesByRow, row, {
            matchType: type,
            matchKind: "generated",
            name: generated.name,
            source: generated.source,
            page: generated.page,
            prop: "magicvariant",
            variantName: variant.name,
            variantSource: variant.inherits?.source || variant.source || "",
            baseItemName: baseItem.name,
            baseItemSource: baseItem.source,
            baseItemFile: baseItem.__file,
            remotePath,
            url: generated.url
          });
        });
      });
    });

    if (packageMatchedRows.size) {
      packageMatches.set(remotePath, {
        remotePath,
        url: urlForRemotePath(remotePath),
        matchedRows: packageMatchedRows.size
      });
    }
  }

  const rows = missingRows.map((row) => {
    const matches = matchesByRow.get(row.row) || [];
    matches.sort((left, right) => {
      const rank = {
        "source-exact": 0,
        "source-alias": 1,
        "source-alias-item-family": 2,
        "name-only": 3,
        "name-only-item-family": 4
      };
      return rank[left.matchType] - rank[right.matchType] || left.remotePath.localeCompare(right.remotePath);
    });

    return {
      ...row,
      found: matches.length > 0,
      bestMatchType: matches[0]?.matchType || "",
      matches: matches.slice(0, 20)
    };
  });

  const sourceCorrectMatchTypes = new Set(["source-exact", "source-alias", "source-alias-item-family"]);
  const nameOnlyMatchTypes = new Set(["name-only", "name-only-item-family"]);
  const sourceCorrectRows = rows.filter((row) => sourceCorrectMatchTypes.has(row.bestMatchType));
  const nameOnlyRows = rows.filter((row) => nameOnlyMatchTypes.has(row.bestMatchType));
  const notFoundRows = rows.filter((row) => !row.found);

  const sourceCorrectPackageRows = new Map();
  sourceCorrectRows.forEach((row) => {
    row.matches
      .filter((match) => sourceCorrectMatchTypes.has(match.matchType))
      .forEach((match) => {
        if (!sourceCorrectPackageRows.has(match.remotePath)) {
          sourceCorrectPackageRows.set(match.remotePath, new Set());
        }
        sourceCorrectPackageRows.get(match.remotePath).add(row.row);
      });
  });

  const packageSummary = Array.from(packageMatches.values())
    .map((entry) => ({
      ...entry,
      sourceCorrectRows: sourceCorrectPackageRows.get(entry.remotePath)?.size || 0
    }))
    .sort((left, right) => right.sourceCorrectRows - left.sourceCorrectRows || right.matchedRows - left.matchedRows || left.remotePath.localeCompare(right.remotePath));

  return {
    generatedAt: new Date().toISOString(),
    checkedPackageCount: remotePaths.length,
    errors,
    counts: {
      missingRows: missingRows.length,
      foundSourceCorrect: sourceCorrectRows.length,
      foundNameOnly: nameOnlyRows.length,
      notFound: notFoundRows.length
    },
    packageSummary,
    sourceCorrectRows,
    nameOnlyRows,
    notFoundRows,
    rows
  };
}

async function main() {
  const report = await analyze();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote report to ${OUT_PATH}`);
  console.log(JSON.stringify(report.counts, null, 2));
  console.log(JSON.stringify(report.packageSummary.slice(0, 20), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
