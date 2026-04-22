"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { PlayerSearchResult } from "@/lib/players/types";

const TEAM_MLB_IDS: Record<string, number> = {
  ARI: 109, ATL: 144, BAL: 110, BOS: 111, CHC: 112, CWS: 145,
  CIN: 113, CLE: 114, COL: 115, DET: 116, HOU: 117, KCR: 118,
  LAA: 108, LAD: 119, MIA: 146, MIL: 158, MIN: 142, NYM: 121,
  NYY: 147, OAK: 133, PHI: 143, PIT: 134, SDP: 135, SFG: 137,
  SEA: 136, STL: 138, TBR: 139, TEX: 140, TOR: 141, WSN: 120,
};

const TEAMS = Object.entries(TEAM_MLB_IDS).sort(([a], [b]) => a.localeCompare(b));

export default function PlayerSearch() {
  const [query, setQuery] = useState("");
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string, team: string | null) => {
    if (!q && !team) { setResults([]); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (team) params.set("team", String(TEAM_MLB_IDS[team]));
      const res = await fetch(`/api/players/search?${params}`);
      const data = await res.json();
      setResults(data.players ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    setActiveTeam(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val, null), 320);
  };

  const handleTeam = (abbr: string) => {
    const next = activeTeam === abbr ? null : abbr;
    setActiveTeam(next);
    setQuery("");
    search("", next);
  };

  const isEmpty = results.length === 0 && !loading;
  const showHint = !query && !activeTeam;

  return (
    <div style={{ padding: "32px 48px", maxWidth: "1400px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "22px",
          color: "rgba(255,255,255,.9)", margin: "0 0 4px",
          letterSpacing: "-.02em",
        }}>Players</h1>
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: "10px",
          color: "rgba(255,255,255,.3)", textTransform: "uppercase",
          letterSpacing: ".14em", margin: 0,
        }}>
          Search any active MLB player · Full profile with projections, splits, and charts
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <div style={{
          position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
          display: "grid", placeItems: "center", pointerEvents: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="6" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
            <path d="M13 13 L18 18" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <input
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Search player name…"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "12px 16px 12px 38px",
            background: "rgba(255,255,255,.03)",
            border: "0.5px solid rgba(255,255,255,.12)",
            borderRadius: "10px",
            fontFamily: "var(--font-inter)", fontSize: "14px",
            color: "rgba(255,255,255,.85)", outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(211,47,47,.5)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.12)")}
        />
      </div>

      {/* Team filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "28px" }}>
        {TEAMS.map(([abbr]) => {
          const isActive = activeTeam === abbr;
          return (
            <button
              key={abbr}
              onClick={() => handleTeam(abbr)}
              style={{
                padding: "5px 12px",
                borderRadius: "20px",
                border: isActive ? "0.5px solid rgba(211,47,47,.6)" : "0.5px solid rgba(255,255,255,.1)",
                background: isActive ? "rgba(211,47,47,.12)" : "rgba(255,255,255,.02)",
                color: isActive ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.45)",
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                letterSpacing: ".1em",
                cursor: "pointer",
                transition: ".15s",
              }}
            >
              {abbr}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,.28)",
          textTransform: "uppercase", letterSpacing: ".14em", padding: "40px 0",
          textAlign: "center",
        }}>
          Loading…
        </div>
      )}

      {showHint && !loading && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,.2)",
          textTransform: "uppercase", letterSpacing: ".14em", padding: "60px 0",
          textAlign: "center",
        }}>
          Type a player name or select a team above
        </div>
      )}

      {!loading && !showHint && isEmpty && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255,255,255,.28)",
          textTransform: "uppercase", letterSpacing: ".14em", padding: "40px 0",
          textAlign: "center",
        }}>
          No players found
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "12px",
        }}>
          {results.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player }: { player: PlayerSearchResult }) {
  const [imgError, setImgError] = useState(false);
  return (
    <Link
      href={`/players/${player.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          background: "rgba(255,255,255,.02)",
          border: "0.5px solid rgba(255,255,255,.08)",
          borderRadius: "12px",
          overflow: "hidden",
          cursor: "pointer",
          transition: ".18s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.border = "0.5px solid rgba(211,47,47,.35)";
          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.04)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.border = "0.5px solid rgba(255,255,255,.08)";
          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.02)";
        }}
      >
        {/* Headshot */}
        <div style={{
          height: "140px", background: "rgba(255,255,255,.03)",
          display: "grid", placeItems: "center", overflow: "hidden",
        }}>
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.headshotUrl}
              alt={player.fullName}
              onError={() => setImgError(true)}
              style={{ height: "100%", width: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          ) : (
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.08)" strokeWidth="0.5"/>
              <circle cx="20" cy="16" r="6" fill="rgba(255,255,255,.12)"/>
              <ellipse cx="20" cy="33" rx="11" ry="7" fill="rgba(255,255,255,.08)"/>
            </svg>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "12px 14px" }}>
          <div style={{
            fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "13px",
            color: "rgba(255,255,255,.9)", marginBottom: "4px",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {player.fullName}
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {player.position && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "8.5px",
                color: "rgba(255,255,255,.4)", textTransform: "uppercase",
                letterSpacing: ".1em",
                background: "rgba(255,255,255,.06)", borderRadius: "4px",
                padding: "2px 6px",
              }}>
                {player.position}
              </span>
            )}
            {player.teamAbbr && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "8.5px",
                color: "rgba(255,255,255,.4)", textTransform: "uppercase",
                letterSpacing: ".1em",
              }}>
                {player.teamAbbr}
              </span>
            )}
            {!player.teamAbbr && player.teamName && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "8.5px",
                color: "rgba(255,255,255,.3)", letterSpacing: ".06em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {player.teamName}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
