import type { GameRecord } from "@synthplay/db";

let lastSyncMs = 0;

function getMeiliConfig() {
  const url = (process.env.MEILISEARCH_URL || "").replace(/\/$/, "");
  const key = process.env.MEILISEARCH_MASTER_KEY || "";
  return {
    url,
    key,
    enabled: Boolean(url && process.env.NEXT_PHASE !== "phase-production-build")
  };
}

function authHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

export async function isMeilisearchHealthy(): Promise<boolean> {
  const { url, enabled } = getMeiliConfig();
  if (!enabled) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Syncs published games into Meilisearch index `games` (throttled to at most once every 30s unless forced).
 */
export async function syncGamesToMeilisearch(games: GameRecord[], force = false): Promise<boolean> {
  const { url, key, enabled } = getMeiliConfig();
  if (!enabled) return false;
  const now = Date.now();
  if (!force && now - lastSyncMs < 30_000) return true;
  lastSyncMs = now;

  try {
    const docs = games
      .filter((g) => g.status === "published")
      .map((g) => ({
        id: g.id,
        slug: g.slug,
        title: g.title,
        titleZh: g.titleZh,
        tagline: g.tagline,
        taglineZh: g.taglineZh,
        jaTitle: g.translations?.ja?.title || "",
        koTitle: g.translations?.ko?.title || "",
        esTitle: g.translations?.es?.title || "",
        ptTitle: g.translations?.["pt-BR"]?.title || "",
        creatorName: g.creatorName,
        creatorCountryCode: g.creatorCountryCode,
        category: g.category,
        aiTools: g.aiTools,
        totalValidPlays: g.totalValidPlays,
        rating: g.rating
      }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${url}/indexes/games/documents?primaryKey=id`, {
      method: "POST",
      headers: authHeaders(key),
      signal: controller.signal,
      body: JSON.stringify(docs)
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function searchGamesWithMeili(
  query: string,
  allPublishedGames: GameRecord[]
): Promise<{ engine: "meilisearch" | "local"; games: GameRecord[] }> {
  const q = query.trim();
  if (!q) {
    return { engine: "local", games: allPublishedGames };
  }

  const { url, key, enabled } = getMeiliConfig();
  if (enabled) {
    try {
      await syncGamesToMeilisearch(allPublishedGames, false);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(`${url}/indexes/games/search`, {
        method: "POST",
        headers: authHeaders(key),
        signal: controller.signal,
        body: JSON.stringify({ q, limit: 24 })
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const hitIds = new Set<string>((data.hits || []).map((h: { id: string }) => String(h.id)));
        const byId = new Map(allPublishedGames.map((g) => [g.id, g]));
        const ordered = (data.hits || [])
          .map((h: { id: string }) => byId.get(String(h.id)))
          .filter((g: GameRecord | undefined): g is GameRecord => Boolean(g));
        if (ordered.length > 0 || hitIds.size === 0) {
          return { engine: "meilisearch", games: ordered };
        }
      }
    } catch {
      // Fall back to local search seamlessly
    }
  }

  const lower = q.toLowerCase();
  const filtered = allPublishedGames.filter((g) => {
    const trText = g.translations
      ? Object.values(g.translations)
          .map((v) => `${v.title} ${v.tagline}`)
          .join(" ")
      : "";
    const hay = `${g.title} ${g.titleZh} ${g.tagline} ${g.taglineZh} ${g.creatorName} ${g.category} ${g.aiTools.join(" ")} ${g.creatorCountryCode} ${trText}`.toLowerCase();
    return hay.includes(lower);
  });

  return { engine: "local", games: filtered };
}
