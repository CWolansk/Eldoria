// Race search config. Requires shared-search.js to be loaded first.
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};
  var helpers = features.rulesSearchHelpers;

  var escapeHtml = helpers.escapeHtml;
  var titleCase = helpers.titleCase;
  var normalize = helpers.normalize;
  var dedupe = helpers.dedupe;
  var splitList = helpers.splitList;
  var abilityValues = helpers.abilityValues;
  var compareText = helpers.compareText;
  var renderDetails = helpers.renderDetails;

  function sizeValues(row) {
    return splitList(row.Size).flatMap(function (value) {
      var normalized = normalize(value).toUpperCase();
      if (normalized === "S") return ["Small"];
      if (normalized === "M") return ["Medium"];
      return [titleCase(value)];
    });
  }

  function speedValues(row) {
    var value = normalize(row.Speed);
    if (!value) return [];
    var speeds = [];
    var numeric = value.match(/\b(\d+)\s*ft\.?/i);
    if (numeric) speeds.push(numeric[1] + " ft.");
    if (/fly|flying/i.test(value)) speeds.push("Fly");
    if (/swim/i.test(value)) speeds.push("Swim");
    if (/climb/i.test(value)) speeds.push("Climb");
    return dedupe(speeds);
  }

  function renderRace(row) {
    return '\
      <details class="race-card">\
        <summary class="race-name">\
          <span>' + escapeHtml(row.Name) + '</span>\
          <span class="rules-card-badges"><span class="race-size">' + escapeHtml(row.Size || "Varies") + '</span></span>\
        </summary>\
        <div class="race-details">\
          ' + renderDetails(row, [["Source", "Source"], ["Ability Scores", "Ability Scores"], ["Size", "Size"], ["Speed", "Speed"]]) + '\
          ' + (row.Description ? '<div class="race-description">' + escapeHtml(row.Description) + "</div>" : "") + '\
        </div>\
      </details>';
  }

  features.rulesSearchConfigs = features.rulesSearchConfigs || {};
  features.rulesSearchConfigs.races = {
    title: "Race Search",
    itemLabel: "race",
    dataKind: "races",
    placeholder: "Search races...",
    searchFields: ["Name", "Source", "Ability Scores", "Size", "Speed", "Description"],
    render: renderRace,
    filters: [
      { key: "source", label: "Source", values: helpers.sourceValues },
      { key: "ability", label: "Ability Score", values: abilityValues },
      { key: "size", label: "Size", values: sizeValues, order: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan", "Varies"] },
      { key: "speed", label: "Speed", values: speedValues }
    ],
    sorts: [
      { key: "name", label: "Name A-Z", compare: compareText("Name") },
      { key: "source", label: "Source", compare: compareText("Source") },
      { key: "size", label: "Size", compare: compareText("Size") }
    ]
  };
}(window));
