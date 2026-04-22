/**
 * Fetch pitch-level Statcast data for a pitcher from Baseball Savant.
 *
 * Uses the player-specific statcast_search endpoint so the server filters
 * by player_id — one request per season instead of ~37 league-wide
 * 5-day window downloads.
 */

const SAVANT_BASE = "https://baseballsavant.mlb.com";
const SAVANT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface RawPitchEvent {
  pitcher_id:      number;
  season:          number;
  game_date:       string | null;
  pitch_type:      string | null;
  pitch_name:      string | null;
  release_speed:   number | null;
  plate_x:         number | null;
  plate_z:         number | null;
  pfx_x:           number | null;
  pfx_z:           number | null;
  vx0:             number | null;
  vy0:             number | null;
  vz0:             number | null;
  ax:              number | null;
  ay:              number | null;
  az:              number | null;
  release_pos_x:   number | null;
  release_pos_y:   number | null;
  release_pos_z:   number | null;
  stand:           string | null;
  game_pk:         number | null;
  at_bat_number:   number | null;
  pitch_number_pa: number | null;
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

function int(v: string): number | null {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

export async function scrapePitchData(
  pitcherId: number,
  season: number,
): Promise<{ events: RawPitchEvent[]; error?: string }> {
  // Single player-specific request — server filters by player_id
  const url =
    `${SAVANT_BASE}/statcast_search` +
    `?player_type=pitcher` +
    `&hfSea=${season}%7C` +
    `&hfGT=R%7C` +
    `&player_id=${pitcherId}` +
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

  const required = ["pitcher", "game_date", "plate_x", "plate_z"];
  for (const col of required) {
    if (colIdx[col] === undefined) {
      return { events: [], error: `Missing expected column: ${col}` };
    }
  }

  const allEvents: RawPitchEvent[] = [];
  const seenKeys = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVRow(line);
    const get = (col: string): string => cols[colIdx[col] ?? -1] ?? "";

    const gamePk   = int(get("game_pk"));
    const atBat    = int(get("at_bat_number"));
    const pitchNum = int(get("pitch_number"));

    if (gamePk != null && atBat != null && pitchNum != null) {
      const key = `${gamePk}-${atBat}-${pitchNum}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
    }

    allEvents.push({
      pitcher_id:      pitcherId,
      season,
      game_date:       nullable(get("game_date")),
      pitch_type:      nullable(get("pitch_type")),
      pitch_name:      nullable(get("pitch_name")),
      release_speed:   float(get("release_speed")),
      plate_x:         float(get("plate_x")),
      plate_z:         float(get("plate_z")),
      pfx_x:           float(get("pfx_x")),
      pfx_z:           float(get("pfx_z")),
      vx0:             float(get("vx0")),
      vy0:             float(get("vy0")),
      vz0:             float(get("vz0")),
      ax:              float(get("ax")),
      ay:              float(get("ay")),
      az:              float(get("az")),
      release_pos_x:   float(get("release_pos_x")),
      release_pos_y:   float(get("release_pos_y")),
      release_pos_z:   float(get("release_pos_z")),
      stand:           nullable(get("stand")),
      game_pk:         gamePk,
      at_bat_number:   atBat,
      pitch_number_pa: pitchNum,
    });
  }

  if (allEvents.length === 0) {
    return { events: [], error: "No pitch events found for this pitcher/season." };
  }

  return { events: allEvents };
}
