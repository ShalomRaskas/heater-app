"use client";

import type { CardData } from "@/lib/albert/viz-types";
import { getHeadshotUrl, getTeamLogoUrl, getTeamColor } from "@/lib/mlb/team-assets";

/* ── Pitch colors ──────────────────────────────────────────────────────────── */
const PITCH_COLORS: Record<string, string> = {
  FF: "#ff9040", SI: "#ff6b35", FA: "#ff9040", FC: "#ffc840",
  SL: "#5bb8ff", SW: "#5bb8ff", ST: "#5bb8ff",
  CU: "#c084ff", KC: "#c084ff",
  CH: "#a0ff80", FS: "#a0ff80",
  SP: "#ff80c0", KN: "#aaaaff",
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtAvg(v: number | null): string {
  if (v == null) return "—";
  return v.toFixed(3).replace(/^0/, "");
}
function fmtDec(v: number | null, d = 2): string {
  if (v == null) return "—";
  return v.toFixed(d);
}
function fmtPct(v: number | null, decimals = 1): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}
function fmtEV(v: number | null): string {
  if (v == null) return "—";
  return v.toFixed(1);
}

/* ── Stat cell ───────────────────────────────────────────────────────────── */
function Cell({
  label, value, accent, dim, vSz, lSz,
}: {
  label: string; value: string;
  accent?: boolean; dim?: boolean;
  vSz: string; lSz: string;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "6px 3px 5px", borderRadius: "7px",
      background: accent ? "rgba(255,200,70,.07)" : "rgba(255,255,255,.03)",
      border: accent ? "0.5px solid rgba(255,200,70,.2)" : "0.5px solid rgba(255,255,255,.06)",
      flex: "1 1 0", minWidth: 0, overflow: "hidden",
    }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: lSz,
        color: "rgba(255,255,255,.25)", textTransform: "uppercase",
        letterSpacing: ".06em", marginBottom: "2px",
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: vSz, fontWeight: "700",
        color: accent ? "rgba(255,200,70,.95)" : dim ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.9)",
        letterSpacing: "-.01em", lineHeight: 1,
        whiteSpace: "nowrap",
      }}>
        {value}
      </span>
    </div>
  );
}

/* ── Section divider ─────────────────────────────────────────────────────── */
function Divider({ label, px }: { label: string; px: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: `10px ${px} 0` }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: "7px",
        color: "rgba(255,255,255,.18)", textTransform: "uppercase",
        letterSpacing: ".2em", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,.06)" }} />
    </div>
  );
}

/* ── Stat row ────────────────────────────────────────────────────────────── */
function StatRow({
  cells, px, vSz, lSz,
}: {
  cells: Array<{ label: string; value: string; accent?: boolean; dim?: boolean }>;
  px: string; vSz: string; lSz: string;
}) {
  return (
    <div style={{ display: "flex", gap: "4px", padding: `5px ${px} 0` }}>
      {cells.map((c) => (
        <Cell key={c.label} {...c} vSz={vSz} lSz={lSz} />
      ))}
    </div>
  );
}

/* ── PlayerCard ──────────────────────────────────────────────────────────── */
export type CardSize = "inline" | "panel" | "compare";

