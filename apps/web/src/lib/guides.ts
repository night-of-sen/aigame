export interface GuideArticle {
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  category: "CREATOR GUIDE" | "PLAYER GUIDE" | "ARCHITECTURE" | "MONETIZATION";
  readMinutes: number;
  publishedAt: string;
  keywords: string[];
  recommendedGameSlugs: string[];
  sections: Array<{ heading: string; body: string[] }>;
}

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: "how-to-publish-ai-html5-game-free",
    title: "How to Build and Publish an AI-Generated HTML5 Game for Free in 60 Seconds",
    titleZh: "60 秒免费发布你的 AI HTML5 网页游戏完整指南",
    description:
      "Step-by-step guide to exporting a single-file HTML5 or ZIP game from Cursor, Claude, Gemini, or ChatGPT and hosting it 100% free on SYNTHPLAY with global Cloudflare R2 edge delivery.",
    category: "CREATOR GUIDE",
    readMinutes: 4,
    publishedAt: "2026-11-26",
    keywords: [
      "publish HTML5 game free",
      "host AI generated game",
      "Cursor HTML5 game hosting",
      "Claude artifact game hosting",
      "free indie web game platform"
    ],
    recommendedGameSlugs: ["neon-serpent-2099", "volt-2048-matrix", "hyper-survivor-zero"],
    sections: [
      {
        heading: "1. Why Single-File HTML5 & WebGL Are Taking Over Indie Game Dev",
        body: [
          "Modern AI coding tools like Cursor, Claude, Gemini, and DeepSeek can generate complete playable Canvas2D, Phaser, or Three.js games inside a single self-contained HTML file or a lightweight ZIP folder. Unlike desktop binaries, browser games launch in under a second on Windows, macOS, iPad, and mobile phones with zero downloads.",
          "The hardest part for solo developers has traditionally been finding fast, safe, zero-cost hosting with built-in discovery, leaderboards, and global reach. That is why SYNTHPLAY provides 100% free HTML5 & ZIP hosting on Cloudflare R2 with zero bandwidth charges."
        ]
      },
      {
        heading: "2. Prepare Your Game Bundle (Single HTML or ZIP)",
        body: [
          "If your game lives inside a single index.html file (inline CSS + JS), you can paste the HTML directly into the SYNTHPLAY Upload Bay without touching Git or FTP. Make sure your canvas scales responsively to fit both desktop monitors and mobile viewports.",
          "For multi-file projects exported from Godot Web, Unity WebGL, Phaser, or Vite, compress the build output so index.html sits at the root of the ZIP archive (up to 100MB). Avoid external unverified eval scripts so your game passes the automated AST security scan with a 95+ score."
        ]
      },
      {
        heading: "3. Add Global High-Score Leaderboards in 3 Lines of JS",
        body: [
          "Every game hosted on SYNTHPLAY can post player scores to the platform's Redis + PostgreSQL leaderboard using window.parent.postMessage({ source: 'synthplay-sdk', type: 'SCORE', score: 1250 }, '*'). You can also persist player progress across sessions with SAVE_STATE and LOAD_STATE messages.",
          "Once published, SYNTHPLAY automatically translates your game's title and description into 6 languages (English, Simplified Chinese, Japanese, Korean, Spanish, and Portuguese) and generates a 1200x630 social share card for X, Reddit, and Discord."
        ]
      }
    ]
  },
  {
    slug: "best-free-cyberpunk-browser-games-no-download",
    title: "10 Best Free Cyberpunk & AI Browser Games You Can Play Instantly (No Download)",
    titleZh: "10 款免下载即点即玩的赛博朋克与 AI 网页游戏推荐",
    description:
      "Discover 10 original, zero-download HTML5 browser games on SYNTHPLAY — from Neo-Tokyo highway drift racing and 2048 Volt puzzles to drone swarm survival and AI noir detective mysteries.",
    category: "PLAYER GUIDE",
    readMinutes: 5,
    publishedAt: "2026-11-26",
    keywords: [
      "best free browser games",
      "no download HTML5 games",
      "cyberpunk web games",
      "free AI games online",
      "mobile browser arcade games"
    ],
    recommendedGameSlugs: ["wangan-volt-drift", "hyper-survivor-zero", "volt-2048-matrix"],
    sections: [
      {
        heading: "Instant Action & Arcade Favorites",
        body: [
          "Wangan Volt Drift drops you onto a rain-slicked Neo-Tokyo expressway where precision lane-drifting and nitro chains push your speed past 280 km/h. If you prefer classic reflex challenges with a modern neon twist, Neon Serpent 2099 adds plasma overdrive boost and phase-shield powerups, while Pulse Breaker DX delivers 3X multiball brick-shattering chaos.",
          "For intense bullet-dodging action, Crimson Danmaku Zero pits your interceptor against escalating algorithmic boss patterns, and Hyper Survivor Zero lets you mow down crimson drone swarms with auto-scaling orbital blades and railguns."
        ]
      },
      {
        heading: "Tactics, Strategy, Puzzles & AI Storytelling",
        body: [
          "Prefer brainpower over twitch reflexes? Volt 2048 Matrix transforms the timeless tile-merging puzzle into a glowing cyber-core challenge that feels effortless on both keyboard and touchscreens. Iron Grid Protocol delivers tight turn-based mecha grid tactics, while Kepler Ring Logistics challenges you to balance orbital solar power, autonomous mining shuttles, and meteor laser defense.",
          "Finally, Ramen Alley 2099 blends classic noir investigation with AI-assisted suspect interrogation — interrogate synthetic witnesses, inspect clues, and crack cyber-district cases directly inside your browser."
        ]
      }
    ]
  },
  {
    slug: "build-html5-games-with-cursor-claude-deepseek",
    title: "Building Playable Canvas2D & WebGL Games with Cursor, Claude, and DeepSeek",
    titleZh: "用 Cursor、Claude 与 DeepSeek 打造高爽感 HTML5 小游戏的实战技巧",
    description:
      "Practical prompting patterns, game-loop architecture, and mobile touch-control checklists for creating addictive 60fps HTML5 browser games using modern AI coding assistants.",
    category: "CREATOR GUIDE",
    readMinutes: 5,
    publishedAt: "2026-11-26",
    keywords: [
      "build HTML5 game with Cursor",
      "Claude game development",
      "DeepSeek game coding",
      "Canvas2D 60fps tutorial",
      "AI indie game workflow"
    ],
    recommendedGameSlugs: ["monolith-breaker", "pulse-breaker-dx", "crimson-danmaku-zero"],
    sections: [
      {
        heading: "Start With a Tight 30-Second Core Loop",
        body: [
          "The most replayable web games communicate their rules in three seconds without walls of tutorial text. When prompting Cursor, Claude, or DeepSeek, ask for a single fixed-resolution Canvas2D stage (for example 680x420 scaled cleanly via CSS) driven by requestAnimationFrame with delta-time clamping so gameplay runs identically on 60Hz phones and 240Hz gaming monitors.",
          "Always specify immediate visual feedback ('game juice'): neon glow shadows, hit-stop sparks, combo counters, and a crisp Game Over overlay with a single-click Restart button."
        ]
      },
      {
        heading: "Design for Desktop + iPad + Mobile From Minute One",
        body: [
          "Over half of casual web arcade players open shared game links on a phone or tablet. Include pointer/touch handlers (touch-action: none on the canvas) alongside WASD/Arrow keys — swipe gestures for grid games, pointer drag for paddles, and hold-to-steer for top-down survival games.",
          "Once your prototype plays smoothly, upload it to SYNTHPLAY to get a permanent playable URL, automatic 6-language discovery, and real player feedback."
        ]
      }
    ]
  },
  {
    slug: "safe-html5-game-sandboxing-cloudflare-r2",
    title: "How SYNTHPLAY Isolates Community HTML5 Games with Cross-Origin Sandboxes & Cloudflare R2",
    titleZh: "SYNTHPLAY 如何通过独立沙盒域名与 Cloudflare R2 保障网页游戏安全",
    description:
      "A technical breakdown of SYNTHPLAY's dual-domain security model (synthplay.games vs *.synthplay-box.cloud), automated AST scanning, ZIP-bomb guards, and zero-egress R2 CDN delivery.",
    category: "ARCHITECTURE",
    readMinutes: 4,
    publishedAt: "2026-11-26",
    keywords: [
      "HTML5 game sandbox security",
      "Cloudflare R2 game hosting",
      "iframe cross-origin isolation",
      "web arcade architecture"
    ],
    recommendedGameSlugs: ["kepler-ring-tycoon", "iron-grid-protocol", "ramen-alley-2099"],
    sections: [
      {
        heading: "Why Game Code Must Never Run on the Main Auth Domain",
        body: [
          "Hosting community-uploaded JavaScript on the same root domain as user accounts is a classic XSS hazard: any malicious script could read session cookies or impersonate logged-in players.",
          "SYNTHPLAY enforces strict origin separation. The storefront lives at synthplay.games, while every community HTML5/ZIP bundle executes from its own isolated wildcard subdomain (*.synthplay-box.cloud) behind a Cloudflare Worker proxy with restrictive iframe sandbox attributes and Content Security Policy headers."
        ]
      },
      {
        heading: "Automated Upload Quarantine & Zero-Egress Global Speed",
        body: [
          "Before any ZIP bundle goes live, SYNTHPLAY validates file sizes against ZIP-bomb expansion attacks, inspects scripts for unsafe external cookie/token exfiltration, and checks asset integrity. Approved builds are served directly from Cloudflare R2 object storage so indie creators enjoy global CDN speed without bandwidth bills."
        ]
      }
    ]
  },
  {
    slug: "monetize-free-indie-web-games-without-paywalls",
    title: "How Indie HTML5 Developers Earn 100% of Player Tips Without Paywalls",
    titleZh: "独立网页游戏开发者如何零抽成获得全球玩家赞助与打赏",
    description:
      "Learn how to keep your browser games 100% free to play while earning global support via direct Ko-fi tips, Patreon memberships, and creator portfolio pages on SYNTHPLAY.",
    category: "MONETIZATION",
    readMinutes: 4,
    publishedAt: "2026-11-26",
    keywords: [
      "monetize HTML5 browser games",
      "Ko-fi indie game tips",
      "Patreon for game developers",
      "0% cut indie game platform"
    ],
    recommendedGameSlugs: ["wangan-volt-drift", "neon-serpent-2099", "hyper-survivor-zero"],
    sections: [
      {
        heading: "Free-to-Play Friction Wins Discovery",
        body: [
          "Players rarely buy a $5 download from an unknown indie studio, but thousands of players will click a browser link and play a free HTML5 game immediately. When players love your game, giving them an optional one-click tip link converts genuine fans without blocking viral sharing.",
          "Every creator on SYNTHPLAY gets an SEO-indexed profile page (/u/yourname) and direct Ko-fi, Patreon, or PayPal.me tip links on every game page — and SYNTHPLAY takes 0% of developer tips."
        ]
      },
      {
        heading: "Turn Free Web Prototypes Into Steam Wishlists & Loyal Communities",
        body: [
          "Use SYNTHPLAY to test core mechanics, gather 4-dimension community reviews (Gameplay, Visuals, AI Craft), and embed your Steam wishlist or Devlog links in your game description. Games that gain traction on our Global & Country Leaderboards organically attract players across North America, Europe, Japan, Korea, and Latin America."
        ]
      }
    ]
  }
];

export function getGuideBySlug(slug: string): GuideArticle | undefined {
  return GUIDE_ARTICLES.find((g) => g.slug === slug);
}
