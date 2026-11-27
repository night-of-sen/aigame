import postgres from "postgres";
import Redis from "ioredis";
import {
  getDefaultStoreSnapshot,
  readStore,
  writeStore,
  type AuditLogRecord,
  type CloudSaveRecord,
  type GameRecord,
  type GameTranslationEntry,
  type ReviewRecord,
  type ScoreRecord,
  type SponsorOrderRecord,
  type SponsorSlotRecord,
  type SynthPlayStore,
  type UserRecord
} from "./store";

type SqlClient = ReturnType<typeof postgres>;

let sqlClient: SqlClient | null = null;
let pgReadyPromise: Promise<boolean> | null = null;
let pgAvailable = false;

let redisClient: Redis | null = null;
let redisTried = false;

function getSql(): SqlClient | null {
  const url = process.env.DATABASE_URL;
  if (!url || process.env.NEXT_PHASE === "phase-production-build") return null;
  if (!sqlClient) {
    sqlClient = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 4
    });
  }
  return sqlClient;
}

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url || process.env.NEXT_PHASE === "phase-production-build") return null;
  if (!redisTried) {
    redisTried = true;
    try {
      redisClient = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true
      });
      redisClient.on("error", () => {
        // Non-fatal: Redis leaderboard cache falls back to PostgreSQL
      });
    } catch {
      redisClient = null;
    }
  }
  return redisClient;
}

