'use client'
import { useState } from "react";
import { useGPS } from "./hooks/useGPS";
import { calculateStats, RideStats } from "./lib/rideStats";
import dynamic from "next/dynamic";
import ProfileForm from "./components/ProfileForm";
import { RiderProfile, defaultProfile, loadProfile } from "./profile";

const RideMap = dynamic(() => import("./components/Map"), { ssr: false });

interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
  elevation?: number;
  heartRate?: number;
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
    const elevEl = point.querySelector("ele");
    const hrEl = point.querySelector("extensions hr, heartrate, hr");
    const timestamp = timeEl ? new Date(timeEl.textContent || "").getTime() : time++;
    const elevation = elevEl ? parseFloat(elevEl.textContent || "0") : 0;
    const heartRate = hrEl ? parseInt(hrEl.textContent || "0") : 0;
    coords.push({ lat, lng, timestamp, elevation, heartRate });
  });

  return coords;
}

export default function Home() {
  const { isTracking, coordinates, startTracking, stopTracking } = useGPS();
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [rideStartTime, setRideStartTime] = useState<Date | null>(null);
  const [gpxCoordinates, setGpxCoordinates] = useState<Coordinate[]>([]);
  const [displayStats, setDisplayStats] = useState<RideStats | null>(null);
  const [profile, setProfile] = useState<RiderProfile>(defaultProfile);
  

  const activeCoordinates = gpxCoordinates.length > 0 ? gpxCoordinates : coordinates;
  const liveStats = coordinates.length > 1 ? calculateStats(coordinates, rideStartTime) : null;

  const handleStart = () => {
    setRideStartTime(new Date());
    setGpxCoordinates([]);
    setDisplayStats(null);
    setAiFeedback("");
    startTracking();
  };

  const handleStop = async () => {
    stopTracking();
    if (!liveStats) {
      setAiFeedback("Not enough GPS data collected. Try riding for longer before stopping.");
      return;
    }
    setDisplayStats(liveStats);
    await sendToAI(liveStats);
  };

  const handleGPXUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiFeedback("");
    setGpxCoordinates([]);
    setDisplayStats(null);

    const text = await file.text();
    const gpxCoords = parseGPX(text);

    if (gpxCoords.length < 2) {
      setAiFeedback("Could not read GPX file. Please try another file.");
      return;
    }

    const gpxStartTime = new Date(gpxCoords[0].timestamp);
    const calculated = calculateStats(gpxCoords, gpxStartTime);
    setGpxCoordinates(gpxCoords);
    setDisplayStats(calculated);
    await sendToAI(calculated);
  };

  const sendToAI = async (stats: RideStats) => {
    setLoadingFeedback(true);
    try {
      const res = await fetch("/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stats, profile }),
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
      <ProfileForm onSave={setProfile} />

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
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1rem" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>TOTAL CLIMB</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{displayStats.totalClimb}m</div>
            </div>
            <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>MAX ELEVATION</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{displayStats.maxElevation}m</div>
            </div>
            <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>AVG HEART RATE</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                {displayStats.avgHeartRate !== "0" ? `${displayStats.avgHeartRate} bpm` : "N/A"}
              </div>
            </div>
          </div>
          <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "0.5rem" }}>EFFORT ZONES</div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div style={{ flex: parseInt(displayStats.speedZones.easy), background: "#22c55e", height: 12, borderRadius: 4 }} />
              <div style={{ flex: parseInt(displayStats.speedZones.moderate), background: "#f59e0b", height: 12, borderRadius: 4 }} />
              <div style={{ flex: parseInt(displayStats.speedZones.hard), background: "#ef4444", height: 12, borderRadius: 4 }} />
            </div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "#666" }}>
              <span>🟢 Easy {displayStats.speedZones.easy}%</span>
              <span>🟡 Moderate {displayStats.speedZones.moderate}%</span>
              <span>🔴 Hard {displayStats.speedZones.hard}%</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "1.5rem", border: "1px solid #bbf7d0" }}>
        <h2 style={{ color: "#15803d", margin: "0 0 1rem" }}>AI Coach Feedback</h2>
        {loadingFeedback && <p style={{ color: "#15803d", margin: 0 }}>Analysing your ride...</p>}
        {aiFeedback && (
          <div style={{ lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>
            {aiFeedback}
          </div>
        )}
        {!aiFeedback && !loadingFeedback && (
          <p style={{ color: "#6b7280", fontStyle: "italic", margin: 0 }}>
            Start a live ride or upload a GPX file to get feedback.
          </p>
        )}
      </div>
    </main>
  );
}