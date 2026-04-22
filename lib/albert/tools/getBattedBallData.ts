/**
 * Tool handler: getBattedBallData
 * Checks Supabase cache first; scrapes Savant on miss and populates cache.
 * Returns events ready for SprayChart rendering.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeBattedBalls, type BattedBallEvent } from "@/lib/savant/scrapeBattedBalls";

export interface GetBattedBallInput {
  mlbamId: number;
  season?: number;
  /** If true, bypass cache and re-scrape (used by seed scripts) */
  forceRefresh?: boolean;
}

export interface GetBattedBallResult {
  found: boolean;
  mlbamId: number;
  season: number;
  events: BattedBallEvent[];
  source: "cache" | "savant";
  error?: string;
}

export async function getBattedBallData(
  input: GetBattedBallInput,
): Promise<GetBattedBallResult> {
  const season = input.season ?? 2025;
  const admin = createAdminClient();

  // ── 1. Check cache ────────────────────────────────────────────────────────
  if (!input.forceRefresh) {
    const { data: cached, error: cacheErr } = await admin
      .from("batted_ball_events")
      .select(
        "mlbam_id, season, game_date, pitch_type, events, hit_coord_x, hit_coord_y, launch_speed, launch_angle, hit_distance, bb_type, stand, p_throws, balls, strikes",
      )
      .eq("mlbam_id", input.mlbamId)
      .eq("season", season)
      .order("game_date", { ascending: true })
      .limit(10000);

    if (cacheErr) {
      return {
        found: false,
        mlbamId: input.mlbamId,
        season,
        events: [],
        source: "cache",
        error: `Supabase read error: ${cacheErr.message}`,
      };
    }

    if (cached && cached.length > 0) {
      if (cached.length < 20) {
        return {
          found: false,
          mlbamId: input.mlbamId,
          season,
          events: [],
          source: "cache",
          error: `Only ${cached.length} batted-ball events found for ${season} — player may not have played enough that season.`,
        };
      }
      return {
        found: true,
        mlbamId: input.mlbamId,
        season,
        events: cached as BattedBallEvent[],
        source: "cache",
      };
    }
  }

  // ── 2. Scrape Savant ──────────────────────────────────────────────────────
  const scraped = await scrapeBattedBalls(input.mlbamId, season);

  if (scraped.error || scraped.events.length === 0) {
    return {
      found: false,
      mlbamId: input.mlbamId,
      season,
      events: [],
      source: "savant",
      error: scraped.error ?? "No events returned from Savant",
    };
  }

  if (scraped.events.length < 20) {
    return {
      found: false,
      mlbamId: input.mlbamId,
      season,
      events: [],
      source: "savant",
      error: `Only ${scraped.events.length} batted-ball events found for ${season} — player may not have played enough that season.`,
    };
  }

  // ── 3. Upsert into cache ──────────────────────────────────────────────────
  // Insert in batches of 500 to stay within Supabase payload limits
  const BATCH = 500;
  for (let i = 0; i < scraped.events.length; i += BATCH) {
    const batch = scraped.events.slice(i, i + BATCH);
    const { error: insertErr } = await admin
      .from("batted_ball_events")
      .upsert(batch, {
        onConflict: "mlbam_id,season,game_date,hit_coord_x,hit_coord_y",
        ignoreDuplicates: true,
      });

    if (insertErr) {
      // Return the scraped data even if cache write fails — don't block the user
      console.warn("[getBattedBallData] cache write partial failure:", insertErr.message);
    }
  }

  return {
    found: true,
    mlbamId: input.mlbamId,
    season,
    events: scraped.events,
    source: "savant",
  };
}
