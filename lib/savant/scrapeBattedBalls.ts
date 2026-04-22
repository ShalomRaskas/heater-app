/**
 * Fetch batted-ball events for a batter from Baseball Savant.
 *
 * Uses the player-specific statcast_search endpoint (not the bulk /csv export)
 * so the server filters by player_id before returning — one request per season
 * instead of 7 league-wide monthly downloads.
 */

const SAVANT_BASE = "https://baseballsavant.mlb.com";
const SAVANT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface BattedBallEvent {
  mlbam_id: number;
  season: number;
  game_date: string | null;
  pitch_type: string | null;
  events: string | null;
  hit_coord_x: number | null;
  hit_coord_y: number | null;
  launch_speed: number | null;
  launch_angle: number | null;
  hit_distance: number | null;
  bb_type: string | null;
  stand: string | null;
  p_throws: string | null;
  balls: number | null;
  strikes: number | null;
}

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

export async function scrapeBattedBalls(
  mlbamId: number,
  season: number,
): Promise<{ events: BattedBallEvent[]; error?: string }> {
  // Single player-specific request — server filters by player_id
  const url =
    `${SAVANT_BASE}/statcast_search` +
    `?player_type=batter` +
    `&hfSea=${season}%7C` +
    `&hfGT=R%7C` +
    `&player_id=${mlbamId}` +
    `&type=details` +
    `&csv=true`;

  let text: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(url, {
      headers: { "User-Agent": SAVANT_UA, "Accept-Encoding": "gzip" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { events: [], error: `Savant returned HTTP ${res.status}` };
    }
    text = await res.text();
  } catch (err) {
    const msg = (err as Error).name === "AbortError"
      ? "Savant request timed out (30s)"
      : `Network error: ${String(err)}`;
    return { events: [], error: msg };
  }

  if (text.trimStart().startsWith("<")) {
    return { events: [], error: "Savant returned HTML — rate limited or blocked" };
  }

  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { events: [], error: "No events in Savant response" };
  }

  const headerCols = parseCSVRow(lines[0]);
  const colIdx: Record<string, number> = {};
  for (let i = 0; i < headerCols.length; i++) colIdx[headerCols[i]] = i;

  const required = ["game_date", "hc_x", "hc_y"];
  for (const col of required) {
    if (colIdx[col] === undefined) {
      return { events: [], error: `Missing expected column: ${col}` };
    }
  }

  const allEvents: BattedBallEvent[] = [];
  const BIP_EVENTS = new Set([
    "single", "double", "triple", "home_run",
    "field_out", "grounded_into_double_play", "force_out", "field_error",
    "sac_fly", "sac_bunt", "fielders_choice", "fielders_choice_out",
    "double_play", "sac_fly_double_play",
  ]);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVRow(line);
    const get = (col: string): string => cols[colIdx[col] ?? -1] ?? "";

    // Keep only BIP events (skip strikeouts, walks, HBP, etc.)
    const evtType = get("events");
    if (!BIP_EVENTS.has(evtType)) continue;

    const hcX = float(get("hc_x"));
    const hcY = float(get("hc_y"));
    if (hcX == null || hcY == null) continue;

    allEvents.push({
      mlbam_id:    mlbamId,
      season,
      game_date:   nullable(get("game_date")),
      pitch_type:  nullable(get("pitch_type")),
      events:      nullable(evtType),
      hit_coord_x: hcX,
      hit_coord_y: hcY,
      launch_speed: float(get("launch_speed")),
      launch_angle: float(get("launch_angle")),
      hit_distance: float(get("hit_distance_sc")),
      bb_type:     nullable(get("bb_type")),
      stand:       nullable(get("stand")),
      p_throws:    nullable(get("p_throws")),
      balls:       float(get("balls")) != null ? Math.round(float(get("balls"))!) : null,
      strikes:     float(get("strikes")) != null ? Math.round(float(get("strikes"))!) : null,
    });
  }

  if (allEvents.length === 0) {
    return { events: [], error: "No batted-ball events found for this player/season" };
  }

  return { events: allEvents };
}
