import { NextResponse } from "next/server";

const CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

export async function POST(request: Request) {
  try {
    const { code, refreshToken, action } = await request.json();

    if (action === "exchange" && code) {
      const res = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
        }),
      });
      const text = await res.text();
      console.log("Strava exchange response:", text);
      const data = JSON.parse(text);
      if (data.errors || data.fault) {
        return NextResponse.json({ error: "Auth failed", detail: data }, { status: 401 });
      }
      return NextResponse.json({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        athlete: data.athlete,
      });
    }

    if (action === "refresh" && refreshToken) {
      const res = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const data = await res.json();
      return NextResponse.json({ accessToken: data.access_token });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Strava POST error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get("accessToken");
    const activityId = searchParams.get("activityId");

    if (!accessToken) {
      return NextResponse.json({ error: "No access token" }, { status: 401 });
    }

    if (activityId) {
      const res = await fetch(
        `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=latlng,altitude,time,heartrate&key_by_type=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      return NextResponse.json(data);
    }

    const res = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=5",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Strava GET error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}