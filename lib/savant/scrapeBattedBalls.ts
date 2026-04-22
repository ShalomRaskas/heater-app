/**
 * Scrape batted-ball events from Baseball Savant for a single player/season.
 *
 * Strategy:
 *   The statcast_search/csv endpoint ignores player filters server-side and
 *   returns up to 25,000 rows of league-wide data. To get a specific batter's
 *   events we:
 *     1. Filter to BIP-only events via hfAB (reduces each monthly response to
 *        ~20k rows — safely under the 25k cap).
 *     2. Slice by calendar month (April–October) so no response exceeds 25k.
 *     3. Post-filter rows by batter MLBAM ID.
 *
 *   This results in ~7 HTTP requests per player-season, each returning a
 *   few hundred rows for the target batter out of ~20k total rows.
 */

const SAVANT_BASE = "https://baseballsavant.mlb.com";
const SAVANT_UA =
  "Mozilla/5.0 (compatible; Heater/1.0; +https://heater.app)";

// All event types that represent balls put in play
const BIP_HF_AB = [
  "single",
  "double",
  "triple",
  "home_run",
  "field_out",
  "grounded_into_double_play",
  "force_out",
  "field_error",
  "sac_fly",
  "sac_bunt",
  "fielders_choice",
  "fielders_choice_out",
  "double_play",
  "sac_fly_double_play",
]
  .map((e) => encodeURIComponent(e + "|"))
  .join("");

export interface BattedBallEvent {
  mlbam_id: number;
  season: number;
  game_date: string | null;        // "YYYY-MM-DD"
  pitch_type: string | null;
  events: string | null;           // "single", "home_run", "field_out", etc.
  hit_coord_x: number | null;
  hit_coord_y: number | null;
  launch_speed: number | null;
  launch_angle: number | null;
  hit_distance: number | null;
  bb_type: string | null;
  stand: string | null;
  p_throws: string | null;
  balls: number | null;            // count at contact: 0–3
  strikes: number | null;         // count at contact: 0–2
}

/** Minimal quoted-CSV row parser (same as lib/mlb-api.ts). */
function parseCSVRow(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function float(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function nullable(v: string): string | null {
  return v === "" || v === "null" ? null : v;
}

/** MLB regular season months */
const SEASON_MONTHS = [
  { gt: "04-01", lt: "04-30" },
  { gt: "05-01", lt: "05-31" },
  { gt: "06-01", lt: "06-30" },
  { gt: "07-01", lt: "07-31" },
  { gt: "08-01", lt: "08-31" },
  { gt: "09-01", lt: "09-30" },
  { gt: "10-01", lt: "10-31" },
];

/**
 * Fetch batted-ball events for `mlbamId` in `season` from Baseball Savant.
 *
 * Returns:
 *   { events: BattedBallEvent[] } on success
 *   { events: [], error: string }  on rate-limit / no-data / network error
 */
export async function scrapeBattedBalls(
  mlbamId: number,
  season: number,
): Promise<{ events: BattedBallEvent[]; error?: string }> {
  const allEvents: BattedBallEvent[] = [];
  let colIdx: Record<string, number> | null = null;

  for (const { gt, lt } of SEASON_MONTHS) {
    const dateGt = `${season}-${gt}`;
    const dateLt = `${season}-${lt}`;

    const url =
      `${SAVANT_BASE}/statcast_search/csv` +
      `?all=true&hfSea=${season}%7C&player_type=batter&type=details` +
      `&hfAB=${BIP_HF_AB}` +
      `&game_date_gt=${dateGt}&game_date_lt=${dateLt}`;

    let text: string;
    try {
      const res = await fetch(url, { headers: { "User-Agent": SAVANT_UA } });
      if (!res.ok) {
        return { events: allEvents, error: `HTTP ${res.status} from Savant (${dateGt})` };
      }
      text = await res.text();
    } catch (err) {
      return { events: allEvents, error: `Network error: ${String(err)}` };
    }

    if (text.trimStart().startsWith("<")) {
      return { events: allEvents, error: `Savant returned HTML — rate limited (${dateGt})` };
    }

    const lines = text.trim().split("\n");
    if (lines.length < 2) continue; // no data for this month

    // Parse header on first month; validate on subsequent months
    const headerCols = parseCSVRow(lines[0]);
    if (colIdx === null) {
      colIdx = {};
      for (let i = 0; i < headerCols.length; i++) colIdx[headerCols[i]] = i;

      const required = ["game_date", "hc_x", "hc_y", "batter"];
      for (const col of required) {
        if (colIdx[col] === undefined) {
          return { events: [], error: `Missing expected column: ${col}` };
        }
      }
    }

    const idx = colIdx;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVRow(line);
      const get = (col: string): string => cols[idx[col]] ?? "";

      // Post-filter: Savant ignores player filters server-side
      const rowBatter = parseInt(get("batter"));
      if (rowBatter !== mlbamId) continue;

      // Skip rows with no hit coordinate
      const hcX = float(get("hc_x"));
      const hcY = float(get("hc_y"));
      if (hcX == null || hcY == null) continue;

      allEvents.push({
        mlbam_id: mlbamId,
        season,
        game_date: nullable(get("game_date")),
        pitch_type: nullable(get("pitch_type")),
        events: nullable(get("events")),
        hit_coord_x: hcX,
        hit_coord_y: hcY,
        launch_speed: float(get("launch_speed")),
        launch_angle: float(get("launch_angle")),
        hit_distance: float(get("hit_distance_sc")),
        bb_type: nullable(get("bb_type")),
        stand: nullable(get("stand")),
        p_throws: nullable(get("p_throws")),
        balls: float(get("balls")) != null ? Math.round(float(get("balls"))!) : null,
        strikes: float(get("strikes")) != null ? Math.round(float(get("strikes"))!) : null,
      });
    }
  }

  if (allEvents.length === 0) {
    return { events: [], error: "No batted-ball events found for this player/season" };
  }

  return { events: allEvents };
}
