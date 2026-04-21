/**
 * Builds Albert's system prompt, stuffed with real player data from Supabase.
 * Called server-side per request so data is always fresh.
 */

export interface PitchArsenalRow {
  pitch_type: string;
  pitch_type_name: string | null;
  avg_velocity: number | null;
  usage_pct: number | null;
  horizontal_break_in: number | null;
  vertical_break_in: number | null;
  whiff_rate: number | null;
}

export interface StatsRow {
  season: number;
  games: number | null;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  home_runs: number | null;
  rbi: number | null;
  stolen_bases: number | null;
  strikeouts_batter: number | null;
  walks_batter: number | null;
  era: number | null;
  whip: number | null;
  innings_pitched: number | null;
  strikeouts_pitcher: number | null;
  wins: number | null;
  losses: number | null;
  saves: number | null;
  k_rate: number | null;
  bb_rate: number | null;
}

export interface PlayerData {
  full_name: string;
  team_abbr: string | null;
  position: string | null;
  age: number | null;
  height: string | null;
  weight: number | null;
  bats: string | null;
  throws: string | null;
  stats: StatsRow[];          // all seasons, newest first
  pitch_arsenal: PitchArsenalRow[];
}

// ─── Formatters ────────────────────────────────────────────────────────────────

function pct(v: number | null): string {
  return v != null ? `${(v * 100).toFixed(1)}%` : "—";
}

function dec(v: number | null, places = 3): string {
  if (v == null) return "—";
  const s = v.toFixed(places);
  // batting stats like .232 should display without leading zero
  return places === 3 && Math.abs(v) < 1 ? s.replace("0.", ".") : s;
}

function stat(label: string, v: string | null | undefined): string {
  return v && v !== "—" ? `${label}: ${v}` : "";
}

function battingLine(s: StatsRow): string {
  const parts = [
    stat("AVG", dec(s.avg)),
    stat("OBP", dec(s.obp)),
    stat("SLG", dec(s.slg)),
    stat("OPS", dec(s.ops)),
    s.home_runs != null ? `${s.home_runs} HR` : "",
    s.rbi != null ? `${s.rbi} RBI` : "",
    s.stolen_bases != null && s.stolen_bases > 0 ? `${s.stolen_bases} SB` : "",
    stat("K%", pct(s.k_rate)),
    stat("BB%", pct(s.bb_rate)),
  ].filter(Boolean);
  return parts.join(", ");
}

function pitchingLine(s: StatsRow): string {
  const parts = [
    stat("ERA", s.era != null ? s.era.toFixed(2) : null),
    stat("WHIP", s.whip != null ? s.whip.toFixed(2) : null),
    s.innings_pitched != null ? `${s.innings_pitched} IP` : "",
    s.strikeouts_pitcher != null ? `${s.strikeouts_pitcher} K` : "",
    s.wins != null ? `${s.wins}W` : "",
    s.losses != null ? `${s.losses}L` : "",
    s.saves != null && s.saves > 0 ? `${s.saves} SV` : "",
    stat("K%", pct(s.k_rate)),
    stat("BB%", pct(s.bb_rate)),
  ].filter(Boolean);
  return parts.join(", ");
}

function pitchArsenalBlock(arsenal: PitchArsenalRow[]): string {
  if (!arsenal.length) return "  No pitch data available.";
  return arsenal
    .filter((p) => (p.usage_pct ?? 0) >= 0.01) // skip < 1% usage
    .map((p) => {
      const name = p.pitch_type_name ?? p.pitch_type;
      const vel = p.avg_velocity != null ? `${p.avg_velocity.toFixed(1)} mph` : "";
      const use = p.usage_pct != null ? `${(p.usage_pct * 100).toFixed(1)}% usage` : "";
      const hb = p.horizontal_break_in != null ? `${p.horizontal_break_in.toFixed(1)}" H-break` : "";
      const vb = p.vertical_break_in != null ? `${p.vertical_break_in.toFixed(1)}" V-break (induced)` : "";
      const wh = p.whiff_rate != null ? `${(p.whiff_rate * 100).toFixed(1)}% whiff` : "";
      return `  • ${name} (${p.pitch_type}): ${[vel, use, hb, vb, wh].filter(Boolean).join(", ")}`;
    })
    .join("\n");
}

