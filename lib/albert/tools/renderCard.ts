/**
 * Tool handler: renderCard
 * Assembles a baseball card payload from Supabase (seeded players)
 * or MLB Stats API (anyone else), then overlays advanced stats from
 * Baseball Savant (Hard Hit%, EV, Barrel%) and FanGraphs (WAR, wRC+, FIP, BABIP)
 * for ALL players regardless of whether they're seeded.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlayerStats,
  extractStats,
  num,
  getSavantBatterMetrics,
  getFanGraphsStats,
} from "@/lib/mlb-api";
import type { CardData } from "@/lib/albert/viz-types";

export interface RenderCardResult {
  vizType: "player_card";
  playerId: number;
  data: CardData;
  caption: string;
  error?: string;
}

/** Barrel: EV ≥ 98 mph, LA ≥ 26°, max angle expands 2°/mph above 98 up to 50°. */
function isBarrel(ev: number, la: number): boolean {
  if (ev < 98) return false;
  const maxAngle = Math.min(50, 26 + (ev - 98) * 2);
  return la >= 26 && la <= maxAngle;
}

export async function renderCard(input: {
  playerId: number;
  season?: number;
  caption: string;
}): Promise<RenderCardResult> {
  const season = input.season ?? 2026;
  // Use prior season for Statcast/FanGraphs lookups during early current season
  const statSeason = season === 2026 ? 2025 : season;
  const admin = createAdminClient();

  // ── 1. Player identity from Supabase ─────────────────────────────────────
  const { data: player } = await admin
    .from("players")
    .select("id, mlb_id, full_name, team_abbr, position, jersey_number, age, height, weight, bats, throws")
    .eq("mlb_id", input.playerId)
    .single();

  let playerName   = player?.full_name        ?? `Player #${input.playerId}`;
  let teamAbbr     = player?.team_abbr        ?? null;
  let position     = player?.position         ?? null;
  let jerseyNumber = player?.jersey_number    ? `#${player.jersey_number}` : null;
  let age          = player?.age              ?? null;
  let height       = player?.height           ?? null;
  let weight       = player?.weight           ?? null;
  let bats         = player?.bats             ?? null;
  let throwsHand   = player?.throws           ?? null;

  // ── 2. Stats from primary source ──────────────────────────────────────────
  let hitting: CardData["hitting"]   = null;
  let pitching: CardData["pitching"] = null;

  if (player) {
    // ── Seeded player: use Supabase ──────────────────────────────────────────
    const [statsRes, battedRes, pitchStatsRes] = await Promise.all([
      admin
        .from("player_stats_current")
        .select(
          "games, avg, obp, slg, ops, wrc_plus, babip, home_runs, rbi, stolen_bases, " +
          "era, fip, whip, innings_pitched, strikeouts_pitcher, wins, losses, saves, " +
          "k_rate, bb_rate",
        )
        .eq("player_id", player.id)
        .eq("season", season)
        .single() as unknown as Promise<{ data: Record<string, number | null> | null }>,

      admin
        .from("batted_ball_events")
        .select("launch_speed, launch_angle")
        .eq("mlbam_id", input.playerId)
        .eq("season", season)
        .not("launch_speed", "is", null) as unknown as Promise<{
          data: { launch_speed: number; launch_angle: number | null }[] | null;
        }>,

      admin
        .from("player_stats_current")
        .select("strikeouts_pitcher, innings_pitched, k_rate, bb_rate")
        .eq("player_id", player.id)
        .eq("season", season)
        .single() as unknown as Promise<{ data: Record<string, number | null> | null }>,
    ]);

    const s     = statsRes.data;
    const balls = battedRes.data ?? [];
    const ps    = pitchStatsRes.data;

    if (s && s.avg != null) {
      let hardHitRate: number | null = null;
      let avgExitVelo: number | null = null;
      let barrelRate:  number | null = null;

      if (balls.length >= 10) {
        const evs = balls.map((b) => b.launch_speed);
        avgExitVelo  = evs.reduce((a, v) => a + v, 0) / evs.length;
        hardHitRate  = evs.filter((v) => v >= 95).length / evs.length;
        barrelRate   = balls.filter(
          (b) => b.launch_angle != null && isBarrel(b.launch_speed, b.launch_angle!),
        ).length / evs.length;
      }

      const iso      = s.slg != null && s.avg != null ? s.slg - s.avg : null;
      const kMinusBB = s.k_rate != null && s.bb_rate != null ? s.k_rate - s.bb_rate : null;

      hitting = {
        gp: s.games, avg: s.avg, obp: s.obp, slg: s.slg, ops: s.ops,
        hr: s.home_runs, rbi: s.rbi, sb: s.stolen_bases,
        kRate: s.k_rate, bbRate: s.bb_rate,
        wrcPlus: s.wrc_plus, babip: s.babip, war: null,
        iso, kMinusBB, hardHitRate, avgExitVelo, barrelRate,
      };
    }

    if (s && s.era != null) {
      const kMinusBB = s.k_rate != null && s.bb_rate != null ? s.k_rate - s.bb_rate : null;
      const ip       = s.innings_pitched;
      const kPer9    = ip && ip > 0 && ps?.strikeouts_pitcher != null
        ? (ps.strikeouts_pitcher / ip) * 9 : null;
      const bbPer9   = kPer9 != null && s.k_rate != null && s.bb_rate != null && s.k_rate > 0
        ? kPer9 * (s.bb_rate / s.k_rate) : null;

      pitching = {
        gp: s.games, w: s.wins, l: s.losses, sv: s.saves,
        era: s.era, fip: s.fip, whip: s.whip, ip,
        kRate: s.k_rate, bbRate: s.bb_rate, babip: null, war: null,
        kMinusBB, kPer9, bbPer9,
      };
    }
  } else {
    // ── Non-seeded player: use MLB Stats API ─────────────────────────────────
    try {
      const detail = await getPlayerStats(input.playerId, season);
      if (detail) {
        playerName   = detail.fullName;
        teamAbbr     = (detail as unknown as Record<string, string>).teamAbbreviation ?? null;
        position     = detail.primaryPosition?.abbreviation ?? null;
        jerseyNumber = detail.primaryNumber ? `#${detail.primaryNumber}` : null;
        age          = detail.currentAge ?? null;
        height       = detail.height     ?? null;
        weight       = detail.weight     ?? null;
        bats         = detail.batSide?.code  ?? null;
        throwsHand   = detail.pitchHand?.code ?? null;

        const hRaw = extractStats(detail.stats, "hitting");
        const pRaw = extractStats(detail.stats, "pitching");

        if (hRaw && num(hRaw.gamesPlayed) != null) {
          const avg = num(hRaw.avg);
          const slg = num(hRaw.slg);
          const pa  = num(hRaw.plateAppearances) ?? 0;
          const ks  = num(hRaw.strikeOuts) ?? 0;
          const bbs = num(hRaw.baseOnBalls) ?? 0;
          const kRate  = pa > 0 ? ks  / pa : null;
          const bbRate = pa > 0 ? bbs / pa : null;
          const kMinusBB = kRate != null && bbRate != null ? kRate - bbRate : null;

          hitting = {
            gp: num(hRaw.gamesPlayed),
            avg, obp: num(hRaw.obp), slg, ops: num(hRaw.ops),
            hr: num(hRaw.homeRuns), rbi: num(hRaw.rbi), sb: num(hRaw.stolenBases),
            kRate, bbRate,
            wrcPlus: null, babip: num(hRaw.babip), war: null,
            iso: avg != null && slg != null ? slg - avg : null,
            kMinusBB,
            hardHitRate: null, avgExitVelo: null, barrelRate: null,
          };
        }

        if (pRaw && num(pRaw.gamesPlayed) != null) {
          const ip    = num(pRaw.inningsPitched);
          const ks    = num(pRaw.strikeOuts);
          const bbs   = num(pRaw.baseOnBalls);
          const kPer9  = ip && ip > 0 && ks  != null ? (ks  / ip) * 9 : null;
          const bbPer9 = ip && ip > 0 && bbs != null ? (bbs / ip) * 9 : null;
          const pa     = (ks ?? 0) + (bbs ?? 0) + (num(pRaw.hits) ?? 0);
          const kRate  = pa > 0 && ks  != null ? ks  / pa : null;
          const bbRate = pa > 0 && bbs != null ? bbs / pa : null;

          pitching = {
            gp: num(pRaw.gamesPlayed), w: num(pRaw.wins), l: num(pRaw.losses), sv: num(pRaw.saves),
            era: num(pRaw.era), fip: null, whip: num(pRaw.whip), ip,
            kRate, bbRate, babip: null, war: null,
            kMinusBB: kRate != null && bbRate != null ? kRate - bbRate : null,
            kPer9, bbPer9,
          };
        }
      }
    } catch { /* non-fatal */ }
  }

  // ── 3. Pitch arsenal ──────────────────────────────────────────────────────
  const pitchArsenal: CardData["pitchArsenal"] = [];

  if (player) {
    const pitchSeason = season === 2026 ? 2025 : season;
    const { data: pitchRows } = await admin
      .from("player_pitch_data")
      .select("pitch_type, pitch_type_name, avg_velocity, usage_pct, whiff_rate, horizontal_break_in, vertical_break_in")
      .eq("player_id", player.id)
      .eq("season", pitchSeason)
      .order("usage_pct", { ascending: false })
      .limit(7);

    if (pitchRows) {
      pitchArsenal.push(
        ...pitchRows.map((r) => ({
          type:     r.pitch_type,
          name:     r.pitch_type_name ?? r.pitch_type,
          velocity: r.avg_velocity,
          usage:    r.usage_pct,
          whiff:    r.whiff_rate,
          hBreak:   r.horizontal_break_in,
          vBreak:   r.vertical_break_in,
        })),
      );
    }
  }

  // ── 4. Advanced stats overlay (ALL players) ────────────────────────────────
  // Runs in parallel: Savant batter metrics + FanGraphs (WAR, wRC+, FIP, BABIP)
  const isPitcherOnly = pitching != null && hitting == null;
  const fgType        = isPitcherOnly ? "pit" : "bat";

  const [savant, fg] = await Promise.all([
    hitting ? getSavantBatterMetrics(input.playerId, statSeason) : Promise.resolve(null),
    getFanGraphsStats(playerName, statSeason, fgType),
  ]);

  if (hitting) {
    // Overlay Savant contact metrics (prefer Supabase batted_ball_events if already set)
    if (savant) {
      hitting.hardHitRate = hitting.hardHitRate ?? savant.hardHitRate;
      hitting.avgExitVelo = hitting.avgExitVelo ?? savant.avgExitVelo;
      hitting.barrelRate  = hitting.barrelRate  ?? savant.barrelRate;
    }
    // Overlay FanGraphs advanced stats
    if (fg) {
      hitting.war     = fg.war;
      hitting.wrcPlus = hitting.wrcPlus ?? fg.wrcPlus;
      hitting.babip   = hitting.babip   ?? fg.babip;
    }
  }

  if (pitching && fg) {
    pitching.war   = fg.war;
    pitching.fip   = pitching.fip ?? fg.fip;
    pitching.babip = pitching.babip ?? fg.babip;
  }

  return {
    vizType: "player_card",
    playerId: input.playerId,
    data: {
      playerId: input.playerId,
      playerName, teamAbbr, position, jerseyNumber,
      age, height, weight, bats, throws: throwsHand,
      season, hitting, pitching, pitchArsenal,
    },
    caption: input.caption,
  };
}
