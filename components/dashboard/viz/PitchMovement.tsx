"use client";

import { useMemo } from "react";
import type { PitcherPitchData, PitchEvent } from "@/lib/albert/viz-types";

export interface PitchMovementFilters {
  stand?: "L" | "R" | "all";
  pitchTypes?: string[];
}

const PITCH_COLORS: Record<string, string> = {
  FF: "#ef4444", SI: "#f97316", FC: "#f59e0b",
  SL: "#3b82f6", ST: "#6366f1", SV: "#8b5cf6",
  CU: "#06b6d4", KC: "#0ea5e9", CH: "#22c55e",
  FS: "#84cc16", FO: "#a3e635", KN: "#e879f9",
};
function pitchColor(t: string) { return PITCH_COLORS[t?.toUpperCase()] ?? "#94a3b8"; }

const W = 560, H = 400;
const PAD = { t: 42, r: 110, b: 50, l: 54 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

// pfx values are in feet; convert to inches (* 12)
const HB_MIN = -24, HB_MAX = 24;   // horizontal break (inches)
const VB_MIN = -14, VB_MAX = 26;   // vertical break (inches)

function toX(hbIn: number) { return PAD.l + ((hbIn - HB_MIN) / (HB_MAX - HB_MIN)) * PLOT_W; }
function toY(vbIn: number) { return H - PAD.b - ((vbIn - VB_MIN) / (VB_MAX - VB_MIN)) * PLOT_H; }

function filterEvents(events: PitchEvent[], f: PitchMovementFilters): PitchEvent[] {
  return events.filter(e => {
    if (e.mx == null || e.mz == null) return false;
    if (f.stand && f.stand !== "all" && e.s !== f.stand) return false;
    if (f.pitchTypes && f.pitchTypes.length > 0 && !f.pitchTypes.includes(e.t ?? "")) return false;
    return true;
  });
}

export default function PitchMovement({
  data,
  size = "inline",
  filters = {},
}: {
  data: PitcherPitchData;
  caption: string;
  size?: "inline" | "panel";
  filters?: PitchMovementFilters;
}) {
  const filtered = useMemo(() => filterEvents(data.events, filters), [data.events, filters]);

  const activePitchTypes = useMemo(() => {
    const sel = filters.pitchTypes && filters.pitchTypes.length > 0 ? new Set(filters.pitchTypes) : null;
    return data.pitchTypes.filter(pt => !sel || sel.has(pt));
  }, [data.pitchTypes, filters.pitchTypes]);

  // Per-pitch-type centroid for labeling
  const centroids = useMemo(() => {
    const map: Record<string, { x: number; y: number; n: number }> = {};
    for (const e of filtered) {
      if (!e.t || e.mx == null || e.mz == null) continue;
      const hbIn = e.mx * 12, vbIn = e.mz * 12;
      if (!map[e.t]) map[e.t] = { x: 0, y: 0, n: 0 };
      map[e.t].x += hbIn; map[e.t].y += vbIn; map[e.t].n++;
    }
    const result: Record<string, { x: number; y: number }> = {};
    for (const [pt, v] of Object.entries(map)) {
      result[pt] = { x: v.x / v.n, y: v.y / v.n };
    }
    return result;
  }, [filtered]);

  return (
    <div style={{ maxWidth: size === "panel" ? "100%" : "560px", margin: "0 auto", userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <rect width={W} height={H} fill="#070a12" rx="10" />

        {/* Header */}
        <text x={PAD.l} y={22} fill="rgba(255,255,255,.7)" fontSize="12" fontWeight="700" fontFamily="monospace">
          {data.playerName}
        </text>
        <text x={PAD.l} y={33} fill="rgba(255,255,255,.3)" fontSize="8.5" fontFamily="monospace">
          PITCH MOVEMENT · {data.season} · PITCHER POV · inches
        </text>

        {/* Grid lines */}
        {[-20, -10, 0, 10, 20].map(hb => (
          <line key={`hg${hb}`} x1={toX(hb)} y1={PAD.t} x2={toX(hb)} y2={H - PAD.b}
            stroke={hb === 0 ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.04)"}
            strokeWidth={hb === 0 ? 1 : 0.5} strokeDasharray={hb === 0 ? undefined : "3,5"} />
        ))}
        {[-10, 0, 10, 20].map(vb => (
          <line key={`vg${vb}`} x1={PAD.l} y1={toY(vb)} x2={W - PAD.r} y2={toY(vb)}
            stroke={vb === 0 ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.04)"}
            strokeWidth={vb === 0 ? 1 : 0.5} strokeDasharray={vb === 0 ? undefined : "3,5"} />
        ))}

        {/* Axis lines */}
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />
        <line x1={PAD.l} y1={PAD.t}     x2={PAD.l}     y2={H - PAD.b} stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />

        {/* Axis ticks */}
        {[-20, -10, 0, 10, 20].map(hb => (
          <text key={`ht${hb}`} x={toX(hb)} y={H - PAD.b + 14} textAnchor="middle"
            fill="rgba(255,255,255,.28)" fontSize="8.5" fontFamily="monospace">
            {hb > 0 ? `+${hb}"` : `${hb}"`}
          </text>
        ))}
        {[-10, 0, 10, 20].map(vb => (
          <text key={`vt${vb}`} x={PAD.l - 6} y={toY(vb) + 3} textAnchor="end"
            fill="rgba(255,255,255,.28)" fontSize="8.5" fontFamily="monospace">
            {vb > 0 ? `+${vb}"` : `${vb}"`}
          </text>
        ))}

        {/* Axis titles */}
        <text x={PAD.l + PLOT_W / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,.22)" fontSize="9" fontFamily="monospace">
          HORIZONTAL BREAK — ARM SIDE →
        </text>
        <text x={13} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,.22)" fontSize="9" fontFamily="monospace"
          transform={`rotate(-90, 13, ${H / 2})`}>
          INDUCED VERT. BREAK
        </text>

        {/* Gravity reference label */}
        <text x={toX(0) + 4} y={toY(0) - 4} fill="rgba(255,255,255,.18)" fontSize="7.5" fontFamily="monospace">
          gravity
        </text>

        {/* Data points — one layer per pitch type */}
        {activePitchTypes.map(pt => {
          const color = pitchColor(pt);
          const pts = filtered.filter(e => e.t === pt);
          return pts.map((e, i) => (
            <circle key={`${pt}${i}`}
              cx={toX((e.mx ?? 0) * 12)} cy={toY((e.mz ?? 0) * 12)}
              r={2.2} fill={`${color}38`} stroke={color} strokeWidth="0.35" opacity={0.72}
            />
          ));
        })}

        {/* Centroid crosshair labels */}
        {activePitchTypes.map(pt => {
          const c = centroids[pt];
          if (!c) return null;
          const color = pitchColor(pt);
          const cx = toX(c.x), cy = toY(c.y);
          return (
            <g key={`ctr${pt}`}>
              <line x1={cx - 7} y1={cy} x2={cx + 7} y2={cy} stroke={color} strokeWidth="1.2" />
              <line x1={cx} y1={cy - 7} x2={cx} y2={cy + 7} stroke={color} strokeWidth="1.2" />
              <rect x={cx + 5} y={cy - 9} width={pt.length * 7 + 6} height={14} rx="3" fill="#070a12" />
              <text x={cx + 8} y={cy + 1} fill={color} fontSize="9" fontWeight="700" fontFamily="monospace">{pt}</text>
            </g>
          );
        })}

        {/* Legend (right sidebar) */}
        {activePitchTypes.slice(0, 9).map((pt, i) => {
          const color = pitchColor(pt);
          const name = data.pitchNames[pt] ?? pt;
          return (
            <g key={`lg${pt}`}>
              <circle cx={W - PAD.r + 12} cy={PAD.t + 10 + i * 18} r={4}
                fill={`${color}38`} stroke={color} strokeWidth="0.75" />
              <text x={W - PAD.r + 20} y={PAD.t + 14 + i * 18} fill={color} fontSize="8.5" fontFamily="monospace">
                {pt} — {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
