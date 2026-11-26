import { NextRequest, NextResponse } from "next/server";
import { incrementGamePlay } from "@synthplay/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gameId = String(body.gameId || "");
    const cfCountry = req.headers.get("cf-ipcountry");
    const countryCode = (cfCountry && cfCountry.length === 2 ? cfCountry : String(body.countryCode || "JP"))
      .toUpperCase()
      .slice(0, 4);
    const visibleSeconds = Number(body.visibleSeconds || 0);

    if (!gameId) {
      return NextResponse.json({ error: "gameId required" }, { status: 400 });
    }

    if (visibleSeconds < 10) {
      return NextResponse.json({ ok: true, counted: false });
    }

    const updated = await incrementGamePlay(gameId, countryCode);
    if (!updated) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      counted: true,
      countryCode,
      totalValidPlays: updated.totalValidPlays
    });
  } catch {
    return NextResponse.json({ error: "Invalid heartbeat payload" }, { status: 400 });
  }
}
