"use client";

import { useState } from "react";
import BubbleChart from "@/components/dashboard/viz/BubbleChart";
import SprayChart from "@/components/dashboard/viz/SprayChart";
import EvLaScatter from "@/components/dashboard/viz/EvLaScatter";
import BbProfile from "@/components/dashboard/viz/BbProfile";
import PitchMovement from "@/components/dashboard/viz/PitchMovement";
import ReleasePoint from "@/components/dashboard/viz/ReleasePoint";
import ZoneGrid from "@/components/dashboard/viz/ZoneGrid";
import PercentileRankings from "@/components/dashboard/viz/PercentileRankings";
import RollingChart from "@/components/players/RollingChart";
import type {
  BubbleChartData,
  SprayChartData,
  PitcherPitchData,
  PercentileData,
} from "@/lib/albert/viz-types";
import type { GameLogEntry } from "@/lib/players/getGameLog";

interface PlayerChartsGridProps {
  isPitcher: boolean;
  fullName: string;
  teamAbbr: string | null;
  season: number;
  // Shared
  percentileData: PercentileData | null;
  // Hitter charts
  battedBallData: SprayChartData | null;
  // Pitcher charts
  bubbleData: BubbleChartData | null;
  pitchData: PitcherPitchData | null;
  // Rolling trend
  gameLog: GameLogEntry[];
}

type ChartId =
  | "percentile" | "spray" | "ev_la" | "bb_profile"
  | "bubble" | "movement" | "release" | "zone"
  | "rolling";

interface ChartDef {
  id: ChartId;
  label: string;
  forPitcher: boolean;
  forHitter: boolean;
}

const CHART_DEFS: ChartDef[] = [
  { id: "percentile", label: "Percentile Rankings", forPitcher: true,  forHitter: true  },
  { id: "rolling",    label: "Season Trend",        forPitcher: true,  forHitter: true  },
  { id: "spray",      label: "Spray Chart",         forPitcher: false, forHitter: true  },
  { id: "ev_la",      label: "EV vs Launch Angle",  forPitcher: false, forHitter: true  },
  { id: "bb_profile", label: "Batted Ball Profile",  forPitcher: false, forHitter: true  },
  { id: "bubble",     label: "Pitch Arsenal",        forPitcher: true,  forHitter: false },
  { id: "movement",   label: "Pitch Movement",       forPitcher: true,  forHitter: false },
  { id: "release",    label: "Release Point",        forPitcher: true,  forHitter: false },
  { id: "zone",       label: "Zone Grid",            forPitcher: true,  forHitter: false },
];

export default function PlayerChartsGrid({
  isPitcher, fullName, season,
  percentileData, battedBallData, bubbleData, pitchData, gameLog,
}: PlayerChartsGridProps) {
  const availableCharts = CHART_DEFS.filter(
    (c) => isPitcher ? c.forPitcher : c.forHitter,
  );

  const [activeChart, setActiveChart] = useState<ChartId>(availableCharts[0]?.id ?? "percentile");

  const active = CHART_DEFS.find((c) => c.id === activeChart);

  function renderChart() {
    switch (activeChart) {
      case "rolling":
        return (
          <RollingChart
            entries={gameLog}
            isPitcher={isPitcher}
            playerName={fullName}
            season={season}
          />
        );

      case "percentile":
        if (!percentileData) return <Unavailable label="Percentile data" />;
        return <PercentileRankings data={percentileData} caption="" />;

      case "spray":
        if (!battedBallData) return <Unavailable label="Spray chart" />;
        return <SprayChart data={battedBallData} caption={`${fullName} — ${season} hit distribution`} />;

      case "ev_la":
        if (!battedBallData) return <Unavailable label="EV vs Launch Angle" />;
        return <EvLaScatter data={battedBallData} caption={`${fullName} — exit velocity vs launch angle`} />;

      case "bb_profile":
        if (!battedBallData) return <Unavailable label="Batted ball profile" />;
        return <BbProfile data={battedBallData} caption="" />;

      case "bubble":
        if (!bubbleData) return <Unavailable label="Pitch arsenal" />;
        return <BubbleChart data={bubbleData} caption={`${fullName} — arsenal by movement & whiff%`} />;

      case "movement":
        if (!pitchData) return <Unavailable label="Pitch movement" />;
        return <PitchMovement data={pitchData} caption="" />;

      case "release":
        if (!pitchData) return <Unavailable label="Release point" />;
        return <ReleasePoint data={pitchData} caption="" />;

      case "zone":
        if (!pitchData) return <Unavailable label="Zone grid" />;
        return <ZoneGrid data={pitchData} caption="" />;

      default:
        return null;
    }
  }

  return (
    <div>
      {/* Section label */}
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "9px",
        color: "rgba(255,255,255,.3)", textTransform: "uppercase",
        letterSpacing: ".18em", marginBottom: "14px",
        paddingBottom: "8px", borderBottom: "0.5px solid rgba(255,255,255,.06)",
      }}>
        Charts
      </div>

      {/* Chart selector tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
        {availableCharts.map((chart) => {
          const isActive = activeChart === chart.id;
          return (
            <button
              key={chart.id}
              onClick={() => setActiveChart(chart.id)}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: isActive ? "0.5px solid rgba(211,47,47,.5)" : "0.5px solid rgba(255,255,255,.08)",
                background: isActive ? "rgba(211,47,47,.1)" : "rgba(255,255,255,.02)",
                color: isActive ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.4)",
                fontFamily: "var(--font-mono)", fontSize: "9px",
                textTransform: "uppercase", letterSpacing: ".1em",
                cursor: "pointer", transition: ".15s",
              }}
            >
              {chart.label}
            </button>
          );
        })}
      </div>

      {/* Chart display */}
      <div style={{
        background: "rgba(255,255,255,.015)",
        border: "0.5px solid rgba(255,255,255,.06)",
        borderRadius: "10px",
        padding: "16px",
        minHeight: "200px",
      }}>
        {active && (
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "8.5px",
            color: "rgba(255,255,255,.2)", textTransform: "uppercase",
            letterSpacing: ".14em", marginBottom: "12px",
          }}>
            {active.label}
            <span style={{ marginLeft: "8px", color: "rgba(255,255,255,.12)" }}>
              — {season} season
            </span>
          </div>
        )}
        {renderChart()}
      </div>
    </div>
  );
}

function Unavailable({ label }: { label: string }) {
  return (
    <div style={{
      padding: "40px 24px", textAlign: "center",
      fontFamily: "var(--font-mono)", fontSize: "10px",
      color: "rgba(255,255,255,.18)", textTransform: "uppercase",
      letterSpacing: ".14em",
    }}>
      {label} not available for this player
    </div>
  );
}
