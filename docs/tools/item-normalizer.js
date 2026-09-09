// Shared by the public catalog and DM workshop. Keep raw catalog records intact.
(function (root) {
  const damageTypes = { A: "acid", B: "bludgeoning", C: "cold", F: "fire", O: "force", L: "lightning", N: "necrotic", P: "piercing", I: "poison", Y: "psychic", R: "radiant", S: "slashing", T: "thunder" };
  const properties = { A: "Ammunition", F: "Finesse", H: "Heavy", L: "Light", LD: "Loading", R: "Reach", S: "Special", T: "Thrown", TH: "Two-Handed", V: "Versatile" };
  const types = { M: "Melee weapon", R: "Ranged weapon", LA: "Light armor", MA: "Medium armor", HA: "Heavy armor", S: "Shield", G: "Adventuring gear", W: "Wondrous item", P: "Potion", SC: "Scroll", RD: "Rod", RG: "Ring", WD: "Wand", ST: "Staff" };
  function text(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(text).filter(Boolean).join("\n");
    if (typeof value === "object") return [value.name, text(value.wrapped ?? value.entries ?? value.items ?? value.entry ?? value.text)].filter(Boolean).join(": ");
    return String(value).replace(/\{@\w+\s+([^{}]+)\}/gu, (_match, body) => {
      const parts = body.split("|");
      return parts[2] || parts[0];
    });
  }
  function normalize(item = {}) {
    const rawProperties = item.properties ?? item._fProperties ?? item.property ?? [];
    const propertyList = (Array.isArray(rawProperties) ? rawProperties : String(rawProperties).split(/[,|]/u)).map(p => properties[String(p).trim()] || String(p).trim()).filter(Boolean);
    const type = item.type && typeof item.type === "object" ? item.type.name || item.type.code : item.type;
    const damageType = damageTypes[item.dmgType] || item.damageType || "";
    const dice = [item.dmg1, item.dmg2].filter(Boolean).join(" / ");
    const attunement = item.attunementRequirement ?? item._attunement ?? (typeof item.reqAttune === "string" ? item.reqAttune : (item.reqAttune || item.attunement ? "Requires attunement" : ""));
    return {
      id: item.id || item.itemId || item.catalogId || "", name: item.name || "", source: item.source || "",
      rarity: String(item.rarity || "none").toLowerCase(),
      type: (Array.isArray(item._typeListText) ? item._typeListText.join(" · ") : "") || types[type] || type || item.category || "Item",
      damage: item.damage ?? ([dice, damageType].filter(Boolean).join(" ")),
      properties: propertyList, attunement, mastery: text(item.mastery),
      valueLabel: item.valueLabel || item._l_value || (item.value == null ? "" : `${Number(item.value) / 100} gp`),
      weight: item.weight ?? "",
      description: item.text ?? item.entriesText ?? text(item.entries?.length ? item.entries : item._fullEntries || item.entries)
    };
  }
  function editPatch(fields, baseline = {}) {
    const patch = Object.fromEntries(Object.entries(fields).filter(([key,value]) => JSON.stringify(value) !== JSON.stringify(baseline?.[key])));
    if ('text' in patch) patch._fullEntries = fields.entries;
    else delete patch.entries;
    if ('damage' in patch) {
      const match = /^(\d+d\d+(?:\s*[+-]\s*\d+)?)(?:\s*\/\s*(\d+d\d+(?:\s*[+-]\s*\d+)?))?\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)$/iu.exec(fields.damage.trim());
      if (fields.damage.trim() && !match) throw new Error("Use damage like '1d6 piercing' or '1d6 / 1d8 piercing'; put additional effects in Description.");
      patch.dmg1 = match?.[1] || null;
      patch.dmg2 = match?.[2] || null;
      patch.dmgType = match ? Object.keys(damageTypes).find(key => damageTypes[key] === match[3].toLowerCase()) : null;
      patch.damageType = match?.[3]?.toLowerCase() || null;
    }
    if ('properties' in patch) {
      patch.property = fields.properties.map(value => Object.keys(properties).find(key => properties[key].toLowerCase() === value.toLowerCase()) || value);
      patch._fProperties = fields.properties;
    }
    if ('attunementRequirement' in patch) {
      patch.reqAttune = fields.attunementRequirement || false;
      patch.attunement = Boolean(fields.attunementRequirement);
      patch._attunement = fields.attunementRequirement || null;
    }
    if ('type' in patch) {
      patch.type = Object.keys(types).find(key => types[key].toLowerCase() === fields.type.toLowerCase()) || fields.type;
      patch._typeListText = [fields.type];
    }
    return patch;
  }
  root.EldoriaItems = { normalize, text, editPatch };
  if (typeof module !== "undefined" && module.exports) module.exports = root.EldoriaItems;
})(globalThis);
