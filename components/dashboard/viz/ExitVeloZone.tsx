"use client";

import { useMemo } from "react";
import type { SprayChartData } from "@/lib/albert/viz-types";

export interface ExitVeloZoneFilters {
  handedness?: "L" | "R" | "all";
  pitchTypes?: string[];
}

/* ── Grid config ──────────────────────────────────────────────────────────── */
// Field in hc_x/hc_y space: hc_x 0–250 (125=center), hc_y 0–200 (200=plate)
// Divide into 8 horizontal × 6 depth cells
const COLS = 8;
const ROWS = 6;
const CELL_W = 250 / COLS;   // 31.25 units
const CELL_H = 200 / ROWS;   // 33.33 units

// Map hc_x/y → SVG (same transform as SprayChart)
function toSVG(hcX: number, hcY: number): [number, number] {
  return [400 + (hcX - 125) * 2.8, 640 + (hcY - 200) * 3.6];
}

/* ── EV color scale ───────────────────────────────────────────────────────── */
function evColor(avgEV: number | null, count: number): string {
  if (!avgEV || count < 2) return "rgba(255,255,255,.03)";
  if (avgEV >= 100) return "rgba(211,47,47,.65)";
  if (avgEV >= 95)  return "rgba(255,90,30,.55)";
  if (avgEV >= 90)  return "rgba(255,160,40,.45)";
  if (avgEV >= 85)  return "rgba(255,210,60,.35)";
  if (avgEV >= 80)  return "rgba(180,210,255,.28)";
  return "rgba(80,120,220,.22)";
}

function evStroke(avgEV: number | null, count: number): string {
  if (!avgEV || count < 2) return "rgba(255,255,255,.04)";
  if (avgEV >= 95)  return "rgba(211,47,47,.5)";
  if (avgEV >= 88)  return "rgba(255,150,30,.4)";
  return "rgba(120,160,255,.3)";
}

/* ── FieldLines — same coordinate system as SprayChart ──────────────────── */
// LF pole (92,352), RF pole (708,352), arc r=310 counter-clockwise (sweep=0).
function FieldLines() {
  return (
    <g opacity=".3">
      {/* Foul lines */}
      <line x1="400" y1="640" x2="92"  y2="352" stroke="rgba(255,255,255,.4)" strokeWidth="0.5" />
      <line x1="400" y1="640" x2="708" y2="352" stroke="rgba(255,255,255,.4)" strokeWidth="0.5" />
      {/* Outfield wall arc: minor CCW from LF→CF→RF */}
      <path d="M 92 352 A 310 310 0 0 0 708 352" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="0.5" />
      {/* Infield dirt */}
      <circle cx="400" cy="555" r="118" fill="none" stroke="rgba(255,200,100,.10)" strokeWidth="0.5" />
      {/* Bases */}
      <rect x="516" y="546" width="8" height="8" fill="rgba(255,255,255,.3)" transform="rotate(45 520 550)" />
      <rect x="396" y="456" width="8" height="8" fill="rgba(255,255,255,.3)" transform="rotate(45 400 460)" />
      <rect x="276" y="546" width="8" height="8" fill="rgba(255,255,255,.3)" transform="rotate(45 280 550)" />
    </g>
  );
}

