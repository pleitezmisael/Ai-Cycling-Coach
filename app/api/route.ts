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

const prompt = `You are an elite cycling coach. Be concise and direct.

RIDER: ${p.name || "Rider"}, ${p.age ? p.age + "yo" : ""}, ${p.weight ? p.weight + "kg" : ""}, ${p.experience || "Beginner"}, Goal: ${p.goal || "Build endurance"}, ${p.daysPerWeek || "2-3"} days/week

RIDE: ${stats.distance}km in ${stats.duration}min at ${stats.averageSpeed}km/h avg | Climb: ${stats.totalClimb}m | Zones: ${stats.speedZones.easy}% easy, ${stats.speedZones.moderate}% moderate, ${stats.speedZones.hard}% hard ${stats.avgHeartRate !== "0" ? `| HR: ${stats.avgHeartRate}bpm` : ""}

${climbInfo !== "No significant climbs detected" ? `CLIMBS: ${climbInfo}` : ""}

Respond in exactly this format — keep each section to 2-3 sentences max:

RIDE ANALYSIS
[2-3 sentences analysing this specific ride]

WHAT YOU DID WELL
- [specific thing 1]
- [specific thing 2]

AREAS TO IMPROVE
- [specific weakness + exact drill to fix it]
- [specific weakness + exact drill to fix it]

THIS WEEK'S PLAN (${p.daysPerWeek || "2-3"} days)
${p.daysPerWeek === "4-5 days" ? "Mon/Tue/Thu/Fri/Sat" : "Mon/Wed/Sat"}: [session type — duration — focus]
[Rest days as Rest]

Keep total response under 300 words. Address rider by name if provided.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
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