'use client'
import { useState } from "react";
import { useGPS } from "./hooks/useGPS";
import { calculateStats } from "./lib/rideStats";
import dynamic from "next/dynamic";

const RideMap = dynamic(() => import("./components/Ridemap"), { ssr: false });

export default function Home() {
  const { isTracking, coordinates, startTracking, stopTracking } = useGPS();
  const [aiFeedback, setAiFeedback] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [rideStartTime, setRideStartTime] = useState<Date | null>(null);

  const stats = coordinates.length > 1 ? calculateStats(coordinates, rideStartTime) : null;

  const handleStart = () => {
    setRideStartTime(new Date());
    startTracking();
  };

const handleStop = async () => {
    stopTracking();
    if (!stats) return;
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

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>AI Cycling Coach</h1>
      <p style={{ color: "#666" }}>Track your ride. Get coached by AI.</p>

      <div style={{ display: "flex", gap: "1rem", margin: "2rem 0" }}>
        <button onClick={handleStart} disabled={isTracking}
          style={{ padding: "0.75rem 2rem", background: "#22c55e", color: "#fff", border: "none", borderRadius: 8, fontSize: "1rem", cursor: "pointer", opacity: isTracking ? 0.4 : 1 }}>
          ▶ Start Ride
        </button>
        <button onClick={handleStop} disabled={!isTracking}
          style={{ padding: "0.75rem 2rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: "1rem", cursor: "pointer", opacity: !isTracking ? 0.4 : 1 }}>
          ■ Stop Ride
        </button>
      </div>

      <RideMap coordinates={coordinates} />

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "#888" }}>DISTANCE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stats.distance} km</div>
          </div>
          <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "#888" }}>DURATION</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stats.duration} min</div>
          </div>
          <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "#888" }}>AVG SPEED</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{stats.averageSpeed} km/h</div>
          </div>
        </div>
      )}

      <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "1.5rem", border: "1px solid #bbf7d0" }}>
        <h2 style={{ color: "#15803d", margin: "0 0 1rem" }}>AI Coach Feedback</h2>
        {loadingFeedback && <p style={{ color: "#15803d" }}>Analysing your ride...</p>}
        {aiFeedback && <p style={{ lineHeight: 1.7 }}>{aiFeedback}</p>}
        {!aiFeedback && !loadingFeedback && <p style={{ color: "#6b7280", fontStyle: "italic" }}>Complete a ride to get feedback.</p>}
      </div>
    </main>
  );
}