#!/usr/bin/env node
/**
 * SYNTHPLAY Automated Multi-Channel Social & Devlog Publisher (Zero external deps, Node 22+)
 *
 * Features:
 *  - DeepSeek AI fresh copy generation (rotating daily across all published games)
 *  - Bluesky ATProto rich link card WITH uploaded 16:9 HD cover image blob + clickable URL & #hashtag facets
 *  - Dev.to rich Markdown spotlight WITH 1280x720 HD cover banner + inline poster + canonical SEO backlink
 *  - X / Twitter v2 OAuth 1.0a, Mastodon (with media upload), Discord rich embed, Telegram photo+caption
 */

import crypto from "node:crypto";

const MAIN_DOMAIN = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "https://synthplay.games").replace(/\/$/, "");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || process.env.DRY_RUN === "true";
const includeDevto = args.includes("--include-devto") || [1, 4].includes(new Date().getUTCDay());
const explicitSlug = args.find((a) => a.startsWith("--slug="))?.slice(7) || process.env.GAME_SLUG || "";

function pctEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildOAuth1Header(method, url, creds) {
  const oauth = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0"
  };
  const paramStr = Object.keys(oauth)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(oauth[k])}`)
    .join("&");
  const baseStr = `${method.toUpperCase()}&${pctEncode(url)}&${pctEncode(paramStr)}`;
  const signingKey = `${pctEncode(creds.apiSecret)}&${pctEncode(creds.accessSecret)}`;
  oauth.oauth_signature = crypto.createHmac("sha1", signingKey).update(baseStr).digest("base64");

  return (
    "OAuth " +
    Object.keys(oauth)
      .sort()
      .map((k) => `${pctEncode(k)}="${pctEncode(oauth[k])}"`)
      .join(", ")
  );
}

/**
 * Computes UTF-8 byte offsets for Bluesky ATProto rich-text facets (clickable links & discoverable #hashtags).
 */
function detectBlueskyFacets(text) {
  const facets = [];
  const encoder = new TextEncoder();
  const byteOffsetOf = (charIdx) => encoder.encode(text.slice(0, charIdx)).byteLength;

  // URLs
  for (const m of text.matchAll(/https?:\/\/[^\s]+/g)) {
    const start = m.index ?? 0;
    const raw = m[0].replace(/[.,!?;:)]+$/, "");
    facets.push({
      index: { byteStart: byteOffsetOf(start), byteEnd: byteOffsetOf(start + raw.length) },
      features: [{ $type: "app.bsky.richtext.facet#link", uri: raw }]
    });
  }

  // #hashtags
  for (const m of text.matchAll(/(^|\s)#([a-zA-Z0-9_]+)/g)) {
    const start = (m.index ?? 0) + m[1].length;
    const tag = m[2];
    facets.push({
      index: { byteStart: byteOffsetOf(start), byteEnd: byteOffsetOf(start + 1 + tag.length) },
      features: [{ $type: "app.bsky.richtext.facet#tag", tag }]
    });
  }

  return facets;
}

function getGameCoverUrl(game) {
  if (game.coverImage && game.coverImage.startsWith("http")) return game.coverImage;
  return `${MAIN_DOMAIN}${game.coverImage || "/games/tokyo-drift.jpg"}`;
}

async function generateCopyWithAI(game, gameUrl, coverUrl) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_TRANSLATE_API_KEY || "";
  const tools = (game.aiTools || ["HTML5", "Canvas2D"]).slice(0, 3).join(", ");
  const fallbackShort = `${game.title} — free ${game.category.toLowerCase()} browser game built with ${tools}.\n\n${game.tagline}\n\nPlay free (zero downloads): ${gameUrl}\n#indiegames #html5games #gamedev`;
  const fallbackDevto = `![${game.title} Key Art](${coverUrl})\n\n## Play **${game.title}** Free in Your Browser\n\n${game.tagline}\n\n👉 **Launch instantly (zero downloads, works on desktop, iPad & mobile):** [Play ${game.title} on SYNTHPLAY](${gameUrl})\n\n### Tech & AI Stack\n- **Genre**: ${game.category}\n- **Creator**: [@${game.creatorName}](${MAIN_DOMAIN}/u/${encodeURIComponent(game.creatorName)}) [${game.creatorCountryCode}]\n- **Built With**: ${tools}\n- **Security Sandbox**: Isolated cross-origin Cloudflare R2 execution (\`*.synthplay-box.cloud\`)\n\n### Want to Host Your Own AI / HTML5 Game Free?\nIndie & AI game creators can paste a single HTML5 file or upload a ZIP bundle 100% free on [SYNTHPLAY](${MAIN_DOMAIN}) with zero bandwidth costs and 0% cut on player tips.\n`;

  if (!apiKey || apiKey.startsWith("your_")) {
    return { shortPost: fallbackShort, devtoMarkdown: fallbackDevto };
  }

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.AI_TRANSLATE_MODEL || "deepseek-chat",
        temperature: 0.72,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write authentic, engaging indie game showcase posts for SYNTHPLAY (free HTML5 & AI browser arcade). Return strict JSON: { \"shortPost\": string (<= 245 chars INCLUDING the exact URL and 3 hashtags like #indiegames #gamedev #html5games), \"devtoMarkdown\": string (concise 240-word technical spotlight in Markdown starting with the hero image markdown provided) }."
          },
          {
            role: "user",
            content: `Spotlight this free playable browser game:\nTitle: ${game.title}\nGenre: ${game.category}\nTagline: ${game.tagline}\nCreator: @${game.creatorName} [${game.creatorCountryCode}]\nTools: ${tools}\nPlay URL: ${gameUrl}\nCover Image Markdown to place at top of devtoMarkdown: ![${game.title}](${coverUrl})`
          }
        ]
      })
    });
    if (!res.ok) return { shortPost: fallbackShort, devtoMarkdown: fallbackDevto };
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    const shortPost =
      typeof parsed.shortPost === "string" && parsed.shortPost.includes(gameUrl)
        ? parsed.shortPost.slice(0, 278)
        : fallbackShort;
    let devtoMarkdown =
      typeof parsed.devtoMarkdown === "string" && parsed.devtoMarkdown.length > 100
        ? parsed.devtoMarkdown
        : fallbackDevto;
    if (!devtoMarkdown.includes("![")) {
      devtoMarkdown = `![${game.title}](${coverUrl})\n\n${devtoMarkdown}`;
    }
    return { shortPost, devtoMarkdown };
  } catch {
    return { shortPost: fallbackShort, devtoMarkdown: fallbackDevto };
  }
}

