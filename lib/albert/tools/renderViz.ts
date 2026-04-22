/**
 * Albert tool: renderViz
 * Fetches data server-side and returns a structured viz payload.
 * The client receives the payload as a "viz" NDJSON event and renders it.
 *
 * Supported types:
 *   bubble_chart    — pitcher movement/arsenal (bubbles in movement space)
 *   spray_chart     — batter batted-ball locations on field
 *   exit_velo_zone  — batter exit-velocity hot zones (same data as spray_chart)
 *   pitch_heatmap   — pitcher location density heat map
 *   pitch_tracks    — pitcher side-view trajectory lines
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getPlayerStats, getSavantPitchArsenal } from "@/lib/mlb-api";
import { getBattedBallData } from "@/lib/albert/tools/getBattedBallData";
import { getPitchData } from "@/lib/albert/tools/getPitchData";
import { renderCard } from "@/lib/albert/tools/renderCard";
import type {
  BubbleChartData,
  SprayChartData,
  PitcherPitchData,
  VizPayload,
} from "@/lib/albert/viz-types";

export type { BubbleChartData, VizPayload };

export interface RenderVizResult extends VizPayload {
  error?: string;
}


/** Resolve player name + team from Supabase or MLB Stats API. */
async function resolvePlayer(
  mlbId: number,
  season: number,
): Promise<{ playerName: string; teamAbbr: string | null }> {
  const admin = createAdminClient();
  const { data: player } = await admin
    .from("players")
    .select("full_name, team_abbr")
    .eq("mlb_id", mlbId)
    .single();

  if (player) return { playerName: player.full_name, teamAbbr: player.team_abbr };

  try {
    const detail = await getPlayerStats(mlbId, season);
    if (detail) {
      return {
        playerName: detail.fullName,
        teamAbbr:
          (detail as typeof detail & { teamAbbreviation?: string })
            .teamAbbreviation ?? null,
      };
    }
  } catch {
    // non-fatal
  }

  return { playerName: `Player #${mlbId}`, teamAbbr: null };
}

