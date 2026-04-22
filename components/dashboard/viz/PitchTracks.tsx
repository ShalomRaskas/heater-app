"use client";

import { useMemo } from "react";
import type { PitcherPitchData, PitchEvent } from "@/lib/albert/viz-types";

export interface PitchTracksFilters {
  stand?: "L" | "R" | "all";
  pitchTypes?: string[];
}

/* ── SVG layout ───────────────────────────────────────────────────────────── */
const SVG_W = 800, SVG_H = 520;

// Vanishing point — pitcher's mound, drawn at top-center
const VP_X = 400, VP_Y = 72;

// Strike zone at the plate (dist = 0):
//   x: ±0.83 ft from center → ±120 SVG px → SZ_X1=280, SZ_X2=520
//   z: 1.5 ft (bottom) → 3.5 ft (top) = 2 ft range → 220 SVG px
const SZ_X1 = 280, SZ_X2 = 520;
const SZ_Y1 = 162, SZ_Y2 = 382;

const PX_PER_FT_X = (SZ_X2 - SZ_X1) / (2 * 0.83); // ≈ 144.6 px/ft
const PX_PER_FT_Z = (SZ_Y2 - SZ_Y1) / 2.0;         // = 110 px/ft
const Z_BOT_FT    = 1.5;

// Perspective: at dist d from plate, objects appear at scale = 1/(1 + d/DIST_UNIT)
// At release (~55 ft): scale ≈ 1/4.5 — objects appear small and near VP
const DIST_UNIT = 55 / 3.5; // ≈ 15.7 ft per unit

/** Project world coords (x ft horizontal, z ft height, dist ft from plate) → SVG. */
function project(x: number, z: number, dist: number): [number, number] {
  const scale = 1 / (1 + Math.max(0, dist) / DIST_UNIT);
  // Full-plate SVG position (what we'd see at dist=0)
  const plateSvgX = VP_X + x * PX_PER_FT_X;
  const plateSvgY = SZ_Y2 - (z - Z_BOT_FT) * PX_PER_FT_Z;
  // Lerp from vanishing point toward plate position, scaled by perspective
  return [
    VP_X + scale * (plateSvgX - VP_X),
    VP_Y + scale * (plateSvgY - VP_Y),
  ];
}

/* ── Physics trajectory ───────────────────────────────────────────────────── */
type TrajPt = { x: number; z: number; dist: number };

function computeTrajectory(
  rx: number, ry: number, rz: number,
  vx: number, vy: number, vz: number,
  ax: number, ay: number, az: number,
  nPts = 22,
): TrajPt[] {
  const t_plate = Math.abs(ry / vy);
  const pts: TrajPt[] = [];
  for (let i = 0; i <= nPts; i++) {
    const t = (i / nPts) * t_plate;
    pts.push({
      x:    rx + vx * t + 0.5 * ax * t * t,
      z:    rz + vz * t + 0.5 * az * t * t,
      dist: -(ry + vy * t + 0.5 * ay * t * t),
    });
  }
  return pts;
}

