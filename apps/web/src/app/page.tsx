import React from "react";
import { cookies } from "next/headers";
import {
  USER_SESSION_COOKIE,
  computeCountryPowerRankings,
  loadFullStore,
  verifySessionToken
} from "@synthplay/db";
import { SynthPlayApp } from "@/components/SynthPlayApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [store, cookieStore] = await Promise.all([loadFullStore(), cookies()]);
  const session = verifySessionToken(cookieStore.get(USER_SESSION_COOKIE)?.value);

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
        monthlyFundingRaisedUsd: store.monthlyFundingRaisedUsd,
        currentUser: session
          ? {
              id: session.sub,
              username: session.username,
              email: session.email,
              countryCode: session.countryCode,
              role: session.role
            }
          : null
      }}
    />
  );
}
