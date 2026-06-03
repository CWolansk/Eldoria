function makeActionResult(patch = {}) {
  return {
    ok: false,
    action: "",
    reason: "",
    snapshot: null,
    ...patch
  };
}

function hasModel(model) {
  return model && typeof model.setValue === "function";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toPositiveAmount(value, fallback = 1) {
  return Math.max(0, Math.trunc(Math.abs(toNumber(value, fallback))));
}

function clamp(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const number = Math.trunc(toNumber(value, min));
  return Math.min(Math.max(number, min), max);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

const CURRENCY_COINS = new Set(["cp", "sp", "ep", "gp", "pp"]);
const CURRENCY_COPPER_VALUES = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000
};

function normalizeCoin(value) {
  const coin = normalizeText(value).toLowerCase();
  return CURRENCY_COINS.has(coin) ? coin : "";
}

function getCurrencyCopperValue(currency = {}) {
  return Object.entries(CURRENCY_COPPER_VALUES).reduce((total, [coin, copperValue]) => (
    total + (Math.max(0, toNumber(currency?.[coin], 0)) * copperValue)
  ), 0);
}

function copperToCurrency(totalCopper) {
  let remaining = Math.max(0, Math.trunc(toNumber(totalCopper, 0)));
  const currency = {};

  for (const coin of ["pp", "gp", "ep", "sp", "cp"]) {
    const copperValue = CURRENCY_COPPER_VALUES[coin];
    currency[coin] = Math.floor(remaining / copperValue);
    remaining %= copperValue;
  }

  return currency;
}

function normalizeAbility(value) {
  const ability = normalizeText(value).toLowerCase();
  return ["str", "dex", "con", "int", "wis", "cha"].includes(ability) ? ability : "";
}

function normalizeAttackMode(value) {
  const mode = normalizeText(value).toLowerCase();
  if (["two-hand", "two-handed", "2h"].includes(mode)) {
    return "two-hand";
  }

  if (["one-hand", "one-handed", "1h"].includes(mode)) {
    return "one-hand";
  }

  return "";
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (["true", "1", "yes", "on", "equipped", "attuned"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off", "unequipped", "unattuned"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function removeEmptyObjectValues(object = {}) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value == null || value === "") {
        return false;
      }

      if (isObject(value)) {
        return Object.keys(removeEmptyObjectValues(value)).length > 0;
      }

      return true;
    })
  );
}

function getHpMax(character = {}) {
  return Math.max(0, toNumber(character.hp?.max ?? character.hp?.base, 0));
}

function getResourceLimit(resource = {}) {
  return Math.max(0, toNumber(resource.max, 0));
}

function canTrackResource(resource = {}) {
  return ["counter", "pool"].includes(String(resource.kind ?? "")) && Number.isFinite(Number(resource.max));
}

function getRechargeText(entry = {}) {
  return String(entry.recharge ?? "").toLowerCase();
}

function rechargesOn(entry, restKind) {
  const recharge = getRechargeText(entry);
  if (!recharge) {
    return false;
  }

  return restKind === "short"
    ? recharge.includes("short")
    : recharge.includes("long");
}

function updateArrayEntry(model, path, index, updater, action) {
  if (!hasModel(model)) {
    return makeActionResult({
      action,
      reason: "missing-character-model"
    });
  }

  const entries = toArray(path.reduce((current, part) => current?.[part], model.data));
  const numericIndex = Number(index);
  if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= entries.length) {
    return makeActionResult({
      action,
      reason: "invalid-index"
    });
  }

  const nextEntries = entries.map((entry, entryIndex) => (
    entryIndex === numericIndex ? updater({ ...entry }) : entry
  ));
  model.setValue(path, nextEntries);
  return makeActionResult({
    ok: true,
    action,
    reason: "updated",
    snapshot: model.data
  });
}

/**
 * Shared primitive for sheet-owned table-state edits.
 * Later phases should build HP, death-save, resource, slot, and inventory
 * helpers on this function so mutations keep flowing through CharacterModel.
 */
export function patchCharacterModel(model, path, value) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "patch",
      reason: "missing-character-model"
    });
  }

  model.setValue(path, value);
  return makeActionResult({
    ok: true,
    action: "patch",
    reason: "patched",
    snapshot: model.data
  });
}

