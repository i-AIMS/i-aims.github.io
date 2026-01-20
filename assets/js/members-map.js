(async function initMembersMap() {
  const mapEl = document.getElementById("members-map");
  if (!mapEl) return;

  const map = L.map("members-map", {
    scrollWheelZoom: false,
    worldCopyJump: true
  }).setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  // Load members
  let members = [];
  try {
    const res = await fetch("/assets/data/members.json");
    members = await res.json();
  } catch (e) {
    console.error("Failed to load members.json", e);
    return;
  }

  // Count members per country
  const counts = {};
  members.forEach(m => {
    if (!m.country) return;
    counts[m.country] = (counts[m.country] || 0) + 1;
  });

  // Load and simplify world GeoJSON. Take from Public domain source (https://github.com/datasets/geo-countries).
  let world;
  try {
    const res = await fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson");
    const rawWorld = await res.json();

    // Simplify polygons: keep every Nth coordinate to reduce complexity
    const simplifyCoordinates = (coords, step = 3) =>
      coords.map(ring => ring.filter((_, i) => i % step === 0));

    const simplifyFeature = (feature) => {
      const geom = feature.geometry;
      if (geom.type === "Polygon") {
        feature.geometry.coordinates = simplifyCoordinates(geom.coordinates);
      } else if (geom.type === "MultiPolygon") {
        feature.geometry.coordinates = geom.coordinates.map(poly =>
          simplifyCoordinates(poly)
        );
      }
      return feature;
    };

    world = {
      ...rawWorld,
      features: rawWorld.features.map(simplifyFeature)
    };
  } catch (e) {
    console.error("Failed to load world GeoJSON", e);
    return;
  }

  // Styling function
  function countryStyle(feature) {
    const countryName = feature.properties.name;
    const count = counts[countryName] || 0;

    return {
      fillColor: count > 0 ? "#1fa4a9" : "#f0f0f0",
      weight: 0.8,
      color: "#ffffff",
      fillOpacity: count > 0 ? 0.85 : 0
    };
  }

  // Hover interaction
  function onEachCountry(feature, layer) {
    const country = feature.properties.name;
    const count = counts[country] || 0;

    if (count > 0) {
      layer.bindTooltip(
        `<strong>${country}</strong><br>${count} member${count > 1 ? "s" : ""}`,
        { sticky: true }
      );
    }
  }

  // Add GeoJSON layer
  L.geoJSON(world, {
    style: countryStyle,
    onEachFeature: onEachCountry
  }).addTo(map);
})();
