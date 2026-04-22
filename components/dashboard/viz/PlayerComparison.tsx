"use client";

import type { CardData } from "@/lib/albert/viz-types";
import { getHeadshotUrl, getTeamLogoUrl, getTeamColor } from "@/lib/mlb/team-assets";

/* ── Pitch colors ─────────────────────────────────────────────────────────── */
const PITCH_COLORS: Record<string, string> = {
  FF: "#ff9040", SI: "#ff6b35", FA: "#ff9040", FC: "#ffc840",
  SL: "#5bb8ff", SW: "#5bb8ff", ST: "#5bb8ff",
  CU: "#c084ff", KC: "#c084ff",
  CH: "#a0ff80", FS: "#a0ff80",
  SP: "#ff80c0", KN: "#aaaaff",
};

/* ── Formatters ───────────────────────────────────────────────────────────── */
function fmtAvg(v: number | null): string {
  if (v == null) return "—";
  return v.toFixed(3).replace(/^0/, "");
}
function fmtDec(v: number | null, d = 2): string {
  if (v == null) return "—";
  return v.toFixed(d);
}
function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
function fmtInt(v: number | null): string {
  return v == null ? "—" : String(v);
}

/* ── Stat row definition ──────────────────────────────────────────────────── */
interface StatDef {
  label: string;
  aVal: string;
  bVal: string;
  aRaw: number | null;
  bRaw: number | null;
  higherIsBetter: boolean;
}

function row(
  label: string,
  aRaw: number | null,
  bRaw: number | null,
  fmt: (v: number | null) => string,
  higherIsBetter = true,
): StatDef {
  return { label, aVal: fmt(aRaw), bVal: fmt(bRaw), aRaw, bRaw, higherIsBetter };
}

function buildHittingRows(
  a: CardData["hitting"],
  b: CardData["hitting"],
): StatDef[] {
  const rows: StatDef[] = [];
  if (a?.war != null || b?.war != null)
    rows.push(row("WAR",  a?.war  ?? null, b?.war  ?? null, v => fmtDec(v, 1)));
  rows.push(row("AVG",  a?.avg  ?? null, b?.avg  ?? null, fmtAvg));
  rows.push(row("OBP",  a?.obp  ?? null, b?.obp  ?? null, fmtAvg));
  rows.push(row("SLG",  a?.slg  ?? null, b?.slg  ?? null, fmtAvg));
  rows.push(row("OPS",  a?.ops  ?? null, b?.ops  ?? null, fmtAvg));
  if (a?.wrcPlus != null || b?.wrcPlus != null)
    rows.push(row("wRC+", a?.wrcPlus ?? null, b?.wrcPlus ?? null, fmtInt));
  rows.push(row("HR",   a?.hr   ?? null, b?.hr   ?? null, fmtInt));
  rows.push(row("RBI",  a?.rbi  ?? null, b?.rbi  ?? null, fmtInt));
  rows.push(row("SB",   a?.sb   ?? null, b?.sb   ?? null, fmtInt));
  rows.push(row("ISO",  a?.iso  ?? null, b?.iso  ?? null, fmtAvg));
  if (a?.babip != null || b?.babip != null)
    rows.push(row("BABIP", a?.babip ?? null, b?.babip ?? null, fmtAvg));
  rows.push(row("K%",   a?.kRate   ?? null, b?.kRate   ?? null, fmtPct, false));
  rows.push(row("BB%",  a?.bbRate  ?? null, b?.bbRate  ?? null, fmtPct));
  if (a?.kMinusBB != null || b?.kMinusBB != null)
    rows.push(row("K-BB%", a?.kMinusBB ?? null, b?.kMinusBB ?? null, fmtPct, false));
  if (a?.hardHitRate != null || b?.hardHitRate != null)
    rows.push(row("HH%", a?.hardHitRate ?? null, b?.hardHitRate ?? null, fmtPct));
  if (a?.avgExitVelo != null || b?.avgExitVelo != null)
    rows.push(row("EV", a?.avgExitVelo ?? null, b?.avgExitVelo ?? null,
      v => v ? `${v.toFixed(1)}` : "—"));
  if (a?.barrelRate != null || b?.barrelRate != null)
    rows.push(row("Brl%", a?.barrelRate ?? null, b?.barrelRate ?? null, fmtPct));
  return rows;
}

