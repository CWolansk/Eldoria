// Spell search config. Requires shared-search.js to be loaded first.
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};
  var constants = features.rulesSearchConstants;
  var helpers = features.rulesSearchHelpers;

  var escapeHtml = helpers.escapeHtml;
  var slugify = helpers.slugify;
  var titleCase = helpers.titleCase;
  var normalize = helpers.normalize;
  var dedupe = helpers.dedupe;
  var splitList = helpers.splitList;
  var stripSourceSuffix = helpers.stripSourceSuffix;
  var yesNo = helpers.yesNo;
  var compareText = helpers.compareText;
  var orderCompare = helpers.orderCompare;
  var renderDetails = helpers.renderDetails;

  function spellClassValues(row) {
    return dedupe(
      splitList(row.Classes)
        .concat(splitList(row["Optional/Variant Classes"]))
        .concat(splitList(row.Subclasses))
        .map(stripSourceSuffix)
        .filter(Boolean)
    );
  }

  function spellCastingTimeValues(row) {
    var value = normalize(row["Casting Time"]).toLowerCase();
    if (!value) return [];
    if (value.includes("bonus")) return ["Bonus Action"];
    if (value.includes("reaction")) return ["Reaction"];
    if (value.includes("action")) return ["Action"];
    if (value.includes("minute")) return ["Minute"];
    if (value.includes("hour")) return ["Hour"];
    return [titleCase(value)];
  }

  function spellComponentValues(row) {
    var value = normalize(row.Components);
    var values = [];
    if (/(^|,\s*)V\b/.test(value)) values.push("V");
    if (/(^|,\s*)S\b/.test(value)) values.push("S");
    if (/(^|,\s*)M\b/.test(value)) values.push("M");
    return values;
  }

  function concentrationValues(row) {
    return [yesNo(row.Concentration || (String(row.Duration || "").includes("Concentration") ? "Yes" : "No"))];
  }

  function ritualValues(row) {
    return [yesNo(row.Ritual)];
  }

  function renderSpell(row) {
    var levelClass = "level-" + slugify(row.Level || "cantrip");
    return '\
      <details class="spell-card">\
        <summary class="spell-name">\
          <span>' + escapeHtml(row.Name) + '</span>\
          <span class="rules-card-badges">\
            <span class="school-badge">' + escapeHtml(titleCase(row.School || "Unknown")) + '</span>\
            <span class="spell-level ' + levelClass + '">' + escapeHtml(row.Level || "Cantrip") + '</span>\
          </span>\
        </summary>\
        <div class="spell-details">\
          <div class="spell-school">' + escapeHtml(titleCase(row.School || "Unknown School")) + '</div>\
          ' + renderDetails(row, [["Source", "Source"], ["Casting Time", "Casting Time"], ["Range", "Range"], ["Components", "Components"], ["Duration", "Duration"], ["Classes", "Classes"], ["Optional Classes", "Optional/Variant Classes"]]) + '\
          ' + (row.Text ? '<div class="spell-text">' + escapeHtml(row.Text) + "</div>" : "") + '\
          ' + (row["At Higher Levels"] ? '<div class="spell-higher-levels"><strong>At Higher Levels:</strong> ' + escapeHtml(row["At Higher Levels"]) + "</div>" : "") + '\
        </div>\
      </details>';
  }

  features.rulesSearchConfigs = features.rulesSearchConfigs || {};
  features.rulesSearchConfigs.spells = {
    title: "Spell Search",
    itemLabel: "spell",
    dataKind: "spells",
    placeholder: "Search spells...",
    searchFields: ["Name", "Source", "Level", "Casting Time", "Duration", "School", "Range", "Components", "Classes", "Optional/Variant Classes", "Subclasses", "Text", "At Higher Levels"],
    render: renderSpell,
    filters: [
      { key: "source", label: "Source", values: helpers.sourceValues },
      { key: "level", label: "Level", values: helpers.fieldValue("Level"), order: constants.LEVEL_ORDER },
      { key: "class", label: "Class", values: spellClassValues },
      { key: "school", label: "School", values: function (row) { return titleCase(row.School); } },
      { key: "casting", label: "Casting Time", values: spellCastingTimeValues },
      { key: "concentration", label: "Concentration", values: concentrationValues, order: ["Yes", "No"] },
      { key: "ritual", label: "Ritual", values: ritualValues, order: ["Yes", "No"] },
      { key: "components", label: "Components", values: spellComponentValues, order: ["V", "S", "M"] }
    ],
    sorts: [
      { key: "name", label: "Name A-Z", compare: compareText("Name") },
      { key: "level", label: "Level", compare: orderCompare("Level", constants.LEVEL_ORDER) },
      { key: "school", label: "School", compare: compareText("School") },
      { key: "source", label: "Source", compare: compareText("Source") }
    ]
  };
}(window));
