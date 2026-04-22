"use client";

import { useState } from "react";
import AlbertPanel, { type VizBlock } from "./AlbertPanel";
import VizPanel from "./VizPanel";
import PlayerCard from "./viz/PlayerCard";
import PlayerComparison from "./viz/PlayerComparison";
import type { CardData } from "@/lib/albert/viz-types";

/* ── Card column (single player) ─────────────────────────────────────────── */
function CardColumn({ cards }: { cards: VizBlock[] }) {
  return (
    <div
      style={{
        width: "260px",
        flexShrink: 0,
        height: "820px",
        overflowY: "auto",
        overflowX: "hidden",
        borderRight: "0.5px solid rgba(255,255,255,.08)",
        padding: "12px 11px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        scrollbarWidth: "none",
      }}
    >
      {cards.length > 0 ? (
        cards.map((card) => (
          <PlayerCard
            key={card.playerId}
            data={card.data as CardData}
            caption=""
            size="panel"
          />
        ))
      ) : (
        /* Empty state */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "24px 16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "36px", height: "36px", borderRadius: "999px",
              border: "0.5px solid rgba(255,255,255,.08)",
              display: "grid", placeItems: "center",
              background: "rgba(255,255,255,.02)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
              <path d="M6.5 10 Q10 6 13.5 10 Q10 14 6.5 10Z" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.2)" strokeWidth="0.5" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)", fontSize: "8.5px",
              color: "rgba(255,255,255,.2)", textTransform: "uppercase",
              letterSpacing: ".14em", lineHeight: 1.7,
            }}
          >
            Ask Albert about<br />any player to see<br />their card here
          </div>
        </div>
      )}
    </div>
  );
}


/* ── DashboardClient ─────────────────────────────────────────────────────── */
export default function DashboardClient() {
  const [latestViz, setLatestViz] = useState<VizBlock | null>(null);
  // Cards keyed by playerId — same player updates in place, new player appends
  const [cardMap, setCardMap] = useState<Map<number, VizBlock>>(new Map());

  const handleVizRendered = (block: VizBlock) => {
    if (block.vizType === "player_card") {
      setCardMap((prev) => {
        const next = new Map(prev);
        next.set(block.playerId, block);
        return next;
      });
    } else {
      setLatestViz(block);
    }
  };

  const handleDismiss = (playerId: number) => {
    setCardMap((prev) => {
      const next = new Map(prev);
      next.delete(playerId);
      return next;
    });
  };

  const cards = Array.from(cardMap.values());
  const isComparing = cards.length >= 2;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        minHeight: "820px",
        borderBottom: "0.5px solid rgba(255,255,255,.08)",
      }}
    >
      {/* Chat */}
      <div style={{ width: "548px", flexShrink: 0, borderRight: "0.5px solid rgba(255,255,255,.08)" }}>
        <AlbertPanel
          onVizRendered={handleVizRendered}
          onResponseStart={() => setCardMap(new Map())}
        />
      </div>

      {isComparing ? (
        /* Unified comparison — fills all remaining space */
        <PlayerComparison
          a={cards[cards.length - 2].data as CardData}
          b={cards[cards.length - 1].data as CardData}
          onDismiss={handleDismiss}
        />
      ) : (
        <>
          {/* Player card column — persists single player */}
          <CardColumn cards={cards} />

          {/* Main viz panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <VizPanel latestViz={latestViz} />
          </div>
        </>
      )}
    </div>
  );
}
