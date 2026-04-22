const BASE = "https://statsapi.mlb.com/api/v1";

export interface GameLogEntry {
  date: string;
  opponent: string;
  isHome: boolean;
  isWin: boolean | null;
  // Hitting
  ab:      number | null;
  h:       number | null;
  doubles: number | null;
  triples: number | null;
  hr:      number | null;
  rbi:     number | null;
  bb:      number | null;
  so:      number | null;
  // Pitching
  ip:       number | null; // real innings (6.1 → 6.333)
  er:       number | null;
  ks:       number | null;
  pBb:      number | null;
  decision: "W" | "L" | "S" | null;
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
function parseSplits(splits: any[], type: "hitting" | "pitching"): GameLogEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return splits.map((s: any) => {
    const stat = s.stat ?? {};
    const wins   = n(stat.wins)   ?? 0;
    const losses = n(stat.losses) ?? 0;
    const saves  = n(stat.saves)  ?? 0;
    return {
      date:     s.date ?? "",
      opponent: s.opponent?.abbreviation ?? s.opponent?.name ?? "?",
      isHome:   s.isHome ?? false,
      isWin:    typeof s.isWin === "boolean" ? s.isWin : null,
      ab:      type === "hitting" ? n(stat.atBats)      : null,
      h:       type === "hitting" ? n(stat.hits)        : null,
      doubles: type === "hitting" ? n(stat.doubles)     : null,
      triples: type === "hitting" ? n(stat.triples)     : null,
      hr:      type === "hitting" ? n(stat.homeRuns)    : null,
      rbi:     type === "hitting" ? n(stat.rbi)         : null,
      bb:      type === "hitting" ? n(stat.baseOnBalls) : null,
      so:      type === "hitting" ? n(stat.strikeOuts)  : null,
      ip:      type === "pitching" ? parseIP(stat.inningsPitched) : null,
      er:      type === "pitching" ? n(stat.earnedRuns)    : null,
      ks:      type === "pitching" ? n(stat.strikeOuts)    : null,
      pBb:     type === "pitching" ? n(stat.baseOnBalls)   : null,
      decision: type === "pitching"
        ? wins > 0 ? "W" : losses > 0 ? "L" : saves > 0 ? "S" : null
        : null,
    };
  });
}

export interface GameLogResult {
  entries: GameLogEntry[];
  type: "hitting" | "pitching";
}

export async function getGameLog(
  mlbId: number,
  season: number,
): Promise<GameLogResult> {
  try {
    const [hitRes, pitRes] = await Promise.all([
      fetch(
        `${BASE}/people/${mlbId}/stats?stats=gameLog&season=${season}&group=hitting&sportId=1`,
        { next: { revalidate: 300 } },
      ),
      fetch(
        `${BASE}/people/${mlbId}/stats?stats=gameLog&season=${season}&group=pitching&sportId=1`,
        { next: { revalidate: 300 } },
      ),
    ]);

    const hitJson = hitRes.ok ? await hitRes.json() : null;
    const pitJson = pitRes.ok ? await pitRes.json() : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hitSplits: any[] = hitJson?.stats?.[0]?.splits ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pitSplits: any[] = pitJson?.stats?.[0]?.splits ?? [];

    if (pitSplits.length > hitSplits.length) {
      return {
        entries: parseSplits(pitSplits, "pitching").slice(-20).reverse(),
        type: "pitching",
      };
    }
    if (hitSplits.length > 0) {
      return {
        entries: parseSplits(hitSplits, "hitting").slice(-20).reverse(),
        type: "hitting",
      };
    }
    return { entries: [], type: "hitting" };
  } catch {
    return { entries: [], type: "hitting" };
  }
}
