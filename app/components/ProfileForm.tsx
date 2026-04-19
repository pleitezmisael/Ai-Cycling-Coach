'use client'
import { useState, useEffect } from "react";
import { RiderProfile, defaultProfile, saveProfile, loadProfile } from "../profile";

interface Props {
  onSave: (profile: RiderProfile) => void;
}

export default function ProfileForm({ onSave }: Props) {
  const [profile, setProfile] = useState<RiderProfile>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [weightInput, setWeightInput] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightCm, setHeightCm] = useState("");

  useEffect(() => {
    const loaded = loadProfile();
    setProfile(loaded);
    if (loaded.weight) setWeightInput(loaded.weight);
    if (loaded.height) setHeightCm(loaded.height);
  }, []);

  const handleChange = (field: keyof RiderProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // Convert weight to kg for storage
  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    if (!value) return;
    if (weightUnit === "kg") {
      handleChange("weight", value);
    } else {
      const kg = (parseFloat(value) * 0.453592).toFixed(1);
      handleChange("weight", kg);
    }
  };

  // Convert height to cm for storage
  const handleHeightChange = (ft: string, inches: string) => {
    setHeightFt(ft);
    setHeightIn(inches);
    if (!ft) return;
    const totalInches = (parseFloat(ft) * 12) + (parseFloat(inches) || 0);
    const cm = (totalInches * 2.54).toFixed(0);
    handleChange("height", cm);
  };

  const handleHeightCmChange = (value: string) => {
    setHeightCm(value);
    handleChange("height", value);
  };

  const handleSave = () => {
    saveProfile(profile);
    onSave(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setIsOpen(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    fontSize: "0.95rem",
    boxSizing: "border-box" as const,
    marginTop: "0.25rem",
  };

  const labelStyle = {
    fontSize: "0.8rem",
    color: "#666",
    fontWeight: 500,
  };

  const toggleStyle = (active: boolean) => ({
    padding: "0.2rem 0.6rem",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
    background: active ? "#6366f1" : "#e5e7eb",
    color: active ? "#fff" : "#666",
  });

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "0.6rem 1.25rem",
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: "0.95rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        👤 {profile.name ? `${profile.name}'s Profile` : "Set Up Your Profile"}
      </button>

      {isOpen && (
        <div style={{
          marginTop: "1rem",
          background: "#f8f9fa",
          borderRadius: 12,
          padding: "1.5rem",
          border: "1px solid #e5e7eb",
        }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Your Rider Profile</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            {/* Name */}
            <div>
              <label style={labelStyle}>First Name</label>
              <input style={inputStyle} placeholder="e.g. Miguel"
                value={profile.name}
                onChange={(e) => handleChange("name", e.target.value)} />
            </div>

            {/* Age */}
            <div>
              <label style={labelStyle}>Age</label>
              <input style={inputStyle} placeholder="e.g. 32"
                value={profile.age} type="number"
                onChange={(e) => handleChange("age", e.target.value)} />
            </div>

            {/* Weight with kg/lb toggle */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={labelStyle}>Weight</label>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button style={toggleStyle(weightUnit === "kg")}
                    onClick={() => {
                      setWeightUnit("kg");
                      if (weightInput) {
                        const kg = (parseFloat(weightInput) * 0.453592).toFixed(1);
                        setWeightInput(kg);
                        handleChange("weight", kg);
                      }
                    }}>kg</button>
                  <button style={toggleStyle(weightUnit === "lb")}
                    onClick={() => {
                      setWeightUnit("lb");
                      if (profile.weight) {
                        const lb = (parseFloat(profile.weight) * 2.20462).toFixed(1);
                        setWeightInput(lb);
                      }
                    }}>lb</button>
                </div>
              </div>
              <input style={inputStyle}
                placeholder={weightUnit === "kg" ? "e.g. 75" : "e.g. 165"}
                value={weightInput} type="number"
                onChange={(e) => handleWeightChange(e.target.value)} />
            </div>

            {/* Height with cm/ft toggle */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={labelStyle}>Height</label>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button style={toggleStyle(heightUnit === "cm")}
                    onClick={() => {
                      setHeightUnit("cm");
                      if (heightFt) {
                        const totalIn = (parseFloat(heightFt) * 12) + (parseFloat(heightIn) || 0);
                        const cm = (totalIn * 2.54).toFixed(0);
                        setHeightCm(cm);
                        handleChange("height", cm);
                      }
                    }}>cm</button>
                  <button style={toggleStyle(heightUnit === "ft")}
                    onClick={() => {
                      setHeightUnit("ft");
                      if (profile.height) {
                        const totalIn = parseFloat(profile.height) / 2.54;
                        const ft = Math.floor(totalIn / 12).toString();
                        const inches = Math.round(totalIn % 12).toString();
                        setHeightFt(ft);
                        setHeightIn(inches);
                      }
                    }}>ft</button>
                </div>
              </div>

              {heightUnit === "cm" ? (
                <input style={inputStyle} placeholder="e.g. 178"
                  value={heightCm} type="number"
                  onChange={(e) => handleHeightCmChange(e.target.value)} />
              ) : (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <input
                    style={{ ...inputStyle, marginTop: 0, width: "50%" }}
                    placeholder="ft" value={heightFt} type="number"
                    onChange={(e) => handleHeightChange(e.target.value, heightIn)} />
                  <input
                    style={{ ...inputStyle, marginTop: 0, width: "50%" }}
                    placeholder="in" value={heightIn} type="number"
                    onChange={(e) => handleHeightChange(heightFt, e.target.value)} />
                </div>
              )}
            </div>

            {/* FTP */}
            <div>
              <label style={labelStyle}>FTP (watts) — optional</label>
              <input style={inputStyle} placeholder="e.g. 220"
                value={profile.ftp} type="number"
                onChange={(e) => handleChange("ftp", e.target.value)} />
            </div>

            {/* Days per week */}
            <div>
              <label style={labelStyle}>Days per week</label>
              <select style={inputStyle} value={profile.daysPerWeek}
                onChange={(e) => handleChange("daysPerWeek", e.target.value)}>
                <option>2-3 days</option>
                <option>4-5 days</option>
                <option>6-7 days</option>
              </select>
            </div>

            {/* Cycling type */}
            <div>
              <label style={labelStyle}>Cycling Type</label>
              <select style={inputStyle} value={profile.cyclingType}
                onChange={(e) => handleChange("cyclingType", e.target.value)}>
                <option>Road cycling</option>
                <option>Mountain biking</option>
                <option>Both</option>
              </select>
            </div>

            {/* Experience */}
            <div>
              <label style={labelStyle}>Experience Level</label>
              <select style={inputStyle} value={profile.experience}
                onChange={(e) => handleChange("experience", e.target.value)}>
                <option>Beginner (under 1 year)</option>
                <option>Intermediate (1-3 years)</option>
                <option>Advanced (3+ years)</option>
              </select>
            </div>

            {/* Goal */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Main Goal</label>
              <select style={inputStyle} value={profile.goal}
                onChange={(e) => handleChange("goal", e.target.value)}>
                <option>Build endurance</option>
                <option>Get faster</option>
                <option>Lose weight</option>
                <option>Train for a race</option>
                <option>General fitness</option>
              </select>
            </div>
          </div>

          <button onClick={handleSave}
            style={{
              marginTop: "1.25rem",
              padding: "0.75rem 2rem",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "1rem",
              cursor: "pointer",
              width: "100%",
              fontWeight: 600,
            }}>
            {saved ? "✅ Saved!" : "Save Profile"}
          </button>
        </div>
      )}
    </div>
  );
}