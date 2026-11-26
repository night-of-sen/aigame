import crypto from "node:crypto";

export interface SessionPayload {
  sub: string; // userId or "admin"
  username: string;
  email: string;
  role: "player" | "creator" | "moderator" | "admin";
  countryCode: string;
  exp: number; // unix ms
}

export const USER_SESSION_COOKIE = "synthplay_session";
export const ADMIN_SESSION_COOKIE = "synthplay_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "synthplay-dev-secret-change-in-production-env";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, "hex");
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function signSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = {
    ...payload,
    exp: Date.now() + SESSION_TTL_MS
  };
  const body = Buffer.from(JSON.stringify(full), "utf-8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(body)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getAdminConfig() {
  const email = (process.env.ADMIN_EMAIL || "admin@synthplay.games").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_API_SECRET || "synthplay-admin-2026";
  const isDefaultPassword =
    !process.env.ADMIN_PASSWORD &&
    (!process.env.ADMIN_API_SECRET || process.env.ADMIN_API_SECRET === "change_me_admin_secret");
  return { email, password, isDefaultPassword };
}

export function verifyAdminCredentials(email: string, password: string): boolean {
  const cfg = getAdminConfig();
  const emailMatch = email.trim().toLowerCase() === cfg.email;
  const a = Buffer.from(password);
  const b = Buffer.from(cfg.password);
  const passMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
  return emailMatch && passMatch;
}
