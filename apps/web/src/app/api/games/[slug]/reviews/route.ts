import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  addReviewRecord,
  loadFullStore,
  verifySessionToken,
  type ReviewRecord
} from "@synthplay/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const store = await loadFullStore();
  const game = store.games.find((g) => g.slug === slug || g.id === slug);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  const reviews = store.reviews.filter((r) => r.gameId === game.id);
  return NextResponse.json({ reviews, rating: game.rating });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const store = await loadFullStore();
    const game = store.games.find((g) => g.slug === slug || g.id === slug);
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

    const body = await req.json();
    const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    const comment = String(body.comment || "").trim();
    if (comment.length < 3 || comment.length > 600) {
      return NextResponse.json({ error: "Review must be between 3 and 600 characters." }, { status: 400 });
    }

    const clamp = (v: unknown) => Math.max(1, Math.min(5, Math.round(Number(v) || 5)));
    const gameplayScore = clamp(body.gameplayScore);
    const visualScore = clamp(body.visualScore);
    const aiScore = clamp(body.aiScore);
    const rating = Math.max(1, Math.min(5, Math.round((gameplayScore + visualScore + aiScore) / 3)));

    const review: ReviewRecord = {
      id: `rev-${Date.now().toString(36)}`,
      gameId: game.id,
      authorName: session?.username || String(body.authorName || "ArcadeGuest").trim().slice(0, 32),
      authorCountry: session?.countryCode || String(body.authorCountry || "US").toUpperCase().slice(0, 4),
      rating,
      gameplayScore,
      visualScore,
      aiScore,
      comment,
      createdAt: new Date().toISOString()
    };

    await addReviewRecord(review);
    return NextResponse.json({ ok: true, review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }
}
