import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  appendAuditLog,
  createUserRecord,
  loadFullStore,
  signSessionToken,
  type UserRecord
} from "@synthplay/db";

const OAUTH_STATE_COOKIE = "synthplay_google_state";

export async function GET(req: NextRequest) {
  const origin = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || req.nextUrl.origin).replace(/\/$/, "");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!clientId || !clientSecret || !code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${origin}/?auth_error=google_invalid_state`);
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${origin}/?auth_error=google_token_failed`);
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      return NextResponse.redirect(`${origin}/?auth_error=google_no_token`);
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` }
    });
    if (!profileRes.ok) {
      return NextResponse.redirect(`${origin}/?auth_error=google_profile_failed`);
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      name?: string;
      given_name?: string;
    };
    const email = (profile.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.redirect(`${origin}/?auth_error=google_no_email`);
    }

    const cfCountry = req.headers.get("cf-ipcountry");
    const detectedCountry =
      cfCountry && /^[A-Za-z]{2}$/.test(cfCountry) ? cfCountry.toUpperCase() : "US";

    const store = await loadFullStore();
    let user = store.users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      const baseHandle = (profile.given_name || profile.name || email.split("@")[0] || "Player")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 20) || "Player";
      const exists = store.users.some((u) => u.username.toLowerCase() === baseHandle.toLowerCase());
      const username = exists ? `${baseHandle}_${Date.now().toString(36).slice(-3)}` : baseHandle;

      const created: UserRecord = {
        id: `usr-${Date.now().toString(36)}`,
        username,
        email,
        role: "creator",
        countryCode: detectedCountry,
        locale: "en",
        isProSupporter: false,
        isVerifiedCreator: false,
        status: "active",
        creatorTipLinks: {},
        totalPlaysEarned: 0,
        createdAt: new Date().toISOString()
      };
      await createUserRecord(created);
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: email,
        action: "USER_GOOGLE_SIGNUP",
        target: `${created.id} (@${created.username})`,
        detail: `Auto country via CF-IPCountry: ${detectedCountry}`,
        createdAt: new Date().toISOString()
      });
      user = created;
    }

    if (user.status === "banned") {
      return NextResponse.redirect(`${origin}/?auth_error=account_banned`);
    }

    const sessionToken = signSessionToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      countryCode: user.countryCode
    });

    const res = NextResponse.redirect(`${origin}/`);
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(USER_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/?auth_error=google_exception`);
  }
}
