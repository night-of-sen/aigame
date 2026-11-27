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
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const turnstile = await verifyTurnstileToken(
      body.turnstileToken,
      req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")
    );
    if (!turnstile.ok) {
      return NextResponse.json({ error: turnstile.error || "Anti-bot check failed." }, { status: 403 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

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

    // Auto-derive clean handle from email prefix if not provided (zero-friction signup)
    const rawHandle = String(body.username || email.split("@")[0] || "Player")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 22) || "Player";
    const handleExists = store.users.some((u) => u.username.toLowerCase() === rawHandle.toLowerCase());
    const username = handleExists ? `${rawHandle}_${Date.now().toString(36).slice(-3)}` : rawHandle;

    // Auto-detect country from Cloudflare CF-IPCountry header (editable later in Studio)
    const cfCountry = req.headers.get("cf-ipcountry");
    const countryCode =
      (typeof body.countryCode === "string" && body.countryCode.trim().length === 2
        ? body.countryCode
        : cfCountry && /^[A-Za-z]{2}$/.test(cfCountry)
          ? cfCountry
          : "US"
      ).toUpperCase();

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
      detail: `Auto country: ${countryCode}`,
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
