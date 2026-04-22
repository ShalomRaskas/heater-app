"use client";

import { useState, useMemo } from "react";
import type { SprayChartData, BattedBallEvent } from "@/lib/albert/viz-types";

export interface SprayChartFilters {
  handedness?: "L" | "R" | "all";
  countState?: "2strike" | "even" | "ahead" | "behind" | "all";
  pitchTypes?: string[]; // empty = all
}

function applyFilters(events: BattedBallEvent[], f: SprayChartFilters): BattedBallEvent[] {
  return events.filter((e) => {
    if (f.handedness && f.handedness !== "all" && e.p_throws !== f.handedness) return false;
    if (f.countState && f.countState !== "all") {
      const b = e.balls ?? 0;
      const s = e.strikes ?? 0;
      if (f.countState === "2strike" && s !== 2) return false;
      if (f.countState === "even" && (b !== s || s === 2)) return false;
      if (f.countState === "ahead" && !(b > s && s < 2)) return false;
      if (f.countState === "behind" && !(s > b && s < 2)) return false;
    }
    if (f.pitchTypes && f.pitchTypes.length > 0 && !f.pitchTypes.includes(e.pitch_type ?? "")) return false;
    return true;
  });
}

/* ── Coordinate transform ─────────────────────────────────────────────────────
 * Savant hc_x: 0 = left foul line edge, 125 = center, 250 = right foul line
 * Savant hc_y: 0 = far outfield, 200 = home plate area (y increases toward plate)
 * SVG viewBox: 0 0 800 700
 * We map hc_x=125, hc_y=200 → SVG (400, 640) (home plate)
 */
function toSVG(hcX: number, hcY: number): [number, number] {
  return [400 + (hcX - 125) * 2.8, 640 + (hcY - 200) * 3.6];
}

/* ── Color by outcome ─────────────────────────────────────────────────────── */
type OutcomeGroup = "hr" | "triple" | "double" | "single" | "out";

function outcomeGroup(event: string | null): OutcomeGroup {
  if (event === "home_run") return "hr";
  if (event === "triple") return "triple";
  if (event === "double") return "double";
  if (event === "single") return "single";
  return "out";
}

const STROKE: Record<OutcomeGroup, string> = {
  hr:     "#D32F2F",
  triple: "#ffb347",
  double: "#ff8040",
  single: "#c8a85a",
  out:    "rgba(255,255,255,.18)",
};

const FILL: Record<OutcomeGroup, string> = {
  hr:     "rgba(211,47,47,.45)",
  triple: "rgba(255,179,71,.35)",
  double: "rgba(255,128,64,.30)",
  single: "rgba(200,168,90,.20)",
  out:    "rgba(255,255,255,.04)",
};

function dotRadius(launchSpeed: number | null): number {
  if (launchSpeed == null) return 4;
  if (launchSpeed >= 100) return 7.5;
  if (launchSpeed >= 90)  return 6;
  return 4.5;
}

/* ── Field overlay paths ──────────────────────────────────────────────────── */
// SVG viewBox: 0 -30 800 760 (plate at y=640, CF wall at y≈10, 30px headroom at top)
//
// Foul pole positions derived from Savant hc_x/hc_y space via toSVG:
//   LF pole ≈ hcX=15, hcY=120  → SVG (92, 352)
//   RF pole ≈ hcX=235, hcY=120 → SVG (708, 352)
//   CF wall ≈ hcX=125, hcY=25  → SVG (400, 10)
//
// Outfield arc: circle of radius 310 centred at (400, 320) passes through all three.
//   From LF(92,352) → CF(400,10) → RF(708,352): minor counter-clockwise arc (sweep=0, large=0).

