import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  numeric,
  jsonb,
  timestamp,
  date,
  primaryKey
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 48 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 24 }).notNull().default("player"), // player | creator | moderator | admin
  countryCode: varchar("country_code", { length: 4 }).notNull().default("US"),
  locale: varchar("locale", { length: 10 }).notNull().default("en"),
  isProSupporter: boolean("is_pro_supporter").notNull().default(false),
  isVerifiedCreator: boolean("is_verified_creator").notNull().default(false),
  creatorTipLinks: jsonb("creator_tip_links").$type<{
    kofi?: string;
    patreon?: string;
    paypalMe?: string;
  }>(),
  payoutAccount: jsonb("payout_account").$type<{
    method: "payoneer" | "paypal";
    accountEmail: string;
  }>(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active | muted | banned
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  playType: varchar("play_type", { length: 24 }).notNull().default("html5_zip"), // html5_zip | single_html | free_download | external
  creatorCountryCode: varchar("creator_country_code", { length: 4 }).notNull().default("US"),
  primaryCategory: varchar("primary_category", { length: 40 }).notNull().default("arcade"),
  isAiCreated: boolean("is_ai_created").notNull().default(true),
  aiToolsUsed: jsonb("ai_tools_used").$type<string[]>().notNull().default([]),
  coverImageUrl: text("cover_image_url").notNull(),
  accentColor: varchar("accent_color", { length: 16 }).notNull().default("#F3FF00"),
  status: varchar("status", { length: 24 }).notNull().default("pending_review"), // draft | pending_review | published | rejected | suspended
  totalValidPlays: bigint("total_valid_plays", { mode: "number" }).notNull().default(0),
  avgRating: numeric("avg_rating", { precision: 3, scale: 2 }).notNull().default("4.80"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const gameVersions = pgTable("game_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  versionTag: varchar("version_tag", { length: 32 }).notNull().default("v1.0.0"),
  r2BundlePath: text("r2_bundle_path").notNull(),
  bundleSizeBytes: bigint("bundle_size_bytes", { mode: "number" }).notNull().default(0),
  securityScanReport: jsonb("security_scan_report").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const gameTranslations = pgTable(
  "game_translations",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    locale: varchar("locale", { length: 10 }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    summary: text("summary").notNull(),
    controlsGuide: text("controls_guide").notNull().default(""),
    aiCreationStory: text("ai_creation_story").notNull().default(""),
    isMachineTranslated: boolean("is_machine_translated").notNull().default(false)
  },
  (table) => [primaryKey({ columns: [table.gameId, table.locale] })]
);

export const dailyGameCountryStats = pgTable(
  "daily_game_country_stats",
  {
    statDate: date("stat_date").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerCountryCode: varchar("player_country_code", { length: 4 }).notNull(),
    validPlays: integer("valid_plays").notNull().default(0),
    totalPlaySeconds: bigint("total_play_seconds", { mode: "number" }).notNull().default(0),
    uniquePlayers: integer("unique_players").notNull().default(0)
  },
  (table) => [primaryKey({ columns: [table.statDate, table.gameId, table.playerCountryCode] })]
);

export const sponsorshipOrders = pgTable("sponsorship_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 32 }).notNull(), // creem | paypal | kofi | patreon | payoneer_b2b
  providerOrderId: varchar("provider_order_id", { length: 128 }).notNull().unique(),
  tier: varchar("tier", { length: 32 }).notNull(), // diamond_b2b | gold_patron | supporter | pro_monthly
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  status: varchar("status", { length: 24 }).notNull().default("pending"), // pending | paid | refunded | disputed
  payerName: varchar("payer_name", { length: 120 }).notNull().default(""),
  payerCountry: varchar("payer_country", { length: 4 }).notNull().default("US"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const sponsorSlots = pgTable("sponsor_slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => sponsorshipOrders.id, { onDelete: "set null" }),
  placement: varchar("placement", { length: 32 }).notNull(), // hero_marquee | hall_diamond | hall_gold | jam_banner
  brandName: varchar("brand_name", { length: 100 }).notNull(),
  tagline: varchar("tagline", { length: 220 }).notNull(),
  badgeLabel: varchar("badge_label", { length: 48 }).notNull().default("SPONSOR"),
  targetUrl: text("target_url").notNull(),
  countryCode: varchar("country_code", { length: 4 }).notNull().default("US"),
  isActive: boolean("is_active").notNull().default(true),
  clickCount: integer("click_count").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true })
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorEmail: varchar("actor_email", { length: 255 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  targetType: varchar("target_type", { length: 32 }).notNull(),
  targetId: varchar("target_id", { length: 128 }).notNull(),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
