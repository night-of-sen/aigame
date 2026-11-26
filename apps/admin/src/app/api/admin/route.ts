import { NextRequest, NextResponse } from "next/server";
import { computeCountryPowerRankings, readStore, writeStore, type GameStatus, type UserStatus } from "@synthplay/db";

export async function GET() {
  const store = readStore();
  return NextResponse.json({
    ...store,
    countryPower: computeCountryPowerRankings(store.games)
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "");
    const store = readStore();

    if (action === "MODERATE_GAME") {
      const game = store.games.find((g) => g.id === body.gameId);
      if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
      game.status = body.status as GameStatus;
      store.auditLogs.unshift({
        id: `aud-${Date.now().toString(36)}`,
        actor: "admin@synthplay.games",
        action: `GAME_${String(body.status).toUpperCase()}`,
        target: `${game.id} (${game.title})`,
        detail: String(body.reason || "Updated via Admin Console"),
        createdAt: new Date().toISOString()
      });
      writeStore(store);
      return NextResponse.json({ ok: true, store });
    }

    if (action === "UPDATE_USER") {
      const user = store.users.find((u) => u.id === body.userId);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (body.status) user.status = body.status as UserStatus;
      if (typeof body.isVerifiedCreator === "boolean") user.isVerifiedCreator = body.isVerifiedCreator;
      if (typeof body.isProSupporter === "boolean") user.isProSupporter = body.isProSupporter;
      store.auditLogs.unshift({
        id: `aud-${Date.now().toString(36)}`,
        actor: "admin@synthplay.games",
        action: "USER_UPDATED",
        target: `${user.id} (@${user.username})`,
        detail: `status=${user.status}, verified=${user.isVerifiedCreator}, pro=${user.isProSupporter}`,
        createdAt: new Date().toISOString()
      });
      writeStore(store);
      return NextResponse.json({ ok: true, store });
    }

    if (action === "TOGGLE_SPONSOR_SLOT") {
      const slot = store.sponsorSlots.find((s) => s.id === body.slotId);
      if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
      slot.isActive = !slot.isActive;
      store.auditLogs.unshift({
        id: `aud-${Date.now().toString(36)}`,
        actor: "admin@synthplay.games",
        action: slot.isActive ? "SPONSOR_SLOT_ENABLED" : "SPONSOR_SLOT_PAUSED",
        target: `${slot.id} (${slot.brandName})`,
        detail: `Placement: ${slot.placement}`,
        createdAt: new Date().toISOString()
      });
      writeStore(store);
      return NextResponse.json({ ok: true, store });
    }

    return NextResponse.json({ error: "Unsupported admin action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
