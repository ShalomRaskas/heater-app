import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import MobileSplash from "@/components/MobileSplash";
import PlayerHero from "@/components/players/PlayerHero";
import SeasonStats from "@/components/players/SeasonStats";
import ProjectionsTable from "@/components/players/ProjectionsTable";
import RecentSplits from "@/components/players/RecentSplits";
import PlayerChartsGrid from "@/components/players/PlayerChartsGrid";
import GameLog from "@/components/players/GameLog";
import DetailedSplitsPanel from "@/components/players/DetailedSplits";
import {
  getPlayerStats,
  extractStats,
  getFanGraphsStats,
  getSavantPitchArsenal,
  num,
} from "@/lib/mlb-api";
import { getBattedBallData } from "@/lib/albert/tools/getBattedBallData";
import { getPitchData } from "@/lib/albert/tools/getPitchData";
import { getPercentileData } from "@/lib/albert/tools/getPercentileData";
import { getBatProjection, getPitProjection } from "@/lib/players/getProjections";
import { getRecentSplits } from "@/lib/players/getRecentSplits";
import { getGameLog } from "@/lib/players/getGameLog";
import { getDetailedSplits } from "@/lib/players/getDetailedSplits";
import type {
  BubbleChartData,
  SprayChartData,
  PitcherPitchData,
  PercentileData,
} from "@/lib/albert/viz-types";

const PITCHER_POSITIONS = new Set(["SP", "RP", "CP", "P"]);

export const metadata = { title: "Player Profile — Heater" };

