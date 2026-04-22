"use client";

import { useMemo } from "react";
import type { SprayChartData, BattedBallEvent } from "@/lib/albert/viz-types";

export interface EvLaScatterFilters {
  handedness?: "L" | "R" | "all";
  countState?: "2strike" | "even" | "ahead" | "behind" | "all";
  pitchTypes?: string[];
}

const W = 560, H = 360;
const PAD = { t: 40, r: 24, b: 52, l: 52 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

const LA_MIN = -60, LA_MAX = 80;
const EV_MIN = 40,  EV_MAX = 120;

function toX(la: number) { return PAD.l + ((la - LA_MIN) / (LA_MAX - LA_MIN)) * PLOT_W; }
function toY(ev: number) { return H - PAD.b - ((ev - EV_MIN) / (EV_MAX - EV_MIN)) * PLOT_H; }

/** MLB barrel definition: EV ≥ 98 mph, LA between 26° and min(50, 26+(EV-98)*2) */
function isBarrel(ev: number, la: number): boolean {
  if (ev < 98) return false;
  const laMax = Math.min(50, 26 + (ev - 98) * 2);
  return la >= 26 && la <= laMax;
}

type Outcome = "hr" | "triple" | "double" | "single" | "out";

function toOutcome(event: string | null): Outcome {
  if (event === "home_run") return "hr";
  if (event === "triple")   return "triple";
  if (event === "double")   return "double";
  if (event === "single")   return "single";
  return "out";
}

const C: Record<Outcome, { stroke: string; fill: string }> = {
  hr:     { stroke: "#D32F2F",             fill: "rgba(211,47,47,.55)"   },
  triple: { stroke: "#ffb347",             fill: "rgba(255,179,71,.45)"  },
  double: { stroke: "#ff8040",             fill: "rgba(255,128,64,.4)"   },
  single: { stroke: "#c8a85a",             fill: "rgba(200,168,90,.35)"  },
  out:    { stroke: "rgba(255,255,255,.2)", fill: "rgba(255,255,255,.04)" },
};

function applyFilters(events: BattedBallEvent[], f: EvLaScatterFilters): BattedBallEvent[] {
  return events.filter((e) => {
    if (e.launch_speed == null || e.launch_angle == null) return false;
    if (f.handedness && f.handedness !== "all" && e.p_throws !== f.handedness) return false;
    if (f.pitchTypes && f.pitchTypes.length > 0 && !f.pitchTypes.includes(e.pitch_type ?? "")) return false;
    if (f.countState && f.countState !== "all") {
      const b = e.balls ?? 0, s = e.strikes ?? 0;
      if (f.countState === "2strike" && s !== 2) return false;
      if (f.countState === "even"    && (b !== s || s === 2)) return false;
      if (f.countState === "ahead"   && !(b > s && s < 2)) return false;
      if (f.countState === "behind"  && !(s > b && s < 2)) return false;
    }
    return true;
  });
}

/** Build the barrel zone polygon points (EV 98→116, expanding LA window) */
function barrelPolygon(): string {
  const evVals = Array.from({ length: 19 }, (_, i) => 98 + i); // 98–116
  const left  = evVals.map(ev => [toX(26),              toY(Math.min(ev, EV_MAX))]);
  const right = [...evVals].reverse().map(ev => [toX(Math.min(50, 26 + (ev - 98) * 2)), toY(Math.min(ev, EV_MAX))]);
  return [...left, ...right].map(([x, y]) => `${x},${y}`).join(" ");
}
const BARREL_POLY = barrelPolygon();

export default function EvLaScatter({
  data,
  caption,
  size = "inline",
  filters = {},
}: {
  data: SprayChartData;
  caption: string;
  size?: "inline" | "panel";
  filters?: EvLaScatterFilters;
}) {
  const filtered = useMemo(() => applyFilters(data.events, filters), [data.events, filters]);

  const stats = useMemo(() => {
    const evs = filtered.map(e => e.launch_speed!);
    const barrels  = filtered.filter(e => isBarrel(e.launch_speed!, e.launch_angle!));
    const hardHit  = filtered.filter(e => (e.launch_speed ?? 0) >= 95);
    const avg = evs.length ? (evs.reduce((a, b) => a + b, 0) / evs.length).toFixed(1) : "—";
    return {
      avg,
      brlPct: filtered.length ? ((barrels.length / filtered.length) * 100).toFixed(1) : "—",
      hhPct:  filtered.length ? ((hardHit.length  / filtered.length) * 100).toFixed(1) : "—",
      n: filtered.length,
    };
  }, [filtered]);

  return (
    <div style={{ maxWidth: size === "panel" ? "100%" : "560px", margin: "0 auto", userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <rect width={W} height={H} fill="#070a12" rx="10" />

        {/* Grid lines */}
        {[-60, -30, 0, 30, 60].map(la => (
          <line key={`gl${la}`} x1={toX(la)} y1={PAD.t} x2={toX(la)} y2={H - PAD.b}
            stroke={la === 0 ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.04)"}
            strokeWidth={la === 0 ? 1 : 0.5} strokeDasharray={la === 0 ? undefined : "3,4"} />
        ))}
        {[60, 80, 100, 120].map(ev => (
          <line key={`ge${ev}`} x1={PAD.l} y1={toY(ev)} x2={W - PAD.r} y2={toY(ev)}
            stroke={ev === 95 ? "rgba(255,165,0,.1)" : "rgba(255,255,255,.04)"}
            strokeWidth={0.5} strokeDasharray="3,4" />
        ))}

        {/* Hard-hit shading (EV ≥ 95) */}
        <rect x={PAD.l} y={toY(EV_MAX)} width={PLOT_W} height={toY(95) - toY(EV_MAX)}
          fill="rgba(255,140,0,.025)" />

        {/* Barrel zone */}
        <polygon points={BARREL_POLY} fill="rgba(211,47,47,.07)" stroke="rgba(211,47,47,.25)" strokeWidth="0.75" />

        {/* Axes */}
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />
        <line x1={PAD.l} y1={PAD.t}     x2={PAD.l}     y2={H - PAD.b} stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />

        {/* Axis ticks */}
        {[-60, -30, 0, 30, 60].map(la => (
          <text key={`la${la}`} x={toX(la)} y={H - PAD.b + 14} textAnchor="middle"
            fill="rgba(255,255,255,.3)" fontSize="9" fontFamily="monospace">{la}°</text>
        ))}
        {[60, 80, 100, 120].map(ev => (
          <text key={`ev${ev}`} x={PAD.l - 6} y={toY(ev) + 3} textAnchor="end"
            fill="rgba(255,255,255,.3)" fontSize="9" fontFamily="monospace">{ev}</text>
        ))}

        {/* Axis titles */}
        <text x={W / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,.25)" fontSize="9" fontFamily="monospace">
          LAUNCH ANGLE (°)
        </text>
        <text x={13} y={H / 2} textAnchor="middle" fill="rgba(255,255,255,.25)" fontSize="9" fontFamily="monospace"
          transform={`rotate(-90, 13, ${H / 2})`}>
          EXIT VELO (MPH)
        </text>

        {/* Labels */}
        <text x={toX(38)} y={toY(114)} textAnchor="middle" fill="rgba(211,47,47,.45)" fontSize="8" fontFamily="monospace">
          BARREL
        </text>
        <text x={W - PAD.r - 4} y={toY(95) - 4} textAnchor="end" fill="rgba(255,165,0,.35)" fontSize="7.5" fontFamily="monospace">
          95 mph
        </text>

        {/* Data points — outs drawn first (underneath hits) */}
        {(["out", "single", "double", "triple", "hr"] as Outcome[]).map(g =>
          filtered
            .filter(e => toOutcome(e.events) === g)
            .map((e, i) => {
              const barrel = isBarrel(e.launch_speed!, e.launch_angle!);
              const r = barrel ? 4.5 : (e.launch_speed ?? 0) >= 95 ? 3.5 : 2.5;
              return (
                <circle key={`${g}${i}`}
                  cx={toX(e.launch_angle!)} cy={toY(e.launch_speed!)} r={r}
                  fill={C[g].fill} stroke={barrel ? "#ff4444" : C[g].stroke}
                  strokeWidth={barrel ? 1.2 : 0.4}
                  opacity={g === "out" ? 0.55 : 1}
                />
              );
            })
        )}

        {/* Player + season header */}
        <text x={PAD.l + 4} y={PAD.t - 18} fill="rgba(255,255,255,.7)" fontSize="12" fontWeight="700" fontFamily="monospace">
          {data.playerName}
        </text>
        <text x={PAD.l + 4} y={PAD.t - 6} fill="rgba(255,255,255,.3)" fontSize="8.5" fontFamily="monospace">
          EV VS LAUNCH ANGLE · {data.season} · n={stats.n}
        </text>

        {/* Stats strip */}
        <text x={W - PAD.r - 4} y={PAD.t - 6} textAnchor="end" fill="rgba(255,100,100,.7)" fontSize="9" fontFamily="monospace">
          avg {stats.avg} mph · brl {stats.brlPct}% · hh {stats.hhPct}%
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        {(["hr", "triple", "double", "single", "out"] as Outcome[]).map(g => (
          <div key={g} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C[g].fill, border: `1px solid ${C[g].stroke}` }} />
            <span style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>
              {g === "hr" ? "HR" : g === "out" ? "Out" : g.charAt(0).toUpperCase() + g.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
