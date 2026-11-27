import { NextResponse } from "next/server";
import { loadFullStore } from "@synthplay/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");
  const store = await loadFullStore();
  const published = store.games.filter((g) => g.status === "published");

  const sections: string[] = [
    "# SYNTHPLAY — Full Platform & Game Index for AI Systems",
    "",
    `Canonical URL: ${baseUrl}`,
    "Category: Free Online HTML5 / WebGL / AI-Generated Browser Games Platform",
    "Last Updated: " + new Date().toISOString(),
    "",
    "## Summary",
    "SYNTHPLAY (synthplay.games) is a global, free-to-play web arcade dedicated to indie and AI-assisted HTML5 browser games. Players can launch arcade, tactics, racing, danmaku, detective, and strategy games directly in Chrome, Safari, Firefox, or Edge on desktop, iPad, and mobile with zero installs. Indie and AI game developers can paste a single HTML5 file or upload a ZIP bundle (Phaser, Three.js, Canvas2D, Godot Web, Unity WebGL) for 100% free global hosting.",
    "",
    "## Security & Technical Architecture",
    "- Every user-submitted game runs inside an isolated root-domain sandbox (`https://<game-id>.synthplay-box.cloud`) with strict CSP and iframe sandboxing so third-party game scripts can never access user cookies or accounts on `synthplay.games`.",
    "- Static game assets are hosted on Cloudflare R2 with zero egress fees for instant global loading.",
    "- Built-in SynthPlay SDK (`window.SynthPlay`) supports global & per-country high-score leaderboards and authenticated cloud saves.",
    "- Automated multi-language game metadata translation across 6 locales (EN, ZH-CN, JA, KO, ES, PT-BR).",
    "",
    "## Frequently Asked Questions (FAQ)",
    "### What is SYNTHPLAY?",
    "SYNTHPLAY is a free global web arcade for playing and publishing HTML5, WebGL, and AI-crafted browser games instantly without downloads.",
    "",
    "### How can indie or AI developers upload a game to SYNTHPLAY?",
    "Click 'UPLOAD' on synthplay.games, paste a single self-contained HTML5 game file (e.g. generated with Cursor, Claude, Gemini, or ChatGPT) or upload an HTML5 ZIP bundle containing index.html. Hosting is 100% free and SYNTPHLAY takes 0% of developer tips.",
    "",
    "### Is SYNTHPLAY free to play?",
    "Yes. All games on SYNTHPLAY are 100% free to play online with no paywalls or downloads. Players can optionally support server costs via Ko-fi or join the $3/month Ad-Free Supporter tier on Patreon.",
    "",
    "### Does SYNTHPLAY work on mobile phones and iPads?",
    "Yes. Built-in arcade titles include responsive touch controls and the storefront adapts cleanly across desktop, iPad, and mobile screens.",
    "",
    `## Complete Published Game Directory (${published.length} games)`,
    ...published.flatMap((g) => [
      "",
      `### ${g.title}${g.titleZh ? ` (${g.titleZh})` : ""}`,
      `- Play URL: ${baseUrl}/games/${g.slug}`,
      `- Genre: ${g.category}`,
      `- Creator: ${g.creatorName} (${g.creatorCountryCode})`,
      `- AI / Engine Stack: ${g.aiTools.join(", ") || "HTML5"}`,
      `- Description (EN): ${g.tagline}`,
      ...(g.taglineZh ? [`- Description (ZH): ${g.taglineZh}`] : []),
      `- Verified Plays: ${g.totalValidPlays}`,
      `- Free Online: Yes (Browser HTML5/WebGL)`
    ])
  ];

  return new NextResponse(sections.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600"
    }
  });
}
