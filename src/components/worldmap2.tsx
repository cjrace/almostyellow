"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { Switch } from "@mantine/core";
import "leaflet/dist/leaflet.css";

// List of countries to highlight
const camCountries = [
  "Canada",
  "United States of America",
  "Peru",
  "United Kingdom",
  "Norway",
  "Sweden",
  "Belgium",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Switzerland",
  "Czechia",
  "Austria",
  "Slovenia",
  "San Marino",
  "Croatia",
  "Bosnia and Herzegovina",
  "Hungary",
  "Slovakia",
  "Greece",
  "Bulgaria",
  "Netherlands",
  "Andorra",
  "Monaco",
  "Liechtenstein",
  "Luxembourg",
  "Poland",
  "Ireland",
  "Australia",
  "New Zealand",
];

const lauraCountries = [
  "Brazil",
  "Argentina",
  "Chile",
  "Mexico",
  "India",
  "China",
  "Japan",
  "South Korea",
  "South Africa",
  "Egypt",
  "Russia",
  "Ukraine",
  "Poland",
  "Portugal",
  "Denmark",
  "Finland",
  "Iceland",
  "Ireland",
  "Turkey",
  "Iran",
  "Saudi Arabia",
  "Indonesia",
  "Thailand",
  "Vietnam",
  "Philippines",
];

const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

const orangeStyle = {
  fillColor: "#FFA500",
  color: "#FFA500",
  weight: 1,
  fillOpacity: 0.7,
};

const yellowStyle = {
  fillColor: "#FFFF00",
  color: "#FFFF00",
  weight: 1,
  fillOpacity: 0.7,
};

const defaultStyle = {
  fillColor: "#e0e0e0",
  color: "#888",
  weight: 1,
  fillOpacity: 0.3,
};

function getCountryName(feature: any) {
  return feature.properties.name || "";
}

const WorldMap: React.FC = () => {
  const [geoData, setGeoData] = React.useState<any>(null);
  const [highlightList, setHighlightList] = React.useState<"cam" | "laura">(
    "cam",
  );

  useEffect(() => {
    fetch(WORLD_GEOJSON_URL)
      .then((res) => res.json())
      .then(setGeoData);
  }, []);

  // Style function for GeoJSON
  function style(feature: any) {
    const name = getCountryName(feature);
    if (highlightList === "cam" && camCountries.includes(name)) {
      return orangeStyle;
    }
    if (highlightList === "laura" && lauraCountries.includes(name)) {
      return yellowStyle;
    }
    return defaultStyle;
  }

  // Optional: highlight on hover
  function onEachFeature(feature: any, layer: any) {
    layer.on({
      mouseover: () => {
        layer.setStyle({
          weight: 2,
          color: highlightList === "cam" ? "#ff7800" : "#cccc00",
          fillOpacity: 0.9,
        });
      },
      mouseout: () => {
        layer.setStyle(style(feature));
      },
      click: () => {
        layer.bindPopup(getCountryName(feature)).openPopup();
      },
    });
  }

  // Only render the map on the client side
  if (typeof window === "undefined") {
    return null;
  }

  return (
    <>
      <div style={{ height: "600px", width: "100%", margin: "2rem 0" }}>
        <div style={{ maxWidth: 300, marginBottom: 16 }}></div>
        <label style={{ fontWeight: 500, marginBottom: 8, display: "block" }}>
          Highlight countries
        </label>
        <div>
          <label
            style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
          >
            <Switch
              checked={highlightList === "cam"}
              onChange={() => setHighlightList("cam")}
              label="Cam's Countries (Orange)"
              color="orange"
              style={{ marginRight: 8 }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center" }}>
            <Switch
              checked={highlightList === "laura"}
              onChange={() => setHighlightList("laura")}
              label="Laura's Countries (Yellow)"
              color="yellow"
              style={{ marginRight: 8 }}
            />
          </label>
        </div>
      </div>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />
        {geoData && (
          <GeoJSON data={geoData} style={style} onEachFeature={onEachFeature} />
        )}
      </MapContainer>
    </>
  );
};

export default WorldMap;
