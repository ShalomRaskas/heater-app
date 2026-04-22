/**
 * Scrape pitch-level Statcast data for a pitcher from Baseball Savant.
 *
 * Strategy: same as scrapeBattedBalls — Savant ignores player filters
 * server-side, so we use 5-day date windows (keeps each response under
 * the ~25k row cap) and post-filter by pitcher MLBAM ID.
 *
 * 5-day window volume estimate:
 *   ~13.5 games/day × 5 days × 290 pitches/game ≈ 19,600 rows — safely under cap.
 *   April–October = ~37 windows; fetched in parallel pairs → ~10s on cache miss.
 */

const SAVANT_BASE = "https://baseballsavant.mlb.com";
const SAVANT_UA   = "Mozilla/5.0 (compatible; Heater/1.0; +https://heater.app)";

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

/** Generate 5-day date windows covering April–October for a season.
 *  For the current season, caps the end date at today to skip future windows. */
function generate5DayWindows(season: number): Array<{ gt: string; lt: string }> {
  const windows: Array<{ gt: string; lt: string }> = [];
  const seasonEnd = new Date(`${season}-10-06`);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const end = season < today.getFullYear() ? seasonEnd : new Date(Math.min(seasonEnd.getTime(), today.getTime()));
  const cur = new Date(`${season}-04-01`);

  while (cur <= end) {
    const gt = cur.toISOString().slice(0, 10);
    const ltDate = new Date(cur);
    ltDate.setDate(ltDate.getDate() + 4);
    const lt = ltDate.toISOString().slice(0, 10);
    windows.push({ gt, lt });
    cur.setDate(cur.getDate() + 5);
  }

  return windows;
}

async function fetchWindow(
  gt: string,
  lt: string,
  season: number,
  pitcherId: number,
): Promise<{ text: string; error?: string }> {
  const url =
    `${SAVANT_BASE}/statcast_search/csv` +
    `?all=true&hfSea=${season}%7C&player_type=pitcher&type=details` +
    `&pitchers_lookup%5B%5D=${pitcherId}` +
    `&game_date_gt=${gt}&game_date_lt=${lt}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      headers: { "User-Agent": SAVANT_UA },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { text: "", error: `HTTP ${res.status} (${gt})` };
    return { text: await res.text() };
  } catch (err) {
    const msg = (err as Error).name === "AbortError"
      ? `Timeout fetching ${gt}`
      : `Network error: ${String(err)}`;
    return { text: "", error: msg };
  }
}

export async function scrapePitchData(
  pitcherId: number,
  season: number,
): Promise<{ events: RawPitchEvent[]; error?: string }> {
  const allEvents: RawPitchEvent[] = [];
  const seenKeys = new Set<string>();
  let colIdx: Record<string, number> | null = null;

  const windows = generate5DayWindows(season);

  // Fetch 2 windows at a time to balance speed vs. rate limit risk
  for (let i = 0; i < windows.length; i += 2) {
    const batch = windows.slice(i, i + 2);
    const results = await Promise.all(
      batch.map((w) => fetchWindow(w.gt, w.lt, season, pitcherId)),
    );

    for (let b = 0; b < results.length; b++) {
      const { text, error } = results[b];
      const { gt } = batch[b];

      if (error) {
        // On timeout or network error, stop early but return whatever we have
        if (allEvents.length >= 20) break;
        return { events: allEvents, error };
      }
      if (!text) continue;

      if (text.trimStart().startsWith("<")) {
        // Rate limited — return what we've gathered so far rather than failing
        if (allEvents.length >= 20) break;
        return { events: allEvents, error: `Savant rate-limited (${gt})` };
      }

      const lines = text.trim().split("\n");
      if (lines.length < 2) continue;

      // Parse/validate header on first non-empty window
      if (colIdx === null) {
        const headerCols = parseCSVRow(lines[0]);
        colIdx = {};
        for (let j = 0; j < headerCols.length; j++) colIdx[headerCols[j]] = j;

        const required = ["pitcher", "game_date", "plate_x", "plate_z"];
        for (const col of required) {
          if (colIdx[col] === undefined) {
            return { events: [], error: `Missing expected column: ${col}` };
          }
        }
      }

      const idx = colIdx;

      for (let li = 1; li < lines.length; li++) {
        const line = lines[li].trim();
        if (!line) continue;

        const cols = parseCSVRow(line);
        const get = (col: string): string => cols[idx[col] ?? -1] ?? "";

        if (int(get("pitcher")) !== pitcherId) continue;

        const gamePk   = int(get("game_pk"));
        const atBat    = int(get("at_bat_number"));
        const pitchNum = int(get("pitch_number"));

        // Dedup by game_pk + at_bat_number + pitch_number
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
    }
  }

  if (allEvents.length === 0) {
    return { events: [], error: "No pitch events found for this pitcher/season." };
  }

  return { events: allEvents };
}
