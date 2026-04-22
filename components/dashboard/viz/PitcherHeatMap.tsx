"use client";

import { useMemo, useState } from "react";
import type { PitcherPitchData, PitchEvent } from "@/lib/albert/viz-types";

export interface PitcherHeatMapFilters {
  stand?: "L" | "R" | "all";
  pitchTypes?: string[]; // empty = all
}

/* ── Grid config ──────────────────────────────────────────────────────────── */
// Statcast plate coordinates: x = -2.5 to 2.5 ft, z = 0.5 to 5.0 ft
const X_MIN = -2.5, X_MAX = 2.5, X_BINS = 20; // 0.25 ft per bin
const Z_MIN =  0.5, Z_MAX = 5.0, Z_BINS = 18; // 0.25 ft per bin
const BIN_W = (X_MAX - X_MIN) / X_BINS;
const BIN_H = (Z_MAX - Z_MIN) / Z_BINS;

// SVG viewBox 500×440
const SVG_W = 500, SVG_H = 440;
const PAD_L = 50, PAD_R = 20, PAD_T = 30, PAD_B = 40;
const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_T - PAD_B;

function toSVGx(px: number) {
  return PAD_L + ((px - X_MIN) / (X_MAX - X_MIN)) * CHART_W;
}
function toSVGz(pz: number) {
  return PAD_T + ((Z_MAX - pz) / (Z_MAX - Z_MIN)) * CHART_H;
}

const BIN_SVG_W = CHART_W / X_BINS;
const BIN_SVG_H = CHART_H / Z_BINS;

/* ── Color scale: density → fill ─────────────────────────────────────────── */
function densityColor(d: number): string {
  if (d <= 0)   return "rgba(0,0,0,0)";
  if (d < 0.02) return `rgba(211,47,47,${0.08 + d * 3})`;
  if (d < 0.05) return `rgba(230,80,30,${0.15 + d * 4})`;
  if (d < 0.10) return `rgba(255,120,40,${0.25 + d * 3})`;
  if (d < 0.20) return `rgba(255,165,50,${0.4  + d * 2})`;
  return `rgba(255,200,80,${Math.min(0.85, 0.5 + d)})`;
}

type BinMap = Record<string, number>; // "col-row" → count

