"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type Board = number[][];

function emptyBoard(): Board {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
}

function addRandomTile(board: Board): Board {
  const next = board.map((r) => [...r]);
  const empties: Array<[number, number]> = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (next[r][c] === 0) empties.push([r, c]);
    }
  }
  if (empties.length === 0) return next;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  next[r][c] = Math.random() < 0.88 ? 2 : 4;
  return next;
}

function slideRowLeft(row: number[]): { row: number[]; gained: number } {
  const vals = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      const merged = vals[i] * 2;
      out.push(merged);
      gained += merged;
      i++;
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return { row: out, gained };
}

function rotateCW(board: Board): Board {
  const out = emptyBoard();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[c][3 - r] = board[r][c];
    }
  }
  return out;
}

function moveBoard(board: Board, dir: "left" | "right" | "up" | "down"): { board: Board; moved: boolean; gained: number } {
  const turns = dir === "left" ? 0 : dir === "down" ? 1 : dir === "right" ? 2 : 3;
  let work = board.map((r) => [...r]);
  for (let i = 0; i < turns; i++) work = rotateCW(work);

  let gained = 0;
  const slid = work.map((row) => {
    const res = slideRowLeft(row);
    gained += res.gained;
    return res.row;
  });

  let back = slid;
  for (let i = 0; i < (4 - turns) % 4; i++) back = rotateCW(back);

  let moved = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (back[r][c] !== board[r][c]) moved = true;
    }
  }
  return { board: back, moved, gained };
}

function canMove(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
    }
  }
  return false;
}

const TILE_STYLES: Record<number, { bg: string; color: string; glow: string }> = {
  0: { bg: "rgba(255,255,255,0.03)", color: "transparent", glow: "none" },
  2: { bg: "#131926", color: "#CFD8EA", glow: "inset 0 0 0 1px rgba(255,255,255,0.12)" },
  4: { bg: "#152334", color: "#00F0D4", glow: "inset 0 0 0 1px rgba(0,240,212,0.35)" },
  8: { bg: "rgba(0,240,212,0.18)", color: "#00F0D4", glow: "0 0 16px rgba(0,240,212,0.28)" },
  16: { bg: "rgba(243,255,0,0.16)", color: "#F3FF00", glow: "0 0 16px rgba(243,255,0,0.28)" },
  32: { bg: "rgba(243,255,0,0.3)", color: "#F3FF00", glow: "0 0 20px rgba(243,255,0,0.42)" },
  64: { bg: "rgba(255,159,28,0.28)", color: "#FFBD59", glow: "0 0 20px rgba(255,159,28,0.38)" },
  128: { bg: "rgba(255,42,60,0.28)", color: "#FF6B78", glow: "0 0 22px rgba(255,42,60,0.42)" },
  256: { bg: "rgba(255,42,60,0.45)", color: "#FFFFFF", glow: "0 0 26px rgba(255,42,60,0.55)" },
  512: { bg: "linear-gradient(135deg, #00F0D4, #0EA5E9)", color: "#07080B", glow: "0 0 28px rgba(0,240,212,0.6)" },
  1024: { bg: "linear-gradient(135deg, #F3FF00, #FF9F1C)", color: "#07080B", glow: "0 0 30px rgba(243,255,0,0.7)" },
  2048: { bg: "linear-gradient(135deg, #F3FF00, #00F0D4, #FF2A3C)", color: "#07080B", glow: "0 0 36px rgba(243,255,0,0.85)" }
};

export function Volt2048Game({ onScore }: { onScore?: (score: number) => void }) {
  const [board, setBoard] = useState<Board>(() => addRandomTile(addRandomTile(emptyBoard())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [maxTile, setMaxTile] = useState(4);
  const [gameOver, setGameOver] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const reset = () => {
    setBoard(addRandomTile(addRandomTile(emptyBoard())));
    setScore(0);
    setMaxTile(4);
    setGameOver(false);
  };

  const applyMove = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      setBoard((prev) => {
        const res = moveBoard(prev, dir);
        if (!res.moved) return prev;
        const nextBoard = addRandomTile(res.board);
        const highest = Math.max(...nextBoard.flat());
        setMaxTile(highest);
        if (res.gained > 0) {
          setScore((s) => {
            const ns = s + res.gained;
            setBest((b) => Math.max(b, ns));
            onScore?.(ns);
            return ns;
          });
        }
        if (!canMove(nextBoard)) setGameOver(true);
        return nextBoard;
      });
    },
    [onScore]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") applyMove("left");
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") applyMove("right");
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") applyMove("up");
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") applyMove("down");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyMove]);

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 460, margin: "0 auto" }}>
      <div className="font-mono" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
          <span style={{ color: "var(--volt)", fontWeight: 700 }}>SCORE: {score.toLocaleString()}</span>
          <span style={{ color: "var(--cyan)" }}>MAX NODE: {maxTile}</span>
          <span style={{ color: "var(--ink-muted)" }}>BEST: {best.toLocaleString()}</span>
        </div>
        <button type="button" className="btn-steel font-mono" style={{ padding: "5px 10px", fontSize: 11 }} onClick={reset}>
          NEW MATRIX
        </button>
      </div>

      <div
        style={{
          position: "relative",
          padding: 12,
          borderRadius: 12,
          background: "#06080E",
          border: "1px solid rgba(243,255,0,0.32)",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
          touchAction: "none"
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStartRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = touchStartRef.current;
          const t = e.changedTouches[0];
          if (!start || !t) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
          if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? "right" : "left");
          else applyMove(dy > 0 ? "down" : "up");
        }}
      >
        {board.flat().map((val, idx) => {
          const st = TILE_STYLES[val] || TILE_STYLES[2048];
          return (
            <div
              key={idx}
              className="font-display"
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 8,
                background: st.bg,
                color: st.color,
                boxShadow: st.glow,
                display: "grid",
                placeItems: "center",
                fontSize: val >= 1024 ? 22 : val >= 128 ? 26 : 30,
                fontWeight: 700,
                transition: "transform 110ms ease, background 140ms ease"
              }}
            >
              {val > 0 ? val : ""}
            </div>
          );
        })}

        {gameOver && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(6,7,10,0.86)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div className="font-display" style={{ fontSize: 26, color: "var(--vermilion)", fontWeight: 700 }}>MATRIX LOCKED</div>
            <div className="font-mono" style={{ fontSize: 15, color: "var(--volt)" }}>FINAL SCORE: {score.toLocaleString()}</div>
            <button type="button" className="btn-volt" onClick={reset}>
              REBOOT 2048 ▶
            </button>
          </div>
        )}
      </div>

      <div className="font-mono" style={{ textAlign: "center", fontSize: 11, color: "var(--ink-muted)" }}>
        MERGE MATCHING VOLT CORES TO REACH 2048 · USE ARROW KEYS, WASD, OR SWIPE
      </div>
    </div>
  );
}
