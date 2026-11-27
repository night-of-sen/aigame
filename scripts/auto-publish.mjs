#!/usr/bin/env node
/**
 * SYNTHPLAY Automated Multi-Channel Social & Devlog Publisher (Zero external deps, Node 22+)
 *
 * Official Compliant APIs supported (each auto-skipped if env vars are not configured):
 *  - Bluesky (BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)
 *  - X / Twitter v2 (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)
 *  - Mastodon (MASTODON_INSTANCE, MASTODON_ACCESS_TOKEN)
 *  - Dev.to (DEVTO_API_KEY) — runs on Mon/Thu or with --include-devto
 *  - Discord Webhook (DISCORD_WEBHOOK_URL)
 *  - Telegram Channel (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
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

async function generateCopyWithAI(game, gameUrl) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.AI_TRANSLATE_API_KEY || "";
  const fallbackShort = `${game.title} — free ${game.category.toLowerCase()} browser game built with ${(game.aiTools || ["HTML5"]).slice(0, 2).join(" + ")}.\n\n${game.tagline}\n\nPlay free (zero downloads): ${gameUrl}\n#indiegames #html5games #gamedev #aigames`;
  const fallbackDevto = `# Playing & Hosting ${game.title} — A Free Browser ${game.category} Game\n\n${game.tagline}\n\n## Play Free in Your Browser\nLaunch **${game.title}** directly in Chrome, Safari, Firefox, or Edge with zero downloads: ${gameUrl}\n\n## Tech & AI Stack\n- **Category**: ${game.category}\n- **Creator**: @${game.creatorName} [${game.creatorCountryCode}]\n- **Tools**: ${(game.aiTools || ["HTML5", "Canvas2D"]).join(", ")}\n- **Sandbox**: Isolated cross-origin Cloudflare R2 execution on \`*.synthplay-box.cloud\`\n\n## Build & Host Your Own HTML5 Game Free\nIndie & AI game creators can paste a single HTML5 file or upload a ZIP bundle 100% free on [SYNTHPLAY](${MAIN_DOMAIN}) with 0% cut on creator tips.\n`;

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
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write authentic, non-spammy indie game dev showcase posts for SYNTHPLAY (free HTML5 & AI browser arcade). Return strict JSON: { \"shortPost\": string (<= 240 chars INCLUDING the exact URL and 3 hashtags), \"devtoMarkdown\": string (concise 250-word technical spotlight in Markdown) }."
          },
          {
            role: "user",
            content: `Spotlight this free playable browser game:\nTitle: ${game.title}\nGenre: ${game.category}\nTagline: ${game.tagline}\nCreator: @${game.creatorName} [${game.creatorCountryCode}]\nTools: ${(game.aiTools || []).join(", ")}\nURL: ${gameUrl}`
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
    const devtoMarkdown =
      typeof parsed.devtoMarkdown === "string" && parsed.devtoMarkdown.length > 100
        ? parsed.devtoMarkdown
        : fallbackDevto;
    return { shortPost, devtoMarkdown };
  } catch {
    return { shortPost: fallbackShort, devtoMarkdown: fallbackDevto };
  }
}

async function postBluesky(text, game, gameUrl) {
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
        createdAt: new Date().toISOString(),
        embed: {
          $type: "app.bsky.embed.external",
          external: {
            uri: gameUrl,
            title: `${game.title} — Play Free on SYNTHPLAY`,
            description: game.tagline
          }
        }
      }
    })
  });
  if (!postRes.ok) throw new Error(`Bluesky post HTTP ${postRes.status}`);
  return "PUBLISHED";
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
  return "PUBLISHED";
}

async function postMastodon(text) {
  const instance = (process.env.MASTODON_INSTANCE || "").replace(/\/$/, "");
  const token = process.env.MASTODON_ACCESS_TOKEN || "";
  if (!instance || !token) return "SKIPPED (no MASTODON_INSTANCE / MASTODON_ACCESS_TOKEN)";
  if (dryRun) return "DRY_RUN";

  const res = await fetch(`${instance}/api/v1/statuses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status: text, visibility: "public" })
  });
  if (!res.ok) throw new Error(`Mastodon HTTP ${res.status}`);
  return "PUBLISHED";
}

async function postDevto(markdown, game, gameUrl) {
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
        main_image: `${gameUrl}/opengraph-image`,
        tags: ["gamedev", "html5", "indiedev", "webdev"]
      }
    })
  });
  if (!res.ok) throw new Error(`Dev.to HTTP ${res.status}: ${await res.text()}`);
  return "PUBLISHED";
}

async function postDiscord(text, game, gameUrl) {
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
          image: { url: `${gameUrl}/opengraph-image` }
        }
      ]
    })
  });
  if (!res.ok) throw new Error(`Discord HTTP ${res.status}`);
  return "PUBLISHED";
}

async function postTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  if (!token || !chatId) return "SKIPPED (no TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)";
  if (dryRun) return "DRY_RUN";

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false
    })
  });
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
  return "PUBLISHED";
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

  console.log(`Selected spotlight game: ${game.title} (${gameUrl}) | dryRun=${dryRun}`);
  const { shortPost, devtoMarkdown } = await generateCopyWithAI(game, gameUrl);
  console.log("\n--- GENERATED COPY ---\n" + shortPost + "\n----------------------\n");

  const tasks = [
    ["Bluesky", () => postBluesky(shortPost, game, gameUrl)],
    ["X / Twitter", () => postX(shortPost)],
    ["Mastodon", () => postMastodon(shortPost)],
    ["Dev.to", () => postDevto(devtoMarkdown, game, gameUrl)],
    ["Discord", () => postDiscord(shortPost, game, gameUrl)],
    ["Telegram", () => postTelegram(shortPost)]
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
