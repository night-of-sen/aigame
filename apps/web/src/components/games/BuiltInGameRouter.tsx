"use client";

import React from "react";
import type { GameRecord } from "@synthplay/db";
import { WanganDriftGame } from "./WanganDriftGame";
import { IronGridGame } from "./IronGridGame";
import { RamenAlleyGame } from "./RamenAlleyGame";
import { CrimsonDanmakuGame } from "./CrimsonDanmakuGame";
import { MonolithBreakerGame } from "./MonolithBreakerGame";
import { KeplerRingGame } from "./KeplerRingGame";

export function BuiltInGameRouter({
  game,
  onScore
}: {
  game: GameRecord;
  onScore?: (score: number) => void;
}) {
  const slug = game.slug.toLowerCase();
  const cat = game.category.toUpperCase();

  if (slug.includes("wangan") || slug.includes("drift") || cat === "RACING") {
    return <WanganDriftGame onScore={onScore} />;
  }
  if (slug.includes("iron-grid") || cat === "TACTICS") {
    return <IronGridGame onScore={onScore} />;
  }
  if (slug.includes("ramen") || cat === "AI NOIR") {
    return <RamenAlleyGame onScore={onScore} />;
  }
  if (slug.includes("danmaku") || slug.includes("bullet") || cat === "SHMUP") {
    return <CrimsonDanmakuGame onScore={onScore} />;
  }
  if (slug.includes("monolith") || cat === "ROGUELIKE") {
    return <MonolithBreakerGame onScore={onScore} />;
  }
  if (slug.includes("kepler") || cat === "STRATEGY") {
    return <KeplerRingGame onScore={onScore} />;
  }
  return <CrimsonDanmakuGame onScore={onScore} />;
}
