import { Coordinate } from "../hooks/useGPS";

export interface RideStats {
  distance: string;
  duration: string;
  averageSpeed: string;
}

function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function totalDistance(coords: Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(coords[i - 1], coords[i]);
  }
  return total;
}

export function calculateStats(
  coordinates: Coordinate[],
  startTime: Date | null
): RideStats {
  if (coordinates.length < 2 || !startTime) {
    return { distance: "0.00", duration: "0.0", averageSpeed: "0.0" };
  }
  const distanceKm = totalDistance(coordinates);
  const endTime = new Date(coordinates[coordinates.length - 1].timestamp);
  const durationMin = (endTime.getTime() - startTime.getTime()) / 60000;
  const avgSpeedKmh = durationMin > 0 ? distanceKm / (durationMin / 60) : 0;
  return {
    distance: distanceKm.toFixed(2),
    duration: durationMin.toFixed(1),
    averageSpeed: avgSpeedKmh.toFixed(1),
  };
}