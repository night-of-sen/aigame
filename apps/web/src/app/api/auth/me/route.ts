import { NextRequest, NextResponse } from "next/server";
import { USER_SESSION_COOKIE, loadFullStore, verifySessionToken } from "@synthplay/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(USER_SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const store = await loadFullStore();
  const user = store.users.find((u) => u.id === session.sub);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  const { passwordHash: _omit, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}
