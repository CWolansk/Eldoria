#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "docs", "data", "items.csv");
const ITEMS_JSON_PATH = path.join(ROOT, "docs", "character-sheets", "v1", "data", "items.json");
const ELDORIA_ITEMS_DIR = path.join(ROOT, "docs", "character-sheets", "v1", "data", "eldoria-items");

function normalize(value) {
  return String(value == null ? "" : value).trim();
}

function keyFor(name, source) {
  return `${normalize(name).toLowerCase()}|${normalize(source).toLowerCase()}`;
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
  return rows.map((values) => {
    const entry = {};
    headers.forEach((header, headerIndex) => {
      entry[header] = values[headerIndex] || "";
    });
    return entry;
  });
}

function parseNumericValue(rawValue) {
  const text = normalize(rawValue).replace(/,/g, "").toLowerCase();
  if (!text) {
    return null;
  }

  const match = text.match(/^(\d+(?:\.\d+)?)\s*(cp|sp|ep|gp|pp)?$/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || "cp").toLowerCase();
  if (!Number.isFinite(amount)) {
    return null;
  }

  const multipliers = {
    cp: 1,
    sp: 10,
    ep: 50,
    gp: 100,
    pp: 1000
  };

  return Math.round(amount * (multipliers[unit] || 1));
}

function loadCsvValueMap() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const values = new Map();

  rows.forEach((row) => {
    const value = parseNumericValue(row.Value);
    if (value == null) {
      return;
    }

    values.set(keyFor(row.Name, row.Source), value);
  });

  return values;
}

function updateItemRecord(record, csvValues) {
  const lookupKey = keyFor(record.name, record.source);
  const csvValue = csvValues.get(lookupKey);
  if (csvValue == null) {
    return { changed: false, reason: "missing-csv" };
  }

  if (record.value != null && record.value !== "") {
    return { changed: false, reason: "already-has-value" };
  }

  record.value = csvValue;
  if (record.raw && (record.raw.value == null || record.raw.value === "")) {
    record.raw.value = csvValue;
  }

  return { changed: true, reason: "filled-from-csv", value: csvValue };
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function updateItemsCatalog(csvValues) {
  const payload = JSON.parse(fs.readFileSync(ITEMS_JSON_PATH, "utf8"));
  let changedCount = 0;

  payload.items.forEach((item) => {
    const result = updateItemRecord(item, csvValues);
    if (result.changed) {
      changedCount += 1;
    }
  });

  if (changedCount > 0) {
    writeJson(ITEMS_JSON_PATH, payload);
  }

  return {
    file: ITEMS_JSON_PATH,
    changedCount,
    total: Array.isArray(payload.items) ? payload.items.length : 0
  };
}

function updateEldoriaItems(csvValues) {
  if (!fs.existsSync(ELDORIA_ITEMS_DIR)) {
    return { dir: ELDORIA_ITEMS_DIR, changedCount: 0, total: 0 };
  }

  const files = fs.readdirSync(ELDORIA_ITEMS_DIR)
    .filter((name) => name.toLowerCase().endsWith(".json"));

  let changedCount = 0;

  files.forEach((fileName) => {
    const filePath = path.join(ELDORIA_ITEMS_DIR, fileName);
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const result = updateItemRecord(payload, csvValues);
    if (result.changed) {
      writeJson(filePath, payload);
      changedCount += 1;
    }
  });

  return {
    dir: ELDORIA_ITEMS_DIR,
    changedCount,
    total: files.length
  };
}

function main() {
  const csvValues = loadCsvValueMap();
  const catalog = updateItemsCatalog(csvValues);
  const eldoria = updateEldoriaItems(csvValues);

  console.log(JSON.stringify({
    csvValues: csvValues.size,
    itemsCatalog: catalog,
    eldoriaItems: eldoria
  }, null, 2));
}

main();
