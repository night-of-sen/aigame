import { NextResponse } from "next/server";
import { loadFullStore } from "@synthplay/db";
import { GUIDE_ARTICLES } from "@/lib/guides";

export const dynamic = "force-dynamic";

function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");
  const store = await loadFullStore();
  const published = store.games.filter((g) => g.status === "published");

  const items = [
    ...published.map((g) => ({
      title: `${g.title} — Free ${g.category} Browser Game`,
      link: `${baseUrl}/games/${g.slug}`,
      guid: `${baseUrl}/games/${g.slug}`,
      pubDate: new Date(g.publishedAt).toUTCString(),
      description: `${g.tagline} Built by @${g.creatorName} [${g.creatorCountryCode}] using ${g.aiTools.join(", ") || "HTML5"}. Play free online with zero downloads.`,
      category: g.category
    })),
    ...GUIDE_ARTICLES.map((a) => ({
      title: a.title,
      link: `${baseUrl}/guides/${a.slug}`,
      guid: `${baseUrl}/guides/${a.slug}`,
      pubDate: new Date(a.publishedAt).toUTCString(),
      description: a.description,
      category: a.category
    }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SYNTHPLAY — Free AI &amp; Indie HTML5 Browser Games</title>
    <link>${escXml(baseUrl)}</link>
    <description>Latest free HTML5, WebGL, and AI-crafted browser games and developer guides on SYNTHPLAY.</description>
    <language>en-us</language>
    <atom:link href="${escXml(baseUrl)}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items
  .map(
    (item) => `    <item>
      <title>${escXml(item.title)}</title>
      <link>${escXml(item.link)}</link>
      <guid isPermaLink="true">${escXml(item.guid)}</guid>
      <pubDate>${escXml(item.pubDate)}</pubDate>
      <category>${escXml(item.category)}</category>
      <description>${escXml(item.description)}</description>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>
`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600"
    }
  });
}
