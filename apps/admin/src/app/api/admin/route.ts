import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  appendAuditLog,
  computeCountryPowerRankings,
  loadFullStore,
  toggleSponsorSlotRecord,
  updateGameStatus,
  updateGameTranslations,
  updateUserRecord,
  verifySessionToken,
  type GameStatus,
  type GameTranslationEntry,
  type UserStatus
} from "@synthplay/db";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session || (session.role !== "admin" && session.role !== "moderator")) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized administrator access." }, { status: 401 });
  }
  const store = await loadFullStore();
  return NextResponse.json({
    ...store,
    countryPower: computeCountryPowerRankings(store.games)
  });
}

export async function POST(req: NextRequest) {
  const session = requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized administrator access." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "MODERATE_GAME") {
      const updated = await updateGameStatus(String(body.gameId || ""), body.status as GameStatus);
      if (!updated) return NextResponse.json({ error: "Game not found" }, { status: 404 });
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: session.email,
        action: `GAME_${String(body.status).toUpperCase()}`,
        target: `${updated.id} (${updated.title})`,
        detail: String(body.reason || "Updated via Admin Console"),
        createdAt: new Date().toISOString()
      });
      const store = await loadFullStore();
      return NextResponse.json({ ok: true, store });
    }

    if (action === "UPDATE_USER") {
      const updated = await updateUserRecord(String(body.userId || ""), {
        status: body.status as UserStatus | undefined,
        isVerifiedCreator: typeof body.isVerifiedCreator === "boolean" ? body.isVerifiedCreator : undefined,
        isProSupporter: typeof body.isProSupporter === "boolean" ? body.isProSupporter : undefined
      });
      if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: session.email,
        action: "USER_UPDATED",
        target: `${updated.id} (@${updated.username})`,
        detail: `status=${updated.status}, verified=${updated.isVerifiedCreator}, pro=${updated.isProSupporter}`,
        createdAt: new Date().toISOString()
      });
      const store = await loadFullStore();
      return NextResponse.json({ ok: true, store });
    }

    if (action === "TOGGLE_SPONSOR_SLOT") {
      const updated = await toggleSponsorSlotRecord(String(body.slotId || ""));
      if (!updated) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: session.email,
        action: updated.isActive ? "SPONSOR_SLOT_ENABLED" : "SPONSOR_SLOT_PAUSED",
        target: `${updated.id} (${updated.brandName})`,
        detail: `Placement: ${updated.placement}`,
        createdAt: new Date().toISOString()
      });
      const store = await loadFullStore();
      return NextResponse.json({ ok: true, store });
    }

    if (action === "AI_TRANSLATE_GAME") {
      const gameId = String(body.gameId || "");
      const store = await loadFullStore();
      const game = store.games.find((g) => g.id === gameId);
      if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

      const apiKey = process.env.AI_TRANSLATE_API_KEY || "";
      if (!apiKey || apiKey.startsWith("your_")) {
        return NextResponse.json({ error: "AI_TRANSLATE_API_KEY is not configured in .env yet." }, { status: 400 });
      }

      const provider = (process.env.AI_TRANSLATE_PROVIDER || "gemini").toLowerCase();
      const prompt = [
        "Translate this indie arcade game metadata into 6 locales: en, zh-CN, ja, ko, es, pt-BR.",
        'Return ONLY valid JSON with keys "en", "zh-CN", "ja", "ko", "es", "pt-BR", each {"title": string, "tagline": string}.',
        `Title: ${game.title}`,
        `Tagline: ${game.tagline}`
      ].join("\n");

      let rawText = "";
      if (provider === "gemini") {
        const model = process.env.AI_TRANSLATE_MODEL || "gemini-2.0-flash";
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
            })
          }
        );
        if (res.ok) {
          const data = await res.json();
          rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } else {
        const endpoint =
          provider === "deepseek"
            ? "https://api.deepseek.com/chat/completions"
            : "https://api.openai.com/v1/chat/completions";
        const model = process.env.AI_TRANSLATE_MODEL || (provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          rawText = data?.choices?.[0]?.message?.content || "";
        }
      }

      const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned) as Record<string, GameTranslationEntry>;
      await updateGameTranslations(game.id, parsed);
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: session.email,
        action: "AI_TRANSLATED_GAME",
        target: `${game.id} (${game.title})`,
        detail: `Translated via ${provider.toUpperCase()} into ${Object.keys(parsed).join(", ")}`,
        createdAt: new Date().toISOString()
      });

      const nextStore = await loadFullStore();
      return NextResponse.json({ ok: true, store: nextStore });
    }

    if (action === "GENERATE_LAUNCH_KIT") {
      const { generateLaunchKitForGame } = await import("@/lib/autoPromote");
      const gameId = String(body.gameId || "");
      const store = await loadFullStore();
      const game = store.games.find((g) => g.id === gameId) || store.games.find((g) => g.status === "published");
      if (!game) return NextResponse.json({ error: "No published game found" }, { status: 404 });
      const kit = await generateLaunchKitForGame(game);
      return NextResponse.json({ ok: true, kit, gameId: game.id, store });
    }

    if (action === "PUBLISH_GROWTH_NOW") {
      const { generateLaunchKitForGame, publishToArmedChannels } = await import("@/lib/autoPromote");
      const gameId = String(body.gameId || "");
      const store = await loadFullStore();
      const game = store.games.find((g) => g.id === gameId) || store.games.find((g) => g.status === "published");
      if (!game) return NextResponse.json({ error: "No published game found" }, { status: 404 });
      const kit = body.kit || (await generateLaunchKitForGame(game));
      const results = await publishToArmedChannels(game, kit);
      await appendAuditLog({
        id: `aud-${Date.now().toString(36)}`,
        actor: session.email,
        action: "AUTO_GROWTH_PUBLISHED",
        target: `${game.id} (${game.title})`,
        detail: results.length > 0 ? results.map((r) => `${r.channel}:${r.status}`).join(" | ") : "No social API channels armed yet",
        createdAt: new Date().toISOString()
      });
      const nextStore = await loadFullStore();
      return NextResponse.json({ ok: true, results, kit, store: nextStore });
    }

    return NextResponse.json({ error: "Unsupported admin action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