function FieldOverlay() {
  const plateX = 400, plateY = 640;
  const lfX = 92,  lfY = 352;   // LF foul pole
  const rfX = 708, rfY = 352;   // RF foul pole
  const arcR = 310;              // radius that passes through CF(400,10)

  // Infield diamond (mapped from typical Savant hc coords)
  const b1 = [520, 550] as const;  // 1st base
  const b2 = [400, 460] as const;  // 2nd base
  const b3 = [280, 550] as const;  // 3rd base

  return (
    <g>
      {/* Outfield grass fill: plate → LF → arc (minor CCW) → RF → plate */}
      <path
        d={`M ${plateX} ${plateY} L ${lfX} ${lfY} A ${arcR} ${arcR} 0 0 0 ${rfX} ${rfY} Z`}
        fill="rgba(40,80,40,.12)"
        stroke="none"
      />

      {/* Foul lines */}
      <line x1={plateX} y1={plateY} x2={lfX} y2={lfY}
        stroke="rgba(255,255,255,.12)" strokeWidth="0.75" />
      <line x1={plateX} y1={plateY} x2={rfX} y2={rfY}
        stroke="rgba(255,255,255,.12)" strokeWidth="0.75" />

      {/* Outfield wall arc (minor CCW from LF → CF → RF) */}
      <path
        d={`M ${lfX} ${lfY} A ${arcR} ${arcR} 0 0 0 ${rfX} ${rfY}`}
        fill="none"
        stroke="rgba(255,255,255,.18)"
        strokeWidth="1"
      />

      {/* Infield dirt */}
      <circle cx={plateX} cy={555} r={118}
        fill="rgba(180,120,60,.06)" stroke="rgba(180,120,60,.10)" strokeWidth="0.75" />

      {/* Base paths */}
      <polyline
        points={`${plateX},${plateY} ${b1[0]},${b1[1]} ${b2[0]},${b2[1]} ${b3[0]},${b3[1]} ${plateX},${plateY}`}
        fill="none"
        stroke="rgba(255,255,255,.15)"
        strokeWidth="0.75"
      />

      {/* Base squares */}
      {[b1, b2, b3].map(([bx, by], i) => (
        <rect key={i} x={bx - 4} y={by - 4} width="8" height="8"
          fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.3)" strokeWidth="0.5"
          transform={`rotate(45 ${bx} ${by})`}
        />
      ))}

      {/* Home plate */}
      <polygon
        points={`${plateX},${plateY - 7} ${plateX + 7},${plateY} ${plateX + 7},${plateY + 5} ${plateX - 7},${plateY + 5} ${plateX - 7},${plateY}`}
        fill="rgba(255,255,255,.25)"
        stroke="rgba(255,255,255,.4)"
        strokeWidth="0.5"
      />
    </g>
  );
}

/* ── Legend ──────────────────────────────────────────────────────────────── */
const LEGEND: { group: OutcomeGroup; label: string }[] = [
  { group: "hr",     label: "Home Run" },
  { group: "triple", label: "Triple" },
  { group: "double", label: "Double" },
  { group: "single", label: "Single" },
  { group: "out",    label: "Out" },
];

