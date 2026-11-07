import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

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
  themeColor: "#0A0A0A",
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
        {children}
      </body>
    </html>
  );
}
