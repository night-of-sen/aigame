"use client";

import React, { useState } from "react";
import type { GameRecord, SynthPlayStore } from "@synthplay/db";
import { DICTIONARY, SUPPORTED_LOCALES } from "@synthplay/i18n";

interface AdminData extends SynthPlayStore {
  countryPower: Array<{ countryCode: string; totalPlays: number; gameCount: number; avgRating: number }>;
}

export function AdminConsole({ initial }: { initial: AdminData }) {
  const [data, setData] = useState<AdminData>(initial);
  const [tab, setTab] = useState<"overview" | "games" | "users" | "sponsors" | "finance" | "i18n">("overview");
  const [userSearch, setUserSearch] = useState("");
  const [inspectGame, setInspectGame] = useState<GameRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const runAction = async (payload: Record<string, unknown>, message: string) => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const updated = await res.json();
      setData((prev) => ({ ...prev, ...updated.store }));
      setToast(message);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const pendingGames = data.games.filter((g) => g.status === "pending_review");
  const totalPlays = data.games.reduce((a, g) => a + g.totalValidPlays, 0);
  const totalRevenue = data.sponsorOrders.reduce((a, o) => a + (o.status === "paid" ? o.amountUsd : 0), 0);

  const filteredUsers = data.users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.countryCode.toLowerCase().includes(q)
    );
  });

  const exportCsv = () => {
    const header = "OrderID,Payer,Country,Provider,Tier,AmountUSD,Status,CreatedAt";
    const rows = data.sponsorOrders.map(
      (o) => `${o.id},"${o.payerName}",${o.payerCountry},${o.provider},${o.tier},${o.amountUsd},${o.status},${o.createdAt}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synthplay-finance-ledger.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ops-shell">
      {/* Left Sidebar */}
      <aside className="ops-sidebar">
        <div style={{ padding: "4px 8px 18px", borderBottom: "1px solid var(--line)", marginBottom: 10 }}>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--volt)" }}>
            SYNTHPLAY OPS
          </div>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
            ADMIN.SYNTHPLAY.GAMES // RBAC
          </div>
        </div>

        <button className={`ops-nav-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
          <span>01. OVERVIEW &amp; AUDIT</span>
        </button>
        <button className={`ops-nav-btn ${tab === "games" ? "active" : ""}`} onClick={() => setTab("games")}>
          <span>02. GAME SANDBOX QUEUE</span>
          {pendingGames.length > 0 && (
            <span style={{ padding: "1px 6px", background: "var(--red)", color: "#fff", fontSize: 10 }}>
              {pendingGames.length}
            </span>
          )}
        </button>
        <button className={`ops-nav-btn ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
          <span>03. USER GOVERNANCE</span>
          <span>{data.users.length}</span>
        </button>
        <button className={`ops-nav-btn ${tab === "sponsors" ? "active" : ""}`} onClick={() => setTab("sponsors")}>
          <span>04. SPONSOR SLOTS CMS</span>
          <span>{data.sponsorSlots.length}</span>
        </button>
        <button className={`ops-nav-btn ${tab === "finance" ? "active" : ""}`} onClick={() => setTab("finance")}>
          <span>05. FINANCE &amp; PAYOUTS</span>
        </button>
        <button className={`ops-nav-btn ${tab === "i18n" ? "active" : ""}`} onClick={() => setTab("i18n")}>
          <span>06. I18N LANGUAGES</span>
          <span>4</span>
        </button>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="ops-btn"
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            OPEN STOREFRONT :3000 ↗
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ops-main">
        {toast && (
          <div className="font-mono" style={{ marginBottom: 16, padding: "10px 14px", border: "1px solid var(--cyan)", background: "rgba(0,240,212,0.1)", color: "var(--cyan)", fontSize: 12 }}>
            {toast}
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "grid", gap: 22 }}>
            <h1 className="font-display" style={{ margin: 0, fontSize: 24 }}>PLATFORM TELEMETRY &amp; AUDIT LOG</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
              {[
                { label: "VERIFIED PLAYS", value: totalPlays.toLocaleString(), color: "var(--volt)" },
                { label: "PENDING MODERATION", value: String(pendingGames.length), color: pendingGames.length > 0 ? "var(--red)" : "var(--cyan)" },
                { label: "REGISTERED USERS", value: String(data.users.length), color: "#fff" },
                { label: "SPONSOR REVENUE (MTD)", value: `$${totalRevenue} USD`, color: "var(--cyan)" }
              ].map((kpi) => (
                <div key={kpi.label} className="ops-card">
                  <div className="font-mono" style={{ fontSize: 10, color: "var(--muted)" }}>{kpi.label}</div>
                  <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: kpi.color, marginTop: 8 }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            <div className="ops-card">
              <div className="font-display" style={{ fontSize: 15, marginBottom: 12 }}>IMMUTABLE AUDIT LOG</div>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>ACTOR</th>
                    <th>ACTION</th>
                    <th>TARGET</th>
                    <th>DETAIL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditLogs.slice(0, 12).map((log) => (
                    <tr key={log.id}>
                      <td className="font-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{log.createdAt.slice(0, 19).replace("T", " ")}</td>
                      <td className="font-mono" style={{ fontSize: 12 }}>{log.actor}</td>
                      <td className="font-mono" style={{ fontSize: 11, color: "var(--volt)" }}>{log.action}</td>
                      <td className="font-mono" style={{ fontSize: 12 }}>{log.target}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{log.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: GAME REVIEW & SANDBOX QUEUE */}
        {tab === "games" && (
          <div style={{ display: "grid", gap: 18 }}>
            <h1 className="font-display" style={{ margin: 0, fontSize: 24 }}>GAME MODERATION &amp; SANDBOX REVIEW</h1>
            <div className="ops-card" style={{ padding: 0 }}>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>TITLE / CREATOR</th>
                    <th>COUNTRY / TYPE</th>
                    <th>SECURITY SCORE</th>
                    <th>STATUS</th>
                    <th>PLAYS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.games.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <div className="font-display" style={{ fontWeight: 700 }}>{g.title}</div>
                        <div className="font-mono" style={{ fontSize: 11, color: "var(--muted)" }}>by {g.creatorName} · {g.aiTools.join(", ")}</div>
                      </td>
                      <td className="font-mono" style={{ fontSize: 12 }}>[{g.creatorCountryCode}] {g.playType}</td>
                      <td className="font-mono" style={{ fontSize: 12, color: g.securityScore >= 90 ? "var(--cyan)" : "var(--amber)" }}>
                        {g.securityScore}/100 ({g.securityVerdict})
                      </td>
                      <td className="font-mono" style={{ fontSize: 11 }}>
                        <span style={{
                          padding: "3px 7px",
                          background: g.status === "published" ? "rgba(0,240,212,0.14)" : g.status === "pending_review" ? "rgba(255,159,28,0.2)" : "rgba(255,42,60,0.2)",
                          color: g.status === "published" ? "var(--cyan)" : g.status === "pending_review" ? "var(--amber)" : "#ff8b94"
                        }}>
                          {g.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="font-mono">{g.totalValidPlays.toLocaleString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {g.sandboxHtml && (
                            <button className="ops-btn ops-btn-cyan" onClick={() => setInspectGame(g)}>SANDBOX TEST</button>
                          )}
                          <button
                            className="ops-btn ops-btn-volt"
                            onClick={() => runAction({ action: "MODERATE_GAME", gameId: g.id, status: "published" }, `Approved ${g.title} to Storefront!`)}
                          >
                            APPROVE
                          </button>
                          <button
                            className="ops-btn ops-btn-red"
                            onClick={() => runAction({ action: "MODERATE_GAME", gameId: g.id, status: "suspended" }, `Suspended ${g.title}.`)}
                          >
                            SUSPEND
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inspectGame && (
              <div className="ops-card" style={{ borderColor: "var(--cyan)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span className="font-mono" style={{ color: "var(--cyan)", fontSize: 12 }}>
                    ISOLATED SANDBOX INSPECTOR: {inspectGame.title} (sandbox=&quot;allow-scripts&quot;)
                  </span>
                  <button className="ops-btn" onClick={() => setInspectGame(null)}>CLOSE</button>
                </div>
                <iframe
                  title={inspectGame.title}
                  sandbox="allow-scripts"
                  srcDoc={inspectGame.sandboxHtml}
                  style={{ width: "100%", height: 340, border: "1px solid var(--line-strong)", background: "#000" }}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USER GOVERNANCE */}
        {tab === "users" && (
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <h1 className="font-display" style={{ margin: 0, fontSize: 24 }}>USER &amp; CREATOR GOVERNANCE</h1>
              <input
                className="ops-input"
                style={{ maxWidth: 280 }}
                placeholder="Search handle, email, country..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="ops-card" style={{ padding: 0 }}>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>USER</th>
                    <th>ROLE / COUNTRY</th>
                    <th>BADGES</th>
                    <th>STATUS</th>
                    <th>CONTROLS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>@{u.username}</div>
                        <div className="font-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{u.email}</div>
                      </td>
                      <td className="font-mono" style={{ fontSize: 12 }}>{u.role.toUpperCase()} · [{u.countryCode}]</td>
                      <td className="font-mono" style={{ fontSize: 11 }}>
                        {u.isVerifiedCreator && <span style={{ marginRight: 6, color: "var(--cyan)" }}>VERIFIED</span>}
                        {u.isProSupporter && <span style={{ color: "var(--volt)" }}>PRO</span>}
                      </td>
                      <td className="font-mono" style={{ fontSize: 11, color: u.status === "active" ? "var(--cyan)" : "var(--red)" }}>
                        {u.status.toUpperCase()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="ops-btn ops-btn-cyan"
                            onClick={() => runAction({ action: "UPDATE_USER", userId: u.id, isVerifiedCreator: !u.isVerifiedCreator }, `Toggled verified creator for @${u.username}`)}
                          >
                            {u.isVerifiedCreator ? "UNVERIFY" : "VERIFY CREATOR"}
                          </button>
                          <button
                            className="ops-btn"
                            onClick={() => runAction({ action: "UPDATE_USER", userId: u.id, isProSupporter: !u.isProSupporter }, `Toggled Pro Supporter for @${u.username}`)}
                          >
                            {u.isProSupporter ? "REVOKE PRO" : "GRANT PRO"}
                          </button>
                          <button
                            className="ops-btn ops-btn-red"
                            onClick={() => runAction({ action: "UPDATE_USER", userId: u.id, status: u.status === "banned" ? "active" : "banned" }, `Updated account status for @${u.username}`)}
                          >
                            {u.status === "banned" ? "UNBAN" : "BAN"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SPONSOR SLOTS CMS */}
        {tab === "sponsors" && (
          <div style={{ display: "grid", gap: 18 }}>
            <h1 className="font-display" style={{ margin: 0, fontSize: 24 }}>5-SLOT SPONSOR SHOWCASE CMS</h1>
            <div className="ops-card" style={{ padding: 0 }}>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>PLACEMENT</th>
                    <th>BRAND / PATRON</th>
                    <th>PAYMENT RAIL</th>
                    <th>VALUE</th>
                    <th>CLICKS</th>
                    <th>STATE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sponsorSlots.map((sp) => (
                    <tr key={sp.id}>
                      <td className="font-mono" style={{ fontSize: 11, color: "var(--volt)" }}>{sp.placement}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{sp.brandName}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{sp.tagline}</div>
                      </td>
                      <td className="font-mono" style={{ fontSize: 11 }}>{sp.provider.toUpperCase()}</td>
                      <td className="font-mono" style={{ fontSize: 12 }}>${sp.monthlyUsd}</td>
                      <td className="font-mono">{sp.clickCount}</td>
                      <td>
                        <button
                          className={`ops-btn ${sp.isActive ? "ops-btn-cyan" : "ops-btn-red"}`}
                          onClick={() => runAction({ action: "TOGGLE_SPONSOR_SLOT", slotId: sp.id }, `Toggled showcase slot ${sp.brandName}`)}
                        >
                          {sp.isActive ? "LIVE (CLICK PAUSE)" : "PAUSED (CLICK ENABLE)"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: FINANCE & PAYOUTS */}
        {tab === "finance" && (
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h1 className="font-display" style={{ margin: 0, fontSize: 24 }}>FINANCE LEDGER (PAYPAL / PAYONEER / CREEM / KO-FI / PATREON)</h1>
              <button className="ops-btn ops-btn-volt" onClick={exportCsv}>EXPORT CSV FOR SETTLEMENT</button>
            </div>
            <div className="ops-card" style={{ padding: 0 }}>
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>ORDER ID</th>
                    <th>PAYER</th>
                    <th>RAIL</th>
                    <th>TIER</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sponsorOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono" style={{ fontSize: 11 }}>{o.id}</td>
                      <td>{o.payerName} [{o.payerCountry}]</td>
                      <td className="font-mono" style={{ fontSize: 11, color: "var(--cyan)" }}>{o.provider.toUpperCase()}</td>
                      <td className="font-mono" style={{ fontSize: 11 }}>{o.tier}</td>
                      <td className="font-mono" style={{ fontWeight: 700, color: "var(--volt)" }}>${o.amountUsd} USD</td>
                      <td className="font-mono" style={{ fontSize: 11 }}>{o.status.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: I18N COVERAGE */}
        {tab === "i18n" && (
          <div style={{ display: "grid", gap: 18 }}>
            <h1 className="font-display" style={{ margin: 0, fontSize: 24 }}>MULTI-LANGUAGE COVERAGE (PHASE 1: 4 LOCALES)</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {SUPPORTED_LOCALES.map((loc) => {
                const count = Object.keys(DICTIONARY[loc.code]).length;
                return (
                  <div key={loc.code} className="ops-card">
                    <div className="font-mono" style={{ fontSize: 11, color: "var(--volt)" }}>{loc.code}</div>
                    <div className="font-display" style={{ fontSize: 20, margin: "6px 0" }}>{loc.native}</div>
                    <div className="font-mono" style={{ fontSize: 12, color: "var(--cyan)" }}>{count} / {count} KEYS (100%)</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
