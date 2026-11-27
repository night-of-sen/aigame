"use client";

const FAV_KEY = "synthplay_favorites_v1";

export function readFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteId(gameId: string): string[] {
  const current = readFavoriteIds();
  const next = current.includes(gameId)
    ? current.filter((id) => id !== gameId)
    : [gameId, ...current];
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}
