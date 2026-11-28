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
      tagline: "High-speed arcade super-scaler highway racer with rolling hills, sweeping curves, rival traffic, and lap timing.",
      taglineZh: "经典街机超缩放高速赛车，具备起伏坡道、高速弯道、穿梭车流与圈速竞速体验。",
      creatorId: "usr-001",
      creatorName: "KuroAI",
      creatorCountryCode: "JP",
      playType: "html5_zip",
      category: "RACING",
      isAiCreated: true,
      aiTools: ["HTML5 Canvas", "Super-Scaler 3D", "JS Racer (MIT)"],
      aiPromptNote: "Powered by MIT Javascript Racer super-scaler road engine, reskinned for SYNTHPLAY with touch controls & live telemetry.",
      coverImage: "/games/tokyo-drift.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      sandboxUrl: "/arcade/wangan-racer/index.html",
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
      title: "MONOLITH BREAKER: UNDERRUN",
      titleZh: "黑石破界者：深渊重启",
      tagline: "Real-time 3D WebGL cyberpunk twin-stick dungeon shooter — fight spider bots & turrets with dynamic lighting to reboot offline server cores.",
      taglineZh: "真 3D WebGL 赛博朋克双摇杆地牢射击——动态光影下击溃机械蜘蛛与炮塔，重启离线服务器核心。",
      creatorId: "usr-006",
      creatorName: "NeonByteDE",
      creatorCountryCode: "DE",
      playType: "html5_zip",
      category: "ROGUELIKE",
      isAiCreated: true,
      aiTools: ["WebGL 3D", "Dynamic Lighting", "Underrun (MIT)"],
      aiPromptNote: "Powered by Dominic Szablewski's acclaimed MIT WebGL engine Underrun with WebAudio synth music & SYNTHPLAY score bridge.",
      coverImage: "/games/synth-dungeon.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      sandboxUrl: "/arcade/underrun/index.html",
      securityScore: 99,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-19T19:00:00Z"
    },
    {
      id: "gm-006",
      slug: "kepler-ring-tycoon",
      title: "KEPLER RING: VOIDCALL RTS",
      titleZh: "开普勒星环：虚空召唤 RTS",
      tagline: "3D WebGL sci-fi real-time strategy — deploy your planetary lander, harvest energy wells, build plasma turrets, and command mech squads.",
      taglineZh: "真 3D WebGL 硬核科幻即时战略——降落星球基地、采集能量井、建造等离子炮塔并指挥机甲编队反击。",
      creatorId: "usr-005",
      creatorName: "LucasBR",
      creatorCountryCode: "BR",
      playType: "html5_zip",
      category: "STRATEGY",
      isAiCreated: true,
      aiTools: ["WebGL 3D", "Real-Time Strategy", "Voidcall (MIT)"],
      aiPromptNote: "Powered by Dominic Szablewski's MIT 3D WebGL RTS engine Voidcall with dynamic planet shadows & WebAudio synth OST.",
      coverImage: "/games/orbital-colony.jpg",
      accentColor: "#00F0D4",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      sandboxUrl: "/arcade/voidcall/index.html",
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
    },
    {
      id: "gm-012",
      slug: "hexgl-neo-velocity",
      title: "HEXGL: NEO VELOCITY",
      titleZh: "极速反重力 3D：HEXGL",
      tagline: "Full 3D WebGL futuristic anti-gravity hover-racer inspired by WipEout & F-Zero — boost pads, 3-lap time trials, and 60fps Three.js tracks.",
      taglineZh: "真 3D WebGL 未来反重力浮空飞船竞速，致敬《反重力赛车》与 F-Zero，支持加速带、三圈竞速与触控/键盘双操控。",
      translations: {
        en: { title: "HEXGL: NEO VELOCITY", tagline: "Full 3D WebGL futuristic anti-gravity hover-racer inspired by WipEout & F-Zero — boost pads, 3-lap time trials, and 60fps Three.js tracks." },
        "zh-CN": { title: "极速反重力 3D：HEXGL", tagline: "真 3D WebGL 未来反重力浮空飞船竞速，致敬《反重力赛车》与 F-Zero，支持加速带、三圈竞速与触控/键盘双操控。" },
        ja: { title: "HEXGL: ネオ・ヴェロシティ 3D", tagline: "ワイプアウト＆F-ZEROにインスパイアされた本格3D WebGL反重力ホバーレース。ブーストパッドと3周タイムアタック搭載。" },
        ko: { title: "HEXGL: 네오 벨로시티 3D", tagline: "와이프아웃과 F-Zero에서 영감을 받은 풀 3D WebGL 반중력 호버 레이싱 게임." },
        es: { title: "HEXGL: NEO VELOCITY 3D", tagline: "Carreras futuristas antigravedad en 3D WebGL al estilo WipEout y F-Zero con propulsores y contrarreloj." },
        "pt-BR": { title: "HEXGL: NEO VELOCITY 3D", tagline: "Corrida futurista antigravidade em 3D WebGL inspirada em WipEout e F-Zero direto no navegador." }
      },
      creatorId: "usr-001",
      creatorName: "KuroAI",
      creatorCountryCode: "JP",
      playType: "html5_zip",
      category: "RACING",
      isAiCreated: false,
      aiTools: ["Three.js 3D", "WebGL", "HexGL (MIT)"],
      aiPromptNote: "Open-source MIT 3D WebGL engine by Thibaut Despoulain (BKcore), modernized for Chrome/Safari WebAudio & SYNTHPLAY leaderboards.",
      coverImage: "/games/hexgl-velocity.jpg",
      accentColor: "#00F0D4",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      sandboxUrl: "/arcade/hexgl/index.html",
      securityScore: 100,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-27T18:00:00Z"
    },
    {
      id: "gm-013",
      slug: "quakedrome-3d",
      title: "QUAKEDROME 3D",
      titleZh: "雷神竞技场 3D FPS",
      tagline: "Full 3D WebGL Quake-inspired first-person arena shooter — shotgun, nailgun, grenade launcher, multi-level corridors, and WebAudio synth metal.",
      taglineZh: "真 3D WebGL 雷神风格第一人称射击（FPS）——霰弹枪、钉枪、榴弹发射器、多层 3D 堡垒与动态火光渲染，打开浏览器即开战。",
      translations: {
        en: { title: "QUAKEDROME 3D", tagline: "Full 3D WebGL Quake-inspired first-person arena shooter — shotgun, nailgun, grenade launcher, multi-level corridors, and WebAudio synth metal." },
        "zh-CN": { title: "雷神竞技场 3D FPS", tagline: "真 3D WebGL 雷神风格第一人称射击（FPS）——霰弹枪、钉枪、榴弹发射器、多层 3D 堡垒与动态火光渲染，打开浏览器即开战。" },
        ja: { title: "クエイクドーム 3D FPS", tagline: "ショットガン、ネイルガン、グレネードランチャーを搭載した本格3D WebGLアリーナFPS。" },
        ko: { title: "퀘이크드롬 3D FPS", tagline: "샷건, 네일건, 유탄 발사기와 3D 아레나를 브라우저에서 바로 즐기는 정통 3D WebGL FPS." },
        es: { title: "QUAKEDROME 3D FPS", tagline: "Shooter 3D en primera persona estilo Quake en WebGL con escopeta, pistola de clavos y lanzagranadas." },
        "pt-BR": { title: "QUAKEDROME 3D FPS", tagline: "FPS 3D WebGL estilo Quake direto no navegador com escopeta, nailgun e lançador de granadas." }
      },
      creatorId: "usr-002",
      creatorName: "NightOfSen",
      creatorCountryCode: "CN",
      playType: "html5_zip",
      category: "FPS",
      isAiCreated: false,
      aiTools: ["WebGL 3D FPS", "Pointer Lock", "Q1K3 (MIT)"],
      aiPromptNote: "Powered by Dominic Szablewski's legendary MIT 3D WebGL FPS engine Q1K3 with custom SYNTHPLAY HUD & live kill leaderboard.",
      coverImage: "/games/quakedrome-3d.jpg",
      accentColor: "#FF2A3C",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      sandboxUrl: "/arcade/quakedrome/index.html",
      securityScore: 100,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-27T18:30:00Z"
    },
    {
      id: "gm-014",
      slug: "astray-3d-labyrinth",
      title: "ASTRAY 3D LABYRINTH",
      titleZh: "迷失 3D 物理迷宫",
      tagline: "Real Three.js 3D shadowed brick labyrinth powered by Box2D sphere physics — roll the steel ball through procedurally growing mazes.",
      taglineZh: "真 Three.js 3D 光影砖墙迷宫与 Box2D 滚球物理引擎——操控金属钢球穿越不断扩张的程序化 3D 迷宫。",
      translations: {
        en: { title: "ASTRAY 3D LABYRINTH", tagline: "Real Three.js 3D shadowed brick labyrinth powered by Box2D sphere physics — roll the steel ball through procedurally growing mazes." },
        "zh-CN": { title: "迷失 3D 物理迷宫", tagline: "真 Three.js 3D 光影砖墙迷宫与 Box2D 滚球物理引擎——操控金属钢球穿越不断扩张的程序化 3D 迷宫。" },
        ja: { title: "アストレイ 3D ラビリンス", tagline: "Three.jsとBox2D物理演算で鉄球を転がし、自動生成される3D迷宮を突破するパズルアクション。" },
        ko: { title: "어스트레이 3D 라비린스", tagline: "Three.js 3D 그래픽과 Box2D 물리 엔진으로 강철 구슬을 굴려 미로를 탈출하는 3D 퍼즐." },
        es: { title: "ASTRAY 3D LABYRINTH", tagline: "Laberinto 3D en Three.js con físicas Box2D: guía la esfera metálica por niveles procedurales." },
        "pt-BR": { title: "ASTRAY 3D LABYRINTH", tagline: "Labirinto 3D em Three.js com física Box2D: guie a esfera de aço por labirintos infinitos." }
      },
      creatorId: "usr-003",
      creatorName: "VibePilot",
      creatorCountryCode: "US",
      playType: "html5_zip",
      category: "PUZZLE",
      isAiCreated: false,
      aiTools: ["Three.js 3D", "Box2D Physics", "Astray (Unlicense)"],
      aiPromptNote: "Open-source public domain Three.js + Box2DWeb 3D labyrinth enhanced with WASD, mobile D-pad & SYNTHPLAY score tracking.",
      coverImage: "/games/astray-labyrinth.jpg",
      accentColor: "#F3FF00",
      status: "published",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      sandboxUrl: "/arcade/astray/index.html",
      securityScore: 100,
      securityVerdict: "SAFE",
      publishedAt: "2026-11-27T19:00:00Z"
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
