// generated from site-src/app/features/world-map/** - do not edit
// Source: site-src/app/features/world-map/**

// app/features/world-map/map-config-reader.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function readJsonConfig(scriptId) {
    var script = document.getElementById(scriptId);
    if (!script) {
      throw new Error("Missing map config script: " + scriptId);
    }

    return JSON.parse(script.textContent || "{}");
  }

  features.readWorldMapConfig = function readWorldMapConfig(root) {
    var configScriptId = root.dataset.mapConfigId || "world-map-config";
    var config = readJsonConfig(configScriptId);

    return {
      rootId: root.id || "map",
      coordsOutputId: root.dataset.coordsOutputId || "coords-output",
      imagePath: config.imagePath || "",
      markers: Array.isArray(config.markers) ? config.markers : []
    };
  };
}(window));

// app/features/world-map/render-static-map-fallback.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function updateCoordinateOutput(outputId, text) {
    var output = document.getElementById(outputId);
    if (output) {
      output.textContent = text;
    }
  }

  function renderPopup(popup, marker) {
    popup.replaceChildren();

    var heading = document.createElement("h3");
    heading.textContent = marker.name;

    var description = document.createElement("p");
    description.textContent = marker.description;

    var link = document.createElement("a");
    link.href = marker.link;
    link.textContent = "View Notes";

    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.addEventListener("click", function () {
      popup.hidden = true;
    });

    popup.append(heading, description, link, close);
    popup.hidden = false;
  }

  features.renderStaticMapFallback = function renderStaticMapFallback(config) {
    var mapElement = document.getElementById(config.rootId);
    if (!mapElement) {
      return;
    }

    mapElement.classList.add("map-fallback");

    var stage = document.createElement("div");
    stage.className = "map-fallback-stage";

    var image = document.createElement("img");
    image.className = "map-fallback-image";
    image.src = config.imagePath;
    image.alt = "Eldoria world map";

    var popup = document.createElement("div");
    popup.className = "map-fallback-popup";
    popup.hidden = true;

    stage.append(image, popup);
    mapElement.replaceChildren(stage);

    config.markers.forEach(function (marker) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "map-fallback-marker";
      button.style.top = (marker.position[0] * 100) + "%";
      button.style.left = (marker.position[1] * 100) + "%";
      button.textContent = marker.name;
      button.setAttribute("aria-label", marker.name);
      button.addEventListener("click", function () {
        renderPopup(popup, marker);
      });
      stage.append(button);
    });

    stage.addEventListener("mousemove", function (event) {
      var rect = stage.getBoundingClientRect();
      var yPercent = ((event.clientY - rect.top) / rect.height).toFixed(3);
      var xPercent = ((event.clientX - rect.left) / rect.width).toFixed(3);
      updateCoordinateOutput(config.coordsOutputId, "[" + yPercent + ", " + xPercent + "]");
    });
  };
}(window));

// app/features/world-map/render-map-markers.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  features.renderWorldMapMarkers = function renderWorldMapMarkers(map, markers, height, width) {
    markers.forEach(function (marker) {
      var y = marker.position[0] * height;
      var x = marker.position[1] * width;

      var leafletMarker = L.marker([y, x], {
        alt: marker.name,
        keyboard: true,
        title: marker.name
      }).addTo(map);
      var container = document.createElement("div");

      var heading = document.createElement("h3");
      heading.textContent = marker.name;
      container.appendChild(heading);

      var description = document.createElement("p");
      description.textContent = marker.description;
      container.appendChild(description);

      var link = document.createElement("a");
      link.href = marker.link;
      link.target = "_blank";
      link.textContent = "View Notes";
      container.appendChild(link);

      leafletMarker.bindPopup(container);
    });
  };
}(window));

// app/features/world-map/create-leaflet-map.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function renderMapStatus(mapElement, message, kind) {
    var status = document.createElement("div");
    status.className = "map-status map-status--" + kind;
    status.setAttribute("role", kind === "error" ? "alert" : "status");
    status.textContent = message;
    mapElement.appendChild(status);
    return status;
  }

  function updateCoordinateOutput(outputId, latitude, longitude, height, width) {
    var output = document.getElementById(outputId);
    if (!output) {
      return;
    }

    var yPercent = (latitude / height).toFixed(3);
    var xPercent = (longitude / width).toFixed(3);
    output.textContent = "[" + yPercent + ", " + xPercent + "]";
  }

  function bindCoordinateDisplay(map, config, height, width) {
    map.on("mousemove", function (event) {
      updateCoordinateOutput(
        config.coordsOutputId,
        event.latlng.lat,
        event.latlng.lng,
        height,
        width
      );
    });
  }

  features.createLeafletWorldMap = function createLeafletWorldMap(config) {
    if (typeof L === "undefined") {
      return false;
    }

    var map = L.map(config.rootId, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2
    });

    var mapElement = document.getElementById(config.rootId);
    var loadingStatus = renderMapStatus(mapElement, "Loading world map…", "loading");

    var image = new Image();
    image.src = config.imagePath;
    image.onload = function () {
      var width = image.width;
      var height = image.height;
      var bounds = [[0, 0], [height, width]];

      L.imageOverlay(config.imagePath, bounds).addTo(map);
      map.fitBounds(bounds);
      features.renderWorldMapMarkers(map, config.markers, height, width);
      bindCoordinateDisplay(map, config, height, width);
      loadingStatus.remove();
    };

    image.onerror = function () {
      loadingStatus.remove();
      renderMapStatus(mapElement, "The world map image could not be loaded. Please refresh and try again.", "error");
    };

    mapElement.style.backgroundColor = "rgb(17, 22, 27)";

    return true;
  };
}(window));

// app/features/world-map/boot-world-map-page.js
(function (global) {
  var features = global.EldoriaFeatureSource = global.EldoriaFeatureSource || {};

  function bootWorldMapPage() {
    var root = document.querySelector("[data-world-map-root]");
    if (!root) {
      return;
    }

    var config = features.readWorldMapConfig(root);
    var startedLeaflet = features.createLeafletWorldMap(config);
    if (!startedLeaflet) {
      features.renderStaticMapFallback(config);
    }
  }

  global.EldoriaWorldMap = {
    boot: bootWorldMapPage
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWorldMapPage, { once: true });
  } else {
    bootWorldMapPage();
  }
}(window));

