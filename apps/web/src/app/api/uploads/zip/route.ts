import { NextRequest, NextResponse } from "next/server";
import {
  USER_SESSION_COOKIE,
  appendAuditLog,
  createGameRecord,
  loadFullStore,
  verifySessionToken,
  type GameRecord
} from "@synthplay/db";
import {
  deleteQuarantineObject,
  downloadQuarantineObject,
  pickCategoryCoverFallback,
  processAndPublishZipBundle,
  saveGameCoverImage
} from "@/lib/r2Storage";
import { translateGameMetadata } from "@/lib/aiTranslate";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  let quarantineKeyToClean: string | null = null;

  try {
    const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Please sign in with Google or email before uploading a game." }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0];

    let zipBytes: Uint8Array;
    let title = "";
    let tagline = "Community HTML5/WebGL game deployed via SYNTHPLAY Sandbox.";
    let category = "ARCADE";
    let aiTools: string[] = ["HTML5", "WebGL"];
    let aiPromptNote = "";
    let creatorTipUrl = "";
    let turnstileToken = "";
    let coverDataUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing .zip file in upload." }, { status: 400 });
      }
      if (!file.name.toLowerCase().endsWith(".zip")) {
        return NextResponse.json({ error: "Only .zip HTML5/WebGL bundles are supported." }, { status: 400 });
      }
      zipBytes = new Uint8Array(await file.arrayBuffer());
      title = String(form.get("title") || file.name.replace(/\.zip$/i, "")).trim();
      tagline = String(form.get("tagline") || tagline).trim();
      category = String(form.get("category") || category).toUpperCase();
      aiTools = String(form.get("aiTools") || "HTML5,WebGL")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      aiPromptNote = String(form.get("aiPromptNote") || "").trim();
      creatorTipUrl = String(form.get("creatorTipUrl") || "").trim();
      turnstileToken = String(form.get("turnstileToken") || "").trim();
      coverDataUrl = String(form.get("coverDataUrl") || "").trim();
    } else {
      const body = await req.json();
      const quarantineKey = String(body.quarantineKey || "").trim();
      if (!quarantineKey || !quarantineKey.startsWith("quarantine/")) {
        return NextResponse.json({ error: "Invalid quarantine upload key." }, { status: 400 });
      }
      quarantineKeyToClean = quarantineKey;
      title = String(body.title || "").trim();
      tagline = String(body.tagline || tagline).trim();
      category = String(body.category || category).toUpperCase();
      aiTools = Array.isArray(body.aiTools) && body.aiTools.length > 0 ? body.aiTools.map(String) : ["HTML5", "WebGL"];
      aiPromptNote = String(body.aiPromptNote || "").trim();
      creatorTipUrl = String(body.creatorTipUrl || "").trim();
      turnstileToken = String(body.turnstileToken || "").trim();
      coverDataUrl = String(body.coverDataUrl || "").trim();
      zipBytes = await downloadQuarantineObject(quarantineKey);
    }

    const turnstile = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstile.ok) {
      return NextResponse.json(
        { error: turnstile.error || "Human verification failed. Please complete the Turnstile check." },
        { status: 403 }
      );
    }

    const store = await loadFullStore();
    const userRecord = store.users.find((u) => u.id === session.sub);
    if (userRecord && (userRecord.status === "banned" || userRecord.status === "muted")) {
      return NextResponse.json({ error: "Your account is currently restricted from publishing games." }, { status: 403 });
    }

    const creatorName = userRecord?.username || session.username;
    const creatorCountryCode = (userRecord?.countryCode || session.countryCode || "US").toUpperCase().slice(0, 4);

    if (!title) {
      return NextResponse.json({ error: "Game title is required." }, { status: 400 });
    }

    const id = `gm-${Date.now().toString(36)}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game"}-${id.slice(-4)}`;

    const publishRes = await processAndPublishZipBundle({ zipBytes, gameId: id });
    if (!publishRes.ok) {
      return NextResponse.json(
        {
          error: publishRes.error || "ZIP bundle rejected by security sandbox.",
          scanReport: publishRes.scanReport
        },
        { status: 422 }
      );
    }

    const [i18nRes, uploadedCover] = await Promise.all([
      translateGameMetadata({ title: title.toUpperCase(), tagline, aiPromptNote }),
      saveGameCoverImage(id, coverDataUrl || undefined)
    ]);

    const coverImage = uploadedCover || pickCategoryCoverFallback(category);
    const accentPalette = ["#F3FF00", "#FF2A3C", "#00F0D4"];
    const accentColor = accentPalette[store.games.length % accentPalette.length];

    const isTrustedCreator = Boolean(
      userRecord?.isVerifiedCreator ||
        userRecord?.role === "admin" ||
        userRecord?.role === "moderator" ||
        session.role === "admin" ||
        session.role === "moderator"
    );
    const shouldAutoPublish = isTrustedCreator && publishRes.scanReport.verdict === "SAFE";

    const newGame: GameRecord = {
      id,
      slug,
      title: i18nRes.translations.en?.title || title.toUpperCase(),
      titleZh: i18nRes.translations["zh-CN"]?.title || title,
      tagline: i18nRes.translations.en?.tagline || tagline,
      taglineZh: i18nRes.translations["zh-CN"]?.tagline || tagline,
      translations: i18nRes.translations,
      creatorId: session.sub,
      creatorName,
      creatorCountryCode,
      playType: "html5_zip",
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
      sandboxUrl: publishRes.sandboxUrl,
      securityScore: publishRes.scanReport.score,
      securityVerdict: publishRes.scanReport.verdict,
      creatorTipUrl: creatorTipUrl || undefined,
      publishedAt: new Date().toISOString()
    };

    await createGameRecord(newGame);
    await appendAuditLog({
      id: `aud-${Date.now().toString(36)}`,
      actor: creatorName,
      action: shouldAutoPublish ? "ZIP_AUTO_PUBLISHED" : "ZIP_SUBMITTED_FOR_REVIEW",
      target: `${id} (${newGame.title})`,
      detail: `${publishRes.fileCount} files (${(publishRes.totalBytes / 1024).toFixed(1)}KB) · Trusted: ${isTrustedCreator} · Storage: ${publishRes.storageMode} · Security: ${publishRes.scanReport.verdict} (${publishRes.scanReport.score}/100) · CustomCover: ${Boolean(uploadedCover)}`,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(
      {
        game: newGame,
        scanReport: publishRes.scanReport,
        storageMode: publishRes.storageMode,
        fileCount: publishRes.fileCount,
        translated: i18nRes.translated,
        autoPublished: shouldAutoPublish
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to process ZIP upload.";
    return NextResponse.json({ error: msg }, { status: 400 });
  } finally {
    if (quarantineKeyToClean) {
      await deleteQuarantineObject(quarantineKeyToClean);
    }
  }
}