function buildPitchingRows(
  a: CardData["pitching"],
  b: CardData["pitching"],
): StatDef[] {
  const rows: StatDef[] = [];
  if (a?.war != null || b?.war != null)
    rows.push(row("WAR",  a?.war  ?? null, b?.war  ?? null, v => fmtDec(v, 1)));
  rows.push(row("ERA",  a?.era  ?? null, b?.era  ?? null, v => fmtDec(v), false));
  if (a?.fip != null || b?.fip != null)
    rows.push(row("FIP", a?.fip ?? null, b?.fip ?? null, v => fmtDec(v), false));
  rows.push(row("WHIP", a?.whip ?? null, b?.whip ?? null, v => fmtDec(v), false));
  rows.push(row("IP",   a?.ip   ?? null, b?.ip   ?? null, v => fmtDec(v, 1)));
  if (a?.kRate != null || b?.kRate != null)
    rows.push(row("K%",  a?.kRate  ?? null, b?.kRate  ?? null, fmtPct));
  if (a?.bbRate != null || b?.bbRate != null)
    rows.push(row("BB%", a?.bbRate ?? null, b?.bbRate ?? null, fmtPct, false));
  if (a?.kMinusBB != null || b?.kMinusBB != null)
    rows.push(row("K-BB%", a?.kMinusBB ?? null, b?.kMinusBB ?? null, fmtPct));
  if (a?.kPer9 != null || b?.kPer9 != null)
    rows.push(row("K/9",  a?.kPer9  ?? null, b?.kPer9  ?? null, v => fmtDec(v, 1)));
  if (a?.bbPer9 != null || b?.bbPer9 != null)
    rows.push(row("BB/9", a?.bbPer9 ?? null, b?.bbPer9 ?? null, v => fmtDec(v, 1), false));
  if (a?.babip != null || b?.babip != null)
    rows.push(row("BABIP", a?.babip ?? null, b?.babip ?? null, v => fmtAvg(v)));
  return rows;
}

/* ── Comparison stat row ──────────────────────────────────────────────────── */
function StatRow({ def }: { def: StatDef }) {
  const both = def.aRaw != null && def.bRaw != null;
  const aWins = both && (def.higherIsBetter ? def.aRaw! > def.bRaw! : def.aRaw! < def.bRaw!);
  const bWins = both && (def.higherIsBetter ? def.bRaw! > def.aRaw! : def.bRaw! < def.aRaw!);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 88px 1fr",
      alignItems: "center",
      padding: "1px 0",
    }}>
      {/* Left value */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "16px" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "15px",
          fontWeight: "700",
          letterSpacing: "-.01em",
          color: aWins
            ? "rgba(255,200,70,.95)"
            : bWins
              ? "rgba(255,255,255,.28)"
              : "rgba(255,255,255,.72)",
          background: aWins ? "rgba(255,200,70,.08)" : "transparent",
          borderRadius: "6px",
          padding: aWins ? "5px 10px" : "5px 0",
          transition: "all .15s",
        }}>
          {def.aVal}
        </span>
      </div>

      {/* Center label */}
      <div style={{ textAlign: "center" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "7px",
          color: "rgba(255,255,255,.18)",
          textTransform: "uppercase",
          letterSpacing: ".18em",
        }}>
          {def.label}
        </span>
      </div>

      {/* Right value */}
      <div style={{ display: "flex", justifyContent: "flex-start", paddingLeft: "16px" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "15px",
          fontWeight: "700",
          letterSpacing: "-.01em",
          color: bWins
            ? "rgba(255,200,70,.95)"
            : aWins
              ? "rgba(255,255,255,.28)"
              : "rgba(255,255,255,.72)",
          background: bWins ? "rgba(255,200,70,.08)" : "transparent",
          borderRadius: "6px",
          padding: bWins ? "5px 10px" : "5px 0",
          transition: "all .15s",
        }}>
          {def.bVal}
        </span>
      </div>
    </div>
  );
}

