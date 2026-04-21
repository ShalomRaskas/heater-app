/**
 * Seed script: populates players, player_stats_current, and player_pitch_data
 * for Aaron Judge, Shohei Ohtani, Tarik Skubal, and Mason Miller.
 *
 * Usage:
 *   npx tsx scripts/seed-players.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from "dotenv";
import path from "path";

// Load .env.local from project root
config({ path: path.resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "../lib/supabase/admin";
import {
  getPlayerByName,
  getPlayerStats,
  getPlayerHeadshotUrl,
  getSavantPitchArsenal,
  extractStats,
  num,
} from "../lib/mlb-api";

const SEASON = 2026;        // current MLB season
const SAVANT_SEASON = 2024; // full season Savant data (2026 still accumulating)

// Players to seed: [display name, search name]
const TARGETS: [string, string][] = [
  ["Aaron Judge", "Aaron Judge"],
  ["Shohei Ohtani", "Shohei Ohtani"],
  ["Tarik Skubal", "Tarik Skubal"],
  ["Mason Miller", "Mason Miller"],
];

// Known MLB IDs as fallback if search is ambiguous
const KNOWN_IDS: Record<string, number> = {
  "Aaron Judge": 592450,
  "Shohei Ohtani": 660271,
  "Tarik Skubal": 669373,
  "Mason Miller": 694973,
};

async function seed() {
  const supabase = createAdminClient();

  for (const [displayName, searchName] of TARGETS) {
    console.log(`\n── ${displayName} ──`);

    // 1. Resolve MLB ID
    let mlbId = KNOWN_IDS[displayName];
    try {
      const found = await getPlayerByName(searchName);
      if (found) {
        mlbId = found.id;
        console.log(`  Search found: ${found.fullName} (id=${mlbId})`);
      } else {
        console.log(`  Search returned nothing — using known id=${mlbId}`);
      }
    } catch (e) {
      console.log(`  Search error (${e}) — using known id=${mlbId}`);
    }

    // 2. Fetch full detail + stats
    const person = await getPlayerStats(mlbId, SEASON);
    if (!person) {
      console.error(`  ✗ Could not fetch player detail for id=${mlbId}`);
      continue;
    }

    // 3. Upsert into players
    // teamAbbreviation is resolved from /teams/{id} inside getPlayerStats
    const team = (person as typeof person & { teamAbbreviation?: string }).teamAbbreviation ?? null;

    const playerRow = {
      mlb_id: mlbId,
      full_name: person.fullName,
      team_abbr: team,
      position: person.primaryPosition?.abbreviation ?? null,
      jersey_number: person.primaryNumber ? parseInt(person.primaryNumber) : null,
      age: person.currentAge ?? null,
      height: person.height ?? null,
      weight: person.weight ?? null,
      bats: person.batSide?.code ?? null,
      throws: person.pitchHand?.code ?? null,
      headshot_url: getPlayerHeadshotUrl(mlbId),
      updated_at: new Date().toISOString(),
    };

    const { data: playerRecord, error: playerErr } = await supabase
      .from("players")
      .upsert(playerRow, { onConflict: "mlb_id" })
      .select("id, full_name")
      .single();

    if (playerErr || !playerRecord) {
      console.error(`  ✗ players upsert failed:`, playerErr?.message);
      continue;
    }
    console.log(`  ✓ players: ${playerRecord.full_name} (${playerRecord.id})`);

    const playerId = playerRecord.id;

    // 4. Upsert current season stats
    const hitting = extractStats(person.stats, "hitting");
    const pitching = extractStats(person.stats, "pitching");

    const statsRow = {
      player_id: playerId,
      season: SEASON,
      games: num(hitting?.gamesPlayed ?? pitching?.gamesPlayed) ?? null,
      plate_appearances: num(hitting?.plateAppearances) ?? null,
      at_bats: num(hitting?.atBats) ?? null,

      // Batting
      avg: num(hitting?.avg) ?? null,
      obp: num(hitting?.obp) ?? null,
      slg: num(hitting?.slg) ?? null,
      ops: num(hitting?.ops) ?? null,
      wrc_plus: null, // not in MLB API; would need FanGraphs
      babip: num(hitting?.babip) ?? null,
      home_runs: num(hitting?.homeRuns) ?? null,
      rbi: num(hitting?.rbi) ?? null,
      stolen_bases: num(hitting?.stolenBases) ?? null,
      strikeouts_batter: num(hitting?.strikeOuts) ?? null,
      walks_batter: num(hitting?.baseOnBalls) ?? null,

      // Pitching
      era: num(pitching?.era) ?? null,
      fip: null, // not in MLB API; would need FanGraphs
      whip: num(pitching?.whip) ?? null,
      innings_pitched: num(pitching?.inningsPitched) ?? null,
      strikeouts_pitcher: num(pitching?.strikeOuts) ?? null,
      wins: num(pitching?.wins) ?? null,
      losses: num(pitching?.losses) ?? null,
      saves: num(pitching?.saves) ?? null,

      // Rate stats — MLB API has no strikeoutRate/walkRate fields.
      // Calculate from component stats: K / PA (batters), K / BF (pitchers).
      k_rate: (() => {
        if (hitting?.strikeOuts != null && hitting?.plateAppearances != null) {
          const pa = num(hitting.plateAppearances);
          const k = num(hitting.strikeOuts);
          return pa && pa > 0 && k != null ? Math.round((k / pa) * 1000) / 1000 : null;
        }
        if (pitching?.strikeOuts != null && pitching?.battersFaced != null) {
          const bf = num(pitching.battersFaced);
          const k = num(pitching.strikeOuts);
          return bf && bf > 0 && k != null ? Math.round((k / bf) * 1000) / 1000 : null;
        }
        return null;
      })(),
      bb_rate: (() => {
        if (hitting?.baseOnBalls != null && hitting?.plateAppearances != null) {
          const pa = num(hitting.plateAppearances);
          const bb = num(hitting.baseOnBalls);
          return pa && pa > 0 && bb != null ? Math.round((bb / pa) * 1000) / 1000 : null;
        }
        if (pitching?.baseOnBalls != null && pitching?.battersFaced != null) {
          const bf = num(pitching.battersFaced);
          const bb = num(pitching.baseOnBalls);
          return bf && bf > 0 && bb != null ? Math.round((bb / bf) * 1000) / 1000 : null;
        }
        return null;
      })(),

      updated_at: new Date().toISOString(),
    };

    const { error: statsErr } = await supabase
      .from("player_stats_current")
      .upsert(statsRow, { onConflict: "player_id,season" });

    if (statsErr) {
      console.error(`  ✗ player_stats_current upsert failed:`, statsErr.message);
    } else {
      console.log(
        `  ✓ player_stats_current: season=${SEASON}` +
          (hitting?.avg ? ` AVG=${hitting.avg} OPS=${hitting.ops}` : "") +
          (pitching?.era ? ` ERA=${pitching.era} WHIP=${pitching.whip} IP=${pitching.inningsPitched} K=${pitching.strikeOuts} W=${pitching.wins}` : ""),
      );
    }

    // 5. Savant pitch arsenal — only for pitchers
    const isPitcher = ["SP", "RP", "P"].includes(person.primaryPosition?.abbreviation ?? "");
    if (!isPitcher) {
      console.log(`  ℹ pitch_data: skipped (position player)`);
    } else {
      console.log(`  ↓ fetching Savant pitch arsenal (${SAVANT_SEASON})…`);
      try {
        const arsenal = await getSavantPitchArsenal(mlbId, SAVANT_SEASON);
        if (arsenal.length === 0) {
          console.log(`  ℹ pitch_data: no Savant data found for season ${SAVANT_SEASON}`);
        } else {
          for (const pitch of arsenal) {
            const pitchRow = {
              player_id: playerId,
              season: SAVANT_SEASON,
              pitch_type: pitch.pitch_type,
              pitch_type_name: pitch.pitch_type_name,
              avg_velocity: pitch.avg_velocity,
              usage_pct: pitch.usage_pct,
              horizontal_break_in: pitch.horizontal_break_in,
              vertical_break_in: pitch.vertical_break_in,
              spin_rate: null, // not available from movement/arsenal endpoints
              whiff_rate: pitch.whiff_rate,
              updated_at: new Date().toISOString(),
            };
            const { error: pitchErr } = await supabase
              .from("player_pitch_data")
              .upsert(pitchRow, { onConflict: "player_id,season,pitch_type" });
            if (pitchErr) {
              console.error(`    ✗ pitch_data [${pitch.pitch_type}]:`, pitchErr.message);
            } else {
              console.log(
                `    ✓ ${pitch.pitch_type_name.padEnd(20)} ` +
                  `${pitch.avg_velocity.toFixed(1)} mph  ` +
                  `${(pitch.usage_pct * 100).toFixed(1)}% usage  ` +
                  `pfx(${pitch.horizontal_break_in.toFixed(1)}, ${pitch.vertical_break_in.toFixed(1)})in  ` +
                  `whiff=${(pitch.whiff_rate * 100).toFixed(1)}%`,
              );
            }
          }
        }
      } catch (e) {
        console.error(`  ✗ Savant fetch failed:`, e);
      }
    }
  }

  console.log("\n── Done ──");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
