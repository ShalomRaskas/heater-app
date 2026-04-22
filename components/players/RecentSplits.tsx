"use client";

import { useState } from "react";
import type { RecentSplits, SplitStatLine } from "@/lib/players/getRecentSplits";

interface Props {
  splits: RecentSplits;
  isPitcher: boolean;
}

type Period = "last7" | "last14" | "last30";

const LABELS: Record<Period, string> = {
  last7: "Last 7",
  last14: "Last 14",
  last30: "Last 30",
};

function fmt3(v: number | null): string {
  if (v == null) return "—";
  const s = v.toFixed(3);
  return Math.abs(v) < 1 ? s.replace(/^0/, "") : s;
}
function fmt2(v: number | null): string { return v == null ? "—" : v.toFixed(2); }
function fmt1(v: number | null): string { return v == null ? "—" : v.toFixed(1); }
function fmtInt(v: number | null): string { return v == null ? "—" : Math.round(v).toString(); }

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

function HittingTable({ s }: { s: SplitStatLine }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        <Row label="GP"   value={fmtInt(s.gp)}  />
        <Row label="AVG"  value={fmt3(s.avg)}   />
        <Row label="OBP"  value={fmt3(s.obp)}   />
        <Row label="SLG"  value={fmt3(s.slg)}   />
        <Row label="OPS"  value={fmt3(s.ops)}   highlight />
        <Row label="HR"   value={fmtInt(s.hr)}  />
        <Row label="RBI"  value={fmtInt(s.rbi)} />
        <Row label="SB"   value={fmtInt(s.sb)}  />
        <Row label="BB"   value={fmtInt(s.bb)}  />
        <Row label="K"    value={fmtInt(s.so)}  />
      </tbody>
    </table>
  );
}

function PitchingTable({ s }: { s: SplitStatLine }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        <Row label="GP"   value={fmtInt(s.gp)}  />
        <Row label="W"    value={fmtInt(s.w)}   />
        <Row label="L"    value={fmtInt(s.l)}   />
        <Row label="SV"   value={fmtInt(s.sv)}  />
        <Row label="ERA"  value={fmt2(s.era)}   highlight />
        <Row label="WHIP" value={fmt2(s.whip)}  />
        <Row label="IP"   value={fmt1(s.ip)}    />
        <Row label="K"    value={fmtInt(s.pSo)} />
        <Row label="BB"   value={fmtInt(s.pBb)} />
      </tbody>
    </table>
  );
}

export default function RecentSplits({ splits, isPitcher }: Props) {
  const [period, setPeriod] = useState<Period>("last7");
  const current = splits[period];

  return (
    <div>
      {/* Section label + tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: "9px",
          color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".18em",
        }}>
          Recent Splits
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {(Object.keys(LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: period === p ? "0.5px solid rgba(211,47,47,.5)" : "0.5px solid rgba(255,255,255,.08)",
                background: period === p ? "rgba(211,47,47,.1)" : "transparent",
                color: period === p ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.35)",
                fontFamily: "var(--font-mono)", fontSize: "9px",
                textTransform: "uppercase", letterSpacing: ".1em",
                cursor: "pointer",
              }}
            >
              {LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "0.5px solid rgba(255,255,255,.06)" }} />

      {!current ? (
        <div style={{
          padding: "20px 0", fontFamily: "var(--font-mono)", fontSize: "10px",
          color: "rgba(255,255,255,.2)", textTransform: "uppercase",
          letterSpacing: ".14em", textAlign: "center",
        }}>
          No data for this period
        </div>
      ) : isPitcher ? (
        <PitchingTable s={current} />
      ) : (
        <HittingTable s={current} />
      )}
    </div>
  );
}
