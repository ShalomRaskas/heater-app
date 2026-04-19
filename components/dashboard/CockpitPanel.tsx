"use client";

import { useState, useCallback } from "react";

/* ─── types ──────────────────────────────────────────────── */
type Handedness = "rhb" | "lhb" | "all";
type CountState = "2strikes" | "even" | "behind";
const ALL_PITCHES = ["Fastball", "Slider", "Curve", "Change", "Sinker", "Cutter"];
const DEFAULT_PITCHES = new Set(["Fastball", "Slider", "Change"]);

/* Season label derived from progress 0-100 */
function seasonLabel(pct: number): string {
  const day = Math.round(pct * 1.62); // 0-162 games
  if (day <= 1) return "Opening Day";
  if (day >= 160) return "Game 162";
  // rough mapping: game 119 ≈ Aug 14
  const month = Math.floor(((day - 1) / 161) * 5); // 0=Apr 1=May 2=Jun 3=Jul 4=Aug 5=Sep
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  return `${months[month]} · G${day}`;
}

/* ─── SVG Bubble Chart ────────────────────────────────────── */
function PitchMovementChart({
  selectedPitches,
}: {
  selectedPitches: Set<string>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const skenesVisible = (pitch: string) => selectedPitches.has(pitch);

  const skenesBubbles = [
    {
      id: "FB",
      cx: 495,
      cy: 130,
      r: 62,
      rHalo: 85,
      gradId: "sk-fb",
      vel: "98.4",
      glowHalo: "url(#sk-fb)",
      strokeColor: "#ff9040",
      fillColor: "rgba(255,160,80,.18)",
      pitch: "Fastball",
    },
    {
      id: "SL",
      cx: 285,
      cy: 175,
      r: 40,
      rHalo: 55,
      gradId: "sk-sl",
      vel: "87.1",
      glowHalo: "url(#sk-sl)",
      strokeColor: "#ff7a3a",
      fillColor: "rgba(255,107,53,.22)",
      pitch: "Slider",
    },
    {
      id: "CH",
      cx: 560,
      cy: 285,
      r: 26,
      rHalo: 35,
      gradId: "sk-ch",
      vel: "91.0",
      glowHalo: "url(#sk-ch)",
      strokeColor: "#ff8555",
      fillColor: "rgba(255,107,53,.2)",
      pitch: "Change",
    },
    {
      id: "CB",
      cx: 430,
      cy: 320,
      r: 20,
      rHalo: 28,
      gradId: "sk-cb",
      vel: "82.4",
      glowHalo: "url(#sk-cb)",
      strokeColor: "#ea4040",
      fillColor: "rgba(211,47,47,.2)",
      pitch: "Curve",
    },
  ];

  const saleBubbles = [
    { id: "FB", cx: 470, cy: 150, r: 58, pitch: "Fastball" },
    { id: "SL", cx: 255, cy: 200, r: 40, pitch: "Slider" },
    { id: "CH", cx: 540, cy: 300, r: 24, pitch: "Change" },
  ];

  return (
    <svg
      viewBox="0 0 800 440"
      preserveAspectRatio="xMidYMid meet"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        <radialGradient id="sk-fb" cx=".3" cy=".3" r=".9">
          <stop offset="0%" stopColor="#ffe08a" stopOpacity=".95" />
          <stop offset="40%" stopColor="#ff8a3a" stopOpacity=".8" />
          <stop offset="100%" stopColor="#D32F2F" stopOpacity=".0" />
        </radialGradient>
        <radialGradient id="sk-sl" cx=".3" cy=".3" r=".9">
          <stop offset="0%" stopColor="#ffb055" stopOpacity=".95" />
          <stop offset="45%" stopColor="#ff6b35" stopOpacity=".75" />
          <stop offset="100%" stopColor="#8e1b1b" stopOpacity=".0" />
        </radialGradient>
        <radialGradient id="sk-ch" cx=".3" cy=".3" r=".9">
          <stop offset="0%" stopColor="#ff9060" stopOpacity=".9" />
          <stop offset="100%" stopColor="#a02020" stopOpacity=".0" />
        </radialGradient>
        <radialGradient id="sk-cb" cx=".3" cy=".3" r=".9">
          <stop offset="0%" stopColor="#ff7040" stopOpacity=".85" />
          <stop offset="100%" stopColor="#7a1818" stopOpacity=".0" />
        </radialGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Axis lines */}
      <line
        x1="400"
        y1="40"
        x2="400"
        y2="400"
        stroke="rgba(255,255,255,.08)"
        strokeDasharray="3 5"
      />
      <line
        x1="60"
        y1="220"
        x2="740"
        y2="220"
        stroke="rgba(255,255,255,.08)"
        strokeDasharray="3 5"
      />
      <line
        x1="60"
        y1="40"
        x2="60"
        y2="400"
        stroke="rgba(255,255,255,.05)"
      />
      <line
        x1="60"
        y1="400"
        x2="740"
        y2="400"
        stroke="rgba(255,255,255,.05)"
      />

      {/* Quadrant labels */}
      <text
        x="72"
        y="56"
        fontFamily="JetBrains Mono, var(--font-mono), monospace"
        fontSize="10"
        fill="rgba(255,255,255,.25)"
        letterSpacing="1.2"
      >
        ARM-SIDE · RISE
      </text>
      <text
        x="740"
        y="56"
        fontFamily="JetBrains Mono, var(--font-mono), monospace"
        fontSize="10"
        fill="rgba(255,255,255,.25)"
        textAnchor="end"
        letterSpacing="1.2"
      >
        GLOVE-SIDE · RISE
      </text>
      <text
        x="72"
        y="395"
        fontFamily="JetBrains Mono, var(--font-mono), monospace"
        fontSize="10"
        fill="rgba(255,255,255,.25)"
        letterSpacing="1.2"
      >
        ARM-SIDE · DROP
      </text>
      <text
        x="740"
        y="395"
        fontFamily="JetBrains Mono, var(--font-mono), monospace"
        fontSize="10"
        fill="rgba(255,255,255,.25)"
        textAnchor="end"
        letterSpacing="1.2"
      >
        GLOVE-SIDE · DROP
      </text>

      {/* Sale bubbles (cool/neutral) */}
      <g opacity=".85">
        {saleBubbles.map((b) => {
          if (!selectedPitches.has(b.pitch)) return null;
          return (
            <g key={`sale-${b.id}`}>
              <circle
                cx={b.cx}
                cy={b.cy}
                r={b.r}
                fill="rgba(180,200,220,.06)"
                stroke="rgba(180,200,220,.35)"
                strokeWidth="0.75"
              />
              <text
                x={b.cx}
                y={b.cy + 4}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize={b.r > 45 ? 11 : b.r > 30 ? 10 : 9}
                fill="rgba(255,255,255,.55)"
              >
                {b.id}
              </text>
            </g>
          );
        })}
      </g>

      {/* Skenes bubbles (hot) */}
      <g>
        {/* Glow halos */}
        {skenesBubbles.map((b) => {
          if (!skenesVisible(b.pitch)) return null;
          return (
            <circle
              key={`glow-${b.id}`}
              cx={b.cx}
              cy={b.cy}
              r={b.rHalo}
              fill={b.glowHalo}
              filter="url(#soft)"
              opacity={hovered === b.id ? 0.75 : 0.55}
              style={{ transition: "opacity .2s" }}
            />
          );
        })}
        {/* Solid bubbles */}
        {skenesBubbles.map((b) => {
          if (!skenesVisible(b.pitch)) return null;
          const isHov = hovered === b.id;
          return (
            <g
              key={`sk-${b.id}`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(b.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle
                cx={b.cx}
                cy={b.cy}
                r={isHov ? b.r * 1.08 : b.r}
                fill={b.fillColor}
                stroke={b.strokeColor}
                strokeWidth={isHov ? 1.5 : 1}
                style={{ transition: "all .2s" }}
              />
              <text
                x={b.cx}
                y={b.cy - 4}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontWeight="500"
                fontSize={b.r > 45 ? 12 : b.r > 30 ? 11 : 10}
                fill="#fff"
              >
                {b.id}
              </text>
              <text
                x={b.cx}
                y={b.cy + 10}
                textAnchor="middle"
                fontFamily="JetBrains Mono, var(--font-mono), monospace"
                fontSize="9"
                fill="rgba(255,255,255,.6)"
                letterSpacing="1"
              >
                {b.vel}
              </text>
              {/* Hover velocity readout */}
              {isHov && (
                <g>
                  <rect
                    x={b.cx - 38}
                    y={b.cy - b.r - 30}
                    width="76"
                    height="22"
                    rx="5"
                    fill="rgba(12,12,18,.88)"
                    stroke="rgba(255,150,60,.4)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={b.cx}
                    y={b.cy - b.r - 15}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, var(--font-mono), monospace"
                    fontSize="10"
                    fontWeight="600"
                    fill="rgba(255,200,100,.9)"
                    letterSpacing="0.5"
                  >
                    {b.vel} mph · {b.id}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* Targeting reticle */}
      <g opacity=".4">
        <circle
          cx="400"
          cy="220"
          r="3"
          fill="none"
          stroke="rgba(255,255,255,.3)"
        />
        <line
          x1="392"
          y1="220"
          x2="398"
          y2="220"
          stroke="rgba(255,255,255,.3)"
        />
        <line
          x1="402"
          y1="220"
          x2="408"
          y2="220"
          stroke="rgba(255,255,255,.3)"
        />
        <line
          x1="400"
          y1="212"
          x2="400"
          y2="218"
          stroke="rgba(255,255,255,.3)"
        />
        <line
          x1="400"
          y1="222"
          x2="400"
          y2="228"
          stroke="rgba(255,255,255,.3)"
        />
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
              background: active
                ? "rgba(211,47,47,.12)"
                : "transparent",
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
export default function CockpitPanel() {
  const [seasonProgress, setSeasonProgress] = useState(70);
  const [handedness, setHandedness] = useState<Handedness>("rhb");
  const [countState, setCountState] = useState<CountState>("even");
  const [selectedPitches, setSelectedPitches] = useState<Set<string>>(
    new Set(DEFAULT_PITCHES)
  );

  const togglePitch = useCallback((pitch: string) => {
    setSelectedPitches((prev) => {
      const next = new Set(prev);
      if (next.has(pitch)) {
        if (next.size > 1) next.delete(pitch);
      } else {
        next.add(pitch);
      }
      return next;
    });
  }, []);

  const currentLabel = seasonLabel(seasonProgress);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "820px",
        position: "relative",
      }}
    >
      {/* Cockpit header */}
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
          <h3
            style={{
              fontWeight: 600,
              fontSize: "16px",
              margin: 0,
              letterSpacing: "-.01em",
            }}
          >
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
            Skenes (23) · Sale (22) · 2024 vs 2011
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
          Live · 2:47 pm
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
            boxShadow:
              "inset 0 0 60px rgba(0,0,0,.4), 0 0 0 0.5px rgba(255,255,255,.02)",
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
              maskImage:
                "radial-gradient(ellipse 75% 75% at 50% 50%, black, transparent 100%)",
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
            Pitch Movement · Bubble
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background:
                    "radial-gradient(circle at 30% 30%, #ffb55a, #D32F2F)",
                  boxShadow: "0 0 8px rgba(211,47,47,.35)",
                  display: "inline-block",
                }}
              />
              Skenes · 2024
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background: "rgba(180,200,220,.25)",
                  border: "0.5px solid rgba(200,200,220,.4)",
                  display: "inline-block",
                }}
              />
              Sale · 2011
            </div>
            <div
              style={{
                height: "0.5px",
                background: "rgba(255,255,255,.08)",
                margin: "2px -2px",
              }}
            />
            <em
              style={{
                fontStyle: "normal",
                color: "rgba(255,255,255,.4)",
                fontSize: "9px",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              size = usage %
            </em>
            <em
              style={{
                fontStyle: "normal",
                color: "rgba(255,255,255,.4)",
                fontSize: "9px",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              hue = velocity
            </em>
          </div>

          {/* SVG chart */}
          <PitchMovementChart selectedPitches={selectedPitches} />

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
            y · vertical break (in)
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
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
              <em
                style={{
                  fontStyle: "normal",
                  color: "#D32F2F",
                  letterSpacing: ".14em",
                }}
              >
                {currentLabel}
              </em>
            </div>
            {/* Custom slider track */}
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
                    background:
                      "linear-gradient(90deg, rgba(211,47,47,.3), #D32F2F)",
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
              {/* Thumb visual */}
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
              <em
                style={{
                  fontStyle: "normal",
                  color: "rgba(255,255,255,.4)",
                  letterSpacing: ".1em",
                }}
              >
                n = 1,412
              </em>
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
              <em
                style={{
                  fontStyle: "normal",
                  color: "rgba(255,255,255,.4)",
                  letterSpacing: ".1em",
                }}
              >
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

          {/* Pitch types */}
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
              <em
                style={{
                  fontStyle: "normal",
                  color: "rgba(255,255,255,.4)",
                  letterSpacing: ".1em",
                }}
              >
                multi-select
              </em>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {ALL_PITCHES.map((pitch) => {
                const active = selectedPitches.has(pitch);
                return (
                  <button
                    key={pitch}
                    onClick={() => togglePitch(pitch)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9.5px",
                      padding: "4px 9px",
                      borderRadius: "999px",
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all .15s",
                      background: active
                        ? "rgba(211,47,47,.1)"
                        : "rgba(255,255,255,.03)",
                      border: active
                        ? "0.5px solid rgba(211,47,47,.35)"
                        : "0.5px solid rgba(255,255,255,.08)",
                      color: active
                        ? "rgba(255,255,255,.95)"
                        : "rgba(255,255,255,.6)",
                      boxShadow: active
                        ? "0 0 10px rgba(211,47,47,.12)"
                        : "none",
                    }}
                  >
                    {pitch}
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
              n = 2 players · {selectedPitches.size} types · 2021 – 2026
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
            Sample
          </strong>
          1,412 pitches after filters
        </span>
        <span>
          <strong style={{ color: "rgba(255,255,255,.6)", fontWeight: 500, marginRight: "4px" }}>
            Updated
          </strong>
          2 hr ago
        </span>
        <a
          href="#"
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
