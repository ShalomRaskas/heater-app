import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSystemPrompt, type PlayerData } from "@/lib/albert/system-prompt";
import { getPlayerStats } from "@/lib/albert/tools/getPlayerStats";

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

    // ── 4. Streaming tool-use loop ─────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const apiMessages: Anthropic.MessageParam[] = clientMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let hasStreamedAnyText = false;

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

            // Stream text deltas to the client as they arrive
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
                hasStreamedAnyText = true;
              }
            }

            // Get the completed message to check stop reason and extract tool call
            const finalMessage = await stream.finalMessage();

            if (finalMessage.stop_reason === "tool_use") {
              const toolUseBlock = finalMessage.content.find(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
              );

              if (!toolUseBlock) break;

              const toolInput = toolUseBlock.input as {
                playerName: string;
                season?: number;
              };
              const toolResult = await getPlayerStats(toolInput);

              apiMessages.push({ role: "assistant", content: finalMessage.content });
              apiMessages.push({
                role: "user",
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: toolUseBlock.id,
                    content: JSON.stringify(toolResult),
                  },
                ],
              });

              continue; // restart the stream with updated messages
            }

            break; // stop_reason === "end_turn"
          }

          controller.close();
        } catch (err) {
          if (hasStreamedAnyText) {
            // Partial response is already rendered — close cleanly rather than erroring
            controller.close();
          } else {
            // Nothing rendered yet — signal the client to show the error bubble
            controller.error(err);
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
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
