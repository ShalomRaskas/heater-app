/**
 * Shared types for Albert's inline visualization system.
 * Imported by both server-side tool handlers and client components.
 * No runtime imports — types only.
 */

export interface BubbleChartPitch {
  pitchType: string;
  pitchTypeName: string;
  avgVelocity: number | null;
  usagePct: number | null;      // 0–1 decimal
  horizontalBreakIn: number | null;
  verticalBreakIn: number | null;
  whiffRate: number | null;     // 0–1 decimal
}

export interface BubbleChartData {
  playerId?: number;
  playerName: string;
  teamAbbr: string | null;
  pitches: BubbleChartPitch[];
}

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

export interface SprayChartData {
  playerId?: number;
  playerName: string;
  teamAbbr: string | null;
  season: number;
  events: BattedBallEvent[];
}

/** Exit velo zone uses the same underlying data as spray chart */
export type ExitVeloZoneData = SprayChartData;

/**
 * Compact pitch event for pitcher visualizations (heatmap + trajectories).
 * Short keys keep NDJSON payload size manageable.
 */
export interface PitchEvent {
  t:  string | null;  // pitch_type
  pn: string | null;  // pitch_name (full)
  px: number | null;  // plate_x ft (LHH POV: positive = toward 1B side)
  pz: number | null;  // plate_z ft (height at plate)
  mx: number | null;  // pfx_x ft — horizontal break, pitcher POV (arm-side positive)
  mz: number | null;  // pfx_z ft — induced vertical break (positive = rise)
  vx: number | null;  // vx0 ft/s
  vy: number | null;  // vy0 ft/s (negative, toward plate)
  vz: number | null;  // vz0 ft/s
  ax: number | null;  // ax ft/s²
  ay: number | null;  // ay ft/s²
  az: number | null;  // az ft/s² (includes gravity + Magnus)
  rx: number | null;  // release_pos_x ft
  ry: number | null;  // release_pos_y ft (negative, ~-55 = 55 ft from plate)
  rz: number | null;  // release_pos_z ft (height at release)
  rv: number | null;  // release_speed mph
  s:  string | null;  // stand: batter handedness L/R
}

export interface PitcherPitchData {
  playerId?: number;
  playerName: string;
  teamAbbr: string | null;
  season: number;
  pitchTypes: string[];                 // sorted by usage desc
  pitchNames: Record<string, string>;   // pitchType → full name
  events: PitchEvent[];                 // max 2000 sampled events
}

export type PitcherHeatMapData = PitcherPitchData;
export type PitchTracksData    = PitcherPitchData;
export type PitchMovementData  = PitcherPitchData;
export type ReleasePointData   = PitcherPitchData;
export type ZoneGridData       = PitcherPitchData;

/** EV vs Launch Angle scatter + Batted Ball Profile share SprayChartData */
export type EvLaScatterData = SprayChartData;
export type BbProfileData   = SprayChartData;

/* ── Baseball card ──────────────────────────────────────────────────────── */

export interface CardStatHitting {
  gp:          number | null;
  avg:         number | null;
  obp:         number | null;
  slg:         number | null;
  ops:         number | null;
  hr:          number | null;
  rbi:         number | null;
  sb:          number | null;
  kRate:       number | null;
  bbRate:      number | null;
  wrcPlus:     number | null;
  babip:       number | null;
  war:         number | null;
  // Advanced / Statcast
  iso:         number | null;   // SLG − AVG
  kMinusBB:    number | null;   // K% − BB%
  hardHitRate: number | null;   // % of BIP with EV ≥ 95 mph
  avgExitVelo: number | null;   // avg exit velocity (BIP)
  barrelRate:  number | null;   // % barrels
}

export interface CardStatPitching {
  gp:       number | null;
  w:        number | null;
  l:        number | null;
  sv:       number | null;
  era:      number | null;
  fip:      number | null;
  whip:     number | null;
  ip:       number | null;
  kRate:    number | null;
  bbRate:   number | null;
  babip:    number | null;
  war:      number | null;
  // Advanced
  kMinusBB: number | null;   // K% − BB%
  kPer9:    number | null;   // K/9
  bbPer9:   number | null;   // BB/9
}

export interface CardArsenalPitch {
  type:     string;
  name:     string;
  velocity: number | null;
  usage:    number | null;
  whiff:    number | null;
  hBreak?:  number | null;   // horizontal break inches
  vBreak?:  number | null;   // vertical break inches (induced)
}

export interface CardData {
  playerId:     number;
  playerName:   string;
  teamAbbr:     string | null;
  position:     string | null;
  jerseyNumber: string | null;
  age:          number | null;
  height:       string | null;
  weight:       number | null;
  bats:         string | null;
  throws:       string | null;
  season:       number;
  hitting:      CardStatHitting | null;
  pitching:     CardStatPitching | null;
  pitchArsenal: CardArsenalPitch[];
}

export interface PercentileMetric {
  label: string;
  value: string;
  percentile: number;
}

export interface PercentileData {
  playerId: number;
  playerName: string;
  teamAbbr: string | null;
  season: number;
  type: "bat" | "pit";
  metrics: PercentileMetric[];
}

/** Shape emitted as a "viz" NDJSON event from the streaming route. */
export interface VizPayload {
  vizType: string;
  playerId: number;
  data: BubbleChartData | SprayChartData | PitcherPitchData | CardData | PercentileData;
  caption: string;
}
