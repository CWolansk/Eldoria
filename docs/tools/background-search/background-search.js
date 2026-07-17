// Background search config. Requires shared-search.js to be loaded first.
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};
  var constants = features.rulesSearchConstants;
  var helpers = features.rulesSearchHelpers;

  var escapeHtml = helpers.escapeHtml;
  var escapeRegex = helpers.escapeRegex;
  var compareText = helpers.compareText;
  var renderDetails = helpers.renderDetails;
  var entriesText = helpers.entriesText;

  function listValues(value) {
    return String(value || "").split(/[|,;]/u).map(function (entry) {
      return entry.trim().replace(/\b\w/gu, function (letter) { return letter.toUpperCase(); });
    }).filter(Boolean);
  }

  function grantValues(row, kind) {
    var grant = row.grants?.[kind] || {};
    var fixed = Array.isArray(grant.fixed) ? grant.fixed : [];
    var choices = Array.isArray(grant.choices) ? grant.choices.map(function (choice) {
      return choice.count ? "Choice of " + choice.count : "Choice";
    }) : [];
    return fixed.concat(choices).join(", ");
  }

  function mapBackgroundApiRow(row) {
    var skills = row.skills || grantValues(row, "skills");
    var tools = grantValues(row, "tools");
    var languages = grantValues(row, "languages");
    var summary = [
      skills ? "Skill Proficiencies: " + listValues(skills).join(", ") : "",
      tools ? "Tool Proficiencies: " + tools : "",
      languages ? "Languages: " + languages : "",
      row.feature ? "Feature: " + row.feature : ""
    ].filter(Boolean).join(". ");
    return {
      Id: row.id || "",
      Name: row.name || "",
      Source: row.source || "",
      Skills: listValues(skills).join(", "),
      Tools: tools,
      Languages: languages,
      Description: entriesText(row.entries || row.raw?.entries) || summary
    };
  }

  async function loadBackgroundDetail(id) {
    var api = await features.createRulesApiClient(features.rulesSearchConfigs.backgrounds);
    return api.getCatalogEntity("backgrounds", id);
  }

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
    if (row.Skills) return listValues(row.Skills);
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
    if (row.Tools) return listValues(row.Tools);
    var segment = extractSegment(row.Description || "", "Tool Proficiencies", [
      "Languages",
      "Equipment",
      "Feature",
      "Suggested Characteristics"
    ]);
    return extractKnownTerms(segment, constants.TOOLS);
  }

  function backgroundLanguageValues(row) {
    if (row.Languages) return listValues(row.Languages);
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
      <details class="background-card" data-catalog-id="' + escapeHtml(row.Id || "") + '">\
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
    remoteSearch: true,
    remoteLimit: 1000,
    remoteDebounceMs: 250,
    mapApiRow: mapBackgroundApiRow,
    loadDetail: loadBackgroundDetail,
    placeholder: "Search backgrounds...",
    searchFields: ["Name", "Source", "Description"],
    render: renderBackground,
    filters: [
      { key: "source", label: "Source", values: helpers.sourceValues },
      { key: "skills", label: "Skills", values: backgroundSkillValues }
    ],
    sorts: [
      { key: "name", label: "Name A-Z", compare: compareText("Name") },
      { key: "source", label: "Source", compare: compareText("Source") }
    ]
  };
}(window));
