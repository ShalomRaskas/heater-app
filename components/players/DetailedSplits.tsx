"use client";

import { useState } from "react";
import type { DetailedSplits, SplitLine } from "@/lib/players/getDetailedSplits";

const MONO = "var(--font-mono)";

export default function DetailedSplitsPanel({
  splits,
  isPitcher,
}: {
  splits: DetailedSplits;
  isPitcher: boolean;
}) {
  const [tab, setTab] = useState<"platoon" | "venue">("platoon");

  const platoonLines = [splits.vsLeft, splits.vsRight].filter(Boolean) as SplitLine[];
  const venueLines   = [splits.home,   splits.away].filter(Boolean)   as SplitLine[];

  const noData = platoonLines.length === 0 && venueLines.length === 0;
  if (noData) {
    return (
      <div style={{
        padding: "20px", textAlign: "center", fontFamily: MONO,
        fontSize: "10px", color: "rgba(255,255,255,.18)",
        textTransform: "uppercase", letterSpacing: ".12em",
      }}>
        Split data unavailable
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        {(["platoon", "venue"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "4px 10px",
              borderRadius: "5px",
              border: tab === t
                ? "0.5px solid rgba(211,47,47,.4)"
                : "0.5px solid rgba(255,255,255,.07)",
              background: tab === t ? "rgba(211,47,47,.08)" : "transparent",
              color: tab === t ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.35)",
              fontFamily: MONO, fontSize: "8.5px",
              textTransform: "uppercase", letterSpacing: ".12em",
              cursor: "pointer",
            }}
          >
            {t === "platoon" ? "Platoon" : "Home / Away"}
          </button>
        ))}
      </div>

      {tab === "platoon" && <SplitsTable lines={platoonLines} isPitcher={isPitcher} />}
      {tab === "venue"   && <SplitsTable lines={venueLines}   isPitcher={isPitcher} />}
    </div>
  );
}

function SplitsTable({ lines, isPitcher }: { lines: SplitLine[]; isPitcher: boolean }) {
  if (lines.length === 0) {
    return (
      <div style={{
        padding: "16px", textAlign: "center", fontFamily: MONO,
        fontSize: "10px", color: "rgba(255,255,255,.18)",
        textTransform: "uppercase", letterSpacing: ".12em",
      }}>
        No data
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: "11px" }}>
      <thead>
        <tr>
          <Th left>Split</Th>
          <Th>G</Th>
          {!isPitcher && (
            <>
              <Th>AVG</Th><Th>OBP</Th><Th>SLG</Th><Th bold>OPS</Th>
              <Th>HR</Th><Th>BB</Th><Th>K</Th>
            </>
          )}
          {isPitcher && (
            <>
              <Th bold>ERA</Th><Th>WHIP</Th><Th>IP</Th><Th>K</Th><Th>BB</Th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {lines.map(line => (
          <tr key={line.label} style={{ borderBottom: "0.5px solid rgba(255,255,255,.04)" }}>
            <td style={{ padding: "7px 8px", fontFamily: MONO, fontSize: "11px", color: "rgba(255,255,255,.6)", fontWeight: 600 }}>
              {line.label}
            </td>
            <td style={tdS}>{line.gp ?? "—"}</td>

            {!isPitcher && (
              <>
                <StatCell val={line.avg} fmt="avg" />
                <StatCell val={line.obp} fmt="avg" />
                <StatCell val={line.slg} fmt="avg" />
                <StatCell val={line.ops} fmt="avg" bold />
                <StatCell val={line.hr}  fmt="int" />
                <StatCell val={line.bb}  fmt="int" />
                <StatCell val={line.so}  fmt="int" />
              </>
            )}
            {isPitcher && (
              <>
                <StatCell val={line.era}  fmt="dec" bold />
                <StatCell val={line.whip} fmt="dec" />
                <StatCell val={line.ip}   fmt="ip"  />
                <StatCell val={line.ks}   fmt="int" />
                <StatCell val={line.pBb}  fmt="int" />
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatCell({
  val, fmt, bold,
}: {
  val: number | null;
  fmt: "avg" | "dec" | "ip" | "int";
  bold?: boolean;
}) {
  const display = val == null ? "—"
    : fmt === "avg" ? val.toFixed(3).replace(/^0\./, ".")
    : fmt === "dec" ? val.toFixed(2)
    : fmt === "ip"  ? `${Math.floor(val)}.${Math.round((val % 1) * 3)}`
    : String(val);

  return (
    <td style={{
      ...tdS,
      color: bold ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.55)",
      fontWeight: bold ? 600 : 400,
    }}>
      {display}
    </td>
  );
}

const tdS: React.CSSProperties = {
  padding: "7px 8px",
  fontFamily: MONO,
  fontSize: "11px",
  color: "rgba(255,255,255,.55)",
};

function Th({ children, left, bold }: { children: React.ReactNode; left?: boolean; bold?: boolean }) {
  return (
    <th style={{
      padding: "5px 8px",
      textAlign: left ? "left" : "left",
      fontFamily: MONO,
      fontSize: "9px",
      color: bold ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.28)",
      textTransform: "uppercase",
      letterSpacing: ".12em",
      fontWeight: bold ? 600 : 500,
      borderBottom: "0.5px solid rgba(255,255,255,.08)",
    }}>
      {children}
    </th>
  );
}
