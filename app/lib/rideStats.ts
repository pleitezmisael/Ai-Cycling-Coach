interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
  elevation?: number;
  HeartRate?: number;
}

export interface RideStats {
  distance: string;
  duration: string;
  averageSpeed: string;
  totalClimb: string;
  maxElevation: string;
  minElevation: string;
  speedZones: {
    easy: string;
    moderate: string;
    hard: string;
  };
  climbSegments: {
    startKm: string;
    endKm: string;
    elevationGain: string;
    avgSpeed: string;
  }[];
  avgHeartRate: string;
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

export function calculateStats(
  coordinates: Coordinate[],
  startTime: Date | null
): RideStats {
  if (coordinates.length < 2 || !startTime) {
    return {
      distance: "0.00",
      duration: "0.0",
      averageSpeed: "0.0",
      totalClimb: "0",
      maxElevation: "0",
      minElevation: "0",
      speedZones: { easy: "0", moderate: "0", hard: "0" },
      climbSegments: [],
      avgHeartRate: "0",
    };
  }

  // Distance
  let totalKm = 0;
  const segmentDistances: number[] = [0];
  for (let i = 1; i < coordinates.length; i++) {
    totalKm += haversineDistance(coordinates[i - 1], coordinates[i]);
    segmentDistances.push(totalKm);
  }

  // Duration
  const endTime = new Date(coordinates[coordinates.length - 1].timestamp);
  const durationMin = (endTime.getTime() - startTime.getTime()) / 60000;
  const avgSpeedKmh = durationMin > 0 ? totalKm / (durationMin / 60) : 0;

  // Elevation
  const elevations = coordinates.map((c) => c.elevation || 0);
  const maxElevation = Math.max(...elevations);
  const minElevation = Math.min(...elevations);
  let totalclimb = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) totalclimb += diff;
  }

  // Speed zones — based on % of average speed
  let easyCount = 0, moderateCount = 0, hardCount = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const segDist = haversineDistance(coordinates[i - 1], coordinates[i]);
    const segTime = (coordinates[i].timestamp - coordinates[i - 1].timestamp) / 3600000;
    const segSpeed = segTime > 0 ? segDist / segTime : 0;
    if (segSpeed < avgSpeedKmh * 0.7) easyCount++;
    else if (segSpeed < avgSpeedKmh * 1.15) moderateCount++;
    else hardCount++;
  }
  const total = easyCount + moderateCount + hardCount || 1;

  // Climb segments — find sections with 20m+ elevation gain
  const climbSegments: RideStats["climbSegments"] = [];
  let climbStart = -1;
  let climbElevStart = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const elevDiff = (coordinates[i].elevation || 0) - (coordinates[i - 1].elevation || 0);
    if (elevDiff > 0 && climbStart === -1) {
      climbStart = i;
      climbElevStart = coordinates[i - 1].elevation || 0;
    }
    if ((elevDiff <= 0 || i === coordinates.length - 1) && climbStart !== -1) {
      const gain = (coordinates[i].elevation || 0) - climbElevStart;
      if (gain >= 20) {
        const climbDist = segmentDistances[i] - segmentDistances[climbStart];
        const climbTime = (coordinates[i].timestamp - coordinates[climbStart].timestamp) / 3600000;
        const climbSpeed = climbTime > 0 ? climbDist / climbTime : 0;
        climbSegments.push({
          startKm: segmentDistances[climbStart].toFixed(1),
          endKm: segmentDistances[i].toFixed(1),
          elevationGain: gain.toFixed(0),
          avgSpeed: climbSpeed.toFixed(1),
        });
      }
      climbStart = -1;
    }
  }

  // Heart rate
  const hrValues = coordinates.map((c) => c.HeartRate || 0).filter((h) => h > 0);
  const avgHeartRate = hrValues.length > 0
    ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
    : 0;

  return {
    distance: totalKm.toFixed(2),
    duration: durationMin.toFixed(1),
    averageSpeed: avgSpeedKmh.toFixed(1),
    totalClimb: totalclimb.toFixed(0),
    maxElevation: maxElevation.toFixed(0),
    minElevation: minElevation.toFixed(0),
    speedZones: {
      easy: ((easyCount / total) * 100).toFixed(0),
      moderate: ((moderateCount / total) * 100).toFixed(0),
      hard: ((hardCount / total) * 100).toFixed(0),
    },
    climbSegments: climbSegments.slice(0, 5),
    avgHeartRate: avgHeartRate.toString(),
  };
}