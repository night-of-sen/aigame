import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@synthplay/db";

export async function GET() {
  const store = readStore();
  const currentUser = store.users.find((u) => u.id === "usr-002") ?? store.users[0];
  const myGames = store.games.filter((g) => g.creatorId === currentUser.id);
  return NextResponse.json({
    user: currentUser,
    myGames,
    totalPlatformGames: store.games.length
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();
    const user = store.users.find((u) => u.id === "usr-002") ?? store.users[0];
    if (typeof body.countryCode === "string") user.countryCode = body.countryCode.toUpperCase().slice(0, 4);
    if (body.creatorTipLinks && typeof body.creatorTipLinks === "object") {
      user.creatorTipLinks = {
        kofi: body.creatorTipLinks.kofi || undefined,
        patreon: body.creatorTipLinks.patreon || undefined,
        paypalMe: body.creatorTipLinks.paypalMe || undefined
      };
    }
    writeStore(store);
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "Failed to update profile." }, { status: 400 });
  }
}
