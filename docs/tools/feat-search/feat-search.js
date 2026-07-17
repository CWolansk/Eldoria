// Feat search config. Requires shared-search.js to be loaded first.
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};
  var helpers = features.rulesSearchHelpers;

  var escapeHtml = helpers.escapeHtml;
  var normalize = helpers.normalize;
  var yesNo = helpers.yesNo;
  var abilityValues = helpers.abilityValues;
  var compareText = helpers.compareText;
  var renderDetails = helpers.renderDetails;
  var entriesText = helpers.entriesText;

  function abilityLabel(row) {
    var ability = row.grants?.ability || row.raw?.ability || [];
    return ability.flatMap(function (entry) {
      return Object.entries(entry || {}).map(function (pair) {
        return pair[0].toUpperCase() + " +" + pair[1];
      });
    }).join(", ");
  }

  function mapFeatApiRow(row) {
    var hasPrerequisite = row.hasPrerequisite === true || (Array.isArray(row.prerequisite) && row.prerequisite.length > 0);
    return {
      Id: row.id || "",
      Name: row.name || "",
      Source: row.source || "",
      Prerequisites: hasPrerequisite ? (entriesText(row.prerequisite) || "Has prerequisites") : "None",
      "Ability Scores": abilityLabel(row),
      Repeatable: row.repeatable === true || row.raw?.repeatable === true ? "Yes" : "No",
      Description: entriesText(row.entries || row.raw?.entries),
      "5etools Link": ""
    };
  }

  async function loadFeatDetail(id) {
    var api = await features.createRulesApiClient(features.rulesSearchConfigs.feats);
    return api.getCatalogEntity("feats", id);
  }

  function renderFeat(row) {
    return '\
      <details class="feat-card" data-catalog-id="' + escapeHtml(row.Id || "") + '">\
        <summary class="feat-name">\
          <span>' + escapeHtml(row.Name) + '</span>\
          <span class="rules-card-badges">' + (row.Repeatable === "Yes" ? '<span class="feat-repeatable">Repeatable</span>' : "") + '</span>\
        </summary>\
        <div class="feat-details">\
          ' + renderDetails(row, [["Source", "Source"], ["Prerequisites", "Prerequisites"], ["Ability Score Increase", "Ability Scores"]]) + '\
          ' + (row.Description ? '<div class="feat-description">' + escapeHtml(row.Description) + "</div>" : "") + '\
          ' + (row["5etools Link"] ? '<div class="feat-link"><a href="' + escapeHtml(row["5etools Link"]) + '" target="_blank" rel="noopener noreferrer">View on 5etools</a></div>' : "") + '\
        </div>\
      </details>';
  }

  features.rulesSearchConfigs = features.rulesSearchConfigs || {};
  features.rulesSearchConfigs.feats = {
    title: "Feat Search",
    itemLabel: "feat",
    dataKind: "feats",
    remoteSearch: true,
    remoteLimit: 1000,
    remoteDebounceMs: 250,
    mapApiRow: mapFeatApiRow,
    loadDetail: loadFeatDetail,
    placeholder: "Search feats...",
    searchFields: ["Name", "Source", "Prerequisites", "Ability Scores", "Repeatable", "Description"],
    render: renderFeat,
    filters: [
      { key: "source", label: "Source", values: helpers.sourceValues },
      { key: "prerequisites", label: "Prerequisites", values: function (row) { return normalize(row.Prerequisites) && normalize(row.Prerequisites) !== "None" ? ["Has prerequisites"] : ["No prerequisites"]; } }
    ],
    sorts: [
      { key: "name", label: "Name A-Z", compare: compareText("Name") },
      { key: "source", label: "Source", compare: compareText("Source") },
      { key: "repeatable", label: "Repeatable", compare: compareText("Repeatable") }
    ]
  };
}(window));
