// Background search config. Requires shared-search.js to be loaded first.
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};
  var constants = features.rulesSearchConstants;
  var helpers = features.rulesSearchHelpers;

  var escapeHtml = helpers.escapeHtml;
  var escapeRegex = helpers.escapeRegex;
  var compareText = helpers.compareText;
  var renderDetails = helpers.renderDetails;

  function extractSegment(text, label, nextLabels) {
    var start = new RegExp("\\b" + label + "\\s*:", "i").exec(text);
    if (!start) return "";
    var bodyStart = start.index + start[0].length;
    var next = new RegExp("\\b(?:" + nextLabels.map(escapeRegex).join("|") + ")\\s*:", "i").exec(text.slice(bodyStart));
    return text.slice(bodyStart, next ? bodyStart + next.index : undefined).trim();
  }

  function extractKnownTerms(segment, terms) {
    return terms.filter(function (term) {
      return new RegExp("\\b" + escapeRegex(term) + "\\b", "i").test(segment);
    });
  }

  function backgroundSkillValues(row) {
    var segment = extractSegment(row.Description || "", "Skill Proficiencies", [
      "Tool Proficiencies",
      "Languages",
      "Equipment",
      "Feature",
      "Suggested Characteristics"
    ]);
    return extractKnownTerms(segment, constants.SKILLS);
  }

  function backgroundToolValues(row) {
    var segment = extractSegment(row.Description || "", "Tool Proficiencies", [
      "Languages",
      "Equipment",
      "Feature",
      "Suggested Characteristics"
    ]);
    return extractKnownTerms(segment, constants.TOOLS);
  }

  function backgroundLanguageValues(row) {
    var segment = extractSegment(row.Description || "", "Languages", [
      "Tool Proficiencies",
      "Equipment",
      "Feature",
      "Suggested Characteristics"
    ]);
    var values = extractKnownTerms(segment, constants.LANGUAGES);
    if (/choice/i.test(segment) && !values.includes("Choice")) {
      values.push("Choice");
    }
    return values;
  }

  function renderBackground(row) {
    return '\
      <details class="background-card">\
        <summary class="background-name">\
          <span>' + escapeHtml(row.Name) + '</span>\
          <span class="rules-card-badges">' + (row.Source ? '<span class="background-source">' + escapeHtml(row.Source) + "</span>" : "") + '</span>\
        </summary>\
        <div class="background-details">\
          ' + renderDetails(row, [["Source", "Source"]]) + '\
          ' + (row.Description ? '<div class="background-description">' + escapeHtml(row.Description) + "</div>" : "") + '\
        </div>\
      </details>';
  }

  features.rulesSearchConfigs = features.rulesSearchConfigs || {};
  features.rulesSearchConfigs.backgrounds = {
    title: "Background Search",
    itemLabel: "background",
    dataKind: "backgrounds",
    placeholder: "Search backgrounds...",
    searchFields: ["Name", "Source", "Description"],
    render: renderBackground,
    filters: [
      { key: "source", label: "Source", values: helpers.sourceValues },
      { key: "skills", label: "Skills", values: backgroundSkillValues },
      { key: "tools", label: "Tools", values: backgroundToolValues },
      { key: "languages", label: "Languages", values: backgroundLanguageValues }
    ],
    sorts: [
      { key: "name", label: "Name A-Z", compare: compareText("Name") },
      { key: "source", label: "Source", compare: compareText("Source") }
    ]
  };
}(window));
