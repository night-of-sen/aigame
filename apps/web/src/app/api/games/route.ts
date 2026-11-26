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
    const body = await req.json();
    const title = String(body.title || "").trim();
    const titleZh = String(body.titleZh || title).trim();
    const tagline = String(body.tagline || "Free playable community AI game.").trim();
    const taglineZh = String(body.taglineZh || tagline).trim();
    const creatorName = session?.username || String(body.creatorName || "IndieCreator").trim();
    const creatorCountryCode = (session?.countryCode || String(body.creatorCountryCode || "CN")).toUpperCase().slice(0, 4);
    const playType: PlayType = body.playType === "html5_zip" ? "html5_zip" : "single_html";
    const category = String(body.category || "ARCADE").toUpperCase();
    const aiTools = Array.isArray(body.aiTools) ? body.aiTools.map(String) : ["AI Assisted"];
    const aiPromptNote = String(body.aiPromptNote || "").trim();
    const rawHtml = typeof body.sandboxHtml === "string" ? body.sandboxHtml : "";
    const creatorTipUrl = typeof body.creatorTipUrl === "string" ? body.creatorTipUrl.trim() : "";
    const publishImmediately = Boolean(body.publishImmediately);

    if (!title) {
      return NextResponse.json({ error: "Game title is required." }, { status: 400 });
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

    const store = await loadFullStore();
    const id = `gm-${Date.now().toString(36)}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game"}-${id.slice(-4)}`;

    const covers = [
      "/games/tokyo-drift.jpg",
      "/games/mecha-arena.jpg",
      "/games/noir-detective.jpg",
      "/games/bullet-hell.jpg",
      "/games/synth-dungeon.jpg",
      "/games/orbital-colony.jpg"
    ];
    const coverImage = body.coverImage || covers[store.games.length % covers.length];
    const accentPalette = ["#F3FF00", "#FF2A3C", "#00F0D4"];
    const accentColor = accentPalette[store.games.length % accentPalette.length];

    const wrappedHtml = rawHtml ? wrapSingleHtmlForSandbox(rawHtml, id) : undefined;

    const newGame: GameRecord = {
      id,
      slug,
      title: title.toUpperCase(),
      titleZh,
      tagline,
      taglineZh,
      creatorId: session?.sub || "usr-002",
      creatorName,
      creatorCountryCode,
      playType,
      category,
      isAiCreated: true,
      aiTools,
      aiPromptNote,
      coverImage,
      accentColor,
      status: publishImmediately && scanReport.verdict === "SAFE" ? "published" : "pending_review",
      totalValidPlays: 1,
      plays24h: 1,
      rating: 5.0,
      countryPlays: { [creatorCountryCode]: 1 },
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
      action: "GAME_UPLOADED",
      target: `${id} (${newGame.title})`,
      detail: `PlayType: ${playType}, Security: ${scanReport.verdict} (${scanReport.score}/100)`,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ game: newGame, scanReport }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }
}
