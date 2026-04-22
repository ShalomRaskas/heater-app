"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { VizBlock } from "./AlbertPanel";
import type { BubbleChartData, SprayChartData, PitcherPitchData, PercentileData } from "@/lib/albert/viz-types";
import type { SprayChartFilters } from "./viz/SprayChart";
import type { BubbleChartFilters } from "./viz/BubbleChart";
import type { ExitVeloZoneFilters } from "./viz/ExitVeloZone";
import type { PitcherHeatMapFilters } from "./viz/PitcherHeatMap";
import type { PitchTracksFilters } from "./viz/PitchTracks";
import type { EvLaScatterFilters } from "./viz/EvLaScatter";
import type { BbProfileFilters } from "./viz/BbProfile";
import type { PitchMovementFilters } from "./viz/PitchMovement";
import type { ReleasePointFilters } from "./viz/ReleasePoint";
import type { ZoneGridFilters } from "./viz/ZoneGrid";
import BubbleChart from "./viz/BubbleChart";
import SprayChart from "./viz/SprayChart";
import ExitVeloZone from "./viz/ExitVeloZone";
import PitcherHeatMap from "./viz/PitcherHeatMap";
import PitchTracks from "./viz/PitchTracks";
import EvLaScatter from "./viz/EvLaScatter";
import BbProfile from "./viz/BbProfile";
import PitchMovement from "./viz/PitchMovement";
import ReleasePoint from "./viz/ReleasePoint";
import ZoneGrid from "./viz/ZoneGrid";
import PercentileRankings from "./viz/PercentileRankings";

/* ── Filter state ────────────────────────────────────────────────────────── */
interface FilterState {
  season: number;
  handedness: "L" | "R" | "all";   // pitcher throws — for batter charts
  stand: "L" | "R" | "all";         // batter stands  — for pitcher charts
  countState: "2strike" | "even" | "ahead" | "behind" | "all";
  pitchTypes: string[];
}

const DEFAULT_FILTERS: FilterState = {
  season: 2025,
  handedness: "all",
  stand: "all",
  countState: "all",
  pitchTypes: [],
};

/* ── Style helpers ───────────────────────────────────────────────────────── */
const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase" as const,
  letterSpacing: ".1em",
};

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...MONO, fontSize: "8px", color: "rgba(255,255,255,.3)", marginBottom: "6px" }}>
      {children}
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...MONO, fontSize: "8.5px", padding: "4px 8px", borderRadius: "5px",
        border: active ? "0.5px solid rgba(212,175,55,.5)" : "0.5px solid rgba(255,255,255,.1)",
        background: active ? "rgba(212,175,55,.12)" : "rgba(255,255,255,.03)",
        color: active ? "rgba(212,175,55,.9)" : "rgba(255,255,255,.45)",
        cursor: "pointer", transition: "all .15s",
        whiteSpace: "nowrap" as const, width: "100%", textAlign: "left" as const,
      }}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...MONO, fontSize: "8px", padding: "3px 7px", borderRadius: "999px",
        border: active ? "0.5px solid rgba(255,107,53,.5)" : "0.5px solid rgba(255,255,255,.08)",
        background: active ? "rgba(255,107,53,.12)" : "rgba(255,255,255,.02)",
        color: active ? "rgba(255,107,53,.9)" : "rgba(255,255,255,.35)",
        cursor: "pointer", transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const BATTER_VIZ = new Set(["spray_chart", "exit_velo_zone", "ev_la_scatter", "bb_profile"]);
const PITCHER_VIZ = new Set(["pitch_heatmap", "pitch_tracks", "pitch_movement", "release_point", "zone_grid"]);

function getDataSeason(viz: VizBlock | null): number {
  if (!viz) return 2025;
  if (BATTER_VIZ.has(viz.vizType)) return (viz.data as SprayChartData).season ?? 2025;
  if (PITCHER_VIZ.has(viz.vizType)) return (viz.data as PitcherPitchData).season ?? 2025;
  if (viz.vizType === "percentile_rankings") return (viz.data as PercentileData).season ?? 2025;
  return 2025;
}

