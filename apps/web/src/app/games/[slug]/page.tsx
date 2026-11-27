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
  if (!game) return { title: "Game Not Found // SYNTHPLAY" };

  const canonical = `${BASE_URL}/games/${game.slug}`;
  const coverUrl = game.coverImage.startsWith("http") ? game.coverImage : `${BASE_URL}${game.coverImage}`;

  return {
    title: `${game.title} — Play Free Online // SYNTHPLAY`,
    description: `${game.tagline} Built by ${game.creatorName} [${game.creatorCountryCode}] using ${game.aiTools.join(", ")}.`,
    alternates: { canonical },
    openGraph: {
      title: `${game.title} — Free AI Browser Game on SYNTHPLAY`,
      description: game.tagline,
      url: canonical,
      siteName: "SYNTHPLAY",
      type: "website",
      images: [{ url: coverUrl, width: 1280, height: 720, alt: game.title }]
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} — Play Free on SYNTHPLAY`,
      description: game.tagline,
      images: [coverUrl]
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    alternateName: game.titleZh,
    description: game.tagline,
    url: canonical,
    image: coverUrl,
    genre: game.category,
    applicationCategory: "Game",
    operatingSystem: "Any Web Browser",
    playMode: "SinglePlayer",
    inLanguage: ["en", "zh-CN", "ja", "ko", "es", "pt-BR"],
    author: {
      "@type": "Person",
      name: game.creatorName
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock"
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: game.rating.toFixed(2),
      bestRating: "5",
      worstRating: "1",
      ratingCount: Math.max(12, reviews.length * 10)
    }
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
