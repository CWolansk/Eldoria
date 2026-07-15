"use strict";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/u, ""));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/u, ""));
    if (row.some(Boolean)) rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function meaningful(value) {
  const text = String(value || "").trim();
  return /^(?:|none|—|-)$/iu.test(text) ? "" : text;
}

function parseWeight(value) {
  const text = meaningful(value).replace("½", "0.5");
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseValue(value) {
  const label = meaningful(value);
  const match = label.replace(/,/gu, "").match(/^([0-9]+(?:\.[0-9]+)?)\s*(cp|sp|ep|gp|pp)$/iu);
  if (!match) return { valueLabel: label || undefined };
  const multiplier = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 }[match[2].toLowerCase()];
  return { value: Number(match[1]) * multiplier, valueLabel: label };
}

function splitList(value) {
  const text = meaningful(value);
  return text ? text.split(/\s*,\s*/u).map((entry) => entry.trim()).filter(Boolean) : [];
}

function textEntries(value) {
  return String(value || "")
    .replace(/&nbsp;/giu, " ")
    .split(/<br\s*\/?\s*>/giu)
    .map((entry) => entry.replace(/^\s*-\s*/u, "").trim())
    .filter(Boolean);
}

function homebrewRowToItem(row) {
  const name = String(row.Name || "").trim();
  const attunement = meaningful(row.Attunement);
  const type = meaningful(row.Type) || "Item";
  const page = meaningful(row.Page);
  const required = Boolean(attunement) && !/^no$/iu.test(attunement);
  return {
    ref: `item-${slug(name)}.json`,
    name,
    source: meaningful(row.Source) || "Eldoria",
    ...(page && Number.isFinite(Number(page)) ? { page: Number(page) } : {}),
    rarity: String(meaningful(row.Rarity) || "none").toLowerCase(),
    type,
    _category: "Magic",
    reqAttune: required,
    attunementRequirement: required ? attunement : "No attunement",
    damage: meaningful(row.Damage),
    properties: splitList(row.Properties),
    mastery: splitList(row.Mastery),
    weight: parseWeight(row.Weight),
    ...parseValue(row.Value),
    entries: textEntries(row.Text),
    wondrous: /wondrous item/iu.test(type),
    weapon: /weapon/iu.test(type),
    armor: /armor|shield/iu.test(type)
  };
}

function parseHomebrewItemsCsv(text) {
  return parseCsv(text).map(homebrewRowToItem).filter((item) => item.name);
}

module.exports = { homebrewRowToItem, parseCsv, parseHomebrewItemsCsv };