async function ensurePgReady(): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  if (pgReadyPromise) return pgReadyPromise;

  pgReadyPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS sp_users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT,
          role TEXT NOT NULL DEFAULT 'player',
          country_code TEXT NOT NULL DEFAULT 'US',
          locale TEXT NOT NULL DEFAULT 'en',
          is_pro_supporter BOOLEAN NOT NULL DEFAULT FALSE,
          is_verified_creator BOOLEAN NOT NULL DEFAULT FALSE,
          status TEXT NOT NULL DEFAULT 'active',
          creator_tip_links JSONB NOT NULL DEFAULT '{}'::jsonb,
          total_plays_earned INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sp_games (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          title_zh TEXT NOT NULL,
          tagline TEXT NOT NULL,
          tagline_zh TEXT NOT NULL,
          creator_id TEXT NOT NULL,
          creator_name TEXT NOT NULL,
          creator_country_code TEXT NOT NULL DEFAULT 'US',
          play_type TEXT NOT NULL DEFAULT 'html5_zip',
          category TEXT NOT NULL DEFAULT 'ARCADE',
          is_ai_created BOOLEAN NOT NULL DEFAULT TRUE,
          ai_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
          ai_prompt_note TEXT NOT NULL DEFAULT '',
          cover_image TEXT NOT NULL,
          accent_color TEXT NOT NULL DEFAULT '#F3FF00',
          status TEXT NOT NULL DEFAULT 'pending_review',
          total_valid_plays BIGINT NOT NULL DEFAULT 0,
          plays_24h INTEGER NOT NULL DEFAULT 0,
          rating DOUBLE PRECISION NOT NULL DEFAULT 4.8,
          country_plays JSONB NOT NULL DEFAULT '{}'::jsonb,
          sandbox_html TEXT,
          sandbox_url TEXT,
          translations JSONB NOT NULL DEFAULT '{}'::jsonb,
          security_score INTEGER NOT NULL DEFAULT 95,
          security_verdict TEXT NOT NULL DEFAULT 'SAFE',
          creator_tip_url TEXT,
          published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`ALTER TABLE sp_games ADD COLUMN IF NOT EXISTS sandbox_url TEXT;`;
      await sql`ALTER TABLE sp_games ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;`;

      await sql`
        CREATE TABLE IF NOT EXISTS sp_reviews (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          author_country TEXT NOT NULL DEFAULT 'US',
          rating INTEGER NOT NULL DEFAULT 5,
          gameplay_score INTEGER NOT NULL DEFAULT 5,
          visual_score INTEGER NOT NULL DEFAULT 5,
          ai_score INTEGER NOT NULL DEFAULT 5,
          comment TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sp_sponsor_slots (
          id TEXT PRIMARY KEY,
          placement TEXT NOT NULL,
          brand_name TEXT NOT NULL,
          tagline TEXT NOT NULL,
          badge_label TEXT NOT NULL,
          target_url TEXT NOT NULL,
          country_code TEXT NOT NULL DEFAULT 'US',
          provider TEXT NOT NULL DEFAULT 'creem',
          monthly_usd INTEGER NOT NULL DEFAULT 35,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          click_count INTEGER NOT NULL DEFAULT 0
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sp_sponsor_orders (
          id TEXT PRIMARY KEY,
          external_ref TEXT,
          payer_name TEXT NOT NULL,
          payer_email TEXT,
          payer_country TEXT NOT NULL DEFAULT 'US',
          provider TEXT NOT NULL,
          tier TEXT NOT NULL,
          amount_usd INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'paid',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`ALTER TABLE sp_sponsor_orders ADD COLUMN IF NOT EXISTS external_ref TEXT;`;
      await sql`ALTER TABLE sp_sponsor_orders ADD COLUMN IF NOT EXISTS payer_email TEXT;`;

      await sql`
        CREATE TABLE IF NOT EXISTS sp_audit_logs (
          id TEXT PRIMARY KEY,
          actor TEXT NOT NULL,
          action TEXT NOT NULL,
          target TEXT NOT NULL,
          detail TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sp_meta (
          key TEXT PRIMARY KEY,
          value_int INTEGER NOT NULL DEFAULT 0
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sp_scores (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          user_id TEXT,
          player_name TEXT NOT NULL,
          country_code TEXT NOT NULL DEFAULT 'US',
          score BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_sp_scores_game_score ON sp_scores (game_id, score DESC);`;

      await sql`
        CREATE TABLE IF NOT EXISTS sp_cloud_saves (
          user_id TEXT NOT NULL,
          game_id TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, game_id)
        );
      `;

      // Seed once if sp_games is empty
      const existing = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM sp_games`;
      if (Number(existing[0]?.count || 0) === 0) {
        const seed = getDefaultStoreSnapshot();
        for (const u of seed.users) {
          await sql`
            INSERT INTO sp_users (id, username, email, password_hash, role, country_code, locale, is_pro_supporter, is_verified_creator, status, creator_tip_links, total_plays_earned, created_at)
            VALUES (${u.id}, ${u.username}, ${u.email}, ${u.passwordHash ?? null}, ${u.role}, ${u.countryCode}, ${u.locale}, ${u.isProSupporter}, ${u.isVerifiedCreator}, ${u.status}, ${sql.json(u.creatorTipLinks)}, ${u.totalPlaysEarned}, ${u.createdAt})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        for (const g of seed.games) {
          await sql`
            INSERT INTO sp_games (id, slug, title, title_zh, tagline, tagline_zh, creator_id, creator_name, creator_country_code, play_type, category, is_ai_created, ai_tools, ai_prompt_note, cover_image, accent_color, status, total_valid_plays, plays_24h, rating, country_plays, sandbox_html, security_score, security_verdict, creator_tip_url, published_at)
            VALUES (${g.id}, ${g.slug}, ${g.title}, ${g.titleZh}, ${g.tagline}, ${g.taglineZh}, ${g.creatorId}, ${g.creatorName}, ${g.creatorCountryCode}, ${g.playType}, ${g.category}, ${g.isAiCreated}, ${sql.json(g.aiTools)}, ${g.aiPromptNote}, ${g.coverImage}, ${g.accentColor}, ${g.status}, ${g.totalValidPlays}, ${g.plays24h}, ${g.rating}, ${sql.json(g.countryPlays)}, ${g.sandboxHtml ?? null}, ${g.securityScore}, ${g.securityVerdict}, ${g.creatorTipUrl ?? null}, ${g.publishedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        for (const r of seed.reviews) {
          await sql`
            INSERT INTO sp_reviews (id, game_id, author_name, author_country, rating, gameplay_score, visual_score, ai_score, comment, created_at)
            VALUES (${r.id}, ${r.gameId}, ${r.authorName}, ${r.authorCountry}, ${r.rating}, ${r.gameplayScore}, ${r.visualScore}, ${r.aiScore}, ${r.comment}, ${r.createdAt})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        for (const s of seed.sponsorSlots) {
          await sql`
            INSERT INTO sp_sponsor_slots (id, placement, brand_name, tagline, badge_label, target_url, country_code, provider, monthly_usd, is_active, click_count)
            VALUES (${s.id}, ${s.placement}, ${s.brandName}, ${s.tagline}, ${s.badgeLabel}, ${s.targetUrl}, ${s.countryCode}, ${s.provider}, ${s.monthlyUsd}, ${s.isActive}, ${s.clickCount})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        for (const o of seed.sponsorOrders) {
          await sql`
            INSERT INTO sp_sponsor_orders (id, payer_name, payer_country, provider, tier, amount_usd, status, created_at)
            VALUES (${o.id}, ${o.payerName}, ${o.payerCountry}, ${o.provider}, ${o.tier}, ${o.amountUsd}, ${o.status}, ${o.createdAt})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        for (const a of seed.auditLogs) {
          await sql`
            INSERT INTO sp_audit_logs (id, actor, action, target, detail, created_at)
            VALUES (${a.id}, ${a.actor}, ${a.action}, ${a.target}, ${a.detail}, ${a.createdAt})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        await sql`INSERT INTO sp_meta (key, value_int) VALUES ('monthly_goal_usd', ${seed.monthlyFundingGoalUsd}) ON CONFLICT (key) DO NOTHING`;
        await sql`INSERT INTO sp_meta (key, value_int) VALUES ('monthly_raised_usd', ${seed.monthlyFundingRaisedUsd}) ON CONFLICT (key) DO NOTHING`;
      }

      // One-time cleanup migration for live production DB: remove initial seeded placeholder metrics/sponsors/reviews
      // while preserving real Google accounts, real uploaded games, and AI translations.
      const cleanedFlag = await sql<{ value_int: number }[]>`SELECT value_int FROM sp_meta WHERE key = 'cleaned_demo_data_v1'`;
      if (cleanedFlag.length === 0) {
        await sql`
          UPDATE sp_games
          SET total_valid_plays = 0, plays_24h = 0, country_plays = '{}'::jsonb, rating = 5.0
          WHERE id IN ('gm-001', 'gm-002', 'gm-003', 'gm-004', 'gm-005', 'gm-006')
            AND total_valid_plays > 10000
        `;
        await sql`DELETE FROM sp_reviews WHERE id IN ('rev-001', 'rev-002')`;
        await sql`DELETE FROM sp_sponsor_slots WHERE id IN ('sp-01', 'sp-02', 'sp-03', 'sp-04', 'sp-05')`;
        await sql`DELETE FROM sp_sponsor_orders WHERE id IN ('ord-1001', 'ord-1002', 'ord-1003', 'ord-1004', 'ord-1005')`;
        await sql`INSERT INTO sp_meta (key, value_int) VALUES ('monthly_goal_usd', 50) ON CONFLICT (key) DO UPDATE SET value_int = 50`;
        await sql`INSERT INTO sp_meta (key, value_int) VALUES ('monthly_raised_usd', 0) ON CONFLICT (key) DO UPDATE SET value_int = 0`;
        await sql`INSERT INTO sp_meta (key, value_int) VALUES ('cleaned_demo_data_v1', 1) ON CONFLICT (key) DO UPDATE SET value_int = 1`;
      }

      // Wave 2 original playable games migration (idempotent: inserts gm-008..gm-011 if not yet present)
      const wave2Flag = await sql<{ value_int: number }[]>`SELECT value_int FROM sp_meta WHERE key = 'seed_wave2_games_v1'`;
      if (wave2Flag.length === 0) {
        const seed = getDefaultStoreSnapshot();
        const wave2 = seed.games.filter((g) => ["gm-008", "gm-009", "gm-010", "gm-011"].includes(g.id));
        for (const g of wave2) {
          await sql`
            INSERT INTO sp_games (id, slug, title, title_zh, tagline, tagline_zh, translations, creator_id, creator_name, creator_country_code, play_type, category, is_ai_created, ai_tools, ai_prompt_note, cover_image, accent_color, status, total_valid_plays, plays_24h, rating, country_plays, sandbox_html, security_score, security_verdict, creator_tip_url, published_at)
            VALUES (${g.id}, ${g.slug}, ${g.title}, ${g.titleZh}, ${g.tagline}, ${g.taglineZh}, ${sql.json((g.translations || {}) as unknown as postgres.JSONValue)}, ${g.creatorId}, ${g.creatorName}, ${g.creatorCountryCode}, ${g.playType}, ${g.category}, ${g.isAiCreated}, ${sql.json(g.aiTools)}, ${g.aiPromptNote}, ${g.coverImage}, ${g.accentColor}, ${g.status}, ${g.totalValidPlays}, ${g.plays24h}, ${g.rating}, ${sql.json(g.countryPlays)}, ${g.sandboxHtml ?? null}, ${g.securityScore}, ${g.securityVerdict}, ${g.creatorTipUrl ?? null}, ${g.publishedAt})
            ON CONFLICT (id) DO NOTHING
          `;
        }
        await sql`INSERT INTO sp_meta (key, value_int) VALUES ('seed_wave2_games_v1', 1) ON CONFLICT (key) DO UPDATE SET value_int = 1`;
      }

      pgAvailable = true;
      return true;
    } catch {
      pgAvailable = false;
      pgReadyPromise = null;
      return false;
    }
  })();

  return pgReadyPromise;
}

export async function recordPlayInRedis(gameId: string, playerCountry: string, creatorCountry: string) {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status === "wait") await redis.connect();
    await Promise.all([
      redis.zincrby("rank:global:plays", 1, gameId),
      redis.zincrby(`rank:country:play:${playerCountry}`, 1, gameId),
      redis.zincrby("rank:country:creator_power", 1, creatorCountry)
    ]);
  } catch {
    // Best-effort cache sync
  }
}

export async function getStorageEngineInfo(): Promise<{ pg: boolean; redis: boolean }> {
  const pg = await ensurePgReady();
  let redisOk = false;
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      redisOk = (await redis.ping()) === "PONG";
    } catch {
      redisOk = false;
    }
  }
  return { pg, redis: redisOk };
}

