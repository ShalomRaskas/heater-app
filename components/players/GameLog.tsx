"use client";

import type { GameLogEntry } from "@/lib/players/getGameLog";

const MONO = "var(--font-mono)";

export default function GameLog({
  entries,
  isPitcher,
}: {
  entries: GameLogEntry[];
  isPitcher: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div style={{
        padding: "24px", textAlign: "center", fontFamily: MONO,
        fontSize: "10px", color: "rgba(255,255,255,.18)",
        textTransform: "uppercase", letterSpacing: ".14em",
      }}>
        No game log data available
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: "11.5px" }}>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Opp</Th>
            {!isPitcher && <><Th>AB</Th><Th>H</Th><Th>HR</Th><Th>RBI</Th><Th>BB</Th><Th>K</Th></>}
            {isPitcher  && <><Th>IP</Th><Th>ER</Th><Th>K</Th><Th>BB</Th><Th>Dec</Th></>}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <GameRow key={i} entry={e} isPitcher={isPitcher} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GameRow({
  entry: e,
  isPitcher,
  index,
}: {
  entry: GameLogEntry;
  isPitcher: boolean;
  index: number;
}) {
  const bg = index % 2 === 0 ? "transparent" : "rgba(255,255,255,.018)";
  const venue = e.isHome ? "vs" : "@";
  const dateStr = e.date.length >= 10 ? e.date.slice(5).replace("-", "/") : e.date;

  const ipDisplay = e.ip != null
    ? `${Math.floor(e.ip)}.${Math.round((e.ip % 1) * 3)}`
    : "—";

  const decColor =
    e.decision === "W" ? "rgba(80,200,120,.85)"
    : e.decision === "L" ? "rgba(211,47,47,.85)"
    : "rgba(255,255,255,.35)";

  return (
    <tr style={{ background: bg, borderBottom: "0.5px solid rgba(255,255,255,.035)" }}>
      <td style={{ padding: "7px 10px", color: "rgba(255,255,255,.4)" }}>{dateStr}</td>
      <td style={{ padding: "7px 10px", color: "rgba(255,255,255,.75)", whiteSpace: "nowrap" }}>
        <span style={{ color: "rgba(255,255,255,.28)", marginRight: 5, fontSize: "10px" }}>{venue}</span>
        {e.opponent}
      </td>

      {!isPitcher && (
        <>
          <Td>{e.ab ?? "—"}</Td>
          <Td bright={!!e.h && e.h > 0}>{e.h ?? "—"}</Td>
          <Td bright={!!e.hr && e.hr > 0} accent="rgba(211,47,47,.9)">{e.hr || "—"}</Td>
          <Td>{e.rbi ?? "—"}</Td>
          <Td>{e.bb ?? "—"}</Td>
          <Td>{e.so ?? "—"}</Td>
        </>
      )}

      {isPitcher && (
        <>
          <Td>{ipDisplay}</Td>
          <Td>{e.er ?? "—"}</Td>
          <Td bright={!!e.ks && e.ks >= 7} accent="rgba(100,180,255,.85)">{e.ks ?? "—"}</Td>
          <Td>{e.pBb ?? "—"}</Td>
          <td style={{ padding: "7px 10px", fontWeight: 700, color: decColor }}>
            {e.decision ?? "ND"}
          </td>
        </>
      )}
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "7px 10px",
      textAlign: "left",
      fontFamily: MONO,
      fontSize: "9px",
      color: "rgba(255,255,255,.28)",
      textTransform: "uppercase",
      letterSpacing: ".14em",
      fontWeight: 500,
      borderBottom: "0.5px solid rgba(255,255,255,.09)",
    }}>
      {children}
    </th>
  );
}

function Td({
  children,
  bright,
  accent,
}: {
  children: React.ReactNode;
  bright?: boolean;
  accent?: string;
}) {
  return (
    <td style={{
      padding: "7px 10px",
      color: bright && accent ? accent : bright ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.5)",
      fontWeight: bright ? 600 : 400,
    }}>
      {children}
    </td>
  );
}
