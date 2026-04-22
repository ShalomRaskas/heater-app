export default function PlayersLoading() {
  return (
    <div style={{
      padding: "32px 48px",
      maxWidth: "1400px",
      margin: "0 auto",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{ marginBottom: "28px" }}>
        <div style={{
          height: "24px", width: "120px",
          background: "rgba(255,255,255,.06)", borderRadius: "6px",
          marginBottom: "8px",
        }} />
        <div style={{
          height: "12px", width: "380px",
          background: "rgba(255,255,255,.04)", borderRadius: "4px",
        }} />
      </div>
      <div style={{
        height: "44px", borderRadius: "10px",
        background: "rgba(255,255,255,.03)",
        border: "0.5px solid rgba(255,255,255,.08)",
        marginBottom: "20px",
      }} />
      <div style={{
        display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "28px",
      }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            height: "24px", width: "42px", borderRadius: "20px",
            background: "rgba(255,255,255,.04)",
            border: "0.5px solid rgba(255,255,255,.06)",
          }} />
        ))}
      </div>
      <div style={{
        fontSize: "10px", color: "rgba(255,255,255,.2)",
        textTransform: "uppercase", letterSpacing: ".14em",
        textAlign: "center", paddingTop: "40px",
      }}>
        Loading…
      </div>
    </div>
  );
}
