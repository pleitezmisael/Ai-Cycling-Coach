'use client'
import { useState, useEffect } from "react";

interface Activity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date: string;
}

interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
  elevation?: number;
  heartRate?: number;
}

interface Props {
  onRideLoaded: (coordinates: Coordinate[]) => void;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;

export default function StravaSync({ onRideLoaded }: Props) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [athleteName, setAthleteName] = useState("");
  const [loadingActivity, setLoadingActivity] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("strava_access_token");
    const storedRefresh = localStorage.getItem("strava_refresh_token");
    const storedName = localStorage.getItem("strava_athlete_name");
    if (stored) setAccessToken(stored);
    if (storedRefresh) setRefreshToken(storedRefresh);
    if (storedName) setAthleteName(storedName);

    // Handle OAuth callback code in URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.replaceState({}, "", window.location.pathname);
      exchangeCode(code);
    }
  }, []);

  useEffect(() => {
    if (accessToken) fetchActivities(accessToken);
  }, [accessToken]);

  const exchangeCode = async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/strava", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exchange", code }),
      });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setAthleteName(data.athlete?.firstname || "");
        localStorage.setItem("strava_access_token", data.accessToken);
        localStorage.setItem("strava_refresh_token", data.refreshToken);
        localStorage.setItem("strava_athlete_name", data.athlete?.firstname || "");
      }
    } catch (err) {
      console.error("Exchange error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async (token: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ accessToken: token });
      const res = await fetch(`/api/strava?${params.toString()}`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        setActivities(data.filter((a: Activity) => a.distance > 0));
      }
    } catch (err) {
      console.error("Fetch activities error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async (activityId: number) => {
    if (!accessToken) return;
    setLoadingActivity(activityId);
    try {
      const params = new URLSearchParams({
        accessToken,
        activityId: activityId.toString(),
      });
      const res = await fetch(`/api/strava?${params.toString()}`);
      const text = await res.text();
      const data = JSON.parse(text);

      if (data.latlng?.data) {
        const coords: Coordinate[] = data.latlng.data.map(
          (point: number[], i: number) => ({
            lat: point[0],
            lng: point[1],
            timestamp: Date.now() + (data.time?.data?.[i] || i) * 1000,
            elevation: data.altitude?.data?.[i] || 0,
            heartRate: data.heartrate?.data?.[i] || 0,
          })
        );
        onRideLoaded(coords);
      } else {
        console.error("No GPS data found for this activity");
      }
    } catch (err) {
      console.error("Load activity error:", err);
    } finally {
      setLoadingActivity(null);
    }
  };

  const connectStrava = () => {
    const scope = "activity:read_all";
    const redirectUri = window.location.origin;
    const url = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
    window.location.href = url;
  };

  const disconnect = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setAthleteName("");
    setActivities([]);
    localStorage.removeItem("strava_access_token");
    localStorage.removeItem("strava_refresh_token");
    localStorage.removeItem("strava_athlete_name");
  };

  const formatDistance = (meters: number) =>
    (meters / 1000).toFixed(1);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {!accessToken ? (
        <button
          onClick={connectStrava}
          style={{
            padding: "0.6rem 1.25rem",
            background: "#FC4C02",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: "0.95rem",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          🔗 Connect Strava
        </button>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <span style={{
              background: "#FC4C02",
              color: "#fff",
              padding: "0.4rem 1rem",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 600,
            }}>
              ✅ Strava {athleteName ? `— ${athleteName}` : "Connected"}
            </span>
            <button
              onClick={() => fetchActivities(accessToken)}
              style={{
                background: "none",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "0.3rem 0.75rem",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              🔄 Refresh
            </button>
            <button
              onClick={disconnect}
              style={{
                background: "none",
                border: "none",
                color: "#999",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Disconnect
            </button>
          </div>

          {loading && (
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              Loading your rides...
            </p>
          )}

          {activities.length > 0 && (
            <div style={{
              background: "#f8f9fa",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid #e5e7eb",
                fontSize: "0.8rem",
                color: "#888",
                fontWeight: 600,
              }}>
                YOUR RECENT RIDES
              </div>

              {activities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      {activity.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.1rem" }}>
                      {formatDate(activity.start_date)} · {formatDistance(activity.distance)} km · {formatDuration(activity.moving_time)} · ↑{activity.total_elevation_gain}m
                    </div>
                  </div>
                  <button
                    onClick={() => loadActivity(activity.id)}
                    disabled={loadingActivity === activity.id}
                    style={{
                      padding: "0.4rem 1rem",
                      background: loadingActivity === activity.id ? "#ccc" : "#22c55e",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: "0.85rem",
                      cursor: loadingActivity === activity.id ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {loadingActivity === activity.id ? "Loading..." : "Analyse →"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && activities.length === 0 && (
            <p style={{ color: "#888", fontSize: "0.9rem" }}>
              No rides found. Make sure your Garmin has synced to Strava.
            </p>
          )}
        </div>
      )}
    </div>
  );
}