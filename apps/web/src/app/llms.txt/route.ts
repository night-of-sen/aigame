import { NextResponse } from "next/server";
import { loadFullStore } from "@synthplay/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");
  const store = await loadFullStore();
  const published = store.games.filter((g) => g.status === "published");

  const lines: string[] = [
    "# SYNTHPLAY",
    "",
    "> Global free browser arcade for indie & AI-crafted HTML5/WebGL games. Play instantly in any desktop or mobile browser with zero downloads, or publish single-file AI HTML5 & ZIP games 100% free on isolated Cloudflare R2 sandboxes.",
    "",
    "## Core Platform Facts",
    `- Official Website: ${baseUrl}`,
    "- Isolated Game Sandbox Origin: https://*.synthplay-box.cloud (zero-egress Cloudflare R2 CDN)",
    "- Cost for Players: 100% free to play online (optional $3/mo Patreon Ad-Free Supporter tier)",
    "- Cost for Developers: 100% free game hosting (0% platform cut on creator tips)",
    "- Supported Game Formats: Single-file HTML5 (paste code from Cursor, Claude, Gemini, ChatGPT, v0) and HTML5/WebGL/Godot/Phaser/Three.js ZIP bundles (up to 100MB)",
    "- Supported Interface Languages: English (en), Simplified Chinese (zh-CN), Japanese (ja), Korean (ko), Spanish (es), Portuguese (pt-BR)",
    "- Contact: support@synthplay.games",
    "",
    "## Key Pages",
    `- [Arcade Home & Live Leaderboards](${baseUrl}/): Browse and play free HTML5 & AI browser games by nation and engine.`,
    `- [About SYNTHPLAY](${baseUrl}/about): Mission, security sandbox architecture, and free hosting model.`,
    `- [Full LLM Catalog & FAQ](${baseUrl}/llms-full.txt): Detailed descriptions, AI tool stacks, and FAQs for every hosted game.`,
    `- [XML Sitemap](${baseUrl}/sitemap.xml): Complete machine-readable index of all game pages.`,
    `- [Privacy Policy](${baseUrl}/privacy)`,
    `- [Terms of Service](${baseUrl}/terms)`,
    "",
    `## Featured Playable Browser Games (${published.length} live)`,
    ...published.map(
      (g) =>
        `- [${g.title}](${baseUrl}/games/${g.slug}): ${g.tagline} (Genre: ${g.category}; Creator: ${g.creatorName} [${g.creatorCountryCode}]; Built with: ${g.aiTools.join(", ") || "HTML5"})`
    )
  ];

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600"
    }
  });
}
