import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  appendAuditLog,
  computeCountryPowerRankings,
  loadFullStore,
  toggleSponsorSlotRecord,
  updateGameStatus,
  updateUserRecord,
  verifySessionToken,
  type GameStatus,
  type UserStatus
} from "@synthplay/db";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session || (session.role !== "admin" && session.role !== "moderator")) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized administrator access." }, { status: 401 });
  }
  const store = await loadFullStore();
  return NextResponse.json({
    ...store,
    countryPower: computeCountryPowerRankings(store.games)
  });
}

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized administrator access." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "MODERATE_GAME") {
      const updated = await updateGameStatus(String(body.gameId || ""), body.status as GameStatus);
      if (!updated) return NextResponse.json({ error: "Game not found" }, { status: 404 });
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: session.email,
        action: `GAME_${String(body.status).toUpperCase()}`,
        target: `${updated.id} (${updated.title})`,
        detail: String(body.reason || "Updated via Admin Console"),
        createdAt: new Date().toISOString()
      });
      const store = await loadFullStore();
      return NextResponse.json({ ok: true, store });
    }

    if (action === "UPDATE_USER") {
      const updated = await updateUserRecord(String(body.userId || ""), {
        status: body.status as UserStatus | undefined,
        isVerifiedCreator: typeof body.isVerifiedCreator === "boolean" ? body.isVerifiedCreator : undefined,
        isProSupporter: typeof body.isProSupporter === "boolean" ? body.isProSupporter : undefined
      });
      if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: session.email,
        action: "USER_UPDATED",
        target: `${updated.id} (@${updated.username})`,
        detail: `status=${updated.status}, verified=${updated.isVerifiedCreator}, pro=${updated.isProSupporter}`,
        createdAt: new Date().toISOString()
      });
      const store = await loadFullStore();
      return NextResponse.json({ ok: true, store });
    }

    if (action === "TOGGLE_SPONSOR_SLOT") {
      const updated = await toggleSponsorSlotRecord(String(body.slotId || ""));
      if (!updated) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: session.email,
        action: updated.isActive ? "SPONSOR_SLOT_ENABLED" : "SPONSOR_SLOT_PAUSED",
        target: `${updated.id} (${updated.brandName})`,
        detail: `Placement: ${updated.placement}`,
        createdAt: new Date().toISOString()
      });
      const store = await loadFullStore();
      return NextResponse.json({ ok: true, store });
    }

    return NextResponse.json({ error: "Unsupported admin action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
