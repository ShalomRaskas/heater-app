/**
 * MLB Stats API client
 * Base URL: https://statsapi.mlb.com/api/v1
 * No authentication required.
 *
 * Endpoints used:
 *   - Player search:  GET /people/search?names={name}&sportId=1
 *   - Player detail:  GET /people/{mlbId}?hydrate=stats(group=[hitting,pitching],type=season,season={year})
 *   - Headshot URL:   Static CDN pattern (no API call needed)
 */

const BASE = "https://statsapi.mlb.com/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MlbPlayer {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  primaryNumber?: string;    // jersey number
  birthDate?: string;
  currentAge?: number;
  height?: string;
  weight?: number;
  active: boolean;
  currentTeam?: { id: number; name: string; abbreviation?: string };
  primaryPosition?: { code: string; name: string; abbreviation: string };
  batSide?: { code: string };
  pitchHand?: { code: string };
}

export interface MlbStatGroup {
  group: { displayName: string };  // "hitting" | "pitching"
  splits: MlbStatSplit[];
}

export interface MlbStatSplit {
  season: string;
  stat: Record<string, string | number>;
  team?: { id: number; name: string; abbreviation?: string };
}

export interface MlbSearchResult {
  people: MlbPlayer[];
}

export interface MlbPersonDetail {
  people: Array<MlbPlayer & { stats?: MlbStatGroup[] }>;
}

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Search for a player by name.
 * Uses: GET /people/search?names={name}&sportId=1
 * sportId=1 = MLB (majors only).
 */
export async function getPlayerByName(name: string): Promise<MlbPlayer | null> {
  const url = `${BASE}/people/search?names=${encodeURIComponent(name)}&sportId=1`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`MLB search failed for "${name}": ${res.status}`);
  const data: MlbSearchResult = await res.json();
  return data.people?.[0] ?? null;
}

/**
 * Get full player detail including season stats.
 * Uses: GET /people/{mlbId}?hydrate=stats(group=[hitting,pitching],type=season,season={year})
 * Returns the raw MlbPersonDetail payload.
 */
export async function getPlayerStats(
  mlbId: number,
  season: number,
): Promise<(MlbPlayer & { stats?: MlbStatGroup[]; teamAbbreviation?: string }) | null> {
  const hydrate = `currentTeam,stats(group=[hitting,pitching],type=season,season=${season})`;
  const url = `${BASE}/people/${mlbId}?hydrate=${encodeURIComponent(hydrate)}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`MLB stats failed for id ${mlbId}: ${res.status}`);
  const data: MlbPersonDetail = await res.json();
  const person = data.people?.[0] ?? null;

  // The /people endpoint does not include team abbreviation.
  // Resolve it separately from /teams/{id} if we have a team ID.
  if (person?.currentTeam?.id) {
    try {
      const tr = await fetch(`${BASE}/teams/${person.currentTeam.id}`, {
        next: { revalidate: 0 },
      });
      if (tr.ok) {
        const td = await tr.json();
        const abbr: string | undefined = td.teams?.[0]?.abbreviation;
        if (abbr) (person as MlbPlayer & { teamAbbreviation?: string }).teamAbbreviation = abbr;
      }
    } catch {
      // non-fatal — team_abbr will just be null
    }
  }

  return person;
}

/**
 * Returns the standard MLB headshot CDN URL for a player.
 * No API call required — pattern is stable and publicly documented.
 * Size options: "120x90", "180x135", "240x180", "320x240", "spot"
 */
export function getPlayerHeadshotUrl(
  mlbId: number,
  size: "120x90" | "180x135" | "240x180" | "320x240" | "spot" = "240x180",
): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_${size.split("x")[0]},q_auto:best/v1/people/${mlbId}/headshot/67/current`;
}

/**
 * Parse a stat group array into a flat object, picking the right group by name.
 */
export function extractStats(
  statGroups: MlbStatGroup[] | undefined,
  groupName: "hitting" | "pitching",
): Record<string, string | number> | null {
  if (!statGroups) return null;
  const group = statGroups.find(
    (g) => g.group.displayName.toLowerCase() === groupName,
  );
  return group?.splits?.[0]?.stat ?? null;
}

/**
 * Safe numeric parse from MLB API stat values (which come as strings).
 */
export function num(val: string | number | undefined): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(val as string);
  return isNaN(n) ? null : n;
}

// ─── Baseball Savant / Statcast ───────────────────────────────────────────────
//
// Savant pitch-by-pitch CSV is blocked for automated requests.
// These two leaderboard CSV endpoints are publicly accessible:
//
//   pitch-movement:     velocity, horizontal/vertical break (inches)
//   pitch-arsenal-stats: whiff%, k%, run value per 100
//
// Both return one row per (pitcher, pitch_type). We fetch all standard pitch
// types in parallel, filter for the target mlbId, then merge on pitch_type.

const SAVANT_BASE = "https://baseballsavant.mlb.com";
const SAVANT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// Pitch types to query (covers ~99% of MLB repertoires)
const PITCH_TYPES = [
  "FF", "SI", "FC",       // fastballs
  "SL", "ST", "SV",       // sliders / sweepers
  "CH", "FS",             // offspeed
  "CU", "KC", "CS",       // curveballs
] as const;

export interface SavantPitchRow {
  pitch_type: string;
  pitch_type_name: string;
  avg_velocity: number;
  usage_pct: number;            // 0–1
  horizontal_break_in: number;  // pitcher_break_x  (arm-side positive)
  vertical_break_in: number;    // pitcher_break_z_induced (rise positive)
  whiff_rate: number;           // 0–1
  run_value_per_100: number;
  pitches_thrown: number;
}

