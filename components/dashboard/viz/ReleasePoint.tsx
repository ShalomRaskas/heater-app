"use client";

import { useMemo } from "react";
import type { PitcherPitchData, PitchEvent } from "@/lib/albert/viz-types";

export interface ReleasePointFilters {
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

const W = 420, H = 330;
const PAD = { t: 42, r: 20, b: 50, l: 52 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

// release_pos_x: horizontal (pitcher POV, arm-side positive for RHP)
// release_pos_z: height at release
const RX_MIN = -5, RX_MAX = 5;
const RZ_MIN = 3,  RZ_MAX = 8;

function toX(rx: number) { return PAD.l + ((rx - RX_MIN) / (RX_MAX - RX_MIN)) * PLOT_W; }
function toY(rz: number) { return H - PAD.b - ((rz - RZ_MIN) / (RZ_MAX - RZ_MIN)) * PLOT_H; }

function filterEvents(events: PitchEvent[], f: ReleasePointFilters): PitchEvent[] {
  return events.filter(e => {
    if (e.rx == null || e.rz == null) return false;
    if (e.rx < RX_MIN || e.rx > RX_MAX || e.rz < RZ_MIN - 0.5 || e.rz > RZ_MAX + 0.5) return false;
    if (f.stand && f.stand !== "all" && e.s !== f.stand) return false;
    if (f.pitchTypes && f.pitchTypes.length > 0 && !f.pitchTypes.includes(e.t ?? "")) return false;
    return true;
  });
}

export default function ReleasePoint({
  data,
  size = "inline",
  filters = {},
}: {
  data: PitcherPitchData;
  caption: string;
  size?: "inline" | "panel";
  filters?: ReleasePointFilters;
}) {
  const filtered = useMemo(() => filterEvents(data.events, filters), [data.events, filters]);

  const activePitchTypes = useMemo(() => {
    const sel = filters.pitchTypes && filters.pitchTypes.length > 0 ? new Set(filters.pitchTypes) : null;
    return data.pitchTypes.filter(pt => !sel || sel.has(pt));
  }, [data.pitchTypes, filters.pitchTypes]);

  return (
    <div style={{ maxWidth: size === "panel" ? "100%" : "420px", margin: "0 auto", userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <rect width={W} height={H} fill="#070a12" rx="10" />

        {/* Header */}
        <text x={PAD.l} y={22} fill="rgba(255,255,255,.7)" fontSize="12" fontWeight="700" fontFamily="monospace">
          {data.playerName}
        </text>
        <text x={PAD.l} y={33} fill="rgba(255,255,255,.3)" fontSize="8.5" fontFamily="monospace">
          RELEASE POINT · {data.season} · PITCHER POV
        </text>

        {/* Grid */}
        {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(rx => (
          <line key={`rg${rx}`} x1={toX(rx)} y1={PAD.t} x2={toX(rx)} y2={H - PAD.b}
            stroke={rx === 0 ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)"}
            strokeWidth={rx === 0 ? 1 : 0.5} strokeDasharray={rx === 0 ? undefined : "2,5"} />
        ))}
        {[3, 4, 5, 6, 7, 8].map(rz => (
          <line key={`rh${rz}`} x1={PAD.l} y1={toY(rz)} x2={W - PAD.r} y2={toY(rz)}
            stroke="rgba(255,255,255,.04)" strokeWidth="0.5" strokeDasharray="2,5" />
        ))}

        {/* Axes */}
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />
        <line x1={PAD.l} y1={PAD.t}     x2={PAD.l}     y2={H - PAD.b} stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />

        {/* Axis ticks */}
        {[-4, -2, 0, 2, 4].map(rx => (
          <text key={`rt${rx}`} x={toX(rx)} y={H - PAD.b + 14} textAnchor="middle"
            fill="rgba(255,255,255,.28)" fontSize="8.5" fontFamily="monospace">
            {rx > 0 ? `+${rx}` : rx}
          </text>
        ))}
        {[4, 5, 6, 7, 8].map(rz => (
          <text key={`rzt${rz}`} x={PAD.l - 6} y={toY(rz) + 3} textAnchor="end"
            fill="rgba(255,255,255,.28)" fontSize="8.5" fontFamily="monospace">
            {rz}&apos;
          </text>
        ))}

        {/* Axis titles */}
        <text x={PAD.l + PLOT_W / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,.22)" fontSize="9" fontFamily="monospace">
          HORIZONTAL RELEASE (FT) — ARM SIDE →
        </text>
        <text x={13} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,.22)" fontSize="9" fontFamily="monospace"
          transform={`rotate(-90, 13, ${H / 2})`}>
          RELEASE HEIGHT (FT)
        </text>

        {/* Data points */}
        {activePitchTypes.map(pt => {
          const color = pitchColor(pt);
          return filtered
            .filter(e => e.t === pt)
            .map((e, i) => (
              <circle key={`${pt}${i}`}
                cx={toX(e.rx!)} cy={toY(e.rz!)} r={2}
                fill={`${color}30`} stroke={color} strokeWidth="0.35" opacity={0.75}
              />
            ));
        })}

        {/* Legend */}
        {activePitchTypes.slice(0, 9).map((pt, i) => {
          const color = pitchColor(pt);
          const name = data.pitchNames[pt] ?? pt;
          const lx = PAD.l + 6, ly = H - PAD.b - 10 - i * 16;
          return (
            <g key={`lp${pt}`}>
              <circle cx={lx + 4} cy={ly} r={3.5} fill={`${color}30`} stroke={color} strokeWidth="0.75" />
              <text x={lx + 12} y={ly + 3.5} fill={color} fontSize="8" fontFamily="monospace">
                {pt} · {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
