// generated from site-src/app/features/rules-search/** - do not edit
// Source: site-src/app/features/rules-search/**

// app/features/rules-search/rules-search-constants.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  features.rulesSearchConstants = {
    DAMAGE_TYPES: [
      "acid",
      "bludgeoning",
      "cold",
      "fire",
      "force",
      "lightning",
      "necrotic",
      "piercing",
      "poison",
      "psychic",
      "radiant",
      "slashing",
      "thunder"
    ],
    ABILITIES: [
      ["Str", "Strength"],
      ["Dex", "Dexterity"],
      ["Con", "Constitution"],
      ["Int", "Intelligence"],
      ["Wis", "Wisdom"],
      ["Cha", "Charisma"]
    ],
    SKILLS: [
      "Acrobatics",
      "Animal Handling",
      "Arcana",
      "Athletics",
      "Deception",
      "History",
      "Insight",
      "Intimidation",
      "Investigation",
      "Medicine",
      "Nature",
      "Perception",
      "Performance",
      "Persuasion",
      "Religion",
      "Sleight of Hand",
      "Stealth",
      "Survival"
    ],
    TOOLS: [
      "Artisan tools",
      "Cartographer's tools",
      "Disguise kit",
      "Forgery kit",
      "Gaming set",
      "Herbalism kit",
      "Musical instrument",
      "Navigator's tools",
      "Poisoner's kit",
      "Thieves' tools",
      "Vehicles (land)",
      "Vehicles (space)",
      "Vehicles (water)"
    ],
    LANGUAGES: [
      "Abyssal",
      "Auran",
      "Celestial",
      "Common",
      "Draconic",
      "Dwarvish",
      "Elvish",
      "Giant",
      "Goblin",
      "Infernal",
      "Minotaur",
      "Choice"
    ],
    RARITY_ORDER: ["none", "common", "uncommon", "rare", "very rare", "legendary", "artifact"],
    LEVEL_ORDER: ["Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"]
  };
}(window));

// app/features/rules-search/load-rules-csv.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function normalize(value) {
    return String(value == null ? "" : value).trim();
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var current = "";
    var inQuotes = false;

    for (var index = 0; index < text.length; index += 1) {
      var character = text[index];
      var next = text[index + 1];

      if (character === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (character === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }

      if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && next === "\n") {
          index += 1;
        }

        row.push(current);
        if (row.some(function (cell) { return normalize(cell); })) {
          rows.push(row);
        }
        row = [];
        current = "";
        continue;
      }

      current += character;
    }

    row.push(current);
    if (row.some(function (cell) { return normalize(cell); })) {
      rows.push(row);
    }

    var headers = rows.shift() || [];
    return rows.map(function (values) {
      var entry = {};
      headers.forEach(function (header, headerIndex) {
        entry[header] = values[headerIndex] || "";
      });
      return entry;
    });
  }

  features.parseRulesCsv = parseCsv;

  features.ensureRulesCatalogWidgetData = async function ensureRulesCatalogWidgetData() {
    if (global.RulesCatalogWidgetData) {
      return global.RulesCatalogWidgetData;
    }

    if (!features._rulesCatalogWidgetDataPromise) {
      features._rulesCatalogWidgetDataPromise = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = "../assets/rules-catalog-widget-data.js";
        script.onload = function () {
          if (global.RulesCatalogWidgetData) {
            resolve(global.RulesCatalogWidgetData);
            return;
          }

          reject(new Error("RulesCatalogWidgetData loaded but not available on window"));
        };
        script.onerror = function () {
          reject(new Error("Unable to load ../assets/rules-catalog-widget-data.js"));
        };
        document.head.appendChild(script);
      });
    }

    return features._rulesCatalogWidgetDataPromise;
  };

  features.loadRulesRows = async function loadRulesRows(config) {
    try {
      var RulesCatalogWidgetData = await features.ensureRulesCatalogWidgetData();
      var loader = RulesCatalogWidgetData.getDefault();
      var result = await loader.loadRows(config.dataKind || config.itemLabel, config);
      if (Array.isArray(result.rows) && result.rows.length) {
        return result.rows;
      }
    } catch (error) {
      console.warn("Falling back to CSV rules data.", error);
    }

    var response = await fetch(config.csvPath);
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    return parseCsv(await response.text());
  };
}(window));

