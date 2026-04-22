import type { PercentileMetric } from "@/lib/albert/viz-types";

type SavantRow = Record<string, number | string | null>;

function r(row: SavantRow, key: string): number {
  const v = row[`${key}_rank`];
  return typeof v === "number" ? Math.round(v) : 50;
}

function fmt(row: SavantRow, key: string, digits = 1, suffix = ""): string {
  const v = row[key];
  if (v == null || v === "") return "—";
  return `${Number(v).toFixed(digits)}${suffix}`;
}

function fmtAvg(row: SavantRow, key: string): string {
  const v = row[key];
  if (v == null) return "—";
  return Number(v).toFixed(3).replace(/^0/, "");
}

function batterMetrics(row: SavantRow): PercentileMetric[] {
  return [
    { label: "Exit Velo",  value: fmt(row, "exit_velocity_avg", 1, " mph"), percentile: r(row, "exit_velocity_avg")  },
    { label: "Hard Hit%",  value: fmt(row, "hard_hit_percent",  1, "%"),    percentile: r(row, "hard_hit_percent")   },
    { label: "Barrel%",    value: fmt(row, "barrel_batted_rate",1, "%"),    percentile: r(row, "barrel_batted_rate") },
    { label: "Sprint Spd", value: fmt(row, "sprint_speed",      1, " ft/s"),percentile: r(row, "sprint_speed")       },
    { label: "xBA",        value: fmtAvg(row, "xba"),                      percentile: r(row, "xba")                },
    { label: "xSLG",       value: fmtAvg(row, "xslg"),                     percentile: r(row, "xslg")               },
    { label: "K%",         value: fmt(row, "k_percent",         1, "%"),    percentile: r(row, "k_percent")          },
    { label: "BB%",        value: fmt(row, "bb_percent",        1, "%"),    percentile: r(row, "bb_percent")         },
  ];
}

function pitcherMetrics(row: SavantRow): PercentileMetric[] {
  return [
    { label: "FB Velo",   value: fmt(row, "ff_avg_speed",   1, " mph"), percentile: r(row, "ff_avg_speed")    },
    { label: "K%",        value: fmt(row, "p_k_percent",    1, "%"),    percentile: r(row, "p_k_percent")     },
    { label: "BB%",       value: fmt(row, "p_bb_percent",   1, "%"),    percentile: r(row, "p_bb_percent")    },
    { label: "Whiff%",    value: fmt(row, "whiff_percent",  1, "%"),    percentile: r(row, "whiff_percent")   },
    { label: "Hard Hit%", value: fmt(row, "hard_hit_percent",1, "%"),   percentile: r(row, "hard_hit_percent")},
    { label: "Chase%",    value: fmt(row, "oz_swing_percent",1, "%"),   percentile: r(row, "oz_swing_percent")},
    { label: "xERA",      value: fmt(row, "xera",           2, ""),     percentile: r(row, "xera")            },
    { label: "K-BB%",     value: fmt(row, "k_minus_bb",     1, "%"),    percentile: r(row, "k_minus_bb")      },
  ];
}

export async function getPercentileData({
  mlbId,
  season,
  type,
}: {
  mlbId: number;
  season: number;
  type: "bat" | "pit";
}): Promise<{ found: boolean; metrics: PercentileMetric[]; error?: string }> {
  try {
    const url = `https://baseballsavant.mlb.com/player-services/percentile-ranks?playerid=${mlbId}&type=${type}&year=${season}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Heater/1.0)", Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return { found: false, metrics: [], error: `Savant returned ${res.status}` };
    }

    const json = (await res.json()) as SavantRow | SavantRow[];
    const row: SavantRow = Array.isArray(json) ? (json[0] ?? {}) : json;

    if (!row || Object.keys(row).length === 0) {
      return { found: false, metrics: [], error: "No data returned" };
    }

    const metrics = type === "bat" ? batterMetrics(row) : pitcherMetrics(row);
    return { found: true, metrics };
  } catch (err) {
    return { found: false, metrics: [], error: String(err) };
  }
}
