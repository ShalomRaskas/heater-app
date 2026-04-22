"use client";

interface HittingStats {
  gp: number | null;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  hr: number | null;
  rbi: number | null;
  sb: number | null;
  bb: number | null;
  so: number | null;
  war: number | null;
  wrcPlus: number | null;
  babip: number | null;
}

interface PitchingStats {
  gp: number | null;
  w: number | null;
  l: number | null;
  sv: number | null;
  era: number | null;
  whip: number | null;
  ip: number | null;
  so: number | null;
  bb: number | null;
  war: number | null;
  fip: number | null;
  babip: number | null;
}

interface SeasonStatsProps {
  season: number;
  hitting: HittingStats | null;
  pitching: PitchingStats | null;
}

function fmt3(v: number | null): string {
  if (v == null) return "—";
  const s = v.toFixed(3);
  return Math.abs(v) < 1 ? s.replace(/^0/, "") : s;
}

function fmt2(v: number | null): string {
  if (v == null) return "—";
  return v.toFixed(2);
}

function fmtInt(v: number | null): string {
  if (v == null) return "—";
  return Math.round(v).toString();
}

function fmtWar(v: number | null): string {
  if (v == null) return "—";
  return v.toFixed(1);
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "14px 10px 12px",
      background: "rgba(255,255,255,.025)",
      border: `0.5px solid ${highlight ? "rgba(211,47,47,.25)" : "rgba(255,255,255,.07)"}`,
      borderRadius: "8px",
      minWidth: "72px",
    }}>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "15px", fontWeight: 600,
        color: highlight ? "#e06060" : "rgba(255,255,255,.9)",
        letterSpacing: "-.01em", marginBottom: "5px",
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "8px",
        color: "rgba(255,255,255,.3)", textTransform: "uppercase",
        letterSpacing: ".12em", lineHeight: 1.2, textAlign: "center",
      }}>
        {label}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono)", fontSize: "9px",
      color: "rgba(255,255,255,.25)", textTransform: "uppercase",
      letterSpacing: ".18em", marginBottom: "8px", marginTop: "16px",
    }}>
      {children}
    </div>
  );
}

export default function SeasonStats({ season, hitting, pitching }: SeasonStatsProps) {
  return (
    <div>
      {/* Header */}
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "9px",
        color: "rgba(255,255,255,.3)", textTransform: "uppercase",
        letterSpacing: ".18em", marginBottom: "14px",
        paddingBottom: "8px", borderBottom: "0.5px solid rgba(255,255,255,.06)",
      }}>
        {season} Season
      </div>

      {hitting && (
        <>
          <SectionLabel>Batting</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <StatBox label="GP"   value={fmtInt(hitting.gp)}   />
            <StatBox label="AVG"  value={fmt3(hitting.avg)}    />
            <StatBox label="OBP"  value={fmt3(hitting.obp)}    />
            <StatBox label="SLG"  value={fmt3(hitting.slg)}    />
            <StatBox label="OPS"  value={fmt3(hitting.ops)}    highlight />
            <StatBox label="HR"   value={fmtInt(hitting.hr)}   />
            <StatBox label="RBI"  value={fmtInt(hitting.rbi)}  />
            <StatBox label="SB"   value={fmtInt(hitting.sb)}   />
            <StatBox label="BB"   value={fmtInt(hitting.bb)}   />
            <StatBox label="K"    value={fmtInt(hitting.so)}   />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
            <StatBox label="wRC+" value={fmtInt(hitting.wrcPlus)} highlight />
            <StatBox label="BABIP" value={fmt3(hitting.babip)}    />
            <StatBox label="WAR"  value={fmtWar(hitting.war)}    highlight />
          </div>
        </>
      )}

      {pitching && (
        <>
          <SectionLabel>Pitching</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <StatBox label="GP"   value={fmtInt(pitching.gp)}  />
            <StatBox label="W"    value={fmtInt(pitching.w)}   />
            <StatBox label="L"    value={fmtInt(pitching.l)}   />
            <StatBox label="SV"   value={fmtInt(pitching.sv)}  />
            <StatBox label="ERA"  value={fmt2(pitching.era)}   highlight />
            <StatBox label="WHIP" value={fmt2(pitching.whip)}  />
            <StatBox label="IP"   value={pitching.ip != null ? pitching.ip.toFixed(1) : "—"} />
            <StatBox label="K"    value={fmtInt(pitching.so)}  />
            <StatBox label="BB"   value={fmtInt(pitching.bb)}  />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
            <StatBox label="FIP"   value={fmt2(pitching.fip)}   highlight />
            <StatBox label="BABIP" value={fmt3(pitching.babip)} />
            <StatBox label="WAR"   value={fmtWar(pitching.war)} highlight />
          </div>
        </>
      )}

      {!hitting && !pitching && (
        <div style={{
          padding: "24px", fontFamily: "var(--font-mono)", fontSize: "10px",
          color: "rgba(255,255,255,.2)", textTransform: "uppercase",
          letterSpacing: ".14em", textAlign: "center",
        }}>
          No {season} stats available yet
        </div>
      )}
    </div>
  );
}
