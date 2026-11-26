import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  loadFullStore,
  updateUserRecord,
  verifySessionToken
} from "@synthplay/db";

export async function GET(req: NextRequest) {
  const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
  const store = await loadFullStore();
  const currentUser = session
    ? store.users.find((u) => u.id === session.sub) ?? null
    : store.users.find((u) => u.id === "usr-002") ?? store.users[0];

  const myGames = currentUser ? store.games.filter((g) => g.creatorId === currentUser.id) : [];
  const safeUser = currentUser
    ? (() => {
        const { passwordHash: _omit, ...rest } = currentUser;
        return rest;
      })()
    : null;

  return NextResponse.json({
    authenticated: Boolean(session),
    user: safeUser,
    myGames,
    totalPlatformGames: store.games.length
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    const body = await req.json();
    const targetId = session?.sub || "usr-002";

    const updated = await updateUserRecord(targetId, {
      countryCode: typeof body.countryCode === "string" ? body.countryCode.toUpperCase().slice(0, 4) : undefined,
      creatorTipLinks:
        body.creatorTipLinks && typeof body.creatorTipLinks === "object"
          ? {
              kofi: body.creatorTipLinks.kofi || undefined,
              patreon: body.creatorTipLinks.patreon || undefined,
              paypalMe: body.creatorTipLinks.paypalMe || undefined
            }
          : undefined
    });

    if (!updated) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const { passwordHash: _omit, ...safeUser } = updated;
    return NextResponse.json({ ok: true, user: safeUser });
  } catch {
    return NextResponse.json({ error: "Failed to update profile." }, { status: 400 });
  }
}
