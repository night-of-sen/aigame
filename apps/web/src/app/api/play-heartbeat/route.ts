import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@synthplay/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gameId = String(body.gameId || "");
    const countryCode = String(body.countryCode || "JP").toUpperCase().slice(0, 4);
    const visibleSeconds = Number(body.visibleSeconds || 0);

    if (!gameId) {
      return NextResponse.json({ error: "gameId required" }, { status: 400 });
    }

    // Anti-cheat gate: only count as valid play when visible play time >= 10s (30s in prod)
    const store = readStore();
    const game = store.games.find((g) => g.id === gameId);
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (visibleSeconds >= 10) {
      game.totalValidPlays += 1;
      game.plays24h += 1;
      game.countryPlays[countryCode] = (game.countryPlays[countryCode] ?? 0) + 1;
      writeStore(store);
    }

    return NextResponse.json({
      ok: true,
      counted: visibleSeconds >= 10,
      totalValidPlays: game.totalValidPlays
    });
  } catch {
    return NextResponse.json({ error: "Invalid heartbeat payload" }, { status: 400 });
  }
}