function buildBins(events: PitchEvent[], pitchTypeFilter: string[]): BinMap {
  const map: BinMap = {};
  for (const e of events) {
    if (e.px == null || e.pz == null) continue;
    if (pitchTypeFilter.length > 0 && !pitchTypeFilter.includes(e.t ?? "")) continue;
    const col = Math.min(Math.floor((e.px - X_MIN) / BIN_W), X_BINS - 1);
    const row = Math.min(Math.floor((Z_MAX - e.pz) / BIN_H), Z_BINS - 1);
    if (col < 0 || row < 0) continue;
    const key = `${col}-${row}`;
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}

/* ── Strike zone in Statcast coords ──────────────────────────────────────── */
// Typical average: x ±0.83 ft, z 1.5–3.5 ft
const SZ_X1 = toSVGx(-0.83);
const SZ_X2 = toSVGx( 0.83);
const SZ_Z1 = toSVGz(3.5);
const SZ_Z2 = toSVGz(1.5);
const SZ_W  = SZ_X2 - SZ_X1;
const SZ_H  = SZ_Z2 - SZ_Z1;

const PITCH_COLORS = [
  "#ff9040", "#ff6b35", "#ea4040", "#ffa060",
  "#ff8555", "#e85050", "#ffb870", "#ff7070",
];

export default function PitcherHeatMap({
  data,
  caption,
  size = "inline",
  filters,
}: {
  data: PitcherPitchData;
  caption: string;
  size?: "inline" | "panel";
  filters?: PitcherHeatMapFilters;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    let evts = data.events;
    if (filters?.stand && filters.stand !== "all") {
      evts = evts.filter((e) => e.s === filters.stand);
    }
    return evts;
  }, [data.events, filters?.stand]);

  const { bins, maxCount, totalPitches } = useMemo(() => {
    const ptFilter = filters?.pitchTypes ?? [];
    const b = buildBins(filteredEvents, ptFilter);
    const max = Math.max(1, ...Object.values(b));
    const total = filteredEvents.filter(
      (e) => ptFilter.length === 0 || ptFilter.includes(e.t ?? ""),
    ).length;
    return { bins: b, maxCount: max, totalPitches: total };
  }, [filteredEvents, filters?.pitchTypes]);

  const noData = totalPitches < 5;
  const containerStyle: React.CSSProperties =
    size === "panel" ? { marginTop: 0 } : { marginTop: "12px", marginBottom: "4px" };

  return (
    <div style={containerStyle}>
      <div
        style={{
          position: "relative",
          borderRadius: "10px",
          overflow: "hidden",
          background:
            "radial-gradient(55% 55% at 50% 45%, rgba(211,47,47,.07), transparent 70%), linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.25))",
          border: "0.5px solid rgba(255,255,255,.08)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,.3)",
        }}
      >
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.015) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(255,255,255,.015) 0.5px, transparent 0.5px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 75% 75% at 50% 50%, black, transparent)",
        }} />

        {/* Player label */}
        <div style={{
          position: "absolute", top: "10px", left: "12px", zIndex: 2,
          fontFamily: "var(--font-mono)", fontSize: "9px",
          color: "rgba(255,255,255,.55)", textTransform: "uppercase",
          letterSpacing: ".14em", padding: "3px 8px",
          background: "rgba(10,10,15,.6)", border: "0.5px solid rgba(255,255,255,.08)",
          borderRadius: "5px", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", gap: "7px",
        }}>
          {data.playerId ? (
            <img
              src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_48,q_auto:best/v1/people/${data.playerId}/headshot/67/current`}
              alt=""
              style={{
                width: "22px", height: "22px", borderRadius: "999px",
                objectFit: "cover", objectPosition: "top center",
                border: "1px solid rgba(255,255,255,.15)", flexShrink: 0,
              }}
            />
          ) : (
            <span style={{
              width: "7px", height: "7px", borderRadius: "999px",
              background: "radial-gradient(circle at 30% 30%, #ffb55a, #D32F2F)",
              boxShadow: "0 0 6px rgba(211,47,47,.4)", display: "inline-block",
            }} />
          )}
          {data.playerName}{data.teamAbbr ? ` · ${data.teamAbbr}` : ""}
        </div>

        {/* Season label */}
        <div style={{
          position: "absolute", top: "10px", right: "12px", zIndex: 2,
          fontFamily: "var(--font-mono)", fontSize: "8.5px",
          color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".1em",
        }}>
          {data.season} · {totalPitches} pitches
        </div>

        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width={SVG_W} height={SVG_H}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          {/* Density bins */}
          {!noData && Object.entries(bins).map(([key, count]) => {
            const [col, row] = key.split("-").map(Number);
            const x = PAD_L + col * BIN_SVG_W;
            const y = PAD_T + row * BIN_SVG_H;
            const density = count / maxCount;
            return (
              <rect
                key={key}
                x={x} y={y}
                width={BIN_SVG_W} height={BIN_SVG_H}
                fill={densityColor(density)}
              />
            );
          })}

          {/* Axis lines */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H}
            stroke="rgba(255,255,255,.12)" />
          <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H}
            stroke="rgba(255,255,255,.12)" />

          {/* X axis ticks */}
          {[-2, -1, 0, 1, 2].map((v) => (
            <g key={`tx-${v}`}>
              <line
                x1={toSVGx(v)} y1={PAD_T + CHART_H}
                x2={toSVGx(v)} y2={PAD_T + CHART_H + 4}
                stroke="rgba(255,255,255,.2)"
              />
              <text
                x={toSVGx(v)} y={PAD_T + CHART_H + 14}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="8" fill="rgba(255,255,255,.25)"
              >{v}</text>
            </g>
          ))}

          {/* Z axis ticks */}
          {[1, 2, 3, 4].map((v) => (
            <g key={`tz-${v}`}>
              <line
                x1={PAD_L - 4} y1={toSVGz(v)}
                x2={PAD_L}     y2={toSVGz(v)}
                stroke="rgba(255,255,255,.2)"
              />
              <text
                x={PAD_L - 8} y={toSVGz(v) + 3}
                textAnchor="end"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="8" fill="rgba(255,255,255,.25)"
              >{v}</text>
            </g>
          ))}

          {/* Strike zone */}
          <rect
            x={SZ_X1} y={SZ_Z1}
            width={SZ_W} height={SZ_H}
            fill="none"
            stroke="rgba(255,255,255,.35)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          {/* Zone thirds */}
          {[1, 2].map((i) => (
            <line key={`vh-${i}`}
              x1={SZ_X1 + (SZ_W / 3) * i} y1={SZ_Z1}
              x2={SZ_X1 + (SZ_W / 3) * i} y2={SZ_Z1 + SZ_H}
              stroke="rgba(255,255,255,.1)" strokeWidth="0.5"
            />
          ))}
          {[1, 2].map((i) => (
            <line key={`hz-${i}`}
              x1={SZ_X1} y1={SZ_Z1 + (SZ_H / 3) * i}
              x2={SZ_X1 + SZ_W} y2={SZ_Z1 + (SZ_H / 3) * i}
              stroke="rgba(255,255,255,.1)" strokeWidth="0.5"
            />
          ))}

          {/* Pitch type scatter dots (average location per type) */}
          {data.pitchTypes.map((pt, i) => {
            const typeEvts = filteredEvents.filter((e) => e.t === pt && e.px != null && e.pz != null);
            if (typeEvts.length === 0) return null;
            const color = PITCH_COLORS[i % PITCH_COLORS.length];
            const isHov = hovered === pt;

            // Average location
            const avgPx = typeEvts.reduce((s, e) => s + e.px!, 0) / typeEvts.length;
            const avgPz = typeEvts.reduce((s, e) => s + e.pz!, 0) / typeEvts.length;
            const cx = toSVGx(avgPx);
            const cy = toSVGz(avgPz);

            return (
              <g key={pt}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(pt)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle cx={cx} cy={cy} r={isHov ? 7 : 5}
                  fill="rgba(10,10,18,.8)"
                  stroke={color}
                  strokeWidth={isHov ? 2 : 1.5}
                  style={{ transition: "all .15s" }}
                />
                <text x={cx} y={cy + 3.5}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, var(--font-mono), monospace"
                  fontSize="5.5" fill={color} fontWeight="700"
                >
                  {pt.slice(0, 2)}
                </text>
                {isHov && (
                  <g>
                    <rect
                      x={cx - 48} y={cy - 32} width="96" height="26"
                      rx="4" fill="rgba(10,10,18,.92)"
                      stroke={color} strokeWidth="0.5" strokeOpacity=".5"
                    />
                    <text x={cx} y={cy - 20} textAnchor="middle"
                      fontFamily="JetBrains Mono, var(--font-mono), monospace"
                      fontSize="8" fill={color} fontWeight="600"
                    >
                      {data.pitchNames[pt] ?? pt}
                    </text>
                    <text x={cx} y={cy - 10} textAnchor="middle"
                      fontFamily="JetBrains Mono, var(--font-mono), monospace"
                      fontSize="7" fill="rgba(255,255,255,.5)"
                    >
                      {typeEvts.length} pitches · avg {avgPx >= 0 ? "+" : ""}{avgPx.toFixed(2)}, {avgPz.toFixed(2)} ft
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* No data overlay */}
          {noData && (
            <g>
              <rect x="100" y="175" width="300" height="50" rx="8"
                fill="rgba(10,10,18,.88)" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
              <text x="250" y="205" textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="11" fill="rgba(255,255,255,.4)" letterSpacing="1"
              >
                NO PITCHES MATCH FILTER
              </text>
            </g>
          )}

          {/* Axis labels */}
          <text x={PAD_L + CHART_W / 2} y={SVG_H - 4}
            textAnchor="middle"
            fontFamily="JetBrains Mono, var(--font-mono), monospace"
            fontSize="8" fill="rgba(255,255,255,.2)" letterSpacing="1"
          >
            HORIZONTAL LOCATION (FT) — CATCHER POV
          </text>
          <text
            x={12} y={PAD_T + CHART_H / 2}
            textAnchor="middle"
            fontFamily="JetBrains Mono, var(--font-mono), monospace"
            fontSize="8" fill="rgba(255,255,255,.2)" letterSpacing="1"
            transform={`rotate(-90, 12, ${PAD_T + CHART_H / 2})`}
          >
            HEIGHT (FT)
          </text>
        </svg>
      </div>

      {size === "inline" && (
        <div style={{
          marginTop: "7px", fontFamily: "var(--font-mono)", fontSize: "9.5px",
          color: "rgba(255,255,255,.38)", textTransform: "uppercase",
          letterSpacing: ".12em", lineHeight: 1.4, textAlign: "center",
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}
