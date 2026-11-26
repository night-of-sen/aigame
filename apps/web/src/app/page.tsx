import React from "react";
import { cookies, headers } from "next/headers";
import {
  USER_SESSION_COOKIE,
  computeCountryPowerRankings,
  loadFullStore,
  verifySessionToken
} from "@synthplay/db";
import { detectLocaleFromHeader, isValidLocale, type Locale } from "@synthplay/i18n";
import { SynthPlayApp } from "@/components/SynthPlayApp";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [store, cookieStore, headerStore] = await Promise.all([
    loadFullStore(),
    cookies(),
    headers()
  ]);
  const session = verifySessionToken(cookieStore.get(USER_SESSION_COOKIE)?.value);

  const savedLocale = cookieStore.get("synthplay_locale")?.value;
  const initialLocale: Locale = isValidLocale(savedLocale)
    ? savedLocale
    : detectLocaleFromHeader(headerStore.get("accept-language"));

  const googleAuthEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

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
        initialLocale,
        googleAuthEnabled,
        currentUser: session
          ? {
              id: session.sub,
              username: session.username,
              email: session.email,
              countryCode: session.countryCode,
              role: session.role,
              isProSupporter: Boolean(store.users.find((u) => u.id === session.sub)?.isProSupporter)
            }
          : null
      }}
    />
  );
}
