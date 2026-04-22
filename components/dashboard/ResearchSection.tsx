"use client";

function sendQuery(query: string) {
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.dispatchEvent(new CustomEvent("albert-query", { detail: { query } }));
}

/* ── Mini SVG previews ───────────────────────────────────────────────────── */
const SprayMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <path d="M100 8 L170 52 L30 52 Z" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="0.75" />
    {[[80,42],[95,28],[115,35],[130,44],[105,48],[70,38],[120,22],[88,20]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r={2.5} fill={i < 3 ? "#D32F2F" : i < 6 ? "#ff8040" : "rgba(255,255,255,.3)"} />
    ))}
  </svg>
);

const EvLaMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <line x1="20" y1="50" x2="180" y2="50" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
    <line x1="20" y1="10" x2="20" y2="50" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
    <polygon points="100,12 120,12 120,30 100,30" fill="rgba(211,47,47,.15)" stroke="rgba(211,47,47,.4)" strokeWidth="0.5" />
    {[[60,38],[75,32],[90,20],[110,18],[130,35],[145,40],[85,42],[55,45]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r={2.2} fill={y < 25 ? "#D32F2F" : "rgba(255,255,255,.35)"} />
    ))}
  </svg>
);

const BbProfileMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <circle cx="100" cy="30" r="22" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="8" />
    <circle cx="100" cy="30" r="22" fill="none" stroke="#ff8040" strokeWidth="8" strokeDasharray="34 138" strokeDashoffset="0" />
    <circle cx="100" cy="30" r="22" fill="none" stroke="#60a8d0" strokeWidth="8" strokeDasharray="48 138" strokeDashoffset="-34" />
    <circle cx="100" cy="30" r="22" fill="none" stroke="#d4af37" strokeWidth="8" strokeDasharray="30 138" strokeDashoffset="-82" />
    <circle cx="100" cy="30" r="22" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="8" strokeDasharray="26 138" strokeDashoffset="-112" />
    <circle cx="100" cy="30" r="13" fill="rgba(8,10,20,.9)" />
  </svg>
);

const ExitVeloMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <path d="M100 8 L170 52 L30 52 Z" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />
    <path d="M100 8 L135 30 L100 52 L65 30 Z" fill="rgba(211,47,47,.18)" stroke="rgba(211,47,47,.4)" strokeWidth="0.5" />
    <path d="M100 8 L165 50 L35 50 Z" fill="none" stroke="rgba(255,140,0,.25)" strokeWidth="0.5" />
    <path d="M100 20 L140 46 L60 46 Z" fill="rgba(255,140,0,.1)" />
  </svg>
);

const PercentileMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    {[[30,"#d4af37",88],[62,"#d4af37",95],[94,"#60a8d0",72],[126,"rgba(255,255,255,.4)",48],[158,"#e07840",31]].map(([x,color,p],i) => {
      const cx = x as number; const r = 16; const arc = (p as number / 100) * 2 * Math.PI * 12;
      return (
        <g key={i}>
          <circle cx={cx} cy={30} r={r} fill="rgba(8,10,20,.8)" stroke={color as string} strokeWidth="0.5" opacity="0.5" />
          <circle cx={cx} cy={30} r={12} fill="none" stroke={color as string} strokeWidth="2.5"
            strokeDasharray={`${arc} 75.4`} transform={`rotate(-90,${cx},30)`} opacity="0.8" />
          <text x={cx} y={34} textAnchor="middle" fill={color as string} fontSize="9" fontWeight="700" fontFamily="monospace">{p}</text>
        </g>
      );
    })}
  </svg>
);

const ArsenalMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <line x1="100" y1="10" x2="100" y2="52" stroke="rgba(255,255,255,.06)" strokeDasharray="2 3" />
    <line x1="20" y1="30" x2="180" y2="30" stroke="rgba(255,255,255,.06)" strokeDasharray="2 3" />
    <circle cx="80" cy="22" r="14" fill="rgba(255,107,53,.18)" stroke="#ff8040" strokeWidth="0.75" />
    <circle cx="125" cy="38" r="10" fill="rgba(96,168,208,.15)" stroke="#60a8d0" strokeWidth="0.75" />
    <circle cx="70" cy="44" r="7" fill="rgba(192,132,255,.15)" stroke="#c084ff" strokeWidth="0.75" />
    <text x="80" y="25" textAnchor="middle" fill="#ff8040" fontSize="7" fontFamily="monospace" fontWeight="600">FF</text>
    <text x="125" y="41" textAnchor="middle" fill="#60a8d0" fontSize="7" fontFamily="monospace" fontWeight="600">SL</text>
    <text x="70" y="47" textAnchor="middle" fill="#c084ff" fontSize="7" fontFamily="monospace" fontWeight="600">CU</text>
  </svg>
);

const PitchMoveMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <line x1="100" y1="8" x2="100" y2="54" stroke="rgba(255,255,255,.07)" strokeDasharray="2 3" />
    <line x1="18" y1="30" x2="182" y2="30" stroke="rgba(255,255,255,.07)" strokeDasharray="2 3" />
    {[[75,18,4,"#ff8040"],[78,20,3.5,"#ff8040"],[72,22,3,"#ff8040"],[125,42,4,"#60a8d0"],[128,40,3.5,"#60a8d0"],[80,40,3.5,"#c084ff"]].map(([x,y,r,c],i) => (
      <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={c as string} opacity="0.5" />
    ))}
    <circle cx="76" cy="20" r="7" fill="none" stroke="#ff8040" strokeWidth="1" opacity="0.6" />
    <circle cx="126" cy="41" r="6" fill="none" stroke="#60a8d0" strokeWidth="1" opacity="0.6" />
  </svg>
);

const PitchTracksMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <rect x="80" y="20" width="40" height="36" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="0.75" />
    <path d="M30 8 Q60 10 80 28" fill="none" stroke="#ff8040" strokeWidth="1" opacity="0.7" />
    <path d="M35 10 Q62 14 82 32" fill="none" stroke="#ff8040" strokeWidth="1" opacity="0.4" />
    <path d="M30 8 Q55 18 80 44" fill="none" stroke="#60a8d0" strokeWidth="1" opacity="0.7" />
    <path d="M32 9 Q56 20 81 46" fill="none" stroke="#60a8d0" strokeWidth="1" opacity="0.4" />
    <path d="M28 9 Q50 22 80 38" fill="none" stroke="#c084ff" strokeWidth="1" opacity="0.6" />
  </svg>
);

const HeatMapMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <rect x="55" y="8" width="90" height="46" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
    {[
      [55,8,"rgba(211,47,47,.5)"],[85,8,"rgba(255,120,50,.4)"],[115,8,"rgba(211,47,47,.35)"],
      [55,23,"rgba(255,140,0,.35)"],[85,23,"rgba(211,47,47,.6)"],[115,23,"rgba(255,120,50,.45)"],
      [55,38,"rgba(255,255,255,.06)"],[85,38,"rgba(255,140,0,.2)"],[115,38,"rgba(255,255,255,.06)"],
    ].map(([x,y,fill],i) => (
      <rect key={i} x={x as number} y={y as number} width="30" height="15" fill={fill as string} />
    ))}
  </svg>
);

const ReleasePointMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <line x1="100" y1="8" x2="100" y2="54" stroke="rgba(255,255,255,.07)" strokeDasharray="2 3" />
    <line x1="18" y1="35" x2="182" y2="35" stroke="rgba(255,255,255,.07)" strokeDasharray="2 3" />
    {[[68,18],[72,20],[65,22],[70,16],[74,19],[67,24]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r={2.5} fill="#ff8040" opacity={0.5 + i * 0.08} />
    ))}
    <circle cx="70" cy="20" r="8" fill="none" stroke="#ff8040" strokeWidth="0.75" opacity="0.4" />
  </svg>
);

const ZoneGridMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    {[
      [65,10,"rgba(255,107,53,.55)"],[95,10,"rgba(211,47,47,.65)"],[125,10,"rgba(255,107,53,.4)"],
      [65,28,"rgba(255,107,53,.35)"],[95,28,"rgba(211,47,47,.75)"],[125,28,"rgba(255,107,53,.5)"],
      [65,46,"rgba(255,255,255,.08)"],[95,46,"rgba(255,140,0,.25)"],[125,46,"rgba(255,255,255,.06)"],
    ].map(([x,y,fill],i) => (
      <rect key={i} x={x as number} y={y as number} width="28" height="16" rx="2" fill={fill as string} />
    ))}
  </svg>
);

const PlayerCardMini = () => (
  <svg viewBox="0 0 200 60" style={{ width: "100%", height: "100%" }}>
    <rect x="40" y="6" width="120" height="50" rx="5" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.1)" strokeWidth="0.75" />
    <rect x="40" y="6" width="120" height="3" rx="2" fill="#d4af37" opacity="0.6" />
    <circle cx="66" cy="26" r="12" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.15)" strokeWidth="0.5" />
    <rect x="84" y="16" width="50" height="4" rx="2" fill="rgba(255,255,255,.2)" />
    <rect x="84" y="23" width="30" height="3" rx="1.5" fill="rgba(255,255,255,.1)" />
    <rect x="48" y="42" width="20" height="3" rx="1.5" fill="rgba(255,255,255,.12)" />
    <rect x="72" y="42" width="20" height="3" rx="1.5" fill="rgba(255,255,255,.12)" />
    <rect x="96" y="42" width="20" height="3" rx="1.5" fill="rgba(255,255,255,.12)" />
    <rect x="120" y="42" width="20" height="3" rx="1.5" fill="rgba(255,255,255,.12)" />
  </svg>
);

