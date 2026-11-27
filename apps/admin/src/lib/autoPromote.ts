import crypto from "node:crypto";
import type { GameRecord } from "@synthplay/db";

const MAIN_DOMAIN = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");

export interface GrowthChannelsStatus {
  bluesky: boolean;
  x: boolean;
  mastodon: boolean;
  devto: boolean;
  discord: boolean;
  telegram: boolean;
}

export function getGrowthChannelsStatus(): GrowthChannelsStatus {
  const has = (k: string) => Boolean((process.env[k] || "").trim() && !(process.env[k] || "").startsWith("your_"));
  return {
    bluesky: has("BLUESKY_HANDLE") && has("BLUESKY_APP_PASSWORD"),
    x: has("X_API_KEY") && has("X_API_SECRET") && has("X_ACCESS_TOKEN") && has("X_ACCESS_SECRET"),
    mastodon: has("MASTODON_INSTANCE") && has("MASTODON_ACCESS_TOKEN"),
    devto: has("DEVTO_API_KEY"),
    discord: has("DISCORD_WEBHOOK_URL"),
    telegram: has("TELEGRAM_BOT_TOKEN") && has("TELEGRAM_CHAT_ID")
  };
}

export interface GeneratedLaunchKit {
  gameUrl: string;
  shortSocialPost: string;
  redditTitle: string;
  redditBody: string;
  hnTitle: string;
  productHuntTagline: string;
  devtoMarkdown: string;
}

export async function generateLaunchKitForGame(game: GameRecord): Promise<GeneratedLaunchKit> {
  const gameUrl = `${MAIN_DOMAIN}/games/${game.slug}`;
  const tools = (game.aiTools || ["HTML5", "Canvas2D"]).slice(0, 3).join(", ");

  const fallback: GeneratedLaunchKit = {
    gameUrl,
    shortSocialPost: `${game.title} — free ${game.category.toLowerCase()} browser game built with ${tools}.\n\n${game.tagline}\n\nPlay free (no download): ${gameUrl}\n#indiegames #html5games #gamedev`,
    redditTitle: `[Playable in Browser] ${game.title} — Free ${game.category} HTML5 Game (Zero Downloads)`,
    redditBody: `Hey everyone! Just published **${game.title}** on SYNTHPLAY — a free browser arcade for indie & AI-crafted HTML5 games.\n\n**What it is:** ${game.tagline}\n**Built with:** ${tools}\n**Play free (desktop, iPad & mobile):** ${gameUrl}\n\nNo paywalls, no sign-up needed to play, and indie devs can also upload HTML5/ZIP games 100% free. Would love your feedback on gameplay and difficulty balance!`,
    hnTitle: `Show HN: SYNTHPLAY – Free browser arcade for AI & indie HTML5 games (${game.title})`,
    productHuntTagline: `Play & publish free AI-crafted HTML5 browser games instantly with zero downloads.`,
    devtoMarkdown: `# ${game.title} — Free ${game.category} Browser Game\n\n${game.tagline}\n\nPlay directly in your browser (zero downloads): ${gameUrl}\n\nBuilt with **${tools}** by @${game.creatorName} [${game.creatorCountryCode}].`
  };

  const apiKey = process.env.AI_TRANSLATE_API_KEY || process.env.DEEPSEEK_API_KEY || "";
  if (!apiKey || apiKey.startsWith("your_")) return fallback;

  try {
    const provider = (process.env.AI_TRANSLATE_PROVIDER || "deepseek").toLowerCase();
    const endpoint =
      provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "https://api.deepseek.com/chat/completions";
    const model = process.env.AI_TRANSLATE_MODEL || (provider === "openai" ? "gpt-4o-mini" : "deepseek-chat");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an indie game marketing strategist. Generate authentic, non-spammy launch copy for a free HTML5 browser game on SYNTHPLAY. Return strict JSON with keys: shortSocialPost (<= 240 chars including URL & 3 hashtags), redditTitle, redditBody (conversational, asks for gameplay feedback), hnTitle (Show HN style, technical & humble), productHuntTagline (<= 60 chars), devtoMarkdown (concise 220-word technical spotlight)."
          },
          {
            role: "user",
            content: `Game: ${game.title}\nGenre: ${game.category}\nTagline: ${game.tagline}\nCreator: @${game.creatorName} [${game.creatorCountryCode}]\nStack: ${tools}\nURL: ${gameUrl}`
          }
        ]
      })
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    return {
      gameUrl,
      shortSocialPost:
        typeof parsed.shortSocialPost === "string" && parsed.shortSocialPost.includes(gameUrl)
          ? parsed.shortSocialPost
          : fallback.shortSocialPost,
      redditTitle: typeof parsed.redditTitle === "string" ? parsed.redditTitle : fallback.redditTitle,
      redditBody: typeof parsed.redditBody === "string" ? parsed.redditBody : fallback.redditBody,
      hnTitle: typeof parsed.hnTitle === "string" ? parsed.hnTitle : fallback.hnTitle,
      productHuntTagline:
        typeof parsed.productHuntTagline === "string" ? parsed.productHuntTagline : fallback.productHuntTagline,
      devtoMarkdown: typeof parsed.devtoMarkdown === "string" ? parsed.devtoMarkdown : fallback.devtoMarkdown
    };
  } catch {
    return fallback;
  }
}

