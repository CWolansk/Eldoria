// Item search config. Requires shared-search.js to be loaded first.
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};
  var constants = features.rulesSearchConstants;
  var helpers = features.rulesSearchHelpers;

  var escapeHtml = helpers.escapeHtml;
  var escapeRegex = helpers.escapeRegex;
  var slugify = helpers.slugify;
  var titleCase = helpers.titleCase;
  var normalize = helpers.normalize;
  var compareText = helpers.compareText;
  var orderCompare = helpers.orderCompare;
  var renderDetails = helpers.renderDetails;

  function attunementValues(row) {
    const value = normalize(row.Attunement);
    return [value && !/^(no|none|false|not required|no attunement required)$/iu.test(value) ? "Required" : "Not required"];
  }

  function damageValues(row) {
    var haystack = (row.Damage || "") + " " + (row.Text || "");
    return constants.DAMAGE_TYPES
      .filter(function (type) {
        return new RegExp("\\b" + escapeRegex(type) + "\\b", "i").test(haystack);
      })
      .map(titleCase);
  }

  function rarityClass(value) {
    return "rarity-" + slugify(value || "common");
  }

  function renderItem(row) {
    return '\
      <details class="item-card" data-catalog-id="' + escapeHtml(row.Id || "") + '">\
        <summary class="item-name">\
          <span>' + escapeHtml(row.Name) + '</span>\
          <span class="rules-card-badges"><span class="rarity ' + rarityClass(row.Rarity) + '">' + escapeHtml(row.Rarity || "Common") + '</span></span>\
        </summary>\
        <div class="item-details">\
          <div class="item-type">' + escapeHtml(row.Type || "Item") + '</div>\
          ' + renderDetails(row, [["Source", "Source"], ["Attunement", "Attunement"], ["Damage", "Damage"], ["Properties", "Properties"], ["Mastery", "Mastery"], ["Weight", "Weight"], ["Value", "Value"]]) + '\
          ' + (row.Text ? '<div class="item-text">' + escapeHtml(row.Text) + "</div>" : "") + '\
        </div>\
      </details>';
  }

  function yesNo(value) {
    return value ? "Yes" : "No";
  }

  function entriesText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (Array.isArray(value)) return value.map(entriesText).filter(Boolean).join(" ");
    if (typeof value === "object") return entriesText(value.entries || value.items || value.entry || value.name || "");
    return "";
  }

  function mapItemApiRow(row) {
    const item = global.EldoriaItems.normalize(row);
    return {
      Id: item.id, Name: item.name, Source: item.source, Rarity: titleCase(item.rarity),
      Type: item.type, Attunement: item.attunement || "No", Damage: item.damage,
      Properties: item.properties.join(", "), Mastery: item.mastery,
      Weight: String(item.weight), Value: item.valueLabel, Text: item.description
    };
  }

  async function loadItemDetail(id) {
    var api = await features.createRulesApiClient(features.rulesSearchConfigs.items);
    return api.getCatalogEntity("items", id);
  }

  features.rulesSearchConfigs = features.rulesSearchConfigs || {};
  features.rulesSearchConfigs.items = {
    title: "Item Search",
    itemLabel: "item",
    dataKind: "items",
    remoteSearch: true,
    serverDriven: true,
    remoteLimit: 100,
    remoteDebounceMs: 250,
    minimumQueryLength: 2,
    mapApiRow: mapItemApiRow,
    loadDetail: loadItemDetail,
    placeholder: "Search items...",
    searchFields: ["Name", "Source", "Rarity", "Type", "Attunement", "Damage", "Properties", "Mastery", "Weight", "Value", "Text"],
    render: renderItem,
    filters: [
      { key: "source", label: "Source", values: helpers.sourceValues },
      { key: "rarity", label: "Rarity", values: helpers.fieldValue("Rarity"), order: constants.RARITY_ORDER },
      { key: "type", label: "Type", values: helpers.fieldValue("Type") },
      { key: "attunement", label: "Attunement", values: attunementValues },
      { key: "damage", label: "Damage", values: damageValues },
      { key: "properties", label: "Properties", values: helpers.fieldList("Properties") },
      { key: "mastery", label: "Mastery", values: helpers.fieldValue("Mastery") }
    ],
    sorts: [
      { key: "name", label: "Name A-Z", compare: compareText("Name") },
      { key: "rarity", label: "Rarity", compare: orderCompare("Rarity", constants.RARITY_ORDER) },
      { key: "type", label: "Type", compare: compareText("Type") },
      { key: "source", label: "Source", compare: compareText("Source") }
    ]
  };
}(window));
