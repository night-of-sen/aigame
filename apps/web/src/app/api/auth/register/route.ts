import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  appendAuditLog,
  createUserRecord,
  hashPassword,
  loadFullStore,
  signSessionToken,
  type UserRecord
} from "@synthplay/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const countryCode = String(body.countryCode || "US").toUpperCase().slice(0, 4);

    if (username.length < 2 || username.length > 32) {
      return NextResponse.json({ error: "Username must be 2–32 letters/numbers." }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const store = await loadFullStore();
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (store.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }

    const newUser: UserRecord = {
      id: `usr-${Date.now().toString(36)}`,
      username,
      email,
      passwordHash: hashPassword(password),
      role: "creator",
      countryCode,
      locale: "en",
      isProSupporter: false,
      isVerifiedCreator: false,
      status: "active",
      creatorTipLinks: {},
      totalPlaysEarned: 0,
      createdAt: new Date().toISOString()
    };

    await createUserRecord(newUser);
    await appendAuditLog({
      id: `aud-${Date.now().toString(36)}`,
      actor: email,
      action: "USER_REGISTERED",
      target: `${newUser.id} (@${newUser.username})`,
      detail: `Country: ${countryCode}`,
      createdAt: new Date().toISOString()
    });

    const token = signSessionToken({
      sub: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      countryCode: newUser.countryCode
    });

    const { passwordHash: _omit, ...safeUser } = newUser;
    const res = NextResponse.json({ ok: true, user: safeUser }, { status: 201 });
    res.cookies.set(USER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Registration failed." }, { status: 400 });
  }
}