export default function ExitVeloZone({
  data,
  caption,
  size = "inline",
  filters,
}: {
  data: SprayChartData;
  caption: string;
  size?: "inline" | "panel";
  filters?: ExitVeloZoneFilters;
}) {
  const cells = useMemo(() => {
    let evts = data.events;
    if (filters?.handedness && filters.handedness !== "all") {
      evts = evts.filter((e) => e.p_throws === filters.handedness);
    }
    if (filters?.pitchTypes && filters.pitchTypes.length > 0) {
      evts = evts.filter((e) => filters.pitchTypes!.includes(e.pitch_type ?? ""));
    }

    // Aggregate into grid cells
    type Cell = { sumEV: number; count: number; hardHit: number };
    const grid: Record<string, Cell> = {};

    for (const e of evts) {
      if (e.hit_coord_x == null || e.hit_coord_y == null) continue;
      const col = Math.min(Math.floor(e.hit_coord_x / CELL_W), COLS - 1);
      const row = Math.min(Math.floor(e.hit_coord_y / CELL_H), ROWS - 1);
      const key = `${col}-${row}`;
      if (!grid[key]) grid[key] = { sumEV: 0, count: 0, hardHit: 0 };
      grid[key].count++;
      if (e.launch_speed) {
        grid[key].sumEV += e.launch_speed;
        if (e.launch_speed >= 95) grid[key].hardHit++;
      }
    }

    return Object.entries(grid).map(([key, cell]) => {
      const [col, row] = key.split("-").map(Number);
      const hcX = col * CELL_W + CELL_W / 2;
      const hcY = row * CELL_H + CELL_H / 2;
      const [svgX, svgY] = toSVG(hcX, hcY);
      const avgEV = cell.count > 0 ? cell.sumEV / cell.count : null;
      return { col, row, svgX, svgY, avgEV, count: cell.count, hardHit: cell.hardHit };
    });
  }, [data.events, filters?.handedness, filters?.pitchTypes]);

  const totalEvents = data.events.length;
  const containerStyle: React.CSSProperties =
    size === "panel" ? { marginTop: 0 } : { marginTop: "12px", marginBottom: "4px" };

  const cellSvgW = CELL_W * 2.8;
  const cellSvgH = CELL_H * 3.6;

  return (
    <div style={containerStyle}>
      <div
        style={{
          position: "relative",
          borderRadius: "10px",
          overflow: "hidden",
          background:
            "radial-gradient(60% 50% at 50% 60%, rgba(34,80,34,.1), transparent 65%), linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.25))",
          border: "0.5px solid rgba(255,255,255,.08)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,.3)",
        }}
      >
        {/* Player label */}
        <div
          style={{
            position: "absolute", top: "10px", left: "12px", zIndex: 2,
            fontFamily: "var(--font-mono)", fontSize: "9px",
            color: "rgba(255,255,255,.55)", textTransform: "uppercase",
            letterSpacing: ".14em", padding: "3px 8px",
            background: "rgba(10,10,15,.6)", border: "0.5px solid rgba(255,255,255,.08)",
            borderRadius: "5px", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", gap: "7px",
          }}
        >
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
              background: "radial-gradient(circle at 30% 30%, #90ee90, #2d7a2d)",
              boxShadow: "0 0 6px rgba(50,180,50,.4)", display: "inline-block",
            }} />
          )}
          {data.playerName}{data.teamAbbr ? ` · ${data.teamAbbr}` : ""}
        </div>

        {/* Season + events label */}
        <div style={{
          position: "absolute", top: "10px", right: "12px", zIndex: 2,
          fontFamily: "var(--font-mono)", fontSize: "8.5px",
          color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".1em",
        }}>
          {data.season} · {totalEvents} BIP
        </div>

        <svg
          viewBox="0 -90 800 800"
          width="800" height="800"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          {/* Heat zones */}
          {cells.map(({ col, row, svgX, svgY, avgEV, count }) => (
            <rect
              key={`${col}-${row}`}
              x={svgX - cellSvgW / 2}
              y={svgY - cellSvgH / 2}
              width={cellSvgW}
              height={cellSvgH}
              fill={evColor(avgEV, count)}
              stroke={evStroke(avgEV, count)}
              strokeWidth="0.5"
            />
          ))}

          {/* Field lines on top */}
          <FieldLines />

          {/* Cell EV labels */}
          {cells.filter((c) => c.count >= 3 && c.avgEV).map(({ col, row, svgX, svgY, avgEV }) => (
            <text
              key={`lbl-${col}-${row}`}
              x={svgX} y={svgY + 4}
              textAnchor="middle"
              fontFamily="JetBrains Mono, var(--font-mono), monospace"
              fontSize="10"
              fontWeight="600"
              fill="rgba(255,255,255,.85)"
            >
              {avgEV!.toFixed(0)}
            </text>
          ))}

          {/* Home plate */}
          <polygon
            points="400,640 412,628 412,616 388,616 388,628"
            fill="rgba(255,255,255,.15)"
            stroke="rgba(255,255,255,.3)"
            strokeWidth="0.5"
          />
        </svg>

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: "10px", left: "50%",
          transform: "translateX(-50%)",
          display: "flex", gap: "10px", alignItems: "center",
          background: "rgba(10,10,15,.7)", borderRadius: "5px",
          padding: "4px 10px", border: "0.5px solid rgba(255,255,255,.06)",
        }}>
          {[
            { label: "< 80", color: "rgba(80,120,220,.7)" },
            { label: "80–89", color: "rgba(255,210,60,.7)" },
            { label: "90–94", color: "rgba(255,160,40,.8)" },
            { label: "95+", color: "rgba(255,90,30,.9)" },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "7.5px",
                color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".08em",
              }}>{label}</span>
            </div>
          ))}
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "7.5px",
            color: "rgba(255,255,255,.25)", textTransform: "uppercase",
            letterSpacing: ".08em", marginLeft: "2px",
          }}>mph EV</span>
        </div>
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
