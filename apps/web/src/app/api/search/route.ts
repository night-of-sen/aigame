import { NextRequest, NextResponse } from "next/server";
import { loadFullStore } from "@synthplay/db";
import { searchGamesWithMeili } from "@/lib/meilisearch";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const country = (searchParams.get("country") || "ALL").toUpperCase();

  const store = await loadFullStore();
  let published = store.games.filter((g) => g.status === "published");
  if (country !== "ALL") {
    published = published.filter(
      (g) => g.creatorCountryCode === country || (g.countryPlays[country] ?? 0) > 15000
    );
  }

  const result = await searchGamesWithMeili(q, published);
  return NextResponse.json({
    query: q,
    engine: result.engine,
    total: result.games.length,
    games: result.games
  });
}