export function syncCurrentHpToMax(model) {
  if (!model || typeof model.syncCurrentHpToMax !== "function") {
    return makeActionResult({
      action: "sync-current-hp",
      reason: "missing-character-model"
    });
  }

  model.syncCurrentHpToMax();
  return makeActionResult({
    ok: true,
    action: "sync-current-hp",
    reason: "synced",
    snapshot: model.data
  });
}

export function applyHpDamage(model, amount) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "hp-damage",
      reason: "missing-character-model"
    });
  }

  const damage = toPositiveAmount(amount);
  const hp = model.data.hp ?? {};
  const temp = Math.max(0, toNumber(hp.temp, 0));
  const current = clamp(hp.current, 0, getHpMax(model.data));
  const absorbed = Math.min(temp, damage);
  const remainingDamage = Math.max(0, damage - absorbed);

  model.setValue(["hp"], {
    ...hp,
    temp: temp - absorbed,
    current: Math.max(0, current - remainingDamage)
  });

  return makeActionResult({
    ok: true,
    action: "hp-damage",
    reason: "damaged",
    snapshot: model.data
  });
}

export function applyHpHealing(model, amount) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "hp-heal",
      reason: "missing-character-model"
    });
  }

  const healing = toPositiveAmount(amount);
  const hp = model.data.hp ?? {};
  model.setValue(["hp", "current"], clamp(toNumber(hp.current, 0) + healing, 0, getHpMax(model.data)));

  return makeActionResult({
    ok: true,
    action: "hp-heal",
    reason: "healed",
    snapshot: model.data
  });
}

export function setTemporaryHp(model, amount) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "hp-temp",
      reason: "missing-character-model"
    });
  }

  model.setValue(["hp", "temp"], toPositiveAmount(amount, 0));
  return makeActionResult({
    ok: true,
    action: "hp-temp",
    reason: "temp-hp-set",
    snapshot: model.data
  });
}

export function updateDeathSave(model, track, delta) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "death-save",
      reason: "missing-character-model"
    });
  }

  const key = track === "failures" ? "failures" : "successes";
  const current = toNumber(model.data.deathSaves?.[key], 0);
  model.setValue(["deathSaves", key], clamp(current + toNumber(delta, 0), 0, 3));
  return makeActionResult({
    ok: true,
    action: "death-save",
    reason: "updated",
    snapshot: model.data
  });
}

export function resetDeathSaves(model) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "death-save-reset",
      reason: "missing-character-model"
    });
  }

  model.setValue(["deathSaves"], {
    successes: 0,
    failures: 0
  });
  return makeActionResult({
    ok: true,
    action: "death-save-reset",
    reason: "reset",
    snapshot: model.data
  });
}

export function toggleInspiration(model) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "inspiration-toggle",
      reason: "missing-character-model"
    });
  }

  model.setValue(["identity", "inspiration"], !Boolean(model.data.identity?.inspiration));
  return makeActionResult({
    ok: true,
    action: "inspiration-toggle",
    reason: "toggled",
    snapshot: model.data
  });
}

export function adjustHitDie(model, index, delta) {
  return updateArrayEntry(model, ["hitDice"], index, (hitDie) => ({
    ...hitDie,
    remaining: clamp(toNumber(hitDie.remaining, 0) + toNumber(delta, 0), 0, toNumber(hitDie.total, 0))
  }), "hit-die-adjust");
}

export function resetHitDie(model, index) {
  return updateArrayEntry(model, ["hitDice"], index, (hitDie) => ({
    ...hitDie,
    remaining: Math.max(0, toNumber(hitDie.total, 0))
  }), "hit-die-reset");
}

export function adjustResource(model, index, delta) {
  return updateArrayEntry(model, ["resources"], index, (resource) => {
    if (!canTrackResource(resource)) {
      return resource;
    }

    return {
      ...resource,
      current: clamp(toNumber(resource.current, 0) + toNumber(delta, 0), 0, getResourceLimit(resource))
    };
  }, "resource-adjust");
}

export function resetResource(model, index) {
  return updateArrayEntry(model, ["resources"], index, (resource) => {
    if (!canTrackResource(resource)) {
      return resource;
    }

    return {
      ...resource,
      current: getResourceLimit(resource)
    };
  }, "resource-reset");
}

