"use client";

import React, { useMemo, useState } from "react";

interface Suspect {
  id: string;
  name: string;
  role: string;
  alibi: string;
  witness: string;
  detail: string;
  isCulprit: boolean;
}

interface NoirCase {
  caseNo: number;
  crimeTitle: string;
  forensicClue: string;
  suspects: Suspect[];
}

function generateNoirCase(seed: number): NoirCase {
  const crimes = [
    { title: "STOLEN QUANTUM RAMEN RECIPE", clue: "Forensic scan: Suspect left wet neon-yellow bike oil on the back alley keypad at 02:15." },
    { title: "HACKED SHIBUYA METRO LEDGER", clue: "Forensic scan: Terminal logs show an offline cold-wallet dongle plugged in by a left-handed courier." },
    { title: "SABOTAGED SYNTH-CORE GENERATOR", clue: "Forensic scan: Thermal camera caught someone wearing a copper-lined raincoat leaving Sector 9." }
  ];
  const crime = crimes[seed % crimes.length];
  const culpritIdx = (seed * 7 + 1) % 3;

  const profiles = [
    { id: "s1", name: "KIRA TANAKA", role: "Midnight Noodle Chef", cleanAlibi: "I was boiling broth behind the counter from 01:00 to 03:00 — 4 customers saw me.", dirtyAlibi: "I never left the kitchen, though my jacket got soaked fixing the back alley vent at 02:15." },
    { id: "s2", name: "VEX-09", role: "Autonomous Courier", cleanAlibi: "My GPS blackbox confirms I was docked at Shinjuku Charging Hub all night.", dirtyAlibi: "My GPS glitched near Sector 9 at 02:15, and I carry spare copper shielding & cold dongles for clients." },
    { id: "s3", name: "MADAME SORA", role: "Data Broker", cleanAlibi: "I was streaming live from Neon Lounge Tower 40 with 12,000 viewers watching.", dirtyAlibi: "I stepped off-camera around 02:15 to park my yellow volt-bike right behind the alley keypad." }
  ];

  const suspects: Suspect[] = profiles.map((p, i) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    isCulprit: i === culpritIdx,
    alibi: i === culpritIdx ? p.dirtyAlibi : p.cleanAlibi,
    witness:
      i === culpritIdx
        ? "Street drone footage caught this suspect glancing directly at the security lens before cutting power."
        : "Alley ramen vendor confirms this suspect's timeline matches the timestamped receipt.",
    detail:
      i === culpritIdx
        ? "Heart-rate monitor spikes to 132 BPM when you mention the forensic evidence!"
        : "Biometric pulse stays steady at 68 BPM. Story checks out against city CCTV."
  }));

  return { caseNo: seed + 1, crimeTitle: crime.title, forensicClue: crime.clue, suspects };
}

