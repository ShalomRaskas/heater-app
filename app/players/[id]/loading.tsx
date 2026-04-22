export default function PlayerProfileLoading() {
  return (
    <div style={{ fontFamily: "var(--font-mono)" }}>
      {/* Hero skeleton */}
      <div style={{
        borderBottom: "0.5px solid rgba(255,255,255,.08)",
        padding: "24px 48px 28px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "32px" }}>
          <div style={{
            width: "120px", height: "90px", flexShrink: 0,
            borderRadius: "10px", background: "rgba(255,255,255,.05)",
          }} />
          <div>
            <div style={{
              height: "30px", width: "280px", borderRadius: "8px",
              background: "rgba(255,255,255,.07)", marginBottom: "10px",
            }} />
            <div style={{
              height: "14px", width: "180px", borderRadius: "4px",
              background: "rgba(255,255,255,.04)",
            }} />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div style={{
        maxWidth: "1400px", margin: "0 auto", padding: "32px 48px",
        display: "grid", gridTemplateColumns: "340px 1fr", gap: "40px",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {[90, 200, 120].map((h, i) => (
            <div key={i} style={{
              height: `${h}px`, borderRadius: "12px",
              background: "rgba(255,255,255,.025)",
              border: "0.5px solid rgba(255,255,255,.07)",
            }} />
          ))}
        </div>
        <div style={{
          height: "500px", borderRadius: "12px",
          background: "rgba(255,255,255,.025)",
          border: "0.5px solid rgba(255,255,255,.07)",
          display: "grid", placeItems: "center",
        }}>
          <div style={{
            fontSize: "10px", color: "rgba(255,255,255,.2)",
            textTransform: "uppercase", letterSpacing: ".14em",
          }}>
            Loading profile…
          </div>
        </div>
      </div>
    </div>
  );
}