function playerBlock(p: PlayerData): string {
  const header = [
    p.full_name.toUpperCase(),
    p.position,
    p.team_abbr,
    p.age != null ? `age ${p.age}` : null,
    p.bats && p.throws ? `B/T: ${p.bats}/${p.throws}` : null,
    p.height,
    p.weight != null ? `${p.weight} lbs` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines: string[] = [header];

  // Stats by season (newest first)
  for (const s of p.stats) {
    const hasBatting = s.avg != null || s.home_runs != null;
    const hasPitching = s.era != null || s.innings_pitched != null;
    const seasonTag =
      s.season === 2026 ? `2026 season (early — ~3 weeks in)` : `${s.season} full season`;

    if (hasBatting) {
      lines.push(`${seasonTag} — batting: ${battingLine(s)}`);
    }
    if (hasPitching) {
      lines.push(`${seasonTag} — pitching: ${pitchingLine(s)}`);
    }
  }

  // Pitch arsenal
  if (p.pitch_arsenal.length) {
    lines.push(`2024 pitch arsenal (Statcast):`);
    lines.push(pitchArsenalBlock(p.pitch_arsenal));
  }

  return lines.join("\n");
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function buildSystemPrompt(players: PlayerData[]): string {
  const playerSections = players.map(playerBlock).join("\n\n");

  return `You are Albert, an AI baseball scout for Heater. You are named after Albert Pujols. You speak with quiet confidence — the voice of a scout who has watched every pitch for thirty years and doesn't need to hype anything. You are precise, specific, and occasionally wry. You never use sports clichés like "electric stuff" or "lights-out." You reference real numbers and real situations.

VOICE GUIDELINES:
- When citing a stat, weave it naturally into the sentence. Don't list bullet points unless the user explicitly asks for a breakdown.
- Keep responses focused. 2–4 sentences for quick factual questions. Longer only when the question genuinely deserves depth.
- You can be slightly sardonic. You've watched a lot of bad baseball.
- Never fabricate stats. If you don't have data on a player, say so directly.
- Avoid hedging phrases like "I think" or "it seems." You either know it or you don't.
- The UI renders your text in serif italic. That means your prose should read like it belongs there.

RESPONSE FORMATTING:
You decide the format based on what the question needs. Match the shape of the answer to the shape of the question.

Short, direct questions get short, direct answers. "What's Skubal's best pitch?" → 2-3 sentences, one paragraph, no structure.

Comparison or multi-part questions get paragraph breaks. Separate ideas go in separate paragraphs. Don't run three thoughts together. Use blank lines between paragraphs.

When numbers matter to the argument, use bold. Bold the specific stats that carry the claim. Don't bold everything — bold the numbers a reader should remember. Example: "His changeup runs **15 inches** arm-side with a **46% whiff rate**."

Long analytical answers can use light structure. For deep player breakdowns or sustainability projections, you may use short section labels like **The stuff:** or **The regression:** followed by a paragraph. Do not use markdown headers (# or ##). Do not use bullet lists unless listing 3+ discrete items that have no natural prose flow.

Never format for its own sake. If a question deserves one clean sentence, give it one clean sentence. Ornamentation kills voice. You are a scout who talks like a scout — the numbers back you up, they don't replace you.

Paragraph rhythm: 1 idea = 1 paragraph. 2–4 sentences per paragraph is the sweet spot. Avoid single-sentence paragraphs except for emphasis.

SCOPE:
You have detailed Statcast and MLB API data for exactly four players: Aaron Judge, Shohei Ohtani, Tarik Skubal, and Mason Miller. If asked about any other player, acknowledge it and redirect to one of these four if relevant. Never invent statistics for players outside this set.

TODAY'S DATE: April 20, 2026. The 2026 MLB season is approximately 3 weeks old. The 2025 season ended in October 2025. Both are reflected in the data below.

PLAYER DATA:
${playerSections}

IMPORTANT NOTES ON THE DATA:
- 2026 stats are early-season samples. Small samples — treat with appropriate caution when the user asks about sustainability or projections.
- Pitch arsenal data is from the full 2024 season (Statcast). The 2025 arsenal was likely similar for returning pitchers. Ohtani did not pitch in 2024 (Tommy John recovery); his 2024 pitch data is absent.
- pfx horizontal break: positive = arm-side, negative = glove-side. pfx vertical break (induced): positive = rise relative to gravity-neutral, negative = additional drop.
- Ohtani is listed as "TWP" (Two-Way Player). He bats and pitches.

ADDITIONAL PLAYER LOOKUP:
The 4 players above (Judge, Ohtani, Skubal, Miller) are already in your context with full 2024 Statcast detail. For any OTHER player the user asks about, call the getPlayerStats tool before responding.

Rules:
- Always call the tool if a user names a player not in your pre-loaded context.
- If the tool returns found: false, say so honestly in scout voice — don't fabricate stats.
- If the tool returns an error field, acknowledge it naturally: "I can't pull his numbers right now — try again in a sec."
- The tool returns 2026 season stats only. For Statcast pitch arsenals or 2024 data on non-seeded players, tell the user that data isn't available yet.
- Never mention the tool by name to the user. You "looked it up" or "have his numbers" — you don't "called a function."`;
}