export default function SprayChart({
  data,
  caption,
  size = "inline",
  filters,
}: {
  data: SprayChartData;
  caption: string;
  size?: "inline" | "panel";
  filters?: SprayChartFilters;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const visibleEvents = useMemo(
    () => (filters ? applyFilters(data.events, filters) : data.events),
    [data.events, filters],
  );

  const tooFew = visibleEvents.length < 5 && data.events.length >= 5;

  // Separate hits from outs for layering (outs first, hits on top)
  const outs = visibleEvents.filter((e) => outcomeGroup(e.events) === "out");
  const hits = visibleEvents.filter((e) => outcomeGroup(e.events) !== "out");

  const renderDot = (e: BattedBallEvent, i: number, localIdx: number) => {
    if (e.hit_coord_x == null || e.hit_coord_y == null) return null;
    const [cx, cy] = toSVG(e.hit_coord_x, e.hit_coord_y);
    const group = outcomeGroup(e.events);
    const r = dotRadius(e.launch_speed);
    const isHov = hovered === localIdx;

    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={isHov ? r * 1.5 : r}
        fill={FILL[group]}
        stroke={STROKE[group]}
        strokeWidth={group === "out" ? 0.4 : isHov ? 1.5 : 0.8}
        opacity={group === "out" ? 0.5 : 1}
        style={{ cursor: "pointer", transition: "r .1s, opacity .1s" }}
        onMouseEnter={() => setHovered(localIdx)}
        onMouseLeave={() => setHovered(null)}
      />
    );
  };

  // Hovered event for tooltip
  const hovEv = hovered != null ? visibleEvents[hovered] : null;
  const hovCoords =
    hovEv?.hit_coord_x != null && hovEv?.hit_coord_y != null
      ? toSVG(hovEv.hit_coord_x, hovEv.hit_coord_y)
      : null;

  // Stats summary (from visible events)
  const totalHits = visibleEvents.filter((e) =>
    ["single", "double", "triple", "home_run"].includes(e.events ?? ""),
  ).length;
  const hrs = visibleEvents.filter((e) => e.events === "home_run").length;
  const total = visibleEvents.length;

  const containerStyle: React.CSSProperties =
    size === "panel"
      ? { marginTop: 0, marginBottom: 0 }
      : { marginTop: "12px", marginBottom: "4px" };

  return (
    <div style={containerStyle}>
      <div
        style={{
          position: "relative",
          borderRadius: "10px",
          overflow: "hidden",
          background:
            "radial-gradient(60% 50% at 50% 40%, rgba(40,80,40,.08), transparent 65%), linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.25))",
          border: "0.5px solid rgba(255,255,255,.08)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,.3)",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.015) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(255,255,255,.015) 0.5px, transparent 0.5px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse 75% 75% at 50% 45%, black, transparent 100%)",
          }}
        />

        {/* Player label */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "12px",
            zIndex: 2,
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "rgba(255,255,255,.55)",
            textTransform: "uppercase",
            letterSpacing: ".14em",
            padding: "3px 8px",
            background: "rgba(10,10,15,.6)",
            border: "0.5px solid rgba(255,255,255,.08)",
            borderRadius: "5px",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            gap: "7px",
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
              background: "radial-gradient(circle at 30% 30%, #ffb55a, #D32F2F)",
              boxShadow: "0 0 6px rgba(211,47,47,.4)", display: "inline-block", flexShrink: 0,
            }} />
          )}
          {data.playerName}
          {data.teamAbbr ? ` · ${data.teamAbbr}` : ""}
        </div>

        {/* Season + summary label */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "12px",
            zIndex: 2,
            fontFamily: "var(--font-mono)",
            fontSize: "8.5px",
            color: "rgba(255,255,255,.3)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
            textAlign: "right",
            lineHeight: 1.6,
          }}
        >
          <div>Statcast · {data.season}</div>
          <div style={{ color: "rgba(255,255,255,.2)" }}>
            {totalHits}H · {hrs}HR · {total} BIP
          </div>
        </div>

        {/* SVG chart */}
        <svg
          viewBox="0 -90 800 800"
          width="800"
          height="800"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <FieldOverlay />

          {/* Outs (rendered first, underneath hits) */}
          <g>{outs.map((e) => {
            const li = visibleEvents.indexOf(e);
            return renderDot(e, li, li);
          })}</g>

          {/* Hits (rendered on top) */}
          <g>{hits.map((e) => {
            const li = visibleEvents.indexOf(e);
            return renderDot(e, li, li);
          })}</g>

          {/* Too-few-events overlay */}
          {tooFew && (
            <g>
              <rect x="200" y="290" width="400" height="60" rx="8"
                fill="rgba(10,10,18,.88)" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
              <text x="400" y="325" textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="12" fill="rgba(255,255,255,.5)" letterSpacing="1">
                TOO FEW EVENTS — TRY BROADENING FILTERS
              </text>
            </g>
          )}

          {/* Hover tooltip */}
          {hovEv && hovCoords && (
            <g>
              <rect
                x={hovCoords[0] - 68}
                y={hovCoords[1] - 58}
                width="136"
                height="44"
                rx="5"
                fill="rgba(10,10,18,.92)"
                stroke="rgba(255,150,60,.4)"
                strokeWidth="0.5"
              />
              <text
                x={hovCoords[0]}
                y={hovCoords[1] - 40}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="9.5"
                fontWeight="600"
                fill="rgba(255,200,100,.9)"
                letterSpacing="0.3"
              >
                {hovEv.events?.replace(/_/g, " ") ?? "unknown"}
              </text>
              <text
                x={hovCoords[0]}
                y={hovCoords[1] - 24}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="8.5"
                fill="rgba(255,180,80,.7)"
              >
                {hovEv.launch_speed != null ? `${hovEv.launch_speed} mph` : "—"}
                {hovEv.launch_angle != null ? ` · ${hovEv.launch_angle}°` : ""}
                {hovEv.hit_distance != null ? ` · ${hovEv.hit_distance}ft` : ""}
              </text>
            </g>
          )}
        </svg>

        {/* Legend */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "12px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            zIndex: 2,
          }}
        >
          {LEGEND.map(({ group, label }) => (
            <div
              key={group}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "8px",
                color: "rgba(255,255,255,.4)",
                textTransform: "uppercase",
                letterSpacing: ".1em",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: FILL[group],
                  border: `1px solid ${STROKE[group]}`,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Caption — inline only; panel renders its own */}
      {size === "inline" && (
        <div
          style={{
            marginTop: "7px",
            fontFamily: "var(--font-mono)",
            fontStyle: "normal",
            fontSize: "9.5px",
            color: "rgba(255,255,255,.38)",
            textTransform: "uppercase",
            letterSpacing: ".12em",
            lineHeight: 1.4,
            textAlign: "center",
            paddingLeft: "4px",
            paddingRight: "4px",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