export function adjustSpellSlot(model, level, delta) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "spell-slot-adjust",
      reason: "missing-character-model"
    });
  }

  const slotLevel = normalizeText(level);
  const slot = model.data.spellSlots?.byLevel?.[slotLevel];
  if (!slot) {
    return makeActionResult({
      action: "spell-slot-adjust",
      reason: "missing-spell-slot"
    });
  }

  const max = Math.max(0, toNumber(slot.max, 0));
  model.setValue(
    ["spellSlots", "byLevel", slotLevel, "expended"],
    clamp(toNumber(slot.expended, 0) + toNumber(delta, 0), 0, max)
  );

  return makeActionResult({
    ok: true,
    action: "spell-slot-adjust",
    reason: "updated",
    snapshot: model.data
  });
}

export function resetSpellSlot(model, level) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "spell-slot-reset",
      reason: "missing-character-model"
    });
  }

  const slotLevel = normalizeText(level);
  const slot = model.data.spellSlots?.byLevel?.[slotLevel];
  if (!slot) {
    return makeActionResult({
      action: "spell-slot-reset",
      reason: "missing-spell-slot"
    });
  }

  model.setValue(["spellSlots", "byLevel", slotLevel, "expended"], 0);
  return makeActionResult({
    ok: true,
    action: "spell-slot-reset",
    reason: "reset",
    snapshot: model.data
  });
}

function getSpellName(value = {}) {
  return typeof value === "string"
    ? normalizeText(value)
    : normalizeText(value.name ?? value.spell);
}

function getSpellKey(value = {}) {
  return getSpellName(value).toLowerCase();
}

function normalizeSpellLevel(value) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  if (/^cantrip$/i.test(text)) {
    return 0;
  }

  const number = Number(text);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function normalizeSpellPayload(payload = {}) {
  const name = normalizeText(payload.name ?? payload.spell);
  if (!name) {
    return {
      ok: false,
      reason: "missing-spell-name",
      spell: null
    };
  }

  const level = normalizeSpellLevel(payload.spellLevel ?? payload.level);
  return {
    ok: true,
    reason: "normalized",
    spell: removeEmptyObjectValues({
      ref: normalizeText(payload.ref),
      name,
      source: normalizeText(payload.source),
      level,
      school: normalizeText(payload.school)
    })
  };
}

function getClassSpellcasting(model, classIndex) {
  const classes = toArray(model.data.classes);
  const requestedIndex = Number(classIndex);
  if (
    Number.isInteger(requestedIndex)
    && requestedIndex >= 0
    && requestedIndex < classes.length
    && classes[requestedIndex]?.spellcasting
  ) {
    return {
      ok: true,
      index: requestedIndex,
      spellcasting: classes[requestedIndex].spellcasting
    };
  }

  const fallbackIndex = classes.findIndex((entry) => entry?.spellcasting);
  if (fallbackIndex >= 0) {
    return {
      ok: true,
      index: fallbackIndex,
      spellcasting: classes[fallbackIndex].spellcasting
    };
  }

  return {
    ok: false,
    reason: "missing-class-spellcasting",
    index: -1,
    spellcasting: null
  };
}

function getDefaultSpellPoolType(spellcasting = {}) {
  if (spellcasting.spellPool?.type) {
    return spellcasting.spellPool.type;
  }

  return spellcasting.preparationStyle === "spells-known" ? "known-list" : "spellbook";
}

function listHasSpell(entries = [], spellName) {
  const key = normalizeText(spellName).toLowerCase();
  return toArray(entries).some((entry) => getSpellKey(entry) === key);
}

function updateClassSpellcasting(model, classIndex, action, updater) {
  if (!hasModel(model)) {
    return makeActionResult({
      action,
      reason: "missing-character-model"
    });
  }

  const resolved = getClassSpellcasting(model, classIndex);
  if (!resolved.ok) {
    return makeActionResult({
      action,
      reason: resolved.reason
    });
  }

  const update = updater(resolved.spellcasting);
  if (!update.ok) {
    return makeActionResult({
      action,
      reason: update.reason,
      snapshot: model.data
    });
  }

  model.setValue(["classes", resolved.index, "spellcasting"], update.spellcasting);
  return makeActionResult({
    ok: true,
    action,
    reason: update.reason,
    classIndex: resolved.index,
    spell: update.spell,
    snapshot: model.data
  });
}

