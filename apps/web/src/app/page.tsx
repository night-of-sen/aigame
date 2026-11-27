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

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");

const PLATFORM_FAQS = [
  {
    q: "What is SYNTHPLAY?",
    a: "SYNTHPLAY (synthplay.games) is a global, 100% free browser arcade built for indie and AI-crafted HTML5 & WebGL games. Players launch games instantly on desktop, iPad, or mobile with zero downloads, while creators host their games free on isolated Cloudflare R2 sandboxes."
  },
  {
    q: "How can indie or AI developers upload and host a game for free?",
    a: "Open the UPLOAD bay on SYNTHPLAY, paste a single self-contained HTML5 file (such as games built with Cursor, Claude, Gemini, or ChatGPT) or upload an HTML5/WebGL ZIP bundle up to 100MB containing index.html. Hosting is 100% free with zero bandwidth fees and 0% platform cut on creator tips."
  },
  {
    q: "How does SYNTHPLAY keep browser games safe for players?",
    a: "Every community-submitted game is scanned before publication and executed inside an isolated cross-origin sandbox (*.synthplay-box.cloud) with strict Content Security Policy and iframe sandboxing, preventing game scripts from accessing player sessions or cookies on synthplay.games."
  },
  {
    q: "Do SYNTHPLAY games support mobile phones, iPads, leaderboards, and cloud saves?",
    a: "Yes. Built-in arcade games include responsive touch controls, global and per-country high-score leaderboards, and optional authenticated cloud saves via the SynthPlay Browser SDK."
  }
];

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

  const env = process.env;
  const sameAs = [env["KOFI_URL"] || env["NEXT_PUBLIC_KOFI_URL"], env["PATREON_URL"] || env["NEXT_PUBLIC_PATREON_URL"]]
    .map((u) => (u || "").trim())
    .filter((u) => /^https?:\/\//i.test(u));

  const knowledgeGraphJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "SYNTHPLAY",
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/brand-logo.png`,
          width: 512,
          height: 512
        },
        email: "support@synthplay.games",
        sameAs
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: "SYNTHPLAY",
        description:
          "Global free browser arcade for indie and AI-crafted HTML5 & WebGL games with zero downloads and free creator hosting.",
        publisher: { "@id": `${BASE_URL}/#organization` },
        inLanguage: ["en", "zh-CN", "ja", "ko", "es", "pt-BR"],
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "ItemList",
        "@id": `${BASE_URL}/#games`,
        name: "SYNTHPLAY Free AI & Indie HTML5 Browser Games",
        numberOfItems: published.length,
        itemListElement: published.slice(0, 20).map((g, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: g.title,
          url: `${BASE_URL}/games/${g.slug}`
        }))
      },
      {
        "@type": "FAQPage",
        "@id": `${BASE_URL}/#faq`,
        mainEntity: PLATFORM_FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a
          }
        }))
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(knowledgeGraphJsonLd) }}
      />
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
            ? (() => {
                const dbUser = store.users.find((u) => u.id === session.sub);
                return {
                  id: session.sub,
                  username: dbUser?.username || session.username,
                  email: session.email,
                  countryCode: dbUser?.countryCode || session.countryCode,
                  role: dbUser?.role || session.role,
                  isProSupporter: Boolean(dbUser?.isProSupporter),
                  isVerifiedCreator: Boolean(dbUser?.isVerifiedCreator)
                };
              })()
            : null
        }}
      />
    </>
  );
}
