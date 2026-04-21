"use client";

import { useState, useCallback, useMemo } from "react";

/* ─── Types ──────────────────────────────────────────────── */
type Handedness = "rhb" | "lhb" | "all";
type CountState = "2strikes" | "even" | "behind";

export interface PitchDataRow {
  player_id: string;
  pitch_type: string;
  pitch_type_name: string | null;
  avg_velocity: number | null;
  usage_pct: number | null;
  horizontal_break_in: number | null;
  vertical_break_in: number | null;
  whiff_rate: number | null;
  season?: number;
}

export interface PlayerRow {
  id: string;
  full_name: string;
  team_abbr: string | null;
  throws: string | null;
  position: string | null;
}

/* Season label derived from progress 0–100 */
function seasonLabel(pct: number): string {
  const day = Math.round(pct * 1.62);
  if (day <= 1) return "Opening Day";
  if (day >= 160) return "Game 162";
  const month = Math.floor(((day - 1) / 161) * 5);
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  return `${months[month]} · G${day}`;
}

/* Map pfx inches → SVG pixels.
   Chart: viewBox 0 0 800 440, center (400, 220).
   Scale: 16px per inch horizontal, 8px per inch vertical. */
const CX = 400;
const CY = 220;
const SX = 16; // px per inch, horizontal
const SY = 8;  // px per inch, vertical

function toSVG(pfxX: number, pfxZ: number): [number, number] {
  return [CX + pfxX * SX, CY - pfxZ * SY];
}

/* Bubble radius from usage (decimal 0–1). */
function bubbleR(usagePct: number): number {
  return Math.max(12, Math.sqrt(usagePct * 100) * 9);
}

/* Heat gradient colours for player 0 (primary). */
const HOT_STROKE = ["#ff9040", "#ff7a3a", "#ff8555", "#ea4040", "#ffa060", "#ff6040"];
const HOT_FILL = [
  "rgba(255,160,80,.18)",
  "rgba(255,107,53,.22)",
  "rgba(255,107,53,.20)",
  "rgba(211,47,47,.20)",
  "rgba(255,140,60,.18)",
  "rgba(255,90,40,.18)",
];

