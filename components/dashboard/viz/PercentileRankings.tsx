"use client";

import { useMemo } from "react";
import type { PercentileData } from "@/lib/albert/viz-types";

const W = 720;
const H = 218;
const R = 36;          // bubble outer radius
const ARC_R = 29;      // progress arc inner radius
const CIRC = 2 * Math.PI * ARC_R;
const BUBBLE_Y = 110;
const LABEL_Y = 160;
const VAL_Y = 174;
const LEGEND_Y = 203;

function cellX(i: number, total: number): number {
  const cellW = W / total;
  return cellW * i + cellW / 2;
}

function pColor(p: number): { ring: string; text: string; glow: string } {
  if (p >= 80) return { ring: "#d4af37", text: "#e8c84a", glow: "rgba(212,175,55,.2)"  };
  if (p >= 60) return { ring: "#60a8d0", text: "#80c0e0", glow: "rgba(96,168,208,.16)" };
  if (p >= 40) return { ring: "rgba(255,255,255,.4)", text: "rgba(255,255,255,.65)", glow: "rgba(255,255,255,.04)" };
  if (p >= 20) return { ring: "#e07840", text: "#e89060", glow: "rgba(224,120,64,.18)" };
  return             { ring: "#D32F2F", text: "#e05050", glow: "rgba(211,47,47,.2)"   };
}

const LEGEND: [string, string][] = [
  ["ELITE",      "#d4af37"],
  ["ABOVE AVG",  "#60a8d0"],
  ["AVG",        "rgba(255,255,255,.4)"],
  ["BELOW AVG",  "#e07840"],
  ["POOR",       "#D32F2F"],
];

export default function PercentileRankings({
  data,
  caption,
  size = "inline",
}: {
  data: PercentileData;
  caption: string;
  size?: "inline" | "panel";
}) {
  const metrics = useMemo(() => data.metrics.slice(0, 10), [data.metrics]);

  if (metrics.length === 0) {
    return (
      <div style={{
        padding: "28px", borderRadius: "10px",
        background: "rgba(10,12,22,.95)", border: "0.5px solid rgba(255,255,255,.08)",
        fontFamily: "var(--font-mono)", fontSize: "10px",
        color: "rgba(255,255,255,.28)", textAlign: "center",
        textTransform: "uppercase", letterSpacing: ".14em",
      }}>
        Percentile data unavailable for {data.season}
      </div>
    );
  }

  // Legend x positions — centered
  const legendItemW = 118;
  const legendTotalW = LEGEND.length * legendItemW;
  const legendStartX = (W - legendTotalW) / 2;

  return (
    <div style={{ maxWidth: size === "panel" ? "100%" : `${W}px`, margin: "0 auto", userSelect: "none" }}>
      <div style={{
        borderRadius: "10px", overflow: "hidden",
        background: "linear-gradient(170deg, rgba(16,18,28,.97) 0%, rgba(7,10,18,.99) 100%)",
        border: "0.5px solid rgba(255,255,255,.08)",
        boxShadow: "0 0 60px rgba(0,0,0,.5), inset 0 0 0 0.5px rgba(255,255,255,.03)",
      }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
          <defs>
            {metrics.map((m, i) => {
              const c = pColor(m.percentile);
              return (
                <radialGradient key={i} id={`prg-${i}`} cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor={c.ring} stopOpacity="0.14" />
                  <stop offset="100%" stopColor={c.ring} stopOpacity="0" />
                </radialGradient>
              );
            })}
          </defs>

          {/* ── Header ── */}
          <text x={W / 2} y={22} textAnchor="middle"
            fill="rgba(255,255,255,.85)" fontSize="13" fontWeight="700"
            fontFamily="JetBrains Mono, monospace" letterSpacing="1">
            {data.playerName.toUpperCase()}
          </text>
          <text x={W / 2} y={39} textAnchor="middle"
            fill="rgba(255,255,255,.25)" fontSize="8.5"
            fontFamily="JetBrains Mono, monospace" letterSpacing="2">
            {`STATCAST PERCENTILE RANKINGS · ${data.season} · ${data.type === "bat" ? "BATTER" : "PITCHER"}`}
          </text>
          <line x1={40} y1={47} x2={W - 40} y2={47}
            stroke="rgba(255,255,255,.05)" strokeWidth="0.5" />

          {/* ── Bubbles ── */}
          {metrics.map((m, i) => {
            const cx = cellX(i, metrics.length);
            const c = pColor(m.percentile);
            const arcLen = Math.max(0, Math.min(1, m.percentile / 100)) * CIRC;

            return (
              <g key={i}>
                {/* Ambient glow */}
                <circle cx={cx} cy={BUBBLE_Y} r={R + 14} fill={c.glow} />

                {/* Track ring (background arc) */}
                <circle cx={cx} cy={BUBBLE_Y} r={ARC_R}
                  fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="3" />

                {/* Dark background fill */}
                <circle cx={cx} cy={BUBBLE_Y} r={R} fill="rgba(8,10,20,.92)" />

                {/* Inner color gradient */}
                <circle cx={cx} cy={BUBBLE_Y} r={R} fill={`url(#prg-${i})`} />

                {/* Outer thin ring */}
                <circle cx={cx} cy={BUBBLE_Y} r={R}
                  fill="none" stroke={c.ring} strokeWidth="0.75" opacity="0.45" />

                {/* Progress arc */}
                <circle
                  cx={cx} cy={BUBBLE_Y} r={ARC_R}
                  fill="none"
                  stroke={c.ring}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${arcLen} ${CIRC}`}
                  transform={`rotate(-90, ${cx}, ${BUBBLE_Y})`}
                  opacity="0.9"
                />

                {/* Percentile number */}
                <text x={cx} y={BUBBLE_Y + 8} textAnchor="middle"
                  fill={c.text} fontSize="22" fontWeight="700"
                  fontFamily="JetBrains Mono, monospace" letterSpacing="-1">
                  {m.percentile}
                </text>

                {/* Stat label */}
                <text x={cx} y={LABEL_Y} textAnchor="middle"
                  fill="rgba(255,255,255,.3)" fontSize="7.5"
                  fontFamily="JetBrains Mono, monospace" letterSpacing="1">
                  {m.label.toUpperCase()}
                </text>

                {/* Raw value */}
                <text x={cx} y={VAL_Y} textAnchor="middle"
                  fill="rgba(255,255,255,.55)" fontSize="9"
                  fontFamily="JetBrains Mono, monospace">
                  {m.value}
                </text>
              </g>
            );
          })}

          {/* ── Legend ── */}
          {LEGEND.map(([label, color], idx) => {
            const x = legendStartX + idx * legendItemW + 14;
            return (
              <g key={label}>
                <circle cx={x} cy={LEGEND_Y} r={4} fill={color} opacity="0.7" />
                <text x={x + 9} y={LEGEND_Y + 4}
                  fill="rgba(255,255,255,.18)" fontSize="7.5"
                  fontFamily="JetBrains Mono, monospace" letterSpacing="0.5">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {size === "inline" && caption && (
        <div style={{
          marginTop: 7, fontFamily: "var(--font-mono)", fontSize: "9.5px",
          color: "rgba(255,255,255,.38)", textTransform: "uppercase",
          letterSpacing: ".12em", textAlign: "center",
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}
