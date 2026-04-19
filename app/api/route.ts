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

    const prompt = `You are an elite cycling coach with 20 years experience training endurance athletes.

Analyse this ride in detail and provide specific, actionable coaching feedback:

RIDE DATA:
- Distance: ${stats.distance} km
- Duration: ${stats.duration} minutes  
- Average Speed: ${stats.averageSpeed} km/h
- Total Elevation Gain: ${stats.totalClimb}m
- Max Elevation: ${stats.maxElevation}m
- Min Elevation: ${stats.minElevation}m
- Avg Heart Rate: ${stats.avgHeartRate > 0 ? stats.avgHeartRate + " bpm" : "not recorded"}
- Speed Zones: ${stats.speedZones.easy}% easy, ${stats.speedZones.moderate}% moderate, ${stats.speedZones.hard}% hard effort

CLIMB ANALYSIS:
${climbInfo}

RIDER GOAL: Build endurance
AVAILABLE TRAINING DAYS: 2-3 days per week

Please provide:

1. RIDE ANALYSIS (3-4 sentences)
Analyse the effort, pacing, climbing performance and where the rider pushed hard vs held back. Be specific about the numbers.

2. WHAT YOU DID WELL
Two specific things based on the data.

3. AREAS TO IMPROVE
Two specific weaknesses the data reveals with exact advice on how to fix them.

4. WEEKLY TRAINING PLAN
A personalised 7 day plan based on this ride and their goal of building endurance on 2-3 days per week. For each training day give the session type, duration and specific focus. For rest days just say Rest.

Format each section with its heading in capitals. Be direct, specific and encouraging like a real coach would be.`;

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