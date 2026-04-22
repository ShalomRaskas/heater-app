export default function MobileSplash() {
  return (
    <div
      className="mobile-only"
      style={{
        minHeight: "100dvh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 28px",
        textAlign: "center",
        background:
          "radial-gradient(600px 400px at 15% 90%, rgba(211,47,47,.12), transparent 60%), radial-gradient(500px 350px at 90% 8%, rgba(255,107,53,.08), transparent 65%), #060609",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 85%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "360px",
        }}
      >
        {/* Logo mark */}
        <img
          src="/logo.png"
          alt="Heater"
          style={{ width: "64px", height: "64px", objectFit: "contain", marginBottom: "20px" }}
        />

        {/* Wordmark */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: ".3em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.4)",
            marginBottom: "32px",
          }}
        >
          HEATER
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: 700,
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-.02em",
            color: "rgba(255,255,255,.95)",
            margin: "0 0 16px",
          }}
        >
          Optimized for desktop
        </h1>

        {/* Albert subhead — serif italic */}
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "18px",
            lineHeight: 1.5,
            color: "#d4af37",
            filter: "drop-shadow(0 0 12px rgba(212,175,55,.25))",
            margin: "0 0 40px",
            maxWidth: "30ch",
          }}
        >
          Mobile&apos;s in the oven. Albert promises it&apos;s worth the wait.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
            maxWidth: "300px",
          }}
        >
          {/* Primary */}
          <a
            href="https://heaterbaseball.app"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "48px",
              borderRadius: "10px",
              background: "linear-gradient(180deg, #e84545, #b22020)",
              border: "0.5px solid rgba(255,255,255,.2)",
              boxShadow:
                "0 0 24px rgba(211,47,47,.4), inset 0 1px 0 rgba(255,255,255,.25)",
              color: "#fff",
              fontFamily: "var(--font-inter)",
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
              letterSpacing: "-.01em",
            }}
          >
            Back to heaterbaseball.app
          </a>

          {/* Secondary ghost */}
          <a
            href="https://x.com/RaskasShalom"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "48px",
              borderRadius: "10px",
              background: "rgba(255,255,255,.04)",
              border: "0.5px solid rgba(255,255,255,.12)",
              color: "rgba(255,255,255,.7)",
              fontFamily: "var(--font-inter)",
              fontWeight: 500,
              fontSize: "14px",
              textDecoration: "none",
              letterSpacing: "-.01em",
              gap: "8px",
            }}
          >
            {/* X / Twitter icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ flexShrink: 0 }}
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Follow @RaskasShalom for updates
          </a>
        </div>

        {/* Tertiary label */}
        <div
          style={{
            marginTop: "40px",
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "rgba(255,255,255,.25)",
            textTransform: "uppercase",
            letterSpacing: ".2em",
          }}
        >
          Scout Mode · Desktop only for now
        </div>
      </div>
    </div>
  );
}
