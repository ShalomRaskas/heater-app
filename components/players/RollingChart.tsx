"use client";

import { useMemo } from "react";
import type { GameLogEntry } from "@/lib/players/getGameLog";

const W = 560, H = 260;
const PAD = { t: 36, r: 28, b: 44, l: 54 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

function toX(i: number, total: number) {
  return PAD.l + (i / Math.max(total - 1, 1)) * PLOT_W;
}

function toY(val: number, min: number, max: number) {
  return H - PAD.b - ((val - min) / Math.max(max - min, 0.001)) * PLOT_H;
}

interface Point { game: number; val: number; date: string }

function hitterPoints(entries: GameLogEntry[]): Point[] {
  const chrono = [...entries].reverse();
  let ab = 0, h = 0, bb = 0, doubles = 0, triples = 0, hr = 0;
  return chrono.map((e, i) => {
    ab      += e.ab      ?? 0;
    h       += e.h       ?? 0;
    bb      += e.bb      ?? 0;
    doubles += e.doubles ?? 0;
    triples += e.triples ?? 0;
    hr      += e.hr      ?? 0;
    const singles = h - doubles - triples - hr;
    const slg = ab > 0 ? (singles + 2 * doubles + 3 * triples + 4 * hr) / ab : 0;
    const obp = (ab + bb) > 0 ? (h + bb) / (ab + bb) : 0;
    return { game: i + 1, val: obp + slg, date: e.date };
  });
}

function pitcherPoints(entries: GameLogEntry[]): Point[] {
  const chrono = [...entries].reverse();
  let er = 0, ip = 0;
  return chrono.map((e, i) => {
    er += e.er ?? 0;
    ip += e.ip ?? 0;
    const era = ip > 0 ? (er * 9) / ip : 0;
    return { game: i + 1, val: era, date: e.date };
  });
}

export default function RollingChart({
  entries,
  isPitcher,
  playerName,
  season,
}: {
  entries: GameLogEntry[];
  isPitcher: boolean;
  playerName: string;
  season: number;
}) {
  const points = useMemo(
    () => (entries.length === 0 ? [] : isPitcher ? pitcherPoints(entries) : hitterPoints(entries)),
    [entries, isPitcher],
  );

  if (points.length < 3) {
    return (
      <div style={{
        padding: "48px", textAlign: "center", fontFamily: "var(--font-mono)",
        fontSize: "10px", color: "rgba(255,255,255,.18)",
        textTransform: "uppercase", letterSpacing: ".14em",
      }}>
        Not enough games to display trend
      </div>
    );
  }

  const vals = points.map(p => p.val);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const margin = (rawMax - rawMin) * 0.18 || 0.05;
  const yMin = Math.max(0, rawMin - margin);
  const yMax = rawMax + margin;

  // ERA is better when lower — invert so lower values appear higher
  const getY = (v: number) =>
    isPitcher ? toY(yMax - v + yMin, yMin, yMax) : toY(v, yMin, yMax);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i, points.length)},${getY(p.val)}`)
    .join(" ");

  const areaPath =
    `M ${toX(0, points.length)},${H - PAD.b} ` +
    points.map((p, i) => `L ${toX(i, points.length)},${getY(p.val)}`).join(" ") +
    ` L ${toX(points.length - 1, points.length)},${H - PAD.b} Z`;

  const last  = points[points.length - 1];
  const lastX = toX(points.length - 1, points.length);
  const lastY = getY(last.val);

  const metric = isPitcher ? "ERA" : "OPS";
  const fmtVal = (v: number) =>
    isPitcher ? v.toFixed(2) : v.toFixed(3).replace(/^0\./, ".");

  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount }, (_, i) =>
    yMin + (i / (tickCount - 1)) * (yMax - yMin),
  );

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", userSelect: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        <rect width={W} height={H} fill="#070a12" rx="10" />

        {/* Grid lines + Y labels */}
        {yTicks.map((v, i) => {
          const y = getY(v);
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
                stroke="rgba(255,255,255,.04)" strokeWidth="0.5" strokeDasharray="3,5" />
              <text x={PAD.l - 6} y={y + 3.5} textAnchor="end"
                fill="rgba(255,255,255,.22)" fontSize="8" fontFamily="monospace">
                {isPitcher ? v.toFixed(2) : v.toFixed(3).replace(/^0\./, ".")}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="rgba(211,47,47,.055)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#D32F2F" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Axes */}
        <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b}
          stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />
        <line x1={PAD.l} y1={PAD.t}      x2={PAD.l}     y2={H - PAD.b}
          stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />

        {/* X-axis game labels every 5 */}
        {points.map((p, i) => {
          const show = i === 0 || (p.game % 5 === 0) || i === points.length - 1;
          if (!show) return null;
          return (
            <text key={i} x={toX(i, points.length)} y={H - PAD.b + 14}
              textAnchor="middle" fill="rgba(255,255,255,.2)" fontSize="8" fontFamily="monospace">
              G{p.game}
            </text>
          );
        })}

        {/* Latest point dot + label */}
        <circle cx={lastX} cy={lastY} r={4.5}
          fill="#D32F2F" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
        <text x={lastX - 8} y={lastY - 10} textAnchor="end"
          fill="rgba(255,255,255,.75)" fontSize="10.5" fontFamily="monospace" fontWeight="700">
          {fmtVal(last.val)}
        </text>

        {/* Header */}
        <text x={PAD.l + 4} y={PAD.t - 18}
          fill="rgba(255,255,255,.7)" fontSize="12" fontWeight="700" fontFamily="monospace">
          {playerName}
        </text>
        <text x={PAD.l + 4} y={PAD.t - 6}
          fill="rgba(255,255,255,.28)" fontSize="8.5" fontFamily="monospace">
          SEASON {metric} TREND · {season} · {points.length} GP
        </text>
        {isPitcher && (
          <text x={W - PAD.r - 4} y={PAD.t - 6} textAnchor="end"
            fill="rgba(255,255,255,.18)" fontSize="7.5" fontFamily="monospace">
            (lower is better)
          </text>
        )}

        {/* Y-axis label */}
        <text x={13} y={H / 2} textAnchor="middle"
          fill="rgba(255,255,255,.22)" fontSize="9" fontFamily="monospace"
          transform={`rotate(-90, 13, ${H / 2})`}>
          {metric}
        </text>
      </svg>
    </div>
  );
}