export default async function PlayerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mlbId = parseInt(params.id);
  if (isNaN(mlbId)) notFound();

  // ── 1. Player bio + 2026 season stats ────────────────────────────────────────
  const detail = await getPlayerStats(mlbId, 2026);
  if (!detail) notFound();

  const fullName = detail.fullName;
  const teamAbbr = detail.teamAbbreviation ?? null;
  const teamName = detail.currentTeam?.name ?? null;
  const position = detail.primaryPosition?.abbreviation ?? null;
  const jerseyNumber = detail.primaryNumber ?? null;
  const age = detail.currentAge ?? null;
  const height = detail.height ?? null;
  const weight = detail.weight ?? null;
  const bats = detail.batSide?.code ?? null;
  const throws = detail.pitchHand?.code ?? null;

  const isPitcher = PITCHER_POSITIONS.has(position ?? "");
  const isTwp = position === "TWP";
  const isHitter = !isPitcher || isTwp;

  // For FanGraphs + projections: use pitcher for TWP (primary analytical frame)
  const fgType = isPitcher || isTwp ? "pit" : "bat";
  const percentileType: "bat" | "pit" = isPitcher && !isTwp ? "pit" : "bat";

  // ── 2. Extract 2026 stats ─────────────────────────────────────────────────────
  const hRaw = extractStats(detail.stats, "hitting");
  const pRaw = extractStats(detail.stats, "pitching");

  // ── 3. Parallel data fetches ──────────────────────────────────────────────────
  const [
    fgStats,
    recentSplits,
    percentileResult,
    batProjection,
    pitProjection,
    battedBallResult,
    pitchArsenal,
    pitchDataResult,
    gameLogResult,
    detailedSplits,
  ] = await Promise.all([
    getFanGraphsStats(fullName, 2026, fgType as "bat" | "pit"),
    getRecentSplits(mlbId),
    getPercentileData({ mlbId, season: 2025, type: percentileType }),
    isHitter ? getBatProjection(mlbId) : Promise.resolve(null),
    isPitcher || isTwp ? getPitProjection(mlbId) : Promise.resolve(null),
    isHitter
      ? getBattedBallData({ mlbamId: mlbId, season: 2025 })
      : Promise.resolve(null),
    isPitcher || isTwp
      ? getSavantPitchArsenal(mlbId, 2025)
      : Promise.resolve([]),
    isPitcher || isTwp
      ? getPitchData({ pitcherId: mlbId, playerName: fullName, teamAbbr, season: 2025 })
      : Promise.resolve(null),
    getGameLog(mlbId, 2026),
    getDetailedSplits(mlbId, 2026, isPitcher && !isTwp),
  ]);

  // ── 4. Build typed stat objects ───────────────────────────────────────────────
  const hittingStats = hRaw
    ? {
        gp: num(hRaw.gamesPlayed),
        avg: num(hRaw.avg),
        obp: num(hRaw.obp),
        slg: num(hRaw.slg),
        ops: num(hRaw.ops),
        hr: num(hRaw.homeRuns),
        rbi: num(hRaw.rbi),
        sb: num(hRaw.stolenBases),
        bb: num(hRaw.baseOnBalls),
        so: num(hRaw.strikeOuts),
        war: fgStats?.war ?? null,
        wrcPlus: fgStats?.wrcPlus ?? null,
        babip: fgStats?.babip ?? null,
      }
    : null;

  const pitchingStats = pRaw
    ? {
        gp: num(pRaw.gamesPlayed),
        w: num(pRaw.wins),
        l: num(pRaw.losses),
        sv: num(pRaw.saves),
        era: num(pRaw.era),
        whip: num(pRaw.whip),
        ip: num(pRaw.inningsPitched),
        so: num(pRaw.strikeOuts),
        bb: num(pRaw.baseOnBalls),
        war: fgStats?.war ?? null,
        fip: fgStats?.fip ?? null,
        babip: fgStats?.babip ?? null,
      }
    : null;

  // ── 5. Build chart data ───────────────────────────────────────────────────────
  const percentileData: PercentileData | null =
    percentileResult.found && percentileResult.metrics.length > 0
      ? {
          playerId: mlbId,
          playerName: fullName,
          teamAbbr,
          season: 2025,
          type: percentileType,
          metrics: percentileResult.metrics,
        }
      : null;

  const battedBallData: SprayChartData | null =
    battedBallResult?.found
      ? {
          playerId: mlbId,
          playerName: fullName,
          teamAbbr,
          season: 2025,
          events: battedBallResult.events,
        }
      : null;

  const bubbleData: BubbleChartData | null =
    pitchArsenal.length > 0
      ? {
          playerId: mlbId,
          playerName: fullName,
          teamAbbr,
          pitches: pitchArsenal.map((p) => ({
            pitchType: p.pitch_type,
            pitchTypeName: p.pitch_type_name,
            avgVelocity: p.avg_velocity,
            usagePct: p.usage_pct,
            horizontalBreakIn: p.horizontal_break_in,
            verticalBreakIn: p.vertical_break_in,
            whiffRate: p.whiff_rate,
          })),
        }
      : null;

  const pitchData: PitcherPitchData | null = pitchDataResult?.data ?? null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      <MobileSplash />
      <div className="desktop-only">
        <Navbar email={user.email ?? ""} />

        {/* Hero */}
        <PlayerHero
          mlbId={mlbId}
          fullName={fullName}
          teamAbbr={teamAbbr}
          teamName={teamName}
          position={position}
          jerseyNumber={jerseyNumber}
          age={age}
          height={height}
          weight={weight}
          bats={bats}
          throws={throws}
        />

        {/* Main content */}
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "32px 48px",
            display: "grid",
            gridTemplateColumns: "340px 1fr",
            gap: "40px",
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Season stats */}
            <Panel>
              <SeasonStats
                season={2026}
                hitting={hittingStats}
                pitching={pitchingStats}
              />
            </Panel>

            {/* Steamer projections */}
            <Panel>
              <ProjectionsTable
                type={isPitcher && !isTwp ? "pit" : "bat"}
                bat={batProjection}
                pit={pitProjection}
              />
            </Panel>

            {/* Recent splits */}
            <Panel>
              <RecentSplits
                splits={recentSplits}
                isPitcher={isPitcher && !isTwp}
              />
            </Panel>

            {/* Platoon + home/away splits */}
            <Panel>
              <PanelLabel>Splits</PanelLabel>
              <DetailedSplitsPanel
                splits={detailedSplits}
                isPitcher={isPitcher && !isTwp}
              />
            </Panel>
          </div>

          {/* Right column — charts */}
          <Panel>
            <PlayerChartsGrid
              isPitcher={isPitcher || isTwp}
              fullName={fullName}
              teamAbbr={teamAbbr}
              season={2025}
              percentileData={percentileData}
              battedBallData={battedBallData}
              bubbleData={bubbleData}
              pitchData={pitchData}
              gameLog={gameLogResult.entries}
            />
          </Panel>
        </div>

        {/* Game log — full width below grid */}
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 48px 48px" }}>
          <Panel>
            <PanelLabel>Game Log — Last {gameLogResult.entries.length} Games</PanelLabel>
            <GameLog
              entries={gameLogResult.entries}
              isPitcher={gameLogResult.type === "pitching"}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,.02)",
        border: "0.5px solid rgba(255,255,255,.08)",
        borderRadius: "12px",
        padding: "20px 22px",
      }}
    >
      {children}
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)",
      fontSize: "9px",
      color: "rgba(255,255,255,.3)",
      textTransform: "uppercase",
      letterSpacing: ".18em",
      marginBottom: "14px",
      paddingBottom: "8px",
      borderBottom: "0.5px solid rgba(255,255,255,.06)",
    }}>
      {children}
    </div>
  );
}
