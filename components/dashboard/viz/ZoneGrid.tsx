"use client";

import { useMemo } from "react";
import type { PitcherPitchData, PitchEvent } from "@/lib/albert/viz-types";

export interface ZoneGridFilters {
  stand?: "L" | "R" | "all";
  pitchTypes?: string[];
}

const W = 360, H = 410;
const PAD = { t: 48, r: 18, b: 70, l: 40 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

// Chart range in feet (catcher / LHH POV)
const PX_MIN = -2.0, PX_MAX = 2.0;
const PZ_MIN = 0.5,  PZ_MAX = 4.5;

// Strike zone bounds
const ZX_MIN = -0.83, ZX_MAX = 0.83;
const ZZ_MIN = 1.5,   ZZ_MAX = 3.5;

// Grid resolution
const COLS = 10, ROWS = 12;
const CELL_PX = (PX_MAX - PX_MIN) / COLS;
const CELL_PZ = (PZ_MAX - PZ_MIN) / ROWS;

function toX(px: number) { return PAD.l + ((px - PX_MIN) / (PX_MAX - PX_MIN)) * PLOT_W; }
function toY(pz: number) { return H - PAD.b - ((pz - PZ_MIN) / (PZ_MAX - PZ_MIN)) * PLOT_H; }

function cellIndex(px: number, pz: number): number {
  const col = Math.floor((px - PX_MIN) / CELL_PX);
  const row = Math.floor((pz - PZ_MIN) / CELL_PZ);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1;
  return row * COLS + col;
}

function densityColor(f: number): string {
  // 0 = transparent dark, 1 = bright orange-yellow
  if (f < 0.02) return "rgba(0,0,0,0)";
  const r = Math.round(140 + f * 115);
  const g = Math.round(f * 110);
  return `rgba(${r},${g},0,${Math.min(0.9, 0.15 + f * 0.75)})`;
}

function filterEvents(events: PitchEvent[], f: ZoneGridFilters): PitchEvent[] {
  return events.filter(e => {
    if (e.px == null || e.pz == null) return false;
    if (f.stand && f.stand !== "all" && e.s !== f.stand) return false;
    if (f.pitchTypes && f.pitchTypes.length > 0 && !f.pitchTypes.includes(e.t ?? "")) return false;
    return true;
  });
}

export default function ZoneGrid({
  data,
  size = "inline",
  filters = {},
}: {
  data: PitcherPitchData;
  caption: string;
  size?: "inline" | "panel";
  filters?: ZoneGridFilters;
}) {
  const filtered = useMemo(() => filterEvents(data.events, filters), [data.events, filters]);

  const { cells, maxCount } = useMemo(() => {
    const counts = new Array(COLS * ROWS).fill(0);
    for (const e of filtered) {
      const idx = cellIndex(e.px!, e.pz!);
      if (idx >= 0) counts[idx]++;
    }
    const max = Math.max(...counts, 1);
    return { cells: counts, maxCount: max };
  }, [filtered]);

  const cellRects = useMemo(() =>
    Array.from({ length: COLS * ROWS }, (_, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return {
        x:  toX(PX_MIN + col * CELL_PX),
        y:  toY(PZ_MIN + (row + 1) * CELL_PZ),
        w:  toX(PX_MIN + (col + 1) * CELL_PX) - toX(PX_MIN + col * CELL_PX),
        h:  toY(PZ_MIN + row * CELL_PZ) - toY(PZ_MIN + (row + 1) * CELL_PZ),
        f:  cells[i] / maxCount,
      };
    }), [cells, maxCount]);

  // Strike zone dividers (thirds)
  const szThirdX = (ZX_MAX - ZX_MIN) / 3;
  const szThirdZ = (ZZ_MAX - ZZ_MIN) / 3;

  return (
    <div style={{ maxWidth: size === "panel" ? "100%" : "360px", margin: "0 auto", userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <rect width={W} height={H} fill="#070a12" rx="10" />

        {/* Header */}
        <text x={PAD.l} y={22} fill="rgba(255,255,255,.7)" fontSize="12" fontWeight="700" fontFamily="monospace">
          {data.playerName}
        </text>
        <text x={PAD.l} y={34} fill="rgba(255,255,255,.3)" fontSize="8.5" fontFamily="monospace">
          PITCH LOCATION · {data.season} · {filtered.length} pitches · CATCHER POV
        </text>

        {/* Heat cells */}
        {cellRects.map((c, i) => c.f > 0.02 && (
          <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h}
            fill={densityColor(c.f)} rx="1" />
        ))}

        {/* Strike zone box */}
        <rect
          x={toX(ZX_MIN)} y={toY(ZZ_MAX)}
          width={toX(ZX_MAX) - toX(ZX_MIN)}
          height={toY(ZZ_MIN) - toY(ZZ_MAX)}
          fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" rx="2"
        />

        {/* Strike zone interior grid (thirds) */}
        {[1, 2].map(n => (
          <line key={`sxd${n}`}
            x1={toX(ZX_MIN + n * szThirdX)} y1={toY(ZZ_MIN)}
            x2={toX(ZX_MIN + n * szThirdX)} y2={toY(ZZ_MAX)}
            stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />
        ))}
        {[1, 2].map(n => (
          <line key={`szd${n}`}
            x1={toX(ZX_MIN)} y1={toY(ZZ_MIN + n * szThirdZ)}
            x2={toX(ZX_MAX)} y2={toY(ZZ_MIN + n * szThirdZ)}
            stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />
        ))}

        {/* Strike zone label */}
        <text x={toX(0)} y={toY(ZZ_MAX) - 5} textAnchor="middle"
          fill="rgba(255,255,255,.22)" fontSize="7.5" fontFamily="monospace">
          STRIKE ZONE
        </text>

        {/* Y-axis labels */}
        {[1.5, 2.0, 2.5, 3.0, 3.5].map(z => (
          <text key={z} x={PAD.l - 5} y={toY(z) + 3} textAnchor="end"
            fill="rgba(255,255,255,.28)" fontSize="8" fontFamily="monospace">
            {z}&apos;
          </text>
        ))}

        {/* X-axis labels */}
        {[-1.5, -0.75, 0, 0.75, 1.5].map(x => (
          <text key={x} x={toX(x)} y={H - PAD.b + 13} textAnchor="middle"
            fill="rgba(255,255,255,.28)" fontSize="8" fontFamily="monospace">
            {x > 0 ? `+${x}` : x}
          </text>
        ))}

        <text x={PAD.l + PLOT_W / 2} y={H - PAD.b + 25} textAnchor="middle"
          fill="rgba(255,255,255,.2)" fontSize="8.5" fontFamily="monospace">
          HORIZONTAL (FT, CATCHER VIEW)
        </text>

        {/* Home plate */}
        <path
          d={`M${W / 2 - 16},${H - 38} L${W / 2 + 16},${H - 38} L${W / 2 + 16},${H - 28} L${W / 2},${H - 20} L${W / 2 - 16},${H - 28} Z`}
          fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.18)" strokeWidth="0.75"
        />

        {/* Color scale legend */}
        <defs>
          <linearGradient id="zoneScale" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
            <stop offset="40%"  stopColor="rgba(180,60,0,.4)" />
            <stop offset="100%" stopColor="rgba(255,120,0,.9)" />
          </linearGradient>
        </defs>
        <rect x={PAD.l} y={H - 12} width={PLOT_W} height={7} rx="3" fill="url(#zoneScale)" />
        <text x={PAD.l} y={H - 1} fill="rgba(255,255,255,.22)" fontSize="7.5" fontFamily="monospace">low</text>
        <text x={PAD.l + PLOT_W} y={H - 1} textAnchor="end" fill="rgba(255,255,255,.22)" fontSize="7.5" fontFamily="monospace">high</text>
      </svg>
    </div>
  );
}