export async function loadFullStore(): Promise<SynthPlayStore> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    return readStore();
  }

  const [usersRows, gamesRows, reviewsRows, slotsRows, ordersRows, logsRows, metaRows] = await Promise.all([
    sql`SELECT * FROM sp_users ORDER BY created_at DESC`,
    sql`SELECT * FROM sp_games ORDER BY published_at DESC`,
    sql`SELECT * FROM sp_reviews ORDER BY created_at DESC`,
    sql`SELECT * FROM sp_sponsor_slots`,
    sql`SELECT * FROM sp_sponsor_orders ORDER BY created_at DESC`,
    sql`SELECT * FROM sp_audit_logs ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT * FROM sp_meta`
  ]);

  const metaMap = new Map(metaRows.map((m) => [String(m.key), Number(m.value_int)]));

  return {
    monthlyFundingGoalUsd: metaMap.get("monthly_goal_usd") ?? 500,
    monthlyFundingRaisedUsd: metaMap.get("monthly_raised_usd") ?? 394,
    users: usersRows.map((u) => ({
      id: String(u.id),
      username: String(u.username),
      email: String(u.email),
      passwordHash: u.password_hash ? String(u.password_hash) : undefined,
      role: u.role as UserRecord["role"],
      countryCode: String(u.country_code),
      locale: String(u.locale),
      isProSupporter: Boolean(u.is_pro_supporter),
      isVerifiedCreator: Boolean(u.is_verified_creator),
      status: u.status as UserRecord["status"],
      creatorTipLinks: (u.creator_tip_links || {}) as UserRecord["creatorTipLinks"],
      totalPlaysEarned: Number(u.total_plays_earned || 0),
      createdAt: new Date(u.created_at).toISOString()
    })),
    games: gamesRows.map((g) => ({
      id: String(g.id),
      slug: String(g.slug),
      title: String(g.title),
      titleZh: String(g.title_zh),
      tagline: String(g.tagline),
      taglineZh: String(g.tagline_zh),
      translations: (g.translations && typeof g.translations === "object"
        ? g.translations
        : undefined) as Record<string, GameTranslationEntry> | undefined,
      creatorId: String(g.creator_id),
      creatorName: String(g.creator_name),
      creatorCountryCode: String(g.creator_country_code),
      playType: g.play_type as GameRecord["playType"],
      category: String(g.category),
      isAiCreated: Boolean(g.is_ai_created),
      aiTools: Array.isArray(g.ai_tools) ? g.ai_tools.map(String) : [],
      aiPromptNote: String(g.ai_prompt_note || ""),
      coverImage: String(g.cover_image),
      accentColor: String(g.accent_color || "#F3FF00"),
      status: g.status as GameRecord["status"],
      totalValidPlays: Number(g.total_valid_plays || 0),
      plays24h: Number(g.plays_24h || 0),
      rating: Number(g.rating || 4.8),
      countryPlays: (g.country_plays || {}) as Record<string, number>,
      sandboxHtml: g.sandbox_html ? String(g.sandbox_html) : undefined,
      sandboxUrl: g.sandbox_url ? String(g.sandbox_url) : undefined,
      securityScore: Number(g.security_score || 95),
      securityVerdict: (g.security_verdict || "SAFE") as GameRecord["securityVerdict"],
      creatorTipUrl: g.creator_tip_url ? String(g.creator_tip_url) : undefined,
      publishedAt: new Date(g.published_at).toISOString()
    })),
    reviews: reviewsRows.map((r) => ({
      id: String(r.id),
      gameId: String(r.game_id),
      authorName: String(r.author_name),
      authorCountry: String(r.author_country),
      rating: Number(r.rating),
      gameplayScore: Number(r.gameplay_score),
      visualScore: Number(r.visual_score),
      aiScore: Number(r.ai_score),
      comment: String(r.comment),
      createdAt: new Date(r.created_at).toISOString()
    })),
    sponsorSlots: slotsRows.map((s) => ({
      id: String(s.id),
      placement: s.placement as SponsorSlotRecord["placement"],
      brandName: String(s.brand_name),
      tagline: String(s.tagline),
      badgeLabel: String(s.badge_label),
      targetUrl: String(s.target_url),
      countryCode: String(s.country_code),
      provider: s.provider as SponsorSlotRecord["provider"],
      monthlyUsd: Number(s.monthly_usd),
      isActive: Boolean(s.is_active),
      clickCount: Number(s.click_count)
    })),
    sponsorOrders: ordersRows.map((o) => ({
      id: String(o.id),
      externalRef: o.external_ref ? String(o.external_ref) : undefined,
      payerName: String(o.payer_name),
      payerEmail: o.payer_email ? String(o.payer_email) : undefined,
      payerCountry: String(o.payer_country),
      provider: o.provider as SponsorOrderRecord["provider"],
      tier: o.tier as SponsorOrderRecord["tier"],
      amountUsd: Number(o.amount_usd),
      status: o.status as SponsorOrderRecord["status"],
      createdAt: new Date(o.created_at).toISOString()
    })),
    auditLogs: logsRows.map((a) => ({
      id: String(a.id),
      actor: String(a.actor),
      action: String(a.action),
      target: String(a.target),
      detail: String(a.detail),
      createdAt: new Date(a.created_at).toISOString()
    }))
  };
}

