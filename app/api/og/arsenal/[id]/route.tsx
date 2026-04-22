/**
 * GET /api/og/arsenal/:id?season=2025
 * Renders a pitcher's arsenal as a 1200×630 PNG — pitch types, velocity, usage, whiff rate.
 */

import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { renderCard } from "@/lib/albert/tools/renderCard";

export const runtime = "nodejs";

const PITCH_COLORS: Record<string, string> = {
  FF: "#ef4444", SI: "#f97316", FC: "#f59e0b",
  SL: "#3b82f6", ST: "#6366f1", SV: "#8b5cf6",
  CU: "#06b6d4", KC: "#0ea5e9", CH: "#22c55e",
  FS: "#84cc16", FO: "#a3e635", KN: "#e879f9",
};
const DEFAULT_COLOR = "#94a3b8";

function pitchColor(type: string): string {
  return PITCH_COLORS[type.toUpperCase()] ?? DEFAULT_COLOR;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const playerId = parseInt(params.id, 10);
  if (isNaN(playerId)) return new Response("Invalid ID", { status: 400 });
  const season = parseInt(req.nextUrl.searchParams.get("season") ?? "2026", 10);

  let card;
  try {
    const result = await renderCard({ playerId, season, caption: "" });
    card = result.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`renderCard error: ${msg}`, { status: 500, headers: { "content-type": "text/plain" } });
  }

  const arsenal = card.pitchArsenal.filter((p) => p.usage != null && p.usage > 0.02);
  const maxUsage = Math.max(...arsenal.map((p) => p.usage ?? 0), 0.01);

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200, height: 630,
            display: "flex", flexDirection: "column",
            background: "#060609", color: "white",
            padding: "32px 48px", gap: 0,
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Background glow */}
          <div style={{ position: "absolute", top: -100, left: -100, width: 500, height: 500, display: "flex",
            background: "radial-gradient(circle, rgba(211,47,47,0.15), transparent 70%)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: -100, right: -100, width: 400, height: 400, display: "flex",
            background: "radial-gradient(circle, rgba(255,107,53,0.10), transparent 70%)", borderRadius: "50%" }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                background: "radial-gradient(circle at 30% 30%, #ff8860, #D32F2F 60%, #7a1a1a)",
                borderRadius: 8, fontWeight: 700, fontSize: 16, color: "#fff",
              }}>H</div>
              <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>Heater</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase", marginLeft: 4 }}>
                pitch arsenal
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {card.teamAbbr && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "#d32f2f", letterSpacing: 2, textTransform: "uppercase" }}>
                  {card.teamAbbr}
                </span>
              )}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>{season} Season</span>
            </div>
          </div>

          {/* Player name */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 28 }}>
            <img
              src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`}
              width={56} height={56}
              style={{ borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(211,47,47,0.4)", flexShrink: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.8, color: "rgba(255,255,255,0.95)", lineHeight: 1.1 }}>
                {card.playerName}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 }}>
                {card.position ?? "P"}{card.jerseyNumber ? ` · ${card.jerseyNumber}` : ""}
                {card.age ? ` · Age ${card.age}` : ""}
              </span>
            </div>
          </div>

          {/* Arsenal rows */}
          {arsenal.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "rgba(255,255,255,0.3)", fontSize: 16 }}>
              No pitch data available
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {arsenal.slice(0, 7).map((pitch) => {
                const usage   = pitch.usage ?? 0;
                const barPct  = (usage / maxUsage) * 100;
                const color   = pitchColor(pitch.type);
                return (
                  <div key={pitch.type} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Pitch type badge */}
                    <div style={{
                      width: 38, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 5,
                      fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5, flexShrink: 0,
                    }}>
                      {pitch.type}
                    </div>

                    {/* Pitch name */}
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", width: 130, flexShrink: 0, letterSpacing: 0.2 }}>
                      {pitch.name}
                    </span>

                    {/* Usage bar */}
                    <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, display: "flex", overflow: "hidden" }}>
                      <div style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${color}aa, ${color})`, borderRadius: 4, display: "flex" }} />
                    </div>

                    {/* Usage % */}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", width: 44, textAlign: "right", flexShrink: 0 }}>
                      {(usage * 100).toFixed(0)}%
                    </span>

                    {/* Velocity */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 72, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color, lineHeight: 1 }}>
                        {pitch.velocity != null ? pitch.velocity.toFixed(1) : "—"}
                      </span>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>MPH</span>
                    </div>

                    {/* Whiff rate */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: 60, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>
                        {pitch.whiff != null ? (pitch.whiff * 100).toFixed(0) + "%" : "—"}
                      </span>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>WHIFF</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 12,
            borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>heaterbaseball.app · Statcast pitch data</span>
            <span style={{ fontSize: 10, color: "rgba(211,47,47,0.5)" }}>scout mode</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`ImageResponse error: ${msg}`, { status: 500, headers: { "content-type": "text/plain" } });
  }
}
