"use client";

import { useState } from "react";

const S: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "820px",
    position: "relative",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 22px",
    borderBottom: "0.5px solid rgba(255,255,255,.08)",
    background: "linear-gradient(180deg, rgba(212,175,55,.03), transparent)",
    flexShrink: 0,
  },
  albertAv: {
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at 30% 25%, #f5d874 0%, #d4af37 45%, #8a6f1c 100%)",
    boxShadow:
      "0 0 0 0.5px rgba(255,255,255,.15), 0 0 18px rgba(212,175,55,.28), inset 0 0 8px rgba(255,255,255,.15)",
    fontFamily: "var(--font-serif)",
    fontStyle: "italic",
    fontWeight: 400,
    fontSize: "22px",
    color: "#1a1608",
    flexShrink: 0,
  },
  statusDot: {
    display: "inline-block",
    width: "6px",
    height: "6px",
    borderRadius: "999px",
    background: "#d4af37",
    boxShadow: "0 0 8px rgba(212,175,55,.5)",
    animation: "amberPulse 2s ease-in-out infinite",
  },
  chatDropdown: {
    marginLeft: "auto",
    fontFamily: "var(--font-mono)",
    fontSize: "10.5px",
    color: "rgba(255,255,255,.6)",
    letterSpacing: ".08em",
    padding: "6px 10px",
    background: "rgba(255,255,255,.03)",
    border: "0.5px solid rgba(255,255,255,.08)",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    flexShrink: 0,
  },
  convo: {
    flex: 1,
    overflow: "hidden",
    padding: "22px 22px 4px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    position: "relative",
  },
  albertMsgAv: {
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    background:
      "radial-gradient(circle at 30% 25%, #f5d874 0%, #d4af37 50%, #8a6f1c 100%)",
    boxShadow:
      "0 0 0 0.5px rgba(255,255,255,.12), 0 0 10px rgba(212,175,55,.28)",
    fontFamily: "var(--font-serif)",
    fontStyle: "italic",
    fontSize: "15px",
    color: "#1a1608",
  },
  albertBubble: {
    padding: "13px 15px",
    borderRadius: "12px",
    background:
      "linear-gradient(180deg, rgba(212,175,55,.06), rgba(212,175,55,.02))",
    border: "0.5px solid rgba(212,175,55,.22)",
    boxShadow: "0 0 30px rgba(212,175,55,.05)",
    fontFamily: "var(--font-serif)",
    fontStyle: "italic",
    fontSize: "16px",
    lineHeight: 1.55,
    letterSpacing: ".002em",
  },
  lbl: {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontStyle: "normal",
    fontSize: "9.5px",
    color: "#d4af37",
    textTransform: "uppercase" as const,
    letterSpacing: ".14em",
    marginBottom: "7px",
    fontWeight: 500,
  },
  stat: {
    fontFamily: "var(--font-mono)",
    fontStyle: "normal",
    color: "rgba(255,255,255,.95)",
    fontWeight: 500,
  },
  callout: {
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    fontStyle: "normal",
    background:
      "linear-gradient(180deg, #ffe55a 0%, #ffd700 30%, #ff9433 65%, #D32F2F 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    filter: "drop-shadow(0 0 8px rgba(255,107,53,.35))",
    padding: "0 2px",
  },
  genChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "12px",
    padding: "7px 11px",
    background: "rgba(212,175,55,.08)",
    border: "0.5px solid rgba(212,175,55,.22)",
    borderRadius: "999px",
    fontFamily: "var(--font-mono)",
    fontStyle: "normal",
    fontSize: "10px",
    color: "#d4af37",
    textTransform: "uppercase" as const,
    letterSpacing: ".12em",
    boxShadow: "0 0 14px rgba(212,175,55,.08)",
  },
  suggest: {
    padding: "12px 22px",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
    borderTop: "0.5px solid rgba(255,255,255,.08)",
    flexShrink: 0,
  },
  suggestLbl: {
    width: "100%",
    fontFamily: "var(--font-mono)",
    fontSize: "9.5px",
    color: "rgba(255,255,255,.4)",
    textTransform: "uppercase" as const,
    letterSpacing: ".14em",
    marginBottom: "4px",
  },
  pill: {
    fontSize: "12px",
    padding: "6px 11px",
    borderRadius: "999px",
    color: "rgba(255,255,255,.6)",
    background: "rgba(255,255,255,.03)",
    border: "0.5px solid rgba(255,255,255,.08)",
    cursor: "pointer",
    transition: "all .2s",
    fontFamily: "inherit",
  },
  composer: {
    padding: "12px 22px 18px",
    borderTop: "0.5px solid rgba(255,255,255,.08)",
    flexShrink: 0,
  },
  composerBox: {
    display: "grid",
    gridTemplateColumns: "28px 1fr auto",
    gap: "12px",
    alignItems: "center",
    padding: "12px 14px",
    background: "rgba(255,255,255,.06)",
    border: "0.5px solid rgba(255,255,255,.12)",
    borderRadius: "12px",
    boxShadow:
      "0 0 0 0.5px rgba(255,255,255,.02) inset, 0 12px 24px rgba(0,0,0,.3)",
  },
  composerIcon: {
    width: "26px",
    height: "26px",
    borderRadius: "6px",
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,.06)",
    border: "0.5px solid rgba(255,255,255,.08)",
    color: "rgba(255,255,255,.6)",
    fontSize: "12px",
    cursor: "pointer",
    flexShrink: 0,
  },
  sendBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "7px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #e84545, #b22020)",
    border: "0.5px solid rgba(255,255,255,.2)",
    boxShadow:
      "0 0 18px rgba(211,47,47,.35), inset 0 1px 0 rgba(255,255,255,.25)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
  sources: {
    marginTop: "10px",
    fontFamily: "var(--font-mono)",
    fontSize: "9.5px",
    color: "rgba(255,255,255,.4)",
    textTransform: "uppercase" as const,
    letterSpacing: ".14em",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
};

