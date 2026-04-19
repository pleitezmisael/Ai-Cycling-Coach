import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const stats = await request.json();
    console.log("Received stats:", stats);
    console.log("Groq key exists:", !!process.env.GROQ_API_KEY);

    const climbInfo = stats.climbSegments?.length > 0
      ? stats.climbSegments.map((c: any, i: number) =>
          `Climb ${i + 1}: km ${c.startKm} to ${c.endKm}, gained ${c.elevationGain}m at avg speed ${c.avgSpeed}km/h`
        ).join("\n")
      : "No significant climbs detected";

    const p = stats.profile || {};
const riderInfo = `
RIDER PROFILE:
- Name: ${p.name || "Rider"}
- Age: ${p.age ? p.age + " years old" : "not specified"}
- Weight: ${p.weight ? p.weight + "lb" : "not specified"}
- Height: ${p.height ? p.height + "feet" : "not specified"}
- FTP: ${p.ftp ? p.ftp + " watts" : "not recorded"}
- Experience: ${p.experience || "Beginner"}
- Cycling type: ${p.cyclingType || "Road cycling"}
- Training days per week: ${p.daysPerWeek || "2-3 days"}
- Main goal: ${p.goal || "Build endurance"}
`;

const prompt = `You are an elite cycling coach with 20 years experience.

${riderInfo}

RIDE DATA:
- Distance: ${stats.distance} km
- Duration: ${stats.duration} minutes
- Average Speed: ${stats.averageSpeed} km/h
- Total Elevation Gain: ${stats.totalClimb}m
- Max Elevation: ${stats.maxElevation}m
- Avg Heart Rate: ${stats.avgHeartRate > 0 ? stats.avgHeartRate + " bpm" : "not recorded"}
- Speed Zones: ${stats.speedZones.easy}% easy, ${stats.speedZones.moderate}% moderate, ${stats.speedZones.hard}% hard

CLIMB ANALYSIS:
${climbInfo}

${p.weight ? `PERFORMANCE METRICS:
- Estimated calories burned: ${Math.round(parseFloat(stats.duration) * parseFloat(p.weight) * 0.1)} kcal
- Weight to distance ratio: ${(parseFloat(stats.distance) / parseFloat(p.weight)).toFixed(2)} km/kg` : ""}

Address the rider by name if provided. Give feedback specific to their age, weight, experience level and goal.

Please provide:

1. RIDE ANALYSIS
Analyse this specific ride in detail — pacing, climbing, effort zones. Reference their experience level as a ${p.experience || "beginner"} road cyclist.

2. WHAT YOU DID WELL
Two specific things based on the data. Be encouraging for their experience level.

3. AREAS TO IMPROVE  
Two specific weaknesses with exact drills or workouts to fix them. Keep it beginner friendly.

4. WEEKLY TRAINING PLAN
A personalised ${p.daysPerWeek || "2-3 day"} per week plan for a ${p.experience || "beginner"} focused on ${p.goal || "building endurance"}. Include session type, duration and exact focus for each day.

Format each section with its heading in capitals. Be warm, specific and encouraging.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    console.log("Groq response:", JSON.stringify(data));
    const feedback = data.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ feedback });
  } catch (error: any) {
    console.error("Error:", error.message);
    return NextResponse.json({ error: "Failed to get feedback" }, { status: 500 });
  }
}