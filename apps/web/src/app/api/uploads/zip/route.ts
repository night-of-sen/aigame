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
  processAndPublishZipBundle
} from "@/lib/r2Storage";
import { translateGameMetadata } from "@/lib/aiTranslate";

export async function POST(req: NextRequest) {
  let quarantineKeyToClean: string | null = null;

  try {
    const session = verifySessionToken(req.cookies.get(USER_SESSION_COOKIE)?.value);
    const contentType = req.headers.get("content-type") || "";

    let title = "";
    let tagline = "";
    let creatorName = session?.username || "IndieCreator";
    let creatorCountryCode = (session?.countryCode || req.headers.get("cf-ipcountry") || "US").toUpperCase().slice(0, 4);
    let category = "ARCADE";
    let aiTools: string[] = ["HTML5 ZIP", "AI Assisted"];
    let aiPromptNote = "";
    let creatorTipUrl = "";
    let publishImmediately = true;
    let zipBytes: Uint8Array;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing .zip file in upload form." }, { status: 400 });
      }
      if (!file.name.toLowerCase().endsWith(".zip")) {
        return NextResponse.json({ error: "Uploaded file must be a .zip archive." }, { status: 400 });
      }
      title = String(form.get("title") || file.name.replace(/\.zip$/i, "")).trim();
      tagline = String(form.get("tagline") || "Free playable HTML5/WebGL community game.").trim();
      creatorName = session?.username || String(form.get("creatorName") || creatorName).trim();
      creatorCountryCode = (
        session?.countryCode ||
        String(form.get("creatorCountryCode") || creatorCountryCode)
      )
        .toUpperCase()
        .slice(0, 4);
      category = String(form.get("category") || "ARCADE").toUpperCase();
      aiTools = String(form.get("aiTools") || "HTML5 ZIP, AI Assisted")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      aiPromptNote = String(form.get("aiPromptNote") || "").trim();
      creatorTipUrl = String(form.get("creatorTipUrl") || "").trim();
      publishImmediately = String(form.get("publishImmediately") ?? "true") !== "false";
      zipBytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const body = await req.json();
      const quarantineKey = String(body.quarantineKey || "").trim();
      if (!quarantineKey || !quarantineKey.startsWith("quarantine/")) {
        return NextResponse.json({ error: "Invalid quarantineKey." }, { status: 400 });
      }
      quarantineKeyToClean = quarantineKey;
      title = String(body.title || "").trim();
      tagline = String(body.tagline || "Free playable HTML5/WebGL community game.").trim();
      creatorName = session?.username || String(body.creatorName || creatorName).trim();
      creatorCountryCode = (
        session?.countryCode ||
        String(body.creatorCountryCode || creatorCountryCode)
      )
        .toUpperCase()
        .slice(0, 4);
      category = String(body.category || "ARCADE").toUpperCase();
      aiTools = Array.isArray(body.aiTools) ? body.aiTools.map(String) : ["HTML5 ZIP", "AI Assisted"];
      aiPromptNote = String(body.aiPromptNote || "").trim();
      creatorTipUrl = String(body.creatorTipUrl || "").trim();
      publishImmediately = Boolean(body.publishImmediately ?? true);
      zipBytes = await downloadQuarantineObject(quarantineKey);
    }

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

    // AI auto-translation across en, zh-CN, ja, es (fails soft if key not set)
    const i18nRes = await translateGameMetadata({
      title: title.toUpperCase(),
      tagline,
      aiPromptNote
    });

    const store = await loadFullStore();
    const covers = [
      "/games/tokyo-drift.jpg",
      "/games/mecha-arena.jpg",
      "/games/noir-detective.jpg",
      "/games/bullet-hell.jpg",
      "/games/synth-dungeon.jpg",
      "/games/orbital-colony.jpg"
    ];
    const coverImage = covers[store.games.length % covers.length];
    const accentPalette = ["#F3FF00", "#FF2A3C", "#00F0D4"];
    const accentColor = accentPalette[store.games.length % accentPalette.length];

    const newGame: GameRecord = {
      id,
      slug,
      title: i18nRes.translations.en?.title || title.toUpperCase(),
      titleZh: i18nRes.translations["zh-CN"]?.title || title,
      tagline: i18nRes.translations.en?.tagline || tagline,
      taglineZh: i18nRes.translations["zh-CN"]?.tagline || tagline,
      translations: i18nRes.translations,
      creatorId: session?.sub || "usr-002",
      creatorName,
      creatorCountryCode,
      playType: "html5_zip",
      category,
      isAiCreated: true,
      aiTools,
      aiPromptNote,
      coverImage,
      accentColor,
      status: publishImmediately && publishRes.scanReport.verdict === "SAFE" ? "published" : "pending_review",
      totalValidPlays: 1,
      plays24h: 1,
      rating: 5.0,
      countryPlays: { [creatorCountryCode]: 1 },
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
      action: "ZIP_BUNDLE_DEPLOYED",
      target: `${id} (${newGame.title})`,
      detail: `${publishRes.fileCount} files (${(publishRes.totalBytes / 1024).toFixed(1)}KB) · Storage: ${publishRes.storageMode} · Security: ${publishRes.scanReport.verdict} (${publishRes.scanReport.score}/100) · AI Translate: ${i18nRes.translated ? i18nRes.provider : "standby"}`,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(
      {
        game: newGame,
        scanReport: publishRes.scanReport,
        storageMode: publishRes.storageMode,
        fileCount: publishRes.fileCount,
        translated: i18nRes.translated
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