async function uploadBlueskyBlob(accessJwt, imageUrl) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return null;
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await imgRes.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > 950_000) return null;

  const upRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessJwt}`,
      "Content-Type": contentType
    },
    body: bytes
  });
  if (!upRes.ok) return null;
  const upData = await upRes.json();
  return upData?.blob || null;
}

async function postBluesky(text, game, gameUrl, coverUrl) {
  const identifier = process.env.BLUESKY_HANDLE || "";
  const password = process.env.BLUESKY_APP_PASSWORD || "";
  if (!identifier || !password) return "SKIPPED (no BLUESKY_HANDLE / BLUESKY_APP_PASSWORD)";
  if (dryRun) return "DRY_RUN";

  const sessRes = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password })
  });
  if (!sessRes.ok) throw new Error(`Bluesky auth HTTP ${sessRes.status}`);
  const sess = await sessRes.json();

  // Upload 16:9 HD game artwork as card thumbnail so Bluesky renders a rich visual link card!
  const thumbBlob = await uploadBlueskyBlob(sess.accessJwt, coverUrl);
  const facets = detectBlueskyFacets(text);

  const externalEmbed = {
    uri: gameUrl,
    title: `${game.title} — Play Free in Browser ▶`,
    description: `${game.tagline} (${game.category} · Zero downloads)`
  };
  if (thumbBlob) {
    externalEmbed.thumb = thumbBlob;
  }

  const postRes = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sess.accessJwt}`
    },
    body: JSON.stringify({
      repo: sess.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text,
        facets,
        createdAt: new Date().toISOString(),
        embed: {
          $type: "app.bsky.embed.external",
          external: externalEmbed
        }
      }
    })
  });
  if (!postRes.ok) throw new Error(`Bluesky post HTTP ${postRes.status}: ${await postRes.text()}`);
  return thumbBlob ? "PUBLISHED (WITH 16:9 HD IMAGE CARD + CLICKABLE TAGS)" : "PUBLISHED";
}

async function postX(text) {
  const apiKey = process.env.X_API_KEY || "";
  const apiSecret = process.env.X_API_SECRET || "";
  const accessToken = process.env.X_ACCESS_TOKEN || "";
  const accessSecret = process.env.X_ACCESS_SECRET || "";
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return "SKIPPED (no X_API_KEY / X_ACCESS_TOKEN)";
  }
  if (dryRun) return "DRY_RUN";

  const url = "https://api.x.com/2/tweets";
  const auth = buildOAuth1Header("POST", url, { apiKey, apiSecret, accessToken, accessSecret });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth
    },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`X API HTTP ${res.status}: ${await res.text()}`);
  return "PUBLISHED (WITH 1200x630 TWITTER SUMMARY_LARGE_IMAGE CARD)";
}