export async function createUserRecord(user: UserRecord): Promise<UserRecord> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    store.users.unshift(user);
    writeStore(store);
    return user;
  }

  await sql`
    INSERT INTO sp_users (id, username, email, password_hash, role, country_code, locale, is_pro_supporter, is_verified_creator, status, creator_tip_links, total_plays_earned, created_at)
    VALUES (${user.id}, ${user.username}, ${user.email}, ${user.passwordHash ?? null}, ${user.role}, ${user.countryCode}, ${user.locale}, ${user.isProSupporter}, ${user.isVerifiedCreator}, ${user.status}, ${sql.json(user.creatorTipLinks)}, ${user.totalPlaysEarned}, ${user.createdAt})
  `;
  return user;
}

export async function updateUserRecord(
  userId: string,
  patch: Partial<Pick<UserRecord, "countryCode" | "creatorTipLinks" | "status" | "isVerifiedCreator" | "isProSupporter">>
): Promise<UserRecord | null> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    const user = store.users.find((u) => u.id === userId);
    if (!user) return null;
    if (patch.countryCode !== undefined) user.countryCode = patch.countryCode;
    if (patch.creatorTipLinks !== undefined) user.creatorTipLinks = patch.creatorTipLinks;
    if (patch.status !== undefined) user.status = patch.status;
    if (patch.isVerifiedCreator !== undefined) user.isVerifiedCreator = patch.isVerifiedCreator;
    if (patch.isProSupporter !== undefined) user.isProSupporter = patch.isProSupporter;
    writeStore(store);
    return user;
  }

  const store = await loadFullStore();
  const existing = store.users.find((u) => u.id === userId);
  if (!existing) return null;
  const next: UserRecord = { ...existing, ...patch };
  await sql`
    UPDATE sp_users
    SET country_code = ${next.countryCode},
        creator_tip_links = ${sql.json(next.creatorTipLinks)},
        status = ${next.status},
        is_verified_creator = ${next.isVerifiedCreator},
        is_pro_supporter = ${next.isProSupporter}
    WHERE id = ${userId}
  `;
  return next;
}