export default function PlayerCard({
  data, caption, size = "inline",
}: {
  data: CardData; caption: string; size?: CardSize;
}) {
  const isCompare = size === "compare";
  const isInline  = size === "inline";

  const px        = isCompare ? "20px" : "22px";
  const hsSize    = isCompare ? 116 : 84;
  const nameSz    = isCompare ? "24px" : "19px";
  const badgeSz   = isCompare ? "9px"  : "8px";
  const bioSz     = isCompare ? "8px"  : "7.5px";
  const vSz       = isCompare ? "19px" : "12px";
  const lSz       = isCompare ? "7.5px" : "5.5px";

  const headshotUrl = getHeadshotUrl(data.playerId, 240);
  const logoUrl     = getTeamLogoUrl(data.teamAbbr);
  const teamColor   = getTeamColor(data.teamAbbr);

  const h = data.hitting;
  const p = data.pitching;
  const isPitcher = !!(p || data.pitchArsenal.length > 0);

  return (
    <div style={{
      animation: "cardEntry 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      borderRadius: "14px", overflow: "hidden",
      background: "linear-gradient(155deg, rgba(18,18,30,.97) 0%, rgba(10,10,18,.99) 100%)",
      border: "0.5px solid rgba(255,255,255,.09)",
      boxShadow: [
        "0 0 0 1px rgba(255,255,255,.04)",
        "0 24px 60px rgba(0,0,0,.65)",
        `0 0 80px ${teamColor}14`,
      ].join(", "),
      marginTop:    isInline ? "12px" : 0,
      marginBottom: isInline ? "4px"  : 0,
      paddingBottom: "18px",
    }}>

      {/* Team accent bar */}
      <div style={{
        height: "5px",
        background: `linear-gradient(90deg, ${teamColor}, ${teamColor}88, transparent)`,
      }} />

      {/* ── Identity ── */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        padding: isCompare ? "20px 20px 16px" : "18px 22px 14px",
        gap: isCompare ? "20px" : "18px",
      }}>
        {/* Headshot */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: `${hsSize}px`, height: `${hsSize}px`, borderRadius: "999px",
            overflow: "hidden", background: "rgba(255,255,255,.06)",
            border: `1.5px solid ${teamColor}55`,
            boxShadow: `0 0 24px ${teamColor}22`,
          }}>
            <img
              src={headshotUrl} alt={data.playerName}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }}
            />
          </div>
          {logoUrl && (
            <div style={{
              position: "absolute", bottom: "-3px", right: "-3px",
              width: isCompare ? "34px" : "28px", height: isCompare ? "34px" : "28px",
              borderRadius: "999px", background: "rgba(8,8,16,.95)",
              border: "1.5px solid rgba(255,255,255,.1)",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}>
              <img src={logoUrl} alt="" style={{ width: isCompare ? "26px" : "20px", height: isCompare ? "26px" : "20px", objectFit: "contain" }} />
            </div>
          )}
        </div>

        {/* Name + bio */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: nameSz, fontWeight: "800",
            color: "rgba(255,255,255,.94)", letterSpacing: "-.02em",
            lineHeight: 1.1, marginBottom: "8px", textTransform: "uppercase",
          }}>
            {data.playerName}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
            {data.position && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: badgeSz,
                color: "rgba(255,255,255,.72)",
                background: `${teamColor}28`, border: `0.5px solid ${teamColor}50`,
                borderRadius: "4px", padding: "2px 7px",
                textTransform: "uppercase", letterSpacing: ".12em",
              }}>{data.position}</span>
            )}
            {data.teamAbbr && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: badgeSz, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".1em" }}>
                {data.teamAbbr}
              </span>
            )}
            {data.jerseyNumber && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: badgeSz, color: "rgba(255,255,255,.28)" }}>
                {data.jerseyNumber}
              </span>
            )}
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: bioSz,
            color: "rgba(255,255,255,.25)", letterSpacing: ".06em",
            display: "flex", flexWrap: "wrap", gap: "8px",
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
            flexShrink: 0,
            width: isCompare ? "58px" : "46px", height: isCompare ? "58px" : "46px",
            display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.28,
          }}>
            <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        )}
      </div>

      {/* ══ PITCHER STATS ══════════════════════════════════════════════════════ */}
      {isPitcher && p && (
        <>
          <Divider label={`${data.season} · Pitching`} px={px} />
          <StatRow px={px} vSz={vSz} lSz={lSz} cells={[
            { label: "ERA",  value: fmtDec(p.era),  accent: true },
            { label: "FIP",  value: fmtDec(p.fip) },
            { label: "WHIP", value: fmtDec(p.whip) },
            { label: "IP",   value: fmtDec(p.ip, 1) },
            ...(p.w != null || p.l != null ? [{ label: "W-L", value: `${p.w ?? 0}-${p.l ?? 0}`, dim: true }] : []),
            ...(p.sv != null && p.sv > 0 ? [{ label: "SV", value: String(p.sv) }] : []),
          ]} />
          <StatRow px={px} vSz={vSz} lSz={lSz} cells={[
            { label: "K%",    value: fmtPct(p.kRate),    accent: true },
            { label: "BB%",   value: fmtPct(p.bbRate) },
            { label: "K-BB%", value: fmtPct(p.kMinusBB) },
            { label: "K/9",   value: fmtDec(p.kPer9, 1) },
            { label: "BB/9",  value: fmtDec(p.bbPer9, 1) },
          ]} />
          <StatRow px={px} vSz={vSz} lSz={lSz} cells={[
            ...(p.babip != null ? [{ label: "BABIP", value: fmtAvg(p.babip), dim: true }] : []),
            ...(p.war   != null ? [{ label: "WAR",   value: fmtDec(p.war, 1), accent: true }] : []),
          ]} />
        </>
      )}

      {/* ══ HITTER STATS ═══════════════════════════════════════════════════════ */}
      {h && (
        <>
          <Divider label={`${data.season} · Hitting`} px={px} />
          <StatRow px={px} vSz={vSz} lSz={lSz} cells={[
            { label: "AVG",  value: fmtAvg(h.avg),  accent: true },
            { label: "OBP",  value: fmtAvg(h.obp) },
            { label: "SLG",  value: fmtAvg(h.slg) },
            { label: "OPS",  value: fmtAvg(h.ops) },
            { label: "wRC+", value: h.wrcPlus?.toString() ?? "—", accent: true },
            ...(h.war != null ? [{ label: "WAR", value: fmtDec(h.war, 1), accent: true }] : []),
          ]} />
          <StatRow px={px} vSz={vSz} lSz={lSz} cells={[
            { label: "HR",    value: h.hr?.toString()  ?? "—" },
            { label: "RBI",   value: h.rbi?.toString() ?? "—" },
            { label: "SB",    value: h.sb?.toString()  ?? "—", dim: true },
            { label: "ISO",   value: fmtAvg(h.iso) },
            { label: "BABIP", value: fmtAvg(h.babip),  dim: true },
          ]} />
          <StatRow px={px} vSz={vSz} lSz={lSz} cells={[
            { label: "K%",    value: fmtPct(h.kRate) },
            { label: "BB%",   value: fmtPct(h.bbRate) },
            { label: "K-BB%", value: fmtPct(h.kMinusBB) },
            ...(h.hardHitRate != null ? [{ label: "HH%",  value: fmtPct(h.hardHitRate), accent: true }] : []),
            ...(h.avgExitVelo != null ? [{ label: "EV",   value: `${fmtEV(h.avgExitVelo)} mph` }] : []),
            ...(h.barrelRate  != null ? [{ label: "Brl%", value: fmtPct(h.barrelRate) }] : []),
          ]} />
        </>
      )}

      {/* ══ ARSENAL ════════════════════════════════════════════════════════════ */}
      {data.pitchArsenal.length > 0 && (
        <>
          <Divider label="Arsenal" px={px} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", padding: `8px ${px} 0` }}>
            {data.pitchArsenal.map((pitch) => {
              const color = PITCH_COLORS[pitch.type] ?? "#aaaaaa";
              return (
                <div key={pitch.type} style={{
                  padding: isCompare ? "9px 13px" : "7px 11px",
                  borderRadius: "8px",
                  background: `${color}0e`, border: `0.5px solid ${color}30`,
                  flex: isCompare ? "1 1 0" : "0 0 auto",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: isCompare ? "13px" : "11px", fontWeight: "700", color, letterSpacing: ".03em" }}>
                      {pitch.type}
                    </span>
                    {pitch.velocity != null && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: isCompare ? "11px" : "9.5px", color: "rgba(255,255,255,.7)" }}>
                        {pitch.velocity.toFixed(1)} mph
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {pitch.usage != null && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: isCompare ? "8.5px" : "7px", color: "rgba(255,255,255,.3)" }}>
                        {(pitch.usage * 100).toFixed(0)}%
                      </span>
                    )}
                    {pitch.whiff != null && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: isCompare ? "8.5px" : "7px", color, opacity: 0.7 }}>
                        {(pitch.whiff * 100).toFixed(0)}% whf
                      </span>
                    )}
                  </div>
                  {(pitch.hBreak != null || pitch.vBreak != null) && (
                    <div style={{ display: "flex", gap: "5px", marginTop: "2px" }}>
                      {pitch.hBreak != null && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "6.5px", color: "rgba(255,255,255,.2)" }}>
                          {pitch.hBreak > 0 ? "+" : ""}{pitch.hBreak.toFixed(1)}&quot; H
                        </span>
                      )}
                      {pitch.vBreak != null && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "6.5px", color: "rgba(255,255,255,.2)" }}>
                          {pitch.vBreak > 0 ? "+" : ""}{pitch.vBreak.toFixed(1)}&quot; V
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* No data */}
      {!h && !p && data.pitchArsenal.length === 0 && (
        <div style={{
          padding: "16px 22px",
          fontFamily: "var(--font-mono)", fontSize: "10px",
          color: "rgba(255,255,255,.22)", textTransform: "uppercase",
          letterSpacing: ".12em", textAlign: "center",
        }}>
          Stats unavailable for {data.season}
        </div>
      )}

      {/* Caption (inline only) */}
      {isInline && caption && (
        <div style={{
          padding: "10px 22px 0",
          fontFamily: "var(--font-mono)", fontSize: "9px",
          color: "rgba(255,255,255,.25)", letterSpacing: ".1em",
          textTransform: "uppercase", textAlign: "center",
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}
