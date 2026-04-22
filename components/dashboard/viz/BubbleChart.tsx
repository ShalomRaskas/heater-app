"use client";

import { useState, useMemo } from "react";
import type { BubbleChartData } from "@/lib/albert/viz-types";

export interface BubbleChartFilters {
  pitchTypes?: string[]; // empty = all
}

/* ── Same coordinate system as CockpitPanel ──────────────────────────────── */
const CX = 400;
const CY = 220;
const SX = 16; // px per inch, horizontal
const SY = 8;  // px per inch, vertical

function toSVG(pfxX: number, pfxZ: number): [number, number] {
  return [CX + pfxX * SX, CY - pfxZ * SY];
}

function bubbleR(usagePct: number): number {
  return Math.max(12, Math.sqrt(usagePct * 100) * 9);
}

const HOT_STROKE = ["#ff9040", "#ff7a3a", "#ff8555", "#ea4040", "#ffa060", "#ff6040"];
const HOT_FILL = [
  "rgba(255,160,80,.18)",
  "rgba(255,107,53,.22)",
  "rgba(255,107,53,.20)",
  "rgba(211,47,47,.20)",
  "rgba(255,140,60,.18)",
  "rgba(255,90,40,.18)",
];

export default function BubbleChart({
  data,
  caption,
  size = "inline",
  filters,
}: {
  data: BubbleChartData;
  caption: string;
  size?: "inline" | "panel";
  filters?: BubbleChartFilters;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Only plot pitches with ≥1% usage and valid movement data, then apply pitch type filter
  const pitches = useMemo(() => {
    let pts = data.pitches.filter((p) => (p.usagePct ?? 0) >= 0.01);
    if (filters?.pitchTypes && filters.pitchTypes.length > 0) {
      pts = pts.filter((p) => filters.pitchTypes!.includes(p.pitchType));
    }
    return pts;
  }, [data.pitches, filters?.pitchTypes]);

  const tooFew = pitches.length === 0 && data.pitches.length > 0;

  const containerStyle: React.CSSProperties =
    size === "panel"
      ? { marginTop: 0, marginBottom: 0 }
      : { marginTop: "12px", marginBottom: "4px" };

  return (
    <div style={containerStyle}>
      {/* ── Chart container ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          borderRadius: "10px",
          overflow: "hidden",
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(211,47,47,.06), transparent 65%), linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.25))",
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
              "linear-gradient(rgba(255,255,255,.02) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(255,255,255,.02) 0.5px, transparent 0.5px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse 75% 75% at 50% 50%, black, transparent 100%)",
          }}
        />

        {/* Player label — top left */}
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

        {/* Season label — top right */}
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
          }}
        >
          Statcast · 2025
        </div>

        {/* SVG chart — same viewBox and scale as CockpitPanel */}
        <svg
          viewBox="0 0 800 440"
          width="800"
          height="440"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <defs>
            {pitches.map((d, i) => (
              <radialGradient
                key={d.pitchType}
                id={`bc-g-${d.pitchType}-${data.playerName.replace(/\s/g, "")}`}
                cx=".3"
                cy=".3"
                r=".9"
              >
                <stop offset="0%" stopColor="#ffe08a" stopOpacity=".95" />
                <stop
                  offset="40%"
                  stopColor={HOT_STROKE[i % HOT_STROKE.length]}
                  stopOpacity=".8"
                />
                <stop offset="100%" stopColor="#D32F2F" stopOpacity="0" />
              </radialGradient>
            ))}
            <filter
              id={`bc-soft-${data.playerName.replace(/\s/g, "")}`}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* Axis lines */}
          <line
            x1="400" y1="40" x2="400" y2="400"
            stroke="rgba(255,255,255,.08)" strokeDasharray="3 5"
          />
          <line
            x1="60" y1="220" x2="740" y2="220"
            stroke="rgba(255,255,255,.08)" strokeDasharray="3 5"
          />
          <line x1="60" y1="40" x2="60" y2="400" stroke="rgba(255,255,255,.05)" />
          <line x1="60" y1="400" x2="740" y2="400" stroke="rgba(255,255,255,.05)" />

          {/* Quadrant labels */}
          {[
            { x: 72, y: 56, anchor: "start", label: "ARM-SIDE · RISE" },
            { x: 740, y: 56, anchor: "end", label: "GLOVE-SIDE · RISE" },
            { x: 72, y: 395, anchor: "start", label: "ARM-SIDE · DROP" },
            { x: 740, y: 395, anchor: "end", label: "GLOVE-SIDE · DROP" },
          ].map((q) => (
            <text
              key={q.label}
              x={q.x}
              y={q.y}
              fontFamily="JetBrains Mono, var(--font-mono), monospace"
              fontSize="10"
              fill="rgba(255,255,255,.2)"
              textAnchor={q.anchor as "start" | "end"}
              letterSpacing="1.2"
            >
              {q.label}
            </text>
          ))}

          {/* Horizontal tick marks */}
          {[-20, -10, 10, 20].map((in_) => (
            <g key={`tx-${in_}`}>
              <line
                x1={CX + in_ * SX} y1={CY - 4}
                x2={CX + in_ * SX} y2={CY + 4}
                stroke="rgba(255,255,255,.12)"
              />
              <text
                x={CX + in_ * SX} y={CY + 14}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="8"
                fill="rgba(255,255,255,.2)"
              >
                {in_}″
              </text>
            </g>
          ))}

          {/* Vertical tick marks */}
          {[-15, -5, 5, 15].map((in_) => (
            <g key={`ty-${in_}`}>
              <line
                x1={CX - 4} y1={CY - in_ * SY}
                x2={CX + 4} y2={CY - in_ * SY}
                stroke="rgba(255,255,255,.12)"
              />
              <text
                x={CX + 9} y={CY - in_ * SY + 3}
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="8"
                fill="rgba(255,255,255,.2)"
              >
                {in_}″
              </text>
            </g>
          ))}

          {/* Glow halos */}
          <g>
            {pitches.map((d) => {
              if (d.horizontalBreakIn == null || d.verticalBreakIn == null) return null;
              const [cx, cy] = toSVG(d.horizontalBreakIn, d.verticalBreakIn);
              const r = bubbleR(d.usagePct ?? 0);
              const gradId = `bc-g-${d.pitchType}-${data.playerName.replace(/\s/g, "")}`;
              const filterId = `bc-soft-${data.playerName.replace(/\s/g, "")}`;
              return (
                <circle
                  key={`halo-${d.pitchType}`}
                  cx={cx} cy={cy} r={r * 1.45}
                  fill={`url(#${gradId})`}
                  filter={`url(#${filterId})`}
                  opacity={hovered === d.pitchType ? 0.75 : 0.45}
                  style={{ transition: "opacity .2s" }}
                />
              );
            })}
          </g>

          {/* Solid bubbles */}
          <g>
            {pitches.map((d, i) => {
              if (d.horizontalBreakIn == null || d.verticalBreakIn == null) return null;
              const [cx, cy] = toSVG(d.horizontalBreakIn, d.verticalBreakIn);
              const r = bubbleR(d.usagePct ?? 0);
              const isHov = hovered === d.pitchType;
              const strokeColor = HOT_STROKE[i % HOT_STROKE.length];
              const fillColor = HOT_FILL[i % HOT_FILL.length];

              return (
                <g
                  key={`bubble-${d.pitchType}`}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(d.pitchType)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <circle
                    cx={cx} cy={cy}
                    r={isHov ? r * 1.08 : r}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isHov ? 1.5 : 1}
                    style={{ transition: "all .2s" }}
                  />
                  {/* Pitch type label */}
                  <text
                    x={cx} y={cy - 4}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, var(--font-mono), monospace"
                    fontWeight="500"
                    fontSize={r > 45 ? 12 : r > 30 ? 11 : 10}
                    fill="#fff"
                  >
                    {d.pitchType}
                  </text>
                  {/* Velocity label */}
                  <text
                    x={cx} y={cy + 10}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, var(--font-mono), monospace"
                    fontSize="9"
                    fill="rgba(255,255,255,.6)"
                    letterSpacing="1"
                  >
                    {d.avgVelocity?.toFixed(1)}
                  </text>

                  {/* Hover tooltip */}
                  {isHov && (
                    <g>
                      <rect
                        x={cx - 56} y={cy - r - 46}
                        width="112" height="38"
                        rx="5"
                        fill="rgba(10,10,18,.92)"
                        stroke="rgba(255,150,60,.4)"
                        strokeWidth="0.5"
                      />
                      <text
                        x={cx} y={cy - r - 30}
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, var(--font-mono), monospace"
                        fontSize="9.5"
                        fontWeight="600"
                        fill="rgba(255,200,100,.9)"
                        letterSpacing="0.3"
                      >
                        {d.avgVelocity?.toFixed(1)} mph · {d.pitchTypeName}
                      </text>
                      <text
                        x={cx} y={cy - r - 14}
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, var(--font-mono), monospace"
                        fontSize="8.5"
                        fill="rgba(255,180,80,.7)"
                      >
                        {((d.whiffRate ?? 0) * 100).toFixed(1)}% whiff ·{" "}
                        {((d.usagePct ?? 0) * 100).toFixed(1)}% use
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Origin reticle */}
          <g opacity=".35">
            <circle cx={CX} cy={CY} r="3" fill="none" stroke="rgba(255,255,255,.3)" />
            <line x1={CX - 8} y1={CY} x2={CX - 2} y2={CY} stroke="rgba(255,255,255,.3)" />
            <line x1={CX + 2} y1={CY} x2={CX + 8} y2={CY} stroke="rgba(255,255,255,.3)" />
            <line x1={CX} y1={CY - 8} x2={CX} y2={CY - 2} stroke="rgba(255,255,255,.3)" />
            <line x1={CX} y1={CY + 2} x2={CX} y2={CY + 8} stroke="rgba(255,255,255,.3)" />
          </g>

          {/* Too-few overlay */}
          {tooFew && (
            <g>
              <rect x="200" y="190" width="400" height="60" rx="8"
                fill="rgba(10,10,18,.88)" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
              <text x="400" y="225" textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="12" fill="rgba(255,255,255,.5)" letterSpacing="1">
                NO PITCHES MATCH FILTER
              </text>
            </g>
          )}
        </svg>

        {/* Axis labels */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: "8.5px",
            color: "rgba(255,255,255,.3)",
            textTransform: "uppercase",
            letterSpacing: ".14em",
            zIndex: 2,
            whiteSpace: "nowrap",
          }}
        >
          x · horizontal break (in)
        </div>
      </div>

      {/* Caption — inline only */}
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
