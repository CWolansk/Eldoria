// generated from site-src/app/features/references/** - do not edit
// Source: site-src/app/features/references/**

// app/features/references/load-location-index.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  async function createApiClient() {
    if (!features._referencePagesApiClientPromise) {
      features._referencePagesApiClientPromise = (async function () {
        var module = await import(global.ELDORIA_API_CLIENT_PATH || "../api/apiClient/index.js");
        return module.createEldoriaApiClient({
          baseUrl: global.ELDORIA_API_BASE_URL || "/api",
          functionKey: global.ELDORIA_API_FUNCTION_KEY || ""
        });
      }());
    }

    return features._referencePagesApiClientPromise;
  }

  features.loadLocationIndex = async function loadLocationIndex() {
    return (await createApiClient()).getLocationIndex();
  };
}(window));

// app/features/references/render-location-reference.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function createSubLocationList(subLocations) {
    if (!Array.isArray(subLocations) || subLocations.length === 0) {
      return null;
    }

    var list = document.createElement("ul");
    list.className = "sub-locations";

    subLocations.forEach(function (subLocation) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.textContent = subLocation.name;
      link.href = subLocation.href;
      item.appendChild(link);
      list.appendChild(item);
    });

    return list;
  }

  function createLocationCard(locationName, locationData) {
    var card = document.createElement("div");
    card.className = "location-card";
    card.dataset.location = locationName.toLowerCase();

    var heading = document.createElement("h3");
    var link = document.createElement("a");
    link.textContent = locationName;
    link.href = locationData.href;
    heading.appendChild(link);
    card.appendChild(heading);

    var subLocations = createSubLocationList(locationData.subLocations);
    if (subLocations) {
      card.appendChild(subLocations);
    }

    return card;
  }

  function createRegionSection(regionName, regionData) {
    var regionSection = document.createElement("div");
    regionSection.className = "region-section";
    regionSection.dataset.region = regionName.toLowerCase();

    var title = document.createElement("h2");
    title.className = "region-title";
    title.innerHTML = regionName + ' <span class="toggle-icon">x</span>';
    regionSection.appendChild(title);

    var locationGrid = document.createElement("div");
    locationGrid.className = "location-grid";

    Object.entries(regionData.locations || {}).forEach(function (entry) {
      locationGrid.appendChild(createLocationCard(entry[0], entry[1]));
    });

    regionSection.appendChild(locationGrid);
    return regionSection;
  }

  features.renderLocationReference = function renderLocationReference(container, indexData) {
    container.innerHTML = "";

    if (!indexData || Object.keys(indexData).length === 0) {
      container.innerHTML = '<div class="no-results">No locations found. Run <code>node scripts/generate-public-index.js</code> to generate the index.</div>';
      return;
    }

    Object.entries(indexData).forEach(function (entry) {
      container.appendChild(createRegionSection(entry[0], entry[1]));
    });
  };
}(window));

// app/features/references/bind-location-search.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function toggleLocationRegion(regionSection) {
    var grid = regionSection.querySelector(".location-grid");
    var icon = regionSection.querySelector(".toggle-icon");

    if (!grid || !icon) {
      return;
    }

    if (grid.style.display === "none") {
      grid.style.display = "grid";
      icon.classList.remove("collapsed");
      return;
    }

    grid.style.display = "none";
    icon.classList.add("collapsed");
  }

  features.bindLocationReference = function bindLocationReference(root) {
    var searchBox = root.querySelector("#searchBox");
    var container = root.querySelector("#locationContainer");

    container.addEventListener("click", function (event) {
      var title = event.target.closest(".region-title");
      if (!title) {
        return;
      }

      toggleLocationRegion(title.closest(".region-section"));
    });

    searchBox.addEventListener("input", function (event) {
      var searchTerm = event.target.value.toLowerCase();
      var regions = root.querySelectorAll(".region-section");

      regions.forEach(function (region) {
        var cards = region.querySelectorAll(".location-card");
        var regionHasVisible = false;

        cards.forEach(function (card) {
          var allText = card.textContent.toLowerCase();
          if (allText.includes(searchTerm)) {
            card.style.display = "";
            regionHasVisible = true;
          } else {
            card.style.display = "none";
          }
        });

        var grid = region.querySelector(".location-grid");
        var icon = region.querySelector(".toggle-icon");
        if (searchTerm && regionHasVisible && grid && icon) {
          grid.style.display = "grid";
          icon.classList.remove("collapsed");
        }

        region.style.display = regionHasVisible || !searchTerm ? "" : "none";
      });
    });
  };
}(window));

// app/features/references/boot-location-reference-page.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  async function bootLocationReferencePage() {
    var root = document.querySelector('[data-reference-page="locations"]');
    if (!root) {
      return;
    }

    var container = root.querySelector("#locationContainer");
    try {
      var indexData = await features.loadLocationIndex();
      features.renderLocationReference(container, indexData);
      features.bindLocationReference(root);
    } catch (error) {
      console.error("Failed to load location index:", error);
      container.innerHTML = '<div class="no-results">Unable to load the location index.</div>';
    }
  }

  global.EldoriaLocationReference = {
    boot: bootLocationReferencePage
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bootLocationReferencePage();
    }, { once: true });
  } else {
    bootLocationReferencePage();
  }
}(window));

