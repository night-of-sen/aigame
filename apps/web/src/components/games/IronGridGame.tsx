"use client";

import React, { useState } from "react";

interface Unit {
  id: string;
  name: string;
  team: "player" | "ai";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  range: number;
  move: number;
  acted: boolean;
}

const GRID = 6;

const INITIAL_UNITS = (wave: number): Unit[] => [
  { id: "p1", name: "STRIKER-01", team: "player", x: 1, y: 4, hp: 14, maxHp: 14, atk: 5, range: 1, move: 2, acted: false },
  { id: "p2", name: "RAIL-02", team: "player", x: 4, y: 4, hp: 11, maxHp: 11, atk: 4, range: 3, move: 1, acted: false },
  { id: "e1", name: `DRONE-A${wave}`, team: "ai", x: 1, y: 1, hp: 6 + wave * 2, maxHp: 6 + wave * 2, atk: 3, range: 2, move: 2, acted: false },
  { id: "e2", name: `SIEGE-B${wave}`, team: "ai", x: 4, y: 1, hp: 9 + wave * 2, maxHp: 9 + wave * 2, atk: 4, range: 2, move: 1, acted: false },
  ...(wave >= 2
    ? [{ id: "e3", name: `OVERLORD-${wave}`, team: "ai" as const, x: 2, y: 0, hp: 10 + wave * 3, maxHp: 10 + wave * 3, atk: 5, range: 2, move: 1, acted: false }]
    : [])
];

const AI_BARKS = [
  "AI COMMANDER // Flanking your RAIL-02 railgun line. Recalculating killbox.",
  "AI COMMANDER // Your STRIKER-01 overextended. Concentrating plasma fire.",
  "AI COMMANDER // Hull breach detected on my drone. Deploying counter-barrage.",
  "AI COMMANDER // Predictable grid formation. Engaging adaptive pincer protocol."
];

