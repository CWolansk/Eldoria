const ATTACK_COLLECTION_KEYS = ["attacks", "manualAttacks"];
const MANUAL_ATTACK_FALLBACK_REASON = "Catalog resolution needed.";
const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABELS = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma"
};
const SKILL_TO_ABILITY = {
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
const PROPERTY_LABELS = {
  A: "Ammunition",
  F: "Finesse",
  H: "Heavy",
  L: "Light",
  LD: "Loading",
  R: "Reach",
  T: "Thrown",
  V: "Versatile",
  "2H": "Two-Handed"
};
const DAMAGE_TYPE_LABELS = {
  B: "bludgeoning",
  P: "piercing",
  S: "slashing"
};
const LOCAL_2014_WEAPONS = [
  ["Club", "M", "simple", "1d4", "", "B", ["L"], ""],
  ["Dagger", "M", "simple", "1d4", "", "P", ["F", "L", "T"], "20/60"],
  ["Greatclub", "M", "simple", "1d8", "", "B", ["2H"], ""],
  ["Handaxe", "M", "simple", "1d6", "", "S", ["L", "T"], "20/60"],
  ["Javelin", "M", "simple", "1d6", "", "P", ["T"], "30/120"],
  ["Light Hammer", "M", "simple", "1d4", "", "B", ["L", "T"], "20/60"],
  ["Mace", "M", "simple", "1d6", "", "B", [], ""],
  ["Quarterstaff", "M", "simple", "1d6", "1d8", "B", ["V"], ""],
  ["Sickle", "M", "simple", "1d4", "", "S", ["L"], ""],
  ["Spear", "M", "simple", "1d6", "1d8", "P", ["T", "V"], "20/60"],
  ["Light Crossbow", "R", "simple", "1d8", "", "P", ["A", "LD", "2H"], "80/320"],
  ["Dart", "R", "simple", "1d4", "", "P", ["F", "T"], "20/60"],
  ["Shortbow", "R", "simple", "1d6", "", "P", ["A", "2H"], "80/320"],
  ["Sling", "R", "simple", "1d4", "", "B", ["A"], "30/120"],
  ["Battleaxe", "M", "martial", "1d8", "1d10", "S", ["V"], ""],
  ["Flail", "M", "martial", "1d8", "", "B", [], ""],
  ["Glaive", "M", "martial", "1d10", "", "S", ["H", "R", "2H"], ""],
  ["Greataxe", "M", "martial", "1d12", "", "S", ["H", "2H"], ""],
  ["Greatsword", "M", "martial", "2d6", "", "S", ["H", "2H"], ""],
  ["Halberd", "M", "martial", "1d10", "", "S", ["H", "R", "2H"], ""],
  ["Lance", "M", "martial", "1d12", "", "P", ["R"], ""],
  ["Longsword", "M", "martial", "1d8", "1d10", "S", ["V"], ""],
  ["Maul", "M", "martial", "2d6", "", "B", ["H", "2H"], ""],
  ["Morningstar", "M", "martial", "1d8", "", "P", [], ""],
  ["Pike", "M", "martial", "1d10", "", "P", ["H", "R", "2H"], ""],
  ["Rapier", "M", "martial", "1d8", "", "P", ["F"], ""],
  ["Scimitar", "M", "martial", "1d6", "", "S", ["F", "L"], ""],
  ["Shortsword", "M", "martial", "1d6", "", "P", ["F", "L"], ""],
  ["Trident", "M", "martial", "1d6", "1d8", "P", ["T", "V"], "20/60"],
  ["War Pick", "M", "martial", "1d8", "", "P", [], ""],
  ["Warhammer", "M", "martial", "1d8", "1d10", "B", ["V"], ""],
  ["Whip", "M", "martial", "1d4", "", "S", ["F", "R"], ""],
  ["Blowgun", "R", "martial", "1", "", "P", ["A", "LD"], "25/100"],
  ["Hand Crossbow", "R", "martial", "1d6", "", "P", ["A", "L", "LD"], "30/120"],
  ["Heavy Crossbow", "R", "martial", "1d10", "", "P", ["A", "H", "LD", "2H"], "100/400"],
  ["Longbow", "R", "martial", "1d8", "", "P", ["A", "H", "2H"], "150/600"],
  ["Net", "R", "martial", "", "", "", ["S", "T"], "5/15"]
];
const LOCAL_2014_ARMOR = [
  ["Padded", "LA", "Light Armor", 11, null, true],
  ["Leather", "LA", "Light Armor", 11, null, false],
  ["Leather Armor", "LA", "Light Armor", 11, null, false],
  ["Studded Leather", "LA", "Light Armor", 12, null, false],
  ["Studded Leather Armor", "LA", "Light Armor", 12, null, false],
  ["Hide", "MA", "Medium Armor", 12, null, false],
  ["Hide Armor", "MA", "Medium Armor", 12, null, false],
  ["Chain Shirt", "MA", "Medium Armor", 13, null, false],
  ["Scale Mail", "MA", "Medium Armor", 14, null, true],
  ["Breastplate", "MA", "Medium Armor", 14, null, false],
  ["Half Plate", "MA", "Medium Armor", 15, null, true],
  ["Half Plate Armor", "MA", "Medium Armor", 15, null, true],
  ["Ring Mail", "HA", "Heavy Armor", 14, null, true],
  ["Chain Mail", "HA", "Heavy Armor", 16, 13, true],
  ["Splint", "HA", "Heavy Armor", 17, 15, true],
  ["Splint Armor", "HA", "Heavy Armor", 17, 15, true],
  ["Plate", "HA", "Heavy Armor", 18, 15, true],
  ["Plate Armor", "HA", "Heavy Armor", 18, 15, true],
  ["Shield", "S", "Shield", 2, null, false]
];
const LOCAL_WEAPON_INDEX = new Map(LOCAL_2014_WEAPONS.map((entry) => [normalizeLocalKey(entry[0]), entry]));
const LOCAL_ARMOR_INDEX = new Map(LOCAL_2014_ARMOR.map((entry) => [normalizeLocalKey(entry[0]), entry]));

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeName(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeLocalKey(value) {
  return normalizeName(value)
    .replace(/\s+armor$/i, "")
    .replace(/^\+([123])\s+/, "")
    .trim();
}

function normalizeSource(value) {
  return normalizeString(value).toUpperCase();
}

function stripAnchor(value) {
  return normalizeString(value).split("#")[0];
}

function stripJsonExtension(value) {
  return normalizeString(value).replace(/\.json$/i, "");
}

function slugify(value) {
  return normalizeString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function titleCase(value) {
  return normalizeString(value)
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function cloneJson(value, fallback = null) {
  if (value == null) {
    return fallback;
  }

  return JSON.parse(JSON.stringify(value));
}

function addToMapList(map, key, value) {
  const normalizedKey = normalizeString(key);
  if (!normalizedKey) {
    return;
  }

  const list = map.get(normalizedKey) ?? [];
  list.push(value);
  map.set(normalizedKey, list);
}

function addLookupKeys(map, entity, keys) {
  for (const key of keys) {
    addToMapList(map, key, entity);
    addToMapList(map, stripJsonExtension(key), entity);
  }
}

function getEntityLookupKeys(entity = {}) {
  return [
    entity.ref,
    entity.refId,
    entity.sourceId,
    entity.id
  ].map(normalizeString).filter(Boolean);
}

function addStandardEntityIndexes(indexes, prefix, entity) {
  addLookupKeys(indexes[`${prefix}ByRef`], entity, getEntityLookupKeys(entity));
  addToMapList(indexes[`${prefix}ByName`], normalizeName(entity.name), entity);
  addToMapList(indexes[`${prefix}ByNameSource`], `${normalizeName(entity.name)}|${normalizeSource(entity.source)}`, entity);
}

function getCatalogs(input = {}) {
  const value = input?.rulesCatalog ?? input?.normalizedCatalog ?? input?.catalog ?? input?.catalogs ?? input;
  if (value?.data?.catalogs) {
    return value.data.catalogs;
  }

  if (value?.normalizedCatalog?.catalogs) {
    return value.normalizedCatalog.catalogs;
  }

  if (value?.catalogs) {
    return value.catalogs;
  }

  return value ?? {};
}

function getCatalogItems(catalogs = {}) {
  return [
    ...toArray(catalogs.items?.items),
    ...toArray(catalogs.eldoriaItems?.items)
  ];
}

function getAllowedSources(context = {}, character = {}) {
  const policy = context.rulesProfile?.sourcePolicy ?? character.sourcePolicy?.sourcePolicy;
  if (policy === "all" || policy?.allowAll) {
    return null;
  }

  const allowedSources = toArray(
    context.allowedSources?.length
      ? context.allowedSources
      : context.rulesProfile?.allowedSources?.length
        ? context.rulesProfile.allowedSources
        : character.sourcePolicy?.allowedSources
  ).map(normalizeSource).filter(Boolean);

  return allowedSources.length ? new Set(allowedSources) : null;
}

function getEntitySources(entity = {}) {
  if (typeof entity === "string") {
    return [entity].map(normalizeSource).filter(Boolean);
  }

  return [
    entity.source,
    entity.classSource,
    entity.subclassSource,
    entity.raceSource,
    entity.inherits?.source,
    ...toArray(entity.sourceRefs).map((source) => source?.source),
    ...toArray(entity.raw?.sourceRefs).map((source) => source?.source)
  ].map(normalizeSource).filter(Boolean);
}

function isSourceAllowed(entity = {}, context = {}, character = {}) {
  const allowedSources = getAllowedSources(context, character);
  if (!allowedSources) {
    return true;
  }

  const sources = getEntitySources(entity);
  return !sources.length || sources.some((source) => allowedSources.has(source));
}

function firstAllowed(entries = [], context = {}, character = {}) {
  return toArray(entries).find((entry) => isSourceAllowed(entry, context, character)) ?? null;
}

function firstAllowedBySource(entries = [], source, context = {}, character = {}) {
  const sourceKey = normalizeSource(source);
  if (!sourceKey) {
    return firstAllowed(entries, context, character);
  }

  return toArray(entries).find((entry) => (
    isSourceAllowed(entry, context, character)
    && getEntitySources(entry).includes(sourceKey)
  )) ?? null;
}

function cleanRulesText(value) {
  if (Array.isArray(value)) {
    return value.map(cleanRulesText).filter(Boolean).join(" ");
  }

  if (isObject(value)) {
    return cleanRulesText(value.entries ?? value.items ?? value.name ?? "");
  }

  return normalizeString(value)
    .replace(/\{@(?:[a-zA-Z0-9_-]+)\s+([^|}]+)(?:\|[^}]*)?\}/g, "$1")
    .replace(/\{=([^}]+)\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, maxLength = 180) {
  const text = cleanRulesText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
}

function getFirstEntrySummary(entity = {}, maxLength = 180) {
  const source = isObject(entity) ? entity : {};
  return truncateText(
    source.entries?.[0]
      ?? source.inherits?.entries?.[0]
      ?? source.raw?.entries?.[0]
      ?? "",
    maxLength
  );
}

function getFullEntryText(...entities) {
  return entities
    .filter(isObject)
    .map((entity) => cleanRulesText(
      entity.entries
        ?? entity.inherits?.entries
        ?? entity.raw?.entries
        ?? entity.raw?.inherits?.entries
        ?? ""
    ))
    .filter(Boolean)
    .join("\n\n");
}

function getFeatureListText(features = []) {
  return toArray(features)
    .map((feature) => [
      normalizeString(feature.name),
      Number.isFinite(Number(feature.level)) ? `level ${Number(feature.level)}` : "",
      cleanRulesText(feature.entries ?? feature.raw?.entries ?? "")
    ].filter(Boolean).join(": "))
    .filter(Boolean)
    .join("\n\n");
}

function normalizeAnchorName(value) {
  return normalizeString(value)
    .replace(/^feature:\s*/i, "")
    .trim();
}

function getEntryNames(entry = {}, entity = {}) {
  const names = [
    entry.name,
    normalizeAnchorName(entry.name)
  ];

  if (entity.kind === "background" && entity.feature) {
    names.push(entity.feature);
  }

  return [...new Set(names.map(normalizeString).filter(Boolean))];
}

function createEmbeddedFeature(entity = {}, entry = {}, name = "") {
  const displayName = normalizeAnchorName(name || entry.name || entity.feature || entity.name);
  const entityRefId = entity.refId || stripJsonExtension(entity.ref) || entity.id || slugify(entity.name);
  return {
    id: `${entity.id ?? entity.ref ?? entity.name}#${slugify(displayName)}`,
    ref: `${entity.ref ?? entity.refId ?? ""}#${displayName}`,
    refId: `${entityRefId}#${slugify(displayName)}`,
    sourceId: `${entity.sourceId || entityRefId}#${slugify(displayName)}`,
    kind: `${entity.kind ?? "catalog"}Feature`,
    name: displayName,
    source: entity.source,
    page: entry.page ?? entity.page ?? null,
    parentName: entity.name ?? "",
    parentKind: entity.kind ?? "",
    parentRef: entity.ref ?? "",
    raceName: entity.raceName ?? "",
    subraceName: entity.subraceName ?? "",
    entries: entry.entries ?? [entry],
    sourceRefs: entity.sourceRefs ?? [],
    raw: entry.raw ?? entry
  };
}

function addFeatureAnchor(indexes, feature, refs = [], names = []) {
  const featureNames = [
    feature.name,
    normalizeAnchorName(feature.name),
    ...toArray(names)
  ].map(normalizeString).filter(Boolean);
  const featureRefs = [
    feature.ref,
    feature.refId,
    feature.sourceId,
    feature.parentRef,
    ...toArray(refs)
  ].map(normalizeString).filter(Boolean);

  addLookupKeys(indexes.featuresByRef, feature, getEntityLookupKeys(feature));
  for (const name of featureNames) {
    addToMapList(indexes.featuresByName, normalizeName(name), feature);
    addToMapList(indexes.featuresByNameSource, `${normalizeName(name)}|${normalizeSource(feature.source)}`, feature);

    for (const ref of featureRefs) {
      addToMapList(indexes.featuresByAnchor, `${normalizeName(name)}|${normalizeString(ref)}`, feature);
      addToMapList(indexes.featuresByAnchor, `${normalizeName(name)}|${stripJsonExtension(ref)}`, feature);
    }
  }
}

function addEmbeddedFeatureIndexes(indexes, entity = {}) {
  for (const entry of toArray(entity.entries)) {
    if (!isObject(entry) || !normalizeString(entry.name)) {
      continue;
    }

    const names = getEntryNames(entry, entity);
    const feature = createEmbeddedFeature(entity, entry, names[0]);
    addFeatureAnchor(indexes, feature, [
      entity.parentRef,
      entity.parentId
    ], names);
  }
}

function getSpellSchoolLabel(value) {
  if (isObject(value)) {
    return normalizeString(value.name || value.code);
  }

  const code = normalizeString(value);
  return {
    A: "abjuration",
    C: "conjuration",
    D: "divination",
    E: "enchantment",
    V: "evocation",
    I: "illusion",
    N: "necromancy",
    T: "transmutation"
  }[code] ?? code;
}

function getRefBaseFromSource(source) {
  const text = stripJsonExtension(stripAnchor(source));
  return text ? `${text}.json` : "";
}

function createIndexes(catalogs = {}) {
  const indexes = {
    spellsByRef: new Map(),
    spellsByName: new Map(),
    spellsByNameSource: new Map(),
    itemsByRef: new Map(),
    itemsByName: new Map(),
    itemsByNameSource: new Map(),
    magicVariantsByRef: new Map(),
    magicVariantsByName: new Map(),
    itemPropertiesByCode: new Map(),
    featuresByRef: new Map(),
    featuresByName: new Map(),
    featuresByNameSource: new Map(),
    featuresByAnchor: new Map(),
    classesByRef: new Map(),
    classesByName: new Map(),
    classesByNameSource: new Map(),
    subclassesByRef: new Map(),
    subclassesByName: new Map(),
    subclassesByNameSource: new Map(),
    subclassesByClassName: new Map(),
    racesByRef: new Map(),
    racesByName: new Map(),
    racesByNameSource: new Map(),
    backgroundsByRef: new Map(),
    backgroundsByName: new Map(),
    backgroundsByNameSource: new Map(),
    featsByRef: new Map(),
    featsByName: new Map(),
    featsByNameSource: new Map()
  };

  for (const spell of toArray(catalogs.spells?.spells)) {
    addStandardEntityIndexes(indexes, "spells", spell);
  }

  for (const item of getCatalogItems(catalogs)) {
    addStandardEntityIndexes(indexes, "items", item);
  }

  for (const variant of toArray(catalogs.magicVariants?.magicVariants)) {
    addLookupKeys(indexes.magicVariantsByRef, variant, getEntityLookupKeys(variant));
    addToMapList(indexes.magicVariantsByName, normalizeName(variant.name), variant);
  }

  for (const property of toArray(catalogs.itemProperties?.itemProperties)) {
    addToMapList(indexes.itemPropertiesByCode, normalizeString(property.abbreviation || property.code).toUpperCase(), property);
    addToMapList(indexes.itemPropertiesByCode, normalizeName(property.name), property);
  }

  for (const feature of [
    ...toArray(catalogs.features?.classFeatures),
    ...toArray(catalogs.features?.subclassFeatures)
  ]) {
    addFeatureAnchor(indexes, feature, [
      feature.classRef,
      feature.subclassRef,
      getRefBaseFromSource(feature.classRef),
      getRefBaseFromSource(feature.subclassRef)
    ]);
  }

  for (const classEntry of toArray(catalogs.classes?.classes)) {
    addStandardEntityIndexes(indexes, "classes", classEntry);
  }

  for (const subclass of toArray(catalogs.classes?.subclasses)) {
    addStandardEntityIndexes(indexes, "subclasses", subclass);
    addToMapList(indexes.subclassesByName, normalizeName(subclass.shortName), subclass);
    addToMapList(indexes.subclassesByClassName, `${normalizeName(subclass.name)}|${normalizeName(subclass.className)}`, subclass);
    addToMapList(indexes.subclassesByClassName, `${normalizeName(subclass.shortName)}|${normalizeName(subclass.className)}`, subclass);
  }

  for (const race of toArray(catalogs.races?.races)) {
    addStandardEntityIndexes(indexes, "races", race);
    addToMapList(indexes.racesByName, normalizeName(race.raceName), race);
    addToMapList(indexes.racesByNameSource, `${normalizeName(race.raceName)}|${normalizeSource(race.raceSource || race.source)}`, race);
    addEmbeddedFeatureIndexes(indexes, race);
  }

  for (const background of toArray(catalogs.backgrounds?.backgrounds)) {
    addStandardEntityIndexes(indexes, "backgrounds", background);
    addEmbeddedFeatureIndexes(indexes, background);
  }

  for (const feat of toArray(catalogs.feats?.feats)) {
    addStandardEntityIndexes(indexes, "feats", feat);
    addEmbeddedFeatureIndexes(indexes, feat);
  }

  return indexes;
}

/**
 * Creates a lightweight lookup context over the generated normalized catalog.
 * The sheet keeps working when this returns catalogAvailable:false.
 */
export function createSheetRulesContext(options = {}) {
  const catalogs = getCatalogs(options);
  const catalogAvailable = Boolean(
    getCatalogItems(catalogs).length
    || toArray(catalogs.itemProperties?.itemProperties).length
    || toArray(catalogs.magicVariants?.magicVariants).length
    || toArray(catalogs.spells?.spells).length
    || toArray(catalogs.features?.classFeatures).length
    || toArray(catalogs.features?.subclassFeatures).length
    || toArray(catalogs.classes?.classes).length
    || toArray(catalogs.classes?.subclasses).length
    || toArray(catalogs.races?.races).length
    || toArray(catalogs.backgrounds?.backgrounds).length
    || toArray(catalogs.feats?.feats).length
  );

  return {
    catalogAvailable,
    catalogs,
    indexes: createIndexes(catalogs),
    rulesProfile: options.rulesProfile ?? {},
    allowedSources: toArray(options.allowedSources)
  };
}

function lookupByRef(map, ref, context, character) {
  if (!map) {
    return null;
  }

  const candidates = [
    normalizeString(ref),
    stripJsonExtension(ref),
    stripJsonExtension(stripAnchor(ref))
  ];

  for (const key of candidates) {
    const found = firstAllowed(map.get(key), context, character);
    if (found) {
      return found;
    }
  }

  return null;
}

function lookupByNameSource(nameMap, nameSourceMap, name, source, context, character) {
  if (!nameMap || !nameSourceMap) {
    return null;
  }

  const nameKey = normalizeName(name);
  const sourceKey = normalizeSource(source);

  if (nameKey && sourceKey) {
    const exact = firstAllowed(nameSourceMap.get(`${nameKey}|${sourceKey}`), context, character);
    if (exact) {
      return exact;
    }
  }

  return firstAllowedBySource(nameMap.get(nameKey), source, context, character);
}

function resolveCatalogEntity({ ref, name, source, refMap, nameMap, nameSourceMap, context, character }) {
  return lookupByRef(refMap, ref, context, character)
    ?? lookupByNameSource(nameMap, nameSourceMap, name, source, context, character);
}

function formatSpellTime(time = []) {
  return toArray(time)
    .map((entry) => [entry.number, entry.unit].filter((value) => value != null && value !== "").join(" "))
    .filter(Boolean)
    .join(", ");
}

function formatSpellRange(range = {}) {
  if (!isObject(range)) {
    return normalizeString(range);
  }

  const distance = range.distance ?? {};
  if (distance.amount != null && distance.type) {
    return `${distance.amount} ${distance.type}`;
  }

  return normalizeString(range.type);
}

function formatSpellComponents(components = {}) {
  if (!isObject(components)) {
    return normalizeString(components);
  }

  return [
    components.v ? "V" : null,
    components.s ? "S" : null,
    components.m ? `M (${cleanRulesText(components.m)})` : null
  ].filter(Boolean).join(", ");
}

function formatSpellDuration(duration = []) {
  return toArray(duration)
    .map((entry) => {
      if (!isObject(entry)) {
        return normalizeString(entry);
      }

      if (entry.type === "timed" && entry.duration) {
        return `${entry.duration.amount} ${entry.duration.type}`;
      }

      return normalizeString(entry.type);
    })
    .filter(Boolean)
    .join(", ");
}

export function resolveSpellDetail(spell, context = {}, character = {}) {
  const source = typeof spell === "string" ? "" : normalizeString(spell?.source);
  const name = typeof spell === "string" ? normalizeString(spell) : normalizeString(spell?.name ?? spell?.spell);
  const ref = typeof spell === "string" ? "" : normalizeString(spell?.ref);
  const catalogSpell = resolveCatalogEntity({
    ref,
    name,
    source,
    refMap: context.indexes?.spellsByRef,
    nameMap: context.indexes?.spellsByName,
    nameSourceMap: context.indexes?.spellsByNameSource,
    context,
    character
  });

  return {
    resolved: Boolean(catalogSpell),
    name: catalogSpell?.name ?? name,
    source: catalogSpell?.source ?? source,
    ref: catalogSpell?.ref ?? ref,
    level: catalogSpell?.level ?? (typeof spell === "string" ? null : spell?.level ?? null),
    school: getSpellSchoolLabel(catalogSpell?.school ?? spell?.school ?? ""),
    ritual: Boolean(catalogSpell?.ritual ?? spell?.ritual),
    concentration: Boolean(catalogSpell?.concentration ?? spell?.concentration),
    castingTime: formatSpellTime(catalogSpell?.time),
    range: formatSpellRange(catalogSpell?.range),
    components: formatSpellComponents(catalogSpell?.components),
    duration: formatSpellDuration(catalogSpell?.duration),
    summary: truncateText(catalogSpell?.entries?.[0] ?? "", 150),
    fullText: getFullEntryText(catalogSpell)
  };
}

function getFeatureContextRefs(ref, source, context = {}, character = {}) {
  const baseRef = stripAnchor(ref);
  const refs = new Set([
    normalizeString(baseRef),
    stripJsonExtension(baseRef),
    getRefBaseFromSource(source)
  ].filter(Boolean));
  const race = lookupByRef(context.indexes?.racesByRef, baseRef, context, character);
  if (race?.parentRef) {
    refs.add(normalizeString(race.parentRef));
    refs.add(stripJsonExtension(race.parentRef));
  }

  return [...refs];
}

export function resolveFeatureDetail(feature, context = {}, character = {}) {
  const name = normalizeString(feature?.name ?? feature?.feature);
  const source = normalizeString(feature?.source);
  const ref = normalizeString(feature?.ref);
  const [, anchor] = ref.split("#");
  const anchorName = normalizeString(anchor || name);
  const contextRefs = getFeatureContextRefs(ref, source, context, character);
  const anchorCandidates = [
    anchorName,
    normalizeAnchorName(anchorName),
    name,
    normalizeAnchorName(name)
  ].map(normalizeString).filter(Boolean);
  let catalogFeature = lookupByRef(context.indexes?.featuresByRef, ref, context, character)
    ?? lookupByRef(context.indexes?.featuresByRef, stripAnchor(ref), context, character);

  for (const refCandidate of contextRefs) {
    for (const anchorCandidate of anchorCandidates) {
      catalogFeature ??= firstAllowed(
        context.indexes?.featuresByAnchor.get(`${normalizeName(anchorCandidate)}|${normalizeString(refCandidate)}`),
        context,
        character
      );
    }
  }

  catalogFeature ??= lookupByNameSource(context.indexes?.featuresByName, context.indexes?.featuresByNameSource, name, "", context, character);

  return {
    resolved: Boolean(catalogFeature),
    name: catalogFeature?.name ?? name,
    source: catalogFeature?.source ?? source,
    ref: catalogFeature?.ref ?? ref,
    kind: catalogFeature?.kind ?? "",
    className: catalogFeature?.className ?? "",
    subclassShortName: catalogFeature?.subclassShortName ?? "",
    parentName: catalogFeature?.parentName ?? "",
    parentKind: catalogFeature?.parentKind ?? "",
    level: catalogFeature?.level ?? null,
    summary: truncateText(catalogFeature?.entries?.[0] ?? "", 170),
    fullText: getFullEntryText(catalogFeature)
  };
}

function formatHitDie(hitDie = {}, fallback = "") {
  if (hitDie.formula) {
    return hitDie.formula;
  }

  if (hitDie.faces) {
    return `d${hitDie.faces}`;
  }

  return fallback ? `d${fallback}` : "";
}

function formatSize(size) {
  const values = toArray(size).filter(Boolean);
  return values.length ? values.join(", ") : normalizeString(size);
}

function formatSpeed(speed) {
  if (typeof speed === "number") {
    return `${speed} ft.`;
  }

  if (!isObject(speed)) {
    return normalizeString(speed);
  }

  return Object.entries(speed)
    .filter(([, value]) => value != null && value !== "")
    .map(([kind, value]) => `${kind} ${value} ft.`)
    .join(", ");
}

function formatGrantSummary(grants = {}) {
  const fixedSummary = [];
  for (const key of ["skills", "languages", "tools", "weapons", "armor"]) {
    const fixed = toArray(grants?.[key]?.fixed).map(titleCase).filter(Boolean);
    if (fixed.length) {
      fixedSummary.push(`${titleCase(key)}: ${fixed.slice(0, 3).join(", ")}${fixed.length > 3 ? "..." : ""}`);
    }
  }

  return fixedSummary.join(" | ");
}

function getBackgroundFeatureSummary(background = {}) {
  const featureName = normalizeName(background?.feature);
  const featureEntry = toArray(background?.entries).find((entry) => {
    const name = normalizeName(normalizeAnchorName(entry?.name));
    return featureName && name.includes(featureName);
  });

  return truncateText(featureEntry?.entries?.[0] ?? background?.entries?.[0] ?? "", 170);
}

function summarizeSubclassFeatures(subclass = {}) {
  const source = isObject(subclass) ? subclass : {};
  return toArray(source.subclassFeatures)
    .slice(0, 4)
    .map((feature) => `${feature.name}${feature.level ? ` L${feature.level}` : ""}`)
    .join(", ");
}

export function resolveClassDetail(classEntry, context = {}, character = {}) {
  const ref = normalizeString(classEntry?.main ?? classEntry?.classRef ?? classEntry?.ref);
  const name = normalizeString(classEntry?.name ?? classEntry?.main);
  const source = normalizeString(classEntry?.source ?? classEntry?.classSource);
  const catalogClass = resolveCatalogEntity({
    ref,
    name,
    source,
    refMap: context.indexes?.classesByRef,
    nameMap: context.indexes?.classesByName,
    nameSourceMap: context.indexes?.classesByNameSource,
    context,
    character
  });

  return {
    resolved: Boolean(catalogClass),
    name: catalogClass?.name ?? titleCase(stripJsonExtension(ref || name).replace(/^class-/i, "")),
    source: catalogClass?.source ?? source,
    ref: catalogClass?.ref ?? ref,
    hitDie: formatHitDie(catalogClass?.hitDie, classEntry?.hitDieSize),
    savingThrows: toArray(catalogClass?.savingThrows),
    spellcastingAbility: catalogClass?.spellcasting?.ability ?? "",
    casterProgression: catalogClass?.spellcasting?.casterProgression ?? "",
    preparedSpells: catalogClass?.spellcasting?.preparedSpells ?? "",
    subclassTitle: catalogClass?.subclassTitle ?? "",
    subclassUnlockLevel: catalogClass?.subclassUnlockLevel ?? null,
    summary: toArray(catalogClass?.classFeatures).slice(0, 4).map((feature) => `${feature.name} L${feature.level}`).join(", "),
    fullText: [
      getFullEntryText(catalogClass),
      getFeatureListText(catalogClass?.classFeatures)
    ].filter(Boolean).join("\n\n")
  };
}

export function resolveSubclassDetail(classEntry, context = {}, character = {}) {
  const ref = normalizeString(classEntry?.subclassRef ?? classEntry?.ref);
  const name = normalizeString(classEntry?.sub ?? classEntry?.name ?? classEntry?.shortName);
  const className = normalizeString(classEntry?.className ?? classEntry?.main);
  const source = normalizeString(classEntry?.subclassSource ?? classEntry?.source);
  let catalogSubclass = resolveCatalogEntity({
    ref,
    name,
    source,
    refMap: context.indexes?.subclassesByRef,
    nameMap: context.indexes?.subclassesByName,
    nameSourceMap: context.indexes?.subclassesByNameSource,
    context,
    character
  });

  if (!catalogSubclass && name && className) {
    catalogSubclass = firstAllowed(
      context.indexes?.subclassesByClassName.get(`${normalizeName(name)}|${normalizeName(className)}`),
      context,
      character
    );
  }

  return {
    resolved: Boolean(catalogSubclass),
    name: catalogSubclass?.name ?? name,
    shortName: catalogSubclass?.shortName ?? "",
    source: catalogSubclass?.source ?? source,
    ref: catalogSubclass?.ref ?? ref,
    className: catalogSubclass?.className ?? "",
    classRef: catalogSubclass?.classRef ?? "",
    unlockAtClassLevel: catalogSubclass?.unlockAtClassLevel ?? null,
    featureLevels: toArray(catalogSubclass?.featureLevels),
    summary: summarizeSubclassFeatures(catalogSubclass),
    fullText: [
      getFullEntryText(catalogSubclass),
      getFeatureListText(catalogSubclass?.subclassFeatures)
    ].filter(Boolean).join("\n\n")
  };
}

export function resolveRaceDetail(race, context = {}, character = {}) {
  const ref = normalizeString(race?.ref);
  const name = normalizeString(race?.subrace ?? race?.name ?? race?.raceName);
  const source = normalizeString(race?.source ?? race?.raceSource);
  const catalogRace = resolveCatalogEntity({
    ref,
    name,
    source,
    refMap: context.indexes?.racesByRef,
    nameMap: context.indexes?.racesByName,
    nameSourceMap: context.indexes?.racesByNameSource,
    context,
    character
  });

  return {
    resolved: Boolean(catalogRace),
    name: catalogRace?.name ?? name,
    raceName: catalogRace?.raceName ?? race?.name ?? "",
    subraceName: catalogRace?.subraceName ?? race?.subrace ?? "",
    source: catalogRace?.source ?? source,
    ref: catalogRace?.ref ?? ref,
    parentRef: catalogRace?.parentRef ?? "",
    size: formatSize(catalogRace?.size),
    speed: formatSpeed(catalogRace?.speed),
    traits: toArray(catalogRace?.traits),
    grants: formatGrantSummary(catalogRace?.grants),
    summary: getFirstEntrySummary(catalogRace, 170),
    fullText: getFullEntryText(catalogRace)
  };
}

export function resolveBackgroundDetail(background, context = {}, character = {}) {
  const ref = normalizeString(background?.ref);
  const name = normalizeString(background?.name ?? background?.background);
  const source = normalizeString(background?.source);
  const catalogBackground = resolveCatalogEntity({
    ref,
    name,
    source,
    refMap: context.indexes?.backgroundsByRef,
    nameMap: context.indexes?.backgroundsByName,
    nameSourceMap: context.indexes?.backgroundsByNameSource,
    context,
    character
  });

  return {
    resolved: Boolean(catalogBackground),
    name: catalogBackground?.name ?? name,
    source: catalogBackground?.source ?? source,
    ref: catalogBackground?.ref ?? ref,
    feature: catalogBackground?.feature ?? background?.feature ?? "",
    grants: formatGrantSummary(catalogBackground?.grants),
    summary: getBackgroundFeatureSummary(catalogBackground),
    fullText: getFullEntryText(catalogBackground)
  };
}

export function resolveFeatDetail(feat, context = {}, character = {}) {
  const ref = normalizeString(feat?.ref);
  const name = normalizeString(feat?.name ?? feat?.feat ?? feat);
  const source = normalizeString(feat?.source);
  const catalogFeat = resolveCatalogEntity({
    ref,
    name,
    source,
    refMap: context.indexes?.featsByRef,
    nameMap: context.indexes?.featsByName,
    nameSourceMap: context.indexes?.featsByNameSource,
    context,
    character
  });

  return {
    resolved: Boolean(catalogFeat),
    name: catalogFeat?.name ?? name,
    source: catalogFeat?.source ?? source,
    ref: catalogFeat?.ref ?? ref,
    prerequisite: cleanRulesText(catalogFeat?.prerequisite ?? ""),
    grants: formatGrantSummary(catalogFeat?.grants),
    summary: getFirstEntrySummary(catalogFeat, 170),
    fullText: getFullEntryText(catalogFeat)
  };
}

function parseRange(rawRange) {
  const raw = normalizeString(rawRange);
  const [normal, long] = raw.split("/").map((part) => Number(part));
  return {
    raw,
    normal: Number.isFinite(normal) ? normal : null,
    long: Number.isFinite(long) ? long : null
  };
}

function createLocalProperties(codes = []) {
  return codes.map((code) => ({
    code,
    abbreviation: code,
    source: "PHB",
    name: PROPERTY_LABELS[code] ?? code,
    ref: `item-property-${slugify(PROPERTY_LABELS[code] ?? code)}.json`
  }));
}

function createLocalWeaponItem(name, source = "PHB") {
  const text = normalizeString(name);
  const magicMatch = /^\+([123])\s+(.+)$/.exec(text);
  const bonus = magicMatch ? Number(magicMatch[1]) : 0;
  const baseName = magicMatch ? magicMatch[2] : text;
  const entry = LOCAL_WEAPON_INDEX.get(normalizeLocalKey(baseName));
  if (!entry) {
    return null;
  }

  const [weaponName, typeCode, category, primaryDamage, versatileDamage, damageType, propertyCodes, range] = entry;
  const sourceRef = normalizeString(source) || "PHB";
  const typeName = typeCode === "R" ? "Ranged Weapon" : "Melee Weapon";
  const bonuses = bonus
    ? {
        bonusWeapon: `+${bonus}`,
        bonusWeaponAttack: `+${bonus}`,
        bonusWeaponDamage: `+${bonus}`
      }
    : {};

  return {
    id: `local-2014-weapon:${slugify(weaponName)}`,
    ref: `item-${slugify(weaponName)}.json`,
    refId: `item-${slugify(weaponName)}`,
    kind: "local2014Weapon",
    name: weaponName,
    source: sourceRef,
    type: {
      code: typeCode,
      abbreviation: typeCode,
      source: "PHB",
      name: typeName,
      ref: `item-type-${slugify(typeName)}.json`
    },
    rarity: bonus ? "unknown (magic)" : "none",
    tags: {
      weapon: true
    },
    bonuses,
    weapon: {
      category,
      properties: createLocalProperties(propertyCodes),
      damage: {
        primary: primaryDamage,
        versatile: versatileDamage,
        type: {
          code: damageType,
          name: DAMAGE_TYPE_LABELS[damageType] ?? damageType
        }
      },
      range: parseRange(range),
      reload: null,
      reach: propertyCodes.includes("R") ? 5 : null,
      ammoType: "",
      bonuses,
      tags: {}
    },
    armor: null,
    conditionalDamage: [],
    localRuleSource: "2014 weapon table"
  };
}

function createLocalArmorItem(name, source = "PHB") {
  const text = normalizeString(name);
  const magicMatch = /^\+([123])\s+(.+)$/.exec(text);
  const bonus = magicMatch ? Number(magicMatch[1]) : 0;
  const baseName = magicMatch ? magicMatch[2] : text;
  const entry = LOCAL_ARMOR_INDEX.get(normalizeLocalKey(baseName));
  if (!entry) {
    return null;
  }

  const [armorName, typeCode, typeName, ac, strength, stealth] = entry;
  const sourceRef = normalizeString(source) || "PHB";
  const bonuses = bonus
    ? {
        bonusAc: `+${bonus}`
      }
    : {};

  return {
    id: `local-2014-armor:${slugify(armorName)}`,
    ref: `item-${slugify(armorName)}.json`,
    refId: `item-${slugify(armorName)}`,
    kind: "local2014Armor",
    name: armorName,
    source: sourceRef,
    type: {
      code: typeCode,
      abbreviation: typeCode,
      source: "PHB",
      name: typeName,
      ref: `item-type-${slugify(typeName)}.json`
    },
    rarity: bonus ? "unknown (magic)" : "none",
    tags: {
      armor: typeCode !== "S"
    },
    bonuses,
    weapon: null,
    armor: {
      ac,
      strength,
      stealth,
      armor: typeCode !== "S",
      bonusAc: bonus ? `+${bonus}` : ""
    },
    conditionalDamage: [],
    localRuleSource: "2014 armor table"
  };
}

function resolveLocalItem(item = {}, context = {}, character = {}) {
  const name = normalizeString(item?.name ?? item);
  const source = normalizeString(item?.source) || "PHB";
  const localItem = createLocalWeaponItem(name, source) ?? createLocalArmorItem(name, source);
  return localItem && isSourceAllowed(localItem, context, character) ? localItem : null;
}

export function resolveItemPropertyDetail(property, context = {}, character = {}) {
  const code = normalizeString(property?.code ?? property?.abbreviation ?? property).toUpperCase();
  const name = normalizeString(property?.name ?? property);
  const catalogProperty = firstAllowed(
    context.indexes?.itemPropertiesByCode.get(code)
      ?? context.indexes?.itemPropertiesByCode.get(normalizeName(name)),
    context,
    character
  );

  return {
    resolved: Boolean(catalogProperty),
    code: catalogProperty?.abbreviation ?? catalogProperty?.code ?? code,
    name: catalogProperty?.name ?? name ?? code,
    source: catalogProperty?.source ?? property?.source ?? "",
    ref: catalogProperty?.ref ?? property?.ref ?? "",
    summary: truncateText(catalogProperty?.entries?.[0] ?? property?.entries?.[0] ?? "", 170)
  };
}

function getItemPropertyDetails(itemDetail = {}, context = {}, character = {}) {
  const properties = [
    ...toArray(itemDetail.baseItem?.weapon?.properties),
    ...toArray(itemDetail.localItem?.weapon?.properties),
    ...toArray(itemDetail.item?.weapon?.properties),
    ...toArray(itemDetail.variant?.inherits?.propertyAdd)
  ];
  const seen = new Set();
  const details = [];

  for (const property of properties) {
    const detail = resolveItemPropertyDetail(property, context, character);
    const key = normalizeString(detail.code || detail.name).toUpperCase();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    details.push(detail);
  }

  return details;
}

export function resolveItemDetail(item, context = {}, character = {}) {
  const name = normalizeString(item?.name ?? item);
  const source = normalizeString(item?.source);
  const ref = normalizeString(item?.ref);
  let catalogItem = lookupByRef(context.indexes?.itemsByRef, ref, context, character)
    ?? lookupByNameSource(context.indexes?.itemsByName, context.indexes?.itemsByNameSource, name, source, context, character);

  let baseItem = catalogItem?.baseItem
    ? lookupByRef(context.indexes?.itemsByRef, catalogItem.baseItem.ref ?? catalogItem.baseItem.id, context, character)
      ?? lookupByNameSource(context.indexes?.itemsByName, context.indexes?.itemsByNameSource, catalogItem.baseItem.name, catalogItem.baseItem.source, context, character)
    : null;

  if (!catalogItem) {
    catalogItem = matchItemFromVariantName(name, context, character)?.baseItem ?? null;
  }

  if (!baseItem && catalogItem?.kind === "baseItem") {
    baseItem = catalogItem;
  }

  const variant = resolveMagicVariant(item, catalogItem ?? baseItem, context, character);
  const localItem = catalogItem || baseItem ? null : resolveLocalItem(item, context, character);
  const detail = {
    item: catalogItem,
    baseItem,
    localItem,
    variant
  };
  const propertyDetails = getItemPropertyDetails(detail, context, character);

  return {
    resolved: Boolean(catalogItem || baseItem || localItem),
    item: catalogItem,
    baseItem,
    localItem,
    variant,
    displayName: name || catalogItem?.name || baseItem?.name || localItem?.name || "",
    source: catalogItem?.source ?? baseItem?.source ?? localItem?.source ?? source,
    type: catalogItem?.type?.name ?? baseItem?.type?.name ?? localItem?.type?.name ?? "",
    rarity: catalogItem?.rarity ?? variant?.inherits?.rarity ?? baseItem?.rarity ?? "",
    weight: catalogItem?.weight ?? baseItem?.weight ?? localItem?.weight ?? null,
    attunement: catalogItem?.attunement ?? variant?.inherits?.attunement ?? baseItem?.attunement ?? localItem?.attunement ?? null,
    summary: getFirstEntrySummary(catalogItem ?? baseItem ?? localItem, 170),
    variantName: variant?.name ?? "",
    variantSummary: truncateText(variant?.inherits?.entries?.[0] ?? variant?.entries?.[0] ?? "", 170),
    properties: propertyDetails,
    fullText: [
      getFullEntryText(catalogItem),
      getFullEntryText(baseItem),
      getFullEntryText(localItem),
      getFullEntryText(variant?.inherits),
      getFullEntryText(variant)
    ].filter(Boolean).join("\n\n")
  };
}

function parseBonus(value) {
  if (Number.isFinite(Number(value))) {
    return Number(value);
  }

  const match = /([+-]?\d+)/.exec(normalizeString(value));
  return match ? Number(match[1]) : 0;
}

function mergeObjects(...objects) {
  return Object.assign({}, ...objects.filter(isObject));
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

function compactObject(object = {}) {
  return Object.fromEntries(
    Object.entries(object)
      .filter(([, value]) => hasMeaningfulValue(value))
      .map(([key, value]) => [key, isObject(value) ? compactObject(value) : value])
  );
}

function mergeMeaningfulObjects(...objects) {
  return Object.assign({}, ...objects.filter(isObject).map(compactObject));
}

function getPropertyCodes(weapon = {}) {
  return toArray(weapon.properties)
    .map((property) => normalizeString(property.code || property.abbreviation || property.name).toUpperCase())
    .filter(Boolean);
}

function getPropertyNames(weapon = {}, context = {}) {
  return toArray(weapon.properties)
    .map((property) => {
      const code = normalizeString(property.code || property.abbreviation).toUpperCase();
      const catalogProperty = firstAllowed(context.indexes?.itemPropertiesByCode.get(code), context, {});
      return catalogProperty?.name || property.name || code;
    })
    .filter(Boolean);
}

function getWeaponSource(itemDetail = {}) {
  const catalogItem = itemDetail.item;
  const baseItem = itemDetail.baseItem;
  const localItem = itemDetail.localItem;
  const variant = itemDetail.variant;
  const baseWeapon = cloneJson(baseItem?.weapon ?? localItem?.weapon ?? catalogItem?.weapon, {});
  const itemWeapon = cloneJson(catalogItem?.weapon, {});
  const variantWeapon = cloneJson(variant?.inherits?.weapon, {});
  const mergedWeapon = {
    ...baseWeapon,
    ...itemWeapon,
    ...Object.fromEntries(
      Object.entries(variantWeapon).filter(([, value]) => (
        value != null
        && value !== ""
        && (!Array.isArray(value) || value.length)
        && (!isObject(value) || Object.keys(value).length)
      ))
    )
  };

  const baseDamage = baseWeapon.damage ?? {};
  const itemDamage = itemWeapon.damage ?? {};
  const variantDamage = variantWeapon.damage ?? {};
  mergedWeapon.damage = mergeMeaningfulObjects(baseDamage, itemDamage, variantDamage);
  mergedWeapon.range = mergeMeaningfulObjects(baseWeapon.range, itemWeapon.range, variantWeapon.range);
  mergedWeapon.bonuses = mergeMeaningfulObjects(
    baseWeapon.bonuses,
    baseItem?.bonuses,
    localItem?.bonuses,
    itemWeapon.bonuses,
    catalogItem?.bonuses,
    variant?.inherits?.bonuses,
    variantWeapon.bonuses
  );
  mergedWeapon.tags = mergeMeaningfulObjects(baseWeapon.tags, baseItem?.tags, localItem?.tags, itemWeapon.tags, catalogItem?.tags, variantWeapon.tags);
  mergedWeapon.properties = mergeProperties(baseWeapon.properties, itemWeapon.properties, variant?.inherits);

  return Object.keys(mergedWeapon).length ? mergedWeapon : null;
}

function getArmorSource(itemDetail = {}) {
  const catalogItem = itemDetail.item;
  const baseItem = itemDetail.baseItem;
  const localItem = itemDetail.localItem;
  const variant = itemDetail.variant;
  const baseArmor = cloneJson(baseItem?.armor ?? localItem?.armor ?? catalogItem?.armor, {});
  const itemArmor = cloneJson(catalogItem?.armor, {});
  const variantArmor = cloneJson(variant?.inherits?.armor, {});
  const mergedArmor = mergeMeaningfulObjects(baseArmor, itemArmor, variantArmor);
  const bonuses = mergeMeaningfulObjects(
    baseArmor.bonuses,
    baseItem?.bonuses,
    localItem?.bonuses,
    itemArmor.bonuses,
    catalogItem?.bonuses,
    variant?.inherits?.bonuses,
    variantArmor.bonuses
  );
  const hasArmorData = Object.keys(mergedArmor).length > 0 || Object.keys(bonuses).length > 0;

  if (!hasArmorData) {
    return null;
  }

  if (Object.keys(bonuses).length) {
    mergedArmor.bonuses = bonuses;
  }

  const type = catalogItem?.type ?? baseItem?.type ?? localItem?.type ?? {};
  if (type?.code || type?.name) {
    mergedArmor.type = type;
  }

  return mergedArmor;
}

function mergeProperties(baseProperties = [], itemProperties = [], inherits = {}) {
  const byCode = new Map();
  for (const property of [...toArray(baseProperties), ...toArray(itemProperties), ...toArray(inherits.propertyAdd)]) {
    const code = normalizeString(property.code || property.abbreviation || property).toUpperCase();
    if (code) {
      byCode.set(code, isObject(property) ? property : { code, name: code });
    }
  }

  for (const property of toArray(inherits.propertyRemove)) {
    const code = normalizeString(property.code || property.abbreviation || property).toUpperCase();
    byCode.delete(code);
  }

  return [...byCode.values()];
}

function matchItemFromVariantName(name, context, character) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    return null;
  }

  for (const baseItem of toArray(context.catalogs?.items?.items)) {
    if (!baseItem?.weapon || !isSourceAllowed(baseItem, context, character)) {
      continue;
    }

    const variant = findVariantForBaseName(name, baseItem, context, character);
    if (variant) {
      return { baseItem, variant };
    }
  }

  return null;
}

function resolveMagicVariant(item = {}, baseItem = null, context = {}, character = {}) {
  const explicitRef = normalizeString(item.magicVariantRef ?? item.variantRef ?? item.variant?.ref ?? item.magicVariant?.ref);
  const explicitName = normalizeString(item.magicVariantName ?? item.variantName ?? item.variant ?? item.magicVariant);
  const byRef = lookupByRef(context.indexes?.magicVariantsByRef, explicitRef, context, character);
  if (byRef) {
    return byRef;
  }

  if (explicitName) {
    const byName = firstAllowed(context.indexes?.magicVariantsByName.get(normalizeName(explicitName)), context, character);
    if (byName) {
      return byName;
    }
  }

  if (baseItem) {
    return findVariantForBaseName(item.name, baseItem, context, character);
  }

  return null;
}

function findVariantForBaseName(itemName, baseItem, context, character) {
  const normalizedItemName = normalizeName(itemName);
  const baseName = normalizeString(baseItem?.name);
  if (!normalizedItemName || !baseName) {
    return null;
  }

  for (const variant of toArray(context.catalogs?.magicVariants?.magicVariants)) {
    if (!isSourceAllowed(variant, context, character) || !variantMatchesBaseItem(variant, baseItem)) {
      continue;
    }

    const prefix = String(variant.inherits?.namePrefix ?? "");
    const suffix = String(variant.inherits?.nameSuffix ?? "");
    const expected = normalizeName(`${prefix}${baseName}${suffix}`);
    if (expected === normalizedItemName) {
      return variant;
    }
  }

  return null;
}

function variantMatchesBaseItem(variant, baseItem) {
  const requirements = toArray(variant?.requires);
  if (!requirements.length) {
    return true;
  }

  return requirements.some((requirement) => (
    Object.entries(requirement).every(([key, value]) => itemMatchesRequirement(baseItem, key, value))
  ));
}

function itemMatchesRequirement(item, key, value) {
  const normalizedKey = normalizeString(key);
  if (normalizedKey === "type") {
    return normalizeString(item?.type?.code || item?.raw?.type).toUpperCase() === normalizeString(value).toUpperCase();
  }

  if (normalizedKey === "weapon") {
    return Boolean(item?.weapon || item?.tags?.weapon || item?.raw?.weapon);
  }

  if (value === true) {
    return Boolean(item?.tags?.[normalizedKey] || item?.weapon?.tags?.[normalizedKey] || item?.raw?.[normalizedKey]);
  }

  return normalizeString(item?.[normalizedKey] ?? item?.raw?.[normalizedKey]).toLowerCase() === normalizeString(value).toLowerCase();
}

function getAbilityModifier(character, ability) {
  const score = Number(character?.abilities?.[ability]?.score ?? 10);
  return Math.floor((score - 10) / 2);
}

function chooseAttackAbility(weapon = {}, character = {}, override = {}) {
  const explicit = normalizeString(
    override.ability
    ?? override.attackAbility
    ?? override.selectedAbility
    ?? override.attack?.ability
  ).toLowerCase();
  if (["str", "dex", "con", "int", "wis", "cha"].includes(explicit)) {
    return { ability: explicit, reason: "override" };
  }

  const propertyCodes = new Set(getPropertyCodes(weapon));
  if (propertyCodes.has("F")) {
    const str = getAbilityModifier(character, "str");
    const dex = getAbilityModifier(character, "dex");
    return { ability: dex > str ? "dex" : "str", reason: "finesse-best" };
  }

  const typeCode = normalizeString(weapon.typeCode ?? weapon.type?.code).toUpperCase();
  const typeName = normalizeString(weapon.typeName ?? weapon.type?.name).toLowerCase();
  if (typeCode === "R" || typeName.includes("ranged")) {
    return { ability: "dex", reason: "ranged" };
  }

  return { ability: "str", reason: "melee" };
}

function normalizeProficiencyName(value) {
  return slugify(value).replace(/-weapons?$/i, "");
}

function isWeaponProficient(character = {}, itemName, weapon = {}, override = {}) {
  if (override.proficient != null) {
    return Boolean(override.proficient);
  }

  const proficiencies = toArray(character.proficiencies?.weapons)
    .map((entry) => normalizeProficiencyName(entry?.name ?? entry))
    .filter(Boolean);
  const itemKey = normalizeProficiencyName(itemName);
  const categoryKey = normalizeProficiencyName(`${weapon.category || ""} weapons`);

  return proficiencies.includes("all")
    || proficiencies.includes("all-weapons")
    || proficiencies.includes(itemKey)
    || (categoryKey && proficiencies.includes(categoryKey));
}

function collectManualAttackOverrides(character = {}, item = {}, slot = "") {
  const collections = [
    ...ATTACK_COLLECTION_KEYS.flatMap((key) => toArray(character[key])),
    ...toArray(character.combat?.attacks),
    ...toArray(character.inventory?.attacks)
  ];
  const itemName = normalizeName(item?.name);
  const itemRef = stripJsonExtension(item?.ref);
  const slotKey = normalizeName(slot);

  return collections.find((attack) => {
    const attackName = normalizeName(attack.name ?? attack.itemName ?? attack.displayName);
    const attackRef = stripJsonExtension(attack.itemRef ?? attack.ref);
    const attackSlot = normalizeName(attack.slot);
    return (itemName && attackName === itemName)
      || (itemRef && attackRef === itemRef)
      || (slotKey && attackSlot === slotKey);
  }) ?? {};
}

function collectItemOverride(item = {}) {
  return mergeObjects(item.attack, item.attackOverride, item.overrides);
}

function getOverrideFields(override = {}, item = {}) {
  const fields = [];
  const checks = [
    ["ability", override.ability ?? override.attackAbility ?? override.selectedAbility ?? override.attack?.ability],
    ["proficiency", override.proficient],
    ["attack bonus", override.attackBonus ?? override.toHit],
    ["damage bonus", override.damageBonus],
    ["damage dice", override.damageDice],
    ["damage type", override.damageType],
    ["display name", override.displayName],
    ["notes", override.notes],
    ["mode", override.mode ?? item.mode ?? item.equippedMode]
  ];

  for (const [label, value] of checks) {
    if (hasMeaningfulValue(value)) {
      fields.push(label);
    }
  }

  return fields;
}

function formatModifier(value) {
  if (!Number.isFinite(value)) {
    return "+0";
  }

  return value >= 0 ? `+${value}` : `${value}`;
}

function formatFormula(terms, total = null) {
  const body = terms
    .filter((term) => term && (term.always || Number(term.value) !== 0 || term.kind === "dice"))
    .map((term, index) => {
      if (term.kind === "dice") {
        return term.label;
      }

      const sign = Number(term.value) >= 0 ? "+" : "-";
      const amount = Math.abs(Number(term.value));
      const label = term.label ? ` ${term.label}` : "";
      return `${index === 0 && sign === "+" ? "" : `${sign} `}${amount}${label}`;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return total == null ? body : `${body || "0"} = ${formatModifier(total)}`;
}

function createManualAttackCard(item = {}, slot = "", reason = MANUAL_ATTACK_FALLBACK_REASON, override = {}) {
  const attackBonus = override.attackBonus ?? override.toHit ?? "";
  const damage = override.damage ?? override.damageDice ?? "";
  return {
    kind: "manual",
    name: normalizeString(override.displayName ?? override.name ?? item.name ?? "Manual Attack"),
    slot,
    reason,
    attackFormula: attackBonus === "" ? "Manual attack bonus" : `d20 ${formatModifier(Number(attackBonus))}`,
    damageFormula: damage || "Manual damage",
    damageRoll: damage || "Manual damage",
    overriddenFields: getOverrideFields(override, item),
    notes: normalizeString(override.notes ?? item.notes),
    source: normalizeString(item.source)
  };
}

function createResolvedAttackCard(character, item, itemDetail, context, slot, override = {}) {
  const weapon = getWeaponSource(itemDetail);
  if (!weapon?.damage?.primary) {
    return createManualAttackCard(item, slot, "Equipped item has no structured weapon damage.", override);
  }

  const mergedOverride = mergeObjects(collectItemOverride(item), override);
  const abilityChoice = chooseAttackAbility({
    ...weapon,
    type: itemDetail.item?.type ?? itemDetail.baseItem?.type
  }, character, mergedOverride);
  const abilityMod = getAbilityModifier(character, abilityChoice.ability);
  const proficient = isWeaponProficient(character, itemDetail.baseItem?.name || itemDetail.displayName || item.name, weapon, mergedOverride);
  const proficiencyBonus = proficient ? Number(character.proficiencyBonus ?? 0) : 0;
  const magicAttackBonus = parseBonus(weapon.bonuses?.bonusWeaponAttack ?? weapon.bonuses?.bonusWeapon);
  const magicDamageBonus = parseBonus(weapon.bonuses?.bonusWeaponDamage ?? weapon.bonuses?.bonusWeapon);
  const manualAttackBonus = parseBonus(mergedOverride.attackBonus);
  const manualDamageBonus = parseBonus(mergedOverride.damageBonus);
  const attackTotal = abilityMod + proficiencyBonus + magicAttackBonus + manualAttackBonus;
  const damageBonus = abilityMod + magicDamageBonus + manualDamageBonus;
  const mode = normalizeString(mergedOverride.mode ?? item.mode ?? item.equippedMode).toLowerCase();
  const propertyCodes = getPropertyCodes(weapon);
  const hasVersatile = propertyCodes.includes("V") && Boolean(weapon.damage?.versatile);
  const isForcedTwoHanded = propertyCodes.includes("2H");
  const isTwoHandedMode = isForcedTwoHanded || mode.includes("two") || mode === "2h";
  const activeMode = isForcedTwoHanded
    ? "two-hand"
    : isTwoHandedMode
      ? "two-hand"
      : "one-hand";
  const damageDice = normalizeString(
    mergedOverride.damageDice
    ?? (hasVersatile && isTwoHandedMode ? weapon.damage.versatile : weapon.damage?.primary)
  );
  const damageType = normalizeString(mergedOverride.damageType ?? weapon.damage?.type?.name ?? weapon.damage?.type?.code);
  const propertyNames = getPropertyNames(weapon, context);
  const overriddenFields = getOverrideFields(mergedOverride, item);

  return {
    kind: "resolved",
    name: normalizeString(mergedOverride.displayName ?? item.name ?? itemDetail.displayName),
    slot,
    source: normalizeString(itemDetail.variant?.source ?? itemDetail.item?.source ?? itemDetail.baseItem?.source ?? itemDetail.localItem?.source ?? item.source),
    ability: abilityChoice.ability,
    abilityReason: abilityChoice.reason,
    availableAbilities: propertyCodes.includes("F") ? ["str", "dex"] : [abilityChoice.ability],
    supportsFinesse: propertyCodes.includes("F"),
    supportsVersatile: hasVersatile,
    mode: activeMode,
    proficient,
    attackBonus: attackTotal,
    attackFormula: formatFormula([
      { kind: "dice", label: "d20" },
      { value: abilityMod, label: abilityChoice.ability.toUpperCase(), always: true },
      { value: proficiencyBonus, label: "proficiency" },
      { value: magicAttackBonus, label: "magic" },
      { value: manualAttackBonus, label: "manual" }
    ], attackTotal),
    damageRoll: `${damageDice}${damageBonus ? ` ${formatModifier(damageBonus)}` : ""} ${damageType}`.trim(),
    damageFormula: formatFormula([
      { kind: "dice", label: damageDice },
      { value: abilityMod, label: abilityChoice.ability.toUpperCase(), always: true },
      { value: magicDamageBonus, label: "magic" },
      { value: manualDamageBonus, label: "manual" }
    ]),
    damageType,
    range: weapon.range?.raw || [
      weapon.range?.normal,
      weapon.range?.long
    ].filter((value) => value != null).join("/"),
    properties: propertyNames,
    propertyCodes,
    overriddenFields,
    conditionalDamage: [
      ...toArray(itemDetail.baseItem?.conditionalDamage),
      ...toArray(itemDetail.item?.conditionalDamage),
      ...toArray(itemDetail.variant?.inherits?.conditionalDamage)
    ],
    notes: normalizeString(mergedOverride.notes ?? item.notes),
    variantName: itemDetail.variant?.name ?? "",
    ref: itemDetail.item?.ref ?? itemDetail.baseItem?.ref ?? itemDetail.localItem?.ref ?? item.ref
  };
}

function getEquippedCandidateItems(character = {}) {
  const carried = toArray(character.inventory?.carried);
  const equipped = character.inventory?.equipped ?? {};
  const candidates = [];
  const used = new Set();

  for (const [itemIndex, item] of carried.entries()) {
    if (!item.equipped) {
      continue;
    }

    candidates.push({ slot: "", item, itemIndex, fromSlot: false });
    used.add(itemIndex);
  }

  const legacySlots = [
    ["mainHand", equipped.mainHand],
    ["offHand", equipped.offHand]
  ].filter(([, name]) => normalizeString(name));

  for (const [slot, name] of legacySlots) {
    const carriedIndex = carried.findIndex((item) => normalizeName(item.name) === normalizeName(name));
    if (carriedIndex >= 0 && used.has(carriedIndex)) {
      continue;
    }

    const carriedItem = carriedIndex >= 0 ? carried[carriedIndex] : null;
    const item = carriedItem ?? { name, equipped: true };
    candidates.push({ slot, item, itemIndex: carriedIndex, fromSlot: true });
    if (carriedIndex >= 0) {
      used.add(carriedIndex);
    }
  }

  return candidates;
}

function isLikelyWeaponName(value = "") {
  return /\b(axe|blade|bow|club|crossbow|dagger|flail|glaive|halberd|hammer|javelin|lance|mace|pike|rapier|scimitar|sickle|spear|staff|sword|trident|warhammer)\b/i.test(normalizeString(value));
}

export function getEquippedAttackCards(character = {}, context = {}) {
  const cards = [];

  for (const candidate of getEquippedCandidateItems(character)) {
    const itemDetail = resolveItemDetail(candidate.item, context, character);
    const override = collectManualAttackOverrides(character, candidate.item, candidate.slot);
    const weapon = getWeaponSource(itemDetail);

    if (weapon?.damage?.primary) {
      cards.push({
        ...createResolvedAttackCard(character, candidate.item, itemDetail, context, candidate.slot, override),
        itemIndex: candidate.itemIndex
      });
      continue;
    }

    if (!itemDetail.resolved && (candidate.fromSlot || isLikelyWeaponName(candidate.item?.name))) {
      cards.push({
        ...createManualAttackCard(candidate.item, candidate.slot, MANUAL_ATTACK_FALLBACK_REASON, override),
        itemIndex: candidate.itemIndex
      });
    }
  }

  return cards;
}

function formatFlatFormula(terms, total) {
  const body = terms
    .filter((term) => term && (term.always || Number(term.value) !== 0 || term.kind === "dice"))
    .map((term, index) => {
      if (term.kind === "dice") {
        return term.label;
      }

      const value = Number(term.value);
      const sign = value >= 0 ? "+" : "-";
      const amount = Math.abs(value);
      const label = term.label ? ` ${term.label}` : "";
      return `${index === 0 && sign === "+" ? "" : `${sign} `}${amount}${label}`;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return `${body || "0"} = ${total}`;
}

function getActiveModifierAmount(modifier = {}) {
  return modifier?.active === false ? 0 : Number(modifier?.amount ?? 0);
}

function sumActiveModifiers(modifiers = []) {
  return toArray(modifiers).reduce((total, modifier) => total + getActiveModifierAmount(modifier), 0);
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function getNumericOverride(...values) {
  for (const value of values) {
    if (isFiniteNumber(value)) {
      return Number(value);
    }
  }

  return null;
}

function findCarriedItemByName(character = {}, name) {
  const key = normalizeName(name);
  if (!key) {
    return null;
  }

  return toArray(character.inventory?.carried).find((item) => normalizeName(item.name) === key)
    ?? null;
}

function findEquippedArmorItem(character = {}, context = {}) {
  const carriedArmor = toArray(character.inventory?.carried).find((item) => {
    if (!item?.equipped) {
      return false;
    }

    const armor = getArmorSource(resolveItemDetail(item, context, character));
    const typeCode = normalizeString(armor?.type?.code).toUpperCase();
    return Boolean(armor) && typeCode !== "S" && armor.armor !== false;
  });
  if (carriedArmor) {
    return carriedArmor;
  }

  const armorName = normalizeString(character.inventory?.equipped?.armor);
  if (!armorName) {
    return null;
  }

  return findCarriedItemByName(character, armorName) ?? {
    name: armorName,
    equipped: true
  };
}

function findEquippedShieldItem(character = {}) {
  const offHandName = normalizeString(character.inventory?.equipped?.offHand);
  const offHandItem = offHandName
    ? findCarriedItemByName(character, offHandName) ?? { name: offHandName, equipped: true }
    : null;
  if (offHandItem && normalizeName(offHandItem.name).includes("shield")) {
    return offHandItem;
  }

  return toArray(character.inventory?.carried).find((item) => (
    item.equipped
    && normalizeName(item.name).includes("shield")
  )) ?? null;
}

function getArmorDexTerm(armor = {}, character = {}) {
  const dexModifier = getAbilityModifier(character, "dex");
  const typeCode = normalizeString(armor.type?.code).toUpperCase();
  const typeName = normalizeString(armor.type?.name).toLowerCase();

  if (!armor || !Object.keys(armor).length) {
    return {
      value: dexModifier,
      label: "DEX"
    };
  }

  if (typeCode === "LA" || typeName.includes("light armor")) {
    return {
      value: dexModifier,
      label: "DEX"
    };
  }

  if (typeCode === "MA" || typeName.includes("medium armor")) {
    return {
      value: Math.min(dexModifier, 2),
      label: dexModifier > 2 ? "DEX max 2" : "DEX"
    };
  }

  return null;
}

function getArmorBonus(armor = {}) {
  return parseBonus(armor.bonusAc ?? armor.bonuses?.bonusAc);
}

function shouldSkipAcModifier(modifier = {}, armorName = "", shieldName = "") {
  const source = normalizeName(modifier.source);
  const name = normalizeName(modifier.name);
  const conditional = normalizeName(modifier.conditional);
  const combined = `${source} ${name} ${conditional}`;
  const armorKey = normalizeName(armorName);
  const shieldKey = normalizeName(shieldName);

  return combined.includes("ability-dex")
    || combined.includes("dexterity")
    || (shieldKey && combined.includes("shield"))
    || (armorKey && combined.includes(armorKey))
    || combined.includes("already folded");
}

export function getArmorClassBreakdown(character = {}, context = {}) {
  const armorItem = findEquippedArmorItem(character, context);
  const shieldItem = findEquippedShieldItem(character);
  const armorDetail = armorItem ? resolveItemDetail(armorItem, context, character) : null;
  const shieldDetail = shieldItem ? resolveItemDetail(shieldItem, context, character) : null;
  const armor = armorDetail ? getArmorSource(armorDetail) : null;
  const shield = shieldDetail ? getArmorSource(shieldDetail) : null;
  const armorName = armorItem?.name ?? "";
  const shieldName = shieldItem?.name ?? "";
  const storedValue = Number(character.ac?.value ?? character.ac?.base ?? 10);

  if (armorItem && !armor) {
    return {
      value: storedValue,
      storedValue,
      computedValue: null,
      formula: `Stored AC ${storedValue}`,
      terms: [],
      armorName,
      shieldName,
      manual: true,
      overridden: true,
      note: "Equipped armor needs manual AC confirmation."
    };
  }

  const terms = [];
  const baseArmorValue = armor ? Number(armor.ac ?? 10) : 10;
  terms.push({
    value: baseArmorValue,
    label: armorName || "base",
    always: true
  });

  const dexTerm = getArmorDexTerm(armor ?? {}, character);
  if (dexTerm) {
    terms.push(dexTerm);
  }

  const armorBonus = armor ? getArmorBonus(armor) : 0;
  if (armorBonus) {
    terms.push({
      value: armorBonus,
      label: `${armorName || "armor"} magic`
    });
  }

  if (shield) {
    const shieldValue = Number(shield.ac ?? 0) + getArmorBonus(shield);
    terms.push({
      value: shieldValue,
      label: shieldName || "shield"
    });
  } else if (shieldItem) {
    return {
      value: storedValue,
      storedValue,
      computedValue: null,
      formula: `Stored AC ${storedValue}`,
      terms: [],
      armorName,
      shieldName,
      manual: true,
      overridden: true,
      note: "Equipped shield needs manual AC confirmation."
    };
  }

  for (const modifier of toArray(character.ac?.modifiers)) {
    const amount = getActiveModifierAmount(modifier);
    if (!amount || shouldSkipAcModifier(modifier, armorName, shieldName)) {
      continue;
    }

    terms.push({
      value: amount,
      label: modifier.name || modifier.source || "modifier"
    });
  }

  const computedValue = terms.reduce((total, term) => total + Number(term.value ?? 0), 0);
  return {
    value: storedValue,
    storedValue,
    computedValue,
    formula: formatFlatFormula(terms, computedValue),
    terms,
    armorName,
    shieldName,
    manual: false,
    overridden: Number.isFinite(storedValue) && storedValue !== computedValue,
    note: Number.isFinite(storedValue) && storedValue !== computedValue
      ? `Stored AC ${storedValue} differs from computed ${computedValue}.`
      : ""
  };
}

export function getSavingThrowCards(character = {}) {
  const proficiencyBonus = Number(character.proficiencyBonus ?? 0);
  return ABILITY_ORDER.map((ability) => {
    const entry = character.abilities?.[ability] ?? {};
    const abilityModifier = getAbilityModifier(character, ability);
    const proficient = Boolean(entry.savingThrow?.proficient);
    const proficiency = proficient ? proficiencyBonus : 0;
    const manualBonus = sumActiveModifiers(entry.savingThrow?.modifiers);
    const computed = abilityModifier + proficiency + manualBonus;
    const override = getNumericOverride(entry.savingThrow?.total, entry.savingThrow?.value);
    const total = override ?? computed;

    return {
      ability,
      label: ABILITY_LABELS[ability],
      total,
      computed,
      proficient,
      passive: 10 + total,
      formula: formatFormula([
        { value: abilityModifier, label: ability.toUpperCase(), always: true },
        { value: proficiency, label: "proficiency" },
        { value: manualBonus, label: "manual" }
      ], computed),
      overridden: override != null && override !== computed,
      source: entry.savingThrow?.grantedBy ?? ""
    };
  });
}

export function getSkillCards(character = {}) {
  const proficiencyBonus = Number(character.proficiencyBonus ?? 0);
  return Object.entries(SKILL_TO_ABILITY).map(([skill, ability]) => {
    const entry = character.skills?.[skill] ?? {};
    const abilityModifier = getAbilityModifier(character, ability);
    const proficient = Boolean(entry.proficient);
    const expertise = Boolean(entry.expertise);
    const proficiency = proficient ? proficiencyBonus : 0;
    const expertiseBonus = expertise ? proficiencyBonus : 0;
    const manualBonus = sumActiveModifiers(entry.modifiers);
    const computed = abilityModifier + proficiency + expertiseBonus + manualBonus;
    const override = getNumericOverride(entry.total, entry.value);
    const total = override ?? computed;
    const passiveBonus = Number(entry.passiveBonus ?? 0);
    const passive = Number(entry.passive ?? (10 + total + passiveBonus));

    return {
      skill,
      label: titleCase(skill),
      ability,
      abilityLabel: ABILITY_LABELS[ability],
      total,
      computed,
      passive,
      proficient,
      expertise,
      formula: formatFormula([
        { value: abilityModifier, label: ability.toUpperCase(), always: true },
        { value: proficiency, label: "proficiency" },
        { value: expertiseBonus, label: "expertise" },
        { value: manualBonus, label: "manual" }
      ], computed),
      overridden: override != null && override !== computed,
      source: entry.source ?? ""
    };
  });
}

export function getSpellcastingMath(character = {}, spellcasting = {}) {
  const ability = normalizeString(spellcasting.ability).toLowerCase();
  if (!ABILITY_ORDER.includes(ability)) {
    return {
      ability,
      spellAttackBonus: null,
      spellSaveDc: null,
      attackFormula: "Manual spell attack",
      saveFormula: "Manual spell save DC",
      attackOverridden: Boolean(spellcasting.spellAttackBonus),
      saveOverridden: Boolean(spellcasting.spellSaveDc)
    };
  }

  const abilityModifier = getAbilityModifier(character, ability);
  const proficiencyBonus = Number(character.proficiencyBonus ?? 0);
  const attackManualBonus = sumActiveModifiers(spellcasting.attackModifiers);
  const saveManualBonus = sumActiveModifiers(spellcasting.saveDcModifiers);
  const computedAttack = abilityModifier + proficiencyBonus + attackManualBonus;
  const computedSave = 8 + abilityModifier + proficiencyBonus + saveManualBonus;
  const storedAttack = getNumericOverride(spellcasting.spellAttackBonus);
  const storedSave = getNumericOverride(spellcasting.spellSaveDc);

  return {
    ability,
    abilityModifier,
    proficiencyBonus,
    spellAttackBonus: storedAttack ?? computedAttack,
    spellSaveDc: storedSave ?? computedSave,
    computedAttack,
    computedSave,
    attackFormula: formatFormula([
      { value: abilityModifier, label: ability.toUpperCase(), always: true },
      { value: proficiencyBonus, label: "proficiency" },
      { value: attackManualBonus, label: "manual" }
    ], computedAttack),
    saveFormula: formatFlatFormula([
      { value: 8, label: "base", always: true },
      { value: abilityModifier, label: ability.toUpperCase(), always: true },
      { value: proficiencyBonus, label: "proficiency" },
      { value: saveManualBonus, label: "manual" }
    ], computedSave),
    attackOverridden: storedAttack != null && storedAttack !== computedAttack,
    saveOverridden: storedSave != null && storedSave !== computedSave
  };
}

export function formatSpellLevel(level) {
  if (level === 0) {
    return "cantrip";
  }

  if (!Number.isFinite(Number(level))) {
    return "";
  }

  const value = Number(level);
  const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
  return `${value}${suffix}`;
}

export function getCatalogTextSummary(detail = {}) {
  return [
    detail.level ? `L${detail.level}` : null,
    detail.className,
    detail.subclassShortName,
    detail.parentName && !detail.className ? detail.parentName : null,
    detail.source
  ].filter(Boolean).join(" | ");
}