function trajToPolyline(pts: TrajPt[]): string {
  return pts
    .map(({ x, z, dist }) => {
      const [sx, sy] = project(x, z, dist);
      return `${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(" ");
}

/* ── Colors ───────────────────────────────────────────────────────────────── */
const PALETTE = [
  { stroke: "#ff9040", glow: "rgba(255,144,64,.35)" },
  { stroke: "#5bb8ff", glow: "rgba(91,184,255,.3)"  },
  { stroke: "#ff4444", glow: "rgba(255,68,68,.3)"   },
  { stroke: "#ffc840", glow: "rgba(255,200,64,.3)"  },
  { stroke: "#a0ff80", glow: "rgba(160,255,128,.25)"},
  { stroke: "#c084ff", glow: "rgba(192,132,255,.3)" },
  { stroke: "#ff80c0", glow: "rgba(255,128,192,.25)"},
  { stroke: "#ff6b35", glow: "rgba(255,107,53,.3)"  },
];

const SZ_W = SZ_X2 - SZ_X1;
const SZ_H = SZ_Y2 - SZ_Y1;

// Ground level at bottom of SVG — home plate lives here
const GND_Y     = SVG_H - 28;
const GND_L_X   = VP_X - 320; // = 80
const GND_R_X   = VP_X + 320; // = 720

export default function PitchTracks({
  data,
  caption,
  size = "inline",
  filters,
}: {
  data: PitcherPitchData;
  caption: string;
  size?: "inline" | "panel";
  filters?: PitchTracksFilters;
}) {
  const visibleTypes = useMemo(() => {
    const f = filters?.pitchTypes ?? [];
    return f.length > 0 ? data.pitchTypes.filter((pt) => f.includes(pt)) : data.pitchTypes;
  }, [data.pitchTypes, filters?.pitchTypes]);

  type TraceEntry = {
    pt: string;
    name: string;
    pal: typeof PALETTE[0];
    avgLine: TrajPt[];
    samples: TrajPt[][];
    avgVelo: number;
    avgPx: number;
    avgPz: number;
    count: number;
  };

  const traces = useMemo<TraceEntry[]>(() => {
    const out: TraceEntry[] = [];

    visibleTypes.forEach((pt, i) => {
      let evts = data.events.filter(
        (e) =>
          e.t === pt &&
          e.rx != null && e.ry != null && e.rz != null &&
          e.vx != null && e.vy != null && e.vz != null,
      );
      if (filters?.stand && filters.stand !== "all") {
        evts = evts.filter((e) => e.s === filters.stand);
      }
      if (evts.length === 0) return;

      function avg(key: keyof PitchEvent): number {
        const vals = evts
          .map((e) => e[key] as number | null)
          .filter((v): v is number => v != null);
        return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      }

      const aRx = avg("rx"), aRy = avg("ry"), aRz = avg("rz");
      const aVx = avg("vx"), aVy = avg("vy"), aVz = avg("vz");
      const aAx = avg("ax"), aAy = avg("ay"), aAz = avg("az");

      const avgLine = computeTrajectory(aRx, aRy, aRz, aVx, aVy, aVz, aAx, aAy, aAz);

      const step = Math.max(1, Math.floor(evts.length / 30));
      const samples = evts
        .filter((_, j) => j % step === 0)
        .slice(0, 30)
        .map((e) =>
          computeTrajectory(
            e.rx!, e.ry!, e.rz!,
            e.vx!, e.vy!, e.vz!,
            e.ax ?? aAx, e.ay ?? aAy, e.az ?? aAz,
          ),
        );

      // Average plate arrival from Statcast px/pz (more accurate than integrated)
      const pxVals = evts.map((e) => e.px).filter((v): v is number => v != null);
      const pzVals = evts.map((e) => e.pz).filter((v): v is number => v != null);
      const avgPx = pxVals.length > 0 ? pxVals.reduce((s, v) => s + v, 0) / pxVals.length : 0;
      const avgPz = pzVals.length > 0 ? pzVals.reduce((s, v) => s + v, 0) / pzVals.length : 0;

      out.push({
        pt,
        name: data.pitchNames[pt] ?? pt,
        pal: PALETTE[i % PALETTE.length],
        avgLine,
        samples,
        avgVelo: avg("rv"),
        avgPx,
        avgPz,
        count: evts.length,
      });
    });

    return out;
  }, [visibleTypes, data.events, filters?.stand, data.pitchNames]);

  const noData = traces.length === 0;
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
            "radial-gradient(55% 45% at 50% 15%, rgba(20,40,70,.18), transparent 65%), linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.25))",
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
              background: "radial-gradient(circle at 30% 30%, #ffb55a, #D32F2F)",
              boxShadow: "0 0 6px rgba(211,47,47,.4)", display: "inline-block",
            }} />
          )}
          {data.playerName}{data.teamAbbr ? ` · ${data.teamAbbr}` : ""}
        </div>

        {/* Season label */}
        <div
          style={{
            position: "absolute", top: "10px", right: "12px", zIndex: 2,
            fontFamily: "var(--font-mono)", fontSize: "8.5px",
            color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".1em",
          }}
        >
          {data.season} · CATCHER POV
        </div>

        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width={SVG_W}
          height={SVG_H}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          {/* ── Field perspective ── */}
          {/* Ground triangle (foul lines to VP) */}
          <polygon
            points={`${GND_L_X},${GND_Y} ${VP_X},${VP_Y} ${GND_R_X},${GND_Y}`}
            fill="rgba(34,60,34,.07)"
            stroke="none"
          />
          <line x1={GND_L_X} y1={GND_Y} x2={VP_X} y2={VP_Y}
            stroke="rgba(255,255,255,.07)" strokeWidth="0.75" />
          <line x1={GND_R_X} y1={GND_Y} x2={VP_X} y2={VP_Y}
            stroke="rgba(255,255,255,.07)" strokeWidth="0.75" />

          {/* Pitcher's mound at vanishing point */}
          <circle cx={VP_X} cy={VP_Y} r="16"
            fill="rgba(150,100,50,.1)" stroke="none" />
          <circle cx={VP_X} cy={VP_Y} r="4"
            fill="rgba(180,120,60,.4)" stroke="rgba(200,140,70,.6)" strokeWidth="0.75" />
          <text
            x={VP_X} y={VP_Y - 20}
            textAnchor="middle"
            fontFamily="JetBrains Mono, var(--font-mono), monospace"
            fontSize="7" fill="rgba(255,255,255,.18)" letterSpacing="1.2"
          >
            MOUND
          </text>

          {/* Perspective depth rings (distance markers) */}
          {[10, 20, 30, 40, 50].map((dist) => {
            const [lx, ly] = project(-0.83, 2.5, dist);
            const [rx2, ry2] = project(0.83, 2.5, dist);
            return (
              <line key={`ring-${dist}`}
                x1={lx} y1={ly} x2={rx2} y2={ry2}
                stroke="rgba(255,255,255,.04)" strokeWidth="0.5"
              />
            );
          })}

          {/* ── Strike zone ── */}
          {/* Background fill */}
          <rect x={SZ_X1} y={SZ_Y1} width={SZ_W} height={SZ_H}
            fill="rgba(255,255,255,.015)" />
          {/* Zone thirds (vertical) */}
          {[1, 2].map((i) => (
            <line key={`vt-${i}`}
              x1={SZ_X1 + SZ_W / 3 * i} y1={SZ_Y1}
              x2={SZ_X1 + SZ_W / 3 * i} y2={SZ_Y2}
              stroke="rgba(255,255,255,.07)" strokeWidth="0.5"
            />
          ))}
          {/* Zone thirds (horizontal) */}
          {[1, 2].map((i) => (
            <line key={`ht-${i}`}
              x1={SZ_X1} y1={SZ_Y1 + SZ_H / 3 * i}
              x2={SZ_X2} y2={SZ_Y1 + SZ_H / 3 * i}
              stroke="rgba(255,255,255,.07)" strokeWidth="0.5"
            />
          ))}
          {/* Zone border */}
          <rect x={SZ_X1} y={SZ_Y1} width={SZ_W} height={SZ_H}
            fill="none"
            stroke="rgba(255,255,255,.28)"
            strokeWidth="1"
            strokeDasharray="5 3"
          />
          {/* Height labels */}
          {[1.5, 2.5, 3.5].map((z) => {
            const [,sy] = project(0, z, 0);
            return (
              <text key={`z-${z}`}
                x={SZ_X1 - 6} y={sy + 3}
                textAnchor="end"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="7.5" fill="rgba(255,255,255,.2)"
              >
                {z}&apos;
              </text>
            );
          })}

          {/* ── Home plate ── */}
          <polygon
            points={`
              ${VP_X},${GND_Y + 20}
              ${VP_X + 22},${GND_Y + 6}
              ${VP_X + 22},${GND_Y - 10}
              ${VP_X - 22},${GND_Y - 10}
              ${VP_X - 22},${GND_Y + 6}
            `}
            fill="rgba(255,255,255,.2)"
            stroke="rgba(255,255,255,.5)"
            strokeWidth="1"
          />

          {/* ── Sample traces (faint bundle) ── */}
          {traces.map(({ pt, pal, samples }) =>
            samples.map((pts, j) => (
              <polyline
                key={`s-${pt}-${j}`}
                points={trajToPolyline(pts)}
                fill="none"
                stroke={pal.stroke}
                strokeWidth="0.65"
                opacity="0.12"
              />
            )),
          )}

          {/* ── Average trajectory lines ── */}
          {traces.map(({ pt, pal, avgLine, avgPx, avgPz }) => {
            const [endX, endY] = project(avgPx, avgPz, 0);
            const startPt = avgLine[0];
            const [startX, startY] = project(startPt.x, startPt.z, startPt.dist);

            return (
              <g key={`avg-${pt}`}>
                {/* Glow */}
                <polyline
                  points={trajToPolyline(avgLine)}
                  fill="none"
                  stroke={pal.glow}
                  strokeWidth="7"
                  opacity="0.6"
                  strokeLinecap="round"
                />
                {/* Main line */}
                <polyline
                  points={trajToPolyline(avgLine)}
                  fill="none"
                  stroke={pal.stroke}
                  strokeWidth="2"
                  opacity="0.92"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Plate arrival: ring + dot */}
                <circle cx={endX} cy={endY} r="10"
                  fill="none" stroke={pal.stroke} strokeWidth="1" opacity="0.35" />
                <circle cx={endX} cy={endY} r="5"
                  fill={pal.stroke} opacity="0.9" />
                {/* Pitch label near release */}
                <text
                  x={startX} y={startY - 8}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, var(--font-mono), monospace"
                  fontSize="8" fontWeight="600" fill={pal.stroke}
                >
                  {pt}
                </text>
              </g>
            );
          })}

          {/* ── Legend (right side) ── */}
          {traces.map(({ pt, name, pal, avgVelo, count }, i) => (
            <g key={`leg-${pt}`} transform={`translate(${SVG_W - 138}, ${32 + i * 42})`}>
              <line x1="0" y1="10" x2="22" y2="10"
                stroke={pal.stroke} strokeWidth="2" strokeLinecap="round" />
              <circle cx="22" cy="10" r="3.5" fill={pal.stroke} />
              <text x="30" y="8"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="8.5" fontWeight="600" fill={pal.stroke}
              >
                {pt}
              </text>
              <text x="30" y="18"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="7.5" fill={pal.stroke} opacity="0.65"
              >
                {name}
              </text>
              <text x="30" y="28"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="7" fill="rgba(255,255,255,.35)"
              >
                {avgVelo > 0 ? `${avgVelo.toFixed(1)} mph` : "—"} · {count}p
              </text>
            </g>
          ))}

          {/* ── No data overlay ── */}
          {noData && (
            <g>
              <rect x="200" y="220" width="400" height="50" rx="8"
                fill="rgba(10,10,18,.88)" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
              <text x="400" y="250" textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="12" fill="rgba(255,255,255,.4)" letterSpacing="1"
              >
                NO PITCH DATA AVAILABLE
              </text>
            </g>
          )}
        </svg>
      </div>

      {size === "inline" && (
        <div
          style={{
            marginTop: "7px", fontFamily: "var(--font-mono)", fontSize: "9.5px",
            color: "rgba(255,255,255,.38)", textTransform: "uppercase",
            letterSpacing: ".12em", lineHeight: 1.4, textAlign: "center",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