// app/features/rules-search/create-rules-search-state.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  features.createRulesSearchState = function createRulesSearchState(config) {
    return {
      query: "",
      sort: config.sorts[0].key,
      filters: {},
      filtersOpen: false
    };
  };
}(window));

// app/features/rules-search/render-rules-search-layout.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  features.renderRulesSearchLayout = function renderRulesSearchLayout(root, config, uid) {
    root.innerHTML = '\
      <section class="rules-search-app" data-rules-kind="' + escapeHtml(config.itemLabel) + '" data-filters-open="false">\
        <div class="rules-search-toolbar">\
          <div class="rules-search-field">\
            <label class="field-label" for="' + uid + '-query">Search</label>\
            <div class="rules-search-box">\
              <input class="input" id="' + uid + '-query" type="search" autocomplete="off" placeholder="' + escapeHtml(config.placeholder) + '">\
              <button class="rules-search-clear" type="button" aria-label="Clear search" hidden>x</button>\
            </div>\
          </div>\
          <button class="button button-secondary rules-filter-toggle" type="button" aria-expanded="false" aria-controls="' + uid + '-filters">Filters</button>\
          <label class="field rules-sort-field" for="' + uid + '-sort">\
            <span class="field-label">Sort</span>\
            <select class="select" id="' + uid + '-sort">\
              ' + config.sorts.map(function (sort) {
                return '<option value="' + escapeHtml(sort.key) + '">' + escapeHtml(sort.label) + "</option>";
              }).join("") + '\
            </select>\
          </label>\
        </div>\
        <div class="rules-active-row">\
          <div class="rules-active-filters" aria-live="polite"></div>\
          <button class="button button-quiet rules-clear-all" type="button">Clear all</button>\
        </div>\
        <div class="rules-search-layout">\
          <aside class="rules-filter-sidebar" id="' + uid + '-filters" aria-label="Filters">\
            <div class="rules-filter-header">\
              <h2>Filters</h2>\
              <button class="button button-quiet rules-clear-all-sidebar" type="button">Clear all</button>\
            </div>\
            <div class="rules-filter-groups"></div>\
          </aside>\
          <main class="rules-results-panel">\
            <div class="rules-result-count">Loading ' + escapeHtml(config.itemLabel) + ' data...</div>\
            <div class="rules-results"></div>\
          </main>\
        </div>\
      </section>';
  };
}(window));

// app/features/rules-search/bind-rules-search-events.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  features.bindRulesSearchEvents = function bindRulesSearchEvents(app) {
    var pendingRender = null;

    app.inputNode.addEventListener("input", function () {
      app.state.query = app.inputNode.value;
      window.clearTimeout(pendingRender);
      pendingRender = window.setTimeout(function () {
        app.render();
      }, 100);
    });

    app.clearSearchNode.addEventListener("click", function () {
      app.state.query = "";
      app.inputNode.value = "";
      app.inputNode.focus();
      app.render();
    });

    app.sortNode.addEventListener("change", function () {
      app.state.sort = app.sortNode.value;
      app.render();
    });

    app.toggleNode.addEventListener("click", function () {
      app.state.filtersOpen = !app.state.filtersOpen;
      app.appNode.dataset.filtersOpen = String(app.state.filtersOpen);
      app.toggleNode.setAttribute("aria-expanded", String(app.state.filtersOpen));
    });

    app.filterGroupsNode.addEventListener("change", function (event) {
      var input = event.target.closest("[data-filter-key]");
      if (!input) {
        return;
      }

      var key = input.dataset.filterKey;
      if (!app.state.filters[key]) {
        app.state.filters[key] = new Set();
      }

      if (input.checked) {
        app.state.filters[key].add(input.value);
      } else {
        app.state.filters[key].delete(input.value);
      }

      app.render();
    });

    app.clearAllNodes.forEach(function (button) {
      button.addEventListener("click", function () {
        app.clearAll();
      });
    });

    app.activeNode.addEventListener("click", function (event) {
      var button = event.target.closest("[data-chip-type]");
      if (!button) {
        return;
      }

      if (button.dataset.chipType === "query") {
        app.state.query = "";
        app.inputNode.value = "";
      } else {
        var selected = app.state.filters[button.dataset.filterKey];
        if (selected) {
          selected.delete(button.dataset.filterValue);
        }

        var targetInput = Array.from(app.root.querySelectorAll("[data-filter-key]")).find(function (candidate) {
          return candidate.dataset.filterKey === button.dataset.filterKey && candidate.value === button.dataset.filterValue;
        });

        if (targetInput) {
          targetInput.checked = false;
        }
      }

      app.render();
    });
  };
}(window));

