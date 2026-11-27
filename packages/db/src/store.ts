import fs from "node:fs";
import path from "node:path";

export type GameStatus = "draft" | "pending_review" | "published" | "rejected" | "suspended";
export type PlayType = "html5_zip" | "single_html" | "free_download" | "external";
export type UserRole = "player" | "creator" | "moderator" | "admin";
export type UserStatus = "active" | "muted" | "banned";
export type SponsorPlacement = "hero_marquee" | "hall_diamond" | "hall_gold" | "jam_banner";
export type PaymentProvider = "creem" | "paypal" | "kofi" | "patreon" | "payoneer_b2b";

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  countryCode: string;
  locale: string;
  isProSupporter: boolean;
  isVerifiedCreator: boolean;
  status: UserStatus;
  creatorTipLinks: { kofi?: string; patreon?: string; paypalMe?: string };
  totalPlaysEarned: number;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  gameId: string;
  authorName: string;
  authorCountry: string;
  rating: number;
  gameplayScore: number;
  visualScore: number;
  aiScore: number;
  comment: string;
  createdAt: string;
}

export interface GameTranslationEntry {
  title: string;
  tagline: string;
  aiPromptNote?: string;
}

export interface GameRecord {
  id: string;
  slug: string;
  title: string;
  titleZh: string;
  tagline: string;
  taglineZh: string;
  translations?: Record<string, GameTranslationEntry>;
  creatorId: string;
  creatorName: string;
  creatorCountryCode: string;
  playType: PlayType;
  category: string;
  isAiCreated: boolean;
  aiTools: string[];
  aiPromptNote: string;
  coverImage: string;
  accentColor: string;
  status: GameStatus;
  totalValidPlays: number;
  plays24h: number;
  rating: number;
  countryPlays: Record<string, number>;
  sandboxHtml?: string;
  sandboxUrl?: string;
  securityScore: number;
  securityVerdict: "SAFE" | "REVIEW_REQUIRED" | "BLOCKED";
  creatorTipUrl?: string;
  publishedAt: string;
}

export interface SponsorSlotRecord {
  id: string;
  placement: SponsorPlacement;
  brandName: string;
  tagline: string;
  badgeLabel: string;
  targetUrl: string;
  countryCode: string;
  provider: PaymentProvider;
  monthlyUsd: number;
  isActive: boolean;
  clickCount: number;
}

