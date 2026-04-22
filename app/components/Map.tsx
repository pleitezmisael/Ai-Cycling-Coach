'use client'
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
  elevation?: number;
  heartRate?: number;
}

interface Props {
  coordinates: Coordinate[];
}

function haversine(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// Reduce to max N points
function downsample(coords: Coordinate[], max: number): Coordinate[] {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  return coords.filter((_, i) => i % step === 0);
}

export default function RideMap({ coordinates }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-118.35, 33.87],
      zoom: 12,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    return () => mapRef.current?.remove();
  }, []);

  useEffect(() => {
    if (!mapRef.current || coordinates.length < 2) return;
    const map = mapRef.current;

    const drawRoute = () => {
      // Remove old layers
      ["easy-layer", "moderate-layer", "hard-layer"].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      });

      // Downsample to max 150 points
      const sampled = downsample(coordinates, 150);

      // Calculate speeds
      const speeds: number[] = [];
      for (let i = 1; i < sampled.length; i++) {
        const dist = haversine(sampled[i - 1], sampled[i]);
        const timeDiff = (sampled[i].timestamp - sampled[i - 1].timestamp) / 3600000;
        const speed = timeDiff > 0 && timeDiff < 1 ? dist / timeDiff : 0;
        speeds.push(speed);
      }

      const validSpeeds = speeds.filter((s) => s > 0 && s < 100);
      const avgSpeed = validSpeeds.length > 0
        ? validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length
        : 15;

      // Split into 3 zone arrays
      const easyCoords: [number, number][][] = [];
      const modCoords: [number, number][][] = [];
      const hardCoords: [number, number][][] = [];

      let currentEasy: [number, number][] = [];
      let currentMod: [number, number][] = [];
      let currentHard: [number, number][] = [];

      for (let i = 1; i < sampled.length; i++) {
        const speed = speeds[i - 1] || 0;
        const from: [number, number] = [sampled[i - 1].lng, sampled[i - 1].lat];
        const to: [number, number] = [sampled[i].lng, sampled[i].lat];

        if (speed < avgSpeed * 0.7) {
          if (currentMod.length) { modCoords.push(currentMod); currentMod = []; }
          if (currentHard.length) { hardCoords.push(currentHard); currentHard = []; }
          currentEasy.push(from, to);
        } else if (speed < avgSpeed * 1.15) {
          if (currentEasy.length) { easyCoords.push(currentEasy); currentEasy = []; }
          if (currentHard.length) { hardCoords.push(currentHard); currentHard = []; }
          currentMod.push(from, to);
        } else {
          if (currentEasy.length) { easyCoords.push(currentEasy); currentEasy = []; }
          if (currentMod.length) { modCoords.push(currentMod); currentMod = []; }
          currentHard.push(from, to);
        }
      }

      if (currentEasy.length) easyCoords.push(currentEasy);
      if (currentMod.length) modCoords.push(currentMod);
      if (currentHard.length) hardCoords.push(currentHard);

      // Draw 3 sources — one per zone
      const zones = [
        { id: "easy-layer", coords: easyCoords, color: "#22c55e" },
        { id: "moderate-layer", coords: modCoords, color: "#f59e0b" },
        { id: "hard-layer", coords: hardCoords, color: "#ef4444" },
      ];

      zones.forEach(({ id, coords, color }) => {
        if (coords.length === 0) return;
        map.addSource(id, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: coords.map((line) => ({
              type: "Feature",
              geometry: { type: "LineString", coordinates: line },
              properties: {},
            })),
          },
        });
        map.addLayer({
          id,
          type: "line",
          source: id,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": color, "line-width": 4, "line-opacity": 0.9 },
        });
      });

      // Marker at end
      const latest = sampled[sampled.length - 1];
      const lngLat: [number, number] = [latest.lng, latest.lat];
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#ff4d4d" })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        markerRef.current.setLngLat(lngLat);
      }

      // Fit bounds
      const lngs = sampled.map((c) => c.lng);
      const lats = sampled.map((c) => c.lat);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)],
         [Math.max(...lngs), Math.max(...lats)]],
        { padding: 40, duration: 600 }
      );
    };

    if (map.isStyleLoaded()) {
      drawRoute();
    } else {
      map.once("load", drawRoute);
    }
  }, [coordinates]);

  return (
    <div style={{ position: "relative", marginBottom: "1rem" }}>
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "380px", borderRadius: "12px", overflow: "hidden" }}
      />
      {coordinates.length > 1 && (
        <div style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          background: "rgba(0,0,0,0.75)",
          borderRadius: 8,
          padding: "5px 10px",
          display: "flex",
          gap: "10px",
          fontSize: "11px",
          color: "#fff",
        }}>
          <span>🟢 Easy</span>
          <span>🟡 Moderate</span>
          <span>🔴 Hard</span>
        </div>
      )}
    </div>
  );
}