// app/features/references/load-npc-index.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  async function createApiClient() {
    if (!features._referencePagesApiClientPromise) {
      features._referencePagesApiClientPromise = (async function () {
        var module = await import(global.ELDORIA_API_CLIENT_PATH || "../api/apiClient/index.js");
        return module.createEldoriaApiClient({
          baseUrl: global.ELDORIA_API_BASE_URL || "/api",
          functionKey: global.ELDORIA_API_FUNCTION_KEY || ""
        });
      }());
    }

    return features._referencePagesApiClientPromise;
  }

  features.loadNpcIndex = async function loadNpcIndex() {
    return (await createApiClient()).getNpcIndex();
  };
}(window));

// app/features/references/render-npc-reference.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function createNpcList(locationData) {
    var list = document.createElement("ul");
    list.className = "npc-list";

    (locationData.npcs || []).forEach(function (npc) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.textContent = npc.name;
      link.href = npc.href || (locationData.basePath + npc.file);
      link.dataset.npcName = npc.name.toLowerCase();
      item.appendChild(link);
      list.appendChild(item);
    });

    return list;
  }

  function createLocationGroup(locationName, locationData) {
    var group = document.createElement("div");
    group.className = "location-group";
    group.dataset.location = locationName;

    var heading = document.createElement("h3");
    heading.className = "location-name";
    heading.textContent = locationName;
    group.appendChild(heading);
    group.appendChild(createNpcList(locationData));

    return group;
  }

  function createRegionSection(regionName, regionLocations) {
    var section = document.createElement("div");
    section.className = "region-section";
    section.dataset.region = regionName;

    var title = document.createElement("h2");
    title.className = "region-title";
    title.textContent = regionName;
    section.appendChild(title);

    Object.entries(regionLocations).forEach(function (entry) {
      var locationData = entry[1];
      if (Array.isArray(locationData.npcs) && locationData.npcs.length > 0) {
        section.appendChild(createLocationGroup(entry[0], locationData));
      }
    });

    return section.childElementCount > 1 ? section : null;
  }

  features.renderNpcReference = function renderNpcReference(container, indexData) {
    container.innerHTML = "";

    if (!indexData || Object.keys(indexData).length === 0) {
      container.innerHTML = '<div class="no-results">No NPCs found. Run <code>node scripts/generate-public-index.js</code> to generate the index.</div>';
      return;
    }

    var hasNpcs = false;
    Object.entries(indexData).forEach(function (entry) {
      var section = createRegionSection(entry[0], entry[1]);
      if (section) {
        hasNpcs = true;
        container.appendChild(section);
      }
    });

    if (!hasNpcs) {
      container.innerHTML = '<div class="no-results">No NPCs found.</div>';
    }
  };
}(window));

// app/features/references/bind-npc-search.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  features.bindNpcReference = function bindNpcReference(root) {
    var searchBox = root.querySelector("#searchBox");

    searchBox.addEventListener("input", function (event) {
      var searchTerm = event.target.value.toLowerCase();
      var regions = root.querySelectorAll(".region-section");

      regions.forEach(function (region) {
        var locations = region.querySelectorAll(".location-group");
        var regionHasVisible = false;

        locations.forEach(function (location) {
          var npcs = location.querySelectorAll(".npc-list li");
          var locationHasVisible = false;
          var locationName = location.dataset.location.toLowerCase();

          npcs.forEach(function (npc) {
            var npcLink = npc.querySelector("a");
            var npcName = npcLink.dataset.npcName;
            if (npcName.includes(searchTerm) || locationName.includes(searchTerm)) {
              npc.style.display = "";
              locationHasVisible = true;
            } else {
              npc.style.display = "none";
            }
          });

          location.style.display = locationHasVisible ? "" : "none";
          if (locationHasVisible) {
            regionHasVisible = true;
          }
        });

        region.style.display = regionHasVisible ? "" : "none";
      });
    });
  };
}(window));

// app/features/references/boot-npc-reference-page.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  async function bootNpcReferencePage() {
    var root = document.querySelector('[data-reference-page="npcs"]');
    if (!root) {
      return;
    }

    var container = root.querySelector("#npcContainer");
    try {
      var indexData = await features.loadNpcIndex();
      features.renderNpcReference(container, indexData);
      features.bindNpcReference(root);
    } catch (error) {
      console.error("Failed to load NPC index:", error);
      container.innerHTML = '<div class="no-results">Unable to load the NPC index.</div>';
    }
  }

  global.EldoriaNpcReference = {
    boot: bootNpcReferencePage
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bootNpcReferencePage();
    }, { once: true });
  } else {
    bootNpcReferencePage();
  }
}(window));
