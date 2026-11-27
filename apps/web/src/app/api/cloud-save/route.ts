import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  loadCloudGameState,
  saveCloudGameState,
  verifySessionToken
} from "@synthplay/db";

export async function GET(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Sign in to load cloud saves." }, { status: 401 });
  }
  const gameId = (new URL(req.url).searchParams.get("gameId") || "").trim();
  if (!gameId) {
    return NextResponse.json({ error: "gameId required." }, { status: 400 });
  }
  const save = await loadCloudGameState(session.sub, gameId);
  return NextResponse.json({ save });
}

export async function PUT(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Sign in to save game state to cloud." }, { status: 401 });
  }
  try {
    const body = await req.json();
    const gameId = String(body.gameId || "").trim();
    const payload = body.payload;
    if (!gameId || !payload || typeof payload !== "object") {
      return NextResponse.json({ error: "gameId and object payload required." }, { status: 400 });
    }
    const serialized = JSON.stringify(payload);
    if (serialized.length > 64 * 1024) {
      return NextResponse.json({ error: "Cloud save exceeds 64KB limit." }, { status: 413 });
    }
    const saved = await saveCloudGameState(session.sub, gameId, payload as Record<string, unknown>);
    return NextResponse.json({ ok: true, save: saved });
  } catch {
    return NextResponse.json({ error: "Invalid cloud save payload." }, { status: 400 });
  }
}