export async function createGameRecord(game: GameRecord): Promise<GameRecord> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    store.games.unshift(game);
    writeStore(store);
    return game;
  }

  await sql`
    INSERT INTO sp_games (id, slug, title, title_zh, tagline, tagline_zh, creator_id, creator_name, creator_country_code, play_type, category, is_ai_created, ai_tools, ai_prompt_note, cover_image, accent_color, status, total_valid_plays, plays_24h, rating, country_plays, sandbox_html, sandbox_url, translations, security_score, security_verdict, creator_tip_url, published_at)
    VALUES (${game.id}, ${game.slug}, ${game.title}, ${game.titleZh}, ${game.tagline}, ${game.taglineZh}, ${game.creatorId}, ${game.creatorName}, ${game.creatorCountryCode}, ${game.playType}, ${game.category}, ${game.isAiCreated}, ${sql.json(game.aiTools)}, ${game.aiPromptNote}, ${game.coverImage}, ${game.accentColor}, ${game.status}, ${game.totalValidPlays}, ${game.plays24h}, ${game.rating}, ${sql.json(game.countryPlays)}, ${game.sandboxHtml ?? null}, ${game.sandboxUrl ?? null}, ${sql.json((game.translations ?? {}) as unknown as postgres.JSONValue)}, ${game.securityScore}, ${game.securityVerdict}, ${game.creatorTipUrl ?? null}, ${game.publishedAt})
  `;
  return game;
}

