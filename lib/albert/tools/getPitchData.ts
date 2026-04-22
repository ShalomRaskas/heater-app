/**
 * Tool handler: getPitchData
 * Checks Supabase pitch_events cache first; scrapes Savant on miss.
 * Returns data shaped for pitch_heatmap and pitch_tracks rendering.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { scrapePitchData, type RawPitchEvent } from "@/lib/savant/scrapePitchData";
import type { PitchEvent, PitcherPitchData } from "@/lib/albert/viz-types";

const MAX_EVENTS = 2000; // cap payload size

export interface GetPitchDataInput {
  pitcherId: number;
  playerName: string;
  teamAbbr: string | null;
  season?: number;
  forceRefresh?: boolean;
}

export interface GetPitchDataResult {
  found: boolean;
  data: PitcherPitchData | null;
  source: "cache" | "savant";
  error?: string;
}

/** Convert RawPitchEvent → compact PitchEvent used in viz payload */
function toCompact(e: RawPitchEvent): PitchEvent {
  return {
    t:  e.pitch_type,
    px: e.plate_x,
    pz: e.plate_z,
    mx: e.pfx_x,
    mz: e.pfx_z,
    vx: e.vx0,
    vy: e.vy0,
    vz: e.vz0,
    ax: e.ax,
    ay: e.ay,
    az: e.az,
    rx: e.release_pos_x,
    ry: e.release_pos_y,
    rz: e.release_pos_z,
    rv: e.release_speed,
    s:  e.stand,
    pn: e.pitch_name,
  };
}

function buildPitcherData(
  events: PitchEvent[],
  playerName: string,
  teamAbbr: string | null,
  season: number,
): PitcherPitchData {
  // Compute pitch type usage ordering
  const usageCounts: Record<string, number> = {};
  const nameMap: Record<string, string> = {};
  for (const e of events) {
    if (!e.t) continue;
    usageCounts[e.t] = (usageCounts[e.t] ?? 0) + 1;
    if (e.pn && !nameMap[e.t]) nameMap[e.t] = e.pn;
  }
  const pitchTypes = Object.keys(usageCounts).sort(
    (a, b) => usageCounts[b] - usageCounts[a],
  );
  // Fill in name fallback
  for (const pt of pitchTypes) {
    if (!nameMap[pt]) nameMap[pt] = pt;
  }

  // Cap + random sample if needed
  let final = events;
  if (events.length > MAX_EVENTS) {
    // Keep proportional sample per pitch type
    const perType = Math.floor(MAX_EVENTS / pitchTypes.length);
    const sampled: PitchEvent[] = [];
    for (const pt of pitchTypes) {
      const group = events.filter((e) => e.t === pt);
      const sample = group.length <= perType
        ? group
        : group.filter((_, i) => i % Math.ceil(group.length / perType) === 0).slice(0, perType);
      sampled.push(...sample);
    }
    final = sampled;
  }

  return { playerName, teamAbbr, season, pitchTypes, pitchNames: nameMap, events: final };
}

export async function getPitchData(
  input: GetPitchDataInput,
): Promise<GetPitchDataResult> {
  const season = input.season ?? 2025;
  const admin = createAdminClient();

  // ── 1. Check cache ────────────────────────────────────────────────────────
  if (!input.forceRefresh) {
    const { data: cached, error: cacheErr } = await admin
      .from("pitch_events")
      .select(
        "pitch_type, pitch_name, release_speed, plate_x, plate_z, pfx_x, pfx_z, vx0, vy0, vz0, ax, ay, az, release_pos_x, release_pos_y, release_pos_z, stand",
      )
      .eq("pitcher_id", input.pitcherId)
      .eq("season", season)
      .limit(5000);

    if (cacheErr) {
      return { found: false, data: null, source: "cache", error: cacheErr.message };
    }

    if (cached && cached.length >= 50) {
      const events: PitchEvent[] = cached.map((r) => ({
        t:  r.pitch_type,
        px: r.plate_x,
        pz: r.plate_z,
        mx: r.pfx_x,
        mz: r.pfx_z,
        vx: r.vx0,
        vy: r.vy0,
        vz: r.vz0,
        ax: r.ax,
        ay: r.ay,
        az: r.az,
        rx: r.release_pos_x,
        ry: r.release_pos_y,
        rz: r.release_pos_z,
        rv: r.release_speed,
        s:  r.stand,
        pn: r.pitch_name,
      }));
      return {
        found: true,
        data: buildPitcherData(events, input.playerName, input.teamAbbr, season),
        source: "cache",
      };
    }
  }

  // ── 2. Scrape Savant ──────────────────────────────────────────────────────
  const scraped = await scrapePitchData(input.pitcherId, season);

  if (scraped.error && scraped.events.length < 20) {
    return {
      found: false,
      data: null,
      source: "savant",
      error: scraped.error,
    };
  }

  if (scraped.events.length < 20) {
    return {
      found: false,
      data: null,
      source: "savant",
      error: `Too few pitches found for ${season} — ${scraped.events.length} events.`,
    };
  }

  // ── 3. Cache in Supabase ──────────────────────────────────────────────────
  const BATCH = 500;
  for (let i = 0; i < scraped.events.length; i += BATCH) {
    const batch = scraped.events.slice(i, i + BATCH);
    const { error: insertErr } = await admin
      .from("pitch_events")
      .upsert(batch, {
        onConflict: "pitcher_id,season,game_pk,at_bat_number,pitch_number_pa",
        ignoreDuplicates: true,
      });
    if (insertErr) {
      console.warn("[getPitchData] cache write partial failure:", insertErr.message);
    }
  }

  const events = scraped.events.map(toCompact);
  return {
    found: true,
    data: buildPitcherData(events, input.playerName, input.teamAbbr, season),
    source: "savant",
  };
}
