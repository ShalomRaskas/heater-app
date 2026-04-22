"use client";

import { useState } from "react";
import { getTeamColor, getTeamLogoUrl, getHeadshotUrl } from "@/lib/mlb/team-assets";

interface PlayerHeroProps {
  mlbId: number;
  fullName: string;
  teamAbbr: string | null;
  teamName: string | null;
  position: string | null;
  jerseyNumber: string | null;
  age: number | null;
  height: string | null;
  weight: number | null;
  bats: string | null;
  throws: string | null;
}

export default function PlayerHero({
  mlbId, fullName, teamAbbr, teamName, position,
  jerseyNumber, age, height, weight, bats, throws,
}: PlayerHeroProps) {
  const [imgError, setImgError] = useState(false);
  const teamColor = getTeamColor(teamAbbr);
  const logoUrl = getTeamLogoUrl(teamAbbr);
  const headshotUrl = getHeadshotUrl(mlbId, 320);

  const bioLine = [
    age != null ? `Age ${age}` : null,
    height,
    weight != null ? `${weight} lbs` : null,
    bats && throws ? `B/T: ${bats}/${throws}` : null,
  ].filter(Boolean).join("  ·  ");

  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      borderBottom: "0.5px solid rgba(255,255,255,.08)",
    }}>
      {/* Team color accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "3px",
        background: `linear-gradient(90deg, ${teamColor}, transparent)`,
      }} />

      {/* Subtle team color glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(ellipse at 20% 50%, ${teamColor}12 0%, transparent 60%)`,
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", alignItems: "flex-end", gap: "32px",
        padding: "24px 48px 28px",
        maxWidth: "1400px", margin: "0 auto",
      }}>

        {/* Headshot */}
        <div style={{
          width: "120px", height: "90px", flexShrink: 0,
          borderRadius: "10px", overflow: "hidden",
          border: `0.5px solid ${teamColor}40`,
          background: "rgba(255,255,255,.03)",
          display: "grid", placeItems: "center",
        }}>
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={headshotUrl}
              alt={fullName}
              onError={() => setImgError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
            />
          ) : (
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.08)" strokeWidth="0.5"/>
              <circle cx="20" cy="16" r="6" fill="rgba(255,255,255,.12)"/>
              <ellipse cx="20" cy="33" rx="11" ry="7" fill="rgba(255,255,255,.08)"/>
            </svg>
          )}
        </div>

        {/* Player info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + jersey */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "6px" }}>
            <h1 style={{
              fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: "28px",
              color: "rgba(255,255,255,.95)", margin: 0, letterSpacing: "-.02em",
              lineHeight: 1.1,
            }}>
              {fullName}
            </h1>
            {jerseyNumber && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "13px",
                color: "rgba(255,255,255,.28)", letterSpacing: ".1em",
              }}>
                #{jerseyNumber}
              </span>
            )}
          </div>

          {/* Team + position row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={teamAbbr ?? ""} width={22} height={22} style={{ opacity: 0.85 }} />
            )}
            {(teamAbbr || teamName) && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "11px",
                color: "rgba(255,255,255,.55)", textTransform: "uppercase",
                letterSpacing: ".1em",
              }}>
                {teamAbbr ?? teamName}
              </span>
            )}
            {position && (
              <>
                <span style={{ color: "rgba(255,255,255,.15)", fontSize: "10px" }}>·</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "10px",
                  color: "rgba(255,255,255,.4)", textTransform: "uppercase",
                  letterSpacing: ".1em",
                  background: "rgba(255,255,255,.06)", borderRadius: "4px",
                  padding: "2px 8px",
                }}>
                  {position}
                </span>
              </>
            )}
          </div>

          {/* Bio line */}
          {bioLine && (
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: "10px",
              color: "rgba(255,255,255,.28)", letterSpacing: ".1em",
              textTransform: "uppercase",
            }}>
              {bioLine}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