export function RamenAlleyGame({ onScore }: { onScore?: (score: number) => void }) {
  const [seed, setSeed] = useState(0);
  const noirCase = useMemo(() => generateNoirCase(seed), [seed]);
  const [activeId, setActiveId] = useState("s1");
  const [ap, setAp] = useState(5);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [log, setLog] = useState<string[]>([
    "RAIN DRUMS ON THE NEON AWNING. INSPECT THE FORENSIC CLUE AND INTERROGATE ALL 3 SUSPECTS."
  ]);
  const [verdict, setVerdict] = useState<{ won: boolean; text: string } | null>(null);

  const active = noirCase.suspects.find((s) => s.id === activeId) || noirCase.suspects[0];

  const ask = (topic: "alibi" | "witness" | "detail") => {
    if (verdict || ap <= 0) return;
    const answer = active[topic];
    const label = topic === "alibi" ? "ASKED ALIBI" : topic === "witness" ? "CHECKED DRONE CCTV" : "BIOMETRIC SCAN";
    setAp((n) => n - 1);
    setLog((prev) => [`[${active.name} · ${label}] "${answer}"`, ...prev].slice(0, 6));
  };

  const accuse = (suspect: Suspect) => {
    if (verdict) return;
    if (suspect.isCulprit) {
      const gained = 700 + ap * 120 + streak * 250;
      const nextScore = score + gained;
      setScore(nextScore);
      setStreak((s) => s + 1);
      onScore?.(nextScore);
      setVerdict({ won: true, text: `CASE SOLVED! ${suspect.name} confessed. +${gained} DETECTIVE SCORE!` });
    } else {
      const culprit = noirCase.suspects.find((s) => s.isCulprit);
      setStreak(0);
      setVerdict({ won: false, text: `WRONG ARREST! ${suspect.name} was innocent — the real culprit was ${culprit?.name}.` });
    }
  };

  const nextCase = () => {
    setSeed((s) => s + 1);
    setAp(5);
    setVerdict(null);
    setActiveId("s1");
    setLog(["NEW PROCEDURAL CASE GENERATED // Inspect forensic evidence and break the culprit's alibi."]);
  };

  return (
    <div style={{ padding: 18, background: "linear-gradient(180deg, #070a12 0%, #0d111a 100%)", minHeight: 430, display: "grid", gap: 14 }}>
      {/* Header */}
      <div className="font-mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
        <div>
          <span style={{ color: "var(--cyan)" }}>CASE #{noirCase.caseNo} // </span>
          <strong style={{ color: "var(--volt)" }}>{noirCase.crimeTitle}</strong>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <span>QUESTIONS LEFT <strong style={{ color: ap <= 1 ? "var(--vermilion)" : "var(--cyan)" }}>{ap}</strong></span>
          <span>STREAK <strong style={{ color: "var(--volt)" }}>x{streak}</strong></span>
          <span>SCORE <strong>{score.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Forensic Clue */}
      <div className="font-mono" style={{ padding: "10px 12px", background: "rgba(0,240,212,0.08)", border: "1px solid rgba(0,240,212,0.35)", fontSize: 12, color: "#ccfff8" }}>
        {noirCase.forensicClue}
      </div>

      {/* 3 Suspects */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {noirCase.suspects.map((s) => (
          <div
            key={s.id}
            onClick={() => setActiveId(s.id)}
            style={{
              padding: 12,
              cursor: "pointer",
              background: activeId === s.id ? "rgba(243,255,0,0.09)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeId === s.id ? "var(--volt)" : "var(--hairline)"}`
            }}
          >
            <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: activeId === s.id ? "var(--volt)" : "#fff" }}>
              {s.name}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 10 }}>{s.role}</div>
            <button
              type="button"
              className="btn-crimson font-mono"
              disabled={Boolean(verdict)}
              style={{ width: "100%", padding: "6px 10px", fontSize: 11 }}
              onClick={(e) => {
                e.stopPropagation();
                accuse(s);
              }}
            >
              ARREST SUSPECT
            </button>
          </div>
        ))}
      </div>

      {/* Interrogation Actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="btn-steel font-mono" style={{ fontSize: 11, padding: "8px 14px" }} disabled={Boolean(verdict) || ap <= 0} onClick={() => ask("alibi")}>
          1. INTERROGATE ALIBI ({active.name})
        </button>
        <button type="button" className="btn-steel font-mono" style={{ fontSize: 11, padding: "8px 14px" }} disabled={Boolean(verdict) || ap <= 0} onClick={() => ask("witness")}>
          2. CHECK DRONE CCTV
        </button>
        <button type="button" className="btn-steel font-mono" style={{ fontSize: 11, padding: "8px 14px" }} disabled={Boolean(verdict) || ap <= 0} onClick={() => ask("detail")}>
          3. BIOMETRIC PULSE SCAN
        </button>
      </div>

      {/* Verdict or Transcript */}
      {verdict ? (
        <div
          className="font-mono"
          style={{
            padding: 14,
            border: `1px solid ${verdict.won ? "var(--volt)" : "var(--vermilion)"}`,
            background: verdict.won ? "rgba(243,255,0,0.1)" : "rgba(255,42,60,0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap"
          }}
        >
          <span style={{ color: verdict.won ? "var(--volt)" : "#ff9aa4", fontSize: 13 }}>{verdict.text}</span>
          <button type="button" className="btn-volt" style={{ padding: "8px 16px", fontSize: 12 }} onClick={nextCase}>
            NEXT PROCEDURAL CASE →
          </button>
        </div>
      ) : (
        <div className="font-mono" style={{ background: "#05070c", border: "1px solid var(--hairline)", padding: 12, display: "grid", gap: 6, fontSize: 12, maxHeight: 130, overflowY: "auto" }}>
          {log.map((entry, idx) => (
            <div key={idx} style={{ color: idx === 0 ? "#fff" : "var(--ink-muted)" }}>
              &gt; {entry}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
