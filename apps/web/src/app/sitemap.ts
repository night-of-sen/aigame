import type { MetadataRoute } from "next";
import { loadFullStore } from "@synthplay/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");
  const store = await loadFullStore();
  const published = store.games.filter((g) => g.status === "published");

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3
    }
  ];

  const gameEntries: MetadataRoute.Sitemap = published.map((game) => ({
    url: `${baseUrl}/games/${game.slug}`,
    lastModified: new Date(game.publishedAt),
    changeFrequency: "daily",
    priority: 0.9
  }));

  return [...staticEntries, ...gameEntries];
}