export async function updateGameTranslations(
  gameId: string,
  translations: Record<string, GameTranslationEntry>
): Promise<GameRecord | null> {
  const zh = translations["zh-CN"];
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    const g = store.games.find((x) => x.id === gameId);
    if (!g) return null;
    g.translations = { ...(g.translations || {}), ...translations };
    if (zh?.title) g.titleZh = zh.title;
    if (zh?.tagline) g.taglineZh = zh.tagline;
    writeStore(store);
    return g;
  }

  const store = await loadFullStore();
  const g = store.games.find((x) => x.id === gameId);
  if (!g) return null;
  const merged = { ...(g.translations || {}), ...translations };
  const nextTitleZh = zh?.title || g.titleZh;
  const nextTaglineZh = zh?.tagline || g.taglineZh;
  await sql`
    UPDATE sp_games
    SET translations = ${sql.json(merged as unknown as postgres.JSONValue)},
        title_zh = ${nextTitleZh},
        tagline_zh = ${nextTaglineZh}
    WHERE id = ${gameId}
  `;
  return { ...g, translations: merged, titleZh: nextTitleZh, taglineZh: nextTaglineZh };
}

export async function updateGameStatus(gameId: string, status: GameRecord["status"]): Promise<GameRecord | null> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    const g = store.games.find((x) => x.id === gameId);
    if (!g) return null;
    g.status = status;
    writeStore(store);
    return g;
  }

  const store = await loadFullStore();
  const g = store.games.find((x) => x.id === gameId);
  if (!g) return null;
  await sql`UPDATE sp_games SET status = ${status} WHERE id = ${gameId}`;
  return { ...g, status };
}

export async function incrementGamePlay(gameId: string, playerCountry: string): Promise<GameRecord | null> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    const g = store.games.find((x) => x.id === gameId);
    if (!g) return null;
    g.totalValidPlays += 1;
    g.plays24h += 1;
    g.countryPlays[playerCountry] = (g.countryPlays[playerCountry] ?? 0) + 1;
    writeStore(store);
    await recordPlayInRedis(gameId, playerCountry, g.creatorCountryCode);
    return g;
  }

  const store = await loadFullStore();
  const g = store.games.find((x) => x.id === gameId);
  if (!g) return null;
  const nextTotal = g.totalValidPlays + 1;
  const next24h = g.plays24h + 1;
  const nextCountryPlays = { ...g.countryPlays, [playerCountry]: (g.countryPlays[playerCountry] ?? 0) + 1 };
  await sql`
    UPDATE sp_games
    SET total_valid_plays = ${nextTotal},
        plays_24h = ${next24h},
        country_plays = ${sql.json(nextCountryPlays)}
    WHERE id = ${gameId}
  `;
  await recordPlayInRedis(gameId, playerCountry, g.creatorCountryCode);
  return { ...g, totalValidPlays: nextTotal, plays24h: next24h, countryPlays: nextCountryPlays };
}

export async function addReviewRecord(review: ReviewRecord): Promise<ReviewRecord> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    store.reviews.unshift(review);
    const gameReviews = store.reviews.filter((r) => r.gameId === review.gameId);
    const g = store.games.find((x) => x.id === review.gameId);
    if (g && gameReviews.length > 0) {
      g.rating = Number((gameReviews.reduce((a, b) => a + b.rating, 0) / gameReviews.length).toFixed(2));
    }
    writeStore(store);
    return review;
  }

  await sql`
    INSERT INTO sp_reviews (id, game_id, author_name, author_country, rating, gameplay_score, visual_score, ai_score, comment, created_at)
    VALUES (${review.id}, ${review.gameId}, ${review.authorName}, ${review.authorCountry}, ${review.rating}, ${review.gameplayScore}, ${review.visualScore}, ${review.aiScore}, ${review.comment}, ${review.createdAt})
  `;
  const avgRows = await sql<{ avg: string }[]>`SELECT AVG(rating)::text AS avg FROM sp_reviews WHERE game_id = ${review.gameId}`;
  const newAvg = Number(Number(avgRows[0]?.avg || 5).toFixed(2));
  await sql`UPDATE sp_games SET rating = ${newAvg} WHERE id = ${review.gameId}`;
  return review;
}