/* ─── SVG Bubble Chart ────────────────────────────────────── */
function PitchMovementChart({
  players,
  pitchData,
  selectedPitches,
}: {
  players: PlayerRow[];
  pitchData: PitchDataRow[];
  selectedPitches: Set<string>;
}) {
  const [hovered, setHovered] = useState<string | null>(null); // "{playerId}:{pitch_type}"

  const p0 = players[0];
  const p1 = players[1];

  const p0Pitches = useMemo(
    () =>
      p0
        ? pitchData.filter(
            (d) => d.player_id === p0.id && selectedPitches.has(d.pitch_type),
          )
        : [],
    [pitchData, p0, selectedPitches],
  );
  const p1Pitches = useMemo(
    () =>
      p1
        ? pitchData.filter(
            (d) => d.player_id === p1.id && selectedPitches.has(d.pitch_type),
          )
        : [],
    [pitchData, p1, selectedPitches],
  );

  return (
    <svg
      viewBox="0 0 800 440"
      preserveAspectRatio="xMidYMid meet"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        {/* Radial gradients for primary player bubbles */}
        {p0Pitches.map((d, i) => (
          <radialGradient key={d.pitch_type} id={`g0-${d.pitch_type}`} cx=".3" cy=".3" r=".9">
            <stop offset="0%" stopColor="#ffe08a" stopOpacity=".95" />
            <stop offset="40%" stopColor={HOT_STROKE[i % HOT_STROKE.length]} stopOpacity=".8" />
            <stop offset="100%" stopColor="#D32F2F" stopOpacity="0" />
          </radialGradient>
        ))}
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Axis lines */}
      <line x1="400" y1="40" x2="400" y2="400" stroke="rgba(255,255,255,.08)" strokeDasharray="3 5" />
      <line x1="60"  y1="220" x2="740" y2="220" stroke="rgba(255,255,255,.08)" strokeDasharray="3 5" />
      <line x1="60"  y1="40" x2="60"  y2="400" stroke="rgba(255,255,255,.05)" />
      <line x1="60"  y1="400" x2="740" y2="400" stroke="rgba(255,255,255,.05)" />

      {/* Quadrant labels */}
      {[
        { x: 72,  y: 56,  anchor: "start", label: "ARM-SIDE · RISE" },
        { x: 740, y: 56,  anchor: "end",   label: "GLOVE-SIDE · RISE" },
        { x: 72,  y: 395, anchor: "start", label: "ARM-SIDE · DROP" },
        { x: 740, y: 395, anchor: "end",   label: "GLOVE-SIDE · DROP" },
      ].map((q) => (
        <text
          key={q.label}
          x={q.x}
          y={q.y}
          fontFamily="JetBrains Mono, var(--font-mono), monospace"
          fontSize="10"
          fill="rgba(255,255,255,.25)"
          textAnchor={q.anchor as "start" | "end"}
          letterSpacing="1.2"
        >
          {q.label}
        </text>
      ))}

      {/* Inch tick marks on axes */}
      {[-20, -10, 10, 20].map((in_) => (
        <g key={`tick-x-${in_}`}>
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
      {[-15, -5, 5, 15].map((in_) => (
        <g key={`tick-y-${in_}`}>
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

      {/* Player 1 bubbles — cool/ghost */}
      <g opacity=".8">
        {p1Pitches.map((d) => {
          if (d.horizontal_break_in == null || d.vertical_break_in == null) return null;
          const [cx, cy] = toSVG(d.horizontal_break_in, d.vertical_break_in);
          const r = bubbleR(d.usage_pct ?? 0);
          const key = `${d.player_id}:${d.pitch_type}`;
          const isHov = hovered === key;
          return (
            <g
              key={key}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle
                cx={cx} cy={cy} r={isHov ? r * 1.08 : r}
                fill="rgba(160,185,210,.06)"
                stroke="rgba(160,185,210,.4)"
                strokeWidth={isHov ? 1 : 0.75}
                style={{ transition: "all .2s" }}
              />
              <text
                x={cx} y={cy + 4}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize={r > 40 ? 11 : r > 25 ? 10 : 9}
                fill="rgba(255,255,255,.55)"
              >
                {d.pitch_type}
              </text>
              {/* Hover tooltip */}
              {isHov && (
                <g>
                  <rect
                    x={cx - 50} y={cy - r - 44}
                    width="100" height="36"
                    rx="5"
                    fill="rgba(10,10,18,.9)"
                    stroke="rgba(160,185,210,.35)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={cx} y={cy - r - 29}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, var(--font-mono), monospace"
                    fontSize="9.5"
                    fontWeight="600"
                    fill="rgba(200,220,240,.9)"
                    letterSpacing="0.3"
                  >
                    {d.avg_velocity?.toFixed(1)} mph · {d.pitch_type}
                  </text>
                  <text
                    x={cx} y={cy - r - 15}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, var(--font-mono), monospace"
                    fontSize="8.5"
                    fill="rgba(160,185,210,.7)"
                  >
                    {((d.whiff_rate ?? 0) * 100).toFixed(1)}% whiff · {((d.usage_pct ?? 0) * 100).toFixed(1)}% use
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* Player 0 bubbles — hot/primary */}
      <g>
        {/* Glow halos */}
        {p0Pitches.map((d) => {
          if (d.horizontal_break_in == null || d.vertical_break_in == null) return null;
          const [cx, cy] = toSVG(d.horizontal_break_in, d.vertical_break_in);
          const r = bubbleR(d.usage_pct ?? 0);
          const key = `${d.player_id}:${d.pitch_type}`;
          return (
            <circle
              key={`halo-${d.pitch_type}`}
              cx={cx} cy={cy} r={r * 1.45}
              fill={`url(#g0-${d.pitch_type})`}
              filter="url(#soft)"
              opacity={hovered === key ? 0.75 : 0.5}
              style={{ transition: "opacity .2s" }}
            />
          );
        })}

        {/* Solid bubbles */}
        {p0Pitches.map((d, i) => {
          if (d.horizontal_break_in == null || d.vertical_break_in == null) return null;
          const [cx, cy] = toSVG(d.horizontal_break_in, d.vertical_break_in);
          const r = bubbleR(d.usage_pct ?? 0);
          const key = `${d.player_id}:${d.pitch_type}`;
          const isHov = hovered === key;
          const strokeColor = HOT_STROKE[i % HOT_STROKE.length];
          const fillColor = HOT_FILL[i % HOT_FILL.length];

          return (
            <g
              key={`p0-${d.pitch_type}`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(key)}
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
              <text
                x={cx} y={cy - 4}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontWeight="500"
                fontSize={r > 45 ? 12 : r > 30 ? 11 : 10}
                fill="#fff"
              >
                {d.pitch_type}
              </text>
              <text
                x={cx} y={cy + 10}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="9"
                fill="rgba(255,255,255,.6)"
                letterSpacing="1"
              >
                {d.avg_velocity?.toFixed(1)}
              </text>
              {/* Hover tooltip */}
              {isHov && (
                <g>
                  <rect
                    x={cx - 52} y={cy - r - 44}
                    width="104" height="36"
                    rx="5"
                    fill="rgba(10,10,18,.9)"
                    stroke="rgba(255,150,60,.4)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={cx} y={cy - r - 29}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, var(--font-mono), monospace"
                    fontSize="9.5"
                    fontWeight="600"
                    fill="rgba(255,200,100,.9)"
                    letterSpacing="0.3"
                  >
                    {d.avg_velocity?.toFixed(1)} mph · {d.pitch_type}
                  </text>
                  <text
                    x={cx} y={cy - r - 15}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, var(--font-mono), monospace"
                    fontSize="8.5"
                    fill="rgba(255,180,80,.7)"
                  >
                    {((d.whiff_rate ?? 0) * 100).toFixed(1)}% whiff · {((d.usage_pct ?? 0) * 100).toFixed(1)}% use
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* Targeting reticle at origin */}
      <g opacity=".4">
        <circle cx={CX} cy={CY} r="3" fill="none" stroke="rgba(255,255,255,.3)" />
        <line x1={CX - 8} y1={CY} x2={CX - 2} y2={CY} stroke="rgba(255,255,255,.3)" />
        <line x1={CX + 2} y1={CY} x2={CX + 8} y2={CY} stroke="rgba(255,255,255,.3)" />
        <line x1={CX} y1={CY - 8} x2={CX} y2={CY - 2} stroke="rgba(255,255,255,.3)" />
        <line x1={CX} y1={CY + 2} x2={CX} y2={CY + 8} stroke="rgba(255,255,255,.3)" />
      </g>
    </svg>
  );
}

/* ─── Segmented Control ───────────────────────────────────── */
function SegControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        padding: "2px",
        background: "rgba(255,255,255,.03)",
        border: "0.5px solid rgba(255,255,255,.08)",
        borderRadius: "7px",
        width: "fit-content",
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: "5px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: active ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.6)",
              borderRadius: "5px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: "pointer",
              background: active ? "rgba(211,47,47,.12)" : "transparent",
              border: "none",
              boxShadow: active
                ? "inset 0 0 0 0.5px rgba(211,47,47,.4), 0 0 10px rgba(211,47,47,.15)"
                : "none",
              transition: "all .15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main CockpitPanel ───────────────────────────────────── */
export default function CockpitPanel({
  players,
  pitchData,
}: {
  players: PlayerRow[];
  pitchData: PitchDataRow[];
}) {
  const [seasonProgress, setSeasonProgress] = useState(70);
  const [handedness, setHandedness] = useState<Handedness>("rhb");
  const [countState, setCountState] = useState<CountState>("even");

  // Derive available pitch types from data, deduplicated across both players
  const allPitchTypes = useMemo(() => {
    const seen = new Map<string, string>(); // pitch_type → pitch_type_name
    for (const d of pitchData) {
      if (!seen.has(d.pitch_type)) seen.set(d.pitch_type, d.pitch_type_name ?? d.pitch_type);
    }
    return Array.from(seen.entries()).map(([type, name]) => ({ type, name }));
  }, [pitchData]);

  // Default: select the top 3 pitch types by aggregate usage
  const defaultSelected = useMemo(() => {
    const usageByType = new Map<string, number>();
    for (const d of pitchData) {
      usageByType.set(d.pitch_type, (usageByType.get(d.pitch_type) ?? 0) + (d.usage_pct ?? 0));
    }
    const sorted = Array.from(usageByType.entries()).sort((a, b) => b[1] - a[1]);
    return new Set(sorted.slice(0, 3).map(([t]) => t));
  }, [pitchData]);

  const [selectedPitches, setSelectedPitches] = useState<Set<string>>(defaultSelected);

  const togglePitch = useCallback((type: string) => {
    setSelectedPitches((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const currentLabel = seasonLabel(seasonProgress);
  const p0 = players[0];
  const p1 = players[1];

  // Season of the data
  const dataSeason = pitchData[0]?.season ?? 2024;

  const subline =
    p0 && p1
      ? `${p0.full_name.split(" ")[1]} · ${p1.full_name.split(" ")[1]} · ${dataSeason} Statcast`
      : "Pitch Movement · Statcast";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "820px",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "16px 24px",
          borderBottom: "0.5px solid rgba(255,255,255,.08)",
          background: "linear-gradient(180deg, rgba(211,47,47,.04), transparent)",
          flexShrink: 0,
        }}
      >
        <div>
          <h3 style={{ fontWeight: 600, fontSize: "16px", margin: 0, letterSpacing: "-.01em" }}>
            Pitch Movement Comparison
          </h3>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10.5px",
              color: "rgba(255,255,255,.4)",
              textTransform: "uppercase",
              letterSpacing: ".14em",
              marginTop: "4px",
            }}
          >
            {subline}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* LIVE badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            fontFamily: "var(--font-mono)",
            fontSize: "9.5px",
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "#D32F2F",
            padding: "5px 10px",
            background: "rgba(211,47,47,.08)",
            border: "0.5px solid rgba(211,47,47,.35)",
            borderRadius: "999px",
            boxShadow: "0 0 12px rgba(211,47,47,.18)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "999px",
              background: "#D32F2F",
              boxShadow: "0 0 8px #D32F2F",
              display: "inline-block",
              animation: "redPulse 2s ease-in-out infinite",
            }}
          />
          Savant · {dataSeason}
        </div>
        {/* Icon buttons */}
        <div style={{ display: "flex", gap: "6px" }}>
          {["⤢", "☆", "↗", "↓"].map((icon) => (
            <div
              key={icon}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "7px",
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,.03)",
                border: "0.5px solid rgba(255,255,255,.08)",
                color: "rgba(255,255,255,.6)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      {/* Viz area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "22px 24px",
          gap: "18px",
          overflow: "hidden",
        }}
      >
        {/* Chart */}
        <div
          style={{
            flex: 1,
            position: "relative",
            minHeight: "340px",
            borderRadius: "14px",
            overflow: "hidden",
            background:
              "radial-gradient(60% 50% at 50% 50%, rgba(211,47,47,.08), transparent 65%), linear-gradient(180deg, rgba(255,255,255,.02), rgba(0,0,0,.3))",
            border: "0.5px solid rgba(255,255,255,.08)",
            boxShadow: "inset 0 0 60px rgba(0,0,0,.4), 0 0 0 0.5px rgba(255,255,255,.02)",
          }}
        >
          {/* Grid overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.025) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(255,255,255,.025) 0.5px, transparent 0.5px)",
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(ellipse 75% 75% at 50% 50%, black, transparent 100%)",
            }}
          />

          {/* Chart label */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "16px",
              zIndex: 3,
              fontFamily: "var(--font-mono)",
              fontSize: "9.5px",
              color: "rgba(255,255,255,.6)",
              textTransform: "uppercase",
              letterSpacing: ".16em",
              padding: "4px 9px",
              background: "rgba(10,10,15,.55)",
              border: "0.5px solid rgba(255,255,255,.08)",
              borderRadius: "6px",
              backdropFilter: "blur(12px)",
            }}
          >
            Pitch Movement · pfx_x / pfx_z induced
          </div>

          {/* Legend */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              right: "16px",
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "10px 12px",
              background: "rgba(10,10,15,.55)",
              border: "0.5px solid rgba(255,255,255,.08)",
              borderRadius: "8px",
              backdropFilter: "blur(12px)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(255,255,255,.6)",
            }}
          >
            {p0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: "radial-gradient(circle at 30% 30%, #ffb55a, #D32F2F)",
                    boxShadow: "0 0 8px rgba(211,47,47,.35)",
                    display: "inline-block",
                  }}
                />
                {p0.full_name} · {p0.team_abbr}
              </div>
            )}
            {p1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "999px",
                    background: "rgba(160,185,210,.25)",
                    border: "0.5px solid rgba(160,185,210,.5)",
                    display: "inline-block",
                  }}
                />
                {p1.full_name} · {p1.team_abbr}
              </div>
            )}
            <div style={{ height: "0.5px", background: "rgba(255,255,255,.08)", margin: "2px -2px" }} />
            <em style={{ fontStyle: "normal", color: "rgba(255,255,255,.4)", fontSize: "9px", letterSpacing: ".1em", textTransform: "uppercase" }}>
              size = usage %
            </em>
            <em style={{ fontStyle: "normal", color: "rgba(255,255,255,.4)", fontSize: "9px", letterSpacing: ".1em", textTransform: "uppercase" }}>
              hover = stats
            </em>
          </div>

          {/* SVG chart */}
          <PitchMovementChart
            players={players}
            pitchData={pitchData}
            selectedPitches={selectedPitches}
          />

          {/* Axis labels */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(255,255,255,.4)",
              textTransform: "uppercase",
              letterSpacing: ".14em",
              zIndex: 3,
            }}
          >
            x · horizontal break (in)
          </div>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "14px",
              transform: "rotate(-90deg) translateX(50%)",
              transformOrigin: "left center",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(255,255,255,.4)",
              textTransform: "uppercase",
              letterSpacing: ".14em",
              zIndex: 3,
              whiteSpace: "nowrap",
            }}
          >
            y · vertical break induced (in)
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {/* Season slider */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(255,255,255,.03)",
              border: "0.5px solid rgba(255,255,255,.08)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                color: "rgba(255,255,255,.6)",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                marginBottom: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Season progression</span>
              <em style={{ fontStyle: "normal", color: "#D32F2F", letterSpacing: ".14em" }}>
                {currentLabel}
              </em>
            </div>
            <div style={{ position: "relative", paddingBottom: "20px" }}>
              <div
                style={{
                  position: "relative",
                  height: "2px",
                  background: "rgba(255,255,255,.12)",
                  borderRadius: "999px",
                  marginBottom: "4px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    width: `${seasonProgress}%`,
                    top: 0,
                    bottom: 0,
                    background: "linear-gradient(90deg, rgba(211,47,47,.3), #D32F2F)",
                    borderRadius: "999px",
                    boxShadow: "0 0 8px rgba(211,47,47,.35)",
                  }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={seasonProgress}
                onChange={(e) => setSeasonProgress(Number(e.target.value))}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "2px",
                  opacity: 0,
                  cursor: "pointer",
                  zIndex: 2,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: `${seasonProgress}%`,
                  top: "-6px",
                  transform: "translateX(-50%)",
                  width: "14px",
                  height: "14px",
                  borderRadius: "999px",
                  background: "radial-gradient(circle at 30% 30%, #fff, #ffaa88)",
                  boxShadow:
                    "0 0 0 0.5px rgba(255,255,255,.5), 0 0 14px rgba(211,47,47,.35), 0 0 4px rgba(255,255,255,.6)",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "18px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  color: "rgba(255,255,255,.4)",
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                }}
              >
                <span>Opening Day</span>
                <span>Game 162</span>
              </div>
            </div>
          </div>

          {/* Handedness */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(255,255,255,.03)",
              border: "0.5px solid rgba(255,255,255,.08)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                color: "rgba(255,255,255,.6)",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                marginBottom: "9px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Handedness split</span>
            </div>
            <SegControl
              options={[
                { label: "vs RHB", value: "rhb" },
                { label: "vs LHB", value: "lhb" },
                { label: "All", value: "all" },
              ]}
              value={handedness}
              onChange={setHandedness}
            />
          </div>

          {/* Count state */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(255,255,255,.03)",
              border: "0.5px solid rgba(255,255,255,.08)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                color: "rgba(255,255,255,.6)",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                marginBottom: "9px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Count state</span>
              <em style={{ fontStyle: "normal", color: "rgba(255,255,255,.4)", letterSpacing: ".1em" }}>
                game context
              </em>
            </div>
            <SegControl
              options={[
                { label: "2 Strikes", value: "2strikes" },
                { label: "Even", value: "even" },
                { label: "Behind", value: "behind" },
              ]}
              value={countState}
              onChange={setCountState}
            />
          </div>

          {/* Pitch types — derived from real data */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              background: "rgba(255,255,255,.03)",
              border: "0.5px solid rgba(255,255,255,.08)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9.5px",
                color: "rgba(255,255,255,.6)",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                marginBottom: "9px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Pitch types</span>
              <em style={{ fontStyle: "normal", color: "rgba(255,255,255,.4)", letterSpacing: ".1em" }}>
                multi-select
              </em>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {allPitchTypes.map(({ type, name }) => {
                const active = selectedPitches.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => togglePitch(type)}
                    title={name}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9.5px",
                      padding: "4px 9px",
                      borderRadius: "999px",
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all .15s",
                      background: active ? "rgba(211,47,47,.1)" : "rgba(255,255,255,.03)",
                      border: active
                        ? "0.5px solid rgba(211,47,47,.35)"
                        : "0.5px solid rgba(255,255,255,.08)",
                      color: active ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.6)",
                      boxShadow: active ? "0 0 10px rgba(211,47,47,.12)" : "none",
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add comp + summary */}
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "4px",
            }}
          >
            <button
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10.5px",
                padding: "7px 12px",
                borderRadius: "7px",
                letterSpacing: ".08em",
                textTransform: "uppercase",
                background: "rgba(255,255,255,.03)",
                border: "0.5px dashed rgba(255,255,255,.12)",
                color: "rgba(255,255,255,.6)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              ＋ Add comp player
            </button>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "rgba(255,255,255,.4)",
                letterSpacing: ".12em",
                textTransform: "uppercase",
              }}
            >
              {players.length} players · {selectedPitches.size} types · {dataSeason}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "0.5px solid rgba(255,255,255,.08)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "rgba(255,255,255,.4)",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          background: "linear-gradient(180deg, transparent, rgba(255,255,255,.015))",
          flexShrink: 0,
        }}
      >
        <span>
          <strong style={{ color: "rgba(255,255,255,.6)", fontWeight: 500, marginRight: "4px" }}>
            Source
          </strong>
          Baseball Savant · Statcast
        </span>
        <span>
          <strong style={{ color: "rgba(255,255,255,.6)", fontWeight: 500, marginRight: "4px" }}>
            Season
          </strong>
          {dataSeason} full season
        </span>
        <a
          href={`https://baseballsavant.mlb.com/savant-player/${p0?.full_name.toLowerCase().replace(/\s+/g, "-")}-${players[0]?.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "rgba(255,255,255,.6)",
            marginLeft: "auto",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 10px",
            borderRadius: "6px",
            border: "0.5px solid rgba(255,255,255,.08)",
          }}
        >
          View on Savant ↗
        </a>
      </div>
    </div>
  );
}
