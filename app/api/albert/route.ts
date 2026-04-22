import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt, type PlayerData } from "@/lib/albert/system-prompt";
import { getPlayerStats } from "@/lib/albert/tools/getPlayerStats";
import { renderViz } from "@/lib/albert/tools/renderViz";

// All four seeded players by MLB ID
const MLB_IDS = [592450, 660271, 669373, 695243]; // Judge, Ohtani, Skubal, Miller

const MAX_TOOL_ITERATIONS = 5;

const TOOLS = [
  {
    name: "getPlayerStats",
    description:
      "Get current 2026 MLB season stats for any active player. Use this whenever a user asks about a player not already in your context.",
    input_schema: {
      type: "object" as const,
      properties: {
        playerName: {
          type: "string",
          description: "Player's full name, e.g. 'Nolan Arenado'",
        },
        season: {
          type: "number",
          description: "Season year. Defaults to 2026.",
          default: 2026,
        },
      },
      required: ["playerName"],
    },
  },
  {
    name: "renderViz",
    description:
      "Render a visualization inline in your response. Use when a visual communicates better than prose. Choose the right type:\n• bubble_chart — pitcher movement/arsenal (bubbles in break space)\n• spray_chart — batter batted-ball locations on field\n• exit_velo_zone — batter exit-velocity hot zones by field sector (use for 'where does he hit it hard?')\n• pitch_heatmap — pitcher location density heat map (use for 'where does he live in the zone?')\n• pitch_tracks — pitcher catcher-POV 3D trajectory lines (use for 'how does his arsenal move/drop?')\n• player_card — premium baseball card with headshot, team logo, bio, and season stats (use when user asks 'show me his card', 'pull up his card', 'baseball card', or to introduce a player)\n• ev_la_scatter — exit velocity vs launch angle scatter with barrel zone overlay (use for batted ball quality, hard-hit rate, barrel rate questions)\n• bb_profile — batted ball profile donut chart: GB/LD/FB/IFFB breakdown (use for 'is he a fly ball hitter?', 'batted ball profile' questions)\n• pitch_movement — pitch movement scatter pfx_x/pfx_z by pitch type with centroid labels (use for 'how does his arsenal move?', 'pitch movement' questions)\n• release_point — pitcher release position scatter by pitch type (use for 'where does he release?', 'arm slot', 'release point' questions)\n• zone_grid — pitch location density heatmap over 3x3 strike zone (use for 'where does he locate?', 'zone tendencies', 'pitch location' questions)\n• percentile_rankings — Statcast percentile bubble chart showing 8 key metrics vs MLB (use for 'how does he rank?', 'show me his percentiles', 'Savant card', 'percentile bubbles', 'how elite is he?')\nDo not render viz for general stat questions or single-number lookups.\n\nIMPORTANT: The rendered chart appears in the VizPanel which has interactive sidebar filters the user can toggle themselves — season, pitcher handedness (vs LHP/RHP), batter handedness (vs LHH/RHH), count state, and pitch type. When a user asks for a handedness split or count split, render the base chart and tell them they can use the sidebar filters in the panel to slice by that dimension. Do NOT refuse to render or give only prose.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["bubble_chart", "spray_chart", "exit_velo_zone", "pitch_heatmap", "pitch_tracks", "player_card", "ev_la_scatter", "bb_profile", "pitch_movement", "release_point", "zone_grid", "percentile_rankings"],
        },
        playerId: {
          type: "number",
          description: "MLBAM player ID",
        },
        season: {
          type: "number",
          description: "Season year. Defaults to 2025.",
          default: 2025,
        },
        caption: {
          type: "string",
          description:
            "One-line caption — the chart's thesis, not a description of its axes.",
        },
      },
      required: ["type", "playerId", "caption"],
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const { messages: clientMessages } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
      return new Response("Bad request: messages required", { status: 400 });
    }

    // ── 1. Fetch seeded player data from Supabase ──────────────────────────────
    const admin = createAdminClient();

    const { data: players } = await admin
      .from("players")
      .select(
        "id, mlb_id, full_name, team_abbr, position, age, height, weight, bats, throws",
      )
      .in("mlb_id", MLB_IDS);

    const playerIds = (players ?? []).map((p) => p.id);

    const [{ data: stats }, { data: pitch }] = await Promise.all([
      admin
        .from("player_stats_current")
        .select(
          "player_id, season, games, avg, obp, slg, ops, home_runs, rbi, stolen_bases, strikeouts_batter, walks_batter, era, whip, innings_pitched, strikeouts_pitcher, wins, losses, saves, k_rate, bb_rate",
        )
        .in("player_id", playerIds)
        .order("season", { ascending: false }),

      admin
        .from("player_pitch_data")
        .select(
          "player_id, pitch_type, pitch_type_name, avg_velocity, usage_pct, horizontal_break_in, vertical_break_in, whiff_rate",
        )
        .in("player_id", playerIds)
        .eq("season", 2024)
        .order("usage_pct", { ascending: false }),
    ]);

    // ── 2. Assemble PlayerData objects ─────────────────────────────────────────
    const playerDataList: PlayerData[] = (players ?? []).map((p) => ({
      full_name: p.full_name,
      team_abbr: p.team_abbr,
      position: p.position,
      age: p.age,
      height: p.height,
      weight: p.weight,
      bats: p.bats,
      throws: p.throws,
      stats: (stats ?? [])
        .filter((s) => s.player_id === p.id)
        .sort((a, b) => b.season - a.season),
      pitch_arsenal: (pitch ?? []).filter((d) => d.player_id === p.id),
    }));

    playerDataList.sort(
      (a, b) =>
        (players ?? []).findIndex((p) => p.full_name === a.full_name) -
        (players ?? []).findIndex((p) => p.full_name === b.full_name),
    );

    // ── 3. Build system prompt ─────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(playerDataList);

    // ── 4. Streaming tool-use loop (NDJSON output) ────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const apiMessages: Anthropic.MessageParam[] = clientMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const encoder = new TextEncoder();

    const emitLine = (
      controller: ReadableStreamDefaultController,
      obj: Record<string, unknown>,
    ) => {
      controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
    };

    const readable = new ReadableStream({
      async start(controller) {
        let hasEmittedContent = false;

        try {
          let iterations = 0;

          while (iterations < MAX_TOOL_ITERATIONS) {
            iterations++;

            const stream = anthropic.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 2048,
              system: systemPrompt,
              tools: TOOLS,
              messages: apiMessages,
            });

            // Forward text deltas immediately as NDJSON text events
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta" &&
                event.delta.text
              ) {
                emitLine(controller, { type: "text", delta: event.delta.text });
                hasEmittedContent = true;
              }
            }

            const finalMessage = await stream.finalMessage();

            if (finalMessage.stop_reason === "tool_use") {
              const toolUseBlocks = finalMessage.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
              );

              if (toolUseBlocks.length === 0) break;

              // ── Process ALL tool calls in this message in parallel ──────────
              const toolResults = await Promise.all(
                toolUseBlocks.map(async (block) => {
                  if (block.name === "renderViz") {
                    const input = block.input as {
                      type: string;
                      playerId: number;
                      season?: number;
                      caption: string;
                    };
                    const result = await renderViz(input);

                    if (!result.error) {
                      emitLine(controller, {
                        type: "viz",
                        payload: {
                          vizType: result.vizType,
                          playerId: result.playerId,
                          data: result.data,
                          caption: result.caption,
                        },
                      });
                      hasEmittedContent = true;
                    }

                    return {
                      type: "tool_result" as const,
                      tool_use_id: block.id,
                      content: JSON.stringify(result),
                    };
                  } else if (block.name === "getPlayerStats") {
                    const input = block.input as {
                      playerName: string;
                      season?: number;
                    };
                    const result = await getPlayerStats(input);

                    return {
                      type: "tool_result" as const,
                      tool_use_id: block.id,
                      content: JSON.stringify(result),
                    };
                  } else {
                    // Unknown tool — return empty result
                    return {
                      type: "tool_result" as const,
                      tool_use_id: block.id,
                      content: JSON.stringify({ error: `Unknown tool: ${block.name}` }),
                    };
                  }
                }),
              );

              apiMessages.push({ role: "assistant", content: finalMessage.content });
              apiMessages.push({ role: "user", content: toolResults });

              continue; // next iteration of the loop
            }

            break; // stop_reason === "end_turn"
          }

          controller.close();
        } catch (err) {
          if (hasEmittedContent) {
            controller.close();
          } else {
            controller.error(err);
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[/api/albert]", err);
    return new Response(
      JSON.stringify({ error: "Albert is unavailable right now. Try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