/* ── Section label ────────────────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "20px 32px 6px",
    }}>
      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,.06)" }} />
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "7px",
        color: "rgba(255,255,255,.2)", textTransform: "uppercase",
        letterSpacing: ".2em", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,.06)" }} />
    </div>
  );
}

/* ── Arsenal pitch row ────────────────────────────────────────────────────── */
function ArsenalRow({
  pitchType,
  a,
  b,
}: {
  pitchType: string;
  a: CardData["pitchArsenal"][0] | undefined;
  b: CardData["pitchArsenal"][0] | undefined;
}) {
  const color = PITCH_COLORS[pitchType] ?? "#aaaaaa";

  function PitchCell({ p, align }: { p: CardData["pitchArsenal"][0] | undefined; align: "left" | "right" }) {
    if (!p) {
      return (
        <div style={{
          flex: 1, padding: "8px 16px", textAlign: align,
          fontFamily: "var(--font-mono)", fontSize: "8px",
          color: "rgba(255,255,255,.15)",
        }}>—</div>
      );
    }
    const content = (
      <div style={{
        display: "inline-flex", flexDirection: "column",
        gap: "1px", alignItems: align === "right" ? "flex-end" : "flex-start",
      }}>
        <div style={{ display: "flex", gap: "7px", alignItems: "baseline" }}>
          {p.velocity != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: "700", color }}>
              {p.velocity.toFixed(1)} mph
            </span>
          )}
          {p.usage != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "8.5px", color: "rgba(255,255,255,.35)" }}>
              {(p.usage * 100).toFixed(0)}% usage
            </span>
          )}
        </div>
        {p.whiff != null && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color, opacity: 0.65 }}>
            {(p.whiff * 100).toFixed(0)}% whiff
          </span>
        )}
      </div>
    );
    return (
      <div style={{ flex: 1, padding: "8px 16px", textAlign: align }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center",
      borderTop: "0.5px solid rgba(255,255,255,.04)",
    }}>
      <PitchCell p={a} align="right" />
      {/* Pitch type badge */}
      <div style={{
        width: "64px", flexShrink: 0, textAlign: "center",
        padding: "4px 0",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: "700",
          color, background: `${color}14`,
          border: `0.5px solid ${color}30`,
          borderRadius: "5px", padding: "3px 8px",
          letterSpacing: ".06em",
        }}>
          {pitchType}
        </span>
      </div>
      <PitchCell p={b} align="left" />
    </div>
  );
}