export async function createSponsorOrderAndSlot(
  order: SponsorOrderRecord,
  slot?: SponsorSlotRecord
): Promise<{ raisedUsd: number; duplicate?: boolean; upgradedUserId?: string }> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    if (order.externalRef && store.sponsorOrders.some((o) => o.externalRef === order.externalRef)) {
      return { raisedUsd: store.monthlyFundingRaisedUsd, duplicate: true };
    }
    store.sponsorOrders.unshift(order);
    store.monthlyFundingRaisedUsd += order.amountUsd;
    if (slot) store.sponsorSlots.unshift(slot);
    let upgradedUserId: string | undefined;
    if (order.payerEmail) {
      const targetEmail = order.payerEmail.toLowerCase();
      const user = store.users.find((u) => u.email.toLowerCase() === targetEmail);
      if (user) {
        user.isProSupporter = true;
        upgradedUserId = user.id;
      }
    }
    writeStore(store);
    return { raisedUsd: store.monthlyFundingRaisedUsd, upgradedUserId };
  }

  if (order.externalRef) {
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM sp_sponsor_orders WHERE external_ref = ${order.externalRef} LIMIT 1
    `;
    if (existing.length > 0) {
      const rows = await sql<{ value_int: number }[]>`SELECT value_int FROM sp_meta WHERE key = 'monthly_raised_usd'`;
      return { raisedUsd: Number(rows[0]?.value_int || 394), duplicate: true };
    }
  }

  await sql`
    INSERT INTO sp_sponsor_orders (id, external_ref, payer_name, payer_email, payer_country, provider, tier, amount_usd, status, created_at)
    VALUES (${order.id}, ${order.externalRef ?? null}, ${order.payerName}, ${order.payerEmail ?? null}, ${order.payerCountry}, ${order.provider}, ${order.tier}, ${order.amountUsd}, ${order.status}, ${order.createdAt})
  `;
  if (slot) {
    await sql`
      INSERT INTO sp_sponsor_slots (id, placement, brand_name, tagline, badge_label, target_url, country_code, provider, monthly_usd, is_active, click_count)
      VALUES (${slot.id}, ${slot.placement}, ${slot.brandName}, ${slot.tagline}, ${slot.badgeLabel}, ${slot.targetUrl}, ${slot.countryCode}, ${slot.provider}, ${slot.monthlyUsd}, ${slot.isActive}, ${slot.clickCount})
    `;
  }
  let upgradedUserId: string | undefined;
  if (order.payerEmail) {
    const upgraded = await sql<{ id: string }[]>`
      UPDATE sp_users
      SET is_pro_supporter = TRUE
      WHERE LOWER(email) = LOWER(${order.payerEmail})
      RETURNING id
    `;
    upgradedUserId = upgraded[0]?.id ? String(upgraded[0].id) : undefined;
  }
  await sql`UPDATE sp_meta SET value_int = value_int + ${order.amountUsd} WHERE key = 'monthly_raised_usd'`;
  const rows = await sql<{ value_int: number }[]>`SELECT value_int FROM sp_meta WHERE key = 'monthly_raised_usd'`;
  return { raisedUsd: Number(rows[0]?.value_int || 394), upgradedUserId };
}

export async function toggleSponsorSlotRecord(slotId: string): Promise<SponsorSlotRecord | null> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    const s = store.sponsorSlots.find((x) => x.id === slotId);
    if (!s) return null;
    s.isActive = !s.isActive;
    writeStore(store);
    return s;
  }

  const store = await loadFullStore();
  const s = store.sponsorSlots.find((x) => x.id === slotId);
  if (!s) return null;
  const nextActive = !s.isActive;
  await sql`UPDATE sp_sponsor_slots SET is_active = ${nextActive} WHERE id = ${slotId}`;
  return { ...s, isActive: nextActive };
}

export async function appendAuditLog(log: AuditLogRecord): Promise<void> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    store.auditLogs.unshift(log);
    writeStore(store);
    return;
  }

  await sql`
    INSERT INTO sp_audit_logs (id, actor, action, target, detail, created_at)
    VALUES (${log.id}, ${log.actor}, ${log.action}, ${log.target}, ${log.detail}, ${log.createdAt})
  `;
}

export function isPostgresActive(): boolean {
  return pgAvailable;
}

export async function submitGameScore(record: ScoreRecord): Promise<{ saved: boolean; personalBest: number }> {
  const cleanScore = Math.max(0, Math.min(999_999_999, Math.round(record.score)));
  const ok = await ensurePgReady();
  const sql = getSql();

  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      await redis.zadd(`scores:game:${record.gameId}`, "GT", cleanScore, `${record.playerName}|${record.countryCode}`);
    } catch {
      // Best-effort cache sync
    }
  }

  if (!ok || !sql) {
    const store = readStore();
    const list = store.scores || [];
    const existing = list.find(
      (s) => s.gameId === record.gameId && s.playerName.toLowerCase() === record.playerName.toLowerCase()
    );
    if (existing) {
      if (cleanScore > existing.score) {
        existing.score = cleanScore;
        existing.createdAt = record.createdAt;
        store.scores = list;
        writeStore(store);
        return { saved: true, personalBest: cleanScore };
      }
      return { saved: false, personalBest: existing.score };
    }
    list.push({ ...record, score: cleanScore });
    store.scores = list;
    writeStore(store);
    return { saved: true, personalBest: cleanScore };
  }

  const existing = await sql<{ id: string; score: string }[]>`
    SELECT id, score::text AS score FROM sp_scores
    WHERE game_id = ${record.gameId} AND LOWER(player_name) = LOWER(${record.playerName})
    LIMIT 1
  `;

  if (existing.length > 0) {
    const prev = Number(existing[0].score || 0);
    if (cleanScore > prev) {
      await sql`
        UPDATE sp_scores
        SET score = ${cleanScore}, country_code = ${record.countryCode}, created_at = ${record.createdAt}
        WHERE id = ${existing[0].id}
      `;
      return { saved: true, personalBest: cleanScore };
    }
    return { saved: false, personalBest: prev };
  }

  await sql`
    INSERT INTO sp_scores (id, game_id, user_id, player_name, country_code, score, created_at)
    VALUES (${record.id}, ${record.gameId}, ${record.userId ?? null}, ${record.playerName}, ${record.countryCode}, ${cleanScore}, ${record.createdAt})
  `;
  return { saved: true, personalBest: cleanScore };
}

export async function getGameHighScores(gameId: string, limit = 15): Promise<ScoreRecord[]> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    return (store.scores || [])
      .filter((s) => s.gameId === gameId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const rows = await sql`
    SELECT id, game_id, user_id, player_name, country_code, score, created_at
    FROM sp_scores
    WHERE game_id = ${gameId}
    ORDER BY score DESC, created_at ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: String(r.id),
    gameId: String(r.game_id),
    userId: r.user_id ? String(r.user_id) : undefined,
    playerName: String(r.player_name),
    countryCode: String(r.country_code),
    score: Number(r.score || 0),
    createdAt: new Date(r.created_at).toISOString()
  }));
}

