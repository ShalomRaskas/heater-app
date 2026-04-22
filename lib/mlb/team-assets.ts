/** MLB team visual assets — logo URLs, headshot URLs, team accent colors */

export const TEAM_COLORS: Record<string, string> = {
  ARI: "#A71930", ATL: "#CE1141", BAL: "#DF4601", BOS: "#BD3039",
  CHC: "#0E3386", CWS: "#C4CED4", CIN: "#C6011F", CLE: "#E31937",
  COL: "#33006F", DET: "#0C2340", HOU: "#EB6E1F", KCR: "#004687",
  LAA: "#BA0021", LAD: "#005A9C", MIA: "#00A3E0", MIL: "#12284B",
  MIN: "#002B5C", NYM: "#002D72", NYY: "#003087", OAK: "#003831",
  PHI: "#E81828", PIT: "#FDB827", SDP: "#2F241D", SFG: "#FD5A1E",
  SEA: "#0C2C56", STL: "#C41E3A", TBR: "#092C5C", TEX: "#003278",
  TOR: "#134A8E", WSN: "#AB0003",
};

const TEAM_MLB_IDS: Record<string, number> = {
  ARI: 109, ATL: 144, BAL: 110, BOS: 111, CHC: 112, CWS: 145,
  CIN: 113, CLE: 114, COL: 115, DET: 116, HOU: 117, KCR: 118,
  LAA: 108, LAD: 119, MIA: 146, MIL: 158, MIN: 142, NYM: 121,
  NYY: 147, OAK: 133, PHI: 143, PIT: 134, SDP: 135, SFG: 137,
  SEA: 136, STL: 138, TBR: 139, TEX: 140, TOR: 141, WSN: 120,
};

/** Returns the MLB team logo SVG URL, or null if teamAbbr is unknown. */
export function getTeamLogoUrl(teamAbbr: string | null): string | null {
  if (!teamAbbr) return null;
  const id = TEAM_MLB_IDS[teamAbbr.toUpperCase()];
  if (!id) return null;
  return `https://www.mlbstatic.com/team-logos/${id}.svg`;
}

/** Returns the primary hex color for a team, or amber fallback. */
export function getTeamColor(teamAbbr: string | null): string {
  if (!teamAbbr) return "#D4AF37";
  return TEAM_COLORS[teamAbbr.toUpperCase()] ?? "#D4AF37";
}

/** Returns the MLB CDN headshot URL for a player. */
export function getHeadshotUrl(mlbId: number, width = 240): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_${width},q_auto:best/v1/people/${mlbId}/headshot/67/current`;
}
