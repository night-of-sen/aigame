import React from "react";
import { computeCountryPowerRankings, readStore } from "@synthplay/db";
import { SynthPlayApp } from "@/components/SynthPlayApp";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const store = readStore();
  const published = store.games.filter((g) => g.status === "published");
  const topPlayed = [...published].sort((a, b) => b.totalValidPlays - a.totalValidPlays).slice(0, 10);
  const countryPower = computeCountryPowerRankings(published);
  const aiNative = [...published]
    .filter((g) => g.isAiCreated)
    .sort((a, b) => b.plays24h * b.rating - a.plays24h * a.rating)
    .slice(0, 10);

  return (
    <SynthPlayApp
      initial={{
        games: published,
        topPlayed,
        countryPower,
        aiNative,
        sponsorSlots: store.sponsorSlots.filter((s) => s.isActive),
        monthlyFundingGoalUsd: store.monthlyFundingGoalUsd,
        monthlyFundingRaisedUsd: store.monthlyFundingRaisedUsd
      }}
    />
  );
}