function pctEncode(str: string) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildOAuth1Header(method: string, url: string) {
  const oauth: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY || "",
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: process.env.X_ACCESS_TOKEN || "",
    oauth_version: "1.0"
  };
  const paramStr = Object.keys(oauth)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(oauth[k])}`)
    .join("&");
  const baseStr = `${method.toUpperCase()}&${pctEncode(url)}&${pctEncode(paramStr)}`;
  const signingKey = `${pctEncode(process.env.X_API_SECRET || "")}&${pctEncode(process.env.X_ACCESS_SECRET || "")}`;
  oauth.oauth_signature = crypto.createHmac("sha1", signingKey).update(baseStr).digest("base64");

  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${pctEncode(k)}="${pctEncode(oauth[k])}"`)
      .join(", ")
  );
}

export async function publishToArmedChannels(
  game: GameRecord,
  kit: GeneratedLaunchKit
): Promise<Array<{ channel: string; status: string }>> {
  const status = getGrowthChannelsStatus();
  const results: Array<{ channel: string; status: string }> = [];

  const coverUrl = game.coverImage?.startsWith("http")
    ? game.coverImage
    : `${MAIN_DOMAIN}${game.coverImage || "/games/tokyo-drift.jpg"}`;

  if (status.bluesky) {
    try {
      const sessRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: process.env.BLUESKY_HANDLE,
          password: process.env.BLUESKY_APP_PASSWORD
        })
      });
      if (!sessRes.ok) throw new Error(`Auth HTTP ${sessRes.status}`);
      const sess = await sessRes.json();

      let thumbBlob: unknown = null;
      try {
        const imgRes = await fetch(coverUrl);
        if (imgRes.ok) {
          const bytes = new Uint8Array(await imgRes.arrayBuffer());
          if (bytes.byteLength > 0 && bytes.byteLength <= 950_000) {
            const upRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${sess.accessJwt}`,
                "Content-Type": imgRes.headers.get("content-type") || "image/jpeg"
              },
              body: bytes
            });
            if (upRes.ok) thumbBlob = (await upRes.json())?.blob || null;
          }
        }
      } catch {
        // Proceed without thumbnail on transient fetch issue
      }

      const encoder = new TextEncoder();
      const byteOff = (i: number) => encoder.encode(kit.shortSocialPost.slice(0, i)).byteLength;
      const facets: Array<Record<string, unknown>> = [];
      for (const m of kit.shortSocialPost.matchAll(/https?:\/\/[^\s]+/g)) {
        const start = m.index ?? 0;
        const raw = m[0].replace(/[.,!?;:)]+$/, "");
        facets.push({
          index: { byteStart: byteOff(start), byteEnd: byteOff(start + raw.length) },
          features: [{ $type: "app.bsky.richtext.facet#link", uri: raw }]
        });
      }
      for (const m of kit.shortSocialPost.matchAll(/(^|\s)#([a-zA-Z0-9_]+)/g)) {
        const start = (m.index ?? 0) + m[1].length;
        facets.push({
          index: { byteStart: byteOff(start), byteEnd: byteOff(start + 1 + m[2].length) },
          features: [{ $type: "app.bsky.richtext.facet#tag", tag: m[2] }]
        });
      }

      const external: Record<string, unknown> = {
        uri: kit.gameUrl,
        title: `${game.title} — Play Free in Browser ▶`,
        description: game.tagline
      };
      if (thumbBlob) external.thumb = thumbBlob;

      const postRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.accessJwt}` },
        body: JSON.stringify({
          repo: sess.did,
          collection: "app.bsky.feed.post",
          record: {
            $type: "app.bsky.feed.post",
            text: kit.shortSocialPost,
            facets,
            createdAt: new Date().toISOString(),
            embed: { $type: "app.bsky.embed.external", external }
          }
        })
      });
      if (!postRes.ok) throw new Error(`Post HTTP ${postRes.status}`);
      results.push({ channel: "BLUESKY", status: thumbBlob ? "PUBLISHED (HD CARD)" : "PUBLISHED" });
    } catch (e) {
      results.push({ channel: "BLUESKY", status: `ERROR: ${e instanceof Error ? e.message : "failed"}` });
    }
  }

  if (status.x) {
    try {
      const url = "https://api.x.com/2/tweets";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: buildOAuth1Header("POST", url) },
        body: JSON.stringify({ text: kit.shortSocialPost })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      results.push({ channel: "X / TWITTER", status: "PUBLISHED" });
    } catch (e) {
      results.push({ channel: "X / TWITTER", status: `ERROR: ${e instanceof Error ? e.message : "failed"}` });
    }
  }

  if (status.mastodon) {
    try {
      const inst = (process.env.MASTODON_INSTANCE || "").replace(/\/$/, "");
      const res = await fetch(`${inst}/api/v1/statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.MASTODON_ACCESS_TOKEN}` },
        body: JSON.stringify({ status: kit.shortSocialPost, visibility: "public" })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      results.push({ channel: "MASTODON", status: "PUBLISHED" });
    } catch (e) {
      results.push({ channel: "MASTODON", status: `ERROR: ${e instanceof Error ? e.message : "failed"}` });
    }
  }

  if (status.devto) {
    try {
      const bodyMd = kit.devtoMarkdown.includes("![")
        ? kit.devtoMarkdown
        : `![${game.title}](${coverUrl})\n\n${kit.devtoMarkdown}`;
      const res = await fetch("https://dev.to/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": process.env.DEVTO_API_KEY || "" },
        body: JSON.stringify({
          article: {
            title: `${game.title} — Free ${game.category} Browser Game on SYNTHPLAY`,
            published: true,
            body_markdown: bodyMd,
            canonical_url: kit.gameUrl,
            main_image: coverUrl,
            tags: ["gamedev", "html5", "indiedev", "webdev"]
          }
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      results.push({ channel: "DEV.TO", status: "PUBLISHED (HD COVER)" });
    } catch (e) {
      results.push({ channel: "DEV.TO", status: `ERROR: ${e instanceof Error ? e.message : "failed"}` });
    }
  }

  if (status.discord) {
    try {
      const res = await fetch(process.env.DISCORD_WEBHOOK_URL || "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: kit.shortSocialPost,
          embeds: [{ title: `${game.title} — Play Free ▶`, description: game.tagline, url: kit.gameUrl, color: 15990528, image: { url: coverUrl } }]
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      results.push({ channel: "DISCORD", status: "PUBLISHED" });
    } catch (e) {
      results.push({ channel: "DISCORD", status: `ERROR: ${e instanceof Error ? e.message : "failed"}` });
    }
  }

  if (status.telegram) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, photo: coverUrl, caption: kit.shortSocialPost })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      results.push({ channel: "TELEGRAM", status: "PUBLISHED (HD PHOTO)" });
    } catch (e) {
      results.push({ channel: "TELEGRAM", status: `ERROR: ${e instanceof Error ? e.message : "failed"}` });
    }
  }

  return results;
}