const TOOLTIP_DATA = {
  skenes: {
    name: "Paul Skenes",
    tag: "LIVE",
    sub: "RHP · Pittsburgh · 6′6″ · age 23 · 2024 ROY",
    stats1: [
      { v: ".196", k: "opp BA" },
      { v: "2.11", k: "ERA" },
      { v: "33.7%", k: "K rate" },
    ],
    stats2: [
      { v: "98.4", k: "FB mph" },
      { v: "87.1", k: "SL mph" },
      { v: "48%", k: "whiff SL" },
    ],
  },
  sale: {
    name: "Chris Sale",
    tag: "2011",
    sub: "LHP · Chicago WS · 6′6″ · age 22",
    stats1: [
      { v: ".211", k: "opp BA" },
      { v: "3.69", k: "ERA" },
      { v: "27.4%", k: "K rate" },
    ],
    stats2: [
      { v: "92.8", k: "FB mph" },
      { v: "83.2", k: "SL mph" },
      { v: "38%", k: "whiff SL" },
    ],
  },
};

function PlayerTooltip({ id }: { id: "skenes" | "sale" }) {
  const d = TOOLTIP_DATA[id];
  return (
    <div
      style={{
        position: "absolute",
        left: "48px",
        bottom: "calc(100% + 6px)",
        zIndex: 20,
        minWidth: "260px",
        padding: "12px 14px",
        borderRadius: "10px",
        background: "rgba(12,12,18,.9)",
        border: "0.5px solid rgba(255,255,255,.12)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        boxShadow:
          "0 0 0 0.5px rgba(255,255,255,.04) inset, 0 20px 50px rgba(0,0,0,.6), 0 0 30px rgba(211,47,47,.2)",
        pointerEvents: "none",
      }}
    >
      {/* Arrow */}
      <div
        style={{
          position: "absolute",
          left: "24px",
          bottom: "-5px",
          width: "9px",
          height: "9px",
          background: "rgba(12,12,18,.9)",
          borderRight: "0.5px solid rgba(255,255,255,.12)",
          borderBottom: "0.5px solid rgba(255,255,255,.12)",
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "2px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontStyle: "normal",
          fontFamily: "var(--font-inter)",
        }}
      >
        {d.name}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "#D32F2F",
            textTransform: "uppercase",
            letterSpacing: ".12em",
            fontWeight: 400,
          }}
        >
          {d.tag}
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: "rgba(255,255,255,.4)",
          textTransform: "uppercase",
          letterSpacing: ".12em",
          marginBottom: "10px",
          fontStyle: "normal",
        }}
      >
        {d.sub}
      </div>
      {[d.stats1, d.stats2].map((stats, gi) => (
        <div
          key={gi}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
            paddingTop: "8px",
            marginTop: gi === 0 ? 0 : "8px",
            borderTop: "0.5px solid rgba(255,255,255,.08)",
          }}
        >
          {stats.map(({ v, k }) => (
            <div key={k}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "14px",
                  color: "rgba(255,255,255,.95)",
                  fontWeight: 500,
                  fontStyle: "normal",
                }}
              >
                {v}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  color: "rgba(255,255,255,.4)",
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginTop: "2px",
                  fontStyle: "normal",
                }}
              >
                {k}
              </div>
            </div>
          ))}
        </div>
      ))}
      <div
        style={{
          marginTop: "12px",
          padding: "7px 10px",
          borderRadius: "6px",
          background: "rgba(211,47,47,.15)",
          border: "0.5px solid rgba(211,47,47,.4)",
          color: "rgba(255,255,255,.95)",
          fontFamily: "var(--font-mono)",
          fontStyle: "normal",
          fontSize: "10px",
          letterSpacing: ".14em",
          textTransform: "uppercase",
          textAlign: "center",
          boxShadow: "inset 0 0 10px rgba(211,47,47,.1)",
        }}
      >
        Open full profile →
      </div>
    </div>
  );
}

