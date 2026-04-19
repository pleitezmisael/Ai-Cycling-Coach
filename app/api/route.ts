import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received body:", body);
    console.log("Groq key exists:", !!process.env.GROQ_API_KEY);

    const { distance, duration, averageSpeed } = body;

    const prompt = `You are a professional cycling coach. A rider completed a ride: ${distance}km in ${duration} minutes at ${averageSpeed}km/h average speed. Give them 3 sentences of warm motivating feedback.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
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