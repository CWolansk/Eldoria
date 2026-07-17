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
  var entriesText = helpers.entriesText;

  function yesNoBoolean(value) {
    return value === true || /^yes$/iu.test(String(value || "")) ? "Yes" : "No";
  }

  function levelLabel(value) {
    var level = Number(value);
    if (!Number.isFinite(level) || level <= 0) return "Cantrip";
    if (level === 1) return "1st";
    if (level === 2) return "2nd";
    if (level === 3) return "3rd";
    return level + "th";
  }

  function formatCastingTime(row) {
    if (row.castingTime) return row.castingTime;
    return (row.time || row.raw?.time || []).map(function (entry) {
      return [entry.number, entry.unit, entry.condition ? "(" + entry.condition + ")" : ""].filter(Boolean).join(" ");
    }).join(", ");
  }

  function formatRange(row) {
    if (row.rangeLabel) return row.rangeLabel;
    var range = row.range || row.raw?.range || {};
    var distance = range.distance || {};
    if (distance.type === "self") return "Self";
    if (distance.type === "touch") return "Touch";
    return [distance.amount, distance.type].filter(Boolean).join(" ");
  }

  function formatComponents(row) {
    var components = row.components || row.raw?.components || {};
    if (typeof components === "string") return components;
    return [components.v ? "V" : "", components.s ? "S" : "", components.m ? "M" : ""].filter(Boolean).join(", ");
  }

  function formatDuration(row) {
    var duration = row.duration || row.raw?.duration || [];
    if (typeof duration === "string") return duration;
    return duration.map(function (entry) {
      if (entry.type === "instant") return "Instantaneous";
      if (entry.type === "permanent") return "Until dispelled";
      var timed = entry.duration || {};
      return [timed.amount, timed.type].filter(Boolean).join(" ");
    }).join(", ");
  }

  function mapSpellApiRow(row) {
    var school = typeof row.school === "object" ? row.school.name : row.school;
    return {
      Id: row.id || "",
      Name: row.name || "",
      Source: row.source || "",
      Level: levelLabel(row.level),
      "Casting Time": formatCastingTime(row),
      Range: formatRange(row),
      Components: formatComponents(row),
      Duration: formatDuration(row),
      School: school || row.schoolCode || "",
      Classes: entriesText(row.classes || row.raw?.classes),
      "Optional/Variant Classes": entriesText(row.optionalClasses || row.raw?.optionalClasses),
      Subclasses: entriesText(row.subclasses || row.raw?.subclasses),
      Concentration: yesNoBoolean(row.concentration),
      Ritual: yesNoBoolean(row.ritual),
      Text: entriesText(row.entries || row.raw?.entries),
      "At Higher Levels": entriesText(row.entriesHigherLevel || row.raw?.entriesHigherLevel)
    };
  }

  async function loadSpellDetail(id) {
    var api = await features.createRulesApiClient(features.rulesSearchConfigs.spells);
    return api.getCatalogEntity("spells", id);
  }

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
      <details class="spell-card" data-catalog-id="' + escapeHtml(row.Id || "") + '">\
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
    remoteSearch: true,
    remoteLimit: 1000,
    remoteDebounceMs: 250,
    mapApiRow: mapSpellApiRow,
    loadDetail: loadSpellDetail,
    placeholder: "Search spells...",
    searchFields: ["Name", "Source", "Level", "Casting Time", "Duration", "School", "Range", "Components", "Classes", "Optional/Variant Classes", "Subclasses", "Text", "At Higher Levels"],
    render: renderSpell,
    filters: [
      { key: "source", label: "Source", values: helpers.sourceValues },
      { key: "level", label: "Level", values: helpers.fieldValue("Level"), order: constants.LEVEL_ORDER },
      { key: "school", label: "School", values: function (row) { return titleCase(row.School); } },
      { key: "casting", label: "Casting Time", values: spellCastingTimeValues },
      { key: "concentration", label: "Concentration", values: concentrationValues, order: ["Yes", "No"] },
      { key: "ritual", label: "Ritual", values: ritualValues, order: ["Yes", "No"] }
    ],
    sorts: [
      { key: "name", label: "Name A-Z", compare: compareText("Name") },
      { key: "level", label: "Level", compare: orderCompare("Level", constants.LEVEL_ORDER) },
      { key: "school", label: "School", compare: compareText("School") },
      { key: "source", label: "Source", compare: compareText("Source") }
    ]
  };
}(window));
