"use client";

import type { BatProjection, PitProjection } from "@/lib/players/getProjections";

interface Props {
  type: "bat" | "pit";
  bat?: BatProjection | null;
  pit?: PitProjection | null;
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
function fmt1(v: number | null): string {
  if (v == null) return "—";
  return v.toFixed(1);
}
function fmtInt(v: number | null): string {
  if (v == null) return "—";
  return Math.round(v).toString();
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr style={{ borderBottom: "0.5px solid rgba(255,255,255,.05)" }}>
      <td style={{
        padding: "7px 0", fontFamily: "var(--font-mono)", fontSize: "9.5px",
        color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".12em",
        width: "50%",
      }}>
        {label}
      </td>
      <td style={{
        padding: "7px 0", fontFamily: "var(--font-mono)", fontSize: "12px",
        color: highlight ? "#e06060" : "rgba(255,255,255,.8)",
        textAlign: "right", fontWeight: highlight ? 600 : 400,
      }}>
        {value}
      </td>
    </tr>
  );
}

export default function ProjectionsTable({ type, bat, pit }: Props) {
  const noData = type === "bat" ? !bat : !pit;

  return (
    <div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: "9px",
        color: "rgba(255,255,255,.3)", textTransform: "uppercase",
        letterSpacing: ".18em", marginBottom: "10px",
        paddingBottom: "8px", borderBottom: "0.5px solid rgba(255,255,255,.06)",
      }}>
        Steamer RoS Projections
      </div>

      {noData ? (
        <div style={{
          padding: "20px 0", fontFamily: "var(--font-mono)", fontSize: "10px",
          color: "rgba(255,255,255,.2)", textTransform: "uppercase",
          letterSpacing: ".14em", textAlign: "center",
        }}>
          Projections unavailable
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {type === "bat" && bat && (
              <>
                <Row label="PA"    value={fmtInt(bat.pa)}    />
                <Row label="AVG"   value={fmt3(bat.avg)}     />
                <Row label="OBP"   value={fmt3(bat.obp)}     />
                <Row label="SLG"   value={fmt3(bat.slg)}     />
                <Row label="OPS"   value={fmt3(bat.ops)}     highlight />
                <Row label="HR"    value={fmtInt(bat.hr)}    />
                <Row label="RBI"   value={fmtInt(bat.rbi)}   />
                <Row label="SB"    value={fmtInt(bat.sb)}    />
                <Row label="BB"    value={fmtInt(bat.bb)}    />
                <Row label="K"     value={fmtInt(bat.so)}    />
                <Row label="wRC+"  value={fmtInt(bat.wrcPlus)} highlight />
                <Row label="BABIP" value={fmt3(bat.babip)}   />
                <Row label="wOBA"  value={fmt3(bat.woba)}    />
                <Row label="ISO"   value={fmt3(bat.iso)}     />
                <Row label="WAR"   value={fmt1(bat.war)}     highlight />
              </>
            )}
            {type === "pit" && pit && (
              <>
                <Row label="IP"    value={fmt1(pit.ip)}      />
                <Row label="W"     value={fmtInt(pit.w)}     />
                <Row label="L"     value={fmtInt(pit.l)}     />
                <Row label="ERA"   value={fmt2(pit.era)}     highlight />
                <Row label="WHIP"  value={fmt2(pit.whip)}    />
                <Row label="FIP"   value={fmt2(pit.fip)}     highlight />
                <Row label="K"     value={fmtInt(pit.so)}    />
                <Row label="BB"    value={fmtInt(pit.bb)}    />
                <Row label="K/9"   value={fmt1(pit.kPer9)}   />
                <Row label="BB/9"  value={fmt1(pit.bbPer9)}  />
                <Row label="HR/9"  value={fmt1(pit.hrPer9)}  />
                <Row label="BABIP" value={fmt3(pit.babip)}   />
                <Row label="WAR"   value={fmt1(pit.war)}     highlight />
              </>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