export function addSpellToClass(model, payload = {}) {
  const normalized = normalizeSpellPayload(payload);
  if (!normalized.ok) {
    return makeActionResult({
      action: "spell-add",
      reason: normalized.reason
    });
  }

  const targetList = normalizeText(payload.list).toLowerCase();
  return updateClassSpellcasting(model, payload.classIndex, "spell-add", (spellcasting) => {
    const spellName = normalized.spell.name;
    if (targetList === "cantrips" || targetList === "cantrip") {
      const cantrips = toArray(spellcasting.cantrips);
      if (listHasSpell(cantrips, spellName)) {
        return { ok: false, reason: "spell-already-present" };
      }

      return {
        ok: true,
        reason: "added-cantrip",
        spell: normalized.spell,
        spellcasting: {
          ...spellcasting,
          cantrips: [...cantrips, spellName]
        }
      };
    }

    if (targetList === "prepared" || targetList === "preparedspells") {
      const preparedSpells = toArray(spellcasting.preparedSpells);
      if (spellcasting.preparedSpells == null && spellcasting.preparationStyle === "spells-known") {
        return { ok: false, reason: "prepared-list-unavailable" };
      }

      if (listHasSpell(preparedSpells, spellName)) {
        return { ok: false, reason: "spell-already-prepared" };
      }

      return {
        ok: true,
        reason: "added-prepared",
        spell: normalized.spell,
        spellcasting: {
          ...spellcasting,
          preparedSpells: [...preparedSpells, spellName]
        }
      };
    }

    const spellPool = {
      type: getDefaultSpellPoolType(spellcasting),
      entries: toArray(spellcasting.spellPool?.entries)
    };
    if (listHasSpell(spellPool.entries, spellName)) {
      return { ok: false, reason: "spell-already-present" };
    }

    return {
      ok: true,
      reason: "added-spell-pool",
      spell: normalized.spell,
      spellcasting: {
        ...spellcasting,
        spellPool: {
          ...spellPool,
          entries: [...spellPool.entries, normalized.spell]
        }
      }
    };
  });
}

export function prepareSpell(model, payload = {}) {
  const normalized = normalizeSpellPayload(payload);
  if (!normalized.ok) {
    return makeActionResult({
      action: "spell-prepare",
      reason: normalized.reason
    });
  }

  return updateClassSpellcasting(model, payload.classIndex, "spell-prepare", (spellcasting) => {
    if (spellcasting.preparedSpells == null && spellcasting.preparationStyle === "spells-known") {
      return { ok: false, reason: "prepared-list-unavailable" };
    }

    const preparedSpells = toArray(spellcasting.preparedSpells);
    if (listHasSpell(preparedSpells, normalized.spell.name)) {
      return { ok: false, reason: "spell-already-prepared" };
    }

    return {
      ok: true,
      reason: "prepared",
      spell: normalized.spell,
      spellcasting: {
        ...spellcasting,
        preparedSpells: [...preparedSpells, normalized.spell.name]
      }
    };
  });
}

export function unprepareSpell(model, payload = {}) {
  const spellName = normalizeText(payload.name ?? payload.spell);
  if (!spellName) {
    return makeActionResult({
      action: "spell-unprepare",
      reason: "missing-spell-name"
    });
  }

  return updateClassSpellcasting(model, payload.classIndex, "spell-unprepare", (spellcasting) => {
    if (!Array.isArray(spellcasting.preparedSpells)) {
      return { ok: false, reason: "prepared-list-unavailable" };
    }

    const key = spellName.toLowerCase();
    const nextPrepared = spellcasting.preparedSpells.filter((entry) => getSpellKey(entry) !== key);
    if (nextPrepared.length === spellcasting.preparedSpells.length) {
      return { ok: false, reason: "spell-not-prepared" };
    }

    return {
      ok: true,
      reason: "unprepared",
      spell: { name: spellName },
      spellcasting: {
        ...spellcasting,
        preparedSpells: nextPrepared
      }
    };
  });
}