/* ── Chart types ─────────────────────────────────────────────────────────── */
const CHARTS = [
  {
    section: "Batter",
    name: "Spray Chart",
    desc: "Hit distribution across the field",
    query: "Show me Judge's spray chart",
    Mini: SprayMini,
  },
  {
    section: "Batter",
    name: "EV vs Launch Angle",
    desc: "Contact quality scatter with barrel zone",
    query: "Show me Judge's exit velocity vs launch angle",
    Mini: EvLaMini,
  },
  {
    section: "Batter",
    name: "Batted Ball Profile",
    desc: "GB / LD / FB / IFFB breakdown",
    query: "Show me Judge's batted ball profile",
    Mini: BbProfileMini,
  },
  {
    section: "Batter",
    name: "Exit Velo Zones",
    desc: "Hard-hit rate by field sector",
    query: "Show me Judge's exit velo zones",
    Mini: ExitVeloMini,
  },
  {
    section: "Batter",
    name: "Percentile Rankings",
    desc: "Statcast percentile bubbles vs MLB",
    query: "Show me Judge's percentile rankings",
    Mini: PercentileMini,
  },
  {
    section: "Pitcher",
    name: "Pitch Arsenal",
    desc: "Movement profile bubbles by pitch type",
    query: "Show me Skubal's pitch arsenal",
    Mini: ArsenalMini,
  },
  {
    section: "Pitcher",
    name: "Pitch Movement",
    desc: "pfx scatter with centroid per pitch",
    query: "Show me Skubal's pitch movement",
    Mini: PitchMoveMini,
  },
  {
    section: "Pitcher",
    name: "Pitch Tracks",
    desc: "3D trajectory lines to the plate",
    query: "Show me Skubal's pitch tracks",
    Mini: PitchTracksMini,
  },
  {
    section: "Pitcher",
    name: "Pitch Heat Map",
    desc: "Location density over the strike zone",
    query: "Show me Skubal's pitch heat map",
    Mini: HeatMapMini,
  },
  {
    section: "Pitcher",
    name: "Release Point",
    desc: "Arm slot and release consistency",
    query: "Show me Skubal's release point",
    Mini: ReleasePointMini,
  },
  {
    section: "Pitcher",
    name: "Zone Grid",
    desc: "3×3 zone usage density",
    query: "Show me Skubal's zone grid",
    Mini: ZoneGridMini,
  },
  {
    section: "Pitcher",
    name: "Percentile Rankings",
    desc: "Statcast percentile bubbles vs MLB",
    query: "Show me Skubal's percentile rankings",
    Mini: PercentileMini,
  },
  {
    section: "Player",
    name: "Player Card",
    desc: "Full stat card with headshot and arsenal",
    query: "Show me Judge's player card",
    Mini: PlayerCardMini,
  },
];

const SECTION_COLOR: Record<string, string> = {
  Batter:  "rgba(255,140,0,.7)",
  Pitcher: "rgba(96,168,208,.7)",
  Player:  "rgba(212,175,55,.7)",
};
const SECTION_BG: Record<string, string> = {
  Batter:  "rgba(255,140,0,.08)",
  Pitcher: "rgba(96,168,208,.08)",
  Player:  "rgba(212,175,55,.08)",
};

/* ── Component ───────────────────────────────────────────────────────────── */
export default function ResearchSection() {
  return (
    <div style={{
      padding: "28px 24px 56px",
      borderTop: "0.5px solid rgba(255,255,255,.08)",
      background: "linear-gradient(180deg, transparent, rgba(211,47,47,.02))",
    }}>
      <h3 style={{
        fontWeight: 600, fontSize: "13px", margin: "0 0 16px",
        textTransform: "uppercase", letterSpacing: ".14em",
        color: "rgba(255,255,255,.6)",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        Chart Gallery
        <span style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,.08)" }} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "9px",
          color: "rgba(255,255,255,.25)", textTransform: "uppercase",
          letterSpacing: ".14em", fontWeight: 400,
        }}>
          Click any to render
        </span>
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
        {CHARTS.map((chart) => (
          <button
            key={`${chart.section}-${chart.name}`}
            onClick={() => sendQuery(chart.query)}
            style={{
              display: "block", textAlign: "left", padding: "12px",
              borderRadius: "10px", cursor: "pointer", width: "100%",
              background: "rgba(255,255,255,.025)",
              border: "0.5px solid rgba(255,255,255,.07)",
              transition: "background .15s, border-color .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,.05)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,.025)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,.07)";
            }}
          >
            {/* Mini preview */}
            <div style={{
              height: "56px", borderRadius: "6px", marginBottom: "9px",
              background: "rgba(7,10,18,.8)",
              border: "0.5px solid rgba(255,255,255,.06)", overflow: "hidden",
            }}>
              <chart.Mini />
            </div>

            {/* Category badge */}
            <div style={{ marginBottom: "4px" }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "7.5px",
                textTransform: "uppercase", letterSpacing: ".12em",
                color: SECTION_COLOR[chart.section],
                background: SECTION_BG[chart.section],
                padding: "1px 6px", borderRadius: "3px",
              }}>
                {chart.section}
              </span>
            </div>

            {/* Name */}
            <div style={{
              fontWeight: 600, fontSize: "12.5px", marginBottom: "3px",
              color: "rgba(255,255,255,.88)", letterSpacing: "-.01em",
            }}>
              {chart.name}
            </div>

            {/* Description */}
            <p style={{
              fontSize: "11px", color: "rgba(255,255,255,.35)",
              margin: 0, lineHeight: 1.45,
            }}>
              {chart.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
