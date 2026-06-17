// Shared rules-search engine.
// Provides the search constants, API catalog loading, layout rendering,
// event binding, shared config helpers, and the RulesSearchApp boot logic.
// Per-kind config files (item-search.js, spell-search.js, ...) register their
// config onto features.rulesSearchConfigs and reuse features.rulesSearchHelpers.
// Load this BEFORE the per-kind search script on each page.

// rules-search-constants
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

// load-rules-api-catalog
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function loadScriptFromCandidates(paths, globalName) {
    if (global[globalName]) {
      return Promise.resolve(global[globalName]);
    }

    return new Promise(function (resolve, reject) {
      var errors = [];

      function tryNext(index) {
        if (global[globalName]) {
          resolve(global[globalName]);
          return;
        }

        if (index >= paths.length) {
          reject(new Error("Unable to load " + globalName + ": " + errors.join("; ")));
          return;
        }

        var script = document.createElement("script");
        script.src = paths[index];
        script.onload = function () {
          if (global[globalName]) {
            resolve(global[globalName]);
            return;
          }
          errors.push(paths[index] + ": global not found");
          tryNext(index + 1);
        };
        script.onerror = function () {
          errors.push(paths[index] + ": load failed");
          tryNext(index + 1);
        };
        document.head.appendChild(script);
      }

      tryNext(0);
    });
  }

  features.ensureRulesCatalogWidgetData = async function ensureRulesCatalogWidgetData() {
    if (global.RulesCatalogWidgetData) {
      return global.RulesCatalogWidgetData;
    }

    if (!features._rulesCatalogWidgetDataPromise) {
      features._rulesCatalogWidgetDataPromise = loadScriptFromCandidates([
        "../../assets/rules-catalog-widget-data.js",
        "../assets/rules-catalog-widget-data.js",
        "/assets/rules-catalog-widget-data.js"
      ], "RulesCatalogWidgetData");
    }

    return features._rulesCatalogWidgetDataPromise;
  };

  async function importApiClientModule(config) {
    if (features._eldoriaApiClientModulePromise) {
      return features._eldoriaApiClientModulePromise;
    }

    var paths = [
      config.apiClientPath,
      global.ELDORIA_API_CLIENT_PATH,
      "../../api/apiClient/index.js",
      "../api/apiClient/index.js",
      "/api/apiClient/index.js"
    ].filter(Boolean);

    features._eldoriaApiClientModulePromise = (async function () {
      var errors = [];
      for (var index = 0; index < paths.length; index += 1) {
        try {
          return await import(paths[index]);
        } catch (error) {
          errors.push(paths[index] + ": " + error.message);
        }
      }
      throw new Error("Unable to import Eldoria API client: " + errors.join("; "));
    }());

    return features._eldoriaApiClientModulePromise;
  }

  async function createApiClient(config) {
    var module = await importApiClientModule(config);
    return module.createEldoriaApiClient({
      baseUrl: config.apiBaseUrl || global.ELDORIA_API_BASE_URL || "/api",
      functionKey: config.apiFunctionKey || global.ELDORIA_API_FUNCTION_KEY || ""
    });
  }

  function catalogFieldName(kind) {
    if (kind === "item-properties") return "itemProperties";
    if (kind === "magic-variants") return "magicVariants";
    return kind.replace(/-([a-z])/g, function (_match, letter) {
      return letter.toUpperCase();
    });
  }

  function catalogKindsForRows(kind) {
    if (kind === "items") {
      return ["items"];
    }
    return [kind];
  }

  features.loadRulesRows = async function loadRulesRows(config) {
    var kind = config.dataKind || config.itemLabel;
    var RulesCatalogWidgetData = await features.ensureRulesCatalogWidgetData();
    var api = await createApiClient(config);
    var catalogs = {};

    for (var index = 0; index < catalogKindsForRows(kind).length; index += 1) {
      var catalogKind = catalogKindsForRows(kind)[index];
      var response = await api.listCatalogFull(catalogKind);
      var key = catalogKind;
      var field = catalogFieldName(catalogKind);
      catalogs[key] = {};
      catalogs[key][field] = Array.isArray(response.items) ? response.items : [];
      catalogs[key].counts = { [field]: catalogs[key][field].length };
      if (catalogKind === "items") {
        catalogs[key].counts.preGeneratedCombinations = catalogs[key][field].length;
      }
    }

    var rows = RulesCatalogWidgetData.getDefault().catalogsToRows(kind, catalogs);
    if (!Array.isArray(rows) || !rows.length) {
      throw new Error("No " + kind + " rows returned by the API.");
    }
    return rows;
  };
}(window));

// create-rules-search-state
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

// render-rules-search-layout
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

// bind-rules-search-events
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

// rules-search-helpers — shared building blocks reused by every per-kind config
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

  features.activeRulesValueLabel = function activeRulesValueLabel(key, value) {
    if (key === "concentration") return value === "Yes" ? "Concentration" : "No concentration";
    if (key === "ritual") return value === "Yes" ? "Ritual" : "Not ritual";
    if (key === "attunement") return value === "Required" ? "Attunement required" : "No attunement";
    return value;
  };

  features.rulesSearchHelpers = {
    escapeHtml: escapeHtml,
    escapeRegex: escapeRegex,
    slugify: slugify,
    titleCase: titleCase,
    normalize: normalize,
    normalizeLower: normalizeLower,
    dedupe: dedupe,
    splitList: splitList,
    stripSourceSuffix: stripSourceSuffix,
    fieldValue: fieldValue,
    fieldList: fieldList,
    sourceValues: sourceValues,
    yesNo: yesNo,
    abilityValues: abilityValues,
    compareText: compareText,
    orderCompare: orderCompare,
    detailRow: detailRow,
    renderDetails: renderDetails
  };

  // Registry the per-kind config files populate (item-search.js, spell-search.js, ...).
  features.rulesSearchConfigs = features.rulesSearchConfigs || {};
}(window));

// boot-rules-search-page
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

      var app = new RulesSearchApp(root, config);
      app.init();
    });
  }

  global.EldoriaRulesSearch = {
    CONFIGS: features.rulesSearchConfigs,
    RulesSearch: RulesSearchApp,
    boot: bootRulesSearchPage
  };

  // Boot once the DOM is parsed. Pages load shared-search.js + a per-kind config
  // script with `defer`, so DOMContentLoaded fires after every config has
  // registered onto features.rulesSearchConfigs.
  if (document.readyState === "complete") {
    bootRulesSearchPage();
  } else {
    document.addEventListener("DOMContentLoaded", bootRulesSearchPage, { once: true });
  }
}(window));
