import type { ComponentType } from "react";
import BubbleChart from "./BubbleChart";
import SprayChart from "./SprayChart";
import ExitVeloZone from "./ExitVeloZone";
import PitcherHeatMap from "./PitcherHeatMap";
import PitchTracks from "./PitchTracks";
import PlayerCard from "./PlayerCard";
import EvLaScatter from "./EvLaScatter";
import BbProfile from "./BbProfile";
import PitchMovement from "./PitchMovement";
import ReleasePoint from "./ReleasePoint";
import ZoneGrid from "./ZoneGrid";
import PercentileRankings from "./PercentileRankings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const vizRegistry: Record<string, ComponentType<{ data: any; caption: string }>> = {
  bubble_chart:   BubbleChart,
  spray_chart:    SprayChart,
  exit_velo_zone: ExitVeloZone,
  pitch_heatmap:  PitcherHeatMap,
  pitch_tracks:   PitchTracks,
  player_card:    PlayerCard,
  ev_la_scatter:  EvLaScatter,
  bb_profile:     BbProfile,
  pitch_movement: PitchMovement,
  release_point:  ReleasePoint,
  zone_grid:           ZoneGrid,
  percentile_rankings: PercentileRankings,
};