async function postMastodon(text, game, coverUrl) {
  const instance = (process.env.MASTODON_INSTANCE || "").replace(/\/$/, "");
  const token = process.env.MASTODON_ACCESS_TOKEN || "";
  if (!instance || !token) return "SKIPPED (no MASTODON_INSTANCE / MASTODON_ACCESS_TOKEN)";
  if (dryRun) return "DRY_RUN";

  let mediaIds = [];
  try {
    const imgRes = await fetch(coverUrl);
    if (imgRes.ok) {
      const blob = new Blob([await imgRes.arrayBuffer()], { type: imgRes.headers.get("content-type") || "image/jpeg" });
      const fd = new FormData();
      fd.append("file", blob, `${game.slug}.jpg`);
      fd.append("description", `${game.title} — ${game.tagline}`);
      const mRes = await fetch(`${instance}/api/v2/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (mRes.ok) {
        const mJson = await mRes.json();
        if (mJson?.id) mediaIds = [mJson.id];
      }
    }
  } catch {
    // Post without media if upload fails
  }

  const res = await fetch(`${instance}/api/v1/statuses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      status: text,
      visibility: "public",
      ...(mediaIds.length > 0 ? { media_ids: mediaIds } : {})
    })
  });
  if (!res.ok) throw new Error(`Mastodon HTTP ${res.status}`);
  return mediaIds.length > 0 ? "PUBLISHED (WITH HD IMAGE)" : "PUBLISHED";
}

async function postDevto(markdown, game, gameUrl, coverUrl) {
  const apiKey = process.env.DEVTO_API_KEY || "";
  if (!apiKey) return "SKIPPED (no DEVTO_API_KEY)";
  if (!includeDevto) return "SKIPPED (Dev.to posts Mon/Thu to avoid spam)";
  if (dryRun) return "DRY_RUN";

  const res = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      article: {
        title: `${game.title}: Free ${game.category} Browser Game Built with ${(game.aiTools || ["HTML5"]).slice(0, 2).join(" & ")}`,
        published: true,
        body_markdown: markdown,
        canonical_url: gameUrl,
        main_image: coverUrl,
        tags: ["gamedev", "html5", "indiedev", "webdev"]
      }
    })
  });
  if (!res.ok) throw new Error(`Dev.to HTTP ${res.status}: ${await res.text()}`);
  return "PUBLISHED (WITH 1280x720 COVER IMAGE)";
}

async function postDiscord(text, game, gameUrl, coverUrl) {
  const webhook = process.env.DISCORD_WEBHOOK_URL || "";
  if (!webhook) return "SKIPPED (no DISCORD_WEBHOOK_URL)";
  if (dryRun) return "DRY_RUN";

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: text,
      embeds: [
        {
          title: `${game.title} — Play Free in Browser ▶`,
          description: game.tagline,
          url: gameUrl,
          color: 15990528,
          image: { url: coverUrl }
        }
      ]
    })
  });
  if (!res.ok) throw new Error(`Discord HTTP ${res.status}`);
  return "PUBLISHED (WITH HD EMBED IMAGE)";
}

async function postTelegram(text, coverUrl) {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  if (!token || !chatId) return "SKIPPED (no TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)";
  if (dryRun) return "DRY_RUN";

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: coverUrl,
      caption: text
    })
  });
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
  return "PUBLISHED (WITH HD PHOTO)";
}

async function main() {
  const gamesRes = await fetch(`${MAIN_DOMAIN}/api/games`);
  if (!gamesRes.ok) throw new Error(`Failed to fetch games catalog: HTTP ${gamesRes.status}`);
  const payload = await gamesRes.json();
  const published = (payload.games || []).filter((g) => g.status === "published");
  if (published.length === 0) throw new Error("No published games available to promote.");

  const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
  const game =
    (explicitSlug ? published.find((g) => g.slug === explicitSlug) : null) ||
    published[dayOfYear % published.length];
  const gameUrl = `${MAIN_DOMAIN}/games/${game.slug}`;
  const coverUrl = getGameCoverUrl(game);

  console.log(`Selected spotlight game: ${game.title} (${gameUrl}) | cover=${coverUrl} | dryRun=${dryRun}`);
  const { shortPost, devtoMarkdown } = await generateCopyWithAI(game, gameUrl, coverUrl);
  console.log("\n--- GENERATED COPY ---\n" + shortPost + "\n----------------------\n");

  const tasks = [
    ["Bluesky", () => postBluesky(shortPost, game, gameUrl, coverUrl)],
    ["X / Twitter", () => postX(shortPost)],
    ["Mastodon", () => postMastodon(shortPost, game, coverUrl)],
    ["Dev.to", () => postDevto(devtoMarkdown, game, gameUrl, coverUrl)],
    ["Discord", () => postDiscord(shortPost, game, gameUrl, coverUrl)],
    ["Telegram", () => postTelegram(shortPost, coverUrl)]
  ];

  for (const [name, fn] of tasks) {
    try {
      const status = await fn();
      console.log(`[${name}] ${status}`);
    } catch (err) {
      console.error(`[${name}] FAILED:`, err instanceof Error ? err.message : String(err));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
