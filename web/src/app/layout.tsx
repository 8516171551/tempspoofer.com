import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { PermspooferBanner } from "@/components/PermspooferBanner";
import "./globals.css";

// Phone behaves like an app: no pinch zoom, no double-tap zoom, no bounce.
// Browsers still respect prefers-reduced-motion and OS text-size scaling
// for accessibility (they override user-scalable).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Temporary Spoofer — HWID spoofer for Windows",
  description:
    "Short-term HWID spoofer. Pay once, spoof for a session, rolls back when the window ends.",
  openGraph: {
    title: "Temporary Spoofer",
    description: "Pay once. Spoof your hardware for a session.",
    url: "https://tempspoofer.com",
    siteName: "Temporary Spoofer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Temporary Spoofer",
    description: "Pay once. Spoof your hardware for a session.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}>
      <body className="min-h-screen bg-[#0A0A0A] text-zinc-100 antialiased font-sans">
        <PermspooferBanner />
        {children}
      </body>
    </html>
  );
}
