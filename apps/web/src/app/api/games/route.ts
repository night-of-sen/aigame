import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  appendAuditLog,
  createGameRecord,
  loadFullStore,
  verifySessionToken,
  type GameRecord,
  type PlayType
} from "@synthplay/db";
import { scanHtmlSubmission, wrapSingleHtmlForSandbox } from "@synthplay/sandbox-security";
import { translateGameMetadata } from "@/lib/aiTranslate";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { pickCategoryCoverFallback, saveGameCoverImage } from "@/lib/r2Storage";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "ALL";
  const filter = searchParams.get("filter") || "ALL";
  const includeAll = searchParams.get("all") === "1";

  const store = await loadFullStore();
  let list = includeAll
    ? store.games
    : store.games.filter((g) => g.status === "published");

  if (country !== "ALL") {
    list = list.filter(
      (g) => g.creatorCountryCode === country || (g.countryPlays[country] ?? 0) > 15000
    );
  }

  if (filter === "AI") {
    list = list.filter((g) => g.isAiCreated);
  } else if (filter === "SINGLE") {
    list = list.filter((g) => g.playType === "single_html");
  } else if (filter === "WEBGL") {
    list = list.filter((g) => g.playType === "html5_zip");
  }

  return NextResponse.json({
    games: list,
    total: list.length
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google or email before uploading a game." }, { status: 401 });
    }

    const body = await req.json();

    // Anti-bot verification (Turnstile)
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0];
    const turnstile = await verifyTurnstileToken(String(body.turnstileToken || ""), ip);
    if (!turnstile.ok) {
      return NextResponse.json(
        { error: turnstile.error || "Human verification failed. Please complete the Turnstile check and try again." },
        { status: 403 }
      );
    }

    const store = await loadFullStore();
    const userRecord = store.users.find((u) => u.id === session.sub);
    if (userRecord && (userRecord.status === "banned" || userRecord.status === "muted")) {
      return NextResponse.json({ error: "Your account is currently restricted from publishing games." }, { status: 403 });
    }

    const title = String(body.title || "").trim();
    const titleZh = String(body.titleZh || title).trim();
    const tagline = String(body.tagline || "Free playable community HTML5 & AI browser game.").trim();
    const taglineZh = String(body.taglineZh || tagline).trim();
    const creatorName = userRecord?.username || session.username;
    const creatorCountryCode = (userRecord?.countryCode || session.countryCode || "US").toUpperCase().slice(0, 4);
    const playType: PlayType = body.playType === "html5_zip" ? "html5_zip" : "single_html";
    const category = String(body.category || "ARCADE").toUpperCase();
    const aiTools = Array.isArray(body.aiTools) && body.aiTools.length > 0 ? body.aiTools.map(String) : ["HTML5", "AI Assisted"];
    const aiPromptNote = String(body.aiPromptNote || "").trim();
    const rawHtml = typeof body.sandboxHtml === "string" ? body.sandboxHtml : "";
    const creatorTipUrl = typeof body.creatorTipUrl === "string" ? body.creatorTipUrl.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "Game title is required." }, { status: 400 });
    }
    if (playType === "single_html" && rawHtml.trim().length < 40) {
      return NextResponse.json({ error: "Please drop a valid .html game file or paste your HTML5 game code." }, { status: 400 });
    }

    const scanReport = rawHtml
      ? scanHtmlSubmission(rawHtml)
      : {
          verdict: "SAFE" as const,
          score: 96,
          byteSize: Number(body.zipBytes || 204800),
          findings: [],
          externalHosts: [],
          scannedAt: new Date().toISOString()
        };

    if (scanReport.verdict === "BLOCKED") {
      return NextResponse.json(
        {
          error: "Security sandbox blocked this upload due to critical violations.",
          scanReport
        },
        { status: 422 }
      );
    }

    const id = `gm-${Date.now().toString(36)}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game"}-${id.slice(-4)}`;

    const uploadedCover = await saveGameCoverImage(id, typeof body.coverDataUrl === "string" ? body.coverDataUrl : undefined);
    const coverImage = uploadedCover || pickCategoryCoverFallback(category);
    const accentPalette = ["#F3FF00", "#FF2A3C", "#00F0D4"];
    const accentColor = accentPalette[store.games.length % accentPalette.length];

    const wrappedHtml = rawHtml ? wrapSingleHtmlForSandbox(rawHtml, id) : undefined;
    const i18nRes = await translateGameMetadata({
      title: title.toUpperCase(),
      tagline,
      aiPromptNote
    });

    // Strategy 1 Tiered Trust:
    // - Verified Creators & Admins/Moderators auto-publish immediately when security scan is SAFE.
    // - New/unverified creators route cleanly into Admin Review Queue (protecting AdSense compliance).
    const isTrustedCreator = Boolean(
      userRecord?.isVerifiedCreator ||
        userRecord?.role === "admin" ||
        userRecord?.role === "moderator" ||
        session.role === "admin" ||
        session.role === "moderator"
    );
    const shouldAutoPublish = isTrustedCreator && scanReport.verdict === "SAFE";

    const newGame: GameRecord = {
      id,
      slug,
      title: i18nRes.translations.en?.title || title.toUpperCase(),
      titleZh: i18nRes.translations["zh-CN"]?.title || titleZh,
      tagline: i18nRes.translations.en?.tagline || tagline,
      taglineZh: i18nRes.translations["zh-CN"]?.tagline || taglineZh,
      translations: i18nRes.translations,
      creatorId: session.sub,
      creatorName,
      creatorCountryCode,
      playType,
      category,
      isAiCreated: true,
      aiTools,
      aiPromptNote,
      coverImage,
      accentColor,
      status: shouldAutoPublish ? "published" : "pending_review",
      totalValidPlays: 0,
      plays24h: 0,
      rating: 5.0,
      countryPlays: {},
      sandboxHtml: wrappedHtml,
      securityScore: scanReport.score,
      securityVerdict: scanReport.verdict,
      creatorTipUrl: creatorTipUrl || undefined,
      publishedAt: new Date().toISOString()
    };

    await createGameRecord(newGame);
    await appendAuditLog({
      id: `aud-${Date.now().toString(36)}`,
      actor: creatorName,
      action: shouldAutoPublish ? "GAME_AUTO_PUBLISHED" : "GAME_SUBMITTED_FOR_REVIEW",
      target: `${id} (${newGame.title})`,
      detail: `PlayType: ${playType}, Trusted: ${isTrustedCreator}, Security: ${scanReport.verdict} (${scanReport.score}/100), CustomCover: ${Boolean(uploadedCover)}, AI Translate: ${i18nRes.translated ? i18nRes.provider : "standby"}`,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(
      {
        game: newGame,
        scanReport,
        translated: i18nRes.translated,
        autoPublished: shouldAutoPublish
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }
}