export function setCurrencyAmount(model, coin, amount) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "currency-set",
      reason: "missing-character-model"
    });
  }

  const normalizedCoin = normalizeCoin(coin);
  if (!normalizedCoin) {
    return makeActionResult({
      action: "currency-set",
      reason: "invalid-currency-coin"
    });
  }

  model.setValue(["inventory", "currency", normalizedCoin], clamp(amount, 0));
  return makeActionResult({
    ok: true,
    action: "currency-set",
    reason: "updated",
    snapshot: model.data
  });
}

export function adjustCurrencyAmount(model, coin, delta) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "currency-adjust",
      reason: "missing-character-model"
    });
  }

  const normalizedCoin = normalizeCoin(coin);
  if (!normalizedCoin) {
    return makeActionResult({
      action: "currency-adjust",
      reason: "invalid-currency-coin"
    });
  }

  const current = toNumber(model.data.inventory?.currency?.[normalizedCoin], 0);
  model.setValue(["inventory", "currency", normalizedCoin], clamp(current + toNumber(delta, 0), 0));
  return makeActionResult({
    ok: true,
    action: "currency-adjust",
    reason: "updated",
    snapshot: model.data
  });
}

function toInventoryQuantity(value) {
  return Math.max(1, Math.trunc(Math.abs(toNumber(value, 1))));
}

function normalizeInventoryItemPayload(payload = {}) {
  const name = normalizeText(payload.name);
  const ref = normalizeText(payload.ref);
  const source = normalizeText(payload.source);
  const notes = normalizeText(payload.notes);
  const quantity = toInventoryQuantity(payload.quantity ?? payload.amount);

  if (!name) {
    return {
      ok: false,
      reason: "missing-inventory-item-name",
      item: null,
      quantity
    };
  }

  return {
    ok: true,
    reason: "normalized",
    item: removeEmptyObjectValues({
      ref,
      name,
      source,
      quantity,
      equipped: false,
      attunement: false,
      notes
    }),
    quantity
  };
}

function appendInventoryItem(model, item) {
  const carried = toArray(model.data.inventory?.carried);
  model.setValue(["inventory", "carried"], [...carried, item]);
}

function getManualPriceCopper(payload = {}) {
  const rawPrice = normalizeText(payload.price ?? payload.priceOverride);
  if (!rawPrice) {
    return null;
  }

  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price < 0) {
    return null;
  }

  const coin = normalizeCoin(payload.priceCoin ?? payload.coin) || "gp";
  return Math.round(price * CURRENCY_COPPER_VALUES[coin]);
}

function getCatalogPriceCopper(payload = {}) {
  const price = Number(payload.priceCp ?? payload.valueCp);
  return Number.isFinite(price) && price >= 0
    ? Math.trunc(price)
    : null;
}

export function addInventoryItem(model, payload = {}) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "inventory-add-item",
      reason: "missing-character-model"
    });
  }

  const normalized = normalizeInventoryItemPayload(payload);
  if (!normalized.ok) {
    return makeActionResult({
      action: "inventory-add-item",
      reason: normalized.reason
    });
  }

  appendInventoryItem(model, normalized.item);
  return makeActionResult({
    ok: true,
    action: "inventory-add-item",
    reason: "added",
    item: normalized.item,
    snapshot: model.data
  });
}

export function buyInventoryItem(model, payload = {}) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "inventory-buy-item",
      reason: "missing-character-model"
    });
  }

  const normalized = normalizeInventoryItemPayload(payload);
  if (!normalized.ok) {
    return makeActionResult({
      action: "inventory-buy-item",
      reason: normalized.reason
    });
  }

  const unitPriceCopper = getManualPriceCopper(payload) ?? getCatalogPriceCopper(payload);
  if (unitPriceCopper == null) {
    return makeActionResult({
      action: "inventory-buy-item",
      reason: "missing-item-price",
      snapshot: model.data
    });
  }

  const totalPriceCopper = unitPriceCopper * normalized.quantity;
  const currentCopper = getCurrencyCopperValue(model.data.inventory?.currency);
  if (totalPriceCopper > currentCopper) {
    return makeActionResult({
      action: "inventory-buy-item",
      reason: "insufficient-funds",
      priceCp: totalPriceCopper,
      availableCp: currentCopper,
      snapshot: model.data
    });
  }

  appendInventoryItem(model, normalized.item);
  model.setValue(["inventory", "currency"], copperToCurrency(currentCopper - totalPriceCopper));
  return makeActionResult({
    ok: true,
    action: "inventory-buy-item",
    reason: "bought",
    item: normalized.item,
    priceCp: totalPriceCopper,
    snapshot: model.data
  });
}

