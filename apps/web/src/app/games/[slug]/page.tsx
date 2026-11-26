import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadFullStore } from "@synthplay/db";
import { GameDetailClient } from "@/components/GameDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await loadFullStore();
  const game = store.games.find((g) => g.slug === slug || g.id === slug);
  if (!game) return { title: "Game Not Found // SYNTHPLAY" };

  return {
    title: `${game.title} (${game.titleZh}) — Play Free Online // SYNTHPLAY`,
    description: `${game.tagline} Built by ${game.creatorName} [${game.creatorCountryCode}] using ${game.aiTools.join(", ")}.`,
    openGraph: {
      title: `${game.title} — Free AI Browser Game on SYNTHPLAY`,
      description: game.tagline,
      images: [game.coverImage]
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
  return <GameDetailClient game={game} initialReviews={reviews} />;
}
