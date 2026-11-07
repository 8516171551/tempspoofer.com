// Generated OG image for link previews (Twitter/X, Discord, Slack, etc).
// Next.js serves this as GET /opengraph-image automatically.

import { ImageResponse } from "next/og";

export const alt = "Temporary Spoofer — HWID spoofer for Windows";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          backgroundColor: "#0A0A0E",
          backgroundImage:
            "radial-gradient(circle at 20% 15%, rgba(178,214,248,0.22), transparent 55%), radial-gradient(circle at 80% 85%, rgba(140,192,242,0.14), transparent 55%)",
          color: "#F4F4F5",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="180" height="180" style={{ marginBottom: 44 }}>
          <defs>
            <linearGradient id="og" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E4F0FD"/>
              <stop offset="55%" stopColor="#B2D6F8"/>
              <stop offset="100%" stopColor="#6BAAEB"/>
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#og)"/>
          <path d="M18 22 H46" stroke="#0A0A0E" strokeWidth="7" strokeLinecap="round"/>
          <path d="M32 22 V46" stroke="#0A0A0E" strokeWidth="7" strokeLinecap="round"/>
          <path d="M 52 32 A 20 20 0 1 0 32 12" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
          <circle cx="32" cy="12" r="2.8" fill="#0A0A0E"/>
        </svg>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, display: "flex" }}>
          Temporary Spoofer
        </div>
        <div style={{ fontSize: 28, color: "#9A9AA6", marginTop: 14, display: "flex" }}>
          Pay once. Spoof your hardware for a session.
        </div>
      </div>
    ),
    { ...size }
  );
}
