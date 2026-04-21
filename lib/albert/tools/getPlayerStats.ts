/**
 * Albert tool: getPlayerStats
 * Fetches 2026 (or given) season stats for any active MLB player via the MLB Stats API.
 * Designed to be called from the Anthropic tool-use loop in /api/albert.
 */

import {
  getPlayerByName,
  getPlayerStats as mlbGetPlayerStats,
  extractStats,
  num,
} from "@/lib/mlb-api";

export interface PlayerStatsResult {
  found: boolean;
  player?: {
    id: number;
    fullName: string;
    team: string | null;
    position: string | null;
  };
  hitting?: {
    gamesPlayed: number | null;
    plateAppearances: number | null;
    avg: number | null;
    obp: number | null;
    slg: number | null;
    ops: number | null;
    homeRuns: number | null;
    rbi: number | null;
    stolenBases: number | null;
    strikeouts: number | null;
    walks: number | null;
  };
  pitching?: {
    gamesPlayed: number | null;
    gamesStarted: number | null;
    wins: number | null;
    losses: number | null;
    saves: number | null;
    era: number | null;
    whip: number | null;
    inningsPitched: number | null;
    strikeouts: number | null;
    walks: number | null;
  };
  error?: string;
}

export async function getPlayerStats(input: {
  playerName: string;
  season?: number;
}): Promise<PlayerStatsResult> {
  const season = input.season ?? 2026;

  try {
    // ── 1. Resolve player ──────────────────────────────────────────────────────
    const player = await getPlayerByName(input.playerName);

    if (!player) {
      return {
        found: false,
        error: `No active MLB player found matching "${input.playerName}". Check the spelling or try a more complete name.`,
      };
    }

    // ── 2. Fetch season stats ──────────────────────────────────────────────────
    const detail = await mlbGetPlayerStats(player.id, season);

    if (!detail) {
      return {
        found: false,
        error: `Found ${player.fullName} but could not retrieve their stats from the MLB API.`,
      };
    }

    const team =
      detail.teamAbbreviation ?? detail.currentTeam?.name ?? null;
    const position = detail.primaryPosition?.abbreviation ?? null;

    const hittingRaw = extractStats(detail.stats, "hitting");
    const pitchingRaw = extractStats(detail.stats, "pitching");

    const result: PlayerStatsResult = {
      found: true,
      player: {
        id: detail.id,
        fullName: detail.fullName,
        team,
        position,
      },
    };

    if (hittingRaw) {
      result.hitting = {
        gamesPlayed: num(hittingRaw.gamesPlayed),
        plateAppearances: num(hittingRaw.plateAppearances),
        avg: num(hittingRaw.avg),
        obp: num(hittingRaw.obp),
        slg: num(hittingRaw.slg),
        ops: num(hittingRaw.ops),
        homeRuns: num(hittingRaw.homeRuns),
        rbi: num(hittingRaw.rbi),
        stolenBases: num(hittingRaw.stolenBases),
        strikeouts: num(hittingRaw.strikeOuts),
        walks: num(hittingRaw.baseOnBalls),
      };
    }

    if (pitchingRaw) {
      result.pitching = {
        gamesPlayed: num(pitchingRaw.gamesPlayed),
        gamesStarted: num(pitchingRaw.gamesStarted),
        wins: num(pitchingRaw.wins),
        losses: num(pitchingRaw.losses),
        saves: num(pitchingRaw.saves),
        era: num(pitchingRaw.era),
        whip: num(pitchingRaw.whip),
        inningsPitched: num(pitchingRaw.inningsPitched),
        strikeouts: num(pitchingRaw.strikeOuts),
        walks: num(pitchingRaw.baseOnBalls),
      };
    }

    // Player found but no stats yet this season
    if (!hittingRaw && !pitchingRaw) {
      result.error = `${detail.fullName} has no ${season} season stats yet — they may be on the injured list or haven't appeared in a game this season.`;
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      found: false,
      error: `MLB API error looking up "${input.playerName}": ${msg}`,
    };
  }
}
