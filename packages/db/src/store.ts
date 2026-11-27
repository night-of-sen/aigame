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
  monthlyFundingGoalUsd: 50,
  monthlyFundingRaisedUsd: 0,
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
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 99,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-10T12:00:00Z"
    },
    {
      id: "gm-002",
      slug: "iron-grid-protocol",
      title: "IRON GRID PROTOCOL",
      titleZh: "钢铁网格协议",
      tagline: "Turn-based industrial mecha skirmish where an adaptive AI commander counters your squad.",
      taglineZh: "硬核工业机甲回合战术，由自适应 AI 指挥官动态反制你的编队战术。",
      creatorId: "usr-004",
      creatorName: "MinhoForge",
      creatorCountryCode: "KR",
      playType: "html5_zip",
      category: "TACTICS",
      isAiCreated: true,
      aiTools: ["Cursor", "HTML5 Canvas", "TypeScript"],
      aiPromptNote: "Deterministic 6x6 grid combat paired with tactical AI enemy barks & wave escalation.",
      coverImage: "/games/mecha-arena.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 98,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-12T09:00:00Z"
    },
    {
      id: "gm-003",
      slug: "ramen-alley-2099",
      title: "RAMEN ALLEY 2099",
      titleZh: "拉面深巷 2099",
      tagline: "Interrogate procedural suspects in a rain-soaked cyber alley. Every playthrough generates a new culprit.",
      taglineZh: "在雨夜赛博深巷交叉审讯嫌疑人，每一局都实时生成全新真凶与证词漏洞。",
      creatorId: "usr-002",
      creatorName: "NightOfSen",
      creatorCountryCode: "CN",
      playType: "single_html",
      category: "AI NOIR",
      isAiCreated: true,
      aiTools: ["Claude", "Single-HTML", "Procedural Logic"],
      aiPromptNote: "Zero-download noir deduction game with procedural clues, biometric scans & streak scoring.",
      coverImage: "/games/noir-detective.jpg",
      accentColor: "#00F0D4",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 100,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-15T15:30:00Z"
    },
    {
      id: "gm-004",
      slug: "crimson-danmaku-zero",
      title: "CRIMSON DANMAKU ZERO",
      titleZh: "绯红弹幕零式",
      tagline: "60fps Cave-inspired vertical bullet-hell arcade cabinet with graze scoring and escalating boss patterns.",
      taglineZh: "60帧纯正日系纵版弹幕街机，支持精准擦弹计分与多阶段几何弹幕 Boss 战。",
      creatorId: "usr-003",
      creatorName: "VibePilot",
      creatorCountryCode: "US",
      playType: "single_html",
      category: "SHMUP",
      isAiCreated: true,
      aiTools: ["Cursor", "Canvas2D", "WebAudio"],
      aiPromptNote: "Zero external assets: pure procedural vector bullet-hell with Hyper-Bomb screen clear.",
      coverImage: "/games/bullet-hell.jpg",
      accentColor: "#FF2A3C",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 100,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-18T10:00:00Z"
    },
    {
      id: "gm-005",
      slug: "monolith-breaker",
      title: "MONOLITH BREAKER",
      titleZh: "黑石破界者",
      tagline: "Fast top-down cyber-blade roguelike with dash-slash combat and between-floor cyber augment drafts.",
      taglineZh: "俯视角高节奏激光刃肉鸽地牢，支持冲刺斩击与每层三选一赛博义体强化。",
      creatorId: "usr-006",
      creatorName: "NeonByteDE",
      creatorCountryCode: "DE",
      playType: "html5_zip",
      category: "ROGUELIKE",
      isAiCreated: true,
      aiTools: ["Gemini", "Canvas2D", "AI MapGen"],
      aiPromptNote: "Fast wave-based server cathedral roguelike with instant mobile tap-to-dash controls.",
      coverImage: "/games/synth-dungeon.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 97,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-19T19:00:00Z"
    },
    {
      id: "gm-006",
      slug: "kepler-ring-tycoon",
      title: "KEPLER RING LOGISTICS",
      titleZh: "开普勒星环调度",
      tagline: "Minimalist hard-sci-fi orbital station builder with autonomous cargo shuttles and laser defense.",
      taglineZh: "硬科幻轨道空间站建造与塔防，部署太阳能阵列、自主采矿穿梭机与陨石防御炮塔。",
      creatorId: "usr-005",
      creatorName: "LucasBR",
      creatorCountryCode: "BR",
      playType: "html5_zip",
      category: "STRATEGY",
      isAiCreated: true,
      aiTools: ["Claude", "Canvas2D", "Procedural Audio"],
      aiPromptNote: "Runs at 60fps on desktop and mobile browsers with zero-download orbital ring logistics.",
      coverImage: "/games/orbital-colony.jpg",
      accentColor: "#00F0D4",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 99,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-20T14:00:00Z"
    },
    {
      id: "gm-008",
      slug: "neon-serpent-2099",
      title: "NEON SERPENT 2099",
      titleZh: "霓虹蛇影 2099",
      tagline: "High-speed cyber light-trail serpent with plasma overdrive boost, combo multipliers, and phase-shield powerups.",
      taglineZh: "高速赛博光轨贪吃蛇，支持加速喷射、连击倍率、相位穿身护盾与手机触屏滑动。",
      translations: {
        en: { title: "NEON SERPENT 2099", tagline: "High-speed cyber light-trail serpent with plasma overdrive boost, combo multipliers, and phase-shield powerups." },
        "zh-CN": { title: "霓虹蛇影 2099", tagline: "高速赛博光轨贪吃蛇，支持加速喷射、连击倍率、相位穿身护盾与手机触屏滑动。" },
        ja: { title: "ネオンサーペント 2099", tagline: "プラズマブースト、コンボ倍率、フェーズシールド搭載のハイスピード・サイバースネーク。" },
        ko: { title: "네온 서펀트 2099", tagline: "플라즈마 부스트, 콤보 배율, 페이즈 실드가 결합된 초고속 사이버 스네이크 아케이드." },
        es: { title: "NEON SERPENT 2099", tagline: "Serpiente ciberpunk de alta velocidad con turbo de plasma, combos y escudo de fase." },
        "pt-BR": { title: "NEON SERPENT 2099", tagline: "Serpente cyberpunk em alta velocidade com boost de plasma, combos e escudo de fase." }
      },
      creatorId: "usr-002",
      creatorName: "NightOfSen",
      creatorCountryCode: "CN",
      playType: "single_html",
      category: "ARCADE",
      isAiCreated: true,
      aiTools: ["Cursor", "Canvas2D", "DeepSeek"],
      aiPromptNote: "Zero-latency 60fps grid arcade with wrap-around edges, overdrive boost, and native mobile swipe controls.",
      coverImage: "/games/neon-serpent.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 99,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-26T18:00:00Z"
    },
    {
      id: "gm-009",
      slug: "volt-2048-matrix",
      title: "VOLT 2048 MATRIX",
      titleZh: "伏特 2048 矩阵",
      tagline: "Neon energy-core tile merging puzzle — fuse matching Volt cubes up to 2048 with instant keyboard & swipe controls.",
      taglineZh: "赛博霓虹能量核合成益智游戏——滑动合并同级伏特方块冲击 2048 高分榜。",
      translations: {
        en: { title: "VOLT 2048 MATRIX", tagline: "Neon energy-core tile merging puzzle — fuse matching Volt cubes up to 2048 with instant keyboard & swipe controls." },
        "zh-CN": { title: "伏特 2048 矩阵", tagline: "赛博霓虹能量核合成益智游戏——滑动合并同级伏特方块冲击 2048 高分榜。" },
        ja: { title: "ボルト 2048 マトリックス", tagline: "ネオンエネルギーコアを合成して2048を目指すサイバーパズル。" },
        ko: { title: "볼트 2048 매트릭스", tagline: "네온 에너지 코어를 합쳐 2048에 도전하는 사이버 퍼즐 매트릭스." },
        es: { title: "VOLT 2048 MATRIX", tagline: "Rompecabezas neón de fusión de núcleos de energía hasta 2048 con teclado o gestos." },
        "pt-BR": { title: "VOLT 2048 MATRIX", tagline: "Quebra-cabeça neon de fusão de cubos de energia até 2048 para desktop e celular." }
      },
      creatorId: "usr-001",
      creatorName: "KuroAI",
      creatorCountryCode: "JP",
      playType: "single_html",
      category: "PUZZLE",
      isAiCreated: true,
      aiTools: ["Claude", "React", "AI Design"],
      aiPromptNote: "Built for crisp 10-minute puzzle sessions across desktop, iPad, and mobile touchscreens.",
      coverImage: "/games/volt-2048.jpg",
      accentColor: "#00F0D4",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 100,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-26T18:30:00Z"
    },
    {
      id: "gm-010",
      slug: "pulse-breaker-dx",
      title: "PULSE BREAKER DX",
      titleZh: "脉冲破砖 DX",
      tagline: "Explosive neon Arkanoid brick-breaker with 3X multiball drops, wide laser paddles, and escalating cyber waves.",
      taglineZh: "高爽感霓虹打砖块街机，支持三球分裂、宽幅激光挡板、碎片粒子与多波次挑战。",
      translations: {
        en: { title: "PULSE BREAKER DX", tagline: "Explosive neon Arkanoid brick-breaker with 3X multiball drops, wide laser paddles, and escalating cyber waves." },
        "zh-CN": { title: "脉冲破砖 DX", tagline: "高爽感霓虹打砖块街机，支持三球分裂、宽幅激光挡板、碎片粒子与多波次挑战。" },
        ja: { title: "パルスブレイカー DX", tagline: "3倍マルチボール＆ワイドレーザーパドル搭載の爽快ネオンブロック崩し。" },
        ko: { title: "펄스 브레이커 DX", tagline: "3배 멀티볼과 와이드 레이저 패들로 즐기는 짜릿한 네온 벽돌깨기." },
        es: { title: "PULSE BREAKER DX", tagline: "Rompeladrillos neón explosivo con multibola 3X, paleta láser ancha y oleadas crecientes." },
        "pt-BR": { title: "PULSE BREAKER DX", tagline: "Quebra-blocos neon explosivo com multibola 3X, raquete laser larga e ondas crescentes." }
      },
      creatorId: "usr-003",
      creatorName: "VibePilot",
      creatorCountryCode: "US",
      playType: "html5_zip",
      category: "BRICK",
      isAiCreated: true,
      aiTools: ["Gemini", "Canvas2D", "Physics2D"],
      aiPromptNote: "Responsive mouse/touch-drag paddle control with particle shatter physics and multi-wave progression.",
      coverImage: "/games/pulse-breaker.jpg",
      accentColor: "#FF2A3C",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 99,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-26T19:00:00Z"
    },
    {
      id: "gm-011",
      slug: "hyper-survivor-zero",
      title: "HYPER SURVIVOR ZERO",
      titleZh: "超限幸存者 ZERO",
      tagline: "Cyberpunk swarm survival arena — dodge crimson drones, collect magnetic XP gems, and upgrade orbital blades & railguns.",
      taglineZh: "赛博弹幕割草生存竞技场——躲避无人机潮、吸取经验宝石升级旋转光刃与自动轨道炮。",
      translations: {
        en: { title: "HYPER SURVIVOR ZERO", tagline: "Cyberpunk swarm survival arena — dodge crimson drones, collect magnetic XP gems, and upgrade orbital blades & railguns." },
        "zh-CN": { title: "超限幸存者 ZERO", tagline: "赛博弹幕割草生存竞技场——躲避无人机潮、吸取经验宝石升级旋转光刃与自动轨道炮。" },
        ja: { title: "ハイパーサバイバー ZERO", tagline: "ドローン大群を回避し、XPジェムで回転ブレードとレールガンを強化するサバイバルアクション。" },
        ko: { title: "하이퍼 서바이버 ZERO", tagline: "드론 무리를 피해 경험치 젬을 모아 궤도 블레이드와 레일건을 강화하는 생존 아레나." },
        es: { title: "HYPER SURVIVOR ZERO", tagline: "Arena de supervivencia ciberpunk: esquiva enjambres de drones y mejora cuchillas orbitales y railguns." },
        "pt-BR": { title: "HYPER SURVIVOR ZERO", tagline: "Arena cyberpunk de sobrevivência contra enxames de drones com lâminas orbitais e railguns." }
      },
      creatorId: "usr-004",
      creatorName: "MinhoForge",
      creatorCountryCode: "KR",
      playType: "html5_zip",
      category: "SURVIVAL",
      isAiCreated: true,
      aiTools: ["Cursor", "Claude", "Canvas2D"],
      aiPromptNote: "Vampire-Survivors-inspired instant web arena with touch-hold steering and auto-scaling orbital weapons.",
      coverImage: "/games/hyper-survivor.jpg",
      accentColor: "#00F0D4",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      securityScore: 98,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-26T19:30:00Z"
    }
  ],
  sponsorSlots: [],
  sponsorOrders: [],
  reviews: [],
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
