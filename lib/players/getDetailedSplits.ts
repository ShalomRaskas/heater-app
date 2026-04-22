const BASE = "https://statsapi.mlb.com/api/v1";

export interface SplitLine {
  label: string;
  gp:  number | null;
  pa:  number | null;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  hr:  number | null;
  rbi: number | null;
  so:  number | null;
  bb:  number | null;
  era:  number | null;
  whip: number | null;
  ip:   number | null;
  ks:   number | null;
  pBb:  number | null;
}

export interface DetailedSplits {
  vsLeft:  SplitLine | null;
  vsRight: SplitLine | null;
  home:    SplitLine | null;
  away:    SplitLine | null;
}

function n(v: string | number | undefined | null): number | null {
  if (v == null || v === "") return null;
  const x = typeof v === "number" ? v : parseFloat(v as string);
  return isNaN(x) ? null : x;
}

function parseIP(ip: string | null | undefined): number | null {
  if (!ip) return null;
  const f = parseFloat(ip);
  if (isNaN(f)) return null;
  return Math.floor(f) + (f % 1) * (10 / 3);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function statToLine(label: string, stat: Record<string, any>): SplitLine {
  return {
    label,
    gp:   n(stat.gamesPlayed),
    pa:   n(stat.plateAppearances),
    avg:  n(stat.avg),
    obp:  n(stat.obp),
    slg:  n(stat.slg),
    ops:  n(stat.ops),
    hr:   n(stat.homeRuns),
    rbi:  n(stat.rbi),
    so:   n(stat.strikeOuts),
    bb:   n(stat.baseOnBalls),
    era:  n(stat.era),
    whip: n(stat.whip),
    ip:   parseIP(stat.inningsPitched),
    ks:   n(stat.strikeOuts),
    pBb:  n(stat.baseOnBalls),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchStatType(mlbId: number, season: number, statType: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${BASE}/people/${mlbId}/stats?stats=${statType}&season=${season}&group=hitting,pitching&sportId=1`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.stats ?? [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findGroup(statGroups: any[], typeName: string, preferPitching: boolean) {
  const hit = statGroups.find(
    g => g.type?.displayName?.toLowerCase() === typeName.toLowerCase()
      && g.group?.displayName?.toLowerCase() === "hitting",
  );
  const pit = statGroups.find(
    g => g.type?.displayName?.toLowerCase() === typeName.toLowerCase()
      && g.group?.displayName?.toLowerCase() === "pitching",
  );
  return preferPitching ? (pit ?? hit) : (hit ?? pit);
}

export async function getDetailedSplits(
  mlbId: number,
  season: number,
  isPitcher: boolean,
): Promise<DetailedSplits> {
  const [vsLeftGroups, vsRightGroups, haGroups] = await Promise.all([
    fetchStatType(mlbId, season, "vsLeft"),
    fetchStatType(mlbId, season, "vsRight"),
    fetchStatType(mlbId, season, "homeAndAway"),
  ]);

  const leftGroup  = findGroup(vsLeftGroups,  "vsLeft",  isPitcher);
  const rightGroup = findGroup(vsRightGroups, "vsRight", isPitcher);
  const haGroup    = findGroup(haGroups,      "homeAndAway", isPitcher);

  const leftStat  = leftGroup?.splits?.[0]?.stat  ?? null;
  const rightStat = rightGroup?.splits?.[0]?.stat ?? null;

  // homeAndAway returns 2 splits; identify by isHome or split.code
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const haSplits: any[] = haGroup?.splits ?? [];
  const homeSplit = haSplits.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.isHome === true || s.split?.code === "H" || s.split?.description === "Home",
  );
  const awaySplit = haSplits.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.isHome === false || s.split?.code === "A" || s.split?.description === "Away",
  );

  return {
    vsLeft:  leftStat        ? statToLine("vs LHP", leftStat)        : null,
    vsRight: rightStat       ? statToLine("vs RHP", rightStat)       : null,
    home:    homeSplit?.stat ? statToLine("Home",   homeSplit.stat)   : null,
    away:    awaySplit?.stat ? statToLine("Away",   awaySplit.stat)   : null,
  };
}
