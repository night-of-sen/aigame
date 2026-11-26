import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  loadFullStore,
  signSessionToken,
  verifyPassword
} from "@synthplay/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body.email || body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");

    const store = await loadFullStore();
    const user = store.users.find(
      (u) => u.email.toLowerCase() === identifier || u.username.toLowerCase() === identifier
    );

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email/username or password." }, { status: 401 });
    }

    if (user.status === "banned") {
      return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
    }

    const token = signSessionToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      countryCode: user.countryCode
    });

    const { passwordHash: _omit, ...safeUser } = user;
    const res = NextResponse.json({ ok: true, user: safeUser });
    res.cookies.set(USER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 400 });
  }
}
