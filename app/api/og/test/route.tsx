import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", background: "#060609", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "white", fontSize: 48 }}>Heater OG Test</span>
    </div>,
    { width: 1200, height: 630 }
  );
}