export async function renderViz(input: {
  type: string;
  playerId: number;
  season?: number;
  caption: string;
}): Promise<RenderVizResult> {
  const season = input.season ?? 2025;

  // ── player_card ──────────────────────────────────────────────────────────
  if (input.type === "player_card") {
    return renderCard({ playerId: input.playerId, season, caption: input.caption });
  }

  // ── ev_la_scatter + bb_profile ──────────────────────────────────────────
  // Both use batted ball events; component handles the transformation
  if (input.type === "ev_la_scatter" || input.type === "bb_profile") {
    const { playerName, teamAbbr } = await resolvePlayer(input.playerId, season);
    const result = await getBattedBallData({ mlbamId: input.playerId, season });

    if (!result.found || result.events.length === 0) {
      return {
        vizType: input.type,
        playerId: input.playerId,
        data: { playerId: input.playerId, playerName, teamAbbr, season, events: [] } satisfies SprayChartData,
        caption: input.caption,
        error: result.error ?? `No ${season} batted-ball data for ${playerName}.`,
      };
    }

    return {
      vizType: input.type,
      playerId: input.playerId,
      data: { playerId: input.playerId, playerName, teamAbbr, season, events: result.events } satisfies SprayChartData,
      caption: input.caption,
    };
  }

  // ── pitch_movement + release_point + zone_grid ───────────────────────────
  // All use pitch_events; different rendering per type
  if (
    input.type === "pitch_movement" ||
    input.type === "release_point" ||
    input.type === "zone_grid"
  ) {
    const { playerName, teamAbbr } = await resolvePlayer(input.playerId, season);
    const result = await getPitchData({ pitcherId: input.playerId, playerName, teamAbbr, season });

    if (!result.found || !result.data) {
      return {
        vizType: input.type,
        playerId: input.playerId,
        data: { playerId: input.playerId, playerName, teamAbbr, season, pitchTypes: [], pitchNames: {}, events: [] } satisfies PitcherPitchData,
        caption: input.caption,
        error: result.error ?? `No ${season} pitch data for ${playerName}.`,
      };
    }

    return {
      vizType: input.type,
      playerId: input.playerId,
      data: { ...result.data, playerId: input.playerId },
      caption: input.caption,
    };
  }

  // ── exit_velo_zone ───────────────────────────────────────────────────────
  // Same underlying data as spray_chart; different viz component
  if (input.type === "exit_velo_zone") {
    const { playerName, teamAbbr } = await resolvePlayer(input.playerId, season);
    const result = await getBattedBallData({ mlbamId: input.playerId, season });

    if (!result.found || result.events.length === 0) {
      return {
        vizType: "exit_velo_zone",
        playerId: input.playerId,
        data: { playerId: input.playerId, playerName, teamAbbr, season, events: [] } satisfies SprayChartData,
        caption: input.caption,
        error: result.error ?? `No ${season} batted-ball data for ${playerName}.`,
      };
    }

    return {
      vizType: "exit_velo_zone",
      playerId: input.playerId,
      data: { playerId: input.playerId, playerName, teamAbbr, season, events: result.events } satisfies SprayChartData,
      caption: input.caption,
    };
  }

  // ── pitch_heatmap + pitch_tracks ─────────────────────────────────────────
  // Both use the same pitch_events scrape/cache; different rendering
  if (input.type === "pitch_heatmap" || input.type === "pitch_tracks") {
    const { playerName, teamAbbr } = await resolvePlayer(input.playerId, season);
    const result = await getPitchData({
      pitcherId: input.playerId,
      playerName,
      teamAbbr,
      season,
    });

    if (!result.found || !result.data) {
      return {
        vizType: input.type,
        playerId: input.playerId,
        data: {
          playerId: input.playerId,
          playerName,
          teamAbbr,
          season,
          pitchTypes: [],
          pitchNames: {},
          events: [],
        } satisfies PitcherPitchData,
        caption: input.caption,
        error:
          result.error ??
          `No ${season} pitch data for ${playerName}. They may not have pitched that season.`,
      };
    }

    return {
      vizType: input.type,
      playerId: input.playerId,
      data: { ...result.data, playerId: input.playerId },
      caption: input.caption,
    };
  }

  // ── spray_chart ──────────────────────────────────────────────────────────
  if (input.type === "spray_chart") {
    const { playerName, teamAbbr } = await resolvePlayer(input.playerId, season);
    const result = await getBattedBallData({ mlbamId: input.playerId, season });

    if (!result.found || result.events.length === 0) {
      return {
        vizType: "spray_chart",
        playerId: input.playerId,
        data: { playerId: input.playerId, playerName, teamAbbr, season, events: [] } satisfies SprayChartData,
        caption: input.caption,
        error: result.error ?? `No ${season} batted-ball data found for ${playerName}.`,
      };
    }

    return {
      vizType: "spray_chart",
      playerId: input.playerId,
      data: { playerId: input.playerId, playerName, teamAbbr, season, events: result.events } satisfies SprayChartData,
      caption: input.caption,
    };
  }

  // ── bubble_chart ─────────────────────────────────────────────────────────
  if (input.type !== "bubble_chart") {
    return {
      vizType: input.type,
      playerId: input.playerId,
      data: { playerName: "", teamAbbr: null, pitches: [] },
      caption: input.caption,
      error: `Viz type "${input.type}" is not yet supported.`,
    };
  }

  const admin = createAdminClient();

  const { data: player } = await admin
    .from("players")
    .select("id, full_name, team_abbr")
    .eq("mlb_id", input.playerId)
    .single();

  if (player) {
    const { data: pitchRows } = await admin
      .from("player_pitch_data")
      .select(
        "pitch_type, pitch_type_name, avg_velocity, usage_pct, horizontal_break_in, vertical_break_in, whiff_rate",
      )
      .eq("player_id", player.id)
      .eq("season", season)
      .order("usage_pct", { ascending: false });

    if (pitchRows && pitchRows.length > 0) {
      return {
        vizType: "bubble_chart",
        playerId: input.playerId,
        data: {
          playerId: input.playerId,
          playerName: player.full_name,
          teamAbbr: player.team_abbr,
          pitches: pitchRows.map((r) => ({
            pitchType: r.pitch_type,
            pitchTypeName: r.pitch_type_name ?? r.pitch_type,
            avgVelocity: r.avg_velocity,
            usagePct: r.usage_pct,
            horizontalBreakIn: r.horizontal_break_in,
            verticalBreakIn: r.vertical_break_in,
            whiffRate: r.whiff_rate,
          })),
        },
        caption: input.caption,
      };
    }
  }

  // Savant fallback
  let playerName = `Player #${input.playerId}`;
  let teamAbbr: string | null = null;
  try {
    const detail = await getPlayerStats(input.playerId, season);
    if (detail) {
      playerName = detail.fullName;
      teamAbbr =
        (detail as typeof detail & { teamAbbreviation?: string })
          .teamAbbreviation ?? null;
    }
  } catch { /* non-fatal */ }

  const savantRows = await getSavantPitchArsenal(input.playerId, season);
  if (savantRows.length === 0) {
    return {
      vizType: "bubble_chart",
      playerId: input.playerId,
      data: { playerName, teamAbbr, pitches: [] },
      caption: input.caption,
      error: `No ${season} pitch data found for ${playerName}.`,
    };
  }

  return {
    vizType: "bubble_chart",
    playerId: input.playerId,
    data: {
      playerId: input.playerId,
      playerName,
      teamAbbr,
      pitches: savantRows.map((r) => ({
        pitchType: r.pitch_type,
        pitchTypeName: r.pitch_type_name,
        avgVelocity: r.avg_velocity,
        usagePct: r.usage_pct,
        horizontalBreakIn: r.horizontal_break_in,
        verticalBreakIn: r.vertical_break_in,
        whiffRate: r.whiff_rate,
      })),
    },
    caption: input.caption,
  };
}
