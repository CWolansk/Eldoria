// app/features/references/load-npc-index.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  features.loadNpcIndex = async function loadNpcIndex() {
    var response = await fetch("../data/npc-index.json");
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    return response.json();
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