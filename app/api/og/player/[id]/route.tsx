import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { renderCard } from "@/lib/albert/tools/renderCard";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const playerId = parseInt(params.id, 10);
  if (isNaN(playerId)) {
    return new Response("Invalid player ID", { status: 400 });
  }

  const season = parseInt(req.nextUrl.searchParams.get("season") ?? "2026", 10);

  // Step 1: test renderCard
  let card;
  try {
    const result = await renderCard({ playerId, season, caption: "" });
    card = result.data;
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    return new Response(`renderCard error:\n${msg}`, {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }

  // Step 2: render image
  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            background: "#060609",
            color: "white",
            padding: 48,
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "radial-gradient(circle at 30% 30%, #ff8860, #D32F2F 60%, #7a1a1a)",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 18,
                color: "#fff",
              }}
            >
              H
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>Heater</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2, textTransform: "uppercase" }}>
              scout mode
            </span>
            <div style={{ flex: 1, display: "flex" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase" }}>
              {card.season} Season
            </span>
          </div>

          {/* Player identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 8 }}>
            <img
              src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${playerId}/headshot/67/current`}
              width={120}
              height={120}
              style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(211,47,47,0.5)" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, color: "rgba(255,255,255,0.95)" }}>
                {card.playerName}
              </span>
              <div style={{ display: "flex", gap: 12 }}>
                {card.teamAbbr && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#d32f2f", letterSpacing: 2, textTransform: "uppercase" }}>
                    {card.teamAbbr}
                  </span>
                )}
                {card.position && (
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>
                    {card.position}
                  </span>
                )}
                {card.jerseyNumber && (
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{card.jerseyNumber}</span>
                )}
                {card.age && (
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Age {card.age}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          {card.hitting && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {[
                { label: "AVG",  value: card.hitting.avg != null ? card.hitting.avg.toFixed(3).replace(/^0/, "") : "—" },
                { label: "OBP",  value: card.hitting.obp != null ? card.hitting.obp.toFixed(3).replace(/^0/, "") : "—" },
                { label: "SLG",  value: card.hitting.slg != null ? card.hitting.slg.toFixed(3).replace(/^0/, "") : "—" },
                { label: "OPS",  value: card.hitting.ops != null ? card.hitting.ops.toFixed(3).replace(/^0/, "") : "—" },
                { label: "HR",   value: card.hitting.hr != null ? String(card.hitting.hr) : "—" },
                { label: "RBI",  value: card.hitting.rbi != null ? String(card.hitting.rbi) : "—" },
                { label: "wRC+", value: card.hitting.wrcPlus != null ? String(Math.round(card.hitting.wrcPlus)) : "—" },
                { label: "WAR",  value: card.hitting.war != null ? card.hitting.war.toFixed(1) : "—" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    padding: "14px 8px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 10,
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 22, fontWeight: 700, color: s.value === "—" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.95)", lineHeight: 1 }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          {card.pitching && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {[
                { label: "ERA",  value: card.pitching.era != null ? card.pitching.era.toFixed(2) : "—" },
                { label: "FIP",  value: card.pitching.fip != null ? card.pitching.fip.toFixed(2) : "—" },
                { label: "WHIP", value: card.pitching.whip != null ? card.pitching.whip.toFixed(2) : "—" },
                { label: "IP",   value: card.pitching.ip != null ? card.pitching.ip.toFixed(1) : "—" },
                { label: "K%",   value: card.pitching.kRate != null ? (card.pitching.kRate * 100).toFixed(1) + "%" : "—" },
                { label: "BB%",  value: card.pitching.bbRate != null ? (card.pitching.bbRate * 100).toFixed(1) + "%" : "—" },
                { label: "WAR",  value: card.pitching.war != null ? card.pitching.war.toFixed(1) : "—" },
                { label: "BABIP",value: card.pitching.babip != null ? card.pitching.babip.toFixed(3).replace(/^0/, "") : "—" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    padding: "14px 8px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 10,
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 22, fontWeight: 700, color: s.value === "—" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.95)", lineHeight: 1 }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, textTransform: "uppercase" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Second stat row for hitters */}
          {card.hitting && (
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "K%",   value: card.hitting.kRate != null ? (card.hitting.kRate * 100).toFixed(1) + "%" : "—" },
                { label: "BB%",  value: card.hitting.bbRate != null ? (card.hitting.bbRate * 100).toFixed(1) + "%" : "—" },
                { label: "HH%",  value: card.hitting.hardHitRate != null ? (card.hitting.hardHitRate * 100).toFixed(1) + "%" : "—" },
                { label: "Brl%", value: card.hitting.barrelRate != null ? (card.hitting.barrelRate * 100).toFixed(1) + "%" : "—" },
                { label: "ISO",  value: card.hitting.iso != null ? card.hitting.iso.toFixed(3).replace(/^0/, "") : "—" },
                { label: "BABIP",value: card.hitting.babip != null ? card.hitting.babip.toFixed(3).replace(/^0/, "") : "—" },
                { label: "EV",   value: card.hitting.avgExitVelo != null ? card.hitting.avgExitVelo.toFixed(1) + " mph" : "—" },
                { label: "SB",   value: card.hitting.sb != null ? String(card.hitting.sb) : "—" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flex: 1,
                    padding: "10px 6px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 8,
                    border: "0.5px solid rgba(255,255,255,0.06)",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600, color: s.value === "—" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.8)", lineHeight: 1 }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", letterSpacing: 1.2, textTransform: "uppercase" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
              heater.app · via Baseball Savant & FanGraphs
            </span>
            <span style={{ fontSize: 10, color: "rgba(211,47,47,0.5)" }}>scout mode</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    return new Response(`ImageResponse error:\n${msg}`, {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }
}
