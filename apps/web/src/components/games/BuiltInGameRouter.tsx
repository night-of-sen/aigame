"use client";

import React from "react";
import type { GameRecord } from "@synthplay/db";
import { WanganDriftGame } from "./WanganDriftGame";
import { IronGridGame } from "./IronGridGame";
import { RamenAlleyGame } from "./RamenAlleyGame";
import { CrimsonDanmakuGame } from "./CrimsonDanmakuGame";
import { MonolithBreakerGame } from "./MonolithBreakerGame";
import { KeplerRingGame } from "./KeplerRingGame";
import { NeonSerpentGame } from "./NeonSerpentGame";
import { Volt2048Game } from "./Volt2048Game";
import { PulseBreakerGame } from "./PulseBreakerGame";
import { HyperSurvivorGame } from "./HyperSurvivorGame";

export function BuiltInGameRouter({
  game,
  onScore
}: {
  game: GameRecord;
  onScore?: (score: number) => void;
}) {
  const slug = game.slug.toLowerCase();
  const cat = game.category.toUpperCase();

  if (slug.includes("serpent") || slug.includes("snake") || cat === "ARCADE") {
    return <NeonSerpentGame onScore={onScore} />;
  }
  if (slug.includes("2048") || slug.includes("volt-2048") || cat === "PUZZLE") {
    return <Volt2048Game onScore={onScore} />;
  }
  if (slug.includes("pulse-breaker") || slug.includes("brick") || cat === "BRICK") {
    return <PulseBreakerGame onScore={onScore} />;
  }
  if (slug.includes("survivor") || cat === "SURVIVAL") {
    return <HyperSurvivorGame onScore={onScore} />;
  }
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