export function IronGridGame({ onScore }: { onScore?: (score: number) => void }) {
  const [wave, setWave] = useState(1);
  const [units, setUnits] = useState<Unit[]>(() => INITIAL_UNITS(1));
  const [selectedId, setSelectedId] = useState<string | null>("p1");
  const [score, setScore] = useState(0);
  const [turn, setTurn] = useState(1);
  const [bark, setBark] = useState("AI COMMANDER // Sector 04 locked. Select a VOLT unit: click CYAN tile to move or RED enemy to strike.");
  const [flashCell, setFlashCell] = useState<string | null>(null);

  const selected = units.find((u) => u.id === selectedId && u.team === "player" && u.hp > 0) || null;
  const dist = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) + Math.abs(ay - by);

  const triggerFlash = (x: number, y: number) => {
    setFlashCell(`${x},${y}`);
    setTimeout(() => setFlashCell(null), 260);
  };

  const runAiTurn = (currentUnits: Unit[], nextScore: number) => {
    const aliveEnemies = currentUnits.filter((u) => u.team === "ai" && u.hp > 0);
    if (aliveEnemies.length === 0) {
      const nextWave = wave + 1;
      const bonus = nextScore + 1000 * wave;
      setScore(bonus);
      onScore?.(bonus);
      setWave(nextWave);
      setTurn(1);
      setUnits(INITIAL_UNITS(nextWave));
      setSelectedId("p1");
      setBark(`WAVE ${wave} CLEARED (+${1000 * wave} PTS) // Reinforcements inbound: WAVE ${nextWave}!`);
      return;
    }

    const updated = currentUnits.map((u) => ({ ...u }));
    for (const enemy of updated.filter((u) => u.team === "ai" && u.hp > 0)) {
      const players = updated.filter((u) => u.team === "player" && u.hp > 0);
      if (players.length === 0) break;
      players.sort((a, b) => dist(enemy.x, enemy.y, a.x, a.y) - dist(enemy.x, enemy.y, b.x, b.y));
      const target = players[0];

      // Move closer if out of range
      if (dist(enemy.x, enemy.y, target.x, target.y) > enemy.range) {
        const candidates = [
          { x: enemy.x + Math.sign(target.x - enemy.x), y: enemy.y },
          { x: enemy.x, y: enemy.y + Math.sign(target.y - enemy.y) }
        ].filter(
          (c) =>
            c.x >= 0 &&
            c.x < GRID &&
            c.y >= 0 &&
            c.y < GRID &&
            !updated.some((o) => o.hp > 0 && o.x === c.x && o.y === c.y)
        );
        if (candidates[0]) {
          enemy.x = candidates[0].x;
          enemy.y = candidates[0].y;
        }
      }

      // Attack if in range
      if (dist(enemy.x, enemy.y, target.x, target.y) <= enemy.range) {
        target.hp = Math.max(0, target.hp - enemy.atk);
        triggerFlash(target.x, target.y);
      }
    }

    const survivingPlayers = updated.filter((u) => u.team === "player" && u.hp > 0);
    if (survivingPlayers.length === 0) {
      setUnits(INITIAL_UNITS(1));
      setWave(1);
      setTurn(1);
      setScore(0);
      setSelectedId("p1");
      setBark("SQUAD DESTROYED // Auto-rebooting Tactical Simulation Wave 1.");
      return;
    }

    for (const p of updated) {
      if (p.team === "player") p.acted = false;
    }
    setUnits(updated);
    setTurn((t) => t + 1);
    setBark(AI_BARKS[(turn + wave) % AI_BARKS.length]);
    setSelectedId(survivingPlayers[0].id);
  };

  const handleCellClick = (x: number, y: number) => {
    const occupant = units.find((u) => u.hp > 0 && u.x === x && u.y === y);

    // Select friendly mech
    if (occupant && occupant.team === "player") {
      setSelectedId(occupant.id);
      return;
    }

    if (!selected || selected.acted) return;

    // Attack enemy in range
    if (occupant && occupant.team === "ai" && dist(selected.x, selected.y, x, y) <= selected.range) {
      const next = units.map((u) => {
        if (u.id === occupant.id) return { ...u, hp: Math.max(0, u.hp - selected.atk) };
        if (u.id === selected.id) return { ...u, acted: true };
        return u;
      });
      const killed = occupant.hp - selected.atk <= 0;
      const nextScore = score + (killed ? 450 : 180);
      setScore(nextScore);
      onScore?.(nextScore);
      triggerFlash(x, y);

      const allActed = next.filter((u) => u.team === "player" && u.hp > 0).every((u) => u.acted);
      if (allActed || next.filter((u) => u.team === "ai" && u.hp > 0).length === 0) {
        runAiTurn(next, nextScore);
      } else {
        setUnits(next);
        setBark(`${selected.name} dealt ${selected.atk} DMG to ${occupant.name}${killed ? " [DESTROYED!]" : ""}.`);
      }
      return;
    }

    // Move to empty tile in move range
    if (!occupant && dist(selected.x, selected.y, x, y) <= selected.move) {
      const next = units.map((u) => (u.id === selected.id ? { ...u, x, y, acted: true } : u));
      const allActed = next.filter((u) => u.team === "player" && u.hp > 0).every((u) => u.acted);
      if (allActed) {
        runAiTurn(next, score);
      } else {
        setUnits(next);
        setBark(`${selected.name} repositioned to [${x},${y}]. Command remaining mech or End Turn.`);
      }
    }
  };

  return (
    <div style={{ padding: 16, background: "#07090e", minHeight: 430, display: "grid", gap: 12 }}>
      {/* Top Status */}
      <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 12 }}>
        <div style={{ display: "flex", gap: 14 }}>
          <span>WAVE <strong style={{ color: "var(--volt)" }}>0{wave}</strong></span>
          <span>TURN <strong style={{ color: "var(--cyan)" }}>{turn}</strong></span>
          <span>SCORE <strong style={{ color: "#fff" }}>{score.toLocaleString()}</strong></span>
        </div>
        <button type="button" className="btn-steel" style={{ padding: "6px 14px", fontSize: 11 }} onClick={() => runAiTurn(units, score)}>
          END PLAYER TURN ⏭
        </button>
      </div>

      {/* AI Commander Bark */}
      <div className="font-mono" style={{ padding: "8px 12px", background: "rgba(255,42,60,0.08)", border: "1px solid rgba(255,42,60,0.35)", fontSize: 12, color: "#ffd5d9" }}>
        {bark}
      </div>

      {/* 6x6 Tactical Grid */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`, gap: 6, maxWidth: 480, width: "100%", margin: "0 auto" }}>
        {Array.from({ length: GRID * GRID }).map((_, idx) => {
          const x = idx % GRID;
          const y = Math.floor(idx / GRID);
          const u = units.find((unit) => unit.hp > 0 && unit.x === x && unit.y === y);
          const canMove = selected && !selected.acted && !u && dist(selected.x, selected.y, x, y) <= selected.move;
          const canAttack = selected && !selected.acted && u?.team === "ai" && dist(selected.x, selected.y, x, y) <= selected.range;
          const isSelected = u && u.id === selected?.id;
          const isFlashing = flashCell === `${x},${y}`;

          return (
            <button
              key={`${x}-${y}`}
              type="button"
              onClick={() => handleCellClick(x, y)}
              style={{
                aspectRatio: "1 / 1",
                minHeight: 50,
                padding: 4,
                cursor: "pointer",
                border: isSelected
                  ? "2px solid var(--volt)"
                  : canAttack
                    ? "2px solid var(--vermilion)"
                    : canMove
                      ? "1px solid var(--cyan)"
                      : "1px solid rgba(255,255,255,0.1)",
                background: isFlashing
                  ? "rgba(255,42,60,0.65)"
                  : canAttack
                    ? "rgba(255,42,60,0.22)"
                    : canMove
                      ? "rgba(0,240,212,0.12)"
                      : "rgba(16,20,30,0.9)",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2
              }}
            >
              {u ? (
                <>
                  <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: u.team === "player" ? (u.acted ? "#7b8499" : "var(--volt)") : "var(--vermilion)" }}>
                    {u.name.split("-")[0]}
                  </span>
                  <span className="font-mono" style={{ fontSize: 10, color: "#d7deec" }}>
                    HP {u.hp}/{u.maxHp}
                  </span>
                  <span className="font-mono" style={{ fontSize: 9, color: "var(--ink-muted)" }}>
                    ATK {u.atk} · R{u.range}
                  </span>
                </>
              ) : (
                <span className="font-mono" style={{ fontSize: 9, color: canMove ? "var(--cyan)" : "rgba(255,255,255,0.16)" }}>
                  {canMove ? "MOVE" : `${x},${y}`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
