import { useState, useRef, useCallback } from "react";

export interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

export function useGPS() {
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      alert("GPS is not supported by your browser.");
      return;
    }
    setCoordinates([]);
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coord: Coordinate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
        };
        console.log("New coordinate:", coord);
        setCoordinates((prev) => [...prev, coord]);
      },
      (error) => {
        console.error("GPS error:", error.message);
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 30000 }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    console.log("Tracking stopped.");
  }, []);

  return { isTracking, coordinates, startTracking, stopTracking };
}