import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Temporary Spoofer — HWID spoofer for Windows",
  description:
    "Temporary Spoofer. Short-term HWID spoofer with per-session passes. Reseller program available.",
  themeColor: "#0A0A0E",
  openGraph: {
    title: "Temporary Spoofer",
    description: "Short-term HWID spoofer with per-session passes.",
    url: "https://tempspoofer.com",
    siteName: "Temporary Spoofer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Temporary Spoofer",
    description: "Short-term HWID spoofer with per-session passes.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
