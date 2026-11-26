"use client";

import React, { useEffect, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+-";

export function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    let frame = 0;
    const total = 16;
    let raf = 0;

    const step = () => {
      frame++;
      const progress = frame / total;
      const revealCount = Math.floor(text.length * progress);
      const next = text
        .split("")
        .map((ch, idx) => {
          if (ch === " ") return " ";
          if (idx < revealCount) return ch;
          return GLYPHS[(idx + frame * 3) % GLYPHS.length];
        })
        .join("");
      setDisplay(next);
      if (frame < total) {
        raf = requestAnimationFrame(step);
      } else {
        setDisplay(text);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return <span className={className}>{display}</span>;
}
