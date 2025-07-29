"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import * as topojson from "topojson-client";

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

export default function WorldMap() {
  const [selectedList, setSelectedList] = useState("cam");

  useEffect(() => {
    async function createMap() {
      const L = await import("leaflet");
      const map = L.map("map").setView([0, 0], 2);

      try {
        const response = await fetch("/world-topo.json");
        if (!response.ok) {
          throw new Error("Failed to fetch world-topo.json");
        }
        const worldTopo = await response.json();

        const worldGeojson = topojson.feature(
          worldTopo,
          worldTopo.objects.countries,
        );

        const countriesToColor =
          selectedList === "cam" ? camCountries : lauraCountries;

        L.geoJSON(worldGeojson, {
          style: (feature: any) => {
            if (countriesToColor.includes(feature.properties.name)) {
              return { fillColor: "orange", color: "black", weight: 1 };
            }
            return { fillColor: "white", color: "black", weight: 1 };
          },
        }).addTo(map);
      } catch (error) {
        console.error("Error loading GeoJSON:", error);
      }
    }

    createMap();

    return () => {
      const mapElement = document.getElementById("map");
      if (mapElement) {
        (mapElement as any)._leaflet_id && mapElement.remove();
      }
    };
  }, [selectedList]);

  return (
    <div>
      <select
        value={selectedList}
        onChange={(e) => setSelectedList(e.target.value)}
      >
        <option value="cam">Cam</option>
        <option value="laura">Laura</option>
      </select>
      <div id="map" style={{ height: "700px", width: "100%" }}></div>
    </div>
  );
}
