'use client'
import { useState } from "react";
import { useGPS } from "./hooks/useGPS";
import { calculateStats, RideStats } from "./lib/rideStats";
import dynamic from "next/dynamic";
import ProfileForm from "./components/ProfileForm";
import StravaSync from "./components/StravaSync";
import { RiderProfile, defaultProfile } from "./profile";

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

  const statCard = (label: string, value: string) => (
    <div style={{
      background: "#f8f9fa",
      borderRadius: 10,
      padding: "0.875rem",
      textAlign: "center",
      border: "1px solid #e9ecef",
    }}>
      <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111" }}>{value}</div>
    </div>
  );

  return (
    <>
      {/* Global responsive styles */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        .container {
          max-width: 680px;
          margin: 0 auto;
          padding: 1.5rem 1rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .btn-row {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }
        .btn {
          padding: 0.65rem 1.25rem;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          flex: 1;
          min-width: 120px;
          text-align: center;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .effort-bar {
          display: flex;
          gap: 0.4rem;
          align-items: center;
          height: 12px;
          margin: 0.5rem 0;
        }
        .feedback-section {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid #bbf7d0;
          margin-top: 1rem;
        }
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .btn {
            font-size: 0.85rem;
            padding: 0.6rem 0.75rem;
          }
          .container {
            padding: 1rem 0.75rem;
          }
        }
      `}</style>

      <main className="container">
        {/* Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.15rem" }}>
            AI Cycling Coach
          </h1>
          <p style={{ color: "#666", margin: 0, fontSize: "0.9rem" }}>
            Track your ride. Get coached by AI.
          </p>
        </div>

        {/* Profile */}
        <ProfileForm onSave={setProfile} />

        {/* Strava Sync */}
        <StravaSync onRideLoaded={(coords) => {
          setGpxCoordinates(coords);
          const start = new Date(coords[0].timestamp);
          const calculated = calculateStats(coords, start);
          setDisplayStats(calculated);
          sendToAI(calculated);
        }} />

        {/* Ride Controls */}
        <div className="btn-row">
          <button
            className="btn"
            onClick={handleStart}
            disabled={isTracking}
            style={{ background: "#22c55e", color: "#fff", opacity: isTracking ? 0.4 : 1 }}
          >
            ▶ Start Ride
          </button>
          <button
            className="btn"
            onClick={handleStop}
            disabled={!isTracking}
            style={{ background: "#ef4444", color: "#fff", opacity: !isTracking ? 0.4 : 1 }}
          >
            ■ Stop Ride
          </button>
          <label
            className="btn"
            style={{ background: "#f59e0b", color: "#fff", cursor: "pointer" }}
          >
            📂 Upload GPX
            <input type="file" accept=".gpx" onChange={handleGPXUpload} style={{ display: "none" }} />
          </label>
        </div>

        {/* Map */}
        <RideMap coordinates={activeCoordinates} />

        {/* Stats */}
        {displayStats && (
          <div style={{ marginBottom: "1rem" }}>
            <div className="stats-grid">
              {statCard("Distance", `${displayStats.distance} km`)}
              {statCard("Duration", `${displayStats.duration} min`)}
              {statCard("Avg Speed", `${displayStats.averageSpeed} km/h`)}
              {statCard("Total Climb", `${displayStats.totalClimb}m`)}
              {statCard("Max Elevation", `${displayStats.maxElevation}m`)}
              {statCard("Heart Rate", displayStats.avgHeartRate !== "0" ? `${displayStats.avgHeartRate} bpm` : "N/A")}
            </div>

            {/* Effort zones */}
            <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "0.875rem", border: "1px solid #e9ecef" }}>
              <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Effort Zones
              </div>
              <div className="effort-bar">
                <div style={{ flex: parseInt(displayStats.speedZones.easy), background: "#22c55e", height: "100%", borderRadius: 4 }} />
                <div style={{ flex: parseInt(displayStats.speedZones.moderate), background: "#f59e0b", height: "100%", borderRadius: 4 }} />
                <div style={{ flex: parseInt(displayStats.speedZones.hard), background: "#ef4444", height: "100%", borderRadius: 4 }} />
              </div>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "#666", flexWrap: "wrap" }}>
                <span>🟢 Easy {displayStats.speedZones.easy}%</span>
                <span>🟡 Moderate {displayStats.speedZones.moderate}%</span>
                <span>🔴 Hard {displayStats.speedZones.hard}%</span>
              </div>
            </div>
          </div>
        )}

        {/* AI Feedback */}
        <div className="feedback-section">
          <h2 style={{ color: "#15803d", margin: "0 0 0.75rem", fontSize: "1.1rem" }}>
            AI Coach Feedback
          </h2>
          {loadingFeedback && (
            <p style={{ color: "#15803d", margin: 0, fontSize: "0.95rem" }}>
              ⏳ Analysing your ride...
            </p>
          )}
          {aiFeedback && (
            <div style={{ lineHeight: 1.8, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
              {aiFeedback}
            </div>
          )}
          {!aiFeedback && !loadingFeedback && (
            <p style={{ color: "#6b7280", fontStyle: "italic", margin: 0, fontSize: "0.9rem" }}>
              Start a live ride, upload a GPX file, or click Analyse on a Strava ride to get feedback.
            </p>
          )}
        </div>
      </main>
    </>
  );
}