export interface SponsorOrderRecord {
  id: string;
  externalRef?: string;
  payerName: string;
  payerEmail?: string;
  payerCountry: string;
  provider: PaymentProvider;
  tier: "diamond_b2b" | "gold_patron" | "supporter" | "pro_monthly";
  amountUsd: number;
  status: "paid" | "pending" | "disputed";
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface ScoreRecord {
  id: string;
  gameId: string;
  userId?: string;
  playerName: string;
  countryCode: string;
  score: number;
  createdAt: string;
}

export interface CloudSaveRecord {
  userId: string;
  gameId: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface SynthPlayStore {
  users: UserRecord[];
  games: GameRecord[];
  reviews: ReviewRecord[];
  sponsorSlots: SponsorSlotRecord[];
  sponsorOrders: SponsorOrderRecord[];
  auditLogs: AuditLogRecord[];
  scores?: ScoreRecord[];
  cloudSaves?: CloudSaveRecord[];
  monthlyFundingGoalUsd: number;
  monthlyFundingRaisedUsd: number;
}

const DEFAULT_STORE: SynthPlayStore = {
  monthlyFundingGoalUsd: 500,
  monthlyFundingRaisedUsd: 394,
  users: [
    {
      id: "usr-001",
      username: "KuroAI",
      email: "kuro@tokyo-arcade.jp",
      role: "creator",
      countryCode: "JP",
      locale: "ja",
      isProSupporter: true,
      isVerifiedCreator: true,
      status: "active",
      creatorTipLinks: { kofi: "https://ko-fi.com/kuroai", patreon: "https://patreon.com/kuroai" },
      totalPlaysEarned: 284100,
      createdAt: "2026-10-02T09:15:00Z"
    },
    {
      id: "usr-002",
      username: "NightOfSen",
      email: "founder@synthplay.games",
      role: "admin",
      countryCode: "CN",
      locale: "zh-CN",
      isProSupporter: true,
      isVerifiedCreator: true,
      status: "active",
      creatorTipLinks: { kofi: "https://ko-fi.com/synthplay" },
      totalPlaysEarned: 196500,
      createdAt: "2026-09-18T04:00:00Z"
    },
    {
      id: "usr-003",
      username: "VibePilot",
      email: "pilot@indieweb.us",
      role: "creator",
      countryCode: "US",
      locale: "en",
      isProSupporter: true,
      isVerifiedCreator: true,
      status: "active",
      creatorTipLinks: { patreon: "https://patreon.com/vibepilot" },
      totalPlaysEarned: 215800,
      createdAt: "2026-10-12T18:30:00Z"
    },
    {
      id: "usr-004",
      username: "MinhoForge",
      email: "minho@seoul-mecha.kr",
      role: "creator",
      countryCode: "KR",
      locale: "en",
      isProSupporter: false,
      isVerifiedCreator: true,
      status: "active",
      creatorTipLinks: { kofi: "https://ko-fi.com/minhoforge" },
      totalPlaysEarned: 142300,
      createdAt: "2026-10-20T11:20:00Z"
    },
    {
      id: "usr-005",
      username: "LucasBR",
      email: "lucas@rioarcade.br",
      role: "creator",
      countryCode: "BR",
      locale: "es",
      isProSupporter: false,
      isVerifiedCreator: false,
      status: "active",
      creatorTipLinks: { paypalMe: "https://paypal.me/lucasbr" },
      totalPlaysEarned: 118900,
      createdAt: "2026-11-01T14:40:00Z"
    },
    {
      id: "usr-006",
      username: "NeonByteDE",
      email: "neon@berlin-synth.de",
      role: "creator",
      countryCode: "DE",
      locale: "en",
      isProSupporter: true,
      isVerifiedCreator: true,
      status: "active",
      creatorTipLinks: { kofi: "https://ko-fi.com/neonbytede" },
      totalPlaysEarned: 96400,
      createdAt: "2026-11-05T08:10:00Z"
    }
  ],
  games: [
    {
      id: "gm-001",
      slug: "wangan-volt-drift",
      title: "WANGAN VOLT DRIFT",
      titleZh: "湾岸伏特漂移",
      tagline: "High-speed wet-asphalt Neo-Tokyo arcade touge racer with AI ghost rivals that adapt to your apex line.",
      taglineZh: "新东京雨夜高架高速街机漂移，内置自适应路线学习的 AI 幽灵车对手。",
      creatorId: "usr-001",
      creatorName: "KuroAI",
      creatorCountryCode: "JP",
      playType: "html5_zip",
      category: "RACING",
      isAiCreated: true,
      aiTools: ["Claude Code", "Three.js", "Suno Synth"],
      aiPromptNote: "Built in 48 hours using procedural asphalt shader reflections + real-time AI racing line cloning.",
      coverImage: "/games/tokyo-drift.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 184260,
      plays24h: 12840,
      rating: 4.94,
      countryPlays: { JP: 58400, US: 46200, CN: 34800, BR: 18900, KR: 14600, DE: 11360 },
      securityScore: 99,
      securityVerdict: "SAFE",
      creatorTipUrl: "https://ko-fi.com/kuroai",
      publishedAt: "2026-11-10T12:00:00Z"
    },
    {
      id: "gm-002",
      slug: "iron-grid-protocol",
      title: "IRON GRID PROTOCOL",
      titleZh: "钢铁网格协议",
      tagline: "Turn-based industrial mecha skirmish where an LLM tactical commander narrates and counters your squad.",
      taglineZh: "硬核工业机甲回合战术，由实时 AI 指挥官动态反制你的编队战术。",
      creatorId: "usr-004",
      creatorName: "MinhoForge",
      creatorCountryCode: "KR",
      playType: "html5_zip",
      category: "TACTICS",
      isAiCreated: true,
      aiTools: ["Cursor", "Godot HTML5", "Gemini Flash"],
      aiPromptNote: "Deterministic grid combat paired with lightweight AI enemy bark & strategy shifts.",
      coverImage: "/games/mecha-arena.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 142310,
      plays24h: 9420,
      rating: 4.88,
      countryPlays: { KR: 44100, US: 36500, JP: 28900, CN: 18400, DE: 8910, BR: 5500 },
      securityScore: 98,
      securityVerdict: "SAFE",
      creatorTipUrl: "https://ko-fi.com/minhoforge",
      publishedAt: "2026-11-12T09:00:00Z"
    },
    {
      id: "gm-003",
      slug: "ramen-alley-2099",
      title: "RAMEN ALLEY 2099",
      titleZh: "拉面深巷 2099",
      tagline: "Interrogate free-form AI suspects in a rain-soaked cyber alley. Every playthrough generates a new culprit.",
      taglineZh: "在雨夜赛博深巷自由审讯 AI 嫌疑人，每一局都实时生成全新真凶与证词漏洞。",
      creatorId: "usr-002",
      creatorName: "NightOfSen",
      creatorCountryCode: "CN",
      playType: "single_html",
      category: "AI NOIR",
      isAiCreated: true,
      aiTools: ["Claude", "Single-HTML", "AI NPC"],
      aiPromptNote: "Single 120KB HTML file with procedural rain audio, pixel shader & structured suspect memory.",
      coverImage: "/games/noir-detective.jpg",
      accentColor: "#00F0D4",
      status: "published",
      totalValidPlays: 168950,
      plays24h: 14120,
      rating: 4.96,
      countryPlays: { CN: 52400, US: 41200, JP: 33800, KR: 16900, DE: 13200, BR: 11450 },
      securityScore: 100,
      securityVerdict: "SAFE",
      creatorTipUrl: "https://ko-fi.com/synthplay",
      publishedAt: "2026-11-15T15:30:00Z"
    },
    {
      id: "gm-004",
      slug: "crimson-danmaku-zero",
      title: "CRIMSON DANMAKU ZERO",
      titleZh: "绯红弹幕零式",
      tagline: "60fps Cave-inspired vertical bullet-hell arcade cabinet. Procedural AI boss patterns escalate with your graze score.",
      taglineZh: "60帧纯正日系纵版弹幕街机，AI Boss 会根据你的擦弹轨迹实时演化几何弹幕阵。",
      creatorId: "usr-003",
      creatorName: "VibePilot",
      creatorCountryCode: "US",
      playType: "single_html",
      category: "SHMUP",
      isAiCreated: true,
      aiTools: ["Cursor", "Canvas2D", "WebAudio"],
      aiPromptNote: "Zero external assets: pure procedural ink vector sprites + FM synth boss soundtrack.",
      coverImage: "/games/bullet-hell.jpg",
      accentColor: "#FF2A3C",
      status: "published",
      totalValidPlays: 151820,
      plays24h: 11630,
      rating: 4.91,
      countryPlays: { US: 54200, JP: 39100, BR: 22800, CN: 16500, DE: 11220, KR: 8000 },
      securityScore: 100,
      securityVerdict: "SAFE",
      creatorTipUrl: "https://patreon.com/vibepilot",
      publishedAt: "2026-11-18T10:00:00Z"
    },
    {
      id: "gm-005",
      slug: "monolith-breaker",
      title: "MONOLITH BREAKER",
      titleZh: "黑石破界者",
      tagline: "Fast isometric cyber-blade roguelike inside an infinite AI-generated server cathedral.",
      taglineZh: "俯视角高节奏激光刃肉鸽地牢，无限探索 AI 实时构筑的地下服务器圣殿。",
      creatorId: "usr-006",
      creatorName: "NeonByteDE",
      creatorCountryCode: "DE",
      playType: "html5_zip",
      category: "ROGUELIKE",
      isAiCreated: true,
      aiTools: ["Gemini", "Phaser 3", "AI MapGen"],
      aiPromptNote: "AI room graph generator guarantees fair combat pacing and secret boss shrines.",
      coverImage: "/games/synth-dungeon.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 96410,
      plays24h: 7210,
      rating: 4.85,
      countryPlays: { DE: 26800, US: 24900, FR: 14200, BR: 12100, JP: 10410, CN: 8000 },
      securityScore: 97,
      securityVerdict: "SAFE",
      creatorTipUrl: "https://ko-fi.com/neonbytede",
      publishedAt: "2026-11-19T19:00:00Z"
    },
    {
      id: "gm-006",
      slug: "kepler-ring-tycoon",
      title: "KEPLER RING LOGISTICS",
      titleZh: "开普勒星环调度",
      tagline: "Minimalist hard-sci-fi orbital station builder with autonomous AI shuttle routing.",
      taglineZh: "硬科幻莫比乌斯风格轨道空间站建造，结合自主 AI 穿梭机物流调度。",
      creatorId: "usr-005",
      creatorName: "LucasBR",
      creatorCountryCode: "BR",
      playType: "html5_zip",
      category: "STRATEGY",
      isAiCreated: true,
      aiTools: ["Claude", "WebGL", "Procedural Audio"],
      aiPromptNote: "Runs at 60fps on mobile browsers with zero-download WebGL instanced shuttles.",
      coverImage: "/games/orbital-colony.jpg",
      accentColor: "#00F0D4",
      status: "published",
      totalValidPlays: 118940,
      plays24h: 8190,
      rating: 4.87,
      countryPlays: { BR: 41200, US: 29400, FR: 15800, DE: 13400, CN: 10240, JP: 8900 },
      securityScore: 99,
      securityVerdict: "SAFE",
      creatorTipUrl: "https://paypal.me/lucasbr",
      publishedAt: "2026-11-20T14:00:00Z"
    },
    {
      id: "gm-007",
      slug: "hyper-pong-overdrive",
      title: "HYPER PONG OVERDRIVE",
      titleZh: "超频霓虹弹球",
      tagline: "Submitted via Paste & Play — awaiting moderator approval in Admin Console.",
      taglineZh: "通过 AI 单文件粘贴提交，正在运营后台安全沙箱队列等待审核。",
      creatorId: "usr-005",
      creatorName: "LucasBR",
      creatorCountryCode: "BR",
      playType: "single_html",
      category: "ARCADE",
      isAiCreated: true,
      aiTools: ["ChatGPT", "Single-HTML"],
      aiPromptNote: "1-prompt retro kinetic paddle duel with screen-shake & combo multiplier.",
      coverImage: "/games/bullet-hell.jpg",
      accentColor: "#FF2A3C",
      status: "pending_review",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 4.8,
      countryPlays: {},
      securityScore: 95,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-25T16:10:00Z"
    }
  ],
  sponsorSlots: [
    {
      id: "sp-01",
      placement: "hero_marquee",
      brandName: "SYNTHCLOUD GPU",
      tagline: "WINTER AI GAME JAM TITLE SPONSOR · $500 PRIZE POOL",
      badgeLabel: "DIAMOND B2B",
      targetUrl: "https://synthplay.games/sponsor",
      countryCode: "US",
      provider: "payoneer_b2b",
      monthlyUsd: 299,
      isActive: true,
      clickCount: 1420
    },
    {
      id: "sp-02",
      placement: "hero_marquee",
      brandName: "PROMPTFORGE IDE",
      tagline: "BUILD WEBGL AI GAMES 5X FASTER · OFFICIAL AFFILIATE",
      badgeLabel: "AI PARTNER",
      targetUrl: "https://synthplay.games/sponsor",
      countryCode: "DE",
      provider: "paypal",
      monthlyUsd: 199,
      isActive: true,
      clickCount: 985
    },
    {
      id: "sp-03",
      placement: "hall_diamond",
      brandName: "SYNTHCLOUD COMPUTE",
      tagline: "Powering free edge inference & funding the Monthly 48H AI Game Jam prize pool.",
      badgeLabel: "DIAMOND TITLE",
      targetUrl: "https://synthplay.games/sponsor",
      countryCode: "US",
      provider: "payoneer_b2b",
      monthlyUsd: 299,
      isActive: true,
      clickCount: 842
    },
    {
      id: "sp-04",
      placement: "hall_gold",
      brandName: "@SoraDev_Tokyo",
      tagline: "6-month continuous supporter. Keeping browser indie games 100% free & ad-light.",
      badgeLabel: "GOLD PATRON",
      targetUrl: "https://synthplay.games",
      countryCode: "JP",
      provider: "kofi",
      monthlyUsd: 35,
      isActive: true,
      clickCount: 314
    },
    {
      id: "sp-05",
      placement: "hall_gold",
      brandName: "PIXELWAVE AUDIO",
      tagline: "Royalty-free retro arcade SFX & FM synth packs for all SYNTHPLAY creators.",
      badgeLabel: "GOLD PATRON",
      targetUrl: "https://synthplay.games/sponsor",
      countryCode: "KR",
      provider: "creem",
      monthlyUsd: 49,
      isActive: true,
      clickCount: 412
    }
  ],
  sponsorOrders: [
    {
      id: "ord-1001",
      payerName: "SynthCloud Labs Inc.",
      payerCountry: "US",
      provider: "payoneer_b2b",
      tier: "diamond_b2b",
      amountUsd: 299,
      status: "paid",
      createdAt: "2026-11-02T10:12:00Z"
    },
    {
      id: "ord-1002",
      payerName: "SoraDev_Tokyo",
      payerCountry: "JP",
      provider: "kofi",
      tier: "gold_patron",
      amountUsd: 35,
      status: "paid",
      createdAt: "2026-11-11T08:45:00Z"
    },
    {
      id: "ord-1003",
      payerName: "PixelWave Audio Ltd.",
      payerCountry: "KR",
      provider: "creem",
      tier: "gold_patron",
      amountUsd: 49,
      status: "paid",
      createdAt: "2026-11-14T15:20:00Z"
    },
    {
      id: "ord-1004",
      payerName: "AlexVibe",
      payerCountry: "US",
      provider: "patreon",
      tier: "pro_monthly",
      amountUsd: 5,
      status: "paid",
      createdAt: "2026-11-22T20:05:00Z"
    },
    {
      id: "ord-1005",
      payerName: "NeonByteDE",
      payerCountry: "DE",
      provider: "paypal",
      tier: "supporter",
      amountUsd: 15,
      status: "paid",
      createdAt: "2026-11-24T11:30:00Z"
    }
  ],
  reviews: [
    {
      id: "rev-001",
      gameId: "gm-001",
      authorName: "SoraDev_Tokyo",
      authorCountry: "JP",
      rating: 5,
      gameplayScore: 5,
      visualScore: 5,
      aiScore: 5,
      comment: "The wet-asphalt reflection shader + adaptive AI ghost line feels like a genuine Sega arcade cabinet in Chrome.",
      createdAt: "2026-11-18T11:20:00Z"
    },
    {
      id: "rev-002",
      gameId: "gm-003",
      authorName: "VibePilot",
      authorCountry: "US",
      rating: 5,
      gameplayScore: 5,
      visualScore: 5,
      aiScore: 5,
      comment: "Insane that this entire cyber-noir AI detective mystery runs in a single HTML file with zero loading screens.",
      createdAt: "2026-11-21T08:15:00Z"
    }
  ],
  auditLogs: [
    {
      id: "aud-01",
      actor: "founder@synthplay.games",
      action: "GAME_APPROVED",
      target: "gm-006 (KEPLER RING LOGISTICS)",
      detail: "Sandbox scan score 99/100; verified free play compliance.",
      createdAt: "2026-11-20T14:02:00Z"
    },
    {
      id: "aud-02",
      actor: "founder@synthplay.games",
      action: "SPONSOR_ACTIVATED",
      target: "sp-01 (SYNTHCLOUD GPU)",
      detail: "Activated hero_marquee slot via Payoneer B2B Billing invoice.",
      createdAt: "2026-11-02T10:15:00Z"
    }
  ]
};

function getStorePath(): string {
  const explicit = process.env.SYNTHPLAY_STORE_PATH;
  if (explicit) return explicit;
  const cwd = process.cwd();
  const root = cwd.includes(`${path.sep}apps${path.sep}`)
    ? path.resolve(cwd, "..", "..")
    : cwd;
  return path.join(root, "data", "synthplay-store.json");
}

export function getDefaultStoreSnapshot(): SynthPlayStore {
  return structuredClone(DEFAULT_STORE);
}

export function readStore(): SynthPlayStore {
  const filePath = getStorePath();
  try {
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_STORE, null, 2), "utf-8");
      return structuredClone(DEFAULT_STORE);
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as SynthPlayStore;
    if (!Array.isArray(parsed.reviews)) parsed.reviews = structuredClone(DEFAULT_STORE.reviews);
    return parsed;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export function writeStore(store: SynthPlayStore): void {
  const filePath = getStorePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
}

export function computeCountryPowerRankings(games: GameRecord[]) {
  const map = new Map<string, { countryCode: string; totalPlays: number; gameCount: number; avgRating: number; ratingSum: number }>();

  for (const g of games) {
    if (g.status !== "published") continue;
    const prev = map.get(g.creatorCountryCode) ?? {
      countryCode: g.creatorCountryCode,
      totalPlays: 0,
      gameCount: 0,
      avgRating: 0,
      ratingSum: 0
    };
    prev.totalPlays += g.totalValidPlays;
    prev.gameCount += 1;
    prev.ratingSum += g.rating;
    prev.avgRating = Number((prev.ratingSum / prev.gameCount).toFixed(2));
    map.set(g.creatorCountryCode, prev);
  }

  return Array.from(map.values()).sort((a, b) => b.totalPlays - a.totalPlays);
}
