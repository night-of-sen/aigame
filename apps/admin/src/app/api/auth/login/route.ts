import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  appendAuditLog,
  signSessionToken,
  verifyAdminCredentials
} from "@synthplay/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json(
        { error: "Invalid administrator email or password." },
        { status: 401 }
      );
    }

    const token = signSessionToken({
      sub: "admin-root",
      username: "Admin",
      email,
      role: "admin",
      countryCode: "CN"
    });

    await appendAuditLog({
      id: `aud-${Date.now().toString(36)}`,
      actor: email,
      action: "ADMIN_LOGIN",
      target: "admin.synthplay.games",
      detail: "Authenticated via signed HttpOnly session cookie.",
      createdAt: new Date().toISOString()
    });

    const res = NextResponse.json({ ok: true, email });
    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }
}
