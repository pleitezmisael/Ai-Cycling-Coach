export interface RiderProfile {
  name: string;
  age: string;
  weight: string;
  height: string;
  goal: string;
  cyclingType: string;
  experience: string;
  daysPerWeek: string;
  ftp: string;
}

export const defaultProfile: RiderProfile = {
  name: "",
  age: "",
  weight: "",
  height: "",
  goal: "Build endurance",
  cyclingType: "Road cycling",
  experience: "Beginner (under 1 year)",
  daysPerWeek: "2-3 days",
  ftp: "",
};

export function saveProfile(profile: RiderProfile) {
  if (typeof window !== "undefined") {
    localStorage.setItem("riderProfile", JSON.stringify(profile));
  }
}

export function loadProfile(): RiderProfile {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("riderProfile");
    if (saved) return JSON.parse(saved);
  }
  return defaultProfile;
}