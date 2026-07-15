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

  function unique(values) {
    var seen = new Set();
    return values.filter(function (value) {
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  function relativeToCurrentPage(path) {
    return new URL(path, window.location.href).href;
  }

  function apiClientCandidates(config) {
    return unique([
      config.apiClientPath,
      global.ELDORIA_API_CLIENT_PATH,
      relativeToCurrentPage("../../api/apiClient/index.js"),
      relativeToCurrentPage("../api/apiClient/index.js"),
      relativeToCurrentPage("api/apiClient/index.js"),
      "/api/apiClient/index.js"
    ].filter(Boolean));
  }

  function apiBaseUrl(config) {
    return config.apiBaseUrl
      || global.ELDORIA_API_BASE_URL
      || global.ELDORIA_SITE_CONFIG?.cloudApiBase
      || "/api";
  }

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
        "assets/rules-catalog-widget-data.js",
        "/assets/rules-catalog-widget-data.js"
      ], "RulesCatalogWidgetData");
    }

    return features._rulesCatalogWidgetDataPromise;
  };

  features.ensureEldoriaSiteConfig = async function ensureEldoriaSiteConfig() {
    if (global.ELDORIA_SITE_CONFIG || global.ELDORIA_API_BASE_URL) {
      return global.ELDORIA_SITE_CONFIG || {};
    }

    if (!features._eldoriaSiteConfigPromise) {
      features._eldoriaSiteConfigPromise = loadScriptFromCandidates([
        "../../site-assets/site-config.js",
        "../site-assets/site-config.js",
        "site-assets/site-config.js",
        "/site-assets/site-config.js"
      ], "ELDORIA_SITE_CONFIG").catch(function () {
        return {};
      });
    }

    return features._eldoriaSiteConfigPromise;
  };

  async function importApiClientModule(config) {
    if (features._eldoriaApiClientModulePromise) {
      return features._eldoriaApiClientModulePromise;
    }

    var paths = apiClientCandidates(config);

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
    await features.ensureEldoriaSiteConfig();
    var module = await importApiClientModule(config);
    return module.createEldoriaApiClient({
      baseUrl: apiBaseUrl(config),
      functionKey: config.apiFunctionKey || global.ELDORIA_API_FUNCTION_KEY || ""
    });
  }

  features.createRulesApiClient = createApiClient;

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

  features.loadRulesRows = async function loadRulesRows(config, stateOrQuery, options) {
    var kind = config.dataKind || config.itemLabel;
    var state = stateOrQuery && typeof stateOrQuery === "object" ? stateOrQuery : { query: stateOrQuery };
    var RulesCatalogWidgetData = await features.ensureRulesCatalogWidgetData();
    var api = await createApiClient(config);
    var catalogs = {};

    if (config.remoteSearch) {
      var query = String(state.query || "").trim();
      if (config.serverDriven && query && query.length < (config.minimumQueryLength || 2)) {
        return { rows: [], response: { tooShort: true, minimumQueryLength: config.minimumQueryLength || 2 } };
      }
      var queryOptions = { limit: config.remoteLimit || 200 };
      if (config.serverDriven) {
        queryOptions.sort = state.sort || "name";
        queryOptions.facets = true;
        if (options?.cursor) queryOptions.cursor = options.cursor;
        else if (Number(options?.skip) > 0) queryOptions.skip = Number(options.skip);
        (config.filters || []).forEach(function (filter) {
          var values = Array.from(state.filters?.[filter.key] || []);
          if (values.length) queryOptions[filter.key] = values;
        });
      }
      var response = typeof api.searchItems === "function" && kind === "items"
        ? await api.searchItems(query, queryOptions, { signal: options?.signal })
        : query
          ? await api.searchCatalog(kind, query, queryOptions)
          : await api.searchCatalog(kind, config.initialQuery || "a", queryOptions);
      var apiRows = Array.isArray(response.items) ? response.items : [];
      var rows = typeof config.mapApiRow === "function" ? apiRows.map(config.mapApiRow) : apiRows;
      return config.serverDriven ? { rows: rows, response: response } : rows;
    }

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
      filtersOpen: false,
      cursor: ""
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
            <button class="button button-secondary rules-load-more" type="button" hidden>Load More</button>\
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
        if (app.config.remoteSearch) {
          app.reloadRows();
          return;
        }
        app.render();
      }, app.config.remoteDebounceMs || 100);
    });

    app.clearSearchNode.addEventListener("click", function () {
      app.state.query = "";
      app.inputNode.value = "";
      app.inputNode.focus();
      if (app.config.remoteSearch) {
        app.reloadRows();
        return;
      }
      app.render();
    });

    app.sortNode.addEventListener("change", function () {
      app.state.sort = app.sortNode.value;
      if (app.config.serverDriven) {
        app.reloadRows();
        return;
      }
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

      if (app.config.serverDriven) {
        app.reloadRows();
        return;
      }
      app.render();
    });

    app.clearAllNodes.forEach(function (button) {
      button.addEventListener("click", function () {
        app.clearAll();
      });
    });

    app.loadMoreNode.addEventListener("click", function () {
      app.loadMore();
    });

    app.resultsNode.addEventListener("toggle", function (event) {
      var details = event.target.closest?.("details[data-catalog-id]");
      if (details?.open && app.config.loadDetail && !details.dataset.detailLoaded) {
        app.loadDetail(details);
      }
    }, true);

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

      if (app.config.serverDriven) {
        app.reloadRows();
        return;
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
    if (key === "attunement") return normalizeLower(value) === "required" ? "Attunement required" : "No attunement";
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
    this._hasMore = false;
    this._nextCursor = "";
    this._totalCount = 0;
    this._facetCounts = {};
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
    this.loadMoreNode = this.root.querySelector(".rules-load-more");
    this.clearAllNodes = this.root.querySelectorAll(".rules-clear-all, .rules-clear-all-sidebar");
  };

  RulesSearchApp.prototype.loadRows = async function loadRows(options) {
    return features.loadRulesRows(this.config, this.state, options || {});
  };

  RulesSearchApp.prototype.clearFilters = function clearFilters() {
    var app = this;
    this.config.filters.forEach(function (filter) {
      app.state.filters[filter.key] = new Set();
    });
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
      var existing = app.config.serverDriven ? (app.filterOptions[filter.key] || []) : [];
      var selected = Array.from(app.state.filters[filter.key] || []);
      app.filterOptions[filter.key] = app.sortFilterValues(helpers.dedupe(existing.concat(values, selected)), filter);
    });
  };

  RulesSearchApp.prototype.applyServerFacets = function applyServerFacets(facets) {
    var app = this;
    this._facetCounts = {};
    this.config.filters.forEach(function (filter) {
      var entries = Array.isArray(facets?.[filter.key]) ? facets[filter.key] : [];
      var existing = app.filterOptions[filter.key] || [];
      var selected = Array.from(app.state.filters[filter.key] || []);
      var available = entries.map(function (entry) { return entry.value; });
      app.filterOptions[filter.key] = app.sortFilterValues(helpers.dedupe(existing.concat(available, selected)), filter);
      app._facetCounts[filter.key] = new Map(entries.map(function (entry) { return [entry.value, Number(entry.count || 0)]; }));
    });
  };

  RulesSearchApp.prototype.buildFilterControls = function buildFilterControls() {
    var app = this;

    this.filterGroupsNode.innerHTML = this.config.filters.map(function (filter) {
      var options = app.filterOptions[filter.key] || [];
      var body = options.length
        ? options.map(function (value, index) {
          var id = app.uid + "-" + filter.key + "-" + index;
          var count = app._facetCounts?.[filter.key]?.get(value);
          var countLabel = Number.isFinite(count) ? ' <span class="rules-filter-count">(' + count.toLocaleString() + ")</span>" : "";
          return '\
            <label class="rules-filter-option" for="' + escapeHtml(id) + '">\
              <input id="' + escapeHtml(id) + '" type="checkbox" value="' + escapeHtml(value) + '" data-filter-key="' + escapeHtml(filter.key) + '">\
              <span>' + escapeHtml(features.activeRulesValueLabel(filter.key, value)) + countLabel + "</span>\
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
    this.state.query = "";
    this.state.sort = this.config.sorts[0].key;
    this.clearFilters();
    this.applyStateToControls();
    if (this.config.remoteSearch) {
      this.reloadRows();
      return;
    }
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

  RulesSearchApp.prototype.updateLoadMoreLabel = function updateLoadMoreLabel() {
    var remaining = Math.max(0, this._totalCount - this.rows.length);
    var batchSize = Math.min(Number(this.config.remoteLimit || 100), remaining);
    this.loadMoreNode.textContent = batchSize > 0 ? "Load " + batchSize.toLocaleString() + " more" : "Load More";
  };

  RulesSearchApp.prototype.render = function render() {
    var app = this;
    var rows = this.config.serverDriven ? this.rows : this.sortedRows(this.rows.filter(function (row) {
      return app.matchesQuery(row) && app.matchesFilters(row);
    }));

    this.countNode.textContent = this.config.serverDriven && this._totalCount > rows.length
      ? "Showing " + rows.length.toLocaleString() + " of " + this._totalCount.toLocaleString() + " " + this.config.itemLabel + "s"
      : rows.length.toLocaleString() + " " + this.config.itemLabel + (rows.length === 1 ? "" : "s") + " found";
    this.clearSearchNode.hidden = !this.state.query;
    this.sortNode.value = this.state.sort;
    this.renderActiveFilters();
    this.writeUrlState();
    this.loadMoreNode.hidden = !this.config.serverDriven || !this._hasMore;
    this.loadMoreNode.disabled = false;
    this.updateLoadMoreLabel();

    if (!rows.length) {
      this.resultsNode.innerHTML = this._tooShort
        ? '<div class="rules-search-empty">Type at least ' + Number(this.config.minimumQueryLength || 2) + ' characters.</div>'
        : '<div class="rules-search-empty">No results found.</div>';
      return;
    }

    this.resultsNode.innerHTML = rows.map(function (row) {
      return app.config.render(row);
    }).join("");
  };

  RulesSearchApp.prototype.applyLoadResult = function applyLoadResult(result, append) {
    if (!this.config.serverDriven) {
      this.rows = result;
      this.prepareRows();
      this.clearFilters();
      return;
    }
    var response = result?.response || {};
    var nextRows = result?.rows || [];
    this.rows = append ? this.rows.concat(nextRows.filter(function (row) {
      return !this.rows.some(function (existing) { return existing.Id && existing.Id === row.Id; });
    }, this)) : nextRows;
    this._tooShort = Boolean(response.tooShort);
    this._hasMore = Boolean(response.hasMore);
    this._nextCursor = String(response.nextCursor || "");
    this._nextSkip = Number(response.nextSkip || 0);
    this._totalCount = Number(response.totalCount ?? this.rows.length);
    if (response.facets && typeof response.facets === "object") {
      this.applyServerFacets(response.facets);
    } else {
      this.prepareRows();
      this._facetCounts = {};
      this.config.filters.forEach(function (filter) {
        var counts = new Map();
        this.rows.forEach(function (row) {
          (row._filterValues?.[filter.key] || []).forEach(function (value) {
            counts.set(value, (counts.get(value) || 0) + 1);
          });
        });
        this._facetCounts[filter.key] = counts;
      }, this);
    }
  };

  RulesSearchApp.prototype.reloadRows = async function reloadRows() {
    this._loadRequestId = (this._loadRequestId || 0) + 1;
    var requestId = this._loadRequestId;
    this._abortController?.abort();
    this._abortController = typeof AbortController === "function" ? new AbortController() : null;
    this._nextCursor = "";
    this._hasMore = false;
    this.countNode.textContent = "Loading " + this.config.itemLabel + " data...";
    this.resultsNode.innerHTML = "";
    this.loadMoreNode.hidden = true;

    try {
      var result = await this.loadRows({ signal: this._abortController?.signal });
      if (requestId !== this._loadRequestId) {
        return;
      }
      this.applyLoadResult(result, false);
      this.buildFilterControls();
      this.applyStateToControls();
      this.render();
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (requestId !== this._loadRequestId) {
        return;
      }
      console.error("Error loading " + this.config.title + ":", error);
      this.resultsNode.innerHTML = '<div class="rules-search-empty">Unable to load ' + escapeHtml(this.config.itemLabel) + " data.</div>";
      this.countNode.textContent = "Data failed to load.";
    }
  };

  RulesSearchApp.prototype.loadMore = async function loadMore() {
    if (!this.config.serverDriven || !this._hasMore || (!this._nextCursor && !this._nextSkip)) return;
    this.loadMoreNode.disabled = true;
    this.loadMoreNode.textContent = "Loading...";
    try {
      var result = await this.loadRows(this._nextCursor ? { cursor: this._nextCursor } : { skip: this._nextSkip });
      this.applyLoadResult(result, true);
      this.buildFilterControls();
      this.applyStateToControls();
      this.render();
    } catch (error) {
      console.error("Error loading more " + this.config.title + ":", error);
      this.countNode.textContent = "Unable to load more results.";
    } finally {
      this.updateLoadMoreLabel();
      this.loadMoreNode.disabled = false;
    }
  };

  RulesSearchApp.prototype.loadDetail = async function loadDetail(details) {
    details.dataset.detailLoaded = "loading";
    try {
      var raw = await this.config.loadDetail(details.dataset.catalogId);
      var row = this.config.mapApiRow(raw);
      var replacement = document.createRange().createContextualFragment(this.config.render(row)).firstElementChild;
      replacement.open = true;
      replacement.dataset.detailLoaded = "true";
      details.replaceWith(replacement);
    } catch (error) {
      details.dataset.detailLoaded = "error";
      console.warn("Unable to load item details:", error);
    }
  };

  RulesSearchApp.prototype.init = async function init() {
    this.renderShell();
    this.cacheNodes();

    var params = new URLSearchParams(window.location.search);
    this.state.query = params.get("q") || "";
    var requestedSort = params.get("sort");
    if (this.config.sorts.some(function (sort) { return sort.key === requestedSort; })) {
      this.state.sort = requestedSort;
    }
    if (this.config.serverDriven) {
      this.config.filters.forEach(function (filter) {
        this.state.filters[filter.key] = new Set(params.getAll(filter.key));
      }, this);
    }

    try {
      var result = await this.loadRows();
      this.applyLoadResult(result, false);
      this.buildFilterControls();
      if (!this.config.serverDriven) this.readUrlState();
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
