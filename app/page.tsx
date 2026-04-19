'use client'
import { useState } from "react";
import { useGPS } from "./hooks/useGPS";
import { calculateStats } from "./lib/rideStats";
import dynamic from "next/dynamic";

const RideMap = dynamic(() => import("./components/Map"), { ssr: false });

interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

function parseGPX(gpxText: string): Coordinate[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");
  const points = xml.querySelectorAll("trkpt");
  const coords: Coordinate[] = [];
  let time = Date.now();
  points.forEach((point) => {
    const lat = parseFloat(point.getAttribute("lat") || "0");
    const lng = parseFloat(point.getAttribute("lon") || "0");
    const timeEl = point.querySelector("time");
    const timestamp = timeEl ? new Date(timeEl.textContent || "").getTime() : time++;
    coords.push({ lat, lng, timestamp });
  });
  return coords;
}

export default function Home() {
  const { isTracking, coordinates, startTracking, stopTracking } = useGPS();
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [rideStartTime, setRideStartTime] = useState<Date | null>(null);
  const [gpxCoordinates, setGpxCoordinates] = useState<Coordinate[]>([]);
  const [gpxStats, setGpxStats] = useState<{ distance: string; duration: string; averageSpeed: string; } | null>(null);

  const activeCoordinates = gpxCoordinates.length > 0 ? gpxCoordinates : coordinates;
  const stats = coordinates.length > 1 ? calculateStats(coordinates, rideStartTime) : null;
  const displayStats = gpxStats || stats;

  const handleStart = () => {
    setRideStartTime(new Date());
    setGpxCoordinates([]);
    setGpxStats(null);
    setAiFeedback("");
    startTracking();
  };

  const handleStop = async () => {
    stopTracking();
    if (!stats) {
      setAiFeedback("Not enough GPS data collected. Try riding for longer before stopping.");
      return;
    }
    setLoadingFeedback(true);
    try {
      const res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stats),
      });
      const data = await res.json();
      setAiFeedback(data.feedback);
    } catch {
      setAiFeedback("Could not get feedback. Please try again.");
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleGPXUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiFeedback("");
    setGpxCoordinates([]);
    setGpxStats(null);

    const text = await file.text();
    const gpxCoords = parseGPX(text);

    if (gpxCoords.length < 2) {
      setAiFeedback("Could not read GPX file. Please try another file.");
      return;
    }

    const gpxStartTime = new Date(gpxCoords[0].timestamp);
    const calculated = calculateStats(gpxCoords, gpxStartTime);

    setGpxCoordinates(gpxCoords);
    setGpxStats(calculated);
    setLoadingFeedback(true);

    try {
      const res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calculated),
      });
      const data = await res.json();
      setAiFeedback(data.feedback);
    } catch {
      setAiFeedback("Could not get feedback. Please try again.");
    } finally {
      setLoadingFeedback(false);
    }
  };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 0.25rem" }}>AI Cycling Coach</h1>
      <p style={{ color: "#666", margin: "0 0 2rem" }}>Track your ride. Get coached by AI.</p>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <button onClick={handleStart} disabled={isTracking}
          style={{ padding: "0.75rem 1.5rem", background: "#22c55e", color: "#fff", border: "none", borderRadius: 8, fontSize: "1rem", cursor: "pointer", opacity: isTracking ? 0.4 : 1 }}>
          ▶ Start Ride
        </button>
        <button onClick={handleStop} disabled={!isTracking}
          style={{ padding: "0.75rem 1.5rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: "1rem", cursor: "pointer", opacity: !isTracking ? 0.4 : 1 }}>
          ■ Stop Ride
        </button>
        <label style={{ padding: "0.75rem 1.5rem", background: "#f59e0b", color: "#fff", borderRadius: 8, fontSize: "1rem", cursor: "pointer" }}>
          📂 Upload GPX
          <input type="file" accept=".gpx" onChange={handleGPXUpload} style={{ display: "none" }} />
        </label>
      </div>

      <RideMap coordinates={activeCoordinates} />

      {displayStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "#888" }}>DISTANCE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{displayStats.distance} km</div>
          </div>
          <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "#888" }}>DURATION</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{displayStats.duration} min</div>
          </div>
          <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "#888" }}>AVG SPEED</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{displayStats.averageSpeed} km/h</div>
          </div>
        </div>
      )}

      <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "1.5rem", border: "1px solid #bbf7d0" }}>
        <h2 style={{ color: "#15803d", margin: "0 0 1rem" }}>AI Coach Feedback</h2>
        {loadingFeedback && <p style={{ color: "#15803d", margin: 0 }}>Analysing your ride...</p>}
        {aiFeedback && <p style={{ lineHeight: 1.7, margin: 0 }}>{aiFeedback}</p>}
        {!aiFeedback && !loadingFeedback && (
          <p style={{ color: "#6b7280", fontStyle: "italic", margin: 0 }}>
            Start a live ride or upload a GPX file to get feedback.
          </p>
        )}
      </div>
    </main>
  );
}