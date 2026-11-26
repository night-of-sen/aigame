import { NextRequest, NextResponse } from "next/server";
import { computeCountryPowerRankings, loadFullStore } from "@synthplay/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "ALL";
  const store = await loadFullStore();
  const published = store.games.filter((g) => g.status === "published");

  const topPlayed = [...published]
    .sort((a, b) => {
      if (country !== "ALL") {
        return (b.countryPlays[country] ?? 0) - (a.countryPlays[country] ?? 0);
      }
      return b.totalValidPlays - a.totalValidPlays;
    })
    .slice(0, 10);

  const countryPower = computeCountryPowerRankings(published);

  const aiNative = [...published]
    .filter((g) => g.isAiCreated)
    .sort((a, b) => b.plays24h * b.rating - a.plays24h * a.rating)
    .slice(0, 10);

  return NextResponse.json({
    country,
    topPlayed,
    countryPower,
    aiNative,
    updatedAt: new Date().toISOString()
  });
}
