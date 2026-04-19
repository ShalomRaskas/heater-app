"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Players", href: "/players" },
  { label: "Teams", href: "/teams" },
  { label: "Tracked", href: "/tracked" },
  { label: "Saved", href: "/saved" },
  { label: "Pricing", href: "/pricing" },
];

function getInitials(email: string): string {
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getDisplayName(email: string): string {
  return email.split("@")[0].replace(/[._]/g, ".").slice(0, 12);
}

export default function Navbar({ email }: { email: string }) {
  const pathname = usePathname();
  const [showSignOut, setShowSignOut] = useState(false);
  const initials = getInitials(email);
  const displayName = getDisplayName(email);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: "62px",
        display: "grid",
        gridTemplateColumns: "280px 1fr 420px",
        alignItems: "center",
        padding: "0 24px",
        borderBottom: "0.5px solid rgba(255,255,255,.08)",
        background:
          "linear-gradient(180deg, rgba(10,10,15,.85), rgba(10,10,15,.6))",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            display: "grid",
            placeItems: "center",
            background:
              "radial-gradient(circle at 30% 30%, #ff8860, #D32F2F 60%, #7a1a1a)",
            borderRadius: "7px",
            boxShadow:
              "0 0 18px rgba(211,47,47,.45), inset 0 0 8px rgba(255,255,255,.15)",
            fontWeight: 700,
            fontSize: "14px",
            color: "#fff",
            letterSpacing: "-.02em",
            userSelect: "none",
          }}
        >
          H
        </div>
        <span
          style={{
            fontWeight: 600,
            fontSize: "15px",
            letterSpacing: "-.01em",
          }}
        >
          Heater
          <em
            style={{
              fontStyle: "normal",
              color: "rgba(255,255,255,.6)",
              fontWeight: 500,
              marginLeft: "7px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              letterSpacing: ".1em",
              textTransform: "uppercase",
            }}
          >
            scout mode
          </em>
        </span>
      </div>

      {/* Primary nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2px",
          fontSize: "13px",
        }}
      >
        {NAV_LINKS.map(({ label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              style={{
                color: isActive
                  ? "rgba(255,255,255,.95)"
                  : "rgba(255,255,255,.6)",
                padding: "7px 14px",
                borderRadius: "6px",
                textDecoration: "none",
                transition: ".2s",
                position: "relative",
                background: isActive
                  ? "rgba(255,255,255,.06)"
                  : "transparent",
                boxShadow: isActive
                  ? "inset 0 0 0 0.5px rgba(255,255,255,.12)"
                  : "none",
              }}
            >
              {label}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "-1px",
                    width: "18px",
                    height: "1px",
                    transform: "translateX(-50%)",
                    background: "#D32F2F",
                    boxShadow: "0 0 8px #D32F2F",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right section */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {/* Search */}
        <div
          style={{
            flex: 1,
            maxWidth: "260px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: "10px",
            background: "rgba(255,255,255,.03)",
            border: "0.5px solid rgba(255,255,255,.08)",
            borderRadius: "7px",
            fontSize: "12.5px",
            color: "rgba(255,255,255,.4)",
            cursor: "pointer",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <circle
              cx="5"
              cy="5"
              r="4"
              stroke="rgba(255,255,255,.4)"
              strokeWidth="1"
            />
            <line
              x1="8.5"
              y1="8.5"
              x2="11"
              y2="11"
              stroke="rgba(255,255,255,.4)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
          <span style={{ flex: 1 }}>Search Heater</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              padding: "1px 6px",
              background: "rgba(255,255,255,.06)",
              border: "0.5px solid rgba(255,255,255,.08)",
              borderRadius: "4px",
              color: "rgba(255,255,255,.6)",
            }}
          >
            ⌘K
          </span>
        </div>

        {/* Notification */}
        <div
          style={{
            width: "34px",
            height: "34px",
            display: "grid",
            placeItems: "center",
            borderRadius: "7px",
            background: "rgba(255,255,255,.03)",
            border: "0.5px solid rgba(255,255,255,.08)",
            color: "rgba(255,255,255,.6)",
            fontSize: "14px",
            position: "relative",
            cursor: "pointer",
          }}
        >
          ◎
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "9px",
              width: "6px",
              height: "6px",
              borderRadius: "999px",
              background: "#D32F2F",
              boxShadow: "0 0 8px #D32F2F",
              animation: "redPulse 2s ease-in-out infinite",
            }}
          />
        </div>

        {/* User */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowSignOut((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              height: "34px",
              padding: "0 10px 0 6px",
              background: "rgba(255,255,255,.03)",
              border: "0.5px solid rgba(255,255,255,.08)",
              borderRadius: "7px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "rgba(255,255,255,.6)",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #5a4ac0, #8a6cc0)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-inter)",
                fontWeight: 600,
                fontSize: "9px",
                color: "#fff",
              }}
            >
              {initials}
            </span>
            {displayName}
          </button>

          {showSignOut && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                minWidth: "160px",
                padding: "4px",
                background: "rgba(12,12,18,.92)",
                border: "0.5px solid rgba(255,255,255,.12)",
                borderRadius: "10px",
                backdropFilter: "blur(24px)",
                boxShadow:
                  "0 20px 50px rgba(0,0,0,.6), 0 0 0 0.5px rgba(255,255,255,.04) inset",
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "rgba(255,255,255,.4)",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                  borderBottom: "0.5px solid rgba(255,255,255,.08)",
                  marginBottom: "4px",
                }}
              >
                {email}
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,.6)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    textAlign: "left",
                    cursor: "pointer",
                    letterSpacing: ".08em",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(211,47,47,.12)";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "rgba(255,255,255,.9)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "rgba(255,255,255,.6)";
                  }}
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
