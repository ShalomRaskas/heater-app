"use client";

import { useMemo } from "react";
import type { SprayChartData, BattedBallEvent } from "@/lib/albert/viz-types";

export interface BbProfileFilters {
  handedness?: "L" | "R" | "all";
  pitchTypes?: string[];
}

type BbType = "ground_ball" | "line_drive" | "fly_ball" | "popup";

const BB_ORDER: BbType[] = ["ground_ball", "line_drive", "fly_ball", "popup"];

const BB_META: Record<BbType, { short: string; label: string; stroke: string; fill: string }> = {
  ground_ball: { short: "GB",   label: "Ground Ball",    stroke: "#22c55e", fill: "rgba(34,197,94,.65)"   },
  line_drive:  { short: "LD",   label: "Line Drive",     stroke: "#eab308", fill: "rgba(234,179,8,.65)"   },
  fly_ball:    { short: "FB",   label: "Fly Ball",       stroke: "#f97316", fill: "rgba(249,115,22,.65)"  },
  popup:       { short: "IFFB", label: "Pop-up / IFFB",  stroke: "#8b5cf6", fill: "rgba(139,92,246,.65)"  },
};

function applyFilters(events: BattedBallEvent[], f: BbProfileFilters): BattedBallEvent[] {
  return events.filter(e => {
    if (!e.bb_type) return false;
    if (f.handedness && f.handedness !== "all" && e.p_throws !== f.handedness) return false;
    if (f.pitchTypes && f.pitchTypes.length > 0 && !f.pitchTypes.includes(e.pitch_type ?? "")) return false;
    return true;
  });
}

/** Compute SVG donut arc path */
function arcPath(cx: number, cy: number, r: number, inner: number, startDeg: number, endDeg: number): string {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180;
  const s = rad(startDeg), e = rad(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const cos = Math.cos, sin = Math.sin;
  const x1 = cx + r * cos(s), y1 = cy + r * sin(s);
  const x2 = cx + r * cos(e), y2 = cy + r * sin(e);
  const ix1 = cx + inner * cos(e), iy1 = cy + inner * sin(e);
  const ix2 = cx + inner * cos(s), iy2 = cy + inner * sin(s);
  return `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${inner},${inner} 0 ${large},0 ${ix2},${iy2} Z`;
}

const W = 420, H = 290;
const CX = 155, CY = 155, R = 110, INNER = 62;

export default function BbProfile({
  data,
  size = "inline",
  filters = {},
}: {
  data: SprayChartData;
  caption: string;
  size?: "inline" | "panel";
  filters?: BbProfileFilters;
}) {
  const filtered = useMemo(() => applyFilters(data.events, filters), [data.events, filters]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ground_ball: 0, line_drive: 0, fly_ball: 0, popup: 0 };
    for (const e of filtered) if (e.bb_type && e.bb_type in c) c[e.bb_type]++;
    return c;
  }, [filtered]);

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  const slices = useMemo(() => {
    if (total === 0) return [];
    let angle = 0;
    return BB_ORDER.map(t => {
      const pct = counts[t] / total;
      const sweep = pct * 360;
      const start = angle;
      angle += sweep;
      return { type: t, pct, start, sweep };
    }).filter(s => s.sweep > 1);
  }, [counts, total]);

  return (
    <div style={{ maxWidth: size === "panel" ? "100%" : "420px", margin: "0 auto", userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <rect width={W} height={H} fill="#070a12" rx="10" />

        {/* Header */}
        <text x={16} y={22} fill="rgba(255,255,255,.7)" fontSize="12" fontWeight="700" fontFamily="monospace">
          {data.playerName}
        </text>
        <text x={16} y={34} fill="rgba(255,255,255,.3)" fontSize="8.5" fontFamily="monospace">
          BATTED BALL PROFILE · {data.season}
        </text>

        {/* Donut slices */}
        {total === 0 ? (
          <text x={CX} y={CY + 4} textAnchor="middle" fill="rgba(255,255,255,.3)" fontSize="11" fontFamily="monospace">
            No data
          </text>
        ) : (
          slices.map(s => (
            <path key={s.type}
              d={arcPath(CX, CY, R, INNER, s.start, s.start + s.sweep)}
              fill={BB_META[s.type as BbType].fill}
              stroke={BB_META[s.type as BbType].stroke}
              strokeWidth="0.75"
            />
          ))
        )}

        {/* Center — total BIP */}
        <text x={CX} y={CY - 8} textAnchor="middle" fill="rgba(255,255,255,.75)" fontSize="22" fontWeight="700" fontFamily="monospace">
          {total}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" fill="rgba(255,255,255,.3)" fontSize="9" fontFamily="monospace">
          BIP
        </text>

        {/* Legend */}
        {BB_ORDER.map((t, i) => {
          const m = BB_META[t];
          const pct = total > 0 ? ((counts[t] / total) * 100).toFixed(1) : "0.0";
          const xL = W - 168, y0 = 55 + i * 52;
          return (
            <g key={t}>
              <rect x={xL} y={y0} width={12} height={12} rx="2"
                fill={m.fill} stroke={m.stroke} strokeWidth="0.75" />
              <text x={xL + 16} y={y0 + 10} fill={m.stroke} fontSize="14" fontWeight="700" fontFamily="monospace">
                {m.short}
              </text>
              <text x={xL + 16} y={y0 + 22} fill="rgba(255,255,255,.35)" fontSize="9" fontFamily="monospace">
                {m.label}
              </text>
              <text x={W - 18} y={y0 + 10} textAnchor="end" fill="rgba(255,255,255,.7)" fontSize="14" fontWeight="700" fontFamily="monospace">
                {pct}%
              </text>
              <text x={W - 18} y={y0 + 22} textAnchor="end" fill="rgba(255,255,255,.3)" fontSize="9" fontFamily="monospace">
                {counts[t]} events
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
