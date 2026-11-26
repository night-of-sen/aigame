import postgres from "postgres";
import Redis from "ioredis";
import {
  getDefaultStoreSnapshot,
  readStore,
  writeStore,
  type AuditLogRecord,
  type GameRecord,
  type ReviewRecord,
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
          security_score INTEGER NOT NULL DEFAULT 95,
          security_verdict TEXT NOT NULL DEFAULT 'SAFE',
          creator_tip_url TEXT,
          published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

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
          payer_name TEXT NOT NULL,
          payer_country TEXT NOT NULL DEFAULT 'US',
          provider TEXT NOT NULL,
          tier TEXT NOT NULL,
          amount_usd INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'paid',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

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
      payerName: String(o.payer_name),
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
    INSERT INTO sp_games (id, slug, title, title_zh, tagline, tagline_zh, creator_id, creator_name, creator_country_code, play_type, category, is_ai_created, ai_tools, ai_prompt_note, cover_image, accent_color, status, total_valid_plays, plays_24h, rating, country_plays, sandbox_html, security_score, security_verdict, creator_tip_url, published_at)
    VALUES (${game.id}, ${game.slug}, ${game.title}, ${game.titleZh}, ${game.tagline}, ${game.taglineZh}, ${game.creatorId}, ${game.creatorName}, ${game.creatorCountryCode}, ${game.playType}, ${game.category}, ${game.isAiCreated}, ${sql.json(game.aiTools)}, ${game.aiPromptNote}, ${game.coverImage}, ${game.accentColor}, ${game.status}, ${game.totalValidPlays}, ${game.plays24h}, ${game.rating}, ${sql.json(game.countryPlays)}, ${game.sandboxHtml ?? null}, ${game.securityScore}, ${game.securityVerdict}, ${game.creatorTipUrl ?? null}, ${game.publishedAt})
  `;
  return game;
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
): Promise<{ raisedUsd: number }> {
  const ok = await ensurePgReady();
  const sql = getSql();
  if (!ok || !sql) {
    const store = readStore();
    store.sponsorOrders.unshift(order);
    store.monthlyFundingRaisedUsd += order.amountUsd;
    if (slot) store.sponsorSlots.unshift(slot);
    writeStore(store);
    return { raisedUsd: store.monthlyFundingRaisedUsd };
  }

  await sql`
    INSERT INTO sp_sponsor_orders (id, payer_name, payer_country, provider, tier, amount_usd, status, created_at)
    VALUES (${order.id}, ${order.payerName}, ${order.payerCountry}, ${order.provider}, ${order.tier}, ${order.amountUsd}, ${order.status}, ${order.createdAt})
  `;
  if (slot) {
    await sql`
      INSERT INTO sp_sponsor_slots (id, placement, brand_name, tagline, badge_label, target_url, country_code, provider, monthly_usd, is_active, click_count)
      VALUES (${slot.id}, ${slot.placement}, ${slot.brandName}, ${slot.tagline}, ${slot.badgeLabel}, ${slot.targetUrl}, ${slot.countryCode}, ${slot.provider}, ${slot.monthlyUsd}, ${slot.isActive}, ${slot.clickCount})
    `;
  }
  await sql`UPDATE sp_meta SET value_int = value_int + ${order.amountUsd} WHERE key = 'monthly_raised_usd'`;
  const rows = await sql<{ value_int: number }[]>`SELECT value_int FROM sp_meta WHERE key = 'monthly_raised_usd'`;
  return { raisedUsd: Number(rows[0]?.value_int || 394) };
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
