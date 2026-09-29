import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FBI Most Wanted — Tactical Intelligence & Bounty Radar",
  description:
    "Live FBI Most Wanted intelligence dashboard featuring a 3D tactical globe tracking crime origins and escape havens, interactive bounty board, field office radar, and bounty guessing game.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#07080a] text-neutral-100`}
    >
      <body className="min-h-full flex flex-col bg-[#07080a] text-neutral-100">{children}</body>
    </html>
  );
}