export function setInventoryItemQuantity(model, index, quantity) {
  return updateArrayEntry(model, ["inventory", "carried"], index, (item) => ({
    ...item,
    quantity: clamp(quantity, 0)
  }), "inventory-quantity-set");
}

export function adjustInventoryItemQuantity(model, index, delta) {
  return updateArrayEntry(model, ["inventory", "carried"], index, (item) => ({
    ...item,
    quantity: clamp(toNumber(item.quantity, 1) + toNumber(delta, 0), 0)
  }), "inventory-quantity-adjust");
}

export function setInventoryItemEquipped(model, index, equipped) {
  return updateArrayEntry(model, ["inventory", "carried"], index, (item) => ({
    ...item,
    equipped: parseBoolean(equipped, !Boolean(item.equipped))
  }), "inventory-equipped-set");
}

export function toggleInventoryItemAttunement(model, index) {
  return updateArrayEntry(model, ["inventory", "carried"], index, (item) => ({
    ...item,
    attunement: !Boolean(item.attunement)
  }), "inventory-attunement-toggle");
}

function updateAttackOverride(model, index, patch, action) {
  if (!hasModel(model)) {
    return makeActionResult({
      action,
      reason: "missing-character-model"
    });
  }

  const carried = toArray(model.data.inventory?.carried);
  const numericIndex = Number(index);
  if (!Number.isInteger(numericIndex) || numericIndex < 0 || numericIndex >= carried.length) {
    return makeActionResult({
      action,
      reason: "invalid-index"
    });
  }

  const nextCarried = carried.map((item, itemIndex) => {
    if (itemIndex !== numericIndex) {
      return item;
    }

    const nextItem = { ...item };
    const nextOverride = {
      ...(isObject(item.attackOverride) ? item.attackOverride : {})
    };

    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") {
        delete nextOverride[key];
      } else {
        nextOverride[key] = value;
      }
    }

    const cleanedOverride = removeEmptyObjectValues(nextOverride);
    if (Object.keys(cleanedOverride).length) {
      nextItem.attackOverride = cleanedOverride;
    } else {
      delete nextItem.attackOverride;
    }

    return nextItem;
  });

  model.setValue(["inventory", "carried"], nextCarried);
  return makeActionResult({
    ok: true,
    action,
    reason: "updated",
    snapshot: model.data
  });
}

export function setAttackMode(model, index, mode) {
  return updateAttackOverride(model, index, {
    mode: normalizeAttackMode(mode)
  }, "attack-mode-set");
}

export function setAttackAbility(model, index, ability) {
  return updateAttackOverride(model, index, {
    ability: normalizeAbility(ability)
  }, "attack-ability-set");
}

export function setAttackProficiency(model, index, proficient) {
  const value = normalizeText(proficient).toLowerCase();
  const parsed = value === "auto" || value === ""
    ? ""
    : ["true", "1", "yes", "on"].includes(value);
  return updateAttackOverride(model, index, {
    proficient: parsed
  }, "attack-proficiency-set");
}

function resetRestResources(resources = [], restKind) {
  return toArray(resources).map((resource) => {
    if (!canTrackResource(resource) || !rechargesOn(resource, restKind)) {
      return resource;
    }

    return {
      ...resource,
      current: getResourceLimit(resource)
    };
  });
}

function resetRestSpellSlots(spellSlots, restKind) {
  const byLevel = spellSlots?.byLevel;
  if (!byLevel || typeof byLevel !== "object") {
    return spellSlots ?? null;
  }

  return {
    ...spellSlots,
    byLevel: Object.fromEntries(Object.entries(byLevel).map(([level, slot]) => [
      level,
      rechargesOn(slot, restKind)
        ? { ...slot, expended: 0 }
        : slot
    ]))
  };
}