export async function saveCloudGameState(
  userId: string,
  gameId: string,
  payload: Record<string, unknown>
): Promise<CloudSaveRecord> {
  const updatedAt = new Date().toISOString();
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    const saves = store.cloudSaves || [];
    const idx = saves.findIndex((s) => s.userId === userId && s.gameId === gameId);
    const entry: CloudSaveRecord = { userId, gameId, payload, updatedAt };
    if (idx >= 0) saves[idx] = entry;
    else saves.push(entry);
    store.cloudSaves = saves;
    writeStore(store);
    return entry;
  }

  await sql`
    INSERT INTO sp_cloud_saves (user_id, game_id, payload, updated_at)
    VALUES (${userId}, ${gameId}, ${sql.json(payload as unknown as postgres.JSONValue)}, ${updatedAt})
    ON CONFLICT (user_id, game_id)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
  `;
  return { userId, gameId, payload, updatedAt };
}

export async function loadCloudGameState(userId: string, gameId: string): Promise<CloudSaveRecord | null> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    return (store.cloudSaves || []).find((s) => s.userId === userId && s.gameId === gameId) || null;
  }

  const rows = await sql`
    SELECT user_id, game_id, payload, updated_at
    FROM sp_cloud_saves
    WHERE user_id = ${userId} AND game_id = ${gameId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return {
    userId: String(rows[0].user_id),
    gameId: String(rows[0].game_id),
    payload: (rows[0].payload || {}) as Record<string, unknown>,
    updatedAt: new Date(rows[0].updated_at).toISOString()
  };
}