/* ── Identity header ──────────────────────────────────────────────────────── */
function Identity({
  data,
  side,
  onDismiss,
}: {
  data: CardData;
  side: "left" | "right";
  onDismiss: () => void;
}) {
  const teamColor   = getTeamColor(data.teamAbbr);
  const headshotUrl = getHeadshotUrl(data.playerId, 240);
  const logoUrl     = getTeamLogoUrl(data.teamAbbr);
  const isLeft      = side === "left";

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: isLeft ? "row" : "row-reverse",
      alignItems: "center",
      gap: "16px",
      padding: "22px 24px 18px",
      position: "relative",
      background: `linear-gradient(${isLeft ? "90deg" : "270deg"}, ${teamColor}0a, transparent)`,
    }}>
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: "10px",
          [isLeft ? "left" : "right"]: "10px",
          width: "20px", height: "20px",
          borderRadius: "999px",
          border: "0.5px solid rgba(255,255,255,.1)",
          background: "rgba(255,255,255,.04)",
          color: "rgba(255,255,255,.3)",
          cursor: "pointer",
          display: "grid", placeItems: "center",
          fontSize: "11px", padding: 0,
        }}
        aria-label="Remove player"
      >
        ×
      </button>

      {/* Headshot */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "999px",
          overflow: "hidden", background: "rgba(255,255,255,.06)",
          border: `1.5px solid ${teamColor}55`,
          boxShadow: `0 0 20px ${teamColor}22`,
        }}>
          <img
            src={headshotUrl} alt={data.playerName ?? ""}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }}
          />
        </div>
        {logoUrl && (
          <div style={{
            position: "absolute", bottom: "-2px",
            [isLeft ? "right" : "left"]: "-2px",
            width: "26px", height: "26px",
            borderRadius: "999px", background: "rgba(8,8,16,.95)",
            border: "1.5px solid rgba(255,255,255,.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src={logoUrl} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
          </div>
        )}
      </div>

      {/* Name + bio */}
      <div style={{ flex: 1, minWidth: 0, textAlign: isLeft ? "left" : "right" }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: "800",
          color: "rgba(255,255,255,.94)", letterSpacing: "-.02em",
          lineHeight: 1.1, marginBottom: "6px", textTransform: "uppercase",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {data.playerName}
        </div>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "5px",
          justifyContent: isLeft ? "flex-start" : "flex-end",
          marginBottom: "4px",
        }}>
          {data.position && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "8px",
              color: "rgba(255,255,255,.7)",
              background: `${teamColor}28`, border: `0.5px solid ${teamColor}50`,
              borderRadius: "4px", padding: "2px 7px",
              textTransform: "uppercase", letterSpacing: ".12em",
            }}>{data.position}</span>
          )}
          {data.teamAbbr && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "8px",
              color: "rgba(255,255,255,.38)", textTransform: "uppercase", letterSpacing: ".1em",
            }}>{data.teamAbbr}</span>
          )}
          {data.jerseyNumber && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "8px", color: "rgba(255,255,255,.22)",
            }}>{data.jerseyNumber}</span>
          )}
        </div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "7.5px",
          color: "rgba(255,255,255,.22)", letterSpacing: ".06em",
          display: "flex", flexWrap: "wrap", gap: "7px",
          justifyContent: isLeft ? "flex-start" : "flex-end",
        }}>
          {data.age   != null && <span>{data.age} yrs</span>}
          {data.height        && <span>{data.height}</span>}
          {data.weight != null && <span>{data.weight} lb</span>}
          {(data.bats || data.throws) && <span>B:{data.bats ?? "?"} · T:{data.throws ?? "?"}</span>}
        </div>
      </div>

      {/* Large logo accent */}
      {logoUrl && (
        <div style={{
          flexShrink: 0, width: "48px", height: "48px",
          display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.2,
        }}>
          <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}

/* ── PlayerComparison ─────────────────────────────────────────────────────── */
export default function PlayerComparison({
  a,
  b,
  onDismiss,
}: {
  a: CardData;
  b: CardData;
  onDismiss: (playerId: number) => void;
}) {
  const colorA = getTeamColor(a.teamAbbr);
  const colorB = getTeamColor(b.teamAbbr);

  const hittingRows  = buildHittingRows(a.hitting, b.hitting);
  const pitchingRows = buildPitchingRows(a.pitching, b.pitching);

  // Merge arsenal pitch types (union, ordered by combined usage)
  const allTypes = Array.from(
    new Set([
      ...a.pitchArsenal.map(p => p.type),
      ...b.pitchArsenal.map(p => p.type),
    ])
  );
  const aArsenal = Object.fromEntries(a.pitchArsenal.map(p => [p.type, p]));
  const bArsenal = Object.fromEntries(b.pitchArsenal.map(p => [p.type, p]));

  const showArsenal = allTypes.length > 0;
  const showHitting  = hittingRows.length > 0;
  const showPitching = pitchingRows.length > 0;

  return (
    <div style={{
      flex: 1,
      height: "820px",
      overflowY: "auto",
      overflowX: "hidden",
      scrollbarWidth: "none",
      background: "linear-gradient(180deg, rgba(14,14,22,.98) 0%, rgba(9,9,16,.99) 100%)",
    }}>
      {/* ── Identity headers ── */}
      <div style={{
        display: "flex",
        borderBottom: "0.5px solid rgba(255,255,255,.07)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(10,10,18,.97)",
        backdropFilter: "blur(8px)",
      }}>
        <Identity data={a} side="left"  onDismiss={() => onDismiss(a.playerId)} />

        {/* VS divider */}
        <div style={{
          width: "1px",
          background: "rgba(255,255,255,.07)",
          flexShrink: 0,
          position: "relative",
        }}>
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            color: "rgba(255,255,255,.18)",
            textTransform: "uppercase",
            letterSpacing: ".2em",
            background: "rgba(10,10,18,.97)",
            padding: "4px 0",
            whiteSpace: "nowrap",
            writingMode: "vertical-rl",
          }}>vs</div>
        </div>

        <Identity data={b} side="right" onDismiss={() => onDismiss(b.playerId)} />
      </div>

      {/* ── Team accent bars ── */}
      <div style={{ display: "flex", height: "3px" }}>
        <div style={{ flex: 1, background: `linear-gradient(90deg, ${colorA}, transparent)` }} />
        <div style={{ flex: 1, background: `linear-gradient(270deg, ${colorB}, transparent)` }} />
      </div>

      {/* ── Hitting stats ── */}
      {showHitting && (
        <>
          <SectionLabel label={`${a.season ?? b.season} · Hitting`} />
          <div style={{ padding: "4px 24px 8px" }}>
            {hittingRows.map(def => <StatRow key={def.label} def={def} />)}
          </div>
        </>
      )}

      {/* ── Pitching stats ── */}
      {showPitching && (
        <>
          <SectionLabel label={`${a.season ?? b.season} · Pitching`} />
          <div style={{ padding: "4px 24px 8px" }}>
            {pitchingRows.map(def => <StatRow key={def.label} def={def} />)}
          </div>
        </>
      )}

      {/* ── Arsenal ── */}
      {showArsenal && (
        <>
          <SectionLabel label="Pitch Arsenal" />
          <div style={{ padding: "0 0 24px" }}>
            {/* Column headers */}
            <div style={{ display: "flex", alignItems: "center", padding: "4px 0 8px" }}>
              <div style={{
                flex: 1, textAlign: "right", paddingRight: "16px",
                fontFamily: "var(--font-mono)", fontSize: "7px",
                color: "rgba(255,255,255,.15)", textTransform: "uppercase", letterSpacing: ".15em",
              }}>
                {a.playerName?.split(" ").pop()}
              </div>
              <div style={{ width: "64px" }} />
              <div style={{
                flex: 1, textAlign: "left", paddingLeft: "16px",
                fontFamily: "var(--font-mono)", fontSize: "7px",
                color: "rgba(255,255,255,.15)", textTransform: "uppercase", letterSpacing: ".15em",
              }}>
                {b.playerName?.split(" ").pop()}
              </div>
            </div>
            {allTypes.map(type => (
              <ArsenalRow
                key={type}
                pitchType={type}
                a={aArsenal[type]}
                b={bArsenal[type]}
              />
            ))}
          </div>
        </>
      )}

      {/* No data */}
      {!showHitting && !showPitching && !showArsenal && (
        <div style={{
          padding: "40px 32px",
          fontFamily: "var(--font-mono)", fontSize: "10px",
          color: "rgba(255,255,255,.2)", textTransform: "uppercase",
          letterSpacing: ".12em", textAlign: "center",
        }}>
          No comparison data available
        </div>
      )}
    </div>
  );
}