export function applyShortRest(model) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "short-rest",
      reason: "missing-character-model"
    });
  }

  model.setValue(["resources"], resetRestResources(model.data.resources, "short"));
  if (model.data.spellSlots) {
    model.setValue(["spellSlots"], resetRestSpellSlots(model.data.spellSlots, "short"));
  }

  return makeActionResult({
    ok: true,
    action: "short-rest",
    reason: "reset-short-rest",
    snapshot: model.data
  });
}

export function applyLongRest(model) {
  if (!hasModel(model)) {
    return makeActionResult({
      action: "long-rest",
      reason: "missing-character-model"
    });
  }

  model.setValue(["hp", "current"], getHpMax(model.data));
  model.setValue(["hp", "temp"], 0);
  model.setValue(["deathSaves"], {
    successes: 0,
    failures: 0
  });
  model.setValue(["resources"], resetRestResources(model.data.resources, "long"));
  if (model.data.spellSlots) {
    model.setValue(["spellSlots"], resetRestSpellSlots(model.data.spellSlots, "long"));
  }

  return makeActionResult({
    ok: true,
    action: "long-rest",
    reason: "reset-long-rest",
    snapshot: model.data
  });
}

export function applyTableStateAction(model, action, payload = {}) {
  switch (action) {
    case "hp-damage":
      return applyHpDamage(model, payload.amount);
    case "hp-heal":
      return applyHpHealing(model, payload.amount);
    case "hp-temp":
      return setTemporaryHp(model, payload.amount);
    case "hp-sync-max":
      return syncCurrentHpToMax(model);
    case "death-save-success":
      return updateDeathSave(model, "successes", payload.delta);
    case "death-save-failure":
      return updateDeathSave(model, "failures", payload.delta);
    case "death-save-reset":
      return resetDeathSaves(model);
    case "inspiration-toggle":
      return toggleInspiration(model);
    case "hit-die-adjust":
      return adjustHitDie(model, payload.index, payload.delta);
    case "hit-die-reset":
      return resetHitDie(model, payload.index);
    case "resource-adjust":
      return adjustResource(model, payload.index, payload.delta);
    case "resource-reset":
      return resetResource(model, payload.index);
    case "spell-slot-spend":
      return adjustSpellSlot(model, payload.level, toPositiveAmount(payload.amount));
    case "spell-slot-restore":
      return adjustSpellSlot(model, payload.level, -toPositiveAmount(payload.amount));
    case "spell-slot-reset":
      return resetSpellSlot(model, payload.level);
    case "spell-add":
      return addSpellToClass(model, payload);
    case "spell-prepare":
      return prepareSpell(model, payload);
    case "spell-unprepare":
      return unprepareSpell(model, payload);
    case "currency-set":
      return setCurrencyAmount(model, payload.coin, payload.amount);
    case "currency-adjust":
      return adjustCurrencyAmount(model, payload.coin, payload.delta);
    case "inventory-add-item":
      return addInventoryItem(model, payload);
    case "inventory-buy-item":
      return buyInventoryItem(model, payload);
    case "inventory-quantity-set":
      return setInventoryItemQuantity(model, payload.index, payload.quantity ?? payload.amount);
    case "inventory-quantity-adjust":
      return adjustInventoryItemQuantity(model, payload.index, payload.delta);
    case "inventory-equipped-set":
      return setInventoryItemEquipped(model, payload.index, payload.equipped);
    case "inventory-attunement-toggle":
      return toggleInventoryItemAttunement(model, payload.index);
    case "attack-mode-set":
      return setAttackMode(model, payload.index, payload.mode);
    case "attack-ability-set":
      return setAttackAbility(model, payload.index, payload.ability);
    case "attack-proficiency-set":
      return setAttackProficiency(model, payload.index, payload.proficient);
    case "short-rest":
      return applyShortRest(model);
    case "long-rest":
      return applyLongRest(model);
    default:
      return makeActionResult({
        action,
        reason: "unknown-table-state-action"
      });
  }
}

export function createUnavailableSheetAction(action, reason = "not-implemented-in-this-phase") {
  return makeActionResult({
    action,
    reason
  });
}
