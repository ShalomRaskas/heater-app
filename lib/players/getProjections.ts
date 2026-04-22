/**
 * Fetches Steamer Rest-of-Season projections from FanGraphs.
 * Matches by mlbamid (MLBAM player ID) for exact matching.
 */

export interface BatProjection {
  pa:      number | null;
  avg:     number | null;
  obp:     number | null;
  slg:     number | null;
  ops:     number | null;
  hr:      number | null;
  rbi:     number | null;
  sb:      number | null;
  bb:      number | null;
  so:      number | null;
  wrcPlus: number | null;
  war:     number | null;
  babip:   number | null;
  woba:    number | null;
  iso:     number | null;
}

export interface PitProjection {
  ip:     number | null;
  w:      number | null;
  l:      number | null;
  era:    number | null;
  whip:   number | null;
  fip:    number | null;
  war:    number | null;
  so:     number | null;
  bb:     number | null;
  kPer9:  number | null;
  bbPer9: number | null;
  hrPer9: number | null;
  babip:  number | null;
}

type Row = Record<string, unknown>;

function n(row: Row, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && !isNaN(v)) return v;
    if (typeof v === "string" && v !== "") {
      const p = parseFloat(v);
      if (!isNaN(p)) return p;
    }
  }
  return null;
}

async function fetchRows(type: "bat" | "pit"): Promise<Row[]> {
  const url =
    `https://www.fangraphs.com/api/leaders/projections` +
    `?stats=${type}&pos=all&type=steamerr` +
    `&startseason=2026&endseason=2026&pageitems=2000&pagenum=1`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://www.fangraphs.com/projections",
        Accept: "application/json",
      },
      next: { revalidate: 7200 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? json ?? []) as Row[];
  } catch {
    return [];
  }
}

function findRow(rows: Row[], mlbId: number): Row | null {
  return (
    rows.find(
      (r) =>
        r["mlbamid"] === mlbId ||
        Number(r["mlbamid"]) === mlbId ||
        r["MLBAMID"] === mlbId ||
        Number(r["MLBAMID"]) === mlbId,
    ) ?? null
  );
}

export async function getBatProjection(mlbId: number): Promise<BatProjection | null> {
  const rows = await fetchRows("bat");
  const row = findRow(rows, mlbId);
  if (!row) return null;
  return {
    pa:      n(row, "PA"),
    avg:     n(row, "AVG"),
    obp:     n(row, "OBP"),
    slg:     n(row, "SLG"),
    ops:     n(row, "OPS"),
    hr:      n(row, "HR"),
    rbi:     n(row, "RBI"),
    sb:      n(row, "SB"),
    bb:      n(row, "BB"),
    so:      n(row, "SO"),
    wrcPlus: n(row, "wRC+", "wRCplus"),
    war:     n(row, "WAR"),
    babip:   n(row, "BABIP"),
    woba:    n(row, "wOBA"),
    iso:     n(row, "ISO"),
  };
}

export async function getPitProjection(mlbId: number): Promise<PitProjection | null> {
  const rows = await fetchRows("pit");
  const row = findRow(rows, mlbId);
  if (!row) return null;
  return {
    ip:     n(row, "IP"),
    w:      n(row, "W"),
    l:      n(row, "L"),
    era:    n(row, "ERA"),
    whip:   n(row, "WHIP"),
    fip:    n(row, "FIP"),
    war:    n(row, "WAR"),
    so:     n(row, "SO"),
    bb:     n(row, "BB"),
    kPer9:  n(row, "K/9", "K9"),
    bbPer9: n(row, "BB/9", "BB9"),
    hrPer9: n(row, "HR/9", "HR9"),
    babip:  n(row, "BABIP"),
  };
}
