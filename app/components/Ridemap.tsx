'use client'
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

interface Props {
  coordinates: Coordinate[];
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
      zoom: 14,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    mapRef.current.on("load", () => {
      mapRef.current!.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [] },
          properties: {},
        },
      });

      mapRef.current!.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#00d4ff", "line-width": 4 },
      });
    });

    return () => mapRef.current?.remove();
  }, []);

  useEffect(() => {
    if (!mapRef.current || coordinates.length === 0) return;

    const lngLats = coordinates.map((c) => [c.lng, c.lat]);

    const source = mapRef.current.getSource("route") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: lngLats },
        properties: {},
      });
    }

    const latest = coordinates[coordinates.length - 1];
    const lngLat: [number, number] = [latest.lng, latest.lat];

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#ff4d4d" })
        .setLngLat(lngLat)
        .addTo(mapRef.current!);
    } else {
      markerRef.current.setLngLat(lngLat);
    }

    mapRef.current.easeTo({ center: lngLat, duration: 500 });
  }, [coordinates]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: "100%",
        height: "400px",
        borderRadius: "12px",
        marginBottom: "2rem",
        overflow: "hidden"
      }}
    />
  );
}