// app/features/rules-search/rules-search-config.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};
  var constants = features.rulesSearchConstants;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "value";
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (character) { return character.toUpperCase(); });
  }

  function normalize(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeLower(value) {
    return normalize(value).toLowerCase();
  }

  function dedupe(values) {
    var seen = new Map();
    values.map(normalize).filter(Boolean).forEach(function (value) {
      var key = value.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, value);
      }
    });
    return Array.from(seen.values());
  }

  function splitList(value) {
    return dedupe(String(value || "")
      .split(/[,;]+/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean));
  }

  function stripSourceSuffix(value) {
    return normalize(value).replace(/\s*\([^)]*\)\s*$/g, "").trim();
  }

  function fieldValue(field) {
    return function (row) {
      return normalize(row[field]);
    };
  }

  function fieldList(field) {
    return function (row) {
      return splitList(row[field]);
    };
  }

  function sourceValues(row) {
    return normalize(row.Source) ? [normalize(row.Source)] : [];
  }

  function yesNo(value) {
    return /^yes$/i.test(normalize(value)) ? "Yes" : "No";
  }

  function attunementValues(row) {
    return [normalize(row.Attunement) ? "Required" : "Not required"];
  }

  function damageValues(row) {
    var haystack = (row.Damage || "") + " " + (row.Text || "");
    return constants.DAMAGE_TYPES
      .filter(function (type) {
        return new RegExp("\\b" + escapeRegex(type) + "\\b", "i").test(haystack);
      })
      .map(titleCase);
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

  function abilityValues(row) {
    var value = normalize(row["Ability Scores"]);
    return constants.ABILITIES
      .filter(function (pair) {
        var shortName = pair[0];
        var longName = pair[1];
        return new RegExp("\\b" + escapeRegex(shortName) + "\\b", "i").test(value)
          || new RegExp("\\b" + escapeRegex(longName) + "\\b", "i").test(value);
      })
      .map(function (pair) { return pair[1]; });
  }

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

  function compareText(field) {
    return function (left, right) {
      return normalize(left[field]).localeCompare(normalize(right[field]));
    };
  }

  function orderCompare(field, order) {
    var lookup = new Map(order.map(function (value, index) {
      return [value.toLowerCase(), index];
    }));

    return function (left, right) {
      var leftKey = normalizeLower(left[field]);
      var rightKey = normalizeLower(right[field]);
      var leftIndex = lookup.has(leftKey) ? lookup.get(leftKey) : 999;
      var rightIndex = lookup.has(rightKey) ? lookup.get(rightKey) : 999;
      return leftIndex - rightIndex || compareText("Name")(left, right);
    };
  }

  function detailRow(label, value) {
    return normalize(value)
      ? '<div class="detail-row"><span class="detail-label">' + escapeHtml(label) + ":</span> " + escapeHtml(value) + "</div>"
      : "";
  }

  function renderDetails(row, fields) {
    return fields.map(function (pair) {
      return detailRow(pair[0], row[pair[1]]);
    }).join("");
  }

  function rarityClass(value) {
    return "rarity-" + slugify(value || "common");
  }

  function renderItem(row) {
    return '\
      <details class="item-card">\
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

  function renderFeat(row) {
    return '\
      <details class="feat-card">\
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

  features.activeRulesValueLabel = function activeRulesValueLabel(key, value) {
    if (key === "concentration") return value === "Yes" ? "Concentration" : "No concentration";
    if (key === "ritual") return value === "Yes" ? "Ritual" : "Not ritual";
    if (key === "attunement") return value === "Required" ? "Attunement required" : "No attunement";
    return value;
  };

  features.rulesSearchHelpers = {
    compareText: compareText,
    dedupe: dedupe,
    normalize: normalize,
    normalizeLower: normalizeLower
  };

  features.rulesSearchConfigs = {
    items: {
      title: "Item Search",
      itemLabel: "item",
      dataKind: "items",
      csvPath: "../data/items.csv",
      placeholder: "Search items...",
      catalogBasePaths: ["../character-sheets/v1/data"],
      csvPaths: ["../data/items.csv"],
      searchFields: ["Name", "Source", "Rarity", "Type", "Attunement", "Damage", "Properties", "Mastery", "Weight", "Value", "Text"],
      render: renderItem,
      filters: [
        { key: "source", label: "Source", values: sourceValues },
        { key: "rarity", label: "Rarity", values: fieldValue("Rarity"), order: constants.RARITY_ORDER },
        { key: "type", label: "Type", values: fieldValue("Type") },
        { key: "attunement", label: "Attunement", values: attunementValues },
        { key: "damage", label: "Damage", values: damageValues },
        { key: "properties", label: "Properties", values: fieldList("Properties") },
        { key: "mastery", label: "Mastery", values: fieldValue("Mastery") }
      ],
      sorts: [
        { key: "name", label: "Name A-Z", compare: compareText("Name") },
        { key: "rarity", label: "Rarity", compare: orderCompare("Rarity", constants.RARITY_ORDER) },
        { key: "type", label: "Type", compare: compareText("Type") },
        { key: "source", label: "Source", compare: compareText("Source") }
      ]
    },
    spells: {
      title: "Spell Search",
      itemLabel: "spell",
      dataKind: "spells",
      csvPath: "../data/spells.csv",
      placeholder: "Search spells...",
      searchFields: ["Name", "Source", "Level", "Casting Time", "Duration", "School", "Range", "Components", "Classes", "Optional/Variant Classes", "Subclasses", "Text", "At Higher Levels"],
      render: renderSpell,
      filters: [
        { key: "source", label: "Source", values: sourceValues },
        { key: "level", label: "Level", values: fieldValue("Level"), order: constants.LEVEL_ORDER },
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
    },
    feats: {
      title: "Feat Search",
      itemLabel: "feat",
      dataKind: "feats",
      csvPath: "../data/feats.csv",
      placeholder: "Search feats...",
      searchFields: ["Name", "Source", "Prerequisites", "Ability Scores", "Repeatable", "Description"],
      render: renderFeat,
      filters: [
        { key: "source", label: "Source", values: sourceValues },
        { key: "prerequisites", label: "Prerequisites", values: function (row) { return normalize(row.Prerequisites) && normalize(row.Prerequisites) !== "None" ? ["Has prerequisites"] : ["No prerequisites"]; } },
        { key: "ability", label: "Ability Score", values: abilityValues },
        { key: "repeatable", label: "Repeatable", values: function (row) { return yesNo(row.Repeatable); }, order: ["Yes", "No"] }
      ],
      sorts: [
        { key: "name", label: "Name A-Z", compare: compareText("Name") },
        { key: "source", label: "Source", compare: compareText("Source") },
        { key: "repeatable", label: "Repeatable", compare: compareText("Repeatable") }
      ]
    },
    races: {
      title: "Race Search",
      itemLabel: "race",
      dataKind: "races",
      csvPath: "../data/races.csv",
      placeholder: "Search races...",
      searchFields: ["Name", "Source", "Ability Scores", "Size", "Speed", "Description"],
      render: renderRace,
      filters: [
        { key: "source", label: "Source", values: sourceValues },
        { key: "ability", label: "Ability Score", values: abilityValues },
        { key: "size", label: "Size", values: sizeValues, order: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan", "Varies"] },
        { key: "speed", label: "Speed", values: speedValues }
      ],
      sorts: [
        { key: "name", label: "Name A-Z", compare: compareText("Name") },
        { key: "source", label: "Source", compare: compareText("Source") },
        { key: "size", label: "Size", compare: compareText("Size") }
      ]
    },
    backgrounds: {
      title: "Background Search",
      itemLabel: "background",
      dataKind: "backgrounds",
      csvPath: "../data/backgrounds.csv",
      placeholder: "Search backgrounds...",
      searchFields: ["Name", "Source", "Description"],
      render: renderBackground,
      filters: [
        { key: "source", label: "Source", values: sourceValues },
        { key: "skills", label: "Skills", values: backgroundSkillValues },
        { key: "tools", label: "Tools", values: backgroundToolValues },
        { key: "languages", label: "Languages", values: backgroundLanguageValues }
      ],
      sorts: [
        { key: "name", label: "Name A-Z", compare: compareText("Name") },
        { key: "source", label: "Source", compare: compareText("Source") }
      ]
    }
  };
}(window));

// app/features/rules-search/boot-rules-search-page.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};
  var helpers = features.rulesSearchHelpers;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function RulesSearchApp(root, config) {
    this.root = root;
    this.config = config;
    this.uid = config.itemLabel + "-" + Math.random().toString(36).slice(2);
    this.rows = [];
    this.filterOptions = {};
    this.state = features.createRulesSearchState(config);
  }

  RulesSearchApp.prototype.renderShell = function renderShell() {
    features.renderRulesSearchLayout(this.root, this.config, this.uid);
  };

  RulesSearchApp.prototype.cacheNodes = function cacheNodes() {
    this.appNode = this.root.querySelector(".rules-search-app");
    this.inputNode = this.root.querySelector('input[type="search"]');
    this.clearSearchNode = this.root.querySelector(".rules-search-clear");
    this.toggleNode = this.root.querySelector(".rules-filter-toggle");
    this.sortNode = this.root.querySelector(".rules-sort-field select");
    this.activeNode = this.root.querySelector(".rules-active-filters");
    this.filterGroupsNode = this.root.querySelector(".rules-filter-groups");
    this.resultsNode = this.root.querySelector(".rules-results");
    this.countNode = this.root.querySelector(".rules-result-count");
    this.clearAllNodes = this.root.querySelectorAll(".rules-clear-all, .rules-clear-all-sidebar");
  };

  RulesSearchApp.prototype.loadRows = async function loadRows() {
    return features.loadRulesRows(this.config);
  };

  RulesSearchApp.prototype.sortFilterValues = function sortFilterValues(values, filter) {
    if (!filter.order) {
      return values.sort(function (left, right) {
        return left.localeCompare(right);
      });
    }

    var order = new Map(filter.order.map(function (value, index) {
      return [value.toLowerCase(), index];
    }));

    return values.sort(function (left, right) {
      var leftIndex = order.has(left.toLowerCase()) ? order.get(left.toLowerCase()) : 999;
      var rightIndex = order.has(right.toLowerCase()) ? order.get(right.toLowerCase()) : 999;
      return leftIndex - rightIndex || left.localeCompare(right);
    });
  };

  RulesSearchApp.prototype.prepareRows = function prepareRows() {
    var app = this;

    this.rows.forEach(function (row) {
      row._searchText = app.config.searchFields.map(function (field) {
        return row[field] || "";
      }).join(" ").toLowerCase();
      row._filterValues = {};
      app.config.filters.forEach(function (filter) {
        var rawValues = typeof filter.values === "function" ? filter.values(row) : [];
        var values = Array.isArray(rawValues) ? rawValues : [rawValues];
        row._filterValues[filter.key] = helpers.dedupe(values);
      });
    });

    this.config.filters.forEach(function (filter) {
      var values = helpers.dedupe(app.rows.flatMap(function (row) {
        return row._filterValues[filter.key] || [];
      }));
      app.filterOptions[filter.key] = app.sortFilterValues(values, filter);
    });
  };

  RulesSearchApp.prototype.buildFilterControls = function buildFilterControls() {
    var app = this;

    this.filterGroupsNode.innerHTML = this.config.filters.map(function (filter) {
      var options = app.filterOptions[filter.key] || [];
      var body = options.length
        ? options.map(function (value, index) {
          var id = app.uid + "-" + filter.key + "-" + index;
          return '\
            <label class="rules-filter-option" for="' + escapeHtml(id) + '">\
              <input id="' + escapeHtml(id) + '" type="checkbox" value="' + escapeHtml(value) + '" data-filter-key="' + escapeHtml(filter.key) + '">\
              <span>' + escapeHtml(features.activeRulesValueLabel(filter.key, value)) + "</span>\
            </label>";
        }).join("")
        : '<p class="rules-filter-empty">No values found.</p>';

      return '\
        <fieldset class="rules-filter-group">\
          <legend>' + escapeHtml(filter.label) + '</legend>\
          <div class="rules-filter-options">' + body + "</div>\
        </fieldset>";
    }).join("");
  };

  RulesSearchApp.prototype.readUrlState = function readUrlState() {
    var params = new URLSearchParams(window.location.search);
    this.state.query = params.get("q") || "";

    var requestedSort = params.get("sort");
    if (this.config.sorts.some(function (sort) { return sort.key === requestedSort; })) {
      this.state.sort = requestedSort;
    }

    var app = this;
    this.config.filters.forEach(function (filter) {
      var allowed = new Set(app.filterOptions[filter.key] || []);
      var selected = params.getAll(filter.key).filter(function (value) {
        return allowed.has(value);
      });
      app.state.filters[filter.key] = new Set(selected);
    });
  };

  RulesSearchApp.prototype.applyStateToControls = function applyStateToControls() {
    this.inputNode.value = this.state.query;
    this.sortNode.value = this.state.sort;

    this.root.querySelectorAll("[data-filter-key]").forEach(function (input) {
      var key = input.dataset.filterKey;
      input.checked = Boolean(this.state.filters[key] && this.state.filters[key].has(input.value));
    }, this);
  };

  RulesSearchApp.prototype.clearAll = function clearAll() {
    var app = this;
    this.state.query = "";
    this.state.sort = this.config.sorts[0].key;
    this.config.filters.forEach(function (filter) {
      app.state.filters[filter.key] = new Set();
    });
    this.applyStateToControls();
    this.render();
  };

  RulesSearchApp.prototype.matchesQuery = function matchesQuery(row) {
    var query = helpers.normalizeLower(this.state.query);
    if (!query) {
      return true;
    }

    return query.split(/\s+/).every(function (term) {
      return row._searchText.includes(term);
    });
  };

  RulesSearchApp.prototype.matchesFilters = function matchesFilters(row) {
    var app = this;
    return this.config.filters.every(function (filter) {
      var selected = app.state.filters[filter.key];
      if (!selected || selected.size === 0) {
        return true;
      }

      var values = new Set(row._filterValues[filter.key] || []);
      return Array.from(selected).some(function (value) {
        return values.has(value);
      });
    });
  };

  RulesSearchApp.prototype.sortedRows = function sortedRows(rows) {
    var sort = this.config.sorts.find(function (entry) {
      return entry.key === this.state.sort;
    }, this) || this.config.sorts[0];

    return Array.from(rows).sort(sort.compare);
  };

  RulesSearchApp.prototype.renderActiveFilters = function renderActiveFilters() {
    var chips = [];
    var app = this;

    if (this.state.query) {
      chips.push('<button class="chip rules-active-chip" type="button" data-chip-type="query">Search: ' + escapeHtml(this.state.query) + ' <span>x</span></button>');
    }

    this.config.filters.forEach(function (filter) {
      Array.from(app.state.filters[filter.key] || []).sort(function (left, right) {
        return left.localeCompare(right);
      }).forEach(function (value) {
        chips.push('<button class="chip rules-active-chip" type="button" data-chip-type="filter" data-filter-key="' + escapeHtml(filter.key) + '" data-filter-value="' + escapeHtml(value) + '">' + escapeHtml(features.activeRulesValueLabel(filter.key, value)) + ' <span>x</span></button>');
      });
    });

    this.activeNode.innerHTML = chips.length ? chips.join("") : '<span class="rules-active-empty">No active filters</span>';
  };

  RulesSearchApp.prototype.writeUrlState = function writeUrlState() {
    var params = new URLSearchParams();
    var app = this;

    if (this.state.query) {
      params.set("q", this.state.query);
    }

    if (this.state.sort !== this.config.sorts[0].key) {
      params.set("sort", this.state.sort);
    }

    this.config.filters.forEach(function (filter) {
      Array.from(app.state.filters[filter.key] || []).sort(function (left, right) {
        return left.localeCompare(right);
      }).forEach(function (value) {
        params.append(filter.key, value);
      });
    });

    var query = params.toString();
    var nextUrl = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
    window.history.replaceState(null, "", nextUrl);
  };

  RulesSearchApp.prototype.render = function render() {
    var app = this;
    var rows = this.sortedRows(this.rows.filter(function (row) {
      return app.matchesQuery(row) && app.matchesFilters(row);
    }));

    this.countNode.textContent = rows.length.toLocaleString() + " " + this.config.itemLabel + (rows.length === 1 ? "" : "s") + " found";
    this.clearSearchNode.hidden = !this.state.query;
    this.sortNode.value = this.state.sort;
    this.renderActiveFilters();
    this.writeUrlState();

    if (!rows.length) {
      this.resultsNode.innerHTML = '<div class="rules-search-empty">No results found.</div>';
      return;
    }

    this.resultsNode.innerHTML = rows.map(function (row) {
      return app.config.render(row);
    }).join("");
  };

  RulesSearchApp.prototype.init = async function init() {
    this.renderShell();
    this.cacheNodes();

    try {
      this.rows = await this.loadRows();
      this.prepareRows();
      this.buildFilterControls();
      this.readUrlState();
      this.applyStateToControls();
      features.bindRulesSearchEvents(this);
      this.render();
    } catch (error) {
      console.error("Error loading " + this.config.title + ":", error);
      this.resultsNode.innerHTML = '<div class="rules-search-empty">Unable to load ' + escapeHtml(this.config.itemLabel) + " data.</div>";
      this.countNode.textContent = "Data failed to load.";
    }
  };

  function bootRulesSearchPage() {
    document.querySelectorAll("[data-rules-search]").forEach(function (root) {
      var baseConfig = features.rulesSearchConfigs[root.dataset.rulesSearch];
      if (!baseConfig) {
        return;
      }
      var config = { ...baseConfig };

      if (root.dataset.rulesCatalogBasePath) {
        config.catalogBasePaths = [root.dataset.rulesCatalogBasePath];
      }
      if (root.dataset.rulesCsvPath) {
        config.csvPaths = [root.dataset.rulesCsvPath];
      }

      var app = new RulesSearchApp(root, config);
      app.init();
    });
  }

  global.EldoriaRulesSearch = {
    CONFIGS: features.rulesSearchConfigs,
    RulesSearch: RulesSearchApp,
    parseCSV: features.parseRulesCsv
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootRulesSearchPage, { once: true });
  } else {
    bootRulesSearchPage();
  }
}(window));

