import type { MetadataRoute } from "next";
import { loadFullStore } from "@synthplay/db";
import { GUIDE_ARTICLES } from "@/lib/guides";

export const dynamic = "force-dynamic";

function normalizeGenreSlug(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");
  const store = await loadFullStore();
  const published = store.games.filter((g) => g.status === "published");

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "hourly", priority: 1.0 },
    { url: `${baseUrl}/play/all`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 }
  ];

  const gameEntries: MetadataRoute.Sitemap = published.map((game) => ({
    url: `${baseUrl}/games/${game.slug}`,
    lastModified: new Date(game.publishedAt),
    changeFrequency: "daily",
    priority: 0.9
  }));

  const genreSlugs = Array.from(new Set(published.map((g) => normalizeGenreSlug(g.category))));
  const genreEntries: MetadataRoute.Sitemap = genreSlugs.map((slug) => ({
    url: `${baseUrl}/play/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.85
  }));

  const guideEntries: MetadataRoute.Sitemap = GUIDE_ARTICLES.map((article) => ({
    url: `${baseUrl}/guides/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly",
    priority: 0.8
  }));

  const creatorNames = Array.from(new Set(published.map((g) => g.creatorName).filter(Boolean)));
  const creatorEntries: MetadataRoute.Sitemap = creatorNames.map((name) => ({
    url: `${baseUrl}/u/${encodeURIComponent(name)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7
  }));

  return [...staticEntries, ...gameEntries, ...genreEntries, ...guideEntries, ...creatorEntries];
}
