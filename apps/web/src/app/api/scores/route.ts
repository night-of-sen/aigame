import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  getGameHighScores,
  submitGameScore,
  verifySessionToken
} from "@synthplay/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameId = (searchParams.get("gameId") || "").trim();
  if (!gameId) {
    return NextResponse.json({ error: "gameId is required." }, { status: 400 });
  }
  const scores = await getGameHighScores(gameId, 15);
  return NextResponse.json({ gameId, scores });
}

export async function POST(req: NextRequest) {
  try {
    const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    const body = await req.json();
    const gameId = String(body.gameId || "").trim();
    const score = Number(body.score || 0);

    if (!gameId || !Number.isFinite(score) || score <= 0) {
      return NextResponse.json({ error: "Valid gameId and positive score required." }, { status: 400 });
    }

    const cfCountry = (req.headers.get("cf-ipcountry") || "").toUpperCase();
    const countryCode =
      session?.countryCode ||
      (/^[A-Z]{2}$/.test(cfCountry) && cfCountry !== "XX" ? cfCountry : String(body.countryCode || "US").toUpperCase().slice(0, 4));
    const playerName =
      session?.username ||
      String(body.playerName || `GUEST-${countryCode}-${Math.floor(100 + Math.random() * 899)}`)
        .trim()
        .slice(0, 28);

    const result = await submitGameScore({
      id: `scr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      gameId,
      userId: session?.sub,
      playerName,
      countryCode,
      score,
      createdAt: new Date().toISOString()
    });

    const scores = await getGameHighScores(gameId, 15);
    return NextResponse.json({ ok: true, ...result, scores });
  } catch {
    return NextResponse.json({ error: "Invalid score payload." }, { status: 400 });
  }
}