/* ── VizPanel ─────────────────────────────────────────────────────────────── */
export default function VizPanel({ latestViz }: { latestViz: VizBlock | null }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [seasonData, setSeasonData] = useState<VizBlock | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeViz, setActiveViz] = useState<VizBlock | null>(null);
  const prevPlayerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!latestViz) {
      setActiveViz(null);
      prevPlayerIdRef.current = null;
      return;
    }

    setFilters({ ...DEFAULT_FILTERS, season: getDataSeason(latestViz) });
    setSeasonData(null);
    setFetchError(null);

    const prevPlayerId = prevPlayerIdRef.current;
    prevPlayerIdRef.current = latestViz.playerId;

    if (prevPlayerId !== null && prevPlayerId !== latestViz.playerId) {
      // New player — blank first, then render
      setActiveViz(null);
      const t = setTimeout(() => setActiveViz(latestViz), 150);
      return () => clearTimeout(t);
    } else {
      setActiveViz(latestViz);
    }
  }, [latestViz]);

  const activeData = seasonData ?? activeViz;
  const isTransitioning = !!latestViz && !activeViz;

  const handleSeasonChange = async (newSeason: number) => {
    if (!latestViz || newSeason === filters.season) return;
    setFilters((f) => ({ ...f, season: newSeason, pitchTypes: [] }));
    setFetchError(null);

    const originalSeason = getDataSeason(latestViz);
    if (newSeason === originalSeason) { setSeasonData(null); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/viz-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: latestViz.vizType,
          playerId: latestViz.playerId,
          season: newSeason,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error ?? "Failed to load season data.");
        setSeasonData(null);
      } else {
        setSeasonData({
          type: "viz",
          vizType: json.vizType,
          playerId: json.playerId,
          data: json.data,
          caption: json.caption || latestViz.caption,
        });
      }
    } catch {
      setFetchError("Network error loading season data.");
    } finally {
      setLoading(false);
    }
  };

  // Derive available pitch types from active data
  const availablePitchTypes = useMemo(() => {
    if (!activeData) return [];
    const battedBallVizTypes = ["spray_chart", "exit_velo_zone", "ev_la_scatter", "bb_profile"];
    if (battedBallVizTypes.includes(activeData.vizType)) {
      const d = activeData.data as SprayChartData;
      return Array.from(new Set(d.events.map((e) => e.pitch_type).filter(Boolean))) as string[];
    }
    if (activeData.vizType === "bubble_chart") {
      const d = activeData.data as BubbleChartData;
      return d.pitches.filter((p) => (p.usagePct ?? 0) >= 0.01).map((p) => p.pitchType);
    }
    const pitcherVizTypes = ["pitch_heatmap", "pitch_tracks", "pitch_movement", "release_point", "zone_grid"];
    if (pitcherVizTypes.includes(activeData.vizType)) {
      return (activeData.data as PitcherPitchData).pitchTypes;
    }
    return [];
  }, [activeData]);

  const togglePitchType = (pt: string) => {
    setFilters((f) => ({
      ...f,
      pitchTypes: f.pitchTypes.includes(pt)
        ? f.pitchTypes.filter((x) => x !== pt)
        : [...f.pitchTypes, pt],
    }));
  };

  /* ── Empty state ── */
  if (!latestViz) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        height: "820px", gap: "12px", padding: "40px",
      }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "999px",
          border: "0.5px solid rgba(255,255,255,.08)",
          display: "grid", placeItems: "center",
          background: "rgba(255,255,255,.02)",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
            <path d="M7 10 Q10 6 13 10 Q10 14 7 10Z" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="0.5" />
          </svg>
        </div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "10px",
          color: "rgba(255,255,255,.3)", textTransform: "uppercase",
          letterSpacing: ".14em", textAlign: "center", lineHeight: 1.6,
        }}>
          Ask Albert to show a spray chart,<br />pitch arsenal, or trajectory to populate this panel
        </div>
      </div>
    );
  }

  /* ── Viz type flags ── */
  const vt = activeData?.vizType ?? "";
  const isSpray        = vt === "spray_chart";
  const isBubble       = vt === "bubble_chart";
  const isExitVelo     = vt === "exit_velo_zone";
  const isHeatMap      = vt === "pitch_heatmap";
  const isPitchTrack   = vt === "pitch_tracks";
  const isEvLa         = vt === "ev_la_scatter";
  const isBbProfile    = vt === "bb_profile";
  const isPitchMove    = vt === "pitch_movement";
  const isReleasePoint = vt === "release_point";
  const isZoneGrid     = vt === "zone_grid";
  const isCard         = false; // player_card routed to CardColumn in DashboardClient
  const isPercentile   = vt === "percentile_rankings";

  // Batter charts: show pitcher-throws filter
  const showHandedness = isSpray || isExitVelo || isEvLa || isBbProfile;
  // Pitcher charts: show batter-stands filter
  const showStand = isHeatMap || isPitchTrack || isPitchMove || isReleasePoint || isZoneGrid;
  // Count filter: spray + EV/LA scatter only
  const showCount = isSpray || isEvLa;
  const showNoFilters = isCard || isPercentile;

  /* ── Filter objects passed to each chart component ── */
  const sprayFilters: SprayChartFilters = {
    handedness: filters.handedness,
    countState: filters.countState,
    pitchTypes: filters.pitchTypes,
  };
  const bubbleFilters: BubbleChartFilters = { pitchTypes: filters.pitchTypes };
  const exitVeloFilters: ExitVeloZoneFilters = {
    handedness: filters.handedness,
    pitchTypes: filters.pitchTypes,
  };
  const heatMapFilters: PitcherHeatMapFilters = {
    stand: filters.stand,
    pitchTypes: filters.pitchTypes,
  };
  const pitchTracksFilters: PitchTracksFilters = {
    stand: filters.stand,
    pitchTypes: filters.pitchTypes,
  };
  const evLaFilters: EvLaScatterFilters = {
    handedness: filters.handedness,
    countState: filters.countState,
    pitchTypes: filters.pitchTypes,
  };
  const bbProfileFilters: BbProfileFilters = {
    handedness: filters.handedness,
    pitchTypes: filters.pitchTypes,
  };
  const pitchMoveFilters: PitchMovementFilters = {
    stand: filters.stand,
    pitchTypes: filters.pitchTypes,
  };
  const releasePointFilters: ReleasePointFilters = {
    stand: filters.stand,
    pitchTypes: filters.pitchTypes,
  };
  const zoneGridFilters: ZoneGridFilters = {
    stand: filters.stand,
    pitchTypes: filters.pitchTypes,
  };

  const vizLabel =
    isSpray        ? "Spray Chart"
    : isBubble     ? "Pitch Arsenal"
    : isExitVelo   ? "Exit Velo Zones"
    : isHeatMap    ? "Pitch Heat Map"
    : isPitchTrack ? "Pitch Tracks"
    : isEvLa       ? "EV vs Launch Angle"
    : isBbProfile  ? "Batted Ball Profile"
    : isPitchMove  ? "Pitch Movement"
    : isReleasePoint ? "Release Point"
    : isZoneGrid     ? "Zone Grid"
    : isPercentile   ? "Percentile Rankings"
    : isCard         ? "Player Card"
    : "Visualization";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "820px", overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{
        padding: "14px 20px", borderBottom: "0.5px solid rgba(255,255,255,.06)",
        display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "9px",
          color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".14em",
        }}>
          {vizLabel}
        </div>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,.06)" }} />
        {loading && (
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "8.5px",
            color: "rgba(212,175,55,.6)", textTransform: "uppercase",
            letterSpacing: ".1em", animation: "amberPulse 1s ease-in-out infinite",
          }}>
            Loading…
          </div>
        )}
      </div>

      {/* ── Body: chart + right sidebar ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* Chart area */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "12px", overflow: "hidden", minWidth: 0,
        }}>
          {isTransitioning ? null : fetchError ? (
            <div style={{
              padding: "16px", borderRadius: "8px",
              background: "rgba(211,47,47,.06)", border: "0.5px solid rgba(211,47,47,.2)",
              fontFamily: "var(--font-mono)", fontSize: "11px",
              color: "rgba(255,120,120,.7)", letterSpacing: ".06em",
            }}>
              {fetchError}
            </div>
          ) : loading ? (
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "10px",
              color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: ".12em",
            }}>
              Fetching {filters.season} data…
            </div>
          ) : (
            <div style={{ width: "100%", maxWidth: (isSpray || isExitVelo) ? "710px" : undefined }}>
              {isSpray && (
                <SprayChart
                  data={activeData!.data as SprayChartData}
                  caption={activeData!.caption}
                  size="panel" filters={sprayFilters}
                />
              )}
              {isBubble && (
                <BubbleChart
                  data={activeData!.data as BubbleChartData}
                  caption={activeData!.caption}
                  size="panel" filters={bubbleFilters}
                />
              )}
              {isExitVelo && (
                <ExitVeloZone
                  data={activeData!.data as SprayChartData}
                  caption={activeData!.caption}
                  size="panel" filters={exitVeloFilters}
                />
              )}
              {isHeatMap && (
                <PitcherHeatMap
                  data={activeData!.data as PitcherPitchData}
                  caption={activeData!.caption}
                  size="panel" filters={heatMapFilters}
                />
              )}
              {isPitchTrack && (
                <PitchTracks
                  data={activeData!.data as PitcherPitchData}
                  caption={activeData!.caption}
                  size="panel" filters={pitchTracksFilters}
                />
              )}
              {isEvLa && (
                <EvLaScatter
                  data={activeData!.data as SprayChartData}
                  caption={activeData!.caption}
                  size="panel" filters={evLaFilters}
                />
              )}
              {isBbProfile && (
                <BbProfile
                  data={activeData!.data as SprayChartData}
                  caption={activeData!.caption}
                  size="panel" filters={bbProfileFilters}
                />
              )}
              {isPitchMove && (
                <PitchMovement
                  data={activeData!.data as PitcherPitchData}
                  caption={activeData!.caption}
                  size="panel" filters={pitchMoveFilters}
                />
              )}
              {isReleasePoint && (
                <ReleasePoint
                  data={activeData!.data as PitcherPitchData}
                  caption={activeData!.caption}
                  size="panel" filters={releasePointFilters}
                />
              )}
              {isZoneGrid && (
                <ZoneGrid
                  data={activeData!.data as PitcherPitchData}
                  caption={activeData!.caption}
                  size="panel" filters={zoneGridFilters}
                />
              )}
              {isPercentile && (
                <PercentileRankings
                  data={activeData!.data as PercentileData}
                  caption={activeData!.caption}
                  size="panel"
                />
              )}
              {/* Caption */}
              {activeData && (
                <div style={{
                  marginTop: "6px", fontFamily: "var(--font-mono)", fontSize: "9px",
                  color: "rgba(255,255,255,.28)", textTransform: "uppercase",
                  letterSpacing: ".12em", textAlign: "center",
                }}>
                  {activeData.caption}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Filter sidebar ── */}
        <div style={{
          width: showNoFilters ? "0px" : "160px",
          flexShrink: 0,
          overflow: showNoFilters ? "hidden" : "auto",
          borderLeft: showNoFilters ? "none" : "0.5px solid rgba(255,255,255,.06)",
          padding: showNoFilters ? "0" : "16px 12px",
          display: "flex", flexDirection: "column", gap: "20px",
          transition: "width .2s",
        }}>
          {/* Season */}
          <div>
            <FilterLabel>Season</FilterLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {[2023, 2024, 2025, 2026].map((yr) => (
                <ToggleBtn
                  key={yr} active={filters.season === yr}
                  onClick={() => handleSeasonChange(yr)}
                >
                  {yr}
                </ToggleBtn>
              ))}
            </div>
          </div>

          {/* Pitcher throws — batter charts */}
          {showHandedness && (
            <div>
              <FilterLabel>Pitcher throws</FilterLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {(["all", "L", "R"] as const).map((h) => (
                  <ToggleBtn
                    key={h} active={filters.handedness === h}
                    onClick={() => setFilters((f) => ({ ...f, handedness: h }))}
                  >
                    {h === "all" ? "All" : `vs ${h}HP`}
                  </ToggleBtn>
                ))}
              </div>
            </div>
          )}

          {/* Batter stands — pitcher charts */}
          {showStand && (
            <div>
              <FilterLabel>Batter stands</FilterLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {(["all", "L", "R"] as const).map((s) => (
                  <ToggleBtn
                    key={s} active={filters.stand === s}
                    onClick={() => setFilters((f) => ({ ...f, stand: s }))}
                  >
                    {s === "all" ? "All" : `vs ${s}HH`}
                  </ToggleBtn>
                ))}
              </div>
            </div>
          )}

          {/* Count — spray chart only */}
          {showCount && (
            <div>
              <FilterLabel>Count</FilterLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {(
                  [
                    ["all", "All"],
                    ["2strike", "2 Strikes"],
                    ["even", "Even"],
                    ["ahead", "Ahead"],
                    ["behind", "Behind"],
                  ] as const
                ).map(([val, label]) => (
                  <ToggleBtn
                    key={val} active={filters.countState === val}
                    onClick={() => setFilters((f) => ({ ...f, countState: val }))}
                  >
                    {label}
                  </ToggleBtn>
                ))}
              </div>
            </div>
          )}

          {/* Pitch type chips */}
          {availablePitchTypes.length > 0 && (
            <div>
              <FilterLabel>
                Pitch type
                {filters.pitchTypes.length > 0 && (
                  <button
                    onClick={() => setFilters((f) => ({ ...f, pitchTypes: [] }))}
                    style={{
                      ...MONO, fontSize: "7px", marginLeft: "6px",
                      color: "rgba(255,107,53,.6)", background: "none",
                      border: "none", cursor: "pointer", padding: 0,
                    }}
                  >
                    Clear
                  </button>
                )}
              </FilterLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {availablePitchTypes.map((pt) => (
                  <Chip
                    key={pt} active={filters.pitchTypes.includes(pt)}
                    onClick={() => togglePitchType(pt)}
                  >
                    {pt}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
