import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadFullStore } from "@synthplay/db";
import { GameDetailClient } from "@/components/GameDetailClient";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await loadFullStore();
  const game = store.games.find((g) => g.slug === slug || g.id === slug);
  if (!game) return { title: "Game Not Found" };

  const canonical = `${BASE_URL}/games/${game.slug}`;
  const ogCardUrl = `${BASE_URL}/games/${game.slug}/opengraph-image`;

  return {
    title: `${game.title} — Play Free Online`,
    description: `${game.tagline} Play free in your browser with zero downloads. Built by ${game.creatorName} [${game.creatorCountryCode}] using ${game.aiTools.join(", ") || "HTML5"}.`,
    keywords: [
      game.title,
      game.category,
      "free browser game",
      "HTML5 game",
      "AI game",
      "SYNTHPLAY",
      ...game.aiTools
    ],
    alternates: { canonical },
    openGraph: {
      title: `${game.title} — Free AI Browser Game on SYNTHPLAY`,
      description: game.tagline,
      url: canonical,
      siteName: "SYNTHPLAY",
      type: "website",
      images: [
        {
          url: ogCardUrl,
          width: 1200,
          height: 630,
          alt: `${game.title} — Play Free on SYNTHPLAY`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} — Play Free on SYNTHPLAY`,
      description: game.tagline,
      images: [ogCardUrl]
    }
  };
}

export default async function GameDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await loadFullStore();
  const game = store.games.find((g) => g.slug === slug || g.id === slug);
  if (!game) notFound();

  const reviews = store.reviews.filter((r) => r.gameId === game.id);
  const canonical = `${BASE_URL}/games/${game.slug}`;
  const coverUrl = game.coverImage.startsWith("http") ? game.coverImage : `${BASE_URL}${game.coverImage}`;

  const videoGameSchema: Record<string, unknown> = {
    "@type": "VideoGame",
    "@id": `${canonical}#game`,
    name: game.title,
    alternateName: game.titleZh || undefined,
    description: game.tagline,
    url: canonical,
    image: coverUrl,
    genre: game.category,
    keywords: [game.category, "HTML5", "Free Online Game", ...game.aiTools].join(", "),
    applicationCategory: "Game",
    operatingSystem: "Any Web Browser (Windows, macOS, iOS, Android)",
    softwareRequirements: "Modern HTML5/WebGL Web Browser",
    playMode: "SinglePlayer",
    isAccessibleForFree: true,
    inLanguage: ["en", "zh-CN", "ja", "ko", "es", "pt-BR"],
    datePublished: game.publishedAt,
    author: {
      "@type": "Person",
      name: game.creatorName
    },
    publisher: {
      "@type": "Organization",
      name: "SYNTHPLAY",
      url: BASE_URL
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock"
    }
  };

  if (reviews.length > 0) {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    videoGameSchema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avg.toFixed(2),
      bestRating: "5",
      worstRating: "1",
      ratingCount: reviews.length
    };
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      videoGameSchema,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "SYNTHPLAY Arcade", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: game.title, item: canonical }
        ]
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameDetailClient game={game} initialReviews={reviews} />
    </>
  );
}
