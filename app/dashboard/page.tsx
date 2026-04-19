import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import AlbertPanel from "@/components/dashboard/AlbertPanel";
import CockpitPanel from "@/components/dashboard/CockpitPanel";
import MobileSplash from "@/components/MobileSplash";

/* ─── Static mock data ──────────────────────────────────── */

const RELATED_RESEARCH = [
  {
    title: "Skenes' fastball vs. league",
    desc: "Where does his 4-seam live vs. MLB avg, 2025?",
    mini: (
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <circle cx="110" cy="25" r="16" fill="rgba(255,107,53,.2)" stroke="#ff8040" strokeWidth="0.75" />
        <circle cx="70" cy="35" r="8" fill="rgba(180,200,220,.08)" stroke="rgba(200,200,220,.3)" strokeWidth="0.5" />
        <circle cx="150" cy="40" r="5" fill="rgba(180,200,220,.08)" stroke="rgba(200,200,220,.3)" strokeWidth="0.5" />
        <line x1="0" y1="30" x2="200" y2="30" stroke="rgba(255,255,255,.06)" strokeDasharray="2 3" />
      </svg>
    ),
  },
  {
    title: "Sale's '10–'11 arm health",
    desc: "Workload + velocity leading into tendonitis.",
    mini: (
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="lg1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ff6b35" stopOpacity=".3" />
            <stop offset="1" stopColor="#ff6b35" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points="5,40 30,35 55,32 80,28 105,33 130,28 155,22 180,35 195,45" fill="none" stroke="#ff6b35" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    title: "Strider's slider shape",
    desc: "How does the 'death ball' compare in movement profile?",
    mini: (
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <circle cx="90" cy="30" r="18" fill="rgba(211,47,47,.2)" stroke="#e85050" strokeWidth="0.75" />
        <circle cx="90" cy="30" r="9" fill="rgba(255,107,53,.3)" />
      </svg>
    ),
  },
  {
    title: "Rookie ace comps, 2000–",
    desc: "Who had the best first full season, statistically?",
    mini: (
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
        <circle cx="40" cy="20" r="3" fill="#ff8040" />
        <circle cx="65" cy="35" r="2.5" fill="rgba(255,255,255,.4)" />
        <circle cx="90" cy="15" r="2" fill="rgba(255,255,255,.4)" />
        <circle cx="115" cy="30" r="4" fill="#ff6b35" />
        <circle cx="140" cy="42" r="2.5" fill="rgba(255,255,255,.4)" />
        <circle cx="165" cy="22" r="3.5" fill="#ffa050" />
        <line x1="40" y1="20" x2="65" y2="35" stroke="rgba(255,255,255,.15)" strokeWidth="0.5" />
        <line x1="65" y1="35" x2="115" y2="30" stroke="rgba(255,255,255,.15)" strokeWidth="0.5" />
        <line x1="115" y1="30" x2="165" y2="22" stroke="rgba(255,255,255,.15)" strokeWidth="0.5" />
      </svg>
    ),
  },
];

const RECENT_RESEARCH = [
  { when: "Yesterday", query: "Who's the next Juan Soto? 5 prospects under 21 with elite plate discipline.", msgs: "14 msgs" },
  { when: "Yesterday", query: "Why is the Orioles' team xwOBA dropping on fastballs this month?", msgs: "9 msgs" },
  { when: "2 days", query: "Explain wRC+ like I'm a smart person but not a sabermetrician.", msgs: "4 msgs" },
  { when: "3 days", query: "Best defensive catchers by pitch framing, 2024–25 rolling window.", msgs: "11 msgs" },
  { when: "Last wk", query: "My team's hottest AAA prospect — Durham Bulls.", msgs: "6 msgs" },
];

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Mobile gate — shown below md breakpoint instead of the dashboard */}
      <MobileSplash />

      {/* Desktop layout — hidden on small screens */}
      <div className="desktop-only">
      <Navbar email={user.email ?? ""} />

      {/* Main split — min-width so it scrolls on smaller viewports */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: "1200px" }}>
          {/* Albert + Cockpit split */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "576px 0.5px 1fr",
              minHeight: "820px",
              borderBottom: "0.5px solid rgba(255,255,255,.08)",
            }}
          >
            <AlbertPanel />
            {/* Gutter */}
            <div style={{ background: "rgba(255,255,255,.08)" }} />
            <CockpitPanel />
          </div>

          {/* Below fold */}
          <div
            style={{
              padding: "28px 24px 56px",
              borderTop: "0.5px solid rgba(255,255,255,.08)",
              background:
                "linear-gradient(180deg, transparent, rgba(211,47,47,.02))",
            }}
          >
            {/* Related research */}
            <h3
              style={{
                fontWeight: 600,
                fontSize: "13px",
                margin: "0 0 14px",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                color: "rgba(255,255,255,.6)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              Related research
              <span
                style={{
                  flex: 1,
                  height: "0.5px",
                  background: "rgba(255,255,255,.08)",
                }}
              />
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              {RELATED_RESEARCH.map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,.03)",
                    border: "0.5px solid rgba(255,255,255,.08)",
                    cursor: "pointer",
                  }}
                >
                  <strong
                    style={{
                      fontWeight: 500,
                      fontSize: "13px",
                      display: "block",
                      marginBottom: "4px",
                      color: "rgba(255,255,255,.95)",
                      letterSpacing: "-.01em",
                    }}
                  >
                    {card.title}
                  </strong>
                  <p
                    style={{
                      fontSize: "11.5px",
                      color: "rgba(255,255,255,.4)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {card.desc}
                  </p>
                  <div
                    style={{
                      height: "58px",
                      marginTop: "10px",
                      borderRadius: "6px",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,.015), transparent)",
                      border: "0.5px solid rgba(255,255,255,.08)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {card.mini}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent research */}
            <h3
              style={{
                fontWeight: 600,
                fontSize: "13px",
                margin: "0 0 14px",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                color: "rgba(255,255,255,.6)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              Recent research
              <span
                style={{
                  flex: 1,
                  height: "0.5px",
                  background: "rgba(255,255,255,.08)",
                }}
              />
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {RECENT_RESEARCH.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr auto",
                    gap: "14px",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,.03)",
                    border: "0.5px solid rgba(255,255,255,.08)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9.5px",
                      color: "rgba(255,255,255,.4)",
                      textTransform: "uppercase",
                      letterSpacing: ".12em",
                    }}
                  >
                    {item.when}
                  </span>
                  <span style={{ fontSize: "12.5px", color: "rgba(255,255,255,.6)" }}>
                    {item.query}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "rgba(255,255,255,.4)",
                    }}
                  >
                    {item.msgs}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div> {/* end hidden md:block */}
    </div>
  );
}
