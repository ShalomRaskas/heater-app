/**
 * Fetches last-7/14/30-day split stats for a player via the MLB Stats API.
 */

const BASE = "https://statsapi.mlb.com/api/v1";

export interface SplitStatLine {
  gp:  number | null;
  // Hitting
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  hr:  number | null;
  rbi: number | null;
  sb:  number | null;
  bb:  number | null;
  so:  number | null;
  // Pitching
  era:  number | null;
  whip: number | null;
  ip:   number | null;
  pSo:  number | null;
  pBb:  number | null;
  w:    number | null;
  l:    number | null;
  sv:   number | null;
}

export interface RecentSplits {
  last7:  SplitStatLine | null;
  last14: SplitStatLine | null;
  last30: SplitStatLine | null;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date("2026-04-22");
  d.setDate(d.getDate() - n);
  return fmt(d);
}

function parseNum(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v as string);
  return isNaN(n) ? null : n;
}

async function fetchSplit(
  mlbId: number,
  startDate: string,
): Promise<SplitStatLine | null> {
  const endDate = "2026-04-22";
  const url =
    `${BASE}/people/${mlbId}/stats` +
    `?stats=byDateRange&startDate=${startDate}&endDate=${endDate}` +
    `&group=hitting,pitching&sportId=1&season=2026`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();

    const groups: Array<{ group: { displayName: string }; splits: Array<{ stat: Record<string, string | number> }> }> =
      json.stats ?? [];

    const hitting = groups.find(
      (g) => g.group.displayName.toLowerCase() === "hitting",
    )?.splits?.[0]?.stat;

    const pitching = groups.find(
      (g) => g.group.displayName.toLowerCase() === "pitching",
    )?.splits?.[0]?.stat;

    const s = hitting ?? pitching;
    if (!s) return null;

    return {
      gp:   parseNum(s.gamesPlayed),
      avg:  parseNum(s.avg),
      obp:  parseNum(s.obp),
      slg:  parseNum(s.slg),
      ops:  parseNum(s.ops),
      hr:   parseNum(s.homeRuns),
      rbi:  parseNum(s.rbi),
      sb:   parseNum(s.stolenBases),
      bb:   parseNum(s.baseOnBalls),
      so:   parseNum(s.strikeOuts),
      era:  parseNum(s.era),
      whip: parseNum(s.whip),
      ip:   parseNum(s.inningsPitched),
      pSo:  parseNum(s.strikeOuts),
      pBb:  parseNum(s.baseOnBalls),
      w:    parseNum(s.wins),
      l:    parseNum(s.losses),
      sv:   parseNum(s.saves),
    };
  } catch {
    return null;
  }
}

export async function getRecentSplits(mlbId: number): Promise<RecentSplits> {
  const [last7, last14, last30] = await Promise.all([
    fetchSplit(mlbId, daysAgo(7)),
    fetchSplit(mlbId, daysAgo(14)),
    fetchSplit(mlbId, daysAgo(30)),
  ]);
  return { last7, last14, last30 };
}