function PlayerRow({
  id,
  jersey,
  jerseyColor,
  name,
  nameSuffix,
  role,
  stat,
  isHovered,
  onHover,
}: {
  id: "skenes" | "sale";
  jersey: string;
  jerseyColor: "pit" | "chw";
  name: string;
  nameSuffix?: string;
  role: string;
  stat: string;
  isHovered: boolean;
  onHover: (id: "skenes" | "sale" | null) => void;
}) {
  const jerseyStyles: Record<string, React.CSSProperties> = {
    pit: {
      background:
        "linear-gradient(180deg, rgba(253,181,32,.18), rgba(0,0,0,.4))",
      border: "0.5px solid rgba(253,181,32,.3)",
      color: "#fdb520",
    },
    chw: {
      background:
        "linear-gradient(180deg, rgba(200,200,200,.15), rgba(0,0,0,.4))",
      border: "0.5px solid rgba(255,255,255,.15)",
      color: "#dcdcdc",
    },
  };

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
    >
      {isHovered && <PlayerTooltip id={id} />}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr auto",
          gap: "12px",
          alignItems: "center",
          padding: "10px 12px",
          borderRadius: "9px",
          background: isHovered
            ? "linear-gradient(180deg, rgba(211,47,47,.10), rgba(211,47,47,.03))"
            : "rgba(255,255,255,.03)",
          border: isHovered
            ? "0.5px solid rgba(211,47,47,.4)"
            : "0.5px solid rgba(255,255,255,.08)",
          boxShadow: isHovered
            ? "0 0 0 0.5px rgba(211,47,47,.3) inset, 0 0 28px rgba(211,47,47,.18)"
            : "none",
          transition: "all 180ms ease-out",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "7px",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            fontSize: "10px",
            letterSpacing: ".02em",
            fontStyle: "normal",
            ...jerseyStyles[jerseyColor],
          }}
        >
          {jersey}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span
            style={{
              fontFamily: "var(--font-inter)",
              fontWeight: 500,
              fontSize: "13px",
              color: "rgba(255,255,255,.95)",
              fontStyle: "normal",
            }}
          >
            {name}
            {nameSuffix && (
              <em
                style={{
                  color: "rgba(255,255,255,.4)",
                  fontStyle: "normal",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  marginLeft: "4px",
                }}
              >
                {nameSuffix}
              </em>
            )}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(255,255,255,.4)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              fontStyle: "normal",
            }}
          >
            {role}
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(255,255,255,.6)",
            fontWeight: 500,
            fontStyle: "normal",
          }}
        >
          {stat}
        </span>
      </div>
    </div>
  );
}