/**
 * Minimal quoted-CSV row parser. Handles "Lastname, Firstname" fields correctly.
 */
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

/**
 * Fetch one Savant leaderboard CSV for a given pitch type.
 * Returns a map of mlbId (number) → parsed columns array.
 */
async function fetchSavantLeaderboard(
  endpoint: "pitch-movement" | "pitch-arsenal-stats",
  pitchType: string,
  year: number,
): Promise<Map<number, string[]>> {
  const url =
    endpoint === "pitch-movement"
      ? `${SAVANT_BASE}/leaderboard/pitch-movement?year=${year}&team=&min=0&pitcher_hand=&pitch_type=${pitchType}&run_value_type=per100&sort=9&sortDir=asc&csv=true`
      : `${SAVANT_BASE}/leaderboard/pitch-arsenal-stats?type=pitcher&pitchType=${pitchType}&year=${year}&team=&min=0&sort=run_value_per100&sortDir=asc&csv=true`;

  const res = await fetch(url, { headers: { "User-Agent": SAVANT_UA } });
  if (!res.ok) return new Map();

  const text = await res.text();
  const lines = text.trim().split("\n").slice(1); // skip header
  const map = new Map<number, string[]>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = parseCSVRow(line);
    // pitch-movement: col[2] = pitcher_id
    // pitch-arsenal-stats: col[1] = player_id
    const idCol = endpoint === "pitch-movement" ? cols[2] : cols[1];
    const id = parseInt(idCol);
    if (!isNaN(id)) map.set(id, cols);
  }
  return map;
}

/**
 * Fetch full Statcast pitch arsenal for a pitcher from Baseball Savant.
 *
 * Uses two endpoints (fetched in parallel per pitch type):
 *   - leaderboard/pitch-movement    → velocity, break (pfx_x, pfx_z_induced), usage
 *   - leaderboard/pitch-arsenal-stats → whiff%, k%, run value
 *
 * @param mlbId  MLB player ID (e.g. 669373 for Skubal)
 * @param season Four-digit season year (e.g. 2024)
 * @returns Array of SavantPitchRow, one per pitch type thrown (sorted by usage desc)
 */
export async function getSavantPitchArsenal(
  mlbId: number,
  season: number,
): Promise<SavantPitchRow[]> {
  // Fetch all pitch types in parallel for both endpoints
  const [movementMaps, arsenalMaps] = await Promise.all([
    Promise.all(
      PITCH_TYPES.map((pt) => fetchSavantLeaderboard("pitch-movement", pt, season)),
    ),
    Promise.all(
      PITCH_TYPES.map((pt) => fetchSavantLeaderboard("pitch-arsenal-stats", pt, season)),
    ),
  ]);

  // pitch-movement header (0-indexed, after proper CSV parse):
  // 0:year 1:name 2:pitcher_id 3:team 4:abbrev 5:hand
  // 6:avg_speed 7:pitches_thrown 8:total_pitches 9:per_game 10:pitch_per
  // 11:pitch_type 12:pitch_type_name 13:break_z 14:league_break_z 15:diff_z
  // 16:rise 17:break_z_induced 18:break_x 19:league_break_x 20:diff_x 21:tail
  // 22:pct_rank_z 23:pct_rank_x

  // pitch-arsenal-stats header:
  // 0:name 1:player_id 2:team 3:pitch_type 4:pitch_name
  // 5:rv_per_100 6:run_value 7:pitches 8:pitch_usage 9:pa
  // 10:ba 11:slg 12:woba 13:whiff_pct 14:k_pct 15:put_away
  // 16:est_ba 17:est_slg 18:est_woba 19:hard_hit

  const results: SavantPitchRow[] = [];

  for (let i = 0; i < PITCH_TYPES.length; i++) {
    const movRow = movementMaps[i].get(mlbId);
    const arsRow = arsenalMaps[i].get(mlbId);
    if (!movRow && !arsRow) continue;

    const pitchType = movRow?.[11] ?? arsRow?.[3] ?? PITCH_TYPES[i];
    const pitchName = movRow?.[12] ?? arsRow?.[4] ?? pitchType;
    const velocity = parseFloat(movRow?.[6] ?? "0") || 0;
    const usageDec = parseFloat(movRow?.[10] ?? "0") || 0; // 0–1 decimal
    const breakX = parseFloat(movRow?.[18] ?? "0") || 0;   // pitcher_break_x inches
    const breakZi = parseFloat(movRow?.[17] ?? "0") || 0;  // pitcher_break_z_induced
    const pitchesThrown = parseInt(movRow?.[7] ?? "0") || 0;
    const whiffPct = parseFloat(arsRow?.[13] ?? "0") || 0;  // 0–100 pct
    const rvPer100 = parseFloat(arsRow?.[5] ?? "0") || 0;

    if (velocity === 0 && pitchesThrown === 0) continue; // no real data

    results.push({
      pitch_type: pitchType,
      pitch_type_name: pitchName,
      avg_velocity: velocity,
      usage_pct: usageDec,           // already 0–1 from pitch_per column
      horizontal_break_in: breakX,
      vertical_break_in: breakZi,
      whiff_rate: whiffPct / 100,    // convert pct → 0–1
      run_value_per_100: rvPer100,
      pitches_thrown: pitchesThrown,
    });
  }

  return results.sort((a, b) => b.usage_pct - a.usage_pct);
}