export default function AlbertPanel() {
  const [hoveredPlayer, setHoveredPlayer] = useState<"skenes" | "sale" | null>(
    null
  );

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.albertAv}>A</div>
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "15px",
              letterSpacing: "-.01em",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Albert
            <span style={S.statusDot} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(255,255,255,.4)",
              textTransform: "uppercase",
              letterSpacing: ".14em",
              marginTop: "3px",
            }}
          >
            AI scout · researching Paul Skenes
          </div>
        </div>
        <div style={S.chatDropdown}>Chat ▾</div>
      </div>

      {/* Conversation */}
      <div style={S.convo}>
        {/* User message */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            maxWidth: "92%",
            marginLeft: "auto",
            flexDirection: "row-reverse",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              background:
                "linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02))",
              border: "0.5px solid rgba(255,255,255,.12)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(255,255,255,.6)",
              fontWeight: 500,
            }}
          >
            JM
          </div>
          <div
            style={{
              padding: "13px 15px",
              borderRadius: "12px",
              fontSize: "13.5px",
              lineHeight: 1.58,
              background: "rgba(255,255,255,.06)",
              border: "0.5px solid rgba(255,255,255,.08)",
              backdropFilter: "blur(24px)",
            }}
          >
            Compare Skenes&apos; slider to young Chris Sale&apos;s.
          </div>
        </div>

        {/* Albert message */}
        <div style={{ display: "flex", gap: "10px", maxWidth: "92%" }}>
          <div style={S.albertMsgAv}>A</div>
          <div style={S.albertBubble}>
            <span style={S.lbl}>Albert · 2s</span>
            Pulling both pitch mixes from age 22. Three things jump out —
            Skenes throws it{" "}
            <span style={S.callout}>+4 mph</span> harder (
            <span style={S.stat}>87</span> vs <span style={S.stat}>83</span>),
            Sale got <span style={S.callout}>+3 in</span> more horizontal break
            (<span style={S.stat}>16 in</span> vs{" "}
            <span style={S.stat}>13 in</span>), and Skenes&apos; vertical drop
            is late — Sale&apos;s shape is flatter earlier. Visualizing on the
            right.
            {/* Player rows */}
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <PlayerRow
                id="skenes"
                jersey="17"
                jerseyColor="pit"
                name="Paul Skenes"
                role="RHP · PIT · age 23"
                stat=".196 BA · 87 mph SL"
                isHovered={hoveredPlayer === "skenes"}
                onHover={setHoveredPlayer}
              />
              <PlayerRow
                id="sale"
                jersey="49"
                jerseyColor="chw"
                name="Chris Sale"
                nameSuffix="(2011)"
                role="LHP · CHW · age 22"
                stat=".211 BA · 83 mph SL"
                isHovered={hoveredPlayer === "sale"}
                onHover={setHoveredPlayer}
              />
            </div>
            <div style={S.genChip}>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M5 0L6.2 3.8H10L7 6.2L8.2 10L5 7.8L1.8 10L3 6.2L0 3.8H3.8L5 0Z"
                  fill="#d4af37"
                />
              </svg>
              Generated · Pitch Movement Bubble Chart →
            </div>
          </div>
        </div>

        {/* Typing indicator */}
        <div style={{ display: "flex", gap: "10px", maxWidth: "92%" }}>
          <div style={S.albertMsgAv}>A</div>
          <div
            style={{
              ...S.albertBubble,
              padding: "11px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                gap: "4px",
                padding: "4px 0",
              }}
            >
              {[0, 0.2, 0.4].map((delay, i) => (
                <span
                  key={i}
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "999px",
                    background: "#d4af37",
                    opacity: 0.4,
                    animation: `dot 1.2s ${delay}s infinite ease-in-out`,
                    display: "inline-block",
                  }}
                />
              ))}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontStyle: "normal",
                fontSize: "11px",
                color: "rgba(255,255,255,.4)",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              drafting comparison notes
            </span>
          </div>
        </div>
      </div>

      {/* Suggested follow-ups */}
      <div style={S.suggest}>
        <span style={S.suggestLbl}>Suggested follow-ups</span>
        {["Add Strider as a third comp", "Show whiff rates", "Compare at age 25"].map(
          (s) => (
            <button key={s} style={S.pill}>
              {s}
            </button>
          )
        )}
      </div>

      {/* Composer */}
      <div style={S.composer}>
        <div style={S.composerBox}>
          <div style={S.composerIcon}>＋</div>
          <div
            style={{
              fontSize: "13.5px",
              color: "rgba(255,255,255,.4)",
              minHeight: "40px",
              paddingTop: "3px",
              lineHeight: 1.5,
            }}
          >
            Ask Albert anything about baseball…
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={S.composerIcon}>🎙</div>
            <div style={S.sendBtn}>↵</div>
          </div>
        </div>
        <div style={S.sources}>
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "999px",
              background: "rgba(255,255,255,.4)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          Synthesized · Baseball Savant · FanGraphs · B-Ref · MiLB.com
        </div>
      </div>
    </div>
  );
}
